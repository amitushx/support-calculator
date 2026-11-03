// The goldfish: a pixel-art bowl in the middle of the floor, with gravel,
// seaweed and a little castle, and a fish that hangs about and now and
// then swims somewhere else. A click lets out a few bubbles that pop with
// a bloop. While the cat is out it often comes over to tap the glass and
// try to fish it out, to no avail: the fish keeps to the far side.
const FISH_COLORS = {
    K: '#283040',                    // outline of the bowl
    G: 'rgba(200, 235, 255, .55)',   // glass
    g: 'rgba(255, 255, 255, .9)',    // its shine
    w: 'rgba(110, 190, 240, .38)',   // water
    s: 'rgba(80, 160, 220, .55)',    // its surface
    1: '#e8b4b8', 2: '#9fc6e8', 3: '#f2dd8c', 4: '#f4f0e8', 5: '#b8a0d8',   // gravel
    V: '#4cae5c', v: '#2f8a44',      // seaweed
    R: '#9aa4b0', r: '#6c7684', d: '#3a4250', F: '#ffd166',   // castle, door, flag
    O: '#ff8a1e', o: '#e0600e', T: '#ffb04a', E: '#283040', k: '#7a3010'   // fish, outline k
};
const BOWL = { w: 28, h: 23, cx: 13.5, cy: 12.5, r: 10.6, top: 3, water: 6, floor: 21, scale: 3 };
const inBowl = (x, y) => y >= BOWL.top && y <= BOWL.floor && (x - BOWL.cx) ** 2 + (y - BOWL.cy) ** 2 <= BOWL.r ** 2;
const NEXT_TO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const CASTLE = ['R.R.R', 'RRRRR', 'RRrRR', 'RrdrR', 'RrdrR'];
const SHINE = [[6, 7], [5, 8], [5, 9], [5, 10], [5, 11], [6, 15]];
// Facing left; the tail flaps between the two
const FISH_FRAMES = [[
    '..oo...',
    '.OOOO.T',
    'OEOOOTT',
    'OOOOOTT',
    '.OOOO.T',
    '..o....'
], [
    '..oo...',
    '.OOOO..',
    'OEOOOTT',
    'OOOOOTT',
    '.OOOOTT',
    '..o....'
]];
const FISH_X = [5, 16], FISH_Y = [7, 12];   // where its top left corner can be
const FISH_TICK = 60;

// The bowl sits among the pets, resting for good, so they never sit or
// sleep on it
const bowl = { el: $('fish'), x: 0, timer: null, resting: true, sleeping: false, width: BOWL.w * BOWL.scale };
const fish = { x: 11, y: 9, tx: 11, ty: 9, left: true };
pets.fish = bowl;
{
    const { el } = bowl;
    el.width = BOWL.w;
    el.height = BOWL.h;
    el.style.width = BOWL.w * BOWL.scale + 'px';
    el.style.height = BOWL.h * BOWL.scale + 'px';
}
const bowlCtx = bowl.el.getContext('2d');
// The outline: every cell outside the bowl next to one inside it
const bowlEdge = [];
for (let y = 0; y < BOWL.h; y++) for (let x = 0; x < BOWL.w; x++)
    if (!inBowl(x, y) && NEXT_TO.some(([dx, dy]) => inBowl(x + dx, y + dy))) bowlEdge.push([x, y]);
let fishTicks = 0;

