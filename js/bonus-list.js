// Daily bonus list (js/lib/bonus.js): copy the day's list, paste it with the
// button and pick a city, and the bonus follows the clock. The list is kept
// until the end of the day it was pasted on and the city is remembered
// across days. Typing a bonus switches back to it; the typed bonus is kept
// apart and comes back afterwards.
let bonusList = null;                       // { date, text, cities } or null
let bonusCity = store.get('bonusCity');     // chosen city name, or null
let bonusNoteTimer = null;                  // a short message is showing
const todayKey = () => new Date().toLocaleDateString('en-CA');
const nowMinute = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const listCity = () => bonusList && bonusCity &&
    (bonusList.cities.find(c => cityKey(c.name) === cityKey(bonusCity)) ?? { name: bonusCity, slots: [] });
try {
    const saved = JSON.parse(store.get('bonusList'));
    if (saved?.date === todayKey()) bonusList = { ...saved, cities: parseBonusList(saved.text) };
} catch {}

// Read the copied list; a text that isn't one keeps the current list
async function pasteBonusList() {
    const t = translations[lang];
    let text;
    try {
        text = await navigator.clipboard.readText();
    } catch {
        // No clipboard access (old browser, permission denied): ask instead
        text = prompt(t.pastePrompt);
        if (text === null) return;
    }
    const cities = parseBonusList(text);
    if (cities.length) {
        bonusList = { date: todayKey(), text, cities };
        store.set('bonusList', JSON.stringify({ date: bonusList.date, text }));
        fillCitySelect();
    }
    showBonusNote(cities.length ? t.citiesFound(cities.length) : t.noBonuses);
}

function showBonusNote(text) {
    clearBonusNote();
    $('bonusInfo').textContent = text;
    $('bonusInfo').classList.add('note');
    bonusNoteTimer = setTimeout(() => {
        clearBonusNote();
        updateBonus();
    }, 3000);
}
function clearBonusNote() {
    clearTimeout(bonusNoteTimer);
    bonusNoteTimer = null;
    $('bonusInfo').classList.remove('note');
}

function setBonusCity(name) {
    clearBonusNote();
    bonusCity = name || null;
    store.set('bonusCity', bonusCity || '');
    fillCitySelect();
}

// Rebuild the city menu; the remembered city stays listed even when today's
// list doesn't have it (it then gets no bonus)
function fillCitySelect() {
    const select = $('bonusCity');
    select.replaceChildren(new Option(translations[lang].manualBonus, ''));
    const cities = bonusList ? [...bonusList.cities] : [];
    const city = listCity();
    if (city && !city.slots.length) cities.unshift(city);
    for (const c of cities) select.add(new Option(c.name, c.name));
    select.value = city ? city.name : '';
    updateBonus();
}

// Apply the chosen city's bonus for the current time
function updateBonus() {
    const t = translations[lang];
    if (bonusList && bonusList.date !== todayKey()) {   // a new day began
        bonusList = null;
        fillCitySelect();
        return;
    }
    const city = listCity();
    const minute = nowMinute();
    let info = '';
    if (city) {
        const percent = bonusAt(city.slots, minute);
        const value = percent ? String(percent) : '';
        if ($('bonus').value !== value) { $('bonus').value = value; render(); }
        // When the bonus next changes
        const next = city.slots.flatMap(s => [s.from, s.to]).filter(m => m > minute && m < 24 * 60).sort((a, b) => a - b)[0];
        info = `${percent}%` + (next ? ` ${t.until.replace('{time}', formatTime(next))}` : '');
    } else if ($('bonus').value !== (store.get('bonus') || '') && document.activeElement !== $('bonus')) {
        $('bonus').value = store.get('bonus') || '';
        render();
    }
    if (!bonusNoteTimer) $('bonusInfo').textContent = info;
    $('bonusPasteBtn').classList.toggle('active', !!bonusList);

    // Each city's current bonus in the menu
    for (const option of $('bonusCity').options) {
        const listed = option.value && bonusList?.cities.find(c => c.name === option.value);
        const percent = listed ? bonusAt(listed.slots, minute) : 0;
        option.textContent = option.value ? option.value + (percent ? ` · ${percent}%` : '') : t.manualBonus;
    }
}

$('bonusPasteBtn').addEventListener('click', pasteBonusList);
$('bonusCity').addEventListener('change', () => setBonusCity($('bonusCity').value));
setInterval(updateBonus, 15000);
document.addEventListener('visibilitychange', updateBonus);
