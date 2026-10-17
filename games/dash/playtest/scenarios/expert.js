// The Expert pack in the game: the level menu shows it, and the autopilot (which answers every
// door right) finishes all ten levels with the game's own physics. Run from the repo root:
//   node games/dash/build.js && node games/dash/playtest/shoot.js games/dash/playtest/scenarios/expert.js
const ids = ['e01', 'e02', 'e03', 'e04', 'e05', 'e06', 'e07', 'e08', 'e09', 'e10'];
module.exports = [
  { viewport: [1280, 720, false, false] },
  { eval: "document.querySelector('[data-go=\"levels\"]').click(); 'menu'" }, { sleep: 800 },
  { eval: "document.querySelectorAll('.pack-head')[4].scrollIntoView(); document.querySelectorAll('.pack-head')[4].textContent" }, { sleep: 300 }, { shot: 'x01-expert-pack' },
  ...ids.flatMap((id, n) => [
    { eval: `window.__t.play('${id}'); window.__auto = true; '${id}'` },
    ...(n === 2 || n === 9 ? [{ waitFor: "window.__nd.game.p && window.__nd.game.p.x > 140", timeout: 60000 }, { shot: 'x0' + (n === 2 ? 2 : 3) + '-' + id }] : []),
    { waitFor: "window.__nd.game.state === 'done'", timeout: 150000 },
    { log: `['${id}', window.__nd.game.state, window.__nd.game.attempts]` }
  ]),
  { log: 'JSON.stringify(window.__errs)' }
];
