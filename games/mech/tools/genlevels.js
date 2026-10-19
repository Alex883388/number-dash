// Makes Mech Blaster's 50 levels (content/levels.json) from set pieces: a seeded generator lays out enemy waves,
// obstacles, pickups and question gates along the road, gentle at first and harder world by world, with a boss
// every tenth level. tools/check.js then lets a test pilot play every level to prove it can be cleared.
// Usage: node games/mech/tools/genlevels.js [--only N]
const fs = require('fs'), path = require('path');

const NAMES = [
  'First Steps', 'Walker Way', 'Laser Lane', 'Turret Town', 'Bike Rush', 'Mine Sweep', 'Block Party', 'Night Patrol', 'Neon Storm', 'Iron Crab',
  'Rolling Rocks', 'Shield Wall', 'Mirage Run', 'Sandstorm', 'Bomber Skies', 'Canyon Chase', 'Oasis Raid', 'Dune Dash', 'Desert Fury', 'Sand Scorpion',
  'Snowball Slope', 'Spider Pass', 'Frozen Fort', 'Icicle Alley', 'Blizzard Run', 'Sentinel Ridge', 'Glacier Gauntlet', 'Aurora Road', 'Avalanche', 'Frost Titan',
  'Lava Vents', 'Ash Road', 'Rival Run', 'Magma Mile', 'Forge Works', 'Ember Storm', 'Molten Maze', 'Fire Fortress', 'Volcano Heart', 'Magma Dragon',
  'Launch Deck', 'Zero-G Lane', 'Carrier Strike', 'Asteroid Belt', 'Star Bridge', 'Nebula Rush', 'Orbit Siege', 'Comet Chase', 'Final Approach', 'Omega Core'
];
const BOSS = { 10: 'crab', 20: 'scorpion', 30: 'titan', 40: 'dragon', 50: 'omega' };
// the level where each enemy or obstacle first appears (it gets a briefing card there)
const INTRO = { drone: 1, crate: 1, walker: 2, barrier: 2, fence: 3, turret: 4, bike: 5, mine: 6, block: 7, boulder: 11, shield: 12, bomber: 15,
  spider: 22, sentinel: 26, geyser: 31, rival: 33, carrier: 43 };

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// set pieces: each adds events at road distance d and returns how long it is (metres)
const PIECES = {
  drones(r, d, ev, k) { const n = 2 + Math.floor(r() * (1.6 + k.n * 2.6)); const form = Math.floor(r() * 3); for (let i = 0; i < n; i++) ev.push([d + i * 4, 'drone', form === 0 ? i % 3 : form === 1 ? [1, 0, 2, 1][i % 4] : Math.floor(r() * 3)]); return n * 4; },
  walkers(r, d, ev, k) { const n = 1 + Math.floor(r() * (1.6 + k.n * 2)); for (let i = 0; i < n; i++) ev.push([d + i * 9, 'walker', (i + Math.floor(r() * 3)) % 3]); return n * 9; },
  turret(r, d, ev, k) { const on = r() < 0.35 + k.n * 0.25; ev.push([d, 'turret', on ? Math.floor(r() * 3) : r() < 0.5 ? -1 : 3]); if (k.n > 0.5 && r() < 0.4) ev.push([d + 18, 'turret', r() < 0.5 ? -1 : 3]); return 24; },
  bikes(r, d, ev, k) { const n = 1 + Math.floor(r() * (1.5 + k.n * 2.2)); for (let i = 0; i < n; i++) ev.push([d + i * 16, 'bike', Math.floor(r() * 3)]); return n * 16; },
  shields(r, d, ev, k) { const n = 1 + (r() < k.n * 0.8 ? 1 : 0); for (let i = 0; i < n; i++) ev.push([d + i * 12, 'shield', (i * 2 + Math.floor(r() * 2)) % 3]); return n * 12; },
  bomber(r, d, ev) { ev.push([d, 'bomber', Math.floor(r() * 3)]); return 30; },
  spider(r, d, ev, k) { ev.push([d, 'spider', Math.floor(r() * 3)]); if (r() < k.n) ev.push([d + 6, 'drone', Math.floor(r() * 3)]); return 18; },
  sentinel(r, d, ev, k) { ev.push([d, 'sentinel', r() < 0.5 ? -1 : 3]); if (r() < k.n * 0.6) ev.push([d + 26, 'sentinel', r() < 0.5 ? -1 : 3]); return 30; },
  rival(r, d, ev) { ev.push([d, 'rival', Math.floor(r() * 3)]); return 40; },
  carrier(r, d, ev) { ev.push([d, 'carrier', 1]); return 50; },
  crates(r, d, ev) { const free = Math.floor(r() * 3); for (let l = 0; l < 3; l++) if (l !== free && r() < 0.8) ev.push([d, 'crate', l]); return 6; },
  barrier(r, d, ev, k) { const n = r() < 0.5 + k.n * 0.3 ? 2 : 1, free = Math.floor(r() * 3); let c = 0; for (let l = 0; l < 3 && c < n; l++) if (l !== free) { ev.push([d, 'barrier', l]); c++; } return 6; },
  block(r, d, ev, k) { const free = Math.floor(r() * 3), two = r() < 0.4 + k.n * 0.4; for (let l = 0; l < 3; l++) if (l !== free && (two || l === (free + 1) % 3)) ev.push([d, 'block', l]); return 8; },
  fence(r, d, ev) { ev.push([d, 'fence', 1]); return 8; },
  mines(r, d, ev, k) { const n = 2 + Math.floor(r() * (2 + k.n * 2)); for (let i = 0; i < n; i++) ev.push([d + i * 5, 'mine', Math.floor(r() * 3)]); return n * 5; },
  boulder(r, d, ev, k) { const n = 1 + (r() < k.n * 0.7 ? 1 : 0); for (let i = 0; i < n; i++) ev.push([d + i * 14, 'boulder', Math.floor(r() * 3)]); return n * 14; },
  geysers(r, d, ev, k) { const n = 1 + (r() < 0.5 + k.n * 0.3 ? 1 : 0); for (let i = 0; i < n; i++) ev.push([d + i * 7, 'geyser', Math.floor(r() * 3)]); return n * 7 + 4; }
};
// which pieces each kind of thing comes in
const PIECE_OF = { drone: 'drones', walker: 'walkers', turret: 'turret', bike: 'bikes', shield: 'shields', bomber: 'bomber', spider: 'spider', sentinel: 'sentinel',
  rival: 'rival', carrier: 'carrier', crate: 'crates', barrier: 'barrier', block: 'block', fence: 'fence', mine: 'mines', boulder: 'boulder', geyser: 'geysers' };
