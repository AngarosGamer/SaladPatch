(() => {
    if (window.__saladPluginTemplateCoreLog__) {
        return;
    }
    window.__saladPluginTemplateCoreLog__ = true;

    const POLL_INTERVAL_MS = 1500;

    const state = {
        reader: null,
        intervalId: null
    };

    const SCRIPT_KEY = window.__saladScriptContext ? window.__saladScriptContext.key : 'plugin-template-core-log';

    async function ensureReader() {
        if (state.reader) {
            return true;
        }

        if (!window.__saladCore || typeof window.__saladCore.createLogReader !== 'function') {
            return false;
        }

        state.reader = await window.__saladCore.createLogReader();
        return true;
    }

    function handleLine(line) {
        // TODO: Add your plugin-specific parsing and behavior here.
        // Keep this logic local to your plugin for easy mix-and-match.
        if (/your pattern/i.test(line)) {
            console.log('[plugin-template] matched line:', line);
        }
    }

    async function cleanup() {
        // This is the part authors should keep in mind:
        // when a script is removed or reloaded, undo timers, listeners,
        // readers, observers, and page mutations here.
        if (state.intervalId) {
            clearInterval(state.intervalId);
            state.intervalId = null;
        }

        if (state.reader && typeof state.reader.dispose === 'function') {
            try {
                await state.reader.dispose();
            } catch (e) {}
        }

        state.reader = null;

        if (window.__saladScripts && typeof window.__saladScripts.unregisterCleanup === 'function') {
            window.__saladScripts.unregisterCleanup(SCRIPT_KEY);
        }
    }

    async function tick() {
        const ready = await ensureReader();
        if (!ready) {
            return;
        }

        const snapshot = await state.reader.poll();
        for (const line of snapshot.lines || []) {
            handleLine(String(line || ''));
        }
    }

    async function start() {
        // Register cleanup so the loader can stop this plugin cleanly if the file is removed.
        if (window.__saladScripts && typeof window.__saladScripts.registerCleanup === 'function') {
            window.__saladScripts.registerCleanup(SCRIPT_KEY, cleanup);
        }

        await tick();
        state.intervalId = window.setInterval(tick, POLL_INTERVAL_MS);

        window.addEventListener('beforeunload', async () => {
            if (state.intervalId) {
                clearInterval(state.intervalId);
                state.intervalId = null;
            }

            if (state.reader && typeof state.reader.dispose === 'function') {
                try {
                    await state.reader.dispose();
                } catch (e) {}
            }
        });
    }

    start().catch((err) => {
        console.error('[plugin-template] start failed:', err && err.message ? err.message : err);
    });
})();
