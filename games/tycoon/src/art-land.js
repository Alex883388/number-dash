/* art-land.js — Tycoon Town's landmarks (adds to window.TYART): schools, stations, the port and the airport
   in every city, and each city's own sights: a lighthouse and wind turbines in Seaside Bay; a needle tower, a
   ring museum, a fort and a palm-island hotel in Desert Oasis; a pyramid, a giant sphere, a castle, a big wheel
   and a volcano on Neon City's Strip; a castle on its hill, a pagoda, a floating gate and a red tower in Sakura
   City. Anchor = the top corner of a landmark's footprint (o.w x o.d tiles). A.landTop says how tall each
   stands; A.landMovers where its moving parts are (the map animates those). */
(function (root) {
  'use strict';
  const A = root.TYART;
  const { HW, HH, hash, shade, pick, P, poly, line, circle, ellipse, diamond, box, boxC, onL, onR, windows, glassBox, snowTop, roof, pyramid, curvedRoof, shadowBox, pad, cyl, dome, roundRect, drawPlane } = A;
  const AWN = A.AWN;

  // a lattice tower (Paris, the red tower): legs from the corners rising to the top
  function lattice(g, c, r, w, d, h, col, light, levels) {
    const L = [P(c, r + d, 0), P(c + w, r + d, 0), P(c + w, r, 0), P(c, r, 0)], top = P(c + w / 2, r + d / 2, h);
    const at = (p, t, k) => [p[0] + (top[0] - p[0]) * k, p[1] + (top[1] - p[1]) * k + 0 * t];
    const curve = (k) => 1 - Math.pow(1 - k, 2.2);   // the legs curve in fast near the ground
    [0, 1, 2].forEach((i) => {
      const p = L[i]; g.beginPath(); g.moveTo(p[0], p[1]);
      for (let s = 1; s <= 12; s++) { const k = s / 12, q = [p[0] + (top[0] - p[0]) * curve(k), p[1] + (top[1] - p[1]) * k]; g.lineTo(q[0], q[1]); }
      g.strokeStyle = i === 1 ? shade(col, -0.2) : col; g.lineWidth = 3; g.stroke();
    });
    for (let s = 1; s < 14; s++) {
      const k = s / 14, pts = L.slice(0, 3).map((p) => [p[0] + (top[0] - p[0]) * curve(k), p[1] + (top[1] - p[1]) * k]);
      line(g, pts, s % 2 ? (light || shade(col, 0.25)) : shade(col, -0.1), 0.8);
      if (s < 13) { const nx = L.slice(0, 3).map((p) => [p[0] + (top[0] - p[0]) * curve((s + 1) / 14), p[1] + (top[1] - p[1]) * (s + 1) / 14]); line(g, [pts[0], nx[1]], 'rgba(0,0,0,.18)', 0.5); line(g, [pts[1], nx[2]], 'rgba(0,0,0,.18)', 0.5); }
    }
    (levels || []).forEach((k) => { const pts = L.map((p) => [p[0] + (top[0] - p[0]) * curve(k), p[1] + (top[1] - p[1]) * k]); poly(g, [pts[0], pts[1], pts[2], [pts[2][0] - (pts[1][0] - pts[0][0]), pts[2][1] - (pts[1][1] - pts[0][1])]], shade(col, 0.1)); line(g, [pts[0], pts[1], pts[2]], shade(col, -0.3), 1.2); });
    return top;
  }
  function flag(g, x, y, col) { line(g, [[x, y], [x, y - 14]], '#6b6b6b', 1); poly(g, [[x, y - 14], [x + 9, y - 11], [x, y - 8]], col); }
  // a tiered east-asian tower (the pagoda, the castle keep)
  function tiers(g, c, r, w, d, z, n, hEach, wall, rf, shrink) {
    let cc = c, rr = r, ww = w, dd = d, zz = z;
    for (let i = 0; i < n; i++) {
      boxC(g, cc, rr, ww, dd, zz, hEach, wall);
      if (wall !== '#ffffff') windows(g, cc, rr, ww, dd, zz, hEach, 1, 2, 2, '#3d3a36', '#2f2c29', 0.3, 0.4);
      else windows(g, cc, rr, ww, dd, zz, hEach, 1, 3, 3, '#4a4f58', '#3d424a', 0.25, 0.32);
      curvedRoof(g, cc - 0.08, rr - 0.08, ww + 0.16, dd + 0.16, zz + hEach, 7, rf);
      const k = shrink || 0.12; cc += ww * k; rr += dd * k; ww *= 1 - 2 * k; dd *= 1 - 2 * k; zz += hEach + 5;
    }
    return { c: cc + ww / 2, r: rr + dd / 2, z: zz };
  }

  function landmark(g, o) {
    const k = o.k, w = o.w || 1, d = o.d || 1, sn = A.flags.snow;
    switch (k) {
      /* ---- everywhere ---- */
      case 'school': {
        shadowBox(g, 0.1, 0.1, 1.8, 1.8, 30);
        boxC(g, 0.1, 0.1, 1.8, 1.8, 0, 24, A.flags.theme === 'desert' ? '#f1e2c4' : '#f2dcc0');
        windows(g, 0.1, 0.1, 1.8, 1.8, 0, 24, 2, 6, 6, '#8fb6d6', '#7a9fbf', 0.5, 0.45);
        if (A.flags.theme === 'sakura') curvedRoof(g, 0.02, 0.02, 1.96, 1.96, 24, 12, '#4a5566'); else roof(g, 0.05, 0.05, 1.9, 1.9, 24, 16, '#c96e5a', 'c');
        const p = P(1.95, 0.2, 0); line(g, [p, [p[0], p[1] - 46]], '#8a8f9a', 1.2); poly(g, [[p[0], p[1] - 46], [p[0] + 14, p[1] - 42], [p[0], p[1] - 38]], '#5aa6dd');
        return;
      }
      case 'church': {
        shadowBox(g, 0.2, 0.3, 1.6, 2.4, 40);
        boxC(g, 0.3, 0.6, 1.4, 2.2, 0, 26, '#ece3d0');
        windows(g, 0.3, 0.6, 1.4, 2.2, 4, 18, 1, 2, 5, '#9fb7d6', '#8aa2c2', 0.25, 0.9);
        roof(g, 0.25, 0.55, 1.5, 2.3, 26, 22, '#8fa0b6', 'r');
        boxC(g, 0.65, 0.15, 0.7, 0.6, 0, 50, '#e4dac6');
        pyramid(g, 0.62, 0.12, 0.76, 0.66, 50, 40, '#7d8fa6');
        const p = P(1, 0.45, 96); line(g, [p, [p[0], p[1] - 10]], '#c9a227', 1.2); line(g, [[p[0] - 4, p[1] - 7], [p[0] + 4, p[1] - 7]], '#c9a227', 1.2);
        return;
      }
      case 'clocktower': {
        shadowBox(g, 0.25, 0.25, 0.5, 0.5, 80);
        boxC(g, 0.25, 0.25, 0.5, 0.5, 0, 64, '#e9dcc3');
        [0, 1].forEach((side) => { const pts = side ? onR(0.25, 0.25, 0.5, 0.5, 0, 64, 0.2, 0.8, 0.72, 0.92) : onL(0.25, 0.25, 0.5, 0.5, 0, 64, 0.2, 0.8, 0.72, 0.92); poly(g, pts, '#fffaf0'); });
        pyramid(g, 0.2, 0.2, 0.6, 0.6, 64, 26, '#5f8f7a');
        const c0 = P(0.5, 0.75, 64 * 0.82); line(g, [c0, [c0[0], c0[1] - 4]], '#333', 1); line(g, [c0, [c0[0] + 3, c0[1]]], '#333', 1);
        return;
      }
      case 'library': case 'museum': case 'cityhall': {
        const col = k === 'museum' ? '#ece6da' : k === 'library' ? '#efe2cc' : '#e8e2d6', h = k === 'cityhall' ? 38 : 30;
        shadowBox(g, 0.2, 0.2, w - 0.4, d - 0.4, h + 20);
        box(g, 0.1, 0.1, w - 0.2, d - 0.2, 0, 5, '#ddd5c6', '#cfc6b5', '#bdb3a1');
        boxC(g, 0.3, 0.3, w - 0.6, d - 0.6, 5, h, col);
        for (let i = 0; i < 6; i++) poly(g, onL(0.3, 0.3, w - 0.6, d - 0.6, 5, h - 6, 0.08 + i * 0.16, 0.13 + i * 0.16, 0, 1), '#fbf8f1');
        for (let i = 0; i < 6; i++) poly(g, onR(0.3, 0.3, w - 0.6, d - 0.6, 5, h - 6, 0.08 + i * 0.16, 0.13 + i * 0.16, 0, 1), '#e7e1d6');
        poly(g, diamond(0.3, 0.3, w - 0.6, d - 0.6, h + 5), shade(col, -0.06));
        if (k === 'museum') { const p = P(w / 2, d / 2, h + 5); ellipse(g, p[0], p[1], 24, 12, '#8fc3b8'); ellipse(g, p[0], p[1] - 10, 20, 18, '#9fd0c4'); ellipse(g, p[0] - 6, p[1] - 16, 6, 5, '#c4e6dd'); }
        else if (A.flags.theme === 'sakura') curvedRoof(g, 0.24, 0.24, w - 0.48, d - 0.48, h + 5, 12, '#4a5566');
        else roof(g, 0.28, 0.28, w - 0.56, d - 0.56, h + 5, 14, k === 'library' ? '#b07a5c' : '#7d8fa6', 'c');
        if (k === 'cityhall') { const p = P(w / 2, d / 2, h + 19); line(g, [p, [p[0], p[1] - 22]], '#8a8f9a', 1.2); poly(g, [[p[0], p[1] - 22], [p[0] + 12, p[1] - 18], [p[0], p[1] - 14]], '#e05a5a'); }
        return;
      }
      case 'hospital': {
        shadowBox(g, 0.2, 0.2, w - 0.4, d - 0.4, 60);
        boxC(g, 0.2, 0.2, w - 0.4, d - 0.4, 0, 50, '#f4f6f8');
        windows(g, 0.2, 0.2, w - 0.4, d - 0.4, 0, 50, 5, 8, 8, '#8fc0e0', '#7aaacb', 0.55, 0.5);
        poly(g, diamond(0.2, 0.2, w - 0.4, d - 0.4, 50), '#e3e8ed'); snowTop(g, 0.2, 0.2, w - 0.4, d - 0.4, 50);
        const p = P(w / 2, d / 2, 50); g.fillStyle = '#e05a5a'; g.fillRect(p[0] - 9, p[1] - 3, 18, 6); g.fillRect(p[0] - 3, p[1] - 9, 6, 18);
        return;
      }
      case 'station': {
        shadowBox(g, 0.1, 0.1, w - 0.2, d - 0.2, 40);
        boxC(g, 0.2, 0.2, w - 0.4, 1.4, 0, 26, A.flags.theme === 'sakura' ? '#eef0f2' : '#efe2cc');
        windows(g, 0.2, 0.2, w - 0.4, 1.4, 0, 26, 2, 10, 3, '#8fb6d6', '#7a9fbf', 0.5, 0.5);
        if (A.flags.theme === 'sakura') { poly(g, diamond(0.2, 0.2, w - 0.4, 1.4, 26), '#d9dee4'); snowTop(g, 0.2, 0.2, w - 0.4, 1.4, 26); } else roof(g, 0.15, 0.15, w - 0.3, 1.5, 26, 12, A.flags.theme === 'desert' ? '#d9b45a' : '#b07a5c', 'c');
        if (d >= 2) {   // the glass train shed
          const a = P(0.2, d - 1, 0), b = P(w - 0.2, d - 1, 0), a2 = P(0.2, d - 0.1, 0), b2 = P(w - 0.2, d - 0.1, 0);
          g.beginPath(); g.moveTo(a[0], a[1] - 4); g.quadraticCurveTo((a[0] + a2[0]) / 2, (a[1] + a2[1]) / 2 - 40, a2[0], a2[1] - 4);
          g.lineTo(b2[0], b2[1] - 4); g.quadraticCurveTo((b[0] + b2[0]) / 2, (b[1] + b2[1]) / 2 - 40, b[0], b[1] - 4); g.closePath();
          g.fillStyle = sn ? 'rgba(240,246,250,.85)' : 'rgba(190,220,240,.75)'; g.fill(); g.strokeStyle = '#8fa0b6'; g.lineWidth = 1; g.stroke();
        }
        return;
      }
      case 'terminal': {
        shadowBox(g, 0.1, 0.1, w - 0.2, d - 0.2, 30);
        glassBox(g, 0.1, 0.1, w - 0.2, d - 0.2, 0, 22, '#bfe0f0', 3);
        g.beginPath(); const p = P(0.1, d - 0.1, 22), q = P(w - 0.1, d - 0.1, 22); g.moveTo(p[0], p[1]); g.quadraticCurveTo((p[0] + q[0]) / 2, p[1] - 18, q[0], q[1]); g.lineTo(q[0], q[1] - 2); g.lineTo(p[0], p[1] - 2); g.fillStyle = '#e8ecf0'; g.fill();
        return;
      }
      case 'terminal2': {   // a big airport terminal: glass, a wave of a roof, jet bridges
        shadowBox(g, 0.15, 0.15, w - 0.3, d - 0.3, 40);
        glassBox(g, 0.15, 0.2, w - 0.3, d - 0.6, 0, 24, A.flags.theme === 'desert' ? '#d9e4e8' : '#c3e2f0', 3);
        const along = w >= d, n = Math.max(2, Math.round((along ? w : d) / 1.3));
        g.beginPath(); g.moveTo(...P(0.05, 0.1, 24)); g.quadraticCurveTo(...P(w / 2, 0.1, 46), ...P(w - 0.05, 0.1, 24)); g.lineTo(...P(w - 0.05, d - 0.35, 24)); g.quadraticCurveTo(...P(w / 2, d - 0.35, 46), ...P(0.05, d - 0.35, 24)); g.closePath(); g.fillStyle = sn ? '#f6f9fc' : '#f4f6f8'; g.fill();
        line(g, [P(0.05, d - 0.35, 24), P(w / 2, d - 0.35, 35), P(w - 0.05, d - 0.35, 24)], '#9aa6b2', 1);
        for (let i = 0; i < n; i++) box(g, 0.4 + i * (w - 0.8) / Math.max(1, n - 1) - 0.06, d - 0.4, 0.12, 0.38, 8, 4, '#e6eaee', '#d9dfe6', '#c3cad3');
        return;
      }
      case 'ctower': {
        shadowBox(g, 0.35, 0.35, 0.3, 0.3, 70);
        boxC(g, 0.38, 0.38, 0.24, 0.24, 0, 54, '#eef1f4');
        glassBox(g, 0.28, 0.28, 0.44, 0.44, 54, 10, '#7fbfe0', 1);
        poly(g, diamond(0.26, 0.26, 0.48, 0.48, 64), '#c3c9d1');
        return;
      }
      case 'hangar': {
        roof(g, 0.1, 0.1, w - 0.2, d - 0.2, 14, 12, '#a9b5c2', 'c');
        boxC(g, 0.1, 0.1, w - 0.2, d - 0.2, 0, 14, '#e6eaee');
        poly(g, onL(0.1, 0.1, w - 0.2, d - 0.2, 0, 14, 0.1, 0.9, 0, 0.9), '#6b7788');
        return;
      }
      case 'crane': {   // a container crane on the quay, its boom over the water
        const base = P(0.5, 0.5, 0), top = 58, f = o.face, end = f === 'c' ? P(2.3, 0.5, top + 4) : f === 'r' ? P(0.5, -1.3, top + 4) : P(-1.3, 0.5, top + 4);
        line(g, [[base[0] - 8, base[1] + 3], [base[0] - 8, base[1] - top]], '#e2803e', 2.4); line(g, [[base[0] + 8, base[1] - 1], [base[0] + 8, base[1] - top]], '#d06f30', 2.4);
        line(g, [[base[0] - 8, base[1] - top], [base[0] + 8, base[1] - top]], '#e2803e', 2.2);
        const back = f === 'c' ? P(-0.2, 0.5, top) : f === 'r' ? P(0.5, 1.2, top) : P(1.2, 0.5, top);
        line(g, [back, end], '#e2803e', 2.2);
        line(g, [[base[0], base[1] - top], [base[0], base[1] - top - 16]], '#d06f30', 1.2); line(g, [[base[0], base[1] - top - 16], end], '#d06f30', 0.8); line(g, [[base[0], base[1] - top - 16], back], '#d06f30', 0.8);
        box(g, 0.25, 0.25, 0.5, 0.5, top - 8, 7, '#f2f4f7', '#e2e6ea', '#c9cfd6');
        return;
      }
      case 'containers': { A.containerBox(g, 0.15, 0.25, 0, 1 + ((o.v || 0) % 3), o.v || 0); if (sn) poly(g, diamond(0.17, 0.27, 0.36, 0.16, 7 * (1 + ((o.v || 0) % 3)) + 0.4), 'rgba(250,252,255,.9)'); return; }
      case 'helipad': return;
      case 'lighthouse': {
        ellipse(g, P(0.5, 0.5)[0], P(0.5, 0.5)[1], 24, 12, '#9aa1a9');
        for (let i = 0; i < 5; i++) boxC(g, 0.38 + i * 0.01, 0.38 + i * 0.01, 0.24 - i * 0.02, 0.24 - i * 0.02, i * 14, 14, i % 2 ? '#e05a5a' : '#fbf8f2');
        glassBox(g, 0.4, 0.4, 0.2, 0.2, 70, 9, '#fff3b0', 1);
        pyramid(g, 0.36, 0.36, 0.28, 0.28, 79, 10, '#e05a5a');
        return;
      }
      case 'farmhouse': {
        if (o.jp) {   // a thatched minka
          pad(g, 0, 0, 1, 1, '#c9d98a');
          boxC(g, 0.2, 0.25, 0.6, 0.5, 0, 11, '#e9dcc0');
          for (let i = 0; i < 4; i++) poly(g, onL(0.2, 0.25, 0.6, 0.5, 0, 11, 0.05 + i * 0.24, 0.12 + i * 0.24, 0, 1), '#6b4a30');
          roof(g, 0.1, 0.15, 0.8, 0.7, 11, 18, sn ? '#c9b48a' : '#a88a58', 'c');
          return;
        }
        pad(g, 0, 0, w, d, '#a9d47c');
        shadowBox(g, 0.3, 0.3, 1.4, 1.2, 36);
        boxC(g, 0.3, 0.3, 1.4, 1.2, 0, 22, '#f4ead6');
        windows(g, 0.3, 0.3, 1.4, 1.2, 0, 22, 2, 4, 3, '#8fb6d6', '#7a9fbf', 0.4, 0.45);
        roof(g, 0.25, 0.25, 1.5, 1.3, 22, 18, '#b9644e', 'c');
        return;
      }
      case 'barn': {
        shadowBox(g, 0.2, 0.3, 1.6, 1.3, 40);
        boxC(g, 0.2, 0.3, 1.6, 1.3, 0, 22, '#c4553f');
        poly(g, onL(0.2, 0.3, 1.6, 1.3, 0, 22, 0.35, 0.65, 0, 0.75), '#f4ead6');
        roof(g, 0.15, 0.25, 1.7, 1.4, 22, 20, '#6f5a4a', 'c');
        return;
      }
      case 'silo': {
        cyl(g, 0.5, 0.5, 0.2, 0, 50, '#c9d0d8', '#dfe5ea');
        const p = P(0.5, 0.5, 50); poly(g, [[p[0] - 12, p[1]], [p[0] + 12, p[1]], [p[0], p[1] - 12]], sn ? '#f2f6fa' : '#8fa0b6');
        return;
      }
      case 'windmill': {
        const p = P(0.5, 0.5, 0);
        poly(g, [[p[0] - 9, p[1]], [p[0] + 9, p[1]], [p[0] + 5, p[1] - 44], [p[0] - 5, p[1] - 44]], '#f1e8d6');
        poly(g, [[p[0], p[1]], [p[0] + 9, p[1]], [p[0] + 5, p[1] - 44], [p[0], p[1] - 44]], '#ddd2bd');
        poly(g, [[p[0] - 7, p[1] - 44], [p[0] + 7, p[1] - 44], [p[0], p[1] - 56]], sn ? '#f2f6fa' : '#b9644e');
        return;
      }
      case 'turbine': {   // a wind turbine (the blades turn on the map)
        const b = P(0.5, 0.5, 0); ellipse(g, b[0] + 4, b[1], 8, 3, 'rgba(0,0,0,.12)');
        poly(g, [[b[0] - 2.6, b[1]], [b[0] + 2.6, b[1]], [b[0] + 1.2, b[1] - 110], [b[0] - 1.2, b[1] - 110]], '#f4f6f8');
        poly(g, [[b[0], b[1]], [b[0] + 2.6, b[1]], [b[0] + 1.2, b[1] - 110], [b[0], b[1] - 110]], '#dfe4ea');
        roundRect(g, b[0] - 3, b[1] - 115, 10, 6, 2.5, '#eef1f4');
        return;
      }
      case 'stall': {
        const v = o.v || 0, col = pick(AWN, v);
        box(g, 0.25, 0.3, 0.5, 0.4, 0, 7, '#e9cfa4', '#d9b98a', '#c4a476');
        [[0.26, 0.31], [0.74, 0.31], [0.74, 0.69], [0.26, 0.69]].forEach(([c, r]) => line(g, [P(c, r, 7), P(c, r, 17)], '#9b7652', 1));
        roof(g, 0.2, 0.25, 0.6, 0.5, 17, 6, col, 'c');
        for (let i = 0; i < 4; i++) circle(g, P(0.32 + i * 0.12, 0.6, 8)[0], P(0.32 + i * 0.12, 0.6, 8)[1], 1.6, pick(['#f2c14e', '#e05a5a', '#6cc08f', '#f39a4a'], v + i));
        return;
      }
      case 'kiosk': { boxC(g, 0.3, 0.3, 0.4, 0.4, 0, 14, '#fbe6c4'); pyramid(g, 0.25, 0.25, 0.5, 0.5, 14, 10, '#6cc08f'); return; }
      case 'playground': {
        line(g, [P(0.25, 0.3, 0), P(0.25, 0.3, 14), P(0.6, 0.3, 14), P(0.6, 0.3, 0)], '#e05a5a', 1.4);
        line(g, [P(0.35, 0.3, 14), P(0.35, 0.3, 6)], '#666', 0.6); line(g, [P(0.5, 0.3, 14), P(0.5, 0.3, 6)], '#666', 0.6);
        box(g, 0.55, 0.6, 0.2, 0.2, 0, 10, '#f2c14e', '#e0b03c', '#c89c30');
        poly(g, [P(0.55, 0.8, 10), P(0.75, 0.8, 10), P(0.75, 1.0, 0), P(0.55, 1.0, 0)], '#5aa6dd');
        poly(g, diamond(0.15, 0.55, 0.3, 0.3, 0.5), '#f1dfae');
        return;
      }
      case 'fountain': {
        const p = P(0.5, 0.5, 0);
        ellipse(g, p[0], p[1], 20, 10, '#d8d2c6'); ellipse(g, p[0], p[1] - 3, 18, 9, '#e7e2d8'); ellipse(g, p[0], p[1] - 3, 14.5, 7, sn ? '#dceef6' : '#8fd0ea');
        g.fillStyle = '#d8d2c6'; g.fillRect(p[0] - 2, p[1] - 14, 4, 11); ellipse(g, p[0], p[1] - 14, 6, 3, '#e7e2d8');
        return;
      }
      case 'umbrella': {
        const p = P(0.5, 0.5, 0), col = pick(AWN, o.v || 0);
        ellipse(g, p[0] + 4, p[1], 9, 4, 'rgba(0,0,0,.08)'); line(g, [p, [p[0], p[1] - 14]], '#8a8f9a', 1);
        g.beginPath(); g.moveTo(p[0] - 10, p[1] - 12); g.quadraticCurveTo(p[0], p[1] - 22, p[0] + 10, p[1] - 12); g.closePath(); g.fillStyle = col; g.fill();
        g.fillStyle = '#fbf8f2'; g.fillRect(p[0] + 6, p[1] - 2, 8, 3);
        return;
      }
      case 'beachhut': {
        const col = pick(AWN, (o.r || 0) * 3);
        boxC(g, 0.3, 0.3, 0.4, 0.4, 0, 12, '#fbf8f2'); poly(g, onL(0.3, 0.3, 0.4, 0.4, 0, 12, 0, 1, 0, 1), col); roof(g, 0.26, 0.26, 0.48, 0.48, 12, 7, shade(col, -0.2), 'r');
        return;
      }
      case 'yacht': {
        const p = P(0.5, 0.5, 0), v = o.v || 0;
        poly(g, [[p[0] - 12, p[1] - 2], [p[0] + 12, p[1] - 2], [p[0] + 8, p[1] + 3], [p[0] - 9, p[1] + 3]], '#fbfbfb'); poly(g, [[p[0] - 9, p[1] + 3], [p[0] + 8, p[1] + 3], [p[0] + 7, p[1] + 4], [p[0] - 8, p[1] + 4]], '#5aa6dd');
        if (v % 2) { line(g, [[p[0], p[1] - 2], [p[0], p[1] - 26]], '#8a8f9a', 0.9); poly(g, [[p[0] + 1, p[1] - 25], [p[0] + 1, p[1] - 4], [p[0] + 11, p[1] - 5]], '#ffffff'); }
        else box(g, 0.4, 0.42, 0.2, 0.14, 2, 5, '#ffffff', '#eef1f4', '#d9dfe6');
        return;
      }
      case 'pond-ducks': {
        if (sn) return;
        [[0.8, 0.6], [1.6, 1.1], [2.2, 0.7]].forEach(([c, r]) => { const p = P(c, r, 0); ellipse(g, p[0], p[1], 3, 1.8, '#fbfbfb'); circle(g, p[0] + 2.4, p[1] - 1.6, 1.3, '#3f8a45'); circle(g, p[0] + 3.6, p[1] - 1.5, 0.6, '#f2a641'); });
        [[0.4, 1.3], [1.2, 0.3], [2.4, 1.5]].forEach(([c, r]) => { const p = P(c, r, 0); ellipse(g, p[0], p[1], 4, 2, '#6cb85a'); });
        return;
      }
      case 'cruiseship': {   // a cruise ship in the bay (or at its terminal)
        const c0 = 0.1, r0 = 0.15, L = w - 0.2, B = d * 0.7;
        ellipse(g, ...P(c0 + L / 2, r0 + B / 2, 0), L * 40, 9, 'rgba(255,255,255,.35)');
        box(g, c0, r0, L, B, -2, 10, '#fbfbfb', '#f3f5f7', '#d9dfe6'); line(g, [P(c0, r0 + B, 1), P(c0 + L, r0 + B, 1)], '#2f4f7a', 2.4);
        poly(g, [P(c0 + L, r0, -2), P(c0 + L + 0.5, r0 + B / 2, 6), P(c0 + L, r0 + B, -2), P(c0 + L, r0 + B, 8), P(c0 + L, r0, 8)], '#eef1f4');
        for (let i = 0; i < 4; i++) { const cc = c0 + 0.2 + i * 0.12, ll = L - 0.5 - i * 0.35; box(g, cc, r0 + 0.05, ll, B - 0.1, 8 + i * 6, 6, '#ffffff', '#f6f8fa', '#e0e5ea'); windows(g, cc, r0 + 0.05, ll, B - 0.1, 8 + i * 6, 6, 1, Math.round(ll * 6), 1, '#4f7fa8', '#3f6f98', 0.6, 0.45); }
        for (let i = 0; i < 6; i++) { const q = P(c0 + 0.4 + i * (L - 0.8) / 5, r0 + B, 10); ellipse(g, q[0], q[1], 3, 1.6, '#f08a3c'); }
        box(g, c0 + L * 0.62, r0 + B * 0.3, 0.3, 0.24, 32, 10, '#e05a5a', '#cc4848', '#b33d3d'); box(g, c0 + L * 0.62, r0 + B * 0.3, 0.3, 0.24, 40, 2, '#2b2b2b', '#2b2b2b', '#1f1f1f');
        return;
      }

      /* ---- Desert Oasis ---- */
      case 'skyspire': {   // the needle tower: a Y of glass that steps in as it climbs
        shadowBox(g, 0.4, 0.4, 2.2, 2.2, 420);
        box(g, 0.2, 0.2, 2.6, 2.6, 0, 6, '#e7e2d8', '#d9d2c4', '#c4bcae');
        const steps = [[2.0, 70], [1.7, 66], [1.42, 62], [1.16, 58], [0.92, 54], [0.7, 48], [0.5, 40], [0.32, 30]];
        let z = 6;
        steps.forEach(([s, h], i) => { const c = 1.5 - s / 2; glassBox(g, c, c, s, s, z, h, i % 2 ? '#c9dce6' : '#b9d2e0', Math.round(h / 6), 'rgba(255,255,255,.45)'); if (i < 6) box(g, c + s * 0.85, c + s * 0.4, s * 0.25, s * 0.2, z, h * 0.6, '#d9e6ee', '#c9dbe6', '#aac2d2'); z += h; });
        const tip = P(1.5, 1.5, z); line(g, [tip, [tip[0], tip[1] - 60]], '#b9c6d0', 2.2); line(g, [[tip[0] + 0.6, tip[1]], [tip[0] + 0.3, tip[1] - 60]], '#8fa0b0', 0.8); circle(g, tip[0], tip[1] - 61, 1.6, '#f25a5a');
        return;
      }
      case 'museumring': {   // a silver ring standing on a green hill
        const m = P(w / 2, d / 2, 0);
        ellipse(g, m[0], m[1] + 2, 70, 30, sn ? '#eef3f7' : '#8fc76a'); ellipse(g, m[0] - 6, m[1] - 2, 56, 22, sn ? '#f6f9fc' : '#a6d67e');
        g.save(); g.translate(m[0], m[1] - 52);
        const gr = g.createLinearGradient(-44, -40, 44, 40); gr.addColorStop(0, '#f4f7fa'); gr.addColorStop(0.5, '#b9c3cc'); gr.addColorStop(1, '#8f9aa6');
        g.beginPath(); g.ellipse(0, 0, 44, 44, 0, 0, 7); g.ellipse(0, -2, 26, 30, 0, 0, 7, true); g.fillStyle = gr; g.fill('evenodd');
        for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; line(g, [[Math.cos(a) * 30, Math.sin(a) * 33], [Math.cos(a + 0.35) * 40, Math.sin(a + 0.35) * 40]], 'rgba(60,70,85,.55)', 1.4); }
        g.restore();
        return;
      }
      case 'fort': {   // an old fort: sand walls, round towers, a gate and a flag
        const wall = '#e1c896';
        pad(g, 0, 0, w, d, '#e9d5ad');
        shadowBox(g, 0.3, 0.3, w - 0.6, d - 0.6, 30);
        boxC(g, 0.3, 0.3, w - 0.6, d - 0.6, 0, 18, wall);
        for (let i = 0; i < 10; i += 2) box(g, 0.3 + (i / 10) * (w - 0.6), d - 0.36, (w - 0.6) / 10, 0.06, 18, 3, shade(wall, 0.1), wall, shade(wall, -0.15));
        poly(g, diamond(0.3, 0.3, w - 0.6, d - 0.6, 18), shade(wall, -0.06));
        [[0.3, 0.3], [w - 0.3, 0.3], [w - 0.3, d - 0.3], [0.3, d - 0.3]].forEach(([c, r]) => { cyl(g, c, r, 0.28, 0, 30, shade(wall, 0.04)); });
        const gp = onL(0.3, 0.3, w - 0.6, d - 0.6, 0, 18, 0.42, 0.58, 0, 0.7); poly(g, gp, '#7a5238');
        const f = P(w - 0.3, 0.3, 30); flag(g, f[0], f[1] - 2, '#3fa05a');
        return;
      }
      case 'weddinghall': {   // a grand white palace hall with a golden dome
        shadowBox(g, 0.3, 0.3, 2.4, 2.4, 40);
        box(g, 0.15, 0.15, 2.7, 2.7, 0, 4, '#e9e3d6', '#d9d2c4', '#c4bcae');
        boxC(g, 0.4, 0.4, 2.2, 2.2, 4, 22, '#f8f4ec');
        for (let i = 0; i < 7; i++) { poly(g, onL(0.4, 0.4, 2.2, 2.2, 4, 22, 0.06 + i * 0.135, 0.15 + i * 0.135, 0, 0.75), '#d9c79f'); poly(g, onR(0.4, 0.4, 2.2, 2.2, 4, 22, 0.06 + i * 0.135, 0.15 + i * 0.135, 0, 0.75), '#c9b98e'); }
        poly(g, diamond(0.4, 0.4, 2.2, 2.2, 26), '#ece5d6');
        const p = P(1.5, 1.5, 26); cyl(g, 1.5, 1.5, 0.45, 26, 8, '#f3ede0'); dome(g, p[0], p[1] - 8, 26, 34, '#e0b84a'); line(g, [[p[0], p[1] - 42], [p[0], p[1] - 52]], '#c9a227', 1.4); circle(g, p[0], p[1] - 53, 1.8, '#e0b84a');
        [[0.4, 0.4], [2.6, 0.4], [2.6, 2.6], [0.4, 2.6]].forEach(([c, r]) => { cyl(g, c, r, 0.1, 4, 44, '#f8f4ec'); const t = P(c, r, 48); dome(g, t[0], t[1], 4.4, 7, '#e0b84a'); });
        return;
      }
      case 'villa': {   // a villa on the palm island's frond, with a pool
        pad(g, 0, 0, 1, 1, '#efe2c4');
        poly(g, diamond(0.55, 0.55, 0.36, 0.3, 0.4), '#4fb6dc');
        boxC(g, 0.1, 0.12, 0.52, 0.5, 0, 14, '#fbf8f2'); windows(g, 0.1, 0.12, 0.52, 0.5, 0, 14, 1, 2, 2, '#8fc0de', '#7aaacb', 0.5, 0.55);
        poly(g, diamond(0.1, 0.12, 0.52, 0.5, 14), '#e9e3d6');
        return;
      }
      case 'palmhotel': {   // the hotel on the crescent: twin towers joined by an arch at the top
        const col = '#f4cdb8';
        shadowBox(g, 0.1, 0.2, 0.8, 2.6, 110);
        boxC(g, 0.15, 0.15, 0.7, 1.1, 0, 96, col); windows(g, 0.15, 0.15, 0.7, 1.1, 0, 96, 14, 3, 4, '#a9cfe4', '#93b9d0', 0.5, 0.5);
        boxC(g, 0.15, 1.75, 0.7, 1.1, 0, 96, col); windows(g, 0.15, 1.75, 0.7, 1.1, 0, 96, 14, 3, 4, '#a9cfe4', '#93b9d0', 0.5, 0.5);
        poly(g, diamond(0.15, 0.15, 0.7, 1.1, 96), shade(col, -0.08)); poly(g, diamond(0.15, 1.75, 0.7, 1.1, 96), shade(col, -0.08));
        boxC(g, 0.2, 1.05, 0.6, 0.9, 80, 22, shade(col, 0.06));
        const a = P(0.2, 1.95, 80), b = P(0.2, 1.05, 80), m = P(0.2, 1.5, 60); g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(m[0], m[1], b[0], b[1]); g.lineTo(b[0], b[1] - 2); g.lineTo(a[0], a[1] - 2); g.fillStyle = '#c9a07a'; g.fill();
        dome(g, ...P(0.5, 1.5, 102), 12, 14, '#e0b84a');
        return;
      }
      case 'dhow': {   // a wooden dhow moored on the creek
        const p = P(0.5, 0.5, 0), v = o.v || 0;
        g.beginPath(); g.moveTo(p[0] - 16, p[1] - 6); g.quadraticCurveTo(p[0] - 4, p[1] + 5, p[0] + 14, p[1] - 3); g.lineTo(p[0] + 18, p[1] - 9); g.lineTo(p[0] - 19, p[1] - 9); g.closePath(); g.fillStyle = '#9b6b42'; g.fill();
        line(g, [[p[0] - 18, p[1] - 8], [p[0] + 17, p[1] - 8]], '#c9955f', 1.2);
        line(g, [[p[0] - 2, p[1] - 8], [p[0] - 1, p[1] - 30]], '#6b4a30', 1.2);
        if (v % 2) poly(g, [[p[0] - 1, p[1] - 30], [p[0] + 14, p[1] - 12], [p[0] - 8, p[1] - 11]], '#f5efe2'); else line(g, [[p[0] - 12, p[1] - 22], [p[0] + 10, p[1] - 28]], '#c9b48a', 2);
        return;
      }
      case 'racetrack': {   // a big oval track with a grandstand
        const m = P(w / 2, d / 2, 0), rx = (w + d) * HW * 0.42, ry = (w + d) * HH * 0.42;
        ellipse(g, m[0], m[1], rx, ry, '#e2c896'); ellipse(g, m[0], m[1], rx * 0.82, ry * 0.78, sn ? '#eef3f7' : '#a9cf7a');
        g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(m[0], m[1], rx * 0.99, ry * 0.98, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(m[0], m[1], rx * 0.83, ry * 0.79, 0, 0, 7); g.stroke();
        const gs = Math.max(0, d - 1.6);
        box(g, 1.5, gs, w - 3, 1.1, 0, 10, '#e9e3d6', '#d9d2c4', '#c4bcae');
        for (let i = 0; i < 4; i++) box(g, 1.6, gs + 0.05 + i * 0.22, w - 3.2, 0.2, 10 + i * 4, 4, pick(['#e05a5a', '#f2f2f2', '#3f7fd0'], i), '#d9d2c4', '#c4bcae');
        g.beginPath(); g.moveTo(...P(1.4, gs - 0.1, 30)); g.lineTo(...P(w - 1.4, gs - 0.1, 30)); g.lineTo(...P(w - 1.4, gs + 1.2, 24)); g.lineTo(...P(1.4, gs + 1.2, 24)); g.closePath(); g.fillStyle = 'rgba(250,250,250,.9)'; g.fill();
        for (let i = 0; i < 5; i++) { const q = P(1.6 + i * (w - 3.2) / 4, gs - 0.1, 30); flag(g, q[0], q[1], pick(['#e05a5a', '#3fa05a', '#f2c14e'], i)); }
        return;
      }
      case 'camelpen': {
        pad(g, 0, 0, 1, 1, '#e9d5ad');
        [[0.06, 0.06], [0.94, 0.06], [0.94, 0.94], [0.06, 0.94], [0.06, 0.06]].reduce((a, b) => { line(g, [P(a[0], a[1], 4), P(b[0], b[1], 4)], '#a9824f', 1.1); return b; });
        [[0.35, 0.45, 1], [0.65, 0.7, -1]].forEach(([c, r, dir]) => drawCamel(g, ...P(c, r, 0), dir, 0.8, 0));
        return;
      }
      case 'pivot': {   // a round irrigated field
        const m = P(0.5, 0.5, 0), rx = 1.7 * 1.414 * HW, ry = 1.7 * 1.414 * HH;
        ellipse(g, m[0], m[1], rx, ry, '#7fbf57'); ellipse(g, m[0], m[1], rx * 0.7, ry * 0.7, '#8fcc62'); ellipse(g, m[0], m[1], rx * 0.38, ry * 0.38, '#9fd66e');
        line(g, [m, [m[0] + rx * 0.95, m[1] - ry * 0.25]], '#cfd6dd', 1.6); circle(g, m[0], m[1], 2, '#9aa3ad');
        return;
      }

      /* ---- Neon City ---- */
      case 'pyramid': {   // a dark glass pyramid with a sphinx at its door
        const c0 = 0.3, s = w - 0.6, apex = P(c0 + s / 2, c0 + s / 2, 120);
        shadowBox(g, c0, c0, s, s, 120);
        poly(g, [P(c0, c0, 0), P(c0 + s, c0, 0), apex], '#2b2a33'); poly(g, [P(c0, c0, 0), P(c0, c0 + s, 0), apex], '#4a4756');
        poly(g, [P(c0, c0 + s, 0), P(c0 + s, c0 + s, 0), apex], '#3a3846'); poly(g, [P(c0 + s, c0 + s, 0), P(c0 + s, c0, 0), apex], '#24232b');
        for (let i = 1; i < 8; i++) { const k = i / 8, a = P(c0 + s * k / 2, c0 + s - s * k / 2, 120 * k), b = P(c0 + s - s * k / 2, c0 + s - s * k / 2, 120 * k), cc = P(c0 + s - s * k / 2, c0 + s * k / 2, 120 * k); line(g, [a, b, cc], 'rgba(255,220,150,.18)', 0.8); }
        // the sphinx
        const sp = P(w / 2 + 0.5, w - 0.05, 0); g.save(); g.translate(sp[0], sp[1]);
        poly(g, [[-16, -2], [12, -2], [14, -8], [-12, -10]], '#d9b98a'); poly(g, [[8, -8], [16, -8], [16, -20], [9, -22]], '#e3c79a'); poly(g, [[9, -22], [16, -20], [17, -26], [10, -28]], '#c9a26a');
        g.restore();
        return;
      }
      case 'sphere': {   // a giant ball covered in lights (its picture changes on the map)
        const m = P(w / 2, d / 2, 0), R = 70;
        box(g, 1.2, 1.2, w - 2.4, d - 2.4, 0, 8, '#3a3846', '#2b2a33', '#24232b');
        const gr = g.createRadialGradient(m[0] - 24, m[1] - R - 30, 8, m[0], m[1] - R, R); gr.addColorStop(0, '#5a5f7a'); gr.addColorStop(1, '#1f2033');
        circle(g, m[0], m[1] - R + 4, R, gr);
        for (let i = -3; i <= 3; i++) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(m[0], m[1] - R + 4, R * Math.cos(i * 0.4), R, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(m[0], m[1] - R + 4 + i * R * 0.28, R * Math.sqrt(1 - Math.pow(i * 0.28, 2)), R * 0.12, 0, 0, 7); g.stroke(); }
        return;
      }
      case 'castle': {   // a storybook castle with coloured turret roofs, hotel towers behind
        shadowBox(g, 0.4, 0.4, w - 0.8, d - 0.8, 120);
        [[0.5, 0.6], [w - 1.7, 0.5]].forEach(([c, r]) => { boxC(g, c, r, 1.2, 1.4, 0, 110, '#f6f2ea'); windows(g, c, r, 1.2, 1.4, 0, 110, 16, 3, 4, '#c9a07a', '#b38c66', 0.4, 0.45); pyramid(g, c - 0.05, r - 0.05, 1.3, 1.5, 110, 24, '#d9433a'); });
        boxC(g, 0.6, 2.2, w - 1.2, d - 2.8, 0, 34, '#f1ece2');
        for (let i = 0; i < 9; i += 2) box(g, 0.6 + (i / 9) * (w - 1.2), d - 0.66, (w - 1.2) / 9, 0.06, 34, 4, '#ffffff', '#f1ece2', '#d9d2c4');
        const gp = onL(0.6, 2.2, w - 1.2, d - 2.8, 0, 34, 0.42, 0.58, 0, 0.6); poly(g, gp, '#6b4a30');
        const cols = ['#d9433a', '#2f6fb8', '#f2c14e', '#3fa05a'];
        [[0.6, 2.2], [w - 0.6, 2.2], [w - 0.6, d - 0.6], [0.6, d - 0.6], [w / 2, 2.2], [w / 2, d - 0.6]].forEach(([c, r], i) => { cyl(g, c, r, 0.22, 0, 54, '#ffffff'); const t = P(c, r, 54); poly(g, [[t[0] - 9, t[1]], [t[0] + 9, t[1]], [t[0], t[1] - 26]], cols[i % 4]); poly(g, [[t[0], t[1]], [t[0] + 9, t[1]], [t[0], t[1] - 26]], shade(cols[i % 4], -0.2)); flag(g, t[0], t[1] - 26, cols[(i + 1) % 4]); });
        return;
      }
      case 'bigwheel': {   // the giant wheel's legs and station (the wheel turns on the map)
        const m = P(w / 2, d / 2, 0);
        box(g, w / 2 - 1, d / 2 + 0.4, 2, 0.8, 0, 10, '#d9e2ea', '#c9d3dd', '#b5c0cc');
        line(g, [[m[0] - 30, m[1] + 10], [m[0], m[1] - 92]], '#e8edf2', 3.4); line(g, [[m[0] + 30, m[1] + 10], [m[0], m[1] - 92]], '#cfd6dd', 3.4);
        circle(g, m[0], m[1] - 92, 4, '#9aa3ad');
        return;
      }
      case 'eiffel': {   // a tall lattice tower before a hotel with blue roofs
        shadowBox(g, 0.4, 0.4, w - 0.8, d - 0.8, 220);
        boxC(g, 0.2, 0.2, w - 0.4, 1.0, 0, 70, '#efe6d6'); windows(g, 0.2, 0.2, w - 0.4, 1.0, 0, 70, 9, 8, 3, '#c9a07a', '#b38c66', 0.4, 0.45);
        roof(g, 0.15, 0.15, w - 0.3, 1.1, 70, 14, '#5f7189', 'c');
        const top = lattice(g, 1.1, 1.6, 1.8, 1.8, 210, '#a87a52', '#c9986a', [0.18, 0.5]);
        line(g, [top, [top[0], top[1] - 20]], '#8a6a4a', 1.4); circle(g, top[0], top[1] - 21, 1.4, '#f2c14e');
        return;
      }
      case 'chapel': {   // a little white chapel with a steeple
        pad(g, 0, 0, w, d, sn ? '#eef3f7' : '#bfe293');
        shadowBox(g, 0.7, 0.7, 1.6, 1.4, 40);
        boxC(g, 0.7, 0.9, 1.6, 1.4, 0, 18, '#fbf8f2'); windows(g, 0.7, 0.9, 1.6, 1.4, 2, 14, 1, 3, 3, '#9fc0e0', '#8aaacb', 0.25, 0.85);
        roof(g, 0.65, 0.85, 1.7, 1.5, 18, 16, '#e8b4c8', 'r');
        boxC(g, 1.25, 0.55, 0.5, 0.45, 0, 40, '#fbf8f2'); pyramid(g, 1.22, 0.52, 0.56, 0.51, 40, 26, '#e8b4c8');
        for (let i = 0; i < 6; i++) { const q = P(0.4 + i * 0.4, 2.7); circle(g, q[0], q[1] - 2, 2.2, pick(['#f48fb1', '#ffffff', '#f6d34a'], i)); }
        return;
      }
      case 'showfountain': {   // the fountain lake's edge and its jets (the water dances on the map)
        for (let i = 0; i < 8; i++) { const q = P(0.3 + i * (w - 0.6) / 7, d / 2, 0); ellipse(g, q[0], q[1], 3, 1.5, '#d9eef8'); }
        line(g, [P(0, d, 1), P(w, d, 1)], '#e9e3d6', 2.4);
        for (let i = 0; i < 9; i++) { const q = P(i * w / 8, d, 1); g.fillStyle = '#d9d2c4'; g.fillRect(q[0] - 1, q[1] - 6, 2, 6); circle(g, q[0], q[1] - 7, 1.6, '#fff6d6'); }
        return;
      }
      case 'skytower': {   // a needle-thin tower with a round lookout at the top
        const m = P(w / 2, d / 2, 0);
        shadowBox(g, w / 2 - 0.4, d / 2 - 0.4, 0.8, 0.8, 300);
        box(g, w / 2 - 1.2, d / 2 - 1.2, 2.4, 2.4, 0, 16, '#e9e3d6', '#d9d2c4', '#c4bcae');
        [[-8, 0], [8, 0]].forEach(([dx]) => line(g, [[m[0] + dx * 2.2, m[1]], [m[0] + dx * 0.4, m[1] - 250]], dx < 0 ? '#e8e3da' : '#cfc8bc', 5));
        poly(g, [[m[0] - 7, m[1] - 16], [m[0] + 7, m[1] - 16], [m[0] + 4, m[1] - 250], [m[0] - 4, m[1] - 250]], '#efe9df');
        const t = [m[0], m[1] - 254];
        ellipse(g, t[0], t[1] + 6, 26, 9, '#cfc8bc'); g.fillStyle = '#e9e3d6'; g.fillRect(t[0] - 26, t[1] - 12, 52, 18); ellipse(g, t[0], t[1] - 12, 26, 9, '#f6f2ea');
        g.fillStyle = '#8fc6e0'; g.fillRect(t[0] - 26, t[1] - 6, 52, 6);
        line(g, [[t[0], t[1] - 20], [t[0], t[1] - 66]], '#c9c2b6', 2.4); circle(g, t[0], t[1] - 67, 1.8, '#f25a5a');
        return;
      }
      case 'volcano': {   // a rocky volcano with waterfalls in a lagoon (it erupts on the map)
        const m = P(w / 2, d / 2, 0);
        ellipse(g, m[0], m[1] + 4, 96, 44, '#4fb6dc'); ellipse(g, m[0], m[1] + 4, 86, 38, '#6fc7e6');
        poly(g, [[m[0] - 66, m[1]], [m[0] - 18, m[1] - 78], [m[0] + 16, m[1] - 80], [m[0] + 70, m[1] - 2], [m[0] + 30, m[1] + 18], [m[0] - 30, m[1] + 16]], '#8a6a52');
        poly(g, [[m[0] + 16, m[1] - 80], [m[0] + 70, m[1] - 2], [m[0] + 30, m[1] + 18], [m[0] + 6, m[1] - 40]], '#6f523e');
        poly(g, [[m[0] - 18, m[1] - 78], [m[0] + 16, m[1] - 80], [m[0] + 10, m[1] - 70], [m[0] - 12, m[1] - 70]], '#3a2a22');
        [[-30, -40], [-6, -46], [22, -30]].forEach(([dx, dy]) => { poly(g, [[m[0] + dx - 3, m[1] + dy], [m[0] + dx + 3, m[1] + dy], [m[0] + dx + 6, m[1] + 12], [m[0] + dx - 6, m[1] + 12]], 'rgba(220,245,255,.85)'); });
        for (let i = 0; i < 5; i++) { g.save(); g.translate(m[0] - 80 + i * 40, m[1] + (i % 2 ? 22 : 10)); g.scale(0.8, 0.8); A.drawPoint(g, 'palm', i, 1, { season: 'summer' }); g.restore(); }
        return;
      }
      case 'resorttower': {   // a curved bronze hotel tower in two wings
        shadowBox(g, 0.5, 0.5, w - 1, d - 1, 230);
        box(g, 0.2, 0.2, w - 0.4, d - 0.4, 0, 14, '#e9dcc6', '#d9c8ae', '#c4b296');
        const wing = (c, r, ww, dd, h, gl) => { glassBox(g, c, r, ww, dd, 14, h, gl, Math.round(h / 8), 'rgba(255,240,210,.5)'); };
        wing(0.8, 0.5, 1.2, 2.2, 210, '#c9a46a'); wing(1.6, 2.5, 1.5, 1.2, 186, '#d4b07a'); wing(2.2, 1.4, 1.0, 1.4, 170, '#bf9a60');
        const t = P(1.4, 1.6, 224); roundRect(g, t[0] - 24, t[1] - 8, 48, 12, 4, '#2b2350'); g.fillStyle = '#ffd23f'; g.font = '800 8px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RESORT', t[0], t[1] - 1.6);
        return;
      }
      case 'pools': {   // resort pools with loungers, umbrellas and palms
        pad(g, 0, 0, w, d, '#efe6d6');
        [[0.4, 0.5, 1.6, 2.2], [2.2, 1.0, 1.4, 1.4], [0.6, 3.2, 2.6, 2.2]].forEach(([c, r, ww, dd]) => { poly(g, diamond(c, r, ww, dd, 0.4), '#3fb0dc'); poly(g, diamond(c + 0.08, r + 0.08, ww - 0.16, dd - 0.16, 0.5), '#7fd0ec'); });
        for (let i = 0; i < 10; i++) { const q = P(0.3 + (i % 5) * 0.75, 2.8 + Math.floor(i / 5) * 2.9); g.fillStyle = '#ffffff'; g.fillRect(q[0] - 4, q[1] - 1.6, 8, 3); }
        for (let i = 0; i < 6; i++) { const q = P(3.4, 0.6 + i * 0.9); const col = pick(AWN, i); line(g, [q, [q[0], q[1] - 12]], '#8a8f9a', 0.8); g.beginPath(); g.moveTo(q[0] - 8, q[1] - 10); g.quadraticCurveTo(q[0], q[1] - 18, q[0] + 8, q[1] - 10); g.closePath(); g.fillStyle = col; g.fill(); }
        for (let i = 0; i < 4; i++) { const q = P(0.2 + i * 1.2, 5.8); g.save(); g.translate(q[0], q[1]); g.scale(0.75, 0.75); A.drawPoint(g, 'palm', i, 1, { season: 'summer' }); g.restore(); }
        return;
      }
      case 'canopy': {   // a long arched roof over the old street, covered in lights (they play shows on the map)
        const a0 = P(0, 0, 0), along = w >= d, L = along ? w : d;
        for (let i = 0; i <= L; i += 2) { const p = along ? P(i, 0, 0) : P(0, i, 0), q = along ? P(i, d, 0) : P(w, i, 0); line(g, [p, [p[0], p[1] - 42]], '#7d838c', 1.6); line(g, [q, [q[0], q[1] - 42]], '#6b717a', 1.6); }
        const p0 = along ? P(0, 0, 42) : P(0, 0, 42), p1 = along ? P(L, 0, 42) : P(0, L, 42), q1 = along ? P(L, d, 42) : P(w, L, 42), q0 = along ? P(0, d, 42) : P(w, 0, 42);
        g.beginPath(); g.moveTo(...p0); g.lineTo(...p1); g.quadraticCurveTo((p1[0] + q1[0]) / 2, (p1[1] + q1[1]) / 2 - 18, q1[0], q1[1]); g.lineTo(...q0); g.quadraticCurveTo((q0[0] + p0[0]) / 2, (q0[1] + p0[1]) / 2 - 18, p0[0], p0[1]); g.closePath();
        g.fillStyle = 'rgba(60,58,80,.82)'; g.fill(); g.strokeStyle = '#9aa3ad'; g.lineWidth = 1; g.stroke();
        void a0;
        return;
      }
      case 'welcome': {   // the welcome sign on its two posts
        const p = P(0.5, 0.5, 0); line(g, [[p[0] - 7, p[1]], [p[0] - 7, p[1] - 22]], '#9aa3ad', 1.6); line(g, [[p[0] + 7, p[1]], [p[0] + 7, p[1] - 22]], '#9aa3ad', 1.6);
        poly(g, [[p[0], p[1] - 52], [p[0] + 22, p[1] - 38], [p[0], p[1] - 22], [p[0] - 22, p[1] - 38]], '#fbfbf2');
        g.strokeStyle = '#e05a5a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(p[0], p[1] - 50); g.lineTo(p[0] + 20, p[1] - 38); g.lineTo(p[0], p[1] - 24); g.lineTo(p[0] - 20, p[1] - 38); g.closePath(); g.stroke();
        for (let i = 0; i < 7; i++) circle(g, p[0] - 13 + i * 4.3, p[1] - 44 + Math.abs(i - 3) * 1.2, 1.2, pick(['#e05a5a', '#f2c14e', '#41b0ff'], i));
        g.fillStyle = '#e05a5a'; g.font = '800 5.5px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('WELCOME', p[0], p[1] - 37); g.fillStyle = '#2f6fb8'; g.fillText('NEON CITY', p[0], p[1] - 31);
        return;
      }
      case 'dam': {   // a curved concrete dam holding back the lake
        const along = w >= d, L = along ? w : d;
        for (let i = 0; i < L; i++) { const c = along ? i : 0, r = along ? 0 : i, bow = Math.sin((i + 0.5) / L * Math.PI) * 0.25; box(g, c, r + (along ? bow : 0), along ? 1 : 1, along ? 0.5 : 1, -30, 34, '#e7e2d8', i % 2 ? '#d9d2c4' : '#d2cabb', '#bdb5a6'); }
        [0.3, 0.7].forEach((k) => { const c = along ? L * k : 0.2, r = along ? -0.6 : L * k; boxC(g, c, r, 0.5, 0.5, 0, 22, '#efe9df'); pyramid(g, c - 0.04, r - 0.04, 0.58, 0.58, 22, 5, '#c9c2b6'); });
        return;
      }

      /* ---- Sakura City ---- */
      case 'jcastle': {   // a white castle keep on a stone base, roofs in tiers, golden fish on top
        const base = '#9d9a92';
        shadowBox(g, 0.3, 0.3, w - 0.6, d - 0.6, 150);
        poly(g, [P(0.1, d - 0.1, 0), P(w - 0.1, d - 0.1, 0), P(w - 0.5, d - 0.5, 26), P(0.5, d - 0.5, 26)], shade(base, 0.08));
        poly(g, [P(w - 0.1, d - 0.1, 0), P(w - 0.1, 0.1, 0), P(w - 0.5, 0.5, 26), P(w - 0.5, d - 0.5, 26)], shade(base, -0.15));
        for (let i = 1; i < 5; i++) line(g, [P(0.1 + i * 0.1, d - 0.1 - i * 0.1, i * 6.5), P(w - 0.1 - i * 0.1, d - 0.1 - i * 0.1, i * 6.5), P(w - 0.1 - i * 0.1, 0.1 + i * 0.1, i * 6.5)], 'rgba(0,0,0,.14)', 0.8);
        poly(g, diamond(0.5, 0.5, w - 1, d - 1, 26), '#8f8b83');
        const t = tiers(g, 0.7, 0.7, w - 1.4, d - 1.4, 26, 4, 18, '#ffffff', sn ? '#d9e2ea' : '#4f5f6a', 0.1);
        const p = P(t.c, t.r, t.z); poly(g, [[p[0] - 8, p[1] + 2], [p[0] - 5, p[1] - 6], [p[0] - 3, p[1] + 1]], '#e0b84a'); poly(g, [[p[0] + 8, p[1] + 2], [p[0] + 5, p[1] - 6], [p[0] + 3, p[1] + 1]], '#e0b84a');
        return;
      }
      case 'torii': {   // a great red gate (it stands in the sea, the tide around its feet)
        const p = P(0.5, 0.5, 0);
        ellipse(g, p[0], p[1] + 1, 26, 7, 'rgba(255,255,255,.35)');
        [-14, 14].forEach((dx) => { g.fillStyle = '#d9433a'; g.fillRect(p[0] + dx - 2.2, p[1] - 44, 4.4, 44); g.fillStyle = '#b8322f'; g.fillRect(p[0] + dx + 0.4, p[1] - 44, 1.8, 44); g.fillStyle = '#2b2b2b'; g.fillRect(p[0] + dx - 2.6, p[1] - 3, 5.2, 3); });
        g.beginPath(); g.moveTo(p[0] - 26, p[1] - 50); g.quadraticCurveTo(p[0], p[1] - 46, p[0] + 26, p[1] - 50); g.lineTo(p[0] + 24, p[1] - 45); g.quadraticCurveTo(p[0], p[1] - 42, p[0] - 24, p[1] - 45); g.closePath(); g.fillStyle = '#2b2b2b'; g.fill();
        g.fillStyle = '#d9433a'; g.fillRect(p[0] - 22, p[1] - 45, 44, 4); g.fillRect(p[0] - 19, p[1] - 36, 38, 3.4);
        if (sn) { g.fillStyle = '#ffffff'; g.fillRect(p[0] - 24, p[1] - 52, 48, 2); }
        return;
      }
      case 'pagoda': {   // a five-storey pagoda
        shadowBox(g, 0.2, 0.2, 0.6, 0.6, 110);
        box(g, 0.05, 0.05, 0.9, 0.9, 0, 3, '#cfc8bc', '#bdb5a6', '#a89f8f');
        const t = tiers(g, 0.22, 0.22, 0.56, 0.56, 3, 5, 12, '#c0503e', sn ? '#d9e2ea' : '#4a5566', 0.06);
        const p = P(t.c, t.r, t.z); line(g, [p, [p[0], p[1] - 22]], '#c9a227', 1.6); for (let i = 0; i < 5; i++) ellipse(g, p[0], p[1] - 6 - i * 3.4, 2.4, 1, '#c9a227');
        return;
      }
      case 'shrine': {   // a shinto shrine: a hall with a great roof, a red gate and stone lanterns
        pad(g, 0, 0, w, d, sn ? '#eef3f7' : '#e8e2d4');
        shadowBox(g, 0.5, 0.4, 2, 1.6, 40);
        box(g, 0.45, 0.35, 2.1, 1.7, 0, 4, '#cfc8bc', '#bdb5a6', '#a89f8f');
        boxC(g, 0.65, 0.5, 1.7, 1.3, 4, 16, '#efe3cf'); for (let i = 0; i < 5; i++) poly(g, onL(0.65, 0.5, 1.7, 1.3, 4, 16, 0.04 + i * 0.2, 0.08 + i * 0.2, 0, 1), '#c0503e');
        curvedRoof(g, 0.45, 0.3, 2.1, 1.7, 20, 20, sn ? '#e3eaf1' : '#4f6a5a');
        const tp = P(1.5, 2.75, 0); [-10, 10].forEach((dx) => { g.fillStyle = '#d9433a'; g.fillRect(tp[0] + dx - 1.6, tp[1] - 26, 3.2, 26); });
        g.fillStyle = '#2b2b2b'; g.fillRect(tp[0] - 16, tp[1] - 30, 32, 3.6); g.fillStyle = '#d9433a'; g.fillRect(tp[0] - 13, tp[1] - 22, 26, 2.6);
        [[0.3, 2.4], [2.7, 2.4]].forEach(([c, r]) => { g.save(); const q = P(c, r); g.translate(q[0], q[1]); A.drawPoint(g, 'lantern', 1, 1, {}); g.restore(); });
        return;
      }
      case 'redtower': {   // the red and white lattice tower
        shadowBox(g, 0.6, 0.6, w - 1.2, d - 1.2, 230);
        const top = lattice(g, 0.4, 0.4, w - 0.8, d - 0.8, 220, '#e0453a', '#ffffff', [0.3, 0.62]);
        line(g, [top, [top[0], top[1] - 34]], '#ffffff', 2); line(g, [[top[0], top[1] - 14], [top[0], top[1] - 34]], '#e0453a', 2);
        for (let i = 0; i < 5; i++) { const k = 0.1 + i * 0.2, q = [top[0], top[1] + (P(1.5, 1.5, 0)[1] - top[1]) * (1 - k)]; line(g, [[q[0] - 3, q[1]], [q[0] + 3, q[1]]], i % 2 ? '#ffffff' : '#e0453a', 2.2); }
        return;
      }
      case 'scramble': {   // the big crossing: zebra stripes every way, giant screens on the corner
        const st = (a, b, n, wd) => { for (let i = 0; i < n; i++) { const t0 = (i + 0.2) / n, t1 = (i + 0.6) / n; poly(g, [P(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, 0.5), P(a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, 0.5), P(a[0] + (b[0] - a[0]) * t1 + wd[0], a[1] + (b[1] - a[1]) * t1 + wd[1], 0.5), P(a[0] + (b[0] - a[0]) * t0 + wd[0], a[1] + (b[1] - a[1]) * t0 + wd[1], 0.5)], 'rgba(255,255,255,.92)'); } };
        poly(g, diamond(0, 0, w, d, 0.3), '#8f8b84');
        st([0.3, 0.3], [w - 0.3, d - 0.3], 12, [0.32, -0.32]); st([w - 0.3, 0.3], [0.3, d - 0.3], 12, [0.32, 0.32]);
        st([0.2, 0.2], [w - 0.2, 0.2], 8, [0, 0.4]); st([0.2, d - 0.6], [w - 0.2, d - 0.6], 8, [0, 0.4]);
        boxC(g, -0.6, -0.6, 0.9, 0.9, 0, 70, '#dfe4ea'); poly(g, onL(-0.6, -0.6, 0.9, 0.9, 30, 34, 0.05, 0.95, 0, 1), '#2b2b33'); poly(g, onR(-0.6, -0.6, 0.9, 0.9, 30, 34, 0.05, 0.95, 0, 1), '#24242b');
        return;
      }
      case 'arcade': {   // a covered shopping street with banners
        pad(g, 0, 0, w, d, '#e4dccb');
        boxC(g, 0.1, 0.1, w - 0.2, 1.1, 0, 22, '#f3ece0'); boxC(g, 0.1, d - 1.2, w - 0.2, 1.1, 0, 22, '#efe6d6');
        for (let i = 0; i < 6; i++) poly(g, onL(0.1, d - 1.2, w - 0.2, 1.1, 0, 10, 0.03 + i * 0.165, 0.15 + i * 0.165, 0.05, 0.95), pick(['#f6d38a', '#bfe0f0', '#f3b8b2', '#c9e4a8'], i));
        const a = P(0.1, 1.2, 22), b = P(w - 0.1, 1.2, 22), c2 = P(w - 0.1, d - 1.2, 22), d2 = P(0.1, d - 1.2, 22);
        g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.quadraticCurveTo((b[0] + c2[0]) / 2, (b[1] + c2[1]) / 2 - 14, ...c2); g.lineTo(...d2); g.quadraticCurveTo((d2[0] + a[0]) / 2, (d2[1] + a[1]) / 2 - 14, ...a); g.closePath(); g.fillStyle = sn ? 'rgba(244,248,251,.9)' : 'rgba(200,226,240,.7)'; g.fill();
        for (let i = 0; i < 5; i++) { const q = P(0.6 + i * (w - 1.2) / 4, d / 2, 18); g.fillStyle = pick(['#d9433a', '#2f6fb8', '#f2c14e', '#3a9a5a'], i); g.fillRect(q[0] - 2, q[1], 4, 9); }
        poly(g, diamond(0.1, 0.1, w - 0.2, 1.1, 22), sn ? '#f4f8fb' : '#d9cfbd'); poly(g, diamond(0.1, d - 1.2, w - 0.2, 1.1, 22), sn ? '#f4f8fb' : '#d9cfbd');
        return;
      }
      case 'ferriswheel': {   // the wheel's legs (it turns on the map)
        const m = P(w / 2, d / 2, 0);
        box(g, w / 2 - 0.6, d / 2 + 0.2, 1.2, 0.6, 0, 8, '#e9e3d6', '#d9d2c4', '#c4bcae');
        line(g, [[m[0] - 20, m[1] + 6], [m[0], m[1] - 62]], '#e8edf2', 2.6); line(g, [[m[0] + 20, m[1] + 6], [m[0], m[1] - 62]], '#cfd6dd', 2.6);
        return;
      }
      case 'onsen': {   // a hot-spring inn and its steaming pool (the steam rises on the map)
        pad(g, 0, 0, w, d, sn ? '#eef3f7' : '#c9d98a');
        boxC(g, 0.2, 0.2, w - 0.4, 0.9, 0, 16, '#e9dcc0'); for (let i = 0; i < 6; i++) poly(g, onL(0.2, 0.2, w - 0.4, 0.9, 0, 16, 0.04 + i * 0.16, 0.08 + i * 0.16, 0, 1), '#6b4a30');
        curvedRoof(g, 0.1, 0.1, w - 0.2, 1.1, 16, 12, sn ? '#e3eaf1' : '#4a5566');
        const m = P(w / 2, d - 0.6, 0); ellipse(g, m[0], m[1], 30, 11, '#a9a49a'); ellipse(g, m[0], m[1] - 1, 26, 9, '#8fd0d8');
        [[-22, 2], [-10, 8], [12, 7], [24, 1]].forEach(([dx, dy]) => ellipse(g, m[0] + dx, m[1] + dy - 2, 4, 2.4, '#8f8b84'));
        return;
      }
    }
  }
  // how tall each landmark stands (world units above its footprint), for its picture and for culling
  const LAND_TOP = { skyspire: 460, skytower: 350, redtower: 280, eiffel: 260, resorttower: 260, palmhotel: 130, castle: 160, sphere: 150, pyramid: 130, bigwheel: 180, jcastle: 160, pagoda: 130,
    turbine: 150, volcano: 110, museumring: 110, weddinghall: 80, church: 110, hospital: 70, station: 60, terminal2: 60, cruiseship: 70, ferriswheel: 140, crane: 90, lighthouse: 100, clocktower: 100,
    school: 70, scramble: 80, shrine: 70, chapel: 80, dam: 30, canopy: 70 };
  A.landTop = (k) => LAND_TOP[k] || 70;
  // the moving parts of a landmark (relative to its anchor, in tiles and world units up)
  A.landMovers = function (o) {
    const k = o.k, w = o.w || 1, d = o.d || 1;
    if (k === 'windmill') return [{ k: 'sails', c: 0.5, r: 0.5, z: 46, R: 22 }];
    if (k === 'turbine') return [{ k: 'blades', c: 0.5, r: 0.5, z: 112, R: 28 }];
    if (k === 'fountain') return [{ k: 'spray', c: 0.5, r: 0.5, z: 14 }];
    if (k === 'bigwheel') return [{ k: 'wheel', c: w / 2, r: d / 2, z: 92, R: 78, pods: 16 }];
    if (k === 'ferriswheel') return [{ k: 'wheel', c: w / 2, r: d / 2, z: 62, R: 52, pods: 12 }];
    if (k === 'sphere') return [{ k: 'sphere', c: w / 2, r: d / 2, z: 66, R: 70 }];
    if (k === 'showfountain') return [{ k: 'jets', c: 0.3, r: d / 2, z: 0, len: w - 0.6, n: 8 }];
    if (k === 'volcano') return [{ k: 'lava', c: w / 2 + 0.05, r: d / 2 - 0.05, z: 80 }];
    if (k === 'canopy') return [{ k: 'canopy', c: 0, r: 0, z: 42, w: w, d: d }];
    if (k === 'scramble') return [{ k: 'screen', c: -0.6, r: 0.3, z: 30, w: 0.9, h: 34 }];
    if (k === 'onsen') return [{ k: 'steam', c: w / 2, r: d - 0.6, z: 2 }];
    if (k === 'lighthouse') return [{ k: 'beam', c: 0.5, r: 0.5, z: 75 }];
    if (k === 'skytower') return [{ k: 'blink', c: w / 2, r: d / 2, z: 320 }];
    if (k === 'skyspire') return [{ k: 'blink', c: 1.5, r: 1.5, z: 450 }];
    if (k === 'pyramid') return [{ k: 'skybeam', c: w / 2, r: w / 2, z: 120 }];
    return [];
  };
  // a camel (the caravan walks across the desert on the map)
  function drawCamel(g, x, y, dir, k, ph) {
    g.save(); g.translate(x, y); g.scale((dir || 1) * (k || 1), k || 1);
    const leg = Math.sin(ph || 0) * 2;
    ellipse(g, 0, 0, 10, 3, 'rgba(0,0,0,.14)');
    line(g, [[-5, -9], [-6 + leg, 0]], '#a07a4a', 1.6); line(g, [[5, -9], [6 - leg, 0]], '#a07a4a', 1.6);
    ellipse(g, 0, -12, 9, 5, '#c99a5c'); ellipse(g, -1, -16, 4, 3.4, '#c99a5c');
    line(g, [[7, -12], [10, -20]], '#c99a5c', 3); ellipse(g, 11.5, -21, 3, 2, '#c99a5c');
    g.restore();
  }
  A.drawCamel = drawCamel;
  A.landmark = landmark;
})(typeof window !== 'undefined' ? window : globalThis);
