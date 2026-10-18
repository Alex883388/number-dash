// Tycoon Town: every business's three cases and every offer, opened in the real dialogs (run from the repo root):
//   node games/tycoon/build.js && ND_CDP=9523 ND_PROFILE=edge-profile-tycoon3 ND_URL=file:///D:/Github/number-dash/games/tycoon/dist/preview.html ND_READY='!!window.__tycoon' ND_BOT=none node games/dash/playtest/shoot.js games/tycoon/playtest/content.js
// On a phone and an iPad: each case and offer shows its story and every option without sideways overflow,
// a choice can be made and its result and the other choices are shown; every business card opens.
const T = 'window.__tycoon';
const sweep = (label) => `(async () => {
  const W = ${T}, TY = W.TY, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), bad = [];
  W.G = TY.newGame('Sweep', 9); W.G.cash = 1e9; W.G.tier = 4; W.render();
  let cases = 0, offers = 0, cards = 0;
  const check = (what) => {
    const d = document.getElementById('dialog'), r = d.getBoundingClientRect();
    if (r.right > innerWidth + 1 || r.left < -1) bad.push(what + ': dialog wider than the screen');
    d.querySelectorAll('.opt, .res, .story, h2').forEach((el) => { if (el.scrollWidth > el.clientWidth + 2) bad.push(what + ': text overflows ' + el.className); });
  };
  for (const r of TY.available()) {
    const dist = TY.districtOfTier(r.tier), i = W.G.plots[dist.id].findIndex((p) => !p.uid && !p.npc);
    W.aboutBiz(r.id); await sleep(30); check(r.id + ' card'); cards++; W.closeModal();
    const res = TY.open(W.G, r.id, dist.id, i, false);
    if (!res.ok) { bad.push(r.id + ': ' + res.why); continue; }
    const b = res.biz;
    for (let k = 0; k < 3; k++) {
      W.G.inbox = W.G.inbox.filter((x) => x.uid !== b.uid);
      W.G.inbox.push({ key: 'sweep-' + b.uid + '-' + k, kind: 'case', uid: b.uid, idx: k, arrived: W.G.month, due: W.G.month + 3 });
      W.openCase('sweep-' + b.uid + '-' + k); await sleep(20);
      const n = document.querySelectorAll('#dialog .opt').length;
      if (n < 4 || n > 5) bad.push(r.id + ' case ' + (k + 1) + ': ' + n + ' options');
      check(r.id + ' case ' + (k + 1));
      document.querySelector('#dialog .opt[data-k="' + (k % n) + '"]').click(); await sleep(10);
      document.getElementById('decide').click(); await sleep(20);
      if (!document.querySelector('#dialog .bigstars')) bad.push(r.id + ' case ' + (k + 1) + ': no result');
      check(r.id + ' result ' + (k + 1)); cases++;
      W.closeModal();
    }
  }
  for (const o of TY.OFFERS) {
    W.G.inbox.push({ key: 'sweep-o-' + o.id, kind: 'offer', id: o.id, arrived: W.G.month, due: W.G.month + 2 });
    W.openCase('sweep-o-' + o.id); await sleep(20); check(o.id);
    document.querySelector('#dialog .opt[data-k="0"]').click(); await sleep(10); document.getElementById('decide').click(); await sleep(20);
    if (!document.querySelector('#dialog .bigstars')) bad.push(o.id + ': no result');
    check(o.id + ' result'); offers++; W.closeModal();
  }
  return '${label}: ' + cards + ' business cards, ' + cases + ' cases, ' + offers + ' offers; problems ' + bad.length + (bad.length ? ': ' + bad.slice(0, 6).join(' | ') : '');
})()`;
module.exports = [
  { viewport: [390, 844, true, false, 3] },
  { eval: "localStorage.removeItem('tycoon-town.v1'); 'clean'" },
  { eval: sweep('phone') },
  { viewport: [1180, 820, true, false, 2] },
  { eval: sweep('iPad') },
  { eval: `(() => { const W = ${T}; W.render(); return [W.G.biz.length, W.G.stats.cases, W.G.stats.offers]; })()` },
  { shot: 'ty-30-all-businesses' },
  { log: 'JSON.stringify(window.__errs)' }
];
