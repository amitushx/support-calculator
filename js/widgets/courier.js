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
    Y: '#f8e070'    // headlight
};
const COURIER = [
    '...................................',
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
function courierFrame(phase) {
    const width = Math.max(...COURIER.map(row => row.length));
    const grid = COURIER.map(row => [...row.padEnd(width, '.')]);
    for (const cx of [9, 27]) {   // wheels, the spokes turning between frames
        for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
            const d = Math.hypot(x, y);
            const spoke = phase ? Math.abs(x) === Math.abs(y) : x === 0 || y === 0;
            if (d <= 4.4 && (d > 2.4 || d < 1 || spoke)) grid[23 + y][cx + x] = d > 2.4 ? 'G' : 'g';
        }
    }
    // Outline every empty pixel that touches a filled one
    return grid.map((row, y) => row.map((ch, x) => ch !== '.' ? ch
        : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (grid[y + dy]?.[x + dx] ?? '.') !== '.') ? 'K' : '.'));
}
const COURIER_FRAMES = [courierFrame(0), courierFrame(1)];
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
    COURIER_FRAMES[courierStep % 2].forEach((row, y) => {
        row.forEach((ch, x) => {
            if (!COURIER_COLORS[ch]) return;
            courierCtx.fillStyle = COURIER_COLORS[ch];
            courierCtx.fillRect(x, y, 1, 1);
        });
    });
}
drawCourier();

// Every 10 minutes he drives across the page from left to right, just
// above the credit line, moving in steps of his own pixels to stay crisp
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
    road.style.top = `${$('credit').getBoundingClientRect().top + scrollY - courier.offsetHeight - 8}px`;
    const distance = road.clientWidth + courier.offsetWidth;
    const wheels = setInterval(() => { courierStep++; drawCourier(); }, 125);
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
