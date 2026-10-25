// The game itself (the new game play, Audrey's brief of 24 Oct 2026: claude/game-plan-v2.md), release 1 step 1: a new
// farm. The farm's state and its rules so far, saved on the phone with checks on every load (Audrey: "Take security of the
// game into account please"), and the game's words in English and French. The 3D village (main.js) draws it.
//
// The farm: coins, XP (the level always comes from the XP, never from the save), the farmer (him or her, and a name),
// the patches of land owned (the village's plots), the coops (a breed, how far it's been done up: 0 rustic .. 4 Deluxe,
// the patch it stands on, the eggs waiting in its nest, its feeder) and the birds: each breed's forever trio, a rooster
// and two hens with three different personalities, who stay for good and earn experience and trust.
//
// Step 3, eggs and feed: each hen lays twice a day on the phone's own clock, once in the morning and once in the
// afternoon, at times of her own that change from day to day, while her coop's feeder has food in it and its nest has
// room. Tap the nest and the eggs are sold. The feeder goes down as the trio eats; fill it for a few coins. Away from the
// game, the eggs of the last two days are there when you come back; a clock put back gives nothing.
//
// Step 5, levels and land: the XP fills the level ring; a new level's card once, saying what it brings. The village's
// plots are the patches of land: one more can be bought at each level, offered one at a time in order, the nearest to the
// first coop first (Audrey: "One at a time, in order"), from 100 coins at level 2 to 10,000 at level 30.
//
// Step 4, chicks: now and then a hen goes broody (each morning at 7, a good mum more often than the others; one brood at a
// time in a coop, a day's rest after one, never on the farm's first day). She sits on her eggs for a day (laying none for
// sale), they hatch the next morning (2 or 3 chicks, a good mum 3 or 4) and she raises them; two days later, late in the
// morning, they're grown and go to a new farm, and their coins are yours. Each youngster is a young hen or rooster with a
// rating, 1 to 5 stars, from its parents' experience (stars) and a little luck, and a better one sells for more (Audrey,
// 24 Oct: "In the logic that the chickens from the coop gains experience and produce better and better babies"); a brood
// gives its parents experience.

export const SAVE_KEY = 'ff3d.farm';
const SAVE_V = 1;

