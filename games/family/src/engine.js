/* games/family/src/engine.js — Family Fighters' rules: a side-scrolling brawler for 1 to 4 players. Pure and seeded (no
   DOM, no Math.random): the same code runs a solo game, the host of a crew game, a crew member's copy of the world
   (a "mirror", where only its own hero moves) and the test bots in tools/sim.js.

   The street is a band: x along the street (pixels at a 960 × 540 screen), y the depth into the screen (0 at the front,
   DEPTH at the back), z the height of a jump. The camera shows VIEW pixels of the street and never scrolls back; a fight,
   a question gate or a boss locks it until it is done.

   FF.start(level, options) makes a state S. FF.step(S, dt, inputs) moves it on: inputs[playerId] = { mx, my, atk, jump,
   spec } for the players this device drives (local players and bots). Players on other devices report where they are
   with FF.remote(S, id, state) and what they start with FF.act(S, id, action). S.ev lists what just happened (hits,
   knock-outs, answers, the boss…) for sounds, sparks and the network. FF.snapshot(S) is the world for the crew;
   FF.unsnap turns it back into objects. FF.bot(S, id, profile) plays a hero like a child would. */
(function (root) {
'use strict';
const VIEW = 960, DEPTH = 140, GRAV = 1900, JUMP_V = 640, EDGE = 26, REVIVE = 1.2, HEARTS = 3;
const MAX_ENG = 2;      // zombies biting one hero at a time; the others wait their turn around the fight
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
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

/* ================= the family =================
   combo: three blows in a row (t: how long each takes; a: when it hits; dmg; kb: knockback; down: knocks the zombie
   over). Bee, in his glasses, swings his iPad and spins round with it; Bo swings a bánh mì and bounces on his belly; Bố
   swings hardest and drives through the crowd; Mẹ swings her iced coffee and throws her slipper. A special
   costs one bar of energy (hitting zombies and right answers fill it, up to three bars). Bố plays golf: he fights with a
   golf club (the longest reach) and charges in his golf cart; Mẹ, in hip-hop style, swings her iced coffee. */
const HEROES = {
  bin: { name: 'Bee', who: 'Big brother', hp: 100, speed: 215, power: 1.0, reach: 70, w: 30, h: 98, special: 'whirl', specName: 'iPad spin',
    combo: [{ t: 0.26, a: [0.07, 0.15], dmg: 8, kb: 70 }, { t: 0.28, a: [0.07, 0.16], dmg: 9, kb: 90 }, { t: 0.44, a: [0.12, 0.23], dmg: 16, kb: 300, down: true, reach: 76 }] },
  bo: { name: 'Bo', who: 'Little brother', hp: 125, speed: 185, power: 1.15, reach: 62, w: 40, h: 84, special: 'bounce', specName: 'Belly bounce',
    combo: [{ t: 0.3, a: [0.09, 0.17], dmg: 9, kb: 70 }, { t: 0.32, a: [0.09, 0.18], dmg: 10, kb: 90 }, { t: 0.5, a: [0.15, 0.27], dmg: 18, kb: 340, down: true, reach: 70 }] },
  dad: { name: 'Bố', who: 'Dad', hp: 140, speed: 195, power: 1.25, reach: 84, w: 34, h: 124, special: 'cart', specName: 'Golf cart dash',
    combo: [{ t: 0.3, a: [0.09, 0.17], dmg: 9, kb: 80 }, { t: 0.32, a: [0.09, 0.18], dmg: 10, kb: 100 }, { t: 0.54, a: [0.2, 0.3], dmg: 19, kb: 380, down: true, reach: 96 }] },
  mum: { name: 'Mẹ', who: 'Mum', hp: 108, speed: 226, power: 0.95, reach: 70, w: 30, h: 112, special: 'slippers', specName: 'Slipper storm',
    combo: [{ t: 0.24, a: [0.06, 0.14], dmg: 8, kb: 70 }, { t: 0.26, a: [0.06, 0.15], dmg: 9, kb: 80 }, { t: 0.42, a: [0.13, 0.15], dmg: 13, kb: 260, down: true, slipper: true }] }
};
const HERO_ORDER = ['bin', 'bo', 'dad', 'mum'];
const JUMP_ATK = { dmg: 12, kb: 240 };
const SPECIALS = { whirl: 1.0, bounce: 0.95, cart: 1.05, slippers: 0.5 };
// a hero's level (from the experience it has earned) makes it a little stronger
const heroLevel = (xp) => clamp(1 + Math.floor((xp || 0) / 150), 1, 10);

/* ================= the zombies =================
   hp before the level and the crew make them tougher; reach: how close they bite; wind: the warning before a bite
   (arms up); cool: the rest after it. armor: a cooking pot on the head that takes blows first; ranged: spits from that
   far; leap: jumps from that far; fly: flies that high (jump to hit it, or hit it as it swoops); shield: a big bamboo
   tray that blocks light blows from the front (a jump kick, a third blow or a special knocks it aside); boom: puffs up
   and pops when beaten (hurting zombies a lot and the family a little). */
const ZOMBIES = {
  walker: { name: 'Shuffler', hp: 34, speed: 58, dmg: 8, reach: 50, wind: 0.62, cool: 1.5, w: 30, h: 100, score: 10, xp: 2 },
  runner: { name: 'Runner', hp: 24, speed: 128, dmg: 7, reach: 46, wind: 0.45, cool: 1.25, w: 26, h: 94, score: 12, xp: 2 },
  bucket: { name: 'Pot-head', hp: 34, armor: 26, speed: 56, dmg: 9, reach: 50, wind: 0.62, cool: 1.5, w: 30, h: 110, score: 16, xp: 3 },
  fat: { name: 'Big Belly', hp: 90, speed: 42, dmg: 14, reach: 62, wind: 0.9, cool: 2.0, w: 52, h: 106, score: 26, xp: 5, heavy: true },
  spitter: { name: 'Spitter', hp: 28, speed: 52, dmg: 8, ranged: 360, wind: 0.75, cool: 2.5, w: 28, h: 98, score: 18, xp: 3 },
  jumper: { name: 'Hopper', hp: 28, speed: 72, dmg: 11, reach: 48, leap: 250, wind: 0.5, cool: 1.8, w: 28, h: 96, score: 18, xp: 3 },
  bat: { name: 'Zom-bat', hp: 16, speed: 150, dmg: 6, reach: 44, fly: 72, wind: 0.5, cool: 1.4, w: 34, h: 26, score: 10, xp: 2 },
  shield: { name: 'Tray Guard', hp: 44, speed: 50, dmg: 10, reach: 52, wind: 0.65, cool: 1.6, w: 34, h: 106, score: 22, xp: 4, shield: true },
  bloater: { name: 'Puffer', hp: 34, speed: 40, dmg: 14, reach: 34, wind: 0.9, cool: 1.0, boom: 88, w: 48, h: 102, score: 20, xp: 4 }
};
const ZOMBIE_ORDER = ['walker', 'runner', 'bucket', 'fat', 'spitter', 'jumper', 'bat', 'shield', 'bloater'];

/* ================= the bosses =================
   Each has three thirds of strength. At two thirds and at one third a question shield comes up: three gongs stand in
   front of it and the family smashes the right one to break the shield (the boss is then dizzy for a moment and takes
   more from every blow). attacks are taken in turn; gap: seconds between them. */
const BOSSES = {
  chef: { name: 'Zombie Chef', hp: 420, w: 80, h: 150, speed: 70, gap: 2.4, minion: 'walker', attacks: ['wok', 'dumplings', 'wok', 'summon'] },
  scooter: { name: 'Scooter King', hp: 480, w: 100, h: 150, speed: 80, gap: 2.3, minion: 'runner', attacks: ['charge', 'swipe', 'charge', 'summon'] },
  scarecrow: { name: 'Scarecrow King', hp: 540, w: 80, h: 180, speed: 60, gap: 2.3, minion: 'bat', attacks: ['pitchfork', 'crows', 'stomp', 'summon'] },
  headmaster: { name: 'Zombie Headmaster', hp: 600, w: 80, h: 170, speed: 70, gap: 2.2, minion: 'bucket', attacks: ['ruler', 'chalk', 'ruler', 'summon'] },
  crab: { name: 'Giant Crab', hp: 680, w: 150, h: 120, speed: 75, gap: 2.2, minion: 'fat', attacks: ['claw', 'bubbles', 'burrow', 'claw'] },
  pirate: { name: 'Captain Bones', hp: 760, w: 90, h: 170, speed: 75, gap: 2.1, minion: 'spitter', attacks: ['anchor', 'cannon', 'anchor', 'summon'] },
  batqueen: { name: 'Bat Queen', hp: 760, w: 120, h: 110, speed: 120, gap: 2.0, fly: 110, minion: 'bat', attacks: ['dive', 'screech', 'dive', 'summon'] },
  yeti: { name: 'Zombie Yeti', hp: 900, w: 110, h: 190, speed: 70, gap: 2.0, minion: 'shield', attacks: ['snowball', 'stomp', 'swipe', 'snowball'] },
  doctor: { name: 'Doctor Zom', hp: 960, w: 70, h: 160, speed: 95, gap: 1.9, minion: 'bloater', attacks: ['potions', 'zap', 'potions', 'summon'] },
  mega: { name: 'Mega Zombie', hp: 1250, w: 150, h: 240, speed: 60, gap: 1.8, minion: 'jumper', attacks: ['stomp', 'laser', 'swipe', 'summon', 'laser'] }
};
const BOSS_ORDER = ['chef', 'scooter', 'scarecrow', 'headmaster', 'crab', 'pirate', 'batqueen', 'yeti', 'doctor', 'mega'];

/* ================= a level starts =================
   level: { id, place, len, zombies, props: [{ k, x, y, drop }], beats: [{ k: 'fight', x, waves: [[[type, count, side], ...], ...] }
   | { k: 'gate', x } | { k: 'boss', x, b }] }
   options: players [{ id, hero, name, lvl, remote, bot }], seed, ask(kind, S) -> { text, choices [3], correct, tip, kind },
   from (the beat to start at: a checkpoint), mirror (a crew member's copy: only its own hero moves) */
function start(level, o) {
  o = o || {};
  const n = Math.max(1, (o.players || []).length), from = o.from || 0;
  const S = {
    L: level, n: level.id, rnd: mulberry(o.seed || 1), ask: o.ask || null, t: 0, mirror: !!o.mirror,
    crew: n, hpMul: (1 + 0.08 * (level.id - 1)) * (1 + 0.35 * (n - 1)), dmgMul: 1 + 0.05 * (level.id - 1), countMul: 1 + 0.3 * (n - 1),
    cam: Math.max(0, (level.beats[from] ? level.beats[from].x : 0) - 300), lock: null, bi: from, cp: from,
    players: [], zs: [], shots: [], picks: [], props: [], marks: [], gate: null, boss: null, ev: [], id: 1,
    waveI: 0, waveT: 0, spawnQ: [], score: 0, hearts: HEARTS, stats: { right: 0, wrong: 0, first: 0, asked: 0, kills: 0, hearts: 0, wipes: 0 },
    state: 'play', endT: 0, shake: 0, go: from > 0
  };
  (o.players || []).forEach((p, i) => addPlayer(S, p, i));
  for (const pr of level.props || []) if (pr.x >= S.cam - 100) S.props.push({ id: S.id++, k: pr.k, x: pr.x, y: pr.y, hp: pr.k === 'stall' ? 3 : 2, max: pr.k === 'stall' ? 3 : 2, drop: pr.drop || null, hit: 0 });
  return S;
}
function addPlayer(S, p, slot) {
  const H = HEROES[p.hero] || HEROES.bin, lvl = clamp(p.lvl || 1, 1, 10);
  const hp = Math.round(H.hp * (1 + 0.05 * (lvl - 1)));
  const P = { id: p.id, slot: slot, hero: HEROES[p.hero] ? p.hero : 'bin', name: p.name || H.name, remote: !!p.remote, bot: !!p.bot,
    x: S.cam + 150 + slot * 46, y: 30 + slot * 26, z: 0, vz: 0, face: 1, hp: hp, max: hp, power: H.power * (1 + 0.03 * (lvl - 1)),
    energy: 1, st: 'idle', t: 0, combo: 0, comboT: 0, queued: false, atkId: 0, hitIds: [], inv: 1, koT: 0, rev: 0, lvl: lvl, sk: '',
    stats: { kills: 0, dmg: 0, right: 0, wrong: 0, xp: 0, coins: 0, downs: 0 }, walk: 0, kbx: 0 };
  S.players.push(P);
  return P;
}
function removePlayer(S, id) { S.players = S.players.filter((p) => p.id !== id); }
const alive = (P) => P.st !== 'ko';

/* ================= the family moves and fights =================
   playerStep runs a hero this device drives: the host's local players and bots, and on a crew member's device its own
   hero. bounds: the camera's edges and a closed gate. */
function bounds(S) {
  let r = S.cam + VIEW - EDGE;
  if (S.gate && !S.gate.open) r = Math.min(r, S.gate.x - 34);
  return [S.cam + EDGE, r];
}
function playerStep(S, P, inp, dt) {
  const H = HEROES[P.hero], [lo, hi] = bounds(S);
  inp = inp || {};
  P.t += dt;
  if (P.inv > 0) P.inv -= dt;
  if (P.comboT > 0) { P.comboT -= dt; if (P.comboT <= 0) P.combo = 0; }
  if (P.st === 'ko') { if (!S.mirror) koStep(S, P, dt); return; }
  if (P.st === 'win') return;
  // in the air: gravity
  if (P.z > 0 || P.vz > 0) {
    P.vz -= GRAV * dt; P.z += P.vz * dt;
    if (P.z <= 0) {
      P.z = 0; P.vz = 0;
      if (P.st === 'jump' || P.st === 'jatk') { P.st = 'idle'; P.t = 0; S.ev.push({ e: 'land', id: P.id, x: P.x, y: P.y }); }
      else if (P.st === 'spec' && P.sk === 'bounce') { bounceLand(S, P); return; }
    }
  }
  const mx = clamp(inp.mx || 0, -1, 1), my = clamp(inp.my || 0, -1, 1);
  if (P.st === 'hurt' || P.st === 'down' || P.st === 'up') {
    if (P.st === 'hurt') { P.x = clamp(P.x + P.kbx * dt, lo, hi); P.kbx *= 0.85; if (P.t > 0.32) { P.st = 'idle'; P.t = 0; } }
    else if (P.st === 'down') { P.x = clamp(P.x + P.kbx * dt, lo, hi); P.kbx *= 0.9; if (P.t > 0.85 && P.z <= 0) { P.st = 'up'; P.t = 0; } }
    else if (P.t > 0.3) { P.st = 'idle'; P.t = 0; P.inv = Math.max(P.inv, 0.7); }
    return;
  }
  if (P.st === 'spec') { specialStep(S, P, dt, lo, hi); return; }
  if (P.st === 'atk') {
    const A = H.combo[P.combo];
    if (inp.atk) P.queued = true;
    if (P.t < A.a[0]) P.x = clamp(P.x + P.face * 40 * dt, lo, hi);   // a little step into each blow
    if (P.t >= A.a[0] && P.t <= A.a[1]) attackHits(S, P, A.reach || H.reach, P.power * A.dmg, A.kb, !!A.down, false);
    if (A.slipper && !P.thrown && P.t >= A.a[0]) { P.thrown = true; throwSlipper(S, P, P.y, false); }
    if (P.t >= A.t) {
      if (P.queued && P.combo < 2) { P.combo++; startAtk(S, P); }
      else { P.st = 'idle'; P.t = 0; P.comboT = P.combo < 2 ? 0.38 : 0; P.combo = P.combo < 2 ? P.combo + 1 : 0; }
    }
    return;
  }
  if (P.st === 'jatk') {
    // a flying kick on the way down
    if (P.vz < 300) attackHits(S, P, H.reach - 4, P.power * JUMP_ATK.dmg, JUMP_ATK.kb, true, true);
    P.x = clamp(P.x + P.face * H.speed * 0.6 * dt, lo, hi);
    P.y = clamp(P.y + my * H.speed * 0.3 * dt, 0, DEPTH);
    return;
  }
  // free: walking, standing or jumping
  const sp = H.speed * (P.z > 0 ? 0.85 : 1);
  P.x = clamp(P.x + mx * sp * dt, lo, hi);
  P.y = clamp(P.y + my * sp * 0.62 * dt, 0, DEPTH);
  if (Math.abs(mx) > 0.15) P.face = mx > 0 ? 1 : -1;
  P.walk += Math.hypot(mx, my) * sp * dt;
  if (P.z <= 0) P.st = Math.abs(mx) + Math.abs(my) > 0.12 ? 'walk' : 'idle';
  if (inp.jump && P.z <= 0) { P.vz = JUMP_V; P.z = 0.01; P.st = 'jump'; P.t = 0; S.ev.push({ e: 'jump', id: P.id }); }
  else if (inp.atk) {
    if (P.z > 0) { P.st = 'jatk'; P.t = 0; P.atkId++; P.hitIds = []; S.ev.push({ e: 'swing', id: P.id, n: 3, hero: P.hero }); }
    else { if (P.comboT <= 0) P.combo = 0; startAtk(S, P); }
  } else if (inp.spec && P.energy >= 1 && P.z <= 0) startSpecial(S, P);
}
// knocked out: a teammate standing close brings the hero back (see step); otherwise a family heart does after a while
function koStep(S, P, dt) {
  P.koT -= dt;
  if (P.koT <= 0 && S.hearts > 0) {
    S.hearts--; S.stats.hearts++;
    revive(S, P, 1, true);
    S.ev.push({ e: 'heart', id: P.id, left: S.hearts });
  }
}
function startAtk(S, P) {
  P.st = 'atk'; P.t = 0; P.queued = false; P.thrown = false; P.atkId++; P.hitIds = [];
  S.ev.push({ e: 'swing', id: P.id, n: P.combo, hero: P.hero });
}
// what a blow hits: zombies, the boss, crates and stalls, and one answer drum (or boss gong) in front of the hero
function attackHits(S, P, reach, dmg, kb, down, air) {
  if (S.mirror) return;
  const heavy = down || air;
  for (const Z of S.zs) {
    if (Z.dead || Z.st === 'dying' || P.hitIds.indexOf(Z.id) >= 0) continue;
    const dx = (Z.x - P.x) * P.face, dy = Math.abs(Z.y - P.y), zt = ZOMBIES[Z.k];
    if (dx < -14 || dx > reach + zt.w * 0.5 || dy > 26 + zt.w * 0.2) continue;
    if (zt.fly && P.z + 64 < Z.z) continue;
    P.hitIds.push(Z.id);
    hitZombie(S, Z, dmg, kb * P.face, down, heavy, P, Z.x < P.x ? 1 : -1);
  }
  const B = S.boss;
  if (B && !B.dead && !(B.hide > 0) && B.st === 'fight' && P.hitIds.indexOf(B.id) < 0) {
    const dx = (B.x - P.x) * P.face, dy = Math.abs(B.y - P.y), D = BOSSES[B.b];
    if (dx > -20 && dx < reach + D.w * 0.5 && dy < 40 + D.w * 0.12 && (!D.fly || P.z + 100 > B.z)) { P.hitIds.push(B.id); hitBoss(S, B, dmg, P); }
  }
  for (const pr of S.props) {
    if (pr.hp <= 0 || P.hitIds.indexOf(pr.id) >= 0) continue;
    const dx = (pr.x - P.x) * P.face, dy = Math.abs(pr.y - P.y);
    if (dx < -10 || dx > reach + 24 || dy > 30) continue;
    P.hitIds.push(pr.id);
    pr.hp--; pr.hit = 0.15;
    S.ev.push({ e: 'crack', x: pr.x, y: pr.y, k: pr.k });
    if (pr.hp <= 0) breakProp(S, pr);
  }
  // one drum per blow: the one most in line with the hero
  const owner = asking(S);
  if (owner && owner.lockAll <= 0 && P.hitIds.indexOf('drum') < 0) {
    let best = -1, bd = 1e9;
    owner.drums.forEach((d, i) => {
      if (d.bad || d.lock > 0) return;
      const dx = (d.x - P.x) * P.face, dy = Math.abs(d.y - P.y);
      if (dx < -10 || dx > reach + 26 || dy > 30) return;
      if (dy + Math.abs(dx) * 0.1 < bd) { bd = dy + Math.abs(dx) * 0.1; best = i; }
    });
    if (best >= 0) { P.hitIds.push('drum'); answerDrum(S, best, P); }
  }
}
// the question being asked right now: a gate's drums, or a boss's gongs
function asking(S) {
  if (S.gate && !S.gate.open) return S.gate;
  if (S.boss && S.boss.shield) return S.boss;
  return null;
}
function hitZombie(S, Z, dmg, kb, down, heavy, P, side) {
  const zt = ZOMBIES[Z.k];
  // the bamboo tray stops light blows from the front
  if (zt.shield && Z.shieldOn && !heavy && Z.face === side) { Z.hit = 0.1; Z.kbx = -side * 60; S.ev.push({ e: 'block', x: Z.x - side * 20, y: Z.y, z: 55 }); return; }
  if (Z.armor > 0) {
    Z.armor -= dmg; Z.hit = 0.12;
    S.ev.push({ e: 'clang', x: Z.x, y: Z.y, z: zt.h });
    if (Z.armor > 0) { if (down) { Z.st = 'hurt'; Z.t = 0; Z.kbx = kb * 0.6; } return; }
    S.ev.push({ e: 'pot', x: Z.x, y: Z.y, z: zt.h, face: Z.face });
    dmg = -Z.armor; Z.armor = 0;
  }
  dmg = Math.round(dmg);
  Z.hp -= dmg; Z.hit = 0.14;
  if (P) { P.stats.dmg += dmg; P.energy = Math.min(3, P.energy + 0.09); }
  if (heavy && zt.shield && Z.shieldOn) { Z.shieldOn = false; S.ev.push({ e: 'tray', x: Z.x, y: Z.y, face: Z.face }); }
  S.ev.push({ e: 'hit', x: Z.x, y: Z.y, z: (zt.fly ? Z.z : 0) + zt.h * 0.6, dmg: dmg, heavy: heavy, by: P ? P.id : 0 });
  if (Z.hp <= 0) { killZombie(S, Z, P, kb); return; }
  Z.eng = 0;
  const res = zt.heavy ? 0.45 : 1;
  if (down && !zt.heavy) { Z.st = 'down'; Z.t = 0; Z.kbx = kb * 1.2; Z.vz = zt.fly ? 0 : 260; Z.z = Math.max(Z.z, 0.01); }
  else { Z.st = 'hurt'; Z.t = 0; Z.kbx = kb * res; }
}
function killZombie(S, Z, P, kb) {
  const zt = ZOMBIES[Z.k];
  Z.st = 'dying'; Z.t = 0; Z.kbx = kb || 0; Z.vz = zt.fly ? 0 : 300; Z.z = Math.max(Z.z, 0.01); Z.eng = 0; Z.by = P ? P.id : 0;
  S.stats.kills++;
  S.score += zt.score;
  if (P) { P.stats.kills++; P.stats.xp += zt.xp; }
  S.ev.push({ e: 'ko', k: Z.k, x: Z.x, y: Z.y, z: Z.z, by: P ? P.id : 0 });
  const r = S.rnd();
  if (r < 0.1) addPick(S, Z.x, Z.y, r < 0.025 ? 'pho' : 'banhmi');
  else if (r < 0.14) addPick(S, Z.x, Z.y, 'che');
  else if (r < 0.48) addPick(S, Z.x, Z.y, 'coin');
}
// a puffer popping: it hurts zombies a lot and the family a little
function explode(S, x, y, R, dmg, by) {
  S.ev.push({ e: 'boom', x: x, y: y, r: R });
  S.shake = Math.max(S.shake, 0.4);
  for (const Z of S.zs) if (!Z.dead && Z.st !== 'dying' && Math.abs(Z.x - x) < R && Math.abs(Z.y - y) < R * 0.5) hitZombie(S, Z, 40, (Z.x > x ? 1 : -1) * 260, true, true, by, 0);
  for (const P of S.players) if (alive(P) && Math.abs(P.x - x) < R * 0.8 && Math.abs(P.y - y) < R * 0.4 && P.z < 40) hurt(S, P, dmg, (P.x > x ? 1 : -1) * 220, true);
}
function breakProp(S, pr) {
  S.ev.push({ e: 'smash', x: pr.x, y: pr.y, k: pr.k });
  const r = S.rnd();
  addPick(S, pr.x, pr.y, pr.drop || (r < 0.45 ? 'coin' : r < 0.8 ? 'banhmi' : 'che'));
  if (pr.k === 'stall') { addPick(S, pr.x + 20, pr.y + 6, 'coin'); addPick(S, pr.x - 20, pr.y - 6, 'coin'); }
}
function addPick(S, x, y, k) {
  S.picks.push({ id: S.id++, k: k, x: clamp(x + (S.rnd() - 0.5) * 24, S.cam + 30, S.cam + VIEW - 30), y: clamp(y + (S.rnd() - 0.5) * 16, 4, DEPTH - 4), z: 30, vz: 220, t: 0 });
}
function hurt(S, P, dmg, kb, down) {
  if (!alive(P) || P.inv > 0 || P.st === 'down' || P.st === 'up' || P.st === 'win' || (P.st === 'spec' && P.sk !== 'slippers')) return false;
  const n = Math.max(1, Math.round(dmg * S.dmgMul));
  P.hp = Math.max(0, P.hp - n);
  S.ev.push({ e: 'hurt', id: P.id, dmg: n, x: P.x, y: P.y, kb: kb, down: !!down });
  if (P.hp <= 0) { knockOut(S, P); return true; }
  P.inv = 0.6;
  if (!P.remote) feel(S, P, { kb: kb, down: down });
  return true;
}
// how a hero reacts to a blow (on a crew member's device the host says when, and how hard)
function feel(S, P, e) {
  if (!alive(P) || P.st === 'win') return;
  P.combo = 0; P.queued = false; P.inv = Math.max(P.inv, 0.6);
  if (e.down) { P.st = 'down'; P.t = 0; P.kbx = e.kb || 0; P.vz = Math.max(P.vz, 220); P.z = Math.max(P.z, 0.01); }
  else { P.st = 'hurt'; P.t = 0; P.kbx = (e.kb || 0) * 0.9; }
}
function knockOut(S, P) {
  P.st = 'ko'; P.t = 0; P.rev = 0; P.z = 0; P.vz = 0; P.stats.downs++;
  // alone, a family heart brings the hero back soon; in a crew the others have a while to help first
  const standing = S.players.filter(alive).length;
  P.koT = standing === 0 ? 2.5 : 9;
  if (standing === 0) for (const o of S.players) o.koT = Math.min(o.koT, 2.5);
  S.ev.push({ e: 'down', id: P.id, x: P.x, y: P.y });
}
function revive(S, P, frac, alone) {
  const [lo, hi] = bounds(S);
  P.st = 'idle'; P.t = 0; P.hp = Math.max(1, Math.round(P.max * frac)); P.inv = 2; P.rev = 0; P.koT = 0; P.z = 0; P.vz = 0;
  P.x = clamp(P.x, lo + 10, hi - 10);
  S.ev.push({ e: 'revive', id: P.id, alone: !!alone, x: P.x, y: P.y });
}

/* ================= specials ================= */
function startSpecial(S, P) {
  const H = HEROES[P.hero];
  P.energy -= 1; P.st = 'spec'; P.sk = H.special; P.t = 0; P.atkId++; P.hitIds = []; P.tick = 0; P.landed = false;
  S.ev.push({ e: 'special', id: P.id, k: P.sk, x: P.x, y: P.y });
  if (P.sk === 'bounce') { P.vz = 760; P.z = 0.01; }
  if (P.sk === 'slippers') for (let i = -2; i <= 2; i++) throwSlipper(S, P, clamp(P.y + i * 30, 0, DEPTH), true);
}
function specialStep(S, P, dt, lo, hi) {
  if (P.sk === 'whirl') {
    // spinning round with the iPad held out: a sweep all round every fifth of a second
    P.tick -= dt;
    if (P.tick <= 0) { P.tick = 0.2; whirlHit(S, P); }
    P.x = clamp(P.x + P.face * 60 * dt, lo, hi);
  } else if (P.sk === 'cart') {
    // Bố's golf cart: a dash across the street that bowls zombies over
    P.x = clamp(P.x + P.face * 560 * dt, lo, hi);
    attackHits(S, P, 70, 26 * P.power, 380, true, true);
  } else if (P.sk === 'bounce') {
    P.x = clamp(P.x + P.face * 120 * dt, lo, hi);
    return;    // it ends when Bo lands (see playerStep)
  }
  if (P.t >= SPECIALS[P.sk]) { P.st = 'idle'; P.t = 0; P.inv = Math.max(P.inv, 0.3); }
}
function whirlHit(S, P) {
  P.hitIds = [];
  const face = P.face;
  for (const f of [1, -1]) { P.face = f; attackHits(S, P, 92, 7 * P.power, 140, false, false); }
  P.face = face;
}
function bounceLand(S, P) {
  P.st = 'idle'; P.t = 0; P.z = 0; P.vz = 0; P.inv = Math.max(P.inv, 0.3);
  S.ev.push({ e: 'quake', id: P.id, x: P.x, y: P.y });
  S.shake = Math.max(S.shake, 0.5);
  if (S.mirror) return;
  for (const Z of S.zs) if (!Z.dead && Z.st !== 'dying' && Math.abs(Z.x - P.x) < 150 && Math.abs(Z.y - P.y) < 56 && !(ZOMBIES[Z.k].fly && Z.z > 50)) hitZombie(S, Z, 24 * P.power, (Z.x > P.x ? 1 : -1) * 300, true, true, P, 0);
  const B = S.boss;
  if (B && !B.dead && B.st === 'fight' && !(B.hide > 0) && Math.abs(B.x - P.x) < 170 && Math.abs(B.y - P.y) < 70 && !BOSSES[B.b].fly) hitBoss(S, B, 24 * P.power, P);
}
// Mẹ's slipper flies along the street and bowls over the first zombie it meets
function throwSlipper(S, P, y, big) {
  S.ev.push({ e: 'throw', id: P.id, x: P.x, y: y });
  if (S.mirror) return;
  S.shots.push({ id: S.id++, k: 'slipper', by: P.id, x: P.x + P.face * 30, y: y, z: 56, vx: P.face * (big ? 640 : 600), dmg: (big ? 14 : 13) * P.power, life: big ? 1.15 : 0.9, friendly: true, spin: 0 });
}

/* ================= zombies =================
   A zombie picks the nearest standing hero. Two at a time may close in and bite (arms up first: the warning); the
   others wait their turn a few steps away, shuffling. A zombie that is hit gives up its turn. */
function spawnZombie(S, k, side, y) {
  const zt = ZOMBIES[k];
  const x = side < 0 ? S.cam - 40 : S.cam + VIEW + 40;
  const Z = { id: S.id++, k: k, x: x, y: y != null ? y : 10 + S.rnd() * (DEPTH - 20), z: zt.fly || 0, face: side < 0 ? 1 : -1,
    hp: Math.round(zt.hp * S.hpMul), max: Math.round(zt.hp * S.hpMul), armor: zt.armor ? Math.round(zt.armor * S.hpMul) : 0, shieldOn: !!zt.shield,
    st: 'move', t: 0, cd: 0.8 + S.rnd() * 0.9, kbx: 0, vz: 0, hit: 0, tgt: 0, eng: 0, slot: S.rnd() < 0.5 ? -1 : 1, wob: S.rnd() * 6, hov: 120 + S.rnd() * 60 };
  S.zs.push(Z);
  return Z;
}
function zombieStep(S, Z, dt) {
  const zt = ZOMBIES[Z.k];
  Z.t += dt;
  if (Z.hit > 0) Z.hit -= dt;
  if (Z.st === 'dying') {
    Z.x += Z.kbx * dt; Z.kbx *= 0.9;
    if (!zt.fly) { Z.vz -= GRAV * dt; Z.z = Math.max(0, Z.z + Z.vz * dt); }
    if (zt.boom && !Z.popped && Z.t > 0.45) { Z.popped = true; explode(S, Z.x, Z.y, zt.boom, 12, S.players.find((p) => p.id === Z.by) || null); }
    if (Z.t > 0.7) Z.dead = true;
    return;
  }
  if (Z.st === 'hurt') { Z.x += Z.kbx * dt; Z.kbx *= 0.86; if (Z.t > 0.34) { Z.st = 'move'; Z.t = 0; Z.cd = Math.max(Z.cd, 0.4); } return; }
  if (Z.st === 'down') {
    Z.x += Z.kbx * dt; Z.kbx *= 0.9;
    if (!zt.fly) { Z.vz -= GRAV * dt; Z.z = Math.max(0, Z.z + Z.vz * dt); }
    if (Z.t > 1.0) { Z.st = 'up'; Z.t = 0; }
    return;
  }
  if (Z.st === 'up') { if (Z.t > 0.4) { Z.st = 'move'; Z.t = 0; Z.cd = Math.max(Z.cd, 0.5); if (zt.shield) Z.shieldOn = true; } return; }
  // the nearest standing hero
  let T = null, td = 1e9;
  for (const P of S.players) { if (!alive(P)) continue; const d = Math.abs(P.x - Z.x) + Math.abs(P.y - Z.y) * 1.6; if (d < td) { td = d; T = P; } }
  if (!T) { Z.eng = 0; Z.x += Z.face * zt.speed * 0.3 * dt; if (zt.fly) Z.z += (zt.fly - Z.z) * Math.min(1, 2 * dt); return; }
  if (Z.tgt !== T.id) { Z.tgt = T.id; Z.eng = 0; }
  Z.cd -= dt;
  const dx = T.x - Z.x, dy = T.y - Z.y;
  if (Z.st === 'wind') {
    Z.face = dx >= 0 ? 1 : -1;
    if (zt.fly) Z.z += (22 - Z.z) * Math.min(1, 6 * dt);     // a bat swoops down to bite: that is when to punch it
    if (Z.t >= zt.wind) zombieStrike(S, Z);
    return;
  }
  if (Z.st === 'leap') {
    Z.x += Z.lvx * dt; Z.y = clamp(Z.y + Z.lvy * dt, 0, DEPTH); Z.vz -= GRAV * dt; Z.z += Z.vz * dt;
    if (Z.z <= 0) {
      Z.z = 0; Z.st = 'rest'; Z.t = 0; Z.cd = zt.cool;
      S.ev.push({ e: 'thud', x: Z.x, y: Z.y });
      for (const P of S.players) if (alive(P) && P.z < 30 && Math.abs(P.x - Z.x) < 52 && Math.abs(P.y - Z.y) < 26) hurt(S, P, zt.dmg, (P.x > Z.x ? 1 : -1) * 200, true);
    }
    return;
  }
  if (Z.st === 'rest') { if (zt.fly) Z.z += (zt.fly - Z.z) * Math.min(1, 3 * dt); if (Z.t > 0.35) { Z.st = 'move'; Z.t = 0; } return; }
  Z.face = dx >= 0 ? 1 : -1;
  if (zt.fly) Z.z += ((zt.fly + Math.sin(S.t * 3 + Z.wob) * 10) - Z.z) * Math.min(1, 2 * dt);
  // the spitter keeps its distance and spits along the street
  if (zt.ranged) {
    let wantX = T.x - Math.sign(dx || 1) * 280;
    // never backing off the screen: from the other side then
    if (wantX < S.cam + 40 || wantX > S.cam + VIEW - 40) wantX = clamp(T.x + Math.sign(dx || 1) * 280, S.cam + 40, S.cam + VIEW - 40);
    const mvx = clamp((wantX - Z.x) / 60, -1, 1), mvy = clamp(dy / 30, -1, 1);
    Z.x += mvx * zt.speed * dt; Z.y = clamp(Z.y + mvy * zt.speed * 0.7 * dt, 0, DEPTH);
    if (Z.cd <= 0 && Math.abs(dy) < 18 && Math.abs(dx) < zt.ranged && onScreen(S, Z)) { Z.st = 'wind'; Z.t = 0; S.ev.push({ e: 'wind', x: Z.x, y: Z.y, k: Z.k }); }
    return;
  }
  // a turn to bite?
  if (!Z.eng) {
    let n = 0;
    for (const o of S.zs) if (o !== Z && o.eng === T.id && !o.dead && o.st !== 'dying') n++;
    if (n < MAX_ENG && Math.abs(dx) < 260) Z.eng = T.id;
  }
  let gx, gy;
  if (Z.eng) {
    // the hopper leaps in from a distance
    if (zt.leap && Z.cd <= 0 && Math.abs(dx) < zt.leap && Math.abs(dx) > 110 && onScreen(S, Z)) {
      Z.st = 'leap'; Z.t = 0; const T0 = 0.7; Z.vz = GRAV * T0 / 2; Z.lvx = dx / T0; Z.lvy = dy / T0;
      S.ev.push({ e: 'leap', x: Z.x, y: Z.y });
      return;
    }
    // a spot beside the hero (the less crowded side)
    let side = Z.slot;
    const crowd = (s) => { let c = 0; for (const o of S.zs) if (o !== Z && !o.dead && o.eng === T.id && o.slot === s) c++; return c; };
    if (crowd(side) > crowd(-side)) { side = -side; Z.slot = side; }
    const reach = zt.reach || 40, off = reach - 6 + (zt.w - 30) * 0.3;
    // a spot off the screen will not do: the other side then
    if (T.x + side * off > S.cam + VIEW - 30 || T.x + side * off < S.cam + 30) { side = -side; Z.slot = side; }
    gx = T.x + side * off; gy = T.y + Math.sin(Z.wob + S.t) * 4;
  } else {
    // waiting a few steps away, on the side it came from
    const side = Z.x < T.x ? -1 : 1;
    gx = T.x + side * Z.hov + Math.sin(S.t * 0.7 + Z.wob) * 24; gy = clamp(T.y + Math.cos(S.t * 0.5 + Z.wob) * 40, 6, DEPTH - 6);
  }
  gx = clamp(gx, S.cam + 30, S.cam + VIEW - 30);
  let mx = gx - Z.x, my = gy - Z.y;
  for (const o of S.zs) { if (o === Z || o.dead) continue; const ox = Z.x - o.x, oy = Z.y - o.y; if (Math.abs(ox) < 32 && Math.abs(oy) < 14) { mx += Math.sign(ox || Z.wob - 3) * 30; my += Math.sign(oy || 1) * 20; } }
  const d = Math.hypot(mx, my), sp = zt.speed * (Z.eng ? 1 : 0.6);
  if (d > 6) { Z.x += mx / d * sp * dt; Z.y = clamp(Z.y + my / d * sp * 0.7 * dt, 0, DEPTH); }
  if (Z.eng && Z.cd <= 0 && Math.abs(dx) < (zt.reach || 40) + 8 && Math.abs(dy) < 20 && onScreen(S, Z)) { Z.st = 'wind'; Z.t = 0; S.ev.push({ e: 'wind', x: Z.x, y: Z.y, k: Z.k }); }
}
const onScreen = (S, Z) => Z.x > S.cam - 10 && Z.x < S.cam + VIEW + 10;
function zombieStrike(S, Z) {
  const zt = ZOMBIES[Z.k];
  Z.st = 'rest'; Z.t = 0; Z.cd = zt.cool * (0.85 + S.rnd() * 0.3);
  if (zt.ranged) {
    S.shots.push({ id: S.id++, k: 'spit', x: Z.x + Z.face * 24, y: Z.y, z: 60, vx: Z.face * 300, dmg: zt.dmg, life: 1.6 });
    S.ev.push({ e: 'spit', x: Z.x, y: Z.y });
    return;
  }
  if (zt.boom) { Z.hp = 0; Z.popped = true; killZombie(S, Z, null, 0); explode(S, Z.x, Z.y, zt.boom, 12, null); return; }
  S.ev.push({ e: 'bite', x: Z.x + Z.face * 20, y: Z.y, k: Z.k });
  for (const P of S.players) {
    if (!alive(P)) continue;
    const dx = (P.x - Z.x) * Z.face, dy = Math.abs(P.y - Z.y);
    if (dx > -10 && dx < (zt.reach || 40) + 14 && dy < 22 && P.z < (zt.fly ? 90 : 50)) hurt(S, P, zt.dmg, Z.face * (zt.heavy ? 300 : 140), !!zt.heavy);
  }
}

/* ================= shots: slippers, spit, the bosses' things ================= */
function shotStep(S, dt) {
  for (const s of S.shots) {
    s.life -= dt; s.spin = (s.spin || 0) + dt * 18;
    if (s.arc) {
      // a lobbed thing lands on its mark
      s.t += dt;
      const f = Math.min(1, s.t / s.dur);
      s.x = lerp(s.x0, s.tx, f); s.y = lerp(s.y0, s.ty, f); s.z = s.h * 4 * f * (1 - f) + (1 - f) * s.z0;
      if (f >= 1) { s.dead = true; landArc(S, s); }
      continue;
    }
    s.x += s.vx * dt;
    if (s.life <= 0 || s.x < S.cam - 80 || s.x > S.cam + VIEW + 80) { s.dead = true; continue; }
    if (s.friendly) { friendlyShot(S, s); continue; }
    for (const P of S.players) {
      if (!alive(P) || Math.abs(P.x - s.x) > 26 || Math.abs(P.y - s.y) > 20 || P.z > 90) continue;
      if (hurt(S, P, s.dmg, Math.sign(s.vx) * 160, false)) { s.dead = true; S.ev.push({ e: 'splat', x: s.x, y: s.y, k: s.k }); break; }
    }
  }
  S.shots = S.shots.filter((s) => !s.dead);
}
function friendlyShot(S, s) {
  const P = S.players.find((p) => p.id === s.by) || null;
  for (const Z of S.zs) {
    const zt = ZOMBIES[Z.k];
    if (Z.dead || Z.st === 'dying' || Math.abs(Z.x - s.x) > zt.w * 0.5 + 16 || Math.abs(Z.y - s.y) > 24) continue;
    if (zt.fly && Z.z > 100) continue;
    hitZombie(S, Z, s.dmg, Math.sign(s.vx) * 240, true, true, P, s.vx > 0 ? -1 : 1);
    s.dead = true;
    return;
  }
  const B = S.boss;
  if (B && !B.dead && B.st === 'fight' && !(B.hide > 0) && Math.abs(B.x - s.x) < BOSSES[B.b].w * 0.5 + 14 && Math.abs(B.y - s.y) < 46) { hitBoss(S, B, s.dmg, P); s.dead = true; return; }
  const owner = asking(S);
  if (owner && owner.lockAll <= 0) owner.drums.forEach((d, i) => { if (!s.dead && !d.bad && d.lock <= 0 && Math.abs(d.x - s.x) < 26 && Math.abs(d.y - s.y) < 26) { s.dead = true; answerDrum(S, i, P); } });
  if (!s.dead) for (const pr of S.props) if (pr.hp > 0 && Math.abs(pr.x - s.x) < 24 && Math.abs(pr.y - s.y) < 24) { pr.hp--; pr.hit = 0.15; S.ev.push({ e: 'crack', x: pr.x, y: pr.y, k: pr.k }); if (pr.hp <= 0) breakProp(S, pr); s.dead = true; break; }
}
function landArc(S, s) {
  S.ev.push({ e: 'splash', x: s.tx, y: s.ty, k: s.k, r: s.r });
  for (const P of S.players) if (alive(P) && P.z < 40 && Math.abs(P.x - s.tx) < s.r && Math.abs(P.y - s.ty) < s.r * 0.5) hurt(S, P, s.dmg, (P.x > s.tx ? 1 : -1) * 180, true);
  if (s.k === 'potion' && S.rnd() < 0.3 && S.zs.filter((z) => z.minion && !z.dead).length < 4) { const Z = spawnZombie(S, 'walker', S.rnd() < 0.5 ? -1 : 1, s.ty); Z.x = s.tx; Z.minion = true; Z.st = 'up'; Z.t = 0; }
}
function lob(S, from, tx, ty, k, dmg, r, dur) {
  S.marks.push({ k: 'aim', x: tx, y: ty, r: r, t: 0, dur: dur });
  S.shots.push({ id: S.id++, k: k, arc: true, x0: from.x, y0: from.y, z0: from.z || 80, x: from.x, y: from.y, z: from.z || 80, tx: tx, ty: ty, h: 180, t: 0, dur: dur, dmg: dmg, r: r, vx: tx > from.x ? 1 : -1, life: dur + 1 });
}

/* ================= questions: gate drums and boss gongs =================
   Three drums stand in a slanting line (front left to back right), so each is reached on its own line of the street.
   They wait a moment before they can be hit, to give time to read. */
function demoQuestion(S) {
  const a = 2 + Math.floor(S.rnd() * 8), b = 2 + Math.floor(S.rnd() * 8), ans = a * b, wrong = [ans + a, ans - b];
  const correct = Math.floor(S.rnd() * 3), choices = wrong.slice();
  choices.splice(correct, 0, ans);
  return { text: a + ' × ' + b + ' = ?', choices: choices.map(String), correct: correct, tip: a + ' × ' + b + ' = ' + ans, kind: 'numbers' };
}
function question(S, kind) { S.stats.asked++; return (S.ask && S.ask(kind, S)) || demoQuestion(S); }
function drumsFor(x0, q) {
  return [0, 1, 2].map((i) => ({ x: x0 + i * 90, y: 26 + i * 44, text: String(q.choices[i]), ok: i === q.correct, bad: false, lock: 1.4 }));
}
function openGate(S, beat) {
  const q = question(S, 'gate');
  const gx = beat.x + VIEW - 150;
  S.gate = { x: gx, open: false, openT: 0, q: q, wrongs: 0, hint: false, idle: 0, lockAll: 0, drums: drumsFor(gx - 310, q) };
  S.ev.push({ e: 'gate', q: q });
}
function answerDrum(S, i, P) {
  const owner = asking(S);
  if (!owner) return;
  const isGate = owner === S.gate, d = owner.drums[i];
  owner.lockAll = 0.6;
  if (d.ok) {
    const first = owner.wrongs === 0;
    S.stats.right++; if (first) S.stats.first++;
    if (P) { P.stats.right++; P.stats.xp += first ? 6 : 3; }
    for (const p of S.players) if (alive(p)) p.energy = Math.min(3, p.energy + 0.5);
    S.score += first ? 100 : 40;
    S.ev.push({ e: 'right', first: first, q: owner.q, by: P ? P.id : 0, x: d.x, y: d.y, boss: !isGate });
    if (isGate) {
      owner.open = true; owner.openT = 0; S.shake = Math.max(S.shake, 0.4);
      for (let k = 0; k < 4; k++) addPick(S, owner.x - 80 + k * 30, 30 + k * 25, k === 0 ? 'banhmi' : 'coin');
    } else { owner.shield = false; owner.drums = []; owner.daze = 3; S.shake = Math.max(S.shake, 0.6); }
  } else {
    d.bad = true; owner.wrongs++; S.stats.wrong++;
    if (P) P.stats.wrong++;
    S.ev.push({ e: 'wrong', q: owner.q, pick: d.text, by: P ? P.id : 0, x: d.x, y: d.y, boss: !isGate });
    // two zombies pop out of a wrong drum
    for (let k = 0; k < 2; k++) { const Z = spawnZombie(S, minionOf(S), k ? 1 : -1, d.y); Z.x = d.x + (k ? 44 : -44); Z.st = 'down'; Z.t = 0.4; Z.vz = 300; Z.z = 1; Z.minion = !isGate; }
  }
}
function minionOf(S) { const L = S.L; return (L.zombies && L.zombies.length) ? L.zombies[Math.floor(S.rnd() * L.zombies.length)] : 'walker'; }
function questionStep(S, dt) {
  const owner = asking(S);
  if (!owner) return;
  if (owner.lockAll > 0) owner.lockAll -= dt;
  for (const d of owner.drums) if (d.lock > 0) d.lock -= dt;
  owner.idle = (owner.idle || 0) + dt;
  if (owner.idle > 25) owner.hint = true;     // a long think: the right drum starts to glow
}

/* ================= the bosses ================= */
function spawnBoss(S, b) {
  const D = BOSSES[b];
  const B = { id: S.id++, b: b, x: S.cam + VIEW + 140, y: DEPTH * 0.5, z: D.fly || 0, face: -1, hp: Math.round(D.hp * (1 + 0.4 * (S.crew - 1))), max: 0, st: 'enter', t: 0,
    atkT: 2.0, cycle: 0, ph: 0, shield: false, drums: [], wrongs: 0, hint: false, idle: 0, lockAll: 0, daze: 0, pose: '', poseT: 0, hit: 0, q: null,
    homeX: S.cam + VIEW - 220, charge: null, hide: 0, low: 0 };
  B.max = B.hp;
  S.boss = B;
  S.ev.push({ e: 'boss', b: b, name: D.name });
  return B;
}
function hitBoss(S, B, dmg, P) {
  if (B.dead || B.st !== 'fight' || B.hide > 0) return;
  if (B.shield) { B.hit = 0.08; S.ev.push({ e: 'block', x: B.x, y: B.y, z: (B.z || 0) + 80 }); return; }
  dmg = Math.round(dmg * (B.daze > 0 ? 1.5 : 1));
  B.hp -= dmg; B.hit = 0.12;
  if (P) { P.stats.dmg += dmg; P.energy = Math.min(3, P.energy + 0.06); }
  S.ev.push({ e: 'hit', x: B.x, y: B.y, z: (B.z || 0) + BOSSES[B.b].h * 0.55, dmg: dmg, heavy: dmg > 15, by: P ? P.id : 0, boss: true });
  // each third of its strength brings the question shield back
  const thr = B.max * (2 - B.ph) / 3;
  if (B.ph < 2 && B.hp <= thr) { B.hp = Math.max(1, Math.round(thr)); B.ph++; bossShield(S, B); return; }
  if (B.hp <= 0) {
    B.hp = 0; B.dead = true; B.st = 'dying'; B.t = 0; B.charge = null;
    S.score += 500;
    for (const p of S.players) p.stats.xp += 15;
    S.shake = 1.2;
    S.ev.push({ e: 'bossdown', b: B.b, x: B.x, y: B.y });
    // the boss's helpers give up too
    for (const Z of S.zs) if (Z.minion && !Z.dead && Z.st !== 'dying') killZombie(S, Z, null, 0);
  }
}
function bossShield(S, B) {
  B.q = question(S, 'boss');
  B.shield = true; B.wrongs = 0; B.hint = false; B.idle = 0; B.lockAll = 0; B.daze = 0; B.charge = null;
  B.drums = drumsFor(clamp(B.x - 300, S.cam + 140, S.cam + VIEW - 480), B.q);
  S.ev.push({ e: 'bshield', q: B.q });
}
function nearestPlayer(S, x, y) {
  let T = null, td = 1e9;
  for (const P of S.players) { if (!alive(P)) continue; const d = Math.abs(P.x - x) + Math.abs(P.y - y); if (d < td) { td = d; T = P; } }
  return T;
}
function bossAttack(S, B, name) {
  const D = BOSSES[B.b], T = nearestPlayer(S, B.x, B.y);
  if (!T) return;
  B.pose = name; B.poseT = 1.3;
  S.ev.push({ e: 'battack', b: B.b, a: name });
  const melee = (reach, depth, dmg, wind) => { B.face = T.x >= B.x ? 1 : -1; S.marks.push({ k: 'zone', x: B.x + B.face * reach * 0.5, y: B.y, w: reach, d: depth, t: 0, dur: wind, dmg: dmg, down: true }); };
  const alive_ = S.players.filter(alive);
  switch (name) {
    case 'wok': case 'swipe': case 'pitchfork': case 'claw': melee(210, 64, 15, 0.85); break;
    case 'ruler': case 'anchor': melee(270, 80, 16, 0.95); break;
    case 'charge':
      // the Scooter King roars along one line of the street (a red stripe warns)
      B.face = T.x >= B.x ? 1 : -1;
      S.marks.push({ k: 'line', y: T.y, t: 0, dur: 0.9 });
      B.charge = { y: T.y, t: -0.9, dir: B.face };
      break;
    case 'dumplings': case 'chalk': case 'bubbles':
      B.face = T.x >= B.x ? 1 : -1;
      for (let k = -1; k <= 1; k++) S.shots.push({ id: S.id++, k: name === 'chalk' ? 'chalk' : name === 'bubbles' ? 'bubble' : 'dumpling', x: B.x + B.face * 40, y: clamp(T.y + k * 36, 0, DEPTH), z: 70, vx: B.face * (name === 'bubbles' ? 220 : 300), dmg: 9, life: 3.5 });
      break;
    case 'snowball': case 'cannon': case 'potions':
      for (let k = 0; k < (name === 'cannon' ? 3 : 2); k++) {
        const P2 = alive_[k % Math.max(1, alive_.length)] || T;
        lob(S, { x: B.x, y: B.y, z: 140 }, clamp(P2.x + (S.rnd() - 0.5) * 60, S.cam + 40, S.cam + VIEW - 40), clamp(P2.y + (S.rnd() - 0.5) * 30, 5, DEPTH - 5), name === 'potions' ? 'potion' : name === 'cannon' ? 'cannonball' : 'snowball', 14, 52, 1.2 + k * 0.25);
      }
      break;
    case 'stomp': case 'screech':
      // a ring rolls out along the ground: jump over it
      if (D.fly) B.low = 2;
      S.marks.push({ k: 'ring', x: B.x, y: B.y, r: 20, t: 0, speed: 260, dmg: 12, wind: 0.6, hitIds: [] });
      break;
    case 'crows':
      for (let k = 0; k < 3 && S.zs.filter((z) => z.minion && !z.dead).length < 5; k++) { const Z = spawnZombie(S, 'bat', k % 2 ? 1 : -1); Z.minion = true; }
      break;
    case 'burrow': case 'dive':
      // down into the sand (or up into the dark), then bursting out under a hero: a circle warns
      S.marks.push({ k: 'aim', x: T.x, y: T.y, r: 64, t: 0, dur: 1.2 });
      B.hide = 1.2; B.burstX = T.x; B.burstY = T.y;
      break;
    case 'zap': case 'laser':
      // a beam along one line of the street: step out of it, or jump
      S.marks.push({ k: 'line', y: T.y, t: 0, dur: 1.0, beam: 0.5, dmg: 16 });
      break;
    case 'summon': {
      const n = Math.min(3, 1 + S.crew);
      for (let k = 0; k < n && S.zs.filter((z) => z.minion && !z.dead).length < 4; k++) { const Z = spawnZombie(S, D.minion, k % 2 ? 1 : -1); Z.minion = true; }
      break;
    }
  }
}
function bossStep(S, B, dt) {
  const D = BOSSES[B.b];
  B.t += dt;
  if (B.hit > 0) B.hit -= dt;
  if (B.poseT > 0) B.poseT -= dt;
  if (B.st === 'dying') { if (B.t > 2.6 && S.state === 'play') win(S); return; }
  if (B.st === 'enter') {
    B.x -= D.speed * 1.6 * dt;
    if (D.fly) B.z = D.fly + Math.sin(S.t * 2) * 12;
    if (B.x <= B.homeX) { B.x = B.homeX; B.st = 'fight'; B.t = 0; }
    return;
  }
  if (B.hide > 0) {
    B.hide -= dt;
    if (B.hide <= 0) {
      B.x = clamp(B.burstX, S.cam + 80, S.cam + VIEW - 80); B.y = B.burstY;
      S.ev.push({ e: 'burst', x: B.x, y: B.y, b: B.b });
      if (D.fly) { B.z = 26; B.low = 2.8; }     // a flier stays low for a moment after swooping: punch it then
      S.shake = Math.max(S.shake, 0.5);
      for (const P of S.players) if (alive(P) && Math.abs(P.x - B.x) < 70 && Math.abs(P.y - B.y) < 36 && P.z < 60) hurt(S, P, 18, (P.x > B.x ? 1 : -1) * 260, true);
    }
    return;
  }
  if (B.charge) {
    const C = B.charge;
    C.t += dt;
    if (C.t > 0) {
      B.y += (C.y - B.y) * Math.min(1, 10 * dt);
      B.x += C.dir * 640 * dt;
      for (const P of S.players) if (alive(P) && Math.abs(P.x - B.x) < 60 && Math.abs(P.y - B.y) < 30 && P.z < 60) hurt(S, P, 18, C.dir * 320, true);
      if (B.x < S.cam + 70 || B.x > S.cam + VIEW - 70) { B.x = clamp(B.x, S.cam + 70, S.cam + VIEW - 70); B.charge = null; B.face = -C.dir; }
    }
    return;
  }
  if (B.daze > 0) { B.daze -= dt; return; }
  const T = nearestPlayer(S, B.x, B.y);
  if (T) {
    // drifts towards the heroes, keeping a little apart
    const want = T.x + (T.x < B.x ? 150 : -150);
    B.face = T.x >= B.x ? 1 : -1;
    B.x += clamp(want - B.x, -1, 1) * D.speed * 0.5 * dt;
    B.y += clamp(T.y - B.y, -1, 1) * D.speed * 0.35 * dt;
    B.x = clamp(B.x, S.cam + 70, S.cam + VIEW - 70); B.y = clamp(B.y, 10, DEPTH - 10);
  }
  if (D.fly) { if (B.low > 0) B.low -= dt; B.z += ((B.low > 0 ? 26 : D.fly + Math.sin(S.t * 2) * 12) - B.z) * Math.min(1, 4 * dt); }
  B.atkT -= dt * (B.shield ? 0.6 : 1);
  if (B.atkT <= 0) {
    B.atkT = D.gap * (0.85 + S.rnd() * 0.3);
    bossAttack(S, B, D.attacks[B.cycle++ % D.attacks.length]);
  }
}
function markStep(S, dt) {
  for (const m of S.marks) {
    m.t += dt;
    if (m.k === 'zone') {
      if (m.t >= m.dur && !m.done) {
        m.done = true;
        S.ev.push({ e: 'slam', x: m.x, y: m.y });
        S.shake = Math.max(S.shake, 0.4);
        for (const P of S.players) if (alive(P) && Math.abs(P.x - m.x) < m.w * 0.5 && Math.abs(P.y - m.y) < m.d * 0.5 && P.z < 70) hurt(S, P, m.dmg, (P.x > m.x ? 1 : -1) * 260, m.down);
      }
      if (m.t > m.dur + 0.25) m.dead = true;
    } else if (m.k === 'line') {
      if (m.beam && m.t >= m.dur && m.t < m.dur + m.beam && !m.fired) {
        m.fired = true;
        S.ev.push({ e: 'beam', y: m.y });
        for (const P of S.players) if (alive(P) && Math.abs(P.y - m.y) < 22 && P.z < 50) hurt(S, P, m.dmg, 0, false);
      }
      if (m.t > m.dur + (m.beam || 0.2)) m.dead = true;
    } else if (m.k === 'ring') {
      if (m.t < m.wind) continue;
      m.r += m.speed * dt;
      for (const P of S.players) {
        if (!alive(P) || m.hitIds.indexOf(P.id) >= 0) continue;
        const d = Math.hypot(P.x - m.x, (P.y - m.y) * 2.2);
        if (Math.abs(d - m.r) < 18 && P.z < 18) { m.hitIds.push(P.id); hurt(S, P, m.dmg, (P.x > m.x ? 1 : -1) * 200, true); }
      }
      if (m.r > 560) m.dead = true;
    } else if (m.t > m.dur + 0.2) m.dead = true;
  }
  S.marks = S.marks.filter((m) => !m.dead);
}

/* ================= the level goes on ================= */
function step(S, dt, inputs) {
  S.ev.length = 0;
  if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 2.4);
  S.t += dt;
  if (S.state !== 'play') { for (const P of S.players) P.t += dt; return S; }
  inputs = inputs || {};
  for (const P of S.players) if (!P.remote) playerStep(S, P, inputs[P.id], dt);
  remoteStep(S, dt);
  // standing next to a knocked-out hero brings them back
  for (const P of S.players) {
    if (P.st !== 'ko') continue;
    const helper = S.players.find((o) => o !== P && alive(o) && Math.abs(o.x - P.x) < 60 && Math.abs(o.y - P.y) < 32);
    if (helper) { P.rev += dt; if (P.rev >= REVIVE) { revive(S, P, 0.5, false); S.ev.push({ e: 'helped', id: P.id, by: helper.id }); } }
    else P.rev = Math.max(0, P.rev - dt * 2);
  }
  if (S.players.length && S.players.every((P) => !alive(P)) && S.hearts <= 0) { wipe(S); return S; }
  for (const Z of S.zs) zombieStep(S, Z, dt);
  S.zs = S.zs.filter((Z) => !Z.dead);
  if (S.boss) bossStep(S, S.boss, dt);
  shotStep(S, dt);
  markStep(S, dt);
  for (const pr of S.props) if (pr.hit > 0) pr.hit -= dt;
  S.props = S.props.filter((pr) => pr.hp > 0 && pr.x > S.cam - 300);
  pickStep(S, dt);
  questionStep(S, dt);
  gateStep(S, dt);
  beatStep(S, dt);
  cameraStep(S, dt);
  return S;
}
function pickStep(S, dt) {
  for (const k of S.picks) {
    k.t += dt;
    if (k.z > 0 || k.vz > 0) { k.vz -= GRAV * 0.8 * dt; k.z = Math.max(0, k.z + k.vz * dt); if (k.z <= 0) k.vz = 0; }
    if (k.t < 0.3) continue;
    for (const P of S.players) {
      if (!alive(P)) continue;
      if (Math.abs(P.x - k.x) < 34 && Math.abs(P.y - k.y) < 22 && P.z < 40) {
        // food only for a hero who needs it (it waits for someone hungrier); coins for anyone
        if ((k.k === 'banhmi' || k.k === 'pho') && P.hp >= P.max) continue;
        if (k.k === 'che' && P.energy >= 3) continue;
        k.dead = true;
        if (k.k === 'banhmi') P.hp = Math.min(P.max, P.hp + Math.round(P.max * 0.35));
        else if (k.k === 'pho') P.hp = P.max;
        else if (k.k === 'che') P.energy = Math.min(3, P.energy + 1);
        else { P.stats.coins++; S.score += 5; }
        S.ev.push({ e: 'pick', id: P.id, k: k.k, x: k.x, y: k.y });
        break;
      }
    }
  }
  // food and coins left behind off the left of the screen can never be reached: they go
  S.picks = S.picks.filter((k) => !k.dead && k.x > S.cam + 10 && (k.k !== 'coin' || k.t < 40));
}
function gateStep(S, dt) {
  const G = S.gate;
  if (!G || !G.open) return;
  G.openT += dt;
  if (G.openT > 1.0) { S.gate = null; finishBeat(S); }
}
function beatStep(S, dt) {
  const Bt = S.lock;
  if (!Bt) return;
  if (Bt.k === 'fight') {
    // waves: the next one comes when this one is nearly beaten
    if (S.spawnQ.length) {
      S.waveT -= dt;
      if (S.waveT <= 0) { const [k, side] = S.spawnQ.shift(); spawnZombie(S, k, side); S.waveT = 0.4; }
      return;
    }
    const left = S.zs.filter((Z) => !Z.dead && Z.st !== 'dying' && !Z.minion).length;
    if (S.waveI < Bt.waves.length) { if (left <= 1) queueWave(S, Bt.waves[S.waveI++]); }
    else if (left === 0) finishBeat(S);
  } else if (Bt.k === 'boss') {
    if (!S.boss) spawnBoss(S, Bt.b);
  }
}
function queueWave(S, wave) {
  const q = [];
  for (const [k, count, side] of wave) {
    const n = Math.max(1, Math.round(count * S.countMul));
    for (let i = 0; i < n; i++) q.push([k, side || (S.rnd() < 0.5 ? -1 : 1)]);
  }
  // mix the kinds so they do not come in clumps
  for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(S.rnd() * (i + 1)); const t = q[i]; q[i] = q[j]; q[j] = t; }
  S.spawnQ = q; S.waveT = 0.2;
  S.ev.push({ e: 'wave', n: q.length });
}
function finishBeat(S) {
  S.lock = null; S.bi++; S.cp = S.bi; S.go = true;
  S.ev.push({ e: 'go' });
}
function cameraStep(S, dt) {
  const L = S.L, beat = L.beats[S.bi];
  if (S.lock) { S.cam += clamp(S.lock.x - S.cam, -300 * dt, 300 * dt); return; }
  const standing = S.players.filter(alive);
  if (!standing.length) return;
  const avg = standing.reduce((t, P) => t + P.x, 0) / standing.length;
  const minX = Math.min.apply(null, S.players.map((P) => P.x));    // nobody, standing or not, is left behind
  let want = Math.max(S.cam, Math.min(avg - VIEW * 0.42, minX - EDGE - 10));
  want = Math.min(want, beat ? beat.x : L.len - VIEW);
  S.cam += clamp(want - S.cam, 0, 420 * dt);
  if (beat && S.cam >= beat.x - 0.5) {
    S.cam = beat.x; S.lock = beat; S.go = false;
    if (beat.k === 'fight') { S.waveI = 0; S.spawnQ = []; queueWave(S, beat.waves[S.waveI++]); }
    else if (beat.k === 'gate') openGate(S, beat);
    S.ev.push({ e: 'lock', k: beat.k });
  }
}
function win(S) {
  S.state = 'won'; S.endT = S.t;
  for (const P of S.players) { if (alive(P)) { P.st = 'win'; P.t = 0; } P.stats.xp += 20; }
  S.ev.push({ e: 'won' });
}
function wipe(S) {
  S.state = 'wipe'; S.endT = S.t; S.stats.wipes++;
  S.ev.push({ e: 'wipe', cp: S.cp });
}
// stars for a level won: beating it, most questions right first time, and no family hearts used
function stars(S) {
  const asked = Math.max(1, S.stats.asked);
  return 1 + (S.stats.first / asked >= 0.8 ? 1 : 0) + (S.stats.hearts === 0 ? 1 : 0);
}

