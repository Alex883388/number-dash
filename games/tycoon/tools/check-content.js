// Checks Tycoon Town's content against content/FORMAT.md: the roster, the business files biz-1..4.json,
// offers.json and rivals.json. Errors break the game or the rules; warnings point at things that look inconsistent.
// Usage: node games/tycoon/tools/check-content.js [--all]   (--all: every roster business must have content)
const fs = require('fs'), path = require('path');
const dir = process.env.TYCOON_CONTENT || path.join(__dirname, '..', 'content');
const all = process.argv.includes('--all');
const errors = [], warnings = [];
const err = (where, msg) => errors.push(where + ': ' + msg), warn = (where, msg) => warnings.push(where + ': ' + msg);
const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { if (fs.existsSync(path.join(dir, f))) err(f, 'not valid JSON: ' + e.message); return null; } };

const SKILLS = ['pricing', 'marketing', 'people', 'money', 'operations', 'safety', 'ethics', 'strategy'];
const GRADES = ['best', 'good', 'ok', 'poor', 'trap'];
const SPEND = { none: 0, low: 0.3, mid: 0.9, high: 1.8 }, PENALTY = { low: 1.2, mid: 2.4, high: 4 };
const FLAGS = ['insured', 'online', 'eco', 'loyal'];
const INDUSTRIES = ['food', 'retail', 'services', 'education', 'fitness', 'property', 'tech', 'transport', 'logistics', 'agriculture', 'entertainment', 'manufacturing', 'hospitality', 'energy', 'sports', 'all'];
const FEATURES = ['park', 'water', 'beach', 'school', 'station', 'hospital', 'church', 'tourism', 'airport', 'harbour', 'industry', 'avenue', 'homes', 'offices', 'quiet'];
const MONEY = ['none', 'gain-low', 'gain-mid', 'gain-high', 'lose-low', 'lose-mid', 'lose-high'];
// American spellings that have a British form (the game is in British English)
const US = [/\bcolor(s|ed|ful|ing)?\b/i, /\bfavorite(s)?\b/i, /\bcenter(s|ed)?\b/i, /\borganiz(e|es|ed|ing|ation|ations)\b/i, /\brealiz(e|es|ed|ing)\b/i,
  /\bneighbor(s|hood|hoods|ing)?\b/i, /\bhonor(s|ed)?\b/i, /\btheater(s)?\b/i, /\bjewelry\b/i, /\bmom(s)?\b/i, /\bgray\b/i, /\baluminum\b/i, /\bcozy\b/i,
  /\bcatalog(s)?\b/i, /\banalyz(e|es|ed|ing)\b/i, /\bapologiz(e|es|ed|ing)\b/i, /\brecogniz(e|es|ed|ing)\b/i, /\blabor\b/i, /\bflavor(s|ed)?\b/i,
  /\bhumor\b/i, /\bbehavior(s)?\b/i, /\bharbor(s)?\b/i, /\brumor(s)?\b/i, /\bdefense\b/i, /\btraveler(s)?\b/i, /\bcanceled\b/i, /\bfiber\b/i,
  /\bliter(s)?\b/i, /\bprioritiz(e|es|ed|ing)\b/i, /\bspecializ(e|es|ed|ing)\b/i, /\bcustomiz(e|es|ed|ing)\b/i, /\bminimiz(e|es|ed|ing)\b/i,
  /\bmaximiz(e|es|ed|ing)\b/i, /\bapolog(ize|ized)\b/i, /\bstandardiz(e|ed)\b/i, /\bpajamas\b/i, /\bcheck(s)? (for|of) \$/i];
