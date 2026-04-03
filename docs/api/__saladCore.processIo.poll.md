# window.__saladCore.processIo.poll()

Owner: core runtime facade (loader.js + core/process-io-monitor.js)

Returns process-family IO rate estimates for Salad-related processes on Windows.

## Inputs

Function signature in renderer:

```js
const snapshot = await window.__saladCore.processIo.poll()
```

- No arguments.

## Outputs

```js
{
  ok: true,
  source: "process-io-estimate",
  processNames: string[],
  processCount: number,
  sessionDownBytes: number,
  sessionUpBytes: number,
  downloadRateBps: number,
  uploadRateBps: number,
  processes: [
    {
      pid: number,
      name: string,
      readTotalBytes: number,
      writeTotalBytes: number,
      downloadRateBps: number,
      uploadRateBps: number
    }
  ],
  lastError: string,
  at: number
}
```

## Notes

- This is an estimate based on process IO counters, not packet-sniffed network bytes.
- It is useful for visibility into Salad process family activity (`Salad`, `Salad.Bowl.Service`, `Salad.Bootstrapper`, WSL-related processes).
- Plugin UIs can prefer this source and keep renderer metrics as fallback.

## Example Usage

```js
if (window.__saladCore?.processIo?.poll) {
  const io = await window.__saladCore.processIo.poll();
  console.log(io.downloadRateBps, io.uploadRateBps);
}
```
