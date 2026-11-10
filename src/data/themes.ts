// Holiday themes for the "spin the wheel" inspiration. Static on purpose: no API, nothing to leak.

export type Destination = { id: string; name: string; country: string; pitch: string };
export type Theme = { id: string; name: string; when: string; destinations: Destination[] };

const d = (id: string, name: string, country: string, pitch: string): Destination => ({ id, name, country, pitch });

export const THEMES: Theme[] = [
  {
    id: 'christmas',
    name: 'Christmas markets & cosy winter',
    when: 'Late November to December',
    destinations: [
      d('strasbourg', 'Strasbourg', 'France', 'The self-styled capital of Christmas: timber houses, mulled wine and a giant tree on Place Kléber.'),
      d('vienna', 'Vienna', 'Austria', 'Markets in front of palaces, coffee houses to warm up in, and a waltz or two.'),
      d('tallinn', 'Tallinn', 'Estonia', 'A medieval old town under snow, with a market on the square where a tree stood in 1441.'),
      d('quebec', 'Québec City', 'Canada', 'Stone walls, real snow and a German Christmas market in the heart of French North America.'),
      d('nuremberg', 'Nuremberg', 'Germany', 'The Christkindlesmarkt: gingerbread, tiny sausages and a candle-lit old town.'),
      d('rovaniemi', 'Rovaniemi', 'Finland', 'On the Arctic Circle: husky rides, reindeer and the shortest days of the year.'),
      d('copenhagen', 'Copenhagen', 'Denmark', 'Tivoli lit up, canal-side markets and hygge at its most serious.'),
      d('prague', 'Prague', 'Czechia', 'Old Town Square, a gothic skyline and trdelník on every corner.'),
      d('edinburgh', 'Edinburgh', 'Scotland', 'A castle on a crag, a big wheel in the gardens and ceilidhs into the night.'),
      d('zermatt', 'Zermatt', 'Switzerland', 'A car-free village under the Matterhorn, with sleigh bells and fondue.'),
    ],
  },
  {
    id: 'newyear',
    name: "New Year's Eve",
    when: 'Around 31 December',
    destinations: [
      d('sydney', 'Sydney', 'Australia', 'Fireworks off the Harbour Bridge, and it is summer.'),
      d('reykjavik', 'Reykjavík', 'Iceland', 'Bonfires, the whole town setting off fireworks, maybe the northern lights.'),
      d('edinburgh-ny', 'Edinburgh', 'Scotland', 'Hogmanay: a torchlight procession, a street party and fireworks over the castle.'),
      d('rio', 'Rio de Janeiro', 'Brazil', 'Dress in white, jump seven waves on Copacabana for luck.'),
      d('berlin', 'Berlin', 'Germany', 'Two kilometres of party at the Brandenburg Gate.'),
      d('madeira', 'Funchal, Madeira', 'Portugal', 'One of the biggest firework shows in the world, watched from a mild Atlantic island.'),
      d('tokyo', 'Tokyo', 'Japan', 'Temple bells ring 108 times, then the first shrine visit of the year.'),
      d('capetown', 'Cape Town', 'South Africa', 'Waterfront fireworks with Table Mountain behind and a beach day after.'),
      d('valletta', 'Valletta', 'Malta', 'A golden city on a harbour, fireworks over the water and mild weather.'),
    ],
  },
  {
    id: 'easter',
    name: 'Easter & spring blossom',
    when: 'March to May',
    destinations: [
      d('seville', 'Seville', 'Spain', 'Semana Santa processions by candlelight and orange blossom everywhere.'),
      d('kyoto', 'Kyoto', 'Japan', 'Cherry blossom over temples and canals in early April.'),
      d('amsterdam', 'Amsterdam', 'Netherlands', 'Tulip fields a bike ride away and canals at their prettiest.'),
      d('florence', 'Florence', 'Italy', 'Scoppio del Carro on Easter Sunday, then gelato on the Arno.'),
      d('corfu', 'Corfu', 'Greece', 'Greek Orthodox Easter: clay pots thrown from balconies and midnight fireworks.'),
      d('washington', 'Washington, D.C.', 'USA', 'The Tidal Basin cherry trees and free museums for rainy days.'),
      d('krakow', 'Kraków', 'Poland', 'Painted eggs, Easter markets and a huge medieval square.'),
      d('madeira-spring', 'Madeira', 'Portugal', 'The flower festival and levada walks through green valleys.'),
      d('jeju', 'Jeju Island', 'South Korea', 'Canola fields, cherry blossom and volcanic coastline.'),
    ],
  },
  {
    id: 'summer',
    name: 'Summer sun',
    when: 'June to August',
    destinations: [
      d('algarve', 'The Algarve', 'Portugal', 'Golden cliffs, sea caves and grilled sardines.'),
      d('dubrovnik', 'Dubrovnik', 'Croatia', 'Walk the city walls, then swim off the rocks.'),
      d('lofoten', 'Lofoten', 'Norway', 'Midnight sun, red fishing huts and peaks straight out of the sea.'),
      d('sardinia', 'Sardinia', 'Italy', 'Water so clear it looks like the Caribbean.'),
      d('naxos', 'Naxos', 'Greece', 'Long sandy beaches, mountain villages and very good cheese.'),
      d('slovenia', 'Lake Bled', 'Slovenia', 'An island church in an alpine lake, and the Julian Alps to hike.'),
      d('bali', 'Bali', 'Indonesia', 'Rice terraces, surf and temples during the dry season.'),
      d('vancouver-island', 'Vancouver Island', 'Canada', 'Whales, rainforest and long empty beaches.'),
      d('mallorca', 'Mallorca', 'Spain', 'Coves, mountain cycling and the old town of Palma.'),
      d('scottish-isles', 'Isle of Skye', 'Scotland', 'Long light evenings, fairy pools and dramatic ridges.'),
    ],
  },
  {
    id: 'autumn',
    name: 'Autumn colours',
    when: 'September to November',
    destinations: [
      d('vermont', 'Vermont', 'USA', 'Maple forests turning red, covered bridges and apple cider.'),
      d('kyoto-autumn', 'Kyoto', 'Japan', 'Maple leaves lit up at night in temple gardens.'),
      d('dolomites', 'The Dolomites', 'Italy', 'Golden larches under pale limestone towers.'),
      d('bavaria', 'Bavaria', 'Germany', 'Castles, beer gardens and forests turning gold.'),
      d('douro', 'Douro Valley', 'Portugal', 'Grape harvest on terraced vineyards along the river.'),
      d('quebec-autumn', 'Laurentians', 'Canada', 'Lakes framed in red and orange, with cosy cabins.'),
      d('lake-district', 'Lake District', 'England', 'Bracken on the fells and pubs with fireplaces.'),
      d('transylvania', 'Transylvania', 'Romania', 'Fortified churches, Carpathian forests and Halloween-adjacent castles.'),
    ],
  },
  {
    id: 'ski',
    name: 'Ski & snow',
    when: 'December to April',
    destinations: [
      d('chamonix', 'Chamonix', 'France', 'Under Mont Blanc, for skiers of every level and none.'),
      d('stanton', 'St. Anton', 'Austria', 'Big skiing and even bigger après-ski.'),
      d('niseko', 'Niseko', 'Japan', 'Famous powder snow, hot springs and ramen.'),
      d('whistler', 'Whistler', 'Canada', 'One of the largest ski areas in North America, with a village to match.'),
      d('engadin', 'Engadin', 'Switzerland', 'Frozen lakes, cross-country trails and sunny slopes.'),
      d('tromso', 'Tromsø', 'Norway', 'Ski touring by day, northern lights by night.'),
      d('dolomiti-superski', 'Val Gardena', 'Italy', 'The Sella Ronda loop and Italian food at every hut.'),
      d('bansko', 'Bansko', 'Bulgaria', 'Affordable skiing in the Pirin mountains with an old-town feel.'),
    ],
  },
  {
    id: 'carnival',
    name: 'Carnival & festivals',
    when: 'Varies by festival',
    destinations: [
      d('venice', 'Venice', 'Italy', 'Carnival masks and costumes in February.'),
      d('rio-carnival', 'Rio de Janeiro', 'Brazil', 'Samba parades and street parties before Lent.'),
      d('cologne', 'Cologne', 'Germany', 'Carnival: costumes, singing and a city-wide party in winter.'),
      d('new-orleans', 'New Orleans', 'USA', 'Mardi Gras parades, brass bands and beignets.'),
      d('valencia', 'Valencia', 'Spain', 'Las Fallas in March: giant sculptures, fireworks, then they burn it all.'),
      d('edinburgh-fringe', 'Edinburgh', 'Scotland', 'The Fringe in August: thousands of shows in one month.'),
      d('munich', 'Munich', 'Germany', 'Oktoberfest from late September: tents, brass bands, pretzels.'),
      d('jaipur', 'Jaipur', 'India', 'Holi in spring: colour, music and the Pink City.'),
      d('chiang-mai', 'Chiang Mai', 'Thailand', 'Yi Peng in November: thousands of lanterns released at once.'),
    ],
  },
  {
    id: 'aurora',
    name: 'Northern lights',
    when: 'September to March',
    destinations: [
      d('tromso-aurora', 'Tromsø', 'Norway', 'A city right under the auroral oval, with fjords to escape the clouds.'),
      d('abisko', 'Abisko', 'Sweden', 'Famous for clear skies, and a chairlift up to the aurora station.'),
      d('iceland', 'Iceland', 'Iceland', 'Road-trip the south coast and chase gaps in the clouds.'),
      d('yellowknife', 'Yellowknife', 'Canada', 'One of the best places on Earth to see the lights, if you can handle −30°C.'),
      d('fairbanks', 'Fairbanks', 'USA', 'Alaska: hot springs, dog sleds and long dark nights.'),
      d('saariselka', 'Saariselkä', 'Finland', 'Glass igloos, reindeer farms and very quiet forests.'),
      d('senja', 'Senja', 'Norway', 'A quieter island alternative to Lofoten with dramatic peaks.'),
      d('kiruna', 'Kiruna', 'Sweden', 'The Icehotel, and husky trips out into the dark.'),
    ],
  },
];

export const SURPRISE: Theme = {
  id: 'surprise',
  name: 'Surprise me',
  when: 'Any time',
  destinations: THEMES.flatMap((t) => t.destinations),
};

export const ALL_THEMES = [...THEMES, SURPRISE];

export const findTheme = (id: string) => ALL_THEMES.find((t) => t.id === id);
export const findDestination = (themeId: string, destId: string) => findTheme(themeId)?.destinations.find((x) => x.id === destId);
