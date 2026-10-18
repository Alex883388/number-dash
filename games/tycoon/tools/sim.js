// Plays Tycoon Town many times with simple players to check the balance: how many months until each
// district opens, how often a careless player goes broke, what a trap-lover ends with.
// Usage: node games/tycoon/tools/sim.js [--fake] [--seeds 60] [--months 240] [--map bay|desert|neon|sakura|all] [--style smart|insured|random|trap]
//   --fake fills businesses that have no written content yet with made-up cases (for balancing early)
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'content');
require('../src/city.js');
require('../src/engine.js');
const TY = globalThis.TY;
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? +args[i + 1] : d; };
const SEEDS = arg('--seeds', 60), MONTHS = arg('--months', 240), FAKE = args.includes('--fake');
const sarg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const MAPS = sarg('--map', 'all') === 'all' ? ['bay', 'desert', 'neon', 'sakura'] : [sarg('--map')], STYLES = sarg('--style', 'all') === 'all' ? ['smart', 'insured', 'random', 'trap'] : [sarg('--style')];
const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { return null; } };
const roster = read('roster.json'), biz = [1, 2, 3, 4, 5].map((t) => read('biz-' + t + '.json')).filter(Boolean), offers = read('offers.json'), rivals = read('rivals.json');
if (FAKE) {
  const have = new Set(biz.flatMap((f) => f.businesses.map((b) => b.id)));
  const fake = (id, n) => ({ id: id + '-' + n, title: 'Case', story: 'A made-up case.', options: [
    { text: 'best', spend: 'low', rev: 2, costs: 0, risk: 0, rep: 1, timing: 'now', grade: 'best', skill: 'strategy', result: 'r', lesson: 'l' },
    { text: 'good', spend: 'none', rev: 1, costs: 0, risk: 0, rep: 1, timing: 'slow', grade: 'good', skill: 'marketing', result: 'r', lesson: 'l' },
    { text: 'ok', spend: 'none', rev: 1, costs: 0, risk: 0, rep: 0, timing: 'short', grade: 'ok', skill: 'pricing', result: 'r', lesson: 'l' },
    { text: 'trap', spend: 'none', rev: 1, costs: 0, risk: 0, rep: -2, timing: 'short', penalty: 'mid', grade: 'trap', skill: 'safety', result: 'r', lesson: 'l' }] });
  biz.push({ businesses: roster.businesses.filter((b) => !have.has(b.id)).map((b) => ({ id: b.id, cases: [1, 2, 3].map((n) => fake(b.id, n)) })) });
}
TY.load({ roster: roster, biz: biz, offers: offers, rivals: rivals });

