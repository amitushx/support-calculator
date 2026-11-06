// Wolt courier on a scooter, Pokémon Emerald style: pixel art, one
// character per pixel (see COURIER_COLORS). Only the fills are drawn here;
// the dark outline is traced around them in courierFrame. In the Cyberpunk
// theme he rides a futuristic motorcycle instead.
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
    y: '#a0ffff'    // the motorcycle's headlight
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
function courierFrame(sprite, step) {
    const width = Math.max(...sprite.rows.map(row => row.length)) + COURIER_PAD;
    const rows = sprite.rows.map(row => ('.'.repeat(COURIER_PAD) + row).padEnd(width, '.'));
    const grid = rows.map(row => [...row]);
    if (step % 4 >= 2) {   // everything but the wheels a pixel up
        for (let y = 0; y < sprite.body; y++) grid[y] = [...rows[y + 1]];
        grid[sprite.body] = [...'.'.repeat(width)];
    }
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
    } else {
        const puff = COURIER_PUFFS[step];
        puff?.dots.forEach(([dx, dy]) => {
            const x = COURIER_PAD + puff.at[0] + dx, y = puff.at[1] + dy;
            if (grid[y][x] === '.') grid[y][x] = 'p';
        });
    }
    // Outline every empty pixel that touches a filled one
    return grid.map((row, y) => row.map((ch, x) => ch !== '.' ? ch
        : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (grid[y + dy]?.[x + dx] ?? '.') !== '.') ? 'K' : '.'));
}
const framesOf = sprite => Array.from({ length: COURIER_STEPS }, (_, step) => courierFrame(sprite, step));
const COURIER_FRAMES = { scooter: framesOf(COURIER_SCOOTER), bike: framesOf(COURIER_BIKE) };
const COURIER_SCALE = 3;
const courier = $('courier');
const courierCtx = courier.getContext('2d');
let courierFrames;
// Scooter or motorcycle, for the theme he's about to drive through
function pickCourier() {
    courierFrames = COURIER_FRAMES[document.documentElement.dataset.palette === 'cyber' ? 'bike' : 'scooter'];
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
            if (!COURIER_COLORS[ch]) return;
            courierCtx.fillStyle = COURIER_COLORS[ch];
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
