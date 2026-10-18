// Code Robot by finger on an emulated iPad (run from the repo root):
//   node games/robot/build.js && ND_CDP=9511 ND_PROFILE=edge-profile-robot ND_URL=file:///D:/Github/number-dash/games/robot/dist/preview.html ND_READY='!!window.__robot' ND_BOT=none node games/dash/playtest/shoot.js games/robot/playtest/play.js
// Every program here is built with finger taps on the palette, the gaps and the blocks. Opening the page writes nothing;
// Start shows World 1's intro card; a menu choice and a draft are saved without marking the day played, a finished level
// marks it. 1-1 by taps and Run (3 stars); 1-2 by Step, one block lit at a time; 1-3 a wrong turn (a kind bump), then
// fixed by picking the block, Delete and a new block at the cursor; 1-4 a block moved right into place; 2-6 a 2-star
// program, Clear and Undo, then a nested Repeat placed by moving the cursor inside the first one (3 stars); 3-1 F1 built
// in its own row and used three times (Use F1 is off in the F1 row; while F1 runs its use stays lit); 4-2 an If with an
// else inside Repeat until flag; 1-1 again with a 1-star program (the best stays); 5-1 a Debugging fix in one change;
// the speed button. Then a reload keeps a half-built program (2-7) and the progress, Continue opens it; the save code
// is copied, the storage cleared, and loading the code (after a wrong code, a cut-off code and a "No") brings it all
// back. Problems go to window.__P (kept across reloads); the last line says PASS or FAIL.
const HELP = "window.__P = JSON.parse(sessionStorage.getItem('robotP') || '[]'); window.__ok = (c, m) => { if (!c) window.__P.push(m); return !!c; };" +
  " window.__prog = (want, tag) => { const p = __robot.state().prog; window.__ok(p === want, tag + ': program ' + JSON.stringify(p) + ', wanted ' + JSON.stringify(want)); return p; }; 'help ok'";
const KEEP_P = { eval: "sessionStorage.setItem('robotP', JSON.stringify(window.__P)); 'kept'" };
const reload = [KEEP_P, { reload: true }, { sleep: 700 }, { eval: HELP }];
const tap = (sel, ms) => [{ touchEl: sel }, { sleep: ms || 110 }];
const pal = (t) => tap('#palette [data-add="' + t + '"]');
const gap = (g) => tap('#code [data-gap="' + g + '"]');
const blk = (p) => tap('#code [data-path="' + p + '"]');
const num = (p) => tap('#code [data-num="' + p + '"]');
const prog = (want, tag) => ({ log: 'window.__prog(' + JSON.stringify(want) + ', ' + JSON.stringify(tag) + ')' });
const ok = (cond, msg) => ({ eval: '(() => window.__ok(' + cond + ', ' + JSON.stringify(msg) + ') ? "ok" : ' + JSON.stringify('FAIL: ' + msg) + ')()' });
const runDone = { waitFor: "__robot.state().state === 'done' || __robot.state().mode === 'end'", timeout: 40000 };
const open = (id) => ({ eval: "__robot.open('" + id + "')" });
const stars = (n, tag) => ok("document.querySelectorAll('#doneStars span:not(.off)').length === " + n + " && !document.getElementById('s-done').hidden", tag + ': ' + n + ' stars on the done card');
const rec = (id, s, b, tag) => ok("(() => { const r = JSON.parse(localStorage.getItem('code-robot.v1')).levels['" + id + "']; return r && r.s === " + s + ' && r.b === ' + b + '; })()', tag + ': saved ' + id + ' as ' + s + ' stars, ' + b + ' blocks');
const fit = (tag) => ({ log: "(() => { const f = __robot.fits(); if (f.length) window.__P.push(" + JSON.stringify(tag) + " + ': ' + f.join('; ')); return f.length ? f : 'fits'; })()" });
const today = "(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })()";
const harsh = '/\\b(wrong|fail\\w*|bad|error|stupid|oops|sorry|lose|lost)\\b/i';

