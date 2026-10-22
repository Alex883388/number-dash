// The live site: the arcade home shows Family Fighters, the game opens from its card, and place 1 plays (the autopilot)
// to its first question gate. Use a fresh browser profile so no old offline cache gets in the way:
//   ND_URL=https://alex883388.github.io/number-dash/ ND_PROFILE=edge-profile-ff-live-$RANDOM ND_READY="!!document.querySelector('.games')" ND_BOT=none node games/dash/playtest/shoot.js games/family/playtest/live.js
const F = 'window.__family';
module.exports = [
  { viewport: [1180, 820, true, false, 1] },
  { log: "!!document.querySelector('a.game[href=\"family/\"]') + ' ' + document.getElementById('familyMeta').textContent" },
  { eval: "document.querySelector('a.game[href=\"family/\"]').click(); 'open'" },
  { waitFor: '!!window.__family', timeout: 30000 },
  { sleep: 800 },
  { log: `location.pathname + ' places ' + ${F}.LEVELS.length + ' world ' + ${F}.WORLD.map((w) => w.length).join('/') + ' words ' + ${F}.WORDS.map((w) => w.length).join('/')` },
  { shot: 'ff-live-home' },
  // the headless browser sends a lost-focus event after the page changes, which pauses the game (as switching apps
  // should): stop those reaching the game here, as the runner does on the first page
  { eval: "window.__errs = []; window.addEventListener('error', (e) => window.__errs.push(String(e.message))); window.addEventListener('blur', (e) => e.stopImmediatePropagation(), true); window.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true); 'guards'" },
  { eval: `${F}.showPick(); ${F}.auto({ right: 0.9, react: 0.2, dodge: 0.8 }); ${F}.startLocal(1, 0); 'go'` },
  { sleep: 3000 },
  { log: `'paused ' + ${F}.G.paused + ' mode ' + ${F}.G.mode + ' x ' + Math.round(${F}.G.S.players[0].x)` },
  { waitFor: `${F}.G.S && ${F}.G.S.gate && !${F}.G.S.gate.open`, timeout: 120000 },
  { sleep: 1500 },
  { log: `document.getElementById('qKind').textContent + ': ' + document.getElementById('qText').textContent + ' [' + ${F}.G.S.gate.drums.map((d) => d.text).join(' / ') + ']'` },
  { shot: 'ff-live-gate' },
  { log: "JSON.stringify(window.__errs || [])" }
];
