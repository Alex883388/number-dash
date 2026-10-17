# Number Arcade

Math, memory and English games for kids aged 8–12, made to be gentle on the eyes, with chill lo-fi music made live in the browser. Every game is one self-contained HTML page; together they make a small website that works offline and installs on an iPad home screen.

Play: https://alex883388.github.io/number-dash/ (on iPad: open in Safari, then Share > Add to Home Screen).

| # | Game | Link | How it plays |
| --- | --- | --- | --- |
| 1 | Number Dash | [/dash/](https://alex883388.github.io/number-dash/dash/) | A Geometry Dash–style runner with 40 levels. Jump the spikes, fly the rocket, steer into the lane whose door shows the right answer. Details in [games/dash/README.md](games/dash/README.md). |
| 2 | Number Ladder | [/ladder/](https://alex883388.github.io/number-dash/ladder/) | Climb a tower of 30 equations. The cube walks back and forth on its floor; tap to jump onto the answer platform with the right number. A right answer builds the next floor, a wrong one drops the cube all the way to the ground. |
| 3 | Pair Up | [/pair/](https://alex883388.github.io/number-dash/pair/) | A memory card game whose pairs belong together without looking alike: 7 × 8 and 56, a picture and its English word, hot and cold, 42 and forty-two. |
| 4 | Number Pop | [/pop/](https://alex883388.github.io/number-dash/pop/) | Tap the drifting bubbles whose numbers make the target ("Make 17"); later worlds bring minus bubbles and times. |
| 5 | Spell It | [/spell/](https://alex883388.github.io/number-dash/spell/) | Look, cover, spell: a picture and its word, read aloud; the word hides and the child spells it from memory with letter tiles. |
| 6 | English Quest | [/quest/](https://alex883388.github.io/number-dash/quest/) | Step by step from first words to IELTS band 8: seven CEFR stages of short lessons (words, grammar, listening, spelling, sentence building, reading, IELTS-style skills), a level test, stage tests and a review of mistakes. |

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
- **Math, English or Both** (a choice on home): English rungs ask past tenses (Past of buy: ?), plurals (One mouse, two ?), opposites and same-meaning words from `shared/english-words.js` (shared with Pair Up), easy at the bottom and academic near the top (criterion → criteria); with the level they shift a step easier or harder. Wrong options are real words or a typical wrong ending, never an accepted alternative. English answers do not count in the math record.
- **Records**: best rung, best time to the top, times reached the top, total falls. A "Best" flag on the wall marks the rung to beat. The sky turns from morning to sunset to night on the way up.
- **Controls**: tap anywhere (Space, ↑, W or Enter on a keyboard) to jump. Esc or P pauses, M mutes.

## Pair Up

- **Cards**: thirteen kinds. Times (6 × 7 ↔ 42), Plus & minus (13 + 8 ↔ 21) and Fractions (½ ↔ one half, then ¼ ↔ 0.25, then 20% ↔ ⅕) are math; Pictures (🍎 ↔ apple), Opposites (hot ↔ cold), Number words (42 ↔ forty-two; at 11–12 also ordinals, 21st ↔ twenty-first), Past tense (go ↔ went, then buy ↔ bought, then seek ↔ sought), Same meaning (big ↔ large, then error ↔ mistake, then purchase ↔ buy), Telling time (🕒 ↔ three o'clock, then 4:30 ↔ half past four, then 6:45 ↔ quarter to seven), Animal babies (🐄 cow ↔ calf, then 🦘 kangaroo ↔ joey, then 🦔 hedgehog ↔ hoglet) and Capital cities (Vietnam ↔ Hanoi, then Canada ↔ Ottawa, then Mongolia ↔ Ulaanbaatar) are English and knowledge; Go together pairs collocations (make ↔ a wish, then pay ↔ attention, then pose ↔ a threat), never dealing two cards that could both match (have breakfast and make); Mix deals a bit of each. The level (7–8, 9–10, 11–12, shared with the other games) picks harder facts and words.
- **A board**: 6, 8 or 12 pairs. Every card shows itself for 3–5 seconds first ("Remember them!"), then turns over. No face appears twice on a board, and no two facts share an answer, so a match is never ambiguous.
- **Turning cards**: two at a time; a pair stays up in green and the status line under the board shows what was learned (✓ 7 × 8 = 56). A wrong pair turns back after a second, or at once when a third card is tapped. Word cards are read aloud as they turn (switch on the home screen).
- **Stars**: by moves (two cards turned = one move). 3 stars at 1.6 moves a pair or fewer (1.75 on the 12-pair board), 2 stars at 2.4 (3 on the 12-pair board). A simulated player who remembers every card it has turned (ignoring the first look) gets 3 stars on 96–100% of boards; one who forgets a tenth of what it saw each turn gets 3 stars on 11–60% and 2 or more on 99–100%.
- **Records**: best moves per card kind and board size, boards cleared, pairs found. Matched math facts count as right answers, and missed facts from the other games come back here too.

## Number Pop

- **A round**: 10 targets. A sunny badge says "Make 17"; a strip under it shows the live sum ("8 + 9 = 17"). 8–10 bubbles drift slowly and bounce inside the field. Tap bubbles to build the sum, tap a picked one again to let it go. The exact target pops them (points, quick answers in a row make a streak); going over says "Too much!" and lets them go. After 15 s stuck, one bubble of an answer glows softly.
- **Worlds**: Make 10 (number bonds), Up to 20, Up to 50, Take away (minus bubbles; going over is allowed while a minus bubble can still fix it), Times (two bubbles that multiply; tables follow the shared level), Mix. Every target is built from bubbles already in the field, so it can always be made.
- **Stars**: by time (3 stars also needs 3 slips or fewer), set from a bot that thinks like a child (reading time, scanning, slower two-digit sums, carries, table recall): 3 stars at about 1.15× a quick 10-year-old's round, 2 stars at about 1.15× a relaxed one's. Solved targets count as right answers; a wrong times pair counts as a missed fact.

## Spell It

- **A word**: Look (a big picture and the word in boxes, read aloud, a 4 / 3 / 2 s bar for Easy / Medium / Hard), Cover (the letters hide), Spell (tap the letter tiles in order; the word's letters plus 2–4 decoys). A wrong letter is refused with a shake and counts a slip; after 3 slips on one letter the right tile gets a ring. "Hear it" is free; "Look again" shows the word for 1.5 s and the word no longer counts as perfect. A keyboard can type letters too.
- **Decks** (about 40 words per level each, 1,058 in all): Animals, Food, Around us, Actions, Body & clothes (a picture, or a short sentence clue where no picture fits), Number words (Easy 1–20, Medium 21–99 with a hyphen tile, Hard: a shared math fact to spell as its answer, 6 × 7 → forty-two), Tricky words (because, friend, believe… with a sentence clue that has a gap), Homophones (there / their / they're, flour / flower…: the sentence decides, the tiles can build every sound-alike, only the intended spelling counts) and Word endings (stop + ed → stopped, baby + s → babies, leaf + s → leaves; Easy no change and -es, Medium drop the e or double the letter, Hard y → i, f → ves and odd plurals). Only words spelled the same in US and UK English.
- **Listen only**: a switch on home for real dictation. The word is never shown, only the picture or clue and the voice; Look again is off, Hear it stays, and it keeps its own best stars.
- **A round**: 10 words; 3 stars for 9 or more perfect, 2 for 6 or more. Misspelled words (the last 20 per deck) come back in later rounds now and then; words spelled perfectly count as "Words learned".

## English Quest

- **Seven stages**, each a CEFR level: Starter (Pre-A1), Mover (A1), Flyer (A2), Explorer (B1, IELTS about 4.0–5.0), Achiever (B2, 5.5–6.5), Expert (C1, 7.0–7.5) and Band 8 (C1+, 8.0). Each stage has 5 lessons on child-friendly topics and a stage test. British English, as in IELTS.
- **A lesson** is about 12 questions built from the stage's banks (per lesson: 20 words, 10 grammar items, 6 sentences, 2 readings and up to 10 skill items), so a replay differs: words (picture, meaning, gap, listen, synonym, opposite, word family), grammar (from Mover up sometimes as "find the mistake": a wrong option is put in the gap and the child taps the wrong word; every grammar item can do this), spelling a word heard aloud, putting words in order, building a sentence heard aloud, IELTS skills from Explorer up (collocation, linking, paraphrase, register, cohesion, main idea), and a reading text with multiple choice and, from Explorer up, True / False / Not Given. From Flyer up about one lesson in three turns its reading into IELTS-style listening: the text is read aloud and hidden, the questions are answered from what was heard, and the text appears after each answer. Each answer gets a one-line explanation.
- **Step by step**: a lesson needs 60% to open the next one (stars at 60 / 75 / 90%); the stage test (20 questions) needs 80% to open the next stage. On a new device Start runs a short level test (three questions a stage, climbing while two of three are right) and opens the stages below the result.
- **Practice**: every missed item goes to Review until it is answered right; My words lists every word learned with its meaning and a speaker button, and Practise 10 words quizzes them; home shows a daily streak, words learned and a bar per skill (words, grammar, listening, spelling, reading, writing skills).
- **Honest limits**: the IELTS bands are practice estimates from the CEFR level. Speaking and writing are only practised in parts (sentence building, linking, register); the real test scores them with an examiner.
- **Content**: `games/quest/content/stage-<n>.json`, format in `games/quest/content/FORMAT.md`, checked by `node games/quest/tools/check-content.js`.

## Layout

| Path | What it is |
| --- | --- |
| `games/dash/` | Number Dash: engine, page template, level checker, pack generator, playtests (see its README). |
| `games/ladder/src/ladder.html` | Number Ladder: the whole game in one page (drawing, physics, questions, menus). |
| `games/ladder/playtest/` | Ladder scenarios: `climb.js` (a bot climbs through every moving trick with a picture of each, falls once on purpose, then reaches the top), `fairness.js` (how often a tap lands right, wrong or on nothing, per rung) and `arcade-ipad.js` (finger taps through the whole site on an emulated iPad, portrait, phone and offline). |
| `games/pair/`, `games/pop/`, `games/spell/`, `games/quest/` | Pair Up, Number Pop, Spell It and English Quest: one page each in `src/`, a `build.js`, and playtests in `playtest/`. English Quest also has `content/` (the seven stages) and `tools/check-content.js`. |
| `shared/` | Code the games share: math questions, English word facts (`english-words.js`: opposites, past tenses, same-meaning words, plurals), the music remix engine, sound effects, cube looks and drawing, and for the newer games `arcade-ui.css` (colours, buttons, menus, HUD, toasts) and `arcade-core.js` (helpers, the shared save, math bookkeeping, screens, read-aloud). A page marks the spot with `/*__SHARED:name__*/` (or `/*__SHARED:arcade-ui.css__*/` inside its style) and the build fills it in. |
| `web/` | The arcade home page (`hub.html`), the offline service worker, the app manifest and icons (`make-icons.js` redraws the icons). |
| `build.js` | Builds every game into `games/*/dist/` and the website into `docs/`: the home page, one folder per game, the manifest, icons and an offline cache whose version changes with the content. |
| `docs/` | The built website. GitHub Pages serves it from the `main` branch. Do not edit by hand. |

Progress is saved in each browser's localStorage: `number-dash.v1` holds Number Dash levels plus the settings (level, music, read-aloud) and math record every game shares; each other game keeps its records under its own key (`number-ladder.v1`, `pair-up.v1`, `number-pop.v1`, `spell-it.v1`, `english-quest.v1`). The home page reads them for its stats.

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

Play-test Pair Up (deals for every card kind and level, a memory bot, finger taps on an emulated iPad, portrait, phone, dark mode):

```bash
ND_URL=file:///D:/Github/number-dash/games/pair/dist/preview.html ND_READY='!!window.__pair' ND_BOT=none node games/dash/playtest/shoot.js games/pair/playtest/play.js
```

Play-test Number Pop (every world played by a quick and a relaxed bot; set POP_QUICK / POP_RELAXED rounds) and its iPad view; then Spell It (every deck and level, word lists, iPad view):

```bash
ND_URL=file:///D:/Github/number-dash/games/pop/dist/preview.html ND_READY='!!window.__pop' ND_BOT=none node games/dash/playtest/shoot.js games/pop/playtest/worlds.js
```

```bash
ND_URL=file:///D:/Github/number-dash/games/spell/dist/preview.html ND_READY='!!window.__spell' ND_BOT=none node games/dash/playtest/shoot.js games/spell/playtest/rounds.js
```

Swap in `ipad.js` (both games), `smoke.js` (Pop) or `words.js` (Spell) for their other checks. `arcade-ipad.js` above opens every game from the home page by finger.

Check English Quest's content, then play its whole journey (level test, every question kind, stage test, review, iPad, phone, dark mode, every stage):

```bash
node games/quest/tools/check-content.js
```

```bash
ND_URL=file:///D:/Github/number-dash/games/quest/dist/preview.html ND_READY='!!window.__quest' ND_BOT=none node games/dash/playtest/shoot.js games/quest/playtest/play.js
```

Several playtests can run at once when each gets its own browser port and profile: add `ND_CDP=9371 ND_PROFILE=edge-profile-pair` (any free port and folder name).

To publish, build, commit `docs/` and push to `main`; GitHub Pages updates in about a minute.

## Adding a game

1. Make `games/<name>/src/<name>.html`: styles (start them with `/*__SHARED:arcade-ui.css__*/`), then a `<!--BODY-->` line, then the page; its script starts with `/*__SHARED:arcade-core__*/`. Add an `<a class="btn" data-hub hidden href="../">All games</a>` and call `arcadeLinks()`. `games/pair/src/pair.html` is the smallest example.
2. Give it a `games/<name>/build.js` that exports a `build()` returning the page (copy the ladder's).
3. Add its folder to the list in `build.js`, a card in `web/hub.html` and its folder to `CORE` in `web/sw.js`.
