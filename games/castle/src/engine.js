/* games/castle/src/engine.js — Castle Crew's world and rules, shared by the page (the host runs it) and the balance
   simulator (Node can require it). No page, no three.js, no timers.
   A game is one map (content/maps.json: roads from zombie gates at the edge to the castle in the middle, water and
   woods) played round after round like a tower defence: rounds 1 to 100 come from content/rounds.json and after
   round 100 freeplay rounds are made up here, harder and harder. Zombies walk their road to the castle; each one
   that gets in costs the castle lives (hearts). The crew (1 to 4 players, each on their own device) earns coins from
   zombies, rounds and gold mines, and wood and stone from the trees and rocks it walks into (they grow back), and
   spends them on 22 kinds of tower, each with two upgrade paths of three steps (one path may go to step 3, the other
   then stops at step 1). Coins are each player's own; wood and stone are the crew's. Every attack has an element
   (fire, ice, lightning...) that some zombies shrug off and others hate, and some towers hit only walkers or only
   fliers. Each player fights with the weapon picked at the start; it levels up from the zombies that player (and that
   player's towers) finish off and gets a new power every 5 levels.
   One host runs step() 30 times a second; each device moves its own player (moveCircle) and sends the position and
   what it wants (fire, chop, build, upgrade, sell, target, next round). step() returns events (shots, hits, deaths,
   building...) that the page turns into pictures and sounds and the host sends to the other devices. */
