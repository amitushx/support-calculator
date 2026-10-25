// The cat, in the same pixel-art style: it lives on the bottom edge of the
// window, wanders about, sits, grooms, sometimes comes over to the mouse
// and falls asleep when left alone. A click makes it meow.
const CAT_COLORS = {
    K: '#3a2820',   // outline
    O: '#f0a050',   // ginger fur
    o: '#c87830',   // stripes, closed eyes, tail
    W: '#fff4e4',   // chest and paws
    P: '#f08c9c',   // nose, inner ears, tongue
    E: '#283040'    // eyes
};
// Facing right; sitting faces the viewer
const SIT = [
    '..O...O.......',
    '..OO.OO.......',
    '..OPOPO.......',
    '.OOOOOOO......',
    '.OEOOOEO......',
    '.OOOPOOO......',
    '..OWWWO.......',
    '..OWWWOO......',
    '..OWWWOOO.....',
    '.OOWWWOOOO..O.',
    '.OOWWWOOOO..O.',
    '.OOWWWOOOOO.O.',
    '.OoWWWoOOOOOO.',
    '.WW...WWOOOO..'
];
const withRows = (rows, changes) => rows.map((row, y) => changes[y] ?? row);
const CAT_SPRITES = {
    sit: SIT,
    blink: withRows(SIT, { 4: '.OoOOOoO......' }),
    flick: withRows(SIT, {   // the tail swishes down
        9: '.OOWWWOOOO....', 10: '.OOWWWOOOO....', 11: '.OOWWWOOOOO...',
        12: '.OoWWWoOOOOOOO', 13: '.WW...WWOOOO.O'
    }),
    groom: withRows(SIT, {   // a paw up at the mouth, eyes shut
        4: '.OoOOOoO......', 5: '.OOPPPOO......', 6: '..OWWWWW......', 7: '..OWWWWW......'
    }),
    walk1: [
        '.............O..O.',
        '..O..........OOOO.',
        '.O..........OOOOOO',
        '.O..........OEOOEO',
        '.O..........OOOPOO',
        '..O..........OWWO.',
        '..OOOOOOOOOOOOWWO.',
        '..OOoOOoOOoOOOWW..',
        '..OOOOOOOOOOOOWW..',
        '...OOOOOOOOOOOW...',
        '...OO..OO..OO.OO..',
        '..OO...OO...OO.OO.',
        '..WW...WW...WW..WW'
    ],
    walk2: [
        '.............O..O.',
        '.............OOOO.',
        '..O.........OOOOOO',
        '.O..........OEOOEO',
        '.O..........OOOPOO',
        '..O..........OWWO.',
        '..OOOOOOOOOOOOWWO.',
        '..OOoOOoOOoOOOWW..',
        '..OOOOOOOOOOOOWW..',
        '...OOOOOOOOOOOW...',
        '....OOOO...OOOO...',
        '....OO.OO..OO.OO..',
        '....WW.WW..WW.WW..'
    ],
    sleep: [
        '..........O..O......',
        '......OOOOOOOOO.....',
        '....OOOoOOoOOOOO....',
        '...OOOOOOOOOOOoOoO..',
        '..OOOOOOOOOOOOOOPOO.',
        '.OOoOOoOOOOOOWWWWWO.',
        '.OOOOOOOOOOOOOOOOO..',
        '..ooooooooooooooW...'   // the tail tucked around
    ]
};
// Every sprite on one canvas size, standing on the bottom edge and centered,
// with a dark outline traced around it like the courier's
const CAT_W = 22, CAT_H = 17, CAT_SCALE = 3;
const catFrames = {};
for (const [name, rows] of Object.entries(CAT_SPRITES)) {
    const w = Math.max(...rows.map(r => r.length));
    const left = Math.floor((CAT_W - w) / 2), top = CAT_H - rows.length - 1;
    const grid = Array.from({ length: CAT_H }, () => Array(CAT_W).fill('.'));
    rows.forEach((row, y) => [...row].forEach((ch, x) => { grid[top + y][left + x] = ch; }));
    catFrames[name] = grid.map((row, y) => row.map((ch, x) => ch !== '.' ? ch
        : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (grid[y + dy]?.[x + dx] ?? '.') !== '.') ? 'K' : '.'));
}
const catEl = $('cat');
const catCtx = catEl.getContext('2d');
catEl.width = CAT_W;
catEl.height = CAT_H;
catEl.style.width = CAT_W * CAT_SCALE + 'px';
catEl.style.height = CAT_H * CAT_SCALE + 'px';
function drawCat(name) {
    catCtx.clearRect(0, 0, CAT_W, CAT_H);
    catFrames[name].forEach((row, y) => row.forEach((ch, x) => {
        if (!CAT_COLORS[ch]) return;
        catCtx.fillStyle = CAT_COLORS[ch];
        catCtx.fillRect(x, y, 1, 1);
    }));
}

