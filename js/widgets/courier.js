// Wolt courier on a scooter, Pokémon Emerald style: pixel art, one
// character per pixel (see COURIER_COLORS). Only the fills are drawn here;
// the dark outline is traced around them in courierOutline. Each theme can
// give him another ride: a futuristic motorcycle in Cyberpunk, a bicycle in
// Wood, a jet ski in Ocean, a pastel scooter in Cute and a glowing phosphor
// wireframe in Retro terminal.
const COURIER_COLORS = {
    K: '#283040',   // outline
    B: '#00a8e8',   // jacket, cap and box
    L: '#8ad8f8',   // highlights
    D: '#0070b0',   // shading
    S: '#f8c898',   // skin
    s: '#d89060',   // skin shading
    H: '#584030',   // hair
    P: '#405070',   // pants
    O: '#383838',   // shoes
    G: '#404850',   // tires
    g: '#a8b0b8',   // rims, rack, mirror; the motorcycle helmet
    w: '#ffffff',   // the helmet's shine, the spinning mark on the wheels
    M: '#e85848',   // scooter
    m: '#a83028',   // its shading
    Y: '#f8e070',   // headlight
    p: '#c8ccd4',   // exhaust
    Q: '#2c2548',   // motorcycle
    q: '#4b3f7a',   // its lighter panels
    k: '#17122a',   // its belly and hubs
    C: '#00f0ff',   // neon: the stripe, the wheel rings, a light trail
    N: '#ff2bd6',   // neon pink: the tail, the axles, a light trail
    V: '#9ffcff',   // visor and windscreen
    R: '#ff2b6a',   // tail light
    y: '#a0ffff',   // the motorcycle's headlight
    F: '#3f7a3a',   // the bicycle's frame
    T: '#6a4028',   // its saddle
    z: '#a8b0b8',   // its spokes, drawn without an outline
    r: '#2e3a52',   // the far leg, pedalling behind the frame
    J: '#12a4b8',   // jet ski
    j: '#0a6a7a',   // its keel
    W: '#f6f6f2',   // its white hull
    A: '#3a9ad8',   // the sea under it
    a: '#c8f0ff',   // foam and spray
    h: '#ff6fae',   // Cute: the hearts he leaves behind
    x: '#fff3a8'    // and a sparkle between them
};
const COURIER_SCOOTER = {
    rows: [
        '...................................',   // room for the cap's outline
        '...................................',   // when he rides a pixel up
        '...............BBBBB...............',
        '.............BBLLBBBB..............',
        '.............BBBBBBBBBBB...........',
        '.............HHSSSSSS..............',
        '.............HHSSSSKS..............',
        '.............HSSSSSSSS.............',
        '.............HSSSSSSs..............',
        '..............sSSSss...............',
        '.BLLLLLLLLLB....SS.................',
        '.BBBBBBBBBBB..BBBBBB...............',
        '.BBBBBBBBBBB.BBBBBBBB.......gg.....',   // a plain box, no logo
        '.BBBBBBBBBBB.BBBBBBBBSSSSSSSgg.....',
        '.BBBBBBBBBBB.BBBBBBBB......MM......',
        '.BBBBBBBBBBB.BBBBBBB.......MM......',
        '.BBBBBBBBBBB.PPPPPPPPPP....MMY.....',
        '.DDDDDDDDDDD.PPPPPPPPPP....MMYY....',
        '...gggggggggggggggg.PPP....MM......',
        '...MMMMMMMMMMMMMMMM..PP...MMM......',
        '....MMMMMMMMMMMMMM...OOOMMMM.......',
        '.....mmmmmmmmMMMMMMMMMMMMMm........',
        '......mmmmmmmmmmmmmmmmmmmm.........',
        '', '', '', '', '', '', ''
    ],
    body: 22,   // the rows that ride up on the suspension
    wheels: [9, 27], axle: 24, radius: 4.4
};
// Leaning over a long, low bike in a silver helmet, the box on the tail.
// Its fenders cover the tops of the wheels.
const COURIER_BIKE = {
    rows: [
        '..............................................',
        '..............................................',
        '........................ggggg.................',
        '.......................ggwwggg................',
        '.......................gggggVVV...............',
        '.......................ggggVVVVV..............',
        '........................ggggggS...............',
        '....................BBBBBBBSS.................',
        '.BLLLLLLLLLB......BBBBBBBBBBBSS...............',
        '.BBBBBBBBBBB.....BBBBBBBBBBBBBBSS.............',
        '.BBBBBBBBBBB.....DBBBBBBBB.....SSSgg..........',
        '.BBBBBBBBBBB.....PPPPPPPP........ggVVV........',
        '.BBBBBBBBBBB....PPPPPPPPPPPP.....QqVVVV.......',
        '.DDDDDDDDDDD....PPPPPPPPPPPPP..QQQqqVVV.......',
        'RNNNNNNNNNNNNQQQQQQQQQQ..PPP.QQQQQQqqqQQ......',
        '.QQQQQQQQQQQQQQQQQQQQQQ..PPQQQQQQQQQQQQQQyy...',
        '..CCCCCCCCCCCCCCCQQQQQQQOOOOQQQQQQQQQQQQQQyy..',
        '...QQQQQQQQQQQ..QQQQQQQQQQQQQQQQQQ.QQQQQQQQ...',
        '....QQQQQQQQ.....QqqqqqqqqqqqqqQQ...QQQQQQ....',
        '...................QQQQQQQQQQQQ...............',
        '', '', '', '', '', '', '', '', ''
    ],
    body: 19,
    wheels: [9, 37], axle: 22, radius: 5.4,
    neon: true
};
// Cute: the scooter in pink, his jacket pastel blue, cat ears on his cap
// (two rows up top, so they still fit when he bobs up) and a heart on the
// box; hearts float up behind him instead of exhaust
const COURIER_CUTE = {
    ...COURIER_SCOOTER,
    rows: ['', '', ...COURIER_SCOOTER.rows],
    body: COURIER_SCOOTER.body + 2,
    axle: COURIER_SCOOTER.axle + 2,
    stamps: [[['B...B', 'BM.MB'], 15, 2], [['.M.M.', 'MMMMM', '.MMM.', '..M..'], 4, 15]],
    hearts: true,
    colors: { B: '#8fc8ff', L: '#d4ecff', D: '#5a9ad8', M: '#ff8fbf', m: '#d9609a' }
};
// Room on the left for the exhaust
const COURIER_PAD = 6;
// One of COURIER_STEPS frames: the spokes a step further round each time
// (they look the same every quarter turn, so 4 steps do a whole turn), the
// scooter and rider riding a pixel up on the suspension for 2 frames of 4,
// and a puff of exhaust drifting back and thinning out over the first 3.
// The motorcycle's wheels are solid, a neon ring with a bright mark going
// round, and instead of exhaust it trails neon streaks off its tail.
const COURIER_STEPS = 8;
const COURIER_PUFFS = [
    { at: [-1, 22], dots: [[0, 0], [1, 0], [0, -1], [1, -1]] },
    { at: [-3, 21], dots: [[0, 0], [1, 0], [0, -1]] },
    { at: [-5, 21], dots: [[0, 0]] }
];
const COURIER_TRAILS = [[[14, 'N', 4], [16, 'C', 6]], [[14, 'N', 6], [16, 'C', 3]]];   // [row, color, length]
const courierPut = (grid, x, y, ch) => {
    x = Math.round(x);
    y = Math.round(y);
    if (grid[y] && x >= 0 && x < grid[y].length) grid[y][x] = ch;
};
const courierStamp = (grid, rows, x, y, under = false) => rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
    if (ch !== '.' && !(under && grid[y + dy]?.[x + dx] !== '.')) courierPut(grid, x + dx, y + dy, ch);
}));
function courierLine(grid, x0, y0, x1, y1, ch) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++) courierPut(grid, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, ch);
}
const courierLift = (grid, rows) => {   // everything above `rows` a pixel up
    for (let y = 0; y < rows; y++) grid[y] = [...grid[y + 1]];
    grid[rows] = grid[rows].map(() => '.');
};
// Outline every empty pixel that touches a filled one, except the fills in
// `skip` (spokes, water, spray, hearts), which go without
const courierOutline = (grid, skip = '') => grid.map((row, y) => row.map((ch, x) => ch !== '.' ? ch
    : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const next = grid[y + dy]?.[x + dx] ?? '.';
        return next !== '.' && !skip.includes(next);
    }) ? 'K' : '.'));
