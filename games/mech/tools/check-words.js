// Checks Mech Blaster's missing-word sentences (content/words-0.json, words-1.json, words-2.json) against
// content/FORMAT.md. Prints every problem and a summary; exits 1 when there are errors.
// Usage: node games/mech/tools/check-words.js [--list] [file...]
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'content');
const KINDS = ['verb', 'past', 'agree', 'plural', 'article', 'pronoun', 'prep', 'homophone', 'spell', 'opposite', 'vocab',
  'compare', 'conj', 'modal', 'form', 'collocation', 'idiom'];
// American spellings and words with a British twin: errors (spelling) and warnings (word choice)
const US_SPELL = ['color', 'colors', 'colored', 'colorful', 'favorite', 'favorites', 'center', 'centers', 'theater', 'mom', 'moms',
  'gray', 'math', 'traveled', 'traveling', 'traveler', 'organize', 'organized', 'organizing', 'realize', 'realized', 'recognize',
  'recognized', 'apologize', 'apologized', 'neighbor', 'neighbors', 'behavior', 'honor', 'humor', 'labor', 'flavor', 'flavors',
  'rumor', 'harbor', 'jewelry', 'catalog', 'defense', 'offense', 'analyze', 'aluminum', 'pajamas', 'meter', 'meters', 'liter',
  'liters', 'kilometer', 'kilometers', 'centimeter', 'centimeters', 'colour-ful', 'canceled', 'canceling', 'fueled', 'modeled',
  'labeled', 'leveled', 'signaled', 'practiced', 'jeweler', 'mold', 'plow', 'tire', 'tires', 'curb', 'ax', 'program'];
const US_WORDS = ['soccer', 'vacation', 'vacations', 'apartment', 'elevator', 'candy', 'candies', 'cookie', 'cookies', 'sidewalk',
  'diaper', 'garbage', 'trash', 'zucchini', 'eggplant', 'cellphone', 'flashlight', 'sneakers', 'pants', 'gas', 'fall', 'fries',
  'chips', 'faucet', 'mailman', 'drugstore', 'freshman', 'grade', 'recess', 'kindergarten', 'movie', 'movies', 'truck', 'mall',
  'yard', 'stroller', 'line'];
