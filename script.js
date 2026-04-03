const puppeteer = require('puppeteer-core');

const DEBUG_PORT = process.env.DEBUG_PORT || '9222';
const DEBUG_URL = `http://localhost:${DEBUG_PORT}`;

// Target specific debug mode app
const TARGET_TITLE_KEYWORD = 'Salad';


// Modifications here
function getInjectionCode() {
    return () => {
        if (window.__my_injected_flag__) return;
        window.__my_injected_flag__ = true;

        console.log('[+] Injection successful');


        // Add banner
        const banner = document.createElement('div');
        banner.innerText = 'Injected UI Active';
        Object.assign(banner.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            background: '#ff0033',
            color: 'white',
            zIndex: '999999',
            padding: '6px',
            textAlign: 'center',
            fontWeight: 'bold'
        });
        document.body.appendChild(banner);

        // Dynamic UI changes
        const observer = new MutationObserver(() => {
            document.querySelectorAll('button').forEach(btn => {
                btn.style.borderRadius = '8px';
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Hook app fetches - potential use for later
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            console.log('[FETCH]', args);
            return originalFetch(...args);
        };

        // Shortcut, for debugging
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'i') {
                alert('Injected shortcut triggered');
            }
        });
    };
}


// Attempt to find the correct Salad Window, not background processes
async function pickCorrectPage(browser) {
    const pages = await browser.pages();

    console.log('[*] Available pages:');

    for (const p of pages) {
        try {
            const title = await p.title();
            const url = p.url();

            console.log(` - Title: "${title}" | URL: ${url}`);

            // Match Salad Window name to inject correctly
            if (title && title.includes(TARGET_TITLE_KEYWORD)) {
                console.log('[+] Matched target by title');
                return p;
            }
        } catch (e) {}
    }

    // Try another method, un
    for (const p of pages) {
        const url = p.url();

        if (
            url.includes('devtools') ||
            url === 'about:blank' ||
            url.startsWith('chrome-extension://')
        ) continue;

        console.log('[+] Using heuristic match');
        return p;
    }

    throw new Error('No suitable page found');
}


// Verify injection status
async function inject(page) {
    console.log('[*] Injecting into:', await page.title());

    try {
        await page.evaluate(getInjectionCode());
    } catch (e) {
        console.error('Injection error:', e.message);
    }
}


// Start injection
async function main() {
    console.log('[*] Connecting to Electron app...');
    console.log(`[*] Using debug URL: ${DEBUG_URL}`);

    const browser = await puppeteer.connect({
        browserURL: DEBUG_URL,
        defaultViewport: null
    });

    const page = await pickCorrectPage(browser);

    console.log('[+] Attached to:', await page.title());

    // Initial injection
    await inject(page);

    // Reinject for refresh / new page
    page.on('framenavigated', async () => {
        console.log('[*] Navigation detected → reinjecting...');
        await inject(page);
    });

    // Keep reinjecting
    setInterval(async () => {
        try {
            await inject(page);
        } catch (e) {}
    }, 3000);

    console.log('[+] Injector running. Press Ctrl+C to stop.');
}

main().catch(console.error);