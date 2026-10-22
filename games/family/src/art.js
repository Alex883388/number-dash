/* games/family/src/art.js — FFArt: every drawing in Family Fighters, made of shapes (no image files): the family (Bee,
   Bo, Bố and Mẹ), nine zombies, ten bosses, things to smash, food and coins, shots, and the question drums, gongs and
   gates. Cartoon style: thick dark outlines, flat colours, big heads. Each character is a "rig" (legs, body, arms,
   head) posed for its state; drawCharacter-style functions draw at the feet, facing right when face is 1.
   FFArt.use(ctx) picks the canvas; FFArt.flash(on) draws the next shapes white (a hit). */
const FFArt = (function () {
'use strict';
const INK = '#2a1c14', TAU = Math.PI * 2, PI = Math.PI;
let c = null, flashOn = false;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

/* ---------- pen ---------- */
function use(ctx) { c = ctx; }
function flash(on) { flashOn = !!on; }
function ink(w) { c.lineWidth = w; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round'; }
function fs(fill, w) { c.fillStyle = flashOn ? '#ffffff' : fill; c.fill(); if (w !== 0) { ink(w || 3); c.stroke(); } }
function circ(x, y, r, fill, w) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); fs(fill, w); }
function ell(x, y, rx, ry, fill, w, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); fs(fill, w); }
function rrPath(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function rr(x, y, w, h, r, fill, lw) { c.beginPath(); rrPath(x, y, w, h, r); fs(fill, lw); }
function poly(pts, fill, w) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); fs(fill, w); }
function line(x1, y1, x2, y2, w, col) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineCap = 'round'; c.lineWidth = w; c.strokeStyle = col || INK; c.stroke(); }
// a limb from (x, y) at angle a (0 points straight down, more swings it forward and up), as a thick stroke with an outline
function limb(x, y, a, L, w, fill) {
  const x2 = x + Math.sin(a) * L, y2 = y + Math.cos(a) * L;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.lineCap = 'round';
  c.lineWidth = w + 5; c.strokeStyle = INK; c.stroke();
  c.lineWidth = w; c.strokeStyle = flashOn ? '#ffffff' : fill; c.stroke();
  return [x2, y2];
}
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), f = (v) => clamp(Math.round(v * k), 0, 255);
  return '#' + ((1 << 24) | (f(n >> 16 & 255) << 16) | (f(n >> 8 & 255) << 8) | f(n & 255)).toString(16).slice(1);
};

/* ================= the rigs =================
   legL, legW: legs; bodyW, bodyH: the body above the hips; headR: the head; armL, armW: arms. Colours: skin, top, top2
   (trim), legs, shoe, hair. hair: the haircut; extra bits draw the rest. */
const RIGS = {
  bin: { legL: 24, legW: 10, bodyW: 30, bodyH: 30, headR: 21, armL: 21, armW: 9, skin: '#f3c79c', top: '#e63b2e', top2: '#ffffff', legs: '#2c5fa8', shoe: '#f4f4f4', hair: '#1d1a1a', cut: 'spiky', eyes: 'kid', shorts: true },
  bo: { legL: 15, legW: 11, bodyW: 40, bodyH: 30, headR: 22, armL: 17, armW: 10, skin: '#f6cfa8', top: '#58b947', top2: '#2f7d32', legs: '#8a5a33', shoe: '#ff7043', hair: '#231a14', cut: 'bowl', eyes: 'kid', round: true, cheeks: true, shorts: true },
  // Bố plays golf: a sky-blue polo, khaki trousers, white golf shoes, a golf glove and a cap
  dad: { legL: 34, legW: 12, bodyW: 34, bodyH: 42, headR: 20, armL: 27, armW: 10, skin: '#e7b88d', top: '#4fc3f7', top2: '#ffffff', legs: '#d8c39a', shoe: '#fafafa', hair: '#171313', cut: 'side', eyes: 'adult', tash: true, golfCap: '#ffffff', glove: true, saddle: '#8d6e63' },
  // Mẹ in hip-hop fashion: a pink bomber jacket, a gold chain, black track pants with a white stripe, chunky sneakers,
  // a high ponytail, sunglasses pushed up and big gold hoops
  mum: { legL: 32, legW: 10, bodyW: 30, bodyH: 38, headR: 19, armL: 25, armW: 9, skin: '#f4cba3', top: '#ec407a', top2: '#ffffff', legs: '#212121', shoe: '#fafafa', hair: '#151010', cut: 'hightail', eyes: 'adult', lashes: true, shades: true, hoops: true, legStripe: '#ffffff', chunky: '#f06292', sleeve: 0.82, cuff: '#ffffff' },
  // zombies
  walker: { legL: 26, legW: 10, bodyW: 30, bodyH: 34, headR: 19, armL: 24, armW: 9, skin: '#9cc47a', top: '#8d6e63', top2: '#6d4c41', legs: '#3f51b5', shoe: '#5d4037', hair: '#3e4a26', cut: 'messy', zombie: true, torn: true },
  runner: { legL: 30, legW: 8, bodyW: 24, bodyH: 30, headR: 17, armL: 24, armW: 8, skin: '#a8cf86', top: '#e53935', top2: '#ffffff', legs: '#263238', shoe: '#eeeeee', hair: '#5d4037', cut: 'band', zombie: true, stripe: true },
  bucket: { legL: 26, legW: 10, bodyW: 30, bodyH: 34, headR: 19, armL: 24, armW: 9, skin: '#8fbf74', top: '#607d8b', top2: '#455a64', legs: '#6d4c41', shoe: '#3e2723', hair: '#3e4a26', cut: 'messy', zombie: true, torn: true, pot: true },
  fat: { legL: 22, legW: 14, bodyW: 58, bodyH: 46, headR: 19, armL: 25, armW: 13, skin: '#93bf72', top: '#f2f2ee', top2: '#d0d0c8', legs: '#795548', shoe: '#4e342e', hair: '#3e4a26', cut: 'bald', zombie: true, round: true, belly: true, shorts: true },
  spitter: { legL: 26, legW: 9, bodyW: 30, bodyH: 32, headR: 19, armL: 22, armW: 8, skin: '#b5d36b', top: '#6d4c41', top2: '#4e342e', legs: '#33691e', shoe: '#3e2723', hair: '#827717', cut: 'messy', zombie: true, torn: true, drool: true, hunch: 0.25 },
  jumper: { legL: 24, legW: 10, bodyW: 30, bodyH: 32, headR: 18, armL: 22, armW: 8, skin: '#9ccc65', top: '#c6ff00', top2: '#9ccc00', legs: '#558b2f', shoe: '#33691e', hair: '#33691e', cut: 'hood', zombie: true, coat: true },
  shield: { legL: 26, legW: 10, bodyW: 32, bodyH: 36, headR: 19, armL: 24, armW: 10, skin: '#8bb86f', top: '#5d4037', top2: '#3e2723', legs: '#37474f', shoe: '#263238', hair: '#3e4a26', cut: 'messy', zombie: true, torn: true },
  bloater: { legL: 20, legW: 11, bodyW: 52, bodyH: 50, headR: 18, armL: 20, armW: 10, skin: '#c5e1a5', top: '#c5e1a5', top2: '#9ccc65', legs: '#689f38', shoe: '#33691e', hair: '#558b2f', cut: 'bald', zombie: true, round: true, spots: true, bare: true, shorts: true }
};

/* ================= a pose =================
   la: the two legs' angles (back, front); aa: the two arms' angles; lean: the body's tilt; bob: up and down;
   sq: squash (body height); rot: the whole rig turned (lying down); face: the expression; held: what the front hand
   holds (and its angle); spin: a turn of the held thing. */
function basePose() { return { la: [0, 0], aa: [0.4, 0.6], lean: 0, bob: 0, sq: 1, rot: 0, tilt: 0, face: 'calm', held: null, heldA: 0, lift: 0, swell: 0 }; }
const phase = (t, a, b) => clamp((t - a) / Math.max(0.001, b - a), 0, 1);

