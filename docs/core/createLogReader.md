# createLogReader(options)

Source: core/log-reader.js

Builds a raw log reader that follows the latest matching file and returns only new complete lines on each poll.

## Inputs

Function signature:

```js
createLogReader(options)
```

`options` object:

- `logDir` (string, required): Directory to scan for log files.
- `fileRegex` (RegExp, required): File name matcher for eligible logs.
- `initialTailBytes` (number, optional): When switching files after startup, begin near the end of file instead of from byte 0.
- `maxRecentLines` (number, optional): In-memory rolling history size used for diagnostics.

## Outputs

Returns an object:

```js
{ poll }
```

- `poll` (function): Reads new data and returns a snapshot.

`poll()` snapshot shape:

```js
{
  ok: true,
  currentFile: "C:\\ProgramData\\Salad\\logs\\log-20260403.txt",
  currentOffset: 123456,
  lastEvent: "Read 78 bytes",
  lastError: "",
  lastReadBytes: 78,
  lines: ["...new lines..."],
  recentLines: ["...recent history..."],
  at: 1712160000000
}
```

## Behavior Notes

- Returns only complete newline-terminated lines in `lines`.
- Automatically tracks the newest file by mtime that matches `fileRegex`.
- Detects truncation/rotation and resets offsets safely.
- Does not parse domain-specific content.

## Example Usage

```js
const { createLogReader } = require('./core/log-reader');

const reader = createLogReader({
  logDir: 'C:\\ProgramData\\Salad\\logs',
  fileRegex: /^log-\d{8}(?:[-_].+)?\.txt$/i,
  initialTailBytes: 256 * 1024,
  maxRecentLines: 100
});

const snapshot = reader.poll();
if (snapshot.lines.length) {
  for (const line of snapshot.lines) {
    console.log(line);
  }
}
```
