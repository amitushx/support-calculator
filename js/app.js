// The calculators and the page around them: settings, history, copy,
// theme, menus, help, What's new, settings backup and keyboard shortcuts.

const $ = id => document.getElementById(id);

// localStorage may be unavailable (private mode, blocked storage)
const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
};
// Saved settings from before versioning mean a returning user, who should
// still hear about 1.0.0; read now, before startup saves anything
const versionSeen = store.get('version') ??
    ((() => { try { return localStorage.length > 0; } catch { return false; } })() ? '0.4.0' : VERSION);

let lang = translations[store.get('lang')] ? store.get('lang') : 'he';
let calc = store.get('calc') === 'delay' ? 'delay' : 'distance';   // which calculator is shown
let orderType = store.get('orderType') === 'retail' ? 'retail' : 'restaurant';
let current = null;      // amount currently shown, or null if none
let captionTimer = null;

function applyLanguage() {
    const t = translations[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
    document.title = t.title;
    $('lang').value = lang;
    $('lang').title = t.language;
    $('lang').setAttribute('aria-label', t.language);
    $('metersLabel').textContent = t.meters;
    $('bonusLabel').textContent = t.bonus;
    $('walkerLabel').textContent = t.walker;
    $('creditText').innerHTML = t.credit.replace('{heart}', icon('heart'));
    $('versionBtn').textContent = `v${VERSION}`;
    $('versionBtn').title = t.changelog;
    $('paletteBtn').title = t.palette;
    $('bonusPasteBtn').title = t.pasteList;
    $('helpBtn').title = t.help;
    $('helpBtn').setAttribute('aria-label', t.help);
    $('helpTitle').textContent = t.helpTitle;
    $('helpClose').title = t.close;
    $('updateText').textContent = t.newVersion;
    $('updateBtn').textContent = t.refresh;
    $('newsClose').title = t.close;
    $('changelogText').textContent = t.changelog;
    if ($('news').open) renderNews();
    document.querySelectorAll('.help-body').forEach(el => { el.hidden = el.lang !== lang; });
    translateWidgets();
    renderHistory();
    updateThemeButton();
    fillCitySelect();
    render();
}

// Mode (light/dark): follows the system until the user picks one with the
// header button. The palette menu picks which light/dark pair is used.
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => document.documentElement.dataset.mode === 'dark';
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
// The button shows the mode it switches to
function updateThemeButton() {
    $('theme').innerHTML = icon(isDark() ? 'sun' : 'moon');
    $('theme').title = translations[lang][isDark() ? 'lightMode' : 'darkMode'];
}

// Changes that resize the card: it glides to its new height on the spring
// instead of jumping. enter fades in as the card opens; leave, hidden by
// the change, stays in view while the card closes over it.
let endMorph = null;
function morph(change, { enter, leave } = {}) {
    const card = document.querySelector('main');
    const from = card.getBoundingClientRect().height;   // mid-glide, where it got to
    endMorph?.();
    change();
    if (!motion()) return;
    const to = card.getBoundingClientRect().height;
    if (Math.abs(to - from) < 1) return;
    // The card clips its contents while it glides, menus included
    closeMenus();
    closeDropdowns();
    document.querySelectorAll('.menu').forEach(m => m.exiting?.finish());
    const leaving = leave?.hidden ? leave : null;
    if (leaving) leaving.hidden = false;
    const fade = leaving?.animate({ opacity: [1, 0] }, { duration: 250, easing: 'ease-out', fill: 'forwards' });
    card.style.overflow = 'clip';
    const resize = glide(card, { height: [`${from}px`, `${to}px`] });
    // Runs on finish, or right away when another change interrupts
    endMorph = () => {
        endMorph = null;
        resize.onfinish = null;
        resize.cancel();
        fade?.cancel();
        if (leaving) leaving.hidden = true;
        card.style.overflow = '';
    };
    resize.onfinish = endMorph;
    if (enter) glide(enter, {
        opacity: [0, 1], filter: ['blur(6px)', 'blur(0)'], transform: ['translateY(10px) scaleY(.96)', 'none']
    }, { duration: 420, easing: 'cubic-bezier(.2, .8, .2, 1)' });
}

// Recalculate and show the amount for the current calculator's inputs
function render() {
    clearTimeout(captionTimer);
    const before = $('amount').innerHTML;
    $('amount').classList.remove('words');
    if (calc === 'delay') renderDelay();
    else renderDistance();
    // A new amount settles in like a drop
    if ($('amount').innerHTML !== before) glide($('amount'), {
        transform: ['translateY(8px) scale(.94, 1.06)', 'none'], filter: ['blur(3px)', 'blur(0)'], opacity: [.4, 1]
    });
    $('result').disabled = current === null && !$('amount').classList.contains('words');
    // A result left unchanged for a moment goes into the history
    clearTimeout(historyTimer);
    if (!$('result').disabled) historyTimer = setTimeout(addHistory, 3000);
}

// Recent calculations, newest first: the inputs (shown in the current
// language) and the amount, or 'deliveryFee'. Each calculator has its own
// list; 10 of each are kept, 5 shown unless expanded.
const HISTORY_MAX = 10, HISTORY_SHORT = 5;
let calcHistory = [];
try { calcHistory = JSON.parse(store.get('history')) || []; } catch {}
let historyAll = store.get('historyAll') === '1';
let historyOpen = store.get('historyOpen') === '1';   // closed until the header button opens it
let historyTimer = null;

function historyEntry() {
    const amount = $('amount').classList.contains('words') ? 'deliveryFee' : current;
    if (amount === null) return null;
    if (calc === 'delay') {
        const retail = orderType === 'retail';
        const minutes = Number($('minutes').value);
        return { calc, minutes, retail, woltPlus: $('woltPlus').checked,
            price: needsPrice(minutes, retail) ? Number($('price').value) : null, amount };
    }
    return { calc, meters: Number($('distance').value), walker: $('walker').checked,
        bonus: Math.max(Number($('bonus').value) || 0, 0), amount };
}
const shownHistory = () => calcHistory.filter(e => e.calc === calc);
function saveHistory() {
    store.set('history', JSON.stringify(calcHistory));
    renderHistory();
}
function addHistory() {
    clearTimeout(historyTimer);
    const entry = historyEntry();
    if (!entry) return;
    const last = shownHistory()[0];
    if (last && JSON.stringify({ ...last, at: 0 }) === JSON.stringify({ ...entry, at: 0 })) return;
    calcHistory.unshift({ ...entry, at: Date.now() });
    const extra = shownHistory()[HISTORY_MAX];
    if (extra) calcHistory = calcHistory.filter(e => e.calc !== calc || e.at > extra.at);
    morph(saveHistory);
    if (historyOpen) dripIn([$('historyList').firstElementChild], 0);
}
function historyDetail(e, t) {
    const parts = e.calc === 'delay'
        ? [`${e.minutes} ${t.minShort}`, t[e.retail ? 'retail' : 'restaurant'],
            e.price !== null && `₪${e.price}`, e.woltPlus && t.woltPlus]
        : [`${e.meters} ${t.meters}`, e.bonus > 0 && `+${e.bonus}%`, e.walker && t.walker];
    return parts.filter(Boolean).join(' · ');
}
function renderHistory() {
    const t = translations[lang];
    $('history').hidden = !historyOpen;
    $('historyBtn').setAttribute('aria-expanded', String(historyOpen));
    $('historyBtn').title = t.history;
    const entries = shownHistory();
    $('historyEmpty').hidden = entries.length > 0;
    $('historyClear').hidden = !entries.length;
    $('historyMore').hidden = entries.length <= HISTORY_SHORT;
    $('historyMore').textContent = historyAll ? t.showLess : t.showMore;
    $('historyClear').title = t.clearHistory;
    const today = new Date().toDateString();
    $('historyList').replaceChildren(...entries.slice(0, historyAll ? HISTORY_MAX : HISTORY_SHORT).map(e => {
        const at = new Date(e.at);
        const time = at.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
        const when = at.toDateString() === today ? time
            : `${at.toLocaleDateString(t.locale, { day: 'numeric', month: 'numeric' })} ${time}`;
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.disabled = e.amount === 'deliveryFee';
        b.innerHTML = '<time dir="ltr"></time><span class="detail"></span><span class="sum" dir="ltr"></span>';
        b.querySelector('time').textContent = when;
        b.querySelector('.detail').textContent = historyDetail(e, t);
        const sum = b.querySelector('.sum');
        sum.textContent = e.amount === 'deliveryFee' ? t.deliveryFee : `₪${e.amount}`;
        b.addEventListener('click', () => {
            copyText(String(e.amount)).then(() => { sum.textContent = t.copied; }, () => { sum.textContent = t.copyFailed; })
                .finally(() => setTimeout(() => { sum.textContent = `₪${e.amount}`; }, 1500));
            firstField().focus();
        });
        li.append(b);
        return li;
    }));
}
// The history's heading and rows, to drip in as it opens
const historyRows = () => $('history').querySelectorAll('.history-head, #historyList li, #historyEmpty:not([hidden])');
function toggleHistory() {
    historyOpen = !historyOpen;
    store.set('historyOpen', historyOpen ? '1' : '0');
    morph(renderHistory, { leave: $('history') });
    if (historyOpen) dripIn(historyRows());
}
$('historyBtn').addEventListener('click', toggleHistory);
$('historyMore').addEventListener('click', () => {
    historyAll = !historyAll;
    store.set('historyAll', historyAll ? '1' : '0');
    morph(renderHistory);
    if (historyAll) dripIn([...$('historyList').children].slice(HISTORY_SHORT), 0);
});
// Clears only the calculator that is shown
$('historyClear').addEventListener('click', () => {
    calcHistory = calcHistory.filter(e => e.calc !== calc);
    morph(saveHistory);
    firstField().focus();
});

function renderDistance() {
    const t = translations[lang];
    const raw = $('distance').value;
    const meters = Number(raw);
    const bonus = Math.max(Number($('bonus').value) || 0, 0);

    if (raw === '' || !(meters >= 101)) {
        current = null;
        $('amount').textContent = '—';
        $('caption').textContent = raw === '' ? ' ' : t.tooShort;
    } else {
        current = payment(meters, bonus, $('walker').checked);
        $('amount').innerHTML = `<small>₪</small>${current}`;
        $('caption').innerHTML = t.hint;
    }
}

// Delivery Late: the maximum compensation for the customer
function renderDelay() {
    const t = translations[lang];
    const retail = orderType === 'retail';
    const minutesRaw = $('minutes').value;
    const priceRaw = $('price').value;
    const minutes = Number(minutesRaw);
    const price = Number(priceRaw);
    const priceNeeded = minutesRaw !== '' && minutes >= 0 && needsPrice(minutes, retail);
    $('priceField').classList.toggle('unused', retail);

    current = null;
    if (minutesRaw === '' || !(minutes >= 0)) {
        $('amount').textContent = '—';
        $('caption').textContent = ' ';
    } else if (priceNeeded && (priceRaw === '' || !(price >= 0))) {
        $('amount').textContent = '—';
        $('caption').textContent = t.needPrice;
    } else {
        const value = delayCompensation(minutes, price, retail, $('woltPlus').checked);
        if (value === 'deliveryFee') {
            $('amount').textContent = t.deliveryFee;
            $('amount').classList.add('words');
            $('caption').textContent = ' ';
        } else {
            current = value;
            $('amount').innerHTML = `<small>₪</small>${current}`;
            $('caption').innerHTML = t.hint;
        }
    }
}

// Switch between the distance and Delivery Late calculators
function setCalc(name, focus = true) {
    calc = name;
    store.set('calc', calc);
    morph(() => {
        $('distanceCalc').hidden = calc !== 'distance';
        $('delayCalc').hidden = calc !== 'delay';
        $('calcTabs').querySelectorAll('[data-calc]').forEach(b => {
            b.setAttribute('aria-selected', String(b.dataset.calc === calc));
        });
        render();
        renderHistory();
    }, { enter: $(calc === 'delay' ? 'delayCalc' : 'distanceCalc') });
    if (historyOpen) dripIn($('historyList').children, 80);
    if (focus) firstField().focus();
}
const firstField = () => $(calc === 'delay' ? 'minutes' : 'distance');

function setOrderType(type) {
    orderType = type;
    store.set('orderType', orderType);
    $('orderType').querySelectorAll('[data-order]').forEach(b => {
        b.setAttribute('aria-selected', String(b.dataset.order === orderType));
    });
    render();
}

// Fallback for browsers without the async clipboard API
function legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok ? Promise.resolve() : Promise.reject();
}

