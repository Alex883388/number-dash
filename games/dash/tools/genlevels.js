// Level generator for the Chill, Normal, Hard and Expert packs.
// Builds each level from small, known-good pieces around a theme, tests every piece at the
// level's tempo, then keeps a level only if the checker proves it beatable for every door
// layout, all 3 stars are reachable, and its measured difficulty sits in the pack's band.
//   node tools/genlevels.js n01 n02 ...   generate these levels (results in tools/gen-out/)
//   node tools/genlevels.js --combine     write src/packs.js from tools/gen-out/*.json
const fs = require('fs'), path = require('path');
const ND = require('../src/engine.js');
const { solve, analyzeVariant, popcount } = require('./check.js');
const OUT = path.join(__dirname, 'gen-out');
fs.mkdirSync(OUT, { recursive: true });

const SPECS = [
  { id: 'n01', name: 'Sunny Steps', pack: 'normal', bpm: 82, theme: ['blocks', 'pads'], fresh: 'Blocks, stairs and pads', hue: 48, night: false },
  { id: 'n02', name: 'Rocket Picnic', pack: 'normal', bpm: 84, theme: ['rocket'], fresh: 'Rocket rides', hue: 140, night: false },
  { id: 'n03', name: 'Rolling Hills', pack: 'normal', bpm: 84, theme: ['ball'], fresh: 'Ball rolling', hue: 100, night: false },
  { id: 'n04', name: 'Ring Orchard', pack: 'normal', bpm: 86, theme: ['rings'], fresh: 'Ring hops', hue: 280, night: false },
  { id: 'n05', name: 'Flip Flop Forest', pack: 'normal', bpm: 86, theme: ['gravity'], fresh: 'Upside-down runs', hue: 160, night: true },
  { id: 'n06', name: 'Tiny Town', pack: 'normal', bpm: 88, theme: ['mini', 'blocks'], fresh: 'Mini-size tunnels', hue: 200, night: false },
  { id: 'n07', name: 'Saucer Skies', pack: 'normal', bpm: 88, theme: ['ufo'], fresh: 'UFO flapping', hue: 230, night: false },
  { id: 'n08', name: 'Slow and Go', pack: 'normal', bpm: 86, theme: ['speed', 'rings'], fresh: 'Slow and fast portals', hue: 60, night: false },
  { id: 'n09', name: 'Bouncy Castle', pack: 'normal', bpm: 90, theme: ['pads', 'rings'], fresh: 'Pads and super pads', hue: 300, night: false },
  { id: 'n10', name: 'Picnic Parade', pack: 'normal', bpm: 90, theme: ['rocket', 'ball', 'ufo'], fresh: 'A bit of everything', hue: 190, night: true },
  { id: 'h01', name: 'Spike Canyon', pack: 'hard', bpm: 90, theme: ['spikes', 'blocks'], fresh: 'Long spike runs', hue: 50, night: false },
  { id: 'h02', name: 'Wave Lagoon', pack: 'hard', bpm: 94, theme: ['wave'], fresh: 'Zig-zag wave', hue: 185, night: false },
  { id: 'h03', name: 'Comet Run', pack: 'hard', bpm: 96, theme: ['rocket', 'speed'], fresh: 'Fast rockets', hue: 250, night: true },
  { id: 'h04', name: 'Gravity Maze', pack: 'hard', bpm: 92, theme: ['gravity', 'rings'], fresh: 'Gravity tricks', hue: 270, night: true },
  { id: 'h05', name: 'Pinball Park', pack: 'hard', bpm: 94, theme: ['ball', 'rings'], fresh: 'Ball and rings', hue: 150, night: false },
  { id: 'h06', name: 'UFO Storm', pack: 'hard', bpm: 96, theme: ['ufo', 'mini'], fresh: 'UFO and mini', hue: 210, night: true },
  { id: 'h07', name: 'Ring Rally', pack: 'hard', bpm: 94, theme: ['rings'], fresh: 'Long ring chains', hue: 120, night: false },
  { id: 'h08', name: 'Turbo Tunnel', pack: 'hard', bpm: 98, theme: ['speed', 'mini', 'rocket'], fresh: 'Turbo speed', hue: 230, night: false },
  { id: 'h09', name: 'Moon Bounce', pack: 'hard', bpm: 96, theme: ['gravity', 'pads'], fresh: 'Gravity and pads', hue: 240, night: true },
  { id: 'h10', name: 'Grand Gauntlet', pack: 'hard', bpm: 100, theme: ['rocket', 'ufo', 'wave', 'ball', 'gravity', 'rings'], fresh: 'Everything, hard', hue: 265, night: true },
  // Expert: the hard pieces at faster tempos, more forks, and a tighter (still fair) difficulty band
  { id: 'e01', name: 'Thunder Steps', pack: 'expert', bpm: 100, theme: ['spikes', 'blocks', 'pads'], fresh: 'Fast blocks and spikes', hue: 20, night: false },
  { id: 'e02', name: 'Sky Slalom', pack: 'expert', bpm: 100, theme: ['rocket', 'rings', 'pads'], fresh: 'Rocket and rings', hue: 200, night: false },
  { id: 'e03', name: 'Wave Rider', pack: 'expert', bpm: 100, theme: ['wave', 'speed'], fresh: 'Fast waves', hue: 175, night: true },
  { id: 'e04', name: 'Upside Town', pack: 'expert', bpm: 102, theme: ['gravity', 'blocks'], fresh: 'Gravity and blocks', hue: 300, night: true },
  { id: 'e05', name: 'Marble Run', pack: 'expert', bpm: 104, theme: ['ball', 'speed'], fresh: 'Speedy ball', hue: 110, night: false },
  { id: 'e06', name: 'Saucer Swarm', pack: 'expert', bpm: 104, theme: ['ufo', 'rings'], fresh: 'UFO and rings', hue: 240, night: true },
  { id: 'e07', name: 'Tiny Titan', pack: 'expert', bpm: 104, theme: ['mini', 'pads', 'spikes'], fresh: 'Mini and pads', hue: 40, night: false },
  { id: 'e08', name: 'Comet Tail', pack: 'expert', bpm: 104, theme: ['wave', 'rings'], fresh: 'Wave and rings', hue: 260, night: true },
  { id: 'e09', name: 'Ring Storm', pack: 'expert', bpm: 106, theme: ['rings', 'gravity', 'pads'], fresh: 'Rings, gravity, pads', hue: 140, night: false },
  { id: 'e10', name: 'Final Frontier', pack: 'expert', bpm: 108, theme: ['rocket', 'ufo', 'wave', 'ball', 'gravity', 'rings', 'speed'], fresh: 'Everything, expert', hue: 280, night: true }
];
// Chill: younger players, the gentle normal pieces at slow tempos, three forks and wide timing windows
SPECS.push(
  { id: 'c01', name: 'Puddle Jump', pack: 'chill', bpm: 74, theme: ['blocks'], fresh: 'Easy hops', hue: 200, night: false },
  { id: 'c02', name: 'Kite Day', pack: 'chill', bpm: 78, theme: ['rocket'], fresh: 'Gentle rocket', hue: 170, night: false },
  { id: 'c03', name: 'Bounce House', pack: 'chill', bpm: 76, theme: ['pads'], fresh: 'Bouncy pads', hue: 320, night: false },
  { id: 'c04', name: 'Rolling Meadow', pack: 'chill', bpm: 76, theme: ['ball'], fresh: 'Slow rolling', hue: 95, night: false },
  { id: 'c05', name: 'Ring Garden', pack: 'chill', bpm: 78, theme: ['rings'], fresh: 'Easy rings', hue: 140, night: false },
  { id: 'c06', name: 'Starry Stroll', pack: 'chill', bpm: 78, theme: ['blocks', 'pads'], fresh: 'Night walk', hue: 240, night: true },
  { id: 'c07', name: 'Little Saucer', pack: 'chill', bpm: 80, theme: ['ufo'], fresh: 'Easy UFO', hue: 260, night: false },
  { id: 'c08', name: 'Tiny Trail', pack: 'chill', bpm: 80, theme: ['mini', 'blocks'], fresh: 'Mini size', hue: 40, night: false },
  { id: 'c09', name: 'Sunny Skies', pack: 'chill', bpm: 82, theme: ['rocket', 'rings'], fresh: 'Rocket and rings', hue: 55, night: false },
  { id: 'c10', name: 'Rainbow Road', pack: 'chill', bpm: 82, theme: ['blocks', 'rocket', 'ball'], fresh: 'A bit of everything', hue: 290, night: false }
);
const isHard = (spec) => spec.pack === 'hard' || spec.pack === 'expert';     // hard and expert share the hard pieces
const baseOf = (spec) => (spec.pack === 'expert' ? 'hard' : spec.pack === 'chill' ? 'normal' : spec.pack);   // chill uses the normal pieces
const themeOf = (spec) => THEME[baseOf(spec)];
const DIFF = { chill: 'Easy', normal: 'Normal', hard: 'Hard', expert: 'Expert' };

