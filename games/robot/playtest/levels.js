// Code Robot: every level proved with the game's own interpreter, then played through the page (run from the repo root):
//   node games/robot/build.js && ND_CDP=9511 ND_PROFILE=edge-profile-robot ND_URL=file:///D:/Github/number-dash/games/robot/dist/preview.html ND_READY='!!window.__robot' ND_BOT=none node games/dash/playtest/shoot.js games/robot/playtest/levels.js
// Checks, in the page: every world has its size of levels (worlds.json); per mode, as tools/check.js does: build levels'
// solutions finish with every gem (or the whole picture, or every robot of a team), use exactly par blocks, fit the
// limit and the palette; fix levels open with a program that fails and is `fix` changes from the solution; order levels
// hold exactly the solution's blocks in an order that fails; shrink levels open with a working program over the limit;
// predict levels end on their answer square. Wrong programs fail kindly (a bump, too few blocks, a gem left, paint
// outside the picture, a team robot named, all with a kind message and no harsh words); the step cap stops endless
// loops. Then the whole game is played in order through the page: each level opened from its world card, its solution
// put in (a Code Reader level: its answer square tapped), Run or Check at high speed: 3 stars, the records, the worlds
// opening at 6 levels done in playing order, the next level opening in order. Problems go to window.__P; the last line
// says PASS or FAIL.
const LIB = `(() => {
  const R = window.__robot, E = R.Robot;
  window.__P = [];
  const P = (m) => { window.__P.push(m); return m; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, what, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > (ms || 20000)) throw new Error('timeout: ' + what); await sleep(5); } };
  window.__T = { R, E, P, sleep, waitFor };
  return 'lib ok';
})()`;

// every level, with the page's interpreter
const PROVE = `(() => {
  const { R, E, P } = window.__T, lines = [], per = {};
  const bag = (p) => E.tokens(p).filter((t) => t !== ')').sort().join(' ');
  for (const L of R.LEVELS) {
    per[L.w] = (per[L.w] || 0) + 1;
    if (L.m.w > 8 || L.m.h > 8) P(L.id + ' map too big');
    if (!L.hint || L.hint.length > 75) P(L.id + ' hint ' + L.hint);
    if (L.mode === 'predict') {
      const c = R.check(L.id, L.prog);
      if (['dizzy', 'self', 'empty'].indexOf(c.why) >= 0) P(L.id + ' the program ends ' + c.why);
      if (c.end !== L.answer) P(L.id + ' answer ' + L.answer + ' but the run ends at ' + c.end);
      lines.push(L.id + ' read ' + c.blocks + ' blocks, ends ' + c.why + ' at ' + c.x + ',' + c.y);
      continue;
    }
    const sol = E.parse(L.sol), r = E.run(L.m, sol), n = E.count(sol), pal = new Set(L.pal.split(''));
    if (!r.ok) P(L.id + ' solution: ' + r.why);
    (r.team || [r]).forEach((x) => { if (x.steps >= E.STEP_CAP * 0.8) P(L.id + ' steps ' + x.steps); });
    const c = R.check(L.id, L.sol); if (!c.ok || c.blocks !== n) P(L.id + ' check() ' + JSON.stringify(c));
    if (L.mode === 'order') {
      const st = E.parse(L.start);
      if (bag(st) !== bag(sol)) P(L.id + ' the muddle has other blocks');
      if (R.check(L.id, L.start).ok) P(L.id + ' the muddle works');
      lines.push(L.id + ' order ' + n + ' blocks');
      continue;
    }
    if (n !== L.par) P(L.id + ' par ' + L.par + ' but ' + n + ' blocks');
    if (n > L.max) P(L.id + ' over the limit');
    E.kinds(sol).forEach((k) => { if (k === 'n' ? !/[+-]/.test(L.pal) : !pal.has(k)) P(L.id + ' uses ' + k + ', not on offer'); });
    (L.alt || []).forEach((a) => { const ar = R.check(L.id, a); if (!ar.ok || ar.blocks > L.max) P(L.id + ' alt ' + a + ' ' + JSON.stringify(ar)); });
    const plain = E.minStraight(L.m), fancy = [...E.kinds(sol)].some((k) => 'rfijkgu+-'.indexOf(k) >= 0);
    if (L.w === 1 && plain !== L.par) P(L.id + ' par ' + L.par + ', fewest ' + plain);
    if (L.w > 1 && fancy && plain <= L.max) P(L.id + ' a plain list of ' + plain + ' fits the limit ' + L.max);
    if (L.mode === 'fix') {
      const st = R.check(L.id, L.start), ch = E.changes(E.parse(L.start), sol);
      if (st.ok) P(L.id + ' the bug program works');
      if (ch !== L.fix) P(L.id + ' fix ' + L.fix + ' but ' + ch);
      if (!/^[A-Z]/.test(st.message)) P(L.id + ' start message ' + st.message);
    }
    if (L.mode === 'shrink') {
      const st = R.check(L.id, L.start);
      if (!st.ok) P(L.id + ' the long program does not work: ' + st.why);
      if (st.blocks < L.max + 3) P(L.id + ' the long program has only ' + st.blocks + ' blocks');
    }
    if (L.mode === 'build' && L.start) P(L.id + ' a build level opens with a program');
    lines.push(L.id + ' ' + L.mode + ' ' + n + '/' + L.max + ' ' + r.steps + ' steps, plain ' + plain);
  }
  R.WORLDS.forEach((W) => { if ((per[W.id] || 0) !== W.size) P('world ' + W.id + ' has ' + (per[W.id] || 0) + ' levels, not ' + W.size); });
  return [R.LEVELS.length + ' levels in ' + R.WORLDS.length + ' worlds'].concat(lines.slice(0, 3), lines.slice(-3));
})()`;

