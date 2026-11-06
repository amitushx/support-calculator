// Sky: a pixel-art window onto a city skyline under the sky of the moment,
// following the real sunrise and sunset over Tel Aviv; a neon city in the
// Cyberpunk theme
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
// Cyberpunk: two rows of tall towers, the back row hazier, with spires,
// neon signs and lit windows in neon colors, and flying cars between them
const NEON = ['#ff2bd6', '#00f0ff', '#ffe14d', '#a46bff'];
const cyberTower = (x, w, top) => {
    const windows = [];
    const color = NEON[Math.floor(skyRand() * 4)];   // one color of light per tower
    for (let wy = top + 2; wy < SKY_H - 1; wy += 2) {
        for (let wx = x + 1; wx < x + w - 1; wx += 2) windows.push([wx, wy, skyRand(), color]);
    }
    return { x, w, top, windows };
};
const CYBER_BACK = [], CYBER_FRONT = [];
for (let x = -2; x < SKY_W;) {
    const w = 4 + Math.floor(skyRand() * 5);
    const tower = cyberTower(x, w, 5 + Math.floor(skyRand() * 14));
    if (skyRand() < 0.5) tower.spire = 2 + Math.floor(skyRand() * 4);
    CYBER_BACK.push(tower);
    x += w + 1 + Math.floor(skyRand() * 3);
}
for (let x = 0; x < SKY_W;) {
    const w = 5 + Math.floor(skyRand() * 5);
    const tower = cyberTower(x, w, 14 + Math.floor(skyRand() * 14));
    const r = skyRand();
    if (r < 0.45) {   // a vertical sign down one side, its letters lit with gaps
        tower.sign = { kind: 'tall', x: skyRand() < 0.5 ? x : x + w - 2, y: tower.top + 2,
            length: 3 + Math.floor(skyRand() * 3), color: NEON[Math.floor(skyRand() * 4)] };
    } else if (r < 0.8) {   // a billboard on the roof
        tower.sign = { kind: 'board', x: x + 1, y: tower.top - 3, w: w - 2, color: NEON[Math.floor(skyRand() * 4)] };
    }
    tower.flicker = skyRand();
    CYBER_FRONT.push(tower);
    x += w + (skyRand() < 0.3 ? 1 : 0);
}
// Flying cars in lanes, some each way; speed in pixels a second
const CYBER_CARS = [
    { y: 9, speed: 6, offset: 0 }, { y: 9, speed: 6, offset: 40 },
    { y: 14, speed: -9, offset: 12 },
    { y: 18, speed: 4, offset: 30 }, { y: 18, speed: 4, offset: 64 },
    { y: 22, speed: -5, offset: 50 }
];
const cyberSky = () => document.documentElement.dataset.palette === 'cyber';
// The city's own light: a magenta glow along the horizon after dark, which
// the towers stand out against
const CYBER_GLOW = '#6a1f78';
function drawCyberCity(now, building, haze, night) {
    const t = now.getTime() / 1000;
    building = mix(building, '#1a0f2e', night * 0.5);
    const glow = 0.55 + night * 0.45;   // neon shows by day too, brighter by night
    const blink = Math.floor(t * 2) % 2;
    // The back row, hazy, with blinking red lights on the spires
    for (const b of CYBER_BACK) {
        skyCtx.fillStyle = mix(building, haze, 0.35);
        skyCtx.fillRect(b.x, b.top, b.w, SKY_H - b.top);
        if (b.spire) {
            skyCtx.fillRect(b.x + (b.w >> 1), b.top - b.spire, 1, b.spire);
            if (blink) {
                skyCtx.fillStyle = '#ff3b3b';
                skyCtx.fillRect(b.x + (b.w >> 1), b.top - b.spire, 1, 1);
            }
        }
        for (const [wx, wy, r, c] of b.windows) {
            if (r < 0.15 + night * 0.35) {
                skyCtx.fillStyle = mix(mix(building, haze, 0.35), c, 0.45 * glow);
                skyCtx.fillRect(wx, wy, 1, 1);
            }
        }
    }
    // Flying cars weave between the two rows: a dark body, a headlight in
    // front and a red light behind
    for (const car of CYBER_CARS) {
        const span = SKY_W + 8;
        const cx = Math.floor((((t * car.speed + car.offset) % span) + span) % span) - 4;
        const ahead = car.speed > 0 ? 1 : -1;
        skyCtx.fillStyle = mix('#1a1530', '#00f0ff', night * 0.8);   // underglow, by night
        skyCtx.fillRect(cx - 1, car.y + 1, 3, 1);
        skyCtx.fillStyle = mix('#1a1530', '#5a4a8a', night);
        skyCtx.fillRect(cx - 1, car.y, 3, 1);
        skyCtx.fillRect(cx, car.y - 1, 1, 1);
        skyCtx.fillStyle = '#e8fbff';
        skyCtx.fillRect(cx + 2 * ahead, car.y, 1, 1);
        skyCtx.fillStyle = '#ff2b6a';
        skyCtx.fillRect(cx - 2 * ahead, car.y, 1, 1);
    }
    // The front row, with neon windows and signs, now and then flickering
    for (const b of CYBER_FRONT) {
        skyCtx.fillStyle = building;
        skyCtx.fillRect(b.x, b.top, b.w, SKY_H - b.top);
        for (const [wx, wy, r, c] of b.windows) {
            if (r < 0.1 + night * 0.5) {
                skyCtx.fillStyle = mix(building, c, 0.7 * glow);
                skyCtx.fillRect(wx, wy, 1, 1);
            }
        }
        const s = b.sign;
        if (!s || (b.flicker < 0.3 && Math.random() < 0.12)) continue;
        skyCtx.fillStyle = mix(building, s.color, glow);
        if (s.kind === 'tall') {   // two pixels wide, a dark gap between letters
            skyCtx.fillRect(s.x, s.y, 2, s.length * 3);
            skyCtx.fillStyle = building;
            for (let k = 2; k < s.length * 3; k += 3) skyCtx.fillRect(s.x, s.y + k, 2, 1);
        } else {
            skyCtx.fillRect(s.x, s.y, s.w, 1);
            skyCtx.fillRect(s.x, s.y + 2, s.w, 1);
            skyCtx.fillRect(s.x, s.y, 1, 3);
            skyCtx.fillRect(s.x + s.w - 1, s.y, 1, 3);
            skyCtx.fillStyle = building;   // the legs it stands on
            skyCtx.fillRect(s.x + 1, s.y + 3, 1, 1);
            skyCtx.fillRect(s.x + s.w - 2, s.y + 3, 1, 1);
        }
    }
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

// Matrix rain for the Retro theme, like unimatrix: faint green (amber in light mode) half-width
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
    // Amber phosphor in light mode, green in dark
    const [lead, trail] = isDark() ? ['200, 255, 215', '57, 255, 106'] : ['255, 236, 190', '255, 176, 0'];
    matrixCells.forEach((column, i) => {
        let drop = matrixDrops[i] ??= newDrop(time - Math.random() * 6000);
        let head = (time - drop.start) / 1000 * drop.speed;
        if (head - drop.length > matrixRows) drop = matrixDrops[i] = newDrop(time);
        head = Math.floor(head);
        if (Math.random() < .3) column[Math.floor(Math.random() * matrixRows)] = matrixGlyph();
        for (let k = 0; k <= drop.length; k++) {
            const row = head - k;
            if (row < 0 || row >= matrixRows) continue;
            skyOut.fillStyle = k === 0 ? `rgba(${lead}, .75)`
                : `rgba(${trail}, ${(.5 * (1 - k / drop.length)).toFixed(2)})`;
            skyOut.fillText(column[row], i * MATRIX_COL + 1, row * MATRIX_FONT);
        }
    });
}

