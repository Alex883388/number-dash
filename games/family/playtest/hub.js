// The arcade home page with Family Fighters' card (served from docs/). Usage:
//   ND_SERVE=../../docs ND_PROFILE=edge-profile-ff-hub ND_READY="!!document.querySelector('.games')" ND_BOT=none node games/dash/playtest/shoot.js games/family/playtest/hub.js
module.exports = [
  { viewport: [1180, 820, true, false, 1] },
  { eval: "localStorage.setItem('family-fighters.v1', JSON.stringify({ v: 1, levels: { 1: { won: true, stars: 3 }, 2: { won: true, stars: 2 } } })); location.reload(); 'ok'" },
  { sleep: 1200 },
  { shot: 'ff-hub-top' },
  { eval: "document.querySelector('a.game[href=\"family/\"]').scrollIntoView({ block: 'center' }); 'scrolled'" },
  { sleep: 400 },
  { shot: 'ff-hub-card' },
  { log: "document.getElementById('familyMeta').textContent" },
  { log: "Array.from(document.querySelectorAll('#news li')).slice(0, 1).map((l) => l.textContent).join('')" },
  { eval: "document.querySelector('a.game[href=\"family/\"]').click(); 'open'" },
  { sleep: 2500 },
  { log: "location.pathname + ' ' + !!window.__family + ' ' + !!document.querySelector('[data-hub]:not([hidden])')" },
  { shot: 'ff-hub-game' }
];
