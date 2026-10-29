// Widgets: small draggable panels, all off by default. Which ones are on,
// where they sit and what they hold is remembered in localStorage.
const WIDGETS = ['clock', 'alarm', 'shift', 'note', 'sky', 'doom'];
let widgets = {};
try { widgets = JSON.parse(store.get('widgets')) || {}; } catch {}
for (const name of WIDGETS) widgets[name] = { on: false, ...widgets[name] };
delete widgets.timer;   // removed widget
const saveWidgets = () => store.set('widgets', JSON.stringify(widgets));
const widgetEl = name => $(`w-${name}`);
const DEFAULT_Y = { clock: 16, alarm: 112, shift: 330, note: 430, sky: 590, doom: 16 };
let topZ = 10;

function translateWidgets() {
    const t = translations[lang];
    document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t[el.dataset.t]; });
    document.querySelectorAll('.widget .close').forEach(el => { el.title = t.close; });
    $('widgetsBtn').title = t.widgets;
    $('noteText').placeholder = t.notePlaceholder;
    $('doomFull').title = t.fullscreen;
    updateShort2();
}

// Position a widget, keeping it fully inside the window
function placeWidget(name, x, y) {
    const el = widgetEl(name);
    el.style.left = Math.max(0, Math.min(x, innerWidth - el.offsetWidth)) + 'px';
    el.style.top = Math.max(0, Math.min(y, innerHeight - el.offsetHeight)) + 'px';
}

function setWidget(name, on) {
    const w = widgets[name];
    const el = widgetEl(name);
    w.on = on;
    el.hidden = !on;
    $('widgetMenu').querySelector(`[data-widget="${name}"]`).checked = on;
    if (on) {
        el.style.zIndex = ++topZ;
        tick();
        // Default spot: stacked down the left edge
        placeWidget(name, w.x ?? 16, w.y ?? DEFAULT_Y[name]);
    } else {
        stopRinging(el);
        if (name === 'doom') stopDoom();
    }
    saveWidgets();
}

for (const name of WIDGETS) {
    const el = widgetEl(name);
    el.addEventListener('pointerdown', e => {
        el.style.zIndex = ++topZ;
        if (e.button !== 0 || e.target.closest('input, textarea, select, button, label') || el.classList.contains('big')) return;
        const dx = e.clientX - el.offsetLeft;
        const dy = e.clientY - el.offsetTop;
        const move = e => placeWidget(name, e.clientX - dx, e.clientY - dy);
        el.setPointerCapture(e.pointerId);
        el.classList.add('dragging');
        el.addEventListener('pointermove', move);
        el.addEventListener('lostpointercapture', () => {
            el.removeEventListener('pointermove', move);
            el.classList.remove('dragging');
            widgets[name].x = el.offsetLeft;
            widgets[name].y = el.offsetTop;
            saveWidgets();
        }, { once: true });
    });
    el.querySelector('.close').addEventListener('click', () => setWidget(name, false));
    el.querySelector('.stop')?.addEventListener('click', () => stopRinging(el));
}

// Pull widgets back on screen when the window shrinks, without
// forgetting where they were
addEventListener('resize', () => {
    for (const name of WIDGETS) {
        if (widgets[name].on) placeWidget(name, widgets[name].x ?? 16, widgets[name].y ?? DEFAULT_Y[name]);
    }
});

$('widgetMenu').addEventListener('change', e => {
    if (e.target.dataset.pet) setPet(e.target.dataset.pet, e.target.checked);
    else setWidget(e.target.dataset.widget, e.target.checked);
});

// Sticky note
const note = $('noteText');
note.value = widgets.note.text || '';
if (widgets.note.w) {
    note.style.width = widgets.note.w + 'px';
    note.style.height = widgets.note.h + 'px';
}
note.addEventListener('input', () => {
    widgets.note.text = note.value;
    saveWidgets();
});
new ResizeObserver(() => {
    if (!note.offsetWidth) return;   // hidden
    widgets.note.w = note.offsetWidth;
    widgets.note.h = note.offsetHeight;
    saveWidgets();
}).observe(note);
