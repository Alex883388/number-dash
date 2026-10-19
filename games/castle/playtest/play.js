// Castle Crew, one player (run from the repo root):
//   node games/castle/build.js && ND_CDP=9541 ND_PROFILE=edge-profile-castle ND_URL=file:///D:/Github/number-dash/games/castle/dist/preview.html ND_READY='!!window.__castle' ND_BOT=none node games/dash/playtest/shoot.js games/castle/playtest/play.js
// The home card, the levels card and a briefing fit; Level 1 starts from the briefing by finger; the build tray opens,
// a tower is placed by finger on the map, weapons switch; a computer player plays the rest of the level at speed and
// it is won (stars saved, Level 2 opens); pause and resume; then Level 2 mid-fight on a smaller iPad and on phones
// held sideways (the game is played sideways: upright, a card asks to turn the device). No page errors.
const C = 'window.__castle';
const fits = (tag) => ({ log: `(() => { const f = ${C}.fits(); if (f.length) (window.__P = window.__P || []).push('${tag}: ' + f.join('; ')); return '${tag}: ' + (f.join('; ') || 'fits'); })()` });
const until = (expr, ms) => ({ waitFor: expr, timeout: ms || 60000 });
module.exports = [
  { ipad: true },
  { viewport: [1180, 820, true, false, 2] },
  { eval: "localStorage.clear(); window.__P = []; 'cleared'" }, { reload: true }, { sleep: 700 },
  fits('home'), { shot: 'cc-p01-home' },
  { touchEl: '#levelsBtn' }, { sleep: 400 }, fits('levels'), { shot: 'cc-p02-levels' },
  { log: "[document.querySelectorAll('#levelGrid .lvl').length, document.querySelectorAll('#levelGrid .lvl:disabled').length]" },
  { touchEl: '#levelGrid [data-n="1"]' }, { sleep: 400 }, fits('briefing'), { shot: 'cc-p03-brief' },
  { touchEl: '#briefGo' },
  until(`${C}.ready() && ${C}.state().mode === 'solo'`, 40000), { sleep: 1500 },
  fits('level 1'), { shot: 'cc-p04-level1' },
  // walk a little with the stick
  { drag: [200, 600, 200, 480, 600] }, { sleep: 300 },
  { log: `(() => { const p = ${C}.G.s.players[0]; return [Math.round(p.x * 10) / 10, Math.round(p.z * 10) / 10]; })()` },
  // the build tray, and a tower by finger: tap a free tile twice (choose, then build)
  { touchEl: '#buildBtn' }, { sleep: 300 }, fits('build tray'), { shot: 'cc-p05-tray' },
  { touchEl: '#cards [data-t="arrow"]' }, { sleep: 300 },
  { eval: `(() => { const s = ${C}.G.s, p = s.players[0], m = s.map; for (let r = 1; r < 5; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const tx = Math.floor(p.x) + dx, tz = Math.floor(p.z) + dz; if (${C}.CC.canBuild(s, 'arrow', tx, tz, p).ok) { return ${C}.aim(tx, tz) ? tx + ',' + tz : 'aim failed'; } } return 'none'; })()` },
  { sleep: 200 }, { shot: 'cc-p06-ghost' },
  { touchEl: '#placeBtn' }, { sleep: 400 },
  { log: `[${C}.state().turrets, ${C}.state().res.join('/')]` },
  { touchEl: '#trayClose' }, { sleep: 200 },
  // weapons
  { touchEl: '#weapons [data-w="hammer"]' }, { sleep: 200 },
  { log: `${C}.G.input.weapon` },
  { touchEl: '#weapons [data-w="blaster"]' }, { sleep: 200 },
  // pause and resume
  { touchEl: '#pauseBtn' }, { sleep: 300 }, fits('pause'), { log: `${C}.state().paused` }, { touchEl: '#resumeBtn' }, { sleep: 200 },
  // a computer player takes over and plays fast to the end
  { eval: `(() => { ${C}.G.bot = ${C}.CCBot.make(); ${C}.speed(4); return 'bot'; })()` },
  until(`${C}.state().wave && ${C}.state().wave[1] === 'fight' && ${C}.state().zombies > 2`, 90000),
  { eval: `${C}.speed(1); 'slow'` }, { sleep: 1200 }, { shot: 'cc-p07-fight' }, fits('fight'),
  { log: `JSON.stringify(${C}.view())` },
  { eval: `${C}.speed(5); 'fast'` },
  until(`${C}.state().screen === 's-result'`, 240000), { sleep: 800 },
  fits('result'), { shot: 'cc-p08-result' },
  { log: `[document.getElementById('resTitle').textContent, document.querySelectorAll('#resStars span:not(.off)').length, JSON.stringify(${C}.rec.levels), ${C}.rec.done]` },
  // a smaller iPad and phones held sideways, mid-fight on level 2
  { viewport: [1024, 768, true, false, 2] },
  { eval: `(async () => { await ${C}.play(2, true); ${C}.speed(4); return 'level 2'; })()` },
  until(`${C}.state().wave && ${C}.state().wave[1] === 'fight' && ${C}.state().zombies > 3`, 90000),
  { eval: `${C}.speed(1); 'slow'` }, { sleep: 1000 }, fits('small iPad fight'), { shot: 'cc-p09-ipad1024' },
  { viewport: [844, 390, true, false, 3] }, { sleep: 800 },
  fits('phone fight'), { shot: 'cc-p10-phone' },
  { touchEl: '#buildBtn' }, { sleep: 300 }, fits('phone tray'), { shot: 'cc-p11-phone-tray' }, { touchEl: '#trayClose' },
  { viewport: [667, 375, true, false, 2] }, { sleep: 800 }, fits('small phone fight'), { shot: 'cc-p12-phone-small' },
  // upright: the turn card, and a solo game waits
  { viewport: [390, 844, true, false, 3] }, { sleep: 600 }, fits('upright phone'), { shot: 'cc-p13-upright' },
  { log: `[getComputedStyle(document.getElementById('rotate')).display, ${C}.state().paused]` },
  { viewport: [844, 390, true, false, 3] }, { sleep: 500 }, { eval: `document.getElementById('resumeBtn').click(); 'resumed'` },
  { eval: `${C}.goHome(); 'home'` }, { sleep: 500 }, fits('phone home'), { shot: 'cc-p14-phone-home' },
  { log: 'JSON.stringify(window.__errs || [])' },
  { log: "((window.__P || []).length || (window.__errs || []).length) ? 'FAIL ' + JSON.stringify(window.__P) : 'PASS: no problems'" }
];
