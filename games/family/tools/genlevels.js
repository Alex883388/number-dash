// Writes Family Fighters' levels (content/levels.json) from the short plan below, so the waves are easy to retune.
// A plan line is one beat: 'F walker3 runner1 | walker4' is a fight of two waves (a type, then how many come with one
// player; L or R after the number sends them all from that side), 'G' a question gate, 'B' the boss.
// Usage: node games/family/tools/genlevels.js
const fs = require('fs'), path = require('path');

const PLAN = [
  { name: 'Market Morning', place: 'market', boss: 'chef', zombies: ['walker', 'runner'], props: ['stall', 'crate', 'basket'],
    blurb: 'Zombies in the market! Push through the stalls to the noodle shop of the Zombie Chef.',
    beats: ['F walker2 | walker3', 'F walker3 runner1 | walker3 runner1', 'G', 'F walker3 runner2 | walker4', 'G', 'F runner3 walker2 | walker3 runner2', 'B'] },
  { name: 'Old Quarter Rush', place: 'oldquarter', boss: 'scooter', zombies: ['walker', 'runner', 'bucket'], props: ['crate', 'barrel', 'stall'],
    blurb: 'The narrow streets of the Old Quarter in Hà Nội, and the Scooter King who never stops for a red light.',
    beats: ['F walker3 | walker2 bucket1', 'F runner3 bucket1 | walker3 bucket1', 'G', 'F walker3 runner2 | bucket2 runner2', 'G', 'F bucket2 walker3 | runner4 bucket1', 'B'] },
  { name: 'Rice Field Ruckus', place: 'ricefield', boss: 'scarecrow', zombies: ['walker', 'runner', 'bucket', 'bat', 'jumper'], props: ['hay', 'basket', 'crate'],
    blurb: 'Green rice fields as far as you can see, zom-bats in the sky, and the Scarecrow King in the middle of it all.',
    beats: ['F walker3 bat1 | walker2 bat2', 'F jumper1 walker3 | bucket2 bat2', 'G', 'F jumper2 runner2 | walker3 bat3', 'G', 'F bucket2 jumper2 | walker3 runner2 bat2', 'B'] },
  { name: 'School Scramble', place: 'school', boss: 'headmaster', zombies: ['walker', 'runner', 'bucket', 'spitter', 'jumper'], props: ['desk', 'crate', 'basket'],
    blurb: 'The zombies have taken over the school. Run the playground and the corridors to the Zombie Headmaster.',
    beats: ['F walker3 spitter1 | runner3', 'F bucket2 spitter1 | walker3 jumper1', 'G', 'F runner3 spitter2 | bucket2 jumper2', 'G', 'F walker4 spitter1 | bucket3 runner2', 'B'] },
  { name: 'Beach Brawl', place: 'beach', boss: 'crab', zombies: ['walker', 'runner', 'fat', 'bucket', 'bat'], props: ['barrel', 'basket', 'chair'],
    blurb: 'Sun, sand and zombies on the beach at Nha Trang. Something very big is hiding under the sand…',
    beats: ['F walker3 runner1 | fat1 walker2', 'F bat3 runner2 | bucket2 fat1', 'G', 'F fat1 walker3 | runner3 bat2', 'G', 'F fat2 bucket2 | walker3 runner2 bat2', 'B'] },
  { name: 'Hạ Long Bay Boat', place: 'bay', boss: 'pirate', zombies: ['walker', 'spitter', 'bucket', 'bat', 'fat'], props: ['barrel', 'crate', 'basket'],
    blurb: 'A boat trip between the stone islands of Hạ Long Bay, until zombie pirates climb aboard.',
    beats: ['F walker3 spitter1 | bucket2 bat2', 'F spitter2 walker2 | fat1 bucket2', 'G', 'F bat3 spitter1 | walker4 fat1', 'G', 'F bucket3 spitter2 | fat2 walker3', 'G', 'B'] },
  { name: 'Crystal Caves', place: 'cave', boss: 'batqueen', zombies: ['bat', 'jumper', 'shield', 'walker', 'runner'], props: ['crystal', 'barrel', 'crate'],
    blurb: 'Deep in the giant caves of Phong Nha, where the crystals glow and the Bat Queen rules the dark.',
    beats: ['F bat3 walker2 | shield1 walker3', 'F jumper2 bat2 | shield2 runner2', 'G', 'F bat4 jumper1 | walker3 shield2', 'G', 'F shield2 jumper2 | bat3 runner3', 'G', 'B'] },
  { name: 'Sa Pa Snow', place: 'mountain', boss: 'yeti', zombies: ['shield', 'fat', 'jumper', 'walker', 'bucket'], props: ['snowman', 'crate', 'basket'],
    blurb: 'Up the terraced mountains of Sa Pa into the snow, where a very hairy zombie is waiting.',
    beats: ['F walker3 shield1 | fat1 jumper2', 'F bucket3 shield1 | fat2 walker2', 'G', 'F jumper3 shield2 | walker3 bucket2', 'G', 'F fat2 shield2 | jumper2 walker3 bucket1', 'G', 'B'] },
  { name: 'Saigon Rooftops', place: 'rooftop', boss: 'doctor', zombies: ['bloater', 'runner', 'spitter', 'walker', 'bat'], props: ['pot', 'crate', 'barrel'],
    blurb: 'Night over Saigon. Leap the rooftops after Doctor Zom, the zombie who makes the zombies.',
    beats: ['F walker3 bloater1 | runner3 spitter1', 'F bloater2 walker2 | bat3 spitter2', 'G', 'F runner4 bloater1 | walker3 spitter2 bat1', 'G', 'F bloater2 runner3 | spitter2 walker3 bat2', 'G', 'B'] },
  { name: 'The Secret Lab', place: 'lab', boss: 'mega', zombies: ['walker', 'runner', 'bucket', 'fat', 'spitter', 'jumper', 'bat', 'shield', 'bloater'], props: ['canister', 'crate', 'barrel'],
    blurb: 'Under the city: the secret lab where it all began, and the biggest zombie of them all.',
    beats: ['F walker3 runner2 | bucket2 spitter1', 'F fat1 jumper2 bat2 | shield2 bloater1', 'G', 'F runner3 bucket2 spitter1 | fat2 bat3', 'G', 'F shield2 jumper2 bloater1 | walker4 runner2 spitter2', 'G', 'F bucket3 fat1 | bat3 jumper2 shield1', 'B'] }
];

