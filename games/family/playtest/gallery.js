// Takes pictures of Family Fighters' drawings (playtest/gallery.html) for checking the art by eye.
// Usage: ND_URL=file:///D:/Github/number-dash/games/family/playtest/gallery.html ND_READY=window.ready ND_BOT=none node games/dash/playtest/shoot.js games/family/playtest/gallery.js
const base = (process.env.ND_URL || '').split('?')[0];
const go = (q, name) => [{ eval: 'location.href = ' + JSON.stringify(base + '?' + q) }, { sleep: 900 }, { waitFor: 'window.ready', timeout: 8000 }, { sleep: 400 }, { shot: name }];
module.exports = [
  { viewport: [1280, 720] },
  ...go('set=heroes&place=market', 'ff-heroes'),
  ...go('set=poses&place=oldquarter', 'ff-poses'),
  ...go('set=zombies&place=ricefield', 'ff-zombies'),
  ...go('set=things&place=school', 'ff-things'),
  ...go('set=bosses&boss=chef&place=market', 'ff-boss-chef'),
  ...go('set=bosses&boss=crab&place=beach&pose=0.5', 'ff-boss-crab'),
  ...go('set=bosses&boss=batqueen&place=cave', 'ff-boss-batqueen'),
  ...go('set=bosses&boss=scooter&place=oldquarter&shield=1', 'ff-boss-scooter'),
  ...go('set=bosses&boss=scarecrow&place=ricefield', 'ff-boss-scarecrow'),
  ...go('set=bosses&boss=headmaster&place=school&pose=1', 'ff-boss-headmaster'),
  ...go('set=bosses&boss=pirate&place=bay', 'ff-boss-pirate'),
  ...go('set=bosses&boss=yeti&place=mountain', 'ff-boss-yeti'),
  ...go('set=bosses&boss=doctor&place=rooftop', 'ff-boss-doctor'),
  ...go('set=bosses&boss=mega&place=lab', 'ff-boss-mega')
];
