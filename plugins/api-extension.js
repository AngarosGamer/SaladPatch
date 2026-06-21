/**
 * API Extension Plugin
 *
 * Scrapes the Salad app's rendered HTML and publishes a normalized snapshot
 * that the loader exposes through a local HTTP server.
 *
 * Copy this file into plugins/ to activate it.
 */

(async () => {
    await createPlugin('api-extension', async (h) => {
        const POLL_INTERVAL_MS = 1000;
        const STATE_KEY = '__saladApiExtensionState';
        const LIVE_DISCLAIMER = 'Live Salad values require the widget to remain open or pinned. When the widget is hidden, the API serves the last known values until fresh data is available again.';
        const SCRIPT_KEY = window.__saladScriptContext ? window.__saladScriptContext.key : 'api-extension';

        const state = {
            lastSnapshot: null,
            lastKnownResponse: null,
            lastError: '',
            observer: null,
            refreshQueued: false,
            intervalId: null,
            widgetVisible: true
        };

        function normalizeText(value) {
            return String(value || '').replace(/\s+/g, ' ').trim();
        }

        function parseCurrency(text) {
            const normalized = normalizeText(text).replace(/,/g, '');
            const match = normalized.match(/-?\d+(?:\.\d+)?/);
            return match ? Number(match[0]) : null;
        }

        function parsePredictionRange(text) {
            const normalized = normalizeText(text).replace(/,/g, '');
            const values = Array.from(normalized.matchAll(/\$?\d+(?:\.\d+)?/g))
                .map((match) => match[0].replace(/^\$/, ''))
                .filter(Boolean);

            if (values.length >= 2) {
                return {
                    value: `${values[0]}-${values[1]}`,
                    min: Number(values[0]),
                    max: Number(values[1])
                };
            }

            if (values.length === 1) {
                return {
                    value: values[0],
                    min: Number(values[0]),
                    max: Number(values[0])
                };
            }

            const compact = normalized.replace(/\s*~\s*/g, '-').replace(/\$/g, '');
            return {
                value: compact,
                min: null,
                max: null
            };
        }

        function findLabelNode(labelText) {
            const candidates = Array.from(document.querySelectorAll('span, p, button, div'));
            const target = normalizeText(labelText).toLowerCase();
            let bestMatch = null;
            let bestMatchLength = Number.POSITIVE_INFINITY;

            for (const node of candidates) {
                const text = normalizeText(node.textContent).toLowerCase();
                if (text === target) {
                    return node;
                }

                if (text.includes(target) && text.length < bestMatchLength) {
                    bestMatch = node;
                    bestMatchLength = text.length;
                }
            }

            return bestMatch;
        }

        function getBalance() {
            const node = Array.from(document.querySelectorAll('span, p, div')).find((el) => normalizeText(el.textContent).includes('Your Balance'));
            if (!node) {
                return null;
            }

            const container = node.closest('div') ? node.closest('div').parentElement : null;
            const valueNode = container ? container.querySelector('p[aria-label]') || container.querySelector('p') : null;
            const aria = valueNode ? valueNode.getAttribute('aria-label') || '' : '';
            const parts = Array.from(node.querySelectorAll('span[aria-hidden="true"]'))
                .map((el) => normalizeText(el.textContent))
                .filter(Boolean);
            const compact = normalizeText(parts.join('')) || normalizeText(valueNode ? valueNode.textContent : node.textContent);

            return {
                value: parseCurrency(aria || compact),
                text: compact,
                raw: normalizeText(valueNode ? valueNode.textContent : node.textContent)
            };
        }

        function getPredicted() {
            const node = findLabelNode('Est. Next Hour');
            if (!node) {
                return null;
            }

            const valueNode = node.closest('div') && node.closest('div').parentElement
                ? node.closest('div').parentElement.querySelector('p')
                : null;
            const valueText = valueNode ? normalizeText(valueNode.textContent) : normalizeText(node.nextElementSibling ? node.nextElementSibling.textContent : '');
            const range = parsePredictionRange(valueText);

            return {
                value: range.value,
                text: valueText,
                raw: valueText,
                min: range.min,
                max: range.max
            };
        }

        function getHistory() {
            const node = findLabelNode('Last 24 Hours');
            if (!node) {
                return null;
            }

            const valueNode = node.closest('div') && node.closest('div').parentElement
                ? node.closest('div').parentElement.querySelector('p[aria-label]') || node.closest('div').parentElement.querySelector('p')
                : null;
            const aria = valueNode ? valueNode.getAttribute('aria-label') || '' : '';
            const valueText = valueNode ? normalizeText(valueNode.textContent) : '';

            return {
                value: parseCurrency(aria || valueText),
                text: valueText || normalizeText(aria),
                raw: normalizeText((aria || valueText) || '')
            };
        }

        function getStatusButtonText() {
            const button = document.querySelector('button.css-leo3e7')
                || Array.from(document.querySelectorAll('button')).find((el) => normalizeText(el.textContent).length > 0);

            if (!button) {
                return '';
            }

            return normalizeText(button.textContent).replace(/\s+/g, ' ');
        }

        function getWorkloadCardState() {
            const titleNode = findLabelNode('Finding Job') || findLabelNode('Running Job') || findLabelNode('Downloading Job') || findLabelNode('Starting Job');
            const descriptionNode = Array.from(document.querySelectorAll('span, div, p'))
                .find((el) => normalizeText(el.textContent).toLowerCase().includes('looking for a job compatible with your hardware'));

            const titleText = titleNode ? normalizeText(titleNode.textContent) : '';
            const descriptionText = descriptionNode ? normalizeText(descriptionNode.textContent) : '';
            const combined = `${titleText} ${descriptionText}`.toLowerCase();

            if (/downloading/.test(combined)) {
                return {
                    response: 'downloading',
                    text: descriptionText || titleText,
                    raw: descriptionText || titleText
                };
            }

            if (/starting/.test(combined)) {
                return {
                    response: 'starting',
                    text: descriptionText || titleText,
                    raw: descriptionText || titleText
                };
            }

            if (/finding job|looking for a job|compatible with your hardware/.test(combined)) {
                return {
                    response: 'finding',
                    text: descriptionText || titleText,
                    raw: descriptionText || titleText
                };
            }

            if (/running job|running node compatibility|chopping/.test(combined)) {
                return {
                    response: 'running',
                    text: descriptionText || titleText,
                    raw: descriptionText || titleText
                };
            }

            return {
                response: 'finding',
                text: descriptionText || titleText,
                raw: descriptionText || titleText
            };
        }

        function getStatusAndState() {
            const statusText = getStatusButtonText();
            const workloadState = getWorkloadCardState();
            const lowered = statusText.toLowerCase();

            let status = 'running';
            if (/paused|idle/.test(lowered)) {
                status = 'paused';
            } else if (/starting/.test(lowered)) {
                status = 'starting';
            } else if (/downloading/.test(lowered)) {
                status = 'downloading';
            } else if (/running|chopping/.test(lowered)) {
                status = 'running';
            }

            return {
                response: status,
                state: workloadState.response,
                text: statusText,
                raw: statusText
            };
        }

        function getDegraded() {
            const bodyText = normalizeText(document.body ? document.body.innerText : '').toLowerCase();
            return {
                value: /degraded|error|offline|unavailable/i.test(bodyText),
                text: /degraded|error|offline|unavailable/i.test(bodyText) ? 'true' : 'false',
                raw: bodyText
            };
        }

        function buildResponse(snapshot) {
            const now = new Date().toISOString();
            return {
                fresh: true,
                collectedAt: now,
                response: snapshot
            };
        }

        function buildCachedResponse(snapshot) {
            const now = new Date().toISOString();
            return {
                fresh: false,
                collectedAt: now,
                response: snapshot
            };
        }

        function collectSnapshot() {
            const balance = getBalance();
            const predicted = getPredicted();
            const history = getHistory();
            const status = getStatusAndState();
            const degraded = getDegraded();

            return {
                balance: balance ? balance.value : null,
                predicted: predicted ? predicted.value : null,
                history: history ? history.value : null,
                status: status.response,
                state: status.state,
                degraded: degraded.value,
                meta: {
                    balance,
                    predicted,
                    history,
                    status,
                    degraded,
                    lineCount: normalizeText(document.body ? document.body.innerText : '').split(/\r?\n/).filter(Boolean).length
                }
            };
        }

        function publishFallback(reason, errorMessage) {
            const baseResponse = state.lastKnownResponse || state.lastSnapshot;
            const envelope = baseResponse
                ? buildCachedResponse(baseResponse)
                : buildCachedResponse({ balance: null, predicted: null, history: null, status: 'finding', state: 'finding', degraded: false });

            state.widgetVisible = false;
            state.lastError = errorMessage || reason || '';
            state.lastSnapshot = envelope;
            state.lastKnownResponse = envelope.response;
            window[STATE_KEY] = envelope;
        }

        function publishSnapshot() {
            try {
                const snapshot = collectSnapshot();
                if (snapshot && (snapshot.balance !== null || snapshot.predicted !== null || snapshot.history !== null || snapshot.status || snapshot.state)) {
                    state.lastSnapshot = buildResponse(snapshot);
                    state.lastKnownResponse = snapshot;
                    state.lastError = '';
                    state.widgetVisible = true;
                    window[STATE_KEY] = state.lastSnapshot;
                    return;
                }

                publishFallback('No relevant data found in visible widget');
            } catch (err) {
                publishFallback('Failed to read widget snapshot', err && err.message ? err.message : String(err));
            }
        }

        function queueRefresh() {
            if (state.refreshQueued) {
                return;
            }

            state.refreshQueued = true;
            window.requestAnimationFrame(() => {
                state.refreshQueued = false;
                publishSnapshot();
            });
        }

        function cleanup() {
            if (state.intervalId) {
                clearInterval(state.intervalId);
                state.intervalId = null;
            }

            if (state.observer) {
                state.observer.disconnect();
                state.observer = null;
            }

            delete window[STATE_KEY];

            if (window.__saladScripts && typeof window.__saladScripts.unregisterCleanup === 'function') {
                window.__saladScripts.unregisterCleanup(SCRIPT_KEY);
            }
        }

        if (window.__saladScripts && typeof window.__saladScripts.registerCleanup === 'function') {
            window.__saladScripts.registerCleanup(SCRIPT_KEY, cleanup);
        }

        state.observer = new MutationObserver(queueRefresh);
        if (document.documentElement) {
            state.observer.observe(document.documentElement, {
                subtree: true,
                childList: true,
                characterData: true
            });
        }

        h.useListener(window, 'load', queueRefresh);
        h.useListener(window, 'resize', queueRefresh);
        h.useListener(document, 'visibilitychange', queueRefresh);

        queueRefresh();
        state.intervalId = h.useInterval(queueRefresh, POLL_INTERVAL_MS);
    });
})().catch(err => console.error('[api-extension] Error:', err));