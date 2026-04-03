# window.__saladCoreDebug.toggle(panelId)

Owner: core debug API

Flips visibility state for a panel.

## Inputs

Function signature:

```js
window.__saladCoreDebug.toggle(panelId)
```

- `panelId` (string, required): Panel id to toggle.

## Outputs

- No return value.
- Visible becomes hidden, hidden becomes visible.

## Example Usage

```js
window.__saladCoreDebug.toggle('workload-debug');
```