// what each world adds to the mix, and how often (weights)
const WORLD_MIX = [
  { drone: 5, walker: 4, crate: 2, barrier: 2, fence: 1.5, turret: 3, bike: 3, mine: 2, block: 2 },
  { drone: 3, walker: 3, crate: 1.5, barrier: 1.5, fence: 1.5, turret: 2.5, bike: 3, mine: 2, block: 2, boulder: 3, shield: 4, bomber: 3.5 },
  { drone: 3, walker: 2, crate: 1, barrier: 1.5, fence: 1.5, turret: 2.5, bike: 2.5, mine: 1.5, block: 2, boulder: 3, shield: 3, bomber: 2.5, spider: 4, sentinel: 3.5 },
  { drone: 3, walker: 2, crate: 1, barrier: 1, fence: 1.5, turret: 2, bike: 2.5, mine: 1.5, block: 2, boulder: 2, shield: 3, bomber: 2.5, spider: 3, sentinel: 3, geyser: 3.5, rival: 3.5 },
  { drone: 3, walker: 2, crate: 1, barrier: 1, fence: 1.5, turret: 2, bike: 2.5, mine: 1.5, block: 2, boulder: 1.5, shield: 3, bomber: 3, spider: 3, sentinel: 3, geyser: 1, rival: 3.5, carrier: 3 }
];
const OBSTACLE = { crate: 1, barrier: 1, block: 1, fence: 1, mine: 1, boulder: 1, geyser: 1 };

