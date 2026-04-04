# createPlugin(name, setup)

**Owner:** core runtime facade (loader.js + core/plugin-factory.js)

Simplified plugin initialization with automatic lifecycle management and resource cleanup.

## Signature

Plugins are injected as scripts, so wrap the call in an async IIFE:

```js
(async () => {
    await createPlugin(pluginName, async (helpers) => {
        // Plugin setup code here
    });
})().catch(err => console.error('Plugin error:', err));
```

## What It Does Automatically

✅ Guards against double-loading  
✅ Gets script context key  
✅ Registers cleanup function  
✅ Tracks all resources (intervals, readers, DOM, listeners)  
✅ Cleans up everything on removal/reload  
✅ Handles errors gracefully  

## Setup Function Parameters

The `setup` function receives a `helpers` object with these methods:

### Log Reading

#### `await h.createLogReader(options)`
Create a log reader with automatic cleanup.
```js
const reader = await h.createLogReader({
    logDir: 'C:\\ProgramData\\Salad\\logs',
    initialTailBytes: 256 * 1024
});

const snapshot = await reader.poll();
for (const line of snapshot.lines) {
    // Process line
}
```

#### `await h.pollLog()`
Poll the default Salad log directly.
```js
const snapshot = await h.pollLog();
```

#### `await h.pollProcessIo()`
Get process I/O metrics.
```js
const metrics = await h.pollProcessIo();
// { uploadBps, downloadBps, sessionUpBytes, sessionDownBytes, processes: [...] }
```

### Timing & Events

#### `h.useInterval(callback, ms)`
Create an interval with automatic cleanup.
```js
h.useInterval(async () => {
    const snapshot = await reader.poll();
    // Update UI or log
}, 1000); // Every second
```

#### `h.useListener(target, event, handler, options)`
Register event listener with automatic cleanup.
```js
h.useListener(document, 'keydown', (e) => {
    if (e.key === 'd') console.log('D pressed');
});

h.useListener(window, 'resize', () => {
    // Handle resize
}, { passive: true });
```

### DOM Management

#### `h.createElement(tag, attrs, style)`
Create a DOM element with automatic cleanup on removal.
```js
const panel = h.createElement('div', {
    id: 'my-plugin-panel',
    class: 'my-styles',
    'data-test': 'value'
}, {
    position: 'fixed',
    zIndex: '999999',
    background: 'rgba(0,0,0,0.8)',
    color: '#fff'
});

document.body.appendChild(panel);
// Auto-removed when plugin unloads
```

#### `h.useDOM(element)`
Track existing DOM element for automatic cleanup.
```js
const existingElement = document.querySelector('.my-element');
h.useDOM(existingElement);
// Auto-removed when plugin unloads
```

#### `h.setText(element, text)`
Safely set element text (always escaped—never HTML).
```js
h.setText(panel, 'Safe Text');
// Safe from XSS
```

#### `h.appendText(container, text, color)`
Safely append colored text.
```js
const span = h.appendText(panel, 'Warning!', '#ff6b6b');
// Auto-tracked for cleanup
```

### Debug & Display

#### `h.showDebug(panelId, title, lines, options)`
Show a debug panel.
```js
h.showDebug('my-plugin-debug', 'My Debug', [
    'Status: Ready',
    'Polls: 42',
    'Errors: 0'
], {
    visible: true,
    defaultVisible: false,
    shortcut: { key: 'd', ctrlKey: true } // Ctrl+D to toggle
});
```

### Utilities

#### `h.stringify(value)`
Safely stringify any value.
```js
const str = h.stringify({ count: 42 });
// Returns JSON string or fallback
```

## Complete Example

```js
await createPlugin('my-cool-plugin', async (h) => {
    // Create reader
    const reader = await h.createLogReader();

    // Create UI
    const panel = h.createElement('div', { id: 'plugin-panel' }, {
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        padding: '10px',
        background: '#1e1e1e',
        color: '#00ff00',
        fontFamily: 'monospace'
    });
    document.body.appendChild(panel);

    // Set up polling
    let lineCount = 0;
    h.useInterval(async () => {
        const snap = await reader.poll();
        lineCount += snap.lines.length;
        h.setText(panel, `Lines: ${lineCount}`);
    }, 1000);

    // Debug panel
    h.showDebug('my-plugin-debug', 'Status', ['Ready'], {
        shortcut: { key: 'd' }
    });

    // Listen for keypresses
    h.useListener(document, 'keydown', (e) => {
        if (e.key === 'q') {
            console.log('Q pressed - plugin still running');
        }
    });
});
```

## Comparison: Old vs New

### Old Way (50+ lines)
```js
(() => {
    if (window.__myPlugin__) return;
    window.__myPlugin__ = true;

    const SCRIPT_KEY = window.__saladScriptContext 
        ? window.__saladScriptContext.key 
        : 'my-plugin';

    const state = {
        reader: null,
        intervalId: null,
        panel: null
    };

    async function ensureReader() {
        if (state.reader) return true;
        if (!window.__saladCore?.createLogReader) return false;
        state.reader = await window.__saladCore.createLogReader();
        return true;
    }

    async function cleanup() {
        if (state.intervalId) clearInterval(state.intervalId);
        if (state.reader?.dispose) await state.reader.dispose();
        if (state.panel) state.panel.remove();
    }

    window.__saladScripts?.registerCleanup(SCRIPT_KEY, cleanup);

    (async () => {
        if (!await ensureReader()) return;

        state.panel = document.createElement('div');
        state.panel.textContent = 'Ready';
        document.body.appendChild(state.panel);

        state.intervalId = setInterval(async () => {
            // Your logic...
        }, 1000);
    })();
})();
```

### New Way (10 lines with async IIFE)
```js
(async () => {
    await createPlugin('my-plugin', async (h) => {
        const reader = await h.createLogReader();
        const panel = h.createElement('div');
        document.body.appendChild(panel);
        h.useInterval(async () => { /* logic */ }, 1000);
    });
})().catch(err => console.error('Plugin error:', err));
```

## Notes

- All resources are automatically cleaned up when the plugin is removed or reloaded
- The helpers handle null checks and error handling internally
- Cleanup is awaited, so async operations complete properly
- If setup() throws an error, cleanup still runs
- Each plugin instance is tracked separately

## Related

- [PLUGIN_CHECKLIST.md](../PLUGIN_CHECKLIST.md) — Pre-submission verification
- [SECURITY.md](../SECURITY.md) — Best practices
- [plugin-template-simple.js](../available-plugins/plugin-template-simple.js) — Simple example
- [available-plugins/](../available-plugins/) — More examples
