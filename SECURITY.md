# Security & Best Practices Guide

This guide helps plugin authors write secure, reliable code for SaladPatch.

## Security Principles

### 1. Avoid Code Execution

❌ **DO NOT** use `eval()`:
```js
eval(userInput);  // DANGEROUS
```

❌ **DO NOT** use `Function()` constructor:
```js
new Function(userInput)();  // DANGEROUS
```

✅ **DO** parse data explicitly:
```js
const data = JSON.parse(userInput);  // Safely parse JSON
const lines = userInput.split('\n');  // Parse text explicitly
```

### 2. Sanitize DOM Operations

❌ **DO NOT** set innerHTML with untrusted data:
```js
element.innerHTML = userInput;  // DANGEROUS if userInput is unsanitized
```

❌ **DO NOT** blindly insert HTML:
```js
element.innerHTML = `<div>${apiResponse}</div>`;  // If apiResponse is untrusted
```

✅ **DO** use textContent for plain text:
```js
element.textContent = userInput;  // Safe - always plain text
```

✅ **DO** sanitize HTML if necessary:
```js
const div = document.createElement('div');
div.textContent = userInput;  // Safely escape
element.appendChild(div);
```

✅ **DO** construct DOM safely:
```js
const container = document.createElement('div');
container.textContent = data.name;  // textContent is always safe
element.appendChild(container);
```

### 3. Validate & Type-Check

✅ **DO** validate API responses:
```js
const snapshot = await reader.poll();
if (!Array.isArray(snapshot.lines)) {
    console.error('Invalid snapshot format');
    return;
}

for (const line of snapshot.lines) {
    if (typeof line !== 'string') continue;  // Skip invalid lines
    // Process line
}
```

✅ **DO** check API existence:
```js
if (!window.__saladCore || typeof window.__saladCore.createLogReader !== 'function') {
    console.warn('Required API not available');
    return;
}
```

✅ **DO** validate user/config input:
```js
const interval = Number(userInput);
if (!Number.isFinite(interval) || interval < 100 || interval > 60000) {
    console.error('Invalid interval:', userInput);
    return;
}
```

### 4. Protect Core Code

❌ **DO NOT** modify core loader:
```js
window.__saladCore.createLogReader = myFunction;  // DANGEROUS - breaks other plugins
```

❌ **DO NOT** override critical APIs:
```js
window.fetch = myFetch;  // DANGEROUS - breaks other code
```

✅ **DO** only use documented public APIs as-is
✅ **DO** propose new core features through issues/PRs

### 5. Resource Management

✅ **DO** clean up resources:
```js
async function cleanup() {
    // Clear timers
    if (state.timerId) clearInterval(state.timerId);
    
    // Close connections
    if (state.reader) await state.reader.dispose();
    
    // Remove listeners
    for (const listener of state.listeners) {
        listener.target.removeEventListener(listener.event, listener.handler);
    }
    
    // Remove DOM elements
    const element = document.getElementById('my-plugin-id');
    if (element) element.remove();
}

window.__saladScripts.registerCleanup(SCRIPT_KEY, cleanup);
```

✅ **DO** limit polling intervals (≥500ms preferred)
✅ **DO** limit saved history in memory

❌ **DO NOT** leave timers/listeners running:
```js
setInterval(expensiveOperation, 100);  // Bad: no cleanup
addEventListener('mousemove', handler);  // Bad: never removed
```

### 6. DOM & CSS Safety

✅ **DO** use specific selectors:
```js
const panel = document.getElementById('my-plugin-panel');  // Specific
```

❌ **DO NOT** use broad selectors:
```js
const all = document.querySelectorAll('div');  // Too broad
```

✅ **DO** namespace your CSS/IDs:
```js
const PANEL_ID = 'my-plugin-panel';
const STYLE_CLASS = 'my-plugin-style';
```

✅ **DO** clean up DOM on removal:
```js
async function cleanup() {
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.remove();
}
```

❌ **DO NOT** assume DOM structure:
```js
document.body.firstChild.firstChild.style.color = 'red';  // Fragile
```

### 7. Error Handling

✅ **DO** wrap async operations in try/catch:
```js
async function ensureReader() {
    try {
        state.reader = await window.__saladCore.createLogReader();
    } catch (err) {
        console.error('Failed to create reader:', err);
        return false;
    }
}
```

✅ **DO** handle missing APIs gracefully:
```js
if (!window.__saladCore?.createLogReader) {
    console.warn('Plugin requires createLogReader API');
    return;
}
```

✅ **DO** validate before using:
```js
const reader = await window.__saladCore.createLogReader();
if (!reader || typeof reader.poll !== 'function') {
    console.error('Invalid reader object');
    return;
}
```

### 8. Data Privacy

✅ **DO** be transparent about what data your plugin accesses
✅ **DO** document any logging or data collection
✅ **DO** respect user privacy in documentation

❌ **DO NOT** send data to external servers without user consent
❌ **DO NOT** collect more data than necessary

---

## Performance Considerations

### Polling Intervals

| Task | Recommended Interval |
|------|----------------------|
| UI updates | 500ms - 2000ms |
| Background monitoring | 1000ms - 5000ms |
| Debug diagnostics | 5000ms+ |

### Memory Management

✅ **DO** limit history/cache sizes:
```js
const MAX_LINES = 100;
const recentLines = [];

function addLine(line) {
    recentLines.push(line);
    if (recentLines.length > MAX_LINES) {
        recentLines.shift();
    }
}
```

❌ **DO NOT** create unbounded arrays

### CPU Usage

✅ **DO** avoid tight loops
✅ **DO** debounce frequent updates
✅ **DO** limit DOM mutations

❌ **DO NOT** parse all logs on every poll
❌ **DO NOT** update DOM on every line

---

## Common Pitfalls

### Pitfall 1: Not Checking for Existing Instances
```js
// BAD: Runs multiple times on reload
setInterval(pollLoop, 1000);

// GOOD: Runs only once
if (window.__myPluginLoaded__) return;
window.__myPluginLoaded__ = true;
setInterval(pollLoop, 1000);
```

### Pitfall 2: Forgetting Cleanup
```js
// BAD: Leaks timers and DOM on reload
setInterval(update, 1000);
document.body.appendChild(myPanel);

// GOOD: Cleans up properly
const cleanup = async () => {
    clearInterval(timerId);
    myPanel.remove();
    if (reader) await reader.dispose();
};
window.__saladScripts.registerCleanup(SCRIPT_KEY, cleanup);
```

### Pitfall 3: Assuming DOM Structure
```js
// BAD: Breaks if Salad UI changes
const target = document.body.firstChild.children[2];
target.appendChild(myElement);

// GOOD: Use specific selectors
const target = document.querySelector('[data-testid="dashboard"]');
if (target) target.appendChild(myElement);
```

### Pitfall 4: Blocking Operations
```js
// BAD: Blocks render thread
for (const line of allLogLines) {
    processLine(line);  // Expensive
}

// GOOD: Process in batches
await new Promise(resolve => setTimeout(resolve, 0));
```

---

## Reporting Security Issues

**Do not open public issues for security vulnerabilities.**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

---

## Additional Resources

- [PLUGIN_CHECKLIST.md](PLUGIN_CHECKLIST.md) — Pre-submission verification
- [CONTRIBUTING.md](CONTRIBUTING.md) — Submission guidelines
- [docs/api/](docs/api/) — API documentation
- [available-plugins/](available-plugins/) — Example implementations

---

**Questions?** Open a discussion issue or contact the maintainers.

