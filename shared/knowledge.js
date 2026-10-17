/* shared/knowledge.js — General knowledge for the games: BABIES (animals and their young), CAPITALS, SCIENCE, WORLD (geography), TIME (calendar) and ANIMALS facts,
   each in three levels (ages 7–8, 9–10, 11–12), and quizQuestion() for quiz games. Needs pick, shuffle.
   Inlined at build time (see build.js). */
// animals and their young: [animal emoji, animal, baby]
const BABIES = [
  [['🐄', 'cow', 'calf'], ['🐑', 'sheep', 'lamb'], ['🐈', 'cat', 'kitten'], ['🐕', 'dog', 'puppy'], ['🐔', 'hen', 'chick'], ['🐎', 'horse', 'foal'], ['🦆', 'duck', 'duckling'], ['🐖', 'pig', 'piglet'],
   ['🐸', 'frog', 'tadpole'], ['🐻', 'bear', 'cub'], ['🦋', 'butterfly', 'caterpillar'], ['🐐', 'goat', 'kid']],
  [['🦁', 'lion', 'cub'], ['🦘', 'kangaroo', 'joey'], ['🦢', 'swan', 'cygnet'], ['🦌', 'deer', 'fawn'], ['🦉', 'owl', 'owlet'], ['🐇', 'rabbit', 'kit'], ['🦊', 'fox', 'cub'], ['🐋', 'whale', 'calf'],
   ['🐘', 'elephant', 'calf'], ['🦅', 'eagle', 'eaglet'], ['🐿️', 'squirrel', 'kit'], ['🐢', 'turtle', 'hatchling'], ['🦈', 'shark', 'pup'], ['🦙', 'llama', 'cria'], ['🦚', 'peacock', 'peachick'], ['🦜', 'parrot', 'chick']],
  [['🐨', 'koala', 'joey'], ['🦭', 'seal', 'pup'], ['🐟', 'fish', 'fry'], ['🦇', 'bat', 'pup'], ['🐦', 'pigeon', 'squab'], ['🦒', 'giraffe', 'calf'], ['🦓', 'zebra', 'foal'], ['🐊', 'crocodile', 'hatchling'],
   ['🦔', 'hedgehog', 'hoglet'], ['🐍', 'snake', 'snakelet'], ['🦫', 'beaver', 'kit'], ['🐧', 'penguin', 'chick'], ['🐝', 'bee', 'larva'], ['🦗', 'cricket', 'nymph']]
];
// countries and their capital cities, well-known first
const CAPITALS = [
  [['Vietnam', 'Hanoi'], ['Japan', 'Tokyo'], ['France', 'Paris'], ['England', 'London'], ['China', 'Beijing'], ['Italy', 'Rome'], ['Spain', 'Madrid'], ['Germany', 'Berlin'],
   ['Russia', 'Moscow'], ['Egypt', 'Cairo'], ['Thailand', 'Bangkok'], ['South Korea', 'Seoul'], ['Greece', 'Athens'], ['USA', 'Washington']],
  [['Australia', 'Canberra'], ['Canada', 'Ottawa'], ['India', 'New Delhi'], ['Brazil', 'Brasília'], ['Mexico', 'Mexico City'], ['Argentina', 'Buenos Aires'], ['Kenya', 'Nairobi'], ['Austria', 'Vienna'],
   ['Philippines', 'Manila'], ['Ireland', 'Dublin'], ['Portugal', 'Lisbon'], ['Norway', 'Oslo'], ['Sweden', 'Stockholm'], ['Netherlands', 'Amsterdam'], ['Malaysia', 'Kuala Lumpur'], ['Cambodia', 'Phnom Penh']],
  [['Turkey', 'Ankara'], ['New Zealand', 'Wellington'], ['Switzerland', 'Bern'], ['Morocco', 'Rabat'], ['Nigeria', 'Abuja'], ['Pakistan', 'Islamabad'], ['Bangladesh', 'Dhaka'], ['Peru', 'Lima'],
   ['Chile', 'Santiago'], ['Laos', 'Vientiane'], ['Myanmar', 'Naypyidaw'], ['Finland', 'Helsinki'], ['Poland', 'Warsaw'], ['Iceland', 'Reykjavík'], ['Mongolia', 'Ulaanbaatar'], ['Colombia', 'Bogotá']]
];
// science facts: [question with ? for the answer, answer, wrong answers that are clearly wrong]
const SCIENCE = [
  [['The Sun is a: ?', 'star', ['planet', 'moon', 'cloud']], ['Bees make: ?', 'honey', ['milk', 'silk', 'wax paper']], ['Ice melts into: ?', 'water', ['steam', 'sand', 'snow']],
   ['We see with our: ?', 'eyes', ['ears', 'nose', 'hands']], ['Plants grow from: ?', 'seeds', ['rocks', 'shells', 'bones']], ['A magnet pulls: ?', 'iron', ['wood', 'paper', 'glass']],
   ['The planet we live on: ?', 'Earth', ['Mars', 'Venus', 'Jupiter']], ['Frogs start life as: ?', 'tadpoles', ['caterpillars', 'chicks', 'kittens']], ['Water freezes into: ?', 'ice', ['steam', 'mud', 'salt']],
   ['Our heart pumps: ?', 'blood', ['air', 'water', 'food']], ['A rainbow has seven: ?', 'colours', ['days', 'clouds', 'legs']], ['Fish breathe with: ?', 'gills', ['lungs', 'fins', 'scales']],
   ['We get daylight from the: ?', 'Sun', ['Moon', 'sea', 'wind']], ['Spiders have eight: ?', 'legs', ['wings', 'eyes', 'tails']]],
  [['Planet nearest the Sun: ?', 'Mercury', ['Venus', 'Mars', 'Saturn']], ['Largest planet: ?', 'Jupiter', ['Earth', 'Mars', 'Mercury']], ['The red planet: ?', 'Mars', ['Venus', 'Neptune', 'Jupiter']],
   ['Gas we breathe in to live: ?', 'oxygen', ['helium', 'smoke', 'steam']], ['Water boils at (°C): ?', '100', ['50', '10', '1000']], ['Solid, liquid and gas are states of: ?', 'matter', ['weather', 'energy', 'motion']],
   ['The force that pulls things down: ?', 'gravity', ['friction', 'magnetism', 'wind']], ['Animals that eat only plants: ?', 'herbivores', ['carnivores', 'predators', 'insects']],
   ['Largest organ of the body: ?', 'skin', ['heart', 'brain', 'lungs']], ['Bones that protect the brain: ?', 'skull', ['ribs', 'spine', 'knees']], ['A baby frog breathes with: ?', 'gills', ['lungs', 'wings', 'shells']],
   ['Plant roots take in: ?', 'water', ['light', 'sound', 'smoke']], ['Plants make food using: ?', 'sunlight', ['moonlight', 'rocks', 'plastic']], ['The Moon goes round the: ?', 'Earth', ['Mars', 'Venus', 'Jupiter']]],
  [['Fe is the symbol for: ?', 'iron', ['lead', 'gold', 'copper']], ['Au is the symbol for: ?', 'gold', ['silver', 'aluminium', 'iron']], ['Gas plants use to make food: ?', 'carbon dioxide', ['helium', 'neon', 'hydrogen']],
   ['Process by which plants make food: ?', 'photosynthesis', ['digestion', 'evaporation', 'erosion']], ['Water turning into vapour: ?', 'evaporation', ['condensation', 'freezing', 'melting']],
   ['Bones in an adult human: ?', '206', ['106', '306', '26']], ['Centre of an atom: ?', 'nucleus', ['electron', 'shell', 'orbit']], ['Animals with a backbone: ?', 'vertebrates', ['invertebrates', 'insects', 'fungi']],
   ['Rock formed from cooled lava: ?', 'igneous', ['fossil', 'chalk', 'coral']], ['Cells carrying oxygen in blood: ?', 'red blood cells', ['white blood cells', 'nerve cells', 'skin cells']],
   ['The gas most of the air is made of: ?', 'nitrogen', ['oxygen', 'carbon dioxide', 'helium']], ['Planet with the biggest rings: ?', 'Saturn', ['Mars', 'Mercury', 'Venus']],
   ['Speed of light is about 300,000 km per: ?', 'second', ['hour', 'day', 'year']], ['Layer of gas around the Earth: ?', 'atmosphere', ['crust', 'core', 'mantle']]]
];
// geography facts, same shape as SCIENCE; the wrong answers are real places that are clearly wrong
const WORLD = [
  [['The biggest ocean: ?', 'Pacific', ['Atlantic', 'Indian', 'Arctic']], ['The coldest continent: ?', 'Antarctica', ['Africa', 'Asia', 'Europe']],
   ['Land with water all around it: ?', 'island', ['hill', 'valley', 'desert']], ['A very dry, sandy place: ?', 'desert', ['forest', 'river', 'island']],
   ['A mountain that can erupt: ?', 'volcano', ['valley', 'lake', 'beach']], ['Water flowing across the land to the sea: ?', 'river', ['desert', 'cliff', 'cave']],
   ['How many continents are there: ?', '7', ['5', '10', '3']], ['Kangaroos live in the wild in: ?', 'Australia', ['Canada', 'Norway', 'Brazil']],
   ['Giant pandas live in the wild in: ?', 'China', ['Kenya', 'Mexico', 'France']], ['A big area of land covered in trees: ?', 'forest', ['beach', 'desert', 'ocean']],
   ['Polar bears live near the: ?', 'North Pole', ['South Pole', 'equator', 'Sahara']], ['Salty water covering most of the Earth: ?', 'ocean', ['lake', 'pond', 'river']]],
  [['The largest continent: ?', 'Asia', ['Europe', 'Africa', 'Australia']], ['The River Nile is in: ?', 'Africa', ['Asia', 'Europe', 'South America']],
   ['The Amazon rainforest is mostly in: ?', 'Brazil', ['Egypt', 'India', 'Spain']], ['The highest mountain on Earth: ?', 'Everest', ['Kilimanjaro', 'Ben Nevis', 'Mont Blanc']],
   ['The line around the middle of the Earth: ?', 'equator', ['horizon', 'coastline', 'border']], ['The biggest hot desert: ?', 'Sahara', ['Gobi', 'Atacama', 'Kalahari']],
   ['The ocean between Europe and America: ?', 'Atlantic', ['Pacific', 'Indian', 'Arctic']], ['The Great Barrier Reef is near: ?', 'Australia', ['Iceland', 'Canada', 'Russia']],
   ['Big Ben is in: ?', 'London', ['Paris', 'Rome', 'Madrid']], ['The Eiffel Tower is in: ?', 'Paris', ['London', 'Berlin', 'Rome']],
   ['The pyramids of Giza are in: ?', 'Egypt', ['Greece', 'Japan', 'Brazil']], ['A tool whose needle points north: ?', 'compass', ['ruler', 'clock', 'telescope']]],
  [['The longest river in South America: ?', 'Amazon', ['Nile', 'Danube', 'Thames']], ['The smallest country in the world: ?', 'Vatican City', ['Monaco', 'Malta', 'Luxembourg']],
   ['Mountains between Spain and France: ?', 'Pyrenees', ['Alps', 'Andes', 'Himalayas']], ['The mountain range with Everest: ?', 'Himalayas', ['Andes', 'Alps', 'Rockies']],
   ['Mountains along the west of South America: ?', 'Andes', ['Alps', 'Urals', 'Pyrenees']], ['The line of 0° longitude: ?', 'Prime Meridian', ['equator', 'Arctic Circle', 'Tropic of Cancer']],
   ['The river that flows through London: ?', 'Thames', ['Seine', 'Danube', 'Rhine']], ['The river that flows through Paris: ?', 'Seine', ['Thames', 'Tiber', 'Volga']],
   ['The deepest place in the oceans: ?', 'Mariana Trench', ['Grand Canyon', 'Dead Sea', 'Great Rift Valley']], ['The largest island (not a continent): ?', 'Greenland', ['Iceland', 'Ireland', 'Sicily']],
   ['The continent with the most countries: ?', 'Africa', ['Europe', 'South America', 'Australia']], ['Lines on a map joining places of equal height: ?', 'contour lines', ['grid lines', 'borders', 'roads']]]
];
// time and calendar facts, same shape as SCIENCE
const TIME = [
  [['Days in a week: ?', '7', ['5', '10', '12']], ['Months in a year: ?', '12', ['10', '7', '24']], ['Hours in a day: ?', '24', ['12', '60', '10']],
   ['Minutes in an hour: ?', '60', ['100', '24', '30']], ['The month after March: ?', 'April', ['May', 'February', 'June']],
   ['The day after Friday: ?', 'Saturday', ['Thursday', 'Sunday', 'Monday']], ['The season after winter: ?', 'spring', ['summer', 'autumn', 'winter']],
   ['The first month of the year: ?', 'January', ['December', 'March', 'June']], ['Days in a weekend: ?', '2', ['3', '5', '7']],
   ['The day before Wednesday: ?', 'Tuesday', ['Thursday', 'Monday', 'Friday']]],
  [['Days in a leap year: ?', '366', ['365', '360', '300']], ['Seconds in a minute: ?', '60', ['100', '30', '24']], ['Days in a fortnight: ?', '14', ['10', '7', '15']],
   ['Years in a decade: ?', '10', ['100', '12', '5']], ['Years in a century: ?', '100', ['10', '1000', '50']], ['The shortest month: ?', 'February', ['April', 'June', 'November']],
   ['Minutes in a quarter of an hour: ?', '15', ['25', '45', '4']], ['Months with 30 days, like April: ?', '4', ['2', '6', '7']],
   ['The ninth month of the year: ?', 'September', ['November', 'October', 'August']], ['Weeks in a year (about): ?', '52', ['12', '48', '100']]],
  [['Years in a millennium: ?', '1000', ['100', '10', '10,000']], ['Hours in a week: ?', '168', ['148', '120', '84']], ['Minutes in a day: ?', '1440', ['1200', '2400', '720']],
   ['Seconds in an hour: ?', '3600', ['600', '360', '6000']], ['Months with 31 days: ?', '7', ['6', '5', '8']], ['Days in a year that is not a leap year: ?', '365', ['366', '364', '360']],
   ['Months in a quarter of a year: ?', '3', ['4', '6', '2']], ['How often a leap year comes (years): ?', '4', ['2', '5', '10']],
   ['18:30 on a 12-hour clock: ?', '6:30 pm', ['8:30 pm', '6:30 am', '1:30 pm']], ['Days in March, July and August together: ?', '93', ['90', '92', '91']]]
];
// animal facts, same shape as SCIENCE (wrong answers are clearly wrong, never a second right one)
const ANIMALS = [
  [['The fastest land animal: ?', 'cheetah', ['elephant', 'cow', 'tortoise']], ['The tallest animal: ?', 'giraffe', ['horse', 'bear', 'lion']],
   ['An animal that carries its baby in a pouch: ?', 'kangaroo', ['zebra', 'wolf', 'goat']], ['A bird that cannot fly: ?', 'penguin', ['eagle', 'robin', 'owl']],
   ['The biggest animal that has ever lived: ?', 'blue whale', ['elephant', 'shark', 'giraffe']], ['Spiders spin: ?', 'webs', ['nests', 'shells', 'tunnels']],
   ['Bees live in a: ?', 'hive', ['den', 'stable', 'kennel']], ['An animal with black and white stripes: ?', 'zebra', ['lion', 'bear', 'camel']],
   ['A camel stores fat in its: ?', 'hump', ['tail', 'ears', 'feet']], ['An elephant picks things up with its: ?', 'trunk', ['tail', 'ears', 'tusks']]],
  [['The largest land animal: ?', 'elephant', ['giraffe', 'hippo', 'rhino']], ['Animals that sleep through the winter: ?', 'hibernate', ['migrate', 'hatch', 'hunt']],
   ['Birds that fly to warmer places for winter: ?', 'migrate', ['hibernate', 'nest', 'hatch']], ['A group of wolves: ?', 'pack', ['herd', 'flock', 'swarm']],
   ['A group of sheep: ?', 'flock', ['pack', 'pride', 'swarm']], ['A group of lions: ?', 'pride', ['pack', 'flock', 'herd']],
   ['How many legs an insect has: ?', '6', ['8', '4', '10']], ['How many legs a spider has: ?', '8', ['6', '4', '10']],
   ['The only mammal that can really fly: ?', 'bat', ['ostrich', 'eagle', 'dolphin']], ['A whale breathes through its: ?', 'blowhole', ['gills', 'fins', 'tail']]],
  [['Cold-blooded animals with scales, like snakes: ?', 'reptiles', ['mammals', 'birds', 'amphibians']], ['Animals that live in water and on land, like frogs: ?', 'amphibians', ['reptiles', 'mammals', 'insects']],
   ['Animals that are active at night: ?', 'nocturnal', ['migratory', 'aquatic', 'diurnal']], ['A scientist who studies animals: ?', 'zoologist', ['botanist', 'geologist', 'astronomer']],
   ['A scientist who studies plants: ?', 'botanist', ['zoologist', 'geologist', 'astronomer']], ['The natural home of an animal or plant: ?', 'habitat', ['climate', 'colony', 'cocoon']],
   ['A species with none left alive: ?', 'extinct', ['endangered', 'dormant', 'captive']], ['A caterpillar turning into a butterfly: ?', 'metamorphosis', ['photosynthesis', 'evaporation', 'hibernation']],
   ['An animal without a backbone: ?', 'invertebrate', ['vertebrate', 'mammal', 'reptile']], ['Mammals that carry babies in a pouch: ?', 'marsupials', ['rodents', 'primates', 'reptiles']]]
];
// A quiz question: t has one "?" for the answer; wrong = n - 1 real but wrong answers
function quizQuestion(tier, n) {
  const t3 = Math.max(0, Math.min(2, tier)), kind = pick(['capital', 'capital', 'science', 'science', 'world', 'world', 'time', 'animal', 'baby']);
  let t, a, wrong;
  if (kind === 'capital') { const [c, cap] = pick(CAPITALS[t3]); t = 'Capital of ' + c + ': ?'; a = cap; wrong = shuffle(CAPITALS[t3].filter((x) => x[1] !== cap).map((x) => x[1])); }
  else if (kind === 'baby') {
    const [, an, b] = pick(BABIES[t3]); t = 'Baby ' + an + ': ?'; a = b;
    wrong = shuffle(BABIES[t3].map((x) => x[2]).filter((x, i, all) => x !== b && all.indexOf(x) === i));
  } else { const [q, ans, bad] = pick((kind === 'world' ? WORLD : kind === 'time' ? TIME : kind === 'animal' ? ANIMALS : SCIENCE)[t3]); t = q; a = ans; wrong = shuffle(bad.slice()); }
  return { t: t, a: a, quiz: true, english: true, kind: kind, wrong: wrong.slice(0, n - 1) };
}
