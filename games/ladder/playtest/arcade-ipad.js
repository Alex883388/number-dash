// Number Arcade on an emulated iPad (run from the repo root, against the built site):
//   ND_SERVE=../../docs ND_READY='document.readyState === "complete"' ND_BOT=none node games/dash/playtest/shoot.js games/ladder/playtest/arcade-ipad.js
// Finger taps only: home -> Number Ladder -> a jump -> pause -> back home -> Number Dash, then
// portrait iPad, a dark phone, and the ladder opening with no network.
const errs = "window.__errs = window.__errs || []; window.addEventListener('error', (e) => window.__errs.push(String(e.message))); 'listening'";
const hubReady = "!!document.getElementById('stats') && document.getElementById('stats').children.length === 6";
const ladderReady = "!!window.__ladder && document.readyState === 'complete'";
module.exports = [
  { ipad: true },
  { viewport: [1180, 820, true, false, 2] },
  { reload: true },
  { sleep: 800 }, { shot: 'a01-hub-ipad' },
  { log: "[document.getElementById('stats').innerText.replace(/\\n+/g, ' '), document.getElementById('tip').hidden]" },
  // into the ladder by finger
  { touchEl: '.game[href="ladder/"]' },
  { waitFor: ladderReady, timeout: 10000 }, { eval: errs }, { sleep: 700 },
  { shot: 'a02-ladder-home-ipad' },
  { log: "[document.getElementById('hubLink').hidden, document.getElementById('hubLink').getAttribute('href')]" },
  { touchEl: '#playBtn' },
  { waitFor: "window.__ladder.game.state === 'play' && window.__ladder.game.cube.ground", timeout: 8000 },
  { sleep: 300 },
  { touch: [590, 560, 60] }, { sleep: 140 },
  { log: "['after tap', window.__ladder.game.cube.y.toFixed(2), window.__ladder.game.cube.vy.toFixed(1)]" },
  { log: "[getComputedStyle(document.getElementById('pauseBtn')).width, matchMedia('(pointer: coarse)').matches]" },
  { sleep: 200 }, { shot: 'a03-ladder-jump-ipad' },
  { sleep: 1200 },
  { touchEl: '#pauseBtn' }, { sleep: 400 },
  { log: "[window.__ladder.game.state, document.getElementById('s-pause').hidden]" },
  { shot: 'a04-ladder-pause-ipad' },
  { touchEl: '#homeBtn' }, { sleep: 500 },
  { log: 'JSON.stringify(window.__errs)' },
  // back to the arcade and into Number Dash
  { touchEl: '#hubLink' },
  { waitFor: hubReady, timeout: 10000 }, { sleep: 500 },
  { touchEl: '.game[href="dash/"]' },
  { waitFor: '!!(window.ND && window.__nd)', timeout: 10000 }, { eval: errs }, { sleep: 800 },
  { shot: 'a05-dash-home-ipad' },
  { log: "[document.getElementById('hubLink').hidden, document.getElementById('hubLink').getAttribute('href')]" },
  { log: 'JSON.stringify(window.__errs)' },
  // the newer games: open each from the home page by finger, start it, check its way back
  ...[['pair', '!!window.__pair', '#playBtn', "window.__pair.game.state"],
      ['pop', '!!window.__pop', '#playBtn', "window.__pop.game.state"],
      ['spell', '!!window.__spell', '#startBtn', "window.__spell.state()"],
      ['quest', '!!window.__quest', '#goBtn', "window.__quest.L.kind + ' ' + !document.getElementById('lesson').hidden"],
      ['memory', '!!window.__memory', '#playBtn', "window.__memory.state()"],
      ['robot', '!!window.__robot', '#contBtn', "window.__robot.state().state"],
      ['castle', '!!window.__castle', '#playBtn', "!document.getElementById('s-maps').hidden"],
      ['tycoon', '!!window.__tycoon', '[data-new="0"]', "!document.getElementById('s-new').hidden"],
      ['mech', '!!window.__mech', '#playBtn', "!document.getElementById('s-brief').hidden"]].flatMap(([dir, ready, btn, st]) => [
    { eval: "location.href = '../'; 'home'" }, { waitFor: hubReady, timeout: 10000 }, { sleep: 400 },
    { touchEl: '.game[href="' + dir + '/"]' },
    { waitFor: ready + " && document.readyState === 'complete'", timeout: 10000 }, { eval: errs }, { sleep: 700 },
    { log: "['" + dir + "', document.querySelector('[data-hub]').hidden, document.querySelector('[data-hub]').getAttribute('href')]" },
    { touchEl: btn }, { sleep: 1200 },
    { log: "['" + dir + " after tap', " + st + "]" },
    { shot: 'a05-' + dir + '-ipad' },
    { log: 'JSON.stringify(window.__errs)' }
  ]),
  { eval: "location.href = '../dash/'; 'dash'" }, { waitFor: '!!(window.ND && window.__nd)', timeout: 10000 },
  // portrait iPad
  { viewport: [820, 1180, true, false, 2] },
  { eval: "location.href = '../ladder/'; 'go'" },
  { waitFor: ladderReady, timeout: 10000 }, { eval: errs }, { sleep: 700 },
  { shot: 'a06-ladder-home-portrait' },
  { touchEl: '#playBtn' },
  { waitFor: "window.__ladder.game.state === 'play'", timeout: 8000 }, { sleep: 1500 },
  { shot: 'a07-ladder-play-portrait' },
  { log: 'JSON.stringify(window.__errs)' },
  // a dark phone on the arcade home
  { viewport: [390, 844, true, true, 3] },
  { eval: "location.href = '../'; 'go'" },
  { waitFor: hubReady, timeout: 10000 }, { sleep: 600 },
  { shot: 'a08-hub-phone-dark' },
  { log: '[document.documentElement.scrollWidth, innerWidth]' },
  // offline: the worker serves the ladder with no network
  { log: "navigator.serviceWorker && navigator.serviceWorker.controller ? 'worker active' : 'no worker yet'" },
  { viewport: [1180, 820, true, false, 2] },
  { offline: true },
  { eval: "location.href = 'ladder/'; 'go'" },
  { waitFor: ladderReady, timeout: 10000 },
  { log: "['offline ladder', !!window.__ladder, location.pathname]" },
  { offline: false }
];
