/* games/family/src/scene.js — FFScene: draws a frame of Family Fighters into the page's canvas. The stage is 960 × 540
   (the street runs along the bottom: its back edge at BACK, its front at FRONT); it is scaled to the screen, with more
   sky above and more pavement below on a tall screen (an iPad) and the top of the sky cut off on a wide one (a phone).
   Ten places, each with three scenery layers that scroll at their own speeds; the far and middle layers and the
   street itself are drawn once into hidden canvases and copied each frame. Characters are sorted by depth, then the
   sparks, puffs and words (FFScene.fx) go on top. */
const FFScene = (function () {
'use strict';
const A = FFArt, VIEW = 960, BACK = 345, FRONT = 505, DEPTH = 140, DK = (FRONT - BACK) / DEPTH;
const CHUNK = 640, STRIP = 1600, TAU = Math.PI * 2;
let cv = null, g = null, W = 0, H = 0, dpr = 1, scale = 1, ox = 0, oy = 0, q = 1, quality = 1;
let placeKey = '', P = null, far = null, mid = null;
const chunks = new Map();
const fxs = [];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const sy = (y) => FRONT - y * DK;                 // a depth on the street to the stage's y
const sc = (y) => 1 - (y / DEPTH) * 0.12;           // things further back are a little smaller

/* ================= the canvas and the stage ================= */
function init(canvas) { cv = canvas; g = cv.getContext('2d'); resize(); }
function setQuality(v) { quality = v; resize(); }
function resize() {
  if (!cv) return;
  const r = cv.getBoundingClientRect();
  W = Math.max(1, r.width); H = Math.max(1, r.height);
  dpr = Math.min(window.devicePixelRatio || 1, 2) * quality;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  scale = Math.min(W / VIEW, H / 540);
  if (W / H > VIEW / 540) scale = Math.min(W / VIEW, H / 420);   // a wide screen: cut up to 120 of sky
  ox = (W - VIEW * scale) / 2;
  const extra = H - 540 * scale;
  oy = extra >= 0 ? extra * 0.62 : extra;
  q = Math.min(2, scale * dpr);
  chunks.clear(); far = null; mid = null;
}
// where the stage is on the page (for the HUD and touch controls), in CSS pixels
function stage() { return { x: ox, y: oy, w: VIEW * scale, h: 540 * scale, scale: scale, top: Math.max(0, oy), bottom: Math.min(H, oy + 540 * scale) }; }
function toScreen(x, y, z, cam) { return { x: ox + (x - cam) * scale, y: oy + (sy(y) - (z || 0) * sc(y)) * scale }; }

/* ================= the ten places =================
   sky: two colours (top, horizon); far(x, w, r) and mid(...) draw silhouettes into a strip; back(x0, r) draws the
   scenery along the back of the street for one chunk; ground: the street's colours; front: something now and then
   along the front edge. */
function makeCanvas(w, h, res) { const k = document.createElement('canvas'); k.width = Math.max(1, Math.round(w * res)); k.height = Math.max(1, Math.round(h * res)); const x = k.getContext('2d'); x.scale(res, res); return [k, x]; }
const PLACES = {
  market: { sky: ['#8fd3ff', '#fff1d0'], sun: [800, 70, '#fff59d'], ground: ['#cfc4b4', '#bdb19f', '#9e9282'], far: farCity('#c9d8e6', 60, 140), mid: midTrees('#7cb342', '#c0703a'), back: backMarket, front: 'lamp' },
  oldquarter: { sky: ['#7ec8f2', '#eaf6ff'], sun: [130, 80, '#fff9c4'], ground: ['#77777e', '#6a6a71', '#55555c'], road: true, far: farCity('#b8cde0', 90, 190), mid: midTubes, back: backOldQuarter, front: 'wire' },
  ricefield: { sky: ['#5fc0ff', '#e3f6ff'], sun: [700, 60, '#fffde7'], clouds: true, ground: ['#c9a27a', '#b88f66', '#9c7650'], far: farHills('#7fa6c8', '#a7c4dc'), mid: midPalms, back: backPaddy, front: 'grass' },
  school: { sky: ['#90caf9', '#eef7ff'], sun: [120, 70, '#fffde7'], clouds: true, ground: ['#d7ccc8', '#c9bdb8', '#a1938e'], far: farCity('#c5d6e8', 50, 120), mid: midTrees('#43a047', '#e57373'), back: backSchool, front: 'fence' },
  beach: { sky: ['#3fb6f2', '#dff7fb'], sun: [820, 60, '#fffde7'], ground: ['#f3dca4', '#e8cc8c', '#d4b170'], far: farSea, mid: midPalms, back: backBeach, front: 'shell' },
  bay: { sky: ['#a9dcf5', '#fffbe6'], sun: [700, 90, '#fff8e1'], ground: ['#a87c52', '#966b44', '#7c5634'], deck: true, far: farKarst('#9fb7b0', '#c8dad4'), mid: farKarst('#6f9488', '#8fb2a6', true), back: backBoat, front: 'rope' },
  cave: { sky: ['#140c26', '#2b1a4a'], ground: ['#4a4458', '#3f3a4d', '#2f2b3b'], dark: true, far: farCave, mid: midStalactites, back: backCave, front: 'rock' },
  mountain: { sky: ['#b0c4d8', '#f4f7fa'], snow: true, ground: ['#f2f6fa', '#e2ebf3', '#c5d4e2'], far: farPeaks, mid: midTerraces, back: backSapa, front: 'pine' },
  rooftop: { sky: ['#0b1736', '#26407a'], stars: true, moon: [780, 80], ground: ['#5e6070', '#535565', '#41434f'], far: farNight, mid: midNeon, back: backRoof, front: 'antenna', night: true },
  lab: { sky: ['#0f1d24', '#22343d'], ground: ['#5b6f7a', '#4f616b', '#3c4b53'], tiles: true, far: farLab, mid: midTubesLab, back: backLab, front: 'pipe', dark: true }
};
function setPlace(key) {
  if (key === placeKey && far) return;
  placeKey = key; P = PLACES[key] || PLACES.market; far = null; mid = null; chunks.clear();
}
function strip(fn, seed) {
  const res = Math.min(q, 1.5), [k, x] = makeCanvas(STRIP, 350, res);
  A.use(x);
  fn(x, mulberry(seed));
  A.use(g);
  return k;
}
function chunk(i) {
  let k = chunks.get(i);
  if (k) return k;
  const [cnv, x] = makeCanvas(CHUNK, 540 - 120, q);
  x.translate(0, -120);
  A.use(x);
  const r = mulberry(i * 7919 + 13);
  // the street
  const G = P.ground;
  x.fillStyle = G[0]; x.fillRect(0, BACK, CHUNK, 540 - BACK);
  for (let row = 0; row < 7; row++) { if (row % 2) { x.fillStyle = G[1]; x.fillRect(0, BACK + 8 + row * 26, CHUNK, 13); } }
  if (P.road) { x.fillStyle = '#9a9aa0'; x.fillRect(0, BACK, CHUNK, 16); x.fillStyle = '#f5f5f5'; for (let d = 0; d < CHUNK; d += 80) x.fillRect(d + 10, 430, 44, 6); }
  if (P.deck) { x.strokeStyle = G[2]; x.lineWidth = 2; for (let yy = BACK + 12; yy < 540; yy += 22) { x.beginPath(); x.moveTo(0, yy); x.lineTo(CHUNK, yy); x.stroke(); } for (let d = 0; d < 12; d++) { const yy = BACK + 12 + Math.floor(r() * 8) * 22, xx = r() * CHUNK; x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx, yy + 22); x.stroke(); } }
  if (P.tiles) { x.strokeStyle = G[2]; x.lineWidth = 2; for (let yy = BACK + 10; yy < 540; yy += 36) { x.beginPath(); x.moveTo(0, yy); x.lineTo(CHUNK, yy); x.stroke(); } x.fillStyle = '#ffca28'; for (let d = 0; d < CHUNK; d += 40) { x.beginPath(); x.moveTo(d, BACK); x.lineTo(d + 20, BACK); x.lineTo(d + 10, BACK + 10); x.lineTo(d - 10, BACK + 10); x.closePath(); x.fill(); } }
  // little things on the ground
  for (let n = 0; n < 9; n++) {
    const gx = r() * CHUNK, gy = BACK + 18 + r() * (540 - BACK - 30);
    x.fillStyle = G[2]; x.globalAlpha = 0.5;
    if (placeKey === 'beach') { x.globalAlpha = 1; A.circ(gx, gy, 4, r() < 0.5 ? '#ffccbc' : '#ffffff', 1.5); }
    else if (placeKey === 'ricefield') { x.globalAlpha = 1; A.line(gx, gy, gx - 3, gy - 9, 2, '#7cb342'); A.line(gx, gy, gx + 3, gy - 10, 2, '#7cb342'); }
    else if (placeKey === 'mountain') { x.globalAlpha = 0.6; x.beginPath(); x.ellipse(gx, gy, 18, 4, 0, 0, TAU); x.fillStyle = '#c5d4e2'; x.fill(); }
    else if (placeKey === 'cave') { x.globalAlpha = 0.5; x.beginPath(); x.ellipse(gx, gy, 26, 6, 0, 0, TAU); x.fillStyle = '#6a5acd'; x.fill(); }
    else { x.beginPath(); x.ellipse(gx, gy, 5 + r() * 6, 2, 0, 0, TAU); x.fill(); }
    x.globalAlpha = 1;
  }
  // the scenery along the back
  P.back(x, i * CHUNK, r);
  // a kerb along the back of the street
  x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(0, BACK - 2, CHUNK, 6);
  A.use(g);
  chunks.set(i, cnv);
  if (chunks.size > 6) { const first = chunks.keys().next().value; chunks.delete(first); }
  return cnv;
}

/* ---------- far and middle layers ---------- */
function farCity(col, lo, hi) {
  return (x, r) => {
    x.fillStyle = col;
    for (let bx = 0; bx < STRIP; bx += 30 + r() * 50) { const h = lo + r() * (hi - lo), w = 40 + r() * 60; x.fillRect(bx, 330 - h, w, h + 20); if (r() < 0.3) { x.fillRect(bx + w * 0.4, 330 - h - 20, 6, 20); } }
  };
}
function farHills(c1, c2) {
  return (x) => {
    for (const [col, base, amp, f] of [[c2, 250, 70, 0.006], [c1, 290, 60, 0.011]]) {
      x.fillStyle = col; x.beginPath(); x.moveTo(0, 350);
      for (let px = 0; px <= STRIP; px += 20) x.lineTo(px, base - Math.abs(Math.sin(px * f * Math.PI)) * amp - Math.sin(px * f * 3.1) * 12);
      x.lineTo(STRIP, 350); x.closePath(); x.fill();
    }
  };
}
function farPeaks(x, r) {
  for (let px = -100; px < STRIP; px += 160 + r() * 120) {
    const h = 150 + r() * 90, w = 220 + r() * 120;
    x.fillStyle = '#90a4ae'; x.beginPath(); x.moveTo(px, 330); x.lineTo(px + w / 2, 330 - h); x.lineTo(px + w, 330); x.closePath(); x.fill();
    x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(px + w / 2, 330 - h); x.lineTo(px + w * 0.32, 330 - h * 0.6); x.lineTo(px + w * 0.45, 330 - h * 0.66); x.lineTo(px + w * 0.55, 330 - h * 0.56); x.lineTo(px + w * 0.68, 330 - h * 0.62); x.closePath(); x.fill();
  }
}
function farSea(x, r) {
  const gr = x.createLinearGradient(0, 250, 0, 350); gr.addColorStop(0, '#29b6f6'); gr.addColorStop(1, '#0288d1');
  x.fillStyle = gr; x.fillRect(0, 255, STRIP, 95);
  x.fillStyle = '#7cb342';
  for (let i = 0; i < 4; i++) { const ix = r() * STRIP, iw = 80 + r() * 160; x.beginPath(); x.ellipse(ix, 258, iw / 2, 18 + r() * 20, 0, Math.PI, TAU); x.fill(); }
  x.strokeStyle = 'rgba(255,255,255,0.6)'; x.lineWidth = 2;
  for (let i = 0; i < 30; i++) { const wx = r() * STRIP, wy = 270 + r() * 70; x.beginPath(); x.moveTo(wx, wy); x.lineTo(wx + 14, wy); x.stroke(); }
}
function farKarst(c1, c2, near) {
  return (x, r) => {
    if (!near) { x.fillStyle = '#b3dff2'; x.fillRect(0, 300, STRIP, 50); }
    for (let px = 0; px < STRIP; px += (near ? 260 : 120) + r() * 120) {
      const h = (near ? 150 : 90) + r() * (near ? 90 : 80), w = (near ? 70 : 50) + r() * 50, base = near ? 340 : 312;
      x.fillStyle = r() < 0.5 ? c1 : c2;
      x.beginPath(); x.moveTo(px, base); x.bezierCurveTo(px - 8, base - h * 0.6, px + w * 0.1, base - h, px + w * 0.5, base - h); x.bezierCurveTo(px + w * 0.9, base - h, px + w + 8, base - h * 0.6, px + w, base); x.closePath(); x.fill();
      x.fillStyle = 'rgba(56,142,60,0.35)'; x.beginPath(); x.ellipse(px + w * 0.5, base - h + 10, w * 0.4, 10, 0, 0, TAU); x.fill();
    }
  };
}
function farCave(x, r) {
  x.fillStyle = '#21163a'; x.fillRect(0, 0, STRIP, 350);
  for (let i = 0; i < 70; i++) { const gx = r() * STRIP, gy = r() * 320, rr = 1 + r() * 3; x.fillStyle = r() < 0.5 ? 'rgba(77,208,225,0.7)' : 'rgba(186,104,200,0.7)'; x.beginPath(); x.arc(gx, gy, rr, 0, TAU); x.fill(); }
}
function farNight(x, r) {
  for (let bx = 0; bx < STRIP; bx += 26 + r() * 40) {
    const h = 90 + r() * 160, w = 34 + r() * 50, big = r() < 0.06;
    const hh = big ? 280 : h;
    x.fillStyle = '#16244a'; x.fillRect(bx, 340 - hh, w, hh);
    if (big) { x.beginPath(); x.moveTo(bx, 340 - hh); x.lineTo(bx + w / 2, 340 - hh - 50); x.lineTo(bx + w, 340 - hh); x.fill(); }
    x.fillStyle = 'rgba(255,224,130,0.8)';
    for (let wy = 340 - hh + 8; wy < 330; wy += 12) for (let wx = bx + 5; wx < bx + w - 5; wx += 9) if (r() < 0.35) x.fillRect(wx, wy, 4, 5);
  }
}
function farLab(x, r) {
  x.fillStyle = '#1c2b33'; x.fillRect(0, 0, STRIP, 350);
  x.strokeStyle = '#2e4450'; x.lineWidth = 3;
  for (let px = 0; px < STRIP; px += 100) { x.beginPath(); x.moveTo(px, 0); x.lineTo(px, 350); x.stroke(); }
  for (let i = 0; i < 6; i++) {
    const sx = 60 + i * 260 + r() * 40, s2 = 120 + r() * 60;
    x.fillStyle = '#0b1418'; x.fillRect(sx, s2, 120, 70); x.strokeStyle = '#4dd0e1'; x.lineWidth = 2; x.strokeRect(sx, s2, 120, 70);
    x.strokeStyle = '#76ff03'; x.beginPath(); x.moveTo(sx + 6, s2 + 50); for (let k = 1; k < 10; k++) x.lineTo(sx + 6 + k * 12, s2 + 20 + r() * 40); x.stroke();
  }
}
function midTrees(leaf, roof) {
  return (x, r) => {
    for (let px = 0; px < STRIP; px += 70 + r() * 90) {
      if (r() < 0.35) { const w = 70 + r() * 50; x.fillStyle = roof; x.beginPath(); x.moveTo(px - 10, 300); x.lineTo(px + w / 2, 255 - r() * 20); x.lineTo(px + w + 10, 300); x.closePath(); x.fill(); x.fillStyle = '#efe2c8'; x.fillRect(px, 300, w, 40); }
      else { x.fillStyle = '#6d4c41'; x.fillRect(px + 18, 270, 8, 70); x.fillStyle = leaf; x.beginPath(); x.arc(px + 22, 262, 30 + r() * 14, 0, TAU); x.fill(); x.beginPath(); x.arc(px + 4, 276, 20, 0, TAU); x.fill(); x.beginPath(); x.arc(px + 42, 274, 22, 0, TAU); x.fill(); }
    }
  };
}
function midTubes(x, r) {
  const cols = ['#ffe082', '#80cbc4', '#f8bbd0', '#ffcc80', '#c5e1a5', '#b3e5fc'];
  for (let px = 0; px < STRIP; px += 46 + r() * 10) {
    const h = 120 + r() * 110, w = 44;
    x.fillStyle = cols[Math.floor(r() * cols.length)]; x.fillRect(px, 340 - h, w, h);
    x.fillStyle = 'rgba(0,0,0,0.15)'; for (let fy = 340 - h + 14; fy < 320; fy += 34) { x.fillRect(px + 8, fy, 12, 16); x.fillRect(px + 26, fy, 12, 16); }
    x.fillStyle = '#8d6e63'; x.fillRect(px - 2, 340 - h - 6, w + 4, 6);
  }
  x.strokeStyle = 'rgba(30,30,30,0.5)'; x.lineWidth = 1.5;
  for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(0, 150 + k * 18); for (let px = 0; px <= STRIP; px += 200) x.quadraticCurveTo(px + 100, 170 + k * 18, px + 200, 150 + k * 18); x.stroke(); }
}
function midPalms(x, r) {
  for (let px = 0; px < STRIP; px += 120 + r() * 160) {
    const h = 110 + r() * 70, lean = (r() - 0.5) * 30;
    x.strokeStyle = '#8d6e63'; x.lineWidth = 9; x.beginPath(); x.moveTo(px, 345); x.quadraticCurveTo(px + lean, 345 - h / 2, px + lean * 1.5, 345 - h); x.stroke();
    x.fillStyle = '#43a047';
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; x.beginPath(); x.ellipse(px + lean * 1.5 + Math.cos(a) * 26, 345 - h + Math.sin(a) * 10 + 6, 32, 9, a, 0, TAU); x.fill(); }
  }
}
function midTerraces(x) {
  for (let k = 0; k < 6; k++) {
    x.fillStyle = k % 2 ? '#a5c98a' : '#8fbc74';
    x.beginPath(); x.moveTo(0, 350);
    for (let px = 0; px <= STRIP; px += 40) x.lineTo(px, 210 + k * 22 + Math.sin(px * 0.004 + k) * 26);
    x.lineTo(STRIP, 350); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 3; x.beginPath();
    for (let px = 0; px <= STRIP; px += 40) { const yy = 210 + k * 22 + Math.sin(px * 0.004 + k) * 26; if (px) x.lineTo(px, yy); else x.moveTo(px, yy); }
    x.stroke();
  }
}
function midStalactites(x, r) {
  x.fillStyle = '#2d2145';
  for (let px = 0; px < STRIP; px += 40 + r() * 60) { const h = 40 + r() * 110; x.beginPath(); x.moveTo(px, 0); x.lineTo(px + 18, h); x.lineTo(px + 36, 0); x.closePath(); x.fill(); }
  for (let px = 0; px < STRIP; px += 90 + r() * 100) { const h = 30 + r() * 80; x.beginPath(); x.moveTo(px, 345); x.lineTo(px + 22, 345 - h); x.lineTo(px + 44, 345); x.closePath(); x.fill(); }
}
function midNeon(x, r) {
  const neon = ['#ff4081', '#18ffff', '#ffd740', '#b388ff'], words = ['PHỞ', 'CÀ PHÊ', 'SÀI GÒN', 'BÁNH MÌ', 'KARAOKE'];
  for (let px = 0; px < STRIP; px += 120 + r() * 80) {
    const h = 120 + r() * 100, w = 90 + r() * 40;
    x.fillStyle = '#1d2b55'; x.fillRect(px, 345 - h, w, h);
    x.fillStyle = 'rgba(255,236,179,0.5)'; for (let wy = 345 - h + 10; wy < 330; wy += 16) for (let wx = px + 8; wx < px + w - 8; wx += 14) if (r() < 0.4) x.fillRect(wx, wy, 7, 8);
    if (r() < 0.7) { const col = neon[Math.floor(r() * neon.length)]; x.font = '700 18px Fredoka, sans-serif'; x.fillStyle = col; x.textAlign = 'center'; x.fillText(words[Math.floor(r() * words.length)], px + w / 2, 345 - h + 26); }
  }
}
function midTubesLab(x, r) {
  for (let px = 40; px < STRIP; px += 200 + r() * 100) {
    x.fillStyle = '#37474f'; x.fillRect(px - 6, 120, 72, 16); x.fillRect(px - 6, 320, 72, 25);
    const gr = x.createLinearGradient(px, 0, px + 60, 0); gr.addColorStop(0, 'rgba(118,255,3,0.25)'); gr.addColorStop(0.5, 'rgba(178,255,89,0.5)'); gr.addColorStop(1, 'rgba(118,255,3,0.25)');
    x.fillStyle = gr; x.fillRect(px, 136, 60, 184);
    x.fillStyle = 'rgba(255,255,255,0.5)'; for (let b = 0; b < 6; b++) { x.beginPath(); x.arc(px + 10 + r() * 40, 150 + r() * 160, 2 + r() * 4, 0, TAU); x.fill(); }
  }
}

