// Number Pop: a bot plays full rounds of every world (run from the repo root):
//   node games/pop/build.js && ND_CDP=9351 ND_PROFILE=edge-profile-pop ND_URL=file:///D:/Github/number-dash/games/pop/dist/preview.html ND_READY='!!window.__pop' ND_BOT=none node games/dash/playtest/shoot.js games/pop/playtest/worlds.js
// For every target the bot first checks, on its own, that the bubbles in the field can make it
// (any 2-3 bubbles, or a times pair) and that the game's planted answer is real and still there.
// Then it solves like a child would: a moment to read the target, a scan of the field, some
// mental arithmetic per step (slower with a carry, a borrow or two-digit numbers, recall time for
// times tables), and a finger move per tap. All delays are game seconds, so the game runs 8x fast.
// "quick" is a quick, confident 10-year-old (the 3-star line); "relaxed" thinks 1.6x slower and
// slips on one target in five (the 2-star line). The star thresholds in pop.html come from here.
const BOT = `(() => {
  const P = window.__pop;
  const PROFILES = { quick: { k: 1, slip: 0.05 }, relaxed: { k: 1.6, slip: 0.2 } };
  const B = window.__pbot = { on: false, profile: 'quick', runs: [], unsolvable: [], badPlanted: [], key: '', steps: [], slipTid: -1, replan: false, targets: [] };
  const alive = (b) => b.st === 'live' || b.st === 'in';
  const digits = (v) => String(Math.abs(v)).length;
  const sum = (vs) => vs.reduce((a, b) => a + b, 0);
  function solutions(s, bubs) {
    const live = bubs.filter((b) => alive(b) && !b.picked), out = [];
    const sizes = s.kind === 'times' || s.world === 1 ? [2] : [2, 3];   // Make 10 is about pairs (number bonds)
    for (const k of sizes) {
      (function go(start, ch) {
        if (ch.length === k) {
          const vs = ch.map((b) => b.v);
          if (s.kind === 'times' ? vs[0] * vs[1] === s.target : sum(vs) === s.target) out.push(ch.map((b) => b.i));
          return;
        }
        for (let j = start; j < live.length; j++) go(j + 1, ch.concat([live[j]]));
      })(0, []);
    }
    return out;
  }
  // working out the next bubble from the running total: a known bond to 10 is quick, two-digit
  // sums are slower, a carry or a borrow slower still, and taking away costs a little extra
  function stepCost(tot, v, world) {
    if (world === 1) return 0.7;
    const two = digits(tot) > 1 || digits(v) > 1, a = Math.abs(tot) % 10, b = Math.abs(v) % 10;
    let c = two ? 1.6 : 0.8;
    if (v < 0) c += 0.5 + (a < b ? (two ? 0.8 : 0.3) : 0);
    else if (a + b >= 10) c += two ? 0.8 : 0.3;
    return c;
  }
  function plan(s, bubs) {
    const prof = PROFILES[B.profile], k = prof.k, sols = solutions(s, bubs);
    const scan = 0.08 * bubs.filter(alive).length, steps = [];
    let t = s.time + k * 0.8;
    if (B.slipTid !== s.tid) {
      B.slipTid = s.tid;
      if (Math.random() < prof.slip) {
        const used = new Set([].concat.apply([], sols));
        const wrong = bubs.filter((b) => alive(b) && !b.picked && !used.has(b.i)).sort(() => Math.random() - 0.5).slice(0, s.kind === 'times' ? 2 : 4);
        if (wrong.length >= 2) {
          wrong.forEach((b) => { t += k * (0.6 + scan * 0.5); steps.push({ at: t, i: b.i }); });
          B.replan = true;
          return steps;
        }
      }
    }
    if (!sols.length) return steps;
    const sol = s.sol.length && Math.random() < 0.5 ? s.sol : sols[Math.floor(Math.random() * sols.length)];
    if (s.kind === 'times') {
      const recall = { starter: 1.0, explorer: 1.5, genius: 1.9 }[P.save.settings.mathLevel] || 1.5;
      t += k * (scan + recall); steps.push({ at: t, i: sol[0] });
      t += k * (0.45 + scan * 0.5); steps.push({ at: t, i: sol[1] });
    } else {
      t += k * (sol.length - 2) * 1.2;   // three bubbles take more planning
      let tot = 0;
      sol.forEach((i, j) => { const v = bubs[i].v; t += k * (0.45 + scan * (j ? 0.6 : 1) + (j ? stepCost(tot, v, s.world) : 0.2)); tot += v; steps.push({ at: t, i: i }); });
    }
    return steps;
  }
  function tick() {
    if (!B.on) return;
    const s = P.state();
    if (s.state !== 'play' || s.phase !== 'pick') return;
    const bubs = P.bubbles(), key = s.tid + '/' + s.slips;
    if (key !== B.key) {
      const fresh = B.key.split('/')[0] !== String(s.tid);
      B.key = key; B.replan = false;
      if (fresh) {
        B.targets.push(s.target);
        if (!solutions(s, bubs).length) B.unsolvable.push({ world: s.world, kind: s.kind, target: s.target, vals: bubs.map((b) => b.v) });
        const pv = s.sol.map((i) => bubs[i] && bubs[i].v);
        const ok = s.sol.every((i) => bubs[i] && alive(bubs[i])) && (s.kind === 'times' ? pv.length === 2 && pv[0] * pv[1] === s.target
          : pv.length >= 2 && pv.length <= 3 && sum(pv) === s.target && (s.kind !== 'minus' || pv.some((v) => v < 0)));
        if (!ok) B.badPlanted.push({ world: s.world, target: s.target, sol: s.sol, vals: pv });
      }
      B.steps = plan(s, bubs);
    }
    if (!B.steps.length) {
      if (s.picks.length) { s.picks.forEach((i, j) => B.steps.push({ at: s.time + 0.5 + j * 0.4, i: i })); B.replan = true; }
      else if (B.replan) { B.replan = false; B.steps = plan(s, bubs); }
    }
    const st = B.steps[0];
    if (st && s.time >= st.at) { B.steps.shift(); P.tap(st.i); }
  }
  B.run = (world, profile, level) => {
    B.on = true; B.profile = profile; B.key = ''; B.steps = []; B.targets = []; B.slipTid = -1;
    P.save.settings.mathLevel = level || 'explorer';
    return P.start(world);
  };
  B.done = () => {
    const r = P.state().result;
    const run = { world: r.world, profile: B.profile, level: P.save.settings.mathLevel, time: +r.time.toFixed(1), slips: r.slips, stars: r.stars, score: r.score, targets: B.targets.join(' ') };
    B.runs.push(run); B.on = false;
    return run;
  };
  P.hook = tick;
  return 'bot ready';
})()`;
const play = (world, profile, level) => [
  { eval: `window.__pbot.run(${world}, '${profile}', '${level || 'explorer'}')` },
  { waitFor: "window.__pop.state().state === 'done'", timeout: 90000 },
  { log: 'window.__pbot.done()' }
];
const SUMMARY = `window.__pbot.summary = () => {
  const B = window.__pbot, out = {};
  for (const r of B.runs) {
    const k = 'w' + r.world + ' ' + r.profile + (r.world >= 5 ? ' ' + r.level : '');
    const o = out[k] || (out[k] = { runs: 0, mean: 0, max: 0, stars: [] });
    o.runs++; o.mean += r.time; o.max = Math.max(o.max, r.time); o.stars.push(r.stars);
  }
  for (const k in out) out[k].mean = +(out[k].mean / out[k].runs).toFixed(1);
  return { table: out, unsolvable: B.unsolvable.length, badPlanted: B.badPlanted.length, rounds: B.runs.length };
}; 'summary ready'`;
// POP_QUICK / POP_RELAXED: rounds per world for each profile (default 3 and 2); POP_SPEED: game speed (default 8)
const QUICK = +process.env.POP_QUICK || 3, RELAXED = +process.env.POP_RELAXED || 2, SPEED = +process.env.POP_SPEED || 8;
const steps = [{ viewport: [1180, 820, false, false, 1] }, { sleep: 500 }, { eval: BOT }, { eval: SUMMARY }, { eval: 'window.__pop.setSpeed(' + SPEED + '); "speed " + ' + SPEED }];
for (const w of [1, 2, 3, 4, 5, 6]) {
  for (let i = 0; i < QUICK; i++) steps.push(...play(w, 'quick'));
  for (let i = 0; i < RELAXED; i++) steps.push(...play(w, 'relaxed'));
}
// the times tables at the other two math levels, and the Mix world on Genius
steps.push(...play(5, 'quick', 'starter'), ...play(5, 'quick', 'genius'), ...play(6, 'quick', 'starter'), ...play(6, 'quick', 'genius'));
steps.push({ sleep: 2000 }, { shot: 'pop-w01-results' });
steps.push({ log: 'JSON.stringify(window.__pbot.summary())' }, { log: 'JSON.stringify(window.__pbot.unsolvable.slice(0, 5))' }, { log: 'JSON.stringify(window.__pbot.badPlanted.slice(0, 5))' });
steps.push({ log: 'JSON.stringify(window.__pop.rec)' }, { log: 'JSON.stringify(window.__pop.save.math)' });
module.exports = steps;
