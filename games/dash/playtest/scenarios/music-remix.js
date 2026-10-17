// Each new attempt should switch to the next remix and keep the music playing.
const patch = `(() => {
  const AC = window.AudioContext;
  window.AudioContext = function (o) { const c = new AC(o); window.__ac = c; const an = c.createAnalyser(); an.fftSize = 2048; window.__an = an; an.connect(c.destination); return c; };
  const conn = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dst, a, b) { if (window.__ac && dst === window.__ac.destination && this !== window.__an) return conn.call(this, window.__an, a, b); return conn.apply(this, arguments); };
  return 'patched';
})()`;
const rms = `new Promise(r => { const an = window.__an, buf = new Float32Array(an.fftSize); let sum = 0, peak = 0, n = 0; const iv = setInterval(() => { an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) { s += v * v; peak = Math.max(peak, Math.abs(v)); } sum += Math.sqrt(s / buf.length); if (++n >= 15) { clearInterval(iv); r({ rms: +(sum / n).toFixed(4), peak: +peak.toFixed(3) }); } }, 100); })`;
const attempt = (k) => [
  { waitFor: `window.__nd.game.attempts >= ${k} && window.__nd.game.state === 'play'`, timeout: 15000 },
  { sleep: 400 },
  { log: `[window.__nd.game.attempts, window.__nd.game.attemptText.track]` },
  { log: rms }
];
module.exports = [
  { viewport: [1280, 720, false, false] },
  { eval: patch },
  { eval: "window.__t.play('cloud'); 'go'" },
  ...attempt(1), ...attempt(2), { shot: 'remix-attempt-2' }, ...attempt(3), ...attempt(4), ...attempt(5), ...attempt(6), ...attempt(7), ...attempt(8), ...attempt(9),
  { eval: "window.__t.play('moon', true); 'practice'" },
  ...attempt(1),
  { eval: "window.__auto = true; 'bot'" }, { waitFor: "window.__nd.game.checkpoints.length >= 2", timeout: 20000 },
  { eval: "window.__auto = false; 'off'" },
  ...attempt(2), { shot: 'remix-practice-respawn' }
];
