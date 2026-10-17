// Number Ladder in English mode (run from the repo root):
//   node games/ladder/build.js && ND_CDP=9411 ND_PROFILE=edge-profile-ladder-en ND_URL=file:///D:/Github/number-dash/games/ladder/dist/preview.html ND_READY='!!window.__ladder' ND_BOT=none node games/dash/playtest/shoot.js games/ladder/playtest/english.js
// 1. 3,000 generated English questions at every level and tier: one right answer, all options
//    different, the asked word never offered; 2. the bot climbs all 30 rungs in English mode, with
//    pictures low, middle and high (long words on narrow platforms); 3. Both mode mixes the two.
const bot = `(() => {
  window.__lbot = { mode: 'right' };
  (function loop() {
    const L = window.__ladder, g = L.game;
    if (window.__lbot.mode !== 'off' && g.state === 'play' && g.cube.ground && g.row) {
      const p = L.predict();
      if (p.plat >= 0) { const pl = g.row.plats[p.plat], mid = p.x + 0.5; if (mid > p.px + 0.35 && mid < p.px + p.w - 0.35 && pl.correct) L.press(); }
    }
    requestAnimationFrame(loop);
  })();
  return 'bot ready';
})()`;
const check = `(() => {
  const L = window.__ladder, bad = [], kinds = {};
  for (const lv of ['starter', 'explorer', 'genius']) {
    L.save.settings.mathLevel = lv;
    for (let k = 0; k < 1000; k++) {
      const r = 1 + (k % 30), n = r <= 8 ? 2 : r <= 18 ? 3 : 4, q = L.ladderQuestion(r, n);
      kinds[q.raw.kind] = (kinds[q.raw.kind] || 0) + 1;
      const asked = (q.text.match(/(?:of|as|One) (\\S+?)[,:]/) || [])[1];
      if (q.choices.length !== n || new Set(q.choices).size !== n || q.choices.filter((c) => c === q.answer).length !== 1 || q.choices[q.correct] !== q.answer || q.choices.includes(asked) || q.text.indexOf('?') < 0) bad.push(q.text + ' -> ' + q.choices.join('/'));
    }
  }
  L.save.settings.mathLevel = 'explorer';
  return { bad: bad.slice(0, 5), badCount: bad.length, kinds: kinds };
})()`;
module.exports = [
  { viewport: [1280, 800, false, false] },
  { eval: "window.__ladder.rec.subject = 'english'; 'english'" },
  { eval: check },
  { eval: "document.querySelector('input[name=subject][value=english]').checked" },
  { eval: "document.getElementById('playBtn').click(); 'climb'" }, { sleep: 600 }, { eval: bot },
  { sleep: 900 }, { shot: 'len-01-rung1' },
  { log: "document.getElementById('question').textContent" },
  { waitFor: "window.__ladder.game.rung >= 14 && window.__ladder.game.state === 'play' && !!window.__ladder.game.row", timeout: 120000 }, { eval: "window.__lbot.mode = 'off'; 'hold'" }, { sleep: 700 }, { shot: 'len-02-rung15' },
  { log: "[document.getElementById('question').textContent, (window.__ladder.game.row || window.__ladder.game.oldRow).plats.map((p) => p.val).join(' / ')]" }, { eval: "window.__lbot.mode = 'right'; 'go'" },
  { waitFor: "window.__ladder.game.rung >= 26 && window.__ladder.game.state === 'play' && !!window.__ladder.game.row", timeout: 200000 }, { eval: "window.__lbot.mode = 'off'; 'hold'" }, { sleep: 700 }, { shot: 'len-03-rung27' },
  { log: "[document.getElementById('question').textContent, (window.__ladder.game.row || window.__ladder.game.oldRow).plats.map((p) => p.val).join(' / ')]" }, { eval: "window.__lbot.mode = 'right'; 'go'" },
  { waitFor: "window.__ladder.game.state === 'top'", timeout: 200000 },
  { log: "[window.__ladder.game.rung, JSON.stringify(window.__ladder.save.math.right)]" },
  // a wrong English answer: the Whoops card shows the right word
  { eval: "document.getElementById('againBtn').click(); window.__lbot.mode = 'off'; 'again'" }, { sleep: 800 },
  { eval: "(() => { const L = window.__ladder, g = L.game; g.row.plats.forEach((p) => { if (p.correct) p.state = 'gone'; }); return 'only wrong blocks left'; })()" },
  { eval: "window.__lbot.mode = 'wrongonly'; (function loop() { const L = window.__ladder, g = L.game; if (g.state === 'play' && g.cube.ground && g.row) { const p = L.predict(); if (p.plat >= 0) L.press(); } if (g.state === 'play') requestAnimationFrame(loop); })(); 'aim'" },
  { waitFor: "window.__ladder.game.state === 'oops'", timeout: 30000 }, { sleep: 400 }, { shot: 'len-04-oops' },
  { log: "document.getElementById('oopsFact').textContent" },
  // Both mode mixes math and English
  { eval: "(() => { const L = window.__ladder; L.rec.subject = 'both'; let en = 0; for (let k = 0; k < 400; k++) if (L.ladderQuestion(12, 3).raw.english) en++; L.rec.subject = 'math'; return 'both: ' + en + ' of 400 English'; })()" },
  { log: 'JSON.stringify(window.__errs)' }
];
