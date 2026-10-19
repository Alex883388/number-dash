// Plays every Mech Blaster level with test pilots (MB.bot in src/engine.js) to prove each one can be cleared and to
// measure how hard it is. Two pilots: "good" (quick, accurate, always right) must clear every level without the mech
// going down in almost every run; "kid" (slower, misses more, answers right 80% of the time) shows the difficulty
// curve: the share of runs it clears without going down should fall gently from the first level to the last.
// Usage: node games/mech/tools/check.js [--levels 1-50] [--runs 8] [--pilot good|kid|both] [--file content/levels.json]
const fs = require('fs'), path = require('path');
require('../src/engine.js');
const MB = globalThis.MB;
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const file = path.resolve(__dirname, '..', arg('file', 'content/levels.json'));
const LEVELS = JSON.parse(fs.readFileSync(file, 'utf8')).levels;
const [a, b] = arg('levels', '1-50').split('-').map(Number);
const runs = +arg('runs', 8), which = arg('pilot', 'both');
const PILOTS = {
  good: { react: 0.16, right: 1, think: 1.0, taps: 6, jump: 0.98, dodge: 0.98, miss: 0.05 },
  kid: { react: 0.42, right: 0.8, think: 2.6, taps: 3, jump: 0.72, dodge: 0.7, miss: 0.35 }
};
// the least share of runs the kid pilot should clear without the mech going down, by level
const KID_FLOOR = (n, boss) => (boss ? 0.35 : n <= 5 ? 0.85 : n <= 15 ? 0.7 : n <= 30 ? 0.55 : n <= 45 ? 0.42 : 0.32);

function play(L, P, seed) {
  const S = MB.start(L, { seed: seed, weapons: MB.arsenal(L.id - 1), nova: L.id - 1 >= MB.NOVA_UNLOCK ? MB.NOVA_CHARGES : 0 });
  let steps = 0;
  while (S.state === 'play' && steps < 60 * 600) { MB.bot(S, P); MB.step(S, 1 / 60); steps++; }
  return { won: S.state === 'won', t: S.t, hp: S.mech.hp, hurt: S.stats.hurt, kills: S.stats.kills, d: S.d, stuck: S.state === 'play' };
}
let bad = 0;
const rows = [];
for (let n = a; n <= b; n++) {
  const L = LEVELS[n - 1];
  const row = { n: n, name: L.name };
  for (const p of which === 'both' ? ['good', 'kid'] : [which]) {
    let won = 0, t = 0, hp = 0, hurt = 0, stuck = 0;
    for (let r = 1; r <= runs; r++) {
      const o = play(L, PILOTS[p], r * 7919 + n);
      if (o.won) { won++; hp += o.hp; }
      t += o.t; hurt += o.hurt; if (o.stuck) stuck++;
    }
    row[p] = { clear: won / runs, t: t / runs, hp: won ? hp / won : 0, hurt: hurt / runs, stuck: stuck };
  }
  const issues = [];
  if (row.good && row.good.clear < 0.9) issues.push('good pilot clears only ' + Math.round(row.good.clear * 100) + '%');
  if (row.good && row.good.stuck) issues.push(row.good.stuck + ' runs never ended');
  if (row.kid && row.kid.clear < KID_FLOOR(n, !!L.boss)) issues.push('kid pilot clears only ' + Math.round(row.kid.clear * 100) + '% (floor ' + Math.round(KID_FLOOR(n, !!L.boss) * 100) + '%)');
  if (issues.length) bad++;
  const f = (o) => (o ? (Math.round(o.clear * 100) + '%').padStart(4) + ' ' + o.t.toFixed(0).padStart(3) + 's hp ' + o.hp.toFixed(0).padStart(3) + ' hits ' + o.hurt.toFixed(1).padStart(4) : '');
  console.log(String(n).padStart(2) + ' ' + L.name.padEnd(17) + (row.good ? ' good ' + f(row.good) : '') + (row.kid ? '  kid ' + f(row.kid) : '') + (issues.length ? '  << ' + issues.join('; ') : ''));
  rows.push(row);
}
console.log(bad + ' level(s) with problems');
process.exit(bad ? 1 : 0);
