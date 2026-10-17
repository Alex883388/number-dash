# Number Arcade

Math games for kids aged 8–12, made to be gentle on the eyes, with chill lo-fi music made live in the browser. Every game is one self-contained HTML page; together they make a small website that works offline and installs on an iPad home screen.

Play: https://alex883388.github.io/number-dash/ (on iPad: open in Safari, then Share > Add to Home Screen).

| # | Game | Link | How it plays |
| --- | --- | --- | --- |
| 1 | Number Dash | [/dash/](https://alex883388.github.io/number-dash/dash/) | A Geometry Dash–style runner with 30 levels. Jump the spikes, fly the rocket, steer into the lane whose door shows the right answer. Details in [games/dash/README.md](games/dash/README.md). |
| 2 | Number Ladder | [/ladder/](https://alex883388.github.io/number-dash/ladder/) | Climb a tower of 30 equations. The cube walks back and forth on its floor; tap to jump onto the answer platform with the right number. A right answer builds the next floor, a wrong one drops the cube all the way to the ground. |

## Number Ladder

- **The climb**: each rung asks one question with answer blocks floating above the cube's floor. A dotted guide shows the arc a jump right now would take: in full up to rung 9 and on the first rung of each new trick, then only its start up to rung 20, then not at all.
- **Moving blocks**: the bottom is calm; higher up a new trick arrives every three rungs, with a short hello, and each rung of a stretch is a little faster:

  | Rungs | Blocks | Motion |
  | --- | --- | --- |
  | 1–5 | 2 | still |
  | 6–9 | 3 | still |
  | 10–12 | 3 | slide side to side |
  | 13–15 | 3 | bob up and down in a wave |
  | 16–18 | 3 | spin: rest flat, then one quick turn; a spinning block only holds the cube while nearly flat |
  | 19–21 | 4 | swap: two neighbours trade places, one hopping over, one ducking under |
  | 22–24 | 3 | merry-go-round: ride a ring, the back ones higher and smaller |
  | 25–27 | 4 | slide and spin |
  | 28–30 | 3 | spinning merry-go-round |

  Missing every block is free (the cube drops back to its floor); only a wrong answer sends it to the ground. `games/ladder/playtest/fairness.js` measures every rung: on each moving rung the best tap moment lasts 450 ms or more, and the longest wait for one is about 7 s.
- **A wrong answer**: the platform cracks, the cube falls past every floor it built, and a card shows the right answer before the next climb starts from the ground. The music changes to the next remix after each fall, the same way Number Dash remixes per attempt.
- **Math**: questions follow the shared math level (Starter 7–8, Explorer 9–10, Genius 11–12) and get harder in three bands (rungs 1–10, 11–20, 21–30). Missed facts are saved and come back now and then, shared with Number Dash.
- **Records**: best rung, best time to the top, times reached the top, total falls. A "Best" flag on the wall marks the rung to beat. The sky turns from morning to sunset to night on the way up.
- **Controls**: tap anywhere (Space, ↑, W or Enter on a keyboard) to jump. Esc or P pauses, M mutes.

## Layout

| Path | What it is |
| --- | --- |
| `games/dash/` | Number Dash: engine, page template, level checker, pack generator, playtests (see its README). |
| `games/ladder/src/ladder.html` | Number Ladder: the whole game in one page (drawing, physics, questions, menus). |
| `games/ladder/playtest/` | Ladder scenarios: `climb.js` (a bot climbs through every moving trick with a picture of each, falls once on purpose, then reaches the top), `fairness.js` (how often a tap lands right, wrong or on nothing, per rung) and `arcade-ipad.js` (finger taps through the whole site on an emulated iPad, portrait, phone and offline). |
| `shared/` | Code both games use: math questions, the music remix engine, sound effects, cube looks, cube drawing. A game page marks the spot with `/*__SHARED:name__*/` and the build fills it in. |
| `web/` | The arcade home page (`hub.html`), the offline service worker, the app manifest and icons (`make-icons.js` redraws the icons). |
| `build.js` | Builds every game into `games/*/dist/` and the website into `docs/`: the home page, one folder per game, the manifest, icons and an offline cache whose version changes with the content. |
| `docs/` | The built website. GitHub Pages serves it from the `main` branch. Do not edit by hand. |

Progress is saved in each browser's localStorage: `number-dash.v1` holds Number Dash levels plus the settings and math record both games share, `number-ladder.v1` holds the ladder records. The home page reads both for its stats.

## Commands

Build everything (games and website):

```bash
npm run build
```

Prove every Number Dash level is still beatable:

```bash
npm run check:dash:quick
```

Play-test Number Ladder with the climbing bot (headless Edge, screenshots in `games/dash/playtest/shots/`):

```bash
ND_URL=file:///D:/Github/number-dash/games/ladder/dist/preview.html ND_READY='!!window.__ladder' ND_BOT=none node games/dash/playtest/shoot.js games/ladder/playtest/climb.js
```

Measure how fair each rung's moving blocks are:

```bash
ND_URL=file:///D:/Github/number-dash/games/ladder/dist/preview.html ND_READY='!!window.__ladder' ND_BOT=none node games/dash/playtest/shoot.js games/ladder/playtest/fairness.js
```

The playtest browser keeps the site's offline cache between runs, so right after a change it can show the previous build on `docs/`; test the fresh build through `ND_URL=file:///…/games/ladder/dist/preview.html` as above.

Tap through the whole site on an emulated iPad:

```bash
ND_SERVE=../../docs ND_READY='document.readyState === "complete"' ND_BOT=none node games/dash/playtest/shoot.js games/ladder/playtest/arcade-ipad.js
```

Play-test Number Dash on the built site:

```bash
ND_SERVE=../../docs ND_PATH=dash/ node games/dash/playtest/shoot.js games/dash/playtest/scenarios/ipad.js
```

To publish, build, commit `docs/` and push to `main`; GitHub Pages updates in about a minute.

## Adding a game

1. Make `games/<name>/src/<name>.html`: styles, then a `<!--BODY-->` line, then the page. Use `/*__SHARED:name__*/` for shared code, and show an "All games" link when `window.ARCADE_HOME` is set.
2. Give it a `games/<name>/build.js` that exports a `build()` returning the page (copy the ladder's).
3. Add it to `GAMES` in `build.js`, a card in `web/hub.html` and its folder to `CORE` in `web/sw.js`.
