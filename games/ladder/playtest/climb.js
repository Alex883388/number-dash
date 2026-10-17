// Number Ladder playtest (run from the repo root):
//   ND_URL=file:///D:/Github/number-dash/games/ladder/dist/preview.html ND_READY='!!window.__ladder' ND_BOT=none node games/dash/playtest/shoot.js games/ladder/playtest/climb.js
// A small bot taps when a jump right now would land in the middle of the right (or, to test
// falling, a wrong) answer. It climbs, pauses for a picture on the first rung of every moving
// trick, falls once on purpose from a spinning row, then climbs all 30 rungs.
const bot = `(() => {
  window.__lbot = { mode: 'right' };
  (function loop() {
    const L = window.__ladder, g = L.game;
    if (window.__lbot.mode !== 'off' && g.state === 'play' && g.cube.ground && g.row) {
      const p = L.predict();
      if (p.plat >= 0) {
        const pl = g.row.plats[p.plat], mid = p.x + 0.5;
        const inside = mid > p.px + 0.35 && mid < p.px + p.w - 0.35;
        if (inside && (window.__lbot.mode === 'right') === pl.correct) L.press();
      }
    }
    requestAnimationFrame(loop);
  })();
  return 'bot ready';
})()`;
const st = "(() => { const g = window.__ladder.game; return { state: g.state, rung: g.rung, falls: g.climbFalls, q: document.getElementById('question').textContent, best: window.__ladder.rec.best }; })()";
// stop the bot on the first moment of rung r, wait `ms`, take a picture, carry on
const pictureAt = (r, name, ms) => [
  { waitFor: `window.__ladder.game.row && window.__ladder.game.row.r === ${r} && window.__ladder.game.state === 'play'`, timeout: 200000 },
  { eval: "window.__lbot.mode = 'off'; 'hold'" }, { sleep: ms || 900 },
  { log: `[(window.__ladder.game.row || window.__ladder.game.oldRow).mo.kind, (window.__ladder.game.row || window.__ladder.game.oldRow).mo.spin || false, document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent]` },
  { shot: name },
  { eval: "window.__lbot.mode = 'right'; 'go'" }
];
module.exports = [
  { viewport: [1280, 800, false, false] },
  { sleep: 700 }, { shot: 'l01-home' },
  { eval: "document.getElementById('playBtn').click(); 'climb'" }, { sleep: 600 },
  { eval: bot },
  { sleep: 900 }, { shot: 'l02-rung-0-guide' },
  ...pictureAt(10, 'm10-sway'),
  ...pictureAt(13, 'm13-bob'),
  ...pictureAt(16, 'm16-spin', 1100),
  { waitFor: "window.__ladder.game.rung >= 16 && window.__ladder.game.state === 'play'", timeout: 120000 }, { log: st },
  { eval: "window.__lbot.mode = 'wrong'; 'aim wrong'" },
  { waitFor: "window.__ladder.game.state === 'wrong'", timeout: 30000 }, { shot: 'l05-wrong-landing' },
  { log: "(() => { const p = window.__ladder.game.wrongPlat; return [p.at.a, Math.abs(window.__ladder.game.cube.y - p.at.y) < 1e-6]; })()" },
  { waitFor: "window.__ladder.game.state === 'oops'", timeout: 30000 }, { log: st }, { sleep: 300 }, { shot: 'l06-oops' },
  { eval: "window.__lbot.mode = 'right'; 'aim right'" },
  { sleep: 1000 }, { eval: "window.__ladder.press(); 'continue'" },
  { waitFor: "window.__ladder.game.state === 'play' && window.__ladder.game.rung === 0", timeout: 10000 }, { log: st },
  ...pictureAt(19, 'm19-swap', 1700),
  ...pictureAt(22, 'm22-orbit'),
  ...pictureAt(25, 'm25-sway-spin', 1100),
  ...pictureAt(28, 'm28-orbit-spin', 1100),
  { waitFor: "window.__ladder.game.state === 'top'", timeout: 200000 }, { log: st }, { sleep: 2200 }, { shot: 'l08-top' },
  { log: "JSON.stringify(window.__ladder.rec)" }
];
