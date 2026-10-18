/* city.js — the city of Tycoon Town on one big map: 56 x 56 tiles with four districts (Market Street, High Street,
   Downtown, Skyline & Harbour), two avenues, a river, the sea with a bay, a harbour and an island airport, parks,
   a beach, farmland and a forest. Pure data, built the same way every time, so lot numbers in a save never move.
   The engine reads the lots (where a business can stand) and what is near each lot (a park, the water, a school,
   the station...); the map (map.js) draws everything.
   Grid: c (column) grows to the screen's bottom-right, r (row) to its bottom-left; tile (0, 0) is the top corner. */
(function (root) {
  'use strict';
  const N = 56;
  const KINDS = ['GRASS', 'SEA', 'RIVER', 'POND', 'SAND', 'ROAD', 'AVENUE', 'BRIDGE', 'PLAZA', 'PATH', 'LAWN', 'FOREST', 'FIELD',
    'RAIL', 'RUNWAY', 'APRON', 'QUAY', 'LOT', 'YARD', 'PARKING', 'PITCH', 'COURT', 'PIER', 'SITE', 'CROSSING', 'ORCHARD'];
  const K = {}; KINDS.forEach((k, i) => { K[k] = i; });
  const DISTRICTS = ['market', 'high', 'downtown', 'skyline'];

  function hash(a, b, c) {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul((c | 0) + 17, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  const kind = new Uint8Array(N * N), dist = new Int8Array(N * N).fill(-1), lotAt = new Int16Array(N * N).fill(-1);
  const at = (c, r) => r * N + c, inb = (c, r) => c >= 0 && r >= 0 && c < N && r < N;
  const get = (c, r) => (inb(c, r) ? kind[at(c, r)] : K.SEA);
  const set = (c, r, k) => { if (inb(c, r)) kind[at(c, r)] = k; };
  function rect(c0, r0, c1, r1, k, keep) { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (inb(c, r) && !(keep && keep(kind[at(c, r)]))) kind[at(c, r)] = k; }
  const isWater = (k) => k === K.SEA || k === K.RIVER || k === K.POND;
  const isRoad = (k) => k === K.ROAD || k === K.AVENUE || k === K.BRIDGE || k === K.CROSSING;

  const objs = [];        // fixed things on the map: trees, lamps, landmarks, cranes...
  const pois = [];        // places that change how well a business does nearby
  const add = (k, c, r, o) => { const x = Object.assign({ k: k, c: c, r: r }, o || {}); objs.push(x); return x; };
  const poi = (k, c, r, w, d, name) => pois.push({ k: k, c: c, r: r, w: w || 1, d: d || 1, name: name || '' });

  /* ---------- land and sea ---------- */
  rect(0, 0, N - 1, N - 1, K.GRASS);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (c <= 2 || r <= 2) set(c, r, K.SEA);                       // the coast along both far edges
    if (c <= 12 && r <= 12) set(c, r, K.SEA);                     // the bay
  }
  // the river from the forest to the sea
  rect(25, 0, 26, N - 1, K.RIVER);

  /* ---------- the countryside ---------- */
  rect(3, 51, 24, 55, K.FOREST);                                   // Greenwood, below High Street
  rect(30, 51, 55, 55, K.FIELD);                                   // fields below Market Street
  rect(51, 30, 55, 55, K.FIELD);                                   // and beside it
  rect(30, 52, 37, 55, K.ORCHARD);
  rect(53, 3, 55, 27, K.FOREST);                                   // the hills beside Downtown
  rect(27, 51, 29, 55, K.GRASS);

  /* ---------- avenues and the river banks ---------- */
  rect(24, 3, 24, N - 1, K.PATH); rect(27, 3, 27, N - 1, K.PATH);    // promenades on both banks
  rect(0, 28, N - 1, 29, K.AVENUE, (k) => k === K.SEA);             // the east-west avenue
  rect(28, 3, 29, N - 1, K.AVENUE);                                  // the north-south avenue
  rect(25, 28, 26, 29, K.BRIDGE);
  rect(0, 28, 2, 29, K.SEA);

  /* ---------- a district's streets ---------- */
  const street = (c0, r0, c1, r1) => rect(c0, r0, c1, r1, K.ROAD, (k) => k === K.AVENUE || k === K.BRIDGE || isWater(k));
  function blockOf(c0, r0, c1, r1, d) { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (inb(c, r)) dist[at(c, r)] = DISTRICTS.indexOf(d); }

  /* Market Street: the old town by the fields, with the city park, the market square and a primary school */
  blockOf(30, 30, 50, 50, 'market');
  [35, 41, 46, 50].forEach((c) => street(c, 30, c, 50));
  [35, 41, 46, 50].forEach((r) => street(30, r, 50, r));
  rect(30, 30, 34, 34, K.LAWN); rect(31, 31, 33, 32, K.POND); rect(30, 33, 34, 33, K.PATH); rect(32, 30, 32, 30, K.PATH);
  poi('park', 30, 30, 5, 5, 'City Park');
  rect(36, 36, 40, 40, K.PLAZA); poi('square', 36, 36, 5, 5, 'Market Square'); poi('tourism', 36, 36, 5, 5);
  rect(42, 30, 45, 34, K.SITE); poi('school', 42, 30, 4, 5, 'Primary school');
  rect(47, 36, 49, 40, K.SITE); poi('church', 47, 36, 3, 5, 'St Mary\'s church');

  /* High Street: shops between the beach and the river, the town square, a library and a secondary school */
  blockOf(3, 30, 23, 50, 'high');
  rect(3, 30, 4, 50, K.SAND); poi('beach', 3, 30, 2, 21, 'Sunny Beach'); poi('tourism', 3, 36, 2, 10);
  street(5, 30, 5, 50);
  [11, 17, 23].forEach((c) => street(c, 30, c, 50));
  [35, 41, 46, 50].forEach((r) => street(5, r, 23, r));
  rect(12, 36, 16, 40, K.PLAZA); poi('square', 12, 36, 5, 5, 'Town Square'); poi('tourism', 12, 36, 5, 5);
  rect(18, 30, 22, 34, K.SITE); poi('library', 18, 30, 5, 5, 'Library');
  rect(6, 42, 10, 45, K.LAWN); poi('park', 6, 42, 5, 4, 'Beach Park');
  rect(18, 42, 22, 45, K.SITE); poi('school', 18, 42, 5, 4, 'Secondary school');

  /* Downtown: offices by the sea, the central station, the plaza and museum, the hospital, city hall */
  blockOf(30, 3, 52, 27, 'downtown');
  rect(30, 3, 52, 3, K.PLAZA); poi('tourism', 30, 3, 23, 1, 'Waterfront');
  [35, 41, 47, 52].forEach((c) => street(c, 4, c, 27));
  [9, 15, 21].forEach((r) => street(30, r, 52, r));
  rect(30, 25, 55, 25, K.RAIL, (k) => k === K.AVENUE);
  [35, 41, 47, 52].forEach((c) => set(c, 25, K.CROSSING));
  rect(30, 22, 34, 27, K.SITE); rect(30, 25, 34, 25, K.RAIL); poi('station', 30, 22, 5, 6, 'Central Station');
  rect(42, 10, 46, 14, K.PLAZA); poi('museum', 42, 10, 5, 5, 'City Museum'); poi('tourism', 42, 10, 5, 5);
  rect(36, 4, 40, 8, K.SITE); poi('hospital', 36, 4, 5, 5, 'City Hospital');
  rect(48, 16, 51, 20, K.SITE); poi('hall', 48, 16, 4, 5, 'City Hall');
  rect(38, 0, 38, 2, K.PIER); rect(42, 0, 42, 2, K.PIER); rect(46, 1, 46, 2, K.PIER);
  poi('marina', 37, 0, 10, 3, 'Marina'); poi('tourism', 37, 0, 10, 3);

  /* Skyline & Harbour: towers by the bay, the container port, the island airport, a marina and a lighthouse */
  blockOf(3, 3, 23, 27, 'skyline');
  for (let r = 3; r <= 12; r++) for (let c = 3; c <= 12; c++) dist[at(c, r)] = -1;   // the bay is nobody's
  rect(3, 13, 12, 13, K.PLAZA); poi('tourism', 3, 13, 10, 1, 'Bay promenade');
  rect(13, 3, 16, 12, K.QUAY); rect(13, 0, 13, 2, K.QUAY); poi('harbour', 13, 0, 4, 13, 'Container port'); poi('industry', 13, 3, 4, 10);
  street(17, 3, 17, 27); street(5, 13, 5, 27); street(11, 14, 11, 27); street(23, 3, 23, 27);
  [18, 23].forEach((r) => street(5, r, 23, r)); street(17, 8, 23, 8);
  // the island airport: a runway, an apron, the terminal and a causeway to the shore
  rect(3, 4, 10, 8, K.APRON); rect(3, 4, 10, 5, K.RUNWAY); rect(3, 6, 5, 8, K.SITE);
  rect(5, 9, 5, 12, K.BRIDGE); set(5, 8, K.ROAD);
  poi('airport', 3, 4, 8, 5, 'Island Airport'); poi('industry', 3, 4, 8, 2);
  rect(8, 10, 8, 12, K.PIER); rect(10, 10, 10, 12, K.PIER); poi('marina', 6, 9, 6, 4, 'Bay marina'); poi('tourism', 6, 9, 6, 4);
  rect(18, 19, 22, 22, K.LAWN); poi('park', 18, 19, 5, 4, 'Skyline Gardens');
  rect(3, 14, 4, 27, K.LAWN); poi('park', 3, 14, 2, 14, 'Cliff Park');

  /* ---------- lots: plots facing a street, the rest are gardens ---------- */
  const facesStreet = (c, r) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => { const k = get(c + dc, r + dr); return isRoad(k) || (k === K.PLAZA && dist[at(c, r)] === 3); });
  const lots = { market: [], high: [], downtown: [], skyline: [] };
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const di = dist[at(c, r)];
    if (di < 0 || di === 3 || kind[at(c, r)] !== K.GRASS) continue;
    kind[at(c, r)] = facesStreet(c, r) ? K.LOT : K.YARD;
  }
  // a street corner stays a little garden now and then: the blocks breathe
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (kind[at(c, r)] !== K.LOT) continue;
    const roads = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dc, dr]) => isRoad(get(c + dc, r + dr))).length;
    if ((roads >= 2 && hash(c, r, 1) < 0.45) || hash(c, r, 2) < 0.07) kind[at(c, r)] = K.YARD;
  }
  // Skyline & Harbour: big 2 x 2 plots
  for (let r = 3; r <= 27; r++) for (let c = 3; c <= 23; c++) {
    if (dist[at(c, r)] !== 3) continue;
    const free = (cc, rr) => inb(cc, rr) && dist[at(cc, rr)] === 3 && kind[at(cc, rr)] === K.GRASS && lotAt[at(cc, rr)] < 0;
    if (!(free(c, r) && free(c + 1, r) && free(c, r + 1) && free(c + 1, r + 1))) continue;
    if (![[c, r], [c + 1, r], [c, r + 1], [c + 1, r + 1]].some(([cc, rr]) => facesStreet(cc, rr))) continue;
    const id = lots.skyline.length;
    lots.skyline.push({ c: c, r: r, w: 2 });
    [[c, r], [c + 1, r], [c, r + 1], [c + 1, r + 1]].forEach(([cc, rr]) => { kind[at(cc, rr)] = K.LOT; lotAt[at(cc, rr)] = id; });
  }
  for (let r = 3; r <= 27; r++) for (let c = 3; c <= 23; c++) if (dist[at(c, r)] === 3 && kind[at(c, r)] === K.GRASS) kind[at(c, r)] = K.YARD;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const di = dist[at(c, r)];
    if (di < 0 || di === 3 || kind[at(c, r)] !== K.LOT) continue;
    const d = DISTRICTS[di]; lotAt[at(c, r)] = lots[d].length; lots[d].push({ c: c, r: r, w: 1 });
  }

  /* ---------- landmarks and fixed things ---------- */
  // Market Street
  add('pond-ducks', 31, 31, { w: 3, d: 2 });
  add('playground', 30, 34); add('playground', 34, 30); add('kiosk', 34, 34);
  [[30, 30], [31, 30], [33, 30], [34, 31], [34, 32], [30, 31], [30, 32], [31, 34], [33, 34], [34, 33]].forEach(([c, r], k) => add('tree', c + 0.5, r + 0.5, { v: k }));
  add('fountain', 38, 38);
  [[36, 36], [37, 36], [39, 36], [40, 36], [36, 40], [37, 40], [39, 40], [40, 40], [36, 38], [40, 38]].forEach(([c, r]) => add('stall', c, r, { v: c * 7 + r }));
  add('school', 42, 31, { w: 2, d: 2 }); add('pitch-small', 44, 30, { w: 2, d: 3 }); add('playground', 42, 34); add('tree', 45.5, 34.5, { v: 3 });
  add('church', 47, 37, { w: 2, d: 3 }); add('tree', 49.5, 36.5, { v: 5 }); add('tree', 49.5, 40.5, { v: 6 });
  // High Street
  add('clocktower', 14, 38); add('fountain', 13, 37); add('fountain', 15, 39);
  [[12, 36], [16, 36], [12, 40], [16, 40]].forEach(([c, r], k) => add('tree', c + 0.5, r + 0.5, { v: k + 11 }));
  add('library', 19, 31, { w: 3, d: 3 }); add('tree', 18.5, 30.5, { v: 9 }); add('tree', 22.5, 34.5, { v: 8 });
  add('playground', 7, 43); add('tree', 9.5, 42.5, { v: 2 }); add('palm', 6.5, 44.5); add('palm', 10.5, 45.5);
  add('school', 19, 43, { w: 2, d: 2 }); add('court', 21, 42, { w: 2, d: 2 });
  for (let r = 31; r <= 50; r += 2) { add('umbrella', 3.5, r + 0.3, { v: r }); add('palm', 4.5, r + 1.4); }
  add('beachhut', 3, 34); add('beachhut', 3, 41); add('beachhut', 3, 47);
  // Downtown
  add('hospital', 37, 5, { w: 3, d: 3 }); add('helipad', 36, 8);
  add('museum', 43, 11, { w: 3, d: 3 }); add('fountain', 42, 14); add('tree', 46.5, 14.5, { v: 4 }); add('tree', 42.5, 10.5, { v: 7 });
  add('cityhall', 48, 17, { w: 3, d: 3 }); add('tree', 51.5, 16.5, { v: 1 });
  add('station', 30, 22, { w: 5, d: 3 }); add('platform', 30, 26, { w: 5, d: 1 });
  [38, 42, 46].forEach((c) => { add('yacht', c - 0.6, 1, { v: c }); add('yacht', c + 0.5, 1.4, { v: c + 1 }); });
  // Skyline & Harbour
  add('terminal', 3, 6, { w: 3, d: 2 }); add('ctower', 5, 8); add('hangar', 9, 7, { w: 2, d: 1 });
  for (let r = 4; r <= 11; r += 2) add('crane', 13, r);
  for (let r = 3; r <= 12; r++) for (let c = 14; c <= 16; c++) if ((c + r) % 3 !== 0) add('containers', c, r, { v: c * 13 + r });
  add('lighthouse', 13, 0);
  [7, 9, 11].forEach((c) => { add('yacht', c, 10.6, { v: c }); add('yacht', c, 12.2, { v: c + 3 }); });

  /* ---------- trees, lamps and benches ---------- */
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const k = kind[at(c, r)], h1 = hash(c, r, 7), h2 = hash(c, r, 8), h3 = hash(c, r, 9);
    if (k === K.YARD) {
      const n = h1 < 0.55 ? 2 : h1 < 0.85 ? 1 : 3;
      for (let j = 0; j < n; j++) add('tree', c + 0.2 + 0.6 * hash(c, r, 20 + j), r + 0.2 + 0.6 * hash(c, r, 30 + j), { v: Math.floor(hash(c, r, 40 + j) * 1000), s: 0.75 + 0.35 * hash(c, r, 50 + j) });
      if (h2 < 0.3) add('bush', c + 0.5, r + 0.5, { v: Math.floor(h3 * 100) });
    } else if (k === K.FOREST) {
      const n = 3 + Math.floor(h1 * 2);
      for (let j = 0; j < n; j++) add(hash(c, r, 60 + j) < 0.55 ? 'pine' : 'tree', c + 0.15 + 0.7 * hash(c, r, 20 + j), r + 0.15 + 0.7 * hash(c, r, 30 + j), { v: Math.floor(hash(c, r, 40 + j) * 1000), s: 0.8 + 0.4 * hash(c, r, 50 + j) });
    } else if (k === K.ORCHARD) {
      add('tree', c + 0.3, r + 0.3, { v: 500 + (c % 3), s: 0.7, fruit: 1 }); add('tree', c + 0.75, r + 0.75, { v: 501, s: 0.7, fruit: 1 });
    } else if (k === K.LAWN && dist[at(c, r)] >= 0) {
      if (h1 < 0.35 && !objs.some((o) => Math.floor(o.c) === c && Math.floor(o.r) === r)) add('tree', c + 0.3 + 0.4 * h2, r + 0.3 + 0.4 * h3, { v: Math.floor(h2 * 1000) });
      else if (h1 > 0.92) add('bench', c + 0.5, r + 0.5, { v: Math.floor(h3 * 4) });
    } else if (k === K.PATH) {
      if (r % 2 === 0) add(c === 24 ? 'poplar' : 'tree', c + 0.5 + (c === 24 ? -0.25 : 0.25), r + 0.5, { v: r * 3 + c, s: 0.8 });
      else if (r % 4 === 1) add('lamp', c + 0.5 + (c === 24 ? 0.3 : -0.3), r + 0.5);
    } else if (k === K.GRASS && dist[at(c, r)] < 0) {
      if (h1 < 0.18) add(h2 < 0.35 ? 'pine' : 'tree', c + 0.5, r + 0.5, { v: Math.floor(h3 * 1000), s: 0.9 });
      else if (h1 < 0.24) add('bush', c + 0.5, r + 0.5, { v: Math.floor(h3 * 100) });
    } else if (k === K.FIELD) {
      // field patches: crops run one way or the other, a farm here and there
    }
  }
  // the farm and a windmill
  add('farmhouse', 52, 37, { w: 2, d: 2 }); add('barn', 52, 40, { w: 2, d: 2 }); add('silo', 54, 39); add('windmill', 53, 46); add('windmill', 44, 53);
  rect(52, 37, 53, 41, K.SITE);
  // street lamps along the avenues
  for (let i = 4; i < N; i += 3) { if (get(i, 27) !== K.RIVER && !isWater(get(i, 27))) add('lamp', i + 0.5, 27.85); if (!isWater(get(i, 30))) add('lamp', i + 0.5, 30.15); }
  for (let i = 4; i < N; i += 3) { add('lamp', 27.85, i + 0.5); if (get(30, i) !== K.RAIL) add('lamp', 30.15, i + 0.5); }

  /* ---------- what is near each lot ---------- */
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
  function nearPoi(lot, k) {
    let best = 99;
    pois.filter((p) => p.k === k).forEach((p) => {
      const dc = Math.max(0, p.c - (lot.c + lot.w - 1), lot.c - (p.c + p.w - 1)), dr = Math.max(0, p.r - (lot.r + lot.w - 1), lot.r - (p.r + p.d - 1));
      best = Math.min(best, Math.max(dc, dr));
    });
    return best;
  }
  const fall = (dd, full, half) => (dd <= full ? 1 : dd <= half ? 0.5 : 0);
  const HOMES = { market: 1, high: 0.7, downtown: 0.35, skyline: 0.2 }, OFFICES = { market: 0, high: 0.3, downtown: 1, skyline: 1 };
  const feat = {};
  DISTRICTS.forEach((d) => {
    feat[d] = lots[d].map((lot) => {
      const f = {};
      f.park = Math.max(fall(near(lot, (k) => k === K.LAWN || k === K.FOREST, 4), 2, 4), fall(nearPoi(lot, 'park'), 2, 4));
      f.water = fall(near(lot, (k) => isWater(k), 3), 2, 3);
      f.beach = fall(nearPoi(lot, 'beach'), 2, 5);
      f.school = Math.max(fall(nearPoi(lot, 'school'), 2, 4), fall(nearPoi(lot, 'library'), 1, 3) / 2);
      f.station = fall(nearPoi(lot, 'station'), 3, 6);
      f.hospital = fall(nearPoi(lot, 'hospital'), 2, 4);
      f.church = fall(nearPoi(lot, 'church'), 2, 4);
      f.tourism = fall(nearPoi(lot, 'tourism'), 2, 4);
      f.airport = fall(nearPoi(lot, 'airport'), 6, 9);
      f.harbour = fall(nearPoi(lot, 'harbour'), 2, 3);
      f.industry = fall(nearPoi(lot, 'industry'), 3, 5);
      f.avenue = near(lot, (k) => k === K.AVENUE, 1) <= 1 ? 1 : 0;
      const busy = f.avenue || f.station >= 1 || f.industry >= 1, square = nearPoi(lot, 'square') <= 1 || nearPoi(lot, 'tourism') <= 1;
      f.homes = Math.round(HOMES[d] * (busy ? 0.5 : square ? 0.7 : 1) * 100) / 100;
      f.offices = Math.round(Math.min(1, OFFICES[d] * (busy || square ? 1 : 0.6) + (f.station >= 1 ? 0.3 : 0)) * 100) / 100;
      f.quiet = !f.avenue && !f.industry && f.station < 1 ? 1 : 0;
      return f;
    });
  });

  /* ---------- lots next to each other (for land values) ---------- */
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
    for (let k = 0; k < lot.w; k++) {
      cand.push([lot.c + k, lot.r + lot.w, 'S'], [lot.c + lot.w, lot.r + k, 'E'], [lot.c + k, lot.r - 1, 'N'], [lot.c - 1, lot.r + k, 'W']);
    }
    const hit = cand.find(([c, r]) => isRoad(get(c, r))) || cand.find(([c, r]) => get(c, r) === K.PLAZA);
    lot.face = hit ? hit[2] : 'S';
  }));

  const CENTERS = { market: [40, 40], high: [13, 40], downtown: [41, 15], skyline: [13, 15] };
  root.TYCITY = {
    N: N, K: K, KINDS: KINDS, DISTRICTS: DISTRICTS, kind: kind, dist: dist, lotAt: lotAt, lots: lots, feat: feat, nbrs: nbrs, objs: objs, pois: pois,
    hash: hash, get: get, isWater: isWater, isRoad: isRoad, at: at, inb: inb, centers: CENTERS
  };
})(typeof window !== 'undefined' ? window : globalThis);
