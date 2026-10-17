// Expert levels played with a longer autopilot look-ahead (the two that needed it were regenerated
// until this cleared them; window.__botH sets the look-ahead): proof in the game itself.
//   node games/dash/playtest/shoot.js games/dash/playtest/scenarios/expert-hard3.js
const ids = ['e02', 'e08'];
module.exports = [
  { viewport: [1280, 720, false, false] },
  { eval: "window.__botH = 220; window.__botCap = 320; 'deep look-ahead'" },
  ...ids.flatMap((id) => [
    { eval: `window.__t.play('${id}'); window.__auto = true; '${id}'` },
    { waitFor: "window.__nd.game.state === 'done'", timeout: 400000 },
    { log: `['${id}', window.__nd.game.state, window.__nd.game.attempts]` }
  ]),
  { log: 'JSON.stringify(window.__errs)' }
];
