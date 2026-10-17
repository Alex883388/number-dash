# English Quest content format

English Quest walks a child from first words to IELTS band 8 in seven stages. Every stage is one
file, `stage-<n>.json`, with exactly 5 units. Banks may grow: the counts below are the minimum
set, and each bank may hold up to about double (see "Bank sizes"). Only ever add items after the
existing ones (saved review progress points at items by position). The game builds lessons from these banks (it picks,
shuffles and mixes question types itself), so write clean material, not lessons.

Check a file with:

```bash
node games/quest/tools/check-content.js 4
```

(no number = every stage file). It must report `0 errors`; read the warnings too.

## Stages

| n | id | Name | CEFR | IELTS (practice estimate) | Child's age | Reading text | Answer options |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | starter | Starter | Pre-A1 | – | 7–8 | 25–60 words | 3 |
| 2 | mover | Mover | A1 | – | 8–9 | 40–90 words | 3 |
| 3 | flyer | Flyer | A2 | – | 9–10 | 70–130 words | 3 or 4 |
| 4 | explorer | Explorer | B1 | 4.0–5.0 | 10–11 | 120–190 words | 4 |
| 5 | achiever | Achiever | B2 | 5.5–6.5 | 11–12 | 170–250 words | 4 |
| 6 | expert | Expert | C1 | 7.0–7.5 | 12+ | 220–320 words | 4 |
| 7 | band8 | Band 8 | C1+ / C2 | 8.0 | 12+ | 250–380 words | 4 |

Language is **British English** (IELTS): colour, centre, organise, travelled. Use straight quotes `'` and `"` only.
Topics stay friendly for children at every stage (nature, science, space, sport, school, inventions, history,
food, travel, the environment, technology). Nothing frightening, violent, political or sad.

## What each stage teaches

- **Starter (Pre-A1)**: everyday nouns, colours, numbers, simple adjectives; be, have got, can, there is/are,
  a/an, plurals, this/that, in/on/under, imperatives, question words. Cambridge Starters word list.
- **Mover (A1)**: present simple and continuous, past simple (regular + common irregular), comparatives,
  some/any, must, adverbs of frequency, going to. Cambridge Movers word list.
- **Flyer (A2)**: past continuous, present perfect (first steps), superlatives, will, should, countable /
  uncountable, too / enough, who / which, first conditional. Cambridge Flyers / A2 Key.
- **Explorer (B1)**: present perfect vs past simple, first and second conditional, passive (present/past),
  used to, reported speech (basic), gerund vs infinitive, defining relative clauses, phrasal verbs (common).
  B1 Preliminary. Reading starts using True / False / Not Given.
- **Achiever (B2)**: third conditional, all passives, reported speech, wish / if only, modal perfects
  (should have, might have), non-defining relative clauses, causative have, linking (although, despite,
  whereas, however), collocations, word formation. B2 First, IELTS 5.5–6.5.
- **Expert (C1)**: inversion (Never have I…), cleft sentences, "It is believed that…", participle clauses,
  mixed conditionals, hedging (tends to, is likely to), nominalisation, Academic Word List sublists 1–5,
  paraphrase, inference, writer's purpose. C1 Advanced, IELTS 7.0–7.5.
- **Band 8 (C1+ / C2)**: precise, less common lexis (mitigate, exacerbate, unprecedented), AWL 6–10,
  sophisticated collocations, concession and cause/effect structures, register, cohesion (ordering ideas),
  complex T/F/NG that needs careful paraphrase reading. IELTS 8.0.

## File shape

```json
{
  "stage": 1,
  "units": [
    {
      "id": "starter-1",
      "title": "Me and my family",
      "emoji": "👨‍👩‍👧",
      "words": [
        { "w": "mother", "def": "the woman who is your mum", "ex": "My ___ reads me a story at night.", "pos": "noun", "pic": "👩" }
      ],
      "grammar": [
        { "q": "She ___ my big sister.", "opts": ["is", "are", "am"], "a": 0, "why": "Use 'is' with he, she and it." }
      ],
      "sentences": ["My brother has got a red bike."],
      "reading": {
        "title": "Tom's family",
        "text": "This is Tom. He is eight. ...",
        "qs": [
          { "type": "mc", "q": "How old is Tom?", "opts": ["seven", "eight", "nine"], "a": 1 },
          { "type": "tf", "q": "Tom has got a dog.", "opts": ["True", "False"], "a": 0 }
        ]
      },
      "extra": []
    }
  ]
}
```