function copyText(text) {
    return navigator.clipboard
        ? navigator.clipboard.writeText(text).catch(() => legacyCopy(text))
        : legacyCopy(text);
}

// A ripple spreads over the result from (x, y), or from its middle
function splash(x, y) {
    const box = $('result').getBoundingClientRect();
    const dot = document.createElement('span');
    dot.className = 'ripple';
    dot.style.left = `${(x ?? box.left + box.width / 2) - box.left}px`;
    dot.style.top = `${(y ?? box.top + box.height / 2) - box.top}px`;
    const spread = glide(dot, { transform: ['scale(0)', `scale(${box.width / 8})`], opacity: [.3, 0] },
        { duration: 700, easing: 'cubic-bezier(.2, .7, .3, 1)' });
    if (!spread) return;
    $('result').append(dot);
    spread.onfinish = () => dot.remove();
}

// Copy the numeric amount only (no ₪ sign); point is where it was clicked
function copyAmount(point = []) {
    if (current === null) return;
    const t = translations[lang];
    splash(...point);
    addHistory();
    copyText(String(current)).then(
        () => { $('caption').textContent = t.copied; },
        () => { $('caption').textContent = t.copyFailed; }
    ).finally(() => {
        clearTimeout(captionTimer);
        captionTimer = setTimeout(render, 1500);
    });
}

