// Memory Lane on an emulated iPad and a phone, by finger (run from the repo root):
//   node games/memory/build.js && ND_CDP=9501 ND_PROFILE=edge-profile-memory-wt ND_URL=file:///D:/Github/number-dash-memory/games/memory/dist/preview.html ND_READY='!!window.__memory' ND_BOT=none node games/dash/playtest/shoot.js games/memory/playtest/ipad.js
// Landscape iPad: the home card, Numbers picked and played by finger (a right answer, a wrong one with its kind
// feedback, pause and resume), Words (picture cards tapped in order), Grid (a square lit on show, then tapped back,
// Undo). Portrait iPad: the home card, the longest number span (9 boxes), Words on Genius with 12 cards and long
// words, a 4 x 4 grid answered by finger. A 390 x 844 phone: the same three at their biggest, then Backwards switched
// on by finger and a backwards round answered last one first. A dark phone: home, Words, a whole round to the results
// card, Play again (a new remix). A dark landscape iPad: a 4 x 4 grid on show and the results card. Calm mode: no pop-in.
// Every stop checks the layout with __memory.fits(): nothing scrolls, nothing outside the screen, pad buttons 56 px or
// more, menu buttons 48 px or more, no text cut off, the parts in order without overlapping. Problems go to
// window.__P; the last line says PASS or FAIL.
const HELP = "window.__P = []; window.__fit = (tag) => { const f = __memory.fits(); if (f.length) window.__P.push(tag + ': ' + f.join('; ')); return f.length ? f : 'fits'; };" +
  " window.__ok = (tag, want) => { const l = __memory.game.log, x = l[l.length - 1]; if (!x || x.ok !== want) window.__P.push(tag + ': answer ' + (x && x.ok) + ', wanted ' + want); return x ? [x.seq.join(' '), x.ans.join(' '), x.ok] : null; }; 'help ok'";
const fit = (tag) => ({ log: 'window.__fit(' + JSON.stringify(tag) + ')' });
const ok = (tag, want) => ({ log: 'window.__ok(' + JSON.stringify(tag) + ', ' + want + ')' });
const tapNext = [{ eval: '__memory.markNext()' }, { touchEl: '[data-bot="tap"]' }, { sleep: 70 }];
const tapWrong = [{ eval: '__memory.markWrong()' }, { touchEl: '[data-bot="tap"]' }, { sleep: 70 }];
const taps = (n, t) => Array.from({ length: n }, () => t || tapNext).flat();
const answer = { waitFor: "__memory.state() === 'answer'", timeout: 30000 };
const lit = { waitFor: "__memory.state() === 'show' && __memory.game.lit && __memory.game.shown >= 1", timeout: 20000 };
// pause and Home by finger (from play)
const toHome = [{ touchEl: '#pauseBtn' }, { sleep: 350 }, { touchEl: '#homeBtn' }, { sleep: 500 }];
const pickPlay = (mode) => [{ touchEl: '.mode[data-mode="' + mode + '"] > span' }, { sleep: 150 }, { touchEl: '#playBtn' }];
// a round at a given span, quickly to the answer, then normal speed for the picture
const startAt = (mode, o) => [
  { eval: "(() => { __memory.start('" + mode + "', " + JSON.stringify(o) + '); __memory.setSpeed(5); return [__memory.span(), __memory.game.gridN]; })()' },
  answer, { eval: "__memory.setSpeed(1); 'normal'" }, { sleep: 350 }
];
const FINISH = "(async () => { const M = __memory, sleep = (ms) => new Promise((r) => setTimeout(r, ms)); M.setSpeed(10);" +
  " for (let g = 0; g < 20000 && M.state() !== 'done'; g++) { if (M.state() === 'answer') M.expected().forEach((v) => M.tap(v)); await sleep(5); }" +
  " M.setSpeed(1); return [M.state(), M.game.result.longest, M.game.result.stars]; })()";
const DONE = "[document.getElementById('doneTitle').textContent, document.getElementById('doneNote').textContent, document.getElementById('doneStats').innerText.replace(/\\n/g, ' '), document.getElementById('doneNext').textContent]";

