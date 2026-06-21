# SaladPatch Plugins

This folder is for active plugins that are loaded by the injector.

If you want to browse examples or templates, see [available-plugins](../available-plugins).

## Active Plugins

- [workload-type-display](workload-type-display.js): Displays the currently active workload type inline in the Salad UI.
- [network-usage-display](network-usage-display.js): Shows live renderer upload/download rates and session transfer totals.
- [plugin-template-core-log](../available-plugins/plugin-template-core-log.js): Starter template that shows how to build a plugin on top of `window.__saladCore.createLogReader(options)`.
- [api-extension](api-extension.js): Scrapes Salad's rendered UI and feeds a local HTTP API server exposed by the loader. If the widget is hidden, it serves cached last-known values and includes a disclaimer that live updates need the widget pinned/open.
