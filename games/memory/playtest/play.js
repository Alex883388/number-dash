// Memory Lane: a bot plays a full round of every game at every level (run from the repo root):
//   node games/memory/build.js && ND_CDP=9501 ND_PROFILE=edge-profile-memory-wt ND_URL=file:///D:/Github/number-dash-memory/games/memory/dist/preview.html ND_READY='!!window.__memory' ND_BOT=none node games/dash/playtest/shoot.js games/memory/playtest/play.js
// Checks: opening the page writes nothing, and picking a game writes the records only (the day is not marked).
// 3 games x 3 levels, every answer right: spans 3 3 4 4 5 5 6 6 7 7, the longest 7, 3 stars, the layout fits at every
// answer, numbers and words read aloud, words from the level's list with look-alike cards, the grid 4 x 4 from its span,
// the pace per item. Then wrong answers: 2 wrong in a row take the span back down, the feedback is kind (the right order
// shown, no buzz, no harsh words); Backwards (reversed order, its own record, starts at 2); the 2-minute cap; a pause
// while the items are on show (they are shown again); the keyboard (digits, Backspace); a mouse click; the next round
// starting two below the best; Play again with a new remix; the records in storage. Every problem is collected in
// window.__P and the last line says PASS or FAIL.
const LIB = `(() => {
  const M = window.__memory;
  window.__P = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, what, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > (ms || 30000)) throw new Error('timeout: ' + what); await sleep(4); } };
  const P = (msg) => { window.__P.push(msg); return msg; };
  // a spy on the shared sounds: a wrong answer must never buzz
  window.__sfx = [];
  for (const k of Object.keys(M.Sound.sfx)) { const f = M.Sound.sfx[k]; M.Sound.sfx[k] = function () { window.__sfx.push(k); return f.apply(this, arguments); }; }
  const sibsOf = (w, lv) => { const f = M.WORDS[lv].find((x) => x.some((y) => y.w === w)); return f ? f.map((y) => y.w) : []; };
  // the checks on a sequence waiting for its answer
  function checkSeq(k, out) {
    const g = M.game, seq = g.seq, n = seq.length, tag = g.mode + '/' + g.lv + ' seq ' + k + ': ';
    if (n !== g.span) P(tag + 'length ' + n + ' but span ' + g.span);
    if (new Set(seq).size !== n) P(tag + 'an item twice: ' + seq.join(' '));
    const f = M.fits(); if (f.length) P(tag + f.join('; '));
    const per = M.period(g.mode, n, g.lv); if (Math.abs(g.per - per) > 1e-9) P(tag + 'pace ' + g.per + ' not ' + per);
    if (g.per < 0.7 || g.per > 1.6) P(tag + 'pace ' + g.per + ' s an item');
    if (g.mode === 'number') {
      if (document.querySelectorAll('#pad .key').length !== 10) P(tag + 'number pad keys');
      for (let i = 2; i < n; i++) { const a = +seq[i - 2], b = +seq[i - 1], c = +seq[i]; if ((b - a === 1 && c - b === 1) || (a - b === 1 && b - c === 1)) P(tag + 'a counting run ' + seq.join('')); }
    }
    if (g.mode === 'word') {
      const cards = M.cards(), want = Math.min(12, Math.max(6, 2 * n));
      if (cards.length !== want) P(tag + cards.length + ' cards, not ' + want);
      if (new Set(cards).size !== cards.length) P(tag + 'a card twice');
      if (!seq.every((w) => cards.indexOf(w) >= 0)) P(tag + 'a shown word is not on the cards');
      const level = M.WORDS[g.lv].flat().map((x) => x.w);
      if (!cards.every((w) => level.indexOf(w) >= 0)) P(tag + 'a card from another level');
      const look = cards.filter((w) => seq.indexOf(w) < 0 && seq.some((s) => sibsOf(s, g.lv).indexOf(w) >= 0)).length;
      if (look < Math.min(n, want - n)) P(tag + 'only ' + look + ' look-alike cards');
      if (document.querySelectorAll('#pad .wcard').length !== cards.length) P(tag + 'cards drawn');
    }
    if (g.mode === 'grid') {
      const N = n >= ({ starter: 6, explorer: 5, genius: 4 })[g.lv] ? 4 : 3;
      if (g.gridN !== N) P(tag + 'grid ' + g.gridN + ' not ' + N);
      if (document.querySelectorAll('#pad .cell').length !== N * N) P(tag + 'cells drawn');
      if (!seq.every((v) => +v >= 0 && +v < N * N)) P(tag + 'a square outside the grid');
    }
    if ((g.mode === 'number' || g.mode === 'word') && M.save.settings.speak && M.Speech.ok && !seq.every((v) => M.Speech.said.indexOf(v) >= 0)) P(tag + 'not all read aloud');
    if (document.querySelectorAll('#pad.off, #pad.wait').length) P(tag + 'pad still off at the answer');
  }
  // plays the round already started. plan(k) -> 'right' | 'wrong' | 'click' (right, by mouse clicks); after(k, how) runs in the feedback
  window.__playRound = async (plan, after, speed) => {
    M.setSpeed(speed || 10);
    const out = { spans: [], oks: [], toasts: [] };
    for (let k = 0; k < 40; k++) {
      await waitFor(() => M.state() === 'answer' || M.state() === 'done', 'answer ' + k);
      if (M.state() === 'done') break;
      const t = document.getElementById('toast'); if (!t.hidden) out.toasts.push(t.textContent);
      checkSeq(k, out);
      out.spans.push(M.game.seq.length);
      const how = plan ? plan(k) : 'right', want = M.expected();
      if (how === 'wrong') { for (let g = 0; g < 20 && M.state() === 'answer'; g++) M.tap(M.wrongItem()); }
      else if (how === 'click') want.forEach((v) => M.click(v));
      else want.forEach((v) => M.tap(v));
      if (M.state() !== 'feedback') P('no feedback after the answer (' + M.state() + ')');
      out.oks.push(M.game.log[M.game.log.length - 1].ok);
      if (after) after(k, how);
      await waitFor(() => M.state() !== 'feedback', 'feedback ' + k);
    }
    M.setSpeed(1);
    out.result = M.game.result;
    return out;
  };
  window.__T = { M, P, sleep, waitFor };
  return 'lib ok';
})()`;

