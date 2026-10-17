# Number Dash

A gentle Geometry Dash–style runner for kids aged 8–12. Jump the spikes, fly the rocket, and steer into the lane whose door shows the right answer. Only the correct door opens. Music is chill lo-fi made live in the browser, and every new attempt plays a different remix.

Play it: https://alex883388.github.io/number-dash/dash/ (on iPad: open in Safari, then Share > Add to Home Screen). It is game 1 of [Number Arcade](../../README.md); the arcade's home page links all the games.

## What's in the game

- **10 levels**, each bringing something new. Speed is tied to the tempo (6 blocks per beat).

  | # | Level | Difficulty | Tempo | New |
  | --- | --- | --- | --- | --- |
  | 1 | Cloud Hop | Easy | 80 | Jumps, pads and the rocket |
  | 2 | Lemon Lane | Normal | 86 | Ring chains |
  | 3 | Bubble Bay | Normal | 84 | Rolling ball |
  | 4 | Moonlit Meadow | Hard | 92 | Upside-down gravity |
  | 5 | Candy Clouds | Hard | 90 | UFO and mini size |
  | 6 | Rocket Garden | Hard | 94 | Speed portals, purple super pads, green rings |
  | 7 | Starlight Drift | Harder | 100 | Blue flip rings |
  | 8 | Zigzag Reef | Harder | 98 | Zig-zag wave |
  | 9 | Rainbow Rapids | Expert | 104 | Everything, a bit faster |
  | 10 | Galaxy Finale | Master | 108 | All the moves together |

- **Normal, Hard and Expert packs**: 30 more levels (10 each), built by `tools/genlevels.js` from the same checked pieces around a theme (blocks, rocket, ball, rings, gravity, mini, UFO, speed, pads, wave, or a mix). Each one has its own generated song and color palette, 3 stars and 3 to 5 math forks. The Expert pack (e01–e10, 100–108 bpm, five forks each) uses the hard pieces with a tighter band: sloppy-player clear rate 8–60% / 0–20%, tightest tap at least 45 ms.
- **Moves**: cube (tap to jump, hold to keep hopping), rocket (hold to rise), ball (tap to roll onto the ceiling and back), UFO (each tap is a little flap), wave (hold to zig up, let go to zag down), mini size, speed portals (slower / normal / faster), yellow pads, purple super pads, yellow, pink, blue and green rings, gravity portals. A tap while touching a ring always uses the ring.
- **Slow motion**: Shift, S or ↓ (or the clock button) slows everything to a third of the speed for 1 second, 3 times per attempt. It is pure time-stretching, so it never changes what is possible, only how much time you have to think.
- **Math doors**: a question appears before each fork, floating big in the open sky (it shrinks under the progress bar only inside low corridors). Cube forks have 2 lanes (jump onto the shelf or stay low), ball forks have 2 (ceiling or floor), rocket, UFO and wave forks have 3. Each attempt asks a new question. Missed facts are saved and come back 30% of the time.
- **Math levels**: Starter (ages 7–8), Explorer (9–10), Genius (11–12). Thinking time can be set to Extra (question shows about 2 s sooner).
- **Music**: the first attempt plays the level's song from its intro. Each later attempt plays the next of 7 remixes (key, chord order, groove, piano style, lead sound and a new melody), cycling with fresh melodies.
- **Kid-friendly look**: pastel palettes, a gentler dusk sky that follows dark mode, no flashing, a Calm visuals switch.
- **Practice mode** drops checkpoints (never inside a math question), **stars** (3 per level, counted in normal runs) unlock cube colors, right answers unlock faces.
- Progress lives in the browser's localStorage on each device.

## Playing on an iPad

The root `build.js` (`npm run build` at the repository root) writes the arcade website to `docs/`: the home page, this game at `docs/dash/`, an app icon, a home-screen manifest and an offline cache. GitHub Pages serves `docs/` straight from this repository. On the iPad, open the link in Safari, then Share > Add to Home Screen: the game gets its own icon, opens full screen, and keeps working without internet. Progress is saved per browser, so the home-screen app and Safari keep separate scores.

Touch controls: tap anywhere to jump, hold to keep hopping, the clock button (bottom left) for slow motion, the pause button at the top. Pinch and double-tap zoom are switched off, and sound plays even with the silent switch on.

## Layout

Paths below are inside `games/dash/`. The math questions, music remix engine, sound effects and cube drawing live in `shared/` at the repository root, because Number Ladder uses them too.

| Path | What it is |
| --- | --- |
| `src/engine.js` | Level data, level builders and the physics. No DOM, so the checker runs the exact same rules. |
| `src/template.html` | The page: drawing, menus, level flow. `/*__ENGINE__*/` marks where the engine is inlined and `/*__SHARED:name__*/` where a `shared/name.js` file goes. |
| `build.js` | Writes `dist/number-dash.html` (the single file to publish) and `dist/preview.html` (same page in a full HTML skeleton for local testing). |
| `src/packs.js` | The Normal and Hard packs, written by `tools/genlevels.js --combine`. Regenerate rather than hand-edit. |
| `tools/genlevels.js` | Pack generator: composes a level from pieces, tests every piece at the level's tempo, and keeps a level only if it is beatable for every door layout, all 3 stars are reachable, it fits the length, and the sloppy-player clear rates sit in the pack's band (Normal 45–95% / 15–80%, Hard 20–85% / 2–35%, tightest tap at least 70 / 50 ms). |
| `tools/check.js` | Level checker: a bot proves every level can be finished for every correct-door layout, measures each jump's timing window, and estimates how often a slightly sloppy player clears it. |
| `playtest/` | Headless Edge playtests over the DevTools protocol, with an in-page autopilot (`bot.js`). Scenarios live in `playtest/scenarios/`. Screenshots go to `playtest/shots/`. |

## Commands

Run these from the repository root:

```bash
npm run build
```

```bash
npm run check:dash
```

```bash
node games/dash/playtest/shoot.js games/dash/playtest/scenarios/music-remix.js
```

To remake a pack level, go to `games/dash/`, delete its file in `tools/gen-out/`, then:

```bash
node tools/genlevels.js n03
```

```bash
node tools/genlevels.js --combine
```

`npm run check:dash:quick` only proves the levels are beatable. The full `npm run check:dash` also prints the tightest jump windows and clear rates. Measured for the shipped levels (sloppy player, 25 ms / 40 ms timing error, ship flying and math not counted): Cloud Hop 97% / 74%, Lemon Lane ~50% / ~30%, Moonlit Meadow ~50% / ~14%, Starlight Drift ~35% / ~5%.

## Editing levels

Levels are lists of ASCII stamps in `src/engine.js` (bottom row sits on the ground):

`#` block · `^` `v` spike up/down · `,` small spike · `p` pad · `r` purple super pad · `o` yellow ring · `i` pink ring · `u` blue ring · `g` green ring · `S` rocket · `F` UFO · `W` wave · `B` ball · `C` cube · `G` `N` gravity flip/normal · `m` `M` mini/normal size · `<` `=` `>` slow/normal/fast speed · `*` star · `?` math question · `1` `2` `3` door lanes · `x` `y` `z` floating answer chips · `X` `Y` `Z` answer chips painted on a block

The builders `cubeGate()`, `ship()` (with `portal: 'F'` or `'W'` for UFO and wave corridors), `ball()` and `grav()` make the common pieces. `node tools/pieces.js <name>` tries one piece on its own and reports its tightest tap. After any change, run `npm run check:dash` so no level becomes impossible, then `npm run build` and push `docs/`.
