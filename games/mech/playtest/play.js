// Mech Blaster by finger on an emulated iPad (run from the repo root):
//   node games/mech/build.js && ND_CDP=9601 ND_PROFILE=edge-profile-mech ND_URL=file:///D:/Github/number-dash/games/mech/dist/preview.html ND_READY='!!window.__mech' ND_BOT=none node games/dash/playtest/shoot.js games/mech/playtest/play.js
// A fresh player: the home card, Play, the briefing, Go. In level 1: a drone shot down by tapping it, lanes changed with
// the buttons and a swipe, a jump, the gate opened by tapping the right panel, pause and resume; the rest of the level
// flown by the autopilot; the done card and its stars; the level map scrolled to the bottom; the hangar. Then a player
// with 14 levels done: the weapon bar (tap Rockets), and the Iron Crab's shield opened by tapping the right orb.
// Every stop checks the layout with __mech.fits() (on screen, nothing covering the buttons).
const errs = "window.__errs = window.__errs || []; window.addEventListener('error', (e) => window.__errs.push(String(e.message))); 'listening'";
const S = '__mech.S';
const target = "(() => { const h = __mech.MR.hitsNow().filter((h) => { const e = __mech.S.ents.find((x) => x.id === h.id); return e && e.c === 'enemy'; }).sort((a, b) => b.r - a.r)[0]; return h ? [h.x, h.y] : null; })()";
const panel = "(() => { const G = __mech.S.gate; if (!G) return null; const p = __mech.MR.panelsNow().find((p) => p.i === G.q.correct); return p ? [p.x + p.w / 2, p.y + p.h / 2] : null; })()";
const wrongPanel = "(() => { const G = __mech.S.gate; if (!G) return null; const p = __mech.MR.panelsNow().find((p) => p.i !== G.q.correct); return p ? [p.x + p.w / 2, p.y + p.h / 2] : null; })()";
const orb = "(() => { const B = __mech.S.boss; if (!B || B.mode !== 'shield') return null; const i = B.orbs.findIndex((o) => o.ok); const r = __mech.MR.proj(B.orbs[i].x, B.orbs[i].y, B.orbs[i].z); return [r.x, r.y]; })()";
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
  // a drone, shot down by finger
  { waitFor: target + " !== null", timeout: 20000 },
  { eval: "window.__f0 = " + S + ".stats.fired; window.__k0 = " + S + ".stats.kills; 'counted'" },
  { touchAt: target }, { sleep: 250 }, { touchAt: target }, { sleep: 250 }, { touchAt: target }, { sleep: 600 },
  { log: "['taps fired', " + S + ".stats.fired - window.__f0, 'kills', " + S + ".stats.kills - window.__k0]" },
  { shot: 'mech-p03-fight' },
  // lanes and a jump
  { touchEl: '#leftBtn' }, { sleep: 400 }, { log: "['after left', " + S + ".mech.lane]" },
  { touchEl: '#rightBtn' }, { sleep: 250 }, { touchEl: '#rightBtn' }, { sleep: 400 }, { log: "['after right right', " + S + ".mech.lane]" },
  { drag: [700, 560, 480, 570, 120] }, { sleep: 400 }, { log: "['after a swipe left', " + S + ".mech.lane]" },
  { touchEl: '#jumpBtn' }, { sleep: 150 }, { log: "['jumping', " + S + ".mech.air, " + S + ".mech.y.toFixed(2)]" },
  { sleep: 1200 },
  // the gate: one wrong panel (the tip shows), then the right one
  { waitFor: S + ".gate && " + S + ".gate.z < 13", timeout: 40000 }, { sleep: 400 },
  { shot: 'mech-p04-gate' },
  { log: "['question', document.getElementById('qText').textContent, " + S + ".gate.q.kind]" },
  { touchAt: wrongPanel }, { sleep: 700 },
  { log: "['after a wrong panel', " + S + ".gate.wrongs, !document.getElementById('qTip').hidden, document.getElementById('qTip').textContent]" },
  { shot: 'mech-p05-wrong' },
  { touchAt: panel }, { sleep: 700 },
  { log: "['after the right panel', " + S + ".gate.open, " + S + ".stats.right, document.getElementById('qbox').className]" },
  { shot: 'mech-p06-right' },
  // pause and resume
  { touchEl: '#pauseBtn' }, { sleep: 400 }, { log: "['paused', __mech.paused, !document.getElementById('s-pause').hidden]" },
  { shot: 'mech-p07-pause' },
  { touchEl: '#resumeBtn' }, { sleep: 300 }, { log: "['resumed', __mech.paused]" },
  // the autopilot flies the rest, fast
  { eval: "__mech.auto({}); __mech.speed(6); 'auto'" },
  { waitFor: "!document.getElementById('s-done').hidden", timeout: 90000 },
  { eval: "__mech.speed(1); __mech.auto(false); 'manual'" },
  { log: "['done', document.getElementById('doneTitle').textContent, document.querySelectorAll('#doneStars span:not(.off)').length, JSON.stringify(__mech.rec.levels)]" },
  { shot: 'mech-p08-done' },
  // the level map, scrolled by finger to the last world
  { touchEl: '#doneLevels' }, { sleep: 600 },
  { log: "['levels', !document.getElementById('s-levels').hidden, document.querySelectorAll('.lv').length, document.querySelectorAll('.lv:disabled').length, getComputedStyle(document.getElementById('screens')).pointerEvents]" },
  { shot: 'mech-p09-levels' },
  { drag: [590, 700, 590, 150, 400] }, { drag: [590, 700, 590, 150, 400] }, { drag: [590, 700, 590, 150, 400] }, { drag: [590, 700, 590, 150, 400] }, { sleep: 800 },
  { log: "['scrolled', document.getElementById('screens').scrollTop, document.getElementById('screens').scrollHeight - document.getElementById('screens').clientHeight]" },
  { shot: 'mech-p10-levels-bottom' },
  { touchEl: '#levelsBack' }, { sleep: 400 }, { touchEl: '#hangarBtn' }, { sleep: 600 },
  { log: "['hangar', document.querySelectorAll('#wlist .witem').length, document.querySelectorAll('#wlist .witem.locked').length, document.querySelectorAll('#elist .witem').length]" },
  { shot: 'mech-p11-hangar' },
  // a player with 14 levels done: four weapons, rockets by finger
  { eval: "for (let n = 1; n <= 14; n++) __mech.rec.levels[n] = { s: 3, b: 1000 }; __mech.start(15); 'level 15'" }, { sleep: 1500 },
  { log: "['weapons', " + S + ".weapons.join(','), document.querySelectorAll('#weapons .wbtn').length, JSON.stringify(__mech.fits())]" },
  { touchEl: '#weapons .wbtn[data-w=\"rockets\"]' }, { sleep: 300 }, { log: "['weapon now', " + S + ".weapon]" },
  { waitFor: target + " !== null", timeout: 20000 }, { touchAt: target }, { sleep: 900 },
  { shot: 'mech-p12-rockets' },
  // the Iron Crab: its shield opened by tapping the right orb
  { eval: "__mech.start(10); __mech.auto({ think: 99 }); 'boss'" },
  { waitFor: S + ".boss && " + S + ".boss.mode === 'shield' && " + S + ".boss.z < 32", timeout: 40000 }, { sleep: 600 },
  { eval: "__mech.auto(false); 'manual'" },
  { shot: 'mech-p13-boss' },
  { touchAt: orb }, { sleep: 900 },
  { log: "['boss after the right orb', " + S + ".boss.mode, " + S + ".stats.right]" },
  { shot: 'mech-p14-boss-open' },
  { log: "JSON.stringify(window.__errs)" }
];
