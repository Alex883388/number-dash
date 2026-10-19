// Mech Blaster on other screens, how long a busy frame takes to draw, and a sweep through the levels that bring
// something new (every enemy, obstacle, weapon and boss) flown by the autopilot at speed (run from the repo root):
//   ND_CDP=9602 ND_PROFILE=edge-profile-mech2 ND_URL=file:///D:/Github/number-dash/games/mech/dist/preview.html ND_READY='!!window.__mech' ND_BOT=none node games/dash/playtest/shoot.js games/mech/playtest/layouts.js
// Each layout stop logs __mech.fits() (should be []); the sweep logs how each level ended and any page errors.
const errs = "window.__errs = window.__errs || []; window.addEventListener('error', (e) => window.__errs.push(String(e.message))); 'listening'";
const S = '__mech.S';
// the average time to draw one frame of the battlefield as it is now (ms)
const drawCost = "(() => { const t0 = performance.now(); for (let i = 0; i < 40; i++) __mech.MR.draw(__mech.S, i / 60); return +((performance.now() - t0) / 40).toFixed(2); })()";
const unlockAll = "for (let n = 1; n <= 49; n++) __mech.rec.levels[n] = __mech.rec.levels[n] || { s: 1, b: 0 }; 'unlocked'";
const layout = (name, vp, level) => [
  { viewport: vp }, { sleep: 400 },
  { eval: "__mech.start(" + level + "); __mech.auto({}); 'go'" }, { sleep: 3500 },
  { shot: 'mech-l-' + name },
  { log: "['" + name + "', JSON.stringify(__mech.fits()), innerWidth, innerHeight, document.querySelectorAll('#weapons .wbtn').length]" },
  { eval: "__mech.home(); 'home'" }, { sleep: 500 }, { shot: 'mech-l-' + name + '-home' }
];
const sweep = [2, 4, 5, 6, 7, 10, 11, 12, 15, 20, 22, 26, 30, 31, 33, 40, 43, 50];
module.exports = [
  { viewport: [1180, 820, true, false, 2] }, { ipad: true }, { reload: true }, { eval: errs }, { sleep: 800 },
  { eval: unlockAll },
  ...layout('phone-landscape', [844, 390, true, false, 3], 27),
  ...layout('phone-portrait', [390, 844, true, false, 3], 18),
  ...layout('ipad-portrait', [820, 1180, true, false, 2], 44),
  ...layout('ipad-dark', [1180, 820, true, true, 2], 36),
  { viewport: [1180, 820, true, false, 2] }, { sleep: 400 },
  // a busy frame: late level with everything on screen, and a boss
  { eval: "__mech.start(49); __mech.auto({}); __mech.speed(3); 'busy'" }, { waitFor: S + ".ents.filter((e) => e.c === 'enemy' && e.z < 72).length >= 4", timeout: 40000 },
  { eval: "__mech.speed(1); 'normal'" },
  { log: "['ms to draw a busy frame', " + drawCost + ", 'enemies', " + S + ".ents.length, 'sparks', __mech.MR.parts.length]" },
  { shot: 'mech-l-busy' },
  { eval: "__mech.start(50); __mech.auto({ think: 99 }); 'omega'" }, { waitFor: S + ".boss && " + S + ".boss.mode === 'shield'", timeout: 40000 }, { sleep: 1500 },
  { log: "['ms to draw the Omega Core', " + drawCost + "]" },
  { shot: 'mech-l-omega' },
  // the sweep
  ...sweep.flatMap((n) => [
    { eval: "__mech.start(" + n + "); __mech.auto({ right: 0.85 }); __mech.speed(5); 'level " + n + "'" },
    { waitFor: "__mech.S.state !== 'play'", timeout: 120000 },
    { log: "['level " + n + "', __mech.S.L.name, __mech.S.state, Math.round(__mech.S.t) + ' s', 'hp ' + __mech.S.mech.hp, 'kills ' + __mech.S.stats.kills, 'right ' + __mech.S.stats.right + '/' + __mech.S.stats.asked]" }
  ]),
  { eval: "__mech.speed(1); __mech.auto(false); 'done'" },
  { log: "JSON.stringify(window.__errs)" }
];
