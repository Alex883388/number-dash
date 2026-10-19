/* games/castle/src/bot.js — a computer crew member for Castle Crew: the balance simulator plays every map with it,
   and the playtests use it to drive a player. It spends its coins on towers and upgrades (a wish list that grows with
   the rounds, each tower placed where it covers the most road, upgrades along one main path), starts round 1 when its
   first towers stand, and fights with its weapon: it keeps the zombie nearest the castle in range.
   skill (0..1, default 1) plays like a child: below 1 it moves slower, looks away now and then (no firing), takes a
   few seconds over each build or upgrade, picks towers it likes rather than what is needed, upgrades less, never
   builds gold mines and sometimes forgets about shadow zombies. It moves only as a player can (4.2 tiles a second).
   think(s, p, mem, dt) moves p and returns the input a device would send for it. */
const CCBot = (function () {
  const SPEED = 4.2;
  function make(opts) { return Object.assign({ path: [], pathFor: '', pathT: 0, skill: 1, builds: true, idle: 0.5, dazeT: 0, nextDaze: 1, spentB: 0, spentU: 0, wish: 0, roads: null, likes: null }, opts || {}); }
  const tileOf = (s, x, z) => (z | 0) * s.map.w + (x | 0);
  const cx = (s, i) => (i % s.map.w) + 0.5, cz = (s, i) => ((i / s.map.w) | 0) + 0.5;
  const rand = Math.random;

  // the shortest walk from tile a to the nearest tile that ok(i) accepts (8 directions, no corner cutting)
  function route(s, a, ok, maxN) {
    const m = s.map, W = m.w, solid = CC.playerSolid(s), prev = new Int32Array(W * m.h).fill(-2), q = [a];
    prev[a] = -1;
    for (let h = 0; h < q.length && h < (maxN || 4000); h++) {
      const i = q[h];
      if (ok(i)) { const out = []; for (let k = i; k !== -1; k = prev[k]) out.push(k); return out.reverse(); }
      const x = i % W, y = (i - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const xx = x + dx, yy = y + dy, j = yy * W + xx;
        if (xx < 0 || yy < 0 || xx >= W || yy >= m.h || prev[j] !== -2 || solid(xx, yy)) continue;
        if (dx && dy && (solid(x + dx, y) || solid(x, y + dy))) continue;
        prev[j] = i; q.push(j);
      }
    }
    return null;
  }
  function follow(s, p, mem, dt) {
    if (!mem.path || !mem.path.length) return true;
    const i = mem.path[0], tx = cx(s, i), tz = cz(s, i), dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    if (d < 0.2) { mem.path.shift(); return !mem.path.length; }
    const step = Math.min(d, SPEED * dt * (0.7 + 0.3 * mem.skill));
    CC.movePlayer(s, p, dx / d * step, dz / d * step);
    p.rot = Math.atan2(dx, dz);
    return false;
  }
  // ok: what a goal tile must be; a list of tests is tried in turn until one has a reachable tile
  function goTo(s, p, mem, key, ok, dt) {
    mem.pathT -= dt;
    if (mem.pathFor !== key || mem.pathT <= 0) {
      const tests = Array.isArray(ok) ? ok : [ok];
      let r = null;
      for (const t of tests) { r = route(s, tileOf(s, p.x, p.z), t); if (r) break; }
      mem.path = r || []; mem.pathFor = key; mem.pathT = 0.6;
    }
    return follow(s, p, mem, dt);
  }

  /* ---- spending ---- */
  // how many of each tower the bot wants by round r: [first round, base, per round]
  const WANT = {
    arrow: [0, 2, 1 / 18], spikes: [2, 1, 1 / 40], ninja: [5, 1, 1 / 14], cannon: [6, 1, 1 / 11], glue: [9, 1, 1 / 40], sniper: [12, 1, 1 / 35], mine: [8, 1, 1 / 14],
    frost: [14, 1, 1 / 30], wizard: [11, 1, 1 / 18], tesla: [24, 1, 1 / 28], flame: [26, 1, 1 / 35], mortar: [30, 1, 1 / 30], shrine: [34, 1, 1 / 45], sun: [55, 1, 1 / 22]
  };
  // the path an upgrade goes up first (to step 3); the other path gets step 1
  const MAIN = { arrow: 'a', wall: 'a', cannon: 'a', frost: 'a', tesla: 'a', flame: 'a', mortar: 'b', shrine: 'a', sniper: 'a', glue: 'a', ninja: 'a', wizard: 'b', mine: 'a', sun: 'a', spikes: 'a' };
  const BREAKERS = ['cannon', 'wizard', 'tesla', 'flame', 'mortar'];   // towers that get through armour
  const KID_LIKES = ['arrow', 'arrow', 'ninja', 'cannon', 'cannon', 'frost', 'flame', 'wizard', 'tesla', 'glue', 'sniper', 'spikes', 'mortar', 'arrow', 'cannon', 'wizard'];
  const count = (s, type) => s.towers.reduce((n, t) => n + (t.type === type ? 1 : 0), 0);
  function roadTiles(s, mem) {
    if (mem.roads && mem.roadsFor === s.map) return mem.roads;
    const out = [];
    s.map.paths.forEach((P, k) => P.road.tiles.forEach((i, j) => out.push({ i: i, x: cx(s, i), z: cz(s, i), k: k, left: P.road.len - j })));
    mem.roads = out; mem.roadsFor = s.map;
    return out;
  }
  // where a tower covers the most road (towers nearer the castle end cover the zombies that matter most)
  function spotFor(s, type, mem) {
    const U = CC.TOWERS[type], m = s.map, roads = roadTiles(s, mem), st = CC.towerStats(s, { type: type, a: 0, b: 0, x: 0, z: 0 });
    let best = -1, bv = -1;
    if (U.road) {
      // traps and barricades: on the road, a few tiles from the castle
      for (const rd of roads) {
        if (rd.left < 3 || rd.left > 14) continue;
        if (!CC.canBuild(s, type, rd.i % m.w, (rd.i / m.w) | 0, null).ok) continue;
        const v = 20 - Math.abs(rd.left - 7) + rand() * 0.5;
        if (v > bv) { bv = v; best = rd.i; }
      }
      return best;
    }
    const range = Math.min(st.range || 3, 12), min = st.min || 0;
    for (let i = 0; i < m.tiles.length; i++) {
      if (!CC.BUILD_OK[m.tiles[i]] || s.occ[i]) continue;
      const x = cx(s, i), z = cz(s, i);
      let v = 0;
      if (type === 'mine') v = 10 - Math.min(10, Math.hypot(x - s.castle.x, z - s.castle.z) * 0.3) + (roads.some((rd) => Math.hypot(rd.x - x, rd.z - z) < 1.6) ? -20 : 0);
      else if (type === 'sniper') v = 10 - Math.hypot(x - s.castle.x, z - s.castle.z) * 0.3 + (roads.some((rd) => Math.hypot(rd.x - x, rd.z - z) < 1.6) ? -5 : 0);
      else if (type === 'shrine') { for (const t of s.towers) { const d = Math.hypot(t.x - x, t.z - z); if (d < (st.range || 3) && t.st.rate) v += 1; } }
      else {
        for (const rd of roads) { const d = Math.hypot(rd.x - x, rd.z - z); if (d <= range && d >= min) v += 1 + 2 / (1 + rd.left * 0.15); }
        for (const t of s.towers) if (Math.hypot(t.x - x, t.z - z) < 1.2) v *= 0.85;
      }
      if (!CC.canBuild(s, type, i % m.w, (i / m.w) | 0, null).ok) continue;
      v += rand() * (mem.skill < 0.9 ? 3 : 0.2);
      if (v > bv) { bv = v; best = i; }
    }
    return best;
  }
  // what to buy next, best first: towers the wish list is short of, and the next step on each tower's main path
  function options(s, p, mem) {
    const r = Math.max(1, s.round + (s.wave.state === 'wait' ? 1 : 0)), kid = mem.skill < 0.9, out = [];
    // upgrades take a growing share of the coins
    const upShare = kid ? Math.min(0.45, r / 110) : Math.min(0.72, r / 70);
    const spent = mem.spentB + mem.spentU, upMul = s.towers.length < 2 ? 0 : mem.spentU < upShare * spent ? 1.6 : 0.6;
    const allDone = s.towers.reduce((n, t) => n + (t.done || 0), 0) || 1;
    for (const t of s.towers) {
      if (t.type === 'mine' && kid) continue;
      const main = kid ? (t.kidPath || (t.kidPath = rand() < 0.5 ? 'a' : 'b')) : MAIN[t.type];
      const other = main === 'a' ? 'b' : 'a';
      const path = t[main] < 3 && CC.upgradeInfo(s, t, main).ok ? main : t[other] < 1 && CC.upgradeInfo(s, t, other).ok ? other : null;
      if (!path) continue;
      const u = CC.upgradeInfo(s, t, path);
      if (t.type === 'mine' && path === 'a' && t.a >= 2 && r > 40) continue;
      // the towers doing the most damage are the ones worth upgrading
      const share = (t.done || 0) / allDone, v = upMul * (t.type === 'mine' ? (r < 40 ? 0.7 : 0.15) : t.type === 'shrine' ? 0.5 : 0.35 + 3 * share) * (kid ? 0.7 + rand() * 0.6 : 1);
      out.push({ kind: 'up', id: t.id, path: path, cost: u.cost, v: v });
    }
    if (kid) {
      if (!mem.likes) mem.likes = KID_LIKES.slice().sort(() => rand() - 0.5);
      const type = r < 3 ? 'arrow' : r > 45 && mem.wish % 9 === 8 ? 'sun' : mem.likes[mem.wish % mem.likes.length];
      out.push({ kind: 'build', type: type, cost: CC.price(s, type), v: r < 3 ? 2 : 1.35 });
      // a child sometimes notices the shadow zombies
      if (r >= 18 && !s.towers.some((t) => t.st.camo) && rand() < 0.3) out.push({ kind: 'build', type: 'ninja', cost: CC.price(s, 'ninja'), v: 1.5 });
      // and sometimes follows the hint about armour
      if (r >= 11 && s.towers.filter((t) => BREAKERS.indexOf(t.type) >= 0).length < 1 + r / 20 && rand() < 0.4) out.push({ kind: 'build', type: rand() < 0.6 ? 'cannon' : 'wizard', cost: 420, v: 1.45 });
    } else {
      const breakers = s.towers.filter((t) => BREAKERS.indexOf(t.type) >= 0).length;
      for (const type of Object.keys(WANT)) {
        const [from, base, per] = WANT[type];
        if (r < from) continue;
        const want = Math.floor(base + (r - from) * per), have = count(s, type);
        if (have >= want) continue;
        const v = 1 + (want - have) / want + (type === 'ninja' && r >= 16 && !have ? 3 : 0) + (type === 'arrow' && have < 2 ? 2 : 0) + (type === 'mine' && r > 60 ? -1.5 : 0) + (BREAKERS.indexOf(type) >= 0 && r >= 9 && breakers < 2 + r / 15 ? 1.5 : 0);
        out.push({ kind: 'build', type: type, cost: CC.price(s, type), v: v });
      }
    }
    return out.sort((x, y) => y.v - x.v);
  }
  // buy the best option; save up for it only when it is nearly affordable, else buy the best one that is
  function spend(s, p, mem, inp, dt) {
    if (mem.idle > 0) { mem.idle -= dt; return; }
    mem.idle = 0.25;
    const list = options(s, p, mem);
    if (!list.length) return;
    const top = list[0];
    let pick = p.coins >= top.cost ? top : p.coins < top.cost * 0.6 ? list.slice(1, 5).find((o) => p.coins >= o.cost) : null;
    if (!pick) return;
    if (pick.kind === 'build') {
      const spot = spotFor(s, pick.type, mem);
      if (spot < 0) return;
      inp.build = { type: pick.type, tx: spot % s.map.w, tz: (spot / s.map.w) | 0 };
      mem.spentB += pick.cost;
      if (mem.skill < 0.9) mem.wish++;
    } else {
      inp.upgrade = { id: pick.id, path: pick.path };
      mem.spentU += pick.cost;
    }
    mem.idle = mem.skill >= 0.9 ? 0.3 : 2 + (1 - mem.skill) * 12;   // a child takes about 7 seconds over each
  }

  function think(s, p, mem, dt) {
    const inp = { x: p.x, z: p.z, rot: p.rot, fire: true };
    if (mem.builds) spend(s, p, mem, inp, dt);
    // round 1 starts when the first towers stand
    if (s.round === 0 && s.wave.state === 'wait' && s.towers.length >= 2) { mem.startT = (mem.startT || 0) + dt; if (p.coins < 200 || mem.startT > 3) inp.next = true; }
    if (s.round === 0 && s.wave.state === 'wait' && !mem.builds) inp.next = true;
    if (p.down) return inp;
    // a child looks away now and then
    if (mem.skill < 0.9) {
      if (mem.dazeT > 0) { mem.dazeT -= dt; inp.fire = false; }
      else { mem.nextDaze -= dt; if (mem.nextDaze <= 0) { mem.nextDaze = 1; if (rand() < (1 - mem.skill) * 0.5) mem.dazeT = 2; } }
    }
    // fight: guard the castle, keep the zombie nearest the castle in reach
    let target = null, tv = 1e9;
    for (const zb of s.zombies) { if (zb.under || zb.bones > 0) continue; const v = CC.castleDist(s, zb.x, zb.z); if (v < tv) { tv = v; target = zb; } }
    if (target) {
      const keep = Math.max(1.2, p.st.range * 0.7), d = Math.hypot(target.x - p.x, target.z - p.z);
      if (p.hp < 30) goTo(s, p, mem, 'home', (i) => CC.castleDist(s, cx(s, i), cz(s, i)) < 1.5, dt);
      else if (d > keep || CC.castleDist(s, p.x, p.z) > 9) {
        const ti = tileOf(s, target.x, target.z), near = (i, r) => Math.hypot(cx(s, i) - target.x, cz(s, i) - target.z) < r;
        goTo(s, p, mem, 'z' + ti, [(i) => near(i, keep) && CC.castleDist(s, cx(s, i), cz(s, i)) < 9, (i) => near(i, keep), (i) => near(i, 3.5)], dt);
      }
    } else if (s.wave.state === 'fight') goTo(s, p, mem, 'home', (i) => CC.castleDist(s, cx(s, i), cz(s, i)) < 2 + p.slot, dt);
    return fin(inp, p);
  }
  function fin(inp, p) { inp.x = p.x; inp.z = p.z; inp.rot = p.rot; return inp; }

  return { make: make, think: think, route: route, spotFor: spotFor, SPEED: SPEED };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CCBot;
