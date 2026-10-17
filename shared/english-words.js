/* shared/english-words.js — English word facts for the games: OPP (opposites), PAST (past tense), SYN (same meaning),
   PLURALS, each in three levels (ages 7–8, 9–10, 11–12), and englishQuestion() for quiz games. Needs rnd, pick, shuffle.
   Inlined at build time (see build.js). */
// opposites, easy to tricky
const OPP = [
  [['hot', 'cold'], ['big', 'small'], ['up', 'down'], ['happy', 'sad'], ['fast', 'slow'], ['day', 'night'], ['open', 'closed'], ['in', 'out'], ['wet', 'dry'], ['yes', 'no'],
   ['old', 'new'], ['top', 'bottom'], ['full', 'empty'], ['light', 'dark'], ['high', 'low'], ['left', 'right'], ['on', 'off'], ['push', 'pull'], ['hard', 'soft'], ['loud', 'quiet']],
  [['tall', 'short'], ['thick', 'thin'], ['heavy', 'light'], ['early', 'late'], ['first', 'last'], ['win', 'lose'], ['clean', 'dirty'], ['strong', 'weak'], ['near', 'far'], ['start', 'finish'],
   ['buy', 'sell'], ['laugh', 'cry'], ['sweet', 'sour'], ['brave', 'scared'], ['awake', 'asleep'], ['before', 'after'], ['always', 'never'], ['inside', 'outside'], ['question', 'answer'], ['remember', 'forget']],
  [['ancient', 'modern'], ['deep', 'shallow'], ['wide', 'narrow'], ['rough', 'smooth'], ['arrive', 'depart'], ['increase', 'decrease'], ['include', 'exclude'], ['maximum', 'minimum'], ['accept', 'refuse'], ['victory', 'defeat'],
   ['frequent', 'rare'], ['temporary', 'permanent'], ['horizontal', 'vertical'], ['generous', 'selfish'], ['success', 'failure'], ['interior', 'exterior'], ['visible', 'invisible'], ['possible', 'impossible'], ['polite', 'rude'], ['ascend', 'descend']]
];
// verbs and their past tense (only pairs spelled differently), easy to tricky
const PAST = [
  [['go', 'went'], ['eat', 'ate'], ['see', 'saw'], ['run', 'ran'], ['sit', 'sat'], ['have', 'had'], ['get', 'got'], ['swim', 'swam'], ['sing', 'sang'], ['drink', 'drank'],
   ['come', 'came'], ['give', 'gave'], ['make', 'made'], ['say', 'said'], ['play', 'played'], ['jump', 'jumped'], ['look', 'looked'], ['help', 'helped'], ['walk', 'walked'], ['win', 'won']],
  [['buy', 'bought'], ['bring', 'brought'], ['think', 'thought'], ['catch', 'caught'], ['teach', 'taught'], ['fly', 'flew'], ['draw', 'drew'], ['grow', 'grew'], ['know', 'knew'], ['throw', 'threw'],
   ['write', 'wrote'], ['ride', 'rode'], ['drive', 'drove'], ['speak', 'spoke'], ['break', 'broke'], ['wake', 'woke'], ['choose', 'chose'], ['forget', 'forgot'], ['find', 'found'], ['hold', 'held'],
   ['keep', 'kept'], ['sleep', 'slept'], ['feel', 'felt'], ['meet', 'met'], ['sell', 'sold'], ['tell', 'told'], ['build', 'built'], ['carry', 'carried'], ['stop', 'stopped'], ['try', 'tried']],
  [['begin', 'began'], ['freeze', 'froze'], ['hide', 'hid'], ['bite', 'bit'], ['shake', 'shook'], ['swing', 'swung'], ['seek', 'sought'], ['bend', 'bent'], ['lend', 'lent'], ['spend', 'spent'],
   ['dig', 'dug'], ['stick', 'stuck'], ['strike', 'struck'], ['kneel', 'knelt'], ['lead', 'led'], ['flee', 'fled'], ['forgive', 'forgave'], ['arise', 'arose'], ['tear', 'tore'], ['wear', 'wore'],
   ['shine', 'shone'], ['slide', 'slid'], ['spin', 'spun'], ['sink', 'sank'], ['spring', 'sprang'], ['deal', 'dealt'], ['mean', 'meant'], ['forbid', 'forbade'], ['undertake', 'undertook'], ['overcome', 'overcame']]
];
// words that mean (almost) the same
const SYN = [
  [['big', 'large'], ['little', 'small'], ['glad', 'happy'], ['quick', 'fast'], ['start', 'begin'], ['close', 'shut'], ['gift', 'present'], ['finish', 'end'], ['ill', 'sick'], ['yell', 'shout'],
   ['rock', 'stone'], ['chat', 'talk'], ['smart', 'clever'], ['easy', 'simple'], ['angry', 'cross'], ['scared', 'afraid'], ['nice', 'kind'], ['tired', 'sleepy'], ['grab', 'take'], ['look', 'watch']],
  [['enormous', 'huge'], ['brave', 'courageous'], ['choose', 'select'], ['correct', 'right'], ['error', 'mistake'], ['journey', 'trip'], ['gather', 'collect'], ['wealthy', 'rich'], ['silent', 'quiet'], ['complete', 'finish'],
   ['chilly', 'cold'], ['odd', 'strange'], ['reply', 'answer'], ['unhappy', 'sad'], ['shy', 'timid'], ['giggle', 'laugh'], ['mend', 'repair'], ['below', 'under'], ['almost', 'nearly'], ['shout', 'call']],
  [['assist', 'help'], ['purchase', 'buy'], ['require', 'need'], ['obtain', 'get'], ['commence', 'begin'], ['conclude', 'end'], ['vast', 'immense'], ['fragile', 'delicate'], ['accurate', 'precise'], ['rapid', 'swift'],
   ['abundant', 'plentiful'], ['cautious', 'careful'], ['eager', 'keen'], ['vanish', 'disappear'], ['demonstrate', 'show'], ['attempt', 'try'], ['sufficient', 'enough'], ['construct', 'build'], ['observe', 'watch'], ['prohibit', 'forbid']]
];
// one ... two ...: [singular, plural, a typical wrong plural]. Where dictionaries also accept a regular plural
// (radiuses, funguses, mediums, nucleuses, phenomenons, criterions) the third item repeats the singular: no wrong ending offered
const PLURALS = [
  [['box', 'boxes', 'boxs'], ['bus', 'buses', 'bus'], ['baby', 'babies', 'babys'], ['man', 'men', 'mans'], ['woman', 'women', 'womans'], ['child', 'children', 'childs'],
   ['foot', 'feet', 'foots'], ['tooth', 'teeth', 'tooths'], ['mouse', 'mice', 'mouses'], ['dish', 'dishes', 'dishs'], ['fox', 'foxes', 'foxs'], ['city', 'cities', 'citys'],
   ['lady', 'ladies', 'ladys'], ['watch', 'watches', 'watchs'], ['glass', 'glasses', 'glasss']],
  [['leaf', 'leaves', 'leafes'], ['knife', 'knives', 'knifes'], ['wolf', 'wolves', 'wolfes'], ['half', 'halves', 'halfs'], ['shelf', 'shelves', 'shelfs'], ['potato', 'potatoes', 'potatos'],
   ['tomato', 'tomatoes', 'tomatos'], ['hero', 'heroes', 'heros'], ['goose', 'geese', 'gooses'], ['life', 'lives', 'lifes'], ['story', 'stories', 'storys'], ['family', 'families', 'familys'],
   ['party', 'parties', 'partys'], ['loaf', 'loaves', 'loafs'], ['thief', 'thieves', 'thiefs']],
  [['cactus', 'cacti', 'cactis'], ['fungus', 'fungi', 'fungus'], ['crisis', 'crises', 'crisises'], ['analysis', 'analyses', 'analysises'], ['phenomenon', 'phenomena', 'phenomenon'],
   ['criterion', 'criteria', 'criterion'], ['thesis', 'theses', 'thesises'], ['ox', 'oxen', 'oxes'], ['medium', 'media', 'medium'], ['radius', 'radii', 'radius'],
   ['nucleus', 'nuclei', 'nucleus'], ['axis', 'axes', 'axises'], ['stimulus', 'stimuli', 'stimuluses'], ['hypothesis', 'hypotheses', 'hypothesises'], ['bacterium', 'bacteria', 'bacteriums']]
];
// A quiz question from these lists: t has one "?" for the answer (so solved text can fill it in), wrong = n - 1
// wrong answers that are real words of the same kind (plus, for plurals, the typical wrong ending).
function englishQuestion(tier, n, kinds) {
  const kind = pick(kinds || ['past', 'plural', 'opp', 'syn']), t3 = Math.max(0, Math.min(2, tier));
  let t, a, wrong = [];
  const others = (list, k) => shuffle(list.filter((x) => x[k] !== a).map((x) => x[k]));
  if (kind === 'past') { const [v, p] = pick(PAST[t3]); t = 'Past of ' + v + ': ?'; a = p; wrong = others(PAST[t3], 1); }
  else if (kind === 'plural') {
    const [s, p, bad] = pick(PLURALS[t3]); t = 'One ' + s + ', two ?'; a = p;
    wrong = (bad !== s && bad !== p ? [bad] : []).concat(others(PLURALS[t3], 1));
  } else {
    const list = kind === 'opp' ? OPP[t3] : SYN[t3], pair = pick(list), flip = Math.random() < 0.5;
    const w = flip ? pair[1] : pair[0]; a = flip ? pair[0] : pair[1];
    t = (kind === 'opp' ? 'Opposite of ' : 'Same as ') + w + ': ?';
    // never offer the word itself, or a word that is its opposite / partner in another pair
    const skip = new Set([w].concat(list.filter((x) => x.includes(w)).map((x) => (x[0] === w ? x[1] : x[0]))));
    wrong = shuffle(list.flat().filter((x) => !skip.has(x) && x !== a));
  }
  const used = new Set([a]), opts = [];
  for (const x of wrong) { if (opts.length >= n - 1) break; if (!used.has(x)) { used.add(x); opts.push(x); } }
  return { t: t, a: a, english: true, kind: kind, wrong: opts };
}
