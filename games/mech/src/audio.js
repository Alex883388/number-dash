/* games/mech/src/audio.js — Sound for Mech Blaster: a synthwave band (drums, bass, arpeggio, pads and a lead) with a
   song per world and a faster one for bosses, and every weapon, explosion and answer as a made-up sound. No files.
   Same outside as the arcade's shared Sound (init, setVolumes) so arcade-core's guards and music toggle work.
   Needs save (settings.music and settings.sfx). */
const Sound = (function () {
  'use strict';
  let ctx = null, out, musicBus, sfxBus, delay, noise, timer = 0;
  let song = null, songId = '', start = 0, step = 0, laserOsc = null;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // songs: root note, minor-scale chord roots (in scale steps), tempo, a seed for the melody, a sound for the lead
  const SONGS = {
    menu: { bpm: 100, root: 45, prog: [0, 5, 3, 4], seed: 3, lead: 'square', calm: true },
    city: { bpm: 118, root: 45, prog: [0, 5, 2, 6], seed: 11, lead: 'saw' },
    desert: { bpm: 112, root: 43, prog: [0, 3, 4, 3], seed: 23, lead: 'square' },
    ice: { bpm: 116, root: 47, prog: [0, 5, 3, 6], seed: 37, lead: 'tri' },
    volcano: { bpm: 126, root: 40, prog: [0, 1, 5, 4], seed: 41, lead: 'saw' },
    space: { bpm: 122, root: 44, prog: [0, 6, 5, 4], seed: 53, lead: 'tri' },
    boss: { bpm: 138, root: 41, prog: [0, 0, 1, 6], seed: 67, lead: 'saw', boss: true }
  };
  const MINOR = [0, 2, 3, 5, 7, 8, 10];
  const deg = (root, d) => root + MINOR[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);

  function makeNoise() {
    const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ }
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.18;
    out = ctx.createGain(); out.gain.value = 0.85; out.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.connect(out);
    sfxBus = ctx.createGain(); sfxBus.connect(out);
    delay = ctx.createDelay(1); const fb = ctx.createGain(), dl = ctx.createBiquadFilter();
    delay.delayTime.value = 0.32; fb.gain.value = 0.32; dl.type = 'lowpass'; dl.frequency.value = 2600;
    delay.connect(dl); dl.connect(fb); fb.connect(delay); dl.connect(musicBus);
    noise = makeNoise();
    setVolumes();
    timer = setInterval(tick, 25);
    if (songId) { const id = songId; songId = ''; play(id); }
  }
  function setVolumes() {
    if (!ctx) return;
    const s = (typeof save !== 'undefined' && save.settings) || {};
    musicBus.gain.setTargetAtTime((s.music != null ? s.music : 0.7) * 0.5, ctx.currentTime, 0.05);
    sfxBus.gain.setTargetAtTime((s.sfx != null ? s.sfx : 0.8) * 0.9, ctx.currentTime, 0.05);
  }

  /* ---------- instruments ---------- */
  function env(g, t, a, peak, d, sus, rel, end) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + d);
    g.gain.setValueAtTime(Math.max(0.0001, peak * sus), end); g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
  }
  function osc(type, f, t, end, bus, o) {
    o = o || {};
    const n = ctx.createOscillator(), g = ctx.createGain();
    n.type = type; n.frequency.setValueAtTime(f, t);
    if (o.to) n.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || (end - t)));
    if (o.detune) n.detune.value = o.detune;
    let last = n;
    if (o.lp) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(o.lp, t); if (o.lpTo) f2.frequency.exponentialRampToValueAtTime(o.lpTo, end); f2.Q.value = o.q || 1; last.connect(f2); last = f2; }
    last.connect(g); g.connect(bus || musicBus);
    if (o.send) g.connect(delay);
    env(g, t, o.a || 0.005, o.v || 0.1, o.d || 0.1, o.s != null ? o.s : 0.5, o.r || 0.08, end);
    n.start(t); n.stop(end + (o.r || 0.08) + 0.05);
  }
  function hiss(t, dur, bus, o) {
    o = o || {};
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = o.type || 'highpass'; f.frequency.setValueAtTime(o.f || 6000, t);
    if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    if (o.q) f.Q.value = o.q;
    s.connect(f); f.connect(g); g.connect(bus || musicBus);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.v || 0.1, t + (o.a || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.start(t, Math.random() * 0.5, dur + 0.05);
  }
  function kick(t, v) { osc('sine', 150, t, t + 0.22, musicBus, { to: 42, glide: 0.16, v: v || 0.55, d: 0.2, s: 0.01, r: 0.05 }); }
  function snare(t, v) { hiss(t, 0.18, musicBus, { type: 'bandpass', f: 1900, q: 0.8, v: (v || 0.22) }); osc('triangle', 190, t, t + 0.1, musicBus, { to: 140, v: (v || 0.22) * 0.7, d: 0.08, s: 0.01 }); }
  function hat(t, v, open) { hiss(t, open ? 0.16 : 0.045, musicBus, { f: 7500, v: v || 0.05 }); }

  /* ---------- the band ---------- */
  function melody(s) {
    let a = s.seed * 7919 + 13;
    const r = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
    const out2 = [];
    for (let ph = 0; ph < 2; ph++) {
      const notes = []; let d = 4 + Math.floor(r() * 3);
      for (let st = 0; st < 32; st++) {
        if ([0, 3, 6, 8, 10, 12, 14, 16, 19, 22, 24, 27, 28, 30].indexOf(st) < 0) continue;
        if (r() < (s.calm ? 0.42 : 0.6)) { d = Math.max(2, Math.min(9, d + [-2, -1, -1, 0, 1, 1, 2][Math.floor(r() * 7)])); notes.push([st, d, [2, 2, 3, 4][Math.floor(r() * 4)]]); }
      }
      out2.push(notes);
    }
    return out2;
  }
  function playStep(i, t, d16) {
    const s = song, bar = Math.floor(i / 16), st = i % 16, sec = bar % 16;
    const ch = s.prog[Math.floor(bar / 2) % s.prog.length], root = s.root;
    const intro = bar < 2, brk = sec === 15;
    // drums: four on the floor (half time for the menu), claps on 2 and 4
    if (!intro && !brk) {
      if (s.calm ? st === 0 || st === 10 : st % 4 === 0) kick(t, s.boss ? 0.6 : 0.52);
      if (st === 4 || st === 12) snare(t, s.calm ? 0.12 : 0.2);
      if (st % 2 === 0) hat(t, st % 4 === 2 ? 0.06 : 0.035, st % 4 === 2 && !s.calm);
      else if (s.boss || sec % 4 === 3) hat(t, 0.025);
      if (sec % 4 === 3 && st >= 12 && !s.calm) osc('sine', 220 - (st - 12) * 30, t, t + 0.12, musicBus, { to: 90, v: 0.18, d: 0.1, s: 0.01 });
    }
    // bass: eighths on the chord root, octave jumps
    if (!brk && st % 2 === 0) {
      const m = deg(root, ch) + (st % 8 === 6 ? 12 : 0) - 12;
      osc('sawtooth', mtof(m), t, t + d16 * 1.6, musicBus, { lp: 380 + (s.boss ? 300 : 0), lpTo: 160, v: 0.13, d: 0.12, s: 0.4 });
      osc('sine', mtof(m - 12), t, t + d16 * 1.6, musicBus, { v: 0.1, d: 0.1, s: 0.6 });
    }
    // pad: the chord, held for two bars
    if (st === 0 && bar % 2 === 0) for (const k of [0, 2, 4]) for (const dt of [-7, 7]) osc('sawtooth', mtof(deg(root, ch + k) + 12), t, t + d16 * 30, musicBus, { lp: s.calm ? 900 : 1300, v: 0.018, a: 0.4, d: 0.5, s: 0.8, r: 0.6, detune: dt });
    // arpeggio
    if (!intro || s.calm) {
      const k = [0, 2, 4, 7, 4, 2][st % 6];
      osc('square', mtof(deg(root, ch + k) + 24), t, t + d16 * 0.8, musicBus, { lp: 2200, v: 0.028, d: 0.06, s: 0.2, send: true });
    }
    // lead: two phrases over the middle of the loop
    if (sec >= 4 && sec < 12 && !brk) {
      const ph = s.mel[(sec >> 1) % 2], pi = (sec % 2) * 16 + st;
      for (const n of ph) if (n[0] === pi) {
        const f = mtof(deg(root, n[1]) + 24), end = t + d16 * n[2];
        const type = s.lead === 'saw' ? 'sawtooth' : s.lead === 'tri' ? 'triangle' : 'square';
        osc(type, f, t, end, musicBus, { lp: 3200, v: s.lead === 'tri' ? 0.09 : 0.055, d: 0.1, s: 0.6, r: 0.12, send: true, detune: 6 });
        osc(type, f, t, end, musicBus, { lp: 3200, v: s.lead === 'tri' ? 0.05 : 0.035, d: 0.1, s: 0.6, r: 0.12, detune: -8 });
      }
    }
  }
  function tick() {
    if (!ctx || !song || ctx.state !== 'running') return;
    const d16 = 60 / song.bpm / 4, ahead = ctx.currentTime + 0.14;
    for (;;) {
      const t = start + step * d16;
      if (t > ahead) break;
      if (t > ctx.currentTime - 0.05) playStep(step, t, d16);
      step++;
    }
  }
  function play(id) {
    if (songId === id) return;
    songId = id;
    if (!ctx) return;
    song = SONGS[id] ? Object.assign({}, SONGS[id]) : null;
    if (song) { song.mel = melody(song); start = ctx.currentTime + 0.1; step = 0; }
  }
  function stop() { songId = ''; song = null; }

  /* ---------- effects ---------- */
  const T = () => ctx.currentTime;
  const fx = {
    blaster() { const t = T(); osc('square', 1100, t, t + 0.09, sfxBus, { to: 380, v: 0.07, d: 0.05, s: 0.3, lp: 4000 }); hiss(t, 0.04, sfxBus, { f: 3000, v: 0.04 }); },
    gatling() { const t = T(); hiss(t, 0.035, sfxBus, { type: 'bandpass', f: 2400, q: 1, v: 0.09 }); osc('sine', 160, t, t + 0.04, sfxBus, { to: 80, v: 0.08, d: 0.03, s: 0.1 }); },
    rockets() { const t = T(); hiss(t, 0.45, sfxBus, { type: 'bandpass', f: 600, fTo: 2400, q: 1.2, v: 0.12, a: 0.03 }); osc('sawtooth', 90, t, t + 0.3, sfxBus, { to: 160, v: 0.05, lp: 600 }); },
    lightning() { const t = T(); osc('sawtooth', 1600, t, t + 0.18, sfxBus, { to: 220, v: 0.08, d: 0.1, s: 0.3 }); for (let i = 0; i < 4; i++) hiss(t + i * 0.035, 0.03, sfxBus, { f: 5000, v: 0.08 }); },
    plasma(f) { const t = T(); osc('sawtooth', 260 + (f || 0) * 120, t, t + 0.35, sfxBus, { to: 70, v: 0.12 + (f || 0) * 0.06, lp: 2400, lpTo: 300, d: 0.2, s: 0.3 }); hiss(t, 0.25, sfxBus, { type: 'lowpass', f: 1600, v: 0.08 }); },
    freeze() { const t = T(); [96, 100, 103].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.04, t + i * 0.04 + 0.15, sfxBus, { v: 0.05, d: 0.1, s: 0.2 })); hiss(t, 0.2, sfxBus, { f: 8000, v: 0.04 }); },
    hit() { const t = T(); osc('triangle', 640, t, t + 0.05, sfxBus, { to: 300, v: 0.06, d: 0.04, s: 0.1 }); },
    block() { const t = T(); osc('sine', 1800, t, t + 0.12, sfxBus, { v: 0.05, d: 0.1, s: 0.1 }); osc('sine', 2710, t, t + 0.1, sfxBus, { v: 0.03, d: 0.08, s: 0.1 }); },
    boom(big) { const t = T(), v = big ? 0.32 : 0.2; hiss(t, big ? 0.9 : 0.45, sfxBus, { type: 'lowpass', f: big ? 900 : 1400, fTo: 120, v: v }); osc('sine', big ? 110 : 140, t, t + (big ? 0.6 : 0.3), sfxBus, { to: 35, v: v * 1.4, d: 0.2, s: 0.2 }); },
    hurt() { const t = T(); osc('sawtooth', 210, t, t + 0.3, sfxBus, { to: 70, v: 0.12, lp: 1200 }); hiss(t, 0.2, sfxBus, { type: 'bandpass', f: 800, v: 0.1 }); },
    shieldhit() { const t = T(); osc('sine', 600, t, t + 0.18, sfxBus, { to: 1300, v: 0.08 }); },
    jump() { const t = T(); hiss(t, 0.35, sfxBus, { type: 'bandpass', f: 400, fTo: 1600, q: 0.8, v: 0.1, a: 0.02 }); },
    land() { const t = T(); osc('sine', 95, t, t + 0.16, sfxBus, { to: 45, v: 0.22, d: 0.1, s: 0.1 }); hiss(t, 0.12, sfxBus, { type: 'lowpass', f: 600, v: 0.06 }); },
    step() { const t = T(); osc('sine', 72, t, t + 0.09, sfxBus, { to: 48, v: 0.07, d: 0.06, s: 0.1 }); },
    pick() { const t = T(); [84, 88, 91, 96].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.05, t + i * 0.05 + 0.12, sfxBus, { v: 0.07, d: 0.08, s: 0.3 })); },
    right() { const t = T(); [76, 83, 88, 91].forEach((m, i) => { osc('sine', mtof(m), t + i * 0.07, t + i * 0.07 + 0.5, sfxBus, { v: 0.11, d: 0.3, s: 0.3, r: 0.4 }); osc('sine', mtof(m) * 2.76, t + i * 0.07, t + i * 0.07 + 0.2, sfxBus, { v: 0.03, d: 0.15, s: 0.1 }); }); hiss(t + 0.05, 0.5, sfxBus, { f: 5000, v: 0.08 }); },
    wrong() { const t = T(); osc('square', 140, t, t + 0.32, sfxBus, { v: 0.06, lp: 900 }); osc('square', 147, t, t + 0.32, sfxBus, { v: 0.06, lp: 900 }); },
    efire() { const t = T(); osc('sine', 520, t, t + 0.14, sfxBus, { to: 260, v: 0.04, d: 0.1, s: 0.2 }); },
    alarm() { const t = T(); for (let i = 0; i < 3; i++) { osc('square', 660, t + i * 0.42, t + i * 0.42 + 0.18, sfxBus, { v: 0.05, lp: 2000 }); osc('square', 495, t + i * 0.42 + 0.2, t + i * 0.42 + 0.38, sfxBus, { v: 0.05, lp: 2000 }); } },
    nova() { const t = T(); fx.boom(true); [60, 67, 72, 79, 84].forEach((m, i) => osc('sawtooth', mtof(m), t + i * 0.05, t + 0.9, sfxBus, { v: 0.03, lp: 3000, a: 0.05, s: 0.6, r: 0.5 })); },
    won() { const t = T(); [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => osc('square', mtof(m), t + i * 0.09, t + i * 0.09 + 0.25, sfxBus, { v: 0.05, lp: 3500, d: 0.15, s: 0.4 })); },
    down() { const t = T(); osc('sawtooth', 400, t, t + 1.1, sfxBus, { to: 40, v: 0.12, lp: 1500, lpTo: 200, s: 0.6 }); fx.boom(true); },
    gate() { const t = T(); [69, 72, 76].forEach((m) => osc('sawtooth', mtof(m), t, t + 0.35, sfxBus, { v: 0.035, lp: 2600, s: 0.5 })); hiss(t, 0.6, sfxBus, { f: 4000, v: 0.12 }); },
    click() { const t = T(); osc('sine', 880, t, t + 0.04, sfxBus, { v: 0.04, d: 0.03, s: 0.1 }); },
    weapon() { const t = T(); osc('square', 330, t, t + 0.06, sfxBus, { v: 0.04, lp: 2000 }); osc('square', 660, t + 0.06, t + 0.12, sfxBus, { v: 0.04, lp: 2000 }); },
    overheat() { const t = T(); hiss(t, 0.6, sfxBus, { type: 'bandpass', f: 3000, fTo: 800, v: 0.07, a: 0.05 }); }
  };
  function sfx(name, arg) { if (ctx && fx[name] && ctx.state === 'running') { try { fx[name](arg); } catch (e) { /* a sound must never stop the game */ } } }
  // the laser lance hums while its beam is on
  function laser(on) {
    if (!ctx) return;
    if (on && !laserOsc) {
      const t = T(), a = ctx.createOscillator(), b = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      a.type = 'sawtooth'; a.frequency.value = 110; b.type = 'square'; b.frequency.value = 221; f.type = 'lowpass'; f.frequency.value = 1400;
      a.connect(f); b.connect(f); f.connect(g); g.connect(sfxBus); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.05);
      a.start(); b.start(); laserOsc = { a: a, b: b, g: g };
    } else if (!on && laserOsc) {
      const L = laserOsc, t = T(); laserOsc = null;
      L.g.gain.setTargetAtTime(0.0001, t, 0.03); L.a.stop(t + 0.2); L.b.stop(t + 0.2);
    }
  }
  return { init, setVolumes, play, stop, sfx, laser, ready: () => !!ctx, get song() { return songId; } };
})();
