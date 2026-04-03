const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { createLogReader } = require('./core/log-reader');
const { ensureCoreDebugWindowApi } = require('./core/debug-window');

const DEBUG_PORT = process.env.DEBUG_PORT || '9222';
const DEBUG_URL = `http://localhost:${DEBUG_PORT}`;
const PROJECT_DIR = __dirname;

const ACTIVE_PLUGIN_DIR = path.join(PROJECT_DIR, 'plugins');
const ACTIVE_THEME_DIR = path.join(PROJECT_DIR, 'themes');

const TARGET_TITLE_KEYWORD = 'Salad';
const EXCLUDED_TITLE_KEYWORDS = ['Splash', 'Hidden', 'Novu'];
const EXCLUDED_URL_KEYWORDS = ['splash.html', 'hidden.html', '/hidden'];
const MAIN_URL_HINTS = ['index.html', 'main.html', 'app.html', '/dashboard', '/home'];

const PAGE_WAIT_TIMEOUT_MS = 120000;
const PAGE_POLL_INTERVAL_MS = 1000;
const LOOP_INTERVAL_MS = 3000;
const REATTACH_TIMEOUT_MS = 30000;
const RECONNECT_INTERVAL_MS = 2000;
const SALAD_LOG_DIR = 'C:\\ProgramData\\Salad\\logs';
const SALAD_LOG_FILE_REGEX = /^log-\d{8}(?:[-_].+)?\.txt$/i;
const LOG_READER_INITIAL_TAIL_BYTES = 256 * 1024;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const coreApisExposedPages = new WeakSet();
const managedReaders = new Map();
let managedReaderCounter = 0;

function normalizeReaderOptions(options) {
    const raw = options && typeof options === 'object' ? options : {};

    const logDir = typeof raw.logDir === 'string' && raw.logDir.trim()
        ? raw.logDir.trim()
        : SALAD_LOG_DIR;

    let fileRegex = SALAD_LOG_FILE_REGEX;
    if (typeof raw.fileRegexPattern === 'string' && raw.fileRegexPattern.trim()) {
        const flags = typeof raw.fileRegexFlags === 'string' ? raw.fileRegexFlags : 'i';
        try {
            fileRegex = new RegExp(raw.fileRegexPattern, flags);
        } catch (err) {
            fileRegex = SALAD_LOG_FILE_REGEX;
        }
    }

    const initialTailBytes = Number.isFinite(Number(raw.initialTailBytes))
        ? Number(raw.initialTailBytes)
        : LOG_READER_INITIAL_TAIL_BYTES;

    const maxRecentLines = Number.isFinite(Number(raw.maxRecentLines))
        ? Number(raw.maxRecentLines)
        : 100;

    return {
        logDir,
        fileRegex,
        initialTailBytes,
        maxRecentLines
    };
}

function createManagedReader(options) {
    const normalized = normalizeReaderOptions(options);
    const reader = createLogReader(normalized);
    const id = `reader-${++managedReaderCounter}`;
    managedReaders.set(id, reader);
    return id;
}

function pollManagedReader(id) {
    const reader = managedReaders.get(id);
    if (!reader) {
        return {
            ok: false,
            error: `Unknown reader id: ${id}`,
            lines: [],
            recentLines: []
        };
    }

    return reader.poll();
}

function disposeManagedReader(id) {
    return managedReaders.delete(id);
}

async function exposeFunctionIfNeeded(page, name, fn) {
    try {
        await page.exposeFunction(name, fn);
    } catch (err) {
        const msg = getErrorMessage(err);
        if (!msg.includes('already exists')) {
            throw err;
        }
    }
}

