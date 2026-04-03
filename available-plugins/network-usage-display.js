(() => {
    if (window.__networkUsageDisplayPlugin__) {
        return;
    }
    window.__networkUsageDisplayPlugin__ = true;

    const PANEL_ID = 'network-usage-display-panel';
    const PERF_WIDGET_ID = 'network-usage-performance-widget';
    const POLL_INTERVAL_MS = 1000;
    const DEBUG_SHORTCUT_KEY = 'n';
    const SCRIPT_KEY = window.__saladScriptContext ? window.__saladScriptContext.key : 'network-usage-display';
    const DEBUG_LOG_EVERY_MS = 5000;

    const state = {
        totalUpBytes: 0,
        totalDownBytes: 0,
        processUpRateBps: 0,
        processDownRateBps: 0,
        processSessionUpBytes: 0,
        processSessionDownBytes: 0,
        processRows: [],
        usingProcessMetrics: false,
        warnedMissingProcessApi: false,
        debugVisible: false,
        shortcutAttached: false,
        perfCardNodes: null,
        lastDebugLogAt: 0,
        lastResourceIndex: 0,
        samples: [],
        intervalId: null,
        originalFetch: null,
        originalXhrSend: null,
        originalWebSocket: null
    };

    function logDebug(message, details) {
        void message;
        void details;
    }

    function onDebugShortcut(event) {
        const key = String(event.key || '').toLowerCase();
        if (!event.ctrlKey || key !== DEBUG_SHORTCUT_KEY) {
            return;
        }

        event.preventDefault();
        state.debugVisible = !state.debugVisible;

        const panel = document.getElementById(PANEL_ID);
        if (panel) {
            panel.style.display = state.debugVisible ? 'block' : 'none';
        }

        logDebug(`debug panel ${state.debugVisible ? 'shown' : 'hidden'} (Ctrl+N)`);
    }

    function logTickSummary(force) {
        const now = Date.now();
        if (!force && now - state.lastDebugLogAt < DEBUG_LOG_EVERY_MS) {
            return;
        }

        state.lastDebugLogAt = now;
        const rates = getRateBytesPerSec();
        logDebug('tick summary', {
            source: state.usingProcessMetrics ? 'process-io' : 'renderer-fallback',
            rendererDownBps: Math.round(rates.down),
            rendererUpBps: Math.round(rates.up),
            processDownBps: Math.round(state.processDownRateBps),
            processUpBps: Math.round(state.processUpRateBps),
            sessionDownBytes: state.usingProcessMetrics ? state.processSessionDownBytes : state.totalDownBytes,
            sessionUpBytes: state.usingProcessMetrics ? state.processSessionUpBytes : state.totalUpBytes,
            processCount: state.processRows.length
        });
    }

    function addDownBytes(bytes) {
        const n = Number(bytes || 0);
        if (Number.isFinite(n) && n > 0) {
            state.totalDownBytes += n;
        }
    }

    function tryParseContentLength(headers) {
        try {
            if (!headers || typeof headers.get !== 'function') return 0;
            const raw = headers.get('content-length');
            if (!raw) return 0;
            const parsed = Number(raw);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
        } catch (e) {
            return 0;
        }
    }

    function estimateXhrResponseBytes(xhr) {
        try {
            if (!xhr) return 0;

            const headerLength = Number(xhr.getResponseHeader('content-length') || 0);
            if (Number.isFinite(headerLength) && headerLength > 0) {
                return headerLength;
            }

            if (xhr.responseType === 'arraybuffer' && xhr.response) {
                return xhr.response.byteLength || 0;
            }

            if (xhr.responseType === 'blob' && xhr.response) {
                return xhr.response.size || 0;
            }

            if (xhr.responseType === '' || xhr.responseType === 'text') {
                return estimateBytes(xhr.responseText || '');
            }

            if (xhr.responseType === 'json' && xhr.response != null) {
                return estimateBytes(xhr.response);
            }
        } catch (e) {}

        return 0;
    }

    function estimateBytes(value) {
        if (value == null) return 0;

        if (typeof value === 'string') {
            return new TextEncoder().encode(value).length;
        }

        if (value instanceof Blob) {
            return value.size;
        }

        if (value instanceof ArrayBuffer) {
            return value.byteLength;
        }

        if (ArrayBuffer.isView(value)) {
            return value.byteLength;
        }

        if (value instanceof URLSearchParams) {
            return new TextEncoder().encode(value.toString()).length;
        }

        if (value instanceof FormData) {
            let total = 0;
            for (const [key, entry] of value.entries()) {
                total += estimateBytes(String(key));
                total += estimateBytes(entry);
            }
            return total;
        }

        try {
            return new TextEncoder().encode(JSON.stringify(value)).length;
        } catch (e) {
            return 0;
        }
    }

    function formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = Number(bytes || 0);
        let unitIndex = 0;

        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }

        const precision = unitIndex === 0 ? 0 : 2;
        return `${value.toFixed(precision)} ${units[unitIndex]}`;
    }

    function getRateBytesPerSec() {
        if (state.samples.length < 2) {
            return { up: 0, down: 0 };
        }

        const first = state.samples[0];
        const last = state.samples[state.samples.length - 1];
        const seconds = Math.max(0.001, (last.t - first.t) / 1000);

        return {
            up: Math.max(0, (last.up - first.up) / seconds),
            down: Math.max(0, (last.down - first.down) / seconds)
        };
    }

    async function pollProcessIoIfAvailable() {
        if (!window.__saladCore
            || !window.__saladCore.processIo
            || typeof window.__saladCore.processIo.poll !== 'function') {
            state.usingProcessMetrics = false;
            if (!state.warnedMissingProcessApi) {
                logDebug('process IO API not available, using renderer fallback');
                state.warnedMissingProcessApi = true;
            }
            return;
        }

        state.warnedMissingProcessApi = false;

        try {
            const snapshot = await window.__saladCore.processIo.poll();
            if (!snapshot || snapshot.ok !== true) {
                state.usingProcessMetrics = false;
                logDebug('process IO snapshot invalid, using renderer fallback', snapshot || null);
                return;
            }

            state.usingProcessMetrics = true;
            state.processDownRateBps = Number(snapshot.downloadRateBps || 0);
            state.processUpRateBps = Number(snapshot.uploadRateBps || 0);
            state.processSessionDownBytes = Number(snapshot.sessionDownBytes || 0);
            state.processSessionUpBytes = Number(snapshot.sessionUpBytes || 0);
            state.processRows = Array.isArray(snapshot.processes) ? snapshot.processes : [];
            if (snapshot.lastError) {
                logDebug('process IO monitor reported error', snapshot.lastError);
            }
        } catch (e) {
            state.usingProcessMetrics = false;
            logDebug('process IO poll threw, using renderer fallback', e && e.message ? e.message : String(e));
        }
    }

    function getOrCreatePanel() {
        let panel = document.getElementById(PANEL_ID);
        if (panel) return panel;

        panel = document.createElement('div');
        panel.id = PANEL_ID;
        Object.assign(panel.style, {
            position: 'fixed',
            right: '14px',
            bottom: '14px',
            zIndex: '2147483646',
            minWidth: '260px',
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '12px',
            lineHeight: '1.35',
            fontFamily: 'Mallory, Segoe UI, sans-serif',
            color: 'var(--ctp-text, #cdd6f4)',
            background: 'rgba(24, 26, 37, 0.9)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.32)',
            pointerEvents: 'none',
            whiteSpace: 'pre-wrap',
            display: state.debugVisible ? 'block' : 'none'
        });

        document.body.appendChild(panel);
        logDebug('created panel');
        return panel;
    }

    function findPerformanceHost() {
        const tabs = Array.from(document.querySelectorAll('[role="tab"], button'));
        for (const tab of tabs) {
            const text = (tab.textContent || '').trim().toLowerCase();
            if (!text.includes('performance')) {
                continue;
            }

            const controlledPanelId = tab.getAttribute('aria-controls');
            if (controlledPanelId) {
                const panel = document.getElementById(controlledPanelId);
                if (panel) {
                    const existingCard = panel.querySelector('.css-1upilqn');
                    if (existingCard && existingCard.parentElement) {
                        return existingCard.parentElement;
                    }
                    return panel;
                }
            }

            const nearbyPanel = tab.closest('[role="tabpanel"]');
            if (nearbyPanel) {
                const existingCard = nearbyPanel.querySelector('.css-1upilqn');
                if (existingCard && existingCard.parentElement) {
                    return existingCard.parentElement;
                }
                return nearbyPanel;
            }
        }

        const fallbackCard = document.querySelector('.css-1upilqn');
        if (fallbackCard && fallbackCard.parentElement) {
            return fallbackCard.parentElement;
        }

        return null;
    }

    function createPerformanceCard(label) {
        const card = document.createElement('div');
        card.className = 'css-1upilqn';
        card.innerHTML = [
            '<div class="css-15gie45">',
            '<div class="css-1dowl49">',
            '<div class="css-69i1ev">',
            '<span class="css-1isq3ap">',
            '<span class="css-1tob08e">',
            `<span class="css-cke5iv ei767vo0">${label}</span>`,
            '</span>',
            '</span>',
            '<span class="css-1nosrqs">',
            '<span class="css-fxzn2p ei767vo0" data-salad-network-value="1">--</span>',
            '</span>',
            '</div>',
            '</div>',
            '</div>'
        ].join('');

        const valueEl = card.querySelector('[data-salad-network-value="1"]');
        if (valueEl) {
            valueEl.style.whiteSpace = 'nowrap';
        }

        const labelEl = card.querySelector('.css-cke5iv.ei767vo0');
        if (labelEl) {
            labelEl.style.whiteSpace = 'nowrap';
        }

        return { card, valueEl };
    }

    function placeWidgetBeforeControls(widget, host) {
        if (!widget || !host) return;

        const controlsAnchor = host.querySelector('.css-s6bk41, .css-c8q551');
        if (controlsAnchor && controlsAnchor.parentElement === host) {
            if (widget.nextSibling !== controlsAnchor) {
                host.insertBefore(widget, controlsAnchor);
            }
            return;
        }

        if (widget.parentElement !== host) {
            host.appendChild(widget);
        }
    }

    function getOrCreatePerformanceWidget() {
        const host = findPerformanceHost();
        if (!host) return null;

        let widget = document.getElementById(PERF_WIDGET_ID);
        if (widget) {
            placeWidgetBeforeControls(widget, host);
            return widget;
        }

        widget = document.createElement('div');
        widget.id = PERF_WIDGET_ID;
        widget.setAttribute('data-salad-network-widget', '1');

        const downCard = createPerformanceCard('Network Download');
        const upCard = createPerformanceCard('Network Upload');
        const sessionDownCard = createPerformanceCard('Session Download');
        const sessionUpCard = createPerformanceCard('Session Upload');

        widget.appendChild(downCard.card);
        widget.appendChild(upCard.card);
        widget.appendChild(sessionDownCard.card);
        widget.appendChild(sessionUpCard.card);

        state.perfCardNodes = {
            downRate: downCard.valueEl,
            upRate: upCard.valueEl,
            sessionDown: sessionDownCard.valueEl,
            sessionUp: sessionUpCard.valueEl
        };

        placeWidgetBeforeControls(widget, host);
        return widget;
    }

    function processResourceEntries() {
        const entries = performance.getEntriesByType('resource');
        for (let i = state.lastResourceIndex; i < entries.length; i += 1) {
            const entry = entries[i];
            // Fetch/XMLHttpRequest traffic is tracked directly via patched APIs below.
            if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
                continue;
            }
            const received = entry.transferSize || entry.encodedBodySize || entry.decodedBodySize || 0;
            addDownBytes(received);
        }
        state.lastResourceIndex = entries.length;
    }

    function render() {
        const panel = getOrCreatePanel();
        const perfWidget = getOrCreatePerformanceWidget();
        const rendererRates = getRateBytesPerSec();
        const downRate = state.usingProcessMetrics ? state.processDownRateBps : rendererRates.down;
        const upRate = state.usingProcessMetrics ? state.processUpRateBps : rendererRates.up;
        const sessionDown = state.usingProcessMetrics ? state.processSessionDownBytes : state.totalDownBytes;
        const sessionUp = state.usingProcessMetrics ? state.processSessionUpBytes : state.totalUpBytes;
        const source = state.usingProcessMetrics ? 'Salad Process Family (estimate)' : 'Renderer fallback';

        const lines = [
            'Network Usage',
            `Source: ${source}`,
            `Download: ${formatBytes(downRate)}/s`,
            `Upload:   ${formatBytes(upRate)}/s`,
            `Session Down: ${formatBytes(sessionDown)}`,
            `Session Up:   ${formatBytes(sessionUp)}`
        ];

        if (state.usingProcessMetrics && state.processRows.length > 0) {
            lines.push('Top Processes:');
            const top = state.processRows
                .slice()
                .sort((a, b) => (b.downloadRateBps + b.uploadRateBps) - (a.downloadRateBps + a.uploadRateBps))
                .slice(0, 3);

            for (const row of top) {
                const name = row && row.name ? row.name : 'unknown';
                lines.push(`- ${name}: ${formatBytes(row.downloadRateBps || 0)}/s down, ${formatBytes(row.uploadRateBps || 0)}/s up`);
            }
        }

        panel.style.display = state.debugVisible ? 'block' : 'none';
        panel.textContent = lines.join('\n');

        if (perfWidget && state.perfCardNodes) {
            if (state.perfCardNodes.downRate) {
                state.perfCardNodes.downRate.textContent = `${formatBytes(downRate)}/s`;
            }
            if (state.perfCardNodes.upRate) {
                state.perfCardNodes.upRate.textContent = `${formatBytes(upRate)}/s`;
            }
            if (state.perfCardNodes.sessionDown) {
                state.perfCardNodes.sessionDown.textContent = formatBytes(sessionDown);
            }
            if (state.perfCardNodes.sessionUp) {
                state.perfCardNodes.sessionUp.textContent = formatBytes(sessionUp);
            }
        }
    }

    function patchNetworking() {
        if (typeof window.fetch === 'function') {
            state.originalFetch = window.fetch.bind(window);
            window.fetch = function patchedFetch(input, init) {
                try {
                    if (init && Object.prototype.hasOwnProperty.call(init, 'body')) {
                        state.totalUpBytes += estimateBytes(init.body);
                    }
                } catch (e) {}

                const fetchPromise = state.originalFetch(input, init);
                fetchPromise.then((response) => {
                    try {
                        let down = tryParseContentLength(response && response.headers);
                        if (down > 0) {
                            addDownBytes(down);
                            return;
                        }

                        if (response && typeof response.clone === 'function') {
                            response.clone().arrayBuffer().then((buf) => {
                                addDownBytes(buf && buf.byteLength ? buf.byteLength : 0);
                            }).catch(() => {});
                        }
                    } catch (e) {}
                }).catch(() => {});

                return fetchPromise;
            };
        }

        if (window.XMLHttpRequest && window.XMLHttpRequest.prototype && typeof window.XMLHttpRequest.prototype.send === 'function') {
            state.originalXhrSend = window.XMLHttpRequest.prototype.send;
            window.XMLHttpRequest.prototype.send = function patchedXhrSend(body) {
                try {
                    state.totalUpBytes += estimateBytes(body);
                } catch (e) {}

                try {
                    this.addEventListener('loadend', () => {
                        addDownBytes(estimateXhrResponseBytes(this));
                    }, { once: true });
                } catch (e) {}

                return state.originalXhrSend.call(this, body);
            };
        }

        if (typeof window.WebSocket === 'function') {
            state.originalWebSocket = window.WebSocket;
            const OriginalWebSocket = state.originalWebSocket;

            function WrappedWebSocket(url, protocols) {
                const ws = protocols === undefined
                    ? new OriginalWebSocket(url)
                    : new OriginalWebSocket(url, protocols);

                const originalSend = ws.send;
                ws.send = function patchedSend(data) {
                    try {
                        state.totalUpBytes += estimateBytes(data);
                    } catch (e) {}
                    return originalSend.call(this, data);
                };

                ws.addEventListener('message', (event) => {
                    try {
                        addDownBytes(estimateBytes(event.data));
                    } catch (e) {}
                });

                return ws;
            }

            WrappedWebSocket.prototype = OriginalWebSocket.prototype;
            Object.setPrototypeOf(WrappedWebSocket, OriginalWebSocket);
            window.WebSocket = WrappedWebSocket;
        }
    }

    function unpatchNetworking() {
        if (state.originalFetch && window.fetch !== state.originalFetch) {
            window.fetch = state.originalFetch;
        }

        if (state.originalXhrSend
            && window.XMLHttpRequest
            && window.XMLHttpRequest.prototype
            && window.XMLHttpRequest.prototype.send !== state.originalXhrSend) {
            window.XMLHttpRequest.prototype.send = state.originalXhrSend;
        }

        if (state.originalWebSocket && window.WebSocket !== state.originalWebSocket) {
            window.WebSocket = state.originalWebSocket;
        }
    }

    async function tick() {
        processResourceEntries();

        await pollProcessIoIfAvailable();

        state.samples.push({
            t: Date.now(),
            up: state.totalUpBytes,
            down: state.totalDownBytes
        });

        while (state.samples.length > 12) {
            state.samples.shift();
        }

        render();
        logTickSummary(false);
    }

    function cleanup() {
        logDebug('cleanup start');
        if (state.intervalId) {
            clearInterval(state.intervalId);
            state.intervalId = null;
        }

        unpatchNetworking();

        const panel = document.getElementById(PANEL_ID);
        if (panel) {
            panel.remove();
        }

        const perfWidget = document.getElementById(PERF_WIDGET_ID);
        if (perfWidget) {
            perfWidget.remove();
        }
        state.perfCardNodes = null;

        if (state.shortcutAttached) {
            window.removeEventListener('keydown', onDebugShortcut, true);
            state.shortcutAttached = false;
        }

        if (window.__saladScripts && typeof window.__saladScripts.unregisterCleanup === 'function') {
            window.__saladScripts.unregisterCleanup(SCRIPT_KEY);
        }

        logDebug('cleanup complete');
    }

    function start() {
        logDebug('start', { scriptKey: SCRIPT_KEY, pollIntervalMs: POLL_INTERVAL_MS });
        if (window.__saladScripts && typeof window.__saladScripts.registerCleanup === 'function') {
            window.__saladScripts.registerCleanup(SCRIPT_KEY, cleanup);
        }

        if (!state.shortcutAttached) {
            window.addEventListener('keydown', onDebugShortcut, true);
            state.shortcutAttached = true;
        }

        patchNetworking();
        tick();
        state.intervalId = window.setInterval(() => {
            tick().catch(() => {});
        }, POLL_INTERVAL_MS);

        window.addEventListener('beforeunload', cleanup);
    }

    start();
})();
