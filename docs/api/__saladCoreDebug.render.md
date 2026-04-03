# window.__saladCoreDebug.render(panelId, options)

Owner: core debug API

Creates or updates a debug panel and optionally controls visibility.

## Inputs

Function signature:

```js
window.__saladCoreDebug.render(panelId, options)
```

- `panelId` (string, required): Stable DOM id for your panel.
- `options` (object, required):
  - `title` (string, optional): Panel heading.
  - `lines` (string[], optional): Body lines.
  - `defaultVisible` (boolean, optional): Applied only once on first render.
  - `visible` (boolean, optional): Immediate visibility override.

## Outputs

- No return value.
- Panel text content is rendered as `title + lines` joined by newlines.

## Example Usage

```js
window.__saladCoreDebug.render('workload-debug', {
  title: 'Workload Plugin Debug',
  lines: [
    'Status: active',
    'Last event: summary parsed'
  ],
  defaultVisible: false
});
```
