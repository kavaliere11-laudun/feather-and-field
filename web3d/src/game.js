// The game itself (the new game play, Audrey's brief of 24 Oct 2026: claude/game-plan-v2.md), release 1 step 1: a new
// farm. The farm's state and its rules so far, saved on the phone with checks on every load (Audrey: "Take security of the
// game into account please"), and the game's words in English and French. The 3D village (main.js) draws it.
//
// The farm: coins, XP (the level always comes from the XP, never from the save), the farmer (him or her, and a name),
// the patches of land owned (the village's plots), the coops (a breed, how far it's been done up: 0 rustic .. 4 Deluxe,
// the patch it stands on) and the birds: each breed's forever trio, a rooster and two hens with three different
// personalities, who stay for good and earn experience and trust.

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
    coins_body: 'Coins come from your eggs and your grown chicks. You’ll spend them on land, coops and more.',
    settings_lang: 'Language', settings_new: 'Start a new farm', settings_new_sure: 'Tap again to start again from nothing',
    settings_edited: 'This farm was changed outside the game: everything in it has been checked.',
    settings_version: 'Version {v}',
    saved_here: 'Your farm is saved on this phone.',
    loading: 'Loading your farm…',
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
    coins_body: 'Les pièces viennent de vos œufs et de vos poussins devenus grands. Elles servent à acheter des terrains, des poulaillers et plus encore.',
    settings_lang: 'Langue', settings_new: 'Commencer une nouvelle ferme', settings_new_sure: 'Touchez encore pour tout recommencer',
    settings_edited: 'Cette ferme a été modifiée hors du jeu : tout son contenu a été vérifié.',
    settings_version: 'Version {v}',
    saved_here: 'Votre ferme est enregistrée sur ce téléphone.',
    loading: 'Chargement de votre ferme…',
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

// ---- names typed by the player: letters, numbers, spaces and a little punctuation, never code
export function cleanName(s, max = 20) {
  if (typeof s !== 'string') return '';
  return s.normalize('NFC').replace(/[\u0000-\u001f\u007f<>&"`\\{}[\]=]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
// a seal over the saved farm: an edit made outside the game shows (it is then loaded checked, and flagged)
function seal(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }

const int = (v, lo, hi, d = lo) => Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d;

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
  const land = Array.isArray(d.land) ? d.land : [];
  out.land = [...new Set(land.filter(x => Number.isInteger(x) && x >= 0 && x < 40))].slice(0, 40);
  out.coops = [];
  const seen = new Set();
  for (const c of Array.isArray(d.coops) ? d.coops.slice(0, 40) : []) {
    if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !/^c\d{1,4}$/.test(c.id) || seen.has(c.id)) continue;
    if (!BREED_INFO[c.breed] || !out.land.includes(c.plot) || out.coops.some(o => o.plot === c.plot)) continue;
    seen.add(c.id);
    out.coops.push({ id: c.id, breed: c.breed, tier: int(c.tier, 0, 4, 0), plot: c.plot, name: cleanName(c.name, 24) });
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
    out.birds.push({ id: b.id, name, sex, breed: coop.breed, pers, coop: coop.id, since: int(b.since, 0, now, now), exp: int(b.exp, 0, 1e7, 0), trust: int(b.trust, 0, 15, 0) });
  }
  out.next = int(d.next, 1, 99999, 1);
  for (const x of [...out.coops, ...out.birds]) out.next = Math.max(out.next, parseInt(x.id.slice(1), 10) + 1);
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
  breedName(b) { return BREED_INFO[b].name[this.li()]; }
  coopName(c) { return c.name || BREED_INFO[c.breed].coop[this.li()]; }
  persName(p, sex) { const n = PERS_INFO[p].name[this.lang]; return n[sex === 'r' && n[1] ? 1 : 0]; }
  persLine(p, sex) { const n = PERS_INFO[p].line[this.lang]; return n[sex === 'r' && n[1] ? 1 : 0]; }
  farmerName() { const f = this.data ? this.data.farmer : { look: 'm', name: '' }; return f.name || FARMER_DEFAULT[f.look][this.li()]; }
  defaultFarmer(look) { return FARMER_DEFAULT[look][this.li()]; }
  // ---- the farm
  get level() { return levelOf(this.data.xp); }
  trustLevel(b) { return TRUST_AT.filter(n => b.trust >= n).length - 1; }
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
    return [['r', pers[0]], ['h', pers[1]], ['h', pers[2]]].map(([sex, p]) => ({ id: this.id('b'), name: pick(sex === 'r' ? ROO_NAMES : HEN_NAMES), sex, breed, pers: p, coop: coopId, since: now, exp: 0, trust: 0 }));
  }
  newFarm({ lang, look, name }) {
    const now = Date.now();
    this.lang = lang === 'fr' ? 'fr' : 'en';
    this.data = { v: SAVE_V, made: now, lang: this.lang, coins: 100, xp: 0, farmer: { look: look === 'f' ? 'f' : 'm', name: cleanName(name) }, land: [0], coops: [], birds: [], next: 1 };
    const coop = { id: this.id('c'), breed: 'rir', tier: 0, plot: 0, name: '' };
    this.data.coops.push(coop);
    this.data.birds.push(...this.trio('rir', coop.id, true));
    this.edited = false;
    this.save();
    return this.data;
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
    this.edited = raw.s !== seal(JSON.stringify(raw.d)) || JSON.stringify(d) !== JSON.stringify(raw.d);
    return d;
  }
  wipe() { try { this.store && this.store.removeItem(SAVE_KEY); } catch (e) { /* */ } this.data = null; }
  onChange(f) { this.listeners.push(f); }
}
