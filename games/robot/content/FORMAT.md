# Code Robot levels: how to write them

Code Robot is a coding game for children aged 8 to 12 (British English). The child builds a program from blocks; a
robot follows it on a small map. Levels live in `content/world-<id>.json`, one file per world; `content/worlds.json`
lists the worlds in playing order. The game's interpreter is `src/engine.js`; read its top comment once.

Check your work all the time:

```bash
node games/robot/tools/check.js --world 8          # one world (--level 8-3 for one level, --quiet for problems only)
node games/robot/tools/trace.js 8-3                # run a level's solution and see the robot's path
node games/robot/tools/trace.js 8-3 "r4(F P)"      # try another program on it
node games/robot/tools/trace.js --carve "r3(F F R)" --gems 2,5   # a corridor map cut out of a program's path
node games/robot/tools/content.js format           # tidy the layout of every world file (same data)
```

A level is finished only when `check.js` passes it. Warnings are worth fixing too.

## The map

Rows of the same length, 8 × 8 at most (small maps read better on a phone: 5 to 7 wide is plenty).

| Square | Meaning |
| --- | --- |
| `.` | floor |
| `#` | wall |
| `~` | water (looks different, works like a wall) |
| `*` | a gem to collect |
| `G` | the flag: the robot finishes on it, with every gem |
| `o` | a square of a picture to paint (Pixel Painter) |
| `^ > v <` | the robot's start, facing up, right, down or left |

- One robot: the flag and every gem must be reachable. The robot stops the moment it stands on the flag with every gem.
- A team (Robot Team): two or three robots, each in its own area (walls or water between them), each area with exactly
  one flag and its own gems. The program runs for robot 1, then robot 2, then robot 3; every robot must finish.
- A picture (Pixel Painter): `o` squares, no gems, no flag. The robot finishes the moment the last `o` is painted;
  painting any other square stops it ("that square is not in the picture"). The robot's own start square is never part
  of the picture, so start it beside the picture.
- Code Reader maps have no flag and no picture (gems are allowed).

## Blocks and the text form

