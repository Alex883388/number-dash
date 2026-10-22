// Castle Crew's rounds 1 to 100 (run from the repo root): node games/castle/tools/genrounds.js
// Writes content/rounds.json. Every map plays the same rounds (a map's difficulty is its roads), like a tower defence.
// Each round is a few groups of zombies: { z: kind, n: how many, every: seconds apart, after: seconds before the first,
// gate: 'cycle' (each gate in turn) }. A new kind of zombie arrives every few rounds (gently, with a note that says
// what beats it), big ones come more and more, and bosses arrive on rounds 20, 40, 60, 80 and 100 (and on 50, 70, 90
// and 95 too). Some rounds are air raids (fliers only towers that hit fliers can reach) or element waves (zombies one
// element beats). From round 40 rounds send fewer zombies, further apart; the engine makes each one tougher (elites
// from round 50, champions from round 80) and worth more coins, so the last rounds stay smooth on an iPad. The engine
// makes zombies tougher after round 30 and faster after round 80; after round 100 it makes up freeplay rounds itself.
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', 'content', 'rounds.json');

// when each kind first comes
const INTRO = { walker: 1, runner: 4, brute: 8, knight: 11, spitter: 14, bomber: 16, shadow: 18, ghost: 22, frosty: 24, balloon: 25, blaze: 26, digger: 28, blob: 30, shield: 32, shaman: 34, bat: 36, mummy: 38, skeleton: 42, gargoyle: 44, giant: 46, vulture: 48 };
const NOTE = {
  runner: 'Runners! They are fast.', brute: 'A brute: big and tough. Wind cannot move it.',
  knight: 'Knights wear armour: arrows bounce off. Bombs and lightning get through.',
  spitter: 'Spitters spit slime that jams towers. Water washes them away.', bomber: 'Bombers blow up when they fall: towers close by get jammed.',
  shadow: 'Shadow zombies! Most towers cannot see them: build a Ninja Dojo or a Lantern, or upgrade for shadow sight.',
  ghost: 'Ghosts fly! Cannons, mortars and spikes cannot reach fliers. Light, wind and rockets are best.',
  frosty: 'Frosties: ice does nothing, fire melts them.',
  balloon: 'Balloon Brutes float in. Pop the balloons and a brute drops onto the road!',
  blaze: 'Blazes: fire does nothing. Water and ice put them out.', digger: 'Diggers tunnel under the road. A Geyser flushes them out.',
  blob: 'Blobs split into three little blobs. Poison does nothing to slime.', shield: 'Shield bearers block shots from the front. Bombs, lightning and light go round.',
  shaman: 'Shamans heal the zombies near them, but poisoned zombies cannot heal!', bat: 'Bats: tiny, fast fliers. Wind and lightning knock them out.',
  mummy: 'Mummies heal themselves. Burn them, or poison them!', skeleton: 'Skeletons get up again once. Bombs and light break bones.',
  gargoyle: 'Gargoyles: flying stone. Arrows bounce off; rockets and lightning crack them.', giant: 'A giant! It stomps towers still.',
  vulture: 'Vultures swoop in fast from the sky. Wind and lightning bring them down.'
};
const BOSS = {
  20: ['king', 'The Zombie King is coming!'], 40: ['witch', 'The Swamp Witch flies in! Only towers that hit fliers can stop her: rockets, lightning, light and wind.'], 50: ['king', 'Two kings this time.', 2], 60: ['colossus', 'The Colossus!'],
  70: ['witch', 'Two witches!', 2], 80: ['dragon', 'The Bone Dragon flies in! Fire and poison do nothing to it: rockets, ice, light and lightning.'], 90: ['colossus', 'The Colossus is back, angrier!'], 95: ['dragon', 'The Bone Dragon returns!'], 100: ['overlord', 'The Zombie Overlord. The last round!']
};
const MEDIUM = ['knight', 'spitter', 'bomber', 'shadow', 'ghost', 'frosty', 'balloon', 'blaze', 'digger', 'blob', 'shield', 'shaman', 'skeleton', 'gargoyle', 'vulture'];
const AIR = ['ghost', 'balloon', 'bat', 'gargoyle', 'vulture'];
// element waves: zombies that one element (or two) beats, with a hint
const WAVES = [
  { name: 'A fire wave', z: ['blaze', 'bomber'], hint: 'water and ice put them out' },
  { name: 'An ice wave', z: ['frosty', 'blob'], hint: 'fire melts them' },
  { name: 'An armour wave', z: ['knight', 'shield'], hint: 'bombs and lightning get through' },
  { name: 'A spirit wave', z: ['shadow', 'ghost', 'skeleton'], hint: 'light hurts them most' },
  { name: 'A healing wave', z: ['shaman', 'mummy'], hint: 'poison stops them healing' },
  { name: 'A stone wave', z: ['gargoyle', 'knight'], hint: 'rockets, bombs and lightning crack stone' }
];
// fewer zombies from round 40, further apart (each one is tougher: see the engine's hpRound and elites)
const cnt = (r) => (r <= 40 ? 1 : r < 50 ? 1 - (r - 40) * 0.02 : r < 80 ? 0.67 - (r - 50) * 0.002 : 0.5 - (r - 80) * 0.0025);

// a seeded random number for round r
let seed = 1;
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (list) => list[Math.floor(rand() * list.length)];
const has = (k, r) => INTRO[k] <= r;

