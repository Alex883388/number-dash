// Plays Family Fighters' levels with test pilots (FF.bot) for 1 to 4 players and prints how it went: the time a level
// takes, family hearts used, wipes (everyone down with no hearts left: the level goes back to the last checkpoint),
// questions, and anything stuck. Each pilot plays like a child of a kind: "kid" (slower, often wrong, dodges half the
// boss's warnings) or "good".
// Usage: node games/family/tools/sim.js [--level 3] [--crew 1,2,4] [--pilot kid|good] [--runs 3] [--quiet]
const path = require('path');
require(path.join(__dirname, '..', 'src', 'engine.js'));
const FF = globalThis.FF;
const LEVELS = require(path.join(__dirname, '..', 'content', 'levels.json')).levels;

const PILOTS = {
  kid: { right: 0.72, react: 0.3, dodge: 0.45, think: 2.2 },
  good: { right: 0.95, react: 0.18, dodge: 0.85, think: 1.2 }
};
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const only = opt('level', null), crews = opt('crew', '1,2,3,4').split(',').map(Number), pilots = opt('pilot', 'kid,good').split(','), runs = +opt('runs', 2), quiet = args.includes('--quiet');
const LIMIT = 20 * 60;    // seconds of game time before a run counts as stuck

function run(L, crew, pilot, seed) {
  const players = [];
  for (let i = 0; i < crew; i++) players.push({ id: 'p' + i, hero: FF.HERO_ORDER[i], lvl: 1 + Math.min(9, L.id - 1), bot: true });
  let S = FF.start(L, { players: players, seed: seed });
  let t = 0, wipes = 0, hearts = 0, minHp = 1, kills = 0, right = 0, wrong = 0, asked = 0, bossT = 0, lastBi = -1, stuckT = 0, beatTimes = [];
  const dt = 1 / 60;
  while (t < LIMIT) {
    const inputs = {};
    for (const p of S.players) inputs[p.id] = FF.bot(S, p.id, PILOTS[pilot]);
    FF.step(S, dt, inputs);
    t += dt;
    for (const p of S.players) minHp = Math.min(minHp, p.hp / p.max);
    if (S.boss && S.boss.st === 'fight') bossT += dt;
    if (S.bi !== lastBi) { beatTimes.push(Math.round(t)); lastBi = S.bi; stuckT = 0; } else stuckT += dt;
    if (stuckT > 240) return { stuck: true, t: t, beat: S.bi, lock: S.lock && S.lock.k, zs: S.zs.length, boss: S.boss && S.boss.hp, wipes: wipes };
    if (S.state === 'won') { hearts += S.stats.hearts; kills += S.stats.kills; right += S.stats.right; wrong += S.stats.wrong; asked += S.stats.asked; return { t: t, wipes: wipes, hearts: hearts, minHp: minHp, kills: kills, right: right, wrong: wrong, asked: asked, bossT: bossT, stars: FF.stars(S), beats: beatTimes }; }
    if (S.state === 'wipe') {
      wipes++; hearts += S.stats.hearts; kills += S.stats.kills; right += S.stats.right; wrong += S.stats.wrong; asked += S.stats.asked;
      if (wipes > 6) return { failed: true, t: t, wipes: wipes, beat: S.bi };
      S = FF.start(L, { players: players, seed: seed + wipes * 101, from: S.cp });
      lastBi = -1;
    }
  }
  return { stuck: true, t: t, beat: S.bi, lock: S.lock && S.lock.k };
}

const rows = [];
for (const L of LEVELS) {
  if (only && L.id !== +only) continue;
  for (const pilot of pilots) for (const crew of crews) {
    const res = [];
    for (let r = 0; r < runs; r++) res.push(run(L, crew, pilot, 17 + r * 1000 + L.id * 7));
    const ok = res.filter((x) => !x.stuck && !x.failed);
    const avg = (f) => ok.length ? ok.reduce((t, x) => t + f(x), 0) / ok.length : 0;
    const row = { level: L.id, pilot: pilot, crew: crew, won: ok.length + '/' + runs, min: (avg((x) => x.t) / 60).toFixed(1), wipes: avg((x) => x.wipes).toFixed(1), hearts: avg((x) => x.hearts).toFixed(1),
      minHp: avg((x) => x.minHp).toFixed(2), boss: avg((x) => x.bossT).toFixed(0) + 's', ans: avg((x) => x.right).toFixed(1) + '/' + avg((x) => x.wrong).toFixed(1), stars: avg((x) => x.stars).toFixed(1),
      bad: res.filter((x) => x.stuck || x.failed).map((x) => (x.stuck ? 'STUCK beat ' + x.beat + ' ' + (x.lock || '') + ' zs ' + x.zs + ' boss ' + x.boss : 'FAILED at beat ' + x.beat)).join('; ') };
    rows.push(row);
    if (!quiet) console.log(['L' + row.level, row.pilot.padEnd(4), 'crew ' + row.crew, 'won ' + row.won, row.min + ' min', 'wipes ' + row.wipes, 'hearts ' + row.hearts, 'minHp ' + row.minHp, 'boss ' + row.boss, 'answers ' + row.ans, 'stars ' + row.stars, row.bad].join('  '));
  }
}
const bad = rows.filter((r) => r.bad || r.won !== runs + '/' + runs);
console.log(rows.length + ' rows, ' + bad.length + ' with a problem');
process.exit(bad.length ? 1 : 0);
