// Castle Crew, one player (run from the repo root):
//   node games/castle/build.js && ND_CDP=9541 ND_PROFILE=edge-profile-castle ND_URL=file:///D:/Github/number-dash/games/castle/dist/preview.html ND_READY='!!window.__castle' ND_BOT=none node games/dash/playtest/shoot.js games/castle/playtest/play.js
// By finger on an iPad held sideways: home, the map picker, a map's setup (Easy, the Crossbow), the game opens at
// round 0; walk with the stick; build an Arrow Tower (coins and wood) and a Spike Trap (coins and stone) from the
// tray; chop a tree for wood; walk through a tower; start round 1; the tower's panel (its upgrades cost wood too):
// buy step 1 of a path, change its aim; the speed button; pause and resume. Then a computer player plays on fast to
// round 20 (the Zombie King, pictured); save and leave; the map card shows the round to carry on from, and carrying on
// starts there. Phones held sideways (HUD, tray and panel fit) and upright (the turn card, the game waits). No errors.
const C = 'window.__castle';
const fits = (tag) => ({ log: `(() => { const f = ${C}.fits(); if (f.length) (window.__P = window.__P || []).push('${tag}: ' + f.join('; ')); return '${tag}: ' + (f.join('; ') || 'fits'); })()` });
const until = (expr, ms) => ({ waitFor: expr, timeout: ms || 60000 });
const check = (expr, tag) => ({ log: `(() => { const ok = !!(${expr}); if (!ok) (window.__P = window.__P || []).push('${tag}'); return '${tag}: ' + ok; })()` });
const aimAt = (type) => ({ eval: `(() => { const at = ${C}.spotFor('${type}'); return at && ${C}.aim(at[0], at[1]) ? at.join(',') : 'no spot'; })()` });
module.exports = [
  { ipad: true },
  { viewport: [1180, 820, true, false, 2] },
  { eval: "localStorage.clear(); window.__P = []; 'cleared'" }, { reload: true }, { sleep: 700 },
  fits('home'), { shot: 'cc-p01-home' },
  { touchEl: '#playBtn' }, { sleep: 500 }, fits('maps'), { shot: 'cc-p02-maps' },
  check(`document.querySelectorAll('#mapGrid .mapcard').length === 8`, 'eight map cards'),
  { touchEl: '#mapGrid [data-map="meadow"]' }, { sleep: 400 }, fits('setup'),
  { touchEl: '#diffPick [data-diff="easy"]' }, { touchEl: '#weaponPick [data-weapon="crossbow"]' }, { sleep: 300 }, { shot: 'cc-p03-setup' },
  check(`${C}.rec.diff === 'easy' && ${C}.rec.weapon === 'crossbow'`, 'easy and the crossbow picked'),
  { touchEl: '#setupGo' },
  until(`${C}.ready() && ${C}.state().mode === 'solo'`, 40000), { sleep: 1500 },
  check(`${C}.state().round === 0 && ${C}.state().coins === 950 && ${C}.state().lives === 200 && ${C}.G.s.res.wood === 15 && ${C}.G.s.res.stone === 10`, 'round 0, 950 coins, 15 wood, 10 stone, 200 lives'),
  check(`document.getElementById('wood').textContent === '15' && document.getElementById('stone').textContent === '10'`, 'the HUD shows wood and stone'),
  fits('round 0'), { shot: 'cc-p04-start' },
  // walk a little with the stick
  { drag: [200, 600, 200, 470, 600] }, { sleep: 300 },
  { log: `(() => { const p = ${C}.G.s.players[0]; return [Math.round(p.x * 10) / 10, Math.round(p.z * 10) / 10]; })()` },
  // the build tray: an Arrow Tower beside the road and a Spike Trap on it
  { touchEl: '#buildBtn' }, { sleep: 300 }, fits('build tray'), { shot: 'cc-p05-tray' },
  check(`document.querySelectorAll('#cards .tc').length === 15`, 'fifteen towers in the tray'),
  { touchEl: '#cards [data-t="arrow"]' }, { sleep: 200 }, aimAt('arrow'), { sleep: 200 }, { shot: 'cc-p06-ghost' },
  { touchEl: '#placeBtn' }, { sleep: 500 },
  check(`${C}.state().towers === 1 && ${C}.state().coins === 950 - 155 && ${C}.G.s.res.wood === 12`, 'arrow tower built for 155 coins and 3 wood'),
  { touchEl: '#cards [data-t="spikes"]' }, { sleep: 200 }, aimAt('spikes'), { touchEl: '#placeBtn' }, { sleep: 500 },
  check(`${C}.state().towers === 2 && ${C}.G.s.towers[1].type === 'spikes' && ${C}.G.s.res.stone === 8`, 'spike trap on the road for 2 stone'),
  { touchEl: '#trayClose' }, { sleep: 200 },
  // mining: push into the nearest tree until it falls
  { eval: `(() => { window.__w0 = ${C}.G.s.res.wood; return ${C}.mineNearest('tree'); })()` },
  until(`${C}.G.s.res.wood >= window.__w0 + 4`, 15000), { eval: `${C}.move(0, 0); 'stop'` }, { sleep: 600 },
  check(`${C}.G.s.res.wood === window.__w0 + 4`, 'a tree chopped: 4 wood'), { shot: 'cc-p06b-chopped' },
  // a player walks through towers: stand on the arrow tower's tile and walk off again
  { eval: `(() => { const s = ${C}.G.s, t = s.towers[0], p = s.players[0]; p.x = t.x - 1.4; p.z = t.z; ${C}.move(1, 0); return t.tx + ',' + t.tz; })()` },
  { sleep: 700 }, { eval: `${C}.move(0, 0); 'stop'` },
  check(`(() => { const s = ${C}.G.s, t = s.towers[0], p = s.players[0]; return p.x > t.x + 0.3; })()`, 'walked through a tower'),
  // round 1, by finger
  { touchEl: '#goBtn' },
  until(`${C}.state().round === 1 && ${C}.state().zombies > 0`, 15000), { sleep: 2500 },
  fits('round 1'), { shot: 'cc-p07-round1' },
  until(`${C}.state().round >= 1 && ${C}.state().wave[0] === 'wait' || ${C}.state().round >= 2`, 90000),
  // the tower panel: step 1 of path a, then its aim
  { eval: `${C}.openPanel(${C}.G.s.towers[0].id)` }, { sleep: 400 }, fits('tower panel'), { shot: 'cc-p08-panel' },
  { eval: `(() => { window.__c0 = ${C}.state().coins; return window.__c0; })()` },
  check(`/🪵/.test(document.querySelector('#pathA .btn').textContent)`, 'the upgrade button shows its wood'),
  { eval: `(() => { window.__wu = ${C}.G.s.res.wood; return window.__wu; })()` },
  { touchEl: '#pathA .btn' }, { sleep: 500 },
  check(`${C}.G.s.towers[0].a === 1 && ${C}.state().coins < window.__c0 && ${C}.G.s.res.wood === window.__wu - 2`, 'bought step 1 on path a (coins and 2 wood)'),
  { touchEl: '#pMode' }, { sleep: 300 },
  check(`${C}.G.s.towers[0].mode === 'strong'`, 'the tower now aims at the strongest'),
  { shot: 'cc-p09-panel-up' },
  { touchEl: '#pClose' }, { sleep: 200 },
  { touchEl: '#speedBtn' }, { sleep: 200 }, check(`${C}.state().speed === 2`, 'speed 2x'), { touchEl: '#speedBtn' }, { touchEl: '#speedBtn' },
  { touchEl: '#pauseBtn' }, { sleep: 300 }, fits('pause'), check(`${C}.state().paused`, 'paused'), { touchEl: '#resumeBtn' }, { sleep: 200 },
  // a computer player plays on (without drawing) to round 20: the Zombie King
  { log: `${C}.skipTo(20)` },
  { eval: `${C}.speed(1); 'go'` },
  until(`${C}.G.s.zombies.some((z) => z.type === 'king')`, 60000), { sleep: 2500 },
  fits('round 20'), { shot: 'cc-p10-king' },
  { log: `(() => { const s = ${C}.G.s; return 'round ' + s.round + ', lives ' + Math.ceil(s.lives) + ', towers ' + s.towers.length + ', weapon level ' + s.players[0].wlvl + ', ' + JSON.stringify(${C}.view()); })()` },
  // save and leave, then carry on from the map card
  { touchEl: '#pauseBtn' }, { sleep: 300 }, { touchEl: '#quitBtn' }, { sleep: 500 },
  { touchEl: '#playBtn' }, { sleep: 500 },
  check(`/Round \\d+/.test(document.querySelector('#mapGrid [data-map="meadow"] .ribbon').textContent)`, 'the map card shows the round to carry on from'),
  { shot: 'cc-p11-maps-save' },
  { eval: `(() => { window.__sv = ${C}.rec.saves.meadow.round; return window.__sv; })()` },
  { touchEl: '#mapGrid [data-map="meadow"]' }, { sleep: 300 }, check(`!document.getElementById('setupCont').hidden`, 'carry on offered'),
  { touchEl: '#setupCont' },
  until(`${C}.state().mode === 'solo'`, 20000), { sleep: 800 },
  check(`${C}.state().round === window.__sv && ${C}.state().towers > 2`, 'carried on at the saved round with its towers'),
  // phones held sideways, mid-fight
  { eval: `(async () => { await ${C}.play('pumpkin', 'medium', 'blaster', true); ${C}.speed(3); ${C}.nextRound(); return 'pumpkin'; })()` },
  until(`${C}.state().round >= 2 && ${C}.state().zombies > 2`, 90000), { eval: `${C}.speed(1); 'slow'` }, { sleep: 800 },
  { viewport: [1024, 768, true, false, 2] }, { sleep: 600 }, fits('small iPad fight'), { shot: 'cc-p12-ipad1024' },
  { viewport: [844, 390, true, false, 3] }, { sleep: 800 }, fits('phone fight'), { shot: 'cc-p13-phone' },
  { touchEl: '#buildBtn' }, { sleep: 300 }, fits('phone tray'), { shot: 'cc-p14-phone-tray' }, { touchEl: '#trayClose' }, { sleep: 200 },
  { eval: `${C}.openPanel(${C}.G.s.towers[0].id)` }, { sleep: 300 }, fits('phone panel'), { shot: 'cc-p15-phone-panel' }, { touchEl: '#pClose' },
  { viewport: [667, 375, true, false, 2] }, { sleep: 800 }, fits('small phone fight'), { shot: 'cc-p16-phone-small' },
  { eval: `${C}.openPanel(${C}.G.s.towers[0].id)` }, { sleep: 300 }, fits('small phone panel'), { touchEl: '#pClose' },
  // upright: the turn card, and a solo game waits
  { viewport: [390, 844, true, false, 3] }, { sleep: 600 }, fits('upright phone'), { shot: 'cc-p17-upright' },
  check(`getComputedStyle(document.getElementById('rotate')).display !== 'none' && ${C}.state().paused`, 'upright: turn card and paused'),
  { viewport: [844, 390, true, false, 3] }, { sleep: 500 }, { eval: `document.getElementById('resumeBtn').click(); 'resumed'` },
  { eval: `${C}.goHome(); 'home'` }, { sleep: 500 }, fits('phone home'), { touchEl: '#playBtn' }, { sleep: 400 }, fits('phone maps'), { shot: 'cc-p18-phone-maps' },
  { touchEl: '#mapGrid [data-map="frozen"]' }, { sleep: 400 }, fits('phone setup'), { shot: 'cc-p19-phone-setup' },
  { log: 'JSON.stringify(window.__errs || [])' },
  { log: "((window.__P || []).length || (window.__errs || []).length) ? 'FAIL ' + JSON.stringify(window.__P) : 'PASS: no problems'" }
];
