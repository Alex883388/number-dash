// Code Robot: the new kinds of level, played through the page (run from the repo root):
//   node games/robot/build.js && ND_CDP=9512 ND_PROFILE=edge-profile-robot2 ND_URL=file:///D:/Github/number-dash/games/robot/dist/preview.html ND_READY='!!window.__robot' ND_BOT=none node games/dash/playtest/shoot.js games/robot/playtest/modes.js
// Mixed-up Code: no palette, no Delete, fixed numbers; a block moved by finger; a failed Run costs a star.
// Code Reader: Check waits for a guess; a first miss only says so; a second miss runs the robot to the answer; tapping
// the answer finishes with 1 star; right first time gives 3. Shrink It: a working program over the limit is not a win
// until it fits. Pixel Painter: the picture's squares, painting outside stops the robot, a finished picture. Robot
// Team: one robot per colour, the team runs in turn, a message names the robot that did not make it. Counters: n
// shows and changes during a run; a Repeat's number counts on to n. Every screen fits an iPad and a phone.
const LIB = `(() => {
  const R = window.__robot, E = R.Robot;
  window.__P = [];
  const P = (m) => { window.__P.push(m); return m; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, what, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > (ms || 20000)) throw new Error('timeout: ' + what); await sleep(5); } };
  const first = (fn) => R.LEVELS.find(fn);
  const runToEnd = async (id) => { document.getElementById('runBtn').click(); await waitFor(() => R.state().state === 'done' || R.state().mode === 'end' || R.state().mode === 'edit', id + ' run', 30000); await sleep(30); };
  const fits = (tag) => { const f = R.fits(); if (f.length) P(tag + ': ' + f.join('; ')); };
  window.__T = { R, E, P, sleep, waitFor, first, runToEnd, fits };
  localStorage.clear();
  R.rec.seen = {}; R.WORLDS.forEach((W) => { R.rec.seen[W.id] = 1; });
  R.setSpeed(40);
  return 'lib ok';
})()`;

const ORDER = `(async () => {
  const { R, E, P, waitFor, first, runToEnd, fits } = window.__T, out = [];
  const L = first((x) => x.mode === 'order');
  if (!L) return 'no Mixed-up Code level';
  R.open(L.id);
  if (!document.getElementById('palette').hidden) P('order: the palette shows');
  if (R.state().prog !== E.print(E.parse(L.start))) P('order: did not open with its muddle');
  fits('order ' + L.id);
  // a block picked: Move, no Delete
  document.querySelector('#code .blk').click();
  if (document.getElementById('selbar').hidden || !document.getElementById('selDel').hidden) P('order: the move bar or Delete');
  document.getElementById('selDone').click();
  const num = document.querySelector('#code .num');
  if (num) { const before = R.state().prog; num.click(); if (R.state().prog !== before) P('order: a Repeat number changed'); }
  await runToEnd(L.id);
  if (R.state().mode !== 'end' || R.state().tries !== 1) P('order: the muddle ran ' + JSON.stringify(R.state()));
  R.setProg(L.sol);
  await runToEnd(L.id);
  if (R.state().state !== 'done') P('order: the solution did not finish: ' + R.state().say);
  if (!R.rec.levels[L.id] || R.rec.levels[L.id].s !== 2) P('order: stars after one failed run ' + JSON.stringify(R.rec.levels[L.id]));
  out.push(L.id + ' ' + document.getElementById('doneNote').textContent);
  return out;
})()`;