module.exports = [
  { eval: "localStorage.clear(); 'cleared'" },
  { ipad: true },
  { viewport: [1180, 820, true, false, 2] },
  { reload: true }, { sleep: 900 },
  { eval: HELP },
  { shot: 'mem-i01-home-ipad' }, fit('home, iPad landscape'),
  { log: "[matchMedia('(pointer: coarse)').matches, navigator.userAgent.indexOf('iPad') > 0, Math.round(document.querySelector('#s-home .card').getBoundingClientRect().height)]" },
  // Numbers by finger
  ...pickPlay('number'),
  lit, { shot: 'mem-i02-number-show-ipad' },
  { log: "[__memory.state(), document.getElementById('show').textContent, document.querySelectorAll('#slots .slot.seen').length, document.getElementById('pad').className]" },
  answer, { sleep: 300 }, { shot: 'mem-i03-number-answer-ipad' }, fit('number answer, iPad landscape'),
  ...taps(3), ok('number by finger', true), { sleep: 150 }, { shot: 'mem-i04-number-right-ipad' },
  answer, ...taps(3, tapWrong), ok('number wrong by finger', false), { sleep: 300 },
  { shot: 'mem-i05-number-nearly-ipad' }, fit('number nearly, iPad landscape'), { log: "document.getElementById('phase').textContent" },
  answer, { touchEl: '#pauseBtn' }, { sleep: 400 }, { shot: 'mem-i06-pause-ipad' }, fit('pause card'),
  { touchEl: '#resumeBtn' }, { sleep: 200 }, { log: '__memory.state()' },
  // Words by finger
  ...toHome, ...pickPlay('word'),
  lit, { shot: 'mem-i07-word-show-ipad' }, fit('word show, iPad landscape'),
  answer, { sleep: 300 }, { shot: 'mem-i08-word-answer-ipad' }, fit('word answer, iPad landscape'),
  ...taps(3), ok('words by finger', true), { sleep: 150 }, { shot: 'mem-i09-word-right-ipad' },
  // Grid by finger, with Undo
  ...toHome, ...pickPlay('grid'),
  lit, { shot: 'mem-i10-grid-show-ipad' }, { log: "document.querySelectorAll('.cell.lit').length" },
  answer, fit('grid answer, iPad landscape'),
  ...taps(1), { touchEl: '#undoBtn' }, { sleep: 100 }, { log: "['after undo', __memory.ans().length, document.querySelectorAll('.cell.picked').length]" },
  { eval: "(__memory.ans().length || document.querySelectorAll('.cell.picked').length) && window.__P.push('undo by finger'); 'checked'" },
  ...taps(2), { shot: 'mem-i11-grid-picking-ipad' }, ...taps(1), ok('grid by finger', true),

  // portrait iPad
  { viewport: [820, 1180, true, false, 2] }, { sleep: 400 },
  ...toHome, { shot: 'mem-i12-home-portrait' }, fit('home, iPad portrait'),
  ...startAt('number', { level: 'explorer', back: false, span: 9 }), { shot: 'mem-i13-number9-portrait' }, fit('number 9, iPad portrait'),
  ...startAt('word', { level: 'genius', back: false, span: 7 }), { shot: 'mem-i14-word-genius-portrait' }, fit('word genius 7, iPad portrait'),
  { log: "[__memory.cards().join(' '), getComputedStyle(document.getElementById('play')).getPropertyValue('--cf')]" },
  ...taps(7), ok('word genius 7 by finger', true),
  ...startAt('grid', { level: 'explorer', back: false, span: 6 }), { shot: 'mem-i15-grid4-portrait' }, fit('grid 4x4, iPad portrait'),
  ...taps(6), ok('grid 4x4 by finger', true),

  // a phone
  { viewport: [390, 844, true, false, 3] }, { sleep: 400 },
  ...toHome, { shot: 'mem-i16-home-phone' }, fit('home, phone'),
  ...startAt('number', { level: 'explorer', back: false, span: 9 }), { shot: 'mem-i17-number9-phone' }, fit('number 9, phone'),
  ...taps(9), ok('number 9 by finger on a phone', true), { sleep: 150 }, { shot: 'mem-i18-number9-right-phone' },
  ...startAt('word', { level: 'genius', back: false, span: 7 }), { shot: 'mem-i19-word-genius-phone' }, fit('word genius 7, phone'),
  ...taps(7), ok('word genius 7 by finger on a phone', true),
  ...startAt('word', { level: 'starter', back: false, span: 5 }), { shot: 'mem-i20-word-starter-phone' }, fit('word starter 5 (10 cards), phone'),
  ...startAt('grid', { level: 'explorer', back: false, span: 7 }), { shot: 'mem-i21-grid4-phone' }, fit('grid 4x4, phone'),
  ...taps(7), ok('grid 4x4 by finger on a phone', true),
  // Backwards by finger: the toggle on the home card, then a backwards round
  ...toHome, { touchEl: '#backBtn' }, { sleep: 150 }, { shot: 'mem-i22-home-backwards-phone' }, fit('home backwards, phone'),
  { log: "[__memory.rec.back, document.getElementById('backBtn').textContent, document.getElementById('modeNote').textContent]" },
  ...pickPlay('number'), answer, { sleep: 250 },
  { shot: 'mem-i23-backwards-answer-phone' }, fit('backwards answer, phone'),
  { log: "[document.getElementById('phase').textContent, document.getElementById('spanChip').textContent, __memory.seq().join(''), __memory.expected().join('')]" },
  { eval: "(document.getElementById('phase').textContent.indexOf('last one first') < 0 || __memory.span() !== 2) && window.__P.push('backwards round by finger'); 'checked'" },
  ...taps(2), ok('backwards by finger', true),
  ...toHome, { touchEl: '#backBtn' }, { sleep: 150 }, { log: '__memory.rec.back' },

  // a dark phone
  { viewport: [390, 844, true, true, 3] }, { sleep: 400 },
  { shot: 'mem-i24-home-phone-dark' }, fit('home, dark phone'),
  ...pickPlay('word'), lit, { shot: 'mem-i25-word-show-phone-dark' }, fit('word show, dark phone'),
  answer, { sleep: 250 }, { shot: 'mem-i26-word-answer-phone-dark' }, fit('word answer, dark phone'),
  { log: FINISH }, { sleep: 1400 },
  { shot: 'mem-i27-done-phone-dark' }, fit('results, dark phone'), { log: DONE },
  { touchEl: '#againBtn' }, { sleep: 250 },
  { log: "[__memory.state(), document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent]" },
  { shot: 'mem-i28-again-phone-dark' },
  { eval: "document.getElementById('toast').textContent.indexOf('♪ ') !== 0 && window.__P.push('no remix toast'); 'checked'" },

  // a dark landscape iPad: a 4 x 4 grid on show, then the results card
  { viewport: [1180, 820, true, true, 2] }, { sleep: 400 },
  { eval: "(() => { __memory.start('grid', { level: 'genius', back: false, span: 5 }); return __memory.game.gridN; })()" },
  lit, { shot: 'mem-i29-grid4-show-ipad-dark' }, answer, fit('grid 4x4, dark iPad'),
  ...taps(2), ...taps(3, tapWrong), { sleep: 300 }, { shot: 'mem-i30-grid4-nearly-ipad-dark' },
  { log: FINISH }, { sleep: 1400 },
  { shot: 'mem-i31-done-ipad-dark' }, fit('results, dark iPad'), { log: DONE },
  // calm mode (the shared setting, on by default with reduced motion): no pop-in on the show card
  { eval: "(() => { __memory.save.settings.calm = true; __memory.start('number', { level: 'explorer', back: false, span: 3 }); return document.body.classList.contains('calm'); })()" },
  lit, { log: "document.querySelectorAll('#show .in').length" },
  { eval: "(!document.body.classList.contains('calm') || document.querySelectorAll('#show .in').length) && window.__P.push('calm mode'); __memory.save.settings.calm = false; __memory.goHome(); 'home'" },

  { log: 'JSON.stringify(window.__errs)' },
  { log: "(window.__P.length || (window.__errs || []).length) ? 'FAIL ' + JSON.stringify(window.__P) : 'PASS: no problems'" }
];