const CAT_NAP = 2 * 60000;   // with no mouse or keys this long, it sleeps
const cat = { x: 80, timer: null, mouseX: null, lastInput: Date.now() };
const catMaxX = () => innerWidth - CAT_W * CAT_SCALE;
const catRand = (a, b) => a + Math.random() * (b - a);
const catAlone = () => Date.now() - cat.lastInput > CAT_NAP;
function placeCat() {
    cat.x = Math.max(0, Math.min(cat.x, catMaxX()));
    catEl.style.translate = `${Math.round(cat.x / CAT_SCALE) * CAT_SCALE}px 0`;   // whole cat pixels
}
// A heart or a z floating up from the cat's head
function catFx(content) {
    const fx = document.createElement('div');
    fx.className = 'cat-fx';
    fx.innerHTML = content;
    const box = catEl.getBoundingClientRect();
    fx.style.left = `${box.left + box.width / 2 - 8}px`;
    fx.style.top = `${box.top - 10}px`;
    document.body.append(fx);
    fx.addEventListener('animationend', () => fx.remove());
}
// Run one activity: `step` draws a frame and returns the delay to the next
// one, or false when done; after `ms` the cat does `then`, or picks what
// to do next
function catDo(ms, step, then = catNext) {
    clearTimeout(cat.timer);
    const started = Date.now();
    const run = () => {
        if (catEl.hidden) return;
        const next = step(Date.now() - started);
        if (next === false || Date.now() - started >= ms) return then();
        cat.timer = setTimeout(run, next);
    };
    run();
}
function catNext() {
    const r = Math.random();
    if (catAlone() || r < .12) catSleep();
    else if (matchMedia('(prefers-reduced-motion: reduce)').matches || r < .45) catSit();
    else if (r < .6) catGroom();
    else if (r < .72 && cat.mouseX !== null) catWalk(cat.mouseX - CAT_W * CAT_SCALE / 2);
    else catWalk(catRand(0, catMaxX()));
}
function catSit(ms = catRand(4000, 10000)) {
    catDo(ms, () => {
        const r = Math.random();
        drawCat(r < .1 ? 'blink' : r < .25 ? 'flick' : 'sit');
        return r < .25 ? 180 : 700;
    });
}
function catGroom() {
    let paw = false;
    catDo(catRand(2500, 4500), () => {
        paw = !paw;
        drawCat(paw ? 'groom' : 'blink');
        return 350;
    });
}
function catWalk(to, then) {
    to = Math.max(0, Math.min(to, catMaxX()));
    if (Math.abs(to - cat.x) < CAT_SCALE * 4) {
        if (!then) return catSit();
        cat.x = to;   // close enough: step onto the spot so `then` finds it there
        placeCat();
        return then();
    }
    const dir = Math.sign(to - cat.x);
    catEl.classList.toggle('left', dir < 0);
    let leg = false;
    catDo(60000, () => {
        leg = !leg;
        drawCat(leg ? 'walk1' : 'walk2');
        cat.x += dir * CAT_SCALE * 3;
        placeCat();
        return (to - cat.x) * dir > 0 ? 140 : false;   // false: arrived
    }, then);
}
// Where to sleep instead, if the cat is on the "made with" line: just
// clear of it on the nearer side that fits, or null if it's not on it
function catBed() {
    const credit = $('credit').getBoundingClientRect();
    const box = catEl.getBoundingClientRect();
    const gap = CAT_SCALE * 3;
    if (box.right <= credit.left - gap || box.left >= credit.right + gap
        || box.bottom <= credit.top || box.top >= credit.bottom) return null;
    // On the whole cat pixels placeCat snaps to, rounded away from the line
    const sides = [Math.floor((credit.left - gap - box.width) / CAT_SCALE) * CAT_SCALE,
        Math.ceil((credit.right + gap) / CAT_SCALE) * CAT_SCALE]
        .filter(x => x >= 0 && x <= catMaxX())
        .sort((a, b) => Math.abs(a - cat.x) - Math.abs(b - cat.x));
    return sides[0] ?? null;   // no room either side: a phone, sleep where it is
}
// Sleeps for a while, and on and on while nobody's around; never on the
// "made with" line, it moves off it first
function catSleep() {
    const bed = catBed();
    if (bed !== null) {
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) return catWalk(bed, catSleep);
        cat.x = bed;
        placeCat();
    }
    drawCat('sleep');
    catDo(catRand(30000, 90000), elapsed => {
        if (elapsed > 1500) catFx('z');
        return catAlone() ? 3000 : elapsed > 25000 ? false : 3000;
    });
}
// One meow a click, and none over it while it's still meowing however
// often the cat is clicked
let catMeowing = false;
function catMeow() {
    if (catMeowing) return;
    unlockAudio();
    if (!audio) return;
    catMeowing = true;
    const voice = meow(audio.destination, audio.currentTime + 0.02,
        { pitch: 0.9 + Math.random() * 0.25, dur: 0.6 + Math.random() * 0.3 });
    voice.onended = () => { catMeowing = false; };
}
catEl.addEventListener('click', () => {
    cat.lastInput = Date.now();
    catMeow();
    catFx('<svg class="icon"><use href="#i-heart"/></svg>');
    catEl.classList.remove('left');
    catSit(5000);
});
document.addEventListener('pointermove', e => { cat.mouseX = e.clientX; cat.lastInput = Date.now(); });
document.addEventListener('keydown', () => { cat.lastInput = Date.now(); });
addEventListener('resize', placeCat);

function setCat(on) {
    catEl.hidden = !on;
    store.set('cat', on ? '1' : '0');
    $('widgetMenu').querySelector('[data-pet="cat"]').checked = on;
    clearTimeout(cat.timer);
    if (!on) return;
    placeCat();
    catSit();
}
setCat(store.get('cat') === '1');