const PREDICT = `(async () => {
  const { R, E, P, sleep, waitFor, first, runToEnd, fits } = window.__T, out = [];
  const L = first((x) => x.mode === 'predict');
  if (!L) return 'no Code Reader level';
  R.open(L.id);
  const run = document.getElementById('runBtn');
  if (!run.disabled || run.textContent.indexOf('Check') < 0) P('predict: Check before a guess');
  if (!document.getElementById('palette').hidden || document.querySelector('#code .gap') && document.querySelector('#code .gap').offsetParent) P('predict: palette or gaps show');
  fits('predict ' + L.id);
  const m = L.m, open = [];
  for (let i = 0; i < m.cells.length; i++) if (m.cells[i] !== '#' && m.cells[i] !== '~' && i !== L.answer) open.push(i);
  // first miss: only a message
  document.querySelector('#board .tile[data-i="' + open[0] + '"]').click();
  if (R.state().guess !== open[0] || run.disabled) P('predict: the guess ' + R.state().guess);
  run.click(); await sleep(50);
  if (R.state().mode !== 'edit' || R.state().tries !== 1 || !/Not quite/.test(R.state().say)) P('predict: first miss ' + JSON.stringify(R.state()));
  // second miss: the robot shows the answer
  document.querySelector('#board .tile[data-i="' + open[1] + '"]').click();
  await runToEnd(L.id);
  if (R.state().mode !== 'end' || !document.querySelector('#board .tile.answer[data-i="' + L.answer + '"]')) P('predict: second miss did not show the answer ' + JSON.stringify(R.state()));
  // tap the answer: done with 1 star
  document.querySelector('#board .tile[data-i="' + L.answer + '"]').click();
  await runToEnd(L.id);
  if (R.state().state !== 'done' || R.rec.levels[L.id].s !== 1) P('predict: the answer after the robot showed it ' + JSON.stringify(R.rec.levels[L.id]));
  out.push(L.id + ' ' + document.getElementById('doneNote').textContent);
  // again: right first time
  document.getElementById('againBtn').click(); await sleep(50);
  document.querySelector('#board .tile[data-i="' + L.answer + '"]').click();
  await runToEnd(L.id);
  if (R.state().state !== 'done' || R.rec.levels[L.id].s !== 3) P('predict: right first time ' + JSON.stringify(R.rec.levels[L.id]));
  out.push(document.getElementById('doneNote').textContent);
  return out;
})()`;

const SHRINK = `(async () => {
  const { R, E, P, waitFor, first, runToEnd, fits } = window.__T, out = [];
  const L = first((x) => x.mode === 'shrink');
  if (!L) return 'no Shrink It level';
  R.open(L.id);
  fits('shrink ' + L.id);
  if (!document.getElementById('blkChip').classList.contains('over')) P('shrink: the chip does not show over the limit');
  await runToEnd(L.id);
  if (R.state().mode !== 'end' || !/It works!/.test(R.state().say)) P('shrink: the long program ' + JSON.stringify(R.state()));
  R.setProg(L.sol);
  await runToEnd(L.id);
  if (R.state().state !== 'done' || R.rec.levels[L.id].s !== 3) P('shrink: the short program ' + JSON.stringify(R.rec.levels[L.id]));
  out.push(L.id + ' ' + document.getElementById('doneNote').textContent);
  return out;
})()`;

const PAINT = `(async () => {
  const { R, E, P, waitFor, first, runToEnd, fits } = window.__T, out = [];
  const L = first((x) => x.m.targets.length && x.mode === 'build');
  if (!L) return 'no Pixel Painter level';
  R.open(L.id);
  fits('paint ' + L.id);
  if (document.querySelectorAll('#board .tile.target').length !== L.m.targets.length) P('paint: target squares drawn ' + document.querySelectorAll('#board .tile.target').length);
  if (!document.querySelector('#palette [data-add="P"]')) P('paint: no Paint block');
  R.setProg('P');
  await runToEnd(L.id);
  if (R.state().why !== 'paint' || !/not in the picture/.test(R.state().say) || !document.querySelector('#board .tile.wrong')) P('paint: painting the start square ' + JSON.stringify(R.state()));
  R.setProg(L.sol);
  await runToEnd(L.id);
  if (R.state().state !== 'done') P('paint: the solution ' + R.state().say);
  if (document.querySelectorAll('#board .tile.painted').length !== L.m.targets.length) P('paint: painted squares ' + document.querySelectorAll('#board .tile.painted').length);
  out.push(L.id + ' painted ' + document.querySelectorAll('#board .tile.painted').length);
  return out;
})()`;

const TEAM = `(async () => {
  const { R, E, P, waitFor, first, runToEnd, fits } = window.__T, out = [];
  const L = first((x) => x.m.robots.length > 1 && x.mode === 'build');
  if (!L) return 'no Robot Team level';
  R.open(L.id);
  fits('team ' + L.id);
  if (document.querySelectorAll('#board .bot').length !== L.m.robots.length) P('team: robots drawn ' + document.querySelectorAll('#board .bot').length);
  // a program that gets the first robot home but not the second, if there is one: the message names the second
  const c = R.check(L.id, 'F');
  out.push('F -> ' + c.why + ': ' + c.message);
  if (!c.ok && c.robot > 0 && c.message.indexOf(R.TEAM[c.robot].name) < 0) P('team: the message does not name the robot: ' + c.message);
  R.setProg(L.sol);
  await runToEnd(L.id);
  if (R.state().state !== 'done') P('team: the solution ' + R.state().say);
  out.push(L.id + ' ' + R.state().events + ' steps for ' + L.m.robots.length + ' robots');
  return out;
})()`;

