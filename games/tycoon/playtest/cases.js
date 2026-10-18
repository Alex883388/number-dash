// Tycoon Town: two-action cases, offers, rivals, the city filling up and the phone header (run from the repo root):
//   node games/tycoon/build.js && ND_CDP=9522 ND_PROFILE=edge-profile-tycoon2 ND_URL=file:///D:/Github/number-dash/games/tycoon/dist/preview.html ND_READY='!!window.__tycoon' ND_BOT=none node games/dash/playtest/shoot.js games/tycoon/playtest/cases.js
// A High Street business opened by finger (Best spot) with its land bought; its case decided with two actions
// (a third tap swaps out the first); an offer read aloud and answered with its trap; the report lists new CEO
// words; a rival opens next door: banner, case, its lot on the map; the city sells lots to others month by
// month and land gets dearer; on a phone the top bar keeps Next month on the first row.
const T = 'window.__tycoon';
module.exports = [
  { viewport: [1180, 820, true, false, 2] },
  { eval: `(() => { localStorage.removeItem('tycoon-town.v1'); const W = ${T}; W.G = W.TY.newGame('Case Test', 5); W.G.logo = '🐼'; W.G.cash = 100000; W.G.tier = 2; W.rec.slots[0] = null; W.saveGame(false); W.play(0); W.closeModal(); W.clock.paused = true; W.render(); return [W.G.tier, W.G.cash]; })()` },
  { sleep: 600 },
  { touchEl: '[data-biz="bakery"]' }, { sleep: 300 }, { touchEl: '#openIt' }, { sleep: 1200 },
  { log: `[${T}.picking.d, ${T}.picking.lots.length > 3]` },
  { touchEl: '#mbanner [data-b="best"]' }, { sleep: 400 },
  { log: `[document.querySelector('#dialog .spot .st').textContent, ${T}.TY.locStars(${T}.TY.locOf('bakery', ${T}.G.inbox.length ? 'high' : 'high', 0).mult) >= 1]` },
  { touchEl: '#optBuy' }, { sleep: 200 },
  { log: "[document.getElementById('optBuy').classList.contains('sun'), document.getElementById('doOpen').textContent]" },
  { shot: 'ty-20-buy-land' },
  { touchEl: '#doOpen' }, { sleep: 900 },
  { log: `[${T}.G.biz[0].id, ${T}.TY.rentFor(${T}.G, ${T}.G.biz[0]), !!document.querySelector('#dialog .opt'), ${T}.TY.locStars(${T}.G.biz[0].loc) >= 4]` },
  { touchEl: '#dialog .opt[data-k="0"]' }, { touchEl: '#dialog .opt[data-k="1"]' }, { sleep: 150 },
  { log: "[...document.querySelectorAll('#dialog .opt')].map((o) => o.getAttribute('aria-pressed')).join(',')" },
  { touchEl: '#dialog .opt[data-k="2"]' }, { sleep: 150 },
  { log: "[...document.querySelectorAll('#dialog .opt')].map((o) => o.getAttribute('aria-pressed')).join(',')" },
  { touchEl: '#dialog .opt[data-k="0"]' }, { sleep: 150 },
  { log: "[...document.querySelectorAll('#dialog .opt')].map((o) => o.getAttribute('aria-pressed')).join(',')" },
  { shot: 'ty-21-two-picks' },
  { touchEl: '#decide' }, { sleep: 400 },
  { log: `[document.querySelectorAll('#dialog > .res').length, document.querySelectorAll('#dialog .bigstars span:not(.off)').length, ${T}.G.stats.cases]` },
  { shot: 'ty-22-two-results' },
  { touchEl: '#dialog [data-close]' }, { sleep: 200 },
  // an offer: read aloud, then the trap
  { eval: `(() => { const W = ${T}; W.save.settings.speak = true; const o = W.TY.OFFERS[0]; W.G.inbox.push({ key: 'o-test', kind: 'offer', id: o.id, arrived: W.G.month, due: W.G.month + 2 }); W.render(); return o.id; })()` },
  { touchEl: '#inboxBtn' }, { sleep: 300 },
  { log: "[!!document.querySelector('#dialog .opt'), document.querySelector('#dialog h2').textContent]" },
  { touchEl: '#sayIt' }, { sleep: 200 },
  { log: `${T}.Speech.said.slice(-1)[0].slice(0, 40)` },
  { eval: `(() => { const k = ${T}.TY.OFFERS[0].options.findIndex((o) => o.grade === 'trap'); document.querySelector('#dialog .opt[data-k="' + k + '"]').setAttribute('data-tap', '1'); return k; })()` },
  { touchEl: '#dialog .opt[data-tap]' }, { touchEl: '#decide' }, { sleep: 400 },
  { log: `[document.querySelector('#dialog h2').textContent, ${T}.G.stats.fell, ${T}.G.cash < 100000]` },
  { shot: 'ty-23-trap' },
  { touchEl: '#dialog [data-close]' }, { sleep: 200 },
  { touchEl: '#nextBtn' }, { sleep: 1100 },
  { log: "[...document.querySelectorAll('#dialog .word')].map((w) => w.textContent.slice(0, 60)).join(' | ')" },
  { shot: 'ty-24-report-words' },
  { touchEl: '#dialog [data-close]' }, { sleep: 200 },
  // the city fills up: months go by, others buy lots, land gets dearer
  { eval: `(() => { const W = ${T}, TY = W.TY, G = W.G; sessionStorage.setItem('free', TY.forSale(G, 'market').length); sessionStorage.setItem('land', TY.landValue(G, 'market', 0)); for (let m = 0; m < 24; m++) { G.inbox.filter((x) => x.kind !== 'rival').forEach((x) => TY.decide(G, x.key, [0])); TY.next(G); } W.render(); return [G.month, TY.forSale(G, 'market').length, TY.landValue(G, 'market', 0)]; })()` },
  { log: `[${T}.TY.forSale(${T}.G, 'market').length < +sessionStorage.getItem('free'), ${T}.TY.landValue(${T}.G, 'market', 0) > +sessionStorage.getItem('land'), ${T}.TY.forSale(${T}.G, 'market').length >= 4]` },
  // a rival opens next to the bakery: the morning banner, its case, its lot on the map
  { eval: `(() => { const W = ${T}, TY = W.TY, G = W.G; G.rivals.forEach((x) => { G.lot[x.d][x.i] = 0; }); G.rivals = []; G.inbox = G.inbox.filter((x) => x.kind !== 'rival'); let n = 0; while (!G.inbox.some((x) => x.kind === 'rival') && n < 160) { G.inbox.filter((x) => x.kind !== 'rival').forEach((x) => TY.decide(G, x.key, [0])); TY.next(G); n++; } W.clock.seen = new Set(G.inbox.filter((x) => x.kind !== 'rival').map((x) => x.key)); W.render(); W.clock.paused = false; W.clock.night = 0.05; return [n, G.rivals.map((x) => x.name + '@' + x.d + ':' + x.i).join(',')]; })()` },
  { sleep: 600 },
  { log: `[document.getElementById('mbanner').hidden, document.getElementById('mbanner').textContent.slice(0, 60), ${T}.clock.hold]` },
  { shot: 'ty-25-rival-banner' },
  { touchEl: '#mbanner [data-b="go"]' }, { sleep: 500 },
  { log: `[document.querySelector('#dialog h2').textContent, document.querySelectorAll('#dialog .opt').length]` },
  { eval: `(() => { const W = ${T}, c = W.TY.caseOf(W.G, W.G.inbox.find((x) => x.kind === 'rival')), k = c.options.findIndex((o) => o.grade === 'best'); document.querySelector('#dialog .opt[data-k="' + k + '"]').setAttribute('data-tap', '1'); return k; })()` },
  { touchEl: '#dialog .opt[data-tap]' }, { touchEl: '#decide' }, { sleep: 400 },
  { log: `[document.querySelector('#dialog h2').textContent, ${T}.G.rivals.find((x) => x.bid === 'bakery').shield, ${T}.TY.rivalCut(${T}.G, ${T}.G.biz.find((b) => b.id === 'bakery')) < 0.2]` },
  { touchEl: '#dialog [data-close]' }, { sleep: 300 },
  { eval: `(() => { const W = ${T}, x = W.G.rivals.find((y) => y.bid === 'bakery'); W.map.focus(x.d, x.i, 1.2); return x.d + ':' + x.i; })()` }, { sleep: 1500 },
  { touchAt: `(() => { const W = ${T}, x = W.G.rivals.find((y) => y.bid === 'bakery'), p = W.map.screenOfLot(x.d, x.i), r = document.getElementById('mapCv').getBoundingClientRect(); return [r.left + p[0], r.top + p[1] - 4]; })()` }, { sleep: 400 },
  { log: "[document.querySelector('#pbody h3').textContent.slice(0, 30), !!document.querySelector('#pbody .warnbox')]" },
  { shot: 'ty-26-rival-lot' },
  // phone: Next month on the first row with the menu
  { viewport: [390, 844, true, false, 3] }, { sleep: 500 },
  { log: "(() => { const a = document.getElementById('menuBtn').getBoundingClientRect(), b = document.getElementById('nextBtn').getBoundingClientRect(), c = document.getElementById('cashChip').getBoundingClientRect(); return [Math.abs(a.top - b.top) < 20, c.top > a.bottom - 4, Math.round(document.getElementById('mapCv').getBoundingClientRect().width)]; })()" },
  { shot: 'ty-27-phone-bar' },
  { log: 'JSON.stringify(window.__errs)' }
];
