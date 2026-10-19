/* games/castle/src/engine.js — Castle Crew's world and rules, shared by the page (the host runs it) and the balance
   simulator (Node can require it). No page, no three.js, no timers.
   The map is a square grid of tiles (1 unit each; x to the east, z to the south); the castle sits in the middle.
   Zombies come in waves from spawn gates at the edge and walk a flow field to the castle; crew players fight them
   with weapons, chop trees and mine rocks for wood and stone, and build turrets and barricades. One host runs step()
   30 times a second; each player's device moves its own player (moveCircle) and sends the position and what it wants
   to do (fire, weapon, gather, build, upgrade, ready). step() returns events (shots, hits, deaths, building...) that
   the page turns into pictures and sounds and the host sends to the other devices. */
const CC = (function () {
  const TICK = 1 / 30;
  // tiles. Walkable: grass, dirt, sand, spawn, bridge. Trees, rocks, water and the castle block; turrets and barricades
  // block too, but zombies may break through them.
  const T = { GRASS: 0, DIRT: 1, SAND: 2, WATER: 3, TREE: 4, ROCK: 5, CASTLE: 6, SPAWN: 7, BRIDGE: 8 };
  const WALK = [1, 1, 1, 0, 0, 0, 0, 1, 1];
  const BUILD_OK = [1, 1, 1, 0, 0, 0, 0, 0, 0];

  /* ---- the crew's weapons. type: phys (blaster, arrows), fire, frost, blast (explosions), magic (lightning) ---- */
  const WEAPONS = {
    blaster: { name: 'Blaster', icon: '🔫', kind: 'shot', type: 'phys', dmg: 9, rate: 4, range: 6.5, speed: 15, unlock: 1, tip: 'Quick shots at anything nearby.' },
    hammer: { name: 'Hammer', icon: '🔨', kind: 'melee', type: 'phys', dmg: 30, rate: 1.4, range: 1.7, arc: 130, knock: 1.4, unlock: 1, tip: 'Big hits up close. Knocks zombies back and chops trees fast.' },
    scatter: { name: 'Scatter Gun', icon: '💥', kind: 'shot', type: 'phys', dmg: 6, pellets: 6, spread: 42, rate: 1.3, range: 4.6, speed: 14, unlock: 3, tip: 'A spray of pellets: great when zombies bunch up.' },
    flamer: { name: 'Flamer', icon: '🔥', kind: 'cone', type: 'fire', dmg: 3, rate: 12, range: 3.3, arc: 55, burn: { dps: 4, t: 3 }, unlock: 4, tip: 'Burns everything in front. Knights hate it.' },
    crossbow: { name: 'Crossbow', icon: '🏹', kind: 'shot', type: 'phys', dmg: 34, pierce: 4, rate: 0.9, range: 9, speed: 22, unlock: 5, tip: 'Long range. Each bolt goes through four zombies.' },
    frost: { name: 'Frost Wand', icon: '❄️', kind: 'shot', type: 'frost', dmg: 7, rate: 2.2, range: 7, speed: 12, splash: 0.9, slow: { f: 0.45, t: 2.5 }, unlock: 6, tip: 'Slows zombies down. Fast ones hate it.' },
    bomb: { name: 'Bomb Launcher', icon: '💣', kind: 'lob', type: 'blast', dmg: 46, rate: 0.7, range: 8, speed: 9, splash: 1.6, unlock: 8, tip: 'Lobs bombs over walls. Cracks armour.' },
    lightning: { name: 'Lightning Staff', icon: '⚡', kind: 'chain', type: 'magic', dmg: 17, rate: 1.2, range: 6.5, jumps: 4, jumpRange: 2.6, falloff: 0.8, unlock: 11, tip: 'Zaps one zombie, then jumps to its friends. Ghosts hate it.' }
  };
  const WEAPON_ORDER = ['blaster', 'hammer', 'scatter', 'flamer', 'crossbow', 'frost', 'bomb', 'lightning'];

  /* ---- turrets and barricades (cost from the team's wood, stone and gold; level 2 and 3 cost gold) ---- */
  const TURRETS = {
    arrow: { name: 'Arrow Tower', icon: '🏹', cost: { wood: 6 }, hp: 160, kind: 'shot', type: 'phys', dmg: 8, rate: 1.6, range: 6, speed: 17, unlock: 1, tip: 'Shoots arrows at the zombie nearest the castle.' },
    wall: { name: 'Barricade', icon: '🧱', cost: { wood: 2 }, hp: 200, kind: 'wall', unlock: 1, tip: 'Blocks the path. Zombies walk round it or have to break it.' },
    cannon: { name: 'Cannon', icon: '💣', cost: { wood: 4, stone: 6 }, hp: 230, kind: 'lob', type: 'blast', dmg: 30, rate: 0.6, range: 6.5, speed: 10, splash: 1.4, unlock: 4, tip: 'Explodes on groups. Good against armour.' },
    frost: { name: 'Frost Tower', icon: '❄️', cost: { stone: 6, gold: 15 }, hp: 170, kind: 'aura', type: 'frost', dps: 2, range: 3.5, slow: { f: 0.5, t: 0.4 }, unlock: 6, tip: 'Slows every zombie near it.' },
    tesla: { name: 'Tesla Coil', icon: '⚡', cost: { stone: 8, gold: 25 }, hp: 190, kind: 'chain', type: 'magic', dmg: 18, rate: 0.9, range: 5, jumps: 4, jumpRange: 2.6, falloff: 0.8, unlock: 11, tip: 'Lightning that jumps from zombie to zombie.' },
    flame: { name: 'Flame Tower', icon: '🔥', cost: { wood: 4, stone: 4, gold: 10 }, hp: 190, kind: 'cone', type: 'fire', dmg: 4, rate: 8, range: 3.2, arc: 70, burn: { dps: 4, t: 3 }, unlock: 12, tip: 'Burns zombies that come close.' },
    mortar: { name: 'Mortar', icon: '🎯', cost: { stone: 10, gold: 20 }, hp: 210, kind: 'lob', type: 'blast', dmg: 46, rate: 0.35, range: 10.5, min: 3, speed: 7, splash: 1.8, unlock: 16, tip: 'Very long range and big blasts, but it cannot hit close.' },
    shrine: { name: 'Healing Shrine', icon: '💖', cost: { wood: 6, gold: 20 }, hp: 160, kind: 'heal', heal: 7, range: 3.2, unlock: 17, tip: 'Heals the crew and repairs turrets near it.' }
  };
  const TURRET_ORDER = ['arrow', 'wall', 'cannon', 'frost', 'tesla', 'flame', 'mortar', 'shrine'];
  const UP_DMG = [1, 1.55, 2.2], UP_RANGE = [1, 1.1, 1.2], UP_HP = [1, 1.3, 1.6];
  const upgradeCost = (type, lvl) => { const c = TURRETS[type].cost, sum = (c.wood || 0) + (c.stone || 0) + (c.gold || 0); return Math.round((12 + sum * 0.8) * (lvl === 1 ? 1 : 1.8)); };

  /* ---- zombies. res: damage taken per type (1 = normal). size scales the model and the body radius. ---- */
  const ZOMBIES = {
    walker: { name: 'Walker', hp: 30, speed: 1.0, dmg: 8, gold: 1, size: 1, tip: 'Slow and steady. There are lots of them.' },
    runner: { name: 'Runner', hp: 18, speed: 2.1, dmg: 5, gold: 1, size: 0.85, tip: 'Fast! Slow them down or hit them early.' },
    brute: { name: 'Brute', hp: 170, speed: 0.7, dmg: 22, gold: 6, size: 1.5, heavy: true, tip: 'Huge and tough. Hit it with everything.' },
    knight: { name: 'Knight', hp: 70, speed: 0.9, dmg: 10, gold: 4, res: { phys: 0.3, blast: 1.5, fire: 1.3 }, tip: 'Armour stops arrows and bullets. Use fire or bombs.' },
    spitter: { name: 'Spitter', hp: 34, speed: 0.9, dmg: 7, gold: 3, ranged: { range: 4.5, rate: 0.6, speed: 7 }, tip: 'Spits slime at turrets from far away.' },
    bomber: { name: 'Bomber', hp: 35, speed: 1.45, dmg: 45, gold: 3, explode: { r: 1.8 }, tip: 'Blows up when it gets close. Pop it from far away.' },
    ghost: { name: 'Ghost', hp: 45, speed: 1.0, dmg: 8, gold: 4, fly: true, res: { phys: 0.3, magic: 1.6, frost: 1.2 }, tip: 'Floats over water and walls. Magic and frost hurt it.' },
    frosty: { name: 'Frosty', hp: 65, speed: 0.95, dmg: 10, gold: 4, res: { frost: 0, fire: 2 }, noSlow: true, tip: 'Made of ice: frost does nothing, fire melts it.' },
    blaze: { name: 'Blaze', hp: 65, speed: 1.0, dmg: 10, gold: 4, res: { fire: 0, frost: 2 }, noBurn: true, tip: 'On fire: flames do nothing, frost puts it out.' },
    digger: { name: 'Digger', hp: 55, speed: 1.1, dmg: 10, gold: 5, dig: { speed: 2.4, pop: 4.5 }, tip: 'Tunnels under the ground and pops up near the castle.' },
    blob: { name: 'Blob', hp: 80, speed: 0.8, dmg: 10, gold: 4, size: 1.2, split: { type: 'mini', n: 3 }, tip: 'Splits into three little blobs.' },
    mini: { name: 'Little Blob', hp: 15, speed: 1.8, dmg: 4, gold: 0, size: 0.6, tip: 'Small and quick.' },
    shield: { name: 'Shield Bearer', hp: 90, speed: 0.85, dmg: 12, gold: 5, shield: { arc: 140, blocks: { phys: 1, fire: 1, frost: 1 } }, tip: 'Its shield blocks shots from the front. Use bombs, lightning, or hit it from behind.' },
    shaman: { name: 'Shaman', hp: 55, speed: 0.8, dmg: 6, gold: 6, heal: { r: 3, hps: 6 }, tip: 'Heals the zombies around it. Get it first!' },
    king: { name: 'Zombie King', hp: 1250, speed: 0.55, dmg: 35, gold: 100, size: 2.4, heavy: true, boss: true, summon: { types: ['walker'], n: 3, every: 8 }, tip: 'The boss! It calls walkers to help.' },
    witch: { name: 'Swamp Witch', hp: 1500, speed: 0.5, dmg: 20, gold: 150, size: 2.2, heavy: true, boss: true, fly: true, res: { phys: 0.6, magic: 1.4 }, summon: { types: ['ghost'], n: 2, every: 10 }, tip: 'A flying boss that calls ghosts. Use magic!' },
    colossus: { name: 'Colossus', hp: 3600, speed: 0.5, dmg: 55, gold: 250, size: 3, heavy: true, boss: true, summon: { types: ['runner', 'knight'], n: 4, every: 9 }, stomp: { every: 9, r: 3, dmg: 25 }, tip: 'The biggest zombie of all. It stomps and calls knights.' }
  };
  const ZOMBIE_ORDER = Object.keys(ZOMBIES);
  const CASTLE_R = 2.5;   // the castle is 5 x 5 tiles

  /* ---- random numbers: mulberry32, the seed kept in the state so a game can be replayed ---- */
  function rngNext(s) {
    s.rng = (s.rng + 0x6D2B79F5) | 0;
    let t = s.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const rnd = (s, a, b) => a + (b - a) * rngNext(s);

  /* ================= the map ================= */
  const SIDES = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0], NE: [1, -1], NW: [-1, -1], SE: [1, 1], SW: [-1, 1] };
  function genMap(cfg, seed) {
    const w = cfg.size || 29, h = w, c = (w - 1) / 2, R = { rng: seed | 0 };
    const tiles = new Uint8Array(w * h).fill(T.GRASS), hgt = new Float32Array(w * h);
    const at = (x, y) => y * w + x, inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
    for (let i = 0; i < w * h; i++) hgt[i] = rnd(R, 0, 0.08);
    // the sea around the island: the outer ring, with a ragged shore
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (d === 0 || (d === 1 && rngNext(R) < 0.35)) tiles[at(x, y)] = T.WATER;
    }
    // the castle: 5 x 5 in the middle
    for (let y = c - 2; y <= c + 2; y++) for (let x = c - 2; x <= c + 2; x++) tiles[at(x, y)] = T.CASTLE;
    // spawn gates two tiles in from the edge
    const spawns = (cfg.spawns || ['N']).map((k) => {
      const d = SIDES[k], off = cfg.offsets && cfg.offsets[k] ? cfg.offsets[k] : 0;
      let x = Math.round(c + d[0] * (c - 2)), y = Math.round(c + d[1] * (c - 2));
      if (d[0] === 0) x += off; else if (d[1] === 0) y += off;
      return { key: k, x: x, y: y };
    });
    const keep = new Uint8Array(w * h);   // squares kept clear: roads, the castle yard, the gates
    for (let y = c - 4; y <= c + 4; y++) for (let x = c - 4; x <= c + 4; x++) keep[at(x, y)] = 1;
    spawns.forEach((s) => { for (let y = s.y - 1; y <= s.y + 1; y++) for (let x = s.x - 1; x <= s.x + 1; x++) if (inside(x, y)) { keep[at(x, y)] = 1; if (tiles[at(x, y)] === T.WATER) tiles[at(x, y)] = T.SAND; } });
    // a river across the map with bridges, if asked for
    if (cfg.river) {
      const vertical = cfg.river === 'v';
      let p = Math.round(c + (rngNext(R) < 0.5 ? -1 : 1) * rnd(R, 5, c - 5));
      for (let q = 1; q < w - 1; q++) {
        if (rngNext(R) < 0.3) p += rngNext(R) < 0.5 ? -1 : 1;
        p = Math.max(4, Math.min(w - 5, p));
        for (let k = 0; k < 2; k++) { const x = vertical ? p + k : q, y = vertical ? q : p + k; if (!keep[at(x, y)]) tiles[at(x, y)] = T.WATER; }
      }
    }
    // lakes
    for (let k = 0; k < (cfg.lakes || 0); k++) {
      let x = Math.round(rnd(R, 4, w - 5)), y = Math.round(rnd(R, 4, h - 5)), tries = 0;
      while ((Math.abs(x - c) < 7 && Math.abs(y - c) < 7) && tries++ < 20) { x = Math.round(rnd(R, 4, w - 5)); y = Math.round(rnd(R, 4, h - 5)); }
      const size = Math.round(rnd(R, 6, 14));
      for (let n = 0; n < size; n++) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (inside(xx, yy) && !keep[at(xx, yy)] && Math.abs(dx) + Math.abs(dy) < 2 + (rngNext(R) < 0.4)) tiles[at(xx, yy)] = T.WATER;
        }
        x = Math.max(3, Math.min(w - 4, x + Math.round(rnd(R, -1, 1)))); y = Math.max(3, Math.min(h - 4, y + Math.round(rnd(R, -1, 1))));
      }
    }
    // roads: from each gate to the castle, round the water (bridges where a road must cross)
    const castleGate = (s) => {
      const dx = s.x - c, dy = s.y - c;
      return Math.abs(dx) >= Math.abs(dy) ? { x: c + Math.sign(dx) * 3, y: c } : { x: c, y: c + Math.sign(dy) * 3 };
    };
    for (const s of spawns) {
      const g = castleGate(s), cost = new Float32Array(w * h).fill(Infinity), from = new Int32Array(w * h).fill(-1);
      const wobble = new Float32Array(w * h); for (let i = 0; i < w * h; i++) wobble[i] = rnd(R, 0, 0.9);
      cost[at(s.x, s.y)] = 0;
      const open = [at(s.x, s.y)];
      while (open.length) {
        let bi = 0; for (let k = 1; k < open.length; k++) if (cost[open[k]] < cost[open[bi]]) bi = k;
        const i = open.splice(bi, 1)[0], x = i % w, y = (i - x) / w;
        if (x === g.x && y === g.y) break;
        for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + ddx, yy = y + ddy;
          if (!inside(xx, yy) || Math.min(xx, yy, w - 1 - xx, h - 1 - yy) < 1) continue;
          const j = at(xx, yy), t = tiles[j];
          if (t === T.CASTLE) continue;
          const step = 1 + wobble[j] + (t === T.WATER ? 6 : 0) + (t === T.DIRT ? -0.6 : 0);
          if (cost[i] + step < cost[j]) { if (cost[j] === Infinity) open.push(j); cost[j] = cost[i] + step; from[j] = i; }
        }
      }
      for (let i = at(g.x, g.y); i >= 0; i = from[i]) { if (tiles[i] === T.WATER) tiles[i] = T.BRIDGE; else if (tiles[i] !== T.BRIDGE) tiles[i] = T.DIRT; keep[i] = 1; }
    }
    // sand along the water
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = at(x, y);
      if (tiles[i] !== T.GRASS) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (tiles[at(x + dx, y + dy)] === T.WATER && rngNext(R) < 0.7) { tiles[i] = T.SAND; break; }
    }
    // forests and rock fields: clusters on free grass
    const scatter = (density, tile, cluster) => {
      const want = Math.round(w * h * density);
      let placed = 0, guard = 0;
      while (placed < want && guard++ < want * 40) {
        let x = Math.round(rnd(R, 2, w - 3)), y = Math.round(rnd(R, 2, h - 3));
        const n = Math.round(rnd(R, 2, cluster));
        for (let k = 0; k < n && placed < want; k++) {
          const i = at(x, y);
          if (inside(x, y) && (tiles[i] === T.GRASS || tiles[i] === T.SAND) && !keep[i]) { tiles[i] = tile; placed++; }
          x += Math.round(rnd(R, -1, 1)); y += Math.round(rnd(R, -1, 1));
          if (!inside(x, y)) break;
        }
      }
    };
    scatter(cfg.trees == null ? 0.12 : cfg.trees, T.TREE, 9);
    scatter(cfg.rocks == null ? 0.05 : cfg.rocks, T.ROCK, 6);
    spawns.forEach((s) => { tiles[at(s.x, s.y)] = T.SPAWN; });
    // every gate must reach the castle on foot: open a tree or rock that blocks (never water: the roads crossed it)
    const map = { w: w, h: h, c: c, tiles: tiles, hgt: hgt, spawns: spawns, seed: seed, life: new Uint8Array(w * h) };
    for (let i = 0; i < w * h; i++) map.life[i] = tiles[i] === T.TREE ? 3 : tiles[i] === T.ROCK ? 4 : 0;
    return map;
  }
  const tileAt = (m, x, z) => (x < 0 || z < 0 || x >= m.w || z >= m.h ? T.WATER : m.tiles[(z | 0) * m.w + (x | 0)]);

  /* ================= a new game ================= */
  // level: the level's data (content/levels.json); crew: [{ id, name, slot }]; unlocks: { weapons, turrets }
  function newGame(level, crew, seed, unlocks) {
    const map = genMap(level.map, level.map.seed || seed || 1);
    const n = Math.max(1, crew.length);
    const s = {
      v: 1, level: level.n, seed: seed | 0, rng: (seed | 0) ^ 0x5bd1e995, t: 0, tick: 0, nextId: 1,
      map: map, occ: new Int16Array(map.w * map.h), flow: null, flyFlow: null,
      castle: { hp: level.castle || 600, max: level.castle || 600, x: map.c + 0.5, z: map.c + 0.5 },
      res: { wood: (level.start && level.start.wood) || 0, stone: (level.start && level.start.stone) || 0, gold: (level.start && level.start.gold) || 0 },
      crewN: n, hpMul: 1 + 0.32 * (n - 1), countMul: 1 + 0.3 * (n - 1),
      unlocks: unlocks || { weapons: ['blaster', 'hammer'], turrets: ['arrow', 'wall'] },
      players: crew.map((p, k) => newPlayer(map, p, p.slot != null ? p.slot : k)),
      zombies: [], turrets: [], shots: [], foes: [],
      waves: level.waves, wave: { idx: 0, state: 'build', timer: level.waves[0].build || 30, groups: [], fight: 0 },
      result: '', stats: { kills: 0, built: 0, chopped: 0, mined: 0, castleHits: 0 }
    };
    s.flow = flowField(s, false);
    s.flyFlow = null;
    return s;
  }
  function newPlayer(map, p, k) {
    const at = gatePoint(map, k);
    return { id: p.id, slot: k, name: p.name || 'Player ' + (k + 1), x: at.x, z: at.z, rot: 0, hp: 100, max: 100, weapon: 'blaster', cd: 0, down: 0, fire: false, act: '', actT: 0, gather: -1, gatherT: 0, kills: 0, aimRot: 0 };
  }
  // a crew member joins a game that is already running, or leaves it
  function addPlayer(s, p) {
    const had = s.players.find((q) => q.id === p.id);
    if (had) return had;
    const used = new Set(s.players.map((q) => q.slot));
    let slot = p.slot != null && !used.has(p.slot) ? p.slot : 0;
    while (used.has(slot)) slot++;
    const np = newPlayer(s.map, p, slot), f = freeSpot(s, np.x, np.z);   // a tower may stand on the door now
    np.x = f[0]; np.z = f[1];
    s.players.push(np);
    return np;
  }
  function removePlayer(s, id) { s.players = s.players.filter((q) => q.id !== id); }
  // where a player stands at the castle's door (four doors, one per player slot)
  function gatePoint(map, k) {
    const c = map.c + 0.5, d = [[0, 3.4], [0, -3.4], [3.4, 0], [-3.4, 0]][k % 4];
    return { x: c + d[0], z: c + d[1] };
  }

  /* ================= movement ================= */
  // a circle of radius r moves by (dx, dz) and slides along blocked tiles. solid(x, z) tells which tiles block.
  // A tile it already overlaps (a tower built at its edge, a revive beside one) lets it move out, never deeper in.
  // Returns [x, z, the index of the tile it pushed against or -1].
  function moveCircle(s, x, z, dx, dz, r, solid) {
    let hit = -1;
    const m = s.map, blocked = (tx, tz) => solid(tx, tz);
    const gap2 = (px, pz, tx, tz) => { const cx = Math.max(tx, Math.min(px, tx + 1)), cz = Math.max(tz, Math.min(pz, tz + 1)); return (px - cx) * (px - cx) + (pz - cz) * (pz - cz); };
    const tryAxis = (ox, oz, nx, nz) => {
      const x0 = Math.floor(nx - r), x1 = Math.floor(nx + r), z0 = Math.floor(nz - r), z1 = Math.floor(nz + r);
      for (let tz = z0; tz <= z1; tz++) for (let tx = x0; tx <= x1; tx++) {
        if (!blocked(tx, tz)) continue;
        const d2 = gap2(nx, nz, tx, tz);
        if (d2 >= r * r - 1e-6) continue;
        const o2 = gap2(ox, oz, tx, tz);
        if (o2 < r * r - 1e-6 && d2 >= o2 - 1e-9) continue;
        if (tx >= 0 && tz >= 0 && tx < m.w && tz < m.h) hit = tz * m.w + tx;
        return false;
      }
      return true;
    };
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / (r * 0.8)));
    for (let k = 0; k < steps; k++) {
      const sx = dx / steps, sz = dz / steps;
      if (tryAxis(x, z, x + sx, z)) x += sx;
      if (tryAxis(x, z, x, z + sz)) z += sz;
    }
    return [x, z, hit];
  }
  // a player's solid tiles: water, trees, rocks, the castle, turrets, the map's edge
  const playerSolid = (s) => (tx, tz) => {
    const m = s.map;
    if (tx < 0 || tz < 0 || tx >= m.w || tz >= m.h) return true;
    const i = tz * m.w + tx;
    return !WALK[m.tiles[i]] || s.occ[i] > 0;
  };
  // move a player (the page, a client and the bots all use this)
  function movePlayer(s, p, dx, dz) {
    const r = moveCircle(s, p.x, p.z, dx, dz, 0.32, playerSolid(s));
    p.x = r[0]; p.z = r[1];
    return r[2];
  }

  /* ================= the flow field: how far each tile is from the castle, for zombies ================= */
  // Dijkstra over walkable tiles from the castle; turrets and barricades cost extra (zombies break through them when
  // the way round is much longer). fly: ghosts float over everything.
  const BREAK_COST = 9;
  function flowField(s, fly) {
    const m = s.map, W = m.w, n = W * m.h, d = new Float64Array(n).fill(1e9);
    const heap = [];
    const push = (i, v) => { heap.push([v, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let b = k; if (l < heap.length && heap[l][0] < heap[b][0]) b = l; if (r < heap.length && heap[r][0] < heap[b][0]) b = r; if (b === k) break; [heap[b], heap[k]] = [heap[k], heap[b]]; k = b; } } return top; };
    for (let i = 0; i < n; i++) if (m.tiles[i] === T.CASTLE) { d[i] = 0; push(i, 0); }
    const pass = (i) => fly || WALK[m.tiles[i]];
    while (heap.length) {
      const [v, i] = pop();
      if (v > d[i]) continue;
      const x = i % W, y = (i - x) / W;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= m.h) continue;
        const j = yy * W + xx;
        if (m.tiles[j] === T.CASTLE || !pass(j)) continue;
        if (dx && dy && !fly && (!pass(y * W + xx) || !pass(yy * W + x) || s.occ[y * W + xx] > 0 || s.occ[yy * W + x] > 0)) continue;   // no cutting corners
        const c = (dx && dy ? 1.414 : 1) + (!fly && s.occ[j] > 0 ? BREAK_COST : 0);
        if (v + c < d[j]) { d[j] = v + c; push(j, v + c); }
      }
    }
    return d;
  }
  function refreshFlow(s) { s.flow = flowField(s, false); }

  /* ================= zombies ================= */
  function spawnZombie(s, type, x, z, ev) {
    const Z = ZOMBIES[type], hp = Math.round(Z.hp * (Z.boss ? 1 + 0.45 * (s.crewN - 1) : s.hpMul));
    const zb = { id: s.nextId++, type: type, x: x, z: z, rot: 0, hp: hp, max: hp, r: 0.3 * (Z.size || 1), slowT: 0, slowF: 1, burnT: 0, burnD: 0, atk: 0, act: '', actT: 0,
      under: Z.dig ? 1 : 0, sumT: Z.summon ? Z.summon.every * 0.6 : 0, stompT: Z.stomp ? Z.stomp.every : 0, spitT: 0, next: -1, stuck: 0, kb: [0, 0], hitT: 0 };
    s.zombies.push(zb);
    if (ev) ev.push({ e: 'spawn', id: zb.id, z: type, x: x, y: z });
    return zb;
  }
  // the tile a zombie heads for: the neighbour nearest the castle
  function nextTile(s, zb, flow) {
    const m = s.map, W = m.w, tx = zb.x | 0, tz = zb.z | 0;
    const open = (x, y) => x >= 0 && y >= 0 && x < W && y < m.h && WALK[m.tiles[y * W + x]] && !s.occ[y * W + x];
    let best = -1, bv = flow[tz * W + tx] - 1e-3;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const xx = tx + dx, yy = tz + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= m.h) continue;
      if (dx && dy && (!open(tx + dx, tz) || !open(tx, tz + dy))) continue;   // never cut a corner past a tree or a turret
      const j = yy * W + xx;
      if (flow[j] < bv) { bv = flow[j]; best = j; }
    }
    return best;
  }
  const dist2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);
  // the castle's nearest point to (x, z) and the distance to it
  function castleDist(s, x, z) {
    const c = s.castle, nx = Math.max(c.x - CASTLE_R, Math.min(x, c.x + CASTLE_R)), nz = Math.max(c.z - CASTLE_R, Math.min(z, c.z + CASTLE_R));
    return Math.sqrt(dist2(x, z, nx, nz));
  }

  /* ---- damage ---- */
  function hurtZombie(s, zb, amount, type, fromX, fromZ, ev, extra) {
    if (zb.hp <= 0 || zb.under) return 0;
    const Z = ZOMBIES[zb.type];
    if (Z.shield && Z.shield.blocks[type] && fromX != null) {
      // blocked when the hit comes from the front half it faces
      const a = Math.atan2(fromX - zb.x, fromZ - zb.z), diff = Math.abs(((a - zb.rot + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff < (Z.shield.arc / 2) * Math.PI / 180) { if (Math.random() < 0.35) ev.push({ e: 'block', x: zb.x, y: zb.z }); return 0; }
    }
    const mul = Z.res && Z.res[type] != null ? Z.res[type] : 1;
    const d = amount * mul;
    if (d <= 0) { if (Math.random() < 0.25) ev.push({ e: 'immune', x: zb.x, y: zb.z }); return 0; }
    zb.hp -= d;
    if (d >= 1) zb.hitT = 0.15;
    if (extra) {
      if (extra.slow && !Z.noSlow && mul > 0) { zb.slowT = Math.max(zb.slowT, extra.slow.t); zb.slowF = Math.min(zb.slowF, 1 - extra.slow.f); }
      if (extra.burn && !Z.noBurn && mul > 0) { zb.burnT = Math.max(zb.burnT, extra.burn.t); zb.burnD = Math.max(zb.burnD, extra.burn.dps * mul); }
      if (extra.knock && !Z.heavy) { const a = Math.atan2(zb.x - fromX, zb.z - fromZ); zb.kb[0] += Math.sin(a) * extra.knock; zb.kb[1] += Math.cos(a) * extra.knock; }
    }
    if (zb.hp <= 0) killZombie(s, zb, ev, extra && extra.by);
    return d;
  }
  function killZombie(s, zb, ev, by) {
    const Z = ZOMBIES[zb.type];
    zb.hp = 0;
    s.stats.kills++;
    const gold = Z.gold;
    if (gold) { s.res.gold += gold; }
    ev.push({ e: 'die', id: zb.id, z: zb.type, x: zb.x, y: zb.z, g: gold });
    if (by != null) { const p = s.players.find((q) => q.id === by); if (p) p.kills++; }
    if (Z.split) for (let k = 0; k < Z.split.n; k++) { const a = (k / Z.split.n) * Math.PI * 2; spawnZombie(s, Z.split.type, zb.x + Math.sin(a) * 0.4, zb.z + Math.cos(a) * 0.4, ev); }
    if (Z.explode) explode(s, zb.x, zb.z, Z.explode.r, Z.dmg * 0.8, ev, 'zombies');   // popped early: it only hurts zombies
  }
  // an explosion: 'all' hurts the crew, turrets and the castle (a bomber reaching them); 'zombies' only zombies
  function explode(s, x, z, r, dmg, ev, who) {
    ev.push({ e: 'boom', x: x, y: z, r: r });
    if (who === 'zombies') { for (const zb of s.zombies) if (zb.hp > 0 && dist2(zb.x, zb.z, x, z) < r * r) hurtZombie(s, zb, dmg, 'blast', x, z, ev); return; }
    for (const p of s.players) if (!p.down && dist2(p.x, p.z, x, z) < r * r) hurtPlayer(s, p, dmg, ev);
    for (const t of s.turrets) if (t.hp > 0 && dist2(t.x, t.z, x, z) < (r + 0.4) * (r + 0.4)) hurtTurret(s, t, dmg, ev);
    if (castleDist(s, x, z) < r) hurtCastle(s, dmg, ev);
  }
  function hurtPlayer(s, p, d, ev) {
    if (p.down) return;
    p.hp -= d;
    ev.push({ e: 'ouch', id: p.id, d: Math.round(d) });
    if (p.hp <= 0) { p.hp = 0; p.down = 5; ev.push({ e: 'down', id: p.id, x: p.x, y: p.z }); }
  }
  function hurtTurret(s, t, d, ev) {
    if (t.hp <= 0) return;
    t.hp -= d;
    if (t.hp <= 0) {
      t.hp = 0;
      s.occ[t.tz * s.map.w + t.tx] = 0;
      ev.push({ e: 'wreck', id: t.id, x: t.x, y: t.z });
      refreshFlow(s);
    }
  }
  function hurtCastle(s, d, ev) {
    if (s.castle.hp <= 0) return;
    s.castle.hp = Math.max(0, s.castle.hp - d);
    s.stats.castleHits += d;
    ev.push({ e: 'castle', d: Math.round(d) });
  }

  /* ---- each zombie, each tick ---- */
  function stepZombie(s, zb, dt, ev, near) {
    const Z = ZOMBIES[zb.type], m = s.map;
    if (zb.hitT > 0) zb.hitT -= dt;
    // burning and slowed
    if (zb.burnT > 0) { zb.burnT -= dt; hurtZombie(s, zb, zb.burnD * dt, 'fire', null, null, ev); if (zb.hp <= 0) return; }
    if (zb.slowT > 0) { zb.slowT -= dt; if (zb.slowT <= 0) zb.slowF = 1; }
    let speed = Z.speed * (zb.slowT > 0 ? zb.slowF : 1);
    // knockback slides it away
    if (zb.kb[0] || zb.kb[1]) {
      const kx = zb.kb[0] * Math.min(1, dt * 8), kz = zb.kb[1] * Math.min(1, dt * 8);
      const r = moveCircle(s, zb.x, zb.z, kx, kz, zb.r, zombieSolid(s, zb));
      zb.x = r[0]; zb.z = r[1]; zb.kb[0] -= kx; zb.kb[1] -= kz;
      if (Math.abs(zb.kb[0]) + Math.abs(zb.kb[1]) < 0.02) zb.kb = [0, 0];
    }
    // a digger tunnels until it is close to the castle
    if (zb.under) {
      const cd = castleDist(s, zb.x, zb.z);
      if (cd < Z.dig.pop) { const f = freeSpot(s, zb.x, zb.z); zb.x = f[0]; zb.z = f[1]; zb.under = 0; zb.next = -1; ev.push({ e: 'emerge', id: zb.id, x: zb.x, y: zb.z }); }
      else { const a = Math.atan2(s.castle.x - zb.x, s.castle.z - zb.z); zb.rot = a; zb.x += Math.sin(a) * Z.dig.speed * dt; zb.z += Math.cos(a) * Z.dig.speed * dt; return; }
    }
    // a shaman heals its friends; a boss calls helpers and stomps
    if (Z.heal) for (const o of near(zb.x, zb.z, Z.heal.r)) if (o.hp > 0 && o.hp < o.max) { o.hp = Math.min(o.max, o.hp + Z.heal.hps * dt); if (Math.random() < dt * 2) ev.push({ e: 'heal', x: o.x, y: o.z }); }
    if (Z.summon) { zb.sumT -= dt; if (zb.sumT <= 0) { zb.sumT = Z.summon.every; for (let k = 0; k < Z.summon.n; k++) { const a = rnd(s, 0, Math.PI * 2), type = Z.summon.types[k % Z.summon.types.length]; spawnZombie(s, type, zb.x + Math.sin(a) * 1.4, zb.z + Math.cos(a) * 1.4, ev); } ev.push({ e: 'summon', x: zb.x, y: zb.z }); } }
    if (Z.stomp) { zb.stompT -= dt; if (zb.stompT <= 0) { zb.stompT = Z.stomp.every; ev.push({ e: 'stomp', x: zb.x, y: zb.z, r: Z.stomp.r }); for (const p of s.players) if (!p.down && dist2(p.x, p.z, zb.x, zb.z) < Z.stomp.r * Z.stomp.r) hurtPlayer(s, p, Z.stomp.dmg, ev); for (const t of s.turrets) if (t.hp > 0 && dist2(t.x, t.z, zb.x, zb.z) < Z.stomp.r * Z.stomp.r) hurtTurret(s, t, Z.stomp.dmg, ev); } }
    zb.atk = Math.max(0, zb.atk - dt);
    // what is in reach: a crew member close by, a turret in the way, the castle
    let target = null, tdist = 1e9;
    for (const p of s.players) {
      if (p.down) continue;
      const d = Math.sqrt(dist2(p.x, p.z, zb.x, zb.z));
      if (d < 2.4 && d < tdist) { target = { kind: 'p', p: p, x: p.x, z: p.z, reach: zb.r + 0.45 }; tdist = d; }
    }
    // spitters spit from afar at turrets, the crew or the castle
    if (Z.ranged) {
      zb.spitT -= dt;
      let aim = null, ad = Z.ranged.range;
      const cd = castleDist(s, zb.x, zb.z);
      const free = (x, z) => { const m = s.map, n = Math.ceil(Math.hypot(x - zb.x, z - zb.z) / 0.3); for (let k = 1; k < n; k++) { const t = tileAt(m, zb.x + (x - zb.x) * k / n, zb.z + (z - zb.z) * k / n); if (t === T.TREE || t === T.ROCK) return false; } return true; };
      if (cd < ad) { const cx = Math.max(s.castle.x - CASTLE_R, Math.min(zb.x, s.castle.x + CASTLE_R)), cz = Math.max(s.castle.z - CASTLE_R, Math.min(zb.z, s.castle.z + CASTLE_R)); if (free(cx, cz)) { aim = { x: cx, z: cz }; ad = cd; } }
      for (const t of s.turrets) if (t.hp > 0) { const d = Math.sqrt(dist2(t.x, t.z, zb.x, zb.z)); if (d < ad && free(t.x, t.z)) { aim = t; ad = d; } }
      for (const p of s.players) if (!p.down) { const d = Math.sqrt(dist2(p.x, p.z, zb.x, zb.z)); if (d < ad && free(p.x, p.z)) { aim = p; ad = d; } }
      if (aim) {
        zb.rot = turnTo(zb.rot, Math.atan2(aim.x - zb.x, aim.z - zb.z), dt * 6);
        if (zb.spitT <= 0) {
          zb.spitT = 1 / Z.ranged.rate;
          const dd = Math.max(0.1, Math.sqrt(dist2(aim.x, aim.z, zb.x, zb.z))), sp = Z.ranged.speed;
          s.foes.push({ x: zb.x, z: zb.z, vx: (aim.x - zb.x) / dd * sp, vz: (aim.z - zb.z) / dd * sp, life: dd / sp + 0.1, dmg: Z.dmg });
          ev.push({ e: 'spit', x: zb.x, y: zb.z, tx: aim.x, ty: aim.z, sp: sp });
        }
        return;
      }
    }
    const cd = castleDist(s, zb.x, zb.z);
    if (cd <= zb.r + 0.15 && (!target || cd < tdist)) target = { kind: 'c', x: s.castle.x, z: s.castle.z, reach: 99 };
    // which way: ghosts float straight at the castle, the others follow the flow field
    let goalX, goalZ;
    if (Z.fly) { goalX = s.castle.x; goalZ = s.castle.z; }
    else {
      const ti = zb.x | 0, tj = zb.z | 0;
      if (zb.next < 0 || ((zb.next % m.w) + 0.5 - zb.x) ** 2 + (((zb.next / m.w) | 0) + 0.5 - zb.z) ** 2 < 0.09 || s.flow[zb.next] >= s.flow[tj * m.w + ti]) zb.next = nextTile(s, zb, s.flow);
      if (zb.next >= 0) {
        const occ = s.occ[zb.next];
        if (occ > 0) {
          // a turret or barricade stands on the next tile: break it
          const t = s.turrets.find((q) => q.id === occ);
          if (t && t.hp > 0) { const d = Math.sqrt(dist2(t.x, t.z, zb.x, zb.z)); if (!target || d < tdist) target = { kind: 't', t: t, x: t.x, z: t.z, reach: zb.r + 0.75 }; }
        }
        goalX = (zb.next % m.w) + 0.5; goalZ = ((zb.next / m.w) | 0) + 0.5;
      } else { goalX = s.castle.x; goalZ = s.castle.z; }
    }
    // attack what is in reach, or walk
    if (target) {
      const d = target.kind === 'c' ? cd : Math.sqrt(dist2(target.x, target.z, zb.x, zb.z));
      if (target.kind === 'c' || d <= target.reach) {
        zb.rot = turnTo(zb.rot, Math.atan2(target.x - zb.x, target.z - zb.z), dt * 8);
        if (Z.explode) { zb.hp = 0; ev.push({ e: 'die', id: zb.id, z: zb.type, x: zb.x, y: zb.z, g: 0 }); explode(s, zb.x, zb.z, Z.explode.r, Z.dmg, ev, 'all'); return; }
        if (zb.atk <= 0) {
          zb.atk = 1.1; zb.act = 'hit'; zb.actT = 0.3;
          if (target.kind === 'p') hurtPlayer(s, target.p, Z.dmg, ev);
          else if (target.kind === 't') hurtTurret(s, target.t, Z.dmg, ev);
          else hurtCastle(s, Z.dmg, ev);
          ev.push({ e: 'bite', id: zb.id });
        }
        return;
      }
      if (target.kind === 'p') { goalX = target.x; goalZ = target.z; }
    }
    if (zb.actT > 0) zb.actT -= dt;
    const a = Math.atan2(goalX - zb.x, goalZ - zb.z);
    zb.rot = turnTo(zb.rot, a, dt * 7);
    const step = speed * dt;
    if (Z.fly) { zb.x += Math.sin(a) * step; zb.z += Math.cos(a) * step; }
    else {
      const r = moveCircle(s, zb.x, zb.z, Math.sin(a) * step, Math.cos(a) * step, zb.r, zombieSolid(s, zb));
      if (Math.abs(r[0] - zb.x) + Math.abs(r[1] - zb.z) < step * 0.2) zb.stuck += dt; else zb.stuck = 0;
      zb.x = r[0]; zb.z = r[1];
      if (zb.stuck > 1.5) { zb.next = -1; zb.stuck = 0; zb.x += rnd(s, -0.2, 0.2); zb.z += rnd(s, -0.2, 0.2); }
    }
  }
  // the centre of the nearest walkable, empty tile to (x, z)
  function freeSpot(s, x, z) {
    const m = s.map;
    for (let r = 0; r < 6; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const tx = (x | 0) + dx, tz = (z | 0) + dz;
      if (tx < 1 || tz < 1 || tx >= m.w - 1 || tz >= m.h - 1) continue;
      const i = tz * m.w + tx;
      if (WALK[m.tiles[i]] && !s.occ[i]) return r === 0 ? [x, z] : [tx + 0.5, tz + 0.5];
    }
    return [x, z];
  }
  const zombieSolid = (s, zb) => (tx, tz) => {
    const m = s.map;
    if (tx < 0 || tz < 0 || tx >= m.w || tz >= m.h) return true;
    const i = tz * m.w + tx;
    return !WALK[m.tiles[i]] || s.occ[i] > 0;
  };
  function turnTo(a, b, k) {
    let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    if (Math.abs(d) < k) return b;
    return a + Math.sign(d) * k;
  }

  /* ================= the crew's weapons and the turrets ================= */
  // can a shot fly straight from one point to another? Trees, rocks and the castle stop it (the shooter's own tile and
  // the target's do not count)
  function clearShot(s, x0, z0, x1, z1) {
    const m = s.map, n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25), a = (z0 | 0) * m.w + (x0 | 0), b = (z1 | 0) * m.w + (x1 | 0);
    for (let k = 1; k < n; k++) {
      const x = x0 + (x1 - x0) * k / n, z = z0 + (z1 - z0) * k / n, i = (z | 0) * m.w + (x | 0);
      if (i === a || i === b) continue;
      const t = m.tiles[i];
      if (t === T.TREE || t === T.ROCK || t === T.CASTLE) return false;
    }
    return true;
  }
  // the zombies in range, best first: players aim at the nearest; turrets at the one nearest the castle. sight: only
  // zombies a straight shot can reach (bullets and arrows; bombs fly over, lightning and flames do not need it)
  function pickTarget(s, x, z, range, minRange, byCastle, sight) {
    let best = null, bv = 1e9;
    for (const zb of s.zombies) {
      if (zb.hp <= 0 || zb.under) continue;
      const d2 = dist2(zb.x, zb.z, x, z);
      if (d2 > range * range || (minRange && d2 < minRange * minRange)) continue;
      const v = byCastle ? castleDist(s, zb.x, zb.z) : d2;
      if (v < bv && (!sight || clearShot(s, x, z, zb.x, zb.z))) { bv = v; best = zb; }
    }
    return best;
  }
  // fire one weapon (a crew member's or a turret's) at a target; owner: a player id or null (a turret)
  function fireAt(s, W, lvl, x, z, target, owner, ev, src) {
    const dmgMul = UP_DMG[(lvl || 1) - 1] || 1, rangeMul = UP_RANGE[(lvl || 1) - 1] || 1, by = owner;
    const a = Math.atan2(target.x - x, target.z - z);
    if (W.kind === 'shot') {
      const n = W.pellets || 1;
      for (let k = 0; k < n; k++) {
        const aa = a + (n > 1 ? ((k / (n - 1)) - 0.5) * (W.spread * Math.PI / 180) + rnd(s, -0.05, 0.05) : 0);
        const range = W.range * rangeMul;
        s.shots.push({ x: x, z: z, vx: Math.sin(aa) * W.speed, vz: Math.cos(aa) * W.speed, life: range / W.speed + 0.05, dmg: W.dmg * dmgMul, type: W.type, pierce: W.pierce || 1, hits: [], splash: W.splash || 0, slow: W.slow, by: by, src: src });
      }
      ev.push({ e: 'shot', k: src, x: x, y: z, a: a, n: n, sp: W.speed, l: W.range * rangeMul, spread: W.spread || 0 });
    } else if (W.kind === 'lob') {
      const d = Math.sqrt(dist2(target.x, target.z, x, z)), t = Math.max(0.35, d / W.speed);
      s.shots.push({ lob: true, x: x, z: z, tx: target.x, tz: target.z, t: t, life: t, dmg: W.dmg * dmgMul, type: W.type, splash: W.splash, by: by, src: src });
      ev.push({ e: 'lob', k: src, x: x, y: z, tx: target.x, ty: target.z, t: t });
    } else if (W.kind === 'chain') {
      const pts = [[x, z]], hit = new Set();
      let cur = target, dmg = W.dmg * dmgMul;
      for (let j = 0; j < W.jumps && cur; j++) {
        hit.add(cur);
        pts.push([cur.x, cur.z]);
        hurtZombie(s, cur, dmg, W.type, x, z, ev, { by: by });
        dmg *= W.falloff;
        let nxt = null, nd = W.jumpRange * W.jumpRange;
        for (const o of s.zombies) { if (o.hp <= 0 || o.under || hit.has(o)) continue; const d2 = dist2(o.x, o.z, cur.x, cur.z); if (d2 < nd) { nd = d2; nxt = o; } }
        cur = nxt;
      }
      ev.push({ e: 'zap', k: src, pts: pts.map((p) => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]) });
    } else if (W.kind === 'cone') {
      const range = W.range * rangeMul, half = (W.arc / 2) * Math.PI / 180;
      for (const zb of s.zombies) {
        if (zb.hp <= 0 || zb.under) continue;
        const d2 = dist2(zb.x, zb.z, x, z);
        if (d2 > range * range) continue;
        const b = Math.atan2(zb.x - x, zb.z - z), diff = Math.abs(((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (diff <= half || d2 < 0.5) hurtZombie(s, zb, W.dmg * dmgMul, W.type, x, z, ev, { burn: W.burn, by: by });
      }
      if (Math.random() < 0.5) ev.push({ e: 'flame', k: src, x: x, y: z, a: a, l: range });
    } else if (W.kind === 'melee') {
      const half = (W.arc / 2) * Math.PI / 180;
      for (const zb of s.zombies) {
        if (zb.hp <= 0 || zb.under) continue;
        const d = Math.sqrt(dist2(zb.x, zb.z, x, z));
        if (d > W.range + zb.r) continue;
        const b = Math.atan2(zb.x - x, zb.z - z), diff = Math.abs(((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (diff <= half) hurtZombie(s, zb, W.dmg * dmgMul, W.type, x, z, ev, { knock: W.knock, by: by });
      }
      ev.push({ e: 'swing', k: src, x: x, y: z, a: a });
    }
    return a;
  }
  // projectiles in flight
  function stepShots(s, dt, ev, near) {
    for (const sh of s.shots) {
      if (sh.dead) continue;
      sh.life -= dt;
      if (sh.lob) {
        if (sh.life <= 0) { sh.dead = true; ev.push({ e: 'boom', x: sh.tx, y: sh.tz, r: sh.splash }); for (const zb of near(sh.tx, sh.tz, sh.splash + 0.4)) if (dist2(zb.x, zb.z, sh.tx, sh.tz) < (sh.splash + zb.r) ** 2) hurtZombie(s, zb, sh.dmg, sh.type, sh.tx, sh.tz, ev, { by: sh.by }); }
        continue;
      }
      const nx = sh.x + sh.vx * dt, nz = sh.z + sh.vz * dt;
      // hit the first zombie along the way
      let hitZ = null, ht = 2;
      for (const zb of near((sh.x + nx) / 2, (sh.z + nz) / 2, 1.2)) {
        if (zb.hp <= 0 || zb.under || sh.hits.indexOf(zb.id) >= 0) continue;
        const t = segCircle(sh.x, sh.z, nx, nz, zb.x, zb.z, zb.r + 0.08);
        if (t >= 0 && t < ht) { ht = t; hitZ = zb; }
      }
      if (hitZ) {
        sh.hits.push(hitZ.id);
        if (sh.splash) { ev.push({ e: 'pop', x: hitZ.x, y: hitZ.z, t: sh.type }); for (const zb of near(hitZ.x, hitZ.z, sh.splash + 0.4)) if (dist2(zb.x, zb.z, hitZ.x, hitZ.z) < (sh.splash + zb.r) ** 2) hurtZombie(s, zb, sh.dmg, sh.type, sh.x, sh.z, ev, { slow: sh.slow, by: sh.by }); }
        else { hurtZombie(s, hitZ, sh.dmg, sh.type, sh.x, sh.z, ev, { slow: sh.slow, by: sh.by }); ev.push({ e: 'hit', x: hitZ.x, y: hitZ.z, t: sh.type }); }
        if (sh.hits.length >= sh.pierce) { sh.dead = true; continue; }
      }
      sh.x = nx; sh.z = nz;
      if (sh.life <= 0) sh.dead = true;
      else { const t = tileAt(s.map, sh.x, sh.z); if (t === T.TREE || t === T.ROCK || t === T.CASTLE) sh.dead = true; }
    }
    s.shots = s.shots.filter((q) => !q.dead);
    // zombie spit flies at the crew, turrets and the castle
    for (const f of s.foes) {
      f.life -= dt;
      f.x += f.vx * dt; f.z += f.vz * dt;
      let done = f.life <= 0;
      const ft = tileAt(s.map, f.x, f.z);
      if (ft === T.TREE || ft === T.ROCK) done = true;
      for (const p of s.players) if (!done && !p.down && dist2(p.x, p.z, f.x, f.z) < 0.35 * 0.35) { hurtPlayer(s, p, f.dmg, ev); done = true; }
      for (const t of s.turrets) if (!done && t.hp > 0 && dist2(t.x, t.z, f.x, f.z) < 0.5 * 0.5) { hurtTurret(s, t, f.dmg, ev); done = true; }
      if (!done && castleDist(s, f.x, f.z) < 0.2) { hurtCastle(s, f.dmg * 0.5, ev); done = true; }   // slime is meant for turrets: the castle shrugs off half
      if (done) { f.dead = true; ev.push({ e: 'splat', x: f.x, y: f.z }); }
    }
    s.foes = s.foes.filter((q) => !q.dead);
  }
  // where along a segment a circle is first touched (0..1), or -1
  function segCircle(x0, z0, x1, z1, cx, cz, r) {
    const dx = x1 - x0, dz = z1 - z0, fx = x0 - cx, fz = z0 - cz;
    const a = dx * dx + dz * dz, b = 2 * (fx * dx + fz * dz), c = fx * fx + fz * fz - r * r;
    if (c <= 0) return 0;
    if (a < 1e-9) return -1;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return -1;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t >= 0 && t <= 1 ? t : -1;
  }

  /* ================= building ================= */
  const canAfford = (s, cost) => (s.res.wood >= (cost.wood || 0)) && (s.res.stone >= (cost.stone || 0)) && (s.res.gold >= (cost.gold || 0));
  function canBuild(s, type, tx, tz, p) {
    const m = s.map, U = TURRETS[type];
    if (!U || s.unlocks.turrets.indexOf(type) < 0) return { ok: false, why: 'locked' };
    if (tx < 1 || tz < 1 || tx >= m.w - 1 || tz >= m.h - 1) return { ok: false, why: 'edge' };
    const i = tz * m.w + tx;
    if (!BUILD_OK[m.tiles[i]] || s.occ[i] > 0) return { ok: false, why: 'blocked' };
    for (const sp of m.spawns) if (Math.abs(sp.x - tx) <= 1 && Math.abs(sp.y - tz) <= 1) return { ok: false, why: 'gate' };
    if (p && dist2(p.x, p.z, tx + 0.5, tz + 0.5) > 7 * 7) return { ok: false, why: 'far' };
    for (const q of s.players) if (!q.down && Math.abs(q.x - (tx + 0.5)) < 0.8 && Math.abs(q.z - (tz + 0.5)) < 0.8) return { ok: false, why: 'player' };
    if (!canAfford(s, U.cost)) return { ok: false, why: 'cost' };
    return { ok: true };
  }
  function build(s, type, tx, tz, p, ev) {
    const can = canBuild(s, type, tx, tz, p);
    if (!can.ok) { ev.push({ e: 'nobuild', id: p ? p.id : null, why: can.why }); return null; }
    const U = TURRETS[type];
    s.res.wood -= U.cost.wood || 0; s.res.stone -= U.cost.stone || 0; s.res.gold -= U.cost.gold || 0;
    const t = { id: s.nextId++, type: type, tx: tx, tz: tz, x: tx + 0.5, z: tz + 0.5, lvl: 1, hp: U.hp, max: U.hp, cd: 0.4, rot: 0, by: p ? p.id : null };
    s.turrets.push(t);
    s.occ[tz * s.map.w + tx] = t.id;
    s.stats.built++;
    // a zombie standing on the new turret's tile steps off
    for (const zb of s.zombies) if ((zb.x | 0) === tx && (zb.z | 0) === tz && !ZOMBIES[zb.type].fly) { zb.x += zb.x < tx + 0.5 ? -0.6 : 0.6; zb.next = -1; }
    refreshFlow(s);
    ev.push({ e: 'built', t: turretInfo(t) });
    return t;
  }
  const turretInfo = (t) => ({ id: t.id, type: t.type, tx: t.tx, tz: t.tz, lvl: t.lvl, hp: Math.round(t.hp), max: t.max });
  function upgrade(s, id, p, ev) {
    const t = s.turrets.find((q) => q.id === id);
    if (!t || t.hp <= 0 || t.lvl >= 3 || TURRETS[t.type].kind === 'wall') return false;
    if (p && dist2(p.x, p.z, t.x, t.z) > 3 * 3) return false;
    const g = upgradeCost(t.type, t.lvl);
    if (s.res.gold < g) { ev.push({ e: 'nobuild', id: p ? p.id : null, why: 'cost' }); return false; }
    s.res.gold -= g;
    t.lvl++;
    const max = Math.round(TURRETS[t.type].hp * UP_HP[t.lvl - 1]);
    t.hp += max - t.max; t.max = max;
    ev.push({ e: 'upgraded', t: turretInfo(t) });
    return true;
  }
  function stepTurret(s, t, dt, ev) {
    const U = TURRETS[t.type];
    if (U.kind === 'wall') return;
    const rangeMul = UP_RANGE[t.lvl - 1], dmgMul = UP_DMG[t.lvl - 1];
    if (U.kind === 'aura') {
      for (const zb of s.zombies) if (zb.hp > 0 && !zb.under && dist2(zb.x, zb.z, t.x, t.z) < (U.range * rangeMul) ** 2) hurtZombie(s, zb, U.dps * dmgMul * dt, U.type, null, null, ev, { slow: U.slow });
      t.rot += dt * 1.5;
      return;
    }
    if (U.kind === 'heal') {
      const r2 = (U.range * rangeMul) ** 2, h = U.heal * dmgMul * dt;
      for (const p of s.players) if (!p.down && dist2(p.x, p.z, t.x, t.z) < r2 && p.hp < p.max) p.hp = Math.min(p.max, p.hp + h);
      for (const o of s.turrets) if (o.hp > 0 && o !== t && dist2(o.x, o.z, t.x, t.z) < r2 && o.hp < o.max) o.hp = Math.min(o.max, o.hp + h);
      if (castleDist(s, t.x, t.z) < U.range * rangeMul && s.castle.hp > 0) s.castle.hp = Math.min(s.castle.max, s.castle.hp + h * 0.3);
      t.rot += dt;
      return;
    }
    t.cd -= dt;
    const target = pickTarget(s, t.x, t.z, U.range * rangeMul, U.min, true, U.kind === 'shot');
    if (target) t.rot = turnTo(t.rot, Math.atan2(target.x - t.x, target.z - t.z), dt * 7);
    if (t.cd > 0 || !target) return;
    t.cd = 1 / U.rate;
    fireAt(s, U, t.lvl, t.x, t.z, target, null, ev, 't:' + t.type);
  }

  /* ================= the crew ================= */
  function stepPlayer(s, p, inp, dt, ev) {
    if (p.down > 0) {
      p.down -= dt;
      if (p.down <= 0) { const g = gatePoint(s.map, p.slot), f = freeSpot(s, g.x, g.z); p.down = 0; p.hp = p.max; p.x = f[0]; p.z = f[1]; ev.push({ e: 'up', id: p.id }); }
      return;
    }
    if (inp) {
      if (typeof inp.x === 'number' && typeof inp.z === 'number' && isFinite(inp.x) && isFinite(inp.z)) {
        // trust the device's own movement, but not through walls: snap back if it says it stands inside something
        const tx = inp.x | 0, tz = inp.z | 0;
        if (!playerSolid(s)(tx, tz)) { p.x = inp.x; p.z = inp.z; }
      }
      if (typeof inp.rot === 'number') p.rot = inp.rot;
      if (inp.weapon && WEAPONS[inp.weapon] && s.unlocks.weapons.indexOf(inp.weapon) >= 0) p.weapon = inp.weapon;
      p.fire = !!inp.fire;
      p.gather = typeof inp.gather === 'number' ? inp.gather : -1;
      if (inp.build) build(s, inp.build.type, inp.build.tx, inp.build.tz, p, ev);
      if (inp.upgrade) upgrade(s, inp.upgrade, p, ev);
      if (inp.ready && s.wave.state === 'build') s.wave.ready = (s.wave.ready || 0) | (1 << p.slot);
    }
    if (p.hp < p.max) p.hp = Math.min(p.max, p.hp + dt * 2);   // a crew member heals slowly
    p.cd -= dt;
    if (p.actT > 0) p.actT -= dt;
    // chop a tree or mine a rock the player pushes against
    if (p.gather >= 0) {
      const m = s.map, i = p.gather, t = m.tiles[i];
      const gx = (i % m.w) + 0.5, gz = ((i / m.w) | 0) + 0.5;
      if ((t === T.TREE || t === T.ROCK) && dist2(gx, gz, p.x, p.z) < 1.3 * 1.3) {
        p.gatherT += dt * (p.weapon === 'hammer' ? 2 : 1);
        if (p.gatherT >= 0.45) {
          p.gatherT = 0; p.act = t === T.TREE ? 'chop' : 'mine'; p.actT = 0.25;
          m.life[i] = Math.max(0, m.life[i] - 1);
          ev.push({ e: 'chop', i: i, kind: t === T.TREE ? 'tree' : 'rock', left: m.life[i], id: p.id });
          if (m.life[i] <= 0) {
            m.tiles[i] = T.GRASS;
            if (t === T.TREE) { s.res.wood += 3; s.stats.chopped++; } else { s.res.stone += 3; s.stats.mined++; }
            ev.push({ e: 'tile', i: i, t: T.GRASS, got: t === T.TREE ? 'wood' : 'stone', n: 3, x: gx, y: gz });
            refreshFlow(s);
          }
        }
        return;
      }
      p.gatherT = 0;
    }
    // fire: at the nearest zombie in range (auto-aim)
    if (p.fire && p.cd <= 0) {
      const W = WEAPONS[p.weapon];
      const target = pickTarget(s, p.x, p.z, W.range, 0, false, W.kind === 'shot');
      if (target) {
        p.cd = 1 / W.rate;
        p.rot = fireAt(s, W, 1, p.x, p.z, target, p.id, ev, 'p:' + p.weapon + ':' + p.id);
        p.act = 'fire'; p.actT = 0.15;
        p.aimRot = p.rot;
      }
    }
  }

  /* ================= waves ================= */
  function startWave(s, ev) {
    const w = s.waves[s.wave.idx];
    s.wave.state = 'fight'; s.wave.fight = 0; s.wave.ready = 0;
    s.wave.groups = w.groups.map((g) => ({ z: g.z, left: Math.max(1, Math.round(g.n * (ZOMBIES[g.z].boss ? 1 : s.countMul))), every: g.every || 1.5, next: g.after || 0, from: g.from }));
    ev.push({ e: 'wave', idx: s.wave.idx, state: 'fight' });
  }
  function spawnPoint(s, from) {
    const sp = s.map.spawns;
    let g = from === 'any' || !from ? sp[Math.floor(rnd(s, 0, sp.length))] : sp.find((q) => q.key === from) || sp[0];
    return { x: g.x + 0.5 + rnd(s, -0.3, 0.3), z: g.y + 0.5 + rnd(s, -0.3, 0.3) };
  }
  function stepWaves(s, dt, ev) {
    const W = s.wave;
    if (W.state === 'build') {
      W.timer -= dt;
      const all = s.players.reduce((m, p) => m | (1 << p.slot), 0);
      if (W.timer <= 0 || (all && (W.ready & all) === all)) startWave(s, ev);
      return;
    }
    if (W.state !== 'fight') return;
    W.fight += dt;
    for (const g of W.groups) {
      if (g.left <= 0) continue;
      g.next -= dt;
      while (g.next <= 0 && g.left > 0) { const at = spawnPoint(s, g.from); spawnZombie(s, g.z, at.x, at.z, ev); g.left--; g.next += g.every; }
    }
    const spawning = W.groups.some((g) => g.left > 0);
    if (!spawning && !s.zombies.length) {
      const bonus = s.waves[W.idx].bonus || 0;
      if (bonus) s.res.gold += bonus;
      ev.push({ e: 'cleared', idx: W.idx, bonus: bonus });
      if (W.idx + 1 >= s.waves.length) { W.state = 'won'; s.result = 'won'; ev.push({ e: 'won' }); return; }
      W.idx++;
      W.state = 'build'; W.timer = s.waves[W.idx].build || 15; W.ready = 0;
      // between waves: the crew is healed and turrets are patched up a little
      for (const p of s.players) if (!p.down) p.hp = p.max;
      for (const t of s.turrets) if (t.hp > 0) t.hp = Math.min(t.max, t.hp + t.max * 0.5);
      ev.push({ e: 'wave', idx: W.idx, state: 'build' });
    }
  }

  /* ================= one tick ================= */
  // inputs: { playerId: { x, z, rot, fire, weapon, gather, build: { type, tx, tz }, upgrade: turretId, ready } }
  function step(s, dt, inputs) {
    const ev = [];
    if (s.result) return ev;
    s.t += dt; s.tick++;
    // a coarse grid of the zombies, rebuilt each tick, for "who is near here"
    const G = new Map();
    for (const zb of s.zombies) { if (zb.hp <= 0) continue; const k = ((zb.x / 2) | 0) + ((zb.z / 2) | 0) * 1000; let a = G.get(k); if (!a) G.set(k, a = []); a.push(zb); }
    const near = (x, z, r) => {
      const out = [], x0 = ((x - r) / 2) | 0, x1 = ((x + r) / 2) | 0, z0 = ((z - r) / 2) | 0, z1 = ((z + r) / 2) | 0;
      for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) { const a = G.get(gx + gz * 1000); if (a) for (const o of a) out.push(o); }
      return out;
    };
    for (const p of s.players) stepPlayer(s, p, inputs && inputs[p.id], dt, ev);
    stepWaves(s, dt, ev);
    for (const t of s.turrets) if (t.hp > 0) stepTurret(s, t, dt, ev);
    stepShots(s, dt, ev, near);
    for (const zb of s.zombies) if (zb.hp > 0) stepZombie(s, zb, dt, ev, near);
    // zombies keep a little apart
    for (const zb of s.zombies) {
      if (zb.hp <= 0 || zb.under) continue;
      for (const o of near(zb.x, zb.z, 1)) {
        if (o === zb || o.hp <= 0 || o.under || o.id < zb.id) continue;
        const d2 = dist2(zb.x, zb.z, o.x, o.z), rr = (zb.r + o.r) * 0.9;
        if (d2 > 1e-6 && d2 < rr * rr) {
          const d = Math.sqrt(d2), push = (rr - d) * 0.5, ux = (zb.x - o.x) / d, uz = (zb.z - o.z) / d;
          const wa = ZOMBIES[zb.type].heavy ? 0.2 : 1, wb = ZOMBIES[o.type].heavy ? 0.2 : 1;
          const ra = moveCircle(s, zb.x, zb.z, ux * push * wa, uz * push * wa, zb.r, ZOMBIES[zb.type].fly ? () => false : zombieSolid(s, zb));
          zb.x = ra[0]; zb.z = ra[1];
          const rb = moveCircle(s, o.x, o.z, -ux * push * wb, -uz * push * wb, o.r, ZOMBIES[o.type].fly ? () => false : zombieSolid(s, o));
          o.x = rb[0]; o.z = rb[1];
        }
      }
    }
    s.zombies = s.zombies.filter((zb) => zb.hp > 0);
    s.turrets = s.turrets.filter((t) => t.hp > 0);
    if (s.castle.hp <= 0 && !s.result) { s.result = 'lost'; s.wave.state = 'lost'; ev.push({ e: 'lost' }); }
    return ev;
  }

  /* ================= what the other devices need ================= */
  const r2 = (v) => Math.round(v * 100) / 100;
  // the moving things, often (about 15 times a second)
  function snapshot(s) {
    return {
      k: s.tick, c: Math.round(s.castle.hp), r: [s.res.wood, s.res.stone, s.res.gold],
      w: [s.wave.idx, s.wave.state, Math.ceil(s.wave.timer), s.wave.ready || 0, s.wave.state === 'fight' ? s.wave.groups.reduce((n, g) => n + g.left, 0) : 0],
      p: s.players.map((p) => [p.id, r2(p.x), r2(p.z), r2(p.rot), Math.round(p.hp), p.weapon, r2(p.down), p.act && p.actT > 0 ? p.act : '', p.kills]),
      z: s.zombies.map((zb) => [zb.id, ZOMBIE_ORDER.indexOf(zb.type), r2(zb.x), r2(zb.z), r2(zb.rot), Math.round(zb.hp / zb.max * 100), (zb.under ? 1 : 0) | (zb.slowT > 0 ? 2 : 0) | (zb.burnT > 0 ? 4 : 0) | (zb.actT > 0 ? 8 : 0) | (zb.hitT > 0 ? 16 : 0)]),
      t: s.turrets.map((t) => [t.id, Math.round(t.hp), r2(t.rot), t.lvl])
    };
  }
  // everything a device joining needs to draw the same game
  function fullState(s) {
    const m = s.map;
    return {
      level: s.level, seed: s.map.seed, crew: s.players.map((p) => ({ id: p.id, name: p.name, slot: p.slot })), unlocks: s.unlocks,
      tiles: Array.from(m.tiles), life: Array.from(m.life), turrets: s.turrets.map(turretInfo), castle: [Math.round(s.castle.hp), s.castle.max], snap: snapshot(s)
    };
  }

  return {
    TICK: TICK, T: T, WALK: WALK, WEAPONS: WEAPONS, WEAPON_ORDER: WEAPON_ORDER, TURRETS: TURRETS, TURRET_ORDER: TURRET_ORDER, ZOMBIES: ZOMBIES, ZOMBIE_ORDER: ZOMBIE_ORDER,
    UP_DMG: UP_DMG, UP_RANGE: UP_RANGE, CASTLE_R: CASTLE_R, upgradeCost: upgradeCost,
    genMap: genMap, newGame: newGame, addPlayer: addPlayer, removePlayer: removePlayer, step: step, moveCircle: moveCircle, movePlayer: movePlayer, playerSolid: playerSolid, canBuild: canBuild, canAfford: canAfford,
    pickTarget: pickTarget, clearShot: clearShot, castleDist: castleDist, gatePoint: gatePoint, flowField: flowField, tileAt: tileAt, snapshot: snapshot, fullState: fullState, turretInfo: turretInfo
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CC;
