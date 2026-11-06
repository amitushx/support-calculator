// Note: a sticky note of plain text where any line can be a checklist item.
// "- " at the start of a line, or the button in the bar, makes one; a click
// on its box (or Ctrl+Enter) ticks it. Each line is a <div> in the editor;
// the note is saved as text, items marked "- [ ] " or "- [x] ", so a note
// from before checklists loads as it was.
const note = $('noteText');
const ITEM = /^- \[([ x])\] /;

function noteLine(text = '', item = false, done = false) {
    const line = document.createElement('div');
    line.dir = 'auto';
    if (item) line.className = done ? 'item done' : 'item';
    line.textContent = text;
    if (!text) line.append(document.createElement('br'));   // an empty line keeps its height
    return line;
}
function loadNote(text) {
    note.replaceChildren(...text.split('\n').map(line => {
        const item = line.match(ITEM);
        return item ? noteLine(line.slice(item[0].length), true, item[1] === 'x') : noteLine(line);
    }));
}
function saveNote() {
    // Typing into an emptied editor can leave text outside any line
    for (const node of [...note.childNodes]) if (node.nodeType === Node.TEXT_NODE) node.replaceWith(noteLine(node.textContent));
    const lines = [...note.children].map(line => (line.classList.contains('item')
        ? line.classList.contains('done') ? '- [x] ' : '- [ ] ' : '') + line.textContent);
    widgets.note.text = lines.join('\n').replace(/\n+$/, '');
    note.classList.toggle('blank', !widgets.note.text);   // shows the placeholder
    saveWidgets();
}

// The line the caret is on, and where in it
const lineOf = node => {
    while (node && node.parentNode !== note) node = node.parentNode;
    return node;
};
function caretOffset(line) {
    const sel = getSelection(), range = document.createRange();
    range.selectNodeContents(line);
    range.setEnd(sel.anchorNode, sel.anchorOffset);
    return range.toString().length;
}
function placeCaret(line, offset = 0) {
    const walk = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    for (let node; (node = walk.nextNode());) {
        if (offset <= node.length) return getSelection().collapse(node, offset);
        offset -= node.length;
    }
    getSelection().collapse(line, 0);
}
// Cut a line at the caret; the rest goes on a new line after it, an item
// if the line is one (unticked)
function splitLine(line) {
    const sel = getSelection();
    sel.deleteFromDocument();
    const rest = document.createRange();
    rest.setStart(sel.anchorNode, sel.anchorOffset);
    rest.setEndAfter(line.lastChild ?? line);
    const next = noteLine('', line.classList.contains('item'));
    next.replaceChildren(rest.extractContents());
    for (const l of [line, next]) if (!l.textContent && !l.querySelector('br')) l.append(document.createElement('br'));
    line.after(next);
    return next;
}

note.addEventListener('keydown', e => {
    const line = lineOf(getSelection().anchorNode);
    if (!line) return;
    const item = line.classList.contains('item');
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {   // tick or untick
        e.preventDefault();
        if (item) line.classList.toggle('done');
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (item && !line.textContent) line.className = '';   // Enter on an empty item ends the list
        else placeCaret(splitLine(line));
    } else if (e.key === 'Backspace' && item && getSelection().isCollapsed && !caretOffset(line)) {
        e.preventDefault();
        line.className = '';   // back to a plain line, text and all
    } else return;
    saveNote();
});
note.addEventListener('input', () => {
    // "- " at the start of a plain line makes it an item
    const line = lineOf(getSelection().anchorNode);
    if (line && !line.classList.contains('item') && /^-[  ]/.test(line.textContent)) {
        const at = caretOffset(line);
        const walk = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
        for (let left = 2, node; left && (node = walk.nextNode());) {
            const cut = Math.min(left, node.length);
            node.deleteData(0, cut);
            left -= cut;
        }
        line.className = 'item';
        if (!line.textContent) line.replaceChildren(document.createElement('br'));
        placeCaret(line, Math.max(at - 2, 0));
    }
    saveNote();
});
// Pasted text comes in plain, line by line, "- " lines as items
note.addEventListener('paste', e => {
    e.preventDefault();
    const lines = e.clipboardData.getData('text/plain').replace(/\r/g, '').split('\n');
    getSelection().deleteFromDocument();
    const line = lineOf(getSelection().anchorNode);
    if (!line) return;
    const after = lines.length > 1 ? splitLine(line) : null;
    getSelection().getRangeAt(0).insertNode(document.createTextNode(lines[0]));
    let last = line;
    for (const text of lines.slice(1, -1)) {
        const next = noteLine(text.replace(/^- /, ''), text.startsWith('- '));
        last.after(next);
        last = next;
    }
    if (after) {   // the last pasted line goes before the rest of the line
        const tail = lines.at(-1);
        after.prepend(tail.replace(/^- /, ''));
        if (tail.startsWith('- ')) after.className = 'item';
        after.querySelector('br')?.remove();
        if (!after.textContent) after.append(document.createElement('br'));
        placeCaret(after, tail.replace(/^- /, '').length);
    } else {
        line.querySelector('br')?.remove();
        getSelection().collapseToEnd();
    }
    saveNote();
});
note.addEventListener('drop', e => e.preventDefault());   // no rich text dragged in
// A click on an item's box ticks it, without moving the caret
note.addEventListener('mousedown', e => {
    const line = lineOf(e.target);
    if (!line?.classList.contains('item')) return;
    const box = line.getBoundingClientRect();
    const x = getComputedStyle(line).direction === 'rtl' ? box.right - e.clientX : e.clientX - box.left;
    if (x > 18 || e.clientY - box.top > 22) return;
    e.preventDefault();
    line.classList.toggle('done');
    saveNote();
});
// The button in the bar adds an item after the caret's line, or in place
// of an empty one, or at the end
$('noteAddBtn').addEventListener('click', () => {
    const at = lineOf(getSelection().anchorNode);
    const item = noteLine('', true);
    if (at && !at.textContent) at.replaceWith(item);
    else if (at) at.after(item);
    else note.append(item);
    note.focus();
    placeCaret(item);
    saveNote();
});

loadNote(widgets.note.text || '');
note.classList.toggle('blank', !widgets.note.text);
if (widgets.note.w) {
    note.style.width = widgets.note.w + 'px';
    note.style.height = widgets.note.h + 'px';
}
new ResizeObserver(() => {
    if (!note.offsetWidth) return;   // hidden
    widgets.note.w = note.offsetWidth;
    widgets.note.h = note.offsetHeight;
    saveWidgets();
}).observe(note);