$('distance').addEventListener('input', render);
$('bonus').addEventListener('input', () => {
    store.set('bonus', $('bonus').value);
    // Typing a bonus overrides the city's bonus list
    if (bonusCity) setBonusCity(null);
    render();
});
$('walker').addEventListener('change', render);
$('minutes').addEventListener('input', render);
$('price').addEventListener('input', render);
$('woltPlus').addEventListener('change', render);
$('calcTabs').addEventListener('click', e => {
    const button = e.target.closest('[data-calc]');
    if (button) setCalc(button.dataset.calc);
});
$('orderType').addEventListener('click', e => {
    const button = e.target.closest('[data-order]');
    if (button) setOrderType(button.dataset.order);
});
$('result').addEventListener('click', e => {
    copyAmount(e.detail ? [e.clientX, e.clientY] : []);   // detail 0: pressed from the keyboard
    firstField().focus();
});
$('theme').addEventListener('click', () => floodTheme(() => {
    const mode = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.mode = mode;
    store.set('theme', mode);
    updateThemeButton();
}, ...centerOf($('theme'))));
darkQuery.addEventListener('change', () => {
    const saved = store.get('theme');
    if (saved === 'light' || saved === 'dark') return;
    document.documentElement.dataset.mode = darkQuery.matches ? 'dark' : 'light';
    updateThemeButton();
});

