// English Quest playtest (run from the repo root):
//   node games/quest/build.js && ND_CDP=9401 ND_PROFILE=edge-profile-quest ND_URL=file:///D:/Github/number-dash/games/quest/dist/preview.html ND_READY='!!window.__quest' ND_BOT=none node games/dash/playtest/shoot.js games/quest/playtest/play.js
// The journey: level test (right up to Flyer, then wrong) -> start at Explorer -> a lesson with
// every question kind (pictures taken of each) -> all five lessons -> the stage test unlocks
// Achiever -> a lesson with mistakes fills Review -> Review clears them. Then finger taps on an
// emulated iPad, a phone and dark mode, and a sweep of every stage's lessons for page errors.
const bot = `window.__qbot = async function (rightFor, shotKinds) {
  const Q = window.__quest, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), seen = [];
  for (let guard = 0; guard < 80 && !document.getElementById('lesson').hidden; guard++) {
    const q = Q.L.qs[Q.L.i];
    if (!q) { await sleep(50); continue; }
    const kind = q.kind + ':' + (q.ref.qt || q.ref.t);
    if (!seen.includes(kind)) seen.push(kind);
    Q.answer(rightFor(Q.L.i, q));
    await sleep(40);
    Q.next();
    await sleep(30);
  }
  return { seen: seen.join(' '), right: Q.L.right, total: Q.L.total };
}; 'bot ready'`;
const reset = "localStorage.removeItem('english-quest.v1'); location.reload(); 'reset'";
const listen = "window.__errs = window.__errs || []; window.addEventListener('error', (e) => window.__errs.push(String(e.message))); 'listening'";
module.exports = [
  { viewport: [1180, 820, false, false] },
  { eval: reset }, { waitFor: '!!window.__quest', timeout: 8000 }, { sleep: 500 }, { eval: listen }, { eval: bot },
  { shot: 'quest-01-home' },
  // level test: Start on a new device runs it; right for three stages, then wrong
  { eval: "document.getElementById('goBtn').click(); window.__quest.L.kind" },
  { sleep: 500 }, { shot: 'quest-02-placement' },
  { eval: "window.__qbot((i) => i < 9)" },
  { log: "[document.getElementById('doneTitle').textContent, document.getElementById('doneMsg').textContent, window.__quest.rec.unlocked]" },
  { shot: 'quest-03-placed' },
  // the first Explorer lesson, stopping on each question kind for a picture
  { eval: "document.getElementById('doneNextBtn').click(); [window.__quest.L.kind, window.__quest.L.s, window.__quest.L.u, window.__quest.L.qs.length, window.__quest.L.qs.map((q) => q.kind + ':' + (q.ref.qt || q.ref.t)).join(' ')]" },
  { sleep: 400 }, { shot: 'quest-04-q1' },
  { eval: "(async () => { const Q = window.__quest, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), got = {}; for (let k = 0; k < 30 && !document.getElementById('lesson').hidden; k++) { const q = Q.L.qs[Q.L.i]; const kind = q.kind === 'choice' ? (q.passage ? 'reading' : q.ref.t) : q.kind; if (!got[kind]) { got[kind] = Q.L.i; window.__stopAt = kind; return 'stop at ' + kind + ' (question ' + (Q.L.i + 1) + ')'; } Q.answer(true); await sleep(40); Q.next(); await sleep(30); } return 'end'; })()" },
  { shot: 'quest-05-kind-a' },
  ...[6, 7, 8, 9, 10].flatMap((n) => [
    { eval: "(async () => { const Q = window.__quest, sleep = (ms) => new Promise((r) => setTimeout(r, ms)); window.__got = window.__got || {}; window.__got[window.__stopAt] = 1; for (let k = 0; k < 30 && !document.getElementById('lesson').hidden; k++) { const q = Q.L.qs[Q.L.i]; const kind = q.kind === 'choice' ? (q.passage ? 'reading' : q.ref.t) : q.kind; if (!window.__got[kind]) { window.__stopAt = kind; return 'stop at ' + kind; } Q.answer(true); await sleep(40); Q.next(); await sleep(30); } return 'end'; })()" },
    { sleep: 300 }, { shot: 'quest-0' + (n === 10 ? 'x' : n) + '-kind' }
  ]),
  { eval: "window.__qbot(() => true)" },
  { log: "[document.getElementById('doneTitle').textContent, document.getElementById('doneStars').children.length, JSON.stringify(window.__quest.rec.units)]" },
  { shot: 'quest-11-results' },
  // the other four lessons, then the stage test
  { eval: "(async () => { const Q = window.__quest; for (let u = 1; u < 5; u++) { Q.startLesson('unit', 4, u); await window.__qbot(() => true); } return Object.keys(Q.rec.units).map((k) => k + ':' + Q.rec.units[k].stars).join(' '); })()" },
  { eval: "document.getElementById('donePathBtn').click(); 'path'" }, { sleep: 300 }, { shot: 'quest-12-path' },
  { log: "[...document.querySelectorAll('.node')].map((n) => n.textContent.replace(/\\s+/g, ' ').trim()).join(' | ')" },
  { eval: "window.__quest.nextStep()" },
  { eval: "(async () => { const Q = window.__quest; Q.startLesson('test', 4); const r = await window.__qbot((i) => i !== 3); return [r.right, r.total, Q.rec.unlocked, document.getElementById('doneTitle').textContent, document.getElementById('doneMsg').textContent]; })()" },
  { shot: 'quest-13-stage-passed' },
  // mistakes go to Review, and Review takes them off
  { eval: "(async () => { const Q = window.__quest; Q.startLesson('unit', 5, 0); await window.__qbot((i) => i % 3 !== 0); return Q.rec.review.length; })()" },
  { eval: "(async () => { const Q = window.__quest, before = Q.rec.review.length; Q.startLesson('review'); const r = await window.__qbot(() => true); return [before, r.total, Q.rec.review.length]; })()" },
  { eval: "document.getElementById('doneHomeBtn').click(); 'home'" }, { sleep: 300 }, { shot: 'quest-14-home-progress' },
  { log: "[document.getElementById('level').innerText.replace(/\\n+/g, ' | '), document.getElementById('homeStats').innerText.replace(/\\n+/g, ' ')]" },
  // every stage: one lesson each, answers mixed, for page errors and odd questions
  { eval: "(async () => { const Q = window.__quest, out = []; Q.rec.unlocked = 8; for (let s = 1; s <= 7; s++) { if (!Q.has(s)) { out.push(s + ':none'); continue; } for (let u = 0; u < 5; u++) { Q.startLesson('unit', s, u); const r = await window.__qbot((i) => i % 4 !== 1); if (u === 0) out.push(s + ':' + r.total + 'q'); } Q.startLesson('test', s); const t = await window.__qbot(() => true); out.push('test' + s + ':' + t.right + '/' + t.total); } return out.join(' '); })()" },
  { log: 'JSON.stringify(window.__errs)' },
  // iPad: finger taps on real buttons
  { ipad: true }, { viewport: [1180, 820, true, false, 2] }, { reload: true }, { sleep: 600 },
  { eval: "window.__quest.startLesson('unit', 3, 1); 'lesson'" }, { sleep: 500 },
  { eval: "(() => { const Q = window.__quest; while (Q.L.qs[Q.L.i].kind !== 'choice' || Q.L.qs[Q.L.i].passage) { Q.answer(true); Q.next(); } return Q.L.qs[Q.L.i].label; })()" },
  { sleep: 300 },
  { eval: "(() => { const q = window.__quest.L.qs[window.__quest.L.i]; document.querySelectorAll('.opt')[q.a].id = 'rightOpt'; return 'tagged'; })()" },
  { touchEl: '#rightOpt' }, { sleep: 400 }, { shot: 'quest-15-ipad-right' },
  { log: "[document.getElementById('sheet').className, document.getElementById('sheetTitle').textContent]" },
  { touchEl: '#nextBtn' }, { sleep: 300 },
  { eval: "(() => { const Q = window.__quest; while (Q.L.qs[Q.L.i].kind !== 'order') { Q.answer(true); Q.next(); } return Q.L.qs[Q.L.i].sentence; })()" },
  { sleep: 300 },
  { eval: "(() => { const q = window.__quest.L.qs[window.__quest.L.i]; const used = []; q.words.forEach((w) => used.push(q.tiles.findIndex((t, k) => t === w && !used.includes(k)))); window.__order = used; return used.join(','); })()" },
  // tap the words in order by finger, then Check (marked with data-tap so no button loses its id)
  ...Array.from({ length: 13 }, (_, n) => [
    { eval: `(() => { document.querySelectorAll('[data-tap]').forEach((e) => e.removeAttribute('data-tap')); const k = window.__order[${n}]; const el = k !== undefined ? document.querySelector('#tiles .tile[data-k="' + k + '"]') : !window.__quest.L.answered ? document.getElementById('checkBtn') : document.querySelector('.lcount'); el.setAttribute('data-tap', '1'); return k !== undefined ? 'tile ' + k : 'other'; })()` },
    { touchEl: '[data-tap]' }
  ]).flat(),
  { log: "[document.getElementById('sheet').className, document.getElementById('sheetText').textContent]" },
  { sleep: 200 }, { shot: 'quest-16-ipad-order' },
  // portrait, phone and dark mode, on a reading question and the home screen
  { viewport: [820, 1180, true, false, 2] }, { eval: "window.__quest.startLesson('unit', 6, 2); (() => { const Q = window.__quest; while (!Q.L.qs[Q.L.i].passage) { Q.answer(true); Q.next(); } return 'reading'; })()" }, { sleep: 500 }, { shot: 'quest-17-portrait-reading' },
  { viewport: [390, 844, true, false, 3] }, { sleep: 500 }, { shot: 'quest-18-phone-reading' },
  { eval: "(() => { const Q = window.__quest; Q.startLesson('unit', 1, 0); return Q.L.qs[0].label; })()" }, { sleep: 500 }, { shot: 'quest-19-phone-starter' },
  { log: '[document.documentElement.scrollWidth, innerWidth, document.querySelector(".qwrap").scrollHeight, document.querySelector(".qwrap").clientHeight]' },
  { viewport: [1180, 820, true, true, 2] }, { eval: "document.getElementById('quitBtn').click(); 'home'" }, { sleep: 400 }, { shot: 'quest-20-dark-home' },
  { eval: "document.getElementById('pathBtn').click(); 'path'" }, { sleep: 400 }, { shot: 'quest-21-dark-path' },
  // a reading turned into listening: the text is hidden and played, then shown after the answer
  { viewport: [1180, 820, true, false, 2] },
  { eval: "(() => { const Q = window.__quest; let tries = 0; do { Q.startLesson('unit', 5, 1); tries++; } while (!Q.L.qs.some((q) => q.hear) && tries < 60); while (!Q.L.qs[Q.L.i].hear) { Q.answer(true); Q.next(); } return ['tries ' + tries, 'transcript hidden ' + document.getElementById('transcript').hidden, 'hear box ' + !!document.querySelector('.passage.hear')]; })()" },
  { sleep: 600 }, { shot: 'quest-22-listening' },
  { eval: "(() => { const Q = window.__quest, said = Q.Speech.said.slice(-1)[0] || ''; Q.answer(false); return ['played the talk ' + (said === Q.L.qs[Q.L.i].passage.text), 'transcript hidden ' + document.getElementById('transcript').hidden, Q.L.qs[Q.L.i].skill]; })()" },
  { sleep: 300 }, { shot: 'quest-23-listening-answered' },
  // find the mistake: how many grammar items make one, and a real one answered by finger
  { eval: "(() => { const Q = window.__quest, out = []; for (let s = 1; s <= 7; s++) { let ok = 0, all = 0; Q.CONTENT[s - 1].units.forEach((un, u) => un.grammar.forEach((g, i) => { all++; if (Q.spotQ(s, u, i)) ok++; })); out.push(s + ':' + ok + '/' + all); } return 'spot-able ' + out.join(' '); })()" },
  { eval: "(() => { const Q = window.__quest; Q.startLesson('unit', 3, 2); Q.L.qs[Q.L.i] = Q.spotQ(3, 2, 0) || Q.spotQ(3, 2, 1) || Q.spotQ(3, 2, 2); Q.showQ(); const q = Q.L.qs[Q.L.i]; document.querySelectorAll('[data-tap]').forEach((e) => e.removeAttribute('data-tap')); document.querySelectorAll('#spot .tile')[q.bad].setAttribute('data-tap', '1'); return q.tiles.join(' ') + '  (wrong: ' + q.tiles[q.bad] + ')'; })()" },
  { sleep: 300 }, { shot: 'quest-24-spot' },
  { touchEl: '[data-tap]' }, { sleep: 300 },
  { log: "[document.getElementById('sheet').className, document.getElementById('sheetText').textContent]" },
  { shot: 'quest-25-spot-answered' },
  // My words: the notebook lists learned words with meanings; practice draws from them
  { eval: bot },
  { viewport: [820, 1180, true, false, 2] },
  { eval: "(() => { const Q = window.__quest; document.getElementById('quitBtn').click(); document.getElementById('wordsBtn').click(); return [document.getElementById('wordsNote').textContent, document.querySelectorAll('.wl-row').length, document.querySelectorAll('.wl-stage').length]; })()" },
  { sleep: 400 }, { shot: 'quest-26-my-words-portrait' },
  { touchEl: '.wl-say' }, { log: "window.__quest.Speech.said.slice(-1)[0]" },
  { eval: "(async () => { const Q = window.__quest; document.getElementById('practiseWordsBtn').click(); const kinds = Q.L.qs.map((q) => q.ref.t).join(','); const r = await window.__qbot(() => true); return [Q.L.kind, Q.L.qs.length, kinds, r.right + '/' + r.total, document.getElementById('doneTitle').textContent]; })()" },
  // the IELTS reading test: ten questions, no feedback on the way, a band at the end, misses go to Review
  { viewport: [1180, 820, true, false, 2] },
  { eval: "(() => { const Q = window.__quest; Q.rec.unlocked = 8; document.getElementById('wordsHomeBtn').click(); return [document.getElementById('mockBtn').hidden, document.getElementById('mockBtn').textContent]; })()" },
  { touchEl: '#mockBtn' }, { sleep: 600 },
  { log: "[window.__quest.L.kind, window.__quest.L.qs.length, document.getElementById('lcount').textContent]" },
  { shot: 'quest-27-mock' },
  { eval: "(async () => { const Q = window.__quest, before = Q.rec.review.length, sleep = (ms) => new Promise((r) => setTimeout(r, ms)); for (let k = 0; k < 40 && !document.getElementById('lesson').hidden; k++) { const sheetShown = !document.getElementById('sheet').hidden; Q.answer(k % 4 !== 0); await sleep(700); if (sheetShown) return 'feedback showed during the test'; } await sleep(300); return [document.getElementById('doneTitle').textContent, document.getElementById('doneMsg').textContent, Q.rec.review.length - before, JSON.stringify(Q.rec.mocks.slice(-1))]; })()" },
  { shot: 'quest-28-mock-result' },
  { log: "[window.__quest.mockBand(10, 10), window.__quest.mockBand(9, 10), window.__quest.mockBand(8, 10), window.__quest.mockBand(7, 10), window.__quest.mockBand(5, 10), window.__quest.mockBand(2, 10)].join(' ')" },
  // the IELTS listening test: talks spoken, not shown; each one heard at most twice; no feedback; a listening band
  { touchEl: '#doneHomeBtn' }, { sleep: 400 },
  { log: "[document.getElementById('mockLBtn').hidden, document.getElementById('mockLBtn').textContent, document.getElementById('mockBtn').textContent]" },
  { touchEl: '#mockLBtn' }, { sleep: 900 },
  { log: "(() => { const Q = window.__quest, q = Q.L.qs[0]; return [Q.L.kind, Q.L.qs.length, Q.L.qs.every((x) => x.hear), document.getElementById('lcount').textContent, !!document.querySelector('#passage.hear'), !document.getElementById('transcript') || document.getElementById('transcript').hidden, Q.Speech.said.slice(-1)[0].slice(0, 40) === q.passage.text.slice(0, 40), JSON.stringify(Q.L.plays)]; })()" },
  { shot: 'quest-28b-listening-test' },
  { touchEl: '#readAloud' }, { sleep: 300 },
  { log: "[JSON.stringify(window.__quest.L.plays), document.getElementById('readAloud').disabled]" },
  { eval: "(() => { const b = document.getElementById('readAloud'); b.disabled = false; b.click(); return [JSON.stringify(window.__quest.L.plays), document.querySelector('.toast') ? document.querySelector('.toast').textContent : '']; })()" },
  { eval: "(async () => { const Q = window.__quest, sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let shown = 0; for (let k = 0; k < 40 && !document.getElementById('lesson').hidden; k++) { if (!document.getElementById('sheet').hidden) return 'feedback showed during the test'; const t = document.getElementById('transcript'); if (t && !t.hidden) shown++; Q.answer(k % 3 !== 0); await sleep(700); } await sleep(300); return [shown, document.getElementById('doneTitle').textContent, document.getElementById('doneMsg').textContent, JSON.stringify(Q.rec.mocks.slice(-1))]; })()" },
  { shot: 'quest-28c-listening-result' },
  { log: "[window.__quest.mockBand(10, 10, true), window.__quest.mockBand(8, 10, true), window.__quest.mockBand(13, 20, true), window.__quest.mockBand(5, 10, true), window.__quest.mockBand(8, 10)].join(' ')" },
  { touchEl: '#doneHomeBtn' }, { sleep: 400 },
  { log: "[document.getElementById('mockBtn').textContent, document.getElementById('mockLBtn').textContent]" },
  // writing: a paragraph rebuilt by finger, sentence by sentence
  { viewport: [1180, 820, true, false, 2] },
  { eval: "(() => { const Q = window.__quest; Q.startLesson('unit', 5, 1); const w = Q.CONTENT[4].units[1].writing; const pi = w.findIndex((x) => x.kind === 'paragraph'); Q.L.qs[Q.L.i] = Q.writingQ(5, 1, pi); Q.showQ(); const q = Q.L.qs[Q.L.i]; const used = []; q.words.forEach((s) => used.push(q.tiles.findIndex((x, k) => x === s && !used.includes(k)))); window.__para = used; return q.label + ': ' + q.words.length + ' sentences'; })()" },
  { sleep: 300 }, { shot: 'quest-29-paragraph' },
  ...[0, 1, 2, 3, 4, 5].flatMap((n) => [
    { eval: `(() => { document.querySelectorAll('[data-tap]').forEach((e) => e.removeAttribute('data-tap')); const k = window.__para[${n}]; const el = k !== undefined ? document.querySelector('#tiles .tile[data-k="' + k + '"]') : document.getElementById('checkBtn'); el.setAttribute('data-tap', '1'); return k !== undefined ? 'sentence ' + k : 'check'; })()` },
    { touchEl: '[data-tap]' }
  ]),
  { sleep: 300 }, { shot: 'quest-30-paragraph-done' },
  { log: "[document.getElementById('sheet').className, document.getElementById('sheetTitle').textContent]" },
  { eval: "(() => { const Q = window.__quest; let n = 0; for (let s = 4; s <= 7; s++) Q.CONTENT[s - 1].units.forEach((un, u) => (un.writing || []).forEach((x, i) => { if (Q.writingQ(s, u, i)) n++; })); return 'writing questions built: ' + n; })()" },
  // the word of the day on the home screen: a word of the current stage, read aloud, Learn it adds it to My words,
  // the same word all day, a new one the next day
  { eval: "(() => { const Q = window.__quest; document.getElementById('doneHomeBtn') && !document.getElementById('s-done').hidden && document.getElementById('doneHomeBtn').click(); document.getElementById('quitBtn') && !document.getElementById('lesson').hidden && document.getElementById('quitBtn').click(); Q.rec.wotd = null; Q.renderHome(); return [Q.rec.wotd.w, Q.rec.learned.includes(Q.rec.wotd.w), document.querySelector('#wotd b').textContent]; })()" },
  { viewport: [820, 1180, true, false, 2] }, { sleep: 400 }, { shot: 'quest-31-word-of-day' },
  { touchEl: '#wotdSay' }, { log: "[window.__quest.rec.wotd.w, window.__quest.Speech.said.slice(-1)[0]]" },
  { touchEl: '#wotdLearn' }, { sleep: 300 },
  { log: "[window.__quest.rec.learned.includes(window.__quest.rec.wotd.w), window.__quest.rec.wotd.done, document.getElementById('wotd').textContent.indexOf('In My words') >= 0, document.getElementById('wordsBtn').textContent]" },
  { log: "(() => { const Q = window.__quest, w = Q.rec.wotd.w; Q.renderHome(); const same = Q.rec.wotd.w === w; Q.rec.wotd.d = '2000-01-01'; Q.renderHome(); return ['same all day', same, 'next day new and unknown', Q.rec.wotd.w !== w && !Q.rec.learned.includes(Q.rec.wotd.w)]; })()" },
  { viewport: [390, 844, true, true, 3] }, { sleep: 400 }, { eval: "document.getElementById('wotd').scrollIntoView(); [document.documentElement.scrollWidth <= innerWidth, Math.round(document.getElementById('wotd').getBoundingClientRect().width)]" }, { shot: 'quest-32-word-of-day-phone-dark' },
  // grammar notes: every open lesson's rules with examples, newest first and unfolded
  { viewport: [820, 1180, true, false, 2] }, { sleep: 300 },
  { touchEl: '#notesBtn' }, { sleep: 400 },
  { log: "(() => { const d = [...document.querySelectorAll('#notesList details')]; const open = d.filter((x) => x.open); return [document.getElementById('notesNote').textContent, d.length, open.length, open[0] && open[0].querySelector('summary').textContent, open[0] && open[0].querySelectorAll('li').length, document.querySelector('#notesList li') && document.querySelector('#notesList li').textContent.slice(0, 90)]; })()" },
  { shot: 'quest-34-grammar-notes' },
  { eval: "(() => { const Q = window.__quest, keep = Q.rec.unlocked; Q.rec.unlocked = 1; Q.renderNotes(); const r = [document.querySelectorAll('#notesList details').length, document.getElementById('notesNote').textContent]; Q.rec.unlocked = keep; Q.renderNotes(); return r; })()" },
  { touchEl: '#notesHomeBtn' }, { sleep: 300 }, { log: "document.getElementById('s-home').hidden" },
  // speaking practice: a cue card of the top stage reached, plan then talk (the test shortens both clocks),
  // then the model answer, phrases and Part 3 questions; Another card gives a different one
  { viewport: [820, 1180, true, false, 2] },
  { eval: "(() => { const Q = window.__quest; Q.renderHome(); return [document.getElementById('speakBtnHome').hidden, Q.P2.length, Q.P1.length]; })()" },
  { touchEl: '#speakBtnHome' }, { sleep: 400 },
  { log: "(() => { const Q = window.__quest; return [Q.SP.phase, Q.SP.card.id, Q.SP.card.stage, document.querySelectorAll('#cue li').length]; })()" },
  { shot: 'quest-35-speaking-card' },
  { touchEl: '#spPlan' }, { sleep: 400 },
  { log: "[window.__quest.SP.phase, document.getElementById('speakClock').textContent.slice(0, 4)]" },
  { eval: "window.__quest.SP.end = performance.now() + 300; 'plan ends'" }, { sleep: 900 },
  { log: "[window.__quest.SP.phase, document.getElementById('speakClock').textContent.slice(0, 4)]" },
  { shot: 'quest-36-speaking-talk' },
  { eval: "window.__quest.SP.end = performance.now() + 300; 'talk ends'" }, { sleep: 900 },
  { log: "(() => { const Q = window.__quest; return [Q.SP.phase, Q.rec.speak.n, document.getElementById('speakModel').hidden, document.querySelectorAll('#speakModel ul')[0].children.length, document.querySelectorAll('#speakModel ul')[1].children.length]; })()" },
  { touchEl: '#spHear' }, { log: "window.__quest.Speech.said.slice(-1)[0].slice(0, 60) === window.__quest.SP.card.model.replace(/\\n+/g, ' ').slice(0, 60)" },
  { shot: 'quest-37-speaking-model' },
  { eval: "window.__speakId = window.__quest.SP.card.id; 'remember'" },
  { touchEl: '#spOther' }, { sleep: 300 },
  { log: "[window.__quest.SP.phase, window.__quest.SP.card.id !== window.__speakId]" },
  { viewport: [390, 844, true, true, 3] }, { sleep: 400 }, { shot: 'quest-38-speaking-phone-dark' },
  { log: "document.documentElement.scrollWidth <= innerWidth" },
  { touchEl: '#speakHomeBtn' }, { sleep: 300 }, { log: "[document.getElementById('s-home').hidden, document.getElementById('speakBtnHome').textContent]" },
  // speaking Part 1: four questions read aloud one at a time, 20 s each (shortened here), a model after each
  { viewport: [820, 1180, true, false, 2] },
  { eval: "(() => { const Q = window.__quest, keep = Q.rec.unlocked; Q.rec.unlocked = 2; Q.renderHome(); const r = [document.getElementById('speakBtnHome').hidden]; window.__keepUnlocked = keep; return r; })()" },
  { touchEl: '#speakBtnHome' }, { sleep: 400 },
  { log: "(() => { const Q = window.__quest; return [document.getElementById('speakPart').hidden, Q.SP.part, Q.SP.phase, Q.SP.set.id, Q.SP.set.stage, Q.SP.set.qs.length]; })()" },
  { touchEl: '#p1Start' }, { sleep: 700 },
  { log: "(() => { const Q = window.__quest; return [Q.SP.phase, Q.SP.k, document.getElementById('speakClock').textContent.slice(0, 4), Q.Speech.said.slice(-1)[0] === Q.SP.set.qs[0].q]; })()" },
  { shot: 'quest-39-part1-question' },
  { eval: "window.__quest.SP.end = performance.now() + 300; 'time up'" }, { sleep: 800 },
  { log: "(() => { const Q = window.__quest; return [Q.SP.phase, document.querySelector('#speakModel p').textContent === Q.SP.set.qs[0].model]; })()" },
  { touchEl: '#p1Hear' }, { log: "window.__quest.Speech.said.slice(-1)[0] === window.__quest.SP.set.qs[0].model" },
  { touchEl: '#p1Next' }, { sleep: 400 }, { touchEl: '#p1Done' }, { sleep: 300 },
  { touchEl: '#p1Next' }, { sleep: 400 }, { touchEl: '#p1Done' }, { sleep: 300 },
  { touchEl: '#p1Next' }, { sleep: 400 }, { touchEl: '#p1Done' }, { sleep: 300 },
  { log: "[window.__quest.SP.phase, window.__quest.SP.k, document.getElementById('p1Next').textContent]" },
  { touchEl: '#p1Next' }, { sleep: 400 },
  { log: "(() => { const Q = window.__quest; return [Q.SP.phase, JSON.stringify(Q.rec.speak.p1), document.querySelectorAll('#speakModel h3').length]; })()" },
  { shot: 'quest-40-part1-end' },
  { viewport: [390, 844, true, false, 3] }, { sleep: 300 }, { touchEl: '#p1Other' }, { sleep: 300 }, { touchEl: '#p1Start' }, { sleep: 500 }, { shot: 'quest-41-part1-phone' },
  { log: "document.documentElement.scrollWidth <= innerWidth" },
  { touchEl: '#speakHomeBtn' }, { sleep: 300 },
  { eval: "(() => { const Q = window.__quest; Q.rec.unlocked = window.__keepUnlocked; Q.renderHome(); return 'back to ' + Q.rec.unlocked; })()" },
  { viewport: [820, 1180, true, false, 2] }, { touchEl: '#speakBtnHome' }, { sleep: 400 },
  { log: "[document.getElementById('speakPart').hidden, window.__quest.SP.part]" },
  { touchEl: '#speakPart input[value="1"] + span' }, { sleep: 400 },
  { log: "[window.__quest.SP.part, window.__quest.SP.phase, window.__quest.SP.set.stage]" },
  { shot: 'quest-42-speaking-both-parts' },
  { touchEl: '#speakHomeBtn' }, { sleep: 300 },
  { log: 'JSON.stringify(window.__errs)' }
];
