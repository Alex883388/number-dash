/* art-kit.js — Tycoon Town's drawing kit (window.TYART): the isometric helpers every picture is made of
   (boxes, roofs, glass walls, domes, cylinders), and the trees and small things of all four cities in every
   season. art-build.js (buildings) and art-land.js (landmarks) add to it; map.js paints with it.
   World units: a tile is 64 x 32; P(c, r, z) is a point c, r tiles from the anchor and z up. */
(function (root) {
  'use strict';
  const A = root.TYART = root.TYART || {};
  const HW = 32, HH = 16, ZH = 8;   // half a tile across, half a tile down, one step of land
  const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; h ^= h >>> 16; return (h >>> 0) / 4294967296; };

  /* ---------- colours ---------- */
  const rgbOf = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  function shade(h, f) {   // f > 0 towards white, f < 0 towards black
    const [r, g, b] = rgbOf(h), k = f < 0 ? 0 : 255, t = Math.abs(f);
    return '#' + [r, g, b].map((x) => Math.round(x + (k - x) * t).toString(16).padStart(2, '0')).join('');
  }
  function mix(a, b, t) { const x = rgbOf(a), y = rgbOf(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
  const pick = (arr, v) => arr[Math.abs(v | 0) % arr.length];

  /* ---------- drawing kit ---------- */
  const P = (c, r, z) => [(c - r) * HW, (c + r) * HH - (z || 0)];
  function poly(g, pts, fill) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fillStyle = fill; g.fill(); }
  function line(g, pts, stroke, w) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.strokeStyle = stroke; g.lineWidth = w || 1; g.stroke(); }
  function circle(g, x, y, rad, fill) { g.beginPath(); g.arc(x, y, Math.max(0.1, rad), 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
  function ellipse(g, x, y, rx, ry, fill) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
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
    const fl = frame || 'rgba(255,255,255,.55)', step = h / Math.max(1, floors);
    for (let f = 1; f < floors; f++) line(g, [P(c, r + d, z + f * step), P(c + w, r + d, z + f * step), P(c + w, r, z + f * step)], fl, 0.7);
    const cols = Math.max(2, Math.round(w * 3));
    for (let k = 1; k < cols; k++) line(g, [P(c + k * w / cols, r + d, z), P(c + k * w / cols, r + d, z + h)], 'rgba(255,255,255,.28)', 0.6);
    const rows = Math.max(2, Math.round(d * 3));
    for (let k = 1; k < rows; k++) line(g, [P(c + w, r + k * d / rows, z), P(c + w, r + k * d / rows, z + h)], 'rgba(255,255,255,.18)', 0.6);
    g.save(); g.beginPath(); const fpts = onL(c, r, w, d, z, h, 0, 1, 0, 1); g.moveTo(...fpts[0]); fpts.slice(1).forEach((p) => g.lineTo(...p)); g.closePath(); g.clip();
    const a = P(c + w * 0.15, r + d, z + h), b = P(c + w * 0.6, r + d, z);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(a[0] + 10, a[1]); g.lineTo(b[0] + 10, b[1]); g.lineTo(b[0], b[1]); g.closePath(); g.fillStyle = 'rgba(255,255,255,.22)'; g.fill();
    g.restore();
    poly(g, diamond(c, r, w, d, z + h), shade(glass, 0.35));
    if (A.flags.snow) snowTop(g, c, r, w, d, z + h);
  }
  // snow on a flat roof (only while A.flags.snow is on: winter in a snowy city)
  function snowTop(g, c, r, w, d, z) {
    if (!A.flags.snow) return;
    poly(g, diamond(c + w * 0.08, r + d * 0.08, w * 0.84, d * 0.84, z + 0.5), 'rgba(250,252,255,.92)');
  }
  // pitched roofs: the ridge runs along c ('c') or along r ('r'); snow sits on them in winter
  function roof(g, c, r, w, d, z, rise, col, along) {
    const lit = shade(col, 0.08), dark = shade(col, -0.2), side = shade(col, -0.32), sn = A.flags.snow;
    if (along === 'c') {
      const a = P(c, r + d / 2, z + rise), b = P(c + w, r + d / 2, z + rise);
      poly(g, [P(c, r, z), P(c + w, r, z), b, a], sn ? '#dfe7ef' : dark);
      poly(g, [P(c + w, r + d, z), P(c + w, r, z), b], side);
      poly(g, [P(c, r + d, z), P(c + w, r + d, z), b, a], lit);
      if (sn) poly(g, [P(c, r + d * 0.88, z + rise * 0.24), P(c + w, r + d * 0.88, z + rise * 0.24), b, a], '#f7fafd');
      line(g, [a, b], sn ? '#ffffff' : shade(col, 0.3), 0.8);
    } else {
      const a = P(c + w / 2, r, z + rise), b = P(c + w / 2, r + d, z + rise);
      poly(g, [P(c, r, z), P(c, r + d, z), b, a], sn ? '#f2f6fa' : shade(col, 0.15));
      poly(g, [P(c, r + d, z), P(c + w, r + d, z), b], shade(col, -0.05));
      poly(g, [P(c + w, r + d, z), P(c + w, r, z), a, b], dark);
      if (sn) poly(g, [P(c + w * 0.88, r + d, z + rise * 0.24), P(c + w * 0.88, r, z + rise * 0.24), a, b], '#e6edf4');
      line(g, [a, b], sn ? '#ffffff' : shade(col, 0.3), 0.8);
    }
  }
  function pyramid(g, c, r, w, d, z, rise, col) {
    const apex = P(c + w / 2, r + d / 2, z + rise), sn = A.flags.snow;
    poly(g, [P(c, r, z), P(c + w, r, z), apex], shade(col, -0.25));
    poly(g, [P(c, r, z), P(c, r + d, z), apex], shade(col, 0.12));
    poly(g, [P(c, r + d, z), P(c + w, r + d, z), apex], shade(col, 0.02));
    poly(g, [P(c + w, r + d, z), P(c + w, r, z), apex], shade(col, -0.18));
    if (sn) {
      const k = 0.68, m = (q) => [apex[0] + (q[0] - apex[0]) * k, apex[1] + (q[1] - apex[1]) * k];
      poly(g, [m(P(c, r + d, z)), m(P(c + w, r + d, z)), apex], '#f7fafd');
      poly(g, [m(P(c + w, r + d, z)), m(P(c + w, r, z)), apex], '#e3eaf1');
      poly(g, [m(P(c, r, z)), m(P(c, r + d, z)), apex], '#f1f5f9');
    }
  }
  // a curved east-asian roof: wide eaves that turn up at the corners
  function curvedRoof(g, c, r, w, d, z, rise, col) {
    const ov = 0.12, sn = A.flags.snow, e = [P(c - ov, r - ov, z), P(c + w + ov, r - ov, z), P(c + w + ov, r + d + ov, z), P(c - ov, r + d + ov, z)];
    const a = P(c + w * 0.25, r + d / 2, z + rise), b = P(c + w * 0.75, r + d / 2, z + rise);
    const lift = (p, k) => [p[0], p[1] - (k || 5)];
    const slope = (p0, p1, q1, q0, fill) => { g.beginPath(); g.moveTo(...lift(p0)); g.quadraticCurveTo((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + 2, ...lift(p1)); g.lineTo(...q1); g.lineTo(...q0); g.closePath(); g.fillStyle = fill; g.fill(); };
    slope(e[0], e[1], b, a, sn ? '#dfe7ef' : shade(col, -0.22));
    slope(e[1], e[2], b, b, sn ? '#e8eef4' : shade(col, -0.3));
    slope(e[3], e[2], b, a, sn ? '#f7fafd' : shade(col, 0.06));
    slope(e[0], e[3], a, a, sn ? '#f2f6fa' : shade(col, 0.14));
    line(g, [a, b], sn ? '#ffffff' : shade(col, -0.45), 1.6);
    circle(g, a[0], a[1], 1.4, shade(col, -0.45)); circle(g, b[0], b[1], 1.4, shade(col, -0.45));
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
  // green ground under a building turns white in a snowy winter
  const GREEN = new Set(['#a9d47c', '#cfe6b0', '#d9e9c4', '#b9d98a', '#bfe293', '#c9e3a6', '#c9dfb0', '#dfeec9', '#b9dd8b', '#c9d98a']);
  function pad(g, c, r, w, d, col, edge) {   // what the lot's ground is: paving, a garden...
    poly(g, diamond(c + 0.04, r + 0.04, w - 0.08, d - 0.08, 0), A.flags.snow && GREEN.has(col) ? '#eef3f7' : col);
    if (edge) line(g, [P(c + 0.04, r + 0.04), P(c + w - 0.04, r + 0.04), P(c + w - 0.04, r + d - 0.04), P(c + 0.04, r + d - 0.04), P(c + 0.04, r + 0.04)], edge, 0.8);
  }
  // a cylinder standing on (c, r), rad in tiles
  function cyl(g, c, r, rad, z, h, col, topCol) {
    const b = P(c, r, z), t = P(c, r, z + h), rx = rad * 1.414 * HW, ry = rad * 1.414 * HH;
    const gr = g.createLinearGradient(b[0] - rx, 0, b[0] + rx, 0); gr.addColorStop(0, shade(col, 0.14)); gr.addColorStop(0.55, col); gr.addColorStop(1, shade(col, -0.24));
    g.beginPath(); g.moveTo(b[0] - rx, b[1]); g.ellipse(b[0], b[1], rx, ry, 0, Math.PI, 0, true); g.lineTo(t[0] + rx, t[1]); g.lineTo(t[0] - rx, t[1]); g.closePath(); g.fillStyle = gr; g.fill();
    ellipse(g, t[0], t[1], rx, ry, topCol || shade(col, 0.2));
  }
  // a dome over the screen point (x, y): rx wide, h tall
  function dome(g, x, y, rx, h, col) {
    const gr = g.createRadialGradient(x - rx * 0.35, y - h * 0.75, 1, x, y - h * 0.3, Math.max(rx, h) * 1.1);
    gr.addColorStop(0, shade(col, 0.4)); gr.addColorStop(1, shade(col, -0.22));
    g.beginPath(); g.moveTo(x - rx, y); g.ellipse(x, y, rx, rx * 0.5, 0, Math.PI, 0, true);
    g.bezierCurveTo(x + rx, y - h * 0.8, x + rx * 0.55, y - h, x, y - h); g.bezierCurveTo(x - rx * 0.55, y - h, x - rx, y - h * 0.8, x - rx, y);
    g.closePath(); g.fillStyle = gr; g.fill();
  }
  function roundRect(g, x, y, w, h, r, fill) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fillStyle = fill; g.fill(); }
  // a sign with words on it, flat on a face (L or R) of a box
  function faceText(g, face, c, r, w, d, z, h, txt, bg, fg, size) {
    const pts = face === 'L' ? onL(c, r, w, d, z, h, 0, 1, 0, 1) : onR(c, r, w, d, z, h, 0, 1, 0, 1);
    poly(g, pts, bg);
    const mx = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4, my = (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4;
    g.save(); g.translate(mx, my); g.transform(1, face === 'L' ? 0.5 : -0.5, 0, 1, 0, 0);
    g.fillStyle = fg; g.font = '800 ' + (size || 6) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 0.5);
    g.restore();
  }

  /* ---------- seasons: what trees and the ground look like ---------- */
  // look = { season: 'spring'|'summer'|'autumn'|'winter', snow: winter in a snowy city, dry: a desert city }
  const CROWNS = {   // dark, mid, light
    spring: [['#62a84a', '#86cc5c', '#b3e48a'], ['#5f9f47', '#7fc257', '#a9dc80'], ['#6aae4e', '#8fd062', '#bfe89a']],
    summer: [['#4a9440', '#68bb4b', '#93d76a'], ['#3f8a45', '#5aae4e', '#86cd6c'], ['#56a046', '#78c456', '#a2dd7b']],
    autumn: [['#c96d32', '#eb9446', '#f7bf7c'], ['#c9a12c', '#e8c24c', '#f5dd8a'], ['#b6483a', '#db6a52', '#ee9a82'], ['#a8562e', '#d27a3a', '#efaa6a'], ['#6f9a45', '#8fb957', '#b8d27c']],
    drywinter: [['#5f8f48', '#7aa95a', '#9fc47c'], ['#6a8f4e', '#86aa62', '#a8c584']],
    blossom: [['#e7a1b8', '#f5c3d3', '#fde4ec'], ['#efe2e6', '#fbf2f5', '#ffffff']]
  };
  const crownsOf = (look) => (look.season === 'winter' ? (look.dry ? CROWNS.drywinter : CROWNS.summer) : CROWNS[look.season]);
  function crown(g, x, y, rad, cols) {
    circle(g, x + rad * 0.18, y + rad * 0.15, rad, cols[0]);
    circle(g, x - rad * 0.06, y - rad * 0.05, rad * 0.9, cols[1]);
    circle(g, x - rad * 0.36, y - rad * 0.36, rad * 0.45, cols[2]);
  }
  function treeShadow(g, k, w) { ellipse(g, 7 * k, 1, (w || 13) * k, 5 * k, 'rgba(50,80,40,.2)'); }
  // bare branches for winter, with snow along them in a snowy city
  function bare(g, k, v, snow, col) {
    col = col || '#7a5a40';
    g.fillStyle = col; g.fillRect(-1.6 * k, -14 * k, 3.2 * k, 14 * k);
    const br = [[-1, -12, -9, -24], [0, -13, 0, -30], [1, -12, 9, -25], [0, -18, -6, -28], [0, -19, 7, -29], [-5, -19, -11, -22], [5, -20, 11, -23]];
    br.forEach(([x0, y0, x1, y1], i) => { if (hash(v, i, 3) < 0.15) return; line(g, [[x0 * k, y0 * k], [x1 * k, y1 * k]], col, (i < 3 ? 1.8 : 1) * k); });
    if (snow) br.forEach(([x0, y0, x1, y1], i) => { if (i % 2) return; line(g, [[(x0 * 0.4 + x1 * 0.6) * k, (y0 * 0.4 + y1 * 0.6) * k - 0.8], [x1 * k, y1 * k - 0.8]], 'rgba(255,255,255,.95)', 1.1 * k); });
  }
  function drawTree(g, v, s, look, fruit) {
    const k = s || 1;
    treeShadow(g, k);
    if (look.snow) { bare(g, k, v, true); return; }
    const sets = look.season === 'spring' && v % 4 === 1 ? CROWNS.blossom : crownsOf(look), cols = pick(sets, v * 7 + 3);
    g.fillStyle = '#8a6646'; g.fillRect(-1.6 * k, -11 * k, 3.2 * k, 11 * k);
    if (v % 5 === 0) { crown(g, -5 * k, -17 * k, 8 * k, cols); crown(g, 5 * k, -16 * k, 7.5 * k, cols); crown(g, 0, -24 * k, 8.5 * k, cols); }
    else crown(g, 0, -19 * k, 10 * k, cols);
    if (fruit && look.season !== 'winter') for (let i = 0; i < 6; i++) circle(g, (hash(v, i, 1) - 0.5) * 14 * k, -19 * k + (hash(v, i, 2) - 0.5) * 12 * k, 1.4 * k, look.season === 'autumn' ? '#e8562f' : '#f5c33b');
    if (look.season === 'autumn' && v % 3 === 0) for (let i = 0; i < 5; i++) circle(g, (hash(v, i, 5) - 0.3) * 16 * k, 1 + hash(v, i, 6) * 2, 1.1 * k, pick(['#e8902f', '#d9583a', '#f2c14e'], i + v));
  }
  function drawPine(g, v, s, look) {
    const k = s || 1, dark = look.season === 'winter' && !look.dry ? '#3a7a4c' : '#3c8649', light = look.season === 'winter' && !look.dry ? '#56966a' : '#5aa661';
    ellipse(g, 6 * k, 1, 10 * k, 4 * k, 'rgba(40,70,40,.22)');
    g.fillStyle = '#7a5a3e'; g.fillRect(-1.3 * k, -6 * k, 2.6 * k, 6 * k);
    for (let i = 0; i < 3; i++) {
      const y0 = -5 * k - i * 8 * k, wd = (10 - i * 2.6) * k, ht = 13 * k;
      poly(g, [[0, y0 - ht], [wd, y0], [0, y0 + 1.5 * k]], dark);
      poly(g, [[0, y0 - ht], [-wd, y0], [0, y0 + 1.5 * k]], light);
      if (look.snow) { poly(g, [[0, y0 - ht], [wd * 0.62, y0 - ht * 0.3], [0, y0 - ht * 0.18], [-wd * 0.7, y0 - ht * 0.26]], 'rgba(255,255,255,.95)'); poly(g, [[-wd, y0], [-wd * 0.4, y0 - 2.5 * k], [wd * 0.2, y0 - 1.5 * k], [wd, y0]], 'rgba(255,255,255,.85)'); }
    }
  }
  function drawPoplar(g, v, s, look) {
    const k = s || 1;
    ellipse(g, 6 * k, 1, 9 * k, 3.5 * k, 'rgba(50,80,40,.2)');
    if (look.snow) {
      g.fillStyle = '#7a5a3e'; g.fillRect(-1.2 * k, -34 * k, 2.4 * k, 34 * k);
      for (let i = 0; i < 6; i++) line(g, [[0, (-10 - i * 4) * k], [(i % 2 ? 4 : -4) * k, (-16 - i * 4) * k]], '#7a5a3e', 0.9 * k);
      circle(g, -1 * k, -35 * k, 1.6 * k, '#ffffff');
      return;
    }
    const cols = look.season === 'autumn' ? CROWNS.autumn[1] : pick(crownsOf(look), v);
    g.fillStyle = '#7a5a3e'; g.fillRect(-1.2 * k, -8 * k, 2.4 * k, 8 * k);
    ellipse(g, 1 * k, -24 * k, 6.5 * k, 18 * k, cols[0]);
    ellipse(g, -0.6 * k, -25 * k, 5.6 * k, 17 * k, cols[1]);
    ellipse(g, -2.2 * k, -30 * k, 2.6 * k, 9 * k, cols[2]);
  }
  function drawPalm(g, v) {
    ellipse(g, 8, 1, 11, 4, 'rgba(60,70,40,.2)');
    const lean = ((v || 0) % 3 - 1) * 3;
    g.beginPath(); g.moveTo(-1, 0); g.quadraticCurveTo(-4 + lean, -14, 2 + lean, -28); g.lineWidth = 3; g.strokeStyle = '#9b7652'; g.stroke();
    for (let i = 1; i < 6; i++) line(g, [[-2.4 + lean * i / 6, -i * 4.6], [1.6 + lean * i / 6, -i * 4.6 - 0.6]], '#7f5f40', 0.7);
    const tx = 2 + lean, ty = -28;
    [[-16, -4], [-10, -12], [0, -14], [12, -10], [16, -2], [7, 4], [-8, 4]].forEach(([dx, dy], i) => {
      g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + dx * 0.5, ty + dy - 6, tx + dx, ty + dy + 4); g.lineWidth = 3.2; g.strokeStyle = i % 2 ? '#4f9a44' : '#6dba55'; g.stroke();
    });
    circle(g, tx, ty + 1, 2, '#7a5536');
  }
  function drawBush(g, v, look) {
    const cols = look.season === 'autumn' ? pick([CROWNS.autumn[2], CROWNS.summer[0]], v) : pick(look.season === 'winter' ? CROWNS.drywinter : crownsOf(look), v);
    ellipse(g, 4, 1, 9, 3.5, 'rgba(50,80,40,.18)');
    circle(g, -3, -4, 5, cols[0]); circle(g, 3, -4, 5.5, cols[0]); circle(g, -1, -6, 5, cols[1]); circle(g, -3, -8, 2.4, cols[2]);
    if (look.snow) { ellipse(g, -1, -9, 6, 2.6, '#ffffff'); ellipse(g, 3.5, -7.5, 3, 1.6, '#f4f8fb'); return; }
    if (look.season !== 'winter' && v % 3 === 0) for (let i = 0; i < 4; i++) circle(g, -5 + i * 3, -6 - (i % 2) * 2, 1.2, pick(['#f6d34a', '#f48fb1', '#ffffff'], v + i));
  }
  // the cherry tree: pink in spring, green in summer, orange in autumn, bare in winter
  function drawCherry(g, v, s, look) {
    const k = s || 1;
    ellipse(g, 7 * k, 1, 15 * k, 5.5 * k, 'rgba(60,60,60,.16)');
    if (look.season === 'spring') for (let i = 0; i < 9; i++) circle(g, (hash(v, i, 8) - 0.5) * 30 * k, (hash(v, i, 9) - 0.3) * 6 * k, 1.1 * k, '#f8c6d6');
    if (look.season === 'winter') { bare(g, k, v, look.snow, '#5d4636'); return; }
    g.fillStyle = '#5d4636'; g.fillRect(-1.8 * k, -10 * k, 3.6 * k, 10 * k);
    line(g, [[0, -9 * k], [-8 * k, -16 * k]], '#5d4636', 1.8 * k); line(g, [[0, -9 * k], [8 * k, -17 * k]], '#5d4636', 1.8 * k);
    const cols = look.season === 'spring' ? pick(CROWNS.blossom, v % 5 === 0 ? 1 : 0) : look.season === 'autumn' ? pick([CROWNS.autumn[0], CROWNS.autumn[3]], v) : CROWNS.summer[v % 3];
    crown(g, -8 * k, -18 * k, 7 * k, cols); crown(g, 8 * k, -19 * k, 7.5 * k, cols); crown(g, 0, -23 * k, 9 * k, cols);
    if (look.season === 'spring') for (let i = 0; i < 7; i++) circle(g, (hash(v, i, 10) - 0.5) * 24 * k, -16 * k - hash(v, i, 11) * 14 * k, 1.3 * k, '#ffffff');
  }
  // the japanese maple: layered, and bright red in autumn
  function drawMaple(g, v, s, look) {
    const k = s || 1;
    treeShadow(g, k, 12);
    if (look.season === 'winter') { bare(g, k * 0.9, v, look.snow, '#6a4a3a'); return; }
    const C = look.season === 'autumn' ? pick([['#b8322f', '#dd4a3a', '#f27a5a'], ['#c8492c', '#ec6a3a', '#f8a05a'], ['#a52d3f', '#d0434f', '#ec7a7a']], v)
      : look.season === 'spring' ? pick([['#7aa848', '#9cc65a', '#c8e08a'], ['#a8604a', '#c87a5a', '#e8a07a']], v) : ['#3f8a45', '#5aae4e', '#86cd6c'];
    g.fillStyle = '#6a4a3a'; g.fillRect(-1.4 * k, -10 * k, 2.8 * k, 10 * k);
    [[-6, -13, 8, 4], [6, -15, 8, 4], [0, -19, 9, 4.5], [-3, -24, 6.5, 3.5], [3, -27, 4.5, 2.8]].forEach(([x, y, rx, ry], i) => {
      ellipse(g, x * k, (y + 1) * k, rx * k, ry * k, C[0]); ellipse(g, (x - 0.6) * k, (y - 0.4) * k, rx * 0.86 * k, ry * 0.8 * k, C[1]); ellipse(g, (x - 2) * k, (y - 1.2) * k, rx * 0.4 * k, ry * 0.4 * k, C[2]);
      if (i === 0 && look.season === 'autumn') for (let j = 0; j < 5; j++) circle(g, (hash(v, j, 12) - 0.4) * 18 * k, 1 + hash(v, j, 13) * 2, 1 * k, C[1]);
    });
  }
  // the japanese pine: a leaning trunk and flat clouds of needles
  function drawJPine(g, v, s, look) {
    const k = s || 1, lean = (v % 2 ? 1 : -1);
    ellipse(g, 6 * k, 1, 11 * k, 4 * k, 'rgba(40,70,40,.2)');
    g.beginPath(); g.moveTo(-1.5 * k, 0); g.quadraticCurveTo(lean * 6 * k, -12 * k, lean * 2 * k, -24 * k); g.lineWidth = 2.8 * k; g.strokeStyle = '#6b4f3a'; g.stroke();
    [[lean * 6, -12, 9, 3.4], [-lean * 4, -18, 8, 3], [lean * 2, -25, 7, 3]].forEach(([x, y, rx, ry]) => {
      ellipse(g, x * k, (y + 1.2) * k, rx * k, ry * k, '#2f6b45'); ellipse(g, (x - 0.8) * k, y * k, rx * 0.85 * k, ry * 0.75 * k, '#3f8a55'); ellipse(g, (x - 2.5) * k, (y - 0.8) * k, rx * 0.4 * k, ry * 0.4 * k, '#5aa66a');
      if (look.snow) ellipse(g, (x - 0.5) * k, (y - 1.4) * k, rx * 0.8 * k, ry * 0.45 * k, '#ffffff');
    });
  }
  function drawBamboo(g, v, s, look) {
    const k = s || 1;
    ellipse(g, 5 * k, 1, 10 * k, 3.5 * k, 'rgba(40,70,40,.2)');
    for (let i = 0; i < 6; i++) {
      const x = (i - 2.5) * 2.6 * k + (hash(v, i, 14) - 0.5) * 2 * k, h = (30 + hash(v, i, 15) * 14) * k, bend = (hash(v, i, 16) - 0.5) * 4 * k;
      g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x, -h * 0.6, x + bend, -h); g.lineWidth = 1.5 * k; g.strokeStyle = i % 2 ? '#6aa84a' : '#8cc25c'; g.stroke();
      for (let j = 1; j < 5; j++) line(g, [[x - 0.9 * k, -h * j / 5], [x + 0.9 * k, -h * j / 5]], '#4f8a3a', 0.6 * k);
      for (let j = 0; j < 3; j++) { const yy = -h + j * 5 * k; poly(g, [[x + bend, yy], [x + bend + (j % 2 ? 6 : -6) * k, yy + 2 * k], [x + bend, yy + 1.4 * k]], look.season === 'autumn' ? '#a9b84a' : '#5aa04a'); }
      if (look.snow) circle(g, x + bend, -h, 1.4 * k, '#ffffff');
    }
  }
  function drawCactus(g, v, s, look) {
    const k = s || 1, col = '#5f9a4a', dk = '#4a7f3a';
    ellipse(g, 4 * k, 1, 7 * k, 2.6 * k, 'rgba(90,70,40,.2)');
    roundRect(g, -2.6 * k, -22 * k, 5.2 * k, 22 * k, 2.6 * k, col); g.fillStyle = dk; g.fillRect(0.6 * k, -21 * k, 1.6 * k, 20 * k);
    roundRect(g, -8 * k, -15 * k, 3.4 * k, 9 * k, 1.7 * k, col); g.fillStyle = col; g.fillRect(-6 * k, -8 * k, 4 * k, 2.6 * k);
    if (v % 2) { roundRect(g, 4.6 * k, -18 * k, 3.4 * k, 8 * k, 1.7 * k, col); g.fillStyle = col; g.fillRect(2 * k, -12 * k, 4 * k, 2.6 * k); }
    if (look.season === 'spring') { circle(g, 0, -22.5 * k, 1.6 * k, '#f6e27a'); circle(g, -6.3 * k, -15.4 * k, 1.2 * k, '#f2a0c0'); }
  }
  function drawJoshua(g, v, s) {
    const k = s || 1, bark = '#8a7356';
    ellipse(g, 5 * k, 1, 10 * k, 3.4 * k, 'rgba(90,70,40,.2)');
    line(g, [[0, 0], [0, -12 * k]], bark, 2.6 * k);
    [[-9, -20], [7, -22], [1, -27], [-4, -16]].forEach(([x, y], i) => {
      line(g, [[0, -11 * k], [x * k * 0.6, (y + 5) * k], [x * k, y * k]], bark, 1.6 * k);
      const cx = x * k, cy = y * k;
      for (let j = 0; j < 7; j++) { const a = -Math.PI / 2 + (j - 3) * 0.42; line(g, [[cx, cy], [cx + Math.cos(a) * 4.5 * k, cy + Math.sin(a) * 4.5 * k]], i % 2 ? '#6f8f4a' : '#86a75a', 1 * k); }
    });
  }
  function drawShrub(g, v, look) {
    const cols = look.season === 'spring' ? ['#8aa060', '#a6b874', '#c7d395'] : ['#8f9a6a', '#a7ae7f', '#c4c79c'];
    ellipse(g, 3, 1, 8, 3, 'rgba(90,70,40,.16)');
    circle(g, -3, -3, 3.6, cols[0]); circle(g, 2.5, -3.2, 4, cols[0]); circle(g, -0.5, -5, 3.6, cols[1]); circle(g, -2, -6.4, 1.6, cols[2]);
    if (look.season === 'spring' && v % 2) for (let i = 0; i < 4; i++) circle(g, -4 + i * 2.6, -5.5 - (i % 2) * 1.6, 0.9, '#f2d24e');
  }
  function drawAcacia(g, v, s) {
    const k = s || 1;
    ellipse(g, 8 * k, 1, 16 * k, 4.5 * k, 'rgba(90,70,40,.18)');
    line(g, [[0, 0], [0, -10 * k], [-6 * k, -19 * k]], '#7a5a3e', 1.8 * k); line(g, [[0, -10 * k], [7 * k, -20 * k]], '#7a5a3e', 1.6 * k);
    ellipse(g, 0, -20 * k, 16 * k, 4.2 * k, '#5f8a3a'); ellipse(g, -1 * k, -21.5 * k, 14 * k, 3.4 * k, '#7aa44a'); ellipse(g, -4 * k, -22.6 * k, 6 * k, 1.8 * k, '#9cc26a');
  }
  function drawLamp(g) {
    g.fillStyle = '#5b6170'; g.fillRect(-0.8, -20, 1.6, 20);
    g.fillRect(-0.8, -20, 5, 1.4); circle(g, 4.5, -18.5, 1.8, '#fff6d6');
  }
  function drawLantern(g, v) {   // a stone lantern, or a red paper one on a post
    if (v % 2) { box(g, -0.08, -0.08, 0.16, 0.16, 0, 3, '#b9b4ab', '#a6a198', '#938e85'); g.fillStyle = '#a6a198'; g.fillRect(-1.2, -11, 2.4, 8); box(g, -0.11, -0.11, 0.22, 0.22, 11, 4, '#ece6da', '#d9d2c4', '#c4bcae'); pyramid(g, -0.14, -0.14, 0.28, 0.28, 15, 4, '#8f8a82'); return; }
    g.fillStyle = '#5b4a3a'; g.fillRect(-0.7, -18, 1.4, 18); line(g, [[0, -18], [5, -18]], '#5b4a3a', 1.2);
    ellipse(g, 5, -14, 3, 4, '#e0453a'); g.fillStyle = '#2b2b2b'; g.fillRect(3.4, -18.6, 3.2, 1); g.fillRect(3.4, -10, 3.2, 1);
  }
  function drawBench(g, v) {
    if (v % 2) box(g, -0.22, -0.06, 0.44, 0.12, 0, 3, '#c79a62', '#a97c49', '#8a643b');
    else box(g, -0.06, -0.22, 0.12, 0.44, 0, 3, '#c79a62', '#a97c49', '#8a643b');
  }
  // the size of a point thing's picture around its foot (world units)
  const POINT_BOX = { lamp: [-6, -24, 8, 4], lantern: [-6, -24, 10, 4], bench: [-14, -8, 14, 8], bush: [-10, -16, 14, 6], shrub: [-9, -12, 12, 5], palm: [-24, -46, 28, 8],
    cactus: [-11, -27, 11, 4], joshua: [-14, -34, 14, 4], bamboo: [-14, -48, 18, 5], acacia: [-18, -27, 26, 6], cherry: [-20, -36, 24, 8] };
  const POINT_KINDS = new Set(['tree', 'pine', 'poplar', 'palm', 'bush', 'lamp', 'bench', 'cactus', 'joshua', 'shrub', 'acacia', 'maple', 'jpine', 'bamboo', 'cherry', 'lantern']);
  const EVERGREEN = new Set(['pine', 'palm', 'lamp', 'bench', 'cactus', 'joshua', 'shrub', 'acacia', 'lantern']);   // look the same all year (but pines get snow)
  function drawPoint(g, k, v, sc, look, fruit) {
    if (k === 'tree') drawTree(g, v, sc, look, fruit);
    else if (k === 'pine') drawPine(g, v, sc, look);
    else if (k === 'poplar') drawPoplar(g, v, sc, look);
    else if (k === 'palm') drawPalm(g, v);
    else if (k === 'bush') drawBush(g, v, look);
    else if (k === 'lamp') drawLamp(g);
    else if (k === 'lantern') drawLantern(g, v);
    else if (k === 'bench') drawBench(g, v);
    else if (k === 'cactus') drawCactus(g, v, sc, look);
    else if (k === 'joshua') drawJoshua(g, v, sc);
    else if (k === 'shrub') drawShrub(g, v, look);
    else if (k === 'acacia') drawAcacia(g, v, sc);
    else if (k === 'maple') drawMaple(g, v, sc, look);
    else if (k === 'jpine') drawJPine(g, v, sc, look);
    else if (k === 'bamboo') drawBamboo(g, v, sc, look);
    else if (k === 'cherry') drawCherry(g, v, sc, look);
  }
  function pointBox(k, sc) {
    const b = POINT_BOX[k]; if (b) return b.map((x) => x * Math.max(1, sc || 1));
    const s = sc || 1; return [-26 * s, -50 * s, 28 * s, 9 * s];
  }

  function drawPlane(g, x, y, k, tail) {
    g.save(); g.translate(x, y); g.scale(k, k);
    ellipse(g, 0, 0, 22, 4.5, '#f5f7fa'); ellipse(g, 2, 1.5, 22, 3, '#dfe4ea');
    poly(g, [[-4, 0], [6, 0], [-6, 16], [-12, 16]], '#e6eaf0'); poly(g, [[-4, 0], [6, 0], [-2, -12], [-8, -12]], '#d9dfe6');
    poly(g, [[16, -1], [22, -1], [24, -12], [19, -12]], tail || '#5aa6dd');
    for (let i = 0; i < 6; i++) circle(g, -12 + i * 4, -1.5, 0.9, '#5e6b7d');
    g.restore();
  }

  Object.assign(A, {
    HW, HH, ZH, hash, shade, mix, pick, P, poly, line, circle, ellipse, diamond, box, boxC, onL, onR, windows, glassBox, snowTop, roof, pyramid, curvedRoof,
    awning, door, shadowBox, pad, cyl, dome, roundRect, faceText, CROWNS, drawPoint, pointBox, POINT_KINDS, EVERGREEN, drawPlane, bare,
    flags: A.flags || { snow: false, theme: 'bay' }
  });
})(typeof window !== 'undefined' ? window : globalThis);
