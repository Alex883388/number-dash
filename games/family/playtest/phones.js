// Family Fighters on a phone held sideways, and upright (the turn card), with two players' cards and a question up.
// Usage: ND_URL=file:///D:/Github/number-dash/games/family/dist/preview.html ND_PROFILE=edge-profile-ff-phone ND_READY='!!window.__family' ND_BOT=none node games/dash/playtest/shoot.js games/family/playtest/phones.js
const F = 'window.__family';
module.exports = [
  { ipad: true },
  { viewport: [844, 390, true, false, 3] },
  { eval: "localStorage.clear(); 'fresh'" }, { reload: true }, { sleep: 800 },
  { shot: 'ff-phone-01-home' },
  { eval: `${F}.G.seats = [{ id: 'p1', hero: 'mum', devs: 'p1' }, { id: 'p2kbB', hero: 'dad', devs: ['kbB'] }]; ${F}.showPick(); 'two'` }, { sleep: 500 },
  { shot: 'ff-phone-02-pick' },
  { eval: `${F}.auto({ right: 1, react: 0.2, dodge: 0.9 }); ${F}.startLocal(1, 0); 'go'` },
  { waitFor: `${F}.G.S.zs.length >= 3`, timeout: 30000 }, { sleep: 1200 },
  { shot: 'ff-phone-03-fight' },
  { waitFor: `${F}.G.S.gate && !${F}.G.S.gate.open`, timeout: 120000 }, { sleep: 600 },
  { eval: `${F}.G.autopilot = null; 'stop'` },
  { shot: 'ff-phone-04-gate' },
  { viewport: [390, 844, true, false, 3] }, { sleep: 500 },
  { shot: 'ff-phone-05-upright' },
  { viewport: [1366, 1024, true, false, 2] }, { sleep: 600 },
  { shot: 'ff-phone-06-ipadpro' },
  { viewport: [1920, 1080, false, false, 1] }, { sleep: 600 },
  { shot: 'ff-phone-07-desktop' }
];
