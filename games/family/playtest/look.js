// A first look at Family Fighters: the home card, who's playing, the places, then place 1 played by the autopilot up to
// the first gate and the boss. Pictures in games/dash/playtest/shots/ff-look-*.png.
// Usage: ND_URL=file:///D:/Github/number-dash/games/family/dist/preview.html ND_READY=window.__family ND_BOT=none node games/dash/playtest/shoot.js games/family/playtest/look.js
module.exports = [
  { viewport: [1280, 720] },
  { sleep: 600 },
  { shot: 'ff-look-home' },
  { eval: "document.getElementById('playBtn').click()" },
  { sleep: 300 },
  { shot: 'ff-look-pick' },
  { eval: "document.getElementById('pickGo').click()" },
  { sleep: 900 },
  { shot: 'ff-look-levels' },
  { eval: "__family.auto({ right: 0.85, react: 0.2, dodge: 0.8 }); __family.startLocal(1, 0)" },
  { sleep: 4000 },
  { shot: 'ff-look-play1' },
  { waitFor: "__family.G.S && __family.G.S.zs.length >= 3", timeout: 20000 },
  { sleep: 1500 },
  { shot: 'ff-look-fight' },
  { waitFor: "__family.G.S && __family.G.S.gate && !__family.G.S.gate.open", timeout: 90000 },
  { sleep: 1200 },
  { shot: 'ff-look-gate' },
  { log: "JSON.stringify({ q: __family.G.S.gate.q.text, bi: __family.G.S.bi, hp: __family.G.S.players.map(p => p.hp) })" },
  { eval: "__family.G.S.bi = 5; __family.G.S.gate = null; __family.G.S.lock = null; __family.G.S.zs = []" },
  { waitFor: "__family.G.S && __family.G.S.boss && __family.G.S.boss.st === 'fight'", timeout: 60000 },
  { sleep: 2500 },
  { shot: 'ff-look-boss' },
  { log: "JSON.stringify({ boss: __family.G.S.boss.hp, state: __family.G.S.state })" }
];
