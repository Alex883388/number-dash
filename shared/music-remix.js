/* shared/music-remix.js — HATS, COMP, REMIXES, remixOf(): a different remix of a song on every new attempt. Needs clamp.
   Inlined at build time into every game that uses it (see build.js). */
// Every new attempt plays the next remix of the level's song: a new key and chord
// order, another groove and comping style, another lead sound, and a fresh melody.
const HATS = {
  eighths: [[0, 0.5], [2, 0.3], [4, 0.5], [6, 0.3], [8, 0.5], [10, 0.3], [12, 0.5], [14, 0.3]],
  sixteenths: Array.from({ length: 16 }, (_, i) => [i, i % 4 === 0 ? 0.45 : i % 2 ? 0.14 : 0.3]),
  swing: [[0, 0.45], [3, 0.25], [4, 0.45], [7, 0.25], [8, 0.45], [11, 0.25], [12, 0.45], [15, 0.25]],
  soft: [[0, 0.3], [4, 0.2], [8, 0.3], [12, 0.2], [14, 0.15]]
};
const COMP = {
  long: [[0, 1, 5, 16]],
  stabs: [[0, 0.9, 4, 3], [6, 0.6, 3, 2], [10, 0.7, 3, 3], [14, 0.4, 2, 2]],
  offbeat: [[2, 0.75, 4, 2], [6, 0.6, 3, 2], [10, 0.75, 4, 2], [14, 0.5, 3, 2]]
};
const REMIXES = [
  { name: 'Bubble Beat', shift: 2, rot: 1, kick: [0, 3, 8, 10], hats: 'sixteenths', comp: 'stabs', lead: 'marimba', cutoff: 2900 },
  { name: 'Sleepy Swing', shift: -3, rot: 2, kick: [0, 10], hats: 'swing', swing: 0.26, comp: 'long', lead: 'flute', cutoff: 1700 },
  { name: 'Hop Step', shift: 5, rot: 3, kick: [0, 6, 8], hats: 'eighths', comp: 'offbeat', lead: 'bell', cutoff: 2500 },
  { name: 'Moon Walk', shift: -2, rot: 1, kick: [0, 7, 10], ghost: [11, 15], hats: 'sixteenths', comp: 'arp', lead: 'pluck', cutoff: 2100 },
  { name: 'Cloud Bounce', shift: 3, rot: 2, kick: [0, 2, 10], hats: 'eighths', comp: 'stabs', lead: 'flute', cutoff: 2600 },
  { name: 'Starry Glide', shift: -5, rot: 3, kick: [0, 10, 14], hats: 'soft', comp: 'arp', lead: 'bell', cutoff: 2000 },
  { name: 'Sunny Shuffle', shift: 1, rot: 0, kick: [0, 3, 7, 10], hats: 'swing', swing: 0.24, comp: 'offbeat', lead: 'marimba', cutoff: 2800 }
];
function remixOf(s, n) {
  if (!n || !s.drums) return Object.assign({}, s, { name: '', lead: 'pluck', cutoff: 2300, arp: false });
  const r = REMIXES[(n - 1) % REMIXES.length], round = Math.floor((n - 1) / REMIXES.length);
  const len = s.prog.length, sh = r.shift;
  return Object.assign({}, s, {
    name: r.name + (round ? ' ' + (round + 1) : ''),
    prog: s.prog.map((_, i) => s.prog[(i + r.rot) % len].map((m) => m + sh)),
    bass: s.bass.map((_, i) => s.bass[(i + r.rot) % len] + sh),
    scale: s.scale.map((m) => m + sh),
    kick: r.kick, ghost: r.ghost || [], hats: HATS[r.hats],
    keys: COMP[r.comp] || s.keys, arp: r.comp === 'arp',
    bassPat: r.kick.map((k, i) => [k, i ? 0.7 : 1, i % 2 ? 7 : 0, i ? 2 : 5]),
    swing: r.swing || s.swing, lead: r.lead, cutoff: r.cutoff,
    seed: ((s.seed * 7919 + n * 104729) % 2147483646) + 1,
    density: clamp(s.density + (((n * 37) % 5) - 2) * 0.04, 0.35, 0.7)
  });
}
