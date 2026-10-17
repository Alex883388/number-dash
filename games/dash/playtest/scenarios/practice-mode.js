module.exports = [
  { viewport: [1280, 720, false, false] },
  { eval: "window.__t.play('lemon', true); window.__auto = true; 'practice'" },
  { waitFor: "window.__nd.game.p.x > 100", timeout: 30000 },
  { log: "window.__nd.game.checkpoints.map(c => +c.p.x.toFixed(1))" },
  { log: "window.__nd.game.L.gates.map(g => [g.x, g.doorX])" },
  // let it die on purpose: bot off right before the pad/orb section
  { eval: "window.__auto = false; 'off'" },
  { waitFor: "window.__nd.game.state === 'dead'", timeout: 20000 },
  { log: "window.__t.state()" }, { sleep: 200 }, { shot: '40-practice-death' },
  { waitFor: "window.__nd.game.state === 'play'", timeout: 5000 },
  { log: "[window.__t.state(), window.__nd.game.checkpoints.length]" }, { sleep: 300 }, { shot: '41-practice-respawn' },
  { eval: "window.__auto = true; 'on'" },
  { waitFor: "window.__nd.game.p.x > 200", timeout: 40000 },
  { log: "[window.__t.state(), window.__nd.game.checkpoints.map(c => +c.p.x.toFixed(0)).join(',')]" },
  // pause / resume
  { eval: "document.getElementById('pauseBtn').click(); window.__t.g().state" }, { sleep: 400 }, { shot: '42-pause' },
  { eval: "document.getElementById('resumeBtn').click(); window.__t.g().state" },
  { sleep: 1000 }, { log: "window.__t.state()" }
];
