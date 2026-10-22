// Checks Family Fighters' world-knowledge questions (content/world-0.json, world-1.json, world-2.json) against
// content/FORMAT.md. Prints every problem and a summary; exits 1 when there are errors.
// Usage: node games/family/tools/check-world.js [--list] [file...]
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'content');
const KINDS = ['geography', 'vietnam', 'science', 'space', 'animals', 'body', 'nature', 'history', 'culture', 'maths'];
// American spellings (errors) and words with a British twin (warnings)
const US_SPELL = ['color', 'colors', 'colored', 'colorful', 'favorite', 'center', 'centers', 'theater', 'mom', 'gray', 'math', 'meter', 'meters',
  'kilometer', 'kilometers', 'centimeter', 'centimeters', 'liter', 'liters', 'airplane', 'airplanes', 'traveled', 'traveling', 'organize', 'realize',
  'recognize', 'neighbor', 'behavior', 'honor', 'humor', 'labor', 'flavor', 'harbor', 'jewelry', 'defense', 'analyze', 'aluminum', 'fiber', 'sulfur', 'mold'];
const US_WORDS = ['soccer', 'vacation', 'apartment', 'elevator', 'candy', 'cookie', 'cookies', 'sidewalk', 'fall', 'fries', 'truck', 'movie', 'movies', 'mall', 'gasoline'];
// words that usually mean the item will not stay true, or is not kind
const RISKY = ['population', 'currently', 'current', 'record', 'richest', 'tallest building', 'champion', 'won the', 'president', 'prime minister', 'war', 'died', 'killed',
  'disaster', 'earthquake', 'flood', 'tsunami', 'bomb', 'gun', 'blood'];
const args = process.argv.slice(2), list = args.includes('--list');
const files = args.filter((a) => !a.startsWith('--'));
const targets = files.length ? files : [0, 1, 2].map((t) => path.join(dir, 'world-' + t + '.json'));
let errors = 0, warnings = 0;
const err = (f, i, m) => { errors++; console.log('ERROR ' + path.basename(f) + (i >= 0 ? ' #' + i : '') + ': ' + m); };
const warn = (f, i, m) => { warnings++; console.log('warn  ' + path.basename(f) + (i >= 0 ? ' #' + i : '') + ': ' + m); };
const words = (s) => s.toLowerCase().match(/[a-z']+/g) || [];
const seenAll = new Map();
for (const f of targets) {
  if (!fs.existsSync(f)) { err(f, -1, 'file not found'); continue; }
  let d;
  try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { err(f, -1, 'not valid JSON: ' + e.message); continue; }
  const m = /world-(\d)\.json$/.exec(f);
  if (m && d.tier !== +m[1]) err(f, -1, 'tier should be ' + m[1]);
  if (!Array.isArray(d.items)) { err(f, -1, 'items is not a list'); continue; }
  if (d.items.length < 280) err(f, -1, 'only ' + d.items.length + ' items (at least 280, aim for 300)');
  const kinds = {}, answers = {}, seen = new Map();
  d.items.forEach((it, i) => {
    if (!it || typeof it !== 'object') { err(f, i, 'not an object'); return; }
    const { q, a, w, k, h } = it;
    for (const key of Object.keys(it)) if (!['q', 'a', 'w', 'k', 'h'].includes(key)) warn(f, i, 'unknown field ' + key);
    if (typeof q !== 'string' || !q.trim()) { err(f, i, 'q missing'); return; }
    if (q.length > 70) err(f, i, 'question is ' + q.length + ' characters (70 at most): ' + q);
    if (!/[?.]$/.test(q)) err(f, i, 'should end with ? or .: ' + q);
    if (!/^[A-Z0-9ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯ'"]/.test(q)) err(f, i, 'should start with a capital letter: ' + q);
    if (/\s{2,}|^\s|\s$/.test(q)) err(f, i, 'extra spaces: "' + q + '"');
    if (typeof a !== 'string' || !a.trim()) { err(f, i, 'a missing'); return; }
    if (a !== a.trim() || a.length > 14) err(f, i, 'answer "' + a + '" is ' + a.length + ' characters (14 at most, no spaces around)');
    if (!Array.isArray(w) || w.length !== 3) { err(f, i, 'w needs exactly three wrong answers'); return; }
    const low = new Set([a.toLowerCase()]);
    for (const x of w) {
      if (typeof x !== 'string' || !x.trim()) { err(f, i, 'empty wrong answer'); continue; }
      if (x !== x.trim() || x.length > 14) err(f, i, 'wrong answer "' + x + '" is ' + x.length + ' characters (14 at most)');
      if (low.has(x.toLowerCase())) err(f, i, 'answer "' + x + '" repeats');
      low.add(x.toLowerCase());
    }
    // numbers with numbers, words with words
    const num = (s) => /^[\d.,%]+$/.test(String(s).trim());
    if (w.some((x) => typeof x === 'string' && num(x) !== num(a))) warn(f, i, 'mixes numbers and words in the answers: ' + [a].concat(w).join(' / '));
    if (!KINDS.includes(k)) err(f, i, 'unknown kind "' + k + '"');
    else kinds[k] = (kinds[k] || 0) + 1;
    if (typeof h !== 'string' || !h.trim()) err(f, i, 'h (the fact) missing');
    else if (h.length > 90) err(f, i, 'fact is ' + h.length + ' characters (90 at most): ' + h);
    const all = [q, a, h || ''].concat(w).join(' ');
    for (const x of words(all)) {
      if (US_SPELL.includes(x)) err(f, i, 'American spelling "' + x + '"');
      else if (US_WORDS.includes(x)) warn(f, i, 'American word "' + x + '" (is the British one better?)');
    }
    const lowAll = all.toLowerCase();
    for (const r of RISKY) if (new RegExp('\\b' + r + '\\b').test(lowAll)) warn(f, i, 'check "' + r + '" (true for good? kind?): ' + q);
    const key = q.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (seen.has(key)) err(f, i, 'same question as #' + seen.get(key) + ': ' + q);
    seen.set(key, i);
    if (seenAll.has(key) && seenAll.get(key) !== f) warn(f, i, 'same question is also in ' + path.basename(seenAll.get(key)) + ': ' + q);
    seenAll.set(key, f);
    answers[a.toLowerCase()] = (answers[a.toLowerCase()] || 0) + 1;
    if (list) console.log(String(i).padStart(3) + ' [' + k + '] ' + q + '  -> ' + a + '   x ' + w.join(' / ') + '   fact: ' + h);
  });
  for (const [x, n] of Object.entries(answers)) {
    if (n > 5) err(f, -1, 'answer "' + x + '" is used ' + n + ' times (3 at most)');
    else if (n > 3) warn(f, -1, 'answer "' + x + '" is used ' + n + ' times (3 at most)');
  }
  const n = d.items.length;
  for (const k of KINDS) if (!kinds[k]) warn(f, -1, 'no "' + k + '" questions');
  if ((kinds.vietnam || 0) < n / 9) warn(f, -1, 'only ' + (kinds.vietnam || 0) + ' vietnam questions (about one in six)');
  for (const [x, c] of Object.entries(kinds)) if (c > n * 0.22) warn(f, -1, 'kind "' + x + '" is ' + Math.round(c / n * 100) + '% of the file (22% at most)');
  console.log(path.basename(f) + ': ' + n + ' items; kinds ' + Object.entries(kinds).sort((p, r) => r[1] - p[1]).map(([x, c]) => x + ' ' + c).join(', '));
}
console.log(errors + ' errors, ' + warnings + ' warnings');
process.exit(errors ? 1 : 0);