### Bank sizes (per unit)

| Bank | First set | Allowed |
| --- | --- | --- |
| words | 12 | 12–24 (Starter and Mover: a pic on at least two thirds) |
| grammar | 6 | 6–12 |
| sentences | 4 | 4–8 |
| reading | 1 | 1 or 2: `reading` may be one object or a list of two, each with its own title |
| extra | per stage below | Starter–Flyer 0–5, Explorer 4–8, Achiever–Band 8 6–12 |

### Units (exactly 5 per stage)

- `id`: `<stage id>-<1..5>`, e.g. `explorer-3`. `title`: up to 32 characters. `emoji`: one emoji for the topic.
- Units within a stage get a little harder from 1 to 5.

### `words` (exactly 12 per unit)

- `w`: the word or short phrase, lower case (`ice cream`, `look after`, `well-known` are fine). No word twice in a stage.
- `def`: a short meaning in English simple enough for that stage (up to 110 characters); it must not contain the word itself.
- `ex`: one sentence with exactly one `___` where `w` fits **exactly as written** (so for `w: "swim"` write
  "Fish can ___ fast.", not "He ___s"). Up to 130 characters.
- `pos`: noun, verb, adj, adv, prep, phrase or other.
- `pic`: one emoji that clearly shows the word. **Starter and Mover: at least 8 of 12 words need one.** Later stages: optional.
- Optional from Explorer up: `syn` (synonyms) and `ant` (opposites), arrays of single words at the same level or easier.
- Optional from Explorer up: `forms`, e.g. `{ "noun": "decision", "verb": "decide", "adj": "decisive", "adv": "decisively" }`.

### `grammar` (exactly 6 per unit)

- `q`: a sentence with exactly one `___`. `opts`: 3 options for Starter and Mover, 3 or 4 for Flyer, exactly 4 from Explorer up;
  all different; exactly one correct. `a`: index of the correct option. `why`: a one-line explanation a child understands
  (up to 160 characters). The game shuffles options, so the order does not matter.
- Test the stage's grammar points (list above), one clear point per item. Distractors must be clearly wrong in that sentence.

### `sentences` (exactly 4 per unit)

Used for "put the words in order" and "listen and build the sentence". Each sentence must have **only one natural word
order** (avoid movable time phrases and adverbs like "yesterday", "usually" that could go in two places, and avoid
two adjectives that could swap). Capital letter first, ending with `.`, `?` or `!`. Length: 4–9 words (Starter, Mover),
5–12 (Flyer, Explorer), 7–16 (Achiever, Expert, Band 8). Use the unit's words and grammar.

### `reading` (one per unit)

- `title`, `text` (length from the stage table; plain paragraphs, `\n\n` between paragraphs is fine), `qs`: 3–5 questions.
- Question `type`: `mc` (options as above), `tf` (opts exactly `["True", "False"]`), `tfng` (opts exactly
  `["True", "False", "Not Given"]`, Explorer and up only; at least 2 per passage from Explorer up, and Not Given must
  really be not stated). From Achiever up include a main-idea or purpose question; from Expert up include inference
  and paraphrase (the answer uses different words from the text).

### `extra` (skills beyond grammar and words)

- Count per unit: Starter, Mover, Flyer 0–3 (optional); Explorer exactly 4; Achiever, Expert, Band 8 exactly 6.
- Each: `{ "kind": ..., "q": ..., "opts": [4 options], "a": index, "why": explanation }`.
- `kind` is one of: `collocation` (make / do a decision?), `linking` (however / although…), `paraphrase` (which sentence
  means the same?), `register` (which is more formal for an essay?), `wordform` (She spoke ___ (confident) →
  confidently), `phrasal`, `idiom`, `preposition`, `mainidea` (a short paragraph inside `q`, which heading fits?),
  `cohesion` (which sentence comes next / best links two ideas?).
- From Achiever up cover at least four different kinds per unit. Expert and Band 8 should feel like IELTS Academic
  reading and writing skills (paraphrase, cohesion, register, precise collocation).
