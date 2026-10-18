// Tycoon Town by finger on an emulated iPad (run from the repo root):
//   node games/tycoon/build.js && ND_CDP=9521 ND_PROFILE=edge-profile-tycoon ND_URL=file:///D:/Github/number-dash/games/tycoon/dist/preview.html ND_READY='!!window.__tycoon' ND_BOT=none node games/dash/playtest/shoot.js games/tycoon/playtest/play.js
// A new company; the first business placed on a lot tapped on the map, its opening case decided; the clock
// running (money pops up every hour), paused and sped up; a month closed with Next month (night, report);
// the map dragged, pinched, zoomed and flown to a district; lots tapped (the business, a neighbour, a lot for
// sale); land bought, a loan taken and repaid, every panel; then save and resume: a reload brings the same game
// back at the same hour, and a save code restores it too. Opening the page saves nothing.
const T = 'window.__tycoon';
const fits = "(() => { const d = document.scrollingElement; return [d.scrollHeight <= innerHeight + 1, d.scrollWidth <= innerWidth + 1]; })()";
const lotAt = (expr) => `(() => { const W = ${T}, q = ${expr}, p = W.map.screenOfLot(q[0], q[1]), r = document.getElementById('mapCv').getBoundingClientRect(); return [r.left + p[0], r.top + p[1] - 4]; })()`;
module.exports = [
  { viewport: [1180, 820, true, false, 2] },
  { eval: "localStorage.removeItem('tycoon-town.v1'); localStorage.removeItem('arcade-days.v1'); location.reload(); 'fresh'" }, { sleep: 1200 },
  { log: "[localStorage.getItem('tycoon-town.v1'), localStorage.getItem('arcade-days.v1'), document.querySelectorAll('#slots .slot.empty').length]" },
  { shot: 'ty-01-home' },
  { touchEl: '[data-new="0"]' }, { sleep: 400 },
  { touchEl: '#nameIdeas [data-name]' }, { touchEl: '[data-logo="🦁"]' }, { sleep: 200 }, { shot: 'ty-02-new' },
  { touchEl: '#newGo' }, { sleep: 900 },
  { log: `[${T}.G.name, ${T}.G.logo, ${T}.G.cash, document.getElementById('game').hidden, !!document.querySelector('#dialog h2'), ${T}.G.live.h]` },
  { shot: 'ty-03-welcome' },
  { touchEl: '#dialog [data-close]' }, { sleep: 1500 },
  { log: fits }, { shot: 'ty-04-city' },
  // the clock runs once the welcome is closed
  { log: `[${T}.G.live.h > 0.3, ${T}.map.stats.frames > 20]` },
  // open the lemonade stand from Invest: choose a spot on the map, tap a glowing lot, rent it
  { touchEl: '[data-biz="lemonade"]' }, { sleep: 400 }, { shot: 'ty-05-about' },
  { log: "document.querySelector('#dialog .word').textContent.slice(0, 60)" },
  { touchEl: '#openIt' }, { sleep: 1600 },
  { log: `[!!${T}.picking, ${T}.picking.lots.length > 5, !document.getElementById('mbanner').hidden]` },
  { eval: `(() => { const h = ${T}.G.live.h; sessionStorage.setItem('h0', h); return 'clock waits while picking'; })()` }, { sleep: 800 },
  { log: `+sessionStorage.getItem('h0') === ${T}.G.live.h` },
  { shot: 'ty-06-pick' },
  // a tap off the glowing lots only says where to tap
  { touchAt: lotAt(`(() => { const p = W.picking, L = W.TY.lotsOf(p.d), cv = document.getElementById('mapCv').getBoundingClientRect(), ban = document.getElementById('mbanner').getBoundingClientRect();
      const far = (j) => p.lots.every((k) => Math.max(Math.abs(L[k].c - L[j].c), Math.abs(L[k].r - L[j].r)) >= 2), seen = (j) => { const q = W.map.screenOfLot(p.d, j); return q[0] > 60 && q[0] < cv.width - 90 && q[1] > ban.bottom - cv.top + 40 && q[1] < cv.height - 30; };
      const i = L.findIndex((l, j) => W.TY.lotState(W.G, p.d, j).k === 'npc' && far(j) && seen(j)); return [p.d, i]; })()`) }, { sleep: 300 },
  { log: `[!!${T}.picking, document.getElementById('toast').textContent]` },
  { touchAt: lotAt(`(() => { const p = W.picking, cv = document.getElementById('mapCv').getBoundingClientRect(), ban = document.getElementById('mbanner').getBoundingClientRect(); const seen = p.lots.filter((i) => { const q = W.map.screenOfLot(p.d, i); return q[0] > 60 && q[0] < cv.width - 90 && q[1] > ban.bottom - cv.top + 40 && q[1] < cv.height - 30; }); const best = seen.sort((a, b) => p.stars[b] - p.stars[a])[0]; sessionStorage.setItem('lot', best); return [p.d, best]; })()`) }, { sleep: 500 },
  { log: "[!!document.getElementById('doOpen'), document.querySelector('#dialog .spot').textContent.slice(0, 40)]" },
  { shot: 'ty-07-where' },
  { touchEl: '#doOpen' }, { sleep: 1200 },
  { log: `[${T}.G.biz.length, ${T}.G.biz[0].plot === 'market:' + sessionStorage.getItem('lot'), ${T}.G.cash, ${T}.G.inbox.length, !!document.querySelector('#dialog .opt')]` },
  { shot: 'ty-08-case' },
  { touchEl: '#dialog .opt[data-k="0"]' }, { sleep: 150 },
  { log: "[document.querySelector('#dialog .opt[data-k=\"0\"]').getAttribute('aria-pressed'), document.getElementById('decide').disabled]" },
  { touchEl: '#decide' }, { sleep: 500 },
  { log: `[document.querySelector('#dialog h2').textContent, document.querySelectorAll('#dialog .bigstars span:not(.off)').length, ${T}.G.stats.cases, ${T}.G.stats.stars]` },
  { shot: 'ty-09-result' },
  { touchEl: '#dialog [data-close]' }, { sleep: 300 },
  // time: money comes in every hour; pause stops it; two taps on the speed make it 4x (two hours a second)
  { touchEl: '#speedBtn' }, { touchEl: '#speedBtn' }, { sleep: 200 },
  { eval: `(() => { sessionStorage.setItem('g0', ${T}.G.live.got[${T}.G.biz[0].uid] || 0); sessionStorage.setItem('h1', ${T}.G.live.h); return ${T}.clock.speed; })()` }, { sleep: 2000 },
  { log: `[${T}.clock.speed, (${T}.G.live.h - sessionStorage.getItem('h1')).toFixed(1), (${T}.G.live.got[${T}.G.biz[0].uid] || 0) !== +sessionStorage.getItem('g0')]` },
  { touchEl: '#playBtn' }, { sleep: 200 },
  { eval: `(() => { sessionStorage.setItem('h2', ${T}.G.live.h); return document.getElementById('playBtn').textContent; })()` }, { sleep: 1000 },
  { log: `[+sessionStorage.getItem('h2') === ${T}.G.live.h, document.getElementById('playBtn').getAttribute('aria-label')]` },
  { touchEl: '#playBtn' }, { touchEl: '#speedBtn' }, { sleep: 200 },
  { log: `${T}.clock.speed` },
  // the evening: Next month closes the month (night, the money of the rest of the day, the report)
  { touchEl: '#nextBtn' }, { sleep: 900 },
  { log: `[${T}.G.month, ${T}.clock.night > 0, !document.getElementById('msum').hidden, localStorage.getItem('arcade-days.v1') !== null, JSON.parse(localStorage.getItem('tycoon-town.v1')).slots[0].month]` },
  { shot: 'ty-10-night' },
  { eval: `(() => { ${T}.closeModal(); return 'report closed'; })()` },
  { waitFor: `${T}.clock.night === 0`, timeout: 10000 },
  { log: `[${T}.G.live.h < 1, ${T}.G.report.lines.length]` },
  // the map: a drag moves it, a pinch zooms (settling on a zoom step), the buttons and a district fly there
  { eval: `(() => { ${T}.map.focus('market', null, 1); return 1; })()` }, { sleep: 1500 },
  { eval: `(() => { sessionStorage.setItem('cx', ${T}.map.cam.x); return ${T}.map.cam.z; })()` },
  { drag: [500, 500, 300, 420, 300] }, { sleep: 600 },
  { log: `[+sessionStorage.getItem('cx') !== ${T}.map.cam.x, ${T}.map.cam.z]` },
  { pinch: [600, 450, 120, 220] }, { sleep: 1200 },
  { log: `${T}.map.cam.z` },
  { touchEl: '#zOut' }, { sleep: 1200 }, { log: `${T}.map.cam.z` },
  { touchEl: '#zAll' }, { sleep: 1800 }, { log: `${T}.map.cam.z` }, { shot: 'ty-11-whole' },
  { touchEl: '#dnav [data-d="downtown"]' }, { sleep: 1500 },
  { log: `[Math.round(${T}.map.cam.x), Math.round(${T}.map.cam.y), document.getElementById('toast').textContent]` },
  { touchEl: '#dnav [data-d="market"]' }, { sleep: 1500 },
  // play a year quickly, deciding every case with its first option
  { eval: `(() => { const W = ${T}, TY = W.TY; for (let m = 0; m < 12; m++) { W.G.inbox.slice().forEach((x) => TY.decide(W.G, x.key, [0])); TY.next(W.G); } W.saveGame(true); W.render(); return [W.G.month, Math.round(W.G.cash), TY.netWorth(W.G), W.G.biz.length, W.G.rivals.length]; })()` },
  // tap the stand's lot: its panel; buy the land under it
  { eval: `(() => { const b = ${T}.G.biz[0], [d, i] = b.plot.split(':'); ${T}.map.focus(d, +i, 1); return b.plot; })()` }, { sleep: 1500 },
  // tap the stand's badge (it floats over the building, the easiest thing to hit)
  { touchAt: `(() => { const W = ${T}, [d, i] = W.G.biz[0].plot.split(':'), p = W.map.badgeOf(d, +i), r = document.getElementById('mapCv').getBoundingClientRect(); return p && [r.left + p[0], r.top + p[1]]; })()` }, { sleep: 400 }, { shot: 'ty-12-lot' },
  { log: "[document.querySelector('#pbody h3').textContent, !!document.getElementById('sellBiz'), !!document.getElementById('buyUnder'), !!document.querySelector('#pbody .spot'), document.getElementById('todayAmt') !== null]" },
  { eval: `(() => { ${T}.G.cash += 1000; ${T}.render(); return 'cash for the land'; })()` },
  { touchEl: '#buyUnder' }, { sleep: 300 },
  { log: `[!!${T}.G.land[${T}.G.biz[0].plot], ${T}.TY.rentFor(${T}.G, ${T}.G.biz[0])]` },
  // a neighbour's lot and a lot for sale
  { touchAt: lotAt(`(() => { const L = W.TY.lotsOf('market'), i = L.findIndex((l, j) => W.TY.lotState(W.G, 'market', j).k === 'npc' && Math.abs(W.map.screenOfLot('market', j)[0] - 400) < 300 && Math.abs(W.map.screenOfLot('market', j)[1] - 400) < 250); return ['market', i]; })()`) }, { sleep: 300 },
  { log: "document.querySelector('#pbody h3').textContent" },
  { touchAt: lotAt(`(() => { const L = W.TY.lotsOf('market'), i = W.TY.forSale(W.G, 'market').find((j) => Math.abs(W.map.screenOfLot('market', j)[0] - 400) < 350 && Math.abs(W.map.screenOfLot('market', j)[1] - 400) < 300); return ['market', i]; })()`) }, { sleep: 300 },
  { log: "[document.querySelector('#pbody h3').textContent, document.querySelectorAll('#pbody .bcard[data-lot]').length, !!document.getElementById('buyLand')]" },
  { shot: 'ty-13-forsale' },
  // the bank: borrow, then repay all
  { touchEl: '#backTabs' }, { touchEl: '#ptabs [data-tab="bank"]' }, { sleep: 200 }, { shot: 'ty-14-bank' },
  { touchEl: '#pbody [data-borrow]' }, { sleep: 200 },
  { log: `[${T}.G.loan > 0, ${T}.G.handbook.loan > 0]` },
  { eval: `(() => { const b = [...document.querySelectorAll('#pbody [data-repay]')]; b[b.length - 1].setAttribute('data-tap', '1'); return b.length; })()` },
  { touchEl: '#pbody [data-repay][data-tap]' }, { sleep: 200 },
  { log: `[${T}.G.loan, ${T}.G.stats.loanPaid]` },
  { touchEl: '#ptabs [data-tab="goals"]' }, { sleep: 200 }, { shot: 'ty-15-goals' },
  { touchEl: '#ptabs [data-tab="ceo"]' }, { sleep: 200 }, { shot: 'ty-16-ceo' },
  { touchEl: '#ptabs [data-tab="company"]' }, { sleep: 200 }, { shot: 'ty-17-company' },
  // save and resume: pause, save, reload; Continue brings back the same game at the same hour
  { touchEl: '#playBtn' }, { sleep: 100 },
  { eval: `(() => { const W = ${T}; W.saveGame(false); const g = JSON.parse(localStorage.getItem('tycoon-town.v1')).slots[0].game; sessionStorage.setItem('before', JSON.stringify(g)); sessionStorage.setItem('hb', g.live.h); location.reload(); return 'reload'; })()` }, { sleep: 1500 },
  { log: "[document.querySelector('#slots .slot b').textContent, document.querySelector('#slots [data-play=\"0\"]').textContent]" },
  { log: `(() => { const W = ${T}, x = JSON.parse(sessionStorage.getItem('before')); return JSON.stringify(W.TY.restore(JSON.parse(JSON.stringify(x)))) === JSON.stringify(x); })()` },
  { touchEl: '[data-play="0"]' }, { sleep: 600 },
  { log: `[${T}.G.month === JSON.parse(sessionStorage.getItem('before')).month, ${T}.G.live.h >= +sessionStorage.getItem('hb'), ${T}.G.live.h - sessionStorage.getItem('hb') < 1.5, ${T}.G.biz.length]` },
  // a save code: the same company comes back out of it
  { eval: `(() => { const W = ${T}; const code = W.codeOf(W.rec.slots[0]); const x = W.slotFrom(code); return [code.slice(0, 8), code.length, !!x, x && x.game.month === W.G.month, W.slotFrom('rubbish') === null]; })()` },
  { log: fits },
  // portrait iPad and a phone, dark
  { viewport: [820, 1180, true, false, 2] }, { sleep: 600 }, { log: fits }, { shot: 'ty-18-portrait' },
  { viewport: [390, 844, true, true, 3] }, { sleep: 600 }, { log: fits }, { shot: 'ty-19-phone-dark' },
  { log: "(() => { const m = document.getElementById('mapCv').getBoundingClientRect(); return [Math.round(m.width), Math.round(m.height), [...document.querySelectorAll('.bar button, .zoombox button, .dnav button')].every((b) => b.getBoundingClientRect().width >= 38 && b.getBoundingClientRect().height >= 38)]; })()" },
  { touchEl: '#inboxBtn' }, { sleep: 300 }, { shot: 'ty-20-phone-inbox' },
  { log: 'JSON.stringify(window.__errs)' }
];
