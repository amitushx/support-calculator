// Sky: a pixel-art window onto a city skyline under the sky of the moment,
// following the real sunrise and sunset over Tel Aviv
const SKY_LAT = 32.08, SKY_LNG = 34.78;
const SKY_W = 64, SKY_H = 40, HORIZON = 34;
// The pixel art is drawn on a 64x40 canvas and blown up 6x into the
// widget's, which leaves room for the Retro theme's matrix rain to be
// drawn in between at full resolution
const SKY_SCALE = 6;
const skyPixels = Object.assign(document.createElement('canvas'), { width: SKY_W, height: SKY_H });
const skyCtx = skyPixels.getContext('2d');
const skyCanvas = $('skyCanvas');
skyCanvas.width = SKY_W * SKY_SCALE;
skyCanvas.height = SKY_H * SKY_SCALE;
const skyOut = skyCanvas.getContext('2d');
skyOut.imageSmoothingEnabled = false;
const blitSky = () => skyOut.drawImage(skyPixels, 0, 0, skyCanvas.width, skyCanvas.height);

// Sunrise and sunset for a date, as Dates in local time (NOAA approximation,
// good to a few minutes)
function sunTimes(date) {
    const rad = Math.PI / 180;
    const n = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - new Date(date.getFullYear(), 0, 0)) / 864e5);
    const decl = 23.44 * Math.sin(2 * Math.PI * (284 + n) / 365) * rad;
    const b = 2 * Math.PI * (n - 81) / 364;
    const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);   // minutes
    const tz = -date.getTimezoneOffset() / 60;
    const noon = 12 + (tz * 15 - SKY_LNG) / 15 - eot / 60;                           // clock hours
    const lat = SKY_LAT * rad;
    const half = Math.acos((Math.cos(90.833 * rad) - Math.sin(lat) * Math.sin(decl))
        / (Math.cos(lat) * Math.cos(decl))) / rad / 15;
    const at = hours => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, hours * 3600);
    return { rise: at(noon - half), set: at(noon + half) };
}
const shiftDay = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);

// How high the sun is, from -1 (middle of the night) to 1 (noon), and how
// far through the day or night we are (0-1)
function sunHeight(now) {
    const { rise, set } = sunTimes(now);
    if (now >= rise && now <= set) return { h: Math.sin(Math.PI * (now - rise) / (set - rise)), p: (now - rise) / (set - rise) };
    const [start, end] = now > set ? [set, sunTimes(shiftDay(now, 1)).rise] : [sunTimes(shiftDay(now, -1)).set, rise];
    const p = (now - start) / (end - start);
    return { h: -Math.sin(Math.PI * p), p };
}

// Colors by sun height: sky top, sky at the horizon, clouds, buildings
const SKY_STOPS = [
    [-1, '#070b1e', '#141a3a', '#262c4f', '#0a0d1c'],
    [-0.3, '#0b1030', '#24305e', '#2c3462', '#0d1124'],
    [-0.08, '#2b2f6e', '#c8607a', '#b8708a', '#251f3a'],
    [0.02, '#5b7fc7', '#ffaa66', '#ffc9a8', '#3a3550'],
    [0.25, '#4a9be8', '#bfe3ff', '#f6fbff', '#3d4b66'],
    [1, '#2f86e0', '#a6d6ff', '#ffffff', '#41506c']
];
const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(
    parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t
).toString(16).padStart(2, '0')).join('');
function skyColors(h) {
    let i = 0;
    while (i < SKY_STOPS.length - 2 && h > SKY_STOPS[i + 1][0]) i++;
    const [a, b] = [SKY_STOPS[i], SKY_STOPS[i + 1]];
    const t = Math.min(Math.max((h - a[0]) / (b[0] - a[0]), 0), 1);
    return a.slice(1).map((c, k) => mix(c, b[k + 1], t));
}

// The scenery: fixed stars, a skyline with windows, drifting clouds
let skySeed = 11;
const skyRand = () => (skySeed = skySeed * 16807 % 2147483647) / 2147483647;
const STARS = Array.from({ length: 34 }, () => [Math.floor(skyRand() * SKY_W), Math.floor(skyRand() * (HORIZON - 8))]);
const BUILDINGS = [];
for (let x = 0; x < SKY_W;) {
    const w = 4 + Math.floor(skyRand() * 6);
    const top = SKY_H - 4 - Math.floor(skyRand() * 9);
    const windows = [];
    for (let wy = top + 2; wy < SKY_H - 1; wy += 2) {
        for (let wx = x + 1; wx < x + w - 1; wx += 2) windows.push([wx, wy, skyRand()]);
    }
    BUILDINGS.push({ x, w, top, windows });
    x += w + (skyRand() < 0.3 ? 1 : 0);
}
const CLOUDS = [
    { y: 5, speed: 0.15, offset: 0, shape: ['..###....', '.#####.#.', '#########'] },
    { y: 12, speed: 0.1, offset: 30, shape: ['.##..', '#####'] },
    { y: 9, speed: 0.22, offset: 52, shape: ['...##...', '.######.', '########'] }
];
function pixelCircle(cx, cy, r, color) {
    skyCtx.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy <= r * r + r * 0.8) skyCtx.fillRect(cx + dx, cy + dy, 1, 1);
        }
    }
}

