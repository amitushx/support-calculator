// The cat and the puppy playing together, now and then, while both are out
// and awake, and watching the courier go by. Playing: the puppy trots over and play-bows, the cat swats at it, then
// they chase each other along the floor, swap, and end nose to nose with a
// heart. Sometimes the cat isn't in the mood and walks off. A click on
// either pet, or turning one off, ends the game.
const PLAY_EVERY = 3 * 60000;   // at most one game this often
const PLAY_RUN = { ms: 60, stride: 4 };   // running, not walking
const play = { id: 0, on: false, last: Date.now() };

const playReady = () => !pets.cat.el.hidden && !pets.dog.el.hidden && !pets.cat.sleeping && !fishGame.on
    && !petCalm() && !petAlone() && Date.now() - play.last > PLAY_EVERY;
// Only the puppy starts a game
const dogNextAlone = dog.next;
dog.next = () => playReady() && Math.random() < .3 ? playStart() : dogNextAlone();

// Show `frames` in turn, `ms` each, until the game moves on
function playHold(pet, frames, ms) {
    let i = 0;
    pet.run(60000, () => {
        pet.draw(frames[i++ % frames.length]);
        return ms;
    });
}

function playStart() {
    const id = ++play.id;
    play.on = true;
    play.last = Date.now();
    // Steps only run while this game is still on
    const go = step => () => { if (play.on && play.id === id) step(); };
    // Run the parts at once, and `then` once all of them are done
    const both = (then, ...parts) => {
        let left = parts.length;
        parts.forEach(part => part(go(() => --left || then())));
    };
    const clampX = (pet, x) => Math.max(0, Math.min(x, pet.maxX()));
    const gap = 6;
    cat.resting = dog.resting = false;

    // The puppy comes up beside the cat, which waits for it
    let side = dog.x < cat.x ? -1 : 1;   // the side of the cat the puppy is on
    const beside = () => side < 0 ? cat.x - dog.width - gap : cat.x + cat.width + gap;
    if (beside() !== clampX(dog, beside())) side = -side;   // no room there
    playHold(cat, ['sit'], 700);
    dog.walk(beside(), { then: go(invite) });

    function invite() {
        dog.el.classList.toggle('left', side > 0);   // facing the cat
        cat.el.classList.toggle('left', side < 0);   // its swatting paw toward the puppy
        playHold(dog, ['bow1', 'bow2'], 180);
        cat.run(1400, () => 700, go(swat));
    }
    // The cat swats back, and plays along, or not
    function swat() {
        const keen = Math.random() < 2 / 3;
        let paw = false;
        cat.run(keen ? 1500 : 600, () => {
            paw = !paw;
            cat.draw(paw ? 'swat' : 'sit');
            return 250;
        }, go(keen ? chase : snub));
    }
    function snub() {
        playHold(dog, ['sit', 'pant'], 260);
        cat.walk(cat.x - side * petRand(150, 300), { then: go(end) });
    }
    // The cat dashes away with the puppy after it...
    const away = -side;
    function chase() {
        const catTo = clampX(cat, cat.x + away * petRand(200, 400));
        const dogTo = away > 0 ? catTo - dog.width - gap : catTo + cat.width + gap;
        both(swap,
            done => cat.walk(catTo, { ...PLAY_RUN, then: done }),
            done => dog.walk(dogTo, { ...PLAY_RUN, then: done }));
    }
    // ...then the puppy runs back the other way, with the cat after it
    function swap() {
        const dogTo = clampX(dog, dog.x - away * petRand(200, 400));
        const catTo = away > 0 ? dogTo + dog.width + gap : dogTo - cat.width - gap;
        both(boop,
            done => dog.walk(dogTo, { ...PLAY_RUN, then: done }),
            done => cat.walk(catTo, { ...PLAY_RUN, then: done }));
    }
    // The puppy turns around and the cat comes up to touch noses; their
    // canvases overlap by the blank column and outline beyond the noses
    function boop() {
        dog.el.classList.toggle('left', away < 0);
        playHold(dog, ['stand'], 1000);
        const touch = 9;
        cat.walk(away > 0 ? dog.x + dog.width - touch : dog.x - cat.width + touch, { then: go(heart) });
    }
    function heart() {
        cat.el.classList.toggle('left', away > 0);
        playHold(cat, ['stand'], 1000);
        const noses = dog.el.getBoundingClientRect();
        cat.fx('<svg class="icon"><use href="#i-heart"/></svg>', away > 0 ? noses.right - 6 : noses.left + 6);
        dog.run(1800, () => 600, go(end));
    }
    function end() {
        play.on = false;
        cat.next();
        dog.next();
    }
}

// A click on a pet ends the game: that pet does what a click does, the
// other goes back to its own things
function playStop(except) {
    if (!play.on) return;
    play.on = false;
    for (const pet of [cat, dog]) if (pet !== except && !pet.el.hidden) pet.next();
}
cat.el.addEventListener('click', () => playStop(cat));
dog.el.addEventListener('click', () => playStop(dog));
$('extrasMenu').addEventListener('change', e => { if (e.target.dataset.pet) playStop(); });

// The courier going by: the cat sits and follows him with its eyes, its
// tail flicking; the puppy wags as he comes, then runs after him once he's
// passed, falling slowly behind, and sits down panting at the edge of the
// window. Asleep, playing or at the goldfish bowl, they let him go.
const courierBox = () => road.hidden ? null : courier.getBoundingClientRect();
const facing = (pet, box) => pet.el.classList.toggle('left', box.left + box.width / 2 < pet.x + pet.width / 2);
function petsSeeCourier() {
    if (play.on || fishGame.on) return;
    if (!cat.el.hidden && !cat.sleeping) catWatch();
    if (!dog.el.hidden && !dog.sleeping) dogChase();
}
function catWatch() {
    cat.resting = true;
    cat.run(60000, () => {
        const box = courierBox();
        if (!box) return false;
        facing(cat, box);
        cat.draw(Math.random() < .3 ? 'flick' : 'watch');
        return 180;
    }, () => catSit(4000));
}
function dogChase() {
    let chasing = false, wag = false, step = 0;
    dog.resting = false;
    dog.run(60000, () => {
        const box = courierBox();
        if (!box) return false;
        if (!chasing) {
            facing(dog, box);
            wag = !wag;
            dog.draw(wag ? 'wag1' : 'wag2');
            chasing = box.left > dog.x + dog.width / 3;   // he's gone by: after him
            if (chasing) dog.fx('!');
            return 120;
        }
        dog.el.classList.remove('left');
        const behind = Math.min(box.left - dog.width - 6, dog.maxX());
        if (behind > dog.x) {
            dog.x += Math.min(6, behind - dog.x);   // 150px a second, a little slower than him
            dog.place();
        }
        dog.draw('walk' + Math.floor(step++ / 2) % PET_STRIDE);
        return dog.x >= dog.maxX() ? false : 40;
    }, () => dogSit(5000));
}
