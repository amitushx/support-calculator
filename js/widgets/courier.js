// Wolt courier on a scooter, Pokémon Emerald style: pixel art, one
// character per pixel (see COURIER_COLORS). Only the fills are drawn here;
// the dark outline is traced around them in courierFrame.
const COURIER_COLORS = {
    K: '#283040',   // outline
    B: '#00a8e8',   // jacket, cap and box
    L: '#8ad8f8',   // highlights
    D: '#0070b0',   // shading
    W: '#f8f8f8',   // the W on the box
    S: '#f8c898',   // skin
    s: '#d89060',   // skin shading
    H: '#584030',   // hair
    P: '#405070',   // pants
    O: '#383838',   // shoes
    G: '#404850',   // tires
    g: '#a8b0b8',   // rims, rack, mirror
    M: '#e85848',   // scooter
    m: '#a83028',   // its shading
    Y: '#f8e070',   // headlight
    p: '#c8ccd4'    // exhaust
};
const COURIER = [
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
    '.BWBBBBBBBWB.BBBBBBBB.......gg.....',   // a lowercase w
    '.BWBBBWBBBWB.BBBBBBBBSSSSSSSgg.....',
    '.BBWBWBWBWBB.BBBBBBBB......MM......',
    '.BBBWBBBWBBB.BBBBBBB.......MM......',
    '.BBBBBBBBBBB.PPPPPPPPPP....MMY.....',
    '.DDDDDDDDDDD.PPPPPPPPPP....MMYY....',
    '...gggggggggggggggg.PPP....MM......',
    '...MMMMMMMMMMMMMMMM..PP...MMM......',
    '....MMMMMMMMMMMMMM...OOOMMMM.......',
    '.....mmmmmmmmMMMMMMMMMMMMMm........',
    '......mmmmmmmmmmmmmmmmmmmm.........',
    '', '', '', '', '', '', ''
];
// Room on the left for the exhaust
const COURIER_PAD = 6;
// One of COURIER_STEPS frames: the spokes a step further round each time
// (they look the same every quarter turn, so 4 steps do a whole turn), the
// scooter and rider riding a pixel up on the suspension for 2 frames of 4,
// and a puff of exhaust drifting back and thinning out over the first 3
const COURIER_STEPS = 8;
const COURIER_PUFFS = [
    { at: [-1, 22], dots: [[0, 0], [1, 0], [0, -1], [1, -1]] },
    { at: [-3, 21], dots: [[0, 0], [1, 0], [0, -1]] },
    { at: [-5, 21], dots: [[0, 0]] }
];
function courierFrame(step) {
    const width = Math.max(...COURIER.map(row => row.length)) + COURIER_PAD;
    const rows = COURIER.map(row => ('.'.repeat(COURIER_PAD) + row).padEnd(width, '.'));
    const grid = rows.map(row => [...row]);
    if (step % 4 >= 2) {   // everything but the wheels a pixel up
        for (let y = 0; y < 22; y++) grid[y] = [...rows[y + 1]];
        grid[22] = [...'.'.repeat(width)];
    }
    const turn = step * Math.PI / 8;
    for (const cx of [9 + COURIER_PAD, 27 + COURIER_PAD]) {   // wheels
        for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
            const d = Math.hypot(x, y);
            const off = ((Math.atan2(y, x) - turn) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2);
            const spoke = Math.min(off, Math.PI / 2 - off) < .3;
            if (d <= 4.4 && (d > 2.4 || d < 1 || spoke)) grid[24 + y][cx + x] = d > 2.4 ? 'G' : 'g';
        }
    }
    const puff = COURIER_PUFFS[step];
    puff?.dots.forEach(([dx, dy]) => {
        const x = COURIER_PAD + puff.at[0] + dx, y = puff.at[1] + dy;
        if (grid[y][x] === '.') grid[y][x] = 'p';
    });
    // Outline every empty pixel that touches a filled one
    return grid.map((row, y) => row.map((ch, x) => ch !== '.' ? ch
        : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (grid[y + dy]?.[x + dx] ?? '.') !== '.') ? 'K' : '.'));
}
const COURIER_FRAMES = Array.from({ length: COURIER_STEPS }, (_, step) => courierFrame(step));
const COURIER_SCALE = 3;
const courier = $('courier');
const courierCtx = courier.getContext('2d');
courier.width = COURIER_FRAMES[0][0].length;
courier.height = COURIER_FRAMES[0].length;
courier.style.width = courier.width * COURIER_SCALE + 'px';
courier.style.height = courier.height * COURIER_SCALE + 'px';
let courierStep = 0;
function drawCourier() {
    courierCtx.clearRect(0, 0, courier.width, courier.height);
    COURIER_FRAMES[courierStep % COURIER_STEPS].forEach((row, y) => {
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