const usCheck = (where, text) => { for (const re of US) if (re.test(text)) { err(where, 'American spelling "' + text.match(re)[0] + '" (use the British form)'); } };
const len = (where, name, s, max, min) => {
  if (typeof s !== 'string' || !s.trim()) { err(where, name + ' missing'); return; }
  if (s.length > max) err(where, name + ' too long (' + s.length + ' > ' + max + ')');
  if (min && s.length < min) warn(where, name + ' very short');
  usCheck(where + ' ' + name, s);
  if (/[“”‘’]/.test(s) && !/[a-z]’[a-z]/i.test(s)) warn(where, name + ' has curly quotes; keep straight quotes for consistency');
};
const score = (o) => {
  const rev = o.rev || 0, k = o.timing === 'short' ? 0.5 : o.timing === 'slow' ? 0.9 : 1;
  return rev * k - 0.8 * (o.costs || 0) - 0.7 * (o.risk || 0) + 0.6 * (o.rep || 0) - (SPEND[o.spend] || 0) - (o.penalty ? PENALTY[o.penalty] : 0);
};

// roster
const roster = read('roster.json');
if (!roster) { console.log('roster.json missing'); process.exit(1); }
const ids = new Map();
roster.businesses.forEach((b) => {
  if (ids.has(b.id)) err('roster', 'duplicate id ' + b.id);
  ids.set(b.id, b);
  if (!(b.price > 0) || !Array.isArray(b.profit) || b.profit[0] > b.profit[1] || ![1, 2, 3, 4].includes(b.risk) || ![1, 2, 3, 4].includes(b.tier)) err('roster ' + b.id, 'bad numbers');
  if (!INDUSTRIES.includes(b.industry)) err('roster ' + b.id, 'unknown industry ' + b.industry);
  if (!b.likes || typeof b.likes !== 'object' || !Object.keys(b.likes).length) err('roster ' + b.id, 'needs likes (what nearby helps it)');
  else for (const k in b.likes) { if (!FEATURES.includes(k)) err('roster ' + b.id, 'unknown like ' + k); if (!(b.likes[k] >= -0.3 && b.likes[k] <= 0.4)) err('roster ' + b.id, 'like ' + k + ' must be -0.3 to 0.4'); }
  if (b.needs !== undefined && !FEATURES.includes(b.needs)) err('roster ' + b.id, 'unknown need ' + b.needs);
});