async function ensureCoreApiFacade(page) {
    await page.evaluate(() => {
        if (window.__saladCore && window.__saladCore.__coreVersion === 1) {
            return;
        }

        const coreApi = {
            __coreVersion: 1,
            async createLogReader(options) {
                if (typeof window.__saladCoreCreateLogReader !== 'function') {
                    throw new Error('__saladCoreCreateLogReader is not available yet');
                }

                const id = await window.__saladCoreCreateLogReader(options || {});
                return {
                    id,
                    poll: async () => {
                        if (typeof window.__saladCorePollLogReader !== 'function') {
                            throw new Error('__saladCorePollLogReader is not available yet');
                        }
                        return window.__saladCorePollLogReader(id);
                    },
                    dispose: async () => {
                        if (typeof window.__saladCoreDisposeLogReader !== 'function') {
                            throw new Error('__saladCoreDisposeLogReader is not available yet');
                        }
                        return window.__saladCoreDisposeLogReader(id);
                    }
                };
            },
            log: {
                pollDefault: async () => {
                    if (typeof window.__saladCoreLogPoll !== 'function') {
                        throw new Error('__saladCoreLogPoll is not available yet');
                    }
                    return window.__saladCoreLogPoll();
                }
            }
        };

        Object.defineProperty(coreApi, 'debug', {
            get() {
                return window.__saladCoreDebug || null;
            }
        });

        window.__saladCore = coreApi;
    });
}

async function ensureCoreApis(page, logReader) {
    if (coreApisExposedPages.has(page)) {
        return;
    }

    try {
        await exposeFunctionIfNeeded(page, '__saladCoreLogPoll', async () => logReader.poll());
        await exposeFunctionIfNeeded(page, '__saladCoreCreateLogReader', async (options) => createManagedReader(options));
        await exposeFunctionIfNeeded(page, '__saladCorePollLogReader', async (id) => pollManagedReader(id));
        await exposeFunctionIfNeeded(page, '__saladCoreDisposeLogReader', async (id) => disposeManagedReader(id));
        await ensureCoreDebugWindowApi(page);
        await ensureCoreApiFacade(page);
        coreApisExposedPages.add(page);
        console.log('[+] Exposed core APIs: __saladCore + __saladCoreDebug (+ legacy bridges)');
    } catch (err) {
        const msg = getErrorMessage(err);

        if (msg.includes('already exists')) {
            await ensureCoreDebugWindowApi(page);
            await ensureCoreApiFacade(page);
            coreApisExposedPages.add(page);
            return;
        }

        throw err;
    }
}

function normalize(str) {
    return (str || '').toLowerCase();
}