// the family's poses, from its state (P: the hero from the engine; now: seconds, for breathing)
function heroPose(P, H, now) {
  const p = basePose(), t = P.t || 0, k = P.hero;
  p.face = 'fight';
  if (k === 'bo') p.held = 'banhmi';
  if (k === 'mum') p.held = 'bag';
  if (k === 'dad') p.held = 'club';
  const idleArms = () => { const b = Math.sin(now * 4 + (P.slot || 0) * 1.3); p.bob = b * 1.1; p.aa = [1.0 + b * 0.05, 1.35 + b * 0.05]; p.la = [-0.14, 0.16]; };
  switch (P.st) {
    case 'idle': idleArms(); if (k === 'bo') p.aa[1] = 1.9; if (k === 'dad') { p.aa = [0.45, 0.6 + Math.sin(now * 2) * 0.04]; p.lean = 0.12; } break;
    case 'walk': {
      const w = (P.walk || 0) / 13;
      p.la = [Math.sin(w) * 0.62, -Math.sin(w) * 0.62]; p.aa = [0.7 - Math.sin(w) * 0.55, 1.0 + Math.sin(w) * 0.55];
      p.bob = -Math.abs(Math.cos(w)) * 2.6; p.lean = 0.07;
      if (k === 'bo') p.aa[1] = 1.8 + Math.sin(w) * 0.2;
      if (k === 'dad') { p.aa[1] = 0.8 + Math.sin(w) * 0.12; p.aa[0] = 0.6; }
      break;
    }
    case 'jump': p.la = [0.95, -0.35]; p.aa = [2.5, 2.7]; p.face = 'shout'; break;
    case 'jatk': p.la = [0.35, 1.55]; p.aa = [2.3, 0.9]; p.lean = 0.25; p.face = 'shout'; break;
    case 'atk': {
      const A = H.combo[P.combo || 0], f = t, w0 = A.a[0], w1 = A.a[1], n = P.combo || 0;
      const wind = phase(f, 0, w0), hit = phase(f, w0, w1), back = phase(f, w1, A.t);
      const strike = (from, to) => (f < w0 ? lerp(from, from - 0.4, wind) : f < w1 ? lerp(from - 0.4, to, ease(hit)) : lerp(to, from, ease(back)));
      p.la = [-0.3, 0.3];
      if (k === 'bo') {
        // the bánh mì: down, up, then a big smash
        p.aa = [0.8, n === 0 ? strike(2.6, 0.9) : n === 1 ? strike(0.6, 2.4) : strike(3.2, 0.8)];
        p.lean = n === 2 ? lerp(-0.2, 0.25, hit) : 0.12;
        if (n === 2) { p.bob = -Math.sin(hit * PI) * 10; p.sq = f < w1 ? 1 : lerp(0.85, 1, back); }
      } else if (k === 'mum') {
        if (n < 2) { p.aa = [0.8, n === 0 ? strike(2.4, 1.0) : strike(0.4, 1.9)]; p.lean = 0.1; }
        else { p.aa = [0.9, strike(3.6, 1.1)]; p.held = f < w0 ? 'slipper' : 'bag'; p.lean = lerp(-0.2, 0.2, hit); }
      } else if (n === 2 && k === 'bin') {
        // a high kick
        p.la = [-0.25, f < w0 ? lerp(0.3, 0.9, wind) : f < w1 ? lerp(0.9, 1.75, ease(hit)) : lerp(1.75, 0.2, back)];
        p.aa = [1.6, 1.2]; p.lean = -0.2;
      } else if (k === 'dad') {
        // golf swings, both hands on the club: a half swing, a swing back, then a full swing (FORE!)
        const a1 = n === 0 ? strike(-0.5, 1.9) : n === 1 ? strike(2.5, 0.1) : f < w0 ? lerp(0.5, -1.9, ease(wind)) : f < w1 ? lerp(-1.9, 3.5, ease(hit)) : lerp(3.5, 0.7, ease(back));
        p.aa = [a1 - 0.25, a1];
        p.lean = n === 2 ? (f < w0 ? lerp(0.1, -0.2, wind) : lerp(-0.2, 0.22, hit)) : 0.1;
        p.la = [-0.35, 0.3];
      } else {
        // jabs: front fist, then back fist
        const reachA = 1.62;
        if (n === 0) p.aa = [1.1, strike(1.3, reachA)]; else p.aa = [strike(1.0, reachA), 0.9];
        p.lean = 0.16;
      }
      p.face = 'shout';
      break;
    }
    case 'spec': {
      p.face = 'shout';
      if (P.sk === 'whirl') { p.held = 'pole'; p.heldA = t * 26; p.aa = [1.6, 1.6]; p.la = [-0.4, 0.4]; p.bob = -3; }
      else if (P.sk === 'bounce') { p.rot = t * 14; p.la = [1.6, 1.4]; p.aa = [2.2, 2.0]; p.sq = 0.9; p.held = null; p.lift = 18; }
      else if (P.sk === 'cart') { p.cart = true; p.held = null; p.la = [1.35, 1.15]; p.aa = [1.55, 1.6]; p.lean = 0.22; p.lift = 24; p.face = 'happy'; }
      else if (P.sk === 'slippers') { const w = (t * 10) % 1; p.aa = [0.8, lerp(3.4, 1.0, w)]; p.held = w < 0.5 ? 'slipper' : 'bag'; p.lean = 0.15; }
      break;
    }
    case 'hurt': p.lean = -0.35; p.aa = [2.3, 2.6]; p.la = [-0.3, 0.4]; p.face = 'hurt'; break;
    case 'down': { const f = clamp(t / 0.3, 0, 1); p.rot = -PI / 2 * ease(f); p.face = 'hurt'; p.aa = [2.6, 2.2]; p.la = [0.4, 0.2]; break; }
    case 'up': { const f = clamp(t / 0.3, 0, 1); p.rot = -PI / 2 * (1 - ease(f)); p.face = 'fight'; break; }
    case 'ko': p.rot = -PI / 2; p.face = 'ko'; p.aa = [2.8, 2.4]; p.la = [0.5, 0.2]; break;
    case 'win': { const j = Math.abs(Math.sin(t * 5)); p.bob = -j * 14; p.aa = [2.9, 3.0]; p.la = [-0.2 - j * 0.3, 0.2 + j * 0.3]; p.face = 'happy'; break; }
    default: idleArms();
  }
  return p;
}
// a zombie's pose
function zombiePose(Z, zt, now) {
  const p = basePose(), t = Z.t || 0, w = (Z.x || 0) / 11 + (Z.id || 0);
  p.face = 'zombie';
  const shuffle = () => { p.la = [Math.sin(w) * 0.38, -Math.sin(w) * 0.38]; p.aa = [1.3 + Math.sin(now * 3 + w) * 0.08, 1.45 + Math.cos(now * 3 + w) * 0.08]; p.lean = 0.12 + (zt.hunch || 0); p.bob = -Math.abs(Math.cos(w)) * 2; p.tilt = Math.sin(now * 2 + w) * 0.12; };
  switch (Z.st) {
    case 'move': shuffle(); break;
    case 'wind': p.aa = [2.7, 2.9]; p.lean = -0.12; p.face = 'roar'; p.la = [-0.2, 0.25]; p.swell = clamp(t / (zt.wind || 0.6), 0, 1); break;
    case 'rest': p.aa = [1.8, 1.95]; p.lean = 0.3; p.la = [-0.35, 0.35]; p.face = 'roar'; break;
    case 'hurt': p.lean = -0.32; p.aa = [2.2, 2.5]; p.face = 'hurt'; p.la = [-0.2, 0.3]; break;
    case 'down': { const f = clamp(t / 0.3, 0, 1); p.rot = -PI / 2 * ease(f); p.face = 'hurt'; p.aa = [2.5, 2.2]; break; }
    case 'up': { const f = clamp(t / 0.4, 0, 1); p.rot = -PI / 2 * (1 - ease(f)); break; }
    case 'leap': p.la = [1.2, 0.8]; p.aa = [2.0, 2.2]; p.face = 'roar'; break;
    case 'dying': p.rot = -PI / 2 * clamp(t / 0.25, 0, 1); p.face = 'ko'; p.aa = [2.6, 2.3]; break;
    default: shuffle();
  }
  return p;
}

/* ================= drawing a rig =================
   At (x, y) on the ground (the feet), scale s, facing f (1 right, -1 left), in pose p. */
