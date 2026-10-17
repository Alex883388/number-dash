module.exports = [
  { viewport: [1280, 720, false, false] },
  // wrong answer at the first door
  { eval: "window.__t.play('cloud'); window.__auto = true; window.__botWrong = true; 'go'" },
  { waitFor: "window.__nd.game.state === 'dead' && !document.getElementById('oops').hidden", timeout: 30000 },
  { sleep: 350 }, { shot: '10-wrong-door' }, { log: "window.__t.state()" },
  { log: "JSON.stringify(window.__nd.save.math.tricky)" },
  // full clean run of level 1
  { eval: "window.__botWrong = false; 'ok'" },
  { waitFor: "window.__nd.game.p && window.__nd.game.p.mode === 1 && window.__nd.game.p.x > 296", timeout: 90000 }, { shot: '11-ship-lanes' }, { log: "window.__t.state()" },
  { waitFor: "window.__nd.game.state === 'done'", timeout: 90000 }, { sleep: 400 }, { shot: '12-finish-arch' },
  { sleep: 1800 }, { shot: '13-done' },
  { log: "JSON.stringify(window.__nd.save.levels)" },
  { log: "JSON.stringify(window.__nd.save.math)" }
];
