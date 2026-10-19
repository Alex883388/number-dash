/* games/castle/src/bot.js — a computer crew member for Castle Crew: the balance simulator plays every level with it,
   and the playtests use it to drive a player. Before a wave it gathers wood and stone and builds turrets beside the
   roads near the castle; in a wave it guards the castle, keeps the zombie nearest the castle in range and picks the
   weapon that hurts that zombie most. It moves only as a player can (CC.movePlayer, 4.2 tiles a second).
   skill (0..1, default 1) plays like a child: below 1 it moves slower, looks away now and then (no firing), keeps the
   same weapon for a while, builds only the turrets it knows best and stands a few seconds over each build or upgrade
   (the tray, the card, the spot).
   think(s, p, mem, dt) moves p and returns the input a device would send for it. */
const CCBot = (function () {
  const SPEED = 4.2;
  const T = CC.T;
  function make(opts) { return Object.assign({ path: [], pathFor: '', pathT: 0, plan: null, gatherI: -1, idle: 0, skill: 1, builds: true, weaponT: 0, weapon: 'blaster', dazeT: 0, nextDaze: 1 }, opts || {}); }
  const tileOf = (s, x, z) => (z | 0) * s.map.w + (x | 0);
  const cx = (s, i) => (i % s.map.w) + 0.5, cz = (s, i) => ((i / s.map.w) | 0) + 0.5;

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
  // walk along a route; returns true when at the end
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

  // which weapon hurts the zombies in reach most
  function bestWeapon(s, p) {
    let best = 'blaster', bv = -1;
    for (const k of s.unlocks.weapons) {
      const W = CC.WEAPONS[k];
      let v = 0;
      for (const zb of s.zombies) {
        if (zb.under) continue;
        const d = Math.hypot(zb.x - p.x, zb.z - p.z);
        if (d > W.range) continue;
        const Z = CC.ZOMBIES[zb.type], mul = Z.res && Z.res[W.type] != null ? Z.res[W.type] : 1;
        const dps = W.dmg * (W.pellets ? Math.min(W.pellets, 3) : 1) * W.rate * (W.kind === 'chain' ? 2 : W.kind === 'lob' || W.kind === 'cone' ? 1.6 : W.pierce ? 1.4 : 1);
        v += dps * mul * (1 + 3 / (1 + CC.castleDist(s, zb.x, zb.z)));
      }
      if (v > bv) { bv = v; best = k; }
    }
    return best;
  }

  /* ---- what to build next, and where ---- */
  const WANT = { arrow: 1.2, cannon: 1, tesla: 0.7, flame: 0.6, frost: 0.5, mortar: 0.5, shrine: 0.34 };
  function nextBuild(s, skill) {
    const roads = s.map.spawns.length, have = {};
    for (const t of s.turrets) have[t.type] = (have[t.type] || 0) + 1;
    const order = ['arrow', 'cannon', 'tesla', 'flame', 'frost', 'mortar', 'shrine'].filter((k) => s.unlocks.turrets.indexOf(k) >= 0 && (skill >= 0.9 || ['arrow', 'cannon', 'frost'].indexOf(k) >= 0));
    let best = null, bv = 1e9;
    for (const k of order) {
      const want = Math.max(1, Math.round(WANT[k] * roads * (1 + s.wave.idx * 0.5)));
      const v = (have[k] || 0) / want + order.indexOf(k) * 0.01;
      if ((have[k] || 0) < want * 2 && v < bv) { bv = v; best = k; }
    }
    return best;
  }
  // a free tile beside a road, 2 to 7 tiles from the castle, covering as much road as possible
  function spotFor(s, type) {
    const m = s.map, U = CC.TURRETS[type], range = U.range || 3, road = [];
    for (let i = 0; i < m.tiles.length; i++) if (m.tiles[i] === T.DIRT || m.tiles[i] === T.BRIDGE) road.push(i);
    let best = -1, bv = -1;
    for (let i = 0; i < m.tiles.length; i++) {
      const x = cx(s, i), z = cz(s, i);
      if (!CC.canBuild(s, type, i % m.w, (i / m.w) | 0, null).ok && CC.canBuild(s, type, i % m.w, (i / m.w) | 0, null).why !== 'cost') continue;
      if (m.tiles[i] === T.DIRT) continue;   // beside the road, not on it
      const cd = CC.castleDist(s, x, z);
      if (cd < 1.2 || cd > 7) continue;
      let v = 0;
      for (const r of road) { const d = Math.hypot(cx(s, r) - x, cz(s, r) - z); if (d <= range && (!U.min || d >= U.min)) v += 1 / (1 + CC.castleDist(s, cx(s, r), cz(s, r)) * 0.15); }
      for (const t of s.turrets) { const d = Math.hypot(t.x - x, t.z - z); if (d < 1.5) v *= 0.4; }
      if (type === 'shrine' || type === 'frost') v = 10 - cd;   // these stay close to the castle
      if (v > bv) { bv = v; best = i; }
    }
    return best;
  }

  function think(s, p, mem, dt) {
    const inp = { x: p.x, z: p.z, rot: p.rot, fire: true, weapon: p.weapon };
    if (p.down) return inp;
    // a child looks away now and then, and changes weapon only now and then
    mem.weaponT -= dt;
    if (mem.weaponT <= 0) { mem.weapon = mem.skill >= 0.9 || Math.random() < mem.skill ? bestWeapon(s, p) : mem.weapon; mem.weaponT = mem.skill >= 0.9 ? 0 : 6; }
    inp.weapon = mem.weapon;
    if (mem.skill < 0.9) {
      if (mem.dazeT > 0) { mem.dazeT -= dt; inp.fire = false; }
      else { mem.nextDaze -= dt; if (mem.nextDaze <= 0) { mem.nextDaze = 1; if (Math.random() < (1 - mem.skill) * 0.5) mem.dazeT = 2; } }
    }
    const W = s.wave;
    if (mem.idle > 0) mem.idle -= dt;
    if (W.state === 'build' && mem.builds) {
      if (mem.idle > 0) return fin(inp, p);   // still choosing in the build tray
      // build what we can afford, gather what we lack
      if (!mem.plan) {
        const type = nextBuild(s, mem.skill);
        if (type) { const at = spotFor(s, type); if (at >= 0) mem.plan = { type: type, i: at }; }
      }
      if (mem.plan) {
        const U = CC.TURRETS[mem.plan.type], tx = mem.plan.i % s.map.w, tz = (mem.plan.i / s.map.w) | 0;
        const can = CC.canBuild(s, mem.plan.type, tx, tz, null);
        if (!can.ok && can.why !== 'cost' && can.why !== 'player') { mem.plan = null; return fin(inp, p); }
        if (CC.canAfford(s, U.cost)) {
          const d = Math.hypot(cx(s, mem.plan.i) - p.x, cz(s, mem.plan.i) - p.z);
          if (d < 5 && can.ok) { inp.build = { type: mem.plan.type, tx: tx, tz: tz }; mem.plan = null; mem.idle = pause(mem); return fin(inp, p); }
          goTo(s, p, mem, 'b' + mem.plan.i, (i) => Math.hypot(cx(s, i) - cx(s, mem.plan.i), cz(s, i) - cz(s, mem.plan.i)) < 3.5 && i !== mem.plan.i, dt);
          return fin(inp, p);
        }
        // upgrades with spare gold
        const need = { wood: (U.cost.wood || 0) - s.res.wood, stone: (U.cost.stone || 0) - s.res.stone };
        if (need.wood > 0 || need.stone > 0) {
          const want = need.wood > 0 ? T.TREE : T.ROCK;
          return fin(gather(s, p, mem, want, dt, inp), p);
        }
        // only gold is short: upgrade nothing, wait for kills; say ready
      }
      // upgrade the turret nearest the castle with spare gold
      const up = s.turrets.filter((t) => t.lvl < 3 && CC.TURRETS[t.type].kind !== 'wall' && s.res.gold >= CC.upgradeCost(t.type, t.lvl) + 10).sort((a, b) => CC.castleDist(s, a.x, a.z) - CC.castleDist(s, b.x, b.z))[0];
      if (up) {
        const d = Math.hypot(up.x - p.x, up.z - p.z);
        if (d < 2.6) { inp.upgrade = up.id; mem.idle = pause(mem); return fin(inp, p); }
        goTo(s, p, mem, 'u' + up.id, (i) => Math.hypot(cx(s, i) - up.x, cz(s, i) - up.z) < 2.2, dt);
        return fin(inp, p);
      }
      if (s.res.wood < 12) return fin(gather(s, p, mem, T.TREE, dt, inp), p);
      if (s.res.stone < 10 && s.unlocks.turrets.some((k) => (CC.TURRETS[k].cost.stone || 0) > 0)) return fin(gather(s, p, mem, T.ROCK, dt, inp), p);
      inp.ready = true;
    }
    // fight: guard the castle, keep the zombie nearest the castle in reach
    let target = null, tv = 1e9;
    for (const zb of s.zombies) { if (zb.under) continue; const v = CC.castleDist(s, zb.x, zb.z); if (v < tv) { tv = v; target = zb; } }
    if (target) {
      const Wp = CC.WEAPONS[inp.weapon], keep = Math.max(1.2, Wp.range * 0.7);
      const d = Math.hypot(target.x - p.x, target.z - p.z), sight = Wp.kind !== 'shot' || CC.clearShot(s, p.x, p.z, target.x, target.z);
      if (p.hp < 30) goTo(s, p, mem, 'home', (i) => CC.castleDist(s, cx(s, i), cz(s, i)) < 1.5, dt);
      else if (d > keep || !sight || CC.castleDist(s, p.x, p.z) > 7) {
        const ti = tileOf(s, target.x, target.z), far = CC.castleDist(s, target.x, target.z) > 6;
        const near = (i, r) => Math.hypot(cx(s, i) - target.x, cz(s, i) - target.z) < r, shot = (i) => Wp.kind !== 'shot' || CC.clearShot(s, cx(s, i), cz(s, i), target.x, target.z);
        goTo(s, p, mem, 'z' + ti, [(i) => near(i, keep) && (far || CC.castleDist(s, cx(s, i), cz(s, i)) < 7.5) && shot(i), (i) => near(i, keep) && shot(i), (i) => near(i, Math.max(2, keep)), (i) => near(i, 3.5)], dt);
      }
    } else if (W.state === 'fight') goTo(s, p, mem, 'home', (i) => CC.castleDist(s, cx(s, i), cz(s, i)) < 2 + p.slot, dt);
    return fin(inp, p);
  }
  // walk to the nearest tree (or rock) and push into it
  function gather(s, p, mem, want, dt, inp) {
    const m = s.map;
    if (mem.gatherI >= 0 && m.tiles[mem.gatherI] !== want) mem.gatherI = -1;
    if (mem.gatherI < 0) {
      const r = route(s, tileOf(s, p.x, p.z), (i) => { const x = i % m.w, z = (i / m.w) | 0; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (z + dz) * m.w + x + dx; if (m.tiles[j] === want) { mem.gatherI = j; return true; } } return false; });
      if (!r) { inp.ready = true; return inp; }
      mem.path = r; mem.pathFor = 'g' + mem.gatherI; mem.pathT = 3;
    }
    const gx = cx(s, mem.gatherI), gz = cz(s, mem.gatherI), d = Math.hypot(gx - p.x, gz - p.z);
    if (d < 1.15 || !mem.path.length) {   // beside it, or at the walk's end a hair short of it
      // push against it
      CC.movePlayer(s, p, (gx - p.x) / d * SPEED * dt, (gz - p.z) / d * SPEED * dt);
      p.rot = Math.atan2(gx - p.x, gz - p.z);
      inp.gather = mem.gatherI; inp.fire = false;
      inp.weapon = s.unlocks.weapons.indexOf('hammer') >= 0 ? 'hammer' : inp.weapon;
      return inp;
    }
    follow(s, p, mem, dt);
    return inp;
  }
  // how long a build or an upgrade takes a player: a child (skill 0.6) about 7 seconds
  function pause(mem) { return mem.skill >= 0.9 ? 0.6 : 2 + (1 - mem.skill) * 12; }
  function fin(inp, p) { inp.x = p.x; inp.z = p.z; inp.rot = p.rot; return inp; }

  return { make: make, think: think, route: route, bestWeapon: bestWeapon, SPEED: SPEED };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CCBot;