// ---- the words
const TEXT = {
  en: {
    brand: 'Feather & Field', tagline: 'A flock to love for good',
    level: 'Level', coins: 'Coins', settings: 'Settings', close: 'Close',
    welcome_title: 'Welcome to your farm',
    welcome_body: 'Three Rhode Island Reds are waiting for you: a rooster and two hens. They’re yours for good, so get to know them!',
    lang: 'Language',
    your_farmer: 'Your farmer', him: 'Him', her: 'Her', name: 'Name', start: 'Start my farm',
    hint_start: 'Tap a bird to meet it. Drag to look around, pinch to zoom.',
    hint_move: 'Drag to look around, pinch to zoom, tap a bird.',
    hen: 'Hen', rooster: 'Rooster',
    forever_h: 'In your flock for good', forever_r: 'In your flock for good',
    personality: 'Personality', experience: 'Experience', trust: 'Trust',
    exp_none: 'Just arrived: experience grows with time on the farm and with the love you give.',
    trust_lv0: 'Shy', trust_lv1: 'Friendly', trust_lv2: 'Trusting', trust_lv3: 'Best friend',
    trust_body: 'Cuddles build trust.',
    lives_in: 'Lives in: {coop}', since: 'On your farm since {date}',
    coop_rustic: '{coop} (rustic)',
    level_title: 'Level {n}', level_xp: '{xp} of {need} XP to level {next}', level_top: 'Top level!',
    level_how: 'Look after your birds to earn XP.',
    level_up: 'Level {n}!', level_up_sub: 'Your farm is growing.', level_new: 'New at this level',
    land_new: 'A patch of land is for sale: {c} coins', land_show: 'See the land', level_next_land: 'At level {n}: a patch of land for sale',
    land_count: 'Your land: {n} patches', land_count1: 'Your land: 1 patch', land_all: 'All the land is yours!',
    land_title: 'A patch of land', land_body: 'Room for a coop and its pen, yours for good. Your farm grows one patch at a time.',
    land_buy: 'Buy for {c} coins', land_broke: 'Not enough coins yet ({c})', land_bought: 'The new patch of land is yours!',
    land_mine: 'Your land', land_mine_body: 'Bare earth, ready for a coop. New breeds come with the levels.',
    sale_sign: 'FOR SALE', bub_sale: 'For sale',
    coins_body: 'Coins come from your eggs and your grown chicks. You’ll spend them on feed, land, coops and more.',
    settings_lang: 'Language', settings_new: 'Start a new farm', settings_new_sure: 'Tap again to start again from nothing',
    settings_edited: 'This farm was changed outside the game: everything in it has been checked.',
    settings_version: 'Version {v}',
    saved_here: 'Your farm is saved on this phone.',
    loading: 'Loading your farm…',
    eggs: 'Eggs', lays: 'Lays about 2 eggs a day, {p} coins each.',
    eggs_sold1: '1 egg sold · +{c} coins', eggs_sold: '{n} eggs sold · +{c} coins',
    no_eggs: 'No eggs yet', laying: '{name} is laying…',
    first_egg: '{name} has laid your first egg! Tap the nest to collect it.',
    nest_full: 'The nest is full: collect the eggs so your hens can lay again.',
    feeder_title: 'Feeder · {coop}', feed_full: 'Full', feed_pct: '{p}% full', feed_empty: 'Empty',
    feed_hours: 'Enough for about {h} hours.', feed_hour: 'Enough for about an hour.', feed_days: 'Enough for about two days.',
    feed_empty_line: 'Your hens stop laying until it’s filled.',
    feed_how: 'Your hens lay while there’s food in it. Full, it feeds your trio for two days.',
    fill_btn: 'Fill it · {c} coins', fill_part: 'Fill what you can · {c} coins', fill_scraps: 'Kitchen scraps (free)', fill_full: 'It’s full', fill_broke: 'Sell some eggs first',
    filled: 'Feeder filled · −{c} coins', filled_scraps: 'Kitchen scraps in the feeder: enough for a few hours.',
    farmer_feed: '{farmer} is on the way with the feed · −{c} coins', farmer_scraps: '{farmer} is on the way with some kitchen scraps',
    bub_low: 'Feed low', bub_empty: 'Feeder empty',
    broody: '{name} has gone broody: she’s sitting on {n} eggs.',
    hatched: '{n} chicks have hatched! {name} is a mum.',
    sold: '{name}’s {n} chicks have grown up and gone to a new farm · +{c} coins', young_going: '{name}’s youngsters are off to a new farm!',
    sitting: 'Sitting on {n} eggs: they hatch in about {when}.', raising: 'Raising {n} chicks: young hens and roosters in about {when}.',
    raising_y: 'Raising {n} young hens and roosters: off to a new farm in about {when}.',
    hatch_soon: 'Sitting on {n} eggs: they hatch very soon.', grow_soon: 'Raising {n} youngsters: off to a new farm very soon.',
    no_lay_brood: 'She lays no eggs for sale while she’s busy with her chicks.',
    chick: 'Chick', chick_of: '{breed} · {name}’s chick', chick_grows: 'A young hen or rooster in about {when}.',
    chick_soon: 'Almost a young hen or rooster!',
    h: '{n} h', h1: 'an hour', hours: '{n} hours', days1: 'a day', days: '{n} days', min: '{n} min',
    young_h: 'Young hen', young_r: 'Young rooster', young_of: '{breed} · {name}’s {kid}', daughter: 'daughter', son: 'son',
    young_leaves: 'Off to a new farm in about {when}. Her rating comes when she leaves.', young_leaves_r: 'Off to a new farm in about {when}. His rating comes when he leaves.',
    young_soon: 'Off to a new farm very soon.',
    turned: '{name}’s chicks are turning into young hens and roosters!',
    congrats: 'Congratulations!', congrats_sub: '{name}’s babies have grown up', congrats_away: 'While you were away, {name}’s babies grew up',
    congrats_total: '+{c} coins · +{xp} XP', congrats_exp: '{mum} and {dad} gain experience: their next chicks will be even better.',
    congrats_exp1: '{mum} gains experience: her next chicks will be even better.', congrats_ok: 'Lovely!',
    farewell: 'Off you go, and good luck!',
  },
  fr: {
    brand: 'Feather & Field', tagline: 'Une basse-cour à aimer pour toujours',
    level: 'Niveau', coins: 'Pièces', settings: 'Réglages', close: 'Fermer',
    welcome_title: 'Bienvenue dans votre ferme',
    welcome_body: 'Trois Rhode Island Red vous attendent : un coq et deux poules. Ils sont à vous pour toujours, apprenez à les connaître !',
    lang: 'Langue',
    your_farmer: 'Votre fermier', him: 'Lui', her: 'Elle', name: 'Prénom', start: 'Commencer ma ferme',
    hint_start: 'Touchez une volaille pour faire connaissance. Glissez pour regarder, pincez pour zoomer.',
    hint_move: 'Glissez pour regarder, pincez pour zoomer, touchez une volaille.',
    hen: 'Poule', rooster: 'Coq',
    forever_h: 'Dans votre basse-cour pour toujours', forever_r: 'Dans votre basse-cour pour toujours',
    personality: 'Caractère', experience: 'Expérience', trust: 'Confiance',
    exp_none: 'Tout juste arrivé : l’expérience vient avec le temps passé à la ferme et l’affection que vous donnez.',
    trust_lv0: 'Farouche', trust_lv1: 'Sociable', trust_lv2: 'En confiance', trust_lv3: 'Inséparable',
    trust_body: 'Les câlins donnent confiance.',
    lives_in: 'Habite : {coop}', since: 'À la ferme depuis le {date}',
    coop_rustic: '{coop} (rustique)',
    level_title: 'Niveau {n}', level_xp: '{xp} sur {need} XP pour le niveau {next}', level_top: 'Niveau maximum !',
    level_how: 'Prenez soin de vos volailles pour gagner de l’XP.',
    level_up: 'Niveau {n} !', level_up_sub: 'Votre ferme s’agrandit.', level_new: 'Nouveau à ce niveau',
    land_new: 'Un terrain est à vendre : {c} pièces', land_show: 'Voir le terrain', level_next_land: 'Au niveau {n} : un terrain à vendre',
    land_count: 'Vos terrains : {n}', land_count1: 'Votre terrain : 1', land_all: 'Tous les terrains sont à vous !',
    land_title: 'Un terrain', land_body: 'De la place pour un poulailler et son enclos, à vous pour toujours. Votre ferme s’agrandit un terrain à la fois.',
    land_buy: 'Acheter pour {c} pièces', land_broke: 'Pas encore assez de pièces ({c})', land_bought: 'Le nouveau terrain est à vous !',
    land_mine: 'Votre terrain', land_mine_body: 'De la terre nue, prête pour un poulailler. Les nouvelles races viennent avec les niveaux.',
    sale_sign: 'À VENDRE', bub_sale: 'À vendre',
    coins_body: 'Les pièces viennent de vos œufs et de vos poussins devenus grands. Elles servent à acheter du grain, des terrains, des poulaillers et plus encore.',
    settings_lang: 'Langue', settings_new: 'Commencer une nouvelle ferme', settings_new_sure: 'Touchez encore pour tout recommencer',
    settings_edited: 'Cette ferme a été modifiée hors du jeu : tout son contenu a été vérifié.',
    settings_version: 'Version {v}',
    saved_here: 'Votre ferme est enregistrée sur ce téléphone.',
    loading: 'Chargement de votre ferme…',
    eggs: 'Œufs', lays: 'Pond environ 2 œufs par jour, à {p} pièces l’œuf.',
    eggs_sold1: '1 œuf vendu · +{c} pièces', eggs_sold: '{n} œufs vendus · +{c} pièces',
    no_eggs: 'Pas encore d’œufs', laying: '{name} est en train de pondre…',
    first_egg: '{name} a pondu votre premier œuf ! Touchez le nid pour le ramasser.',
    nest_full: 'Le nid est plein : ramassez les œufs pour que vos poules pondent à nouveau.',
    feeder_title: 'Mangeoire · {coop}', feed_full: 'Pleine', feed_pct: 'Pleine à {p} %', feed_empty: 'Vide',
    feed_hours: 'De quoi tenir environ {h} heures.', feed_hour: 'De quoi tenir environ une heure.', feed_days: 'De quoi tenir environ deux jours.',
    feed_empty_line: 'Vos poules ne pondent plus jusqu’à ce qu’elle soit remplie.',
    feed_how: 'Vos poules pondent tant qu’elle contient du grain. Pleine, elle nourrit votre trio pendant deux jours.',
    fill_btn: 'La remplir · {c} pièces', fill_part: 'Remplir ce que vous pouvez · {c} pièces', fill_scraps: 'Des restes de cuisine (gratuit)', fill_full: 'Elle est pleine', fill_broke: 'Vendez d’abord quelques œufs',
    filled: 'Mangeoire remplie · −{c} pièces', filled_scraps: 'Des restes de cuisine dans la mangeoire : de quoi tenir quelques heures.',
    farmer_feed: '{farmer} arrive avec le grain · −{c} pièces', farmer_scraps: '{farmer} arrive avec des restes de cuisine',
    bub_low: 'Presque vide', bub_empty: 'Mangeoire vide',
    broody: '{name} est devenue couveuse : elle couve {n} œufs.',
    hatched: '{n} poussins sont nés ! {name} est maman.',
    sold: 'Les {n} poussins de {name} ont grandi et partent pour une nouvelle ferme · +{c} pièces', young_going: 'Les jeunes de {name} partent pour une nouvelle ferme !',
    sitting: 'Couve {n} œufs : ils éclosent dans environ {when}.', raising: 'Élève {n} poussins : jeunes poules et coqs dans environ {when}.',
    raising_y: 'Élève {n} jeunes poules et coqs : ils partent pour une nouvelle ferme dans environ {when}.',
    hatch_soon: 'Couve {n} œufs : ils vont éclore très bientôt.', grow_soon: 'Élève {n} jeunes : ils partent très bientôt pour une nouvelle ferme.',
    no_lay_brood: 'Elle ne pond pas d’œufs à vendre tant qu’elle s’occupe de ses petits.',
    chick: 'Poussin', chick_of: '{breed} · poussin de {name}', chick_grows: 'Jeune poule ou jeune coq dans environ {when}.',
    chick_soon: 'Bientôt une jeune poule ou un jeune coq !',
    h: '{n} h', h1: 'une heure', hours: '{n} heures', days1: 'un jour', days: '{n} jours', min: '{n} min',
    young_h: 'Jeune poule', young_r: 'Jeune coq', young_of: '{breed} · {kid} de {name}', daughter: 'fille', son: 'fils',
    young_leaves: 'Part pour une nouvelle ferme dans environ {when}. Sa note viendra à son départ.', young_leaves_r: 'Part pour une nouvelle ferme dans environ {when}. Sa note viendra à son départ.',
    young_soon: 'Part très bientôt pour une nouvelle ferme.',
    turned: 'Les poussins de {name} deviennent de jeunes poules et coqs !',
    congrats: 'Félicitations !', congrats_sub: 'Les petits de {name} ont grandi', congrats_away: 'Pendant votre absence, les petits de {name} ont grandi',
    congrats_total: '+{c} pièces · +{xp} XP', congrats_exp: '{mum} et {dad} gagnent de l’expérience : leurs prochains poussins seront encore meilleurs.',
    congrats_exp1: '{mum} gagne de l’expérience : ses prochains poussins seront encore meilleurs.', congrats_ok: 'Super !',
    farewell: 'Allez, bonne route !',
  },
};
// in French "Just arrived" agrees with the bird
const TEXT_F = { fr: { exp_none: 'Tout juste arrivée : l’expérience vient avec le temps passé à la ferme et l’affection que vous donnez.' } };

