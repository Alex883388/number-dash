// Spell It: checks every word list (run from the repo root):
//   node games/spell/build.js && ND_CDP=9361 ND_PROFILE=edge-profile-spell ND_URL=file:///D:/Github/number-dash/games/spell/dist/preview.html ND_READY='!!window.__spell' ND_BOT=none node games/dash/playtest/shoot.js games/spell/playtest/words.js
// - lists: letters only, Easy 3-4 / Medium 5-6 / Hard 7+ letters for the picture decks, no repeats, no US/UK spellings,
//   one gap per tricky sentence that does not give the word away, about 20 words per deck and level;
// - tiles: 25 deals of every word (and every number word, and Hard sums at every math level) hold all its letters, 2-4 decoys;
// - emoji: drawn in colour by this machine's emoji font (a contact sheet goes to shots/spell-w01-emoji.png to look at);
// - layout: every word shown on an iPad (landscape and portrait) and a phone, each checked with __spell.fits().
const LISTS = `(() => {
  const S = __spell, out = { counts: {}, problems: [], mono: [], dupAcross: [] };
  const bad = (m) => out.problems.push(m);
  const USUK = 'color colour favorite favourite center centre gray grey mom mum cookie cookies biscuit candy sweets chips fries donut doughnut jelly pajamas pyjamas tire tyre theater theatre aluminum aluminium airplane aeroplane eggplant aubergine zucchini courgette diaper nappy practice practise ladybug ladybird lorry chili chilli yogurt yoghurt omelet omelette jewelry jewellery neighbor neighbour realise realize organise organize mustache moustache plow plough catalog catalogue program programme gaol jail tyres curb kerb mummy mommy'.split(' ');
  const seen = {};
  for (const d of Object.keys(S.DECKS)) {
    const deckWords = new Set(), deckPics = new Set();
    for (const l of S.LEVELS) {
      if (d === 'numbers' && l === 'hard') continue;
      const list = S.wordList(d, l);
      out.counts[d + '/' + l] = list.length;
      if (list.length < 20) bad(d + '/' + l + ' has only ' + list.length + ' words');
      for (const x of list) {
        const w = x.w;
        if (!(d === 'numbers' ? /^[a-z]+(-[a-z]+)?$/ : /^[a-z]+$/).test(w)) bad('odd letters: ' + w);
        if (deckWords.has(w)) bad('repeat in ' + d + ': ' + w);
        deckWords.add(w);
        if (seen[w] && seen[w] !== d) out.dupAcross.push(w + ' in ' + seen[w] + ' and ' + d);
        seen[w] = d;
        if (USUK.indexOf(w) >= 0) bad('US/UK word: ' + w);
        if (x.kind === 'emoji') {
          if (l === 'easy' && (w.length < 3 || w.length > 4)) bad('easy length: ' + w);
          if (l === 'medium' && (w.length < 5 || w.length > 6)) bad('medium length: ' + w);
          if (l === 'hard' && w.length < 7) bad('hard length: ' + w);
          if (!x.pic) bad('no picture: ' + w);
          if (deckPics.has(x.pic)) bad('same picture twice in ' + d + ': ' + x.pic + ' ' + w);
          deckPics.add(x.pic);
        }
        if (x.kind === 'sentence') {
          const gaps = x.clue.split('____').length - 1;
          if (gaps !== 1) bad('gaps in clue for ' + w + ': ' + gaps);
          if (new RegExp('\\\\b' + w + '\\\\b', 'i').test(x.clue.replace('____', ''))) bad('clue gives away ' + w);
          for (const u of USUK) if (new RegExp('\\\\b' + u + '\\\\b', 'i').test(x.clue)) bad('US/UK word in clue for ' + w + ': ' + u);
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
    const used = new Set(), seenF = new Set();
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
    facts[ml] = { made: n, differentAnswers: words.size, sample: S.factSay(S.factWord(new Set(), new Set()).pic) };
    if (ml === 'genius') facts.brackets = S.factSay('2 × (7 + 9) = ?');
  }
  S.save.settings.mathLevel = keep;
  out.facts = facts;
  // tiles: every word, 25 deals each
  const tileCheck = (w, level) => {
    for (let k = 0; k < 25; k++) {
      const t = S.makeTiles(w, level), need = {};
      for (const c of w) need[c] = (need[c] || 0) + 1;
      for (const c of t) if (need[c]) need[c]--;
      if (Object.keys(need).some((c) => need[c] > 0)) return 'missing letters ' + t.join('');
      const dec = t.length - w.length;
      if (dec < 2 || dec > 4) return dec + ' decoys';
      if (t.length > 16) return t.length + ' tiles';
      if (t.filter((c) => c === '-').length !== (w.match(/-/g) || []).length) return 'a spare hyphen';
      if (t.join('').indexOf(w) >= 0) out.inOrder = (out.inOrder || 0) + 1;
    }
    return '';
  };
  let dealt = 0, maxTiles = 0;
  for (const d of Object.keys(S.DECKS)) for (const l of S.LEVELS) {
    let list = d === 'numbers' && l === 'hard' ? Array.from({ length: 99 }, (_, i) => ({ w: S.numWord(i + 1) })) : S.wordList(d, l);
    for (const x of list) { const r = tileCheck(x.w, l); dealt++; maxTiles = Math.max(maxTiles, S.makeTiles(x.w, l).length); if (r) bad('tiles for ' + d + '/' + l + '/' + x.w + ': ' + r); }
  }
  out.tiles = { words: dealt, deals: dealt * 25, inOrder: out.inOrder || 0, longest: maxTiles };
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
  for (const d of ['animals', 'food', 'around']) for (const l of S.LEVELS) for (const x of S.wordList(d, l)) pics.push([x.pic, x.w]);
  for (const id of Object.keys(S.DECKS)) pics.push([S.DECKS[id].icon, id]);
  for (const e of ['👀', '✏\\uFE0F', '🧮', '⭐', '✅', '👍', '🔊', '✨', '🌟']) pics.push([e, 'ui']);
  for (const [e, w] of pics) {
    const r = draw(e);
    if (r.ink < 300 || (r.ink === tofu.ink && r.col === tofu.col)) bad('emoji not drawn: ' + e + ' ' + w);
    else if (r.w > 64 * 1.7) bad('emoji drawn as two: ' + e + ' ' + w + ' ' + Math.round(r.w));
    else if (r.col < 60) out.mono.push(e + ' ' + w);
  }
  out.emoji = pics.length;
  window.__pics = pics;
  return out;
})()`;

