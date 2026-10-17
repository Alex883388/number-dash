module.exports = [
  { ipad: true },
  { viewport: [1180, 820, true, false, 2] },
  { reload: true }, { sleep: 500 },
  { eval: "document.querySelector('[data-go=\"levels\"]').click(); document.querySelector('[data-play=\"cloud\"]').click(); 'play'" }, { sleep: 600 },
  { eval: "window.__n0 = window.__nd.game.p.n; const r = document.getElementById('slowBtn').getBoundingClientRect(); JSON.stringify([Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)])" },
  { touch: [62, 758, 60] }, { sleep: 150 },
  { log: "['state', window.__nd.game.state, 'slow charges', window.__nd.game.slowCharges, 'jumps', window.__nd.game.p.n - window.__n0]" },
  { shot: 'i05-ipad-slow' },
  { touch: [1110, 60, 60] }, { sleep: 400 },
  { log: "['after pause tap', window.__nd.game.state]" },
  { shot: 'i06-ipad-pause' }
];