export const BREED_INFO = {
  rir: { name: ['Rhode Island Red', 'Rhode Island Red'], coop: ['Red Barn', 'Grange rouge'] },
  orp: { name: ['Buff Orpington', 'Orpington fauve'], coop: ['Thatched Cottage', 'Chaumière'] },
  sil: { name: ['Silkie', 'Poule soie'], coop: ['Pagoda Coop', 'Poulailler pagode'] },
  leg: { name: ['Cream Legbar', 'Legbar crème'], coop: ['Stone Cottage', 'Maison de pierre'] },
  bra: { name: ['Light Brahma', 'Brahma herminé'], coop: ['Timber Lodge', 'Chalet en rondins'] },
};

// the five personalities (the 2D game's), with what each is like in a line, for a hen (h) and a rooster (r)
export const PERS = ['mum', 'rebel', 'diva', 'glutton', 'brave'];
export const PERS_INFO = {
  mum: { icon: '🐣', name: { en: ['Good mum'], fr: ['Mère poule'] },
    line: { en: ['A born mother: her chicks are the best looked after.'], fr: ['Une vraie mère : ses poussins sont les mieux soignés.'] } },
  rebel: { icon: '🏃', name: { en: ['Rebel', 'Rebel'], fr: ['Rebelle', 'Rebelle'] },
    line: { en: ['Adventurous: she’ll slip out now and then, and may bring something back.', 'Adventurous: he’ll slip out now and then, and may bring something back.'],
            fr: ['Aventurière : elle fera parfois le mur, et rapportera peut-être une trouvaille.', 'Aventurier : il fera parfois le mur, et rapportera peut-être une trouvaille.'] } },
  diva: { icon: '👑', name: { en: ['Diva', 'Diva'], fr: ['Diva', 'Diva'] },
    line: { en: ['Loves the limelight, and the best feed.', 'Loves the limelight, and the best feed.'], fr: ['Adore les projecteurs, et la meilleure nourriture.', 'Adore les projecteurs, et la meilleure nourriture.'] } },
  glutton: { icon: '🌽', name: { en: ['Glutton', 'Glutton'], fr: ['Gourmande', 'Gourmand'] },
    line: { en: ['Always first at the feeder.', 'Always first at the feeder.'], fr: ['Toujours la première à la mangeoire.', 'Toujours le premier à la mangeoire.'] } },
  brave: { icon: '🛡️', name: { en: ['Brave', 'Brave'], fr: ['Courageuse', 'Courageux'] },
    line: { en: ['Afraid of nothing: keeps watch over the coop at night.', 'Afraid of nothing: keeps watch over the coop at night.'],
            fr: ['N’a peur de rien : veille sur le poulailler la nuit.', 'N’a peur de rien : veille sur le poulailler la nuit.'] } },
};
const HEN_NAMES = ['Henrietta', 'Clover', 'Mabel', 'Peggy', 'Dotty', 'Hazel', 'Maple', 'Willow', 'Nutmeg', 'Poppy', 'Pearl', 'Ginger',
  'Olive', 'Marigold', 'Bramble', 'Truffle', 'Pippa', 'Dumpling', 'Ivy', 'Cosette', 'Margot', 'Brioche', 'Lulu', 'Fern', 'Juniper'];
