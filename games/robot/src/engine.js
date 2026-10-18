/* games/robot/src/engine.js — Code Robot's interpreter, shared by the page and the level checker (Node can require it).
   A map is rows of squares: . floor, # wall, ~ water, * gem, G the flag, and ^ > v < the robot's start (it faces that way).
   A program is { main: [blocks], f1: [blocks] }; a block is { t, n, b, e }: t 'F' forward, 'L' turn left, 'R' turn right,
   'f' use F1, 'r' repeat n times [b], 'i' if path ahead [b] else [e], 'g' if gem here [b], 'u' repeat until flag [b].
   The text form (the levels and the saved drafts): F L R f, r3(...), i(...)(...), g(...), u(...), and '|' before F1's own
   blocks: 'r4(f)|F R'. Blocks count like this: a Repeat or If is one block plus the blocks inside; F1's blocks count once.
   run() returns every step the robot takes, for the page to show one by one, and how it ended. No page, no timers. */
const Robot = (function () {
  const STEP_CAP = 300;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];   // 0 up, 1 right, 2 down, 3 left
  const FACING = { '^': 0, '>': 1, 'v': 2, '<': 3 };
  const BOX = { r: 1, i: 1, g: 1, u: 1 };           // blocks with blocks inside

  function parseMap(rows) {
    const h = rows.length, w = rows[0].length, cells = [], gems = [];
    let start = null, flag = -1;
    for (let y = 0; y < h; y++) {
      if (rows[y].length !== w) throw new Error('map row ' + y + ' is ' + rows[y].length + ' squares, not ' + w);
      for (let x = 0; x < w; x++) {
        let c = rows[y][x];
        if (FACING[c] !== undefined) { if (start) throw new Error('two robots'); start = { x: x, y: y, d: FACING[c] }; c = '.'; }
        if ('.#~*G'.indexOf(c) < 0) throw new Error('unknown square ' + c);
        if (c === '*') gems.push(y * w + x);
        if (c === 'G') { if (flag >= 0) throw new Error('two flags'); flag = y * w + x; }
        cells.push(c);
      }
    }
    if (!start || flag < 0) throw new Error('a map needs a robot and a flag');
    if (w > 8 || h > 8) throw new Error('a map is at most 8 x 8');
    return { w: w, h: h, cells: cells, start: start, gems: gems, flag: flag };
  }
  const inside = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
  const open = (m, x, y) => inside(m, x, y) && m.cells[y * m.w + x] !== '#' && m.cells[y * m.w + x] !== '~';
  const blocker = (m, x, y) => (!inside(m, x, y) ? 'edge' : m.cells[y * m.w + x] === '~' ? 'water' : 'wall');

  /* ---- programs ---- */
  function make(t, n) {
    if (t === 'r') return { t: 'r', n: n || 2, b: [] };
    if (t === 'i') return { t: 'i', b: [], e: [] };
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
        if (c === 'F' || c === 'L' || c === 'R' || c === 'f') out.push({ t: c });
        else if (c === 'r') {
          const n = +s[i++];
          if (!(n >= 2 && n <= 9)) throw new Error('a repeat needs 2 to 9 at ' + (i - 1));
          out.push({ t: 'r', n: n, b: group() });
        } else if (c === 'i') { const b = group(); out.push({ t: 'i', b: b, e: s[i] === '(' ? group() : [] }); }
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
    return list.map((b) => (b.t === 'r' ? 'r' + b.n + '(' + printList(b.b, sp) + ')' : b.t === 'i' ? 'i(' + printList(b.b, sp) + ')(' + printList(b.e, sp) + ')'
      : BOX[b.t] ? b.t + '(' + printList(b.b, sp) + ')' : b.t)).join(sp);
  }
  // spaced: 'F F r3(F L)|R'; compact (for saving): 'FFr3(FL)|R'
  const print = (p, compact) => printList(p.main, compact ? '' : ' ') + (p.f1 && p.f1.length ? '|' + printList(p.f1, compact ? '' : ' ') : '');
  const countList = (list) => list.reduce((s, b) => s + 1 + (b.b ? countList(b.b) : 0) + (b.e ? countList(b.e) : 0), 0);
  const count = (p) => countList(p.main) + countList(p.f1 || []);
  // every kind of block a program uses ('FLR', 'r', ...), and whether F1 uses itself
  function kinds(p) {
    const k = new Set();
    const walk = (list) => list.forEach((b) => { k.add(b.t); if (b.b) walk(b.b); if (b.e) walk(b.e); });
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
     loops, Ifs and F1 uses it is inside }. k: 'fwd' (x, y, g: the gem picked up there or -1), 'turn' (d, s: -1 left, 1 right),
     'bump' (x, y, d, what: wall / water / edge), 'rep' (i of n), 'test' (v: true or false; until: for Repeat until flag), 'call'.
     The run ends: win (on the flag with every gem), bump (what: wall / water / edge), end (the blocks ran out), gems (on the flag, gems still to get),
     dizzy (STEP_CAP steps: a loop that never finishes), self (F1 using F1), empty (no blocks). */
  function run(m, prog) {
    let x = m.start.x, y = m.start.y, d = m.start.d, found = -1, steps = 0, why = '', inF1 = 0, hit = '';
    const got = [], events = [], active = [], f1 = prog.f1 || [];
    const here = () => y * m.w + x;
    const won = () => here() === m.flag && got.length === m.gems.length;
    const tick = () => { if (steps >= STEP_CAP) { why = 'dizzy'; return false; } steps++; return true; };
    const ev = (e) => { e.a = active.slice(); events.push(e); };
    function seq(list, path) { for (let k = 0; k < list.length && !why; k++) one(list[k], path + '.' + k); }
    function inner(list, p, path) { active.push(p); seq(list, path); active.pop(); }
    function one(b, p) {
      if (!tick()) return;
      if (b.t === 'F') {
        const nx = x + DX[d], ny = y + DY[d];
        if (!open(m, nx, ny)) { hit = blocker(m, nx, ny); ev({ p: p, k: 'bump', x: x, y: y, d: d, what: hit }); why = 'bump'; return; }
        x = nx; y = ny; found = -1;
        let g = -1;
        if (m.cells[here()] === '*' && got.indexOf(here()) < 0) { got.push(here()); found = g = here(); }
        ev({ p: p, k: 'fwd', x: x, y: y, g: g });
        if (won()) why = 'win';
      } else if (b.t === 'L' || b.t === 'R') {
        d = (d + (b.t === 'L' ? 3 : 1)) % 4;
        ev({ p: p, k: 'turn', d: d, s: b.t === 'L' ? -1 : 1 });
      } else if (b.t === 'f') {
        ev({ p: p, k: 'call' });
        if (inF1) { why = 'self'; return; }
        inF1++; inner(f1, p, 'f'); inF1--;
      } else if (b.t === 'r') {
        for (let i = 1; i <= b.n && !why; i++) {
          if (i > 1 && !tick()) return;
          ev({ p: p, k: 'rep', i: i, n: b.n });
          inner(b.b, p, p + '.b');
        }
      } else if (b.t === 'i') {
        const v = open(m, x + DX[d], y + DY[d]);
        ev({ p: p, k: 'test', v: v });
        inner(v ? b.b : b.e, p, p + (v ? '.b' : '.e'));
      } else if (b.t === 'g') {
        const v = found === here();
        ev({ p: p, k: 'test', v: v });
        if (v) inner(b.b, p, p + '.b');
      } else if (b.t === 'u') {
        for (let first = true; !why; first = false) {
          if (!first && !tick()) return;
          const v = here() === m.flag;
          ev({ p: p, k: 'test', v: v, until: true });
          if (v) return;
          inner(b.b, p, p + '.b');
        }
      }
    }
    if (!count(prog)) why = 'empty';
    else seq(prog.main, 'm');
    if (!why) why = won() ? 'win' : here() === m.flag ? 'gems' : 'end';
    return { events: events, why: why, ok: why === 'win', steps: steps, x: x, y: y, d: d, got: got.length, left: m.gems.length - got.length, what: hit };
  }

  /* ---- checks for the levels ---- */
  // the fewest Forward / Turn blocks in a plain list (no loops) that finish the map, or Infinity
  function minStraight(m, cap) {
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

  return { STEP_CAP: STEP_CAP, DX: DX, DY: DY, BOX: BOX, parseMap: parseMap, open: open, make: make, parse: parse, print: print, count: count, countList: countList,
    kinds: kinds, selfCall: selfCall, clone: clone, run: run, minStraight: minStraight, changes: changes };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Robot;
