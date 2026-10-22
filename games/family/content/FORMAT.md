# Family Fighters: world-knowledge questions

Family Fighters is a co-op brawler: a Vietnamese family (two brothers, Bố and Mẹ) fights zombies through
Vietnam. Between fights a gate blocks the street. The question shows at the top of the screen, and three answer drums
stand on the ground in front of the gate. The family smashes the right drum to open the gate. A wrong drum breaks,
its tip shows, and two zombies jump out.

The world-knowledge questions live in three files, one per age group:

| File | Age | Level setting |
| --- | --- | --- |
| `world-0.json` | 7–8 | Age 7–8, and the first levels for 9–10 |
| `world-1.json` | 9–10 | Age 9–10, and the first levels for 11–12 |
| `world-2.json` | 11–12 | Age 11–12, and the last levels for 9–10 |

`node games/family/tools/check-world.js` checks all three and must print `0 errors`. Warnings are worth reading.

## A file

```json
{
  "tier": 0,
  "items": [
    { "q": "Which is the biggest ocean?", "a": "Pacific", "w": ["Atlantic", "Indian", "Arctic"], "k": "geography", "h": "The Pacific is the biggest and deepest ocean on Earth." },
    { "q": "What is the capital of Vietnam?", "a": "Hà Nội", "w": ["Huế", "Đà Nẵng", "Cần Thơ"], "k": "vietnam", "h": "Hà Nội has been Vietnam's capital since 1976 and is over 1,000 years old." }
  ]
}
```

Each item:

- `q`: the question, **at most 70 characters**, ending with `?` (or a sentence ending with `.` for "Which of these…").
  Short and clear: children read it while zombies wait.
- `a`: the right answer, **at most 14 characters** (it is painted on a drum). Numbers as digits (`8`, `100`).
- `w`: **exactly three** wrong answers, each at most 14 characters, all different from each other and from `a`. The
  game shows two of them at random, so every one must be clearly wrong on its own.
- `k`: the topic, one of the kinds below.
- `h`: a short, friendly fact shown after a wrong answer, **at most 90 characters**, that teaches something
  ("The Pacific is the biggest and deepest ocean on Earth."), not just "The answer is Pacific."

## The rules that matter most

1. **True, and still true next year.** Only well-established facts that every good encyclopedia agrees on. No
   populations, records, prices, current leaders, team champions or anything that changes. No disputed facts (the
   longest river: Nile or Amazon? avoid it).
2. **Exactly one answer fits.** Every wrong answer must be clearly wrong. "Which animal lives in the sea?" with
   options shark / crab / whale has three right answers: never do that.
3. **Wrong answers of the same kind**: countries for a country, animals for an animal, numbers close to the right
   number. Never silly or joke answers.
4. **Kind topics.** No war, death, disasters, illness, religion as belief, politics, or anything scary or sad.
   Historical items are about inventions, explorers, builders, artists and wonders.

## Kinds

| `k` | Topics |
| --- | --- |
| `geography` | continents, oceans, countries, capitals, rivers, mountains, deserts, flags (colours) |
| `vietnam` | Vietnam's places, food, festivals, nature, famous sights, simple Vietnamese words |
| `science` | materials, forces, light and sound, electricity, states of matter, simple chemistry |
| `space` | planets, the Sun and Moon, stars, astronauts, space travel |
| `animals` | animal groups, habitats, babies, diets, record holders that never change (fastest land animal) |
| `body` | the human body, senses, bones, healthy habits |
| `nature` | plants, weather, seasons, rocks, volcanoes, the water cycle |
| `history` | inventions, inventors, explorers, wonders of the world, ancient peoples (kind topics) |
| `culture` | festivals, languages, food, music, art and sport around the world (no current champions) |
| `maths` | everyday maths knowledge: shapes, days in a year, minutes in an hour, Roman numerals |

Use every kind in every file. `vietnam` should be about one item in six. The youngest file (world-0) uses easy
words and well-known facts; world-2 can ask harder things (photosynthesis, the equator, Marco Polo).

## Style

- British English: colour, metre, centre, favourite, mum, maths, autumn, aeroplane, grey.
- Vietnamese place names may keep their marks (Hà Nội, Huế, Hạ Long Bay) as long as they fit in 14 characters.
- Varied: no two questions that are nearly the same, and the same answer at most 3 times in a file.