function setPalette(name) {
    if (name === 'classic') delete document.documentElement.dataset.palette;
    else document.documentElement.dataset.palette = name;
    store.set('palette', name);
    updatePaletteMenu();
}
function updatePaletteMenu() {
    const current = document.documentElement.dataset.palette || 'classic';
    $('paletteMenu').querySelectorAll('button').forEach(b => {
        b.setAttribute('aria-checked', String(b.dataset.palette === current));
    });
}
$('paletteMenu').addEventListener('click', e => {
    const button = e.target.closest('[data-palette]');
    if (button && button.getAttribute('aria-checked') !== 'true') {
        floodTheme(() => setPalette(button.dataset.palette), ...centerOf(button.querySelector('.swatch')));
    }
});
updatePaletteMenu();

// Header menus: one open at a time, closed by clicking elsewhere or
// Escape. They bloom out of their corner and fold back into it.
const MENUS = { widgetsBtn: 'widgetMenu', paletteBtn: 'paletteMenu' };
function showMenu(button, open) {
    const menu = $(MENUS[button]);
    $(button).setAttribute('aria-expanded', String(open));
    reveal(menu, open,
        { opacity: [0, 1], transform: ['scale(.5, .3)', 'none'] },
        { opacity: [1, 0], transform: ['none', 'scale(.75, .5)'] });
    if (open) dripIn(menu.children, 30);
}
function closeMenus(except) {
    for (const button of Object.keys(MENUS)) if (button !== except) showMenu(button, false);
}
for (const [button, menu] of Object.entries(MENUS)) {
    $(button).addEventListener('click', () => {
        closeMenus(button);
        showMenu(button, $(menu).hidden || !!$(menu).exiting);
    });
}
document.addEventListener('pointerdown', e => {
    if (!e.target.closest('.menu, #widgetsBtn, #paletteBtn')) closeMenus();
});
// Each language listed in its own name
for (const [code, t] of Object.entries(translations)) {
    $('lang').add(Object.assign(new Option(t.name, code), { lang: code }));
}
dropdown($('lang'), { small: true, end: true });
$('lang').addEventListener('change', () => {
    lang = $('lang').value;
    store.set('lang', lang);
    applyLanguage();
});

