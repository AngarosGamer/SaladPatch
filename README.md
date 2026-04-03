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

## Example Plugin Pattern
1. Poll `window.__saladCoreLogPoll()` for new lines.
2. Parse only what your plugin needs.
3. Apply minimal UI changes.
4. Use `window.__saladCoreDebug` for optional diagnostics.

## Plugin Quickstart
1. Copy `available-plugins/plugin-template-core-log.js` into `plugins/` and rename it.
2. Replace `handleLine()` with your own plugin-specific parsing logic.
3. Prefer `window.__saladCore.createLogReader(options)` for new plugins.
4. If your plugin owns timers or UI changes, register cleanup with `window.__saladScripts.registerCleanup()`.
5. Keep broad reusable logic in core and plugin behavior in plugin files.


### 👐 Contributing

> [!NOTE]<br>
> Contributing is open to anyone, but the approval of any pull request remains at the charge of code owners. Your contribution, if it does not meet the requirements, may be rejected.
