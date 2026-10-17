// Spell It: a bot plays a full round of every deck at every level (run from the repo root):
//   node games/spell/build.js && ND_CDP=9361 ND_PROFILE=edge-profile-spell ND_URL=file:///D:/Github/number-dash/games/spell/dist/preview.html ND_READY='!!window.__spell' ND_BOT=none node games/dash/playtest/shoot.js games/spell/playtest/rounds.js
// Each round: word 3 gets one wrong tile first (refused, counted as a slip), word 5 uses Look again, every other
// letter is right. Checks per word: the layout fits, the right tile is always there, the word was read aloud,
// and per round: 8 perfect = 2 stars, the results lists, the "♪ remix" toast on every round after the first.
// Then: a perfect round (3 stars), a slippy one (1 star), a Listen only round on IELTS Hard (no look, no look again, its own record), a capital typed in small letters,
// a homophone typed with the other spelling (refused), a rule card, missed words coming back, a keyboard, a pause, the records.
const PLAY = `(async () => {
  const S = __spell, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, what, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > (ms || 20000)) throw new Error('timeout: ' + what); await sleep(10); } };
  // plays the round already started; slipAt / lookAt: word numbers (0-9) for a slip and a look again
  window.__playRound = async (slipAt, lookAt, speed) => {
    S.setSpeed(speed || 30);
    const r = { words: [], problems: [], toast: document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent };
    for (let k = 0; k < 10; k++) {
      await waitFor(() => (S.state() === 'look' || S.state() === 'spell') && S.game.i === k, 'word ' + k);
      const w = S.word();
      if (k === 0) r.firstState = S.state();
      if (S.game.listen && (S.state() !== 'spell' || Array.from(document.querySelectorAll('#word .box')).some((b) => b.textContent))) r.problems.push('listen only showed ' + w);
      const f1 = S.fits(); if (f1.length) r.problems.push(w + ' (' + S.state() + '): ' + f1.join('; '));
      await waitFor(() => S.state() === 'spell', 'spell ' + w);
      const f2 = S.fits(); if (f2.length) r.problems.push(w + ' (spell): ' + f2.join('; '));
      if (k === slipAt || (Array.isArray(slipAt) && slipAt.indexOf(k) >= 0)) {
        const i = S.wrongIndex();
        S.tap(i);
        if (S.game.slips !== 1 || S.pos() !== 0) r.problems.push('slip on ' + w + ': slips ' + S.game.slips + ', pos ' + S.pos());
        if (!S.game.tiles[i].el.classList.contains('nope')) r.problems.push('wrong tile did not go coral on ' + w);
      }
      if (k === lookAt) {
        S.lookAgain();
        if (S.state() !== 'peek' || document.querySelectorAll('#word .box.peek').length !== w.length) r.problems.push('look again did not show ' + w);
        await waitFor(() => S.state() === 'spell', 'peek end ' + w);
        if (document.querySelectorAll('#word .box.peek').length) r.problems.push('peek letters left on ' + w);
      }
      let guard = 0;
      while (S.state() === 'spell' && guard++ < 40) {
        const i = S.nextIndex();
        if (i < 0) { r.problems.push('no tile for "' + w[S.pos()] + '" in ' + w + ' [' + S.tiles().map((t) => t.ch).join('') + ']'); break; }
        S.tap(i);
      }
      if (S.state() !== 'done') r.problems.push('not done: ' + w + ' ' + S.state());
      if (document.querySelectorAll('#word .box.win').length !== w.length) r.problems.push('boxes not mint on ' + w);
      const said = S.Speech.said.slice(-6).join(' | ');
      if (said.indexOf(w) < 0) r.problems.push('not read aloud: ' + w + ' [' + said + ']');
      r.words.push(w);
    }
    await waitFor(() => S.state() === 'results', 'results');
    r.perfect = S.game.results.filter((x) => x.perfect).length;
    r.stars = S.game.lastStars;
    r.lists = [document.querySelectorAll('#perfectList .wchip').length, document.querySelectorAll('#missList .wchip').length];
    if (document.getElementById('s-done').hidden) r.problems.push('results screen hidden');
    if (r.lists[0] !== r.perfect || r.lists[0] + r.lists[1] !== 10) r.problems.push('results lists ' + r.lists.join('+'));
    return r;
  };
  const decks = S.DECK_IDS, levels = ['easy', 'medium', 'hard'], out = [];
  let n = 0;
  for (const d of decks) for (const l of levels) {
    const before = S.save.math.wrong;
    S.start(d, l);
    const r = await window.__playRound(2, 4);
    n++;
    if (n > 1 && r.toast.indexOf('♪ ') !== 0) r.problems.push('no remix toast: "' + r.toast + '"');
    if (r.perfect !== 8 || r.stars !== 2) r.problems.push('perfect ' + r.perfect + ', stars ' + r.stars);
    if (d === 'numbers' && l === 'hard' && S.save.math.wrong - before !== 2) r.problems.push('math wrong +' + (S.save.math.wrong - before));
    out.push(d + '/' + l + ': ' + r.perfect + ' perfect, ' + r.stars + '★, ' + (r.toast || 'first round') + ' | ' + r.words.slice(0, 5).join(' ') + ' …' + (r.problems.length ? ' | PROBLEMS: ' + r.problems.join(' / ') : ''));
  }
  return out;
})()`;

