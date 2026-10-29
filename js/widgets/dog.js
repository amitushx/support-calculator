// The puppy, a pet like the cat but livelier: it pants, wags, scratches an
// ear, runs zoomies, comes over to the mouse more often than the cat and
// naps when left alone. A click makes it bark.
const DOG_COLORS = {
    K: '#3a2820',   // outline, the same as the cat's
    F: '#f4d8a8',   // cream fur
    B: '#9a6438',   // ears, tail and patch
    b: '#6e4424',   // shading, closed eyes
    W: '#fffaf0',   // muzzle, chest and paws
    N: '#2a2028',   // nose
    E: '#283040',   // eyes
    P: '#f08c9c',   // tongue
    R: '#e04848',   // collar
    Y: '#f8d050'    // its tag
};
// Facing right; sitting faces the viewer, panting
const DOG_SIT = [
    '...FFFFFF.....',
    '..FFFFFFFF....',
    '.BBFFFFFFBB...',
    '.BBFEFFEFBB...',
    '.BBFFWWFFBB...',
    '.BBFWNNWFBB...',
    '..B.WPPW.B....',
    '...RRYRR......',
    '...FWWWFF.....',
    '..FFWWWFFF....',
    '..FFWWWFFFF.B.',
    '..FFWWWFFFFBB.',
    '..FbWWWbFFFB..',
    '..WW...WWFF...'
];
const DOG_HAPPY = withRows(DOG_SIT, { 3: '.BBFbFFbFBB...' });   // eyes squeezed shut
const DOG_SCRATCH = withRows(DOG_HAPPY, {   // a hind paw up at the ear
    6: '..B.WPPW.BF...', 7: '...RRYRR.F....', 8: '...FWWWFFF....',
    9: '..FFWWWFFF....', 13: '..WW...WW.....'
});
const DOG_SPRITES = {
    sit: DOG_SIT,
    pant: withRows(DOG_SIT, { 6: '..B.WWWW.B....' }),   // the tongue in
    blink: withRows(DOG_SIT, { 3: '.BBFbFFbFBB...' }),
    wag1: withRows(DOG_HAPPY, {   // the tail up
        9: '..FFWWWFFF..B.', 10: '..FFWWWFFFFB..', 11: '..FFWWWFFFF...', 12: '..FbWWWbFFF...'
    }),
    wag2: DOG_HAPPY,
    scratch1: withRows(DOG_SCRATCH, { 4: '.BBFFWWFFBBW..', 5: '.BBFWNNWFBBF..' }),
    scratch2: withRows(DOG_SCRATCH, { 5: '.BBFWNNWFBBW..' }),
    walk1: [
        '...........FFFFF...',
        '..B.......FFFFFFF..',
        '.B.......BBFFFEFFF.',
        '.B.......BBFFFFFFWN',
        '..B......BBFFFFWWW.',
        '..FFFBBBFFFRRYRR...',
        '..FFFBBBFFFFFWWF...',
        '..FFFFFFFFFFFWWF...',
        '...FFFFFFFFFFWW....',
        '...FF..FF...FF.FF..',
        '..FF...FF....FF.FF.',
        '..WW...WW....WW..WW'
    ],
    walk2: [
        '...........FFFFF...',
        '..........FFFFFFF..',
        '..B......BBFFFEFFF.',
        '.B.......BBFFFFFFWN',
        '.B.......BBFFFFWWW.',
        '..BFFBBBFFFRRYRR...',
        '..FFFBBBFFFFFWWF...',
        '..FFFFFFFFFFFWWF...',
        '...FFFFFFFFFFWW....',
        '...FFFF....FFFF....',
        '....FF.FF...FF.FF..',
        '....WW.WW...WW.WW..'
    ],
    sleep: [
        '............FFFF..',
        '...FFFBBBF.FFFFFF.',
        '..FFFFBBFFFBBFFFF.',
        '.FFFFFFFFFFBBFbFFF',
        '.FFFFFFFFFFBBFFFWN',
        '.BFFFFFFFFFBBFFWWW',
        '.BBFFFFFFFFFWWWW..',
        '..BBWWFFFWWWW.....'   // the head on its paws, the tail tucked in
    ]
};
const dog = makePet('dog', { sprites: DOG_SPRITES, colors: DOG_COLORS, w: 23, h: 17, stepMs: 120 });

dog.next = () => {
    const r = Math.random();
    if (petAlone() || r < .08) dogSleep();
    else if (petCalm() || r < .35) dogSit();
    else if (r < .45) dogScratch();
    else if (r < .55) dogWag();
    else if (r < .75 && petInput.mouseX !== null) dog.walk(petInput.mouseX - dog.width / 2);
    else if (r < .83) dogZoomies();
    else dog.walk(petRand(0, dog.maxX()));
};
function dogSit(ms = petRand(4000, 9000)) {
    let tongue = false;
    dog.settle(() => dog.run(ms, () => {
        tongue = !tongue;
        dog.draw(Math.random() < .08 ? 'blink' : tongue ? 'sit' : 'pant');
        return 260;
    }));
}
dog.start = dogSit;
function dogWag(ms = petRand(2500, 4500)) {
    let up = false;
    dog.settle(() => dog.run(ms, () => {
        up = !up;
        dog.draw(up ? 'wag1' : 'wag2');
        return 150;
    }));
}
function dogScratch() {
    let paw = false;
    dog.settle(() => dog.run(petRand(1500, 3000), () => {
        paw = !paw;
        dog.draw(paw ? 'scratch1' : 'scratch2');
        return 110;
    }));
}
// A dash to the far side of the window and back
function dogZoomies() {
    const there = dog.x < dog.maxX() / 2 ? dog.maxX() : 0;
    const back = petRand(0, dog.maxX());
    dog.walk(there, { ms: 60, stride: 4, then: () => dog.walk(back, { ms: 60, stride: 4 }) });
}
// Sleeps for a while, and on and on while nobody's around; never on top
// of another pet, it moves aside first
function dogSleep() {
    dog.settle(() => {
        dog.draw('sleep');
        dog.run(petRand(30000, 90000), elapsed => {
            if (elapsed > 1500) dog.fx('z');
            return petAlone() ? 3000 : elapsed > 25000 ? false : 3000;
        });
    });
}
// A woof or two a click, and none over them while it's still barking
let dogBarking = false;
function dogBark() {
    if (dogBarking) return;
    unlockAudio();
    if (!audio) return;
    dogBarking = true;
    const at = audio.currentTime + 0.02;
    let voice = bark(audio.destination, at, { pitch: 1 + Math.random() * 0.2 });
    if (Math.random() < .5) voice = bark(audio.destination, at + 0.28, { pitch: 1.05 + Math.random() * 0.2 });
    voice.onended = () => { dogBarking = false; };
}
dog.el.addEventListener('click', () => {
    petInput.last = Date.now();
    dogBark();
    dog.fx('<svg class="icon"><use href="#i-heart"/></svg>');
    dog.el.classList.remove('left');
    dogWag(5000);
});

setPet('dog', store.get('dog') === '1');
