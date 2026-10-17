/* shared/math.js — Math questions with close wrong answers; missed facts come back. Needs save, rnd, pick, shuffle.
   Inlined at build time into every game that uses it (see build.js). */
/* ================= math questions ================= */
const MINUS = '−', TIMES = '×', DIV = '÷';
const FRAC = { 2: '½', 3: '⅓', 4: '¼', 5: '⅕', 10: '⅒' };
const MATH = {
  starter: { name: 'Starter', kinds: ['add20', 'add20', 'sub20', 'sub20', 'make10', 'double', 'table2510', 'table2510'] },
  explorer: { name: 'Explorer', kinds: ['add100', 'sub100', 'table10', 'table10', 'table10', 'div10', 'div10', 'missing'] },
  genius: { name: 'Genius', kinds: ['table12', 'table12', 'div12', 'order', 'order', 'fraction', 'percent', 'big', 'missingMul'] }
};
const KINDS = {
  add20() { const a = rnd(3, 12), b = rnd(2, 20 - a); return { t: a + ' + ' + b, a: a + b }; },
  sub20() { const a = rnd(9, 20), b = rnd(2, a - 2); return { t: a + ' ' + MINUS + ' ' + b, a: a - b }; },
  make10() { const b = rnd(1, 9); return { t: (10 - b) + ' + ? = 10', a: b }; },
  double() { const a = rnd(3, 10); return { t: a + ' + ' + a, a: a * 2 }; },
  table2510() { const m = pick([2, 5, 10]), b = rnd(1, 10); return { t: b + ' ' + TIMES + ' ' + m, a: b * m, f: [b, m] }; },
  add100() { const a = rnd(14, 68), b = rnd(7, 99 - a); return { t: a + ' + ' + b, a: a + b }; },
  sub100() { const a = rnd(31, 99), b = rnd(8, a - 11); return { t: a + ' ' + MINUS + ' ' + b, a: a - b }; },
  table10() { const a = rnd(2, 10), b = rnd(2, 10); return { t: a + ' ' + TIMES + ' ' + b, a: a * b, f: [a, b] }; },
  div10() { const b = rnd(2, 10), c = rnd(2, 10); return { t: (b * c) + ' ' + DIV + ' ' + b, a: c }; },
  missing() { const a = rnd(6, 40), c = a + rnd(5, 30); return { t: a + ' + ? = ' + c, a: c - a }; },
  table12() { const a = rnd(3, 12), b = rnd(3, 12); return { t: a + ' ' + TIMES + ' ' + b, a: a * b, f: [a, b] }; },
  div12() { const b = rnd(3, 12), c = rnd(3, 12); return { t: (b * c) + ' ' + DIV + ' ' + b, a: c }; },
  order() {
    const a = rnd(2, 9), b = rnd(2, 9), c = rnd(2, 9);
    return Math.random() < 0.5
      ? { t: c + ' + ' + a + ' ' + TIMES + ' ' + b, a: c + a * b, trap: (c + a) * b }
      : { t: a + ' ' + TIMES + ' (' + b + ' + ' + c + ')', a: a * (b + c), trap: a * b + c };
  },
  fraction() { const d = pick([2, 3, 4, 5, 10]), n = rnd(2, 12) * d; return { t: FRAC[d] + ' of ' + n, a: n / d }; },
  percent() {
    const p = pick([10, 25, 50]);
    const base = p === 25 ? rnd(2, 12) * 4 : p === 50 ? rnd(3, 20) * 2 : rnd(2, 15) * 10;
    return { t: p + '% of ' + base, a: base * p / 100 };
  },
  big() { const a = rnd(11, 45) * 5, b = rnd(5, 30) * 5; return Math.random() < 0.5 ? { t: a + ' + ' + b, a: a + b } : { t: (a + b) + ' ' + MINUS + ' ' + b, a: a }; },
  missingMul() { const a = rnd(3, 12), b = rnd(3, 12); return { t: '? ' + TIMES + ' ' + a + ' = ' + (a * b), a: b, f: [b, a] }; }
};
function wrongAnswers(q, n) {
  const ans = q.a, used = new Set([ans]), out = [];
  const cands = [ans + 1, ans - 1, ans + 2, ans - 2];
  if (q.trap !== undefined) cands.push(q.trap, q.trap);
  if (q.f) { const a = q.f[0], b = q.f[1]; cands.push(a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b); }
  if (ans >= 10) {
    cands.push(ans + 10, ans - 10);
    const s = String(ans);
    if (s.length === 2 && s[0] !== s[1] && s[1] !== '0') cands.push(+(s[1] + s[0]));
  }
  for (const v of shuffle(cands)) {
    if (out.length >= n) break;
    if (v >= (ans > 0 ? 1 : 0) && Number.isInteger(v) && !used.has(v)) { used.add(v); out.push(v); }
  }
  while (out.length < n) { const v = ans + rnd(3, 7) * (Math.random() < 0.5 ? -1 : 1); if (v >= (ans > 0 ? 1 : 0) && !used.has(v)) { used.add(v); out.push(v); } }
  return out;
}
let lastAsked = '';
function makeQuestion(lanes) {
  const lv = MATH[save.settings.mathLevel] || MATH.explorer;
  let q = null;
  const tricky = (save.math.tricky || []).filter((t) => t.t !== lastAsked);
  if (tricky.length && Math.random() < 0.3) q = Object.assign({}, pick(tricky), { again: true });
  for (let i = 0; !q || (q.t === lastAsked && i < 6); i++) q = KINDS[pick(lv.kinds)]();
  lastAsked = q.t;
  const choices = shuffle([q.a].concat(wrongAnswers(q, lanes - 1)));
  return { text: q.t.indexOf('?') >= 0 ? q.t : q.t + ' = ?', answer: q.a, choices: choices, correct: choices.indexOf(q.a) + 1, raw: q, done: false };
}
function solvedText(q) { return q.raw.t.indexOf('?') >= 0 ? q.raw.t.replace('?', '<b>' + q.answer + '</b>') : q.raw.t + ' = <b>' + q.answer + '</b>'; }
