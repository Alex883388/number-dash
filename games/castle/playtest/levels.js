// Castle Crew's levels in the page (run from the repo root):
//   node games/castle/build.js && ND_CDP=9543 ND_PROFILE=edge-profile-castle3 ND_URL=file:///D:/Github/number-dash/games/castle/dist/preview.html ND_READY='!!window.__castle' ND_BOT=none node games/dash/playtest/shoot.js games/castle/playtest/levels.js
// Every level opens, its first wave spawns and the zombies walk (none stuck at the gate); then a computer player plays
// the boss and special levels to the end at speed (the King, ghosts, the Witch, the Colossus), with a picture of each
// fight. No page errors.
const C = 'window.__castle';
const ALL = `(async () => {
  const out = [], P = window.__P = window.__P || [];
  for (let n = 1; n <= ${C}.LEVELS.length; n++) {
    await ${C}.play(n, false);
    const s = ${C}.G.s;
    ${C}.readyUp();
    const t0 = performance.now();
    while (performance.now() - t0 < 15000 && s.zombies.length < 2) await new Promise((r) => setTimeout(r, 50));
    if (s.zombies.length < 1) { P.push(n + ': no zombies'); continue; }
    const z = s.zombies[0], x0 = z.x, z0 = z.z;
    await new Promise((r) => setTimeout(r, 1500));
    const moved = Math.hypot(z.x - x0, z.z - z0);
    if (z.hp > 0 && moved < 0.3) P.push(n + ': the first zombie did not walk (' + moved.toFixed(2) + ')');
    out.push(n + ' ' + s.map.w + 'x' + s.map.h + ' ' + s.zombies.length + ' zombies, moved ' + moved.toFixed(1));
  }
  ${C}.goHome();
  return out.join(' | ');
})()`;
const level = (n, shot) => [
  { eval: `(async () => { await ${C}.play(${n}, true); ${C}.speed(6); return ${n}; })()` },
  { waitFor: `${C}.state().wave && ${C}.state().wave[0] === ${C}.LEVELS[${n} - 1].waves.length - 1 && ${C}.state().wave[1] === 'fight' && ${C}.state().zombies > 2`, timeout: 300000 },
  { eval: `${C}.speed(1); 'look'` }, { sleep: 2500 }, { shot: shot },
  { log: `(() => { const s = ${C}.G.s; return '${n}: ' + s.zombies.map((z) => z.type).filter((t, i, a) => a.indexOf(t) === i).join(', ') + ' | ' + JSON.stringify(${C}.view()); })()` },
  { eval: `${C}.speed(6); 'on'` },
  { waitFor: `${C}.state().screen === 's-result'`, timeout: 400000 },
  { log: `'${n}: ' + document.getElementById('resTitle').textContent + ' ' + document.querySelectorAll('#resStars span:not(.off)').length + ' stars'` }
];
module.exports = [
  { viewport: [1180, 820, false, false, 1] },
  { eval: "localStorage.clear(); localStorage.setItem('castle-crew.v1', JSON.stringify({ v: 1, levels: {}, settings: { auto: true, quality: 'low' } })); window.__P = []; 'ready'" }, { reload: true }, { sleep: 600 },
  { log: ALL },
  ...level(10, 'cc-l10-king'),
  ...level(11, 'cc-l11-ghosts'),
  ...level(15, 'cc-l15-witch'),
  ...level(20, 'cc-l20-colossus'),
  { log: 'JSON.stringify(window.__errs || [])' },
  { log: "((window.__P || []).length || (window.__errs || []).length) ? 'FAIL ' + JSON.stringify(window.__P) : 'PASS: no problems'" }
];
