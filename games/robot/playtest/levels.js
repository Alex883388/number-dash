// Code Robot: every level proved with the game's own interpreter, then played through the page (run from the repo root):
//   node games/robot/build.js && ND_CDP=9511 ND_PROFILE=edge-profile-robot ND_URL=file:///D:/Github/number-dash/games/robot/dist/preview.html ND_READY='!!window.__robot' ND_BOT=none node games/dash/playtest/shoot.js games/robot/playtest/levels.js
// Checks, in the page: 40 levels, 8 per world; every reference solution finishes its level with every gem, uses
// exactly par blocks, fits the block limit, uses only the palette's blocks, and takes fewer than STEP_CAP steps; every
// alt solution finishes within the limit; the world's idea is needed (Loops, Functions and Conditions levels: the
// fewest plain Forward / turn blocks is over the limit); Debugging levels open with a program that fails and is
// `fix` changes from the solution. Wrong programs fail kindly (a bump, too few blocks, a gem left, all with a kind
// message and no harsh words); the step cap stops endless loops (an empty Repeat until, a loop that only turns, and
// Repeats nested three deep) with the dizzy message. Then the whole game is played in order through the page: each
// level opened from its world card, its solution put in, Run at high speed: 3 stars, the records (s 3, b = par), the
// worlds opening at 6 levels done, the next level opening in order. Problems go to window.__P; the last line says PASS
// or FAIL.
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
  if (R.LEVELS.length !== 40) P(R.LEVELS.length + ' levels');
  for (const L of R.LEVELS) {
    per[L.w] = (per[L.w] || 0) + 1;
    const sol = E.parse(L.sol), r = E.run(L.m, sol), n = E.count(sol), pal = new Set(L.pal.split(''));
    if (!r.ok) P(L.id + ' solution: ' + r.why);
    if (r.left !== 0) P(L.id + ' gems left ' + r.left);
    if (n !== L.par) P(L.id + ' par ' + L.par + ' but ' + n + ' blocks');
    if (n > L.max) P(L.id + ' over the limit');
    if (r.steps >= E.STEP_CAP) P(L.id + ' steps ' + r.steps);
    E.kinds(sol).forEach((k) => { if (!pal.has(k)) P(L.id + ' uses ' + k + ', not on offer'); });
    const c = R.check(L.id, L.sol); if (!c.ok || c.blocks !== L.par) P(L.id + ' check() ' + JSON.stringify(c));
    if (L.m.w > 8 || L.m.h > 8) P(L.id + ' map too big');
    (L.alt || []).forEach((a) => { const ar = R.check(L.id, a); if (!ar.ok || ar.blocks > L.max) P(L.id + ' alt ' + a + ' ' + JSON.stringify(ar)); });
    const plain = E.minStraight(L.m), fancy = [...E.kinds(sol)].some((k) => 'rfigu'.indexOf(k) >= 0);
    if (L.w === 1 && plain !== L.par) P(L.id + ' par ' + L.par + ', fewest ' + plain);
    if (L.w > 1 && fancy && plain <= L.max) P(L.id + ' a plain list of ' + plain + ' fits the limit ' + L.max);
    if (L.w === 4 && (pal.has('r') || pal.has('f'))) P(L.id + ' a Conditions level offers Repeat or F1');
    if (L.w === 5) {
      const st = R.check(L.id, L.start), ch = E.changes(E.parse(L.start), sol);
      if (st.ok) P(L.id + ' the bug program works');
      if (ch !== L.fix) P(L.id + ' fix ' + L.fix + ' but ' + ch);
      if (!/^[A-Z]/.test(st.message)) P(L.id + ' start message ' + st.message);
    } else if (L.start) P(L.id + ' opens with a program');
    if (!L.hint || L.hint.length > 75) P(L.id + ' hint ' + L.hint);
    lines.push(L.id + ' ' + n + '/' + L.max + ' ' + r.steps + ' steps, plain ' + plain + (L.start ? ', start ' + R.check(L.id, L.start).why + ', fix ' + L.fix : ''));
  }
  if (Object.values(per).join() !== '8,8,8,8,8') P('per world ' + JSON.stringify(per));
  return lines;
})()`;

// wrong programs fail kindly; the step cap stops endless loops
const KIND = `(() => {
  const { R, E, P } = window.__T, out = [], harsh = /\b(wrong|fail\w*|bad|error|stupid|oops|sorry|lose|lost|no!)/i;
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

// plays the whole game in order through the page: world card, level button, solution, Run
const PLAY_ALL = `(async () => {
  const { R, E, P, sleep, waitFor } = window.__T, lines = [];
  localStorage.clear();
  for (const k of Object.keys(R.rec.levels)) delete R.rec.levels[k];
  for (const k of Object.keys(R.rec.drafts)) delete R.rec.drafts[k];
  R.rec.seen = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 }; R.rec.last = '';
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
    if (L.start && R.state().prog !== E.print(E.parse(L.start))) P(L.id + ' did not open with its bug program: ' + R.state().prog);
    R.setProg(L.sol);
    document.getElementById('runBtn').click();
    await waitFor(() => R.state().state === 'done' || R.state().mode === 'end', L.id + ' run', 30000);
    const s = R.rec.levels[L.id];
    if (R.state().state !== 'done') { P(L.id + ' run ended ' + R.state().why + ': ' + R.state().say); continue; }
    if (!s || s.s !== 3 || s.b !== L.par) P(L.id + ' record ' + JSON.stringify(s));
    if (document.querySelectorAll('#doneStars span:not(.off)').length !== 3) P(L.id + ' done card stars');
    const f = R.fits(); if (f.length) P(L.id + ' done card: ' + f.join('; '));
    // a world opens when the world before has 6 levels done
    if (L.w < 5) {
      const d = R.LEVELS.filter((x) => x.w === L.w && R.rec.levels[x.id]).length;
      if (R.worldOpen(L.w + 1) !== (d >= R.OPEN_AT)) P('world ' + (L.w + 1) + ' open is ' + R.worldOpen(L.w + 1) + ' with ' + d + ' done');
    }
    lines.push(L.id + ' ' + R.state().events + ' steps, ' + s.s + ' stars');
    await sleep(5);
  }
  R.setSpeed(1);
  const saved = JSON.parse(localStorage.getItem('code-robot.v1'));
  if (!saved || saved.done !== 40 || saved.stars !== 120) P('records after all 40: ' + JSON.stringify(saved && { done: saved.done, stars: saved.stars }));
  if (Object.keys(saved.levels).length !== 40) P('levels saved ' + Object.keys(saved.levels).length);
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
