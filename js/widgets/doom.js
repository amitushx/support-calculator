// Doom: the shareware episode in pages/doom.html, framed so the engine keeps to
// itself. Nothing downloads until Play (about 6.5 MB from jsDelivr), and
// closing the widget drops the frame, so a closed game costs nothing.
const doomPlay = $('doomPlay');

function startDoom() {
    const frame = document.createElement('iframe');
    frame.src = 'pages/doom.html';
    frame.allow = 'fullscreen';
    frame.title = 'Doom';
    frame.addEventListener('load', () => frame.contentWindow.focus());
    $('doomScreen').replaceChildren(frame);
    $('doomFull').hidden = false;
}

function stopDoom() {
    $('doomScreen').replaceChildren(doomPlay);
    $('doomFull').hidden = true;
    $('w-doom').classList.remove('big');
}

// Full screen from the button or F in the game (pages/doom.html calls this).
// Some hosts, like an app's built-in browser, never answer the request,
// so if it hasn't happened in half a second the widget fills the window.
function toggleDoomFull() {
    const frame = $('doomScreen').querySelector('iframe');
    if (!frame) return;
    const widget = $('w-doom');
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else if (widget.classList.contains('big')) {
        widget.classList.remove('big');
    } else {
        const fallback = () => { if (!document.fullscreenElement) widget.classList.add('big'); };
        frame.requestFullscreen?.().catch(fallback);
        setTimeout(fallback, 500);
    }
    frame.contentWindow.focus();
}

document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) $('w-doom').classList.remove('big');
});
doomPlay.addEventListener('click', startDoom);
$('doomFull').addEventListener('click', toggleDoomFull);