// Help dialog; closes with ×, Escape or a click outside it
$('helpBtn').addEventListener('click', () => {
    closeMenus();
    $('help').showModal();
});
$('helpClose').addEventListener('click', () => closeDialog($('help')));
$('help').addEventListener('click', e => { if (e.target === $('help')) closeDialog($('help')); });
$('help').addEventListener('close', () => firstField().focus());

// What's new: after an update, the latest release; the change log button
// (or the version in the footer) shows all of them
const isNewer = (a, b) => {
    const [x, y] = [a, b].map(v => v.split('.').map(Number));
    const i = x.findIndex((n, i) => n !== y[i]);
    return i >= 0 && x[i] > y[i];
};
// The releases users hear about: internal ones have no notes
const notedReleases = CHANGELOG.filter(r => r.notes);
let newsAll = false;
function renderNews() {
    const t = translations[lang];
    // What's new lists every release since the version last seen, so
    // several releases shipped between visits are all shown
    const unseen = notedReleases.filter(r => isNewer(r.version, versionSeen));
    const releases = newsAll ? notedReleases : unseen.length ? unseen : notedReleases.slice(0, 1);
    $('newsTitle').textContent = newsAll ? t.changelog : t.whatsNew;
    $('changelogBtn').hidden = newsAll;
    $('newsBody').replaceChildren(...releases.map(r => {
        const el = document.createElement('section');
        el.className = 'release';
        const date = new Date(r.date + 'T12:00').toLocaleDateString(t.locale,
            { day: 'numeric', month: 'long', year: 'numeric' });
        el.innerHTML = `<h3><span>${t.version} <bdi>${r.version}</bdi></span><time datetime="${r.date}"></time></h3><ul></ul>`;
        el.querySelector('time').textContent = date;
        el.querySelector('ul').append(...(r.notes[lang] || r.notes.en).map(note =>
            Object.assign(document.createElement('li'), { textContent: note })));
        return el;
    }));
}
function openNews(all) {
    closeMenus();
    newsAll = all;
    renderNews();
    keepDialog($('news'));
    if (!$('news').open) $('news').showModal();
    $('news').scrollTop = 0;
}
$('versionBtn').addEventListener('click', () => openNews(true));
$('changelogBtn').addEventListener('click', () => openNews(true));
$('newsClose').addEventListener('click', () => closeDialog($('news')));
$('news').addEventListener('click', e => { if (e.target === $('news')) closeDialog($('news')); });
$('news').addEventListener('close', () => firstField().focus());

