// Number Pop on an emulated iPad, by finger (run from the repo root):
//   node games/pop/build.js && ND_CDP=9351 ND_PROFILE=edge-profile-pop ND_URL=file:///D:/Github/number-dash/games/pop/dist/preview.html ND_READY='!!window.__pop' ND_BOT=none node games/dash/playtest/shoot.js games/pop/playtest/ipad.js
// Landscape iPad: the sixteen worlds on the home card, pick Make 10 and Play with taps, pick a bubble,
// un-pick it, pop a pair, go over on purpose ("Too much!"), pause and resume, then Money by finger.
// Fractions, Brackets (the answer bubble pops) and Place value by finger. Portrait iPad: the home card
// and Make 100; a phone in the same round; a dark phone (home and Share it, a right pair by finger); a
// dark iPad (home and Below zero); a phone in Decimals and its results card; a phone in Brackets with
// the longest question in the badge; a portrait iPad in Double & halve (a wrong answer) and Percent
// (a percent bubble picked). Every stop logs
// the layout: bubble size, gaps between bubbles, bubbles inside the field, HUD clear of the badge
// and strip, and no page scroll; every home card logs whether Play is on screen without scrolling.
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
// is the Play button on screen without scrolling the home card?
const PLAY = "(() => { const r = document.getElementById('playBtn').getBoundingClientRect(), c = document.querySelector('#s-home .card').getBoundingClientRect(); return { playBottom: Math.round(r.bottom), cardBottom: Math.round(c.bottom), screen: innerHeight, playVisible: r.bottom <= innerHeight, cardFits: c.bottom <= innerHeight + 1, worldCard: Math.round(document.querySelector('.world').getBoundingClientRect().height) + 'x' + Math.round(document.querySelector('.world').getBoundingClientRect().width) }; })()";
// the badge: its text, font size, and whether it fits inside itself and the screen
const GOAL = "(() => { const g = document.getElementById('goal'), m = g.querySelector('.make'), r = g.getBoundingClientRect(); return { text: m.innerText, font: getComputedStyle(m).fontSize, fits: g.scrollWidth <= g.clientWidth + 1 && r.left >= 0 && r.right <= innerWidth, goal: Math.round(r.width) }; })()";
const toHome = [{ touchEl: '#pauseBtn' }, { sleep: 400 }, { touchEl: '#homeBtn' }, { sleep: 600 }];
const pickAndPlay = (w) => [
  { touchEl: '.world[data-w="' + w + '"]' }, { sleep: 200 }, { touchEl: '#playBtn' },
  { waitFor: "window.__pop.state().state === 'play' && window.__pop.state().world === " + w, timeout: 5000 },
  { log: "document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent" },
  { sleep: 900 }
];
module.exports = [
  { ipad: true },
  { viewport: [1180, 820, true, false, 2] },
  { reload: true },
  { sleep: 800 }, { eval: ST }, { eval: LAYOUT_FN }, { shot: 'pop-i01-home-ipad' }, { log: PLAY },
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
  // Money by finger: two coins of the answer picked, then the whole answer
  ...toHome, ...pickAndPlay(9),
  { eval: MARK }, { touchEl: '.bub[data-sol="0"]' }, { sleep: 200 }, { touchEl: '.bub[data-sol="1"]' }, { sleep: 300 },
  { shot: 'pop-i07-money-ipad' }, { log: LAYOUT }, { log: st },
  { eval: "window.__pop.state().phase === 'pick' && window.__pop.state().sol.forEach((i) => { if (!window.__pop.slots[i].picked) window.__pop.tap(i); }); window.__st()" },
  // Fractions by finger: one fraction of the answer picked
  ...toHome, ...pickAndPlay(10),
  { eval: MARK }, { touchEl: '.bub[data-sol="0"]' }, { sleep: 300 },
  { shot: 'pop-i16-fractions-ipad' }, { log: LAYOUT }, { log: st },
  // Brackets by finger: the one answer bubble pops
  ...toHome, { log: "document.querySelectorAll('.world').length" }, ...pickAndPlay(15),
  { shot: 'pop-i19-brackets-ipad' }, { log: LAYOUT }, { log: GOAL }, { log: st },
  { eval: MARK }, { touchEl: '.bub[data-sol="0"]' }, { sleep: 120 }, { log: st },
  { shot: 'pop-i20-brackets-solved-ipad' },
  // Place value by finger: two of its parts picked
  ...toHome, ...pickAndPlay(14),
  { eval: MARK }, { touchEl: '.bub[data-sol="0"]' }, { sleep: 200 }, { touchEl: '.bub[data-sol="1"]' }, { sleep: 300 },
  { shot: 'pop-i21-placevalue-ipad' }, { log: LAYOUT }, { log: st },
  // portrait iPad: the home card, then Make 100
  { viewport: [820, 1180, true, false, 2] }, { sleep: 400 },
  ...toHome, { shot: 'pop-i08-home-portrait' }, { log: PLAY },
  ...pickAndPlay(7),
  { eval: MARK }, { touchEl: '.bub[data-sol="0"]' }, { sleep: 300 },
  { shot: 'pop-i09-make100-portrait' }, { log: LAYOUT }, { log: st },
  // a phone, same round
  { viewport: [390, 844, true, false, 3] }, { sleep: 600 },
  { shot: 'pop-i10-make100-phone' }, { log: LAYOUT },
  // a dark phone: home, then Share it with a right pair by finger
  { viewport: [390, 844, true, true, 3] }, { sleep: 300 },
  ...toHome, { shot: 'pop-i11-home-phone-dark' }, { log: PLAY },
  { log: "[document.documentElement.scrollWidth, innerWidth, document.getElementById('screens').scrollHeight, innerHeight]" },
  ...pickAndPlay(8),
  { eval: MARK }, { touchEl: '.bub[data-sol="1"]' }, { sleep: 300 },
  { shot: 'pop-i12-share-phone-dark' }, { log: LAYOUT }, { log: st },
  { touchEl: '.bub[data-sol="0"]' }, { sleep: 120 }, { log: st },
  { shot: 'pop-i13-share-solved-phone-dark' },
  // a dark iPad: Below zero
  { viewport: [1180, 820, true, true, 2] }, { sleep: 400 },
  ...toHome, { shot: 'pop-i14-home-ipad-dark' }, { log: PLAY }, ...pickAndPlay(12),
  { eval: MARK }, { touchEl: '.bub[data-sol="0"]' }, { sleep: 300 },
  { shot: 'pop-i15-belowzero-ipad-dark' }, { log: LAYOUT }, { log: st },
  // a phone: Decimals, then the results card
  { viewport: [390, 844, true, false, 3] }, { sleep: 300 },
  ...toHome, ...pickAndPlay(11),
  { eval: MARK }, { touchEl: '.bub[data-sol="0"]' }, { sleep: 200 }, { touchEl: '.bub[data-sol="1"]' }, { sleep: 300 },
  { shot: 'pop-i17-decimals-phone' }, { log: LAYOUT }, { log: st },
  { eval: AUTO },
  { waitFor: "window.__pop.state().state === 'done'", timeout: 30000 }, { sleep: 2200 },
  { eval: "window.__pop.hook = null; window.__pop.setSpeed(1); 'manual'" },
  { shot: 'pop-i18-results-phone' },
  { log: "[document.getElementById('doneStats').innerText.split(String.fromCharCode(10)).filter(Boolean).join(' '), document.getElementById('doneNext').textContent, document.getElementById('nextBtn').hidden]" },
  { touchEl: '#againBtn' }, { sleep: 300 },
  { log: "[window.__pop.state().state, document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent]" },
  // a phone in Brackets, then the longest question there is in the badge (it shrinks to fit)
  ...toHome, ...pickAndPlay(15), { log: GOAL },
  { eval: "document.querySelector('#goal .make').innerHTML = '<b class=\"q\">(37 + 13) ' + String.fromCharCode(247) + ' 5</b>'; window.dispatchEvent(new Event('resize')); 'longest'" }, { sleep: 200 },
  { shot: 'pop-i22-brackets-long-phone' }, { log: GOAL }, { log: LAYOUT },
  // portrait iPad: the home card, Double & halve with a wrong answer, then Percent with a percent picked
  { viewport: [820, 1180, true, false, 2] }, { sleep: 400 },
  ...toHome, ...pickAndPlay(13), { log: GOAL },
  { eval: "(() => { const P = window.__pop, s = P.state(), b = P.bubbles().find((x) => x.v !== s.target); document.querySelector('.bub[data-i=\"' + b.i + '\"]').dataset.wrong = 1; return [s.q, s.target, b.v]; })()" },
  { touchEl: '.bub[data-wrong="1"]' }, { sleep: 150 },
  { shot: 'pop-i23-double-wrong-portrait' }, { log: LAYOUT }, { log: st }, { log: "document.getElementById('strip').textContent" },
  ...toHome, ...pickAndPlay(16),
  { eval: MARK }, { touchEl: '.bub[data-sol="0"]' }, { sleep: 300 },
  { shot: 'pop-i24-percent-portrait' }, { log: LAYOUT }, { log: st }, { log: "document.getElementById('strip').textContent" },
  { log: 'JSON.stringify(window.__errs)' }
];
