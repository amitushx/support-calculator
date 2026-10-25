/*
 * Daily bonus list parser.
 * The list is pasted from a chat message whose layout changes from day to
 * day, so instead of matching one layout the parser reads it line by line
 * and only relies on three anchors: a percentage ("30%"), a time range
 * ("13:00-14:00") and a continuation ("ממשיך עד 18:00"). Emojis, bullets,
 * dates and section titles are ignored.
 *
 * A line with a percentage is a bonus. Its city is whatever text is left on
 * the line once everything recognized is removed, or the last city-only line
 * above it. Its hours are the range on the line itself, or the last
 * range-only line (a time-slot header) above it.
 */

const TIME = String.raw`(\d{1,2}):(\d{2})`;
const RANGE = String.raw`${TIME}\s*(?:[-–—]|עד)\s*${TIME}`;
const PERCENT = String.raw`(\d+(?:\.\d+)?)\s*%`;
// Hebrew filler words; matched as whole words so city names stay intact
const FILLER = /(?<!\p{L})(?:תוספת|בונוס|בשעות|בשעה|משעה|שעות|ממשיך|ממשיכה|בין|עד)(?!\p{L})/gu;

const minutes = (h, m) => Number(h) * 60 + Number(m);

// "23:59" means until the end of the day
function span(from, to) {
    if (to >= 23 * 60 + 59 || to <= from) to = 24 * 60;
    return { from, to };
}
const toRange = m => span(minutes(m[1], m[2]), minutes(m[3], m[4]));

// Text left on a line once times, percentages and filler are removed
function cleanName(line) {
    return line
        .replace(new RegExp(RANGE, 'g'), ' ')
        .replace(new RegExp(PERCENT, 'g'), ' ')
        .replace(new RegExp(TIME, 'g'), ' ')
        .replace(FILLER, ' ')
        .replace(/[^\p{L}\s\-״"'׳]/gu, ' ')
        .replace(/^[\s\-"'׳]+|[\s\-"'׳]+$/g, '')
        .replace(/\s+/g, ' ');
}

// Same city across lines or days, despite quote and spacing differences
const cityKey = name => name.replace(/[\s\-״"'׳]/g, '');

// Returns [{ name, slots: [{ from, to, percent }] }] sorted by city name;
// from/to are minutes since midnight, to is exclusive.
function parseBonusList(text) {
    const lines = text
        // Slack writes emojis as :name: ("14:00:ocean:"); turn them into a
        // symbol so they read like any emoji. A name starts with a letter, so
        // the ":00-14:" inside a time range isn't taken for one.
        .replace(/:[a-z][a-z0-9_+\-']*:/gi, '•')
        // Some lists run bonuses and the next city together on one line
        .replace(new RegExp(`(${RANGE})(?=[^\\s)])`, 'g'), '$1\n')
        .split(/\r?\n/);
    const cities = new Map();
    let city = null;      // last city-only line
    let slot = null;      // last range-only line

    for (const line of lines) {
        const percent = line.match(new RegExp(PERCENT));
        const ranges = [...line.matchAll(new RegExp(RANGE, 'g'))];
        if (!percent) {
            if (ranges.length) slot = toRange(ranges.at(-1));
            else city = cleanName(line) || city;
            continue;
        }
        const name = cleanName(line) || city;
        let range = ranges.length ? toRange(ranges.at(-1)) : slot;
        if (!name || !range) continue;
        // "ממשיך עד 18:00": the bonus runs past the slot it is listed under
        const until = line.replace(new RegExp(RANGE, 'g'), '').match(new RegExp(`עד\\s*${TIME}`));
        if (until) range = span(range.from, minutes(until[1], until[2]));

        const key = cityKey(name);
        if (!cities.has(key)) cities.set(key, { name, slots: [] });
        cities.get(key).slots.push({ ...range, percent: Number(percent[1]) });
    }

    const list = [...cities.values()];
    for (const c of list) c.slots.sort((a, b) => a.from - b.from);
    return list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
}

// Bonus percent in effect at a minute of the day; the highest if slots overlap
function bonusAt(slots, minute) {
    return Math.max(0, ...slots.filter(s => s.from <= minute && minute < s.to).map(s => s.percent));
}

// "13:00" from minutes since midnight; the end of the day shows as 24:00
const formatTime = m => `${String(m / 60 | 0).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

if (typeof module !== 'undefined') module.exports = { parseBonusList, bonusAt, cityKey, formatTime };
