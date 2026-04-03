(() => {
    const styleId = 'catppuccin-latte-theme';
    if (document.getElementById(styleId)) return;

    const css = `
:root {
  --ctp-rosewater: #dc8a78;
  --ctp-flamingo: #dd7878;
  --ctp-pink: #ea76cb;
  --ctp-mauve: #8839ef;
  --ctp-red: #d20f39;
  --ctp-maroon: #e64553;
  --ctp-peach: #fe640b;
  --ctp-yellow: #df8e1d;
  --ctp-green: #40a02b;
  --ctp-teal: #179299;
  --ctp-sky: #04a5e5;
  --ctp-sapphire: #209fb5;
  --ctp-blue: #1e66f5;
  --ctp-lavender: #7287fd;
  --ctp-text: #4c4f69;
  --ctp-subtext1: #5c5f77;
  --ctp-subtext0: #6c6f85;
  --ctp-overlay2: #7c7f93;
  --ctp-overlay1: #8c8fa1;
  --ctp-overlay0: #9ca0b0;
  --ctp-surface2: #acb0be;
  --ctp-surface1: #bcc0cc;
  --ctp-surface0: #ccd0da;
  --ctp-base: #eff1f5;
  --ctp-mantle: #e6e9ef;
  --ctp-crust: #dce0e8;
}

html, body {
  background: var(--ctp-base) !important;
  color: var(--ctp-text) !important;
}

#root {
  --salad-accent: var(--ctp-red);
  --salad-accent-2: var(--ctp-maroon);
}

* {
  scrollbar-color: var(--ctp-overlay0) var(--ctp-crust);
}

#root,
#root > div,
#root [class^="css-"] {
  color: var(--ctp-text) !important;
}

#root [class^="css-"] {
  border-color: var(--ctp-surface2) !important;
}

#root nav[aria-label="Main Navigation"] {
  background: var(--ctp-mantle) !important;
  border-right: 1px solid var(--ctp-surface2) !important;
}

#root button,
#root [role="button"],
button,
input,
select,
textarea {
  background: var(--ctp-mantle) !important;
  color: var(--ctp-text) !important;
  border-color: var(--ctp-surface2) !important;
}

#root button.css-wsskga,
#root button.css-wsskga:hover,
#root .css-wsskga,
#root .css-wsskga:hover {
  background: var(--ctp-mantle) !important;
  background-color: var(--ctp-mantle) !important;
  border: 1px solid color-mix(in srgb, var(--salad-accent) 55%, var(--ctp-surface2)) !important;
  box-shadow: 0 0 24px color-mix(in srgb, var(--salad-accent) 36%, transparent) !important;
  outline: none !important;
  filter: none !important;
  color: var(--ctp-text) !important;
}

#root .css-leo3e7,
#root .css-qaxsa2,
#root .css-1rtg7zt,
#root .css-187tor3,
#root .css-p60bdq {
  background: var(--ctp-mantle) !important;
  background-color: var(--ctp-mantle) !important;
  box-shadow: none !important;
  background-image: none !important;
}

#root .css-302oub,
#root .css-137s92d,
#root .css-10wr2hi,
#root .css-18yqkpz {
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
}

#root button:hover,
#root [role="button"]:hover {
  background: var(--ctp-surface1) !important;
}

#root button,
#root .css-wsskga,
#root .css-c8q551 {
  background-image: none !important;
}

#root .css-qwmztc,
#root .css-pllhxi,
#root .css-18yqkpz,
#root .css-10wr2hi {
  color: var(--salad-accent) !important;
}

#root nav[aria-label="Main Navigation"] .css-qwmztc {
  background: linear-gradient(90deg, var(--salad-accent), var(--salad-accent-2)) !important;
  background-color: var(--salad-accent) !important;
  height: 2px !important;
  width: 100% !important;
  margin-top: 4px !important;
  border-radius: 999px !important;
  box-shadow: none !important;
  opacity: 1 !important;
  overflow: hidden !important;
}

#root nav[aria-label="Main Navigation"] .css-qwmztc,
#root nav[aria-label="Main Navigation"] .css-qwmztc * {
  color: var(--salad-accent) !important;
}

#root nav[aria-label="Main Navigation"] .css-qwmztc::before,
#root nav[aria-label="Main Navigation"] .css-qwmztc::after {
  display: none !important;
}

#root .css-1ggfxqb,
#root .css-1qhcak8 {
  width: 20px !important;
  height: 20px !important;
  cursor: pointer !important;
  border: 1px solid color-mix(in srgb, var(--salad-accent) 58%, var(--ctp-surface2)) !important;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--salad-accent) 18%, transparent) !important;
}

#root .css-1ggfxqb {
  background: linear-gradient(180deg, color-mix(in srgb, var(--salad-accent) 88%, white 12%), var(--salad-accent)) !important;
  background-color: var(--salad-accent) !important;
}

#root .css-1qhcak8 {
  background: linear-gradient(180deg, color-mix(in srgb, var(--ctp-surface1) 88%, white 12%), var(--ctp-surface2)) !important;
  background-color: var(--ctp-surface1) !important;
  cursor: auto !important;
}

#root .css-1tlze2r {
  background: linear-gradient(180deg, color-mix(in srgb, var(--salad-accent) 92%, white 8%), var(--salad-accent)) !important;
  background-color: var(--salad-accent) !important;
}

#root .css-1tlze2r,
#root .css-1sws06r,
#root .css-sbellv,
#root .css-6s4cpm,
#root .css-y12liw {
  box-shadow: 0 0 16px color-mix(in srgb, var(--salad-accent) 30%, transparent) !important;
}

#root .css-1pknec1,
#root .css-1pknec1:hover,
#root .css-1pknec1 .css-1ggfxqb,
#root .css-1pknec1 .css-1qhcak8,
#root .css-1pknec1 .css-1tlze2r {
  box-shadow: 0 0 18px color-mix(in srgb, var(--salad-accent) 28%, transparent) !important;
}

#root .css-1pknec1:hover .css-1ggfxqb,
#root .css-1pknec1:hover .css-1qhcak8 {
  filter: brightness(1.05) !important;
}

#root .css-u7xhc9 .css-1ggfxqb,
#root .css-u7xhc9 .css-1qhcak8 {
  border-radius: 2px !important;
}

#root p,
#root span,
#root h1,
#root h2,
#root h3,
#root h4,
#root h5,
#root h6 {
  color: var(--ctp-text) !important;
}

#root a,
a {
  color: var(--ctp-blue) !important;
}

#root [color="#DBF1C1"],
#root [color="#D9ECA5"],
#root [color="#B2D530"] {
  color: var(--salad-accent) !important;
}

#root [stroke="#B2D530"],
#root [stroke="#53A626"],
#root [stroke="currentColor"],
#root [stroke="#DBF1C1"],
#root [stroke="#D9ECA5"] {
  stroke: var(--salad-accent) !important;
}

#root .css-18yqkpz svg,
#root .css-18yqkpz svg * {
  color: var(--salad-accent) !important;
  stroke: var(--salad-accent) !important;
}

#root [stop-color="#53A626"],
#root [stop-color="#B2D530"] {
  stop-color: var(--salad-accent) !important;
}

#root [style*="#B2D530"],
#root [style*="#53A626"],
#root [style*="#DBF1C1"],
#root [style*="#D9ECA5"],
#root [style*="rgb(178, 213, 48)"],
#root [style*="rgb(83, 166, 38)"],
#root [style*="rgb(219, 241, 193)"] {
  color: var(--salad-accent) !important;
  border-color: var(--salad-accent) !important;
}

#root svg [fill="#DBF1C1"][stroke="#B2D530"],
#root svg [fill="#D9ECA5"][stroke="#B2D530"] {
  fill: var(--ctp-surface1) !important;
  opacity: 1 !important;
}

#root .css-11nx7iz {
  height: 4px !important;
  width: 100% !important;
  background-color: color-mix(in srgb, var(--salad-accent) 18%, var(--ctp-surface0)) !important;
  border-radius: 2px !important;
  overflow: hidden !important;
}

#root .css-1nvfz8 {
  height: 4px !important;
  width: 100% !important;
  border-radius: 2px !important;
  background: linear-gradient(90deg, var(--salad-accent-2), var(--salad-accent)) !important;
  background-color: var(--salad-accent-2) !important;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--salad-accent) 20%, transparent) !important;
}

#root .css-1sws06r {
  cursor: grab !important;
  border-radius: 2px !important;
  height: 20px !important;
  width: 20px !important;
  background: linear-gradient(180deg, color-mix(in srgb, var(--salad-accent) 96%, white 4%), var(--salad-accent)) !important;
  background-color: var(--salad-accent) !important;
  box-shadow: 0 0 16px color-mix(in srgb, var(--salad-accent) 35%, transparent) !important;
  border: 1px solid color-mix(in srgb, var(--salad-accent) 75%, black 25%) !important;
}

#root .css-1tlze2r {
  width: 100% !important;
  height: 100% !important;
  border: 2px solid var(--salad-accent) !important;
  box-sizing: border-box !important;
  transition: 0.1s !important;
  cursor: pointer !important;
  border-radius: 100% !important;
  background: linear-gradient(180deg, color-mix(in srgb, var(--salad-accent) 95%, white 5%), var(--salad-accent)) !important;
  background-color: var(--salad-accent) !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  position: relative !important;
  box-shadow: 0 0 18px color-mix(in srgb, var(--salad-accent) 30%, transparent) !important;
}

#root .css-1tlze2r svg,
#root .css-1tlze2r svg * {
  stroke: var(--ctp-base) !important;
  color: var(--ctp-base) !important;
}

#root .css-6zuoof {
  display: flex !important;
  align-items: center !important;
}

#root .css-sbellv,
#root .css-6s4cpm {
  width: 12px !important;
  height: 12px !important;
  border-radius: 100% !important;
  position: relative !important;
  transition: 0.3s !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.36) !important;
}

#root .css-sbellv {
  left: 22px !important;
  background: linear-gradient(180deg, color-mix(in srgb, var(--salad-accent) 96%, white 4%), var(--salad-accent)) !important;
  background-color: var(--salad-accent) !important;
}

#root .css-6s4cpm {
  left: 0 !important;
  background: linear-gradient(180deg, color-mix(in srgb, var(--ctp-surface1) 92%, white 8%), var(--ctp-surface2)) !important;
  background-color: var(--ctp-surface1) !important;
}

#root .css-y12liw {
  color: var(--salad-accent) !important;
  stroke: var(--salad-accent) !important;
}

#root [fill="#0A2133"],
#root [stroke="#0A2133"],
#root [color="#0A2133"] {
  fill: var(--ctp-text) !important;
  stroke: var(--ctp-text) !important;
  color: var(--ctp-text) !important;
}

#root [style*="background-color: rgba(0, 0, 0, 0.2)"] {
  background-color: var(--ctp-surface1) !important;
}
`;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
    console.log('[theme] Catppuccin Latte applied');
})();