/* ================= players on other devices =================
   Each device moves its own hero; the host takes its word for where the hero is and plays its blows here, so the hits
   land on the host's zombies. */
function remote(S, id, st) {
  const P = S.players.find((p) => p.id === id);
  if (!P || !alive(P) || P.st === 'win') return;
  P.x = st.x; P.y = st.y; P.z = st.z || 0; P.face = st.f || P.face; if (st.w != null) P.walk = st.w;
  const busy = P.st === 'atk' || P.st === 'jatk' || P.st === 'spec';
  if (st.s && !busy && ['idle', 'walk', 'jump', 'hurt', 'down', 'up'].indexOf(st.s) >= 0) { if (P.st !== st.s) P.t = 0; P.st = st.s; }
}
function act(S, id, a) {
  const P = S.players.find((p) => p.id === id);
  if (!P || !alive(P) || S.state !== 'play') return;
  if (a.x != null) { P.x = a.x; P.y = a.y; P.z = a.z || 0; P.face = a.f || P.face; }
  if (a.k === 'atk') { P.combo = clamp(a.n | 0, 0, 2); startAtk(S, P); }
  else if (a.k === 'jatk') { P.st = 'jatk'; P.t = 0; P.atkId++; P.hitIds = []; }
  else if (a.k === 'spec' && P.energy >= 1) startSpecial(S, P);
}
// on the host, a remote hero's blow plays out over the same time as on its own device
function remoteStep(S, dt) {
  for (const P of S.players) {
    if (!P.remote) continue;
    P.t += dt;
    if (P.inv > 0) P.inv -= dt;
    if (P.st === 'ko') { koStep(S, P, dt); continue; }
    const H = HEROES[P.hero];
    if (P.st === 'atk') {
      const A = H.combo[P.combo];
      if (P.t >= A.a[0] && P.t <= A.a[1]) attackHits(S, P, A.reach || H.reach, P.power * A.dmg, A.kb, !!A.down, false);
      if (A.slipper && !P.thrown && P.t >= A.a[0]) { P.thrown = true; throwSlipper(S, P, P.y, false); }
      if (P.t >= A.t) { P.st = 'idle'; P.t = 0; }
    } else if (P.st === 'jatk') {
      attackHits(S, P, H.reach - 4, P.power * JUMP_ATK.dmg, JUMP_ATK.kb, true, true);
      if (P.t > 0.7 || (P.z <= 0 && P.t > 0.1)) { P.st = 'idle'; P.t = 0; }
    } else if (P.st === 'spec') {
      if (P.sk === 'whirl') { P.tick -= dt; if (P.tick <= 0) { P.tick = 0.2; whirlHit(S, P); } }
      else if (P.sk === 'cart') attackHits(S, P, 70, 26 * P.power, 380, true, true);
      else if (P.sk === 'bounce' && !P.landed && P.t > 0.78) { P.landed = true; bounceLand(S, P); }
      if (P.st === 'spec' && P.t >= SPECIALS[P.sk]) { P.st = 'idle'; P.t = 0; }
    }
  }
}

