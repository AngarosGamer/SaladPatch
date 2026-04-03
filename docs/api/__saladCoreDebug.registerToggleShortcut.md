# window.__saladCoreDebug.registerToggleShortcut(panelId, shortcut)

Owner: core debug API

Registers a keyboard shortcut that toggles a specific panel.

## Inputs

Function signature:

```js
window.__saladCoreDebug.registerToggleShortcut(panelId, shortcut)
```

- `panelId` (string, required): Panel to toggle.
- `shortcut` (object, optional):
  - `ctrlKey` (boolean, default `true`)
  - `altKey` (boolean, default `false`)
  - `shiftKey` (boolean, default `false`)
  - `key` (string, default `"d"`)

## Outputs

- No return value.
- One key listener is registered per panel id.

## Example Usage

```js
window.__saladCoreDebug.registerToggleShortcut('workload-debug', {
  ctrlKey: true,
  altKey: false,
  shiftKey: false,
  key: 'd'
});
```
