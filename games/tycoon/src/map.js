/* map.js — Tycoon Town's living city: the game's whole city from city.js (window.TYCITY) drawn in 2.5D on one
   canvas with the pictures from art-*.js (window.TYART). The ground (hills, island cliffs, water, roads, fields,
   snow in winter) is painted into cached chunks; trees, buildings and landmarks are sprites painted once per
   zoom level and season; cars, people, customers, boats, trains, planes, camels and balloons move on top;
   money pops up over each business every hour; the light follows the time of day, the trees the season, and
   the day's incidents play out on the map: roadworks, a carnival parade, an earthquake, floods, storms,
   typhoons and sandstorms.
   TYMap.create(canvas, opts) returns the map. The page tells it the game (setGame), the clock (setClock), and
   gets taps back (opts.onTap). Drag to move, pinch or wheel to zoom. */
(function (root) {
  'use strict';
  const A = root.TYART, TC = root.TYCITY; if (!A || !TC) return;
  const { HW, HH, ZH, hash, shade, pick, P, poly, line, circle, ellipse, diamond, box, windows, roundRect } = A;
  const TYMap = root.TYMap = {};
  const DIST_I = { market: 0, high: 1, downtown: 2, skyline: 3, gateway: 4 };
  const CH = 8, SIDE = 46;                       // ground chunks are 8 x 8 tiles; the island's cliff below sea level
  const DECALS = new Set(['pitch-small', 'court', 'helipad', 'platform']);
  let C = null, K = null, N = 72, NCH = 9;       // the city being drawn (one map at a time)

  /* ---------- the city's colours ---------- */
  const PAL = {
    bay: { sand: '#f3e1b5', rock: '#a9a59c', sea: '#86cbe7', deep: ['#79c2e4', '#6db9e0'], road: '#bdb7ab', avenue: '#b4aea3', plaza: '#ecdcbc', path: '#efe2c4', earth: ['#b48a62', '#9a7452'] },
    desert: { sand: '#efd8a6', rock: '#cfa77a', sea: '#62c6d4', deep: ['#52bccd', '#43afc6'], road: '#b9b2a6', avenue: '#aea79b', plaza: '#efe2c8', path: '#f1e3c4', earth: ['#d7b483', '#c39e6c'] },
    neon: { sand: '#e8cc9a', rock: '#c48c62', sea: '#5aa9d6', deep: ['#4c9bcc', '#418fc2'], road: '#a7a197', avenue: '#9c968c', plaza: '#e9dccb', path: '#ecdcc0', earth: ['#c99868', '#b07f52'] },
    sakura: { sand: '#efe0bc', rock: '#9b968d', sea: '#7fbfe0', deep: ['#70b5da', '#62aad4'], road: '#bab6ae', avenue: '#b1aca3', plaza: '#e6e0d4', path: '#ece2cc', earth: ['#a98a66', '#8f7254'] }
  };
  const GRASS = { snowy: { spring: '#b9dd8b', summer: '#b3d985', autumn: '#c9cf86', winter: '#eef3f7' }, dry: { spring: '#c3d98a', summer: '#bdd480', autumn: '#c5d184', winter: '#c9d496' } };
  const SNOW = '#eef3f7';
  const pal = () => PAL[C.theme] || PAL.bay;
  const lookOf = (season, climate) => ({ season: season, snow: season === 'winter' && climate === 'snowy', dry: climate === 'dry' });
  // how high snow lies on the hills: in a snowy city all winter, on the peaks the rest of the year
  const capOf = (look) => (look.snow ? 0 : look.dry ? (look.season === 'winter' ? 6 : 99) : look.season === 'summer' ? 11 : 8);

  /* ---------- the ground ---------- */
  const kAt = (c, r) => (C.inb(c, r) ? C.kind[C.at(c, r)] : K.VOID);
  const hAt = (c, r) => (C.inb(c, r) ? C.height[C.at(c, r)] : 0);
  const zOf = (h) => h * ZH + Math.max(0, h - 5) * Math.max(0, h - 5) * 0.9;   // a step of land in world units
  const zAt = (c, r) => zOf(hAt(c, r));
  const isVoid = (c, r) => kAt(c, r) === K.VOID;
  const roadAt = (c, r) => C.isRoad(kAt(c, r)) || kAt(c, r) === K.CROSSING;
  const waterK = (k) => k === K.SEA || k === K.RIVER || k === K.POND;
  const waterAt = (c, r) => waterK(kAt(c, r)) || kAt(c, r) === K.BRIDGE || kAt(c, r) === K.PIER;
  const SOFT = () => new Set([K.GRASS, K.YARD, K.LOT, K.LAWN, K.FOREST, K.ORCHARD, K.FIELD, K.TERRACE, K.SITE]);
  let soft = null;
  const snowyAt = (k, c, r, look) => (look.snow && soft.has(k)) || (hAt(c, r) >= capOf(look) && (soft.has(k) || k === K.ROCK || k === K.SAND || k === K.DUNE));
  function tileColour(k, c, r, look) {
    const h = hash(c, r, 5), gr = GRASS[look.dry ? 'dry' : 'snowy'][look.season], p = pal(), ht = hAt(c, r);
    if (snowyAt(k, c, r, look)) return shade(SNOW, (h - 0.5) * 0.04 - (k === K.FOREST ? 0.04 : 0));
    switch (k) {
      case K.GRASS: return shade(gr, (h - 0.5) * 0.06 + Math.min(0.08, ht * 0.008));
      case K.YARD: return shade(gr, -0.04 + (h - 0.5) * 0.05);
      case K.LOT: return shade(gr, 0.02);
      case K.LAWN: return shade(gr, 0.05 + (((c + r) % 2) ? 0.02 : 0));
      case K.FOREST: return shade(gr, -0.12 + Math.min(0.06, ht * 0.006));
      case K.ORCHARD: return shade(gr, -0.03);
      case K.TERRACE: return shade(look.season === 'autumn' ? '#b9c26a' : '#8fbf5a', (h - 0.5) * 0.04 + ht * 0.01);
      case K.SAND: return shade(look.snow ? '#efede4' : p.sand, (h - 0.5) * 0.05);
      case K.DUNE: return shade('#e9c68a', (h - 0.5) * 0.04 + ht * 0.012);
      case K.ROCK: return shade(p.rock, (h - 0.5) * 0.06 + Math.min(0.12, ht * 0.012));
      case K.SEA: return p.sea;
      case K.RIVER: return look.snow ? '#9ccbe0' : p.sea;
      case K.POND: return look.snow ? '#dbeef6' : p.sea;
      case K.ROAD: case K.CROSSING: return look.snow ? shade(p.road, 0.06) : p.road;
      case K.AVENUE: return look.snow ? shade(p.avenue, 0.06) : p.avenue;
      case K.BRIDGE: return p.sea;
      case K.PLAZA: return look.snow ? '#f3f1ec' : p.plaza;
      case K.PATH: return look.snow ? '#f4f2ec' : p.path;
      case K.FIELD: return '#d9c48a';
      case K.RAIL: return '#c3b6a2';
      case K.RUNWAY: return '#8f949c';
      case K.APRON: return '#a9adb3';
      case K.QUAY: return '#d4cfc6';
      case K.PIER: return p.sea;
      case K.SITE: return shade(gr, 0.06);
      case K.PARKING: return p.road;
      default: return gr;
    }
  }
  function faceCols(k) {
    const p = pal();
    if (waterK(k) || k === K.PIER || k === K.BRIDGE) return ['#5aa6c9', '#4a92b3', '#3f86a8', '#33769a'];
    if (k === K.ROCK) return [shade(p.rock, -0.06), shade(p.rock, -0.24), shade(p.rock, -0.2), shade(p.rock, -0.34)];
    if (k === K.SAND || k === K.DUNE) return [shade(p.sand, -0.12), shade(p.sand, -0.25), shade(p.earth[0], -0.12), shade(p.earth[1], -0.12)];
    return [p.earth[0], p.earth[1], shade(p.earth[0], -0.16), shade(p.earth[1], -0.16)];
  }
  const grow = (pts) => { const cx = (pts[0][0] + pts[2][0]) / 2, cy = (pts[0][1] + pts[2][1]) / 2; return pts.map(([x, y]) => [cx + (x - cx) * 1.03, cy + (y - cy) * 1.03]); };
  // a tile: its two near sides (a step down to a lower neighbour, or the island's cliff), then its top
  function drawTile(g, c, r, look) {
    const k = kAt(c, r); if (k === K.VOID) return;
    const z = zAt(c, r), snowy = snowyAt(k, c, r, look), fc = snowy && z > 0 ? ['#e3eaf1', '#c9d4de', faceCols(k)[2], faceCols(k)[3]] : faceCols(k), base = tileColour(k, c, r, look);
    const lowL = isVoid(c, r + 1) ? -SIDE : zAt(c, r + 1), lowR = isVoid(c + 1, r) ? -SIDE : zAt(c + 1, r);
    const lip = soft.has(k) || k === K.ROCK || k === K.SAND || k === K.DUNE;
    const faceL = (z0, z1, col) => poly(g, [P(c, r + 1, z0), P(c + 1, r + 1, z0), P(c + 1, r + 1, z1), P(c, r + 1, z1)], col);
    const faceR = (z0, z1, col) => poly(g, [P(c + 1, r + 1, z0), P(c + 1, r, z0), P(c + 1, r, z1), P(c + 1, r + 1, z1)], col);
    if (z > lowL) {
      faceL(z, Math.max(lowL, 0), fc[0]);
      if (k === K.ROCK && !snowy && z - Math.max(lowL, 0) > 14) faceL(z - (z - Math.max(lowL, 0)) * 0.45, z - (z - Math.max(lowL, 0)) * 0.45 - 1.4, shade(fc[0], 0.12));
      if (lowL < 0) { faceL(Math.min(z, 0), lowL, fc[2]); faceL(-SIDE * 0.55, lowL, shade(fc[2], -0.12)); }
      if (lip) faceL(z, z - 2.6, shade(base, -0.1));
      if (waterK(k)) faceL(0, -5, 'rgba(255,255,255,.28)');
    }
    if (z > lowR) {
      faceR(z, Math.max(lowR, 0), fc[1]);
      if (k === K.ROCK && !snowy && z - Math.max(lowR, 0) > 14) faceR(z - (z - Math.max(lowR, 0)) * 0.45, z - (z - Math.max(lowR, 0)) * 0.45 - 1.4, shade(fc[1], 0.1));
      if (lowR < 0) { faceR(Math.min(z, 0), lowR, fc[3]); faceR(-SIDE * 0.55, lowR, shade(fc[3], -0.12)); }
      if (lip) faceR(z, z - 2.6, shade(base, -0.18));
      if (waterK(k)) faceR(0, -5, 'rgba(255,255,255,.18)');
    }
    g.save(); if (z) g.translate(0, -z);
    const T = diamond(c, r, 1, 1, 0);
    poly(g, grow(T), base);
    tileDetail(g, k, c, r, look, base);
    g.restore();
  }
  function tileDetail(g, k, c, r, look, base) {
    const p = pal(), snowGround = snowyAt(k, c, r, look);
    const T = diamond(c, r, 1, 1, 0);
    if (waterK(k) || k === K.BRIDGE || k === K.PIER) {
      let dLand = 9;
      for (let rr = -3; rr <= 3; rr++) for (let cc = -3; cc <= 3; cc++) { const kk = kAt(c + cc, r + rr); if (kk !== K.VOID && !waterK(kk) && kk !== K.BRIDGE && kk !== K.PIER) dLand = Math.min(dLand, Math.max(Math.abs(cc), Math.abs(rr))); }
      const frozen = look.snow && k === K.POND;
      if (k === K.SEA && dLand >= 3) poly(g, grow(T), dLand >= 5 ? p.deep[1] : p.deep[0]);
      if (dLand === 1 && !frozen) poly(g, grow(T), shade(p.sea, 0.14));
      [[0, -1, P(c, r), P(c + 1, r)], [1, 0, P(c + 1, r), P(c + 1, r + 1)], [0, 1, P(c + 1, r + 1), P(c, r + 1)], [-1, 0, P(c, r + 1), P(c, r)]].forEach(([dc, dr, a, b]) => {
        const kk = kAt(c + dc, r + dr); if (kk !== K.VOID && !waterK(kk) && kk !== K.BRIDGE && kk !== K.PIER) line(g, [a, b], frozen ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.75)', 1.6);
      });
      if (frozen) { if (hash(c, r, 11) < 0.5) { const q = P(c + 0.2 + hash(c, r, 12) * 0.5, r + 0.3); line(g, [q, [q[0] + 8, q[1] + 3], [q[0] + 12, q[1] + 1]], 'rgba(150,190,210,.7)', 0.7); } }
      else if (hash(c, r, 11) < 0.35) { const q = P(c + 0.3 + hash(c, r, 12) * 0.4, r + 0.3 + hash(c, r, 13) * 0.4); line(g, [[q[0] - 4, q[1]], [q[0] + 4, q[1]]], 'rgba(255,255,255,.5)', 1); }
      if (k === K.POND && !frozen && hash(c, r, 14) < 0.5) { const q = P(c + 0.5, r + 0.5); ellipse(g, q[0], q[1], 4, 2, '#6cb85a'); }
    }
    if (k === K.BRIDGE) {
      const alongC = roadAt(c - 1, r) || roadAt(c + 1, r);
      const deck = alongC ? [P(c, r + 0.08), P(c + 1, r + 0.08), P(c + 1, r + 0.92), P(c, r + 0.92)] : [P(c + 0.08, r), P(c + 0.92, r), P(c + 0.92, r + 1), P(c + 0.08, r + 1)];
      poly(g, deck.map(([x, y]) => [x + 4, y + 4]), 'rgba(30,60,90,.18)');
      poly(g, deck, '#c4bdb1');
      if (alongC) { line(g, [P(c, r + 0.08), P(c + 1, r + 0.08)], '#f6f2ea', 2); line(g, [P(c, r + 0.92), P(c + 1, r + 0.92)], '#f6f2ea', 2); }
      else { line(g, [P(c + 0.08, r), P(c + 0.08, r + 1)], '#f6f2ea', 2); line(g, [P(c + 0.92, r), P(c + 0.92, r + 1)], '#f6f2ea', 2); }
    }
    if (k === K.PIER) {
      poly(g, [P(c + 0.3, r), P(c + 0.7, r), P(c + 0.7, r + 1), P(c + 0.3, r + 1)].map(([x, y]) => [x + 3, y + 3]), 'rgba(30,60,90,.15)');
      poly(g, [P(c + 0.3, r), P(c + 0.7, r), P(c + 0.7, r + 1), P(c + 0.3, r + 1)], '#c9a273');
      for (let i = 1; i < 5; i++) line(g, [P(c + 0.3, r + i / 5), P(c + 0.7, r + i / 5)], '#ad8458', 0.6);
    }
    if (k === K.ROAD || k === K.AVENUE || k === K.CROSSING) {
      const sides = [[0, -1, 'N'], [1, 0, 'E'], [0, 1, 'S'], [-1, 0, 'W']], open = {};
      sides.forEach(([dc, dr, s]) => { open[s] = roadAt(c + dc, r + dr) || kAt(c + dc, r + dr) === K.BRIDGE; });
      const pw = 0.17, pave = look.snow ? '#f4f6f8' : C.theme === 'neon' ? '#d9d2c4' : '#ece5d6';
      const strip = { N: [P(c, r), P(c + 1, r), P(c + 1, r + pw), P(c, r + pw)], E: [P(c + 1, r), P(c + 1, r + 1), P(c + 1 - pw, r + 1), P(c + 1 - pw, r)], S: [P(c, r + 1), P(c + 1, r + 1), P(c + 1, r + 1 - pw), P(c, r + 1 - pw)], W: [P(c, r), P(c, r + 1), P(c + pw, r + 1), P(c + pw, r)] };
      const edge = { N: [P(c, r + pw), P(c + 1, r + pw)], E: [P(c + 1 - pw, r), P(c + 1 - pw, r + 1)], S: [P(c, r + 1 - pw), P(c + 1, r + 1 - pw)], W: [P(c + pw, r), P(c + pw, r + 1)] };
      ['N', 'E', 'S', 'W'].forEach((s) => { if (!open[s] && !(k === K.AVENUE && kAt(c + ({ E: 1, W: -1 }[s] || 0), r + ({ S: 1, N: -1 }[s] || 0)) === K.AVENUE)) { poly(g, strip[s], pave); line(g, edge[s], look.snow ? '#ffffff' : '#d4cab6', 1); } });
      const alongC = open.E && open.W && !open.N && !open.S, alongR = open.N && open.S && !open.E && !open.W, mark = C.theme === 'neon' ? '#f3e3a0' : '#f7f3e9';
      if (k === K.AVENUE) {
        const hor = kAt(c - 1, r) === K.AVENUE || kAt(c + 1, r) === K.AVENUE, ver = kAt(c, r - 1) === K.AVENUE || kAt(c, r + 1) === K.AVENUE;
        if (hor && !ver) { if (kAt(c, r + 1) === K.AVENUE) line(g, [P(c, r + 1), P(c + 1, r + 1)], '#f3e3a0', 1.6); for (let i = 0; i < 2; i++) line(g, [P(c + 0.1 + i * 0.5, r + 0.5), P(c + 0.35 + i * 0.5, r + 0.5)], '#f7f3e9', 1.1); }
        if (ver && !hor) { if (kAt(c + 1, r) === K.AVENUE) line(g, [P(c + 1, r), P(c + 1, r + 1)], '#f3e3a0', 1.6); for (let i = 0; i < 2; i++) line(g, [P(c + 0.5, r + 0.1 + i * 0.5), P(c + 0.5, r + 0.35 + i * 0.5)], '#f7f3e9', 1.1); }
      } else if (alongC) { line(g, [P(c + 0.15, r + 0.5), P(c + 0.42, r + 0.5)], mark, 1); line(g, [P(c + 0.62, r + 0.5), P(c + 0.88, r + 0.5)], mark, 1); }
      else if (alongR) { line(g, [P(c + 0.5, r + 0.15), P(c + 0.5, r + 0.42)], mark, 1); line(g, [P(c + 0.5, r + 0.62), P(c + 0.5, r + 0.88)], mark, 1); }
      const junction = (cc, rr) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dc, dr]) => roadAt(cc + dc, rr + dr)).length >= 3;
      if (k === K.ROAD && !junction(c, r)) {
        if (alongC && junction(c + 1, r)) for (let i = 0; i < 4; i++) line(g, [P(c + 0.82, r + 0.22 + i * 0.18), P(c + 0.96, r + 0.22 + i * 0.18)], '#f7f3e9', 1.6);
        if (alongC && junction(c - 1, r)) for (let i = 0; i < 4; i++) line(g, [P(c + 0.04, r + 0.22 + i * 0.18), P(c + 0.18, r + 0.22 + i * 0.18)], '#f7f3e9', 1.6);
        if (alongR && junction(c, r + 1)) for (let i = 0; i < 4; i++) line(g, [P(c + 0.22 + i * 0.18, r + 0.82), P(c + 0.22 + i * 0.18, r + 0.96)], '#f7f3e9', 1.6);
        if (alongR && junction(c, r - 1)) for (let i = 0; i < 4; i++) line(g, [P(c + 0.22 + i * 0.18, r + 0.04), P(c + 0.22 + i * 0.18, r + 0.18)], '#f7f3e9', 1.6);
      }
      if (k === K.CROSSING) { line(g, [P(c, r + 0.4), P(c + 1, r + 0.4)], '#7b818b', 1.4); line(g, [P(c, r + 0.6), P(c + 1, r + 0.6)], '#7b818b', 1.4); }
      if (look.snow && hash(c, r, 18) < 0.3) { const q = P(c + 0.2 + hash(c, r, 19) * 0.6, r + 0.2); ellipse(g, q[0], q[1], 4, 1.4, 'rgba(255,255,255,.55)'); }
    } else if (k === K.RAIL) {
      for (let i = 0; i < 6; i++) line(g, [P(c + 0.08 + i * 0.16, r + 0.28), P(c + 0.08 + i * 0.16, r + 0.72)], '#8a6e55', 1.6);
      line(g, [P(c, r + 0.4), P(c + 1, r + 0.4)], '#7b818b', 1.3); line(g, [P(c, r + 0.6), P(c + 1, r + 0.6)], '#7b818b', 1.3);
    } else if (k === K.RUNWAY) {
      const alongC = kAt(c - 1, r) === K.RUNWAY || kAt(c + 1, r) === K.RUNWAY;
      if (alongC) { if (kAt(c, r - 1) !== K.RUNWAY) line(g, [P(c, r + 0.08), P(c + 1, r + 0.08)], '#f7f7f2', 1.2); if (kAt(c, r + 1) !== K.RUNWAY) line(g, [P(c, r + 0.92), P(c + 1, r + 0.92)], '#f7f7f2', 1.2); else line(g, [P(c + 0.25, r + 1), P(c + 0.7, r + 1)], '#f7f7f2', 1.6); }
      else { if (kAt(c - 1, r) !== K.RUNWAY) line(g, [P(c + 0.08, r), P(c + 0.08, r + 1)], '#f7f7f2', 1.2); if (kAt(c + 1, r) !== K.RUNWAY) line(g, [P(c + 0.92, r), P(c + 0.92, r + 1)], '#f7f7f2', 1.2); else line(g, [P(c + 1, r + 0.25), P(c + 1, r + 0.7)], '#f7f7f2', 1.6); }
      if (look.snow) poly(g, [P(c, r), P(c + 1, r), P(c + 1, r + 0.12), P(c, r + 0.12)], 'rgba(255,255,255,.6)');
    } else if (k === K.APRON) {
      if ((c + r) % 3 === 0) line(g, [P(c, r + 0.5), P(c + 1, r + 0.5)], '#f2c14e', 0.9);
    } else if (k === K.QUAY) {
      line(g, [P(c, r), P(c + 1, r)], 'rgba(0,0,0,.06)', 0.8);
      if (waterAt(c - 1, r)) line(g, [P(c + 0.06, r), P(c + 0.06, r + 1)], '#f2c14e', 1.2);
      if (waterAt(c, r - 1)) line(g, [P(c, r + 0.06), P(c + 1, r + 0.06)], '#f2c14e', 1.2);
    } else if (k === K.PLAZA) {
      line(g, [P(c, r + 0.5), P(c + 1, r + 0.5)], look.snow ? '#e6e8ea' : shade(p.plaza, -0.06), 0.7); line(g, [P(c + 0.5, r), P(c + 0.5, r + 1)], look.snow ? '#e6e8ea' : shade(p.plaza, -0.06), 0.7);
    } else if (k === K.PATH) {
      if (hash(c, r, 15) < 0.4) { const q = P(c + 0.5, r + 0.5); ellipse(g, q[0], q[1], 2, 1, shade(p.path, -0.06)); }
    } else if (k === K.FIELD) {
      // fields in patches; they follow the year: shoots in spring, gold in summer, stubble in autumn, snow in winter
      const pc = Math.floor(c / 4), pr = Math.floor(r / 3), ph = hash(pc, pr, 21), along = hash(pc, pr, 22) < 0.5;
      const SEASONAL = { spring: [['#a9d36f', '#8fbf58'], ['#bcd97a', '#a3c662'], ['#c7b2e6', '#a990d6'], ['#9fcf6a', '#86ba55']], summer: [['#ecd27c', '#dcbc58'], ['#a9d36f', '#8fbf58'], ['#c7b2e6', '#a990d6'], ['#e7d98c', '#cfc06a']],
        autumn: [['#d9b26a', '#c49a50'], ['#cfa676', '#b98f5e'], ['#e0b45a', '#c99a42'], ['#b9a070', '#a08858']], winter: [['#d7cdb4', '#c8bd9f'], ['#cfc4a8', '#bfb392']] };
      if (snowGround) { poly(g, grow(T), SNOW); for (let i = 1; i < 5; i++) line(g, along ? [P(c, r + i / 5), P(c + 1, r + i / 5)] : [P(c + i / 5, r), P(c + i / 5, r + 1)], '#dfe7ee', 1.2); return; }
      const set = SEASONAL[look.season], t = set[Math.floor(ph * set.length)];
      poly(g, grow(T), t[0]);
      for (let i = 1; i < 5; i++) line(g, along ? [P(c, r + i / 5), P(c + 1, r + i / 5)] : [P(c + i / 5, r), P(c + i / 5, r + 1)], t[1], 1.6);
      if (c % 4 === 0) line(g, [P(c, r), P(c, r + 1)], '#b9a36b', 0.8);
    } else if (k === K.TERRACE) {
      for (let i = 1; i < 4; i++) line(g, [P(c, r + i / 4), P(c + 1, r + i / 4)], snowGround ? '#dfe7ee' : '#6fa448', 2);
    } else if (k === K.DUNE) {
      if (!snowGround) for (let i = 0; i < 3; i++) { const q = P(c + 0.15, r + 0.2 + i * 0.3); g.beginPath(); g.moveTo(q[0], q[1]); g.quadraticCurveTo(q[0] + 10, q[1] - 3, q[0] + 22, q[1] + 2); g.strokeStyle = 'rgba(190,140,70,.35)'; g.lineWidth = 0.9; g.stroke(); }
    } else if (k === K.ROCK) {
      if (hash(c, r, 23) < 0.5) { const q = P(c + 0.3 + hash(c, r, 24) * 0.4, r + 0.4); line(g, [q, [q[0] + 5, q[1] - 2], [q[0] + 9, q[1] + 1]], snowGround ? '#d9e2ea' : shade(p.rock, -0.2), 0.8); }
      if (!snowGround && hash(c, r, 25) < 0.25) { const q = P(c + 0.6, r + 0.6); ellipse(g, q[0], q[1], 3, 1.6, shade(p.rock, -0.12)); }
    } else if (soft.has(k) && k !== K.FOREST) {
      if (snowGround) { if (hash(c, r, 16) < 0.2) { const q = P(c + 0.3 + hash(c, r, 30) * 0.4, r + 0.5); ellipse(g, q[0], q[1], 5, 1.6, '#dfe7ee'); } return; }
      if (hash(c, r, 16) < 0.25) for (let i = 0; i < 3; i++) { const q = P(c + 0.2 + hash(c, r, 30 + i) * 0.6, r + 0.2 + hash(c, r, 40 + i) * 0.6); line(g, [[q[0], q[1]], [q[0] - 1, q[1] - 2.5]], shade(base, -0.12), 0.8); line(g, [[q[0], q[1]], [q[0] + 1, q[1] - 2.5]], shade(base, -0.12), 0.8); }
      if (look.season !== 'winter' && k !== K.LOT && hash(c, r, 17) < (look.season === 'spring' ? 0.2 : 0.1)) for (let i = 0; i < 4; i++) { const q = P(c + 0.15 + hash(c, r, 50 + i) * 0.7, r + 0.15 + hash(c, r, 60 + i) * 0.7); circle(g, q[0], q[1], 1, pick(['#ffffff', '#f6d34a', '#f48fb1', '#b9a2f2'], c + r + i)); }
      if (look.season === 'autumn' && hash(c, r, 26) < 0.22) for (let i = 0; i < 4; i++) { const q = P(c + 0.15 + hash(c, r, 70 + i) * 0.7, r + 0.15 + hash(c, r, 80 + i) * 0.7); circle(g, q[0], q[1], 1.1, pick(['#e8902f', '#d9583a', '#f2c14e'], c + i)); }
      if (k === K.LAWN && ((c + r) % 2 === 0)) poly(g, [P(c, r), P(c + 1, r), P(c + 1, r + 0.5), P(c, r + 0.5)], 'rgba(255,255,255,.06)');
    } else if (k === K.SAND) {
      for (let i = 0; i < 5; i++) { const q = P(c + hash(c, r, 70 + i), r + hash(c, r, 80 + i)); circle(g, q[0], q[1], 0.7, shade(p.sand, -0.1)); }
      if (waterAt(c - 1, r) || waterAt(c, r - 1)) line(g, waterAt(c - 1, r) ? [P(c + 0.08, r), P(c + 0.08, r + 1)] : [P(c, r + 0.08), P(c + 1, r + 0.08)], 'rgba(255,255,255,.5)', 2);
    }
    if (C.dist[C.at(c, r)] >= 0 && k === K.SITE && !snowGround) poly(g, diamond(c + 0.1, r + 0.1, 0.8, 0.8, 0), 'rgba(236,228,211,.6)');
  }
  // flat decals on the ground: pitches, courts, the helipad, platforms
  function drawDecals(g, c0, r0, look) {
    C.objs.forEach((o) => {
      if (!DECALS.has(o.k) || o.c < c0 - 3 || o.c >= c0 + CH || o.r < r0 - 3 || o.r >= r0 + CH) return;
      const w = o.w || 1, d = o.d || 1;
      if (o.k === 'pitch-small') {
        poly(g, diamond(o.c, o.r, w, d, 0), look.snow ? '#f2f6f8' : '#6fbf57');
        if (!look.snow) for (let i = 0; i < d * 2; i++) if (i % 2) poly(g, diamond(o.c, o.r + i / 2, w, 0.5, 0), '#7ac862');
        line(g, [P(o.c + 0.1, o.r + 0.1), P(o.c + w - 0.1, o.r + 0.1), P(o.c + w - 0.1, o.r + d - 0.1), P(o.c + 0.1, o.r + d - 0.1), P(o.c + 0.1, o.r + 0.1)], look.snow ? '#c9d6e0' : '#ffffff', 1.1);
        line(g, [P(o.c + 0.1, o.r + d / 2), P(o.c + w - 0.1, o.r + d / 2)], look.snow ? '#c9d6e0' : '#ffffff', 1.1);
      } else if (o.k === 'court') {
        poly(g, diamond(o.c + 0.1, o.r + 0.1, w - 0.2, d - 0.2, 0), '#5aa6a0');
        poly(g, diamond(o.c + 0.25, o.r + 0.25, w - 0.5, d - 0.5, 0), '#6fb9b2');
        line(g, [P(o.c + 0.25, o.r + d / 2), P(o.c + w - 0.25, o.r + d / 2)], '#ffffff', 1.4);
      } else if (o.k === 'helipad') {
        const q = P(o.c + 0.5, o.r + 0.5); ellipse(g, q[0], q[1], 18, 9, '#7d838c'); g.fillStyle = '#ffffff'; g.font = '700 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', q[0], q[1] + 0.5);
      } else if (o.k === 'platform') {
        poly(g, diamond(o.c, o.r + 0.15, w, 0.7, 2), '#ddd6c8');
      }
    });
  }

  /* ---------- sprites: painted once per look and zoom, then copied ---------- */
  const DPR = () => Math.min(2, root.devicePixelRatio || 1);
  // zoom settles on these steps, and sprites and ground are painted for them, so a still map copies them 1:1
  const BUCKETS = [0.22, 0.3, 0.42, 0.6, 0.8, 1, 1.2, 1.41], ZMIN = 0.22, ZMAX = 1.41;
  const bucketOf = (z) => BUCKETS.find((b) => b >= z * 0.98) || BUCKETS[BUCKETS.length - 1];
  const snapZ = (z) => BUCKETS.reduce((a, b) => (Math.abs(b - z) < Math.abs(a - z) ? b : a), 1);
  function makeCanvas(w, h) { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h)); return cv; }
  const PX_BUDGET = 30e6;   // about 120 MB of sprite pixels at most (a tablet's memory is precious)
  function Sprites() {
    const cache = new Map();
    let used = 0, px = 0;
    return {
      get(key, bucket, bx, draw) {   // bx = [x0, y0, x1, y1] in world units around the anchor
        const k = key + '@' + bucket;
        let s = cache.get(k);
        if (s) { s.t = used++; return s; }
        const sc = bucket * DPR(), cv = makeCanvas((bx[2] - bx[0]) * sc, (bx[3] - bx[1]) * sc), g = cv.getContext('2d');
        g.scale(sc, sc); g.translate(-bx[0], -bx[1]); g.lineJoin = 'round'; g.lineCap = 'round';
        draw(g);
        s = { cv: cv, x0: bx[0], y0: bx[1], w: bx[2] - bx[0], h: bx[3] - bx[1], t: used++, px: cv.width * cv.height };
        cache.set(k, s); px += s.px;
        if (cache.size > 1800 || px > PX_BUDGET) {
          const old = [...cache.entries()].sort((a, b) => a[1].t - b[1].t);
          for (const [kk, v] of old) { if (cache.size <= 1400 && px <= PX_BUDGET * 0.75) break; cache.delete(kk); px -= v.px; }
        }
        return s;
      },
      clear() { cache.clear(); px = 0; },
      size() { return { n: cache.size, px: px }; }
    };
  }

  /* ---------- the map ---------- */
  TYMap.create = function (canvas, opts) {
    opts = opts || {};
    const ctx = canvas.getContext('2d');
    const sprites = Sprites();
    const chunks = new Map();     // key "cx,cy@bucket@season" -> { cv, x0, y0 }
    const CHUNK_BUDGET = 24e6;    // about 96 MB of ground pictures at most
    let chunkPx = 0, ov = null, lotSig = 0;
    const glows = {};             // a soft glow per neon colour, painted once
    const cam = { x: 0, y: 0, z: 1, tx: null, ty: null, tz: null, vx: 0, vy: 0 };
    let W = 0, H = 0, game = null, look = lookOf('spring', 'snowy'), lookKey = 'spring', clock = { h: 3, night: 0 }, sel = null, pickMode = null, running = false, lastT = 0;
    let statics = [], lotObjs = [], locks = [], cityId = null, distPaths = [], floodPath = null, works = new Set(), worksKey = '', blocked = new Set();
    const agents = { cars: [], peds: [], cust: [] }, pops = [], marks = new Map(), stats = { ms: 0, frames: 0 }, badgeHits = [];
    const fx = { shake: 0, dust: [], seen: new Set(), cracks: [], confetti: [], flash: 0, flashT: 0 };
    const weather = { flakes: [], drops: [], dust: [], petals: [] };
    const T0 = performance.now();
    const TY = () => root.TY;

    /* camera */
    const toScreen = (wx, wy) => [(wx - cam.x) * cam.z + W / 2, (wy - cam.y) * cam.z + H / 2];
    const toWorld = (sx, sy) => [(sx - W / 2) / cam.z + cam.x, (sy - H / 2) / cam.z + cam.y];
    const tileCentre = (c, r) => [(c - r) * HW, (c + r + 1) * HH];
    function clampCam() {
      const mx = N * HW, my0 = -60, my1 = 2 * N * HH;
      cam.x = Math.max(-mx, Math.min(mx, cam.x)); cam.y = Math.max(my0, Math.min(my1, cam.y));
      cam.z = Math.max(ZMIN, Math.min(ZMAX, cam.z));
    }
    function focusTile(c, r, z, now) {
      const [x, y] = tileCentre(c, r);
      if (now) { cam.x = x; cam.y = y - 20; if (z) cam.z = snapZ(z); clampCam(); return; }
      cam.tx = x; cam.ty = y - 20; cam.tz = snapZ(z || cam.z);
    }

    /* a city to draw */
    function useCity(id) {
      if (cityId === id && C) return;
      cityId = id; C = TC.get(id); K = C.K; N = C.N; NCH = Math.ceil(N / CH); soft = SOFT();
      chunks.clear(); chunkPx = 0; ov = null; sprites.clear(); fx.seen.clear(); fx.cracks = []; fx.dust = [];
      // each district's ground as one path (the veil over a locked district), and the low ground a flood covers
      distPaths = C.DISTRICTS.map(() => new Path2D());
      floodPath = new Path2D();
      const addTile = (p, c, r) => { const T = diamond(c, r, 1, 1, 0); p.moveTo(T[0][0], T[0][1]); T.slice(1).forEach((q) => p.lineTo(q[0], q[1])); p.closePath(); };
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const di = C.dist[C.at(c, r)]; if (di >= 0) addTile(distPaths[di], c, r);
        const k = kAt(c, r);
        if (k === K.VOID || waterK(k) || hAt(c, r) > 0 || k === K.RUNWAY) continue;
        let near = false;
        for (let rr = -2; rr <= 2 && !near; rr++) for (let cc = -2; cc <= 2; cc++) { const kk = kAt(c + cc, r + rr); if (kk === K.RIVER || kk === K.POND || (kk === K.SEA && Math.abs(cc) + Math.abs(rr) <= 2)) { near = true; break; } }
        if (near) addTile(floodPath, c, r);
      }
      buildStatics(); buildRoads(); spawnAgents();
    }
    function buildStatics() {
      statics = C.objs.filter((o) => !DECALS.has(o.k)).map((o) => {
        const w = o.w || 1, d = o.d || 1, point = A.POINT_KINDS.has(o.k);
        const fc = Math.max(0, Math.min(N - 1, Math.floor(o.c))), fr = Math.max(0, Math.min(N - 1, Math.floor(o.r))), z = zAt(fc, fr);
        const ax = point ? (o.c - o.r) * HW : (Math.floor(o.c) - Math.floor(o.r)) * HW, ay = (point ? (o.c + o.r) * HH : (Math.floor(o.c) + Math.floor(o.r)) * HH) - z;
        return { o: o, ax: ax, ay: ay, z: z, depth: point ? o.c + o.r : Math.floor(o.c) + w - 1 + Math.floor(o.r) + d - 1 + 0.9, point: point, w: w, d: d,
          top: point ? 60 : A.landTop(o.k), movers: point ? null : A.landMovers(o) };
      });
    }
    function rebuildLots() {
      lotObjs = [];
      if (!game) return;
      C.DISTRICTS.forEach((d) => {
        const open = TY().unlocked(game, d);
        C.lots[d].forEach((lot, i) => {
          const st = TY().lotState(game, d, i), w = lot.w;
          lotObjs.push({ d: d, i: i, lot: lot, st: st, open: open, ax: (lot.c - lot.r) * HW, ay: (lot.c + lot.r) * HH, depth: lot.c + lot.r + 2 * (w - 1) + 0.95, w: w,
            movers: st.k === 'biz' ? A.bizMovers(st.b.id) : st.k === 'rival' ? A.bizMovers(st.rival.bid) : null });
        });
      });
      locks = C.DISTRICTS.filter((d) => !TY().unlocked(game, d));
      let hsh = 5381; const add = (t) => { for (let k = 0; k < t.length; k++) hsh = ((hsh * 33) ^ t.charCodeAt(k)) >>> 0; };
      lotObjs.forEach((o) => { const st = o.st; add(st.k[0] + (st.k === 'biz' ? st.b.id : st.k === 'rival' ? st.rival.bid : st.look ? st.look + '.' + (st.left || 0) : '') + ','); });
      add(locks.join(',') + (game.logoColour || ''));
      lotSig = hsh;
    }
    const faceOf = (lot) => lot.face || 'S';
    const sideOf = (lot) => (faceOf(lot) === 'S' || faceOf(lot) === 'W' ? 'S' : 'E');
    const snowKey = () => (look.snow ? ':s' : '');
    // sprites paint with the city's theme and today's snow
    const paint = (fn) => (g) => { A.flags.snow = look.snow; A.flags.theme = C.theme; fn(g); A.flags.snow = false; };
    function lotSprite(o, bucket) {
      const st = o.st, w = o.w, lot = o.lot, side = sideOf(lot);
      const boxH = (h) => [-w * HW - 14, -h, w * HW + (h > 100 ? 58 : 30), 2 * w * HH + 10];
      if (st.k === 'biz' || st.k === 'rival') {
        const id = st.k === 'biz' ? st.b.id : st.rival.bid, accent = (A.BIZ_STYLE[id] || [])[1] || '#f2c14e', tall = buildingTop(o) + 40;
        return st.k === 'biz' ? sprites.get('biz:' + id + ':' + side + ':' + w + snowKey(), bucket, boxH(tall), paint((g) => A.bizBuilding(g, id, w, side, accent, false)))
          : sprites.get('riv:' + id + ':' + side + ':' + w + snowKey(), bucket, boxH(tall), paint((g) => A.bizBuilding(g, id, w, side, shade(accent, -0.35), true)));
      }
      if (st.k === 'npc') {
        const ind = o.d === 'skyline' && (C.feat.skyline[o.i] || {}).industry >= 1, look2 = 1 + (st.look % 48);
        return sprites.get('npc:' + C.theme + ':' + o.d + ':' + look2 + ':' + (ind ? 'X' : side) + snowKey(), bucket, boxH(ind ? 40 : A.npcTop(o.d, look2)), paint((g) => A.npcBuilding(g, o.d, look2, w, ind ? 'X' : side, C.theme)));
      }
      if (st.k === 'build') return sprites.get('site:' + w + ':' + (st.left > 1 ? 2 : 1), bucket, boxH(w > 2 ? 190 : w > 1 ? 150 : 72), paint((g) => A.siteBuilding(g, w, st.left)));
      if (st.k === 'land') return sprites.get('land:' + (game.logoColour || '#f2c14e') + ':' + w + snowKey(), bucket, boxH(40), paint((g) => A.saleSign(g, true, game.logoColour, w)));
      if (st.k === 'free' && o.open) return sprites.get('sale:' + w + snowKey(), bucket, boxH(40), paint((g) => A.saleSign(g, false, null, w)));
      return null;
    }
    function staticSprite(s, bucket) {
      const o = s.o, k = o.k;
      if (s.point) {
        const v = o.v || 0, sc = o.s || 1, ever = A.EVERGREEN.has(k) && k !== 'pine';
        const key = k + ':' + (k === 'tree' ? (v % 37) + ':' + (o.fruit ? 1 : 0) : k === 'bush' || k === 'shrub' ? v % 9 : v % 7) + ':' + sc.toFixed(1) + ':' + (ever ? '' : lookKey);
        return sprites.get(key, bucket, A.pointBox(k, sc), paint((g) => A.drawPoint(g, k, k === 'tree' ? v % 37 : v, sc, look, o.fruit)));
      }
      const w = s.w, d = s.d, top = s.top + 40;
      const bx = k === 'pivot' ? [-100, -30, 160, 110] : [-d * HW - 30, -top, w * HW + 90, (w + d) * HH + 50];
      return sprites.get('lm:' + C.theme + ':' + k + ':' + (o.v || 0) + ':' + w + 'x' + d + ':' + (o.face || '') + (o.jp ? 'j' : '') + snowKey(), bucket, bx, paint((g) => A.landmark(g, o)));
    }

    /* the ground */
    function chunk(cx, cy, bucket) {
      const key = cx + ',' + cy + '@' + bucket + '@' + lookKey;
      let ch = chunks.get(key);
      if (ch) { ch.t = performance.now(); return ch; }
      const c0 = cx * CH, r0 = cy * CH;
      let maxZ = 0, edge = false, any = false;
      for (let r = r0; r < Math.min(N, r0 + CH); r++) for (let c = c0; c < Math.min(N, c0 + CH); c++) {
        if (isVoid(c, r)) continue;
        any = true; maxZ = Math.max(maxZ, zAt(c, r));
        if (isVoid(c, r + 1) || isVoid(c + 1, r)) edge = true;
      }
      if (!any) { ch = { cv: null, t: performance.now() }; chunks.set(key, ch); return ch; }
      const x0 = (c0 - r0 - CH) * HW - 4, y0 = (c0 + r0) * HH - 6 - maxZ, w = 2 * CH * HW + 8, h = 2 * CH * HH + 10 + maxZ + (edge ? SIDE + 4 : 0);
      const sc = bucket * DPR(), cv = makeCanvas(w * sc, h * sc), g = cv.getContext('2d');
      g.scale(sc, sc); g.translate(-x0, -y0); g.lineCap = 'round';
      for (let r = r0; r < Math.min(N, r0 + CH); r++) for (let c = c0; c < Math.min(N, c0 + CH); c++) drawTile(g, c, r, look);
      g.save(); g.beginPath();
      for (let r = r0; r < Math.min(N, r0 + CH); r++) for (let c = c0; c < Math.min(N, c0 + CH); c++) { if (hAt(c, r) || isVoid(c, r)) continue; const T = diamond(c, r, 1, 1, 0); g.moveTo(T[0][0], T[0][1]); T.slice(1).forEach((q) => g.lineTo(q[0], q[1])); g.closePath(); }
      g.clip(); drawDecals(g, c0, r0, look); g.restore();
      ch = { cv: cv, x0: x0, y0: y0, w: w, h: h, t: performance.now() };
      chunks.set(key, ch);
      chunkPx += cv.width * cv.height;
      if (chunks.size > 160 || chunkPx > CHUNK_BUDGET) {
        const old = [...chunks.entries()].sort((a, b) => a[1].t - b[1].t);
        for (const [k2, v] of old) { if (chunks.size <= 120 && chunkPx <= CHUNK_BUDGET * 0.75) break; if (v === ch) continue; chunks.delete(k2); if (v.cv) chunkPx -= v.cv.width * v.cv.height; }
      }
      return ch;
    }

    function overview(bucket) {
      const key = bucket + '|' + lookKey + '|' + cityId + '|' + lotSig;
      if (ov && ov.key === key) return ov;
      const x0 = -N * HW - 120, x1 = N * HW + 120, y0 = -340, y1 = 2 * N * HH + SIDE + 40, sc = bucket * DPR();
      const cv = ov && ov.key.split('|')[0] === String(bucket) ? ov.cv : makeCanvas((x1 - x0) * sc, (y1 - y0) * sc), g = cv.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(sc, 0, 0, sc, -x0 * sc, -y0 * sc);
      for (let cy = 0; cy < NCH; cy++) for (let cx = 0; cx < NCH; cx++) { const ch = chunk(cx, cy, bucket); if (ch.cv) g.drawImage(ch.cv, ch.x0, ch.y0, ch.w, ch.h); }
      locks.forEach((d) => { g.fillStyle = 'rgba(255,255,255,.16)'; g.fill(distPaths[DIST_I[d]]); });
      const items = statics.filter((st) => !(st.point && (['bench', 'lamp', 'bush', 'shrub', 'lantern'].includes(st.o.k) || hash(Math.floor(st.o.c * 3), Math.floor(st.o.r * 3), 97) < 0.5))).concat(lotObjs);
      items.sort((a, b) => a.depth - b.depth);
      items.forEach((it) => { const sp = it.o ? staticSprite(it, bucket) : lotSprite(it, bucket); if (sp) g.drawImage(sp.cv, it.ax + sp.x0, it.ay + sp.y0, sp.w, sp.h); });
      ov = { key: key, cv: cv, x0: x0, y0: y0, w: x1 - x0, h: y1 - y0 };
      return ov;
    }

    /* traffic and people */
    const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const tkey = (c, r) => c + r * 128;
    const drivable = (c, r) => { const k = kAt(c, r); return (k === K.ROAD || k === K.AVENUE || k === K.BRIDGE || k === K.CROSSING) && !blocked.has(tkey(c, r)); };
    let roadTiles = [];
    function buildRoads() { roadTiles = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const k = kAt(c, r); if (k === K.ROAD || k === K.AVENUE || k === K.BRIDGE || k === K.CROSSING) roadTiles.push([c, r]); } }
    let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const CAR_COLS = ['#e05a5a', '#5aa6dd', '#f2c14e', '#f5f5f5', '#6cc08f', '#f08a3c', '#8a6fd0', '#3d4a5c', '#4fb3b0'];
    const SHIRTS = ['#e05a5a', '#5aa6dd', '#f2c14e', '#6cc08f', '#f08aa8', '#8a6fd0', '#ffffff', '#3d4a5c', '#f08a3c'], SKINS = ['#f3d2b6', '#e0b08c', '#c68b62', '#8d5a3b', '#f6dcc4'];
    function nextDir(c, r, dir) {
      const o = []; for (let d = 0; d < 4; d++) { if (d === (dir + 2) % 4) continue; if (drivable(c + DIRS[d][0], r + DIRS[d][1])) o.push(d); }
      if (!o.length) return (dir + 2) % 4;
      if (o.includes(dir) && rnd() < 0.62) return dir;
      return o[Math.floor(rnd() * o.length)];
    }
    function spawnAgents() {
      agents.cars = []; agents.peds = []; agents.cust = [];
      if (!roadTiles.length) return;
      const nCars = Math.min(110, Math.round(roadTiles.length / 14)), nPeds = Math.min(220, Math.round(roadTiles.length / 7));
      for (let i = 0; i < nCars; i++) {
        const [c, r] = roadTiles[Math.floor(rnd() * roadTiles.length)], dir = nextDir(c, r, Math.floor(rnd() * 4));
        const bus = i % 9 === 0, truck = i % 13 === 5, taxi = C.theme === 'neon' && i % 5 === 2;
        agents.cars.push({ c: c, r: r, dir: dir, t: rnd(), sp: bus ? 0.55 : 0.85 + rnd() * 0.35, col: bus ? '#f2c14e' : truck ? '#f4f4f4' : taxi ? '#f6d02f' : CAR_COLS[i % CAR_COLS.length], type: bus ? 'bus' : truck ? 'truck' : 'car' });
      }
      for (let i = 0; i < nPeds; i++) {
        const [c, r] = roadTiles[Math.floor(rnd() * roadTiles.length)];
        agents.peds.push({ c: c, r: r, dir: Math.floor(rnd() * 4), t: rnd(), sp: 0.22 + rnd() * 0.12, side: rnd() < 0.5 ? 1 : -1, shirt: pick(SHIRTS, i), skin: pick(SKINS, i * 7), ph: rnd() * 6 });
      }
    }
    function stepCars(dt) {
      for (const a of agents.cars) {
        a.t += dt * a.sp;
        if (a.t >= 1) {
          a.t -= 1; a.c += DIRS[a.dir][0]; a.r += DIRS[a.dir][1];
          if (!drivable(a.c, a.r) && !blocked.has(tkey(a.c, a.r))) { a.c -= DIRS[a.dir][0]; a.r -= DIRS[a.dir][1]; a.dir = (a.dir + 2) % 4; }
          a.dir2 = a.dir; a.dir = nextDir(a.c, a.r, a.dir);
        }
      }
    }
    function stepPeds(dt) {
      for (const p of agents.peds) {
        p.t += dt * p.sp; p.ph += dt * 9;
        if (p.t >= 1) { p.t -= 1; p.c += DIRS[p.dir][0]; p.r += DIRS[p.dir][1]; if (!roadAt(p.c, p.r) && kAt(p.c, p.r) !== K.BRIDGE) { p.c -= DIRS[p.dir][0]; p.r -= DIRS[p.dir][1]; p.dir = (p.dir + 2) % 4; } p.dir = nextDirPed(p.c, p.r, p.dir); }
      }
    }
    function nextDirPed(c, r, dir) {
      const o = []; for (let d = 0; d < 4; d++) { if (d === (dir + 2) % 4) continue; const k = kAt(c + DIRS[d][0], r + DIRS[d][1]); if (roadAt(c + DIRS[d][0], r + DIRS[d][1]) || k === K.BRIDGE) o.push(d); }
      if (!o.length) return (dir + 2) % 4;
      if (o.includes(dir) && rnd() < 0.62) return dir;
      return o[Math.floor(rnd() * o.length)];
    }
    // customers walk from the pavement into one of the company's businesses, and out again (fewer when roadworks
    // block the street, none while it is closed, crowds on carnival day)
    function stepCustomers(dt) {
      if (!game || clock.night > 0.5) { agents.cust.length = 0; return; }
      const busy = TY().DAYW[Math.max(0, Math.min(13, Math.floor(clock.h)))] * 14;
      lotObjs.forEach((o) => {
        if (o.st.k !== 'biz' && o.st.k !== 'rival') return;
        const k = o.st.k === 'biz' ? TY().todayOf(game, o.st.b).k : 1;
        const rate = (o.st.k === 'rival' ? 0.15 : 0.32) * busy * (o.w > 2 ? 3 : o.w > 1 ? 2.2 : 1) * k;
        if (rnd() < rate * dt && agents.cust.length < 160) {
          const f = faceOf(o.lot), w = o.w, door = f === 'S' || f === 'W' ? [o.lot.c + w / 2, o.lot.r + w + 0.05] : [o.lot.c + w + 0.05, o.lot.r + w / 2];
          const out = f === 'S' || f === 'W' ? [door[0] + (rnd() - 0.5) * 1.6, door[1] + 0.45] : [door[0] + 0.45, door[1] + (rnd() - 0.5) * 1.6];
          const inbound = rnd() < 0.55;
          agents.cust.push({ a: inbound ? out : door, b: inbound ? door : out, t: 0, sp: 0.5 + rnd() * 0.3, shirt: pick(SHIRTS, Math.floor(rnd() * 99)), skin: pick(SKINS, Math.floor(rnd() * 9)), ph: 0 });
        }
      });
      for (let i = agents.cust.length - 1; i >= 0; i--) { const p = agents.cust[i]; p.t += dt * p.sp; p.ph += dt * 9; if (p.t >= 1) agents.cust.splice(i, 1); }
    }
    function carPos(a) {
      const d0 = a.dir2 === undefined ? a.dir : a.dir2, [dc, dr] = DIRS[a.dir];
      const lane = 0.2, rc = -dr * lane, rr = dc * lane;   // drive on the right
      return { c: a.c + 0.5 + dc * a.t + rc, r: a.r + 0.5 + dr * a.t + rr, dir: a.dir, d0: d0 };
    }
    function pedPos(p) { const [dc, dr] = DIRS[p.dir], off = 0.4 * p.side; return { c: p.c + 0.5 + dc * p.t - dr * off, r: p.r + 0.5 + dr * p.t + dc * off }; }
    function drawCar(g, a) {
      const q = carPos(a), x = (q.c - q.r) * HW, y = (q.c + q.r) * HH, along = q.dir % 2 === 0;
      const L = a.type === 'bus' ? 0.62 : a.type === 'truck' ? 0.46 : 0.34, Wd = a.type === 'bus' ? 0.2 : 0.18, h = a.type === 'bus' ? 9 : a.type === 'truck' ? 8 : 5;
      g.save(); g.translate(x, y);
      const c0 = along ? -L / 2 : -Wd / 2, r0 = along ? -Wd / 2 : -L / 2, w = along ? L : Wd, d = along ? Wd : L;
      poly(g, diamond(c0 + 0.03, r0 + 0.03, w, d, 0), 'rgba(0,0,0,.18)');
      box(g, c0, r0, w, d, 1.5, h, shade(a.col, 0.18), a.col, shade(a.col, -0.22));
      if (a.type === 'car') box(g, c0 + w * 0.22, r0 + d * 0.15, w * 0.56, d * 0.7, 1.5 + h, 3.6, look.snow ? '#ffffff' : '#e8f2f8', '#9fc7e0', '#86afc8');
      else if (a.type === 'bus') windows(g, c0, r0, w, d, 1.5, h, 1, along ? 6 : 1, along ? 1 : 6, '#cfe6f4', '#b8d4e6', 0.6, 0.55);
      else box(g, c0 + (along ? (q.dir === 0 ? w * 0.72 : 0) : 0), r0 + (!along ? (q.dir === 1 ? d * 0.72 : 0) : 0), along ? w * 0.28 : w, along ? d : d * 0.28, 1.5, h, '#f2c14e', '#e0b03c', '#c89c30');
      if (clock.night > 0.3) { const fr = P(q.dir === 0 ? c0 + w : q.dir === 2 ? c0 : 0, q.dir === 1 ? r0 + d : q.dir === 3 ? r0 : 0, 3); circle(g, fr[0], fr[1], 2.2, 'rgba(255,240,180,.9)'); }
      g.restore();
    }
    function drawPerson(g, c, r, shirt, skin, ph, z, hop) {
      const x = (c - r) * HW, y = (c + r) * HH - (z || 0) - (hop || 0), bob = Math.abs(Math.sin(ph)) * 0.8;
      ellipse(g, x + 1, y + (hop || 0), 2.6, 1.2, 'rgba(0,0,0,.16)');
      line(g, [[x - 0.8, y - 3], [x - 0.8 + Math.sin(ph) * 0.8, y]], '#4b4f5a', 1); line(g, [[x + 0.8, y - 3], [x + 0.8 - Math.sin(ph) * 0.8, y]], '#4b4f5a', 1);
      g.fillStyle = shirt; g.fillRect(x - 1.7, y - 7.4 - bob, 3.4, 4.6);
      circle(g, x, y - 9 - bob, 1.6, skin);
    }

    /* the city's own movers: boats, trains, the monorail, planes, camels, balloons and helicopters */
    const pathAt = (path, tt) => { const seg = path.length - 1, i = Math.floor(tt) % seg, f = tt - Math.floor(tt), a = path[i], b = path[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, b[0] - a[0], b[1] - a[1]]; };
    function drawBoats(g, sec) {
      const storm = weatherNow().wind > 0.6;
      (C.agents.boats || []).forEach((b, n) => {
        if (storm && b.k !== 'ship') return;   // small boats stay in the harbour in a typhoon
        const seg = b.path.length - 1, len = b.path.reduce((t, p, i) => (i ? t + Math.hypot(p[0] - b.path[i - 1][0], p[1] - b.path[i - 1][1]) : 0), 0) || 1;
        const tt = ((sec * b.sp * 0.6 / len) * seg + n * 0.37) % seg, [bc, br, dc, dr] = pathAt(b.path, tt), x = (bc - br) * HW, y = (bc + br) * HH, dx = (dc - dr) >= 0 ? 1 : -1;
        ellipse(g, x, y + 3, b.k === 'ship' ? 34 : 16, b.k === 'ship' ? 8 : 4, 'rgba(255,255,255,.35)');
        g.save(); g.translate(x, y); g.scale(dx, 1);
        if (b.k === 'ferry') { poly(g, [[-18, -3], [18, -3], [14, 4], [-15, 4]], '#ffffff'); poly(g, [[-15, 4], [14, 4], [13, 5], [-14, 5]], '#e05a5a'); box(g, -0.2, -0.1, 0.35, 0.2, 3, 6, '#f6f8fa', '#e6eaee', '#cfd6dd'); }
        else if (b.k === 'ship') { poly(g, [[-36, -2], [34, -2], [28, 6], [-32, 6]], '#3d4a5c'); for (let k = 0; k < 6; k++) A.containerBox(g, -0.5 + k * 0.17, -0.12, 0, 1, k); box(g, 0.45, -0.1, 0.1, 0.2, 0, 14, '#ffffff', '#eef1f4', '#d9dfe6'); }
        else if (b.k === 'dhowboat') { g.beginPath(); g.moveTo(-15, -5); g.quadraticCurveTo(-3, 5, 14, -2); g.lineTo(17, -8); g.lineTo(-18, -8); g.closePath(); g.fillStyle = '#9b6b42'; g.fill(); line(g, [[-1, -8], [0, -28]], '#6b4a30', 1.1); poly(g, [[0, -28], [13, -11], [-7, -10]], '#f5efe2'); }
        else if (b.k === 'fishing') { poly(g, [[-10, -2], [10, -2], [7, 3], [-8, 3]], '#3f7fd0'); box(g, -0.05, -0.08, 0.18, 0.16, 1, 6, '#ffffff', '#eef1f4', '#d9dfe6'); line(g, [[-6, -2], [-10, -16]], '#8a8f9a', 0.8); }
        else { poly(g, [[-9, -1], [9, -1], [6, 3], [-7, 3]], '#ffffff'); line(g, [[0, -1], [0, -20]], '#8a8f9a', 0.8); poly(g, [[1, -19], [1, -2], [10, -3]], '#fdfdfd'); poly(g, [[-1, -17], [-1, -3], [-8, -4]], pick(A.AWN, n + 3)); }
        g.restore();
      });
    }
    // trains run on their line: in to the station, a wait, and out again (or on through, for the bullet train)
    function trainCars(sec) {
      const out = [];
      (C.agents.trains || []).forEach((t, n) => {
        const travel = 12, wait = 9, gone = 8, cyc = travel * 2 + wait + gone, ph = (sec + n * 11) % cyc, ease = (k) => 1 - Math.pow(1 - k, 2), easeIn = (k) => k * k;
        let head;
        if (ph < travel) head = t.from + (t.stop - t.from) * ease(ph / travel);
        else if (ph < travel + wait) head = t.stop;
        else if (ph < 2 * travel + wait) { const k = (ph - travel - wait) / travel; head = t.stop + ((t.loop !== undefined ? t.loop : t.from) - t.stop) * easeIn(k); }
        else return;
        const back = Math.sign(t.from - t.stop) || 1;
        for (let k = 0; k < t.len; k++) { const c = head + back * k * 0.95; if (c < -1 || c > N + 1) continue; out.push({ c: c, r: t.r, k: t.k, lead: k === 0, back: back, depth: c + t.r + 0.3 }); }
      });
      const m = C.agents.monorail;
      if (m) {
        const along = m.c !== undefined, a0 = along ? m.r0 : m.c0, a1 = along ? m.r1 : m.c1, cyc = 34, ph = sec % cyc, k = ph < 15 ? ph / 15 : ph < 17 ? 1 : ph < 32 ? 1 - (ph - 17) / 15 : 0;
        const pos = a0 + (a1 - a0) * (0.5 - 0.5 * Math.cos(k * Math.PI));
        for (let j = 0; j < 3; j++) { const s = pos - j * 0.9 * Math.sign(a1 - a0); out.push({ c: along ? m.c : s, r: along ? s : m.r, k: 'mono', along: along, lead: j === 0, depth: (along ? m.c + s : s + m.r) + 0.3, z: 18 }); }
      }
      return out;
    }
    function drawTrainCar(g, t) {
      g.save(); const z = t.z || 0; g.translate((t.c - t.r) * HW, (t.c + t.r) * HH);
      if (t.k === 'mono') {
        if (t.along) { box(g, -0.12, -0.42, 0.24, 0.84, z, 8, '#f6f8fa', '#e6eaee', '#cfd6dd'); windows(g, -0.12, -0.42, 0.24, 0.84, z, 8, 1, 1, 4, '#4f7fa8', '#3f6f98', 0.6, 0.5); line(g, [P(-0.12, 0.42, z + 2), P(0.12, 0.42, z + 2)], '#e05a5a', 1.4); }
        else { box(g, -0.42, -0.12, 0.84, 0.24, z, 8, '#f6f8fa', '#e6eaee', '#cfd6dd'); windows(g, -0.42, -0.12, 0.84, 0.24, z, 8, 1, 4, 1, '#4f7fa8', '#3f6f98', 0.6, 0.5); }
        g.restore(); return;
      }
      const bullet = t.k === 'bullet';
      const f = -t.back, nose = () => { const e = 0.44 * f, tip = 0.86 * f; poly(g, [P(e, -0.14, 2), P(tip, 0, 3), P(e, 0.14, 2)], '#d9dfe6'); poly(g, [P(e, 0.14, 2), P(tip, 0, 3), P(e, 0, 12)], '#f3f5f7'); poly(g, [P(e, -0.14, 2), P(tip, 0, 3), P(e, 0, 12)], '#e6eaee'); poly(g, [P(e, -0.14, 12), P(e, 0.14, 12), P(tip, 0, 3)], '#fbfcfd'); };
      if (bullet && t.lead && f < 0) nose();
      box(g, -0.44, -0.14, 0.88, 0.28, 2, 10, bullet ? '#fbfcfd' : t.lead ? '#e05a5a' : '#f4f4f4', bullet ? '#f3f5f7' : t.lead ? '#cc4848' : '#e3e6ea', bullet ? '#d9dfe6' : t.lead ? '#b33d3d' : '#c9cfd6');
      windows(g, -0.44, -0.14, 0.88, 0.28, 2, 10, 1, 5, 1, bullet ? '#4f6f8f' : '#9fc7e0', bullet ? '#3f5f7f' : '#86afc8', 0.6, 0.5);
      if (bullet) { line(g, [P(-0.44, 0.14, 5), P(0.44, 0.14, 5)], '#3f7fd0', 1.6); if (t.lead && f > 0) nose(); }
      g.restore();
    }
    function drawRails(g) {   // the monorail's beam on its pillars
      const m = C.agents.monorail; if (!m) return;
      const along = m.c !== undefined, a0 = Math.min(along ? m.r0 : m.c0, along ? m.r1 : m.c1), a1 = Math.max(along ? m.r0 : m.c0, along ? m.r1 : m.c1);
      const at = (s, z) => (along ? P(m.c, s, z) : P(s, m.r, z));
      for (let s = Math.ceil(a0); s <= a1; s += 3) { const p = at(s, 0), q = at(s, 17); line(g, [p, q], '#b9b4ab', 2.4); }
      line(g, [at(a0, 17), at(a1, 17)], '#d9d4cb', 3.4); line(g, [at(a0, 15.5), at(a1, 15.5)], '#a9a49a', 1);
    }
    function drawPlanes(g, sec) {
      (C.agents.planes || []).forEach((p, n) => {
        const cyc = 28, ph = (sec + n * 13) % cyc; if (ph > 15) return;
        const t = ph / 15, c = p.c0 + (p.c1 - p.c0) * t, r = p.r0 + (p.r1 - p.r0) * t, z = Math.max(0, (t - 0.45) * 280), dc = p.c1 - p.c0, dr = p.r1 - p.r0;
        const base = P(c, r, 0), q = P(c, r, z), k = 0.55 + Math.min(0.5, z / 300), flip = (dc - dr) < 0 ? -1 : 1;
        ellipse(g, base[0], base[1] + 2, 11, 2.8, 'rgba(0,0,0,' + Math.max(0, 0.18 - z / 900) + ')');
        g.save(); g.translate(q[0], q[1]); g.scale(flip, 1); A.drawPlane(g, 0, 0, k, n % 2 ? '#e05a5a' : '#5aa6dd'); g.restore();
      });
      // balloons drift over the desert, helicopters circle the Strip
      for (let i = 0; i < (C.agents.balloons || 0); i++) {
        const c = 50 + 12 * Math.sin(sec * 0.03 + i * 2.1) + i * 4, r = 26 + 14 * Math.cos(sec * 0.025 + i * 1.7) + i * 8, z = 150 + i * 30 + Math.sin(sec * 0.5 + i) * 6, q = P(c, r, z), col = pick(['#e05a5a', '#f2c14e', '#5aa6dd', '#6cc08f'], i);
        ellipse(g, ...P(c, r, 0), 8, 3, 'rgba(0,0,0,.08)');
        const gr = g.createRadialGradient(q[0] - 4, q[1] - 6, 2, q[0], q[1], 16); gr.addColorStop(0, shade(col, 0.4)); gr.addColorStop(1, col);
        ellipse(g, q[0], q[1], 13, 16, gr); ellipse(g, q[0], q[1], 5, 16, 'rgba(255,255,255,.55)'); line(g, [[q[0] - 9, q[1] + 10], [q[0] - 3, q[1] + 20]], '#6b4a30', 0.6); line(g, [[q[0] + 9, q[1] + 10], [q[0] + 3, q[1] + 20]], '#6b4a30', 0.6);
        g.fillStyle = '#8a5a3a'; g.fillRect(q[0] - 3.5, q[1] + 20, 7, 5);
      }
      for (let i = 0; i < (C.agents.helicopters || 0); i++) {
        const a = sec * 0.25 + i * Math.PI, c = 35 + Math.cos(a) * 9, r = 33 + Math.sin(a) * 15, z = 150 + i * 20, q = P(c, r, z);
        ellipse(g, ...P(c, r, 0), 6, 2.5, 'rgba(0,0,0,.08)');
        ellipse(g, q[0], q[1], 7, 4, i ? '#f2c14e' : '#e05a5a'); line(g, [[q[0] + 5, q[1]], [q[0] + 16, q[1] - 2]], i ? '#e0b03c' : '#cc4848', 1.6);
        const sp = sec * 30; line(g, [[q[0] + Math.cos(sp) * 13, q[1] - 5 + Math.sin(sp) * 2], [q[0] - Math.cos(sp) * 13, q[1] - 5 - Math.sin(sp) * 2]], 'rgba(60,60,60,.7)', 1);
      }
    }
    function camels(sec) {
      const out = [];
      (C.agents.camels || []).forEach((path) => {
        const len = path.reduce((t, p, i) => (i ? t + Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]) : 0), 0), seg = path.length - 1;
        for (let k = 0; k < 5; k++) {
          const d = ((sec * 0.35 - k * 1.1) % len + len) % len;
          let acc = 0, i = 0; while (i < seg - 1 && acc + Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]) < d) { acc += Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); i++; }
          const a = path[i], b = path[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, f = Math.min(1, (d - acc) / l), c = a[0] + (b[0] - a[0]) * f, r = a[1] + (b[1] - a[1]) * f;
          out.push({ c: c, r: r, dir: (b[0] - a[0]) - (b[1] - a[1]) >= 0 ? 1 : -1, ph: sec * 5 + k, depth: c + r, z: zAt(Math.floor(c), Math.floor(r)) });
        }
      });
      return out;
    }

    /* the day's incidents */
    const liveIncidents = () => (game && game.live && game.live.inc) || [];
    const activeOf = (id) => liveIncidents().find((x) => x.id === id && x.on && clock.h < x.end + 0.05) || null;
    function weatherNow() {
      const L = liveIncidents(), on = (id) => L.find((x) => x.id === id && x.on && clock.h < x.end);
      const ty = on('typhoon'), st = on('storm'), fl = on('flood'), sa = on('sandstorm');
      return { rain: ty ? 1 : st ? 0.75 : fl ? 0.55 : 0, wind: ty ? 1 : st ? 0.5 : sa ? 0.8 : 0, sand: sa ? 1 : 0, dark: ty ? 0.32 : st ? 0.22 : fl ? 0.14 : sa ? 0.1 : 0, flood: fl, storm: st || ty };
    }
    // roadworks and a parade close streets to cars
    function syncBlocked() {
      const wk = game ? JSON.stringify(game.works || []) + '|' + (activeOf('carnival') ? 'p' : '') : '';
      if (wk === worksKey) return;
      worksKey = wk; works = new Set(); blocked = new Set();
      ((game && game.works) || []).forEach((w) => w.tiles.forEach(([c, r]) => { works.add(tkey(c, r)); blocked.add(tkey(c, r)); }));
      if (activeOf('carnival')) C.parade.forEach(([c, r]) => blocked.add(tkey(c, r)));
    }
    // notice an incident starting: the earthquake shakes the map, dust rises, cracks open
    function syncIncidents() {
      if (!game || !game.live) return;
      liveIncidents().forEach((x, i) => {
        const id = game.month + ':' + i;
        if (!x.on || fx.seen.has(id)) return;
        fx.seen.add(id);
        if (x.id === 'quake' && clock.h < x.h + 1.5) {
          fx.shake = 2.6;
          fx.cracks = [];
          for (let r = Math.floor(x.r - x.rad * 0.55); r <= x.r + x.rad * 0.55; r++) for (let c = Math.floor(x.c - x.rad * 0.55); c <= x.c + x.rad * 0.55; c++) {
            if (!C.inb(c, r) || !roadAt(c, r) || hash(c, r, 91) > 0.5 - Math.hypot(c - x.c, r - x.r) / x.rad) continue;
            const pts = [], n = 4; for (let j = 0; j <= n; j++) pts.push([c + 0.15 + 0.7 * j / n, r + 0.2 + 0.6 * hash(c, r, 92 + j)]);
            fx.cracks.push(pts);
          }
          lotObjs.forEach((o) => {
            const dd = Math.hypot(o.lot.c + o.w / 2 - x.c, o.lot.r + o.w / 2 - x.r);
            if (dd < x.rad * 0.8 && (o.st.k !== 'free' && o.st.k !== 'land') && hash(o.lot.c, o.lot.r, 93) < 1 - dd / x.rad) fx.dust.push({ c: o.lot.c + o.w / 2, r: o.lot.r + o.w / 2, t0: performance.now() + hash(o.lot.c, o.lot.r, 94) * 900, big: o.w });
          });
          if (fx.dust.length > 90) fx.dust.length = 90;
        }
      });
    }
    // the parade: floats, dancers and drummers walking the route, crowds along it
    function parade(sec) {
      const x = activeOf('carnival'); if (!x || !C.parade.length) return [];
      const R = C.parade, n = R.length, out = [], k0 = (sec * 0.9) % 4.5;
      const posAt = (s) => { s = Math.max(0, Math.min(n - 1.001, s)); const i = Math.floor(s), f = s - i, a = R[i], b = R[Math.min(n - 1, i + 1)]; return [a[0] + 0.5 + (b[0] - a[0]) * f, a[1] + 0.5 + (b[1] - a[1]) * f, b[0] - a[0], b[1] - a[1]]; };
      for (let s = k0, j = 0; s < n - 1; s += 4.5, j++) {
        const [c, r, dc, dr] = posAt(s); out.push({ float: true, c: c, r: r, dc: dc, dr: dr, v: j, depth: c + r + 0.2 });
        for (let m = 0; m < 3; m++) { const [cc, rr, ddc, ddr] = posAt(s - 1.3 - m * 0.5); const off = (m - 1) * 0.28; out.push({ dancer: true, c: cc - ddr * off, r: rr + ddc * off, v: j * 3 + m, depth: cc + rr }); }
      }
      R.forEach(([c, r], i) => {
        if (i % 2) return;
        const a = R[Math.max(0, i - 1)], b = R[Math.min(n - 1, i + 1)], dc = Math.sign(b[0] - a[0]), dr = Math.sign(b[1] - a[1]);
        [-1, 1].forEach((side) => { const off = 0.44 * side; out.push({ fan: true, c: c + 0.5 - dr * off, r: r + 0.5 + dc * off, v: i * 2 + (side > 0 ? 1 : 0), depth: c + r + 0.5 }); });
      });
      return out;
    }
    const THEME_FLOAT = { bay: ['#f25a7a', '#f2c14e', '#5aa6dd', '#6cc08f'], desert: ['#e0b84a', '#3fa0b8', '#c0503e', '#f5efe2'], neon: ['#ff4fa3', '#41e0ff', '#ffd23f', '#b46bff'], sakura: ['#d9433a', '#e0b84a', '#2b2b2b', '#ffffff'] };
    function drawFloat(g, f, sec) {
      const x = (f.c - f.r) * HW, y = (f.c + f.r) * HH, cols = THEME_FLOAT[C.theme] || THEME_FLOAT.bay, a = cols[f.v % 4], b = cols[(f.v + 1) % 4], bob = Math.sin(sec * 3 + f.v) * 1.2;
      g.save(); g.translate(x, y); g.scale(1.45, 1.45);
      ellipse(g, 2, 2, 22, 7, 'rgba(0,0,0,.18)');
      if (C.theme === 'sakura' && f.v % 2 === 0) {   // a portable shrine carried on poles
        line(g, [[-20, -6], [20, 6]], '#6b4a30', 2); line(g, [[-20, 2], [20, 14]], '#6b4a30', 2);
        for (let i = 0; i < 6; i++) drawPerson(g, -0.3 + (i % 3) * 0.3, -0.25 + Math.floor(i / 3) * 0.5, i % 2 ? '#ffffff' : '#2f4f8a', '#f3d2b6', sec * 9 + i, 0, Math.abs(Math.sin(sec * 6 + i)) * 1.5);
        box(g, -0.22, -0.22, 0.44, 0.44, 12 + bob, 12, '#e0b84a', '#c9a227', '#a8861f'); A.curvedRoof(g, -0.3, -0.3, 0.6, 0.6, 24 + bob, 9, '#2b2b2b');
        circle(g, ...P(0, 0, 36 + bob), 2.4, '#e0b84a');
      } else if (C.theme === 'sakura') {   // a dragon on sticks
        for (let i = 0; i < 7; i++) { const ph = sec * 4 - i * 0.7, px = -24 + i * 8, py = -16 + Math.sin(ph) * 5 + i * 3; line(g, [[px, py + 6], [px, py + 16]], '#6b4a30', 0.8); circle(g, px, py, i === 0 ? 6 : 5, i % 2 ? '#e0453a' : '#e0b84a'); }
        circle(g, -26, -18 + Math.sin(sec * 4) * 5, 2, '#ffffff');
      } else if (C.theme === 'desert' && f.v % 3 === 1) {   // decorated camels
        A.drawCamel(g, -8, 0, 1, 1.1, sec * 5); A.drawCamel(g, 10, 4, 1, 1.1, sec * 5 + 1);
        line(g, [[-14, -16], [16, -12]], a, 1.4); for (let i = 0; i < 6; i++) circle(g, -12 + i * 5, -15 + i * 0.6, 1.4, pick(cols, i));
      } else {   // a float on wheels with a big figure, flags and balloons
        box(g, -0.32, -0.2, 0.64, 0.4, 2, 8, shade(a, 0.2), a, shade(a, -0.2));
        line(g, [P(-0.32, 0.2, 6), P(0.32, 0.2, 6)], '#ffffff', 1.4);
        const top = P(0, 0, 10 + bob);
        if (C.theme === 'neon') { for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(top[0], top[1] - 4, 10 + i * 4, Math.PI, 0); g.strokeStyle = pick(cols, f.v + i); g.lineWidth = 1.8; g.stroke(); } circle(g, top[0], top[1] - 10, 4, '#fff3c4'); }
        else { for (let i = 0; i < 9; i++) { const an = Math.PI + (i / 8) * Math.PI; line(g, [[top[0], top[1] - 4], [top[0] + Math.cos(an) * 16, top[1] - 4 + Math.sin(an) * 16]], pick(cols, i + f.v), 2.4); } circle(g, top[0], top[1] - 6, 5, b); }
        for (let i = 0; i < 3; i++) { const bx = top[0] - 12 + i * 12, by = top[1] - 30 - Math.sin(sec * 2 + i) * 3; line(g, [[bx, by + 5], [top[0], top[1] - 6]], 'rgba(120,120,120,.6)', 0.5); circle(g, bx, by, 3.4, pick(cols, i + 2)); }
        drawPerson(g, 0.18, 0.05, b, '#f3d2b6', sec * 9, 10 + bob, Math.abs(Math.sin(sec * 7 + f.v)) * 2);
      }
      g.restore();
    }
    function drawWorks(g, c, r) {   // roadworks: a dug-up hole, barriers, cones and a little digger
      const v = hash(c, r, 95);
      poly(g, diamond(c + 0.25, r + 0.25, 0.5, 0.5, 0.3), '#8a6a4a'); poly(g, diamond(c + 0.32, r + 0.32, 0.36, 0.36, 0.2), '#6f523e');
      const bar = (a, b) => { for (let i = 0; i < 4; i++) { const t0 = i / 4, t1 = (i + 1) / 4, pa = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], pb = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1]; line(g, [P(pa[0], pa[1], 5), P(pb[0], pb[1], 5)], i % 2 ? '#ffffff' : '#e0453a', 2.2); } line(g, [P(a[0], a[1], 0), P(a[0], a[1], 6)], '#5b6170', 0.8); line(g, [P(b[0], b[1], 0), P(b[0], b[1], 6)], '#5b6170', 0.8); };
      bar([c + 0.1, r + 0.1], [c + 0.9, r + 0.1]); bar([c + 0.1, r + 0.9], [c + 0.9, r + 0.9]);
      [[c + 0.15, r + 0.5], [c + 0.85, r + 0.5]].forEach(([cc, rr]) => { const q = P(cc, rr, 0); poly(g, [[q[0] - 2.4, q[1]], [q[0] + 2.4, q[1]], [q[0], q[1] - 7]], '#f08a3c'); line(g, [[q[0] - 1.4, q[1] - 3], [q[0] + 1.4, q[1] - 3]], '#ffffff', 1); });
      if (v < 0.5) {   // the digger
        box(g, c + 0.55, r + 0.45, 0.3, 0.22, 0, 6, '#f2c14e', '#e0b03c', '#c89c30'); box(g, c + 0.6, r + 0.48, 0.14, 0.14, 6, 5, '#a9d8ee', '#f2c14e', '#c89c30');
        const j = P(c + 0.55, r + 0.55, 9), e = P(c + 0.3, r + 0.5, 4); line(g, [j, [j[0] - 6, j[1] - 9], e], '#e0b03c', 2); poly(g, [[e[0] - 2, e[1]], [e[0] + 3, e[1]], [e[0], e[1] + 4]], '#5b6170');
      }
    }

    /* the frame */
    function resize() {
      const rc = canvas.getBoundingClientRect(), dpr = DPR();
      W = Math.max(1, rc.width); H = Math.max(1, rc.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    function lighting() {   // tint and how lit the windows are, from the clock
      const h = clock.h, n = clock.night, neon = C.theme === 'neon' ? 0.28 : 0;
      if (n > 0) return { tint: 'rgba(40,52,120,' + (0.42 * n + 0.08) + ')', lights: Math.min(1, 0.4 + n) };
      if (h < 1) return { tint: 'rgba(255,190,140,' + (0.16 * (1 - h)) + ')', lights: Math.max(neon, 0.3 * (1 - h)) };
      if (h > 10) { const k = Math.min(1, (h - 10) / 4); return { tint: k < 0.5 ? 'rgba(255,170,100,' + (0.08 + k * 0.2) + ')' : 'rgba(' + Math.round(255 - (k - 0.5) * 360) + ',' + Math.round(170 - (k - 0.5) * 200) + ',' + Math.round(100 + (k - 0.5) * 60) + ',' + (0.18 + (k - 0.5) * 0.24) + ')', lights: Math.max(neon, (k - 0.45) * 1.6) }; }
      return { tint: null, lights: neon };
    }
    function frame(t) {
      if (!running) return;
      requestAnimationFrame(frame);
      const dt = Math.min(0.1, (t - (lastT || t)) / 1000); lastT = t;
      if (canvas.clientWidth !== Math.round(W) || canvas.clientHeight !== Math.round(H)) resize();
      if (cam.tx !== null) {
        const k = 1 - Math.pow(0.0015, dt);
        cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k; cam.z += (cam.tz - cam.z) * k;
        if (Math.abs(cam.tx - cam.x) < 0.5 && Math.abs(cam.ty - cam.y) < 0.5 && Math.abs(cam.tz - cam.z) < 0.002) { cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; cam.tx = cam.ty = cam.tz = null; }
      } else if (!drag && (Math.abs(cam.vx) > 1 || Math.abs(cam.vy) > 1)) {
        cam.x -= cam.vx * dt / cam.z; cam.y -= cam.vy * dt / cam.z; cam.vx *= Math.pow(0.02, dt); cam.vy *= Math.pow(0.02, dt);
      }
      clampCam();
      if (C) {
        syncBlocked(); syncIncidents();
        stepCars(dt); stepPeds(dt); stepCustomers(dt); stepWeather(dt);
        if (fx.shake > 0) fx.shake = Math.max(0, fx.shake - dt);
        const t1 = performance.now(); draw(t); stats.ms = stats.ms * 0.9 + (performance.now() - t1) * 0.1; stats.frames++;
      }
      if (opts.onFrame) opts.onFrame(dt);
    }
    function draw(t) {
      const dpr = DPR(), Z = cam.z * dpr, shake = fx.shake > 0 ? fx.shake * 3.2 : 0;
      const ox = Math.round(W / 2 * dpr - cam.x * Z + (shake ? (Math.random() - 0.5) * shake * dpr : 0)), oy = Math.round(H / 2 * dpr - cam.y * Z + (shake ? (Math.random() - 0.5) * shake * dpr : 0));
      const bucket = bucketOf(cam.z), sec = Math.max(0, (t - T0) / 1000), wx = weatherNow();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const bgc = C.bg || ['#cfe9f6', '#e9f3ec'], bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bg.addColorStop(0, look.snow ? '#dfe8f0' : bgc[0]); bg.addColorStop(1, look.snow ? '#f3f6f9' : bgc[1]);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(Z, 0, 0, Z, ox, oy);
      const [vx0, vy0] = toWorld(0, 0), [vx1, vy1] = toWorld(W, H);
      const exact = Math.abs(bucket - cam.z) < 1e-3 && !shake;
      const blit = (cv, wx0, wy0, ww, wh) => {
        if (exact) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(cv, Math.round(wx0 * Z + ox), Math.round(wy0 * Z + oy)); ctx.setTransform(Z, 0, 0, Z, ox, oy); }
        else ctx.drawImage(cv, wx0, wy0, ww, wh);
      };
      const far = bucket <= 0.3, gb = Math.min(bucket, 1.2);   // the ground at the closest zoom: the next step's pictures, a little bigger
      if (far) { const o = overview(bucket); blit(o.cv, o.x0, o.y0, o.w, o.h); }
      // ground chunks in view (back to front: hills in front cover what is behind them)
      if (!far) for (let cy = 0; cy < NCH; cy++) for (let cx = 0; cx < NCH; cx++) {
        const c0 = cx * CH, r0 = cy * CH, x0 = (c0 - r0 - CH) * HW, x1 = (c0 - r0 + CH) * HW, y0 = (c0 + r0) * HH - 240, y1 = (c0 + r0 + 2 * CH) * HH + SIDE;
        if (x1 < vx0 - 10 || x0 > vx1 + 10 || y1 < vy0 - 10 || y0 > vy1 + 10) continue;
        const ch = chunk(cx, cy, gb);
        if (ch.cv) (gb === bucket ? blit : ctx.drawImage.bind(ctx))(ch.cv, ch.x0, ch.y0, ch.w, ch.h);
      }
      // locked districts: a light veil on their ground; a flood's water over the low ground by the river
      if (!far) locks.forEach((d) => { ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fill(distPaths[DIST_I[d]]); });
      if (wx.flood) { const k = Math.min(1, Math.max(0, (clock.h - wx.flood.h) / 1.2)); if (k > 0) { ctx.fillStyle = 'rgba(70,140,190,' + (0.64 * k) + ')'; ctx.fill(floodPath); ctx.fillStyle = 'rgba(255,255,255,' + (0.08 + 0.05 * Math.sin(sec * 2)) * k + ')'; ctx.fill(floodPath); } }
      if (fx.cracks.length && activeOf('quake')) fx.cracks.forEach((pts) => line(ctx, pts.map(([c, r]) => P(c, r, 0)), 'rgba(60,45,35,.75)', 1.2));
      if (!far) drawRails(ctx);
      // everything that stands up, back to front (far away: already in the island's picture)
      const list = [], margin = 110, small = cam.z < 0.5, tiny = cam.z < 0.35;
      const inView = (x, y, up) => x > vx0 - margin && x < vx1 + margin && y + 40 > vy0 && y - (up || 0) < vy1 + 40;
      if (!far) for (const s of statics) {
        if (small && (s.o.k === 'bench' || s.o.k === 'lamp' || s.o.k === 'bush' || s.o.k === 'shrub' || s.o.k === 'lantern')) continue;
        if (tiny && s.point && hash(Math.floor(s.o.c * 3), Math.floor(s.o.r * 3), 97) < 0.5) continue;   // the far view keeps half the trees
        if (inView(s.ax, s.ay + 20, s.point ? 60 : s.top + 40)) list.push(s);
      }
      if (!far) for (const o of lotObjs) if (inView(o.ax, o.ay + 2 * o.w * HH, o.w > 2 ? 360 : o.w > 1 ? 330 : 170)) list.push(o);
      if (cam.z > 0.38) {
        for (const a of agents.cars) { const q = carPos(a), x = (q.c - q.r) * HW, y = (q.c + q.r) * HH; if (inView(x, y)) list.push({ car: a, depth: q.c + q.r }); }
        if (cam.z > 0.55) {
          for (const p of agents.peds) { const q = pedPos(p), x = (q.c - q.r) * HW, y = (q.c + q.r) * HH; if (inView(x, y)) list.push({ ped: p, q: q, depth: q.c + q.r }); }
          for (const p of agents.cust) { const c = p.a[0] + (p.b[0] - p.a[0]) * p.t, r = p.a[1] + (p.b[1] - p.a[1]) * p.t; list.push({ cust: p, c: c, r: r, depth: c + r }); }
        }
        for (const tc of trainCars(sec)) list.push({ train: tc, depth: tc.depth });
        for (const cm of camels(sec)) list.push({ camel: cm, depth: cm.depth });
        works.forEach((kk) => { const c = kk % 128, r = Math.floor(kk / 128); list.push({ works: [c, r], depth: c + r + 0.6 }); });
        for (const p of parade(sec)) list.push(p);
      }
      list.sort((a, b) => a.depth - b.depth);
      for (const it of list) {
        if (it.car) { drawCar(ctx, it.car); continue; }
        if (it.ped) { drawPerson(ctx, it.q.c, it.q.r, it.ped.shirt, it.ped.skin, it.ped.ph); continue; }
        if (it.cust) { drawPerson(ctx, it.c, it.r, it.cust.shirt, it.cust.skin, it.cust.ph); continue; }
        if (it.train) { drawTrainCar(ctx, it.train); continue; }
        if (it.camel) { A.drawCamel(ctx, ...P(it.camel.c, it.camel.r, it.camel.z), it.camel.dir, 1, it.camel.ph); continue; }
        if (it.works) { drawWorks(ctx, it.works[0], it.works[1]); continue; }
        if (it.float) { drawFloat(ctx, it, sec); continue; }
        if (it.dancer) { const cols = THEME_FLOAT[C.theme] || THEME_FLOAT.bay; drawPerson(ctx, it.c, it.r, pick(cols, it.v), pick(SKINS, it.v), sec * 10 + it.v, 0, Math.abs(Math.sin(sec * 8 + it.v)) * 2.4); continue; }
        if (it.fan) { drawPerson(ctx, it.c, it.r, pick(SHIRTS, it.v), pick(SKINS, it.v * 3), 0, 0, (Math.sin(sec * 6 + it.v) > 0.6 ? 1.6 : 0)); continue; }
        const sp = it.o ? staticSprite(it, bucket) : lotSprite(it, bucket);
        if (!sp) continue;
        blit(sp.cv, it.ax + sp.x0, it.ay + sp.y0, sp.w, sp.h);
        if (it.movers && it.movers.length && !tiny) drawMovers(ctx, it, sec);
      }
      drawBoats(ctx, sec); drawPlanes(ctx, sec);
      drawFx(ctx, t, sec);
      // lots to pick from glow green, the selected lot gold: outlines over everything
      const ring = (lot, fill, stroke, a, grw) => { const pts = diamond(lot.c - grw, lot.r - grw, lot.w + 2 * grw, lot.w + 2 * grw, 0); ctx.save(); ctx.globalAlpha = a * 0.35; poly(ctx, pts, fill); ctx.globalAlpha = a; line(ctx, pts.concat([pts[0]]), stroke, 2.6); ctx.restore(); };
      if (pickMode) pickMode.lots.forEach((i) => ring(C.lots[pickMode.d][i], '#3ee08a', '#1fa862', 0.65 + 0.3 * Math.sin(sec * 4), 0.02));
      if (sel && C.lots[sel.d] && C.lots[sel.d][sel.i]) ring(C.lots[sel.d][sel.i], '#ffd45a', '#f2a91a', 0.7 + 0.3 * Math.sin(sec * 5), 0.06);
      // light: the time of day (and the storm) over everything, then lamps, windows and signs at dusk
      const li = lighting();
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (li.tint) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = li.tint; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      if (wx.dark) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(70,80,100,' + wx.dark + ')'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      if (wx.sand) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(214,160,92,.34)'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.restore();
      if (li.lights > 0.02 && !far) drawLights(ctx, list, li.lights, sec);
      // weather and labels in screen pixels
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawWeather(ctx, wx, sec);
      drawBadges(ctx, sec);
      drawPops(ctx, t);
      drawLabels(ctx);
    }
    // the turning, splashing and glowing parts of landmarks and businesses
    function drawMovers(g, it, sec) {
      it.movers.forEach((m) => {
        const base = it.o ? [it.ax - (Math.floor(it.o.c) - Math.floor(it.o.r)) * HW, it.ay - (Math.floor(it.o.c) + Math.floor(it.o.r)) * HH] : [0, 0];
        const ac = it.o ? Math.floor(it.o.c) : it.lot.c, ar = it.o ? Math.floor(it.o.r) : it.lot.r, p0 = P(ac + m.c, ar + m.r, m.z), p = [p0[0] + base[0], p0[1] + base[1]];
        if (m.k === 'sails' || m.k === 'blades') {
          const a = sec * (m.k === 'blades' ? 1.6 : 0.9), n = m.k === 'blades' ? 3 : 4;
          for (let i = 0; i < n; i++) { const an = a + i * Math.PI * 2 / n, ex = p[0] + Math.cos(an) * m.R, ey = p[1] + Math.sin(an) * m.R;
            if (m.k === 'blades') { poly(g, [[p[0], p[1]], [ex, ey], [ex + Math.cos(an + 1.57) * 2.4, ey + Math.sin(an + 1.57) * 2.4]], 'rgba(248,250,252,.95)'); }
            else { line(g, [[p[0], p[1]], [ex, ey]], '#7a5a3e', 1.4); poly(g, [[p[0] + Math.cos(an) * 6, p[1] + Math.sin(an) * 6], [ex, ey], [ex + Math.cos(an + 1.57) * 5, ey + Math.sin(an + 1.57) * 5], [p[0] + Math.cos(an) * 6 + Math.cos(an + 1.57) * 5, p[1] + Math.sin(an) * 6 + Math.sin(an + 1.57) * 5]], 'rgba(250,246,236,.92)'); } }
          circle(g, p[0], p[1], 2, m.k === 'blades' ? '#dfe4ea' : '#5d4a3a');
        } else if (m.k === 'spray') {
          for (let i = 0; i < 8; i++) { const ph = (sec * 1.4 + i / 8) % 1, ang = i * 0.8, dx = Math.cos(ang) * 10 * ph, dy = -14 * ph + 22 * ph * ph; circle(g, p[0] + dx, p[1] + dy, 1.2, 'rgba(200,235,250,' + (1 - ph) + ')'); }
        } else if (m.k === 'wheel') {
          const R = m.R, a = sec * 0.25, n = m.pods || 8;
          g.strokeStyle = '#d9dee4'; g.lineWidth = 2; g.beginPath(); g.arc(p[0], p[1], R, 0, 7); g.stroke(); g.strokeStyle = 'rgba(160,168,178,.8)'; g.lineWidth = 0.8; g.beginPath(); g.arc(p[0], p[1], R * 0.92, 0, 7); g.stroke();
          for (let i = 0; i < n; i++) { const an = a + i * Math.PI * 2 / n, ex = p[0] + Math.cos(an) * R, ey = p[1] + Math.sin(an) * R; line(g, [p, [ex, ey]], 'rgba(160,168,178,.7)', 0.6); ellipse(g, ex, ey + 2.4, R > 60 ? 4.4 : 3, R > 60 ? 3.4 : 2.6, R > 60 ? '#e8f4fb' : pick(A.AWN, i)); }
          circle(g, p[0], p[1], 3, '#9aa3ad');
        } else if (m.k === 'sphere') {   // the sphere's pictures change: an eye, a globe, fireworks, the moon
          const show = Math.floor(sec / 6) % 4, k = (sec % 6) / 6;
          g.save(); g.beginPath(); g.arc(p[0], p[1], m.R - 1, 0, 7); g.clip();
          if (show === 0) { const gr = g.createRadialGradient(p[0], p[1], 4, p[0], p[1], m.R); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#f2f4f7'); gr.addColorStop(1, '#c9d0d8'); g.fillStyle = gr; g.fillRect(p[0] - m.R, p[1] - m.R, m.R * 2, m.R * 2); circle(g, p[0] + Math.sin(sec) * 10, p[1], 24, '#3f7fd0'); circle(g, p[0] + Math.sin(sec) * 10, p[1], 12, '#1f2033'); circle(g, p[0] + Math.sin(sec) * 10 - 5, p[1] - 6, 4, '#ffffff'); }
          else if (show === 1) { g.fillStyle = '#2f6fb8'; g.fillRect(p[0] - m.R, p[1] - m.R, m.R * 2, m.R * 2); for (let i = 0; i < 5; i++) ellipse(g, p[0] - 40 + ((sec * 12 + i * 34) % 110), p[1] - 30 + i * 14, 16, 8, '#5fb04a'); }
          else if (show === 2) { g.fillStyle = '#1f2033'; g.fillRect(p[0] - m.R, p[1] - m.R, m.R * 2, m.R * 2); for (let i = 0; i < 4; i++) { const cx2 = p[0] - 30 + i * 20, cy2 = p[1] - 20 + (i % 2) * 24, rr = 6 + k * 22; for (let j = 0; j < 10; j++) { const an = j * 0.63; circle(g, cx2 + Math.cos(an) * rr, cy2 + Math.sin(an) * rr, 1.8, pick(A.NEON, i + j)); } } }
          else { g.fillStyle = '#e8e2c8'; g.fillRect(p[0] - m.R, p[1] - m.R, m.R * 2, m.R * 2); [[-20, -14, 10], [16, 10, 14], [-8, 24, 6], [24, -22, 7]].forEach(([dx, dy, rr]) => circle(g, p[0] + dx, p[1] + dy, rr, '#cfc8ae')); }
          g.restore();
        } else if (m.k === 'jets') {   // the fountain show: jets of water rising and falling in a wave
          for (let i = 0; i < m.n; i++) { const q = P(ac + m.c + i * m.len / (m.n - 1), ar + m.r, 0), hgt = 20 + 40 * Math.max(0, Math.sin(sec * 2.2 - i * 0.7)), x = q[0] + base[0], y = q[1] + base[1]; g.beginPath(); g.moveTo(x - 1.6, y); g.quadraticCurveTo(x, y - hgt * 1.4, x + 1.6, y); g.fillStyle = 'rgba(225,245,255,.85)'; g.fill(); circle(g, x, y - hgt * 0.7, 2.6, 'rgba(255,255,255,.6)'); }
        } else if (m.k === 'lava') {   // the volcano erupts every few seconds, glowing more after dark
          const ph = (sec % 14) / 14, on = ph > 0.7;
          for (let i = 0; i < 5; i++) { const s = ((sec * 0.4 + i * 0.2) % 1); circle(g, p[0] + Math.sin(i * 2 + sec) * 6 * s, p[1] - 8 - s * 40, 4 + s * 8, 'rgba(120,110,105,' + (0.5 * (1 - s)) + ')'); }
          if (on) { const k = (ph - 0.7) / 0.3; for (let i = 0; i < 9; i++) { const an = -Math.PI / 2 + (i - 4) * 0.22, d = k * 34; circle(g, p[0] + Math.cos(an) * d, p[1] + Math.sin(an) * d + k * k * 30, 3, i % 2 ? '#ff8a3d' : '#ffd23f'); } ellipse(g, p[0], p[1] + 4, 14, 5, '#ff6a2a'); }
        } else if (m.k === 'canopy') {   // the light show on the canopy
          const along = m.w >= m.d, L = along ? m.w : m.d;
          for (let i = 0; i < L; i++) { const col = pick(A.NEON, Math.floor(sec * 3 + i * 0.4)); const q0 = along ? P(ac + i, ar + 0.2, m.z + 4) : P(ac + 0.2, ar + i, m.z + 4), q1 = along ? P(ac + i + 0.9, ar + m.d - 0.2, m.z + 4) : P(ac + m.w - 0.2, ar + i + 0.9, m.z + 4); g.globalAlpha = 0.6; line(g, [[q0[0] + base[0], q0[1] + base[1]], [q1[0] + base[0], q1[1] + base[1]]], col, 3); g.globalAlpha = 1; }
        } else if (m.k === 'screen') {   // the giant screens at the crossing
          const col = pick(['#3f7fd0', '#e05a5a', '#f2c14e', '#6cc08f', '#b46bff'], Math.floor(sec / 2)), col2 = pick(['#f2c14e', '#6cc08f', '#b46bff', '#3f7fd0', '#e05a5a'], Math.floor(sec / 3));
          g.globalAlpha = 0.8; poly(g, A.onL(ac + m.c, ar + m.r, m.w, m.w, m.z, m.h, 0.08, 0.92, 0.08, 0.92).map(([x, y]) => [x + base[0], y + base[1]]), col); poly(g, A.onR(ac + m.c, ar + m.r, m.w, m.w, m.z, m.h, 0.08, 0.92, 0.08, 0.92).map(([x, y]) => [x + base[0], y + base[1]]), col2); g.globalAlpha = 1;
        } else if (m.k === 'steam') {
          for (let i = 0; i < 6; i++) { const s = (sec * 0.3 + i / 6) % 1; circle(g, p[0] - 16 + i * 6 + Math.sin(sec + i) * 3, p[1] - s * 30, 3 + s * 7, 'rgba(255,255,255,' + (0.45 * (1 - s)) + ')'); }
        }
      });
    }
    // dust after the earthquake, confetti over the parade
    function drawFx(g, t, sec) {
      const now = performance.now();
      for (let i = fx.dust.length - 1; i >= 0; i--) {
        const d = fx.dust[i], age = (now - d.t0) / 1000; if (age < 0) continue; if (age > 4) { fx.dust.splice(i, 1); continue; }
        const q = P(d.c, d.r, 6), k = age / 4;
        for (let j = 0; j < 5; j++) circle(g, q[0] + (hash(i, j, 1) - 0.5) * 30 * d.big * (0.4 + k), q[1] - k * 26 - j * 3, (6 + k * 16) * Math.min(2, d.big), 'rgba(170,150,130,' + (0.42 * (1 - k)) + ')');
      }
      if (activeOf('carnival') && cam.z > 0.38) {
        if (fx.confetti.length < 140) for (let i = 0; i < 4; i++) { const s = C.parade[Math.floor(Math.random() * C.parade.length)]; fx.confetti.push({ c: s[0] + Math.random(), r: s[1] + Math.random(), z: 40 + Math.random() * 40, vz: 8 + Math.random() * 10, col: pick(THEME_FLOAT[C.theme] || THEME_FLOAT.bay, Math.floor(Math.random() * 4)), a: Math.random() * 6 }); }
        for (let i = fx.confetti.length - 1; i >= 0; i--) { const p = fx.confetti[i]; p.z -= p.vz * 0.016; p.a += 0.15; if (p.z <= 0) { fx.confetti.splice(i, 1); continue; } const q = P(p.c, p.r, p.z); g.save(); g.translate(q[0] + Math.sin(p.a) * 3, q[1]); g.rotate(p.a); g.fillStyle = p.col; g.fillRect(-1.6, -0.8, 3.2, 1.6); g.restore(); }
      } else fx.confetti.length = 0;
      // bunting over the parade route all carnival day
      const cx = liveIncidents().find((x) => x.id === 'carnival');
      if (cx && cam.z > 0.38) for (let i = 1; i + 2 < C.parade.length; i += 3) {
        const [c, r] = C.parade[i], a = C.parade[i - 1], b = C.parade[i + 1], dc = Math.sign(b[0] - a[0]), dr = Math.sign(b[1] - a[1]);
        const p1 = P(c + 0.5 + dr * 0.5, r + 0.5 - dc * 0.5, 24), p2 = P(c + 0.5 - dr * 0.5, r + 0.5 + dc * 0.5, 24);
        g.beginPath(); g.moveTo(p1[0], p1[1]); g.quadraticCurveTo((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2 + 8, p2[0], p2[1]); g.strokeStyle = 'rgba(90,90,90,.6)'; g.lineWidth = 0.6; g.stroke();
        for (let j = 1; j < 6; j++) { const u = j / 6, x = p1[0] + (p2[0] - p1[0]) * u, y = p1[1] + (p2[1] - p1[1]) * u + 8 * 4 * u * (1 - u) * 0.5; poly(g, [[x - 2.4, y], [x + 2.4, y], [x, y + 5]], pick(THEME_FLOAT[C.theme] || THEME_FLOAT.bay, i + j)); }
      }
      // scaffolding on damaged businesses
      const L = game && game.live;
      if (L && L.hit) lotObjs.forEach((o) => {
        if (o.st.k !== 'biz') return; const hit = L.hit[o.st.b.uid]; if (!hit || !hit.bill) return;
        const h = Math.min(60, buildingTop(o) * 0.7), w = o.w;
        for (let f = 1; f * 10 < h; f++) line(g, [P(o.lot.c + 0.08, o.lot.r + w - 0.08, f * 10), P(o.lot.c + w - 0.08, o.lot.r + w - 0.08, f * 10), P(o.lot.c + w - 0.08, o.lot.r + 0.08, f * 10)], '#e2a526', 1.2);
        [[0.08, w - 0.08], [w - 0.08, w - 0.08], [w - 0.08, 0.08]].forEach(([c, r]) => line(g, [P(o.lot.c + c, o.lot.r + r, 0), P(o.lot.c + c, o.lot.r + r, h)], '#c98a1e', 1));
      });
      void t; void sec;
    }
    function drawLights(g, list, k, sec) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const it of list) {
        if (it.o && (it.o.k === 'lamp' || it.o.k === 'lantern')) { const q = [it.ax + 4.5, it.ay - 17]; const gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], 14); gr.addColorStop(0, it.o.k === 'lantern' ? 'rgba(255,150,90,' + 0.6 * k + ')' : 'rgba(255,214,140,' + 0.55 * k + ')'); gr.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gr; g.fillRect(q[0] - 14, q[1] - 14, 28, 28); continue; }
        if (it.o && it.o.k === 'lighthouse') { const q = [it.ax + HW * 0, it.ay + HH - 75]; const a = sec * 1.6; g.save(); g.translate(q[0], q[1]); g.rotate(a); const gr = g.createLinearGradient(0, 0, 140, 0); gr.addColorStop(0, 'rgba(255,240,180,' + 0.5 * k + ')'); gr.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(140, -16); g.lineTo(140, 16); g.closePath(); g.fill(); g.restore(); continue; }
        if (it.o && it.movers) {
          it.movers.forEach((m) => {
            if (m.k !== 'skybeam' && m.k !== 'blink') return;
            const q = [it.ax + (m.c - m.r) * HW, it.ay + (m.c + m.r) * HH - m.z];
            if (m.k === 'skybeam') { const gr = g.createLinearGradient(q[0], q[1], q[0], q[1] - 600); gr.addColorStop(0, 'rgba(255,250,220,' + 0.55 * k + ')'); gr.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = gr; g.fillRect(q[0] - 4, q[1] - 600, 8, 600); }
            else if (Math.sin(sec * 3) > 0) circle(g, q[0], q[1], 4, 'rgba(255,60,60,' + 0.8 * k + ')');
          });
          continue;
        }
        const st = it.st; if (!st || (st.k !== 'npc' && st.k !== 'biz' && st.k !== 'rival')) continue;
        const hgt = it.w > 2 ? 60 : it.w > 1 ? 120 : it.d === 'downtown' ? 60 : it.d === 'high' ? 28 : 14, n = it.w > 1 ? 9 : 4, seedv = (st.look || 7) * 13 + it.i;
        for (let j = 0; j < n; j++) {
          if (hash(seedv, j, 4) > 0.6) continue;
          const u = 0.2 + 0.6 * hash(seedv, j, 5), side = hash(seedv, j, 6) < 0.5, z = 6 + hash(seedv, j, 7) * hgt;
          const q = side ? P(it.lot.c + u * it.w, it.lot.r + it.w * 0.9, z) : P(it.lot.c + it.w * 0.9, it.lot.r + u * it.w, z);
          g.fillStyle = 'rgba(255,214,120,' + 0.75 * k + ')'; g.fillRect(it.ax + q[0] - 1.6 - (it.lot.c - it.lot.r) * HW, it.ay + q[1] - 1.4 - (it.lot.c + it.lot.r) * HH, 3.2, 2.8);
        }
        if (C.theme === 'neon' && st.k === 'npc' && it.d !== 'market' && hash(seedv, 9, 8) < 0.7) {   // neon signs glow
          const col = pick(A.NEON, st.look), q = P(it.lot.c + it.w * 0.9, it.lot.r + it.w * 0.9, it.w > 1 ? 140 : it.d === 'downtown' ? 30 : 22);
          if (!glows[col]) { const cv = makeCanvas(72, 72), gg = cv.getContext('2d'), gr = gg.createRadialGradient(36, 36, 0, 36, 36, 36); gr.addColorStop(0, col + 'aa'); gr.addColorStop(1, col + '00'); gg.fillStyle = gr; gg.fillRect(0, 0, 72, 72); glows[col] = cv; }
          g.globalAlpha = k; g.drawImage(glows[col], q[0] - 18 * it.w, q[1] - 18 * it.w, 36 * it.w, 36 * it.w); g.globalAlpha = 1;
        }
      }
      g.restore();
    }

    /* weather in screen space: rain, snow, sand, petals, leaves, lightning */
    function stepWeather(dt) {
      const wx = weatherNow(), wantSnow = look.snow ? 90 : 0, wantRain = Math.round(wx.rain * 260), wantSand = wx.sand ? 140 : 0;
      const wantPetals = C.theme === 'sakura' && look.season === 'spring' ? 40 : look.season === 'autumn' && !look.dry ? 18 : 0;
      const keep = (arr, n, make) => { while (arr.length < n) arr.push(make(true)); if (arr.length > n) arr.length = n; };
      keep(weather.flakes, wantSnow, () => ({ x: Math.random() * W, y: Math.random() * H, s: 1 + Math.random() * 1.8, v: 18 + Math.random() * 22, ph: Math.random() * 6 }));
      keep(weather.drops, wantRain, () => ({ x: Math.random() * W, y: Math.random() * H, v: 420 + Math.random() * 260, l: 8 + Math.random() * 8 }));
      keep(weather.dust, wantSand, () => ({ x: Math.random() * W, y: Math.random() * H, v: 160 + Math.random() * 180, s: 1 + Math.random() * 2 }));
      keep(weather.petals, wantPetals, () => ({ x: Math.random() * W, y: Math.random() * H, v: 14 + Math.random() * 14, ph: Math.random() * 6, leaf: look.season === 'autumn' }));
      const wind = wx.wind;
      weather.flakes.forEach((f) => { f.y += f.v * dt; f.ph += dt; f.x += Math.sin(f.ph) * 10 * dt + wind * 60 * dt; if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; } if (f.x > W + 4) f.x = -4; });
      weather.drops.forEach((d) => { d.y += d.v * dt; d.x += (60 + wind * 260) * dt; if (d.y > H) { d.y = -10; d.x = Math.random() * W - 60; } if (d.x > W + 20) d.x -= W + 40; });
      weather.dust.forEach((d) => { d.x += d.v * dt; d.y += Math.sin(d.x * 0.02) * 12 * dt; if (d.x > W + 4) { d.x = -4; d.y = Math.random() * H; } });
      weather.petals.forEach((p) => { p.y += p.v * dt; p.ph += dt * 2; p.x += (Math.sin(p.ph) * 18 + 10 + wind * 80) * dt; if (p.y > H + 4) { p.y = -4; p.x = Math.random() * W; } if (p.x > W + 4) p.x = -4; });
      if (wx.storm) { fx.flashT -= dt; if (fx.flashT <= 0) { fx.flash = 0.5; fx.flashT = 2.5 + Math.random() * 4; } }
      fx.flash = Math.max(0, fx.flash - dt * 2.4);
    }
    function drawWeather(g, wx, sec) {
      if (weather.flakes.length) { g.fillStyle = 'rgba(255,255,255,.9)'; weather.flakes.forEach((f) => { g.beginPath(); g.arc(f.x, f.y, f.s, 0, 7); g.fill(); }); }
      if (weather.petals.length) weather.petals.forEach((p) => { g.save(); g.translate(p.x, p.y); g.rotate(p.ph); g.fillStyle = p.leaf ? pick(['#e8902f', '#d9583a', '#f2c14e'], Math.floor(p.ph * 3)) : '#f8c6d6'; g.beginPath(); g.ellipse(0, 0, 3.2, 1.8, 0, 0, 7); g.fill(); g.restore(); });
      if (weather.drops.length) { g.strokeStyle = 'rgba(210,225,240,.55)'; g.lineWidth = 1; g.beginPath(); const sl = 0.18 + wx.wind * 0.5; weather.drops.forEach((d) => { g.moveTo(d.x, d.y); g.lineTo(d.x + d.l * sl, d.y + d.l); }); g.stroke(); }
      if (weather.dust.length) { g.fillStyle = 'rgba(232,186,120,.6)'; weather.dust.forEach((d) => { g.fillRect(d.x, d.y, d.s * 9, d.s * 1.3); }); }
      if (fx.flash > 0) { g.fillStyle = 'rgba(255,255,255,' + fx.flash * 0.55 + ')'; g.fillRect(0, 0, W, H); }
      void sec;
    }

    /* the company's badges: what each business is, a case waiting, a rival, how its day is going */
    function drawBadges(g, sec) {
      badgeHits.length = 0;
      if (!game) return;
      const small = cam.z < 0.45;
      for (const o of lotObjs) {
        const st = o.st; if (st.k !== 'biz' && st.k !== 'rival') continue;
        const tall = buildingTop(o), [sx, sy] = toScreen(o.ax, o.ay + o.w * HH - tall);
        if (sx < -40 || sx > W + 40 || sy < -60 || sy > H + 60) continue;
        const R = small ? 10 : 15, y = sy - R - 6;
        badgeHits.push({ x: sx, y: y, r: R + 6, d: o.d, i: o.i, st: st });
        g.beginPath(); g.moveTo(sx, sy - 2); g.lineTo(sx - 5, y + R - 2); g.lineTo(sx + 5, y + R - 2); g.closePath(); g.fillStyle = st.k === 'rival' ? '#d9534a' : (game.logoColour || '#f2c14e'); g.fill();
        circle(g, sx, y, R + 2.5, st.k === 'rival' ? '#d9534a' : (game.logoColour || '#f2c14e'));
        circle(g, sx, y, R, '#ffffff');
        const r = TY().biz(st.k === 'rival' ? st.rival.bid : st.b.id);
        g.font = Math.round(R * 1.15) + 'px ' + EMOJI; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(r ? r.emoji : '?', sx, y + 1);
        if (st.k === 'rival') { g.font = '700 ' + Math.round(R * 0.62) + 'px sans-serif'; circle(g, sx + R * 0.9, y - R * 0.8, R * 0.5, '#d9534a'); g.fillStyle = '#fff'; g.fillText('VS', sx + R * 0.9, y - R * 0.78); }
        if (st.k === 'biz') {
          if (marks.get(st.b.uid) && cam.z >= 0.55) { const by = y - R - 10 - Math.abs(Math.sin(sec * 3)) * 5; circle(g, sx + R * 0.7, by, 9, '#d9534a'); g.font = '11px ' + EMOJI; g.fillText('📨', sx + R * 0.7, by + 1); }
          const day = TY().todayOf(game, st.b), icon = day.k === 0 ? '🚫' : day.hit && day.hit.bill ? '🔧' : day.notes.some((x) => x.indexOf('roadworks') >= 0) ? '🚧' : day.k > 1 ? '🎉' : '';
          if (icon && !small) { const bx = sx - R * 0.95, by = y - R * 0.75; circle(g, bx, by, 8.5, day.k === 0 ? '#d9534a' : day.k > 1 ? '#2a9f78' : '#f2a91a'); g.font = '10px ' + EMOJI; g.fillText(icon, bx, by + 0.5); }
        }
      }
      if (pickMode && !small) pickMode.lots.forEach((i) => {
        const lot = C.lots[pickMode.d][i], [sx, sy] = toScreen((lot.c - lot.r) * HW, (lot.c + lot.r) * HH + lot.w * HH), st = pickMode.stars[i] || 3;
        g.font = '700 12px sans-serif'; const txt = '★'.repeat(st), tw = g.measureText(txt).width + 10;
        roundRect(g, sx - tw / 2, sy - 30, tw, 17, 8, st >= 4 ? '#2a9f78' : st >= 3 ? '#4f8fd1' : '#8a8fb0');
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, sx, sy - 21);
      });
    }
    function buildingTop(o) {
      const st = o.st, id = st.k === 'biz' ? st.b.id : st.k === 'rival' ? st.rival.bid : '', s = (A.BIZ_STYLE[id] || ['shop'])[0];
      return A.BIZ_TOP[s] || 40;
    }
    const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    /* money popping up over a business */
    function drawPops(g, t) {
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i], age = (t - p.t0) / 1000;
        if (age > 1.8) { pops.splice(i, 1); continue; }
        const [sx, sy] = toScreen(p.x, p.y);
        if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue;
        const k = Math.min(1, age * 5), y = sy - 14 - age * 26, a = age < 1.3 ? 1 : 1 - (age - 1.3) / 0.5;
        g.save(); g.globalAlpha = Math.max(0, a); g.font = '800 ' + Math.round(13 + 2 * k) + 'px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText(p.text, sx + 8, y); g.fillStyle = p.good ? '#1f8a63' : '#d9534a'; g.fillText(p.text, sx + 8, y);
        const tw = g.measureText(p.text).width; circle(g, sx + 8 - tw / 2 - 9, y, 6.5, p.good ? '#f2c14e' : '#e0a0a0'); g.fillStyle = p.good ? '#b8860b' : '#a33'; g.font = '800 9px sans-serif'; g.fillText(p.icon || '$', sx + 8 - tw / 2 - 9, y + 0.5);
        g.restore();
      }
    }
    /* district names and lock signs */
    function drawLabels(g) {
      if (!game) return;
      C.DISTRICTS.forEach((d) => {
        const [c, r] = C.centers[d], [sx, sy] = toScreen((c - r) * HW, (c + r) * HH), open = TY().unlocked(game, d), dd = TY().district(d);
        if (open && cam.z > 0.6) return;
        if (sx < -120 || sx > W + 120 || sy < -40 || sy > H + 40) return;
        const txt = (open ? TY().demoji(game, d) + ' ' : '🔒 ') + TY().dname(game, d), sub = open ? '' : 'Opens at ' + shortMoney(dd.unlock);
        g.font = '700 ' + (cam.z < 0.45 ? 13 : 15) + 'px Fredoka, Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        const tw = Math.max(g.measureText(txt).width, sub ? g.measureText(sub).width * 0.85 : 0) + 22, hgt = sub ? 42 : 26;
        g.save(); g.shadowColor = 'rgba(0,0,0,.18)'; g.shadowBlur = 6; roundRect(g, sx - tw / 2, sy - hgt / 2, tw, hgt, 12, open ? 'rgba(255,255,255,.92)' : 'rgba(41,52,90,.86)'); g.restore();
        g.fillStyle = open ? '#29345a' : '#ffffff'; g.fillText(txt, sx, sy - (sub ? 8 : 0));
        if (sub) { g.font = '700 11px Nunito, sans-serif'; g.fillStyle = '#ffd86b'; g.fillText(sub, sx, sy + 10); }
      });
    }
    const shortMoney = (n) => (n >= 1e6 ? '$' + (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M' : n >= 1e3 ? '$' + Math.round(n / 1e3) + 'k' : '$' + n);

    /* fingers and the mouse */
    let drag = null, pinch = null;
    const pts = new Map();
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.offsetX, e.offsetY]);
      cam.tx = cam.ty = cam.tz = null; cam.vx = cam.vy = 0;
      if (pts.size === 1) drag = { x: e.offsetX, y: e.offsetY, sx: e.offsetX, sy: e.offsetY, t: performance.now(), moved: false, lx: e.offsetX, ly: e.offsetY, lt: performance.now() };
      else if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.z, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 }; if (drag) drag.moved = true; }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.offsetX, e.offsetY]);
      if (pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const before = toWorld(mx, my); cam.z = Math.max(ZMIN * 0.9, Math.min(ZMAX * 1.1, pinch.z * d / Math.max(10, pinch.d))); const after = toWorld(mx, my);
        cam.x += before[0] - after[0]; cam.y += before[1] - after[1];
        cam.x -= (mx - pinch.mx) / cam.z; cam.y -= (my - pinch.my) / cam.z; pinch.mx = mx; pinch.my = my;
        return;
      }
      if (!drag) return;
      const dx = e.offsetX - drag.x, dy = e.offsetY - drag.y;
      if (!drag.moved && Math.hypot(e.offsetX - drag.sx, e.offsetY - drag.sy) > 8) drag.moved = true;
      if (drag.moved) {
        cam.x -= dx / cam.z; cam.y -= dy / cam.z;
        const now = performance.now(), ddt = Math.max(1, now - drag.lt) / 1000;
        cam.vx = (e.offsetX - drag.lx) / ddt; cam.vy = (e.offsetY - drag.ly) / ddt; drag.lx = e.offsetX; drag.ly = e.offsetY; drag.lt = now;
      }
      drag.x = e.offsetX; drag.y = e.offsetY;
    });
    const up = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pinch) { if (pts.size < 2) { pinch = null; settle(); } drag = null; return; }
      if (drag && !drag.moved && performance.now() - drag.t < 600) { cam.vx = cam.vy = 0; tap(e.offsetX, e.offsetY); }
      if (drag && performance.now() - drag.lt > 80) { cam.vx = cam.vy = 0; }
      drag = null;
    };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault(); cam.tx = cam.ty = cam.tz = null;
      const before = toWorld(e.offsetX, e.offsetY); cam.z = Math.max(ZMIN * 0.9, Math.min(ZMAX * 1.1, cam.z * Math.exp(-e.deltaY * 0.0015))); const after = toWorld(e.offsetX, e.offsetY);
      cam.x += before[0] - after[0]; cam.y += before[1] - after[1];
      clearTimeout(wheelT); wheelT = setTimeout(settle, 180);
    }, { passive: false });
    let wheelT = 0;
    function settle() { cam.tx = cam.x; cam.ty = cam.y; cam.tz = snapZ(cam.z); }
    // what is under a finger: the frontmost lot whose building or ground is there
    function hitAt(sx, sy) {
      const [wx, wy] = toWorld(sx, sy);
      const cand = lotObjs.slice().sort((a, b) => b.depth - a.depth);
      for (const o of cand) {
        const top = o.st.k === 'biz' || o.st.k === 'rival' ? buildingTop(o) : o.st.k === 'npc' ? (o.w > 1 ? 200 : o.d === 'downtown' ? 80 : 36) : 20;
        const left = o.ax - o.w * HW, right = o.ax + o.w * HW, bottom = o.ay + 2 * o.w * HH, topY = o.ay - top;
        if (wx < left || wx > right || wy < topY || wy > bottom) continue;
        const cx = o.ax, cy = o.ay + o.w * HH, inDia = Math.abs(wx - cx) / (o.w * HW) + Math.abs(wy - cy) / (o.w * HH) <= 1;
        const inBody = Math.abs(wx - cx) <= o.w * HW * 0.75 && wy <= cy && wy >= topY;
        if (inDia || inBody) return { kind: 'lot', d: o.d, i: o.i, st: o.st };
      }
      const c = Math.floor((wy / HH + wx / HW) / 2), r = Math.floor((wy / HH - wx / HW) / 2);
      if (!C.inb(c, r) || isVoid(c, r)) return null;
      const di = C.dist[C.at(c, r)];
      return { kind: 'ground', c: c, r: r, d: di >= 0 ? C.DISTRICTS[di] : null, tile: C.KINDS[kAt(c, r)] };
    }
    // while a spot is being picked, a glowing lot (or its stars above it) wins over whatever stands in front of it
    function pickAt(sx, sy) {
      if (!pickMode) return null;
      const [wx, wy] = toWorld(sx, sy);
      let best = null, bd = 1e9;
      pickMode.lots.forEach((i) => {
        const lot = C.lots[pickMode.d][i], cx = (lot.c - lot.r) * HW, cy = (lot.c + lot.r) * HH + lot.w * HH, [bx, by] = toScreen(cx, cy);
        const inDia = Math.abs(wx - cx) / (lot.w * HW) + Math.abs(wy - cy) / (lot.w * HH) <= 1.1, onStars = Math.abs(sx - bx) < 30 && sy > by - 34 && sy < by;
        const dd = Math.hypot(sx - bx, sy - by);
        if ((inDia || onStars) && dd < bd) { bd = dd; best = i; }
      });
      return best === null ? null : { kind: 'lot', d: pickMode.d, i: best, st: game ? TY().lotState(game, pickMode.d, best) : null };
    }
    function badgeAt(sx, sy) { for (let k = badgeHits.length - 1; k >= 0; k--) { const b = badgeHits[k]; if (Math.hypot(sx - b.x, sy - b.y) <= b.r) return { kind: 'lot', d: b.d, i: b.i, st: b.st }; } return null; }
    function tap(sx, sy) { const hit = pickAt(sx, sy) || badgeAt(sx, sy) || hitAt(sx, sy); if (opts.onTap) opts.onTap(hit); }
    // where an incident is (for the page's "show me")
    function incidentPlace(x) {
      if (!x) return null;
      if (x.tiles && x.tiles.length) { const t = x.tiles[Math.floor(x.tiles.length / 2)]; return [t[0], t[1]]; }
      if (x.id === 'quake') return [x.c, x.r];
      // a flood, a storm: the company's business most at risk
      const wet = (b) => { const [d, i] = b.plot.split(':'); return TY().featOf(game, d, +i).water || 0; }, b = game && game.biz.slice().sort((a, b2) => wet(b2) - wet(a))[0];
      if (b) { const [d, i] = b.plot.split(':'), lot = C.lots[d][+i]; return [lot.c, lot.r]; }
      return C.centers.market;
    }

    /* what the page can do */
    const api = {
      start() { if (running) return; running = true; lastT = 0; resize(); requestAnimationFrame(frame); },
      stop() { running = false; },
      setGame(G) {
        const fresh = game !== G; game = G;
        useCity(G.map || 'bay');
        const lk = lookOf(TY().season(G), C.climate), key = lk.season + (lk.snow ? '*' : '');
        if (key !== lookKey) { look = lk; lookKey = key; }
        rebuildLots(); worksKey = '';
        marks.clear(); G.inbox.forEach((x) => { if (x.uid) marks.set(x.uid, true); });
        if (fresh) { const b = G.biz[0]; if (b) { const [d, i] = b.plot.split(':'), lot = C.lots[d][+i]; focusTile(lot.c, lot.r, cam.z || 1, true); } else { const [c, r] = C.centers.market; focusTile(c - 4, r - 4, defaultZoom(), true); } }
      },
      refresh() { if (game) api.setGame(game); },
      setClock(c) { clock = c; },
      select(d, i) { sel = d === null || d === undefined ? null : { d: d, i: i }; },
      pick(p) { pickMode = p; },
      pop(uid, amount, text, icon) {
        const b = game && game.biz.find((x) => x.uid === uid); if (!b) return;
        const [d, i] = b.plot.split(':'), lot = C.lots[d][+i], o = lotObjs.find((x) => x.d === d && x.i === +i);
        pops.push({ x: (lot.c - lot.r) * HW, y: (lot.c + lot.r) * HH + lot.w * HH - (o ? buildingTop(o) : 30) - 18, text: text, good: amount >= 0, icon: icon, t0: performance.now() });
        if (pops.length > 80) pops.splice(0, pops.length - 80);
      },
      focus(d, i, z) { if (i === undefined || i === null) { const [c, r] = C.centers[d]; focusTile(c, r, z || Math.max(0.6, cam.z)); } else { const lot = C.lots[d][i]; focusTile(lot.c + lot.w / 2, lot.r + lot.w / 2, z || Math.max(0.9, cam.z)); } },
      focusTile(c, r, z) { focusTile(c, r, z || Math.max(0.6, cam.z)); },
      focusIncident(x) { const p = incidentPlace(x); if (p) focusTile(p[0], p[1], Math.max(0.6, Math.min(1, cam.z))); },
      zoomBy(f) { const i = BUCKETS.indexOf(snapZ(cam.z)); cam.tx = cam.x; cam.ty = cam.y; cam.tz = BUCKETS[Math.max(0, Math.min(BUCKETS.length - 1, i + (f > 1 ? 1 : -1)))]; },
      whole() { const fit = Math.min(W / (2 * N * HW + 60), H / (2 * N * HH + 160)); cam.tx = 0; cam.ty = N * HH - 20; cam.tz = BUCKETS.filter((b) => b <= Math.max(fit, ZMIN)).pop() || ZMIN; },
      badgeOf(d, i) { const b = badgeHits.find((x) => x.d === d && x.i === i); return b ? [b.x, b.y] : null; },
      screenOfLot(d, i) { const lot = C.lots[d][i]; return toScreen((lot.c - lot.r) * HW, (lot.c + lot.r) * HH + lot.w * HH); },
      screenOfTile(c, r) { return toScreen((c - r) * HW, (c + r + 1) * HH); },
      hitAt: hitAt, cam: cam, stats: stats,
      memory() { let px = 0; chunks.forEach((c) => { if (c.cv) px += c.cv.width * c.cv.height; }); const sp = sprites.size(); return { chunks: chunks.size, chunkMB: Math.round(px * 4 / 1048576), sprites: sp.n, spriteMB: Math.round(sp.px * 4 / 1048576) }; },
      get pops() { return pops.length; }, get agents() { return agents.cars.length + agents.peds.length + agents.cust.length; }, get city() { return cityId; }, get season() { return lookKey; },
      fx: fx, resize: resize
    };
    function defaultZoom() { return W < 600 ? 0.8 : 1; }
    resize();
    return api;
  };
})(typeof window !== 'undefined' ? window : globalThis);
