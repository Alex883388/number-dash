// Castle Crew's rounds 1 to 100 (run from the repo root): node games/castle/tools/genrounds.js
// Writes content/rounds.json. Every map plays the same rounds (a map's difficulty is its roads), like a tower defence.
// Each round is a few groups of zombies: { z: kind, n: how many, every: seconds apart, after: seconds before the first,
// gate: 'cycle' (each gate in turn) }. A new kind of zombie arrives every few rounds (gently, with a note), big ones
// come more and more, and bosses arrive on rounds 20, 40, 60, 80 and 100 (and on 50, 70, 90 and 95 too). The engine
// makes zombies tougher after round 30 and faster after round 80; after round 100 it makes up freeplay rounds itself.
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', 'content', 'rounds.json');

// when each kind first comes
const INTRO = { walker: 1, runner: 4, brute: 8, knight: 11, spitter: 14, bomber: 16, shadow: 18, ghost: 22, frosty: 24, blaze: 26, digger: 28, blob: 30, shield: 32, shaman: 34, bat: 36, mummy: 38, skeleton: 43, giant: 46 };
const NOTE = {
  runner: 'Runners! They are fast.', brute: 'A brute: big and tough.', knight: 'Knights wear armour: arrows bounce off. Use cannons, fire or magic.',
  spitter: 'Spitters spit slime that jams towers.', bomber: 'Bombers blow up when they fall: towers close by get jammed.',
  shadow: 'Shadow zombies! Most towers cannot see them: get a Ninja Dojo, or upgrade for shadow sight.',
  ghost: 'Ghosts float straight over everything. Magic and frost hurt them.', frosty: 'Frosties: frost does nothing, fire melts them.',
  blaze: 'Blazes: fire does nothing, frost puts them out.', digger: 'Diggers tunnel under the road and pop up near the castle.',
  blob: 'Blobs split into three little blobs.', shield: 'Shield bearers block shots from the front. Bombs and magic go round.',
  shaman: 'Shamans heal the zombies near them. Get them first!', bat: 'Bats: tiny, fast fliers.',
  mummy: 'Mummies heal themselves. Burn them!', skeleton: 'Skeletons get up again once. Bombs break bones.', giant: 'A giant! It stomps towers still.'
};
const BOSS = {
  20: ['king', 'The Zombie King is coming!'], 40: ['witch', 'The Swamp Witch flies in!'], 50: ['king', 'Two kings this time.', 2], 60: ['colossus', 'The Colossus!'],
  70: ['witch', 'Two witches!', 2], 80: ['dragon', 'The Bone Dragon!'], 90: ['colossus', 'The Colossus is back, angrier!'], 95: ['dragon', 'The Bone Dragon returns!'], 100: ['overlord', 'The Zombie Overlord. The last round!']
};
const MEDIUM = ['knight', 'spitter', 'bomber', 'shadow', 'ghost', 'frosty', 'blaze', 'digger', 'blob', 'shield', 'shaman', 'skeleton'];
const HEAVY = ['brute', 'mummy', 'giant'];

// a seeded random number for round r
let seed = 1;
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (list) => list[Math.floor(rand() * list.length)];
const has = (k, r) => INTRO[k] <= r;

const rounds = [];
for (let r = 1; r <= 100; r++) {
  seed = r * 7919 + 17;
  const groups = [], notes = [];
  const gap = Math.max(0.16, 0.95 - r * 0.0085);
  // the main stream: walkers, with runners (and later bats) in a group of their own, more each round
  const mainN = Math.round(6 + r * 0.7);
  groups.push({ z: 'walker', n: r < 4 ? mainN : Math.ceil(mainN * 0.65), every: gap, after: 0 });
  if (r >= 4 && r !== INTRO.runner) groups.push({ z: r >= 36 && r % 2 === 0 ? 'bat' : 'runner', n: Math.max(2, Math.floor(mainN * (r < 15 ? 0.25 : 0.4))), every: gap * 1.3, after: 3 });
  // the newest kind, gently
  const fresh = Object.keys(INTRO).find((k) => INTRO[k] === r && k !== 'walker');
  if (fresh) {
    notes.push(NOTE[fresh]);
    const n = fresh === 'giant' ? 1 : fresh === 'brute' || fresh === 'mummy' ? 2 : 5;
    groups.push({ z: fresh, n: n, every: fresh === 'giant' ? 4 : 1.4, after: 4 });
  }
  // medium kinds: more groups and more of them as the rounds go on
  const mediums = MEDIUM.filter((k) => has(k, r) && INTRO[k] < r);
  const mGroups = r < 12 ? 0 : r < 30 ? 1 : r < 60 ? 2 : 3;
  for (let j = 0; j < mGroups && mediums.length; j++) {
    const k = j === 0 && r >= 18 && r % 3 === 0 && has('shadow', r) ? 'shadow' : pick(mediums);
    groups.push({ z: k, n: Math.round(r < 30 ? 2 + r * 0.16 + rand() * 3 : 3 + r * 0.22 + rand() * 4), every: Math.max(0.25, gap * 1.6), after: 3 + j * 3 });
  }
  // heavy ones
  if (has('brute', r) && r > INTRO.brute) groups.push({ z: 'brute', n: Math.max(1, Math.round((r - 6) / 7)), every: Math.max(0.8, 3 - r * 0.02), after: 5 });
  if (has('mummy', r) && r > INTRO.mummy && r % 2 === 0) groups.push({ z: 'mummy', n: Math.round((r - 30) / 8), every: 1.6, after: 7 });
  if (has('giant', r) && r > INTRO.giant && r % 4 === 0) groups.push({ z: 'giant', n: Math.max(1, Math.round((r - 40) / 15)), every: 5, after: 9 });
  // every tenth round, a rush; every fifth (not tenth), a crowd of one medium kind
  if (r % 10 === 5 && mediums.length) { const k = pick(r < 30 ? mediums.filter((m) => m !== 'knight') : mediums); groups.push({ z: k, n: Math.round(8 + r * 0.35), every: Math.max(0.2, gap), after: 6 }); notes.push('A crowd of ' + k + 's!'); }
  if (r % 10 === 7 && r > 10) { groups.push({ z: has('bat', r) ? 'bat' : 'runner', n: Math.round(10 + r * 0.5), every: 0.15, after: 8 }); notes.push('A rush!'); }
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
for (const r of [1, 4, 8, 10, 20, 30, 40, 50, 60, 80, 100]) console.log('  ' + r + ': ' + rounds[r - 1].groups.map((g) => g.n + ' ' + g.z).join(', ') + (rounds[r - 1].note ? '  "' + rounds[r - 1].note + '"' : ''));
