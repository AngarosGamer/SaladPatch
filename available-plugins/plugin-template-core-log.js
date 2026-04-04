/**
 * Plugin Template - Using createPlugin() & Helper Functions
 * 
 * This shows the simplified way to write plugins.
 * All resource management is automatic!
 */

(async () => {
    await createPlugin('plugin-template-core-log', async (plugin) => {
    const POLL_INTERVAL_MS = 1500;

    // Create a log reader (auto-cleaned on removal)
    const reader = await plugin.createLogReader();

    // Helper to process each line
    function handleLine(line) {
        // TODO: Add your plugin-specific parsing and behavior here.
        // Keep this logic local to your plugin for easy mix-and-match.
        if (/your pattern/i.test(line)) {
            console.log('[plugin-template] matched line:', line);
        }
    }

    // Poll function
    async function tick() {
        const snapshot = await reader.poll();
        for (const line of snapshot.lines || []) {
            handleLine(String(line || ''));
        }
    }

    // Initial poll
    await tick();

    // Set up polling interval (auto-cleared on removal)
    plugin.useInterval(tick, POLL_INTERVAL_MS);
    });
})().catch(err => console.error('[plugin-template-core-log] Error:', err));
