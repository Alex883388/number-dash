# Tycoon Town content format

Tycoon Town is a business and city-building game for a child aged 8–12 (British English). He starts with
$500 on the market street of the city he picks, opens small businesses, earns monthly profits, buys land, unlocks bigger
districts up to the Gateway (an airport and a port) and grows a company towards $100 million and a billion. The point is to learn to think like a CEO with street smarts: money,
customers, people, risk, honesty and spotting traps. Each business he buys brings **business cases**: short
real problems where he chooses what to do. Good choices raise the business's monthly profit, make it safer or
build its reputation; poor choices or traps cost money. Several answers can work (that is the lesson: there is
more than one way to solve a problem), but one is the best.

The numbers (price, profit, risk) live in `roster.json` and are not yours to change. You write the words and
the cases in `biz-1.json` … `biz-5.json` (one file per district tier), checked by
`node games/tycoon/tools/check-content.js` (must say 0 errors; warnings explain what looks inconsistent).

## A business: profile

```json
{ "id": "lemonade",
  "pitch": "Fresh lemonade sold from a stall on a sunny street corner.",
  "earns": "Every cup sells for more than the lemons, sugar and cup cost.",
  "costs": "Lemons, sugar, cups, and the pitch fee for the stall.",
  "risks": "Rainy days, a stall next door selling cheaper drinks, sour lemons.",
  "tip": "Sell where thirsty people walk past: parks, sports fields, bus stops.",
  "cases": [ case, case, case ] }
```

| field | what | length |
| --- | --- | --- |
| `id` | the roster id | |
| `pitch` | what the business is, one sentence a child understands | ≤ 90 characters |
| `earns` | how it makes money | ≤ 140 |
| `costs` | its biggest costs | ≤ 140 |
| `risks` | what can go wrong | ≤ 150 |
| `tip` | one CEO tip for this kind of business | ≤ 140 |
| `cases` | exactly 3 cases (below) | |

## A case

```json
{ "id": "lemonade-1",
  "title": "Opening day",
  "story": "Your stall is ready. A cup costs you 30 cents to make. The café down the road sells lemonade for $3. What price will you charge?",
  "options": [ option, option, option, option ] }
```

- `id`: `<business id>-1`, `-2`, `-3`.
- `title`: ≤ 40 characters. `story`: 1–4 short sentences, ≤ 300 characters, the problem with any numbers the
  child needs (use $ for money, e.g. "$2 a cup"; use words or simple figures).
- Case 1 is the **opening case**: it appears the moment he opens the business (setting up: price, location,
  first supplier, first hire, how to get the first customers…). Cases 2 and 3 come later: one a **problem**
  (a competitor, a complaint, a breakdown, a slow season, a staff issue, a bad review…) and one an
  **opportunity or tricky offer** (a big order, expanding, a partner, a new product, an investor, a deal…).
- **At least one of the three cases has a `trap` option** (see grades) so every business teaches street smarts.
- 4 or 5 options per case. On Market Street (tier 1) he picks 1 option; from High Street (tier 2) up he may
  pick **up to 2**, so write options that can sensibly go together (two good ideas combined can be as good
  as the best one) and avoid two options that contradict each other badly.

## An option

```json
{ "text": "Charge $2: cheaper than the café, still a good profit per cup",
  "spend": "none", "rev": 2, "costs": 0, "risk": 0, "rep": 1, "timing": "now",
  "grade": "best", "skill": "pricing",
  "result": "People love the fair price. You sell 60 cups on the first hot day.",
  "lesson": "A fair price that still covers your costs beats the cheapest price." }
```

| field | values | meaning in the game |
| --- | --- | --- |
| `text` | ≤ 80 characters | the action, written as a choice a child could make |
| `spend` | `none` / `low` / `mid` / `high` | money paid now: 0, 5 %, 15 % or 30 % of the business's price |
| `rev` | −3 … +3 | sales / income change. Each +1 ≈ +7 % monthly profit for good (with `short`: +20 % for 3 months only) |
| `costs` | −3 … +3 | running costs change. −1 = cheaper to run (≈ +5 % profit), +1 = dearer |
| `risk` | −1, 0, +1 | −1 = the business becomes steadier (smaller ups and downs), +1 = more of a gamble |
| `rep` | −3 … +3 | reputation: customers' trust. Each point ≈ ±4 % demand, and it changes what the business is worth |
| `timing` | `now` / `slow` / `short` | `now` works from next month; `slow` builds up over 3 months (training, a brand, trees growing); `short` is a quick boost that fades after 3 months |
| `flag` | optional: `insured`, `online`, `eco`, `loyal` | a lasting feature the city's events check: insured halves storm and disaster losses, online does well in online-shopping booms, eco in green-city campaigns, loyal (regular customers) halves recession drops |
| `penalty` | optional: `low` / `mid` / `high` | a loss that hits next month (a fine, stolen money, a refund, a lawsuit): 10 %, 30 % or 60 % of the price. Use it for traps |
| `grade` | `best` / `good` / `ok` / `poor` / `trap` | exactly one `best`; at least one `good`; at least one `poor` or `trap` per case |
| `skill` | `pricing`, `marketing`, `people`, `money`, `operations`, `safety`, `ethics`, `strategy` | the CEO skill it trains (a `trap` must be `safety` or `ethics`) |
| `result` | ≤ 180 characters | what happened, told like a short story, kind and clear |
| `lesson` | ≤ 110 characters | the CEO lesson in one sentence |

