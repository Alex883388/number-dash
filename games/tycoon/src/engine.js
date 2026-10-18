/* engine.js — Tycoon Town's rules: the living month, money, businesses, the city's lots, land, cases, offers,
   rivals, city events, incidents on the map (roadworks, parades, earthquakes, floods, storms, typhoons,
   sandstorms), insurance, the bank, tax and goals. Pure (no page code): the page and the tests drive it through
   TY.*. A game is one plain object (TY.newGame), saved as JSON; all chance comes from its own seeded generator,
   so a saved game resumes exactly. Each game plays in one of the cities from city.js (window.TYCITY: Seaside Bay,
   Desert Oasis, Neon City, Sakura City); content (roster, business cases, offers, rival cases) comes from
   content/*.json via TY.load().
   Time: a month plays as one working day on the map, 07:00 to 21:00. TY.advance(s, hours) moves the clock and
   pays each business its share of the month hour by hour (less while roadworks block its street, nothing while a
   flood has closed it, more while a carnival crowd walks past); at 21:00 the month closes (tax, interest, new
   cases, the city growing, rivals) and the next one begins. TY.next(s) plays the rest of the month at once. */
(function (root) {
  'use strict';
  const TY = root.TY = root.TY || {};
  const TC = root.TYCITY;
  const cityOf = (s) => TC.get((s && s.map) || 'bay');
  TY.cityOf = cityOf; TY.CITIES = TC.CITIES;
  let R = null, BIZ = {}, CONTENT = {}, OFFERS = [], DISTRICTS = [], RIVALS = { names: {}, cases: [] };

  /* ---------- content ---------- */
  TY.load = function (data) {
    R = data.roster; DISTRICTS = R.districts; BIZ = {}; CONTENT = {};
    R.businesses.forEach((b) => { BIZ[b.id] = b; });
    (data.biz || []).forEach((file) => (file.businesses || []).forEach((b) => { if (BIZ[b.id]) CONTENT[b.id] = b; }));
    OFFERS = (data.offers && data.offers.offers) || [];
    RIVALS = data.rivals || { names: {}, cases: [] };
    TY.R = R; TY.BIZ = BIZ; TY.CONTENT = CONTENT; TY.OFFERS = OFFERS; TY.DISTRICTS = DISTRICTS; TY.RIVALS = RIVALS;
  };
  TY.biz = (id) => BIZ[id];
  TY.content = (id) => CONTENT[id] || null;
  // a business opens once its words and cases exist (and the game's city has room for it: no sea port in the desert)
  TY.available = (s) => R.businesses.filter((b) => CONTENT[b.id] && !(s && cityOf(s).missing[b.id]));
  TY.missing = (s, id) => cityOf(s).missing[id] || '';

  /* ---------- numbers ---------- */
  const SPEND = { none: 0, low: 0.05, mid: 0.15, high: 0.3 };
  const PENALTY = { low: 0.1, mid: 0.3, high: 0.6 };
  const SPREAD = [0, 0.5, 1, 1.6, 2.2];              // ups and downs by risk band 1-4, relative to the roster's band
  const SHOCK = [0, 0, 0, 0.02, 0.04];               // chance of a bad month by risk band
  const TAX = 0.1, RENT = 0.01, LOAN_RATE = 0.015, OVERDRAFT = 0.04, SELL_FEE = 0.1, LAND_FEE = 0.05;
  const PREMIUM = 0.01, EXCESS = 0.2;                // insurance: a share of a usual month's profit; what the company still pays of a repair
  const DANGER = { bay: 1, desert: 0.5, neon: 0.9, sakura: 3.8 };   // how often disasters strike each city (insurance costs more there)
  const START_CASH = 500, START_MONTH = 2;           // the first month is March
  const OCCUPIED = { market: 0.8, high: 0.84, downtown: 0.86, skyline: 0.72, gateway: 0.5 };   // how full each district is on day one
  const BUILD_RATE = { market: 0.9, high: 0.9, downtown: 0.95, skyline: 0.6, gateway: 0.3 };  // others buying lots: about this many a month
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const SEASONS = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
  const SEASON = {
    summer: [0.75, 0.8, 0.9, 1, 1.1, 1.3, 1.4, 1.35, 1.05, 0.9, 0.8, 0.8],
    school: [1.05, 1.05, 1.05, 1, 1.1, 0.95, 0.6, 0.7, 1.3, 1.1, 1.05, 0.85],
    holiday: [0.8, 0.9, 0.95, 0.95, 1, 1, 1, 1, 0.95, 1, 1.2, 1.5],
    newyear: [1.4, 1.15, 1.05, 1, 1, 0.95, 0.85, 0.85, 1.05, 1, 0.9, 0.8]
  };
  for (const k in SEASON) { const a = SEASON[k], m = a.reduce((x, y) => x + y, 0) / 12; SEASON[k] = a.map((x) => x / m); }
  // the working day: 14 hours from 07:00; lunch and the end of school are the busiest
  const HOURS = 14, OPEN_AT = 7;
  const DAYW = (() => { const w = [0.5, 0.8, 0.95, 1, 1.35, 1.3, 1, 0.9, 1.05, 1.3, 1.2, 1, 0.8, 0.5], t = w.reduce((a, b) => a + b, 0); return w.map((x) => x / t); })();
  const CUM = [0]; DAYW.forEach((x, i) => { CUM.push(CUM[i] + x); }); CUM[HOURS] = 1;
  const dayPart = (h) => { if (h <= 0) return 0; if (h >= HOURS) return 1; const k = Math.floor(h); return CUM[k] + (h - k) * DAYW[k]; };
  const hourOfPart = (p) => { if (p <= 0) return 0; if (p >= 1) return HOURS; let k = 0; while (k < HOURS - 1 && CUM[k + 1] <= p) k++; return k + (p - CUM[k]) / DAYW[k]; };
  const hourText = (h) => { const m = Math.round(h * 60); return String(OPEN_AT + Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const cash$ = (n) => '$' + Math.round(n).toLocaleString('en-GB');
  TY.MONTHS = MONTHS; TY.SPEND = SPEND; TY.PENALTY = PENALTY; TY.TAX = TAX; TY.RENT = RENT; TY.HOURS = HOURS; TY.OPEN_AT = OPEN_AT; TY.DAYW = DAYW; TY.dayPart = dayPart;
  TY.EXCESS = EXCESS; TY.hourText = hourText;

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
  const newLook = (s) => 1 + Math.floor(rand(s) * 997);   // what a neighbour's building looks like
  // lots some businesses must have (a port needs the harbour, the international airport the airfield): the city's
  // other builders never take the last few of them
  const RESERVE = { skyline: [['harbour', 3]], gateway: [['harbour', 3], ['airport', 3]] };
  function needFree(s, d, f) {
    const F = cityOf(s).feat[d]; let n = 0;
    for (let i = 0; i < F.length; i++) if ((F[i][f] || 0) >= 1 && isFree(s, d, i) && !s.land[key(d, i)]) n++;
    return n;
  }
  const reserved = (s, d, i) => (RESERVE[d] || []).some(([f, k]) => (TY.featOf(s, d, i)[f] || 0) >= 1 && needFree(s, d, f) <= k);
  function keepReserves(s) {
    for (const d in RESERVE) {
      RESERVE[d].forEach(([f, k]) => {
        const F = cityOf(s).feat[d];
        for (let i = 0; i < s.lot[d].length && needFree(s, d, f) < k; i++) if ((F[i][f] || 0) >= 1 && s.lot[d][i] && !s.bld[key(d, i)]) s.lot[d][i] = 0;
      });
    }
  }
  function fillCity(s) {
    const C = cityOf(s);
    DISTRICTS.forEach((d) => { s.lot[d.id] = C.lots[d.id].map(() => (rand(s) < OCCUPIED[d.id] ? newLook(s) : 0)); });
    keepReserves(s);
  }
  TY.newGame = function (name, seed, map) {
    const s = {
      v: 3, name: name || 'Super Co.', map: TC.get(map || 'bay').id, seed: seed >>> 0, rng: seed >>> 0, month: 0, cash: START_CASH, loan: 0, rateUp: 0,
      lot: {}, bld: {}, land: {}, boom: {}, biz: [], nextUid: 1, caseNext: {}, inbox: [], events: [], boosts: [], pending: [], goals: {}, seenOffers: [],
      rivals: [], nextRival: 1, rivalNames: {}, works: [],
      stats: { bought: 0, sold: 0, soldUp: 0, cases: 0, offers: 0, stars: 0, profit: 0, traps: 0, fell: 0, best: 0, loanPaid: 0, landBought: 0, peak: START_CASH, skills: {}, rivalsBeaten: 0,
        insured: 0, claims: 0, incidents: 0 },
      handbook: {}, report: null, history: [], tier: 1, created: Date.now(), live: null
    };
    DISTRICTS.forEach((d) => { s.boom[d.id] = 1; });
    fillCity(s);
    learn(s, 'cash');
    beginMonth(s);
    return s;
  };

  /* ---------- calendar, districts ---------- */
  TY.calMonth = (s) => (START_MONTH + s.month) % 12;
  TY.year = (s) => 1 + Math.floor((START_MONTH + s.month) / 12) - Math.floor(START_MONTH / 12);
  TY.dateText = (s) => MONTHS[TY.calMonth(s)] + ', year ' + TY.year(s);
  TY.season = (s) => SEASONS[TY.calMonth(s)];
  TY.seasonOf = (cal) => SEASONS[((cal % 12) + 12) % 12];
  TY.district = (id) => DISTRICTS.find((d) => d.id === id);
  TY.districtOfTier = (t) => DISTRICTS.find((d) => d.tier === t);
  // each city names its districts its own way (Old Souk, The Strip, Ginza Street...)
  TY.dname = (s, d) => cityOf(s).names[d] || TY.district(d).name;
  TY.demoji = (s, d) => cityOf(s).emojis[d] || TY.district(d).emoji;
  TY.unlocked = (s, d) => (typeof d === 'string' ? TY.district(d) : d).tier <= s.tier;
  TY.clock = (s) => { const h = s.live ? s.live.h : 0; return { h: h, hour: OPEN_AT + Math.floor(h), minute: Math.floor((h % 1) * 60), part: dayPart(h) }; };

  /* ---------- the city's lots ---------- */
  const key = (d, i) => d + ':' + i;
  TY.lotKey = key;
  TY.lotsOf = (s, d) => cityOf(s).lots[d];
  TY.bizAt = (s, d, i) => s.biz.find((b) => b.plot === key(d, i)) || null;
  TY.rivalAt = (s, d, i) => s.rivals.find((x) => x.d === d && x.i === i) || null;
  // what stands on a lot: one of the company's businesses, a rival, a neighbour's building (or one going up),
  // the company's own empty land, or nothing (for sale)
  TY.lotState = function (s, d, i) {
    const b = TY.bizAt(s, d, i); if (b) return { k: 'biz', b: b };
    const x = TY.rivalAt(s, d, i); if (x) return { k: 'rival', rival: x };
    const look = s.lot[d][i];
    if (look) return { k: s.bld[key(d, i)] ? 'build' : 'npc', look: look, left: s.bld[key(d, i)] || 0 };
    return { k: s.land[key(d, i)] ? 'land' : 'free' };
  };
  const isFree = (s, d, i) => !s.lot[d][i] && !TY.bizAt(s, d, i) && !TY.rivalAt(s, d, i);   // free, or the company's own empty land
  TY.isFree = isFree;
  TY.freeLots = (s, d) => s.lot[d].map((x, i) => i).filter((i) => isFree(s, d, i));
  TY.forSale = (s, d) => TY.freeLots(s, d).filter((i) => !s.land[key(d, i)]);
  const occupied = (s, d, i) => !isFree(s, d, i) || !!s.land[key(d, i)];
  TY.fill = function (s, d) {   // how full a district is, 0..1
    const L = s.lot[d]; let n = 0;
    for (let i = 0; i < L.length; i++) if (L[i]) n++;
    s.biz.forEach((b) => { if (b.plot.split(':')[0] === d) n++; });
    s.rivals.forEach((x) => { if (x.d === d) n++; });
    for (const k in s.land) if (k.split(':')[0] === d && !s.biz.some((b) => b.plot === k)) n++;
    return n / L.length;
  };
  TY.featOf = (s, d, i) => { const F = cityOf(s).feat[d]; return (F && F[i]) || {}; };
  const lotOfBiz = (s, b) => { const [d, i] = b.plot.split(':'); return cityOf(s).lots[d][+i]; };
  const featOfBiz = (s, b) => { const [d, i] = b.plot.split(':'); return TY.featOf(s, d, +i); };
  // how well a business would do on a lot: the park, the water, a school, the station... (from the roster's likes)
  TY.locOf = function (s, id, d, i) {
    const r = BIZ[id], f = TY.featOf(s, d, i), likes = (r && r.likes) || {}, parts = [];
    let m = 0.9;   // a spot with nothing the business likes does a little worse than average
    for (const k in likes) { const v = 1.25 * (f[k] || 0) * likes[k]; if (v) { parts.push({ f: k, v: Math.round(v * 100) / 100 }); m += v; } }
    m = Math.max(0.75, Math.min(1.5, m));
    parts.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
    return { mult: Math.round(m * 100) / 100, parts: parts };
  };
  TY.locStars = (m) => (m < 0.92 ? 1 : m < 1 ? 2 : m < 1.1 ? 3 : m < 1.22 ? 4 : 5);
  const NEEDS = { harbour: 'right by the harbour', water: 'by the water', airport: 'near the airport' };
  TY.needsText = (id) => (BIZ[id] && BIZ[id].needs ? 'A ' + BIZ[id].name.toLowerCase() + ' must be ' + NEEDS[BIZ[id].needs] : '');
  TY.reserved = reserved;

  /* ---------- values ---------- */
  const growth = (s, d) => Math.pow(1.004, s.month) * s.boom[d];
  // land is worth more as the city grows, next to busy neighbours, and when there is little left
  TY.scarcity = (s, d) => 1 + 1.5 * Math.max(0, TY.fill(s, d) - 0.72);
  TY.landValue = function (s, d, i) {
    let n = 0; (cityOf(s).nbrs[d][i] || []).forEach((j) => { if (occupied(s, d, j)) n++; });
    return Math.round(TY.district(d).land * growth(s, d) * (1 + 0.05 * Math.min(6, n)) * TY.scarcity(s, d));
  };
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
    for (const k in s.land) {
      const [d, i] = k.split(':'), b = s.biz.find((x) => x.plot === k);
      if (!b || BIZ[b.id].kind !== 'property') v += TY.landValue(s, d, +i);
    }
    return v;
  };
  TY.assets = (s) => Math.max(0, s.cash) + s.biz.reduce((t, b) => t + TY.bizValue(s, b), 0) + TY.landOwned(s);
  TY.netWorth = (s) => Math.round(TY.assets(s) - s.loan + Math.min(0, s.cash));
  TY.loanLimit = (s) => Math.max(0, Math.round(Math.max(300, 0.5 * Math.max(0, TY.netWorth(s))) - s.loan));   // half of what the company is worth
  TY.loanRate = (s) => LOAN_RATE + s.rateUp;
  TY.quality = (b) => Math.max(1, Math.min(5, Math.round(3 + Math.log(Math.max(0.2, b.mult)) / Math.log(1.15) + b.rep * 0.25)));
  TY.population = (s) => 1000 + s.month * 12 + DISTRICTS.reduce((t, d) => t + s.lot[d.id].filter((x) => x > 0).length * 60, 0) +
    s.biz.reduce((t, b) => t + 250 * BIZ[b.id].tier * BIZ[b.id].tier, 0);

  /* ---------- the CEO handbook: words learned on the way ---------- */
  const learn = (s, k) => { if (!s.handbook[k]) s.handbook[k] = s.month + 1; };
  TY.learn = learn;

  /* ---------- opening, selling, land ---------- */
  TY.canOpen = function (s, id, d, i, buyLand) {
    const r = BIZ[id], lots = TY.lotsOf(s, d), lot = lots && lots[i];
    if (!r || !CONTENT[id]) return 'Coming soon';
    if (cityOf(s).missing[id]) return cityOf(s).missing[id];
    const dist = TY.district(d);
    if (!dist || r.tier !== dist.tier) return 'This business opens in ' + TY.dname(s, TY.districtOfTier(r.tier).id);
    if (!TY.unlocked(s, d)) return 'Unlocks at a net worth of $' + dist.unlock.toLocaleString('en-GB');
    if (!lot || !isFree(s, d, i)) return 'That lot is taken';
    if (s.biz.some((b) => b.id === id)) return 'You already run one: try something new!';
    if (r.needs && !(TY.featOf(s, d, i)[r.needs] >= 1)) return TY.needsText(id);
    const cost = TY.openCost(s, id, d, i, buyLand);
    if (s.cash < cost) return 'You need $' + cost.toLocaleString('en-GB') + ' in cash';
    return '';
  };
  TY.openCost = function (s, id, d, i, buyLand) {
    const r = BIZ[id], own = !!s.land[key(d, i)];
    if (r.kind === 'property') return Math.round(own ? Math.max(r.price * 0.5, r.price - TY.landValue(s, d, i)) : r.price);   // its land is in the price
    return r.price + (buyLand && !own ? TY.landValue(s, d, i) : 0);
  };
  TY.open = function (s, id, d, i, buyLand) {
    const why = TY.canOpen(s, id, d, i, buyLand);
    if (why) return { ok: false, why: why };
    const r = BIZ[id], k = key(d, i), cost = TY.openCost(s, id, d, i, buyLand);
    s.cash -= cost;
    if (r.kind === 'property' || buyLand) { if (!s.land[k]) s.stats.landBought++; s.land[k] = 1; }
    const b = { uid: s.nextUid++, id: id, plot: k, bought: s.month, paid: cost, mult: 1, rep: 0, band: r.risk, flags: [], temps: [], slow: [],
      next: 0, lastCase: s.month, hist: [], g0: growth(s, d), loc: TY.locOf(s, id, d, i).mult, ins: 0 };
    s.biz.push(b); s.stats.bought++;
    learn(s, 'invest'); learn(s, 'risk'); learn(s, 'location'); if (!s.land[k]) learn(s, 'rent'); else learn(s, 'land');
    if (r.kind === 'property') learn(s, 'property');
    // it earns from now: its share of what is left of today
    if (s.live) startEarning(s, b, s.live.h);
    addCase(s, b);                                    // the opening case
    checkGoals(s);
    return { ok: true, biz: b };
  };
  TY.sellPrice = (s, b) => Math.round(TY.bizValue(s, b) * (1 - SELL_FEE));
  TY.sell = function (s, uid) {
    const b = s.biz.find((x) => x.uid === uid); if (!b) return { ok: false };
    const price = TY.sellPrice(s, b);
    s.cash += price; s.stats.sold++; if (price > b.paid) s.stats.soldUp++;
    if (BIZ[b.id].kind === 'property') delete s.land[b.plot];   // the land goes with the building
    const L = s.live;
    if (L && L.pr[uid] !== undefined) {               // what it earned today stays in this month's books
      L.gone.push({ uid: uid, id: b.id, got: L.got[uid] || 0 });
      ['pr', 'rent', 'fh', 'got', 'seg'].forEach((f) => { delete L[f][uid]; });
    }
    s.biz = s.biz.filter((x) => x !== b);
    s.inbox = s.inbox.filter((x) => x.uid !== uid);
    // a rival that fought it just becomes another shop in the street
    s.rivals.filter((x) => x.uid === uid).forEach((x) => { s.lot[x.d][x.i] = newLook(s); });
    s.rivals = s.rivals.filter((x) => x.uid !== uid);
    learn(s, 'value');
    checkGoals(s);
    return { ok: true, price: price };
  };
  TY.buyLand = function (s, d, i) {
    // a lot for sale, or the lot under one of the company's own businesses (it stops paying rent)
    if (!TY.unlocked(s, d) || s.land[key(d, i)] || s.lot[d][i] || TY.rivalAt(s, d, i)) return { ok: false, why: 'Not for sale' };
    const v = TY.landValue(s, d, i);
    if (s.cash < v) return { ok: false, why: 'You need $' + v.toLocaleString('en-GB') + ' in cash' };
    s.cash -= v; s.land[key(d, i)] = 1; s.stats.landBought++; learn(s, 'land');
    checkGoals(s);
    return { ok: true, price: v };
  };
  TY.sellLand = function (s, d, i) {
    const k = key(d, i);
    if (!s.land[k] || TY.bizAt(s, d, i)) return { ok: false, why: TY.bizAt(s, d, i) ? 'A business stands on it' : 'Not yours' };
    const v = Math.round(TY.landValue(s, d, i) * (1 - LAND_FEE));
    s.cash += v; delete s.land[k];
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

  /* ---------- insurance: a little every month, help when trouble comes ---------- */
  const insured = (b) => !!b.ins || b.flags.includes('insured');   // a policy bought here, or cover a business case set up
  TY.insured = insured;
  // what a policy costs a month: a share of what the business usually earns; more by the water (floods and
  // storms) and in a city where earthquakes and typhoons are common
  TY.premium = function (s, b) {
    const r = BIZ[b.id], f = featOfBiz(s, b), risk = (DANGER[cityOf(s).id] || 1) * (1 + 0.7 * Math.max(f.water || 0, f.beach || 0));
    return Math.max(1, Math.round(Math.max(1, midOf(r)) * Math.max(0.3, b.mult) * PREMIUM * risk));
  };
  TY.danger = (s) => DANGER[cityOf(s).id] || 1;
  // insurers stop selling new policies once a storm warning is out
  TY.warned = function (s) {
    const L = s.live; if (!L) return '';
    const x = L.inc.find((y) => INC[y.id].warn && !y.done);
    return x ? INC[x.id].a : '';
  };
  TY.canInsure = function (s, b) {
    if (insured(b)) return 'Already insured';
    const w = TY.warned(s); if (w) return 'No insurer sells a new policy with ' + w + ' on the way. Insure before trouble comes!';
    const p = TY.premium(s, b);
    return s.cash < p ? 'You need ' + cash$(p) + ' in cash' : '';
  };
  TY.insure = function (s, uid, on) {
    const b = s.biz.find((x) => x.uid === uid); if (!b) return { ok: false, why: 'Gone' };
    if (!on) { if (!b.ins) return { ok: false, why: 'Not insured' }; b.ins = 0; return { ok: true }; }
    const why = TY.canInsure(s, b); if (why) return { ok: false, why: why };
    const p = TY.premium(s, b);
    s.cash -= p; b.ins = 1; s.stats.insured++;
    if (s.live) { s.live.rep.premiums += p; s.live.rep.policies++; }
    learn(s, 'insurance'); learn(s, 'premium');
    checkGoals(s);
    return { ok: true, premium: p };
  };

  /* ---------- cases, rival cases and offers ---------- */
  function addCase(s, b) {
    const c = CONTENT[b.id], n = s.caseNext[b.id] || 0;   // each business's three cases come once, in order
    if (!c || n >= c.cases.length) return false;
    if (s.inbox.some((x) => x.uid === b.uid && x.kind === 'case')) return false;
    s.inbox.push({ key: 'c' + b.uid + '-' + n, kind: 'case', uid: b.uid, idx: n, arrived: s.month, due: s.month + 3 });
    s.caseNext[b.id] = n + 1; b.lastCase = s.month;
    return true;
  }
  function rivalCase(s, item) {
    const x = s.rivals.find((y) => y.id === item.rid), b = s.biz.find((y) => y.uid === item.uid), t = RIVALS.cases[item.tpl];
    if (!x || !b || !t) return null;
    const fill = (txt) => String(txt).replace(/\{rival\}/g, x.name).replace(/\{biz\}/g, BIZ[b.id].name.toLowerCase()).replace(/\{where\}/g, x.where);
    return { id: t.id, title: fill(t.title), story: fill(t.story), rival: x.name,
      options: t.options.map((o) => Object.assign({}, o, { text: fill(o.text), result: fill(o.result), lesson: fill(o.lesson) })) };
  }
  TY.caseOf = function (s, item) {
    if (item.kind === 'offer') return OFFERS.find((o) => o.id === item.id) || null;
    if (item.kind === 'rival') return rivalCase(s, item);
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
    return b ? Math.round(BIZ[b.id].price * (SPEND[o.spend] || 0)) : 0;
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
  // the child decides a case, a rival case or an offer: picks = option numbers (1 or 2 of them)
  TY.decide = function (s, key, picks) {
    const item = s.inbox.find((x) => x.key === key); if (!item) return { ok: false, why: 'Gone' };
    const c = TY.caseOf(s, item); if (!c) { s.inbox = s.inbox.filter((x) => x !== item); return { ok: false, why: 'Missing' }; }
    picks = [...new Set(picks)].filter((k) => k >= 0 && k < c.options.length);
    if (!picks.length || picks.length > TY.picksAllowed(s, item)) return { ok: false, why: 'Pick ' + TY.picksAllowed(s, item) };
    const cost = picks.reduce((t, k) => t + TY.optionCost(s, item, c.options[k]), 0);
    if (cost > s.cash) return { ok: false, why: 'Not enough cash for that plan ($' + cost.toLocaleString('en-GB') + ')' };
    let money = 0;
    if (item.kind === 'case' || item.kind === 'rival') {
      const b = s.biz.find((x) => x.uid === item.uid);
      picks.forEach((k) => applyOption(s, b, c.options[k]));
      if (item.kind === 'rival') {
        const x = s.rivals.find((y) => y.id === item.rid);
        if (x) x.shield = Math.min(0.8, x.shield + picks.reduce((t, k) => t + (c.options[k].shield || 0), 0));
        learn(s, 'competition');
      }
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

  /* ---------- city events: a whole month of something ---------- */
  // months: calendar months (0 = January), or per climate ('snowy' cities have real winters, 'dry' ones are deserts)
  const EVENTS = [
    { id: 'heatwave', title: 'Heatwave!', text: 'Hot, sunny weeks: cold drinks and outdoor fun sell fast.', months: { snowy: [5, 6, 7], dry: [4, 5, 6, 7, 8] }, chance: 0.3, len: 1,
      ids: { lemonade: 1.5, bubbletea: 1.4, icecream: 1.5, carwash: 1.25, themepark: 1.25, scooters: 1.25, solar: 1.15 } },
    { id: 'rain', title: 'A rainy month', text: 'Grey skies and puddles: people stay indoors.', months: { snowy: [1, 2, 9, 10] }, chance: 0.25, len: 1,
      ids: { lemonade: 0.5, carwash: 0.45, icecream: 0.6, bubbletea: 0.7, scooters: 0.6, themepark: 0.6, dogwalk: 0.8, foodtruck: 0.7 },
      mult: { entertainment: 1.1, logistics: 1.15 } },
    { id: 'snow', title: 'Snow everywhere!', text: 'A white, frosty month: hot food and indoor fun sell, outdoor stalls are quiet.', months: { snowy: [11, 0, 1] }, chance: 0.35, len: 1,
      ids: { lemonade: 0.4, icecream: 0.5, carwash: 0.5, scooters: 0.5, bikefix: 0.6, foodtruck: 0.7, themepark: 0.6, dogwalk: 0.8, cupcake: 1.15, bakery: 1.15, cinema: 1.15 },
      mult: { entertainment: 1.08, hospitality: 1.05 } },
    { id: 'festival', title: 'Town festival', text: 'Crowds fill the streets for the summer festival.', months: [6, 7], chance: 0.3, len: 1,
      mult: { food: 1.25, retail: 1.15, hospitality: 1.3, entertainment: 1.15 } },
    { id: 'tourists', title: 'Tourist season', text: 'Visitors from abroad arrive with cameras and big appetites.', months: { snowy: [6, 7, 11], dry: [0, 1, 2, 10, 11] }, chance: 0.3, len: 1,
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
    { id: 'viral', title: 'Gone viral!', text: 'A video about your {biz} is everywhere online.', chance: 0.05, len: 0, viral: true },
    { id: 'rates', title: 'Loans cost more', text: 'Banks raised their interest rates for six months.', chance: 0.025, len: 6, rate: 0.005 }
  ];
  TY.EVENTS = EVENTS;
  const monthsOf = (e, climate) => (!e.months ? null : Array.isArray(e.months) ? e.months : e.months[climate] || []);
  function rollEvents(s, rep) {
    s.events = s.events.filter((e) => --e.left > 0);
    const cal = TY.calMonth(s), climate = cityOf(s).climate;
    let fresh = 0;
    for (const e of EVENTS) {
      if (fresh >= 2) break;
      const ms = monthsOf(e, climate);
      if (ms && !ms.includes(cal)) continue;
      if (s.events.some((x) => x.id === e.id)) continue;
      if (rand(s) >= e.chance) continue;
      let text = e.text;
      if (e.metro) {
        const ds = DISTRICTS.filter((d) => TY.unlocked(s, d)), d = pickR(s, ds);
        s.boom[d.id] *= 1.12; text = text.replace('{district}', TY.dname(s, d.id)); learn(s, 'land');
      } else if (e.viral) {
        if (!s.biz.length) continue;
        const b = pickR(s, s.biz), r = BIZ[b.id];
        b.temps.push({ m: 2, left: 1, why: 'viral' });
        text = text.replace('{biz}', r.name.toLowerCase());
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

  /* ---------- incidents: what happens on the map during the day ---------- */
  // how likely each one is in a month, in each city: [chance, calendar months (all year without)]
  const RISK = {
    bay: { roadworks: [0.09], carnival: [0.3, [1, 6, 7]], flood: [0.06, [2, 3, 9, 10]], storm: [0.07, [0, 1, 9, 10, 11]], quake: [0.012] },
    desert: { roadworks: [0.09], carnival: [0.25, [0, 1, 11]], sandstorm: [0.12, [2, 3, 4, 5]], flood: [0.03, [0, 10, 11]], quake: [0.012], storm: [0.02, [1, 2]] },
    neon: { roadworks: [0.09], carnival: [0.12], sandstorm: [0.07, [3, 4, 5]], storm: [0.05, [6, 7]], quake: [0.03], flood: [0.02, [6, 7]] },
    sakura: { roadworks: [0.09], carnival: [0.3, [3, 6, 7]], typhoon: [0.14, [7, 8, 9]], flood: [0.05, [5, 6]], quake: [0.045], storm: [0.03, [3, 4]] }
  };
  // warn: a forecast comes at dawn (and insurers stop selling); a: how the game names it in a sentence
  const INC = {
    roadworks: { emoji: '🚧', title: 'Roadworks!', a: 'roadworks' },
    carnival: { emoji: '🎪', title: 'Carnival day!', a: 'a carnival' },
    quake: { emoji: '💥', title: 'Earthquake!', a: 'an earthquake' },
    flood: { emoji: '🌊', title: 'Flood!', a: 'a flood', warn: 1 },
    storm: { emoji: '⛈️', title: 'Storm!', a: 'a storm', warn: 1 },
    typhoon: { emoji: '🌀', title: 'Typhoon!', a: 'a typhoon', warn: 1 },
    sandstorm: { emoji: '🌪️', title: 'Sandstorm!', a: 'a sandstorm', warn: 1 }
  };
  const PARADE = { bay: 'Carnival', desert: 'Desert Festival', neon: 'Neon Parade', sakura: 'Matsuri' };
  TY.RISK = RISK; TY.INC = INC;
  // businesses that are mostly outdoors, what a parade crowd wants, and what a closed street hurts
  const OUTDOOR = new Set(['lemonade', 'dogwalk', 'carwash', 'bikefix', 'icecream', 'foodtruck', 'scooters', 'themepark', 'football', 'megaresort', 'cruiseport', 'solar']);
  const CROWD = new Set(['food', 'retail', 'entertainment', 'hospitality']);
  const QUIET = new Set(['services', 'education', 'tech', 'logistics', 'transport', 'fitness', 'manufacturing']);
  function tilesNear(lot, tiles) {   // the shortest distance (in tiles) from a lot to a list of tiles
    let best = 99;
    for (const [c, r] of tiles) {
      const dc = c < lot.c ? lot.c - c : c > lot.c + lot.w - 1 ? c - (lot.c + lot.w - 1) : 0;
      const dr = r < lot.r ? lot.r - r : r > lot.r + lot.w - 1 ? r - (lot.r + lot.w - 1) : 0;
      best = Math.min(best, Math.max(dc, dr));
    }
    return best;
  }
  function nearestDistrict(s, c, r) {
    const C = cityOf(s); let best = DISTRICTS[0].id, bd = 1e9;
    DISTRICTS.forEach((d) => { const [cc, rr] = C.centers[d.id], dd = Math.abs(cc - c) + Math.abs(rr - r); if (dd < bd) { bd = dd; best = d.id; } });
    return best;
  }
  function planIncidents(s) {
    const L = s.live; L.inc = [];
    if (s.month < 3 || !s.biz.length) return;   // the first months are calm
    const C = cityOf(s), cal = TY.calMonth(s), tab = RISK[C.id] || RISK.bay, w = [];
    let total = 0;
    for (const id in tab) {
      const [p, ms] = tab[id];
      if ((ms && !ms.includes(cal)) || (id === 'roadworks' && s.works.length)) continue;
      w.push([id, p]); total += p;
    }
    if (!w.length || rand(s) >= Math.min(0.45, total)) return;
    let t = rand(s) * total, id = w[w.length - 1][0];
    for (const [k, p] of w) { t -= p; if (t <= 0) { id = k; break; } }
    const x = makeIncident(s, id);
    if (x) L.inc.push(x);
  }
  function makeIncident(s, id) {
    const C = cityOf(s), K = C.K, base = INC[id], x = { id: id, emoji: base.emoji, title: base.title, h: 0, end: HOURS, on: 0, done: 0, dawn: '', text: '' };
    const rd = (c, r) => C.inb(c, r) && (C.get(c, r) === K.ROAD || C.get(c, r) === K.AVENUE);
    const warnTail = ' Insurers stop selling new policies once a warning is out.';
    if (id === 'roadworks') {
      // right outside one of the company's businesses: a few tiles of road dug up
      const b = pickR(s, s.biz), [d] = b.plot.split(':'), lot = lotOfBiz(s, b), roads = [];
      for (let r = lot.r - 1; r <= lot.r + lot.w; r++) for (let c = lot.c - 1; c <= lot.c + lot.w; c++) if (rd(c, r)) roads.push([c, r]);
      if (!roads.length) return null;
      const [c0, r0] = pickR(s, roads), across = rd(c0 - 1, r0) || rd(c0 + 1, r0), tiles = [[c0, r0]];
      for (const dir of [-1, 1]) for (let t = 1; t <= 2; t++) { const c = across ? c0 + dir * t : c0, r = across ? r0 : r0 + dir * t; if (rd(c, r)) tiles.push([c, r]); else break; }
      x.tiles = tiles; x.h = 1 + Math.floor(rand(s) * 4); x.months = rand(s) < 0.4 ? 2 : 1; x.where = TY.dname(s, d);
      x.dawn = 'Diggers are booked for a street in ' + x.where + ' from ' + hourText(x.h) + (x.months > 1 ? ', for about two months' : ' until the end of the month') + '. Shops next to it will get fewer customers.';
      x.text = 'Barriers and diggers block a street in ' + x.where + ': fewer customers can reach the shops next to it.';
    } else if (id === 'carnival') {
      const P = C.parade, mid = P[Math.floor(P.length / 2)] || [0, 0], name = PARADE[C.id] || 'Carnival';
      x.tiles = P; x.h = 5; x.end = 10; x.title = name + (C.id === 'sakura' ? ' festival!' : ' day!'); x.where = TY.dname(s, nearestDistrict(s, mid[0], mid[1]));
      x.dawn = 'The ' + name + ' parade marches through ' + x.where + ' from 12:00 to 17:00. Food, shops and fun on the route will be packed; offices and services there lose customers while the streets are closed.';
      x.text = 'The parade is here! Crowds pack the route: food stalls and shops are busy, but offices and services on the closed streets are quiet.';
    } else if (id === 'quake') {
      // somewhere near the businesses: the ground shakes most at its centre
      const b = pickR(s, s.biz), lot = lotOfBiz(s, b);
      x.c = lot.c + (rand(s) - 0.5) * 14; x.r = lot.r + (rand(s) - 0.5) * 14; x.rad = 14; x.h = 1 + rand(s) * 11;
      x.where = TY.dname(s, nearestDistrict(s, x.c, x.r));
      x.text = 'The ground shook near ' + x.where + '! Buildings close to the centre of the quake need repairs, and the worst hit close for safety checks.';
    } else if (id === 'flood') {
      x.h = 2 + Math.floor(rand(s) * 5);
      x.dawn = 'Flood warning: heavy rain is coming, and the water will rise at about ' + hourText(x.h) + '. Lots right by the water are in danger.' + warnTail;
      x.text = 'The water is rising! Businesses right by the water are flooded and close for the day.';
    } else if (id === 'storm') {
      x.h = 3 + Math.floor(rand(s) * 6);
      x.dawn = 'Storm warning: a big storm arrives at about ' + hourText(x.h) + ', with strong winds by the water.' + warnTail;
      x.text = 'The storm is here! People stay indoors, and the wind breaks things by the water.';
    } else if (id === 'typhoon') {
      x.h = 3 + Math.floor(rand(s) * 5);
      x.dawn = 'Typhoon warning! It arrives at about ' + hourText(x.h) + '. Everyone will stay at home, and the coast will be hit hardest.' + warnTail;
      x.text = 'The typhoon hits the city! Shops by the sea are battered and close; everyone else stays at home.';
    } else if (id === 'sandstorm') {
      x.h = 2 + Math.floor(rand(s) * 6); x.end = Math.min(HOURS, x.h + 6);
      x.dawn = 'Dust warning: a sandstorm will blow in at about ' + hourText(x.h) + '. Outdoor businesses will suffer.' + warnTail;
      x.text = 'A wall of sand rolls over the city! People hide indoors, and sand gets into every machine.';
    }
    return x;
  }
  // what an incident does to one business: its trade for the rest of the incident (k: 0 = closed, 0.5 = half the
  // customers, 1.6 = a crowd) and a bill. fresh: the incident is just starting (repairs are drawn now); otherwise
  // the business opened later in the day and only its trade changes
  function effectOf(s, x, b, fresh) {
    const r = BIZ[b.id], lot = lotOfBiz(s, b), f = featOfBiz(s, b);
    const mid = Math.max(1, midOf(r)) * Math.max(0.3, b.mult), out = OUTDOOR.has(b.id);
    const roll = (lo, hi) => (fresh ? between(s, lo, hi) : 0), chance = (p) => fresh && rand(s) < p;
    const coast = Math.max(f.water || 0, f.beach || 0, f.harbour || 0);
    if (x.id === 'carnival') {
      const dd = tilesNear(lot, x.tiles); if (dd > 2) return null;
      const k = CROWD.has(r.industry) ? 1.6 : QUIET.has(r.industry) ? 0.45 : 1;
      return { k: k, note: k > 1 ? 'carnival crowds' : k < 1 ? 'streets closed for the parade' : '', bill: dd <= 1 ? mid * 0.08 : 0, what: 'clean-up after the parade', icon: '🧹', cover: false };
    }
    if (x.id === 'quake') {
      const sev = 1 - Math.hypot(lot.c + lot.w / 2 - x.c, lot.r + lot.w / 2 - x.r) / x.rad;
      if (sev <= 0.15) return { k: 0.9, note: 'people stayed home after the quake' };
      return { k: sev > 0.6 ? 0 : 0.7, note: sev > 0.6 ? 'closed for safety checks after the quake' : 'shaken by the quake', bill: mid * sev * roll(0.6, 1.3) * 1.4, what: 'earthquake repairs' };
    }
    if (x.id === 'flood') {
      const w = f.water || 0;
      if (w < 0.5) return { k: 0.9, note: 'a rainy day' };
      return { k: w >= 1 ? 0 : 0.6, note: w >= 1 ? 'flooded and closed' : 'water in the street', bill: mid * w * roll(0.6, 1.2), what: 'flood repairs' };
    }
    if (x.id === 'storm') {
      const e = { k: out ? 0.5 : 0.85, note: 'storm' };
      if (x.nhit < 3 && chance(0.1 + 0.35 * coast)) { x.nhit++; e.bill = mid * roll(0.4, 0.9); e.what = 'storm damage'; }
      return e;
    }
    if (x.id === 'typhoon') {
      const e = { k: out ? 0.15 : 0.45, note: 'typhoon: everyone stayed at home' };
      if (coast >= 0.5) { e.bill = mid * coast * roll(0.7, 1.4); e.what = 'typhoon repairs'; if (coast >= 1) { e.k = 0; e.note = 'closed by the typhoon'; } }
      else if (chance(0.2)) { e.bill = mid * 0.25; e.what = 'windows broken in the typhoon'; }
      return e;
    }
    if (x.id === 'sandstorm') {
      const e = { k: out ? 0.25 : 0.55, note: 'sandstorm' };
      if (r.industry === 'energy' || b.id === 'carwash' || b.id === 'bikefix') { e.bill = mid * 0.3; e.what = 'cleaning sand out of the machines'; e.icon = '🧹'; e.cover = false; }
      return e;
    }
    return null;
  }
  function hitBiz(s, x, b, fresh) {
    const e = effectOf(s, x, b, fresh); if (!e) return;
    const L = s.live, a = Math.max(L.h, x.h), z = x.end;
    if (e.k !== 1 && z > a) L.seg[b.uid].push({ a: a, b: z, k: e.k, w: x.id, n: e.note || '' });
    if (!fresh) return;
    if (e.bill > 0) {
      const r = BIZ[b.id], bill = Math.max(1, Math.round(e.bill)), ins = insured(b) && e.cover !== false, own = ins ? Math.max(1, Math.round(bill * EXCESS)) : bill;
      s.cash -= own;
      L.rep.extra.push({ uid: b.uid, amount: -own, paid: true, icon: e.icon || '🔧', text: r.name + ': ' + e.what + (ins ? ' (insurance paid ' + cash$(bill - own) + ')' : '') });
      L.hit[b.uid] = { inc: x.id, bill: bill, own: own, closed: e.k === 0 ? 1 : 0, icon: e.icon || '🔧' };
      if (ins) { s.stats.claims += bill - own; learn(s, 'excess'); }
    } else if (e.k === 0) L.hit[b.uid] = { inc: x.id, bill: 0, own: 0, closed: 1, icon: x.emoji };
  }
  function worksOn(s, b, h, list) {   // roadworks next to a business: fewer customers all day
    const lot = lotOfBiz(s, b);
    (list || s.works).forEach((w) => { if (tilesNear(lot, w.tiles) <= 2) s.live.seg[b.uid].push({ a: h, b: HOURS, k: 0.65, w: 'roadworks', n: 'roadworks outside' }); });
  }
  function startIncident(s, x) {
    const L = s.live;
    x.on = 1; x.nhit = 0; L.fresh.push(L.inc.indexOf(x)); s.stats.incidents++;
    if (x.id === 'roadworks') {
      const w = { tiles: x.tiles, left: x.months, where: x.where };
      s.works.push(w);
      s.biz.forEach((b) => worksOn(s, b, L.h, [w]));
    } else s.biz.forEach((b) => hitBiz(s, x, b, true));
    L.rep.inc.push({ id: x.id, emoji: x.emoji, title: x.title, text: x.text });
  }
  // how a business is doing at this hour: trade (1 = a normal day) and why
  TY.todayOf = function (s, b) {
    const L = s.live; if (!L || !L.seg[b.uid]) return { k: 1, notes: [], hit: null };
    let k = 1; const notes = [];
    L.seg[b.uid].forEach((g) => { if (g.a <= L.h && L.h < g.b) { k *= g.k; if (g.n && !notes.includes(g.n)) notes.push(g.n); } });
    return { k: Math.round(k * 100) / 100, notes: notes, hit: L.hit[b.uid] || null };
  };

  /* ---------- rivals: a business like yours opens close by ---------- */
  const shieldOf = (s, x, b) => Math.min(0.85, x.shield + (b.flags.includes('loyal') ? 0.25 : 0) + 0.04 * Math.max(0, b.rep));
  TY.rivalCut = function (s, b) {   // the share of customers rivals take from a business (0..1)
    let f = 1; s.rivals.forEach((x) => { if (x.uid === b.uid) f *= 1 - x.cut * (1 - shieldOf(s, x, b)); });
    return 1 - f;
  };
  // how many lots apart two lots are (big lots count as one)
  const lotDist = (s, d, i, j) => { const L = cityOf(s).lots[d], a = L[i], o = L[j]; return Math.ceil(Math.max(Math.abs(a.c - o.c), Math.abs(a.r - o.r)) / a.w); };
  function rivalTemplate(b) {
    const r = BIZ[b.id], want = r.kind === 'property' ? 'property' : r.tier >= 3 ? 'big' : r.industry === 'food' ? 'food' : ['services', 'education', 'fitness'].includes(r.industry) ? 'service' : 'shop';
    let i = RIVALS.cases.findIndex((c) => c.for === want); if (i < 0) i = RIVALS.cases.length ? 0 : -1;
    return i;
  }
  function rivalsMove(s, rep) {
    // a rival that keeps losing customers to a strong business closes
    s.rivals.slice().forEach((x) => {
      const b = s.biz.find((y) => y.uid === x.uid); if (!b) return;
      if (s.month - x.since >= 3 && rand(s) < 0.03 + 0.15 * shieldOf(s, x, b)) {
        s.rivals = s.rivals.filter((y) => y !== x); s.inbox = s.inbox.filter((y) => y.rid !== x.id);
        s.stats.rivalsBeaten++; rep.rivalsGone.push({ name: x.name, biz: BIZ[b.id].name, d: x.d, i: x.i });
      }
    });
    // and now and then a new one opens next to one of yours
    if (s.month < 6 || !s.biz.length || !RIVALS.cases.length) return;
    if (s.rivals.length >= 1 + Math.floor(s.biz.length / 4) || rand(s) >= Math.min(0.11, 0.03 + 0.01 * s.biz.length)) return;
    const pool = s.biz.filter((b) => s.month - b.bought >= 4 && !s.rivals.some((x) => x.uid === b.uid));
    if (!pool.length) return;
    const b = pickR(s, pool), [d, si] = b.plot.split(':'), i0 = +si;
    let cands = TY.forSale(s, d).filter((j) => lotDist(s, d, i0, j) <= 3 && !reserved(s, d, j));
    if (!cands.length) cands = s.lot[d].map((x, j) => j).filter((j) => s.lot[d][j] > 0 && !s.bld[key(d, j)] && lotDist(s, d, i0, j) <= 3);
    if (!cands.length) return;
    cands.sort((a, c) => lotDist(s, d, i0, a) - lotDist(s, d, i0, c));
    const j = cands[Math.floor(rand(s) * Math.min(3, cands.length))], dd = lotDist(s, d, i0, j);
    s.lot[d][j] = 0; delete s.bld[key(d, j)];
    const names = RIVALS.names[b.id] || ['The Shop Next Door'], used = s.rivalNames[b.id] || 0;
    s.rivalNames[b.id] = used + 1;
    const x = { id: s.nextRival++, uid: b.uid, bid: b.id, name: names[used % names.length], d: d, i: j, since: s.month,
      cut: dd <= 1 ? 0.25 : dd <= 2 ? 0.2 : 0.15, shield: 0, where: dd <= 1 ? 'right next door' : dd <= 2 ? 'just across the street' : 'a few doors away' };
    s.rivals.push(x); rep.rivalsNew.push({ name: x.name, biz: BIZ[b.id].name, d: d, i: j });
    learn(s, 'competition');
    const tpl = rivalTemplate(b);
    if (tpl >= 0) s.inbox.push({ key: 'v' + x.id, kind: 'rival', rid: x.id, uid: b.uid, tpl: tpl, arrived: s.month, due: s.month + 3 });
  }

  /* ---------- the city grows: others buy lots and build ---------- */
  function cityGrows(s, rep) {
    for (const k in s.bld) { if (--s.bld[k] <= 0) { delete s.bld[k]; const [d, i] = k.split(':'); rep.city.push({ d: d, i: +i, what: 'built' }); } }
    const C = cityOf(s);
    DISTRICTS.forEach((dd) => {
      const d = dd.id, n0 = s.lot[d].length, open = TY.unlocked(s, d), free = TY.forSale(s, d).filter((i) => !reserved(s, d, i));
      const floor = open ? Math.min(5, Math.ceil(n0 * 0.25)) : Math.min(9, Math.ceil(n0 * 0.5)), rate = (open ? 1 : 0.45) * BUILD_RATE[d];
      let n = 0;
      if (free.length > floor && rand(s) < rate) n++;
      if (free.length - n > floor && rand(s) < rate - 0.55) n++;
      for (let k = 0; k < n; k++) {
        const left = TY.forSale(s, d).filter((i) => !reserved(s, d, i));
        if (!left.length) break;
        // builders like busy spots: a lot next to other buildings
        const w = left.map((i) => 1 + (C.nbrs[d][i] || []).filter((j) => occupied(s, d, j)).length);
        let t = rand(s) * w.reduce((a, b) => a + b, 0), pick = left[0];
        for (let q = 0; q < left.length; q++) { t -= w[q]; if (t <= 0) { pick = left[q]; break; } }
        s.lot[d][pick] = newLook(s); s.bld[key(d, pick)] = 2;
        rep.city.push({ d: d, i: pick, what: 'sold' });
      }
      // a shop closes or a family moves away: a lot comes up for sale again
      if (free.length < 12 && rand(s) < (!open ? 0.05 : free.length < 4 ? 0.35 : 0.12)) {
        const occ = s.lot[d].map((x, i) => i).filter((i) => s.lot[d][i] > 0 && !s.bld[key(d, i)]);
        if (occ.length) { const i = pickR(s, occ); s.lot[d][i] = 0; rep.city.push({ d: d, i: i, what: 'forsale' }); }
      }
    });
    if (rep.city.some((x) => x.what === 'sold')) learn(s, 'demand');
  }

  /* ---------- the living month ---------- */
  TY.preview = function (s, b) {   // expected profit this month, without luck (for the cards)
    const r = BIZ[b.id], season = r.season ? SEASON[r.season][TY.calMonth(s)] : 1;
    let m = b.mult * (1 + 0.04 * b.rep) * season * eventMult(s, b) * (b.loc || 1) * (1 - TY.rivalCut(s, b));
    b.temps.forEach((t) => { m *= t.m; });
    if (r.kind === 'property') m *= Math.min(1.5, 1 + 0.003 * (s.month - b.bought));
    return Math.round(midOf(r) * m);
  };
  TY.rentFor = function (s, b) {
    const [d, i] = b.plot.split(':');
    return s.land[b.plot] ? 0 : TY.rentOf(s, d, +i);
  };
  // this month's result for one business (luck included) before rent, and its rent
  function monthAmount(s, b, L) {
    const r = BIZ[b.id], exp = TY.preview(s, b);
    const spread = spreadOf(r) * Math.max(0.3, b.mult) * (SPREAD[b.band] / SPREAD[r.risk]) * (b.loc || 1);
    let profit = Math.round(exp + spread * tri(s)), note = '';
    if (rand(s) < SHOCK[b.band]) {
      const ins = insured(b), loss = Math.round(midOf(r) * Math.max(0.3, b.mult) * between(s, 0.6, 1.4) * (ins ? 0.5 : 1));
      profit -= loss; note = shockNote(r.industry) + (ins ? ' (insurance paid half)' : '');
      if (ins) s.stats.claims += loss;
    }
    if (L && note) L.note[b.uid] = note;
    return { profit: profit, rent: TY.rentFor(s, b) };
  }
  // a business starts its day (at dawn, or when it opens): this month's amount, and whatever is already going on
  function startEarning(s, b, h) {
    const L = s.live, m = monthAmount(s, b, L);
    L.pr[b.uid] = m.profit; L.rent[b.uid] = m.rent; L.fh[b.uid] = h; L.got[b.uid] = 0; L.seg[b.uid] = [];
    worksOn(s, b, h);
    L.inc.forEach((x) => { if (x.on && x.end > h) hitBiz(s, x, b, false); });
  }
  // the share of a day's trade between hours a and b, with each stretch weighted by how busy the business was
  // (seg: the stretches an incident changed)
  function rateInt(seg, a, b, on) {
    if (!seg || !seg.length || !on) return dayPart(b) - dayPart(a);
    const pts = [a, b];
    seg.forEach((g) => { if (g.a > a && g.a < b) pts.push(g.a); if (g.b > a && g.b < b) pts.push(g.b); });
    pts.sort((x, y) => x - y);
    let t = 0;
    for (let j = 0; j + 1 < pts.length; j++) {
      const x = pts[j], y = pts[j + 1]; if (y <= x) continue;
      const mid = (x + y) / 2; let k = 1;
      seg.forEach((g) => { if (g.a <= mid && mid < g.b) k *= g.k; });
      t += k * (dayPart(y) - dayPart(x));
    }
    return t;
  }
  // what a business has earned today by hour h (a month that loses money is not made better by a closed street)
  function earned(L, uid, h) {
    const fh = L.fh[uid] || 0, pr = L.pr[uid], rent = L.rent[uid] || 0;
    if (h <= fh) return 0;
    return Math.round(pr * rateInt(L.seg[uid], fh, h, pr >= 0) - rent * (dayPart(h) - dayPart(fh)));
  }
  function pay(s, h) {
    const L = s.live;
    for (const uid in L.pr) { const want = earned(L, uid, h); if (want !== L.got[uid]) { s.cash += want - L.got[uid]; L.got[uid] = want; } }
  }
  function beginMonth(s) {
    const rep = { month: TY.dateText(s), m: s.month, lines: [], extra: [], events: [], inc: [], arrived: [], expired: [], goals: [], city: [], rivalsNew: [], rivalsGone: [],
      rent: 0, tax: 0, interest: 0, penalties: 0, premiums: 0, policies: 0, before: TY.netWorth(s), cashBefore: s.cash };
    rollEvents(s, rep);
    const L = { h: 0, pr: {}, rent: {}, fh: {}, got: {}, seg: {}, note: {}, hit: {}, gone: [], inc: [], fresh: [], rep: rep };
    s.live = L;
    for (const b of s.biz) {
      b.slow.forEach((x) => { b.mult *= 1 + x.m / 3; x.left--; }); b.slow = b.slow.filter((x) => x.left > 0);
      startEarning(s, b, 0);
      b.temps.forEach((t) => { t.left--; }); b.temps = b.temps.filter((t) => t.left > 0);
    }
    // insurance: this month's premiums, paid at dawn
    s.biz.forEach((b) => { if (b.ins) { const p = TY.premium(s, b); s.cash -= p; rep.premiums += p; rep.policies++; } });
    planIncidents(s);
  }
  TY.beginMonth = beginMonth;
  // move the clock on by some hours: each business is paid its share; an incident starts when the clock passes its
  // hour; at 21:00 the month closes (the report comes back)
  TY.advance = function (s, dh) {
    if (!s.live) beginMonth(s);
    const L = s.live, h1 = Math.min(HOURS, L.h + Math.max(0, dh || 0));
    for (;;) {
      let nx = null;
      L.inc.forEach((x) => { if (!x.on && x.h <= h1 && (!nx || x.h < nx.h)) nx = x; });
      if (!nx) break;
      const hs = Math.max(L.h, nx.h); pay(s, hs); L.h = hs; startIncident(s, nx);
    }
    pay(s, h1); L.h = h1;
    L.inc.forEach((x) => { if (x.on && !x.done && h1 >= x.end) x.done = 1; });
    return h1 >= HOURS ? closeMonth(s) : null;
  };
  TY.next = (s) => TY.advance(s, HOURS);
  function closeMonth(s) {
    const L = s.live, rep = L.rep;
    // fines and losses from traps this month
    s.pending.forEach((x) => { rep.extra.push({ uid: x.uid, amount: -x.amount, text: x.text }); rep.penalties += x.amount; });
    s.pending = [];
    let operating = 0;
    for (const b of s.biz) {
      const r = BIZ[b.id], uid = b.uid, got = L.got[uid] || 0, fh = L.fh[uid] || 0, pr = L.pr[uid];
      const full = pr !== undefined ? Math.round(pr * rateInt(L.seg[uid], 0, HOURS, pr >= 0) - (L.rent[uid] || 0)) : got;   // a whole month's result
      b.hist.push(full); if (b.hist.length > 12) b.hist.shift();
      operating += got; rep.rent += Math.round((L.rent[uid] || 0) * (1 - dayPart(fh)));
      const notes = [L.note[uid], fh > 0 ? 'opened today' : ''].concat((L.seg[uid] || []).map((g) => g.n));
      rep.lines.push({ uid: uid, id: b.id, name: r.name, emoji: r.emoji, profit: got, rent: L.rent[uid] || 0, note: [...new Set(notes.filter(Boolean))].join(' · ') });
    }
    L.gone.forEach((x) => { operating += x.got; rep.lines.push({ uid: x.uid, id: x.id, name: BIZ[x.id].name, emoji: BIZ[x.id].emoji, profit: x.got, rent: 0, note: 'sold today' }); });
    // repairs were paid when they happened; fines are paid now
    let extra = 0, paid = 0; rep.extra.forEach((x) => { extra += x.amount; if (x.paid) paid += x.amount; });
    operating += extra - rep.premiums;
    rep.tax = operating > 0 ? Math.round(operating * TAX) : 0;
    rep.interest = Math.round(s.loan * TY.loanRate(s)) + (s.cash < 0 ? Math.round(-s.cash * OVERDRAFT) : 0);
    s.cash += extra - paid - rep.tax - rep.interest;   // the businesses' money already came in, hour by hour
    rep.profit = operating; rep.net = operating - rep.tax - rep.interest;
    if (operating > 0) s.stats.profit += operating;
    if (s.biz.length) { learn(s, 'profit'); if (rep.tax) learn(s, 'tax'); }
    if (s.loan) learn(s, 'interest');
    // roadworks finish
    s.works.forEach((w) => { if (--w.left <= 0) rep.events.push({ id: 'worksdone', title: 'Roadworks finished', text: 'The street in ' + w.where + ' is open again.' }); });
    s.works = s.works.filter((w) => w.left > 0);
    // cases left too long: the problem does not go away
    s.inbox.filter((x) => x.due <= s.month).forEach((x) => {
      if (x.kind === 'case' || x.kind === 'rival') {
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
    cityGrows(s, rep);
    rivalsMove(s, rep);
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
    DISTRICTS.forEach((d) => { if (d.tier === s.tier + 1 && nw >= d.unlock) { s.tier = d.tier; rep.unlocked = TY.dname(s, d.id); rep.unlockedId = d.id; } });
    s.stats.peak = Math.max(s.stats.peak, nw);
    rep.after = nw; rep.cash = s.cash;
    s.history.push({ m: s.month, nw: nw, cash: Math.round(s.cash) }); if (s.history.length > 60) s.history.shift();
    rep.goals = checkGoals(s);
    s.report = rep;
    beginMonth(s);
    return rep;
  }
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
  // {district} in a goal's text becomes that district's name in the game's city
  const GOALS = [
    { id: 'first', text: 'Open your first business', test: (s) => s.stats.bought >= 1, reward: 0.05, min: 50 },
    { id: 'case1', text: 'Solve your first business case', test: (s) => s.stats.cases >= 1, reward: 0.05, min: 30 },
    { id: 'two', text: 'Run 2 businesses at once', test: (s) => s.biz.length >= 2, reward: 0.05, min: 60 },
    { id: 'stars10', text: 'Earn 10 CEO stars', test: (s) => s.stats.stars >= 10, reward: 0.05, min: 80 },
    { id: 'profit1k', text: 'Make $1,000 of profit in total', test: (s) => s.stats.profit >= 1000, reward: 0.05, min: 100 },
    { id: 'trap1', text: 'Avoid a trap in a case or an offer', test: (s) => s.stats.traps >= 1, reward: 0.05, min: 100 },
    { id: 'land', text: 'Buy a piece of land', test: (s) => s.stats.landBought >= 1, reward: 0.05, min: 100 },
    { id: 'insure1', text: 'Insure a business', test: (s) => s.stats.insured >= 1, reward: 0.05, min: 60 },
    { id: 'three', text: 'Own businesses in 3 different industries', test: (s) => industries(s) >= 3, reward: 0.05, min: 150 },
    { id: 'high', text: 'Unlock {high} (net worth $4,000)', test: (s) => s.tier >= 2, reward: 0.05, min: 300 },
    { id: 'shop', text: 'Open a business on {high}', test: (s) => s.biz.some((b) => BIZ[b.id].tier >= 2), reward: 0.05, min: 300 },
    { id: 'spot5', text: 'Open a business on a 5-star spot', test: (s) => s.biz.some((b) => TY.locStars(b.loc || 1) >= 5), reward: 0.05, min: 200 },
    { id: 'quality5', text: 'Get a business to 5 stars of quality', test: (s) => s.biz.some((b) => TY.quality(b) >= 5), reward: 0.05, min: 300 },
    { id: 'loan', text: 'Borrow from the bank and pay it all back', test: (s) => s.stats.loanPaid >= 1, reward: 0.05, min: 300 },
    { id: 'rival1', text: 'Outlast a rival until it closes', test: (s) => s.stats.rivalsBeaten >= 1, reward: 0.05, min: 300 },
    { id: 'stars50', text: 'Earn 50 CEO stars', test: (s) => s.stats.stars >= 50, reward: 0.05, min: 300 },
    { id: 'nw25k', text: 'Reach a net worth of $25,000', test: (s) => TY.netWorth(s) >= 25000, reward: 0.06, min: 300 },
    { id: 'property', text: 'Own a property that earns rent', test: (s) => s.biz.some((b) => BIZ[b.id].kind === 'property'), reward: 0.06, min: 300 },
    { id: 'sellup', text: 'Sell a business for more than you paid', test: (s) => s.stats.soldUp >= 1, reward: 0.06, min: 300 },
    { id: 'five', text: 'Run 5 businesses at once', test: (s) => s.biz.length >= 5, reward: 0.06, min: 300 },
    { id: 'down', text: 'Unlock {downtown} (net worth $100,000)', test: (s) => s.tier >= 3, reward: 0.08, min: 300 },
    { id: 'traps5', text: 'Avoid 5 traps', test: (s) => s.stats.traps >= 5, reward: 0.08, min: 300 },
    { id: 'ind5', text: 'Own businesses in 5 different industries', test: (s) => industries(s) >= 5, reward: 0.08, min: 300 },
    { id: 'nw500k', text: 'Reach a net worth of $500,000', test: (s) => TY.netWorth(s) >= 500000, reward: 0.08, min: 300 },
    { id: 'cases40', text: 'Solve 40 business cases', test: (s) => s.stats.cases >= 40, reward: 0.08, min: 300 },
    { id: 'sky', text: 'Unlock {skyline} (net worth $2 million)', test: (s) => s.tier >= 4, reward: 0.1, min: 300 },
    { id: 'tiers', text: 'Own businesses in 4 different districts at once', test: (s) => tiersHeld(s) >= 4, reward: 0.1, min: 300 },
    { id: 'ten', text: 'Run 10 businesses at once', test: (s) => s.biz.length >= 10, reward: 0.1, min: 300 },
    { id: 'traps15', text: 'Avoid 15 traps', test: (s) => s.stats.traps >= 15, reward: 0.1, min: 300 },
    { id: 'nw10m', text: 'Reach a net worth of $10 million', test: (s) => TY.netWorth(s) >= 10000000, reward: 0.1, min: 300 },
    { id: 'skyscraper', text: 'Build a skyscraper', test: (s) => s.biz.some((b) => b.id === 'skyscraper'), reward: 0.1, min: 300 },
    { id: 'space', text: 'Launch Space Tourism', test: (s) => s.biz.some((b) => b.id === 'space'), reward: 0.1, min: 300 },
    { id: 'gate', text: 'Unlock {gateway} (net worth $25 million)', test: (s) => s.tier >= 5, reward: 0.06, min: 300 },
    { id: 'mega', text: 'Open a mega business in {gateway}', test: (s) => s.biz.some((b) => BIZ[b.id].tier >= 5), reward: 0.06, min: 300 },
    { id: 'tycoon', text: 'Become Tycoon of the Year: net worth $100 million', test: (s) => TY.netWorth(s) >= 100000000, reward: 0.05, min: 0 },
    { id: 'all5', text: 'Own a business in all 5 districts at once', test: (s) => tiersHeld(s) >= 5, reward: 0.04, min: 300 },
    { id: 'nw250m', text: 'Reach a net worth of $250 million', test: (s) => TY.netWorth(s) >= 250000000, reward: 0.03, min: 0 },
    { id: 'billion', text: 'Become a billionaire: net worth $1 billion', test: (s) => TY.netWorth(s) >= 1000000000, reward: 0, min: 0 }
  ];
  TY.GOALS = GOALS;
  TY.goalText = (s, g) => g.text.replace(/\{(\w+)\}/g, (m, d) => TY.dname(s, d));
  function checkGoals(s) {
    const done = [];
    GOALS.forEach((g) => {
      if (!s.goals[g.id] && g.test(s)) {
        const reward = g.reward ? Math.round(Math.max(g.min, g.reward * Math.max(0, TY.netWorth(s)))) : 0;   // a share of what the company is worth
        s.goals[g.id] = s.month + 1; s.cash += reward; done.push({ id: g.id, text: TY.goalText(s, g), reward: reward });
      }
    });
    if (done.length) learn(s, 'goals');
    return done;
  }
  TY.checkGoals = checkGoals;
  TY.nextGoals = (s, n) => GOALS.filter((g) => !s.goals[g.id]).slice(0, n || 3).map((g) => Object.assign({}, g, { text: TY.goalText(s, g) }));

  /* ---------- CEO titles and skills ---------- */
  const TITLES = [[0, 'Trainee', '🌱'], [15, 'Shop Manager', '🧑‍💼'], [45, 'Area Manager', '📋'], [90, 'Director', '🎯'], [160, 'CEO', '👔'], [260, 'Tycoon', '👑']];
  TY.title = (s) => { let t = TITLES[0]; TITLES.forEach((x) => { if (s.stats.stars >= x[0]) t = x; }); return { name: t[1], icon: t[2], next: (TITLES.find((x) => x[0] > s.stats.stars) || [null])[0] }; };
  TY.SKILLS = { pricing: 'Pricing', marketing: 'Marketing', people: 'People', money: 'Money sense', operations: 'Running things', safety: 'Street smarts', ethics: 'Honesty', strategy: 'Strategy' };

  /* ---------- saving: one plain object; check what comes back ---------- */
  TY.serialize = (s) => JSON.stringify(s);
  // a game from the first version (16 plots per district) moves onto Seaside Bay: its businesses and land keep
  // their plot numbers, the rest of the city fills in around them
  function fromV1(s) {
    s.map = 'bay'; s.lot = {}; s.land = {}; s.bld = {}; s.rivals = []; s.works = [];
    fillCity(s);
    DISTRICTS.forEach((d) => {
      ((s.plots && s.plots[d.id]) || []).forEach((p, i) => { if (i < s.lot[d.id].length && (p.uid || p.land)) { s.lot[d.id][i] = 0; if (p.land) s.land[d.id + ':' + i] = 1; } });
    });
    delete s.plots; s.rivals = []; s.nextRival = 1; s.rivalNames = {}; s.live = null; s.v = 3;
    s.biz.forEach((b) => { const [d, i] = b.plot.split(':'); b.loc = TY.locOf(s, b.id, d, +i).mult; });
  }
  // a game from the second version: the same Seaside Bay (its lots did not move), now with the Gateway; a day in
  // progress carries on
  function fromV2(s) {
    s.map = 'bay'; s.works = [];
    s.lot.gateway = cityOf(s).lots.gateway.map(() => (rand(s) < OCCUPIED.gateway ? newLook(s) : 0));
    s.boom.gateway = 1;
    keepReserves(s);
    const L = s.live;
    if (L && L.amt && L.rep) {
      L.pr = {}; L.fh = {}; L.seg = {}; L.hit = {}; L.inc = []; L.fresh = [];
      for (const uid in L.amt) { L.pr[uid] = L.amt[uid] + (L.rent[uid] || 0); L.fh[uid] = hourOfPart((L.from || {})[uid] || 0); L.seg[uid] = []; }
      delete L.amt; delete L.from;
      L.rep.inc = []; L.rep.premiums = 0; L.rep.policies = 0;
    } else s.live = null;
    s.v = 3;
  }
  TY.restore = function (text) {
    let s; try { s = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { return null; }
    if (!s || ![1, 2, 3].includes(s.v) || typeof s.cash !== 'number' || !Array.isArray(s.biz) || !(s.plots || s.lot)) return null;
    s.biz = s.biz.filter((b) => BIZ[b.id]);
    if (s.v === 1) fromV1(s); else if (s.v === 2) fromV2(s);
    s.map = cityOf(s).id;
    const C = cityOf(s);
    DISTRICTS.forEach((d) => {
      if (!Array.isArray(s.lot[d.id])) s.lot[d.id] = C.lots[d.id].map(() => 0);
      while (s.lot[d.id].length < C.lots[d.id].length) s.lot[d.id].push(0);
      if (!s.boom[d.id]) s.boom[d.id] = 1;
    });
    // fields a later version added get their starting values, so old saves keep working
    const fresh = TY.newGame(s.name, s.seed || 1, s.map);
    for (const k in fresh) if (s[k] === undefined) s[k] = fresh[k];
    for (const k in fresh.stats) if (s.stats[k] === undefined) s.stats[k] = fresh.stats[k];
    s.stats.skills = s.stats.skills || {};
    s.biz.forEach((b) => { if (b.ins === undefined) b.ins = 0; });
    if (!s.live || !s.live.rep || !s.live.pr) beginMonth(s);
    return s;
  };
})(typeof window !== 'undefined' ? window : globalThis);
