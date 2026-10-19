// Mech Blaster by finger on an emulated iPad (run from the repo root):
//   node games/mech/build.js && ND_CDP=9601 ND_PROFILE=edge-profile-mech ND_URL=file:///D:/Github/number-dash/games/mech/dist/preview.html ND_READY='!!window.__mech' ND_BOT=none node games/dash/playtest/shoot.js games/mech/playtest/play.js
// A fresh player: the home card, Play, the briefing, Go. In level 1: a drag across the screen slides the mech, ◀ held
// slides it, ▶ tapped moves one lane, a flick up jumps; the guns fire by themselves at a drone lined up with the mech.
// At the gate: under a wrong panel, Answer (the tip shows), then under the right one, Answer (it opens). Pause and
// resume; the autopilot flies the rest; the done card; the level map scrolled by finger; the hangar. Then a player with
// 14 levels done: the weapon bar (tap Rockets), and the Iron Crab's shield broken by standing under the right orb and
// pressing Answer. Every stop checks the layout with __mech.fits() (on screen, nothing covering the buttons).
const errs = "window.__errs = window.__errs || []; window.addEventListener('error', (e) => window.__errs.push(String(e.message))); 'listening'";
const S = '__mech.S';
const btn = (sel) => "(() => { const r = document.querySelector('" + sel + "').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()";
// the button that moves the mech one lane towards answer i (or a harmless spot when it is there already)
const towards = (i, nth) => "(() => { const M = __mech.S.mech, here = __mech.MB.laneOf(M.tx), want = " + i + "; const n = Math.abs(want - here); const sel = n >= " + nth + " ? (want < here ? '#leftBtn' : '#rightBtn') : '#scoreChip'; const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()";
const Q = "(__mech.S.gate || __mech.S.boss)";
const correct = "(" + S + ".gate ? " + S + ".gate.q.correct : " + S + ".boss.q.correct)";
module.exports = [
  { viewport: [1180, 820, true, false, 2] }, { ipad: true },
  { eval: "localStorage.removeItem('mech-blaster.v1'); location.reload(); 'fresh'" }, { sleep: 1200 }, { eval: errs },
  { shot: 'mech-p01-home' },
  { log: "['home', !document.getElementById('s-home').hidden, document.getElementById('homeNext').textContent]" },
  { touchEl: '#playBtn' }, { sleep: 500 },
  { log: "['brief', !document.getElementById('s-brief').hidden, document.getElementById('briefName').textContent, document.querySelectorAll('#briefIntro .witem').length]" },
  { shot: 'mech-p02-brief' },
  { touchEl: '#startBtn' }, { sleep: 800 },
  { log: "['playing', " + S + ".n, " + S + ".state, document.body.classList.contains('menu'), JSON.stringify(__mech.fits())]" },
  // steering: a drag, ◀ held, ▶ tapped, a flick up
  { eval: "window.__x0 = " + S + ".mech.x; 'x0'" },
  { drag: [500, 560, 760, 565, 300] }, { sleep: 500 },
  { log: "['after a drag right', +(" + S + ".mech.x - window.__x0).toFixed(2)]" },
  { eval: "window.__x0 = " + S + ".mech.x; 'x0'" },
  // ◀ held for 0.45 s (the button sits at 55,765 on this screen)
  { touch: [55, 765, 450] }, { sleep: 300 },
  { log: "['after ◀ held', +(" + S + ".mech.x - window.__x0).toFixed(2)]" },
  { eval: "window.__x0 = " + S + ".mech.tx; 'x0'" },
  { touchEl: '#rightBtn' }, { sleep: 500 },
  { log: "['after ▶ tapped (one lane is 3.2)', +(" + S + ".mech.x - window.__x0).toFixed(2)]" },
  { drag: [640, 600, 645, 470, 120] }, { sleep: 120 }, { log: "['after a flick up', " + S + ".mech.air]" },
  // the guns at a lined-up drone
  { eval: "window.__k0 = " + S + ".stats.kills; window.__f0 = " + S + ".stats.fired; 'counted'" },
  { waitFor: S + ".ents.some((e) => e.k === 'drone' && e.z < 70)", timeout: 20000 },
  { eval: "const d = " + S + ".ents.filter((e) => e.k === 'drone' && e.z < 70).sort((a, b) => a.z - b.z)[0]; window.__dx = d ? d.x : 0; 'drone at ' + window.__dx.toFixed(1)" },
  { touchAt: "(() => { const want = __mech.MB.laneOf(window.__dx), here = __mech.MB.laneOf(__mech.S.mech.tx); const sel = want < here ? '#leftBtn' : want > here ? '#rightBtn' : '#scoreChip'; const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()" },
  { sleep: 300 },
  { touchAt: "(() => { const want = __mech.MB.laneOf(window.__dx), here = __mech.MB.laneOf(__mech.S.mech.tx); const sel = want < here ? '#leftBtn' : want > here ? '#rightBtn' : '#scoreChip'; const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()" },
  { sleep: 2500 },
  { log: "['guns fired by themselves', " + S + ".stats.fired - window.__f0, 'kills', " + S + ".stats.kills - window.__k0]" },
  { shot: 'mech-p03-fight' },
  // the gate: the Answer button, under a wrong panel then the right one
  { waitFor: S + ".gate && " + S + ".gate.z < 13", timeout: 40000 }, { sleep: 400 },
  { eval: "window.__wrong = (" + correct + " + 1) % 3; 'wrong ' + window.__wrong + ', right ' + " + correct },
  { log: "['question', document.getElementById('qText').textContent, " + S + ".gate.q.kind, 'answer button', !document.getElementById('answerBtn').hidden]" },
  { touchAt: towards('window.__wrong', 1) }, { sleep: 250 }, { touchAt: towards('window.__wrong', 1) }, { sleep: 600 },
  { log: "['under panel', __mech.MB.aimedAnswer(" + S + "), 'ready', document.getElementById('answerBtn').classList.contains('ready')]" },
  { shot: 'mech-p04-gate-aimed' },
  { touchEl: '#answerBtn' }, { sleep: 800 },
  { log: "['after a wrong answer', " + S + ".gate.wrongs, !document.getElementById('qTip').hidden, document.getElementById('qTip').textContent]" },
  { shot: 'mech-p05-wrong' },
  { touchAt: towards(correct, 1) }, { sleep: 250 }, { touchAt: towards(correct, 1) }, { sleep: 600 },
  { touchEl: '#answerBtn' }, { sleep: 800 },
  { log: "['after the right answer', " + S + ".gate.open, " + S + ".stats.right, document.getElementById('qbox').className]" },
  { shot: 'mech-p06-right' },
  // pause and resume
  { touchEl: '#pauseBtn' }, { sleep: 400 }, { log: "['paused', __mech.paused, !document.getElementById('s-pause').hidden]" },
  { touchEl: '#resumeBtn' }, { sleep: 300 }, { log: "['resumed', __mech.paused]" },
  // the autopilot flies the rest, fast
  { eval: "__mech.auto({}); __mech.speed(6); 'auto'" },
  { waitFor: "!document.getElementById('s-done').hidden", timeout: 90000 },
  { eval: "__mech.speed(1); __mech.auto(false); 'manual'" },
  { sleep: 500 },
  { log: "['done', document.getElementById('doneTitle').textContent, document.querySelectorAll('#doneStars span:not(.off)').length, JSON.stringify(__mech.rec.levels)]" },
  { shot: 'mech-p08-done' },
  // the level map, scrolled by finger to the last world
  { touchEl: '#doneLevels' }, { sleep: 600 },
  { log: "['levels', !document.getElementById('s-levels').hidden, document.querySelectorAll('.lv').length, document.querySelectorAll('.lv:disabled').length, getComputedStyle(document.getElementById('screens')).pointerEvents]" },
  { drag: [590, 700, 590, 150, 400] }, { drag: [590, 700, 590, 150, 400] }, { drag: [590, 700, 590, 150, 400] }, { drag: [590, 700, 590, 150, 400] }, { sleep: 800 },
  { log: "['scrolled', document.getElementById('screens').scrollTop, document.getElementById('screens').scrollHeight - document.getElementById('screens').clientHeight]" },
  { touchEl: '#levelsBack' }, { sleep: 400 }, { touchEl: '#hangarBtn' }, { sleep: 600 },
  { log: "['hangar', document.querySelectorAll('#wlist .witem').length, document.querySelectorAll('#wlist .witem.locked').length, document.querySelectorAll('#elist .witem').length]" },
  { shot: 'mech-p11-hangar' },
  // a player with 14 levels done: four weapons, rockets by finger
  { eval: "for (let n = 1; n <= 14; n++) __mech.rec.levels[n] = { s: 3, b: 1000 }; __mech.start(15); 'level 15'" }, { sleep: 1500 },
  { log: "['weapons', " + S + ".weapons.join(','), document.querySelectorAll('#weapons .wbtn').length, JSON.stringify(__mech.fits())]" },
  { touchEl: '#weapons .wbtn[data-w=\"rockets\"]' }, { sleep: 300 }, { log: "['weapon now', " + S + ".weapon]" },
  { sleep: 3000 }, { shot: 'mech-p12-rockets' },
  // the Iron Crab: under the right orb, Answer
  { eval: "__mech.start(10); __mech.auto({ think: 99 }); 'boss'" },
  { waitFor: S + ".boss && " + S + ".boss.mode === 'shield' && " + S + ".boss.z < 32", timeout: 40000 }, { sleep: 600 },
  { eval: "__mech.auto(false); __mech.MB.steerTo(" + S + ", 0); 'manual, in the middle'" }, { sleep: 500 },
  { touchAt: towards(correct, 1) }, { sleep: 250 }, { touchAt: towards(correct, 1) }, { sleep: 600 },
  { log: "['boss question', document.getElementById('qText').textContent, 'under orb', __mech.MB.aimedAnswer(" + S + "), 'right orb', " + correct + ", JSON.stringify(__mech.fits())]" },
  { shot: 'mech-p13-boss' },
  { touchEl: '#answerBtn' }, { sleep: 900 },
  { log: "['boss after the right orb', " + S + ".boss.mode, " + S + ".stats.right]" },
  { shot: 'mech-p14-boss-open' },
  { log: "JSON.stringify(window.__errs)" }
];