// wrong programs fail kindly; the step cap stops endless loops
const KIND = `(() => {
  const { R, E, P } = window.__T, out = [], harsh = /\\b(wrong|fail\\w*|bad|error|stupid|oops|sorry|lose|lost|no!)/i;
  const expect = (id, prog, why, tag) => {
    const c = R.check(id, prog);
    if (c.ok) P(tag + ': ' + prog + ' finished ' + id);
    if (why && c.why !== why) P(tag + ': ' + prog + ' on ' + id + ' ended ' + c.why + ', not ' + why);
    if (harsh.test(c.message)) P(tag + ': a harsh message: ' + c.message);
    out.push(id + ' ' + prog + ' -> ' + c.why + ': ' + c.message);
    return c;
  };
  expect('1-1', 'F F', 'end', 'too few blocks');
  if (!/^Splash/.test(expect('1-4', 'F F F F', 'bump', 'into the water').message)) P('the water message');
  expect('1-3', 'F F L F F', 'bump', 'the wrong turn');
  expect('1-6', 'R R F F F', 'gems', 'flag without the gem');
  expect('1-7', 'R F', 'bump', 'into a wall');
  expect('2-1', 'r6(F)', 'end', 'one short');
  expect('3-1', 'f R f L f|F F', 'bump', 'F1 too short');
  expect('4-2', 'u(F)', 'bump', 'no If');
  expect('5-5', 'u(i(F)())', 'dizzy', 'no turn at the corner');
  expect('1-1', '', 'empty', 'nothing');
  // a picture: painting the start square stops the robot; turning without painting leaves squares to paint
  const pic = R.LEVELS.find((L) => L.m.targets.length && L.mode === 'build');
  if (pic) {
    if (!/not in the picture/.test(expect(pic.id, 'P', 'paint', 'paint outside').message)) P('the paint message');
    expect(pic.id, 'L', 'unpainted', 'nothing painted');
  }
  // a team: the message names the robot
  const team = R.LEVELS.find((L) => L.m.robots.length > 1 && L.mode === 'build');
  if (team && expect(team.id, 'L', '', 'a team robot named').message.indexOf('yellow robot') < 0) P('the team message does not name the robot');
  // the step cap
  for (const [id, p] of [['4-2', 'u()'], ['4-2', 'u(L)'], ['4-3', 'u(i(F)(L L))'], ['1-1', 'r9(r9(r9(L)))']]) {
    const r = E.run(R.LEVELS.find((L) => L.id === id).m, E.parse(p)), c = R.check(id, p);
    if (r.why !== 'dizzy' || r.steps !== E.STEP_CAP) P('step cap: ' + p + ' ended ' + r.why + ' after ' + r.steps);
    if (c.message !== 'The robot got dizzy: is your loop able to finish?') P('dizzy message: ' + c.message);
    out.push(id + ' ' + p + ' -> ' + r.why + ' after ' + r.steps + ' steps');
  }
  // a long but finite program is not cut short
  const long = R.check('4-3', 'u(i(F)(R))'); if (!long.ok) P('the spiral was cut short: ' + JSON.stringify(long));
  // F1 using F1 is refused by the interpreter too
  const self = R.check('3-1', 'f|f F'); if (self.why !== 'self') P('F1 in F1: ' + self.why);
  // stars
  const S = R.starsFor; if (S(3, 3) !== 3 || S(2, 3) !== 3 || S(4, 3) !== 2 || S(5, 3) !== 2 || S(6, 3) !== 1) P('stars rule');
  return out;
})()`;

