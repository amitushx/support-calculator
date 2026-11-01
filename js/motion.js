// Liquid motion: panels glide on a spring, things pop in and out. The
// spring itself is --spring in app.css, so CSS transitions and these
// script animations move alike. Nothing moves before startup is done
// (restoring saved state shouldn't animate) or with reduced motion set.

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motionOn = false;
const motion = () => motionOn && !reducedMotion.matches;
const springEase = () => getComputedStyle(document.documentElement).getPropertyValue('--spring').trim() || 'ease-out';
const SPRING_MS = 520;

// The CSS transitions hang off the .motion class, set once the first
// frame is painted, so they don't fire while the page sets itself up
function startMotion() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
        motionOn = true;
        document.documentElement.classList.toggle('motion', !reducedMotion.matches);
    }));
}
reducedMotion.addEventListener('change', () => {
    document.documentElement.classList.toggle('motion', motionOn && !reducedMotion.matches);
});

// A one-shot animation on the spring; null when motion is off
function glide(el, frames, options = {}) {
    if (!motion()) return null;
    return el.animate(frames, { duration: SPRING_MS, easing: springEase(), ...options });
}

// Show an element with an entrance, or play its exit and then hide it.
// Showing it again mid-exit cuts the exit short.
function reveal(el, show, enter, exit, exitOptions = {}) {
    if (show) {
        if (!el.hidden && !el.exiting) return;
        el.exiting?.cancel();
        el.exiting = null;
        el.hidden = false;
        glide(el, enter);
        return;
    }
    if (el.hidden || el.exiting) return;
    const out = glide(el, exit, { duration: 180, easing: 'cubic-bezier(.5, 0, .9, .4)', fill: 'forwards', ...exitOptions });
    if (!out) {
        el.hidden = true;
        return;
    }
    el.exiting = out;
    out.onfinish = () => {
        el.exiting = null;
        el.hidden = true;
        out.cancel();   // drop the end frame, now that it's hidden
    };
}

// A dialog sinks out the way it rose in (dialog-in in dialogs.css), its
// backdrop fading with it, and only then closes. Escape goes through here
// too, instead of the browser's instant close.
function closeDialog(dialog) {
    if (!dialog.open || dialog.exiting) return;
    const options = { duration: 180, easing: 'cubic-bezier(.5, 0, .9, .4)', fill: 'forwards' };
    const out = glide(dialog, { opacity: [1, 0], scale: ['1', '.92 .88'], translate: ['0 0', '0 16px'] }, options);
    if (!out) return dialog.close();
    dialog.exiting = [out, glide(dialog, { opacity: [1, 0] }, { ...options, pseudoElement: '::backdrop' })];
    out.onfinish = () => {
        keepDialog(dialog);   // drop the end frames once it's closed
        dialog.close();
    };
}
// Opening it again mid-exit cuts the exit short
function keepDialog(dialog) {
    dialog.exiting?.forEach(a => a.cancel());
    dialog.exiting = null;
}
document.addEventListener('cancel', e => {
    if (e.target.matches('dialog')) {
        e.preventDefault();
        closeDialog(e.target);
    }
}, true);

// Rows drip in one after another
function dripIn(els, delay = 40) {
    [...els].forEach((el, i) => glide(el, {
        opacity: [0, 1], transform: ['translateY(-8px) scale(.94, .75)', 'none']
    }, { delay: delay + i * 40, fill: 'backwards' }));
}

// A switch flipped from code (a shortcut) stretches like a clicked one.
// The stretch starts from the knob's shape right now, which holding the
// mouse down may already have widened.
function stretchKnob(box) {
    const track = box.nextElementSibling;
    const knob = getComputedStyle(track, '::after');
    track.style.setProperty('--knob-w', knob.width);
    track.style.setProperty('--knob-m', knob.marginInlineStart);
    box.classList.remove('flipped', 'pressing', 'unpress');
    void box.offsetWidth;   // restart the animation
    box.classList.add('flipped');
}
document.addEventListener('change', e => {
    if (e.target.matches('.switch input')) stretchKnob(e.target);
});

