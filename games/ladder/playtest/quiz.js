// Number Ladder in Quiz mode (run from the repo root):
//   node games/ladder/build.js && ND_CDP=9411 ND_PROFILE=edge-profile-ladder-en ND_URL=file:///D:/Github/number-dash/games/ladder/dist/preview.html ND_READY='!!window.__ladder' ND_BOT=none node games/dash/playtest/shoot.js games/ladder/playtest/quiz.js
// 1. 3,000 quiz questions at every level: n different options, exactly one right; Mixed mode uses all
//    three kinds; 2. the bot climbs to rung 12 in Quiz mode; 3. a long question wraps neatly on a phone.
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
  L.rec.subject = 'quiz';
  for (const lv of ['starter', 'explorer', 'genius']) {
    L.save.settings.mathLevel = lv;
    for (let k = 0; k < 1000; k++) {
      const r = 1 + (k % 30), n = r <= 8 ? 2 : r <= 18 ? 3 : 4, q = L.ladderQuestion(r, n);
      kinds[q.raw.kind] = (kinds[q.raw.kind] || 0) + 1;
      if (q.choices.length !== n || new Set(q.choices).size !== n || q.choices.filter((c) => c === q.answer).length !== 1 || q.choices[q.correct] !== q.answer || q.text.indexOf('?') < 0) bad.push(q.text + ' -> ' + q.choices.join('/'));
    }
  }
  L.rec.subject = 'mixed'; const mix = { math: 0, english: 0, quiz: 0 };
  for (let k = 0; k < 600; k++) { const q = L.ladderQuestion(12, 3); mix[q.raw.quiz ? 'quiz' : q.raw.english ? 'english' : 'math']++; }
  L.rec.subject = 'quiz'; L.save.settings.mathLevel = 'explorer';
  return { badCount: bad.length, bad: bad.slice(0, 4), kinds: kinds, mixed: mix };
})()`;
module.exports = [
  { viewport: [1280, 800, false, false] },
  { eval: check },
  { eval: "document.getElementById('playBtn').click(); 'climb'" }, { sleep: 600 }, { eval: bot },
  { waitFor: "window.__ladder.game.rung >= 12 && window.__ladder.game.state === 'play' && !!window.__ladder.game.row", timeout: 150000 },
  { eval: "window.__lbot.mode = 'off'; 'hold'" }, { sleep: 600 }, { shot: 'lquiz-01-rung12' },
  { log: "document.getElementById('question').textContent" },
  // a long question on a phone
  { viewport: [390, 844, true, false, 3] },
  { eval: "(() => { const b = document.getElementById('question'); b.classList.add('long'); b.textContent = 'Solid, liquid and gas are states of: ?'; return 'long question shown'; })()" },
  { sleep: 400 }, { shot: 'lquiz-02-phone-long' },
  { log: "(() => { const r = document.getElementById('question').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), innerWidth, Math.round(r.height)]; })()" },
  { log: 'JSON.stringify(window.__errs)' }
];
