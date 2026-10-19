/* games/mech/src/art2.js — Mech Blaster's pictures, part 2: the five worlds (sky, far scenery, weather, roadside
   props, tall obstacles, gate colours), the five bosses and their question shields, and the weapon icons.
   Needs ART (part 1) and MR.WORLDS. */
const ART2 = (function () {
  'use strict';
  const TAU = Math.PI * 2;
  const A = ART;
  function seeded(seed) { let a = seed % 2147483647; if (a <= 0) a += 2147483646; return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; }; }
  function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

  /* ================= skies and far scenery ================= */
  const layerMemo = new Map();
  const LW = 2048, LH = 512;
  function paintLayer(wi, n) {
    const c = canvas(LW, LH), g = c.getContext('2d'), r = seeded(1000 + wi * 31 + n * 7);
    // draw everything twice, shifted by the width, so the strip tiles without a seam
    const twice = (fn) => { for (const off of [0, -LW, LW]) { g.save(); g.translate(off, 0); fn(); g.restore(); } };
    if (wi === 0) {
      const bld = [];
      for (let x = 0; x < LW;) { const w = 40 + r() * (n ? 120 : 80), h = (n ? 170 : 110) + r() * (n ? 290 : 250); bld.push([x, w, h, r()]); x += w + r() * 10; }
      twice(() => {
        for (const [x, w, h, q] of bld) {
          g.fillStyle = n ? '#170c33' : '#2a1652'; g.fillRect(x, LH - h, w, h);
          g.fillStyle = n ? 'rgba(255,120,220,0.5)' : 'rgba(127,246,255,0.35)';
          for (let wy = LH - h + 12; wy < LH - 10; wy += 16) for (let wx = x + 6; wx < x + w - 8; wx += 12) if (hash(wx * 3.1 + wy * 7.7 + q) < 0.38) g.fillRect(wx, wy, 5, 7);
          if (q < 0.3) { g.fillStyle = '#3a1c66'; g.fillRect(x + w / 2 - 2, LH - h - 40, 4, 40); g.fillStyle = '#ff3d5a'; g.fillRect(x + w / 2 - 3, LH - h - 44, 6, 6); }
          if (n && q > 0.55) {
            const col = ['#ff4fd8', '#5ff3ff', '#ffd23f', '#7dff9a'][Math.floor(q * 40) % 4];
            g.shadowColor = col; g.shadowBlur = 18; g.fillStyle = col; g.fillRect(x + 8, LH - h + 20, w - 16, 10); g.shadowBlur = 0;
          }
        }
      });
    } else if (wi === 1) {
      twice(() => {
        if (!n) {
          for (let i = 0; i < 7; i++) {
            const x = i * LW / 7 + r() * 120, w = 160 + r() * 200, h = 120 + r() * 160;
            g.fillStyle = '#eaa070'; g.beginPath(); g.moveTo(x, LH); g.lineTo(x + w * 0.12, LH - h); g.lineTo(x + w * 0.88, LH - h); g.lineTo(x + w, LH); g.fill();
            g.fillStyle = '#f6bf8e'; g.fillRect(x + w * 0.12, LH - h, w * 0.76, 10);
            g.fillStyle = 'rgba(160,80,40,0.25)'; g.fillRect(x + w * 0.12, LH - h + h * 0.45, w * 0.76, 8);
          }
        } else {
          g.fillStyle = '#e6a660'; g.beginPath(); g.moveTo(0, LH);
          for (let x = 0; x <= LW; x += 16) g.lineTo(x, LH - 70 - Math.sin(x / LW * TAU * 3) * 40 - Math.sin(x / LW * TAU * 7 + 1) * 18);
          g.lineTo(LW, LH); g.fill();
          g.fillStyle = 'rgba(255,240,200,0.35)'; g.beginPath(); g.moveTo(0, LH);
          for (let x = 0; x <= LW; x += 16) g.lineTo(x, LH - 64 - Math.sin(x / LW * TAU * 3) * 40 - Math.sin(x / LW * TAU * 7 + 1) * 18);
          g.lineTo(LW, LH - 40); g.lineTo(0, LH - 40); g.fill();
        }
      });
    } else if (wi === 2) {
      twice(() => {
        if (!n) {
          for (let i = 0; i < 9; i++) {
            const x = i * LW / 9 + r() * 80, w = 260 + r() * 220, h = 220 + r() * 230;
            g.fillStyle = '#8fb3d9'; g.beginPath(); g.moveTo(x, LH); g.lineTo(x + w * 0.5, LH - h); g.lineTo(x + w, LH); g.fill();
            g.fillStyle = '#6f93bd'; g.beginPath(); g.moveTo(x + w * 0.5, LH - h); g.lineTo(x + w, LH); g.lineTo(x + w * 0.62, LH); g.fill();
            g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x + w * 0.5, LH - h); g.lineTo(x + w * 0.68, LH - h * 0.62); g.lineTo(x + w * 0.58, LH - h * 0.66); g.lineTo(x + w * 0.5, LH - h * 0.58); g.lineTo(x + w * 0.42, LH - h * 0.66); g.lineTo(x + w * 0.33, LH - h * 0.62); g.fill();
          }
        } else {
          g.fillStyle = '#e4f1fc'; g.beginPath(); g.moveTo(0, LH);
          for (let x = 0; x <= LW; x += 16) g.lineTo(x, LH - 90 - Math.sin(x / LW * TAU * 4) * 35);
          g.lineTo(LW, LH); g.fill();
          for (let i = 0; i < 46; i++) {
            const x = r() * LW, h = 50 + r() * 70, y = LH - 70 - Math.sin(x / LW * TAU * 4) * 35;
            g.fillStyle = '#4c6f8f'; g.beginPath(); g.moveTo(x - h * 0.28, y + 8); g.lineTo(x, y - h); g.lineTo(x + h * 0.28, y + 8); g.fill();
            g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x - h * 0.12, y - h * 0.55); g.lineTo(x, y - h); g.lineTo(x + h * 0.12, y - h * 0.55); g.fill();
          }
        }
      });
    } else if (wi === 3) {
      twice(() => {
        if (!n) {
          const x = LW * 0.3, w = 900, h = 420;
          g.fillStyle = '#3a1510'; g.beginPath(); g.moveTo(x, LH); g.lineTo(x + w * 0.4, LH - h); g.lineTo(x + w * 0.6, LH - h); g.lineTo(x + w, LH); g.fill();
          const gr = g.createLinearGradient(0, LH - h, 0, LH);
          gr.addColorStop(0, 'rgba(255,140,40,0.95)'); gr.addColorStop(1, 'rgba(255,60,20,0)');
          g.fillStyle = gr;
          for (const [a, b] of [[0.43, 0.3], [0.5, 0.45], [0.56, 0.62]]) { g.beginPath(); g.moveTo(x + w * a, LH - h); g.lineTo(x + w * (a + 0.015), LH - h); g.lineTo(x + w * b + 30, LH); g.lineTo(x + w * b, LH); g.fill(); }
          for (let i = 0; i < 12; i++) { const px = r() * LW, ph = 60 + r() * 120; g.fillStyle = '#2a0f0b'; g.beginPath(); g.moveTo(px - 50, LH); g.lineTo(px, LH - ph); g.lineTo(px + 40, LH); g.fill(); }
        } else {
          g.fillStyle = '#200c09'; g.beginPath(); g.moveTo(0, LH);
          for (let x = 0; x <= LW; x += 24) g.lineTo(x, LH - 60 - hash(x * 0.37) * 70 - Math.sin(x / LW * TAU * 3) * 30);
          g.lineTo(LW, LH); g.fill();
          g.strokeStyle = 'rgba(255,110,40,0.6)'; g.lineWidth = 3;
          for (let i = 0; i < 18; i++) { const x = r() * LW; g.beginPath(); g.moveTo(x, LH - 10); g.lineTo(x + 20 - r() * 40, LH - 40 - r() * 30); g.stroke(); }
        }
      });
    } else {
      twice(() => {
        if (n) {
          for (let i = 0; i < 10; i++) {
            const x = i * LW / 10 + r() * 90, w = 40 + r() * 70, h = 120 + r() * 220;
            g.fillStyle = '#161a3d'; g.fillRect(x, LH - h, w, h);
            g.fillRect(x - 30, LH - h * 0.6, w + 60, 16);
            g.fillStyle = r() < 0.5 ? '#7fffd4' : '#a98bff';
            for (let k = 0; k < 4; k++) g.fillRect(x + w / 2 - 2, LH - h + 10 + k * 30, 4, 4);
            g.beginPath(); g.arc(x + w / 2, LH - h - 6, 5, 0, TAU); g.fill();
          }
        }
      });
    }
    return c;
  }
  function layer(wi, n) { const k = wi * 2 + n; let c = layerMemo.get(k); if (!c) { c = paintLayer(wi, n); layerMemo.set(k, c); } return c; }
  /* The sky (gradient, stars, sun, moon or planet) is painted once per screen size into a canvas at device
     pixels, and the two scenery strips are kept ready at their drawn size, so a frame only copies pixels: scaling
     big images and gradients every frame was most of the cost of a frame on a slow device. */
  let skyCache = null;
  function skyCanvas(wi, W, H, hzb, ratio) {
    const key = wi + ':' + W + ':' + H + ':' + Math.round(hzb) + ':' + ratio;
    if (skyCache && skyCache.key === key) return skyCache;
    const w = MR.WORLDS[wi], m = Math.round(W * 0.06), cw = W + 2 * m;
    const c = canvas(cw * ratio, H * ratio), g = c.getContext('2d');
    g.scale(ratio, ratio);
    // the gradient reaches a little below the horizon: in a boss fight the camera tilts and the horizon drops
    const low = w.void ? H : hzb + H * 0.08;
    const gr = g.createLinearGradient(0, 0, 0, low);
    gr.addColorStop(0, w.sky[0]); gr.addColorStop(w.void ? 0.5 : 0.62, w.sky[1]); gr.addColorStop(1, w.sky[2]);
    g.fillStyle = gr; g.fillRect(0, 0, cw, H);
    const r = seeded(77);
    if (wi === 0 || wi === 4) for (let i = 0; i < cw * H / 2600; i++) { const s = r() < 0.08 ? 2 : 1; g.fillStyle = 'rgba(255,255,255,' + (0.35 + r() * 0.6) + ')'; g.fillRect(r() * cw, r() * (w.void ? H : low), s, s); }
    g.translate(m, 0);
    if (wi === 0) {
      const mx = W * 0.74, my = hzb * 0.34;
      A.glow(g, mx, my, H * 0.2, '#ff9fe0', 0.45);
      g.beginPath(); g.arc(mx, my, H * 0.055, 0, TAU); g.fillStyle = '#fff0fa'; g.fill();
      g.beginPath(); g.arc(mx - H * 0.012, my - H * 0.008, H * 0.012, 0, TAU); g.fillStyle = 'rgba(220,190,230,0.6)'; g.fill();
    } else if (wi === 1) {
      const mx = W * 0.3, my = hzb * 0.72;
      A.glow(g, mx, my, H * 0.38, '#fff3c4', 0.75);
      g.beginPath(); g.arc(mx, my, H * 0.075, 0, TAU); g.fillStyle = '#fffbea'; g.fill();
    } else if (wi === 2) {
      const mx = W * 0.8, my = hzb * 0.3;
      A.glow(g, mx, my, H * 0.25, '#ffffff', 0.6);
      g.beginPath(); g.arc(mx, my, H * 0.045, 0, TAU); g.fillStyle = '#ffffff'; g.fill();
    } else if (wi === 3) {
      A.glow(g, W * 0.5, hzb, W * 0.5, '#ff4a1a', 0.35);
    } else {
      const px = W * 0.7, py = H * 0.22, pr = H * 0.13;
      A.glow(g, W * 0.25, H * 0.3, H * 0.35, '#7a3cff', 0.25);
      A.glow(g, W * 0.45, H * 0.18, H * 0.25, '#ff4fd8', 0.15);
      g.save(); g.translate(px, py); g.rotate(-0.25);
      g.beginPath(); g.ellipse(0, 0, pr * 2.1, pr * 0.42, 0, Math.PI, TAU); g.strokeStyle = 'rgba(255,214,160,0.6)'; g.lineWidth = pr * 0.12; g.stroke();
      g.restore();
      const pg = g.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
      pg.addColorStop(0, '#ffcf8a'); pg.addColorStop(1, '#b4562e');
      g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fillStyle = pg; g.fill();
      g.save(); g.translate(px, py); g.rotate(-0.25);
      g.beginPath(); g.ellipse(0, 0, pr * 2.1, pr * 0.42, 0, 0, Math.PI); g.strokeStyle = 'rgba(255,214,160,0.75)'; g.lineWidth = pr * 0.12; g.stroke();
      g.restore();
    }
    skyCache = { key: key, cv: c, m: m, W: cw };
    return skyCache;
  }
  const stripMemo = new Map();
  function strip(wi, n, lh, ratio) {
    const tw = lh * (LW / LH), key = wi + ':' + n + ':' + Math.round(lh) + ':' + ratio;
    let s = stripMemo.get(key);
    if (!s) {
      if (stripMemo.size > 12) stripMemo.clear();
      const c = canvas(Math.ceil(tw * ratio), Math.ceil(lh * ratio));
      c.getContext('2d').drawImage(layer(wi, n), 0, 0, c.width, c.height);
      s = { cv: c, tw: c.width / ratio, lh: c.height / ratio };
      stripMemo.set(key, s);
    }
    return s;
  }
  function background(g, wi, W, H, HZ, sx, sy, t, L, hzb, ratio) {
    hzb = hzb || HZ; ratio = ratio || 1;
    const sky = skyCanvas(wi, W, H, hzb, ratio);
    const shift = Math.max(-sky.m, Math.min(sky.m, sx * 0.05));
    g.drawImage(sky.cv, -sky.m + shift, 0, sky.W, H);
    // far scenery in two layers that slide with the road's bends
    for (const n of [0, 1]) {
      if (wi === 4 && !n) continue;
      const st = strip(wi, n, hzb * (n ? 0.62 : 0.95), ratio), tw = st.tw, off = (((sx * (n ? 0.7 : 0.4)) % tw) + tw) % tw;
      const bottom = HZ + sy * (n ? 0.5 : 0.3) + (n ? F2(H) : 2);
      for (let x = -off; x < W; x += tw) g.drawImage(st.cv, Math.round(x), Math.round(bottom - st.lh), tw, st.lh);
    }
    if (wi === 4) {
      for (let i = 0; i < 4; i++) { const y = HZ + 20 + i * 30; g.fillStyle = 'rgba(169,139,255,' + (0.06 - i * 0.012) + ')'; g.fillRect(0, y, W, 20); }
    }
  }
  function F2(H) { return H * 0.012; }

  /* ================= weather in front of everything ================= */
  function weather(g, wi, W, H, t) {
    if (wi === 0) {
      g.strokeStyle = 'rgba(180,200,255,0.25)'; g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < 46; i++) { const x = (i * 197.3 + t * 90) % (W + 60) - 30, y = (i * 311.7 + t * 900) % (H + 40) - 20; g.moveTo(x, y); g.lineTo(x - 5, y + 18); }
      g.stroke();
    } else if (wi === 1) {
      g.fillStyle = 'rgba(255,240,210,0.35)';
      for (let i = 0; i < 24; i++) { const x = (i * 263.1 + t * 60) % W, y = (i * 151.9 + Math.sin(t + i) * 30) % H; g.fillRect(x, y, 2, 2); }
    } else if (wi === 2) {
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 70; i++) {
        const sp = 40 + (i % 5) * 18, x = (i * 173.3 + Math.sin(t * 0.8 + i) * 30 + t * 12) % W, y = (i * 97.1 + t * sp) % H, r = 1 + (i % 3) * 0.8;
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
    } else if (wi === 3) {
      for (let i = 0; i < 30; i++) {
        const x = (i * 211.7 + Math.sin(t * 0.7 + i) * 40) % W, y = H - ((i * 131.3 + t * (40 + (i % 4) * 15)) % H);
        A.glow(g, x, y, 5 + (i % 3) * 2, '#ff8a3d', 0.7);
      }
    }
  }

  /* ================= roadside props ================= */
  const KINDS = [
    ['lamp', 'sign', 'tower', 'tree', 'lamp', 'cone', 'sign2', 'sign3'],
    ['cactus', 'rock', 'signpost', 'cactus', 'palm', 'pump'],
    ['pine', 'pine', 'crystal', 'snowman', 'rock', 'flag'],
    ['obsidian', 'pipe', 'forge', 'rock', 'vent', 'obsidian'],
    ['pylon', 'dish', 'tank', 'light', 'cargo', 'pylon']
  ];
  const BIG = [['tower', 'tower', 'sign'], ['mesa', 'rock', 'palm'], ['pine', 'pine', 'crystal'], ['forge', 'obsidian', 'pipe'], ['dish', 'tank', 'pylon']];
  function props(wi, d, zNear, zFar, seed, cb) {
    const SP = 8, list = KINDS[wi], big = BIG[wi];
    for (let p = Math.ceil((d + zNear) / SP) * SP; p < d + zFar; p += SP) {
      for (const side of [-1, 1]) {
        const h = hash(p * 0.731 + side * 17.3 + seed);
        if (h > 0.28) cb(p - d, side * (7.6 + hash(p * 1.31 + side) * 3.2), list[Math.floor(hash(p * 2.17 + side * 3) * list.length)], 0.85 + hash(p * 3.7 + side) * 0.35);
        const h2 = hash(p * 0.517 + side * 41.1 + seed * 2);
        if (h2 < 0.42) cb(p - d + 3, side * (15 + h2 * 22), big[Math.floor(hash(p * 5.3 + side * 9) * big.length)], 1.1 + h2 * 0.8);
      }
    }
  }
  const PX = 40;
  const spriteMemo = new Map();
  function propSprite(wi, kind) {
    const key = wi + kind;
    if (spriteMemo.has(key)) return spriteMemo.get(key);
    const D = PROP[kind];
    if (!D) { spriteMemo.set(key, null); return null; }
    const [w, h] = D.size, c = canvas(w * PX, h * PX), g = c.getContext('2d');
    g.translate(w * PX / 2, h * PX); g.scale(PX, PX);
    A.begin(g, PX, 0); g.lineJoin = 'round';
    D.draw(g, seeded(kind.length * 31 + wi * 7));
    const sp = { cv: c, w: w, h: h, ax: w / 2, ay: h };
    spriteMemo.set(key, sp);
    return sp;
  }
  const P = A.poly, RR = A.rr, CI = A.circle, FS = A.fs, FL = A.fl;
  const PROP = {
    lamp: { size: [2.4, 6.4], draw(g) { RR(g, -0.09, -5.6, 0.18, 5.6, 0.05); FS(g, '#3d3560'); RR(g, -0.9, -5.75, 1.8, 0.16, 0.06); FS(g, '#3d3560'); for (const s of [-1, 1]) { RR(g, s * 0.8 - 0.25, -5.72, 0.5, 0.18, 0.06); FL(g, '#bff8ff'); A.glow(g, s * 0.8, -5.5, 1.0, '#5ff3ff', 0.8); } RR(g, -0.25, -0.4, 0.5, 0.4, 0.06); FS(g, '#2a2445'); } },
    sign2: { size: [4.2, 6.4], draw(g) { neonSign(g, '#5ff3ff', 'ZAP!'); } },
    sign3: { size: [4.2, 6.4], draw(g) { neonSign(g, '#ffd23f', '★ 24/7'); } },
    sign: { size: [4.2, 6.4], draw(g) { neonSign(g, '#ff4fd8', 'BOTS'); } },
    signOld: { size: [4.2, 6.4], draw(g, r) { for (const s of [-1, 1]) { RR(g, s * 1.2 - 0.08, -4.0, 0.16, 4.0, 0.04); FS(g, '#3d3560'); } const col = ['#ff4fd8', '#5ff3ff', '#ffd23f'][Math.floor(r() * 3)]; RR(g, -1.9, -6.0, 3.8, 2.2, 0.2); FS(g, '#1d1640'); RR(g, -1.75, -5.85, 3.5, 1.9, 0.15); g.lineWidth = 0.12; g.strokeStyle = col; g.stroke(); A.glow(g, 0, -4.9, 2.6, col, 0.35); g.font = '700 1.1px Fredoka, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(['ZAP!', 'BOTS', '★ 24/7', 'MECH'][Math.floor(r() * 4)], 0, -4.88); } },
    tower: { size: [5, 12], draw(g, r) { RR(g, -2.3, -11.5, 4.6, 11.5, 0.1); FS(g, '#2a1d52'); for (let y = -11; y < -0.6; y += 0.8) for (let x = -2.0; x < 2.0; x += 0.7) if (r() < 0.45) { g.fillStyle = r() < 0.5 ? 'rgba(255,170,240,0.8)' : 'rgba(127,246,255,0.8)'; g.fillRect(x, y, 0.36, 0.45); } RR(g, -2.3, -11.7, 4.6, 0.3, 0.05); FL(g, '#ff4fd8'); A.glow(g, 0, -11.6, 2.6, '#ff4fd8', 0.5); } },
    tree: { size: [2.8, 4.6], draw(g) { RR(g, -0.15, -2.2, 0.3, 2.2, 0.06); FS(g, '#3d3560'); CI(g, 0, -3.1, 1.25); FS(g, '#ff6fd8'); CI(g, -0.35, -3.45, 0.45); FL(g, '#ffd0f4', 0.6); A.glow(g, 0, -3.1, 2.2, '#ff4fd8', 0.4); } },
    cone: { size: [2.4, 1.2], draw(g) { for (const x of [-0.7, 0, 0.7]) { P(g, [x - 0.3, 0, x + 0.3, 0, x + 0.1, -0.9, x - 0.1, -0.9]); FS(g, '#ff8a3d'); RR(g, x - 0.18, -0.55, 0.36, 0.14, 0.04); FL(g, '#ffffff'); } } },
    cactus: { size: [2.6, 4.6], draw(g) { RR(g, -0.32, -4.3, 0.64, 4.3, 0.32); FS(g, '#4f9a5a'); RR(g, -1.15, -2.9, 0.5, 1.4, 0.25); FS(g, '#4f9a5a'); RR(g, -1.15, -1.8, 0.95, 0.42, 0.2); FS(g, '#4f9a5a'); RR(g, 0.62, -3.5, 0.5, 1.5, 0.25); FS(g, '#4f9a5a'); RR(g, 0.2, -2.3, 0.92, 0.42, 0.2); FS(g, '#4f9a5a'); for (const x of [-0.12, 0.12]) A.line(g, x, -4.1, x, -0.2, '#79c27f', 0.06); CI(g, 0, -4.35, 0.18); FL(g, '#ff7ac8'); } },
    rock: { size: [3.2, 2.2], draw(g, r) { P(g, [-1.5, 0, -1.3, -1.1, -0.5, -1.9, 0.6, -1.7, 1.4, -0.9, 1.5, 0]); FS(g, '#b9784a'); P(g, [-1.3, -1.1, -0.5, -1.9, 0.0, -1.85, -0.6, -0.9]); FL(g, '#d59a68'); } },
    signpost: { size: [2.4, 3.6], draw(g) { RR(g, -0.1, -3.3, 0.2, 3.3, 0.05); FS(g, '#8a5a3a'); P(g, [-1.1, -3.1, 0.8, -3.1, 1.1, -2.8, 0.8, -2.5, -1.1, -2.5]); FS(g, '#c98f52'); P(g, [1.0, -2.2, -0.8, -2.2, -1.1, -1.9, -0.8, -1.6, 1.0, -1.6]); FS(g, '#c98f52'); } },
    palm: { size: [4.4, 6.2], draw(g) { g.beginPath(); g.moveTo(-0.2, 0); g.quadraticCurveTo(0.6, -3, 0.2, -5.4); g.lineWidth = 0.4; g.strokeStyle = '#8a5a3a'; g.stroke(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.55; g.beginPath(); g.moveTo(0.2, -5.4); g.quadraticCurveTo(0.2 + Math.cos(a) * 1.4, -5.4 + Math.sin(a) * 1.4 - 0.5, 0.2 + Math.cos(a) * 2.0, -5.0 + Math.sin(a) * 0.6); g.lineWidth = 0.32; g.strokeStyle = '#3f8f4f'; g.stroke(); } } },
    pump: { size: [4, 3.6], draw(g) { P(g, [-1.2, 0, 1.2, 0, 0.2, -2.4, -0.2, -2.4]); FS(g, '#5a4a4a'); RR(g, -1.8, -2.9, 3.6, 0.36, 0.1); FS(g, '#3a3a3a'); RR(g, 1.6, -3.3, 0.5, 1.0, 0.1); FS(g, '#ffcc3d'); } },
    mesa: { size: [9, 5], draw(g) { P(g, [-4.4, 0, -3.4, -4.6, 3.2, -4.6, 4.4, 0]); FS(g, '#d98a55'); RR(g, -3.4, -4.7, 6.6, 0.4, 0.1); FL(g, '#f3b07f'); } },
    pine: { size: [3, 6], draw(g) { RR(g, -0.18, -1.0, 0.36, 1.0, 0.05); FS(g, '#5a4030'); for (let i = 0; i < 3; i++) { const y = -1.0 - i * 1.4, w = 1.35 - i * 0.32; P(g, [-w, y, 0, y - 2.0, w, y]); FS(g, '#2f5d50'); P(g, [-w * 0.6, y - 0.8, 0, y - 2.0, w * 0.6, y - 0.8, 0, y - 1.1]); FL(g, '#ffffff'); } } },
    crystal: { size: [3, 3.6], draw(g) { for (const [x, h, a] of [[-0.6, 2.4, -0.25], [0.2, 3.3, 0.05], [0.8, 2.0, 0.3]]) { g.save(); g.translate(x, 0); g.rotate(a); P(g, [-0.32, 0, -0.32, -h + 0.5, 0, -h, 0.32, -h + 0.5, 0.32, 0]); FS(g, '#9fe6ff'); P(g, [-0.32, 0, -0.32, -h + 0.5, 0, -h, 0, 0]); FL(g, '#e6faff', 0.7); g.restore(); } A.glow(g, 0, -1.6, 2.0, '#7fe3ff', 0.35); } },
    snowman: { size: [2.2, 3.2], draw(g) { CI(g, 0, -0.75, 0.75); FS(g, '#ffffff'); CI(g, 0, -1.85, 0.55); FS(g, '#ffffff'); CI(g, 0, -2.65, 0.4); FS(g, '#ffffff'); for (const x of [-0.13, 0.13]) { CI(g, x, -2.72, 0.05); FL(g, '#17132b'); } P(g, [0, -2.62, 0.38, -2.58, 0, -2.54]); FL(g, '#ff8a3d'); RR(g, -0.36, -3.1, 0.72, 0.12, 0.03); FS(g, '#3a3f5a'); RR(g, -0.24, -3.45, 0.48, 0.36, 0.05); FS(g, '#3a3f5a'); RR(g, -0.5, -2.32, 1.0, 0.14, 0.06); FS(g, '#ff5a6a'); } },
    flag: { size: [2, 4], draw(g) { RR(g, -0.06, -3.8, 0.12, 3.8, 0.03); FS(g, '#5a6488'); P(g, [0.06, -3.8, 1.3, -3.4, 0.06, -3.0]); FS(g, '#ff5a6a'); } },
    obsidian: { size: [3, 4.4], draw(g) { for (const [x, h] of [[-0.7, 2.6], [0.1, 4.0], [0.8, 2.2]]) { P(g, [x - 0.5, 0, x, -h, x + 0.5, 0]); FS(g, '#1d1418'); P(g, [x - 0.1, -h * 0.2, x, -h * 0.75, x + 0.08, -h * 0.25]); FL(g, '#ff6a2a', 0.9); } A.glow(g, 0, -1.2, 1.8, '#ff6a2a', 0.3); } },
    pipe: { size: [4.4, 4.6], draw(g) { for (const x of [-1.6, 1.6]) { RR(g, x - 0.3, -3.6, 0.6, 3.6, 0.1); FS(g, '#6a5a5a'); } RR(g, -1.9, -4.2, 3.8, 0.6, 0.3); FS(g, '#6a5a5a'); for (const x of [-1.6, 1.6]) { RR(g, x - 0.38, -1.2, 0.76, 0.2, 0.05); FL(g, '#ffb347'); } } },
    forge: { size: [3.6, 7], draw(g) { P(g, [-1.4, 0, 1.4, 0, 0.9, -5.6, -0.9, -5.6]); FS(g, '#4a3a3a'); RR(g, -1.1, -6.3, 2.2, 0.7, 0.1); FS(g, '#3a2a2a'); A.glow(g, 0, -6.5, 2.0, '#ff7a2a', 0.85); for (let i = 0; i < 4; i++) { RR(g, -0.7, -1.2 - i * 1.1, 1.4, 0.16, 0.05); FL(g, '#ff8a3d', 0.85); } } },
    vent: { size: [2.4, 1.2], draw(g) { P(g, [-1.1, 0, -0.6, -0.8, 0.6, -0.8, 1.1, 0]); FS(g, '#2a1a16'); A.ell(g, 0, -0.8, 0.6, 0.15); FL(g, '#ff8a3d'); A.glow(g, 0, -0.9, 1.0, '#ff6a2a', 0.8); } },
    pylon: { size: [2, 8], draw(g) { P(g, [-0.6, 0, 0.6, 0, 0.2, -7.4, -0.2, -7.4]); FS(g, '#3a3f60'); for (let i = 0; i < 6; i++) { RR(g, -0.25, -1 - i * 1.1, 0.5, 0.12, 0.04); FL(g, i % 2 ? '#7fffd4' : '#a98bff'); } CI(g, 0, -7.6, 0.3); FL(g, '#ffffff'); A.glow(g, 0, -7.6, 1.2, '#a98bff', 0.9); } },
    dish: { size: [4.4, 5], draw(g) { RR(g, -0.18, -2.6, 0.36, 2.6, 0.06); FS(g, '#4a5070'); g.save(); g.translate(0, -3.4); g.rotate(-0.4); A.ell(g, 0, 0, 1.9, 0.9); FS(g, '#c9d1e8'); A.ell(g, 0, 0.1, 1.4, 0.55); FL(g, '#9aa3c0'); A.line(g, 0, 0, 0, -1.2, '#4a5070', 0.08); A.circle(g, 0, -1.25, 0.14); FL(g, '#ff5a6a'); g.restore(); } },
    tank: { size: [3.4, 4], draw(g) { RR(g, -1.4, -3.6, 2.8, 3.6, 1.0); FS(g, '#c9d1e8'); RR(g, -1.4, -2.2, 2.8, 0.35, 0.05); FL(g, '#ff8a3d'); RR(g, -1.0, -3.3, 0.5, 2.8, 0.25); FL(g, '#ffffff', 0.4); } },
    light: { size: [1, 2.6], draw(g) { RR(g, -0.1, -2.0, 0.2, 2.0, 0.05); FS(g, '#3a3f60'); CI(g, 0, -2.2, 0.22); FL(g, '#7fffd4'); A.glow(g, 0, -2.2, 0.9, '#7fffd4', 0.9); } },
    cargo: { size: [3.6, 3.2], draw(g) { RR(g, -1.7, -1.4, 3.4, 1.4, 0.08); FS(g, '#4a8bff'); RR(g, -1.2, -2.9, 2.6, 1.5, 0.08); FS(g, '#ff8a3d'); for (let i = 0; i < 6; i++) A.line(g, -1.5 + i * 0.6, -1.3, -1.5 + i * 0.6, -0.1, 'rgba(0,0,0,0.25)', 0.05); } }
  };

  function neonSign(g, col, text) {
    for (const s of [-1, 1]) { RR(g, s * 1.2 - 0.08, -4.0, 0.16, 4.0, 0.04); FS(g, '#3d3560'); }
    RR(g, -1.9, -6.0, 3.8, 2.2, 0.2); FS(g, '#1d1640');
    RR(g, -1.75, -5.85, 3.5, 1.9, 0.15); g.lineWidth = 0.12; g.strokeStyle = col; g.stroke();
    A.glow(g, 0, -4.9, 2.6, col, 0.35);
    g.font = '700 1.1px Fredoka, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(text, 0, -4.88);
  }

  /* ================= tall obstacles, barriers and gates per world ================= */
  const BLOCK = [
    { barrier: ['#c9c4d8', '#e6e2f0', '#9a94b0'], stripe: '#ff4fd8' },
    { barrier: ['#d9b48a', '#ecd0ab', '#b8916a'], stripe: '#c0392b' },
    { barrier: ['#e8f2fb', '#ffffff', '#bcd2e6'], stripe: '#ff5a6a' },
    { barrier: ['#4a3a3a', '#5e4a4a', '#352828'], stripe: '#ffb347' },
    { barrier: ['#5a6488', '#6f79a0', '#454e70'], stripe: '#7fffd4' }
  ];
  function blockStyle(wi) { return BLOCK[wi]; }
  function block(g, wi, e, box, proj, P2, t) {
    if (wi === 0 || wi === 4) {
      box(e.x, 0, e.z, 2.9, 4.4, 1.6, wi === 0 ? ['#6b6488', '#8a83a8', '#4f4970'] : ['#4a5070', '#5f6690', '#3a3f5a'], (a, b, c2, d) => {
        const w = b[0] - a[0], h = a[1] - d[1], col = wi === 0 ? '#ff4fd8' : '#7fffd4';
        g.fillStyle = col; g.fillRect(a[0] + w * 0.1, d[1] + h * 0.18, w * 0.8, Math.max(2, h * 0.05)); g.fillRect(a[0] + w * 0.1, d[1] + h * 0.7, w * 0.8, Math.max(2, h * 0.05));
        A.glow(g, (a[0] + b[0]) / 2, d[1] + h * 0.2, w * 0.6, col, 0.3);
      });
      return;
    }
    proj(e.x, 0, e.z);
    const s = P2.s;
    g.save(); g.translate(P2.x, P2.y); g.scale(s, s);
    A.begin(g, s, 0);
    if (wi === 1) {
      P(g, [-1.6, 0, -1.4, -2.6, -0.6, -4.2, 0.7, -4.4, 1.5, -2.8, 1.6, 0]); FS(g, '#b06a3a');
      P(g, [-1.4, -2.6, -0.6, -4.2, 0.0, -4.3, -0.5, -2.2]); FL(g, '#d08a52');
      A.line(g, -0.6, -1.0, 0.8, -1.4, 'rgba(90,40,20,0.4)', 0.08);
    } else if (wi === 2) {
      for (const [x, h, a] of [[-0.7, 3.6, -0.2], [0.15, 4.6, 0.04], [0.85, 3.2, 0.24]]) { g.save(); g.translate(x, 0); g.rotate(a); P(g, [-0.5, 0, -0.5, -h + 0.7, 0, -h, 0.5, -h + 0.7, 0.5, 0]); FS(g, '#9fe6ff'); P(g, [-0.5, 0, -0.5, -h + 0.7, 0, -h, 0, 0]); FL(g, '#e9fbff', 0.75); g.restore(); }
      A.glow(g, 0, -2, 2.6, '#7fe3ff', 0.35);
    } else {
      for (const [x, h] of [[-0.8, 3.4], [0.1, 4.6], [0.9, 3.0]]) { P(g, [x - 0.65, 0, x, -h, x + 0.65, 0]); FS(g, '#1d1418'); P(g, [x - 0.12, -h * 0.15, x, -h * 0.8, x + 0.1, -h * 0.2]); FL(g, '#ff6a2a', 0.9); }
      A.glow(g, 0, -1.6, 2.6, '#ff6a2a', 0.35);
    }
    g.restore();
  }
  const GATE = [
    { field: '#5ff3ff', edge: '#5ff3ff', pylon: ['#3d3560', '#5a4f86', '#2a2445'] },
    { field: '#ffd23f', edge: '#fff3c4', pylon: ['#8a5a3a', '#a8714a', '#6b4429'] },
    { field: '#7fe3ff', edge: '#e6faff', pylon: ['#5b7896', '#7a98b6', '#46617d'] },
    { field: '#ff8a3d', edge: '#ffd27a', pylon: ['#3a2a2a', '#524040', '#2a1e1e'] },
    { field: '#a98bff', edge: '#7fffd4', pylon: ['#3a3f60', '#535a85', '#2a2e48'] }
  ];
  function gateCols(wi) { return GATE[wi]; }
  function ice(g, e) {
    const h = e.h || 1.5, r = e.r || 1;
    g.fillStyle = 'rgba(190,240,255,0.55)';
    P(g, [-r, 0, -r * 1.05, -h * 0.7, -r * 0.4, -h * 1.05, r * 0.5, -h, r * 1.05, -h * 0.6, r, 0]); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 0.05; g.stroke();
  }

  /* ================= the bosses ================= */
  const posing = (B, name) => (B.pose === name && B.poseT > 0 ? 1 - B.poseT / 1.2 : -1);
  function crab(g, B, t) {
    const sl = posing(B, 'slam'), stag = B.mode === 'stagger' || B.mode === 'dying';
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const k = Math.sin(t * 6 + i * 2 + s) * 0.18, hx = s * (1.6 + i * 0.5), kx = s * (3.2 + i * 0.35), fx = s * (3.0 + i * 0.55);
      g.beginPath(); g.moveTo(hx, -1.6); g.lineTo(kx, -2.6 + k + i * 0.2); g.lineTo(fx, 0);
      g.strokeStyle = A.OUT; g.lineWidth = 0.42; g.stroke(); g.strokeStyle = A.C('#9a3a26'); g.lineWidth = 0.28; g.stroke();
    }
    for (const s of [-1, 1]) {
      // a claw raised high, then slammed down, when this side attacks
      const raise = sl >= 0 && ((s < 0) === (B.x > 0)) ? (sl < 0.8 ? sl / 0.8 : 1 - (sl - 0.8) / 0.2) : 0;
      const ax = s * 3.9, ay = -3.4 - raise * 3.2 + Math.sin(t * 2 + s) * 0.15;
      g.beginPath(); g.moveTo(s * 2.4, -2.6); g.lineTo(ax, ay + 0.6); g.strokeStyle = A.OUT; g.lineWidth = 0.75; g.stroke(); g.strokeStyle = A.C('#c94a30'); g.lineWidth = 0.55; g.stroke();
      const open = 0.25 + Math.sin(t * 3 + s) * 0.15 + raise * 0.3;
      g.save(); g.translate(ax, ay); g.rotate(s * 0.25);
      P(g, [0, 0, s * 0.4, -1.4 - open, s * 1.3, -1.7 - open, s * 1.1, -0.6]); A.fs(g, '#e0573a');
      P(g, [0, 0.2, s * 0.6, 0.9 + open * 0.6, s * 1.4, 0.5 + open * 0.4, s * 1.0, 0]); A.fs(g, '#c94a30');
      A.circle(g, 0, 0, 0.55); A.fs(g, '#e0573a');
      g.restore();
    }
    A.ell(g, 0, -2.25, 3.05, 1.5); A.fs(g, '#e0573a');
    A.ell(g, -0.6, -2.85, 1.8, 0.6); A.fl(g, '#ff9a7a', 0.5);
    A.ell(g, 0, -1.25, 2.6, 0.5); A.fl(g, '#8a2f1f');
    for (let i = 0; i < 7; i++) { A.circle(g, -2.2 + i * 0.73, -2.2 + Math.abs(i - 3) * 0.12, 0.09); A.fl(g, '#ffd0c0', 0.8); }
    A.rr(g, -1.0, -1.95, 2.0, 0.65, 0.25); A.fs(g, '#2a1430');
    for (let i = 0; i < 6; i++) A.line(g, -0.75 + i * 0.3, -1.85, -0.75 + i * 0.3, -1.4, '#ff9f43', 0.08);
    A.glow(g, 0, -1.6, 1.6, '#ff9f43', 0.5);
    for (const s of [-1, 1]) {
      A.line(g, s * 0.7, -3.5, s * 1.0, -4.9, '#9a3a26', 0.22);
      A.circle(g, s * 1.0, -5.1, 0.45); A.fs(g, '#ffffff');
      if (stag) { A.line(g, s * 1.0 - 0.2, -5.3, s * 1.0 + 0.2, -4.9, '#17132b', 0.1); A.line(g, s * 1.0 + 0.2, -5.3, s * 1.0 - 0.2, -4.9, '#17132b', 0.1); }
      else { A.circle(g, s * 1.0 + Math.sin(t) * 0.1, -5.05, 0.22); A.fl(g, '#d42a3a'); A.circle(g, s * 0.95, -5.15, 0.07); A.fl(g, '#ffffff'); }
    }
  }
  function scorpion(g, B, t) {
    const sw = posing(B, 'sweep'), st = posing(B, 'sting');
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const k = Math.sin(t * 7 + i * 1.7 + s) * 0.15;
      g.beginPath(); g.moveTo(s * (1.2 + i * 0.4), -1.3); g.lineTo(s * (2.6 + i * 0.45), -2.0 + k); g.lineTo(s * (2.9 + i * 0.5), 0);
      g.strokeStyle = A.OUT; g.lineWidth = 0.3; g.stroke(); g.strokeStyle = A.C('#8a6238'); g.lineWidth = 0.18; g.stroke();
    }
    // tail: segments arching over the body to the stinger
    const segs = 6;
    for (let i = segs; i >= 0; i--) {
      const f = i / segs, ang = Math.PI * (0.05 + 0.95 * f), R = 3.4;
      const x = Math.sin(t * 1.2) * 0.4 * f, y = -2.2 - Math.sin(ang) * R - f * 1.8 + (st >= 0 ? Math.sin(st * Math.PI) * 1.2 * f : 0);
      A.ell(g, x, y, 0.95 - f * 0.45, 0.7 - f * 0.3); A.fs(g, '#d9a35c');
      A.ell(g, x - 0.2, y - 0.2, 0.4 - f * 0.2, 0.2); A.fl(g, '#f3cf94', 0.6);
      if (i === segs) {
        A.poly(g, [x - 0.35, y + 0.2, x + 0.35, y + 0.2, x, y + 1.3]); A.fs(g, '#6b4a2a');
        const hot = sw >= 0 || st >= 0 ? 1 : 0.4;
        A.glow(g, x, y + 1.2, 1.2 + hot, '#7dff9a', 0.6 + hot * 0.4);
        A.circle(g, x, y + 1.15, 0.2); A.fl(g, '#eaffef');
      }
    }
    for (const s of [-1, 1]) {
      const reach = Math.sin(t * 1.7 + s) * 0.2;
      g.beginPath(); g.moveTo(s * 1.6, -1.6); g.lineTo(s * (2.9 + reach), -1.9); g.strokeStyle = A.OUT; g.lineWidth = 0.55; g.stroke(); g.strokeStyle = A.C('#c08a4a'); g.lineWidth = 0.38; g.stroke();
      g.save(); g.translate(s * (3.1 + reach), -2.0);
      A.poly(g, [0, 0, s * 0.5, -1.1, s * 1.35, -1.0, s * 0.9, -0.2]); A.fs(g, '#d9a35c');
      A.poly(g, [0, 0.15, s * 0.7, 0.75, s * 1.4, 0.4, s * 0.9, 0]); A.fs(g, '#c08a4a');
      g.restore();
    }
    A.rr(g, -2.0, -2.5, 4.0, 1.7, 0.7); A.fs(g, '#d9a35c');
    A.rr(g, -1.8, -2.45, 2.0, 0.5, 0.25); A.fl(g, '#f3cf94', 0.5);
    for (let i = 0; i < 6; i++) { A.circle(g, -0.75 + i * 0.3, -1.95 + (i % 2) * 0.12, 0.12); A.fl(g, '#ff3d5a'); }
    A.glow(g, 0, -1.9, 1.3, '#ff3d5a', 0.5);
    for (const s of [-1, 1]) { A.poly(g, [s * 0.4, -1.0, s * 0.9, -0.95, s * 0.6, -0.4]); A.fs(g, '#6b4a2a'); }
  }
  function titan(g, B, t) {
    const bo = posing(B, 'boulder'), br = posing(B, 'breath'), step = Math.sin(t * 1.4) * 0.1;
    for (const s of [-1, 1]) {
      A.rr(g, s * 1.15 - 0.7, -3.6, 1.4, 3.6, 0.3); A.fs(g, '#a8c8e8');
      A.rr(g, s * 1.15 - 0.85, -0.8 + (s > 0 ? step : -step), 1.7, 0.8, 0.2); A.fs(g, '#5b7da8');
      A.rr(g, s * 1.15 - 0.6, -2.4, 1.2, 0.35, 0.1); A.fl(g, '#5b7da8');
    }
    A.rr(g, -1.9, -4.4, 3.8, 1.0, 0.3); A.fs(g, '#5b7da8');
    A.poly(g, [-2.7, -7.8, 2.7, -7.8, 2.3, -4.2, -2.3, -4.2]); A.fs(g, '#d6ecff');
    A.poly(g, [-2.7, -7.8, -1.2, -7.8, -1.0, -4.2, -2.3, -4.2]); A.fl(g, '#ffffff', 0.5);
    A.poly(g, [0, -6.9, 0.65, -6.1, 0, -5.3, -0.65, -6.1]); A.fs(g, '#7fe3ff');
    A.glow(g, 0, -6.1, 2.2, '#7fe3ff', 0.75 + Math.sin(t * 4) * 0.15);
    for (const s of [-1, 1]) {
      A.rr(g, s * 2.4 - 0.95, -8.3, 1.9, 1.3, 0.4); A.fs(g, '#a8c8e8');
      for (let i = 0; i < 3; i++) { A.poly(g, [s * (2.0 + i * 0.4) - 0.2, -8.2, s * (2.1 + i * 0.4), -9.4 + i * 0.25, s * (2.0 + i * 0.4) + 0.2, -8.2]); A.fs(g, '#9fe6ff', 0.6); }
      const lift = s > 0 && bo >= 0 ? Math.sin(Math.min(1, bo * 1.3) * Math.PI / 2) : 0;
      g.save(); g.translate(s * 2.75, -7.6); g.rotate(s * (0.12 + lift * 2.4) * -1 * (s > 0 ? 1 : -1) * 0);
      const ay = lift ? -lift * 2.2 : 0;
      A.rr(g, -0.5, 0.2 + ay, 1.0, 2.6, 0.3); A.fs(g, '#a8c8e8');
      A.rr(g, -0.62, 2.6 + ay * 1.6, 1.24, 1.0, 0.35); A.fs(g, '#5b7da8');
      if (lift) { A.circle(g, 0, 2.4 + ay * 2.4 - 1.2, 1.1); A.fs(g, '#eef6ff'); }
      g.restore();
    }
    A.rr(g, -0.75, -9.0, 1.5, 1.2, 0.35); A.fs(g, '#d6ecff');
    A.rr(g, -0.55, -8.7, 1.1, 0.32, 0.12); A.fl(g, br >= 0 ? '#ffffff' : '#7fe3ff');
    A.glow(g, 0, -8.55, 1.0 + (br >= 0 ? 1.4 : 0), '#7fe3ff', 0.8);
  }
  function dragon(g, B, t) {
    const flap = Math.sin(t * 3.2), br = posing(B, 'breath'), dv = posing(B, 'dive');
    if (dv >= 0) g.translate(0, Math.sin(dv * Math.PI) * 1.5);
    for (const s of [-1, 1]) {
      const tip = -3.2 - flap * 1.6;
      A.poly(g, [s * 0.8, -2.2, s * 3.0, tip - 0.6, s * 6.4, tip + 0.4, s * 5.2, -1.0 - flap * 0.4, s * 3.6, -0.6, s * 2.2, -0.9, s * 1.0, -1.1]); A.fs(g, '#4a2f33');
      for (const f of [0.35, 0.6, 0.85]) A.line(g, s * 0.9, -2.0, s * (0.9 + 5.4 * f), tip + 0.4 * f - 0.3 + f * 1.2, '#ff7a3d', 0.07);
      A.line(g, s * 0.8, -2.2, s * 6.4, tip + 0.4, '#2a1a1e', 0.14);
    }
    A.ell(g, 0, -1.7, 1.3, 1.6); A.fs(g, '#3b2a2e');
    for (let i = 0; i < 4; i++) A.line(g, -0.6, -2.6 + i * 0.45, 0.6, -2.6 + i * 0.45, '#ff6a2a', 0.08);
    A.glow(g, 0, -1.9, 1.6, '#ff6a2a', 0.45);
    g.save(); g.translate(0, -3.4 + (dv >= 0 ? 0.6 : 0));
    const jaw = br >= 0 ? 0.35 + Math.sin(br * Math.PI) * 0.4 : 0.08;
    A.poly(g, [-0.9, -0.4, 0.9, -0.4, 0.6, 0.5 + jaw, -0.6, 0.5 + jaw]); A.fs(g, '#2e2024');
    A.poly(g, [-1.1, -1.2, 1.1, -1.2, 1.0, -0.2, 0.5, 0.25, -0.5, 0.25, -1.0, -0.2]); A.fs(g, '#4a2f33');
    for (const s of [-1, 1]) {
      A.poly(g, [s * 0.75, -1.1, s * 1.5, -2.1, s * 1.0, -0.9]); A.fs(g, '#c9b39a');
      A.poly(g, [s * 0.25, -0.75, s * 0.75, -0.85, s * 0.6, -0.55]); A.fl(g, '#ffd23f');
      A.glow(g, s * 0.5, -0.72, 0.6, '#ffd23f', 0.8);
    }
    if (br >= 0) { A.glow(g, 0, 0.5, 1.6, '#ff7a2a', 1); A.ell(g, 0, 0.35, 0.45, 0.25 + jaw * 0.3); A.fl(g, '#fff0b0'); }
    g.restore();
  }
  function omega(g, B, t) {
    const ar = posing(B, 'arms'), cy = -3.8;
    const ring = (front, tilt, rx, ry, col) => { g.save(); g.translate(0, cy); g.rotate(tilt); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); g.strokeStyle = A.C(col); g.lineWidth = 0.28; g.stroke(); g.restore(); };
    ring(false, 0.3 + Math.sin(t * 0.5) * 0.1, 4.6, 1.2, '#a98bff'); ring(false, -0.5, 4.0, 0.9, '#62f2ff');
    for (let i = 0; i < 4; i++) {
      const a = i * TAU / 4 + Math.PI / 4 + t * 0.25, ex = Math.cos(a) * 4.0, ey = cy + Math.sin(a) * 3.0;
      g.beginPath(); g.moveTo(Math.cos(a) * 2.2, cy + Math.sin(a) * 2.2); g.lineTo(ex, ey); g.strokeStyle = A.OUT; g.lineWidth = 0.6; g.stroke(); g.strokeStyle = A.C('#4a3a7a'); g.lineWidth = 0.42; g.stroke();
      A.circle(g, ex, ey, 0.45); A.fs(g, '#2a1f4a');
      A.glow(g, ex, ey, 0.8 + (ar >= 0 ? 1.4 : 0), '#ff5fd8', 0.7);
    }
    A.circle(g, 0, cy, 2.6); A.fs(g, '#2a1f4a');
    A.circle(g, -0.8, cy - 0.9, 1.0); A.fl(g, '#ffffff', 0.08);
    for (let i = 0; i < 6; i++) { g.save(); g.translate(0, cy); g.rotate(i * TAU / 6 + t * 0.2); A.line(g, 0, -2.6, 0, -2.1, '#62f2ff', 0.08); g.restore(); }
    const eye = (t * 0.6) % 1 < 0.5 ? '#62f2ff' : '#ff5fd8';
    A.circle(g, 0, cy, 1.3); A.fs(g, '#e9e4ff');
    A.circle(g, Math.sin(t * 0.9) * 0.25, cy + Math.cos(t * 0.7) * 0.15, 0.75); A.fl(g, eye);
    A.circle(g, Math.sin(t * 0.9) * 0.25, cy + Math.cos(t * 0.7) * 0.15, 0.32); A.fl(g, '#0b0820');
    A.glow(g, 0, cy, 2.4, eye, 0.5);
    ring(true, 0.3 + Math.sin(t * 0.5) * 0.1, 4.6, 1.2, '#a98bff'); ring(true, -0.5, 4.0, 0.9, '#62f2ff');
  }
  const BOSS_ART = { crab: crab, scorpion: scorpion, titan: titan, dragon: dragon, omega: omega };
  function boss(g, B, t) {
    if (B.mode === 'stagger' || B.mode === 'dying') g.rotate(Math.sin(t * 20) * 0.03);
    (BOSS_ART[B.b] || crab)(g, B, t);
    if (B.mode === 'dying') { A.glow(g, (Math.random() - 0.5) * 4, -B.h * Math.random(), 2, '#ffd27a', 0.9); }
  }
  // the question shield: painted once into a picture at its size on screen (it stands still while it is up), then
  // only copied with a gentle pulse; while the boss walks in it is a plain bubble
  let shieldMemo = { key: '', cv: null };
  function bossShield(g, B, t) {
    const cy = -B.h * 0.55 - (B.b === 'omega' ? 0.3 : 0), rx = B.r * 1.25, ry = Math.max(B.h * 0.75, B.r * 0.9);
    if (B.mode === 'enter') {
      A.ell(g, 0, cy, rx, ry); g.fillStyle = 'rgba(98,242,255,0.08)'; g.fill();
      g.lineWidth = 0.14; g.strokeStyle = 'rgba(160,250,255,0.5)'; g.stroke();
      return;
    }
    const T = g.getTransform(), k = Math.hypot(T.a, T.b), key = B.b + ':' + Math.round(k * 4) + ':' + Math.round(rx * 10) + ':' + Math.round(ry * 10);
    if (shieldMemo.key !== key) {
      const pad = 6, w = Math.ceil(rx * 2 * k + pad * 2), h = Math.ceil(ry * 2 * k + pad * 2);
      const c = canvas(w, h), x = c.getContext('2d');
      x.translate(w / 2, h / 2); x.scale(k, k);
      A.ell(x, 0, 0, rx, ry); x.fillStyle = 'rgba(98,242,255,0.15)'; x.fill();
      x.lineWidth = 0.14; x.strokeStyle = 'rgba(160,250,255,0.8)'; x.stroke();
      x.save(); A.ell(x, 0, 0, rx, ry); x.clip();
      x.strokeStyle = 'rgba(190,252,255,0.35)'; x.lineWidth = 0.05; x.beginPath();
      const s = 1.1;
      for (let y = -ry; y < ry; y += s * 0.87) for (let xx = -rx - ((Math.round(y / (s * 0.87)) & 1) ? s / 2 : 0); xx < rx; xx += s) {
        const p = A.hexPts(xx, y, s * 0.5, s * 0.5);
        x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.closePath();
      }
      x.stroke();
      x.restore();
      shieldMemo = { key: key, cv: c, w: w / k, h: h / k };
    }
    const a = 0.85 + Math.sin(t * 3) * 0.15;
    const ga = g.globalAlpha; g.globalAlpha = ga * a;
    g.drawImage(shieldMemo.cv, -shieldMemo.w / 2, cy - shieldMemo.h / 2, shieldMemo.w, shieldMemo.h);
    g.globalAlpha = ga;
  }

  /* ================= weapon icons for the buttons ================= */
  function weaponIcon(g, w, size) {
    g.save(); g.translate(size / 2, size / 2); g.scale(size / 2, size / 2); g.lineJoin = 'round'; g.lineCap = 'round';
    const st = (col, wd) => { g.strokeStyle = col; g.lineWidth = wd; g.stroke(); };
    if (w === 'blaster') { g.beginPath(); g.moveTo(-0.55, 0.3); g.lineTo(0.55, -0.3); st('#62f2ff', 0.34); g.beginPath(); g.moveTo(-0.55, 0.3); g.lineTo(0.55, -0.3); st('#ffffff', 0.12); }
    else if (w === 'gatling') { for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-0.6, 0.3 + i * 0.22); g.lineTo(0.5, -0.1 + i * 0.22); st('#ffe066', 0.13); } }
    else if (w === 'rockets') { g.beginPath(); g.moveTo(-0.5, 0.5); g.lineTo(0.25, -0.25); st('#e8ecf5', 0.32); g.beginPath(); g.moveTo(0.18, -0.18); g.lineTo(0.55, -0.55); st('#ff5a6a', 0.22); g.beginPath(); g.arc(-0.55, 0.55, 0.18, 0, TAU); g.fillStyle = '#ffb347'; g.fill(); }
    else if (w === 'lightning') { g.beginPath(); g.moveTo(0.15, -0.7); g.lineTo(-0.3, 0.05); g.lineTo(0.05, 0.05); g.lineTo(-0.15, 0.7); g.lineTo(0.35, -0.15); g.lineTo(0.0, -0.15); g.closePath(); g.fillStyle = '#8fd8ff'; g.fill(); g.lineWidth = 0.06; g.strokeStyle = '#ffffff'; g.stroke(); }
    else if (w === 'plasma') { const gr = g.createRadialGradient(0, 0, 0.05, 0, 0, 0.62); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#5dffb1'); gr.addColorStop(1, 'rgba(93,255,177,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 0.62, 0, TAU); g.fill(); }
    else if (w === 'freeze') { for (let i = 0; i < 3; i++) { g.save(); g.rotate(i * Math.PI / 3); g.beginPath(); g.moveTo(0, -0.62); g.lineTo(0, 0.62); st('#bff4ff', 0.12); for (const y of [-0.38, 0.38]) { g.beginPath(); g.moveTo(-0.14, y - Math.sign(y) * 0.14); g.lineTo(0, y); g.lineTo(0.14, y - Math.sign(y) * 0.14); st('#bff4ff', 0.08); } g.restore(); } }
    else if (w === 'laser') { g.beginPath(); g.moveTo(-0.65, 0.4); g.lineTo(0.65, -0.4); st('rgba(255,79,109,0.5)', 0.4); g.beginPath(); g.moveTo(-0.65, 0.4); g.lineTo(0.65, -0.4); st('#ffe6ec', 0.12); }
    else if (w === 'nova') { for (let i = 0; i < 8; i++) { g.save(); g.rotate(i * Math.PI / 4); g.beginPath(); g.moveTo(0, -0.18); g.lineTo(0.12, -0.65); g.lineTo(-0.12, -0.65); g.closePath(); g.fillStyle = i % 2 ? '#ff9ff3' : '#c18cff'; g.fill(); g.restore(); } g.beginPath(); g.arc(0, 0, 0.24, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); }
    g.restore();
  }

  return { background, weather, props, propSprite, blockStyle, block, gateCols, ice, boss, bossShield, weaponIcon, KINDS };
})();