const VIEW = 960, DEPTH = 140;
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ZOMBIES = ['walker', 'runner', 'bucket', 'fat', 'spitter', 'jumper', 'bat', 'shield', 'bloater'];

function build() {
  const levels = PLAN.map((p, i) => {
    const rnd = mulberry(1000 + i * 77);
    const beats = [];
    let x = 420;
    for (const line of p.beats) {
      const k = line[0];
      if (k === 'F') {
        const waves = line.slice(1).split('|').map((w) => w.trim().split(/\s+/).map((tok) => {
          const m = /^([a-z]+)(\d+)([LR]?)$/.exec(tok);
          if (!m || ZOMBIES.indexOf(m[1]) < 0) throw new Error('level ' + (i + 1) + ': bad wave part ' + tok);
          return m[3] ? [m[1], +m[2], m[3] === 'L' ? -1 : 1] : [m[1], +m[2]];
        }));
        beats.push({ k: 'fight', x: x, waves: waves });
        x += 1150;
      } else if (k === 'G') { beats.push({ k: 'gate', x: x - 250 }); x += 650; }
      else if (k === 'B') { beats.push({ k: 'boss', x: x, b: p.boss }); }
      else throw new Error('level ' + (i + 1) + ': unknown beat ' + line);
    }
    const last = beats[beats.length - 1];
    if (last.k !== 'boss') throw new Error('level ' + (i + 1) + ' must end with its boss');
    // things to smash along the way: two or three between each pair of beats, never inside the boss's arena
    const props = [];
    for (let b = 0; b < beats.length - 1; b++) {
      const a = beats[b].x + VIEW * 0.75, z = beats[b + 1].x + VIEW * 0.45, n = 2 + Math.floor(rnd() * 2);
      for (let j = 0; j < n; j++) props.push({ k: p.props[Math.floor(rnd() * p.props.length)], x: Math.round(a + (z - a) * (j + 0.3 + rnd() * 0.4) / n), y: Math.round(12 + rnd() * (DEPTH - 24)) });
    }
    return { id: i + 1, name: p.name, place: p.place, blurb: p.blurb, boss: p.boss, zombies: p.zombies, len: last.x + VIEW, beats: beats, props: props };
  });
  const out = { levels: levels };
  fs.writeFileSync(path.join(__dirname, '..', 'content', 'levels.json'), JSON.stringify(out, null, 1) + '\n');
  for (const L of levels) {
    const n = L.beats.reduce((t, b) => t + (b.k === 'fight' ? b.waves.reduce((u, w) => u + w.reduce((v, p) => v + p[1], 0), 0) : 0), 0);
    console.log('level ' + L.id + ' ' + L.name.padEnd(18) + ' ' + L.len + ' px, ' + L.beats.filter((b) => b.k === 'fight').length + ' fights (' + n + ' zombies alone), ' + L.beats.filter((b) => b.k === 'gate').length + ' gates, boss ' + L.boss + ', ' + L.props.length + ' props');
  }
}
build();
