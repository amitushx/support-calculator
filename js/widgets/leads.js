// Shift Leads: who is in charge of what this shift. Hovering a role shows
// its job; the names typed next to them are cleared once a new shift starts
// (claimShift in shift.js), so yesterday's leads don't linger.
const leads = widgets.leads;
leads.names ??= {};
let leadsNoteTimer = null;

// A new shift started since the names were typed: clear them
function expireLeads() {
    if (!leads.typedAt || shift.startedAt <= leads.typedAt) return;
    leads.names = {};
    delete leads.typedAt;
    saveWidgets();
    document.querySelectorAll('.lead-row input').forEach(el => { el.value = ''; });
}
expireLeads();
document.addEventListener('pointerdown', expireLeads);   // after claimShift, added earlier
document.addEventListener('keydown', expireLeads);

// Typing a name says, for a few seconds, when the names go away
function showLeadsNote() {
    clearTimeout(leadsNoteTimer);
    reveal($('leadsNote'), true, { opacity: [0, 1], transform: ['translateY(-4px)', 'none'] });
    leadsNoteTimer = setTimeout(() => reveal($('leadsNote'), false, null, { opacity: [1, 0] }), 3000);
}

for (const row of document.querySelectorAll('.lead-row')) {
    const input = row.querySelector('input');
    input.value = leads.names[row.dataset.lead] || '';
    input.addEventListener('input', () => {
        leads.names[row.dataset.lead] = input.value;
        leads.typedAt = Date.now();
        saveWidgets();
        showLeadsNote();
    });

    // The role's job, in a bubble under it, outside the widget so the
    // glass doesn't clip it
    const role = row.querySelector('span');
    role.addEventListener('pointerenter', () => {
        const tip = $('leadTip');
        const box = role.getBoundingClientRect();
        tip.textContent = translations[lang][role.dataset.t + 'Job'];
        tip.style.top = box.bottom + 6 + 'px';
        if (document.dir === 'rtl') {
            tip.style.right = innerWidth - box.right - 8 + 'px';
            tip.style.left = '';
        } else {
            tip.style.left = box.left - 8 + 'px';
            tip.style.right = '';
        }
        reveal(tip, true, { opacity: [0, 1], transform: ['translateY(-4px) scale(.94, .8)', 'none'] });
    });
    role.addEventListener('pointerleave', () => {
        reveal($('leadTip'), false, null, { opacity: [1, 0] }, { duration: 120 });
    });
}
