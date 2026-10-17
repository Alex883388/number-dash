// Spell It on an emulated iPad, by finger (run from the repo root):
//   node games/spell/build.js && ND_CDP=9361 ND_PROFILE=edge-profile-spell ND_URL=file:///D:/Github/number-dash/games/spell/dist/preview.html ND_READY='!!window.__spell' ND_BOT=none node games/dash/playtest/shoot.js games/spell/playtest/ipad.js
// Landscape iPad: pick a deck and a level, Start, spell "butterfly" with finger taps (one wrong tile, one Look
// again), pause, finish the round, play again (a new remix). Then iPad portrait, a phone, dark mode and calm mode,
// with the longest words ("seventy-seven", "caterpillar", "temperature", a sentence clue, a sum).
const tap = [{ eval: '__spell.markNext()' }, { touchEl: '[data-bot="tap"]' }];
const FINISH = `(async () => {
  const S = __spell, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  S.setSpeed(20);
  for (let g = 0; g < 4000 && S.state() !== 'results'; g++) {
    if (S.state() === 'spell') { const i = S.nextIndex(); if (i >= 0) S.tap(i); }
    await sleep(8);
  }
  S.setSpeed(1);
  return [S.state(), S.game.results.filter((r) => r.perfect).length + ' perfect', S.game.lastStars + ' stars'];
})()`;
const spellNow = (deck, level, word) => [
  { eval: `__spell.start('${deck}', '${level}', ['${word}']); 'start ${word}'` },
  { waitFor: "__spell.state() === 'spell'", timeout: 9000 }, { sleep: 450 }
];
const fits = { log: '__spell.fits()' };
module.exports = [
  { eval: "localStorage.clear(); 'cleared'" },
  { ipad: true },
  { viewport: [1180, 820, true, false, 2] },
  { reload: true },
  { sleep: 900 },
  { shot: 'spell-01-home-ipad' },
  { log: "[document.documentElement.scrollHeight <= innerHeight, matchMedia('(pointer: coarse)').matches, navigator.userAgent.indexOf('iPad') > 0]" },
  { touchEl: '.deck[data-deck="animals"] span' },
  { touchEl: 'input[name="level"][value="hard"] + span' },
  { log: "[__spell.rec.deck, __spell.rec.level, document.getElementById('deckNote').textContent]" },
  { eval: "__spell.forceNext(['butterfly']); 'next round starts with butterfly'" },
  { touchEl: '#startBtn' },
  { waitFor: "__spell.state() === 'look'", timeout: 5000 },
  { sleep: 400 },
  { shot: 'spell-02-look-ipad' },
  { log: "['said after the Start tap', __spell.Speech.said.slice(-1)[0], speechSynthesis.speaking || speechSynthesis.pending]" },
  { waitFor: "__spell.state() === 'spell'", timeout: 8000 },
  { sleep: 450 },
  { shot: 'spell-03-spell-ipad' },
  fits,
  { log: "Array.from(document.querySelectorAll('.tile')).map((t) => Math.round(t.getBoundingClientRect().width)).join(',')" },
  ...tap, ...tap,
  { eval: '__spell.markWrong()' }, { touchEl: '[data-bot="tap"]' },
  { sleep: 120 },
  { shot: 'spell-04-slip-ipad' },
  { log: "['pos', __spell.pos(), 'slips', __spell.game.slips, 'coral tiles', document.querySelectorAll('.tile.nope').length]" },
  { touchEl: '#lookBtn' },
  { sleep: 250 },
  { shot: 'spell-05-look-again-ipad' },
  { log: "[__spell.state(), 'looked', __spell.game.looked]" },
  { waitFor: "__spell.state() === 'spell'", timeout: 4000 },
  ...tap, ...tap, ...tap, ...tap, ...tap, ...tap, ...tap,
  { sleep: 250 },
  { shot: 'spell-06-done-ipad' },
  { log: "[__spell.state(), JSON.stringify(__spell.game.results[0]), __spell.Speech.said.slice(-1)[0]]" },
  { waitFor: "__spell.state() === 'look'", timeout: 6000 },
  { touchEl: '#pauseBtn' },
  { sleep: 400 },
  { shot: 'spell-07-pause-ipad' },
  { touchEl: '#resumeBtn' },
  { sleep: 200 },
  { log: '__spell.state()' },
  { eval: FINISH },
  { sleep: 600 },
  { shot: 'spell-08-results-ipad' },
  { touchEl: '#againBtn' },
  { sleep: 350 },
  { log: "['toast', document.getElementById('toast').textContent, __spell.game.remix]" },
  { shot: 'spell-09-remix-ipad' },
  { touchEl: '#pauseBtn' }, { sleep: 300 }, { touchEl: '#homeBtn' }, { sleep: 400 },
  { log: "['home again', __spell.state(), document.getElementById('homeStats').innerText.replace(/\\n+/g, ' ')]" },
  { log: 'JSON.stringify(window.__errs)' },

  // iPad portrait
  { viewport: [820, 1180, true, false, 2] },
  { reload: true }, { sleep: 700 },
  { shot: 'spell-10-home-portrait' },
  { eval: "__spell.start('numbers', 'medium', ['seventy-seven']); 'go'" }, { sleep: 400 },
  { shot: 'spell-11-look-portrait' },
  { waitFor: "__spell.state() === 'spell'", timeout: 9000 }, { sleep: 450 },
  { shot: 'spell-12-spell-portrait' }, fits,
  ...spellNow('tricky', 'hard', 'different'),
  { shot: 'spell-13-tricky-portrait' }, fits,

  // phone
  { viewport: [390, 844, true, false, 3] },
  { reload: true }, { sleep: 700 },
  { shot: 'spell-14-home-phone' },
  { log: "[document.getElementById('screens').scrollHeight, innerHeight, document.documentElement.scrollWidth <= innerWidth]" },
  ...spellNow('numbers', 'medium', 'seventy-seven'),
  { shot: 'spell-15-hyphen-phone' }, fits,
  ...spellNow('animals', 'hard', 'caterpillar'),
  { shot: 'spell-16-long-phone' }, fits,
  ...spellNow('tricky', 'hard', 'temperature'),
  { shot: 'spell-17-tricky-phone' }, fits,
  { eval: "__spell.save.settings.mathLevel = 'genius'; __spell.start('numbers', 'hard'); 'sum'" }, { sleep: 400 },
  { shot: 'spell-18-sum-phone' }, fits,
  { log: "[__spell.game.word.pic, __spell.word(), __spell.Speech.said.slice(-1)[0]]" },

  // dark
  { viewport: [1180, 820, true, true, 2] },
  { reload: true }, { sleep: 700 },
  { shot: 'spell-20-home-dark' },
  ...spellNow('food', 'hard', 'watermelon'),
  ...tap, ...tap,
  { eval: '__spell.markWrong()' }, { touchEl: '[data-bot="tap"]' }, { sleep: 120 },
  { shot: 'spell-21-spell-dark' }, fits,
  { eval: FINISH }, { sleep: 600 },
  { shot: 'spell-22-results-dark' },
  { viewport: [390, 844, true, true, 3] },
  ...spellNow('tricky', 'medium', 'through'),
  { shot: 'spell-23-tricky-phone-dark' }, fits,

  // calm mode (the arcade's calm setting / reduced motion): no shakes, flips or sparkles
  { viewport: [1180, 820, true, false, 2] },
  { eval: "(() => { const d = JSON.parse(localStorage.getItem('number-dash.v1') || '{}'); d.settings = Object.assign(d.settings || {}, { calm: true }); localStorage.setItem('number-dash.v1', JSON.stringify(d)); return 'calm on'; })()" },
  { reload: true }, { sleep: 500 },
  ...spellNow('animals', 'easy', 'frog'),
  { eval: '__spell.markWrong()' }, { touchEl: '[data-bot="tap"]' }, { sleep: 60 },
  { log: "[document.body.classList.contains('calm'), getComputedStyle(document.querySelector('.tile.nope')).animationName, document.querySelectorAll('.spark').length]" },
  { log: 'JSON.stringify(window.__errs)' },
  { eval: "localStorage.clear(); 'cleared'" }
];