function rig(R, x, y, s, f, p, extra) {
  c.save();
  c.translate(x, y - (p.lift || 0) * s);
  c.scale(s * f, s);
  if (p.rot) { c.translate(0, -R.legW * 0.6); c.rotate(p.rot); c.translate(0, R.legW * 0.2); }
  const hipY = -R.legL + (p.bob || 0), bw = R.bodyW * (1 + (p.swell || 0) * 0.25), bh = R.bodyH * (p.sq || 1) * (1 + (p.swell || 0) * 0.12);
  if (p.scooter) scooter(0, 0, R);
  if (p.cart) golfCart(0, 0);
  // legs: back then front
  const shoe = (lx, ly, a, col) => {
    c.save(); c.translate(lx, ly); c.rotate(-a * 0.6);
    if (R.chunky) { ell(R.legW * 0.5, 0, R.legW * 1.2, R.legW * 0.72, col); line(R.legW * -0.6, R.legW * 0.42, R.legW * 1.6, R.legW * 0.42, 3, R.chunky); }
    else { ell(R.legW * 0.45, 1, R.legW * 0.95, R.legW * 0.55, col); if (R.saddle) ell(R.legW * 0.3, -1, R.legW * 0.4, R.legW * 0.4, R.saddle, 0); }
    c.restore();
  };
  const legCol = R.legs, skinLeg = R.shorts ? R.skin : R.legs;
  for (let i = 0; i < 2; i++) {
    const a = p.la[i], lx = i ? 3 : -3, col = i ? skinLeg : shade(skinLeg, 0.85);
    const [fx, fy] = limb(lx, hipY, a, R.legL, R.legW, col);
    if (R.shorts) limb(lx, hipY, a, R.legL * 0.42, R.legW + 3, i ? legCol : shade(legCol, 0.85));
    if (R.legStripe && !flashOn) { const ox = Math.cos(a) * R.legW * 0.32, oy = -Math.sin(a) * R.legW * 0.32; line(lx + ox, hipY + oy + 2, fx + ox, fy + oy - 3, 2.2, R.legStripe); }
    shoe(fx, fy, a, i ? R.shoe : shade(R.shoe, 0.85));
  }
  c.save();
  c.translate(0, hipY);
  c.rotate((p.lean || 0));
  const shY = -bh + 7;
  // back arm (behind the body)
  arm(R, -4, shY, p.aa[0], true, null, 0);
  body(R, bw, bh, p, extra);
  // head
  c.save();
  c.translate(R.round ? 2 : 1, -bh - R.headR * 0.78);
  c.rotate(p.tilt || 0);
  head(R, p, extra);
  c.restore();
  // front arm, with what it holds
  arm(R, 4, shY, p.aa[1], false, p.held, p.heldA || 0, p);
  if (extra && extra.tray) tray(R, p);
  c.restore();
  c.restore();
}
function arm(R, x, y, a, back, held, heldA, p) {
  const col = back ? shade(R.skin, 0.88) : R.skin, top = back ? shade(R.top, 0.85) : R.top;
  const [hx, hy] = limb(x, y, a, R.armL, R.armW, col);
  const sl = R.sleeve || (R.coat ? 0.75 : 0.42);
  if (!R.bare) limb(x, y, a, R.armL * sl, R.armW + 3, top);
  if (R.cuff && !R.bare) { const cx = x + Math.sin(a) * R.armL * sl, cy = y + Math.cos(a) * R.armL * sl; circ(cx, cy, (R.armW + 3) * 0.55, R.cuff, 2); }
  if (held) holdThing(held, hx, hy, a, heldA, p);
  circ(hx, hy, R.armW * 0.62, !back && R.glove ? '#ffffff' : col, 2.5);
}
function body(R, bw, bh, p, extra) {
  const x = -bw / 2, y = -bh;
  if (R.round) { c.beginPath(); c.ellipse(0, -bh * 0.5, bw / 2, bh * 0.56, 0, 0, TAU); fs(R.top); }
  else rr(x, y, bw, bh + 4, Math.min(12, bw * 0.4), R.top);
  if (R.torn) {
    // a ragged hem
    c.beginPath(); c.moveTo(x + 2, -2);
    for (let i = 0; i <= 6; i++) c.lineTo(x + 2 + (bw - 4) * i / 6, i % 2 ? 6 : -1);
    c.lineTo(x + bw - 2, -6); c.lineTo(x + 2, -6); c.closePath(); fs(shade(R.top, 0.8), 2);
    circ(x + bw * 0.62, y + bh * 0.42, 3.2, shade(R.skin, 0.8), 1.5);
  }
  if (R.stripe) { c.fillStyle = flashOn ? '#fff' : R.top2; c.fillRect(x + bw * 0.55, y + 3, 5, bh - 2); }
  if (R.belly) { ell(bw * 0.12, -bh * 0.35, bw * 0.3, bh * 0.32, R.skin, 2.5); circ(bw * 0.2, -bh * 0.33, 2, shade(R.skin, 0.7), 0); }
  if (R.spots) { for (const [sx, sy, sr] of [[-0.2, -0.6, 4], [0.15, -0.3, 5], [0.25, -0.75, 3], [-0.05, -0.2, 3]]) circ(bw * sx, bh * sy, sr * (1 + (p.swell || 0)), '#9ccc65', 0); }
  if (R.coat) { c.beginPath(); c.moveTo(x + bw * 0.62, y + 2); c.lineTo(x + bw * 0.62, 2); ink(2); c.stroke(); circ(x + bw * 0.74, y + bh * 0.4, 2, '#33691e', 0); circ(x + bw * 0.74, y + bh * 0.7, 2, '#33691e', 0); }
  const k = extra && extra.who;
  if (k === 'bin') {
    // a white stripe and collar
    c.fillStyle = flashOn ? '#fff' : '#ffffff'; c.fillRect(x + 3, y + bh * 0.42, bw - 6, 6);
    c.beginPath(); c.arc(4, y + 1, 8, 0.1, PI - 0.1); ink(3); c.stroke();
    c.font = '700 11px Fredoka, sans-serif'; c.fillStyle = INK; c.textAlign = 'center'; c.fillText('8', bw * 0.12, y + bh * 0.42 - 1);
  } else if (k === 'bo') {
    // an avocado on his t-shirt, his favourite fruit
    ell(bw * 0.12, -bh * 0.52, 7, 9.5, '#c5e1a5', 2); circ(bw * 0.12, -bh * 0.47, 3.5, '#8d6e63', 1.5);
  } else if (k === 'dad') {
    // a golf polo: a white collar, two buttons and a little golf flag on the chest; a brown belt
    poly([-3, y + 1, 5, y + 10, 13, y + 1], '#ffffff', 2);
    line(5, y + 10, 5, y + 21, 1.6, '#0277bd'); circ(5, y + 14, 1.4, '#ffffff', 0); circ(5, y + 19, 1.4, '#ffffff', 0);
    const fx = x + bw * 0.74;
    line(fx, y + 13, fx, y + 25, 1.5); poly([fx, y + 13, fx + 7, y + 15.5, fx, y + 18], '#e53935', 0);
    c.fillStyle = flashOn ? '#fff' : '#6d4c41'; c.fillRect(x, -5, bw, 5); rr(2, -6, 7, 6, 1, '#ffd54f', 1.2);
  } else if (k === 'mum') {
    // a pink bomber jacket: a white band at the hem, a zip, a gold chain with a heart
    c.fillStyle = flashOn ? '#fff' : '#ffffff'; c.fillRect(x + 1, -6, bw - 2, 6);
    line(bw * 0.16, y + 6, bw * 0.16, -6, 1.8, '#ad1457');
    c.beginPath(); c.arc(bw * 0.1, y + 3, 9, 0.2, PI - 0.2); c.lineWidth = 2.6; c.strokeStyle = flashOn ? '#fff' : '#ffc107'; c.stroke();
    c.beginPath(); c.moveTo(bw * 0.1, y + 16); c.bezierCurveTo(bw * 0.1 - 5, y + 11, bw * 0.1 - 3, y + 8, bw * 0.1, y + 11); c.bezierCurveTo(bw * 0.1 + 3, y + 8, bw * 0.1 + 5, y + 11, bw * 0.1, y + 16); fs('#ffc107', 1.4);
  }
}