module.exports = [
  { eval: "localStorage.clear(); sessionStorage.clear(); 'cleared'" },
  { ipad: true },
  { viewport: [1180, 820, true, false, 2] },
  { reload: true }, { sleep: 900 }, { eval: HELP },
  ok('localStorage.length === 0', 'opening the page wrote something'),
  { shot: 'rob-p01-home' }, fit('home'),
  { log: "[document.getElementById('contTitle').textContent, document.getElementById('contSub').textContent, document.querySelectorAll('.world.locked').length]" },

  // Start: World 1's intro card, then 1-1
  ...tap('#contBtn', 300),
  ok("!document.getElementById('s-intro').hidden", 'Start did not show the intro card'),
  ok('localStorage.length === 0', 'the intro card wrote something'),
  { shot: 'rob-p02-intro' }, fit('intro card'),
  ...tap('#iGoBtn', 400),
  ok("__robot.state().level === '1-1' && __robot.state().prog === ''", 'Let\'s go did not open 1-1 empty'),
  ok("JSON.parse(localStorage.getItem('code-robot.v1')).seen[1] === 1 && JSON.parse(localStorage.getItem('code-robot.v1')).last === '1-1'", 'the intro and the level were not kept'),
  ok("!localStorage.getItem('arcade-days.v1')", 'opening a level marked the day played'),
  ...pal('F'), ...pal('F'), ...pal('F'),
  prog('F F F', '1-1 taps'),
  ok("JSON.parse(localStorage.getItem('code-robot.v1')).drafts['1-1'] === 'FFF'", 'the draft was not saved'),
  ok("!localStorage.getItem('arcade-days.v1')", 'a draft marked the day played'),
  { shot: 'rob-p03-built-1-1' }, fit('1-1 built'),
  ...tap('#runBtn', 200),
  ok("__robot.state().mode === 'run' && document.querySelector('#code .blk.now')", 'Run did not light a block'),
  ok("document.getElementById('editor').classList.contains('busy') && document.querySelector('#palette .pal').disabled", 'the editor was not locked while running'),
  { shot: 'rob-p04-running' },
  runDone, { sleep: 500 },
  stars(3, '1-1'), rec('1-1', 3, 3, '1-1'),
  ok("JSON.parse(localStorage.getItem('arcade-days.v1') || '{}')[" + today + ']', 'a finished level did not mark the day played'),
  { shot: 'rob-p05-done-1-1' }, fit('done card'),

  // 1-2 by Step: one block lit at a time
  ...tap('#nextBtn', 400),
  ok("__robot.state().level === '1-2'", 'Next level did not open 1-2'),
  ...pal('F'), ...pal('F'), ...pal('F'), ...pal('F'),
  prog('F F F F', '1-2 taps'),
  ...tap('#stepBtn', 500),
  ok("__robot.state().mode === 'step' && __robot.state().idx === 1 && document.querySelector('#code [data-path=\"m.0\"]').classList.contains('now')", 'Step 1 did not light the first block'),
  ok("getComputedStyle(document.getElementById('bot0')).getPropertyValue('--x').trim() === '2'", 'Step 1 did not move the robot one square'),
  ...tap('#stepBtn', 500),
  ok("__robot.state().idx === 2 && document.querySelector('#code [data-path=\"m.1\"]').classList.contains('now') && !document.querySelector('#code [data-path=\"m.0\"]').classList.contains('now')", 'Step 2 did not light the second block only'),
  ok("document.querySelector('#board .tile.gem.got')", 'the gem was not picked up at step 2'),
  { shot: 'rob-p06-step-1-2' },
  ...tap('#stepBtn', 500), ...tap('#stepBtn', 300),
  runDone, { sleep: 500 },
  stars(3, '1-2 by Step'), rec('1-2', 3, 4, '1-2'),

  // 1-3: a wrong turn bumps kindly, then the fix: pick the block, Delete, a new block at the cursor
  ...tap('#nextBtn', 400),
  ...pal('F'), ...pal('F'), ...pal('L'), ...pal('F'), ...pal('F'),
  prog('F F L F F', '1-3 with a wrong turn'),
  { eval: '__robot.setSpeed(3); "fast"' },
  ...tap('#runBtn', 200), runDone, { sleep: 300 },
  ok("__robot.state().mode === 'end' && __robot.state().why === 'bump'", '1-3: the wrong turn did not bump'),
  ok('/^(Bump|Splash)!/.test(__robot.state().say) && !' + harsh + '.test(__robot.state().say)', '1-3: the bump message was not kind'),
  { log: '__robot.state().say' },
  { shot: 'rob-p07-bump' }, fit('after a bump'),
  ...blk('m.2'),
  ok("__robot.state().sel === 'm.2' && !document.getElementById('selbar').hidden && document.getElementById('palette').hidden", 'picking a block did not show the bar'),
  { shot: 'rob-p08-picked' }, fit('a block picked'),
  ...tap('#selDel'),
  prog('F F F F', '1-3 after Delete'),
  ok("__robot.state().cur.list === 'm' && __robot.state().cur.i === 2 && __robot.state().mode === 'edit'", '1-3: the cursor is not where the block was'),
  ...pal('R'),
  prog('F F R F F', '1-3 fixed'),
  ...tap('#runBtn', 200), runDone, { sleep: 300 },
  stars(3, '1-3 fixed'),

  // 1-4: a block moved right into place
  ...tap('#nextBtn', 400),
  ...pal('F'), ...pal('F'), ...pal('L'), ...pal('F'), ...pal('F'), ...pal('F'),
  prog('F F L F F F', '1-4 with the turn too soon'),
  ...blk('m.2'), ...tap('#selRight'),
  prog('F F F L F F', '1-4 after Move right'),
  ok("__robot.state().sel === 'm.3'", 'the moved block is not still picked'),
  ...tap('#selDone'),
  ok("!__robot.state().sel && !document.getElementById('palette').hidden", 'Done did not let go of the block'),
  ...tap('#runBtn', 200), runDone, { sleep: 300 },
  stars(3, '1-4'),

  // 2-6: 2 stars, Clear and Undo, then a nested Repeat placed by moving the cursor inside the first Repeat (earlier play
  // finished 1-5, 1-6 and 2-1 to 2-5, so World 2 is open and 2-6 is opened from its world card by finger)
  { eval: "__robot.grant(['1-5', '1-6', '2-1', '2-2', '2-3', '2-4', '2-5'])" },
  ...tap('#doneMapBtn', 400),
  ok("!document.getElementById('s-world').hidden && /Sequences/.test(document.getElementById('wTitle').textContent)", 'Levels did not show the world card'),
  { shot: 'rob-p08b-world1' }, fit('world 1 card'),
  ...tap('#wHomeBtn', 400), ...tap('.world[data-world="2"]', 400),
  { shot: 'rob-p09a-world2' }, fit('world 2 card'),
  ...tap('.lvl[data-level="2-6"]', 500),
  ok("!document.getElementById('s-intro').hidden", 'World 2 did not show its intro card'),
  ...tap('#iGoBtn', 400),
  ok("__robot.state().level === '2-6'", 'the level button did not open 2-6'),
  ...pal('r'), ...num('m.0'), ...num('m.0'),
  ...pal('F'), ...pal('F'), ...pal('F'), ...pal('R'),
  prog('r4(F F F R)', '2-6 one Repeat'),
  ...tap('#runBtn', 200), runDone, { sleep: 400 },
  stars(2, '2-6 with 5 blocks'), rec('2-6', 2, 5, '2-6 first'),
  ...tap('#againBtn', 400),
  prog('r4(F F F R)', '2-6 draft kept for Try for 3 stars'),
  ...tap('#clearBtn'),
  prog('', '2-6 cleared'),
  ...tap('#undoBtn'),
  prog('r4(F F F R)', '2-6 Undo after Clear'),
  ...tap('#clearBtn'),
  ...pal('r'), ...pal('R'), ...num('m.0'), ...num('m.0'),
  prog('r4(R)', '2-6 Repeat 4 Right'),
  ...gap('m:1'),
  ok("__robot.state().cur.list === 'm' && __robot.state().cur.i === 1", 'the gap after the Repeat did not take the cursor'),
  ...gap('m.0.b:0'),
  ok("__robot.state().cur.list === 'm.0.b' && __robot.state().cur.i === 0 && document.querySelector('#code [data-gap=\"m.0.b:0\"]').classList.contains('cur')", 'the gap inside the Repeat did not take the cursor'),
  ...pal('r'), ...num('m.0.b.0'), ...pal('F'),
  prog('r4(r3(F) R)', '2-6 nested Repeat'),
  { shot: 'rob-p09-nested' }, fit('nested Repeat'),
  ...tap('#runBtn', 200), runDone, { sleep: 400 },
  stars(3, '2-6 nested'), rec('2-6', 3, 4, '2-6 best'),

  // 3-1: F1 built in its own row and used three times
  open('3-1'), { sleep: 300 },
  ok("!document.getElementById('f1Row').hidden", 'the F1 row is not shown'),
  ...gap('f:0'),
  ok("document.querySelector('#palette [data-add=\"f\"]').disabled", 'Use F1 is not off inside the F1 row'),
  ...pal('F'), ...pal('F'), ...pal('F'),
  ...gap('m:0'),
  ok("!document.querySelector('#palette [data-add=\"f\"]').disabled", 'Use F1 is off in the program'),
  ...pal('f'), ...pal('R'), ...pal('f'), ...pal('L'), ...pal('f'),
  prog('f R f L f|F F F', '3-1 F1 used three times'),
  { shot: 'rob-p10-f1' }, fit('F1'),
  ...tap('#stepBtn', 400), ...tap('#stepBtn', 400),
  ok("document.querySelector('#code [data-path=\"f.0\"]').classList.contains('now') && document.querySelector('#code [data-path=\"m.0\"]').classList.contains('f1now')", 'while F1 runs, its first block and its use are not lit'),
  { shot: 'rob-p11-f1-step' },
  ...tap('#runBtn', 200), runDone, { sleep: 400 },
  stars(3, '3-1'), rec('3-1', 3, 8, '3-1'),

  // 4-2: If path ahead with an else, inside Repeat until flag
  open('4-2'), { sleep: 300 },
  ...pal('u'), ...pal('i'), ...pal('F'), ...gap('m.0.b.0.e:0'), ...pal('R'),
  prog('u(i(F)(R))', '4-2 If inside Until'),
  { shot: 'rob-p12-if' }, fit('If'),
  ...tap('#stepBtn', 400),
  ok("document.querySelector('#code [data-path=\"m.0\"]').classList.contains('no')", 'the first Until check (not on the flag) is not shown'),
  ...tap('#stepBtn', 400),
  ok("document.querySelector('#code [data-path=\"m.0.b.0\"]').classList.contains('yes') && document.querySelector('#code [data-box=\"m.0\"]').classList.contains('act')", 'the If check (path clear) is not shown'),
  ...tap('#runBtn', 200), runDone, { sleep: 400 },
  stars(3, '4-2'),

  // 1-1 again with 7 blocks: 1 star on the card, the best stays
  open('1-1'), { sleep: 300 },
  prog('F F F', '1-1 draft kept'),
  ...tap('#clearBtn'), ...pal('L'), ...pal('R'), ...pal('L'), ...pal('R'), ...pal('F'), ...pal('F'), ...pal('F'),
  prog('L R L R F F F', '1-1 long way'),
  ok("document.querySelector('#palette [data-add=\"F\"]').disabled && /limit/i.test(document.getElementById('capInfo').textContent)", 'the block limit (7) did not stop the palette'),
  ...tap('#runBtn', 200), runDone, { sleep: 400 },
  stars(1, '1-1 with 7 blocks'), rec('1-1', 3, 3, '1-1 best kept'),

  // 5-1: a Debugging level opens with its bug; one change fixes it
  open('5-1'), { sleep: 300 },
  prog('F F F L F F', '5-1 opens with the bug'),
  ...blk('m.3'), ...tap('#selDel'), ...pal('R'),
  prog('F F F R F F', '5-1 fixed'),
  ...tap('#runBtn', 200), runDone, { sleep: 400 },
  stars(3, '5-1'),
  ok("/Fixed with 1 change: a neat fix!/.test(document.getElementById('doneNote').textContent)", 'the Debugging fix was not counted as 1 change'),
  { log: "document.getElementById('doneNote').textContent" },

  // the speed button (a menu choice: saved, the day not touched)
  open('2-7'), { sleep: 300 }, { eval: '__robot.setSpeed(1); "normal"' },
  ...tap('#speedBtn'),
  ok("JSON.parse(localStorage.getItem('code-robot.v1')).speed === 2", 'the speed was not saved'),
  { log: "document.getElementById('speedBtn').getAttribute('aria-label')" },
  // a half-built program, then a reload
  ...pal('r'), ...num('m.0'),
  prog('r3()', '2-7 half built'),
  ...reload,
  ok("JSON.parse(localStorage.getItem('code-robot.v1')).drafts['2-7'] === 'r3()'", 'the draft did not survive the reload'),
  ok("/World 2 · Loops · Level 7/.test(document.getElementById('contSub').textContent) && document.getElementById('contTitle').textContent === 'Continue'", 'Continue does not offer 2-7'),
  ok("__robot.rec.levels['1-4'] && __robot.rec.levels['3-1'] && __robot.rec.done === 15", 'the progress did not survive the reload'),
  { log: "[document.getElementById('contSub').textContent, __robot.rec.done, __robot.rec.stars]" },
  { shot: 'rob-p13-home-after-reload' },
  ...tap('#contBtn', 500),
  prog('r3()', '2-7 after the reload'),
  ok("__robot.rec.speed === 2 && /Fast/.test(document.getElementById('speedBtn').getAttribute('aria-label'))", 'the speed did not survive the reload'),

  // the save code: copy, clear everything, load it back
  ...tap('#pauseBtn', 400), ...tap('#homeBtn', 400),
  ...tap('#backupBtn', 400),
  ok("/^CR1-[A-Za-z0-9+/=]+$/.test(document.getElementById('codeOut').value)", 'no save code shown'),
  { shot: 'rob-p14-backup' }, fit('backup card'),
  ...tap('#copyBtn', 400),
  ok("document.getElementById('codeStatus').textContent.length > 5", 'Copy said nothing'),
  { log: "[document.getElementById('codeStatus').textContent, document.getElementById('codeOut').value.length]" },
  { eval: "sessionStorage.setItem('robotCode', document.getElementById('codeOut').value); sessionStorage.setItem('robotHad', JSON.stringify({ done: __robot.rec.done, stars: __robot.rec.stars })); 'kept'" },
  { eval: "localStorage.clear(); 'cleared'" },
  ...reload,
  ok("__robot.rec.done === 0 && document.getElementById('contTitle').textContent === 'Start'", 'the progress was not cleared'),
  ...tap('#backupBtn', 400),
  { eval: "document.getElementById('codeIn').value = 'hello'; 'pasted'" }, ...tap('#loadBtn', 300),
  ok("document.getElementById('codeStatus').classList.contains('bad') && /not a Code Robot save code/.test(document.getElementById('codeStatus').textContent)", 'a wrong code was not refused'),
  { eval: "document.getElementById('codeIn').value = sessionStorage.getItem('robotCode').slice(0, 60); 'pasted half'" }, ...tap('#loadBtn', 300),
  ok("/not complete/.test(document.getElementById('codeStatus').textContent)", 'a cut-off code was not refused'),
  { eval: "document.getElementById('codeIn').value = sessionStorage.getItem('robotCode'); 'pasted'" }, ...tap('#loadBtn', 300),
  ok("!document.getElementById('s-confirm').hidden && /This device has 0 levels/.test(document.getElementById('confirmText').textContent)", 'loading did not ask first'),
  { log: "document.getElementById('confirmText').textContent" },
  { shot: 'rob-p15-confirm' }, fit('confirm card'),
  ...tap('#confirmNo', 300),
  ok('__robot.rec.done === 0', 'No still loaded the code'),
  { eval: "document.getElementById('codeIn').value = sessionStorage.getItem('robotCode'); 'pasted'" }, ...tap('#loadBtn', 300),
  ...tap('#confirmYes', 400),
  ok("(() => { const had = JSON.parse(sessionStorage.getItem('robotHad')), r = JSON.parse(localStorage.getItem('code-robot.v1')); return r.done === had.done && r.stars === had.stars && __robot.rec.done === had.done && r.levels['2-6'].s === 3 && r.drafts['2-7'] === 'r3()'; })()", 'loading the code did not bring the progress back'),
  { log: "[document.getElementById('codeStatus').textContent, localStorage.getItem('code-robot.v1').length]" },
  ...tap('#backupHomeBtn', 400),
  ok("/World 2 · Loops · Level 7/.test(document.getElementById('contSub').textContent)", 'Continue after loading'),
  { shot: 'rob-p16-home-restored' }, fit('home after loading'),

  { log: 'JSON.stringify(window.__errs)' },
  { log: "(window.__P.length || (window.__errs || []).length) ? 'FAIL ' + JSON.stringify(window.__P) : 'PASS: no problems'" }
];