const SHEET = `(() => {
  const d = document.createElement('div');
  d.id = 'sheet';
  d.style.cssText = 'position:fixed;inset:0;z-index:99;background:#fff;display:grid;grid-template-columns:repeat(20,1fr);gap:2px;padding:8px;font:11px system-ui;color:#333;align-content:start';
  d.innerHTML = window.__pics.map(([e, w]) => '<div style="text-align:center"><div style="font:38px/1.15 \\'Apple Color Emoji\\',\\'Segoe UI Emoji\\',sans-serif">' + e + '</div>' + w + '</div>').join('');
  document.body.appendChild(d);
  return window.__pics.length;
})()`;

// every word on screen at this size, each checked by __spell.fits()
const FITS_ALL = `(() => {
  const S = __spell, bad = [];
  let n = 0;
  const go = (deck, level, words) => { for (const w of words) { S.start(deck, level, [w]); const f = S.fits(); n++; if (f.length) bad.push(deck + '/' + level + '/' + w + ': ' + f.join('; ')); } };
  for (const d of ['animals', 'food', 'around', 'tricky']) for (const l of S.LEVELS) go(d, l, S.wordList(d, l).map((x) => x.w));
  go('numbers', 'easy', S.wordList('numbers', 'easy').map((x) => x.w));
  go('numbers', 'medium', S.wordList('numbers', 'medium').map((x) => x.w));
  const keep = S.save.settings.mathLevel;
  for (const ml of ['starter', 'explorer', 'genius']) {
    S.save.settings.mathLevel = ml;
    for (let i = 0; i < 15; i++) { S.start('numbers', 'hard'); const f = S.fits(); n++; if (f.length) bad.push('numbers/hard/' + S.game.word.pic + ': ' + f.join('; ')); }
  }
  S.save.settings.mathLevel = keep;
  S.goHome();
  return { size: innerWidth + 'x' + innerHeight, checked: n, problems: bad.length, first: bad.slice(0, 12) };
})()`;

module.exports = [
  { eval: "localStorage.clear(); 'cleared'" },
  { reload: true },
  { viewport: [1400, 1000, false, false, 1] },
  { eval: LISTS },
  { eval: SHEET },
  { sleep: 600 },
  { shot: 'spell-w01-emoji' },
  { eval: "document.getElementById('sheet').remove(); 'ok'" },
  { viewport: [1180, 820, true, false, 1] },
  { eval: FITS_ALL },
  { viewport: [820, 1180, true, false, 1] },
  { eval: FITS_ALL },
  { viewport: [390, 844, true, false, 1] },
  { eval: FITS_ALL },
  { viewport: [1024, 768, false, false, 1] },
  { eval: FITS_ALL },
  { eval: "localStorage.clear(); 'cleared'" }
];
