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
const cat = makePet('cat', { sprites: CAT_SPRITES, colors: CAT_COLORS, w: 22, h: 17 });

cat.next = () => {
    const r = Math.random();
    if (petAlone() || r < .12) catSleep();
    else if (petCalm() || r < .45) catSit();
    else if (r < .6) catGroom();
    else if (r < .72 && petInput.mouseX !== null) cat.walk(petInput.mouseX - cat.width / 2);
    else cat.walk(petRand(0, cat.maxX()));
};
function catSit(ms = petRand(4000, 10000)) {
    cat.settle(() => cat.run(ms, () => {
        const r = Math.random();
        cat.draw(r < .1 ? 'blink' : r < .25 ? 'flick' : 'sit');
        return r < .25 ? 180 : 700;
    }));
}
cat.start = catSit;
function catGroom() {
    let paw = false;
    cat.settle(() => cat.run(petRand(2500, 4500), () => {
        paw = !paw;
        cat.draw(paw ? 'groom' : 'blink');
        return 350;
    }));
}
// Sleeps for a while, and on and on while nobody's around; never on top
// of another pet, it moves aside first
function catSleep() {
    cat.settle(() => {
        cat.draw('sleep');
        cat.run(petRand(30000, 90000), elapsed => {
            if (elapsed > 1500) cat.fx('z');
            return petAlone() ? 3000 : elapsed > 25000 ? false : 3000;
        });
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
cat.el.addEventListener('click', () => {
    petInput.last = Date.now();
    catMeow();
    cat.fx('<svg class="icon"><use href="#i-heart"/></svg>');
    cat.el.classList.remove('left');
    catSit(5000);
});

setPet('cat', store.get('cat') === '1');