| Letter | Block | Notes |
| --- | --- | --- |
| `F` | Forward | bumping into a wall, water or the edge stops the program |
| `L` `R` | Turn left / right | on the spot |
| `P` | Paint | paints the square the robot is on |
| `r3(...)` | Repeat 3 times | 2 to 9; `rn(...)` repeats n times (the robot's number when the Repeat starts) |
| `f` | Use F1 | F1's own blocks come after `|`: `"f R f|F F L"`; F1 cannot use F1 |
| `i(...)(...)` | If path ahead … else … | the else part may be empty: `i(F)()` or just `i(F)` |
| `j(...)(...)` | If path left … else … | "path" = not a wall, water or the edge |
| `k(...)(...)` | If path right … else … | |
| `g(...)` | If gem here | true right after the robot picked up a gem on this square |
| `u(...)` | Repeat until flag | checks before each round; needs a flag |
| `+` `-` | Add one to n / take one from n | the robot's number n starts at the level's `n0` (1 if not given) |

Blocks count like this: every block is 1, a Repeat or If is 1 plus the blocks inside, F1's blocks count once.
A run that takes 300 steps stops ("the robot got dizzy"); solutions must stay under 240 steps per robot.

## A level

```json
{
  "id": "8-3", "name": "Dotted line", "pal": "FLRPr", "max": 5, "par": 4,
  "sol": "r3(F P F)",
  "alt": ["r3(F P) F"],
  "map": ["~~~~~~~~", ">o.o.o.~", "~~~~~~~~"],
  "hint": "Paint one square, skip the next. A Repeat does the rest."
}
```

| Field | Meaning |
| --- | --- |
| `id` | `<world>-<number>`, numbered 1, 2, 3 … in playing order within the world |
| `name` | 20 letters at most, fun and kind, different from every other level's name |
| `mode` | `build` (the default: leave it out), `fix`, `order`, `shrink` or `predict` (below) |
| `pal` | the blocks on offer, as letters: `"FLRr"`, `"FLRPrf"`, `"FLRiu"` … (`rn` needs `+` or `-` here) |
| `max` | the block limit (1 to 24). Set it so the world's idea is needed: a plain list must not fit |
| `par` | the blocks in the solution: 3 stars at par or fewer, 2 stars at par + 1 or + 2, 1 star above |
| `n0` | the robot's number at the start (0 to 9; Counters only, default 1) |
| `sol` | the reference solution |
| `alt` | other good solutions (optional; each must work within the limit) |
| `start` | the program the level opens with (`fix`, `order`, `shrink`) |
| `fix` | for `fix`: how many changes turn `start` into `sol` (1 to 3; the checker counts them) |
| `prog` | for `predict`: the program the child reads |
| `map` | the rows |
| `hint` | 75 letters at most, ends with `.`, `!` or `?`; says what to think about, never the whole answer |

### Modes

- **build**: the program starts empty; the child builds it. Stars by blocks against `par`.
- **fix** (Debugging): `start` has a bug (it fails); the child fixes it. `fix` = the changes needed (1 to 3). The hint
  describes what goes wrong, not the fix.
- **order** (Mixed-up Code): `start` holds exactly the solution's blocks in a muddle (it fails). The child can only
  move blocks (into and out of Repeats too) within their own row; numbers are fixed. No `pal`, `max` or `par`.
  Stars: 3 if the first Run works, 2 for the second, 1 after that. At least 2 changes from `start` to `sol`; 18 blocks
  at most.
- **shrink** (Shrink It): `start` works but is too long (at least `max` + 3 blocks, 30 at most). The child must get it
  down to `max` blocks or fewer. Stars by blocks against `par`.
- **predict** (Code Reader): the child reads `prog` and taps the square where the robot will stop; then the robot runs.
  No `sol`, `pal`, `max` or `par`. The program has 16 blocks at most, no Paint, and the robot moves forward at least 3
  times and must not end where it started. The map has no flag and no picture, so the robot stops when the blocks run
  out or when it bumps into something (a bump stops the program: a good surprise for a reader!).

## What the checker proves, world by world

| World | Rule |
| --- | --- |
| 2 Loops | no plain list fits `max`; no program of Forward, turns and Repeats beats `par` |
| 3 Functions | no plain list fits; with Repeat on offer, no program without F1 fits `max`; without it, no F1 program beats `par` |
| 4 Conditions | no plain list fits; no `r` or `f` on offer |
| 5 Debugging | mode `fix` |
| 6 Mixed-up Code | mode `order` |
| 7 Shrink It | mode `shrink`; no plain list fits `max` |
| 8 Pixel Painter | a picture; the solution paints; no plain list of moves and paints fits `max` |
| 9 Robot Team | 2 or 3 robots; no plain list works for every robot within `max` |
| 10 Counters | `+` or `-` on offer and used; no plain list fits; with only `FLRPr+-` on offer, no program without n fits `max` |
| 11 Code Reader | mode `predict` |

## Making good levels

- Each world climbs from very easy to tricky. The first level of a world teaches its one new idea with almost nothing
  else; then one new twist every level or two; the last few are proud wins.
- One idea per level. A level should feel like a small "aha", not a long grind. Short programs (3 to 12 blocks) are
  best; a long program is a sign the level is about too many things.
- Leave a little room: `max` is usually `par` + 1 or + 2, so a nearly-best answer still fits and earns 2 stars.
- Maps: tidy and readable, the robot's path easy to see. Water or walls around corridors work well. Gems mark the
  interesting spots. Avoid huge empty floors (except in Code Reader, where open floor is the point).
- Names: short, fun, concrete ("Snail shell", "Gem alleys", "Dotted line"). Hints: friendly and specific, British
  English (colour, metre, favourite), no "wrong" or "fail".
- Do not change levels you were not asked to write.
