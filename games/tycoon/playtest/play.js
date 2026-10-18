// Tycoon Town by finger on an emulated iPad (run from the repo root):
//   node games/tycoon/build.js && ND_CDP=9521 ND_PROFILE=edge-profile-tycoon ND_URL=file:///D:/Github/number-dash/games/tycoon/dist/preview.html ND_READY='!!window.__tycoon' ND_BOT=none node games/dash/playtest/shoot.js games/tycoon/playtest/play.js
// A new company, the first business opened on a chosen plot, its opening case decided, months played with
// reports, land bought, a loan taken and repaid, every panel, then save and resume: a reload brings the
// same game back, and a save code moved into another slot restores it too. Opening the page saves nothing.
const T = 'window.__tycoon';
const fits = "(() => { const d = document.scrollingElement; return [d.scrollHeight <= innerHeight + 1, d.scrollWidth <= innerWidth + 1]; })()";
module.exports = [
  { viewport: [1180, 820, true, false, 2] },
  { eval: "localStorage.removeItem('tycoon-town.v1'); localStorage.removeItem('arcade-days.v1'); location.reload(); 'fresh'" }, { sleep: 1200 },
  { log: "[localStorage.getItem('tycoon-town.v1'), localStorage.getItem('arcade-days.v1'), document.querySelectorAll('#slots .slot.empty').length]" },
  { shot: 'ty-01-home' },
  { touchEl: '[data-new="0"]' }, { sleep: 400 },
  { touchEl: '#nameIdeas [data-name]' }, { touchEl: '[data-logo="🦁"]' }, { sleep: 200 }, { shot: 'ty-02-new' },
  { touchEl: '#newGo' }, { sleep: 700 },
  { log: `[${T}.G.name, ${T}.G.logo, ${T}.G.cash, document.getElementById('game').hidden, !!document.querySelector('#dialog h2')]` },
  { shot: 'ty-03-welcome' },
  { touchEl: '#dialog [data-close]' }, { sleep: 300 },
  { log: fits }, { shot: 'ty-04-city' },
  // open the lemonade stand from Invest, on a chosen plot, renting it
  { touchEl: '[data-biz="lemonade"]' }, { sleep: 400 }, { shot: 'ty-05-about' },
  { touchEl: '#openIt' }, { sleep: 400 },
  { eval: `(() => { const b = [...document.querySelectorAll('#dialog .minigrid button.free')]; b[b.length - 1].setAttribute('data-tap', '1'); return b.length; })()` },
  { touchEl: '#dialog .minigrid [data-tap]' }, { sleep: 200 }, { shot: 'ty-06-where' },
  { touchEl: '#doOpen' }, { sleep: 1200 },
  { log: `[${T}.G.biz.length, ${T}.G.cash, ${T}.G.inbox.length, !!document.querySelector('#dialog .opt')]` },
  { shot: 'ty-07-case' },
  { touchEl: '#dialog .opt[data-k="0"]' }, { sleep: 150 },
  { log: "[document.querySelector('#dialog .opt[data-k=\"0\"]').getAttribute('aria-pressed'), document.getElementById('decide').disabled]" },
  { touchEl: '#decide' }, { sleep: 500 },
  { log: `[document.querySelector('#dialog h2').textContent, document.querySelectorAll('#dialog .bigstars span:not(.off)').length, ${T}.G.stats.cases, ${T}.G.stats.stars]` },
  { shot: 'ty-08-result' },
  { touchEl: '#dialog [data-close]' }, { sleep: 300 },
  // a month passes: the report
  { touchEl: '#nextBtn' }, { sleep: 600 },
  { log: `[${T}.G.month, !!document.querySelector('#dialog .rep-line'), localStorage.getItem('arcade-days.v1') !== null, JSON.parse(localStorage.getItem('tycoon-town.v1')).slots[0].month]` },
  { shot: 'ty-09-report' },
  { touchEl: '#dialog [data-close]' }, { sleep: 300 },
  // play a year quickly, deciding every case with its first option
  { eval: `(() => { const W = ${T}, TY = W.TY; for (let m = 0; m < 12; m++) { W.G.inbox.slice().forEach((x) => TY.decide(W.G, x.key, [0])); TY.next(W.G); } W.saveGame(true); W.render(); return [W.G.month, Math.round(W.G.cash), TY.netWorth(W.G), W.G.biz.length]; })()` },
  { shot: 'ty-10-year' },
  // tap the stand's plot: its panel; buy the land under it
  { eval: `(() => { const b = ${T}.G.biz[0]; const i = +b.plot.split(':')[1]; document.querySelector('#plots .plot[data-i="' + i + '"]').setAttribute('data-tap', '1'); return i; })()` },
  { touchEl: '#plots [data-tap]' }, { sleep: 300 }, { shot: 'ty-11-plot' },
  { log: "[document.querySelector('#pbody h3').textContent, !!document.getElementById('sellBiz'), !!document.getElementById('buyUnder')]" },
  { eval: `(() => { ${T}.G.cash += 1000; ${T}.render(); return 'cash for the land'; })()` },
  { touchEl: '#buyUnder' }, { sleep: 300 },
  { log: `[${T}.G.plots.market[+${T}.G.biz[0].plot.split(':')[1]].land, ${T}.TY.rentFor(${T}.G, ${T}.G.biz[0])]` },
  // the bank: borrow, then repay all
  { touchEl: '#backTabs' }, { touchEl: '#ptabs [data-tab="bank"]' }, { sleep: 200 }, { shot: 'ty-12-bank' },
  { touchEl: '#pbody [data-borrow]' }, { sleep: 200 },
  { log: `[${T}.G.loan > 0, ${T}.G.handbook.loan > 0]` },
  { eval: `(() => { const b = [...document.querySelectorAll('#pbody [data-repay]')]; b[b.length - 1].setAttribute('data-tap', '1'); return b.length; })()` },
  { touchEl: '#pbody [data-repay][data-tap]' }, { sleep: 200 },
  { log: `[${T}.G.loan, ${T}.G.stats.loanPaid]` },
  { touchEl: '#ptabs [data-tab="goals"]' }, { sleep: 200 }, { shot: 'ty-13-goals' },
  { touchEl: '#ptabs [data-tab="ceo"]' }, { sleep: 200 }, { shot: 'ty-14-ceo' },
  { touchEl: '#ptabs [data-tab="company"]' }, { sleep: 200 }, { shot: 'ty-15-company' },
  // save and resume: reload, Continue brings back the same game
  { eval: `sessionStorage.setItem('before', JSON.stringify(${T}.G)); location.reload(); 'reload'` }, { sleep: 1500 },
  { log: "[document.querySelector('#slots .slot b').textContent, document.querySelector('#slots [data-play=\"0\"]').textContent]" },
  { touchEl: '[data-play="0"]' }, { sleep: 600 },
  { log: `[JSON.stringify(${T}.G) === sessionStorage.getItem('before'), ${T}.G.month]` },
  // a save code into slot 2, then back out: the same company
  { eval: `(() => { const W = ${T}; const code = W.codeOf(W.rec.slots[0]); const x = W.slotFrom(code); return [code.slice(0, 8), code.length, !!x, x && x.game.month === W.G.month, W.slotFrom('rubbish') === null]; })()` },
  { log: fits },
  // portrait iPad and a phone, dark
  { viewport: [820, 1180, true, false, 2] }, { sleep: 500 }, { log: fits }, { shot: 'ty-16-portrait' },
  { viewport: [390, 844, true, true, 3] }, { sleep: 500 }, { log: fits }, { shot: 'ty-17-phone-dark' },
  { log: "(() => { const g = document.getElementById('plots').getBoundingClientRect(); return [Math.round(g.width), Math.round(g.height), [...document.querySelectorAll('#plots .plot')].every((p) => p.getBoundingClientRect().width >= 40)]; })()" },
  { touchEl: '#inboxBtn' }, { sleep: 300 }, { shot: 'ty-18-phone-inbox' },
  { log: 'JSON.stringify(window.__errs)' }
];