// A landscape for each of the other themes, drawn over the same sky. Each
// scene gets `d`: the time in seconds, the sun's height `h`, how dark (`night`)
// and how light (`day`) it is, the sky's colors, where the sun or moon is,
// and pixel helpers. `behind` draws between the stars and the sun, `draw`
// the land in front.
const clamp01 = v => Math.min(Math.max(v, 0), 1);
const wrap = (v, span) => ((v % span) + span) % span;
const skyRect = (x, y, w, h, c) => { skyCtx.fillStyle = c; skyCtx.fillRect(x, y, w, h); };
const skyPx = (x, y, c) => skyRect(x, y, 1, 1, c);
const hillY = (x, y0, a, f, ph) => Math.round(y0 + a * Math.sin(x / f + ph));
function pine(x, base, height, c) {   // a layered pixel pine, its trunk at base
    skyPx(x, base - 1, mix(c, '#000000', 0.3));
    for (let i = 0; i < height - 1; i++) {
        const half = Math.floor((i % 4) * 0.6 + i / 4);
        skyRect(x - half, base - height + i, half * 2 + 1, 1, c);
    }
}
const spriteAt = (rows, x, y, color) => rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
    if (ch === '#') skyPx(x + dx, y + dy, typeof color === 'function' ? color(dx) : color);
}));

