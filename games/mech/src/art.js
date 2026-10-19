/* games/mech/src/art.js — Mech Blaster's pictures, drawn with canvas paths: no image files. Part 1: helpers, the
   player's mech (seen from behind), the ten enemies (facing the player), missiles, small obstacles and pickups.
   Every drawing is in metres with the thing's foot at (0, 0) and up as negative y; the renderer scales the context
   by the pixels per metre at the thing's distance. ART.setMode(1) draws everything white (a hit flash) and
   ART.setMode(2) icy blue (frozen). */
const ART = (function () {
  'use strict';
  const OUT = '#17132b';
  let MODE = 0, LW = 0.05;
  const TAU = Math.PI * 2;

  /* ---------- colour helpers ---------- */
  const rgbMemo = new Map();
  function rgb(h) {
    let v = rgbMemo.get(h);
    if (!v) { const n = parseInt(h.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; rgbMemo.set(h, v); }
    return v;
  }
  const mixMemo = new Map();
  function mix(a, b, f) {
    const k = a + b + f;
    let v = mixMemo.get(k);
    if (!v) {
      const A = rgb(a), B = rgb(b);
      v = '#' + A.map((x, i) => Math.round(x + (B[i] - x) * f).toString(16).padStart(2, '0')).join('');
      if (mixMemo.size > 4000) mixMemo.clear();
      mixMemo.set(k, v);
    }
    return v;
  }
  function C(h) { return MODE === 1 ? '#ffffff' : MODE === 2 ? mix(h, '#a6e6ff', 0.62) : h; }
  function lit(h, f) { return C(f >= 0 ? mix(h, '#ffffff', f) : mix(h, '#000000', -f)); }
  function rgba(h, a) { const v = rgb(h); return 'rgba(' + v[0] + ',' + v[1] + ',' + v[2] + ',' + a + ')'; }

  /* ---------- path helpers ---------- */
  function begin(c, px, mode) { MODE = mode || 0; LW = Math.max(0.04, 1.1 / Math.max(1, px)); c.lineJoin = 'round'; c.lineCap = 'round'; }
  function setMode(m) { MODE = m || 0; }
  function poly(c, p) { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); }
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.001, r), 0, TAU); }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.001, rx), Math.max(0.001, ry), rot || 0, 0, TAU); }
  function fs(c, fill, w) { c.fillStyle = C(fill); c.fill(); if (w !== 0) { c.lineWidth = LW * (w || 1); c.strokeStyle = OUT; c.stroke(); } }
  function fl(c, fill, a) { c.fillStyle = a != null ? rgba(MODE === 1 ? '#ffffff' : fill, a) : C(fill); c.fill(); }
  function line(c, x1, y1, x2, y2, col, w) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = C(col); c.lineWidth = w; c.stroke(); }

  /* ---------- glows (added light) ---------- */
  const glowMemo = new Map();
  function glowSprite(col) {
    let g = glowMemo.get(col);
    if (!g) {
      g = document.createElement('canvas'); g.width = g.height = 64;
      const x = g.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, rgba(col, 1)); gr.addColorStop(0.25, rgba(col, 0.55)); gr.addColorStop(1, rgba(col, 0));
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      glowMemo.set(col, g);
    }
    return g;
  }
  // switches for measuring what a frame costs (MR draws without glows, the sky, the road or the boss shield); off in play
  const dbg = { noGlow: false };
  function glow(c, x, y, r, col, a) {
    if (r <= 0 || a <= 0 || dbg.noGlow) return;
    const o = c.globalCompositeOperation, ga = c.globalAlpha;
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = ga * Math.min(1, a);
    c.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
    c.globalCompositeOperation = o; c.globalAlpha = ga;
  }

  /* ================= the player's mech, from behind ================= */
  const PAINTS = [
    { id: 'sunset', name: 'Sunset', main: '#ff8a3d', accent: '#ffd23f', glow: '#62f2ff' },
    { id: 'ocean', name: 'Ocean', main: '#3d8bff', accent: '#9ff0ff', glow: '#7dfcff' },
    { id: 'jungle', name: 'Jungle', main: '#3fbf6a', accent: '#d8ff6a', glow: '#b4ff5a' },
    { id: 'ruby', name: 'Ruby', main: '#ff4f64', accent: '#ffd0d6', glow: '#ffd23f' },
    { id: 'galaxy', name: 'Galaxy', main: '#8c5cff', accent: '#ff9ff3', glow: '#ff9ff3' },
    { id: 'arctic', name: 'Arctic', main: '#e7eef8', accent: '#5fd3ff', glow: '#5fd3ff' },
    { id: 'shadow', name: 'Shadow', main: '#3b405c', accent: '#ff5fb2', glow: '#ff5fb2' },
    { id: 'gold', name: 'Gold', main: '#ffc531', accent: '#fff3b0', glow: '#ff7a3d' }
  ];
  const METAL = '#8a93b0', DARK = '#3a3f5a', GLASS = '#1c2244';

  function leg(c, x, L, P, flame) {
    const knee = -0.8 - L * 0.5, ankle = -0.26 - L, foot = -L;
    rr(c, x - 0.24, -1.44, 0.48, knee + 0.12 + 1.44, 0.12); fs(c, METAL);
    poly(c, [x - 0.31, knee, x + 0.31, knee, x + 0.36, ankle, x - 0.36, ankle]); fs(c, P.main);
    poly(c, [x - 0.31, knee, x - 0.12, knee, x - 0.16, ankle, x - 0.36, ankle]); fl(c, lit(P.main, 0.28));
    circle(c, x, knee, 0.2); fs(c, DARK);
    circle(c, x - 0.05, knee - 0.05, 0.07); fl(c, '#ffffff', 0.35);
    poly(c, [x - 0.42, ankle + 0.03, x + 0.42, ankle + 0.03, x + 0.5, foot, x - 0.5, foot]); fs(c, DARK);
    rr(c, x - 0.3, foot - 0.12, 0.6, 0.06, 0.03); fl(c, P.accent);
    if (flame) {
      glow(c, x, foot + 0.15, 0.7, '#ffb347', 0.9);
      poly(c, [x - 0.22, foot, x + 0.22, foot, x, foot + 0.55 + Math.random() * 0.25]); fl(c, '#ffe08a', 0.9);
    }
  }
  // the arm cannon changes with the weapon
  function cannon(c, s, rec, w, M, P, t) {
    const x = s * 1.34, y0 = -1.98 + rec, top = -2.66 + rec;
    rr(c, x - 0.27, -2.12 + rec * 0.5, 0.54, 0.6, 0.13); fs(c, P.main);
    poly(c, [x - 0.27, -2.12 + rec * 0.5, x - 0.1, -2.12 + rec * 0.5, x - 0.12, -1.52 + rec * 0.5, x - 0.27, -1.52 + rec * 0.5]); fl(c, lit(P.main, 0.25));
    if (w === 'gatling') {
      const spin = M.holding ? t * 30 : 0;
      for (let i = 0; i < 3; i++) {
        const a = spin + i * TAU / 3, ox = Math.cos(a) * 0.1;
        rr(c, x + ox - 0.05, top, 0.1, y0 - top, 0.04); fs(c, i === 0 ? '#c9d1e8' : METAL, 0.7);
      }
      ell(c, x, top, 0.19, 0.07); fs(c, DARK);
      if (M.heat > 0.4) glow(c, x, top + 0.2, 0.45, '#ff6a2a', M.heat - 0.3);
    } else if (w === 'rockets') {
      rr(c, x - 0.24, top - 0.05, 0.48, y0 - top + 0.1, 0.06); fs(c, '#5a6380');
      for (let i = 0; i < 4; i++) { circle(c, x - 0.1 + (i % 2) * 0.2, top + 0.12 + (i >> 1) * 0.2, 0.065); fs(c, '#1d2140', 0.6); }
    } else if (w === 'lightning') {
      rr(c, x - 0.1, top + 0.1, 0.2, y0 - top - 0.1, 0.05); fs(c, METAL);
      for (let i = 0; i < 3; i++) { ell(c, x, top + 0.25 + i * 0.15, 0.2, 0.06); fs(c, '#d7a648', 0.6); }
      poly(c, [x - 0.18, top + 0.12, x - 0.06, top - 0.12, x, top + 0.05, x + 0.06, top - 0.12, x + 0.18, top + 0.12]); fs(c, '#c7d0e8', 0.7);
      glow(c, x, top, 0.35 + Math.random() * 0.15, '#8fd8ff', 0.7);
    } else if (w === 'plasma') {
      rr(c, x - 0.13, top + 0.15, 0.26, y0 - top - 0.15, 0.05); fs(c, METAL);
      ell(c, x, top + 0.1, 0.24, 0.2); fs(c, '#2c6b54');
      const f = M.charge / 1.1;
      ell(c, x, top + 0.1, 0.15, 0.12); fl(c, mix('#5dffb1', '#ffffff', f * 0.6));
      glow(c, x, top + 0.1, 0.3 + f * 0.7, '#5dffb1', 0.5 + f * 0.5);
    } else if (w === 'freeze') {
      rr(c, x - 0.12, top + 0.12, 0.24, y0 - top - 0.12, 0.05); fs(c, '#b8d8f0');
      poly(c, [x - 0.16, top + 0.15, x, top - 0.22, x + 0.16, top + 0.15]); fs(c, '#a6ecff', 0.7);
      glow(c, x, top, 0.32, '#a6ecff', 0.6);
    } else if (w === 'laser') {
      rr(c, x - 0.08, top - 0.15, 0.16, y0 - top + 0.15, 0.04); fs(c, '#d0d6ea');
      rr(c, x - 0.14, -2.0 + rec, 0.28, 0.22, 0.06); fs(c, METAL);
      circle(c, x, top - 0.15, 0.08); fl(c, '#ff4f6d');
      glow(c, x, top - 0.15, 0.3, '#ff4f6d', 0.7);
    } else {
      poly(c, [x - 0.15, y0, x + 0.15, y0, x + 0.11, top, x - 0.11, top]); fs(c, DARK);
      ell(c, x, top, 0.14, 0.06); fs(c, '#1d2140');
      glow(c, x, top, 0.22, P.glow, 0.55);
    }
  }
  // M: the engine's mech; P: a paint; w: the weapon in hand
  function mech(c, M, t, P, w) {
    const ph = M.walk * 0.82, air = M.air;
    const lL = air ? 0.36 : Math.max(0, Math.sin(ph)) * 0.32, lR = air ? 0.36 : Math.max(0, -Math.sin(ph)) * 0.32;
    const bob = air ? 0 : -Math.abs(Math.cos(ph)) * 0.05 + (M.land > 0 ? M.land * 0.6 : 0);
    const rec = (M.recoil || 0) * 1.4;
    if (M.power > 0) glow(c, 0, -1.7, 2.6, '#ff7a3d', 0.35 + Math.sin(t * 10) * 0.1);
    leg(c, -0.56, lL, P, air && M.vy > -2);
    leg(c, 0.56, lR, P, air && M.vy > -2);
    c.save(); c.translate(0, bob);
    // backpack thrusters
    for (const s of [-1, 1]) {
      rr(c, s * 0.52 - 0.21, -2.0, 0.42, 0.52, 0.1); fs(c, METAL);
      ell(c, s * 0.52, -1.46, 0.18, 0.08); fs(c, '#232842');
      if (air) { glow(c, s * 0.52, -1.25, 0.8, '#ffb347', 0.95); poly(c, [s * 0.52 - 0.15, -1.46, s * 0.52 + 0.15, -1.46, s * 0.52, -0.75 - Math.random() * 0.3]); fl(c, '#fff0b0', 0.95); }
    }
    rr(c, -0.8, -1.66, 1.6, 0.44, 0.15); fs(c, DARK);
    // torso
    poly(c, [-1.06, -2.96, 1.06, -2.96, 1.14, -2.46, 0.82, -1.56, -0.82, -1.56, -1.14, -2.46]); fs(c, P.main);
    poly(c, [-1.06, -2.96, -0.45, -2.96, -0.5, -2.46, -0.62, -1.56, -0.82, -1.56, -1.14, -2.46]); fl(c, lit(P.main, 0.22));
    poly(c, [-0.68, -2.8, 0.68, -2.8, 0.73, -2.42, 0.52, -1.76, -0.52, -1.76, -0.73, -2.42]); fs(c, lit(P.main, -0.22), 0.8);
    // the reactor
    const core = M.power > 0 ? '#ffb347' : M.hurt > 0 ? '#ff5a6a' : P.glow;
    circle(c, 0, -2.26, 0.31); fs(c, '#1b1f3c');
    glow(c, 0, -2.26, 0.75, core, 0.75 + Math.sin(t * 6) * 0.15);
    circle(c, 0, -2.26, 0.19); fl(c, mix(core, '#ffffff', 0.45));
    c.save(); c.translate(0, -2.26); c.rotate(t * 4);
    for (let i = 0; i < 3; i++) { c.rotate(TAU / 3); poly(c, [0, 0, 0.05, -0.17, -0.05, -0.17]); fl(c, '#1b1f3c', 0.65); }
    c.restore();
    for (let i = 0; i < 3; i++) { rr(c, -0.36, -1.98 + i * 0.09, 0.72, 0.045, 0.02); fl(c, '#1b1f3c', 0.8); }
    // shoulders
    for (const s of [-1, 1]) {
      const sx = s > 0 ? 0.8 : -1.62;
      rr(c, sx, -3.16, 0.82, 0.64, 0.18); fs(c, P.main);
      rr(c, sx + 0.06, -3.1, 0.7, 0.16, 0.08); fl(c, lit(P.main, 0.3));
      rr(c, sx + 0.08, -2.72, 0.66, 0.1, 0.05); fl(c, P.accent);
      for (let i = 0; i < 4; i++) { rr(c, sx + 0.14 + (i % 2) * 0.3, -3.04 + (i >> 1) * 0.15, 0.22, 0.11, 0.03); fl(c, '#1b1f3c', 0.55); }
    }
    // arms and cannons
    for (const s of [-1, 1]) {
      rr(c, s * 1.3 - 0.2, -2.6, 0.4, 0.6, 0.1); fs(c, METAL);
      cannon(c, s, rec * (s === M.side ? 1 : 0.4), w, M, P, t);
    }
    // cockpit
    rr(c, -0.44, -3.36, 0.88, 0.52, 0.22); fs(c, lit(P.main, -0.12));
    rr(c, -0.3, -3.24, 0.6, 0.17, 0.08); fl(c, GLASS);
    rr(c, -0.24, -3.22, 0.22, 0.05, 0.02); fl(c, '#ffffff', 0.4);
    line(c, 0.28, -3.3, 0.36, -3.72, DARK, 0.05);
    circle(c, 0.36, -3.74, 0.06); fl(c, (t * 2) % 1 < 0.5 ? '#ff5a6a' : '#7a2a3a');
    c.restore();
    if (M.shield > 0) {
      const a = M.shield < 1.5 ? ((t * 8) % 1 < 0.5 ? 0.25 : 0.55) : 0.5;
      ell(c, 0, -1.75, 2.0, 2.15); c.fillStyle = 'rgba(110,220,255,' + (a * 0.35) + ')'; c.fill();
      c.lineWidth = 0.06; c.strokeStyle = 'rgba(160,240,255,' + a + ')'; c.stroke();
      c.save(); ell(c, 0, -1.75, 2.0, 2.15); c.clip();
      c.strokeStyle = 'rgba(190,250,255,' + (a * 0.6) + ')'; c.lineWidth = 0.025;
      for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * 0.5 + Math.sin(t) * 0.1, -4); c.lineTo(i * 0.5 + 0.6, 0.5); c.stroke(); }
      c.restore();
    }
  }

  /* ================= enemies, facing the player ================= */
  // e: the engine's enemy; t: time; warn: 0..1 how close it is to firing (a glow grows)
  function drone(c, e, t) {
    const warn = e.st === 'hold' && e.cd < e.tel ? 1 - e.cd / e.tel : 0;
    c.translate(0, Math.sin(t * 3 + (e.ph || 0)) * 0.1);
    for (const s of [-1, 1]) {
      line(c, s * 0.4, -0.85, s * 0.92, -1.12, DARK, 0.12);
      ell(c, s * 0.92, -1.16, 0.5, 0.07, Math.sin(t * 40 + s) * 0.08); fl(c, '#dfe6f5', 0.55);
      circle(c, s * 0.92, -1.15, 0.07); fs(c, DARK, 0.6);
    }
    circle(c, 0, -0.62, 0.62); fs(c, '#ffc928');
    c.save(); circle(c, 0, -0.62, 0.62); c.clip();
    for (const y of [-0.98, -0.3]) { c.fillStyle = C('#2d2a3a'); c.fillRect(-0.7, y - 0.07, 1.4, 0.14); }
    circle(c, -0.22, -0.92, 0.22); fl(c, '#ffffff', 0.3);
    c.restore();
    circle(c, 0, -0.62, 0.62); c.lineWidth = LW; c.strokeStyle = OUT; c.stroke();
    circle(c, 0, -0.6, 0.33); fs(c, '#ffffff');
    circle(c, 0, -0.58, 0.19); fl(c, warn ? mix('#ff3d5a', '#ffe6a0', warn * 0.4) : '#2b2f4a');
    circle(c, -0.06, -0.65, 0.06); fl(c, '#ffffff');
    if (warn) glow(c, 0, -0.58, 0.4 + warn * 0.7, '#ff3d5a', 0.5 + warn * 0.5);
    line(c, 0, -1.22, 0, -1.45, DARK, 0.05); circle(c, 0, -1.48, 0.06); fl(c, '#ff5a6a');
  }
  function walker(c, e, t) {
    const warn = e.cd < e.tel && e.z < 72 && e.z > 16 ? 1 - e.cd / e.tel : 0, ph = t * 7 + (e.ph || 0);
    for (const s of [-1, 1]) {
      const lift = Math.max(0, Math.sin(ph + (s > 0 ? Math.PI : 0))) * 0.2;
      rr(c, s * 0.38 - 0.16, -1.05 - lift, 0.32, 0.7, 0.08); fs(c, '#5d6680');
      rr(c, s * 0.38 - 0.26, -0.3 - lift, 0.52, 0.3, 0.08); fs(c, '#363b52');
    }
    rr(c, -0.78, -2.15, 1.56, 1.2, 0.22); fs(c, '#33b8a6');
    rr(c, -0.78, -2.15, 0.5, 1.2, 0.2); fl(c, lit('#33b8a6', 0.25));
    rr(c, -0.55, -1.95, 1.1, 0.36, 0.14); fs(c, '#1d2140');
    rr(c, -0.42, -1.86, 0.84, 0.16, 0.06); fl(c, warn ? '#ff4d4d' : '#ff9f43');
    glow(c, 0, -1.78, 0.5 + warn * 0.7, warn ? '#ff3d3d' : '#ff9f43', 0.45 + warn * 0.5);
    rr(c, -0.5, -1.4, 1.0, 0.22, 0.08); fl(c, '#1d2140', 0.5);
    // gun arm
    rr(c, 0.72, -1.75, 0.34, 0.62, 0.1); fs(c, '#5d6680');
    circle(c, 0.89, -1.82, 0.16); fs(c, '#1d2140');
    if (warn) glow(c, 0.89, -1.82, 0.3 + warn * 0.5, '#ff3d3d', warn);
    line(c, -0.4, -2.15, -0.5, -2.45, DARK, 0.05); circle(c, -0.5, -2.48, 0.06); fl(c, '#ffd23f');
  }
  function turret(c, e, t) {
    const warn = e.burst > 0 ? 1 : e.cd < e.tel && e.z > 18 && e.z < 80 ? 1 - e.cd / e.tel : 0;
    rr(c, -1.0, -0.9, 2.0, 0.9, 0.12); fs(c, '#4a4f6b');
    for (let i = 0; i < 5; i++) { poly(c, [-0.95 + i * 0.4, -0.05, -0.75 + i * 0.4, -0.05, -0.55 + i * 0.4, -0.75, -0.75 + i * 0.4, -0.75]); fl(c, '#ffcc3d', 0.85); }
    ell(c, 0, -0.9, 1.0, 0.22); fs(c, '#5d6380');
    ell(c, 0, -1.55, 0.95, 0.75); fs(c, '#c0485a');
    ell(c, -0.3, -1.85, 0.35, 0.2); fl(c, '#ffffff', 0.3);
    for (const s of [-1, 1]) {
      circle(c, s * 0.38, -1.45, 0.24); fs(c, '#2a2e45');
      circle(c, s * 0.38, -1.45, 0.13); fl(c, warn ? '#ff3d3d' : '#0d0f1c');
      if (warn) glow(c, s * 0.38, -1.45, 0.25 + warn * 0.6, '#ff3d3d', warn);
    }
    circle(c, 0, -2.0, 0.1); fl(c, (t * 3) % 1 < 0.5 ? '#ff3d3d' : '#5a1a22');
  }
  function bike(c, e, t) {
    const lean = e.blink > 0 ? (e.nl > e.tl ? 0.18 : -0.18) : (laneDir(e) * 0.12);
    c.rotate(lean);
    glow(c, 0, -0.2, 1.3, '#62f2ff', 0.55);
    ell(c, 0, -0.25, 1.0, 0.18); fl(c, '#62f2ff', 0.45);
    // rider
    rr(c, -0.36, -2.0, 0.72, 0.62, 0.22); fs(c, '#4a4f6b');
    rr(c, -0.26, -1.86, 0.52, 0.16, 0.07); fl(c, '#ffd23f');
    // fairing
    poly(c, [-0.95, -0.5, 0.95, -0.5, 0.7, -1.45, -0.7, -1.45]); fs(c, '#ff5a6a');
    poly(c, [-0.95, -0.5, -0.4, -0.5, -0.3, -1.45, -0.7, -1.45]); fl(c, lit('#ff5a6a', 0.25));
    rr(c, -0.5, -1.62, 1.0, 0.22, 0.08); fs(c, '#2a2e45');
    line(c, -0.9, -1.55, 0.9, -1.55, DARK, 0.09);
    circle(c, 0, -0.95, 0.24); fs(c, '#fff6c7');
    glow(c, 0, -0.95, 1.0, '#fff6c7', 0.8);
    if (e.blink > 0 && (t * 10) % 1 < 0.5) { const s = e.nl > e.tl ? 1 : -1; circle(c, s * 0.82, -0.75, 0.12); fl(c, '#ffb347'); glow(c, s * 0.82, -0.75, 0.5, '#ffb347', 1); }
  }
  function laneDir(e) { return 0; }
  function shieldBot(c, e, t) {
    const open = !e.shieldUp, warn = open && e.cd > 0 && e.cd < 0.6 ? 1 - e.cd / 0.6 : 0;
    for (const s of [-1, 1]) { rr(c, s * 0.42 - 0.2, -1.0, 0.4, 0.75, 0.08); fs(c, '#5d6680'); rr(c, s * 0.42 - 0.3, -0.3, 0.6, 0.3, 0.08); fs(c, '#363b52'); }
    rr(c, -0.9, -2.35, 1.8, 1.4, 0.24); fs(c, '#7b5cd6');
    rr(c, -0.9, -2.35, 0.55, 1.4, 0.22); fl(c, lit('#7b5cd6', 0.25));
    rr(c, -0.55, -2.15, 1.1, 0.34, 0.14); fs(c, '#1d2140');
    circle(c, 0, -1.98, 0.12); fl(c, '#ff5ad1');
    glow(c, 0, -1.98, 0.4, '#ff5ad1', 0.7);
    rr(c, -0.35, -1.55, 0.7, 0.42, 0.12); fs(c, '#2a2e45');
    circle(c, 0, -1.34, 0.15); fl(c, warn ? '#ffffff' : '#ff5ad1');
    if (warn) glow(c, 0, -1.34, 0.4 + warn * 0.9, '#ff5ad1', warn);
    if (!e.broken) {
      const up = e.shieldUp ? 1 : 0, flick = !e.shieldUp ? 0.15 : (e.sc < 0.5 && (t * 12) % 1 < 0.5 ? 0.5 : 1);
      if (up || flick > 0.1) {
        c.save(); c.globalAlpha *= flick;
        poly(c, hexPts(0, -1.45, 1.35, 1.5)); c.fillStyle = 'rgba(110,200,255,0.32)'; c.fill();
        c.lineWidth = 0.07; c.strokeStyle = 'rgba(170,235,255,0.95)'; c.stroke();
        c.strokeStyle = 'rgba(170,235,255,0.35)'; c.lineWidth = 0.03;
        poly(c, hexPts(0, -1.45, 0.8, 0.9)); c.stroke();
        c.restore();
      }
    }
  }
  function hexPts(cx, cy, rx, ry) { const p = []; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; p.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); } return p; }
  function bomber(c, e, t) {
    c.rotate((e.drift || 0) * 0.12);
    poly(c, [-2.6, -0.2, -0.6, -0.55, 0.6, -0.55, 2.6, -0.2, 2.2, 0.15, -2.2, 0.15]); fs(c, '#5a6488');
    poly(c, [-2.6, -0.2, -0.6, -0.55, -0.5, -0.3, -2.2, 0.15]); fl(c, lit('#5a6488', 0.25));
    for (const s of [-1, 1]) {
      rr(c, s * 1.45 - 0.36, -0.45, 0.72, 0.6, 0.25); fs(c, '#3a4060');
      circle(c, s * 1.45, -0.15, 0.22); fl(c, '#ff9f43');
      glow(c, s * 1.45, -0.15, 0.7, '#ff9f43', 0.8);
      circle(c, s * 2.45, -0.15, 0.08); fl(c, (t * 3) % 1 < 0.5 ? (s < 0 ? '#ff4d4d' : '#4dff88') : '#2a2e45');
    }
    ell(c, 0, -0.55, 0.75, 0.5); fs(c, '#d84a5c');
    ell(c, 0, -0.68, 0.45, 0.25); fl(c, '#1c2244');
    ell(c, -0.12, -0.74, 0.16, 0.07); fl(c, '#ffffff', 0.45);
    rr(c, -0.42, -0.05, 0.84, 0.3, 0.08); fs(c, '#2a2e45');
    for (let i = 0; i < 3; i++) { circle(c, -0.26 + i * 0.26, 0.1, 0.07); fl(c, '#ffcc3d'); }
  }
  function spider(c, e, t) {
    const hop = e.hz > 0 ? Math.sin((1 - e.hz / 0.4) * Math.PI) * 0.6 : 0, warn = e.cd < e.tel && e.z > 18 && e.z < 70 ? 1 - e.cd / e.tel : 0;
    c.translate(0, -hop);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const k = Math.sin(t * 9 + i * 2 + s) * 0.12;
      const hx = s * (0.55 + i * 0.12), kx = s * (1.0 + i * 0.28), ky = -1.35 + i * 0.12 + k, fx = s * (1.15 + i * 0.35), fy = 0 + hop * 0.6;
      c.beginPath(); c.moveTo(hx, -0.85); c.lineTo(kx, ky); c.lineTo(fx, fy);
      c.strokeStyle = OUT; c.lineWidth = 0.2; c.stroke(); c.strokeStyle = C('#4a5070'); c.lineWidth = 0.12; c.stroke();
      circle(c, kx, ky, 0.09); fs(c, '#2a2e45', 0.6);
    }
    ell(c, 0, -0.9, 0.95, 0.55); fs(c, '#2e3350');
    ell(c, -0.3, -1.12, 0.35, 0.15); fl(c, '#ffffff', 0.18);
    for (let i = 0; i < 4; i++) { circle(c, -0.33 + i * 0.22, -0.9 + (i % 2) * 0.1, 0.09 + (i === 1 || i === 2 ? 0.03 : 0)); fl(c, warn ? '#ffe08a' : '#ff3d5a'); }
    glow(c, 0, -0.9, 0.6 + warn * 0.9, '#ff3d5a', 0.6 + warn * 0.4);
    if (warn) glow(c, 0, -0.3, 1.4 * warn, '#ff9f43', warn);
  }
  function sentinel(c, e, t) {
    const warn = e.cd < 1.3 && e.z > 22 && e.z < 88 ? 1 - Math.max(0, e.cd) / 1.3 : 0;
    poly(c, [-0.95, 0, 0.95, 0, 0.7, -0.4, -0.7, -0.4]); fs(c, '#3a3f5a');
    poly(c, [-0.5, -0.4, 0.5, -0.4, 0.3, -4.1, -0.3, -4.1]); fs(c, '#5a6488');
    poly(c, [-0.5, -0.4, -0.15, -0.4, -0.08, -4.1, -0.3, -4.1]); fl(c, lit('#5a6488', 0.25));
    for (let i = 0; i < 5; i++) { rr(c, -0.38 + i * 0.02, -0.9 - i * 0.65, 0.76 - i * 0.04, 0.08, 0.03); fl(c, '#62f2ff', 0.7); }
    c.save(); c.translate(0, -4.6);
    ell(c, 0, 0, 0.95, 0.95); fs(c, '#2a2e45');
    c.rotate(t * (1 + warn * 4));
    for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); rr(c, 0.55, -0.12, 0.32, 0.24, 0.06); fs(c, '#8a93b0', 0.7); }
    c.restore();
    circle(c, 0, -4.6, 0.42); fs(c, '#ffffff');
    circle(c, 0, -4.6, 0.26); fl(c, warn ? mix('#ff3d3d', '#ffffff', warn * 0.5) : '#d43b5a');
    glow(c, 0, -4.6, 0.6 + warn * 1.4, '#ff3d3d', 0.5 + warn * 0.5);
  }
  function rival(c, e, t) {
    const ph = t * 6 + (e.ph || 0), warn = e.cd < 0.5 ? 1 - Math.max(0, e.cd) / 0.5 : 0;
    for (const s of [-1, 1]) {
      const L = Math.max(0, Math.sin(ph + (s > 0 ? Math.PI : 0))) * 0.25;
      rr(c, s * 0.55 - 0.24, -1.45 - L * 0.3, 0.48, 0.7, 0.1); fs(c, '#4a4f6b');
      poly(c, [s * 0.55 - 0.32, -0.8 - L, s * 0.55 + 0.32, -0.8 - L, s * 0.55 + 0.38, -0.25 - L, s * 0.55 - 0.38, -0.25 - L]); fs(c, '#a32638');
      circle(c, s * 0.55, -0.8 - L, 0.2); fs(c, '#2a2e45');
      poly(c, [s * 0.55 - 0.45, -0.25 - L, s * 0.55 + 0.45, -0.25 - L, s * 0.55 + 0.5, -L, s * 0.55 - 0.5, -L]); fs(c, '#2a2e45');
    }
    poly(c, [-1.1, -3.0, 1.1, -3.0, 1.18, -2.45, 0.85, -1.55, -0.85, -1.55, -1.18, -2.45]); fs(c, '#a32638');
    poly(c, [-1.1, -3.0, -0.5, -3.0, -0.55, -2.45, -0.65, -1.55, -0.85, -1.55, -1.18, -2.45]); fl(c, lit('#a32638', 0.2));
    rr(c, -0.6, -2.7, 1.2, 0.5, 0.12); fs(c, '#1b1f3c');
    for (const s of [-1, 1]) { poly(c, [s * 0.12, -2.5, s * 0.48, -2.6, s * 0.46, -2.42, s * 0.12, -2.38]); fl(c, '#ff3d3d'); }
    glow(c, 0, -2.48, 0.8, '#ff3d3d', 0.7);
    for (const s of [-1, 1]) {
      const sx = s > 0 ? 0.82 : -1.66;
      rr(c, sx, -3.2, 0.84, 0.66, 0.16); fs(c, '#2e3350');
      for (let i = 0; i < 4; i++) { circle(c, sx + 0.24 + (i % 2) * 0.36, -3.02 + (i >> 1) * 0.28, 0.1); fl(c, '#ff9f43', 0.8); }
      rr(c, s * 1.38 - 0.28, -2.4, 0.56, 0.75, 0.12); fs(c, '#4a4f6b');
      circle(c, s * 1.38, -2.0, 0.22); fs(c, '#1b1f3c');
      if (warn) glow(c, s * 1.38, -2.0, 0.3 + warn * 0.6, '#ff3d3d', warn);
    }
  }
  function carrier(c, e, t) {
    const bay = e.scd < 0.8 ? 1 - e.scd / 0.8 : 0;
    poly(c, [-3.8, -1.2, -2.6, -2.6, 2.6, -2.6, 3.8, -1.2, 3.0, 0.1, -3.0, 0.1]); fs(c, '#4a5478');
    poly(c, [-3.8, -1.2, -2.6, -2.6, -1.6, -2.6, -2.2, -1.1, -3.0, 0.1]); fl(c, lit('#4a5478', 0.22));
    poly(c, [-1.6, -2.95, 1.6, -2.95, 1.9, -2.55, -1.9, -2.55]); fs(c, '#363d5c');
    rr(c, -0.7, -3.4, 1.4, 0.5, 0.15); fs(c, '#2a2e45');
    rr(c, -0.5, -3.3, 1.0, 0.18, 0.06); fl(c, '#62f2ff');
    // hangar bay
    rr(c, -1.3, -1.7, 2.6, 1.3, 0.2); fs(c, '#141832');
    glow(c, 0, -1.05, 1.6 + bay, '#ffcc3d', 0.35 + bay * 0.6);
    for (let i = 0; i < 4; i++) { rr(c, -1.1 + i * 0.58, -1.55, 0.42, 0.1, 0.03); fl(c, '#ffcc3d', 0.6); }
    for (const s of [-1, 1]) {
      circle(c, s * 2.6, -1.4, 0.4); fs(c, '#2a2e45');
      circle(c, s * 2.6, -1.4, 0.18); fl(c, '#ff5a6a');
      glow(c, s * 2.6, -1.4, 0.6, '#ff5a6a', 0.6);
      glow(c, s * 3.2, -0.1, 0.9, '#62f2ff', 0.6);
      circle(c, s * 3.6, -1.25, 0.09); fl(c, (t * 2 + s) % 1 < 0.5 ? '#ffffff' : '#3a4060');
    }
  }
  function missile(c, e, t) {
    glow(c, 0, -0.3, 0.9, '#ff7a3d', 0.7);
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + t * 3; poly(c, [Math.cos(a) * 0.2, -0.3 + Math.sin(a) * 0.2, Math.cos(a) * 0.55, -0.3 + Math.sin(a) * 0.55, Math.cos(a + 0.4) * 0.3, -0.3 + Math.sin(a + 0.4) * 0.3]); fs(c, '#5a6488', 0.6); }
    circle(c, 0, -0.3, 0.3); fs(c, '#e8ecf5');
    circle(c, 0, -0.3, 0.14); fl(c, (t * 6) % 1 < 0.5 ? '#ff3d3d' : '#ffb3b3');
  }

  /* ================= small obstacles and pickups ================= */
  function mine(c, e, t) {
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; line(c, Math.cos(a) * 0.4, -0.2 + Math.sin(a) * 0.12, Math.cos(a) * 0.62, -0.22 + Math.sin(a) * 0.18, '#3a3f5a', 0.08); }
    ell(c, 0, -0.18, 0.5, 0.2); fs(c, '#4a4f6b');
    ell(c, 0, -0.28, 0.32, 0.14); fs(c, '#5d6680');
    const on = Math.sin(e.ph || t * 5) > 0;
    circle(c, 0, -0.36, 0.09); fl(c, on ? '#ff3d3d' : '#5a1a22');
    if (on) glow(c, 0, -0.36, 0.6, '#ff3d3d', 0.9);
  }
  function boulder(c, e, t, style) {
    const R = 1.05, col = style === 'snow' ? '#eef6ff' : style === 'lava' ? '#4a2a22' : '#b07a4a';
    circle(c, 0, -R, R); fs(c, col);
    c.save(); circle(c, 0, -R, R); c.clip();
    c.translate(0, -R); c.rotate(-(e.roll || 0) / R);
    for (let i = 0; i < 5; i++) { const a = i * 1.7, r = 0.18 + (i % 3) * 0.07; circle(c, Math.cos(a) * 0.55, Math.sin(a) * 0.55, r); fl(c, style === 'snow' ? '#c9dff2' : style === 'lava' ? '#ff6a2a' : lit(col, -0.25)); }
    c.restore();
    ell(c, -0.35, -R - 0.4, 0.3, 0.18); fl(c, '#ffffff', 0.3);
  }
  const PICK = { repair: ['#4dd68a', '🔧'], shield: ['#5fd3ff', '🛡️'], power: ['#ff7a3d', '⚡'], nova: ['#c18cff', '💥'], gem: ['#ffd23f', '💎'] };
  function pick(c, e, t) {
    const P = PICK[e.p] || PICK.gem, b = Math.sin(t * 3 + e.id) * 0.15;
    glow(c, 0, -1.2 + b, 1.4, P[0], 0.8);
    c.save(); c.translate(0, -1.2 + b); c.rotate(Math.sin(t * 2 + e.id) * 0.2);
    poly(c, hexPts(0, 0, 0.62, 0.62)); fs(c, mix(P[0], '#ffffff', 0.25));
    poly(c, hexPts(0, 0, 0.45, 0.45)); fl(c, '#ffffff', 0.55);
    c.font = '0.62px ' + 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(P[1], 0, 0.04);
    c.restore();
  }

  return { dbg, OUT, PAINTS, METAL, DARK, mix, rgba, lit, C, begin, setMode, poly, rr, circle, ell, fs, fl, line, glow, glowSprite, hexPts,
    mech, drone, walker, turret, bike, shield: shieldBot, bomber, spider, sentinel, rival, carrier, missile, mine, boulder, pick, PICK };
})();
