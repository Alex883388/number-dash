// How smoothly Family Fighters runs: the real frame rate (frames the browser shows in 4 seconds) during a busy fight in
// place 10 (the Secret Lab) with four fighters, at an iPad's size and at a phone's. Usage:
//   ND_URL=file:///D:/Github/number-dash/games/family/dist/preview.html ND_PROFILE=edge-profile-ff-speed ND_READY='!!window.__family' ND_BOT=none node games/dash/playtest/shoot.js games/family/playtest/speed.js
const F = 'window.__family';
const fps = (tag) => ({ log: `new Promise((ok) => { let n = 0, worst = 0, last = performance.now(); const t0 = last; const f = (t) => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 4000) requestAnimationFrame(f); else ok('${tag}: ' + (n / ((t - t0) / 1000)).toFixed(1) + ' frames a second, slowest ' + worst.toFixed(0) + ' ms, ' + ${F}.G.S.zs.length + ' zombies, ' + document.getElementById('game').width + 'x' + document.getElementById('game').height); }; requestAnimationFrame(f); })` });
module.exports = [
  { viewport: [1180, 820, true, false, 2] },
  { eval: `${F}.G.seats = [{ id: 'p1', hero: 'bin', devs: 'p1' }, { id: 'p2', hero: 'bo', devs: ['kbB'] }, { id: 'p3', hero: 'dad', devs: ['pad0'] }, { id: 'p4', hero: 'mum', devs: ['pad1'] }]; ${F}.auto({ right: 0.9, react: 0.2, dodge: 0.8 }); ${F}.startLocal(10, 0); 'go'` },
  { waitFor: `${F}.G.S.zs.length >= 8`, timeout: 40000 }, { sleep: 500 },
  fps('iPad size, a fight'),
  { shot: 'ff-speed-fight' },
  { viewport: [844, 390, true, false, 3] }, { sleep: 800 },
  fps('phone size, a fight'),
  { viewport: [1180, 820, true, false, 2] }, { sleep: 500 },
  { log: `${F}.SC.quality + ' quality'` }
];
