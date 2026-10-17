/* shared/knowledge.js — General knowledge for the games: BABIES (animals and their young), CAPITALS, SCIENCE facts,
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
// A quiz question: t has one "?" for the answer; wrong = n - 1 real but wrong answers
function quizQuestion(tier, n) {
  const t3 = Math.max(0, Math.min(2, tier)), kind = pick(['capital', 'capital', 'science', 'science', 'baby']);
  let t, a, wrong;
  if (kind === 'capital') { const [c, cap] = pick(CAPITALS[t3]); t = 'Capital of ' + c + ': ?'; a = cap; wrong = shuffle(CAPITALS[t3].filter((x) => x[1] !== cap).map((x) => x[1])); }
  else if (kind === 'baby') {
    const [, an, b] = pick(BABIES[t3]); t = 'Baby ' + an + ': ?'; a = b;
    wrong = shuffle(BABIES[t3].map((x) => x[2]).filter((x, i, all) => x !== b && all.indexOf(x) === i));
  } else { const [q, ans, bad] = pick(SCIENCE[t3]); t = q; a = ans; wrong = shuffle(bad.slice()); }
  return { t: t, a: a, quiz: true, english: true, kind: kind, wrong: wrong.slice(0, n - 1) };
}
