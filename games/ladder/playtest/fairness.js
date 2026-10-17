// How fair each rung's moving blocks are (run from the repo root):
//   ND_URL=file:///D:/Github/number-dash/games/ladder/dist/preview.html ND_READY='!!window.__ladder' ND_BOT=none node games/dash/playtest/shoot.js games/ladder/playtest/fairness.js
// For every rung it builds fresh rows from random starts and asks where a tap at each moment of
// the next 8 seconds would land: on the right answer, a wrong one, or back on the floor.
// right / wrong / miss = share of tap moments; win = the longest stretch of good tap moments
// (a kid's tap is off by tens of milliseconds); wait = the longest time with no 100 ms+ good stretch.
const measure = `(() => {
  const L = window.__ladder, g = L.game, out = [];
  const keep = { state: g.state, rung: g.rung, row: g.row, cube: Object.assign({}, g.cube) };
  const STEP = 1 / 60, SPAN = 8, TRIALS = 6;
  for (let r = 1; r <= L.TOP; r++) {
    let right = 0, wrong = 0, miss = 0, n = 0, win = 0, wait = 0;
    for (let k = 0; k < TRIALS; k++) {
      g.state = 'play'; g.rung = r - 1; g.ghost = false;
      Object.assign(g.cube, { x: Math.random() * 11, y: (r - 1) * L.D, vx: 0, vy: 0, dir: Math.random() < 0.5 ? 1 : -1, ground: true });
      g.row = L.makeRow(r);
      let run = 0, best = 0, lastGood = 0, longestWait = 0;
      for (let d = 0; d <= SPAN; d += STEP) {
        const p = L.predict(d), ok = p.plat >= 0 && g.row.plats[p.plat].correct;
        n++; if (ok) right++; else if (p.plat >= 0) wrong++; else miss++;
        run = ok ? run + STEP : 0; best = Math.max(best, run);
        if (run >= 0.1) lastGood = d;
        longestWait = Math.max(longestWait, d - lastGood);
      }
      win += best / TRIALS; wait = Math.max(wait, longestWait);
    }
    out.push({ r, kind: L.MOTIONS.reduce((m, x) => (r >= x.from ? x : m)).kind + (L.MOTIONS.reduce((m, x) => (r >= x.from ? x : m)).spin ? '+spin' : ''),
      right: Math.round(right / n * 100), wrong: Math.round(wrong / n * 100), miss: Math.round(miss / n * 100), winMs: Math.round(win * 1000), waitS: +wait.toFixed(1) });
  }
  Object.assign(g, { state: keep.state, rung: keep.rung, row: keep.row }); Object.assign(g.cube, keep.cube);
  return out.map((o) => [String(o.r).padStart(2), o.kind.padEnd(11), 'right ' + String(o.right).padStart(2) + '%', 'wrong ' + String(o.wrong).padStart(2) + '%', 'miss ' + String(o.miss).padStart(2) + '%', 'win ' + String(o.winMs).padStart(4) + ' ms', 'wait ' + o.waitS + ' s'].join('  ')).join('\\n');
})()`;
module.exports = [
  { sleep: 300 },
  { eval: measure }
];