/* ---------- the scenery along the back of the street (one chunk) ---------- */
const SIGNS = ['PHỞ', 'CHỢ', 'BÁNH MÌ', 'TRÁI CÂY', 'CÀ PHÊ', 'BÚN CHẢ', 'XÔI', 'CHÈ'];
function sign(x, cx, cy, text, bg, fg, w) { A.rr(cx - w / 2, cy - 14, w, 28, 6, bg, 2.5); x.font = '700 16px Fredoka, sans-serif'; x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, cx, cy + 1); }
function lantern(cx, cy) { A.line(cx, cy - 18, cx, cy - 8, 1.5); A.ell(cx, cy + 4, 11, 13, '#e53935', 2.4); A.line(cx - 9, cy + 4, cx + 9, cy + 4, 1.4, '#ffd54f'); A.line(cx, cy + 17, cx, cy + 26, 2, '#ffd54f'); }
function backMarket(x, x0, r) {
  const walls = ['#fff3e0', '#ffe082', '#b2dfdb', '#f8bbd0', '#dcedc8'], awn = [['#ef5350', '#ffffff'], ['#43a047', '#ffffff'], ['#1e88e5', '#ffffff'], ['#fb8c00', '#fff3e0']];
  for (let i = 0; i < 4; i++) {
    const sx = i * 160, wall = walls[Math.floor(r() * walls.length)], [a1, a2] = awn[Math.floor(r() * awn.length)];
    A.rr(sx + 4, 165, 152, 182, 4, wall, 2.5);
    A.rr(sx + 22, 245, 116, 100, 4, '#5d4037', 2.5);
    for (let s = 0; s < 6; s++) { x.fillStyle = s % 2 ? a2 : a1; x.beginPath(); x.moveTo(sx + 10 + s * 23.3, 228); x.lineTo(sx + 33.3 + s * 23.3, 228); x.lineTo(sx + 36 + s * 23.3, 250); x.lineTo(sx + 8 + s * 23.3, 250); x.closePath(); x.fill(); }
    A.line(sx + 8, 250, sx + 152, 250, 2.5);
    sign(x, sx + 80, 196, SIGNS[Math.floor(r() * SIGNS.length)], '#fffde7', '#c62828', 110);
    for (let k = 0; k < 5; k++) A.circ(sx + 34 + k * 22, 330, 8, ['#ff7043', '#ffca28', '#66bb6a', '#ef5350', '#ab47bc'][Math.floor(r() * 5)], 2);
    if (r() < 0.6) lantern(sx + 14, 262);
  }
}
function backOldQuarter(x, x0, r) {
  const cols = ['#ffe082', '#80cbc4', '#f8bbd0', '#ffcc80', '#bcaaa4'];
  for (let i = 0; i < 8; i++) {
    const sx = i * 80, col = cols[Math.floor(r() * cols.length)], top = 125 + r() * 40;
    A.rr(sx + 2, top, 76, 345 - top + 2, 2, col, 2.5);
    for (let f = 0; f < 2; f++) { const fy = top + 16 + f * 52; A.rr(sx + 14, fy, 50, 30, 3, '#4fc3f7', 2); A.line(sx + 10, fy + 34, sx + 68, fy + 34, 3, '#5d4037'); for (let b = 0; b < 6; b++) A.line(sx + 12 + b * 11, fy + 34, sx + 12 + b * 11, fy + 44, 1.6, '#5d4037'); if (r() < 0.6) A.circ(sx + 20 + r() * 40, fy + 30, 6, '#66bb6a', 1.5); }
    A.rr(sx + 12, 290, 56, 55, 2, '#8d6e63', 2.5); for (let s = 0; s < 6; s++) A.line(sx + 12, 296 + s * 8, sx + 68, 296 + s * 8, 1.2, '#6d4c41');
    if (r() < 0.5) lantern(sx + 40, 270);
  }
  // scooters parked along the pavement
  for (let k = 0; k < 2; k++) {
    const sx = 80 + k * 300 + r() * 120, col = ['#e53935', '#1e88e5', '#fdd835', '#43a047'][Math.floor(r() * 4)];
    A.circ(sx - 22, 338, 8, '#37474f', 2.5); A.circ(sx + 24, 338, 8, '#37474f', 2.5);
    x.beginPath(); x.moveTo(sx - 32, 330); x.quadraticCurveTo(sx - 30, 312, sx - 8, 314); x.lineTo(sx + 10, 318); x.lineTo(sx + 30, 328); x.lineTo(sx - 30, 334); x.closePath(); x.fillStyle = col; x.fill(); A.ink(2.5); x.stroke();
    A.line(sx + 20, 324, sx + 26, 300, 3); A.line(sx + 20, 300, sx + 32, 300, 3);
  }
}
function backPaddy(x, x0, r) {
  for (let k = 0; k < 5; k++) {
    const yy = 250 + k * 19;
    x.fillStyle = k % 2 ? '#8bc34a' : '#7cb342'; x.fillRect(0, yy, CHUNK, 19);
    x.fillStyle = 'rgba(179,229,252,0.55)'; for (let w = 0; w < 6; w++) x.fillRect(r() * CHUNK, yy + 10, 30 + r() * 30, 3);
    x.strokeStyle = '#558b2f'; x.lineWidth = 1.6;
    for (let s = 0; s < 40; s++) { const px = r() * CHUNK; x.beginPath(); x.moveTo(px, yy + 16); x.lineTo(px - 2, yy + 4); x.moveTo(px, yy + 16); x.lineTo(px + 3, yy + 5); x.stroke(); }
  }
  x.fillStyle = '#a5d66b'; x.fillRect(0, 235, CHUNK, 16);
  if (r() < 0.6) {
    // a water buffalo, having a rest
    const bx = 100 + r() * 400;
    A.ell(bx, 240, 34, 18, '#5d4e60', 2.5); A.circ(bx + 34, 232, 12, '#5d4e60', 2.5);
    x.beginPath(); x.moveTo(bx + 28, 222); x.quadraticCurveTo(bx + 18, 206, bx + 30, 210); x.moveTo(bx + 40, 222); x.quadraticCurveTo(bx + 52, 206, bx + 40, 210); A.ink(3); x.stroke();
    for (const lx of [-20, -8, 12, 24]) A.line(bx + lx, 252, bx + lx, 262, 5, '#5d4e60');
  }
  if (r() < 0.5) { const hx = 380 + r() * 200; A.rr(hx, 196, 90, 44, 3, '#ffe0b2', 2.5); A.poly([hx - 10, 198, hx + 45, 168, hx + 100, 198], '#c0703a', 2.5); A.rr(hx + 36, 212, 20, 28, 2, '#6d4c41', 2); }
}
function backSchool(x, x0, r) {
  A.rr(0, 150, CHUNK, 197, 0, '#ffe082', 0);
  x.fillStyle = '#f9a825'; x.fillRect(0, 150, CHUNK, 10); x.fillRect(0, 335, CHUNK, 10);
  for (let i = 0; i < 4; i++) {
    const wx = 30 + i * 160;
    if (i === 1 && r() < 0.7) {
      // a blackboard with sums on it
      A.rr(wx - 10, 190, 140, 90, 4, '#2e7d32', 3);
      x.font = '700 18px Fredoka, sans-serif'; x.fillStyle = '#ffffff'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      const sums = ['2 + 3 = 5', '7 × 6 = 42', 'A B C', '10 − 4 = 6', 'cat · dog', '½ + ½ = 1'];
      x.fillText(sums[Math.floor(r() * sums.length)], wx + 2, 225); x.fillText(sums[Math.floor(r() * sums.length)], wx + 2, 255);
    } else {
      A.rr(wx, 185, 100, 70, 3, '#b3e5fc', 3); A.line(wx + 50, 185, wx + 50, 255, 2.5); A.line(wx, 220, wx + 100, 220, 2.5);
      A.rr(wx + 10, 275, 80, 45, 3, '#b3e5fc', 2.5);
    }
  }
  if (r() < 0.5) { A.circ(560, 172, 14, '#ffffff', 2.5); A.line(560, 172, 560, 163, 2); A.line(560, 172, 567, 175, 2); }
}
function backBeach(x, x0, r) {
  x.fillStyle = '#f5e1ae'; x.fillRect(0, 300, CHUNK, 47);
  for (let k = 0; k < 2; k++) {
    const ux = 60 + k * 300 + r() * 160, col = ['#ef5350', '#29b6f6', '#ffca28', '#ab47bc'][Math.floor(r() * 4)];
    A.line(ux, 340, ux, 260, 3.5, '#8d6e63');
    x.beginPath(); x.moveTo(ux - 54, 268); x.quadraticCurveTo(ux, 222, ux + 54, 268); x.closePath(); x.fillStyle = col; x.fill(); A.ink(3); x.stroke();
    x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(ux - 18, 262); x.quadraticCurveTo(ux, 236, ux + 18, 262); x.closePath(); x.fill();
  }
  if (r() < 0.7) {
    // a round basket boat
    const bx = 250 + r() * 260;
    x.beginPath(); x.ellipse(bx, 326, 40, 16, 0, 0, Math.PI); x.fillStyle = '#8d6e63'; x.fill(); A.ink(3); x.stroke(); A.ell(bx, 326, 40, 8, '#a1887f', 2.5);
  }
}
function backBoat(x, x0, r) {
  // the deck rail and an orange junk sail
  if (r() < 0.8) {
    const mx = 150 + r() * 340;
    A.line(mx, 340, mx, 120, 6, '#5d4037');
    x.beginPath(); x.moveTo(mx + 4, 128); x.quadraticCurveTo(mx + 110, 150, mx + 120, 230); x.lineTo(mx + 4, 300); x.closePath(); x.fillStyle = '#ff8f00'; x.fill(); A.ink(3); x.stroke();
    for (let k = 1; k < 5; k++) A.line(mx + 4, 128 + k * 34, mx + 104 + k * 3, 140 + k * 26, 2, '#e65100');
  }
  for (let px = 0; px < CHUNK; px += 64) A.line(px, 300, px, 342, 5, '#6d4c41');
  A.line(0, 300, CHUNK, 300, 7, '#6d4c41'); A.line(0, 320, CHUNK, 320, 3, '#8d6e63');
  if (r() < 0.5) { const lx = 60 + r() * 500; A.circ(lx, 318, 14, '#ffffff', 3); A.circ(lx, 318, 7, '#a87c52', 2); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; A.line(lx + Math.cos(a) * 8, 318 + Math.sin(a) * 8, lx + Math.cos(a) * 14, 318 + Math.sin(a) * 14, 4, '#e53935'); } }
}
function backCave(x, x0, r) {
  x.fillStyle = '#2b2040'; x.beginPath(); x.moveTo(0, 347);
  for (let px = 0; px <= CHUNK; px += 32) x.lineTo(px, 200 + r() * 60);
  x.lineTo(CHUNK, 347); x.closePath(); x.fill();
  for (let k = 0; k < 4; k++) { const cx = r() * CHUNK, cy = 280 + r() * 50, col = r() < 0.5 ? '#4dd0e1' : '#ce93d8'; x.globalAlpha = 0.35; A.circ(cx, cy, 26, col, 0); x.globalAlpha = 1; A.poly([cx - 10, cy + 12, cx - 4, cy - 22, cx + 2, cy + 12], col, 2); A.poly([cx, cy + 12, cx + 8, cy - 12, cx + 12, cy + 12], col, 2); }
  for (let k = 0; k < 3; k++) { const mx = r() * CHUNK; A.line(mx, 344, mx, 330, 3, '#d7ccc8'); A.ell(mx, 328, 9, 5, '#80deea', 2); }
}
function backSapa(x, x0, r) {
  for (let k = 0; k < 3; k++) {
    const tx = 40 + k * 210 + r() * 80, th = 70 + r() * 50;
    A.line(tx, 344, tx, 344 - th * 0.3, 6, '#5d4037');
    for (let l = 0; l < 3; l++) { const w = 46 - l * 12, yy = 344 - th * 0.3 - l * th * 0.28; A.poly([tx - w, yy, tx, yy - th * 0.4, tx + w, yy], '#2e7d32', 2.5); A.poly([tx - w * 0.6, yy - th * 0.18, tx, yy - th * 0.4, tx + w * 0.6, yy - th * 0.18], '#ffffff', 0); }
  }
  if (r() < 0.6) { const hx = 230 + r() * 220; A.rr(hx, 268, 110, 72, 3, '#8d6e63', 2.5); A.poly([hx - 14, 272, hx + 55, 222, hx + 124, 272], '#ffffff', 2.5); A.rr(hx + 44, 296, 24, 44, 2, '#5d4037', 2); A.rr(hx + 12, 290, 22, 18, 2, '#ffe082', 2); }
  for (let px = 0; px < CHUNK; px += 40) A.line(px, 344, px, 318, 4, '#795548');
  A.line(0, 324, CHUNK, 324, 3, '#795548');
}
function backRoof(x, x0, r) {
  A.rr(0, 300, CHUNK, 48, 0, '#454857', 0);
  x.fillStyle = '#3a3c49'; x.fillRect(0, 296, CHUNK, 8);
  for (let k = 0; k < 2; k++) {
    const tx = 60 + k * 300 + r() * 160;
    if (r() < 0.6) { A.rr(tx, 230, 60, 70, 10, '#b0bec5', 3); A.line(tx + 10, 300, tx + 10, 312, 4); A.line(tx + 50, 300, tx + 50, 312, 4); }
    else { A.rr(tx, 262, 70, 38, 4, '#cfd8dc', 3); A.circ(tx + 22, 281, 13, '#90a4ae', 2); }
  }
  A.line(0, 200, CHUNK, 215, 1.2, '#9e9e9e');
  const bulbs = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb'];
  for (let k = 0; k < 16; k++) { const bx = k * 40 + 10; A.circ(bx, 201 + bx * 15 / CHUNK + 6, 4.5, bulbs[k % 5], 1.5); }
  if (r() < 0.6) { const ax = r() * CHUNK; A.line(ax, 296, ax, 180, 3, '#9e9e9e'); A.line(ax - 16, 196, ax + 16, 196, 3, '#9e9e9e'); A.line(ax - 10, 212, ax + 10, 212, 3, '#9e9e9e'); }
}
function backLab(x, x0, r) {
  A.rr(0, 160, CHUNK, 188, 0, '#30434c', 0);
  for (let k = 0; k < 3; k++) {
    const mx = 30 + k * 210 + r() * 40;
    A.rr(mx, 230, 140, 115, 6, '#546e7a', 3);
    A.rr(mx + 14, 246, 70, 40, 4, '#0b1418', 2.5);
    x.strokeStyle = '#18ffff'; x.lineWidth = 2; x.beginPath(); x.moveTo(mx + 18, 270); for (let s = 1; s < 8; s++) x.lineTo(mx + 18 + s * 8, 262 + r() * 18); x.stroke();
    for (let b = 0; b < 3; b++) A.circ(mx + 100 + b * 0, 252 + b * 18, 5, ['#ff5252', '#ffd740', '#69f0ae'][b], 2);
    A.rr(mx + 14, 300, 112, 10, 3, '#78909c', 2);
  }
  A.line(0, 186, CHUNK, 186, 10, '#607d8b'); A.line(0, 186, CHUNK, 186, 4, '#78909c');
}