// Wood: a pine forest with a log cabin, smoke from the chimney and, after
// dark, a lit window and fireflies
const WOOD_PINES = Array.from({ length: 12 }, (_, i) => [i * 5 + Math.floor(skyRand() * 4), 5 + Math.floor(skyRand() * 4)]);
const FIREFLIES = Array.from({ length: 6 }, () => [skyRand() * SKY_W, 30 + skyRand() * 7, skyRand() * 6]);
const woodScene = { draw(d) {
    const { t, day, night } = d;
    const far = mix(mix('#0c1512', '#4d7a48', day), d.bottom, 0.4);
    for (let x = 0; x < SKY_W; x++) skyRect(x, hillY(x, 30, 2, 7, 0), 1, SKY_H, far);
    for (const [x, height] of WOOD_PINES) pine(x, hillY(x, 30, 2, 7, 0) + 1, height, far);
    // Smoke rises from the chimney, drifting away as it fades
    for (let k = 0; k < 5; k++) {
        const age = wrap(t * 1.2 + k * 3, 15);
        const y = 26 - Math.round(age);
        if (y >= 0) d.blend(45 + Math.round(age * 0.35 + Math.sin(age / 2)), y, mix('#cfcfcf', '#5a5f70', night), 0.7 * (1 - age / 15));
    }
    const logs = mix('#1a100a', '#7a4a2a', day);
    skyRect(44, 26, 2, 4, mix('#16100c', '#6a4a3a', day));   // chimney
    for (let i = 0; i < 5; i++) skyRect(36 - i, 27 + i, 12 + i * 2 - 1, 1, mix('#120a08', '#5a2a1c', day));   // roof
    skyRect(33, 32, 15, 7, logs);
    for (let y = 33; y < 39; y += 2) skyRect(33, y, 15, 1, mix(logs, '#000000', 0.25));
    skyRect(37, 34, 3, 5, mix(logs, '#000000', 0.45));   // door
    skyRect(42, 34, 3, 2, mix(mix(logs, '#000000', 0.5), '#ffcf6b', clamp01(night * 1.2 + 0.1)));   // window
    skyRect(0, 38, SKY_W, 2, mix('#0a0f0b', '#3b4a2a', day));
    const near = mix('#08100d', '#2f5530', day);
    for (const [x, height] of [[3, 15], [10, 12], [18, 9], [53, 13], [60, 16]]) pine(x, 39, height, near);
    for (const [x, y, phase] of night ? FIREFLIES : []) {
        if (Math.sin(t * 2 + phase * 3) < 0.2) continue;
        skyPx(Math.round(wrap(x + Math.sin(t / 3 + phase) * 4, SKY_W)), Math.round(y + Math.sin(t / 2 + phase) * 2), mix('#9a9a40', '#e8ff7a', night));
    }
} };