const expected = (r) => TY.midOf(r) / r.price;                     // monthly return on the money
function decideAll(s, style) {
  for (const item of s.inbox.slice()) {
    const c = TY.caseOf(s, item); if (!c) continue;
    const n = TY.picksAllowed(s, item), opts = c.options.map((o, k) => ({ o, k }));
    let picks;
    if (style === 'smart' || style === 'insured') {
      const order = ['best', 'good', 'ok', 'poor', 'trap'];
      picks = opts.slice().sort((a, b) => order.indexOf(a.o.grade) - order.indexOf(b.o.grade)).slice(0, n).filter((x) => x.o.grade !== 'trap' && x.o.grade !== 'poor').map((x) => x.k);
      while (picks.length && picks.reduce((t, k) => t + TY.optionCost(s, item, c.options[k]), 0) > s.cash) picks.pop();
      if (!picks.length) { const free = opts.find((x) => !TY.optionCost(s, item, x.o) && x.o.grade !== 'trap'); picks = free ? [free.k] : []; }
    } else if (style === 'trap') {
      const t = opts.find((x) => x.o.grade === 'trap') || opts.find((x) => x.o.grade === 'poor') || opts[0]; picks = [t.k];
    } else {
      picks = [Math.floor(TY.rand(s) * opts.length)];
    }
    if (picks.length) TY.decide(s, item.key, picks);
  }
}
// where to open: a careful player picks the lot whose surroundings suit the business best, the others any free lot
const lotsFor = (s, r) => { const d = TY.districtOfTier(r.tier).id; return TY.freeLots(s, d).filter((i) => !r.needs || (TY.featOf(s, d, i)[r.needs] || 0) >= 1); };
const careful = (style) => style === 'smart' || style === 'insured';
function lotFor(s, r, style) {
  const d = TY.districtOfTier(r.tier).id, free = lotsFor(s, r);
  if (!free.length) return -1;
  if (careful(style)) return free.slice().sort((a, b) => TY.locOf(s, r.id, d, b).mult - TY.locOf(s, r.id, d, a).mult)[0];
  return free[Math.floor(TY.rand(s) * free.length)];
}
function invest(s, style) {
  // consolidate: sell small businesses two districts below, to buy bigger ones
  if (careful(style)) s.biz.filter((b) => TY.biz(b.id).tier <= s.tier - 2).forEach((b) => TY.sell(s, b.uid));
  // the insured player buys a policy for every business it can
  if (style === 'insured') s.biz.forEach((b) => { if (!TY.canInsure(s, b)) TY.insure(s, b.uid, true); });
  for (let tries = 0; tries < 6; tries++) {
    const owned = new Set(s.biz.map((b) => TY.biz(b.id).industry));
    const cands = TY.available(s).filter((r) => r.tier <= s.tier && lotsFor(s, r).length)
      .filter((r) => !careful(style) || r.risk < 4 || TY.netWorth(s) > r.price * 4);
    if (!cands.length) return;
    let r;
    const budget = s.cash + (careful(style) ? Math.min(TY.loanLimit(s), 0.6 * TY.netWorth(s)) : 0);
    if (careful(style)) {
      const ok = cands.filter((x) => x.price <= budget);
      if (!ok.length) return;
      ok.sort((a, b) => (expected(b) * (owned.has(b.industry) ? 1 : 1.2) * b.price ** 0.35) - (expected(a) * (owned.has(a.industry) ? 1 : 1.2) * a.price ** 0.35));
      r = ok[0];
      if (r.price > s.cash) TY.borrow(s, Math.min(TY.loanLimit(s), Math.ceil(r.price - s.cash + 1)));
    } else {
      if (TY.rand(s) > 0.3) return;
      const ok = cands.filter((x) => x.price <= s.cash); if (!ok.length) return;
      r = ok[Math.floor(TY.rand(s) * ok.length)];
    }
    const d = TY.districtOfTier(r.tier).id, i = lotFor(s, r, style);
    const res = TY.open(s, r.id, d, i, false);
    if (!res.ok) return;
    decideAll(s, style);
  }
}
function play(seed, style, map) {
  const s = TY.newGame('Sim', seed, map), mark = {};
  let minCash = s.cash, forced = 0, premiums = 0, bills = 0, claims = 0;
  const inc = {};
  const free = {}, land = {};
  for (let m = 0; m < MONTHS; m++) {
    decideAll(s, style); invest(s, style);
    if (careful(style) && s.loan && s.cash > 0.3 * s.loan + 2000) TY.repay(s, s.cash - 1000);
    const rep = TY.next(s);
    if (rep.forced) forced++;
    premiums += rep.premiums; rep.extra.forEach((x) => { if (x.paid) bills -= x.amount; }); rep.inc.forEach((x) => { inc[x.id] = (inc[x.id] || 0) + 1; });
    minCash = Math.min(minCash, s.cash);
    [2, 3, 4, 5].forEach((t) => { if (s.tier >= t && mark[t] === undefined) mark[t] = s.month; });
    if ([12, 36, 72].includes(s.month)) { free[s.month] = TY.DISTRICTS.map((d) => TY.forSale(s, d.id).length).join('/'); land[s.month] = TY.DISTRICTS.map((d) => Math.round(TY.landValue(s, d.id, 0) / d.land * 100) / 100).join('/'); }
    if (TY.netWorth(s) >= 1e8 && mark.top === undefined) mark.top = s.month;
    if (TY.netWorth(s) >= 1e9 && mark.bil === undefined) mark.bil = s.month;
    for (const k in s) if (typeof s[k] === 'number' && !isFinite(s[k])) throw new Error('not finite: ' + k);
  }
  return { mark, nw: TY.netWorth(s), stars: s.stats.stars, cases: s.stats.cases, traps: s.stats.traps, fell: s.stats.fell, forced, minCash, goals: Object.keys(s.goals).length, biz: s.biz.length, loan: s.loan, s,
    beaten: s.stats.rivalsBeaten, rivalsNow: s.rivals.length, rivalsSeen: s.nextRival - 1, loc: s.biz.length ? s.biz.reduce((t, b) => t + b.loc, 0) / s.biz.length : 1, free: free, land: land, premiums, bills, claims: s.stats.claims, inc, mega: s.biz.filter((b) => TY.biz(b.id).tier === 5).length };
}
const pct = (arr, p) => { const a = arr.filter((x) => x !== undefined).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : '-'; };
const money = (n) => (Math.abs(n) >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M' : '$' + Math.round(n).toLocaleString('en-GB'));
for (const map of MAPS) for (const style of STYLES) {
  const runs = Array.from({ length: SEEDS }, (_, k) => play(1000 + k, style, map));
  const reached = (t) => runs.filter((r) => r.mark[t] !== undefined).length;
  console.log('== ' + map + ' / ' + style + ' (' + SEEDS + ' games, ' + MONTHS + ' months)');
  [2, 3, 4, 5].forEach((t) => console.log('  district ' + t + ': reached in ' + reached(t) + ' games; month p10/p50/p90 = ' + pct(runs.map((r) => r.mark[t]), 0.1) + ' / ' + pct(runs.map((r) => r.mark[t]), 0.5) + ' / ' + pct(runs.map((r) => r.mark[t]), 0.9)));
  console.log('  $100M: ' + reached('top') + ' games, month p50 ' + pct(runs.map((r) => r.mark.top), 0.5) + '; $1B: ' + reached('bil') + ' games, month p50 ' + pct(runs.map((r) => r.mark.bil), 0.5) + '; mega businesses p50 ' + pct(runs.map((r) => r.mega), 0.5));
  console.log('  net worth p10/p50/p90: ' + [0.1, 0.5, 0.9].map((p) => money(pct(runs.map((r) => r.nw), p))).join(' / ') + '; broke (net worth < $100): ' + runs.filter((r) => r.nw < 100).length);
  const incs = {}; runs.forEach((r) => { for (const k in r.inc) incs[k] = (incs[k] || 0) + r.inc[k]; });
  console.log('  incidents per game: ' + Object.keys(incs).map((k) => k + ' ' + (incs[k] / SEEDS).toFixed(1)).join(', ') + '; repairs paid p50 ' + money(pct(runs.map((r) => r.bills), 0.5)) + ', premiums p50 ' + money(pct(runs.map((r) => r.premiums), 0.5)) + ', insurers paid p50 ' + money(pct(runs.map((r) => r.claims), 0.5)));
  console.log('  rivals met p50 ' + pct(runs.map((r) => r.rivalsSeen), 0.5) + ', beaten p50 ' + pct(runs.map((r) => r.beaten), 0.5) + '; average spot x' + (runs.reduce((t, r) => t + r.loc, 0) / runs.length).toFixed(2) +
    '; lots for sale by district at month 12: ' + runs[0].free[12] + ', 36: ' + runs[0].free[36] + ', 72: ' + runs[0].free[72] + '; land value x (vs start) at 72: ' + runs[0].land[72]);
  console.log('  forced sales: ' + runs.reduce((t, r) => t + r.forced, 0) + '; stars p50 ' + pct(runs.map((r) => r.stars), 0.5) + '; cases p50 ' + pct(runs.map((r) => r.cases), 0.5) + '; goals p50 ' + pct(runs.map((r) => r.goals), 0.5) + '; businesses p50 ' + pct(runs.map((r) => r.biz), 0.5));
}
// a saved game resumes exactly: play 30 months, save, play 30 more; restore the save, play 30 more: same result
for (const map of MAPS) {
  const a = TY.newGame('Save test', 77, map); for (let m = 0; m < 30; m++) { decideAll(a, 'insured'); invest(a, 'insured'); TY.next(a); }
  TY.advance(a, 6.5);   // stop in the middle of a day
  const saved = TY.serialize(a);
  for (let m = 0; m < 30; m++) { decideAll(a, 'insured'); invest(a, 'insured'); TY.next(a); }
  const b = TY.restore(saved); for (let m = 0; m < 30; m++) { decideAll(b, 'insured'); invest(b, 'insured'); TY.next(b); }
  console.log(map + ': save and resume gives the same game: ' + (TY.serialize(a) === TY.serialize(b)) + ' (save size ' + saved.length + ' bytes)');
}