// ---------- random helpers ----------
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (r, a) => a[Math.floor(r() * a.length)];
const dots = (n) => '.'.repeat(Math.max(0, n));
const lit = (v) => JSON.stringify(v);
const call = (fn, ...args) => 'B.' + fn + '(' + args.map((a) => (a === undefined ? 'undefined' : JSON.stringify(a))).join(', ') + ')';

// ---------- pieces (each returns JS source; star = place this level's star here) ----------
const P = {
  spikes(r, hard, star) {
    const toks = hard ? ['^^', '^^^', '^', '^^', '^.^'] : ['^', '^^', '^', '^^'];
    let s = dots(5 + ri(r, 0, 2)), starCol = -1;
    while (s.length < 30) {
      s += pick(r, toks);
      let gap = hard ? 6 + ri(r, 0, 3) : 7 + ri(r, 0, 3);
      if (star && starCol < 0 && s.length > 8 && r() < 0.6) { gap = Math.max(gap, 10); starCol = s.length + Math.floor(gap / 2) - 1; }
      s += dots(gap);
    }
    if (!star) return lit(s);
    if (starCol < 0) { starCol = s.length + 4; s += dots(10); }
    return lit([dots(starCol) + '*' + dots(s.length - starCol - 1), dots(s.length), s]);
  },
  blockHop(r, hard, star) {
    const rows = ['...........##........', '.....##....##........'];
    return lit(star ? ['............*........', dots(21), dots(21)].concat(rows) : rows);
  },
  spikeBlocks(r, hard) {
    return lit(hard ? ['.........^............^^......', '........#######...########....'] : ['........^..........^.....', '......#####......#####...']);
  },
  stairs(r, hard) {
    return lit(hard
      ? ['................###.......', '..........###...###.......', '....###...###...###.......', '....###^^^###^^^###^^.....']
      : ['.............###...........', '........###..###...........', '...^^...###..###....^^.....']);
  },
  padWall(r, hard, star) {
    return lit([(star ? '.........*......' : dots(16)), dots(16), dots(16), '......###.......', '......###.......', '......###.......', '....p.###.......']);
  },
  redTower(r, hard, star) {
    return lit([(star ? '..............*......' : dots(21)), dots(21), dots(21), '........#######......', '........#######......', '........#######......', '........#######......', '........#######......', '.....r..#######......']);
  },
  orb1() { return lit(['........o.........', dots(18), '......^^^^^.......']); },
  orb2(r, hard, star, speed) {
    return lit(speed < 9.5 ? ['........o...o..........', dots(23), '.....^^^^^^^^^^........'] : ['........o....o.........', dots(23), '.....^^^^^^^^^^^.......']);
  },
  orb3(r, hard, star, speed) {
    return lit(speed < 9.5 ? ['......o...o...o.........', dots(24), '....^^^^^^^^^^^^^.......'] : ['......o....o....o........', dots(25), '....^^^^^^^^^^^^^^.......']);
  },
  noJump() { return lit(['.....########..........', '.....vvvvvvvv..........', dots(23), dots(23)]); },
  grav(r, hard, star) {
    return hard ? call('grav', { len: 44, hang: [10, 17, 18, 25, 26], blocks: [[31, 1, 2]] })
      : call('grav', star ? { len: 40, hang: [11, 19, 27], star: [23, 3] } : { len: 40, hang: [11, 19, 27] });
  },
  green(r, hard, star) { return call('greenRun', star ? 16 : undefined); },
  blue() {
    return lit(['........##############......', dots(28), '...................u........', dots(28), '........u...................', dots(28), '........^^^^^^^^^^^^^.......']);
  },
  mini(r, hard, star) {
    return hard ? call('miniTunnel', 19, 30, [10, 26, 36, 37]) : call('miniTunnel', 20, 34, [11, 29, 41], star ? 25 : undefined);
  },
  slow() { return lit('..<......^.....^.....^^....^.....^^.....=....'); },
  fast() { return lit('..>.........^.........^..........^^.........=......'); },
  rocket(r, hard, star) {
    return hard ? call('ship', { len: 64, pillars: [[12, 'f', 5, 2, true], [22, 'c', 5, 2, true], [32, 'f', 5, 2, true], [42, 'c', 5, 2, true]], stars: star ? [[27, 5]] : [] })
      : call('ship', { len: 60, pillars: [[14, 'f', 4, 2], [28, 'c', 4, 2], [42, 'f', 4, 2]], stars: star ? [[31, 2]] : [] });
  },
  ufo(r, hard, star) {
    return hard ? call('ship', { portal: 'F', len: 66, pillars: [[12, 'f', 4, 2, true], [23, 'c', 4, 2, true], [34, 'f', 5, 2, true], [45, 'c', 4, 2, true]], stars: star ? [[29, 9]] : [] })
      : call('ship', { portal: 'F', len: 64, pillars: [[14, 'f', 3, 2], [26, 'c', 3, 2], [38, 'f', 4, 2]], stars: star ? [[32, 8]] : [] });
  },
  wave(r, hard, star) {
    return hard ? call('ship', { portal: 'W', len: 72, pillars: [[12, 'f', 7, 2, true], [22, 'c', 7, 2, true], [32, 'f', 7, 2, true], [42, 'c', 6, 2, true]], stars: star ? [[37, 3]] : [] })
      : call('ship', { portal: 'W', len: 72, pillars: [[14, 'f', 6, 2], [26, 'c', 6, 2], [38, 'f', 6, 2], [50, 'c', 6, 2]], stars: star ? [[44, 8]] : [] });
  },
  ball(r, hard, star) {
    const floor = [], roof = [];
    let c = 11, top = r() < 0.5;
    for (let i = 0; i < (hard ? 5 : 4); i++) {
      const arr = top ? roof : floor;
      arr.push(c);
      if (hard && r() < 0.6) arr.push(c + 1);
      c += hard ? ri(r, 7, 8) : ri(r, 8, 10);
      top = !top;
    }
    const o = { len: c + 12, floor, roof };
    if (star) o.star = [Math.max(6, floor.concat(roof).sort((a, b) => a - b)[1] - 3), 2];
    return call('ball', o);
  },
  // ----- math forks -----
  cubeGate(r, hard) {
    const leadSp = hard ? pick(r, ['.....^^^........^^........', '.....^^........^^^........', '.....^^^.......^.^.........'])
      : pick(r, ['.......^.........^^......', '.......^^........^........', '......^.........^.........']);
    const g = hard ? pick(r, [{ len: 12, top: [4, 8] }, { len: 11, top: [5] }]) : pick(r, [{ len: 11 }, { len: 12, top: [6] }]);
    return call('lead', leadSp) + ',\n        ' + call('cubeGate', g);
  },
  rocketGate(r, hard, star) {
    return call('ship', { len: 90, pillars: hard ? [[14, 'f', 5, 2, true], [26, 'c', 5, 2, true], [38, 'f', 5, 2, true]] : [[16, 'f', 4, 2], [30, 'c', 4, 2]], gate: { q: 6, a: 56, len: 10 }, stars: star ? [[23, 2]] : [] });
  },
  ufoGate(r, hard, star) {
    return call('ship', { portal: 'F', len: 92, pillars: hard ? [[14, 'f', 4, 2, true], [26, 'c', 4, 2, true], [38, 'f', 4, 2, true]] : [[16, 'f', 3, 2], [30, 'c', 3, 2]], gate: { q: 8, a: 58, len: 11 }, stars: star ? [[22, 9]] : [] });
  },
  waveGate(r, hard, star) {
    return call('ship', { portal: 'W', len: 100, pillars: [[12, 'f', 6, 2], [24, 'c', 6, 2], [36, 'f', 6, 2]], gate: { q: 12, a: 62, len: 12 }, stars: star ? [[30, 5]] : [] });
  },
  ballGate(r, hard, star) {
    const o = hard ? { len: 74, gate: { q: 3, a: 44, len: 10, floor: [48], roof: [50] }, floor: [12, 13, 26, 27], roof: [19, 20, 34, 35] }
      : { len: 72, gate: { q: 3, a: 42, len: 10 }, floor: [14, 30], roof: [22, 36] };
    if (star) o.star = [8, 2];
    return call('ball', o);
  }
};
const FLYING = new Set(['rocket', 'ufo', 'wave', 'ball', 'rocketGate', 'ufoGate', 'waveGate', 'ballGate', 'grav', 'green', 'mini']);
const STARRY = new Set(['spikes', 'blockHop', 'padWall', 'redTower', 'green', 'rocket', 'ufo', 'wave', 'ball', 'rocketGate', 'ufoGate', 'waveGate', 'ballGate']);
const THEME = {
  normal: {
    blocks: ['blockHop', 'stairs', 'spikeBlocks'], pads: ['padWall', 'redTower'], rings: ['orb1', 'orb1', 'padWall', 'orb2'], gravity: ['grav', 'grav'],
    mini: ['mini', 'mini'], speed: ['slow', 'fast'], rocket: ['rocket'], ufo: ['ufo'], ball: ['ball'], spikes: ['spikes']
  },
  hard: {
    blocks: ['spikeBlocks', 'stairs', 'blockHop'], pads: ['padWall', 'redTower'], rings: ['orb2', 'orb3', 'blue'], gravity: ['grav', 'green', 'blue'],
    mini: ['mini'], speed: ['fast', 'fast', 'slow'], rocket: ['rocket'], ufo: ['ufo'], wave: ['wave'], ball: ['ball'], spikes: ['spikes', 'spikes']
  }
};
const GENERAL = { normal: ['spikes', 'blockHop', 'orb1', 'padWall', 'noJump', 'spikeBlocks', 'stairs'], hard: ['spikes', 'spikeBlocks', 'stairs', 'orb2', 'padWall'] };
const GATE_OF = { rocket: 'rocketGate', ufo: 'ufoGate', wave: 'waveGate', ball: 'ballGate' };