const CC = (function () {
  const TICK = 1 / 30;
  // tiles. Players walk on grass, road, sand, gates and bridges; zombies keep to their road (fliers fly straight)
  const T = { GRASS: 0, DIRT: 1, SAND: 2, WATER: 3, TREE: 4, ROCK: 5, CASTLE: 6, SPAWN: 7, BRIDGE: 8 };
  const WALK = [1, 1, 1, 0, 0, 0, 0, 1, 1];
  const BUILD_OK = [1, 0, 1, 0, 0, 0, 0, 0, 0];   // towers stand on grass and sand
  const ROAD_OK = [0, 1, 0, 0, 0, 0, 0, 0, 1];    // barricades and spike traps go on the road
  const CASTLE_R = 2.5;                            // the castle is 5 x 5 tiles
  const START_COINS = 650, LAST_ROUND = 100, SELL_BACK = 0.7, MAX_LEVEL = 30;
  const MAT_UP = [2, 4, 10], FELL_GOT = 4, REGROW = 4;   // wood or stone for upgrade steps 1, 2, 3; per tree or rock; rounds to grow back
  const PACE = 1.6, GOLD_MUL = 2, TOWER_XP = 0.4, WEAPON_POWER = 0.45;   // zombie speeds below are multiplied by PACE (tiles a second)
  const MAX_ALIVE = 60;    // no more zombies come in while this many are about: a big round never piles up
  const ELITE_HP = [1, 1.3, 1.5], ELITE_GOLD = 0.5;   // elites (round 50 on) and champions (round 80 on): tougher, and each level adds half the gold
  const TIER_HP = { Beginner: 1, Intermediate: 0.92, Advanced: 0.85, Expert: 0.8 };   // shorter roads: a little softer zombies
  const DIFFS = {
    easy: { name: 'Easy', lives: 200, cost: 0.85, speed: 0.9, hp: 0.8, start: 950, wood: 15, stone: 10, medal: '🥉', tip: 'More lives, cheaper towers, slower zombies.' },
    medium: { name: 'Medium', lives: 150, cost: 1, speed: 1, hp: 1, start: 800, wood: 10, stone: 6, medal: '🥈', tip: 'The normal game.' },
    hard: { name: 'Hard', lives: 100, cost: 1.08, speed: 1.04, hp: 1.08, start: 700, wood: 8, stone: 4, medal: '🥇', tip: 'Fewer lives, dearer towers, tougher zombies.' }
  };

  /* ---- elements: what a weapon or tower hits with. Each zombie takes more or less from some of them (res). ---- */
  const ELEMENTS = {
    phys: { name: 'Physical', icon: '💪', tip: 'Arrows, stars, bullets and fists.' },
    fire: { name: 'Fire', icon: '🔥', tip: 'Burns. Melts ice zombies and mummies.' },
    frost: { name: 'Ice', icon: '❄️', tip: 'Chills and slows. Fire zombies hate it.' },
    water: { name: 'Water', icon: '💧', tip: 'Splashes and soaks. Puts fire zombies out.' },
    lightning: { name: 'Lightning', icon: '⚡', tip: 'Zaps from zombie to zombie. Metal armour and wings carry it.' },
    blast: { name: 'Blast', icon: '💥', tip: 'Explodes. Cracks armour, stone and bones.' },
    light: { name: 'Light', icon: '✨', tip: 'Holy light. Ghosts, shadows and skeletons fear it.' },
    poison: { name: 'Poison', icon: '☠️', tip: 'Poison stops zombies healing. Bones, slime and spirits do not care.' },
    wind: { name: 'Wind', icon: '🌪️', tip: 'Blows fliers away and pushes walkers back. Heavy zombies hardly notice.' }
  };
  const ELEMENT_ORDER = Object.keys(ELEMENTS);
  // who a tower or weapon can hit: 'both' (the default), 'ground' (walkers; bombs, shells, clouds and traps) or 'air'
  // (fliers only). digs: it can also reach a digger under the road.
  const canHit = (st, zb) => (zb.under ? !!st.digs : st.hits === 'ground' ? !zb.fly : st.hits === 'air' ? !!zb.fly : true);

  /* ---- the crew's weapons. type: the element. Every 5 levels a weapon gets the next tier; every level adds 2.5%
     damage (weaponStats). mods: see applyMods. ---- */
  const WEAPONS = {
    blaster: { name: 'Blaster', icon: '🔫', kind: 'shot', type: 'phys', dmg: 5.2, rate: 3, range: 6, speed: 15, pierce: 1, tip: 'Quick shots at anything nearby.',
      tiers: [{ name: 'Double Blaster', desc: 'Fires two shots at once.', mods: { shots: 2, spread: 8 } },
        { name: 'Laser Blaster', desc: 'Shots fly faster and go through three zombies.', mods: { pierce: 2, dmg: 1.25, speed: 1.4 } },
        { name: 'Plasma Blaster', desc: 'Shots burst and hurt zombies nearby.', mods: { splash: 0.9, dmg: 1.2 } },
        { name: 'Star Blaster', desc: 'Three shots at once, super fast.', mods: { rate: 1.6, shots: 3, spread: 14 } }] },
    punch: { name: 'Boxing Gloves', icon: '🥊', kind: 'melee', type: 'phys', dmg: 5.6, rate: 2.6, range: 1.4, arc: 110, knock: 0.35, tip: 'Super fast punches up close. Knocks zombies back.',
      tiers: [{ name: 'Power Punch', desc: 'Harder punches that knock zombies further.', mods: { dmg: 1.5, knock: 2 } },
        { name: 'Combo Punch', desc: 'Faster punches, and every third one stuns.', mods: { rate: 1.4, combo: 3, stun: 0.6 } },
        { name: 'Thunder Fist', desc: 'Every third punch also sends lightning jumping to two more zombies.', mods: { zap: 2, dmg: 1.2 } },
        { name: 'Mega Punch', desc: 'Giant punches that hit everything around you.', mods: { arc: 360, range: 1.5, dmg: 1.35 } }] },
    hammer: { name: 'Hammer', icon: '🔨', kind: 'melee', type: 'phys', dmg: 9.6, rate: 1.2, range: 1.7, arc: 130, knock: 0.6, tip: 'Big hits up close. Knocks zombies back and chops trees fast.',
      tiers: [{ name: 'Iron Hammer', desc: 'Hits much harder.', mods: { dmg: 1.6 } },
        { name: 'Shockwave', desc: 'Hits all around you and knocks zombies further.', mods: { arc: 360, knock: 1.6 } },
        { name: 'Thunder Hammer', desc: 'Every hit stuns zombies for a moment.', mods: { stun: 0.6, dmg: 1.3 } },
        { name: 'Earthshaker', desc: 'Reaches further and hits like a giant.', mods: { range: 1.5, dmg: 2 } }] },
    scatter: { name: 'Scatter Gun', icon: '💥', kind: 'shot', type: 'phys', dmg: 3.6, shots: 6, spread: 42, rate: 1.1, range: 4.6, speed: 14, pierce: 1, tip: 'A spray of pellets: great when zombies bunch up.',
      tiers: [{ name: 'Wide Spray', desc: 'Two more pellets.', mods: { shots: 8, spread: 50 } },
        { name: 'Slug Shells', desc: 'Pellets hit harder and go through two zombies.', mods: { pierce: 1, dmg: 1.4 } },
        { name: 'Fire Pellets', desc: 'Pellets set zombies on fire.', mods: { burnDps: 6, burnT: 2 } },
        { name: 'Dragon Shotgun', desc: 'Twelve pellets, shot faster.', mods: { shots: 12, spread: 60, rate: 1.4 } }] },
    flamer: { name: 'Flamer', icon: '🔥', kind: 'cone', type: 'fire', dmg: 1.2, rate: 10, range: 3.3, arc: 55, burnDps: 1.6, burnT: 3, tip: 'Burns everything in front. Mummies and ice zombies hate it.',
      tiers: [{ name: 'Hot Flamer', desc: 'Fire burns longer and hotter.', mods: { burnDps: 1.6, burnT: 1.3 } },
        { name: 'Long Flamer', desc: 'Flames reach further.', mods: { range: 1.35 } },
        { name: 'Blue Flame', desc: 'So hot it even hurts fire zombies.', mods: { blue: true, dmg: 1.4 } },
        { name: 'Inferno', desc: 'A huge wide wall of fire.', mods: { arc: 95, dmg: 1.6 } }] },
    crossbow: { name: 'Crossbow', icon: '🏹', kind: 'shot', type: 'phys', dmg: 16, pierce: 4, rate: 0.8, range: 9, speed: 22, tip: 'Long range. Each bolt goes through four zombies.',
      tiers: [{ name: 'Heavy Bolts', desc: 'Bolts hit harder.', mods: { dmg: 1.4 } },
        { name: 'Repeater', desc: 'Shoots much faster.', mods: { rate: 1.6 } },
        { name: 'Armour Piercer', desc: 'Bolts go through armour and six more zombies.', mods: { armor: true, pierce: 6 } },
        { name: 'Ballista', desc: 'Giant bolts that burst on hit.', mods: { dmg: 2, splash: 0.7 } }] },
    frost: { name: 'Frost Wand', icon: '❄️', kind: 'shot', type: 'frost', dmg: 2.2, rate: 2, range: 7, speed: 12, pierce: 1, splash: 0.9, slowF: 0.45, slowT: 2.5, tip: 'Slows zombies down. Fire zombies hate it.',
      tiers: [{ name: 'Colder Wand', desc: 'Slows zombies even more.', mods: { slowF: 0.6, dmg: 1.3 } },
        { name: 'Ice Burst', desc: 'Bigger bursts of ice.', mods: { splash: 1.4, dmg: 1.3 } },
        { name: 'Frozen Solid', desc: 'Freezes zombies still for a moment.', mods: { freeze: 0.7 } },
        { name: 'Winter Storm', desc: 'Huge icy blasts, faster.', mods: { splash: 1.5, dmg: 2, rate: 1.3 } }] },
    bomb: { name: 'Bomb Launcher', icon: '💣', kind: 'lob', type: 'blast', hits: 'ground', dmg: 10, rate: 0.6, range: 8, speed: 9, splash: 1.6, tip: 'Lobs bombs at walkers (not fliers). Cracks armour and bones.',
      tiers: [{ name: 'Big Bombs', desc: 'Bigger blasts.', mods: { splash: 1.3, dmg: 1.2 } },
        { name: 'Fast Fuse', desc: 'Throws bombs faster.', mods: { rate: 1.5 } },
        { name: 'Cluster Bombs', desc: 'Each bomb breaks into 4 little bombs.', mods: { cluster: 4 } },
        { name: 'Mega Bomb', desc: 'Huge blasts that stun zombies.', mods: { dmg: 2, stun: 0.6, splash: 1.2 } }] },
    lightning: { name: 'Lightning Staff', icon: '⚡', kind: 'chain', type: 'lightning', dmg: 7.6, rate: 1, range: 6.5, jumps: 4, jumpRange: 2.6, falloff: 0.82, tip: 'Zaps one zombie, then jumps to its friends. Knights and bats hate it.',
      tiers: [{ name: 'More Jumps', desc: 'Jumps to two more zombies.', mods: { jumps: 2 } },
        { name: 'Charged Staff', desc: 'Much stronger zaps.', mods: { dmg: 1.6 } },
        { name: 'Storm Staff', desc: 'Faster zaps that jump further.', mods: { rate: 1.4, jumps: 3, jumpRange: 1.3 } },
        { name: 'Thunder God', desc: 'Zaps hit twice as hard and slow zombies.', mods: { dmg: 2, slowF: 0.35, slowT: 1 } }] }
  };
  const WEAPON_ORDER = ['blaster', 'punch', 'hammer', 'scatter', 'flamer', 'crossbow', 'frost', 'bomb', 'lightning'];

  /* ---- towers: base stats and two upgrade paths (a, b) of three steps each. cost in coins on Medium, plus matN of
     its material (mat: wood or stone; each upgrade step takes MAT_UP of it). type: its element; hits: who it can hit
     (see canHit). kinds: shot (arrows, stars, bolts, rockets, bees), lob (bombs and shells), chain (lightning), cone
     (flames), snipe (an instant hit anywhere), beam (a ray through a line of zombies), aura (frost all around), pulse
     (light all around), gust (wind), cloud (poison on the road), erupt (a geyser under a zombie), support (the
     shrine), mine (coins each round), mill (wood and stone each round), wall and trap (on the road). ---- */
  const TOWERS = {
    arrow: { name: 'Arrow Tower', icon: '🏹', cost: 180, mat: 'wood', matN: 3, kind: 'shot', type: 'phys', dmg: 10, rate: 1.5, range: 5.5, pierce: 2, speed: 17, tip: 'Cheap and steady: arrows at walkers and fliers.',
      a: [{ name: 'Sharp Arrows', cost: 120, desc: 'Each arrow goes through 2 more zombies.', mods: { pierce: 2 } },
        { name: 'Fire Arrows', cost: 330, desc: 'Arrows set zombies on fire.', mods: { burnDps: 5, burnT: 2.5, dmg: 1.2 } },
        { name: 'Arrow Storm', cost: 1700, desc: 'Three arrows at a time, faster.', mods: { shots: 3, spread: 16, rate: 1.4 } }],
      b: [{ name: 'Long Bow', cost: 100, desc: 'Shoots further.', mods: { range: 1.3 } },
        { name: 'Eagle Eye', cost: 300, desc: 'Sees shadow zombies and shoots faster.', mods: { camo: true, rate: 1.3 } },
        { name: 'Master Archer', cost: 2500, desc: 'Huge arrows, three times as strong.', mods: { dmg: 3, pierce: 3, speed: 1.4 } }] },
    wall: { name: 'Barricade', icon: '🧱', cost: 60, mat: 'wood', matN: 2, kind: 'wall', road: true, hits: 'ground', hp: 250, tip: 'Goes on the road. Walkers must stop and smash it; fliers float over.',
      a: [{ name: 'Spiky', cost: 90, desc: 'Hurts every zombie that hits it.', mods: { thorns: 8 } },
        { name: 'Stone Wall', cost: 280, desc: 'Three times as strong.', mods: { hp: 3 } },
        { name: 'Iron Gate', cost: 1400, desc: 'Super strong, with big spikes.', mods: { hp: 4, thorns: 40 } }],
      b: [{ name: 'Patch Up', cost: 100, desc: 'Mends itself after every round.', mods: { repair: true } },
        { name: 'Sticky Tar', cost: 320, desc: 'Zombies near it walk slowly.', mods: { tarF: 0.45, tarR: 1.8 } },
        { name: 'Magic Ward', cost: 1600, desc: 'Every 3 s it pushes nearby zombies back down the road.', mods: { wardEvery: 3, wardPush: 2.5, wardR: 1.8 } }] },
    cannon: { name: 'Cannon', icon: '💣', cost: 420, mat: 'stone', matN: 4, kind: 'lob', type: 'blast', hits: 'ground', dmg: 22, rate: 0.7, range: 6, speed: 10, splash: 1.3, tip: 'Explodes on groups of walkers (not fliers). Cracks armour.',
      a: [{ name: 'Bigger Bombs', cost: 260, desc: 'Bigger blasts.', mods: { splash: 1.35, dmg: 1.2 } },
        { name: 'Heavy Shells', cost: 650, desc: 'Nearly twice the damage.', mods: { dmg: 1.9 } },
        { name: 'Cluster Bombs', cost: 2400, desc: 'Each shell breaks into 4 more bombs.', mods: { cluster: 4 } }],
      b: [{ name: 'Quick Loader', cost: 300, desc: 'Fires faster.', mods: { rate: 1.45 } },
        { name: 'Stun Shells', cost: 700, desc: 'Blasts stun zombies for a moment.', mods: { stun: 0.6 } },
        { name: 'Twin Cannon', cost: 2700, desc: 'Two barrels: two shells at a time.', mods: { shots: 2, rate: 1.25 } }] },
    rocket: { name: 'Rocket Tower', icon: '🚀', cost: 400, mat: 'stone', matN: 4, kind: 'shot', type: 'blast', hits: 'air', homing: true, dmg: 24, rate: 0.9, range: 7, speed: 9, pierce: 1, splash: 1.1, tip: 'Homing rockets for fliers only: bats, ghosts, gargoyles, dragons.',
      a: [{ name: 'Bigger Rockets', cost: 300, desc: 'Bigger blasts in the sky.', mods: { splash: 1.4, dmg: 1.3 } },
        { name: 'Twin Rockets', cost: 800, desc: 'Two rockets at a time.', mods: { shots: 2, spread: 24 } },
        { name: 'Rocket Swarm', cost: 3000, desc: 'Four rockets at a time, faster.', mods: { shots: 4, spread: 40, rate: 1.25 } }],
      b: [{ name: 'Fast Fuel', cost: 250, desc: 'Fires faster and rockets fly faster.', mods: { rate: 1.4, speed: 1.3 } },
        { name: 'Long Range', cost: 500, desc: 'Reaches much further.', mods: { range: 1.4 } },
        { name: 'Sky Hammer', cost: 3200, desc: 'Huge rockets that knock fliers dizzy.', mods: { dmg: 3, stun: 0.6 } }] },
    frost: { name: 'Frost Tower', icon: '❄️', cost: 320, mat: 'stone', matN: 4, kind: 'aura', type: 'frost', dmg: 3, range: 2.8, slowF: 0.4, slowT: 0.4, tip: 'Chills and slows every zombie near it.',
      a: [{ name: 'Deep Freeze', cost: 220, desc: 'Slows zombies even more.', mods: { slowF: 0.55 } },
        { name: 'Freeze Pulse', cost: 650, desc: 'Every 4 s, freezes everything near it.', mods: { pulseEvery: 4, pulseFreeze: 1.2 } },
        { name: 'Blizzard', cost: 2600, desc: 'A huge storm: bigger, stronger, freezes often.', mods: { range: 1.5, dmg: 4, pulseEvery: 2.5 } }],
      b: [{ name: 'Chilly', cost: 150, desc: 'Reaches further.', mods: { range: 1.25 } },
        { name: 'Ice Shards', cost: 550, desc: 'Also shoots sharp ice at zombies.', mods: { shards: true } },
        { name: 'Permafrost', cost: 2000, desc: 'Chilled zombies take 30% more damage from everything.', mods: { brittle: 2.5 } }] },
    tesla: { name: 'Tesla Coil', icon: '⚡', cost: 650, mat: 'stone', matN: 6, kind: 'chain', type: 'lightning', dmg: 20, rate: 0.9, range: 4.5, jumps: 4, jumpRange: 2.4, falloff: 0.85, tip: 'Lightning that jumps from zombie to zombie. Knights and bats hate it.',
      a: [{ name: 'More Jumps', cost: 320, desc: 'Jumps to two more zombies.', mods: { jumps: 2 } },
        { name: 'Overcharge', cost: 850, desc: 'Much stronger zaps.', mods: { dmg: 1.7 } },
        { name: 'Storm Coil', cost: 3200, desc: 'Huge chains of lightning.', mods: { jumps: 6, dmg: 1.5, rate: 1.3 } }],
      b: [{ name: 'Fast Charge', cost: 380, desc: 'Zaps faster.', mods: { rate: 1.35 } },
        { name: 'Static', cost: 650, desc: 'Zapped zombies slow down.', mods: { slowF: 0.3, slowT: 1 } },
        { name: 'Thunder Dome', cost: 3600, desc: 'Every 2.5 s, zaps every zombie near it.', mods: { pulseEvery: 2.5, pulseDmg: 70 } }] },
    flame: { name: 'Flame Tower', icon: '🔥', cost: 380, mat: 'wood', matN: 4, kind: 'cone', type: 'fire', dmg: 3, rate: 8, range: 2.8, arc: 70, burnDps: 4, burnT: 3, tip: 'Burns zombies that come close. Mummies and ice zombies melt.',
      a: [{ name: 'Hotter', cost: 260, desc: 'Fire burns twice as hot.', mods: { burnDps: 2 } },
        { name: 'Napalm', cost: 700, desc: 'Sticky fire that burns longer.', mods: { burnT: 2, dmg: 1.5 } },
        { name: "Dragon's Breath", cost: 2700, desc: 'A huge, wide blast of fire.', mods: { range: 1.5, arc: 120, dmg: 2 } }],
      b: [{ name: 'Long Nozzle', cost: 200, desc: 'Flames reach further.', mods: { range: 1.3 } },
        { name: 'Blue Flame', cost: 650, desc: 'So hot it even burns fire zombies.', mods: { blue: true } },
        { name: 'Inferno Ring', cost: 2900, desc: 'Flames all the way round.', mods: { arc: 360, dmg: 1.5 } }] },
    geyser: { name: 'Geyser', icon: '⛲', cost: 360, mat: 'stone', matN: 4, kind: 'erupt', type: 'water', hits: 'ground', digs: true, dmg: 20, rate: 0.6, range: 5, splash: 1, stun: 0.5, tip: 'Erupts under walkers and throws them up. Puts fire zombies out, and flushes diggers out of their tunnels.',
      a: [{ name: 'Hot Spring', cost: 250, desc: 'Hits harder.', mods: { dmg: 1.6 } },
        { name: 'Big Geyser', cost: 600, desc: 'A much wider splash.', mods: { splash: 1.5 } },
        { name: 'Super Geyser', cost: 2800, desc: 'Enormous eruptions.', mods: { dmg: 2.5, splash: 1.2, stun: 0.9 } }],
      b: [{ name: 'Steam', cost: 300, desc: 'Erupts more often.', mods: { rate: 1.4 } },
        { name: 'Whirlpool', cost: 550, desc: 'Soaked zombies walk slowly.', mods: { slowF: 0.5, slowT: 2.5 } },
        { name: 'Tidal Wave', cost: 2600, desc: 'Each eruption washes zombies back down the road.', mods: { knock: 3 } }] },
    mortar: { name: 'Mortar', icon: '🎯', cost: 700, mat: 'stone', matN: 6, kind: 'lob', type: 'blast', hits: 'ground', dmg: 40, rate: 0.4, range: 9, min: 2.5, speed: 7, splash: 1.7, tip: 'Very long range and big blasts on walkers, but it cannot hit close or hit fliers.',
      a: [{ name: 'Big Shells', cost: 360, desc: 'Bigger blasts.', mods: { splash: 1.3 } },
        { name: 'Burning Ground', cost: 850, desc: 'Shells leave fire on the road.', mods: { poolDps: 10, poolT: 3, poolR: 1.4 } },
        { name: 'Earthquake', cost: 3300, desc: 'Massive shells that stun zombies.', mods: { dmg: 2.5, stun: 0.8 } }],
      b: [{ name: 'Fast Reload', cost: 420, desc: 'Fires faster.', mods: { rate: 1.4 } },
        { name: 'Long Barrel', cost: 500, desc: 'Reaches much further.', mods: { range: 1.45 } },
        { name: 'Battery', cost: 3100, desc: 'Three shells at a time.', mods: { shots: 3 } }] },
    shrine: { name: 'Healing Shrine', icon: '💖', cost: 500, mat: 'stone', matN: 5, kind: 'support', range: 3, heal: 8, buffRate: 0.1, tip: 'Heals the crew and makes towers near it shoot faster.',
      a: [{ name: 'Battle Hymn', cost: 420, desc: 'Towers near it shoot even faster.', mods: { buffRate: 0.15 } },
        { name: 'Far Sight', cost: 720, desc: 'Towers near it reach further and see shadows.', mods: { buffRange: 0.15, buffCamo: true } },
        { name: 'Golden Shrine', cost: 3600, desc: 'Towers near it hit 40% harder.', mods: { buffDmg: 0.4 } }],
      b: [{ name: 'Blessing', cost: 300, desc: 'Reaches further.', mods: { range: 1.3 } },
        { name: 'Quick Revive', cost: 600, desc: 'Knocked-out players get up in 2 s.', mods: { revive: true } },
        { name: 'Castle Mender', cost: 2600, desc: 'Mends 5 of the castle’s lives after every round.', mods: { mend: 5 } }] },
    sniper: { name: 'Sniper Nest', icon: '🔭', cost: 320, mat: 'wood', matN: 4, kind: 'snipe', type: 'phys', dmg: 30, rate: 0.45, range: 99, mode: 'strong', tip: 'Hits any zombie on the map, walker or flier. Aims at the strongest.',
      a: [{ name: 'Big Bullets', cost: 260, desc: 'Hits harder.', mods: { dmg: 1.7 } },
        { name: 'Armour Piercing', cost: 820, desc: 'Goes straight through armour.', mods: { armor: true, dmg: 1.3 } },
        { name: 'Deadly Aim', cost: 3100, desc: 'Four times the damage.', mods: { dmg: 4 } }],
      b: [{ name: 'Fast Reload', cost: 320, desc: 'Shoots faster.', mods: { rate: 1.5 } },
        { name: 'Night Vision', cost: 360, desc: 'Sees shadow zombies.', mods: { camo: true } },
        { name: 'Elite Sniper', cost: 3300, desc: 'Shoots two and a half times as fast.', mods: { rate: 2.5 } }] },
    glue: { name: 'Slime Tower', icon: '🧪', cost: 250, mat: 'wood', matN: 3, kind: 'shot', type: 'poison', hits: 'ground', dmg: 1, rate: 1.2, range: 4.5, speed: 12, pierce: 1, slowF: 0.5, slowT: 3, tip: 'Slime slows walkers right down (it cannot reach fliers).',
      a: [{ name: 'Stronger Slime', cost: 200, desc: 'Slows zombies even more.', mods: { slowF: 0.65 } },
        { name: 'Acid Slime', cost: 520, desc: 'Slimed zombies melt a little.', mods: { acidDps: 8, acidT: 3 } },
        { name: 'Slime Flood', cost: 2300, desc: 'Each splat slimes every zombie near it.', mods: { flood: 2.2 } }],
      b: [{ name: 'Splat', cost: 260, desc: 'Slime splashes on zombies next to it.', mods: { splash: 1 } },
        { name: 'Sticky', cost: 460, desc: 'Slime lasts twice as long.', mods: { slowT: 2 } },
        { name: 'Super Glue', cost: 2100, desc: 'Glued zombies stop dead for a second.', mods: { stop: 1 } }] },
    mushroom: { name: 'Mushroom Tower', icon: '🍄', cost: 300, mat: 'wood', matN: 3, kind: 'cloud', type: 'poison', hits: 'ground', dmg: 9, rate: 0.5, range: 5, cloudT: 3, cloudR: 1.3, tip: 'Puffs poison clouds onto the road. Poisoned zombies cannot heal. Bones, slime and spirits do not care.',
      a: [{ name: 'Toxic Spores', cost: 220, desc: 'Stronger poison.', mods: { dmg: 1.6 } },
        { name: 'Big Cloud', cost: 550, desc: 'Bigger clouds that last longer.', mods: { cloudR: 1.4, cloudT: 1.5 } },
        { name: 'Plague', cost: 2600, desc: 'Deadly poison.', mods: { dmg: 2.5, cloudR: 1.2 } }],
      b: [{ name: 'Spore Rain', cost: 260, desc: 'Puffs more often.', mods: { rate: 1.5 } },
        { name: 'Weak Gas', cost: 700, desc: 'Poisoned zombies take 30% more damage from everything.', mods: { brittle: 2 } },
        { name: 'Mega Mushroom', cost: 2800, desc: 'Two clouds at a time, further away.', mods: { shots: 2, range: 1.4 } }] },
    ninja: { name: 'Ninja Dojo', icon: '🥷', cost: 450, mat: 'wood', matN: 4, kind: 'shot', type: 'phys', dmg: 9, rate: 2.4, range: 5, speed: 18, pierce: 2, camo: true, tip: 'Fast throwing stars. Ninjas see shadow zombies.',
      a: [{ name: 'Sharp Stars', cost: 260, desc: 'Stars go further through zombies and hit harder.', mods: { pierce: 2, dmg: 1.2 } },
        { name: 'Triple Star', cost: 720, desc: 'Three stars at a time.', mods: { shots: 3, spread: 20 } },
        { name: 'Grandmaster', cost: 3300, desc: 'Twice as fast and twice as strong.', mods: { rate: 2, dmg: 2 } }],
      b: [{ name: 'Quick Hands', cost: 300, desc: 'Throws faster.', mods: { rate: 1.3 } },
        { name: 'Smoke Bomb', cost: 620, desc: 'Every 5 s, a smoke bomb stuns a group.', mods: { smokeEvery: 5, smokeStun: 1.2, smokeR: 1.5 } },
        { name: 'Shadow Clone', cost: 2900, desc: 'A shadow ninja throws with it.', mods: { shots: 2, dmg: 1.4 } }] },
    bees: { name: 'Bee Hive', icon: '🐝', cost: 420, mat: 'wood', matN: 4, kind: 'shot', type: 'phys', homing: true, dmg: 5, rate: 3, range: 5.5, speed: 7, pierce: 1, tip: 'Buzzing bees chase zombies, walkers and fliers. Great against fast ones.',
      a: [{ name: 'Angry Bees', cost: 260, desc: 'Stings hurt more.', mods: { dmg: 1.5 } },
        { name: 'Killer Bees', cost: 700, desc: 'Poison stings: stung zombies cannot heal.', mods: { acidDps: 6, acidT: 2, poisonT: 2 } },
        { name: 'Queen Bee', cost: 3000, desc: 'Three bees at a time.', mods: { shots: 3, spread: 30 } }],
      b: [{ name: 'Busy Bees', cost: 300, desc: 'Bees fly out faster.', mods: { rate: 1.4 } },
        { name: 'Big Hive', cost: 500, desc: 'Bees fly further and sting two zombies.', mods: { range: 1.3, pierce: 1 } },
        { name: 'Honey Trap', cost: 2200, desc: 'Stung zombies get stuck in honey.', mods: { slowF: 0.5, slowT: 2 } }] },
    wizard: { name: 'Wizard Tower', icon: '🔮', cost: 420, mat: 'stone', matN: 5, kind: 'shot', type: 'light', dmg: 14, rate: 1.2, range: 5.5, speed: 12, pierce: 1, tip: 'Bolts of holy light. Ghosts, shadows and skeletons hate it.',
      a: [{ name: 'Arcane Bolt', cost: 260, desc: 'Bolts hit harder and go through 2 zombies.', mods: { dmg: 1.5, pierce: 1 } },
        { name: 'Fireball', cost: 720, desc: 'Throws a fireball every 2 s.', mods: { fireballEvery: 2, fireballDmg: 30, fireballR: 1.4 } },
        { name: 'Dragon Spirit', cost: 3500, desc: 'Huge fireballs, three times as often.', mods: { fireballEvery: 0.7, fireballDmg: 2 } }],
      b: [{ name: 'Wisdom', cost: 220, desc: 'Reaches further.', mods: { range: 1.25 } },
        { name: 'Crystal Ball', cost: 420, desc: 'Sees shadow zombies and casts faster.', mods: { camo: true, rate: 1.2 } },
        { name: 'Meteor', cost: 3100, desc: 'Every 7 s, a meteor smashes the strongest zombie.', mods: { meteorEvery: 7, meteorDmg: 700, meteorR: 2 } }] },
    lantern: { name: 'Lantern Tower', icon: '🏮', cost: 380, mat: 'wood', matN: 4, kind: 'pulse', type: 'light', dmg: 12, rate: 0.8, range: 3.5, camoAura: true, tip: 'Rings of holy light around it. Towers near it can see shadow zombies.',
      a: [{ name: 'Bright Light', cost: 240, desc: 'Brighter, stronger light.', mods: { dmg: 1.6 } },
        { name: 'Holy Ring', cost: 650, desc: 'A wider, stronger ring.', mods: { range: 1.3, dmg: 1.3 } },
        { name: 'Sunrise', cost: 2800, desc: 'Blinding light, more often.', mods: { dmg: 2.5, rate: 1.3 } }],
      b: [{ name: 'Lighthouse', cost: 200, desc: 'Reaches further.', mods: { range: 1.25 } },
        { name: 'Blessed Light', cost: 700, desc: 'Towers near it hit 15% harder.', mods: { buffDmg: 0.15 } },
        { name: 'Angel Lantern', cost: 2400, desc: 'Lit-up zombies slow down.', mods: { slowF: 0.4, slowT: 1.2 } }] },
    wind: { name: 'Wind Tower', icon: '🌪️', cost: 350, mat: 'wood', matN: 3, kind: 'gust', type: 'wind', dmg: 7, rate: 0.45, range: 4, push: 1.5, tip: 'Gusts blow fliers about and push walkers back down the road. Heavy zombies hardly move.',
      a: [{ name: 'Strong Wind', cost: 250, desc: 'Pushes further and hits harder.', mods: { push: 1.5, dmg: 1.5 } },
        { name: 'Tornado', cost: 750, desc: 'Much stronger gusts.', mods: { dmg: 2 } },
        { name: 'Hurricane', cost: 3000, desc: 'A storm that reaches far.', mods: { range: 1.4, push: 1.5, dmg: 2 } }],
      b: [{ name: 'Quick Gusts', cost: 300, desc: 'Gusts more often.', mods: { rate: 1.4 } },
        { name: 'Sky Sweeper', cost: 650, desc: 'Fliers take twice as much.', mods: { vsAir: 2 } },
        { name: 'Twister', cost: 2600, desc: 'Gusts spin zombies round, stunning them.', mods: { stun: 0.8 } }] },
    mine: { name: 'Gold Mine', icon: '🪙', cost: 800, mat: 'wood', matN: 6, kind: 'mine', income: 70, tip: 'Digs up 70 coins at the end of every round.',
      a: [{ name: 'Deeper Shaft', cost: 500, desc: '40 more coins every round.', mods: { income: 40 } },
        { name: 'Gold Rush', cost: 1200, desc: '90 more coins every round.', mods: { income: 90 } },
        { name: 'Treasure Vault', cost: 3600, desc: '260 more coins every round.', mods: { income: 260 } }],
      b: [{ name: 'Lucky Coins', cost: 420, desc: 'Every zombie that falls near it drops a coin more.', mods: { killBonus: 1, killR: 3.5 } },
        { name: 'Bank', cost: 1300, desc: 'Adds 8% to your coins every round (up to 400).', mods: { bankRate: 0.08, bankCap: 400 } },
        { name: 'Royal Mint', cost: 4000, desc: '450 more coins every round.', mods: { income: 450 } }] },
    mill: { name: 'Lumber Mill', icon: '🪚', cost: 450, mat: 'wood', matN: 2, kind: 'mill', woodPer: 3, stonePer: 1, tip: 'Saws 3 wood and cuts 1 stone for the crew at the end of every round.',
      a: [{ name: 'Bigger Saws', cost: 300, desc: '3 more wood every round.', mods: { woodPer: 3 } },
        { name: 'Woodcutters', cost: 700, desc: '5 more wood every round.', mods: { woodPer: 5 } },
        { name: 'Timber Factory', cost: 2000, desc: '10 more wood every round.', mods: { woodPer: 10 } }],
      b: [{ name: 'Quarry', cost: 400, desc: '3 more stone every round.', mods: { stonePer: 3 } },
        { name: 'Stone Crusher', cost: 800, desc: '5 more stone every round.', mods: { stonePer: 5 } },
        { name: 'Mountain Mine', cost: 2200, desc: '10 more stone every round.', mods: { stonePer: 10 } }] },
    sun: { name: 'Sun Tower', icon: '☀️', cost: 3200, mat: 'stone', matN: 12, kind: 'beam', type: 'light', dmg: 7, rate: 8, range: 6, pierce: 1, tip: 'A burning ray of holy sunlight. Very strong, very dear.',
      a: [{ name: 'Brighter', cost: 1600, desc: 'A much stronger ray.', mods: { dmg: 1.6 } },
        { name: 'Solar Flare', cost: 4200, desc: 'The ray goes through 5 zombies in a line.', mods: { pierce: 5 } },
        { name: 'Supernova', cost: 13000, desc: 'Three times the power, and further.', mods: { dmg: 3, range: 1.4 } }],
      b: [{ name: 'Wide Lens', cost: 1100, desc: 'Reaches further.', mods: { range: 1.3 } },
        { name: 'Sunspot', cost: 3000, desc: 'The ray sets zombies on fire.', mods: { burnDps: 8, burnT: 3 } },
        { name: 'Twin Suns', cost: 10500, desc: 'Two rays at two zombies.', mods: { beams: 2 } }] },
    spikes: { name: 'Spike Trap', icon: '📍', cost: 120, mat: 'stone', matN: 2, kind: 'trap', road: true, hits: 'ground', type: 'phys', spikes: 20, spikeDmg: 15, tip: 'Goes on the road. Pokes the walkers that step on it (20 spikes each round).',
      a: [{ name: 'Sharper', cost: 110, desc: 'Spikes hurt twice as much.', mods: { spikeDmg: 2 } },
        { name: 'Iron Spikes', cost: 360, desc: 'Spikes go through armour.', mods: { armor: true } },
        { name: 'Spike Storm', cost: 1500, desc: 'Three times the spikes, three times the damage.', mods: { spikeDmg: 3, spikes: 3 } }],
      b: [{ name: 'More Spikes', cost: 130, desc: 'Twice as many spikes.', mods: { spikes: 2 } },
        { name: 'Glue Spikes', cost: 320, desc: 'Poked zombies slow down.', mods: { slowF: 0.4, slowT: 2 } },
        { name: 'Exploding Spikes', cost: 1400, desc: 'Every spike goes off like a little bomb.', mods: { explode: 1.2 } }] }
  };
  const TOWER_ORDER = ['arrow', 'ninja', 'bees', 'sniper', 'glue', 'mushroom', 'cannon', 'rocket', 'frost', 'flame', 'geyser', 'tesla', 'wizard', 'lantern', 'wind', 'mortar', 'shrine', 'mine', 'mill', 'sun', 'wall', 'spikes'];

  /* ---- zombies. hp at round 1 (later rounds make them tougher); gold: coins when it falls; xp: weapon experience
     for the player whose weapon finished it; bite: lives it takes when it gets into the castle; fly: it flies (only
     towers and weapons that hit fliers can reach it; it floats over barricades and traps); res: damage taken per
     element (1 = normal, 0 = none at all); icon: its picture in the zombie book. ---- */
  const ZOMBIES = {
    walker: { name: 'Walker', icon: '🧟', hp: 18, speed: 1.0, dmg: 8, gold: 1, xp: 1, bite: 1, size: 1, tip: 'Slow and steady. There are lots of them.' },
    runner: { name: 'Runner', icon: '🏃', hp: 12, speed: 2.1, dmg: 5, gold: 1, xp: 1, bite: 1, size: 0.85, res: { wind: 1.4 }, tip: 'Fast! Slow it down or hit it early.' },
    brute: { name: 'Brute', icon: '🦍', hp: 120, speed: 0.75, dmg: 25, gold: 6, xp: 6, bite: 5, size: 1.5, heavy: true, res: { wind: 0.3, poison: 1.3 }, tip: 'Huge and tough. Wind cannot move it; poison wears it down.' },
    knight: { name: 'Knight', icon: '🛡️', hp: 45, speed: 0.95, dmg: 10, gold: 3, xp: 4, bite: 2, res: { phys: 0.4, poison: 0.5, blast: 1.5, lightning: 1.5, fire: 1.2 }, tip: 'Armour stops arrows and stings. Bombs and lightning get through.' },
    spitter: { name: 'Spitter', icon: '🤢', hp: 28, speed: 0.95, dmg: 8, gold: 2, xp: 3, bite: 1, ranged: { range: 4, rate: 0.5, speed: 7, stun: 1.5 }, res: { poison: 0, water: 1.5 }, tip: 'Spits slime that jams towers. Poison does nothing; water washes it away.' },
    bomber: { name: 'Bomber', icon: '🧨', hp: 30, speed: 1.45, dmg: 12, gold: 2, xp: 3, bite: 3, explode: { r: 1.7, dmg: 40, stun: 1 }, res: { fire: 1.5, water: 0.6 }, tip: 'Blows up when it falls: it hurts its friends, but jams towers close by.' },
    shadow: { name: 'Shadow', icon: '👤', hp: 30, speed: 1.35, dmg: 8, gold: 2, xp: 3, bite: 2, camo: true, res: { phys: 0.6, light: 2.5, poison: 0.5 }, tip: 'Invisible to most towers! Ninjas, lanterns, some upgrades and your own weapon can see it. Light hurts it a lot.' },
    ghost: { name: 'Ghost', icon: '👻', hp: 36, speed: 1.1, dmg: 8, gold: 3, xp: 3, bite: 2, fly: true, res: { phys: 0.4, light: 2, frost: 1.2, poison: 0, wind: 1.5 }, tip: 'Flies. Arrows pass through it; light and wind are best.' },
    frosty: { name: 'Frosty', icon: '🥶', hp: 50, speed: 0.95, dmg: 10, gold: 3, xp: 4, bite: 2, res: { frost: 0, fire: 2, water: 0.5 }, noSlow: true, tip: 'Made of ice: ice does nothing and it cannot be slowed. Fire melts it.' },
    blaze: { name: 'Blaze', icon: '🥵', hp: 50, speed: 1.0, dmg: 10, gold: 3, xp: 4, bite: 2, res: { fire: 0, frost: 2, water: 2.5, poison: 0.5 }, noBurn: true, tip: 'On fire: flames do nothing. Water and ice put it out.' },
    digger: { name: 'Digger', icon: '⛏️', hp: 45, speed: 1.0, dmg: 10, gold: 3, xp: 4, bite: 2, dig: { speed: 2.4, pop: 6 }, res: { blast: 1.5, water: 1.5 }, tip: 'Tunnels under the road and pops up near the castle. A geyser flushes it out.' },
    blob: { name: 'Blob', icon: '🟢', hp: 60, speed: 0.8, dmg: 10, gold: 2, xp: 3, bite: 3, size: 1.2, split: { type: 'mini', n: 3 }, res: { phys: 0.7, poison: 0, frost: 1.5 }, tip: 'Splits into three little blobs. Poison does nothing; ice hardens it.' },
    mini: { name: 'Little Blob', icon: '🟩', hp: 12, speed: 1.7, dmg: 4, gold: 1, xp: 1, bite: 1, size: 0.6, res: { poison: 0, frost: 1.5 }, tip: 'Small and quick.' },
    shield: { name: 'Shield Bearer', icon: '🔰', hp: 75, speed: 0.85, dmg: 12, gold: 4, xp: 5, bite: 2, shield: { arc: 140, blocks: { phys: 1, fire: 1, frost: 1, water: 1 } }, res: { blast: 1.4, lightning: 1.3 }, tip: 'Its shield blocks shots from the front. Bombs, lightning, light and poison go round it.' },
    shaman: { name: 'Shaman', icon: '🪄', hp: 45, speed: 0.8, dmg: 6, gold: 4, xp: 5, bite: 2, heal: { r: 3, hps: 8 }, res: { light: 1.5, lightning: 1.2 }, tip: 'Heals the zombies around it (not poisoned ones). Get it first!' },
    bat: { name: 'Bat', icon: '🦇', hp: 10, speed: 2.7, dmg: 4, gold: 1, xp: 1, bite: 1, size: 0.6, fly: true, res: { wind: 2, lightning: 1.5 }, tip: 'Tiny, fast and flies. Wind and lightning knock bats out.' },
    vulture: { name: 'Vulture', icon: '🦅', hp: 40, speed: 1.9, dmg: 8, gold: 3, xp: 3, bite: 2, size: 0.9, fly: true, res: { wind: 2, lightning: 1.4, poison: 0.5 }, tip: 'A zombie bird that swoops in fast. Wind and lightning bring it down.' },
    balloon: { name: 'Balloon Brute', icon: '🎈', hp: 30, speed: 0.8, dmg: 0, gold: 3, xp: 3, bite: 5, size: 1.4, fly: true, children: { type: 'brute', n: 1, fall: true }, res: { phys: 1.3, wind: 2, fire: 1.5 }, tip: 'A brute floating under balloons. Pop them and it drops onto the road, still angry.' },
    gargoyle: { name: 'Gargoyle', icon: '🗿', hp: 90, speed: 0.9, dmg: 14, gold: 5, xp: 6, bite: 4, size: 1.1, fly: true, res: { phys: 0.4, fire: 0.5, poison: 0, wind: 0.5, blast: 1.6, lightning: 1.3 }, tip: 'A flying stone statue. Arrows bounce off: rockets and lightning crack it.' },
    mummy: { name: 'Mummy', icon: '🧻', hp: 150, speed: 0.65, dmg: 18, gold: 6, xp: 7, bite: 4, size: 1.2, heavy: true, regen: 6, res: { fire: 1.8, light: 1.3, water: 0.7 }, tip: 'Heals itself as it walks, unless poisoned. Burn it!' },
    skeleton: { name: 'Skeleton', icon: '💀', hp: 36, speed: 1.6, dmg: 8, gold: 2, xp: 3, bite: 2, revive: 0.5, res: { phys: 0.6, frost: 0.5, poison: 0, blast: 1.5, light: 2 }, tip: 'Falls apart, then gets up again once. Bombs and light break bones; poison does nothing.' },
    giant: { name: 'Giant', icon: '🧌', hp: 800, speed: 0.42, dmg: 50, gold: 35, xp: 40, bite: 20, size: 2.1, heavy: true, stomp: { every: 6, r: 2.4, stun: 1 }, children: { type: 'brute', n: 2 }, res: { wind: 0.2, poison: 1.3 }, tip: 'Stomps towers still. Two brutes climb out when it falls.' },
    king: { name: 'Zombie King', icon: '👑', hp: 1800, speed: 0.4, dmg: 40, gold: 150, xp: 120, bite: 40, size: 2.4, heavy: true, boss: true, summon: { types: ['walker', 'runner'], n: 4, every: 6 }, children: { type: 'knight', n: 6 }, res: { lightning: 1.3, wind: 0.3 }, tip: 'A boss! It calls zombies to help, and knights jump out when it falls.' },
    witch: { name: 'Swamp Witch', icon: '🧙', hp: 2800, speed: 0.38, dmg: 25, gold: 250, xp: 180, bite: 60, size: 2.2, heavy: true, boss: true, fly: true, res: { phys: 0.6, light: 1.6, poison: 0.5, wind: 1.3 }, summon: { types: ['ghost', 'bat'], n: 4, every: 7 }, children: { type: 'ghost', n: 8 }, tip: 'A flying boss that calls ghosts and bats. Use light!' },
    colossus: { name: 'Colossus', icon: '🏔️', hp: 5200, speed: 0.32, dmg: 60, gold: 400, xp: 300, bite: 90, size: 3, heavy: true, boss: true, stomp: { every: 7, r: 2.8, stun: 1.2 }, summon: { types: ['runner', 'knight', 'shield'], n: 5, every: 8 }, children: { type: 'giant', n: 2 }, res: { phys: 0.7, blast: 1.4, water: 1.3, wind: 0 }, tip: 'Enormous and made of stone. Its stomps stop towers, and two giants climb out when it falls.' },
    dragon: { name: 'Bone Dragon', icon: '🐉', hp: 7800, speed: 0.36, dmg: 50, gold: 600, xp: 450, bite: 110, size: 2.6, heavy: true, boss: true, fly: true, res: { fire: 0, poison: 0, frost: 1.5, light: 1.5 }, breath: { every: 6, r: 4, stun: 1.4 }, summon: { types: ['bat', 'shadow'], n: 6, every: 6 }, children: { type: 'skeleton', n: 12 }, tip: 'A flying boss of bones. Its breath freezes towers; fire and poison do nothing.' },
    overlord: { name: 'Zombie Overlord', icon: '👹', hp: 15000, speed: 0.26, dmg: 99, gold: 1500, xp: 1000, bite: 9999, size: 3.4, heavy: true, boss: true, stomp: { every: 8, r: 3.2, stun: 1.5 }, summon: { types: ['brute', 'mummy', 'shadow', 'knight'], n: 6, every: 6 }, children: { type: 'giant', n: 3 }, res: { phys: 0.8, poison: 0.6, wind: 0, light: 1.3 }, tip: 'The last boss. If it reaches the castle, the castle falls.' }
  };
  const ZOMBIE_ORDER = Object.keys(ZOMBIES);
  // from round 30 zombies get tougher round by round (and faster after round 80); late rounds send fewer zombies
  // than they used to, each much tougher (elite from round 50, champions from round 80), so big games stay smooth
  const hpRound = (r) => (r <= 30 ? 1 : 1 + (r - 30) * 0.024 + Math.max(0, r - 40) * 0.022 + Math.max(0, r - 100) * 0.06);
  // bosses come one at a time as before, so they grow as before
  const hpBoss = (r) => (r <= 30 ? 1 : 1 + (r - 30) * 0.024 + Math.max(0, r - 100) * 0.04);
  const speedRound = (r) => (r <= 80 ? 1 : Math.min(1.6, 1 + (r - 80) * 0.01));
  const eliteOf = (r) => (r >= 80 ? 2 : r >= 50 ? 1 : 0);

  /* ---- random numbers: mulberry32, the seed kept in the state so a game can be replayed ---- */
  function rngNext(s) {
    s.rng = (s.rng + 0x6D2B79F5) | 0;
    let t = s.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const rnd = (s, a, b) => a + (b - a) * rngNext(s);
  const dist2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);

  /* ---- stats with upgrades: MUL keys multiply (or set, when the value is not there yet), ADD keys add, the rest
     are set ---- */
  const MUL = new Set(['dmg', 'rate', 'range', 'speed', 'splash', 'burnDps', 'burnT', 'slowT', 'hp', 'heal', 'spikes', 'spikeDmg', 'poolDps', 'pulseDmg', 'fireballDmg', 'meteorDmg', 'knock', 'jumpRange', 'push', 'cloudR', 'cloudT']);
  const ADD = new Set(['pierce', 'jumps', 'income', 'buffRate', 'buffRange', 'buffDmg', 'mend', 'killBonus', 'woodPer', 'stonePer']);
  function applyMods(st, mods) {
    for (const k of Object.keys(mods)) {
      const v = mods[k];
      if (MUL.has(k)) st[k] = st[k] ? st[k] * v : v;
      else if (ADD.has(k)) st[k] = (st[k] || 0) + v;
      else st[k] = v;
    }
    return st;
  }
  const BASE_KEYS = ['kind', 'type', 'dmg', 'rate', 'range', 'min', 'pierce', 'speed', 'splash', 'shots', 'spread', 'arc', 'jumps', 'jumpRange', 'falloff', 'burnDps', 'burnT', 'slowF', 'slowT', 'camo', 'hp', 'income', 'heal', 'buffRate', 'spikes', 'spikeDmg', 'road', 'knock', 'mode', 'hits', 'homing', 'digs', 'push', 'cloudR', 'cloudT', 'camoAura', 'woodPer', 'stonePer', 'stun', 'combo', 'zap', 'vsAir', 'acidDps', 'acidT', 'poisonT'];
  function baseStats(U) { const st = {}; for (const k of BASE_KEYS) if (U[k] != null) st[k] = U[k]; return st; }
  // a weapon at a level: its base, the tiers it has reached (every 5 levels) and 2.5% more damage per level
  const wsCache = {};
  function weaponStats(w, lvl) {
    const key = w + ':' + lvl;
    if (wsCache[key]) return wsCache[key];
    const W = WEAPONS[w] || WEAPONS.blaster, st = baseStats(W), tiers = Math.min(4, Math.floor(lvl / 5));
    for (let k = 0; k < tiers; k++) applyMods(st, W.tiers[k].mods);
    // a crew member helps the towers rather than replacing them: weapons hit at WEAPON_POWER, plus 2.5% a level
    const k = WEAPON_POWER * (1 + 0.025 * (lvl - 1));
    st.dmg = (st.dmg || 0) * k;
    if (st.burnDps) st.burnDps *= k;
    st.tier = tiers; st.name = tiers ? W.tiers[tiers - 1].name : W.name;
    st.camo = true;   // a player can always see shadow zombies
    return (wsCache[key] = st);
  }
  const xpNeed = (lvl) => Math.round(14 * Math.pow(1.18, lvl));

  /* ================= the map ================= */
  // def: { id, name, w, h, theme, seed, paths: [[[x, y], ...], ...], water: [{ lake: [x, y, r] } | { rect: [x0, y0, x1, y1] } |
  //   { river: [[x, y], ...], width }], trees, rocks, woods: [[x0, y0, x1, y1, density]] }. w and h are odd; the castle
  // fills the 5 x 5 tiles in the middle; every path runs in straight lines from a gate on the map's edge to a door
  // tile beside the castle (the middle of one of its sides, 3 tiles out).
  function makeMap(def) {
    const w = def.w, h = def.h, cx = (w - 1) / 2, cz = (h - 1) / 2, R = { rng: (def.seed || 7) | 0 };
    const tiles = new Uint8Array(w * h).fill(T.GRASS), hgt = new Float32Array(w * h), life = new Uint8Array(w * h);
    const at = (x, y) => y * w + x, inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
    for (let i = 0; i < w * h; i++) hgt[i] = rnd(R, 0, 0.08);
    // water
    const wet = (x, y) => { if (inside(x, y)) tiles[at(x, y)] = T.WATER; };
    for (const wb of def.water || []) {
      if (wb.lake) { const [lx, ly, lr] = wb.lake; for (let y = Math.floor(ly - lr - 1); y <= ly + lr + 1; y++) for (let x = Math.floor(lx - lr - 1); x <= lx + lr + 1; x++) if (Math.hypot(x - lx, y - ly) <= lr + rnd(R, -0.35, 0.35)) wet(x, y); }
      if (wb.rect) { const [x0, y0, x1, y1] = wb.rect; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) wet(x, y); }
      if (wb.river) {
        const wd = wb.width || 2;
        for (let j = 1; j < wb.river.length; j++) {
          const [ax, ay] = wb.river[j - 1], [bx, by] = wb.river[j], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
          for (let k = 0; k <= n; k++) { const x = Math.round(ax + (bx - ax) * k / n), y = Math.round(ay + (by - ay) * k / n); for (let a = 0; a < wd; a++) for (let b = 0; b < wd; b++) wet(x + a - (wd >> 1), y + b - (wd >> 1)); }
        }
      }
    }
    // dry ground all round the castle, so a player can always walk out of its doors
    for (let y = cz - 4; y <= cz + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) if (inside(x, y) && tiles[at(x, y)] === T.WATER) tiles[at(x, y)] = T.GRASS;
    // the castle
    for (let y = cz - 2; y <= cz + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) tiles[at(x, y)] = T.CASTLE;
    // roads: each path's tiles in order; over water a road is a bridge; the first tile is the gate
    const keep = new Uint8Array(w * h), spawns = [], paths = [];
    for (let y = cz - 3; y <= cz + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) if (inside(x, y)) keep[at(x, y)] = 1;
    def.paths.forEach((pts, k) => {
      const tl = [];
      for (let j = 0; j < pts.length; j++) {
        if (j === 0) { tl.push(at(pts[0][0], pts[0][1])); continue; }
        const [ax, ay] = pts[j - 1], [bx, by] = pts[j], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
        for (let q = 1; q <= n; q++) tl.push(at(ax + Math.sign(bx - ax) * q, ay + Math.sign(by - ay) * q));
      }
      for (const i of tl) {
        tiles[i] = tiles[i] === T.WATER || tiles[i] === T.BRIDGE ? T.BRIDGE : T.DIRT;
        const x = i % w, y = (i - x) / w;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inside(x + dx, y + dy)) keep[at(x + dx, y + dy)] = 1;
      }
      tiles[tl[0]] = T.SPAWN;
      const sx = pts[0][0], sy = pts[0][1];
      spawns.push({ key: 'G' + (k + 1), x: sx, y: sy });
      // the walk: tile centres, the last one pushed half a tile on into the castle's wall
      const P = pts.map(([x, y]) => [x + 0.5, y + 0.5]);
      const last = P[P.length - 1], prev = P[P.length - 2], ux = Math.sign(last[0] - prev[0]), uz = Math.sign(last[1] - prev[1]);
      P.push([last[0] + ux * 0.5, last[1] + uz * 0.5]);
      const road = linePath(P);
      // where each road tile sits along the walk (barricades and traps)
      road.tileD = new Map();
      let d = 0;
      for (let j = 0; j < tl.length; j++) { if (!road.tileD.has(tl[j])) road.tileD.set(tl[j], d); d += 1; }
      road.tiles = tl;
      // fliers go straight from the gate to the middle of the castle
      const fly = linePath([[sx + 0.5, sy + 0.5], [cx + 0.5, cz + 0.5]]);
      paths.push({ road: road, fly: fly });
    });
    // sand beside water
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = at(x, y);
      if (tiles[i] !== T.GRASS) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (tiles[at(x + dx, y + dy)] === T.WATER && rngNext(R) < 0.75) { tiles[i] = T.SAND; break; }
    }
    // woods and rocks on free land, never right beside a road or the castle
    const free = (i) => (tiles[i] === T.GRASS || tiles[i] === T.SAND) && !keep[i];
    const scatter = (density, tile, cluster, x0, y0, x1, y1) => {
      const room = (x1 - x0 + 1) * (y1 - y0 + 1), want = Math.round(room * density);
      let placed = 0, guard = 0;
      while (placed < want && guard++ < want * 40) {
        let x = Math.round(rnd(R, x0, x1)), y = Math.round(rnd(R, y0, y1));
        const n = Math.round(rnd(R, 2, cluster));
        for (let k = 0; k < n && placed < want; k++) {
          if (inside(x, y) && free(at(x, y))) { tiles[at(x, y)] = tile; placed++; }
          x += Math.round(rnd(R, -1, 1)); y += Math.round(rnd(R, -1, 1));
          if (!inside(x, y)) break;
        }
      }
    };
    for (const wd of def.woods || []) scatter(wd[4], T.TREE, 9, wd[0], wd[1], wd[2], wd[3]);
    scatter(def.trees == null ? 0.08 : def.trees, T.TREE, 8, 0, 0, w - 1, h - 1);
    scatter(def.rocks == null ? 0.03 : def.rocks, T.ROCK, 5, 0, 0, w - 1, h - 1);
    for (let i = 0; i < w * h; i++) life[i] = tiles[i] === T.TREE ? 3 : tiles[i] === T.ROCK ? 4 : 0;
    return { id: def.id, name: def.name, theme: def.theme || 'meadow', w: w, h: h, cx: cx, cz: cz, c: cx, tiles: tiles, hgt: hgt, life: life, spawns: spawns, paths: paths, seed: def.seed || 7 };
  }
  // a walk along points: lengths and the running total, for "where is a zombie d tiles along"
  function linePath(P) {
    const cum = [0];
    for (let j = 1; j < P.length; j++) cum.push(cum[j - 1] + Math.hypot(P[j][0] - P[j - 1][0], P[j][1] - P[j - 1][1]));
    return { pts: P, cum: cum, len: cum[cum.length - 1] };
  }
  // the point d along a walk and the way it faces: [x, z, dirX, dirZ, segment]
  function pathAt(L, d, hint) {
    const P = L.pts, cum = L.cum;
    let j = Math.max(1, Math.min(P.length - 1, hint || 1));
    while (j < P.length - 1 && d > cum[j]) j++;
    while (j > 1 && d < cum[j - 1]) j--;
    const a = P[j - 1], b = P[j], sl = cum[j] - cum[j - 1] || 1, t = (d - cum[j - 1]) / sl;
    const ux = (b[0] - a[0]) / sl, uz = (b[1] - a[1]) / sl;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, ux, uz, j];
  }
  const tileAt = (m, x, z) => (x < 0 || z < 0 || x >= m.w || z >= m.h ? T.WATER : m.tiles[(z | 0) * m.w + (x | 0)]);
  // the door a crew member starts at and comes back to (four doors, one per player slot), just off the castle
  function gatePoint(map, k) {
    const x = map.cx + 0.5, z = map.cz + 0.5, d = [[0, 3.4], [0, -3.4], [3.4, 0], [-3.4, 0]][k % 4];
    return { x: x + d[0], z: z + d[1] };
  }

  /* ================= a new game ================= */
  // o: { map: a map's data, rounds: content/rounds.json's list, diff, crew: [{ id, name, slot, weapon }], seed }
  function newGame(o) {
    const map = makeMap(o.map), D = DIFFS[o.diff] || DIFFS.medium, n = Math.max(1, o.crew.length);
    const s = {
      v: 2, mapId: o.map.id, diff: DIFFS[o.diff] ? o.diff : 'medium', D: D, rounds: o.rounds || [], seed: o.seed | 0, rng: (o.seed | 0) ^ 0x5bd1e995,
      t: 0, tick: 0, nextId: 1, map: map, occ: new Int16Array(map.w * map.h), castle: { x: map.cx + 0.5, z: map.cz + 0.5 },
      res: { wood: D.wood, stone: D.stone }, felled: [], lives: D.lives, maxLives: D.lives, tierHp: TIER_HP[o.map.tier] || 1, crewN: n, players: [], zombies: [], towers: [], shots: [], foes: [], pools: [],
      round: 0, wave: { state: 'wait', timer: 0, groups: [] }, autoStart: true, freeplay: false, wonAt: 0, gateK: 0,
      blocks: map.paths.map(() => []), traps: map.paths.map(() => []), tmap: new Map(),
      result: '', stats: { kills: 0, built: 0, leaked: 0, chopped: 0, mined: 0, spent: 0, pdmg: 0, tdmg: 0 }
    };
    crewScale(s);
    o.crew.forEach((c, k) => s.players.push(newPlayer(s, c, c.slot != null ? c.slot : k)));
    return s;
  }
  // more players: more zombies (and more coins from them), split between the crew
  function crewScale(s) {
    const n = Math.max(1, s.players.length || s.crewN);
    s.crewN = n; s.countMul = 1 + 0.35 * (n - 1); s.hpMul = 1 + 0.12 * (n - 1); s.share = (1 + 0.5 * (n - 1)) / n;
  }
  function newPlayer(s, c, slot) {
    const g = gatePoint(s.map, slot), f = freeSpot(s, g.x, g.z), w = WEAPONS[c.weapon] ? c.weapon : 'blaster';
    return { id: c.id, slot: slot, name: c.name || 'Player ' + (slot + 1), x: f[0], z: f[1], rot: 0, hp: 100, max: 100, weapon: w, wlvl: 1, wxp: 0, st: weaponStats(w, 1),
      coins: c.coins != null ? c.coins : Math.round((s.D.start || START_COINS) * (s.share || 1)), cd: 0, down: 0, fire: false, act: '', actT: 0, gather: -1, gatherT: 0, kills: 0 };
  }
  // a crew member joins a game that is already running, or leaves it
  function addPlayer(s, c) {
    const had = s.players.find((q) => q.id === c.id);
    if (had) return had;
    const used = new Set(s.players.map((q) => q.slot));
    let slot = c.slot != null && !used.has(c.slot) ? c.slot : 0;
    while (used.has(slot)) slot++;
    const p = newPlayer(s, c, slot);
    if (s.saved && s.saved[slot]) Object.assign(p, s.saved[slot], { st: weaponStats(s.saved[slot].weapon, s.saved[slot].wlvl) }), delete s.saved[slot];
    s.players.push(p);
    crewScale(s);
    return p;
  }
  function removePlayer(s, id) { s.players = s.players.filter((q) => q.id !== id); crewScale(s); }

  /* ================= movement ================= */
  // a circle of radius r moves by (dx, dz) and slides along blocked tiles. solid(x, z) tells which tiles block.
  // A tile it already overlaps (a tower built at its edge, a revive beside one) lets it move out, never deeper in.
  // Returns [x, z, the index of the tile it pushed against or -1].
  function moveCircle(s, x, z, dx, dz, r, solid) {
    let hit = -1;
    const m = s.map;
    const gap2 = (px, pz, tx, tz) => { const cx = Math.max(tx, Math.min(px, tx + 1)), cz = Math.max(tz, Math.min(pz, tz + 1)); return (px - cx) * (px - cx) + (pz - cz) * (pz - cz); };
    const tryAxis = (ox, oz, nx, nz) => {
      const x0 = Math.floor(nx - r), x1 = Math.floor(nx + r), z0 = Math.floor(nz - r), z1 = Math.floor(nz + r);
      for (let tz = z0; tz <= z1; tz++) for (let tx = x0; tx <= x1; tx++) {
        if (!solid(tx, tz)) continue;
        const d2 = gap2(nx, nz, tx, tz);
        if (d2 >= r * r - 1e-6) continue;
        const o2 = gap2(ox, oz, tx, tz);
        if (o2 < r * r - 1e-6 && d2 >= o2 - 1e-9) continue;
        if (tx >= 0 && tz >= 0 && tx < m.w && tz < m.h) hit = tz * m.w + tx;
        return false;
      }
      return true;
    };
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / (r * 0.8)));
    for (let k = 0; k < steps; k++) {
      const sx = dx / steps, sz = dz / steps;
      if (tryAxis(x, z, x + sx, z)) x += sx;
      if (tryAxis(x, z, x, z + sz)) z += sz;
    }
    return [x, z, hit];
  }
  // a player's solid tiles: water, trees, rocks, the castle, the map's edge (a player walks through towers, so towers
  // can never shut anyone in)
  const playerSolid = (s) => (tx, tz) => {
    const m = s.map;
    if (tx < 0 || tz < 0 || tx >= m.w || tz >= m.h) return true;
    return !WALK[m.tiles[tz * m.w + tx]];
  };
  function movePlayer(s, p, dx, dz) {
    const r = moveCircle(s, p.x, p.z, dx, dz, 0.32, playerSolid(s));
    p.x = r[0]; p.z = r[1];
    return r[2];
  }
  // the centre of the nearest walkable, empty tile to (x, z)
  function freeSpot(s, x, z) {
    const m = s.map;
    for (let r = 0; r < 6; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const tx = (x | 0) + dx, tz = (z | 0) + dz;
      if (tx < 1 || tz < 1 || tx >= m.w - 1 || tz >= m.h - 1) continue;
      const i = tz * m.w + tx;
      if (WALK[m.tiles[i]] && !s.occ[i]) return r === 0 ? [x, z] : [tx + 0.5, tz + 0.5];
    }
    return [x, z];
  }
  function castleDist(s, x, z) {
    const c = s.castle, nx = Math.max(c.x - CASTLE_R, Math.min(x, c.x + CASTLE_R)), nz = Math.max(c.z - CASTLE_R, Math.min(z, c.z + CASTLE_R));
    return Math.sqrt(dist2(x, z, nx, nz));
  }
  function turnTo(a, b, k) {
    const d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    if (Math.abs(d) < k) return b;
    return a + Math.sign(d) * k;
  }

  /* ================= zombies ================= */
  // a zombie on gate g's road (or its flying line), d tiles along it
  function spawnZombie(s, type, g, d, ev, off) {
    const Z = ZOMBIES[type], elite = Z.boss ? 0 : eliteOf(s.round);
    const mul = (Z.boss ? 1 + 0.5 * (s.crewN - 1) : s.hpMul) * s.tierHp * ELITE_HP[elite], hp = Math.max(1, Math.round(Z.hp * s.D.hp * (Z.boss ? hpBoss : hpRound)(s.round) * mul));
    const zb = { id: s.nextId++, type: type, g: g, fly: !!Z.fly, d: d, seg: 1, off: off != null ? off : (Z.boss ? 0 : rnd(s, -0.26, 0.26)), x: 0, z: 0, rot: 0, hp: hp, max: hp, r: 0.3 * (Z.size || 1),
      slowT: 0, slowF: 1, burnT: 0, burnD: 0, acidT: 0, acidD: 0, poisonT: 0, pushCd: 0, stunT: 0, frozen: 0, brittleT: 0, stopCd: 0, atk: 0, act: '', actT: 0, hitT: 0, elite: elite,
      under: Z.dig ? 1 : 0, sumT: Z.summon ? Z.summon.every * 0.6 : 0, stompT: Z.stomp ? Z.stomp.every * 0.7 : 0, breathT: Z.breath ? Z.breath.every * 0.7 : 0, spitT: 0, bones: 0, rev: 0, traps: null };
    placeZombie(s, zb);
    s.zombies.push(zb);
    if (ev) ev.push({ e: 'spawn', id: zb.id, z: type, x: r2(zb.x), y: r2(zb.z) });
    return zb;
  }
  const walkOf = (s, zb) => s.map.paths[zb.g].road;
  function placeZombie(s, zb) {
    const L = walkOf(s, zb), q = pathAt(L, zb.d, zb.seg);
    zb.seg = q[4];
    zb.x = q[0] - q[3] * zb.off; zb.z = q[1] + q[2] * zb.off;
    zb.rot = Math.atan2(q[2], q[3]);
  }
  // zombies called or released by another: same gate, as far along as it (a flier's walkers go on its road)
  function spawnFrom(s, parent, type, n, ev, spread) {
    for (let k = 0; k < n; k++) {
      const Z = ZOMBIES[type], d = Math.max(0, parent.d - k * (spread || 0.35));
      const zb = spawnZombie(s, type, parent.g, d, ev);
      if (Z.dig) zb.under = 0;
    }
  }
  // the zombies in reach, best first. mode: first (nearest the castle), last, close, strong. camo: can it see shadows;
  // who: the attack's stats, for which zombies it can hit (fliers, walkers, diggers under the road)
  function pickTarget(s, x, z, range, minRange, mode, camo, near, skip, who) {
    let best = null, bv = -1e18;
    const list = range > 30 ? s.zombies : near(x, z, range);
    for (const zb of list) {
      if (zb.hp <= 0 || zb.bones > 0 || (ZOMBIES[zb.type].camo && !camo) || (skip && skip.has(zb))) continue;
      if (who ? !canHit(who, zb) : zb.under) continue;
      const d2 = dist2(zb.x, zb.z, x, z);
      if (d2 > range * range || (minRange && d2 < minRange * minRange)) continue;
      const left = walkOf(s, zb).len - zb.d;
      const v = mode === 'last' ? left : mode === 'close' ? -d2 : mode === 'strong' ? zb.hp * 1000 - left : -left;
      if (v > bv) { bv = v; best = zb; }
    }
    return best;
  }

  /* ---- damage ---- */
  // fx: { from: [x, z], by, burn: [dps, t], slow: [f, t], stun, freeze, brittle, acid: [dps, t], stop, armor, blue, knock,
  // push (wind: back down the road, fliers further), vsAir, poisonT, digs (reaches under the road and flushes diggers) }
  function hurtZombie(s, zb, amount, type, ev, fx) {
    if (zb.hp <= 0 || zb.bones > 0) return 0;
    if (zb.under) { if (!fx || !fx.digs) return 0; zb.under = 0; ev.push({ e: 'emerge', id: zb.id, x: r2(zb.x), y: r2(zb.z) }); }
    const Z = ZOMBIES[zb.type];
    if (Z.shield && Z.shield.blocks[type] && fx && fx.from) {
      const a = Math.atan2(fx.from[0] - zb.x, fx.from[1] - zb.z), diff = Math.abs(((a - zb.rot + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff < (Z.shield.arc / 2) * Math.PI / 180) { if (rngNext(s) < 0.3) ev.push({ e: 'block', x: r2(zb.x), y: r2(zb.z) }); return 0; }
    }
    let mul = type === 'pure' ? 1 : Z.res && Z.res[type] != null ? Z.res[type] : 1;
    if (fx && fx.armor && type === 'phys') mul = Math.max(mul, 1);
    if (fx && fx.blue && type === 'fire') mul = Math.max(mul, 0.6);
    if (zb.brittleT > 0) mul *= 1.3;
    if (fx && fx.vsAir && zb.fly) mul *= fx.vsAir;
    const d = amount * mul;
    if (d <= 0) { if (rngNext(s) < 0.2) ev.push({ e: 'immune', x: r2(zb.x), y: r2(zb.z) }); return 0; }
    const dealt = Math.min(d, zb.hp);
    zb.hp -= d;
    if (fx && fx.by != null) { if (typeof fx.by === 'string') s.stats.pdmg += dealt; else { s.stats.tdmg += dealt; const t = s.tmap.get(fx.by); if (t) t.done += dealt; } }
    if (d >= 1) zb.hitT = 0.15;
    if (fx) {
      const tough = Z.boss ? 0 : Z.heavy ? 0.5 : 1;
      if (fx.slow && !Z.noSlow && mul > 0) { zb.slowT = Math.max(zb.slowT, fx.slow[1]); zb.slowF = Math.min(zb.slowF, 1 - fx.slow[0] * (Z.boss ? 0.5 : 1)); }
      if (fx.burn && !Z.noBurn && mul > 0) { zb.burnT = Math.max(zb.burnT, fx.burn[1]); zb.burnD = Math.max(zb.burnD, fx.burn[0] * (fx.blue ? Math.max(mul, 0.6) : mul)); }
      if (fx.acid) { zb.acidT = Math.max(zb.acidT, fx.acid[1]); zb.acidD = Math.max(zb.acidD, fx.acid[0]); }
      if (fx.brittle) zb.brittleT = Math.max(zb.brittleT, fx.brittle);
      if (fx.stun && tough) zb.stunT = Math.max(zb.stunT, fx.stun * tough);
      if (fx.freeze && tough && !Z.noSlow) { zb.stunT = Math.max(zb.stunT, fx.freeze * tough); zb.frozen = Math.max(zb.frozen, fx.freeze * tough); }
      if (fx.stop && tough && zb.stopCd <= 0) { zb.stunT = Math.max(zb.stunT, fx.stop * tough); zb.stopCd = 3; }
      if (fx.knock && !Z.heavy && !zb.fly) zb.d = Math.max(0, zb.d - fx.knock);
      // a push once in a while: wind towers side by side can slow a zombie down but never hold it for ever
      if (fx.push && !Z.heavy && zb.pushCd <= 0) { zb.d = Math.max(0, zb.d - fx.push * (zb.fly ? 1.6 : 1) * Math.min(1, Z.res && Z.res.wind != null ? Z.res.wind : 1)); zb.pushCd = 1.5; }
      if ((fx.poisonT || type === 'poison') && mul > 0) zb.poisonT = Math.max(zb.poisonT, fx.poisonT || 1.5);
    }
    if (zb.hp <= 0) killZombie(s, zb, ev, fx && fx.by);
    return d;
  }
  function killZombie(s, zb, ev, by) {
    const Z = ZOMBIES[zb.type];
    if (Z.revive && !zb.rev) { zb.rev = 1; zb.hp = 0.01; zb.bones = 2; ev.push({ e: 'bones', id: zb.id, x: r2(zb.x), y: r2(zb.z) }); return; }
    zb.hp = 0;
    s.stats.kills++;
    // fewer, tougher zombies late on: an elite (glowing) one is worth more
    let gold = Math.round(Z.gold * GOLD_MUL * (1 + ELITE_GOLD * (zb.elite || 0)));
    // a lucky gold mine nearby adds a coin
    for (const t of s.towers) if (t.st.killBonus && dist2(t.x, t.z, zb.x, zb.z) < t.st.killR * t.st.killR) gold += t.st.killBonus;
    earn(s, gold);
    ev.push({ e: 'die', id: zb.id, z: zb.type, x: r2(zb.x), y: r2(zb.z), g: gold });
    // experience for the weapon: whole for a zombie its player finished off, part for one that player's tower did
    const own = by != null && typeof by === 'string', t = !own && by != null ? s.tmap.get(by) : null;
    const p = own ? s.players.find((q) => q.id === by) : t ? s.players.find((q) => q.id === t.by) : null;
    if (p) { if (own) p.kills++; gainXp(s, p, Z.xp * (1 + s.round / 100) * (own ? 1 : TOWER_XP), ev); }
    if (Z.split) spawnFrom(s, zb, Z.split.type, Z.split.n, ev, 0.3);
    if (Z.children) { if (Z.children.fall) ev.push({ e: 'drop', id: zb.id, x: r2(zb.x), y: r2(zb.z) }); spawnFrom(s, zb, Z.children.type, Z.children.n, ev, 0.45); }
    if (Z.explode) explode(s, zb.x, zb.z, Z.explode, ev);
  }
  // a bomber going off: hurts zombies (good), jams towers and hurts the crew close by (bad)
  function explode(s, x, z, X, ev) {
    ev.push({ e: 'boom', x: r2(x), y: r2(z), r: X.r });
    for (const o of s.zombies) if (o.hp > 0 && dist2(o.x, o.z, x, z) < X.r * X.r) hurtZombie(s, o, X.dmg, 'blast', ev, { from: [x, z] });
    for (const t of s.towers) if (dist2(t.x, t.z, x, z) < (X.r + 0.4) * (X.r + 0.4)) stunTower(s, t, X.stun, ev);
    for (const p of s.players) if (!p.down && dist2(p.x, p.z, x, z) < X.r * X.r) hurtPlayer(s, p, 20, ev);
  }
  function stunTower(s, t, sec, ev) {
    const k = t.st.kind;
    if (k === 'wall' || k === 'trap' || k === 'mine' || k === 'mill') return;
    if (t.stun < sec) { t.stun = sec; ev.push({ e: 'jam', id: t.id, x: t.x, y: t.z }); }
  }
  function hurtPlayer(s, p, d, ev) {
    if (p.down) return;
    p.hp -= d;
    ev.push({ e: 'ouch', id: p.id, d: Math.round(d) });
    if (p.hp <= 0) { p.hp = 0; p.down = s.towers.some((t) => t.st.revive) ? 2 : 5; ev.push({ e: 'down', id: p.id, x: r2(p.x), y: r2(p.z) }); }
  }
  // coins: zombies' gold and round bonuses go to the whole crew in equal shares; a mine pays its builder
  function earn(s, amount, who) {
    if (!amount) return;
    if (who) { const p = s.players.find((q) => q.id === who); if (p) { p.coins += amount; return; } }
    const n = s.players.length || 1, each = amount * (n > 1 ? s.share : 1);
    for (const p of s.players) p.coins += each;
  }
  function gainXp(s, p, xp, ev) {
    if (p.wlvl >= MAX_LEVEL) return;
    p.wxp += xp;
    while (p.wlvl < MAX_LEVEL && p.wxp >= xpNeed(p.wlvl)) {
      p.wxp -= xpNeed(p.wlvl); p.wlvl++;
      p.st = weaponStats(p.weapon, p.wlvl);
      const tier = p.wlvl % 5 === 0 && p.wlvl <= 20 ? p.wlvl / 5 : 0;
      ev.push({ e: 'lvl', id: p.id, lvl: p.wlvl, tier: tier, name: tier ? WEAPONS[p.weapon].tiers[tier - 1].name : '' });
    }
  }

  /* ---- each zombie, each tick ---- */
  function stepZombie(s, zb, dt, ev, near) {
    const Z = ZOMBIES[zb.type];
    if (zb.hitT > 0) zb.hitT -= dt;
    if (zb.bones > 0) {
      zb.bones -= dt;
      if (zb.bones <= 0) { zb.hp = Math.max(1, zb.max * Z.revive); ev.push({ e: 'revive', id: zb.id, x: r2(zb.x), y: r2(zb.z) }); }
      return;
    }
    // burning, melting, slowed, brittle, stuck
    if (zb.burnT > 0) { zb.burnT -= dt; hurtZombie(s, zb, zb.burnD * dt, 'fire', ev, null); if (zb.hp <= 0 || zb.bones > 0) return; }
    if (zb.acidT > 0) { zb.acidT -= dt; hurtZombie(s, zb, zb.acidD * dt, 'pure', ev, null); if (zb.hp <= 0 || zb.bones > 0) return; }
    if (zb.slowT > 0) { zb.slowT -= dt; if (zb.slowT <= 0) zb.slowF = 1; }
    if (zb.brittleT > 0) zb.brittleT -= dt;
    if (zb.stopCd > 0) zb.stopCd -= dt;
    if (zb.poisonT > 0) zb.poisonT -= dt;
    if (zb.pushCd > 0) zb.pushCd -= dt;
    if (Z.regen && zb.burnT <= 0 && zb.poisonT <= 0 && zb.hp < zb.max) zb.hp = Math.min(zb.max, zb.hp + Z.regen * hpRound(s.round) * dt);
    // a shaman heals its friends; bosses call helpers, stomp and breathe
    if (Z.heal) for (const o of near(zb.x, zb.z, Z.heal.r)) if (o.hp > 0 && o.hp < o.max && !o.bones && o.poisonT <= 0) { o.hp = Math.min(o.max, o.hp + Z.heal.hps * hpRound(s.round) * dt); if (rngNext(s) < dt * 2) ev.push({ e: 'heal', x: r2(o.x), y: r2(o.z) }); }
    if (Z.summon && !zb.under) { zb.sumT -= dt; if (zb.sumT <= 0 && s.zombies.length < MAX_ALIVE + 15) { zb.sumT = Z.summon.every; for (let k = 0; k < Z.summon.n; k++) spawnFrom(s, zb, Z.summon.types[k % Z.summon.types.length], 1, ev, 0); ev.push({ e: 'summon', x: r2(zb.x), y: r2(zb.z) }); } }
    if (Z.stomp) { zb.stompT -= dt; if (zb.stompT <= 0) { zb.stompT = Z.stomp.every; ev.push({ e: 'stomp', x: r2(zb.x), y: r2(zb.z), r: Z.stomp.r }); for (const t of s.towers) if (dist2(t.x, t.z, zb.x, zb.z) < Z.stomp.r * Z.stomp.r) stunTower(s, t, Z.stomp.stun, ev); for (const p of s.players) if (!p.down && dist2(p.x, p.z, zb.x, zb.z) < Z.stomp.r * Z.stomp.r) hurtPlayer(s, p, 25, ev); } }
    if (Z.breath) { zb.breathT -= dt; if (zb.breathT <= 0) { zb.breathT = Z.breath.every; ev.push({ e: 'breath', id: zb.id, x: r2(zb.x), y: r2(zb.z), a: r2(zb.rot), r: Z.breath.r }); for (const t of s.towers) if (dist2(t.x, t.z, zb.x, zb.z) < Z.breath.r * Z.breath.r) stunTower(s, t, Z.breath.stun, ev); } }
    // spitters spit slime at a tower (it jams) or a crew member as they walk
    if (Z.ranged && !zb.under) {
      zb.spitT -= dt;
      if (zb.spitT <= 0) {
        let aim = null, ad = Z.ranged.range * Z.ranged.range;
        for (const t of s.towers) { const k = t.st.kind; if (k === 'wall' || k === 'trap' || k === 'mine' || k === 'mill') continue; const d2 = dist2(t.x, t.z, zb.x, zb.z); if (d2 < ad) { ad = d2; aim = t; } }
        for (const p of s.players) { if (p.down) continue; const d2 = dist2(p.x, p.z, zb.x, zb.z); if (d2 < ad) { ad = d2; aim = p; } }
        if (aim) {
          zb.spitT = 1 / Z.ranged.rate;
          const dd = Math.max(0.1, Math.sqrt(ad)), sp = Z.ranged.speed;
          s.foes.push({ x: zb.x, z: zb.z, vx: (aim.x - zb.x) / dd * sp, vz: (aim.z - zb.z) / dd * sp, life: dd / sp + 0.15, dmg: Z.dmg, stun: Z.ranged.stun });
          ev.push({ e: 'spit', x: r2(zb.x), y: r2(zb.z), tx: r2(aim.x), ty: r2(aim.z), sp: sp });
        } else zb.spitT = 0.4;
      }
    }
    if (zb.frozen > 0) zb.frozen -= dt;
    if (zb.stunT > 0) { zb.stunT -= dt; return; }
    zb.atk = Math.max(0, zb.atk - dt);
    if (zb.actT > 0) zb.actT -= dt;
    const L = walkOf(s, zb);
    let speed = (zb.under ? Z.dig.speed : Z.speed) * PACE * s.D.speed * speedRound(s.round) * (zb.slowT > 0 ? zb.slowF : 1);
    // walkers stop for a crew member in the way, and for a barricade on their road
    if (!zb.fly && !zb.under && !Z.boss) {
      for (const p of s.players) {
        if (p.down || dist2(p.x, p.z, zb.x, zb.z) > (zb.r + 0.42) * (zb.r + 0.42)) continue;
        zb.rot = turnTo(zb.rot, Math.atan2(p.x - zb.x, p.z - zb.z), dt * 8);
        if (zb.atk <= 0) { zb.atk = 1; zb.act = 'hit'; zb.actT = 0.3; hurtPlayer(s, p, Z.dmg, ev); ev.push({ e: 'bite', id: zb.id }); }
        return;
      }
      for (const b of s.blocks[zb.g]) {
        const stop = b.d - 0.5 - zb.r - 0.05;
        if (b.t.hp <= 0 || zb.d > stop + 0.6) continue;
        if (zb.d + speed * dt < stop) break;
        zb.d = Math.max(zb.d, stop);
        placeZombie(s, zb);
        if (zb.atk <= 0) {
          zb.atk = 1; zb.act = 'hit'; zb.actT = 0.3;
          hurtWall(s, b.t, Z.dmg * (Z.boss ? 3 : 1), ev);
          if (b.t.st.thorns) hurtZombie(s, zb, b.t.st.thorns, 'pure', ev, null);
          ev.push({ e: 'bite', id: zb.id });
        }
        return;
      }
    }
    // walk on
    const d0 = zb.d;
    zb.d += speed * dt;
    // spike traps passed this tick
    if (!zb.fly && !zb.under) for (const tr of s.traps[zb.g]) if (tr.d > d0 && tr.d <= zb.d && tr.t.spikes > 0) springTrap(s, tr.t, zb, ev);
    if (zb.under && L.len - zb.d <= Z.dig.pop) { zb.under = 0; ev.push({ e: 'emerge', id: zb.id, x: r2(zb.x), y: r2(zb.z) }); }
    if (zb.d >= L.len) {
      // into the castle
      const bite = Z.bite;
      s.lives -= bite; s.stats.leaked += bite;
      zb.hp = 0;
      ev.push({ e: 'leak', id: zb.id, z: zb.type, x: r2(zb.x), y: r2(zb.z), n: bite });
      return;
    }
    placeZombie(s, zb);
  }
  function springTrap(s, t, zb, ev) {
    const st = t.st;
    t.spikes--;
    const fx = { by: t.id, armor: st.armor, slow: st.slowF ? [st.slowF, st.slowT] : null, from: [t.x, t.z] };
    if (st.explode) {
      ev.push({ e: 'boom', x: r2(zb.x), y: r2(zb.z), r: st.explode });
      for (const o of s.zombies) if (o.hp > 0 && !o.fly && dist2(o.x, o.z, zb.x, zb.z) < st.explode * st.explode) hurtZombie(s, o, st.spikeDmg * 1.5, 'blast', ev, fx);
    } else hurtZombie(s, zb, st.spikeDmg, 'phys', ev, fx);
    ev.push({ e: 'spike', id: t.id, n: t.spikes });
  }
  function hurtWall(s, t, d, ev) {
    if (t.hp <= 0) return;
    t.hp -= d;
    if (t.hp <= 0) { t.hp = 0; removeTower(s, t); ev.push({ e: 'wreck', id: t.id, x: t.x, y: t.z }); }
  }

  /* ================= towers ================= */
  // a tower's stats: its base, its upgrades, then the shrines and lanterns near it
  const BUFFER = { shrine: 1, lantern: 1 };
  // (bare: without what other towers give it, for a lantern lighting up another lantern before either has its stats)
  function towerStats(s, t, bare) {
    const U = TOWERS[t.type], st = baseStats(U);
    for (let k = 0; k < t.a; k++) applyMods(st, U.a[k].mods);
    for (let k = 0; k < t.b; k++) applyMods(st, U.b[k].mods);
    if (!bare && st.kind !== 'support' && st.kind !== 'mine' && st.kind !== 'mill' && st.kind !== 'wall' && st.kind !== 'trap') {
      let rate = 0, range = 0, dmg = 0, camo = false;
      for (const o of s.towers) {
        if (o === t || !BUFFER[o.type]) continue;
        const os = o.st || towerStats(s, o, true);
        if (dist2(o.x, o.z, t.x, t.z) > os.range * os.range) continue;
        rate = Math.max(rate, os.buffRate || 0); range = Math.max(range, os.buffRange || 0); dmg = Math.max(dmg, os.buffDmg || 0); camo = camo || !!os.buffCamo || !!os.camoAura;
      }
      if (st.rate) st.rate *= 1 + rate;
      if (st.range && st.range < 50) st.range *= 1 + range;
      if (st.dmg) st.dmg *= 1 + dmg;
      if (camo) st.camo = true;
    }
    if (st.camoAura) st.camo = true;
    return st;
  }
  function refreshStats(s) { for (const t of s.towers) t.st = towerStats(s, t); for (const t of s.towers) if (!BUFFER[t.type]) t.st = towerStats(s, t); }
  const price = (s, type) => Math.round(TOWERS[type].cost * s.D.cost / 5) * 5;
  const nearGate = (s, tx, tz) => s.map.spawns.some((sp) => Math.abs(sp.x - tx) <= 1 && Math.abs(sp.y - tz) <= 1);
  function canBuild(s, type, tx, tz, p) {
    const m = s.map, U = TOWERS[type];
    if (!U) return { ok: false, why: 'locked' };
    if (tx < 0 || tz < 0 || tx >= m.w || tz >= m.h) return { ok: false, why: 'edge' };
    const i = tz * m.w + tx, tile = m.tiles[i];
    if (s.occ[i] > 0) return { ok: false, why: 'blocked' };
    if (U.road) { if (!ROAD_OK[tile]) return { ok: false, why: 'road' }; if (nearGate(s, tx, tz)) return { ok: false, why: 'gate' }; }
    else if (!BUILD_OK[tile]) return { ok: false, why: 'blocked' };
    for (const q of s.players) if (!q.down && Math.abs(q.x - (tx + 0.5)) < 0.8 && Math.abs(q.z - (tz + 0.5)) < 0.8) return { ok: false, why: 'player' };
    if (!U.road) for (const zb of s.zombies) if (!zb.fly && (zb.x | 0) === tx && (zb.z | 0) === tz) return { ok: false, why: 'blocked' };
    if (p && p.coins < price(s, type)) return { ok: false, why: 'cost' };
    if (p && (s.res[U.mat] || 0) < U.matN) return { ok: false, why: U.mat };
    return { ok: true };
  }
  function build(s, type, tx, tz, p, ev) {
    const can = canBuild(s, type, tx, tz, p);
    if (!can.ok) { ev.push({ e: 'nobuild', id: p ? p.id : null, why: can.why }); return null; }
    const cost = price(s, type), U = TOWERS[type];
    if (p) { p.coins -= cost; s.res[U.mat] -= U.matN; }
    const t = { id: s.nextId++, type: type, tx: tx, tz: tz, x: tx + 0.5, z: tz + 0.5, a: 0, b: 0, spent: cost, mat: p ? U.matN : 0, mode: U.mode || 'first', by: p ? p.id : null, slot: p ? p.slot : 0, cd: 0.3, rot: 0, stun: 0, timers: {}, hp: 0, spikes: 0, st: null, done: 0 };
    s.towers.push(t); s.tmap.set(t.id, t);
    s.occ[tz * s.map.w + tx] = t.id;
    s.stats.built++; s.stats.spent += cost;
    t.st = towerStats(s, t);
    if (U.kind === 'wall') t.hp = t.st.hp;
    if (U.kind === 'trap') t.spikes = Math.round(t.st.spikes);
    if (U.road) roadIndex(s);
    if (BUFFER[type]) refreshStats(s);
    ev.push({ e: 'built', t: towerInfo(t) });
    return t;
  }
  // barricades and traps along each road, by how far along the road they sit
  function roadIndex(s) {
    s.blocks = s.map.paths.map(() => []); s.traps = s.map.paths.map(() => []);
    for (const t of s.towers) {
      if (t.st.kind !== 'wall' && t.st.kind !== 'trap') continue;
      const i = t.tz * s.map.w + t.tx;
      s.map.paths.forEach((P, k) => { const d = P.road.tileD.get(i); if (d != null) (t.st.kind === 'wall' ? s.blocks : s.traps)[k].push({ d: d, t: t }); });
    }
    for (const a of s.blocks) a.sort((x, y) => x.d - y.d);
    for (const a of s.traps) a.sort((x, y) => x.d - y.d);
  }
  function removeTower(s, t) {
    s.towers = s.towers.filter((q) => q !== t); s.tmap.delete(t.id);
    s.occ[t.tz * s.map.w + t.tx] = 0;
    if (t.st.kind === 'wall' || t.st.kind === 'trap') roadIndex(s);
    if (BUFFER[t.type]) refreshStats(s);
  }
  // the next step on path 'a' or 'b': one path may go to step 3, the other then stops at step 1
  function upgradeInfo(s, t, path) {
    const U = TOWERS[t.type], list = U[path], tier = t[path];
    if (!list || tier >= 3) return { ok: false, why: 'max', tier: tier };
    const other = path === 'a' ? t.b : t.a;
    if (tier >= 1 && other >= 2) return { ok: false, why: 'path', tier: tier };
    const up = list[tier];
    return { ok: true, cost: Math.round(up.cost * s.D.cost / 5) * 5, mat: U.mat, matN: MAT_UP[tier], up: up, tier: tier + 1 };
  }
  function upgrade(s, id, path, p, ev) {
    const t = s.towers.find((q) => q.id === id);
    if (!t || (path !== 'a' && path !== 'b')) return false;
    const u = upgradeInfo(s, t, path);
    if (!u.ok) return false;
    if (p && p.coins < u.cost) { ev.push({ e: 'nobuild', id: p.id, why: 'cost' }); return false; }
    if (p && (s.res[u.mat] || 0) < u.matN) { ev.push({ e: 'nobuild', id: p.id, why: u.mat }); return false; }
    if (p) { p.coins -= u.cost; s.res[u.mat] -= u.matN; t.mat = (t.mat || 0) + u.matN; }
    t[path]++; t.spent += u.cost; s.stats.spent += u.cost;
    const hpWas = t.st.hp || 0;
    if (BUFFER[t.type]) refreshStats(s); else t.st = towerStats(s, t);
    if (t.st.kind === 'wall') t.hp += (t.st.hp || 0) - hpWas;
    if (t.st.kind === 'trap') t.spikes = Math.round(t.st.spikes);
    ev.push({ e: 'upgraded', t: towerInfo(t), path: path, by: p ? p.id : null });
    return true;
  }
  const sellValue = (t) => Math.floor(t.spent * SELL_BACK), sellMat = (t) => Math.floor((t.mat || 0) / 2);
  function sell(s, id, p, ev) {
    const t = s.towers.find((q) => q.id === id);
    if (!t || (p && t.by && t.by !== p.id && s.players.some((q) => q.id === t.by))) return false;   // only your own (or a friend's who left)
    const v = sellValue(t), mv = sellMat(t), mat = TOWERS[t.type].mat;
    if (p) p.coins += v;
    s.res[mat] += mv;
    removeTower(s, t);
    ev.push({ e: 'sold', id: t.id, x: t.x, y: t.z, v: v, m: mv, mat: mat, by: p ? p.id : null });
    return true;
  }
  const towerInfo = (t) => ({ id: t.id, type: t.type, tx: t.tx, tz: t.tz, a: t.a, b: t.b, mode: t.mode, by: t.by, spent: t.spent, mat: t.mat || 0, max: t.st && t.st.kind === 'wall' ? Math.round(t.st.hp) : t.st && t.st.kind === 'trap' ? Math.round(t.st.spikes) : 0 });

  /* ---- firing: one tower's (or crew member's) attack at a target ---- */
  function effects(st, by, x, z) {
    return { by: by, from: [x, z], burn: st.burnDps ? [st.burnDps, st.burnT || 2] : null, slow: st.slowF ? [st.slowF, st.slowT || 1] : null, stun: st.stun || 0, freeze: st.freeze || 0, brittle: st.brittle || 0,
      acid: st.acidDps ? [st.acidDps, st.acidT || 2] : null, stop: st.stop || 0, armor: !!st.armor, blue: !!st.blue, knock: st.knock || 0, flood: st.flood || 0,
      push: st.push || 0, vsAir: st.vsAir || 0, poisonT: st.poisonT || 0, digs: !!st.digs, hits: st.hits };
  }
  function fire(s, st, x, z, target, by, src, ev, near, mode) {
    const a = Math.atan2(target.x - x, target.z - z), fx = effects(st, by, x, z);
    switch (st.kind) {
      case 'shot': {
        const n = st.shots || 1, spread = (st.spread || 0) * Math.PI / 180;
        for (let k = 0; k < n; k++) {
          const aa = a + (n > 1 ? ((k / (n - 1)) - 0.5) * spread : 0);
          s.shots.push({ x: x, z: z, vx: Math.sin(aa) * st.speed, vz: Math.cos(aa) * st.speed, life: st.range / st.speed * (st.homing ? 1.8 : 1) + 0.08, dmg: st.dmg, type: st.type, pierce: st.pierce || 1, hits: [], splash: st.splash || 0, fx: fx, who: st.hits, home: st.homing ? target : null });
        }
        ev.push({ e: 'shot', k: src, x: r2(x), y: r2(z), a: r2(a), n: n, sp: st.speed, l: r2(st.range), spread: st.spread || 0, h: st.homing ? 1 : 0, tx: r2(target.x), ty: r2(target.z) });
        break;
      }
      case 'lob': {
        const n = st.shots || 1, skip = new Set();
        let tg = target;
        for (let k = 0; k < n; k++) {
          if (k > 0) tg = pickTarget(s, x, z, st.range, st.min, mode || 'first', st.camo, near, skip, st) || target;
          skip.add(tg);
          const d = Math.sqrt(dist2(tg.x, tg.z, x, z)), t = Math.max(0.35, d / st.speed);
          // aim a little ahead of a walker
          const lead = tg.fly || tg.under ? null : pathAt(walkOf(s, tg), tg.d + ZOMBIES[tg.type].speed * PACE * (tg.slowT > 0 ? tg.slowF : 1) * t * 0.8, tg.seg);
          const ax = lead ? lead[0] : tg.x, az = lead ? lead[1] : tg.z;
          s.shots.push({ lob: true, x: x, z: z, tx: ax, tz: az, life: t, dmg: st.dmg, type: st.type, splash: st.splash || 1, cluster: st.cluster || 0, pool: st.poolDps ? [st.poolDps, st.poolT, st.poolR, 'fire'] : null, fx: fx, who: st.hits });
          ev.push({ e: 'lob', k: src, x: r2(x), y: r2(z), tx: r2(ax), ty: r2(az), t: r2(t) });
        }
        break;
      }
      case 'chain': {
        const pts = [[x, z]], hit = new Set();
        let cur = target, dmg = st.dmg;
        for (let j = 0; j < st.jumps && cur; j++) {
          hit.add(cur);
          pts.push([cur.x, cur.z]);
          hurtZombie(s, cur, dmg, st.type, ev, fx);
          dmg *= st.falloff || 0.85;
          let nxt = null, nd = st.jumpRange * st.jumpRange;
          for (const o of near(cur.x, cur.z, st.jumpRange)) { if (o.hp <= 0 || o.bones > 0 || hit.has(o) || !canHit(st, o) || (ZOMBIES[o.type].camo && !st.camo)) continue; const d2 = dist2(o.x, o.z, cur.x, cur.z); if (d2 < nd) { nd = d2; nxt = o; } }
          cur = nxt;
        }
        ev.push({ e: 'zap', k: src, pts: pts.map((p) => [r2(p[0]), r2(p[1])]) });
        break;
      }
      case 'cone': {
        const half = (st.arc / 2) * Math.PI / 180;
        for (const zb of near(x, z, st.range)) {
          if (zb.hp <= 0 || zb.bones > 0 || !canHit(st, zb)) continue;
          const d2 = dist2(zb.x, zb.z, x, z);
          if (d2 > st.range * st.range) continue;
          const b = Math.atan2(zb.x - x, zb.z - z), diff = Math.abs(((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (st.arc >= 360 || diff <= half || d2 < 0.5) hurtZombie(s, zb, st.dmg, st.type, ev, fx);
        }
        if (rngNext(s) < 0.6) ev.push({ e: 'flame', k: src, x: r2(x), y: r2(z), a: r2(a), l: r2(st.range), arc: st.arc });
        break;
      }
      case 'snipe': {
        hurtZombie(s, target, st.dmg, st.type, ev, fx);
        ev.push({ e: 'snipe', k: src, x: r2(x), y: r2(z), tx: r2(target.x), ty: r2(target.z) });
        break;
      }
      case 'beam': {
        const beams = st.beams || 1, skip = new Set();
        let tg = target;
        for (let k = 0; k < beams; k++) {
          if (k > 0) { tg = pickTarget(s, x, z, st.range, 0, mode || 'first', st.camo, near, skip, st); if (!tg) break; }
          skip.add(tg);
          const ba = Math.atan2(tg.x - x, tg.z - z), ux = Math.sin(ba), uz = Math.cos(ba), hits = [];
          for (const zb of near(x, z, st.range)) {
            if (zb.hp <= 0 || zb.bones > 0 || !canHit(st, zb) || (ZOMBIES[zb.type].camo && !st.camo)) continue;
            const rx = zb.x - x, rz = zb.z - z, along = rx * ux + rz * uz, across = Math.abs(rx * uz - rz * ux);
            if (along > 0 && along < st.range && across < zb.r + 0.25) hits.push([along, zb]);
          }
          hits.sort((p, q) => p[0] - q[0]);
          for (const h of hits.slice(0, st.pierce || 1)) hurtZombie(s, h[1], st.dmg, st.type, ev, fx);
          if (rngNext(s) < 0.5) ev.push({ e: 'beam', k: src, x: r2(x), y: r2(z), tx: r2(tg.x), ty: r2(tg.z) });
        }
        break;
      }
      case 'melee': {
        const half = (st.arc / 2) * Math.PI / 180, hitList = [];
        // a combo: every combo-th blow of a player stuns
        const p = st.combo && typeof by === 'string' ? s.players.find((q) => q.id === by) : null;
        if (p) { p.combo = (p.combo || 0) + 1; fx.stun = p.combo % st.combo === 0 ? st.stun : 0; }
        for (const zb of near(x, z, st.range + 0.6)) {
          if (zb.hp <= 0 || zb.bones > 0 || !canHit(st, zb)) continue;
          const d = Math.sqrt(dist2(zb.x, zb.z, x, z));
          if (d > st.range + zb.r) continue;
          const b = Math.atan2(zb.x - x, zb.z - z), diff = Math.abs(((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (st.arc >= 360 || diff <= half) { hurtZombie(s, zb, st.dmg, st.type, ev, fx); hitList.push(zb); }
        }
        ev.push({ e: 'swing', k: src, x: r2(x), y: r2(z), a: r2(a), c: p && fx.stun ? 1 : 0 });   // c: a combo punch that stuns
        // a thunder fist: the combo punch sends lightning jumping on from the zombie punched
        if (st.zap && hitList.length && fx.stun) fire(s, { kind: 'chain', type: 'lightning', dmg: st.dmg * 0.6, jumps: st.zap + 1, jumpRange: 2.6, falloff: 0.8, camo: true }, x, z, hitList[0], by, src, ev, near);
        break;
      }
      case 'cloud': {
        // a poison cloud on the road where the zombie is going
        const n = st.shots || 1, skip = new Set();
        let tg = target;
        for (let k = 0; k < n; k++) {
          if (k > 0) { tg = pickTarget(s, x, z, st.range, 0, mode || 'first', st.camo, near, skip, st); if (!tg) break; }
          skip.add(tg);
          const lead = tg.under ? null : pathAt(walkOf(s, tg), tg.d + ZOMBIES[tg.type].speed * PACE * 0.6, tg.seg), cx = lead ? lead[0] : tg.x, cz = lead ? lead[1] : tg.z;
          s.pools.push({ x: cx, z: cz, dps: st.dmg, t: st.cloudT, r: st.cloudR, type: 'poison', fx: { by: by, brittle: st.brittle || 0 } });
          ev.push({ e: 'cloud', k: src, x: r2(x), y: r2(z), tx: r2(cx), ty: r2(cz), r: r2(st.cloudR), t: r2(st.cloudT) });
        }
        break;
      }
      case 'erupt': {
        // a geyser bursts up under the zombie: everyone close is soaked and thrown up (diggers too)
        const r = st.splash || 1;
        for (const zb of near(target.x, target.z, r + 0.4)) if (zb.hp > 0 && canHit(st, zb) && dist2(zb.x, zb.z, target.x, target.z) < (r + zb.r) ** 2) hurtZombie(s, zb, st.dmg, st.type, ev, fx);
        ev.push({ e: 'erupt', k: src, x: r2(target.x), y: r2(target.z), r: r2(r) });
        break;
      }
    }
    return a;
  }
  // slime: a hit slimes every zombie within the flood's reach too
  function splashFx(s, zb, sh, ev, near) {
    if (sh.splash) {
      ev.push({ e: 'pop', x: r2(zb.x), y: r2(zb.z), t: sh.type, r: sh.splash });
      for (const o of near(zb.x, zb.z, sh.splash + 0.4)) if (canHit(sh.fx, o) && dist2(o.x, o.z, zb.x, zb.z) < (sh.splash + o.r) ** 2) hurtZombie(s, o, sh.dmg, sh.type, ev, sh.fx);
    } else { hurtZombie(s, zb, sh.dmg, sh.type, ev, sh.fx); ev.push({ e: 'hit', x: r2(zb.x), y: r2(zb.z), t: sh.type }); }
    if (sh.fx.flood) {
      const f = sh.fx.flood;
      ev.push({ e: 'pop', x: r2(zb.x), y: r2(zb.z), t: 'slime', r: f });
      for (const o of near(zb.x, zb.z, f)) if (o !== zb && dist2(o.x, o.z, zb.x, zb.z) < f * f) hurtZombie(s, o, 0.01, 'pure', ev, sh.fx);
    }
  }
  function land(s, sh, ev, near) {
    const hitAt = (x, z, r, dmg) => { for (const zb of near(x, z, r + 0.4)) if (canHit(sh.fx, zb) && dist2(zb.x, zb.z, x, z) < (r + zb.r) ** 2) hurtZombie(s, zb, dmg, sh.type, ev, sh.fx); };
    ev.push({ e: 'boom', x: r2(sh.tx), y: r2(sh.tz), r: sh.splash });
    hitAt(sh.tx, sh.tz, sh.splash, sh.dmg);
    if (sh.cluster) for (let k = 0; k < sh.cluster; k++) {
      const a = rnd(s, 0, Math.PI * 2), d = rnd(s, 0.6, sh.splash * 1.3), x = sh.tx + Math.sin(a) * d, z = sh.tz + Math.cos(a) * d;
      ev.push({ e: 'boom', x: r2(x), y: r2(z), r: r2(sh.splash * 0.6) });
      hitAt(x, z, sh.splash * 0.6, sh.dmg * 0.5);
    }
    if (sh.pool) s.pools.push({ x: sh.tx, z: sh.tz, dps: sh.pool[0], t: sh.pool[1], r: sh.pool[2], type: sh.pool[3] || 'fire', fx: sh.fx });
  }
  // projectiles in flight, fire on the ground and zombie spit
  function stepShots(s, dt, ev, near) {
    for (const sh of s.shots) {
      if (sh.dead) continue;
      sh.life -= dt;
      if (sh.lob) { if (sh.life <= 0) { sh.dead = true; land(s, sh, ev, near); } continue; }
      // rockets and bees turn after their zombie
      if (sh.home && sh.home.hp > 0 && !sh.home.bones) {
        const sp = Math.hypot(sh.vx, sh.vz), want = Math.atan2(sh.home.x - sh.x, sh.home.z - sh.z), now = Math.atan2(sh.vx, sh.vz), na = turnTo(now, want, dt * 6);
        sh.vx = Math.sin(na) * sp; sh.vz = Math.cos(na) * sp;
      }
      const nx = sh.x + sh.vx * dt, nz = sh.z + sh.vz * dt;
      let guard = 0;
      while (!sh.dead && guard++ < 8) {
        let hitZ = null, ht = 2;
        for (const zb of near((sh.x + nx) / 2, (sh.z + nz) / 2, 1.3)) {
          if (zb.hp <= 0 || zb.under || zb.bones > 0 || sh.hits.indexOf(zb.id) >= 0 || !canHit(sh.fx, zb)) continue;
          const t = segCircle(sh.x, sh.z, nx, nz, zb.x, zb.z, zb.r + 0.1);
          if (t >= 0 && t < ht) { ht = t; hitZ = zb; }
        }
        if (!hitZ) break;
        sh.hits.push(hitZ.id);
        splashFx(s, hitZ, sh, ev, near);
        if (sh.hits.length >= sh.pierce) sh.dead = true;
      }
      sh.x = nx; sh.z = nz;
      if (sh.life <= 0) sh.dead = true;
    }
    s.shots = s.shots.filter((q) => !q.dead);
    for (const pl of s.pools) {
      pl.t -= dt;
      for (const zb of near(pl.x, pl.z, pl.r)) if (!zb.fly && !zb.under && dist2(zb.x, zb.z, pl.x, pl.z) < pl.r * pl.r) hurtZombie(s, zb, pl.dps * dt, pl.type, ev, pl.type === 'poison' ? { by: pl.fx.by, poisonT: 1, brittle: pl.fx.brittle } : { by: pl.fx.by });
    }
    s.pools = s.pools.filter((q) => q.t > 0);
    for (const f of s.foes) {
      f.life -= dt;
      f.x += f.vx * dt; f.z += f.vz * dt;
      let done = f.life <= 0;
      for (const p of s.players) if (!done && !p.down && dist2(p.x, p.z, f.x, f.z) < 0.4 * 0.4) { hurtPlayer(s, p, f.dmg, ev); done = true; }
      for (const t of s.towers) if (!done && dist2(t.x, t.z, f.x, f.z) < 0.5 * 0.5) { stunTower(s, t, f.stun, ev); done = true; }
      if (done) { f.dead = true; ev.push({ e: 'splat', x: r2(f.x), y: r2(f.z) }); }
    }
    s.foes = s.foes.filter((q) => !q.dead);
  }
  function segCircle(x0, z0, x1, z1, cx, cz, r) {
    const dx = x1 - x0, dz = z1 - z0, fx = x0 - cx, fz = z0 - cz;
    const a = dx * dx + dz * dz, b = 2 * (fx * dx + fz * dz), c = fx * fx + fz * fz - r * r;
    if (c <= 0) return 0;
    if (a < 1e-9) return -1;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return -1;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t >= 0 && t <= 1 ? t : -1;
  }
  function stepTower(s, t, dt, ev, near) {
    const st = t.st, tm = t.timers;
    if (t.stun > 0) { t.stun -= dt; return; }
    const src = 't:' + t.type + ':' + t.id;
    switch (st.kind) {
      case 'wall':
        if (st.tarF) for (const zb of near(t.x, t.z, st.tarR)) if (!zb.fly && dist2(zb.x, zb.z, t.x, t.z) < st.tarR * st.tarR && !ZOMBIES[zb.type].noSlow) { zb.slowT = Math.max(zb.slowT, 0.3); zb.slowF = Math.min(zb.slowF, 1 - st.tarF); }
        if (st.wardEvery) { tm.ward = (tm.ward || 0) - dt; if (tm.ward <= 0) { tm.ward = st.wardEvery; let any = false; for (const zb of near(t.x, t.z, st.wardR)) if (!zb.fly && !ZOMBIES[zb.type].heavy && dist2(zb.x, zb.z, t.x, t.z) < st.wardR * st.wardR) { zb.d = Math.max(0, zb.d - st.wardPush); any = true; } if (any) ev.push({ e: 'pulse', id: t.id, x: t.x, y: t.z, r: st.wardR, k: 'ward' }); } }
        return;
      case 'trap': case 'mine': case 'mill': return;
      case 'pulse': case 'gust': {
        // a ring of light, or a gust of wind, hits every zombie it can reach around the tower
        tm.p = (tm.p || 1 / st.rate * 0.5) - dt;
        t.rot += dt * (st.kind === 'gust' ? 4 : 1);
        if (tm.p > 0) return;
        let any = false;
        const fx = effects(st, t.id, t.x, t.z);
        for (const zb of near(t.x, t.z, st.range)) if (zb.hp > 0 && canHit(st, zb) && (!ZOMBIES[zb.type].camo || st.camo) && dist2(zb.x, zb.z, t.x, t.z) < st.range * st.range) { any = true; hurtZombie(s, zb, st.dmg, st.type, ev, fx); }
        tm.p = any ? 1 / st.rate : 0.25;
        if (any) ev.push({ e: st.kind === 'gust' ? 'gust' : 'pulse', id: t.id, x: t.x, y: t.z, r: r2(st.range), k: st.kind === 'gust' ? 'wind' : 'light' });
        return;
      }
      case 'support': {
        const r2_ = st.range * st.range;
        for (const p of s.players) if (!p.down && p.hp < p.max && dist2(p.x, p.z, t.x, t.z) < r2_) p.hp = Math.min(p.max, p.hp + st.heal * dt);
        t.rot += dt;
        return;
      }
      case 'aura': {
        const fx = effects(st, t.id, t.x, t.z);
        for (const zb of near(t.x, t.z, st.range)) if (zb.hp > 0 && !zb.under && dist2(zb.x, zb.z, t.x, t.z) < st.range * st.range) hurtZombie(s, zb, st.dmg * dt, st.type, ev, { by: t.id, slow: [st.slowF, Math.max(0.3, st.slowT || 0.4)], brittle: st.brittle || 0 });
        if (st.pulseEvery) { tm.pulse = (tm.pulse || st.pulseEvery * 0.5) - dt; if (tm.pulse <= 0) { tm.pulse = st.pulseEvery; let any = false; for (const zb of near(t.x, t.z, st.range)) if (zb.hp > 0 && !zb.under && dist2(zb.x, zb.z, t.x, t.z) < st.range * st.range) { any = true; hurtZombie(s, zb, st.dmg, st.type, ev, { by: t.id, freeze: st.pulseFreeze || 0 }); } if (any) ev.push({ e: 'pulse', id: t.id, x: t.x, y: t.z, r: r2(st.range), k: 'frost' }); } }
        if (st.shards) {
          tm.shard = (tm.shard || 0) - dt;
          if (tm.shard <= 0) {
            const tg = pickTarget(s, t.x, t.z, st.range + 1.5, 0, t.mode, st.camo, near, null, st);
            if (tg) { tm.shard = 0.5; t.rot = fire(s, { kind: 'shot', type: 'frost', dmg: 12, speed: 14, range: st.range + 1.5, pierce: 3, slowF: st.slowF, slowT: 1 }, t.x, t.z, tg, t.id, src, ev, near); }
          }
        }
        t.rot += dt * 1.5;
        void fx;
        return;
      }
    }
    // a periodic power of its own: thunder, smoke, fireballs, meteors
    if (st.pulseEvery && st.pulseDmg) { tm.pulse = (tm.pulse || st.pulseEvery) - dt; if (tm.pulse <= 0) { tm.pulse = st.pulseEvery; let any = false; for (const zb of near(t.x, t.z, st.range)) if (zb.hp > 0 && canHit(st, zb) && dist2(zb.x, zb.z, t.x, t.z) < st.range * st.range && (!ZOMBIES[zb.type].camo || st.camo)) { any = true; hurtZombie(s, zb, st.pulseDmg, st.type, ev, { by: t.id }); } if (any) ev.push({ e: 'pulse', id: t.id, x: t.x, y: t.z, r: r2(st.range), k: 'zap' }); } }
    if (st.smokeEvery) { tm.smoke = (tm.smoke || st.smokeEvery) - dt; if (tm.smoke <= 0) { const tg = pickTarget(s, t.x, t.z, st.range, 0, 'first', st.camo, near, null, st); if (tg) { tm.smoke = st.smokeEvery; ev.push({ e: 'smoke', x: r2(tg.x), y: r2(tg.z), r: st.smokeR }); for (const zb of near(tg.x, tg.z, st.smokeR)) if (dist2(zb.x, zb.z, tg.x, tg.z) < st.smokeR * st.smokeR) hurtZombie(s, zb, 1, 'pure', ev, { by: t.id, stun: st.smokeStun }); } else tm.smoke = 0.5; } }
    if (st.fireballEvery) { tm.fb = (tm.fb || st.fireballEvery) - dt; if (tm.fb <= 0) { const tg = pickTarget(s, t.x, t.z, st.range, 0, t.mode, st.camo, near, null, st); if (tg) { tm.fb = st.fireballEvery; fire(s, { kind: 'lob', type: 'fire', dmg: st.fireballDmg, speed: 11, splash: st.fireballR, range: st.range, camo: st.camo }, t.x, t.z, tg, t.id, 't:fireball:' + t.id, ev, near); } else tm.fb = 0.3; } }
    if (st.meteorEvery) { tm.met = (tm.met || st.meteorEvery) - dt; if (tm.met <= 0) { const tg = pickTarget(s, t.x, t.z, st.range * 1.5, 0, 'strong', st.camo, near, null, st); if (tg) { tm.met = st.meteorEvery; ev.push({ e: 'meteor', x: r2(tg.x), y: r2(tg.z), r: st.meteorR }); for (const zb of near(tg.x, tg.z, st.meteorR + 0.4)) if (dist2(zb.x, zb.z, tg.x, tg.z) < (st.meteorR + zb.r) ** 2) hurtZombie(s, zb, zb === tg ? st.meteorDmg : st.meteorDmg * 0.3, 'light', ev, { by: t.id }); } else tm.met = 0.5; } }
    t.cd -= dt;
    const target = pickTarget(s, t.x, t.z, st.range, st.min, t.mode, st.camo, near, null, st);
    if (target) t.rot = turnTo(t.rot, Math.atan2(target.x - t.x, target.z - t.z), dt * 9);
    if (t.cd > 0 || !target) return;
    t.cd = 1 / st.rate;
    fire(s, st, t.x, t.z, target, t.id, src, ev, near, t.mode);
  }

  /* ================= the crew ================= */
  function stepPlayer(s, p, inp, dt, ev) {
    if (p.down > 0) {
      p.down -= dt;
      if (p.down <= 0) { const g = gatePoint(s.map, p.slot), f = freeSpot(s, g.x, g.z); p.down = 0; p.hp = p.max; p.x = f[0]; p.z = f[1]; ev.push({ e: 'up', id: p.id }); }
    } else if (inp) {
      if (typeof inp.x === 'number' && typeof inp.z === 'number' && isFinite(inp.x) && isFinite(inp.z)) {
        // trust the device's own movement, but not through walls
        if (!playerSolid(s)(inp.x | 0, inp.z | 0)) { p.x = inp.x; p.z = inp.z; }
      }
      if (typeof inp.rot === 'number') p.rot = inp.rot;
      p.fire = !!inp.fire;
      p.gather = typeof inp.gather === 'number' ? inp.gather : -1;
    }
    // wishes count even while knocked out: building, upgrading, selling, aiming towers, the next round
    if (inp) {
      if (inp.build) build(s, inp.build.type, inp.build.tx | 0, inp.build.tz | 0, p, ev);
      if (inp.upgrade) upgrade(s, inp.upgrade.id, inp.upgrade.path, p, ev);
      if (inp.sell) sell(s, inp.sell, p, ev);
      if (inp.mode && ['first', 'last', 'close', 'strong'].indexOf(inp.mode.mode) >= 0) { const t = s.towers.find((q) => q.id === inp.mode.id); if (t) { t.mode = inp.mode.mode; ev.push({ e: 'mode', id: t.id, mode: t.mode }); } }
      if (inp.next && s.wave.state === 'wait' && !s.result) startRound(s, ev);
    }
    if (p.down > 0) return;
    if (p.hp < p.max) p.hp = Math.min(p.max, p.hp + dt * 3);
    p.cd -= dt;
    if (p.actT > 0) p.actT -= dt;
    // chop a tree or mine a rock the player pushes against: wood or stone for the crew, and room to build
    if (p.gather >= 0) {
      const m = s.map, i = p.gather, tl = m.tiles[i];
      const gx = (i % m.w) + 0.5, gz = ((i / m.w) | 0) + 0.5;
      if ((tl === T.TREE || tl === T.ROCK) && dist2(gx, gz, p.x, p.z) < 1.3 * 1.3) {
        p.gatherT += dt * (p.weapon === 'hammer' ? 2 : 1);
        if (p.gatherT >= 0.4) {
          p.gatherT = 0; p.act = tl === T.TREE ? 'chop' : 'mine'; p.actT = 0.25;
          m.life[i] = Math.max(0, m.life[i] - 1);
          ev.push({ e: 'chop', i: i, kind: tl === T.TREE ? 'tree' : 'rock', left: m.life[i], id: p.id });
          if (m.life[i] <= 0) {
            m.tiles[i] = T.GRASS;
            const mat = tl === T.TREE ? 'wood' : 'stone';
            s.res[mat] += FELL_GOT;
            s.felled.push({ i: i, t: tl, r: s.round });
            if (tl === T.TREE) s.stats.chopped++; else s.stats.mined++;
            ev.push({ e: 'tile', i: i, t: T.GRASS, got: FELL_GOT, mat: mat, x: gx, y: gz, id: p.id });
          }
        }
        return;
      }
      p.gatherT = 0;
    }
    // fire: at the nearest zombie in range (auto-aim); a player sees shadow zombies
    if (p.fire && p.cd <= 0) {
      const st = p.st, target = pickTarget(s, p.x, p.z, st.range, 0, 'close', true, nearFn, null, st);
      if (target) {
        p.cd = 1 / st.rate;
        p.rot = fire(s, st, p.x, p.z, target, p.id, 'p:' + p.weapon + ':' + p.id, ev, nearFn, 'close');
        p.act = 'fire'; p.actT = 0.15;
      }
    }
  }

  /* ================= rounds ================= */
  // a round's groups: { z: zombie, n, every: seconds apart, after: seconds before the first, gate: 'cycle' | number }
  function roundGroups(s, r) {
    const R = s.rounds[r - 1];
    const list = R ? R.groups : freeplayRound(s, r);
    return list.map((g) => ({ z: g.z, left: ZOMBIES[g.z].boss ? g.n : Math.max(1, Math.round(g.n * s.countMul)), every: (g.every || 1) / Math.sqrt(s.countMul), next: g.after || 0, gate: g.gate == null ? 'cycle' : g.gate }));
  }
  // after round 100: bigger and bigger mixes, a giant every 5 rounds and a boss every 10
  function freeplayRound(s, r) {
    const R = { rng: (Math.imul(r, 2654435761) ^ s.seed) | 0 };
    const pool = ['runner', 'brute', 'knight', 'shadow', 'ghost', 'frosty', 'blaze', 'digger', 'blob', 'shield', 'shaman', 'bat', 'mummy', 'skeleton', 'spitter', 'bomber', 'vulture', 'balloon', 'gargoyle'];
    const out = [], k = 3 + (r % 3), extra = r - LAST_ROUND;
    for (let j = 0; j < k; j++) out.push({ z: pool[Math.floor(rnd(R, 0, pool.length))], n: Math.min(30, Math.round(12 + extra * 0.3 + rnd(R, 0, 8))), every: rnd(R, 0.3, 0.6), after: j * 2.5 });
    if (r % 5 === 0) out.push({ z: 'giant', n: 2 + Math.floor(extra / 10), every: 3, after: 4 });
    if (r % 10 === 0) out.push({ z: ['king', 'witch', 'colossus', 'dragon', 'overlord'][Math.floor(extra / 10) % 5], n: 1 + Math.floor(extra / 50), every: 6, after: 3 });
    return out;
  }
  function startRound(s, ev) {
    s.round++;
    s.wave.state = 'fight'; s.wave.groups = roundGroups(s, s.round); s.wave.timer = 0; s.wave.hold = false;
    ev.push({ e: 'round', r: s.round, state: 'fight' });
  }
  function stepRounds(s, dt, ev) {
    const W = s.wave;
    if (W.state === 'wait') {
      if (s.round > 0 && s.autoStart && !W.hold && !s.result) { W.timer -= dt; if (W.timer <= 0) startRound(s, ev); }
      return;
    }
    const gates = s.map.spawns.length;
    for (const g of W.groups) {
      if (g.left <= 0) continue;
      if (s.zombies.length >= MAX_ALIVE) break;   // the road is full: the rest wait
      g.next -= dt;
      while (g.next <= 0 && g.left > 0) {
        const gi = g.gate === 'cycle' ? (s.gateK++ % gates) : (g.gate | 0) % gates;
        spawnZombie(s, g.z, gi, rnd(s, -0.3, 0), ev);
        g.left--; g.next += g.every;
      }
    }
    if (W.groups.some((g) => g.left > 0) || s.zombies.length) return;
    endRound(s, ev);
  }
  function endRound(s, ev) {
    const r = s.round, bonus = 100 + r * 3;
    earn(s, bonus);
    // gold mines, banks and the castle mender (one mender's worth, up to the castle's full lives); barricades mended, traps refilled
    let mend = 0;
    for (const t of s.towers) {
      const st = t.st;
      if (st.kind === 'mine') {
        const owner = s.players.find((q) => q.id === t.by);
        earn(s, st.income || 0, owner ? owner.id : null);
        if (st.bankRate && owner) owner.coins += Math.min(st.bankCap, Math.floor(owner.coins * st.bankRate));
        ev.push({ e: 'income', id: t.id, x: t.x, y: t.z, n: st.income || 0 });
      }
      if (st.mend) mend = Math.max(mend, st.mend);
      if (st.kind === 'mill') { s.res.wood += st.woodPer || 0; s.res.stone += st.stonePer || 0; ev.push({ e: 'income', id: t.id, x: t.x, y: t.z, n: st.woodPer || 0, mat: 'wood', n2: st.stonePer || 0 }); }
      if (st.kind === 'wall' && st.repair) t.hp = st.hp;
      if (st.kind === 'trap') t.spikes = Math.round(st.spikes);
    }
    if (mend && s.lives < s.maxLives) s.lives = Math.min(s.maxLives, s.lives + mend);
    s.res.wood += 1; s.res.stone += 2;   // (maps have fewer rocks than trees)
    regrow(s, ev);
    for (const p of s.players) if (!p.down) p.hp = p.max;
    ev.push({ e: 'cleared', r: r, bonus: bonus });
    s.wave.state = 'wait'; s.wave.timer = 2.5; s.wave.groups = [];
    if (r >= LAST_ROUND && !s.wonAt) { s.wonAt = r; s.result = 'won'; ev.push({ e: 'won', r: r }); }
  }

  // trees and rocks felled REGROW rounds ago grow back, unless a tower stands there (gone for good) or a player does
  // (next round)
  function regrow(s, ev) {
    const m = s.map;
    s.felled = s.felled.filter((f) => {
      if (s.round - f.r < REGROW) return true;
      if (s.occ[f.i] || (m.tiles[f.i] !== T.GRASS && m.tiles[f.i] !== T.SAND)) return false;
      const x = f.i % m.w, z = (f.i / m.w) | 0;
      if (s.players.some((p) => Math.abs(p.x - (x + 0.5)) < 0.95 && Math.abs(p.z - (z + 0.5)) < 0.95)) return true;
      m.tiles[f.i] = f.t; m.life[f.i] = f.t === T.TREE ? 3 : 4;
      ev.push({ e: 'tile', i: f.i, t: f.t, grow: 1, x: x + 0.5, y: z + 0.5 });
      return false;
    });
  }

  /* ================= one tick ================= */
  let nearFn = null;
  // inputs: { playerId: { x, z, rot, fire, gather, build: { type, tx, tz }, upgrade: { id, path }, sell: id, mode: { id, mode }, next } }
  function step(s, dt, inputs) {
    const ev = [];
    if (s.result) return ev;
    s.t += dt; s.tick++;
    // a coarse grid of the zombies, rebuilt each tick, for "who is near here"
    const G = new Map();
    for (const zb of s.zombies) { if (zb.hp <= 0) continue; const k = ((zb.x / 2) | 0) + ((zb.z / 2) | 0) * 1000; let a = G.get(k); if (!a) G.set(k, a = []); a.push(zb); }
    const near = (x, z, r) => {
      const out = [], x0 = Math.max(0, ((x - r) / 2) | 0), x1 = ((x + r) / 2) | 0, z0 = Math.max(0, ((z - r) / 2) | 0), z1 = ((z + r) / 2) | 0;
      for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) { const a = G.get(gx + gz * 1000); if (a) for (const o of a) out.push(o); }
      return out;
    };
    nearFn = near;
    for (const p of s.players) stepPlayer(s, p, inputs && inputs[p.id], dt, ev);
    stepRounds(s, dt, ev);
    for (const t of s.towers) stepTower(s, t, dt, ev, near);
    stepShots(s, dt, ev, near);
    for (const zb of s.zombies) if (zb.hp > 0) stepZombie(s, zb, dt, ev, near);
    s.zombies = s.zombies.filter((zb) => zb.hp > 0);
    if (s.lives <= 0 && !s.result) { s.lives = 0; s.result = 'lost'; s.wave.state = 'lost'; ev.push({ e: 'lost', r: s.round }); }
    return ev;
  }

  /* ================= what the other devices need ================= */
  const r2 = (v) => Math.round(v * 100) / 100;
  function zFlags(zb) { return (zb.under ? 1 : 0) | (zb.slowT > 0 ? 2 : 0) | (zb.burnT > 0 ? 4 : 0) | (zb.actT > 0 ? 8 : 0) | (zb.hitT > 0 ? 16 : 0) | (zb.frozen > 0 ? 32 : 0) | (zb.bones > 0 ? 64 : 0) | (zb.stunT > 0 ? 128 : 0) | (zb.acidT > 0 || zb.poisonT > 0 ? 256 : 0) | (zb.elite === 1 ? 512 : zb.elite === 2 ? 1024 : 0); }
  // the moving things, often (about 15 times a second)
  function snapshot(s) {
    return {
      k: s.tick, l: Math.max(0, Math.ceil(s.lives)), r: s.round, m: [s.res.wood, s.res.stone], w: [s.wave.state, Math.ceil(s.wave.timer), s.wave.state === 'fight' ? s.wave.groups.reduce((n, g) => n + g.left, 0) : 0, s.autoStart ? 1 : 0, s.wave.hold ? 1 : 0],
      p: s.players.map((p) => [p.id, r2(p.x), r2(p.z), r2(p.rot), Math.round(p.hp), r2(p.down), p.act && p.actT > 0 ? p.act : '', p.kills, Math.floor(p.coins), p.wlvl, Math.min(99, Math.floor(p.wxp / xpNeed(p.wlvl) * 100)), p.weapon]),
      z: s.zombies.map((zb) => [zb.id, ZOMBIE_ORDER.indexOf(zb.type), r2(zb.x), r2(zb.z), r2(zb.rot), Math.round(zb.hp / zb.max * 100), zFlags(zb)]),
      t: s.towers.map((t) => [t.id, r2(t.rot), t.stun > 0 ? 1 : 0, t.st.kind === 'wall' ? Math.round(t.hp) : t.st.kind === 'trap' ? t.spikes : -1])
    };
  }
  // everything a device joining needs to draw the same game
  function fullState(s) {
    const m = s.map;
    return { map: s.mapId, diff: s.diff, round: s.round, lives: Math.ceil(s.lives), maxLives: s.maxLives, res: [s.res.wood, s.res.stone], crew: s.players.map((p) => ({ id: p.id, name: p.name, slot: p.slot, weapon: p.weapon })),
      tiles: Array.from(m.tiles), life: Array.from(m.life), towers: s.towers.map(towerInfo), snap: snapshot(s) };
  }
  // a game saved between rounds (to carry on later); players are kept by their slot
  function save(s) {
    return { v: 2, map: s.mapId, diff: s.diff, seed: s.seed, rng: s.rng, round: s.round, lives: Math.ceil(s.lives), t: Math.round(s.t), wonAt: s.wonAt, freeplay: s.freeplay, nextId: s.nextId,
      tiles: Array.from(s.map.tiles), life: Array.from(s.map.life), stats: Object.assign({}, s.stats), res: Object.assign({}, s.res), felled: s.felled.map((q) => [q.i, q.t, q.r]),
      towers: s.towers.map((t) => ({ id: t.id, type: t.type, tx: t.tx, tz: t.tz, a: t.a, b: t.b, spent: t.spent, mat: t.mat || 0, mode: t.mode, slot: t.slot, hp: Math.round(t.hp), spikes: t.spikes })),
      players: s.players.map((p) => ({ slot: p.slot, name: p.name, weapon: p.weapon, wlvl: p.wlvl, wxp: Math.round(p.wxp * 10) / 10, coins: Math.floor(p.coins), kills: p.kills })) };
  }
  // carry on a saved game: o as for newGame (crew: the players here now; each takes the saved player of its slot)
  function load(o, sv) {
    const s = newGame({ map: o.map, rounds: o.rounds, diff: sv.diff, crew: o.crew, seed: sv.seed });
    s.rng = sv.rng; s.round = sv.round; s.lives = sv.lives; s.t = sv.t || 0; s.wonAt = sv.wonAt || 0; s.freeplay = !!sv.freeplay; s.nextId = sv.nextId || 1;
    for (let i = 0; i < s.map.tiles.length && i < sv.tiles.length; i++) { s.map.tiles[i] = sv.tiles[i]; s.map.life[i] = sv.life[i]; }
    Object.assign(s.stats, sv.stats || {});
    if (sv.res) s.res = { wood: sv.res.wood || 0, stone: sv.res.stone || 0 };
    s.felled = (sv.felled || []).map((q) => ({ i: q[0], t: q[1], r: q[2] }));
    s.saved = {};
    for (const q of sv.players) s.saved[q.slot] = { name: q.name, weapon: q.weapon, wlvl: q.wlvl, wxp: q.wxp, coins: q.coins, kills: q.kills };
    for (const p of s.players) if (s.saved[p.slot]) { const q = s.saved[p.slot]; Object.assign(p, { weapon: q.weapon, wlvl: q.wlvl, wxp: q.wxp, coins: q.coins, kills: q.kills, st: weaponStats(q.weapon, q.wlvl) }); delete s.saved[p.slot]; }
    for (const q of sv.towers) {
      const owner = s.players.find((p) => p.slot === q.slot);
      const t = { id: q.id, type: q.type, tx: q.tx, tz: q.tz, x: q.tx + 0.5, z: q.tz + 0.5, a: q.a, b: q.b, spent: q.spent, mat: q.mat || 0, mode: q.mode, by: owner ? owner.id : null, slot: q.slot, cd: 0.3, rot: 0, stun: 0, timers: {}, hp: q.hp, spikes: q.spikes, st: null, done: 0 };
      s.towers.push(t); s.tmap.set(t.id, t);
      s.occ[t.tz * s.map.w + t.tx] = t.id;
    }
    refreshStats(s); roadIndex(s);
    s.wave = { state: 'wait', timer: 0, groups: [], hold: true };   // a game carried on waits for its players
    return s;
  }

  return {
    TICK: TICK, PACE: PACE, MAT_UP: MAT_UP, FELL_GOT: FELL_GOT, REGROW: REGROW, T: T, WALK: WALK, BUILD_OK: BUILD_OK, ROAD_OK: ROAD_OK, CASTLE_R: CASTLE_R, START_COINS: START_COINS, LAST_ROUND: LAST_ROUND, SELL_BACK: SELL_BACK, MAX_LEVEL: MAX_LEVEL,
    DIFFS: DIFFS, TIER_HP: TIER_HP, ELEMENTS: ELEMENTS, ELEMENT_ORDER: ELEMENT_ORDER, canHit: canHit, MAX_ALIVE: MAX_ALIVE, eliteOf: eliteOf, WEAPONS: WEAPONS, WEAPON_ORDER: WEAPON_ORDER, TOWERS: TOWERS, TOWER_ORDER: TOWER_ORDER, ZOMBIES: ZOMBIES, ZOMBIE_ORDER: ZOMBIE_ORDER,
    TURRETS: TOWERS, TURRET_ORDER: TOWER_ORDER,
    makeMap: makeMap, pathAt: pathAt, newGame: newGame, addPlayer: addPlayer, removePlayer: removePlayer, step: step, startRound: startRound,
    moveCircle: moveCircle, movePlayer: movePlayer, playerSolid: playerSolid, freeSpot: freeSpot, castleDist: castleDist, gatePoint: gatePoint, tileAt: tileAt,
    canBuild: canBuild, price: price, upgradeInfo: upgradeInfo, sellValue: sellValue, sellMat: sellMat, towerStats: towerStats, weaponStats: weaponStats, xpNeed: xpNeed, hpRound: hpRound,
    roundGroups: roundGroups, snapshot: snapshot, fullState: fullState, towerInfo: towerInfo, save: save, load: load, zFlags: zFlags,
    build: build, spawnZombie: spawnZombie   // for tests and the picture gallery: build(s, type, tx, tz, null, ev) is free
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CC;
