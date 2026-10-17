/* shared/cube-styles.js — CUBES and FACES: the cube colours and faces players unlock (with Dash stars, right
   answers, or for four colours progress in another game: cubeOpen()).
   Inlined at build time into every game that uses it (see build.js). */
const CUBES = [
  { name: 'Sky', fill: '#5cb8ff', edge: '#3a8fd6', need: 0 },
  { name: 'Mint', fill: '#4fd1a5', edge: '#2fa47e', need: 0 },
  { name: 'Sunny', fill: '#ffc94d', edge: '#df9f22', need: 0 },
  { name: 'Lilac', fill: '#a98bff', edge: '#7f63e0', need: 0 },
  { name: 'Bubblegum', fill: '#ff96cb', edge: '#e066a3', need: 3 },
  { name: 'Tangerine', fill: '#ffa64d', edge: '#e08028', need: 8 },
  { name: 'Ocean', fill: '#3d8bff', edge: '#2766cc', need: 15 },
  { name: 'Rainbow', fill: 'rainbow', edge: '#7f63e0', need: 24 },
  // earned in the other games: via = the game, n = how much, how = what to do (shown while locked)
  { name: 'Coral', fill: '#ff7a6b', edge: '#d9534a', need: 0, via: 'pair', n: 5, icon: '🃏', how: 'Clear 5 boards in Pair Up' },
  { name: 'Forest', fill: '#4caf50', edge: '#2e7d32', need: 0, via: 'spell', n: 30, icon: '✏️', how: 'Spell 30 words in Spell It' },
  { name: 'Galaxy', fill: '#4b3cb0', edge: '#2c2275', need: 0, via: 'pop', n: 12, icon: '🫧', how: 'Get 12 stars in Number Pop' },
  { name: 'Scholar', fill: '#2b3a67', edge: '#ffc94d', need: 0, via: 'quest', n: 1, icon: '🎓', how: 'Pass a stage test in English Quest' }
];
// progress in another game, read from its own records
function crossProgress(via) {
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
  let n = 0;
  if (via === 'pair') return read('pair-up.v1').wins || 0;
  if (via === 'spell') { const r = read('spell-it.v1'); return Array.isArray(r.learned) ? r.learned.length : 0; }
  if (via === 'pop') { const w = read('number-pop.v1').worlds || {}; for (const k in w) n += (w[k] && w[k].stars) || 0; return n; }
  if (via === 'quest') { const t = read('english-quest.v1').tests || {}; for (const k in t) if (t[k] && t[k].passed) n++; return n; }
  return 0;
}
// is this colour open: Dash stars for the first eight, the other game's progress for the rest
function cubeOpen(c, stars) { return c.via ? crossProgress(c.via) >= c.n : stars >= c.need; }
const FACES = [
  { id: 'happy', name: 'Happy', need: 0 }, { id: 'wink', name: 'Wink', need: 10 }, { id: 'cool', name: 'Cool', need: 25 },
  { id: 'cat', name: 'Kitty', need: 50 }, { id: 'robot', name: 'Robot', need: 100 }
];
