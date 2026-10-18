// Code Robot on emulated iPads and a phone, light and dark (run from the repo root):
//   node games/robot/build.js && ND_CDP=9511 ND_PROFILE=edge-profile-robot-wt ND_URL=file:///D:/Github/number-dash-robot/games/robot/dist/preview.html ND_READY='!!window.__robot' ND_BOT=none node games/dash/playtest/shoot.js games/robot/playtest/ipad.js
// Every stop checks the layout with __robot.fits(): the page never scrolls (only a long program scrolls inside its own
// pane), everything is inside the screen, the map, the robot's speech and the editor do not overlap, every block, gap,
// palette button and control a finger taps is 48 px or more, and no text is cut off. Stops: a landscape iPad (home,
// a world card, an intro card, the biggest maps with the longest programs, a picked block with its bar, stepping,
// running, the done card, the pause card, the backup card and its question), an iPad mini and an older 1024 x 768
// iPad in landscape, a portrait iPad, a 390 x 844 phone (the same stops, six blocks on offer, the longest hint, a long
// program that scrolls in its pane), and dark mode on the phone and the iPad. Problems go to window.__P; the last line
// says PASS or FAIL.
const HELP = "window.__P = []; window.__fit = (tag) => { const f = __robot.fits(); if (f.length) window.__P.push(tag + ': ' + f.join('; ')); return f.length ? f : 'fits'; }; 'help ok'";
const fit = (tag) => ({ log: 'window.__fit(' + JSON.stringify(tag) + ')' });
const tap = (sel, ms) => [{ touchEl: sel }, { sleep: ms || 250 }];
const level = (id, prog) => ({ eval: "(() => { __robot.open('" + id + "'); " + (prog !== undefined ? "__robot.setProg('" + prog + "'); " : '') + "__robot.layout(); return __robot.state().prog; })()" });
const runDone = { waitFor: "__robot.state().state === 'done' || __robot.state().mode === 'end'", timeout: 40000 };
// the biggest maps and the longest programs
const BIG = [['4-3', 'u(i(F)(R))'], ['4-8', 'u(i(F)(L i()(R R)))'], ['3-6', 'f f f R f f f f|F R F L'], ['3-8', 'f r4(F) f R r3(F)|r4(F F R)'],
  ['4-7', 'u(i(F)(L F R F F R F L))'], ['1-8', 'F F F R F F R F F F L F F'], ['2-8', 'r4(r2(L F F F L) F F)'], ['4-5', 'u(i(F)(L) g(R))']];
const tour = (tag, shots) => BIG.map(([id, p], k) => [level(id, p), { sleep: 350 }, ...(shots && k < 3 ? [{ shot: 'rob-i-' + tag + '-' + id }] : []), fit(tag + ' ' + id)]).flat();
// the longest hint
const LONGEST = "(() => { const L = __robot.LEVELS.slice().sort((a, b) => b.hint.length - a.hint.length)[0]; __robot.open(L.id); return [L.id, L.hint.length, getComputedStyle(document.getElementById('sayText')).fontSize]; })()";
const menus = (tag) => [
  { eval: '__robot.goHome(); "home"' }, { sleep: 400 }, { shot: 'rob-i-' + tag + '-home' }, fit(tag + ' home'),
  ...tap('.world[data-world="2"]'), { shot: 'rob-i-' + tag + '-world' }, fit(tag + ' world card'),
  ...tap('#wHomeBtn'), ...tap('#backupBtn'), { shot: 'rob-i-' + tag + '-backup' }, fit(tag + ' backup card'),
  { eval: "document.getElementById('codeIn').value = document.getElementById('codeOut').value; 'pasted'" }, ...tap('#loadBtn'), fit(tag + ' question card'),
  ...tap('#confirmNo'), ...tap('#backupHomeBtn')
];
// a level by finger: pick a block (its bar shows), Step twice, the pause card, then Run to the done card
const playStops = (tag, id, prog, pick) => [
  level(id, prog), { sleep: 350 },
  ...tap('#code [data-path="' + pick + '"]'), { shot: 'rob-i-' + tag + '-picked' }, fit(tag + ' picked block'),
  ...tap('#selDone'),
  ...tap('#stepBtn', 450), ...tap('#stepBtn', 450), { shot: 'rob-i-' + tag + '-step' }, fit(tag + ' stepping'),
  ...tap('#pauseBtn', 400), { shot: 'rob-i-' + tag + '-pause' }, fit(tag + ' pause card'), ...tap('#resumeBtn', 300),
  { eval: '__robot.setSpeed(4); "fast"' }, ...tap('#runBtn', 300), fit(tag + ' running'),
  runDone, { sleep: 900 }, { eval: '__robot.setSpeed(1); "normal"' }, { shot: 'rob-i-' + tag + '-done' }, fit(tag + ' done card'),
  { eval: "(() => { if (__robot.state().state !== 'done') window.__P.push(" + JSON.stringify(tag + ' ' + id) + " + ' did not finish: ' + __robot.state().say); return __robot.state().state; })()" }
];