const today = "(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })()";

// opening the page writes nothing; picking a game or Backwards writes the records only
const OPEN = `(async () => {
  const { M, P, sleep } = window.__T;
  await sleep(1200);
  if (localStorage.length) P('opening the page wrote ' + Object.keys(localStorage).join(', '));
  document.querySelector('.mode[data-mode="word"] > span').click();
  await sleep(50);
  const r = JSON.parse(localStorage.getItem('memory-lane.v1') || 'null');
  if (!r || r.mode !== 'word') P('picking Words did not keep it');
  if (localStorage.getItem('arcade-days.v1') || localStorage.getItem('number-dash.v1')) P('picking a game marked the day or wrote the shared save');
  document.getElementById('backBtn').click(); const on = M.rec.back; document.getElementById('backBtn').click();
  if (!on || M.rec.back) P('the Backwards toggle');
  if (localStorage.getItem('arcade-days.v1')) P('the Backwards toggle marked the day');
  document.querySelector('.mode[data-mode="number"] > span').click();
  const f = M.fits(); if (f.length) P('home: ' + f.join('; '));
  return [Object.keys(localStorage), document.getElementById('modeNote').textContent, Math.round(document.querySelector('#s-home .card').getBoundingClientRect().height)];
})()`;

// every game at every level, all right
const ALL_RIGHT = `(async () => {
  const { M, P } = window.__T, lines = [];
  for (const lv of M.LEVELS) for (const mode of ['number', 'word', 'grid']) {
    M.rec.best[mode] = 0;   // each starts at 3
    M.start(mode, { level: lv, back: false });
    const said0 = M.Speech.said.slice(-1)[0];
    const r = await window.__playRound();
    const res = r.result, tag = mode + '/' + lv + ': ';
    const want = r.spans.map((_, k) => Math.min(M.MODES[mode].max, 3 + Math.floor(k / 2)));
    if (r.spans.length !== 10) P(tag + r.spans.length + ' sequences, not 10 (time ' + Math.round(res && res.time) + ' s)');
    if (r.spans.join() !== want.join()) P(tag + 'spans ' + r.spans.join(' ') + ' not ' + want.join(' '));
    if (!r.oks.every(Boolean)) P(tag + 'a right answer was not taken');
    if (!res || res.longest !== 7 || res.stars !== 3 || res.right !== 10) P(tag + 'result ' + JSON.stringify(res));
    if (M.rec.best[mode] !== 7) P(tag + 'best ' + M.rec.best[mode]);
    const saved = JSON.parse(localStorage.getItem('memory-lane.v1'));
    if (!saved || saved.best[mode] !== 7) P(tag + 'best not saved');
    if (document.getElementById('s-done').hidden) P(tag + 'no results card');
    if (document.getElementById('doneStars').querySelectorAll('span:not(.off)').length !== 3) P(tag + 'results stars');
    const fd = M.fits(); if (fd.length) P(tag + 'results card: ' + fd.join('; '));
    if (r.toasts.filter((t) => t.indexOf('in a row') >= 0).length < 3) P(tag + 'span-up toasts ' + JSON.stringify(r.toasts));
    lines.push(tag + 'spans ' + r.spans.join(' ') + ' · ' + res.stars + ' stars · ' + Math.round(res.time) + ' s · said ' + said0);
  }
  const days = JSON.parse(localStorage.getItem('arcade-days.v1') || '{}');
  if (!days[${today}]) P('the day was not marked after play');
  return lines;
})()`;

