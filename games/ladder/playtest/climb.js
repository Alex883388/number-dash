// Number Ladder playtest (run from the repo root):
//   ND_SERVE=../../docs ND_PATH=ladder/ ND_READY='!!window.__ladder' ND_BOT=none node games/dash/playtest/shoot.js games/ladder/playtest/climb.js
// A small bot taps when a jump right now would land in the middle of the right (or, to test
// falling, a wrong) answer: it climbs, falls once on purpose, then climbs all 30 rungs.
const bot = `(() => {
  window.__lbot = { mode: 'right' };
  (function loop() {
    const L = window.__ladder, g = L.game;
    if (window.__lbot.mode !== 'off' && g.state === 'play' && g.cube.ground && g.row) {
      const p = L.predict();
      if (p.plat >= 0) {
        const pl = g.row.plats[p.plat], mid = p.x + 0.5;
        const inside = mid > p.px + 0.35 && mid < p.px + pl.w - 0.35;
        if (inside && (window.__lbot.mode === 'right') === pl.correct) L.press();
      }
    }
    requestAnimationFrame(loop);
  })();
  return 'bot ready';
})()`;
const st = "(() => { const g = window.__ladder.game; return { state: g.state, rung: g.rung, falls: g.climbFalls, q: document.getElementById('question').textContent, best: window.__ladder.rec.best }; })()";
module.exports = [
  { viewport: [1280, 800, false, false] },
  { sleep: 700 }, { shot: 'l01-home' },
  { eval: "document.getElementById('playBtn').click(); 'climb'" }, { sleep: 600 },
  { eval: bot },
  { sleep: 900 }, { shot: 'l02-rung-0-guide' },
  { waitFor: "window.__ladder.game.rung >= 4 && window.__ladder.game.state === 'play'", timeout: 60000 }, { log: st }, { shot: 'l03-rung-4' },
  { waitFor: "window.__ladder.game.rung >= 15 && window.__ladder.game.state === 'play'", timeout: 120000 }, { log: st }, { sleep: 400 }, { shot: 'l04-rung-15-sway' },
  { eval: "window.__lbot.mode = 'wrong'; 'aim wrong'" },
  { waitFor: "window.__ladder.game.state === 'falling'", timeout: 30000 }, { sleep: 300 }, { shot: 'l05-falling' },
  { waitFor: "window.__ladder.game.state === 'oops'", timeout: 30000 }, { log: st }, { sleep: 300 }, { shot: 'l06-oops' },
  { eval: "window.__lbot.mode = 'right'; 'aim right'" },
  { sleep: 1000 }, { eval: "window.__ladder.press(); 'continue'" },
  { waitFor: "window.__ladder.game.state === 'play' && window.__ladder.game.rung === 0", timeout: 10000 }, { log: st },
  { waitFor: "window.__ladder.game.rung >= 24 && window.__ladder.game.state === 'play'", timeout: 200000 }, { log: st }, { sleep: 300 }, { shot: 'l07-rung-24-night' },
  { waitFor: "window.__ladder.game.state === 'top'", timeout: 200000 }, { log: st }, { sleep: 2200 }, { shot: 'l08-top' },
  { log: "JSON.stringify(window.__ladder.rec)" }
];