/* ================= a frame =================
   V: the world to draw (the host's state, or a crew member's copy): cam, players, zs, boss, shots, picks, props,
   marks, gate, shake, go. opts: { now, dt, me (the local hero ids), names: { id: name }, crew } */
function frame(V, opts) {
  if (!g || !P) return;
  const now = opts.now, cam = V.cam;
  A.use(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  // the sky fills the whole screen
  const gr = g.createLinearGradient(0, 0, 0, cv.height); gr.addColorStop(0, P.sky[0]); gr.addColorStop(clamp((oy + BACK * scale) / H, 0.2, 0.95), P.sky[1]); gr.addColorStop(1, P.sky[1]);
  g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
  const sh = (V.shake || 0) > 0 && !opts.calm ? V.shake * 7 : 0, shx = sh ? (Math.random() - 0.5) * sh : 0, shy = sh ? (Math.random() - 0.5) * sh : 0;
  const k = dpr * scale;
  g.setTransform(k, 0, 0, k, dpr * (ox + shx * scale), dpr * (oy + shy * scale));
  // the stage's own sky bits: sun or moon, stars, clouds
  if (P.sun) { g.globalAlpha = 0.5; A.circ(P.sun[0], P.sun[1], 52, P.sun[2], 0); g.globalAlpha = 1; A.circ(P.sun[0], P.sun[1], 34, P.sun[2], 0); }
  if (P.moon) { A.circ(P.moon[0], P.moon[1], 30, '#fff8e1', 0); A.circ(P.moon[0] + 12, P.moon[1] - 8, 26, P.sky[0], 0); }
  if (P.stars) { g.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) { const sx = (i * 97.3) % VIEW, syy = (i * 53.7) % 200 - 40; g.globalAlpha = 0.4 + 0.4 * Math.sin(now * 2 + i); g.fillRect(sx, syy, 2, 2); } g.globalAlpha = 1; }
  if (P.clouds) for (let i = 0; i < 4; i++) { const cx = ((i * 300 - cam * 0.08 - now * 6) % 1300 + 1300) % 1300 - 160, cy = 40 + i * 28; g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(cx, cy, 24, 0, TAU); g.arc(cx + 26, cy - 10, 30, 0, TAU); g.arc(cx + 56, cy, 22, 0, TAU); g.fill(); }
  // far and middle layers
  if (!far) far = strip(P.far, 31);
  if (!mid) mid = strip(P.mid, 57);
  for (const [img, par] of [[far, 0.18], [mid, 0.45]]) {
    const off = -(((cam * par) % STRIP) + STRIP) % STRIP;
    g.drawImage(img, off, 0, STRIP, 350); g.drawImage(img, off + STRIP, 0, STRIP, 350);
  }
  // the street, chunk by chunk
  const c0 = Math.floor(cam / CHUNK), c1 = Math.floor((cam + VIEW) / CHUNK);
  for (let i = c0; i <= c1; i++) g.drawImage(chunk(i), i * CHUNK - cam, 120, CHUNK, 420);
  // more pavement below the stage on a tall screen
  if (oy + 540 * scale < H) { g.fillStyle = P.ground[2]; g.fillRect(-ox / scale - 10, 540, W / scale + 20, (H - oy) / scale - 540 + 10); }
  // lines on the street, fanning out towards the front (they move with it)
  g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 2;
  for (let lx = Math.floor((cam - 300) / 160) * 160; lx < cam + VIEW + 300; lx += 160) { const bx = lx - cam, fx = 480 + (bx - 480) * 1.35; g.beginPath(); g.moveTo(bx, BACK); g.lineTo(fx, 560); g.stroke(); }
  // warnings on the ground
  marks(V, cam, now);
  // the gate
  if (V.gate) A.gate(V.gate.x - cam, BACK, FRONT + 8, placeKey, V.gate.open ? V.gate.openT : 0);
  // everyone and everything, back to front
  const items = [];
  for (const p of V.players) items.push([p.y, 0, p]);
  for (const z of V.zs) items.push([z.y, 1, z]);
  if (V.boss && !(V.boss.hide > 0 && V.boss.b !== 'crab')) items.push([V.boss.y, 2, V.boss]);
  for (const pr of V.props) if (pr.x > cam - 100 && pr.x < cam + VIEW + 100) items.push([pr.y, 3, pr]);
  for (const k2 of V.picks) items.push([k2.y, 4, k2]);
  for (const s of V.shots) items.push([s.y, 5, s]);
  const owner = V.gate && !V.gate.open ? V.gate : V.boss && V.boss.shield ? V.boss : null;
  if (owner) owner.drums.forEach((d) => items.push([d.y, 6, d, owner]));
  items.sort((a, b) => b[0] - a[0]);
  // shadows first, so nobody stands on someone's shadow
  g.fillStyle = 'rgba(0,0,0,0.22)';
  for (const [y, kind, o] of items) {
    if (kind > 2 && kind !== 4 && kind !== 5) continue;
    const s = sc(y), w = kind === 2 ? FF.BOSSES[o.b].w * 0.55 : kind === 1 ? FF.ZOMBIES[o.k].w * 0.75 : kind === 0 ? 24 : 9;
    const lift = Math.max(0, o.z || 0), sh2 = 1 / (1 + lift / 120);
    g.beginPath(); g.ellipse(o.x - cam, sy(y), w * s * sh2, 6 * s * sh2, 0, 0, TAU); g.fill();
  }
  for (const it of items) drawItem(it, cam, now, opts);
  // sparks, puffs and words
  drawFx(cam, now);
  // a few things in front of the street
  front(cam);
  // the way on
  if (V.go && !V.lockK && !V.lock) { const bob = Math.sin(now * 6) * 8; g.globalAlpha = 0.9; A.poly([870 + bob, 210, 920 + bob, 250, 870 + bob, 290, 870 + bob, 268, 820 + bob, 268, 820 + bob, 232, 870 + bob, 232], '#ffd54f', 4); g.font = '700 26px Fredoka, sans-serif'; g.fillStyle = '#ffffff'; g.strokeStyle = '#2a1c14'; g.lineWidth = 6; g.textAlign = 'center'; g.strokeText('GO!', 860 + bob, 196); g.fillText('GO!', 860 + bob, 196); g.globalAlpha = 1; }
  // night and caves are a little darker at the edges
  if (P.dark || P.night) g.drawImage(vignette(), -ox / scale, -oy / scale, W / scale, H / scale);
  if (P.snow && !opts.calm) { g.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 50; i++) { const fx = ((i * 137.7 + now * 20 * (1 + i % 3)) % 1000) - 20, fy = ((i * 71.3 + now * 40 * (1 + i % 2)) % 620) - 60; g.beginPath(); g.arc(fx, fy, 2 + (i % 3), 0, TAU); g.fill(); } }
}
// the darker edges of night and caves: a picture made once per screen size, at a quarter of the pixels
let vig = null;
function vignette() {
  const w = Math.max(1, Math.round(W / 4)), h = Math.max(1, Math.round(H / 4));
  if (vig && vig.width === w && vig.height === h) return vig;
  vig = document.createElement('canvas'); vig.width = w; vig.height = h;
  const x = vig.getContext('2d'), cx = (ox + 480 * scale) / 4, cy = (oy + 380 * scale) / 4;
  const vg = x.createRadialGradient(cx, cy, 200 * scale / 4, cx, cy, 700 * scale / 4); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  x.fillStyle = vg; x.fillRect(0, 0, w, h);
  return vig;
}
function drawItem(it, cam, now, opts) {
  const [y, kind, o, owner] = it, x = o.x - cam, s = sc(y), gy = sy(y), z = o.z || 0;
  if (x < -200 || x > VIEW + 200) return;
  if (kind === 0) {
    const H2 = FF.HEROES[o.hero];
    // the local hero's ring, and a name in a crew game
    if (opts.rings) { const col = A.HERO_COL[o.hero]; g.strokeStyle = col; g.lineWidth = 4; g.globalAlpha = opts.me && opts.me.indexOf(o.id) >= 0 ? 0.95 : 0.5; g.beginPath(); g.ellipse(x, gy, 28 * s, 8 * s, 0, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    if (o.inv > 0 && o.st !== 'ko' && Math.floor(now * 14) % 2 === 0 && o.st !== 'spec') g.globalAlpha = 0.55;
    o.hitFlash = o.st === 'hurt' && o.t < 0.1;
    A.hero(o, H2, x, gy - z * s, s * 1.0, now);
    g.globalAlpha = 1;
    if (o.st === 'ko') koMarks(o, x, gy, s, now);
    if (opts.names && opts.crew > 1) { const nm = opts.names[o.id] || ''; if (nm) { g.font = '700 14px Fredoka, sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(42,28,20,0.85)'; g.fillStyle = A.HERO_COL[o.hero]; const ty = gy - z * s - (H2.h + 30) * s; g.strokeText(nm, x, ty); g.fillText(nm, x, ty); } }
  } else if (kind === 1) {
    const zt = FF.ZOMBIES[o.k];
    if (o.st === 'dying') g.globalAlpha = clamp(1 - (o.t - 0.35) / 0.35, 0, 1);
    A.zombie(o, zt, x, gy - z * s, s, now);
    g.globalAlpha = 1;
    // the warning before a bite
    if (o.st === 'wind') bang(x, gy - z * s - (zt.h + 22) * s, now);
    // a health bar once it has been hit
    if (o.hp < o.max && o.st !== 'dying') bar(x, gy - z * s - (zt.h + 10) * s, 34, o.hp / o.max, o.armor ? '#90a4ae' : '#ef5350');
  } else if (kind === 2) {
    const D = FF.BOSSES[o.b];
    A.boss(o, D, x, gy - z * s, s, now);
    if (o.shield) { g.globalAlpha = 0.25 + Math.sin(now * 5) * 0.1; A.ell(x, gy - z * s - D.h * 0.5 * s, D.w * 0.9, D.h * 0.62, '#80d8ff', 4); g.globalAlpha = 1; }
    if (o.daze > 0) koStars(x, gy - z * s - (D.h + 20) * s, now, 30);
  } else if (kind === 3) A.prop(o, x, gy, s, placeKey);
  else if (kind === 4) A.pickThing(o.k, x, gy - z * s, s, now);
  else if (kind === 5) A.shot(o, x, gy - z * s, s, now);
  else if (kind === 6) A.drum(o, x, gy, s * 1.05, now, owner.hint, owner !== null && owner.b !== undefined);
}
function bar(x, y, w, f, col) {
  A.rr(x - w / 2 - 2, y - 3, w + 4, 8, 4, '#2a1c14', 0);
  g.fillStyle = col; g.fillRect(x - w / 2, y - 1, w * clamp(f, 0, 1), 4);
}
function bang(x, y, now) {
  const s = 1 + Math.sin(now * 20) * 0.12;
  g.save(); g.translate(x, y); g.scale(s, s);
  A.circ(0, 0, 12, '#ffeb3b', 3);
  g.font = '800 18px Fredoka, sans-serif'; g.fillStyle = '#d32f2f'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 0, 1);
  g.restore();
}
function koStars(x, y, now, r) {
  for (let i = 0; i < 3; i++) { const a = now * 4 + i * TAU / 3; A.poly(starPts(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.35, 7, 3), '#ffeb3b', 2); }
}
function koMarks(o, x, gy, s, now) {
  koStars(x - 10, gy - 40 * s, now, 22);
  // the ring fills as a teammate helps; the clock runs down to a family heart
  const f = clamp((o.rev || 0) / 1.2, 0, 1);
  g.lineWidth = 6; g.strokeStyle = 'rgba(42,28,20,0.6)'; g.beginPath(); g.arc(x, gy - 70 * s, 20, 0, TAU); g.stroke();
  if (f > 0) { g.strokeStyle = '#69f0ae'; g.beginPath(); g.arc(x, gy - 70 * s, 20, -Math.PI / 2, -Math.PI / 2 + f * TAU); g.stroke(); }
  g.font = '700 18px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.strokeStyle = '#2a1c14'; g.lineWidth = 4;
  g.strokeText('HELP!', x, gy - 104 * s); g.fillText('HELP!', x, gy - 104 * s);
}
function starPts(x, y, R, r) { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; p.push(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } return p; }
function marks(V, cam, now) {
  for (const m of V.marks) {
    const pulse = 0.35 + 0.2 * Math.sin(now * 14);
    if (m.k === 'zone') {
      const x = m.x - cam, y = sy(m.y);
      g.globalAlpha = m.t >= m.dur ? 0.6 : pulse; A.ell(x, y, m.w * 0.5, m.d * 0.5 * DK, '#ff1744', 3); g.globalAlpha = 1;
    } else if (m.k === 'aim') {
      const x = m.x - cam, y = sy(m.y), f = clamp(m.t / Math.max(0.1, m.dur), 0, 1);
      g.globalAlpha = 0.5; A.ell(x, y, m.r, m.r * 0.4, '#ff5252', 3); g.globalAlpha = 0.8; A.ell(x, y, m.r * f, m.r * 0.4 * f, '#ff1744', 0); g.globalAlpha = 1;
    } else if (m.k === 'line') {
      const y = sy(m.y);
      if (m.beam && m.t >= m.dur) { g.fillStyle = 'rgba(255,23,68,0.85)'; g.fillRect(0, y - 12, VIEW, 24); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, y - 4, VIEW, 8); }
      else { g.globalAlpha = pulse; g.fillStyle = '#ff1744'; g.fillRect(0, y - 14, VIEW, 28); g.globalAlpha = 1; }
    } else if (m.k === 'ring' && m.t >= (m.wind || 0)) {
      const x = m.x - cam, y = sy(m.y);
      g.lineWidth = 8; g.strokeStyle = 'rgba(255,193,7,0.85)'; g.beginPath(); g.ellipse(x, y, m.r, m.r / 2.2 * DK, 0, 0, TAU); g.stroke();
      g.lineWidth = 3; g.strokeStyle = '#2a1c14'; g.stroke();
    } else if (m.k === 'ring') { const x = m.x - cam, y = sy(m.y); g.globalAlpha = pulse; A.ell(x, y, 50, 18, '#ffc107', 3); g.globalAlpha = 1; }
  }
}
function front(cam) {
  const kind = P.front, step = 520;
  for (let fx = Math.floor((cam * 1.15) / step) * step; fx < cam * 1.15 + VIEW + step; fx += step) {
    const x = fx - cam * 1.15 + 120, r = mulberry(Math.floor(fx / step) + 5)();
    if (r < 0.35) continue;
    // low things only, so they never hide a fighter
    if (kind === 'lamp') { A.rr(x - 18, 528, 36, 30, 6, '#d84315', 3); for (let k = -1; k <= 1; k++) A.circ(x + k * 11, 524, 8, ['#ef5350', '#ffca28', '#ab47bc'][k + 1], 2); }
    else if (kind === 'grass' || kind === 'pine') { for (let k = -2; k <= 2; k++) A.line(x + k * 7, 552, x + k * 9, 528 - (2 - Math.abs(k)) * 5, 4, kind === 'pine' ? '#2e7d32' : '#689f38'); }
    else if (kind === 'fence') { for (let k = -1; k <= 1; k++) { A.rr(x + k * 16 - 5, 522, 10, 40, 3, '#ffffff', 2.5); } A.line(x - 26, 534, x + 26, 534, 4, '#ffffff'); }
    else if (kind === 'shell') { A.ell(x, 536, 14, 9, '#ffccbc', 2.5); A.ell(x + 30, 540, 8, 6, '#ffffff', 2); }
    else if (kind === 'rope') { A.line(x - 60, 532, x + 60, 532, 6, '#a1887f'); A.circ(x, 532, 8, '#8d6e63', 2); }
    else if (kind === 'rock') { A.poly([x - 34, 560, x - 18, 526, x + 8, 520, x + 30, 560], '#3a2f50', 3); }
    else if (kind === 'antenna') { A.rr(x - 20, 530, 40, 26, 4, '#90a4ae', 3); A.circ(x, 543, 7, '#607d8b', 2); }
    else if (kind === 'pipe') { A.rr(x - 50, 530, 100, 16, 6, '#78909c', 3); }
    else if (kind === 'wire') { A.line(x - 80, 536, x + 80, 540, 2, '#455a64'); }
  }
}

