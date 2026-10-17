// Level checker: proves each level can be finished whichever door is correct,
// measures the timing window of every button press, and estimates how often a
// slightly sloppy player gets through. Usage: node tools/check.js [levelId] [--quick]
const ND = require('../src/engine.js');
try { require('../src/packs.js'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
const P = ND.PHYS;
const SUB = 4;                       // substeps per bot decision (1/60 s)
const CAP = +(process.env.CAP || 1200);                     // frontier cap per decision step
const MS = P.DT * 1000;
const args = process.argv.slice(2);
const only = args.find(a => !a.startsWith('--'));
const quick = args.includes('--quick');

function keyOf(q) {
  return q.mode + ',' + q.grav + ',' + (q.mini ? 1 : 0) + ',' + q.spd + ',' + (q.ground ? 1 : 0) + ',' + (q.held ? 1 : 0) + ',' +
    Math.round(q.y * 64) + ',' + Math.round(q.vy * 8) + ',' + q.lastOrb + ',' + q.lastPad + ',' +
    q.stars + ',' + (q.coyote > 0 ? 1 : 0) + ',' + (q.buf > 0 ? 1 : 0) + ',' + (q.obuf > 0 ? 1 : 0);
}

function solve(L, wantStars) {
  let frontier = [{ p: ND.newPlayer(), presses: 0 }];
  const par = [], hel = [];
  let best = 0, doneNodes = [];
  for (let step = 0; step < 100000; step++) {
    const seen = new Map();
    let nodes = [];
    for (let i = 0; i < frontier.length; i++) {
      const f = frontier[i];
      for (const held of (f.p.held ? [true, false] : [false, true])) {
        const q = ND.clone(f.p);
        for (let s = 0; s < SUB; s++) { ND.step(L, q, held); if (q.dead || q.done) break; }
        const presses = q.n * 1000 + (f.presses % 1000) + (held ? 1 : 0);
        if (q.dead) { if (q.x > best) best = q.x; continue; }
        if (q.done) { doneNodes.push({ step, parent: i, held, stars: q.stars, presses }); continue; }
        const k = keyOf(q);
        const at = seen.get(k);
        if (at !== undefined) {
          if (presses < nodes[at].presses) nodes[at] = { p: q, parent: i, held, presses };
          continue;
        }
        seen.set(k, nodes.length);
        nodes.push({ p: q, parent: i, held, presses });
      }
    }
    if (doneNodes.length) {
      let pick = doneNodes[0];
      for (const d of doneNodes) {
        const better = wantStars
          ? popcount(d.stars) > popcount(pick.stars) || (popcount(d.stars) === popcount(pick.stars) && d.presses < pick.presses)
          : d.presses < pick.presses;
        if (better) pick = d;
      }
      const held = [pick.held];
      let idx = pick.parent;
      for (let s = step - 1; s >= 0; s--) { held.push(!!hel[s][idx]); idx = par[s][idx]; }
      held.reverse();
      const perSub = [];
      held.forEach(h => { for (let s = 0; s < SUB; s++) perSub.push(h); });
      const edges = [];
      let prev = false;
      perSub.forEach((h, k) => { if (h !== prev) { edges.push(k); prev = h; } });
      return { ok: true, edges, stars: pick.stars, presses: pick.presses };
    }
    if (!nodes.length) return { ok: false, best };
    const cap = wantStars ? CAP * 3 : CAP;
    if (nodes.length > cap) {
      // keep the fewest-press state per coarse (y, vy) cell first, so the frontier stays spread out
      nodes.sort((a, b) => (wantStars ? popcount(b.p.stars) - popcount(a.p.stars) : 0) || a.presses - b.presses);
      const cells = new Set(), first = [], rest = [];
      for (const n of nodes) {
        const ck = n.p.mode + ',' + n.p.grav + ',' + (n.p.mini ? 1 : 0) + ',' + (n.p.held ? 1 : 0) + ',' + Math.round(n.p.y * 12) + ',' + Math.round(n.p.vy * 2) + (wantStars ? ',' + n.p.stars : '');
        if (cells.has(ck)) rest.push(n); else { cells.add(ck); first.push(n); }
      }
      let keep = first;
      if (keep.length > cap) {
        keep.sort((a, b) => a.p.y - b.p.y || a.p.vy - b.p.vy);
        const k2 = [];
        for (let i = 0; i < cap; i++) k2.push(keep[Math.floor(i * keep.length / cap)]);
        keep = k2;
      } else {
        for (let i = 0; keep.length < cap && i < rest.length; i += Math.max(1, Math.floor(rest.length / cap))) keep.push(rest[i]);
      }
      nodes = keep;
    }
    par.push(Int32Array.from(nodes.map(n => n.parent)));
    hel.push(Uint8Array.from(nodes.map(n => (n.held ? 1 : 0))));
    frontier = nodes;
  }
  return { ok: false, best };
}

// drop taps the run does not need (with everything else unchanged)
function prune(L, edges) {
  for (let i = 0; i + 1 < edges.length;) {
    const ed = edges.slice(0, i).concat(edges.slice(i + 2));
    if (canonical(L, ed).ok) edges = ed; else i += 2;
  }
  return edges;
}

function popcount(n) { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; }

function heldAt(edges, k) {
  let lo = 0, hi = edges.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (edges[m] <= k) lo = m + 1; else hi = m; }
  return (lo & 1) === 1;
}
function near(a, b) { return (a <= 0 && b <= 0) || Math.abs(a - b) < 1e-9; }
function same(a, b) {
  return a.mode === b.mode && a.grav === b.grav && a.mini === b.mini && a.spd === b.spd && a.ground === b.ground && a.held === b.held &&
    Math.abs(a.y - b.y) < 1e-9 && Math.abs(a.vy - b.vy) < 1e-9 && a.lastOrb === b.lastOrb &&
    a.lastPad === b.lastPad && a.stars === b.stars && near(a.coyote, b.coyote) && near(a.buf, b.buf) && near(a.obuf, b.obuf);
}

function canonical(L, edges) {
  const out = [];
  const p = ND.newPlayer();
  let k = 0;
  out.push(ND.clone(p));
  while (!p.dead && !p.done && k < 200000) { ND.step(L, p, heldAt(edges, k)); k++; out.push(ND.clone(p)); }
  return { states: out, ok: p.done, p };
}

function simulateFrom(L, edges, start, canon, convAfter) {
  const p = ND.clone(canon[start]);
  let k = start;
  while (!p.dead && !p.done && k < 200000) {
    ND.step(L, p, heldAt(edges, k)); k++;
    if (k > convAfter && k < canon.length && same(p, canon[k])) return true;
  }
  return p.done;
}

function windowOf(L, edges, i, canon) {
  // a press moves together with its release (the whole tap shifts); a release moves alone
  const pair = i % 2 === 0 && i + 1 < edges.length;
  const e = edges[i];
  const lo = i > 0 ? edges[i - 1] + 1 : 0;
  const last = pair ? i + 1 : i;
  const hi = last < edges.length - 1 ? edges[last + 1] - 1 - (edges[last] - e) : canon.length - 2 - (edges[last] - e);
  const tryShift = s => {
    const ed = edges.slice(); ed[i] = e + s; if (pair) ed[i + 1] += s;
    return simulateFrom(L, ed, Math.min(e, e + s), canon, Math.max(edges[last], edges[last] + s));
  };
  let a = 0, b = 0;
  for (let s = -1; e + s >= lo && s >= -160; s--) { if (!tryShift(s)) break; a = s; }
  for (let s = 1; e + s <= hi && s <= 160; s++) { if (!tryShift(s)) break; b = s; }
  return [a, b, pair];
}

function gauss(rng) {
  const u = 1 - rng(), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function mulberry(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function monteCarlo(L, edges, sigmaMs, trials, jitterable) {
  const rng = mulberry(12345);
  let ok = 0;
  const deaths = new Map();
  for (let t = 0; t < trials; t++) {
    // a tap shifts as a whole; its hold length wobbles a little on top
    const ed = edges.slice();
    for (let i = 0; i < ed.length; i += 2) {
      if (!jitterable[i]) continue;
      const sh = Math.round(gauss(rng) * sigmaMs / MS);
      ed[i] += sh;
      if (i + 1 < ed.length) ed[i + 1] += sh + Math.round(Math.abs(gauss(rng)) * 10 / MS);
    }
    ed.sort((a, b) => a - b);
    for (let i = 1; i < ed.length; i++) if (ed[i] <= ed[i - 1]) ed[i] = ed[i - 1] + 1;
    const p = ND.newPlayer();
    let k = 0;
    while (!p.dead && !p.done && k < 200000) { ND.step(L, p, heldAt(ed, k)); k++; }
    if (p.done) ok++;
    else { const b = Math.floor(p.x / 8) * 8; deaths.set(b, (deaths.get(b) || 0) + 1); }
  }
  return { rate: ok / trials, deaths: [...deaths.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4) };
}

// Solve one door layout, centre every tap in its window, then measure the tightest
// taps and how often a sloppy player (25 ms / 40 ms timing error) clears the level.
function analyzeVariant(L, opts) {
  opts = opts || {};
  const r = solve(L, false);
  if (!r.ok) return { ok: false, best: r.best };
  let edges = prune(L, r.edges);
  let c = canonical(L, edges);
  if (!c.ok) return { ok: false, best: c.p.x, replay: true };
  if (opts.quick) return { ok: true };
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < edges.length; i++) {
      const [a, b, pair] = windowOf(L, edges, i, c.states);
      const mid = Math.round((a + b) / 2);
      if (mid) { edges = edges.slice(); edges[i] += mid; if (pair) edges[i + 1] += mid; c = canonical(L, edges); }
    }
  }
  const rows = [];
  for (let i = 0; i < edges.length; i++) {
    const [a, b] = windowOf(L, edges, i, c.states);
    const st = c.states[edges[i]];
    const mode = ['cube', 'ship', 'ball', 'ufo', 'wave'][st.mode] + (st.grav < 0 && st.mode === 0 ? '(flip)' : '') + (st.mini ? '(mini)' : '');
    if (st.mode === 1 || st.mode === 4 || (i % 2 && b - a > 40)) continue;  // rocket and wave are steered, releases rarely matter
    rows.push({ i, x: st.x, mode, kind: i % 2 ? 'release' : 'tap', ms: (b - a + 1) * MS });
  }
  rows.sort((p, q) => p.ms - q.ms);
  // only cube and ball taps get the timing error; rocket, UFO and wave are steered as you go
  const jit = edges.map((e, i) => { const k = i - (i % 2), tap = (s) => s.mode === 0 || s.mode === 2; return tap(c.states[edges[k]]) && tap(c.states[edges[Math.min(k + 1, edges.length - 1)]]); });
  const trials = opts.trials || 300;
  const m1 = monteCarlo(L, edges, 25, trials, jit), m2 = monteCarlo(L, edges, 40, trials, jit);
  const taps = rows.filter((x) => x.kind === 'tap');
  return { ok: true, edges, rows, taps: Math.ceil(edges.length / 2), minTap: taps.length ? taps[0].ms : Infinity, rate25: m1.rate, rate40: m2.rate, deaths: m2.deaths };
}

function checkLevel(def) {
  const L = ND.parseLevel(def);
  const secs = L.finishX / L.speed;
  console.log(`\n== ${def.name} (${def.id}) ${def.bpm} BPM, speed ${L.speed.toFixed(1)} b/s, ${L.mapW} cols, ${secs.toFixed(1)} s, gates ${L.gates.length}, stars ${L.starCount}`);
  L.gates.forEach(g => {
    console.log(`   gate ${g.i}: question at x=${g.x}, doors at x=${g.doorX}, ${g.lanes} lanes, think time ${((g.doorX - g.x) / L.speed).toFixed(1)} s`);
  });
  const maxLanes = Math.max(1, ...L.gates.map(g => g.lanes));
  let allOk = true;
  for (let v = 1; v <= maxLanes; v++) {
    L.gates.forEach(g => { g.correct = Math.min(v, g.lanes); });
    const t0 = Date.now();
    const a = analyzeVariant(L, { quick });
    if (!a.ok) {
      console.log(a.replay ? `   door ${v}: replay failed at x=${a.best.toFixed(1)}` : `   door ${v}: IMPOSSIBLE, furthest x=${a.best.toFixed(1)}`);
      allOk = false; continue;
    }
    if (quick) { console.log(`   door ${v}: ok (${Date.now() - t0} ms)`); continue; }
    const tight = a.rows.slice(0, 8).map(r => `x=${r.x.toFixed(0)} ${r.mode} ${r.kind} ${r.ms.toFixed(0)}ms`).join(' | ');
    console.log(`   door ${v}: ok in ${Date.now() - t0} ms, ${a.taps} taps`);
    console.log(`      tightest: ${tight}`);
    console.log(`      sloppy player clears: ${(a.rate25 * 100).toFixed(0)}% (25ms), ${(a.rate40 * 100).toFixed(0)}% (40ms); deaths ${a.deaths.map(d => 'x' + d[0] + ':' + d[1]).join(' ')}`);
  }
  L.gates.forEach(g => { g.correct = 1; });
  const s = solve(L, true);
  const starPos = L.objs.filter(o => o.k === 'star').map(o => `(${o.x},${o.y})` + (s.ok && (s.stars >> o.si & 1) ? 'ok' : 'MISSED')).join(' ');
  console.log(`   stars reachable in one run: ${s.ok ? popcount(s.stars) : 'n/a'} of ${L.starCount}: ${starPos}`);
  return allOk;
}

module.exports = { solve, prune, canonical, windowOf, analyzeVariant, popcount };
if (require.main === module) {
let ok = true;
for (const def of ND.LEVELS) if (!only || def.id === only) ok = checkLevel(def) && ok;
console.log(ok ? '\nALL LEVELS BEATABLE' : '\nSOME LEVELS FAILED');
process.exit(ok ? 0 : 1);
}