// Ocean: the sea up to a lower horizon, sailboats, the sun or moon's light
// on the water, gulls by day and a lighthouse whose beam sweeps after dark
const SEA = 27;
const SHIMMER = Array.from({ length: 14 }, () => [skyRand() * SKY_W, SEA + 1 + Math.floor(skyRand() * 12), 2 + Math.floor(skyRand() * 3), skyRand()]);
const BOATS = [{ y: 31, speed: 0.35, offset: 4 }, { y: 35, speed: -0.25, offset: 30 }];
const oceanScene = { horizon: SEA, draw(d) {
    const { t, h, day, night, sun } = d;
    const water = mix(d.bottom, '#2a6aa0', 0.45);
    for (let y = SEA; y < SKY_H; y++) skyRect(0, y, SKY_W, 1, mix(water, mix(d.top, '#0a2440', 0.6), (y - SEA) / (SKY_H - SEA)));
    // A broken path of light under the sun or moon, widening toward us
    const light = mix(d.rowColor(30), h >= 0 ? mix('#ff9a4a', '#fff2b0', clamp01(h * 3)) : '#e8e4c0', h >= 0 ? 0.6 : 0.42);
    for (let y = SEA; y < SKY_H; y++) {
        const spread = 1 + Math.floor((y - SEA) / 4);
        for (let dx = -spread; dx <= spread; dx++) if (Math.sin(y * 3.1 + dx * 1.7 + t * 2) > 0.1) skyPx(sun[0] + dx, y, light);
    }
    for (const [x, y, w, phase] of SHIMMER) {
        skyRect(Math.round(wrap(x + t * 0.3, SKY_W + 4)) - 2, y, w, 1, mix(mix(d.bottom, '#2a6aa0', 0.3), '#ffffff', 0.25 + 0.15 * Math.sin(t + phase * 6)));
    }
    const hull = mix('#120a08', '#6a3a24', day), sail = mix('#3a4058', '#fbf8f0', day);
    for (const b of BOATS) {
        const x = Math.floor(wrap(t * b.speed + b.offset, SKY_W + 10)) - 5;
        skyRect(x, b.y, 6, 1, hull);
        skyRect(x + 1, b.y + 1, 4, 1, hull);
        skyRect(x + 3, b.y - 6, 1, 6, hull);   // mast
        for (let i = 0; i < 5; i++) skyRect(x + (b.speed > 0 ? 0 : 3), b.y - 5 + i, Math.min(i + 1, 3), 1, sail);
    }
    if (day > 0.6) for (const [x0, y, speed] of [[10, 14, 1.2], [18, 17, 1]]) {
        const x = Math.floor(wrap(t * speed + x0, SKY_W + 4)) - 2, flap = Math.floor(t * 3 + x0) % 2;
        skyPx(x - 1, y - flap, '#3a4258');
        skyPx(x, y, '#3a4258');
        skyPx(x + 1, y - flap, '#3a4258');
    }
    const rock = mix('#0a0d14', '#4a4a50', day);
    for (let x = 48; x < SKY_W; x++) skyRect(x, 34 - Math.round(2 * Math.sin((x - 48) / 5)), 1, SKY_H, rock);
    const white = mix('#3a4058', '#f4f0e6', day), red = mix('#2a1018', '#c43a3a', day);
    for (let y = 16; y < 33; y++) skyRect(55, y, 4, 1, Math.floor((y - 16) / 4) % 2 ? red : white);
    skyRect(54, 15, 6, 1, mix('#0a0d14', '#2a2a30', day));
    skyRect(55, 12, 4, 3, mix('#2a2a30', '#fff3b0', clamp01(night + 0.2)));   // the lamp
    skyRect(56, 11, 2, 1, red);
    if (!night) return;
    // The beam turns round: long when it points across the view, short as
    // it swings toward or away from us
    const a = t * 1.2, length = 26 * Math.abs(Math.cos(a)), dir = Math.sin(a) > 0 ? -1 : 1;
    for (let k = 1; k < length; k++) {
        const spread = Math.floor(k * 0.12), x = (dir < 0 ? 55 : 58) + dir * k;
        if (x < 0 || x >= SKY_W) break;
        for (let s = -spread; s <= spread; s++) d.blend(x, 13 + s, '#fff3b0', 0.55 * night * (1 - k / length));
    }
} };