const COUNT = `(async () => {
  const { R, E, P, sleep, waitFor, first, runToEnd, fits } = window.__T, out = [];
  const L = first((x) => /[+-]/.test(x.pal) && x.mode === 'build');
  if (!L) return 'no Counters level';
  R.open(L.id);
  fits('counters ' + L.id);
  const nInfo = document.getElementById('nInfo');
  if (nInfo.hidden || nInfo.textContent !== 'n = ' + L.m.n0) P('counters: n shows ' + nInfo.hidden + ' ' + nInfo.textContent);
  // a Repeat's number counts on to n
  R.setProg('r9(F)');
  document.querySelector('#code .num').click();
  if (R.state().prog !== 'rn(F)') P('counters: the number after 9 is ' + R.state().prog);
  R.setProg(L.sol);
  const end = E.run(L.m, E.parse(L.sol)).n;
  await runToEnd(L.id);
  if (R.state().state !== 'done') P('counters: the solution ' + R.state().say);
  if (R.state().n !== end) P('counters: n at the end ' + R.state().n + ', not ' + end);
  out.push(L.id + ' n from ' + L.m.n0 + ' to ' + end);
  return out;
})()`;

// every kind of level opens and fits on a phone too
const PHONE = `(async () => {
  const { R, P, sleep, first, fits } = window.__T, out = [];
  const picks = [first((x) => x.mode === 'order'), first((x) => x.mode === 'predict'), first((x) => x.mode === 'shrink'), first((x) => x.m.targets.length),
    first((x) => x.m.robots.length > 1), first((x) => /[+-]/.test(x.pal)), first((x) => /[jk]/.test(x.pal))].filter(Boolean);
  for (const L of picks) { R.open(L.id); await sleep(80); fits('phone ' + L.id); out.push(L.id); }
  R.goHome(); await sleep(80); fits('phone home');
  return out.join(' ');
})()`;

// every level opened at this size, with the program it opens with and then with its solution: nothing scrolls, nothing
// is cut, every target is big enough
const SWEEP = (tag) => `(async () => {
  const { R, E, P, sleep } = window.__T;
  let n = 0;
  for (const L of R.LEVELS) {
    R.open(L.id);
    await sleep(0);
    const f = R.fits(); if (f.length) P('${tag} ' + L.id + ' opening: ' + f.join('; '));
    if (L.sol && L.mode !== 'order') { R.setProg(L.sol); const g = R.fits(); if (g.length) P('${tag} ' + L.id + ' solution: ' + g.join('; ')); }
    n++;
  }
  R.goHome();
  return '${tag}: ' + n + ' levels opened';
})()`;

module.exports = [
  { viewport: [1180, 820, true, false, 2] },
  { eval: "localStorage.clear(); 'cleared'" }, { reload: true }, { sleep: 500 },
  { eval: LIB },
  { log: ORDER }, { shot: 'rob-m01-order-done' },
  { log: PREDICT }, { shot: 'rob-m02-predict-done' },
  { log: SHRINK },
  { log: PAINT }, { shot: 'rob-m03-paint-done' },
  { log: TEAM }, { shot: 'rob-m04-team-done' },
  { log: COUNT }, { shot: 'rob-m05-counters-done' },
  { eval: "(() => { const R = window.__robot, L = R.LEVELS.find((x) => x.mode === 'predict'); R.open(L.id); return L.id; })()" }, { sleep: 300 }, { shot: 'rob-m06-reader-ipad' },
  { eval: "(() => { const R = window.__robot, L = R.LEVELS.find((x) => x.m.robots.length > 1); R.open(L.id); return L.id; })()" }, { sleep: 300 }, { shot: 'rob-m07-team-ipad' },
  { log: SWEEP('iPad landscape') },
  { viewport: [820, 1180, true, false, 2] }, { sleep: 400 },
  { log: SWEEP('iPad portrait') },
  { viewport: [390, 844, true, false, 3] }, { sleep: 400 },
  { log: SWEEP('phone') },
  { log: PHONE }, { shot: 'rob-m08-phone-home' },
  { eval: "(() => { const R = window.__robot, L = R.LEVELS.find((x) => x.mode === 'order'); R.open(L.id); return L.id; })()" }, { sleep: 300 }, { shot: 'rob-m09-order-phone' },
  { log: 'JSON.stringify(window.__errs)' },
  { log: "(window.__P.length || (window.__errs || []).length) ? 'FAIL ' + JSON.stringify(window.__P) : 'PASS: no problems'" }
];
