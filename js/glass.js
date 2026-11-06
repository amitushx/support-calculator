// Liquid glass, two ways. Chrome draws one backdrop-filter (a blur of
// whatever is behind) under another wrongly: a light stripe that flickers
// in the upper panel's glass, even past the lower panel's edges. So each
// panel (the calculator and the widgets) draws its own copy of the page
// background, blurred, under its contents (.glass in app.css), and only a
// panel lying over another one turns see-through (.see-through, a real
// backdrop-filter), to show the panel beneath. Nothing lies over a
// see-through panel, so two backdrop-filters never stack, and over the
// bare page both kinds look the same.
//
// This file builds the layers, keeps each copy lined up with the page as
// the panel moves, picks the see-through panels, and in Chromium adds the
// lens to both kinds: near the rim the page bends inward like the edge of
// a thick pane, more the closer to the rim; the middle stays flat.
const GLASS_REACH = 24;   // how far .glass-lens reaches past the panel, as in app.css
const glassLens = /Chrome\//.test(navigator.userAgent);
const reducedTransparency = matchMedia('(prefers-reduced-transparency: reduce)');
// How far the rim reaches in, and how far it pulls the page at its edge:
// at most 3/8 of the bezel, so each point of the rim shows the page a
// little further in than its neighbor, and lines behind it don't fold
// back on themselves
const lensBezel = big => big ? 40 : 26;
const lensScale = big => lensBezel(big) * .75;   // twice the pull at the edge

const glassPanels = [document.querySelector('main'), ...document.querySelectorAll('.widget')];
const glassPage = new Map();   // panel → its copy of the page
for (const panel of glassPanels) {
    const glass = document.createElement('div');
    glass.className = 'glass';
    glass.setAttribute('aria-hidden', 'true');
    glass.innerHTML = '<div class="glass-lens"><div class="glass-page"></div></div>';
    panel.prepend(glass);
    glassPage.set(panel, glass.querySelector('.glass-page'));
}

// Line a panel's copy of the page up with the page: --gx and --gy are
// where the panel sits in the window. A widget is fixed at its left and
// top; the calculator sits in the page, which may scroll. While a dragged
// widget wobbles (jelly in motion.js), its copy turns back the other way,
// so the page stays put behind the glass.
function placeGlass(panel) {
    if (!panel.offsetWidth) return;   // hidden
    let x, y;
    const style = getComputedStyle(panel);
    if (style.position === 'fixed') {   // to the fraction, unlike offsetLeft
        x = parseFloat(style.left);
        y = parseFloat(style.top);
    } else {
        const box = panel.getBoundingClientRect();   // the calculator never transforms
        x = box.left;
        y = box.top;
    }
    // Only when it moved: setting the style, even to the same value, is a
    // change the observer in startGlass sees, and it would loop
    if (panel.style.getPropertyValue('--gx') !== x + 'px') panel.style.setProperty('--gx', x + 'px');
    if (panel.style.getPropertyValue('--gy') !== y + 'px') panel.style.setProperty('--gy', y + 'px');
    const page = glassPage.get(panel);
    if (panel.style.transform) {
        const [ox, oy] = style.transformOrigin.split(' ').map(parseFloat);
        page.style.transformOrigin = `${ox + x}px ${oy + y}px`;   // the panel's pivot, on the copy
        page.style.transform = new DOMMatrix(panel.style.transform).inverse().toString();
    } else if (page.style.transform) {
        page.style.transform = page.style.transformOrigin = '';
    }
}
function placeAllGlass() {
    const root = document.documentElement;
    root.style.setProperty('--vw', root.clientWidth + 'px');
    root.style.setProperty('--vh', root.clientHeight + 'px');
    glassPanels.forEach(placeGlass);
}

// See-through: a panel over another one, with none over it. A panel under
// another keeps its copy, so a backdrop-filter never has one beneath it.
// Two at the same height (only before any is raised) both keep copies.
function stackGlass() {
    const shown = glassPanels.filter(p => p.offsetWidth).map(p => ({
        panel: p, box: p.getBoundingClientRect(), z: +getComputedStyle(p).zIndex || 0
    }));
    const overlap = (a, b) => a.box.left < b.box.right && a.box.right > b.box.left
        && a.box.top < b.box.bottom && a.box.bottom > b.box.top;
    for (const panel of glassPanels) {
        const p = shown.find(s => s.panel === panel);
        const others = p ? shown.filter(o => o !== p && overlap(o, p)) : [];
        const clear = others.some(o => o.z < p.z) && !others.some(o => o.z >= p.z);
        // Only on a change: even removing a class that isn't there rewrites
        // the class attribute, which the observer in startGlass sees, and
        // it would loop
        if (panel.classList.contains('see-through') !== clear) panel.classList.toggle('see-through', clear);
    }
}

