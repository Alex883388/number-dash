// Tries single level pieces at a given tempo: is each one beatable, and how tight are its taps?
// Usage: node tools/pieces.js [pieceName]
const ND = require('../src/engine.js');
const { solve, prune, canonical, windowOf } = require('./check.js');
const B = ND.B;
const only = process.argv[2];

const PIECES = {
  slowOrbs3: [94, [['..<.........o..o..o.........=....', '.................................', '..........^^^^^^^^^^.............']]],
  slowOrbs4: [94, [['..<.........o...o...o........=....', '..................................', '..........^^^^^^^^^^^^...........']]],
  slowMix4: [94, [['..<.........o...i...o........=....', '..................................', '..........^^^^^^^^^^^^...........']]],
  pinkHop94: [94, [['............i.........', '......................', '..........^^^^........']]],
  pinkHop94b: [94, [['...........i..........', '......................', '.........^^^^.........']]],
  greenEased: [94, [(() => { const s = new ND.Stamp(39, 7); s.fill(0, 6, 31, 6, '#'); s.set(11, 5, 'v'); s.fill(20, 5, 21, 5, 'v'); s.set(27, 5, 'g'); s.set(3, 2, 'g'); s.fill(7, 0, 24, 0, '^'); return s; })()]],
  greenEased104: [104, [(() => { const s = new ND.Stamp(39, 7); s.fill(0, 6, 31, 6, '#'); s.set(11, 5, 'v'); s.fill(20, 5, 21, 5, 'v'); s.set(27, 5, 'g'); s.set(3, 2, 'g'); s.fill(7, 0, 24, 0, '^'); return s; })()]],
  ballIntro84: [84, [B.ball({ len: 66, floor: [12, 13, 30, 31, 46], roof: [21, 22, 38, 54] })]],
  ballGate84: [84, [B.ball({ len: 72, gate: { q: 3, a: 42, len: 10 }, floor: [14, 15, 30], roof: [22, 36], star: [8, 2] })]],
  ballGate98: [98, [B.ball({ len: 74, gate: { q: 3, a: 44, len: 10, floor: [48], roof: [50] }, floor: [12, 13, 26, 27], roof: [19, 20, 34, 35], star: [8, 2] })]],
  miniTunnel90: [90, [['......m.....##########################.....M.......',
                       '....................vv....*.......vv...............',
                       '...........^.................^..........^..........']]],
  miniTunnel104: [104, [['......m.....##########################.....M.......',
                         '...................vv.........vv...................',
                         '..........^...............^.........^^.............']]],
  ufo90: [90, [B.ship({ portal: 'F', len: 96, pillars: [[14, 'f', 4, 2], [24, 'c', 4, 2], [34, 'f', 5, 2, true], [44, 'c', 5, 2, true]], gate: { q: 20, a: 64, len: 11 }, stars: [[29, 9]] })]],
  orbs3at90: [90, [['......o...o...o.........', '........................', '....^^^^^^^^^^^^^.......']]],
  pinkSlow94: [94, [['..<.........i..i..i.........=....', '.................................', '..........^^^^^^^^^^.............']]],
  redTower94: [94, [['..............*......', '.....................', '.....................', '........#######......', '........#######......', '........#######......', '........#######......', '........#######......', '.....r..#######......']]],
  green94: [94, [['################################.......',
                  '...........v........vv.....g...........',
                  '.......................................',
                  '................*......................',
                  '...g...................................',
                  '.......................................',
                  '.......^^^^^^^^^^^^^^^^^^^^^..........']]],
  fast94: [94, ['..>.........^.........^..........^^.........=......']],
  wave98: [98, [B.ship({ portal: 'W', len: 84, pillars: [[14, 'f', 6, 2], [26, 'c', 6, 2], [38, 'f', 6, 2], [50, 'c', 6, 2], [62, 'f', 5, 2, true]], stars: [[44, 8]] })]],
  waveGate98: [98, [B.ship({ portal: 'W', len: 100, pillars: [[14, 'f', 5, 2], [26, 'c', 5, 2], [38, 'f', 5, 2]], gate: { q: 10, a: 64, len: 12 } })]]
};

for (const [name, [bpm, map]] of Object.entries(PIECES)) {
  if (only && name !== only) continue;
  const def = { id: name, name, bpm, map: ['..........'].concat(map, ['..............']) };
  const L = ND.parseLevel(def);
  const lanes = Math.max(1, ...L.gates.map((g) => g.lanes));
  const res = [];
  for (let v = 1; v <= lanes; v++) {
    L.gates.forEach((g) => { g.correct = Math.min(v, g.lanes); });
    const r = solve(L, false);
    if (!r.ok) { res.push('door ' + v + ': IMPOSSIBLE at x=' + r.best.toFixed(1)); continue; }
    let edges = prune(L, r.edges);
    let c = canonical(L, edges);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < edges.length; i++) {
        const [a, b, pair] = windowOf(L, edges, i, c.states);
        const mid = Math.round((a + b) / 2);
        if (mid) { edges = edges.slice(); edges[i] += mid; if (pair) edges[i + 1] += mid; c = canonical(L, edges); }
      }
    }
    let minW = Infinity;
    for (let i = 0; i < edges.length; i += 2) {
      const st = c.states[edges[i]];
      if (st.mode === 1 || st.mode === 4) continue;
      const [a, b] = windowOf(L, edges, i, c.states);
      minW = Math.min(minW, (b - a + 1) * 1000 / 240);
    }
    res.push('door ' + v + ': ok, ' + Math.ceil(edges.length / 2) + ' taps, tightest tap ' + (isFinite(minW) ? minW.toFixed(0) + 'ms' : '-') + (c.ok ? '' : ' (replay failed)'));
  }
  L.gates.forEach((g) => { g.correct = 1; });
  const s = L.starCount ? solve(L, true) : null;
  const starTxt = s ? (s.ok ? ' stars ' + [...Array(L.starCount)].map((_, i) => (s.stars >> i & 1) ? 'ok' : 'MISSED').join(',') : ' stars n/a') : '';
  console.log(name.padEnd(14), res.join(' | ') + starTxt);
}