// Aurora: snowy hills and pines in falling snow, and at night green and
// purple northern lights rippling across the sky
const FLAKES = Array.from({ length: 14 }, () => [skyRand() * SKY_W, skyRand() * SKY_H, 0.6 + skyRand() * 0.8]);
const AURORA_STREAKS = Array.from({ length: SKY_W }, () => 0.6 + skyRand() * 0.4);
const auroraScene = {
    behind(d) {
        const { t, night } = d;
        if (!night) return;
        for (let x = 0; x < SKY_W; x++) {
            const base = 14 + 4 * Math.sin(x / 9 + t * 0.25) + 2 * Math.sin(x / 4 - t * 0.4);
            const strength = night * AURORA_STREAKS[x] * (0.55 + 0.45 * Math.sin(x / 6 + t * 0.7));
            for (let k = 0; k < 12; k++) {
                const y = Math.round(base - k);
                if (y < 0) break;
                d.blend(x, y, mix('#39ff9c', '#b06bff', k / 11), strength * (k < 2 ? 0.85 : 0.75 * (1 - k / 12)));
            }
        }
    },
    draw(d) {
        const { t, day } = d;
        const snow = mix('#2a3352', '#f2f7ff', day);
        const far = mix(snow, mix(d.bottom, '#8fa4d8', 0.5), 0.45);
        for (let x = 0; x < SKY_W; x++) skyRect(x, hillY(x, 27, 3, 11, 1), 1, SKY_H, far);
        for (const x of [5, 11, 41, 49]) pine(x, hillY(x, 27, 3, 11, 1) + 2, 8, mix(far, '#0a1420', 0.55));
        for (let x = 0; x < SKY_W; x++) {
            const y = hillY(x, 32, 2, 8, 0);
            skyRect(x, y, 1, SKY_H, snow);
            skyPx(x, y, mix(snow, '#ffffff', 0.5));
        }
        for (const x of [14, 19, 56]) pine(x, hillY(x, 32, 2, 8, 0) + 2, x === 19 ? 6 : 9, mix('#08101a', '#1f3d36', day));
        for (const [x, y0, speed] of FLAKES) {
            const y = wrap(y0 + t * speed * 2, SKY_H);
            skyPx(Math.round(wrap(x + Math.sin(t / 2 + y0) * 2, SKY_W)), Math.floor(y), mix(d.rowColor(y), '#ffffff', 0.85));
        }
    }
};

// Sunset: desert dunes under a warmer sky, a camel plodding along the far
// dune and a palm oasis with a pool that mirrors the sky
const CAMEL = [
    ['......##', '.##...##', '#####.#.', '######..', '.#..#.#.', '.#..#.#.'],
    ['......##', '.##...##', '#####.#.', '######..', '#..#..#.', '#...#..#']
];
const PALM_LEAVES = [[-1, 0], [1, 0], [-2, 0], [2, 0], [-3, 1], [3, 1], [-4, 2], [4, 2], [0, -1], [-1, -1], [1, -1], [-2, -2], [2, -2]];
const duneFar = x => Math.round(28 + 3 * Math.sin(x / 13 + 0.5) + 1.5 * Math.sin(x / 5));
const duneNear = x => hillY(x, 34, 2, 10, 2);
const sunsetScene = {
    tint: (top, bottom, cloud, day) => [mix(top, '#e07a5a', 0.15), mix(bottom, '#ff9a4d', 0.3 * day + 0.1), mix(cloud, '#ffd2a8', 0.3)],
    draw(d) {
        const { t, day } = d;
        const sandFar = mix(mix('#1e1424', '#e2a464', day), d.bottom, 0.3);
        for (let x = 0; x < SKY_W; x++) skyRect(x, duneFar(x), 1, SKY_H, sandFar);
        const cx = Math.floor(wrap(t * 0.8, SKY_W + 12)) - 10;
        spriteAt(CAMEL[Math.floor(t * 2.5) % 2], cx, duneFar(cx + 4) - 5, mix('#0e0a12', '#7a4a2e', day));
        const sand = mix('#2a1c28', '#f2b86c', day);
        for (let x = 0; x < SKY_W; x++) {
            skyRect(x, duneNear(x), 1, SKY_H, sand);
            skyPx(x, duneNear(x), mix(sand, '#fff0c8', 0.35 * day));   // the crest catches the light
        }
        for (let x = 42; x < 56; x++) skyRect(x, 37, 1, x > 44 && x < 53 ? 2 : 1, mix(d.top, '#4ab0c8', 0.35));
        const trunk = mix('#120a0a', '#7a5434', day), leaf = mix('#0a1210', '#3a7a3a', day);
        for (const [x0, height, lean] of [[44, 11, -1], [53, 8, 1]]) {
            for (let i = 0; i < height; i++) skyPx(x0 + Math.round(lean * (i / height) ** 2 * 3), 37 - i, trunk);
            for (const [dx, dy] of PALM_LEAVES) skyPx(x0 + lean * 3 + dx, 37 - height + dy, leaf);
        }
    }
};