/* ---------- heads ---------- */
function head(R, p, extra) {
  const r = R.headR;
  if (R.cut === 'pony') { ell(-r * 0.95, r * 0.25, r * 0.38, r * 0.62, R.hair, 3, 0.3); circ(-r * 0.7, -r * 0.1, r * 0.22, '#e91e63', 2); }
  if (R.cut === 'hood') { ell(-r * 0.1, -r * 0.05, r * 1.25, r * 1.2, R.top, 3); }
  if (R.cut === 'hightail') { ell(-r * 0.85, -r * 0.95, r * 0.36, r * 0.82, R.hair, 3, 0.7); circ(-r * 0.5, -r * 0.88, r * 0.22, '#ff4081', 2.2); }
  circ(0, 0, r, R.skin);
  // ear
  ell(-r * 0.18, r * 0.08, r * 0.17, r * 0.24, shade(R.skin, 0.92), 2.5);
  hair(R, r);
  if (R.hoops) { c.beginPath(); c.arc(-r * 0.16, r * 0.5, r * 0.24, 0, TAU); c.lineWidth = 3.2; c.strokeStyle = flashOn ? '#fff' : '#ffc107'; c.stroke(); }
  face(R, p.face, r, p);
  if (R.shades) shades(r);
  if (R.cheeks) { c.globalAlpha = 0.5; circ(r * 0.52, r * 0.4, r * 0.16, '#ff8a80', 0); c.globalAlpha = 1; }
  if (R.tash) { c.beginPath(); c.moveTo(r * 0.38, r * 0.36); c.quadraticCurveTo(r * 0.65, r * 0.22, r * 0.95, r * 0.4); c.quadraticCurveTo(r * 0.65, r * 0.38, r * 0.38, r * 0.36); fs(R.hair, 2.5); }
  if (R.helmet && !(extra && extra.noHat)) helmet(r, R.helmet);
  if (R.golfCap && !(extra && extra.noHat)) golfCap(r, R.golfCap);
  if (R.nonla && !(extra && extra.noHat)) nonla(r);
  if (R.pot) pot(r, extra && extra.potOff);
}
function hair(R, r) {
  c.beginPath();
  if (R.cut === 'spiky') {
    c.moveTo(-r * 0.98, r * 0.18);
    const n = 7;
    for (let i = 0; i <= n; i++) { const a = PI * 0.98 + (i / n) * PI * 0.92, rad = r * (i % 2 ? 1.0 : 1.3); c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
    c.lineTo(r * 0.92, -r * 0.3); c.quadraticCurveTo(r * 0.4, -r * 0.42, r * 0.1, -r * 0.18); c.quadraticCurveTo(-r * 0.3, -r * 0.4, -r * 0.55, -r * 0.05); c.lineTo(-r * 0.7, r * 0.3); c.closePath();
  } else if (R.cut === 'bowl') {
    c.moveTo(-r * 1.04, r * 0.3); c.arc(0, 0, r * 1.08, PI * 0.92, PI * 2.04); c.lineTo(r * 0.98, -r * 0.18); c.lineTo(-r * 0.25, -r * 0.24); c.lineTo(-r * 0.55, r * 0.3); c.closePath();
  } else if (R.cut === 'side' || R.cut === 'pony' || R.cut === 'hightail') {
    c.moveTo(-r * 1.02, r * 0.35); c.arc(0, 0, r * 1.05, PI * 0.9, PI * 1.98); c.quadraticCurveTo(r * 0.5, -r * 0.55, -r * 0.1, -r * 0.42); c.quadraticCurveTo(-r * 0.5, -r * 0.1, -r * 0.55, r * 0.35); c.closePath();
  } else if (R.cut === 'messy') {
    c.moveTo(-r * 0.95, r * 0.05);
    for (let i = 0; i <= 5; i++) { const a = PI * 1.02 + (i / 5) * PI * 0.75, rad = r * (i % 2 ? 1.02 : 1.2); c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
    c.quadraticCurveTo(r * 0.2, -r * 0.6, -r * 0.4, -r * 0.3); c.closePath();
  } else if (R.cut === 'band') {
    c.moveTo(-r * 0.95, -r * 0.05); c.arc(0, 0, r * 1.04, PI * 1.0, PI * 1.75); c.quadraticCurveTo(-r * 0.1, -r * 0.7, -r * 0.6, -r * 0.2); c.closePath();
    fs(R.hair, 2.5);
    c.beginPath(); c.ellipse(0, -r * 0.42, r * 1.02, r * 0.2, 0, PI * 1.05, PI * 1.98, false); c.lineWidth = 6; c.strokeStyle = flashOn ? '#fff' : '#fff'; c.stroke();
    return;
  } else return;
  fs(R.hair, 2.5);
}
function face(R, kind, r, p) {
  const kid = R.eyes === 'kid', er = r * (kid ? 0.17 : 0.13), ey = -r * 0.05, ex = [r * 0.2, r * 0.64];
  c.lineCap = 'round';
  if (kind === 'zombie' || kind === 'roar') {
    // one big eye and one small, droopy lids, a jagged mouth with one tooth, a stitch
    circ(ex[0], ey - 1, r * 0.24, '#fffde7', 2.5); circ(ex[0] + r * 0.06, ey, r * 0.08, INK, 0);
    circ(ex[1], ey + 1, r * 0.15, '#fffde7', 2.5); circ(ex[1] + r * 0.04, ey + 2, r * 0.06, INK, 0);
    c.beginPath(); c.arc(ex[0], ey - 1, r * 0.25, PI * 1.15, PI * 1.85); ink(3); c.stroke();
    if (kind === 'roar') { ell(r * 0.48, r * 0.48, r * 0.24, r * 0.2, '#5d1f1f', 2.5); poly([r * 0.38, r * 0.3, r * 0.46, r * 0.3, r * 0.42, r * 0.42], '#fffde7', 1.5); }
    else {
      c.beginPath(); c.moveTo(r * 0.22, r * 0.5); c.lineTo(r * 0.36, r * 0.42); c.lineTo(r * 0.5, r * 0.52); c.lineTo(r * 0.66, r * 0.42); c.lineTo(r * 0.8, r * 0.5); ink(2.6); c.stroke();
      poly([r * 0.48, r * 0.5, r * 0.58, r * 0.5, r * 0.53, r * 0.62], '#fffde7', 1.5);
    }
    line(-r * 0.45, r * 0.25, -r * 0.2, r * 0.45, 1.6); line(-r * 0.4, r * 0.42, -r * 0.27, r * 0.28, 1.6);
    if (R.drool) { c.globalAlpha = 0.85; ell(r * 0.62, r * 0.75, r * 0.08, r * 0.2, '#c6ff00', 1.5); c.globalAlpha = 1; }
    return;
  }
  if (kind === 'ko') {
    for (const x of ex) { line(x - er, ey - er, x + er, ey + er, 2.6); line(x - er, ey + er, x + er, ey - er, 2.6); }
    c.beginPath(); c.moveTo(r * 0.28, r * 0.5); c.quadraticCurveTo(r * 0.45, r * 0.38, r * 0.62, r * 0.5); ink(2.4); c.stroke();
    return;
  }
  if (kind === 'happy') {
    for (const x of ex) { c.beginPath(); c.arc(x, ey + er * 0.4, er, PI * 1.1, PI * 1.9); ink(3); c.stroke(); }
    c.beginPath(); c.moveTo(r * 0.2, r * 0.32); c.quadraticCurveTo(r * 0.5, r * 0.85, r * 0.85, r * 0.3); c.closePath(); fs('#c62828', 2.4);
    return;
  }
  if (kind === 'hurt') {
    for (const x of ex) { c.beginPath(); c.moveTo(x - er, ey - er * 0.8); c.lineTo(x + er * 0.6, ey); c.lineTo(x - er, ey + er * 0.8); ink(2.6); c.stroke(); }
    ell(r * 0.5, r * 0.5, r * 0.14, r * 0.18, '#6d1b1b', 2.2);
    return;
  }
  // calm, fight, shout: open eyes
  for (const x of ex) { ell(x, ey, er * 0.85, er * 1.1, '#ffffff', 2.2); circ(x + er * 0.25, ey + er * 0.1, er * 0.55, '#2a1c14', 0); circ(x + er * 0.38, ey - er * 0.25, er * 0.2, '#ffffff', 0); }
  if (R.lashes) for (const x of ex) line(x + er * 0.6, ey - er * 1.05, x + er * 1.1, ey - er * 1.5, 2);
  if (kind === 'fight' || kind === 'shout') { line(ex[0] - er, ey - er * 1.7, ex[0] + er, ey - er * 1.25, 2.8); line(ex[1] - er, ey - er * 1.25, ex[1] + er, ey - er * 1.7, 2.8); }
  // nose
  c.beginPath(); c.arc(r * 0.92, r * 0.12, r * 0.12, -PI * 0.4, PI * 0.5); ink(2.2); c.stroke();
  if (kind === 'shout') { ell(r * 0.52, r * 0.52, r * 0.18, r * 0.16, '#8e1c1c', 2.4); }
  else if (kind === 'fight') { c.beginPath(); c.moveTo(r * 0.36, r * 0.52); c.lineTo(r * 0.66, r * 0.48); ink(2.6); c.stroke(); }
  else { c.beginPath(); c.arc(r * 0.5, r * 0.36, r * 0.2, PI * 0.15, PI * 0.85); ink(2.6); c.stroke(); }
}
function helmet(r, col) {
  // a scooter helmet, as every grown-up in Vietnam wears one
  c.beginPath(); c.arc(0, -r * 0.12, r * 1.13, PI * 1.02, PI * 1.98); c.lineTo(r * 1.15, -r * 0.05); c.lineTo(-r * 1.1, -r * 0.05); c.closePath(); fs(col, 3);
  c.fillStyle = flashOn ? '#fff' : '#e65100'; c.fillRect(-r * 0.1, -r * 1.2, r * 0.3, r * 1.1);
  line(-r * 0.3, -r * 0.05, r * 0.15, r * 0.8, 2, '#5d4037');
}
function golfCap(r, col) {
  // a golf cap with its peak to the front and a little red button on top
  c.beginPath(); c.arc(0, -r * 0.18, r * 1.06, PI * 1.03, PI * 1.97); c.closePath(); fs(col, 3);
  c.beginPath(); c.ellipse(r * 0.95, -r * 0.3, r * 0.62, r * 0.17, -0.12, 0, TAU); fs(col, 2.6);
  circ(0, -r * 1.22, r * 0.12, '#e53935', 1.6);
  line(-r * 0.55, -r * 0.62, r * 0.4, -r * 0.62, 1.4, '#4fc3f7');
}
function shades(r) {
  // sunglasses pushed up on her head
  ell(r * 0.12, -r * 0.82, r * 0.28, r * 0.17, '#212121', 2.2, -0.15); ell(r * 0.68, -r * 0.72, r * 0.25, r * 0.16, '#212121', 2.2, -0.15);
  line(r * 0.38, -r * 0.8, r * 0.44, -r * 0.78, 2.2); circ(r * 0.04, -r * 0.86, r * 0.06, '#ffffff', 0);
}
function golfCart(x, y) {
  // Bố's golf cart: a canopy on two posts, a seat, his golf bag at the back, small wheels
  c.save(); c.translate(x - 4, y);
  line(-36, -40, -32, -150, 3.5, '#9e9e9e'); line(32, -38, 28, -150, 3.5, '#9e9e9e');
  rr(-48, -160, 88, 14, 7, '#43a047', 3);
  rr(-58, -64, 18, 40, 6, '#c62828', 2.6); line(-54, -64, -57, -80, 2.6, '#bdbdbd'); line(-46, -64, -44, -82, 2.6, '#bdbdbd'); ell(-58, -81, 4, 2.6, '#424242', 1.4); ell(-44, -83, 4, 2.6, '#424242', 1.4);
  c.beginPath(); c.moveTo(-50, -14); c.lineTo(-48, -42); c.lineTo(-8, -44); c.lineTo(16, -34); c.lineTo(40, -32); c.lineTo(44, -14); c.closePath(); fs('#fafafa', 3);
  rr(-30, -50, 30, 9, 4, '#5d4037', 2.6);
  line(18, -34, 24, -60, 3.5); line(16, -60, 30, -62, 3.2);
  circ(-32, -10, 10, '#37474f', 3); circ(-32, -10, 4, '#b0bec5', 2);
  circ(30, -10, 10, '#37474f', 3); circ(30, -10, 4, '#b0bec5', 2);
  circ(42, -25, 4, '#fff59d', 2);
  c.restore();
}
function nonla(r) {
  // the conical leaf hat, tipped back
  c.save(); c.rotate(-0.12);
  c.beginPath(); c.moveTo(-r * 1.75, -r * 0.42); c.quadraticCurveTo(0, -r * 0.2, r * 1.75, -r * 0.42); c.lineTo(r * 0.05, -r * 1.95); c.closePath(); fs('#ead9a0', 3);
  for (let i = 1; i < 4; i++) { const t = i / 4; line(lerp(-r * 1.75, r * 0.05, t), lerp(-r * 0.42, -r * 1.95, t), lerp(r * 1.75, r * 0.05, t), lerp(-r * 0.42, -r * 1.95, t), 1.4, '#b89a55'); }
  c.restore();
}
function pot(r, off) {
  if (off) return;
  // an aluminium cooking pot worn as a helmet
  c.save(); c.translate(0, -r * 0.55); c.rotate(-0.15);
  rr(-r * 1.0, -r * 0.75, r * 2.0, r * 0.9, 5, '#cfd8dc', 3);
  ell(0, -r * 0.75, r * 1.0, r * 0.2, '#eceff1', 2.5);
  rr(r * 0.95, -r * 0.5, r * 0.55, r * 0.18, 3, '#37474f', 2);
  line(-r * 0.6, -r * 0.35, -r * 0.2, -r * 0.35, 2, '#90a4ae');
  c.restore();
}
function tray(R, p) {
  // the Tray Guard's big round bamboo tray, held in front
  const a = p.aa[1];
  c.save(); c.translate(Math.sin(a) * R.armL * 0.8 + 6, -R.bodyH * 0.55 + Math.cos(a) * 8);
  ell(0, 0, 9, 34, '#c8a165', 3); ell(0, 0, 5, 26, '#d9b77e', 2);
  for (let i = -2; i <= 2; i++) line(-6, i * 9, 6, i * 9 + 3, 1.4, '#8d6e3f');
  c.restore();
}
function scooter(x, y, R) {
  // Bố's red scooter
  c.save(); c.translate(x - 4, y);
  circ(-26, -10, 10, '#37474f', 3); circ(-26, -10, 4, '#b0bec5', 2);
  circ(30, -10, 10, '#37474f', 3); circ(30, -10, 4, '#b0bec5', 2);
  c.beginPath(); c.moveTo(-40, -20); c.quadraticCurveTo(-42, -42, -14, -40); c.lineTo(10, -36); c.lineTo(22, -24); c.lineTo(36, -26); c.lineTo(34, -16); c.lineTo(-38, -14); c.closePath(); fs('#e53935', 3);
  rr(-28, -46, 30, 8, 4, '#3e2723', 2.5);
  c.beginPath(); c.moveTo(26, -24); c.lineTo(34, -60); ink(4); c.stroke();
  line(28, -60, 42, -62, 4); circ(38, -50, 5, '#fff59d', 2.5);
  c.restore();
}
// what a hand holds; drawn along the arm
function holdThing(k, x, y, a, spin, p) {
  c.save(); c.translate(x, y); c.rotate(-a + PI / 2);
  if (k === 'banhmi') {
    c.rotate(-0.5);
    c.beginPath(); c.ellipse(16, 0, 20, 7.5, 0, 0, TAU); fs('#d89a4a', 2.6);
    c.beginPath(); c.ellipse(16, 2.5, 17, 3, 0, 0, PI); fs('#7cb342', 1.4);
    for (let i = 0; i < 3; i++) line(6 + i * 9, -5, 10 + i * 9, -1, 1.6, '#a0692c');
    circ(26, 3, 2, '#e53935', 0);
  } else if (k === 'club') {
    // a golf club: the grip in the hand, a long shaft, the driver's head at the end
    line(-4, 0, 12, 0, 6, INK); line(-4, 0, 12, 0, 3.5, '#212121');
    line(12, 0, 58, 0, 4, INK); line(12, 0, 58, 0, 2.2, '#cfd8dc');
    c.save(); c.translate(60, 2); c.rotate(0.35); rr(-4, -5, 18, 11, 5, '#1a237e', 2.4); line(12, -3, 12, 4, 2, '#e0e0e0'); c.restore();
  } else if (k === 'bag') {
    // a pink designer handbag on its strap, with a gold clasp
    c.beginPath(); c.arc(9, 0, 9, PI * 0.9, PI * 2.1); c.lineWidth = 2.6; c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.moveTo(4, 4); c.lineTo(26, 0); c.lineTo(30, 18); c.lineTo(2, 22); c.closePath(); fs('#f48fb1', 2.6);
    line(6, 12, 28, 9, 1.6, '#ad1457'); rr(13, 6, 7, 5, 1.5, '#ffc107', 1.4);
  } else if (k === 'fan') {
    c.rotate(-0.9);
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 22, -0.7, 0.7); c.closePath(); fs('#e53935', 2.4);
    for (let i = -2; i <= 2; i++) line(0, 0, Math.cos(i * 0.32) * 21, Math.sin(i * 0.32) * 21, 1.2, '#ffd54f');
  } else if (k === 'slipper') {
    slipperShape(10, 0, 0.6);
  } else if (k === 'pole') {
    c.rotate(spin || 0);
    rr(-54, -3.5, 108, 7, 3.5, '#9ccc65', 2.4);
    for (let i = -2; i <= 2; i++) line(i * 22, -3.5, i * 22, 3.5, 2, '#558b2f');
  } else if (k === 'wok') {
    c.rotate(-0.4);
    line(0, 0, 26, 0, 6, '#5d4037');
    c.beginPath(); c.ellipse(46, 4, 24, 12, 0, 0, PI); fs('#424242', 3); line(22, 4, 70, 4, 3);
  } else if (k === 'ruler') {
    c.rotate(-0.3);
    rr(0, -6, 92, 12, 2, '#ffca28', 2.6);
    for (let i = 1; i < 9; i++) line(i * 10, -6, i * 10, i % 2 ? -1 : 1, 1.3);
  } else if (k === 'pitchfork') {
    c.rotate(-0.25);
    line(-20, 0, 70, 0, 5, '#8d6e63');
    c.beginPath(); c.moveTo(70, -12); c.lineTo(70, 12); c.moveTo(70, -12); c.lineTo(90, -12); c.moveTo(70, 0); c.lineTo(92, 0); c.moveTo(70, 12); c.lineTo(90, 12); ink(4); c.stroke();
  } else if (k === 'anchor') {
    c.rotate(-0.3);
    line(0, 0, 66, 0, 7, '#546e7a'); line(0, 0, 66, 0, 3, '#90a4ae');
    c.beginPath(); c.arc(66, 0, 20, -PI / 2, PI / 2); ink(7); c.stroke();
    circ(-6, 0, 7, '#90a4ae', 3);
  } else if (k === 'flask') {
    c.beginPath(); c.moveTo(-4, -18); c.lineTo(4, -18); c.lineTo(4, -10); c.lineTo(12, 6); c.lineTo(-12, 6); c.lineTo(-4, -10); c.closePath(); fs('#ce93d8', 2.4);
    ell(0, 2, 10, 4, '#ab47bc', 0);
  } else if (k === 'snowball') {
    circ(10, 0, 12, '#ffffff', 2.6);
  }
  c.restore();
}
function slipperShape(x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  // a flip-flop: the sole and the strap
  c.beginPath(); c.ellipse(0, 0, 26, 11, 0, 0, TAU); fs('#ff7043', 3);
  c.beginPath(); c.ellipse(0, 0, 21, 7, 0, 0, TAU); fs('#ffccbc', 0);
  c.beginPath(); c.moveTo(14, 0); c.lineTo(-6, -9); c.moveTo(14, 0); c.lineTo(-6, 9); c.lineWidth = 4; c.strokeStyle = '#1565c0'; c.stroke();
  c.restore();
}

/* ================= the family ================= */
const HERO_COL = { bin: '#ef5350', bo: '#66bb6a', dad: '#42a5f5', mum: '#ab47bc' };
function hero(P, H, x, y, s, now) {
  const p = heroPose(P, H, now), R = RIGS[P.hero];
  flash(P.hitFlash);
  rig(R, x, y, s, P.face || 1, p, { who: P.hero, noHat: p.rot !== 0 && P.st !== 'spec' });
  flash(false);
  return p;
}
// a hero's head for cards and the HUD, in a square of size sz
function portrait(ctx, k, sz, mood) {
  use(ctx);
  const R = RIGS[k];
  c.save(); c.translate(sz * 0.5, sz * 0.58); const s = sz / (R.headR * 2.9); c.scale(s, s);
  const p = basePose(); p.face = mood || 'calm';
  head(R, p, { who: k });
  c.restore();
}

/* ================= zombies ================= */
function zombie(Z, zt, x, y, s, now) {
  const k = Z.k;
  flash(Z.hit > 0);
  if (k === 'bat') { bat(x, y, s, Z, now); flash(false); return; }
  const p = zombiePose(Z, zt, now), R = RIGS[k];
  if (k === 'bloater' && Z.st === 'dying') p.swell = Math.min(1.6, (Z.t || 0) * 3.5);
  rig(R, x, y, s, Z.face || 1, p, { tray: k === 'shield' && Z.shieldOn, potOff: k === 'bucket' && !Z.armor });
  flash(false);
}
function bat(x, y, s, Z, now) {
  const flap = Math.sin(now * 18 + (Z.id || 0)) * (Z.st === 'wind' ? 1.4 : 1);
  c.save(); c.translate(x, y); c.scale(s * (Z.face || 1), s);
  if (Z.st === 'dying') c.rotate(Z.t * 8);
  for (const side of [-1, 1]) {
    c.save(); c.scale(side, 1); c.rotate(flap * 0.5 * side);
    c.beginPath(); c.moveTo(6, -4); c.quadraticCurveTo(26, -26, 40, -8); c.quadraticCurveTo(32, -6, 30, 2); c.quadraticCurveTo(22, -2, 18, 6); c.quadraticCurveTo(12, 0, 6, 4); c.closePath(); fs('#6a4c93', 2.6);
    c.restore();
  }
  ell(0, 0, 13, 12, '#7e57c2', 3);
  poly([-8, -9, -4, -20, 0, -10], '#7e57c2', 2.4); poly([2, -10, 6, -20, 9, -8], '#7e57c2', 2.4);
  circ(4, -2, 4.2, '#fff59d', 2); circ(5, -2, 1.8, INK, 0);
  circ(-3, -1, 3, '#fff59d', 2); circ(-2, -1, 1.3, INK, 0);
  poly([1, 5, 4, 10, 6, 5], '#ffffff', 1.5);
  c.restore();
}

/* ================= bosses =================
   Built from rigs with their own clothes and tools, plus the crab and the Bat Queen, who are their own shapes. */
const BOSS_RIGS = {
  chef: { legL: 30, legW: 13, bodyW: 50, bodyH: 50, headR: 22, armL: 30, armW: 12, skin: '#9cc47a', top: '#fafafa', top2: '#e0e0e0', legs: '#455a64', shoe: '#263238', hair: '#3e4a26', cut: 'bald', zombie: true, round: true },
  scooter: { legL: 26, legW: 12, bodyW: 40, bodyH: 40, headR: 22, armL: 28, armW: 11, skin: '#a5d6a7', top: '#1565c0', top2: '#fdd835', legs: '#263238', shoe: '#212121', hair: '#3e4a26', cut: 'messy', zombie: true, helmet: '#fdd835' },
  scarecrow: { legL: 40, legW: 9, bodyW: 36, bodyH: 50, headR: 22, armL: 34, armW: 9, skin: '#e2c27a', top: '#8d6e63', top2: '#a1887f', legs: '#5d4037', shoe: '#3e2723', hair: '#fbc02d', cut: 'messy', zombie: true, torn: true, nonla: true },
  headmaster: { legL: 38, legW: 12, bodyW: 42, bodyH: 52, headR: 22, armL: 32, armW: 11, skin: '#8bb86f', top: '#6d4c41', top2: '#4e342e', legs: '#4e342e', shoe: '#212121', hair: '#9e9e9e', cut: 'band', zombie: true },
  pirate: { legL: 36, legW: 12, bodyW: 44, bodyH: 52, headR: 22, armL: 32, armW: 11, skin: '#b0c48c', top: '#c62828', top2: '#ffd54f', legs: '#263238', shoe: '#3e2723', hair: '#212121', cut: 'messy', zombie: true },
  yeti: { legL: 34, legW: 18, bodyW: 64, bodyH: 62, headR: 26, armL: 40, armW: 17, skin: '#b3e5fc', top: '#f5f5f5', top2: '#e0e0e0', legs: '#f5f5f5', shoe: '#cfd8dc', hair: '#ffffff', cut: 'messy', zombie: true, round: true, bare: true },
  doctor: { legL: 36, legW: 10, bodyW: 36, bodyH: 50, headR: 22, armL: 30, armW: 10, skin: '#a5d6a7', top: '#fafafa', top2: '#e0e0e0', legs: '#37474f', shoe: '#212121', hair: '#eeeeee', cut: 'spiky', zombie: true },
  mega: { legL: 44, legW: 20, bodyW: 70, bodyH: 70, headR: 28, armL: 44, armW: 19, skin: '#7cb342', top: '#455a64', top2: '#ffeb3b', legs: '#37474f', shoe: '#263238', hair: '#33691e', cut: 'bald', zombie: true, torn: true }
};
const BOSS_SCALE = { chef: 1.6, scooter: 1.45, scarecrow: 1.55, headmaster: 1.55, pirate: 1.55, yeti: 1.6, doctor: 1.55, mega: 1.9 };
const BOSS_HELD = { chef: 'wok', scarecrow: 'pitchfork', headmaster: 'ruler', pirate: 'anchor', doctor: 'flask', yeti: 'snowball' };
function boss(B, D, x, y, s, now) {
  flash(B.hit > 0);
  if (B.b === 'crab') crab(B, x, y, s, now);
  else if (B.b === 'batqueen') batQueen(B, x, y, s, now);
  else {
    const R = BOSS_RIGS[B.b], p = basePose(), t = B.t || 0, w = (B.x || 0) / 14;
    p.face = 'zombie';
    p.la = [Math.sin(w) * 0.3, -Math.sin(w) * 0.3]; p.aa = [1.2 + Math.sin(now * 2) * 0.1, 1.4 + Math.cos(now * 2) * 0.1]; p.lean = 0.08; p.tilt = Math.sin(now * 1.5) * 0.08;
    p.held = BOSS_HELD[B.b] || null;
    if (B.poseT > 0) {
      // an attack: arms up (the warning), then the blow
      const f = 1 - B.poseT / 1.3;
      p.face = 'roar';
      if (f < 0.55) { p.aa = [2.6, 2.95]; p.lean = -0.15; }
      else { p.aa = [1.4, lerp(2.95, 1.0, clamp((f - 0.55) * 5, 0, 1))]; p.lean = 0.28; }
    }
    if (B.st === 'dying') { p.rot = -PI / 2 * clamp(t / 0.6, 0, 1); p.face = 'ko'; }
    if (B.daze > 0) { p.face = 'ko'; p.tilt = Math.sin(now * 6) * 0.3; p.aa = [0.3, 0.3]; }
    if (B.b === 'scooter') { p.scooter = true; p.la = [1.3, 1.1]; p.lift = 22; if (B.charging) p.lean = 0.3; }
    rig(R, x, y, s * BOSS_SCALE[B.b], B.face || 1, p, { who: 'boss-' + B.b });
    bossExtras(B, x, y, s * BOSS_SCALE[B.b], p);
  }
  flash(false);
}
// hats and the rest, drawn over the rig's head (the rig's head position is worked out again here)
function bossExtras(B, x, y, s, p) {
  const R = BOSS_RIGS[B.b], f = B.face || 1;
  if (p.rot) return;
  const hy = y - (R.legL - (p.bob || 0) + R.bodyH + R.headR * 0.78 + (p.lift || 0)) * s;
  c.save(); c.translate(x + Math.sin(p.lean || 0) * (R.bodyH + R.headR) * s * f, hy); c.scale(s * f, s); c.rotate(p.tilt || 0);
  const r = R.headR;
  if (B.b === 'chef') { rr(-r * 0.75, -r * 2.2, r * 1.5, r * 1.3, 6, '#ffffff', 3); circ(-r * 0.5, -r * 2.15, r * 0.5, '#ffffff', 3); circ(r * 0.1, -r * 2.35, r * 0.55, '#ffffff', 3); circ(r * 0.6, -r * 2.1, r * 0.45, '#ffffff', 3); rr(-r * 0.8, -r * 1.05, r * 1.6, r * 0.3, 3, '#eeeeee', 2.5); c.beginPath(); c.moveTo(r * 0.3, r * 0.42); c.quadraticCurveTo(r * 0.75, r * 0.2, r * 1.15, r * 0.55); c.quadraticCurveTo(r * 0.7, r * 0.42, r * 0.3, r * 0.42); fs('#3e2723', 2); }
  else if (B.b === 'scooter') { poly([-r * 0.6, -r * 1.15, -r * 0.45, -r * 1.75, -r * 0.15, -r * 1.3, r * 0.1, -r * 1.85, r * 0.35, -r * 1.3, r * 0.65, -r * 1.75, r * 0.75, -r * 1.15], '#ffd54f', 2.6); circ(r * 0.1, -r * 1.42, 3, '#e53935', 0); }
  else if (B.b === 'headmaster') { circ(r * 0.2, -r * 0.05, r * 0.3, 'rgba(255,255,255,0.15)', 2.4); circ(r * 0.66, 0, r * 0.22, 'rgba(255,255,255,0.15)', 2.4); line(r * 0.5, -r * 0.05, r * 0.45, -r * 0.05, 2); c.beginPath(); c.moveTo(-r * 0.5, r * 1.0); c.lineTo(0, r * 1.45); c.lineTo(r * 0.5, r * 1.0); fs('#c62828', 2); }
  else if (B.b === 'pirate') { c.beginPath(); c.moveTo(-r * 1.5, -r * 0.6); c.quadraticCurveTo(0, -r * 2.4, r * 1.5, -r * 0.6); c.quadraticCurveTo(0, -r * 1.0, -r * 1.5, -r * 0.6); fs('#212121', 3); circ(0, -r * 1.25, r * 0.22, '#fafafa', 2); ell(r * 0.2, -r * 0.05, r * 0.28, r * 0.24, '#212121', 2); line(-r * 0.6, -r * 0.6, r * 0.9, -r * 0.3, 2.4); }
  else if (B.b === 'doctor') { rr(-r * 0.1, -r * 0.35, r * 1.05, r * 0.42, 6, '#80deea', 3); line(-r * 0.95, -r * 0.2, -r * 0.1, -r * 0.15, 3); }
  else if (B.b === 'mega') { c.beginPath(); c.arc(0, -r * 0.1, r * 1.12, PI * 1.0, PI * 2.0); c.closePath(); fs('#78909c', 3); rr(r * 0.05, -r * 0.35, r * 1.05, r * 0.32, 5, '#ff1744', 2.6); for (let i = 0; i < 3; i++) circ(-r * 0.6 + i * r * 0.35, -r * 0.75, 3, '#cfd8dc', 1.5); }
  else if (B.b === 'yeti') { poly([-r * 0.5, -r * 0.8, -r * 0.8, -r * 1.5, -r * 0.2, -r * 0.95], '#eceff1', 2.5); poly([r * 0.3, -r * 0.95, r * 0.6, -r * 1.55, r * 0.75, -r * 0.8], '#eceff1', 2.5); }
  c.restore();
}
function crab(B, x, y, s, now) {
  const t = B.t || 0, f = B.face || 1, snap = B.poseT > 0 ? 1 - B.poseT / 1.3 : 0;
  c.save(); c.translate(x, y); c.scale(s * f * 1.45, s * 1.45);
  if (B.hide > 0) {
    // under the sand: a moving mound and two eyes
    ell(0, -6, 60, 14, '#e0c48a', 3); circ(-10, -24, 6, '#ffffff', 2.5); circ(10, -24, 6, '#ffffff', 2.5); circ(-9, -24, 2.5, INK, 0); circ(11, -24, 2.5, INK, 0);
    c.restore(); return;
  }
  if (B.st === 'dying') c.rotate(clamp(t / 0.6, 0, 1) * PI * 0.9);
  // legs
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const lx = side * (24 + i * 16), a = Math.sin(now * 8 + i + side) * 0.2;
    c.beginPath(); c.moveTo(lx * 0.6, -40); c.lineTo(lx * 1.2, -60 + a * 20); c.lineTo(lx * 1.5, -4); ink(9); c.stroke(); c.lineWidth = 5; c.strokeStyle = flashOn ? '#fff' : '#e64a19'; c.stroke();
  }
  // claws
  const claw = (cx, open, big) => {
    c.save(); c.translate(cx, -70); c.scale(big, big);
    line(0, 20, 0, 0, 12, INK); line(0, 20, 0, 0, 7, flashOn ? '#fff' : '#f4511e');
    c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(-30, -26, -4, -48); c.quadraticCurveTo(14, -30, 6, -14); c.closePath(); fs('#ff7043', 3);
    c.save(); c.translate(6, -14); c.rotate(open); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(26, -10, 16, -34); c.quadraticCurveTo(6, -20, -2, -6); c.closePath(); fs('#ff7043', 3); c.restore();
    c.restore();
  };
  claw(-58, 0.3 + Math.sin(now * 3) * 0.2, 1);
  claw(62, snap > 0.55 ? -0.2 : 0.6 * (1 - snap) + Math.sin(now * 3.4) * 0.2, 1.25);
  // shell
  c.beginPath(); c.ellipse(0, -52, 66, 38, 0, 0, TAU); fs('#e53935', 3.5);
  c.beginPath(); c.ellipse(0, -60, 50, 22, 0, PI, TAU); c.fillStyle = flashOn ? '#fff' : 'rgba(255,255,255,0.18)'; c.fill();
  for (let i = -2; i <= 2; i++) circ(i * 18, -40 + Math.abs(i) * 3, 3.5, '#c62828', 0);
  // eyes on stalks
  for (const ex of [-14, 16]) { line(ex, -82, ex, -100, 5); circ(ex, -104, 9, '#ffffff', 3); circ(ex + 3, -104, 3.6, INK, 0); }
  c.beginPath(); c.moveTo(-14, -60); c.quadraticCurveTo(2, -50, 18, -60); ink(3); c.stroke();
  c.restore();
}
function batQueen(B, x, y, s, now) {
  const flap = Math.sin(now * 9) * (B.poseT > 0 ? 1.3 : 1), f = B.face || 1, t = B.t || 0;
  c.save(); c.translate(x, y); c.scale(s * f * 1.35, s * 1.35);
  if (B.st === 'dying') c.rotate(clamp(t / 0.8, 0, 1) * PI);
  for (const side of [-1, 1]) {
    c.save(); c.scale(side, 1); c.rotate(flap * 0.35 * side);
    c.beginPath(); c.moveTo(10, -50); c.quadraticCurveTo(60, -110, 112, -62); c.quadraticCurveTo(92, -56, 90, -36); c.quadraticCurveTo(72, -46, 62, -26); c.quadraticCurveTo(46, -40, 36, -22); c.quadraticCurveTo(24, -34, 12, -30); c.closePath(); fs('#4a148c', 3);
    line(14, -48, 104, -64, 1.6, '#7b1fa2');
    c.restore();
  }
  ell(0, -42, 30, 34, '#6a1b9a', 3.5);
  poly([-22, -64, -16, -96, -4, -70], '#6a1b9a', 3); poly([4, -70, 16, -96, 22, -64], '#6a1b9a', 3);
  poly([-18, -74, -12, -92, -4, -80, 4, -94, 12, -80, 18, -92, 22, -74], '#ffd54f', 2.5);
  circ(9, -50, 7, '#ff5252', 2.5); circ(10, -50, 2.6, INK, 0); circ(-7, -50, 6, '#ff5252', 2.5); circ(-6, -50, 2.2, INK, 0);
  poly([-4, -30, 0, -20, 3, -30], '#ffffff', 2); poly([6, -30, 9, -21, 12, -30], '#ffffff', 2);
  c.restore();
}

