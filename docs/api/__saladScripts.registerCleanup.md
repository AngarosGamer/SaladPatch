# window.__saladScripts.registerCleanup(key, cleanupFn)

Owner: loader runtime

Registers a cleanup function that the loader can call when a script is removed from the folder or replaced with a changed file.

## Inputs

Function signature in renderer:

```js
window.__saladScripts.registerCleanup(key, cleanupFn)
```

- `key` (string, required): Script key provided by `window.__saladScriptContext.key`.
- `cleanupFn` (function, required): Function to run before the script is unloaded or reloaded.

## Outputs

- No return value.
- The cleanup function is stored by the loader and may be invoked later.

## Typical Cleanup Tasks

Use this hook to:

- Clear intervals and timeouts
- Disconnect observers and listeners
- Dispose of plugin-specific readers or handles
- Restore text or DOM changes made by the plugin
- Hide any debug panels the plugin created

## Example Usage

```js
const scriptKey = window.__saladScriptContext
  ? window.__saladScriptContext.key
  : 'my-plugin';

async function cleanup() {
  clearInterval(timerId);
  await reader.dispose();
}

window.__saladScripts.registerCleanup(scriptKey, cleanup);
```

## Notes

- This is the opt-in removal/reload contract for plugins.
- If your plugin does not allocate resources or mutate the page, you may not need a cleanup function.
