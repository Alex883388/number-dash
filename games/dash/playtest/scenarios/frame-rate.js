const meas = "new Promise(r => { const ts = []; let last = performance.now(); function f(t) { ts.push(t - last); last = t; if (ts.length < 120) requestAnimationFrame(f); else { ts.sort((a,b)=>a-b); r({ median: +ts[60].toFixed(1), p90: +ts[108].toFixed(1), max: +ts[119].toFixed(1) }); } } requestAnimationFrame(f); })";
module.exports = [
  { viewport: [1280, 720, false, false] },
  { eval: "window.__t.play('cloud'); 'go'" }, { sleep: 1000 },
  { log: meas }, { log: "window.__t.state()" },
  { eval: "window.__t.tp(255); 'tp'" }, { sleep: 300 }, { log: meas },
  { eval: "window.__auto = true; 'bot'" }, { log: meas }, { log: "window.__t.state()" }
];
