module.exports = [
  { viewport: [1280, 720, false, false] },
  { sleep: 600 }, { shot: '01-home-light' },
  { eval: "document.querySelector('[data-go=\"levels\"]').click()" }, { sleep: 700 }, { shot: '02-levels-light' },
  { eval: "window.__auto = true; document.querySelector('[data-play=\"cloud\"]').click(); 'started'" },
  { sleep: 1500 }, { shot: '03-start' },
  { waitFor: "window.__nd.game.p.x > 80", timeout: 30000 }, { log: "window.__t.state()" }, { shot: '04-question' },
  { waitFor: "window.__nd.game.p.x > 101", timeout: 20000 }, { shot: '05-doors' },
  { waitFor: "window.__nd.game.p.x > 112", timeout: 20000 }, { shot: '06-after-door' },
  { waitFor: "window.__nd.game.p.x > 300", timeout: 40000 }, { log: "window.__t.state()" }, { shot: '07-ship-lanes' },
  { waitFor: "window.__nd.game.state === 'done' || window.__nd.game.attempts > 1", timeout: 60000 },
  { log: "window.__t.state()" }, { sleep: 2200 }, { shot: '08-done' },
  { log: "JSON.stringify(window.__nd.save.math)" }
];