// businesses
const seen = new Map();
for (let t = 1; t <= 4; t++) {
  const f = 'biz-' + t + '.json', data = read(f);
  if (!data) continue;
  if (!Array.isArray(data.businesses)) { err(f, 'needs { "businesses": [ … ] }'); continue; }
  for (const b of data.businesses) {
    const w = f + ' ' + (b.id || '?'), r = ids.get(b.id);
    if (!r) { err(w, 'not in the roster'); continue; }
    if (seen.has(b.id)) err(w, 'also in ' + seen.get(b.id));
    seen.set(b.id, f);
    if (r.tier !== t) warn(w, 'tier ' + r.tier + ' business in ' + f);
    len(w, 'pitch', b.pitch, 90, 20); len(w, 'earns', b.earns, 140, 20); len(w, 'costs', b.costs, 140, 15); len(w, 'risks', b.risks, 150, 20); len(w, 'tip', b.tip, 140, 20);
    if (!Array.isArray(b.cases) || b.cases.length !== 3) { err(w, 'needs exactly 3 cases'); continue; }
    let traps = 0;
    b.cases.forEach((c, ci) => {
      const cw = w + ' case ' + (ci + 1);
      if (c.id !== b.id + '-' + (ci + 1)) err(cw, 'id should be ' + b.id + '-' + (ci + 1));
      len(cw, 'title', c.title, 40, 4); len(cw, 'story', c.story, 300, 40);
      if (!Array.isArray(c.options) || c.options.length < 4 || c.options.length > 5) { err(cw, 'needs 4 or 5 options'); return; }
      const g = c.options.map((o) => o.grade);
      if (g.filter((x) => x === 'best').length !== 1) err(cw, 'exactly one best');
      if (!g.includes('good')) err(cw, 'at least one good');
      if (!g.includes('poor') && !g.includes('trap')) err(cw, 'at least one poor or trap');
      traps += g.filter((x) => x === 'trap').length;
      const texts = new Set();
      c.options.forEach((o, oi) => {
        const ow = cw + ' option ' + (oi + 1);
        len(ow, 'text', o.text, 80, 8); len(ow, 'result', o.result, 180, 20); len(ow, 'lesson', o.lesson, 110, 15);
        if (texts.has(o.text)) err(ow, 'same text as another option'); texts.add(o.text);
        optionRules(ow, o);
      });
      gradeRules(cw, c);
    });
    if (!traps) err(w, 'no trap option in its 3 cases (each business teaches one street-smart lesson)');
  }
}
function optionRules(ow, o) {
  {
    {
        if (!(o.spend in SPEND)) err(ow, 'spend must be none/low/mid/high');
        for (const k of ['rev', 'costs', 'rep']) if (!Number.isInteger(o[k]) || o[k] < -3 || o[k] > 3) err(ow, k + ' must be a whole number from -3 to 3');
        if (![-1, 0, 1].includes(o.risk)) err(ow, 'risk must be -1, 0 or 1');
        if (!['now', 'slow', 'short'].includes(o.timing)) err(ow, 'timing must be now/slow/short');
        if (o.flag !== undefined && !FLAGS.includes(o.flag)) err(ow, 'unknown flag ' + o.flag);
        if (o.penalty !== undefined && !(o.penalty in PENALTY)) err(ow, 'penalty must be low/mid/high');
        if (!GRADES.includes(o.grade)) err(ow, 'unknown grade ' + o.grade);
        if (!SKILLS.includes(o.skill)) err(ow, 'unknown skill ' + o.skill);
        if (o.grade === 'trap' && !['safety', 'ethics'].includes(o.skill)) err(ow, 'a trap trains safety or ethics');
        if (o.grade === 'trap' && !o.penalty && (o.rep || 0) >= 0) warn(ow, 'a trap should cost something (penalty or reputation)');
    }
  }
}
function gradeRules(cw, c) {
  {
    {
      // the grades must agree with the numbers
      const s = c.options.map(score), best = c.options.findIndex((o) => o.grade === 'best');
      if (best >= 0) c.options.forEach((o, i) => { if (i !== best && s[i] >= s[best]) warn(cw, '"' + o.text + '" (' + o.grade + ') scores ' + s[i].toFixed(1) + ', not below the best ' + s[best].toFixed(1)); });
      const goods = c.options.filter((o) => o.grade === 'good').map(score), poors = c.options.filter((o) => o.grade === 'poor').map(score);
      if (goods.length && poors.length && Math.max(...poors) > Math.min(...goods)) warn(cw, 'a poor option scores above a good one');
      c.options.forEach((o, i) => { if (o.grade === 'trap' && s[i] > 0) warn(cw, 'trap "' + o.text + '" scores above 0 (' + s[i].toFixed(1) + ')'); });
      if (best >= 0 && s[best] <= 0) warn(cw, 'the best option scores ' + s[best].toFixed(1) + ' (it should help the business)');
    }
  }
}
const missing = [...ids.keys()].filter((id) => !seen.has(id));
if (missing.length) (all ? err : warn)('content', missing.length + ' roster businesses have no content yet: ' + missing.join(', '));

// offers
const offers = read('offers.json');
if (offers) {
  const oids = new Set();
  (offers.offers || []).forEach((o, i) => {
    const w = 'offers ' + (o.id || i);
    if (!o.id || oids.has(o.id)) err(w, 'missing or duplicate id'); oids.add(o.id);
    len(w, 'title', o.title, 40, 4); len(w, 'story', o.story, 300, 40); len(w, 'from', o.from, 60, 4);
    if (![1, 2, 3, 4].includes(o.minTier)) err(w, 'minTier 1-4');
    if (!Array.isArray(o.options) || o.options.length !== 4) { err(w, 'needs 4 options'); return; }
    const g = o.options.map((x) => x.grade);
    if (g.filter((x) => x === 'best').length !== 1) err(w, 'exactly one best');
    if (!g.includes('trap')) err(w, 'at least one trap');
    o.options.forEach((x, j) => {
      const ow = w + ' option ' + (j + 1);
      len(ow, 'text', x.text, 80, 6); len(ow, 'result', x.result, 180, 15); len(ow, 'lesson', x.lesson, 110, 15);
      if (!GRADES.includes(x.grade)) err(ow, 'unknown grade');
      if (!SKILLS.includes(x.skill)) err(ow, 'unknown skill');
      if (!MONEY.includes(x.money)) err(ow, 'money must be one of ' + MONEY.join('/'));
      if (x.grade === 'trap' && !/^lose/.test(x.money) && !(x.boost && x.boost.rev < 0)) warn(ow, 'a trap should lose something');
      if (x.grade === 'best' && /^lose/.test(x.money)) warn(ow, 'the best answer loses money');
      if (x.boost) { if (!INDUSTRIES.includes(x.boost.industry) || !Number.isInteger(x.boost.rev) || !(x.boost.months >= 1 && x.boost.months <= 24)) err(ow, 'boost needs industry, whole rev and months 1-24'); }
    });
  });
  if ((offers.offers || []).length < 12) warn('offers', 'only ' + (offers.offers || []).length + ' offers (aim for 14+)');
}

