# Number Arcade

Math, memory, English, coding, business and action games for kids aged 8–12, made to be gentle on the eyes, with music made live in the browser. Every game is one self-contained HTML page; together they make a small website that works offline and installs on an iPad home screen.

Play: https://alex883388.github.io/number-dash/ (on iPad: open in Safari, then Share > Add to Home Screen).

Above it, a **New in the arcade** card lists the latest additions (each a link) until the child taps Got it (`arcade-news.v1` remembers which batch was seen). The home page opens with **Today**: three suggestions from the child's own records (English Quest every day, plus a math or coding game and a memory, spelling or business game that change by the day) and the daily streak across all games. Under the stats, **Badges**: 21 awards earned from the games' own records (First star, Halfway up, Word wizard, On fire, Sharp mind, Brave speaker, Young coder, Street smart, Tycoon, All-rounder… up to Dash champion); one earned since the last visit says New! once (remembered in `arcade-badges.v1`). **Progress for parents** (folded under the stats) sums up English stage and IELTS estimate, speaking practices and the last IELTS reading and listening practice bands, words learned and spelled, math answers and facts still being practised, memory boards, Code Robot levels and stars, the best Tycoon Town company (worth, month, CEO title, traps avoided), game stars and days played in the last week.

| # | Game | Link | How it plays |
| --- | --- | --- | --- |
| 1 | Number Dash | [/dash/](https://alex883388.github.io/number-dash/dash/) | A Geometry Dash–style runner with 50 levels. Jump the spikes, fly the rocket, steer into the lane whose door shows the right answer. Details in [games/dash/README.md](games/dash/README.md). |
| 2 | Number Ladder | [/ladder/](https://alex883388.github.io/number-dash/ladder/) | Climb a tower of 30 equations. The cube walks back and forth on its floor; tap to jump onto the answer platform with the right number. A right answer builds the next floor, a wrong one drops the cube all the way to the ground. |
| 3 | Pair Up | [/pair/](https://alex883388.github.io/number-dash/pair/) | A memory card game whose pairs belong together without looking alike: 7 × 8 and 56, a picture and its English word, hot and cold, 42 and forty-two. |
| 4 | Number Pop | [/pop/](https://alex883388.github.io/number-dash/pop/) | Tap the drifting bubbles whose numbers make the target ("Make 17"); 16 worlds from number bonds to times, division, money, fractions, decimals, numbers below zero, doubling and halving, place value, brackets and percentages. |
| 5 | Spell It | [/spell/](https://alex883388.github.io/number-dash/spell/) | Look, cover, spell: a picture and its word, read aloud; the word hides and the child spells it from memory with letter tiles. |
| 6 | English Quest | [/quest/](https://alex883388.github.io/number-dash/quest/) | Step by step from first words to IELTS band 8: seven CEFR stages of short lessons (words, grammar, listening, spelling, sentence building, reading, IELTS-style skills), a level test, stage tests and a review of mistakes. |
| 7 | Memory Lane | [/memory/](https://alex883388.github.io/number-dash/memory/) | Short, calm working-memory rounds: numbers, picture words or lit squares show one at a time; the child taps them back in order, or backwards. Two right in a row adds one more, two wrong takes one off. |
| 8 | Code Robot | [/robot/](https://alex883388.github.io/number-dash/robot/) | Program a robot with blocks and watch it run: 208 levels in 11 worlds, from first steps to loops, functions, if-then, painting pictures, robot teams, counters, reading code and fixing bugs. Fewer blocks, more stars. |
| 9 | Tycoon Town | [/tycoon/](https://alex883388.github.io/number-dash/tycoon/) | Grow a company from a $500 lemonade stand to a billion-dollar empire in one of four living 2.5D cities (by the sea, in the desert, on a neon strip, among cherry blossoms): 50 businesses up to an international airport, land to buy before it runs out, rivals to beat, 150 business cases to solve like a CEO, seasons, carnivals, storms and earthquakes to insure against, and scams to spot. |
| 10 | Mech Blaster | [/mech/](https://alex883388.github.io/number-dash/mech/) | Pilot a battle mech down a 2.5D road through five worlds and 50 levels: dodge, jump and blast drones, walkers, turrets, bikes, bombers, spiders and giant bosses with eight weapons, and open every gate by shooting the right number or missing word. |

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
- **Math, English, Quiz or Mixed** (a choice on home): English rungs ask past tenses (Past of buy: ?), plurals (One mouse, two ?), opposites, same-meaning words and the right spelling among common misspellings (Right spelling: ? → because / becuse / becos, up to accommodation) from `shared/english-words.js` (shared with Pair Up), easy at the bottom and academic near the top (criterion → criteria); with the level they shift a step easier or harder. Wrong options are real words or a typical wrong ending, never an accepted alternative. English answers do not count in the math record. Quiz rungs ask general knowledge from `shared/knowledge.js` (capital cities, animal babies, science, geography, time and calendar, and animal facts, from "Bees make: ?" to "Fe is the symbol for: ?" and "The line of 0° longitude: ?"); Mixed takes the three in turn at random. A longer question wraps onto two lines.
- **Records**: best rung, best time to the top, times reached the top, total falls. A "Best" flag on the wall marks the rung to beat. The sky turns from morning to sunset to night on the way up.
- **Controls**: tap anywhere (Space, ↑, W or Enter on a keyboard) to jump. Esc or P pauses, M mutes.

## Pair Up

- **Cards**: sixteen kinds. Times (6 × 7 ↔ 42), Plus & minus (13 + 8 ↔ 21) and Fractions (½ ↔ one half, then ¼ ↔ 0.25, then 20% ↔ ⅕) are math; Pictures (🍎 ↔ apple), Opposites (hot ↔ cold), Number words (42 ↔ forty-two; at 11–12 also ordinals, 21st ↔ twenty-first), Past tense (go ↔ went, then buy ↔ bought, then seek ↔ sought), Same meaning (big ↔ large, then error ↔ mistake, then purchase ↔ buy), Telling time (🕒 ↔ three o'clock, then 4:30 ↔ half past four, then 6:45 ↔ quarter to seven), Animal babies (🐄 cow ↔ calf, then 🦘 kangaroo ↔ joey, then 🦔 hedgehog ↔ hoglet) and Capital cities (Vietnam ↔ Hanoi, then Canada ↔ Ottawa, then Mongolia ↔ Ulaanbaatar) are English and knowledge; Go together pairs collocations (make ↔ a wish, then pay ↔ attention, then pose ↔ a threat), never dealing two cards that could both match (have breakfast and make); Shapes pairs a shape or geometry word with what it is (hexagon ↔ 6 sides, then obtuse angle ↔ between 90° and 180°, then radius ↔ centre to the edge), again never two cards that could both fit; Body & science pairs a body part or science word with what it does (heart ↔ pumps blood, then friction ↔ slows moving things down, then chlorophyll ↔ green pigment in leaves); Prefixes pairs a word with what its prefix makes it mean (unhappy ↔ not happy, then misspell ↔ spell wrongly, then submarine ↔ a boat under the sea); Mix deals a bit of each. Longer card texts break onto two or three lines, whichever gives the biggest letters. The level (7–8, 9–10, 11–12, shared with the other games) picks harder facts and words.
- **A board**: 6, 8 or 12 pairs. Every card shows itself for 3–5 seconds first ("Remember them!"), then turns over. No face appears twice on a board, and no two facts share an answer, so a match is never ambiguous.
- **Turning cards**: two at a time; a pair stays up in green and the status line under the board shows what was learned (✓ 7 × 8 = 56). A wrong pair turns back after a second, or at once when a third card is tapped. Word cards are read aloud as they turn (switch on the home screen).
- **Stars**: by moves (two cards turned = one move). 3 stars at 1.6 moves a pair or fewer (1.75 on the 12-pair board), 2 stars at 2.4 (3 on the 12-pair board). A simulated player who remembers every card it has turned (ignoring the first look) gets 3 stars on 96–100% of boards; one who forgets a tenth of what it saw each turn gets 3 stars on 11–60% and 2 or more on 99–100%.
- **Records**: best moves per card kind and board size, boards cleared, pairs found. Matched math facts count as right answers, and missed facts from the other games come back here too.

## Number Pop

- **A round**: 10 targets. A sunny badge says "Make 17"; a strip under it shows the live sum ("8 + 9 = 17"). 8–10 bubbles drift slowly and bounce inside the field. Tap bubbles to build the sum, tap a picked one again to let it go. The exact target pops them (points, quick answers in a row make a streak); going over says "Too much!" and lets them go. After 15 s stuck, one bubble of an answer glows softly.
- **Worlds** (16): Make 10 (number bonds), Up to 20, Up to 50, Take away (minus bubbles; going over is allowed while a minus bubble can still fix it), Times (two bubbles that multiply; tables follow the shared level), Mix, Make 100 (tens and ones), Share it (division: two bubbles that divide to the target), Money (British coins and a note, 85p or £3.10), Fractions (one family per round, quarters to sixths by level, drawn stacked), Decimals (worked in hundredths), Below zero (plus and minus across zero), Double & halve and Brackets (the question is in the target box, e.g. "Half of 86" or "(10 + 15) ÷ 5", and one bubble holds the answer; a typical slip floats among them and a tip shows the first step after 12 seconds), Place value (make 645 from 600, 40 and 5; four digits with a zero later in the round) and Percent (pink 10, 20, 25, 50 and 75% bubbles: make 10 from 25% and 40). Every target is built from bubbles already in the field, so it can always be made.
- **Stars**: by time (3 stars also needs 3 slips or fewer), set from a bot that thinks like a child (reading time, scanning, slower two-digit sums, carries, table recall): 3 stars at about 1.15× a quick 10-year-old's round, 2 stars at about 1.15× a relaxed one's. Solved targets count as right answers; a wrong times pair counts as a missed fact.

## Spell It

- **A word**: Look (a big picture and the word in boxes, read aloud, a 4 / 3 / 2 s bar for Easy / Medium / Hard), Cover (the letters hide), Spell (tap the letter tiles in order; the word's letters plus 2–4 decoys). A wrong letter is refused with a shake and counts a slip; after 3 slips on one letter the right tile gets a ring. "Hear it" is free; "Look again" shows the word for 1.5 s and the word no longer counts as perfect. A keyboard can type letters too.
- **Decks** (about 35–40 words per level each, 1,584 in 14 decks): Animals, Food, Around us, Actions, Body & clothes (a picture, or a short sentence clue where no picture fits), Number words (Easy 1–20, Medium 21–99 with a hyphen tile, Hard: a shared math fact to spell as its answer, 6 × 7 → forty-two), Tricky words (because, friend, believe… with a sentence clue that has a gap), Homophones (there / their / they're, flour / flower…: the sentence decides, the tiles can build every sound-alike, only the intended spelling counts) and Word endings (stop + ed → stopped, baby + s → babies, leaf + s → leaves; Easy no change and -es, Medium drop the e or double the letter, Hard y → i, f → ves and odd plurals). IELTS spelling (the words test-takers most often misspell, accommodation to questionnaire, with sentence clues; British spelling, labelled so) Science (moon and magnet up to photosynthesis), Feelings & people (proud, cousin, up to considerate), Places & geography (river, harbour, up to archipelago and Kilimanjaro) and Time & calendar (noon, fortnight, up to chronological and equinox). Apart from IELTS spelling and the last three (British forms such as mum, harbour, autumn), only words spelled the same in US and UK English; names of places, days and months keep their capital letter, and only the capital tile counts. On a phone, words of 12+ letters split their boxes into two rows at a natural point (occasion | ally).
- **Listen only**: a switch on home for real dictation. The word is never shown, only the picture or clue and the voice; Look again is off, Hear it stays, and it keeps its own best stars.
- **A round**: 10 words; 3 stars for 9 or more perfect, 2 for 6 or more. Misspelled words (the last 20 per deck) come back in later rounds now and then; words spelled perfectly count as "Words learned".

## English Quest

- **Seven stages**, each a CEFR level: Starter (Pre-A1), Mover (A1), Flyer (A2), Explorer (B1, IELTS about 4.0–5.0), Achiever (B2, 5.5–6.5), Expert (C1, 7.0–7.5) and Band 8 (C1+, 8.0). Each stage has 6 lessons on child-friendly topics (42 in all) and a stage test that samples five of them. British English, as in IELTS.
- **A lesson** is about 12 questions built from the stage's banks (per lesson: 20 words, 10 grammar items, 6 sentences, 2 readings and up to 10 skill items), so a replay differs: words (picture, meaning, gap, listen, synonym, opposite, word family), grammar (from Mover up sometimes as "find the mistake": a wrong option is put in the gap and the child taps the wrong word; every grammar item can do this), spelling a word heard aloud, putting words in order, building a sentence heard aloud, IELTS skills from Explorer up (collocation, linking, paraphrase, register, cohesion, main idea), and a reading text with multiple choice and, from Explorer up, True / False / Not Given. From Flyer up about one lesson in three turns its reading into IELTS-style listening: the text is read aloud and hidden, the questions are answered from what was heard, and the text appears after each answer. Each answer gets a one-line explanation.
- **Step by step**: a lesson needs 60% to open the next one (stars at 60 / 75 / 90%); the stage test (20 questions) needs 80% to open the next stage. On a new device Start runs a short level test (three questions a stage, climbing while two of three are right) and opens the stages below the result.
- **Practice**: every missed item goes to Review until it is answered right; My words lists every word learned with its meaning and a speaker button, and Practise 10 words quizzes them; home shows a daily streak, words learned and a bar per skill (words, grammar, listening, spelling, reading, writing skills).
- **Writing builder** (Explorer up): a lesson may ask to put a paragraph back in order (4–5 sentences joined by reference words and linking, so only one order works), to pick the more precise academic wording, the best topic sentence or the clearest thesis statement for a Task 2 question; each stage test includes a paragraph.
- **IELTS reading test** (from Achiever up): two passages from the highest stages reached, all ten questions, 18 minutes on the clock and no feedback until the end; the score is mapped to the band the same share of 40 questions would give (9/10 ≈ 8.0, 8/10 ≈ 7.0, 7/10 ≈ 6.5). Results are kept, and misses go to Review.
- **Speaking practice**, both in `content/speaking.json`, nothing scored, finished practice counted. **Part 1** (from Mover up): 18 topics (3 per stage), four short questions read aloud one at a time, 20 seconds to answer each out loud, then a 2–3 sentence model answer at that stage's level. **Part 2** (from Explorer up): 24 cue cards (6 per stage), 1 minute to plan, up to 2 minutes to talk, then a model answer (read aloud on request), 5 useful phrases and 3 Part 3 questions.
- **Chart language** (from Achiever up, IELTS Writing Task 1): two made-up line charts over six years, four questions each: which phrase describes a change (rose sharply / slightly, remained stable, fell slightly / sharply), the peak year, the best overview sentence, and peak or low point. Every step is drawn inside one band and the bands have gaps (checked after rounding), so the right phrase is never in doubt; the feedback gives the percentage.
- **Grammar notes**: the rule behind every grammar question of the lessons opened so far (10 per lesson), each with its example sentence filled in; newest lesson first and unfolded.
- **Word of the day** on the home screen: one word from the stage the child is on (a new one each day while unknown words are left), with its meaning, an example sentence and 🔊; Learn it adds it to My words. Opening the app does not count as a day played.
- **IELTS listening test** (from Achiever up): the same two-talk format with the passages spoken and never shown, each talk heard at most twice (the real test plays it once), 20 minutes, no feedback until the end, scored on the listening band table (8/10 ≈ 7.5).
- **Honest limits**: the IELTS bands are practice estimates from the CEFR level. Speaking (no recording or marking) and writing are only practised in parts (sentence building, linking, register); the real test scores them with an examiner.
- **Content**: `games/quest/content/stage-<n>.json`, format in `games/quest/content/FORMAT.md`, checked by `node games/quest/tools/check-content.js`.

## Memory Lane

- **Three games** (a choice on home, with the shared level, a Backwards switch, read-aloud and music): **Numbers** (digits shown one at a time and read aloud, tapped back on a 0–9 pad with Undo; no digit twice, no runs of three), **Words** (picture words, each from a different family of look-alikes, tapped back from 6 to 12 cards that include look-alike distractors such as cat and tiger; 44 words per level, British words like biscuit and ladybird) and **Grid** (squares light up one by one in a 3 × 3 grid, 4 × 4 from span 6 / 5 / 4 by level).
- **Span**: two right in a row adds an item, two wrong take one off (never below 2); up to 9 for Numbers and Grid, 7 for Words. The first round starts at 3 (2 backwards), later ones two below the best. About 1 s per item (1.4 s for a picture word), a little faster at longer spans; a short "Watch" before each sequence and a pause before answering.
- **Round**: 10 sequences or 2 minutes. A wrong answer gets kind words and the right order shown, never a fail sound. Stars by the longest span: Numbers 6 / 5, Words and Grid 5 / 4 (one lower backwards).
- **Records** in `memory-lane.v1`: `best`, `stars` and `plays` per game (`number`, `word`, `grid`, plus `-back`), `rounds` and `seqs`. The hub shows the longest number span, a Sharp mind badge at 6, and the spans in Progress for parents.

## Code Robot

- **The idea**: a first programming game. The child builds a program from blocks, presses Run and watches a friendly robot follow it block by block (the running block lights up) to the flag, collecting every gem on the way. A program that misses tells him kindly what happened, and Step runs it one block at a time to find the bug.
- **208 levels in 11 worlds**, in playing order: Sequences (8), Loops (20), Functions (20), Mixed-up Code (20), Shrink It (20), Pixel Painter (20), Conditions (20), Robot Team (20), Counters (20), Code Reader (20), Debugging (20). Each world opens with a one-line idea card read aloud, each level has a hint, a world opens when the one before has 6 levels done, and levels open in order. The levels are data in `content/` (one `world-<id>.json` per world; `worlds.json` sets the order; how to write them in `content/FORMAT.md`).
- **Five kinds of level**: *build* (fill an empty program), *fix* (Debugging: a program with a bug, to fix in few changes), *order* (Mixed-up Code: all the right blocks in a muddle; blocks can only be moved), *shrink* (Shrink It: a working program far over the block limit, to make short with Repeat and F1) and *predict* (Code Reader: read the program and tap the square where the robot will stop; a first miss only says so, a second lets the robot show the answer).
- **Blocks**: Forward, Turn left, Turn right, Paint, Repeat 2–9 or n (nested), F1 (his own block, built once in its own row), If path ahead / left / right (with else), If gem here, Repeat until flag (300 steps make the robot dizzy and stop it), and the robot's number n with n + 1 and n − 1.
- **Maps**: walls, water, gems and a flag; pictures to paint (Pixel Painter: every dotted square and nothing else); teams (Robot Team: two or three robots, yellow, blue and pink, each in its own area with its own flag, run the same program one after the other).
- **Touch first, no dragging**: tapping a gap moves the insertion cursor (inside loops, Ifs and the F1 row too); a tapped block gets a bar with Move left, Delete, Move right and Done; Undo, Clear, Run, Step, a speed switch and Reset. Code Reader levels are read-only: the child taps a square of the map, then Check.
- **Stars**: by blocks against par in build, fix and shrink levels (3 at par or fewer, 2 up to two over, 1 for any working program; each level has a block limit); by tries in Mixed-up Code and Code Reader (3 right first time, 2 the second time, 1 after that).
- **Saving**: automatic, in `code-robot.v1` (stars and fewest blocks, or fewest tries, per level; levels done, total stars, the last level, every level's unfinished draft, the speed). A save code (`CR1-` then base64 JSON) moves progress to another device. World ids never change (the screen numbers worlds by playing order), so saved progress stays put when worlds are added or moved.
- **Proof** (`node games/robot/tools/check.js`, using the game's own interpreter `src/engine.js`): every solution works within par and the limit, and each world's idea is really needed: no plain list fits a loop, function, condition, painting, team or counter level; par is the shortest loop program in Loops; no program without F1 fits a function level that offers Repeat; no program of fixed Repeats fits a counter level; bugs, muddles and long programs fail or work as they should. `tools/trace.js` shows a program's path on a level and cuts corridor maps out of a program's path, for writing levels.

## Tycoon Town

- **The idea**: a business and city-building game about thinking like a CEO with street smarts. A new company picks its city and starts with $500 on the city's market street; it opens businesses, picks good spots, buys land, solves business cases, beats rivals, avoids scams, insures against disasters and grows its net worth to open the next district ($4,000, $100,000 and $2 million) and at last the Gateway with its airport and port ($25 million), on the way to Tycoon of the Year ($100 million) and a billion.
- **Four cities** (`src/city.js`): each an island of 72 × 72 tiles with hills and mountains, cliffs down to the sea, its own landmarks and the same five districts under its own names. **Seaside Bay** (Market Street, High Street, Downtown, Skyline & Harbour, Gateway): a river city with beaches, farms, a forest, snowy mountains, a lighthouse, wind turbines, docks with cruise ships and an international airfield. **Desert Oasis** (Old Souk, Palm Road, Downtown, Marina Towers): dunes and red rock, a palm-shaped island with villas and its hotel, a creek full of dhows, a needle tower, a ring museum, an old fort, a camel race track, a camel caravan, hot-air balloons and a monorail to the island. **Neon City** (Old Town, Main Street, Downtown, The Strip): a desert valley in a ring of mountains with a strip of giant themed resorts (a dark glass pyramid with its light beam, a giant sphere that changes its picture, a castle, a big wheel, a Paris tower, a volcano that erupts, a fountain show, a sky tower), a light-show canopy downtown, a lake with a dam, a monorail and helicopters; it is far from the sea, so it has no container port. **Sakura City** (Shotengai, Ginza Street, Downtown, Bay Towers): cherry blossoms, a castle on its stone base inside a moat, a pagoda, a shrine, gates standing in the sea, a red lattice tower, the scramble crossing, a covered arcade, a hot spring, a bullet train and a great snowy volcano. Lots per city (market / high / downtown / towers / Gateway): Seaside Bay 114 / 87 / 146 / 40 / 13 (the first big map's lots did not move), Desert Oasis 73 / 88 / 98 / 54 / 12, Neon City 136 / 112 / 90 / 72 / 14, Sakura City 98 / 99 / 112 / 22 / 23.
- **The map** (`src/map.js`, with the pictures in `src/art-kit.js`, `art-build.js` and `art-land.js`): drag to look around, pinch or wheel to zoom (it settles on fixed zoom steps); the buttons fly to a district or show the whole island. The neighbours' buildings follow the city's style (souk houses with wind towers, white villas, ranch houses, motels and diners with neon signs, wooden shop-houses with tiled roofs and lanterns...), and the Gateway's mega businesses fill lots of 3 × 3 tiles.
- **Seasons**: blossom in spring (cherry petals drift through Sakura City), green summers, red and gold autumns with falling leaves, and winter: snow on the ground, the roofs and the trees, frozen ponds and falling snow in the snowy cities (Seaside Bay, Sakura City); the desert cities stay mild, with snow on the high peaks. A month of snow, rain or a heatwave changes what sells.
- **A living city**: cars and taxis, buses, trains, a bullet train, monorails, ferries, sailing boats, dhows, container ships, planes, a camel caravan, balloons and helicopters; people walk the pavements and customers walk into the company's businesses (more of them at busy hours, fewer when roadworks block the street, none while it is closed, crowds on carnival day); the light follows the clock, with lit windows, street lamps, lanterns and neon signs.
- **Things that happen on the map** (the engine rolls them with each city's own odds, at most one new one a month): roadworks dig up the street outside one of the company's businesses for a month or two (barriers, cones and a digger; cars go round; 35% fewer customers next to it); a carnival parade (a samba carnival, a desert festival with decorated camels, a neon parade, a matsuri with portable shrines and a dragon) closes its route for the afternoon: food, shops and fun on it are packed, offices and services lose customers, and there is litter to clear; an earthquake shakes the map, raises dust and cracks the roads, and buildings near its centre need repairs or close for safety checks; a flood covers the low ground by the water; storms, typhoons (Sakura City) and sandstorms (the desert cities) keep people at home, worst by the water. Storms, floods, typhoons and sandstorms are forecast at dawn, the carnival and the roadworks announced; a banner shows each one when it starts, with a button that flies the map there, and the bills pop up over the businesses they hit.
- **Insurance**: a button on each business (and Insure all in the Company panel): a premium paid every month, higher by the water and in a city with many disasters; it pays 80% of the repairs (the company pays the rest, the excess) and half of a bad month, but not the clean-up after a parade or the sand in the machines. No insurer sells a new policy while a storm warning is out.
- **Time**: a month plays as one working day, 07:00 to 21:00, two seconds an hour at 1× (2× and 4× are faster, ⏸ pauses, Next month jumps to the evening). Every hour each business's money pops up over it and goes into the cash; at 21:00 night falls, the month closes (tax, interest, cases, the city growing, rivals) and a short summary shows, with the full report a tap away (it opens by itself for goals, a new district, a rival, a forced sale or a case left too long). The clock waits while a dialog is open or a spot is being picked. The morning's notes (a case, a warning, the news, a new season) come one after another.
- **Location matters**: every business likes some things near its lot (`likes` in `roster.json`): a lemonade stand a park, a school and visitors; bubble tea a school; an ice cream parlour the beach; an office the station; a hotel the sights and the water; flats a quiet green street, not the docks; an airline the airport; a container port, a cruise terminal and a shipyard must stand by the harbour and the international airport by the airfield (`needs`). A lot changes sales from −25% to +50%, shown as 1–5 stars with the reasons, on the glowing lots when choosing a spot and on the lot's panel.
- **The city fills up**: most lots are built on at the start (half of the Gateway); each month others buy lots (building sites with cranes, then a building) and now and then one comes up for sale again. Land gets dearer as free lots run out (supply and demand), so buying a lot early keeps it. A few harbour and airport lots always stay free for the businesses that need them.
- **Rivals** (`content/rivals.json`): a business like one of yours can open close by and take 15–25% of its customers. A rival case (5 kinds: food, shop, service, property, big company) asks what to do: being better, a loyalty card or great service shields the business and makes the rival close sooner; a price war hurts both; lies, fake reviews and price-fixing are traps.
- **50 businesses**, 10 per district, from a $150 lemonade stand to an $80 million satellite company (roster in `content/roster.json`, where all the numbers live): each has a price, a usual monthly profit range, a risk level (low / medium / high / very high), an industry, a season and its likes. Within a district, riskier businesses earn more on average; four are properties (flats, offices, a shopping centre, a skyscraper) that earn steady rent and grow with the city. The Gateway's ten are an international airport, a cruise terminal, a shipyard, a bullet train line, a film studio, a mega resort, a concert arena, a robot factory, a satellite company and a clean power plant. Each business can be owned once and has its own building on the map (a lemonade stand, a barber's pole, a stadium, a rocket on its launch pad, a terminal with planes at its gates, a ship in dry dock, an arena with a domed roof, a giant robot arm, wind turbines...).
- **Business cases**: every business brings three (`content/biz-1..5.json`): an opening case the moment it opens, then a problem and an opportunity or tricky offer later. Each has 4–5 choices; several can work, one is the smartest, and at least one per business is a trap (a scam, an unsafe shortcut, a dishonest trick). On the market street he picks one choice; from the second district up, up to two (two good ideas together score as well as the best one). Afterwards he sees his stars, the lesson, and what every other choice would have done. A case left for three months costs reputation and sales.
- **Offers** (`content/offers.json`, 18): texts, calls, emails, strangers, a pyramid scheme, invoice fraud, ransomware, an insider tip, a bribe dressed as a fee — and real chances (a fair pitch, a council grant, a wholesaler, a chef, a bank loan) where the right answer is to check, then accept.
- **City news**: heatwave, rain, snow, festival, tourists (summer in the snowy cities, winter in the desert), back to school, cup final, a recession that loyal customers soften, a tech boom, green and online booms, going viral, a new metro line, interest rates up.
- **Money tools**: the bank lends up to half of the company's net worth at 1.5% a month; a business sells for what it really earns, minus a 10% fee; overdraft costs 4% a month, and a deep overdraft makes the bank sell the smallest business.
- **Learning**: CEO stars and titles (Trainee to Tycoon), eight skills, traps avoided, rivals outlasted, 38 goals with prizes that scale with the company (up to a billion), a CEO handbook of words (profit, rent, location, supply and demand, competition, interest, insurance, premium, excess, diversify, scam…) and Coach Owl's tip, which also warns about a storm on the way and a company without insurance.
- **Saving**: automatic after every move and every few game hours, in three slots on the device (`tycoon-town.v1`), including the hour of the day, the city and the day's incidents; a month played marks the day for the streak, opening the page does not. A save code (copy and paste) or a save file moves a company to another device or keeps a backup. The game's chance comes from its own seeded generator, so a resumed game continues exactly. Saves from the earlier versions move onto Seaside Bay (the second version's lots stay where they were, and the Gateway is added).
- **Balance** (`node games/tycoon/tools/sim.js`, 40 games per player type in each city, the careful player picking the best spots): a careful CEO opens the second district in about 7–9 months, Downtown in about 29–33, the towers in about 68–74, the Gateway in about 102–113, reaches $100 million in about 126–139 and a billion in about 165–181 (Sakura City, with its earthquakes and typhoons, is the slowest); a careful CEO who insures everything ends up about as rich as one who does not (insurance smooths the bumps); a random clicker reaches Downtown in about 99 months, and a player who falls for every trap never reaches the towers. A city sees about 2–3 incidents a year.
- **Speed and memory**: the ground is painted in 8 × 8-tile pieces and every building once per zoom step, then copied pixel for pixel; far away, the whole island is one picture: in a headless browser without a graphics card about 6 ms a frame at normal zoom, 14 ms at the closest and well under 1 ms for the whole island, with at most about 120 MB of building pictures and 96 MB of ground.

## Mech Blaster

- **The idea**: an action game where the answers are the ammunition. The child pilots a battle mech seen from behind, walking down a three-lane road in 2.5D (a camera behind and above, a road that bends and climbs, scenery sliding by). Robots attack all the way; gates block the road with a question and three answer panels, one per lane: shoot the right one and the gate blows open.
- **Questions**: numbers, missing words or both (the home card), at the age chosen there (7–8, 9–10, 11–12; the same setting as the other games), harder in later worlds. Numbers come from the arcade's shared math facts (a fact missed comes back later in every game). Missing words come from 900 sentences (`content/words-0..2.json`, 300 per age, written to `content/FORMAT.md`): verb tenses, irregular pasts, plurals, articles, pronouns, prepositions, homophones, spelling, opposites, vocabulary, comparatives, conjunctions, modals, word forms, collocations and idioms. Every sentence has exactly one right word and a tip that teaches the rule; a wrong shot shows the tip, cracks that panel and zaps the mech a little; after two wrong shots (or 16 seconds) the right panel glows. Read aloud says the question.
- **Controls**: ◀ ▶ (or a swipe) change lanes, Jump (or a swipe up) jumps; tap an enemy to fire at it (a finger kept down keeps firing; aim help picks the enemy nearest the finger); tap a panel to answer. Keyboard: arrows, Space, click, 1–7 weapons, N nova, Z X C panels, P pause.
- **Dodging** has three simple rules, taught in the briefings: red balls follow the mech up, so move to another lane; orange waves skim the road, so jump them; red lanes and red circles on the road (a laser, a bomb, fire) mean get out of that lane.
- **Ten enemies**, met one by one (each gets a briefing card with its picture and how to beat it): Buzz Drone (level 1), Walker Bot (2), Turret with a warning laser (4), Hover Bike that blinks before it changes lanes (5), Shield Bot whose shield stops the blaster (12), Bomber Ship whose bombs fall on red circles (15), Spider Mech with lane-wide ground waves (22), Laser Sentinel that lights a lane, then fires down it (26), Rival Mech with homing missiles to shoot down (33) and the huge Carrier Ship that launches drones (43). Obstacles: crates (sometimes a prize inside), low barriers and laser fences to jump, mines, tall blocks to go round, rolling boulders and snowballs, lava geysers.
- **Bosses** every tenth level: the Iron Crab, the Sand Scorpion, the Frost Titan, the Magma Dragon and the Omega Core, each with its own attacks (claw slams, tail sweeps, rolling snowballs, fire breath over two lanes, rings to jump). A question shield protects each: shoot the right answer orb and the shield breaks, then blast the boss while it is open; every third of its strength brings the shield back with a new question (a wrong orb makes it strike back). Going down in a boss fight starts again at the boss.
- **Eight weapons**, one more after levels 4, 9, 14, 19, 24, 29 and 39: Blaster, Twin Gatling (heats up), Homing Rockets (fly over shields), Chain Lightning, Plasma Cannon (hold to charge, breaks shields), Freeze Ray, Laser Lance (a beam that heats up) and the Nova Bomb (two a level). The mech's arm cannons change with the weapon. The guns reach 72 m, so enemies far down the road come closer before they can be hit.
- **Five worlds** with their own sky, scenery, weather and music: Neon City (night, rain), Dune Desert (mesas, cacti, palms), Frost Peaks (snowy pines, snowmen, falling snow), Volcano Forge (a smoking volcano, lava vents, embers) and Star Station (a road over space by a ringed planet).
- **Stars**: one for clearing a level, two if the mech never went down, three if every answer was right first time too. A mech that goes down starts again from the last gate it opened, with full armour. Pickups: repair, shield, double damage, a nova bomb, gems. Points for every robot, more in a combo; eight paint colours for the mech, more with more stars.
- **Saving**: `mech-blaster.v1` (levels and stars, best scores, the last level, the question choice, the paint, the weapon in hand, the robots met and missed sentences to ask again); a level played marks the day for the streak.
- **Levels** (`node games/mech/tools/genlevels.js` writes `content/levels.json`): set pieces (drone flights, walker lines, turret posts, bike rushes, shield bots, bomber runs, spiders, sentinels, rivals, carriers, crate rows, barriers, fences, mine fields, blocks, boulders, geysers, pickups and gem rows) laid along the road by a seeded generator: the new thing of a level comes alone and early, and each world mixes in its own enemies. 2–4 gates a level, 65–110 seconds; bosses about two minutes.
- **Proof and balance** (`node games/mech/tools/check.js`): two test pilots play every level (`MB.bot` in the engine sees what is coming, picks a lane, jumps, shoots and answers). The good pilot must clear every level; the child-like pilot (slower, misses a third of its shots, right 80% of the time) clears every level up to 29 without going down and most of the later ones (55–65% of its armour left near the end); the bosses beat it a third to a half of the time, and it wins them on a retry.
- **Speed**: the sky and scenery are painted once per screen size and then only copied; the boss's shield is a picture made once. In a headless browser without a graphics card a busy late-level frame takes about 9 ms and the final boss about 11 ms; if a device keeps taking longer than 26 ms a frame, the page draws fewer pixels.

## Layout

| Path | What it is |
| --- | --- |
| `games/dash/` | Number Dash: engine, page template, level checker, pack generator, playtests (see its README). |
| `games/ladder/src/ladder.html` | Number Ladder: the whole game in one page (drawing, physics, questions, menus). |
| `games/ladder/playtest/` | Ladder scenarios: `climb.js` (a bot climbs through every moving trick with a picture of each, falls once on purpose, then reaches the top), `fairness.js` (how often a tap lands right, wrong or on nothing, per rung) and `arcade-ipad.js` (finger taps through the whole site on an emulated iPad, portrait, phone and offline). |
| `games/pair/`, `games/pop/`, `games/spell/`, `games/quest/`, `games/memory/` | Pair Up, Number Pop, Spell It, English Quest and Memory Lane: one page each in `src/`, a `build.js`, and playtests in `playtest/`. English Quest also has `content/` (the seven stages) and `tools/check-content.js`. |
| `games/robot/` | Code Robot: the page (`src/robot.html`), the interpreter (`src/engine.js`), the worlds and levels (`content/`, read by `src/levels.js`), `tools/check.js` (proves every level), `tools/trace.js` (paths and corridor maps), `tools/content.js format` (tidies the level files); `build.js`; playtests in `playtest/`. |
| `games/tycoon/` | Tycoon Town: the screens (`src/tycoon.html`), the four cities (`src/city.js`: tiles, heights, lots, landmarks, what is near each lot, parade routes, boats and trains), the pictures (`src/art-kit.js`: drawing helpers, trees in every season; `src/art-build.js`: neighbours' buildings in each city's style and every business; `src/art-land.js`: landmarks), the map (`src/map.js`: the 2.5D canvas, hills and cliffs, seasons, traffic, people, money pops, day and night, the incidents and the weather), the economy (`src/engine.js`: pure, seeded, the whole game state is plain JSON; incidents and insurance too), the content (`content/`: `roster.json` with every number and each business's likes, `biz-1..5.json` with the cases, `offers.json`, `rivals.json`, and `FORMAT.md` for writing more), `tools/check-content.js` (content rules), `tools/sim.js` (balance bots), `build.js` and playtests. |
| `games/mech/` | Mech Blaster: the screens (`src/mech.html`), the rules (`src/engine.js`: the mech, weapons, enemies, gates, bosses and a test pilot), the pictures (`src/art.js`: the mech and the enemies; `src/art2.js`: the worlds, props, bosses and weapon icons), the 2.5D drawing (`src/render.js`), the sound (`src/audio.js`), the levels (`content/levels.json`, made by `tools/genlevels.js`, proved by `tools/check.js`) and the missing-word sentences (`content/words-0..2.json`, format in `content/FORMAT.md`, checked by `tools/check-words.js`); `build.js`; playtests in `playtest/`. |
| `shared/` | Code the games share: math questions, English word facts (`english-words.js`: opposites, past tenses, same-meaning words, plurals, common misspellings), general knowledge (`knowledge.js`: capitals, animal babies, science, geography, calendar and animal facts), the music remix engine, sound effects, cube looks and drawing, `arcade-days.js` (`markPlayed()`: every game notes the day it saves, for the streak), and for the newer games `arcade-ui.css` (colours, buttons, menus, HUD, toasts) and `arcade-core.js` (helpers, the shared save, `writeSave()` which marks the day played and `writeRecords()` which does not, math bookkeeping, screens, read-aloud with a British voice where the device has one, on-device voices first). A page marks the spot with `/*__SHARED:name__*/` (or `/*__SHARED:arcade-ui.css__*/` inside its style) and the build fills it in; shared files can use markers too. |
| `web/` | The arcade home page (`hub.html`: game cards, Today, stats, Badges, Progress for parents), the offline service worker, the app manifest and icons (`make-icons.js` redraws the icons). |
| `build.js` | Builds every game into `games/*/dist/` and the website into `docs/`: the home page, one folder per game, the manifest, icons and an offline cache whose version changes with the content. |
| `docs/` | The built website. GitHub Pages serves it from the `main` branch. Do not edit by hand. |

Progress is saved in each browser's localStorage: `number-dash.v1` holds Number Dash levels plus the settings (level, music, read-aloud) and math record every game shares; the days played are in `arcade-days.v1`; each other game keeps its records under its own key (`number-ladder.v1`, `pair-up.v1`, `number-pop.v1`, `spell-it.v1`, `english-quest.v1`, `memory-lane.v1`, `code-robot.v1`, `tycoon-town.v1`, `mech-blaster.v1`). The home page reads them for its stats.

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

Swap in `ipad.js` (both games), `smoke.js` (Pop) or `words.js` (Spell) for their other checks. Memory Lane: a bot plays every game at every level, forwards and backwards (`play.js`), and finger taps on iPad and phone (`ipad.js`):

```bash
ND_URL=file:///D:/Github/number-dash/games/memory/dist/preview.html ND_READY='!!window.__memory' ND_BOT=none node games/dash/playtest/shoot.js games/memory/playtest/play.js
```

 `arcade-ipad.js` above opens every game from the home page by finger.

Check English Quest's content, then play its whole journey (level test, every question kind, stage test, review, iPad, phone, dark mode, every stage):

```bash
node games/quest/tools/check-content.js
```

```bash
ND_URL=file:///D:/Github/number-dash/games/quest/dist/preview.html ND_READY='!!window.__quest' ND_BOT=none node games/dash/playtest/shoot.js games/quest/playtest/play.js
```

Code Robot: prove every level, then play every level through the page (`levels.js`), by finger on an iPad (`play.js`), on iPads both ways, a phone and dark mode (`ipad.js`), and the new kinds of level (`modes.js`: Mixed-up Code, Code Reader, Shrink It, Pixel Painter, Robot Team, Counters):

```bash
node games/robot/tools/check.js
```

```bash
ND_URL=file:///D:/Github/number-dash/games/robot/dist/preview.html ND_READY='!!window.__robot' ND_BOT=none node games/dash/playtest/shoot.js games/robot/playtest/levels.js
```

Tycoon Town: check the content (`--all` also fails on a business without its cases), run the balance bots (every city, `--map desert` for one), then the playtests: `play.js` (a first company in Desert Oasis by finger: the city picked, a spot picked on the map, the clock, pause and speed, a month closed, the map dragged and pinched, lots tapped, the business insured and its insurance stopped, the bank, a storm starting on the map, saving and resuming at the same hour, save codes, portrait and phone), `cases.js` (two-choice cases, offers, the city filling up, a rival's banner, case and lot, the phone header) and `content.js` (every case, offer and rival case opened in the real dialogs on a phone and an iPad, every business on the map of Sakura City, the Gateway's too):

```bash
node games/tycoon/tools/check-content.js --all
```

```bash
node games/tycoon/tools/sim.js
```

```bash
ND_URL=file:///D:/Github/number-dash/games/tycoon/dist/preview.html ND_READY='!!window.__tycoon' ND_BOT=none node games/dash/playtest/shoot.js games/tycoon/playtest/play.js
```

Mech Blaster: check the sentences (must print 0 errors), make the levels, prove and measure them with the test pilots, then the playtests: `play.js` (a new player by finger on an iPad: Play, the briefing, a drone shot down by a tap, the lane buttons, a swipe and a jump, a wrong and a right gate panel, pause, the done card, the level map scrolled by finger, the hangar, the weapon bar and the Iron Crab's shield opened by tapping the right orb) and `layouts.js` (phones and a portrait iPad, dark mode, how long a busy frame takes, and 18 levels with every new enemy and every boss flown by the autopilot).

```bash
node games/mech/tools/check-words.js
```

```bash
node games/mech/tools/genlevels.js
```

```bash
node games/mech/tools/check.js
```

```bash
ND_URL=file:///D:/Github/number-dash/games/mech/dist/preview.html ND_READY='!!window.__mech' ND_BOT=none node games/dash/playtest/shoot.js games/mech/playtest/play.js
```

Several playtests can run at once when each gets its own browser port and profile: add `ND_CDP=9371 ND_PROFILE=edge-profile-pair` (any free port and folder name).

To publish, build, commit `docs/` and push to `main`; GitHub Pages updates in about a minute.

## Adding a game

1. Make `games/<name>/src/<name>.html`: styles (start them with `/*__SHARED:arcade-ui.css__*/`), then a `<!--BODY-->` line, then the page; its script starts with `/*__SHARED:arcade-core__*/`. Add an `<a class="btn" data-hub hidden href="../">All games</a>` and call `arcadeLinks()`. `games/pair/src/pair.html` is the smallest example.
2. Give it a `games/<name>/build.js` that exports a `build()` returning the page (copy the ladder's).
3. Add its folder to the list in `build.js`, a card in `web/hub.html` and its folder to `CORE` in `web/sw.js`.
