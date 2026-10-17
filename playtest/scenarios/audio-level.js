const patch = `(() => {
  const AC = window.AudioContext;
  window.AudioContext = function (o) { const c = new AC(o); window.__ac = c; const an = c.createAnalyser(); an.fftSize = 2048; window.__an = an; an.connect(c.destination); return c; };
  const conn = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dst, a, b) { if (window.__ac && dst === window.__ac.destination && this !== window.__an) return conn.call(this, window.__an, a, b); return conn.apply(this, arguments); };
  return 'patched';
})()`;
const sample = `new Promise(r => { const an = window.__an, buf = new Float32Array(an.fftSize); let n = 0, sum = 0, peak = 0, cnt = 0; const iv = setInterval(() => { an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) { s += v * v; peak = Math.max(peak, Math.abs(v)); } sum += Math.sqrt(s / buf.length); cnt++; if (++n >= 40) { clearInterval(iv); r({ state: window.__ac.state, t: +window.__ac.currentTime.toFixed(1), rmsAvg: +(sum / cnt).toFixed(4), peak: +peak.toFixed(3) }); } }, 100); })`;
module.exports = [
  { eval: patch },
  { eval: "document.querySelector('[data-go=\"levels\"]').click(); 'menu music'" }, { sleep: 3000 },
  { log: sample },
  { eval: "window.__t.play('cloud'); window.__auto = true; 'lvl'" }, { sleep: 9000 },
  { log: sample },
  { eval: "window.__t.tp(300); 'later'" }, { sleep: 2000 },
  { log: sample },
  { eval: "window.__t.g().state" }
];
