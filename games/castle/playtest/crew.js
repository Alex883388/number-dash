// Castle Crew with two players (run from the repo root):
//   node games/castle/build.js && ND_CDP=9542 ND_PROFILE=edge-profile-castle2 ND_HTTP=5642 ND_SERVE=../castle/dist ND_PATH=preview.html ND_READY='!!window.__castle' ND_BOT=none node games/dash/playtest/shoot.js games/castle/playtest/crew.js
// The page hosts a crew game; a second copy of the game in a frame (a friend's phone, held sideways) joins with the
// room code over the same-browser link, which carries exactly the messages the internet link carries. Checks: the
// lobby shows both, with the weapon each picked; the host's map and difficulty reach the friend; the game starts on
// both; the friend walks and the host sees it; the friend builds a tower with its own coins and both see it; the
// friend starts round 1; the friend's copy shows the zombies the host has; after the round the friend upgrades its
// tower and changes its aim; the host's computer player plays on; the friend leaves and the crew is one again.
const C = 'window.__castle', F = "document.getElementById('friend').contentWindow.__castle", FD = "document.getElementById('friend').contentDocument";
const until = (expr, ms) => ({ waitFor: expr, timeout: ms || 60000 });
const check = (expr, tag) => ({ log: `(() => { const ok = !!(${expr}); if (!ok) (window.__P = window.__P || []).push('${tag}'); return '${tag}: ' + ok; })()` });
module.exports = [
  { viewport: [1180, 820, true, false, 2] },
  { eval: "localStorage.clear(); localStorage.setItem('castle-crew.v1', JSON.stringify({ v: 2, name: 'Hosty', weapon: 'blaster', settings: { auto: true, autoStart: true, quality: 'medium' } })); window.__P = []; 'ready'" }, { reload: true }, { sleep: 600 },
  { eval: `${C}.host(true)` },
  until(`${C}.state().lobby === 'host' && ${C}.state().code.length === 4`, 20000),
  { log: `${C}.state().code` },
  // the friend: a second copy of the game in a frame
  { eval: "(() => { const f = document.createElement('iframe'); f.id = 'friend'; f.src = 'preview.html'; f.style.cssText = 'position:fixed;right:8px;bottom:8px;width:560px;height:280px;z-index:100;border:4px solid #ff5252;border-radius:12px;background:#fff'; document.body.appendChild(f); return 'frame'; })()" },
  until(`(() => { try { return !!${F}; } catch (e) { return false; } })()`, 30000),
  { eval: `(() => { const f = document.getElementById('friend').contentWindow; f.localStorage.setItem('castle-crew.v1', JSON.stringify({ v: 2, name: 'Buddy', weapon: 'bomb', settings: { auto: true, autoStart: true, quality: 'low' } })); f.location.reload(); return 'friend named'; })()` },
  { sleep: 1500 },
  until(`(() => { try { return !!${F}; } catch (e) { return false; } })()`, 30000),
  { eval: `${F}.join(${C}.state().code, true)` },
  until(`${C}.state().crew === 2 && ${F}.state().lobby === 'client'`, 20000),
  check(`document.querySelectorAll('#crewList div').length === 2 && /💣/.test(document.getElementById('crewList').textContent)`, 'host lobby lists 2, the friend with the bomb launcher'),
  // the friend changes weapon; the host picks the next map and Easy
  { eval: `(() => { ${FD}.querySelector('#lobbyWeapon [data-lweapon="lightning"]').click(); document.getElementById('pickNext').click(); document.querySelector('#lobbyDiff [data-ldiff="easy"]').click(); return document.getElementById('pickName').textContent; })()` },
  { sleep: 600 },
  check(`/⚡/.test(document.getElementById('crewList').textContent)`, 'host sees the friend now has lightning'),
  check(`${FD}.getElementById('pickName').textContent === document.getElementById('pickName').textContent`, 'friend sees the map'),
  { shot: 'cc-c01-lobby' },
  { eval: `${C}.startCrew()` },
  until(`${C}.state().mode === 'host' && ${F}.state().mode === 'client'`, 40000), { sleep: 1500 },
  check(`${F}.state().map === 'bridges' && ${F}.state().diff === 'easy' && ${C}.G.s.players.find((p) => p.id !== 'host').weapon === 'lightning'`, 'both on Twin Bridges, Easy; the friend has lightning'),
  check(`${F}.state().coins > 0 && ${F}.state().coins === ${C}.G.s.players.find((p) => p.id !== 'host').coins`, 'the friend has its own coins'),
  { shot: 'cc-c02-started' },
  // the friend walks east for a second (the way is clear there): the host sees it
  { eval: `(() => { window.__fx0 = ${C}.G.s.players.find((p) => p.id !== 'host').x; ${F}.move(1, 0); return window.__fx0; })()` },
  { sleep: 1000 }, { eval: `${F}.move(0, 0); 'stop'` }, { sleep: 400 },
  check(`Math.abs(${C}.G.s.players.find((p) => p.id !== 'host').x - window.__fx0) > 1.5`, 'host sees the friend walk'),
  // the friend builds an Arrow Tower with its own coins
  { eval: `(() => { const Fc = ${F}; window.__fc0 = Fc.state().coins; Fc.openTray(); Fc.pickTower('arrow'); const at = Fc.spotFor('arrow'); if (!at || !Fc.aim(at[0], at[1])) return 'no spot'; Fc.placeTower(); return 'placed ' + at; })()` },
  { sleep: 900 },
  check(`${C}.G.s.towers.length === 1 && ${C}.G.s.towers[0].by !== 'host'`, 'host has the tower the friend built'),
  check(`${F}.state().towers === 1 && ${F}.state().coins < window.__fc0`, 'friend sees it and paid for it'),
  { eval: `${F}.closeTray(); 'closed'` },
  // the friend starts round 1
  { eval: `${F}.nextRound()` },
  until(`${C}.state().round === 1 && ${C}.state().wave[0] === 'fight'`, 10000),
  { eval: `(() => { ${C}.G.bot = ${C}.CCBot.make(); return 'bot'; })()` },
  until(`${C}.state().zombies >= 3`, 30000), { sleep: 800 },
  check(`Math.abs(${F}.state().zombies - ${C}.state().zombies) <= 2`, 'friend sees the zombies'),
  { log: `[${C}.state().zombies, ${F}.state().zombies, ${C}.state().lives, ${F}.state().lives]` },
  { shot: 'cc-c03-fight' },
  until(`${C}.state().wave[0] === 'wait' || ${C}.state().round >= 2`, 90000),
  // the friend upgrades its tower and changes its aim
  { eval: `(() => { const Fc = ${F}, id = ${C}.G.s.towers.find((t) => t.type === 'arrow' && t.by !== 'host').id; Fc.openPanel(id); Fc.buyPath('b'); return id; })()` },
  { sleep: 700 },
  check(`${C}.G.s.towers.find((t) => t.type === 'arrow' && t.by !== 'host').b === 1`, 'host has the upgrade the friend bought'),
  { eval: `${F}.cycleMode()` }, { sleep: 600 },
  check(`${C}.G.s.towers.find((t) => t.type === 'arrow' && t.by !== 'host').mode === 'strong'`, 'friend changed the aim'),
  { shot: 'cc-c04-panel' },
  // the host's computer player plays on a few rounds, fast
  { eval: `${C}.speed(3); 'fast'` },
  until(`${C}.state().round >= 5`, 120000),
  check(`${F}.state().round === ${C}.state().round || ${F}.state().round === ${C}.state().round - 1`, 'friend keeps up with the rounds'),
  { log: `[${C}.state().round, ${C}.state().lives, ${C}.state().towers, ${F}.state().towers]` },
  // the friend leaves: the crew is one again
  { eval: `(() => { ${FD}.getElementById('pauseBtn').click(); ${FD}.getElementById('quitBtn').click(); return 'left'; })()` },
  until(`${C}.state().crew === 1`, 10000),
  check(`${C}.state().crew === 1`, 'host crew back to one'),
  { log: "JSON.stringify(window.__errs || [])" },
  { log: "JSON.stringify(document.getElementById('friend').contentWindow.__errs || [])" },
  { log: "((window.__P || []).length || (window.__errs || []).length || (document.getElementById('friend').contentWindow.__errs || []).length) ? 'FAIL ' + JSON.stringify(window.__P) : 'PASS: no problems'" }
];
