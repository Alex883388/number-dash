/* games/robot/src/engine.js — Code Robot's interpreter, shared by the page and the level checker (Node can require it).
   A map is rows of squares: . floor, # wall, ~ water, * gem, G a flag, o a square of a picture to paint, and ^ > v < a
   robot's start (it faces that way). A map has one robot, or a team: several robots, each in its own area (squares
   joined side to side, walls and water apart) with its own flag and gems. A map with squares to paint has no gems or
   flag: painting the whole picture finishes it.
   A program is { main: [blocks], f1: [blocks] }; a block is { t, n, b, e }: t 'F' forward, 'L' turn left, 'R' turn right,
   'P' paint the square, '+' add one to the robot's number n, '-' take one from it, 'f' use F1, 'r' repeat n times [b]
   (n is 2 to 9, or 'n': the robot's number when the Repeat starts), 'i' if path ahead [b] else [e], 'j' if path left
   [b] else [e], 'k' if path right [b] else [e], 'g' if gem here [b], 'u' repeat until flag [b].
   The text form (the levels and the saved drafts): F L R P + - f, r3(...), rn(...), i(...)(...), j(...)(...),
   k(...)(...), g(...), u(...), and '|' before F1's own blocks: 'r4(f)|F R'. Blocks count like this: a Repeat or If is
   one block plus the blocks inside; F1's blocks count once.
   run() returns every step the robot takes, for the page to show one by one, and how it ended. A team runs the program
   once per robot, one after the other. No page, no timers. */
