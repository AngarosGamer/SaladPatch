/**
 * Workload Type Display Plugin
 * 
 * Monitors Salad logs for active workload types (Container, Miner, Node Compatibility)
 * and displays them inline in the Salad UI.
 * Uses createPlugin() for automatic lifecycle management.
 */

(async () => {
    await createPlugin('workload-type-display', async (h) => {

    const POLL_INTERVAL_MS = 1200; // Poll logs
    const DEBUG_PANEL_ID = 'workload-type-display-debug';
    const RUNNING_JOB_BASE_TEXT = 'Salad is actively running a job on your hardware right now';
    const FINDING_JOB_BASE_TEXT = 'Salad is looking for a job compatible with your hardware';
    const RUNNING_NODE_COMPAT_TEXT = 'Salad is verifying if your machine is compatible with containers';
    const NODE_COMPAT_TTL_MS = 120000;
    const SCRIPT_KEY = window.__saladScriptContext ? window.__saladScriptContext.key : 'workload-type-display';

    const state = { // Maintain active data for the plugin
        activeTypes: new Set(),
        currentFile: '',
        currentOffset: 0,
        lastReadBytes: 0,
        lastLine: '',
        lastEvent: 'Initializing',
        lastError: '',
        recentMessages: [],
        nodeCompatUntil: 0,
        pendingDetailed: {
            sawAny: false,
            containers: 0,
            miners: 0,
            nodeCompat: 0
        },
        logReader: null,
        shortcutRegistered: false,
        intervalId: null
    };

    function pushMessage(text) {
        const line = `[${new Date().toISOString()}] ${text}`;
        state.recentMessages.push(line);
        if (state.recentMessages.length > 20) {
            state.recentMessages.shift();
        }
    }

    function resetPendingDetailed() {
        state.pendingDetailed.sawAny = false;
        state.pendingDetailed.containers = 0;
        state.pendingDetailed.miners = 0;
        state.pendingDetailed.nodeCompat = 0;
    }

    function clearAllWorkloads(reason) {
        state.activeTypes.clear();
        state.nodeCompatUntil = 0;
        state.lastEvent = reason || 'Workloads cleared';
        if (reason) {
            pushMessage(reason);
        }
        resetPendingDetailed();
    }

    function parseSummaryCounts(line) {
        const counts = {};
        const pairRegex = /([a-zA-Z]+)\s*:\s*(\d+)/g;
        let match;
        while ((match = pairRegex.exec(line)) !== null) {
            counts[match[1].toLowerCase()] = Number(match[2]);
        }
        return counts;
    }

    function applySummary(counts) {
        const next = new Set();
        const pending = state.pendingDetailed;

        let containerCount = (counts.container || 0) + (counts.containers || 0);
        let minerCount = (counts.miner || 0) + (counts.miners || 0);
        let allowNodeCompatTtl = true;

        if (pending.sawAny) {
            // Detailed lines are authoritative because summary "containers" can include Node Compatibility.
            containerCount = pending.containers;
            minerCount = pending.miners;
            allowNodeCompatTtl = false;

            if (pending.nodeCompat === 0) {
                state.nodeCompatUntil = 0;
            }
        }

        if (containerCount > 0) {
            next.add('Container');
        }

        if (minerCount > 0) {
            next.add('Miner');
        }

        if (pending.nodeCompat > 0) {
            next.add('Node Compatibility');
        }

        if (allowNodeCompatTtl && Date.now() <= state.nodeCompatUntil) {
            next.add('Node Compatibility');
        }

        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        if (total === 0) {
            clearAllWorkloads('Summary indicates zero workloads');
            return;
        }

        state.activeTypes = next;
        state.lastEvent = `Summary parsed (${JSON.stringify(counts)})`;
        resetPendingDetailed();
    }

    function parseLine(line) {
        if (!line) return;
        state.lastLine = line.trim();

        if (/Running\s+State\s*:\s*false\b/i.test(line)) {
            clearAllWorkloads('Running State false');
            return;
        }

        if (/Received\s+desired\s+state.*\b0\s+workloads\b/i.test(line)) {
            clearAllWorkloads('Desired state reports zero workloads');
            return;
        }

        if (/\b0\s+workloads\b/i.test(line)) {
            clearAllWorkloads('Log reports zero workloads');
            return;
        }

        if (/\b0\s+unapproved\s+workloads\b/i.test(line)) {
            state.lastEvent = 'Zero unapproved workloads (ignored for active state)';
            return;
        }

        if (/Workload\s+Received:/i.test(line)) {
            state.pendingDetailed.sawAny = true;
            const isNodeCompat = /node\s*compatibility/i.test(line);
            const typeMatch = line.match(/,\s*(miner|container)\s*\)/i);
            if (typeMatch) {
                const rawType = String(typeMatch[1] || '').toLowerCase();
                if (rawType === 'container') {
                    if (!isNodeCompat) {
                        state.activeTypes.add('Container');
                        state.pendingDetailed.containers += 1;
                        pushMessage('Detected workload type: Container');
                    } else {
                        pushMessage('Detected Node Compatibility workload (container tag ignored)');
                    }
                } else if (rawType === 'miner') {
                    state.activeTypes.add('Miner');
                    state.pendingDetailed.miners += 1;
                    pushMessage('Detected workload type: Miner');
                }
            }

            if (isNodeCompat) {
                state.pendingDetailed.nodeCompat += 1;
                state.activeTypes.add('Node Compatibility');
                state.nodeCompatUntil = Date.now() + NODE_COMPAT_TTL_MS;
                pushMessage('Detected Node Compatibility workload');
            }

            state.lastEvent = 'Workload line parsed';
            return;
        }

        if (/Workloads\s+Received:/i.test(line)) {
            const counts = parseSummaryCounts(line);
            if (Object.keys(counts).length > 0) {
                pushMessage(`Detected summary counts: ${JSON.stringify(counts)}`);
                applySummary(counts);
            }
        }
    }

    function processLines(lines) {
        if (!Array.isArray(lines) || lines.length === 0) {
            return;
        }

        for (const line of lines) {
            parseLine(String(line || ''));
        }
    }

    function isNodeCompatOnly() {
        return state.activeTypes.has('Node Compatibility')
            && !state.activeTypes.has('Container')
            && !state.activeTypes.has('Miner');
    }

    function getRunningWorkloadTypes() {
        const preferredOrder = ['Container', 'Miner'];
        return preferredOrder.filter((type) => state.activeTypes.has(type));
    }

    function getStatusCardModel() {
        if (isNodeCompatOnly()) {
            return {
                title: 'Running Node Compatibility',
                description: RUNNING_NODE_COMPAT_TEXT
            };
        }

        const runningTypes = getRunningWorkloadTypes();
        if (runningTypes.length > 0) {
            return {
                title: 'Running Job',
                description: `Salad is actively running a ${runningTypes.join(' + ')} job on your hardware right now`
            };
        }

        return {
            title: 'Finding Job',
            description: FINDING_JOB_BASE_TEXT
        };
    }

    function findStatusTitleElement() {
        const spans = document.querySelectorAll('span');
        const candidates = new Set(['Finding Job', 'Running Job', 'Running Node Compatibility']);

        for (const span of spans) {
            const text = (span.textContent || '').trim();
            if (candidates.has(text)) {
                return span;
            }
        }

        return null;
    }

    function findStatusDescriptionElement() {
        const spans = document.querySelectorAll('span');
        const candidates = [
            FINDING_JOB_BASE_TEXT.toLowerCase(),
            RUNNING_JOB_BASE_TEXT.toLowerCase(),
            RUNNING_NODE_COMPAT_TEXT.toLowerCase()
        ];

        for (const span of spans) {
            const text = (span.textContent || '').trim();
            const lowered = text.toLowerCase();
            if (!lowered) continue;

            if (candidates.includes(lowered)
                || lowered.startsWith('salad is actively running a ')
                || lowered.startsWith('salad is looking for a job compatible')
                || lowered.startsWith('salad is verifying if your machine is compatible')) {
                return span;
            }
        }

        return null;
    }

    function renderStatusCardText() {
        const model = getStatusCardModel();
        const titleEl = findStatusTitleElement();
        const descriptionEl = findStatusDescriptionElement();

        if (titleEl) {
            titleEl.textContent = model.title;
        }

        if (descriptionEl) {
            descriptionEl.textContent = model.description;
        }
    }

    function getOrCreateDebugPanel() {
        if (!window.__saladCoreDebug || typeof window.__saladCoreDebug.render !== 'function') {
            return null;
        }

        if (!state.shortcutRegistered && typeof window.__saladCoreDebug.registerToggleShortcut === 'function') {
            window.__saladCoreDebug.registerToggleShortcut(DEBUG_PANEL_ID, { ctrlKey: true, key: 't' });
            state.shortcutRegistered = true;
        }

        return window.__saladCoreDebug;
    }

    function renderDebugPanel() {
        const debugApi = getOrCreateDebugPanel();
        if (!debugApi) {
            return;
        }

        const lines = [
            'Workload Type Display Debug (Ctrl+T toggles)',
            `Status: ${state.lastEvent}`,
            `Log file: ${state.currentFile || '(none)'}`,
            `Offset: ${state.currentOffset}`,
            `Last read bytes: ${state.lastReadBytes}`,
            `Active: ${state.activeTypes.size ? Array.from(state.activeTypes).join(', ') : '(none)'}`,
            `NodeCompatUntil: ${state.nodeCompatUntil ? new Date(state.nodeCompatUntil).toLocaleTimeString() : 'n/a'}`,
            `Last line: ${state.lastLine || '(none)'}`
        ];

        if (state.lastError) {
            lines.push(`Last error: ${state.lastError}`);
        }

        if (state.recentMessages.length) {
            lines.push('Recent:');
            lines.push(...state.recentMessages.slice(-5));
        }

        debugApi.render(DEBUG_PANEL_ID, {
            title: 'Workload Type Display Debug',
            lines,
            defaultVisible: false
        });
    }

    function renderWorkloadText() {
        renderStatusCardText();
        renderDebugPanel();
    }

    function restoreDefaultStatusCardText() {
        const titleEl = findStatusTitleElement();
        const descriptionEl = findStatusDescriptionElement();

        if (titleEl) {
            titleEl.textContent = 'Finding Job';
        }

        if (descriptionEl) {
            descriptionEl.textContent = FINDING_JOB_BASE_TEXT;
        }
    }

    async function cleanup() {
        if (state.intervalId) {
            clearInterval(state.intervalId);
            state.intervalId = null;
        }

        if (state.logReader && typeof state.logReader.dispose === 'function') {
            try {
                await state.logReader.dispose();
            } catch (e) {}
        }

        state.logReader = null;
        clearAllWorkloads('Plugin removed or reloaded');
        restoreDefaultStatusCardText();

        if (window.__saladCoreDebug && typeof window.__saladCoreDebug.setVisible === 'function') {
            window.__saladCoreDebug.setVisible(DEBUG_PANEL_ID, false);
        }

        if (window.__saladScripts && typeof window.__saladScripts.unregisterCleanup === 'function') {
            window.__saladScripts.unregisterCleanup(SCRIPT_KEY);
        }
    }

    function applySnapshot(snapshot) {
        state.currentFile = snapshot.currentFile || '';
        state.currentOffset = Number(snapshot.currentOffset || 0);
        state.lastReadBytes = Number(snapshot.lastReadBytes || 0);
        state.lastEvent = snapshot.lastEvent || 'No status';
        state.lastError = snapshot.lastError || '';
        processLines(snapshot.lines || []);

        if (Date.now() > state.nodeCompatUntil) {
            state.activeTypes.delete('Node Compatibility');
        }

        renderWorkloadText();
    }

    async function ensureReader() {
        if (state.logReader) {
            return true;
        }

        if (!window.__saladCore || typeof window.__saladCore.createLogReader !== 'function') {
            state.lastEvent = 'Waiting for window.__saladCore';
            state.lastError = 'window.__saladCore.createLogReader is not available yet';
            renderDebugPanel();
            return false;
        }

        try {
            state.logReader = await window.__saladCore.createLogReader();
            state.lastError = '';
            state.lastEvent = 'Core log reader attached';
            return true;
        } catch (err) {
            state.lastEvent = 'Failed to create core log reader';
            state.lastError = err && err.message ? err.message : String(err);
            renderDebugPanel();
            return false;
        }
    }

    async function pollBridge() {
        const ready = await ensureReader();
        if (!ready) {
            return;
        }

        if (!state.logReader || typeof state.logReader.poll !== 'function') {
            state.lastEvent = 'Core log reader unavailable';
            state.lastError = 'state.logReader.poll is not available';
            renderDebugPanel();
            return;
        }

        try {
            const snapshot = await state.logReader.poll();
            applySnapshot(snapshot || {});
        } catch (err) {
            state.lastEvent = 'Bridge poll failed';
            state.lastError = err && err.message ? err.message : String(err);
            renderDebugPanel();
        }
    }

    function start() {
        if (window.__saladScripts && typeof window.__saladScripts.registerCleanup === 'function') {
            window.__saladScripts.registerCleanup(SCRIPT_KEY, cleanup);
        }

        getOrCreateDebugPanel();
        state.lastEvent = 'Starting workload monitor';
        renderDebugPanel();

        pollBridge();
        state.intervalId = window.setInterval(pollBridge, POLL_INTERVAL_MS);

        window.addEventListener('beforeunload', () => {
            if (state.intervalId) {
                clearInterval(state.intervalId);
                state.intervalId = null;
            }
        });
    }

    start();
    });
})().catch(err => console.error('Plugin error:', err));
