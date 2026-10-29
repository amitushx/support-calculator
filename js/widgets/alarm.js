// Ringing alarms: the chosen sound on repeat until stopped, at most a minute.
// The whole minute is scheduled on the audio clock up front, since timers
// in a background tab can be throttled to once a minute.
// Browsers only allow sound after a user gesture, so the audio context is
// unlocked when an alarm is set, and on any later interaction.
let audio = null;
let ringOut = null;      // gain node the ringing sound plays through
let previewOut = null;   // same for the preview when picking a sound
function unlockAudio() {
    try {
        audio ??= new AudioContext();
        audio.resume();
    } catch {}
}

// One note: quick attack, then a fade (or held until the end with sustain)
function tone(out, { type = 'sine', freq, at, dur, peak = 0.3, sustain = false }) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
    if (sustain) gain.gain.setValueAtTime(peak, at + dur - 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + dur + 0.01);
    return osc;
}

// A synthesized meow, "m-ee-ow": a buzzy voice whose pitch rises and
// falls, shaped by two formant filters that slide from "ee" through "ah"
// to "oo", behind a low-pass "mouth" that opens from a closed "m".
// `pitch` and `dur` vary it so a cat doesn't sound like a loop.
function meow(out, at, { pitch = 1, dur = 0.75, peak = 0.5 } = {}) {
    const end = at + dur;
    const t = f => at + f * dur;   // a moment, as a fraction of the meow

    const voice = audio.createOscillator();
    voice.type = 'sawtooth';
    voice.frequency.setValueAtTime(430 * pitch, at);
    voice.frequency.linearRampToValueAtTime(720 * pitch, t(.3));
    voice.frequency.linearRampToValueAtTime(650 * pitch, t(.55));
    voice.frequency.exponentialRampToValueAtTime(380 * pitch, end);
    const vibrato = audio.createOscillator();
    const vibratoDepth = audio.createGain();
    vibrato.frequency.value = 6;
    vibratoDepth.gain.value = 10 * pitch;
    vibrato.connect(vibratoDepth).connect(voice.frequency);

    // Breath: a little noise alongside the voice
    const noise = audio.createBufferSource();
    noise.buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * dur), audio.sampleRate);
    const samples = noise.buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const breath = audio.createGain();
    breath.gain.value = 0.08;
    noise.connect(breath);

    // The vowel: the first two formants, "ee" -> "ah" -> "oo"
    const formants = [
        { gain: 1, q: 6, path: [[0, 350], [.15, 400], [.45, 900], [1, 500]] },
        { gain: 0.6, q: 9, path: [[0, 1900], [.15, 2400], [.45, 1500], [1, 900]] }
    ];
    const mouth = audio.createBiquadFilter();
    mouth.type = 'lowpass';
    mouth.frequency.setValueAtTime(500, at);
    mouth.frequency.exponentialRampToValueAtTime(4500, t(.12));
    mouth.frequency.exponentialRampToValueAtTime(1400, end);
    for (const f of formants) {
        const band = audio.createBiquadFilter();
        band.type = 'bandpass';
        band.Q.value = f.q;
        f.path.forEach(([when, hz], i) => i
            ? band.frequency.linearRampToValueAtTime(hz, t(when))
            : band.frequency.setValueAtTime(hz, t(when)));
        const level = audio.createGain();
        level.gain.value = f.gain;
        voice.connect(band);
        breath.connect(band);
        band.connect(level).connect(mouth);
    }

    // Loudness: a soft start, full through the "ah", then the "ow" trails off
    const envelope = audio.createGain();
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(peak * 0.7, t(.08));
    envelope.gain.linearRampToValueAtTime(peak, t(.35));
    envelope.gain.linearRampToValueAtTime(peak * 0.8, t(.75));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    mouth.connect(envelope).connect(out);

    for (const node of [voice, vibrato, noise]) {
        node.start(at);
        node.stop(end + 0.02);
    }
    return voice;
}