const Robot = (function () {
  const STEP_CAP = 300;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];   // 0 up, 1 right, 2 down, 3 left
  const FACING = { '^': 0, '>': 1, 'v': 2, '<': 3 };
  const BOX = { r: 1, i: 1, j: 1, k: 1, g: 1, u: 1 };   // blocks with blocks inside
  const ELSE = { i: 1, j: 1, k: 1 };                      // the Ifs with an else
  const SIMPLE = 'FLRP+-f';                               // blocks with nothing inside

  // opts: free (a map for reading a program: no flag needed), n0 (the robot's number at the start, 1 if not given)
  function parseMap(rows, opts) {
    opts = opts || {};
    const h = rows.length, w = rows[0].length, cells = [], gems = [], flags = [], targets = [], robots = [];
    if (w > 8 || h > 8) throw new Error('a map is at most 8 x 8');
    for (let y = 0; y < h; y++) {
      if (rows[y].length !== w) throw new Error('map row ' + y + ' is ' + rows[y].length + ' squares, not ' + w);
      for (let x = 0; x < w; x++) {
        let c = rows[y][x];
        if (FACING[c] !== undefined) { robots.push({ x: x, y: y, d: FACING[c] }); c = '.'; }
        if ('.#~*Go'.indexOf(c) < 0) throw new Error('unknown square ' + c);
        const i = y * w + x;
        if (c === '*') gems.push(i);
        if (c === 'G') flags.push(i);
        if (c === 'o') targets.push(i);
        cells.push(c);
      }
    }
    if (!robots.length) throw new Error('a map needs a robot');
    // areas: the squares a robot could reach, if it could turn and go anywhere
    const area = new Array(w * h).fill(-1);
    let na = 0;
    for (let i = 0; i < w * h; i++) {
      if (area[i] >= 0 || cells[i] === '#' || cells[i] === '~') continue;
      const stack = [i];
      area[i] = na;
      while (stack.length) {
        const j = stack.pop(), x = j % w, y = (j - x) / w;
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d], ny = y + DY[d], q = ny * w + nx;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && area[q] < 0 && cells[q] !== '#' && cells[q] !== '~') { area[q] = na; stack.push(q); }
        }
      }
      na++;
    }
    robots.forEach((r) => {
      r.area = area[r.y * w + r.x];
      r.gems = gems.filter((g) => area[g] === r.area);
      const f = flags.filter((g) => area[g] === r.area);
      r.flag = f.length ? f[0] : -1;
    });
    if (robots.length > 1) {
      if (targets.length) throw new Error('a team does not paint');
      if (new Set(robots.map((r) => r.area)).size < robots.length) throw new Error('two robots share an area');
      robots.forEach((r, k) => { if (flags.filter((g) => area[g] === r.area).length !== 1) throw new Error('robot ' + (k + 1) + ' needs one flag in its area'); });
      gems.concat(flags).forEach((g) => { if (!robots.some((r) => r.area === area[g])) throw new Error('a gem or flag no robot can reach'); });
    } else {
      if (flags.length > 1) throw new Error('two flags');
      if (targets.length && (gems.length || flags.length)) throw new Error('a picture to paint has no gems or flag');
      if (!targets.length && !flags.length && !opts.free) throw new Error('a map needs a flag');
      if (!opts.free) gems.concat(flags, targets).forEach((g) => { if (area[g] !== robots[0].area) throw new Error('a square the robot cannot reach: ' + (g % w) + ',' + Math.floor(g / w)); });
    }
    const s = robots[0];
    return { w: w, h: h, cells: cells, start: { x: s.x, y: s.y, d: s.d }, robots: robots, gems: gems, flags: flags, flag: s.flag,
      targets: targets, area: area, n0: opts.n0 === undefined ? 1 : opts.n0 };
  }
  const inside = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
  const open = (m, x, y) => inside(m, x, y) && m.cells[y * m.w + x] !== '#' && m.cells[y * m.w + x] !== '~';
  const blocker = (m, x, y) => (!inside(m, x, y) ? 'edge' : m.cells[y * m.w + x] === '~' ? 'water' : 'wall');

  /* ---- programs ---- */
  function make(t, n) {
    if (t === 'r') return { t: 'r', n: n || 2, b: [] };
    if (ELSE[t]) return { t: t, b: [], e: [] };
    if (BOX[t]) return { t: t, b: [] };
    return { t: t };
  }
  function parse(text) {
    const s = String(text || '').replace(/\s+/g, '');
    let i = 0;
    function seq() {
      const out = [];
      while (i < s.length && s[i] !== ')' && s[i] !== '|') {
        const c = s[i++];
        if (SIMPLE.indexOf(c) >= 0) out.push({ t: c });
        else if (c === 'r') {
          const ch = s[i++], n = ch === 'n' ? 'n' : +ch;
          if (n !== 'n' && !(n >= 2 && n <= 9)) throw new Error('a repeat needs 2 to 9 or n at ' + (i - 1));
          out.push({ t: 'r', n: n, b: group() });
        } else if (ELSE[c]) { const b = group(); out.push({ t: c, b: b, e: s[i] === '(' ? group() : [] }); }
        else if (c === 'g' || c === 'u') out.push({ t: c, b: group() });
        else throw new Error('unknown block ' + c + ' at ' + (i - 1));
      }
      return out;
    }
    function group() {
      if (s[i] !== '(') throw new Error('( expected at ' + i);
      i++;
      const b = seq();
      if (s[i] !== ')') throw new Error(') expected at ' + i);
      i++;
      return b;
    }
    const main = seq();
    let f1 = [];
    if (s[i] === '|') { i++; f1 = seq(); }
    if (i !== s.length) throw new Error('unexpected ' + s[i] + ' at ' + i);
    return { main: main, f1: f1 };
  }
  function printList(list, sp) {
    return list.map((b) => (b.t === 'r' ? 'r' + b.n + '(' + printList(b.b, sp) + ')' : ELSE[b.t] ? b.t + '(' + printList(b.b, sp) + ')(' + printList(b.e, sp) + ')'
      : BOX[b.t] ? b.t + '(' + printList(b.b, sp) + ')' : b.t)).join(sp);
  }
  // spaced: 'F F r3(F L)|R'; compact (for saving): 'FFr3(FL)|R'
  const print = (p, compact) => printList(p.main, compact ? '' : ' ') + (p.f1 && p.f1.length ? '|' + printList(p.f1, compact ? '' : ' ') : '');
  const countList = (list) => list.reduce((s, b) => s + 1 + (b.b ? countList(b.b) : 0) + (b.e ? countList(b.e) : 0), 0);
  const count = (p) => countList(p.main) + countList(p.f1 || []);
  // every kind of block a program uses ('F', 'r', ...), plus 'n' when a Repeat counts with the robot's number
  function kinds(p) {
    const k = new Set();
    const walk = (list) => list.forEach((b) => { k.add(b.t); if (b.t === 'r' && b.n === 'n') k.add('n'); if (b.b) walk(b.b); if (b.e) walk(b.e); });
    walk(p.main); walk(p.f1 || []);
    return k;
  }
  function selfCall(p) {
    let bad = false;
    const walk = (list) => list.forEach((b) => { if (b.t === 'f') bad = true; if (b.b) walk(b.b); if (b.e) walk(b.e); });
    walk(p.f1 || []);
    return bad;
  }
  const clone = (p) => JSON.parse(JSON.stringify(p));

  /* ---- a run ----
     Events, one per step: { p: the block's path ('m.2', 'm.1.b.0', 'f.0', 'm.3.e.1'), k: what happened, a: the paths of the
     loops, Ifs and F1 uses it is inside, r: the robot (0 for the first) }. k: 'fwd' (x, y, g: the gem picked up there
     or -1), 'turn' (d, s: -1 left, 1 right), 'bump' (x, y, d, what: wall / water / edge), 'paint' (i: the square, ok:
     part of the picture or not), 'set' (n: the robot's number now), 'rep' (i of n; 0 of 0 when n is 0 or less), 'test'
     (v: true or false; until: for Repeat until flag), 'call', and for a team 'start' before each robot's turn.
     A robot's run ends: win (on its flag with every gem of its area, or the whole picture painted), bump (what: wall /
     water / edge), paint (it painted a square that is not in the picture), end (the blocks ran out), gems (on the flag,
     gems still to get), unpainted (the blocks ran out with squares still to paint), dizzy (STEP_CAP steps: a loop that
     never finishes), self (F1 using F1), empty (no blocks). */
  function runOne(m, prog, k) {
    const R0 = m.robots[k], G = R0.gems, F = R0.flag, T = m.targets;
    let x = R0.x, y = R0.y, d = R0.d, n = m.n0, found = -1, steps = 0, why = '', inF1 = 0, hit = '';
    const got = [], painted = [], events = [], active = [], f1 = prog.f1 || [];
    const here = () => y * m.w + x;
    const finished = () => (T.length ? painted.length === T.length : here() === F && got.length === G.length);
    const tick = () => { if (steps >= STEP_CAP) { why = 'dizzy'; return false; } steps++; return true; };
    const ev = (e) => { e.a = active.slice(); e.r = k; events.push(e); };
    function seq(list, path) { for (let q = 0; q < list.length && !why; q++) one(list[q], path + '.' + q); }
    function inner(list, p, path) { active.push(p); seq(list, path); active.pop(); }
    function look(dir) { return open(m, x + DX[dir], y + DY[dir]); }
    function one(b, p) {
      if (!tick()) return;
      if (b.t === 'F') {
        const nx = x + DX[d], ny = y + DY[d];
        if (!open(m, nx, ny)) { hit = blocker(m, nx, ny); ev({ p: p, k: 'bump', x: x, y: y, d: d, what: hit }); why = 'bump'; return; }
        x = nx; y = ny; found = -1;
        let g = -1;
        if (G.indexOf(here()) >= 0 && got.indexOf(here()) < 0) { got.push(here()); found = g = here(); }
        ev({ p: p, k: 'fwd', x: x, y: y, g: g });
        if (!T.length && finished()) why = 'win';
      } else if (b.t === 'L' || b.t === 'R') {
        d = (d + (b.t === 'L' ? 3 : 1)) % 4;
        ev({ p: p, k: 'turn', d: d, s: b.t === 'L' ? -1 : 1 });
      } else if (b.t === 'P') {
        const i = here(), ok = T.indexOf(i) >= 0;
        ev({ p: p, k: 'paint', i: i, ok: ok });
        if (!ok) { why = 'paint'; return; }
        if (painted.indexOf(i) < 0) painted.push(i);
        if (finished()) why = 'win';
      } else if (b.t === '+' || b.t === '-') {
        n += b.t === '+' ? 1 : -1;
        ev({ p: p, k: 'set', n: n });
      } else if (b.t === 'f') {
        ev({ p: p, k: 'call' });
        if (inF1) { why = 'self'; return; }
        inF1++; inner(f1, p, 'f'); inF1--;
      } else if (b.t === 'r') {
        const times = b.n === 'n' ? Math.max(0, n) : b.n;
        if (!times) { ev({ p: p, k: 'rep', i: 0, n: 0 }); return; }
        for (let i = 1; i <= times && !why; i++) {
          if (i > 1 && !tick()) return;
          ev({ p: p, k: 'rep', i: i, n: times });
          inner(b.b, p, p + '.b');
        }
      } else if (ELSE[b.t]) {
        const v = look(b.t === 'i' ? d : b.t === 'j' ? (d + 3) % 4 : (d + 1) % 4);
        ev({ p: p, k: 'test', v: v });
        inner(v ? b.b : b.e, p, p + (v ? '.b' : '.e'));
      } else if (b.t === 'g') {
        const v = found === here();
        ev({ p: p, k: 'test', v: v });
        if (v) inner(b.b, p, p + '.b');
      } else if (b.t === 'u') {
        for (let first = true; !why; first = false) {
          if (!first && !tick()) return;
          const v = here() === F;
          ev({ p: p, k: 'test', v: v, until: true });
          if (v) return;
          inner(b.b, p, p + '.b');
        }
      }
    }
    if (!count(prog)) why = 'empty';
    else seq(prog.main, 'm');
    if (!why) why = finished() ? 'win' : T.length ? 'unpainted' : F >= 0 && here() === F ? 'gems' : 'end';
    return { events: events, why: why, ok: why === 'win', steps: steps, x: x, y: y, d: d, n: n, got: got.length, left: G.length - got.length,
      painted: painted.length, unpainted: T.length - painted.length, what: hit, robot: k };
  }
  // one robot: its run; a team: each robot's run in turn (stopping at the first that does not finish), as one list of events
  function run(m, prog) {
    if (m.robots.length === 1) return runOne(m, prog, 0);
    const events = [], parts = [];
    let last = null;
    for (let k = 0; k < m.robots.length; k++) {
      events.push({ p: '', k: 'start', a: [], r: k });
      last = runOne(m, prog, k);
      last.events.forEach((e) => events.push(e));
      parts.push(last);
      if (!last.ok) break;
    }
    const ok = parts.length === m.robots.length && parts.every((r) => r.ok);
    return { events: events, why: ok ? 'win' : last.why, ok: ok, team: parts, steps: parts.reduce((s, r) => s + r.steps, 0), x: last.x, y: last.y, d: last.d, n: last.n,
      got: last.got, left: last.left, painted: 0, unpainted: 0, what: last.what, robot: last.robot };
  }

  /* ---- checks for the levels ---- */
  // the fewest Forward / Turn blocks in a plain list (no loops) that finish a one-robot map with gems and a flag, or Infinity
  function minStraight(m, cap) {
    if (m.robots.length !== 1 || m.flag < 0) return Infinity;
    const G = m.gems.length, full = (1 << G) - 1, gemBit = {};
    m.gems.forEach((g, k) => { gemBit[g] = 1 << k; });
    const key = (x, y, d, mask) => ((y * m.w + x) * 4 + d) * (full + 1) + mask;
    const seen = new Set([key(m.start.x, m.start.y, m.start.d, 0)]);
    let front = [[m.start.x, m.start.y, m.start.d, 0]];
    for (let depth = 1; front.length && depth <= (cap || 200); depth++) {
      const next = [];
      for (const [x, y, d, mask] of front) {
        const moves = [[x, y, (d + 3) % 4, mask], [x, y, (d + 1) % 4, mask]];
        const nx = x + DX[d], ny = y + DY[d];
        if (open(m, nx, ny)) {
          const i = ny * m.w + nx, nm = mask | (gemBit[i] || 0);
          if (i === m.flag && nm === full) return depth;
          moves.push([nx, ny, d, nm]);
        }
        for (const s of moves) { const k = key(s[0], s[1], s[2], s[3]); if (!seen.has(k)) { seen.add(k); next.push(s); } }
      }
      front = next;
    }
    return Infinity;
  }
  // how many blocks were added, taken away, changed or moved one place between two programs (a Repeat's number counts
  // as its block, and moving a block into or out of a Repeat next to it is one change)
  function tokens(p) {
    return print(p).replace(/\(/g, '( ').replace(/\)/g, ' )').replace(/\|/g, ' | ').split(/\s+/).filter(Boolean);
  }
  function changes(a, b) {
    const s = tokens(a), t = tokens(b), D = [];
    for (let i = 0; i <= s.length; i++) { D.push([i]); for (let j = 1; j <= t.length; j++) D[i].push(i ? 0 : j); }
    for (let i = 1; i <= s.length; i++) {
      for (let j = 1; j <= t.length; j++) {
        D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && s[i - 1] === t[j - 2] && s[i - 2] === t[j - 1]) D[i][j] = Math.min(D[i][j], D[i - 2][j - 2] + 1);
      }
    }
    return D[s.length][t.length];
  }

  return { STEP_CAP: STEP_CAP, DX: DX, DY: DY, BOX: BOX, ELSE: ELSE, parseMap: parseMap, open: open, make: make, parse: parse, print: print, count: count,
    countList: countList, kinds: kinds, selfCall: selfCall, clone: clone, run: run, minStraight: minStraight, tokens: tokens, changes: changes };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Robot;
