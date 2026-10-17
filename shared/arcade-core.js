/* shared/arcade-core.js — What every newer arcade game starts with: small helpers, the shared save (settings and the math
   record, kept with Number Dash's in number-dash.v1) next to the game's own records, math bookkeeping, screens and toasts,
   the "All games" links, and read-aloud. Inline it first; math.js and sound.js may follow. */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const frac = (v) => ((v % 1) + 1) % 1;
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const fmtTime = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const stat = (k, v) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>';
const starRow = (n, of) => Array.from({ length: of || 3 }, (_, i) => '<span' + (i < n ? '' : ' class="off"') + '>⭐</span>').join('');

/* ================= saved progress (this device) =================
   Settings (math level, music, read-aloud) and the math record are shared by every game in
   number-dash.v1; each game keeps its own records under its own key via loadRecords(). */
const SAVE_KEY = 'number-dash.v1';
const save = {
  levels: {},
  math: { right: 0, wrong: 0, streak: 0, best: 0, tricky: [] },
  settings: { mathLevel: 'explorer', think: 'normal', music: 0.7, sfx: 0.8, sky: 'auto', calm: reduceMotion, speak: true },
  cube: { color: 0, face: 0 }
};
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) { const d = JSON.parse(raw); for (const k of Object.keys(save)) if (d && d[k] && typeof d[k] === 'object') Object.assign(save[k], d[k]); }
} catch (e) { /* storage blocked: play without saving */ }
const records = { key: '', data: null };
function loadRecords(key, defaults) {
  records.key = key; records.data = defaults;
  try { const raw = localStorage.getItem(key); if (raw) Object.assign(defaults, JSON.parse(raw)); } catch (e) { /* ignore */ }
  return defaults;
}
function writeSave() {
  try {
    const cur = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    cur.math = save.math; cur.settings = save.settings;
    if (!cur.cube) cur.cube = save.cube;
    if (!cur.levels) cur.levels = save.levels;
    localStorage.setItem(SAVE_KEY, JSON.stringify(cur));
    if (records.key) localStorage.setItem(records.key, JSON.stringify(records.data));
  } catch (e) { /* ignore */ }
}

/* ================= math bookkeeping =================
   q is a fact from KINDS (shared/math.js): t = its text, a = its answer. A missed fact is kept
   (the last 12) and comes back now and then in every game until it is answered right. */
function factFrom(kinds, avoid) {
  const tricky = (save.math.tricky || []).filter((t) => !avoid || !avoid.has(t.t));
  if (tricky.length && Math.random() < 0.25) return Object.assign({}, pick(tricky), { again: true });
  let q = KINDS[pick(kinds)]();
  for (let i = 0; i < 12 && avoid && avoid.has(q.t); i++) q = KINDS[pick(kinds)]();
  return q;
}
function mathRight(q) {
  const m = save.math;
  m.right++; m.streak++; m.best = Math.max(m.best, m.streak);
  if (q && q.again) m.tricky = m.tricky.filter((t) => t.t !== q.t);
  writeSave();
}
function mathWrong(q) {
  const m = save.math;
  m.wrong++; m.streak = 0;
  if (q && q.t) {
    const r = { t: q.t, a: q.a };
    if (q.f) r.f = q.f;
    if (q.trap !== undefined) r.trap = q.trap;
    m.tricky = (m.tricky || []).filter((t) => t.t !== r.t).concat([r]).slice(-12);
  }
  writeSave();
}

/* ================= screens, toasts, links ================= */
// show one menu card (<section class="screen" id="s-NAME">) over the game, or none
function showScreen(name, dim) {
  $$('#screens > .screen').forEach((s) => { s.hidden = s.id !== 's-' + name; });
  $('#screens').classList.toggle('dim', !!name && dim !== false);
}
let toastTimer = 0;
// kind: 'hello' (sits higher, for something new), 'good', 'oops', or nothing
function toast(msg, kind, ms) {
  const t = $('#toast');
  t.textContent = msg; t.className = 'toast' + (kind ? ' ' + kind : ''); t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms || (kind === 'hello' ? 2400 : 1500));
}
function announce(msg) { const a = $('#announce'); if (a) a.textContent = msg; }
// links marked data-hub lead back to the arcade's home page when the game runs inside the site
function arcadeLinks() { if (window.ARCADE_HOME) $$('[data-hub]').forEach((a) => { a.href = window.ARCADE_HOME; a.hidden = false; }); }
function toggleMusic() { save.settings.music = save.settings.music > 0 ? 0 : 0.7; writeSave(); Sound.init(); Sound.setVolumes(); return save.settings.music > 0; }
// the usual page guards: sound starts on the first touch, no pinch or double-tap zoom, onHide when the page goes away
function arcadeGuards(onHide) {
  document.addEventListener('pointerdown', () => Sound.init());
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (onHide) onHide(); } else Sound.init(); });
  window.addEventListener('blur', () => { if (onHide) onHide(); });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
}

/* ================= read-aloud =================
   English words are spoken with the device's own voice (iPad has good offline ones). Off when
   settings.speak is false. Speech.said keeps the last words asked for, for the playtests. */
const Speech = (function () {
  const ok = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';
  const said = [];
  let voice = null;
  function choose() {
    if (!ok) return;
    const en = speechSynthesis.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
    voice = en.find((v) => /Samantha|Karen|Moira|Daniel|Aria|Jenny|Google US English/i.test(v.name)) || en.find((v) => /^en[-_]US/i.test(v.lang)) || en[0] || null;
  }
  if (ok) { choose(); try { speechSynthesis.addEventListener('voiceschanged', choose); } catch (e) { speechSynthesis.onvoiceschanged = choose; } }
  function say(text, rate) {
    said.push(text); if (said.length > 40) said.shift();
    if (!ok || !save.settings.speak) return false;
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : 'en-US'; u.rate = rate || 0.9; u.pitch = 1.05;
      // some iOS versions drop a word spoken straight after cancel(), so only cut in when something is
      // still talking, and then give the voice a moment
      if (speechSynthesis.speaking || speechSynthesis.pending) { speechSynthesis.cancel(); setTimeout(() => speechSynthesis.speak(u), 60); }
      else speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }
  return { ok: ok, say: say, said: said, stop() { if (ok) { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } } } };
})();
