// Number Pop on an emulated iPad, by finger (run from the repo root):
//   node games/pop/build.js && ND_CDP=9351 ND_PROFILE=edge-profile-pop ND_URL=file:///D:/Github/number-dash/games/pop/dist/preview.html ND_READY='!!window.__pop' ND_BOT=none node games/dash/playtest/shoot.js games/pop/playtest/ipad.js
// Landscape iPad: pick Make 10 and Play with taps, pick a bubble, un-pick it, pop a pair, go over
// on purpose ("Too much!"), pause and resume. Then portrait iPad (Take away), a phone, a dark
// phone (home and Times), a dark iPad (Mix) and the results card on a phone. Every stop logs the
// layout: bubble size, gaps between bubbles, bubbles inside the field, HUD clear of the badge and
// strip, and no page scroll.
const ST = "window.__st = () => { const s = window.__pop.state(); return [s.state, s.phase, s.world, s.kind, s.target, 'done ' + s.done, 'slips ' + s.slips, 'picks ' + s.picks.map((i) => window.__pop.slots[i].v).join(',')]; }; 'ok'";
const st = 'window.__st()';
// tag the planted answer's bubbles data-sol="0".."2" so a finger can find them
const MARK = "(() => { const P = window.__pop, s = P.state(); document.querySelectorAll('.bub').forEach((b) => { delete b.dataset.sol; delete b.dataset.over; }); s.sol.forEach((i, k) => { document.querySelector('.bub[data-i=\"' + i + '\"]').dataset.sol = k; }); return [s.target, s.kind, s.sol.map((i) => P.slots[i].v)]; })()";
// tag the two biggest bubbles data-over="0"/"1" (together more than the target in a plus world)
const MARK_OVER = "(() => { const P = window.__pop, s = P.state(); const bs = P.bubbles().filter((b) => (b.st === 'live' || b.st === 'in') && !b.picked).sort((a, b) => b.v - a.v); bs.slice(0, 2).forEach((b, k) => { document.querySelector('.bub[data-i=\"' + b.i + '\"]').dataset.over = k; }); return [s.target, bs[0].v + bs[1].v]; })()";
const LAYOUT_FN = "window.__lay = () => { const P = window.__pop, L = P.layout(), bs = P.bubbles().filter((b) => b.st === 'live' || b.st === 'in'); let gap = 1e9;" +
  " for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) gap = Math.min(gap, Math.hypot(bs[i].x - bs[j].x, bs[i].y - bs[j].y) - L.D);" +
  " const inside = bs.every((b) => b.x - L.D / 2 >= L.FL - 1 && b.x + L.D / 2 <= L.FL + L.FW + 1 && b.y - L.D / 2 >= L.FT - 1 && b.y + L.D / 2 <= L.FT + L.FH + 1);" +
  " const r = (id) => document.querySelector(id).getBoundingClientRect(), hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;" +
  " const goal = r('#goal'), strip = r('#strip'), chips = r('.hud-chips'), pause = r('#pauseBtn');" +
  " return { bubble: L.D, field: [Math.round(L.FW), Math.round(L.FH)], minGap: Math.round(gap), inside: inside, hudClear: !hit(chips, goal) && !hit(chips, strip) && !hit(pause, goal) && !hit(pause, strip)," +
  " pauseBtn: Math.round(pause.width), noScroll: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight, goalFont: getComputedStyle(document.querySelector('.goal .make')).fontSize, stripFont: getComputedStyle(document.getElementById('strip')).fontSize }; }; 'ok'";