/* ================= things to smash ================= */
function prop(pr, x, y, s, place) {
  const hurt = pr.max ? 1 - pr.hp / pr.max : 0, wob = pr.hit > 0 ? Math.sin(pr.hit * 80) * 0.08 : 0;
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(wob + hurt * 0.06);
  flash(pr.hit > 0.07);
  switch (pr.k) {
    case 'stall': {
      // a market stall: a table of fruit under a striped awning
      line(-40, 0, -40, -76, 5); line(40, 0, 40, -76, 5);
      rr(-46, -38, 92, 16, 4, '#a1887f', 3);
      for (let i = 0; i < 6; i++) circ(-34 + i * 13.5, -44, 7, ['#ff7043', '#ffca28', '#66bb6a', '#ef5350', '#ab47bc', '#ffa726'][i], 2);
      c.beginPath(); c.moveTo(-52, -76); c.lineTo(52, -76); c.lineTo(46, -96); c.lineTo(-46, -96); c.closePath(); fs('#ef5350', 3);
      for (let i = 0; i < 4; i++) { c.fillStyle = flashOn ? '#fff' : '#ffffff'; c.fillRect(-42 + i * 24, -95, 10, 18); }
      break;
    }
    case 'crate': rr(-24, -44, 48, 44, 4, '#c58b4f', 3); line(-20, -40, 20, -4, 3, '#8d5a2b'); line(20, -40, -20, -4, 3, '#8d5a2b'); rr(-24, -44, 48, 44, 4, 'rgba(0,0,0,0)', 3); break;
    case 'basket': c.beginPath(); c.moveTo(-26, -30); c.lineTo(26, -30); c.lineTo(20, 0); c.lineTo(-20, 0); c.closePath(); fs('#d7a75f', 3); for (let i = 0; i < 3; i++) line(-24 + i * 2, -22 + i * 8, 24 - i * 2, -22 + i * 8, 1.6, '#a0743c'); for (let i = 0; i < 4; i++) circ(-15 + i * 10, -34, 6.5, ['#ffeb3b', '#ff9800', '#8bc34a', '#f44336'][i], 2); break;
    case 'barrel': ell(0, -26, 22, 28, '#a1683a', 3); line(-21, -38, 21, -38, 3, '#5d4037'); line(-21, -14, 21, -14, 3, '#5d4037'); ell(0, -52, 16, 4, '#8d5a2b', 2); break;
    case 'hay': c.beginPath(); c.moveTo(-34, 0); c.quadraticCurveTo(-36, -56, 0, -60); c.quadraticCurveTo(36, -56, 34, 0); c.closePath(); fs('#f2c94c', 3); for (let i = 0; i < 6; i++) line(-24 + i * 10, -8, -20 + i * 9, -42 + (i % 2) * 6, 1.6, '#c9a227'); break;
    case 'desk': rr(-34, -42, 68, 10, 3, '#a1887f', 3); line(-28, -32, -28, 0, 5); line(28, -32, 28, 0, 5); rr(-18, -56, 22, 14, 2, '#42a5f5', 2.5); rr(2, -52, 20, 10, 2, '#ef5350', 2.5); break;
    case 'chair': c.beginPath(); c.moveTo(-30, 0); c.lineTo(-10, -30); c.lineTo(30, -30); ink(4); c.stroke(); c.beginPath(); c.moveTo(-30, -6); c.lineTo(-18, -28); c.lineTo(-30, -62); c.lineTo(-40, -54); c.closePath(); fs('#4fc3f7', 3); line(30, -30, 30, 0, 4); break;
    case 'crystal': poly([-20, 0, -26, -34, -12, -60, -2, -26], '#4dd0e1', 3); poly([-4, 0, 2, -72, 14, -30, 10, 0], '#80deea', 3); poly([10, 0, 22, -44, 30, -12, 26, 0], '#26c6da', 3); break;
    case 'snowman': circ(0, -22, 24, '#ffffff', 3); circ(0, -60, 17, '#ffffff', 3); circ(5, -64, 2.4, INK, 0); circ(13, -63, 2.4, INK, 0); poly([10, -58, 28, -55, 10, -53], '#ff9800', 2); c.save(); c.translate(0, -62); nonla(13); c.restore(); break;
    case 'pot': c.beginPath(); c.moveTo(-20, -30); c.lineTo(20, -30); c.lineTo(14, 0); c.lineTo(-14, 0); c.closePath(); fs('#d84315', 3); for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(0, -30); c.quadraticCurveTo(i * 14, -58, i * 22, -50); ink(5); c.stroke(); c.lineWidth = 3; c.strokeStyle = flashOn ? '#fff' : '#66bb6a'; c.stroke(); } break;
    case 'canister': rr(-18, -62, 36, 62, 8, '#90a4ae', 3); rr(-10, -50, 20, 30, 5, '#76ff03', 2.5); ell(0, -62, 18, 5, '#b0bec5', 2.5); break;
    default: rr(-22, -40, 44, 40, 4, '#c58b4f', 3);
  }
  // cracks as it is hit
  if (hurt > 0) { c.beginPath(); c.moveTo(-6, -40); c.lineTo(2, -26); c.lineTo(-4, -16); c.lineTo(6, -6); ink(2); c.stroke(); }
  flash(false);
  c.restore();
}

