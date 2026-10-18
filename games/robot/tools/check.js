// Code Robot: proves every level with the game's own interpreter (src/engine.js). Usage:
//   node games/robot/tools/check.js            every level (a world with fewer levels than its size is a warning)
//   node games/robot/tools/check.js --all      the same, and a world short of levels is a problem
//   node games/robot/tools/check.js --world 8  one world (--level 8-3: one level); --quiet prints problems only
// Every level: its map is fine (at most 8 x 8; see engine.js parseMap), the name (20 letters at most) and hint (75) are
// there, and its mode's rules hold (content/FORMAT.md lists them):
//   build (most levels): the solution (and every alt) finishes with every gem or paints the whole picture, in fewer
//     than 80% of STEP_CAP steps per robot, uses only the palette's blocks and fits the block limit; par is its block
//     count. Then the world's idea is truly needed:
//       Sequences: par is the fewest blocks there can be (a search over every plain list).
//       Loops: no plain list fits the limit; no program of Forward, turns and Repeats beats par.
//       Functions: no plain list fits; where Repeat is on offer, no program without F1 fits the limit; where it is
//         not, no program with an F1 of up to 8 plain blocks beats par.
//       Conditions: no plain list fits; no Repeat or F1 on offer.
//       Pixel Painter: the map has a picture and the solution paints; no plain list of moves and paints fits.
//       Robot Team: two robots or more; no plain list works for every robot within the limit.
//       Counters: + or - on offer and used; no plain list fits; where only moves, paint and Repeat are on offer, no
//         program without the robot's number fits the limit.
//   fix (Debugging): the starting program fails, the fix is `fix` changes away (at most 3), and where the solution
//     uses more than plain blocks no plain list fits.
//   order (Mixed-up Code): the starting program fails, and the solution uses exactly the same blocks.
//   shrink (Shrink It): the starting program works but has at least 3 blocks over the limit; the solution fits par.
//   predict (Code Reader): the program ends (no dizzy robot) at least 3 steps away... on another square than the
//     start, with no paint and no flag on the map.
// Prints one line per level and exits non-zero on any problem.
const Robot = require('../src/engine.js');
const { load } = require('../src/levels.js');
const { DX, DY } = Robot;
const problems = [], warnings = [];
const P = (id, msg) => problems.push(id + ': ' + msg);
const W = (id, msg) => warnings.push(id + ': ' + msg);
const BLOCKS = 'FLRPrfijkgu+-';
const FANCY = 'rfijkgu+-';
const AMERICAN = /\b(color\w*|favorite\w*|center\w*|gray|meters?|liters?|organiz\w*|recogniz\w*|realiz\w*|practic(e|ing) (it|this)|mom|cookie|candy|neighbor\w*|behavior\w*|theater|traveling|traveled|labeled|canceled)\b/i;

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

/* ---- the fewest blocks in a plain list (Forward, turns) that brings every robot of a team home: one list runs for each
   robot in turn and a robot stops once it is home, so the robots are moved together and a robot at home stays there.
   Infinity if none up to cap, null if the search ran out of room. ---- */
function minPlainTeam(m, cap, budget) {
  const R = m.robots;
  const bits = R.map((r) => { const b = {}; r.gems.forEach((g, k) => { b[g] = 1 << k; }); return b; });
  const full = R.map((r) => (1 << r.gems.length) - 1);
  const start = R.map((r) => [r.x, r.y, r.d, 0, 0]);
  const key = (S) => S.map((s) => s.join(',')).join(';');
  const seen = new Set([key(start)]);
  let front = [start], nodes = 0;
  for (let depth = 1; front.length && depth <= cap; depth++) {
    const next = [];
    for (const S of front) {
      for (const a of 'FLR') {
        let ok = true;
        const N = S.map((s, k) => {
          if (!ok || s[4]) return s;
          let [x, y, d, mask] = s;
          if (a !== 'F') return [x, y, (d + (a === 'L' ? 3 : 1)) % 4, mask, 0];
          const nx = x + DX[d], ny = y + DY[d];
          if (!Robot.open(m, nx, ny)) { ok = false; return s; }
          const i = ny * m.w + nx;
          mask |= bits[k][i] || 0;
          return [nx, ny, d, mask, i === R[k].flag && mask === full[k] ? 1 : 0];
        });
        if (!ok) continue;
        if (N.every((s) => s[4])) return depth;
        const k2 = key(N);
        if (!seen.has(k2)) { seen.add(k2); next.push(N); if (++nodes > budget) return null; }
      }
    }
    front = next;
  }
  return Infinity;
}

