#!/usr/bin/env node
/*
 * Writes the version badge and the change log in README.md from
 * changelog.js (English notes), between the <!-- version --> and
 * <!-- changelog --> markers. Internal releases show their `dev` note instead.
 * Usage: node scripts/readme.js to update; --check exits with 1 instead of
 * writing when README.md is out of date (CI runs that).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const readmePath = path.join(root, 'README.md');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'changelog.js'), 'utf8') + '\nthis.CHANGELOG = CHANGELOG;', context);
const releases = context.CHANGELOG;

const date = d => new Date(d + 'T12:00Z').toLocaleDateString('en-GB',
    { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// An <img>, since the badges sit in an HTML block
const version = `<img alt="Version" src="https://img.shields.io/badge/version-${releases[0].version}-009DE0?style=for-the-badge">`;
const changelog = releases.map(r =>
    `### ${r.version} · ${date(r.date)}${r.notes ? '' : ' · internal'}\n\n${(r.notes?.en ?? r.dev).map(n => `- ${n}`).join('\n')}`
).join('\n\n');

// Replaces what sits between <!-- name --> and <!-- /name -->
const fill = (text, name, content, inline) => {
    const re = new RegExp(`(<!-- ${name} -->)[\\s\\S]*?(<!-- /${name} -->)`);
    if (!re.test(text)) throw new Error(`README.md has no <!-- ${name} --> markers`);
    return text.replace(re, (_, open, close) => inline ? open + content + close : `${open}\n${content}\n${close}`);
};

const before = fs.readFileSync(readmePath, 'utf8');
const after = fill(fill(before, 'version', version, true), 'changelog', changelog);
if (process.argv.includes('--check')) {
    if (before !== after) {
        console.log('✗ README.md is out of date: run node scripts/readme.js');
        process.exit(1);
    }
    console.log('✓ README.md is up to date');
} else {
    fs.writeFileSync(readmePath, after);
    console.log(`README.md updated to ${releases[0].version}`);
}
