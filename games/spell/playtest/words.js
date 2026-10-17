// Spell It: checks every word list (run from the repo root):
//   node games/spell/build.js && ND_CDP=9361 ND_PROFILE=edge-profile-spell ND_URL=file:///D:/Github/number-dash/games/spell/dist/preview.html ND_READY='!!window.__spell' ND_BOT=none node games/dash/playtest/shoot.js games/spell/playtest/words.js
// - lists: letters only (a hyphen in number words, an apostrophe in homophones like they're), picture decks
//   (Animals, Food, Around us, Actions, Body & clothes) Easy 3-4 / Medium 5-6 / Hard 7+ letters, no repeats in a deck,
//   no picture twice in a deck, no US/UK spelling in a word or a clue, one gap per sentence that never gives the word
//   away, every homophone's sound-alikes are in the deck, every rule card changes its base word, 30+ words per level;
// - tiles: 25 deals of every word (and every number word, and Hard sums at every math level) hold all its letters,
//   2-4 decoys, no spare hyphen, a spare apostrophe only to tempt a homophone;
// - emoji: drawn in colour by this machine's emoji font (contact sheet: shots/spell-w01-emoji.png and -w02);
// - layout: every word shown on an iPad (landscape and portrait), a phone and a small laptop, each checked with
//   __spell.fits(), plus the clue decks once more in Listen only.
const LISTS = `(() => {
  const S = __spell, out = { counts: {}, problems: [], mono: [], dupAcross: [] };
  const bad = (m) => out.problems.push(m);
  // words spelled differently in US and UK English, or named differently (pants, jumper, trainers...): never a word, never in a clue
  const USUK = ('color colour colours colourful favorite favourite center centre gray grey mom mum mommy mummy cookie cookies biscuit biscuits candy sweets ' +
    'chips crisps fries donut doughnut jelly pajamas pyjamas tire tyre theater theatre aluminum aluminium airplane aeroplane eggplant aubergine zucchini ' +
    'courgette diaper nappy practice practise ladybug ladybird lorry chili chilli yogurt yoghurt omelet omelette jewelry jewellery neighbor neighbour ' +
    'realise realize organise organize apologise apologize mustache moustache plow plough catalog catalogue program programme curb kerb armor armour ' +
    'honor honour flavor flavour humor humour behavior behaviour harbor harbour meter metre liter litre centimeters centimetres kilometres kilometers ' +
    'traveled travelled traveling travelling canceled cancelled woolly wooly cozy cosy mold mould pants trousers jumper sweater trainers sneakers zipper ' +
    'torch flashlight postman mailman petrol gasoline rubbish trash garbage pavement sidewalk vest waistcoat suspenders braces sledge sled autumn').split(' ');
  const PICTURE = ['animals', 'food', 'around', 'actions', 'body'];
  const seen = {};
  const hasUSUK = (t) => USUK.filter((u) => new RegExp('\\\\b' + u + '\\\\b', 'i').test(t));
  for (const d of S.DECK_IDS) {
    const deckWords = new Set(), deckPics = new Set();
    for (const l of S.LEVELS) {
      if (d === 'numbers' && l === 'hard') continue;
      const list = S.wordList(d, l);
      out.counts[d + '/' + l] = list.length;
      if (list.length < 30 && d !== 'numbers') bad(d + '/' + l + ' has only ' + list.length + ' words');
      for (const x of list) {
        const w = x.w;
        const re = d === 'numbers' ? /^[a-z]+(-[a-z]+)?$/ : d === 'homophones' ? /^[a-z]+('[a-z]+)?$/ : /^[a-z]+$/;
        if (!re.test(w)) bad('odd letters: ' + w);
        if (deckWords.has(w)) bad('repeat in ' + d + ': ' + w);
        deckWords.add(w);
        if (seen[w] && seen[w] !== d) out.dupAcross.push(w + ' (' + seen[w] + ', ' + d + ')');
        seen[w] = d;
        if (hasUSUK(w).length) bad('US/UK word: ' + w);
        if (PICTURE.indexOf(d) >= 0) {
          if (l === 'easy' && (w.length < 3 || w.length > 4)) bad('easy length: ' + d + '/' + w);
          if (l === 'medium' && (w.length < 5 || w.length > 6)) bad('medium length: ' + d + '/' + w);
          if (l === 'hard' && w.length < 7) bad('hard length: ' + d + '/' + w);
        }
        if (x.kind === 'emoji') {
          if (!x.pic) bad('no picture: ' + w);
          if (deckPics.has(x.pic)) bad('same picture twice in ' + d + ': ' + x.pic + ' ' + w);
          deckPics.add(x.pic);
        } else if (x.kind !== 'number') {
          const gaps = (x.clue || '').split('____').length - 1;
          if (gaps !== 1) bad('gaps in clue for ' + w + ': ' + gaps);
          if (new RegExp('(^|[^a-z’\\'])' + w.replace("'", "['’]") + '($|[^a-z’\\'])', 'i').test(x.clue.replace('____', ''))) bad('clue gives away ' + w);
          const u = hasUSUK(x.clue + ' ' + (x.kind === 'rule' ? x.pic : ''));
          if (u.length) bad('US/UK word in clue for ' + w + ': ' + u.join(','));
          if (x.clue.length > 64) bad('long clue for ' + w + ': ' + x.clue.length);
        }
        if (x.kind === 'homo') {
          const all = S.wordList(d, l).map((y) => y.w);
          if (!x.alt || !x.alt.length) bad('homophone without sound-alikes: ' + w);
          for (const a of x.alt || []) if (all.indexOf(a) < 0) bad('sound-alike missing: ' + w + ' / ' + a);
        }
        if (x.kind === 'rule') {
          const base = x.pic.indexOf(' + ') > 0 ? x.pic.split(' + ')[0] : x.pic.replace('one ', '').replace(', two …', '');
          if (!base || base === w) bad('rule does not change the word: ' + x.pic + ' -> ' + w);
        }
      }
    }
  }
  // number words
  const nw = { 1: 'one', 13: 'thirteen', 20: 'twenty', 21: 'twenty-one', 40: 'forty', 42: 'forty-two', 77: 'seventy-seven', 90: 'ninety', 99: 'ninety-nine' };
  for (const k in nw) if (S.numWord(+k) !== nw[k]) bad('numWord(' + k + ') = ' + S.numWord(+k));
  // Hard number words: sums from every math level, answers 1-99, spoken without symbols
  const facts = {};
  const keep = S.save.settings.mathLevel;
  for (const ml of Object.keys(S.MATH)) {
    S.save.settings.mathLevel = ml;
    const seenF = new Set();
    let n = 0, words = new Set();
    for (let i = 0; i < 200; i++) {
      const it = S.factWord(new Set(), seenF);
      n++; words.add(it.w);
      if (!(it.q.a >= 1 && it.q.a <= 99 && Number.isInteger(it.q.a))) bad('fact answer out of range: ' + it.pic + ' ' + it.q.a);
      if (S.numWord(it.q.a) !== it.w) bad('fact word: ' + it.pic);
      const say = S.factSay(it.pic);
      if (/[×÷−+=?%½⅓¼⅕⅒()]/.test(say)) bad('symbols spoken: ' + say);
      if (it.pic.indexOf('(') >= 0 && say.indexOf('the sum of') < 0) bad('brackets lost aloud: ' + it.pic + ' -> ' + say);
      if (seenF.size > 150) seenF.clear();
    }
    facts[ml] = { made: n, differentAnswers: words.size };
  }
  S.save.settings.mathLevel = keep;
  out.facts = facts;
  // tiles: every word, 25 deals each
  let formable = 0, homos = 0;
  const tileCheck = (x, level) => {
    const w = x.w;
    for (let k = 0; k < 25; k++) {
      const t = S.makeTiles(w, level, x.alt), need = {};
      for (const c of w) need[c] = (need[c] || 0) + 1;
      for (const c of t) if (need[c]) need[c]--;
      if (Object.keys(need).some((c) => need[c] > 0)) return 'missing letters ' + t.join('');
      const dec = t.length - w.length;
      if (dec < 2 || dec > 4) return dec + ' decoys';
      if (t.length > 16) return t.length + ' tiles';
      if (t.filter((c) => c === '-').length !== (w.match(/-/g) || []).length) return 'a spare hyphen';
      const spare = x.alt && x.alt.some((a) => a.indexOf("'") >= 0) && w.indexOf("'") < 0 ? 1 : 0;
      if (t.filter((c) => c === "'").length - (w.match(/'/g) || []).length > spare) return 'a spare apostrophe';
      if (t.join('').indexOf(w) >= 0) out.inOrder = (out.inOrder || 0) + 1;
      if (k === 0 && x.alt) {
        homos++;
        // can each sound-alike be built from these tiles too? (the sentence has to decide, not the tiles)
        const can = x.alt.every((a) => { const left = t.slice(); return a.split('').every((c) => { const i = left.indexOf(c); if (i < 0) return false; left.splice(i, 1); return true; }); });
        if (can) formable++;
      }
    }
    return '';
  };
  let dealt = 0, maxTiles = 0;
  for (const d of S.DECK_IDS) for (const l of S.LEVELS) {
    const list = d === 'numbers' && l === 'hard' ? Array.from({ length: 99 }, (_, i) => ({ w: S.numWord(i + 1) })) : S.wordList(d, l);
    for (const x of list) { const r = tileCheck(x, l); dealt++; maxTiles = Math.max(maxTiles, S.makeTiles(x.w, l, x.alt).length); if (r) bad('tiles for ' + d + '/' + l + '/' + x.w + ': ' + r); }
  }
  out.tiles = { words: dealt, deals: dealt * 25, inOrder: out.inOrder || 0, longest: maxTiles, homophonesWhereEverySoundAlikeCanBeBuilt: formable + ' of ' + homos };
  // emoji: drawn in colour (a missing glyph is a grey box or blank)
  const cv = document.createElement('canvas'); cv.width = cv.height = 100;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const draw = (e) => {
    cx.clearRect(0, 0, 100, 100); cx.font = '64px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; cx.textBaseline = 'top'; cx.fillStyle = '#000';
    cx.fillText(e, 10, 10);
    const d = cx.getImageData(0, 0, 100, 100).data; let ink = 0, col = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 60) { ink++; if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 40) col++; }
    return { ink, col, w: cx.measureText(e).width };
  };
  const tofu = draw('\\uE000');
  const pics = [];
  for (const d of S.DECK_IDS) for (const l of S.LEVELS) if (!(d === 'numbers' && l === 'hard')) for (const x of S.wordList(d, l)) if (x.kind === 'emoji') pics.push([x.pic, x.w]);
  for (const id of S.DECK_IDS) pics.push([S.DECKS[id].icon, id]);
  for (const e of ['👀', '✏\\uFE0F', '🧮', '👂', '⭐', '✅', '👍', '🔊', '✨', '🌟']) pics.push([e, 'ui']);
  for (const [e, w] of pics) {
    const r = draw(e);
    if (r.ink < 300 || (r.ink === tofu.ink && r.col === tofu.col)) bad('emoji not drawn: ' + e + ' ' + w);
    else if (r.w > 64 * 1.7) bad('emoji drawn as two: ' + e + ' ' + w + ' ' + Math.round(r.w));
    else if (r.col < 60) out.mono.push(e + ' ' + w);
  }
  out.emoji = pics.length;
  out.total = Object.keys(out.counts).reduce((a, k) => a + out.counts[k], 0);
  window.__pics = pics;
  return out;
})()`;

