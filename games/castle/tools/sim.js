// Castle Crew balance: computer crews play the maps round after round (run from the repo root).
//   node games/castle/tools/sim.js                            every map on Medium with one bot
//   node games/castle/tools/sim.js --map frozen --diff hard --crew 2 --skill 0.6 --seeds 3 --to 60
// --skill 0.6 is a child-like bot (slower, looks away, a few seconds over each build, upgrades less, no gold mines);
// --lazy bots never build (they only shoot); --to N stops after round N (default 100).
// Prints per game: the round reached (won = round 100 cleared), lives left, game minutes, towers, coins spent, the
// weapon level of each bot and the slowest tick.
global.CC = require('../src/engine.js');
const CCBot = require('../src/bot.js');
const { maps } = require('../content/maps.json');
const { rounds } = require('../content/rounds.json');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const onlyMap = opt('--map'), diffs = (opt('--diff', 'medium')).split(','), crews = (opt('--crew', '1')).split(',').map(Number), seeds = +opt('--seeds', 1);
const lazy = args.indexOf('--lazy') >= 0, skill = +opt('--skill', 1), upTo = +opt('--to', 100), quiet = args.indexOf('--quiet') >= 0;
const weapons = (opt('--weapons', 'blaster,crossbow,bomb,lightning')).split(','), trace = args.indexOf('--trace') >= 0;

function play(def, diff, crewN, seed) {
  const crew = []; for (let k = 0; k < crewN; k++) crew.push({ id: 'p' + k, name: 'Bot ' + (k + 1), weapon: weapons[(k + seed) % weapons.length] });
  const s = CC.newGame({ map: def, rounds: rounds, diff: diff, crew: crew, seed: seed }), mems = s.players.map(() => CCBot.make({ builds: !lazy, skill: skill }));
  const dt = CC.TICK;
  let slow = 0, peak = 0, lastR = 0, kills = 0;
  for (let t = 0; t < 30 * 60 * 120 && !s.result && s.round <= upTo; t++) {
    if (s.round >= upTo && s.wave.state === 'wait') break;
    const inputs = {};
    s.players.forEach((p, k) => { inputs[p.id] = CCBot.think(s, p, mems[k], dt); });
    const t0 = process.hrtime.bigint();
    CC.step(s, dt, inputs);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (ms > slow) slow = ms;
    if (s.zombies.length > peak) peak = s.zombies.length;
    if (trace && s.round !== lastR && s.round % 5 === 0) { lastR = s.round; console.log('   r' + s.round + ' lives ' + Math.ceil(s.lives) + ' towers ' + s.towers.length + ' [' + s.towers.map((t) => t.type + t.a + t.b).join(' ') + '] coins ' + s.players.map((p) => Math.floor(p.coins)).join('/') + ' lv ' + s.players.map((p) => p.wlvl).join('/') + ' dmg p ' + Math.round(s.stats.pdmg / Math.max(1, s.stats.pdmg + s.stats.tdmg) * 100) + '%' + ' t ' + (s.t / 60).toFixed(1)); }
  }
  const done = s.result === 'won' || (s.round >= upTo && s.wave.state === 'wait' && !s.result);
  return { won: done, round: s.round, lives: Math.max(0, Math.ceil(s.lives)), max: s.maxLives, min: (s.t / 60).toFixed(1), towers: s.towers.length, spent: s.stats.spent, levels: s.players.map((p) => p.wlvl).join('/'), slow: slow.toFixed(1), peak: peak, leaked: s.stats.leaked, pshare: Math.round(s.stats.pdmg / Math.max(1, s.stats.pdmg + s.stats.tdmg) * 100) };
}
let lost = 0, games = 0;
const reached = [];
for (const def of maps) {
  if (onlyMap && onlyMap.split(',').indexOf(def.id) < 0) continue;
  for (const diff of diffs) for (const n of crews) for (let k = 0; k < seeds; k++) {
    const r = play(def, diff, n, 1000 + k * 77);
    games++;
    if (!r.won) lost++;
    reached.push(r.round);
    console.log(def.id.padEnd(8) + ' ' + diff.padEnd(6) + ' crew ' + n + ': ' + (r.won ? 'WON ' : 'lost') + ' round ' + String(r.round).padStart(3) + ', lives ' + String(r.lives).padStart(3) + '/' + r.max + ', ' + r.min + ' min, ' + r.towers + ' towers, ' + r.spent + ' spent, weapon lv ' + r.levels + ', most zombies ' + r.peak + ', slowest tick ' + r.slow + ' ms');
  }
}
console.log((lost ? lost + ' lost' : 'all won') + ' of ' + games + ' games' + (lazy ? ' (lazy bots)' : '') + (skill < 1 ? ' (skill ' + skill + ')' : '') + ', rounds reached: ' + reached.join(' '));
