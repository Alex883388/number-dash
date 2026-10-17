// Checks English Quest content files against content/FORMAT.md.
// Usage: node games/quest/tools/check-content.js [stage numbers...]   (no numbers = every stage file)
// Prints errors (must be fixed) and warnings (read them), and exits with 1 when there are errors.
const fs = require('fs'), path = require('path');
const DIR = process.env.QUEST_CONTENT || path.join(__dirname, '..', 'content');
const STAGES = [
  null,
  { id: 'starter', read: [25, 60], opts: [3, 3], sent: [4, 9], extra: [0, 5], pics: 2 / 3 },
  { id: 'mover', read: [40, 90], opts: [3, 3], sent: [4, 9], extra: [0, 5], pics: 2 / 3 },
  { id: 'flyer', read: [70, 130], opts: [3, 4], sent: [5, 12], extra: [0, 5], pics: 0 },
  { id: 'explorer', read: [120, 190], opts: [4, 4], sent: [5, 12], extra: [4, 8], pics: 0, tfng: 2 },
  { id: 'achiever', read: [170, 250], opts: [4, 4], sent: [7, 16], extra: [6, 12], pics: 0, tfng: 2, kinds: 4 },
  { id: 'expert', read: [220, 320], opts: [4, 4], sent: [7, 16], extra: [6, 12], pics: 0, tfng: 2, kinds: 4 },
  { id: 'band8', read: [250, 380], opts: [4, 4], sent: [7, 16], extra: [6, 12], pics: 0, tfng: 2, kinds: 4 }
];
const POS = new Set(['noun', 'verb', 'adj', 'adv', 'prep', 'phrase', 'other']);
const KINDS = new Set(['collocation', 'linking', 'paraphrase', 'register', 'wordform', 'phrasal', 'idiom', 'preposition', 'mainidea', 'cohesion']);
const CURLY = /[‘’“”]/;
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const gaps = (s) => (s.match(/___/g) || []).length;