// Holding the mouse down on a switch or on the other tab starts the move
// (.pressing); letting go finishes it. Let go elsewhere, there's no click
// and it springs back.
let pressed = null;
document.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !motion()) return;
    const box = e.target.closest('.switch')?.querySelector('input:not(:disabled)');
    pressed = box ?? e.target.closest('.tabs button:not([aria-selected="true"])')?.parentElement ?? null;
    pressed?.classList.remove('unpress', 'flipped');   // a stretch still running would override the press
    pressed?.classList.add('pressing');
});
const letGo = () => setTimeout(() => {   // after the click, if there is one
    if (!pressed?.classList.contains('pressing')) return;
    pressed.classList.remove('pressing');
    if (pressed.matches('input')) pressed.classList.add('unpress');
    pressed = null;
});
document.addEventListener('pointerup', letGo);
document.addEventListener('pointercancel', letGo);
// A tab's click lets go first, so the pill heads for the new tab from
// where the press took it rather than back to where it was
document.addEventListener('click', e => e.target.closest('.tabs')?.classList.remove('pressing'), true);

// Light or dark mode, or a palette: the new look floods out in a circle
// from (x, y), the button clicked. The circle eases in and keeps speeding
// up: one that slows down at the end has already covered most of the
// window and seems to stall on the far corner.
function floodTheme(change, x, y) {
    if (!motion() || !document.startViewTransition) return change();
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(change).ready.then(() => {
        document.documentElement.animate(
            { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
            { duration: 700, easing: 'cubic-bezier(.5, 0, .75, .45)', pseudoElement: '::view-transition-new(root)' });
    }, () => {});
}
const centerOf = el => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
};

// A dragged panel wobbles like jelly: it hangs from the pointer, swings
// and stretches with the drag speed, and settles on a damped spring when
// let go. Steps run at 60 a second, so faster screens wobble alike.
function jelly(el) {
    const s = { tilt: 0, vt: 0, sx: 1, vs: 0, lift: 1, vl: 0, speed: 0, x: 0, t: 0, held: false, raf: 0, last: 0 };
    const spring = (pos, vel, to) => { vel = (vel + (to - pos) * .12) * .72; return [pos + vel, vel]; };
    function frame(now) {
        const moving = s.held && now - s.t < 80;   // a held, still pointer hangs straight
        const tilt = moving ? Math.max(-8, Math.min(8, s.speed * 4)) : 0;
        const sx = moving ? 1 + Math.min(.05, Math.abs(s.speed) * .03) : 1;
        for (let n = Math.min(4, Math.max(1, Math.round((now - s.last) / (1000 / 60)))); n--;) {
            [s.tilt, s.vt] = spring(s.tilt, s.vt, tilt);
            [s.sx, s.vs] = spring(s.sx, s.vs, sx);
            [s.lift, s.vl] = spring(s.lift, s.vl, s.held ? 1.03 : 1);
        }
        s.last = now;
        const still = Math.abs(s.tilt) + Math.abs(s.vt) + Math.abs(s.sx - 1) + Math.abs(s.vs)
            + Math.abs(s.lift - 1) + Math.abs(s.vl) < .002;
        if (!s.held && still) {
            el.style.transform = el.style.transformOrigin = '';
            s.raf = 0;
            return;
        }
        el.style.transform = `rotate(${s.tilt.toFixed(2)}deg) scale(${(s.sx * s.lift).toFixed(4)}, ${((2 - s.sx) * s.lift).toFixed(4)})`;
        s.raf = requestAnimationFrame(frame);
    }
    return {
        // (ox, oy): where it was grabbed, inside the panel
        grab(ox, oy, x) {
            if (!motion()) return;
            if (!s.raf) {   // a new pivot only at rest, or it would jump
                el.style.transformOrigin = `${ox}px ${oy}px`;
                s.last = performance.now();
                s.raf = requestAnimationFrame(frame);
            }
            Object.assign(s, { held: true, x, t: performance.now(), speed: 0 });
        },
        move(x) {
            if (!s.held) return;
            const now = performance.now();
            s.speed = s.speed * .5 + (x - s.x) / Math.max(1, now - s.t) * .5;   // px/ms, smoothed
            s.x = x;
            s.t = now;
        },
        release() { s.held = false; }
    };
}