// A synthesized puppy bark, "wuff": a short, rough voice that jumps up and
// drops, through a mouth that snaps open and closes again. `pitch` varies it.
function bark(out, at, { pitch = 1, dur = 0.2, peak = 0.5 } = {}) {
    const end = at + dur;
    const t = f => at + f * dur;

    const voice = audio.createOscillator();
    voice.type = 'sawtooth';
    voice.frequency.setValueAtTime(480 * pitch, at);
    voice.frequency.linearRampToValueAtTime(620 * pitch, t(.2));
    voice.frequency.exponentialRampToValueAtTime(260 * pitch, end);

    // Roughness: a burst of noise alongside the voice
    const noise = audio.createBufferSource();
    noise.buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * dur), audio.sampleRate);
    const samples = noise.buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const rough = audio.createGain();
    rough.gain.value = 0.3;
    noise.connect(rough);

    // The "u" to "a" and back: one broad formant, behind the mouth
    const formant = audio.createBiquadFilter();
    formant.type = 'bandpass';
    formant.Q.value = 2;
    formant.frequency.setValueAtTime(700, at);
    formant.frequency.linearRampToValueAtTime(1300, t(.3));
    formant.frequency.linearRampToValueAtTime(800, end);
    const mouth = audio.createBiquadFilter();
    mouth.type = 'lowpass';
    mouth.frequency.setValueAtTime(600, at);
    mouth.frequency.exponentialRampToValueAtTime(3000, t(.25));
    mouth.frequency.exponentialRampToValueAtTime(700, end);
    voice.connect(formant);
    rough.connect(formant);
    formant.connect(mouth);

    // Loudness: a sharp attack, then a quick fall
    const envelope = audio.createGain();
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(peak * 1.1, t(.06));
    envelope.gain.linearRampToValueAtTime(peak * 0.8, t(.5));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    mouth.connect(envelope).connect(out);

    for (const node of [voice, noise]) {
        node.start(at);
        node.stop(end + 0.02);
    }
    return voice;
}

// Synthesized alarm sounds: play() plays one round starting at `at`,
// repeated every `period` seconds while ringing
const SOUNDS = {
    beep: {
        period: 1,
        play(out, at) {
            for (let i = 0; i < 3; i++) tone(out, { freq: 880, at: at + i * 0.2, dur: 0.15 });
        }
    },
    chime: {
        period: 1.6,
        play(out, at) {
            tone(out, { freq: 1319, at, dur: 0.8 });
            tone(out, { freq: 1047, at: at + 0.35, dur: 1.2 });
        }
    },
    siren: {
        period: 1,
        play(out, at) {
            const osc = tone(out, { type: 'sawtooth', freq: 600, at, dur: 0.98, peak: 0.3, sustain: true });
            osc.frequency.linearRampToValueAtTime(1200, at + 0.5);
            osc.frequency.linearRampToValueAtTime(600, at + 0.98);
        }
    },
    // A meow, each a little different
    meow: {
        period: 1.4,
        play(out, at) {
            meow(out, at, { pitch: 0.95 + Math.random() * 0.15, dur: 0.7 + Math.random() * 0.15 });
        }
    },
    // The puppy's bark, twice: woof woof
    woof: {
        period: 1.2,
        play(out, at) {
            bark(out, at, { pitch: 0.95 + Math.random() * 0.1 });
            bark(out, at + 0.3, { pitch: 1 + Math.random() * 0.1 });
        }
    }
};

// Play the chosen sound for about `seconds`; returns the output node,
// disconnect it to stop
function playSound(seconds) {
    if (!audio) return null;
    const sound = SOUNDS[alarm.sound] ?? SOUNDS.beep;
    const out = audio.createGain();
    out.connect(audio.destination);
    const start = audio.currentTime + 0.05;
    for (let t = 0; t < seconds; t += sound.period) sound.play(out, start + t);
    return out;
}
// One round of the chosen sound
function previewSound() {
    unlockAudio();
    previewOut?.disconnect();
    const out = previewOut = playSound(0.1);
    setTimeout(() => out?.disconnect(), 2500);
}

function startRinging(el) {
    el.classList.add('ringing');
    clearTimeout(el.ringTimeout);
    el.ringTimeout = setTimeout(() => stopRinging(el), 60000);
    ringOut?.disconnect();
    ringOut = playSound(60);
}
// However it stops (Stop, Esc, the popup, timing out, closing the widget),
// the alarm that rang is switched off, so it doesn't ring again tomorrow
function stopRinging(el) {
    el.classList.remove('ringing');
    el.querySelectorAll('.alarm-row.ringing').forEach(row => {
        row.classList.remove('ringing');
        alarm.alarms[row.dataset.alarm].armed = false;
        row.querySelector('input[type="checkbox"]').checked = false;
        saveWidgets();
    });
    clearTimeout(el.ringTimeout);
    if (!document.querySelector('.widget.ringing')) {
        ringOut?.disconnect();
        ringOut = null;
        notification?.close();
    }
    showAlarm();
}

