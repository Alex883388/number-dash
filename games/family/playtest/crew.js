// Family Fighters with two players (run from the repo root):
//   node games/family/build.js && ND_CDP=9551 ND_PROFILE=edge-profile-ff-crew ND_HTTP=5651 ND_SERVE=../../family/dist ND_PATH=preview.html ND_READY='!!window.__family' ND_BOT=none node games/dash/playtest/shoot.js games/family/playtest/crew.js
// The page hosts a crew game; a second copy of the game in a frame (a friend's phone, held sideways) joins with the
// room code over the same-browser link, which carries exactly the messages the internet link carries. Checks: the
// lobby shows both, each with a different fighter; the friend changes fighter and the host sees it; the game starts
// on both; the friend walks and the host sees it; the friend's punches beat the host's zombies; both see the same
// question at a gate; both autopilots play the place to the end and both see it won; the friend leaves.
const C = 'window.__family', F = "document.getElementById('friend').contentWindow.__family", FD = "document.getElementById('friend').contentDocument";
const until = (expr, ms) => ({ waitFor: expr, timeout: ms || 60000 });
const check = (expr, tag) => ({ log: `(() => { const ok = !!(${expr}); if (!ok) (window.__P = window.__P || []).push('${tag}'); return '${tag}: ' + ok; })()` });
const errs = "(w) => { w.__errs = []; w.addEventListener('error', (e) => w.__errs.push(String(e.message))); }";
module.exports = [
  { viewport: [1180, 820, true, false, 2] },
  { eval: "localStorage.clear(); localStorage.setItem('family-fighters.v1', JSON.stringify({ v: 1, name: 'Hosty', hero: 'dad', levels: { 1: { won: true, stars: 2 } }, settings: { quality: 'low' } })); window.__P = []; 'ready'" }, { reload: true }, { sleep: 800 },
  { eval: `(${errs})(window); ${C}.hostCrew(true); 'hosting'` },
  until(`${C}.G.role === 'host' && ${C}.G.code.length === 4`, 20000),
  { log: `${C}.G.code` },
  // the friend: a second copy of the game in a frame
  { eval: "(() => { const f = document.createElement('iframe'); f.id = 'friend'; f.src = 'preview.html'; f.style.cssText = 'position:fixed;right:8px;bottom:8px;width:560px;height:300px;z-index:100;border:4px solid #ff5252;border-radius:12px;background:#fff'; document.body.appendChild(f); return 'frame'; })()" },
  until(`(() => { try { return !!${F}; } catch (e) { return false; } })()`, 30000),
  { eval: `(() => { const f = document.getElementById('friend').contentWindow; f.localStorage.setItem('family-fighters.v1', JSON.stringify({ v: 1, name: 'Buddy', hero: 'dad', settings: { quality: 'low' } })); f.location.reload(); return 'friend named'; })()` },
  { sleep: 1500 },
  until(`(() => { try { return !!${F}; } catch (e) { return false; } })()`, 30000),
  { eval: `(${errs})(document.getElementById('friend').contentWindow); ${F}.joinCrew(${C}.G.code, true); 'joining'` },
  until(`${C}.G.crew.length === 2 && ${F}.G.crew.length === 2 && !${FD}.getElementById('s-lobby').hidden`, 20000),
  check(`${C}.G.crew[1].name === 'Buddy' && ${C}.G.crew[1].hero !== 'dad'`, 'host lobby lists Buddy with a fighter of its own'),
  check(`document.querySelectorAll('#crewList div').length === 2`, 'host lobby shows 2'),
  // the friend picks Mẹ
  { eval: `(() => { ${FD}.querySelector('#lobbyHeroes .hcard[data-h="mum"]').click(); return 'picked'; })()` },
  { sleep: 700 },
  check(`${C}.G.crew[1].hero === 'mum' && ${F}.G.crew[1].hero === 'mum'`, 'host and friend see the friend is Mẹ'),
  check(`${FD}.getElementById('lvName').textContent === document.getElementById('lvName').textContent`, 'friend sees the place the host picked'),
  { shot: 'ff-crew-01-lobby' },
  { eval: `document.getElementById('lobbyStart').click(); 'start'` },
  until(`${C}.G.mode === 'host' && ${F}.G.mode === 'client'`, 20000), { sleep: 1500 },
  check(`${F}.G.S.players.length === 2 && ${C}.G.S.players.length === 2`, 'both have two fighters'),
  { shot: 'ff-crew-02-started' },
  // the friend walks right for a second: the host sees it
  { eval: `(() => { window.__fx0 = ${C}.G.S.players.find((p) => p.id !== 'host').x; ${F}.T.mx = 1; return window.__fx0; })()` },
  { sleep: 1000 }, { eval: `${F}.T.mx = 0; 'stop'` }, { sleep: 500 },
  check(`${C}.G.S.players.find((p) => p.id !== 'host').x - window.__fx0 > 100`, 'host sees the friend walk'),
  // both autopilots play: the friend's punches must land on the host's zombies
  { eval: `${C}.auto({ right: 0.9, react: 0.2, dodge: 0.8 }); ${F}.auto({ right: 0.9, react: 0.2, dodge: 0.8 }); 'autopilots'` },
  until(`${C}.G.S.players.find((p) => p.id !== 'host').stats.kills >= 1`, 60000),
  check(`${C}.G.S.players.find((p) => p.id !== 'host').stats.kills >= 1`, 'the friend beat a zombie on the host'),
  { log: `JSON.stringify({ host: ${C}.G.S.zs.length, friend: ${F}.G.S.zs.length, kills: ${C}.G.S.players.map((p) => p.stats.kills) })` },
  { shot: 'ff-crew-03-fight' },
  until(`${C}.G.S.gate && !${C}.G.S.gate.open`, 120000), { sleep: 1200 },
  check(`${FD}.getElementById('qText').textContent === document.getElementById('qText').textContent && !${FD}.getElementById('qbar').hidden`, 'both see the same question'),
  { shot: 'ff-crew-04-gate' },
  until(`${C}.G.S.boss && ${C}.G.S.boss.st === 'fight'`, 240000), { sleep: 2000 },
  check(`${F}.G.S.boss && ${F}.G.S.boss.b === ${C}.G.S.boss.b`, 'friend sees the boss'),
  { shot: 'ff-crew-05-boss' },
  until(`${C}.G.S.state === 'won'`, 240000), { sleep: 3500 },
  check(`!document.getElementById('s-result').hidden && !${FD}.getElementById('s-result').hidden`, 'both see the place won'),
  { log: `JSON.stringify({ levels: ${F}.rec.levels, xp: ${F}.rec.xp, me: ${F}.G.me, myId: ${F}.G.myId, ids: ${C}.G.S.players.map((p) => p.id) })` },
  check(`${F}.rec.levels[${F}.G.level] && ${F}.rec.levels[${F}.G.level].won && (${F}.rec.xp.mum || 0) > 0`, 'the friend kept the win and Mẹ got experience'),
  { shot: 'ff-crew-06-won' },
  { log: `JSON.stringify({ stats: ${C}.G.S.stats, friend: ${C}.G.S.players.find((p) => p.id !== 'host').stats })` },
  // back to the lobby, then the friend leaves: the crew is one again
  { eval: `document.getElementById('resLevels').click(); 'lobby'` },
  until(`!${FD}.getElementById('s-lobby').hidden`, 10000),
  check(`!${FD}.getElementById('s-lobby').hidden`, 'friend is back in the lobby'),
  { eval: `${FD}.getElementById('lobbyLeave').click(); 'left'` },
  until(`${C}.G.crew.length === 1`, 10000),
  check(`${C}.G.crew.length === 1`, 'host crew back to one'),
  { log: "JSON.stringify(window.__errs || [])" },
  { log: "JSON.stringify(document.getElementById('friend').contentWindow.__errs || [])" },
  { log: "((window.__P || []).length || (window.__errs || []).length || (document.getElementById('friend').contentWindow.__errs || []).length) ? 'FAIL ' + JSON.stringify(window.__P) : 'PASS: no problems'" }
];
