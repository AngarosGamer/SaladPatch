# Plugin & Theme Submission Checklist

Use this checklist before submitting your plugin or theme as a pull request. All items must be completed for approval.

## Code Quality

- [ ] Code follows consistent indentation and formatting
- [ ] All non-obvious logic is commented
- [ ] Variable names are descriptive
- [ ] No debug logging or `console.log()` left in code
- [ ] Code is readable and maintainable

## Plugin Structure

- [ ] Plugin is wrapped in an IIFE (immediately-invoked function expression)
- [ ] Plugin has a guard check to prevent double-loading:
  ```js
  if (window.__myPluginName__) {
      return;
  }
  window.__myPluginName__ = true;
  ```
- [ ] Proper script key is obtained:
  ```js
  const SCRIPT_KEY = window.__saladScriptContext 
      ? window.__saladScriptContext.key 
      : 'my-plugin';
  ```

## Lifecycle Management

- [ ] Cleanup function is registered:
  ```js
  window.__saladScripts.registerCleanup(SCRIPT_KEY, cleanup);
  ```
- [ ] Cleanup clears all timers/intervals
- [ ] Cleanup closes/disposes all readers
- [ ] Cleanup removes event listeners
- [ ] Cleanup removes DOM elements
- [ ] Cleanup restores original state

## Performance

- [ ] Impact on CPU usage is minimal
- [ ] Memory leaks are not present
- [ ] No unnecessary polling or continuous operations
- [ ] Polling intervals are reasonable (≥500ms for background tasks)
- [ ] Plugin does not block the render thread

## DOM & Styling

- [ ] DOM selectors are specific and targeted
- [ ] CSS selectors avoid broad global matches
- [ ] No inline styles that could conflict with other plugins/themes
- [ ] DOM changes are cleaned up on removal
- [ ] Plugin works alongside other active plugins

## Safety & Security

- [ ] No `eval()` or dynamic code execution
- [ ] No unsafe DOM manipulation (innerHTML without sanitization)
- [ ] No attempts to modify core loader code
- [ ] Data passed to DOM is properly escaped
- [ ] User input (if any) is validated

## Testing

- [ ] Plugin loads without errors
- [ ] No console errors or warnings appear on load
- [ ] Plugin functions as described
- [ ] Reload test: modify file, save, verify old state cleans up correctly
- [ ] Compatibility test: works with other active plugins
- [ ] Edge cases are handled (missing APIs, unexpected input)

## Documentation

- [ ] Plugin name is descriptive
- [ ] Plugin includes a brief header comment explaining its purpose:
  ```js
  /**
   * My Plugin - Description of what it does
   * 
   * Behavior: ...
   * Dependencies: window.__saladCore.createLogReader
   * Cleanup: Clears interval and disposes reader on removal
   */
  ```
- [ ] Complex logic blocks have explanatory comments
- [ ] Any configuration options are clearly labeled
- [ ] API usage is documented inline

## Authoring Rules Compliance

- [ ] ✅ One concern per plugin
- [ ] ✅ Shared logic is proposed for core or clearly factored
- [ ] ✅ Plugin does not interfere with DOM/styles globally
- [ ] ✅ Plugin registers cleanup for all resources
- [ ] ✅ Plugin follows existing patterns from examples

## API Usage

- [ ] Only uses documented public APIs (window.__saladCore, window.__saladCoreDebug, etc.)
- [ ] API calls are properly error-handled
- [ ] API availability is checked before use:
  ```js
  if (!window.__saladCore || typeof window.__saladCore.createLogReader !== 'function') {
      console.warn('Plugin requires createLogReader API');
      return;
  }
  ```

## Submission Preparation

- [ ] File is in `available-plugins/` (as a submission) or `plugins/` (if already approved)
- [ ] File name is descriptive: `my-feature-display.js` (not `plugin1.js`)
- [ ] Related README files are updated to reference the plugin
- [ ] PR title is clear: `Add [plugin-name] plugin`
- [ ] PR description explains what the plugin does
- [ ] Known limitations or browser compatibility notes are mentioned

## Before Submitting

1. ✅ Complete all checklist items above
2. ✅ Re-read your own code once more
3. ✅ Test in isolation and with other plugins
4. ✅ Verify cleanup works by reloading the plugin
5. ✅ Check for any performance regressions
6. ✅ Ensure all dependencies are documented
7. ✅ Run through the testing section one more time

---

**Questions?** See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

