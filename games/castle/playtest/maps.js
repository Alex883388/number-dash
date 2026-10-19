// Castle Crew's maps in the page (run from the repo root):
//   node games/castle/build.js && ND_CDP=9543 ND_PROFILE=edge-profile-castle3 ND_URL=file:///D:/Github/number-dash/games/castle/dist/preview.html ND_READY='!!window.__castle' ND_BOT=none node games/dash/playtest/shoot.js games/castle/playtest/maps.js
// Every map opens (a picture of each, for its colours), round 1 starts and its zombies walk their road (on road
// tiles, getting nearer the castle). Then a computer player plays on without drawing to each boss round, which is
// pictured mid-fight: the Zombie King (20), the Swamp Witch (40), the Colossus (60), the Bone Dragon (80) and the
// Zombie Overlord (100). No page errors.
const C = 'window.__castle';
const until = (expr, ms) => ({ waitFor: expr, timeout: ms || 60000 });
const ONE = (id) => `(async () => {
  const P = window.__P = window.__P || [];
  await ${C}.play('${id}', 'medium', 'blaster', false);
  const s = ${C}.G.s, T = ${C}.CC.T;
  ${C}.nextRound();
  const t0 = performance.now();
  while (performance.now() - t0 < 15000 && s.zombies.length < 2) await new Promise((r) => setTimeout(r, 50));
  if (s.zombies.length < 1) { P.push('${id}: no zombies'); return '${id}: no zombies'; }
  const z = s.zombies[0], d0 = z.d, c0 = ${C}.CC.castleDist(s, z.x, z.z);
  await new Promise((r) => setTimeout(r, 1500));
  const tile = s.map.tiles[(z.z | 0) * s.map.w + (z.x | 0)];
  if (z.hp > 0 && z.d - d0 < 0.5) P.push('${id}: the first zombie did not walk');
  if (z.hp > 0 && [T.DIRT, T.BRIDGE, T.SPAWN].indexOf(tile) < 0) P.push('${id}: a zombie off the road (tile ' + tile + ')');
  return '${id} ' + s.map.w + 'x' + s.map.h + ', ' + s.map.paths.length + ' roads, ' + s.zombies.length + ' zombies, walked ' + (z.d - d0).toFixed(1) + ', nearer the castle by ' + (c0 - ${C}.CC.castleDist(s, z.x, z.z)).toFixed(1);
})()`;
const map = (id, n) => [{ log: ONE(id) }, { sleep: 600 }, { shot: 'cc-m' + n + '-' + id }];
const boss = (id, r, type, name) => [
  { eval: `(async () => { await ${C}.play('${id}', 'easy', 'lightning', false); ${C}.G.bot = ${C}.CCBot.make(); return ${C}.skipTo(${r}); })()` },
  { log: `'${name}: round ' + ${C}.G.s.round + ', lives ' + Math.ceil(${C}.G.s.lives) + ', result ' + (${C}.G.s.result || '-')` },
  { eval: `${C}.speed(1); 'go'` },
  until(`${C}.G.s.result || ${C}.G.s.zombies.some((z) => z.type === '${type}')`, 90000), { sleep: 3000 },
  { shot: 'cc-b' + r + '-' + type },
  { log: `(() => { const s = ${C}.G.s, b = s.zombies.find((z) => z.type === '${type}'); if (!b && !s.result) (window.__P = window.__P || []).push('${name} missing'); return '${name}: ' + (b ? 'hp ' + Math.round(b.hp) + ' of ' + b.max + ', ' : '') + s.zombies.length + ' zombies, ' + s.towers.length + ' towers, ' + JSON.stringify(${C}.view()); })()` }
];
module.exports = [
  { viewport: [1180, 820, false, false, 1] },
  { eval: "localStorage.clear(); localStorage.setItem('castle-crew.v1', JSON.stringify({ v: 2, settings: { auto: true, autoStart: true, quality: 'low' } })); window.__P = []; 'ready'" }, { reload: true }, { sleep: 600 },
  ...map('meadow', 1), ...map('bridges', 2), ...map('pumpkin', 3), ...map('frozen', 4), ...map('canyon', 5), ...map('haunted', 6), ...map('lava', 7), ...map('winds', 8),
  ...boss('meadow', 20, 'king', 'the Zombie King'),
  ...boss('frozen', 40, 'witch', 'the Swamp Witch'),
  ...boss('pumpkin', 60, 'colossus', 'the Colossus'),
  ...boss('meadow', 80, 'dragon', 'the Bone Dragon'),
  ...boss('meadow', 100, 'overlord', 'the Zombie Overlord'),
  { log: 'JSON.stringify(window.__errs || [])' },
  { log: "((window.__P || []).length || (window.__errs || []).length) ? 'FAIL ' + JSON.stringify(window.__P) : 'PASS: no problems'" }
];