/* ================= the world for the crew =================
   The host sends a snapshot about 20 times a second; a crew member's device draws the world from the last two (a
   little in the past, smoothly) and moves its own hero itself. */
const r1 = (v) => Math.round(v * 10) / 10;
function snapshot(S) {
  const B = S.boss, G = S.gate;
  const drums = (o) => o.drums.map((d) => [r1(d.x), r1(d.y), d.text, d.ok ? 1 : 0, d.bad ? 1 : 0, d.lock > 0 ? 1 : 0]);
  return {
    cam: r1(S.cam), st: S.state, bi: S.bi, cp: S.cp, lk: S.lock ? S.lock.k : '', go: S.go ? 1 : 0, h: S.hearts, sc: S.score, sh: r1(S.shake), t: r1(S.t),
    P: S.players.map((p) => [p.id, r1(p.x), r1(p.y), r1(p.z), p.face, p.st, r1(p.t), p.combo, p.hp, p.max, r1(p.energy), p.sk, r1(p.koT), r1(p.rev), Math.round(p.walk), p.inv > 0 ? 1 : 0]),
    Z: S.zs.map((z) => [z.id, z.k, r1(z.x), r1(z.y), r1(z.z), z.face, z.st, r1(z.t), z.hp, z.max, z.armor > 0 ? 1 : 0, z.shieldOn ? 1 : 0, z.hit > 0 ? 1 : 0, z.minion ? 1 : 0]),
    B: B ? [B.id, B.b, r1(B.x), r1(B.y), r1(B.z), B.face, B.st, r1(B.t), B.hp, B.max, B.shield ? 1 : 0, B.pose, r1(B.poseT), B.hit > 0 ? 1 : 0, B.hide > 0 ? 1 : 0, B.daze > 0 ? 1 : 0, B.charge && B.charge.t > 0 ? 1 : 0, B.ph, B.hint ? 1 : 0, B.wrongs] : null,
    BQ: B && B.shield ? { q: B.q, d: drums(B) } : null,
    G: G ? { x: G.x, o: G.open ? 1 : 0, ot: r1(G.openT), q: G.q, hint: G.hint ? 1 : 0, w: G.wrongs, d: drums(G) } : null,
    sh2: S.shots.map((s) => [s.id, s.k, r1(s.x), r1(s.y), r1(s.z), s.vx > 0 ? 1 : -1, r1(s.spin || 0)]),
    k: S.picks.map((k) => [k.id, k.k, r1(k.x), r1(k.y), r1(k.z)]),
    pr: S.props.map((p) => [p.id, p.k, p.x, p.y, p.hp, p.max, p.hit > 0 ? 1 : 0]),
    m: S.marks.map((m) => [m.k, r1(m.x || 0), r1(m.y), r1(m.r || m.w || 0), r1(m.d || 0), r1(m.t), r1(m.dur || 0), r1(m.beam || 0), r1(m.wind || 0)])
  };
}
function unsnap(o) {
  const drums = (d) => d.map((a) => ({ x: a[0], y: a[1], text: a[2], ok: !!a[3], bad: !!a[4], lock: a[5] ? 1 : 0 }));
  const out = {
    cam: o.cam, state: o.st, bi: o.bi, cp: o.cp, lockK: o.lk, go: !!o.go, hearts: o.h, score: o.sc, shake: o.sh, t: o.t,
    players: o.P.map((a) => ({ id: a[0], x: a[1], y: a[2], z: a[3], face: a[4], st: a[5], t: a[6], combo: a[7], hp: a[8], max: a[9], energy: a[10], sk: a[11], koT: a[12], rev: a[13], walk: a[14], inv: a[15] })),
    zs: o.Z.map((a) => ({ id: a[0], k: a[1], x: a[2], y: a[3], z: a[4], face: a[5], st: a[6], t: a[7], hp: a[8], max: a[9], armor: a[10], shieldOn: !!a[11], hit: a[12] ? 0.1 : 0, minion: !!a[13] })),
    boss: o.B ? { id: o.B[0], b: o.B[1], x: o.B[2], y: o.B[3], z: o.B[4], face: o.B[5], st: o.B[6], t: o.B[7], hp: o.B[8], max: o.B[9], shield: !!o.B[10], pose: o.B[11], poseT: o.B[12], hit: o.B[13] ? 0.1 : 0, hide: o.B[14], daze: o.B[15], charging: !!o.B[16], ph: o.B[17], hint: !!o.B[18], wrongs: o.B[19], dead: o.B[6] === 'dying', drums: [], q: null, lockAll: 0 } : null,
    gate: o.G ? { x: o.G.x, open: !!o.G.o, openT: o.G.ot, q: o.G.q, hint: !!o.G.hint, wrongs: o.G.w, drums: drums(o.G.d), lockAll: 0 } : null,
    shots: o.sh2.map((a) => ({ id: a[0], k: a[1], x: a[2], y: a[3], z: a[4], vx: a[5], spin: a[6] })),
    picks: o.k.map((a) => ({ id: a[0], k: a[1], x: a[2], y: a[3], z: a[4] })),
    props: o.pr.map((a) => ({ id: a[0], k: a[1], x: a[2], y: a[3], hp: a[4], max: a[5], hit: a[6] ? 0.1 : 0 })),
    marks: o.m.map((a) => ({ k: a[0], x: a[1], y: a[2], r: a[3], w: a[3], d: a[4], t: a[5], dur: a[6], beam: a[7], wind: a[8] }))
  };
  if (out.boss && o.BQ) { out.boss.q = o.BQ.q; out.boss.drums = drums(o.BQ.d); }
  return out;
}

