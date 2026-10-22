// Family Fighters by finger on an iPad held sideways (run from the repo root):
//   node games/family/build.js && ND_URL=file:///D:/Github/number-dash/games/family/dist/preview.html ND_PROFILE=edge-profile-ff-play ND_READY='!!window.__family' ND_BOT=none node games/dash/playtest/shoot.js games/family/playtest/play.js
// A new player: Play, picks Bơ, Next, place 1; walks with the stick, punches (the button held), jumps, uses the
// special when it is full; then (the autopilot walks to the first gate) stands by the right drum and punches it with
// the button; pauses and carries on; the place is won by the autopilot and the result card is read.
const F = 'window.__family';
const check = (expr, tag) => ({ log: `(() => { const ok = !!(${expr}); if (!ok) (window.__P = window.__P || []).push('${tag}'); return '${tag}: ' + ok; })()` });
const me = `${F}.G.S.players[0]`;
module.exports = [
  { ipad: true },
  { viewport: [1180, 820, true, false, 2] },
  { eval: "localStorage.clear(); window.__P = []; 'fresh'" }, { reload: true }, { sleep: 800 },
  { touchEl: '#playBtn' }, { sleep: 400 },
  { touchEl: '.hcard[data-h="bo"]' }, { sleep: 300 },
  check(`${F}.G.seats[0].hero === 'bo'`, 'Bơ picked by finger'),
  { shot: 'ff-play-01-pick' },
  { touchEl: '#pickGo' }, { sleep: 800 },
  { touchEl: '.lvcard[data-n="1"]' }, { sleep: 1500 },
  check(`${F}.G.mode === 'solo' && !document.getElementById('touch').hidden`, 'place 1 started with the touch controls'),
  { shot: 'ff-play-02-start' },
  // walk right with the stick
  { eval: `window.__x0 = ${me}.x; 'x0'` },
  { drag: [180, 640, 300, 640, 1500] }, { sleep: 200 },
  check(`${me}.x - window.__x0 > 150`, 'the stick walks Bơ to the right'),
  // and up the street (towards the back)
  { eval: `window.__y0 = ${me}.y; 'y0'` },
  { drag: [180, 640, 180, 540, 900] }, { sleep: 200 },
  check(`${me}.y - window.__y0 > 40`, 'the stick walks Bơ up the street'),
  // punch: the button held makes a combo
  { eval: `window.__sw = 0; window.__swh = (() => { const S = ${F}.G.S; const id = setInterval(() => { if (S.players[0].st === 'atk') window.__sw = Math.max(window.__sw, S.players[0].combo + 1); }, 16); setTimeout(() => clearInterval(id), 3000); return 1; })(); 'watch'` },
  { touchEl: '#bAtk' }, { sleep: 400 },
  { touchAt: "(() => { const r = document.getElementById('bAtk').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()", touch: [0, 0, 1300] }, { sleep: 400 },
  check(`window.__sw >= 2`, 'the punch button makes a combo'),
  // jump
  { eval: `window.__z = 0; (() => { const S = ${F}.G.S; const id = setInterval(() => { window.__z = Math.max(window.__z, S.players[0].z); }, 16); setTimeout(() => clearInterval(id), 1500); })(); 'z'` },
  { touchEl: '#bJump' }, { sleep: 900 },
  check(`window.__z > 30`, 'the jump button jumps'),
  { shot: 'ff-play-03-moves' },
  // the special: with a full bar the button glows and Bơ bounces
  { eval: `${me}.energy = 1.2; 'energy'` }, { sleep: 300 },
  check(`document.getElementById('bSpec').classList.contains('ready')`, 'the special button glows when ready'),
  { eval: `window.__sk = ''; (() => { const S = ${F}.G.S; const id = setInterval(() => { if (S.players[0].st === 'spec') window.__sk = S.players[0].sk; }, 16); setTimeout(() => clearInterval(id), 1500); })(); 'sk'` },
  { touchEl: '#bSpec' }, { sleep: 1200 },
  check(`window.__sk === 'bounce'`, 'the special button does the belly bounce'),
  // the autopilot takes Bơ to the first gate; then the finger answers
  { eval: `${F}.auto({ right: 1, react: 0.2, dodge: 0.9 }); 'auto'` },
  { waitFor: `${F}.G.S.gate && !${F}.G.S.gate.open && ${F}.G.S.gate.drums.every((d) => d.lock <= 0)`, timeout: 120000 },
  { eval: `${F}.G.autopilot = null; 'hands'` }, { sleep: 400 },
  { shot: 'ff-play-04-gate' },
  check(`!document.getElementById('qbar').hidden && document.getElementById('qText').textContent.length > 3`, 'the question shows at the top'),
  // stand Bơ to the left of the right drum, facing it, and punch it with the button
  { eval: `(() => { const S = ${F}.G.S, d = S.gate.drums.find((q) => q.ok); const P = S.players[0]; P.x = d.x - 46; P.y = d.y; P.face = 1; P.st = 'idle'; P.combo = 0; P.comboT = 0; S.zs.length = 0; window.__right = 0; return d.text; })()` },
  { eval: `(() => { const S = ${F}.G.S; const id = setInterval(() => { if (S.gate && S.gate.open) window.__right = 1; }, 16); setTimeout(() => clearInterval(id), 3000); return 1; })()` },
  { touchEl: '#bAtk' }, { sleep: 900 },
  check(`window.__right === 1 || !${F}.G.S.gate`, 'the punch on the right drum opens the gate'),
  { shot: 'ff-play-05-right' },
  // pause and carry on, by finger
  { touchEl: '#pauseBtn' }, { sleep: 400 },
  check(`!document.getElementById('s-pause').hidden && ${F}.G.paused`, 'pause by finger'),
  { shot: 'ff-play-06-pause' },
  { touchEl: '#resumeBtn' }, { sleep: 400 },
  check(`document.getElementById('s-pause').hidden && !${F}.G.paused`, 'carry on by finger'),
  // the autopilot wins the place
  { eval: `${F}.auto({ right: 0.9, react: 0.2, dodge: 0.9 }); 'auto'` },
  { waitFor: `!document.getElementById('s-result').hidden`, timeout: 300000 },
  { sleep: 600 },
  check(`${F}.rec.levels[1] && ${F}.rec.levels[1].won && (${F}.rec.xp.bo || 0) > 0`, 'the win and the experience of Bơ are saved'),
  { log: `document.getElementById('resStars').textContent + ' ' + document.getElementById('resText').textContent` },
  { shot: 'ff-play-07-won' },
  { touchEl: '#resNext' }, { sleep: 1500 },
  check(`${F}.G.mode === 'solo' && ${F}.G.level === 2`, 'next place by finger'),
  { shot: 'ff-play-08-place2' },
  { log: "((window.__P || []).length || (window.__errs || []).length) ? 'FAIL ' + JSON.stringify(window.__P) + ' ' + JSON.stringify(window.__errs) : 'PASS: no problems'" }
];
