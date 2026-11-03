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
the change. Only minor and major releases pop up in What's new; patch notes
wait in the full change log (the user's call: fixes aren't worth
interrupting anyone for). Internal changes users can't see (refactors, tests, CI, tooling,
docs) still get a patch version, for the refresh offer and the tag, but no
`notes`: end users don't care. Instead they get `dev`, a technical note in
English that only the README shows, for developers on GitHub. Then run `node scripts/readme.js` to copy the new version and
change log into `README.md` (CI fails if it's out of date), and update the
README's other sections when a feature changes what they describe.

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
- The two halves of a theme are light mode and dark mode (as the toggle
  calls them), never "by day" and "by night": the mode is a choice, not
  the time of day.
- The breaks widget is **Breaks** (הפסקות), not "Alarms"; its alarms ring
  for the breaks.
- The widget of who's in charge this shift is **Shift Leads** (שיפט לידים).
  Its roles are כ"א, מוביל and שטח (HR, Leader, Field). The user dropped a
  fourth, Astra (אסטרה): not important enough for the widget.
- Arabic follows the Hebrew work jargon, in Arabic letters (موبيل, شيطح),
  not Arabic or English words for it: it's how the team actually talks.

# UI

- Use outline line icons (Tabler style) for any new button, heading or
  label, never emojis: add a `<symbol id="i-…">` to the sprite at the top
  of `<body>` in `index.html` and use `<svg class="icon"><use
  href="#i-…"/></svg>` or the `icon(name)` helper. Plain text glyphs like ✓
  and ♡ are fine. One consistent visual language across the app.
- The app is for PC users: design for keyboard and mouse, not phones.
- Dropdowns: never a bare `<select>`, whose open list the browser draws in
  its own style. Wrap it with `dropdown()` (`js/dropdown.js`, the filled
  pill the user picked, or `small: true` for plain text); code keeps using
  the select's value, options and change event.
- Motion is liquid and on one spring (`--spring` in `app.css`): anything new
  that appears, closes, resizes the card or moves should use the helpers in
  `js/motion.js` (`glide`, `reveal`, `dripIn`, `morph` in `app.js`) or CSS
  transitions under `.motion`, so it moves like the rest and stays still
  with reduced motion. The user picked the Subtle spring and the Jelly
  switch (round knob that slides over) over a knob that stretches across.
  A switch knob or tab pill stretches by changing its width, never with
  `scale`: squashing the round knob looked uncomfortable. The squash-and-
  stretch scaling on menus, widgets, history rows, the amount and dragged
  widgets is fine; the user chose to keep it.
- The calculator and widgets are liquid glass, after iOS (`--panel` and
  `--glass-*` in `themes.css`): nearly clear, a soft blur,
  a thin rim light. No diagonal sheen or colored tint: that read as
  Windows Vista. The rim light is fixed at the top left: following the
  mouse was too much, with the mouse always moving.
- Plan visual designs before coding: for a new theme or look, first show
  swatches of the proposed palette (and a mockup of any pattern) and wait
  for approval or tweaks. Iterating in code took several rounds on the
  Wood theme.
- The same goes for any new widget or UI feature: show a draft (a mockup
  in the running app) and wait for approval before writing the real code.
  The user shouldn't have to ask for it each time.

# Ideas turned down

Don't suggest these again:

- Showing how an amount was calculated (e.g. "28% × ₪145.90 = ₪41"): the
  calculation must stay hidden from end users.
- A copy-ready customer message for Delivery Late: templates already exist
  elsewhere.
- A full-day bonus timeline for the chosen city.
- PWA, offline or installable app: PC users only.
- Lens edges on the glass (an SVG displacement filter in the backdrop,
  bending the page near the rim): Chrome kept drawing flickering stripes
  where panels overlapped, through two fixes. Removed in 1.19.3.

# Tests

`node tests/run.js` runs the test pages in `tests/` (they also open in a
browser), then `tests/smoke.js`, which loads the real page in headless
Firefox: no script errors, both calculators, all languages, all widgets.
Without Firefox locally the smoke test is skipped; in CI it fails. CI runs them on every PR, and checks that the changelog version
was bumped and that `README.md` is up to date.

# Layout

A static site for GitHub Pages, no build step.

- `index.html`: markup, the icon sprite and the inline pre-paint theme script.
- `css/`: `themes.css` (palettes), `app.css`, `widgets.css`, `dialogs.css`,
  loaded in that order; the cascade depends on it.
- `js/lib/`: the pure rules (`fees.js`, `delay.js`, `bonus.js`), the only
  code the tests load.
- `js/`: `i18n.js`, `motion.js` (spring animation helpers), `dropdown.js`
  (styled dropdowns over hidden selects), `app.js` (calculators and page), `bonus-list.js`,
  `main.js` (clock tick, startup, wake lock, update check); `js/widgets/`
  has one file per widget, plus `pets.js`, shared by the cat and the puppy.
- Scripts are classic, not modules, sharing one global scope; `index.html`
  loads them in dependency order. Top-level code may only call what earlier
  files define.
- `changelog.js` stays at the root: running copies of older versions poll
  that path to find out about updates.
- `pages/doom.html`: the Doom widget's iframe.
- `scripts/readme.js`: writes the version badge and change log in `README.md`.
