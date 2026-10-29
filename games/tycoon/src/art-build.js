/* art-build.js — the buildings on Tycoon Town's lots (adds to window.TYART): the neighbours' houses, shops and
   towers in each city's own style (Seaside Bay, Desert Oasis, Neon City, Sakura City), building sites, lots for
   sale, and the company's businesses from a lemonade stand to the international airport. Anchor = the lot's
   top corner; a lot is 1 x 1 tile, 2 x 2 in the towers, 3 x 3 in the Gateway. */
(function (root) {
  'use strict';
  const A = root.TYART;
  const { HW, HH, shade, mix, pick, P, poly, line, circle, ellipse, diamond, box, boxC, onL, onR, windows, glassBox, snowTop, roof, pyramid, curvedRoof, awning, door, shadowBox, pad, cyl, dome, faceText, drawPlane } = A;
  const WALLS = ['#f6ecd8', '#f5d7c3', '#d9ecdf', '#dde8f4', '#f7e4ac', '#e8dcf2', '#f3c9b9', '#ece6da', '#cfe4ea', '#fbe0e0'];
  const ROOFS = ['#d9846a', '#c96e5a', '#8fa0b6', '#6f8098', '#b07a5c', '#7fae6d', '#5f7189', '#e0a15e'];
  const BRICK = ['#d08b6a', '#c97f63', '#b9735c', '#dba07e'];
  const GLASS = ['#a6cde9', '#9ed3d6', '#b4c6ea', '#8fbfdf', '#a9dbe8', '#c3d4f0'];
  const AWN = ['#e86f62', '#5aa6dd', '#6cc08f', '#f2c14e', '#b07fd8', '#f08aa8', '#4fb3b0'];
  const SAND = ['#ecd9b4', '#e6cfa4', '#f3e6cc', '#dfc497', '#f6efe0', '#e9d3ab'];
  const GOLD_GLASS = ['#d9c79f', '#cdbd96', '#bcd3dc', '#c9b98e', '#a9cbd8', '#e0cfa6'];
  const PASTEL = ['#f4c9a8', '#a9dcd2', '#f2dfa8', '#f3b8b2', '#c9d9a8', '#e9d1f0', '#f6e3c8'];
  const NEON = ['#ff4fa3', '#41e0ff', '#ffd23f', '#7cff6b', '#b46bff', '#ff8a3d'];
  const JP_WALL = ['#efe6d4', '#e8dcc6', '#f3ece0', '#e2d6c0'], JP_ROOF = ['#4a5566', '#5d6b7d', '#555c66', '#6b5a4a'], JP_SIGN = ['#d9433a', '#2f6fb8', '#f2c14e', '#ffffff', '#3a9a5a'];
  A.AWN = AWN; A.GLASS = GLASS; A.NEON = NEON;
  const win = '#7fa6c9', winD = '#6b8fb2';

  /* ---------- the neighbours' buildings, by city, district and look ---------- */
  function npcBuilding(g, d, look, w, face, theme) {
    const fl = face === 'S' || face === 'W' ? 'L' : 'R';
    if (d === 'gateway') return npcGateway(g, look, fl, theme);
    if (theme === 'desert') return npcDesert(g, d, look, w, fl, face);
    if (theme === 'neon') return npcNeon(g, d, look, w, fl, face);
    if (theme === 'sakura') return npcSakura(g, d, look, w, fl, face);
    return npcBay(g, d, look, w, fl, face);
  }
  function npcBay(g, d, v, w, fl, face) {
    const wall = pick(WALLS, v * 3 + 1), rf = pick(ROOFS, v * 5 + 2);
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
        if (v % 3 === 0 && !A.flags.snow) { [[0.1, 0.92], [0.5, 0.92], [0.9, 0.92]].forEach(([c, r]) => { const p = P(c, r); circle(g, p[0], p[1] - 3, 3, '#7cc25a'); }); }
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
        poly(g, diamond(0.15, 0.15, 0.7, 0.7, 22), shade(wall, -0.06)); snowTop(g, 0.15, 0.15, 0.7, 0.7, 22);
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
      snowTop(g, 0.1, 0.1, 0.8, 0.8, h);
      if (st === 1 && !A.flags.snow) { const p = P(0.5, 0.5, h); for (let i = 0; i < 3; i++) circle(g, p[0] - 8 + i * 8, p[1] + 2, 2.4, '#7cc25a'); }   // a roof garden
      return;
    }
    if (d === 'downtown') return npcOffices(g, v, GLASS, ['#efe6d6', '#e9d7c6', '#dfe7ea', '#f1e2c7'], null);
    return npcTowers(g, v, face, GLASS, null);
  }
  // downtown blocks (shared by the cities, each with its own colours and extras)
  function npcOffices(g, v, glassSet, walls, extra) {
    const st = v % 5, floors = 5 + (v % 6), h = floors * 9;
    pad(g, 0, 0, 1, 1, '#e4e1da');
    shadowBox(g, 0.12, 0.12, 0.76, 0.76, h);
    if (st <= 1) {          // offices in glass
      glassBox(g, 0.12, 0.12, 0.76, 0.76, 0, h, pick(glassSet, v), floors);
      box(g, 0.3, 0.3, 0.3, 0.3, h, 5, '#d8dde3', '#c3c9d1', '#aab1bb');
    } else if (st === 2) {  // flats with balconies
      const col = pick(walls, v);
      boxC(g, 0.12, 0.12, 0.76, 0.76, 0, h, col);
      windows(g, 0.12, 0.12, 0.76, 0.76, 0, h, floors, 3, 3, win, winD, 0.42, 0.45);
      for (let f = 1; f < floors; f++) line(g, [P(0.12, 0.88, f * 9 - 2), P(0.88, 0.88, f * 9 - 2), P(0.88, 0.12, f * 9 - 2)], 'rgba(255,255,255,.8)', 1.4);
      poly(g, diamond(0.12, 0.12, 0.76, 0.76, h), shade(col, -0.1)); snowTop(g, 0.12, 0.12, 0.76, 0.76, h);
    } else if (st === 3) {  // a stone office block
      const col = pick(['#e8dfcf', '#d9d4cb', '#eadfcd'], v);
      boxC(g, 0.12, 0.12, 0.76, 0.76, 0, h, col);
      windows(g, 0.12, 0.12, 0.76, 0.76, 0, h, floors, 4, 4, '#8fb1cf', '#7a9bb8', 0.55, 0.55);
      poly(g, diamond(0.12, 0.12, 0.76, 0.76, h), shade(col, -0.08)); snowTop(g, 0.12, 0.12, 0.76, 0.76, h);
      box(g, 0.22, 0.22, 0.2, 0.2, h, 6, '#c8cdd4', '#b5bbc4', '#a0a7b1');
    } else {                // a hotel with a sign on the roof
      const col = pick(['#f2e1cf', '#e6eef3'], v);
      boxC(g, 0.14, 0.14, 0.72, 0.72, 0, h, col);
      windows(g, 0.14, 0.14, 0.72, 0.72, 0, h, floors, 3, 3, '#f5d58d', '#e1c07a', 0.45, 0.45);
      poly(g, diamond(0.14, 0.14, 0.72, 0.72, h), shade(col, -0.08)); snowTop(g, 0.14, 0.14, 0.72, 0.72, h);
      poly(g, onL(0.3, 0.3, 0.4, 0.4, h, 10, 0, 1, 0, 1), pick(AWN, v));
    }
    if (extra) extra(g, v, h);
  }
  // the 2 x 2 towers (shared by the cities): glass, twins, steps, headquarters; warehouses by the port
  function npcTowers(g, v, face, glassSet, extra) {
    const st = v % 5, floors = 14 + (v % 15), h = floors * 8;
    pad(g, 0, 0, 2, 2, '#e3e0d8');
    if (face === 'X') {       // warehouses by the port
      shadowBox(g, 0.15, 0.2, 1.7, 1.5, 34);
      boxC(g, 0.15, 0.2, 1.7, 1.5, 0, 26, pick(['#d7dde2', '#cfd8cf', '#e2d8c9'], v));
      roof(g, 0.12, 0.17, 1.76, 1.56, 26, 10, pick(['#8fa0b6', '#7c93a7', '#a9b5c2'], v), 'c');
      poly(g, onL(0.15, 0.2, 1.7, 1.5, 0, 26, 0.1, 0.35, 0, 0.6), '#9aa6b2'); poly(g, onL(0.15, 0.2, 1.7, 1.5, 0, 26, 0.55, 0.8, 0, 0.6), '#9aa6b2');
      return;
    }
    shadowBox(g, 0.3, 0.3, 1.4, 1.4, h);
    if (st === 0 || st === 3) {   // a tall glass tower
      glassBox(g, 0.35, 0.35, 1.3, 1.3, 0, h, pick(glassSet, v), floors);
      if (st === 3) { glassBox(g, 0.6, 0.6, 0.8, 0.8, h, 40, pick(glassSet, v + 2), 5); line(g, [P(1, 1, h + 40), P(1, 1, h + 70)], '#9aa3ad', 2); }
    } else if (st === 1) {        // twin towers
      glassBox(g, 0.25, 0.25, 0.7, 0.7, 0, h, pick(glassSet, v), floors);
      glassBox(g, 1.05, 1.05, 0.7, 0.7, 0, h * 0.8, pick(glassSet, v + 1), Math.round(floors * 0.8));
    } else if (st === 2) {        // a stepped tower
      glassBox(g, 0.25, 0.25, 1.5, 1.5, 0, h * 0.45, pick(glassSet, v), Math.round(floors * 0.45));
      glassBox(g, 0.45, 0.45, 1.1, 1.1, h * 0.45, h * 0.35, pick(glassSet, v + 1), Math.round(floors * 0.35));
      glassBox(g, 0.65, 0.65, 0.7, 0.7, h * 0.8, h * 0.25, pick(glassSet, v + 2), Math.round(floors * 0.25));
    } else {                      // stone and glass headquarters
      const col = pick(['#e7dccb', '#dcd5ca'], v);
      boxC(g, 0.25, 0.25, 1.5, 1.5, 0, 30, col);
      windows(g, 0.25, 0.25, 1.5, 1.5, 0, 30, 3, 8, 8, '#8fb1cf', '#7a9bb8', 0.5, 0.5);
      glassBox(g, 0.5, 0.5, 1, 1, 30, h - 30, pick(glassSet, v), floors - 3);
      circle(g, P(1, 1, h + 6)[0], P(1, 1, h + 6)[1], 4, '#f2c14e');
    }
    if (extra) extra(g, v, h, st);
  }

  /* Desert Oasis: sand-coloured houses with flat roofs, wind towers and domes; white villas; gold glass */
  function crenel(g, c, r, w, d, z, col) {   // little battlements along a flat roof's near edges
    const n = Math.max(3, Math.round(w * 6));
    for (let i = 0; i < n; i += 2) box(g, c + (i / n) * w, r + d - 0.05, w / n, 0.05, z, 2.4, shade(col, 0.1), col, shade(col, -0.15));
    for (let i = 0; i < n; i += 2) box(g, c + w - 0.05, r + (i / n) * d, 0.05, d / n, z, 2.4, shade(col, 0.1), col, shade(col, -0.15));
  }
  function archDoor(g, fl, c, r, w, d, u, col) {
    const pts = fl === 'L' ? onL(c, r, w, d, 0, 13, u - 0.12, u + 0.12, 0, 0.75) : onR(c, r, w, d, 0, 13, u - 0.12, u + 0.12, 0, 0.75);
    poly(g, pts, col);
    const top = fl === 'L' ? onL(c, r, w, d, 0, 13, u - 0.12, u + 0.12, 0.75, 0.75) : onR(c, r, w, d, 0, 13, u - 0.12, u + 0.12, 0.75, 0.75);
    const mx = (top[0][0] + top[1][0]) / 2, my = (top[0][1] + top[1][1]) / 2; ellipse(g, mx, my, Math.abs(top[1][0] - top[0][0]) / 2, 2.2, col);
  }
  function npcDesert(g, d, v, w, fl, face) {
    const wall = pick(SAND, v * 3 + 1);
    if (d === 'market') {
      const st = v % 5;
      pad(g, 0, 0, 1, 1, st === 4 ? '#e9d5ad' : '#efe0c2');
      if (st <= 1) {          // a courtyard house with a wind tower
        const h = 16 + (v % 2) * 9;
        shadowBox(g, 0.14, 0.14, 0.72, 0.72, h + 16);
        boxC(g, 0.14, 0.14, 0.72, 0.72, 0, h, wall);
        windows(g, 0.14, 0.14, 0.72, 0.72, 0, h, h > 20 ? 2 : 1, 2, 2, '#7d6a52', '#6c5a44', 0.22, 0.4);
        archDoor(g, fl, 0.14, 0.14, 0.72, 0.72, 0.5, '#8a5a3a');
        poly(g, diamond(0.14, 0.14, 0.72, 0.72, h), shade(wall, -0.05)); crenel(g, 0.14, 0.14, 0.72, 0.72, h, wall);
        boxC(g, 0.2, 0.2, 0.2, 0.2, h, 16, shade(wall, 0.04));      // the wind tower catches the breeze
        for (let i = 0; i < 2; i++) { poly(g, onL(0.2, 0.2, 0.2, 0.2, h, 16, 0.2 + i * 0.4, 0.4 + i * 0.4, 0.45, 0.9), '#5e4a36'); poly(g, onR(0.2, 0.2, 0.2, 0.2, h, 16, 0.2 + i * 0.4, 0.4 + i * 0.4, 0.45, 0.9), '#4f3e2e'); }
      } else if (st === 2) {  // a little mosque-like house with a dome
        shadowBox(g, 0.18, 0.18, 0.64, 0.64, 30);
        boxC(g, 0.18, 0.18, 0.64, 0.64, 0, 15, '#f4ecdc');
        archDoor(g, fl, 0.18, 0.18, 0.64, 0.64, 0.5, '#4f7fa8');
        poly(g, diamond(0.18, 0.18, 0.64, 0.64, 15), '#e9dfcb');
        const p = P(0.5, 0.5, 15); dome(g, p[0], p[1], 11, 14, v % 2 ? '#5fa0c8' : '#e8d9b8');
      } else if (st === 3) {  // a souk stall row under a canvas roof
        boxC(g, 0.1, 0.25, 0.8, 0.5, 0, 12, wall);
        for (let i = 0; i < 3; i++) poly(g, onL(0.1, 0.25, 0.8, 0.5, 0, 12, 0.06 + i * 0.32, 0.3 + i * 0.32, 0.05, 0.85), '#6b4a30');
        for (let i = 0; i < 3; i++) poly(g, [P(0.06 + i * 0.29, 0.75, 13), P(0.33 + i * 0.29, 0.75, 13), P(0.33 + i * 0.29, 0.98, 8), P(0.06 + i * 0.29, 0.98, 8)], pick(AWN, v + i));
        poly(g, diamond(0.1, 0.25, 0.8, 0.5, 12), shade(wall, -0.06));
        for (let i = 0; i < 4; i++) { const q = P(0.2 + i * 0.2, 0.8, 0); circle(g, q[0], q[1] - 2, 1.6, pick(['#f2c14e', '#e8562f', '#7cc25a', '#b07fd8'], v + i)); }
      } else {                // a family house with a palm in the yard
        boxC(g, 0.12, 0.3, 0.6, 0.55, 0, 20, wall);
        windows(g, 0.12, 0.3, 0.6, 0.55, 0, 20, 2, 2, 2, '#7d6a52', '#6c5a44', 0.25, 0.4);
        poly(g, diamond(0.12, 0.3, 0.6, 0.55, 20), shade(wall, -0.05)); crenel(g, 0.12, 0.3, 0.6, 0.55, 20, wall);
        g.save(); const q = P(0.82, 0.25); g.translate(q[0], q[1]); g.scale(0.6, 0.6); A.drawPoint(g, 'palm', v, 1, { season: 'summer' }); g.restore();
      }
      return;
    }
    if (d === 'high') {       // Palm Road: white villas and arcaded shops
      const st = v % 4, floors = 2 + (v % 2), h = floors * 11, col = v % 3 ? '#f8f4ec' : '#f1e6d2';
      pad(g, 0, 0, 1, 1, st === 0 ? '#b9d98a' : '#efe4cf');
      shadowBox(g, 0.12, 0.12, 0.76, 0.76, h);
      if (st === 0) {         // a villa with a pool
        poly(g, diamond(0.55, 0.62, 0.36, 0.28, 0.5), '#4fb6dc'); poly(g, diamond(0.58, 0.65, 0.3, 0.22, 0.6), '#7fd0ec');
        boxC(g, 0.1, 0.1, 0.62, 0.5, 0, h, col);
        windows(g, 0.1, 0.1, 0.62, 0.5, 0, h, floors, 3, 2, '#8fc0de', '#7aaacb', 0.42, 0.5);
        poly(g, diamond(0.1, 0.1, 0.62, 0.5, h), '#e8e0d0');
        box(g, 0.1, 0.6, 0.62, 0.06, h * 0.5, 2, '#ffffff', '#e6dfd2', '#d2cabc');
        return;
      }
      boxC(g, 0.1, 0.1, 0.8, 0.8, 0, h, col);
      for (let k = 0; k < 4; k++) { const pts = fl === 'L' ? onL(0.1, 0.1, 0.8, 0.8, 0, 11, 0.05 + k * 0.24, 0.23 + k * 0.24, 0, 0.8) : onR(0.1, 0.1, 0.8, 0.8, 0, 11, 0.05 + k * 0.24, 0.23 + k * 0.24, 0, 0.8); poly(g, pts, st === 1 ? '#c9e4f2' : '#e3d2b4'); }
      windows(g, 0.1, 0.1, 0.8, 0.8, 11, h - 11, floors - 1, 3, 3, '#8fc0de', '#7aaacb', 0.3, 0.5);
      poly(g, diamond(0.1, 0.1, 0.8, 0.8, h), '#e8e0d0'); crenel(g, 0.1, 0.1, 0.8, 0.8, h, col);
      if (st === 3) { const p = P(0.5, 0.5, h); dome(g, p[0], p[1], 9, 10, '#d9b45a'); }
      return;
    }
    if (d === 'downtown') return npcOffices(g, v, GOLD_GLASS, ['#efe4cf', '#e8dcc2', '#f3ead8', '#e1d3b5'], (gg, vv, h) => {
      if (vv % 7 === 2) { const p = P(0.5, 0.5, h + 5); line(gg, [p, [p[0], p[1] - 18]], '#b9a26a', 1.4); }
    });
    return npcTowers(g, v, face, GOLD_GLASS, (gg, vv, h, st) => {
      if (st === 0 && vv % 3 === 0) {   // a sail-shaped crown
        const a = P(0.35, 1.65, h), b = P(1.65, 0.35, h), t = P(1, 1, h + 46);
        gg.beginPath(); gg.moveTo(a[0], a[1]); gg.quadraticCurveTo(t[0] - 30, t[1] + 6, t[0], t[1]); gg.quadraticCurveTo(t[0] + 22, t[1] + 20, b[0], b[1]); gg.closePath(); gg.fillStyle = 'rgba(245,248,252,.92)'; gg.fill();
      }
    });
  }

  /* Neon City: pastel ranch houses, motels and diners with signs, bright towers on the Strip */
  function neonTube(g, pts, col) { line(g, pts, shade(col, 0.5), 2.4); line(g, pts, col, 1.2); }
  function npcNeon(g, d, v, w, fl, face) {
    if (d === 'market') {     // Old Town: ranch houses with cactus gardens and pools
      const st = v % 5, col = pick(PASTEL, v * 3);
      pad(g, 0, 0, 1, 1, st === 3 ? '#e8d3a8' : '#e6d6b2');
      if (st === 3) {         // a trailer and a big cactus
        box(g, 0.15, 0.35, 0.65, 0.32, 1, 10, '#f3f4f6', '#e4e8ec', '#c9d0d8'); line(g, [P(0.15, 0.67, 6), P(0.8, 0.67, 6)], pick(NEON, v), 1.4);
        g.save(); const q = P(0.75, 0.2); g.translate(q[0], q[1]); g.scale(0.7, 0.7); A.drawPoint(g, 'cactus', v, 1, { season: 'summer' }); g.restore();
        return;
      }
      shadowBox(g, 0.12, 0.18, 0.76, 0.6, 18);
      boxC(g, 0.12, 0.18, 0.76, 0.6, 0, 13, col);
      windows(g, 0.12, 0.18, 0.76, 0.6, 0, 13, 1, 3, 2, '#8fc6e0', '#7ab0cc', 0.36, 0.5);
      poly(g, diamond(0.08, 0.14, 0.84, 0.68, 13), shade(col, -0.12));
      poly(g, diamond(0.12, 0.18, 0.76, 0.6, 14.5), shade(col, -0.2));
      if (st === 1) { poly(g, diamond(0.55, 0.8, 0.32, 0.14, 0.5), '#3fb8e0'); }
      else if (st === 2) { const q = P(0.86, 0.88); g.save(); g.translate(q[0], q[1]); g.scale(0.55, 0.55); A.drawPoint(g, 'joshua', v, 1, { season: 'summer' }); g.restore(); }
      return;
    }
    if (d === 'high') {       // Main Street: diners, motels and shops with big signs
      const st = v % 4, col = pick(PASTEL, v * 5 + 1), neon = pick(NEON, v);
      pad(g, 0, 0, 1, 1, '#e4dccb');
      shadowBox(g, 0.1, 0.1, 0.8, 0.8, 30);
      if (st === 0) {         // a diner: rounded, chrome and a big sign
        boxC(g, 0.1, 0.25, 0.8, 0.5, 0, 12, '#f1f3f5');
        line(g, [P(0.1, 0.75, 6), P(0.9, 0.75, 6), P(0.9, 0.25, 6)], '#e05a5a', 2.4);
        windows(g, 0.1, 0.25, 0.8, 0.5, 0, 12, 1, 5, 3, '#a9d8ee', '#93c2da', 0.6, 0.45);
        poly(g, diamond(0.1, 0.25, 0.8, 0.5, 12), '#dfe3e8');
        const p = P(0.3, 0.3, 12); g.fillStyle = '#5b6170'; g.fillRect(p[0] - 0.8, p[1] - 22, 1.6, 22);
        A.roundRect(g, p[0] - 13, p[1] - 34, 26, 12, 4, '#2b2350'); neonTube(g, [[p[0] - 11, p[1] - 28], [p[0] + 11, p[1] - 28]], neon);
        return;
      }
      if (st === 1) {         // a motel: two floors of doors and a tall sign
        boxC(g, 0.1, 0.2, 0.8, 0.6, 0, 20, col);
        for (let f = 0; f < 2; f++) for (let k = 0; k < 4; k++) poly(g, onL(0.1, 0.2, 0.8, 0.6, f * 10, 10, 0.06 + k * 0.24, 0.18 + k * 0.24, 0.05, 0.8), f ? '#c8a27a' : '#b98f68');
        line(g, [P(0.1, 0.8, 10), P(0.9, 0.8, 10)], '#ffffff', 1.4);
        poly(g, diamond(0.1, 0.2, 0.8, 0.6, 20), shade(col, -0.1));
        const p = P(0.88, 0.85, 0); g.fillStyle = '#5b6170'; g.fillRect(p[0] - 1, p[1] - 44, 2, 44);
        A.roundRect(g, p[0] - 7, p[1] - 58, 14, 22, 3, neon); g.fillStyle = '#2b2350'; g.font = '800 5px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MOTEL', p[0], p[1] - 47);
        return;
      }
      const floors = 2 + (v % 2), h = floors * 11;
      boxC(g, 0.1, 0.1, 0.8, 0.8, 0, h, col);
      windows(g, 0.1, 0.1, 0.8, 0.8, 11, h - 11, floors - 1, 3, 3, '#8fc6e0', '#7ab0cc', 0.3, 0.5);
      if (fl === 'L') poly(g, onL(0.1, 0.1, 0.8, 0.8, 0, 10, 0.06, 0.94, 0.06, 0.92), '#c9e8f4'); else poly(g, onR(0.1, 0.1, 0.8, 0.8, 0, 10, 0.06, 0.94, 0.06, 0.92), '#b4d8ea');
      poly(g, diamond(0.1, 0.1, 0.8, 0.8, h), shade(col, -0.1));
      neonTube(g, [P(0.1, 0.9, h - 1), P(0.9, 0.9, h - 1), P(0.9, 0.1, h - 1)], neon);
      if (st === 3) { const pts = fl === 'L' ? onL(0.1, 0.1, 0.8, 0.8, h, 12, 0.2, 0.8, 0, 1) : onR(0.1, 0.1, 0.8, 0.8, h, 12, 0.2, 0.8, 0, 1); poly(g, pts, '#2b2350'); neonTube(g, [pts[0], pts[1], pts[2], pts[3], pts[0]], neon); }
      return;
    }
    if (d === 'downtown') {   // the old downtown: marquees and blade signs covered in bulbs
      const floors = 4 + (v % 5), h = floors * 9, col = pick(['#e9d9c0', '#d9c8b0', '#efe3d0', '#e3cfc4'], v);
      pad(g, 0, 0, 1, 1, '#d9d4cb');
      shadowBox(g, 0.12, 0.12, 0.76, 0.76, h);
      boxC(g, 0.12, 0.12, 0.76, 0.76, 0, h, col);
      windows(g, 0.12, 0.12, 0.76, 0.76, 0, h, floors, 3, 3, '#8fb1cf', '#7a9bb8', 0.42, 0.45);
      poly(g, diamond(0.12, 0.12, 0.76, 0.76, h), shade(col, -0.1));
      const neon = pick(NEON, v * 7);
      if (fl === 'L') { poly(g, onL(0.12, 0.12, 0.76, 0.76, 6, 6, 0, 1, 0, 1), '#2b2350'); neonTube(g, onL(0.12, 0.12, 0.76, 0.76, 6, 6, 0.04, 0.96, 0.5, 0.5).slice(0, 2), neon); }
      else { poly(g, onR(0.12, 0.12, 0.76, 0.76, 6, 6, 0, 1, 0, 1), '#2b2350'); neonTube(g, onR(0.12, 0.12, 0.76, 0.76, 6, 6, 0.04, 0.96, 0.5, 0.5).slice(0, 2), neon); }
      const bp = P(0.88, 0.88, h * 0.4); A.roundRect(g, bp[0] - 3, bp[1] - h * 0.5, 6, h * 0.5, 2, neon);
      for (let i = 0; i < 5; i++) circle(g, bp[0], bp[1] - h * 0.45 + i * h * 0.09, 1, '#fff6c8');
      return;
    }
    return npcTowers(g, v, face, ['#e0c98f', '#d4b97c', '#9fd2e8', '#e8d3a0', '#c9a6e8', '#f2c27a'], (gg, vv, h) => {
      // a resort tower's name in lights at the top
      const neon = pick(NEON, vv * 3), p = P(1, 1, h + 4);
      neonTube(gg, [P(0.35, 1.65, h - 2), P(1.65, 1.65, h - 2), P(1.65, 0.35, h - 2)], neon);
      A.roundRect(gg, p[0] - 14, p[1] - 10, 28, 9, 3, '#2b2350'); neonTube(gg, [[p[0] - 11, p[1] - 5.5], [p[0] + 11, p[1] - 5.5]], neon);
    });
  }

  /* Sakura City: wooden shop-houses with tiled roofs and lanterns, Ginza shops with tall signs */
  function noren(g, fl, c, r, w, d, col) {   // the short curtain over a shop door
    for (let k = 0; k < 3; k++) { const pts = fl === 'L' ? onL(c, r, w, d, 7, 5, 0.3 + k * 0.14, 0.42 + k * 0.14, 0, 1) : onR(c, r, w, d, 7, 5, 0.3 + k * 0.14, 0.42 + k * 0.14, 0, 1); poly(g, pts, col); }
  }
  function npcSakura(g, d, v, w, fl, face) {
    if (d === 'market') {     // Shotengai: machiya shop-houses
      const st = v % 5, wall = pick(JP_WALL, v), rf = pick(JP_ROOF, v * 3), wood = '#7a5238';
      pad(g, 0, 0, 1, 1, st === 4 ? '#b9d98a' : '#e4dccb');
      if (st === 4) {         // a house with a little garden and a stone lantern
        boxC(g, 0.15, 0.2, 0.62, 0.55, 0, 13, wall);
        for (let k = 0; k < 3; k++) poly(g, onL(0.15, 0.2, 0.62, 0.55, 0, 13, 0.08 + k * 0.3, 0.3 + k * 0.3, 0.1, 0.85), '#e9e1cf');
        curvedRoof(g, 0.12, 0.17, 0.68, 0.61, 13, 10, rf);
        g.save(); const q = P(0.86, 0.86); g.translate(q[0], q[1]); A.drawPoint(g, 'lantern', 1, 1, {}); g.restore();
        return;
      }
      const h = st <= 2 ? 22 : 15;
      shadowBox(g, 0.12, 0.12, 0.76, 0.76, h + 8);
      boxC(g, 0.12, 0.12, 0.76, 0.76, 0, h, wall);
      // dark wooden lattice on the ground floor, a noren curtain over the door
      for (let k = 0; k < 6; k++) { const pts = fl === 'L' ? onL(0.12, 0.12, 0.76, 0.76, 0, 11, 0.05 + k * 0.155, 0.11 + k * 0.155, 0.05, 0.9) : onR(0.12, 0.12, 0.76, 0.76, 0, 11, 0.05 + k * 0.155, 0.11 + k * 0.155, 0.05, 0.9); poly(g, pts, wood); }
      noren(g, fl, 0.12, 0.12, 0.76, 0.76, pick(['#2f4f8a', '#8a2f3a', '#2f6a4a', '#5a3a7a'], v));
      if (h > 20) { windows(g, 0.12, 0.12, 0.76, 0.76, 12, 10, 1, 2, 2, '#e9e1cf', '#d9d0bc', 0.5, 0.6); box(g, 0.08, 0.84, 0.84, 0.08, 11, 1.6, shade(rf, 0.1), rf, shade(rf, -0.2)); }
      curvedRoof(g, 0.08, 0.08, 0.84, 0.84, h, 11, rf);
      if (st === 1) { const p = fl === 'L' ? P(0.2, 0.94, 10) : P(0.94, 0.2, 10); ellipse(g, p[0], p[1], 2.6, 3.4, '#e0453a'); }
      return;
    }
    if (d === 'high') {       // Ginza Street: modern shops with tall signs
      const floors = 3 + (v % 3), h = floors * 10, col = pick(['#f4f2ee', '#e9edf1', '#efe8e0', '#e3e8ea', '#f0e6dc'], v);
      pad(g, 0, 0, 1, 1, '#e6e1d8');
      shadowBox(g, 0.1, 0.1, 0.8, 0.8, h);
      if (v % 3 === 0) glassBox(g, 0.1, 0.1, 0.8, 0.8, 0, h, pick(GLASS, v), floors);
      else { boxC(g, 0.1, 0.1, 0.8, 0.8, 0, h, col); windows(g, 0.1, 0.1, 0.8, 0.8, 0, h, floors, 3, 3, '#9fc7e0', '#86afc8', 0.6, 0.55); poly(g, diamond(0.1, 0.1, 0.8, 0.8, h), shade(col, -0.08)); snowTop(g, 0.1, 0.1, 0.8, 0.8, h); }
      // a tall vertical sign on the street corner
      const sg = pick(JP_SIGN, v * 3), p = fl === 'L' ? P(0.18, 0.95, 8) : P(0.95, 0.18, 8);
      A.roundRect(g, p[0] - 3, p[1] - h + 2, 6, h - 6, 1.5, sg);
      g.fillStyle = sg === '#ffffff' ? '#d9433a' : '#ffffff';
      for (let i = 0; i < 4; i++) g.fillRect(p[0] - 1.4, p[1] - h + 6 + i * (h - 12) / 4, 2.8, 2.2);
      return;
    }
    if (d === 'downtown') return npcOffices(g, v, GLASS, ['#eef0f2', '#e4e7ea', '#f2efea', '#dde3e8'], (gg, vv, h) => {
      if (vv % 2) { const sg = pick(JP_SIGN, vv), pts = onL(0.12, 0.12, 0.76, 0.76, h * 0.55, h * 0.3, 0.3, 0.7, 0, 1); poly(gg, pts, sg); }
      if (vv % 5 === 1) { const p = P(0.5, 0.5, h + 5); line(gg, [p, [p[0], p[1] - 16]], '#d9433a', 1.2); circle(gg, p[0], p[1] - 16, 1.4, '#ffffff'); }
    });
    return npcTowers(g, v, face, GLASS, (gg, vv, h) => {
      if (vv % 3 === 1) { const p = P(1, 1, h); line(gg, [p, [p[0], p[1] - 36]], '#d9433a', 2); line(gg, [[p[0], p[1] - 20], [p[0], p[1] - 36]], '#ffffff', 2); circle(gg, p[0], p[1] - 37, 1.6, '#e05a5a'); }
    });
  }

  /* the Gateway's neighbours (3 x 3 lots): warehouses, an airport hotel, office campus, a car park */
  function npcGateway(g, v, fl, theme) {
    const st = v % 5, tint = theme === 'desert' ? '#efe4cf' : theme === 'neon' ? '#efe3e8' : theme === 'sakura' ? '#eef0f2' : '#e9edf0';
    pad(g, 0, 0, 3, 3, '#d9d6cf');
    if (st <= 1) {            // a logistics warehouse with loading bays and lorries
      shadowBox(g, 0.2, 0.3, 2.6, 2, 40);
      boxC(g, 0.2, 0.3, 2.6, 2, 0, 30, st ? '#dfe4e8' : tint);
      for (let i = 0; i < 6; i++) poly(g, onL(0.2, 0.3, 2.6, 2, 0, 30, 0.06 + i * 0.155, 0.16 + i * 0.155, 0, 0.5), '#7d8794');
      poly(g, diamond(0.2, 0.3, 2.6, 2, 30), '#c9d0d8'); snowTop(g, 0.2, 0.3, 2.6, 2, 30);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) box(g, 0.5 + i * 0.6, 0.6 + j * 0.55, 0.3, 0.2, 30, 2, '#e3e8ec', '#d2d8de', '#bfc6ce');
      const ac = pick(AWN, v); for (let i = 0; i < 3; i++) { box(g, 0.4 + i * 0.85, 2.45, 0.5, 0.18, 0, 8, '#f6f7f8', '#e6e9ec', '#cdd3d9'); box(g, 0.9 + i * 0.85, 2.47, 0.14, 0.14, 0, 7, ac, shade(ac, -0.1), shade(ac, -0.25)); }
      if (theme === 'neon') line(g, [P(0.2, 2.3, 28), P(2.8, 2.3, 28)], pick(NEON, v), 1.6);
    } else if (st === 2) {    // an airport hotel
      const floors = 12 + (v % 6), h = floors * 8;
      shadowBox(g, 0.5, 0.6, 2, 1.4, h);
      box(g, 0.3, 0.3, 2.4, 2.2, 0, 10, '#e7e2d8', '#d9d2c4', '#c4bcae');
      boxC(g, 0.6, 0.7, 1.8, 1.2, 10, h, theme === 'desert' ? '#f3ead8' : '#eef1f4');
      windows(g, 0.6, 0.7, 1.8, 1.2, 10, h, floors, 8, 5, theme === 'desert' ? '#d9c79f' : '#9fc7e0', theme === 'desert' ? '#c9b98e' : '#86afc8', 0.6, 0.5);
      poly(g, diamond(0.6, 0.7, 1.8, 1.2, 10 + h), '#d9dfe6'); snowTop(g, 0.6, 0.7, 1.8, 1.2, 10 + h);
      const p = P(1.5, 1.3, 10 + h); A.roundRect(g, p[0] - 18, p[1] - 12, 36, 10, 3, theme === 'neon' ? '#2b2350' : '#3d4a5c');
      g.fillStyle = theme === 'neon' ? pick(NEON, v) : '#ffffff'; g.font = '800 7px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HOTEL', p[0], p[1] - 6.6);
    } else if (st === 3) {    // an office campus round a lawn
      poly(g, diamond(0.2, 0.2, 2.6, 2.6, 0.4), A.flags.snow ? '#eef3f7' : '#b9dd8b');
      [[0.3, 0.3, 1.1, 0.9, 40], [1.6, 0.3, 1.1, 1.1, 56], [0.3, 1.5, 1.2, 1.1, 32]].forEach(([c, r, ww, dd, h], i) => { shadowBox(g, c, r, ww, dd, h); glassBox(g, c, r, ww, dd, 0, h, pick(theme === 'desert' ? GOLD_GLASS : GLASS, v + i), Math.round(h / 8)); });
      for (let i = 0; i < 4; i++) { const q = P(1.9 + (i % 2) * 0.5, 1.9 + Math.floor(i / 2) * 0.5); g.save(); g.translate(q[0], q[1]); g.scale(0.7, 0.7); A.drawPoint(g, theme === 'desert' || theme === 'neon' ? 'palm' : theme === 'sakura' ? 'cherry' : 'tree', v + i, 1, { season: 'summer' }); g.restore(); }
    } else {                  // a car park on several floors
      shadowBox(g, 0.3, 0.3, 2.4, 2.4, 36);
      for (let f = 0; f < 4; f++) {
        box(g, 0.3, 0.3, 2.4, 2.4, f * 9, 1.6, '#c9c6bf', '#b9b5ad', '#a6a29a');
        if (f < 3) { for (let k = 0; k < 8; k++) { const col = pick(['#e05a5a', '#5aa6dd', '#f2c14e', '#f5f5f5', '#6cc08f', '#3d4a5c'], v + f * 8 + k); box(g, 0.45 + (k % 4) * 0.55, 0.5 + Math.floor(k / 4) * 1.4, 0.32, 0.18, f * 9 + 1.6, 3.4, shade(col, 0.15), col, shade(col, -0.2)); } }
        line(g, [P(0.3, 2.7, f * 9 + 6), P(2.7, 2.7, f * 9 + 6), P(2.7, 0.3, f * 9 + 6)], '#8f8a82', 1);
      }
      poly(g, diamond(0.3, 0.3, 2.4, 2.4, 36), '#bdb9b1');
      const q = P(2.5, 0.5, 36); A.roundRect(g, q[0] - 6, q[1] - 16, 12, 12, 3, '#3f7fd0'); g.fillStyle = '#fff'; g.font = '800 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', q[0], q[1] - 9.6);
    }
  }

  // a building site: a fence, scaffolding and a crane
  function siteBuilding(g, w, left) {
    pad(g, 0, 0, w, w, '#d8c7a6');
    const h = (w > 2 ? 90 : w > 1 ? 70 : 22) * (left > 1 ? 0.4 : 0.8);
    box(g, 0.2 * w, 0.2 * w, 0.6 * w, 0.6 * w, 0, h, '#c9c2b6', '#b7aea0', '#a39a8c');
    for (let f = 1; f * 8 < h; f++) line(g, [P(0.2 * w, 0.8 * w, f * 8), P(0.8 * w, 0.8 * w, f * 8), P(0.8 * w, 0.2 * w, f * 8)], '#e2a526', 1);
    const m = P(0.85 * w, 0.85 * w), top = h + (w > 1 ? 60 : 34);
    line(g, [m, [m[0], m[1] - top]], '#f2b632', 2.2);
    line(g, [[m[0] - 30 * w * 0.5, m[1] - top], [m[0] + 14, m[1] - top]], '#f2b632', 2);
    line(g, [[m[0] - 20 * w * 0.5, m[1] - top], [m[0] - 20 * w * 0.5, m[1] - top + 18]], '#6b6b6b', 0.8);
    [[0, 0], [w, 0], [w, w], [0, w]].reduce((a, b) => { line(g, [P(a[0], a[1], 0), P(b[0], b[1], 0)], '#f08a3c', 1.2); return b; }, [0, w]);
  }
  function saleSign(g, own, color, w) {
    w = w || 1;
    pad(g, 0, 0, w, w, own ? '#dfeec9' : '#cfe6b0');
    if (own) {
      [[0.06, 0.06], [w - 0.06, 0.06], [w - 0.06, w - 0.06], [0.06, w - 0.06], [0.06, 0.06]].reduce((a, b) => { line(g, [P(a[0], a[1], 3), P(b[0], b[1], 3)], '#c4995d', 1.4); return b; });
      const p = P(w / 2, w / 2); line(g, [p, [p[0], p[1] - 26]], '#6b6b6b', 1.4); poly(g, [[p[0], p[1] - 26], [p[0] + 13, p[1] - 22], [p[0], p[1] - 18]], color || '#f2c14e');
      return;
    }
    const p = P(w / 2, w * 0.62);
    line(g, [p, [p[0], p[1] - 14]], '#8a6646', 1.6);
    g.fillStyle = '#ffffff'; g.fillRect(p[0] - 9, p[1] - 22, 18, 10); g.strokeStyle = '#d9534a'; g.lineWidth = 1.2; g.strokeRect(p[0] - 9, p[1] - 22, 18, 10);
    g.fillStyle = '#d9534a'; g.font = '700 6.2px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SALE', p[0], p[1] - 16.6);
  }

  /* ---------- small helpers for the leisure pictures (parks, golf, circuits, stadiums) ---------- */
  // a closed outline round (c0, r0): a long along c, b along r (n = 2 an ellipse, 3 a rounded square), as screen points at height z
  function ovalPts(c0, r0, a, b, z, n, steps) {
    n = n || 2; steps = steps || 60;
    const pw = (v) => Math.sign(v) * Math.pow(Math.abs(v), 2 / n), pts = [];
    for (let i = 0; i < steps; i++) { const t = (i / steps) * Math.PI * 2; pts.push(P(c0 + a * pw(Math.cos(t)), r0 + b * pw(Math.sin(t)), z)); }
    return pts;
  }
  const closed = (pts) => pts.concat([pts[0]]);
  function disc(g, c, r, rad, z, fill) { const p = P(c, r, z); ellipse(g, p[0], p[1], rad * 1.414 * HW, rad * 1.414 * HH, fill); }   // a round patch of ground, rad in tiles
  function smooth(g, pts) {   // a smooth path through screen points
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  }
  function ribbon(g, pts, col, w, edge) {   // a tube slide or a track: dark edge, colour, bright highlight
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    smooth(g, pts); g.strokeStyle = edge || shade(col, -0.35); g.lineWidth = w + 1.5; g.stroke();
    smooth(g, pts); g.strokeStyle = col; g.lineWidth = w; g.stroke();
    g.translate(0, -w * 0.22); smooth(g, pts); g.strokeStyle = shade(col, 0.5); g.lineWidth = Math.max(0.5, w * 0.22); g.stroke();
    g.restore();
  }
  // a tree or a palm from the kit, standing on (c, r) at scale k (bare and snowy in a snowy winter)
  function put(g, kind, c, r, k, v, z) {
    const q = P(c, r, z || 0); g.save(); g.translate(q[0], q[1]); g.scale(k, k);
    A.drawPoint(g, kind, v || 0, 1, A.flags.snow ? { season: 'winter', snow: true } : { season: 'summer' }); g.restore();
  }
  function parasol(g, c, r, col, z) {   // a beach parasol; furled when it is snowing
    const p = P(c, r, z || 0), sn = A.flags.snow;
    ellipse(g, p[0] + 2, p[1] + 0.5, 6, 2, 'rgba(40,60,40,.16)');
    line(g, [p, [p[0], p[1] - 13]], '#7a5a3e', 1);
    if (sn) { poly(g, [[p[0] - 1.6, p[1] - 12], [p[0] + 1.6, p[1] - 12], [p[0] + 0.6, p[1] - 4], [p[0] - 0.6, p[1] - 4]], col); return; }
    ellipse(g, p[0], p[1] - 11, 6.6, 2.4, shade(col, -0.22));
    poly(g, [[p[0] - 6.6, p[1] - 11], [p[0] + 6.6, p[1] - 11], [p[0], p[1] - 17]], col);
    poly(g, [[p[0] - 2.2, p[1] - 11], [p[0] + 2.2, p[1] - 11], [p[0], p[1] - 17]], '#ffffff');
  }
  function flagPole(g, c, r, z, h, col) {   // a pole with a little pennant on top
    const p = P(c, r, z); line(g, [p, [p[0], p[1] - h]], '#eef1f4', 1);
    poly(g, [[p[0], p[1] - h], [p[0] + 6, p[1] - h + 2], [p[0], p[1] - h + 4]], col);
  }
  function racer(g, c, r, along, col) {   // a little open-wheel racing car on the track
    const L = along === 'c';
    box(g, c, r, L ? 0.22 : 0.08, L ? 0.08 : 0.22, 0.5, 2.4, shade(col, 0.2), col, shade(col, -0.2));
    box(g, L ? c + 0.08 : c + 0.02, L ? r + 0.02 : r + 0.07, L ? 0.07 : 0.04, L ? 0.04 : 0.07, 2.9, 1.8, '#26303c', '#1d252f', '#161c24');
    box(g, L ? c - 0.025 : c - 0.005, L ? r - 0.005 : r - 0.025, L ? 0.03 : 0.09, L ? 0.09 : 0.03, 0.5, 4.2, shade(col, -0.1), shade(col, -0.2), shade(col, -0.35));
    box(g, L ? c + 0.2 : c - 0.005, L ? r - 0.005 : r + 0.2, L ? 0.04 : 0.09, L ? 0.09 : 0.04, 0.5, 1.2, '#2a323c', '#222a33', '#1a2027');
  }

  // a glass dome over the screen point (x, y): see-through, with ribs and rings, so what is inside shows
  function glassDome(g, x, y, rx, h, tint) {
    const ry = rx / 2, sil = () => { g.beginPath(); g.moveTo(x - rx, y); g.ellipse(x, y, rx, ry, 0, Math.PI, 0, true); g.bezierCurveTo(x + rx, y - h * 0.8, x + rx * 0.55, y - h, x, y - h); g.bezierCurveTo(x - rx * 0.55, y - h, x - rx, y - h * 0.8, x - rx, y); g.closePath(); };
    const gr = g.createLinearGradient(x - rx * 0.8, y - h, x + rx * 0.9, y);
    gr.addColorStop(0, 'rgba(235,248,255,.62)'); gr.addColorStop(0.45, mix(tint, '#ffffff', 0.55) + '44'); gr.addColorStop(1, shade(tint, -0.3) + '55');
    sil(); g.fillStyle = gr; g.fill();
    g.save(); sil(); g.clip(); g.lineWidth = 0.8; g.strokeStyle = 'rgba(255,255,255,.75)';
    for (let k = -3; k <= 3; k++) { const f = k / 4, yb = y + ry * Math.sqrt(1 - f * f); g.beginPath(); g.moveTo(x + rx * f, yb); g.bezierCurveTo(x + rx * f, yb - h * 0.8, x + rx * 0.55 * f, yb - h * 0.97, x, y - h); g.stroke(); }
    [[0.27, 0.96], [0.52, 0.85], [0.75, 0.66]].forEach(([t, fr]) => { g.beginPath(); g.ellipse(x, y - t * h, rx * fr, ry * fr, 0, 0, Math.PI); g.stroke(); });
    g.restore();
    sil(); g.lineWidth = 1.3; g.strokeStyle = 'rgba(120,150,175,.8)'; g.stroke();
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI); g.lineWidth = 1.8; g.strokeStyle = '#f4f8fb'; g.stroke();
    g.beginPath(); g.moveTo(x - rx * 0.78, y - h * 0.5); g.bezierCurveTo(x - rx * 0.7, y - h * 0.8, x - rx * 0.4, y - h * 0.95, x - rx * 0.1, y - h * 0.97); g.lineWidth = 2.2; g.strokeStyle = 'rgba(255,255,255,.5)'; g.stroke();
  }
  // the front arc of a closed outline (leftmost point to rightmost, the lower way round): what you see of a wall that stands on it
  function lowerArc(pts) {
    let i0 = 0, i1 = 0; pts.forEach((p, i) => { if (p[0] < pts[i0][0]) i0 = i; if (p[0] > pts[i1][0]) i1 = i; });
    const walk = (a, b) => { const o = []; for (let i = a; ; i = (i + 1) % pts.length) { o.push(pts[i]); if (i === b) break; } return o; };
    const A1 = walk(i0, i1), A2 = walk(i1, i0).reverse(), avg = (arr) => arr.reduce((t, p) => t + p[1], 0) / arr.length;
    return avg(A1) > avg(A2) ? A1 : A2;
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
    football: ['stadium', '#3f7fd0'], port: ['port', '#e2803e'], skyscraper: ['supertower', '#7fb8e0'], airline: ['airhangar', '#5aa6dd'], space: ['launchpad', '#e8ecf2'],
    intairport: ['intairport', '#3f8fd8'], cruiseport: ['cruiseport', '#2fa0c8'], shipyard: ['shipyard', '#e2803e'], bullettrain: ['bullettrain', '#3fb0a8'], filmstudio: ['filmstudio', '#f2c14e'],
    megaresort: ['megaresort', '#f08aa8'], arena: ['arena', '#9b6fe0'], robotfactory: ['robotfactory', '#f08a3c'], satellite: ['satellite', '#5a7ad8'], cleanpower: ['cleanpower', '#4fbf7a'],
    splashpark: ['splashpark', '#35b8e8'], golf: ['golf', '#4caf50'], amusement: ['amusement', '#ff7043'], wavepark: ['wavepark', '#1fb5c9'], racetrack: ['racetrack', '#e53935'],
    aquadome: ['aquadome', '#29b6f6'], bigstadium: ['bigstadium', '#1e88e5']
  };
  // how tall each kind of business stands (for its picture, its badge and taps)
  const BIZ_TOP = { stand: 22, kiosk: 30, tent: 30, kennel: 22, garage: 20, carwash: 24, shop: 36, shop3: 48, truck: 20, flats: 62, glass: 66, vfarm: 84, tower: 128, tower2: 140, hub: 16, depot: 26, market: 28, cinema: 34, factory: 46,
    solar: 10, busdepot: 24, mall: 50, datacentre: 34, themepark: 70, stadium: 32, port: 50, supertower: 300, airhangar: 40, launchpad: 112,
    intairport: 80, cruiseport: 64, shipyard: 112, bullettrain: 52, filmstudio: 74, megaresort: 168, arena: 62, robotfactory: 92, satellite: 96, cleanpower: 150,
    splashpark: 52, golf: 39, amusement: 94, wavepark: 92, racetrack: 52, aquadome: 98, bigstadium: 94 };
  function bizBuilding(g, id, w, face, accent, rival) {
    const st = BIZ_STYLE[id] || ['shop', '#f2c14e'], col = rival ? shade(accent, -0.15) : accent, fl = face === 'S' || face === 'W' ? 'L' : 'R';
    const s = st[0], mt = (c) => (rival ? mix(c, '#9aa1ab', 0.7) : c);   // a rival's bright colours turn grey
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
        const p = P(0.8, 0.9); g.strokeStyle = '#444'; g.lineWidth = 0.8; g.beginPath(); g.arc(p[0] - 4, p[1] - 3, 2.6, 0, 7); g.moveTo(p[0] + 5.6, p[1] - 3); g.arc(p[0] + 3, p[1] - 3, 2.6, 0, 7); g.stroke();
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
      poly(g, diamond(0.1, 0.1, 0.8, 0.8, h), shade(col, 0.2)); snowTop(g, 0.1, 0.1, 0.8, 0.8, h);
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
        poly(g, diamond(0.14, 0.14, 0.72, 0.72, h), shade(col, -0.1)); snowTop(g, 0.14, 0.14, 0.72, 0.72, h);
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
        poly(g, diamond(0.08, 0.1, 0.84, 0.8, 18), '#dfe5ea'); snowTop(g, 0.08, 0.1, 0.84, 0.8, 18);
        if (fl === 'L') poly(g, onL(0.08, 0.1, 0.84, 0.8, 18, 8, 0.2, 0.8, 0, 1), col); else poly(g, onR(0.08, 0.1, 0.84, 0.8, 18, 8, 0.2, 0.8, 0, 1), col);
      } else if (s === 'cinema') {
        shadowBox(g, 0.1, 0.1, 0.8, 0.8, 34);
        boxC(g, 0.1, 0.1, 0.8, 0.8, 0, 32, rival ? '#7c7f90' : shade(col, -0.25));
        if (fl === 'L') { poly(g, onL(0.1, 0.1, 0.8, 0.8, 0, 32, 0.1, 0.9, 0.4, 0.7), '#fff3c4'); for (let i = 0; i < 6; i++) { const p = onL(0.1, 0.1, 0.8, 0.8, 0, 32, 0.12 + i * 0.13, 0.12 + i * 0.13, 0.75, 0.75)[0]; circle(g, p[0], p[1], 1.6, '#f2c14e'); } }
        else poly(g, onR(0.1, 0.1, 0.8, 0.8, 0, 32, 0.1, 0.9, 0.4, 0.7), '#efe2a8');
        poly(g, diamond(0.1, 0.1, 0.8, 0.8, 32), shade(col, -0.35)); snowTop(g, 0.1, 0.1, 0.8, 0.8, 32);
      } else {                // a factory with a saw-tooth roof and a chimney
        shadowBox(g, 0.08, 0.1, 0.84, 0.8, 26);
        boxC(g, 0.08, 0.1, 0.84, 0.8, 0, 18, '#e9e1d2');
        for (let i = 0; i < 3; i++) roof(g, 0.08 + i * 0.28, 0.1, 0.28, 0.8, 18, 10, i % 2 ? '#9aa6b2' : '#b3bdc8', 'r');
        box(g, 0.72, 0.18, 0.1, 0.1, 18, 26, '#c97f63', '#b9735c', '#a3654f');
        const p = P(0.5, 0.95, 4); circle(g, p[0], p[1], 3.5, col); circle(g, p[0] - 2.6, p[1] - 3.6, 1.6, col); circle(g, p[0] + 2.6, p[1] - 3.6, 1.6, col);
      }
      return;
    }
    if (s === 'splashpark') {   // a kids' splash park on one tile: a shallow pool, three slides on a tower, a tipping bucket
      const sn = A.flags.snow, wat = sn ? '#cfe6ef' : mt('#4fc8ee'), wat2 = sn ? '#e6f3f8' : mt('#8fe3f7'), red = mt('#ef4b4b'), yel = mt('#f7c53a'), blu = mt('#3f86e0');
      pad(g, 0, 0, 1, 1, sn ? '#f1f5f8' : '#e4f1ee', 'rgba(0,0,0,.06)');
      shadowBox(g, 0.4, 0.06, 0.3, 0.3, 34);
      poly(g, diamond(0.1, 0.46, 0.8, 0.48, 0), '#ffffff');   // the pool, with a white kerb
      poly(g, diamond(0.14, 0.5, 0.72, 0.4, 0.5), wat);
      poly(g, diamond(0.24, 0.55, 0.52, 0.3, 0.6), wat2);
      if (!sn) { [[0.3, 0.66], [0.66, 0.82], [0.75, 0.6], [0.4, 0.82]].forEach(([c, r]) => { const p = P(c, r, 0.7); ellipse(g, p[0], p[1], 3.2, 1.2, 'rgba(255,255,255,.7)'); }); }
      // the ticket hut at the right corner
      boxC(g, 0.8, 0.08, 0.15, 0.17, 0, 10, '#fff4cf');
      poly(g, onL(0.8, 0.08, 0.15, 0.17, 0, 10, 0.2, 0.8, 0.35, 0.8), '#7fc4e8');
      roof(g, 0.77, 0.05, 0.21, 0.23, 10, 6, red, 'c');
      // the slide tower: a little house with a pointed roof
      boxC(g, 0.4, 0.06, 0.3, 0.3, 0, 26, '#fff4cf');
      poly(g, onL(0.4, 0.06, 0.3, 0.3, 0, 26, 0, 1, 0.42, 0.52), blu); poly(g, onR(0.4, 0.06, 0.3, 0.3, 0, 26, 0, 1, 0.42, 0.52), shade(blu, -0.17));
      poly(g, onL(0.4, 0.06, 0.3, 0.3, 0, 26, 0.38, 0.62, 0, 0.3), '#8a6a4a');
      pyramid(g, 0.36, 0.02, 0.38, 0.38, 26, 13, mt(col));
      const top = P(0.55, 0.21, 39); line(g, [top, [top[0], top[1] - 7]], '#eef1f4', 1); poly(g, [[top[0], top[1] - 7], [top[0] + 5, top[1] - 5], [top[0], top[1] - 3]], yel);
      // three slides into the pool: red to the left, yellow to the front, blue to the right
      ribbon(g, [P(0.42, 0.3, 21), P(0.3, 0.42, 14), P(0.24, 0.54, 6), P(0.26, 0.64, 1)], red, 3);
      ribbon(g, [P(0.56, 0.36, 18), P(0.56, 0.46, 11), P(0.5, 0.54, 5), P(0.46, 0.6, 1)], yel, 3);
      ribbon(g, [P(0.68, 0.24, 21), P(0.82, 0.3, 14), P(0.86, 0.44, 6), P(0.78, 0.56, 1)], blu, 3);
      // the mushroom fountain in the pool, and kids with swim rings
      const f = P(0.56, 0.72, 0.6); g.fillStyle = '#e9eef2'; g.fillRect(f[0] - 1, f[1] - 9, 2, 9);
      ellipse(g, f[0], f[1] - 9, 6.6, 2.6, shade(mt(col), -0.2)); poly(g, [[f[0] - 6.6, f[1] - 9], [f[0] + 6.6, f[1] - 9], [f[0], f[1] - 13]], mt(col));
      if (!sn) { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; circle(g, f[0] + Math.cos(a) * 8, f[1] - 4 + Math.sin(a) * 2.6, 0.9, 'rgba(255,255,255,.95)'); line(g, [[f[0] + Math.cos(a) * 6.2, f[1] - 9 + Math.sin(a) * 2], [f[0] + Math.cos(a) * 8, f[1] - 3 + Math.sin(a) * 2.6]], 'rgba(255,255,255,.8)', 0.7); } }
      [[0.26, 0.8, red], [0.78, 0.72, yel]].forEach(([c, r, k]) => { const p = P(c, r, 0.7); ellipse(g, p[0], p[1], 3.4, 1.5, k); ellipse(g, p[0], p[1], 1.6, 0.7, wat); circle(g, p[0], p[1] - 2.2, 1.5, '#f3c9a0'); });
      // the tipping bucket on a post at the left corner, pouring into the pool
      const b = P(0.1, 0.7, 0); line(g, [b, [b[0], b[1] - 20]], '#8a8f9a', 1.4);
      poly(g, [[b[0] - 4, b[1] - 25], [b[0] + 3.4, b[1] - 22.6], [b[0] + 2, b[1] - 17.6], [b[0] - 2.8, b[1] - 19]], yel);
      poly(g, [[b[0] - 4, b[1] - 25], [b[0] + 3.4, b[1] - 22.6], [b[0] + 2.9, b[1] - 24], [b[0] - 4.4, b[1] - 26.4]], shade(yel, -0.25)); line(g, [[b[0] - 4, b[1] - 25], [b[0] - 5.6, b[1] - 20.6], [b[0] - 2.8, b[1] - 19]], '#c9951c', 0.8);
      if (!sn) { line(g, [[b[0] + 3.4, b[1] - 19], [b[0] + 4.4, b[1] - 9], [b[0] + 6, b[1] - 1]], 'rgba(120,215,245,.95)', 1.6); circle(g, b[0] + 6, b[1] - 0.5, 1.8, 'rgba(255,255,255,.8)'); }
      parasol(g, 0.94, 0.4, red);
      return;
    }
    if (w >= 3) return megaBuilding(g, s, col, fl, rival);
    // Skyline: 2 x 2 lots
    pad(g, 0, 0, 2, 2, '#e3e0d8');
    if (s === 'solar') {
      pad(g, 0, 0, 2, 2, '#c9e3a6');
      for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
        const c0 = 0.12 + c * 0.45, r0 = 0.12 + r * 0.36;
        poly(g, [P(c0, r0, 2), P(c0 + 0.38, r0, 2), P(c0 + 0.38, r0 + 0.22, 7), P(c0, r0 + 0.22, 7)], A.flags.snow ? '#9fb7d0' : '#3d6fa8');
        line(g, [P(c0, r0 + 0.11, 4.5), P(c0 + 0.38, r0 + 0.11, 4.5)], 'rgba(255,255,255,.4)', 0.6);
      }
    } else if (s === 'busdepot') {
      boxC(g, 0.2, 0.2, 1.6, 0.8, 0, 22, '#eef3f0'); poly(g, diamond(0.2, 0.2, 1.6, 0.8, 22), '#dce6e0'); snowTop(g, 0.2, 0.2, 1.6, 0.8, 22);
      for (let i = 0; i < 4; i++) box(g, 0.3 + i * 0.4, 1.2, 0.26, 0.6, 0, 9, shade(col, 0.2), col, shade(col, -0.2));
      for (let i = 0; i < 4; i++) { const p = P(0.43 + i * 0.4, 1.85, 0); g.fillStyle = '#4b5563'; g.fillRect(p[0] - 1, p[1] - 10, 2, 10); circle(g, p[0], p[1] - 11, 2, '#7cf2a8'); }
    } else if (s === 'mall') {
      shadowBox(g, 0.15, 0.15, 1.7, 1.7, 40);
      boxC(g, 0.15, 0.15, 1.7, 1.7, 0, 34, '#f3eee6');
      if (fl === 'L') poly(g, onL(0.15, 0.15, 1.7, 1.7, 0, 34, 0.08, 0.92, 0.05, 0.55), '#bfe0f0'); else poly(g, onR(0.15, 0.15, 1.7, 1.7, 0, 34, 0.08, 0.92, 0.05, 0.55), '#a9cde0');
      poly(g, diamond(0.15, 0.15, 1.7, 1.7, 34), '#dfe5ea'); snowTop(g, 0.15, 0.15, 1.7, 1.7, 34);
      glassBox(g, 0.75, 0.75, 0.5, 0.5, 34, 14, '#bfe0f0', 2);
      poly(g, onL(0.15, 0.15, 1.7, 1.7, 22, 12, 0.3, 0.7, 0, 1), rival ? '#8a8f9a' : col);
    } else if (s === 'datacentre') {
      shadowBox(g, 0.2, 0.2, 1.6, 1.6, 30);
      boxC(g, 0.2, 0.2, 1.6, 1.6, 0, 28, rival ? '#9aa1ab' : '#dfe4ea');
      for (let i = 0; i < 6; i++) poly(g, onL(0.2, 0.2, 1.6, 1.6, 0, 28, 0.06 + i * 0.15, 0.16 + i * 0.15, 0.2, 0.8), '#4b5a72');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const p = P(0.45 + i * 0.36, 0.45 + j * 0.36, 28); ellipse(g, p[0], p[1], 6, 3, '#9aa6b2'); ellipse(g, p[0], p[1], 3.5, 1.7, '#5e6b7d'); }
    } else if (s === 'themepark') {
      pad(g, 0, 0, 2, 2, A.flags.snow ? '#eef3f7' : '#bfe293');
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
      ellipse(g, 0, -14, 40, 20, A.flags.snow ? '#e8f0f4' : '#59ad4a'); if (!A.flags.snow) for (let i = -3; i <= 3; i++) ellipse(g, i * 10, -14, 4, 18 - Math.abs(i) * 2, i % 2 ? '#6bbd57' : '#59ad4a');
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(0, -14, 12, 6, 0, 0, 7); g.stroke();
      g.restore();
    } else if (s === 'golf') {   // a golf course: striped fairways, greens with flags, bunkers, a pond, a cart path, a clubhouse
      const sn = A.flags.snow, fw = sn ? ['#f8fbfd', '#e9f0f6'] : ['#a6dc72', '#92ce5c'], gr = sn ? ['#f2f7fa', '#e3ecf3'] : ['#7fd05c', '#68bb4b'], sand = sn ? '#ebe7da' : '#f1dfae';
      pad(g, 0, 0, 2, 2, '#bfe293', 'rgba(0,0,0,.06)');
      const fair = (pts, wd) => {   // a mown fairway: a wide band with stripes across it
        const sp = pts.map(([c, r]) => P(c, r, 0.3));
        g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
        smooth(g, sp); g.strokeStyle = fw[1]; g.lineWidth = wd; g.stroke();
        g.lineCap = 'butt'; g.setLineDash([wd * 0.42, wd * 0.42]); smooth(g, sp); g.strokeStyle = fw[0]; g.lineWidth = wd; g.stroke();
        g.restore();
      };
      const green = (c, r, rad, fc) => {   // a green with a darker fringe, a hole and a flag
        disc(g, c, r, rad * 1.22, 0.3, fw[1]); disc(g, c, r, rad, 0.4, gr[1]); disc(g, c + rad * 0.12, r - rad * 0.1, rad * 0.78, 0.5, gr[0]);
        const p = P(c + rad * 0.25, r - rad * 0.1, 0.5); ellipse(g, p[0], p[1], 1.6, 0.8, '#2b3a2b');
        line(g, [p, [p[0], p[1] - 15]], '#f4f6f8', 0.9); poly(g, [[p[0], p[1] - 15], [p[0] + 6, p[1] - 13], [p[0], p[1] - 11]], fc);
      };
      const bunker = (c, r, rad) => { disc(g, c, r, rad * 1.1, 0.4, shade(sand, -0.12)); disc(g, c + 0.01, r - 0.01, rad * 0.9, 0.5, sand); };
      // the pond with a sandy shore
      poly(g, ovalPts(1.08, 1.0, 0.42, 0.3, 0.2, 2.2, 40), sn ? '#f4f8fb' : '#dcd3a0');
      poly(g, ovalPts(1.08, 1.0, 0.36, 0.25, 0.3, 2.2, 40), sn ? '#dbeef6' : mt('#58bde3'));
      line(g, [P(0.88, 0.95, 0.4), P(1.0, 0.88, 0.4), P(1.18, 0.9, 0.4)], 'rgba(255,255,255,.75)', 0.8); line(g, [P(1.0, 1.1, 0.4), P(1.14, 1.04, 0.4), P(1.28, 1.08, 0.4)], 'rgba(255,255,255,.6)', 0.8);
      // the cart path, the fairways, and tee boxes
      fair([[0.62, 1.78], [0.6, 1.4], [0.5, 1.0], [0.42, 0.7], [0.5, 0.52]], 9);
      fair([[1.3, 1.7], [1.55, 1.5], [1.7, 1.2], [1.74, 0.85]], 8);
      fair([[1.15, 0.28], [1.4, 0.34], [1.62, 0.42]], 7);
      ribbon(g, [P(0.3, 1.7, 0.4), P(0.95, 1.55, 0.4), P(1.3, 1.35, 0.4), P(1.45, 1.0, 0.4), P(1.35, 0.7, 0.4), P(0.9, 0.55, 0.4)], sn ? '#e7ebee' : '#e2d8bf', 2.2, sn ? '#d3d9de' : '#cfc3a4');
      [[0.62, 1.8], [1.3, 1.72], [1.1, 0.26]].forEach(([c, r]) => poly(g, diamond(c - 0.07, r - 0.05, 0.14, 0.1, 0.5), shade(fw[1], -0.14)));
      green(0.5, 0.48, 0.2, mt('#e84a4a'));
      green(1.76, 0.82, 0.19, mt('#f7c53a'));
      green(1.7, 0.42, 0.14, mt('#3f86e0'));
      bunker(0.74, 0.62, 0.1); bunker(0.32, 0.42, 0.08); bunker(1.55, 1.0, 0.1); bunker(1.9, 0.62, 0.07); bunker(0.58, 1.22, 0.08);
      // the clubhouse at the left corner, with a terrace and a golfer
      poly(g, diamond(0.12, 1.32, 0.5, 0.5, 0.5), sn ? '#eef2f5' : '#e8e0cc');
      shadowBox(g, 0.18, 1.38, 0.34, 0.3, 20);
      boxC(g, 0.18, 1.38, 0.34, 0.3, 0, 10, '#fbf3e0');
      windows(g, 0.18, 1.38, 0.34, 0.3, 0, 10, 1, 2, 2, '#8fb6d6', '#7a9fbf', 0.4, 0.5);
      roof(g, 0.14, 1.34, 0.42, 0.38, 10, 7, mt('#b9503e'), 'c');
      flagPole(g, 0.46, 1.52, 16, 9, mt('#e84a4a'));
      const gp = P(0.82, 1.45); line(g, [[gp[0], gp[1] - 1], [gp[0], gp[1] - 6]], mt('#3f86e0'), 1.8); circle(g, gp[0], gp[1] - 7.4, 1.2, '#f3c9a0'); line(g, [[gp[0], gp[1] - 5], [gp[0] + 4, gp[1] - 1.5]], '#c9ced4', 0.7);
      // trees round the edges
      [[0.12, 0.95, 0.4, 1], [0.16, 0.2, 0.42, 2], [0.95, 0.1, 0.4, 3], [1.45, 0.1, 0.4, 4], [1.92, 0.12, 0.42, 5], [1.9, 1.3, 0.4, 6], [1.2, 1.88, 0.4, 7], [0.3, 1.12, 0.4, 8], [0.9, 1.6, 0.36, 9], [1.78, 1.5, 0.4, 10]].forEach(([c, r, k, v]) => put(g, v % 3 === 0 ? 'pine' : 'tree', c, r, k, v));
    } else if (s === 'amusement') {   // a classic amusement park: a striped carousel, a tall drop tower, a looping coaster and a gate
      const sn = A.flags.snow, K = mt(col), red = mt('#e5483f'), cream = '#fff3d8', steel = '#8a8f9a';
      pad(g, 0, 0, 2, 2, sn ? '#eef3f7' : '#f3e6cf', 'rgba(0,0,0,.06)');
      poly(g, diamond(0.45, 1.15, 1.3, 0.75, 0.3), sn ? '#f8fafc' : '#f9f0e0');   // the plaza inside the gate
      shadowBox(g, 1.62, 0.26, 0.16, 0.16, 40);
      // the looping coaster: a lift hill, a drop, a loop and a lap back to the station
      const track = [[0.45, 1.05, 4], [0.32, 0.85, 16], [0.28, 0.6, 38], [0.32, 0.35, 56], [0.5, 0.3, 46], [0.68, 0.32, 22], [0.8, 0.34, 6]];
      const LC = 1.08, LR = 0.36, LZ = 23, RZ = 20, RC = 0.36;
      for (let i = 0; i <= 28; i++) { const t = (i / 28) * Math.PI * 2; track.push([LC + RC * Math.sin(t) * (1 - 0.15 * Math.cos(t)), LR + 0.14 * (i / 28), LZ - RZ * Math.cos(t) + (i === 0 ? 0 : 0)]); }
      track.push([1.4, 0.55, 5], [1.62, 0.8, 8], [1.58, 1.05, 16], [1.32, 1.12, 10], [0.95, 1.08, 5], [0.62, 1.06, 4], [0.45, 1.05, 4]);
      const pts = track.map(([c, r, z]) => P(c, r, z));
      track.forEach(([c, r, z], i) => { if (z > 8 && (i < 7 || i > 32) && i % 2 === 0) line(g, [P(c, r, 0), P(c, r, z - 1)], '#9aa1ab', 0.9); });
      
      
      ribbon(g, pts, K, 2.4, shade(K, -0.4));
      // the station
      box(g, 0.5, 1.02, 0.3, 0.2, 0, 7, '#fff3d8', '#efe2c4', '#d8c8a6'); roof(g, 0.48, 1.0, 0.34, 0.24, 7, 4, red, 'c');
      // the drop tower: red and white stripes, a gondola ring that falls
      for (let k = 0; k < 8; k++) boxC(g, 1.62, 0.26, 0.16, 0.16, k * 9, 9, k % 2 ? '#ffffff' : red);
      boxC(g, 1.56, 0.2, 0.28, 0.28, 72, 5, shade(red, -0.2)); pyramid(g, 1.6, 0.24, 0.2, 0.2, 77, 7, '#ffffff');
      boxC(g, 1.53, 0.17, 0.34, 0.34, 36, 6, K);
      [[1.58, 0.54], [1.84, 0.54], [1.84, 0.28]].forEach(([c, r]) => line(g, [P(c, r, 36), P(c, r, 31)], '#3a4660', 1));
      flagPole(g, 1.7, 0.34, 84, 9, mt('#f7c53a'));
      // the carousel: a striped canopy over a turning floor, poles and horses
      const cc = 1.3, cr = 1.38, rad = 0.34, cb = P(cc, cr, 4), rx = rad * 1.414 * HW, ry = rad * 1.414 * HH;
      cyl(g, cc, cr, rad, 0, 4, '#f6e8cc', '#e8d3a6');
      const poles = []; for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.2; poles.push([cb[0] + Math.cos(a) * rx * 0.8, cb[1] + Math.sin(a) * ry * 0.8, k]); }
      poles.sort((a, b) => a[1] - b[1]);
      poles.forEach(([x, y, k]) => { line(g, [[x, y], [x, y - 17]], '#e6c15a', 0.9); ellipse(g, x, y - 8 - (k % 2) * 3, 2.1, 1.5, k % 3 ? '#ffffff' : '#f2c9a0'); circle(g, x + 1.6, y - 10.4 - (k % 2) * 3, 0.9, '#ffffff'); });
      line(g, [cb, [cb[0], cb[1] - 21]], '#e6c15a', 2.4);
      const wedges = []; for (let k = 0; k < 10; k++) { const a0 = (k / 10) * Math.PI * 2 + 0.3, a1 = ((k + 1) / 10) * Math.PI * 2 + 0.3; wedges.push([k, (a0 + a1) / 2, a0, a1]); }
      wedges.sort((a, b) => Math.sin(a[1]) - Math.sin(b[1]));
      const ap = [cb[0], cb[1] - 31], ce = P(cc, cr, 21);
      wedges.forEach(([k, m, a0, a1]) => poly(g, [ap, [ce[0] + Math.cos(a0) * rx * 1.1, ce[1] + Math.sin(a0) * ry * 1.1], [ce[0] + Math.cos(a1) * rx * 1.1, ce[1] + Math.sin(a1) * ry * 1.1]], shade(k % 2 ? cream : K, -0.16 * Math.cos(m))));
      circle(g, ap[0], ap[1], 1.8, '#f7c53a'); line(g, [ap, [ap[0], ap[1] - 5]], '#eef1f4', 0.8); poly(g, [[ap[0], ap[1] - 5], [ap[0] + 4.5, ap[1] - 3.6], [ap[0], ap[1] - 2.2]], red);
      // the gate: striped pillars, a sign over the top, balloons
      [0.62, 1.34].forEach((c) => { for (let k = 0; k < 4; k++) boxC(g, c, 1.8, 0.1, 0.1, k * 5.5, 5.5, k % 2 ? '#ffffff' : red); circle(g, ...P(c + 0.05, 1.86, 24), 2, '#f7c53a'); });
      box(g, 0.62, 1.82, 0.82, 0.07, 17, 9, shade(K, 0.25), K, shade(K, -0.2));
      faceText(g, 'L', 0.62, 1.82, 0.82, 0.07, 17, 9, 'FUN', K, '#ffffff', 6.5);
      for (let k = 0; k < 6; k++) circle(g, ...P(0.7 + k * 0.13, 1.9, 26.4), 0.8, '#fff3b0');
      [[0.46, 1.72, '#e5483f'], [0.54, 1.66, '#f7c53a'], [0.4, 1.62, '#3f86e0']].forEach(([c, r, b], i) => { const p = P(c, r, 0), top = [p[0] + (i - 1) * 2, p[1] - 17 - i * 2]; line(g, [p, top], '#9aa1ab', 0.5); ellipse(g, top[0], top[1] - 3, 2.6, 3.2, mt(b)); });
    } else if (s === 'wavepark') {   // a tropical water park: a wave lagoon, a lazy river, two tube slides off a tall tower, palms and a bamboo hut
      const sn = A.flags.snow, K = mt(col), pink = mt('#ff5a8a'), sun = mt('#ffc83d');
      const wat = sn ? '#7db9cf' : mt('#2db8d8'), wat2 = sn ? '#9fd0e0' : mt('#6fd6e8');
      pad(g, 0, 0, 2, 2, sn ? '#eef3f7' : '#f3e5c0', 'rgba(0,0,0,.06)');
      shadowBox(g, 0.88, 0.22, 0.24, 0.24, 40);
      // the wave lagoon in front, with white wave curves rolling in from the back
      poly(g, ovalPts(1.35, 1.3, 0.6, 0.52, 0.2, 2.3, 44), '#ffffff');
      poly(g, ovalPts(1.35, 1.3, 0.55, 0.47, 0.4, 2.3, 44), wat);
      poly(g, ovalPts(1.35, 1.34, 0.42, 0.34, 0.5, 2.3, 44), wat2);
      if (!sn) [[0.95, 0.98, 1.2, 0.93, 1.5, 0.93, 1.78, 0.98], [0.9, 1.15, 1.2, 1.08, 1.55, 1.08, 1.85, 1.15], [0.95, 1.34, 1.25, 1.27, 1.6, 1.27, 1.84, 1.34]].forEach((w8) => {
        const wp = [0, 2, 4, 6].map((i) => P(w8[i], w8[i + 1], 0.7)); smooth(g, wp); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 1.2; g.stroke();
        wp.forEach((p, i) => { if (i % 3 === 1) ellipse(g, p[0], p[1] + 1, 2.6, 0.9, 'rgba(255,255,255,.7)'); });
      });
      // the lazy river: a ring round a little sand island with a palm
      poly(g, ovalPts(0.5, 1.28, 0.42, 0.42, 0.2, 2, 36), '#ffffff');
      poly(g, ovalPts(0.5, 1.28, 0.38, 0.38, 0.4, 2, 36), wat);
      poly(g, ovalPts(0.5, 1.28, 0.2, 0.2, 0.7, 2, 28), sn ? '#f4f7fa' : '#f1dfae');
      if (!sn) [[0.5, 0.95, '#ff5a8a'], [0.8, 1.35, '#ffc83d'], [0.3, 1.58, '#3f86e0']].forEach(([c, r, k]) => { const p = P(c, r, 0.6); ellipse(g, p[0], p[1], 3.6, 1.6, mt(k)); ellipse(g, p[0], p[1], 1.7, 0.7, wat); });
      put(g, 'palm', 0.5, 1.28, 0.5, 1, 0.7);
      if (sn) { const q = P(0.5, 1.28, 0.7); ellipse(g, q[0] + 1, q[1] - 17, 5, 1.8, 'rgba(255,255,255,.92)'); }
      // the bamboo bar at the right corner, with a palm-thatch roof
      boxC(g, 1.55, 0.22, 0.34, 0.3, 0, 11, '#e2c47a');
      for (let k = 0; k < 6; k++) poly(g, onL(1.55, 0.22, 0.34, 0.3, 0, 11, 0.06 + k * 0.16, 0.12 + k * 0.16, 0, 1), '#b99444');
      poly(g, onR(1.55, 0.22, 0.34, 0.3, 0, 11, 0.2, 0.8, 0.3, 0.75), '#7a5a3a'); poly(g, onL(1.55, 0.22, 0.34, 0.3, 0, 11, 0.2, 0.8, 0.3, 0.75), '#8fd0e0');
      roof(g, 1.49, 0.16, 0.46, 0.42, 11, 9, '#b98f3c', 'c');
      // the slide tower: a tall bamboo-and-teal tower with a platform and a roof
      boxC(g, 0.9, 0.24, 0.2, 0.2, 0, 50, '#f6f1e2');
      for (let k = 0; k < 4; k++) { poly(g, onL(0.9, 0.24, 0.2, 0.2, 0, 50, 0, 1, 0.1 + k * 0.24, 0.2 + k * 0.24), K); poly(g, onR(0.9, 0.24, 0.2, 0.2, 0, 50, 0, 1, 0.1 + k * 0.24, 0.2 + k * 0.24), shade(K, -0.17)); }
      boxC(g, 0.8, 0.14, 0.4, 0.4, 50, 4, '#d4a45c');
      [[0.82, 0.16], [1.16, 0.16], [1.16, 0.5], [0.82, 0.5]].forEach(([c, r]) => line(g, [P(c, r, 54), P(c, r, 62)], '#b98f44', 1));
      pyramid(g, 0.78, 0.12, 0.44, 0.44, 62, 11, K);
      flagPole(g, 1.0, 0.34, 73, 8, pink);
      // two tube slides that wind down into the lazy river and the lagoon
      const sA = [P(0.92, 0.56, 51), P(0.66, 0.66, 45), P(0.42, 0.82, 34), P(0.3, 1.04, 22), P(0.4, 1.2, 10), P(0.55, 1.3, 2)];
      const sB = [P(1.2, 0.38, 51), P(1.42, 0.5, 44), P(1.64, 0.74, 32), P(1.7, 1.0, 20), P(1.5, 1.18, 9), P(1.32, 1.28, 2)];
      [[[0.66, 0.66, 45], [0.42, 0.82, 34], [0.3, 1.04, 22]], [[1.64, 0.74, 32], [1.7, 1.0, 20]]].forEach((sup) => sup.forEach(([c, r, z]) => line(g, [P(c, r, 0.5), P(c, r, z - 1)], '#c9b98a', 0.9)));
      ribbon(g, sA, pink, 3.4); ribbon(g, sB, sun, 3.4);
      if (sn) [sA, sB].forEach((sl) => sl.forEach((p, i) => { if (i % 2 === 0) ellipse(g, p[0], p[1] - 2, 3, 1.1, 'rgba(255,255,255,.95)'); }));
      // palms, parasols and loungers on the sand
      [[0.2, 0.2, 0], [1.9, 0.62, 2], [0.06, 1.7, 1], [1.84, 1.84, 0]].forEach(([c, r, v]) => { put(g, 'palm', c, r, 0.62, v + 1); if (sn) { const q = P(c, r); ellipse(g, q[0] + 1, q[1] - 21, 7, 2.2, 'rgba(255,255,255,.92)'); } });
      parasol(g, 0.8, 1.84, mt('#ff5a8a')); parasol(g, 1.92, 1.42, mt('#ffc83d'));
      box(g, 1.0, 1.84, 0.2, 0.08, 0.4, 2, '#ffffff', '#f4f6f8', '#d9dfe6'); box(g, 1.94, 1.1, 0.08, 0.2, 0.4, 2, '#ffffff', '#f4f6f8', '#d9dfe6');
      if (sn) { line(g, [P(0.55, 1.9, 6), P(1.3, 1.92, 6)], '#e5483f', 1.6); g.save(); g.setLineDash([2.4, 2.4]); line(g, [P(0.55, 1.9, 6), P(1.3, 1.92, 6)], '#ffffff', 1.6); g.restore(); line(g, [P(0.55, 1.9, 0), P(0.55, 1.9, 8)], '#8a8f9a', 1); line(g, [P(1.3, 1.92, 0), P(1.3, 1.92, 8)], '#8a8f9a', 1); }
    } else if (s === 'racetrack') {   // a motor-racing circuit: an asphalt oval with kerbs, a start line, a grandstand, pit garages and cars
      const sn = A.flags.snow, K = mt(col), OC = 1.0, OR = 1.08;
      pad(g, 0, 0, 2, 2, '#bfe293', 'rgba(0,0,0,.06)');
      const kerb = (a, b) => {   // red and white kerb stones along a track edge
        const p = closed(ovalPts(OC, OR, a, b, 0.5, 3, 56));
        g.save(); g.lineJoin = 'round'; line(g, p, K, 2.4); g.lineCap = 'butt'; g.setLineDash([3, 3]); line(g, p, '#ffffff', 2.4); g.restore();
      };
      poly(g, ovalPts(OC, OR, 0.97, 0.64, 0.2, 3, 56), '#f1f3f5');
      poly(g, ovalPts(OC, OR, 0.95, 0.62, 0.3, 3, 56), '#4d535c');
      poly(g, ovalPts(OC, OR, 0.66, 0.34, 0.4, 3, 56), sn ? '#f2f6f9' : '#8fd06a');
      g.save(); g.setLineDash([2, 3]); line(g, closed(ovalPts(OC, OR, 0.805, 0.48, 0.5, 3, 56)), 'rgba(255,255,255,.4)', 0.7); g.restore();
      kerb(0.95, 0.62); kerb(0.66, 0.34);
      // the infield: a timing building and a few trees
      boxC(g, 0.62, 0.9, 0.26, 0.16, 0.4, 9, '#f4f6f8'); poly(g, onL(0.62, 0.9, 0.26, 0.16, 0.4, 9, 0.1, 0.9, 0.35, 0.8), '#6c8fb0'); roof(g, 0.6, 0.88, 0.3, 0.2, 9.4, 3, K, 'c');
      [[1.15, 1.05, 3], [1.35, 0.98, 5], [1.5, 1.14, 4]].forEach(([c, r, v]) => put(g, 'bush', c, r, 0.6, v));
      // the chequered start and finish line
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) poly(g, diamond(1.3 + j * 0.05, 1.42 + i * 0.047, 0.05, 0.047, 0.5), (i + j) % 2 ? '#1f252d' : '#ffffff');
      // the grandstand at the back: stepped seats full of fans, under a roof
      const seat = [K, '#ffffff', K, shade(K, -0.2)];
      for (let t = 3; t >= 0; t--) {
        box(g, 0.3, 0.32 - t * 0.085, 1.4, 0.1, 0, 4 + t * 4, shade(seat[t], 0.1), seat[t], shade(seat[t], -0.2));
        for (let k = 0; k < 20; k++) { const p = P(0.34 + k * 0.07, 0.34 - t * 0.085, 4 + t * 4); circle(g, p[0], p[1] - 1.2, 1.1, pick(['#f7c53a', '#3f86e0', '#ffffff', '#e5483f', '#2a9f78', '#f3c9a0'], k * 3 + t * 5)); }
      }
      [0.36, 1.0, 1.64].forEach((c) => line(g, [P(c, 0.44, 4), P(c, 0.44, 19)], '#c3c9d1', 1));
      poly(g, [P(0.26, 0.46, 19), P(1.74, 0.46, 19), P(1.74, 0.46, 16.5), P(0.26, 0.46, 16.5)], '#d3d9e0');
      poly(g, [P(0.26, 0.46, 19), P(1.74, 0.46, 19), P(1.74, 0.0, 24), P(0.26, 0.0, 24)], sn ? '#f7fafd' : '#f4f6f8');
      poly(g, [P(0.26, 0.46, 19), P(1.74, 0.46, 19), P(1.74, 0.4, 19.6), P(0.26, 0.4, 19.6)], K);
      // the pit garages along the near side: a row of bays with coloured doors
      boxC(g, 0.35, 1.76, 1.3, 0.16, 0, 7, '#eef0f3');
      for (let k = 0; k < 6; k++) poly(g, onL(0.35, 1.76, 1.3, 0.16, 0, 7, 0.05 + k * 0.16, 0.17 + k * 0.16, 0, 0.72), k % 2 ? '#3a4250' : shade(K, -0.1));
      poly(g, diamond(0.35, 1.76, 1.3, 0.16, 7), sn ? '#f7fafd' : '#dfe4ea'); line(g, [P(0.35, 1.92, 7), P(1.65, 1.92, 7), P(1.65, 1.76, 7)], K, 1.4);
      // three racing cars, two close together on the near straight
      racer(g, 0.52, 1.46, 'c', mt('#e53935')); racer(g, 0.8, 1.55, 'c', mt('#3f86e0')); racer(g, 1.35, 0.52, 'c', mt('#f7c53a'));
      // the start gantry and two floodlight poles
      [1.4, 1.68].forEach((r) => box(g, 1.28, r, 0.05, 0.05, 0, 16, '#f4f6f8', '#e6e9ed', '#cdd3da'));
      box(g, 1.28, 1.4, 0.05, 0.33, 16, 3, K, shade(K, -0.1), shade(K, -0.25));
      [[0.1, 1.3], [1.9, 0.75]].forEach(([c, r]) => { const p = P(c, r); line(g, [p, [p[0], p[1] - 28]], '#9aa1ab', 1.2); poly(g, [[p[0] - 5, p[1] - 33], [p[0] + 5, p[1] - 33], [p[0] + 5, p[1] - 28], [p[0] - 5, p[1] - 28]], '#3a4250'); for (let k = 0; k < 4; k++) circle(g, p[0] - 3.6 + k * 2.4, p[1] - 30.5, 0.9, '#fff6c8'); });
    } else if (s === 'port') {
      pad(g, 0, 0, 2, 2, '#d4cfc6');
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) containerBox(g, 0.2 + i * 0.5, 0.3 + j * 0.5, 0, (i + j) % 2 ? 2 : 1, i * 3 + j);
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
      const p = P(0.15, 1.65, 0), q = P(1.55, 1.65, 0);
      g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo((p[0] + q[0]) / 2, p[1] - 60, q[0], q[1]); g.closePath(); g.fillStyle = '#dfe5ea'; g.fill();
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
  const CONT = [['#e2803e', '#d06f30', '#b85f26'], ['#5aa6dd', '#4895cc', '#3d82b5'], ['#e05a5a', '#cc4848', '#b33d3d'], ['#42a35a', '#38904e', '#2f7a42'], ['#f2c14e', '#e0b03c', '#c89c30'], ['#8a6fd0', '#765cbc', '#6550a8']];
  function containerBox(g, c, r, z, n, v) { for (let i = 0; i < n; i++) { const k = pick(CONT, v + i); box(g, c, r, 0.4, 0.2, z + i * 7, 7, k[0], k[1], k[2]); } }
  A.containerBox = containerBox;

  /* the Gateway's mega businesses (3 x 3 lots) */
  function megaBuilding(g, s, col, fl, rival) {
    const sn = A.flags.snow;
    if (s === 'intairport') {
      pad(g, 0, 0, 3, 3, '#cfccc5');
      for (let i = 0; i < 2; i++) line(g, [P(0.2, 2.25 + i * 0.5, 0.4), P(2.8, 2.25 + i * 0.5, 0.4)], '#f2c14e', 1.2);
      // the terminal: glass front and a long wave of a roof
      shadowBox(g, 0.2, 0.3, 2.6, 1.3, 40);
      glassBox(g, 0.2, 0.3, 2.6, 1.3, 0, 20, '#bfe0f0', 3);
      const a = P(0.1, 0.95, 20), b = P(2.9, 0.95, 20);
      g.beginPath(); g.moveTo(...P(0.1, 0.2, 20)); g.quadraticCurveTo(...P(1.5, 0.2, 40), ...P(2.9, 0.2, 20)); g.lineTo(...P(2.9, 1.7, 20)); g.quadraticCurveTo(...P(1.5, 1.7, 40), ...P(0.1, 1.7, 20)); g.closePath(); g.fillStyle = sn ? '#f4f8fb' : '#f5f7fa'; g.fill();
      g.beginPath(); g.moveTo(...P(0.1, 1.7, 20)); g.quadraticCurveTo(...P(1.5, 1.7, 40), ...P(2.9, 1.7, 20)); g.lineTo(...P(2.9, 1.7, 17)); g.quadraticCurveTo(...P(1.5, 1.7, 37), ...P(0.1, 1.7, 17)); g.closePath(); g.fillStyle = rival ? '#8a8f9a' : col; g.fill();
      line(g, [a, b], 'rgba(0,0,0,.05)', 1);
      // jet bridges out to two planes
      [0.7, 2.0].forEach((c0, i) => { box(g, c0, 1.6, 0.12, 0.5, 8, 4, '#e6eaee', '#d9dfe6', '#c3cad3'); const q = P(c0 + 0.2, 2.55, 2); drawPlane(g, q[0], q[1], 0.62, i ? '#e05a5a' : (rival ? '#8a8f9a' : col)); });
      // the control tower
      cyl(g, 2.75, 2.75, 0.07, 0, 62, '#eef1f4');
      const t = P(2.75, 2.75, 62); g.fillStyle = '#7fbfe0'; g.beginPath(); g.ellipse(t[0], t[1] - 4, 9, 4.5, 0, 0, 7); g.fill(); g.fillRect(t[0] - 9, t[1] - 10, 18, 6); ellipse(g, t[0], t[1] - 10, 9, 4.5, '#d9dfe6');
      return;
    }
    if (s === 'cruiseport') {
      pad(g, 0, 0, 3, 3, '#d8d4cc');
      poly(g, diamond(0.05, 1.9, 2.9, 1.05, 0.2), '#6db9e0'); poly(g, diamond(0.1, 1.95, 2.8, 0.95, 0.3), '#86cbe7');   // the basin
      // the terminal with sail-like roofs
      shadowBox(g, 0.25, 0.2, 2.4, 1.4, 30);
      boxC(g, 0.25, 0.2, 2.4, 1.4, 0, 14, '#f4f6f8');
      windows(g, 0.25, 0.2, 2.4, 1.4, 0, 14, 1, 10, 5, '#a9d8ee', '#93c2da', 0.7, 0.6);
      for (let i = 0; i < 4; i++) { const c0 = 0.35 + i * 0.58, p0 = P(c0, 1.6, 14), p1 = P(c0 + 0.5, 1.6, 14), t = P(c0 + 0.25, 1.0, 40); g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(t[0] - 8, t[1] + 6, t[0], t[1]); g.quadraticCurveTo(t[0] + 6, t[1] + 10, p1[0], p1[1]); g.closePath(); g.fillStyle = i % 2 ? '#ffffff' : '#eef3f7'; g.fill(); }
      // a cruise ship in the basin
      const h0 = 2.2, len = 2.6;
      box(g, 0.2, h0, len, 0.5, 0, 9, '#fbfbfb', '#f3f5f7', '#d9dfe6');
      line(g, [P(0.2, h0 + 0.5, 3), P(0.2 + len, h0 + 0.5, 3)], rival ? '#8a8f9a' : col, 2.2);
      for (let dk = 0; dk < 3; dk++) { box(g, 0.45 + dk * 0.1, h0 + 0.08, len - 0.6 - dk * 0.25, 0.34, 9 + dk * 6, 6, '#ffffff', '#f3f5f7', '#dde2e8'); windows(g, 0.45 + dk * 0.1, h0 + 0.08, len - 0.6 - dk * 0.25, 0.34, 9 + dk * 6, 6, 1, 12, 2, '#5e8fb8', '#4f7fa8', 0.6, 0.5); }
      box(g, 1.9, h0 + 0.16, 0.22, 0.18, 27, 12, '#e05a5a', '#cc4848', '#b33d3d');
      return;
    }
    if (s === 'shipyard') {
      pad(g, 0, 0, 3, 3, '#cfccc5');
      poly(g, diamond(0.2, 1.2, 2.6, 1.3, 0.2), '#9aa1a9'); poly(g, diamond(0.3, 1.3, 2.4, 1.1, -6), '#7d848c');   // the dry dock
      // a ship being built: hull, scaffolds
      box(g, 0.5, 1.5, 2, 0.65, -4, 12, '#9da6b0', '#c0503e', '#a0402f'); box(g, 0.5, 1.5, 2, 0.65, 8, 6, '#c9d0d8', '#b9c2cc', '#a6afba');
      for (let i = 0; i < 6; i++) line(g, [P(0.6 + i * 0.36, 2.2, 0), P(0.6 + i * 0.36, 2.2, 20)], '#e2a526', 0.9);
      // the big gantry crane across the dock
      [0.35, 2.65].forEach((c0) => { line(g, [P(c0, 1.15, 0), P(c0, 1.15, 92)], rival ? '#8a8f9a' : col, 3); line(g, [P(c0, 2.55, 0), P(c0, 2.55, 92)], shade(rival ? '#8a8f9a' : col, -0.2), 3); });
      box(g, 0.3, 1.1, 2.4, 0.12, 88, 8, '#f2c14e', rival ? '#8a8f9a' : col, shade(col, -0.2)); box(g, 0.3, 2.5, 2.4, 0.12, 88, 8, '#f2c14e', shade(rival ? '#8a8f9a' : col, -0.1), shade(col, -0.3));
      box(g, 1.3, 1.15, 0.3, 1.4, 80, 8, '#f6f8fa', '#e6eaee', '#cfd6dd');
      // halls at the back
      shadowBox(g, 0.2, 0.15, 2.6, 0.8, 26); boxC(g, 0.2, 0.15, 2.6, 0.8, 0, 24, '#dfe4e8'); roof(g, 0.18, 0.13, 2.64, 0.84, 24, 10, '#8fa0b6', 'c');
      return;
    }
    if (s === 'bullettrain') {
      pad(g, 0, 0, 3, 3, '#dcd9d2');
      // the station: a glass hall with an arched roof
      shadowBox(g, 0.3, 0.2, 2.4, 1.2, 30);
      glassBox(g, 0.3, 0.2, 2.4, 1.2, 0, 18, '#c3e2f0', 3);
      for (let i = 0; i < 6; i++) { const a = P(0.3 + i * 0.48, 0.2, 18), b = P(0.3 + i * 0.48, 1.4, 18), m = P(0.3 + i * 0.48, 0.8, 34); g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(m[0], m[1], b[0], b[1]); g.strokeStyle = sn ? '#ffffff' : '#9aa6b2'; g.lineWidth = 1.4; g.stroke(); }
      const ra = P(0.3, 0.2, 18), rb = P(2.7, 0.2, 18), rc = P(2.7, 1.4, 18), rd = P(0.3, 1.4, 18), mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - 16];
      g.beginPath(); g.moveTo(...ra); g.lineTo(...rb); g.quadraticCurveTo(...mid(rb, rc), ...rc); g.lineTo(...rd); g.quadraticCurveTo(...mid(rd, ra), ...ra); g.closePath(); g.fillStyle = 'rgba(220,236,246,.55)'; g.fill();
      // the viaduct and a white train with a long nose
      for (let i = 0; i < 5; i++) box(g, 0.25 + i * 0.62, 2.05, 0.1, 0.1, 0, 14, '#d0ccc4', '#c2bdb4', '#aca79e');
      box(g, 0.05, 1.85, 2.9, 0.5, 14, 3, '#cfcac1', '#bdb8af', '#a8a39a');
      box(g, 0.25, 1.95, 2.1, 0.3, 17, 8, '#fbfcfd', '#f3f5f7', '#d9dfe6');
      line(g, [P(0.25, 2.25, 20), P(2.35, 2.25, 20)], rival ? '#8a8f9a' : col, 1.6);
      windows(g, 0.25, 1.95, 2.1, 0.3, 17, 8, 1, 14, 1, '#4f6f8f', '#3f5f7f', 0.6, 0.45);
      const n0 = P(2.35, 1.95, 17), n1 = P(2.35, 2.25, 17), n2 = P(2.35, 2.25, 25), nose = P(2.8, 2.1, 18);
      poly(g, [n1, nose, n2], '#eef1f4'); poly(g, [n0, nose, n2, P(2.35, 1.95, 25)], '#dfe4ea');
      return;
    }
    if (s === 'filmstudio') {
      pad(g, 0, 0, 3, 3, '#d9d6cf');
      [[0.2, 0.2], [1.25, 0.2], [0.2, 1.3]].forEach(([c, r], i) => {
        shadowBox(g, c, r, 0.95, 0.95, 40); boxC(g, c, r, 0.95, 0.95, 0, 30, i === 1 ? '#efe9dc' : '#e9e3d6');
        const a = P(c, r + 0.95, 30), b = P(c + 0.95, r + 0.95, 30), t = P(c + 0.47, r + 0.95, 44);
        g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(t[0], t[1] - 10, b[0], b[1]); g.closePath(); g.fillStyle = sn ? '#f4f8fb' : '#c9b9a0'; g.fill();
        poly(g, diamond(c, r, 0.95, 0.95, 30), sn ? '#eef3f7' : '#bfae94');
        const p = P(c + 0.47, r + 0.95, 14); circle(g, p[0], p[1], 6, rival ? '#8a8f9a' : col); g.fillStyle = '#ffffff'; g.font = '800 8px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), p[0], p[1] + 0.5);
      });
      // the water tower and the big sign
      const wt = P(2.45, 1.6, 0); [[-6, 0], [6, 0], [0, -3], [0, 3]].forEach(([dx, dy]) => line(g, [[wt[0] + dx, wt[1] + dy], [wt[0] + dx * 0.6, wt[1] - 40]], '#8a8f9a', 1.2));
      cyl(g, 2.45, 1.6, 0.18, 40, 18, '#dfe4ea'); pyramid(g, 2.27, 1.42, 0.36, 0.36, 58, 8, '#9aa3ad');
      const sg = P(1.6, 2.55, 0); line(g, [[sg[0] - 30, sg[1]], [sg[0] - 30, sg[1] - 30]], '#6b6b6b', 1.2); line(g, [[sg[0] + 30, sg[1]], [sg[0] + 30, sg[1] - 30]], '#6b6b6b', 1.2);
      A.roundRect(g, sg[0] - 36, sg[1] - 44, 72, 16, 4, rival ? '#5e6b7d' : '#2b2350'); g.fillStyle = rival ? '#dfe4ea' : col; g.font = '800 10px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STUDIOS', sg[0], sg[1] - 35.6);
      return;
    }
    if (s === 'megaresort') {
      pad(g, 0, 0, 3, 3, sn ? '#eef3f7' : '#cfe6b0');
      poly(g, diamond(1.6, 1.6, 1.2, 1.2, 0.4), '#4fb6dc'); poly(g, diamond(1.7, 1.7, 1, 1, 0.5), '#86d3ee');   // the pools
      ellipse(g, ...P(2.2, 2.2, 0.6), 10, 5, '#a6e2f4');
      for (let i = 0; i < 5; i++) { const q = P(1.6 + (i % 3) * 0.55, 1.45 + Math.floor(i / 3) * 1.35); circle(g, q[0], q[1] - 7, 5, pick(['#f25a7a', '#f2c14e', '#5aa6dd'], i)); line(g, [q, [q[0], q[1] - 7]], '#8a8f9a', 0.7); }
      // a curved tower in two wings on a podium
      box(g, 0.2, 0.2, 1.3, 2.6, 0, 12, '#efe6da', '#e3d8c8', '#cfc3b1');
      shadowBox(g, 0.3, 0.3, 1.1, 1.1, 150);
      glassBox(g, 0.3, 0.25, 0.75, 1.2, 12, 150, rival ? '#b9c3cc' : '#f3d3c0', 18);
      glassBox(g, 0.35, 1.5, 0.8, 1.15, 12, 122, rival ? '#c7cfd6' : '#f6dccc', 15);
      const top = P(0.68, 0.85, 162); line(g, [top, [top[0], top[1] - 18]], '#9aa3ad', 1.6);
      A.roundRect(g, top[0] - 16, top[1] + 4, 32, 9, 3, rival ? '#8a8f9a' : col);
      for (let i = 0; i < 3; i++) { const q = P(2.7, 0.4 + i * 0.5); g.save(); g.translate(q[0], q[1]); g.scale(0.7, 0.7); A.drawPoint(g, 'palm', i, 1, { season: 'summer' }); g.restore(); }
      return;
    }
    if (s === 'arena') {
      pad(g, 0, 0, 3, 3, '#d6d3cc');
      const cx = P(1.5, 1.5, 0); g.save(); g.translate(cx[0], cx[1]);
      ellipse(g, 0, 4, 88, 42, 'rgba(0,0,0,.12)');
      ellipse(g, 0, 0, 84, 42, shade(rival ? '#8a8f9a' : col, -0.3));
      g.fillStyle = shade(rival ? '#8a8f9a' : col, -0.15); g.fillRect(-84, -26, 168, 26); ellipse(g, 0, -26, 84, 42, rival ? '#9aa1ab' : col);
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI; line(g, [[Math.cos(a) * 84, -26 + Math.sin(a) * 42], [Math.cos(a) * 84, Math.sin(a) * 42]], 'rgba(255,255,255,.35)', 1); }
      dome(g, 0, -26, 76, 34, sn ? '#f4f8fb' : '#e8ecf2');
      for (let i = 0; i < 7; i++) { const a = (i + 0.5) * Math.PI / 7; line(g, [[0, -60], [-Math.cos(a) * 76, -26 + Math.sin(a) * 30]], 'rgba(120,130,150,.35)', 1); }
      A.roundRect(g, -26, -22, 52, 18, 3, '#2b2350'); g.fillStyle = '#7cf2ff'; g.font = '800 9px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LIVE!', 0, -12.6);
      g.restore();
      return;
    }
    if (s === 'aquadome') {   // an indoor water park: a huge glass dome with palms, a spiral slide and a pool inside, a lobby and a car park
      const K = rival ? '#8a8f9a' : col, mt = (c) => (rival ? mix(c, '#9aa1ab', 0.7) : c), DC = 1.6, DR = 1.08, rad = 1.45;
      pad(g, 0, 0, 3, 3, sn ? '#eef3f7' : '#dcd9d2');
      // the car park at the right front edge: stalls, cars, a lamp
      poly(g, diamond(1.85, 1.9, 1.05, 1.0, 0.2), sn ? '#f6f8fa' : '#c7c4bc');
      for (let k = 0; k <= 4; k++) line(g, [P(1.95 + k * 0.2, 1.98, 0.3), P(1.95 + k * 0.2, 2.3, 0.3)], 'rgba(255,255,255,.8)', 0.8);
      for (let k = 0; k <= 4; k++) line(g, [P(1.95 + k * 0.2, 2.5, 0.3), P(1.95 + k * 0.2, 2.82, 0.3)], 'rgba(255,255,255,.8)', 0.8);
      for (let k = 0; k < 4; k++) { [[2.03, 2.0], [2.03, 2.52]].forEach(([c0, r0], row) => { if ((k + row) % 3 === 2) return; const cc = pick(['#e05a5a', '#5aa6dd', '#f2c14e', '#f5f5f5', '#6cc08f', '#3d4a5c'], k * 2 + row * 5); box(g, c0 + k * 0.2, r0, 0.13, 0.27, 0.3, 3.6, shade(cc, 0.2), cc, shade(cc, -0.2)); }); }
      // the dome: a low drum, the water park inside, then the glass over it
      const b = P(DC, DR, 7), rx = rad * 1.414 * HW, ry = rx / 2;
      shadowBox(g, 0.5, 0.4, 2.2, 1.6, 40);
      cyl(g, DC, DR, rad, 0, 7, '#eef2f5', '#e6ecf1');
      ellipse(g, b[0], b[1], rx * 0.96, ry * 0.96, sn ? '#f4f7fa' : '#f1dfae');
      ellipse(g, b[0], b[1] + 0.5, rx * 0.86, ry * 0.86, '#35b8e8'); ellipse(g, b[0] - 2, b[1], rx * 0.7, ry * 0.7, '#6fd6f0');
      [[-0.4, 0.2, 0.4], [-0.1, 0.55, 0.3], [0.35, 0.3, 0.35]].forEach(([dx, dy, k]) => { const p = [b[0] + dx * rx, b[1] + dy * ry]; g.beginPath(); g.ellipse(p[0], p[1], rx * k * 0.7, ry * k * 0.5, 0, Math.PI * 1.1, Math.PI * 1.9); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1; g.stroke(); });
      put(g, 'palm', DC - 0.9, DR - 0.3, 1.2, 2, 7); put(g, 'palm', DC + 0.95, DR - 0.25, 1.0, 1, 7);
      // a spiral slide round a white tower; the far side of the spiral goes behind it
      const spi = []; for (let i = 0; i <= 64; i++) { const t = (i / 64) * Math.PI * 4 + 0.6; spi.push({ p: P(DC + Math.cos(t) * 0.38, DR + Math.sin(t) * 0.38, 8 + 42 - 38 * (i / 64)), back: Math.sin(t) < 0 }); }
      const runs = []; spi.forEach((q, i) => { const last = runs[runs.length - 1]; if (last && last.back === q.back) last.pts.push(q.p); else runs.push({ back: q.back, pts: [q.p], i }); });
      const drawRuns = (back) => runs.forEach((r) => { if (r.back === back && r.pts.length > 1) ribbon(g, r.pts, r.i % 2 ? mt('#ff5a8a') : mt('#ffc83d'), 3); });
      drawRuns(true);
      cyl(g, DC, DR, 0.08, 8, 44, '#f4f6f8'); const tp = P(DC, DR, 52); ellipse(g, tp[0], tp[1], 8, 4, K); ellipse(g, tp[0], tp[1] - 1.4, 5.4, 2.7, shade(K, 0.3));
      drawRuns(false);
      put(g, 'palm', DC - 0.2, DR + 0.9, 1.2, 0, 7);
      parasol(g, DC + 0.85, DR + 0.6, mt('#ff5a8a'), 7); parasol(g, DC - 1.0, DR + 0.55, mt('#f7c53a'), 7);
      glassDome(g, b[0], b[1], rx, 74, '#9fdcf5');
      const fp = P(DC, DR, 81); line(g, [fp, [fp[0], fp[1] - 10]], '#e9eef2', 1.3); poly(g, [[fp[0], fp[1] - 10], [fp[0] + 7, fp[1] - 8], [fp[0], fp[1] - 5.6]], K);
      // the lobby in front: a glass hall with a canopy and the name on a sign
      shadowBox(g, 0.28, 2.05, 1.1, 0.55, 20);
      glassBox(g, 0.28, 2.05, 1.1, 0.55, 0, 14, '#bfe0f0', 2);
      poly(g, onL(0.28, 2.05, 1.1, 0.55, 0, 14, 0.4, 0.6, 0, 0.7), '#3d5470');
      box(g, 0.2, 1.97, 1.26, 0.7, 14, 2.5, '#ffffff', '#f4f6f8', '#d3d9e0');
      const sg = P(0.83, 2.72, 22); A.roundRect(g, sg[0] - 22, sg[1] - 5, 44, 10, 3, K);
      g.fillStyle = '#ffffff'; g.font = '800 6px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('AQUADOME', sg[0], sg[1] + 0.3);
      put(g, 'palm', 0.1, 2.45, 0.62, 1); put(g, 'palm', 1.56, 2.7, 0.62, 2);
      const lp = P(1.78, 2.15); line(g, [lp, [lp[0], lp[1] - 24]], '#9aa1ab', 1.1); circle(g, lp[0], lp[1] - 25, 2, '#fff6c8');
      return;
    }
    if (s === 'bigstadium') {   // a big football stadium: a tall oval bowl with tiered stands full of fans, a roof ring, a striped pitch, four floodlight masts, a giant screen
      const K = rival ? '#8a8f9a' : col, CC = 1.5, CR = 1.5, A0 = 1.55, B0 = 1.4, NN = 2.6, WH = 28;
      pad(g, 0, 0, 3, 3, sn ? '#eef3f7' : '#d6d3cc');
      const mast = (c, r) => {   // a floodlight mast: a tall pole with a bank of lamps
        const p = P(c, r, 0), h = 56; line(g, [[p[0] + 1.4, p[1]], [p[0] + 1.4, p[1] - h]], 'rgba(40,60,40,.14)', 2.4); line(g, [p, [p[0], p[1] - h]], '#e9edf1', 2.2);
        poly(g, [[p[0] - 10, p[1] - h - 9], [p[0] + 10, p[1] - h - 9], [p[0] + 10, p[1] - h], [p[0] - 10, p[1] - h]], '#38424f');
        for (let i = 0; i < 2; i++) for (let k = 0; k < 4; k++) circle(g, p[0] - 7.5 + k * 5, p[1] - h - 6.2 + i * 4.2, 1.5, '#fff6c8');
      };
      mast(0.02, 1.6); mast(1.6, 0.02); mast(1.3, 2.9); mast(2.9, 1.3);
      shadowBox(g, 0.3, 0.3, 2.4, 2.4, 40);
      // the bowl: an outer wall (lit on the left), a rim, and the seats stepping down to the pitch
      const outer = ovalPts(CC, CR, A0, B0, 0, NN, 72), arc = lowerArc(outer), xl = arc[0][0], xr = arc[arc.length - 1][0];
      const band = (z0, z1, fill) => poly(g, arc.map((p) => [p[0], p[1] - z0]).concat(arc.slice().reverse().map((p) => [p[0], p[1] - z1])), fill);
      const wall = '#e7ecf1', gw = g.createLinearGradient(xl, 0, xr, 0); gw.addColorStop(0, shade(wall, 0.2)); gw.addColorStop(0.5, wall); gw.addColorStop(1, shade(wall, -0.3));
      band(0, WH, gw);
      const gk = g.createLinearGradient(xl, 0, xr, 0); gk.addColorStop(0, shade(K, 0.1)); gk.addColorStop(0.5, K); gk.addColorStop(1, shade(K, -0.3));
      band(WH * 0.12, WH * 0.34, gk);
      arc.forEach((p, i) => { if (i % 3 === 0) line(g, [[p[0], p[1] - WH * 0.34], [p[0], p[1] - WH]], 'rgba(60,80,110,.16)', 0.8); });
      [0.2, 0.5, 0.8].forEach((f) => { const p = arc[Math.round((arc.length - 1) * f)]; poly(g, [[p[0] - 2.6, p[1] - 0.5], [p[0] + 2.6, p[1] - 0.5], [p[0] + 2.6, p[1] - 6], [p[0] - 2.6, p[1] - 6]], '#3a4962'); });
      const rim = outer.map((p) => [p[0], p[1] - WH]);
      poly(g, rim, '#f3f5f8');
      g.save(); g.beginPath(); rim.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.clip();
      const tiers = [[0.95, WH - 4, shade(K, -0.12)], [0.87, WH - 9.5, shade(K, 0.3)], [0.79, WH - 14.5, shade(K, 0.02)], [0.71, WH - 18.5, '#e4e9ee'], [0.64, WH - 22, sn ? '#e4ecf1' : '#79b857']];
      tiers.forEach(([k, z, fill], i) => {
        poly(g, ovalPts(CC, CR, A0 * k, B0 * k, z, NN, 72), fill);
        if (i < 3) { const nk = tiers[i + 1], mk = (k + nk[0]) / 2, mz = (z + nk[1]) / 2; ovalPts(CC, CR, A0 * mk, B0 * mk, mz, NN, 60).forEach((p, j) => { if (j % 2 === 0) circle(g, p[0], p[1] + 0.8, 1, pick(['#ffffff', '#f7c53a', '#e5483f', '#dfe9f5', '#2a9f78', '#ffffff'], j * 5 + i * 3)); }); }
      });
      // the pitch: mown stripes, white lines, centre circle, penalty areas and goals
      const pz = WH - 22, pc = 0.78, pr = 0.5, pitchC = sn ? ['#eef4f8', '#e3ecf2'] : ['#5fb24a', '#6cc156'];
      for (let k = 0; k < 8; k++) poly(g, [P(CC - pc + k * pc / 4, CR - pr, pz), P(CC - pc + (k + 1) * pc / 4, CR - pr, pz), P(CC - pc + (k + 1) * pc / 4, CR + pr, pz), P(CC - pc + k * pc / 4, CR + pr, pz)], pitchC[k % 2]);
      const wl = sn ? '#b9c7d2' : 'rgba(255,255,255,.9)', pl = (pts) => line(g, pts.map(([c, r]) => P(c, r, pz + 0.1)), wl, 0.8);
      pl([[CC - pc, CR - pr], [CC + pc, CR - pr], [CC + pc, CR + pr], [CC - pc, CR + pr], [CC - pc, CR - pr]]); pl([[CC, CR - pr], [CC, CR + pr]]);
      pl([[CC - pc, CR - 0.26], [CC - pc + 0.2, CR - 0.26], [CC - pc + 0.2, CR + 0.26], [CC - pc, CR + 0.26]]); pl([[CC + pc, CR - 0.26], [CC + pc - 0.2, CR - 0.26], [CC + pc - 0.2, CR + 0.26], [CC + pc, CR + 0.26]]);
      pl(Array.from({ length: 25 }, (_, i) => [CC + Math.cos(i / 24 * Math.PI * 2) * 0.17, CR + Math.sin(i / 24 * Math.PI * 2) * 0.17]));
      [-1, 1].forEach((sd) => { const gp = [P(CC + sd * pc, CR - 0.08, pz), P(CC + sd * (pc + 0.04), CR - 0.08, pz + 3), P(CC + sd * (pc + 0.04), CR + 0.08, pz + 3), P(CC + sd * pc, CR + 0.08, pz)]; line(g, gp, '#ffffff', 0.7); });
      g.restore();
      // the roof ring over the stands, with a coloured inner edge
      const rz = WH + 6, ro = ovalPts(CC, CR, A0 * 1.04, B0 * 1.04, rz, NN, 72), ri = ovalPts(CC, CR, A0 * 0.86, B0 * 0.86, rz, NN, 72), arcR = lowerArc(ovalPts(CC, CR, A0 * 1.04, B0 * 1.04, 0, NN, 72));
      poly(g, arcR.map((p) => [p[0], p[1] - WH - 2]).concat(arcR.slice().reverse().map((p) => [p[0], p[1] - rz])), '#c3ccd6');
      g.beginPath(); ro.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); ri.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = sn ? '#fafcfe' : '#f6f8fa'; g.fill('evenodd');
      line(g, closed(ri), K, 1.6);
      for (let i = 0; i < ro.length; i += 6) line(g, [ro[i], [(ro[i][0] * 3 + ri[i][0]) / 4, (ro[i][1] * 3 + ri[i][1]) / 4]], 'rgba(120,135,155,.35)', 0.7);
      // the giant screen over the far end, and the name on the front wall
      const top = ro.reduce((a, p) => (p[1] < a[1] ? p : a), ro[0]), scx = top[0], scy = top[1] - 1;
      line(g, [[scx - 12, scy], [scx - 12, scy - 8]], '#8a8f9a', 1.4); line(g, [[scx + 12, scy], [scx + 12, scy - 8]], '#8a8f9a', 1.4);
      A.roundRect(g, scx - 18, scy - 21, 36, 14, 2, '#2b2f3c'); A.roundRect(g, scx - 16, scy - 19, 32, 10, 1.4, rival ? '#9aa1ab' : '#2f7fd6');
      if (!rival) { ellipse(g, scx - 8, scy - 14, 4.4, 3.2, '#ffffff'); g.fillStyle = '#f7c53a'; g.fillRect(scx + 0, scy - 17, 12, 1.8); g.fillStyle = '#e5483f'; g.fillRect(scx + 0, scy - 13.6, 9, 1.8); }
      const fr = arc.reduce((a, p) => (p[1] > a[1] ? p : a), arc[0]), px = fr[0], q = arc.reduce((a, p) => (Math.abs(p[0] - px) < Math.abs(a[0] - px) ? p : a), arc[0]), py = q[1] - WH * 0.5 + 6;
      A.roundRect(g, px - 28, py - 12, 56, 13, 3, '#ffffff'); A.roundRect(g, px - 26.5, py - 10.5, 53, 10, 2, K);
      g.fillStyle = '#ffffff'; g.font = '800 7.6px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FOOTBALL', px, py - 5.3);
      [[0.5, 2.9], [2.9, 0.6], [1.0, 3.0]].forEach(([c, r], i) => put(g, 'bush', c, r, 0.8, i + 2));
      return;
    }
    if (s === 'robotfactory') {
      pad(g, 0, 0, 3, 3, '#dcd9d2');
      shadowBox(g, 0.2, 0.3, 2.6, 2.2, 40);
      boxC(g, 0.2, 0.3, 2.6, 2.2, 0, 26, '#f4f6f8');
      for (let i = 0; i < 5; i++) poly(g, onL(0.2, 0.3, 2.6, 2.2, 0, 26, 0.05 + i * 0.19, 0.18 + i * 0.19, 0.25, 0.85), '#9fd0ea');
      poly(g, diamond(0.2, 0.3, 2.6, 2.2, 26), '#e3e8ec');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) poly(g, [P(0.4 + i * 0.6, 0.5 + j * 1, 27), P(0.9 + i * 0.6, 0.5 + j * 1, 27), P(0.9 + i * 0.6, 0.85 + j * 1, 31), P(0.4 + i * 0.6, 0.85 + j * 1, 31)], sn ? '#a9c0d6' : '#3d6fa8');
      // a giant robot arm on the roof
      const ac = rival ? '#8a8f9a' : col, b0 = P(1.9, 1.6, 26), j1 = [b0[0] - 6, b0[1] - 34], j2 = [b0[0] + 24, b0[1] - 52], hnd = [b0[0] + 30, b0[1] - 36];
      ellipse(g, b0[0], b0[1], 12, 6, '#5e6b7d');
      line(g, [b0, j1], ac, 7); line(g, [j1, j2], ac, 6); line(g, [j2, hnd], ac, 4);
      [b0, j1, j2].forEach((p) => circle(g, p[0], p[1], 4.4, '#3d4a5c'));
      line(g, [hnd, [hnd[0] - 4, hnd[1] + 7]], '#3d4a5c', 2); line(g, [hnd, [hnd[0] + 5, hnd[1] + 6]], '#3d4a5c', 2);
      return;
    }
    if (s === 'satellite') {
      pad(g, 0, 0, 3, 3, sn ? '#eef3f7' : '#c9dfb0');
      shadowBox(g, 0.2, 0.2, 1.2, 1, 30); glassBox(g, 0.2, 0.2, 1.2, 1, 0, 26, '#bcd3ea', 3);
      // dishes pointing at the sky, and a white radome
      const dish = (c, r, rad, tilt) => {
        const b = P(c, r, 0), t = [b[0], b[1] - rad * 1.4]; line(g, [b, t], '#9aa3ad', 2.4);
        g.save(); g.translate(t[0], t[1]); g.rotate(tilt);
        ellipse(g, 0, 0, rad, rad * 0.55, '#e9edf2'); ellipse(g, 0, -1, rad * 0.86, rad * 0.44, '#cfd6de'); line(g, [[0, -1], [0, -rad * 0.7]], '#8a8f9a', 1.2); circle(g, 0, -rad * 0.72, 1.8, '#5e6b7d');
        g.restore();
      };
      dish(1.9, 0.8, 26, -0.35); dish(2.4, 1.9, 20, -0.5); dish(1.1, 2.3, 18, -0.2);
      const rd = P(0.7, 2.0, 0); dome(g, rd[0], rd[1], 15, 26, sn ? '#ffffff' : '#f6f8fa');
      line(g, [P(2.6, 0.4, 0), P(2.6, 0.4, 92)], '#e05a5a', 1.4); circle(g, ...P(2.6, 0.4, 93), 2, '#f25a5a');
      line(g, [P(0.8, 0.7, 26), P(0.8, 0.7, 40)], rival ? '#8a8f9a' : col, 2);
      return;
    }
    if (s === 'cleanpower') {
      pad(g, 0, 0, 3, 3, sn ? '#eef3f7' : '#c9e3a6');
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const c0 = 0.15 + c * 0.42, r0 = 1.55 + r * 0.45; poly(g, [P(c0, r0, 2), P(c0 + 0.36, r0, 2), P(c0 + 0.36, r0 + 0.26, 7), P(c0, r0 + 0.26, 7)], sn ? '#a9c0d6' : '#3d6fa8'); }
      for (let i = 0; i < 3; i++) { const k = rival ? '#8a8f9a' : col; box(g, 1.95, 0.25 + i * 0.55, 0.8, 0.38, 0, 11, shade(k, 0.3), shade(k, 0.1), shade(k, -0.15)); line(g, [P(2.0, 0.63 + i * 0.55, 6), P(2.7, 0.63 + i * 0.55, 6)], '#ffffff', 1); }
      // three turbines (their blades turn on the map)
      [[0.4, 0.4], [1.2, 0.3], [0.5, 1.15]].forEach(([c, r]) => { const b = P(c, r, 0); line(g, [b, [b[0], b[1] - 120]], '#eef1f4', 3); line(g, [[b[0] + 1.2, b[1]], [b[0] + 0.6, b[1] - 120]], '#cfd6dd', 1.2); ellipse(g, b[0] + 2, b[1] - 120, 4, 2.6, '#e3e8ec'); });
      return;
    }
  }
  // where the turning parts of a business are (for the map's animation), relative to the lot's anchor
  A.bizMovers = function (id) {
    const s = (BIZ_STYLE[id] || [])[0];
    if (s === 'themepark') return [{ k: 'wheel', c: 1.35, r: 0.6, z: 40, R: 24 }];
    if (s === 'cleanpower') return [[0.4, 0.4], [1.2, 0.3], [0.5, 1.15]].map(([c, r]) => ({ k: 'blades', c: c, r: r, z: 120, R: 26 }));
    if (s === 'arena') return [{ k: 'beams', c: 1.5, r: 1.5, z: 60 }];
    return [];
  };

  // how tall a neighbour's building stands (its picture is only as tall as that: memory on a tablet is precious)
  A.npcTop = function (d, v) {
    if (d === 'market') return 72;
    if (d === 'high') return 80;
    if (d === 'downtown') return (5 + (v % 6)) * 9 + 30;
    if (d === 'skyline') return (14 + (v % 15)) * 8 + (v % 5 === 3 ? 78 : 52);
    return v % 5 === 2 ? (12 + (v % 6)) * 8 + 34 : 72;
  };
  Object.assign(A, { npcBuilding, siteBuilding, saleSign, bizBuilding, BIZ_STYLE, BIZ_TOP, WALLS, ROOFS });
})(typeof window !== 'undefined' ? window : globalThis);
