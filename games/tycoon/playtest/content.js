// Tycoon Town: every business's three cases, every offer and every rival case, opened in the real dialogs (run from
// the repo root):
//   node games/tycoon/build.js && ND_CDP=9523 ND_PROFILE=edge-profile-tycoon3 ND_URL=file:///D:/Github/number-dash/games/tycoon/dist/preview.html ND_READY='!!window.__tycoon' ND_BOT=none node games/dash/playtest/shoot.js games/tycoon/playtest/content.js
// On a phone and an iPad: each case and offer shows its story and every option without sideways overflow, a choice
// can be made and its result and the other choices are shown; every business card and its spot box open; every
// business stands on the map (its building is painted without errors); the rival cases fill in their names.
const T = 'window.__tycoon';
const sweep = (label) => `(async () => {
  const W = ${T}, TY = W.TY, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), bad = [];
  W.G = TY.newGame('Sweep', 9); W.G.cash = 1e9; W.G.tier = 4; W.G.logo = '🦊'; W.enterGame(); W.closeModal(); W.clock.paused = true;
  let cases = 0, offers = 0, cards = 0, rivals = 0;
  const check = (what) => {
    const d = document.getElementById('dialog'), r = d.getBoundingClientRect();
    if (r.right > innerWidth + 1 || r.left < -1) bad.push(what + ': dialog wider than the screen');
    d.querySelectorAll('.opt, .res, .story, h2, .spot').forEach((el) => { if (el.scrollWidth > el.clientWidth + 2) bad.push(what + ': text overflows ' + el.className); });
    if (/\\{(rival|biz|where)\\}|undefined|NaN/.test(d.textContent)) bad.push(what + ': a gap in the words');
  };
  const decideFirst = async (what) => {
    const n = document.querySelectorAll('#dialog .opt').length;
    if (n < 4 || n > 5) bad.push(what + ': ' + n + ' options');
    check(what);
    document.querySelector('#dialog .opt[data-k="0"]').click(); await sleep(10);
    document.getElementById('decide').click(); await sleep(20);
    if (!document.querySelector('#dialog .bigstars')) bad.push(what + ': no result');
    check(what + ' result'); W.closeModal();
  };
  for (const r of TY.available()) {
    const d = TY.districtOfTier(r.tier).id, free = TY.freeLots(W.G, d).filter((i) => !r.needs || (TY.featOf(d, i)[r.needs] || 0) >= 1).sort((a, b) => (r.needs ? 0 : (TY.featOf(d, a).harbour || 0) - (TY.featOf(d, b).harbour || 0)));
    W.aboutBiz(r.id); await sleep(30); check(r.id + ' card'); cards++; W.closeModal();
    if (!free.length) { bad.push(r.id + ': no lot for it'); continue; }
    W.openWizard(r.id, d, free[0]); await sleep(20); check(r.id + ' spot'); W.closeModal();
    const res = TY.open(W.G, r.id, d, free[0], false);
    if (!res.ok) { bad.push(r.id + ': ' + res.why); continue; }
    const b = res.biz;
    for (let k = 0; k < 3; k++) {
      W.G.inbox = W.G.inbox.filter((x) => x.uid !== b.uid);
      W.G.inbox.push({ key: 'sweep-' + b.uid + '-' + k, kind: 'case', uid: b.uid, idx: k, arrived: W.G.month, due: W.G.month + 3 });
      W.openCase('sweep-' + b.uid + '-' + k); await sleep(20);
      await decideFirst(r.id + ' case ' + (k + 1)); cases++;
    }
  }
  // a rival for one business of each kind: the five rival cases
  const kinds = {};
  W.G.biz.forEach((b) => { const r = TY.biz(b.id), k = r.kind === 'property' ? 'property' : r.tier >= 3 ? 'big' : r.industry === 'food' ? 'food' : ['services', 'education', 'fitness'].includes(r.industry) ? 'service' : 'shop'; if (!kinds[k]) kinds[k] = b; });
  for (const k in kinds) {
    const b = kinds[k], [d, si] = b.plot.split(':'), tpl = TY.RIVALS.cases.findIndex((c) => c.for === k), j = TY.forSale(W.G, d)[0];
    const x = { id: 900 + rivals, uid: b.uid, bid: b.id, name: TY.RIVALS.names[b.id][1], d: d, i: j, since: W.G.month, cut: 0.2, shield: 0, where: 'just across the street' };
    W.G.rivals.push(x); W.G.inbox.push({ key: 'sweep-v' + x.id, kind: 'rival', rid: x.id, uid: b.uid, tpl: tpl, arrived: W.G.month, due: W.G.month + 3 });
    W.openCase('sweep-v' + x.id); await sleep(20);
    if (!document.querySelector('#dialog .story').textContent.includes(x.name)) bad.push(k + ' rival: name missing');
    await decideFirst('rival ' + k); rivals++;
  }
  for (const o of TY.OFFERS) {
    W.G.inbox.push({ key: 'sweep-o-' + o.id, kind: 'offer', id: o.id, arrived: W.G.month, due: W.G.month + 2 });
    W.openCase('sweep-o-' + o.id); await sleep(20); check(o.id);
    document.querySelector('#dialog .opt[data-k="0"]').click(); await sleep(10); document.getElementById('decide').click(); await sleep(20);
    if (!document.querySelector('#dialog .bigstars')) bad.push(o.id + ': no result');
    check(o.id + ' result'); offers++; W.closeModal();
  }
  W.render(); W.map.whole(); await sleep(1500);
  return '${label}: ' + cards + ' business cards, ' + cases + ' cases, ' + rivals + ' rival cases, ' + offers + ' offers; problems ' + bad.length + (bad.length ? ': ' + bad.slice(0, 6).join(' | ') : '');
})()`;
module.exports = [
  { viewport: [390, 844, true, false, 3] },
  { eval: "localStorage.removeItem('tycoon-town.v1'); 'clean'" },
  { eval: sweep('phone') },
  { viewport: [1180, 820, true, false, 2] },
  { eval: sweep('iPad') },
  { eval: `(() => { const W = ${T}; return [W.G.biz.length, W.G.stats.cases, W.G.stats.offers]; })()` },
  { shot: 'ty-30-all-businesses' },
  { eval: `(() => { ${T}.map.focus('skyline', null, 0.8); return 1; })()` }, { sleep: 2000 },
  { shot: 'ty-31-skyline-businesses' },
  { eval: `(() => { ${T}.map.focus('downtown', null, 0.8); return 1; })()` }, { sleep: 2000 },
  { shot: 'ty-32-downtown-businesses' },
  { log: 'JSON.stringify(window.__errs)' }
];
