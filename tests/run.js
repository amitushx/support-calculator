#!/usr/bin/env node
/*
 * Runs the browser test pages (tests/*-tests.html) in Node, so the same
 * cases can be checked from the command line and in CI. Each page's scripts,
 * linked and inline, run in order in one sandbox with just enough of a
 * document for the pages to write their results into.
 * Usage: node tests/run.js; exits with 1 if any case fails.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// The few DOM calls the test pages make: getElementById, createElement, append
function fakeDocument() {
    const elements = {};
    const element = () => ({ textContent: '', className: '', children: [], append(...c) { this.children.push(...c); } });
    return {
        elements,
        getElementById: id => (elements[id] ??= element()),
        createElement: element
    };
}

function runPage(file) {
    const html = fs.readFileSync(file, 'utf8');
    const document = fakeDocument();
    const context = vm.createContext({ document, console });
    for (const [, src, code] of html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)) {
        const script = src ? path.resolve(path.dirname(file), src) : file;
        vm.runInContext(src ? fs.readFileSync(script, 'utf8') : code, context, { filename: script });
    }
    const rows = document.elements.results?.children ?? [];
    return {
        summary: document.elements.summary?.textContent || 'no results',
        failures: rows.filter(r => r.className !== 'pass').map(r => r.textContent),
        total: rows.length
    };
}

const pages = fs.readdirSync(__dirname).filter(f => f.endsWith('-tests.html')).sort();
let failed = 0;
for (const page of pages) {
    let result;
    try {
        result = runPage(path.join(__dirname, page));
    } catch (e) {
        result = { summary: `crashed: ${e.message}`, failures: [], total: 0 };
    }
    const ok = result.total > 0 && !result.failures.length;
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} ${page}: ${result.summary}`);
    for (const f of result.failures) console.log(`    ${f}`);
}
process.exit(failed ? 1 : 0);
