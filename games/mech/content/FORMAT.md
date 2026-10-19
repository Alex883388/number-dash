# Mech Blaster: missing-word sentences

In Mech Blaster a gate blocks the road. The question floats over it and three answer panels sit across it, one per lane.
The child shoots the right panel to blow the gate open. In a word gate, the question is a sentence with one word
missing, and the panels offer the right word and two wrong ones.

The sentences live in three files, one per age group:

| File | Age | Level setting |
| --- | --- | --- |
| `words-0.json` | 7–8 | Starter, and the first worlds for Explorer |
| `words-1.json` | 9–10 | Explorer, and the first worlds for Genius |
| `words-2.json` | 11–12 | Genius, and the last world for Explorer |

`node games/mech/tools/check-words.js` checks all three and must print `0 errors`. Warnings are worth reading.

## A file

```json
{
  "tier": 0,
  "items": [
    { "s": "Yesterday we ___ to the beach.", "a": "went", "w": ["go", "goed", "going"], "k": "past", "h": "Go is irregular: yesterday we went." },
    { "s": "I can see ___ owl in the tree.", "a": "an", "w": ["a", "two", "the many"], "k": "article", "h": "Use an before a vowel sound: an owl." }
  ]
}
```

Each item:

- `s`: the sentence, with exactly one `___` (three underscores) where the word is missing. It starts with a capital
  letter (or `___` when the missing word comes first), ends with `.`, `?` or `!`, and is **at most 60 characters**
  including the blank, so it fits on a phone in two lines.
- `a`: the right answer: one word, or two short words when the gap really needs both (`turn off`). **At most 12
  characters.** If the blank starts the sentence, the answer and every wrong option start with a capital letter.
- `w`: **exactly three** wrong options, each at most 12 characters, all different from each other and from `a`. The game
  shows two of them at random, so every one must work as a wrong option on its own.
- `k`: what the item practises, one of the kinds below.
- `h`: a short, friendly tip shown after a wrong shot, **at most 70 characters**, that teaches the rule or the meaning
  (not just "the answer is went"). Speak to a child: "Use an before a vowel sound: an owl."

## The one rule that matters most

**Exactly one option may fit.** Every wrong option must make the sentence clearly wrong: wrong grammar, a wrong
spelling, or plainly wrong meaning. "Less natural" is not wrong enough. Read the sentence with each wrong option in
the gap and ask: could a teacher accept this? If yes, change the option or the sentence.

Traps to avoid:

- Prepositions: "The cat sat ___ the mat" accepts on, by, near and under. Use fixed phrases with one answer
  (`good at`, `afraid of`, `on Monday`, `in July`, `at night`, `interested in`) or wrong options that are not
  prepositions of place at all.
- Tenses: "I ___ my homework" accepts did, do, have done and will do. Put a time word in the sentence
  (`yesterday`, `every day`, `already`, `tomorrow`, `since 2020`) so only one tense fits.
- Opposites and vocabulary: "The soup was ___" accepts hot, cold, tasty and salty. Give the sentence a clue that
  pins the word down ("The soup was so ___ that I burned my tongue.").
- Phrasal verbs and idioms: British English often accepts more than one particle (`turn off` and `turn out` the
  lights). Avoid those.
- Spelling items: the sentence must give away which word is meant, and the wrong options are real misspellings
  children write (`beleive`, `belive`, `beleve`), never another real word.
- Homophones: the sentence must leave no doubt (`They left ___ bags on the bus.` → their).
- Wrong options that are real words of the same kind are best (they make the child think). Made-up words are fine
  only for spelling and for wrong forms children really say (`goed`, `mouses`, `bigger` → `more big`).

## Kinds

| `k` | Practises | Example |
| --- | --- | --- |
| `verb` | the right verb form for the time (present, past, future, -ing, perfect) | She ___ to school every day. (goes) |
| `past` | irregular past tense | Yesterday we ___ to the beach. (went) |
| `agree` | is/are, was/were, has/have, does/do with the subject | My friends ___ at the park. (are) |
| `plural` | irregular and tricky plurals | Three ___ ran across the kitchen. (mice) |
| `article` | a, an, the, some, any | I can see ___ owl. (an) |
| `pronoun` | he/him/his, I/me, who/which/whose, myself | Give the ball to ___. (me) |
| `prep` | fixed prepositions | She is very good ___ maths. (at) |
| `homophone` | there/their/they're, to/too/two, its/it's and friends | ___ dog is very friendly. (Their) |
| `spell` | the correctly spelled word | I ___ you can do it! (believe) |
| `opposite` | the opposite word, pinned down by the sentence | The hare is fast, but the tortoise is ___. (slow) |
| `vocab` | the word that fits the meaning | A baby cat is called a ___. (kitten) |
| `compare` | comparatives and superlatives | Mount Everest is the ___ mountain on Earth. (highest) |
| `conj` | and, but, so, because, although, unless, while | I wore a coat ___ it was cold. (because) |
| `modal` | can, could, must, should, might, would | You ___ wear a seatbelt in the car. (must) |
| `form` | the right word form (noun, adjective, adverb) | She sang ___ at the concert. (beautifully) |
| `collocation` | words that go together (make/do/take/have) | Please ___ your homework now. (do) |
| `idiom` | common idioms (older children) | It's raining cats and ___! (dogs) |

Use most kinds in every file. For the youngest (words-0) lean on `verb`, `past`, `agree`, `plural`, `article`,
`pronoun`, `homophone`, `opposite`, `vocab`, `spell` and simple `prep`/`conj`; leave `idiom` and hard `form` items to
the older files.

## Style

- British English: colour, favourite, centre, mum, maths, autumn, holiday, football, flat, lift, biscuit, queue,
  grey, travelled, organise. Never the American spelling.
- Kind, everyday topics children enjoy: school, family, friends, animals, sport, space, robots, nature, food,
  holidays, weather, science, inventions, history. No violence, no scary or sad topics, no brands, no real living
  people.
- Varied: the same answer word at most 4 times in a file, and no two sentences that are nearly the same.
- The level of the sentence matches the age: short words and sentences for 7–8, longer sentences and harder words for
  11–12.