// Matrix rain for the Retro theme, like unimatrix: faint green half-width
// katakana falling in columns, a bright head and a fading trail. Positions
// follow the clock, so it falls at the same speed however often it's drawn.
const MATRIX_GLYPHS = [...'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789'];
const MATRIX_FONT = 18, MATRIX_COL = 13;   // canvas pixels
const matrixRows = Math.ceil(SKY_H * SKY_SCALE / MATRIX_FONT);
const matrixGlyph = () => MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)];
const matrixCells = Array.from({ length: Math.floor(SKY_W * SKY_SCALE / MATRIX_COL) },
    () => Array.from({ length: matrixRows }, matrixGlyph));
const matrixDrops = matrixCells.map(() => null);
const matrixSky = () => document.documentElement.dataset.palette === 'retro';
function newDrop(time) {
    return {
        start: time + Math.random() * 4000,   // a pause before it falls
        speed: 4 + Math.random() * 8,          // rows a second
        length: 4 + Math.floor(Math.random() * 10)
    };
}
let matrixFont = null;   // asked for the first time it rains; canvas text doesn't load fonts by itself
function drawMatrix(time) {
    matrixFont ??= document.fonts.load(`${MATRIX_FONT}px "Noto Sans JP"`, MATRIX_GLYPHS.join('')).catch(() => {});
    skyOut.font = `${MATRIX_FONT}px "Noto Sans JP", monospace`;
    skyOut.textBaseline = 'top';
    matrixCells.forEach((column, i) => {
        let drop = matrixDrops[i] ??= newDrop(time - Math.random() * 6000);
        let head = (time - drop.start) / 1000 * drop.speed;
        if (head - drop.length > matrixRows) drop = matrixDrops[i] = newDrop(time);
        head = Math.floor(head);
        if (Math.random() < .3) column[Math.floor(Math.random() * matrixRows)] = matrixGlyph();
        for (let k = 0; k <= drop.length; k++) {
            const row = head - k;
            if (row < 0 || row >= matrixRows) continue;
            skyOut.fillStyle = k === 0 ? 'rgba(200, 255, 215, .75)'
                : `rgba(57, 255, 106, ${(.5 * (1 - k / drop.length)).toFixed(2)})`;
            skyOut.fillText(column[row], i * MATRIX_COL + 1, row * MATRIX_FONT);
        }
    });
}

function drawSky(now) {
    const { h, p } = sunHeight(now);
    const [top, bottom, cloud, building] = skyColors(h);
    const rowColor = y => mix(top, bottom, Math.min(y / HORIZON, 1));
    for (let y = 0; y < SKY_H; y++) {
        skyCtx.fillStyle = rowColor(y);
        skyCtx.fillRect(0, y, SKY_W, 1);
    }
    // Retro: the rain instead of stars and clouds, behind the sun or moon
    // and the skyline, which go on top from a cleared pixel layer
    const matrix = matrixSky();
    if (matrix) {
        blitSky();
        drawMatrix(now.getTime());
        skyCtx.clearRect(0, 0, SKY_W, SKY_H);
    }
    // Stars fade in after dusk and twinkle
    const night = Math.min(Math.max(-h * 4, 0), 1);
    for (const [x, y] of night && !matrix ? STARS : []) {
        if (Math.random() < 0.08) continue;
        skyCtx.fillStyle = mix(rowColor(y), '#ffffff', night * 0.9);
        skyCtx.fillRect(x, y, 1, 1);
    }
    // Sun by day, moon by night, arcing from left to right
    const x = Math.round(4 + p * (SKY_W - 8));
    const y = Math.round(HORIZON - Math.abs(h) * 26);
    if (h >= 0) pixelCircle(x, y, 3, mix('#ff8a3c', '#ffe066', Math.min(h * 4, 1)));
    else {
        pixelCircle(x, y, 3, '#f4f1d0');
        skyCtx.fillStyle = '#d6d1a8';
        skyCtx.fillRect(x - 1, y - 1, 1, 1);
        skyCtx.fillRect(x + 1, y + 1, 1, 1);
    }
    // Clouds drift across, a pixel every few seconds
    skyCtx.fillStyle = cloud;
    for (const c of matrix ? [] : CLOUDS) {
        const width = c.shape[0].length;
        const cx = Math.floor((now / 1000 * c.speed + c.offset) % (SKY_W + width)) - width;
        c.shape.forEach((row, dy) => [...row].forEach((ch, dx) => {
            if (ch === '#') skyCtx.fillRect(cx + dx, c.y + dy, 1, 1);
        }));
    }
    // Skyline, with more windows lit the darker it gets
    const lit = night * 0.6;
    for (const b of BUILDINGS) {
        skyCtx.fillStyle = building;
        skyCtx.fillRect(b.x, b.top, b.w, SKY_H - b.top);
        skyCtx.fillStyle = '#ffd86b';
        for (const [wx, wy, r] of b.windows) if (r < lit) skyCtx.fillRect(wx, wy, 1, 1);
    }
    blitSky();
}
// The rain needs more frames than the clock's four a second
setInterval(() => {
    if (widgets.sky.on && matrixSky() && document.visibilityState === 'visible') drawSky(new Date());
}, 80);
