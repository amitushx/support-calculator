// Dropdowns in the app's style instead of the browser's. Each one wraps a
// real <select>, hidden, that stays the source of truth: code reads and
// sets its value and options and listens for 'change' as before, and the
// button and list follow along. The list is a card like the header menus,
// with a highlight that glides between rows and a ✓ on the chosen one;
// arrow keys, Home/End, Enter, Esc and typing a name's start all work.

const NATIVE = Object.fromEntries(['value', 'selectedIndex'].map(prop =>
    [prop, Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop)]));

// small: plain text with a chevron (the language, the alarm sound) rather
// than the filled pill; end: the list lines up with the button's end
function dropdown(select, { small = false, end = false } = {}) {
    const dd = document.createElement('div');
    dd.className = 'dd' + (small ? ' small' : '') + (end ? ' end' : '');
    dd.innerHTML = '<button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false">'
        + '<span></span><svg class="icon" aria-hidden="true"><use href="#i-chevron-down"/></svg></button>'
        + '<div class="dd-list" role="listbox" tabindex="-1" hidden><div class="dd-hl"></div></div>';
    select.replaceWith(dd);
    dd.prepend(select);
    select.hidden = true;
    const button = dd.querySelector('.dd-btn');
    const label = button.querySelector('span');
    const list = dd.querySelector('.dd-list');
    const hl = dd.querySelector('.dd-hl');
    const rows = () => list.querySelectorAll('.dd-opt');
    let active = -1, typed = '', typedAt = 0;

    // The button shows the chosen option and carries the select's name
    function sync() {
        const option = select.selectedOptions[0];
        label.textContent = option?.text ?? '';
        if (option?.lang) label.lang = option.lang;
        else label.removeAttribute('lang');
        for (const attr of ['title', 'aria-label']) {
            if (select.hasAttribute(attr)) button.setAttribute(attr, select.getAttribute(attr));
        }
    }
    // Setting value or selectedIndex from code fires no event, so watch them
    for (const [prop, native] of Object.entries(NATIVE)) {
        Object.defineProperty(select, prop, {
            get: () => native.get.call(select),
            set: v => { native.set.call(select, v); sync(); }
        });
    }
    new MutationObserver(sync).observe(select,
        { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label'] });
    sync();

    function highlight(i, jump) {
        const row = rows()[i];
        if (!row) return;
        active = i;
        list.setAttribute('aria-activedescendant', row.id);
        if (jump) hl.style.transition = 'none';
        hl.style.translate = `0 ${row.offsetTop}px`;
        hl.style.height = `${row.offsetHeight}px`;
        hl.style.opacity = 1;
        if (jump) { void hl.offsetWidth; hl.style.transition = ''; }
        // Keep it in view inside a long, scrolling list
        const top = row.offsetTop - 5, bottom = row.offsetTop + row.offsetHeight + 5;
        if (top < list.scrollTop) list.scrollTop = top;
        else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
    }

    function open() {
        closeMenus();
        closeDropdowns(dd);
        rows().forEach(row => row.remove());
        [...select.options].forEach((option, i) => {
            const row = document.createElement('div');
            row.className = 'dd-opt' + (i === 0 && option.value === '' ? ' first' : '');
            row.id = `${select.id}-${i}`;
            if (option.lang) row.lang = option.lang;
            row.setAttribute('role', 'option');
            row.setAttribute('aria-selected', String(option.selected));
            row.innerHTML = '<span class="tick" aria-hidden="true">✓</span><span></span>';
            row.lastChild.textContent = option.text;
            row.addEventListener('pointermove', () => { if (active !== i) highlight(i); });
            row.addEventListener('click', () => pick(i));
            list.append(row);
        });
        dd.classList.add('open');
        button.setAttribute('aria-expanded', 'true');
        // Blooms out of the button's corner; the rows drip in after it
        reveal(list, true, { opacity: [0, 1], transform: ['scale(.6, .4)', 'none'] });
        dripIn(rows(), 30);
        list.scrollTop = 0;
        highlight(Math.max(0, select.selectedIndex), true);
        list.focus({ preventScroll: true });
    }
    function close(refocus) {
        if (!dd.classList.contains('open')) return;
        dd.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
        reveal(list, false, null, { opacity: [1, 0], transform: ['none', 'scale(.96)'] }, { duration: 140 });
        if (refocus) button.focus();
    }
    dd.close = close;
    function pick(i) {
        close(true);
        if (i === select.selectedIndex) return;
        select.selectedIndex = i;
        glide(label, { opacity: [.3, 1], translate: ['0 5px', '0 0'] });
        select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    button.addEventListener('click', () => dd.classList.contains('open') ? close() : open());
    button.addEventListener('keydown', e => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        open();
    });
    list.addEventListener('keydown', e => {
        const last = rows().length - 1;
        if (e.key === 'ArrowDown') highlight(Math.min(last, active + 1));
        else if (e.key === 'ArrowUp') highlight(Math.max(0, active - 1));
        else if (e.key === 'Home') highlight(0);
        else if (e.key === 'End') highlight(last);
        else if (e.key === 'Enter' || e.key === ' ') pick(active);
        else if (e.key === 'Escape') close(true);
        else if (e.key === 'Tab') { close(); return; }
        else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Typing jumps to the first name starting with what was typed
            typed = performance.now() - typedAt > 700 ? e.key : typed + e.key;
            typedAt = performance.now();
            const i = [...select.options].findIndex(o => o.text.toLowerCase().startsWith(typed.toLowerCase()));
            if (i >= 0) highlight(i);
        } else return;
        e.preventDefault();
        e.stopPropagation();   // not the page's shortcuts (Esc clears the calculator)
    });
    return dd;
}

function closeDropdowns(except) {
    document.querySelectorAll('.dd.open').forEach(dd => { if (dd !== except) dd.close(); });
}
document.addEventListener('pointerdown', e => { if (!e.target.closest('.dd')) closeDropdowns(); });
addEventListener('blur', () => closeDropdowns());
addEventListener('resize', () => closeDropdowns());
