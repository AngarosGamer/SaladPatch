/**
 * Ultra-Simplified Plugin Template
 * 
 * This is the easiest way to write plugins using createPlugin() and helpers.
 * All resource management is automatic!
 * 
 * Just copy this file, rename it, and replace the setup logic with yours.
 */

(async () => {
    await createPlugin('my-plugin', async (h) => {
    // Create a log reader (auto-cleaned on removal)
    const reader = await h.createLogReader();

    // Set up polling interval (auto-cleared on removal)
    h.useInterval(async () => {
        const snapshot = await reader.poll();
        
        // Your plugin logic here
        for (const line of snapshot.lines) {
            if (/your pattern/i.test(line)) {
                console.log('[my-plugin]', line);
            }
        }
    }, 1500);

    // Create a DOM element (auto-removed on removal)
    const panel = h.createElement('div', {
        id: 'my-plugin-panel',
        class: 'my-plugin-style'
    }, {
        position: 'fixed',
        bottom: '10px',
        right: '10px',  
        padding: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: '#fff',
        borderRadius: '5px',
        zIndex: '999999'
    });

    h.setText(panel, 'My Plugin Ready');
    document.body.appendChild(panel);

    // Show a debug panel if you want
    h.showDebug('my-plugin-debug', 'My Plugin Debug', [
        'Status: Running',
        'Watching: Salad logs'
    ]);

    // Listen for keypresses (auto-cleaned on removal)
    h.useListener(document, 'keydown', (e) => {
        if (e.key === 'q') {
            console.log('Q pressed - plugin still running');
        }
    });
    });
})().catch(err => console.error('[my-plugin] Error:', err));
