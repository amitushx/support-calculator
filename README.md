<div align="center">

<img src="assets/icon.svg" alt="" width="96" height="96">

# Support Calculator

**מחשבון סאפורט** · courier payments and Delivery Late compensation, one keystroke away

<p>
<!-- version --><img alt="Version" src="https://img.shields.io/badge/version-1.10.1-009DE0?style=for-the-badge"><!-- /version -->
<a href="https://github.com/amitushx/support-calculator/actions/workflows/tests.yml"><img alt="Tests" src="https://img.shields.io/github/actions/workflow/status/amitushx/support-calculator/tests.yml?branch=main&label=tests&style=for-the-badge"></a>
<img alt="Languages" src="https://img.shields.io/badge/languages-5-7C3AED?style=for-the-badge">
<img alt="No build step" src="https://img.shields.io/badge/build-none-22C55E?style=for-the-badge">
</p>

### [Open the calculator →](https://amitushx.github.io/support-calculator/)

[Features](#features) · [Shortcuts](#keyboard-shortcuts) · [Widgets](#widgets) · [Themes](#themes-and-languages) · [Development](#development) · [Change log](#change-log)

</div>

---

## Features

<table>
<tr>
<td width="50%" valign="top">

### Distance calculator

The courier's payment for a distance in meters, rounded up to a whole shekel.

- Bonus percentage on top, typed in or taken from the day's bonus list
- **Walker** switch for couriers on foot
- Click the amount or press <kbd>Enter</kbd> to copy it

</td>
<td width="50%" valign="top">

### Delivery Late

The customer's maximum compensation for a late order.

- **Restaurant** or **Retail**, minutes late and the order total
- **Wolt+** switch for subscribers
- Rounded up to a whole shekel; one credit is one shekel

</td>
</tr>
<tr>
<td valign="top">

### Daily bonus list

Copy the day's bonus message, paste it with one button and pick a city: the bonus follows the clock by itself and shows until when it holds.

- Reads the list in whatever layout it arrives, Slack emoji codes included
- Kept until the end of the day; the city is remembered for tomorrow

</td>
<td valign="top">

### History

The last 10 calculations of each calculator, under the amount.

- Everything copied, or left on screen for a few seconds
- 5 shown, “Show more” for all 10
- Click a row to copy its amount again

</td>
</tr>
</table>

**And around it:** a What's new window after every update, a refresh offer when a new version is out, settings backup to a file (at the bottom of the help), and the screen stays awake while the calculator is open.

## Keyboard shortcuts

Shortcuts use the physical key, so they work on a Hebrew keyboard layout too.

| Key | Distance | Delivery Late |
| :-: | --- | --- |
| <kbd>Enter</kbd> | Copy the amount | Copy the amount |
| <kbd>Esc</kbd> | Clear (or stop a ringing alarm, close a menu) | Clear (or stop a ringing alarm, close a menu) |
| <kbd>L</kbd> | Switch to Delivery Late | Switch to distance |
| <kbd>H</kbd> | Show or hide the history | Show or hide the history |
| <kbd>W</kbd> | Walker on/off | Wolt+ on/off |
| <kbd>D</kbd> | Distance field | |
| <kbd>B</kbd> | Bonus field | |
| <kbd>M</kbd> | | Minutes field |
| <kbd>P</kbd> | | Order total field |
| <kbd>T</kbd> | | Restaurant or retail |

## Widgets

Small panels, all off by default, turned on from the puzzle button in the header. Drag them anywhere; they stay where you leave them.

| Widget | What it does |
| --- | --- |
| **Clock** | The time to the second and today's date |
| **Alarms** | Long break, short break and end of shift, with a second short break for long shifts. Beep, Chime, Siren or Meow; rings with the widget closed and notifies in the background |
| **Shift progress** | A line from the start of the shift to the end, with the breaks as points and the time left. The start is set by itself; stopping the Ending alarm sets off a celebration |
| **Note** | A sticky note, resizable, kept between visits |
| **Sky** | A pixel-art skyline under the real sky of the moment, sun and moon included; matrix rain in the Retro terminal theme |
| **Cat** | Wanders along the bottom of the screen, grooms, and naps when nobody's around. Click it and it meows |
| **Doom** | The shareware episode, downloaded (about 6.5 MB) only when you press play. <kbd>F</kbd> goes full screen |

Every 10 minutes a pixel-art Wolt courier also scoots across the page.

## Themes and languages

Eight color themes, each with a light and a dark version. The mode follows the system until you pick one.

- **Classic**: white and Wolt blue, and a deep night version
- **Cute**
- **Sunset**
- **Ocean**
- **Aurora**
- **Wood**: after gruvbox, mellow cream by day, rich walnut chevron parquet by night
- **Cyberpunk**: a neon city in magenta, purple and cyan, with CRT scanlines by night
- **Retro terminal**: green-bar printer paper by day, a glowing green screen by night

The whole app, help included, is in **Hebrew** (default), **English**, **Arabic**, **Georgian** and **Hindi**, right to left where needed.

## Development

A static site for GitHub Pages: plain HTML, CSS and JavaScript, no build step and no dependencies.

```bash
python3 -m http.server 8765
```

Then open <http://localhost:8765>.

```
index.html          markup, icon sprite, pre-paint theme script
changelog.js        releases, newest first (stays at the root: older copies poll it)
css/                themes · app · widgets · dialogs, loaded in that order
js/lib/             the rules: fees.js, delay.js, bonus.js
js/                 i18n.js, app.js, bonus-list.js, main.js
js/widgets/         one file per widget
pages/doom.html     the Doom widget's frame
scripts/readme.js   writes the version and change log below
tests/              test pages and their Node runner
```

### Tests

```bash
node tests/run.js
```

The test pages in `tests/` also open in a browser. CI runs them on every push and pull request.

### Releases

Every change merged into `main` ships as a new version: add an entry on top of `changelog.js` with the bumped version, the date and a note in all five languages, then update this README:

```bash
node scripts/readme.js
```

CI checks that the version was bumped and that this README is up to date. After the merge, CI tags the commit with the new version (`v1.10.1`), so `git checkout v1.9.4` shows any past release and `git diff v1.9.6 v1.10.0` what changed between two.

## Change log

<!-- changelog -->
### 1.10.1 · 29 October 2026

- Behind the scenes: every version is now saved with its own tag, so any of them is easy to go back to.

### 1.10.0 · 29 October 2026

- A new theme: Wood, inspired by gruvbox. Creamy and mellow by day, rich dark wood parquet by night.

### 1.9.6 · 25 October 2026

- Behind the scenes: the calculator’s code is reorganized into separate files and folders. Nothing changes in how it works.

### 1.9.5 · 25 October 2026

- Behind the scenes: the distance, Delivery Late and bonus list calculations are now checked automatically before every update.

### 1.9.4 · 24 October 2026

- The “Support Calculator” heading is gone from the top of the page, and the history, widgets, color theme and dark mode buttons took its place.

### 1.9.3 · 24 October 2026

- The cat no longer falls asleep on the “Made with ♥” line: it moves aside before lying down.

### 1.9.2 · 24 October 2026

- In dark mode, every option in the dropdowns (language, alarm sound and city) is now visible, not just the selected one.

### 1.9.1 · 24 October 2026

- The “A new version is available” message now shows only when there really is a new version.

### 1.9.0 · 24 October 2026

- A new, synthesized meow for the cat and the alarm’s Meow sound. The cat meows once per click, and no longer meows over itself when clicked several times in a row.

### 1.8.0 · 24 October 2026

- In the Retro terminal theme, matrix rain falls in the sky widget instead of stars and clouds, behind the buildings and the sun or moon.

### 1.7.0 · 24 October 2026

- Settings backup: at the bottom of the help, export your settings to a file and import them on another computer.

### 1.6.0 · 24 October 2026

- The Classic theme is now white and Wolt blue, and there’s a new one: Retro terminal, with printer paper by day and a glowing green screen by night.

### 1.5.0 · 24 October 2026

- New in the widgets: a cat that wanders along the bottom of the screen, grooms and naps when nobody’s around. Click it and it meows.

### 1.4.0 · 24 October 2026

- A new widget: Shift progress. A line from the start of the shift to the end, with the breaks from the alarms and the time left. Stopping the Ending alarm sets off a celebration.

### 1.3.0 · 24 October 2026

- Calculation history: the new button at the top (or H) opens your last 5 calculations under the amount, with “Show more” for up to 10. Click a row to copy its amount again.

### 1.2.1 · 24 October 2026

- What’s new now shows every update since your last visit, not just the latest one.

### 1.2.0 · 24 October 2026

- In the alarms, + adds a second short break for long shifts.

### 1.1.0 · 24 October 2026

- A new widget: Doom. The game downloads (about 6.5 MB) only when you press play, and F opens it full screen.

### 1.0.1 · 24 October 2026

- The distance payment now matches the original calculator, rounded up to a whole shekel. The minimum distance is now 101 meters.

### 1.0.0 · 24 October 2026

- The app now has a version number, shown at the bottom of the page.
- After an update, a What’s new window shows what changed, with the full change log one click away.

### 0.4.0 · 23 October 2026

- A Delivery Late calculator for the customer’s compensation on a late delivery.
- A help button that explains the calculators, the bonus list, widgets and themes.
- Paste the bonus list straight from the clipboard.
- Arabic, Georgian and Hindi, picked from the language menu.
- Distance payments are rounded to the nearest shekel.
- A banner offers a refresh when a new version is out.
- A new name and icon: Support Calculator.

### 0.3.0 · 22 October 2026

- A daily bonus list: pick your city and the bonus follows the clock.
- Slack :emoji: shortcodes in the bonus list are read like emojis.
- A Wolt scooter drives by now and then.

### 0.2.0 · 21 October 2026

- Alarms ring with a full-screen popup, a countdown, sounds and background notifications, even with the widget closed.
- A sky widget and a cyberpunk theme.
- Keyboard shortcuts, and a better fit on narrow phone screens.

### 0.1.0 · 20 October 2026

- A distance payment calculator, with a bonus and a walker option.
- Draggable widgets: a clock, shift alarms and a sticky note.
- Color themes in light and dark pairs.
- The screen stays awake while the calculator is open.
<!-- /changelog -->

---

<div align="center">
<sub>Made with ♥ by Amit Cohen and Claude</sub>
</div>