const rounds = [];
for (let r = 1; r <= 100; r++) {
  seed = r * 7919 + 17;
  const groups = [], notes = [], c = cnt(r);
  // n zombies of kind z, every s seconds apart: fewer and further apart in the late rounds
  const add = (z, n, every, after) => groups.push({ z: z, n: Math.max(1, Math.round(n * c)), every: Math.round(every / c * 100) / 100, after: after });
  const gap = Math.max(0.16, 0.95 - r * 0.0085);
  // the main stream: walkers, with runners (and later bats or vultures) in a group of their own, more each round
  const mainN = Math.round(6 + r * 0.7);
  add('walker', r < 4 ? mainN : Math.ceil(mainN * 0.65), gap, 0);
  if (r >= 4 && r !== INTRO.runner) add(r >= 36 && r % 2 === 0 ? (r >= 52 && r % 4 === 0 ? 'vulture' : 'bat') : 'runner', Math.max(2, Math.floor(mainN * (r < 15 ? 0.25 : 0.4))), gap * 1.3, 3);
  // the newest kind, gently
  const fresh = Object.keys(INTRO).find((k) => INTRO[k] === r && k !== 'walker');
  if (fresh) {
    notes.push(NOTE[fresh]);
    const n = fresh === 'giant' ? 1 : fresh === 'brute' || fresh === 'mummy' || fresh === 'balloon' || fresh === 'gargoyle' ? 2 : 5;
    groups.push({ z: fresh, n: n, every: fresh === 'giant' ? 4 : 1.4, after: 4 });
  }
  // medium kinds: more groups and more of them as the rounds go on
  const mediums = MEDIUM.filter((k) => has(k, r) && INTRO[k] < r);
  const mGroups = r < 12 ? 0 : r < 30 ? 1 : r < 60 ? 2 : 3;
  for (let j = 0; j < mGroups && mediums.length; j++) {
    const k = j === 0 && r >= 18 && r % 3 === 0 && has('shadow', r) ? 'shadow' : pick(mediums);
    add(k, r < 30 ? 2 + r * 0.16 + rand() * 3 : 3 + r * 0.22 + rand() * 4, Math.max(0.25, gap * 1.6), 3 + j * 3);
  }
  // heavy ones
  if (has('brute', r) && r > INTRO.brute) add('brute', Math.max(1, Math.round((r - 6) / 7)), Math.max(0.8, 3 - r * 0.02), 5);
  if (has('mummy', r) && r > INTRO.mummy && r % 2 === 0) add('mummy', Math.round((r - 30) / 8), 1.6, 7);
  if (has('giant', r) && r > INTRO.giant && r % 4 === 0) add('giant', Math.max(1, Math.round((r - 40) / 15)), 5, 9);
  // every tenth round: a crowd (5), an air raid (3), a rush (7) and an element wave (9)
  if (r % 10 === 5 && mediums.length) { const k = pick(r < 30 ? mediums.filter((m) => m !== 'knight' && AIR.indexOf(m) < 0) : mediums); add(k, 8 + r * 0.35, Math.max(0.2, gap), 6); notes.push('A crowd of ' + k + 's!'); }
  if (r % 10 === 3 && r > 20) {
    const air = AIR.filter((k) => has(k, r) && INTRO[k] < r);
    add(pick(air), 6 + r * 0.3, Math.max(0.3, gap * 1.2), 4);
    if (air.length > 1) add(pick(air), 4 + r * 0.2, Math.max(0.35, gap * 1.5), 8);
    notes.push('An air raid! Only towers that hit fliers can help: rockets, wind, lightning, light, arrows and bees.');
  }
  if (r % 10 === 7 && r > 10) { add(has('bat', r) ? 'bat' : 'runner', 10 + r * 0.5, 0.15, 8); notes.push('A rush!'); }
  if (r % 10 === 9 && r > 25) {
    const W = WAVES[Math.floor(r / 10) % WAVES.length], kinds = W.z.filter((k) => has(k, r));
    if (kinds.length) { kinds.forEach((k, j) => add(k, (6 + r * 0.25) / kinds.length * 1.4, Math.max(0.3, gap * 1.4), 5 + j * 3)); notes.push(W.name + ': ' + W.hint + '!'); }
  }
  // elites and champions
  if (r === 50) notes.push('From now on zombies come as elites (they glow): fewer, but tougher, and worth more coins.');
  if (r === 80) notes.push('Champion zombies (golden glow): even tougher, worth even more!');
  // bosses, with friends
  if (BOSS[r]) {
    const [z, note, n] = BOSS[r];
    notes.unshift(note);
    groups.push({ z: z, n: n || 1, every: 12, after: 3 });
  }
  rounds.push({ n: r, groups: groups, note: notes.join(' ') || undefined });
}
fs.writeFileSync(out, JSON.stringify({ about: 'Castle Crew rounds 1-100, made by tools/genrounds.js (edit that, not this). groups: z kind, n count (more in a crew), every seconds apart, after seconds before the first; each spawn takes the next gate in turn.', rounds: rounds }, null, 1) + '\n');
let total = 0;
for (const R of rounds) total += R.groups.reduce((a, g) => a + g.n, 0);
console.log('wrote ' + path.relative(process.cwd(), out) + ': ' + rounds.length + ' rounds, ' + total + ' zombies (one player)');
for (const r of [1, 4, 8, 10, 20, 23, 30, 39, 40, 50, 60, 80, 89, 100]) console.log('  ' + r + ': ' + rounds[r - 1].groups.map((g) => g.n + ' ' + g.z).join(', ') + (rounds[r - 1].note ? '  "' + rounds[r - 1].note + '"' : ''));
