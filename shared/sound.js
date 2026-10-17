/* shared/sound.js — Sound: the live lo-fi music engine and sound effects. Needs SONGS, HATS, remixOf, save, clamp, frac.
   Inlined at build time into every game that uses it (see build.js). */
const Sound = (function () {
  let ctx = null, out, musicBus, musicLP, sfxBus, verbSend, keysIn, keysLP, bassIn, drumIn, melIn, wowGain, noise, crackleGain;
  let song = null, vari = null, songId = '', songStart = 0, step = 0, phrases = null, G = null;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function makeNoise(sec) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function makeCrackle(sec) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() < 0.0007 ? (Math.random() * 2 - 1) * 0.7 : 0) + (Math.random() * 2 - 1) * 0.004;
    return b;
  }
  function makeVerb(sec) {
    const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
    return b;
  }
  function filter(type, f, q) { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; return n; }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // iPhone and iPad: play through the speaker even when the silent switch is on
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ }
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
    out = ctx.createGain(); out.gain.value = 0.9; out.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicLP = filter('lowpass', 16000, 0.5); musicBus.connect(musicLP); musicLP.connect(out);
    sfxBus = ctx.createGain(); sfxBus.connect(out);
    const verb = ctx.createConvolver(); verb.buffer = makeVerb(2.4);
    verbSend = ctx.createGain(); verbSend.gain.value = 0.26; verbSend.connect(verb); verb.connect(musicBus);
    keysIn = ctx.createGain();
    keysLP = filter('lowpass', 2300);
    const trem = ctx.createGain(); trem.gain.value = 0.86;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 4.2; const lfoG = ctx.createGain(); lfoG.gain.value = 0.12;
    lfo.connect(lfoG); lfoG.connect(trem.gain); lfo.start();
    keysIn.connect(keysLP); keysLP.connect(trem); trem.connect(musicBus); trem.connect(verbSend);
    const wow = ctx.createOscillator(); wow.frequency.value = 0.55; wowGain = ctx.createGain(); wowGain.gain.value = 7; wow.connect(wowGain); wow.start();
    bassIn = ctx.createGain(); const bLP = filter('lowpass', 520); bassIn.connect(bLP); bLP.connect(musicBus);
    drumIn = ctx.createGain(); const dLP = filter('lowpass', 6500); drumIn.connect(dLP); dLP.connect(musicBus);
    melIn = ctx.createGain();
    const delay = ctx.createDelay(1.5), fb = ctx.createGain(), delLP = filter('lowpass', 2600);
    delay.delayTime.value = 0.42; fb.gain.value = 0.3;
    melIn.connect(musicBus); melIn.connect(delay); delay.connect(delLP); delLP.connect(fb); fb.connect(delay); delLP.connect(musicBus); melIn.connect(verbSend);
    noise = makeNoise(1);
    crackleGain = ctx.createGain(); crackleGain.gain.value = 0;
    const cr = ctx.createBufferSource(); cr.buffer = makeCrackle(3.3); cr.loop = true;
    const cHP = filter('highpass', 1200); cr.connect(cHP); cHP.connect(crackleGain); crackleGain.connect(musicBus); cr.start();
    newGen();
    setVolumes();
    setInterval(tick, 25);
  }
  // Notes enter through a per-song "generation" of gains, so a song or remix change
  // can fade out the notes still ringing from the one before.
  function newGen() {
    const old = G;
    G = { keys: ctx.createGain(), bass: ctx.createGain(), drum: ctx.createGain(), mel: ctx.createGain() };
    G.keys.connect(keysIn); G.bass.connect(bassIn); G.drum.connect(drumIn); G.mel.connect(melIn);
    if (!old) return;
    for (const k in old) old[k].gain.setTargetAtTime(0, ctx.currentTime, 0.06);
    setTimeout(() => { for (const k in old) { try { old[k].disconnect(); } catch (e) { /* gone */ } } }, 4000);
  }
  function setVolumes() {
    if (!ctx) return;
    musicBus.gain.setTargetAtTime(save.settings.music * 0.6, ctx.currentTime, 0.05);
    sfxBus.gain.setTargetAtTime(save.settings.sfx * 0.6, ctx.currentTime, 0.05);
  }

  // ---- instruments ----
  function keyNote(t, m, v, dur) {
    const f = mtof(m), g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(v * 0.32, t + 0.7);
    g.gain.setTargetAtTime(0.0001, t + Math.max(0.75, dur), 0.25);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2;
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.5, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    wowGain.connect(o.detune);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(G.keys);
    o.start(t); o2.start(t); o.stop(t + dur + 1.4); o2.stop(t + 0.5);
    o.onended = () => { try { wowGain.disconnect(o.detune); } catch (e) { /* already gone */ } };
  }
  function bassNote(t, m, v, dur) {
    const f = mtof(m), g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02);
    g.gain.setTargetAtTime(v * 0.6, t + 0.05, 0.2); g.gain.setTargetAtTime(0.0001, t + dur, 0.07);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f;
    o.connect(g); o2.connect(g); g.connect(G.bass);
    o.start(t); o2.start(t); o.stop(t + dur + 0.5); o2.stop(t + dur + 0.5);
  }
  function kick(t, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g); g.connect(G.drum); o.start(t); o.stop(t + 0.4);
  }
  function snare(t, v) {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const bp = filter('bandpass', 1700, 0.8), g = ctx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    s.connect(bp); bp.connect(g); g.connect(G.drum); g.connect(verbSend);
    s.start(t, Math.random() * 0.5, 0.25);
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(v * 0.6, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g2); g2.connect(G.drum); o.start(t); o.stop(t + 0.12);
  }
  function hat(t, v, open) {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const hp = filter('highpass', 7000), g = ctx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.22 : 0.045));
    s.connect(hp); hp.connect(g); g.connect(G.drum);
    s.start(t, Math.random() * 0.5, 0.3);
  }
  function pluck(t, m, v, dur, dest) {
    const f = mtof(m), g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.35, dur));
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 3;
    const g2 = ctx.createGain(); g2.gain.value = 0.12;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(dest || G.mel);
    o.start(t); o2.start(t); o.stop(t + dur + 0.45); o2.stop(t + dur + 0.45);
  }
  // melody voices for the remixes: a short wooden marimba, a ringing bell, a soft flute
  function lead(t, m, v, dur, kind) {
    if (kind !== 'marimba' && kind !== 'bell' && kind !== 'flute') { pluck(t, m, v, dur); return; }
    const f = mtof(m), g = ctx.createGain(), o = ctx.createOscillator();
    g.gain.setValueAtTime(0.0001, t);
    let end;
    if (kind === 'flute') {
      o.type = 'triangle'; o.frequency.value = f;
      const vib = ctx.createOscillator(), vg = ctx.createGain();
      vib.frequency.value = 5; vg.gain.value = 7; vib.connect(vg); vg.connect(o.detune);
      g.gain.exponentialRampToValueAtTime(v * 0.75, t + 0.06);
      g.gain.setTargetAtTime(0.0001, t + Math.max(0.2, dur * 0.9), 0.08);
      end = t + dur + 0.5; vib.start(t); vib.stop(end);
    } else {
      o.type = 'sine'; o.frequency.value = f;
      const o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o2.type = 'sine'; o2.frequency.value = f * (kind === 'bell' ? 2.76 : 4);
      g2.gain.value = kind === 'bell' ? 0.2 : 0.08;
      o2.connect(g2); g2.connect(g);
      const decay = kind === 'bell' ? 1.3 : 0.24;
      g.gain.exponentialRampToValueAtTime(v * (kind === 'bell' ? 0.8 : 1.1), t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      end = t + decay + 0.05; o2.start(t); o2.stop(end);
    }
    o.connect(g); g.connect(G.mel); o.start(t); o.stop(end);
  }

  // ---- scheduler: a 16-bar arrangement that loops its last 12 bars ----
  function buildPhrases(s) {
    let seed = s.seed;
    const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const slots = [0, 3, 6, 8, 10, 12, 14, 16, 19, 22, 24, 26, 28, 30];
    const make = () => {
      const notes = [];
      let d = 2 + Math.floor(r() * 3);
      for (const st of slots) {
        if (r() < s.density) {
          d = clamp(d + [-2, -1, -1, 0, 1, 1, 2][Math.floor(r() * 7)], 0, s.scale.length - 1);
          notes.push({ st: st, m: s.scale[d], len: [2, 3, 4][Math.floor(r() * 3)], v: 0.7 + r() * 0.3 });
        }
      }
      return notes;
    };
    return [make(), make()];
  }
  function sectionOf(bar) { return bar < 16 ? bar : 4 + ((bar - 4) % 12); }
  function playStep(i, t, d16) {
    const s = vari, bar = Math.floor(i / 16), st = i % 16, sec = sectionOf(bar);
    const ci = bar % s.prog.length, chord = s.prog[ci], root = s.bass[ci];
    const intro = sec < 2, light = sec < 4, brk = sec === 15;
    if (s.arp) {
      if (st === 0) chord.forEach((m, k) => keyNote(t + k * 0.012, m, 0.03, d16 * 16));
      if (!intro && st % 2 === 0) {
        const order = chord.concat(chord.slice(1, -1).reverse());
        keyNote(t, order[(st / 2) % order.length] + 12, 0.036, d16 * 3);
      }
    } else for (const h of s.keys) {
      if (h[0] !== st || (intro && st !== 0)) continue;
      const notes = h[2] >= chord.length ? chord : chord.slice(chord.length - h[2]);
      notes.forEach((m, k) => keyNote(t + k * 0.012, m, 0.05 * h[1] * (intro ? 0.85 : 1), d16 * h[3]));
    }
    if (!intro && !brk) for (const b of s.bassPat) if (b[0] === st) bassNote(t, root + (b[2] || 0), 0.2 * b[1], d16 * b[3]);
    if (s.drums && !light) {
      if (s.kick.indexOf(st) >= 0 && !(brk && st > 6)) kick(t, 0.5);
      if (s.snare.indexOf(st) >= 0 && !brk) snare(t, 0.11);
      if (s.ghost.indexOf(st) >= 0 && !brk) snare(t, 0.035);
    }
    if (!intro) for (const hh of s.hats) if (hh[0] === st) hat(t, hh[1] * 0.07 * (light ? 0.6 : 1), hh[2]);
    if (sec >= 6 && sec <= 13 && phrases) {
      const ph = phrases[((sec - 6) >> 1) % 2], pi = (sec % 2) * 16 + st;
      for (const n of ph) if (n.st === pi) lead(t, n.m, 0.065 * n.v, d16 * n.len, s.lead);
    }
  }
  function tick() {
    if (!ctx || !song || ctx.state !== 'running') return;
    const d16 = 60 / song.bpm / 4, ahead = ctx.currentTime + 0.16;
    for (;;) {
      const t = songStart + step * d16 + (step % 2 ? vari.swing * d16 : 0);
      if (t > ahead) break;
      if (t > ctx.currentTime - 0.04) playStep(step, t, d16);
      step++;
    }
  }
  function play(id, restart) {
    if (!ctx) return;
    if (songId === id && song && !restart) return;
    songId = id; song = SONGS[id] || SONGS.menu;
    vari = remixOf(song, 0); phrases = buildPhrases(vari);
    newGen();
    keysLP.frequency.setTargetAtTime(vari.cutoff, ctx.currentTime, 0.05);
    songStart = ctx.currentTime + 0.08; step = 0;
    crackleGain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.3);
  }
  // Attempt n gets remix n, started straight into the full groove (bar 4) and lined
  // up so the beat falls where it would if the player had run from the start.
  function remix(n, phaseBeats, id) {
    const base = song && songId === id ? song : SONGS[id];
    const v = base ? remixOf(base, n) : null;
    if (!ctx || !song || songId !== id || !v) return v ? v.name : '';
    vari = v; phrases = buildPhrases(vari);
    newGen();
    keysLP.frequency.setTargetAtTime(vari.cutoff, ctx.currentTime, 0.05);
    const startBeat = 16 + frac(phaseBeats || 0);
    songStart = ctx.currentTime + 0.03 - startBeat * 60 / song.bpm;
    step = Math.floor(startBeat * 4);
    return vari.name;
  }
  function beatAt(perfMs) {
    if (!ctx || !song) return null;
    return (ctx.currentTime + (perfMs - performance.now()) / 1000 - songStart) * song.bpm / 60;
  }
  function muffle(on) { if (ctx) musicLP.frequency.setTargetAtTime(on ? 700 : 16000, ctx.currentTime, on ? 0.04 : 0.25); }
  // slow motion: the music goes soft and underwater for the second it lasts
  function slow(on) {
    if (!ctx) return;
    musicLP.frequency.setTargetAtTime(on ? 1400 : 16000, ctx.currentTime, on ? 0.05 : 0.2);
    blip('sine', on ? 700 : 330, on ? 330 : 700, 0.28, 0.1);
  }

  // ---- effects ----
  function blip(type, f0, f1, dur, v, delay) {
    if (!ctx) return;
    const t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function bell(m, v, delay) { if (ctx) pluck(ctx.currentTime + (delay || 0), m, v, 0.5, sfxBus); }
  function whoosh() {
    if (!ctx) return;
    const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noise;
    const bp = filter('bandpass', 500, 1.2), g = ctx.createGain();
    bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(2600, t + 0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    s.connect(bp); bp.connect(g); g.connect(sfxBus); s.start(t, 0, 0.4);
  }
  const sfx = {
    orb() { blip('sine', 520, 900, 0.14, 0.18); },
    pad() { blip('triangle', 260, 760, 0.18, 0.16); },
    portal: whoosh,
    star() { [84, 88, 91].forEach((m, i) => bell(m, 0.15, i * 0.07)); },
    right() { bell(76, 0.2, 0); bell(83, 0.2, 0.09); bell(88, 0.14, 0.18); },
    wrong() { blip('sine', 330, 170, 0.32, 0.2, 0.05); },
    die() { blip('sine', 240, 90, 0.22, 0.22); },
    win() { [72, 76, 79, 84, 88, 91].forEach((m, i) => bell(m, 0.15, i * 0.09)); },
    click() { blip('sine', 880, 880, 0.04, 0.05); },
    check() { blip('sine', 660, 990, 0.09, 0.07); }
  };
  return { init, play, remix, beatAt, muffle, slow, setVolumes, sfx, bpm: () => (song ? song.bpm : 80), ready: () => !!ctx };
})();
