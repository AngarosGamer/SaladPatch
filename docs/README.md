# Core API Docs Index

This folder contains function-level documentation for core features that plugins can build on.

## 🚀 Getting Started (Recommended)

**New to plugin development?** Start here:
- [createPlugin()](api/createPlugin.md) — **Simplified plugin initialization with automatic cleanup** ⭐

## Debugging

- [window.__saladCoreLoaderDebug](api/__saladCoreLoaderDebug.md) — Core loader debug console (Press `Ctrl+D`)
- [window.__saladCoreDebug](api/__saladCoreDebug.md) — Per-plugin debug console (Press `Ctrl+Shift+D`)

## Core Modules

- [createLogReader](core/createLogReader.md)
- [ensureCoreDebugWindowApi](core/ensureCoreDebugWindowApi.md)

## Renderer-Exposed APIs (Use via Helpers)

### Simplified API (Recommended for New Plugins)
- [createPlugin(name, setup)](api/createPlugin.md) — Automatic lifecycle management ⭐
- [window.__saladPluginHelpers](api/createPlugin.md#helpers) — Helper methods for common tasks

### Advanced API (Direct Access)
- [window.__saladCore.createLogReader](api/__saladCore.createLogReader.md)
- [window.__saladCoreLogPoll](api/__saladCoreLogPoll.md)
- [window.__saladCore.processIo.poll](api/__saladCore.processIo.poll.md)
- [window.__saladCoreDebug.render](api/__saladCoreDebug.render.md)
- [window.__saladCoreDebug.setVisible](api/__saladCoreDebug.setVisible.md)
- [window.__saladCoreDebug.toggle](api/__saladCoreDebug.toggle.md)
- [window.__saladCoreDebug.registerToggleShortcut](api/__saladCoreDebug.registerToggleShortcut.md)
- [window.__saladCoreLoaderDebug](api/__saladCoreLoaderDebug.md)
- [window.__saladScripts.registerCleanup](api/__saladScripts.registerCleanup.md)
