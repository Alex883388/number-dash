module.exports = [
  { viewport: [390, 844, true, false] },
  { reload: true }, { sleep: 500 }, { shot: '30-phone-home' },
  { eval: "document.querySelector('[data-go=\"levels\"]').click(); 'ok'" }, { sleep: 600 }, { shot: '31-phone-levels' },
  { log: "[document.documentElement.scrollWidth, document.getElementById('screens').scrollWidth, innerWidth]" },
  { eval: "document.querySelector('[data-go=\"settings\"]') ; window.__t.play('lemon'); window.__auto = true; window.__t.tp(70); 'go'" },
  { waitFor: "!document.getElementById('question').hidden", timeout: 20000 }, { sleep: 600 }, { shot: '32-phone-play' },
  { viewport: [844, 390, true, false] }, { sleep: 800 }, { shot: '33-phone-landscape' },
  { eval: "window.__t.tp(185); 'tp'" },
  { waitFor: "window.__nd.game.p.mode === 1 && window.__nd.game.p.x > 232", timeout: 20000 }, { shot: '34-phone-landscape-ship' },
  { viewport: [390, 844, true, true] },
  { eval: "document.getElementById('pauseBtn').click(); 'p'" }, { sleep: 500 }, { shot: '35-phone-pause-dark' },
  { eval: "document.getElementById('quitBtn').click(); document.querySelector('[data-go=\"home\"]').click(); document.querySelector('[data-go=\"settings\"]').click(); 'ok'" }, { sleep: 600 }, { shot: '36-phone-settings-dark' },
  { eval: "document.querySelector('[data-go=\"home\"]').click(); document.querySelector('[data-go=\"cube\"]').click(); 'ok'" }, { sleep: 600 }, { shot: '37-phone-cube-dark' },
  { log: "[document.documentElement.scrollWidth, innerWidth]" }
];
