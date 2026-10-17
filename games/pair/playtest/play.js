// Pair Up playtest (run from the repo root):
//   node games/pair/build.js && ND_URL=file:///D:/Github/number-dash/games/pair/dist/preview.html ND_READY='!!window.__pair' ND_BOT=none node games/dash/playtest/shoot.js games/pair/playtest/play.js
// 1. every deck at every level deals full boards with no face shown twice and no two facts
//    sharing an answer (so a match is never ambiguous); 2. a bot with a perfect memory (it only
//    knows a card after turning it, and ignores the first look) clears boards; 3. finger taps
//    on an emulated iPad, portrait, a phone and dark mode with long words.
const deals = `(() => {
  const P = window.__pair, out = [], keepTricky = P.save.math.tricky;
  // a missed sum and a missed times fact from other games: each may only come back on its own kind of board
  P.save.math.tricky = [{ t: '48 + 16', a: 64 }, { t: '7 × 6', a: 42, f: [7, 6] }];
  let wrongKind = 0;
  for (let k = 0; k < 60; k++) {
    for (const p of P.dealPairs('times', 8)) if (/[+−]/.test(p.a.v)) wrongKind++;
    for (const p of P.dealPairs('plus', 8)) if (!/[+−]/.test(p.a.v)) wrongKind++;
  }
  out.push('wrong-kind cards: ' + wrongKind);
  P.save.math.tricky = keepTricky;
  for (const lv of ['starter', 'explorer', 'genius']) {
    P.save.settings.mathLevel = lv;
    for (const deck of ['times', 'plus', 'pics', 'opp', 'numw', 'mix']) {
      let bad = 0, short = 0;
      for (let k = 0; k < 40; k++) {
        const ps = P.dealPairs(deck, 12);
        if (ps.length < 12) { short++; continue; }
        const faces = ps.flatMap((p) => [p.a.v, p.b.v]);
        if (new Set(faces).size !== faces.length) bad++;
        const nums = ps.filter((p) => p.fact).map((p) => p.b.v);
        if (new Set(nums).size !== nums.length) bad++;
      }
      out.push(lv + '/' + deck + (bad || short ? ' BAD ' + bad + ' SHORT ' + short : ' ok'));
    }
  }
  P.save.settings.mathLevel = 'explorer';
  return out.join('  ');
})()`;
const bot = `window.__pbot = async function (forget) {
  const P = window.__pair, g = P.game, seen = new Map(), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  while (g.state !== 'play') await sleep(100);
  const look = (i) => { seen.set(i, g.cards[i].pair); };
  const tap = async (i) => { P.tap(i); look(i); await sleep(260); };
  for (let guard = 0; g.state !== 'done' && guard < 300; guard++) {
    if (g.state === 'wait') { await sleep(120); continue; }
    if (g.state !== 'play') { await sleep(100); continue; }
    if (forget) for (const i of [...seen.keys()]) if (Math.random() < forget) seen.delete(i);
    const open = [...seen.entries()].filter(([i]) => !g.cards[i].matched);
    let a = -1, b = -1;
    for (const [i, p] of open) { const j = open.find(([k, q]) => k !== i && q === p); if (j) { a = i; b = j[0]; break; } }
    if (a < 0) {
      const unknown = g.cards.map((c, i) => i).filter((i) => !g.cards[i].matched && !seen.has(i));
      a = unknown[0]; await tap(a);
      const mate = open.find(([k, q]) => q === g.cards[a].pair && k !== a);
      b = mate ? mate[0] : unknown.find((i) => i !== a);
      await tap(b);
    } else { await tap(a); await tap(b); }
    if (g.state === 'wait') await sleep(1200);
  }
  return { state: g.state, moves: g.moves, pairs: g.pairs.length, stars: P.starsFor(g.moves, g.pairs.length) };
}; 'bot ready'`;
const pickRadio = (name, v) => `(() => { const i = document.querySelector('input[name="${name}"][value="${v}"]'); i.checked = true; i.dispatchEvent(new Event('change', { bubbles: true })); return '${name}=${v}'; })()`;
module.exports = [
  { viewport: [1280, 800, false, false] },
  { sleep: 600 }, { shot: 'pair-01-home' },
  { eval: deals },
  { eval: bot },
  // a medium board of times facts, played by the bot
  { eval: pickRadio('deck', 'times') }, { eval: pickRadio('size', 'medium') },
  { eval: "document.getElementById('playBtn').click(); 'play'" },
  { sleep: 900 }, { shot: 'pair-02-peek' },
  { eval: 'window.__pbot(0)' },
  { sleep: 700 }, { shot: 'pair-03-done' },
  { log: "[document.getElementById('s-done').hidden, document.getElementById('doneStats').innerText.replace(/\\n+/g, ' '), JSON.stringify(window.__pair.rec.best)]" },
  // (star thresholds were set by a simulation of this bot with and without forgetting, not here)
  // iPad: real finger taps on a big word board
  { ipad: true },
  { viewport: [1180, 820, true, false, 2] },
  { reload: true }, { sleep: 600 },
  { eval: pickRadio('deck', 'pics') }, { eval: pickRadio('size', 'big') },
  { touchEl: '#playBtn' }, { sleep: 1200 }, { shot: 'pair-04-ipad-peek' },
  { waitFor: "window.__pair.game.state === 'play'", timeout: 9000 }, { sleep: 500 },
  { touchEl: '.pc[data-i="0"]' }, { sleep: 400 },
  { eval: "(() => { const g = window.__pair.game, p = g.cards[0].pair, j = g.cards.findIndex((c, i) => i > 0 && c.pair === p); window.__mate = j; return 'mate ' + j; })()" },
  { eval: "(() => { const r = document.querySelector('.pc[data-i=\"' + window.__mate + '\"]').getBoundingClientRect(); window.__mateXY = [r.left + r.width / 2, r.top + r.height / 2]; return window.__mateXY.map(Math.round); })()" },
  { touchEl: '.pc[data-i="5"]' }, { sleep: 300 }, { shot: 'pair-05-ipad-two-up' },
  { sleep: 1300 },
  { touchEl: '.pc[data-i="0"]' }, { sleep: 350 },
  { eval: "(() => { document.querySelector('.pc[data-i=\"' + window.__mate + '\"]').setAttribute('id', 'mateCard'); return 'tagged'; })()" },
  { touchEl: '#mateCard' }, { sleep: 500 },
  { log: "[window.__pair.game.found, window.__pair.game.moves, document.getElementById('status').textContent, window.__pair.Speech.said.slice(-3).join(' | ')]" },
  { shot: 'pair-06-ipad-pair-found' },
  { log: "[getComputedStyle(document.querySelector('.pc')).width, getComputedStyle(document.querySelector('.pc')).height, document.documentElement.scrollHeight <= innerHeight]" },
  // portrait iPad and a phone with long words
  { viewport: [820, 1180, true, false, 2] }, { sleep: 500 }, { shot: 'pair-07-ipad-portrait' },
  { eval: "window.__pair.save.settings.mathLevel = 'genius'; window.__pair.rec.deck = 'numw'; window.__pair.start(); 'numw genius'" },
  { viewport: [390, 844, true, false, 3] }, { sleep: 900 }, { shot: 'pair-08-phone-numw' },
  { eval: "window.__pair.rec.deck = 'opp'; window.__pair.start(); 'opp genius'" },
  { viewport: [1180, 820, true, true, 2] }, { sleep: 900 }, { shot: 'pair-09-dark-opp' },
  { log: "(() => { const over = [...document.querySelectorAll('.pc .v')].filter((v) => v.scrollWidth > v.parentElement.clientWidth + 1 || v.scrollHeight > v.parentElement.clientHeight + 1).map((v) => v.textContent); return over.length ? 'OVERFLOW ' + over.join(',') : 'all card text fits'; })()" },
  { eval: "window.__pair.save.settings.mathLevel = 'explorer'; 'reset level'" },
  { log: 'JSON.stringify(window.__errs)' }
];
