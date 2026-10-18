/* map.js — Tycoon Town's living city: the whole map of city.js (window.TYCITY) drawn in 2.5D (isometric) on one
   canvas. Ground, water, roads and fields are painted into cached chunks; trees, buildings and landmarks are
   sprites painted once per zoom level; cars, buses, people, customers, boats, a train and planes move on top;
   money pops up over each business every hour; the light follows the time of day and the trees the season.
   TYMap.create(canvas, opts) returns the map. The page tells it the game (setGame), the clock (setClock), and
   gets taps back (opts.onTap). Drag to move, pinch or wheel to zoom. */
(function (root) {
  'use strict';
  const C = root.TYCITY; if (!C) return;
  const K = C.K, N = C.N, HW = 32, HH = 16, hash = C.hash;
  const TYMap = root.TYMap = {};
  const DIST_I = { market: 0, high: 1, downtown: 2, skyline: 3 };

  /* ---------- colours ---------- */
  const rgbOf = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  function shade(h, f) {   // f > 0 towards white, f < 0 towards black
    const [r, g, b] = rgbOf(h), k = f < 0 ? 0 : 255, t = Math.abs(f);
    return '#' + [r, g, b].map((x) => Math.round(x + (k - x) * t).toString(16).padStart(2, '0')).join('');
  }
  const pick = (arr, v) => arr[Math.abs(v | 0) % arr.length];
  const WALLS = ['#f6ecd8', '#f5d7c3', '#d9ecdf', '#dde8f4', '#f7e4ac', '#e8dcf2', '#f3c9b9', '#ece6da', '#cfe4ea', '#fbe0e0'];
  const ROOFS = ['#d9846a', '#c96e5a', '#8fa0b6', '#6f8098', '#b07a5c', '#7fae6d', '#5f7189', '#e0a15e'];
  const BRICK = ['#d08b6a', '#c97f63', '#b9735c', '#dba07e'];
  const GLASS = ['#a6cde9', '#9ed3d6', '#b4c6ea', '#8fbfdf', '#a9dbe8', '#c3d4f0'];
  const AWN = ['#e86f62', '#5aa6dd', '#6cc08f', '#f2c14e', '#b07fd8', '#f08aa8', '#4fb3b0'];
  const SEASONS = {   // tree crowns: dark, mid, light
    spring: [['#62a84a', '#86cc5c', '#b3e48a'], ['#d9789a', '#f2a7c0', '#fbd3e1'], ['#5f9f47', '#7fc257', '#a9dc80']],
    summer: [['#4a9440', '#68bb4b', '#93d76a'], ['#3f8a45', '#5aae4e', '#86cd6c'], ['#56a046', '#78c456', '#a2dd7b']],
    autumn: [['#c96d32', '#eb9446', '#f7bf7c'], ['#c9a12c', '#e8c24c', '#f5dd8a'], ['#b6483a', '#db6a52', '#ee9a82'], ['#5f9a45', '#7fb957', '#a8d27c']],
    winter: [['#7f8f6e', '#9cab88', '#c0cdb0'], ['#8a8f80', '#a7ad9d', '#c9cebf']]
  };
  const GRASS = { spring: '#b9dd8b', summer: '#b3d985', autumn: '#c6d58a', winter: '#cfdcbd' };
  const seasonOf = (cal) => (cal >= 2 && cal <= 4 ? 'spring' : cal >= 5 && cal <= 7 ? 'summer' : cal >= 8 && cal <= 10 ? 'autumn' : 'winter');

  /* ---------- drawing kit: world units (a tile is 64 x 32); P(c, r, z) is a point c, r tiles from the anchor, z up ---------- */
  const P = (c, r, z) => [(c - r) * HW, (c + r) * HH - (z || 0)];
  function poly(g, pts, fill) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fillStyle = fill; g.fill(); }
  function line(g, pts, stroke, w) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.strokeStyle = stroke; g.lineWidth = w || 1; g.stroke(); }
  function circle(g, x, y, rad, fill) { g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
  function ellipse(g, x, y, rx, ry, fill) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
  const diamond = (c, r, w, d, z) => [P(c, r, z), P(c + w, r, z), P(c + w, r + d, z), P(c, r + d, z)];
  // a box: left face = the +r side (in the light), right face = the +c side (in shade)
  function box(g, c, r, w, d, z, h, top, left, right) {
    poly(g, [P(c, r + d, z), P(c + w, r + d, z), P(c + w, r + d, z + h), P(c, r + d, z + h)], left);
    poly(g, [P(c + w, r + d, z), P(c + w, r, z), P(c + w, r, z + h), P(c + w, r + d, z + h)], right);
    poly(g, diamond(c, r, w, d, z + h), top);
  }
  const boxC = (g, c, r, w, d, z, h, col, top) => box(g, c, r, w, d, z, h, top || shade(col, 0.14), col, shade(col, -0.17));
  const onL = (c, r, w, d, z, h, u0, u1, v0, v1) => [P(c + u0 * w, r + d, z + v0 * h), P(c + u1 * w, r + d, z + v0 * h), P(c + u1 * w, r + d, z + v1 * h), P(c + u0 * w, r + d, z + v1 * h)];
  const onR = (c, r, w, d, z, h, u0, u1, v0, v1) => [P(c + w, r + d - u0 * d, z + v0 * h), P(c + w, r + d - u1 * d, z + v0 * h), P(c + w, r + d - u1 * d, z + v1 * h), P(c + w, r + d - u0 * d, z + v1 * h)];
  function windows(g, c, r, w, d, z, h, floors, nl, nr, colL, colR, fw, fh) {
    fw = fw || 0.5; fh = fh || 0.5;
    for (let f = 0; f < floors; f++) {
      const v0 = (f + 0.5 - fh / 2) / floors, v1 = (f + 0.5 + fh / 2) / floors;
      for (let k = 0; k < nl; k++) poly(g, onL(c, r, w, d, z, h, (k + 0.5 - fw / 2) / nl, (k + 0.5 + fw / 2) / nl, v0, v1), colL);
      for (let k = 0; k < nr; k++) poly(g, onR(c, r, w, d, z, h, (k + 0.5 - fw / 2) / nr, (k + 0.5 + fw / 2) / nr, v0, v1), colR);
    }
  }
  // a glass curtain wall: tinted faces, floor lines and a sky reflection
  function glassBox(g, c, r, w, d, z, h, glass, floors, frame) {
    box(g, c, r, w, d, z, h, shade(glass, 0.25), shade(glass, 0.08), shade(glass, -0.18));
    const fl = frame || 'rgba(255,255,255,.55)', step = h / floors;
    for (let f = 1; f < floors; f++) {
      line(g, [P(c, r + d, z + f * step), P(c + w, r + d, z + f * step), P(c + w, r, z + f * step)], fl, 0.7);
    }
    const cols = Math.max(2, Math.round(w * 3));
    for (let k = 1; k < cols; k++) line(g, [P(c + k * w / cols, r + d, z), P(c + k * w / cols, r + d, z + h)], 'rgba(255,255,255,.28)', 0.6);
    const rows = Math.max(2, Math.round(d * 3));
    for (let k = 1; k < rows; k++) line(g, [P(c + w, r + k * d / rows, z), P(c + w, r + k * d / rows, z + h)], 'rgba(255,255,255,.18)', 0.6);
    // a soft diagonal reflection on the lit face
    g.save(); g.beginPath(); const fpts = onL(c, r, w, d, z, h, 0, 1, 0, 1); g.moveTo(...fpts[0]); fpts.slice(1).forEach((p) => g.lineTo(...p)); g.closePath(); g.clip();
    const a = P(c + w * 0.15, r + d, z + h), b = P(c + w * 0.6, r + d, z);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(a[0] + 10, a[1]); g.lineTo(b[0] + 10, b[1]); g.lineTo(b[0], b[1]); g.closePath(); g.fillStyle = 'rgba(255,255,255,.22)'; g.fill();
    g.restore();
    poly(g, diamond(c, r, w, d, z + h), shade(glass, 0.35));
  }
  // pitched roofs: the ridge runs along c ('c') or along r ('r')
  function roof(g, c, r, w, d, z, rise, col, along) {
    const lit = shade(col, 0.08), dark = shade(col, -0.2), side = shade(col, -0.32);
    if (along === 'c') {
      const a = P(c, r + d / 2, z + rise), b = P(c + w, r + d / 2, z + rise);
      poly(g, [P(c, r, z), P(c + w, r, z), b, a], dark);                         // the far slope
      poly(g, [P(c + w, r + d, z), P(c + w, r, z), b], side);                    // gable end
      poly(g, [P(c, r + d, z), P(c + w, r + d, z), b, a], lit);                  // the near slope
      line(g, [a, b], shade(col, 0.3), 0.8);
    } else {
      const a = P(c + w / 2, r, z + rise), b = P(c + w / 2, r + d, z + rise);
      poly(g, [P(c, r, z), P(c, r + d, z), b, a], shade(col, 0.15));             // the far slope (towards -c)
      poly(g, [P(c, r + d, z), P(c + w, r + d, z), b], shade(col, -0.05));       // gable end on the lit side
      poly(g, [P(c + w, r + d, z), P(c + w, r, z), a, b], dark);                 // the near slope (towards +c)
      line(g, [a, b], shade(col, 0.3), 0.8);
    }
  }
  function pyramid(g, c, r, w, d, z, rise, col) {
    const apex = P(c + w / 2, r + d / 2, z + rise);
    poly(g, [P(c, r, z), P(c + w, r, z), apex], shade(col, -0.25));
    poly(g, [P(c, r, z), P(c, r + d, z), apex], shade(col, 0.12));
    poly(g, [P(c, r + d, z), P(c + w, r + d, z), apex], shade(col, 0.02));
    poly(g, [P(c + w, r + d, z), P(c + w, r, z), apex], shade(col, -0.18));
  }
  function awning(g, c, r, w, d, z, face, col, depth) {   // a striped awning over the street-side face
    depth = depth || 0.22; const n = 5;
    for (let k = 0; k < n; k++) {
      const u0 = k / n, u1 = (k + 1) / n, cl = k % 2 ? '#fdf8ef' : col;
      if (face === 'L') poly(g, [P(c + u0 * w, r + d, z), P(c + u1 * w, r + d, z), P(c + u1 * w, r + d + depth, z - 6), P(c + u0 * w, r + d + depth, z - 6)], cl);
      else poly(g, [P(c + w, r + d - u0 * d, z), P(c + w, r + d - u1 * d, z), P(c + w + depth, r + d - u1 * d, z - 6), P(c + w + depth, r + d - u0 * d, z - 6)], k % 2 ? '#efe7d8' : shade(col, -0.12));
    }
  }
  function door(g, c, r, w, d, face, col, u) {
    u = u === undefined ? 0.5 : u;
    if (face === 'L') poly(g, onL(c, r, w, d, 0, 14, u - 0.09 / w, u + 0.09 / w, 0, 1), col);
    else poly(g, onR(c, r, w, d, 0, 14, u - 0.09 / d, u + 0.09 / d, 0, 1), col);
  }
  function shadowBox(g, c, r, w, d, h) {   // the shadow a box throws to the right
    const k = Math.min(1.2, h / 70);
    poly(g, [P(c + w, r, 0), P(c + w + k, r - k * 0.35, 0), P(c + w + k, r + d - k * 0.35, 0), P(c + w, r + d, 0)], 'rgba(40,60,40,.16)');
  }
  function pad(g, c, r, w, d, col, edge) {   // what the lot's ground is: paving, a garden...
    poly(g, diamond(c + 0.04, r + 0.04, w - 0.08, d - 0.08, 0), col);
    if (edge) line(g, [P(c + 0.04, r + 0.04), P(c + w - 0.04, r + 0.04), P(c + w - 0.04, r + d - 0.04), P(c + 0.04, r + d - 0.04), P(c + 0.04, r + 0.04)], edge, 0.8);
  }

  /* ---------- trees and small things (anchor = the base point) ---------- */
  function crown(g, x, y, rad, cols) {
    circle(g, x + rad * 0.18, y + rad * 0.15, rad, cols[0]);
    circle(g, x - rad * 0.06, y - rad * 0.05, rad * 0.9, cols[1]);
    circle(g, x - rad * 0.36, y - rad * 0.36, rad * 0.45, cols[2]);
  }
  function drawTree(g, v, s, season, fruit) {
    const sets = SEASONS[season], cols = pick(sets, v * 7 + 3), k = s || 1;
    ellipse(g, 7 * k, 1, 13 * k, 5 * k, 'rgba(50,80,40,.2)');
    g.fillStyle = '#8a6646'; g.fillRect(-1.6 * k, -11 * k, 3.2 * k, 11 * k);
    const big = (v % 5) === 0;
    if (big) { crown(g, -5 * k, -17 * k, 8 * k, cols); crown(g, 5 * k, -16 * k, 7.5 * k, cols); crown(g, 0, -24 * k, 8.5 * k, cols); }
    else crown(g, 0, -19 * k, 10 * k, cols);
    if (season === 'winter' && v % 3 === 0) { circle(g, -3 * k, -27 * k, 4 * k, 'rgba(255,255,255,.75)'); }
    if (fruit && season !== 'winter') for (let i = 0; i < 6; i++) circle(g, (hash(v, i, 1) - 0.5) * 14 * k, -19 * k + (hash(v, i, 2) - 0.5) * 12 * k, 1.4 * k, season === 'autumn' ? '#e8562f' : '#f5c33b');
  }
  function drawPine(g, v, s, season) {
    const k = s || 1, dark = '#3c8649', light = '#5aa661';
    ellipse(g, 6 * k, 1, 10 * k, 4 * k, 'rgba(40,70,40,.22)');
    g.fillStyle = '#7a5a3e'; g.fillRect(-1.3 * k, -6 * k, 2.6 * k, 6 * k);
    for (let i = 0; i < 3; i++) {
      const y0 = -5 * k - i * 8 * k, wd = (10 - i * 2.6) * k, ht = 13 * k;
      poly(g, [[0, y0 - ht], [wd, y0], [0, y0 + 1.5 * k]], dark);
      poly(g, [[0, y0 - ht], [-wd, y0], [0, y0 + 1.5 * k]], light);
      if (season === 'winter') poly(g, [[0, y0 - ht], [wd * 0.4, y0 - ht * 0.55], [-wd * 0.4, y0 - ht * 0.55]], 'rgba(255,255,255,.85)');
    }
  }
  function drawPoplar(g, v, s, season) {
    const k = s || 1, cols = pick(SEASONS[season], v);
    ellipse(g, 6 * k, 1, 9 * k, 3.5 * k, 'rgba(50,80,40,.2)');
    g.fillStyle = '#7a5a3e'; g.fillRect(-1.2 * k, -8 * k, 2.4 * k, 8 * k);
    ellipse(g, 1 * k, -24 * k, 6.5 * k, 18 * k, cols[0]);
    ellipse(g, -0.6 * k, -25 * k, 5.6 * k, 17 * k, cols[1]);
    ellipse(g, -2.2 * k, -30 * k, 2.6 * k, 9 * k, cols[2]);
  }
  function drawPalm(g) {
    ellipse(g, 8, 1, 11, 4, 'rgba(60,70,40,.2)');
    g.beginPath(); g.moveTo(-1, 0); g.quadraticCurveTo(-4, -14, 2, -28); g.lineWidth = 3; g.strokeStyle = '#9b7652'; g.stroke();
    const tx = 2, ty = -28;
    [[-16, -4], [-10, -12], [0, -14], [12, -10], [16, -2], [7, 4], [-8, 4]].forEach(([dx, dy], i) => {
      g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + dx * 0.5, ty + dy - 6, tx + dx, ty + dy + 4); g.lineWidth = 3.2; g.strokeStyle = i % 2 ? '#4f9a44' : '#6dba55'; g.stroke();
    });
    circle(g, tx, ty + 1, 2, '#7a5536');
  }
  function drawBush(g, v, season) {
    const cols = pick(SEASONS[season === 'autumn' ? 'summer' : season], v);
    ellipse(g, 4, 1, 9, 3.5, 'rgba(50,80,40,.18)');
    circle(g, -3, -4, 5, cols[0]); circle(g, 3, -4, 5.5, cols[0]); circle(g, -1, -6, 5, cols[1]); circle(g, -3, -8, 2.4, cols[2]);
    if (season !== 'winter' && v % 3 === 0) for (let i = 0; i < 4; i++) circle(g, -5 + i * 3, -6 - (i % 2) * 2, 1.2, pick(['#f6d34a', '#f48fb1', '#ffffff'], v + i));
  }
  function drawLamp(g) {
    g.fillStyle = '#5b6170'; g.fillRect(-0.8, -20, 1.6, 20);
    g.fillRect(-0.8, -20, 5, 1.4); circle(g, 4.5, -18.5, 1.8, '#fff6d6');
  }
  function drawBench(g, v) {
    const a = v % 2 ? 'c' : 'r';
    if (a === 'c') { box(g, -0.22, -0.06, 0.44, 0.12, 0, 3, '#c79a62', '#a97c49', '#8a643b'); }
    else { box(g, -0.06, -0.22, 0.12, 0.44, 0, 3, '#c79a62', '#a97c49', '#8a643b'); }
  }

  /* ---------- buildings that stand on a lot (anchor = the lot's top corner) ---------- */
  // the neighbours' buildings, by district and look
  function npcBuilding(g, d, look, w, face) {
    const v = look, wall = pick(WALLS, v * 3 + 1), rf = pick(ROOFS, v * 5 + 2), fl = face === 'S' || face === 'W' ? 'L' : 'R';
    const win = '#7fa6c9', winD = '#6b8fb2';
    if (d === 'market') {
      const st = v % 6;
      if (st <= 2) {          // a house with a garden
        pad(g, 0, 0, 1, 1, '#a9d47c');
        const h = st === 2 ? 26 : 16, along = v % 2 ? 'c' : 'r';
        shadowBox(g, 0.18, 0.18, 0.64, 0.64, h + 12);
        boxC(g, 0.18, 0.18, 0.64, 0.64, 0, h, wall);
        windows(g, 0.18, 0.18, 0.64, 0.64, 0, h, st === 2 ? 2 : 1, 2, 2, win, winD, 0.42, 0.42);
        door(g, 0.18, 0.18, 0.64, 0.64, fl, shade(rf, -0.25), 0.3);
        roof(g, 0.12, 0.12, 0.76, 0.76, h, 14, rf, along);
        if (v % 4 === 1) box(g, 0.62, 0.3, 0.08, 0.08, h + 6, 10, '#a85d48', '#b8684f', '#94503e');   // a chimney
        if (v % 3 === 0) { [[0.1, 0.92], [0.5, 0.92], [0.9, 0.92]].forEach(([c, r]) => { const p = P(c, r); circle(g, p[0], p[1] - 3, 3, '#7cc25a'); }); }
      } else if (st === 3) {  // a terrace of small houses
        pad(g, 0, 0, 1, 1, '#d9e9c4');
        shadowBox(g, 0.1, 0.25, 0.8, 0.5, 30);
        boxC(g, 0.1, 0.25, 0.8, 0.5, 0, 22, pick(BRICK, v));
        windows(g, 0.1, 0.25, 0.8, 0.5, 0, 22, 2, 3, 1, '#f3efe6', '#e4ddd0', 0.36, 0.45);
        roof(g, 0.06, 0.21, 0.88, 0.58, 22, 10, rf, 'c');
      } else if (st === 4) {  // a corner shop
        pad(g, 0, 0, 1, 1, '#ece4d3');
        shadowBox(g, 0.15, 0.15, 0.7, 0.7, 26);
        boxC(g, 0.15, 0.15, 0.7, 0.7, 0, 22, wall);
        windows(g, 0.15, 0.15, 0.7, 0.7, 11, 11, 1, 2, 2, win, winD, 0.4, 0.5);
        if (fl === 'L') poly(g, onL(0.15, 0.15, 0.7, 0.7, 0, 9, 0.1, 0.9, 0.05, 0.95), '#bfe0f0'); else poly(g, onR(0.15, 0.15, 0.7, 0.7, 0, 9, 0.1, 0.9, 0.05, 0.95), '#a9cde0');
        awning(g, 0.15, 0.15, 0.7, 0.7, 10, fl, pick(AWN, v));
        poly(g, diamond(0.15, 0.15, 0.7, 0.7, 22), shade(wall, -0.06));
      } else {                // a bungalow
        pad(g, 0, 0, 1, 1, '#a9d47c');
        shadowBox(g, 0.12, 0.2, 0.76, 0.6, 18);
        boxC(g, 0.12, 0.2, 0.76, 0.6, 0, 12, wall);
        windows(g, 0.12, 0.2, 0.76, 0.6, 0, 12, 1, 3, 2, win, winD, 0.35, 0.45);
        pyramid(g, 0.08, 0.16, 0.84, 0.68, 12, 13, rf);
      }
      return;
    }
    if (d === 'high') {
      const st = v % 5, floors = st === 4 ? 4 : 2 + (v % 2), h = floors * 11;
      pad(g, 0, 0, 1, 1, '#ece4d3');
      shadowBox(g, 0.1, 0.1, 0.8, 0.8, h);
      if (st === 3) {         // a townhouse with a pointed roof
        boxC(g, 0.12, 0.12, 0.76, 0.76, 0, h, wall);
        windows(g, 0.12, 0.12, 0.76, 0.76, 0, h, floors, 2, 2, win, winD, 0.38, 0.5);
        roof(g, 0.08, 0.08, 0.84, 0.84, h, 16, rf, v % 2 ? 'c' : 'r');
        door(g, 0.12, 0.12, 0.76, 0.76, fl, '#5d4a3a');
        return;
      }
      const col = st === 2 ? pick(BRICK, v) : wall;
      boxC(g, 0.1, 0.1, 0.8, 0.8, 0, h, col);
      windows(g, 0.1, 0.1, 0.8, 0.8, 11, h - 11, floors - 1, 3, 3, '#f7f3ea', '#e6e0d3', 0.34, 0.5);
      windows(g, 0.1, 0.1, 0.8, 0.8, 11, h - 11, floors - 1, 3, 3, win, winD, 0.24, 0.38);
      if (fl === 'L') poly(g, onL(0.1, 0.1, 0.8, 0.8, 0, 10, 0.06, 0.94, 0.06, 0.92), st === 1 ? '#f4d9a7' : '#bfe0f0');
      else poly(g, onR(0.1, 0.1, 0.8, 0.8, 0, 10, 0.06, 0.94, 0.06, 0.92), st === 1 ? '#e6c690' : '#a9cde0');
      awning(g, 0.1, 0.1, 0.8, 0.8, 10.5, fl, pick(AWN, v * 3));
      poly(g, diamond(0.1, 0.1, 0.8, 0.8, h), shade(col, -0.08));
      line(g, [P(0.1, 0.9, h), P(0.9, 0.9, h), P(0.9, 0.1, h)], shade(col, 0.35), 1.2);
      if (st === 1) { const p = P(0.5, 0.5, h); for (let i = 0; i < 3; i++) circle(g, p[0] - 8 + i * 8, p[1] + 2, 2.4, '#7cc25a'); }   // a roof garden
      return;
    }
    if (d === 'downtown') {
      const st = v % 5, floors = 5 + (v % 6), h = floors * 9;
      pad(g, 0, 0, 1, 1, '#e4e1da');
      shadowBox(g, 0.12, 0.12, 0.76, 0.76, h);
      if (st <= 1) {          // offices in glass
        glassBox(g, 0.12, 0.12, 0.76, 0.76, 0, h, pick(GLASS, v), floors);
        box(g, 0.3, 0.3, 0.3, 0.3, h, 5, '#d8dde3', '#c3c9d1', '#aab1bb');
      } else if (st === 2) {  // flats with balconies
        const col = pick(['#efe6d6', '#e9d7c6', '#dfe7ea', '#f1e2c7'], v);
        boxC(g, 0.12, 0.12, 0.76, 0.76, 0, h, col);
        windows(g, 0.12, 0.12, 0.76, 0.76, 0, h, floors, 3, 3, win, winD, 0.42, 0.45);
        for (let f = 1; f < floors; f++) line(g, [P(0.12, 0.88, f * 9 - 2), P(0.88, 0.88, f * 9 - 2), P(0.88, 0.12, f * 9 - 2)], 'rgba(255,255,255,.8)', 1.4);
        poly(g, diamond(0.12, 0.12, 0.76, 0.76, h), shade(col, -0.1));
      } else if (st === 3) {  // a stone office block
        const col = pick(['#e8dfcf', '#d9d4cb', '#eadfcd'], v);
        boxC(g, 0.12, 0.12, 0.76, 0.76, 0, h, col);
        windows(g, 0.12, 0.12, 0.76, 0.76, 0, h, floors, 4, 4, '#8fb1cf', '#7a9bb8', 0.55, 0.55);
        poly(g, diamond(0.12, 0.12, 0.76, 0.76, h), shade(col, -0.08));
        box(g, 0.22, 0.22, 0.2, 0.2, h, 6, '#c8cdd4', '#b5bbc4', '#a0a7b1');
      } else {                // a hotel with a sign on the roof
        const col = pick(['#f2e1cf', '#e6eef3'], v);
        boxC(g, 0.14, 0.14, 0.72, 0.72, 0, h, col);
        windows(g, 0.14, 0.14, 0.72, 0.72, 0, h, floors, 3, 3, '#f5d58d', '#e1c07a', 0.45, 0.45);
        poly(g, diamond(0.14, 0.14, 0.72, 0.72, h), shade(col, -0.08));
        poly(g, onL(0.3, 0.3, 0.4, 0.4, h, 10, 0, 1, 0, 1), pick(AWN, v));
      }
      return;
    }
    // Skyline & Harbour: 2 x 2 lots
    const ind = face === 'X';
    const st = v % 5, floors = 14 + (v % 15), h = floors * 8;
    pad(g, 0, 0, 2, 2, '#e3e0d8');
    if (ind) {                // warehouses by the port
      shadowBox(g, 0.15, 0.2, 1.7, 1.5, 34);
      boxC(g, 0.15, 0.2, 1.7, 1.5, 0, 26, pick(['#d7dde2', '#cfd8cf', '#e2d8c9'], v));
      roof(g, 0.12, 0.17, 1.76, 1.56, 26, 10, pick(['#8fa0b6', '#7c93a7', '#a9b5c2'], v), 'c');
      poly(g, onL(0.15, 0.2, 1.7, 1.5, 0, 26, 0.1, 0.35, 0, 0.6), '#9aa6b2'); poly(g, onL(0.15, 0.2, 1.7, 1.5, 0, 26, 0.55, 0.8, 0, 0.6), '#9aa6b2');
      return;
    }
    shadowBox(g, 0.3, 0.3, 1.4, 1.4, h);
    if (st === 0 || st === 3) {   // a tall glass tower
      glassBox(g, 0.35, 0.35, 1.3, 1.3, 0, h, pick(GLASS, v), floors);
      if (st === 3) { glassBox(g, 0.6, 0.6, 0.8, 0.8, h, 40, pick(GLASS, v + 2), 5); line(g, [P(1, 1, h + 40), P(1, 1, h + 70)], '#9aa3ad', 2); }
    } else if (st === 1) {        // twin towers
      glassBox(g, 0.25, 0.25, 0.7, 0.7, 0, h, pick(GLASS, v), floors);
      glassBox(g, 1.05, 1.05, 0.7, 0.7, 0, h * 0.8, pick(GLASS, v + 1), Math.round(floors * 0.8));
    } else if (st === 2) {        // a stepped tower
      glassBox(g, 0.25, 0.25, 1.5, 1.5, 0, h * 0.45, pick(GLASS, v), Math.round(floors * 0.45));
      glassBox(g, 0.45, 0.45, 1.1, 1.1, h * 0.45, h * 0.35, pick(GLASS, v + 1), Math.round(floors * 0.35));
      glassBox(g, 0.65, 0.65, 0.7, 0.7, h * 0.8, h * 0.25, pick(GLASS, v + 2), Math.round(floors * 0.25));
    } else {                      // stone and glass headquarters
      const col = pick(['#e7dccb', '#dcd5ca'], v);
      boxC(g, 0.25, 0.25, 1.5, 1.5, 0, 30, col);
      windows(g, 0.25, 0.25, 1.5, 1.5, 0, 30, 3, 8, 8, '#8fb1cf', '#7a9bb8', 0.5, 0.5);
      glassBox(g, 0.5, 0.5, 1, 1, 30, h - 30, pick(GLASS, v), floors - 3);
      circle(g, P(1, 1, h + 6)[0], P(1, 1, h + 6)[1], 4, '#f2c14e');
    }
  }
  // a building site: a fence, scaffolding and a crane
  function siteBuilding(g, w, left) {
    pad(g, 0, 0, w, w, '#d8c7a6');
    const h = (w > 1 ? 70 : 22) * (left > 1 ? 0.4 : 0.8);
    box(g, 0.2 * w, 0.2 * w, 0.6 * w, 0.6 * w, 0, h, '#c9c2b6', '#b7aea0', '#a39a8c');
    for (let f = 1; f * 8 < h; f++) line(g, [P(0.2 * w, 0.8 * w, f * 8), P(0.8 * w, 0.8 * w, f * 8), P(0.8 * w, 0.2 * w, f * 8)], '#e2a526', 1);
    const m = P(0.85 * w, 0.85 * w), top = h + (w > 1 ? 60 : 34);
    line(g, [m, [m[0], m[1] - top]], '#f2b632', 2.2);
    line(g, [[m[0] - 30 * w * 0.5, m[1] - top], [m[0] + 14, m[1] - top]], '#f2b632', 2);
    line(g, [[m[0] - 20 * w * 0.5, m[1] - top], [m[0] - 20 * w * 0.5, m[1] - top + 18]], '#6b6b6b', 0.8);
    [[0, 0], [w, 0], [w, w], [0, w]].reduce((a, b) => { line(g, [P(a[0], a[1], 0), P(b[0], b[1], 0)], '#f08a3c', 1.2); return b; }, [0, w]);
  }
  function saleSign(g, own, color) {
    pad(g, 0, 0, 1, 1, own ? '#dfeec9' : '#cfe6b0');
    if (own) {
      [[0.06, 0.06], [0.94, 0.06], [0.94, 0.94], [0.06, 0.94], [0.06, 0.06]].reduce((a, b) => { line(g, [P(a[0], a[1], 3), P(b[0], b[1], 3)], '#c4995d', 1.4); return b; });
      const p = P(0.5, 0.5); line(g, [p, [p[0], p[1] - 26]], '#6b6b6b', 1.4); poly(g, [[p[0], p[1] - 26], [p[0] + 13, p[1] - 22], [p[0], p[1] - 18]], color || '#f2c14e');
      return;
    }
    const p = P(0.5, 0.62);
    line(g, [p, [p[0], p[1] - 14]], '#8a6646', 1.6);
    g.fillStyle = '#ffffff'; g.fillRect(p[0] - 9, p[1] - 22, 18, 10); g.strokeStyle = '#d9534a'; g.lineWidth = 1.2; g.strokeRect(p[0] - 9, p[1] - 22, 18, 10);
    g.fillStyle = '#d9534a'; g.font = '700 6.2px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SALE', p[0], p[1] - 16.6);
  }

  /* ---------- the company's businesses (and rivals: the same buildings in other colours) ---------- */
  const BIZ_STYLE = {
    lemonade: ['stand', '#f7d24a'], dogwalk: ['kennel', '#c98f5a'], thrift: ['tent', '#e98bb0'], cupcake: ['kiosk', '#f39ab8'], party: ['tent', '#9b7ee0'],
    carwash: ['carwash', '#4fa6e0'], flowers: ['stand', '#5bbf7a'], bikefix: ['garage', '#e2803e'], phonecase: ['kiosk', '#5aa6dd'], bubbletea: ['kiosk', '#b07fd8'],
    tutoring: ['shop', '#5a8fd8'], barber: ['shop', '#e05a5a'], icecream: ['shop', '#f2a0c0'], bakery: ['shop', '#d9944a'], petshop: ['shop', '#3fb0a8'],
    printshop: ['shop', '#6f7fa0'], foodtruck: ['truck', '#f0b03c'], laundry: ['shop', '#7ab8e8'], gym: ['shop3', '#555e7a'], flats: ['flats', '#e9cfae'],
    appstudio: ['glass', '#8fc6f0'], restaurant: ['shop3', '#c0503e'], scooters: ['hub', '#3fc08a'], delivery: ['depot', '#f08a3c'], supermarket: ['market', '#42a35a'],
    vfarm: ['vfarm', '#7cc25a'], cinema: ['cinema', '#9b4fd0'], toyfactory: ['factory', '#f2c14e'], hotel: ['tower', '#f2e1cf'], office: ['tower2', '#a9cbe8'],
    solar: ['solar', '#3a6fb0'], ebus: ['busdepot', '#3fb07a'], mall: ['mall', '#e98bb0'], datacentre: ['datacentre', '#5a6c8c'], themepark: ['themepark', '#f25a7a'],
    football: ['stadium', '#3f7fd0'], port: ['port', '#e2803e'], skyscraper: ['supertower', '#7fb8e0'], airline: ['airhangar', '#5aa6dd'], space: ['launchpad', '#e8ecf2']
  };
  function bizBuilding(g, id, w, face, accent, rival) {
    const st = BIZ_STYLE[id] || ['shop', '#f2c14e'], col = rival ? shade(accent, -0.15) : accent, fl = face === 'S' || face === 'W' ? 'L' : 'R';
    const s = st[0];
    if (s === 'stand' || s === 'kiosk' || s === 'tent' || s === 'kennel' || s === 'garage' || s === 'carwash') {
      pad(g, 0, 0, 1, 1, '#f1e8d6', 'rgba(0,0,0,.06)');
      if (s === 'stand') {
        box(g, 0.32, 0.32, 0.36, 0.3, 0, 9, '#e9cfa4', '#d9b98a', '#c4a476');
        [[0.33, 0.33], [0.67, 0.33], [0.67, 0.62], [0.33, 0.62]].forEach(([c, r]) => line(g, [P(c, r, 9), P(c, r, 20)], '#9b7652', 1.2));
        roof(g, 0.26, 0.26, 0.48, 0.42, 20, 6, col, 'c');
        awning(g, 0.32, 0.32, 0.36, 0.3, 19, fl, col, 0.12);
      } else if (s === 'kiosk') {
        shadowBox(g, 0.3, 0.3, 0.4, 0.4, 22);
        box(g, 0.3, 0.3, 0.4, 0.4, 0, 18, shade(col, 0.3), shade(col, 0.15), shade(col, -0.1));
        if (fl === 'L') poly(g, onL(0.3, 0.3, 0.4, 0.4, 0, 18, 0.1, 0.9, 0.35, 0.85), '#e8f6ff'); else poly(g, onR(0.3, 0.3, 0.4, 0.4, 0, 18, 0.1, 0.9, 0.35, 0.85), '#d7ecf8');
        pyramid(g, 0.26, 0.26, 0.48, 0.48, 18, 9, col);
      } else if (s === 'tent') {
        pyramid(g, 0.22, 0.22, 0.56, 0.56, 10, 18, col);
        box(g, 0.24, 0.24, 0.52, 0.52, 0, 10, shade(col, 0.4), shade(col, 0.3), shade(col, 0.05));
        if (id === 'party') { const p = P(0.5, 0.5, 30); ['#f25a7a', '#f2c14e', '#5aa6dd'].forEach((b, i) => { line(g, [[p[0], p[1]], [p[0] - 8 + i * 8, p[1] - 12]], '#888', 0.6); circle(g, p[0] - 8 + i * 8, p[1] - 15, 3.6, b); }); }
      } else if (s === 'kennel') {
        [[0.08, 0.08], [0.92, 0.08], [0.92, 0.92], [0.08, 0.92], [0.08, 0.08]].reduce((a, b) => { line(g, [P(a[0], a[1], 4), P(b[0], b[1], 4)], '#c4995d', 1.2); return b; });
        boxC(g, 0.2, 0.2, 0.42, 0.42, 0, 12, '#f0dcc0'); roof(g, 0.17, 0.17, 0.48, 0.48, 12, 8, col, 'r');
        const p = P(0.75, 0.75); ellipse(g, p[0], p[1] - 2, 4, 2.5, '#a0663f'); circle(g, p[0] + 3, p[1] - 5, 2.2, '#a0663f');
      } else if (s === 'garage') {
        shadowBox(g, 0.18, 0.18, 0.64, 0.6, 20);
        boxC(g, 0.18, 0.18, 0.64, 0.6, 0, 16, '#eadfcf');
        if (fl === 'L') poly(g, onL(0.18, 0.18, 0.64, 0.6, 0, 16, 0.15, 0.85, 0, 0.75), '#b9c2cc'); else poly(g, onR(0.18, 0.18, 0.64, 0.6, 0, 16, 0.15, 0.85, 0, 0.75), '#a8b1bb');
        poly(g, diamond(0.18, 0.18, 0.64, 0.6, 16), col);
        const p = P(0.8, 0.9); circle(g, p[0] - 4, p[1] - 3, 2.6, 'rgba(0,0,0,0)'); g.strokeStyle = '#444'; g.lineWidth = 0.8; g.beginPath(); g.arc(p[0] - 4, p[1] - 3, 2.6, 0, 7); g.arc(p[0] + 3, p[1] - 3, 2.6, 0, 7); g.stroke();
      } else {                // a car wash
        box(g, 0.15, 0.25, 0.7, 0.5, 0, 4, '#d9dfe6', '#c9d0d8', '#b5bdc6');
        [0.2, 0.5, 0.8].forEach((u) => { line(g, [P(0.15 + u * 0.7, 0.25, 4), P(0.15 + u * 0.7, 0.25, 22), P(0.15 + u * 0.7, 0.75, 22), P(0.15 + u * 0.7, 0.75, 4)], col, 2.2); });
        box(g, 0.35, 0.4, 0.32, 0.2, 4, 6, '#f25a5a', '#e04848', '#c23c3c');
        for (let i = 0; i < 5; i++) circle(g, P(0.3 + i * 0.1, 0.5, 18)[0], P(0.3 + i * 0.1, 0.5, 18)[1] - (i % 2) * 3, 2, 'rgba(255,255,255,.85)');
      }
      return;
    }
    if (s === 'shop' || s === 'shop3') {
      const floors = s === 'shop3' ? 4 : 2 + ((id.length) % 2), h = floors * 11, wall = rival ? '#e6e1d8' : '#fbf6ec';
      pad(g, 0, 0, 1, 1, '#ece4d3');
      shadowBox(g, 0.1, 0.1, 0.8, 0.8, h);
      boxC(g, 0.1, 0.1, 0.8, 0.8, 0, h, wall);
      windows(g, 0.1, 0.1, 0.8, 0.8, 11, h - 11, floors - 1, 3, 3, '#8fb6d6', '#7a9fbf', 0.36, 0.5);
      if (fl === 'L') poly(g, onL(0.1, 0.1, 0.8, 0.8, 0, 10.5, 0.05, 0.95, 0.04, 0.95), shade(col, 0.55)); else poly(g, onR(0.1, 0.1, 0.8, 0.8, 0, 10.5, 0.05, 0.95, 0.04, 0.95), shade(col, 0.45));
      awning(g, 0.1, 0.1, 0.8, 0.8, 11, fl, col, 0.26);
      poly(g, diamond(0.1, 0.1, 0.8, 0.8, h), shade(col, 0.2));
      line(g, [P(0.1, 0.9, h), P(0.9, 0.9, h), P(0.9, 0.1, h)], col, 2.2);
      if (id === 'barber') { const p = P(0.92, 0.95, 0); for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#e05a5a'; g.fillRect(p[0] - 1.6, p[1] - 14 + i * 2.6, 3.2, 2.6); } }
      if (id === 'icecream') { const p = P(0.5, 0.5, h); poly(g, [[p[0] - 5, p[1] - 4], [p[0] + 5, p[1] - 4], [p[0], p[1] + 8]], '#e2b36a'); circle(g, p[0], p[1] - 7, 6, '#f6b6cd'); circle(g, p[0] - 2, p[1] - 9, 2, '#fde1ea'); }
      if (id === 'restaurant') { const p = P(0.5, 0.5, h); [[-10, 0], [0, 4], [10, 0]].forEach(([dx, dy]) => { circle(g, p[0] + dx, p[1] + dy - 3, 4, '#f6f0e6'); line(g, [[p[0] + dx, p[1] + dy - 3], [p[0] + dx, p[1] + dy - 12]], '#888', 0.8); circle(g, p[0] + dx, p[1] + dy - 13, 4.5, pick(AWN, dx + 20)); }); }
      return;
    }
    if (s === 'truck') {
      pad(g, 0, 0, 1, 1, '#ece4d3');
      box(g, 0.25, 0.3, 0.5, 0.28, 2, 14, shade(col, 0.2), col, shade(col, -0.18));
      box(g, 0.75, 0.33, 0.12, 0.22, 2, 9, '#dfe7ee', '#cfd8e1', '#b9c3cd');
      poly(g, onL(0.25, 0.3, 0.5, 0.28, 2, 14, 0.15, 0.85, 0.4, 0.85), '#2f3b4f');
      [[0.3, 0.75], [0.6, 0.85]].forEach(([c, r]) => { const p = P(c, r); circle(g, p[0], p[1] - 4, 4, pick(AWN, c * 10)); line(g, [[p[0], p[1] - 4], [p[0], p[1]]], '#777', 0.8); });
      return;
    }
    if (s === 'flats') {
      const floors = 5, h = floors * 10;
      pad(g, 0, 0, 1, 1, '#cfe6b0');
      shadowBox(g, 0.12, 0.12, 0.76, 0.76, h);
      boxC(g, 0.12, 0.12, 0.76, 0.76, 0, h, rival ? '#dcd6cc' : col);
      windows(g, 0.12, 0.12, 0.76, 0.76, 0, h, floors, 3, 3, '#8fb6d6', '#7a9fbf', 0.42, 0.45);
      for (let f = 1; f < floors; f++) line(g, [P(0.12, 0.88, f * 10 - 2), P(0.88, 0.88, f * 10 - 2), P(0.88, 0.12, f * 10 - 2)], '#ffffff', 1.6);
      roof(g, 0.08, 0.08, 0.84, 0.84, h, 12, rival ? '#8fa0b6' : '#c96e5a', 'c');
      return;
    }
    if (s === 'glass' || s === 'vfarm' || s === 'tower' || s === 'tower2') {
      const floors = s === 'glass' ? 7 : s === 'vfarm' ? 9 : s === 'tower' ? 13 : 15, h = floors * 9;
      pad(g, 0, 0, 1, 1, '#e4e1da');
      shadowBox(g, 0.12, 0.12, 0.76, 0.76, h);
      if (s === 'tower') {
        boxC(g, 0.14, 0.14, 0.72, 0.72, 0, h, rival ? '#e1d9cc' : col);
        windows(g, 0.14, 0.14, 0.72, 0.72, 0, h, floors, 3, 3, '#f5d58d', '#e1c07a', 0.45, 0.45);
        poly(g, diamond(0.14, 0.14, 0.72, 0.72, h), shade(col, -0.1));
        const p = P(0.5, 0.5, h + 10); poly(g, [[p[0] - 12, p[1] - 6], [p[0] + 12, p[1] - 6], [p[0] + 12, p[1] + 4], [p[0] - 12, p[1] + 4]], rival ? '#8a8f9a' : '#c0503e');
        return;
      }
      glassBox(g, 0.12, 0.12, 0.76, 0.76, 0, h, rival ? '#b9c3cc' : col, floors);
      if (s === 'vfarm') for (let f = 0; f < floors; f++) line(g, [P(0.12, 0.88, f * 9 + 3), P(0.88, 0.88, f * 9 + 3), P(0.88, 0.12, f * 9 + 3)], '#6dbb4c', 2.2);
      if (s === 'tower2') { box(g, 0.3, 0.3, 0.4, 0.4, h, 8, '#d8dde3', '#c3c9d1', '#aab1bb'); line(g, [P(0.5, 0.5, h + 8), P(0.5, 0.5, h + 30)], '#9aa3ad', 1.6); }
      return;
    }
    if (s === 'hub' || s === 'depot' || s === 'market' || s === 'cinema' || s === 'factory') {
      pad(g, 0, 0, 1, 1, '#e4e1da');
      if (s === 'hub') {
        boxC(g, 0.15, 0.15, 0.7, 0.4, 0, 14, '#eef3f0'); poly(g, diamond(0.15, 0.15, 0.7, 0.4, 14), col);
        for (let i = 0; i < 6; i++) { const p = P(0.2 + i * 0.11, 0.75); line(g, [p, [p[0] + 2, p[1] - 6]], col, 1.6); circle(g, p[0], p[1], 1.2, '#333'); }
      } else if (s === 'depot') {
        boxC(g, 0.1, 0.12, 0.8, 0.5, 0, 18, '#e8e4dc'); roof(g, 0.08, 0.1, 0.84, 0.54, 18, 6, '#9aa6b2', 'c');
        for (let i = 0; i < 2; i++) box(g, 0.2 + i * 0.32, 0.7, 0.24, 0.16, 0, 9, '#fafafa', col, shade(col, -0.2));
      } else if (s === 'market') {
        shadowBox(g, 0.08, 0.1, 0.84, 0.8, 22);
        boxC(g, 0.08, 0.1, 0.84, 0.8, 0, 18, '#f5f1e8');
        if (fl === 'L') poly(g, onL(0.08, 0.1, 0.84, 0.8, 0, 18, 0.05, 0.95, 0.05, 0.6), '#bfe0f0'); else poly(g, onR(0.08, 0.1, 0.84, 0.8, 0, 18, 0.05, 0.95, 0.05, 0.6), '#a9cde0');
        poly(g, diamond(0.08, 0.1, 0.84, 0.8, 18), '#dfe5ea');
        if (fl === 'L') poly(g, onL(0.08, 0.1, 0.84, 0.8, 18, 8, 0.2, 0.8, 0, 1), col); else poly(g, onR(0.08, 0.1, 0.84, 0.8, 18, 8, 0.2, 0.8, 0, 1), col);
      } else if (s === 'cinema') {
        shadowBox(g, 0.1, 0.1, 0.8, 0.8, 34);
        boxC(g, 0.1, 0.1, 0.8, 0.8, 0, 32, rival ? '#7c7f90' : shade(col, -0.25));
        if (fl === 'L') { poly(g, onL(0.1, 0.1, 0.8, 0.8, 0, 32, 0.1, 0.9, 0.4, 0.7), '#fff3c4'); for (let i = 0; i < 6; i++) { const p = onL(0.1, 0.1, 0.8, 0.8, 0, 32, 0.12 + i * 0.13, 0.12 + i * 0.13, 0.75, 0.75)[0]; circle(g, p[0], p[1], 1.6, '#f2c14e'); } }
        else poly(g, onR(0.1, 0.1, 0.8, 0.8, 0, 32, 0.1, 0.9, 0.4, 0.7), '#efe2a8');
        poly(g, diamond(0.1, 0.1, 0.8, 0.8, 32), shade(col, -0.35));
      } else {                // a factory with a saw-tooth roof and a chimney
        shadowBox(g, 0.08, 0.1, 0.84, 0.8, 26);
        boxC(g, 0.08, 0.1, 0.84, 0.8, 0, 18, '#e9e1d2');
        for (let i = 0; i < 3; i++) roof(g, 0.08 + i * 0.28, 0.1, 0.28, 0.8, 18, 10, i % 2 ? '#9aa6b2' : '#b3bdc8', 'r');
        box(g, 0.72, 0.18, 0.1, 0.1, 18, 26, '#c97f63', '#b9735c', '#a3654f');
        const p = P(0.5, 0.95, 4); circle(g, p[0], p[1], 3.5, col); circle(g, p[0] - 2.6, p[1] - 3.6, 1.6, col); circle(g, p[0] + 2.6, p[1] - 3.6, 1.6, col);
      }
      return;
    }
    // Skyline & Harbour: 2 x 2 lots
    pad(g, 0, 0, 2, 2, '#e3e0d8');
    if (s === 'solar') {
      pad(g, 0, 0, 2, 2, '#c9e3a6');
      for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
        const c0 = 0.12 + c * 0.45, r0 = 0.12 + r * 0.36;
        poly(g, [P(c0, r0, 2), P(c0 + 0.38, r0, 2), P(c0 + 0.38, r0 + 0.22, 7), P(c0, r0 + 0.22, 7)], '#3d6fa8');
        line(g, [P(c0, r0 + 0.11, 4.5), P(c0 + 0.38, r0 + 0.11, 4.5)], 'rgba(255,255,255,.4)', 0.6);
      }
    } else if (s === 'busdepot') {
      boxC(g, 0.2, 0.2, 1.6, 0.8, 0, 22, '#eef3f0'); poly(g, diamond(0.2, 0.2, 1.6, 0.8, 22), '#dce6e0');
      for (let i = 0; i < 4; i++) box(g, 0.3 + i * 0.4, 1.2, 0.26, 0.6, 0, 9, shade(col, 0.2), col, shade(col, -0.2));
      for (let i = 0; i < 4; i++) { const p = P(0.43 + i * 0.4, 1.85, 0); g.fillStyle = '#4b5563'; g.fillRect(p[0] - 1, p[1] - 10, 2, 10); circle(g, p[0], p[1] - 11, 2, '#7cf2a8'); }
    } else if (s === 'mall') {
      shadowBox(g, 0.15, 0.15, 1.7, 1.7, 40);
      boxC(g, 0.15, 0.15, 1.7, 1.7, 0, 34, '#f3eee6');
      if (fl === 'L') poly(g, onL(0.15, 0.15, 1.7, 1.7, 0, 34, 0.08, 0.92, 0.05, 0.55), '#bfe0f0'); else poly(g, onR(0.15, 0.15, 1.7, 1.7, 0, 34, 0.08, 0.92, 0.05, 0.55), '#a9cde0');
      poly(g, diamond(0.15, 0.15, 1.7, 1.7, 34), '#dfe5ea');
      glassBox(g, 0.75, 0.75, 0.5, 0.5, 34, 14, '#bfe0f0', 2);
      poly(g, onL(0.15, 0.15, 1.7, 1.7, 22, 12, 0.3, 0.7, 0, 1), rival ? '#8a8f9a' : col);
    } else if (s === 'datacentre') {
      shadowBox(g, 0.2, 0.2, 1.6, 1.6, 30);
      boxC(g, 0.2, 0.2, 1.6, 1.6, 0, 28, rival ? '#9aa1ab' : '#dfe4ea');
      for (let i = 0; i < 6; i++) poly(g, onL(0.2, 0.2, 1.6, 1.6, 0, 28, 0.06 + i * 0.15, 0.16 + i * 0.15, 0.2, 0.8), '#4b5a72');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const p = P(0.45 + i * 0.36, 0.45 + j * 0.36, 28); ellipse(g, p[0], p[1], 6, 3, '#9aa6b2'); ellipse(g, p[0], p[1], 3.5, 1.7, '#5e6b7d'); }
    } else if (s === 'themepark') {
      pad(g, 0, 0, 2, 2, '#bfe293');
      // a roller coaster track and a big wheel (the wheel turns on the map)
      g.beginPath(); const a = P(0.2, 1.6, 4); g.moveTo(a[0], a[1]);
      [[0.5, 1.2, 30], [0.9, 1.7, 8], [1.3, 1.1, 40], [1.7, 1.6, 6]].forEach(([c, r, z]) => { const p = P(c, r, z); g.lineTo(p[0], p[1]); });
      g.strokeStyle = col; g.lineWidth = 2.2; g.stroke();
      [[0.5, 1.2, 30], [1.3, 1.1, 40]].forEach(([c, r, z]) => line(g, [P(c, r, 0), P(c, r, z)], '#8a8f9a', 1));
      boxC(g, 0.2, 0.2, 0.5, 0.5, 0, 16, '#f6e7c8'); pyramid(g, 0.17, 0.17, 0.56, 0.56, 16, 14, '#f25a7a');
      const base = P(1.35, 0.6, 0); line(g, [[base[0] - 10, base[1]], [base[0], base[1] - 40], [base[0] + 10, base[1]]], '#8a8f9a', 1.6);
    } else if (s === 'stadium') {
      shadowBox(g, 0.15, 0.15, 1.7, 1.7, 30);
      const cx = P(1, 1, 0);
      g.save(); g.translate(cx[0], cx[1]);
      ellipse(g, 0, 0, 62, 31, shade(col, -0.25)); ellipse(g, 0, -18, 62, 31, rival ? '#b9bfc8' : col); ellipse(g, 0, -18, 50, 25, '#e8ecf0');
      ellipse(g, 0, -14, 40, 20, '#59ad4a'); for (let i = -3; i <= 3; i++) ellipse(g, i * 10, -14, 4, 18 - Math.abs(i) * 2, i % 2 ? '#6bbd57' : '#59ad4a');
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(0, -14, 12, 6, 0, 0, 7); g.stroke();
      g.restore();
    } else if (s === 'port') {
      pad(g, 0, 0, 2, 2, '#d4cfc6');
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) box(g, 0.2 + i * 0.5, 0.3 + j * 0.5, 0.4, 0.2, 0, 7 + ((i + j) % 2) * 7, pick(['#e2803e', '#5aa6dd', '#e05a5a', '#42a35a', '#f2c14e'], i * 3 + j), pick(['#d06f30', '#4895cc', '#cc4848', '#38904e', '#e0b03c'], i * 3 + j), pick(['#b85f26', '#3d82b5', '#b33d3d', '#2f7a42', '#c89c30'], i * 3 + j));
      const m = P(1.85, 0.4, 0); line(g, [m, [m[0], m[1] - 48]], col, 2.6); line(g, [[m[0] - 34, m[1] - 48], [m[0] + 10, m[1] - 48]], col, 2.4);
    } else if (s === 'supertower') {
      shadowBox(g, 0.3, 0.3, 1.4, 1.4, 260);
      glassBox(g, 0.3, 0.3, 1.4, 1.4, 0, 150, rival ? '#b9c3cc' : col, 18);
      glassBox(g, 0.5, 0.5, 1, 1, 150, 80, rival ? '#c7cfd6' : shade(col, 0.15), 10);
      glassBox(g, 0.7, 0.7, 0.6, 0.6, 230, 30, shade(col, 0.3), 4);
      line(g, [P(1, 1, 260), P(1, 1, 300)], '#9aa3ad', 2);
      circle(g, P(1, 1, 300)[0], P(1, 1, 300)[1], 2.2, '#f25a5a');
    } else if (s === 'airhangar') {
      shadowBox(g, 0.15, 0.25, 1.4, 1.4, 34);
      g.save(); const p = P(0.15, 1.65, 0), q = P(1.55, 1.65, 0);
      g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo((p[0] + q[0]) / 2, p[1] - 60, q[0], q[1]); g.closePath(); g.fillStyle = '#dfe5ea'; g.fill();
      g.restore();
      roof(g, 0.15, 0.25, 1.4, 1.4, 22, 16, rival ? '#9aa6b2' : col, 'c');
      boxC(g, 0.15, 0.25, 1.4, 1.4, 0, 22, '#eef1f4');
      poly(g, onL(0.15, 0.25, 1.4, 1.4, 0, 22, 0.1, 0.9, 0, 0.85), '#5e6b7d');
      drawPlane(g, P(1.4, 1.75, 0)[0], P(1.4, 1.75, 0)[1], 0.9, col);
    } else if (s === 'launchpad') {
      pad(g, 0, 0, 2, 2, '#cfcbc3');
      box(g, 0.6, 0.6, 0.8, 0.8, 0, 6, '#b9b4ab', '#a6a198', '#938e85');
      const p = P(1, 1, 6);
      g.fillStyle = '#f2f4f7'; g.fillRect(p[0] - 6, p[1] - 92, 12, 86);
      g.fillStyle = '#dfe3e8'; g.fillRect(p[0] + 1, p[1] - 92, 5, 86);
      poly(g, [[p[0] - 6, p[1] - 92], [p[0] + 6, p[1] - 92], [p[0], p[1] - 112]], rival ? '#8a8f9a' : '#e05a5a');
      poly(g, [[p[0] - 6, p[1] - 20], [p[0] - 13, p[1] - 6], [p[0] - 6, p[1] - 10]], '#e05a5a'); poly(g, [[p[0] + 6, p[1] - 20], [p[0] + 13, p[1] - 6], [p[0] + 6, p[1] - 10]], '#c24646');
      circle(g, p[0], p[1] - 70, 2.6, '#5aa6dd');
      line(g, [[p[0] + 18, p[1]], [p[0] + 18, p[1] - 100]], '#8a8f9a', 2); for (let i = 0; i < 9; i++) line(g, [[p[0] + 18, p[1] - 10 - i * 10], [p[0] + 8, p[1] - 14 - i * 10]], '#8a8f9a', 0.8);
    }
  }
  function drawPlane(g, x, y, k, tail) {
    g.save(); g.translate(x, y); g.scale(k, k);
    ellipse(g, 0, 0, 22, 4.5, '#f5f7fa'); ellipse(g, 2, 1.5, 22, 3, '#dfe4ea');
    poly(g, [[-4, 0], [6, 0], [-6, 16], [-12, 16]], '#e6eaf0'); poly(g, [[-4, 0], [6, 0], [-2, -12], [-8, -12]], '#d9dfe6');
    poly(g, [[16, -1], [22, -1], [24, -12], [19, -12]], tail || '#5aa6dd');
    for (let i = 0; i < 6; i++) circle(g, -12 + i * 4, -1.5, 0.9, '#5e6b7d');
    g.restore();
  }

  /* ---------- landmarks (anchor = the top corner of their footprint) ---------- */
  function landmark(g, o) {
    const k = o.k, w = o.w || 1, d = o.d || 1;
    if (k === 'school') {
      shadowBox(g, 0.1, 0.1, 1.8, 1.8, 30);
      boxC(g, 0.1, 0.1, 1.8, 1.8, 0, 24, '#f2dcc0');
      windows(g, 0.1, 0.1, 1.8, 1.8, 0, 24, 2, 6, 6, '#8fb6d6', '#7a9fbf', 0.5, 0.45);
      roof(g, 0.05, 0.05, 1.9, 1.9, 24, 16, '#c96e5a', 'c');
      const p = P(1.95, 0.2, 0); line(g, [p, [p[0], p[1] - 46]], '#8a8f9a', 1.2); poly(g, [[p[0], p[1] - 46], [p[0] + 14, p[1] - 42], [p[0], p[1] - 38]], '#5aa6dd');
    } else if (k === 'church') {
      shadowBox(g, 0.2, 0.3, 1.6, 2.4, 40);
      boxC(g, 0.3, 0.6, 1.4, 2.2, 0, 26, '#ece3d0');
      windows(g, 0.3, 0.6, 1.4, 2.2, 4, 18, 1, 2, 5, '#9fb7d6', '#8aa2c2', 0.25, 0.9);
      roof(g, 0.25, 0.55, 1.5, 2.3, 26, 22, '#8fa0b6', 'r');
      boxC(g, 0.65, 0.15, 0.7, 0.6, 0, 50, '#e4dac6');
      pyramid(g, 0.62, 0.12, 0.76, 0.66, 50, 40, '#7d8fa6');
      const p = P(1, 0.45, 96); line(g, [p, [p[0], p[1] - 10]], '#c9a227', 1.2); line(g, [[p[0] - 4, p[1] - 7], [p[0] + 4, p[1] - 7]], '#c9a227', 1.2);
    } else if (k === 'clocktower') {
      shadowBox(g, 0.25, 0.25, 0.5, 0.5, 80);
      boxC(g, 0.25, 0.25, 0.5, 0.5, 0, 64, '#e9dcc3');
      [0, 1].forEach((side) => { const pts = side ? onR(0.25, 0.25, 0.5, 0.5, 0, 64, 0.2, 0.8, 0.72, 0.92) : onL(0.25, 0.25, 0.5, 0.5, 0, 64, 0.2, 0.8, 0.72, 0.92); poly(g, pts, '#fffaf0'); });
      pyramid(g, 0.2, 0.2, 0.6, 0.6, 64, 26, '#5f8f7a');
      const c0 = P(0.25 + 0.25, 0.75, 64 * 0.82); line(g, [c0, [c0[0], c0[1] - 4]], '#333', 1); line(g, [c0, [c0[0] + 3, c0[1]]], '#333', 1);
    } else if (k === 'library' || k === 'museum' || k === 'cityhall') {
      const col = k === 'museum' ? '#ece6da' : k === 'library' ? '#efe2cc' : '#e8e2d6', h = k === 'cityhall' ? 38 : 30;
      shadowBox(g, 0.2, 0.2, w - 0.4, d - 0.4, h + 20);
      box(g, 0.1, 0.1, w - 0.2, d - 0.2, 0, 5, '#ddd5c6', '#cfc6b5', '#bdb3a1');
      boxC(g, 0.3, 0.3, w - 0.6, d - 0.6, 5, h, col);
      for (let i = 0; i < 6; i++) poly(g, onL(0.3, 0.3, w - 0.6, d - 0.6, 5, h - 6, 0.08 + i * 0.16, 0.13 + i * 0.16, 0, 1), '#fbf8f1');
      for (let i = 0; i < 6; i++) poly(g, onR(0.3, 0.3, w - 0.6, d - 0.6, 5, h - 6, 0.08 + i * 0.16, 0.13 + i * 0.16, 0, 1), '#e7e1d6');
      poly(g, diamond(0.3, 0.3, w - 0.6, d - 0.6, h + 5), shade(col, -0.06));
      if (k === 'museum') { const p = P(w / 2, d / 2, h + 5); ellipse(g, p[0], p[1], 24, 12, '#8fc3b8'); ellipse(g, p[0], p[1] - 10, 20, 18, '#9fd0c4'); ellipse(g, p[0] - 6, p[1] - 16, 6, 5, '#c4e6dd'); }
      else roof(g, 0.28, 0.28, w - 0.56, d - 0.56, h + 5, 14, k === 'library' ? '#b07a5c' : '#7d8fa6', 'c');
      if (k === 'cityhall') { const p = P(w / 2, d / 2, h + 19); line(g, [p, [p[0], p[1] - 22]], '#8a8f9a', 1.2); poly(g, [[p[0], p[1] - 22], [p[0] + 12, p[1] - 18], [p[0], p[1] - 14]], '#e05a5a'); }
    } else if (k === 'hospital') {
      shadowBox(g, 0.2, 0.2, 2.6, 2.6, 60);
      boxC(g, 0.2, 0.2, 2.6, 2.6, 0, 50, '#f4f6f8');
      windows(g, 0.2, 0.2, 2.6, 2.6, 0, 50, 5, 8, 8, '#8fc0e0', '#7aaacb', 0.55, 0.5);
      poly(g, diamond(0.2, 0.2, 2.6, 2.6, 50), '#e3e8ed');
      const p = P(1.5, 1.5, 50); g.fillStyle = '#e05a5a'; g.fillRect(p[0] - 9, p[1] - 3, 18, 6); g.fillRect(p[0] - 3, p[1] - 9, 6, 18);
    } else if (k === 'station') {
      shadowBox(g, 0.1, 0.1, w - 0.2, d - 0.2, 40);
      boxC(g, 0.2, 0.2, w - 0.4, 1.4, 0, 26, '#efe2cc');
      windows(g, 0.2, 0.2, w - 0.4, 1.4, 0, 26, 2, 10, 3, '#8fb6d6', '#7a9fbf', 0.5, 0.5);
      roof(g, 0.15, 0.15, w - 0.3, 1.5, 26, 12, '#b07a5c', 'c');
      // the glass train shed
      const a = P(0.2, 2, 0), b = P(w - 0.2, 2, 0), a2 = P(0.2, 2.9, 0), b2 = P(w - 0.2, 2.9, 0);
      g.beginPath(); g.moveTo(a[0], a[1] - 4); g.quadraticCurveTo((a[0] + a2[0]) / 2, (a[1] + a2[1]) / 2 - 40, a2[0], a2[1] - 4);
      g.lineTo(b2[0], b2[1] - 4); g.quadraticCurveTo((b[0] + b2[0]) / 2, (b[1] + b2[1]) / 2 - 40, b[0], b[1] - 4); g.closePath();
      g.fillStyle = 'rgba(190,220,240,.75)'; g.fill(); g.strokeStyle = '#8fa0b6'; g.lineWidth = 1; g.stroke();
    } else if (k === 'terminal') {
      shadowBox(g, 0.1, 0.1, w - 0.2, d - 0.2, 30);
      glassBox(g, 0.1, 0.1, w - 0.2, d - 0.2, 0, 22, '#bfe0f0', 3);
      g.beginPath(); const p = P(0.1, d - 0.1, 22), q = P(w - 0.1, d - 0.1, 22); g.moveTo(p[0], p[1]); g.quadraticCurveTo((p[0] + q[0]) / 2, p[1] - 18, q[0], q[1]); g.lineTo(q[0], q[1] - 2); g.lineTo(p[0], p[1] - 2); g.fillStyle = '#e8ecf0'; g.fill();
    } else if (k === 'ctower') {
      shadowBox(g, 0.35, 0.35, 0.3, 0.3, 70);
      boxC(g, 0.38, 0.38, 0.24, 0.24, 0, 54, '#eef1f4');
      glassBox(g, 0.28, 0.28, 0.44, 0.44, 54, 10, '#7fbfe0', 1);
      poly(g, diamond(0.26, 0.26, 0.48, 0.48, 64), '#c3c9d1');
    } else if (k === 'hangar') {
      roof(g, 0.1, 0.1, w - 0.2, d - 0.2, 14, 12, '#a9b5c2', 'c');
      boxC(g, 0.1, 0.1, w - 0.2, d - 0.2, 0, 14, '#e6eaee');
      poly(g, onL(0.1, 0.1, w - 0.2, d - 0.2, 0, 14, 0.1, 0.9, 0, 0.9), '#6b7788');
    } else if (k === 'crane') {   // a container crane on the quay, reaching over the water
      const base = P(0.5, 0.5, 0), top = 58;
      line(g, [[base[0] - 8, base[1] + 3], [base[0] - 8, base[1] - top]], '#e2803e', 2.4); line(g, [[base[0] + 8, base[1] - 1], [base[0] + 8, base[1] - top]], '#d06f30', 2.4);
      line(g, [[base[0] - 8, base[1] - top], [base[0] + 8, base[1] - top]], '#e2803e', 2.2);
      const boomEnd = P(-1.3, 0.5, top + 4); line(g, [[base[0] + 12, base[1] - top - 4], boomEnd], '#e2803e', 2.2);
      line(g, [[base[0] - 8, base[1] - top], [base[0] - 2, base[1] - top - 16]], '#d06f30', 1.2); line(g, [[base[0] - 2, base[1] - top - 16], boomEnd], '#d06f30', 0.8);
      box(g, 0.25, 0.25, 0.5, 0.5, top - 8, 7, '#f2f4f7', '#e2e6ea', '#c9cfd6');
    } else if (k === 'containers') {
      const v = o.v || 0, n = 1 + (v % 3);
      for (let i = 0; i < n; i++) box(g, 0.15, 0.25, 0.7, 0.42, i * 7, 7, pick(['#e2803e', '#5aa6dd', '#e05a5a', '#42a35a', '#f2c14e', '#8a6fd0'], v + i),
        pick(['#d06f30', '#4895cc', '#cc4848', '#38904e', '#e0b03c', '#765cbc'], v + i), pick(['#b85f26', '#3d82b5', '#b33d3d', '#2f7a42', '#c89c30', '#6550a8'], v + i));
    } else if (k === 'lighthouse') {
      ellipse(g, P(0.5, 0.5)[0], P(0.5, 0.5)[1], 24, 12, '#9aa1a9');
      for (let i = 0; i < 5; i++) boxC(g, 0.38 + i * 0.01, 0.38 + i * 0.01, 0.24 - i * 0.02, 0.24 - i * 0.02, i * 14, 14, i % 2 ? '#e05a5a' : '#fbf8f2');
      glassBox(g, 0.4, 0.4, 0.2, 0.2, 70, 9, '#fff3b0', 1);
      pyramid(g, 0.36, 0.36, 0.28, 0.28, 79, 10, '#e05a5a');
    } else if (k === 'farmhouse') {
      pad(g, 0, 0, w, d, '#a9d47c');
      shadowBox(g, 0.3, 0.3, 1.4, 1.2, 36);
      boxC(g, 0.3, 0.3, 1.4, 1.2, 0, 22, '#f4ead6');
      windows(g, 0.3, 0.3, 1.4, 1.2, 0, 22, 2, 4, 3, '#8fb6d6', '#7a9fbf', 0.4, 0.45);
      roof(g, 0.25, 0.25, 1.5, 1.3, 22, 18, '#b9644e', 'c');
    } else if (k === 'barn') {
      shadowBox(g, 0.2, 0.3, 1.6, 1.3, 40);
      boxC(g, 0.2, 0.3, 1.6, 1.3, 0, 22, '#c4553f');
      poly(g, onL(0.2, 0.3, 1.6, 1.3, 0, 22, 0.35, 0.65, 0, 0.75), '#f4ead6');
      roof(g, 0.15, 0.25, 1.7, 1.4, 22, 20, '#6f5a4a', 'c');
    } else if (k === 'silo') {
      const p = P(0.5, 0.5, 0);
      g.fillStyle = '#c9d0d8'; g.fillRect(p[0] - 9, p[1] - 50, 18, 50); g.fillStyle = '#b5bdc6'; g.fillRect(p[0], p[1] - 50, 9, 50);
      ellipse(g, p[0], p[1], 9, 4.5, '#b5bdc6'); ellipse(g, p[0], p[1] - 50, 9, 4.5, '#dfe5ea'); poly(g, [[p[0] - 9, p[1] - 50], [p[0] + 9, p[1] - 50], [p[0], p[1] - 62]], '#8fa0b6');
    } else if (k === 'windmill') {
      const p = P(0.5, 0.5, 0);
      poly(g, [[p[0] - 9, p[1]], [p[0] + 9, p[1]], [p[0] + 5, p[1] - 44], [p[0] - 5, p[1] - 44]], '#f1e8d6');
      poly(g, [[p[0], p[1]], [p[0] + 9, p[1]], [p[0] + 5, p[1] - 44], [p[0], p[1] - 44]], '#ddd2bd');
      poly(g, [[p[0] - 7, p[1] - 44], [p[0] + 7, p[1] - 44], [p[0], p[1] - 56]], '#b9644e');
    } else if (k === 'stall') {
      const v = o.v || 0, col = pick(AWN, v);
      box(g, 0.25, 0.3, 0.5, 0.4, 0, 7, '#e9cfa4', '#d9b98a', '#c4a476');
      [[0.26, 0.31], [0.74, 0.31], [0.74, 0.69], [0.26, 0.69]].forEach(([c, r]) => line(g, [P(c, r, 7), P(c, r, 17)], '#9b7652', 1));
      roof(g, 0.2, 0.25, 0.6, 0.5, 17, 6, col, 'c');
      for (let i = 0; i < 4; i++) circle(g, P(0.32 + i * 0.12, 0.6, 8)[0], P(0.32 + i * 0.12, 0.6, 8)[1], 1.6, pick(['#f2c14e', '#e05a5a', '#6cc08f', '#f39a4a'], v + i));
    } else if (k === 'kiosk') {
      boxC(g, 0.3, 0.3, 0.4, 0.4, 0, 14, '#fbe6c4'); pyramid(g, 0.25, 0.25, 0.5, 0.5, 14, 10, '#6cc08f');
    } else if (k === 'playground') {
      line(g, [P(0.25, 0.3, 0), P(0.25, 0.3, 14), P(0.6, 0.3, 14), P(0.6, 0.3, 0)], '#e05a5a', 1.4);
      line(g, [P(0.35, 0.3, 14), P(0.35, 0.3, 6)], '#666', 0.6); line(g, [P(0.5, 0.3, 14), P(0.5, 0.3, 6)], '#666', 0.6);
      box(g, 0.55, 0.6, 0.2, 0.2, 0, 10, '#f2c14e', '#e0b03c', '#c89c30');
      poly(g, [P(0.55, 0.8, 10), P(0.75, 0.8, 10), P(0.75, 1.0, 0), P(0.55, 1.0, 0)], '#5aa6dd');
      poly(g, diamond(0.15, 0.55, 0.3, 0.3, 0.5), '#f1dfae');
    } else if (k === 'fountain') {
      const p = P(0.5, 0.5, 0);
      ellipse(g, p[0], p[1], 20, 10, '#d8d2c6'); ellipse(g, p[0], p[1] - 3, 18, 9, '#e7e2d8'); ellipse(g, p[0], p[1] - 3, 14.5, 7, '#8fd0ea');
      g.fillStyle = '#d8d2c6'; g.fillRect(p[0] - 2, p[1] - 14, 4, 11); ellipse(g, p[0], p[1] - 14, 6, 3, '#e7e2d8');
    } else if (k === 'umbrella') {
      const p = P(0.5, 0.5, 0), col = pick(AWN, o.v || 0);
      ellipse(g, p[0] + 4, p[1], 9, 4, 'rgba(0,0,0,.08)'); line(g, [p, [p[0], p[1] - 14]], '#8a8f9a', 1);
      g.beginPath(); g.moveTo(p[0] - 10, p[1] - 12); g.quadraticCurveTo(p[0], p[1] - 22, p[0] + 10, p[1] - 12); g.closePath(); g.fillStyle = col; g.fill();
      g.fillStyle = '#fbf8f2'; g.fillRect(p[0] + 6, p[1] - 2, 8, 3);
    } else if (k === 'beachhut') {
      const col = pick(AWN, (o.r || 0) * 3);
      boxC(g, 0.3, 0.3, 0.4, 0.4, 0, 12, '#fbf8f2'); poly(g, onL(0.3, 0.3, 0.4, 0.4, 0, 12, 0, 1, 0, 1), col); roof(g, 0.26, 0.26, 0.48, 0.48, 12, 7, shade(col, -0.2), 'r');
    } else if (k === 'yacht') {
      const p = P(0.5, 0.5, 0), v = o.v || 0;
      poly(g, [[p[0] - 12, p[1] - 2], [p[0] + 12, p[1] - 2], [p[0] + 8, p[1] + 3], [p[0] - 9, p[1] + 3]], '#fbfbfb'); poly(g, [[p[0] - 9, p[1] + 3], [p[0] + 8, p[1] + 3], [p[0] + 7, p[1] + 4], [p[0] - 8, p[1] + 4]], '#5aa6dd');
      if (v % 2) { line(g, [[p[0], p[1] - 2], [p[0], p[1] - 26]], '#8a8f9a', 0.9); poly(g, [[p[0] + 1, p[1] - 25], [p[0] + 1, p[1] - 4], [p[0] + 11, p[1] - 5]], '#ffffff'); }
      else box(g, 0.4, 0.42, 0.2, 0.14, 2, 5, '#ffffff', '#eef1f4', '#d9dfe6');
    } else if (k === 'pond-ducks') {
      [[0.8, 0.6], [1.6, 1.1], [2.2, 0.7]].forEach(([c, r]) => { const p = P(c, r, 0); ellipse(g, p[0], p[1], 3, 1.8, '#fbfbfb'); circle(g, p[0] + 2.4, p[1] - 1.6, 1.3, '#3f8a45'); circle(g, p[0] + 3.6, p[1] - 1.5, 0.6, '#f2a641'); });
      [[0.4, 1.3], [1.2, 0.3], [2.4, 1.5]].forEach(([c, r]) => { const p = P(c, r, 0); ellipse(g, p[0], p[1], 4, 2, '#6cb85a'); });
    }
  }

  /* ---------- sprites: painted once per look and zoom, then copied ---------- */
  const DPR = () => Math.min(2, root.devicePixelRatio || 1);
  // zoom settles on these steps, and sprites and ground are painted for them, so a still map copies them 1:1
  const BUCKETS = [0.3, 0.42, 0.6, 0.8, 1, 1.2, 1.41], ZMIN = 0.3, ZMAX = 1.41;
  const bucketOf = (z) => BUCKETS.find((b) => b >= z * 0.98) || BUCKETS[BUCKETS.length - 1];
  const snapZ = (z) => BUCKETS.reduce((a, b) => (Math.abs(b - z) < Math.abs(a - z) ? b : a), 1);
  function makeCanvas(w, h) { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h)); return cv; }
  function Sprites() {
    const cache = new Map();
    let used = 0;
    return {
      get(key, bucket, box, draw) {   // box = [x0, y0, x1, y1] in world units around the anchor
        const k = key + '@' + bucket;
        let s = cache.get(k);
        if (s) { s.t = used++; return s; }
        const sc = bucket * DPR(), cv = makeCanvas((box[2] - box[0]) * sc, (box[3] - box[1]) * sc), g = cv.getContext('2d');
        g.scale(sc, sc); g.translate(-box[0], -box[1]); g.lineJoin = 'round'; g.lineCap = 'round';
        draw(g);
        s = { cv: cv, x0: box[0], y0: box[1], w: box[2] - box[0], h: box[3] - box[1], t: used++ };
        cache.set(k, s);
        if (cache.size > 520) { const old = [...cache.entries()].sort((a, b) => a[1].t - b[1].t).slice(0, 120); old.forEach(([kk]) => cache.delete(kk)); }
        return s;
      },
      clear() { cache.clear(); },
      size() { let px = 0; cache.forEach((s) => { px += s.cv.width * s.cv.height; }); return { n: cache.size, px: px }; }
    };
  }

  /* ---------- the ground: tiles painted into 8 x 8 chunks ---------- */
  const CH = 8, NCH = Math.ceil(N / CH);
  const roadAt = (c, r) => C.isRoad(C.get(c, r)) || C.get(c, r) === K.CROSSING;
  const waterAt = (c, r) => C.isWater(C.get(c, r));
  function tileColour(k, c, r, season) {
    const h = hash(c, r, 5), gr = GRASS[season];
    switch (k) {
      case K.GRASS: return shade(gr, (h - 0.5) * 0.06);
      case K.YARD: return shade(gr, -0.04 + (h - 0.5) * 0.05);
      case K.LOT: return shade(gr, 0.02);
      case K.LAWN: return shade(gr, 0.05 + (((c + r) % 2) ? 0.02 : 0));
      case K.FOREST: return shade(gr, -0.12);
      case K.ORCHARD: return shade(gr, -0.03);
      case K.SAND: return shade('#f3e1b5', (h - 0.5) * 0.05);
      case K.SEA: case K.RIVER: case K.POND: return '#86cbe7';
      case K.ROAD: case K.CROSSING: return '#bdb7ab';
      case K.AVENUE: return '#b4aea3';
      case K.BRIDGE: return '#86cbe7';
      case K.PLAZA: return '#ecdcbc';
      case K.PATH: return '#efe2c4';
      case K.FIELD: return '#d9c48a';
      case K.RAIL: return '#c3b6a2';
      case K.RUNWAY: return '#8f949c';
      case K.APRON: return '#a9adb3';
      case K.QUAY: return '#d4cfc6';
      case K.PIER: return '#86cbe7';
      case K.SITE: return shade(gr, 0.06);
      case K.PARKING: return '#bdb7ab';
      default: return gr;
    }
  }
  function drawTile(g, c, r, season) {
    const k = C.get(c, r), base = tileColour(k, c, r, season), di = C.dist[C.at(c, r)];
    const T = diamond(c, r, 1, 1, 0);
    // a hair bigger than the tile so the seams never show
    const grow = (pts) => { const cx = (pts[0][0] + pts[2][0]) / 2, cy = (pts[0][1] + pts[2][1]) / 2; return pts.map(([x, y]) => [cx + (x - cx) * 1.03, cy + (y - cy) * 1.03]); };
    poly(g, grow(T), base);
    const w = (k === K.SEA || k === K.RIVER || k === K.POND || k === K.BRIDGE || k === K.PIER);
    if (w) {
      // deeper away from land; a light edge where water meets land
      let dLand = 9;
      for (let rr = -3; rr <= 3; rr++) for (let cc = -3; cc <= 3; cc++) if (C.inb(c + cc, r + rr) && !waterAt(c + cc, r + rr) && C.get(c + cc, r + rr) !== K.BRIDGE && C.get(c + cc, r + rr) !== K.PIER) dLand = Math.min(dLand, Math.max(Math.abs(cc), Math.abs(rr)));
      if (k === K.SEA && dLand >= 3) poly(g, grow(T), dLand >= 5 ? '#6db9e0' : '#79c2e4');
      if (dLand === 1) poly(g, grow(T), '#97d4ec');
      [[0, -1, P(c, r), P(c + 1, r)], [1, 0, P(c + 1, r), P(c + 1, r + 1)], [0, 1, P(c + 1, r + 1), P(c, r + 1)], [-1, 0, P(c, r + 1), P(c, r)]].forEach(([dc, dr, a, b]) => {
        if (C.inb(c + dc, r + dr) && !waterAt(c + dc, r + dr) && C.get(c + dc, r + dr) !== K.BRIDGE && C.get(c + dc, r + dr) !== K.PIER) line(g, [a, b], 'rgba(255,255,255,.75)', 1.6);
      });
      if (hash(c, r, 11) < 0.35) { const p = P(c + 0.3 + hash(c, r, 12) * 0.4, r + 0.3 + hash(c, r, 13) * 0.4); line(g, [[p[0] - 4, p[1]], [p[0] + 4, p[1]]], 'rgba(255,255,255,.5)', 1); }
      if (k === K.POND && hash(c, r, 14) < 0.5) { const p = P(c + 0.5, r + 0.5); ellipse(g, p[0], p[1], 4, 2, '#6cb85a'); }
    }
    if (k === K.BRIDGE) {
      const alongC = roadAt(c - 1, r) || roadAt(c + 1, r);
      const deck = alongC ? [P(c, r + 0.08), P(c + 1, r + 0.08), P(c + 1, r + 0.92), P(c, r + 0.92)] : [P(c + 0.08, r), P(c + 0.92, r), P(c + 0.92, r + 1), P(c + 0.08, r + 1)];
      poly(g, deck.map(([x, y]) => [x + 4, y + 4]), 'rgba(30,60,90,.18)');
      poly(g, deck, '#c4bdb1');
      if (alongC) { line(g, [P(c, r + 0.08), P(c + 1, r + 0.08)], '#f6f2ea', 2); line(g, [P(c, r + 0.92), P(c + 1, r + 0.92)], '#f6f2ea', 2); }
      else { line(g, [P(c + 0.08, r), P(c + 0.08, r + 1)], '#f6f2ea', 2); line(g, [P(c + 0.92, r), P(c + 0.92, r + 1)], '#f6f2ea', 2); }
      line(g, alongC ? [P(c + 0.15, r + 0.5), P(c + 0.45, r + 0.5)] : [P(c + 0.5, r + 0.15), P(c + 0.5, r + 0.45)], '#f7f3e9', 1);
    }
    if (k === K.PIER) {
      poly(g, [P(c + 0.3, r), P(c + 0.7, r), P(c + 0.7, r + 1), P(c + 0.3, r + 1)].map(([x, y]) => [x + 3, y + 3]), 'rgba(30,60,90,.15)');
      poly(g, [P(c + 0.3, r), P(c + 0.7, r), P(c + 0.7, r + 1), P(c + 0.3, r + 1)], '#c9a273');
      for (let i = 1; i < 5; i++) line(g, [P(c + 0.3, r + i / 5), P(c + 0.7, r + i / 5)], '#ad8458', 0.6);
    }
    if (k === K.ROAD || k === K.AVENUE || k === K.CROSSING) {
      // pavements on the sides that do not continue the road
      const sides = [[0, -1, 'N'], [1, 0, 'E'], [0, 1, 'S'], [-1, 0, 'W']];
      const open = {}; sides.forEach(([dc, dr, s]) => { open[s] = roadAt(c + dc, r + dr) || C.get(c + dc, r + dr) === K.BRIDGE; });
      const pw = 0.17;
      const strip = { N: [P(c, r), P(c + 1, r), P(c + 1, r + pw), P(c, r + pw)], E: [P(c + 1, r), P(c + 1, r + 1), P(c + 1 - pw, r + 1), P(c + 1 - pw, r)], S: [P(c, r + 1), P(c + 1, r + 1), P(c + 1, r + 1 - pw), P(c, r + 1 - pw)], W: [P(c, r), P(c, r + 1), P(c + pw, r + 1), P(c + pw, r)] };
      const edge = { N: [P(c, r + pw), P(c + 1, r + pw)], E: [P(c + 1 - pw, r), P(c + 1 - pw, r + 1)], S: [P(c, r + 1 - pw), P(c + 1, r + 1 - pw)], W: [P(c + pw, r), P(c + pw, r + 1)] };
      ['N', 'E', 'S', 'W'].forEach((s) => { if (!open[s] && !(k === K.AVENUE && C.get(c + ({ E: 1, W: -1 }[s] || 0), r + ({ S: 1, N: -1 }[s] || 0)) === K.AVENUE)) { poly(g, strip[s], '#ece5d6'); line(g, edge[s], '#d4cab6', 1); } });
      const alongC = open.E && open.W && !open.N && !open.S, alongR = open.N && open.S && !open.E && !open.W;
      if (k === K.AVENUE) {
        // the avenue's middle line runs on the shared edge between its two lanes
        if (C.get(c, r + 1) === K.AVENUE && C.get(c, r - 1) !== K.AVENUE && !(C.get(c + 1, r) === K.AVENUE && C.get(c - 1, r) === K.AVENUE && C.get(c, r + 1) === K.AVENUE && C.get(c + 1, r + 1) === K.AVENUE && C.get(c, r - 1) === K.AVENUE)) { /* edge drawn below */ }
        const hor = C.get(c - 1, r) === K.AVENUE || C.get(c + 1, r) === K.AVENUE, ver = C.get(c, r - 1) === K.AVENUE || C.get(c, r + 1) === K.AVENUE;
        if (hor && !ver) { if (C.get(c, r + 1) === K.AVENUE) line(g, [P(c, r + 1), P(c + 1, r + 1)], '#f3e3a0', 1.6); for (let i = 0; i < 2; i++) line(g, [P(c + 0.1 + i * 0.5, r + 0.5), P(c + 0.35 + i * 0.5, r + 0.5)], '#f7f3e9', 1.1); }
        if (ver && !hor) { if (C.get(c + 1, r) === K.AVENUE) line(g, [P(c + 1, r), P(c + 1, r + 1)], '#f3e3a0', 1.6); for (let i = 0; i < 2; i++) line(g, [P(c + 0.5, r + 0.1 + i * 0.5), P(c + 0.5, r + 0.35 + i * 0.5)], '#f7f3e9', 1.1); }
      } else if (alongC) { line(g, [P(c + 0.15, r + 0.5), P(c + 0.42, r + 0.5)], '#f7f3e9', 1); line(g, [P(c + 0.62, r + 0.5), P(c + 0.88, r + 0.5)], '#f7f3e9', 1); }
      else if (alongR) { line(g, [P(c + 0.5, r + 0.15), P(c + 0.5, r + 0.42)], '#f7f3e9', 1); line(g, [P(c + 0.5, r + 0.62), P(c + 0.5, r + 0.88)], '#f7f3e9', 1); }
      // zebra crossings where a street meets a junction
      const junction = (cc, rr) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dc, dr]) => roadAt(cc + dc, rr + dr)).length >= 3;
      if (k === K.ROAD && !junction(c, r)) {
        if (alongC && junction(c + 1, r)) for (let i = 0; i < 4; i++) line(g, [P(c + 0.82, r + 0.22 + i * 0.18), P(c + 0.96, r + 0.22 + i * 0.18)], '#f7f3e9', 1.6);
        if (alongC && junction(c - 1, r)) for (let i = 0; i < 4; i++) line(g, [P(c + 0.04, r + 0.22 + i * 0.18), P(c + 0.18, r + 0.22 + i * 0.18)], '#f7f3e9', 1.6);
        if (alongR && junction(c, r + 1)) for (let i = 0; i < 4; i++) line(g, [P(c + 0.22 + i * 0.18, r + 0.82), P(c + 0.22 + i * 0.18, r + 0.96)], '#f7f3e9', 1.6);
        if (alongR && junction(c, r - 1)) for (let i = 0; i < 4; i++) line(g, [P(c + 0.22 + i * 0.18, r + 0.04), P(c + 0.22 + i * 0.18, r + 0.18)], '#f7f3e9', 1.6);
      }
      if (k === K.CROSSING) { line(g, [P(c, r + 0.4), P(c + 1, r + 0.4)], '#7b818b', 1.4); line(g, [P(c, r + 0.6), P(c + 1, r + 0.6)], '#7b818b', 1.4); }
    } else if (k === K.RAIL) {
      for (let i = 0; i < 6; i++) line(g, [P(c + 0.08 + i * 0.16, r + 0.28), P(c + 0.08 + i * 0.16, r + 0.72)], '#8a6e55', 1.6);
      line(g, [P(c, r + 0.4), P(c + 1, r + 0.4)], '#7b818b', 1.3); line(g, [P(c, r + 0.6), P(c + 1, r + 0.6)], '#7b818b', 1.3);
    } else if (k === K.RUNWAY) {
      if (C.get(c, r - 1) !== K.RUNWAY) line(g, [P(c, r + 0.08), P(c + 1, r + 0.08)], '#f7f7f2', 1.2);
      if (C.get(c, r + 1) !== K.RUNWAY) { line(g, [P(c, r + 0.92), P(c + 1, r + 0.92)], '#f7f7f2', 1.2); }
      else line(g, [P(c + 0.25, r + 1), P(c + 0.7, r + 1)], '#f7f7f2', 1.6);
      if (c === 3 || c === 10) for (let i = 0; i < 4; i++) line(g, [P(c + 0.2, r + 0.15 + i * 0.22), P(c + 0.8, r + 0.15 + i * 0.22)], '#f7f7f2', 1.4);
    } else if (k === K.APRON) {
      if ((c + r) % 3 === 0) line(g, [P(c, r + 0.5), P(c + 1, r + 0.5)], '#f2c14e', 0.9);
    } else if (k === K.QUAY) {
      line(g, [P(c, r), P(c + 1, r)], 'rgba(0,0,0,.06)', 0.8);
      if (waterAt(c - 1, r)) line(g, [P(c + 0.06, r), P(c + 0.06, r + 1)], '#f2c14e', 1.2);
    } else if (k === K.PLAZA) {
      line(g, [P(c, r + 0.5), P(c + 1, r + 0.5)], '#e0cda6', 0.7); line(g, [P(c + 0.5, r), P(c + 0.5, r + 1)], '#e0cda6', 0.7);
    } else if (k === K.PATH) {
      if (hash(c, r, 15) < 0.4) { const p = P(c + 0.5, r + 0.5); ellipse(g, p[0], p[1], 2, 1, '#e3d3ae'); }
    } else if (k === K.FIELD) {
      // fields in patches: wheat, greens, lavender or fresh soil, the rows running one way or the other
      const pc = Math.floor(c / 4), pr = Math.floor(r / 3), ph = hash(pc, pr, 21), types = [['#ecd27c', '#dcbc58'], ['#a9d36f', '#8fbf58'], ['#cfa676', '#b98f5e'], ['#c7b2e6', '#a990d6'], ['#e7d98c', '#cfc06a']];
      const t = types[Math.floor(ph * types.length)], along = hash(pc, pr, 22) < 0.5;
      poly(g, grow(T), season === 'winter' ? '#d7cdb4' : t[0]);
      for (let i = 1; i < 5; i++) line(g, along ? [P(c, r + i / 5), P(c + 1, r + i / 5)] : [P(c + i / 5, r), P(c + i / 5, r + 1)], season === 'winter' ? '#c8bd9f' : t[1], 1.6);
      if (c % 4 === 0) line(g, [P(c, r), P(c, r + 1)], '#b9a36b', 0.8);
    } else if (k === K.GRASS || k === K.YARD || k === K.LAWN || k === K.LOT) {
      if (hash(c, r, 16) < 0.25) for (let i = 0; i < 3; i++) { const p = P(c + 0.2 + hash(c, r, 30 + i) * 0.6, r + 0.2 + hash(c, r, 40 + i) * 0.6); line(g, [[p[0], p[1]], [p[0] - 1, p[1] - 2.5]], shade(base, -0.12), 0.8); line(g, [[p[0], p[1]], [p[0] + 1, p[1] - 2.5]], shade(base, -0.12), 0.8); }
      if (season !== 'winter' && k !== K.LOT && hash(c, r, 17) < 0.12) for (let i = 0; i < 4; i++) { const p = P(c + 0.15 + hash(c, r, 50 + i) * 0.7, r + 0.15 + hash(c, r, 60 + i) * 0.7); circle(g, p[0], p[1], 1, pick(['#ffffff', '#f6d34a', '#f48fb1', '#b9a2f2'], c + r + i)); }
      if (k === K.LAWN && ((c + r) % 2 === 0)) poly(g, [P(c, r), P(c + 1, r), P(c + 1, r + 0.5), P(c, r + 0.5)], 'rgba(255,255,255,.06)');
    } else if (k === K.SAND) {
      for (let i = 0; i < 5; i++) { const p = P(c + hash(c, r, 70 + i), r + hash(c, r, 80 + i)); circle(g, p[0], p[1], 0.7, '#e4cc97'); }
      if (waterAt(c - 1, r)) line(g, [P(c + 0.08, r), P(c + 0.08, r + 1)], 'rgba(255,255,255,.5)', 2);
    }
    if (di >= 0 && k === K.SITE) { /* landmark ground: a little paving shows under the building */ poly(g, diamond(c + 0.1, r + 0.1, 0.8, 0.8, 0), 'rgba(236,228,211,.6)'); }
  }
  // flat decals that belong to the ground: pitches, courts, the helipad, platforms
  function drawDecals(g, c0, r0) {
    C.objs.forEach((o) => {
      if (o.c < c0 - 3 || o.c >= c0 + CH || o.r < r0 - 3 || o.r >= r0 + CH) return;
      const w = o.w || 1, d = o.d || 1;
      if (o.k === 'pitch-small') {
        poly(g, diamond(o.c, o.r, w, d, 0), '#6fbf57');
        for (let i = 0; i < d * 2; i++) if (i % 2) poly(g, diamond(o.c, o.r + i / 2, w, 0.5, 0), '#7ac862');
        line(g, [P(o.c + 0.1, o.r + 0.1), P(o.c + w - 0.1, o.r + 0.1), P(o.c + w - 0.1, o.r + d - 0.1), P(o.c + 0.1, o.r + d - 0.1), P(o.c + 0.1, o.r + 0.1)], '#ffffff', 1.1);
        line(g, [P(o.c + 0.1, o.r + d / 2), P(o.c + w - 0.1, o.r + d / 2)], '#ffffff', 1.1);
      } else if (o.k === 'court') {
        poly(g, diamond(o.c + 0.1, o.r + 0.1, w - 0.2, d - 0.2, 0), '#5aa6a0');
        poly(g, diamond(o.c + 0.25, o.r + 0.25, w - 0.5, d - 0.5, 0), '#6fb9b2');
        line(g, [P(o.c + 0.25, o.r + d / 2), P(o.c + w - 0.25, o.r + d / 2)], '#ffffff', 1.4);
      } else if (o.k === 'helipad') {
        const p = P(o.c + 0.5, o.r + 0.5); ellipse(g, p[0], p[1], 18, 9, '#7d838c'); g.fillStyle = '#ffffff'; g.font = '700 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', p[0], p[1] + 0.5);
      } else if (o.k === 'platform') {
        poly(g, diamond(o.c, o.r + 0.15, w, 0.7, 2), '#ddd6c8');
      }
    });
  }

  /* ---------- the map ---------- */
  TYMap.create = function (canvas, opts) {
    opts = opts || {};
    const ctx = canvas.getContext('2d');
    const sprites = Sprites();
    const chunks = new Map();     // key "cx,cy@bucket@season" -> { cv, x0, y0 }
    const cam = { x: 0, y: 0, z: 1, tx: null, ty: null, tz: null, vx: 0, vy: 0 };
    let W = 0, H = 0, game = null, season = 'spring', clock = { h: 3, night: 0 }, sel = null, pickMode = null, running = false, lastT = 0, statics = [], lotObjs = [], locks = [];
    const agents = { cars: [], peds: [], boats: [], planes: [], trains: [], cust: [] }, pops = [], marks = new Map(), stats = { ms: 0, frames: 0 }, badgeHits = [];
    const T0 = performance.now();

    /* camera */
    const toScreen = (wx, wy) => [(wx - cam.x) * cam.z + W / 2, (wy - cam.y) * cam.z + H / 2];
    const toWorld = (sx, sy) => [(sx - W / 2) / cam.z + cam.x, (sy - H / 2) / cam.z + cam.y];
    const tileCentre = (c, r) => [(c - r) * HW, (c + r + 1) * HH];
    function clampCam() {
      const mx = N * HW, my0 = -40, my1 = 2 * N * HH;
      cam.x = Math.max(-mx, Math.min(mx, cam.x)); cam.y = Math.max(my0, Math.min(my1, cam.y));
      cam.z = Math.max(ZMIN, Math.min(ZMAX, cam.z));
    }
    function focusTile(c, r, z, now) {
      const [x, y] = tileCentre(c, r);
      if (now) { cam.x = x; cam.y = y - 20; if (z) cam.z = snapZ(z); clampCam(); return; }
      cam.tx = x; cam.ty = y - 20; cam.tz = snapZ(z || cam.z);
    }

    /* what stands where: fixed things, then the lots from the game */
    function buildStatics() {
      statics = C.objs.filter((o) => !['pitch-small', 'court', 'helipad', 'platform'].includes(o.k)).map((o) => {
        const w = o.w || 1, d = o.d || 1, point = ['tree', 'pine', 'poplar', 'palm', 'bush', 'lamp', 'bench'].includes(o.k);
        const ax = point ? (o.c - o.r) * HW : (Math.floor(o.c) - Math.floor(o.r)) * HW, ay = point ? (o.c + o.r) * HH : (Math.floor(o.c) + Math.floor(o.r)) * HH;
        return { o: o, ax: ax, ay: ay, depth: point ? o.c + o.r : Math.floor(o.c) + w - 1 + Math.floor(o.r) + d - 1 + 0.9, point: point, w: w, d: d, di: C.dist[C.at(Math.max(0, Math.floor(o.c)), Math.max(0, Math.floor(o.r)))] };
      });
    }
    function rebuildLots() {
      lotObjs = [];
      if (!game) return;
      const TY = root.TY;
      C.DISTRICTS.forEach((d) => {
        const open = TY.unlocked(game, d);
        C.lots[d].forEach((lot, i) => {
          const st = TY.lotState(game, d, i), w = lot.w;
          const o = { d: d, i: i, lot: lot, st: st, open: open, ax: (lot.c - lot.r) * HW, ay: (lot.c + lot.r) * HH, depth: lot.c + lot.r + 2 * (w - 1) + 0.95, w: w };
          if (st.k === 'free' && !open) o.key = null;
          lotObjs.push(o);
        });
      });
      locks = C.DISTRICTS.filter((d) => !TY.unlocked(game, d));
    }
    const faceOf = (lot) => lot.face || 'S';
    // a lot's picture: only as tall as what stands on it (memory on a tablet is precious); the street side
    // is one of the two faces we see, and neighbours' buildings come in 48 looks per district
    const NPC_TALL = { market: 72, high: 80, downtown: 122, skyline: 332 };
    const sideOf = (lot) => (faceOf(lot) === 'S' || faceOf(lot) === 'W' ? 'S' : 'E');
    function lotSprite(o, bucket) {
      const st = o.st, w = o.w, lot = o.lot, side = sideOf(lot);
      const boxH = (h) => [-w * HW - 14, -h, w * HW + (h > 100 ? 58 : 30), 2 * w * HH + 10];
      if (st.k === 'biz' || st.k === 'rival') {
        const id = st.k === 'biz' ? st.b.id : st.rival.bid, accent = (BIZ_STYLE[id] || [])[1] || '#f2c14e', tall = buildingTop(o) + 34;
        return st.k === 'biz' ? sprites.get('biz:' + id + ':' + side + ':' + w, bucket, boxH(tall), (g) => bizBuilding(g, id, w, side, accent, false))
          : sprites.get('riv:' + id + ':' + side + ':' + w, bucket, boxH(tall), (g) => bizBuilding(g, id, w, side, shade(accent, -0.35), true));
      }
      if (st.k === 'npc') {
        const ind = o.d === 'skyline' && (C.feat.skyline[o.i] || {}).industry >= 1, look = 1 + (st.look % 48);
        return sprites.get('npc:' + o.d + ':' + look + ':' + (ind ? 'X' : side), bucket, boxH(NPC_TALL[o.d]), (g) => npcBuilding(g, o.d, look, w, ind ? 'X' : side));
      }
      if (st.k === 'build') return sprites.get('site:' + w + ':' + (st.left > 1 ? 2 : 1), bucket, boxH(w > 1 ? 150 : 72), (g) => siteBuilding(g, w, st.left));
      if (st.k === 'land') return sprites.get('land:' + (game.logoColour || '#f2c14e') + ':' + w, bucket, boxH(40), (g) => { saleSign(g, true, game.logoColour); if (w > 1) pad(g, 0, 0, 2, 2, 'rgba(255,255,255,.15)'); });
      if (st.k === 'free' && o.open) return sprites.get('sale:' + w, bucket, boxH(40), (g) => { if (w > 1) { pad(g, 0, 0, 2, 2, '#cfe6b0'); g.translate(HW * 0, HH); } saleSign(g, false); });
      return null;
    }
    function staticSprite(s, bucket) {
      const o = s.o, k = o.k;
      if (s.point) {
        const v = o.v || 0, sc = o.s || 1;
        const box = k === 'lamp' ? [-6, -24, 8, 4] : k === 'bench' ? [-14, -8, 14, 8] : k === 'bush' ? [-10, -14, 14, 6] : k === 'palm' ? [-20, -44, 24, 8] : [-24 * sc, -48 * sc, 26 * sc, 8 * sc];
        const key = k + ':' + (k === 'tree' ? (v % 37) + ':' + (o.fruit ? 1 : 0) : k === 'bush' ? v % 9 : v % 7) + ':' + sc.toFixed(1) + ':' + (k === 'lamp' || k === 'bench' || k === 'palm' ? '' : season);
        return sprites.get(key, bucket, box, (g) => {
          if (k === 'tree') drawTree(g, v % 37, sc, season, o.fruit);
          else if (k === 'pine') drawPine(g, v, sc, season);
          else if (k === 'poplar') drawPoplar(g, v, sc, season);
          else if (k === 'palm') drawPalm(g);
          else if (k === 'bush') drawBush(g, v % 9, season);
          else if (k === 'lamp') drawLamp(g);
          else if (k === 'bench') drawBench(g, v);
        });
      }
      const w = s.w, d = s.d, box = [-d * HW - 30, -140, w * HW + 90, (w + d) * HH + 12];
      return sprites.get('lm:' + k + ':' + (o.v || 0) + ':' + w + 'x' + d + ':' + (o.r || 0) % 3, bucket, box, (g) => landmark(g, o));
    }

    /* the ground */
    function chunk(cx, cy, bucket) {
      const key = cx + ',' + cy + '@' + bucket + '@' + season;
      let ch = chunks.get(key);
      if (ch) { ch.t = performance.now(); return ch; }
      const c0 = cx * CH, r0 = cy * CH, x0 = (c0 - r0 - CH) * HW - 4, y0 = (c0 + r0) * HH - 4, w = 2 * CH * HW + 8, h = 2 * CH * HH + 8;
      const sc = bucket * DPR(), cv = makeCanvas(w * sc, h * sc), g = cv.getContext('2d');
      g.scale(sc, sc); g.translate(-x0, -y0); g.lineCap = 'round';
      for (let r = r0; r < Math.min(N, r0 + CH); r++) for (let c = c0; c < Math.min(N, c0 + CH); c++) drawTile(g, c, r, season);
      g.save(); g.beginPath();
      for (let r = r0; r < Math.min(N, r0 + CH); r++) for (let c = c0; c < Math.min(N, c0 + CH); c++) { const T = diamond(c, r, 1, 1, 0); g.moveTo(T[0][0], T[0][1]); T.slice(1).forEach((p) => g.lineTo(p[0], p[1])); g.closePath(); }
      g.clip(); drawDecals(g, c0, r0); g.restore();
      ch = { cv: cv, x0: x0, y0: y0, w: w, h: h, t: performance.now() };
      chunks.set(key, ch);
      if (chunks.size > 16) { const old = [...chunks.entries()].sort((a, b) => a[1].t - b[1].t).slice(0, 4); old.forEach(([k]) => chunks.delete(k)); }
      return ch;
    }

    /* traffic and people */
    const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const drivable = (c, r) => { const k = C.get(c, r); return C.inb(c, r) && (k === K.ROAD || k === K.AVENUE || k === K.BRIDGE || k === K.CROSSING); };
    const roadTiles = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (drivable(c, r)) roadTiles.push([c, r]);
    let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const CAR_COLS = ['#e05a5a', '#5aa6dd', '#f2c14e', '#f5f5f5', '#6cc08f', '#f08a3c', '#8a6fd0', '#3d4a5c', '#4fb3b0'];
    function nextDir(c, r, dir) {
      const opts = []; for (let d = 0; d < 4; d++) { if (d === (dir + 2) % 4) continue; if (drivable(c + DIRS[d][0], r + DIRS[d][1])) opts.push(d); }
      if (!opts.length) return (dir + 2) % 4;
      if (opts.includes(dir) && rnd() < 0.62) return dir;
      return opts[Math.floor(rnd() * opts.length)];
    }
    function spawnAgents() {
      agents.cars = []; agents.peds = [];
      for (let i = 0; i < 70; i++) {
        const [c, r] = roadTiles[Math.floor(rnd() * roadTiles.length)], dir = nextDir(c, r, Math.floor(rnd() * 4));
        const bus = i % 9 === 0, truck = i % 13 === 5;
        agents.cars.push({ c: c, r: r, dir: dir, t: rnd(), sp: bus ? 0.55 : 0.85 + rnd() * 0.35, col: bus ? '#f2c14e' : truck ? '#f4f4f4' : CAR_COLS[i % CAR_COLS.length], type: bus ? 'bus' : truck ? 'truck' : 'car' });
      }
      for (let i = 0; i < 150; i++) {
        const [c, r] = roadTiles[Math.floor(rnd() * roadTiles.length)];
        agents.peds.push({ c: c, r: r, dir: Math.floor(rnd() * 4), t: rnd(), sp: 0.22 + rnd() * 0.12, side: rnd() < 0.5 ? 1 : -1, shirt: pick(['#e05a5a', '#5aa6dd', '#f2c14e', '#6cc08f', '#f08aa8', '#8a6fd0', '#ffffff', '#3d4a5c', '#f08a3c'], i), skin: pick(['#f3d2b6', '#e0b08c', '#c68b62', '#8d5a3b', '#f6dcc4'], i * 7), ph: rnd() * 6 });
      }
      // boats keep to open water: the coast on both far edges, the channel by the harbour
      agents.boats = [
        { path: [[1.2, 52], [1.3, 30], [1.1, 14], [1.6, 2], [9, 1.6], [1.6, 2], [1.1, 14], [1.3, 30]], t: 0, sp: 0.55, k: 'ferry' },
        { path: [[1.4, 40], [0.9, 48], [1.5, 54], [0.9, 48]], t: 0, sp: 0.3, k: 'sail' },
        { path: [[16, 1.2], [24, 0.8], [35, 1.3], [24, 0.8]], t: 0.4, sp: 0.3, k: 'sail' },
        { path: [[48, 1.2], [54, 0.9], [50, 1.6], [47.5, 0.9]], t: 0.2, sp: 0.25, k: 'sail' },
        { path: [[11.6, 0.6], [11.6, 6.6], [11.6, 6.6], [11.6, 6.6], [11.6, 0.6], [11.6, 0.6]], t: 0, sp: 0.18, k: 'ship' }
      ];
      agents.planes = [{ phase: 0, t: 0 }];
      agents.trains = [{ x: 60, state: 'in', wait: 0 }];
    }
    function stepCars(dt) {
      for (const a of agents.cars) {
        a.t += dt * a.sp;
        if (a.t >= 1) {
          a.t -= 1; a.c += DIRS[a.dir][0]; a.r += DIRS[a.dir][1];
          if (!drivable(a.c, a.r)) { a.c -= DIRS[a.dir][0]; a.r -= DIRS[a.dir][1]; a.dir = (a.dir + 2) % 4; }
          a.dir2 = a.dir; a.dir = nextDir(a.c, a.r, a.dir);
        }
      }
    }
    function stepPeds(dt) {
      for (const p of agents.peds) {
        p.t += dt * p.sp; p.ph += dt * 9;
        if (p.t >= 1) { p.t -= 1; p.c += DIRS[p.dir][0]; p.r += DIRS[p.dir][1]; if (!drivable(p.c, p.r)) { p.c -= DIRS[p.dir][0]; p.r -= DIRS[p.dir][1]; p.dir = (p.dir + 2) % 4; } p.dir = nextDir(p.c, p.r, p.dir); }
      }
    }
    // customers walk from the pavement into one of the company's businesses, and out again
    function stepCustomers(dt) {
      if (!game || clock.night > 0.5) { agents.cust.length = 0; return; }
      const busy = root.TY.DAYW[Math.max(0, Math.min(13, Math.floor(clock.h)))] * 14;
      lotObjs.forEach((o) => {
        if (o.st.k !== 'biz' && o.st.k !== 'rival') return;
        const rate = (o.st.k === 'rival' ? 0.15 : 0.32) * busy * (o.w > 1 ? 2.2 : 1);
        if (rnd() < rate * dt && agents.cust.length < 140) {
          const f = faceOf(o.lot), w = o.w, door = f === 'S' || f === 'W' ? [o.lot.c + w / 2, o.lot.r + w + 0.05] : [o.lot.c + w + 0.05, o.lot.r + w / 2];
          const out = f === 'S' || f === 'W' ? [door[0] + (rnd() - 0.5) * 1.6, door[1] + 0.45] : [door[0] + 0.45, door[1] + (rnd() - 0.5) * 1.6];
          const inbound = rnd() < 0.55;
          agents.cust.push({ a: inbound ? out : door, b: inbound ? door : out, t: 0, sp: 0.5 + rnd() * 0.3, shirt: pick(['#e05a5a', '#5aa6dd', '#f2c14e', '#6cc08f', '#f08aa8', '#8a6fd0'], Math.floor(rnd() * 99)), skin: pick(['#f3d2b6', '#e0b08c', '#c68b62', '#8d5a3b'], Math.floor(rnd() * 9)), ph: 0 });
        }
      });
      for (let i = agents.cust.length - 1; i >= 0; i--) { const p = agents.cust[i]; p.t += dt * p.sp; p.ph += dt * 9; if (p.t >= 1) agents.cust.splice(i, 1); }
    }
    function carPos(a) {
      const d0 = a.dir2 === undefined ? a.dir : a.dir2, [dc, dr] = DIRS[a.dir];
      const lane = 0.2, rc = -dr * lane, rr = dc * lane;   // drive on the right
      const c = a.c + 0.5 + dc * a.t + rc, r = a.r + 0.5 + dr * a.t + rr;
      return { c: c, r: r, dir: a.dir, d0: d0 };
    }
    function pedPos(p) {
      const [dc, dr] = DIRS[p.dir], off = 0.4 * p.side;
      return { c: p.c + 0.5 + dc * p.t - dr * off, r: p.r + 0.5 + dr * p.t + dc * off };
    }
    function drawCar(g, a, Z) {
      const q = carPos(a), x = (q.c - q.r) * HW, y = (q.c + q.r) * HH, along = q.dir % 2 === 0;
      const L = a.type === 'bus' ? 0.62 : a.type === 'truck' ? 0.46 : 0.34, Wd = a.type === 'bus' ? 0.2 : 0.18, h = a.type === 'bus' ? 9 : a.type === 'truck' ? 8 : 5;
      g.save(); g.translate(x, y);
      const c0 = along ? -L / 2 : -Wd / 2, r0 = along ? -Wd / 2 : -L / 2, w = along ? L : Wd, d = along ? Wd : L;
      poly(g, diamond(c0 + 0.03, r0 + 0.03, w, d, 0), 'rgba(0,0,0,.18)');
      box(g, c0, r0, w, d, 1.5, h, shade(a.col, 0.18), a.col, shade(a.col, -0.22));
      if (a.type === 'car') box(g, c0 + w * 0.22, r0 + d * 0.15, w * 0.56, d * 0.7, 1.5 + h, 3.6, '#e8f2f8', '#9fc7e0', '#86afc8');
      else if (a.type === 'bus') { windows(g, c0, r0, w, d, 1.5, h, 1, along ? 6 : 1, along ? 1 : 6, '#cfe6f4', '#b8d4e6', 0.6, 0.55); }
      else box(g, c0 + (along ? (q.dir === 0 ? w * 0.72 : 0) : 0), r0 + (!along ? (q.dir === 1 ? d * 0.72 : 0) : 0), along ? w * 0.28 : w, along ? d : d * 0.28, 1.5, h, '#f2c14e', '#e0b03c', '#c89c30');
      if (clock.night > 0.3) { const fr = P(q.dir === 0 ? c0 + w : q.dir === 2 ? c0 : 0, q.dir === 1 ? r0 + d : q.dir === 3 ? r0 : 0, 3); circle(g, fr[0], fr[1], 2.2, 'rgba(255,240,180,.9)'); }
      g.restore();
    }
    function drawPerson(g, c, r, shirt, skin, ph) {
      const x = (c - r) * HW, y = (c + r) * HH, bob = Math.abs(Math.sin(ph)) * 0.8;
      ellipse(g, x + 1, y, 2.6, 1.2, 'rgba(0,0,0,.16)');
      line(g, [[x - 0.8, y - 3], [x - 0.8 + Math.sin(ph) * 0.8, y]], '#4b4f5a', 1); line(g, [[x + 0.8, y - 3], [x + 0.8 - Math.sin(ph) * 0.8, y]], '#4b4f5a', 1);
      g.fillStyle = shirt; g.fillRect(x - 1.7, y - 7.4 - bob, 3.4, 4.6);
      circle(g, x, y - 9 - bob, 1.6, skin);
    }

    /* the frame */
    function resize() {
      const rc = canvas.getBoundingClientRect(), dpr = DPR();
      W = Math.max(1, rc.width); H = Math.max(1, rc.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    function lighting() {   // tint and how lit the windows are, from the clock
      const h = clock.h, n = clock.night;
      if (n > 0) return { tint: 'rgba(40,52,120,' + (0.42 * n + 0.08) + ')', lights: Math.min(1, 0.4 + n) };
      if (h < 1) return { tint: 'rgba(255,190,140,' + (0.16 * (1 - h)) + ')', lights: 0.3 * (1 - h) };
      if (h > 10) { const k = Math.min(1, (h - 10) / 4); return { tint: k < 0.5 ? 'rgba(255,170,100,' + (0.08 + k * 0.2) + ')' : 'rgba(' + Math.round(255 - (k - 0.5) * 360) + ',' + Math.round(170 - (k - 0.5) * 200) + ',' + Math.round(100 + (k - 0.5) * 60) + ',' + (0.18 + (k - 0.5) * 0.24) + ')', lights: Math.max(0, (k - 0.45) * 1.6) }; }
      return { tint: null, lights: 0 };
    }
    function frame(t) {
      if (!running) return;
      requestAnimationFrame(frame);
      const dt = Math.min(0.1, (t - (lastT || t)) / 1000); lastT = t;
      if (canvas.clientWidth !== Math.round(W) || canvas.clientHeight !== Math.round(H)) resize();
      // camera moves: a fly-to target, or the glide after a drag
      if (cam.tx !== null) {
        const k = 1 - Math.pow(0.0015, dt);
        cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k; cam.z += (cam.tz - cam.z) * k;
        if (Math.abs(cam.tx - cam.x) < 0.5 && Math.abs(cam.ty - cam.y) < 0.5 && Math.abs(cam.tz - cam.z) < 0.002) { cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; cam.tx = cam.ty = cam.tz = null; }
      } else if (!drag && (Math.abs(cam.vx) > 1 || Math.abs(cam.vy) > 1)) {
        cam.x -= cam.vx * dt / cam.z; cam.y -= cam.vy * dt / cam.z; cam.vx *= Math.pow(0.02, dt); cam.vy *= Math.pow(0.02, dt);
      }
      clampCam();
      stepCars(dt); stepPeds(dt); stepCustomers(dt);
      const t1 = performance.now(); draw(t); stats.ms = stats.ms * 0.9 + (performance.now() - t1) * 0.1; stats.frames++;
      if (opts.onFrame) opts.onFrame(dt);
    }
    function draw(t) {
      const dpr = DPR(), Z = cam.z * dpr, ox = Math.round(W / 2 * dpr - cam.x * Z), oy = Math.round(H / 2 * dpr - cam.y * Z), bucket = bucketOf(cam.z), sec = Math.max(0, (t - T0) / 1000);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, 0, canvas.height); bg.addColorStop(0, '#cfe9f6'); bg.addColorStop(1, '#e9f3ec');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(Z, 0, 0, Z, ox, oy);
      const [vx0, vy0] = toWorld(0, 0), [vx1, vy1] = toWorld(W, H);
      // a still map at a zoom step copies its painted pieces 1:1 on whole pixels (the fast way); while zooming they stretch
      const exact = Math.abs(bucket - cam.z) < 1e-3;
      const blit = (cv, wx, wy, ww, wh) => {
        if (exact) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(cv, Math.round(wx * Z + ox), Math.round(wy * Z + oy)); ctx.setTransform(Z, 0, 0, Z, ox, oy); }
        else ctx.drawImage(cv, wx, wy, ww, wh);
      };
      // the island's sides (a diorama edge) along the two near edges
      const sideH = 46;
      ctx.beginPath(); const L0 = P(0, N), B0 = P(N, N), R0 = P(N, 0);
      ctx.moveTo(L0[0], L0[1]); ctx.lineTo(B0[0], B0[1]); ctx.lineTo(B0[0], B0[1] + sideH); ctx.lineTo(L0[0], L0[1] + sideH); ctx.closePath(); ctx.fillStyle = '#b48a62'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(B0[0], B0[1]); ctx.lineTo(R0[0], R0[1]); ctx.lineTo(R0[0], R0[1] + sideH); ctx.lineTo(B0[0], B0[1] + sideH); ctx.closePath(); ctx.fillStyle = '#9a7452'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(L0[0], L0[1] + 6); ctx.lineTo(B0[0], B0[1] + 6); ctx.lineTo(R0[0], R0[1] + 6); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.stroke();
      // ground chunks in view
      for (let cy = 0; cy < NCH; cy++) for (let cx = 0; cx < NCH; cx++) {
        const c0 = cx * CH, r0 = cy * CH, x0 = (c0 - r0 - CH) * HW, x1 = (c0 - r0 + CH) * HW, y0 = (c0 + r0) * HH, y1 = (c0 + r0 + 2 * CH) * HH;
        if (x1 < vx0 - 10 || x0 > vx1 + 10 || y1 < vy0 - 10 || y0 > vy1 + 10) continue;
        const ch = chunk(cx, cy, bucket);
        blit(ch.cv, ch.x0, ch.y0, ch.w, ch.h);
      }
      // locked districts: a light veil on their ground
      locks.forEach((d) => { ctx.fillStyle = 'rgba(255,255,255,.16)'; districtPath(d); ctx.fill(); });
      // everything that stands up, back to front
      const list = [], margin = 160, small = cam.z < 0.5;
      const inView = (x, y, up) => x > vx0 - margin && x < vx1 + margin && y + 40 > vy0 && y - (up || 0) < vy1 + 40;   // up: how tall it stands
      for (const s of statics) {
        if (small && (s.o.k === 'bench' || s.o.k === 'lamp' || s.o.k === 'bush')) continue;
        if (inView(s.ax, s.ay + 20, s.point ? 60 : 160)) list.push(s);
      }
      for (const o of lotObjs) if (inView(o.ax, o.ay + 2 * o.w * HH, o.w > 1 ? 330 : 170)) list.push(o);
      const movers = [];
      if (cam.z > 0.38) {
        for (const a of agents.cars) { const q = carPos(a), x = (q.c - q.r) * HW, y = (q.c + q.r) * HH; if (inView(x, y)) movers.push({ car: a, depth: q.c + q.r }); }
        if (cam.z > 0.55) {
          for (const p of agents.peds) { const q = pedPos(p), x = (q.c - q.r) * HW, y = (q.c + q.r) * HH; if (inView(x, y)) movers.push({ ped: p, q: q, depth: q.c + q.r }); }
          for (const p of agents.cust) { const c = p.a[0] + (p.b[0] - p.a[0]) * p.t, r = p.a[1] + (p.b[1] - p.a[1]) * p.t; movers.push({ cust: p, c: c, r: r, depth: c + r }); }
        }
      }
      for (const m of movers) list.push(m);
      list.sort((a, b) => a.depth - b.depth);
      for (const it of list) {
        if (it.car) { drawCar(ctx, it.car, Z); continue; }
        if (it.ped) { drawPerson(ctx, it.q.c, it.q.r, it.ped.shirt, it.ped.skin, it.ped.ph); continue; }
        if (it.cust) { drawPerson(ctx, it.c, it.r, it.cust.shirt, it.cust.skin, it.cust.ph); continue; }
        const sp = it.o ? staticSprite(it, bucket) : lotSprite(it, bucket);
        if (!sp) continue;
        blit(sp.cv, it.ax + sp.x0, it.ay + sp.y0, sp.w, sp.h);
        if (it.o && it.o.k === 'windmill') drawBlades(ctx, it, sec);
        if (it.o && it.o.k === 'fountain') drawSpray(ctx, it, sec);
        if (it.st && it.st.k === 'biz' && it.st.b.id === 'themepark') drawWheel(ctx, it, sec);
      }
      drawBoats(ctx, sec); drawTrain(ctx, sec); drawPlanes(ctx, sec);
      // lots to pick from glow green, the selected lot gold: outlines over everything
      const ring = (lot, fill, stroke, a, grow) => { const pts = diamond(lot.c - grow, lot.r - grow, lot.w + 2 * grow, lot.w + 2 * grow, 0); ctx.save(); ctx.globalAlpha = a * 0.35; poly(ctx, pts, fill); ctx.globalAlpha = a; line(ctx, pts.concat([pts[0]]), stroke, 2.6); ctx.restore(); };
      if (pickMode) pickMode.lots.forEach((i) => ring(C.lots[pickMode.d][i], '#3ee08a', '#1fa862', 0.65 + 0.3 * Math.sin(sec * 4), 0.02));
      if (sel && C.lots[sel.d] && C.lots[sel.d][sel.i]) ring(C.lots[sel.d][sel.i], '#ffd45a', '#f2a91a', 0.7 + 0.3 * Math.sin(sec * 5), 0.06);
      // light: the time of day over everything, then lamps and windows at dusk
      const li = lighting();
      if (li.tint) {
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = li.tint; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
      }
      if (li.lights > 0.02) drawLights(ctx, list, li.lights, sec);
      // labels, badges and money in screen pixels
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBadges(ctx, sec);
      drawPops(ctx, t);
      drawLabels(ctx);
    }
    function districtPath(d) {
      ctx.beginPath();
      const di = DIST_I[d];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (C.dist[C.at(c, r)] !== di) continue;
        const T = diamond(c, r, 1, 1, 0); ctx.moveTo(T[0][0], T[0][1]); T.slice(1).forEach((p) => ctx.lineTo(p[0], p[1])); ctx.closePath();
      }
    }
    function drawBlades(g, it, sec) {
      const p = P(Math.floor(it.o.c) + 0.5, Math.floor(it.o.r) + 0.5, 46); const x = p[0], y = p[1] + 0, a = sec * 0.9;
      for (let i = 0; i < 4; i++) { const an = a + i * Math.PI / 2, ex = x + Math.cos(an) * 22, ey = y + Math.sin(an) * 22; line(g, [[x, y], [ex, ey]], '#7a5a3e', 1.4); poly(g, [[x + Math.cos(an) * 6, y + Math.sin(an) * 6], [ex, ey], [ex + Math.cos(an + 1.57) * 5, ey + Math.sin(an + 1.57) * 5], [x + Math.cos(an) * 6 + Math.cos(an + 1.57) * 5, y + Math.sin(an) * 6 + Math.sin(an + 1.57) * 5]], 'rgba(250,246,236,.92)'); }
      circle(g, x, y, 2, '#5d4a3a');
    }
    function drawSpray(g, it, sec) {
      const p = P(Math.floor(it.o.c) + 0.5, Math.floor(it.o.r) + 0.5, 14);
      for (let i = 0; i < 8; i++) { const ph = (sec * 1.4 + i / 8) % 1, ang = i * 0.8, dx = Math.cos(ang) * 10 * ph, dy = -14 * ph + 22 * ph * ph; circle(g, p[0] + dx, p[1] + dy, 1.2, 'rgba(200,235,250,' + (1 - ph) + ')'); }
    }
    function drawWheel(g, it, sec) {
      const p = P(it.lot.c + 1.35, it.lot.r + 0.6, 40), R = 24, a = sec * 0.4;
      g.strokeStyle = '#8a8f9a'; g.lineWidth = 1.2; g.beginPath(); g.arc(p[0], p[1], R, 0, 7); g.stroke();
      for (let i = 0; i < 8; i++) { const an = a + i * Math.PI / 4, ex = p[0] + Math.cos(an) * R, ey = p[1] + Math.sin(an) * R; line(g, [p, [ex, ey]], 'rgba(138,143,154,.8)', 0.7); g.fillStyle = pick(AWN, i); g.fillRect(ex - 2.6, ey, 5.2, 4.2); }
    }
    function drawBoats(g, sec) {
      for (const b of agents.boats) {
        const seg = b.path.length - 1, tt = (sec * b.sp * 0.05) % seg, i = Math.floor(tt), f = tt - i, a = b.path[i], c = b.path[(i + 1) % b.path.length];
        const bc = a[0] + (c[0] - a[0]) * f, br = a[1] + (c[1] - a[1]) * f, x = (bc - br) * HW, y = (bc + br) * HH, dx = (c[0] - c[1]) - (a[0] - a[1]) >= 0 ? 1 : -1;
        b.t = tt;
        ellipse(g, x, y + 3, b.k === 'ship' ? 34 : 16, b.k === 'ship' ? 8 : 4, 'rgba(255,255,255,.35)');
        g.save(); g.translate(x, y); g.scale(dx, 1);
        if (b.k === 'ferry') { poly(g, [[-18, -3], [18, -3], [14, 4], [-15, 4]], '#ffffff'); poly(g, [[-15, 4], [14, 4], [13, 5], [-14, 5]], '#e05a5a'); box(g, -0.2, -0.1, 0.35, 0.2, 3, 6, '#f6f8fa', '#e6eaee', '#cfd6dd'); }
        else if (b.k === 'ship') { poly(g, [[-36, -2], [34, -2], [28, 6], [-32, 6]], '#3d4a5c'); for (let k = 0; k < 6; k++) box(g, -0.5 + k * 0.17, -0.12, 0.14, 0.24, 0, 7, pick(['#e2803e', '#5aa6dd', '#e05a5a', '#42a35a'], k), pick(['#d06f30', '#4895cc', '#cc4848', '#38904e'], k), pick(['#b85f26', '#3d82b5', '#b33d3d', '#2f7a42'], k)); box(g, 0.45, -0.1, 0.1, 0.2, 0, 14, '#ffffff', '#eef1f4', '#d9dfe6'); }
        else { poly(g, [[-9, -1], [9, -1], [6, 3], [-7, 3]], '#ffffff'); line(g, [[0, -1], [0, -20]], '#8a8f9a', 0.8); poly(g, [[1, -19], [1, -2], [10, -3]], '#fdfdfd'); poly(g, [[-1, -17], [-1, -3], [-8, -4]], pick(AWN, Math.floor(b.t * 10 + 3))); }
        g.restore();
      }
    }
    function drawTrain(g, sec) {
      // a train comes in from the hills, waits at the station, and goes back out
      const cyc = 40, ph = sec % cyc;
      let head = ph < 10 ? 58 - (ph / 10) * 27 : ph < 22 ? 31 : 31 + ((ph - 22) / 10) * 27;
      if (ph >= 32) return;
      for (let k = 0; k < 4; k++) {
        const c = head + k * 0.95, r = 25.5;
        if (c > N + 1) continue;
        g.save(); g.translate((c - r) * HW, (c + r) * HH);
        box(g, -0.42, -0.14, 0.84, 0.28, 2, 10, k === 0 ? '#e05a5a' : '#f4f4f4', k === 0 ? '#cc4848' : '#e3e6ea', k === 0 ? '#b33d3d' : '#c9cfd6');
        windows(g, -0.42, -0.14, 0.84, 0.28, 2, 10, 1, 5, 1, '#9fc7e0', '#86afc8', 0.6, 0.5);
        g.restore();
      }
    }
    function drawPlanes(g, sec) {
      // a plane takes off from the island every so often, and another lands
      const cyc = 30, ph = sec % cyc;
      if (ph > 16) return;
      const t = ph / 16, c = 2 + t * 18, r = 4.5 - Math.max(0, t - 0.45) * 6, z = Math.max(0, (t - 0.45) * 260);
      const p = P(c, r, 0), q = P(c, r, z), k = 0.55 + Math.min(0.5, z / 300);
      ellipse(g, p[0], p[1] + 2, 20 * 0.55, 5 * 0.55, 'rgba(0,0,0,' + Math.max(0, 0.18 - z / 900) + ')');
      drawPlane(g, q[0], q[1], k, '#5aa6dd');
    }
    function drawLights(g, list, k, sec) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const it of list) {
        if (it.o && it.o.k === 'lamp') { const p = [it.ax + 4.5, it.ay - 18.5]; const gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], 14); gr.addColorStop(0, 'rgba(255,214,140,' + 0.55 * k + ')'); gr.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gr; g.fillRect(p[0] - 14, p[1] - 14, 28, 28); continue; }
        if (it.o && it.o.k === 'lighthouse') { const p = [it.ax, it.ay + HH - 75]; const a = sec * 1.6; g.save(); g.translate(p[0], p[1]); g.rotate(a); const gr = g.createLinearGradient(0, 0, 140, 0); gr.addColorStop(0, 'rgba(255,240,180,' + 0.5 * k + ')'); gr.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(140, -16); g.lineTo(140, 16); g.closePath(); g.fill(); g.restore(); continue; }
        const st = it.st; if (!st || (st.k !== 'npc' && st.k !== 'biz' && st.k !== 'rival')) continue;
        const hgt = it.w > 1 ? 120 : it.d === 'downtown' ? 60 : it.d === 'high' ? 28 : 14, n = it.w > 1 ? 9 : 4, seedv = (st.look || 7) * 13 + it.i;
        for (let j = 0; j < n; j++) {
          if (hash(seedv, j, 4) > 0.6) continue;
          const u = 0.2 + 0.6 * hash(seedv, j, 5), side = hash(seedv, j, 6) < 0.5, z = 6 + hash(seedv, j, 7) * hgt;
          const p = side ? P(it.lot.c + u * it.w, it.lot.r + it.w * 0.9, z) : P(it.lot.c + it.w * 0.9, it.lot.r + u * it.w, z);
          g.fillStyle = 'rgba(255,214,120,' + 0.75 * k + ')'; g.fillRect(it.ax + p[0] - 1.6 - (it.lot.c - it.lot.r) * HW, it.ay + p[1] - 1.4 - (it.lot.c + it.lot.r) * HH, 3.2, 2.8);
        }
      }
      g.restore();
    }
    /* the company's badges: what each business is, a case waiting, a rival */
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
        const r = root.TY.biz(st.k === 'rival' ? st.rival.bid : st.b.id);
        g.font = Math.round(R * 1.15) + 'px ' + EMOJI; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(r ? r.emoji : '?', sx, y + 1);
        if (st.k === 'rival') { g.font = '700 ' + Math.round(R * 0.62) + 'px sans-serif'; g.fillStyle = '#ffffff'; circle(g, sx + R * 0.9, y - R * 0.8, R * 0.5, '#d9534a'); g.fillStyle = '#fff'; g.fillText('VS', sx + R * 0.9, y - R * 0.78); }
        if (st.k === 'biz' && marks.get(st.b.uid) && cam.z >= 0.55) { const by = y - R - 10 - Math.abs(Math.sin(sec * 3)) * 5; circle(g, sx + R * 0.7, by, 9, '#d9534a'); g.font = '11px ' + EMOJI; g.fillText('📨', sx + R * 0.7, by + 1); }
      }
      // lots to pick from show how good the spot is for the business
      if (pickMode && !small) pickMode.lots.forEach((i) => {
        const lot = C.lots[pickMode.d][i], [sx, sy] = toScreen((lot.c - lot.r) * HW, (lot.c + lot.r) * HH + lot.w * HH), st = pickMode.stars[i] || 3;
        g.font = '700 12px sans-serif'; const txt = '★'.repeat(st), tw = g.measureText(txt).width + 10;
        roundRect(g, sx - tw / 2, sy - 30, tw, 17, 8, st >= 4 ? '#2a9f78' : st >= 3 ? '#4f8fd1' : '#8a8fb0');
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, sx, sy - 21);
      });
    }
    function buildingTop(o) {
      const st = o.st, id = st.k === 'biz' ? st.b.id : st.k === 'rival' ? st.rival.bid : '', s = (BIZ_STYLE[id] || ['shop'])[0];
      return { stand: 22, kiosk: 30, tent: 30, kennel: 22, garage: 20, carwash: 24, shop: 36, shop3: 48, truck: 20, flats: 62, glass: 66, vfarm: 84, tower: 128, tower2: 140, hub: 16, depot: 26, market: 28, cinema: 34, factory: 46,
        solar: 10, busdepot: 24, mall: 50, datacentre: 34, themepark: 70, stadium: 32, port: 50, supertower: 300, airhangar: 40, launchpad: 112 }[s] || 40;
    }
    function roundRect(g, x, y, w, h, r, fill) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fillStyle = fill; g.fill(); }
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
        const tw = g.measureText(p.text).width; circle(g, sx + 8 - tw / 2 - 9, y, 6.5, p.good ? '#f2c14e' : '#e0a0a0'); g.fillStyle = p.good ? '#b8860b' : '#a33'; g.font = '800 9px sans-serif'; g.fillText('$', sx + 8 - tw / 2 - 9, y + 0.5);
        g.restore();
      }
    }
    /* district names and lock signs */
    function drawLabels(g) {
      if (!game) return;
      const TY = root.TY;
      C.DISTRICTS.forEach((d) => {
        const [c, r] = C.centers[d], [sx, sy] = toScreen((c - r) * HW, (c + r) * HH), open = TY.unlocked(game, d), dd = TY.district(d);
        if (open && cam.z > 0.6) return;
        if (sx < -120 || sx > W + 120 || sy < -40 || sy > H + 40) return;
        const txt = (open ? '' : '🔒 ') + dd.name, sub = open ? '' : 'Opens at ' + shortMoney(dd.unlock);
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
      if (!C.inb(c, r)) return null;
      const di = C.dist[C.at(c, r)];
      return { kind: 'ground', c: c, r: r, d: di >= 0 ? C.DISTRICTS[di] : null, tile: C.KINDS[C.get(c, r)] };
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
      return best === null ? null : { kind: 'lot', d: pickMode.d, i: best, st: game ? root.TY.lotState(game, pickMode.d, best) : null };
    }
    function badgeAt(sx, sy) { for (let k = badgeHits.length - 1; k >= 0; k--) { const b = badgeHits[k]; if (Math.hypot(sx - b.x, sy - b.y) <= b.r) return { kind: 'lot', d: b.d, i: b.i, st: b.st }; } return null; }
    function tap(sx, sy) { const hit = pickAt(sx, sy) || badgeAt(sx, sy) || hitAt(sx, sy); if (opts.onTap) opts.onTap(hit); }

    /* what the page can do */
    const api = {
      start() { if (running) return; running = true; lastT = 0; resize(); requestAnimationFrame(frame); },
      stop() { running = false; },
      setGame(G) {
        const fresh = game !== G; game = G;
        const s = seasonOf(root.TY.calMonth(G)); if (s !== season) { season = s; }
        rebuildLots();
        marks.clear(); G.inbox.forEach((x) => { if (x.uid) marks.set(x.uid, true); });
        if (fresh) { const b = G.biz[0]; if (b) { const [d, i] = b.plot.split(':'), lot = C.lots[d][+i]; focusTile(lot.c, lot.r, cam.z || 1, true); } else { const [c, r] = C.centers.market; focusTile(c - 4, r - 4, defaultZoom(), true); } }
      },
      refresh() { if (game) api.setGame(game); },
      setClock(c) { clock = c; },
      select(d, i) { sel = d === null || d === undefined ? null : { d: d, i: i }; },
      pick(p) { pickMode = p; },
      pop(uid, amount, text) {
        const b = game && game.biz.find((x) => x.uid === uid); if (!b) return;
        const [d, i] = b.plot.split(':'), lot = C.lots[d][+i], o = lotObjs.find((x) => x.d === d && x.i === +i);
        pops.push({ x: (lot.c - lot.r) * HW, y: (lot.c + lot.r) * HH + lot.w * HH - (o ? buildingTop(o) : 30) - 18, text: text, good: amount >= 0, t0: performance.now() });
        if (pops.length > 80) pops.splice(0, pops.length - 80);
      },
      focus(d, i, z) { if (i === undefined || i === null) { const [c, r] = C.centers[d]; focusTile(c, r, z || Math.max(0.6, cam.z)); } else { const lot = C.lots[d][i]; focusTile(lot.c + lot.w / 2, lot.r + lot.w / 2, z || Math.max(0.9, cam.z)); } },
      zoomBy(f) { const i = BUCKETS.indexOf(snapZ(cam.z)); cam.tx = cam.x; cam.ty = cam.y; cam.tz = BUCKETS[Math.max(0, Math.min(BUCKETS.length - 1, i + (f > 1 ? 1 : -1)))]; },
      whole() { const fit = Math.min(W / (2 * N * HW + 100), H / (2 * N * HH + 200)); cam.tx = 0; cam.ty = N * HH; cam.tz = BUCKETS.filter((b) => b <= Math.max(fit, ZMIN)).pop() || ZMIN; },
      badgeOf(d, i) { const b = badgeHits.find((x) => x.d === d && x.i === i); return b ? [b.x, b.y] : null; },
      screenOfLot(d, i) { const lot = C.lots[d][i]; return toScreen((lot.c - lot.r) * HW, (lot.c + lot.r) * HH + lot.w * HH); },
      hitAt: hitAt, cam: cam, stats: stats, memory() { let px = 0; chunks.forEach((c) => { px += c.cv.width * c.cv.height; }); const sp = sprites.size(); return { chunks: chunks.size, chunkMB: Math.round(px * 4 / 1048576), sprites: sp.n, spriteMB: Math.round(sp.px * 4 / 1048576) }; }, get pops() { return pops.length; }, get agents() { return agents.cars.length + agents.peds.length + agents.cust.length; },
      resize: resize
    };
    function defaultZoom() { return W < 600 ? 0.8 : 1; }
    buildStatics(); spawnAgents(); resize();
    return api;
  };
})(typeof window !== 'undefined' ? window : globalThis);
