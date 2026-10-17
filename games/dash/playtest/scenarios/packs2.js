module.exports = [
  { viewport: [1280, 720, false, false] },
  { eval: "document.querySelector('[data-go=\"levels\"]').click(); 'menu'" }, { sleep: 800 },
  { eval: "document.querySelectorAll('.pack-head')[3].scrollIntoView(); 'scroll'" }, { sleep: 300 }, { shot: 'q01-hard-pack' },
  { eval: "window.__t.play('h02'); window.__auto = true; 'h02'" },
  { waitFor: "window.__nd.game.p.mode === 4", timeout: 40000 }, { sleep: 1200 }, { shot: 'q02-wave-lagoon' }, { log: "window.__t.state()" },
  { eval: "window.__t.play('n10'); window.__auto = true; 'n10'" },
  { waitFor: "window.__nd.game.p.mode !== 0", timeout: 40000 }, { sleep: 1200 }, { shot: 'q03-picnic-parade' }, { log: "window.__t.state()" },
  { viewport: [1280, 720, false, true] },
  { eval: "window.__t.play('h10'); window.__auto = true; 'h10'" },
  { waitFor: "window.__nd.game.p.x > 120", timeout: 40000 }, { shot: 'q04-grand-gauntlet' }, { log: "window.__t.state()" },
  { eval: "window.__t.play('n05'); window.__auto = true; window.__t.tp(150); 'n05'" }, { sleep: 2500 }, { shot: 'q05-flip-flop' }
];
