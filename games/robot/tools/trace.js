// Code Robot design helper: run a program on a level (or any map) and see the robot's path, or carve a corridor map
// out of a program's path. Usage (from the repo root):
//   node games/robot/tools/trace.js 2-5                    the level's own solution (or start, or prog)
//   node games/robot/tools/trace.js 2-5 "r3(F F L F R)"    another program on that level
//   node games/robot/tools/trace.js --map ">..*.G" "F F F F F"          a map of your own: rows split by commas or spaces,
//                                                                       --n0 3 for the robot's number, --free for no flag
//   node games/robot/tools/trace.js --carve "r4(F F R)" [--face >] [--fill ~] [--gems 2,5] [--flag no] [--pad 0]
//        draws the path of a program without Ifs on an open grid, then prints a map: the path is floor, everything
//        else --fill (water by default), the robot at the start, the flag at the end (unless --flag no or the program
//        paints: then the painted squares become o), gems on the listed path squares (1 = the first square after the
//        start). Paste the rows into a level and check it.
// The picture marks squares the robot crossed with +, squares it painted with %, where it stopped with @ (and
// bumped with !).
const Robot = require('../src/engine.js');
const { load } = require('../src/levels.js');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const has = (k) => args.indexOf(k) >= 0;
// the words that are not options or their values: a level id and a program
const VALUED = ['--map', '--n0', '--carve', '--face', '--fill', '--gems', '--flag', '--pad', '--world'];
const words = args.filter((a, i) => a.indexOf('--') !== 0 && VALUED.indexOf(args[i - 1]) < 0);

function picture(m, r) {
  const cells = m.cells.slice(), mark = {};
  const runs = r.team || [r];
  r.events.forEach((e) => { if (e.k === 'fwd') mark[e.y * m.w + e.x] = mark[e.y * m.w + e.x] || '+'; if (e.k === 'paint') mark[e.i] = e.ok ? '%' : 'X'; });
  runs.forEach((x) => { mark[x.y * m.w + x.x] = x.why === 'bump' ? '!' : '@'; });
  m.robots.forEach((s) => { const i = s.y * m.w + s.x; cells[i] = '^>v<'[s.d]; });
  const rows = [];
  for (let y = 0; y < m.h; y++) {
    let a = '', b = '';
    for (let x = 0; x < m.w; x++) { const i = y * m.w + x; a += cells[i]; b += mark[i] && cells[i] !== 'G' && cells[i] !== '*' ? mark[i] : cells[i]; }
    rows.push(a + '    ' + b);
  }
  return rows.join('\n');
}
function report(m, text) {
  const p = Robot.parse(text), r = Robot.run(m, p);
  console.log(picture(m, r));
  const runs = r.team || [r];
  console.log('program: ' + Robot.print(p) + '  (' + Robot.count(p) + ' blocks)');
  runs.forEach((x, k) => console.log((r.team ? 'robot ' + (k + 1) + ': ' : '') + x.why + ' at ' + x.x + ',' + x.y + ' facing ' + '^>v<'[x.d] + ', ' + x.steps + ' steps' +
    (m.gems.length ? ', gems ' + x.got + ' (' + x.left + ' left)' : '') + (m.targets.length ? ', painted ' + x.painted + ' (' + x.unpainted + ' left)' : '') + (x.n !== m.n0 ? ', n = ' + x.n : '')));
  console.log('result: ' + r.why + (r.ok ? ' (finished)' : ''));
}

