// Pack sections in the level menu, and generated levels (palette, song, play).
module.exports = [
  { viewport: [1280, 720, false, false] },
  { eval: "document.querySelector('[data-go=\"levels\"]').click(); 'menu'" }, { sleep: 800 },
  { eval: "document.querySelectorAll('.pack-head')[2].scrollIntoView(); 'scroll'" }, { sleep: 300 }, { shot: 'p01-normal-pack' },
  { log: "[...document.querySelectorAll('.pack-head')].map(h => h.textContent)" },
  { eval: "window.__t.play('n01'); window.__auto = true; 'n01'" },
  { waitFor: "window.__nd.game.p.x > 70", timeout: 30000 }, { shot: 'p02-n01' }, { log: "window.__t.state()" },
  { eval: "window.__t.play('h05'); window.__auto = true; 'h05'" },
  { waitFor: "window.__nd.game.p.x > 90", timeout: 30000 }, { shot: 'p03-h05' }, { log: "window.__t.state()" },
  { viewport: [1280, 720, false, true] },
  { eval: "window.__t.play('h04'); window.__auto = true; 'h04'" },
  { waitFor: "window.__nd.game.p.x > 90", timeout: 30000 }, { shot: 'p04-h04-dark' }, { log: "window.__t.state()" }
];
