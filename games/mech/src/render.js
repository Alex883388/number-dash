/* games/mech/src/render.js — draws a Mech Blaster level in 2.5D: a camera behind and above the mech looks down a road
   that bends and climbs (bends and hills are drawing only; the rules see a straight road), with the sky, distant
   scenery and roadside things of the world, every enemy, shot and spark in depth order, and the mech in front.
   MR.resize(canvas) fits the canvas; MR.draw(S, t) draws a frame; MR.tick(S, dt) moves the sparks; MR.fx(event)
   turns the engine's events into explosions and pops; MR.pick(x, y) says what a finger touched. Needs ART, ART2, MB. */
const MR = (function () {
  'use strict';
  const NEAR = -10.8, FAR = 150, SEG = 2, CAMZ = -11.5, CAMH = 5.6, ROAD = 4.8, SHOULDER = 6.3;
  const WORLDS = [
    { id: 'city', name: 'Neon City', sky: ['#120a2e', '#3b1460', '#ff4fa3'], fog: '#4b1d6b', ground: ['#1a1433', '#1f1840'], road: ['#2a2540', '#2f2a47'],
      shoulder: ['#3b3360', '#ff4fd8'], lane: '#5ff3ff', edge: '#ff4fd8', neon: true, curve: 0.0022, hill: 0.0006 },
    { id: 'desert', name: 'Dune Desert', sky: ['#ff9e5e', '#ffc98a', '#fff0c8'], fog: '#f6d2a0', ground: ['#e7b06a', '#dfa761'], road: ['#6e5444', '#755a49'],
      shoulder: ['#c48b50', '#fff3d6'], lane: '#fff6dc', edge: '#ffffff', curve: 0.0018, hill: 0.0013 },
    { id: 'ice', name: 'Frost Peaks', sky: ['#4fa8f0', '#a2d8ff', '#eaf7ff'], fog: '#dcefff', ground: ['#f4faff', '#e6f2fc'], road: ['#57728f', '#5e7a97'],
      shoulder: ['#c4dcf0', '#5fc8ff'], lane: '#ffffff', edge: '#8fe8ff', curve: 0.0024, hill: 0.0014 },
    { id: 'volcano', name: 'Volcano Forge', sky: ['#160707', '#4a140e', '#ff6a2a'], fog: '#5a2214', ground: ['#271411', '#2e1813'], road: ['#2c2729', '#322d30'],
      shoulder: ['#47271f', '#ff7a2a'], lane: '#ffb347', edge: '#ff5a1f', neon: true, curve: 0.002, hill: 0.001 },
    { id: 'space', name: 'Star Station', sky: ['#03030f', '#0b1038', '#2a1f6a'], fog: '#161640', ground: ['#0a0c22', '#0d102a'], road: ['#383d5a', '#3f4563'],
      shoulder: ['#252a45', '#a98bff'], lane: '#7fffd4', edge: '#a98bff', neon: true, void: true, curve: 0.0026, hill: 0.0008 }
  ];
  // quality: below 1 when a slow device cannot keep up (the page lowers it), so fewer pixels are drawn
  let quality = 1;
  let cv = null, g = null, W = 800, H = 600, F = 600, HZ = 220, hzBase = 220, ratio = 1;
  let camX = 0, camY = CAMH, world = WORLDS[0], wIdx = 0, seed = 1, curveAmp = 0.002, hillAmp = 0.001, farHead = 0, farSlope = 0;
  const prof = { xo: new Float32Array(100), yo: new Float32Array(100), n: 0 };
  const P = { x: 0, y: 0, s: 1 };
  const parts = [];
  let hits = [], panels = [], orbs = [];
  const fogMemo = new Map();
  // set MR.profile = {} to collect how long each part of a frame takes (for tuning)
  let timing = null;

  function resize(canvas) {
    cv = canvas; g = cv.getContext('2d');
    const r = cv.getBoundingClientRect();
    W = Math.max(320, Math.round(r.width)); H = Math.max(240, Math.round(r.height));
    // sharp but not too heavy: at most 2 device pixels per point and about 2.6 million pixels in all
    ratio = Math.max(0.75, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2.6e6 / (W * H))) * quality);
    cv.width = Math.round(W * ratio); cv.height = Math.round(H * ratio);
    F = Math.min(H * 1.1, W * 1.15);
    // the camera rides high behind the mech and looks down the road: the horizon sits in the top quarter
    hzBase = H * (W > H ? 0.25 : 0.3);
    HZ = hzBase;
  }
  function setLevel(L) {
    wIdx = L.w || 0; world = WORLDS[wIdx] || WORLDS[0]; seed = L.id * 97.13;
    curveAmp = world.curve * (L.curve != null ? L.curve : 1); hillAmp = world.hill * (L.hill != null ? L.hill : 1);
    parts.length = 0; camX = 0;
  }
  // the road's bend and climb at track distance d (smooth, different in every level)
  function bend(d) { const f = Math.min(1, Math.max(0, (d - 30) / 80)); return curveAmp * f * (0.62 * Math.sin(d * 0.0049 + seed) + 0.38 * Math.sin(d * 0.0131 + seed * 1.7)); }
  function climb(d) { const f = Math.min(1, Math.max(0, (d - 30) / 80)); return hillAmp * f * (0.7 * Math.sin(d * 0.0078 + seed * 0.6) + 0.3 * Math.sin(d * 0.019 + seed * 2.3)); }
  function profile(S) {
    const n = Math.ceil(FAR / SEG) + 1;
    let head = 0, slope = 0, x = 0, y = 0;
    prof.xo[0] = 0; prof.yo[0] = 0;
    for (let i = 0; i < n; i++) {
      const d = S.d + i * SEG;
      head += bend(d) * SEG; slope += climb(d) * SEG;
      x += head * SEG; y += slope * SEG;
      prof.xo[i + 1] = x; prof.yo[i + 1] = y;
    }
    prof.n = n;
    farHead = head; farSlope = slope;
  }
  function proj(x, y, z) {
    let xo = 0, yo = 0;
    if (z > 0) {
      const f = z / SEG, i = Math.min(prof.n - 1, Math.floor(f)), u = Math.min(1, f - i);
      xo = prof.xo[i] + (prof.xo[i + 1] - prof.xo[i]) * u; yo = prof.yo[i] + (prof.yo[i + 1] - prof.yo[i]) * u;
    }
    const s = F / Math.max(0.3, z - CAMZ);
    P.s = s; P.x = W / 2 + (x + xo - camX) * s; P.y = HZ - (y + yo - camY) * s;
    return P;
  }
  function fogged(col, z) {
    const f = Math.min(1, Math.max(0, (z - 25) / (FAR - 25)));
    const k = Math.round(Math.pow(f, 1.25) * 14);
    if (!k) return col;
    const key = col + k + world.fog;
    let v = fogMemo.get(key);
    if (!v) { v = ART.mix(col, world.fog, k / 16); fogMemo.set(key, v); }
    return v;
  }

  /* ================= the road ================= */
  function quad(x1, y1, x2, y2, x3, y3, x4, y4, col) {
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.lineTo(x4, y4); g.closePath(); g.fillStyle = col; g.fill();
  }
  function road(S) {
    const first = Math.floor((S.d + NEAR) / SEG), last = Math.floor((S.d + FAR - 1) / SEG);
    let pa = null;
    const pts = [];
    for (let k = first; k <= last + 1; k++) {
      const z = Math.max(NEAR, k * SEG - S.d);
      proj(0, 0, z);
      pts.push({ k: k, z: z, x: P.x, y: P.y, s: P.s });
    }
    for (let i = pts.length - 2; i >= 0; i--) {
      const A = pts[i], B = pts[i + 1], k = A.k, alt = k & 1, z = A.z;
      if (B.y >= A.y - 0.01 && i) continue;
      if (!world.void) { g.fillStyle = fogged(world.ground[alt], z); g.fillRect(0, B.y - 1, W, A.y - B.y + 2); }
      const sa = A.s, sb = B.s;
      // shoulders (kerb stripes in two colours)
      const kerb = (k >> 1) & 1;
      quad(A.x - SHOULDER * sa, A.y, A.x - ROAD * sa, A.y, B.x - ROAD * sb, B.y, B.x - SHOULDER * sb, B.y, fogged(kerb ? world.shoulder[1] : world.shoulder[0], z));
      quad(A.x + ROAD * sa, A.y, A.x + SHOULDER * sa, A.y, B.x + SHOULDER * sb, B.y, B.x + ROAD * sb, B.y, fogged(kerb ? world.shoulder[1] : world.shoulder[0], z));
      quad(A.x - ROAD * sa, A.y, A.x + ROAD * sa, A.y, B.x + ROAD * sb, B.y, B.x - ROAD * sb, B.y, fogged(world.road[alt], z));
      if (world.void) {
        quad(A.x - SHOULDER * sa, A.y, A.x - (SHOULDER - 0.25) * sa, A.y, B.x - (SHOULDER - 0.25) * sb, B.y, B.x - SHOULDER * sb, B.y, fogged(world.edge, z));
        quad(A.x + (SHOULDER - 0.25) * sa, A.y, A.x + SHOULDER * sa, A.y, B.x + SHOULDER * sb, B.y, B.x + (SHOULDER - 0.25) * sb, B.y, fogged(world.edge, z));
        g.fillStyle = 'rgba(10,12,40,0.9)'; g.fillRect(A.x - SHOULDER * sa, A.y, SHOULDER * 2 * sa, Math.max(1, 0.5 * sa));
      }
      // lane dashes and edge lines
      if (k % 4 < 2) for (const lx of [-1.6, 1.6]) quad(A.x + (lx - 0.09) * sa, A.y, A.x + (lx + 0.09) * sa, A.y, B.x + (lx + 0.09) * sb, B.y, B.x + (lx - 0.09) * sb, B.y, fogged(world.lane, z));
      for (const ex of [-ROAD, ROAD]) quad(A.x + (ex - 0.11) * sa, A.y, A.x + (ex + 0.11) * sa, A.y, B.x + (ex + 0.11) * sb, B.y, B.x + (ex - 0.11) * sb, B.y, fogged(world.edge, z));
      pa = A;
    }
    if (world.neon) {
      // glowing edges: one wide soft pass over the near road
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35; g.strokeStyle = world.edge; g.lineCap = 'round';
      for (const ex of [-ROAD, ROAD]) {
        g.beginPath();
        for (let i = 0; i < pts.length; i++) { const A = pts[i]; if (A.z > 70) break; const x = A.x + ex * A.s; if (i) g.lineTo(x, A.y); else g.moveTo(x, A.y); }
        g.lineWidth = Math.max(3, F * 0.012); g.stroke();
      }
      g.restore();
    }
    return pa;
  }

  /* ================= boxes in perspective (crates, walls, gate pylons) ================= */
  function box(x, y, z, w, h, d, cols, deco) {
    const x0 = x - w / 2, x1 = x + w / 2, zf = z - d / 2, zb = z + d / 2, y1 = y + h;
    const p = (X, Y, Z) => { proj(X, Y, Z); return [P.x, P.y]; };
    const f00 = p(x0, y, zf), f10 = p(x1, y, zf), f11 = p(x1, y1, zf), f01 = p(x0, y1, zf);
    const b01 = p(x0, y1, zb), b11 = p(x1, y1, zb), b00 = p(x0, y, zb), b10 = p(x1, y, zb);
    const fz = fogged;
    // side faces we can see, then the top, then the front
    if (b00[0] > f00[0] + 0.5 && camX < x0) quad(f00[0], f00[1], f01[0], f01[1], b01[0], b01[1], b00[0], b00[1], fz(cols[2], z));
    if (b10[0] < f10[0] - 0.5 && camX > x1) quad(f10[0], f10[1], f11[0], f11[1], b11[0], b11[1], b10[0], b10[1], fz(cols[2], z));
    if (b01[1] < f01[1]) quad(f01[0], f01[1], f11[0], f11[1], b11[0], b11[1], b01[0], b01[1], fz(cols[1], z));
    quad(f00[0], f00[1], f10[0], f10[1], f11[0], f11[1], f01[0], f01[1], fz(cols[0], z));
    g.lineWidth = Math.max(1, F * 0.002); g.strokeStyle = 'rgba(23,19,43,0.75)';
    g.beginPath(); g.moveTo(f00[0], f00[1]); g.lineTo(f10[0], f10[1]); g.lineTo(f11[0], f11[1]); g.lineTo(f01[0], f01[1]); g.closePath(); g.stroke();
    if (deco) deco(f00, f10, f11, f01);
    return { l: f00[0], r: f10[0], t: Math.min(f01[1], b01[1]), b: f00[1] };
  }
  function stripes(a, b, c2, d, col, n) {
    g.save(); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c2[0], c2[1]); g.lineTo(d[0], d[1]); g.closePath(); g.clip();
    const w = b[0] - a[0], h = a[1] - d[1]; g.fillStyle = col;
    for (let i = -2; i < n + 2; i++) { const x = a[0] + (i / n) * w; quad(x, a[1], x + w / n / 2, a[1], x + w / n / 2 + h * 0.6, d[1], x + h * 0.6, d[1], col); }
    g.restore();
  }

  /* ================= sprites ================= */
  function draw(S, t) {
    if (!g) return;
    const M = S.mech;
    camX += (M.x * 0.6 - camX) * 0.12;
    camY = CAMH + M.y * 0.3;
    // in a boss fight the camera tilts up a little so the boss stands clear of the question
    HZ += (hzBase + (S.boss ? H * 0.07 : 0) - HZ) * 0.06;
    profile(S);
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    const sh = S.shake > 0 ? S.shake : 0;
    if (sh) g.translate((Math.random() - 0.5) * sh * 14, (Math.random() - 0.5) * sh * 10);
    const T0 = timing ? performance.now() : 0;
    if (!ART.dbg.noBg) ART2.background(g, wIdx, W, H, HZ, -farHead * W * 0.55, farSlope * H * 0.5, t, S.L, hzBase, ratio);
    const T1 = timing ? performance.now() : 0;
    if (!ART.dbg.noRoad) road(S);
    const T2 = timing ? performance.now() : 0;
    hits = []; panels = []; orbs = [];
    decals(S, t);
    // everything with a depth, far to near
    const list = [];
    ART2.props(wIdx, S.d, NEAR + 2, FAR, seed, (z, x, kind, sz) => list.push({ z: z, f: 'prop', x: x, kind: kind, sz: sz }));
    for (const e of S.ents) list.push({ z: e.z, f: 'ent', e: e });
    for (const b of S.bullets) list.push({ z: b.z, f: 'bullet', b: b });
    for (const s of S.shots) list.push({ z: s.z, f: 'shot', s: s });
    for (const s of S.shells) list.push({ z: s.z, f: 'shell', s: s });
    for (const p of parts) list.push({ z: p.z, f: 'part', p: p });
    for (const m of S.marks) if (m.k === 'bomb') list.push({ z: m.z, f: 'bomb', m: m });
    if (S.boss && S.boss.mode === 'shield') S.boss.orbs.forEach((o, i) => list.push({ z: o.z, f: 'orb', o: o, i: i }));
    list.push({ z: 0.01, f: 'mech' });
    list.sort((a, b) => b.z - a.z);
    for (const it of list) {
      if (it.z > FAR || it.z < NEAR + 0.5) continue;
      const fade = it.z > FAR - 18 ? (FAR - it.z) / 18 : 1;
      g.globalAlpha = fade;
      if (it.f === 'prop') drawProp(it);
      else if (it.f === 'ent') drawEnt(S, it.e, t);
      else if (it.f === 'bullet') drawBullet(it.b, t);
      else if (it.f === 'shot') drawShot(it.s, t);
      else if (it.f === 'shell') drawShell(it.s, t);
      else if (it.f === 'part') drawPart(it.p);
      else if (it.f === 'bomb') drawBomb(it.m, t);
      else if (it.f === 'orb') drawOrb(S, S.boss, it.o, it.i, t);
      else drawMech(S, t);
      g.globalAlpha = 1;
    }
    const T3 = timing ? performance.now() : 0;
    beams(S, t);
    ART2.weather(g, wIdx, W, H, t, S);
    overlay(S, t);
    if (timing) { const T4 = performance.now(); timing.bg += T1 - T0; timing.road += T2 - T1; timing.sprites += T3 - T2; timing.fx += T4 - T3; timing.n++; }
  }
  function drawProp(it) {
    proj(it.x, 0, it.z);
    const sp = ART2.propSprite(wIdx, it.kind);
    if (!sp) return;
    const s = P.s * it.sz, w = sp.w * s, h = sp.h * s;
    if (P.x + w < -50 || P.x - w > W + 50 || h < 1.5) return;
    g.drawImage(sp.cv, P.x - sp.ax * s, P.y - sp.ay * s, w, h);
  }
  function shadow(x, y, z, r, a) {
    proj(x, 0, z);
    const s = P.s, k = Math.max(0.3, 1 - y * 0.08);
    g.beginPath(); g.ellipse(P.x, P.y, r * s * k, r * s * 0.32 * k, 0, 0, Math.PI * 2);
    g.fillStyle = 'rgba(10,8,25,' + (a || 0.32) * k + ')'; g.fill();
  }
  function bar(x, y, w, f, col) {
    g.fillStyle = 'rgba(20,16,40,0.75)'; g.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
    g.fillStyle = col || '#ff5a6a'; g.fillRect(x - w / 2, y, w * Math.max(0, f), 4);
  }
  const ENT_ART = { drone: 'drone', walker: 'walker', turret: 'turret', bike: 'bike', shield: 'shield', bomber: 'bomber', spider: 'spider', sentinel: 'sentinel', rival: 'rival', carrier: 'carrier', missile: 'missile', mine: 'mine', pick: 'pick' };
  function drawEnt(S, e, t) {
    if (e.c === 'gate') return drawGate(S, e, t);
    if (e.c === 'boss') return drawBoss(S, e, t);
    const k = e.k;
    if (k === 'crate' || k === 'barrier' || k === 'block') return drawBlock(S, e, t);
    if (k === 'fence') return drawFence(S, e, t);
    if (k === 'geyser') return drawGeyser(S, e, t);
    proj(e.x, e.y, e.z);
    const vs = e.vs || (k === 'pick' ? 1.3 : 1), s = P.s * vs;
    if (P.x < -s * 6 || P.x > W + s * 6) return;
    const base = MB.EN[k];
    if (k !== 'pick') { shadow(e.x, e.y, e.z, e.r * vs * (base && base.fly ? 0.9 : 1), base && base.fly ? 0.22 : 0.3); proj(e.x, e.y, e.z); }
    const x = P.x, y = P.y;
    g.save(); g.translate(x, y);
    if (s < 3.5) {
      g.fillStyle = k === 'pick' ? '#ffd23f' : '#2b2f4a'; g.beginPath(); g.arc(0, -e.h * s * 0.5, Math.max(1.5, e.r * s), 0, Math.PI * 2); g.fill();
    } else {
      g.scale(s, s);
      ART.begin(g, s, e.hit > 0 ? 1 : e.frz > 0 ? 2 : 0);
      if (k === 'boulder') ART.boulder(g, e, t, wIdx === 2 || e.snow ? 'snow' : wIdx === 3 ? 'lava' : 'rock');
      else if (ENT_ART[k]) ART[ENT_ART[k]](g, e, t);
      ART.setMode(0);
      if (e.frz > 0) { g.globalAlpha *= 0.55; ART2.ice(g, e); }
    }
    g.restore();
    if (e.z > MB.RANGE) { /* out of range: cannot be targeted yet */ }
    else if (e.c === 'enemy' && k !== 'missile') hits.push({ id: e.id, x: x, y: y - e.h * s * 0.5 - (k === 'drone' ? 0.3 * s : 0), r: Math.max(e.r * s * 1.15, 18), z: e.z });
    else if (e.c === 'obs' && e.hp > 0) hits.push({ id: e.id, x: x, y: y - e.h * s * 0.5, r: Math.max(e.r * s, 14), z: e.z });
    else if (k === 'missile') hits.push({ id: e.id, x: x, y: y - 0.3 * s, r: Math.max(0.8 * s, 20), z: e.z });
    if ((e.c === 'enemy' && e.max > 2 && e.hp < e.max && k !== 'missile') && s > 5) bar(x, y - (e.h + (e.y ? 0.4 : 0.6)) * s - 10, Math.max(28, e.r * s * 1.6), e.hp / e.max);
    // the turret's aiming laser: a warning line to where it will shoot
    if (k === 'turret' && e.cd < e.tel && e.z > 14 && e.z < 70 && !e.frz) {
      proj(e.x, 1.5, e.z); const ax = P.x, ay = P.y; proj(S.mech.x, 1.6, 0.5);
      g.save(); g.globalAlpha = 0.35 + 0.4 * (1 - e.cd / e.tel); g.strokeStyle = '#ff3d3d'; g.lineWidth = 2; g.setLineDash([8, 6]);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(P.x, P.y); g.stroke(); g.restore();
    }
  }
  function drawBlock(S, e, t) {
    const k = e.k, wd = ART2.blockStyle(wIdx);
    if (k === 'crate') {
      const r = box(e.x, 0, e.z, 2.0, 1.9, 1.8, e.hit > 0 ? ['#ffffff', '#ffffff', '#ffffff'] : ['#d9a35c', '#f0c27a', '#b98546'], (a, b, c2, d) => {
        const w = b[0] - a[0], h = a[1] - d[1];
        g.strokeStyle = 'rgba(80,45,15,0.55)'; g.lineWidth = Math.max(1, w * 0.05);
        g.strokeRect(a[0] + w * 0.08, d[1] + h * 0.08, w * 0.84, h * 0.84);
        g.beginPath(); g.moveTo(a[0] + w * 0.08, a[1] - h * 0.08); g.lineTo(b[0] - w * 0.08, d[1] + h * 0.08); g.stroke();
      });
      hits.push({ id: e.id, x: (r.l + r.r) / 2, y: (r.t + r.b) / 2, r: Math.max(16, (r.r - r.l) * 0.55), z: e.z });
    } else if (k === 'barrier') {
      box(e.x, 0, e.z, 2.9, 1.3, 0.8, wd.barrier, (a, b, c2, d) => stripes(a, b, c2, d, wd.stripe, 5));
    } else {
      ART2.block(g, wIdx, e, box, proj, P, t);
    }
  }
  function drawFence(S, e, t) {
    box(-SHOULDER + 0.2, 0, e.z, 0.5, 1.5, 0.5, ['#4a4f6b', '#6a7090', '#3a3f5a']);
    box(SHOULDER - 0.2, 0, e.z, 0.5, 1.5, 0.5, ['#4a4f6b', '#6a7090', '#3a3f5a']);
    if (e.dead) return;
    proj(-SHOULDER + 0.2, 0.7, e.z); const ax = P.x, ay = P.y; const s = P.s; proj(SHOULDER - 0.2, 0.7, e.z);
    const fl = 0.75 + Math.sin(t * 30 + e.id) * 0.25;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,60,80,' + 0.35 * fl + ')'; g.lineWidth = Math.max(3, s * 0.45); g.beginPath(); g.moveTo(ax, ay); g.lineTo(P.x, P.y); g.stroke();
    g.strokeStyle = 'rgba(255,220,220,' + fl + ')'; g.lineWidth = Math.max(1.5, s * 0.1); g.beginPath(); g.moveTo(ax, ay); g.lineTo(P.x, P.y); g.stroke();
    g.restore();
  }
  function drawGeyser(S, e, t) {
    if (e.phase !== 'blow') return;
    proj(e.x, 0, e.z); const s = P.s, x = P.x, y = P.y, h = 7 * s, w = 1.4 * s;
    const gr = g.createLinearGradient(0, y - h, 0, y);
    gr.addColorStop(0, 'rgba(255,200,80,0)'); gr.addColorStop(0.3, 'rgba(255,140,40,0.85)'); gr.addColorStop(1, 'rgba(255,240,180,0.95)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - w * 0.5, y); g.quadraticCurveTo(x - w * (0.8 + Math.sin(t * 20) * 0.1), y - h * 0.5, x - w * 0.2, y - h);
    g.lineTo(x + w * 0.2, y - h); g.quadraticCurveTo(x + w * (0.8 + Math.cos(t * 18) * 0.1), y - h * 0.5, x + w * 0.5, y); g.closePath(); g.fill();
    ART.glow(g, x, y - h * 0.4, w * 2.2, '#ff7a2a', 0.8);
  }
  function drawGate(S, e, t) {
    const z = e.z, open = e.open, ot = e.openT || 0;
    const cols = ART2.gateCols(wIdx);
    // the energy field and the answer panels, then the pylons in front of the field
    if (!open || ot < 0.35) {
      const a = open ? 1 - ot / 0.35 : 1;
      proj(-SHOULDER + 0.6, 0, z); const lx = P.x, by = P.y, s = P.s; proj(SHOULDER - 0.6, 5.0, z); const rx = P.x, ty = P.y;
      g.save(); g.globalAlpha *= a;
      const gr = g.createLinearGradient(0, ty, 0, by);
      gr.addColorStop(0, ART.rgba(cols.field, 0.12)); gr.addColorStop(1, ART.rgba(cols.field, 0.38));
      g.fillStyle = gr; g.fillRect(lx, ty, rx - lx, by - ty);
      g.strokeStyle = ART.rgba(cols.field, 0.25); g.lineWidth = 1;
      for (let i = 0; i < 9; i++) { const yy = ty + ((i / 9 + t * 0.35) % 1) * (by - ty); g.beginPath(); g.moveTo(lx, yy); g.lineTo(rx, yy); g.stroke(); }
      g.restore();
      e.panels.forEach((p, i) => {
        if (p.gone) return;
        proj(MB.laneX(i), 2.5, z - 0.2);
        const s2 = P.s, cx = P.x, cy = P.y, w = 2.75 * s2, h = 2.35 * s2;
        const hint = e.hint && p.ok, bad = p.bad, pulse = 0.5 + 0.5 * Math.sin(t * 6);
        g.save(); g.globalAlpha *= a;
        g.translate(cx, cy);
        const hx = w / 2, hy = h / 2;
        g.beginPath(); g.moveTo(-hx * 0.55, -hy); g.lineTo(hx * 0.55, -hy); g.lineTo(hx, 0); g.lineTo(hx * 0.55, hy); g.lineTo(-hx * 0.55, hy); g.lineTo(-hx, 0); g.closePath();
        g.fillStyle = bad ? 'rgba(80,20,40,0.82)' : hint ? 'rgba(255,214,90,' + (0.75 + pulse * 0.2) + ')' : 'rgba(18,24,60,0.86)'; g.fill();
        g.lineWidth = Math.max(2, s2 * 0.12); g.strokeStyle = bad ? '#ff5a6a' : hint ? '#fff3b0' : cols.edge; g.stroke();
        if (!bad) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + (hint ? pulse * 0.4 : 0); g.lineWidth = Math.max(4, s2 * 0.35); g.strokeStyle = hint ? '#ffd23f' : cols.edge; g.stroke(); g.restore(); }
        const txt = p.text, fsz = Math.min(h * 0.46, w * 0.92 / Math.max(2.2, txt.length * 0.58));
        g.font = '700 ' + fsz + 'px ' + 'Fredoka, "Arial Rounded MT Bold", system-ui, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = bad ? 'rgba(255,170,180,0.55)' : hint ? '#3d2a00' : '#ffffff';
        g.fillText(txt, 0, fsz * 0.04);
        if (bad) { g.strokeStyle = '#ff5a6a'; g.lineWidth = Math.max(2, s2 * 0.14); g.beginPath(); g.moveTo(-hx * 0.4, -hy * 0.55); g.lineTo(hx * 0.4, hy * 0.55); g.moveTo(hx * 0.4, -hy * 0.55); g.lineTo(-hx * 0.4, hy * 0.55); g.stroke(); }
        g.restore();
        if (!open && !bad && z < 95) panels.push({ i: i, x: cx - w / 2, y: cy - h / 2, w: w, h: h });
      });
    }
    for (const sx of [-1, 1]) box(sx * (SHOULDER - 0.2), 0, z, 1.3, 6.2, 1.3, cols.pylon, (a, b, c2, d) => {
      const h = a[1] - d[1], w = b[0] - a[0];
      for (let i = 0; i < 4; i++) { g.fillStyle = (Math.floor(t * 4) + i) % 4 === 0 ? '#ffffff' : cols.edge; g.fillRect(a[0] + w * 0.3, d[1] + h * (0.12 + i * 0.2), w * 0.4, h * 0.06); }
    });
    box(0, 5.4, z, SHOULDER * 2 + 0.9, 0.9, 1.1, cols.pylon, (a, b, c2, d) => {
      const w = b[0] - a[0], h = a[1] - d[1];
      if (w > 60) {
        g.fillStyle = '#0d1030'; g.fillRect(a[0] + w * 0.06, d[1] + h * 0.15, w * 0.88, h * 0.7);
        const txt = open ? '✓ OPEN' : e.q.kind === 'words' ? 'MISSING WORD' : 'ANSWER GATE', fsz = Math.min(h * 0.62, w * 0.86 / Math.max(6, txt.length * 0.52));
        g.font = '700 ' + fsz + 'px Fredoka, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = open ? '#7dff9a' : cols.edge; g.fillText(txt, (a[0] + b[0]) / 2, (a[1] + d[1]) / 2);
      }
    });
  }
  function drawBoss(S, B, t) {
    proj(B.x, B.y, B.z);
    shadow(B.x, B.y, B.z, B.r * 1.1, 0.35);
    proj(B.x, B.y, B.z);
    const s = P.s, x = P.x, y = P.y;
    g.save(); g.translate(x, y); g.scale(s, s);
    if (B.mode === 'dying') { g.translate((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3); }
    ART.begin(g, s * (B.scale || 1), B.hit > 0 ? 1 : 0);
    g.save(); g.scale(B.scale || 1, B.scale || 1);
    ART2.boss(g, B, t);
    g.restore();
    ART.setMode(0);
    if ((B.mode === 'shield' || B.mode === 'enter') && !ART.dbg.noShield) ART2.bossShield(g, B, t);
    g.restore();
    hits.push({ id: B.id, x: x, y: y - B.h * s * 0.5, r: B.r * s, z: B.z });
  }
  // a boss's answer orb, drawn at its own depth (in front of the boss, behind anything nearer)
  function drawOrb(S, B, o, i, t) {
    {
      if (o.gone) return;
      proj(o.x, o.y, o.z);
      const r = 1.55 * P.s, hint = B.hint && o.ok, pulse = 0.5 + 0.5 * Math.sin(t * 6 + i);
      ART.glow(g, P.x, P.y, r * 2.2, o.bad ? '#ff5a6a' : hint ? '#ffd23f' : '#62f2ff', o.bad ? 0.3 : 0.65 + (hint ? pulse * 0.3 : 0));
      g.beginPath(); g.arc(P.x, P.y, r, 0, Math.PI * 2);
      g.fillStyle = o.bad ? 'rgba(80,20,40,0.85)' : hint ? 'rgba(255,214,90,0.95)' : 'rgba(18,24,60,0.9)'; g.fill();
      g.lineWidth = Math.max(2, P.s * 0.12); g.strokeStyle = o.bad ? '#ff5a6a' : hint ? '#fff3b0' : '#9ff6ff'; g.stroke();
      const fsz = Math.min(r * 0.95, r * 1.9 / Math.max(2, o.text.length * 0.55));
      g.font = '700 ' + fsz + 'px Fredoka, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = o.bad ? 'rgba(255,170,180,0.6)' : hint ? '#3d2a00' : '#ffffff'; g.fillText(o.text, P.x, P.y + fsz * 0.04);
      if (!o.bad) orbs.push({ i: i, x: P.x, y: P.y, r: r * 1.15 });
    }
  }
  function drawBullet(b, t) {
    proj(b.x, b.y, b.z);
    const s = P.s;
    if (b.low) {
      const w = (b.wide ? 5.6 : 1.2) * s, h = 0.55 * s;
      g.save(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = b.k === 'ring' ? 'rgba(255,160,60,0.75)' : 'rgba(255,150,50,0.8)';
      g.beginPath(); g.ellipse(P.x, P.y, w, h, 0, Math.PI, 0); g.lineTo(P.x + w * 0.8, P.y + h * 0.2); g.ellipse(P.x, P.y + h * 0.2, w * 0.8, h * 0.55, 0, 0, Math.PI, true); g.closePath(); g.fill();
      ART.glow(g, P.x, P.y, w * 1.1, '#ff9f43', 0.6);
      g.restore();
      return;
    }
    const r = b.r * s, col = b.k === 'heavy' ? '#c45cff' : b.k === 'bubble' ? '#6fd6ff' : '#ff3d6a';
    // a marker on the road under the shot shows its lane
    proj(b.x, 0, b.z); const gx = P.x, gy = P.y, gs = P.s;
    g.fillStyle = ART.rgba(col, 0.35); g.beginPath(); g.ellipse(gx, gy, b.r * gs * 1.2, b.r * gs * 0.35, 0, 0, Math.PI * 2); g.fill();
    proj(b.x, b.y, b.z);
    ART.glow(g, P.x, P.y, r * 3.2, col, 0.85);
    g.beginPath(); g.arc(P.x, P.y, r, 0, Math.PI * 2);
    g.fillStyle = b.k === 'bubble' ? 'rgba(160,230,255,0.45)' : ART.mix(col, '#ffffff', 0.55); g.fill();
    if (b.k === 'bubble') { g.strokeStyle = '#e6faff'; g.lineWidth = Math.max(1, r * 0.12); g.stroke(); }
    g.beginPath(); g.arc(P.x - r * 0.25, P.y - r * 0.25, r * 0.35, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
  }
  const SHOT_COL = { blaster: '#62f2ff', gatling: '#ffe066', rockets: '#ffb347', plasma: '#5dffb1', freeze: '#a6ecff', lightning: '#8fd8ff' };
  function drawShot(s, t) {
    proj(s.x, s.y, s.z); const x1 = P.x, y1 = P.y, sc = P.s;
    const back = s.k === 'rockets' ? 0.05 : 0.025;
    proj(s.x - s.vx * back, s.y - s.vy * back, s.z - s.vz * back);
    const col = SHOT_COL[s.k] || '#ffffff';
    if (s.k === 'rockets') {
      g.fillStyle = '#e8ecf5'; g.beginPath(); g.arc(x1, y1, Math.max(1.5, 0.22 * sc), 0, Math.PI * 2); g.fill();
      ART.glow(g, P.x, P.y, Math.max(4, 0.6 * sc), '#ffb347', 0.9);
      return;
    }
    if (s.k === 'plasma') { const r = s.r * sc; ART.glow(g, x1, y1, r * 3, col, 0.95); g.beginPath(); g.arc(x1, y1, r * 0.75, 0, Math.PI * 2); g.fillStyle = '#e8fff4'; g.fill(); return; }
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = ART.rgba(col, 0.55); g.lineWidth = Math.max(2, s.r * sc * 1.6); g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, s.r * sc * 0.6); g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(x1, y1); g.stroke();
    g.restore();
    if (s.k === 'freeze') ART.glow(g, x1, y1, Math.max(5, sc * 0.9), col, 0.8);
  }
  function drawShell(s, t) {
    proj(s.x, s.y, s.z);
    const r = Math.max(4, 0.42 * P.s);
    ART.glow(g, P.x, P.y, r * 3.5, '#ffd23f', 0.95);
    g.beginPath(); g.arc(P.x, P.y, r, 0, Math.PI * 2); g.fillStyle = '#fff6c7'; g.fill();
  }
  function drawBomb(m, t) {
    const f = Math.min(1, m.t / m.tel), y = 14 * (1 - f) * (1 - f);
    if (f < 0.25) return;
    proj(m.x, y, m.z);
    const r = Math.max(3, 0.45 * P.s), col = m.style === 'ice' ? '#bfefff' : m.style === 'fire' ? '#ff7a2a' : m.style === 'sand' ? '#d9a35c' : '#3a3f5a';
    if (m.style === 'fire') ART.glow(g, P.x, P.y, r * 3, '#ff7a2a', 0.8);
    g.beginPath(); g.arc(P.x, P.y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#17132b'; g.stroke();
  }
  // things painted on the road: shadows of the mech, lane warnings, bomb targets, geyser vents, beams
  function decals(S, t) {
    const M = S.mech;
    for (const m of S.marks) {
      if (m.k === 'lane') {
        const warn = m.t < m.tel, f = Math.min(1, m.t / m.tel);
        const col = m.style === 'frost' ? '#7fe3ff' : m.style === 'fire' || m.style === 'dive' ? '#ff7a2a' : '#ff3d5a';
        for (const l of m.lanes) {
          const x = MB.laneX(l), z1 = 0.3, z2 = Math.min(70, m.sz || (S.boss ? S.boss.z - 4 : 60));
          proj(x - 1.5, 0, z1); const a = [P.x, P.y]; proj(x + 1.5, 0, z1); const b = [P.x, P.y];
          proj(x + 1.5, 0, z2); const c2 = [P.x, P.y]; proj(x - 1.5, 0, z2); const d = [P.x, P.y];
          const alpha = warn ? 0.12 + 0.3 * f + 0.12 * Math.sin(t * (10 + f * 20)) : 0.55;
          quad(a[0], a[1], b[0], b[1], c2[0], c2[1], d[0], d[1], ART.rgba(col, Math.max(0, alpha)));
        }
      } else if (m.k === 'bomb') {
        proj(m.x, 0, m.z); const s = P.s, f = Math.min(1, m.t / m.tel);
        const col = m.style === 'ice' ? '#7fe3ff' : '#ff3d5a';
        g.save(); g.lineWidth = Math.max(2, s * 0.12); g.strokeStyle = ART.rgba(col, 0.9);
        g.beginPath(); g.ellipse(P.x, P.y, 1.5 * s, 0.5 * s, 0, 0, Math.PI * 2); g.stroke();
        g.fillStyle = ART.rgba(col, 0.18 + 0.25 * f); g.beginPath(); g.ellipse(P.x, P.y, 1.5 * s * (1 - f * 0.85), 0.5 * s * (1 - f * 0.85), 0, 0, Math.PI * 2); g.fill();
        g.restore();
      } else if (m.k === 'sweep') {
        proj(-ROAD - 0.5, 0.35, m.z); const a = [P.x, P.y, P.s]; proj(ROAD + 0.5, 0.35, m.z);
        if (m.t < m.tel) { g.strokeStyle = 'rgba(255,61,90,' + (0.3 + 0.3 * Math.sin(t * 20)) + ')'; g.lineWidth = Math.max(2, a[2] * 0.15); g.setLineDash([10, 8]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(P.x, P.y); g.stroke(); g.setLineDash([]); }
      }
    }
    for (const e of S.ents) if (e.k === 'geyser') {
      proj(e.x, 0, e.z); const s = P.s;
      g.fillStyle = '#1a0d0a'; g.beginPath(); g.ellipse(P.x, P.y, 1.25 * s, 0.4 * s, 0, 0, Math.PI * 2); g.fill();
      const hot = e.phase === 'warn' ? 0.5 + 0.5 * Math.sin(t * 25) : e.phase === 'blow' ? 1 : 0.25;
      g.fillStyle = 'rgba(255,110,40,' + (0.35 + hot * 0.5) + ')'; g.beginPath(); g.ellipse(P.x, P.y, 0.9 * s, 0.26 * s, 0, 0, Math.PI * 2); g.fill();
      if (e.phase === 'warn') ART.glow(g, P.x, P.y - 0.3 * s, 1.5 * s, '#ff7a2a', 0.6);
    }
    shadow(M.x, M.y, 0.15, 1.5, 0.38);
  }
  function drawMech(S, t) {
    const M = S.mech;
    proj(M.x, M.y, 0);
    const s = P.s, x = P.x, y = P.y;
    if (M.inv > 0 && M.hurt <= 0 && Math.floor(t * 14) % 2) g.globalAlpha = 0.45;
    g.save(); g.translate(x, y); g.rotate(M.lean * 0.09); g.scale(s, s);
    ART.begin(g, s, M.hurt > 0.3 ? 1 : 0);
    ART.mech(g, M, t, ART.PAINTS[(S.paint || 0) % ART.PAINTS.length], S.weapon);
    ART.setMode(0);
    g.restore();
    g.globalAlpha = 1;
    S.mechScreen = { x: x, y: y, s: s };
  }
  function beams(S, t) {
    const M = S.mech;
    for (const m of S.marks) {
      if (m.k === 'lane' && m.t >= m.tel && m.act > 0) {
        const f = (m.t - m.tel) / m.act, col = m.style === 'frost' ? '#9ff0ff' : m.style === 'fire' || m.style === 'dive' ? '#ff9f43' : '#ff3d5a';
        for (const l of m.lanes) {
          const x = MB.laneX(l), z2 = Math.min(70, m.sz || (S.boss ? S.boss.z - 4 : 60));
          proj(x, m.style === 'beam' ? 1.6 : 1.0, z2); const ax = P.x, ay = P.y; proj(x, 1.4, 0.2);
          g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
          const wdt = (m.style === 'beam' ? 0.9 : 2.6) * P.s * (1 - f * 0.4);
          g.strokeStyle = ART.rgba(col, 0.45); g.lineWidth = wdt; g.beginPath(); g.moveTo(ax, ay); g.lineTo(P.x, P.y); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = wdt * 0.3; g.beginPath(); g.moveTo(ax, ay); g.lineTo(P.x, P.y); g.stroke();
          g.restore();
        }
      } else if (m.k === 'sweep' && m.t >= m.tel) {
        proj(m.x, 0.4, m.z); const s = P.s;
        ART.glow(g, P.x, P.y, 1.6 * s, '#ff3d5a', 0.9);
        g.fillStyle = 'rgba(255,230,230,0.95)'; g.fillRect(P.x - 0.12 * s, P.y - 0.5 * s, 0.24 * s, 0.6 * s);
        proj(m.x - m.dir * 4, 0.4, m.z);
        g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,80,100,0.6)'; g.lineWidth = Math.max(3, 0.3 * s);
        g.beginPath(); g.moveTo(P.x, P.y); proj(m.x, 0.4, m.z); g.lineTo(P.x, P.y); g.stroke(); g.restore();
      }
    }
    if (S.beam) {
      const b = S.beam;
      proj(b.x + 1.3 * (M.side || 1), b.y, b.z); const ax = P.x, ay = P.y; proj(b.ex, b.ey, b.ez);
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      const w = 10 + Math.sin(t * 50) * 2;
      g.strokeStyle = 'rgba(255,60,110,0.5)'; g.lineWidth = w; g.beginPath(); g.moveTo(ax, ay); g.lineTo(P.x, P.y); g.stroke();
      g.strokeStyle = 'rgba(255,240,245,0.95)'; g.lineWidth = w * 0.3; g.beginPath(); g.moveTo(ax, ay); g.lineTo(P.x, P.y); g.stroke();
      g.restore();
      ART.glow(g, P.x, P.y, 26, '#ff4f6d', 0.9);
    }
    for (const z of S.zaps) {
      const pts = z.pts.map((p) => { proj(p[0], p[1], p[2]); return [P.x, P.y]; });
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
      for (const [wdt, col] of [[7, z.c === 'bad' ? 'rgba(255,80,100,0.45)' : 'rgba(120,200,255,0.45)'], [2.2, '#ffffff']]) {
        g.strokeStyle = col; g.lineWidth = wdt; g.beginPath();
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          if (!i) g.moveTo(a[0], a[1]);
          for (let k = 1; k <= 4; k++) { const f = k / 5; g.lineTo(a[0] + (b[0] - a[0]) * f + (Math.random() - 0.5) * 16, a[1] + (b[1] - a[1]) * f + (Math.random() - 0.5) * 16); }
          g.lineTo(b[0], b[1]);
        }
        g.stroke();
      }
      g.restore();
    }
  }
  function overlay(S, t) {
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    const M = S.mech;
    if (M.hurt > 0 || M.hp < 30) {
      const a = Math.max(M.hurt * 1.2, M.hp < 30 ? 0.18 + 0.1 * Math.sin(t * 6) : 0);
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      gr.addColorStop(0, 'rgba(255,40,60,0)'); gr.addColorStop(1, 'rgba(255,40,60,' + Math.min(0.55, a) + ')');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    if (S.flash > 0) { g.fillStyle = 'rgba(255,255,255,' + Math.min(0.7, S.flash) + ')'; g.fillRect(0, 0, W, H); }
    if (S.slow > 0) { g.fillStyle = 'rgba(255,214,90,' + Math.min(0.12, S.slow * 0.2) + ')'; g.fillRect(0, 0, W, H); }
  }

  /* ================= sparks, smoke and pops ================= */
  function part(o) { if (parts.length > 520) parts.shift(); parts.push(Object.assign({ vx: 0, vy: 0, vz: 0, gr: 0, life: 0.6, age: 0, size: 0.3, col: '#ffffff', k: 'spark', world: true }, o)); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function boom(x, y, z, size, col) {
    part({ x: x, y: y, z: z, k: 'flash', size: size * 2.6, life: 0.22, col: col || '#ffd27a' });
    part({ x: x, y: y, z: z, k: 'ring', size: size * 0.5, grow: size * 7, life: 0.35, col: '#fff3c4' });
    for (let i = 0; i < 6 + size * 5; i++) part({ x: x, y: y, z: z, vx: rnd(-6, 6) * size, vy: rnd(1, 9) * size, vz: rnd(-5, 5) * size, gr: 16, k: 'debris', size: rnd(0.12, 0.3) * size, life: rnd(0.5, 0.9), col: Math.random() < 0.5 ? '#3a3f5a' : '#ff9f43' });
    for (let i = 0; i < 4 + size * 3; i++) part({ x: x + rnd(-0.5, 0.5) * size, y: y + rnd(0, 1) * size, z: z, vy: rnd(0.5, 2), k: 'smoke', size: rnd(0.6, 1.1) * size, grow: 1.6 * size, life: rnd(0.7, 1.2), col: '#5a5470' });
    for (let i = 0; i < 4 + size * 3; i++) part({ x: x, y: y, z: z, vx: rnd(-1, 1), vy: rnd(0.5, 3), vz: rnd(-1, 1), k: 'fire', size: rnd(0.5, 0.9) * size, grow: -0.4, life: rnd(0.25, 0.45), col: Math.random() < 0.5 ? '#ffb347' : '#ff6a3d' });
  }
  function sparks(x, y, z, n, col, speed) { for (let i = 0; i < n; i++) part({ x: x, y: y, z: z, vx: rnd(-1, 1) * speed, vy: rnd(-0.3, 1) * speed, vz: rnd(-1, 1) * speed, gr: 9, k: 'spark', size: 0.09, life: rnd(0.2, 0.45), col: col }); }
  function pop(x, y, z, text, col, big) { part({ x: x, y: y, z: z, vy: 2.2, k: 'text', text: text, size: big ? 1 : 0.62, life: big ? 1.3 : 0.85, col: col || '#ffffff' }); }
  function fx(ev, S) {
    const M = S.mech;
    switch (ev.e) {
      case 'fire': {
        const side = M.side || 1, x = M.x + side * 1.34, col = SHOT_COL[ev.w] || '#62f2ff';
        part({ x: x, y: M.y + 2.7, z: 1.2, k: 'flash', size: ev.w === 'plasma' ? 1.6 : 0.8, life: 0.08, col: col, world: false });
        break;
      }
      case 'hit': if (ev.w !== 'laser' || Math.random() < 0.2) sparks(ev.x, ev.y, ev.z - 0.6, ev.big ? 10 : 5, ev.w === 'freeze' ? '#bff4ff' : '#ffe08a', ev.big ? 7 : 5); break;
      case 'block': sparks(ev.x, ev.y, ev.z, 6, '#9fe8ff', 5); part({ x: ev.x, y: ev.y, z: ev.z, k: 'flash', size: 1.2, life: 0.12, col: '#62f2ff' }); break;
      case 'boom': {
        const big = ev.big ? 2.2 : ev.k === 'bomb' ? 1.6 : ev.k === 'missile' ? 0.8 : ev.k === 'crate' || ev.k === 'mine' ? 1.0 : 1.25;
        boom(ev.x, ev.y, ev.z, big, ev.style === 'ice' ? '#bfefff' : null);
        if (ev.k === 'crate') for (let i = 0; i < 8; i++) part({ x: ev.x, y: ev.y, z: ev.z, vx: rnd(-5, 5), vy: rnd(2, 8), vz: rnd(-4, 4), gr: 16, k: 'debris', size: rnd(0.2, 0.4), life: 0.9, col: '#c98f52' });
        break;
      }
      case 'blast': boom(ev.x, ev.y, ev.z, 0.7, '#ffb347'); break;
      case 'freeze': for (let i = 0; i < 10; i++) part({ x: ev.x, y: ev.y, z: ev.z, vx: rnd(-4, 4), vy: rnd(-1, 4), vz: rnd(-3, 3), gr: 6, k: 'spark', size: 0.16, life: 0.5, col: '#dff8ff' }); part({ x: ev.x, y: ev.y, z: ev.z, k: 'ring', size: 0.3, grow: 6, life: 0.35, col: '#bff4ff' }); break;
      case 'score': pop(ev.x, ev.y + 0.6, ev.z, '+' + ev.n, ev.mult > 1 ? '#ffd23f' : '#ffffff'); break;
      case 'pick': part({ x: M.x, y: 1.6, z: 0.6, k: 'ring', size: 0.4, grow: 6, life: 0.4, col: (ART.PICK[ev.p] || ART.PICK.gem)[0], world: false }); break;
      case 'right': {
        boom(ev.x, ev.y, ev.z, 1.8, '#ffe08a');
        for (let i = 0; i < 30; i++) part({ x: ev.x + rnd(-6, 6) * (ev.boss ? 0.5 : 1), y: rnd(0.5, 4.5), z: ev.z, vx: rnd(-6, 6), vy: rnd(2, 10), vz: rnd(-8, 2), gr: 14, k: 'shard', size: rnd(0.25, 0.5), life: rnd(0.8, 1.3), col: Math.random() < 0.5 ? '#9ff6ff' : '#ffd23f', spin: rnd(-10, 10) });
        pop(ev.x, ev.y + 2.4, ev.z, ev.first ? 'CORRECT!' : 'Got it!', '#ffd23f', true);
        break;
      }
      case 'wrong': sparks(ev.x, ev.y, ev.z, 14, '#ff5a6a', 6); pop(ev.x, ev.y + 1.6, ev.z, '✗', '#ff5a6a', true); break;
      case 'hurt': sparks(M.x, M.y + 1.8, 0.6, 12, '#ff9f43', 6); break;
      case 'shieldhit': part({ x: M.x, y: M.y + 1.7, z: 0.5, k: 'ring', size: 1.2, grow: 3, life: 0.3, col: '#9ff0ff', world: false }); break;
      case 'land': for (let i = 0; i < 10; i++) part({ x: M.x + rnd(-1.2, 1.2), y: 0.1, z: rnd(-0.5, 0.8), vx: rnd(-2, 2), vy: rnd(0.3, 1.2), k: 'smoke', size: rnd(0.3, 0.5), grow: 0.8, life: 0.5, col: '#b8b0c8' }); break;
      case 'jump': for (let i = 0; i < 6; i++) part({ x: M.x + rnd(-0.8, 0.8), y: 0.1, z: rnd(-0.3, 0.6), vx: rnd(-2, 2), vy: rnd(0.2, 1), k: 'smoke', size: 0.4, grow: 0.8, life: 0.4, col: '#b8b0c8' }); break;
      case 'bossdown': for (let i = 0; i < 6; i++) setTimeout(() => boom(ev.x + rnd(-3, 3), ev.y + rnd(-2, 2), ev.z + rnd(-1, 1), 2.4), i * 330); break;
      case 'nova': part({ x: M.x, y: 2, z: 2, k: 'ring', size: 1, grow: 60, life: 0.7, col: '#e0c4ff', world: false }); break;
      case 'bump': boom(ev.x, ev.y, ev.z, 1.1); break;
      case 'spark': sparks(ev.x, 0.1, ev.z, 3, '#ffe08a', 3); break;
      case 'shieldbreak': for (let i = 0; i < 14; i++) part({ x: ev.x + rnd(-1, 1), y: rnd(0.5, 2.5), z: ev.z - 1, vx: rnd(-5, 5), vy: rnd(1, 6), vz: rnd(-3, 3), gr: 12, k: 'shard', size: 0.3, life: 0.8, col: '#9fe8ff', spin: rnd(-8, 8) }); break;
      default: break;
    }
  }
  function tick(S, dt) {
    for (const p of parts) {
      p.age += dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.vy -= p.gr * dt;
      if (p.world) p.z -= S.v * dt;
      if (p.y < 0 && p.k === 'debris') { p.y = 0; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
      if (p.grow) p.size = Math.max(0.02, p.size + p.grow * dt);
    }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].age >= parts[i].life) parts.splice(i, 1);
  }
  function drawPart(p) {
    proj(p.x, p.y, p.z);
    const s = P.s, f = p.age / p.life, r = p.size * s;
    if (P.x < -100 || P.x > W + 100) return;
    switch (p.k) {
      case 'flash': ART.glow(g, P.x, P.y, r * 2, p.col, 1 - f); break;
      case 'ring':
        g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = ART.rgba(p.col, (1 - f) * 0.9); g.lineWidth = Math.max(1.5, s * 0.25 * (1 - f));
        g.beginPath(); g.ellipse(P.x, P.y, r, r * 0.6, 0, 0, Math.PI * 2); g.stroke(); g.restore(); break;
      case 'fire': ART.glow(g, P.x, P.y, r * 1.6, p.col, (1 - f) * 0.9); break;
      case 'smoke': g.fillStyle = ART.rgba(p.col, 0.45 * (1 - f)); g.beginPath(); g.arc(P.x, P.y, r, 0, Math.PI * 2); g.fill(); break;
      case 'debris': g.fillStyle = p.col; g.fillRect(P.x - r / 2, P.y - r / 2, r, r); break;
      case 'shard':
        g.save(); g.translate(P.x, P.y); g.rotate(p.age * (p.spin || 0)); g.globalAlpha *= 1 - f * 0.6;
        g.fillStyle = p.col; g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.6, r * 0.5); g.lineTo(-r * 0.6, r * 0.4); g.closePath(); g.fill(); g.restore(); break;
      case 'text': {
        const fsz = Math.max(14, Math.min(64, p.size * s * 0.9 + 12));
        g.save(); g.globalAlpha *= f < 0.7 ? 1 : (1 - f) / 0.3;
        g.font = '700 ' + fsz + 'px Fredoka, "Arial Rounded MT Bold", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = Math.max(3, fsz * 0.16); g.strokeStyle = '#17132b'; g.strokeText(p.text, P.x, P.y); g.fillStyle = p.col; g.fillText(p.text, P.x, P.y);
        g.restore(); break;
      }
      default: g.fillStyle = p.col; g.globalAlpha *= 1 - f; g.fillRect(P.x - 1.5, P.y - 1.5, 3, 3);
    }
  }

  /* ================= what a finger touched ================= */
  // a point in the world behind a screen point (roughly 2 m up, at the depth the road shows there)
  function worldAt(x, y) {
    let z = y > HZ + 6 ? CAMZ + F * (camY - 2) / (y - HZ) : 80;
    z = Math.max(8, Math.min(95, z));
    const s = F / (z - CAMZ);
    // undo the road's bend and climb at that depth
    proj(0, 0, z);
    const xo = (P.x - W / 2) / s + camX, yo = camY - (P.y - HZ) / s;
    return { x: (x - W / 2) / s + camX - xo, y: Math.max(0.5, camY + (HZ - y) / s - yo), z: z };
  }
  function pick(x, y) {
    for (const p of panels) if (x >= p.x - 8 && x <= p.x + p.w + 8 && y >= p.y - 8 && y <= p.y + p.h + 8) return { panel: p.i };
    for (const o of orbs) if (Math.hypot(o.x - x, o.y - y) < o.r + 10) return { panel: o.i };
    let best = null, bd = 1e9;
    for (const h of hits) { const d = Math.hypot(h.x - x, h.y - y) - h.r; if (d < bd) { bd = d; best = h; } }
    const aim = worldAt(x, y);
    if (best && bd < 64) return { id: best.id, aim: aim };
    return { id: 0, aim: aim };
  }
  function panelsNow() { return panels.slice(); }
  function hitsNow() { return hits.slice(); }
  return { get quality() { return quality; }, setQuality(q) { quality = Math.max(0.5, Math.min(1, q)); if (cv) resize(cv); }, set profile(o) { timing = o ? Object.assign(o, { bg: 0, road: 0, sprites: 0, fx: 0, n: 0 }) : null; }, WORLDS, resize, setLevel, draw, tick, fx, pick, proj, panelsNow, hitsNow, get W() { return W; }, get H() { return H; }, get parts() { return parts; } };
})();
