/**
 * Plugin Helper Functions
 * 
 * Pre-built utilities for common plugin patterns.
 * All helpers automatically register cleanup on plugin removal.
 * 
 * Usage:
 *   const h = window.__saladPluginHelpers;
 *   const reader = await h.createLogReader(options);
 *   const interval = h.useInterval(callback, ms);
 *   h.useDOM(element); // Auto-cleaned on removal
 */

module.exports = function exposePluginHelpers(page) {
    return page.evaluate(() => {
        if (window.__saladPluginHelpers && window.__saladPluginHelpers.__version === 1) {
            return;
        }

        let currentPluginKey = null;
        let resources = {};

        window.__saladPluginHelpers = {
            __version: 1,

            /**
             * Set current plugin context for cleanup tracking.
             * Called automatically by createPlugin().
             * @param {string} key - Script key for this plugin
             */
            _setPluginKey(key) {
                currentPluginKey = key;
                if (!resources[key]) {
                    resources[key] = {
                        readers: [],
                        intervals: [],
                        listeners: [],
                        elements: []
                    };
                }
            },

            /**
             * Clean up all resources for current plugin.
             * Called automatically on plugin removal.
             */
            async _cleanup(key) {
                const res = resources[key];
                if (!res) return;

                // Clear intervals
                for (const id of res.intervals) {
                    clearInterval(id);
                }
                res.intervals = [];

                // Dispose readers
                for (const reader of res.readers) {
                    try {
                        if (reader && typeof reader.dispose === 'function') {
                            await reader.dispose();
                        }
                    } catch (e) {}
                }
                res.readers = [];

                // Remove listeners
                for (const { target, event, handler } of res.listeners) {
                    target?.removeEventListener?.(event, handler);
                }
                res.listeners = [];

                // Remove DOM elements
                for (const el of res.elements) {
                    el?.remove?.();
                }
                res.elements = [];

                delete resources[key];
            },

            /**
             * Create a log reader with automatic cleanup.
             * @param {object} options - Log reader options
             * @return {object} Reader with poll() and dispose()
             */
            async createLogReader(options) {
                if (!window.__saladCore?.createLogReader) {
                    throw new Error('window.__saladCore.createLogReader not available');
                }

                const reader = await window.__saladCore.createLogReader(options);
                if (currentPluginKey && resources[currentPluginKey]) {
                    resources[currentPluginKey].readers.push(reader);
                }
                return reader;
            },

            /**
             * Poll the default Salad log.
             * @return {object} Log snapshot { lines: [...], ok: bool, error?: string }
             */
            async pollLog() {
                if (!window.__saladCore?.log?.pollDefault) {
                    throw new Error('window.__saladCore.log.pollDefault not available');
                }
                return window.__saladCore.log.pollDefault();
            },

            /**
             * Poll process I/O metrics.
             * @return {object} Metrics { uploadBps, downloadBps, sessionUpBytes, sessionDownBytes, processes: [...] }
             */
            async pollProcessIo() {
                if (!window.__saladCore?.processIo?.poll) {
                    throw new Error('window.__saladCore.processIo.poll not available');
                }
                return window.__saladCore.processIo.poll();
            },

            /**
             * Create an interval with automatic cleanup.
             * @param {function} callback - Function to call repeatedly
             * @param {number} ms - Interval in milliseconds
             * @return {number} Interval ID (for manual control if needed)
             */
            useInterval(callback, ms) {
                const id = setInterval(callback, ms);
                if (currentPluginKey && resources[currentPluginKey]) {
                    resources[currentPluginKey].intervals.push(id);
                }
                return id;
            },

            /**
             * Register an event listener with automatic cleanup.
             * @param {EventTarget} target - Element or object with addEventListener
             * @param {string} event - Event name
             * @param {function} handler - Event handler
             * @param {object} options - addEventListener options
             */
            useListener(target, event, handler, options) {
                if (!target || typeof target.addEventListener !== 'function') {
                    throw new Error('Invalid listener target');
                }

                target.addEventListener(event, handler, options);

                if (currentPluginKey && resources[currentPluginKey]) {
                    resources[currentPluginKey].listeners.push({
                        target,
                        event,
                        handler
                    });
                }
            },

            /**
             * Create and track a DOM element for automatic cleanup.
             * @param {string} tag - HTML tag name
             * @param {object} attrs - Attributes to set
             * @param {object} style - Style properties
             * @return {HTMLElement} Created element
             */
            createElement(tag, attrs, style) {
                const el = document.createElement(tag);

                if (attrs) {
                    for (const [key, value] of Object.entries(attrs)) {
                        if (value === null || value === undefined) continue;
                        if (key === 'class') {
                            el.className = value;
                        } else if (key === 'id') {
                            el.id = value;
                        } else {
                            el.setAttribute(key, value);
                        }
                    }
                }

                if (style) {
                    Object.assign(el.style, style);
                }

                if (currentPluginKey && resources[currentPluginKey]) {
                    resources[currentPluginKey].elements.push(el);
                }

                return el;
            },

            /**
             * Track existing DOM element for automatic cleanup.
             * @param {HTMLElement} element - Element to track
             * @return {HTMLElement} The same element
             */
            useDOM(element) {
                if (!element || typeof element.remove !== 'function') {
                    throw new Error('Invalid DOM element');
                }

                if (currentPluginKey && resources[currentPluginKey]) {
                    resources[currentPluginKey].elements.push(element);
                }

                return element;
            },

            /**
             * Safely set element text (escapes HTML).
             * @param {HTMLElement} element - Target element
             * @param {string} text - Text content
             */
            setText(element, text) {
                if (!element) return;
                element.textContent = text;
            },

            /**
             * Safely append styled text to element.
             * @param {HTMLElement} container - Parent element
             * @param {string} text - Text to append
             * @param {string} color - Optional color
             * @return {HTMLElement} The text span (auto-tracked)
             */
            appendText(container, text, color) {
                if (!container) return null;
                const span = this.createElement('span');
                this.setText(span, text);
                if (color) {
                    span.style.color = color;
                }
                container.appendChild(span);
                return span;
            },

            /**
             * Show debug panel with content.
             * @param {string} panelId - Panel identifier
             * @param {string} title - Panel title
             * @param {string[]} lines - Content lines
             * @param {object} options - Additional options (visible, shortcut)
             */
            showDebug(panelId, title, lines, options) {
                if (!window.__saladCoreDebug) {
                    throw new Error('window.__saladCoreDebug not available');
                }

                window.__saladCoreDebug.render(panelId, {
                    title,
                    lines: Array.isArray(lines) ? lines : [],
                    visible: options?.visible ?? true,
                    defaultVisible: options?.defaultVisible ?? false
                });

                if (options?.shortcut) {
                    window.__saladCoreDebug.registerToggleShortcut(panelId, options.shortcut);
                }
            },

            /**
             * Log helper - safely stringify values.
             * @param {*} value - Value to stringify
             * @return {string} String representation
             */
            stringify(value) {
                if (typeof value === 'string') return value;
                if (value === null) return 'null';
                if (value === undefined) return 'undefined';
                if (typeof value === 'object') {
                    try {
                        return JSON.stringify(value);
                    } catch (e) {
                        return String(value);
                    }
                }
                return String(value);
            }
        };
    });
};