// wrong answers: the span goes down after 2 wrong in a row; the feedback is kind
const KIND = `window.__kind = (k, how) => {
  const { M, P } = window.__T, g = M.game, want = M.expected(), ph = document.getElementById('phase'), tag = g.mode + ' wrong ' + k + ': ';
  if (how !== 'wrong') return;
  if (g.log[g.log.length - 1].ok) P(tag + 'a wrong answer was taken as right');
  if (!/^(Nearly|Good try|So close)!/.test(ph.lastChild.textContent.trim())) P(tag + 'phase says ' + ph.textContent);
  if (/wrong|fail|bad|oops|no!|sorry/i.test(ph.textContent + document.getElementById('toast').textContent)) P(tag + 'a harsh word');
  if (!ph.classList.contains('near')) P(tag + 'phase style ' + ph.className);
  if (document.querySelectorAll('.nope, .coral, .bad').length) P(tag + 'a red mark');
  if (window.__sfx.indexOf('wrong') >= 0 || window.__sfx.indexOf('die') >= 0) P(tag + 'a fail sound: ' + window.__sfx.join(','));
  const slots = Array.from(document.querySelectorAll('#slots .slot'));
  if (slots.length !== want.length || !slots.every((s) => s.classList.contains('fix') || s.classList.contains('good'))) P(tag + 'the boxes do not show the right order');
  if (g.mode === 'number') {
    if (slots.map((s) => s.textContent).join('') !== want.join('')) P(tag + 'boxes ' + slots.map((s) => s.textContent).join('') + ' not ' + want.join(''));
    if (document.getElementById('show').textContent.trim() !== want.join('')) P(tag + 'the show card does not show the right order');
  }
  if (g.mode === 'word') want.forEach((v, i) => { const c = document.querySelector('.wcard[data-v="' + v + '"] .n'); if (!c || c.textContent !== String(i + 1)) P(tag + 'card ' + v + ' not numbered ' + (i + 1)); });
  if (g.mode === 'grid') want.forEach((v, i) => { const c = document.querySelector('.cell[data-v="' + v + '"]'); if (!c.classList.contains('fix') || c.textContent !== String(i + 1)) P(tag + 'square ' + v + ' not numbered ' + (i + 1)); });
  window.__kindSeen = (window.__kindSeen || 0) + 1;
}; 'kind ok'`;
const WRONG = `(async () => {
  const { M, P } = window.__T, lines = [];
  window.__sfx.length = 0;
  for (const mode of ['number', 'word', 'grid']) {
    M.start(mode, { level: 'explorer', back: false, span: 3 });
    // right, right (up to 4), wrong, wrong (back to 3), then right
    const r = await window.__playRound((k) => (k === 2 || k === 3 ? 'wrong' : 'right'), window.__kind);
    const tag = mode + ' wrong: ';
    if (r.spans.slice(0, 6).join() !== '3,3,4,4,3,3') P(tag + 'spans ' + r.spans.join(' '));
    if (!r.toasts.some((t) => t.indexOf("Let's try 3") === 0)) P(tag + 'no kind toast going down: ' + JSON.stringify(r.toasts));
    if (r.oks[2] || r.oks[3] || !r.oks[4]) P(tag + 'oks ' + r.oks.join());
    lines.push(tag + 'spans ' + r.spans.join(' ') + ' · longest ' + r.result.longest + ' · ' + r.result.stars + ' stars · toasts ' + r.toasts.join(' | '));
  }
  if (window.__kindSeen !== 6) P('kind checks ran ' + window.__kindSeen + ' times');
  lines.push('sounds in those rounds: ' + Array.from(new Set(window.__sfx)).join(', '));
  return lines;
})()`;

