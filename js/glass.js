// Liquid glass edges: near the rim of the calculator and each widget, the
// page behind bends inward like the edge of a thick pane, more the closer
// to the rim; the middle stays flat. Each panel gets an SVG filter with a
// displacement map of its own size and corners, rebuilt when it resizes
// or the theme changes its corners. Only Chromium runs an SVG filter on
// the backdrop; elsewhere the panels keep the plain blur from app.css.
const glassLens = /Chrome\//.test(navigator.userAgent);
const reducedTransparency = matchMedia('(prefers-reduced-transparency: reduce)');

// The map: red for sideways, green for up and down, 128 for still. Drawn
// at half size; the filter stretches it over the panel.
function lensMap(w, h, r, bezel) {
    const k = 2, cw = Math.ceil(w / k), ch = Math.ceil(h / k);
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(cw, ch);
    r = Math.min(r, w / 2, h / 2);
    // Distance to the rounded edge: negative inside
    const edge = (x, y) => {
        const qx = Math.abs(x - w / 2) - (w / 2 - r), qy = Math.abs(y - h / 2) - (h / 2 - r);
        return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
    };
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
        const x = i * k + k / 2, y = j * k + k / 2, d = -edge(x, y);
        let nx = 0, ny = 0;
        if (d > 0 && d < bezel) {   // within the bezel: toward the middle
            const gx = edge(x + 1, y) - edge(x - 1, y), gy = edge(x, y + 1) - edge(x, y - 1);
            const len = Math.hypot(gx, gy) || 1, pull = (1 - d / bezel) ** 2.2;
            nx = -gx / len * pull;
            ny = -gy / len * pull;
        }
        const o = (j * cw + i) * 4;
        img.data[o] = 128 + nx * 127;
        img.data[o + 1] = 128 + ny * 127;
        img.data[o + 2] = 128;
        img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL();
}

const lensDefs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
lensDefs.setAttribute('aria-hidden', 'true');
lensDefs.style.cssText = 'position: absolute; width: 0; height: 0';
document.body.append(lensDefs);
const lensBuilt = new Map();   // panel → the size and corner its lens has

function buildLens(panel, n) {
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const r = parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 0;
    const key = `${w}×${h}×${r}`;
    if (!w || !h || lensBuilt.get(panel) === key) return;   // hidden, or nothing changed
    lensBuilt.set(panel, key);
    const big = panel.matches('main'), id = `lens${n}`;
    lensDefs.querySelector(`#${id}`)?.remove();
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    // Twice the size, still (128) past the map: a panel that grows before
    // its new lens is drawn shows the plain blur in the new strip
    for (const [name, value] of Object.entries({ id, x: 0, y: 0, width: w * 2, height: h * 2, filterUnits: 'userSpaceOnUse',
        primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' })) filter.setAttribute(name, value);
    filter.innerHTML = `<feGaussianBlur in="SourceGraphic" stdDeviation="${big ? 3 : 2.5}" result="blur"/>
        <feFlood flood-color="rgb(128, 128, 128)" result="still"/>
        <feImage href="${lensMap(w, h, r, big ? 34 : 22)}" width="${w}" height="${h}" preserveAspectRatio="none" result="lens"/>
        <feComposite in="lens" in2="still" operator="over" result="map"/>
        <feDisplacementMap in="blur" in2="map" scale="${big ? 70 : 44}" xChannelSelector="R" yChannelSelector="G" result="bent"/>
        <feColorMatrix in="bent" type="saturate" values="1.8"/>`;
    lensDefs.append(filter);
    panel.style.backdropFilter = `url(#${id}) brightness(1.05)`;
}

const glassPanels = [document.querySelector('main'), ...document.querySelectorAll('.widget')];
let lensTimer = 0;
// Once the panels stop resizing: a map takes a frame or two to draw, and
// the card gliding between calculators resizes every frame. Meanwhile the
// old lens stretches over it, which doesn't show.
function updateLenses() {
    clearTimeout(lensTimer);
    lensTimer = setTimeout(() => glassPanels.forEach(buildLens), 120);
}
function startLenses() {
    if (!glassLens || reducedTransparency.matches) return;
    const resized = new ResizeObserver(updateLenses);
    glassPanels.forEach(panel => resized.observe(panel));
    // A palette can change the corners without changing the size
    new MutationObserver(updateLenses).observe(document.documentElement, { attributeFilter: ['data-palette'] });
    updateLenses();
}
startLenses();
