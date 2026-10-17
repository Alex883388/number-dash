// Visual tour of the new moves, slow motion and the floating question.
const slowCheck = `new Promise(r => { const g = window.__nd.game; const x0 = g.p.x; const t0 = performance.now();
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
  setTimeout(() => { const x1 = g.p.x; setTimeout(() => { const x2 = g.p.x; r({ during: +((x1 - x0) / 0.5).toFixed(2), after: +((x2 - x1) / 0.5).toFixed(2), charges: g.slowCharges, speed: g.L.speed }); }, 500); }, 500); })`;
module.exports = [
  { viewport: [1280, 720, false, false] },
  { eval: "document.querySelector('[data-go=\"levels\"]').click(); 'ok'" }, { sleep: 800 }, { shot: 'n01-levels' },
  { eval: "document.getElementById('screens').scrollTop = 9999; 'scroll'" }, { sleep: 300 }, { shot: 'n02-levels-bottom' },
  { eval: "window.__t.play('bubble'); window.__auto = true; window.__t.tp(108); 'ball'" },
  { waitFor: "window.__nd.game.p.mode === 2 && window.__nd.game.p.x > 128", timeout: 20000 }, { shot: 'n03-ball' },
  { eval: "window.__t.tp(214); 'ball gate'" },
  { waitFor: "window.__nd.game.p.mode === 2 && window.__nd.game.p.x > 255", timeout: 20000 }, { shot: 'n04-ball-gate' },
  { log: "window.__t.state()" },
  { eval: "window.__t.play('candy'); window.__auto = true; window.__t.tp(60); 'mini'" },
  { waitFor: "window.__nd.game.p.mini && window.__nd.game.p.x > 82", timeout: 20000 }, { shot: 'n05-mini' },
  { eval: "window.__t.tp(156); 'ufo'" },
  { waitFor: "window.__nd.game.p.mode === 3 && window.__nd.game.p.x > 192", timeout: 20000 }, { shot: 'n06-ufo' },
  { eval: "window.__t.play('reef'); window.__auto = true; window.__t.tp(55); 'wave'" },
  { waitFor: "window.__nd.game.p.mode === 4 && window.__nd.game.p.x > 84", timeout: 20000 }, { shot: 'n07-wave' },
  { eval: "window.__t.play('garden'); window.__auto = true; window.__t.tp(140); 'red pad'" },
  { waitFor: "window.__nd.game.p.y > 4", timeout: 20000 }, { shot: 'n08-red-pad' },
  { waitFor: "window.__nd.game.p.grav < 0", timeout: 20000 }, { sleep: 500 }, { shot: 'n09-green' },
  { eval: "window.__t.play('cloud'); window.__auto = true; window.__t.tp(70); 'question'" },
  { waitFor: "!document.getElementById('question').hidden", timeout: 20000 }, { sleep: 400 }, { shot: 'n10-big-question' },
  { log: "[document.getElementById('question').className, getComputedStyle(document.getElementById('question')).top]" },
  { log: slowCheck }, 
  { eval: "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' })); 'slow again'" }, { sleep: 300 }, { shot: 'n11-slow-motion' },
  { eval: "window.__t.tp(258); 'ship question'" },
  { waitFor: "window.__nd.game.p.mode === 1 && !document.getElementById('question').hidden", timeout: 20000 }, { sleep: 400 }, { shot: 'n12-ship-question' },
  { log: "[document.getElementById('question').className, getComputedStyle(document.getElementById('question')).top]" },
  { viewport: [844, 390, true, true] },
  { eval: "window.__t.play('candy'); window.__auto = true; window.__t.tp(105); 'phone q'" },
  { waitFor: "!document.getElementById('question').hidden", timeout: 20000 }, { sleep: 500 }, { shot: 'n13-phone-question' }
];