// plays the whole game in order through the page: world card, level button, solution (or the answer square), Run
const PLAY_ALL = `(async () => {
  const { R, E, P, sleep, waitFor } = window.__T, lines = [];
  localStorage.clear();
  for (const k of Object.keys(R.rec.levels)) delete R.rec.levels[k];
  for (const k of Object.keys(R.rec.drafts)) delete R.rec.drafts[k];
  R.rec.seen = {}; R.WORLDS.forEach((W) => { R.rec.seen[W.id] = 1; }); R.rec.last = '';
  R.setSpeed(60);
  for (const L of R.LEVELS) {
    // locks: levels open in order, so the one after this is still locked
    const next = R.LEVELS[L.i + 1];
    if (next && next.w === L.w && R.levelOpen(next.id)) P(next.id + ' is open before ' + L.id + ' is done');
    if (!R.levelOpen(L.id)) { P(L.id + ' is locked when its turn comes'); continue; }
    R.goHome();
    document.querySelector('.world[data-world="' + L.w + '"]').click();
    const btn = document.querySelector('.lvl[data-level="' + L.id + '"]');
    if (!btn || btn.disabled) { P(L.id + ' level button'); continue; }
    btn.click();
    if (R.state().level !== L.id || R.state().state !== 'play') { P(L.id + ' did not open: ' + JSON.stringify(R.state())); continue; }
    if (L.start && R.state().prog !== E.print(E.parse(L.start))) P(L.id + ' did not open with its program: ' + R.state().prog);
    if (L.mode === 'predict') {
      if (R.state().prog !== E.print(E.parse(L.prog))) P(L.id + ' did not show its program');
      document.querySelector('#board .tile[data-i="' + L.answer + '"]').click();
    } else R.setProg(L.sol);
    document.getElementById('runBtn').click();
    await waitFor(() => R.state().state === 'done' || R.state().mode === 'end', L.id + ' run', 30000);
    const s = R.rec.levels[L.id];
    if (R.state().state !== 'done') { P(L.id + ' run ended ' + R.state().why + ': ' + R.state().say); continue; }
    const tries = L.mode === 'order' || L.mode === 'predict';
    if (!s || s.s !== 3 || s.b !== (tries ? 1 : L.par)) P(L.id + ' record ' + JSON.stringify(s));
    if (document.querySelectorAll('#doneStars span:not(.off)').length !== 3) P(L.id + ' done card stars');
    const f = R.fits(); if (f.length) P(L.id + ' done card: ' + f.join('; '));
    // the next world opens when this one has 6 levels done
    const nw = R.nextWorld(L.w);
    if (nw) {
      const d = R.LEVELS.filter((x) => x.w === L.w && R.rec.levels[x.id]).length;
      if (R.worldOpen(nw) !== (d >= R.OPEN_AT)) P('world ' + nw + ' open is ' + R.worldOpen(nw) + ' with ' + d + ' done in ' + L.w);
    }
    lines.push(L.id + ' ' + R.state().events + ' steps, ' + s.s + ' stars');
    await sleep(5);
  }
  R.setSpeed(1);
  const saved = JSON.parse(localStorage.getItem('code-robot.v1')), n = R.LEVELS.length;
  if (!saved || saved.done !== n || saved.stars !== 3 * n) P('records after all ' + n + ': ' + JSON.stringify(saved && { done: saved.done, stars: saved.stars }));
  if (Object.keys(saved.levels).length !== n) P('levels saved ' + Object.keys(saved.levels).length);
  return [lines.length + ' levels played', lines.slice(0, 3).join(' | '), lines.slice(-2).join(' | '), 'done ' + saved.done + ', stars ' + saved.stars];
})()`;

module.exports = [
  { viewport: [1180, 820, false, false, 1] },
  { eval: "localStorage.clear(); 'cleared'" }, { reload: true }, { sleep: 500 },
  { eval: LIB },
  { log: PROVE },
  { log: KIND },
  { log: PLAY_ALL },
  { shot: 'rob-l01-last-done' },
  { log: "(() => { window.__robot.goHome(); return [document.getElementById('contSub').textContent, document.querySelectorAll('.world.locked').length]; })()" },
  { shot: 'rob-l02-home-all-done' },
  { log: 'JSON.stringify(window.__errs)' },
  { log: "(window.__P.length || (window.__errs || []).length) ? 'FAIL ' + JSON.stringify(window.__P) : 'PASS: no problems'" }
];
