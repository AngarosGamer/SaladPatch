/**
 * Plugin Factory
 * 
 * Simplified entry point for plugin development.
 * Handles: guard checks, cleanup registration, state management, and error handling.
 * 
 * Usage:
 *   const plugin = createPlugin('my-plugin', async (h) => {
 *       const reader = await h.createLogReader();
 *       h.useInterval(async () => {
 *           const snap = await reader.poll();
 *           // do something with snap
 *       }, 1000);
 *   });
 * 
 * That's it! Cleanup is automatic on removal/reload.
 */

module.exports = function exposePluginFactory(page) {
    return page.evaluate(() => {
        if (window.createPlugin && window.createPlugin.__version === 1) {
            return;
        }

        /**
         * Create and initialize a plugin with automatic lifecycle management.
         * 
         * @param {string} pluginName - Unique plugin identifier (e.g., 'my-plugin-name')
         * @param {function} setup - Async function that receives helpers object
         * @return {Promise<void>}
         * 
         * @example
         *   await createPlugin('my-plugin', async (h) => {
         *       const reader = await h.createLogReader();
         *       h.useInterval(async () => {
         *           const data = await reader.poll();
         *           console.log(data.lines);
         *       }, 1000);
         *   });
         */
        async function createPlugin(pluginName, setup) {
            // Guard against double-loading
            const guardKey = `__plugin_${pluginName}__`;
            if (window[guardKey]) {
                return;
            }
            window[guardKey] = true;

            // Get or create helpers
            if (!window.__saladPluginHelpers) {
                throw new Error('Plugin helpers not available. Ensure core is loaded.');
            }

            const h = window.__saladPluginHelpers;

            // Get script key for cleanup
            const scriptKey = window.__saladScriptContext?.key || pluginName;

            // Set context for helper tracking
            h._setPluginKey(scriptKey);

            // Register cleanup
            window.__saladScripts?.registerCleanup(scriptKey, async () => {
                try {
                    await h._cleanup(scriptKey);
                } catch (err) {
                    console.error(`[${pluginName}] Cleanup error: ${err.message}`);
                }
            });

            // Run setup
            try {
                await setup(h);
            } catch (err) {
                console.error(`[${pluginName}] Setup error: ${err.message}`, err);
                // Still cleanup on setup failure
                await h._cleanup(scriptKey);
                throw err;
            }
        }

        window.createPlugin = createPlugin;
        window.createPlugin.__version = 1;
    });
};