// ---------- testing pieces and levels ----------
const evalSrc = (src) => new Function('B', 'return [' + src + '];')(ND.B);
function levelFrom(spec, parts) { return { id: spec.id, name: spec.name, bpm: spec.bpm, diff: DIFF[spec.pack], map: [].concat(...parts.map(evalSrc)) }; }
const pieceCache = new Map();
function pieceOk(spec, kind, src) {
  const key = spec.bpm + '|' + src;
  if (pieceCache.has(key)) return pieceCache.get(key);
  let ok = false;
  try {
    const L = ND.parseLevel({ id: 'piece', name: 'piece', bpm: spec.bpm, map: ['..........'].concat(evalSrc(src), ['..............']) });
    const lanes = Math.max(1, ...L.gates.map((g) => g.lanes));
    ok = true;
    for (let v = lanes; v >= 1 && ok; v--) {
      L.gates.forEach((g) => { g.correct = Math.min(v, g.lanes); });
      const a = analyzeVariant(L, { quick: v > 1, trials: 40 });
      if (!a.ok) ok = false;
      else if (v === 1 && a.minTap < (spec.pack === 'chill' ? 95 : spec.pack === 'expert' ? 55 : spec.pack === 'hard' ? 60 : 80)) ok = false;
    }
    if (ok && L.starCount) { L.gates.forEach((g) => { g.correct = 1; }); const s = solve(L, true); ok = s.ok && popcount(s.stars) === L.starCount; }
  } catch (e) { ok = false; }
  pieceCache.set(key, ok);
  return ok;
}

