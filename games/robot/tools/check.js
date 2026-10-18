// Code Robot: proves every level with the game's own interpreter (src/engine.js). Usage: node games/robot/tools/check.js
// For every level: the map is fine (at most 8 x 8, one robot, one flag); the reference solution (and every alt) finishes
// it with every gem, in fewer than STEP_CAP steps, uses only the palette's blocks, and is within the block limit; the
// solution's block count is the par. Then the world's idea is truly needed:
//   Sequences: par is the fewest blocks there can be (a search over every plain list).
//   Loops: no plain list fits the block limit; and no program of Forward, turns and Repeats beats par (a search that
//     builds programs block by block, Repeats inside Repeats too).
//   Functions: no plain list fits the limit; where Repeat is on offer, no program without F1 fits it either (the same
//     search); where it is not, par is the fewest blocks with an F1 of up to 8 plain blocks.
//   Conditions: no plain list fits the limit (and Repeat and F1 are not on offer, so nothing without an If or a Repeat
//     until fits it).
//   Debugging: the level's starting program fails, the fix is `fix` changes away, and no plain list fits the limit
//     (where the solution uses more than plain blocks).
// Prints one line per level and exits non-zero on any problem.
const Robot = require('../src/engine.js');
const { ROBOT_WORLDS, ROBOT_LEVELS } = require('../src/levels.js');
const { DX, DY } = Robot;
const problems = [];
const P = (id, msg) => problems.push(id + ': ' + msg);

/* ---- a search over programs of Forward, turns and Repeats (no F1, no Ifs) ----
   Programs are built from left to right and run as they grow (a Repeat's blocks run once as they are added; when the
   Repeat is closed, its other rounds run), so a program that bumps is dropped at once. Turns are kept in a standard
   form (L, R or L L between moves). Two Repeats deep. Returns a program (as text) with at most `bound` blocks that
   finishes the map, or '' if there is none, or null if the search ran out of time. */
function searchLoops(m, bound, budget) {
  const G = m.gems.length, full = (1 << G) - 1, bit = {};
  m.gems.forEach((g, k) => { bit[g] = 1 << k; });
  const key = (s) => ((s.y * m.w + s.x) * 4 + s.d) * (full + 1) + s.mask;
  function el(e, s) {
    if (e === 'F') {
      const nx = s.x + DX[s.d], ny = s.y + DY[s.d];
      if (!Robot.open(m, nx, ny)) return null;
      const i = ny * m.w + nx, mask = s.mask | (bit[i] || 0);
      if (i === m.flag && mask === full) return { win: true };
      return { x: nx, y: ny, d: s.d, mask: mask };
    }
    if (e === 'L' || e === 'R') return { x: s.x, y: s.y, d: (s.d + (e === 'L' ? 3 : 1)) % 4, mask: s.mask };
    for (let k = 0; k < e.n; k++) { s = list(e.b, s); if (!s || s.win) return s; }
    return s;
  }
  function list(l, s) { for (const e of l) { s = el(e, s); if (!s || s.win) return s; } return s; }
  const text = (l) => l.map((e) => (typeof e === 'string' ? e : 'r' + e.n + '(' + text(e.b) + ')')).join(' ');
  const okTurn = (cur, a) => {
    if (a === 'F') return true;
    const p = cur[cur.length - 1], q = cur[cur.length - 2];
    if (p === 'R' || (p === 'L' && a === 'R')) return false;
    if (a === 'R' && p === 'L') return false;
    if (p === 'L' && q === 'L') return false;
    return true;
  };
  const memo = new Map(), prog = [], frames = [];
  let found = '', nodes = 0, out = false;
  function dfs(s, cost) {
    if (found || out) return;
    if (++nodes > budget) { out = true; return; }
    if (!frames.length) { const k = key(s); if (memo.has(k) && memo.get(k) <= cost) return; memo.set(k, cost); }
    const cur = frames.length ? frames[frames.length - 1].b : prog;
    if (cost + 1 <= bound) {
      for (const a of ['F', 'L', 'R']) {
        if (!okTurn(cur, a)) continue;
        const ns = el(a, s);
        if (!ns) continue;
        cur.push(a);
        if (ns.win) found = text(prog) + (frames.length ? ' …' : '');
        else dfs(ns, cost + 1);
        cur.pop();
        if (found || out) return;
      }
      if (frames.length < 2 && cost + 2 <= bound) { frames.push({ b: [] }); dfs(s, cost + 1); frames.pop(); if (found || out) return; }
    }
    if (frames.length) {
      const f = frames.pop(), parent = frames.length ? frames[frames.length - 1].b : prog;
      if (f.b.some((e) => e !== 'L' && e !== 'R')) {
        let st = s;
        for (let n = 2; n <= 9 && !found && !out; n++) {
          st = list(f.b, st);
          if (!st) break;
          parent.push({ n: n, b: f.b.slice() });
          if (st.win) found = text(prog) + (frames.length ? ' …' : '');
          else dfs(st, cost);
          parent.pop();
          if (st.win) break;
        }
      }
      frames.push(f);
    }
  }
  dfs({ x: m.start.x, y: m.start.y, d: m.start.d, mask: 0 }, 0);
  return out && !found ? null : found;
}

