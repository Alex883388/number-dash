// Number Pop: generation checks for every world, then a bot plays full rounds of every world (run from the repo root):
//   node games/pop/build.js && ND_CDP=9351 ND_PROFILE=edge-profile-pop ND_URL=file:///D:/Github/number-dash/games/pop/dist/preview.html ND_READY='!!window.__pop' ND_BOT=none node games/dash/playtest/shoot.js games/pop/playtest/worlds.js
// Generation checks: thousands of puzzles per world (POP_GEN, default 3000), each made by popping an answer
// (the planted one or another that works) and planning the next target at once. Every puzzle must pass
// B.check: solvable, the planted answer real and still there, a whole-number target that no single bubble
// already shows, and for the newer worlds no two bubbles the same, exactly one bubble with a question's
// answer (worked out here from the question's own text), place-value bubbles one digit in its place, and
// percent pairs from 10/20/25/50/75% with whole answers from 2 to 60.
// Then for every target in play the bot checks the same, and solves like a child would: a moment to read
// the target, a scan of the field, some mental arithmetic per step (slower with a carry, a borrow or
// two-digit numbers, a little more for pounds and pence or a decimal point, fractions slower when the
// denominators differ, crossing zero a moment more, recall time for times tables and more for sharing,
// a question's own working out for doubles, halves and brackets, finding a percent pair), and a finger
// move per tap. All delays are game seconds, so the game runs 8x fast.
// "quick" is a quick, confident 10-year-old (the 3-star line); "relaxed" thinks 1.6x slower and
// slips on one target in five (the 2-star line). The star thresholds in pop.html come from here.
const BOT = `(() => {
  const P = window.__pop, PCT = P.PCT;
  const PROFILES = { quick: { k: 1, slip: 0.05 }, relaxed: { k: 1.6, slip: 0.2 } };
  const B = window.__pbot = { on: false, profile: 'quick', runs: [], unsolvable: [], bad: [], gens: [], key: '', steps: [], slipTid: -1, replan: false, targets: [] };
  const alive = (b) => b.st === 'live' || b.st === 'in';
  const digits = (v) => String(Math.abs(v)).length;
  const sum = (vs) => vs.reduce((a, b) => a + b, 0);
  const quot = (vs) => { const big = Math.max(vs[0], vs[1]), small = Math.min(vs[0], vs[1]); return small > 0 && big % small === 0 ? big / small : NaN; };
  const isPct = (v) => v >= PCT;
  // a percent of a number, worked out here (not with the game's code): NaN unless one of each and whole
  const pctOf = (vs) => {
    if (vs.length !== 2 || isPct(vs[0]) === isPct(vs[1])) return NaN;
    const p = (isPct(vs[0]) ? vs[0] : vs[1]) - PCT, n = isPct(vs[0]) ? vs[1] : vs[0], r = p * n / 100;
    return Number.isInteger(r) ? r : NaN;
  };
  // a question's answer from its own text: double 35, half of 48, or a bracket sum with − × ÷
  function answerOf(q) {
    if (q.indexOf('double ') === 0) return 2 * Number(q.slice(7));
    if (q.indexOf('half of ') === 0) { const y = Number(q.slice(8)); return y % 2 ? NaN : y / 2; }
    const e = q.split('−').join('-').split('×').join('*').split('÷').join('/');
    if (!e.split('').every((c) => '0123456789 ()+-*/'.indexOf(c) >= 0)) return NaN;
    return Function('return (' + e + ')')();
  }
  const show = (s, v) => (s.kind === 'pct' && isPct(v) ? (v - PCT) + '%' : String(v));
  function solutions(s, bubs) {
    const live = bubs.filter((b) => alive(b) && !b.picked), out = [];
    // a question is one bubble; Make 10 is about pairs (number bonds)
    const sizes = s.kind === 'ask' ? [1] : s.kind === 'times' || s.kind === 'div' || s.kind === 'pct' || s.world === 1 ? [2] : [2, 3];
    for (const k of sizes) {
      (function go(start, ch) {
        if (ch.length === k) {
          const vs = ch.map((b) => b.v);
          if (s.kind === 'ask' ? vs[0] === s.target : s.kind === 'pct' ? pctOf(vs) === s.target : s.kind === 'times' ? vs[0] * vs[1] === s.target : s.kind === 'div' ? quot(vs) === s.target : sum(vs) === s.target) out.push(ch.map((b) => b.i));
          return;
        }
        for (let j = start; j < live.length; j++) go(j + 1, ch.concat([live[j]]));
      })(0, []);
    }
    return out;
  }
  // every check a puzzle must pass; the problems found, or '' when there are none
  B.check = (s, bubs) => {
    const errs = [], live = bubs.filter(alive), vals = live.map((b) => b.v), T = s.target;
    if (live.length !== bubs.length) errs.push('a bubble missing');
    if (!solutions(s, bubs).length) errs.push('unsolvable');
    const pv = s.sol.map((i) => bubs[i] && bubs[i].v);
    const planted = s.sol.every((i) => bubs[i] && alive(bubs[i])) && (s.kind === 'ask' ? pv.length === 1 && pv[0] === T
      : s.kind === 'pct' ? pv.length === 2 && pctOf(pv) === T
      : s.kind === 'times' ? pv.length === 2 && pv[0] * pv[1] === T : s.kind === 'div' ? pv.length === 2 && quot(pv) === T
      : pv.length >= 2 && pv.length <= 3 && sum(pv) === T && (s.kind !== 'minus' || pv.some((v) => v < 0)));
    if (!planted) errs.push('planted answer wrong');
    if (!Number.isInteger(T)) errs.push('target not whole');
    if (s.kind !== 'ask' && s.kind !== 'div' && vals.indexOf(T) >= 0) errs.push('a bubble is the target');   // sharing: a bubble may equal the quotient (it takes two)
    if (s.world >= 13 && new Set(vals).size !== vals.length) errs.push('two bubbles the same');
    if (s.kind === 'ask') {
      if (vals.filter((v) => v === T).length !== 1) errs.push('answer not on exactly one bubble');
      if (answerOf(s.q) !== T) errs.push('question does not make the target');
      if (!(T >= 1 && T <= 100)) errs.push('answer out of range');
      if (vals.some((v) => !Number.isInteger(v) || v < 1 || v > 100)) errs.push('a bubble out of range');
      if (s.world === 13 && s.q.indexOf('double ') !== 0 && s.q.indexOf('half of ') !== 0) errs.push('not a double or a half');
      if (s.world === 15) {
        const ops = s.q.split('').filter((c) => '+−×÷'.indexOf(c) >= 0);
        if (ops.length !== 2 || (s.q.indexOf('(') < 0 && !ops.some((c) => c === '×' || c === '÷'))) errs.push('not a two-step sum');
      }
    }
    if (s.world === 14) {
      const place = (v) => (v >= 1000 ? 3 : v >= 100 ? 2 : v >= 10 ? 1 : 0);
      if (!vals.every((v) => Number.isInteger(v) && v >= 1 && v <= 9000 && v % Math.pow(10, place(v)) === 0)) errs.push('a bubble is not one digit in its place');
      const parts = String(T).split('').reverse().map((d, p) => Number(d) * Math.pow(10, p)).filter(Boolean);
      if (T < 100 || T > 9999 || parts.length < 2 || parts.length > 3) errs.push('target not a place-value number');
      if (T >= 1000 && s.done < 5) errs.push('four digits too early');
      if (pv.slice().sort((a, b) => a - b).join() !== parts.sort((a, b) => a - b).join()) errs.push('planted answer is not its places');
    }
    if (s.kind === 'pct') {
      const ps = vals.filter(isPct).map((v) => v - PCT), ns = vals.filter((v) => !isPct(v));
      if (!ps.length || ps.some((p) => [10, 20, 25, 50, 75].indexOf(p) < 0)) errs.push('percent bubbles wrong');
      if (ps.length > 3) errs.push('more than three percent bubbles');
      if (ns.some((n) => !Number.isInteger(n) || n < 1 || n > 120)) errs.push('a number out of range');
      if (!(T >= 2 && T <= 60)) errs.push('target out of range');
    }
    return errs.join(', ');
  };
  // working out the next bubble from the running total: a known bond to 10 is quick, two-digit
  // sums are slower, a carry or a borrow slower still, and taking away costs a little extra
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  function stepCost(tot, v, world, fd) {
    if (world === 1) return 0.7;
    if (world === 9 || world === 11) return stepCost(tot, v, 0) + 0.4;   // money and decimals: the same sums, plus the units or the point
    if (world === 10) {   // fractions: quick with the same denominator, slower when one must be changed
      const den = (u) => fd / gcd(u % fd, fd);
      return 1.3 + (den(tot) !== den(v) ? 0.8 : 0);
    }
    if (world === 12) return stepCost(tot, v, 0) + ((tot >= 0) !== (tot + v >= 0) ? 0.5 : 0);   // crossing zero takes a moment more
    if (world === 14) return 0.8;   // place value: no sum to do, only the right digit in the right place to find
    const two = digits(tot) > 1 || digits(v) > 1, a = Math.abs(tot) % 10, b = Math.abs(v) % 10;
    let c = two ? 1.6 : 0.8;
    if (v < 0) c += 0.5 + (a < b ? (two ? 0.8 : 0.3) : 0);
    else if (a + b >= 10) c += two ? 0.8 : 0.3;
    return c;
  }
  // a question's working out: doubles and halves slower with a carry or an odd tens digit; brackets are two
  // steps, a little more with a two-digit number or a division
  function askCost(q) {
    if (q.indexOf('double ') === 0) { const x = Number(q.slice(7)); return x < 10 || x % 10 === 0 ? 1.0 : x % 10 >= 5 ? 1.9 : 1.4; }
    if (q.indexOf('half of ') === 0) { const y = Number(q.slice(8)); return y <= 20 ? 1.1 : Math.floor(y / 10) % 2 ? 2.0 : 1.4; }
    const two = q.split(' ').some((w) => w.split('(').join('').split(')').join('').length > 1);
    return 2.6 + (two ? 0.5 : 0) + (q.indexOf('÷') >= 0 ? 0.5 : 0);
  }
  function plan(s, bubs) {
    const prof = PROFILES[B.profile], k = prof.k, sols = solutions(s, bubs);
    const scan = 0.08 * bubs.filter(alive).length, steps = [];
    let t = s.time + k * 0.8;
    if (B.slipTid !== s.tid) {
      B.slipTid = s.tid;
      if (Math.random() < prof.slip) {
        const used = new Set([].concat.apply([], sols)), n = s.kind === 'ask' ? 1 : s.kind === 'times' || s.kind === 'div' || s.kind === 'pct' ? 2 : 4;
        const wrong = bubs.filter((b) => alive(b) && !b.picked && !used.has(b.i)).sort(() => Math.random() - 0.5).slice(0, n);
        if (wrong.length >= Math.min(n, 2)) {
          wrong.forEach((b) => { t += k * (0.6 + scan * 0.5); steps.push({ at: t, i: b.i }); });
          B.replan = true;
          return steps;
        }
      }
    }
    if (!sols.length) return steps;
    const sol = s.sol.length && Math.random() < 0.5 ? s.sol : sols[Math.floor(Math.random() * sols.length)];
    if (s.kind === 'ask') {   // read the question, work it out, find the one bubble
      t += k * (scan + askCost(s.q)); steps.push({ at: t, i: sol[0] });
    } else if (s.kind === 'times' || s.kind === 'div' || s.kind === 'pct') {
      // percent: like sharing, a search for a pair that works (half, a quarter or a tenth of a number)
      const recall = s.kind === 'pct' ? 2.6 : (s.kind === 'div' ? { starter: 1.3, explorer: 1.9, genius: 2.3 } : { starter: 1.0, explorer: 1.5, genius: 1.9 })[P.save.settings.mathLevel] || 1.5;
      t += k * (scan + recall); steps.push({ at: t, i: sol[0] });
      t += k * (0.45 + scan * 0.5); steps.push({ at: t, i: sol[1] });
    } else {
      t += k * (sol.length - 2) * 1.2;   // three bubbles take more planning
      let tot = 0;
      sol.forEach((i, j) => { const v = bubs[i].v; t += k * (0.45 + scan * (j ? 0.6 : 1) + (j ? stepCost(tot, v, s.world, s.fd) : 0.2)); tot += v; steps.push({ at: t, i: i }); });
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
        B.targets.push(s.q || s.target);
        if (!solutions(s, bubs).length) B.unsolvable.push({ world: s.world, kind: s.kind, target: s.target, vals: bubs.map((b) => b.v) });
        const e = B.check(s, bubs);
        if (e) B.bad.push({ world: s.world, target: s.target, q: s.q, err: e, vals: bubs.map((b) => show(s, b.v)).join(' ') });
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
    const run = { world: r.world, profile: B.profile, level: P.save.settings.mathLevel, time: +r.time.toFixed(1), slips: r.slips, stars: r.stars, score: r.score, targets: B.targets.join(', ') };
    B.runs.push(run); B.on = false;
    return run;
  };
  // generation checks: count puzzles in a row, each made by popping an answer (half the time the planted
  // one, else any that works) and planning the next target at once. newestOnly: how often the answer is
  // made only of the bubbles that just floated in
  B.gen = (world, count, level) => {
    B.on = false; P.save.settings.mathLevel = level || 'explorer'; P.start(world);
    const bad = [], seen = new Set();
    let newest = 0, prev = [], example = '';
    for (let k = 0; k < count; k++) {
      const s = P.state(), bubs = P.bubbles(), e = B.check(s, bubs);
      seen.add(s.q || s.target);
      if (!example) example = (s.q || 'make ' + s.target) + ' :: ' + bubs.map((b) => show(s, b.v)).join(' ') + ' :: answer ' + s.sol.map((i) => show(s, bubs[i].v)).join(' + ');
      if (e) bad.push({ target: s.target, q: s.q, err: e, vals: bubs.map((b) => show(s, b.v)).join(' ') });
      if (k && s.sol.every((i) => prev.indexOf(i) >= 0)) newest++;
      const sols = solutions(s, bubs), use = sols.length && Math.random() < 0.5 ? sols[Math.floor(Math.random() * sols.length)] : s.sol;
      prev = use.slice();
      P.next(use);
    }
    P.home();
    const out = { world: world, level: P.save.settings.mathLevel, puzzles: count, bad: bad.length, distinct: seen.size, newestOnly: +(newest / Math.max(1, count - 1)).toFixed(2), example: example, first: bad.slice(0, 3) };
    B.gens.push(out);
    return out;
  };
  B.genSummary = () => {
    const by = {};
    for (const g of B.gens) { const o = by['w' + g.world] || (by['w' + g.world] = { puzzles: 0, bad: 0 }); o.puzzles += g.puzzles; o.bad += g.bad; }
    // a world where the answer is mostly the bubble that just floated in can be played without thinking
    const newest = B.gens.filter((g) => g.newestOnly > 0.5).map((g) => 'w' + g.world + ' ' + g.newestOnly);
    return { puzzles: B.gens.reduce((a, g) => a + g.puzzles, 0), bad: B.gens.reduce((a, g) => a + g.bad, 0), answerMostlyNewest: newest, worlds: by };
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
    const k = 'w' + r.world + ' ' + r.profile + ([5, 6, 8, 10].indexOf(r.world) >= 0 ? ' ' + r.level : '');
    const o = out[k] || (out[k] = { runs: 0, mean: 0, max: 0, stars: [] });
    o.runs++; o.mean += r.time; o.max = Math.max(o.max, r.time); o.stars.push(r.stars);
  }
  for (const k in out) out[k].mean = +(out[k].mean / out[k].runs).toFixed(1);
  const quickMissed = B.runs.filter((r) => r.profile === 'quick' && r.stars < 3).map((r) => 'w' + r.world + ' ' + r.level + ' ' + r.time + 's ' + r.slips + ' slips');
  const relaxedMissed = B.runs.filter((r) => r.profile === 'relaxed' && r.stars < 2).map((r) => 'w' + r.world + ' ' + r.time + 's');
  return { table: out, rounds: B.runs.length, quickNot3Stars: quickMissed, relaxedUnder2Stars: relaxedMissed, unsolvable: B.unsolvable.length, bad: B.bad.length };
}; 'summary ready'`;
// POP_QUICK / POP_RELAXED: rounds per world for each profile (default 3 and 2); POP_SPEED: game speed (default 8)
// POP_GEN: generation-check puzzles per world (default 3000, 0 skips them); POP_PLAY=0 skips the played rounds
const QUICK = process.env.POP_QUICK === undefined ? 3 : +process.env.POP_QUICK, RELAXED = process.env.POP_RELAXED === undefined ? 2 : +process.env.POP_RELAXED;
const SPEED = +process.env.POP_SPEED || 8, GEN = process.env.POP_GEN === undefined ? 3000 : +process.env.POP_GEN, PLAY = process.env.POP_PLAY !== '0';
const steps = [{ viewport: [1180, 820, false, false, 1] }, { sleep: 500 }, { eval: BOT }, { eval: SUMMARY }];
// POP_WORLDS: which worlds to check and play (default all sixteen), e.g. POP_WORLDS=13,14,15,16
const WORLDS = (process.env.POP_WORLDS || '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16').split(',').map(Number);
const LEVELLED = [5, 6, 8, 10];   // the worlds that follow the math level
if (GEN) {
  for (const w of WORLDS) {
    const levels = LEVELLED.indexOf(w) >= 0 ? ['starter', 'explorer', 'genius', 'genius'] : ['explorer'];
    const chunks = Math.max(levels.length, 3), n = Math.ceil(GEN / chunks);
    for (let c = 0; c < chunks; c++) steps.push({ log: `JSON.stringify(window.__pbot.gen(${w}, ${n}, '${levels[c % levels.length]}'))` });
  }
  steps.push({ log: 'JSON.stringify(window.__pbot.genSummary())' });
}
if (PLAY) {
  steps.push({ eval: 'window.__pop.setSpeed(' + SPEED + '); "speed " + ' + SPEED });
  for (const w of WORLDS) {
    for (let i = 0; i < QUICK; i++) steps.push(...play(w, 'quick'));
    for (let i = 0; i < RELAXED; i++) steps.push(...play(w, 'relaxed'));
  }
  // the worlds that follow the math level, at the other two levels
  for (const w of LEVELLED) if (WORLDS.indexOf(w) >= 0) steps.push(...play(w, 'quick', 'starter'), ...play(w, 'quick', 'genius'));
  steps.push({ sleep: 2000 }, { shot: 'pop-w01-results' });
  steps.push({ log: 'JSON.stringify(window.__pbot.summary())' }, { log: 'JSON.stringify(window.__pbot.unsolvable.slice(0, 5))' }, { log: 'JSON.stringify(window.__pbot.bad.slice(0, 5))' });
  steps.push({ log: 'JSON.stringify(window.__pop.rec)' }, { log: 'JSON.stringify(window.__pop.save.math)' });
}
steps.push({ log: 'JSON.stringify(window.__errs)' });
module.exports = steps;