function compose(spec, seed) {
  const r = rng(seed), hard = isHard(spec), speed = 6 * spec.bpm / 60;
  const themePool = [].concat(...spec.theme.map((t) => themeOf(spec)[t] || []));
  // the forks: one for each flying theme move, the rest cube forks
  const nGates = spec.pack === 'expert' ? 5 : spec.pack === 'chill' ? 3 : hard ? 4 + (r() < 0.5 ? 1 : 0) : 3 + (r() < 0.5 ? 1 : 0);
  let gates = spec.theme.map((t) => GATE_OF[t]).filter(Boolean);
  while (gates.length < nGates) gates.push('cubeGate');
  gates = gates.slice(0, nGates).sort(() => r() - 0.5);
  if (gates[0] !== 'cubeGate' && gates.indexOf('cubeGate') > 0) { const i = gates.indexOf('cubeGate'); gates[i] = gates[0]; gates[0] = 'cubeGate'; }
  const plan = [{ k: 'spikes' }];
  let last = 'spikes';
  gates.forEach((g) => {
    const n = 1 + (r() < 0.55 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      let k, tries = 0;
      do { k = r() < 0.7 && themePool.length ? pick(r, themePool) : pick(r, GENERAL[baseOf(spec)]); } while (k === last && ++tries < 6);
      plan.push({ k }); last = k;
    }
    plan.push({ k: g }); last = g;
  });
  plan.push({ k: 'spikes', final: true });
  // three stars: the last spike run plus two theme pieces when possible
  const starry = plan.map((p, i) => i).filter((i) => STARRY.has(plan[i].k) && !plan[i].final);
  starry.sort((a, b) => (themePool.includes(plan[b].k) ? 1 : 0) - (themePool.includes(plan[a].k) ? 1 : 0) || r() - 0.5);
  starry.slice(0, 2).forEach((i) => { plan[i].star = true; });
  plan[plan.length - 1].star = true;
  if (plan.filter((p) => p.star).length < 3) { const extra = plan.find((p) => p.k === 'spikes' && !p.star); if (extra) extra.star = true; else plan.splice(1, 0, { k: 'spikes', star: true }); }
  return { plan, r, speed, hard };
}