// rivals: names for every business, and one case for each kind of business
const rivals = read('rivals.json');
if (!rivals) (all ? err : warn)('rivals.json', 'missing');
else {
  const longest = Object.values(rivals.names || {}).flat().reduce((a, b) => (b.length > a.length ? b : a), '');
  const longBiz = roster.businesses.map((b) => b.name.toLowerCase()).reduce((a, b) => (b.length > a.length ? b : a), '');
  const fill = (t) => String(t || '').replace(/{rival}/g, longest).replace(/{biz}/g, longBiz).replace(/{where}/g, 'just across the street');
  roster.businesses.forEach((b) => { const n = (rivals.names || {})[b.id]; if (!Array.isArray(n) || n.length < 2) err('rivals ' + b.id, 'needs 2 names'); else n.forEach((x) => { len('rivals ' + b.id, 'name', x, 18, 3); }); });
  const kinds = ['food', 'shop', 'service', 'property', 'big'], have = new Set();
  (rivals.cases || []).forEach((c, ci) => {
    const cw = 'rivals case ' + (c.id || ci);
    if (!kinds.includes(c.for)) err(cw, 'for must be one of ' + kinds.join('/')); have.add(c.for);
    len(cw, 'title', fill(c.title), 40, 4); len(cw, 'story', fill(c.story), 300, 40);
    if (!Array.isArray(c.options) || c.options.length < 4 || c.options.length > 5) { err(cw, 'needs 4 or 5 options'); return; }
    const g = c.options.map((o) => o.grade);
    if (g.filter((x) => x === 'best').length !== 1) err(cw, 'exactly one best');
    if (!g.includes('good')) err(cw, 'at least one good');
    if (!g.includes('trap')) err(cw, 'at least one trap');
    c.options.forEach((o, oi) => {
      const ow = cw + ' option ' + (oi + 1);
      len(ow, 'text', fill(o.text), 80, 8); len(ow, 'result', fill(o.result), 180, 20); len(ow, 'lesson', fill(o.lesson), 110, 15);
      optionRules(ow, o);
      if (!(o.shield >= 0 && o.shield <= 0.6)) err(ow, 'shield must be 0 to 0.6');
    });
    const best = c.options.find((o) => o.grade === 'best');
    if (best) c.options.forEach((o) => { if (o !== best && o.shield > best.shield) warn(cw, '"' + o.text + '" shields more than the best answer'); if (o.grade === 'trap' && o.shield) warn(cw, 'a trap should not shield'); });
    gradeRules(cw, c);
  });
  kinds.forEach((k) => { if (!have.has(k)) err('rivals', 'no case for ' + k); });
}

const nCases = [...seen.keys()].length * 3;
console.log(seen.size + ' of ' + ids.size + ' businesses written (' + nCases + ' cases)' + (offers ? ', ' + (offers.offers || []).length + ' offers' : '') + (rivals ? ', ' + (rivals.cases || []).length + ' rival cases' : ''));
warnings.forEach((w) => console.log('warning: ' + w));
errors.forEach((e) => console.log('ERROR: ' + e));
console.log(errors.length + ' errors, ' + warnings.length + ' warnings');
process.exit(errors.length ? 1 : 0);