const ROO_NAMES = ['Rupert', 'Albert', 'Barnaby', 'Chester', 'Percy', 'Reginald', 'Gus', 'Hamish', 'Basil', 'Monty', 'Fergus'];
const FARMER_DEFAULT = { m: ['Arthur', 'Arthur'], f: ['Rosie', 'Rose'] };
export const TRUST_AT = [0, 3, 8, 15];                 // cuddles for Shy, Friendly, Trusting, Best friend
export const MAX_STARS = 5;

// ---- levels: the XP to reach each level (a first curve; the year-long balance comes with step 9)
export const TOP_LEVEL = 30;
export function xpFor(level) { return level <= 1 ? 0 : Math.round(60 * Math.pow(level - 1, 2.1)); }
export function levelOf(xp) { let L = 1; while (L < TOP_LEVEL && xp >= xpFor(L + 1)) L++; return L; }

// ---- land (release 1 step 5): the village's plots are the patches. One more patch can be bought at each level, offered
// one at a time in order, the nearest to the first coop first (Audrey, 25 Oct: "One at a time, in order"), from 100 coins
// at level 2 to 10,000 at level 30. (The plots by distance from plot 0, the farm's first patch: village.json)
export const LAND_ORDER = [0, 2, 1, 3, 9, 8, 4, 6, 11, 10, 5, 7, 12, 17, 16, 14, 13, 19, 15, 18, 20, 24, 25, 21, 22, 28, 26, 27, 23, 29];
export function landPrice(k) { const p = 100 * Math.pow(100, (k - 1) / 28); return p < 1000 ? Math.round(p / 10) * 10 : Math.round(p / 50) * 50; }      // the k-th patch after the first

// ---- names typed by the player: letters, numbers, spaces and a little punctuation, never code
export function cleanName(s, max = 20) {
  if (typeof s !== 'string') return '';
  return s.normalize('NFC').replace(/[\u0000-\u001f\u007f<>&"`\\{}[\]=]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
// every field the save has came through the checks unchanged (fields it didn't have yet, from before a step added them,
// are filled in and don't count as an edit)
function fits(c, r) {
  if (c === r) return true;
  if (c === null || r === null || typeof c !== 'object' || typeof r !== 'object') return c === r;
  if (Array.isArray(c) !== Array.isArray(r)) return false;
  if (Array.isArray(c)) return c.length === r.length && c.every((x, i) => fits(x, r[i]));
  for (const k of Object.keys(r)) if (!(k in c) || !fits(c[k], r[k])) return false;
  return true;
}
// a seal over the saved farm: an edit made outside the game shows (it is then loaded checked, and flagged)
function seal(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }

const int = (v, lo, hi, d = lo) => Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d;
const num = (v, lo, hi, d = lo) => Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d;

// ---- eggs and feed (starting values; the year-long balance comes with step 11)
export const NEST_MAX = 12;                           // eggs a nest holds: full, the hens wait for you to collect
export const EGG_PRICE = { rir: 6, orp: 7, sil: 8, leg: 9, bra: 7 };        // coins an egg sells for (the Legbar's blue eggs the dearest)
export const XP_EGG = 2, XP_FILL = 4;                 // XP for each egg collected, and for a feeder filled from empty
export const FEED_DAYS = 2;                           // a full feeder keeps its birds for two days (a unit a bird a day)
export const FEED_PRICE = 2;                          // coins a unit of feed
export const CATCH_UP = 2 * 86400e3;                  // away longer than two days: only the last two count
const DAY_MS = 86400e3;
// ---- chicks (starting values)
export const SIT_MS = 24 * 3600e3, GROW_MS = 52 * 3600e3;          // sitting on her eggs (they hatch the next morning); the chicks growing up (grown at 11 two days on)
export const CHICK_PRICE = { rir: 22, orp: 26, sil: 30, leg: 28, bra: 26 };   // coins for each grown chick
export const XP_HATCH = 4, XP_CHICK = 6;
export const YOUNG_MS = 24 * 3600e3;                                 // a day after hatching, the chicks are young hens and roosters
export const EXP_MUM = 60, EXP_DAD = 30;                             // experience for raising a brood (100 a star)
export const kidPrice = (base, stars) => Math.round(base * (0.6 + 0.2 * stars));        // 1 star: 0.8 of the price; 5 stars: 1.6
const BROODY_AT = 7, BROODY_P = { mum: 0.35, other: 0.12 };          // the morning check (hour), each hen's chance that day
const nextCheck = t => { const d = new Date(t), c = new Date(d.getFullYear(), d.getMonth(), d.getDate(), BROODY_AT).getTime(); return c > t ? c : new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, BROODY_AT).getTime(); };
// when a hen lays: a morning window (7:30 to 11:30) and an afternoon one (13:00 to 19:00), each day at a time of her own
const LAY_WINDOWS = [[7.5, 4], [13, 6]];
function hash01(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296; }
const dayStart = t => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const nextDay = t => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(); };
export function layTimes(henId, day) {               // day: a local midnight (ms); the times she lays that day
  const d = new Date(day), key = henId + '|' + d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
  return LAY_WINDOWS.map(([at, len], i) => { const h = at + len * hash01(key + '|' + i); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(h), Math.round((h % 1) * 60)).getTime(); });
}
// a first egg soon after a new farm starts (by day; at night, the next morning)
function firstEggAt(now) {
  const d = new Date(now), h = d.getHours() + d.getMinutes() / 60;
  if (h >= 7 && h < 21.5) return now + 75e3;
  const morning = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (h >= 21.5 ? 1 : 0), 7, 20).getTime();
  return morning;
}

