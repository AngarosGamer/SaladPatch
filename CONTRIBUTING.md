# Contributing to SaladPatch

Thanks for your interest in contributing to SaladPatch! This document outlines how you can submit plugins, themes, and improvements to the project.

## Code of Conduct

- Be respectful and constructive in all interactions.
- Help other community members improve their work.
- Report issues and provide detailed feedback.

## Types of Contributions

### 1. **Plugins & Themes**

Submit custom plugins and themes by:
1. Creating a well-structured JavaScript file following the [Plugin/Theme Authoring Guide](#plugintheme-authoring-guide)
2. Testing thoroughly in your local environment
3. Opening a pull request with your submission

### 2. **Core API Improvements**

To propose enhancements to core runtime APIs:
1. Discuss your idea in an issue first to gather feedback
2. Document the API in [docs/](docs/)
3. Include examples in the template or documentation
4. Ensure backward compatibility

### 3. **Documentation**

- Improve README clarity
- Expand API documentation with examples
- Fix typos or add missing information
- Create tutorials or best practices guides

### 4. **Bug Reports & Issues**

See [Reporting Issues](#reporting-issues) below.

## 🚀 Quick Start: Writing Your First Plugin

The **easiest way to write plugins** is using `createPlugin()` — it handles all the boilerplate automatically!

### Simple Example (10 lines)

```js
(async () => {
    await createPlugin('my-plugin', async (h) => {
        const reader = await h.createLogReader();
        h.useInterval(async () => {
            const snapshot = await reader.poll();
            // Your code here
        }, 1000);
    });
})().catch(err => console.error('Plugin error:', err));
```

**That's it!** No guard checks, no cleanup registration, no state management. Everything is automatic.

**See:** [docs/api/createPlugin.md](docs/api/createPlugin.md) for the full reference with all helper methods.

## Submission Process

### Before You Start

- Read the [Design Philosophy](README.md#design-philosophy) section
- See the [Quick Start](#-quick-start-writing-your-first-plugin) above ⭐
- Review example plugins in `available-plugins/`
- Use the [Plugin Submission Checklist](PLUGIN_CHECKLIST.md)

### Step 1: Create Your Plugin/Theme

**For Plugins (Recommended - Using createPlugin):**
1. Copy `available-plugins/plugin-template-simple.js` ⭐ (recommended for beginners)
2. Replace the setup code with your own logic
3. Name it descriptively: `my-feature-display.js`
4. Test thoroughly in the `plugins/` folder

**For Plugins (Advanced - Manual cleanup):**
1. Copy `available-plugins/plugin-template-core-log.js`
2. Follow the authoring rules for cleanup registration
3. Name it descriptively
4. Test thoroughly in the `plugins/` folder

**For Themes:**
1. Copy `available-themes/catppuccin-latte.js` as a starting point
2. Name it descriptively: `my-theme.js`
3. Test thoroughly in the `themes/` folder

### Step 2: Prepare for Submission

- [ ] Complete the [Plugin Submission Checklist](PLUGIN_CHECKLIST.md)
- [ ] Add JSDoc comments explaining core behavior
- [ ] Verify no console errors appear when the plugin loads
- [ ] Test that the plugin can be safely removed and reloaded
- [ ] If adding a new API to core, document it in [docs/api/](docs/api/) with examples

### Step 3: Open a Pull Request

1. Move your plugin to `available-plugins/` or `available-themes/`
2. Update the relevant `README.md` (in `plugins/` or `themes/` folder)
3. Create a PR with:
   - Clear title: `Add [plugin-name] plugin` or `Add [theme-name] theme`
   - Description of what the plugin does
   - How it uses core APIs
   - Any known limitations or compatibility notes
   - Link to the checklist

## Plugin/Theme Authoring Guide

### Essential Rules

1. **Isolation via IIFE**
   ```js
   (() => {
       if (window.__myPluginLoaded__) return; // Prevent double-loading
       window.__myPluginLoaded__ = true;
       
       // Your code here
   })();
   ```

2. **Cleanup Registration**
   ```js
   const SCRIPT_KEY = window.__saladScriptContext 
       ? window.__saladScriptContext.key 
       : 'my-plugin';

   async function cleanup() {
       // Clear timers, listeners, readers, DOM changes
       if (state.intervalId) clearInterval(state.intervalId);
       if (state.reader) await state.reader.dispose();
       // Restore original state
   }

   window.__saladScripts.registerCleanup(SCRIPT_KEY, cleanup);
   ```

3. **Minimal DOM Footprint**
   - Use targeted CSS selectors
   - Avoid global style modifications
   - Don't assume DOM structure won't change
   - Clean up on removal

4. **Single Concern**
   - Keep plugins focused on one feature
   - Don't overlap with existing plugins
   - If adding shared logic, propose it for core

### API Usage

#### For Log Reading:
```js
const reader = await window.__saladCore.createLogReader({
    logDir: 'C:\\ProgramData\\Salad\\logs',
    initialTailBytes: 256 * 1024
});

const snapshot = await reader.poll();
for (const line of snapshot.lines) {
    // Parse and handle your line
}
```

#### For Network Monitoring:
```js
const metrics = await window.__saladCore.processIo.poll();
// { uploadBps, downloadBps, sessionUpBytes, sessionDownBytes, processes: [...] }
```

#### For Debug UI:
```js
window.__saladCoreDebug.setVisible(true);
window.__saladCoreDebug.render('Your Debug Content');
```

### Debugging Your Plugin

**Core System Debug Console** (Press `Ctrl+D`):
Monitor plugin injection status, system errors, and uptime. Useful for troubleshooting why your plugin isn't loading.

**Per-Plugin Debug Console** (Press `Ctrl+Shift+D` after your plugin is loaded):
Create a dedicated debug panel for your plugin:
```js
window.__saladCoreDebug.render('Plugin Status:\n- Running: true\n- Errors: 0');
window.__saladCoreDebug.setVisible(true);
```

**Browser Console** (`F12` in DevTools):
Check for runtime errors and log messages. If your plugin isn't working:
1. Open DevTools (F12)
2. Check the Console tab for errors
3. Look for your plugin's log messages
4. Use `window.__saladCoreLoaderDebug` to inspect loader state

See [docs/api/__saladCoreDebug.md](docs/api/__saladCoreDebug.md) and [docs/api/__saladCoreLoaderDebug.md](docs/api/__saladCoreLoaderDebug.md) for full references.

## Review Criteria

Your submission will be evaluated on:

- **Correctness** — Does it work as intended? No runtime errors?
- **Reliability** — Does it handle edge cases? Does cleanup work properly?
- **Performance** — Does it add unnecessary overhead? Does it block the render thread?
- **Safety** — Are there security concerns? Can it break other plugins?
- **Maintainability** — Is code readable? Are there comments explaining non-obvious logic?
- **Documentation** — Is the plugin purpose clear? Are dependencies documented?
- **Compliance** — Does it follow authoring rules and design philosophy?

**Common Rejection Reasons:**
- Missing or incomplete cleanup
- Performance issues (excessive polling, memory leaks)
- DOM/CSS modifications that break other plugins
- Security vulnerabilities or unsafe DOM manipulation
- Overly complex or undocumented logic
- Conflicts with existing plugins or core

## Reporting Issues

### Security Issues

**Do not open a public issue for security vulnerabilities.**

Send a Discord DM to @angaros with:
- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if you have one)

### Bug Reports

Include:
- Affected plugin(s) or core functionality
- Steps to reproduce the issue
- Expected vs. actual behavior
- Your environment (Windows version, Salad app version, active plugins)
- Error logs from the debug panel

### Feature Requests

- Describe the use case and benefit
- Explain why it should be in core vs. a plugin
- Provide a rough API sketch if proposing a new core function

## Testing Your Contribution

### Local Testing

1. Place your plugin in `plugins/` or theme in `themes/`
2. Run the injector against your Salad app instance
3. Verify it loads and works as intended
4. Test reload: modify and save the file, verify old state cleans up
5. Test with other active plugins to ensure compatibility

### Code Review

- Read through your code once more
- Check for missing error handling
- Verify comments explain complex sections
- Ensure no debug logging left behind

## Style Guide

- Use consistent indentation (spaces preferred)
- Use descriptive variable names
- Comment non-obvious logic
- Keep functions small and focused
- Use async/await for cleaner asynchronous code

## Questions?

- Check the [docs/](docs/) folder
- Review existing plugin examples
- Open a discussion issue if unsure

---

**Happy contributing!** 🎉

