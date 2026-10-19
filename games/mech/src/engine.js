/* games/mech/src/engine.js — Mech Blaster's rules, pure and deterministic: no DOM and no Math.random, so tools/check.js
   can play every level thousands of times with a bot, and a level plays the same way from the same seed.

   World units are metres and seconds. The mech stands at z = 0 and walks forward along a three-lane road; z is the
   distance ahead of it, x is sideways (lane centres at -3.2, 0 and 3.2) and y is height above the road. Things on the
   ground slide towards the mech as it walks; flying things keep their own pace.

   MB.start(level, options) makes a state S; MB.step(S, dt) moves it on by dt (the page uses 1/60 s steps). The child
   steers the mech left and right (MB.steer while a button is held, MB.steerTo to follow a finger), jumps, picks a
   weapon and sets off the nova; the guns fire straight ahead by themselves whenever something is lined up with the
   mech (or, if the page asks for it, while a Fire button is held: press, release). To answer a gate or a boss's shield
   the child stands under the answer and fires the answer shot (MB.shootAnswer, the gold Answer button): nothing is
   ever answered by accident. The page draws S and empties S.ev (what just happened: shots, hits, booms, right and
   wrong answers) to play sounds and throw sparks. MB.bot(S, profile) is a test pilot that plays like a child: it
   dodges what it sees, jumps over low things, lines up with the enemy it wants to hit and goes for the answer it
   picked. */
