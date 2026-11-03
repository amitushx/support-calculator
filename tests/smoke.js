/*
 * Smoke test: loads the real index.html in headless Firefox and checks that
 * the page starts without script errors (a wrong load order in index.html
 * only shows up there), that both calculators answer (and Esc clears them), that every language
 * fills in every text, and that every widget turns on cleanly.
 * Firefox is driven over WebDriver BiDi, built into it, so nothing needs
 * installing; set FIREFOX to its path if it isn't on PATH. Without Firefox
 * the test is skipped, except in CI, where it fails.
 * Usage: node tests/smoke.js, or through node tests/run.js.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

// The site as GitHub Pages serves it, on a free local port
function serve() {
    const server = http.createServer((req, res) => {
        const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(404).end();
            return;
        }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// Headless Firefox in a throwaway profile; resolves with its BiDi address
function launchFirefox(profile) {
    return new Promise((resolve, reject) => {
        const firefox = spawn(process.env.FIREFOX || 'firefox',
            ['--headless', '--no-remote', '--profile', profile, '--remote-debugging-port', '0', 'about:blank'],
            { stdio: ['ignore', 'ignore', 'pipe'] });
        let log = '';
        firefox.on('error', reject);
        firefox.on('exit', code => reject(new Error(`Firefox exited (${code}) before it was ready\n${log}`)));
        firefox.stderr.on('data', chunk => {
            log += chunk;
            const ws = log.match(/WebDriver BiDi listening on (ws:\/\/\S+)/);
            if (ws) resolve({ firefox, url: ws[1] });
        });
    });
}

// A minimal BiDi client: send(method, params) → result; events go to onEvent
function connect(url, onEvent) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${url}/session`);
        const pending = new Map();
        let id = 0;
        ws.onerror = () => reject(new Error(`could not connect to ${url}`));
        ws.onmessage = ({ data }) => {
            const msg = JSON.parse(data);
            if (msg.type === 'event') return onEvent(msg);
            const call = pending.get(msg.id);
            if (!call) return;
            pending.delete(msg.id);
            if (msg.type === 'error') call.reject(new Error(`${msg.error}: ${msg.message}`));
            else call.resolve(msg.result);
        };
        ws.onopen = () => resolve({
            send: (method, params = {}) => new Promise((ok, fail) => {
                pending.set(++id, { resolve: ok, reject: fail });
                ws.send(JSON.stringify({ id, method, params }));
            }),
            close: () => ws.close()
        });
    });
}

// The checks, run inside the page; each returns a list of problems
const CHECKS = {
    'distance calculator': `(() => {
        const field = $('distance');
        field.value = '1000';
        field.dispatchEvent(new Event('input'));
        const shown = $('amount').textContent;
        const problems = shown.includes(String(payment(1000))) ? [] : ['1000 m shows ' + shown + ', expected ' + payment(1000)];
        $('bonus').value = '20';
        $('bonus').dispatchEvent(new Event('input'));
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        updateBonus();
        for (const id of ['distance', 'bonus'])
            if ($(id).value) problems.push('Esc left ' + id + ' at ' + $(id).value);
        return problems;
    })()`,
    'Delivery Late calculator': `(() => {
        document.querySelector('[data-calc="delay"]').click();
        $('minutes').value = '40';
        $('minutes').dispatchEvent(new Event('input'));
        $('price').value = '145.90';
        $('price').dispatchEvent(new Event('input'));
        const shown = $('amount').textContent;
        const expected = delayCompensation(40, 145.90);
        document.querySelector('[data-calc="distance"]').click();
        return shown.includes(String(expected)) ? [] : ['40 min, ₪145.90 shows ' + shown + ', expected ' + expected];
    })()`,
    'every language': `(() => {
        const problems = [];
        for (const code of Object.keys(translations)) {
            $('lang').value = code;
            $('lang').dispatchEvent(new Event('change'));
            if (document.documentElement.lang !== code) problems.push(code + ': not applied');
            if (!document.title.trim()) problems.push(code + ': no page title');
            document.querySelectorAll('[data-t]').forEach(el => {
                if (!el.textContent.trim() || el.textContent === 'undefined')
                    problems.push(code + ': no text for ' + el.dataset.t);
            });
            if (!document.querySelector('.help-body[lang="' + code + '"]')) problems.push(code + ': no help');
            const text = document.body.innerText;
            for (const bad of ['undefined', 'NaN', '[object '])
                if (text.includes(bad)) problems.push(code + ': page shows ' + bad);
        }
        $('lang').value = 'he';
        $('lang').dispatchEvent(new Event('change'));
        return problems;
    })()`,
    'every widget': `(() => {
        for (const name of WIDGETS) setWidget(name, true);
        tick();
        const off = WIDGETS.filter(name => widgetEl(name).hidden);
        for (const name of WIDGETS) setWidget(name, false);
        return off.map(name => name + ' did not open');
    })()`,
    'every pet': `(() => {
        const names = Object.keys(pets);
        for (const name of names) setPet(name, true);
        const off = names.filter(name => pets[name].el.hidden);
        pets.fish.el.click();   // bubbles
        fishGame.last = 0;
        fishPlay();   // the cat comes over to the bowl
        for (const name of names) setPet(name, false);
        return off.map(name => name + ' did not come out');
    })()`
};

async function smoke() {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'));
    const server = await serve();
    let firefox, bidi;
    try {
        ({ firefox, url: bidi } = await launchFirefox(profile));
    } catch (e) {
        server.close();
        fs.rmSync(profile, { recursive: true, force: true });
        if (e.code === 'ENOENT' && !process.env.CI) return { skipped: 'no Firefox found (set FIREFOX to its path)' };
        throw e;
    }
    const errors = [];
    const results = [];
    try {
        const session = await connect(bidi, ({ method, params }) => {
            if (method === 'log.entryAdded' && (params.type === 'javascript' || params.level === 'error'))
                errors.push(`${params.text}${params.stackTrace?.callFrames?.[0] ? ` (${params.stackTrace.callFrames[0].url.split('/').pop()}:${params.stackTrace.callFrames[0].lineNumber + 1})` : ''}`);
        });
        await session.send('session.new', { capabilities: {} });
        await session.send('session.subscribe', { events: ['log.entryAdded'] });
        const { contexts: [{ context }] } = await session.send('browsingContext.getTree');
        await session.send('browsingContext.navigate',
            { context, url: `http://127.0.0.1:${server.address().port}/index.html`, wait: 'complete' });
        await new Promise(r => setTimeout(r, 1000));   // a few clock ticks
        results.push({ name: 'starts without errors', problems: errors.splice(0) });

        for (const [name, expression] of Object.entries(CHECKS)) {
            const res = await session.send('script.evaluate',
                { expression, target: { context }, awaitPromise: false, serializationOptions: { maxObjectDepth: 2 } });
            const problems = res.type === 'exception'
                ? [res.exceptionDetails.text]
                : (res.result.value || []).map(v => v.value);
            await new Promise(r => setTimeout(r, 300));
            results.push({ name, problems: [...problems, ...errors.splice(0)] });
        }
        await session.send('session.end').catch(() => {});
        session.close();
    } finally {
        firefox.kill();
        server.close();
        await new Promise(r => setTimeout(r, 200));
        fs.rmSync(profile, { recursive: true, force: true });
    }
    return { results };
}

// One line per check, then its problems: repeats dropped, the first 10 shown
function report({ skipped, results }) {
    if (skipped) {
        console.log(`- smoke: skipped, ${skipped}`);
        return true;
    }
    for (const r of results) {
        const problems = [...new Set(r.problems)];
        console.log(`${problems.length ? '✗' : '✓'} smoke: ${r.name}`);
        for (const p of problems.slice(0, 10)) console.log(`    ${p}`);
        if (problems.length > 10) console.log(`    and ${problems.length - 10} more`);
    }
    return results.every(r => !r.problems.length);
}

module.exports = () => smoke().then(report, e => {
    console.log(`✗ smoke: ${e.message}`);
    return false;
});

if (require.main === module) module.exports().then(ok => process.exit(ok ? 0 : 1));