/* ---- the fewest blocks in a plain list (Forward, turns, Paint) that paints the whole picture: Infinity if none up to
   cap, null if the search ran out of room. Painting T squares takes T Paints and at least T - 1 moves. ---- */
function minPlainPaint(m, cap, budget) {
  const T = m.targets, bit = {};
  T.forEach((t, k) => { bit[t] = 1 << k; });
  if (2 * T.length - 1 > cap) return Infinity;
  const full = T.length >= 31 ? -1 : (1 << T.length) - 1;
  if (full < 0) return null;
  const s0 = [m.start.x, m.start.y, m.start.d, 0];
  const key = (s) => s.join(',');
  const seen = new Set([key(s0)]);
  let front = [s0], nodes = 0;
  for (let depth = 1; front.length && depth <= cap; depth++) {
    const next = [];
    for (const [x, y, d, mask] of front) {
      const moves = [[x, y, (d + 3) % 4, mask], [x, y, (d + 1) % 4, mask]];
      if (Robot.open(m, x + DX[d], y + DY[d])) moves.push([x + DX[d], y + DY[d], d, mask]);
      const i = y * m.w + x;
      if (bit[i] && !(mask & bit[i])) { const nm = mask | bit[i]; if (nm === full) return depth; moves.push([x, y, d, nm]); }
      for (const s of moves) { const k = key(s); if (!seen.has(k)) { seen.add(k); next.push(s); if (++nodes > budget) return null; } }
    }
    front = next;
  }
  return Infinity;
}

// the same blocks in two programs, in any order and nesting
const blockBag = (p) => Robot.tokens(p).filter((t) => t !== ')').sort().join(' ');

