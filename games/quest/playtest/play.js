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
  { log: 'JSON.stringify(window.__errs)' }
];