// Full-screen popup naming the ringing alarm(s) and their time; hidden
// once nothing rings
const overlay = $('alarmOverlay');
function showAlarm() {
    const rows = [...document.querySelectorAll('.alarm-row.ringing')];
    if (!rows.length) {
        overlay.hidden = true;
        return;
    }
    const t = translations[lang];
    $('alarmName').textContent = rows.map(row => t[row.querySelector('[data-t]').dataset.t]).join(' · ');
    $('alarmTime').textContent = widgets.alarm.alarms[rows[0].dataset.alarm].time;
    if (overlay.hidden) {
        overlay.hidden = false;
        $('alarmStop').focus();
    }
}
// Stopping the Ending alarm by hand (a click or Esc) celebrates the
// end of the shift
function dismissAlarm() {
    const end = !!document.querySelector('.alarm-row[data-alarm="end"].ringing');
    stopRinging(widgetEl('alarm'));
    if (end) celebrateShift();
}
overlay.addEventListener('click', dismissAlarm);
overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') dismissAlarm();
});

// System notification while the page is in the background, so a ringing
// alarm is seen even with the tab hidden or the browser minimized.
// Permission is asked for when an alarm is set.
let notification = null;
function notify() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible') return;
    notification?.close();
    notification = new Notification(`⏰ ${$('alarmName').textContent}`,
        { body: $('alarmTime').textContent, tag: 'alarm', requireInteraction: true });
    notification.onclick = () => {
        focus();
        notification.close();
    };
}
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') notification?.close();
});

const ringable = () => Object.values(widgets.alarm.alarms).some(a => a.armed);
document.addEventListener('pointerdown', () => { if (ringable()) unlockAudio(); });
document.addEventListener('keydown', () => { if (ringable()) unlockAudio(); });

// Alarms for the reps' shift: long break, short break and end of shift
const alarm = widgets.alarm;   // alarms: { long, short, short2, end } each with time ("HH:MM"), armed
alarm.alarms ??= {};
alarm.sound ??= 'beep';
delete alarm.volume;           // removed volume slider
delete alarm.time;             // from the earlier single alarm
delete alarm.armed;
function armAlarm() {
    unlockAudio();
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
}
document.querySelectorAll('.alarm-row').forEach(row => {
    const a = alarm.alarms[row.dataset.alarm] ??= {};
    const time = row.querySelector('input[type="time"]');
    const armed = row.querySelector('input[type="checkbox"]');
    time.value = a.time || '';
    armed.checked = !!a.armed;
    time.addEventListener('change', () => {
        a.time = time.value;
        a.armed = !!a.time;   // setting a time arms the alarm
        armed.checked = a.armed;
        if (a.armed) armAlarm();
        saveWidgets();
    });
    armed.addEventListener('change', () => {
        a.armed = armed.checked;
        if (a.armed) armAlarm();
        saveWidgets();
    });
});

// A second short break for long shifts: + shows its row, − hides it and
// clears its alarm
alarm.short2 ??= false;
function updateShort2() {
    document.querySelector('[data-alarm="short2"]').hidden = !alarm.short2;
    $('alarmShort2Btn').innerHTML = icon(alarm.short2 ? 'minus' : 'plus');
    $('alarmShort2Btn').title = translations[lang][alarm.short2 ? 'removeShort2' : 'addShort'];
}
$('alarmShort2Btn').addEventListener('click', () => {
    alarm.short2 = !alarm.short2;
    if (!alarm.short2) {
        const row = document.querySelector('[data-alarm="short2"]');
        alarm.alarms.short2 = {};
        row.querySelector('input[type="time"]').value = '';
        row.querySelector('input[type="checkbox"]').checked = false;
    }
    updateShort2();
    saveWidgets();
});

// Alarm sound; picking one plays a preview
$('alarmSound').value = alarm.sound;
$('alarmSound').addEventListener('change', () => {
    alarm.sound = $('alarmSound').value;
    saveWidgets();
    previewSound();
});

// Today's date at an "HH:MM" alarm time
function alarmDate(time, now) {
    const [h, m] = time.split(':');
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d;
}

// "Short in 0:42:10": countdown to the closest armed alarm, today or tomorrow
function updateNextAlarm(now) {
    let next = null;
    document.querySelectorAll('.alarm-row').forEach(row => {
        const a = alarm.alarms[row.dataset.alarm];
        if (!a.armed) return;
        const at = alarmDate(a.time, now);
        if (at <= now) at.setDate(at.getDate() + 1);
        if (!next || at < next.at) next = { row, at };
    });
    $('nextAlarm').hidden = !next;
    if (!next) return;
    const t = translations[lang];
    const s = Math.ceil((next.at - now) / 1000);
    const pad = n => String(n).padStart(2, '0');
    const left = s >= 3600
        ? `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`
        : `${Math.floor(s / 60)}:${pad(s % 60)}`;
    $('nextAlarm').innerHTML = '';
    const [before, after] = t.nextIn.split('{time}');
    $('nextAlarm').append(`${t[next.row.querySelector('[data-t]').dataset.t]} ${before}`,
        Object.assign(document.createElement('bdi'), { textContent: left }), after);
}