// one wrong answer in each game at normal speed, for the pictures
const nearly = (mode) => [
  { eval: `(async () => { const { M, waitFor } = window.__T; M.start('${mode}', { level: 'explorer', back: false, span: 4 }); M.setSpeed(4); await waitFor(() => M.state() === 'answer', 'answer'); M.setSpeed(1); M.tap(M.expected()[0]); M.tap(M.expected()[1]); return M.expected(); })()` },
  { shot: 'mem-p-' + mode + '-answer' },
  { eval: `(() => { const M = window.__memory; for (let g = 0; g < 20 && M.state() === 'answer'; g++) M.tap(M.wrongItem()); return [M.state(), document.getElementById('phase').textContent]; })()` },
  { sleep: 250 }, { shot: 'mem-p-' + mode + '-nearly' }
];

const BACK = `(async () => {
  const { M, P } = window.__T, lines = [];
  for (const mode of ['number', 'grid']) {
    M.rec.best[mode + '-back'] = 0;
    M.start(mode, { level: 'explorer', back: true });
    if (M.span() !== 2) P(mode + ' backwards starts at ' + M.span());
    const r = await window.__playRound((k) => {
      const g = M.game;
      if (M.expected().join() !== g.seq.slice().reverse().join()) P('backwards is not reversed');
      return 'right';
    });
    const res = r.result;
    if (r.spans.join(' ') !== '2 2 3 3 4 4 5 5 6 6') P(mode + ' backwards spans ' + r.spans.join(' '));
    if (res.longest !== 6 || res.stars !== 3 || !res.back) P(mode + ' backwards result ' + JSON.stringify(res));
    if (M.rec.best[mode + '-back'] !== 6) P(mode + ' backwards best ' + M.rec.best[mode + '-back']);
    if (M.starsFor(mode, true, 4) !== (mode === 'number' ? 2 : 3) || M.starsFor(mode, false, 4) !== (mode === 'number' ? 1 : 2)) P('backwards star lines');
    lines.push(mode + ' backwards: spans ' + r.spans.join(' ') + ' · ' + res.stars + ' stars');
  }
  // forwards taps in a backwards round are not right
  M.start('number', { back: true, span: 3 }); M.setSpeed(10);
  await window.__T.waitFor(() => M.state() === 'answer', 'answer');
  M.seq().forEach((v) => M.tap(v));
  if (M.game.log[0].ok) P('forwards order was taken in a backwards round');
  M.setSpeed(1); M.goHome();
  return lines;
})()`;

// the 2-minute cap: the sequence under way finishes, then the round ends
const CAP = `(async () => {
  const { M, P, waitFor } = window.__T;
  const plays = M.rec.plays.grid || 0;
  M.start('grid', { level: 'explorer', back: false }); M.setSpeed(10);
  await waitFor(() => M.state() === 'answer', 'answer');
  M.game.time = 119.5;
  M.expected().forEach((v) => M.tap(v));
  await waitFor(() => M.state() === 'done', 'done');
  M.setSpeed(1);
  const r = M.game.result;
  if (r.seqs !== 1 || r.time < 120) P('time cap result ' + JSON.stringify(r));
  if ((M.rec.plays.grid || 0) !== plays + 1) P('time cap round not counted');
  return [r.seqs, Math.round(r.time), document.getElementById('doneStats').innerText.replace(/\\n/g, ' ')];
})()`;

