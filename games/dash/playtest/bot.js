// Injected into the page by shoot.js: error capture, an autopilot that plays with
// the game's own physics (short look-ahead search), and a few test helpers.
(() => {
  if (window.__botReady) return;
  window.__botReady = true;
  window.__errs = [];
  window.addEventListener('error', (e) => window.__errs.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => window.__errs.push('rejection ' + String(e.reason)));
  window.addEventListener('blur', (e) => e.stopImmediatePropagation(), true);
  window.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);
  const ND = window.ND;
  const orig = ND.__orig || (ND.__orig = ND.step);
  const SUB = 4;
  let plan = [], sub = 0, cur = false, lastP = null, since = 0;
  window.__auto = false;
  window.__botWrong = false;  // when true the bot aims for a wrong door
  function key(q) { return q.mode + ',' + q.grav + ',' + (q.ground ? 1 : 0) + ',' + (q.held ? 1 : 0) + ',' + Math.round(q.y * 32) + ',' + Math.round(q.vy * 4) + ',' + q.lastOrb + ',' + (q.buf > 0 ? 1 : 0) + ',' + (q.obuf > 0 ? 1 : 0); }
  function solve(L, p0, H, cap) {
    let fr = [{ p: ND.clone(p0), path: [], n: 0 }];
    for (let d = 0; d < H; d++) {
      const seen = new Set(), nx = [];
      for (const f of fr) for (const h of [false, true]) {
        const q = ND.clone(f.p);
        for (let s = 0; s < SUB; s++) { orig(L, q, h); if (q.dead || q.done) break; }
        if (q.dead) continue;
        const path = f.path.concat([h]);
        if (q.done) return path;
        const k = key(q); if (seen.has(k)) continue; seen.add(k);
        nx.push({ p: q, path: path, n: f.n + (h ? 1 : 0) });
      }
      if (!nx.length) return null;
      if (nx.length > cap) { nx.sort((a, b) => a.p.y - b.p.y || a.p.vy - b.p.vy); const k2 = []; for (let i = 0; i < cap; i++) k2.push(nx[Math.floor(i * nx.length / cap)]); fr = k2; } else fr = nx;
    }
    fr.sort((a, b) => a.n - b.n);
    return fr[0].path;
  }
  ND.step = function (L, p, held) {
    if (!window.__auto) return orig(L, p, held);
    if (p !== lastP) { lastP = p; plan = []; sub = 0; }
    if (sub % SUB === 0) {
      if (!plan.length || since >= 4) {
        // to test a wrong answer, plan as if the doors were swapped
        const saved = L.gates.map((g) => g.correct);
        if (window.__botWrong) L.gates.forEach((g) => { g.correct = g.correct === 1 ? 2 : 1; });
        plan = solve(L, p, window.__botH || 100, window.__botCap || 160) || [false];  // a test can look further ahead
        L.gates.forEach((g, i) => { g.correct = saved[i]; });
        since = 0;
      }
      cur = plan.shift(); since++;
    }
    sub++;
    return orig(L, p, cur);
  };
  window.__t = {
    play(id, practice) {
      const btn = document.querySelector('[data-go="levels"]'); btn.click();
      const b = document.querySelector('[data-' + (practice ? 'practice' : 'play') + '="' + id + '"]'); b.click();
    },
    g() { return window.__nd.game; },
    tp(x) { // move the runner to column x on the ground, keeping the run going
      const g = window.__nd.game, p = g.p, L = g.L;
      p.x = x; p.y = 0; p.vy = 0; p.ground = true; p.mode = 0; p.grav = 1; p.mini = false; p.spd = 1; p.oi = 0; p.lastOrb = -1;
      while (p.gi < L.gates.length && L.gates[p.gi].doorX + 1 < x) p.gi++;
      g.simT = performance.now();
    },
    state() { const g = window.__nd.game; return g.p ? { st: g.state, x: +g.p.x.toFixed(1), y: +g.p.y.toFixed(2), mode: g.p.mode, att: g.attempts, q: document.getElementById('qText').textContent } : { st: g.state }; }
  };
})();
