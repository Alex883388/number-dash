module.exports = [
  { ipad: true },
  { viewport: [1180, 820, true, false, 2] },
  { reload: true }, { sleep: 500 },
  { eval: "document.querySelector('[data-go=\"levels\"]').click(); document.querySelector('[data-play=\"cloud\"]').click(); 'play'" }, { sleep: 600 },
  { eval: "const r = document.getElementById('pauseBtn').getBoundingClientRect(); window.__pb = [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; JSON.stringify(window.__pb)" },
  { touch: [941, 36, 60] }, { sleep: 400 },
  { log: "['after pause tap', window.__nd.game.state, !document.getElementById('s-pause').hidden]" },
  { shot: 'i06-ipad-pause' }
];