function courierFrame(sprite, step) {
    const width = Math.max(...sprite.rows.map(row => row.length)) + COURIER_PAD;
    const grid = sprite.rows.map(row => [...('.'.repeat(COURIER_PAD) + row).padEnd(width, '.')]);
    for (const [rows, x, y] of sprite.stamps ?? []) courierStamp(grid, rows, x + COURIER_PAD, y);
    if (step % 4 >= 2) courierLift(grid, sprite.body);   // everything but the wheels a pixel up
    const turn = step * Math.PI / 8, r = sprite.radius, reach = Math.ceil(r);
    for (const cx of sprite.wheels.map(x => x + COURIER_PAD)) {
        for (let y = -reach; y <= reach; y++) for (let x = -reach; x <= reach; x++) {
            const d = Math.hypot(x, y);
            if (d > r) continue;
            let ch;
            if (sprite.neon) {
                if (grid[sprite.axle + y][cx + x] !== '.') continue;   // under a fender
                const at = ((Math.atan2(y, x) - 2 * turn) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
                ch = d > r - 1.3 ? 'G' : d > r - 2.4 ? (at < .5 || Math.abs(at - Math.PI) < .25 ? 'w' : 'C')
                    : d < 1.2 ? 'N' : 'k';
            } else {
                const off = ((Math.atan2(y, x) - turn) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2);
                const spoke = Math.min(off, Math.PI / 2 - off) < .3;
                if (d <= 2.4 && d >= 1 && !spoke) continue;
                ch = d > 2.4 ? 'G' : 'g';
            }
            grid[sprite.axle + y][cx + x] = ch;
        }
    }
    if (sprite.neon) {
        COURIER_TRAILS[step % 2].forEach(([y, ch, length]) => {
            for (let x = COURIER_PAD - 2; x > COURIER_PAD - 2 - length && x >= 0; x--) {
                if (grid[y][x] === '.') grid[y][x] = ch;
            }
        });
    } else if (sprite.hearts) {   // a heart floats up and back, a sparkle every other step
        const k = step % 4, top = sprite.axle - COURIER_SCOOTER.axle;
        courierStamp(grid, ['h.h', 'hhh', '.h.'], COURIER_PAD - 2 - k, 20 + top - k * 2);
        if (step % 2) courierStamp(grid, ['.x.', 'xxx', '.x.'], COURIER_PAD - 4 - k, 14 + top - k);
    } else {
        const puff = COURIER_PUFFS[step];
        puff?.dots.forEach(([dx, dy]) => {
            const x = COURIER_PAD + puff.at[0] + dx, y = puff.at[1] + dy;
            if (grid[y][x] === '.') grid[y][x] = 'p';
        });
    }
    return courierOutline(grid, 'hx');
}

// His head and cap, as on the scooter, and the box he carries
const COURIER_HEAD = ['..BBBBB....', 'BBLLBBBB...', 'BBBBBBBBBBB', 'HHSSSSSS...', 'HHSSSSKS...', 'HSSSSSSSS..', 'HSSSSSSs...', '.sSSSss....'];
const COURIER_BOX = ['BLLLLLLLLLLB', ...Array(5).fill('BBBBBBBBBBBB'), 'DDDDDDDDDDDD'];
const wrapAngle = (a, span) => ((a % span) + span) % span;
// Wood: a green bicycle with spoked wheels, the box on a rack over the back
// wheel. He pedals: each foot goes round the crank, the knee bending
// forward, the far leg half a turn behind and darker. No exhaust, no bob.
function bicycleFrame(step) {
    const grid = Array.from({ length: 31 }, () => Array(42).fill('.'));
    const turn = step * Math.PI / 4, axle = 24, radius = 5.6, crank = [21, 24];
    for (const cx of [9, 34]) for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
        const d = Math.hypot(x, y);
        if (d > radius) continue;
        if (d > radius - 1.3 || d < 1.2) grid[axle + y][cx + x] = d < 1.2 ? 'g' : 'G';
        else {   // six thin spokes, turning
            const off = wrapAngle(Math.atan2(y, x) - turn / 2, Math.PI / 3);
            if (d * Math.sin(Math.min(off, Math.PI / 3 - off)) < 0.45) grid[axle + y][cx + x] = 'z';
        }
    }
    const leg = (angle, ch, shoe) => {
        const hip = [20, 17], foot = [crank[0] + 2.6 * Math.cos(angle), crank[1] + 2.6 * Math.sin(angle)];
        const dx = foot[0] - hip[0], dy = foot[1] - hip[1], dist = Math.hypot(dx, dy), thigh = 5.6;
        const bend = Math.sqrt(Math.max(thigh * thigh - dist * dist / 4, 0)) / dist;
        const knee = [hip[0] + dx / 2 + Math.abs(dy) * bend, hip[1] + dy / 2 - Math.sign(dy) * dx * bend];
        courierLine(grid, ...hip, ...knee, ch);
        courierLine(grid, hip[0], hip[1] + 1, knee[0], knee[1] + 1, ch);
        courierLine(grid, ...knee, ...foot, ch);
        courierPut(grid, ...foot, shoe);
        courierPut(grid, foot[0] + 1, foot[1], shoe);
    };
    leg(turn + Math.PI, 'r', 'k');
    for (const [x0, y0, x1, y1] of [[9, 24, 21, 24], [9, 24, 19, 18], [19, 18, 21, 24], [19, 18, 30, 17],
        [21, 24, 30, 18], [30, 14, 30, 18], [30, 18, 34, 24]]) courierLine(grid, x0, y0, x1, y1, 'F');
    courierLine(grid, 29, 13, 32, 13, 'g');   // handlebar
    courierLine(grid, 17, 17, 21, 17, 'T');   // saddle
    courierLine(grid, 2, 18, 15, 18, 'g');    // rack
    courierLine(grid, 13, 18, 10, 23, 'g');
    for (let k = 0; k < 6; k++) courierPut(grid, crank[0] + 1.6 * Math.cos(k), crank[1] + 1.6 * Math.sin(k), 'g');   // chainring
    courierStamp(grid, COURIER_HEAD, 19, 2);
    courierStamp(grid, ['..SS.....', 'BBBBBB...', 'BBBBBBBB..', 'BBBBBBBBSSSSS', 'BBBBBBB.....', 'DBBBBBB', 'PPPPPP'], 17, 10);
    courierStamp(grid, COURIER_BOX, 2, 11);
    leg(turn, 'P', 'O');
    return courierOutline(grid, 'z');
}
// Ocean: a jet ski riding its own strip of sea, crests rolling back under
// it and spray flying off the tail; it bobs on the waves like the scooter
const COURIER_JETSKI = [
    '.......................gg........',
    '.......................gg........',
    '......................JJJJ.......',
    '.....................JJJJJJ......',
    '.........kkkkkkkkkkkkJJJJJJJJ....',
    '...WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    '...JJJJJJJJJJJJJJJJJJJJJJJJJJJJJW',
    '....WWWWWWWWWWWWWWWWWWWWWWWWWWW..',
    '.....jjjjjjjjjjjjjjjjjjjjjjjjj...'
];
const COURIER_SPRAY = [[[3, 20], [1, 18], [2, 22]], [[2, 19], [0, 17], [4, 21]], [[1, 21], [3, 18], [0, 23]], [[4, 19], [2, 16], [1, 22]]];
function jetskiFrame(step) {
    const grid = Array.from({ length: 30 }, () => Array(48).fill('.'));
    courierStamp(grid, COURIER_HEAD, COURIER_PAD + 17, 4);
    courierStamp(grid, ['..SS.....', 'BBBBBB...', 'BBBBBBBB..', 'BBBBBBBBSSSSS', 'BBBBBBB.....', 'DBBBBBB', 'PPPPPPPPP', 'PPPPPPPPPP'], COURIER_PAD + 15, 12);
    courierStamp(grid, COURIER_BOX, COURIER_PAD + 1, 12);
    courierStamp(grid, COURIER_JETSKI, COURIER_PAD - 1, 15, true);   // under him and the box
    courierPut(grid, COURIER_PAD + 25, 20, 'O');   // his foot in the footwell
    courierPut(grid, COURIER_PAD + 26, 20, 'O');
    if (step % 4 >= 2) courierLift(grid, 23);
    for (let x = 0; x < grid[0].length; x++) {
        for (let y = 25; y < 29; y++) if (grid[y][x] === '.') grid[y][x] = 'A';
        if ((x + step) % 7 < 3 && grid[24][x] === '.') grid[24][x] = 'a';
    }
    for (const [x, y] of COURIER_SPRAY[step % 4]) {
        courierPut(grid, x, y, 'a');
        courierPut(grid, x + 1, y, 'w');
    }
    return courierOutline(grid, 'Aaw');
}
const framesOf = draw => Array.from({ length: COURIER_STEPS }, (_, step) => draw(step));
const COURIER_FRAMES = {
    scooter: framesOf(step => courierFrame(COURIER_SCOOTER, step)),
    bike: framesOf(step => courierFrame(COURIER_BIKE, step)),
    cute: framesOf(step => courierFrame(COURIER_CUTE, step)),
    bicycle: framesOf(bicycleFrame),
    jetski: framesOf(jetskiFrame)
};
const COURIER_RIDES = { cyber: 'bike', wood: 'bicycle', ocean: 'jetski', cute: 'cute' };
// Retro terminal: only his outline glows, in the screen's phosphor (amber
// in light mode, green in dark), the fills a faint haze of it; the glow
// itself is a drop shadow in widgets.css
function retroColors() {
    const [line, haze] = isDark() ? ['#39ff6a', 'rgba(57, 255, 106, .12)'] : ['#ffb000', 'rgba(255, 176, 0, .12)'];
    return Object.fromEntries(Object.keys(COURIER_COLORS).map(ch => [ch, ch === 'K' ? line : haze]));
}
const COURIER_SCALE = 3;
const courier = $('courier');
const courierCtx = courier.getContext('2d');
let courierFrames, courierColors;
// His ride and colors, for the theme he's about to drive through
function pickCourier() {
    const palette = document.documentElement.dataset.palette;
    courierFrames = COURIER_FRAMES[COURIER_RIDES[palette] ?? 'scooter'];
    courierColors = palette === 'retro' ? retroColors() : { ...COURIER_COLORS, ...(palette === 'cute' && COURIER_CUTE.colors) };
    courier.width = courierFrames[0][0].length;
    courier.height = courierFrames[0].length;
    courier.style.width = courier.width * COURIER_SCALE + 'px';
    courier.style.height = courier.height * COURIER_SCALE + 'px';
}
pickCourier();
let courierStep = 0;
function drawCourier() {
    courierCtx.clearRect(0, 0, courier.width, courier.height);
    courierFrames[courierStep % COURIER_STEPS].forEach((row, y) => {
        row.forEach((ch, x) => {
            if (!courierColors[ch]) return;
            courierCtx.fillStyle = courierColors[ch];
            courierCtx.fillRect(x, y, 1, 1);
        });
    });
}
drawCourier();