// Cute: a pastel sky, a rainbow by day on the side away from the sun, a
// striped hot air balloon, hills with flowers, a mushroom house whose
// window glows at night, and stars that twinkle into sparkles
const RAINBOW = ['#ff8fb1', '#ffb57a', '#ffe58a', '#9fe6a0', '#8ec5ff', '#c8a2ff'];
const PETALS = ['#ff8fb1', '#ffe58a', '#ffffff', '#c8a2ff'];
const cuteScene = {
    tint: (top, bottom, cloud, day) => [mix(top, '#ff9ccf', 0.12 + 0.12 * day), mix(bottom, '#ffd1ea', 0.35 * day + 0.1), mix(cloud, '#ffe0f0', 0.5)],
    star(d, x, y) {
        skyPx(x, y, mix(d.rowColor(y), x % 3 ? '#ffffff' : '#ffc4e6', d.night * 0.9));
        if (x % 4 || Math.sin(d.t * 2 + x) <= 0.3) return;
        const c = mix(d.rowColor(y), '#ffd9f0', d.night * 0.5);
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) skyPx(x + dx, y + dy, c);
    },
    behind(d) {
        if (d.day < 0.3) return;
        const cx = SKY_W - d.sun[0];
        for (let y = 0; y < SKY_H; y++) for (let x = 0; x < SKY_W; x++) {
            const band = Math.floor(30 - Math.hypot(x - cx, y - 42));
            if (band >= 0 && band < RAINBOW.length) d.blend(x, y, RAINBOW[band], 0.4 * (d.day - 0.3) / 0.7);
        }
    },
    draw(d) {
        const { t, day, night } = d;
        for (let x = 0; x < SKY_W; x++) skyRect(x, hillY(x, 29, 3, 9, 0), 1, SKY_H, mix('#2a1f45', '#b5ecc4', day));
        const bx = Math.floor(wrap(t * 0.5 + 20, SKY_W + 10)) - 5, by = 9 + Math.round(Math.sin(t / 2) * 1.5);
        const stripes = [mix('#5a3a6a', '#ff8fc8', day), mix('#6a6a8a', '#ffffff', day)];
        spriteAt(['.###.', '#####', '#####', '.###.', '..#..'], bx, by, dx => stripes[dx % 2]);
        const basket = mix('#3a2a2a', '#a07850', day);
        skyPx(bx + 1, by + 5, basket);
        skyPx(bx + 3, by + 5, basket);
        skyRect(bx + 1, by + 6, 3, 2, basket);
        const near = mix('#1e1633', '#88dba0', day);
        for (let x = 0; x < SKY_W; x++) skyRect(x, hillY(x, 33, 2, 7, 1), 1, SKY_H, near);
        for (let x = 2; x < SKY_W; x += 5) skyPx(x, hillY(x, 33, 2, 7, 1) + 2, mix(near, PETALS[x % 4], 0.85 * day + 0.15));
        const cap = mix('#4a1830', '#ff5a7a', day), stem = mix('#3a3040', '#fff1dc', day);
        skyRect(45, 31, 7, 7, stem);
        spriteAt(['..#######..', '.#########.', '###########', '###########'], 43, 27, cap);
        for (const [x, y] of [[46, 28], [50, 29], [44, 30], [52, 30]]) skyPx(x, y, mix(cap, '#ffffff', 0.85));
        skyRect(47, 34, 2, 4, mix(stem, '#8a5a3a', 0.6));   // door
        const lit = mix(mix(stem, '#5a4a5a', 0.4), '#ffd56b', clamp01(night * 1.2));
        skyRect(50, 33, 1, 2, lit);
        skyPx(49, 33, lit);
    }
};
const SKY_SCENES = { wood: woodScene, ocean: oceanScene, aurora: auroraScene, sunset: sunsetScene, cute: cuteScene };