function render(spec, plan, r, speed, hard) {
  const items = [];
  const themePool = [].concat(...spec.theme.map((t) => themeOf(spec)[t] || []));
  for (const p of plan) {
    let src = null;
    for (let t = 0; t < 6 && !src; t++) {
      const s = P[p.k](r, hard, !!p.star, speed);
      if (pieceOk(spec, p.k, s)) src = s;
    }
    // a piece that never works at this tempo is swapped for another one of the same kind of job
    if (!src && !/Gate$/.test(p.k)) {
      const subs = (p.star ? ['spikes', 'blockHop', 'padWall'] : themePool.concat(GENERAL[baseOf(spec)])).filter((k) => k !== p.k);
      for (let t = 0; t < 12 && !src; t++) {
        const k = pick(r, subs), s = P[k](r, hard, !!p.star, speed);
        if (pieceOk(spec, k, s)) { src = s; p.k = k; }
      }
    }
    if (!src) return null;
    items.push({ p, src, gap: lit(FLYING.has(p.k) ? '..........' : '......') });
  }
  // too long: drop the widest pieces that are neither a fork, a star, nor the opening run
  const toParts = () => [lit('..............')].concat(...items.map((it) => [it.src, it.gap]), [lit('..............')]);
  const flyingGates = plan.filter((p) => /Gate$/.test(p.k) && p.k !== 'cubeGate').length;
  const maxSecs = (hard ? 68 : 60) + (flyingGates >= 3 ? 6 : 0), speedOf = 6 * spec.bpm / 60;
  for (let k = 0; k < 10; k++) {
    const secs = ND.parseLevel(levelFrom(spec, toParts())).finishX / speedOf;
    if (secs <= maxSecs) break;
    let worst = -1, worstW = 0;
    items.forEach((it, i) => {
      if (i === 0 || it.p.star || /Gate$/.test(it.p.k)) return;
      const w = ND.parseLevel({ id: 'w', name: 'w', bpm: spec.bpm, map: evalSrc(it.src) }).mapW;
      if (w > worstW) { worstW = w; worst = i; }
    });
    if (worst < 0) break;
    items.splice(worst, 1);
  }
  return toParts();
}

