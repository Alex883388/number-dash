/* city.js — the cities of Tycoon Town. Four maps, each an island-like city of 72 x 72 tiles with five districts (a
   market quarter, a shopping street, downtown, the towers, and the Gateway with its airport and port), hills and
   mountains, water, landmarks and fixed things (trees, lamps, cranes...):
     bay     Seaside Bay: a river city by the sea, mountains in the south, farms and a forest (the first map)
     desert  Desert Oasis: a city on a desert coast with a palm-shaped island, a creek, dunes, mesas and an oasis
     neon    Neon City: a valley in the desert, a strip of giant themed resorts, a lake, mountains all round
     sakura  Sakura City: a Japanese bay city with a castle on a hill, a river of cherry trees and a great volcano
   Pure data, built the same way every time, so lot numbers in a save never move (Seaside Bay keeps the lots of the
   first 56 x 56 map). The engine reads the lots and what is near each lot (a park, the water, a school, the
   station...); the map (map.js) draws everything.
   Grid: c (column) grows to the screen's bottom-right, r (row) to its bottom-left; tile (0, 0) is the top corner.
   Every tile has a kind, a height (0 = the city's level; hills and mountains go up in steps) and maybe a district. */
(function (root) {
  'use strict';
  // the first 26 kinds keep their numbers (old saves and the drawing code know them); new kinds go at the end
  const KINDS = ['GRASS', 'SEA', 'RIVER', 'POND', 'SAND', 'ROAD', 'AVENUE', 'BRIDGE', 'PLAZA', 'PATH', 'LAWN', 'FOREST', 'FIELD',
    'RAIL', 'RUNWAY', 'APRON', 'QUAY', 'LOT', 'YARD', 'PARKING', 'PITCH', 'COURT', 'PIER', 'SITE', 'CROSSING', 'ORCHARD',
    'VOID', 'ROCK', 'TERRACE', 'DUNE'];
  const K = {}; KINDS.forEach((k, i) => { K[k] = i; });
  const DISTRICTS = ['market', 'high', 'downtown', 'skyline', 'gateway'];
  const LOT_W = [1, 1, 1, 2, 3];                           // a lot is 1 x 1 tile, in the towers 2 x 2, in the Gateway 3 x 3
  const N = 72;

  function hash(a, b, c) {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul((c | 0) + 17, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  const smooth = (t) => t * t * (3 - 2 * t);
  function vnoise(x, y, seed) {   // smooth noise 0..1
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = smooth(x - x0), fy = smooth(y - y0);
    const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  }
  const fbm = (x, y, seed) => 0.55 * vnoise(x / 7, y / 7, seed) + 0.3 * vnoise(x / 3.5, y / 3.5, seed + 1) + 0.15 * vnoise(x / 1.7, y / 1.7, seed + 2);
  const isWater = (k) => k === K.SEA || k === K.RIVER || k === K.POND;
  const isRoad = (k) => k === K.ROAD || k === K.AVENUE || k === K.BRIDGE || k === K.CROSSING;

  /* ---------- the drawing board every city is built on ---------- */
  function Kit() {
    const kind = new Uint8Array(N * N), dist = new Int8Array(N * N).fill(-1), lotAt = new Int16Array(N * N).fill(-1), height = new Uint8Array(N * N);
    const at = (c, r) => r * N + c, inb = (c, r) => c >= 0 && r >= 0 && c < N && r < N;
    const get = (c, r) => (inb(c, r) ? kind[at(c, r)] : K.VOID);
    const set = (c, r, k) => { if (inb(c, r)) kind[at(c, r)] = k; };
    const rect = (c0, r0, c1, r1, k, keep) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (inb(c, r) && !(keep && keep(kind[at(c, r)]))) kind[at(c, r)] = k; };
    const objs = [], pois = [];
    const add = (k, c, r, o) => { const x = Object.assign({ k: k, c: c, r: r }, o || {}); objs.push(x); return x; };
    const poi = (k, c, r, w, d, name) => pois.push({ k: k, c: c, r: r, w: w || 1, d: d || 1, name: name || '' });
    const street = (c0, r0, c1, r1) => rect(c0, r0, c1, r1, K.ROAD, (k) => k === K.AVENUE || k === K.BRIDGE || isWater(k));
    const blockOf = (c0, r0, c1, r1, d, onSand) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (inb(c, r)) { dist[at(c, r)] = DISTRICTS.indexOf(d); if (onSand && kind[at(c, r)] === K.SAND) kind[at(c, r)] = K.GRASS; } };
    const H = (c, r) => (inb(c, r) ? height[at(c, r)] : 0);
    const setH = (c, r, h) => { if (inb(c, r)) height[at(c, r)] = Math.max(0, Math.min(14, Math.round(h))); };
    const each = (fn) => { for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) fn(c, r, kind[at(c, r)]); };
    // a bridge wherever a road crosses water
    const roadOver = (c0, r0, c1, r1, k) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (inb(c, r)) kind[at(c, r)] = isWater(kind[at(c, r)]) ? K.BRIDGE : (k || K.ROAD); };
    return { kind, dist, lotAt, height, at, inb, get, set, rect, objs, pois, add, poi, street, blockOf, H, setH, each, roadOver };
  }

  /* ---------- hills and mountains ---------- */
  // heights only grow on open land away from the city: never on roads, lots, water, squares or sites, and they
  // rise gently (a tile next to the city stays flat, then one step for every tile further away)
  const LIFTABLE = new Set([K.GRASS, K.FOREST, K.SAND, K.ROCK, K.DUNE, K.TERRACE, K.ORCHARD]);
  function cityDistance(k) {
    const d = new Int16Array(N * N).fill(999), q = [];
    k.each((c, r, kd) => { if (k.dist[k.at(c, r)] >= 0 || !LIFTABLE.has(kd) || kd === K.ORCHARD) { if (kd !== K.VOID) { d[k.at(c, r)] = 0; q.push(c, r); } } });
    for (let i = 0; i < q.length; i += 2) {
      const c = q[i], r = q[i + 1], v = d[k.at(c, r)] + 1;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => { const cc = c + dc, rr = r + dr; if (k.inb(cc, rr) && d[k.at(cc, rr)] > v) { d[k.at(cc, rr)] = v; q.push(cc, rr); } });
    }
    return d;
  }
  function settleHeights(k) {   // the landscape's heights, kept off the city and smoothed into steps
    const d = cityDistance(k);
    k.each((c, r, kd) => {
      const i = k.at(c, r);
      if (!LIFTABLE.has(kd) || kd === K.ORCHARD || k.dist[i] >= 0) { k.height[i] = 0; return; }
      k.height[i] = Math.min(k.height[i], Math.max(0, Math.round((d[i] - 1) * 1.3)));
    });
    // no step higher than three levels between neighbours on open land: cliffs, not walls
    for (let pass = 0; pass < 6; pass++) k.each((c, r) => {
      const i = k.at(c, r); let lo = 99;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => { if (k.inb(c + dc, r + dr) && k.get(c + dc, r + dr) !== K.VOID) lo = Math.min(lo, k.height[k.at(c + dc, r + dr)]); });
      if (lo < 99 && k.height[i] > lo + 3 && k.get(c, r) !== K.ROCK) k.height[i] = lo + 3;
    });
  }
  // a mountain: a rough cone of rock with forest on its lower slopes
  function mountain(k, c0, r0, rad, top, seed, forestBelow) {
    for (let r = Math.floor(r0 - rad); r <= r0 + rad; r++) for (let c = Math.floor(c0 - rad); c <= c0 + rad; c++) {
      if (!k.inb(c, r) || !LIFTABLE.has(k.get(c, r)) || k.dist[k.at(c, r)] >= 0) continue;
      const dd = Math.hypot(c - c0, r - r0) / rad; if (dd > 1) continue;
      const h = top * Math.pow(1 - dd, 0.85) + (fbm(c, r, seed) - 0.5) * 2.2;
      if (h > k.H(c, r)) { k.setH(c, r, h); if (h >= (forestBelow || 4)) k.set(c, r, K.ROCK); else if (k.get(c, r) === K.GRASS && hash(c, r, seed) < 0.75) k.set(c, r, K.FOREST); }
    }
  }
  function hills(k, test, amp, seed) {   // rolling hills over the tiles the test accepts
    k.each((c, r, kd) => { if (test(c, r, kd) && LIFTABLE.has(kd)) { const h = Math.max(0, (fbm(c, r, seed) - 0.35) * amp * 2.4); if (h > k.H(c, r)) k.setH(c, r, h); } });
  }

  /* ---------- the island's outline: the sea runs out into the sky, and the land ends in cliffs ---------- */
  function outline(k, keep, seed) {
    k.each((c, r, kd) => {
      const edge = Math.min(c, r, N - 1 - c, N - 1 - r), n = vnoise(c / 4, r / 4, seed) * 3 + vnoise(c / 1.5, r / 1.5, seed + 3) * 1.2;
      if (!keep(c, r, kd, edge, n)) { k.set(c, r, K.VOID); k.height[k.at(c, r)] = 0; }
    });
    // sea far out from any land fades into the sky too
    const dLand = new Int16Array(N * N).fill(999), q = [];
    k.each((c, r, kd) => { if (kd !== K.VOID && !isWater(kd)) { dLand[k.at(c, r)] = 0; q.push(c, r); } });
    for (let i = 0; i < q.length; i += 2) { const c = q[i], r = q[i + 1], v = dLand[k.at(c, r)] + 1; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => { const cc = c + dc, rr = r + dr; if (k.inb(cc, rr) && dLand[k.at(cc, rr)] > v) { dLand[k.at(cc, rr)] = v; q.push(cc, rr); } }); }
    k.each((c, r, kd) => { if (kd === K.SEA && dLand[k.at(c, r)] > 6 + vnoise(c / 3, r / 3, seed + 9) * 4) k.set(c, r, K.VOID); });
  }

  /* ---------- the shared finish: lots, trees, what is near each lot, which way lots face ---------- */
  // a parade route given by its corners, as the list of tiles walked in order
  function route(pts) {
    const out = [];
    for (let j = 0; j + 1 < pts.length; j++) {
      const [c0, r0] = pts[j], [c1, r1] = pts[j + 1], n = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
      for (let t = j ? 1 : 0; t <= n; t++) out.push([c0 + Math.sign(c1 - c0) * t, r0 + Math.sign(r1 - r0) * t]);
    }
    return out;
  }
  function finish(k, def) {
    const { kind, dist, lotAt, at, inb, get } = k, big = (di) => di >= 0 && LOT_W[di] > 1;
    const facesStreet = (c, r) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => { const kd = get(c + dc, r + dr); return isRoad(kd) || (kd === K.PLAZA && big(dist[at(c, r)])); });
    const lots = {}; DISTRICTS.forEach((d) => { lots[d] = []; });
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const di = dist[at(c, r)];
      if (di < 0 || big(di) || kind[at(c, r)] !== K.GRASS) continue;
      kind[at(c, r)] = facesStreet(c, r) ? K.LOT : K.YARD;
    }
    // a street corner stays a little garden now and then: the blocks breathe
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (kind[at(c, r)] !== K.LOT) continue;
      const roads = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dc, dr]) => isRoad(get(c + dc, r + dr))).length;
      if ((roads >= 2 && hash(c, r, 1) < 0.45) || hash(c, r, 2) < 0.07) kind[at(c, r)] = K.YARD;
    }
    // the towers' 2 x 2 and the Gateway's 3 x 3 lots
    [3, 4].forEach((di) => {
      const w = LOT_W[di], d = DISTRICTS[di];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (dist[at(c, r)] !== di) continue;
        const free = (cc, rr) => inb(cc, rr) && dist[at(cc, rr)] === di && kind[at(cc, rr)] === K.GRASS && lotAt[at(cc, rr)] < 0;
        const cells = []; for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) cells.push([c + i, r + j]);
        if (!cells.every(([cc, rr]) => free(cc, rr))) continue;
        if (!cells.some(([cc, rr]) => facesStreet(cc, rr))) continue;
        const id = lots[d].length;
        lots[d].push({ c: c, r: r, w: w });
        cells.forEach(([cc, rr]) => { kind[at(cc, rr)] = K.LOT; lotAt[at(cc, rr)] = id; });
      }
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (dist[at(c, r)] === di && kind[at(c, r)] === K.GRASS) kind[at(c, r)] = K.YARD;
    });
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const di = dist[at(c, r)];
      if (di < 0 || big(di) || kind[at(c, r)] !== K.LOT) continue;
      const d = DISTRICTS[di]; lotAt[at(c, r)] = lots[d].length; lots[d].push({ c: c, r: r, w: 1 });
    }
    settleHeights(k);

    /* trees, lamps and benches: the city's own kinds (palms by a desert sea, cherries in Sakura City...) */
    const T = def.trees;
    const pickTree = (list, c, r, j) => { const x = hash(c, r, 70 + j); let t = 0; for (const [kk, w] of list) { t += w; if (x < t) return kk; } return list[0][0]; };
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const kd = kind[at(c, r)], h1 = hash(c, r, 7), h2 = hash(c, r, 8), h3 = hash(c, r, 9);
      if (kd === K.YARD) {
        const n = h1 < 0.55 ? 2 : h1 < 0.85 ? 1 : 3;
        for (let j = 0; j < n; j++) k.add(pickTree(T.yard, c, r, j), c + 0.2 + 0.6 * hash(c, r, 20 + j), r + 0.2 + 0.6 * hash(c, r, 30 + j), { v: Math.floor(hash(c, r, 40 + j) * 1000), s: 0.75 + 0.35 * hash(c, r, 50 + j) });
        if (h2 < 0.3) k.add(T.bush || 'bush', c + 0.5, r + 0.5, { v: Math.floor(h3 * 100) });
      } else if (kd === K.FOREST) {
        const n = 3 + Math.floor(h1 * 2);
        for (let j = 0; j < n; j++) k.add(pickTree(T.forest, c, r, j), c + 0.15 + 0.7 * hash(c, r, 20 + j), r + 0.15 + 0.7 * hash(c, r, 30 + j), { v: Math.floor(hash(c, r, 40 + j) * 1000), s: 0.8 + 0.4 * hash(c, r, 50 + j) });
      } else if (kd === K.ORCHARD) {
        k.add('tree', c + 0.3, r + 0.3, { v: 500 + (c % 3), s: 0.7, fruit: 1 }); k.add('tree', c + 0.75, r + 0.75, { v: 501, s: 0.7, fruit: 1 });
      } else if (kd === K.LAWN && dist[at(c, r)] >= 0) {
        if (h1 < 0.35 && !k.objs.some((o) => Math.floor(o.c) === c && Math.floor(o.r) === r)) k.add(pickTree(T.park, c, r, 0), c + 0.3 + 0.4 * h2, r + 0.3 + 0.4 * h3, { v: Math.floor(h2 * 1000) });
        else if (h1 > 0.92) k.add('bench', c + 0.5, r + 0.5, { v: Math.floor(h3 * 4) });
      } else if (kd === K.PATH) {
        const side = def.promenade ? def.promenade(c, r) : 0;
        if (r % 2 === 0) k.add(T.street, c + 0.5 + side * 0.25, r + 0.5, { v: r * 3 + c, s: 0.8 });
        else if (r % 4 === 1) k.add('lamp', c + 0.5 - side * 0.3, r + 0.5);
      } else if ((kd === K.GRASS || kd === K.SAND || kd === K.DUNE || kd === K.ROCK) && dist[at(c, r)] < 0) {
        const wild = kd === K.ROCK ? T.rock : kd === K.SAND || kd === K.DUNE ? T.sand : T.wild;
        if (!wild) continue;
        if (h1 < wild.p) k.add(pickTree(wild.list, c, r, 0), c + 0.5, r + 0.5, { v: Math.floor(h3 * 1000), s: 0.9 });
        else if (h1 < wild.p + (wild.bush || 0.06)) k.add(T.bush || 'bush', c + 0.5, r + 0.5, { v: Math.floor(h3 * 100) });
      }
    }

    /* what is near each lot */
    const pois = k.pois;
    function near(lot, test, radius) {   // the closest distance (in tiles) from a lot to a tile that passes the test
      let best = 99;
      for (let r = lot.r - radius; r <= lot.r + lot.w - 1 + radius; r++) for (let c = lot.c - radius; c <= lot.c + lot.w - 1 + radius; c++) {
        if (!inb(c, r) || !test(kind[at(c, r)], c, r)) continue;
        const dc = c < lot.c ? lot.c - c : c > lot.c + lot.w - 1 ? c - (lot.c + lot.w - 1) : 0;
        const dr = r < lot.r ? lot.r - r : r > lot.r + lot.w - 1 ? r - (lot.r + lot.w - 1) : 0;
        best = Math.min(best, Math.max(dc, dr));
      }
      return best;
    }
    function nearPoi(lot, kk) {
      let best = 99;
      pois.filter((p) => p.k === kk).forEach((p) => {
        const dc = Math.max(0, p.c - (lot.c + lot.w - 1), lot.c - (p.c + p.w - 1)), dr = Math.max(0, p.r - (lot.r + lot.w - 1), lot.r - (p.r + p.d - 1));
        best = Math.min(best, Math.max(dc, dr));
      });
      return best;
    }
    const fall = (dd, full, half) => (dd <= full ? 1 : dd <= half ? 0.5 : 0);
    const HOMES = { market: 1, high: 0.7, downtown: 0.35, skyline: 0.2, gateway: 0.05 }, OFFICES = { market: 0, high: 0.3, downtown: 1, skyline: 1, gateway: 0.6 };
    const feat = {};
    DISTRICTS.forEach((d) => {
      feat[d] = lots[d].map((lot) => {
        const f = {};
        f.park = Math.max(fall(near(lot, (kd) => kd === K.LAWN || kd === K.FOREST, 4), 2, 4), fall(nearPoi(lot, 'park'), 2, 4));
        f.water = fall(near(lot, (kd) => isWater(kd), 3), 2, 3);
        f.beach = fall(nearPoi(lot, 'beach'), 2, 5);
        f.school = Math.max(fall(nearPoi(lot, 'school'), 2, 4), fall(nearPoi(lot, 'library'), 1, 3) / 2);
        f.station = fall(nearPoi(lot, 'station'), 3, 6);
        f.hospital = fall(nearPoi(lot, 'hospital'), 2, 4);
        f.church = fall(nearPoi(lot, 'church'), 2, 4);
        f.tourism = fall(nearPoi(lot, 'tourism'), 2, 4);
        f.airport = fall(nearPoi(lot, 'airport'), 6, 9);
        f.harbour = fall(nearPoi(lot, 'harbour'), 2, 3);
        f.industry = fall(nearPoi(lot, 'industry'), 3, 5);
        f.avenue = near(lot, (kd) => kd === K.AVENUE, 1) <= 1 ? 1 : 0;
        const busy = f.avenue || f.station >= 1 || f.industry >= 1, square = nearPoi(lot, 'square') <= 1 || nearPoi(lot, 'tourism') <= 1;
        f.homes = Math.round(HOMES[d] * (busy ? 0.5 : square ? 0.7 : 1) * 100) / 100;
        f.offices = Math.round(Math.min(1, OFFICES[d] * (busy || square ? 1 : 0.6) + (f.station >= 1 ? 0.3 : 0)) * 100) / 100;
        f.quiet = !f.avenue && !f.industry && f.station < 1 ? 1 : 0;
        return f;
      });
    });
    // lots next to each other (for land values)
    const nbrs = {};
    DISTRICTS.forEach((d) => {
      nbrs[d] = lots[d].map((lot, i) => {
        const out = new Set();
        for (let r = lot.r - 1; r <= lot.r + lot.w; r++) for (let c = lot.c - 1; c <= lot.c + lot.w; c++) {
          if (!inb(c, r) || DISTRICTS[dist[at(c, r)]] !== d) continue;
          const j = lotAt[at(c, r)]; if (j >= 0 && j !== i) out.add(j);
        }
        return [...out];
      });
    });
    // which way a lot faces: towards its street (the map turns shop fronts that way)
    DISTRICTS.forEach((d) => lots[d].forEach((lot) => {
      const cand = [];
      for (let j = 0; j < lot.w; j++) cand.push([lot.c + j, lot.r + lot.w, 'S'], [lot.c + lot.w, lot.r + j, 'E'], [lot.c + j, lot.r - 1, 'N'], [lot.c - 1, lot.r + j, 'W']);
      const hit = cand.find(([c, r]) => isRoad(get(c, r))) || cand.find(([c, r]) => get(c, r) === K.PLAZA);
      lot.face = hit ? hit[2] : 'S';
    }));

    return {
      id: def.id, name: def.name, emoji: def.emoji, theme: def.id, climate: def.climate, names: def.names, emojis: def.emojis || {},
      N: N, K: K, KINDS: KINDS, DISTRICTS: DISTRICTS, kind: kind, dist: dist, lotAt: lotAt, height: k.height, lots: lots, feat: feat, nbrs: nbrs, objs: k.objs, pois: pois,
      centers: def.centers, agents: def.agents || {}, parade: route(def.parade || []), missing: def.missing || {}, hash: hash, isWater: isWater, isRoad: isRoad,
      get: get, at: at, inb: inb, H: k.H, bg: def.bg
    };
  }

  /* ================= Seaside Bay ================= */
  function buildBay() {
    const k = Kit(), { rect, set, street, blockOf, add, poi, at, dist, get, inb } = k;
    // the first map's 56 x 56 city stays exactly as it was (lot numbers in saves); the new land is east and south
    rect(0, 0, N - 1, N - 1, K.GRASS);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (c <= 2 || r <= 2) set(c, r, K.SEA);
      if (c <= 12 && r <= 12) set(c, r, K.SEA);
    }
    rect(25, 0, 26, 63, K.RIVER);
    rect(3, 51, 24, 55, K.FOREST); rect(30, 51, 55, 55, K.FIELD); rect(51, 30, 55, 55, K.FIELD); rect(30, 52, 37, 55, K.ORCHARD);
    rect(53, 3, 55, 27, K.FOREST); rect(27, 51, 29, 55, K.GRASS);
    rect(24, 3, 24, 60, K.PATH); rect(27, 3, 27, 60, K.PATH);
    rect(0, 28, N - 1, 29, K.AVENUE, (kd) => kd === K.SEA);
    rect(28, 3, 29, 58, K.AVENUE);
    rect(25, 28, 26, 29, K.BRIDGE);
    rect(0, 28, 2, 29, K.SEA);
    /* Market Street */
    blockOf(30, 30, 50, 50, 'market');
    [35, 41, 46, 50].forEach((c) => street(c, 30, c, 50));
    [35, 41, 46, 50].forEach((r) => street(30, r, 50, r));
    rect(30, 30, 34, 34, K.LAWN); rect(31, 31, 33, 32, K.POND); rect(30, 33, 34, 33, K.PATH); rect(32, 30, 32, 30, K.PATH);
    poi('park', 30, 30, 5, 5, 'City Park');
    rect(36, 36, 40, 40, K.PLAZA); poi('square', 36, 36, 5, 5, 'Market Square'); poi('tourism', 36, 36, 5, 5);
    rect(42, 30, 45, 34, K.SITE); poi('school', 42, 30, 4, 5, 'Primary school');
    rect(47, 36, 49, 40, K.SITE); poi('church', 47, 36, 3, 5, 'St Mary\'s church');
    /* High Street */
    blockOf(3, 30, 23, 50, 'high');
    rect(3, 30, 4, 50, K.SAND); poi('beach', 3, 30, 2, 21, 'Sunny Beach'); poi('tourism', 3, 36, 2, 10);
    street(5, 30, 5, 50);
    [11, 17, 23].forEach((c) => street(c, 30, c, 50));
    [35, 41, 46, 50].forEach((r) => street(5, r, 23, r));
    rect(12, 36, 16, 40, K.PLAZA); poi('square', 12, 36, 5, 5, 'Town Square'); poi('tourism', 12, 36, 5, 5);
    rect(18, 30, 22, 34, K.SITE); poi('library', 18, 30, 5, 5, 'Library');
    rect(6, 42, 10, 45, K.LAWN); poi('park', 6, 42, 5, 4, 'Beach Park');
    rect(18, 42, 22, 45, K.SITE); poi('school', 18, 42, 5, 4, 'Secondary school');
    /* Downtown */
    blockOf(30, 3, 52, 27, 'downtown');
    rect(30, 3, 52, 3, K.PLAZA); poi('tourism', 30, 3, 23, 1, 'Waterfront');
    [35, 41, 47, 52].forEach((c) => street(c, 4, c, 27));
    [9, 15, 21].forEach((r) => street(30, r, 52, r));
    rect(30, 25, 55, 25, K.RAIL, (kd) => kd === K.AVENUE);
    [35, 41, 47, 52].forEach((c) => set(c, 25, K.CROSSING));
    rect(30, 22, 34, 27, K.SITE); rect(30, 25, 34, 25, K.RAIL); poi('station', 30, 22, 5, 6, 'Central Station');
    rect(42, 10, 46, 14, K.PLAZA); poi('museum', 42, 10, 5, 5, 'City Museum'); poi('tourism', 42, 10, 5, 5);
    rect(36, 4, 40, 8, K.SITE); poi('hospital', 36, 4, 5, 5, 'City Hospital');
    rect(48, 16, 51, 20, K.SITE); poi('hall', 48, 16, 4, 5, 'City Hall');
    rect(38, 0, 38, 2, K.PIER); rect(42, 0, 42, 2, K.PIER); rect(46, 1, 46, 2, K.PIER);
    poi('marina', 37, 0, 10, 3, 'Marina'); poi('tourism', 37, 0, 10, 3);
    /* Skyline & Harbour */
    blockOf(3, 3, 23, 27, 'skyline');
    for (let r = 3; r <= 12; r++) for (let c = 3; c <= 12; c++) dist[at(c, r)] = -1;
    rect(3, 13, 12, 13, K.PLAZA); poi('tourism', 3, 13, 10, 1, 'Bay promenade');
    rect(13, 3, 16, 12, K.QUAY); rect(13, 0, 13, 2, K.QUAY); poi('harbour', 13, 0, 4, 13, 'Container port'); poi('industry', 13, 3, 4, 10);
    street(17, 3, 17, 27); street(5, 13, 5, 27); street(11, 14, 11, 27); street(23, 3, 23, 27);
    [18, 23].forEach((r) => street(5, r, 23, r)); street(17, 8, 23, 8);
    rect(3, 4, 10, 8, K.APRON); rect(3, 4, 10, 5, K.RUNWAY); rect(3, 6, 5, 8, K.SITE);
    rect(5, 9, 5, 12, K.BRIDGE); set(5, 8, K.ROAD);
    poi('airport', 3, 4, 8, 5, 'Island Airport'); poi('industry', 3, 4, 8, 2);
    rect(8, 10, 8, 12, K.PIER); rect(10, 10, 10, 12, K.PIER); poi('marina', 6, 9, 6, 4, 'Bay marina'); poi('tourism', 6, 9, 6, 4);
    rect(18, 19, 22, 22, K.LAWN); poi('park', 18, 19, 5, 4, 'Skyline Gardens');
    rect(3, 14, 4, 27, K.LAWN); poi('park', 3, 14, 2, 14, 'Cliff Park');

    /* the Gateway: docks, the international airport and the airport station, east of Downtown */
    blockOf(57, 3, 71, 32, 'gateway');
    rect(56, 3, 56, 24, K.FOREST);
    rect(57, 3, 71, 4, K.QUAY); poi('harbour', 57, 1, 15, 4, 'Gateway docks'); poi('industry', 57, 3, 15, 2);
    street(57, 5, 71, 5); street(57, 5, 57, 32); street(57, 9, 71, 9); street(57, 16, 64, 16); street(57, 20, 71, 20);
    rect(58, 10, 71, 11, K.RUNWAY); rect(58, 12, 71, 12, K.APRON); rect(65, 13, 71, 16, K.APRON); rect(58, 17, 71, 18, K.RUNWAY);
    poi('airport', 58, 10, 14, 9, 'International airfield'); poi('industry', 58, 10, 14, 2);
    rect(56, 25, 71, 25, K.RAIL); set(57, 25, K.CROSSING);
    rect(60, 26, 64, 27, K.SITE); poi('station', 60, 25, 5, 3, 'Airport station');
    rect(58, 19, 71, 19, K.GRASS);
    /* the countryside: farms, rolling hills, a hill lake, the forest, mountains and the river's source */
    rect(30, 56, 55, 60, K.FIELD); rect(38, 56, 44, 60, K.ORCHARD);
    rect(60, 40, 66, 45, K.POND); poi('park', 60, 40, 7, 6, 'Hill Lake');
    rect(3, 56, 24, 62, K.FOREST);
    rect(21, 61, 30, 66, K.POND); rect(25, 56, 26, 60, K.RIVER);
    hills(k, (c, r) => (c >= 56 && r >= 33) || (r >= 56 && c >= 45), 4, 31);
    hills(k, (c, r) => r >= 51 && c <= 24, 4, 37);
    mountain(k, 12, 66, 11, 10, 41, 5); mountain(k, 36, 68, 9, 8, 43, 5); mountain(k, 52, 66, 7, 6, 47, 5);
    rect(64, 47, 70, 53, K.TERRACE, (kd) => kd !== K.GRASS);
    /* landmarks and fixed things (the first map's, then the new) */
    add('pond-ducks', 31, 31, { w: 3, d: 2 });
    add('playground', 30, 34); add('playground', 34, 30); add('kiosk', 34, 34);
    [[30, 30], [31, 30], [33, 30], [34, 31], [34, 32], [30, 31], [30, 32], [31, 34], [33, 34], [34, 33]].forEach(([c, r], j) => add('tree', c + 0.5, r + 0.5, { v: j }));
    add('fountain', 38, 38);
    [[36, 36], [37, 36], [39, 36], [40, 36], [36, 40], [37, 40], [39, 40], [40, 40], [36, 38], [40, 38]].forEach(([c, r]) => add('stall', c, r, { v: c * 7 + r }));
    add('school', 42, 31, { w: 2, d: 2 }); add('pitch-small', 44, 30, { w: 2, d: 3 }); add('playground', 42, 34); add('tree', 45.5, 34.5, { v: 3 });
    add('church', 47, 37, { w: 2, d: 3 }); add('tree', 49.5, 36.5, { v: 5 }); add('tree', 49.5, 40.5, { v: 6 });
    add('clocktower', 14, 38); add('fountain', 13, 37); add('fountain', 15, 39);
    [[12, 36], [16, 36], [12, 40], [16, 40]].forEach(([c, r], j) => add('tree', c + 0.5, r + 0.5, { v: j + 11 }));
    add('library', 19, 31, { w: 3, d: 3 }); add('tree', 18.5, 30.5, { v: 9 }); add('tree', 22.5, 34.5, { v: 8 });
    add('playground', 7, 43); add('tree', 9.5, 42.5, { v: 2 }); add('palm', 6.5, 44.5); add('palm', 10.5, 45.5);
    add('school', 19, 43, { w: 2, d: 2 }); add('court', 21, 42, { w: 2, d: 2 });
    for (let r = 31; r <= 50; r += 2) { add('umbrella', 3.5, r + 0.3, { v: r }); add('palm', 4.5, r + 1.4); }
    add('beachhut', 3, 34); add('beachhut', 3, 41); add('beachhut', 3, 47);
    add('hospital', 37, 5, { w: 3, d: 3 }); add('helipad', 36, 8);
    add('museum', 43, 11, { w: 3, d: 3 }); add('fountain', 42, 14); add('tree', 46.5, 14.5, { v: 4 }); add('tree', 42.5, 10.5, { v: 7 });
    add('cityhall', 48, 17, { w: 3, d: 3 }); add('tree', 51.5, 16.5, { v: 1 });
    add('station', 30, 22, { w: 5, d: 3 }); add('platform', 30, 26, { w: 5, d: 1 });
    [38, 42, 46].forEach((c) => { add('yacht', c - 0.6, 1, { v: c }); add('yacht', c + 0.5, 1.4, { v: c + 1 }); });
    add('terminal', 3, 6, { w: 3, d: 2 }); add('ctower', 5, 8); add('hangar', 9, 7, { w: 2, d: 1 });
    for (let r = 4; r <= 11; r += 2) add('crane', 13, r);
    for (let r = 3; r <= 12; r++) for (let c = 14; c <= 16; c++) if ((c + r) % 3 !== 0) add('containers', c, r, { v: c * 13 + r });
    add('lighthouse', 13, 0);
    [7, 9, 11].forEach((c) => { add('yacht', c, 10.6, { v: c }); add('yacht', c, 12.2, { v: c + 3 }); });
    add('farmhouse', 52, 37, { w: 2, d: 2 }); add('barn', 52, 40, { w: 2, d: 2 }); add('silo', 54, 39); add('windmill', 53, 46); add('windmill', 44, 53);
    rect(52, 37, 53, 41, K.SITE);
    for (let i = 4; i < 56; i += 3) { if (!isWater(get(i, 27))) add('lamp', i + 0.5, 27.85); if (!isWater(get(i, 30))) add('lamp', i + 0.5, 30.15); }
    for (let i = 4; i < 56; i += 3) { add('lamp', 27.85, i + 0.5); if (get(30, i) !== K.RAIL) add('lamp', 30.15, i + 0.5); }
    // the Gateway
    for (let c = 58; c <= 70; c += 3) add('crane', c, 3, { face: 'r' });
    add('cruiseship', 60, 1.2, { w: 4, d: 1 }); add('cruiseship', 66, 1.2, { w: 4, d: 1 });
    add('terminal2', 66, 13, { w: 4, d: 3 }); add('ctower', 70, 16); add('hangar', 66, 12.2, { w: 2, d: 1 });
    add('station', 60, 26, { w: 5, d: 2 });
    [[61, 42], [68, 36], [70, 41], [58, 50], [67, 58], [60, 62]].forEach(([c, r]) => { if (get(c, r) !== K.POND && get(c, r) !== K.VOID) add('turbine', c + 0.5, r + 0.5); });
    add('farmhouse', 46, 57, { w: 2, d: 2 }); add('barn', 49, 57, { w: 2, d: 2 }); add('windmill', 34, 58);
    outline(k, (c, r, kd, edge, n) => !(kd === K.SEA && edge === 0 && n > 2.4) && c + r < 122 + n * 2 && (c < 68 + n || r > 62 - n * 4) && (r < 69 + n * 0.5), 5);
    return finish(k, {
      id: 'bay', name: 'Seaside Bay', emoji: '🌊', climate: 'snowy',
      names: { market: 'Market Street', high: 'High Street', downtown: 'Downtown', skyline: 'Skyline & Harbour', gateway: 'Gateway' },
      centers: { market: [40, 40], high: [13, 40], downtown: [41, 15], skyline: [13, 15], gateway: [64, 17] },
      trees: { yard: [['tree', 1]], forest: [['pine', 0.55], ['tree', 0.45]], park: [['tree', 1]], street: 'tree', bush: 'bush',
        wild: { p: 0.18, list: [['pine', 0.35], ['tree', 0.65]] }, rock: { p: 0.06, list: [['pine', 1]] } },
      promenade: (c) => (c === 24 ? -1 : 1),
      agents: {
        boats: [
          { path: [[1.2, 52], [1.3, 30], [1.1, 14], [1.6, 2], [9, 1.6], [1.6, 2], [1.1, 14], [1.3, 30]], sp: 0.55, k: 'ferry' },
          { path: [[1.4, 40], [0.9, 48], [1.5, 54], [0.9, 48]], sp: 0.3, k: 'sail' },
          { path: [[16, 1.2], [24, 0.8], [35, 1.3], [24, 0.8]], sp: 0.3, k: 'sail' },
          { path: [[48, 1.2], [54, 0.9], [50, 1.6], [47.5, 0.9]], sp: 0.25, k: 'sail' },
          { path: [[11.6, 0.6], [11.6, 6.6], [11.6, 6.6], [11.6, 6.6], [11.6, 0.6], [11.6, 0.6]], sp: 0.18, k: 'ship' },
          { path: [[57, 1.4], [70, 1.4], [70, 1.4], [57, 1.4]], sp: 0.12, k: 'ship' }],
        trains: [{ r: 25.5, from: 72, stop: 31, len: 4, k: 'train' }],
        planes: [{ c0: 2, r0: 4.5, c1: 20, r1: 4.5 }, { c0: 57, r0: 10.5, c1: 76, r1: 10.5 }]
      },
      parade: [[29, 50], [29, 29], [51, 29]],
      bg: ['#cfe9f6', '#e9f3ec']
    });
  }

  /* ================= Desert Oasis ================= */
  function buildDesert() {
    const k = Kit(), { rect, set, street, blockOf, add, poi, roadOver, get } = k;
    rect(0, 0, N - 1, N - 1, K.SAND);
    // the sea along the west, a palm-shaped island, a creek into a lagoon
    k.each((c, r) => { const coast = 13 + Math.round((vnoise(r / 5, 0, 11) - 0.5) * 3); if (c <= coast) set(c, r, K.SEA); });
    rect(8, 34, 13, 35, K.SAND);                                         // the island's trunk
    [[2, 24, 45], [4, 26, 43], [6, 28, 41]].forEach(([c, r0, r1]) => rect(c, r0, c, r1, K.SAND));   // its fronds
    rect(0, 21, 0, 48, K.SAND); rect(0, 21, 2, 21, K.SAND); rect(0, 48, 2, 48, K.SAND);   // the breakwater ring
    poi('tourism', 0, 21, 14, 28, 'Palm Island'); poi('beach', 0, 21, 8, 28, 'Palm Island');
    rect(14, 36, 44, 37, K.SEA); rect(44, 32, 49, 40, K.SEA);           // the creek and the lagoon
    poi('harbour', 40, 31, 11, 11, 'Creek harbour');
    // the coast road and the great highway north to south
    street(15, 4, 15, 70); rect(30, 3, 31, 70, K.AVENUE); roadOver(30, 36, 31, 37, K.AVENUE);
    rect(15, 61, 71, 62, K.AVENUE);
    /* Old Souk: the old town by the creek mouth */
    blockOf(16, 39, 29, 58, 'market', true);
    [21, 26].forEach((c) => street(c, 39, c, 58)); [44, 50, 55].forEach((r) => street(16, r, 29, r)); street(16, 38, 29, 38);
    rect(22, 45, 25, 49, K.PLAZA); poi('square', 22, 45, 4, 5, 'The Souk'); poi('tourism', 22, 45, 4, 5);
    rect(16, 51, 20, 54, K.SITE); poi('tourism', 16, 51, 5, 4, 'Old Fort');
    rect(27, 39, 29, 43, K.SITE); poi('school', 27, 39, 3, 5, 'Souk school');
    rect(16, 39, 18, 41, K.LAWN); poi('park', 16, 39, 3, 3, 'Creek garden');
    /* Palm Road: shops along the beach, north of the creek */
    blockOf(16, 13, 29, 34, 'high', true);
    rect(16, 13, 16, 34, K.SAND); poi('beach', 15, 13, 2, 22, 'Gold Beach');
    [21, 26].forEach((c) => street(c, 13, c, 34)); [18, 24, 30].forEach((r) => street(17, r, 29, r)); street(17, 12, 29, 12); street(17, 35, 29, 35);
    rect(22, 19, 25, 23, K.PLAZA); poi('square', 22, 19, 4, 5, 'Palm Square'); poi('tourism', 22, 19, 4, 5);
    rect(27, 25, 29, 29, K.SITE); poi('church', 27, 25, 3, 5, 'Wedding Palace');
    rect(17, 31, 20, 34, K.LAWN); poi('park', 17, 31, 4, 4, 'Beach park');
    /* Downtown: south of the creek, east of the highway */
    blockOf(33, 39, 52, 59, 'downtown', true);
    [38, 44, 49].forEach((c) => street(c, 38, c, 59)); [45, 51, 56].forEach((r) => street(32, r, 52, r)); street(32, 38, 52, 38);
    rect(39, 46, 43, 50, K.PLAZA); poi('tourism', 39, 46, 5, 5, 'Sky Spire');
    rect(33, 39, 37, 44, K.SITE); poi('station', 33, 39, 5, 6, 'Metro station');
    rect(45, 52, 48, 55, K.SITE); poi('hospital', 45, 52, 4, 4, 'Desert Hospital');
    rect(50, 39, 52, 44, K.SITE); poi('museum', 50, 39, 3, 6, 'Museum of the Future'); poi('tourism', 50, 39, 3, 6);
    /* Marina Towers: around the lagoon */
    blockOf(33, 13, 56, 31, 'skyline', true);
    [38, 44, 50, 56].forEach((c) => street(c, 12, c, 31)); [17, 22, 27].forEach((r) => street(32, r, 57, r)); street(32, 12, 57, 12);
    rect(33, 30, 43, 31, K.PLAZA); rect(50, 30, 57, 31, K.PLAZA); poi('tourism', 33, 30, 24, 2, 'Marina walk');
    rect(39, 18, 43, 21, K.LAWN); poi('park', 39, 18, 5, 4, 'Marina Gardens');
    /* the Gateway: the seaport in the north-west, the desert airport in the north-east */
    blockOf(16, 2, 44, 10, 'gateway', true); rect(45, 2, 66, 10, K.SAND);
    rect(14, 0, 18, 10, K.QUAY); poi('harbour', 13, 0, 6, 11, 'Sea port'); poi('industry', 14, 0, 5, 11);
    street(19, 1, 19, 11); street(19, 6, 52, 6); street(19, 11, 64, 11); street(44, 6, 44, 11);
    rect(46, 0, 66, 1, K.RUNWAY); rect(46, 2, 66, 2, K.APRON); rect(58, 3, 66, 5, K.APRON);
    poi('airport', 46, 0, 21, 6, 'Desert International'); poi('industry', 46, 0, 21, 2);
    rect(32, 2, 36, 5, K.SITE); poi('station', 32, 2, 5, 4, 'Airport metro');
    /* the desert: dunes, an oasis, mesas, irrigated circles, a camel track */
    rect(56, 42, 61, 47, K.POND); rect(54, 40, 63, 49, K.LAWN, (kd) => kd === K.POND); poi('park', 54, 40, 10, 10, 'The Oasis'); poi('tourism', 54, 40, 10, 10);
    rect(36, 64, 48, 71, K.FIELD); rect(52, 64, 62, 71, K.FIELD);
    rect(58, 13, 70, 30, K.ROCK);
    k.each((c, r, kd) => { if (kd === K.SAND && k.dist[k.at(c, r)] < 0 && (c > 52 || r > 60 || (c > 15 && r > 58)) && fbm(c, r, 51) > 0.45) set(c, r, K.DUNE); });
    hills(k, (c, r, kd) => kd === K.DUNE, 3, 53);
    k.each((c, r, kd) => { if (kd === K.ROCK) { const v = fbm(c, r, 57); k.setH(c, r, v > 0.5 ? 6 : v > 0.38 ? 4 : 2); } });
    /* landmarks */
    add('skyspire', 40, 47, { w: 3, d: 3 }); add('fountain', 39, 50); add('fountain', 43, 46);
    add('station', 33, 40, { w: 4, d: 3 }); add('hospital', 45, 52, { w: 3, d: 3 }); add('helipad', 48, 55);
    add('museumring', 50, 40, { w: 3, d: 4 });
    add('fort', 16, 51, { w: 4, d: 3 }); add('school', 27, 40, { w: 2, d: 2 });
    for (let c = 22; c <= 25; c++) { add('stall', c, 45, { v: c * 5 }); add('stall', c, 49, { v: c * 5 + 2 }); }
    add('fountain', 23, 47);
    add('weddinghall', 27, 26, { w: 3, d: 3 }); add('fountain', 23, 21);
    for (let r = 14; r <= 33; r += 2) { add('umbrella', 16.5, r + 0.3, { v: r }); add('palm', 16.8, r + 1.3); }
    for (let r = 25; r <= 44; r += 3) { add('villa', 2, r); add('villa', 4, r + 1); add('villa', 6, r + 2); add('palm', 2.5, r + 1.5); add('palm', 6.5, r + 0.5); }
    add('palmhotel', 0, 33, { w: 1, d: 3 });
    for (let c = 15; c <= 18; c += 1) for (let r = 1; r <= 9; r += 2) if ((c + r) % 3) add('containers', c, r, { v: c * 7 + r });
    for (let r = 2; r <= 10; r += 2) add('crane', 14, r);
    add('terminal2', 58, 3, { w: 4, d: 3 }); add('ctower', 63, 5);
    add('dhow', 20, 36.4); add('dhow', 27, 36.6); add('dhow', 35, 36.3); add('dhow', 46, 35);
    [[57, 41], [62, 41], [55, 48], [62, 48], [59, 49], [54, 44]].forEach(([c, r]) => add('palm', c + 0.5, r + 0.5));
    add('racetrack', 56, 52, { w: 10, d: 7 });
    add('camelpen', 66, 46);
    [[40, 66], [44, 69], [56, 66], [60, 69]].forEach(([c, r]) => add('pivot', c, r));
    outline(k, (c, r, kd, edge, n) => !(kd === K.SEA && edge < n * 0.8) && c + r < 128 + n * 2 && r < 70 + n * 0.4 && c < 70 + n * 0.4, 61);
    return finish(k, {
      id: 'desert', name: 'Desert Oasis', emoji: '🐪', climate: 'dry',
      names: { market: 'Old Souk', high: 'Palm Road', downtown: 'Downtown', skyline: 'Marina Towers', gateway: 'Gateway' },
      emojis: { market: '🏺', high: '🌴', skyline: '🛥️' },
      centers: { market: [22, 48], high: [22, 23], downtown: [42, 48], skyline: [44, 21], gateway: [40, 6] },
      trees: { yard: [['palm', 0.55], ['shrub', 0.3], ['acacia', 0.15]], forest: [['palm', 1]], park: [['palm', 0.7], ['acacia', 0.3]], street: 'palm', bush: 'shrub',
        wild: { p: 0.05, list: [['acacia', 0.6], ['shrub', 0.4]] }, sand: { p: 0.025, list: [['shrub', 0.7], ['acacia', 0.3]], bush: 0.02 }, rock: { p: 0.02, list: [['shrub', 1]] } },
      agents: {
        boats: [
          { path: [[10, 4], [11, 30], [11, 50], [10, 66], [11, 50], [11, 30]], sp: 0.4, k: 'ferry' },
          { path: [[16, 36.5], [42, 36.5], [42, 36.5], [16, 36.5]], sp: 0.25, k: 'dhowboat' },
          { path: [[3.5, 22], [3.5, 46], [5.5, 46], [5.5, 22]], sp: 0.3, k: 'sail' },
          { path: [[12, 0.5], [12, 9], [12, 9], [12, 0.5]], sp: 0.15, k: 'ship' }],
        trains: [],
        monorail: { r: 34.5, c0: 15, c1: 1 },
        planes: [{ c0: 45, r0: 0.5, c1: 72, r1: 0.5 }],
        camels: [[[52, 66], [70, 66], [70, 52], [64, 36], [52, 66]]],
        balloons: 3
      },
      parade: [[30, 40], [30, 61], [48, 61]],
      bg: ['#f6e3c3', '#fbf1e0']
    });
  }

  /* ================= Neon City ================= */
  function buildNeon() {
    const k = Kit(), { rect, set, street, blockOf, add, poi } = k;
    rect(0, 0, N - 1, N - 1, K.SAND);
    // a lake in the south-west with a dam, mountains all round the valley
    rect(4, 48, 21, 67, K.SEA); rect(22, 56, 22, 64, K.SEA);
    poi('harbour', 18, 52, 6, 14, 'Lake marina'); poi('tourism', 4, 48, 18, 20, 'Lake'); poi('beach', 4, 46, 18, 2, 'Lake beach');
    rect(4, 46, 21, 47, K.SAND);
    /* The Strip: a boulevard of giant resorts */
    rect(34, 4, 35, 66, K.AVENUE);
    blockOf(24, 18, 46, 53, 'skyline', true);
    [29, 40, 46].forEach((c) => street(c, 17, c, 54)); street(23, 17, 23, 54); [17, 24, 31, 38, 45, 54].forEach((r) => street(23, r, 46, r));
    rect(36, 30, 39, 31, K.POND); poi('tourism', 36, 30, 4, 2, 'Fountain show');
    rect(24, 25, 28, 30, K.SITE); poi('tourism', 24, 25, 5, 6, 'Pyramid resort');
    rect(41, 18, 45, 23, K.SITE); poi('tourism', 41, 18, 5, 6, 'The Sphere');
    rect(24, 46, 28, 53, K.SITE); poi('tourism', 24, 46, 5, 8, 'Castle resort');
    rect(41, 39, 45, 44, K.SITE); poi('tourism', 41, 39, 5, 6, 'Big wheel');
    rect(30, 39, 33, 44, K.SITE); poi('tourism', 30, 39, 4, 6, 'Paris tower');
    rect(36, 46, 39, 48, K.SITE); poi('church', 36, 46, 4, 3, 'Wedding chapel');
    rect(24, 32, 28, 37, K.SITE); rect(24, 38, 28, 38, K.POND); poi('tourism', 24, 32, 5, 7, 'Volcano resort');
    rect(30, 18, 33, 23, K.SITE); poi('tourism', 30, 18, 4, 6, 'Lucky Tower');
    rect(36, 39, 39, 44, K.LAWN); rect(37, 41, 38, 42, K.POND); poi('park', 36, 39, 4, 6, 'Pool garden');
    /* Downtown: the old centre at the north end, with the light canopy */
    blockOf(20, 3, 50, 15, 'downtown', true);
    [25, 30, 40, 45, 50].forEach((c) => street(c, 3, c, 16)); [3, 9, 16].forEach((r) => street(20, r, 50, r)); street(20, 3, 20, 16);
    rect(26, 10, 44, 11, K.PLAZA); poi('tourism', 26, 10, 19, 2, 'Light canopy'); poi('square', 26, 10, 19, 2);
    rect(41, 4, 44, 8, K.SITE); poi('station', 41, 4, 4, 5, 'Neon station');
    rect(21, 4, 24, 8, K.SITE); poi('hospital', 21, 4, 4, 5, 'Valley Hospital');
    rect(36, 4, 39, 8, K.SITE); poi('tourism', 36, 4, 4, 5, 'Sky Tower');
    /* Old Town (east) and Main Street (west) */
    blockOf(50, 19, 66, 44, 'market', true);
    [55, 60, 66].forEach((c) => street(c, 18, c, 45)); [18, 25, 31, 38, 45].forEach((r) => street(48, r, 66, r)); street(49, 18, 49, 45);
    rect(56, 26, 59, 30, K.PLAZA); poi('square', 56, 26, 4, 5, 'Farmers\' market'); poi('tourism', 56, 26, 4, 5);
    rect(61, 32, 65, 36, K.LAWN); poi('park', 61, 32, 5, 5, 'Old Town park');
    rect(50, 39, 54, 43, K.SITE); poi('school', 50, 39, 5, 5, 'Valley school');
    blockOf(6, 19, 21, 44, 'high', true);
    [11, 16, 21].forEach((c) => street(c, 18, c, 45)); [18, 25, 31, 38, 45].forEach((r) => street(6, r, 22, r)); street(6, 18, 6, 45);
    rect(12, 26, 15, 30, K.PLAZA); poi('square', 12, 26, 4, 5, 'Theatre square'); poi('tourism', 12, 26, 4, 5);
    rect(7, 32, 10, 37, K.LAWN); poi('park', 7, 32, 4, 6, 'Desert Botanic Garden');
    rect(17, 39, 20, 43, K.SITE); poi('library', 17, 39, 4, 5, 'Library');
    // the cross streets that join the districts to the Strip
    street(22, 18, 23, 18); street(46, 18, 49, 18); street(22, 45, 23, 45); street(46, 45, 49, 45); street(20, 16, 23, 17);
    /* the Gateway: the airport south of the Strip, docks on the lake */
    blockOf(23, 56, 62, 67, 'gateway', true);
    street(23, 55, 62, 55); street(23, 55, 23, 67); street(29, 55, 29, 67); street(36, 60, 62, 60); street(23, 66, 62, 66);
    rect(40, 61, 62, 62, K.RUNWAY); rect(40, 63, 62, 63, K.APRON); rect(40, 64, 62, 65, K.RUNWAY);
    poi('airport', 40, 61, 23, 5, 'Neon International'); poi('industry', 40, 61, 23, 2);
    rect(36, 56, 39, 59, K.SITE); poi('station', 36, 56, 4, 4, 'Airport station');
    poi('industry', 22, 56, 2, 9);
    /* mountains round the valley, Joshua trees on the desert floor */
    k.each((c, r, kd) => {
      if (kd !== K.SAND || k.dist[k.at(c, r)] >= 0) return;
      const edge = Math.min(c, r, N - 1 - c, N - 1 - r), rim = 1 - edge / 9 + (fbm(c, r, 71) - 0.5) * 0.8;
      if (rim > 0.15) { set(c, r, K.ROCK); k.setH(c, r, Math.min(10, rim * 9 + fbm(c, r, 73) * 3)); }
    });
    hills(k, (c, r, kd) => kd === K.SAND && (r > 46 || c > 58), 2, 77);
    /* landmarks */
    add('pyramid', 24, 25, { w: 5, d: 5 }); add('sphere', 41, 18, { w: 5, d: 5 }); add('castle', 24, 47, { w: 5, d: 6 });
    add('bigwheel', 41, 39, { w: 5, d: 5 }); add('eiffel', 30, 40, { w: 4, d: 4 }); add('chapel', 36, 46, { w: 3, d: 3 });
    add('showfountain', 36, 30, { w: 4, d: 2 }); add('skytower', 36, 4, { w: 4, d: 4 });
    add('volcano', 24, 32, { w: 5, d: 6 }); add('resorttower', 30, 18, { w: 4, d: 6 }); add('pools', 36, 39, { w: 4, d: 6 });
    add('station', 41, 5, { w: 4, d: 3 }); add('hospital', 21, 5, { w: 3, d: 3 });
    add('canopy', 26, 10, { w: 19, d: 2 });
    add('welcome', 34.5, 66.5);
    add('school', 51, 40, { w: 2, d: 2 }); add('library', 17, 40, { w: 3, d: 3 });
    for (let c = 56; c <= 59; c++) { add('stall', c, 26, { v: c * 3 }); add('stall', c, 30, { v: c * 3 + 1 }); }
    add('fountain', 13, 28);
    add('terminal2', 30, 61, { w: 5, d: 4 }); add('ctower', 38, 63); add('hangar', 58, 63, { w: 2, d: 1 });
    add('station', 36, 56, { w: 4, d: 3 });
    add('dam', 4, 67, { w: 18, d: 1 });
    [[20, 50], [20, 55], [21, 60]].forEach(([c, r]) => add('yacht', c, r + 0.5, { v: c + r }));
    for (let r = 6; r <= 64; r += 3) { add('palm', 33.6, r + 0.5); add('palm', 36.4, r + 1.5); }
    outline(k, (c, r, kd, edge, n) => edge > n * 0.9 - 0.6 && c + r < 132 + n && c + r > 6 + n, 79);
    return finish(k, {
      id: 'neon', name: 'Neon City', emoji: '🎆', climate: 'dry',
      missing: { port: 'Neon City is in the middle of the desert: no ship can reach a container port here.' },
      names: { market: 'Old Town', high: 'Main Street', downtown: 'Downtown', skyline: 'The Strip', gateway: 'Gateway' },
      emojis: { market: '🌵', skyline: '🎆', downtown: '🌃' },
      centers: { market: [57, 31], high: [13, 31], downtown: [35, 9], skyline: [35, 35], gateway: [45, 61] },
      trees: { yard: [['palm', 0.45], ['shrub', 0.35], ['joshua', 0.2]], forest: [['joshua', 1]], park: [['palm', 0.5], ['cactus', 0.5]], street: 'palm', bush: 'shrub',
        wild: { p: 0.04, list: [['joshua', 1]] }, sand: { p: 0.04, list: [['joshua', 0.45], ['cactus', 0.35], ['shrub', 0.2]], bush: 0.03 }, rock: { p: 0.03, list: [['shrub', 1]] } },
      agents: {
        boats: [{ path: [[6, 50], [19, 52], [18, 64], [7, 62]], sp: 0.3, k: 'ferry' }, { path: [[8, 56], [16, 58], [10, 60]], sp: 0.25, k: 'sail' }],
        trains: [],
        monorail: { c: 47.5, r0: 17, r1: 55 },
        planes: [{ c0: 39, r0: 61.5, c1: 70, r1: 61.5 }, { c0: 39, r0: 64.5, c1: 70, r1: 64.5 }],
        helicopters: 2
      },
      parade: [[34, 8], [34, 50]],
      bg: ['#2b2350', '#e8a87c']
    });
  }

  /* ================= Sakura City ================= */
  function buildSakura() {
    const k = Kit(), { rect, set, street, blockOf, add, poi, roadOver, get } = k;
    rect(0, 0, N - 1, N - 1, K.GRASS);
    // the bay in the north, the sea down the east coast, the river from the volcano to the bay
    k.each((c, r) => { const coastN = 8 + Math.round((vnoise(c / 6, 1, 81) - 0.5) * 3), coastE = 67 + Math.round((vnoise(2, r / 6, 83) - 0.5) * 3), coastW = 3 + Math.round(vnoise(5, r / 5, 85) * 3); if (r <= coastN || c >= coastE || (c <= coastW && r < 50)) set(c, r, K.SEA); });
    rect(6, 12, 19, 22, K.FIELD); rect(7, 38, 19, 46, K.FIELD); poi('park', 6, 12, 14, 11, 'Rice paddies');
    rect(14, 23, 20, 25, K.FOREST); rect(4, 26, 8, 36, K.FOREST);
    rect(22, 9, 23, 47, K.RIVER);
    rect(21, 9, 21, 47, K.PATH); rect(24, 9, 24, 47, K.PATH); poi('park', 21, 9, 4, 39, 'Cherry river');
    /* the castle on its hill, inside a moat */
    rect(10, 26, 19, 35, K.POND); rect(11, 27, 18, 34, K.LAWN); rect(13, 29, 16, 32, K.SITE); roadOver(14, 35, 15, 35, K.ROAD); roadOver(19, 30, 20, 30, K.ROAD);
    poi('park', 10, 26, 10, 10, 'Castle park'); poi('tourism', 10, 26, 10, 10, 'Sakura Castle');
    /* Shotengai: the old shopping lanes */
    blockOf(26, 40, 44, 56, 'market');
    [31, 36, 40, 44].forEach((c) => street(c, 40, c, 57)); [44, 49, 53, 57].forEach((r) => street(25, r, 44, r)); street(25, 39, 44, 39); street(25, 39, 25, 57);
    rect(32, 45, 35, 48, K.PLAZA); poi('square', 32, 45, 4, 4, 'Covered arcade'); poi('tourism', 32, 45, 4, 4);
    rect(37, 50, 39, 52, K.LAWN); rect(38, 51, 38, 51, K.POND); poi('park', 37, 50, 3, 3, 'Temple garden'); poi('tourism', 37, 50, 3, 3);
    rect(41, 54, 43, 56, K.SITE); poi('church', 41, 54, 3, 3, 'Shrine');
    rect(26, 50, 30, 52, K.SITE); poi('school', 26, 50, 5, 3, 'Elementary school');
    /* Ginza Street */
    blockOf(26, 16, 44, 30, 'high');
    [31, 36, 40, 44].forEach((c) => street(c, 16, c, 31)); [21, 26, 31].forEach((r) => street(25, r, 44, r)); street(25, 15, 44, 15); street(25, 15, 25, 31);
    rect(32, 22, 35, 25, K.PLAZA); poi('square', 32, 22, 4, 4, 'Ginza crossing'); poi('tourism', 32, 22, 4, 4);
    rect(26, 27, 30, 30, K.SITE); poi('library', 26, 27, 5, 4, 'Library');
    /* Downtown: the station, the red tower, the scramble crossing */
    blockOf(46, 16, 64, 34, 'downtown');
    [50, 55, 60, 64].forEach((c) => street(c, 15, c, 35)); [21, 26, 31].forEach((r) => street(46, r, 65, r)); street(45, 15, 65, 15); street(45, 15, 45, 35);
    rect(56, 22, 59, 25, K.PLAZA); poi('tourism', 56, 22, 4, 4, 'Scramble crossing'); poi('square', 56, 22, 4, 4);
    rect(61, 27, 63, 30, K.SITE); poi('tourism', 61, 27, 3, 4, 'Red Tower');
    rect(46, 32, 49, 34, K.SITE); poi('hospital', 46, 32, 4, 3, 'Sakura Hospital');
    // the bullet train line along the middle, with the central station
    rect(4, 37, 71, 37, K.RAIL); [25, 31, 36, 40, 44, 45, 50, 55, 60, 64].forEach((c) => { if (get(c, 37) === K.RAIL) set(c, 37, K.CROSSING); });
    rect(22, 37, 23, 37, K.BRIDGE); set(22, 37, K.RAIL); set(23, 37, K.RAIL);
    rect(50, 35, 55, 36, K.SITE); poi('station', 50, 35, 6, 3, 'Sakura Central');
    rect(46, 38, 66, 38, K.ROAD); street(45, 35, 45, 38); street(65, 15, 65, 38);
    /* Bay Towers: the waterfront */
    blockOf(26, 9, 64, 13, 'skyline');
    [31, 37, 43, 49, 55, 61].forEach((c) => street(c, 9, c, 14)); street(25, 14, 66, 14); street(25, 9, 25, 14);
    rect(26, 9, 30, 9, K.PLAZA); rect(49, 9, 54, 9, K.PLAZA); poi('tourism', 26, 9, 40, 1, 'Bay walk');
    rect(44, 10, 48, 13, K.LAWN); poi('park', 44, 10, 5, 4, 'Bay park');
    for (let c = 50; c <= 60; c++) if (get(c, 9) === K.SEA) set(c, 9, K.QUAY);
    for (let r = 4; r <= 8; r++) if (get(53, r) === K.SEA) set(53, r, K.PIER);
    poi('harbour', 47, 3, 14, 6, 'Ferry port');
    /* the Gateway: docks on the east coast, the airport on its island */
    blockOf(47, 40, 63, 56, 'gateway');
    street(46, 40, 46, 57); street(46, 46, 63, 46); street(46, 53, 63, 53); street(56, 40, 56, 57); street(46, 57, 66, 57);
    rect(47, 58, 63, 64, K.QUAY); poi('industry', 47, 58, 17, 7, 'Container yard');
    rect(64, 40, 66, 65, K.QUAY); poi('harbour', 64, 40, 5, 26, 'Sakura port'); poi('industry', 64, 40, 3, 26);
    rect(69, 30, 71, 66, K.APRON); rect(70, 32, 71, 64, K.RUNWAY); roadOver(67, 50, 68, 50, K.ROAD);
    poi('airport', 66, 30, 6, 37, 'Sakura Bay Airport'); poi('industry', 69, 30, 3, 37);
    /* Mount Fuji in the south-west, terraces, bamboo, tea */
    mountain(k, 12, 60, 14, 13, 91, 7);
    rect(46, 66, 66, 71, K.TERRACE); k.each((c, r, kd) => { if (kd === K.TERRACE) k.setH(c, r, Math.floor((r - 65) / 1.5) + Math.floor(fbm(c, r, 93) * 2)); });
    rect(26, 59, 44, 71, K.FOREST);
    hills(k, (c, r) => r >= 58 && c >= 24, 3, 97);
    hills(k, (c, r) => c <= 9 && r <= 45, 3, 99);
    rect(30, 61, 32, 62, K.POND); poi('tourism', 30, 61, 3, 2, 'Hot spring');
    /* landmarks */
    add('jcastle', 13, 29, { w: 4, d: 4 });
    add('torii', 30, 5); add('torii', 12, 7);
    add('pagoda', 39, 50, { w: 1, d: 1 }); add('shrine', 41, 54, { w: 3, d: 3 }); add('school', 27, 50, { w: 2, d: 2 });
    add('redtower', 61, 27, { w: 3, d: 3 }); add('scramble', 56, 22, { w: 4, d: 4 });
    add('station', 50, 35, { w: 6, d: 2 }); add('hospital', 46, 32, { w: 3, d: 2 }); add('library', 26, 27, { w: 3, d: 3 });
    add('arcade', 32, 45, { w: 4, d: 4 });
    add('ferriswheel', 45, 10, { w: 3, d: 3 });
    for (let r = 41; r <= 64; r += 3) { add('crane', 64, r, { face: 'c' }); }
    for (let r = 40; r <= 65; r++) for (let c = 65; c <= 66; c++) if ((c + r) % 3) add('containers', c, r, { v: c * 11 + r });
    for (let r = 58; r <= 64; r++) for (let c = 47; c <= 63; c++) if ((c * 3 + r) % 4) add('containers', c, r, { v: c * 5 + r });
    [[9, 25], [11, 24], [8, 47], [12, 48], [15, 47], [6, 37]].forEach(([c, r]) => add('farmhouse', c, r, { w: 1, d: 1, jp: 1 }));
    add('terminal2', 69, 44, { w: 2, d: 4 }); add('ctower', 69, 51);
    add('onsen', 30, 61, { w: 3, d: 2 });
    for (let r = 10; r <= 46; r += 2) { add('cherry', 21.5, r + 0.5, { v: r }); add('cherry', 24.5, r + 1.5, { v: r + 1 }); }
    [[11, 27], [18, 27], [11, 34], [18, 34], [12, 28], [17, 33]].forEach(([c, r], j) => add('cherry', c + 0.5, r + 0.5, { v: j + 50 }));
    for (let c = 26; c <= 44; c += 2) add('lantern', c + 0.5, 39.4);
    outline(k, (c, r, kd, edge, n) => !(kd === K.SEA && edge < n * 0.8) && c + r < 132 + n * 2 && c + r > 8 + n, 101);
    return finish(k, {
      id: 'sakura', name: 'Sakura City', emoji: '🌸', climate: 'snowy',
      names: { market: 'Shotengai', high: 'Ginza Street', downtown: 'Downtown', skyline: 'Bay Towers', gateway: 'Gateway' },
      emojis: { market: '🏮', high: '🛍️', skyline: '🌉' },
      centers: { market: [35, 48], high: [35, 23], downtown: [55, 25], skyline: [44, 11], gateway: [56, 52] },
      trees: { yard: [['cherry', 0.35], ['maple', 0.35], ['jpine', 0.3]], forest: [['bamboo', 0.4], ['jpine', 0.3], ['maple', 0.3]], park: [['cherry', 0.6], ['maple', 0.4]], street: 'cherry', bush: 'bush',
        wild: { p: 0.16, list: [['jpine', 0.4], ['maple', 0.3], ['cherry', 0.3]] }, rock: { p: 0.05, list: [['jpine', 1]] } },
      promenade: (c) => (c === 21 ? -1 : 1),
      agents: {
        boats: [
          { path: [[10, 4], [40, 3], [64, 5], [40, 3]], sp: 0.35, k: 'ferry' },
          { path: [[28, 2], [34, 6], [40, 2], [34, 6]], sp: 0.25, k: 'fishing' },
          { path: [[68, 20], [68.5, 40], [68, 66], [68.5, 40]], sp: 0.2, k: 'ship' }],
        trains: [{ r: 37.5, from: 74, stop: 52, len: 6, k: 'bullet', loop: -4 }],
        planes: [{ c0: 70.5, r0: 66, c1: 70.5, r1: 26 }]
      },
      parade: [[25, 56], [25, 39], [43, 39]],
      bg: ['#dce8f6', '#f7e4ea']
    });
  }

  const CITIES = [
    { id: 'bay', name: 'Seaside Bay', emoji: '🌊', blurb: 'A river city by the sea: beaches, farms, a forest and snowy mountains.' },
    { id: 'desert', name: 'Desert Oasis', emoji: '🐪', blurb: 'Golden dunes, a palm-shaped island, a creek full of boats and towers in the sun.' },
    { id: 'neon', name: 'Neon City', emoji: '🎆', blurb: 'A desert valley with a strip of giant themed resorts that glows all night.' },
    { id: 'sakura', name: 'Sakura City', emoji: '🌸', blurb: 'Cherry blossoms, a castle on a hill, a bullet train and a great snowy volcano.' }
  ];
  const BUILD = { bay: buildBay, desert: buildDesert, neon: buildNeon, sakura: buildSakura }, made = {};
  root.TYCITY = {
    K: K, KINDS: KINDS, DISTRICTS: DISTRICTS, LOT_W: LOT_W, CITIES: CITIES, N: N, hash: hash, isWater: isWater, isRoad: isRoad, fbm: fbm,
    get(id) { const key = BUILD[id] ? id : 'bay'; if (!made[key]) made[key] = BUILD[key](); return made[key]; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