function checkLevel(L, world, lines) {
  const id = L.id, tag = [], mode = L.mode || 'build', w = world.id;
  let m;
  try { m = Robot.parseMap(L.map, { free: mode === 'predict', n0: L.n0 }); } catch (e) { P(id, 'map: ' + e.message); return; }
  if (!L.name || L.name.length > 20) P(id, 'name "' + L.name + '" (20 letters at most)');
  if (!L.hint || L.hint.length > 75) P(id, 'hint length ' + (L.hint || '').length + ' (75 at most)');
  else if (!/[.!?]$/.test(L.hint)) W(id, 'the hint does not end with . ! or ?');
  if (AMERICAN.test(L.name + ' ' + L.hint)) P(id, 'American spelling: ' + (L.name + ' ' + L.hint).match(AMERICAN)[0]);
  if (L.n0 !== undefined && !(Number.isInteger(L.n0) && L.n0 >= 0 && L.n0 <= 9)) P(id, 'n0 must be 0 to 9');
  const parse = (what, text) => { try { return Robot.parse(text); } catch (e) { P(id, what + ': ' + e.message); return null; } };
  const pal = new Set((L.pal || '').split(''));
  for (const c of pal) if (BLOCKS.indexOf(c) < 0) P(id, 'unknown block on offer: ' + c);
  const counters = pal.has('+') || pal.has('-');
  const offered = (p, what) => Robot.kinds(p).forEach((k) => { if (k === 'n' ? !counters : !pal.has(k)) P(id, what + ' uses ' + (k === 'n' ? 'Repeat n' : k) + ', not on offer'); });
  const runAll = (p) => Robot.run(m, p);
  const stepsOk = (r, what) => { (r.team || [r]).forEach((x, k) => { if (x.steps >= Robot.STEP_CAP * 0.8) P(id, what + ' takes ' + x.steps + ' steps' + (r.team ? ' for robot ' + (k + 1) : '')); }); };
  const gemMap = m.robots.length === 1 && m.flag >= 0;
  const plain = gemMap ? Robot.minStraight(m) : Infinity;

  if (mode === 'predict') {
    if (w !== 11 && w !== 5) W(id, 'a predict level outside Code Reader');
    const p = parse('prog', L.prog);
    if (!p) return;
    if (m.flags.length || m.targets.length) P(id, 'a Code Reader map has no flag and no picture');
    if (m.robots.length !== 1) P(id, 'a Code Reader map has one robot');
    if (Robot.kinds(p).has('P')) P(id, 'no Paint when reading a program');
    if (Robot.selfCall(p)) P(id, 'F1 uses F1');
    const n = Robot.count(p);
    if (n > 16) P(id, 'the program has ' + n + ' blocks (16 at most to read)');
    const r = runAll(p);
    if (['dizzy', 'self', 'empty'].indexOf(r.why) >= 0) P(id, 'the program ends ' + r.why);
    const moves = r.events.filter((e) => e.k === 'fwd').length;
    if (moves < 3) P(id, 'only ' + moves + ' steps forward');
    if (r.x === m.start.x && r.y === m.start.y) W(id, 'the robot ends where it started');
    stepsOk(r, 'the program');
    tag.push(n + ' blocks', r.steps + ' steps', 'ends ' + r.why + ' at ' + r.x + ',' + r.y);
    lines.push(id + ' ' + L.name + ': ' + tag.join(', '));
    return;
  }

  const sol = parse('solution', L.sol);
  if (!sol) return;
  const n = Robot.count(sol), used = Robot.kinds(sol);
  if (Robot.selfCall(sol)) P(id, 'F1 uses F1');
  const r = runAll(sol);
  if (!r.ok) P(id, 'the solution does not finish: ' + r.why + (r.team ? ' (robot ' + (r.robot + 1) + ')' : ''));
  stepsOk(r, 'the solution');
  for (const a of L.alt || []) {
    const ap = parse('alt', a);
    if (!ap) continue;
    const ar = runAll(ap);
    if (!ar.ok) P(id, 'alt ' + a + ' fails: ' + ar.why);
    if (mode !== 'order' && Robot.count(ap) > L.max) P(id, 'alt ' + a + ' over the limit');
    if (mode !== 'order') offered(ap, 'alt');
  }

  if (mode === 'order') {
    if (w !== 6 && w !== 5) W(id, 'an order level outside Mixed-up Code');
    const st = parse('start', L.start);
    if (!st) return;
    if (blockBag(st) !== blockBag(sol)) P(id, 'the start and the solution have different blocks: ' + blockBag(st) + ' / ' + blockBag(sol));
    const sr = runAll(st);
    if (sr.ok) P(id, 'the starting program already works');
    if (Robot.changes(st, sol) < 2) W(id, 'only ' + Robot.changes(st, sol) + ' change to the solution');
    if (n > 18) P(id, n + ' blocks to put in order (18 at most)');
    tag.push(n + ' blocks', 'start: ' + sr.why, Robot.changes(st, sol) + ' changes away');
    lines.push(id + ' ' + L.name + ': ' + tag.join(', '));
    return;
  }

  // build, fix and shrink: a palette, a limit and par
  if (!(L.max >= 1 && L.max <= 24)) P(id, 'max ' + L.max + ' (1 to 24)');
  if (n !== L.par) P(id, 'par ' + L.par + ' but the solution has ' + n + ' blocks');
  if (L.par > L.max) P(id, 'par over the block limit');
  offered(sol, 'the solution');
  tag.push(n + ' blocks (limit ' + L.max + ')', r.steps + ' steps');
  const fancy = [...used].some((k) => FANCY.indexOf(k) >= 0);

  if (mode === 'fix') {
    if (w !== 5) W(id, 'a fix level outside Debugging');
    const st = parse('start', L.start);
    if (st) {
      const sr = runAll(st);
      if (sr.ok) P(id, 'the starting program already works');
      offered(st, 'the start');
      if (Robot.count(st) > L.max) P(id, 'the start is over the limit');
      const ch = Robot.changes(st, sol);
      if (ch !== L.fix) P(id, 'fix ' + L.fix + ' but the solution is ' + ch + ' changes away');
      if (!(L.fix >= 1 && L.fix <= 3)) P(id, 'fix ' + L.fix + ' (1 to 3)');
      tag.push('start: ' + sr.why, 'fix ' + ch);
    }
    if (fancy && plain <= L.max) P(id, 'a plain list of ' + plain + ' blocks fits the limit ' + L.max);
  } else if (mode === 'shrink') {
    if (w !== 7) W(id, 'a shrink level outside Shrink It');
    const st = parse('start', L.start);
    if (st) {
      const sr = runAll(st), sn = Robot.count(st);
      if (!sr.ok) P(id, 'the starting program should work: ' + sr.why);
      if (sn < L.max + 3) P(id, 'the start has ' + sn + ' blocks: at least 3 over the limit ' + L.max);
      if (sn > 30) P(id, 'the start has ' + sn + ' blocks (30 at most)');
      offered(st, 'the start');
      tag.push('start ' + sn + ' blocks');
    }
    if (gemMap && plain <= L.max) P(id, 'a plain list of ' + plain + ' blocks fits the limit ' + L.max);
  } else if (mode !== 'build') P(id, 'unknown mode ' + mode);
  else if (L.start || L.fix) P(id, 'a build level opens empty (no start or fix)');

  if (mode === 'build') {
    if (w === 1) { if (plain !== L.par) P(id, 'par ' + L.par + ' but a plain list needs ' + plain); tag.push('fewest ' + plain); }
    if ([2, 3, 4, 10].indexOf(w) >= 0) {
      if (plain <= L.max) P(id, 'a plain list of ' + plain + ' blocks fits the limit ' + L.max);
      else tag.push('plain list needs ' + plain);
    }
    if (w === 2) {
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
    if (w === 8) {
      if (!m.targets.length) P(id, 'a Pixel Painter map has a picture (o squares)');
      if (!used.has('P')) P(id, 'the solution does not paint');
      const s = minPlainPaint(m, L.max, 3e6);
      if (s === null) W(id, 'plain paint search: out of room');
      else if (s <= L.max) P(id, 'a plain list of ' + s + ' moves and paints fits the limit ' + L.max);
      else tag.push(m.targets.length + ' squares to paint, plain list ' + (s === Infinity ? 'over the limit' : s));
    }
    if (w === 9) {
      if (m.robots.length < 2) P(id, 'a Robot Team map has two robots or more');
      const s = minPlainTeam(m, L.max, 3e6);
      if (s === null) W(id, 'team search: out of room');
      else if (s <= L.max) P(id, 'a plain list of ' + s + ' blocks works for every robot within the limit ' + L.max);
      else tag.push(m.robots.length + ' robots, plain list ' + (s === Infinity ? 'over the limit' : s));
    }
    if (w === 10) {
      if (!counters) P(id, 'a Counters level offers + or -');
      if (!used.has('+') && !used.has('-')) P(id, 'the solution does not use + or -');
      if ([...pal].every((c) => 'FLRPr+-'.indexOf(c) >= 0) && gemMap) {
        const s = searchLoops(m, L.max, 6e6);
        if (s === null) tag.push('no-counter search: out of time');
        else if (s) P(id, 'no counter needed: ' + s);
        else tag.push('no program without n fits');
      }
    }
    if ([6, 7, 11].indexOf(w) >= 0) P(id, 'this world needs mode ' + { 6: 'order', 7: 'shrink', 11: 'predict' }[w]);
    if (w === 5) P(id, 'a Debugging level needs mode fix');
  }
  lines.push(id + ' ' + L.name + ': ' + tag.join(', '));
}

function main() {
  const t0 = Date.now(), args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const onlyWorld = opt('--world') ? +opt('--world') : null, onlyLevel = opt('--level'), quiet = args.indexOf('--quiet') >= 0, all = args.indexOf('--all') >= 0;
  let data;
  try { data = load(null, { lenient: true }); } catch (e) { console.log('FAIL: ' + e.message); process.exit(1); }
  data.errors.forEach((e) => { if (!onlyWorld || e.world === onlyWorld) P('world ' + e.world, e.message); });
  const lines = [], names = {};
  for (const world of data.ROBOT_WORLDS) {
    if (onlyWorld && world.id !== onlyWorld) continue;
    const levels = data.ROBOT_LEVELS.filter((L) => +String(L.id).split('-')[0] === world.id);
    levels.forEach((L, k) => {
      if (L.id !== world.id + '-' + (k + 1)) P(L.id, 'ids go ' + world.id + '-1, ' + world.id + '-2, … in order (expected ' + world.id + '-' + (k + 1) + ')');
      if (names[L.name]) W(L.id, 'the name "' + L.name + '" is also ' + names[L.name]); else names[L.name] = L.id;
      if (onlyLevel && L.id !== onlyLevel) return;
      try { checkLevel(L, world, lines); } catch (e) { P(L.id, 'crashed: ' + e.stack.split('\n').slice(0, 2).join(' ')); }
    });
    if (!onlyLevel && levels.length !== world.size) (all ? P : W)('world ' + world.id, levels.length + ' levels of ' + world.size);
  }
  if (!quiet) console.log(lines.join('\n'));
  if (warnings.length) console.log('warnings ' + warnings.length + ':\n  ' + warnings.join('\n  '));
  console.log((problems.length ? 'FAIL ' + problems.length + ':\n  ' + problems.join('\n  ') : 'PASS: ' + lines.length + ' levels') + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
  process.exit(problems.length ? 1 : 0);
}
module.exports = { searchLoops: searchLoops, searchF1: searchF1, minPlainTeam: minPlainTeam, minPlainPaint: minPlainPaint, blockBag: blockBag };
if (require.main === module) main();
