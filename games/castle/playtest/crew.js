// Castle Crew with two players (run from the repo root):
//   node games/castle/build.js && ND_CDP=9542 ND_PROFILE=edge-profile-castle2 ND_HTTP=5642 ND_SERVE=../castle/dist ND_PATH=preview.html ND_READY='!!window.__castle' ND_BOT=none node games/dash/playtest/shoot.js games/castle/playtest/crew.js
// The page hosts a crew game; a second copy of the game in a frame (a friend's phone, held sideways) joins with the
// room code over the same-browser link, which carries exactly the messages the internet link carries. Checks: the
// lobby shows both; the level starts on both; the friend walks and the host sees it; the friend builds a barricade and
// both see it; both say ready and the wave starts; in the fight the friend's copy shows the zombies the host has; the
// level ends on both with the same result; the friend leaves and the host's crew is one again. No page errors.
const C = 'window.__castle', F = "document.getElementById('friend').contentWindow.__castle";
const until = (expr, ms) => ({ waitFor: expr, timeout: ms || 60000 });
const check = (expr, tag) => ({ log: `(() => { const ok = !!(${expr}); if (!ok) (window.__P = window.__P || []).push('${tag}'); return '${tag}: ' + ok; })()` });
module.exports = [
  { viewport: [1180, 820, true, false, 2] },
  { eval: "localStorage.clear(); localStorage.setItem('castle-crew.v1', JSON.stringify({ v: 1, levels: { 1: { s: 3 } }, name: 'Hosty', settings: { auto: true, quality: 'medium' } })); window.__P = []; 'ready'" }, { reload: true }, { sleep: 600 },
  { eval: `${C}.host(true)` },
  until(`${C}.state().lobby === 'host' && ${C}.state().code.length === 4`, 20000),
  { log: `${C}.state().code` },
  // the friend: a second copy of the game in a frame
  { eval: "(() => { const f = document.createElement('iframe'); f.id = 'friend'; f.src = 'preview.html'; f.style.cssText = 'position:fixed;right:8px;bottom:8px;width:560px;height:280px;z-index:100;border:4px solid #ff5252;border-radius:12px;background:#fff'; document.body.appendChild(f); return 'frame'; })()" },
  until(`(() => { try { return !!${F}; } catch (e) { return false; } })()`, 30000),
  { eval: `(() => { const f = document.getElementById('friend').contentWindow; f.localStorage.setItem('castle-crew.v1', JSON.stringify({ v: 1, levels: {}, name: 'Buddy', settings: { auto: true, quality: 'low' } })); f.location.reload(); return 'friend named'; })()` },
  { sleep: 1500 },
  until(`(() => { try { return !!${F}; } catch (e) { return false; } })()`, 30000),
  { eval: `${F}.join(${C}.state().code, true)` },
  until(`${C}.state().crew === 2 && ${F}.state().lobby === 'client'`, 20000),
  check(`document.querySelectorAll('#crewList div').length === 2`, 'host lobby lists 2'),
  check(`document.getElementById('friend').contentDocument.querySelectorAll('#crewList div').length === 2`, 'friend lobby lists 2'),
  { shot: 'cc-c01-lobby' },
  // the host starts Level 2 (the host has won Level 1)
  { eval: `(() => { document.getElementById('pickNext').click(); return document.getElementById('pickName').textContent; })()` },
  { eval: `${C}.startCrew()` },
  until(`${C}.state().mode === 'host' && ${F}.state().mode === 'client'`, 40000), { sleep: 1500 },
  check(`${F}.state().level === 2`, 'friend plays level 2'),
  { shot: 'cc-c02-started' },
  // the friend walks east for a second: the host sees it
  { eval: `(() => { window.__fx0 = ${C}.G.s.players.find((p) => p.id !== 'host').x; ${F}.move(1, 0); return window.__fx0; })()` },
  { sleep: 1000 }, { eval: `${F}.move(0, 0); 'stop'` }, { sleep: 400 },
  check(`${C}.G.s.players.find((p) => p.id !== 'host').x > window.__fx0 + 1.5`, 'host sees the friend walk'),
  // the friend builds a barricade beside them
  { eval: `(() => { const W = document.getElementById('friend').contentWindow, Fc = W.__castle; Fc.openTray(); Fc.pickTurret('wall'); const me = Fc.G.meP; for (let r = 1; r < 4; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (Fc.aim(Math.floor(me.x) + dx, Math.floor(me.z) + dz)) { Fc.placeTurret(); return 'placed'; } } return 'no spot'; })()` },
  { sleep: 800 },
  check(`${C}.G.s.turrets.length === 1 && ${C}.G.s.turrets[0].type === 'wall'`, 'host has the barricade'),
  check(`${F}.state().turrets === 1`, 'friend sees the barricade'),
  { eval: `${F}.closeTray(); 'closed'` },
  // both ready: the wave starts at once
  { eval: `(() => { ${C}.readyUp(); ${F}.readyUp(); return 'ready'; })()` },
  until(`${C}.state().wave[1] === 'fight'`, 10000),
  check(`${C}.state().wave[2] > 3 || ${C}.state().wave[1] === 'fight'`, 'the wave started when both were ready'),
  // the host's computer player fights; the friend's copy shows the same zombies
  { eval: `(() => { ${C}.G.bot = ${C}.CCBot.make(); return 'bot'; })()` },
  until(`${C}.state().zombies >= 3`, 60000), { sleep: 800 },
  check(`Math.abs(${F}.state().zombies - ${C}.state().zombies) <= 2`, 'friend sees the zombies'),
  { log: `[${C}.state().zombies, ${F}.state().zombies, ${C}.state().castle, ${F}.state().castle]` },
  { shot: 'cc-c03-fight' },
  // play on fast to the end of the level
  { eval: `${C}.speed(3); 'fast'` },
  until(`${C}.state().screen === 's-result' && ${F}.state().screen === 's-result'`, 300000), { sleep: 600 },
  check(`document.getElementById('resTitle').textContent === document.getElementById('friend').contentDocument.getElementById('resTitle').textContent`, 'same result on both'),
  { log: `[document.getElementById('resTitle').textContent, ${F}.rec.done, JSON.stringify(${F}.rec.levels)]` },
  { shot: 'cc-c04-result' },
  // the friend leaves: the crew is one again
  { eval: `(() => { document.getElementById('friend').contentDocument.getElementById('resLevels').click(); return 'left'; })()` },
  until(`${C}.state().crew === 1`, 10000),
  check(`${C}.state().crew === 1`, 'host crew back to one'),
  { log: "JSON.stringify(window.__errs || [])" },
  { log: "JSON.stringify(document.getElementById('friend').contentWindow.__errs || [])" },
  { log: "((window.__P || []).length || (window.__errs || []).length) ? 'FAIL ' + JSON.stringify(window.__P) : 'PASS: no problems'" }
];
