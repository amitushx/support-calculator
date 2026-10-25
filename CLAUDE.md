# Memory

Keep every memory about this project here, in CLAUDE.md: preferences,
corrections, decisions and ideas turned down. Add or update the relevant
section instead of using Claude Code's separate memory folder, and keep
each rule short, with the reason behind it.

# Releases

Every change merged into `main` ships as a new version: before merging, add an
entry on top of `CHANGELOG` in `changelog.js` with the bumped version (semver:
patch for fixes and small tweaks, minor for new features), today's date, and a
user-facing note in all five languages (he, en, ar, ka, hi), in the same PR as
the change.

Work one feature at a time: each gets its own commit and its own version,
and check with the user before starting the next one. Push only when asked;
while a version is unpushed, follow-up tweaks to it fold into that same
version instead of bumping again. (The update popup only offers a refresh
when the version goes up, so every user-facing deploy needs a bump.)

# Naming

- The customer compensation calculator for late orders is **Delivery
  Late**, in that word order, never "Late Delivery". In Hebrew it is the
  transliteration דליברי לייט, not a translation. It's the term used at
  work. Use it in UI text, help, code comments and commit messages.
- The app is **Support Calculator**; in Hebrew the transliteration
  מחשבון סאפורט (not תמיכה). Support jargon is transliterated, not
  translated.
- Exception: leave the Hindi (देर से डिलीवरी) and Georgian (დაგვიანება) names
  of Delivery Late as they are.

# UI

- Use outline line icons (Tabler style) for any new button, heading or
  label, never emojis: add a `<symbol id="i-…">` to the sprite at the top
  of `<body>` in `index.html` and use `<svg class="icon"><use
  href="#i-…"/></svg>` or the `icon(name)` helper. Plain text glyphs like ✓
  and ♡ are fine. One consistent visual language across the app.
- The app is for PC users: design for keyboard and mouse, not phones.

# Ideas turned down

Don't suggest these again:

- Showing how an amount was calculated (e.g. "28% × ₪145.90 = ₪41"): the
  calculation must stay hidden from end users.
- A copy-ready customer message for Delivery Late: templates already exist
  elsewhere.
- A full-day bonus timeline for the chosen city.
- PWA, offline or installable app: PC users only.

# Tests

`node tests/run.js` runs the test pages in `tests/` (they also open in a
browser). CI runs them on every PR, and checks that the changelog version
was bumped.

# Layout

A static site for GitHub Pages, no build step.

- `index.html`: markup, the icon sprite and the inline pre-paint theme script.
- `css/`: `themes.css` (palettes), `app.css`, `widgets.css`, `dialogs.css`,
  loaded in that order; the cascade depends on it.
- `js/lib/`: the pure rules (`fees.js`, `delay.js`, `bonus.js`), the only
  code the tests load.
- `js/`: `i18n.js`, `app.js` (calculators and page), `bonus-list.js`,
  `main.js` (clock tick, startup, wake lock, update check); `js/widgets/`
  has one file per widget.
- Scripts are classic, not modules, sharing one global scope; `index.html`
  loads them in dependency order. Top-level code may only call what earlier
  files define.
- `changelog.js` stays at the root: running copies of older versions poll
  that path to find out about updates.
- `pages/doom.html`: the Doom widget's iframe.