let errors = 0, warnings = 0;
const seenWords = new Map();   // word -> stage, across files
function checkStage(n) {
  const st = STAGES[n], file = path.join(DIR, 'stage-' + n + '.json');
  const err = (where, msg) => { errors++; console.log('  ERROR   stage ' + n + ' ' + where + ': ' + msg); };
  const warn = (where, msg) => { warnings++; console.log('  warning stage ' + n + ' ' + where + ': ' + msg); };
  if (!fs.existsSync(file)) { console.log('stage ' + n + ': no file yet'); return; }
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { err('file', 'not valid JSON: ' + e.message); return; }
  if (data.stage !== n) err('file', '"stage" must be ' + n);
  if (!Array.isArray(data.units) || data.units.length !== 5) { err('file', 'needs exactly 5 units'); return; }
  const stageWords = new Set();
  const opts = (where, o, a, lo, hi) => {
    if (!Array.isArray(o) || o.length < lo || o.length > hi) { err(where, 'needs ' + (lo === hi ? lo : lo + '–' + hi) + ' options, has ' + (o ? o.length : 0)); return; }
    if (o.some((x) => typeof x !== 'string' || !x.trim())) err(where, 'empty option');
    if (new Set(o.map((x) => String(x).trim().toLowerCase())).size !== o.length) err(where, 'two options are the same');
    if (!Number.isInteger(a) || a < 0 || a >= o.length) err(where, 'answer index "a" out of range');
    if (o.some((x) => CURLY.test(x))) err(where, 'curly quotes in an option (use straight quotes)');
  };
  data.units.forEach((u, ui) => {
    const U = (u && u.id) || 'unit ' + (ui + 1);
    if (u.id !== st.id + '-' + (ui + 1)) err(U, 'id must be "' + st.id + '-' + (ui + 1) + '"');
    if (!u.title || u.title.length > 32) err(U, 'title missing or longer than 32 characters');
    if (!u.emoji) err(U, 'emoji missing');
    // words
    if (!Array.isArray(u.words) || u.words.length < 12 || u.words.length > 24) err(U, 'needs 12–24 words, has ' + (u.words ? u.words.length : 0));
    let pics = 0;
    (u.words || []).forEach((w, i) => {
      const W = U + ' word ' + (i + 1) + ' "' + (w && w.w) + '"';
      if (!w || typeof w.w !== 'string' || !/^[a-z][a-z' -]*[a-z]$/.test(w.w)) { err(W, 'w must be lower case letters (spaces, hyphens, apostrophes inside are fine)'); return; }
      if (stageWords.has(w.w)) err(W, 'appears twice in this stage');
      stageWords.add(w.w);
      if (seenWords.has(w.w) && seenWords.get(w.w) !== n) warn(W, 'also taught in stage ' + seenWords.get(w.w));
      else seenWords.set(w.w, n);
      if (!w.def || w.def.length < 6 || w.def.length > 110) err(W, 'def missing or not 6–110 characters');
      else if (new RegExp('\\b' + w.w.replace(/[-']/g, '.') + '\\b', 'i').test(w.def)) warn(W, 'def contains the word itself');
      if (!w.ex || gaps(w.ex) !== 1) err(W, 'ex needs exactly one ___');
      else if (w.ex.length > 130) err(W, 'ex longer than 130 characters');
      if (!POS.has(w.pos)) err(W, 'pos must be one of ' + [...POS].join(', '));
      if (w.pic) pics++;
      if (n < 4 && (w.syn || w.ant || w.forms)) warn(W, 'syn / ant / forms are used from Explorer (stage 4) up');
      for (const k of ['syn', 'ant']) if (w[k] !== undefined && (!Array.isArray(w[k]) || w[k].some((x) => typeof x !== 'string' || !x))) err(W, k + ' must be an array of words');
      if (CURLY.test(w.w + w.ex)) err(W, 'curly quotes (use straight quotes)');
    });
    const needPics = Math.ceil((u.words || []).length * st.pics);
    if (pics < needPics) err(U, 'needs a pic emoji on at least ' + needPics + ' words (two thirds), has ' + pics);
    // grammar
    if (!Array.isArray(u.grammar) || u.grammar.length < 6 || u.grammar.length > 12) err(U, 'needs 6–12 grammar items, has ' + (u.grammar ? u.grammar.length : 0));
    (u.grammar || []).forEach((g, i) => {
      const G = U + ' grammar ' + (i + 1);
      if (!g.q || gaps(g.q) !== 1) err(G, 'q needs exactly one ___');
      opts(G, g.opts, g.a, st.opts[0], st.opts[1]);
      if (!g.why || g.why.length < 8 || g.why.length > 160) err(G, 'why missing or not 8–160 characters');
      if (CURLY.test(g.q || '')) err(G, 'curly quotes in q');
    });
    // sentences
    if (!Array.isArray(u.sentences) || u.sentences.length < 4 || u.sentences.length > 8) err(U, 'needs 4–8 sentences, has ' + (u.sentences ? u.sentences.length : 0));
    (u.sentences || []).forEach((s, i) => {
      const S = U + ' sentence ' + (i + 1);
      if (typeof s !== 'string') { err(S, 'must be a string'); return; }
      const nw = words(s);
      if (nw < st.sent[0] || nw > st.sent[1]) err(S, 'has ' + nw + ' words, needs ' + st.sent[0] + '–' + st.sent[1]);
      if (!/^[A-Z0-9"']/.test(s) || !/[.?!]$/.test(s)) err(S, 'start with a capital letter and end with . ? or !');
      if (/\s{2}/.test(s) || /___/.test(s)) err(S, 'double space or a gap');
      if (CURLY.test(s)) err(S, 'curly quotes (use straight quotes)');
      if (/\b(yesterday|today|tomorrow|usually|often|always|sometimes|then|now|also)\b/i.test(s)) warn(S, 'contains a word that can often move ("' + s.match(/\b(yesterday|today|tomorrow|usually|often|always|sometimes|then|now|also)\b/i)[0] + '"): make sure only one order is natural');
    });
    // reading
    const rs = Array.isArray(u.reading) ? u.reading : [u.reading];
    if (Array.isArray(u.reading) && (u.reading.length < 1 || u.reading.length > 2)) err(U, 'reading list needs 1 or 2 readings');
    const titles = new Set();
    rs.forEach((r, ri) => {
    const RU = U + (rs.length > 1 ? ' reading ' + (ri + 1) : ' reading');
    if (r && r.title) { if (titles.has(r.title)) err(RU, 'two readings with the same title'); titles.add(r.title); }
    if (!r || !r.title || !r.text) err(U, 'reading needs title and text');
    else {
      const nw = words(r.text);
      if (nw < st.read[0] || nw > st.read[1]) err(RU, 'text has ' + nw + ' words, needs ' + st.read[0] + '–' + st.read[1]);
      if (!Array.isArray(r.qs) || r.qs.length < 3 || r.qs.length > 5) err(RU, 'needs 3–5 questions');
      let tfng = 0;
      (r.qs || []).forEach((q, i) => {
        const Q = RU + ' q' + (i + 1);
        if (!q.q) err(Q, 'q missing');
        if (q.type === 'tf') { if (JSON.stringify(q.opts) !== '["True","False"]') err(Q, 'tf opts must be exactly ["True", "False"]'); opts(Q, q.opts, q.a, 2, 2); }
        else if (q.type === 'tfng') { tfng++; if (n < 4) err(Q, 'tfng is used from Explorer (stage 4) up'); if (JSON.stringify(q.opts) !== '["True","False","Not Given"]') err(Q, 'tfng opts must be exactly ["True", "False", "Not Given"]'); opts(Q, q.opts, q.a, 3, 3); }
        else if (q.type === 'mc') opts(Q, q.opts, q.a, st.opts[0], st.opts[1]);
        else err(Q, 'type must be mc, tf or tfng');
      });
      if (st.tfng && tfng < st.tfng) err(RU, 'needs at least ' + st.tfng + ' tfng questions, has ' + tfng);
    }
    });
    // extra
    const ex = u.extra || [];
    if (ex.length < st.extra[0] || ex.length > st.extra[1]) err(U, 'needs ' + (st.extra[0] === st.extra[1] ? st.extra[0] : st.extra[0] + '–' + st.extra[1]) + ' extra items, has ' + ex.length);
    ex.forEach((x, i) => {
      const X = U + ' extra ' + (i + 1);
      if (!KINDS.has(x.kind)) err(X, 'kind must be one of ' + [...KINDS].join(', '));
      if (!x.q) err(X, 'q missing');
      opts(X, x.opts, x.a, 4, 4);
      if (!x.why || x.why.length < 8 || x.why.length > 200) err(X, 'why missing or not 8–200 characters');
    });
    if (st.kinds && new Set(ex.map((x) => x.kind)).size < st.kinds) err(U, 'extra items need at least ' + st.kinds + ' different kinds');
  });
  console.log('stage ' + n + ' (' + st.id + '): checked ' + stageWords.size + ' words');
}

const ask = process.argv.slice(2).map(Number).filter((x) => x >= 1 && x <= 7);
const list = ask.length ? ask : [1, 2, 3, 4, 5, 6, 7];
// read the other stages too (quietly) so a word repeated from another stage is noticed
if (ask.length) for (let n = 1; n <= 7; n++) if (!list.includes(n)) {
  try { const d = JSON.parse(fs.readFileSync(path.join(DIR, 'stage-' + n + '.json'), 'utf8')); d.units.forEach((u) => (u.words || []).forEach((w) => { if (w && w.w && !seenWords.has(w.w)) seenWords.set(w.w, n); })); } catch (e) { /* not there yet */ }
}
list.forEach(checkStage);
console.log(errors + ' errors, ' + warnings + ' warnings');
process.exit(errors ? 1 : 0);