// The lens: a displacement map, red for sideways, green for up and down,
// 128 for still. Drawn at half size; the filter stretches it over the panel.
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
            const len = Math.hypot(gx, gy) || 1, pull = (1 - d / bezel) ** 2;
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

// One lens filter: the map sits at (at, at), over the panel itself, in a
// box of width × height. Twice that, still (128) past the map: a panel
// that grows before its new lens is drawn keeps the plain blur in the new
// strip.
function lensFilter(id, at, width, height, map, w, h, big) {
    lensDefs.querySelector(`#${id}`)?.remove();
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    for (const [name, value] of Object.entries({ id, x: 0, y: 0, width: width * 2, height: height * 2,
        filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' })) {
        filter.setAttribute(name, value);
    }
    filter.innerHTML = `<feGaussianBlur in="SourceGraphic" stdDeviation="${big ? 3 : 2.5}" result="blur"/>
        <feFlood flood-color="rgb(128, 128, 128)" result="still"/>
        <feImage href="${map}" x="${at}" y="${at}" width="${w}" height="${h}" preserveAspectRatio="none" result="lens"/>
        <feComposite in="lens" in2="still" operator="over" result="map"/>
        <feDisplacementMap in="blur" in2="map" scale="${lensScale(big)}" xChannelSelector="R" yChannelSelector="G"/>`;
    lensDefs.append(filter);
}
// Each panel gets two: one on its .glass-lens, which is the panel plus
// GLASS_REACH all round, and one for when it's see-through, on the panel
// itself (--glass-backdrop, read by .see-through in app.css)
function buildLens(panel, n) {
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const r = parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 0;
    const key = `${w}×${h}×${r}`;
    if (!w || !h || lensBuilt.get(panel) === key) return;   // hidden, or nothing changed
    lensBuilt.set(panel, key);
    const big = panel.matches('main'), map = lensMap(w, h, r, lensBezel(big));
    lensFilter(`lens${n}`, GLASS_REACH, w + 2 * GLASS_REACH, h + 2 * GLASS_REACH, map, w, h, big);
    lensFilter(`lens${n}b`, 0, w, h, map, w, h, big);
    glassPage.get(panel).parentElement.style.filter = `url(#lens${n}) saturate(var(--glass-saturate)) brightness(1.05)`;
    const backdrop = `url("#lens${n}b") saturate(var(--glass-saturate)) brightness(1.05)`;
    if (panel.style.getPropertyValue('--glass-backdrop') !== backdrop) panel.style.setProperty('--glass-backdrop', backdrop);
}

let lensTimer = 0;
// Once the panels stop resizing: a map takes a frame or two to draw, and
// the card gliding between calculators resizes every frame. Meanwhile the
// old lens stretches over it, which doesn't show.
function updateLenses() {
    clearTimeout(lensTimer);
    lensTimer = setTimeout(() => glassPanels.forEach(buildLens), 120);
}

function startGlass() {
    if (reducedTransparency.matches) return;   // the panels are solid (app.css)
    const update = () => {
        placeAllGlass();
        stackGlass();
    };
    update();
    // Moved, wobbled, raised, shown or hidden: these observers run before
    // the next frame is painted, so the glass never lags behind the panel
    const moved = new MutationObserver(records => {
        new Set(records.map(r => r.target)).forEach(placeGlass);
        stackGlass();
    });
    glassPanels.forEach(panel => moved.observe(panel, { attributeFilter: ['style', 'hidden', 'class'] }));
    // A resize moves the calculator too, as it stays centered
    const resized = new ResizeObserver(() => {
        update();
        if (glassLens) updateLenses();
    });
    [document.documentElement, ...glassPanels].forEach(el => resized.observe(el));
    addEventListener('resize', update);
    addEventListener('scroll', update, { passive: true });
    // A palette can change the corners without changing the size
    if (glassLens) {
        new MutationObserver(updateLenses).observe(document.documentElement, { attributeFilter: ['data-palette'] });
        updateLenses();
    }
}
startGlass();