function judge(spec, parts) {
  const def = levelFrom(spec, parts);
  const L = ND.parseLevel(def);
  const secs = L.finishX / L.speed, hard = isHard(spec);
  const out = { secs: +secs.toFixed(1), gates: L.gates.length, stars: L.starCount };
  if (L.starCount !== 3) return Object.assign(out, { fail: 'stars placed ' + L.starCount });
  const longOk = L.gates.filter((g) => g.lanes === 3).length + (spec.theme.includes('ball') ? 1 : 0) >= 3 ? 6 : 0;
  if (secs < (hard ? 48 : spec.pack === 'chill' ? 36 : 42) || secs > (hard ? 70 : 62) + longOk) return Object.assign(out, { fail: 'length ' + secs.toFixed(0) + ' s' });
  const lanes = Math.max(1, ...L.gates.map((g) => g.lanes));
  for (let v = lanes; v >= 2; v--) {
    L.gates.forEach((g) => { g.correct = Math.min(v, g.lanes); });
    if (!analyzeVariant(L, { quick: true }).ok) return Object.assign(out, { fail: 'door ' + v + ' impossible' });
  }
  L.gates.forEach((g) => { g.correct = 1; });
  const a = analyzeVariant(L, { trials: 300 });
  if (!a.ok) return Object.assign(out, { fail: 'door 1 impossible' });
  Object.assign(out, { rate25: +a.rate25.toFixed(2), rate40: +a.rate40.toFixed(2), minTap: Math.round(a.minTap) });
  const band = spec.pack === 'chill' ? { r25: [0.8, 1], r40: [0.45, 1], tap: 95 } : spec.pack === 'expert' ? { r25: [0.08, 0.6], r40: [0, 0.2], tap: 45 } : hard ? { r25: [0.2, 0.85], r40: [0.02, 0.35], tap: 50 } : { r25: [0.45, 0.95], r40: [0.15, 0.8], tap: 70 };
  if (a.rate25 < band.r25[0] || a.rate25 > band.r25[1] || a.rate40 < band.r40[0] || a.rate40 > band.r40[1]) return Object.assign(out, { fail: 'difficulty' });
  if (a.minTap < band.tap) return Object.assign(out, { fail: 'tight tap ' + Math.round(a.minTap) + ' ms' });
  const s = solve(L, true);
  if (!s.ok || popcount(s.stars) !== 3) return Object.assign(out, { fail: 'stars reachable ' + (s.ok ? popcount(s.stars) : 0) });
  return out;
}