function drawBowl() {
    const px = (x, y, c) => { bowlCtx.fillStyle = FISH_COLORS[c]; bowlCtx.fillRect(x, y, 1, 1); };
    const { water, floor } = BOWL;
    bowlCtx.clearRect(0, 0, BOWL.w, BOWL.h);
    for (let y = 0; y < BOWL.h; y++) for (let x = 0; x < BOWL.w; x++) {
        if (!inBowl(x, y)) continue;
        if (y >= floor - 2) px(x, y, (x * 7 + y * 3) % 5 + 1);   // gravel
        else px(x, y, y > water ? 'w' : y === water ? 's' : 'G');
    }
    CASTLE.forEach((row, y) => [...row].forEach((c, x) => c !== '.' && px(17 + x, floor - 6 + y, c)));
    px(19, floor - 8, 'r');
    px(20, floor - 8, 'F');
    // Two strands of seaweed, swaying more toward the tip
    const sway = Math.floor(fishTicks / 6) * .5;
    for (const [x, height] of [[7, 8], [9, 5]]) for (let i = 0; i < height; i++)
        px(x + Math.round(Math.sin(i * .9 + sway) * (i / height) * 1.4), floor - 2 - i, i % 2 ? 'V' : 'v');
    // The fish, outlined, and cut off by the glass
    const frame = FISH_FRAMES[Math.floor(fishTicks / 5) % 2];
    const at = (x, y) => (frame[y]?.[x] ?? '.') !== '.';
    const fx = Math.round(fish.x), fy = Math.round(fish.y);
    for (let y = -1; y <= frame.length; y++) for (let x = -1; x <= 7; x++) {
        const c = at(x, y) ? frame[y][x] : NEXT_TO.some(([dx, dy]) => at(x + dx, y + dy)) ? 'k' : null;
        const X = fish.left ? fx + x : fx + 6 - x;
        if (c && inBowl(X, fy + y)) px(X, fy + y, c);
    }
    bowlEdge.forEach(([x, y]) => px(x, y, 'K'));
    for (let x = 0; x < BOWL.w; x++) if (inBowl(x, BOWL.top)) px(x, BOWL.top, 'G');   // the lip
    SHINE.forEach(([x, y]) => px(x, y, 'g'));
}

// Somewhere new to swim to; with the cat at the bowl, on the far side
function fishTarget() {
    const [a, b] = !fishGame.on ? FISH_X : fishGame.side < 0 ? [13, 16] : [5, 8];
    fish.tx = petRand(a, b);
    fish.ty = petRand(...FISH_Y);
}
function swim() {
    clearTimeout(bowl.timer);
    if (bowl.el.hidden) return;
    drawBowl();
    if (petCalm()) return;   // still, with reduced motion
    fishTicks++;
    if (Math.random() < (fishGame.on ? .05 : .012)) fishTarget();
    const speed = fishGame.on ? .35 : .18;
    const dx = fish.tx - fish.x, dy = fish.ty - fish.y;
    if (Math.abs(dx) > .3) fish.left = dx < 0;
    fish.x += Math.sign(dx) * Math.min(Math.abs(dx), speed);
    fish.y += Math.sign(dy) * Math.min(Math.abs(dy), speed / 2);
    bowl.timer = setTimeout(swim, FISH_TICK);
}
bowl.start = () => {
    bowl.resting = true;
    swim();
};
// In the middle of the floor, on whole bowl pixels
bowl.place = () => {
    bowl.x = Math.round((innerWidth - bowl.width) / 2 / BOWL.scale) * BOWL.scale;
    bowl.el.style.translate = `${bowl.x}px 0`;
};
addEventListener('resize', bowl.place);

// A click lets out 3 to 5 bubbles, from the same spots over the water
// each time, rising a whole pixel at a time with a wobble, then popping
const BUBBLES = {
    3: ['.B.', 'BhB', '.B.'],
    4: ['.BB.', 'Bh.B', 'B..B', '.BB.'],
    5: ['.BBB.', 'Bh..B', 'B...B', 'B...B', '.BBB.'],
    pop: ['B...B', '.....', '..B..', '.....', 'B...B']
};
const BUBBLE_COLORS = { B: '#5fb0e8', h: '#ffffff' };   // a ring that shows in light mode too
// Each bubble's column in the bowl, its size, when it sets off and how
// many pixels it rises
const BUBBLE_SPOTS = [
    { x: 12, size: 5, delay: 0, rise: 15 },
    { x: 16, size: 3, delay: 220, rise: 21 },
    { x: 9, size: 4, delay: 400, rise: 11 },
    { x: 14, size: 3, delay: 560, rise: 25 },
    { x: 10, size: 3, delay: 720, rise: 18 }
];
const BUBBLE_WOBBLE = [0, 0, 1, 1, 0, 0, -1, -1];
let bubbleSprites = null;   // image URLs, drawn on the first click
function bubbleSprite(rows) {
    const c = document.createElement('canvas');
    c.width = c.height = 5;
    const g = c.getContext('2d');
    const off = Math.floor((5 - rows.length) / 2);
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (!BUBBLE_COLORS[ch]) return;
        g.fillStyle = BUBBLE_COLORS[ch];
        g.fillRect(off + x, off + y, 1, 1);
    }));
    return c.toDataURL();
}
// A bubble's pop: a short sine sweeping up
function bloop(at) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const freq = 250 + Math.random() * 300;
    osc.frequency.setValueAtTime(freq, at);
    osc.frequency.exponentialRampToValueAtTime(freq * 3.5, at + 0.07);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
    osc.connect(gain).connect(audio.destination);
    osc.start(at);
    osc.stop(at + 0.1);
}
// One burst at a time, however often the bowl is clicked
let bubbling = 0;
function fishBubbles() {
    if (bubbling) return;
    unlockAudio();
    bubbleSprites ??= Object.fromEntries(Object.entries(BUBBLES).map(([k, rows]) => [k, bubbleSprite(rows)]));
    const box = bowl.el.getBoundingClientRect();
    const S = BOWL.scale;
    bubbling = 3 + Math.floor(Math.random() * 3);
    for (const spot of BUBBLE_SPOTS.slice(0, bubbling)) setTimeout(() => {
        const b = document.createElement('img');
        b.className = 'fish-bubble';
        b.src = bubbleSprites[spot.size];
        document.body.append(b);
        let step = 0;
        const place = () => {
            b.style.left = `${box.left + (spot.x + BUBBLE_WOBBLE[step % BUBBLE_WOBBLE.length]) * S}px`;
            b.style.top = `${box.top + (BOWL.water - 4 - step) * S}px`;
        };
        place();
        const rise = setInterval(() => {
            if (++step < spot.rise) return place();
            clearInterval(rise);
            b.src = bubbleSprites.pop;
            if (audio) bloop(audio.currentTime);
            setTimeout(() => {
                b.remove();
                bubbling--;
            }, 120);
        }, 70);
    }, spot.delay);
}
bowl.el.addEventListener('click', () => {
    petInput.last = Date.now();
    fishBubbles();
    // Up to see the bubbles
    fish.tx = petRand(...FISH_X);
    fish.ty = FISH_Y[0];
});

