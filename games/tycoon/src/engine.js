/* engine.js — Tycoon Town's rules: months, money, businesses, land, cases, offers, city events, the bank,
   tax and goals. Pure (no page code): the page and the tests drive it through TY.*. A game is one plain
   object (TY.newGame), saved as JSON; all chance comes from its own seeded generator, so a saved game
   resumes exactly. Content (roster, business cases, offers) comes from content/*.json via TY.load(). */
(function (root) {
  'use strict';
  const TY = root.TY = root.TY || {};
  let R = null, BIZ = {}, CONTENT = {}, OFFERS = [], DISTRICTS = [];

  /* ---------- content ---------- */
  TY.load = function (data) {
    R = data.roster; DISTRICTS = R.districts; BIZ = {}; CONTENT = {};
    R.businesses.forEach((b) => { BIZ[b.id] = b; });
    (data.biz || []).forEach((file) => (file.businesses || []).forEach((b) => { if (BIZ[b.id]) CONTENT[b.id] = b; }));
    OFFERS = (data.offers && data.offers.offers) || [];
    TY.R = R; TY.BIZ = BIZ; TY.CONTENT = CONTENT; TY.OFFERS = OFFERS; TY.DISTRICTS = DISTRICTS;
  };
  TY.biz = (id) => BIZ[id];
  TY.content = (id) => CONTENT[id] || null;
  TY.available = () => R.businesses.filter((b) => CONTENT[b.id]);   // a business opens once its words and cases exist

  /* ---------- numbers ---------- */
  const PLOTS = 16, COLS = 4;                       // each district is 4 x 4 plots
  const SPEND = { none: 0, low: 0.05, mid: 0.15, high: 0.3 };
  const PENALTY = { low: 0.1, mid: 0.3, high: 0.6 };
  const SPREAD = [0, 0.5, 1, 1.6, 2.2];              // ups and downs by risk band 1-4, relative to the roster's band
  const SHOCK = [0, 0, 0, 0.02, 0.04];               // chance of a bad month by risk band
  const TAX = 0.1, RENT = 0.01, LOAN_RATE = 0.015, OVERDRAFT = 0.04, SELL_FEE = 0.1, LAND_FEE = 0.05;
  const START_CASH = 500, START_MONTH = 2;           // the first month is March
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const SEASON = {
    summer: [0.75, 0.8, 0.9, 1, 1.1, 1.3, 1.4, 1.35, 1.05, 0.9, 0.8, 0.8],
    school: [1.05, 1.05, 1.05, 1, 1.1, 0.95, 0.6, 0.7, 1.3, 1.1, 1.05, 0.85],
    holiday: [0.8, 0.9, 0.95, 0.95, 1, 1, 1, 1, 0.95, 1, 1.2, 1.5],
    newyear: [1.4, 1.15, 1.05, 1, 1, 0.95, 0.85, 0.85, 1.05, 1, 0.9, 0.8]
  };
  for (const k in SEASON) { const a = SEASON[k], m = a.reduce((x, y) => x + y, 0) / 12; SEASON[k] = a.map((x) => x / m); }
  TY.MONTHS = MONTHS; TY.PLOTS = PLOTS; TY.COLS = COLS; TY.SPEND = SPEND; TY.PENALTY = PENALTY; TY.TAX = TAX; TY.RENT = RENT;

  /* ---------- chance (mulberry32 on the game's own state) ---------- */
  function rand(s) {
    let t = (s.rng = (s.rng + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const between = (s, a, b) => a + (b - a) * rand(s);
  const pickR = (s, arr) => arr[Math.floor(rand(s) * arr.length)];
  const tri = (s) => rand(s) + rand(s) - 1;            // -1..1, more often near 0
  TY.rand = rand;

  /* ---------- a new game ---------- */
  TY.newGame = function (name, seed) {
    const s = {
      v: 1, name: name || 'Super Co.', seed: seed >>> 0, rng: seed >>> 0, month: 0, cash: START_CASH, loan: 0, rateUp: 0,
      plots: {}, boom: {}, biz: [], nextUid: 1, caseNext: {}, inbox: [], events: [], boosts: [], pending: [], goals: {}, seenOffers: [],
      stats: { bought: 0, sold: 0, soldUp: 0, cases: 0, offers: 0, stars: 0, profit: 0, traps: 0, fell: 0, best: 0, loanPaid: 0, landBought: 0, peak: START_CASH, skills: {} },
      handbook: {}, report: null, history: [], tier: 1, created: Date.now()
    };
    DISTRICTS.forEach((d) => { s.plots[d.id] = Array.from({ length: PLOTS }, () => ({ me: false, land: false, uid: 0, npc: '' })); s.boom[d.id] = 1; });
    // a few neighbours already live on Market Street
    for (let k = 0; k < 3; k++) npcMoveIn(s, 'market');
    learn(s, 'cash');
    return s;
  };
  const NPC = ['🏠', '🏡', '🌳', '☕', '🏬', '🏫', '⛲', '🏥', '🏦', '🌲', '🏪', '🎡'];
  function npcMoveIn(s, d) {
    const free = s.plots[d].map((p, i) => (!p.me && !p.npc && !p.uid ? i : -1)).filter((i) => i >= 0);
    if (free.length <= 6 || s.plots[d].filter((p) => p.npc).length >= 4) return false;   // always room for all ten businesses
    s.plots[d][pickR(s, free)].npc = pickR(s, NPC);
    return true;
  }

  /* ---------- calendar, districts ---------- */
  TY.calMonth = (s) => (START_MONTH + s.month) % 12;
  TY.year = (s) => 1 + Math.floor((START_MONTH + s.month) / 12) - Math.floor(START_MONTH / 12);
  TY.dateText = (s) => MONTHS[TY.calMonth(s)] + ', year ' + TY.year(s);
  TY.district = (id) => DISTRICTS.find((d) => d.id === id);
  TY.districtOfTier = (t) => DISTRICTS.find((d) => d.tier === t);
  TY.unlocked = (s, d) => (typeof d === 'string' ? TY.district(d) : d).tier <= s.tier;

  /* ---------- values ---------- */
  const growth = (s, d) => Math.pow(1.004, s.month) * s.boom[d];
  function neighbours(s, d, i) {
    const r = Math.floor(i / COLS), c = i % COLS, ps = s.plots[d];
    let n = 0;
    [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([rr, cc]) => {
      if (rr >= 0 && cc >= 0 && cc < COLS && rr * COLS + cc < PLOTS) { const p = ps[rr * COLS + cc]; if (p.uid || p.npc) n++; }
    });
    return n;
  }
  TY.landValue = (s, d, i) => Math.round(TY.district(d).land * growth(s, d) * (1 + 0.06 * neighbours(s, d, i)));
  TY.rentOf = (s, d, i) => Math.max(1, Math.round(TY.landValue(s, d, i) * RENT));
  const midOf = (r) => (r.profit[0] + r.profit[1]) / 2, spreadOf = (r) => (r.profit[1] - r.profit[0]) / 2;
  TY.midOf = midOf;
  // a business's value: what it cost, better when it earns more and customers trust it; a property also
  // rises with its district (its land comes with it)
  TY.bizValue = function (s, b) {
    const r = BIZ[b.id], [d] = b.plot.split(':'), mid = Math.max(1, midOf(r));
    const avg = b.hist.length ? b.hist.reduce((t, x) => t + x, 0) / b.hist.length : mid, w = Math.min(1, b.hist.length / 6);
    const earn = Math.pow(Math.max(0.3, Math.min(3, avg / mid)), 0.8);
    let v = r.price * ((1 - w) + w * earn) * (1 + 0.05 * b.rep);
    if (r.kind === 'property') v *= growth(s, d) / b.g0;
    return Math.max(0, Math.round(v));
  };
  TY.landOwned = function (s) {   // land the company owns that a property does not already include
    let v = 0;
    DISTRICTS.forEach((d) => s.plots[d.id].forEach((p, i) => {
      if (p.land) { const b = p.uid && s.biz.find((x) => x.uid === p.uid); if (!b || BIZ[b.id].kind !== 'property') v += TY.landValue(s, d.id, i); }
    }));
    return v;
  };
  TY.assets = (s) => Math.max(0, s.cash) + s.biz.reduce((t, b) => t + TY.bizValue(s, b), 0) + TY.landOwned(s);
  TY.netWorth = (s) => Math.round(TY.assets(s) - s.loan + Math.min(0, s.cash));
  TY.loanLimit = (s) => Math.max(0, Math.round(Math.max(300, 0.5 * Math.max(0, TY.netWorth(s))) - s.loan));   // half of what the company is worth
  TY.loanRate = (s) => LOAN_RATE + s.rateUp;
  TY.quality = (b) => Math.max(1, Math.min(5, Math.round(3 + Math.log(Math.max(0.2, b.mult)) / Math.log(1.15) + b.rep * 0.25)));
  TY.population = (s) => 1000 + s.month * 12 + DISTRICTS.reduce((t, d) => t + s.plots[d.id].filter((p) => p.npc).length * 180, 0) +
    s.biz.reduce((t, b) => t + 250 * BIZ[b.id].tier * BIZ[b.id].tier, 0);

  /* ---------- the CEO handbook: words learned on the way ---------- */
  const learn = (s, key) => { if (!s.handbook[key]) s.handbook[key] = s.month + 1; };
  TY.learn = learn;

  /* ---------- opening, selling, land ---------- */
  TY.canOpen = function (s, id, d, i, buyLand) {
    const r = BIZ[id], p = s.plots[d] && s.plots[d][i];
    if (!r || !CONTENT[id]) return 'Coming soon';
    const dist = TY.district(d);
    if (!dist || r.tier !== dist.tier) return 'This business opens in ' + TY.districtOfTier(r.tier).name;
    if (!TY.unlocked(s, d)) return 'Unlocks at a net worth of $' + dist.unlock.toLocaleString('en-GB');
    if (!p || p.uid || p.npc) return 'That plot is taken';
    if (s.biz.some((b) => b.id === id)) return 'You already run one: try something new!';
    const cost = TY.openCost(s, id, d, i, buyLand);
    if (s.cash < cost) return 'You need $' + cost.toLocaleString('en-GB') + ' in cash';
    return '';
  };
  TY.openCost = function (s, id, d, i, buyLand) {
    const r = BIZ[id], p = s.plots[d][i];
    if (r.kind === 'property') return Math.round(p.land ? Math.max(r.price * 0.5, r.price - TY.landValue(s, d, i)) : r.price);   // its land is in the price
    return r.price + (buyLand && !p.land ? TY.landValue(s, d, i) : 0);
  };
  TY.open = function (s, id, d, i, buyLand) {
    const why = TY.canOpen(s, id, d, i, buyLand);
    if (why) return { ok: false, why: why };
    const r = BIZ[id], p = s.plots[d][i], cost = TY.openCost(s, id, d, i, buyLand);
    s.cash -= cost;
    if (r.kind === 'property' || buyLand) { if (!p.land) s.stats.landBought++; p.land = true; }
    const b = { uid: s.nextUid++, id: id, plot: d + ':' + i, bought: s.month, paid: cost, mult: 1, rep: 0, band: r.risk, flags: [], temps: [], slow: [],
      next: 0, lastCase: s.month, hist: [], g0: growth(s, d) };
    s.biz.push(b); p.me = true; p.uid = b.uid; s.stats.bought++;
    learn(s, 'invest'); learn(s, 'risk'); if (!p.land) learn(s, 'rent'); else learn(s, 'land');
    if (r.kind === 'property') learn(s, 'property');
    addCase(s, b);                                    // the opening case
    checkGoals(s);
    return { ok: true, biz: b };
  };
  TY.sellPrice = (s, b) => Math.round(TY.bizValue(s, b) * (1 - SELL_FEE));
  TY.sell = function (s, uid) {
    const b = s.biz.find((x) => x.uid === uid); if (!b) return { ok: false };
    const price = TY.sellPrice(s, b), [d, i] = b.plot.split(':'), p = s.plots[d][+i];
    s.cash += price; s.stats.sold++; if (price > b.paid) s.stats.soldUp++;
    if (BIZ[b.id].kind === 'property') p.land = false;  // the land goes with the building
    p.me = p.land; p.uid = 0;
    s.biz = s.biz.filter((x) => x !== b);
    s.inbox = s.inbox.filter((x) => x.uid !== uid);
    learn(s, 'value');
    checkGoals(s);
    return { ok: true, price: price };
  };
  TY.buyLand = function (s, d, i) {
    const p = s.plots[d][i];
    if (!TY.unlocked(s, d) || p.land || p.npc) return { ok: false, why: 'Not for sale' };
    const v = TY.landValue(s, d, i);
    if (s.cash < v) return { ok: false, why: 'You need $' + v.toLocaleString('en-GB') + ' in cash' };
    s.cash -= v; p.land = true; p.me = true; s.stats.landBought++; learn(s, 'land');
    checkGoals(s);
    return { ok: true, price: v };
  };
  TY.sellLand = function (s, d, i) {
    const p = s.plots[d][i];
    if (!p.land || p.uid) return { ok: false, why: p.uid ? 'A business stands on it' : 'Not yours' };
    const v = Math.round(TY.landValue(s, d, i) * (1 - LAND_FEE));
    s.cash += v; p.land = false; p.me = false;
    return { ok: true, price: v };
  };

  /* ---------- the bank ---------- */
  TY.borrow = function (s, amount) {
    amount = Math.floor(amount);
    if (!(amount > 0) || amount > TY.loanLimit(s)) return { ok: false, why: 'The bank lends up to $' + TY.loanLimit(s).toLocaleString('en-GB') };
    s.cash += amount; s.loan += amount; s.stats.borrowed = true; learn(s, 'loan'); learn(s, 'interest');
    return { ok: true };
  };
  TY.repay = function (s, amount) {
    amount = Math.min(Math.floor(amount), s.loan, Math.floor(s.cash));
    if (!(amount > 0)) return { ok: false, why: 'Nothing to repay' };
    s.cash -= amount; s.loan -= amount;
    if (s.loan === 0 && s.stats.borrowed) s.stats.loanPaid++;
    checkGoals(s);
    return { ok: true, amount: amount };
  };

  /* ---------- cases and offers ---------- */
  function addCase(s, b) {
    const c = CONTENT[b.id], n = s.caseNext[b.id] || 0;   // each business's three cases come once, in order
    if (!c || n >= c.cases.length) return false;
    if (s.inbox.some((x) => x.uid === b.uid)) return false;
    s.inbox.push({ key: 'c' + b.uid + '-' + n, kind: 'case', uid: b.uid, idx: n, arrived: s.month, due: s.month + 3 });
    s.caseNext[b.id] = n + 1; b.lastCase = s.month;
    return true;
  }
  TY.caseOf = function (s, item) {
    if (item.kind === 'offer') return OFFERS.find((o) => o.id === item.id) || null;
    const b = s.biz.find((x) => x.uid === item.uid), c = b && CONTENT[b.id];
    return c ? c.cases[item.idx] : null;
  };
  TY.picksAllowed = function (s, item) {
    if (item.kind === 'offer') return 1;
    const b = s.biz.find((x) => x.uid === item.uid);
    return b && BIZ[b.id].tier >= 2 ? 2 : 1;
  };
  TY.optionCost = function (s, item, o) {
    if (item.kind === 'offer') return 0;
    const b = s.biz.find((x) => x.uid === item.uid);
    return Math.round(BIZ[b.id].price * (SPEND[o.spend] || 0));
  };
  const POINTS = { best: 3, good: 2, ok: 1, poor: 0, trap: 0 };
  function starsFor(grades) {
    if (grades.includes('trap')) return 0;
    if (grades.length > 1) { if (grades.includes('best')) return 3; if (grades.every((g) => g === 'good')) return 3; }
    return Math.max(0, ...grades.map((g) => POINTS[g]));
  }
  TY.starsFor = starsFor;
  function score(s, item, picks, opts) {
    const grades = picks.map((k) => opts[k].grade), st = starsFor(grades);
    s.stats.stars += st; if (st === 3) s.stats.best++;
    picks.forEach((k) => { const o = opts[k]; s.stats.skills[o.skill] = (s.stats.skills[o.skill] || 0) + (o.grade === 'trap' ? -1 : POINTS[o.grade]); });
    const hadTrap = opts.some((o) => o.grade === 'trap'), fell = grades.includes('trap');
    if (fell) { s.stats.fell++; learn(s, 'scam'); } else if (hadTrap) s.stats.traps++;
    return st;
  }
  // apply a business option to its business: money now, lasting changes, a later penalty
  function applyOption(s, b, o) {
    const r = BIZ[b.id], rev = o.rev || 0, costs = o.costs || 0;
    s.cash -= Math.round(r.price * (SPEND[o.spend] || 0));
    const m = 0.07 * rev - 0.05 * costs;
    if (o.timing === 'short') { if (rev || costs) b.temps.push({ m: 1 + 0.2 * rev - 0.12 * costs, left: 3, why: 'short' }); }
    else if (o.timing === 'slow') { if (m) b.slow.push({ m: m, left: 3 }); }
    else b.mult *= Math.max(0.3, 1 + m);
    b.band = Math.max(1, Math.min(4, b.band + (o.risk || 0)));
    b.rep = Math.max(-5, Math.min(5, b.rep + (o.rep || 0)));
    if (o.flag && !b.flags.includes(o.flag)) { b.flags.push(o.flag); learn(s, o.flag === 'insured' ? 'insurance' : o.flag === 'loyal' ? 'loyalty' : 'brand'); }
    if (o.penalty) s.pending.push({ amount: Math.round(r.price * PENALTY[o.penalty]), uid: b.uid, text: r.name + ': ' + o.result });
    if (o.rep) learn(s, 'reputation');
  }
  // the child decides a case or an offer: picks = option numbers (1 or 2 of them)
  TY.decide = function (s, key, picks) {
    const item = s.inbox.find((x) => x.key === key); if (!item) return { ok: false, why: 'Gone' };
    const c = TY.caseOf(s, item); if (!c) return { ok: false, why: 'Missing' };
    picks = [...new Set(picks)].filter((k) => k >= 0 && k < c.options.length);
    if (!picks.length || picks.length > TY.picksAllowed(s, item)) return { ok: false, why: 'Pick ' + TY.picksAllowed(s, item) };
    const cost = picks.reduce((t, k) => t + TY.optionCost(s, item, c.options[k]), 0);
    if (cost > s.cash) return { ok: false, why: 'Not enough cash for that plan ($' + cost.toLocaleString('en-GB') + ')' };
    let money = 0;
    if (item.kind === 'case') {
      const b = s.biz.find((x) => x.uid === item.uid);
      picks.forEach((k) => applyOption(s, b, c.options[k]));
      s.stats.cases++;
    } else {
      const o = c.options[picks[0]], nw = Math.max(500, TY.netWorth(s));
      const share = { 'gain-low': 0.02, 'gain-mid': 0.05, 'gain-high': 0.12, 'lose-low': -0.02, 'lose-mid': -0.06, 'lose-high': -0.15 }[o.money] || 0;
      money = Math.round(nw * share); if (money < 0) money = Math.min(money, -20);
      s.cash += money;
      if (o.boost) s.boosts.push({ industry: o.boost.industry, m: 1 + 0.07 * o.boost.rev, left: o.boost.months });
      s.stats.offers++;
    }
    const stars = score(s, item, picks, c.options);
    s.inbox = s.inbox.filter((x) => x !== item);
    checkGoals(s);
    return { ok: true, stars: stars, picks: picks, money: money, cost: cost };
  };

  /* ---------- city events ---------- */
  const EVENTS = [
    { id: 'heatwave', title: 'Heatwave!', text: 'Hot, sunny weeks: cold drinks and outdoor fun sell fast.', months: [5, 6, 7], chance: 0.3, len: 1,
      ids: { lemonade: 1.5, bubbletea: 1.4, icecream: 1.5, carwash: 1.25, themepark: 1.25, scooters: 1.25, solar: 1.15 } },
    { id: 'rain', title: 'A rainy month', text: 'Grey skies and puddles: people stay indoors.', months: [1, 2, 9, 10], chance: 0.25, len: 1,
      ids: { lemonade: 0.5, carwash: 0.45, icecream: 0.6, bubbletea: 0.7, scooters: 0.6, themepark: 0.6, dogwalk: 0.8, foodtruck: 0.7 },
      mult: { entertainment: 1.1, logistics: 1.15 } },
    { id: 'festival', title: 'Town festival', text: 'Crowds fill the streets for the summer festival.', months: [6, 7], chance: 0.3, len: 1,
      mult: { food: 1.25, retail: 1.15, hospitality: 1.3, entertainment: 1.15 } },
    { id: 'tourists', title: 'Tourist season', text: 'Visitors from abroad arrive with cameras and big appetites.', months: [6, 7, 11], chance: 0.3, len: 1,
      mult: { hospitality: 1.35, entertainment: 1.2, transport: 1.15, food: 1.08 } },
    { id: 'school', title: 'Back to school', text: 'A new school year: tutoring, printing and phone shops are busy.', months: [8], chance: 1, len: 1,
      ids: { tutoring: 1.25, printshop: 1.2, phonecase: 1.15 } },
    { id: 'final', title: 'Cup final!', text: 'The whole city watches the big match.', months: [4], chance: 0.6, len: 1,
      ids: { football: 1.6, restaurant: 1.15, ebus: 1.1, foodtruck: 1.2 } },
    { id: 'recession', title: 'Money is tight', text: 'Prices rise and families spend less for a while. Regular customers stay loyal.', chance: 0.025, len: 4, loyal: true,
      mult: { retail: 0.85, food: 0.9, entertainment: 0.75, hospitality: 0.75, sports: 0.8, transport: 0.9, tech: 0.88, services: 0.92, fitness: 0.85, manufacturing: 0.88 } },
    { id: 'techboom', title: 'Tech boom', text: 'Everyone wants new apps and gadgets.', chance: 0.035, len: 3, mult: { tech: 1.45 }, ids: { phonecase: 1.25, office: 1.08 } },
    { id: 'supplies', title: 'Food costs more', text: 'Prices went up at the wholesale market for a while.', chance: 0.04, len: 2, mult: { food: 0.85 } },
    { id: 'green', title: 'Green city campaign', text: 'The city rewards eco-friendly businesses.', chance: 0.035, len: 3, flag: { eco: 1.2 }, mult: { energy: 1.2, agriculture: 1.15 } },
    { id: 'online', title: 'Online shopping boom', text: 'More people shop on their phones.', chance: 0.035, len: 3, flag: { online: 1.25 }, mult: { logistics: 1.3, retail: 0.93 } },
    { id: 'metro', title: 'A new metro line!', text: 'A new station opens in {district}. Land there is worth more now.', chance: 0.035, len: 0, metro: true },
    { id: 'storm', title: 'Storm!', text: 'A big storm hits the city. Insured businesses get help with the repairs.', chance: 0.03, len: 0, storm: true },
    { id: 'viral', title: 'Gone viral!', text: 'A video about your {biz} is everywhere online.', chance: 0.05, len: 0, viral: true },
    { id: 'rival', title: 'A rival opens', text: 'A new business like your {biz} opened nearby.', chance: 0.05, len: 0, rival: true },
    { id: 'rates', title: 'Loans cost more', text: 'Banks raised their interest rates for six months.', chance: 0.025, len: 6, rate: 0.005 }
  ];
  TY.EVENTS = EVENTS;
  function rollEvents(s, rep) {
    s.events = s.events.filter((e) => --e.left > 0);
    const cal = TY.calMonth(s);
    let fresh = 0;
    for (const e of EVENTS) {
      if (fresh >= 2) break;
      if (e.months && !e.months.includes(cal)) continue;
      if (s.events.some((x) => x.id === e.id)) continue;
      if (rand(s) >= e.chance) continue;
      let text = e.text;
      if (e.metro) {
        const ds = DISTRICTS.filter((d) => TY.unlocked(s, d)), d = pickR(s, ds);
        s.boom[d.id] *= 1.12; text = text.replace('{district}', d.name); learn(s, 'land');
      } else if (e.storm) {
        const hit = s.biz.filter(() => rand(s) < 0.35).slice(0, 2);
        if (!hit.length) continue;
        hit.forEach((b) => {
          const r = BIZ[b.id], loss = Math.round(midOf(r) * Math.max(0.3, b.mult) * between(s, 0.5, 1.2) * (b.flags.includes('insured') ? 0.5 : 1));
          rep.extra.push({ uid: b.uid, amount: -Math.abs(loss), text: r.name + ': storm repairs' + (b.flags.includes('insured') ? ' (insurance paid half)' : '') });
        });
        learn(s, 'insurance');
      } else if (e.viral || e.rival) {
        if (!s.biz.length) continue;
        const b = pickR(s, s.biz), r = BIZ[b.id];
        if (e.viral) b.temps.push({ m: 2, left: 1, why: 'viral' });
        else b.temps.push({ m: b.rep >= 2 ? 0.95 : 0.85, left: 3, why: 'rival' });
        text = text.replace('{biz}', r.name.toLowerCase());
        if (e.rival) learn(s, 'competition');
      } else if (e.rate) { s.rateUp += e.rate; }
      if (e.len) s.events.push({ id: e.id, left: e.len, rate: e.rate || 0 });
      rep.events.push({ id: e.id, title: e.title, text: text });
      fresh++;
    }
    // rates come back down when the rise ends
    s.rateUp = s.events.reduce((t, x) => t + (x.rate || 0), 0);
  }
  function eventMult(s, b) {
    const r = BIZ[b.id];
    let m = 1;
    s.events.forEach((x) => {
      const e = EVENTS.find((y) => y.id === x.id); if (!e) return;
      let k = 1;
      if (e.ids && e.ids[b.id]) k *= e.ids[b.id];
      else if (e.mult && e.mult[r.industry]) k *= e.mult[r.industry];
      if (e.flag) for (const f in e.flag) if (b.flags.includes(f)) k *= e.flag[f];
      if (e.loyal && k < 1 && b.flags.includes('loyal')) k = 1 - (1 - k) / 2;
      m *= k;
    });
    s.boosts.forEach((x) => { if (x.industry === 'all' || x.industry === r.industry) m *= x.m; });
    return m;
  }

  /* ---------- one month ---------- */
  TY.preview = function (s, b) {   // expected profit this month, without luck (for the cards)
    const r = BIZ[b.id], season = r.season ? SEASON[r.season][TY.calMonth(s)] : 1;
    let m = b.mult * (1 + 0.04 * b.rep) * season * eventMult(s, b);
    b.temps.forEach((t) => { m *= t.m; });
    if (r.kind === 'property') m *= Math.min(1.5, 1 + 0.003 * (s.month - b.bought));
    return Math.round(midOf(r) * m);
  };
  TY.rentFor = function (s, b) {
    const [d, i] = b.plot.split(':'), p = s.plots[d][+i];
    return p.land ? 0 : TY.rentOf(s, d, +i);
  };
  TY.next = function (s) {
    const rep = { month: TY.dateText(s), lines: [], extra: [], events: [], arrived: [], expired: [], goals: [], rent: 0, tax: 0, interest: 0, penalties: 0, before: TY.netWorth(s), cashBefore: s.cash };
    rollEvents(s, rep);
    // last month's fines and losses from traps
    s.pending.forEach((x) => { rep.extra.push({ uid: x.uid, amount: -x.amount, text: x.text }); rep.penalties += x.amount; });
    s.pending = [];
    let operating = 0;
    for (const b of s.biz) {
      const r = BIZ[b.id];
      // slow changes build up over three months
      b.slow.forEach((x) => { b.mult *= 1 + x.m / 3; x.left--; }); b.slow = b.slow.filter((x) => x.left > 0);
      const exp = TY.preview(s, b);
      const spread = spreadOf(r) * Math.max(0.3, b.mult) * (SPREAD[b.band] / SPREAD[r.risk]);
      let profit = Math.round(exp + spread * tri(s));
      let note = '';
      if (rand(s) < SHOCK[b.band]) {
        const loss = Math.round(midOf(r) * Math.max(0.3, b.mult) * between(s, 0.6, 1.4) * (b.flags.includes('insured') ? 0.5 : 1));
        profit -= loss; note = shockNote(r.industry) + (b.flags.includes('insured') ? ' (insurance paid half)' : '');
      }
      const rent = TY.rentFor(s, b);
      b.temps.forEach((t) => { t.left--; }); b.temps = b.temps.filter((t) => t.left > 0);
      b.hist.push(profit - rent); if (b.hist.length > 12) b.hist.shift();
      operating += profit - rent; rep.rent += rent;
      rep.lines.push({ uid: b.uid, id: b.id, name: r.name, emoji: r.emoji, profit: profit - rent, rent: rent, note: note });
    }
    rep.extra.forEach((x) => { operating += x.amount; });
    rep.tax = operating > 0 ? Math.round(operating * TAX) : 0;
    rep.interest = Math.round(s.loan * TY.loanRate(s)) + (s.cash < 0 ? Math.round(-s.cash * OVERDRAFT) : 0);
    const net = operating - rep.tax - rep.interest;
    s.cash += net;
    rep.profit = operating; rep.net = net;
    if (operating > 0) s.stats.profit += operating;
    if (s.biz.length) { learn(s, 'profit'); if (rep.tax) learn(s, 'tax'); }
    if (s.loan) learn(s, 'interest');
    // cases expire if left too long: the problem does not go away
    s.inbox.filter((x) => x.due <= s.month).forEach((x) => {
      if (x.kind === 'case') {
        const b = s.biz.find((y) => y.uid === x.uid);
        if (b) { b.rep = Math.max(-5, b.rep - 1); b.temps.push({ m: 0.85, left: 3, why: 'ignored' }); rep.expired.push(BIZ[b.id].name); }
      }
    });
    s.inbox = s.inbox.filter((x) => x.due > s.month);
    s.month++;
    // new cases: about one every few months per business, at most two waiting
    for (const b of s.biz) {
      if (s.inbox.filter((x) => x.kind === 'case').length >= 2) break;
      if (s.month - b.lastCase >= 3 && rand(s) < 0.16 && addCase(s, b)) rep.arrived.push(BIZ[b.id].name);
    }
    // offers: now and then, never two at once
    if (s.month >= 3 && !s.inbox.some((x) => x.kind === 'offer') && OFFERS.length && rand(s) < 0.08) {
      const ok = OFFERS.filter((o) => o.minTier <= s.tier), fresh = ok.filter((o) => !s.seenOffers.includes(o.id));
      const pool = fresh.length ? fresh : ok;
      if (pool.length) {
        const o = pickR(s, pool);
        if (!fresh.length) s.seenOffers = [];
        s.seenOffers.push(o.id);
        s.inbox.push({ key: 'o' + s.month + '-' + o.id, kind: 'offer', id: o.id, arrived: s.month, due: s.month + 2 });
        rep.arrived.push(o.title);
      }
    }
    // the city grows: neighbours move in
    DISTRICTS.forEach((d) => { if (TY.unlocked(s, d) && rand(s) < 0.1) npcMoveIn(s, d.id); });
    s.boosts.forEach((x) => { x.left--; }); s.boosts = s.boosts.filter((x) => x.left > 0);
    // overdraft: the bank sells the smallest business when debt gets too big
    if (s.cash < 0) {
      learn(s, 'cashflow');
      if (-s.cash > 0.25 * Math.max(1000, TY.assets(s)) && s.biz.length) {
        const b = s.biz.slice().sort((a, c) => TY.bizValue(s, a) - TY.bizValue(s, c))[0], res = TY.sell(s, b.uid);
        rep.forced = BIZ[b.id].name + ' was sold for $' + res.price.toLocaleString('en-GB') + ' to cover the overdraft';
      }
    }
    // districts unlock with net worth
    const nw = TY.netWorth(s);
    DISTRICTS.forEach((d) => { if (d.tier === s.tier + 1 && nw >= d.unlock) { s.tier = d.tier; rep.unlocked = d.name; for (let k = 0; k < 2; k++) npcMoveIn(s, d.id); } });
    s.stats.peak = Math.max(s.stats.peak, nw);
    rep.after = nw; rep.cash = s.cash;
    s.history.push({ m: s.month, nw: nw, cash: Math.round(s.cash) }); if (s.history.length > 60) s.history.shift();
    rep.goals = checkGoals(s);
    s.report = rep;
    return rep;
  };
  const SHOCKS = {
    food: 'A fridge broke and the stock spoiled', retail: 'A delivery went missing', services: 'Equipment broke down',
    education: 'Teachers were off sick', fitness: 'Machines needed repairs', property: 'A big repair bill', tech: 'A big client cancelled',
    transport: 'Vehicles were off the road for repairs', logistics: 'A warehouse flooded', agriculture: 'A crop failed',
    entertainment: 'A ride closed for safety checks', manufacturing: 'A machine broke down', hospitality: 'A burst pipe closed rooms',
    energy: 'Panels needed cleaning after a dust storm', sports: 'Star players were injured'
  };
  const shockNote = (ind) => SHOCKS[ind] || 'A bad month';

  /* ---------- goals ---------- */
  const industries = (s) => new Set(s.biz.map((b) => BIZ[b.id].industry)).size;
  const tiersHeld = (s) => new Set(s.biz.map((b) => BIZ[b.id].tier)).size;
  const GOALS = [
    { id: 'first', text: 'Open your first business', test: (s) => s.stats.bought >= 1, reward: 0.05, min: 50 },
    { id: 'case1', text: 'Solve your first business case', test: (s) => s.stats.cases >= 1, reward: 0.05, min: 30 },
    { id: 'two', text: 'Run 2 businesses at once', test: (s) => s.biz.length >= 2, reward: 0.05, min: 60 },
    { id: 'stars10', text: 'Earn 10 CEO stars', test: (s) => s.stats.stars >= 10, reward: 0.05, min: 80 },
    { id: 'profit1k', text: 'Make $1,000 of profit in total', test: (s) => s.stats.profit >= 1000, reward: 0.05, min: 100 },
    { id: 'trap1', text: 'Avoid a trap in a case or an offer', test: (s) => s.stats.traps >= 1, reward: 0.05, min: 100 },
    { id: 'land', text: 'Buy a piece of land', test: (s) => s.stats.landBought >= 1, reward: 0.05, min: 100 },
    { id: 'three', text: 'Own businesses in 3 different industries', test: (s) => industries(s) >= 3, reward: 0.05, min: 150 },
    { id: 'high', text: 'Unlock High Street (net worth $4,000)', test: (s) => s.tier >= 2, reward: 0.05, min: 300 },
    { id: 'shop', text: 'Open a business on High Street', test: (s) => s.biz.some((b) => BIZ[b.id].tier >= 2), reward: 0.05, min: 300 },
    { id: 'quality5', text: 'Get a business to 5 stars of quality', test: (s) => s.biz.some((b) => TY.quality(b) >= 5), reward: 0.05, min: 300 },
    { id: 'loan', text: 'Borrow from the bank and pay it all back', test: (s) => s.stats.loanPaid >= 1, reward: 0.05, min: 300 },
    { id: 'stars50', text: 'Earn 50 CEO stars', test: (s) => s.stats.stars >= 50, reward: 0.05, min: 300 },
    { id: 'nw25k', text: 'Reach a net worth of $25,000', test: (s) => TY.netWorth(s) >= 25000, reward: 0.06, min: 300 },
    { id: 'property', text: 'Own a property that earns rent', test: (s) => s.biz.some((b) => BIZ[b.id].kind === 'property'), reward: 0.06, min: 300 },
    { id: 'sellup', text: 'Sell a business for more than you paid', test: (s) => s.stats.soldUp >= 1, reward: 0.06, min: 300 },
    { id: 'five', text: 'Run 5 businesses at once', test: (s) => s.biz.length >= 5, reward: 0.06, min: 300 },
    { id: 'down', text: 'Unlock Downtown (net worth $100,000)', test: (s) => s.tier >= 3, reward: 0.08, min: 300 },
    { id: 'traps5', text: 'Avoid 5 traps', test: (s) => s.stats.traps >= 5, reward: 0.08, min: 300 },
    { id: 'ind5', text: 'Own businesses in 5 different industries', test: (s) => industries(s) >= 5, reward: 0.08, min: 300 },
    { id: 'nw500k', text: 'Reach a net worth of $500,000', test: (s) => TY.netWorth(s) >= 500000, reward: 0.08, min: 300 },
    { id: 'cases40', text: 'Solve 40 business cases', test: (s) => s.stats.cases >= 40, reward: 0.08, min: 300 },
    { id: 'sky', text: 'Unlock Skyline & Harbour (net worth $2 million)', test: (s) => s.tier >= 4, reward: 0.1, min: 300 },
    { id: 'tiers', text: 'Own a business in every district at once', test: (s) => tiersHeld(s) >= 4, reward: 0.1, min: 300 },
    { id: 'ten', text: 'Run 10 businesses at once', test: (s) => s.biz.length >= 10, reward: 0.1, min: 300 },
    { id: 'traps15', text: 'Avoid 15 traps', test: (s) => s.stats.traps >= 15, reward: 0.1, min: 300 },
    { id: 'nw10m', text: 'Reach a net worth of $10 million', test: (s) => TY.netWorth(s) >= 10000000, reward: 0.1, min: 300 },
    { id: 'skyscraper', text: 'Build a skyscraper', test: (s) => s.biz.some((b) => b.id === 'skyscraper'), reward: 0.1, min: 300 },
    { id: 'space', text: 'Launch Space Tourism', test: (s) => s.biz.some((b) => b.id === 'space'), reward: 0.1, min: 300 },
    { id: 'tycoon', text: 'Become Tycoon of the Year: net worth $100 million', test: (s) => TY.netWorth(s) >= 100000000, reward: 0.05, min: 0 }
  ];
  TY.GOALS = GOALS;
  function checkGoals(s) {
    const done = [];
    GOALS.forEach((g) => {
      if (!s.goals[g.id] && g.test(s)) {
        const reward = g.reward ? Math.round(Math.max(g.min, g.reward * Math.max(0, TY.netWorth(s)))) : 0;   // a share of what the company is worth
        s.goals[g.id] = s.month + 1; s.cash += reward; done.push({ id: g.id, text: g.text, reward: reward });
      }
    });
    if (done.length) learn(s, 'goals');
    return done;
  }
  TY.checkGoals = checkGoals;
  TY.nextGoals = (s, n) => GOALS.filter((g) => !s.goals[g.id]).slice(0, n || 3);

  /* ---------- CEO titles and skills ---------- */
  const TITLES = [[0, 'Trainee', '🌱'], [15, 'Shop Manager', '🧑‍💼'], [45, 'Area Manager', '📋'], [90, 'Director', '🎯'], [160, 'CEO', '👔'], [260, 'Tycoon', '👑']];
  TY.title = (s) => { let t = TITLES[0]; TITLES.forEach((x) => { if (s.stats.stars >= x[0]) t = x; }); return { name: t[1], icon: t[2], next: (TITLES.find((x) => x[0] > s.stats.stars) || [null])[0] }; };
  TY.SKILLS = { pricing: 'Pricing', marketing: 'Marketing', people: 'People', money: 'Money sense', operations: 'Running things', safety: 'Street smarts', ethics: 'Honesty', strategy: 'Strategy' };

  /* ---------- saving: one plain object; check what comes back ---------- */
  TY.serialize = (s) => JSON.stringify(s);
  TY.restore = function (text) {
    let s; try { s = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { return null; }
    if (!s || s.v !== 1 || typeof s.cash !== 'number' || !Array.isArray(s.biz) || !s.plots) return null;
    DISTRICTS.forEach((d) => { if (!s.plots[d.id]) s.plots[d.id] = Array.from({ length: PLOTS }, () => ({ me: false, land: false, uid: 0, npc: '' })); if (!s.boom[d.id]) s.boom[d.id] = 1; });
    s.biz = s.biz.filter((b) => BIZ[b.id]);
    // fields a later version added get their starting values, so old saves keep working
    const fresh = TY.newGame(s.name, s.seed || 1);
    for (const k in fresh) if (s[k] === undefined) s[k] = fresh[k];
    for (const k in fresh.stats) if (s.stats[k] === undefined) s.stats[k] = fresh.stats[k];
    s.stats.skills = s.stats.skills || {};
    return s;
  };
})(typeof window !== 'undefined' ? window : globalThis);
