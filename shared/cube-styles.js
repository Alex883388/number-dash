/* shared/cube-styles.js — CUBES and FACES: the cube colours and faces players unlock.
   Inlined at build time into every game that uses it (see build.js). */
const CUBES = [
  { name: 'Sky', fill: '#5cb8ff', edge: '#3a8fd6', need: 0 },
  { name: 'Mint', fill: '#4fd1a5', edge: '#2fa47e', need: 0 },
  { name: 'Sunny', fill: '#ffc94d', edge: '#df9f22', need: 0 },
  { name: 'Lilac', fill: '#a98bff', edge: '#7f63e0', need: 0 },
  { name: 'Bubblegum', fill: '#ff96cb', edge: '#e066a3', need: 3 },
  { name: 'Tangerine', fill: '#ffa64d', edge: '#e08028', need: 8 },
  { name: 'Ocean', fill: '#3d8bff', edge: '#2766cc', need: 15 },
  { name: 'Rainbow', fill: 'rainbow', edge: '#7f63e0', need: 24 }
];
const FACES = [
  { id: 'happy', name: 'Happy', need: 0 }, { id: 'wink', name: 'Wink', need: 10 }, { id: 'cool', name: 'Cool', need: 25 },
  { id: 'cat', name: 'Kitty', need: 50 }, { id: 'robot', name: 'Robot', need: 100 }
];
