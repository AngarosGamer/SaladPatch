# ensureCoreDebugWindowApi(page)

Source: core/debug-window.js

Installs a shared debug window API into the target renderer page as `window.__saladCoreDebug`.

## Inputs

Function signature:

```js
await ensureCoreDebugWindowApi(page)
```

- `page` (Puppeteer Page, required): Renderer page where the API should be injected.

## Outputs

- Returns a Promise that resolves after API installation check is complete.
- Idempotent: if a compatible API is already present (`__coreVersion === 1`), it exits without replacing it.

## Exposed Renderer API

After execution, the page contains:

- `window.__saladCoreDebug.render(panelId, options)`
- `window.__saladCoreDebug.setVisible(panelId, visible)`
- `window.__saladCoreDebug.toggle(panelId)`
- `window.__saladCoreDebug.registerToggleShortcut(panelId, shortcut)`

## Behavior Notes

- Panels are created lazily per `panelId`.
- Panel visibility defaults to hidden unless changed.
- Shortcut registration is once per panel to avoid duplicate listeners.

## Example Usage

```js
const { ensureCoreDebugWindowApi } = require('./core/debug-window');

await ensureCoreDebugWindowApi(page);

await page.evaluate(() => {
  window.__saladCoreDebug.render('example-panel', {
    title: 'Example Debug',
    lines: ['Initialized'],
    defaultVisible: false
  });
});
```