The grade is hidden until he decides. Afterwards he sees his result, his stars (best 3, good 2, ok 1,
poor or trap 0; two good choices together also earn 3) and what every other option would have done.

**Grades must match the numbers.** The checker scores each option:
`score = rev (now/slow) + 0.5·rev (short) − 0.8·costs − 0.7·risk + 0.6·rep − spend (low 0.3, mid 0.9, high 1.8) − penalty (low 1.2, mid 2.4, high 4)`
and warns when the `best` is not the highest score, a `good` scores below a `poor`, or a `trap` scores above 0.
A `trap` is something that looks tempting but is a scam, unsafe, dishonest or illegal: it should look attractive in
`text` (that is the street-smart test) and show its harm in `penalty`, `rep` and `result`. Do not make the best
answer always the most expensive or always the cautious "do nothing": real CEOs invest when it pays.

## What good content looks like

- **Real business thinking at a child's level**: price vs cost, bulk buying, a loyalty card, asking customers what
  they want, training staff, fair pay, keeping stock fresh, location, seasons, negotiating, partnerships, a
  second product, saving for a rainy month, insurance, reading a contract before signing, checking reviews.
- **Street smarts**: fake suppliers, "too good to be true" deals, invoices with changed bank details, cash with no
  receipt, counterfeit goods, buying fake reviews, sharing passwords, cutting safety corners, pressure to sign
  now, get-rich-quick schemes. The trap should be the kind of thing a real person falls for.
- **Flexible answers**: two or three options are reasonable; the best one is the smartest overall (profit, safety,
  customers and honesty together). Explain in `lesson` why, without lecturing.
- **Kind and age-appropriate**: no violence, no scary crime details, no romance, no alcohol, no gambling as a
  good idea. Characters have everyday names from many backgrounds.
- **Tiers**: Market Street (tier 1) uses very simple words and small sums; High Street adds staff and shops;
  Downtown adds teams, contracts and bigger deals; Skyline adds big companies, cities and investors; the Gateway
  (tier 5) adds national projects, governments, safety rules and huge loans — still in words a 12-year-old
  follows (explain any hard word in the story). The cities differ (a desert, a neon strip, a Japanese city), so
  a story should not name one city's sights: a business can open in any of them.
- British English spelling (colour, centre, organise, neighbour, favourite, programme for TV, cheque).
- Money in the stories should roughly match the roster (a lemonade stand earns tens of dollars a month; a skyscraper
  earns hundreds of thousands).

## Offers (offers.json)

Street-smart offers arrive from strangers, emails, suppliers, banks or investors, not tied to one business.

```json
{ "offers": [
  { "id": "offer-invoice", "title": "New bank details?", "from": "an email from your supplier", "minTier": 1,
    "story": "An email that looks like it is from your lemon supplier says: we changed banks, please send this month's $300 to the new account today.",
    "options": [
      { "text": "Pay the new account straight away", "grade": "trap", "skill": "safety", "money": "lose-mid",
        "result": "It was a scammer copying your supplier's email. The money is gone.", "lesson": "Check changed bank details by phoning the number you already know." },
      { "text": "Phone the supplier on their usual number to check", "grade": "best", "skill": "safety", "money": "none",
        "result": "The supplier never sent it! You saved your money and warned them.", "lesson": "Verify through a channel you already trust." } ] } ] }
```

- 4 options, exactly one `best`, at least one `trap`.
- `money`: `none`, `gain-low|mid|high` (+2 %, +5 %, +12 % of his net worth), `lose-low|mid|high` (−2 %, −6 %, −15 %).
- Optional `boost`: `{ "industry": "food", "rev": 1, "months": 6 }` — a lasting effect on his businesses of that
  industry (industries: food, retail, services, education, fitness, property, tech, transport, logistics,
  agriculture, entertainment, manufacturing, hospitality, energy, sports; or `all`).
- Not every offer is a scam: some are real opportunities where the best answer is to accept after checking
  (so the lesson is "check, then decide", not "always say no").

## Where a business does well (roster.json: likes, needs)

The city is one big map, and the same business sells more in a good spot. Each roster business has `likes`:
what near its lot brings it customers, as a share of sales per thing (−0.3 to 0.4; negative = it does worse
there). The things a lot can be near: `park`, `water`, `beach`, `school`, `station`, `hospital`, `church`,
`tourism` (squares, the museum, the waterfront, the marina), `airport`, `harbour`, `industry` (docks, the
runway), `avenue` (a lot on a busy avenue), `homes`, `offices`, `quiet` (no avenue, docks or station close by).
`needs` names a thing its lot must have (the container port, the cruise terminal and the shipyard need the
harbour, the international airport the airfield). Keep the likes true to life and
different from business to business: the point is that a child learns to look for the right spot.

## Rivals (rivals.json)

A business like one of the child's can open next door and take some of its customers. `names` gives every
roster business two rival names (≤ 18 characters, friendly and made up: no real brands). `cases` holds one case
for each kind of business (`for`: `food`, `shop`, `service`, `property`, `big` = Downtown and Skyline
businesses), written like a business case (4–5 options, exactly one `best`, at least one `good` and one `trap`)
with one extra field per option: `shield` (0 to 0.6), how much of the rival's pull the choice blocks (the best
answer shields most; a trap shields nothing). In the words, `{rival}` is the rival's name, `{biz}` the child's
business in lower case and `{where}` where the rival opened ("right next door", "just across the street", "a few
doors away"); the checker measures the lengths with the longest names filled in.
