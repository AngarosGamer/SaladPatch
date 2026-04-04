# window.__saladCoreLoaderDebug

Core system debug console for SaladPatch loader diagnostics and monitoring.

## Overview

The `__saladCoreLoaderDebug` API provides a dedicated debug panel for monitoring the SaladPatch **loader system** (distinct from per-plugin debug consoles created by individual plugins). It displays initialization events, plugin injection statistics, and system errors.

## Features

- **Keyboard Toggle**: Press `Ctrl+D` to show/hide debug panel
- **Disabled by Default**: Debug console is hidden until explicitly toggled
- **Event Logging**: Tracks loader initialization, plugin injection, cleanup, and errors
- **Real-time Statistics**: Displays active plugins, error counts, system uptime
- **Error Reporting**: Shows recent errors from core operations and plugin failures

## Public API

### Methods

#### `logEvent(category, message, details)`

Log an event to the debug console.

**Parameters:**
- `category` (string): Event category (e.g., 'INJECT', 'INIT', 'CONNECT')
- `message` (string): Human-readable message
- `details` (any): Optional details or metadata

**Example:**
```javascript
window.__saladCoreLoaderDebug.logEvent('PLUGIN', 'Network display loaded', 'network-plugin.js');
```

#### `logError(message, error)`

Log an error to the debug console and error tracking.

**Parameters:**
- `message` (string): Error description
- `error` (Error|string): Error object or message

**Example:**
```javascript
try {
  // something
} catch (err) {
  window.__saladCoreLoaderDebug.logError('Plugin load failed', err);
}
```

#### `updatePluginStats(total, active, failed)`

Update the plugin statistics in the debug panel.

**Parameters:**
- `total` (number): Total number of plugins
- `active` (number): Active/successful plugins
- `failed` (number): Failed plugins

**Example:**
```javascript
window.__saladCoreLoaderDebug.updatePluginStats(5, 4, 1);
```

#### `toggle()`

Toggle the debug panel visibility.

**Example:**
```javascript
window.__saladCoreLoaderDebug.toggle();
```

#### `isVisible()`

Check if the debug panel is currently visible.

**Returns:** `boolean`

**Example:**
```javascript
if (window.__saladCoreLoaderDebug.isVisible()) {
  console.log('Debug panel is open');
}
```

## Debug Panel Display

The debug panel shows in the top-left corner with a clean, minimal design:

1. **Header**: "SaladPatch Core Debug Console"
2. **Runtime Stats**:
   - Uptime (e.g., "5m 23s")
   - Active plugins (e.g., "4/5 active")
   - Error summary (if any)
3. **Recent Errors** (last 5):
   - Timestamp + error message
   - Error details/stacktrace
4. **Recent Events** (last 10):
   - Categorized events with timestamps
5. **Controls**: Instructions to toggle with Ctrl+D

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+D | Toggle debug panel visibility |
| Close button (✕) | Hide debug panel (Alt: Ctrl+D) |

## Integration Points

The core debug system is automatically:

- **Initialized** by the loader when APIs are exposed (`ensureCoreApis`)
- **Updated** after each injection cycle with plugin statistics
- **Populated** with loader events and error logs
- **Exposed** to all pages via `window.__saladCoreLoaderDebug`

## Common Use Cases

### Debugging Plugin Load Failures

When a plugin fails to load, check the debug panel (Ctrl+D):
- Recent errors section shows which plugin failed and why
- Event log shows the injection timeline

### Monitoring System Health

Keep the debug panel open during development:
- Watch uptime and active plugin count
- See real-time error reporting
- Verify cleanup operations (plugins removed/unloaded)

### Troubleshooting Connection Issues

The debug console logs:
- Loader connection state
- API exposure timing
- Browser attach/detach events
- Reattachment attempts

## Notes

- Debug panel is positioned top-left with consistent styling across all debug consoles
- Max 100 events and 50 errors retained (older ones scrolled out)
- All data is cleared when the Salad app restarts
- Parent plugins can also log to this system via the API
- The debug system has minimal performance impact when hidden

## See Also

- [./\_\_saladCoreDebug.md](./__saladCoreDebug.md) - Per-plugin debug console API
- [./createPlugin.md](./createPlugin.md) - Plugin factory
- [../CONTRIBUTING.md](../CONTRIBUTING.md) - Community guidelines