/* ================= a test pilot =================
   Plays a hero like a child: walks to the side of the nearest zombie and hits it, jumps at bats, uses the special in a
   crowd, eats when hurt, helps a knocked-out teammate up, dodges the boss's warnings now and then, and smashes the drum
   it believes is right (right with chance `right`). Used by tools/sim.js and the page's autopilot. */
function bot(S, id, prof) {
  prof = Object.assign({ right: 0.85, react: 0.22, dodge: 0.7, think: 1.5, special: true }, prof || {});
  const me = S.players.find((p) => p.id === id);
  if (!me || !alive(me) || S.state !== 'play') return {};
  if (!me.botMem) { let h = 7; for (const c of String(id)) h = h * 31 + c.charCodeAt(0); me.botMem = { look: 0, rng: mulberry(h + S.n * 977), out: { mx: 0, my: 0 }, pick: -1, q: '', thinkT: 0, dodgeRoll: 1, prop: 0, propT: 0, skip: [] }; }
  const B = me.botMem, R = B.rng;
  B.look -= 1 / 60;
  if (B.look > 0) return { mx: B.out.mx, my: B.out.my, atk: B.out.hold };
  B.look = prof.react * (0.6 + R() * 0.8);
  const out = { mx: 0, my: 0 };
  const keep = (o) => { B.out = { mx: o.mx, my: o.my, hold: !!o.atk && R() < 0.5 }; return o; };
  const go = (x, y, near) => { const dx = x - me.x, dy = y - me.y; out.mx = Math.abs(dx) > (near || 8) ? clamp(dx / 40, -1, 1) : 0; out.my = Math.abs(dy) > 5 ? clamp(dy / 20, -1, 1) : 0; };
  // dodge a boss's warning (a careful child sees most of them)
  B.dodgeRoll = R();
  if (B.dodgeRoll < prof.dodge) for (const m of S.marks) {
    if (m.k === 'line' && Math.abs(me.y - m.y) < 34 && m.t < m.dur + (m.beam || 0)) { out.my = me.y > DEPTH / 2 ? -1 : 1; out.mx = 0; if (m.beam && m.t > m.dur - 0.25) out.jump = true; return keep(out); }
    if ((m.k === 'aim' || m.k === 'zone') && Math.abs(me.x - m.x) < (m.k === 'aim' ? m.r : m.w * 0.5) + 14 && Math.abs(me.y - m.y) < (m.k === 'aim' ? m.r * 0.5 : m.d * 0.5) + 10) { out.mx = me.x > m.x ? 1 : -1; out.my = me.y > m.y ? 0.6 : -0.6; return keep(out); }
    if (m.k === 'ring' && m.t >= m.wind && Math.abs(Math.hypot(me.x - m.x, (me.y - m.y) * 2.2) - m.r) < 70 && me.z <= 0) out.jump = true;
  }
  // a teammate down: go and help
  const down = S.players.find((p) => p !== me && p.st === 'ko');
  if (down && S.zs.filter((z) => !z.dead && Math.abs(z.x - down.x) < 120).length < 3) { go(down.x + 24, down.y, 10); return keep(out); }
  // hungry: food first
  if (me.hp < me.max * 0.45) { const [lo0, hi0] = bounds(S), f = S.picks.filter((k) => (k.k === 'banhmi' || k.k === 'pho') && k.x > lo0 - 20 && k.x < hi0 + 20).sort((a, b) => Math.abs(a.x - me.x) - Math.abs(b.x - me.x))[0]; if (f) { go(f.x, f.y, 6); return keep(out); } }
  // a question: pick a drum (once per question and wrong answer) and smash it
  const owner = asking(S);
  if (owner) {
    const key = (owner.q && owner.q.text) + ':' + owner.drums.filter((d) => d.bad).length;
    if (B.q !== key) {
      B.q = key; B.thinkT = prof.think * (0.6 + R() * 0.8);
      const ok = owner.drums.findIndex((d) => d.ok), wrong = owner.drums.map((d, i) => i).filter((i) => i !== ok && !owner.drums[i].bad);
      B.pick = R() < prof.right || !wrong.length || owner.hint ? ok : wrong[Math.floor(R() * wrong.length)];
    }
    B.thinkT -= prof.react;
    const d = owner.drums[B.pick], near = S.zs.filter((z) => !z.dead && z.st !== 'dying' && Math.abs(z.x - me.x) < 100 && Math.abs(z.y - me.y) < 40).length;
    if (B.thinkT <= 0 && d && !d.bad && near < 2) {
      go(d.x - 46, d.y, 6);
      if (Math.abs(me.x - (d.x - 46)) < 12 && Math.abs(me.y - d.y) < 9 && d.lock <= 0) { out.mx = 0.3; out.atk = true; }
      return keep(out);
    }
  }
  // fight: the nearest zombie (or the boss), from the side
  const foes = S.zs.filter((z) => !z.dead && z.st !== 'dying' && z.x > S.cam - 60 && z.x < S.cam + VIEW + 60);
  const Bo = S.boss && !S.boss.dead && !S.boss.shield && S.boss.st === 'fight' && !(S.boss.hide > 0) ? S.boss : null;
  foes.sort((a, b) => (Math.abs(a.x - me.x) + Math.abs(a.y - me.y) * 2) - (Math.abs(b.x - me.x) + Math.abs(b.y - me.y) * 2));
  let T = foes[0] || null;
  if (Bo && (!T || (Math.abs(Bo.x - me.x) < Math.abs(T.x - me.x) && R() < 0.7))) T = Bo;
  if (!T) {
    if (owner) { go(owner.drums[0].x - 120, 70, 20); return keep(out); }
    // nothing to fight: crates, then on along the street
    // (from whichever side there is room to stand; a crate chased for long is left alone)
    const pr = S.props.filter((p) => p.x > S.cam && p.x < S.cam + VIEW - 40 && B.skip.indexOf(p.id) < 0).sort((a, b) => Math.abs(a.x - me.x) - Math.abs(b.x - me.x))[0];
    if (pr && pr.id !== B.prop) { B.prop = pr.id; B.propT = 0; }
    if (pr) B.propT += prof.react;
    if (pr && B.propT > 8) B.skip.push(pr.id);
    else if (pr) {
      const [lo] = bounds(S), sd = pr.x - 52 < lo + 6 ? 1 : -1, sx = pr.x + sd * 52;
      go(sx, pr.y, 6);
      if (Math.abs(me.x - sx) < 12 && Math.abs(me.y - pr.y) < 10) { out.mx = -sd * 0.3; out.atk = true; }
    }
    else { const nk = S.picks.find((k) => k.k === 'coin' && Math.abs(k.x - me.x) < 200); if (nk) go(nk.x, nk.y, 6); else { out.mx = 1; out.my = (40 + me.slot * 25 - me.y) / 40; } }
    return keep(out);
  }
  const isBoss = T === Bo, w = isBoss ? BOSSES[Bo.b].w : ZOMBIES[T.k].w, fly = isBoss ? BOSSES[Bo.b].fly : ZOMBIES[T.k].fly;
  const side = me.x < T.x ? -1 : 1, reach = HEROES[me.hero].reach;
  const wantX = T.x + side * (reach * 0.55 + w * 0.4);
  go(wantX, T.y, 10);
  if (Math.abs(me.x - wantX) < 28 && Math.abs(me.y - T.y) < 16) {
    if (me.face !== -side) out.mx = -side * 0.3;
    if (fly && T.z > 40) { if (me.z <= 0) out.jump = true; else out.atk = true; }
    else out.atk = R() < 0.92;
  }
  const crowd = foes.filter((z) => Math.abs(z.x - me.x) < 150 && Math.abs(z.y - me.y) < 56).length;
  if (prof.special && me.energy >= 1 && (crowd >= 3 || (isBoss && R() < 0.25) || me.energy >= 2.6)) out.spec = true;
  return keep(out);
}

root.FF = { VIEW: VIEW, DEPTH: DEPTH, HEARTS: HEARTS, HEROES: HEROES, HERO_ORDER: HERO_ORDER, ZOMBIES: ZOMBIES, ZOMBIE_ORDER: ZOMBIE_ORDER, BOSSES: BOSSES, BOSS_ORDER: BOSS_ORDER,
  SPECIALS: SPECIALS, heroLevel: heroLevel, start: start, step: step, addPlayer: addPlayer, removePlayer: removePlayer, playerStep: playerStep, remote: remote, act: act,
  feel: feel, snapshot: snapshot, unsnap: unsnap, bot: bot, bounds: bounds, mulberry: mulberry, alive: alive, asking: asking, stars: stars, clamp: clamp };
})(typeof window !== 'undefined' ? window : globalThis);
