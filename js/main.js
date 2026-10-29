// Update the clock and check the alarms
function tick() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (widgets.sky.on && !matrixSky()) drawSky(now);
    if (widgets.clock.on) {
        $('clockTime').textContent = `${hm}:${pad(now.getSeconds())}`;
        $('clockDate').textContent = now.toLocaleDateString(translations[lang].locale,
            { weekday: 'long', day: 'numeric', month: 'short' });
    }
    // Ring alarms whose time passed since the last check, even if a
    // throttled background tab skipped that minute; not if it was long ago
    // (e.g. the computer slept). Rings with the widget closed too.
    let rang = false;
    document.querySelectorAll('.alarm-row').forEach(row => {
        const a = alarm.alarms[row.dataset.alarm];
        if (!a.armed) return;
        const at = alarmDate(a.time, now);
        if (at <= lastCheck || at > now || now - at > 5 * 60000) return;
        row.classList.add('ringing');
        rang = true;
    });
    if (rang) {
        startRinging(widgetEl('alarm'));
        showAlarm();
        notify();
    }
    updateNextAlarm(now);
    if (widgets.shift.on) updateShift(now);
    lastCheck = now;
}
let lastCheck = new Date();
setInterval(tick, 250);

for (const name of WIDGETS) if (widgets[name].on) setWidget(name, true);

// Start up
$('bonus').value = store.get('bonus') || '';
setOrderType(orderType);
setCalc(calc, false);
applyLanguage();
firstField().focus();
if (notedReleases.some(r => isNewer(r.version, versionSeen))) openNews(false);   // not for internal ones
store.set('version', VERSION);

// Keep the screen awake while the page is visible. The browser releases the
// lock when the tab is hidden, so re-request on visibility change; also retry
// on interaction in case the browser wanted a user gesture first.
let wakeLock = null;
let wakeLockPending = false;
async function requestWakeLock() {
    if (!('wakeLock' in navigator) || wakeLock || wakeLockPending) return;
    if (document.visibilityState !== 'visible') return;
    wakeLockPending = true;
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch {
        // Denied (e.g. battery saver) - try again on the next interaction
    } finally {
        wakeLockPending = false;
    }
}
document.addEventListener('visibilitychange', requestWakeLock);
document.addEventListener('pointerdown', requestWakeLock);
document.addEventListener('keydown', requestWakeLock);
requestWakeLock();

// New version: the newest release in the deployed changelog.js against
// the one running. Comparing version numbers, not deploy times, means only
// a real release offers a refresh: a deploy that didn't bump the version,
// or a page served from the browser's or GitHub's 10-minute cache, can't.
// The check skips the browser's cache; GitHub's may still answer for up to
// 10 minutes after a release, which only delays the offer. Offer a refresh
// rather than reloading under the user.
async function checkForUpdate() {
    if (document.visibilityState !== 'visible' || !$('update').hidden) return;
    try {
        const res = await fetch(`changelog.js?check=${Date.now()}`, { cache: 'no-store' });
        const deployed = (await res.text()).match(/version:\s*'(\d+\.\d+\.\d+)'/)?.[1];
        if (deployed && isNewer(deployed, VERSION)) $('update').hidden = false;
    } catch {
        // Offline - try again later
    }
}
// A reload may keep the cached page, scripts and styles for up to 10 minutes, so
// refresh the cached copies first to avoid landing on the old version.
$('updateBtn').addEventListener('click', async () => {
    const files = [location.href, ...[...document.scripts].filter(s => s.src).map(s => s.src),
        ...[...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.href).filter(h => h.startsWith(location.origin))];
    await Promise.all(files.map(src => fetch(src, { cache: 'reload' }).catch(() => {})));
    location.reload();
});
document.addEventListener('visibilitychange', checkForUpdate);
setInterval(checkForUpdate, 10 * 60000);
checkForUpdate();