// Every 10 minutes he drives across the page from left to right along the
// floor, behind the pets, moving in steps of his own pixels to stay crisp
const road = $('road');
function scheduleCourier() {
    setTimeout(driveCourier, 10 * 60000);
}
function driveCourier() {
    if (document.visibilityState !== 'visible') {   // wait until he'd be seen
        document.addEventListener('visibilitychange', driveCourier, { once: true });
        return;
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return scheduleCourier();
    pickCourier();
    drawCourier();
    road.hidden = false;
    petsSeeCourier();
    const distance = road.clientWidth + courier.offsetWidth;
    const wheels = setInterval(() => { courierStep++; drawCourier(); }, 60);
    courier.animate([
        { transform: 'translateX(-100%)' },
        { transform: `translateX(${road.clientWidth}px)` }
    ], { duration: distance / 160 * 1000, easing: `steps(${Math.round(distance / COURIER_SCALE)})` })
        .finished.then(() => {
            clearInterval(wheels);
            road.hidden = true;
            scheduleCourier();
        });
}
scheduleCourier();

// A click on him pays out: a "ka" of the register's drawer, then the
// "ching" of its bell, a few bright partials that ring out. Another click
// while it's still ringing cuts it off and starts a new one.
let courierPay = null;   // gain node the current kaching plays through
function kaching(out, at) {
    const ka = audio.createBufferSource();
    ka.buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.05), audio.sampleRate);
    ka.buffer.getChannelData(0).forEach((_, i, data) => { data[i] = Math.random() * 2 - 1; });
    const clack = audio.createBiquadFilter();
    clack.type = 'bandpass';
    clack.frequency.value = 1800;
    clack.Q.value = 1.5;
    const kaLevel = audio.createGain();
    kaLevel.gain.setValueAtTime(0.6, at);
    kaLevel.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
    ka.connect(clack).connect(kaLevel).connect(out);
    ka.start(at);
    const ching = at + 0.07;
    let last;
    [[2093, 0.18, 1.1], [3136, 0.12, 0.9], [4186, 0.1, 0.7], [5274, 0.06, 0.5], [6272, 0.04, 0.35]]
        .forEach(([freq, peak, dur]) => {
            const bell = audio.createOscillator();
            const level = audio.createGain();
            bell.frequency.value = freq * (1 + (Math.random() - .5) * 0.004);
            level.gain.setValueAtTime(0.0001, ching);
            level.gain.exponentialRampToValueAtTime(peak, ching + 0.004);
            level.gain.exponentialRampToValueAtTime(0.0001, ching + dur);
            bell.connect(level).connect(out);
            bell.start(ching);
            bell.stop(ching + dur + 0.01);
            last ??= bell;   // the lowest rings longest
        });
    return last;
}
courier.addEventListener('click', e => {
    unlockAudio();
    if (audio) {
        const now = audio.currentTime;
        if (courierPay) {   // a quick fade, so the cut doesn't click
            courierPay.gain.setTargetAtTime(0, now, 0.005);
            const cut = courierPay;
            setTimeout(() => cut.disconnect(), 60);
        }
        const pay = courierPay = audio.createGain();
        pay.connect(audio.destination);
        kaching(pay, now + 0.02).onended = () => {
            pay.disconnect();
            if (courierPay === pay) courierPay = null;
        };
    }
    const fx = document.createElement('div');
    fx.className = 'pet-fx cash';
    fx.textContent = '10₪';
    fx.style.top = `${courier.getBoundingClientRect().top - 10}px`;
    document.body.append(fx);
    fx.style.left = `${e.clientX - fx.offsetWidth / 2}px`;
    fx.addEventListener('animationend', () => fx.remove());
});
