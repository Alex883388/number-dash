// Castle Crew balance: computer crews play every level (run from the repo root).
//   node games/castle/tools/sim.js                 every level with crews of 1, 2 and 4 bots
//   node games/castle/tools/sim.js --level 5 --crew 1 --seeds 3 --lazy
// --lazy: bots that never build (they only shoot): the levels should need towers, so lazy crews should lose later on.
// Prints per level and crew: won or lost, the castle's health left (stars: 3 at 80%, 2 at 50%), the minutes played,
// kills, towers built and the slowest tick.
global.CC = require('../src/engine.js');
const CCBot = require('../src/bot.js');
const { levels } = require('../content/levels.json');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const onlyLevel = opt('--level') ? +opt('--level') : 0, crews = opt('--crew') ? [+opt('--crew')] : [1, 2, 4], seeds = +opt('--seeds', 1), lazy = args.indexOf('--lazy') >= 0, skill = +opt('--skill', 1);

// what the crew has by a level: every unlock up to it
function unlocksFor(n) {
  const u = { weapons: [], turrets: [] };
  for (const L of levels) if (L.n <= n) { (L.unlock.weapons || []).forEach((w) => u.weapons.push(w)); (L.unlock.turrets || []).forEach((t) => u.turrets.push(t)); }
  return u;
}
function play(L, crewN, seed) {
  const crew = []; for (let k = 0; k < crewN; k++) crew.push({ id: 'p' + k, name: 'Bot ' + (k + 1) });
  const s = CC.newGame(L, crew, seed, unlocksFor(L.n)), mems = s.players.map(() => CCBot.make({ builds: !lazy, skill: skill }));
  const dt = CC.TICK;
  let slow = 0;
  for (let t = 0; t < 30 * 60 * 25 && !s.result; t++) {
    const inputs = {};
    s.players.forEach((p, k) => { inputs[p.id] = CCBot.think(s, p, mems[k], dt); });
    const t0 = process.hrtime.bigint();
    CC.step(s, dt, inputs);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (ms > slow) slow = ms;
  }
  const pct = Math.round(s.castle.hp / s.castle.max * 100);
  return { result: s.result || 'timeout', pct: pct, stars: s.result === 'won' ? (pct >= 80 ? 3 : pct >= 50 ? 2 : 1) : 0, min: (s.t / 60).toFixed(1), kills: s.stats.kills, built: s.stats.built, wave: s.wave.idx + 1, waves: s.waves.length, slow: slow.toFixed(1) };
}
const rows = [];
let lost = 0;
for (const L of levels) {
  if (onlyLevel && L.n !== onlyLevel) continue;
  for (const n of crews) {
    for (let k = 0; k < seeds; k++) {
      const r = play(L, n, 1000 + k * 77);
      if (r.result !== 'won') lost++;
      rows.push(r);
      console.log(String(L.n).padStart(2) + ' ' + L.name.padEnd(18) + ' crew ' + n + ': ' + r.result.padEnd(4) + ' castle ' + String(r.pct).padStart(3) + '% ' + '★'.repeat(r.stars).padEnd(3) + ' wave ' + r.wave + '/' + r.waves + ', ' + r.min + ' min, ' + r.kills + ' kills, ' + r.built + ' built, slowest tick ' + r.slow + ' ms');
    }
  }
}
console.log((lost ? lost + ' lost' : 'all won') + ' of ' + rows.length + ' games' + (lazy ? ' (lazy bots)' : ''));