/* ---- the fewest blocks with an F1 of plain blocks (no Repeat): every F1 of up to `len` blocks, then the fewest
   Forward / turn / F1 blocks in the program (a search over the robot's squares and gems) ---- */
function searchF1(m, bound, len) {
  const G = m.gems.length, full = (1 << G) - 1, bit = {};
  m.gems.forEach((g, k) => { bit[g] = 1 << k; });
  const step = (s, a) => {
    if (a === 'F') {
      const nx = s[0] + DX[s[2]], ny = s[1] + DY[s[2]];
      if (!Robot.open(m, nx, ny)) return null;
      const i = ny * m.w + nx, mask = s[3] | (bit[i] || 0);
      return i === m.flag && mask === full ? 'win' : [nx, ny, s[2], mask];
    }
    return [s[0], s[1], (s[2] + (a === 'L' ? 3 : 1)) % 4, s[3]];
  };
  const bodies = [];
  (function gen(b) { if (b.length) bodies.push(b.slice()); if (b.length >= len) return; for (const a of 'FLR') { b.push(a); gen(b); b.pop(); } })([]);
  let best = Infinity, bestText = '';
  for (const body of bodies) {
    const room = Math.min(bound, best - 1) - body.length;
    if (room < 1) continue;
    const call = (s) => { for (const a of body) { s = step(s, a); if (!s || s === 'win') return s; } return s; };
    const seen = new Set();
    let front = [[[m.start.x, m.start.y, m.start.d, 0], '']], done = false;
    for (let depth = 1; depth <= room && front.length && !done; depth++) {
      const next = [];
      for (const [s, path] of front) {
        for (const a of ['F', 'L', 'R', 'f']) {
          const ns = a === 'f' ? call(s) : step(s, a);
          if (!ns) continue;
          if (ns === 'win') { if (path.indexOf('f') >= 0 || a === 'f') { best = depth + body.length; bestText = (path + a).split('').join(' ') + '|' + body.join(' '); done = true; break; } continue; }
          const k = ns.join(',');
          if (!seen.has(k)) { seen.add(k); next.push([ns, path + a]); }
        }
        if (done) break;
      }
      front = next;
    }
  }
  return { best: best, text: bestText };
}

