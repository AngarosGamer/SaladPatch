# SaladPatch

<p align="center">
SaladPatch is a community-driven injector tool which allows community members of the Salad Application to develop and use their own custom themes and plugins directly within the Salad App!
</p>

## Design Philosophy
- Make code legible and easy to review.
- Keep plugins focused: one concern per plugin where possible.
- Build globally useful capabilities into core and document them.
- Keep plugin code low-impact so plugins/themes can be mixed and matched safely.

## Folder Model
- `plugins/` and `themes/` are active and auto-loaded.
- `available-plugins/` and `available-themes/` are storage for optional scripts.
- Core runtime code lives in `loader.js` and `core/`.

## Authoring Rules
- Put globally useful functionality in core and document it here.
- Put plugin-specific behavior (parsing, UI changes for one feature) in that plugin file.
- If a plugin allocates timers, listeners, observers, readers, or page mutations, register a cleanup function and restore state on removal/reload.
- Minimize DOM/style interference:
	- Prefer targeted selectors.
	- Avoid broad global CSS or prototype modifications.
	- Avoid assumptions that break when other plugins are present.

## Documentation
- Function-level core API docs: [docs/README.md](docs/README.md)

## 🚀 Plugin Quickstart (Easy Way)

**Using `createPlugin()` — Automatic cleanup, no boilerplate!**

```js
(async () => {
    await createPlugin('my-plugin', async (h) => {
        const reader = await h.createLogReader();
        
        h.useInterval(async () => {
            const snapshot = await reader.poll();
            for (const line of snapshot.lines) {
                if (/pattern/.test(line)) {
                    console.log(line);
                }
            }
        }, 1500);
    });
})().catch(err => console.error('Plugin error:', err));
```

**Done!** Everything cleans up automatically when the plugin is removed.

See [docs/api/createPlugin.md](docs/api/createPlugin.md) for full reference with all helpers.

## 🐛 Debugging

**Core System Debug Console** (Press `Ctrl+D`):

Monitor loader health, plugin injection statistics, and system errors with the built-in debug console:

```js
// Manually toggle (optional — Ctrl+D works automatically)
window.__saladCoreLoaderDebug.toggle();

// Log custom events to debug panel
window.__saladCoreLoaderDebug.logEvent('MY_EVENT', 'Something happened', details);

// Check visibility
if (window.__saladCoreLoaderDebug.isVisible()) {
    console.log('Debug panel is open');
}
```

See [docs/api/__saladCoreLoaderDebug.md](docs/api/__saladCoreLoaderDebug.md) for full reference.

**Plugin Debug Console** (Press `Ctrl+Shift+D`):

Each plugin can render its own debug overlay. See [docs/api/__saladCoreDebug.md](docs/api/__saladCoreDebug.md) for per-plugin debug panel setup.

## Legacy Plugin Pattern (Advanced)

1. Copy `available-plugins/plugin-template-core-log.js` into `plugins/` and rename it.
2. Replace `handleLine()` with your own plugin-specific parsing logic.
3. Use `window.__saladCore.createLogReader(options)` for log access.
4. Register cleanup with `window.__saladScripts.registerCleanup()`.
5. Keep reusable logic in core and plugin-specific code in the plugin.


### ⚠️ Disclaimers

> [!CAUTION]<br>
> Running SaladPatch is not without risks! While we try our best to verify that patches are secure, running external scripts from the internet is ALWAYS a security risk.
> Use at your own risk.

> [!WARNING]<br>
> SaladPatch is in no way affiliated or endorsed by SaladTechnologies. As stated officially by their team, they do not recommend running this program.
> Scripts may cause issues with the Salad App, we make no guarantee concerning the stability of the app while running SaladPatch.
