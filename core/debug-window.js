async function ensureCoreDebugWindowApi(page) {
    await page.evaluate(() => {
        if (window.__saladCoreDebug && window.__saladCoreDebug.__coreVersion === 1) {
            return;
        }

        const panelState = {};

        function getOrCreatePanel(panelId) {
            let el = document.getElementById(panelId);
            if (el) return el;

            el = document.createElement('div');
            el.id = panelId;
            Object.assign(el.style, {
                position: 'fixed',
                left: '12px',
                top: '12px',
                zIndex: '2147483647',
                width: '420px',
                maxHeight: '260px',
                overflow: 'auto',
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '11px',
                lineHeight: '1.35',
                fontFamily: 'Consolas, Menlo, monospace',
                color: '#f5f5f5',
                background: 'rgba(18,20,32,0.92)',
                border: '1px solid rgba(255,255,255,0.22)',
                boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
                pointerEvents: 'none',
                whiteSpace: 'pre-wrap',
                display: 'none'
            });
            document.body.appendChild(el);
            return el;
        }

        function ensurePanelState(panelId) {
            if (!panelState[panelId]) {
                panelState[panelId] = {
                    visible: false,
                    shortcutAttached: false
                };
            }
            return panelState[panelId];
        }

        function render(panelId, options) {
            const s = ensurePanelState(panelId);
            const panel = getOrCreatePanel(panelId);

            if (typeof options.defaultVisible === 'boolean' && panel.dataset.defaultVisibleApplied !== '1') {
                s.visible = options.defaultVisible;
                panel.dataset.defaultVisibleApplied = '1';
            }

            if (typeof options.visible === 'boolean') {
                s.visible = options.visible;
            }

            panel.style.display = s.visible ? 'block' : 'none';
            if (!s.visible) {
                return;
            }

            const lines = Array.isArray(options.lines) ? options.lines : [];
            const title = options.title || panelId;
            panel.textContent = [title, ...lines].join('\n');
        }

        function setVisible(panelId, visible) {
            const s = ensurePanelState(panelId);
            s.visible = Boolean(visible);
            const panel = getOrCreatePanel(panelId);
            panel.style.display = s.visible ? 'block' : 'none';
        }

        function toggle(panelId) {
            const s = ensurePanelState(panelId);
            s.visible = !s.visible;
            const panel = getOrCreatePanel(panelId);
            panel.style.display = s.visible ? 'block' : 'none';
        }

        function registerToggleShortcut(panelId, shortcut) {
            const s = ensurePanelState(panelId);
            if (s.shortcutAttached) {
                return;
            }

            const expectedCtrl = shortcut && typeof shortcut.ctrlKey === 'boolean' ? shortcut.ctrlKey : true;
            const expectedAlt = shortcut && typeof shortcut.altKey === 'boolean' ? shortcut.altKey : false;
            const expectedShift = shortcut && typeof shortcut.shiftKey === 'boolean' ? shortcut.shiftKey : false;
            const expectedKey = String(shortcut && shortcut.key ? shortcut.key : 'd').toLowerCase();

            window.addEventListener('keydown', (event) => {
                const key = String(event.key || '').toLowerCase();
                if (key !== expectedKey) return;
                if (Boolean(event.ctrlKey) !== expectedCtrl) return;
                if (Boolean(event.altKey) !== expectedAlt) return;
                if (Boolean(event.shiftKey) !== expectedShift) return;

                event.preventDefault();
                toggle(panelId);
            }, true);

            s.shortcutAttached = true;
        }

        window.__saladCoreDebug = {
            __coreVersion: 1,
            render,
            setVisible,
            toggle,
            registerToggleShortcut
        };
    });
}

module.exports = {
    ensureCoreDebugWindowApi
};