function main() {
const t0 = Date.now();
const lines = [];
const ids = new Set();
for (const L of ROBOT_LEVELS) {
  const id = L.id, w = +id[0], tag = [];
  if (ids.has(id)) P(id, 'twice'); ids.add(id);
  let m;
  try { m = Robot.parseMap(L.map); } catch (e) { P(id, 'map: ' + e.message); continue; }
  const pal = new Set(L.pal.split(''));
  let sol;
  try { sol = Robot.parse(L.sol); } catch (e) { P(id, 'solution: ' + e.message); continue; }
  const used = Robot.kinds(sol), n = Robot.count(sol);
  if (n !== L.par) P(id, 'par ' + L.par + ' but the solution has ' + n + ' blocks');
  if (L.par > L.max) P(id, 'par over the block limit');
  used.forEach((k) => { if (!pal.has(k)) P(id, 'the solution uses ' + k + ', not on offer'); });
  if (Robot.selfCall(sol)) P(id, 'F1 uses F1');
  const r = Robot.run(m, sol);
  if (!r.ok) P(id, 'the solution does not finish: ' + r.why);
  if (r.steps >= Robot.STEP_CAP * 0.8) P(id, 'the solution takes ' + r.steps + ' steps');
  if (!L.hint || L.hint.length > 75) P(id, 'hint length ' + (L.hint || '').length);
  if (!L.name || L.name.length > 20) P(id, 'name ' + L.name);
  if (w < 1 || w > 5) P(id, 'world');
  for (const a of L.alt || []) {
    const ap = Robot.parse(a), ar = Robot.run(m, ap);
    if (!ar.ok) P(id, 'alt ' + a + ' fails: ' + ar.why);
    if (Robot.count(ap) > L.max) P(id, 'alt ' + a + ' over the limit');
    Robot.kinds(ap).forEach((k) => { if (!pal.has(k)) P(id, 'alt uses ' + k); });
  }
  tag.push(n + ' blocks (limit ' + L.max + ')', r.steps + ' steps');
  const plain = Robot.minStraight(m);
  if (w === 1) {
    if (plain !== L.par) P(id, 'par ' + L.par + ' but a plain list needs ' + plain);
    tag.push('fewest ' + plain);
  }
  const fancy = [...used].some((k) => 'rfigu'.indexOf(k) >= 0);
  if (w >= 2 && fancy) {
    if (plain <= L.max) P(id, 'a plain list of ' + plain + ' blocks fits the limit ' + L.max);
    tag.push('plain list needs ' + plain);
  }
  if (w === 2 || (w === 5 && pal.has('r') && !pal.has('f'))) {
    const s = searchLoops(m, L.par - 1, 4e6);
    if (s === null) tag.push('loop search: out of time');
    else if (s) P(id, 'a shorter loop program: ' + s);
    else tag.push('no loop program under par');
  }
  if (w === 3 && pal.has('r')) {
    const s = searchLoops(m, L.max, 6e6);
    if (s === null) tag.push('no-F1 search: out of time');
    else if (s) P(id, 'no F1 needed: ' + s);
    else tag.push('no program without F1 fits');
  }
  if (w === 3 && !pal.has('r')) {
    const s = searchF1(m, L.par - 1, 8);
    if (s.best < L.par) P(id, 'a shorter F1 program: ' + s.text);
    else tag.push('no F1 program under par');
  }
  if (w === 4 && (pal.has('r') || pal.has('f'))) P(id, 'Conditions levels offer no Repeat or F1 (the proof needs that)');
  if (w === 5) {
    if (!L.start) P(id, 'a Debugging level needs a starting program');
    else {
      const st = Robot.parse(L.start), sr = Robot.run(m, st);
      if (sr.ok) P(id, 'the starting program already works');
      Robot.kinds(st).forEach((k) => { if (!pal.has(k)) P(id, 'the start uses ' + k); });
      if (Robot.count(st) > L.max) P(id, 'the start is over the limit');
      const ch = Robot.changes(st, sol);
      if (ch !== L.fix) P(id, 'fix ' + L.fix + ' but the solution is ' + ch + ' changes away');
      tag.push('start: ' + sr.why, 'fix ' + ch);
    }
  } else if (L.start) P(id, 'only Debugging levels open with a program');
  lines.push(id + ' ' + L.name + ': ' + tag.join(', '));
}
const perWorld = ROBOT_WORLDS.map((W) => ROBOT_LEVELS.filter((L) => +L.id[0] === W.id).length);
if (perWorld.join() !== '8,8,8,8,8') P('worlds', 'levels per world ' + perWorld.join());
console.log(lines.join('\n'));
console.log((problems.length ? 'FAIL ' + problems.length + ':\n  ' + problems.join('\n  ') : 'PASS: ' + ROBOT_LEVELS.length + ' levels') + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
process.exit(problems.length ? 1 : 0);
}
module.exports = { searchLoops: searchLoops, searchF1: searchF1 };
if (require.main === module) main();