function drawSky(now) {
    const { h, p } = sunHeight(now);
    const scene = SKY_SCENES[document.documentElement.dataset.palette];
    const night = Math.min(Math.max(-h * 4, 0), 1), day = clamp01((h + 0.12) * 3);
    let [top, bottom, cloud, building] = skyColors(h);
    if (cyberSky()) bottom = mix(bottom, CYBER_GLOW, night * 0.7);
    if (scene?.tint) [top, bottom, cloud] = scene.tint(top, bottom, cloud, day);
    const rowColor = y => mix(top, bottom, Math.min(y / HORIZON, 1));
    for (let y = 0; y < SKY_H; y++) {
        skyCtx.fillStyle = rowColor(y);
        skyCtx.fillRect(0, y, SKY_W, 1);
    }
    const d = scene && { t: now.getTime() / 1000, h, night, day, top, bottom, rowColor,
        blend: (x, y, c, a) => skyPx(x, y, mix(rowColor(y), c, a)) };
    // Retro: the rain instead of stars and clouds, behind the sun or moon
    // and the skyline, which go on top from a cleared pixel layer
    const matrix = matrixSky();
    if (matrix) {
        blitSky();
        drawMatrix(now.getTime());
        skyCtx.clearRect(0, 0, SKY_W, SKY_H);
    }
    // Stars fade in after dusk and twinkle
    for (const [x, y] of night && !matrix ? STARS : []) {
        if (Math.random() < 0.08) continue;
        if (scene?.star) scene.star(d, x, y);
        else skyPx(x, y, mix(rowColor(y), '#ffffff', night * 0.9));
    }
    // Sun by day, moon by night, arcing from left to right and setting
    // behind the scene's horizon
    const horizon = scene?.horizon ?? HORIZON;
    const x = Math.round(4 + p * (SKY_W - 8));
    const y = Math.round(horizon - Math.abs(h) * (horizon - 8));
    if (scene) {
        d.sun = [x, y];
        scene.behind?.(d);
    }
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
    if (cyberSky()) {
        drawCyberCity(now, building, bottom, night);
        return blitSky();
    }
    if (scene) {
        scene.draw(d);
        return blitSky();
    }
    const lit = night * 0.6;
    for (const b of BUILDINGS) {
        skyCtx.fillStyle = building;
        skyCtx.fillRect(b.x, b.top, b.w, SKY_H - b.top);
        skyCtx.fillStyle = '#ffd86b';
        for (const [wx, wy, r] of b.windows) if (r < lit) skyCtx.fillRect(wx, wy, 1, 1);
    }
    blitSky();
}
// The rain, the flying cars and the scenes' smoke, boats, lights and snow
// need more frames than the clock's four a second
setInterval(() => {
    if (widgets.sky.on && (matrixSky() || cyberSky() || SKY_SCENES[document.documentElement.dataset.palette])
        && document.visibilityState === 'visible') drawSky(new Date());
}, 80);
