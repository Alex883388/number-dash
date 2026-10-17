// Number Pop smoke test (run from the repo root):
//   node games/pop/build.js && ND_CDP=9351 ND_PROFILE=edge-profile-pop ND_URL=file:///D:/Github/number-dash/games/pop/dist/preview.html ND_READY='!!window.__pop' ND_BOT=none node games/dash/playtest/shoot.js games/pop/playtest/smoke.js
// Desktop size: the home card, a round of Up to 20, then calm mode (the shared "calm" setting,
// on by default with reduced motion): bubbles drift slower and a pop throws fewer particles.
const st = "JSON.stringify(window.__pop.state())";
// average bubble speed in px/s over one second, and the particles one pop makes
const speedCheck = (label) => "(async () => { const P = window.__pop, a = P.bubbles(); await new Promise((r) => setTimeout(r, 1000)); const b = P.bubbles(); let d = 0, n = 0; a.forEach((x, i) => { if (!x.picked && !b[i].picked && b[i].st === 'live') { d += Math.hypot(b[i].x - x.x, b[i].y - x.y); n++; } }); return " + JSON.stringify(label) + " + Math.round(d / n) + ' px/s over ' + n + ' bubbles'; })()";
const popCount = "(() => { const P = window.__pop, s = P.state(); s.sol.forEach((i) => P.tap(i)); return [document.body.classList.contains('calm'), P.state().done, document.getElementById('strip').textContent]; })()";
module.exports = [
  { viewport: [1180, 820, false, false, 1] },
  { sleep: 600 }, { shot: 'pop-s01-home' },
  { eval: "window.__pop.save.settings.calm = false; window.__pop.start(2)" }, { sleep: 900 },
  { log: st },
  { log: "window.__pop.bubbles().map(b => b.v + (b.picked ? '*' : '')).join(' ')" },
  { shot: 'pop-s02-play' },
  { log: speedCheck('drift ') },
  { log: popCount }, { sleep: 60 }, { shot: 'pop-s03-pop' },
  { eval: "window.__pop.home(); window.__pop.save.settings.calm = true; window.__pop.start(2)" }, { sleep: 900 },
  { log: speedCheck('calm drift ') },
  { log: popCount }, { sleep: 60 }, { shot: 'pop-s04-pop-calm' },
  // calm off again, saved by one more solved target (mathRight writes the shared save)
  { eval: "(() => { const P = window.__pop; P.save.settings.calm = false; P.start(2); P.state().sol.forEach((i) => P.tap(i)); P.home(); return P.save.settings.calm; })()" },
  // the new worlds: Money with one coin picked, Share it with a wrong pair (the strip says why)
  { eval: "window.__pop.home(); window.__pop.start(9)" }, { sleep: 900 },
  { eval: "(() => { const P = window.__pop, s = P.state(); P.tap(s.sol[0]); return [s.target, document.getElementById('targetNum').textContent, document.getElementById('strip').textContent]; })()" },
  { sleep: 300 }, { shot: 'pop-s06-money' },
  { eval: "window.__pop.home(); window.__pop.start(8)" }, { sleep: 900 },
  { eval: "(() => { const P = window.__pop, s = P.state(), bs = P.bubbles(); for (const a of bs) for (const b of bs) { if (a.i === b.i) continue; const big = Math.max(a.v, b.v), small = Math.min(a.v, b.v); if (big % small !== 0) { P.tap(a.i); P.tap(b.i); return [s.target, a.v, b.v, document.getElementById('strip').textContent, P.state().phase]; } } return 'no pair'; })()" },
  { sleep: 150 }, { shot: 'pop-s07-share-not-quite' },
  { log: "JSON.stringify(window.__pop.save.math.tricky.slice(-1))" },
  // a whole Make 10 round by tapping the planted answers, for the results card (with "Next world")
  { eval: "(() => { const P = window.__pop; P.setSpeed(10); let next = 0; P.hook = () => { const s = P.state(); if (s.state !== 'play' || s.phase !== 'pick' || s.time < next) return; const i = s.sol.find((j) => !P.slots[j].picked); if (i !== undefined) { P.tap(i); next = s.time + 0.5; } }; return P.start(1); })()" },
  { waitFor: "window.__pop.state().state === 'done'", timeout: 30000 }, { sleep: 2200 },
  { eval: "window.__pop.hook = null; window.__pop.setSpeed(1); 'manual'" },
  { shot: 'pop-s05-results' },
  { log: "[document.getElementById('nextBtn').hidden, document.getElementById('doneNext').textContent]" },
  { eval: "document.getElementById('nextBtn').click(); [window.__pop.state().world, window.__pop.state().state]" },
  { log: "JSON.stringify(window.__errs)" }
];