// Settings backup: the saved settings as a JSON file, to carry to another
// computer. The calculation history and the day's bonus list stay behind.
const SETTINGS_KEYS = ['lang', 'theme', 'palette', 'calc', 'orderType', 'bonus', 'bonusCity',
    'widgets', 'cat', 'dog', 'historyAll', 'historyOpen'];
const BACKUP_APP = 'support-calculator';
$('exportBtn').addEventListener('click', () => {
    const settings = {};
    for (const key of SETTINGS_KEYS) {
        const value = store.get(key);
        if (value !== null) settings[key] = value;
    }
    const file = new Blob([JSON.stringify({ app: BACKUP_APP, version: VERSION, settings }, null, 2)],
        { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = `support-calculator-settings-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);   // once the download has its copy
});
$('importBtn').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async () => {
    const file = $('importFile').files[0];
    $('importFile').value = '';   // the same file can be picked again
    if (!file) return;
    try {
        const backup = JSON.parse(await file.text());
        if (backup?.app !== BACKUP_APP || typeof backup.settings !== 'object') throw new Error();
        // Only known keys, and only text, as they were saved
        for (const key of SETTINGS_KEYS) {
            const value = backup.settings[key];
            if (typeof value === 'string') store.set(key, value);
        }
        location.reload();
    } catch {
        $('backupMsg').textContent = translations[lang].importFailed;
        setTimeout(() => { $('backupMsg').textContent = ''; }, 4000);
    }
});

document.addEventListener('keydown', e => {
    // Dialogs handle their own keys (Escape closes them)
    if (e.target.closest('dialog')) return;
    if (e.key === 'Escape') {
        // Escape first stops an alarm or closes a menu; otherwise it clears
        const busy = document.querySelector('.widget.ringing, .menu:not([hidden])');
        if (document.querySelector('.widget.ringing')) dismissAlarm();
        closeMenus();
        if (busy) return;
    }
    // Let widgets (e.g. the note) take typing without triggering shortcuts
    if (e.target.closest('.widget, .menu, #alarmOverlay, .dd')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') {
        e.preventDefault();
        copyAmount();
    } else if (e.key === 'Escape') {
        if (calc === 'delay') {
            $('minutes').value = $('price').value = '';
            $('woltPlus').checked = false;
        } else {
            $('distance').value = '';
            $('walker').checked = false;
            $('bonus').value = '';
            store.set('bonus', '');
            if (bonusCity) setBonusCity(null);   // back to the manual bonus
        }
        render();
        firstField().focus();
    } else if (e.code === 'KeyH') {
        e.preventDefault();
        toggleHistory();
    } else if (e.code === 'KeyL') {   // physical key, works on Hebrew layout too
        e.preventDefault();
        setCalc(calc === 'delay' ? 'distance' : 'delay');
    } else if (e.code === 'KeyW') {
        e.preventDefault();
        const box = $(calc === 'delay' ? 'woltPlus' : 'walker');
        box.checked = !box.checked;
        stretchKnob(box);
        render();
    } else if (calc === 'delay') {
        const field = { KeyM: 'minutes', KeyP: 'price' }[e.code];
        if (field) {
            e.preventDefault();
            $(field).focus();
            $(field).select();
        } else if (e.code === 'KeyT') {
            e.preventDefault();
            setOrderType(orderType === 'retail' ? 'restaurant' : 'retail');
        }
    } else if (e.code === 'KeyB') {
        e.preventDefault();
        $('bonus').focus();
        $('bonus').select();
    } else if (e.code === 'KeyD') {
        e.preventDefault();
        $('distance').focus();
        $('distance').select();
    }
});
