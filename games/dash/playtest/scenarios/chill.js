// The Chill pack in the game: the level menu shows it, and the autopilot (which answers every
// door right) finishes all ten levels with the game's own physics. The slow tempos cover less track per
// frame, so the autopilot looks further ahead here (window.__botH), as in expert-hard3.js. Its deep search is heavy:
// run this with nothing else busy, or a starved frame can cost it a try. Run from the repo root:
//   node games/dash/build.js && node games/dash/playtest/shoot.js games/dash/playtest/scenarios/chill.js
const ids = ['c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c07', 'c08', 'c09', 'c10'];
module.exports = [
  { viewport: [1280, 720, false, false] },
  { eval: "window.__botH = 220; window.__botCap = 320; 'deep look-ahead'" },
  { eval: "document.querySelector('[data-go=\"levels\"]').click(); 'menu'" }, { sleep: 800 },
  { eval: "document.querySelectorAll('.pack-head')[1].scrollIntoView(); document.querySelectorAll('.pack-head')[1].textContent" }, { sleep: 300 }, { shot: 'k01-chill-pack' },
  ...ids.flatMap((id, n) => [
    { eval: `window.__t.play('${id}'); window.__auto = true; '${id}'` },
    ...(n === 2 || n === 9 ? [{ waitFor: "window.__nd.game.p && window.__nd.game.p.x > 140", timeout: 60000 }, { shot: 'k0' + (n === 2 ? 2 : 3) + '-' + id }] : []),
    { waitFor: "window.__nd.game.state === 'done'", timeout: 400000 },
    { log: `['${id}', window.__nd.game.state, window.__nd.game.attempts]` }
  ]),
  { log: 'JSON.stringify(window.__errs)' }
];
