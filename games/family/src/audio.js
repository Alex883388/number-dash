/* games/family/src/audio.js — Sound for Family Fighters: a bouncy band (drums, bass, chords and a plucked lead on a
   five-note scale, a little like a đàn tranh) with a song for each kind of place and a faster one for bosses, and every
   punch, bonk, poof and answer as a made-up sound. No files. Same outside as the arcade's shared Sound (init,
   setVolumes) so arcade-core's guards and music toggle work. Needs save (settings.music and settings.sfx). */
const Sound = (function () {
  'use strict';
  let ctx = null, out, musicBus, sfxBus, delay, noise, timer = 0;
  let song = null, songId = '', start = 0, step = 0;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // songs: root note, chord roots (in scale steps), tempo, a seed for the tune, the lead's sound
  const SONGS = {
    menu: { bpm: 96, root: 50, prog: [0, 3, 4, 2], seed: 5, lead: 'pluck', calm: true },
    street: { bpm: 120, root: 50, prog: [0, 4, 3, 4], seed: 13, lead: 'pluck' },
    fields: { bpm: 112, root: 52, prog: [0, 3, 0, 4], seed: 29, lead: 'flute' },
    sea: { bpm: 116, root: 48, prog: [0, 2, 3, 4], seed: 43, lead: 'pluck' },
    cave: { bpm: 108, root: 45, prog: [0, 1, 3, 2], seed: 61, lead: 'flute', minor: true },
    night: { bpm: 124, root: 47, prog: [0, 3, 1, 4], seed: 71, lead: 'square', minor: true },
    boss: { bpm: 140, root: 45, prog: [0, 0, 1, 3], seed: 89, lead: 'square', boss: true, minor: true },
    win: { bpm: 126, root: 55, prog: [0, 3, 4, 0], seed: 97, lead: 'pluck' }
  };
  const PENTA = [0, 2, 4, 7, 9], MINPENTA = [0, 3, 5, 7, 10];
  const deg = (s, d) => { const sc = s.minor ? MINPENTA : PENTA; return s.root + sc[((d % 5) + 5) % 5] + 12 * Math.floor(d / 5); };

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
    delay.delayTime.value = 0.3; fb.gain.value = 0.28; dl.type = 'lowpass'; dl.frequency.value = 2400;
    delay.connect(dl); dl.connect(fb); fb.connect(delay); dl.connect(musicBus);
    noise = makeNoise();
    setVolumes();
    timer = setInterval(tick, 25);
    if (songId) { const id = songId; songId = ''; play(id); }
  }
  function setVolumes() {
    if (!ctx) return;
    const s = (typeof save !== 'undefined' && save.settings) || {};
    musicBus.gain.setTargetAtTime((s.music != null ? s.music : 0.7) * 0.45, ctx.currentTime, 0.05);
    sfxBus.gain.setTargetAtTime((s.sfx != null ? s.sfx : 0.8) * 0.9, ctx.currentTime, 0.05);
  }

  /* ---------- instruments ---------- */
  function env(g, t, a, peak, d, sus, rel, end) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + d);
    g.gain.setValueAtTime(Math.max(0.0001, peak * sus), Math.max(end, t + a + d)); g.gain.exponentialRampToValueAtTime(0.0001, Math.max(end, t + a + d) + rel);
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
  function kick(t, v) { osc('sine', 140, t, t + 0.2, musicBus, { to: 44, glide: 0.15, v: v || 0.5, d: 0.18, s: 0.01, r: 0.05 }); }
  function snare(t, v) { hiss(t, 0.16, musicBus, { type: 'bandpass', f: 2000, q: 0.8, v: v || 0.18 }); osc('triangle', 200, t, t + 0.08, musicBus, { to: 150, v: (v || 0.18) * 0.7, d: 0.06, s: 0.01 }); }
  function hat(t, v) { hiss(t, 0.04, musicBus, { f: 8000, v: v || 0.04 }); }
  function block(t, v, hi) { osc('sine', hi ? 1650 : 1200, t, t + 0.05, musicBus, { v: v || 0.06, d: 0.04, s: 0.01 }); }
  // the plucked lead: a bright string that bends up a little, like a đàn tranh
  function pluck(f, t, d16, n, v, bus) {
    osc('triangle', f * 0.985, t, t + d16 * n, bus || musicBus, { to: f, glide: 0.06, v: v, d: 0.18, s: 0.25, r: 0.15, send: true });
    osc('sine', f * 2, t, t + 0.12, bus || musicBus, { v: v * 0.35, d: 0.1, s: 0.05 });
  }

  /* ---------- the band ---------- */
  function melody(s) {
    let a = s.seed * 7919 + 13;
    const r = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
    const out2 = [];
    for (let ph = 0; ph < 2; ph++) {
      const notes = []; let d = 5 + Math.floor(r() * 3);
      for (let st = 0; st < 32; st++) {
        if ([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 3, 11, 19, 27].indexOf(st) < 0) continue;
        if (r() < (s.calm ? 0.4 : 0.55)) { d = Math.max(3, Math.min(11, d + [-2, -1, -1, 0, 1, 1, 2][Math.floor(r() * 7)])); notes.push([st, d, [1, 2, 2, 3][Math.floor(r() * 4)]]); }
      }
      out2.push(notes);
    }
    return out2;
  }
  function playStep(i, t, d16) {
    const s = song, bar = Math.floor(i / 16), st = i % 16, sec = bar % 16;
    const ch = s.prog[Math.floor(bar / 2) % s.prog.length];
    const intro = bar < 1, brk = sec === 15;
    if (!intro && !brk) {
      if (s.calm ? st === 0 || st === 8 : (st === 0 || st === 8 || (s.boss && st === 10) || st === 6 && sec % 2)) kick(t, s.boss ? 0.55 : 0.48);
      if (st === 4 || st === 12) snare(t, s.calm ? 0.1 : 0.17);
      if (st % 2 === 0) hat(t, st % 4 === 2 ? 0.05 : 0.03);
      if (!s.calm && (st === 3 || st === 11) && sec % 2 === 1) block(t, 0.05, st === 11);
    }
    // bass: a bouncy root and fifth
    if (!brk && (st === 0 || st === 6 || st === 8 || st === 14)) {
      const m = deg(s, ch) - 24 + (st === 6 || st === 14 ? 7 : 0);
      osc('sawtooth', mtof(m), t, t + d16 * 1.5, musicBus, { lp: 420 + (s.boss ? 300 : 0), lpTo: 180, v: 0.12, d: 0.1, s: 0.4 });
      osc('sine', mtof(m - 12), t, t + d16 * 1.5, musicBus, { v: 0.1, d: 0.1, s: 0.6 });
    }
    // chords: off-beat stabs
    if (!intro && (st === 2 || st === 6 || st === 10 || st === 14) && !s.calm) for (const k of [0, 2, 4]) osc('square', mtof(deg(s, ch + k) + 12), t, t + d16 * 0.7, musicBus, { lp: 1600, v: 0.016, d: 0.05, s: 0.3 });
    if (s.calm && st === 0 && bar % 2 === 0) for (const k of [0, 2, 4]) osc('triangle', mtof(deg(s, ch + k) + 12), t, t + d16 * 28, musicBus, { v: 0.025, a: 0.3, d: 0.4, s: 0.7, r: 0.5 });
    // lead: two phrases over the middle of the loop
    if (sec >= 2 && sec < 14 && !brk) {
      const ph = s.mel[(sec >> 1) % 2], pi = (sec % 2) * 16 + st;
      for (const n of ph) if (n[0] === pi) {
        const f = mtof(deg(s, n[1]) + 12);
        if (s.lead === 'pluck') pluck(f, t, d16, n[2], 0.09);
        else if (s.lead === 'flute') { osc('sine', f, t, t + d16 * n[2], musicBus, { v: 0.08, a: 0.03, d: 0.1, s: 0.7, r: 0.1, send: true }); osc('sine', f * 2, t, t + d16 * n[2], musicBus, { v: 0.015, a: 0.03, s: 0.6 }); }
        else { osc('square', f, t, t + d16 * n[2], musicBus, { lp: 2600, v: 0.045, d: 0.1, s: 0.6, r: 0.1, send: true, detune: 5 }); osc('square', f, t, t + d16 * n[2], musicBus, { lp: 2600, v: 0.03, d: 0.1, s: 0.6, r: 0.1, detune: -7 }); }
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
    swing() { const t = T(); hiss(t, 0.12, sfxBus, { type: 'bandpass', f: 900, fTo: 2600, q: 1.2, v: 0.08, a: 0.02 }); },
    punch(n) { const t = T(), big = n >= 2; osc('sine', big ? 170 : 220, t, t + (big ? 0.18 : 0.1), sfxBus, { to: 60, v: big ? 0.32 : 0.22, d: 0.08, s: 0.1 }); hiss(t, big ? 0.12 : 0.07, sfxBus, { type: 'lowpass', f: 2200, v: big ? 0.16 : 0.1 }); },
    bonk() { const t = T(); osc('square', 520, t, t + 0.08, sfxBus, { to: 260, v: 0.06, lp: 2400, d: 0.06, s: 0.2 }); osc('sine', 130, t, t + 0.1, sfxBus, { to: 60, v: 0.2, d: 0.06, s: 0.1 }); },
    clang() { const t = T(); [880, 1320, 1990].forEach((f, i) => osc('sine', f, t, t + 0.4, sfxBus, { v: 0.05 - i * 0.012, d: 0.2, s: 0.1, r: 0.2 })); },
    block() { const t = T(); osc('triangle', 300, t, t + 0.08, sfxBus, { to: 240, v: 0.12, d: 0.06, s: 0.1 }); hiss(t, 0.06, sfxBus, { type: 'bandpass', f: 1200, v: 0.08 }); },
    poof() { const t = T(); hiss(t, 0.3, sfxBus, { type: 'bandpass', f: 1800, fTo: 500, q: 0.8, v: 0.14, a: 0.01 }); osc('sine', 600, t, t + 0.15, sfxBus, { to: 1200, v: 0.05, d: 0.1, s: 0.2 }); },
    hurt() { const t = T(); osc('square', 330, t, t + 0.16, sfxBus, { to: 180, v: 0.06, lp: 1600, d: 0.1, s: 0.3 }); osc('sine', 110, t, t + 0.12, sfxBus, { to: 60, v: 0.18, d: 0.08, s: 0.1 }); },
    down() { const t = T(); [72, 67, 63, 60].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.14, t + i * 0.14 + 0.16, sfxBus, { v: 0.08, d: 0.1, s: 0.4 })); },
    revive() { const t = T(); [60, 64, 67, 72, 76].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.06, t + i * 0.06 + 0.14, sfxBus, { v: 0.07, d: 0.08, s: 0.4 })); },
    heart() { const t = T(); [76, 79, 84].forEach((m, i) => osc('sine', mtof(m), t + i * 0.08, t + i * 0.08 + 0.3, sfxBus, { v: 0.09, d: 0.2, s: 0.3, r: 0.2 })); },
    jump() { const t = T(); osc('square', 300, t, t + 0.14, sfxBus, { to: 620, v: 0.04, lp: 2000, d: 0.1, s: 0.3 }); },
    land() { const t = T(); osc('sine', 90, t, t + 0.1, sfxBus, { to: 50, v: 0.14, d: 0.06, s: 0.1 }); hiss(t, 0.08, sfxBus, { type: 'lowpass', f: 700, v: 0.05 }); },
    throw() { const t = T(); hiss(t, 0.22, sfxBus, { type: 'bandpass', f: 1400, fTo: 3200, q: 2, v: 0.08, a: 0.02 }); },
    quake() { const t = T(); osc('sine', 120, t, t + 0.5, sfxBus, { to: 30, v: 0.4, d: 0.2, s: 0.3 }); hiss(t, 0.45, sfxBus, { type: 'lowpass', f: 900, fTo: 150, v: 0.22 }); },
    cart() { const t = T(); for (let i = 0; i < 2; i++) { osc('square', 740, t + i * 0.16, t + i * 0.16 + 0.11, sfxBus, { v: 0.05, lp: 2400 }); osc('square', 932, t + i * 0.16, t + i * 0.16 + 0.11, sfxBus, { v: 0.04, lp: 2400 }); } osc('sawtooth', 70, t + 0.3, t + 1.0, sfxBus, { to: 160, v: 0.06, lp: 700, s: 0.7 }); },
    whirl() { const t = T(); for (let i = 0; i < 5; i++) hiss(t + i * 0.2, 0.16, sfxBus, { type: 'bandpass', f: 700, fTo: 2200, q: 1.5, v: 0.08, a: 0.03 }); },
    slippers() { const t = T(); for (let i = 0; i < 5; i++) hiss(t + i * 0.05, 0.18, sfxBus, { type: 'bandpass', f: 1200 + i * 200, fTo: 3000, q: 2, v: 0.06, a: 0.02 }); },
    coin() { const t = T(); osc('square', 1320, t, t + 0.06, sfxBus, { v: 0.035, lp: 4000 }); osc('square', 1760, t + 0.06, t + 0.18, sfxBus, { v: 0.035, lp: 4000 }); },
    eat() { const t = T(); [0, 0.09, 0.18].forEach((d) => osc('sine', 300, t + d, t + d + 0.07, sfxBus, { to: 520, v: 0.09, d: 0.05, s: 0.2 })); },
    sparkle() { const t = T(); [84, 88, 91, 96].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.05, t + i * 0.05 + 0.12, sfxBus, { v: 0.06, d: 0.08, s: 0.3 })); },
    crack() { const t = T(); hiss(t, 0.08, sfxBus, { type: 'bandpass', f: 2600, q: 2, v: 0.12 }); osc('square', 180, t, t + 0.05, sfxBus, { v: 0.04, lp: 1200 }); },
    smash() { const t = T(); for (let i = 0; i < 3; i++) hiss(t + i * 0.04, 0.1, sfxBus, { type: 'bandpass', f: 1800 - i * 400, q: 1.5, v: 0.12 }); osc('sine', 160, t, t + 0.15, sfxBus, { to: 60, v: 0.14 }); },
    groan() { const t = T(); osc('sawtooth', 120 + Math.random() * 40, t, t + 0.45, sfxBus, { to: 85, v: 0.04, lp: 700, a: 0.08, d: 0.2, s: 0.6 }); },
    bite() { const t = T(); osc('square', 260, t, t + 0.05, sfxBus, { v: 0.05, lp: 1500 }); hiss(t, 0.05, sfxBus, { type: 'bandpass', f: 3000, v: 0.06 }); },
    spit() { const t = T(); hiss(t, 0.15, sfxBus, { type: 'bandpass', f: 600, fTo: 1800, q: 3, v: 0.12 }); },
    boom() { const t = T(); hiss(t, 0.5, sfxBus, { type: 'lowpass', f: 1300, fTo: 120, v: 0.25 }); osc('sine', 150, t, t + 0.35, sfxBus, { to: 35, v: 0.35, d: 0.2, s: 0.2 }); osc('square', 800, t, t + 0.12, sfxBus, { to: 1600, v: 0.04, lp: 3000 }); },
    gate() { const t = T(); [67, 72, 76].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.1, t + i * 0.1 + 0.3, sfxBus, { v: 0.07, d: 0.2, s: 0.3, r: 0.2 })); osc('sine', mtof(79), t + 0.3, t + 0.9, sfxBus, { v: 0.05, d: 0.3, s: 0.4, r: 0.3 }); },
    right() { const t = T(); [72, 76, 79, 84, 88].forEach((m, i) => { osc('sine', mtof(m), t + i * 0.06, t + i * 0.06 + 0.45, sfxBus, { v: 0.1, d: 0.25, s: 0.3, r: 0.3 }); osc('sine', mtof(m) * 2.76, t + i * 0.06, t + i * 0.06 + 0.2, sfxBus, { v: 0.025, d: 0.15, s: 0.1 }); }); },
    wrong() { const t = T(); osc('square', 196, t, t + 0.3, sfxBus, { to: 147, v: 0.06, lp: 900 }); osc('square', 207, t, t + 0.3, sfxBus, { to: 155, v: 0.05, lp: 900 }); },
    open() { const t = T(); hiss(t, 0.6, sfxBus, { type: 'bandpass', f: 400, fTo: 1600, q: 1, v: 0.1, a: 0.05 }); osc('sawtooth', 90, t, t + 0.5, sfxBus, { to: 180, v: 0.05, lp: 600 }); },
    gong() { const t = T(); [196, 294, 415, 523].forEach((f, i) => osc('sine', f, t, t + 1.4, sfxBus, { v: 0.09 - i * 0.018, a: 0.005, d: 0.4, s: 0.4, r: 0.8 })); },
    alarm() { const t = T(); for (let i = 0; i < 3; i++) { osc('square', 440, t + i * 0.36, t + i * 0.36 + 0.16, sfxBus, { v: 0.05, lp: 1800 }); osc('square', 330, t + i * 0.36 + 0.18, t + i * 0.36 + 0.34, sfxBus, { v: 0.05, lp: 1800 }); } },
    roar() { const t = T(); osc('sawtooth', 90, t, t + 0.8, sfxBus, { to: 60, v: 0.12, lp: 900, a: 0.05, d: 0.3, s: 0.6 }); hiss(t, 0.7, sfxBus, { type: 'bandpass', f: 500, q: 0.7, v: 0.12, a: 0.05 }); },
    slam() { const t = T(); osc('sine', 100, t, t + 0.3, sfxBus, { to: 40, v: 0.35, d: 0.15, s: 0.2 }); hiss(t, 0.25, sfxBus, { type: 'lowpass', f: 1000, v: 0.15 }); },
    beam() { const t = T(); osc('sawtooth', 880, t, t + 0.5, sfxBus, { to: 220, v: 0.06, lp: 3000, s: 0.6 }); },
    won() { const t = T(); [67, 72, 76, 79, 84, 88, 91].forEach((m, i) => pluck(mtof(m), t + i * 0.09, 0.1, 2, 0.12, sfxBus)); },
    wipe() { const t = T(); [67, 66, 65, 62].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.3, t + i * 0.3 + (i === 3 ? 0.7 : 0.26), sfxBus, { v: 0.09, d: 0.1, s: 0.6, r: 0.2 })); },
    wave() { const t = T(); osc('sine', 330, t, t + 0.12, sfxBus, { v: 0.05 }); osc('sine', 440, t + 0.12, t + 0.24, sfxBus, { v: 0.05 }); },
    go() { const t = T(); [72, 79].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.1, t + i * 0.1 + 0.15, sfxBus, { v: 0.08, d: 0.08, s: 0.4 })); },
    click() { const t = T(); osc('sine', 880, t, t + 0.04, sfxBus, { v: 0.04, d: 0.03, s: 0.1 }); },
    join() { const t = T(); [72, 76, 79].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.07, t + i * 0.07 + 0.12, sfxBus, { v: 0.07, d: 0.06, s: 0.4 })); }
  };
  function sfx(name, arg) { if (ctx && fx[name] && ctx.state === 'running') { try { fx[name](arg); } catch (e) { /* a sound must never stop the game */ } } }
  return { init, setVolumes, play, stop, sfx, ready: () => !!ctx, get song() { return songId; } };
})();