(function (root) {
'use strict';
// RANGE: the mech's guns reach this far; enemies further down the road cannot be hit yet
// XMAX: how far the mech can slide from the middle; STEER: its speed while a button is held; SLIDE: the fastest it
// slides to where a finger leads it; AIM: how far from an answer's middle the mech may stand to shoot it (half the
// gap between two answers, so the mech always stands under one of them)
const XMAX = 3.9, STEER = 11, SLIDE = 16, AIM = 1.61;
// SIDE: roadside enemies stand on the kerb, close enough to hit from the outer lane
const RANGE = 72, LANE = 3.2, SIDE = 5.8, SPAWN = 118, HOLD = 12, MECH_R = 0.95, JUMP_V = 10.4, GRAV = 21;
const laneX = (l) => (l - 1) * LANE;
const laneOf = (x) => Math.max(0, Math.min(2, Math.round(x / LANE) + 1));
const lerp = (a, b, t) => a + (b - a) * t;
const clampN = (v, a, b) => (v < a ? a : v > b ? b : v);
const inLane = (x, l) => Math.abs(x - laneX(l)) < 1.6;

function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ================= weapons =================
   The guns fire straight ahead, by themselves (or while the Fire button is held, if the child chose that): every is the
   time between shots. Aiming help is gentle: a shot bends a little towards an enemy it is already lined up with, and
   rockets and lightning look a little to the side (seek, metres). unlock: the level to finish first. Front shields
   (Shield Bots) stop the weapons marked blocked; rockets fly over them and plasma breaks them. */
const WEAPONS = {
  blaster: { unlock: 0, every: 0.2, dmg: 1, speed: 92, home: 3.5, r: 0.45, blocked: true },
  gatling: { unlock: 4, every: 0.08, dmg: 0.42, speed: 96, spread: 0.018, r: 0.35, blocked: true },
  rockets: { unlock: 9, every: 0.85, dmg: 2.4, n: 2, speed: 34, home: 9, splash: 2.0, r: 0.45, seek: 4.2 },
  lightning: { unlock: 14, every: 0.6, dmg: 2, chain: 3, range: 13, fall: 0.75, seek: 2.6, blocked: true },
  plasma: { unlock: 19, every: 1.05, dmg: 6, speed: 62, r: 0.95, pierce: true, breaks: true },
  freeze: { unlock: 24, every: 0.6, dmg: 0.8, speed: 76, home: 3.5, freeze: 3, splash: 2.7, r: 0.55, blocked: true },
  laser: { unlock: 29, dps: 6, blocked: true }
};
const ORDER = ['blaster', 'gatling', 'rockets', 'lightning', 'plasma', 'freeze', 'laser'];
const NOVA_UNLOCK = 39, NOVA_CHARGES = 2;
// what the player has after finishing `done` levels (the highest level finished)
function arsenal(done) { return ORDER.filter((w) => WEAPONS[w].unlock <= done); }

/* ================= enemies and obstacles =================
   hp before the level's toughness; r: hit radius; h: height (a jump clears things under ~2.3 m); score: points. */
const EN = {
  drone: { hp: 2, r: 0.9, h: 1.3, score: 10, fly: true, vs: 1.7 },
  walker: { hp: 3, r: 1.0, h: 2.3, score: 20, vs: 1.45 },
  turret: { hp: 5, r: 1.15, h: 2.7, score: 40, vs: 1.35 },
  bike: { hp: 2, r: 1.05, h: 1.4, score: 30, vs: 1.35 },
  shield: { hp: 4, r: 1.1, h: 2.4, score: 50, vs: 1.45 },
  bomber: { hp: 6, r: 2.3, h: 1.4, score: 80, fly: true, vs: 1.5 },
  spider: { hp: 6, r: 1.3, h: 1.6, score: 70, vs: 1.45 },
  sentinel: { hp: 8, r: 1.1, h: 5.2, score: 90, vs: 1.15 },
  rival: { hp: 14, r: 1.45, h: 3.3, score: 150, vs: 1.4 },
  carrier: { hp: 30, r: 3.6, h: 2.8, score: 300, fly: true, vs: 1.35 },
  missile: { hp: 1, r: 0.6, h: 0.6, score: 5, fly: true, vs: 1.4 },
  crate: { hp: 2, r: 1.05, h: 1.9, score: 5, obs: true },
  barrier: { hp: 0, r: 1.45, h: 1.3, obs: true },
  block: { hp: 0, r: 1.45, h: 4.4, obs: true },
  fence: { hp: 0, r: 0, h: 0.9, obs: true },
  mine: { hp: 1, r: 0.7, h: 0.45, score: 5, obs: true, vs: 1.3 },
  boulder: { hp: 3, r: 1.15, h: 2.1, score: 15, obs: true, vs: 1.15 },
  geyser: { hp: 0, r: 1.3, h: 0, obs: true }
};
// what each enemy does, for the briefing cards and the hangar
const ENEMY_ORDER = ['drone', 'walker', 'turret', 'bike', 'shield', 'bomber', 'spider', 'sentinel', 'rival', 'carrier'];

/* ================= bosses =================
   Three question shields each: shoot the right answer orb to break the shield, then hit the boss while it is open. */
const BOSSES = {
  crab: { hp: 120, scale: 2.0, r: 4.4, h: 4.2, y: 0, z: 28, sway: 2.6, gap: 2.9, atk: ['slam', 'bubbles', 'slam', 'summon'], minion: 'drone', punish: 'bubbles' },
  scorpion: { hp: 170, scale: 1.9, r: 4.6, h: 4.6, y: 0, z: 31, sway: 2.8, gap: 2.7, atk: ['sweep', 'bombs', 'sting', 'sweep', 'summon'], minion: 'walker', punish: 'bombs' },
  titan: { hp: 210, scale: 1.6, r: 4.8, h: 8.6, y: 0, z: 33, sway: 1.8, gap: 2.6, atk: ['boulder', 'breath', 'icicles', 'boulder', 'summon'], minion: 'shield', punish: 'breath' },
  dragon: { hp: 210, scale: 1.55, r: 5.2, h: 4.2, y: 1.4, z: 32, sway: 3.4, gap: 2.9, atk: ['breath', 'meteors', 'dive', 'missiles', 'breath'], minion: 'drone', punish: 'meteors' },
  omega: { hp: 300, scale: 1.7, r: 5.6, h: 7.5, y: 3.0, z: 35, sway: 2.2, gap: 2.2, atk: ['ring', 'arms', 'missiles', 'volley', 'summon', 'ring'], minion: 'drone', punish: 'arms' }
};

/* ================= a level starts ================= */
// level: { id, w, len, v, ev: [[d, kind, lane, extra], ...] } (see tools/genlevels.js). options: seed, ask(kind, S)
// (makes a question: { text, choices: [3], correct, tip, raw }), weapons (ids), weapon, nova, from (checkpoint distance), hp
function start(level, o) {
  o = o || {};
  const g = clampN((level.id - 1) / 49, 0, 1), weapons = (o.weapons && o.weapons.length ? o.weapons : ['blaster']).slice();
  const S = {
    L: level, n: level.id, rnd: mulberry(o.seed || 1), ask: o.ask || null, g: g,
    fireMul: lerp(1.3, 0.95, g), bsp: lerp(14, 21, g), hpm: 1 + 0.4 * g, dmgm: lerp(0.85, 1.05, g),
    t: 0, d: o.from || 0, v: level.v, len: level.len,
    mech: { lane: 1, x: 0, tx: 0, dir: 0, vx: 0, y: 0, vy: 0, air: false, hp: o.hp || 100, max: 100, inv: 0, shield: 0, power: 0, heat: 0, hot: 0,
      cd: 0, charge: 0, holding: false, aimId: 0, aim: null, walk: 0, lean: 0, hurt: 0, recoil: 0, land: 0, side: 1 },
    autoFire: o.autoFire !== false,
    weapons: weapons, weapon: o.weapon && weapons.indexOf(o.weapon) >= 0 ? o.weapon : weapons[0],
    nova: o.nova || 0, ents: [], shots: [], bullets: [], marks: [], zaps: [], shells: [], ev: [], beam: null,
    next: 0, gate: null, boss: null, cp: o.from || 0, id: 1, minions: 0,
    score: 0, combo: 0, comboT: 0, maxCombo: 0,
    stats: { kills: 0, fired: 0, right: 0, wrong: 0, first: 0, asked: 0, hurt: 0, gates: 0 },
    state: 'play', endT: 0, slow: 0, shake: 0, flash: 0
  };
  while (S.next < level.ev.length && level.ev[S.next][0] <= S.d + 0.5) S.next++;
  return S;
}

function add(S, e) { e.id = S.id++; e.t = e.t || 0; e.hit = 0; e.frz = 0; e.stun = 0; e.dz = 0; S.ents.push(e); return e; }

function spawn(S, ev) {
  const d = ev[0], k = ev[1], a = ev[2], b = ev[3], z = d - S.d;
  if (k === 'gate') return spawnGate(S, z);
  if (k === 'boss') return spawnBoss(S, a, z);
  if (k === 'pick') return add(S, { k: 'pick', c: 'pick', p: b || 'gem', x: laneX(a), y: 1.2, z: z, r: 1.0, h: 1 });
  const base = EN[k];
  if (!base) return null;
  const x = a === -1 ? -SIDE : a === 3 ? SIDE : laneX(a == null ? 1 : a);
  const hp = base.hp ? (base.obs ? base.hp : Math.max(1, Math.round(base.hp * S.hpm * 2) / 2)) : 0;
  // vs: drawn this much bigger than its body (things far down the road must be easy to see and tap); hr: hit radius for shots
  const vs = base.vs || 1;
  const e = add(S, { k: k, c: base.obs ? 'obs' : 'enemy', x: x, y: 0, z: z, lane: a, hp: hp, max: hp, r: base.r, h: base.h, vs: vs, hr: base.r * vs, st: 'in', cd: 0, tel: 0.5 });
  if (INIT[k]) INIT[k](S, e, b);
  return e;
}

/* ================= questions: gates and boss shields ================= */
function demoQuestion(S) {
  const a = 2 + Math.floor(S.rnd() * 8), b = 2 + Math.floor(S.rnd() * 8), ans = a * b, wrong = [ans + a, ans - b];
  const correct = Math.floor(S.rnd() * 3), choices = wrong.slice();
  choices.splice(correct, 0, ans);
  return { text: a + ' × ' + b + ' = ?', choices: choices.map(String), correct: correct, tip: a + ' × ' + b + ' = ' + ans, kind: 'math' };
}
function question(S, kind) { const q = S.ask ? S.ask(kind, S) : null; S.stats.asked++; return q || demoQuestion(S); }

function spawnGate(S, z) {
  const q = question(S, 'gate');
  const g = add(S, { k: 'gate', c: 'gate', x: 0, y: 0, z: z, r: 6, h: 5, q: q, open: false, openT: 0, wrongs: 0, idle: 0, hint: false,
    panels: [0, 1, 2].map((i) => ({ text: String(q.choices[i]), ok: i === q.correct, gone: false, bad: false })) });
  S.gate = g;
  S.ev.push({ e: 'gate', q: q });
  return g;
}

function spawnBoss(S, b, z) {
  const B = BOSSES[b] || BOSSES.crab;
  const e = add(S, { k: 'boss', c: 'boss', b: b, x: 0, y: B.y, z: Math.max(z, 90), hp: B.hp, max: B.hp, r: B.r * B.scale, h: B.h * B.scale, scale: B.scale, mode: 'enter', ph: 0, q: null,
    orbs: [], wrongs: 0, atkT: 3, open: 0, cycle: 0, def: B });
  S.boss = e;
  // a checkpoint: going down in the boss fight starts again at the boss
  S.cp = S.d;
  S.ev.push({ e: 'boss', b: b });
  return e;
}
function bossShield(S, B) {
  B.mode = 'shield'; B.wrongs = 0; B.hintT = 0;
  B.q = question(S, 'boss');
  B.orbs = [0, 1, 2].map((i) => ({ text: String(B.q.choices[i]), ok: i === B.q.correct, gone: false, bad: false, x: laneX(i), y: 3.0, z: B.z - 11 }));
  S.ev.push({ e: 'bshield', q: B.q });
}

// the child's answer: a glowing shell flies from the shoulder cannon to panel or orb i and decides when it lands
function answer(S, i) {
  if (S.state !== 'play' || S.shells.length) return false;
  const G = S.gate && !S.gate.open ? S.gate : null, B = !G && S.boss && S.boss.mode === 'shield' ? S.boss : null;
  if (!G && !B) return false;
  const P = G ? G.panels[i] : B.orbs[i];
  if (!P || P.gone || P.bad) return false;
  if (G && G.z > 95) return false;
  const M = S.mech;
  S.shells.push({ i: i, of: G ? 'gate' : 'boss', x: M.x + 0.9, y: M.y + 2.7, z: 0.9, x0: M.x + 0.9, y0: M.y + 2.7, z0: 0.9, t: 0, dur: 0.3 });
  S.ev.push({ e: 'ashot' });
  return true;
}
function resolve(S, sh) {
  const M = S.mech;
  if (sh.of === 'gate') {
    const G = S.gate;
    if (!G || G.open) return;
    const P = G.panels[sh.i];
    if (P.ok) {
      const first = G.wrongs === 0;
      G.open = true; G.openT = 0; P.gone = true;
      S.stats.right++; if (first) S.stats.first++;
      S.score += first ? 200 : G.wrongs === 1 ? 100 : 50;
      S.slow = 0.45; S.shake = Math.max(S.shake, 0.6);
      S.ev.push({ e: 'right', first: first, q: G.q, x: laneX(sh.i), y: 2.4, z: G.z });
    } else {
      P.bad = true; G.wrongs++; S.stats.wrong++;
      if (G.wrongs >= 2) G.hint = true;
      S.ev.push({ e: 'wrong', q: G.q, pick: P.text, x: laneX(sh.i), y: 2.4, z: G.z });
      // the gate zaps back: a little damage
      S.zaps.push({ pts: [[laneX(sh.i), 2.4, G.z], [M.x, M.y + 1.8, 0.4]], t: 0.25, c: 'bad' });
      hurt(S, 5 * S.dmgm, 'gate');
    }
  } else {
    const B = S.boss;
    if (!B || B.mode !== 'shield') return;
    const P = B.orbs[sh.i];
    if (P.ok) {
      const first = B.wrongs === 0;
      S.stats.right++; if (first) S.stats.first++;
      S.score += first ? 300 : 120;
      B.orbs = []; B.mode = 'stagger'; B.t2 = 1.3; B.open = 8;
      S.slow = 0.5; S.shake = Math.max(S.shake, 0.8);
      S.ev.push({ e: 'right', first: first, q: B.q, boss: true, x: B.x, y: B.y + B.h * 0.5, z: B.z });
    } else {
      P.bad = true; B.wrongs++; S.stats.wrong++;
      S.ev.push({ e: 'wrong', q: B.q, pick: P.text, boss: true, x: P.x, y: P.y, z: P.z });
      attack(S, B, B.def.punish);
    }
  }
}

/* ================= damage ================= */
function hurt(S, dmg, src) {
  const M = S.mech;
  if (M.inv > 0 || S.state !== 'play') return false;
  if (M.shield > 0) { M.inv = 0.35; S.ev.push({ e: 'shieldhit', src: src }); return false; }
  const n = Math.max(1, Math.round(dmg));
  M.hp = Math.max(0, M.hp - n); M.inv = 0.9; M.hurt = 0.4;
  S.combo = 0; S.stats.hurt++;
  S.shake = Math.max(S.shake, 0.55); S.flash = 0.3;
  S.ev.push({ e: 'hurt', dmg: n, src: src });
  if (M.hp <= 0) { S.state = 'down'; S.endT = S.t; S.ev.push({ e: 'down' }); }
  return true;
}
function blockedBy(e, w) { return e.k === 'shield' && e.shieldUp && !e.broken && WEAPONS[w] && WEAPONS[w].blocked; }
function damage(S, e, dmg, w, o) {
  if (e.dead || !(e.hp > 0)) return false;
  if (e.c === 'boss') {
    if (e.mode !== 'open' && e.mode !== 'stagger') { S.ev.push({ e: 'block', x: e.x, y: e.y + e.h * 0.5, z: e.z - e.r }); return false; }
  } else if (blockedBy(e, w)) {
    if (w === 'laser') dmg *= 0.25;
    else { S.ev.push({ e: 'block', x: e.x, y: e.y + 1.3, z: e.z - 1.2 }); return false; }
  }
  if (w === 'plasma' && e.k === 'shield' && e.shieldUp) { e.broken = true; e.shieldUp = false; S.ev.push({ e: 'shieldbreak', x: e.x, y: 1.3, z: e.z }); }
  if (S.mech.power > 0) dmg *= 2;
  e.hp -= dmg; e.hit = 0.12;
  if (e.c === 'boss' && e.ph < 2) e.hp = Math.max(e.hp, e.max * (2 - e.ph) / 3 - 0.0005);
  S.ev.push({ e: 'hit', k: e.k, w: w, x: e.x, y: e.y + e.h * 0.5, z: e.z, big: dmg >= 3 });
  if (e.hp <= 0.001) kill(S, e, w);
  return true;
}
function kill(S, e, how) {
  if (e.dead) return;
  e.dead = true; e.hp = 0;
  if (e.c === 'boss') { e.dead = false; e.mode = 'dying'; e.t2 = 2.8; S.slow = 1.2; S.shake = 1.2; S.ev.push({ e: 'bossdown', b: e.b, x: e.x, y: e.y + e.h * 0.5, z: e.z }); return; }
  if (e.minion) S.minions = Math.max(0, S.minions - 1);
  const base = EN[e.k] || {};
  if (how !== 'ram' && base.score) {
    S.combo++; S.comboT = 2.6; S.maxCombo = Math.max(S.maxCombo, S.combo);
    const mult = S.combo >= 10 ? 4 : S.combo >= 6 ? 3 : S.combo >= 3 ? 2 : 1;
    S.score += base.score * mult;
    if (e.c === 'enemy' && e.k !== 'missile') S.stats.kills++;
    S.ev.push({ e: 'score', n: base.score * mult, mult: mult, x: e.x, y: e.y + e.h, z: e.z });
  }
  S.ev.push({ e: 'boom', k: e.k, x: e.x, y: e.y + e.h * 0.5, z: e.z, big: e.r > 1.6 || e.k === 'rival' });
  // something to pick up now and then
  const r = S.rnd();
  if (how !== 'ram' && e.z > 8 && ((e.k === 'crate' && r < 0.4) || (e.c === 'enemy' && e.k !== 'missile' && r < (e.r > 1.6 ? 0.6 : 0.09)))) {
    const M = S.mech, p = M.hp < 60 && S.rnd() < 0.6 ? 'repair' : S.rnd() < 0.2 ? 'shield' : S.rnd() < 0.25 ? 'power' : 'gem';
    add(S, { k: 'pick', c: 'pick', p: p, x: laneX(laneOf(e.x)), y: 1.2, z: Math.max(10, e.z), r: 1.0, h: 1, drop: true });
  }
}
function collect(S, p) {
  const M = S.mech;
  p.dead = true;
  if (p.p === 'repair') M.hp = Math.min(M.max, M.hp + 30);
  else if (p.p === 'shield') M.shield = 7;
  else if (p.p === 'power') M.power = 8;
  else if (p.p === 'nova') S.nova++;
  else S.score += 50;
  S.ev.push({ e: 'pick', p: p.p, x: p.x, y: p.y, z: p.z });
}

/* ================= enemy fire ================= */
// a shot from e at the mech's lane (or at x = o.tx); o: sp (x bullet speed), dmg, low (skims the road: jump it), r, k
function shoot(S, e, o) {
  o = o || {};
  const M = S.mech, sp = (o.sp || 1) * S.bsp;
  const x0 = e.x + (o.dx || 0), z0 = Math.max(4, e.z - (e.r || 1) * 0.7 + (o.dz || 0));
  const y0 = o.low ? 0.6 : o.y0 != null ? o.y0 : e.y + (e.h || 1) * (e.vs || 1) * 0.6;
  const tx = o.tx != null ? o.tx : M.x, T = Math.max(0.35, z0 / sp);
  const b = { k: o.k || (o.low ? 'wave' : 'ball'), x: x0, y: y0, z: z0, vx: (tx - x0) / T, vz: -sp, r: o.r || (o.low ? 0.75 : 0.55),
    dmg: (o.dmg || 10) * S.dmgm, low: !!o.low, wide: !!o.wide, src: e.k, done: false };
  S.bullets.push(b);
  S.ev.push({ e: 'efire', k: e.k, b: b.k, x: x0, y: y0, z: z0 });
  return b;
}
function addMissile(S, e, dx) {
  const m = add(S, { k: 'missile', c: 'enemy', x: e.x + (dx || 0), y: e.y + e.h * 0.8, z: e.z - 1, hp: 1, max: 1, r: 0.6, h: 0.6, st: 'fly', sp: 10.5 + 3 * S.g, dmg: 16 * S.dmgm });
  S.ev.push({ e: 'efire', k: e.k, b: 'missile', x: m.x, y: m.y, z: m.z });
  return m;
}
function laneMark(S, lanes, tel, act, dmg, o) {
  const m = Object.assign({ k: 'lane', lanes: lanes, t: 0, tel: tel, act: act, dmg: dmg * S.dmgm, done: false }, o || {});
  S.marks.push(m);
  return m;
}
function bombMark(S, lane, z, tel, dmg, style) {
  const m = { k: 'bomb', lane: lane, x: laneX(lane), z: z, t: 0, tel: tel, dmg: dmg * S.dmgm, style: style || 'bomb', done: false };
  S.marks.push(m);
  return m;
}
const pickLane = (S, mine) => (S.rnd() < mine ? laneOf(S.mech.x) : Math.floor(S.rnd() * 3));

/* ================= how each enemy behaves =================
   Things on the ground move with the road (z -= v·dt, done in step); INIT sets an enemy up, AI runs it every step.
   e.cd counts down to its next shot; the renderer shows a glow while e.cd < e.tel (the warning). */
const INIT = {
  drone(S, e) { e.y = 2.8 + S.rnd() * 2.0; e.station = 22 + S.rnd() * 12; e.hold = 7 + S.rnd() * 2.5; e.tl = e.lane; e.cd = 0.7 + S.rnd() * 0.8; e.move = 1.5 + S.rnd() * 2; e.ph = S.rnd() * 6.3; },
  walker(S, e) { e.cd = 0.6 + S.rnd() * 0.8; e.ph = S.rnd() * 6.3; },
  turret(S, e) { e.cd = 0.9 + S.rnd() * 0.6; e.tel = 0.75; e.burst = 0; },
  bike(S, e) { e.turns = [60 + S.rnd() * 25, 32 + S.rnd() * 14].slice(0, S.n >= 14 ? 2 : 1); e.blink = 0; e.tl = e.lane; },
  shield(S, e) { e.shieldUp = true; e.sc = 2.4 + S.rnd(); e.cd = 99; e.tel = 0.55; },
  bomber(S, e) { e.y = 8 + S.rnd(); e.z = Math.max(e.z, 120); e.cd = 0.6; e.drift = (e.x < 0 ? 1 : e.x > 0 ? -1 : (S.rnd() < 0.5 ? -1 : 1)) * 0.9; },
  spider(S, e) { e.hop = 1.8 + S.rnd() * 0.8; e.cd = 1.6 + S.rnd(); e.tel = 0.6; e.tl = e.lane; e.hz = 0; },
  sentinel(S, e) { e.cd = 1 + S.rnd(); },
  rival(S, e) { e.station = 24 + S.rnd() * 4; e.hold = 16; e.cd = 1.5; e.mcd = 3.2; e.tl = e.lane; e.move = 1.6; },
  carrier(S, e) { e.y = 8.5; e.station = 46 + S.rnd() * 8; e.hold = 28; e.cd = 2.2; e.scd = 1.5; e.tel = 0.7; },
  mine(S, e) { e.ph = S.rnd() * 6.3; },
  boulder(S, e) { e.roll = 0; },
  geyser(S, e) { e.cyc = S.rnd() * 3; },
  fence() {}
};
// returns false when frozen or stunned (then it only drifts)
function awake(e, dt) {
  if (e.frz > 0) { e.frz -= dt; return false; }
  if (e.stun > 0) { e.stun -= dt; return false; }
  return true;
}
function fireReady(S, e, dt, inRange, every) {
  if (!inRange) return false;
  e.cd -= dt;
  if (e.cd > 0) return false;
  e.cd = every * S.fireMul * (0.9 + S.rnd() * 0.2);
  return true;
}
function steerLane(S, e, dt, speed) {
  const tx = laneX(e.tl);
  const dx = tx - e.x, st = speed * dt;
  e.x += Math.abs(dx) <= st ? dx : Math.sign(dx) * st;
}
const AI = {
  drone(S, e, dt) {
    const ok = awake(e, dt);
    if (e.st === 'in') { e.z -= (S.v + (e.z > RANGE ? 18 : 9)) * dt; if (e.z <= e.station) { e.st = 'hold'; e.t = 0; } }
    else if (e.st === 'hold') {
      e.z += (e.station - e.z) * Math.min(1, 2 * dt);
      if (e.t > e.hold) e.st = 'out';
    } else { e.z -= (S.v + 20) * dt; e.y += 3 * dt; }
    if (!ok) return;
    e.move -= dt;
    if (e.move <= 0) { e.move = 1.8 + S.rnd() * 1.8; e.tl = clampN(e.tl + (S.rnd() < 0.5 ? -1 : 1), 0, 2); }
    steerLane(S, e, dt, 3.2);
    if (S.n >= 2 && fireReady(S, e, dt, e.st !== 'out' && e.z > 14 && e.z < RANGE, 2.8)) shoot(S, e, { sp: 0.85, dmg: 10 });
  },
  walker(S, e, dt) {
    if (awake(e, dt)) {
      e.z -= 1.4 * dt;
      if (fireReady(S, e, dt, e.z > 14 && e.z < RANGE, 2.5)) shoot(S, e, { dmg: 10 });
    }
  },
  turret(S, e, dt) {
    if (!awake(e, dt)) return;
    if (e.burst > 0) {
      e.bt -= dt;
      if (e.bt <= 0) { e.burst--; e.bt = 0.17; shoot(S, e, { dmg: 9, tx: e.btx }); }
      return;
    }
    if (fireReady(S, e, dt, e.z > 14 && e.z < 70, 3.1)) { e.burst = 3; e.bt = 0; e.btx = S.mech.x; }
  },
  bike(S, e, dt) {
    if (!awake(e, dt)) { e.z -= 4 * dt; return; }
    e.z -= 13 * dt;
    if (e.turns.length && e.z < e.turns[0] + 9 && !e.blink) { e.blink = 0.45; e.nl = e.tl === 1 ? (S.rnd() < 0.5 ? 0 : 2) : 1; }
    if (e.blink > 0) { e.blink -= dt; if (e.blink <= 0) { e.blink = 0; e.tl = e.nl; e.turns.shift(); } }
    steerLane(S, e, dt, 7);
  },
  shield(S, e, dt) {
    if (!awake(e, dt)) return;
    e.z -= 0.8 * dt;
    if (e.broken) {
      if (fireReady(S, e, dt, e.z > 14 && e.z < 62, 2.4)) shoot(S, e, { dmg: 14, k: 'heavy', r: 0.7 });
      return;
    }
    e.sc -= dt;
    if (e.shieldUp && e.sc <= 0 && e.z < 62 && e.z > 14) { e.shieldUp = false; e.sc = 1.35; e.cd = 0.55; }
    else if (!e.shieldUp) {
      e.cd -= dt;
      if (e.cd <= 0 && e.cd > -1) { e.cd = -5; shoot(S, e, { dmg: 14, k: 'heavy', r: 0.7 }); }
      if (e.sc <= 0) { e.shieldUp = true; e.sc = (2.5 + S.rnd() * 0.8) * S.fireMul; e.cd = 99; }
    }
  },
  bomber(S, e, dt) {
    const ok = awake(e, dt);
    e.z -= (ok ? 17 : 6) * dt;
    if (!ok) return;
    e.x = clampN(e.x + e.drift * dt, -LANE * 1.2, LANE * 1.2);
    if (fireReady(S, e, dt, e.z > 22 && e.z < 95, 1.0)) {
      const lane = pickLane(S, 0.65), tel = 1.25;
      // bombs fall where the mech will be when they land
      bombMark(S, lane, Math.max(0.5, S.v * tel), tel, 18, 'bomb');
      S.ev.push({ e: 'drop', x: e.x, y: e.y, z: e.z });
    }
  },
  spider(S, e, dt) {
    if (!awake(e, dt)) return;
    e.z -= 2 * dt;
    e.hop -= dt;
    if (e.hop <= 0) { e.hop = (1.6 + S.rnd() * 0.9); e.tl = clampN(e.tl + (e.tl === 0 ? 1 : e.tl === 2 ? -1 : (S.rnd() < 0.5 ? -1 : 1)), 0, 2); e.hz = 0.4; }
    if (e.hz > 0) e.hz -= dt;
    steerLane(S, e, dt, 8.5);
    if (fireReady(S, e, dt, e.z > 14 && e.z < 60, 3.0)) for (let l = 0; l < 3; l++) shoot(S, e, { low: true, tx: laneX(l), dmg: 9, sp: 0.8 });
  },
  sentinel(S, e, dt) {
    if (!awake(e, dt)) return;
    if (fireReady(S, e, dt, e.z > 18 && e.z < 75, 3.0)) {
      const lane = laneOf(S.mech.x);
      e.beamLane = lane;
      laneMark(S, [lane], 1.5, 0.45, 20, { src: e.id, sx: e.x, sz: e.z, style: 'beam' });
    }
  },
  rival(S, e, dt) {
    const ok = awake(e, dt);
    if (e.st === 'in') { e.z -= (S.v + (e.z > RANGE ? 16 : 8)) * dt; if (e.z <= e.station) { e.st = 'hold'; e.t = 0; } }
    else if (e.st === 'hold') { e.z += (e.station - e.z) * Math.min(1, 2 * dt); if (e.t > e.hold) e.st = 'out'; }
    else { e.z += 14 * dt; e.y += 6 * dt; if (e.z > 140) e.dead = true; }
    if (!ok || e.st !== 'hold') return;
    e.move -= dt;
    if (e.move <= 0) { e.move = 1.4 + S.rnd() * 1.3; e.tl = clampN(e.tl + (S.rnd() < 0.5 ? -1 : 1), 0, 2); }
    steerLane(S, e, dt, 5);
    if (fireReady(S, e, dt, true, 2.3)) { shoot(S, e, { dmg: 10 }); shoot(S, e, { dmg: 10, dz: -2.5 }); }
    e.mcd -= dt;
    if (e.mcd <= 0) { e.mcd = 5.2 * S.fireMul; addMissile(S, e, 0); }
  },
  carrier(S, e, dt) {
    const ok = awake(e, dt);
    if (e.st === 'in') { e.z -= (S.v + 6) * dt; if (e.z <= e.station) { e.st = 'hold'; e.t = 0; } }
    else if (e.st === 'hold') { e.z += (e.station - e.z) * Math.min(1, 1.5 * dt); if (e.t > e.hold) e.st = 'out'; }
    else { e.z += 10 * dt; e.y += 3 * dt; if (e.z > 150) e.dead = true; }
    if (!ok || e.st !== 'hold') return;
    e.x = Math.sin(e.t * 0.35) * 2.2;
    e.scd -= dt;
    if (e.scd <= 0 && S.minions < 4) {
      e.scd = 3.6 * S.fireMul;
      const d = spawn(S, [S.d + e.z - 2, 'drone', laneOf(e.x)]);
      if (d) { d.minion = true; d.y = e.y - 1.5; d.z = e.z - 2; d.station = 30 + S.rnd() * 14; S.minions++; }
    }
    if (fireReady(S, e, dt, true, 3.3)) {
      const gap = Math.floor(S.rnd() * 3);
      for (let l = 0; l < 3; l++) if (l !== gap) shoot(S, e, { tx: laneX(l), dmg: 11, dx: (l - 1) * 1.5 });
    }
  },
  missile(S, e, dt) {
    if (!awake(e, dt)) { e.z -= 2 * dt; return; }
    e.z -= e.sp * dt;
    const dx = S.mech.x - e.x;
    e.x += clampN(dx, -2.2 * dt, 2.2 * dt);
    e.y += (S.mech.y + 1.6 - e.y) * Math.min(1, 1.5 * dt);
  },
  mine(S, e, dt) { e.ph += dt * 5; },
  boulder(S, e, dt) { if (awake(e, dt)) { e.z -= 6 * dt; e.roll += (S.v + 6) * dt; } },
  geyser(S, e, dt) {
    e.cyc += dt;
    const c = e.cyc % 3.4;
    e.phase = c < 1.5 ? 'idle' : c < 2.5 ? 'warn' : 'blow';
  }
};

/* ================= boss fights ================= */
function attack(S, B, name) {
  const M = S.mech, ml = laneOf(M.x), g = S.g;
  S.ev.push({ e: 'battack', b: B.b, a: name });
  B.pose = name; B.poseT = 1.2;
  if (name === 'slam') {
    const lane = S.rnd() < 0.7 ? ml : Math.floor(S.rnd() * 3);
    laneMark(S, [lane], 1.0, 0, 0, { style: 'warn', then: (S2) => { shoot(S2, { x: laneX(lane), y: 0, z: B.z - 3, r: 1, h: 1, k: B.k }, { low: true, tx: laneX(lane), dmg: 18, sp: 0.95, r: 1.2 }); } });
  } else if (name === 'bubbles' || name === 'volley') {
    const gap = Math.floor(S.rnd() * 3);
    for (let l = 0; l < 3; l++) if (l !== gap) shoot(S, B, { tx: laneX(l), dx: (l - 1) * 2, dmg: 12, sp: name === 'volley' ? 1 : 0.7, r: 0.75, k: name === 'bubbles' ? 'bubble' : 'ball' });
  } else if (name === 'summon') {
    if (S.minions < 3) for (let i = 0; i < 2; i++) {
      const k = B.def.minion, lane = Math.floor(S.rnd() * 3);
      const e = spawn(S, [S.d + B.z - 4, k, lane]);
      if (e) { e.minion = true; e.z = B.z - 4 - i * 6; if (k === 'drone') { e.station = 22 + S.rnd() * 10; e.y = 4; } S.minions++; }
    }
  } else if (name === 'sweep') {
    const dir = S.rnd() < 0.5 ? 1 : -1;
    S.marks.push({ k: 'sweep', x: -dir * 6.5, dir: dir, speed: 7 + 3 * g, z: 1.5, t: 0, tel: 0.9, dmg: 16 * S.dmgm, done: false });
  } else if (name === 'bombs' || name === 'icicles' || name === 'meteors') {
    const n = name === 'meteors' ? 4 : 3, style = name === 'bombs' ? 'sand' : name === 'icicles' ? 'ice' : 'fire';
    for (let i = 0; i < n; i++) bombMark(S, i === 0 ? ml : Math.floor(S.rnd() * 3), 1 + S.rnd() * 3, 1.25 + i * 0.4, 16, style);
  } else if (name === 'sting') {
    shoot(S, B, { dmg: 16, k: 'heavy', r: 0.8, sp: 1.05 });
  } else if (name === 'boulder') {
    const e = spawn(S, [S.d + B.z - 5, 'boulder', S.rnd() < 0.7 ? ml : Math.floor(S.rnd() * 3)]);
    if (e) { e.z = B.z - 5; e.fast = true; e.snow = true; }
  } else if (name === 'breath') {
    const other = ml === 0 ? 1 : ml === 2 ? 1 : (S.rnd() < 0.5 ? 0 : 2);
    laneMark(S, [ml, other].sort(), 1.25, 1.0, 20, { style: B.b === 'titan' ? 'frost' : 'fire', src: B.id });
  } else if (name === 'dive') {
    laneMark(S, [ml], 1.15, 0.55, 22, { style: 'dive', src: B.id });
  } else if (name === 'missiles') {
    const n = B.b === 'omega' ? 3 : 2;
    for (let i = 0; i < n; i++) addMissile(S, B, (i - (n - 1) / 2) * 3);
  } else if (name === 'ring') {
    shoot(S, { x: 0, y: 0, z: B.z - 3, r: 1, h: 1, k: B.k }, { low: true, wide: true, tx: 0, dmg: 16, sp: 0.75, r: 1, k: 'ring' });
  } else if (name === 'arms') {
    const a = S.rnd() < 0.5 ? [0, 1] : [1, 2];
    if (a.indexOf(ml) < 0) a[0] = ml;
    laneMark(S, a.sort(), 1.2, 0.6, 20, { style: 'beam', src: B.id });
  }
}
function bossStep(S, B, dt) {
  const D = B.def;
  B.t2 = (B.t2 || 0) - dt;
  if (B.poseT > 0) B.poseT -= dt;
  if (B.mode === 'enter') {
    B.z += (D.z - B.z) * Math.min(1, 1.6 * dt);
    if (B.z - D.z < 1.5) bossShield(S, B);
    return;
  }
  if (B.mode === 'dying') {
    if (B.t2 <= 0 && S.state === 'play') { S.state = 'won'; S.endT = S.t; S.score += 1000; S.ev.push({ e: 'won' }); }
    return;
  }
  B.x = Math.sin(B.t * 0.45) * D.sway;
  if (B.mode === 'shield') {
    B.hintT = (B.hintT || 0) + dt;
    B.orbs.forEach((o, i) => { o.x = laneX(i) + B.x * 0.15; o.z = B.z - 11; o.y = 3.0 + Math.sin(B.t * 2 + i) * 0.25; });
  }
  if (B.mode === 'stagger') { if (B.t2 <= 0) B.mode = 'open'; return; }
  if (B.mode === 'open') {
    B.open -= dt;
    const thr = B.max * (2 - B.ph) / 3;
    if (B.hp <= thr + 0.001 && B.ph < 2) { B.ph++; S.ev.push({ e: 'bphase', ph: B.ph }); bossShield(S, B); return; }
    if (B.open <= 0) { bossShield(S, B); return; }
  }
  B.atkT -= dt * (B.mode === 'shield' ? 0.62 : 1);
  if (B.atkT <= 0) {
    B.atkT = D.gap * lerp(1.3, 1.0, S.g) * (0.85 + S.rnd() * 0.3);
    attack(S, B, D.atk[B.cycle++ % D.atk.length]);
  }
}

/* ================= the child's controls =================
   steer(S, -1 | 0 | 1) while a button or a key is held; steerTo(S, x) to follow a finger; stepLane(S, dir) goes to the
   next lane centre that way (a quick tap); move(S, dir) slides one lane's width (tests). press / release: the Fire button, when the guns do not fire by themselves. */
function move(S, dir) {
  const M = S.mech;
  if (S.state !== 'play') return false;
  M.dir = 0; M.tx = clampN(M.tx + dir * LANE, -XMAX, XMAX);
  S.ev.push({ e: 'move', dir: dir });
  return true;
}
function steer(S, dir) { S.mech.dir = dir; }
// the next lane centre in that direction from where the mech is heading
function stepLane(S, dir) {
  const x = S.mech.tx;
  let l = laneOf(x);
  if (dir > 0 ? laneX(l) <= x + 0.3 : laneX(l) >= x - 0.3) l += dir;
  steerTo(S, laneX(clampN(l, 0, 2)));
}
function steerTo(S, x) { const M = S.mech; M.dir = 0; M.tx = clampN(x, -XMAX, XMAX); }
function jump(S) {
  const M = S.mech;
  if (S.state !== 'play' || M.air) return false;
  M.air = true; M.vy = JUMP_V;
  S.ev.push({ e: 'jump' });
  return true;
}
function setWeapon(S, w) {
  if (S.weapons.indexOf(w) < 0) return false;
  if (S.weapon !== w) { S.weapon = w; S.beam = null; S.ev.push({ e: 'weapon', w: w }); }
  return true;
}
function press(S) { S.mech.holding = true; }
function hold() { /* aiming by finger is gone: the guns fire straight ahead */ }
function release(S) { S.mech.holding = false; S.beam = null; }
function nova(S) {
  if (S.nova <= 0 || S.state !== 'play') return false;
  S.nova--;
  S.bullets.length = 0;
  S.marks = S.marks.filter((m) => m.k === 'lane' && m.t >= m.tel);
  for (const e of S.ents) {
    if (e.dead) continue;
    if (e.c === 'enemy') { if (e.hp <= 12) kill(S, e, 'nova'); else damage(S, e, 12, 'nova'); }
    else if (e.c === 'boss' && (e.mode === 'open' || e.mode === 'stagger')) damage(S, e, e.max * 0.1, 'nova');
  }
  S.flash = 0.6; S.shake = 1;
  S.ev.push({ e: 'nova' });
  return true;
}

/* ================= the mech's guns ================= */
function byId(S, id) { if (!id) return null; for (const e of S.ents) if (e.id === id && !e.dead) return e; return null; }
function shootable(e) { return !e.dead && e.z <= RANGE + 4 && (e.c === 'enemy' || e.c === 'boss' || (e.c === 'obs' && e.hp > 0)); }
function centre(e) { return [e.x, e.y + (e.h || 1) * (e.vs || 1) * 0.5, e.z]; }
// the nearest enemy ahead (or the one nearest a point in the world)
function nearest(S, aim, skip) {
  let best = null, bd = 1e9;
  for (const e of S.ents) {
    if (!shootable(e) || e.z < 3 || e.z > RANGE || (skip && skip.indexOf(e.id) >= 0)) continue;
    const c = centre(e), d = aim ? Math.hypot(c[0] - aim.x, (c[1] - aim.y) * 0.7, (c[2] - aim.z) * 0.25) : c[2] + Math.abs(c[0] - S.mech.x) * 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
// the enemy the mech is lined up with: the nearest one ahead within w metres to the side (its size counts)
function inLine(S, w) {
  const M = S.mech;
  let best = null, bz = 1e9;
  for (const e of S.ents) {
    if (!shootable(e) || e.z < 2.5 || e.z > RANGE) continue;
    if (Math.abs(e.x - M.x) > (e.hr || e.r) + w) continue;
    if (e.c === 'boss' && e.mode !== 'open' && e.mode !== 'stagger') continue;
    if (e.z < bz) { bz = e.z; best = e; }
  }
  return best;
}
// the guns fire by themselves when something is lined up with the mech (or, with a Fire button, while it is held)
function firing(S) { return S.state === 'play' && (S.autoFire ? !!inLine(S, 1.6) : S.mech.holding); }
// The answer the mech stands under: a gate panel or a boss's shield orb (-1 when there is no question or it stands between two)
function aimedAnswer(S) {
  const M = S.mech, G = S.gate && !S.gate.open && S.gate.z < RANGE ? S.gate : null;
  const B = !G && S.boss && S.boss.mode === 'shield' ? S.boss : null;
  const items = G ? G.panels : B ? B.orbs : null;
  if (!items) return -1;
  let best = -1, bd = AIM;
  items.forEach((p, i) => { const d = Math.abs(M.x - (G ? laneX(i) : p.x)); if (!p.gone && !p.bad && d < bd) { bd = d; best = i; } });
  return best;
}
// the gold Answer button: a golden shot straight ahead at the answer the mech stands under
function shootAnswer(S) {
  const i = aimedAnswer(S);
  if (i < 0) return -1;
  return answer(S, i) ? i : -1;
}
function muzzle(S) { const M = S.mech; M.side = -M.side; return [M.x + M.side * 1.05, M.y + 2.2, 0.9]; }
// a shot straight ahead (towards the middle of the mech's line); a lined-up enemy pulls it to its height and middle
function bolt(S, w, from, tgt, o) {
  const W = WEAPONS[w], M = S.mech;
  let tx = M.x, ty = M.y + 2.2, tz = 45;
  if (tgt) { const c = centre(tgt); tx = c[0]; ty = c[1]; tz = c[2]; }
  let dx = tx - from[0], dy = ty - from[1], dz = tz - from[2];
  const L = Math.hypot(dx, dy, dz) || 1;
  dx /= L; dy /= L; dz /= L;
  if (W.spread) { dx += (S.rnd() - 0.5) * W.spread * 2; dy += (S.rnd() - 0.5) * W.spread * 2; }
  const sp = (o && o.speed) || W.speed;
  const s = { k: w, x: from[0], y: from[1], z: from[2], vx: dx * sp, vy: dy * sp, vz: dz * sp, sp: sp, tgt: tgt ? tgt.id : 0,
    home: tgt ? W.home || 0 : 0, dmg: (o && o.dmg) || W.dmg, r: (o && o.r) || W.r, life: 2.4, hits: [], pierce: !!W.pierce };
  if (o && o.lift) s.vy += o.lift;
  if (o && o.side) s.vx += o.side;
  S.shots.push(s);
  return s;
}
function fireOnce(S) {
  const M = S.mech, w = S.weapon, W = WEAPONS[w];
  S.stats.fired++;
  M.recoil = w === 'plasma' ? 0.25 : 0.12;
  if (w === 'lightning') { zapChain(S, inLine(S, W.seek)); S.ev.push({ e: 'fire', w: w }); return; }
  if (w === 'rockets') {
    const t = inLine(S, W.seek);
    for (let i = 0; i < W.n; i++) bolt(S, w, [M.x + (i ? 1.3 : -1.3), M.y + 3, 0.2], t, { lift: 9, side: i ? 4 : -4 });
  } else bolt(S, w, w === 'plasma' ? [M.x, M.y + 2.3, 1] : muzzle(S), inLine(S, 1.3));
  S.ev.push({ e: 'fire', w: w, f: w === 'plasma' ? 1 : undefined });
}
function zapChain(S, first) {
  const W = WEAPONS.lightning, M = S.mech;
  if (!first) { S.zaps.push({ pts: [[M.x, M.y + 2.4, 1], [M.x + (S.rnd() - 0.5) * 2, 3 + S.rnd() * 2, 22]], t: 0.12 }); return; }
  const pts = [[M.x + 1, M.y + 2.4, 1]], hit = [];
  let cur = first, dmg = W.dmg;
  for (let i = 0; i <= W.chain && cur; i++) {
    const c = centre(cur);
    pts.push(c); hit.push(cur.id);
    damage(S, cur, dmg, 'lightning');
    if (!cur.dead && cur.c === 'enemy') cur.stun = Math.max(cur.stun, 0.35);
    dmg *= W.fall;
    let nx = null, nd = W.range;
    for (const e of S.ents) {
      if (!shootable(e) || hit.indexOf(e.id) >= 0 || e.c === 'boss') continue;
      const d = Math.hypot(e.x - c[0], e.y + e.h * 0.5 - c[1], e.z - c[2]);
      if (d < nd) { nd = d; nx = e; }
    }
    cur = nx;
  }
  S.zaps.push({ pts: pts, t: 0.2 });
}
function gunStep(S, dt) {
  const M = S.mech, w = S.weapon, W = WEAPONS[w];
  M.firing = firing(S);
  // the plasma cannon glows brighter until its next shot
  M.charge = w === 'plasma' ? Math.min(1.1, (S.t - (M.last || 0)) / W.every * 1.1) : 0;
  if (!M.firing) { S.beam = null; return; }
  if (w === 'laser') {
    // a steady beam straight ahead: it burns the first thing in its way
    const t = inLine(S, 0.6);
    if (!S.beam) S.ev.push({ e: 'fire', w: 'laser' });
    S.beam = { x: M.x, y: M.y + 2.3, z: 1, ex: t ? t.x : M.x, ey: t ? centre(t)[1] : 2.4, ez: t ? t.z : RANGE * 0.6, on: !!t };
    if (t) damage(S, t, W.dps * dt, 'laser');
    return;
  }
  if (S.t - (M.last || -9) < W.every - 1e-6) return;
  M.last = S.t;
  fireOnce(S);
}
function shotStep(S, dt) {
  for (const s of S.shots) {
    s.life -= dt;
    if (s.home) {
      const t = byId(S, s.tgt);
      if (t && shootable(t)) {
        const c = centre(t), dx = c[0] - s.x, dy = c[1] - s.y, dz = c[2] - s.z, L = Math.hypot(dx, dy, dz) || 1;
        const k = Math.min(1, s.home * dt);
        s.vx += (dx / L * s.sp - s.vx) * k; s.vy += (dy / L * s.sp - s.vy) * k; s.vz += (dz / L * s.sp - s.vz) * k;
      } else if (s.k === 'rockets') { s.vy -= 6 * dt; }
    }
    const x0 = s.x, y0 = s.y, z0 = s.z;
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    if (s.y < 0 || s.z > RANGE + 4 || s.z < -2 || s.life <= 0) { s.dead = true; if (s.y < 0 && s.z > 2) S.ev.push({ e: 'spark', x: s.x, y: 0, z: s.z }); continue; }
    for (const e of S.ents) {
      if (!shootable(e) || s.hits.indexOf(e.id) >= 0) continue;
      const c = centre(e), R = (e.hr || e.r) + s.r;
      // closest point of this step's path to the enemy's centre
      const px = s.x - x0, py = s.y - y0, pz = s.z - z0, pl = px * px + py * py + pz * pz || 1;
      const u = clampN(((c[0] - x0) * px + (c[1] - y0) * py + (c[2] - z0) * pz) / pl, 0, 1);
      const qx = x0 + px * u - c[0], qy = y0 + py * u - c[1], qz = z0 + pz * u - c[2];
      if (qx * qx + qy * qy + qz * qz > R * R) continue;
      s.hits.push(e.id);
      damage(S, e, s.dmg, s.k);
      if (s.k === 'freeze' || s.k === 'rockets') {
        const W = WEAPONS[s.k];
        for (const o of S.ents) {
          if (o === e || !shootable(o) || o.c === 'boss') continue;
          const d = Math.hypot(o.x - c[0], o.y + o.h * 0.5 - c[1], o.z - c[2]);
          if (d < W.splash) { if (s.k === 'rockets') damage(S, o, s.dmg * 0.5, 'rockets'); else if (o.c === 'enemy') o.frz = Math.max(o.frz, W.freeze); }
        }
        if (s.k === 'freeze' && e.c === 'enemy' && !e.dead) e.frz = Math.max(e.frz, W.freeze);
        S.ev.push({ e: s.k === 'freeze' ? 'freeze' : 'blast', x: c[0], y: c[1], z: c[2] });
      }
      if (!s.pierce) { s.dead = true; break; }
    }
  }
  S.shots = S.shots.filter((s) => !s.dead);
}
/* ================= the world moves on ================= */
function step(S, dt) {
  const M = S.mech;
  S.ev.length = 0;
  for (const z of S.zaps) z.t -= dt;
  S.zaps = S.zaps.filter((z) => z.t > 0);
  if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 2.2);
  if (S.flash > 0) S.flash = Math.max(0, S.flash - dt * 2);
  if (S.state !== 'play') {
    S.t += dt;
    if (S.state === 'won') { M.walk += 6 * dt; S.d += 6 * dt; for (const e of S.ents) if (e.c !== 'boss') e.z -= 6 * dt; }
    return S;
  }
  S.t += dt;
  // the mech: sliding across the road, jumps and timers
  if (M.dir) M.tx = clampN(M.tx + M.dir * STEER * dt, -XMAX, XMAX);
  const dx = M.tx - M.x, sx = SLIDE * dt, mx0 = M.x;
  M.x += Math.abs(dx) <= sx ? dx : Math.sign(dx) * sx;
  M.vx = (M.x - mx0) / dt;
  M.lane = laneOf(M.x);
  M.lean += (clampN(M.vx / 9, -1, 1) - M.lean) * Math.min(1, 10 * dt);
  if (M.air) {
    M.vy -= GRAV * dt; M.y += M.vy * dt;
    if (M.y <= 0) { M.y = 0; M.vy = 0; M.air = false; M.land = 0.22; S.ev.push({ e: 'land' }); }
  }
  for (const k of ['inv', 'shield', 'power', 'hurt', 'land', 'recoil']) if (M[k] > 0) M[k] = Math.max(0, M[k] - dt);
  if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
  // how fast the mech walks: slower while it is busy fighting, stopping in front of a closed gate, standing for a boss
  let vt = S.L.v;
  let busy = 0;
  for (const e of S.ents) if (e.c === 'enemy' && !e.dead && e.z > 10 && e.z < 70 && e.k !== 'missile') busy++;
  if (busy >= 4) vt *= 0.55; else if (busy >= 2) vt *= 0.72;
  const G = S.gate;
  if (G && !G.open) vt = Math.min(vt, Math.sqrt(2 * 7 * Math.max(0, G.z - HOLD)));
  if (S.boss) vt = 0;
  S.v += clampN(vt - S.v, -14 * dt, 8 * dt);
  if (G && !G.open && G.z - S.v * dt < HOLD) S.v = Math.max(0, (G.z - HOLD) / dt);
  S.d += S.v * dt;
  M.walk += S.v * dt;
  // things appear on the road ahead
  const ev = S.L.ev;
  while (S.next < ev.length && ev[S.next][0] <= S.d + SPAWN) spawn(S, ev[S.next++]);
  // everything moves
  for (const e of S.ents) {
    if (e.dead) continue;
    const z0 = e.z;
    const base = EN[e.k];
    if (!(base && base.fly) && e.c !== 'boss' && e.k !== 'rival') e.z -= S.v * dt;
    e.t += dt;
    if (e.hit > 0) e.hit -= dt;
    if (e.c === 'boss') bossStep(S, e, dt);
    else if (AI[e.k]) AI[e.k](S, e, dt);
    e.dz = (e.z - z0) / dt;
  }
  if (G) {
    if (!G.open && G.z <= HOLD + 0.05) { G.idle += dt; if (G.idle > 16) G.hint = true; }
    if (G.open) G.openT += dt;
  }
  if (S.boss && S.boss.mode === 'shield' && S.boss.hintT > 16) S.boss.hint = true;
  // answer shells
  for (const sh of S.shells) {
    sh.t += dt;
    const f = Math.min(1, sh.t / sh.dur);
    let tx, ty, tz;
    if (sh.of === 'gate' && S.gate) { tx = laneX(sh.i); ty = 2.4; tz = S.gate.z; }
    else if (sh.of === 'boss' && S.boss && S.boss.orbs[sh.i]) { const o = S.boss.orbs[sh.i]; tx = o.x; ty = o.y; tz = o.z; }
    else { sh.dead = true; continue; }
    sh.x = lerp(sh.x0, tx, f); sh.y = lerp(sh.y0, ty, f) + Math.sin(f * Math.PI) * 1.2; sh.z = lerp(sh.z0, tz, f);
    if (f >= 1) { sh.dead = true; resolve(S, sh); }
  }
  S.shells = S.shells.filter((s) => !s.dead);
  gunStep(S, dt);
  shotStep(S, dt);
  bulletStep(S, dt);
  markStep(S, dt);
  contactStep(S, dt);
  // the gate is behind the mech: a checkpoint
  if (G && G.open && G.z < -3) {
    S.cp = S.d - 1; S.stats.gates++;
    G.dead = true; S.gate = null;
    S.ev.push({ e: 'pass' });
  }
  S.ents = S.ents.filter((e) => !e.dead && e.z > -10 && e.z < 160);
  if (S.boss && !S.ents.includes(S.boss)) S.boss = null;
  if (S.state === 'play' && !S.boss && !S.gate && S.d >= S.len && S.next >= ev.length) {
    S.state = 'won'; S.endT = S.t;
    S.score += M.hp * 5;
    S.ev.push({ e: 'won' });
  }
  return S;
}
function bulletStep(S, dt) {
  const M = S.mech;
  for (const b of S.bullets) {
    b.x += b.vx * dt; b.z += b.vz * dt;
    if (!b.low) b.y += (M.y + 1.7 - b.y) * Math.min(1, (b.z < 14 ? 4 : 1.2) * dt);
    if (!b.done && b.z <= 0.6) {
      b.done = true;
      const sideOk = b.wide || Math.abs(b.x - M.x) < MECH_R + b.r;
      const heightOk = !b.low || M.y < 0.95;
      if (sideOk && heightOk && b.z > -1.5) {
        b.dead = true;
        hurt(S, b.dmg, b.src);
        S.ev.push({ e: 'bhit', k: b.k, x: b.x, y: b.y, z: 0.5 });
      }
    }
    if (b.z < -6) b.dead = true;
  }
  S.bullets = S.bullets.filter((b) => !b.dead);
}
function markStep(S, dt) {
  const M = S.mech;
  for (const m of S.marks) {
    m.t += dt;
    if (m.k === 'lane') {
      if (m.src && !S.ents.some((e) => e.id === m.src && !e.dead && e.mode !== 'dying')) { if (m.t < m.tel) { m.dead = true; continue; } }
      if (m.t >= m.tel && !m.fired) { m.fired = true; if (m.then) m.then(S); else S.ev.push({ e: 'beam', style: m.style }); }
      if (m.act > 0 && m.t >= m.tel && m.t < m.tel + m.act && !m.done && m.lanes.some((l) => inLane(M.x, l))) { m.done = true; hurt(S, m.dmg, 'beam'); }
      if (m.t >= m.tel + m.act) m.dead = true;
    } else if (m.k === 'bomb') {
      m.z -= S.v * dt;
      if (m.t >= m.tel) {
        m.dead = true;
        S.ev.push({ e: 'boom', k: 'bomb', style: m.style, x: m.x, y: 0.5, z: m.z });
        if (inLane(M.x, m.lane) && Math.abs(m.z) < 2.6) hurt(S, m.dmg, 'bomb');
      }
    } else if (m.k === 'sweep') {
      if (m.t < m.tel) continue;
      const x0 = m.x;
      m.x += m.dir * m.speed * dt;
      if (!m.done && (x0 - M.x) * (m.x - M.x) <= 0 && M.y < 0.95) { m.done = true; hurt(S, m.dmg, 'sweep'); }
      if (Math.abs(m.x) > 7.5) m.dead = true;
    }
  }
  S.marks = S.marks.filter((m) => !m.dead);
}
function contactStep(S) {
  const M = S.mech;
  for (const e of S.ents) {
    if (e.dead || e.c === 'gate' || e.c === 'boss') continue;
    if (e.c === 'pick') { if (e.z < 1.2 && e.z > -1.2 && Math.abs(e.x - M.x) < 1.7) collect(S, e); continue; }
    if (e.k === 'geyser') {
      if (e.phase === 'blow' && Math.abs(e.z) < 1.8 && Math.abs(e.x - M.x) < 1.5 && !e.burnt) { e.burnt = true; hurt(S, 16 * S.dmgm, 'geyser'); }
      if (e.phase !== 'blow') e.burnt = false;
      continue;
    }
    if (e.touched || e.z > 1.4 || e.z < -1.4) continue;
    const base = EN[e.k];
    if (!base || (base.fly && e.k !== 'missile')) continue;
    if (e.k === 'missile') { if (Math.abs(e.x - M.x) < MECH_R + 0.5 && Math.abs(e.y - (M.y + 1.6)) < 2) { e.touched = true; e.dead = true; S.ev.push({ e: 'boom', k: 'missile', x: e.x, y: e.y, z: 0.5 }); hurt(S, e.dmg, 'missile'); } continue; }
    const wide = e.k === 'fence';
    if (!wide && Math.abs(e.x - M.x) >= e.r + MECH_R - 0.35) continue;
    if (M.y >= e.h * 0.82) continue;
    e.touched = true;
    const dmg = { fence: 12, mine: 15, crate: 14, barrier: 14, block: 16, boulder: 16, bike: 18, walker: 16, shield: 16, spider: 16, turret: 16, rival: 18 }[e.k] || 14;
    hurt(S, dmg * S.dmgm, e.k);
    if (e.hp > 0) kill(S, e, 'ram');
    else { e.dead = true; S.ev.push({ e: 'bump', k: e.k, x: e.x, y: 1, z: e.z }); }
  }
}

/* ================= a test pilot =================
   Plays like a child at a set skill. Every `react` seconds it looks at what is coming and picks where to stand: away
   from shots, bombs and red lanes (when it notices them: `dodge`), under the enemy it wants to hit (a little off when it
   `miss`es), or, after `think` seconds, under the answer it picked (the right one with chance `right`). It jumps low
   things on time (`jump`). The guns fire by themselves; with the Fire button it keeps the button down. Used by
   tools/check.js and the page's autopilot. */
function bot(S, P) {
  P = Object.assign({ react: 0.24, right: 0.85, think: 1.6, jump: 0.92, dodge: 0.95, miss: 0.12 }, P || {});
  const M = S.mech, B = S.bot || (S.bot = { look: 0, rng: mulberry((S.n * 7919) ^ 0x5bd1), q: null, pickI: -1, thinkT: 0, wT: 0, x: M.x });
  if (S.state !== 'play') return;
  const R = B.rng;
  if (!S.autoFire && !M.holding) press(S);
  // the answer to go for: picked once per question, and again after a wrong one
  const G = S.gate && !S.gate.open && S.gate.z < RANGE ? S.gate : null, Bo = !G && S.boss && S.boss.mode === 'shield' ? S.boss : null;
  const items = G ? G.panels : Bo ? Bo.orbs : null;
  if (items) {
    const key = (G ? 'g' + G.id : 'b' + Bo.id + ':' + Bo.q.text) + ':' + items.filter((p) => p.bad).length;
    if (B.q !== key) {
      B.q = key; B.thinkT = P.think * (0.6 + R() * 0.8);
      const ok = items.findIndex((p) => p.ok), wrong = items.map((p, i) => i).filter((i) => i !== ok && !items[i].bad);
      B.pickI = R() < P.right || !wrong.length || (G && G.hint) || (Bo && Bo.hint) ? ok : wrong[Math.floor(R() * wrong.length)];
    }
    B.thinkT -= 1 / 60;
  } else B.q = null;
  if (items && B.thinkT <= 0 && B.pickI >= 0 && aimedAnswer(S) === B.pickI && !S.shells.length) shootAnswer(S);
  B.look -= 1 / 60;
  if (B.look > 0) {
    // between looks it still jumps on time for what it saw
    if (!M.air && B.lowNow !== undefined) { B.lowNow -= 1 / 60; if (B.lowNow < 0.3 && B.lowNow > 0.05) { if (R() < P.jump) jump(S); B.lowNow = undefined; } }
    return;
  }
  B.look = P.react * (0.7 + R() * 0.6);
  const XS = []; for (let x = -XMAX; x <= XMAX + 0.01; x += 0.65) XS.push(x);
  const danger = XS.map(() => 0), low = XS.map(() => 9), H = 1.8;
  const ttcOf = (z, vz) => (vz < -0.1 ? z / -vz : 99);
  for (const b of S.bullets) {
    if (b.done) continue;
    const ttc = ttcOf(b.z, b.vz);
    if (ttc > H) continue;
    const xa = b.x + b.vx * ttc;
    XS.forEach((x, i) => { if (!b.wide && Math.abs(xa - x) > MECH_R + b.r + 0.3) return; if (b.low) low[i] = Math.min(low[i], ttc); else danger[i] += 3 / (0.25 + ttc); });
  }
  for (const e of S.ents) {
    if (e.dead || e.c === 'gate' || e.c === 'boss') continue;
    const ttc = ttcOf(e.z, e.dz);
    if (ttc > H + 0.4) continue;
    if (e.c === 'pick') { XS.forEach((x, i) => { if (Math.abs(e.x - x) < 1.2) danger[i] -= 0.4; }); continue; }
    if (e.k === 'geyser') { XS.forEach((x, i) => { if (Math.abs(e.x - x) < 1.6 && (e.phase !== 'idle' || ttc < 0.8)) danger[i] += 2.5; }); continue; }
    const base = EN[e.k];
    if (!base || (base.fly && e.k !== 'missile')) continue;
    XS.forEach((x, i) => {
      if (e.k !== 'fence' && Math.abs(e.x - x) > e.r + MECH_R - 0.3) return;
      if (e.h * 0.82 < 2.3 && e.k !== 'missile') low[i] = Math.min(low[i], ttc); else danger[i] += 4 / (0.25 + ttc);
    });
  }
  for (const m of S.marks) {
    if (m.k === 'lane') { const left = m.tel - m.t; if (left < H && m.act > 0) XS.forEach((x, i) => { if (m.lanes.some((l) => inLane(x, l))) danger[i] += 6 / (0.3 + Math.max(0, left)); }); }
    else if (m.k === 'bomb') { const left = m.tel - m.t, zAt = m.z - S.v * left; if (left < H && Math.abs(zAt) < 3) XS.forEach((x, i) => { if (inLane(x, m.lane)) danger[i] += 6 / (0.3 + left); }); }
    else if (m.k === 'sweep') { const reach = Math.abs(m.x - M.x) / m.speed + Math.max(0, m.tel - m.t); XS.forEach((x, i) => { low[i] = Math.min(low[i], reach); }); }
  }
  // where it wants to be: under its answer, or lined up with the enemy it is shooting
  let want = B.x;
  if (items && B.thinkT <= 0 && B.pickI >= 0) want = G ? laneX(B.pickI) : items[B.pickI].x;
  else {
    const foes = S.ents.filter((e) => shootable(e) && e.z > 4 && e.z <= RANGE && (e.c !== 'obs' || e.z < 40) && (e.c !== 'boss' || e.mode === 'open' || e.mode === 'stagger'));
    const prio = (e) => (e.k === 'missile' ? 0 : e.k === 'bike' ? 5 : e.c === 'boss' ? 30 : 10) + e.z * 0.3 + Math.abs(e.x - M.x) * 0.8;
    const t = foes.sort((a, b) => prio(a) - prio(b))[0];
    if (t) want = t.x + (R() < P.miss ? (R() < 0.5 ? -1 : 1) * (1.6 + R() * 1.2) : 0);
  }
  const notice = R() < P.dodge;
  let best = want, bc = 1e9;
  XS.forEach((x, i) => {
    const late = low[i] < 0.3 && !M.air ? 1.5 : 0;
    const c = (notice ? danger[i] + late : 0) + Math.abs(x - want) * 0.35 + Math.abs(x - M.x) * 0.08;
    if (c < bc) { bc = c; best = x; }
  });
  B.x = best;
  steerTo(S, best);
  let iNow = 0; XS.forEach((x, i) => { if (Math.abs(x - M.x) < Math.abs(XS[iNow] - M.x)) iNow = i; });
  if (!M.air && low[iNow] < 0.42 && low[iNow] > 0.08 && R() < P.jump) jump(S);
  B.lowNow = low[iNow] < 9 ? low[iNow] : undefined;
  // weapons: rockets for shields and bosses, lightning or the gatling for crowds
  if (S.t > B.wT) {
    B.wT = S.t + 1.5;
    const has = (w) => S.weapons.indexOf(w) >= 0;
    const foes = S.ents.filter((e) => shootable(e) && e.z > 4 && e.z <= RANGE && e.c === 'enemy');
    const boss = S.boss && (S.boss.mode === 'open' || S.boss.mode === 'stagger');
    const shields = foes.some((e) => e.k === 'shield' && e.shieldUp && !e.broken);
    let w = 'blaster';
    if (boss) w = has('laser') ? 'laser' : has('plasma') ? 'plasma' : has('rockets') ? 'rockets' : has('gatling') ? 'gatling' : 'blaster';
    else if (shields && has('rockets')) w = 'rockets';
    else if (foes.length >= 3 && has('lightning')) w = 'lightning';
    else if (has('rockets') && foes.some((e) => e.hp >= 4)) w = 'rockets';
    else if (has('gatling')) w = 'gatling';
    setWeapon(S, w);
  }
  if (S.nova > 0 && (S.bullets.filter((b) => b.z < 20).length >= 4 || (M.hp < 30 && S.ents.filter((e) => e.c === 'enemy' && e.z < RANGE).length >= 3))) nova(S);
}

root.MB = { RANGE: RANGE, LANE: LANE, SIDE: SIDE, SPAWN: SPAWN, HOLD: HOLD, WEAPONS: WEAPONS, ORDER: ORDER, NOVA_UNLOCK: NOVA_UNLOCK, NOVA_CHARGES: NOVA_CHARGES,
  EN: EN, ENEMY_ORDER: ENEMY_ORDER, BOSSES: BOSSES, laneX: laneX, laneOf: laneOf, arsenal: arsenal, mulberry: mulberry,
  XMAX: XMAX, AIM: AIM, start: start, step: step, move: move, steer: steer, steerTo: steerTo, stepLane: stepLane, jump: jump, press: press, hold: hold, release: release, setWeapon: setWeapon, nova: nova, inLine: inLine, aimedAnswer: aimedAnswer, shootAnswer: shootAnswer,
  answer: answer, bot: bot, byId: byId, shootable: shootable, nearest: nearest, centre: centre };
})(typeof window !== 'undefined' ? window : globalThis);