function songFor(spec, r) {
  return { tpl: ri(r, 0, 5), shift: ri(r, -4, 5), groove: ri(r, 0, 3), comp: ri(r, 0, 3), seed: ri(r, 1, 9999) };
}

function generate(spec) {
  const t0 = Date.now();
  for (let attempt = 0; attempt < 40; attempt++) {
    const seed = (parseInt(spec.id.slice(1), 10) * 7919 + spec.id.charCodeAt(0) * 104729 + attempt * 31337) >>> 0;
    const c = compose(spec, seed);
    const parts = render(spec, c.plan, c.r, c.speed, c.hard);
    if (!parts) { console.log(spec.id, 'try', attempt, 'a piece failed at this tempo'); continue; }
    const res = judge(spec, parts);
    console.log(spec.id, 'try', attempt, res.fail ? 'no: ' + res.fail : 'YES', JSON.stringify(res));
    if (!res.fail) {
      const song = songFor(spec, rng(seed + 1));
      fs.writeFileSync(path.join(OUT, spec.id + '.json'), JSON.stringify({ spec, seed, parts, stats: res, song }, null, 1));
      console.log(spec.id, 'done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
      return true;
    }
  }
  console.log(spec.id, 'GAVE UP');
  return false;
}

function combine() {
  const levels = [];
  for (const spec of SPECS) {
    const f = path.join(OUT, spec.id + '.json');
    if (!fs.existsSync(f)) { console.log('missing', spec.id); continue; }
    const g = JSON.parse(fs.readFileSync(f, 'utf8'));
    levels.push('    {\n      id: ' + lit(spec.id) + ', name: ' + lit(spec.name) + ', pack: ' + lit(spec.pack) + ', bpm: ' + spec.bpm +
      ', diff: ' + lit(DIFF[spec.pack]) + ', fresh: ' + lit(spec.fresh) + ',\n' +
      '      look: ' + lit({ hue: spec.hue, night: spec.night }) + ', song: ' + lit(g.song) + ',\n' +
      '      // checked: ' + g.stats.secs + ' s, sloppy player clears ' + Math.round(g.stats.rate25 * 100) + '% / ' + Math.round(g.stats.rate40 * 100) + '%, tightest tap ' + g.stats.minTap + ' ms\n' +
      '      map: [\n        ' + g.parts.join(',\n        ') + '\n      ]\n    }');
  }
  const src = '/* Chill, Normal, Hard and Expert level packs, generated by tools/genlevels.js from checked pieces.\n' +
    '   Regenerate instead of hand-editing; every level here passed the level checker. */\n' +
    '(function (root) {\n  var ND = root.ND, B = ND.B;\n  ND.LEVELS.push(\n' + levels.join(',\n') + '\n  );\n})(typeof window !== \'undefined\' ? window : globalThis);\n';
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'packs.js'), src);
  console.log('wrote src/packs.js with', levels.length, 'levels');
}

const args = process.argv.slice(2);
if (args.includes('--combine')) combine();
else for (const id of args) { const spec = SPECS.find((s) => s.id === id); if (spec) generate(spec); else console.log('no spec', id); }
module.exports = { SPECS };