const LAYOUT = 'window.__lay()';
// finish the round quickly by tapping the planted answers (for the results card)
const AUTO = "(() => { const P = window.__pop; P.setSpeed(10); let next = 0; P.hook = () => { const s = P.state(); if (s.state !== 'play' || s.phase !== 'pick' || s.time < next) return; const i = s.sol.find((j) => !P.slots[j].picked); if (i !== undefined) { P.tap(i); next = s.time + 0.5; } }; return 'auto'; })()";
const toWorld = (w) => [
  { touchEl: '#pauseBtn' }, { sleep: 400 }, { touchEl: '#homeBtn' }, { sleep: 500 },
  { touchEl: '.world[data-w="' + w + '"]' }, { sleep: 200 }, { touchEl: '#playBtn' },
  { waitFor: "window.__pop.state().state === 'play' && window.__pop.state().world === " + w, timeout: 5000 },
  { log: "document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent" },
  { sleep: 900 }
];
module.exports = [
  { ipad: true },
  { viewport: [1180, 820, true, false, 2] },
  { reload: true },
  { sleep: 800 }, { eval: ST }, { eval: LAYOUT_FN }, { shot: 'pop-i01-home-ipad' },
  { log: "[matchMedia('(pointer: coarse)').matches, document.querySelector('.world').getBoundingClientRect().height, document.getElementById('playBtn').getBoundingClientRect().height]" },
  { touchEl: '.world[data-w="1"]' }, { sleep: 200 },
  { log: "document.querySelector('.world[aria-checked=\"true\"]').dataset.w" },
  { touchEl: '#playBtn' },
  { waitFor: "window.__pop.state().state === 'play'", timeout: 5000 }, { sleep: 900 },
  { shot: 'pop-i02-make10-ipad' }, { log: LAYOUT }, { log: st },
  // one finger on an answer bubble: picked, then picked again: let go
  { eval: MARK }, { touchEl: '.bub[data-sol="0"]' }, { sleep: 300 }, { log: st },
  { shot: 'pop-i03-picked-ipad' },
  { touchEl: '.bub[data-sol="0"]' }, { sleep: 250 }, { log: st },
  // the whole answer: they pop
  { touchEl: '.bub[data-sol="0"]' }, { sleep: 200 }, { touchEl: '.bub[data-sol="1"]' }, { sleep: 90 },
  { shot: 'pop-i04-pop-ipad' }, { log: st },
  // too much on purpose
  { sleep: 900 }, { eval: MARK_OVER }, { touchEl: '.bub[data-over="0"]' }, { sleep: 200 }, { touchEl: '.bub[data-over="1"]' }, { sleep: 150 },
  { shot: 'pop-i05-too-much-ipad' }, { log: st }, { sleep: 900 }, { log: st },
  // pause and resume by finger
  { touchEl: '#pauseBtn' }, { sleep: 400 }, { shot: 'pop-i06-pause-ipad' }, { log: st },
  { touchEl: '#resumeBtn' }, { sleep: 300 }, { log: st },
  // portrait iPad: Take away, one bubble of the answer picked
  { viewport: [820, 1180, true, false, 2] }, { sleep: 400 },
  ...toWorld(4),
  { eval: MARK }, { touchEl: '.bub[data-sol="0"]' }, { sleep: 200 }, { touchEl: '.bub[data-sol="1"]' }, { sleep: 300 },
  { shot: 'pop-i07-takeaway-portrait' }, { log: LAYOUT }, { log: st },
  // a phone, same round
  { viewport: [390, 844, true, false, 3] }, { sleep: 600 },
  { shot: 'pop-i08-takeaway-phone' }, { log: LAYOUT },
  // a dark phone: home, then Times with one bubble picked
  { viewport: [390, 844, true, true, 3] }, { sleep: 300 },
  { touchEl: '#pauseBtn' }, { sleep: 400 }, { touchEl: '#homeBtn' }, { sleep: 600 },
  { shot: 'pop-i09-home-phone-dark' },
  { log: "[document.documentElement.scrollWidth, innerWidth, document.getElementById('screens').scrollHeight, innerHeight]" },
  { touchEl: '.world[data-w="5"]' }, { sleep: 200 }, { touchEl: '#playBtn' },
  { waitFor: "window.__pop.state().state === 'play' && window.__pop.state().world === 5", timeout: 5000 }, { sleep: 900 },
  { eval: MARK }, { touchEl: '.bub[data-sol="0"]' }, { sleep: 300 },
  { shot: 'pop-i10-times-phone-dark' }, { log: LAYOUT }, { log: st },
  // a dark iPad: Mix
  { viewport: [1180, 820, true, true, 2] }, { sleep: 400 },
  ...toWorld(6),
  { eval: MARK }, { touchEl: '.bub[data-sol="0"]' }, { sleep: 300 },
  { shot: 'pop-i11-mix-ipad-dark' }, { log: LAYOUT }, { log: st },
  // the results card on a phone
  { viewport: [390, 844, true, false, 3] }, { sleep: 300 },
  { eval: AUTO },
  { waitFor: "window.__pop.state().state === 'done'", timeout: 30000 }, { sleep: 2200 },
  { eval: "window.__pop.hook = null; window.__pop.setSpeed(1); 'manual'" },
  { shot: 'pop-i12-results-phone' },
  { log: "[document.getElementById('doneStats').innerText.replace(/\\n+/g, ' '), document.getElementById('doneNext').textContent]" },
  { touchEl: '#againBtn' }, { sleep: 300 },
  { log: "[window.__pop.state().state, document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent]" },
  { log: 'JSON.stringify(window.__errs)' }
];