const MORE = `(async () => {
  const S = __spell, out = {}, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // records after the 27 rounds
  out.records = { rounds: S.rec.rounds, learned: S.rec.learned.length, missed: S.rec.missed.length, perfect: S.rec.perfect, best: S.rec.best, mathTricky: S.save.math.tricky.length };
  // a perfect round, then one with a slip on 5 words
  S.start('animals', 'medium');
  let r = await window.__playRound(-1, -1);
  out.perfectRound = r.perfect + ' perfect, ' + r.stars + '★' + (r.problems.length ? ' ' + r.problems.join('/') : '');
  S.start('food', 'medium');
  r = await window.__playRound([0, 2, 4, 6, 8], -1);
  out.slippyRound = r.perfect + ' perfect, ' + r.stars + '★' + (r.problems.length ? ' ' + r.problems.join('/') : '');
  // Listen only: the word is never shown, Look again does nothing, the results say so, its own best
  S.setListen(true);
  S.start('ielts', 'hard');
  S.setSpeed(30);
  while (S.state() !== 'spell') await sleep(10);
  S.lookAgain();
  const refused = S.state() === 'spell' && !S.game.looked && document.getElementById('lookBtn').disabled;
  r = await window.__playRound(2, -1);
  out.listenRound = { deck: 'ielts/hard', firstState: r.firstState, lookAgainRefused: refused, perfect: r.perfect, stars: r.stars, note: document.getElementById('doneNote').textContent,
    best: S.rec.best[S.bestKey('ielts', 'hard', true)], chip: document.getElementById('deckChip').textContent, problems: r.problems };
  S.setListen(false);
  // a capital: "Wednesday" typed on a keyboard in small letters still fills the capital W tile
  S.start('ielts', 'easy', ['Wednesday']);
  while (S.state() !== 'spell') await sleep(10);
  const cap = S.tiles().map((t) => t.ch).join('');
  'wednesday'.split('').forEach((c) => window.dispatchEvent(new KeyboardEvent('keydown', { key: c, bubbles: true })));
  out.capital = { tiles: cap, state: S.state(), slips: S.game.results.length ? S.game.results[S.game.results.length - 1].slips : S.game.slips, card: document.querySelector('.deck[data-deck="ielts"]').innerText.replace(/\\n+/g, ' / ') };
  // a homophone: "there" with every sound-alike buildable, typed as "their" -> the i is refused
  S.start('homophones', 'medium', ['there']);
  while (S.state() !== 'spell') await sleep(10);
  const tl = S.tiles().map((t) => t.ch).join('');
  const key = (k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  key('t'); key('h'); key('e'); key('i'); const afterI = { pos: S.pos(), slips: S.game.slips }; key('r'); key('e');
  out.homophone = { tiles: tl, afterI, state: S.state(), said: S.Speech.said.slice(-1)[0] };
  // a rule card: "stop + ed" -> stopped
  S.start('endings', 'medium', ['stopped']);
  out.rule = { card: document.getElementById('pic').innerText.replace(/\\n+/g, ' / '), said: S.Speech.said.slice(-1)[0], fits: S.fits() };
  S.goHome();
  // missed words come back now and then
  let back = 0, rounds = 0;
  const missedHere = S.rec.missed.filter((m) => m.d === 'around' && m.l === 'hard').map((m) => m.w);
  for (let i = 0; i < 6; i++) { S.start('around', 'hard'); rounds++; back += S.game.words.filter((w) => w.again).length; S.goHome(); }
  out.missedBack = back + ' missed words came back in ' + rounds + ' rounds (missed list: ' + missedHere.join(', ') + ')';
  // a keyboard: right letters go in, a wrong one is a slip
  S.start('animals', 'easy', ['frog']);
  S.setSpeed(30);
  while (S.state() !== 'spell') await sleep(10);
  key('f'); key('r'); const t = S.tiles().find((x) => !x.used && x.ch !== 'o'); key(t.ch); key('o'); key('g');
  out.keyboard = { state: S.state(), slips: S.game.results.length ? S.game.results[0].slips : S.game.slips, word: S.word() };
  // pause holds the clock
  S.goHome(); S.start('food', 'easy'); S.setSpeed(1);
  await sleep(200);
  S.pause(); const t0 = S.game.t; await sleep(500);
  out.pause = { state: S.state(), clockHeld: S.game.t === t0, screen: !document.getElementById('s-pause').hidden };
  S.resume(); await sleep(300);
  out.resume = { state: S.state(), clockRuns: S.game.t > t0 };
  S.goHome();
  out.home = { learned: document.getElementById('homeStats').innerText.replace(/\\n+/g, ' ') };
  return out;
})()`;

module.exports = [
  { eval: "localStorage.clear(); 'cleared'" },
  { reload: true },
  { viewport: [1180, 820, false, false, 1] },
  { eval: PLAY },
  { sleep: 400 },
  { shot: 'spell-r01-results' },
  { eval: MORE },
  { log: "__spell.Speech.said.slice(-6)" },
  { log: 'JSON.stringify(window.__errs)' },
  { eval: "localStorage.clear(); 'cleared'" }
];
