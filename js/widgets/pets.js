// The pets: pixel-art animals that live on the floor, the top edge of the
// footer band: the cat and the puppy. Shared here: sprites with a traced
// outline, the activity loop, walking, the hearts and z's, and finding a
// free spot to sit or sleep, so they never rest on top of each other.
const withRows = (rows, changes) => rows.map((row, y) => changes[y] ?? row);
const PET_NAP = 2 * 60000;   // with no mouse or keys this long, pets sleep
const petInput = { mouseX: null, last: Date.now() };
const petAlone = () => Date.now() - petInput.last > PET_NAP;
const petRand = (a, b) => a + Math.random() * (b - a);
const petCalm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
document.addEventListener('pointermove', e => { petInput.mouseX = e.clientX; petInput.last = Date.now(); });
document.addEventListener('keydown', () => { petInput.last = Date.now(); });

const pets = {};
// A pet on the canvas with id `name`. Every sprite gets the same w × h
// canvas, standing on the bottom edge and centered, with a dark outline
// (colors.K) traced around it. The pet's own file sets `start`, what it
// does when turned on, and `next`, which picks what to do next.
function makePet(name, { sprites, colors, w, h, scale = 3, stepMs = 140 }) {
    const frames = {};
    for (const [frame, rows] of Object.entries(sprites)) {
        const sw = Math.max(...rows.map(r => r.length));
        const left = Math.floor((w - sw) / 2), top = h - rows.length - 1;
        const grid = Array.from({ length: h }, () => Array(w).fill('.'));
        rows.forEach((row, y) => [...row].forEach((ch, x) => { grid[top + y][left + x] = ch; }));
        frames[frame] = grid.map((row, y) => row.map((ch, x) => ch !== '.' ? ch
            : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (grid[y + dy]?.[x + dx] ?? '.') !== '.') ? 'K' : '.'));
    }
    const el = $(name);
    const ctx = el.getContext('2d');
    el.width = w;
    el.height = h;
    el.style.width = w * scale + 'px';
    el.style.height = h * scale + 'px';

    const pet = { el, x: 80, timer: null, resting: false, width: w * scale };
    pet.draw = frame => {
        ctx.clearRect(0, 0, w, h);
        frames[frame].forEach((row, y) => row.forEach((ch, x) => {
            if (!colors[ch]) return;
            ctx.fillStyle = colors[ch];
            ctx.fillRect(x, y, 1, 1);
        }));
    };
    pet.maxX = () => innerWidth - pet.width;
    pet.place = () => {
        pet.x = Math.max(0, Math.min(pet.x, pet.maxX()));
        el.style.translate = `${Math.round(pet.x / scale) * scale}px 0`;   // whole pet pixels
    };
    // A heart or a z floating up from the pet's head
    pet.fx = content => {
        const fx = document.createElement('div');
        fx.className = 'pet-fx';
        fx.innerHTML = content;
        const box = el.getBoundingClientRect();
        fx.style.left = `${box.left + box.width / 2 - 8}px`;
        fx.style.top = `${box.top - 10}px`;
        document.body.append(fx);
        fx.addEventListener('animationend', () => fx.remove());
    };
    // Run one activity: `step` draws a frame and returns the delay to the
    // next one, or false when done; after `ms` the pet does `then`, or
    // picks what to do next
    pet.run = (ms, step, then = pet.next) => {
        clearTimeout(pet.timer);
        const started = Date.now();
        const tick = () => {
            if (el.hidden) return;
            const next = step(Date.now() - started);
            if (next === false || Date.now() - started >= ms) return then();
            pet.timer = setTimeout(tick, next);
        };
        tick();
    };
    // Walk (or run, with a longer `stride` and shorter `ms`) to `to`, then
    // do `then`, or sit down if there's no `then`
    pet.walk = (to, { then, ms = stepMs, stride = 3 } = {}) => {
        pet.resting = false;
        to = Math.max(0, Math.min(to, pet.maxX()));
        if (Math.abs(to - pet.x) < scale * 4) {
            if (!then) return pet.start();
            pet.x = to;   // close enough: step onto the spot so `then` finds it there
            pet.place();
            return then();
        }
        const dir = Math.sign(to - pet.x);
        el.classList.toggle('left', dir < 0);
        let leg = false;
        pet.run(60000, () => {
            leg = !leg;
            pet.draw(leg ? 'walk1' : 'walk2');
            pet.x += dir * scale * stride;
            pet.place();
            return (to - pet.x) * dir > 0 ? ms : false;   // false: arrived
        }, then);
    };
    // Where to go to sit or sleep: null if right here is fine, or the
    // nearest spot clear of the other pets resting. Null as well if there's
    // no room anywhere: a narrow window, rest where it is.
    pet.freeSpot = () => {
        const gap = scale * 3;
        const taken = Object.values(pets).filter(p => p !== pet && p.resting && !p.el.hidden)
            .map(p => [p.x - gap, p.x + p.width + gap]);
        const blocked = x => taken.some(([l, r]) => x < r && x + pet.width > l);
        if (!blocked(pet.x)) return null;
        // On the whole pet pixels place() snaps to, rounded away from what's there
        return taken.flatMap(([l, r]) => [Math.floor((l - pet.width) / scale) * scale, Math.ceil(r / scale) * scale])
            .filter(x => x >= 0 && x <= pet.maxX() && !blocked(x))
            .sort((a, b) => Math.abs(a - pet.x) - Math.abs(b - pet.x))[0] ?? null;
    };
    // Sit or lie down here, or on a free spot first, then do `then`
    pet.settle = (then, tries = 3) => {
        const spot = pet.freeSpot();
        if (spot !== null && tries) {
            if (!petCalm()) return pet.walk(spot, { then: () => pet.settle(then, tries - 1) });
            pet.x = spot;
            pet.place();
        }
        pet.resting = true;
        then();
    };
    addEventListener('resize', pet.place);
    pets[name] = pet;
    return pet;
}

function setPet(name, on) {
    const pet = pets[name];
    pet.el.hidden = !on;
    pet.resting = false;
    store.set(name, on ? '1' : '0');
    $('widgetMenu').querySelector(`[data-pet="${name}"]`).checked = on;
    clearTimeout(pet.timer);
    if (!on) return;
    pet.place();
    pet.start();
}
