# window.__saladCoreLogPoll()

Owner: core (loader.js + core/log-reader.js)

Reads new Salad log lines since the previous poll and returns a structured snapshot.

## Inputs

Function signature in renderer:

```js
await window.__saladCoreLogPoll()
```

- No arguments.

## Outputs

Returns an object:

```js
{
  ok: true,
  currentFile: string,
  currentOffset: number,
  lastEvent: string,
  lastError: string,
  lastReadBytes: number,
  lines: string[],
  recentLines: string[],
  at: number
}
```

Field meanings:

- `lines`: New complete lines since last call.
- `recentLines`: Rolling history (diagnostic support).
- `lastError`: Empty string when healthy.

## Example Usage

```js
async function pollCoreLogs() {
  if (typeof window.__saladCoreLogPoll !== 'function') {
    return;
  }

  const snapshot = await window.__saladCoreLogPoll();
  for (const line of snapshot.lines) {
    console.log('new log line:', line);
  }
}
```

## Plugin Boundary Guidance

- Use this API for reading logs only.
- Keep parsing and feature logic inside your plugin.