/* ================= food, coins and shots ================= */
function pickThing(k, x, y, s, now) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const bob = Math.sin(now * 5 + x * 0.05) * 3;
  c.translate(0, bob - 6);
  if (k === 'coin') {
    const w = Math.abs(Math.cos(now * 4 + x * 0.1));
    ell(0, -10, 11 * Math.max(0.2, w), 11, '#ffca28', 2.6);
    if (w > 0.5) { c.font = '700 13px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#a66d00'; c.fillText('đ', 0, -10); }
  } else if (k === 'banhmi') {
    c.rotate(-0.15);
    c.beginPath(); c.ellipse(0, -12, 24, 9, 0, 0, TAU); fs('#e0a050', 2.8);
    c.beginPath(); c.ellipse(0, -9, 20, 4, 0, 0, PI); fs('#8bc34a', 1.6);
    circ(-6, -7, 2.4, '#e53935', 0); circ(7, -7, 2, '#ff7043', 0);
    for (let i = 0; i < 3; i++) line(-12 + i * 10, -18, -8 + i * 10, -14, 1.8, '#a0692c');
  } else if (k === 'pho') {
    c.beginPath(); c.moveTo(-22, -16); c.quadraticCurveTo(0, 12, 22, -16); c.closePath(); fs('#ffffff', 2.8);
    ell(0, -16, 22, 6, '#ffe0b2', 2.4); line(-10, -17, 8, -15, 2, '#fff8e1'); circ(-6, -17, 3, '#e57373', 1.2); circ(6, -18, 3, '#81c784', 1.2);
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 8, -26); c.quadraticCurveTo(i * 8 + 5, -32, i * 8, -38); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.stroke(); }
    line(10, -30, 26, -16, 2.4, '#8d6e63'); line(14, -30, 28, -18, 2.4, '#8d6e63');
  } else if (k === 'che') {
    c.beginPath(); c.moveTo(-10, -36); c.lineTo(10, -36); c.lineTo(7, 0); c.lineTo(-7, 0); c.closePath(); fs('rgba(255,255,255,0.6)', 2.4);
    c.fillStyle = '#81c784'; c.fillRect(-7.5, -10, 15, 9); c.fillStyle = '#ffd54f'; c.fillRect(-8, -20, 16, 10); c.fillStyle = '#fff3e0'; c.fillRect(-8.5, -30, 17, 10);
    line(4, -46, 0, -30, 2.6, '#e91e63');
  }
  c.restore();
}
function shot(sh, x, y, s, now) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const k = sh.k, spin = sh.spin || now * 12;
  if (k === 'slipper') { c.rotate(spin); slipperShape(0, 0, 0.75); }
  else if (k === 'spit') { c.globalAlpha = 0.95; ell(-sh.vx * 6, 0, 14, 6, '#c6ff00', 0); c.globalAlpha = 1; circ(0, 0, 8, '#aeea00', 2.5); }
  else if (k === 'dumpling') { c.rotate(spin * 0.3); c.beginPath(); c.moveTo(-14, 4); c.quadraticCurveTo(0, -20, 14, 4); c.closePath(); fs('#fff8e1', 2.6); for (let i = -1; i <= 1; i++) line(i * 5, -6, i * 4, 2, 1.4, '#d7ccc8'); }
  else if (k === 'chalk') { c.rotate(spin); rr(-12, -3.5, 24, 7, 3, '#ffffff', 2.2); }
  else if (k === 'bubble') { c.globalAlpha = 0.7; circ(0, 0, 13, 'rgba(179,229,252,0.5)', 2.2); c.globalAlpha = 1; circ(-4, -5, 3, '#ffffff', 0); }
  else if (k === 'snowball') circ(0, 0, 13, '#ffffff', 2.8);
  else if (k === 'cannonball') { circ(0, 0, 13, '#37474f', 3); circ(-4, -4, 3.5, '#78909c', 0); }
  else if (k === 'potion') { c.rotate(spin * 0.5); holdThing('flask', 0, 0, PI / 2, 0); }
  else circ(0, 0, 8, '#ffffff', 2);
  c.restore();
}

