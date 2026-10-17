// iPad check on the hosted website (run with ND_SERVE=docs): touch controls, bigger buttons,
// the home-screen tip, and offline play from the cache.
module.exports = [
  { ipad: true },
  { viewport: [1180, 820, true, false, 2] },
  { reload: true },
  { sleep: 800 }, { shot: 'i01-ipad-home' },
  { log: "[document.getElementById('homeTip').hidden, document.getElementById('fullBtn').hidden, navigator.maxTouchPoints, matchMedia('(pointer: coarse)').matches]" },
  { touch: [110, 300, 80] }, { sleep: 200 },   // a tap on empty sky (the middle of home is the All games button)
  { eval: "document.querySelector('[data-go=\"levels\"]').click(); 'levels'" }, { sleep: 600 },
  { eval: "document.querySelector('[data-play=\"cloud\"]').click(); 'play'" }, { sleep: 700 },
  { log: "[window.__nd.game.state, window.__nd.game.p.y]" },
  { shot: 'i02-ipad-start' },
  // a real finger tap on the game should make the cube jump
  { touch: [700, 420, 60] }, { sleep: 120 },
  { log: "['after tap', window.__nd.game.p.y.toFixed(2), window.__nd.game.p.vy.toFixed(1)]" },
  { sleep: 700 },
  // holding the finger keeps hopping
  { eval: "window.__holdStart = window.__nd.game.p.n; 'hold'" },
  { touch: [700, 420, 1500] },
  { log: "['jumps while holding', window.__nd.game.p.n - window.__holdStart]" },
  // the slow-motion button takes a finger tap without making the cube jump
  { eval: "window.__n0 = window.__nd.game.p.n; const r = document.getElementById('slowBtn').getBoundingClientRect(); JSON.stringify([Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2), Math.round(r.width)])" },
  { touch: [62, 774, 60] }, { sleep: 150 },
  { log: "['slow charges', window.__nd.game.slowCharges, 'jumps', window.__nd.game.p.n - window.__n0]" },
  { shot: 'i03-ipad-slow' },
  { log: "[getComputedStyle(document.getElementById('pauseBtn')).width, getComputedStyle(document.getElementById('slowBtn')).width]" },
  // offline: the worker should serve the page with no network
  { log: "navigator.serviceWorker && navigator.serviceWorker.controller ? 'worker active' : 'no worker yet'" },
  { reload: true }, { sleep: 600 },
  { log: "navigator.serviceWorker && navigator.serviceWorker.controller ? 'worker active' : 'no worker yet'" },
  { offline: true },
  { reload: true }, { sleep: 600 },
  { log: "['offline load ok', !!window.ND, window.ND.LEVELS.length]" },
  { shot: 'i04-ipad-offline' },
  { offline: false }
];