function makeLevel(n, tune) {
  const r = mulberry(n * 2654435761 + 97), w = Math.floor((n - 1) / 10), inWorld = (n - 1) % 10;
  // k.n: how hard inside the game (0..1); intensity grows inside a world and from world to world
  const k = { n: Math.min(1, (n - 1) / 46) };
  const L = { id: n, w: w, name: NAMES[n - 1], v: +(10 + 3 * k.n).toFixed(2), curve: +(0.6 + r() * 0.8).toFixed(2), hill: +(0.5 + r() * 0.9).toFixed(2), intro: [], ev: [] };
  for (const [thing, at] of Object.entries(INTRO)) if (at === n) L.intro.push(thing);
  const ev = L.ev;
  const known = (thing) => INTRO[thing] <= n;
  if (BOSS[n]) {
    L.boss = BOSS[n];
    L.len = 360;
    let d = 70;
    for (const p of ['drones', w >= 1 ? 'shields' : 'walkers', w >= 2 ? 'spider' : 'bikes']) { if (!PIECES[p]) continue; d += PIECES[p](r, d, ev, k) + 34; }
    ev.push([d - 10, 'pick', 1, 'repair']);
    ev.push([d + 20, 'boss', BOSS[n]]);
    L.ev.sort((a, b) => a[0] - b[0]);
    return L;
  }
  L.len = Math.round(640 + 560 * k.n + inWorld * 12);
  const gates = n <= 3 ? 2 : n <= 19 ? 3 : 4;
  const gateAt = [];
  for (let i = 0; i < gates; i++) gateAt.push(Math.round(L.len * (0.22 + 0.7 * (i + 0.5) / gates)));
  const mix = Object.assign({}, WORLD_MIX[w]);
  for (const thing of Object.keys(mix)) if (!known(thing)) delete mix[thing];
  // the new thing of this level shows up early and often
  for (const thing of L.intro) if (mix[thing]) mix[thing] *= 2.5;
  const pick = () => { const tot = Object.values(mix).reduce((a, b) => a + b, 0); let x = r() * tot; for (const [thing, wt] of Object.entries(mix)) { x -= wt; if (x <= 0) return thing; } return Object.keys(mix)[0]; };
  const gap = () => (tune.gap0 + (tune.gap1 - tune.gap0) * k.n) * (0.85 + r() * 0.35);
  let d = 60, gi = 0, last = '';
  // the first new thing comes alone, early
  if (L.intro.length) { const first = L.intro.find((x) => PIECE_OF[x] && mix[x]) || L.intro[0]; if (PIECE_OF[first]) { d += PIECES[PIECE_OF[first]](r, d, ev, { n: Math.min(k.n, 0.2) }) + 40; last = first; } }
  let sincePick = 0;
  while (d < L.len - 50) {
    if (gi < gateAt.length && d > gateAt[gi] - 45) {
      d = Math.max(d + 10, gateAt[gi]);
      ev.push([d, 'gate']);
      gi++;
      d += 40;
      continue;
    }
    let thing = pick();
    for (let tries = 0; tries < 4 && (thing === last || (OBSTACLE[thing] && OBSTACLE[last])); tries++) thing = pick();
    d += PIECES[PIECE_OF[thing]](r, d, ev, k) + gap();
    // obstacles sometimes come together with an enemy wave
    if (!OBSTACLE[thing] && r() < 0.25 + k.n * 0.4) { const o = ['crate', 'barrier', 'mine', 'fence'].filter(known); if (o.length) { const p = o[Math.floor(r() * o.length)]; PIECES[PIECE_OF[p]](r, d - gap() * 0.45, ev, k); } }
    last = thing;
    sincePick += 1;
    if (sincePick >= tune.pickEvery && d < L.len - 70) { ev.push([d - 8, 'pick', Math.floor(r() * 3), r() < 0.65 ? 'repair' : r() < 0.5 ? 'shield' : 'power']); sincePick = 0; }
    if (r() < 0.2) { const lane = Math.floor(r() * 3); for (let i = 0; i < 4; i++) ev.push([d - 20 + i * 4, 'pick', lane, 'gem']); }
  }
  while (gi < gateAt.length) { ev.push([Math.max(d, gateAt[gi]), 'gate']); d = Math.max(d, gateAt[gi]) + 40; gi++; }
  L.len = Math.max(L.len, d + 20);
  if (n > 39) ev.push([Math.round(L.len * 0.5), 'pick', 1, 'nova']);
  for (const e of ev) e[0] = Math.round(e[0]);
  L.len = Math.round(L.len);
  ev.sort((a, b) => a[0] - b[0]);
  return L;
}

const TUNE = { gap0: 24, gap1: 12, pickEvery: 6 };
function build(tune) {
  const levels = [];
  for (let n = 1; n <= 50; n++) levels.push(makeLevel(n, Object.assign({}, TUNE, tune || {})));
  return levels;
}
module.exports = { build, makeLevel, NAMES, INTRO, BOSS, TUNE };
if (require.main === module) {
  const levels = build();
  const out = { format: 1, levels: levels };
  const file = path.join(__dirname, '..', 'content', 'levels.json');
  // one level per line keeps the file readable and the diffs small
  fs.writeFileSync(file, '{"format":1,"levels":[\n' + levels.map((l) => JSON.stringify(l)).join(',\n') + '\n]}\n');
  const evs = levels.reduce((t, l) => t + l.ev.length, 0);
  console.log('wrote content/levels.json: 50 levels, ' + evs + ' events; lengths ' + levels.map((l) => l.len).join(' '));
  void out;
}