// a pause while the items are on show: they are shown again from the first; keyboard and Backspace
const PAUSE_KEYS = `(async () => {
  const { M, P, waitFor, sleep } = window.__T;
  M.start('number', { level: 'explorer', back: false }); M.setSpeed(1);
  await waitFor(() => M.state() === 'show' && M.game.shown >= 1, 'show');
  const seq = M.seq().join('');
  M.pause();
  if (M.state() !== 'pause' || !document.getElementById('play').classList.contains('away') || document.getElementById('s-pause').hidden) P('pause while showing');
  const t0 = M.game.t; await sleep(300);
  if (M.game.t !== t0) P('time ran on in the pause');
  M.resume();
  if (M.state() !== 'ready' || !M.game.replay || M.seq().join('') !== seq) P('resume did not show the items again: ' + M.state());
  M.setSpeed(8);
  await waitFor(() => M.state() === 'answer', 'answer');
  if (M.seq().join('') !== seq) P('the sequence changed after the pause');
  const key = (k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const want = M.expected(), wrong = M.wrongItem();
  key(wrong);
  if (M.ans().join() !== wrong) P('a digit key did not type');
  key('Backspace');
  if (M.ans().length !== 0) P('Backspace did not undo');
  want.forEach((d) => key(d));
  if (M.state() !== 'feedback' || !M.game.log[0].ok) P('keyboard answer ' + M.state());
  // Undo by its button (word cards un-pick)
  await waitFor(() => M.state() === 'answer', 'answer 2');
  M.tap(M.expected()[0]); document.getElementById('undoBtn').click();
  if (M.ans().length) P('the Undo button');
  // pause from the answer: back to the answer, taps kept
  M.tap(M.expected()[0]); M.pause(); M.resume();
  if (M.state() !== 'answer' || M.ans().length !== 1) P('pause in the answer lost it: ' + M.state());
  M.setSpeed(1); M.goHome();
  // a mouse click (no finger press first) answers too
  M.start('word', { level: 'genius', back: false });
  const r = await window.__playRound((k) => (k < 2 ? 'click' : 'right'));
  if (!r.oks[0] || !r.oks[1]) P('mouse clicks on word cards');
  return [seq, 'ok'];
})()`;

// later rounds start two below the best; Play again plays the next remix
const AGAIN = `(async () => {
  const { M, P, waitFor } = window.__T;
  M.rec.mode = 'number'; M.rec.back = false; M.goHome();
  if (document.getElementById('modeNote').textContent.indexOf('Starts at 5') < 0) P('home note: ' + document.getElementById('modeNote').textContent);
  M.start('number', { level: 'explorer', back: false });
  if (M.span() !== 5) P('the next round starts at ' + M.span() + ', not 5');
  await window.__playRound((k) => (k % 3 === 2 ? 'wrong' : 'right'));
  const res = M.game.result;
  document.getElementById('againBtn').click();
  const t = document.getElementById('toast');
  if (t.hidden || t.textContent.indexOf('♪ ') !== 0) P('no remix toast on Play again: ' + t.textContent);
  const out = [res.longest, res.stars, t.textContent];
  M.goHome();
  return out;
})()`;

const RECORDS = `(() => {
  const { M, P } = window.__T, r = JSON.parse(localStorage.getItem('memory-lane.v1')), s = JSON.parse(localStorage.getItem('number-dash.v1'));
  if (!r || r.best.number < 7 || r.best.word !== 7 || r.best.grid !== 7 || r.best['number-back'] !== 6 || r.best['grid-back'] !== 6) P('records best ' + JSON.stringify(r && r.best));
  if (!r || r.rounds < 17 || !(r.seqs > 150)) P('records rounds ' + (r && r.rounds) + ' seqs ' + (r && r.seqs));
  if (!r || r.stars.number !== 3 || r.stars.word !== 3 || r.stars.grid !== 3) P('records stars ' + JSON.stringify(r && r.stars));
  if (!s || !s.settings || s.settings.mathLevel !== 'explorer') P('the shared save ' + JSON.stringify(s && s.settings));
  return { best: r.best, stars: r.stars, plays: r.plays, rounds: r.rounds, seqs: r.seqs, mode: r.mode, back: r.back };
})()`;

module.exports = [
  { viewport: [1180, 820, false, false, 1] },
  { eval: "localStorage.clear(); 'cleared'" }, { reload: true }, { sleep: 600 },
  { eval: LIB }, { eval: KIND },
  { log: OPEN },
  { shot: 'mem-p01-home' }, { log: 'JSON.stringify(__memory.fits())' },
  { log: ALL_RIGHT },
  { shot: 'mem-p02-done' },
  { log: WRONG },
  ...nearly('number'), ...nearly('word'), ...nearly('grid'),
  { eval: '__memory.goHome(); "home"' },
  { log: BACK },
  { log: CAP }, { shot: 'mem-p03-done-cap' },
  { log: PAUSE_KEYS },
  { log: AGAIN },
  { log: RECORDS },
  { log: 'JSON.stringify(window.__errs)' },
  { log: "(window.__P.length || (window.__errs || []).length) ? 'FAIL ' + JSON.stringify(window.__P) : 'PASS: no problems'" }
];