function listJsFiles(folderPath) {
    if (!fs.existsSync(folderPath)) {
        return [];
    }

    return fs.readdirSync(folderPath, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.js'))
        .map((entry) => path.join(folderPath, entry.name))
        .sort((a, b) => a.localeCompare(b));
}

    function readScriptEntries() {
    const pluginFiles = listJsFiles(ACTIVE_PLUGIN_DIR);
    const themeFiles = listJsFiles(ACTIVE_THEME_DIR);

    const entries = [];

    for (const filePath of pluginFiles) {
        entries.push({
            type: 'plugin',
            fileName: path.basename(filePath),
            absolutePath: filePath,
            code: fs.readFileSync(filePath, 'utf8')
        });
    }

    for (const filePath of themeFiles) {
        entries.push({
            type: 'theme',
            fileName: path.basename(filePath),
            absolutePath: filePath,
            code: fs.readFileSync(filePath, 'utf8')
        });
    }

    return {
        entries,
        pluginCount: pluginFiles.length,
        themeCount: themeFiles.length
    };
}

function createScriptKey(item) {
    return `${item.type}:${item.absolutePath}`;
}

function isExcludedPage(title, url) {
    const titleLc = normalize(title);
    const urlLc = normalize(url);

    if (urlLc.includes('devtools') || urlLc === 'about:blank' || urlLc.startsWith('chrome-extension://')) {
        return true;
    }

    if (EXCLUDED_TITLE_KEYWORDS.some((k) => titleLc.includes(normalize(k)))) {
        return true;
    }

    if (EXCLUDED_URL_KEYWORDS.some((k) => urlLc.includes(normalize(k)))) {
        return true;
    }

    return false;
}

function isMainAppPage(title, url) {
    const titleLc = normalize(title);
    const urlLc = normalize(url);

    if (isExcludedPage(title, url)) {
        return false;
    }

    const hasTargetTitle = titleLc.includes(normalize(TARGET_TITLE_KEYWORD));
    const isRendererPage = urlLc.includes('/dist/renderer/');
    const hasMainUrlHint = MAIN_URL_HINTS.some((hint) => urlLc.includes(normalize(hint)));

    if (hasTargetTitle) {
        return true;
    }

    return isRendererPage && hasMainUrlHint;
}

async function getPageInfo(page) {
    let title = '';
    let url = '';

    try {
        title = await page.title();
    } catch (e) {}

    try {
        url = page.url();
    } catch (e) {}

    return { title, url };
}

async function waitForMainAppPage(browser, timeoutMs = PAGE_WAIT_TIMEOUT_MS) {
    const startedAt = Date.now();
    let lastLogAt = 0;

    while (Date.now() - startedAt < timeoutMs) {
        const pages = await browser.pages();

        if (Date.now() - lastLogAt > 4000) {
            console.log('[*] Available pages:');
            for (const p of pages) {
                const info = await getPageInfo(p);
                console.log(` - Title: "${info.title}" | URL: ${info.url}`);
            }
            lastLogAt = Date.now();
        }

        for (const p of pages) {
            const info = await getPageInfo(p);
            if (isMainAppPage(info.title, info.url)) {
                console.log('[+] Matched main app page');
                return p;
            }
        }

        await new Promise((resolve) => setTimeout(resolve, PAGE_POLL_INTERVAL_MS));
    }

    throw new Error('Timed out waiting for main Salad app page (hidden/splash pages excluded).');
}

async function inject(page, bundle) {
    console.log(`[*] Injecting into: ${await page.title()}`);

    const result = await page.evaluate((payload) => {
        if (!window.__saladLoaderState) {
            window.__saladLoaderState = {
                executed: {},
                cleanupHandlers: {}
            };
        }

        const state = window.__saladLoaderState;
        const applied = [];
        const skipped = [];
        const failed = [];
        const removed = [];

        if (!window.__saladScripts) {
            window.__saladScripts = {
                registerCleanup(key, cleanupFn) {
                    if (typeof cleanupFn === 'function') {
                        state.cleanupHandlers[key] = cleanupFn;
                    }
                },
                unregisterCleanup(key) {
                    delete state.cleanupHandlers[key];
                }
            };
        }

        const currentKeys = new Set(payload.entries.map((item) => item.key));

        for (const key of Object.keys(state.executed)) {
            if (!currentKeys.has(key)) {
                removed.push(key);
            }
        }

        for (const key of removed) {
            try {
                const cleanup = state.cleanupHandlers[key];
                if (typeof cleanup === 'function') {
                    cleanup();
                }
            } catch (err) {
                failed.push({
                    fileName: key,
                    message: err && err.message ? err.message : String(err)
                });
            }

            delete state.executed[key];
            delete state.cleanupHandlers[key];
        }

        for (const item of payload.entries) {
            const key = item.key;
            const previousHash = state.executed[key];
            const hasChanged = previousHash !== item.hash;

            if (previousHash && !hasChanged) {
                skipped.push(item.fileName);
                continue;
            }

            if (previousHash && hasChanged) {
                try {
                    const cleanup = state.cleanupHandlers[key];
                    if (typeof cleanup === 'function') {
                        cleanup();
                    }
                } catch (err) {
                    failed.push({
                        fileName: item.fileName,
                        message: err && err.message ? err.message : String(err)
                    });
                }

                delete state.cleanupHandlers[key];
            }

            try {
                window.__saladScriptContext = {
                    key: item.key,
                    fileName: item.fileName,
                    type: item.type,
                    absolutePath: item.absolutePath
                };

                const wrappedCode = `${item.code}\n//# sourceURL=salad-loader/${item.type}/${item.fileName}`;
                const runner = new Function(wrappedCode);
                runner();
                state.executed[key] = item.hash;
                applied.push(item.fileName);
            } catch (err) {
                failed.push({
                    fileName: item.fileName,
                    message: err && err.message ? err.message : String(err)
                });
            } finally {
                delete window.__saladScriptContext;
            }
        }

        return { applied, skipped, failed, removed };
    }, bundle);

    if (result.applied.length > 0) {
        console.log(`[+] Applied ${result.applied.length} script(s): ${result.applied.join(', ')}`);
    }

    if (result.skipped.length > 0) {
        console.log(`[*] Already applied ${result.skipped.length} script(s): ${result.skipped.join(', ')}`);
    }

    if (result.removed.length > 0) {
        console.log(`[*] Cleaned up ${result.removed.length} removed script(s)`);
    }

    for (const failure of result.failed) {
        console.error(`[ERROR] ${failure.fileName}: ${failure.message}`);
    }
}

function getErrorMessage(err) {
    if (!err) return '';
    if (typeof err.message === 'string') return err.message;
    return String(err);
}

function isRecoverablePageError(err) {
    const msg = normalize(getErrorMessage(err));
    return msg.includes('detached frame')
        || msg.includes('target closed')
        || msg.includes('execution context was destroyed')
        || msg.includes('cannot find context with specified id')
        || msg.includes('session closed');
}

function isBrowserConnectionError(err) {
    const msg = normalize(getErrorMessage(err));
    return msg.includes('failed to fetch browser websocket url')
        || msg.includes('fetch failed')
        || msg.includes('browser has disconnected')
        || msg.includes('connection closed');
}

function isBrowserConnected(browser) {
    if (!browser) return false;

    if (typeof browser.connected === 'boolean') {
        return browser.connected;
    }

    if (typeof browser.isConnected === 'function') {
        return browser.isConnected();
    }

    return true;
}

async function connectBrowserWithRetry() {
    while (true) {
        try {
            const browser = await puppeteer.connect({
                browserURL: DEBUG_URL,
                defaultViewport: null
            });

            console.log('[+] Connected to debug browser');
            return browser;
        } catch (err) {
            console.error('[WARN] Could not connect to debug browser. Retrying...', getErrorMessage(err));
            await sleep(RECONNECT_INTERVAL_MS);
        }
    }
}

async function ensureMainPage(browser, currentPage) {
    if (currentPage && typeof currentPage.isClosed === 'function' && !currentPage.isClosed()) {
        try {
            const info = await getPageInfo(currentPage);
            if (isMainAppPage(info.title, info.url)) {
                return currentPage;
            }
        } catch (err) {
            // Stale page references are expected during app restart.
        }
    }

    return waitForMainAppPage(browser, REATTACH_TIMEOUT_MS);
}

function createContentHash(code) {
    return require('crypto').createHash('sha1').update(code, 'utf8').digest('hex');
}

async function main() {
    console.log('[*] Connecting to Electron app...');
    console.log(`[*] Using debug URL: ${DEBUG_URL}`);

    let browser = await connectBrowserWithRetry();
    let page = null;
    let lastAttachedTarget = '';
    const logReader = createLogReader({
        logDir: SALAD_LOG_DIR,
        fileRegex: SALAD_LOG_FILE_REGEX,
        initialTailBytes: LOG_READER_INITIAL_TAIL_BYTES,
        maxRecentLines: 100
    });

    browser.on('disconnected', () => {
        console.log('[WARN] Debug browser disconnected. Waiting for reconnect...');
    });

    console.log('[+] Loader running. Press Ctrl+C to stop.');

    while (true) {
        try {
            const bundle = readScriptEntries();

            if (bundle.entries.length === 0) {
                console.log('[*] No active scripts in plugins/ or themes/. Nothing to inject yet.');
            }

            if (!isBrowserConnected(browser)) {
                browser = await connectBrowserWithRetry();
                page = null;
                lastAttachedTarget = '';
            }

            page = await ensureMainPage(browser, page);

            const pageInfo = await getPageInfo(page);
            const attachKey = `${pageInfo.title}|${pageInfo.url}`;
            if (attachKey !== lastAttachedTarget) {
                console.log(`[+] Attached to: ${pageInfo.title || '(untitled)'} | ${pageInfo.url}`);
                lastAttachedTarget = attachKey;
            }

            await ensureCoreApis(page, logReader);

            const normalizedBundle = {
                ...bundle,
                entries: bundle.entries.map((item) => ({
                    ...item,
                    key: createScriptKey(item),
                    hash: createContentHash(item.code)
                }))
            };

            await inject(page, normalizedBundle);
        } catch (err) {
            if (isRecoverablePageError(err)) {
                console.log('[WARN] Page/frame changed. Reattaching to the current app window...');
                page = null;
                await sleep(PAGE_POLL_INTERVAL_MS);
                continue;
            }

            if (isBrowserConnectionError(err)) {
                console.log('[WARN] Browser connection lost. Reconnecting...');
                page = null;
                await sleep(RECONNECT_INTERVAL_MS);
                continue;
            }

            console.error('[ERROR] Reinjection attempt failed:', getErrorMessage(err));
        }

        await sleep(LOOP_INTERVAL_MS);
    }
}

main().catch((err) => {
    console.error('[ERROR] Loader failed:', err.message || err);
    process.exitCode = 1;
});