const SHEET = (from, to) => `(() => {
  const old = document.getElementById('sheet'); if (old) old.remove();
  const d = document.createElement('div');
  d.id = 'sheet';
  d.style.cssText = 'position:fixed;inset:0;z-index:99;background:#fff;display:grid;grid-template-columns:repeat(20,1fr);gap:2px;padding:8px;font:11px system-ui;color:#333;align-content:start';
  d.innerHTML = window.__pics.slice(${from}, ${to}).map(([e, w]) => '<div style="text-align:center"><div style="font:38px/1.15 \\'Apple Color Emoji\\',\\'Segoe UI Emoji\\',sans-serif">' + e + '</div>' + w + '</div>').join('');
  document.body.appendChild(d);
  return window.__pics.slice(${from}, ${to}).length;
})()`;

// every word on screen at this size, each checked by __spell.fits(); then the clue decks in Listen only
const FITS_ALL = `(() => {
  const S = __spell, bad = [];
  let n = 0;
  const go = (deck, level, words) => { for (const w of words) { S.start(deck, level, [w]); const f = S.fits(); n++; if (f.length) bad.push(deck + '/' + level + '/' + w + (S.game.listen ? ' (listen)' : '') + ': ' + f.join('; ')); } };
  S.setListen(false);
  for (const d of S.DECK_IDS) for (const l of S.LEVELS) if (d !== 'numbers' || l !== 'hard') go(d, l, S.wordList(d, l).map((x) => x.w));
  const keep = S.save.settings.mathLevel;
  for (const ml of ['starter', 'explorer', 'genius']) {
    S.save.settings.mathLevel = ml;
    for (let i = 0; i < 15; i++) { S.start('numbers', 'hard'); const f = S.fits(); n++; if (f.length) bad.push('numbers/hard/' + S.game.word.pic + ': ' + f.join('; ')); }
  }
  S.save.settings.mathLevel = keep;
  S.setListen(true);
  for (const d of ['tricky', 'homophones', 'endings']) for (const l of S.LEVELS) go(d, l, S.wordList(d, l).map((x) => x.w));
  S.setListen(false);
  S.goHome();
  return { size: innerWidth + 'x' + innerHeight, checked: n, problems: bad.length, first: bad.slice(0, 12) };
})()`;

module.exports = [
  { eval: "localStorage.clear(); 'cleared'" },
  { reload: true },
  { viewport: [1400, 1000, false, false, 1] },
  { eval: LISTS },
  { eval: SHEET(0, 220) },
  { sleep: 600 },
  { shot: 'spell-w01-emoji' },
  { eval: SHEET(220, 440) },
  { sleep: 600 },
  { shot: 'spell-w02-emoji' },
  { eval: "document.getElementById('sheet').remove(); 'ok'" },
  { viewport: [1180, 820, true, false, 1] },
  { eval: FITS_ALL },
  { viewport: [820, 1180, true, false, 1] },
  { eval: FITS_ALL },
  { viewport: [390, 844, true, false, 1] },
  { eval: FITS_ALL },
  { viewport: [1024, 768, false, false, 1] },
  { eval: FITS_ALL },
  { log: 'JSON.stringify(window.__errs)' },
  { eval: "localStorage.clear(); 'cleared'" }
];