// The cat and the fish: now and then, while both are out and the cat is
// awake, it comes up beside the bowl, taps the glass, then gets up on its
// hind legs to paw over the top, and gives up puzzled. A click on the
// cat, or turning either off, ends it.
const FISH_PLAY_EVERY = 90000;   // at most this often
const fishGame = { id: 0, on: false, side: -1, last: Date.now() - FISH_PLAY_EVERY / 2 };
const fishReady = () => !bowl.el.hidden && !cat.el.hidden && !cat.sleeping && !play.on
    && !petCalm() && !petAlone() && Date.now() - fishGame.last > FISH_PLAY_EVERY;
const catNextAlone = cat.next;
cat.next = () => fishReady() && Math.random() < .4 ? fishPlay() : catNextAlone();

function fishPlay() {
    const id = ++fishGame.id;
    fishGame.on = true;
    fishGame.last = Date.now();
    const go = step => () => { if (fishGame.on && fishGame.id === id) step(); };
    cat.resting = false;
    // Beside the bowl, on the side the cat is on if there's room: its paw
    // on the glass, both the swatting one sitting and the ones reaching
    // over the top standing up
    const reach = 13 * BOWL.scale;
    const spot = side => side < 0 ? bowl.x - reach : bowl.x + bowl.width - cat.width + reach;
    let side = cat.x + cat.width / 2 < bowl.x + bowl.width / 2 ? -1 : 1;
    if (spot(side) < 0 || spot(side) > cat.maxX()) side = -side;
    fishGame.side = side;
    cat.walk(spot(side), { then: go(tap) });

    function tap() {
        cat.el.classList.toggle('left', side > 0);   // facing the bowl
        fishTarget();   // off to the far side
        let paw = false;
        cat.run(petRand(1800, 3000), () => {
            paw = !paw;
            cat.draw(paw ? 'swat' : 'sit');
            return 260;
        }, go(fishOut));
    }
    function fishOut() {
        let up = false;
        cat.run(petRand(2500, 4500), () => {
            up = !up;
            cat.draw(up ? 'reach1' : 'reach2');
            return 300;
        }, go(giveUp));
    }
    function giveUp() {
        cat.draw('sit');
        cat.fx('?');
        cat.run(1500, () => 1500, go(fishPlayStop));
    }
}
// Back to its own things; `except` is a pet that was just clicked
function fishPlayStop(except) {
    if (!fishGame.on) return;
    fishGame.on = false;
    if (except !== cat && !cat.el.hidden) cat.next();
}
cat.el.addEventListener('click', () => fishPlayStop(cat));
// Turning the cat off leaves it be as it goes
$('extrasMenu').addEventListener('change', e => {
    const name = e.target.dataset.pet;
    if (name === 'cat' || name === 'fish') fishPlayStop(name === 'cat' ? cat : null);
});

setPet('fish', store.get('fish') === '1');
