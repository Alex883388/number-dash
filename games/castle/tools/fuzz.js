// Castle Crew stress test (run from the repo root): node games/castle/tools/fuzz.js [rounds, default 45]
// Random towers of every kind, random upgrades on both paths, sales and aims, round after round on every map with
// plenty of coins, alone and in a crew of three; a save and a load now and then. Checks for crashes, numbers that are
// not numbers, negative coins, towers past step 1 on both paths and saves that do not load back the same.
global.CC = require('../src/engine.js');
const CCBot = require('../src/bot.js');
const { maps } = require('../content/maps.json');
const { rounds } = require('../content/rounds.json');
let problems = 0;
const bad = (m) => { problems++; if (problems < 30) console.log('PROBLEM ' + m); };
const types = Object.keys(CC.TOWERS), upTo = +(process.argv[2] || 45);
const seen = new Set();
for (const def of maps) {
  for (const crewN of [1, 3]) {
    const crew = []; for (let k = 0; k < crewN; k++) crew.push({ id: 'p' + k, name: 'P' + k, weapon: CC.WEAPON_ORDER[(k * 3 + def.seed) % 8] });
    const s = CC.newGame({ map: def, rounds, diff: ['easy', 'medium', 'hard'][def.seed % 3], crew, seed: def.seed });
    const mems = s.players.map(() => CCBot.make({ builds: false }));
    let t = 0;
    try {
      for (; t < 30 * 60 * 80 && !s.result && s.round < upTo; t++) {
        const inputs = {};
        s.players.forEach((p, k) => {
          const inp = CCBot.think(s, p, mems[k], CC.TICK);
          p.coins = Math.max(p.coins, 4000);   // plenty, so every tower and upgrade gets tried
          if (t % 20 === k) {
            const r = Math.random();
            if (r < 0.35) { const type = types[Math.floor(Math.random() * types.length)], i = CCBot.spotFor(s, type, mems[k]); if (i >= 0) inp.build = { type, tx: i % s.map.w, tz: (i / s.map.w) | 0 }; }
            else if (r < 0.8 && s.towers.length) { const tw = s.towers[Math.floor(Math.random() * s.towers.length)]; inp.upgrade = { id: tw.id, path: Math.random() < 0.5 ? 'a' : 'b' }; }
            else if (r < 0.86 && s.towers.length > 25) { const tw = s.towers[Math.floor(Math.random() * s.towers.length)]; inp.sell = tw.id; }
            else if (r < 0.95 && s.towers.length) { const tw = s.towers[Math.floor(Math.random() * s.towers.length)]; inp.mode = { id: tw.id, mode: ['first', 'last', 'close', 'strong'][Math.floor(Math.random() * 4)] }; }
          }
          if (s.wave.state === 'wait') inp.next = true;
          inputs[p.id] = inp;
        });
        const ev = CC.step(s, CC.TICK, inputs);
        for (const e of ev) if (e.e === 'upgraded') { const tw = e.t; seen.add(tw.type + ':' + e.path + (e.path === 'a' ? tw.a : tw.b)); }
        if (t % 300 === 0) {
          for (const z of s.zombies) if (!isFinite(z.x) || !isFinite(z.z) || !isFinite(z.hp) || !isFinite(z.d)) bad(def.id + ' zombie ' + z.type + ' not finite at round ' + s.round);
          for (const p of s.players) if (!isFinite(p.coins) || p.coins < 0 || !isFinite(p.x)) bad(def.id + ' player ' + p.id + ' coins ' + p.coins);
          for (const tw of s.towers) { for (const k of ['dmg', 'rate', 'range']) if (tw.st[k] != null && !isFinite(tw.st[k])) bad(def.id + ' tower ' + tw.type + ' ' + k + ' ' + tw.st[k]); if (tw.a > 1 && tw.b > 1) bad(def.id + ' tower ' + tw.type + ' has both paths past 1'); }
          // a save and a load in the middle keeps everything
          if (s.wave.state === 'wait' && s.round > 5 && s.round % 7 === 0) {
            const sv = JSON.parse(JSON.stringify(CC.save(s)));
            const s2 = CC.load({ map: def, rounds, crew }, sv);
            if (s2.towers.length !== s.towers.length || s2.round !== s.round || Math.ceil(s2.lives) !== Math.ceil(s.lives)) bad(def.id + ' save/load differs at round ' + s.round);
            CC.snapshot(s2); CC.fullState(s2);
          }
        }
      }
      CC.snapshot(s); CC.fullState(s);
    } catch (e) { bad(def.id + ' crew ' + crewN + ' crashed at round ' + s.round + ': ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
    console.log(def.id.padEnd(8) + ' crew ' + crewN + ': round ' + s.round + (s.result ? ' (' + s.result + ')' : '') + ', ' + s.towers.length + ' towers, lives ' + Math.ceil(s.lives) + ', kills ' + s.stats.kills);
  }
}
const all = []; for (const k of types) for (const p of ['a', 'b']) for (let n = 1; n <= 3; n++) all.push(k + ':' + p + n);
const missing = all.filter((k) => !seen.has(k));
console.log('upgrades bought: ' + seen.size + ' of ' + all.length + (missing.length ? ' (never: ' + missing.join(' ') + ')' : ''));
console.log(problems ? problems + ' PROBLEMS' : 'PASS: no problems');
