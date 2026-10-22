// Castle Crew's new menus on phones held sideways (run from the repo root):
//   node games/castle/build.js && ND_CDP=9546 ND_PROFILE=edge-profile-castle4 ND_URL=file:///D:/Github/number-dash/games/castle/dist/preview.html ND_READY='!!window.__castle' ND_BOT=none node games/dash/playtest/shoot.js games/castle/playtest/phones.js
// The zombie book on a phone (in columns, every zombie) and from the pause screen and back; the build tray with its
// element tabs on the smallest phone (it must not reach the HUD); a tap on the fire tab; the round-before-a-boss
// warning (round 39 cleared: the Swamp Witch is next). No page errors.
const C = 'window.__castle';
const fits = (tag) => ({ log: `(() => { const f = ${C}.fits(); if (f.length) (window.__P = window.__P || []).push('${tag}: ' + f.join('; ')); return '${tag}: ' + (f.join('; ') || 'fits'); })()` });
const until = (expr, ms) => ({ waitFor: expr, timeout: ms || 60000 });
const check = (expr, tag) => ({ log: `(() => { const ok = !!(${expr}); if (!ok) (window.__P = window.__P || []).push('${tag}'); return '${tag}: ' + ok; })()` });
module.exports = [
  { ipad: true },
  { viewport: [844, 390, true, false, 3] },
  { eval: "localStorage.clear(); window.__P = []; 'cleared'" }, { reload: true }, { sleep: 700 },
  { touchEl: '#bookBtn' }, { sleep: 500 }, fits('phone book'), { shot: 'cc-ph01-book' },
  check(`getComputedStyle(document.getElementById('bookGrid')).gridTemplateColumns.split(' ').length >= 2 && document.querySelectorAll('#bookGrid .zb').length === ${C}.CC.ZOMBIE_ORDER.length`, 'every zombie in columns on a phone'),
  { touchEl: '#bookBack' }, { sleep: 300 },
  check(`${C}.state().screen === 's-home'`, 'back home from the book'),
  // a game on the smallest phone: the tray with its tabs
  { eval: `(async () => { await ${C}.play('meadow', 'easy', 'punch'); return 'meadow'; })()` },
  until(`${C}.ready() && ${C}.state().mode === 'solo'`, 40000), { sleep: 1200 },
  { viewport: [667, 375, true, false, 2] }, { sleep: 700 },
  { touchEl: '#buildBtn' }, { sleep: 300 }, fits('small phone tray'), { shot: 'cc-ph02-tray' },
  { touchEl: '#etabs [data-el="fire"]' }, { sleep: 250 },
  check(`[...document.querySelectorAll('#cards .tc')].every((b) => ${C}.CC.TOWERS[b.dataset.t].type === 'fire')`, 'the fire tab shows only fire towers'),
  { touchEl: '#etabs [data-el="help"]' }, { sleep: 250 }, { shot: 'cc-ph03-tray-helpers' },
  check(`[...document.querySelectorAll('#cards .tc')].map((b) => b.dataset.t).sort().join() === 'mill,mine,shrine,wall'`, 'the helpers tab: barricade, shrine, gold mine, lumber mill'),
  { touchEl: '#trayClose' }, { sleep: 200 },
  // the book from the pause screen, and back to the pause screen
  { touchEl: '#pauseBtn' }, { sleep: 300 }, { touchEl: '#pauseBook' }, { sleep: 400 }, fits('book from pause'),
  { touchEl: '#bookBack' }, { sleep: 300 },
  check(`${C}.state().screen === 's-pause' && ${C}.state().paused`, 'back to the pause screen, still paused'),
  { touchEl: '#resumeBtn' }, { sleep: 200 },
  // the warning a round before a boss: round 39 cleared, the witch is next
  { viewport: [1180, 820, true, false, 2] }, { sleep: 500 },
  { log: `${C}.skipTo(39)` },
  { eval: `${C}.G.s.autoStart = false; ${C}.speed(3); 'held, fast'` },
  until(`${C}.state().round >= 39 && ${C}.state().wave[0] === 'wait'`, 240000), { sleep: 300 },
  { shot: 'cc-ph04-witch-warning' },
  check(`/Swamp Witch/.test(document.getElementById('bannerTxt').textContent) || ${C}.state().round >= 40`, 'warned that the Swamp Witch comes next'),
  { log: 'JSON.stringify(window.__errs || [])' },
  { log: "((window.__P || []).length || (window.__errs || []).length) ? 'FAIL ' + JSON.stringify(window.__P) : 'PASS: no problems'" }
];
