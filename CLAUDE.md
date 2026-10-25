# Releases

Every change merged into `main` ships as a new version: before merging, add an
entry on top of `CHANGELOG` in `changelog.js` with the bumped version (semver:
patch for fixes and small tweaks, minor for new features), today's date, and a
user-facing note in all five languages (he, en, ar, ka, hi), in the same PR as
the change.

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