// the moves of a program without Ifs, Repeats and F1 spelled out
function expand(p, n0) {
  const out = [];
  let n = n0, guard = 0;
  function list(l) {
    for (const b of l) {
      if (++guard > 2000) throw new Error('too long');
      if ('FLRP'.indexOf(b.t) >= 0) out.push(b.t);
      else if (b.t === '+') n++;
      else if (b.t === '-') n--;
      else if (b.t === 'f') list(p.f1);
      else if (b.t === 'r') { const t = b.n === 'n' ? Math.max(0, n) : b.n; for (let k = 0; k < t; k++) list(b.b); }
      else throw new Error('carving needs a program without Ifs or Repeat until (' + b.t + ')');
    }
  }
  list(p.main);
  return out;
}
function carve(text) {
  const p = Robot.parse(text), moves = expand(p, opt('--n0') ? +opt('--n0') : 1);
  const face = '^>v<'.indexOf(opt('--face') || '>'), fill = opt('--fill') || '~', pad = opt('--pad') ? +opt('--pad') : 0;
  let x = 0, y = 0, d = face;
  const path = [[0, 0]], painted = new Set();
  for (const a of moves) {
    if (a === 'F') { x += Robot.DX[d]; y += Robot.DY[d]; path.push([x, y]); }
    else if (a === 'L') d = (d + 3) % 4;
    else if (a === 'R') d = (d + 1) % 4;
    else painted.add(x + ',' + y);
  }
  const xs = path.map((q) => q[0]), ys = path.map((q) => q[1]);
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, w = Math.max(...xs) - x0 + 1 + pad, h = Math.max(...ys) - y0 + 1 + pad;
  if (w > 8 || h > 8) console.log('note: the path needs ' + w + ' x ' + h + ' squares; a map is at most 8 x 8');
  const g = [];
  for (let yy = 0; yy < h; yy++) g.push(new Array(w).fill(fill));
  path.forEach(([px, py]) => { g[py - y0][px - x0] = '.'; });
  const paints = painted.size > 0;
  painted.forEach((k) => { const [px, py] = k.split(',').map(Number); g[py - y0][px - x0] = 'o'; });
  if (opt('--gems')) opt('--gems').split(',').map(Number).forEach((k) => { const q = path[k]; if (q && !(q[0] === 0 && q[1] === 0)) g[q[1] - y0][q[0] - x0] = '*'; });
  const end = path[path.length - 1];
  if (!paints && opt('--flag') !== 'no') g[end[1] - y0][end[0] - x0] = 'G';
  g[0 - y0][0 - x0] = '^>v<'[face];
  const rows = g.map((r) => r.join(''));
  console.log(JSON.stringify(rows));
  console.log(rows.join('\n'));
  console.log(path.length - 1 + ' steps forward' + (paints ? ', ' + painted.size + ' squares painted' : '') + ', ' + w + ' x ' + h);
}

// every level of a world in turn: its name, mode, numbers and hint, and its program's path
function world(id) {
  const { ROBOT_LEVELS } = load(null, { lenient: true });
  const levels = ROBOT_LEVELS.filter((L) => +L.id.split('-')[0] === id);
  for (const L of levels) {
    const m = Robot.parseMap(L.map, { free: L.mode === 'predict', n0: L.n0 });
    console.log('\n== ' + L.id + ' ' + L.name + ' [' + (L.mode || 'build') + (L.pal ? ' ' + L.pal : '') + (L.max ? ' max ' + L.max + ' par ' + L.par : '') + (L.n0 !== undefined ? ' n0 ' + L.n0 : '') + ']');
    console.log('   ' + L.hint);
    if (L.start) console.log('   start: ' + L.start + (L.fix ? '  (fix ' + L.fix + ')' : ''));
    report(m, L.prog || L.sol);
  }
  console.log('\n' + levels.length + ' levels');
}

if (has('--world')) world(+opt('--world'));
else if (has('--carve')) carve(opt('--carve'));
else if (has('--map')) {
  const rows = opt('--map').split(/[,\s]+/).filter(Boolean);
  const m = Robot.parseMap(rows, { free: has('--free'), n0: opt('--n0') ? +opt('--n0') : undefined });
  report(m, words[0] || '');
} else if (words[0]) {
  const { ROBOT_LEVELS } = load(), L = ROBOT_LEVELS.find((x) => x.id === words[0]);
  if (!L) { console.log('no level ' + words[0]); process.exit(1); }
  const m = Robot.parseMap(L.map, { free: L.mode === 'predict', n0: L.n0 });
  console.log(L.id + ' ' + L.name + (L.mode ? ' (' + L.mode + ')' : '') + (L.hint ? ': ' + L.hint : ''));
  report(m, words[1] !== undefined ? words[1] : L.prog || L.sol || L.start);
} else console.log('usage: see the top of games/robot/tools/trace.js');