module.exports = [
  { eval: "localStorage.clear(); 'cleared'" },
  { ipad: true },
  { viewport: [1180, 820, true, false, 2] },
  { reload: true }, { sleep: 900 },
  { eval: HELP },
  { log: "[matchMedia('(pointer: coarse)').matches, navigator.userAgent.indexOf('iPad') > 0]" },
  // some progress, so the home card shows stars and open worlds
  { eval: "__robot.grant(['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '2-1', '2-2']); 'granted'" },
  ...menus('ipad'),
  ...tap('#contBtn', 400), { shot: 'rob-i-ipad-intro' }, fit('ipad intro card'), ...tap('#iGoBtn', 400),
  ...playStops('ipad', '2-3', 'r5(F R F L)', 'm.0.b.2'),
  ...tour('ipad', true),
  { log: LONGEST }, fit('ipad longest hint'),

  // an iPad mini and an older iPad in landscape
  { viewport: [1133, 744, true, false, 2] }, { sleep: 400 },
  ...tour('mini', false), ...menus('mini'),
  { viewport: [1024, 768, true, false, 2] }, { sleep: 400 },
  ...tour('ipad1024', false), ...menus('ipad1024'),

  // a portrait iPad
  { viewport: [820, 1180, true, false, 2] }, { sleep: 400 },
  ...menus('portrait'),
  ...playStops('portrait', '3-2', 'f f f f|F R F L', 'f.1'),
  ...tour('portrait', true),
  { log: LONGEST }, fit('portrait longest hint'),

  // a phone
  { viewport: [390, 844, true, false, 3] }, { sleep: 400 },
  ...menus('phone'),
  ...playStops('phone', '4-4', 'u(F g(R))', 'm.0.b.1'),
  ...tour('phone', true),
  level('4-5', ''), { sleep: 300 }, { shot: 'rob-i-phone-six-blocks' }, fit('phone six blocks on offer'),
  { log: LONGEST }, { shot: 'rob-i-phone-longest-hint' }, fit('phone longest hint'),
  // a long program scrolls inside its own pane, never the page
  level('1-8', 'F F F R F F R F F F L F F'), { sleep: 300 },
  { log: "(() => { const c = document.getElementById('code'); if (document.documentElement.scrollHeight > innerHeight + 1) window.__P.push('a long program scrolls the page'); return ['pane scrolls: ' + (c.scrollHeight > c.clientHeight), 'page height ' + document.documentElement.scrollHeight + ' of ' + innerHeight]; })()" },
  { shot: 'rob-i-phone-long-program' },

  // dark mode
  { viewport: [390, 844, true, true, 3] }, { sleep: 400 },
  ...menus('phone-dark'),
  ...playStops('phone-dark', '3-8', 'f r4(F) f R r3(F)|r4(F F R)', 'f.0'),
  { viewport: [1180, 820, true, true, 2] }, { sleep: 400 },
  ...menus('ipad-dark'),
  ...playStops('ipad-dark', '4-6', 'u(i(F)(L i()(R R)))', 'm.0.b.0.e.1'),
  level('4-3', 'u(i(F)(R))'), { sleep: 350 }, { shot: 'rob-i-ipad-dark-4-3' }, fit('dark 4-3'),

  { log: 'JSON.stringify(window.__errs)' },
  { log: "(window.__P.length || (window.__errs || []).length) ? 'FAIL ' + JSON.stringify(window.__P) : 'PASS: no problems'" }
];