/* ================= sparks, puffs and words =================
   fx(kind, x, y, z, o): in the street's terms (x along it, y depth, z height). */
const WORDS = ['POW!', 'BAM!', 'BONK!', 'WHAM!', 'BOOM!', 'THWACK!'];
function fx(kind, x, y, z, o) {
  o = o || {};
  const add = (f) => { if (fxs.length < 160) fxs.push(Object.assign({ k: kind, x: x, y: y, z: z || 0, t: 0, life: 0.6 }, f)); };
  switch (kind) {
    case 'hit': add({ life: 0.22, r: o.heavy ? 26 : 16 }); if (o.heavy) add({ k: 'word', life: 0.7, text: WORDS[Math.floor(Math.random() * WORDS.length)], vz: 60 }); if (o.dmg) add({ k: 'num', life: 0.7, text: String(o.dmg), vz: 90, vx: (Math.random() - 0.5) * 60, col: o.boss ? '#ffd54f' : '#ffffff' }); break;
    case 'poof': for (let i = 0; i < 7; i++) add({ life: 0.6 + Math.random() * 0.3, vx: (Math.random() - 0.5) * 120, vz: 40 + Math.random() * 80, r: 12 + Math.random() * 12, z: (z || 0) + 30 + Math.random() * 30 }); add({ k: 'stars', life: 0.8, z: (z || 0) + 60 }); break;
    case 'dust': for (let i = 0; i < 4; i++) add({ life: 0.4, vx: (i - 1.5) * 50, vz: 20, r: 8 }); break;
    case 'ring': add({ life: 0.5, r: o.r || 60, col: o.col || '#ffd54f' }); break;
    case 'boom': add({ k: 'ring', life: 0.5, r: o.r || 90, col: '#c6ff00' }); for (let i = 0; i < 10; i++) add({ k: 'poof', life: 0.7, vx: (Math.random() - 0.5) * 220, vz: 50 + Math.random() * 120, r: 14 + Math.random() * 14, z: 30, col: '#c5e1a5' }); add({ k: 'word', life: 0.8, text: 'POP!', vz: 60, z: 90 }); break;
    case 'bits': for (let i = 0; i < 8; i++) add({ life: 0.8, vx: (Math.random() - 0.5) * 260, vz: 150 + Math.random() * 200, z: 30, spin: Math.random() * 10, col: o.col || '#c58b4f' }); break;
    case 'word': add({ life: o.life || 0.9, text: o.text, vz: 50, col: o.col || '#ffffff', size: o.size || 26 }); break;
    case 'num': add({ life: 0.8, text: o.text, vz: 80, col: o.col || '#69f0ae' }); break;
    case 'conf': for (let i = 0; i < 26; i++) add({ life: 1.2, vx: (Math.random() - 0.5) * 320, vz: 200 + Math.random() * 260, z: 40, spin: Math.random() * 10, col: ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb'][i % 5] }); break;
    case 'pot': add({ life: 1.0, vx: -(o.face || 1) * 160, vz: 300, z: z, spin: 0, k: 'pot' }); break;
    case 'tray': add({ life: 1.0, vx: -(o.face || 1) * 140, vz: 260, z: 50, k: 'tray' }); break;
    case 'heart': add({ life: 1.2, vz: 70, z: (z || 0) + 90 }); break;
    case 'splat': add({ life: 0.4, r: 18, col: o.col || '#aeea00' }); break;
    case 'block': add({ life: 0.3, r: 18 }); add({ k: 'word', life: 0.6, text: 'BLOCK', vz: 50, size: 18, col: '#b3e5fc' }); break;
    case 'smoke': add({ k: 'poof', life: 0.5, vx: (o.vx || 0), vz: 30, r: 8, z: (z || 0) + 10, col: '#eeeeee' }); break;
    default: add({});
  }
}
function drawFx(cam, now) {
  for (const f of fxs) {
    const life = clamp(f.t / f.life, 0, 1), x = f.x - cam + (f.vx || 0) * f.t, y = sy(f.y), zz = f.z + (f.vz || 0) * f.t - (f.k === 'bits' || f.k === 'conf' || f.k === 'pot' || f.k === 'tray' ? 500 * f.t * f.t : 0);
    const py = y - Math.max(0, zz) * sc(f.y);
    g.globalAlpha = f.k === 'word' || f.k === 'num' ? clamp(1.6 - life * 1.6, 0, 1) : 1 - life;
    switch (f.k) {
      case 'hit': A.poly(starPts(x, py, f.r * (0.6 + life), f.r * 0.45 * (0.6 + life)), '#fff59d', 2.5); break;
      case 'poof': A.circ(x, py, f.r * (1 + life * 0.6), f.col || '#f5f5f5', 2); break;
      case 'stars': koStars(x, py, now, 18 + life * 10); break;
      case 'dust': A.circ(x, py, f.r * (1 + life), 'rgba(230,220,200,0.9)', 0); break;
      case 'ring': g.lineWidth = 6 * (1 - life) + 1; g.strokeStyle = f.col || '#ffd54f'; g.beginPath(); g.ellipse(x, y, f.r * (0.3 + life), f.r * (0.3 + life) * 0.35, 0, 0, TAU); g.stroke(); break;
      case 'bits': g.save(); g.translate(x, py); g.rotate(f.spin * f.t * 3); A.rr(-6, -3, 12, 6, 1, f.col, 2); g.restore(); break;
      case 'conf': g.fillStyle = f.col; g.save(); g.translate(x, py); g.rotate(f.spin * f.t * 4); g.fillRect(-4, -2, 8, 4); g.restore(); break;
      case 'word': case 'num': { const s = f.k === 'word' ? 1 + Math.max(0, 0.3 - f.t) * 1.5 : 1; g.font = '800 ' + Math.round((f.size || (f.k === 'num' ? 20 : 26)) * s) + 'px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 5; g.strokeStyle = '#2a1c14'; g.strokeText(f.text, x, py); g.fillStyle = f.col || '#ffeb3b'; g.fillText(f.text, x, py); break; }
      case 'pot': g.save(); g.translate(x, py); g.rotate(f.t * 12); A.rr(-14, -8, 28, 14, 4, '#cfd8dc', 2.5); g.restore(); break;
      case 'tray': g.save(); g.translate(x, py); g.rotate(f.t * 10); A.ell(0, 0, 28, 8, '#c8a165', 2.5); g.restore(); break;
      case 'heart': { const s = 1 + life * 0.3; g.save(); g.translate(x, py); g.scale(s, s); g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-16, -6, -8, -18, 0, -9); g.bezierCurveTo(8, -18, 16, -6, 0, 6); g.fillStyle = '#ff5252'; g.fill(); A.ink(2.5); g.stroke(); g.restore(); break; }
      case 'splat': A.circ(x, py, f.r * (0.6 + life * 0.6), f.col, 0); break;
      case 'block': A.circ(x, py, f.r * (0.6 + life), 'rgba(179,229,252,0.6)', 2); break;
    }
    g.globalAlpha = 1;
  }
}
function tick(dt) {
  for (const f of fxs) f.t += dt;
  for (let i = fxs.length - 1; i >= 0; i--) if (fxs[i].t >= fxs[i].life) fxs.splice(i, 1);
}
function clearFx() { fxs.length = 0; }

// a picture of a place, for the level cards
function postcard(canvas, key) {
  const k2 = canvas.getContext('2d'), w = canvas.width, h = canvas.height, prev = { place: placeKey, P: P, far: far, mid: mid, q: q };
  const PL = PLACES[key] || PLACES.market;
  const gr = k2.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, PL.sky[0]); gr.addColorStop(1, PL.sky[1]); k2.fillStyle = gr; k2.fillRect(0, 0, w, h);
  P = PL; placeKey = key; q = Math.max(0.5, w / VIEW * 1.5);
  const f2 = strip(PL.far, 31), m2 = strip(PL.mid, 57);
  k2.save(); k2.scale(w / VIEW, w / VIEW); k2.translate(0, -(540 - h * VIEW / w));
  k2.drawImage(f2, 0, 0, STRIP, 350); k2.drawImage(m2, 0, 0, STRIP, 350);
  const [cnv] = [(() => { chunks.clear(); return chunk(3); })()];
  k2.drawImage(cnv, 0, 120, CHUNK, 420); k2.drawImage(chunk(4), CHUNK, 120, CHUNK, 420);
  k2.restore();
  chunks.clear(); placeKey = prev.place; P = prev.P; far = prev.far; mid = prev.mid; q = prev.q;
  A.use(g);
}

return { init, resize, setQuality, setPlace, frame, fx, tick, clearFx, stage, toScreen, postcard, PLACES, BACK, FRONT, sy, sc };
})();
