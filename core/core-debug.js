/**
 * Core Debug System
 * 
 * Tracks and displays information about the SaladPatch loader and core systems.
 * Registered as window.__saladCoreLoaderDebug in the renderer.
 */

module.exports = function exposeCoreDebugSystem(page) {
    return page.evaluate(() => {
        if (window.__saladCoreLoaderDebug && window.__saladCoreLoaderDebug.__version === 1) {
            return;
        }

        const CONSOLE_ID = '__salad-core-loader-debug';
        const SHORTCUT_KEY = 'd';

        const state = {
            visible: false,
            shortcutAttached: false,
            events: [],
            maxEvents: 100,
            pluginStats: {
                total: 0,
                active: 0,
                failed: 0
            },
            errors: [],
            maxErrors: 50,
            startTime: Date.now(),
            lastUpdate: Date.now()
        };

        /**
         * Log an event to the debug console
         */
        function logEvent(category, message, details) {
            const timestamp = new Date().toLocaleTimeString();
            const line = `[${timestamp}] [${category}] ${message}`;
            
            state.events.push({
                timestamp,
                category,
                message,
                details,
                line
            });

            if (state.events.length > state.maxEvents) {
                state.events.shift();
            }

            state.lastUpdate = Date.now();
            render();
        }

        /**
         * Log an error
         */
        function logError(message, error) {
            const timestamp = new Date().toLocaleTimeString();
            const errorStr = error?.message || String(error || '');
            
            state.errors.push({
                timestamp,
                message,
                error: errorStr
            });

            if (state.errors.length > state.maxErrors) {
                state.errors.shift();
            }

            logEvent('ERROR', message, errorStr);
        }

        /**
         * Update plugin statistics
         */
        function updatePluginStats(total, active, failed) {
            state.pluginStats = { total, active, failed };
            state.lastUpdate = Date.now();
        }

        /**
         * Get or create the debug panel
         */
        function getOrCreatePanel() {
            let panel = document.getElementById(CONSOLE_ID);
            if (panel) return panel;

            panel = document.createElement('div');
            panel.id = CONSOLE_ID;
            Object.assign(panel.style, {
                position: 'fixed',
                left: '12px',
                top: '12px',
                zIndex: '2147483647',
                width: '420px',
                maxHeight: '260px',
                overflow: 'auto',
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '11px',
                lineHeight: '1.35',
                fontFamily: 'Consolas, Menlo, monospace',
                color: '#f5f5f5',
                background: 'rgba(18,20,32,0.92)',
                border: '1px solid rgba(255,255,255,0.22)',
                boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
                pointerEvents: 'auto',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                display: 'none',
                zIndex: '999999999'  // Above everything
            });

            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '✕';
            Object.assign(closeBtn.style, {
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: 'rgba(255,0,0,0.5)',
                color: '#fff',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
            });
            closeBtn.addEventListener('click', () => toggle());
            panel.appendChild(closeBtn);

            // Add scroll container for content
            const content = document.createElement('div');
            content.id = CONSOLE_ID + '-content';
            Object.assign(content.style, {
                paddingRight: '20px',
                marginTop: '4px'
            });
            panel.appendChild(content);

            document.body.appendChild(panel);
            return panel;
        }

        /**
         * Format uptime
         */
        function formatUptime() {
            const ms = Date.now() - state.startTime;
            const seconds = Math.floor((ms / 1000) % 60);
            const minutes = Math.floor((ms / (1000 * 60)) % 60);
            const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
            
            if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
            if (minutes > 0) return `${minutes}m ${seconds}s`;
            return `${seconds}s`;
        }

        /**
         * Render the debug panel
         */
        function render() {
            if (!state.visible) return;

            const panel = getOrCreatePanel();
            const content = panel.querySelector('#' + CONSOLE_ID + '-content');
            if (!content) return;

            const lines = [];
            
            // Header
            lines.push('═══ SaladPatch Core Debug Console ═══');
            lines.push('');

            // Runtime stats
            lines.push(`Uptime: ${formatUptime()}`);
            lines.push(`Plugins: ${state.pluginStats.active}/${state.pluginStats.total} active`);
            if (state.pluginStats.failed > 0) {
                lines.push(`Errors: ${state.pluginStats.failed} failed plugins, ${state.errors.length} total errors`);
            }
            lines.push('');

            // Recent errors (if any)
            if (state.errors.length > 0) {
                lines.push('─── Recent Errors ───');
                const recentErrors = state.errors.slice(-5);
                for (const err of recentErrors) {
                    lines.push(`${err.timestamp} | ${err.message}`);
                    if (err.error) {
                        lines.push(`  └─ ${err.error}`);
                    }
                }
                lines.push('');
            }

            // Recent events
            lines.push('─── Recent Events ───');
            const recentEvents = state.events.slice(-10);
            for (const evt of recentEvents) {
                const prefix = evt.category === 'ERROR' ? '⚠' : '•';
                lines.push(`${prefix} ${evt.line}`);
            }

            lines.push('');
            lines.push('Press Ctrl+D to toggle | Close button to hide');

            content.textContent = lines.join('\n');
            panel.style.display = state.visible ? 'block' : 'none';
        }

        /**
         * Toggle visibility
         */
        function toggle() {
            state.visible = !state.visible;
            if (state.visible) {
                getOrCreatePanel();
                render();
            } else {
                const panel = document.getElementById(CONSOLE_ID);
                if (panel) {
                    panel.style.display = 'none';
                }
            }
        }

        /**
         * Attach keyboard shortcut
         */
        function attachKeyboardShortcut() {
            if (state.shortcutAttached) return;

            window.addEventListener('keydown', (event) => {
                const key = String(event.key || '').toLowerCase();
                if (key !== SHORTCUT_KEY) return;
                if (!event.ctrlKey) return;

                event.preventDefault();
                toggle();
            });

            state.shortcutAttached = true;
        }

        // Expose public API
        window.__saladCoreLoaderDebug = {
            __version: 1,
            logEvent,
            logError,
            updatePluginStats,
            toggle,
            isVisible: () => state.visible
        };

        // Auto-attach keyboard shortcut
        attachKeyboardShortcut();
    });
};
