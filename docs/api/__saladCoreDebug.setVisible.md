# window.__saladCoreDebug.setVisible(panelId, visible)

Owner: core debug API

Sets panel visibility explicitly.

## Inputs

Function signature:

```js
window.__saladCoreDebug.setVisible(panelId, visible)
```

- `panelId` (string, required): Existing or future panel id.
- `visible` (boolean, required): `true` to show, `false` to hide.

## Outputs

- No return value.
- Panel display state is updated immediately.

## Example Usage

```js
window.__saladCoreDebug.setVisible('workload-debug', true);
```