// every field checked: wrong types dropped, numbers clamped, names cleaned, links between coops and birds kept only when
// they make sense (a trio at most: one rooster and two hens of the coop's breed)
export function checkFarm(d, now = Date.now()) {
  if (!d || typeof d !== 'object' || d.v !== SAVE_V) return null;
  const out = { v: SAVE_V };
  out.made = int(d.made, 0, now, now);
  out.lang = d.lang === 'fr' ? 'fr' : 'en';
  out.coins = int(d.coins, 0, 1e9, 0);
  out.xp = int(d.xp, 0, 1e9, 0);
  const look = d.farmer && d.farmer.look === 'f' ? 'f' : 'm';
  out.farmer = { look, name: cleanName(d.farmer && d.farmer.name) };
  // the land: the first patches in order, at most one a level (a farm's own purchases never go further)
  const land = Array.isArray(d.land) ? d.land : [];
  out.land = LAND_ORDER.slice(0, Math.max(1, Math.min(land.length, levelOf(out.xp), LAND_ORDER.length)));
  out.lvSeen = int(d.lvSeen, 1, levelOf(out.xp), levelOf(out.xp));            // (the last level-up card shown; before step 5: none owed)
  out.coops = [];
  const seen = new Set();
  for (const c of Array.isArray(d.coops) ? d.coops.slice(0, 40) : []) {
    if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !/^c\d{1,4}$/.test(c.id) || seen.has(c.id)) continue;
    if (!BREED_INFO[c.breed] || !out.land.includes(c.plot) || out.coops.some(o => o.plot === c.plot)) continue;
    seen.add(c.id);
    out.coops.push({ id: c.id, breed: c.breed, tier: int(c.tier, 0, 4, 0), plot: c.plot, name: cleanName(c.name, 24),
      eggs: int(c.eggs, 0, NEST_MAX, 0), feed: Number.isFinite(c.feed) ? c.feed : null, fedAt: int(c.fedAt, 0, now, now),
      brood: c.brood && typeof c.brood === 'object' ? { hen: String(c.brood.hen), start: int(c.brood.start, 0, now, now), n: int(c.brood.n, 1, 4, 2), hatched: c.brood.hatched === true,
        kids: Array.isArray(c.brood.kids) ? c.brood.kids.slice(0, 4).map(k => ({ sex: k && k.sex === 'r' ? 'r' : 'h', stars: int(k && k.stars, 1, 5, 1) })) : null } : null,
      lastBrood: int(c.lastBrood, 0, now, 0), checked: int(c.checked, 0, now, now) });
  }
  out.birds = [];
  const ids = new Set();
  for (const b of Array.isArray(d.birds) ? d.birds.slice(0, 200) : []) {
    if (!b || typeof b !== 'object' || typeof b.id !== 'string' || !/^b\d{1,5}$/.test(b.id) || ids.has(b.id)) continue;
    const coop = out.coops.find(c => c.id === b.coop), sex = b.sex === 'r' ? 'r' : b.sex === 'h' ? 'h' : null;
    if (!coop || !sex || b.breed !== coop.breed) continue;
    const mates = out.birds.filter(o => o.coop === coop.id);
    if (sex === 'r' ? mates.some(o => o.sex === 'r') : mates.filter(o => o.sex === 'h').length >= 2) continue;
    const pers = PERS.includes(b.pers) && !(b.pers === 'mum' && sex === 'r') ? b.pers : (sex === 'r' ? 'brave' : 'diva');
    const name = cleanName(b.name) || (sex === 'r' ? ROO_NAMES[0] : HEN_NAMES[0]);
    ids.add(b.id);
    const nb = { id: b.id, name, sex, breed: coop.breed, pers, coop: coop.id, since: int(b.since, 0, now, now), exp: int(b.exp, 0, 1e7, 0), trust: int(b.trust, 0, 15, 0) };
    if (sex === 'h') nb.laid = int(b.laid, 0, now, now);          // (when she last laid, or was due to: never ahead of now)
    out.birds.push(nb);
  }
  // each feeder holds at most two days for the birds it feeds (missing: full, as for a farm from before feeders)
  for (const c of out.coops) { const cap = Math.max(1, out.birds.filter(b => b.coop === c.id).length) * FEED_DAYS; c.feed = c.feed === null ? cap : num(c.feed, 0, cap, cap); }
  // a brood: one of the coop's own hens, hatched only once its time has come
  for (const c of out.coops) if (c.brood && (!out.birds.some(b => b.id === c.brood.hen && b.sex === 'h' && b.coop === c.id) || (c.brood.hatched && c.brood.start + SIT_MS > now))) c.brood = null;
  out.next = int(d.next, 1, 99999, 1);
  for (const x of [...out.coops, ...out.birds]) out.next = Math.max(out.next, parseInt(x.id.slice(1), 10) + 1);
  const f = d.first, fh = f && typeof f === 'object' ? out.birds.find(b => b.id === f.hen && b.sex === 'h') : null;
  out.first = fh ? { hen: fh.id, t: int(f.t, 0, now + DAY_MS, now) } : null;
  // the news waiting to be shown: grown youngsters gone to a new farm (the congratulations card)
  out.news = (Array.isArray(d.news) ? d.news : []).slice(-6).filter(n => n && typeof n === 'object' && n.type === 'grown' && out.birds.some(b => b.id === n.hen)).map(n => ({
    type: 'grown', coop: String(n.coop).slice(0, 8), hen: String(n.hen).slice(0, 8), dad: String(n.dad || '').slice(0, 8),
    kids: (Array.isArray(n.kids) ? n.kids : []).slice(0, 4).map(k => ({ sex: k && k.sex === 'r' ? 'r' : 'h', stars: int(k && k.stars, 1, 5, 1), coins: int(k && k.coins, 0, 1000, 0) })),
    coins: int(n.coins, 0, 4000, 0), xp: int(n.xp, 0, 4000, 0), t: int(n.t, 0, now, now), seen: n.seen === true }));
  if (!('first' in d)) {                             // a farm from before eggs: its good mum's first egg too
    const mum = out.birds.find(b => b.pers === 'mum') || out.birds.find(b => b.sex === 'h');
    if (mum) out.first = { hen: mum.id, t: firstEggAt(now) };
  }
  return out;
}