/* ================= questions: drums, gongs, the gate ================= */
function fitText(text, maxW, size) {
  c.font = '700 ' + size + 'px Fredoka, sans-serif';
  let w = c.measureText(text).width;
  if (w > maxW) { size = Math.max(10, Math.floor(size * maxW / w)); c.font = '700 ' + size + 'px Fredoka, sans-serif'; }
  return size;
}
// d: { text, ok, bad, lock }; hint: make the right one glow; gong: a boss's gong instead of a drum
function drum(d, x, y, s, now, hint, gong) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const glow = hint && d.ok && !d.bad;
  if (glow) { c.globalAlpha = 0.35 + Math.sin(now * 8) * 0.2; ell(0, -36, 58, 50, '#fff176', 0); c.globalAlpha = 1; }
  if (gong) {
    // a gong on a red frame
    line(-30, 0, -30, -86, 6, '#8e1c1c'); line(30, 0, -30 + 60, -86, 6, '#8e1c1c'); line(-38, -86, 38, -86, 7, '#8e1c1c');
    if (d.bad) { c.globalAlpha = 0.5; }
    circ(0, -50, 24, d.bad ? '#9e9e9e' : '#ffca28', 3); circ(0, -50, 14, d.bad ? '#bdbdbd' : '#ffe082', 2);
    if (d.bad) { line(-14, -62, 6, -40, 3); c.globalAlpha = 1; }
  } else {
    // a red Vietnamese drum on legs
    line(-20, 0, -14, -20, 4, '#5d4037'); line(20, 0, 14, -20, 4, '#5d4037');
    if (d.bad) {
      c.beginPath(); c.moveTo(-26, -20); c.lineTo(-24, -52); c.lineTo(-6, -40); c.lineTo(4, -58); c.lineTo(26, -50); c.lineTo(26, -20); c.closePath(); fs('#9e9e9e', 3);
    } else {
      rr(-27, -56, 54, 38, 10, '#d32f2f', 3);
      ell(0, -56, 27, 7, '#fff3e0', 3);
      line(-27, -46, 27, -46, 2, '#ffd54f'); line(-27, -28, 27, -28, 2, '#ffd54f');
      for (let i = -2; i <= 2; i++) circ(i * 11, -37, 1.6, '#ffd54f', 0);
    }
  }
  // the answer on a sign above
  const lock = d.lock > 0 && !d.bad, txt = String(d.text);
  const size = fitText(txt, 124, 22);
  const w = Math.max(54, c.measureText(txt).width + 22), top = gong ? -128 : -100;
  c.globalAlpha = d.bad ? 0.45 : 1;
  rr(-w / 2, top, w, 34, 12, glow ? '#fff9c4' : '#ffffff', 3);
  c.fillStyle = lock ? '#9e9e9e' : INK; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '700 ' + size + 'px Fredoka, sans-serif';
  c.fillText(txt, 0, top + 18);
  if (d.bad) { line(-w / 2 + 6, top + 17, w / 2 - 6, top + 17, 3, '#c62828'); }
  c.globalAlpha = 1;
  c.restore();
}
// the gate across the street: a slanting wooden barricade from the back of the street (back) to the front (front),
// with a big padlock and a question mark; opened (f from 0 to 1), it lifts away
function gate(x, back, front, place, f) {
  const col = GATE_COL[place] || GATE_COL.market, open = ease(clamp(f, 0, 1));
  c.save(); c.translate(0, -open * 300); c.globalAlpha = 1 - open * 0.8;
  const bx = x, fx = x + 46, bt = back - 130, ft = front - 172;
  c.beginPath(); c.moveTo(bx, back); c.lineTo(fx, front); c.lineTo(fx, ft); c.lineTo(bx, bt); c.closePath(); fs(col[0], 3.5);
  for (let i = 1; i < 6; i++) { const t = i / 6; line(bx + 3, lerp(bt, back, t), fx - 3, lerp(ft, front, t), 2.5, col[1]); }
  line(bx, bt, fx, front, 5, col[1]); line(bx, back, fx, ft, 5, col[1]);
  rr(bx - 8, bt - 14, 16, back - bt + 14, 5, col[1], 3);
  rr(fx - 10, ft - 16, 20, front - ft + 16, 6, col[1], 3);
  circ(bx, bt - 16, 9, col[0], 3); circ(fx, ft - 18, 11, col[0], 3);
  if (f <= 0) {
    const mx = (bx + fx) / 2, my = (bt + ft) / 2 + 70;
    c.beginPath(); c.arc(mx, my - 4, 14, Math.PI, 0); ink(5); c.stroke();
    rr(mx - 22, my - 6, 44, 36, 8, '#ffca28', 3);
    c.font = '700 26px Fredoka, sans-serif'; c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('?', mx, my + 13);
  }
  c.restore();
}
const GATE_COL = {
  market: ['#c58b4f', '#7a4a22'], oldquarter: ['#8d6e63', '#4e342e'], ricefield: ['#c5e1a5', '#558b2f'], school: ['#90caf9', '#1565c0'],
  beach: ['#ffe0b2', '#a1887f'], bay: ['#a1887f', '#4e342e'], cave: ['#90a4ae', '#455a64'], mountain: ['#e3f2fd', '#78909c'],
  rooftop: ['#b0bec5', '#37474f'], lab: ['#cfd8dc', '#00838f']
};

return { use, flash, RIGS, HERO_COL, hero, heroPose, zombie, boss, prop, pickThing, shot, drum, gate, portrait, slipperShape, circ, ell, rr, line, poly, ink, INK };
})();