const args = process.argv.slice(2), list = args.includes('--list');
const files = args.filter((a) => !a.startsWith('--'));
const targets = files.length ? files : [0, 1, 2].map((t) => path.join(dir, 'words-' + t + '.json'));
let errors = 0, warnings = 0;
const err = (f, i, m) => { errors++; console.log('ERROR ' + path.basename(f) + (i >= 0 ? ' #' + i : '') + ': ' + m); };
const warn = (f, i, m) => { warnings++; console.log('warn  ' + path.basename(f) + (i >= 0 ? ' #' + i : '') + ': ' + m); };
const words = (s) => s.toLowerCase().match(/[a-z']+/g) || [];
const vowelSound = (w) => /^[aeio]/i.test(w) || /^(hour|honest|honour|heir|un[^i])/i.test(w);
const seenAll = new Map();
for (const f of targets) {
  if (!fs.existsSync(f)) { err(f, -1, 'file not found'); continue; }
  let d;
  try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { err(f, -1, 'not valid JSON: ' + e.message); continue; }
  const m = /words-(\d)\.json$/.exec(f);
  if (m && d.tier !== +m[1]) err(f, -1, 'tier should be ' + m[1]);
  if (!Array.isArray(d.items)) { err(f, -1, 'items is not a list'); continue; }
  if (d.items.length < 280) err(f, -1, 'only ' + d.items.length + ' items (at least 280, aim for 300)');
  const kinds = {}, answers = {}, seen = new Map(), starts = new Map();
  d.items.forEach((it, i) => {
    if (!it || typeof it !== 'object') { err(f, i, 'not an object'); return; }
    const { s, a, w, k, h } = it;
    for (const key of Object.keys(it)) if (!['s', 'a', 'w', 'k', 'h'].includes(key)) warn(f, i, 'unknown field ' + key);
    if (typeof s !== 'string') { err(f, i, 's missing'); return; }
    const blanks = s.split('___').length - 1;
    if (blanks !== 1) err(f, i, 'needs exactly one ___ (found ' + blanks + '): ' + s);
    if (/____/.test(s)) err(f, i, 'four or more underscores: ' + s);
    if (/[A-Za-z0-9]___|___[A-Za-z0-9]/.test(s)) err(f, i, 'the blank touches a letter: ' + s);
    if (s.length > 60) err(f, i, 'sentence is ' + s.length + ' characters (60 at most): ' + s);
    if (!/^([A-Z]|___|'|"|[0-9])/.test(s)) err(f, i, 'should start with a capital letter: ' + s);
    if (!/[.?!]["']?$/.test(s)) err(f, i, 'should end with . ? or !: ' + s);
    if (/\s{2,}|^\s|\s$/.test(s)) err(f, i, 'extra spaces: "' + s + '"');
    if (typeof a !== 'string' || !a.trim()) { err(f, i, 'a missing'); return; }
    if (a !== a.trim() || a.length > 12) err(f, i, 'answer "' + a + '" is ' + a.length + ' characters (12 at most, no spaces around)');
    if (a.split(' ').length > 2) err(f, i, 'answer "' + a + '" has more than two words');
    if (!Array.isArray(w) || w.length !== 3) { err(f, i, 'w needs exactly three wrong options'); return; }
    const low = new Set([a.toLowerCase()]);
    for (const x of w) {
      if (typeof x !== 'string' || !x.trim()) { err(f, i, 'empty wrong option'); continue; }
      if (x !== x.trim() || x.length > 12) err(f, i, 'wrong option "' + x + '" is ' + x.length + ' characters (12 at most)');
      if (low.has(x.toLowerCase())) err(f, i, 'option "' + x + '" repeats');
      low.add(x.toLowerCase());
    }
    if (s.startsWith('___')) {
      for (const x of [a].concat(w)) if (typeof x === 'string' && !/^[A-Z]/.test(x)) err(f, i, 'the blank starts the sentence, so "' + x + '" needs a capital letter');
    } else {
      const capA = /^[A-Z]/.test(a) && a !== 'I';
      for (const x of w) if (typeof x === 'string' && /^[A-Z]/.test(x) !== capA && x !== 'I' && !/^[A-Z][a-z]+day$/.test(x)) warn(f, i, 'capital letters differ between "' + a + '" and "' + x + '"');
    }
    if (!KINDS.includes(k)) err(f, i, 'unknown kind "' + k + '"');
    else kinds[k] = (kinds[k] || 0) + 1;
    if (typeof h !== 'string' || !h.trim()) err(f, i, 'h (the tip) missing');
    else if (h.length > 70) err(f, i, 'tip is ' + h.length + ' characters (70 at most): ' + h);
    const all = [s, a, h || ''].concat(w).join(' ');
    for (const x of words(all)) {
      if (US_SPELL.includes(x)) err(f, i, 'American spelling "' + x + '"');
      else if (US_WORDS.includes(x)) warn(f, i, 'American word "' + x + '" (is the British one better?)');
    }
    // a/an in front of the blank must suit the answer (article items test exactly that, so they are skipped)
    const before = (s.split('___')[0].trim().split(' ').pop() || '').toLowerCase();
    if (k !== 'article' && before === 'a' && vowelSound(a)) warn(f, i, '"a ___" but the answer "' + a + '" starts with a vowel sound');
    if (k !== 'article' && before === 'an' && !vowelSound(a)) warn(f, i, '"an ___" but the answer "' + a + '" starts with a consonant sound');
    const key = s.toLowerCase().replace(/[^a-z_ ]/g, '').trim();
    if (seen.has(key)) err(f, i, 'same sentence as #' + seen.get(key) + ': ' + s);
    seen.set(key, i);
    if (seenAll.has(key) && seenAll.get(key) !== f) warn(f, i, 'same sentence is also in ' + path.basename(seenAll.get(key)) + ': ' + s);
    seenAll.set(key, f);
    const start = words(s).slice(0, 4).join(' ') + '|' + a.toLowerCase();
    if (starts.has(start)) warn(f, i, 'very like #' + starts.get(start) + ' (same start and answer): ' + s);
    starts.set(start, i);
    answers[a.toLowerCase()] = (answers[a.toLowerCase()] || 0) + 1;
    if (list) console.log(String(i).padStart(3) + ' [' + k + '] ' + s.replace('___', '[' + a + ']') + '   x ' + w.join(' / ') + '   tip: ' + h);
  });
  for (const [x, n] of Object.entries(answers)) {
    if (n > 6) err(f, -1, 'answer "' + x + '" is used ' + n + ' times (4 at most)');
    else if (n > 4) warn(f, -1, 'answer "' + x + '" is used ' + n + ' times (4 at most)');
  }
  const n = d.items.length;
  for (const [x, c] of Object.entries(kinds)) if (c > n * 0.2) warn(f, -1, 'kind "' + x + '" is ' + Math.round(c / n * 100) + '% of the file (20% at most)');
  console.log(path.basename(f) + ': ' + n + ' items; kinds ' + Object.entries(kinds).sort((p, q) => q[1] - p[1]).map(([x, c]) => x + ' ' + c).join(', '));
}
console.log(errors + ' errors, ' + warnings + ' warnings');
process.exit(errors ? 1 : 0);
