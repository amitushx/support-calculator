// Shift progress: a line from the start of the shift to its end, with
// the breaks on it, from the alarm times. A shift may run past midnight.
// The start is taken, not typed: the first time the calculator is opened
// or used after the last shift ended. Clicking the start time corrects it.
const shift = widgets.shift;
delete shift.start;   // from when the start was typed in
const SHIFT_BREAKS = [['long', 'alarmLong'], ['short', 'alarmShort'], ['short2', 'alarmShort2']];
const SHIFT_GRACE = 30 * 60000;          // still the old shift right after it ends
const SHIFT_LONGEST = 16 * 3600000;      // without an Ending, a start this old is stale

// The first time an "HH:MM" alarm comes after `from`
function alarmAfter(time, from) {
    const at = alarmDate(time, from);
    if (at <= from) at.setDate(at.getDate() + 1);
    return at;
}
// Start a new shift now if the last one is over
function claimShift() {
    const now = new Date();
    const started = shift.startedAt && new Date(shift.startedAt);
    const end = alarm.alarms.end?.time;
    const over = !started
        || (end ? now - alarmAfter(end, started) > SHIFT_GRACE : now - started > SHIFT_LONGEST);
    if (!over) return;
    shift.startedAt = now.getTime();
    saveWidgets();
    showShiftStart();
}
const pad2 = n => String(n).padStart(2, '0');
function showShiftStart() {
    const d = new Date(shift.startedAt);
    $('shiftStart').value = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
claimShift();
showShiftStart();
document.addEventListener('pointerdown', claimShift);
document.addEventListener('keydown', claimShift);
$('shiftStart').addEventListener('change', () => {
    if (!$('shiftStart').value) return showShiftStart();
    // The latest time it was that time: today, or yesterday if still to come
    const now = new Date();
    const at = alarmDate($('shiftStart').value, now);
    if (at > now) at.setDate(at.getDate() - 1);
    shift.startedAt = at.getTime();
    saveWidgets();
    tick();
});

// "3:12" from minutes
const hoursMinutes = min => `${Math.floor(min / 60)}:${String(Math.floor(min % 60)).padStart(2, '0')}`;
function setShiftInfo(text, time) {
    const [before, after] = text.split('{time}');
    $('shiftInfo').replaceChildren(before,
        ...(time === undefined ? [] : [Object.assign(document.createElement('bdi'), { textContent: time }), after]));
}

let shiftPoints = '';   // the points drawn, rebuilt only when they change
function updateShift(now) {
    const t = translations[lang];
    const end = alarm.alarms.end?.time;
    if (!end) {
        $('shiftFill').style.width = '0';
        $('shiftPoints').replaceChildren();
        shiftPoints = '';
        setShiftInfo(t.shiftHint);
        return;
    }
    // Times in minutes from the start
    const start = new Date(shift.startedAt);
    const from = time => (alarmAfter(time, start) - start) / 60000;
    const length = from(end);
    const elapsed = Math.max(0, (now - start) / 60000);
    const inShift = elapsed < length;
    const done = inShift ? elapsed / length : 1;
    $('shiftFill').style.width = `${done * 100}%`;

    const points = SHIFT_BREAKS
        .filter(([key]) => alarm.alarms[key]?.time && (key !== 'short2' || alarm.short2))
        .map(([key, label]) => ({ label, at: from(alarm.alarms[key].time) / length }))
        .filter(p => p.at > 0 && p.at < 1)
        .sort((a, b) => a.at - b.at);
    points.push({ label: 'alarmEnd', at: 1, end: true });
    const key = JSON.stringify([points, lang]);
    if (key !== shiftPoints) {
        shiftPoints = key;
        // A label too close to the one before it goes above the line
        let prev = null;
        $('shiftPoints').replaceChildren(...points.map((p, i) => {
            p.above = !!prev && !prev.above && p.at - prev.at < .22;
            prev = p;
            const el = document.createElement('div');
            el.className = 'shift-point' + (p.end ? ' end' : '') + (p.above ? ' above' : '');
            el.style.insetInlineStart = `${p.at * 100}%`;
            el.style.setProperty('--i', i);
            el.dataset.at = p.at;
            el.append(Object.assign(document.createElement('span'), { textContent: t[p.label] }));
            return el;
        }));
    }
    $('shiftPoints').querySelectorAll('.shift-point').forEach(el => {
        el.classList.toggle('passed', done >= Number(el.dataset.at));
    });

    if (inShift) setShiftInfo(`${Math.floor(done * 100)}% · ${t.timeLeft}`, hoursMinutes(length - elapsed));
    else setShiftInfo(t.shiftDone);
}

// The end of the shift: the widget celebrates (if it's on) and confetti
// rains over the whole screen
function celebrateShift() {
    if (!widgets.shift.on) return;
    const el = widgetEl('shift');
    el.classList.remove('celebrate');
    void el.offsetWidth;   // restart the animation
    el.classList.add('celebrate');
    clearTimeout(el.celebrateTimer);
    el.celebrateTimer = setTimeout(() => el.classList.remove('celebrate'), 4000);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) confetti();
}

// Paper confetti: a shower from the top across the whole width plus two
// cannons from the bottom corners, gone after about five seconds
function confetti() {
    $('confetti')?.remove();
    const canvas = Object.assign(document.createElement('canvas'), { id: 'confetti' });
    document.body.append(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = devicePixelRatio || 1;
    const w = innerWidth, h = innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const colors = [accent, '#ff5e7e', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff', '#ff9f43'];
    const rand = (a, b) => a + Math.random() * (b - a);
    const piece = (x, y, vx, vy) => ({
        x, y, vx, vy,
        size: rand(6, 11),
        color: colors[Math.floor(Math.random() * colors.length)],
        spin: rand(0, Math.PI * 2),
        spinSpeed: rand(-.25, .25),
        flip: rand(0, Math.PI * 2),
        flipSpeed: rand(.08, .2),
        round: Math.random() < .25
    });
    const pieces = [];
    for (let i = 0; i < 220; i++) pieces.push(piece(rand(0, w), rand(-h, 0), rand(-1, 1), rand(1, 4)));
    for (let i = 0; i < 90; i++) {
        pieces.push(piece(0, h, rand(4, 13), rand(-22, -12)));
        pieces.push(piece(w, h, -rand(4, 13), rand(-22, -12)));
    }
    const started = performance.now();
    const LIFE = 5000;
    (function frame(time) {
        const age = time - started;
        ctx.clearRect(0, 0, w, h);
        ctx.globalAlpha = Math.min(1, (LIFE - age) / 1000);
        for (const p of pieces) {
            p.vy = Math.min(p.vy + .3, 5);    // gravity, with air holding it back
            p.vx *= .98;
            p.x += p.vx + Math.sin(p.flip) * .6;
            p.y += p.vy;
            p.spin += p.spinSpeed;
            p.flip += p.flipSpeed;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.spin);
            ctx.scale(1, Math.cos(p.flip));   // paper turning over
            ctx.fillStyle = p.color;
            if (p.round) {
                ctx.beginPath();
                ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            }
            ctx.restore();
        }
        if (age < LIFE) requestAnimationFrame(frame);
        else canvas.remove();
    })(started);
}