export class Game {
  constructor(store = (() => { try { return window.localStorage; } catch (e) { return null; } })()) {
    this.store = store; this.edited = false; this.listeners = [];
    this.data = this.load();
    this.lang = this.data ? this.data.lang : ((navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en');
  }
  // ---- words
  t(key, vars = {}, sexF = false) {
    const L = this.lang, s = (sexF && TEXT_F[L] && TEXT_F[L][key]) || TEXT[L][key] || TEXT.en[key] || key;
    return s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  }
  li() { return this.lang === 'fr' ? 1 : 0; }
  // how long, in words: "about 6 hours", "a day", "2 days"
  howLong(ms) {
    const h = ms / 3600e3;
    if (h < 1.5) return this.t('h1');
    if (h < 30) return this.t('hours', { n: Math.round(h) });
    const d = Math.round(h / 24);
    return d <= 1 ? this.t('days1') : this.t('days', { n: d });
  }
  breedName(b) { return BREED_INFO[b].name[this.li()]; }
  coopName(c) { return c.name || BREED_INFO[c.breed].coop[this.li()]; }
  persName(p, sex) { const n = PERS_INFO[p].name[this.lang]; return n[sex === 'r' && n[1] ? 1 : 0]; }
  persLine(p, sex) { const n = PERS_INFO[p].line[this.lang]; return n[sex === 'r' && n[1] ? 1 : 0]; }
  farmerName() { const f = this.data ? this.data.farmer : { look: 'm', name: '' }; return f.name || FARMER_DEFAULT[f.look][this.li()]; }
  defaultFarmer(look) { return FARMER_DEFAULT[look][this.li()]; }
  // ---- the farm
  get level() { return levelOf(this.data.xp); }
  trustLevel(b) { return TRUST_AT.filter(n => b.trust >= n).length - 1; }
  // ---- levels and land: a new level's card once (lvSeen); the next patch of land (at the level it comes with), for sale
  // once the level allows; bought with coins
  levelNews() { return this.level > (this.data.lvSeen || 1) ? this.level : 0; }
  seenLevel() { this.data.lvSeen = this.level; this.save(); }
  landNext() { const k = this.data.land.length; return k < LAND_ORDER.length ? { plot: LAND_ORDER[k], price: landPrice(k), level: k + 1 } : null; }
  landForSale() { const n = this.landNext(); return n && this.level >= n.level ? n : null; }
  buyLand() {
    const n = this.landForSale(); if (!n) return null;
    if (this.data.coins < n.price) return { ...n, broke: true };
    this.data.coins -= n.price; this.data.land.push(n.plot); this.save();
    return n;
  }
  stars(b) { return Math.min(MAX_STARS, Math.floor(b.exp / 100)); }          // (how experience is earned: step 6)
  coop(id) { return this.data.coops.find(c => c.id === id); }
  birdsIn(coopId) { return this.data.birds.filter(b => b.coop === coopId); }
  id(k) { return k + (this.data.next++); }
  // a breed's forever trio: one rooster and two hens, three different personalities (only a hen can be a good mum); the very
  // first trio meets the game's characters at once: a brave rooster, a good mum and a rebel
  trio(breed, coopId, first, r = Math.random) {
    const used = new Set(this.data.birds.map(b => b.name));
    const pick = (list) => { const free = list.filter(n => !used.has(n)); const n = (free.length ? free : list)[Math.floor(r() * (free.length ? free : list).length)]; used.add(n); return n; };
    let pers;
    if (first) pers = ['brave', 'mum', 'rebel'];
    else {
      const roo = ['brave', 'rebel', 'diva', 'glutton'][Math.floor(r() * 4)];
      const rest = PERS.filter(p => p !== roo).sort(() => r() - 0.5);
      pers = [roo, rest[0], rest[1]];
    }
    const now = Date.now();
    return [['r', pers[0]], ['h', pers[1]], ['h', pers[2]]].map(([sex, p]) => {
      const b = { id: this.id('b'), name: pick(sex === 'r' ? ROO_NAMES : HEN_NAMES), sex, breed, pers: p, coop: coopId, since: now, exp: 0, trust: 0 };
      if (sex === 'h') b.laid = now;
      return b;
    });
  }
  newFarm({ lang, look, name }) {
    const now = Date.now();
    this.lang = lang === 'fr' ? 'fr' : 'en';
    this.data = { v: SAVE_V, made: now, lang: this.lang, coins: 100, xp: 0, farmer: { look: look === 'f' ? 'f' : 'm', name: cleanName(name) }, land: [0], lvSeen: 1, coops: [], birds: [], next: 1 };
    const coop = { id: this.id('c'), breed: 'rir', tier: 0, plot: 0, name: '', eggs: 0, feed: 3 * FEED_DAYS, fedAt: now, brood: null, lastBrood: 0, checked: now };
    this.data.coops.push(coop);
    this.data.birds.push(...this.trio('rir', coop.id, true));
    const mum = this.data.birds.find(b => b.pers === 'mum') || this.data.birds.find(b => b.sex === 'h');
    this.data.first = { hen: mum.id, t: firstEggAt(now) };
    this.data.news = [];
    this.edited = false;
    this.save();
    return this.data;
  }
  // ---- eggs and feed
  bird(id) { return this.data.birds.find(b => b.id === id); }
  feedCap(c) { return Math.max(1, this.birdsIn(c.id).length) * FEED_DAYS; }
  feedRate(c) { return this.birdsIn(c.id).length / DAY_MS; }              // units eaten a millisecond
  feedAt(c, t = Date.now()) { return t <= c.fedAt ? c.feed : Math.max(0, c.feed - this.feedRate(c) * (t - c.fedAt)); }
  feedLeft(c, t = Date.now()) { return this.feedAt(c, t) / this.feedCap(c); }            // 0 empty .. 1 full
  feedHours(c, t = Date.now()) { const r = this.feedRate(c); return r > 0 ? this.feedAt(c, t) / r / 3600e3 : Infinity; }
  eggPrice(c) { return EGG_PRICE[c.breed] || 6; }
  // the lays due since each hen last laid (her own times, and a new farm's first egg), oldest first; not yet laid: the
  // farm (main.js) has each hen walk in and lay while it's open, or lays them straight away (layEgg)
  dueLays(now = Date.now()) {
    const out = [];
    for (const b of this.data.birds) {
      if (b.sex !== 'h') continue;
      const from = Math.max(b.laid, b.since, now - CATCH_UP);
      if (from >= now || this.brooding(b.id)) continue;                 // (sitting or raising chicks: no eggs for sale)
      for (let day = dayStart(from); day <= now; day = nextDay(day)) for (const t of layTimes(b.id, day)) if (t > from && t <= now) out.push({ hen: b.id, coop: b.coop, t });
      const f = this.data.first;
      if (f && f.hen === b.id && f.t > b.laid && f.t <= now) out.push({ hen: b.id, coop: b.coop, t: f.t, first: true });
    }
    return out.sort((a, b) => a.t - b.t);
  }
  // a lay: the egg goes into her coop's nest if its feeder had food then and the nest has room ('laid'), else not
  // ('hungry', 'full'); either way it's done (null: not a lay that's due)
  layEgg(henId, t, now = Date.now()) {
    const b = this.bird(henId);
    if (!b || b.sex !== 'h' || !(t > b.laid) || t > now) return null;
    const c = this.coop(b.coop); if (!c) return null;
    b.laid = t;
    if (this.data.first && this.data.first.hen === henId && t >= this.data.first.t) this.data.first = null;
    let res = 'laid';
    if (this.brooding(henId)) res = 'brooding';
    else if (this.feedAt(c, t) <= 0) res = 'hungry';
    else if (c.eggs >= NEST_MAX) res = 'full';
    else c.eggs++;
    this.save();
    return res;
  }
  // ---- broody hens and their chicks
  chickPrice(c) { return CHICK_PRICE[c.breed] || 20; }
  hatchAt(c) { return c.brood ? c.brood.start + SIT_MS : 0; }
  grownAt(c) { return c.brood ? c.brood.start + SIT_MS + GROW_MS : 0; }
  youngAt(c) { return c.brood ? c.brood.start + SIT_MS + YOUNG_MS : 0; }
  // a brood's youngsters, when they hatch: hen or rooster, and a rating from the parents' experience (a good mum's a little
  // better), with a little luck either way
  kidsOf(c, br) {
    const mum = this.bird(br.hen), dad = this.birdsIn(c.id).find(x => x.sex === 'r');
    const base = 1 + ((mum ? this.stars(mum) : 0) + (dad ? this.stars(dad) : 0)) / 2 + (mum && mum.pers === 'mum' ? 0.4 : 0);
    return Array.from({ length: br.n }, (_, i) => {
      const key = br.hen + '|' + br.start + '|' + i;
      return { sex: hash01(key + '|sex') < 0.5 ? 'h' : 'r', stars: Math.max(1, Math.min(5, Math.round(base + hash01(key + '|q') * 1.5 - 0.5))) };
    });
  }
  unseenNews() { return (this.data.news || []).filter(n => !n.seen); }
  seenNews(n) { n.seen = true; this.save(); }
  brooding(henId) { const b = this.bird(henId), c = b && this.coop(b.coop); return !!(c && c.brood && c.brood.hen === henId); }
  // what's happened since: a hen gone broody, chicks hatched, grown chicks gone to a new farm (their coins in), in order
  broodTick(now = Date.now()) {
    const out = []; let dirty = false;
    for (const c of this.data.coops) {
      if (c.checked < now - CATCH_UP - DAY_MS) { c.checked = now - CATCH_UP - DAY_MS; dirty = true; }        // (away long: from two days back)
      for (let guard = 0; guard < 12; guard++) {
        const br = c.brood;
        if (br) {
          const hatch = br.start + SIT_MS, grown = hatch + GROW_MS, hen = this.bird(br.hen);
          if (!br.hatched && hatch <= now) { br.hatched = true; br.kids = this.kidsOf(c, br); this.data.xp += XP_HATCH; out.push({ type: 'hatch', coop: c.id, hen: br.hen, n: br.n, t: hatch }); dirty = true; continue; }
          if (grown <= now) {
            const kids = (br.kids && br.kids.length === br.n ? br.kids : this.kidsOf(c, br)).map(k => ({ ...k, coins: kidPrice(this.chickPrice(c), k.stars) }));
            const coins = kids.reduce((a, k) => a + k.coins, 0), xp = kids.reduce((a, k) => a + XP_CHICK + 2 * k.stars, 0), dad = this.birdsIn(c.id).find(x => x.sex === 'r');
            this.data.coins += coins; this.data.xp += xp; c.lastBrood = grown; c.brood = null;
            if (hen) { hen.laid = Math.max(hen.laid, grown); hen.exp = Math.min(1e7, hen.exp + EXP_MUM); }       // (her lays while she was busy don't come back)
            if (dad) dad.exp = Math.min(1e7, dad.exp + EXP_DAD);
            const news = { type: 'grown', coop: c.id, hen: br.hen, dad: dad ? dad.id : '', kids, coins, xp, t: grown, seen: false };
            this.data.news = [...(this.data.news || []), news].slice(-6);
            out.push({ type: 'sold', coop: c.id, hen: br.hen, n: br.n, coins, t: grown, news }); dirty = true; continue;
          }
          break;
        }
        const t = nextCheck(c.checked);                                   // the next morning's check
        if (t > now) break;
        c.checked = t; dirty = true;
        if (t < now - CATCH_UP || t < c.lastBrood + DAY_MS || t < this.data.made + DAY_MS || this.feedAt(c, t) <= 0) continue;
        const day = dayStart(t);
        for (const h of this.birdsIn(c.id).filter(x => x.sex === 'h')) {
          if (hash01(h.id + '|brood|' + day) >= (h.pers === 'mum' ? BROODY_P.mum : BROODY_P.other)) continue;
          const n = (h.pers === 'mum' ? 3 : 2) + (hash01(h.id + '|n|' + day) < 0.5 ? 1 : 0);
          c.brood = { hen: h.id, start: t, n, hatched: false }; h.laid = Math.max(h.laid, t);
          out.push({ type: 'broody', coop: c.id, hen: h.id, n, t });
          break;
        }
      }
    }
    if (dirty) this.save();
    return out;
  }
  // tap the nest: its eggs sold, coins and XP
  collect(coopId) {
    const c = this.coop(coopId); if (!c || !c.eggs) return null;
    const n = c.eggs, coins = n * this.eggPrice(c), xp = n * XP_EGG;
    c.eggs = 0; this.data.coins += coins; this.data.xp += xp;
    this.save();
    return { n, coins, xp };
  }
  // what filling the feeder now would cost, and how much it would get: all of it, what the coins can buy, or (no coins and
  // nothing left in it) a free handful of kitchen scraps, a unit, so the hens can always go on laying
  fillQuote(c, now = Date.now()) {
    const cap = this.feedCap(c), left = this.feedAt(c, now), need = cap - left;
    if (need < cap * 0.05) return { full: true, cost: 0, buy: 0, left: left / cap };
    const cost = Math.ceil(need * FEED_PRICE - 1e-9);
    if (this.data.coins >= cost) return { cost, buy: need, left: left / cap };
    const units = Math.floor(this.data.coins / FEED_PRICE);
    if (units >= 1) return { cost: units * FEED_PRICE, buy: units, partial: true, left: left / cap };
    if (left < 1) return { cost: 0, buy: Math.min(need, 1), scraps: true, left: left / cap };
    return { cost: 0, buy: 0, broke: true, left: left / cap };
  }
  fillFeeder(coopId, now = Date.now()) {
    const c = this.coop(coopId); if (!c) return null;
    const q = this.fillQuote(c, now);
    if (q.full || q.broke) return q;
    const cap = this.feedCap(c);
    c.feed = Math.min(cap, this.feedAt(c, now) + q.buy); c.fedAt = now;
    this.data.coins -= q.cost;
    q.xp = q.scraps ? 0 : Math.round(XP_FILL * q.buy / cap); this.data.xp += q.xp;
    q.level = c.feed / cap;
    this.save();
    return q;
  }
  setLang(l) { this.lang = l === 'fr' ? 'fr' : 'en'; if (this.data) { this.data.lang = this.lang; this.save(); } }
  // ---- saving: on the phone, sealed; every load checked
  save() {
    if (!this.data || !this.store) return;
    const body = JSON.stringify(this.data);
    try { this.store.setItem(SAVE_KEY, JSON.stringify({ d: this.data, s: seal(body) })); } catch (e) { /* storage full or blocked: the farm goes on */ }
    for (const f of this.listeners) f();
  }
  load() {
    if (!this.store) return null;
    let raw = null;
    try { raw = JSON.parse(this.store.getItem(SAVE_KEY) || 'null'); } catch (e) { raw = null; }
    if (!raw || typeof raw !== 'object') return null;
    const d = checkFarm(raw.d);
    if (!d) return null;
    this.edited = raw.s !== seal(JSON.stringify(raw.d)) || !fits(d, raw.d);
    return d;
  }
  wipe() { try { this.store && this.store.removeItem(SAVE_KEY); } catch (e) { /* */ } this.data = null; }
  onChange(f) { this.listeners.push(f); }
}
