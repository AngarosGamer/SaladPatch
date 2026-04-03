# window.__saladCore.createLogReader(options)

Owner: core runtime facade (loader.js + core/log-reader.js)

Creates a plugin-scoped log reader from renderer code and returns a small reader object.

## Inputs

Function signature in renderer:

```js
const reader = await window.__saladCore.createLogReader(options)
```

`options` (all optional):

- `logDir` (string): Log directory path. Default: `C:\\ProgramData\\Salad\\logs`
- `fileRegexPattern` (string): Regex source to match log files.
- `fileRegexFlags` (string): Regex flags. Default: `"i"`
- `initialTailBytes` (number): Initial tail read window.
- `maxRecentLines` (number): Diagnostic rolling history size.

## Outputs

Returns a Promise resolving to:

```js
{
  id: string,
  poll: () => Promise<LogSnapshot>,
  dispose: () => Promise<boolean>
}
```

`poll()` returns the same snapshot shape as `window.__saladCoreLogPoll()`.

## Example Usage

```js
(async () => {
  const reader = await window.__saladCore.createLogReader({
    fileRegexPattern: '^log-\\d{8}(?:[-_].+)?\\.txt$',
    fileRegexFlags: 'i',
    initialTailBytes: 128 * 1024
  });

  const snapshot = await reader.poll();
  for (const line of snapshot.lines) {
    console.log(line);
  }

  // Optional when plugin stops
  // await reader.dispose();
})();
```

## Notes

- This API is intended for plugin authors.
- Parsing logic should stay in your plugin; core only handles raw reading.
