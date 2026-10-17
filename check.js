(() => {
'use strict';

/* =====================================================================
   1. GAME RULES (all times are game time; 1x speed = real time)
   ===================================================================== */
const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;
const T = { incubate: 1 * HOUR, young: 6 * HOUR, adult: 3 * DAY, older: 14 * DAY, retire: 30 * DAY };
const OFFLINE_CAP = 48 * HOUR;          // farm pauses after 2 days away
const NEST_CAP = 12;                    // eggs a coop holds before hens stop laying into it
const SHOW_EVERY = 4 * HOUR, SHOW_OPEN = 3 * HOUR, SHOP_EVERY = 2 * HOUR;
const HEN_ODDS = 0.6, FERTILITY = 0.8, MUTATION = 0.04;
const MAX_PLOTS = 12, MAX_BIRDS = 600;
const SAVE_KEY = 'feather-field-save-v1', SALT = 'ff::feather-field::2026';
const SPEEDS = [1, 60];

const BREEDS = {
  rir: { price: 40,  egg: 3, lay: 15, eggCol: '#a96a40', size: 1.00, coop: 200 },
  orp: { price: 90,  egg: 5, lay: 20, eggCol: '#dcb98f', size: 1.12, coop: 450 },
  leg: { price: 150, egg: 8, lay: 22, eggCol: '#a7cfc8', size: 0.95, coop: 900 },
  sil: { price: 110, egg: 6, lay: 40, eggCol: '#efe4d2', size: 0.82, coop: 1500 },
  bra: { price: 260, egg: 7, lay: 30, eggCol: '#c9a07a', size: 1.30, coop: 2600 },
};
const BREED_IDS = ['rir', 'orp', 'leg', 'sil', 'bra'];
const TRAITS = ['type', 'plum', 'size', 'lay'];

// Silkie colours. show = can enter standard show classes. m = price multiplier. w = how often the market offers it.
const SIL = {
  white:     { w: 18, m: 1.00, show: 1 }, black:  { w: 16, m: 1.00, show: 1 },
  blue:      { w: 14, m: 1.15, show: 1 }, buff:   { w: 12, m: 1.10, show: 1 },
  partridge: { w: 9,  m: 1.35, show: 1 }, grey:   { w: 9,  m: 1.30, show: 1 },
  splash:    { w: 8,  m: 1.25, show: 0 }, cuckoo: { w: 5,  m: 1.60, show: 0 },
  red:       { w: 4,  m: 1.80, show: 0 }, paint:  { w: 3,  m: 2.10, show: 0 },
  lavender:  { w: 2,  m: 2.60, show: 0 },
};
const RARE_SIL = ['lavender', 'paint', 'red', 'cuckoo'];

const TIERS = {
  village:  { mean: 42, sd: 10, n: 6,  prize: [80, 40, 20],     fee: 10 },
  county:   { mean: 57, sd: 9,  n: 8,  prize: [350, 150, 70],   fee: 40 },
  national: { mean: 72, sd: 8,  n: 10, prize: [1500, 600, 250], fee: 150 },
};
const TOWNS = ['Thornbury Green', 'Ashwell', 'Marlow Down', 'Kettlewick', 'Bramley Cross', 'Fenwick', 'Oakhurst', 'Saxby Vale', 'Little Hollowby', 'Wexcombe'];
const COUNTIES = ['Wessex', 'Mercia', 'Downland', 'Fenshire', 'Weald'];

const HEN_NAMES = ['Henrietta','Clover','Mabel','Peggy','Dotty','Hazel','Maple','Willow','Biscuit','Nutmeg','Poppy','Daisy','Pearl','Ginger','Olive','Rosie','Marigold','Bramble','Truffle','Pippa','Dumpling','Ivy','Cosette','Margot','Brioche','Lulu','Fern','Juniper','Agathe','Praline','Noisette','Mimi','Edith','Sybil','Tansy','Wren'];
const ROO_NAMES = ['Rupert','Albert','Barnaby','Chester','Gus','Reginald','Hamish','Basil','Monty','Fergus','Rocco','Duke','Gaston','Hector','Marcel','Ozzy','Percy','Rex','Bertrand','Napoléon','Winston','Alfie','Jasper','Otto'];

/* =====================================================================
   2. LANGUAGES (add a language by adding one more block)
   ===================================================================== */
const I18N = {
en: {
  tab_farm:'Farm', tab_market:'Market', tab_hatch:'Hatchery', tab_shows:'Shows', tab_awards:'Awards',
  settings:'Settings', close:'Close', coins:'coins',
  br_rir:'Rhode Island Red', br_orp:'Buff Orpington', br_leg:'Cream Legbar', br_sil:'Silkie', br_bra:'Light Brahma',
  coop_rir:'Red Barn', coop_orp:'Thatched Cottage', coop_leg:'Stone Cottage', coop_sil:'Pagoda Coop', coop_bra:'Timber Lodge',
  col_white:'White', col_black:'Black', col_blue:'Blue', col_splash:'Splash', col_buff:'Buff', col_partridge:'Partridge', col_grey:'Grey', col_lavender:'Lavender', col_cuckoo:'Cuckoo', col_red:'Red', col_paint:'Paint',
  st_chick:'Chick', st_young_h:'Pullet', st_young_r:'Cockerel', st_adult_h:'Hen', st_adult_r:'Rooster', st_older_h:'Older hen', st_older_r:'Older rooster', st_retired_h:'Retired hen', st_retired_r:'Retired rooster',
  tr_type:'Type', tr_plum:'Plumage', tr_size:'Size', tr_lay:'Laying',
  quality:'Quality', value:'Value', age:'Age', gen:'Generation', parents:'Parents', unknown:'Unknown',
  sell_for:'Sell for', confirm:'Tap again to confirm', buy_for:'Buy for', build_for:'Build for',
  need_coins:'Not enough coins', need_coop:'Build a {coop} first', coop_full:'All {coop} coops are full', need_plot:'Buy a land plot first', basket_full:'Your egg basket is full',
  nest:'Nest box', collect:'Collect eggs', nest_empty:'No eggs yet', birds:'Birds', upgrade_cap:'Make room for 4 more birds',
  sire:'Breeding rooster', make_sire:'Make breeding rooster', is_sire:'Breeding rooster', no_rooster:'No adult rooster here, so eggs are not fertile. Add a rooster to breed.',
  sire_auto:'Chosen at random from your roosters', sire_note:'Fertile eggs from this coop are fathered by the breeding rooster.',
  retire_now:'Retire to pasture now', rehome:'Rehome with a family', rehomed:'{name} went to a loving family',
  retires_in:'Retires in {t}', retired_on:'Living on the pasture', laying_now:'Laying', not_laying:'Not laying yet',
  enter_show:'Enter a show', no_shows:'No open show for this bird right now.', entered:'Entered in {show}',
  champ_line:'Champion bloodline: chicks bred from this bird are worth more.', champion:'Champion', supreme:'Supreme champion',
  sold:'Sold {name} for {n} coins', bought:'{name} joined your {coop}',
  market_birds:'Birds', market_build:'Build', new_birds_in:'New birds arrive in {t}', no_offers:'No birds for sale right now.',
  build_coop:'Coop for {breed}', owned:'You own {n}', land:'Land plot', land_note:'Each coop needs its own plot.', plots_owned:'{n} of {max} plots owned',
  buy_land:'Buy land', incubator_slot:'Extra incubator slot', basket_up:'Bigger egg basket (+40)', max_reached:'Fully upgraded',
  basket:'Egg basket', sell_all:'Sell all eggs', eggs_each:'{n} each', fertile:'Fertile eggs', fertile_note:'Hatch them or sell them as hatching eggs.',
  incubate:'Incubate', incubator:'Incubator', empty_slot:'Empty slot', hatches_in:'Hatches in {t}', ready_wait:'Ready to hatch. Make room in a {coop}.', hatched:'A {breed} chick hatched: {name}!', est:'Expected quality about {q}',
  no_fertile:'No fertile eggs. Keep a rooster with your hens and collect their eggs.', no_eggs:'The basket is empty. Tap the egg above a coop to collect.',
  incubator_full:'The incubator is full', slots:'{a} of {b} slots in use',
  shows_open:'Open shows', next_show:'Next show announced in {t}', closes_in:'Judging in {t}', fee:'Entry fee', prizes:'Prizes', any_breed:'Any breed', class:'{breed} class',
  choose_bird:'Choose a bird to enter', no_eligible:'You have no bird that can enter this class.', entered_bird:'{name} is entered', results:'Results', no_results:'No results yet.',
  t_village:'Village show', t_county:'County show', t_national:'National championship',
  show_name_village:'{town} Village Show', show_name_county:'{county} County Show', show_name_national:'National Poultry Championship',
  place_1:'1st', place_2:'2nd', place_3:'3rd', place_n:'{n}th', not_placed:'Not placed',
  result_toast:'{name} came {place} at {show}', prize_won:'+{n} coins', non_standard:'{col} Silkies are not a standard show colour.',
  awards:'Awards', rosettes:'Rosettes', champions:'Champions', milestones:'Milestones', stats:'Farm record',
  m_coops:'Own a coop for every breed', m_hatch10:'Hatch 10 chicks', m_rare:'Hatch a rare Silkie colour', m_aplus:'Breed a bird with quality 75+', m_perfect:'Breed the perfect chicken (quality 95+)', m_village:'Win 1st at a village show', m_county:'Win 1st at a county show', m_national:'Win the National championship',
  s_eggs:'Eggs laid', s_hatched:'Chicks hatched', s_sold:'Birds sold', s_earned:'Coins earned',
  lang:'Language', speed:'Game speed', speed_1:'Normal', speed_60:'Test ×60', speed_note:'Test speed makes 1 minute equal 1 hour, so you can try breeding and shows quickly.',
  time_title:'How time works',
  time_body:'The farm keeps going while the game is closed. Eggs take 1 hour to hatch. Chicks grow up in 6 hours and hens start laying. Birds are adults at 3 days, lay less after 14 days and retire to the pasture at 30 days. They never die.',
  away_body:'If you stay away for more than 2 days, the farm pauses until you come back. Nest boxes stop filling at 12 eggs, so collect often.',
  saved_here:'Your farm is saved on this device only.', edited:'This save was changed outside the game.', reset:'Start a new farm', reset_done:'New farm started',
  welcome_title:'Welcome to your farm', welcome_1:'You start with a Red Barn, three Rhode Island Red hens and a rooster.',
  welcome_2:'Tap the egg above the coop to collect eggs, then sell them in the Hatchery or hatch the fertile ones.',
  welcome_3:'Save up for new breeds, each with its own coop. Breed better birds, win rosettes at shows and decide whether to sell your champion or breed from it.',
  start:'Start farming',
  away_title:'While you were away', away_eggs:'{n} eggs laid', away_hatched:'{n} chicks hatched', away_retired:'{n} birds retired to the pasture', away_shows:'{n} show results', away_paused:'You were away more than 2 days, so the farm paused.',
  pasture:'Pasture', pasture_note:'Retired birds live here. They no longer lay, but you can rehome them.', pasture_empty:'No retired birds yet.',
  sign_build:'Build a coop', sign_sale:'For sale', build_here:'Choose a coop to build', crow:'Cock-a-doodle-doo!', cluck:'cluck',
  in_coop:'In the {coop}', grade:'Grade', egg_word:'egg', eggs_word:'eggs', sell_eggs_done:'Sold {e} eggs for {n} coins', collected:'+{n} eggs',
  coop_cap:'{a} of {b} birds', show_ready:'Show entries open', retired_toast:'{name} retired to the pasture',
  chick_in:'Grows up in {t}', rooster_sym:'♂', hen_sym:'♀', cap_max:'Coop is at full size',
},
fr: {
  tab_farm:'Ferme', tab_market:'Marché', tab_hatch:'Couvoir', tab_shows:'Concours', tab_awards:'Trophées',
  settings:'Réglages', close:'Fermer', coins:'pièces',
  br_rir:'Rhode Island Red', br_orp:'Orpington fauve', br_leg:'Legbar crème', br_sil:'Poule soie', br_bra:'Brahma herminé',
  coop_rir:'Grange rouge', coop_orp:'Chaumière', coop_leg:'Maison de pierre', coop_sil:'Poulailler pagode', coop_bra:'Chalet en rondins',
  col_white:'Blanc', col_black:'Noir', col_blue:'Bleu', col_splash:'Splash', col_buff:'Fauve', col_partridge:'Perdrix', col_grey:'Gris', col_lavender:'Lavande', col_cuckoo:'Coucou', col_red:'Rouge', col_paint:'Pie',
  st_chick:'Poussin', st_young_h:'Poulette', st_young_r:'Coquelet', st_adult_h:'Poule', st_adult_r:'Coq', st_older_h:'Poule âgée', st_older_r:'Coq âgé', st_retired_h:'Poule retraitée', st_retired_r:'Coq retraité',
  tr_type:'Type', tr_plum:'Plumage', tr_size:'Taille', tr_lay:'Ponte',
  quality:'Qualité', value:'Valeur', age:'Âge', gen:'Génération', parents:'Parents', unknown:'Inconnus',
  sell_for:'Vendre', confirm:'Touchez encore pour confirmer', buy_for:'Acheter', build_for:'Construire',
  need_coins:'Pas assez de pièces', need_coop:'Construisez d’abord : {coop}', coop_full:'Tous les poulaillers « {coop} » sont pleins', need_plot:'Achetez d’abord un terrain', basket_full:'Votre panier à œufs est plein',
  nest:'Pondoir', collect:'Ramasser les œufs', nest_empty:'Pas encore d’œufs', birds:'Volailles', upgrade_cap:'Faire de la place pour 4 volailles de plus',
  sire:'Coq reproducteur', make_sire:'Choisir comme reproducteur', is_sire:'Coq reproducteur', no_rooster:'Pas de coq adulte ici : les œufs ne sont pas fécondés. Ajoutez un coq pour faire de l’élevage.',
  sire_auto:'Choisi au hasard parmi vos coqs', sire_note:'Les œufs fécondés de ce poulailler ont pour père le coq reproducteur.',
  retire_now:'Mettre au pâturage maintenant', rehome:'Confier à une famille', rehomed:'{name} est parti(e) dans une famille aimante',
  retires_in:'Retraite dans {t}', retired_on:'Vit au pâturage', laying_now:'Pond', not_laying:'Ne pond pas encore',
  enter_show:'Inscrire à un concours', no_shows:'Aucun concours ouvert pour cette volaille.', entered:'Inscrit(e) à : {show}',
  champ_line:'Lignée de champion : ses poussins valent plus cher.', champion:'Champion', supreme:'Grand champion',
  sold:'{name} vendu(e) pour {n} pièces', bought:'{name} a rejoint : {coop}',
  market_birds:'Volailles', market_build:'Construire', new_birds_in:'Nouvelles volailles dans {t}', no_offers:'Aucune volaille à vendre pour le moment.',
  build_coop:'Poulailler pour {breed}', owned:'Vous en avez {n}', land:'Terrain', land_note:'Chaque poulailler a besoin de son propre terrain.', plots_owned:'{n} terrains sur {max}',
  buy_land:'Acheter le terrain', incubator_slot:'Place de couveuse en plus', basket_up:'Panier plus grand (+40)', max_reached:'Amélioration maximale',
  basket:'Panier à œufs', sell_all:'Vendre tous les œufs', eggs_each:'{n} l’unité', fertile:'Œufs fécondés', fertile_note:'Faites-les éclore ou vendez-les comme œufs à couver.',
  incubate:'Couver', incubator:'Couveuse', empty_slot:'Place libre', hatches_in:'Éclosion dans {t}', ready_wait:'Prêt à éclore. Faites de la place dans : {coop}.', hatched:'Un poussin {breed} est né : {name} !', est:'Qualité attendue : environ {q}',
  no_fertile:'Aucun œuf fécondé. Gardez un coq avec vos poules et ramassez leurs œufs.', no_eggs:'Le panier est vide. Touchez l’œuf au-dessus d’un poulailler pour ramasser.',
  incubator_full:'La couveuse est pleine', slots:'{a} places utilisées sur {b}',
  shows_open:'Concours ouverts', next_show:'Prochain concours annoncé dans {t}', closes_in:'Jugement dans {t}', fee:'Inscription', prizes:'Prix', any_breed:'Toutes races', class:'Classe {breed}',
  choose_bird:'Choisissez une volaille à inscrire', no_eligible:'Aucune de vos volailles ne peut concourir dans cette classe.', entered_bird:'{name} est inscrit(e)', results:'Résultats', no_results:'Pas encore de résultats.',
  t_village:'Concours de village', t_county:'Concours régional', t_national:'Championnat national',
  show_name_village:'Concours de {town}', show_name_county:'Concours régional du {county}', show_name_national:'Championnat national avicole',
  place_1:'1er', place_2:'2e', place_3:'3e', place_n:'{n}e', not_placed:'Non classé',
  result_toast:'{name} : {place} au {show}', prize_won:'+{n} pièces', non_standard:'La couleur {col} n’est pas reconnue en concours.',
  awards:'Trophées', rosettes:'Rosettes', champions:'Champions', milestones:'Objectifs', stats:'Bilan de la ferme',
  m_coops:'Avoir un poulailler pour chaque race', m_hatch10:'Faire éclore 10 poussins', m_rare:'Faire éclore une poule soie de couleur rare', m_aplus:'Élever une volaille de qualité 75+', m_perfect:'Élever la poule parfaite (qualité 95+)', m_village:'Gagner un 1er prix au village', m_county:'Gagner un 1er prix régional', m_national:'Remporter le championnat national',
  s_eggs:'Œufs pondus', s_hatched:'Poussins éclos', s_sold:'Volailles vendues', s_earned:'Pièces gagnées',
  lang:'Langue', speed:'Vitesse du jeu', speed_1:'Normale', speed_60:'Test ×60', speed_note:'La vitesse test fait passer 1 heure en 1 minute, pour essayer l’élevage et les concours rapidement.',
  time_title:'Comment passe le temps',
  time_body:'La ferme continue quand le jeu est fermé. Un œuf éclot en 1 heure. Les poussins grandissent en 6 heures et les poules commencent à pondre. Les volailles sont adultes à 3 jours, pondent moins après 14 jours et partent au pâturage à 30 jours. Elles ne meurent jamais.',
  away_body:'Si vous partez plus de 2 jours, la ferme se met en pause jusqu’à votre retour. Les pondoirs s’arrêtent à 12 œufs : ramassez souvent.',
  saved_here:'Votre ferme est enregistrée sur cet appareil uniquement.', edited:'Cette sauvegarde a été modifiée hors du jeu.', reset:'Recommencer une ferme', reset_done:'Nouvelle ferme créée',
  welcome_title:'Bienvenue dans votre ferme', welcome_1:'Vous commencez avec une grange rouge, trois poules Rhode Island Red et un coq.',
  welcome_2:'Touchez l’œuf au-dessus du poulailler pour ramasser, puis vendez les œufs au couvoir ou faites éclore les œufs fécondés.',
  welcome_3:'Économisez pour de nouvelles races, chacune avec son poulailler. Améliorez vos lignées, gagnez des rosettes et décidez : vendre votre champion ou le garder pour la reproduction ?',
  start:'Commencer',
  away_title:'Pendant votre absence', away_eggs:'{n} œufs pondus', away_hatched:'{n} poussins éclos', away_retired:'{n} volailles parties au pâturage', away_shows:'{n} résultats de concours', away_paused:'Vous êtes parti plus de 2 jours : la ferme s’est mise en pause.',
  pasture:'Pâturage', pasture_note:'Les volailles retraitées vivent ici. Elles ne pondent plus, mais vous pouvez les confier à une famille.', pasture_empty:'Aucune volaille retraitée pour le moment.',
  sign_build:'Construire', sign_sale:'À vendre', build_here:'Choisissez un poulailler à construire', crow:'Cocorico !', cluck:'cot cot',
  in_coop:'Dans : {coop}', grade:'Note', egg_word:'œuf', eggs_word:'œufs', sell_eggs_done:'{e} œufs vendus pour {n} pièces', collected:'+{n} œufs',
  coop_cap:'{a} volailles sur {b}', show_ready:'Inscriptions ouvertes', retired_toast:'{name} est parti(e) au pâturage',
  chick_in:'Adulte dans {t}', rooster_sym:'♂', hen_sym:'♀', cap_max:'Le poulailler est à sa taille maximale',
}};

/* =====================================================================
   3. UTILITIES
   ===================================================================== */
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const pick = a => a[Math.floor(Math.random() * a.length)];
const lerp = (a, b, k) => a + (b - a) * k;
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function wpick(obj) { let tot = 0; for (const k in obj) tot += obj[k].w; let r = Math.random() * tot; for (const k in obj) { r -= obj[k].w; if (r <= 0) return k; } return Object.keys(obj)[0]; }
function rngFrom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function fnv(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }
function cleanName(s, fallback) { const v = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20); return v || fallback; }

let state = null;
const lang = () => (state && I18N[state.lang]) ? state.lang : 'en';
function t(k, v) {
  let s = I18N[lang()][k]; if (s == null) s = I18N.en[k]; if (s == null) return k;
  if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => v[n] != null ? v[n] : m);
  return s;
}
const nf = () => new Intl.NumberFormat(lang() === 'fr' ? 'fr-FR' : 'en-GB');
const fmtN = n => nf().format(Math.round(n));
function fmtDur(ms) {
  ms = Math.max(0, ms); const s = Math.ceil(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  const j = lang() === 'fr' ? { d: ' j', h: ' h', m: ' min', s: ' s' } : { d: 'd', h: 'h', m: 'm', s: 's' };
  if (d) return `${d}${j.d} ${h}${j.h}`;
  if (h) return `${h}${j.h} ${m}${j.m}`;
  if (m) return `${m}${j.m}${m < 10 && sec ? ' ' + sec + j.s : ''}`;
  return `${sec}${j.s}`;
}
const realLeft = gameMs => gameMs / state.speed;   // countdowns show real time at the current speed
function placeLabel(p) { return p <= 3 ? t('place_' + p) : t('place_n', { n: p }); }

/* =====================================================================
   4. GENETICS AND BIRDS
   ===================================================================== */
// Simplified real Silkie colour genetics:
//  c  recessive white (c/c = white)     I  dominant white (I/i on black = paint, I/I = white)
//  base  E black > Gy grey > Pa partridge > Rd red > Bu buff
//  bl blue (Bl/bl blue, Bl/Bl splash)   lav  lavender (l/l)   cu  cuckoo barring (B dominant)
const GENES = { c: ['C', 'c'], I: ['I', 'i'], base: ['E', 'Gy', 'Pa', 'Rd', 'Bu'], bl: ['Bl', 'bl'], lav: ['L', 'l'], cu: ['B', 'b'] };
const BASE_RANK = { E: 5, Gy: 4, Pa: 3, Rd: 2, Bu: 1 };
function silkieColour(g) {
  if (g.c[0] === 'c' && g.c[1] === 'c') return 'white';
  const I = (g.I[0] === 'I') + (g.I[1] === 'I');
  if (I === 2) return 'white';
  const base = BASE_RANK[g.base[0]] >= BASE_RANK[g.base[1]] ? g.base[0] : g.base[1];
  if (base === 'E') {
    if (I === 1) return 'paint';
    if (g.lav[0] === 'l' && g.lav[1] === 'l') return 'lavender';
    if (g.cu.includes('B')) return 'cuckoo';
    const bl = (g.bl[0] === 'Bl') + (g.bl[1] === 'Bl');
    return bl === 2 ? 'splash' : bl === 1 ? 'blue' : 'black';
  }
  if (I === 1) return 'white';
  return { Gy: 'grey', Pa: 'partridge', Rd: 'red', Bu: 'buff' }[base];
}
function silTemplate(col) {
  const g = { c: ['C', 'C'], I: ['i', 'i'], base: ['E', 'E'], bl: ['bl', 'bl'], lav: ['L', 'L'], cu: ['b', 'b'] };
  switch (col) {
    case 'white': g.c = ['c', 'c']; g.base = [pick(GENES.base), pick(GENES.base)]; break;
    case 'blue': g.bl = ['Bl', 'bl']; break; case 'splash': g.bl = ['Bl', 'Bl']; break;
    case 'buff': g.base = ['Bu', 'Bu']; break; case 'partridge': g.base = ['Pa', 'Pa']; break;
    case 'grey': g.base = ['Gy', 'Gy']; break; case 'red': g.base = ['Rd', 'Rd']; break;
    case 'lavender': g.lav = ['l', 'l']; break; case 'cuckoo': g.cu = ['B', 'b']; break;
    case 'paint': g.I = ['I', 'i']; break;
  }
  // hidden genes make breeding surprising
  if (col !== 'white' && Math.random() < 0.15) g.c = ['C', 'c'];
  if (col !== 'lavender' && Math.random() < 0.08) g.lav = ['L', 'l'];
  if (g.base[0] === 'E' && g.base[1] === 'E' && col !== 'white' && Math.random() < 0.12) g.base = ['E', pick(['Bu', 'Pa', 'Gy', 'Rd'])];
  return g;
}
function inheritGeno(a, b) { const g = {}; for (const k in GENES) g[k] = [a[k][Math.random() < .5 ? 0 : 1], b[k][Math.random() < .5 ? 0 : 1]]; return g; }
function quality(b) { const x = b.traits; return Math.round(.3 * x.type + .3 * x.plum + .2 * x.size + .2 * x.lay); }
function showScoreBase(b) { const x = b.traits; return .4 * x.type + .35 * x.plum + .25 * x.size; }
function grade(q) { return q >= 95 ? '★' : q >= 88 ? 'A+' : q >= 75 ? 'A' : q >= 60 ? 'B' : q >= 45 ? 'C' : 'D'; }
function stage(b) {
  if (b.home === 'pasture') return 'retired';
  const a = state.gt - b.born;
  return a < T.young ? 'chick' : a < T.adult ? 'young' : a < T.older ? 'adult' : 'older';
}
function stageLabel(b) { const s = stage(b); return s === 'chick' ? t('st_chick') : t('st_' + s + '_' + b.sex); }
const isGrown = b => stage(b) !== 'chick';
function randomName(sex) {
  const pool = sex === 'r' ? ROO_NAMES : HEN_NAMES;
  const used = new Set(state ? state.birds.map(b => b.name) : []);
  for (let i = 0; i < 8; i++) { const n = pick(pool); if (!used.has(n)) return n; }
  return pick(pool) + ' ' + (2 + Math.floor(Math.random() * 8));
}
function breedBase(b) { return BREEDS[b.breed].price * (b.breed === 'sil' ? SIL[b.colour].m : 1); }
function qMult(q) { return .25 + .75 * (q / 50) ** 2; }
function value(b) {
  const st = { chick: .45, young: .9, adult: 1, older: .6, retired: .15 }[stage(b)];
  const sx = b.sex === 'h' ? 1 : .85;
  const ch = 1 + .5 * Math.min(b.champ, 4);
  const line = 1 + .1 * Math.min(b.line || 0, 4);
  return Math.max(1, Math.round(breedBase(b) * qMult(quality(b)) * st * sx * ch * line));
}
const sellPrice = b => Math.max(1, Math.round(value(b) * .8));
function fertileEggPrice(e) {
  const c = e.child; const base = BREEDS[c.breed].price * (c.breed === 'sil' ? SIL[c.colour].m : 1);
  const q = (e.sire.q + e.dam.q) / 2;
  return Math.round(BREEDS[c.breed].egg * 3 + .06 * base * qMult(q) * (1 + .1 * (c.line || 0)));
}
function layInterval(b) {
  const age = state.gt - b.born;
  return BREEDS[b.breed].lay * MIN * (1.3 - .6 * b.traits.lay / 100) * (age >= T.older ? 2 : 1) * (.8 + .4 * Math.random());
}
function makeBird(o) {
  const b = {
    id: state.nextId++, name: o.name || randomName(o.sex), breed: o.breed, sex: o.sex, born: o.born, home: o.home,
    traits: o.traits, gen: o.gen || 1, sire: o.sire || null, dam: o.dam || null, line: o.line || 0,
    ribbons: [], champ: 0, seed: (Math.random() * 2 ** 31) | 0, nextLay: 0, entered: null,
  };
  if (o.breed === 'sil') { b.geno = o.geno; b.colour = silkieColour(o.geno); }
  return b;
}
function shopTraits() { const x = {}; for (const k of TRAITS) x[k] = clamp(Math.round(42 + gauss() * 9), 15, 70); return x; }
function childSpec(sire, dam) {
  const traits = {};
  for (const k of TRAITS) {
    let v = (sire.traits[k] + dam.traits[k]) / 2 + gauss() * 6;
    if (Math.random() < MUTATION) v += 8 + Math.random() * 8;
    traits[k] = clamp(Math.round(v), 1, 100);
  }
  const spec = { breed: dam.breed, sex: Math.random() < HEN_ODDS ? 'h' : 'r', traits, gen: Math.max(sire.gen, dam.gen) + 1, line: Math.min(4, sire.champ + dam.champ + Math.floor(((sire.line || 0) + (dam.line || 0)) / 2)) };
  if (dam.breed === 'sil') { spec.geno = inheritGeno(sire.geno, dam.geno); spec.colour = silkieColour(spec.geno); }
  return spec;
}

/* =====================================================================
   5. STATE, SAVE AND SECURITY CHECKS
   ===================================================================== */
function newGame(langCode) {
  state = {
    v: 1, gt: 0, lastReal: Date.now(), speed: 1, lang: langCode, coins: 150, nextId: 1,
    plots: 2, coops: [], birds: [], basket: { plain: {}, fertile: [] }, basketCap: 60,
    inc: { slots: 2, items: [] }, shop: { offers: [], next: 0 }, shows: { list: [], next: 25 * MIN, history: [] },
    stats: { eggs: 0, hatched: 0, sold: 0, earned: 0, wins: [0, 0, 0], best: 0, rare: 0, w1: { village: 0, county: 0, national: 0 } },
    flags: { welcome: false, edited: false },
  };
  for (const id of BREED_IDS) state.basket.plain[id] = 0;
  const coop = { id: state.nextId++, breed: 'rir', plot: 0, cap: 8, nest: { plain: 0, fertile: [] }, sire: null };
  state.coops.push(coop);
  for (let i = 0; i < 4; i++) {
    const b = makeBird({ breed: 'rir', sex: i < 3 ? 'h' : 'r', traits: shopTraits(), born: -(T.young + DAY * (.5 + Math.random())), home: coop.id });
    b.nextLay = 30e3 + Math.random() * 4 * MIN;
    state.birds.push(b);
  }
  refreshShop();
  createShow('village', 'rir');
}

function save() {
  if (!state) return;
  try {
    const data = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, data, sum: fnv(SALT + data) }));
  } catch (e) { /* storage blocked or full: keep playing */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw || raw.length > 3e6) return null;
    const w = JSON.parse(raw);
    if (!w || typeof w.data !== 'string') return null;
    const s = sanitize(JSON.parse(w.data));
    if (s && fnv(SALT + w.data) !== w.sum) s.flags.edited = true;
    return s;
  } catch (e) { return null; }
}
// Every value from storage is treated as untrusted: types checked, numbers clamped, unknown keys dropped.
const num = (x, a, b, d) => (typeof x === 'number' && isFinite(x)) ? clamp(x, a, b) : d;
const int = (x, a, b, d) => Math.round(num(x, a, b, d));
const okBreed = x => BREED_IDS.includes(x) ? x : null;
function okTraits(x) { const o = {}; for (const k of TRAITS) o[k] = int(x && x[k], 1, 100, 40); return o; }
function okGeno(g, colour) {
  if (!g || typeof g !== 'object') return silTemplate(SIL[colour] ? colour : 'white');
  const o = {};
  for (const k in GENES) { const a = Array.isArray(g[k]) ? g[k] : []; o[k] = [0, 1].map(i => GENES[k].includes(a[i]) ? a[i] : GENES[k][GENES[k].length > 2 ? 0 : 1]); }
  return o;
}
function okParent(p) { return p && typeof p === 'object' ? { name: cleanName(p.name, '?'), q: int(p.q, 1, 100, 40) } : null; }
function okSpec(s) {
  const breed = okBreed(s && s.breed); if (!breed) return null;
  const o = { breed, sex: s.sex === 'r' ? 'r' : 'h', traits: okTraits(s.traits), gen: int(s.gen, 1, 999, 1), line: int(s.line, 0, 4, 0) };
  if (breed === 'sil') { o.geno = okGeno(s.geno, s.colour); o.colour = silkieColour(o.geno); }
  return o;
}
function okEgg(e) { const child = okSpec(e && e.child); if (!child) return null; return { id: int(e.id, 0, 1e9, 0), child, sire: okParent(e.sire) || { name: '?', q: 40 }, dam: okParent(e.dam) || { name: '?', q: 40 }, laid: num(e.laid, -1e13, 1e13, 0) }; }
function sanitize(s) {
  if (!s || typeof s !== 'object' || s.v !== 1) return null;
  const o = {
    v: 1, gt: num(s.gt, -1e13, 1e13, 0), lastReal: num(s.lastReal, 0, 1e14, Date.now()), speed: SPEEDS.includes(s.speed) ? s.speed : 1,
    lang: I18N[s.lang] ? s.lang : 'en', coins: int(s.coins, 0, 1e12, 0), nextId: int(s.nextId, 1, 1e9, 1),
    plots: int(s.plots, 1, MAX_PLOTS, 2), coops: [], birds: [], basket: { plain: {}, fertile: [] }, basketCap: int(s.basketCap, 60, 1000, 60),
    inc: { slots: int(s.inc && s.inc.slots, 2, 8, 2), items: [] }, shop: { offers: [], next: num(s.shop && s.shop.next, -1e13, 1e13, 0) },
    shows: { list: [], next: num(s.shows && s.shows.next, -1e13, 1e13, 0), history: [] },
    stats: { eggs: 0, hatched: 0, sold: 0, earned: 0, wins: [0, 0, 0], best: 0, rare: 0, w1: { village: 0, county: 0, national: 0 } },
    flags: { welcome: !!(s.flags && s.flags.welcome), edited: !!(s.flags && s.flags.edited) },
  };
  const st = s.stats || {};
  for (const k of ['eggs', 'hatched', 'sold', 'earned', 'best', 'rare']) o.stats[k] = int(st[k], 0, 1e12, 0);
  if (Array.isArray(st.wins)) o.stats.wins = [0, 1, 2].map(i => int(st.wins[i], 0, 1e6, 0));
  for (const k in o.stats.w1) o.stats.w1[k] = int(st.w1 && st.w1[k], 0, 1e6, 0);
  const plots = new Set();
  for (const c of (Array.isArray(s.coops) ? s.coops : []).slice(0, MAX_PLOTS)) {
    const breed = okBreed(c && c.breed); const plot = int(c && c.plot, 0, o.plots - 1, -1);
    if (!breed || plot < 0 || plots.has(plot)) continue; plots.add(plot);
    o.coops.push({ id: int(c.id, 1, 1e9, o.nextId++), breed, plot, cap: int(c.cap, 8, 32, 8), sire: Number.isInteger(c.sire) ? c.sire : null,
      nest: { plain: int(c.nest && c.nest.plain, 0, NEST_CAP, 0), fertile: (Array.isArray(c.nest && c.nest.fertile) ? c.nest.fertile : []).slice(0, NEST_CAP).map(okEgg).filter(Boolean) } });
  }
  const coopIds = new Set(o.coops.map(c => c.id));
  for (const b of (Array.isArray(s.birds) ? s.birds : []).slice(0, MAX_BIRDS)) {
    const breed = okBreed(b && b.breed); if (!breed) continue;
    const home = b.home === 'pasture' ? 'pasture' : (coopIds.has(b.home) ? b.home : null); if (home == null) continue;
    const x = { id: int(b.id, 1, 1e9, o.nextId++), name: cleanName(b.name, 'Hen'), breed, sex: b.sex === 'r' ? 'r' : 'h', born: num(b.born, -1e13, 1e13, 0), home,
      traits: okTraits(b.traits), gen: int(b.gen, 1, 999, 1), sire: okParent(b.sire), dam: okParent(b.dam), line: int(b.line, 0, 4, 0),
      ribbons: (Array.isArray(b.ribbons) ? b.ribbons : []).slice(0, 60).map(r => ({ tier: TIERS[r && r.tier] ? r.tier : 'village', place: int(r && r.place, 1, 3, 3) })),
      champ: int(b.champ, 0, 99, 0), seed: int(b.seed, 0, 2 ** 31, 1), nextLay: num(b.nextLay, -1e13, 1e13, 0), entered: Number.isInteger(b.entered) ? b.entered : null };
    if (breed === 'sil') { x.geno = okGeno(b.geno, b.colour); x.colour = silkieColour(x.geno); }
    o.birds.push(x);
  }
  for (const id of BREED_IDS) o.basket.plain[id] = int(s.basket && s.basket.plain && s.basket.plain[id], 0, 1e5, 0);
  o.basket.fertile = (Array.isArray(s.basket && s.basket.fertile) ? s.basket.fertile : []).slice(0, 200).map(okEgg).filter(Boolean);
  o.inc.items = (Array.isArray(s.inc && s.inc.items) ? s.inc.items : []).slice(0, o.inc.slots).map(it => { const egg = okEgg(it && it.egg); return egg ? { egg, start: num(it.start, -1e13, 1e13, o.gt) } : null; }).filter(Boolean);
  o.shows.list = (Array.isArray(s.shows && s.shows.list) ? s.shows.list : []).slice(0, 6).map(x => x && TIERS[x.tier] ? ({ id: int(x.id, 1, 1e9, 1), tier: x.tier, cls: x.cls === 'any' ? 'any' : (okBreed(x.cls) || 'any'), town: TOWNS.includes(x.town) ? x.town : TOWNS[0], county: COUNTIES.includes(x.county) ? x.county : COUNTIES[0], opens: num(x.opens, -1e13, 1e13, 0), closes: num(x.closes, -1e13, 1e13, 0), entry: Number.isInteger(x.entry) ? x.entry : null }) : null).filter(Boolean);
  o.shows.history = (Array.isArray(s.shows && s.shows.history) ? s.shows.history : []).slice(0, 30).map(r => r && TIERS[r.tier] ? ({ tier: r.tier, show: cleanName(r.show, '').slice(0, 60) || '', town: TOWNS.includes(r.town) ? r.town : TOWNS[0], county: COUNTIES.includes(r.county) ? r.county : COUNTIES[0], bird: cleanName(r.bird, '?'), place: int(r.place, 1, 99, 9), prize: int(r.prize, 0, 1e6, 0), gt: num(r.gt, -1e13, 1e13, 0) }) : null).filter(Boolean);
  const ids = [o.nextId, ...o.birds.map(b => b.id + 1), ...o.coops.map(c => c.id + 1), ...o.shows.list.map(x => x.id + 1)];
  o.nextId = Math.max(...ids);
  return o;
}

/* =====================================================================
   6. SIMULATION
   ===================================================================== */
let sink = null;                      // collects events while catching up after time away
const coopById = id => state.coops.find(c => c.id === id);
const birdById = id => state.birds.find(b => b.id === id);
const birdsIn = coop => state.birds.filter(b => b.home === coop.id);
const nestCount = coop => coop.nest.plain + coop.nest.fertile.length;
const adultRoosters = coop => birdsIn(coop).filter(b => b.sex === 'r' && isGrown(b));
function coopWithSpace(breed) { return state.coops.find(c => c.breed === breed && birdsIn(c).length < c.cap) || null; }
function emit(kind, text, gold) { if (sink) { sink[kind] = (sink[kind] || 0) + 1; sink.any = true; } else if (text) toast(text, gold); }

function advance(dt) {
  let left = dt;
  while (left > 0) { const d = Math.min(left, MIN); state.gt += d; left -= d; simStep(); }
}
function simStep() {
  const gt = state.gt;
  for (const b of state.birds) {
    if (b.home === 'pasture') continue;
    const age = gt - b.born;
    if (age >= T.retire) { retire(b); emit('retired', t('retired_toast', { name: b.name })); continue; }
    if (b.sex === 'h' && age >= T.young) {
      if (!b.nextLay || b.nextLay < b.born + T.young) b.nextLay = gt + layInterval(b) * Math.random();
      if (gt >= b.nextLay) {
        const coop = coopById(b.home);
        if (coop && nestCount(coop) < NEST_CAP) { layEgg(b, coop); emit('eggs'); }
        b.nextLay = gt + layInterval(b);
      }
    }
  }
  for (const it of state.inc.items) {
    if (gt >= it.start + T.incubate && !it.waiting) tryHatch(it);
    else if (it.waiting && coopWithSpace(it.egg.child.breed)) tryHatch(it);
  }
  state.inc.items = state.inc.items.filter(it => !it.done);
  if (gt >= state.shop.next) refreshShop();
  if (gt >= state.shows.next) { createShow(); state.shows.next = gt + SHOW_EVERY; }
  for (const s of state.shows.list) if (gt >= s.closes && !s.judged) judge(s);
  state.shows.list = state.shows.list.filter(s => !s.judged);
}
function layEgg(hen, coop) {
  state.stats.eggs++;
  const roos = adultRoosters(coop);
  if (roos.length && Math.random() < FERTILITY) {
    const sire = roos.find(r => r.id === coop.sire) || pick(roos);
    coop.nest.fertile.push({ id: state.nextId++, child: childSpec(sire, hen), sire: { name: sire.name, q: quality(sire) }, dam: { name: hen.name, q: quality(hen) }, laid: state.gt });
  } else coop.nest.plain++;
  dirty = true;
}
function retire(b) {
  b.home = 'pasture'; b.entered = null;
  for (const c of state.coops) if (c.sire === b.id) c.sire = null;
  resetAgent(b); dirty = true;
}
function tryHatch(it) {
  const coop = coopWithSpace(it.egg.child.breed);
  if (!coop) { it.waiting = true; return; }
  const s = it.egg.child;
  const b = makeBird({ breed: s.breed, sex: s.sex, traits: s.traits, geno: s.geno, gen: s.gen, line: s.line, sire: it.egg.sire, dam: it.egg.dam, born: Math.min(state.gt, it.start + T.incubate), home: coop.id });
  state.birds.push(b); it.done = true;
  state.stats.hatched++; state.stats.best = Math.max(state.stats.best, quality(b));
  if (b.breed === 'sil' && RARE_SIL.includes(b.colour)) state.stats.rare++;
  emit('hatched', t('hatched', { breed: breedName(b), name: b.name }), true); dirty = true;
}
function refreshShop() {
  const owned = BREED_IDS.filter(id => state.coops.some(c => c.breed === id));
  const offers = [];
  for (let i = 0; i < 6; i++) {
    const breed = (i < 3 && owned.length) ? pick(owned) : pick(BREED_IDS);
    const sex = Math.random() < .58 ? 'h' : 'r';
    const o = { breed, sex, traits: shopTraits(), born: state.gt - T.young - Math.random() * 2 * DAY, name: randomName(sex), seed: (Math.random() * 2 ** 31) | 0 };
    if (breed === 'sil') { const col = wpick(SIL); o.geno = silTemplate(col); o.colour = silkieColour(o.geno); }
    offers.push(o);
  }
  state.shop = { offers, next: state.gt + SHOP_EVERY };
  dirty = true;
}
function createShow(tier, cls) {
  if (state.shows.list.length >= 3) return;
  const r = Math.random();
  tier = tier || (r < .5 ? 'village' : r < .85 ? 'county' : 'national');
  cls = cls || (Math.random() < .25 ? 'any' : pick(BREED_IDS));
  state.shows.list.push({ id: state.nextId++, tier, cls, town: pick(TOWNS), county: pick(COUNTIES), opens: state.gt, closes: state.gt + SHOW_OPEN, entry: null });
  emit('showsNew', t('show_ready') + ' · ' + showName(state.shows.list[state.shows.list.length - 1]));
  dirty = true;
}
function showName(s) { return t('show_name_' + s.tier, { town: s.town, county: s.county }); }
function canEnter(b, s) {
  if (!b || b.home === 'pasture' || !isGrown(b)) return false;
  if (s.cls !== 'any' && b.breed !== s.cls) return false;
  if (b.breed === 'sil' && !SIL[b.colour].show) return false;
  if (b.entered && b.entered !== s.id && state.shows.list.some(x => x.id === b.entered)) return false;
  return true;
}
function judge(s) {
  s.judged = true;
  const b = s.entry ? birdById(s.entry) : null;
  if (!b || b.home === 'pasture') { if (b) b.entered = null; return; }
  b.entered = null;
  const T_ = TIERS[s.tier];
  const mine = showScoreBase(b) + gauss() * 4;
  let place = 1; for (let i = 0; i < T_.n - 1; i++) if (T_.mean + gauss() * T_.sd > mine) place++;
  let prize = 0;
  if (place <= 3) {
    prize = T_.prize[place - 1]; addCoins(prize);
    b.ribbons.push({ tier: s.tier, place }); state.stats.wins[place - 1]++;
    if (place === 1) { state.stats.w1[s.tier]++; if (s.tier !== 'village') b.champ++; }
  }
  state.shows.history.unshift({ tier: s.tier, show: '', town: s.town, county: s.county, bird: b.name, place, prize, gt: state.gt });
  state.shows.history = state.shows.history.slice(0, 30);
  emit('shows', t('result_toast', { name: b.name, place: place <= 3 ? placeLabel(place) : t('not_placed').toLowerCase(), show: showName(s) }) + (prize ? ' · ' + t('prize_won', { n: fmtN(prize) }) : ''), place <= 3);
  dirty = true;
}
function addCoins(n) { state.coins = Math.min(1e12, state.coins + n); state.stats.earned += n; }

/* ---------- player actions (each re-checks its own rules) ---------- */
function plotPrice() { const list = [0, 0, 300, 800, 2000, 4500, 9000, 16000, 26000, 40000, 60000, 90000]; return list[state.plots] || 1e9; }
function coopPrice(breed) { const n = state.coops.filter(c => c.breed === breed).length; return Math.round(BREEDS[breed].coop * (1 + .75 * n)); }
function capPrice(coop) { return Math.round((BREEDS[coop.breed].coop * .4 + 120) * ((coop.cap - 8) / 4 + 1)); }
function incPrice() { return 150 * 2 ** (state.inc.slots - 2); }
function basketPrice() { return 120 * ((state.basketCap - 60) / 40 + 1); }
function freePlot() { for (let i = 0; i < state.plots; i++) if (!state.coops.some(c => c.plot === i)) return i; return -1; }
function spend(n) { if (state.coins < n) { toast(t('need_coins')); return false; } state.coins -= n; return true; }

function actBuyOffer(i) {
  const o = state.shop.offers[i]; if (!o) return;
  const coop = coopWithSpace(o.breed);
  if (!coop) { toast(state.coops.some(c => c.breed === o.breed) ? t('coop_full', { coop: t('coop_' + o.breed) }) : t('need_coop', { coop: t('coop_' + o.breed) })); return; }
  const price = offerPrice(o); if (!spend(price)) return;
  const b = makeBird({ ...o, home: coop.id }); b.seed = o.seed;
  state.birds.push(b); state.shop.offers.splice(i, 1);
  toast(t('bought', { name: b.name, coop: t('coop_' + b.breed) })); changed();
}
function offerPrice(o) { const fake = { ...o, home: 0, champ: 0, line: 0 }; return value(fake); }
function actSell(b) {
  if (!birdById(b.id)) return;
  const p = b.home === 'pasture' ? Math.max(1, Math.round(value(b))) : sellPrice(b);
  addCoins(p); state.stats.sold++;
  state.birds = state.birds.filter(x => x.id !== b.id);
  for (const c of state.coops) if (c.sire === b.id) c.sire = null;
  for (const s of state.shows.list) if (s.entry === b.id) s.entry = null;
  agents.delete(b.id);
  toast(b.home === 'pasture' ? t('rehomed', { name: b.name }) : t('sold', { name: b.name, n: fmtN(p) }));
  closeSheet(); changed();
}
function actRetire(b) { if (b.home === 'pasture') return; retire(b); toast(t('retired_toast', { name: b.name })); changed(); }
function actSire(b) { const c = coopById(b.home); if (!c || b.sex !== 'r') return; c.sire = b.id; changed(); }
function actRename(b, v) { b.name = cleanName(v, b.name); changed(true); }
function actCollect(coop) {
  const room = state.basketCap - basketCount();
  if (room <= 0) { toast(t('basket_full')); return 0; }
  let n = 0;
  while (coop.nest.fertile.length && n < room) { state.basket.fertile.push(coop.nest.fertile.shift()); n++; }
  const p = Math.min(coop.nest.plain, room - n); coop.nest.plain -= p; state.basket.plain[coop.breed] += p; n += p;
  if (n) toast(t('collected', { n })); if (nestCount(coop) && basketCount() >= state.basketCap) toast(t('basket_full'));
  changed(); return n;
}
function basketCount() { let n = state.basket.fertile.length; for (const k in state.basket.plain) n += state.basket.plain[k]; return n; }
function actSellPlain() {
  let e = 0, coins = 0;
  for (const k of BREED_IDS) { const n = state.basket.plain[k]; e += n; coins += n * BREEDS[k].egg; state.basket.plain[k] = 0; }
  if (!e) return; addCoins(coins); toast(t('sell_eggs_done', { e: fmtN(e), n: fmtN(coins) })); changed();
}
function actSellFertile(id) { const i = state.basket.fertile.findIndex(e => e.id === id); if (i < 0) return; const p = fertileEggPrice(state.basket.fertile[i]); state.basket.fertile.splice(i, 1); addCoins(p); toast(t('prize_won', { n: fmtN(p) })); changed(); }
function actIncubate(id) {
  if (state.inc.items.length >= state.inc.slots) { toast(t('incubator_full')); return; }
  const i = state.basket.fertile.findIndex(e => e.id === id); if (i < 0) return;
  state.inc.items.push({ egg: state.basket.fertile.splice(i, 1)[0], start: state.gt }); changed();
}
function actBuildCoop(breed) {
  const plot = freePlot(); if (plot < 0) { toast(t('need_plot')); return; }
  if (!spend(coopPrice(breed))) return;
  state.coops.push({ id: state.nextId++, breed, plot, cap: 8, nest: { plain: 0, fertile: [] }, sire: null });
  plotCache.clear(); closeSheet(); changed(); scrollToPlot(plot);
}
function actBuyPlot() { if (state.plots >= MAX_PLOTS) return; if (!spend(plotPrice())) return; state.plots++; plotCache.clear(); changed(); }
function actUpgradeCap(coop) { if (coop.cap >= 32) return; if (!spend(capPrice(coop))) return; coop.cap += 4; changed(); }
function actIncSlot() { if (state.inc.slots >= 8) return; if (!spend(incPrice())) return; state.inc.slots++; changed(); }
function actBasket() { if (state.basketCap >= 1000) return; if (!spend(basketPrice())) return; state.basketCap += 40; changed(); }
function actEnter(b, s) {
  if (!canEnter(b, s) || s.entry || s.judged) return;
  if (!spend(TIERS[s.tier].fee)) return;
  s.entry = b.id; b.entered = s.id; toast(t('entered_bird', { name: b.name })); changed();
}

/* =====================================================================
   7. ART: CHICKENS (drawn in code, facing right, feet at 0,0)
   ===================================================================== */
const SIL_PAL = {
  white:     { base: '#f1ece2', light: '#ffffff', dark: '#d1c8b8' },
  black:     { base: '#26262d', light: '#4a4b58', dark: '#101013', sheen: '#46608a' },
  blue:      { base: '#6c7a8d', light: '#93a1b2', dark: '#475365' },
  splash:    { base: '#dde1e6', light: '#f6f7f9', dark: '#b3bac3', spot: '#5d6b80' },
  buff:      { base: '#d9a452', light: '#f0cb84', dark: '#a87530' },
  partridge: { base: '#8c6438', light: '#b08452', dark: '#5c3d1d', pencil: '#2e1d0e' },
  grey:      { base: '#a2a6ab', light: '#c9ccd0', dark: '#767b82' },
  lavender:  { base: '#bcb3c2', light: '#dcd5e0', dark: '#938a9a' },
  cuckoo:    { base: '#9a9da2', light: '#c4c6ca', dark: '#5f6267', bar: '#3a3d42' },
  red:       { base: '#9e3c22', light: '#c86039', dark: '#6a2512' },
  paint:     { base: '#f2efe8', light: '#ffffff', dark: '#d2ccc0', spot: '#1f1f24' },
};
function look(b) {
  const R = b.sex === 'r';
  const common = { face: '#cf3528', comb: '#d02e26', combType: 'single', lobe: '#c92f27', beak: '#d8a64a', eye: '#d77a1d', legs: '#e0b03a', tailLen: 22 };
  switch (b.breed) {
    case 'rir': return { ...common, base: R ? '#8f2f17' : '#86371c', light: R ? '#c1501f' : '#ad5428', dark: '#541f0f', hackle: R ? '#c95a1c' : '#9b4321', hackleDark: '#6d2611',
      tail: R ? '#13201a' : '#3b1a0f', sheen: R ? '#2c7350' : null, wingTip: '#2b130a', pattern: 'scallop', texCol: '#3c140a' };
    case 'orp': return { ...common, base: '#d59f49', light: '#efca80', dark: '#a6732c', hackle: R ? '#e3a43c' : '#dca84f', hackleDark: '#b47b2a',
      tail: R ? '#c4842e' : '#c99446', legs: '#ead3c4', beak: '#e6d1a5', pattern: 'scallop', texCol: '#9b6a28', tailLen: 15, fluffy: true };
    case 'leg': return { ...common, base: R ? '#c7c3b6' : '#9f9b90', light: R ? '#e7e2d1' : '#c4c0b4', dark: R ? '#8c887d' : '#6e6b63', hackle: R ? '#efe2b9' : '#e6dcc4', hackleDark: '#bfb293',
      breast: R ? null : '#d49b7c', tail: R ? '#aeab9f' : '#7f7c73', lobe: '#f1ede2', pattern: 'barred', bar: R ? '#7e7a70' : '#56534b', crest: true, tailLen: 21 };
    case 'bra': return { ...common, base: '#f2f0ea', light: '#ffffff', dark: '#c8c4ba', hackle: '#f4f2ec', hackleDark: '#d3cfc5', stripe: '#1c1c21',
      tail: '#18181c', sheen: '#2b5c45', wingTip: '#1c1c21', legs: '#e3be4a', feathered: true, fluffy: true, combType: 'pea', beak: '#e0c06b', pattern: 'columbian', tailLen: 17 };
    case 'sil': {
      const P = SIL_PAL[b.colour] || SIL_PAL.white;
      const L = { ...P, silkie: true, face: '#3b3f57', comb: '#5a2d42', lobe: '#3fb6c6', beak: '#5d6276', eye: '#1b1414', legs: '#3b4256', legFluff: P.base, feathered: true };
      if (b.colour === 'partridge') { L.pattern = 'pencil'; if (R) { L.base = '#2a221b'; L.light = '#4a3a2c'; L.dark = '#140f0b'; L.cape = '#d39a3d'; L.capeDark = '#a7461f'; } }
      if (b.colour === 'grey' && R) L.cape = '#e5e6e7';
      if (b.colour === 'cuckoo') L.pattern = 'barred';
      if (b.colour === 'splash' || b.colour === 'paint') L.pattern = 'spots';
      if (b.colour === 'red' && R) { L.cape = '#d6662a'; }
      return L;
    }
  }
}
function lg(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); for (const [o, col] of stops) g.addColorStop(o, col); return g; }
function rg(c, x, y, r0, r1, stops, x1, y1) { const g = c.createRadialGradient(x, y, r0, x1 == null ? x : x1, y1 == null ? y : y1, r1); for (const [o, col] of stops) g.addColorStop(o, col); return g; }
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, Math.PI * 2); }

function texScallop(c, path, col, alpha, step, rnd) {
  c.save(); c.clip(path); c.strokeStyle = col; c.globalAlpha = alpha; c.lineWidth = .8;
  for (let y = -100, row = 0; y < 10; y += step * .75, row++) {
    const off = (row % 2) * step / 2;
    for (let x = -72; x < 60; x += step) { c.beginPath(); c.arc(x + off + (rnd() - .5), y, step * .55, .15 * Math.PI, .85 * Math.PI); c.stroke(); }
  }
  c.restore();
}
function texBars(c, path, col, alpha, gap) {
  c.save(); c.clip(path); c.strokeStyle = col; c.globalAlpha = alpha; c.lineWidth = gap * .42;
  for (let y = -110; y < 20; y += gap) { c.beginPath(); for (let x = -72; x <= 64; x += 4) c.lineTo(x, y + Math.sin(x * .45) * 1.1 + x * .14); c.stroke(); }
  c.restore();
}
function texSpots(c, path, col, n, rmin, rmax, rnd, bx) {
  c.save(); c.clip(path); c.fillStyle = col;
  for (let i = 0; i < n; i++) { c.globalAlpha = .55 + rnd() * .4; ell(c, bx[0] + rnd() * (bx[2] - bx[0]), bx[1] + rnd() * (bx[3] - bx[1]), rmin + rnd() * (rmax - rmin), (rmin + rnd() * (rmax - rmin)) * .8, rnd() * 3); c.fill(); }
  c.restore();
}

function drawHenTail(c, L) {
  const n = 7, len = L.tailLen;
  for (let i = 0; i < n; i++) {
    const a = -2.62 + i * .13;
    c.save(); c.translate(-21, -50); c.rotate(a);
    ell(c, len * .5, 0, len * .55, 4.2); c.fillStyle = lg(c, 0, 0, len, 0, [[0, L.tail], [1, shade(L.tail, -.25)]]); c.fill();
    c.strokeStyle = shade(L.tail, -.35); c.globalAlpha = .5; c.lineWidth = .6; c.beginPath(); c.moveTo(2, 0); c.lineTo(len, 0); c.stroke();
    c.restore();
  }
}
function drawSickles(c, L, rnd) {
  const len = L.tailLen * 1.55;
  for (let i = 0; i < 6; i++) {
    const k = i / 5, sx = -18 - k * 4, sy = -54 + k * 4;
    const tipX = sx - len * (.65 + k * .25), tipY = -50 + k * 10;
    const topY = sy - len * (.9 - k * .35);
    c.beginPath(); c.moveTo(sx, sy);
    c.bezierCurveTo(sx - 4, topY, tipX + 6, topY - 4, tipX, tipY);
    c.bezierCurveTo(tipX + 8, topY + 6, sx + 2, topY + 10, sx + 4, sy + 3);
    c.closePath();
    c.fillStyle = lg(c, sx, topY, tipX, tipY, [[0, L.tail], [.5, L.sheen || shade(L.tail, .15)], [1, L.tail]]); c.fill();
  }
  if (L.pattern === 'barred') { c.save(); c.globalAlpha = .35; c.strokeStyle = L.bar; c.lineWidth = 1.4; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(-30 - i * 3, -64 + i * 3, 9, Math.PI * .9, Math.PI * 1.4); c.stroke(); } c.restore(); }
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255);
  return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
}
function hackleStrands(c, L, R, rnd, from, to) {
  const n = R ? 34 : 24;
  for (let i = 0; i < n; i++) {
    const k = rnd();
    const x0 = lerp(from[0], from[1], k), y0 = lerp(-77, -68, k) + rnd() * 3;
    const len = (R ? 30 : 20) + rnd() * 8;
    const x1 = x0 - 5 - rnd() * (R ? 12 : 7), y1 = y0 + len * (to || 1);
    c.beginPath(); c.moveTo(x0 - 1.8, y0); c.quadraticCurveTo(x0 - 2.5, (y0 + y1) / 2, x1, y1); c.quadraticCurveTo(x0 + 1.4, (y0 + y1) / 2, x0 + 1.8, y0); c.closePath();
    c.fillStyle = rnd() < .5 ? L.hackle : shade(L.hackle, rnd() < .5 ? .12 : -.08); c.fill();
    if (L.stripe) { c.strokeStyle = L.stripe; c.lineWidth = .9; c.globalAlpha = .9; c.beginPath(); c.moveTo(x0, y0 + 4); c.quadraticCurveTo(x0 - 1, (y0 + y1) / 2, x1 + 1, y1 - 2); c.stroke(); c.globalAlpha = 1; }
    else { c.strokeStyle = L.hackleDark; c.lineWidth = .4; c.globalAlpha = .5; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0 - 1, (y0 + y1) / 2, x1 + .6, y1 - .5); c.stroke(); c.globalAlpha = 1; }
  }
}
function drawComb(c, L, R, cx, top) {
  c.fillStyle = lg(c, 0, top - 14, 0, top + 2, [[0, shade(L.comb, .15)], [1, shade(L.comb, -.15)]]);
  if (L.combType === 'single') {
    const pts = R ? 6 : 5, h = R ? 12 : 6, w = R ? 18 : 14, x0 = cx - w / 2;
    c.beginPath(); c.moveTo(x0, top + 2);
    for (let i = 0; i < pts; i++) { const x = x0 + (i + .5) * w / pts; c.lineTo(x - w / pts * .35, top - h * (.55 + .45 * Math.sin(Math.PI * (i + .5) / pts))); c.lineTo(x, top - h * (.75 + .25 * Math.sin(Math.PI * (i + .5) / pts)) - 1); c.lineTo(x + w / pts * .35, top - h * .5); }
    c.lineTo(x0 + w + (R ? 6 : 3), top - (R ? 4 : 2)); c.lineTo(x0 + w, top + 2); c.closePath(); c.fill();
  } else if (L.combType === 'pea') {
    for (let i = 0; i < 3; i++) { ell(c, cx - 4 + i * 4, top - 1.5 - Math.sin(i / 2 * Math.PI) * (R ? 2.5 : 1.5), 2.6, R ? 3 : 2.2); c.fill(); }
  }
}
function drawHead(c, L, R, hx, hy, rnd) {
  // head feathers
  ell(c, hx, hy, 7.6, 7.2); c.fillStyle = rg(c, hx - 2, hy - 3, 1, 9, [[0, shade(L.hackle, .2)], [1, L.hackle]]); c.fill();
  if (L.crest) { c.fillStyle = L.hackle; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(hx - 4 + i, hy - 6); c.quadraticCurveTo(hx - 10 - i, hy - 10 - rnd() * 3, hx - 16 - rnd() * 4, hy - 5 + i * .6); c.quadraticCurveTo(hx - 8, hy - 5, hx - 2 + i, hy - 4); c.fill(); } }
  drawComb(c, L, R, hx + 1, hy - 6.5);
  // face skin
  ell(c, hx + 2.5, hy + .5, 5, 4.2); c.fillStyle = L.face; c.fill();
  // wattles
  c.fillStyle = lg(c, 0, hy + 3, 0, hy + 13, [[0, L.comb], [1, shade(L.comb, -.25)]]);
  const wl = R ? 8 : (L.combType === 'pea' ? 3 : 4.5);
  c.beginPath(); c.moveTo(hx + 4, hy + 4); c.quadraticCurveTo(hx + 1.5, hy + 5 + wl, hx + 5, hy + 5 + wl); c.quadraticCurveTo(hx + 8.5, hy + 4 + wl * .8, hx + 7, hy + 3.5); c.closePath(); c.fill();
  // earlobe
  ell(c, hx - 3, hy + 2.5, 2, 2.6); c.fillStyle = L.lobe; c.fill();
  // beak
  c.fillStyle = lg(c, hx + 6, hy - 2, hx + 13, hy + 2, [[0, L.beak], [1, shade(L.beak, -.3)]]);
  c.beginPath(); c.moveTo(hx + 6, hy - 2.2); c.quadraticCurveTo(hx + 12, hy - 2.4, hx + 13.5, hy + 1.6); c.lineTo(hx + 6.5, hy + 1.6); c.closePath(); c.fill();
  c.fillStyle = shade(L.beak, -.2); c.beginPath(); c.moveTo(hx + 6.5, hy + 1.8); c.lineTo(hx + 11.5, hy + 2.2); c.lineTo(hx + 6.5, hy + 3.4); c.closePath(); c.fill();
  // eye
  ell(c, hx + 2.6, hy - .9, 2.2, 2.2); c.fillStyle = L.eye; c.fill();
  ell(c, hx + 2.9, hy - .9, 1.05, 1.1); c.fillStyle = '#0d0907'; c.fill();
  ell(c, hx + 2.3, hy - 1.7, .55, .55); c.fillStyle = 'rgba(255,255,255,.95)'; c.fill();
}

function paintStd(c, b, L, rnd) {
  const R = b.sex === 'r';
  if (R) drawSickles(c, L, rnd); else drawHenTail(c, L);
  // body
  const body = new Path2D();
  if (R) { body.moveTo(22, -50); body.bezierCurveTo(33, -38, 28, -17, 8, -14); body.bezierCurveTo(-8, -12, -22, -18, -26, -30); body.bezierCurveTo(-30, -40, -26, -52, -16, -56); body.bezierCurveTo(-4, -60, 8, -60, 14, -62); body.bezierCurveTo(20, -58, 21, -54, 22, -50); }
  else { body.moveTo(22, -46); body.bezierCurveTo(34, -34, 28, -14, 8, -12); body.bezierCurveTo(-10, -10, -26, -16, -31, -28); body.bezierCurveTo(-35, -38, -30, -50, -20, -54); body.bezierCurveTo(-6, -58, 8, -56, 16, -58); body.bezierCurveTo(20, -54, 21, -50, 22, -46); }
  body.closePath();
  if (L.fluffy) body.ellipse(-16, -22, 15, 11, -.3, 0, Math.PI * 2);
  c.fillStyle = lg(c, 0, -62, 0, -10, [[0, L.light], [.45, L.base], [1, L.dark]]); c.fill(body);
  if (L.breast) { c.save(); c.clip(body); ell(c, 24, -34, 15, 17); c.fillStyle = rg(c, 24, -34, 2, 17, [[0, L.breast], [.7, L.breast], [1, 'rgba(0,0,0,0)']]); c.fill(); c.restore(); }
  if (L.pattern === 'scallop') texScallop(c, body, L.texCol, .22, 5.2, rnd);
  if (L.pattern === 'barred') texBars(c, body, L.bar, .32, 3.6);
  // soft shading
  c.save(); c.clip(body); ell(c, 14, -42, 18, 14); c.fillStyle = rg(c, 14, -44, 1, 18, [[0, 'rgba(255,255,255,.22)'], [1, 'rgba(255,255,255,0)']]); c.fill();
  ell(c, -4, -10, 30, 9); c.fillStyle = 'rgba(0,0,0,.14)'; c.fill(); c.restore();
  // wing
  const wing = new Path2D();
  wing.moveTo(14, -46); wing.bezierCurveTo(4, -52, -18, -50, -27, -36); wing.bezierCurveTo(-20, -25, 0, -23, 12, -30); wing.bezierCurveTo(18, -34, 18, -41, 14, -46); wing.closePath();
  c.fillStyle = lg(c, 0, -52, 0, -24, [[0, shade(L.base, .08)], [1, L.dark]]); c.fill(wing);
  if (L.wingTip) { c.save(); c.clip(wing); c.fillStyle = L.wingTip; c.beginPath(); c.moveTo(-6, -24); c.quadraticCurveTo(-14, -40, -30, -38); c.lineTo(-30, -20); c.closePath(); c.globalAlpha = .9; c.fill(); c.restore(); }
  if (L.pattern === 'barred') texBars(c, wing, L.bar, .38, 3.4);
  c.save(); c.clip(wing); c.strokeStyle = shade(L.dark, -.3); c.globalAlpha = .45; c.lineWidth = .8;
  for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(6 - i * 2, -34 + i * .6); c.quadraticCurveTo(-8 - i * 2, -32 + i, -24 - i, -34 + i * 1.6); c.stroke(); }
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(4 - i * 7, -44, 6, .2 * Math.PI, .9 * Math.PI); c.stroke(); }
  c.restore();
  c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = .8; c.stroke(wing);
  // neck + hackle
  const neck = new Path2D(); neck.moveTo(11, -57); neck.bezierCurveTo(13, -68, 18, -78, 25, -80); neck.bezierCurveTo(31, -80, 34, -73, 32, -64); neck.bezierCurveTo(31, -55, 28, -49, 24, -44); neck.bezierCurveTo(20, -49, 15, -54, 11, -57); neck.closePath();
  c.fillStyle = L.hackle; c.fill(neck);
  hackleStrands(c, L, R, rnd, [16, 31], 1);
  if (R) { // saddle feathers at the back
    for (let i = 0; i < 16; i++) { const x0 = -2 - rnd() * 14, y0 = -58 + rnd() * 4, x1 = x0 - 8 - rnd() * 8, y1 = y0 + 14 + rnd() * 8;
      c.beginPath(); c.moveTo(x0 - 1.6, y0); c.quadraticCurveTo(x0 - 3, (y0 + y1) / 2, x1, y1); c.quadraticCurveTo(x0 + 1, (y0 + y1) / 2, x0 + 1.6, y0); c.closePath(); c.fillStyle = rnd() < .5 ? L.hackle : shade(L.hackle, -.1); c.fill();
      if (L.stripe) { c.strokeStyle = L.stripe; c.lineWidth = .7; c.beginPath(); c.moveTo(x0, y0 + 3); c.lineTo(x1 + 1, y1 - 2); c.stroke(); } }
  }
  drawHead(c, L, R, 26, -74, rnd);
  if (L.feathered) { // fluffy thighs
    ell(c, 2, -16, 12, 7); c.fillStyle = lg(c, 0, -22, 0, -9, [[0, L.base], [1, L.dark]]); c.fill();
  }
}

function fluffBlob(c, cx, cy, rx, ry, P, rnd, n, overlay) {
  const p = new Path2D();
  for (let a = 0; a <= Math.PI * 2 + .01; a += .14) { const j = 1 + (rnd() - .5) * .14; const x = cx + Math.cos(a) * rx * j, y = cy + Math.sin(a) * ry * j; a === 0 ? p.moveTo(x, y) : p.lineTo(x, y); }
  p.closePath();
  c.fillStyle = rg(c, cx + rx * .25, cy - ry * .55, 1, Math.max(rx, ry) * 1.35, [[0, P.light], [.5, P.base], [1, P.dark]]); c.fill(p);
  if (overlay) overlay(p);
  // soft strands
  c.save(); c.clip(p); c.lineWidth = .75; c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd());
    const x = cx + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * rr;
    const dir = a * .4 + Math.PI * .5 + (rnd() - .5) * .9, l = 3 + rnd() * 4;
    c.strokeStyle = rnd() < .55 ? P.light : P.dark; c.globalAlpha = rnd() < .55 ? .45 : .3;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(dir) * l * .6 + 1, y + Math.sin(dir) * l * .6, x + Math.cos(dir) * l, y + Math.sin(dir) * l); c.stroke();
  }
  c.restore();
  // wispy edge
  c.lineWidth = .7; c.lineCap = 'round';
  for (let a = 0; a < Math.PI * 2; a += .09) {
    const x = cx + Math.cos(a) * rx * .96, y = cy + Math.sin(a) * ry * .96, l = 2 + rnd() * 3.2, d = a + (rnd() - .5) * .8;
    c.strokeStyle = rnd() < .5 ? P.light : P.base; c.globalAlpha = .7;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(d) * l, y + Math.sin(d) * l); c.stroke();
  }
  c.globalAlpha = 1;
  return p;
}
function silkieOverlay(c, L, rnd) {
  return p => {
    if (L.pattern === 'spots') texSpots(c, p, L.spot, 16, 2.5, 6, rnd, [-34, -60, 36, -4]);
    if (L.pattern === 'barred') texBars(c, p, L.bar, .38, 4);
    if (L.pattern === 'pencil') texScallop(c, p, L.pencil, .45, 4.4, rnd);
    if (L.sheen) { c.save(); c.clip(p); ell(c, 6, -42, 22, 9, -.2); c.fillStyle = L.sheen; c.globalAlpha = .25; c.fill(); c.restore(); }
  };
}
function paintSilkie(c, b, L, rnd) {
  const R = b.sex === 'r', ov = silkieOverlay(c, L, rnd);
  const capeP = L.cape ? { base: L.cape, light: shade(L.cape, .25), dark: L.capeDark || shade(L.cape, -.25) } : L;
  // tail puff
  fluffBlob(c, -25, R ? -44 : -40, R ? 12 : 11, R ? 15 : 12, R && L.cape ? { base: L.base, light: L.light, dark: L.dark } : L, rnd, 45, ov);
  // body
  fluffBlob(c, 0, -27, 29, 21, L, rnd, 190, ov);
  if (L.cape) fluffBlob(c, 4, -38, 18, 10, capeP, rnd, 60);
  // wing fluff
  fluffBlob(c, -6, -28, 15, 10, { base: shade(L.base, -.06), light: L.base, dark: L.dark }, rnd, 50, ov);
  // face
  ell(c, 29, -45, 6.5, 6.2); c.fillStyle = L.face; c.fill();
  ell(c, 24, -42, 2.8, 2.4); c.fillStyle = L.lobe; c.fill();
  c.fillStyle = '#7b8196'; c.beginPath(); c.moveTo(33, -47.5); c.quadraticCurveTo(39, -47, 40, -43); c.lineTo(33, -42.5); c.closePath(); c.fill();
  ell(c, 31.5, -46.6, 1.8, 1.8); c.fillStyle = '#6d7aa0'; c.fill(); ell(c, 31.6, -46.6, 1.2, 1.2); c.fillStyle = L.eye; c.fill(); ell(c, 31.1, -47.2, .5, .5); c.fillStyle = '#fff'; c.fill();
  // beard / muffs
  fluffBlob(c, 28, -37, 8.5, 6, L.cape && !R ? L : (L.cape ? capeP : L), rnd, 40, ov);
  // walnut comb
  c.fillStyle = L.comb; ell(c, 31, -53, R ? 3.6 : 2.6, R ? 2.8 : 2); c.fill();
  // crest
  fluffBlob(c, R ? 20 : 21, R ? -58 : -58, R ? 11 : 12, R ? 8.5 : 10, L.cape ? capeP : L, rnd, 90, L.cape ? null : ov);
  if (R) { c.lineWidth = 1.2; c.lineCap = 'round'; for (let i = 0; i < 12; i++) { const y = -60 + rnd() * 8; c.strokeStyle = L.cape ? capeP.base : L.light; c.globalAlpha = .8; c.beginPath(); c.moveTo(12, y); c.quadraticCurveTo(4, y - 4 + rnd() * 3, -2 - rnd() * 6, y + 2 + rnd() * 6); c.stroke(); } c.globalAlpha = 1; }
}

function chickLook(b) {
  const m = { rir: ['#c8964f', '#e2b977', '#8b5a2c'], orp: ['#f0d06a', '#fbe8a0', '#c9a43f'], bra: ['#efe8c8', '#fffbe8', '#b9b29a'] };
  if (b.breed === 'leg') return b.sex === 'h' ? { base: '#b98b5d', light: '#dcb98e', dark: '#7c5530', stripes: '#4a2c14' } : { base: '#e1c9a0', light: '#f4e6c8', dark: '#b89b6c', stripes: '#9a7a4e', spot: true };
  if (b.breed === 'sil') {
    const c = { white: ['#f6f1e0', '#fffef6', '#d6cfb6'], black: ['#2b2b31', '#4c4c56', '#141417'], blue: ['#7a8697', '#a2adbb', '#566273'], splash: ['#cfd5dc', '#eef1f4', '#a9b1bb'], buff: ['#ebc574', '#fbe3a8', '#c49a46'], partridge: ['#9c7448', '#c79f6e', '#6a4a26'], grey: ['#b9bcc0', '#dadcdf', '#8d9095'], lavender: ['#cfc8d4', '#e9e4ec', '#a9a1af'], cuckoo: ['#5b5f66', '#858991', '#3b3e43'], red: ['#b8693e', '#d98d5c', '#86431f'], paint: ['#f0eee8', '#ffffff', '#cbc6bb'] }[b.colour] || ['#f6f1e0', '#fff', '#ddd'];
    return { base: c[0], light: c[1], dark: c[2], stripes: b.colour === 'partridge' ? '#4b2f14' : null, spots: b.colour === 'paint' ? '#1f1f24' : b.colour === 'splash' ? '#5d6b80' : null, silkie: true };
  }
  const v = m[b.breed]; return { base: v[0], light: v[1], dark: v[2], stripes: null };
}
function paintChick(c, b, rnd) {
  const C = chickLook(b);
  const body = fluffBlob(c, 0, -10, 10.5, 8.6, C, rnd, 50);
  if (C.stripes) { c.save(); c.clip(body); c.strokeStyle = C.stripes; c.lineWidth = 1.6; c.globalAlpha = .7; for (const o of [-3, 0, 3]) { c.beginPath(); c.moveTo(-10, -12 + o * .5); c.quadraticCurveTo(0, -20 + o, 10, -14 + o * .6); c.stroke(); } c.restore(); }
  if (C.spots) texSpots(c, body, C.spots, 6, 1.4, 3, rnd, [-9, -18, 9, -3]);
  const head = fluffBlob(c, 8, -18, 6.6, 6.2, C, rnd, 22);
  if (C.stripes) { c.save(); c.clip(head); c.strokeStyle = C.stripes; c.lineWidth = 1.5; c.globalAlpha = .75; c.beginPath(); c.moveTo(3, -23); c.quadraticCurveTo(8, -26, 13, -22); c.stroke(); c.restore(); }
  if (C.spot) { ell(c, 8, -22, 2, 1.4); c.fillStyle = C.stripes; c.globalAlpha = .6; c.fill(); c.globalAlpha = 1; }
  if (C.silkie) fluffBlob(c, 7, -23.5, 4, 3, C, rnd, 10);
  c.fillStyle = C.silkie ? '#5d6276' : '#e3a83a'; c.beginPath(); c.moveTo(13.5, -19.5); c.lineTo(17.5, -18); c.lineTo(13.5, -16.5); c.closePath(); c.fill();
  ell(c, 10.5, -19.5, 1.25, 1.3); c.fillStyle = '#120c08'; c.fill(); ell(c, 10.2, -20, .4, .4); c.fillStyle = '#fff'; c.fill();
  ell(c, -2, -10, 5, 3.4, -.3); c.fillStyle = C.dark; c.globalAlpha = .35; c.fill(); c.globalAlpha = 1;
}

/* sprites are drawn once per bird and reused every frame */
const spriteCache = new Map();
function getSprite(b, chick, pr) {
  const key = b.id + '|' + (chick ? 'c' : 'a') + '|' + pr + '|' + (b.colour || '') + '|' + b.seed;
  let s = spriteCache.get(key); if (s) return s;
  const box = chick ? { x0: -16, y0: -34, w: 40, h: 38 } : b.breed === 'sil' ? { x0: -46, y0: -76, w: 92, h: 80 } : { x0: -66, y0: -108, w: 140, h: 116 };
  const cv = document.createElement('canvas'); cv.width = Math.ceil(box.w * pr); cv.height = Math.ceil(box.h * pr);
  const c = cv.getContext('2d'); c.scale(pr, pr); c.translate(-box.x0, -box.y0); c.lineJoin = 'round';
  const rnd = rngFrom(b.seed);
  if (chick) paintChick(c, b, rnd); else if (b.breed === 'sil') paintSilkie(c, b, look(b), rnd); else paintStd(c, b, look(b), rnd);
  s = { cv, box };
  if (spriteCache.size > 600) spriteCache.clear();
  spriteCache.set(key, s); return s;
}
function drawLegs(c, b, phase, moving, chick) {
  const L = chick ? { legs: b.breed === 'sil' ? '#4a5064' : '#e6b84a' } : look(b);
  const sil = b.breed === 'sil';
  const hipY = chick ? -5 : sil ? -12 : -16, hips = chick ? [2, -2] : sil ? [5, -3] : [6, -2];
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (let i = 0; i < 2; i++) {
    const s = moving ? Math.sin(phase + i * Math.PI) : 0;
    const sw = s * (chick ? 2.5 : 5), lift = moving ? Math.max(0, s) * (chick ? 1 : 2.4) : 0;
    const hx = hips[i], fx = hx + sw, fy = -lift;
    c.strokeStyle = shade(L.legs, i ? -.18 : 0); c.lineWidth = chick ? 1.3 : sil ? 2.8 : 2.5;
    c.beginPath(); c.moveTo(hx, hipY); c.lineTo(hx + sw * .35 - (chick ? 0 : 1), hipY * .45); c.lineTo(fx, fy); c.stroke();
    c.lineWidth = chick ? .9 : 1.5; c.beginPath();
    c.moveTo(fx, fy); c.lineTo(fx + (chick ? 3 : 6.5), fy + .3);
    c.moveTo(fx, fy); c.lineTo(fx + (chick ? 2.4 : 5), fy + 1.8);
    c.moveTo(fx, fy); c.lineTo(fx + (chick ? 2.2 : 4.4), fy - 1.2);
    c.moveTo(fx, fy); c.lineTo(fx - (chick ? 1.6 : 3.2), fy + .6);
    if (sil && !chick) { c.moveTo(fx - .5, fy - .5); c.lineTo(fx - 3.6, fy - 1.2); }
    c.stroke();
    if (L.feathered && !chick) { c.fillStyle = L.legFluff || '#f4f2ec'; c.globalAlpha = .95; for (let k = 0; k < 4; k++) { ell(c, lerp(hx, fx, k / 3) - 2, lerp(hipY * .45, fy, k / 3) - 1, 3.2 - k * .4, 2.2); c.fill(); } ell(c, fx + 3, fy - .8, 3.2, 1.4); c.fill(); c.globalAlpha = 1; }
  }
}

/* =====================================================================
   8. ART: COOPS, PLOTS AND GRASS
   ===================================================================== */
const PW = 340, PH = 290, GAP = 14, MARGIN = 14;
const YARD = { x0: 24, x1: 316, y0: 128, y1: 268 };
const plotCache = new Map();
let grassPattern = null;

function makeGrass() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 200; const c = cv.getContext('2d');
  c.fillStyle = '#6a9645'; c.fillRect(0, 0, 200, 200);
  const rnd = rngFrom(7);
  for (let i = 0; i < 40; i++) { ell(c, rnd() * 200, rnd() * 200, 20 + rnd() * 30, 12 + rnd() * 20); c.fillStyle = rnd() < .5 ? 'rgba(120,165,80,.25)' : 'rgba(70,110,45,.18)'; c.fill(); }
  const cols = ['#5c8a3a', '#7aa852', '#87b65d', '#4d7a31', '#94c066'];
  c.lineCap = 'round';
  for (let i = 0; i < 1600; i++) { const x = rnd() * 200, y = rnd() * 200, l = 2 + rnd() * 4, a = -Math.PI / 2 + (rnd() - .5) * .9; c.strokeStyle = cols[Math.floor(rnd() * cols.length)]; c.globalAlpha = .7; c.lineWidth = .9; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  for (let i = 0; i < 18; i++) { const x = rnd() * 200, y = rnd() * 200; c.globalAlpha = .8; c.fillStyle = '#f5f2e4'; for (let k = 0; k < 4; k++) { ell(c, x + Math.cos(k * 1.57) * 1.4, y + Math.sin(k * 1.57) * 1.4, 1.1, 1.1); c.fill(); } c.fillStyle = '#e9c43a'; ell(c, x, y, .8, .8); c.fill(); }
  c.globalAlpha = 1;
  return cv;
}
function shadowEll(c, x, y, rx, ry, a = .28) { ell(c, x, y, rx, ry); c.fillStyle = rg(c, x, y, 1, rx, [[0, `rgba(20,30,10,${a})`], [1, 'rgba(20,30,10,0)']]); c.save(); c.scale(1, 1); c.fill(); c.restore(); }
function yardGround(c, rnd, pasture) {
  c.save(); c.beginPath(); c.rect(8, 8, PW - 16, PH - 16); c.clip();
  c.fillStyle = pasture ? 'rgba(110,160,70,.25)' : 'rgba(150,170,90,.22)'; c.fillRect(8, 8, PW - 16, PH - 16);
  if (!pasture) {
    for (let i = 0; i < 9; i++) { const x = 40 + rnd() * 260, y = 120 + rnd() * 140; ell(c, x, y, 26 + rnd() * 34, 12 + rnd() * 14); c.fillStyle = rg(c, x, y, 1, 50, [[0, 'rgba(150,112,70,.55)'], [1, 'rgba(150,112,70,0)']]); c.fill(); }
    c.lineCap = 'round';
    for (let i = 0; i < 70; i++) { const x = 20 + rnd() * 300, y = 115 + rnd() * 160, a = rnd() * Math.PI; c.strokeStyle = rnd() < .5 ? '#e3c26c' : '#c9a24c'; c.globalAlpha = .75; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 2); c.stroke(); }
    for (let i = 0; i < 25; i++) { ell(c, 20 + rnd() * 300, 120 + rnd() * 150, 1.3, 1); c.fillStyle = rnd() < .5 ? '#b5aa98' : '#8f877a'; c.globalAlpha = .8; c.fill(); }
  } else {
    for (let i = 0; i < 60; i++) { const x = 20 + rnd() * 300, y = 20 + rnd() * 255; const col = ['#f3efe2', '#f1cf3e', '#b593d6', '#e88aa0'][Math.floor(rnd() * 4)]; c.globalAlpha = .9; c.fillStyle = '#4f7d33'; c.fillRect(x - .4, y, .8, 4); c.fillStyle = col; ell(c, x, y, 1.7, 1.7); c.fill(); }
  }
  c.globalAlpha = 1; c.restore();
}
function fence(c) {
  const post = (x, y, h = 20) => { c.fillStyle = lg(c, x - 3, 0, x + 3, 0, [[0, '#8a6a46'], [1, '#5e4429']]); c.fillRect(x - 2.5, y - h, 5, h); c.fillStyle = '#a7865d'; c.fillRect(x - 2.5, y - h, 5, 2); };
  const rail = (x0, y0, x1, y1) => { c.strokeStyle = '#7e5f3d'; c.lineWidth = 3; c.lineCap = 'butt'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = 'rgba(255,230,190,.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y0 - 1); c.lineTo(x1, y1 - 1); c.stroke(); };
  c.globalAlpha = .9;
  for (const y of [14, 22]) { rail(10, y, PW - 10, y); }
  for (let x = 10; x <= PW - 10; x += 33) post(x, 26);
  for (const x of [10, PW - 10]) { rail(x, 26, x, PH - 12); rail(x + .01, 30, x, PH - 6); }
  for (let y = 60; y < PH - 10; y += 40) { post(10, y, 14); post(PW - 10, y, 14); }
  for (const y of [PH - 18, PH - 10]) rail(10, y, PW - 10, y);
  for (let x = 10; x <= PW - 10; x += 33) post(x, PH - 4, 18);
  c.globalAlpha = 1;
}
function sign(c, x, y, text, sub) {
  c.fillStyle = '#5a4128'; c.fillRect(x - 32, y + 10, 4, 18); c.fillRect(x + 28, y + 10, 4, 18);
  const w = 104, h = sub ? 36 : 26;
  c.fillStyle = lg(c, 0, y - h / 2, 0, y + h / 2, [[0, '#c79c62'], [1, '#9b7344']]);
  rrect(c, x - w / 2, y - h / 2, w, h, 4); c.fill(); c.strokeStyle = '#6b4c2a'; c.lineWidth = 1.5; c.stroke();
  c.strokeStyle = 'rgba(80,50,20,.25)'; c.lineWidth = .8; for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(x - w / 2 + 3, y - h / 2 + i * h / 3); c.lineTo(x + w / 2 - 3, y - h / 2 + i * h / 3); c.stroke(); }
  c.fillStyle = '#2e1f10'; c.textAlign = 'center'; c.textBaseline = 'middle';
  let fs = 12.5; c.font = `900 ${fs}px Coustard, Rockwell, Georgia, serif`;
  while (c.measureText(text).width > w - 10 && fs > 8) { fs -= .5; c.font = `900 ${fs}px Coustard, Rockwell, Georgia, serif`; }
  c.fillText(text, x, sub ? y - 6 : y + 1);
  if (sub) { c.font = `700 11px 'Atkinson Hyperlegible', system-ui, sans-serif`; c.fillText(sub, x, y + 9); }
}
function rrect(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
function house(c, o) {
  const mid = (o.x0 + o.x1) / 2, D = o.D || 18, dd = D * .35, e = o.eave || 9, eh = 6;
  const side = new Path2D(); side.moveTo(o.x1, o.top); side.lineTo(o.x1 + D, o.top - dd); side.lineTo(o.x1 + D, o.bot - dd); side.lineTo(o.x1, o.bot); side.closePath();
  c.fillStyle = o.wallSide; c.fill(side); if (o.wallTex) { c.save(); c.clip(side); o.wallTex(c, true); c.fillStyle = 'rgba(0,0,0,.22)'; c.fill(side); c.restore(); }
  const front = new Path2D(); front.moveTo(o.x0, o.bot); front.lineTo(o.x0, o.top); front.lineTo(mid, o.peak); front.lineTo(o.x1, o.top); front.lineTo(o.x1, o.bot); front.closePath();
  c.fillStyle = o.wall; c.fill(front); if (o.wallTex) { c.save(); c.clip(front); o.wallTex(c, false); c.restore(); }
  const rs = new Path2D(); rs.moveTo(mid, o.peak - 2); rs.lineTo(mid + D, o.peak - 2 - dd); rs.lineTo(o.x1 + e + D, o.top + eh - dd); rs.lineTo(o.x1 + e, o.top + eh); rs.closePath();
  c.fillStyle = o.roofSide; c.fill(rs);
  if (o.rows) { c.save(); c.clip(rs); c.strokeStyle = o.rowCol; c.lineWidth = o.rowW || 1; for (let k = 0; k <= 1.001; k += 1 / o.rows) { const px = mid + (o.x1 + e - mid) * k, py = (o.peak - 2) + (o.top + eh - o.peak + 2) * k; c.beginPath(); c.moveTo(px, py); c.lineTo(px + D, py - dd); c.stroke(); } c.restore(); }
  if (o.roofTex) { c.save(); c.clip(rs); o.roofTex(c, { mid, D, dd, e, eh }); c.restore(); }
  c.save(); c.clip(front); c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 10; c.beginPath(); c.moveTo(o.x0 - e, o.top + eh + 5); c.lineTo(mid, o.peak + 5); c.lineTo(o.x1 + e, o.top + eh + 5); c.stroke(); c.restore();
  c.lineJoin = o.round ? 'round' : 'miter'; c.lineCap = o.round ? 'round' : 'butt';
  c.strokeStyle = o.roof; c.lineWidth = o.thick || 7; c.beginPath(); c.moveTo(o.x0 - e, o.top + eh); c.lineTo(mid, o.peak - 2); c.lineTo(o.x1 + e, o.top + eh); c.stroke();
  if (o.barge) { c.strokeStyle = o.barge; c.lineWidth = 2; c.beginPath(); c.moveTo(o.x0 - e, o.top + eh + (o.thick || 7) / 2); c.lineTo(mid, o.peak - 2 + (o.thick || 7) / 2); c.lineTo(o.x1 + e, o.top + eh + (o.thick || 7) / 2); c.stroke(); }
  return { front, side, mid };
}
function stilts(c, xs, y0, y1, col) { for (const x of xs) { c.fillStyle = lg(c, x, 0, x + 5, 0, [[0, shade(col, .1)], [1, shade(col, -.2)]]); c.fillRect(x, y0, 5, y1 - y0); } }
function ramp(c, x0, y0, x1, y1) {
  c.strokeStyle = '#8b6a43'; c.lineWidth = 9; c.lineCap = 'butt'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = '#5e4429'; c.lineWidth = 1.6; for (let k = .15; k < 1; k += .18) { const x = lerp(x0, x1, k), y = lerp(y0, y1, k); c.beginPath(); c.moveTo(x - 3.5, y - 2.5); c.lineTo(x + 3.5, y + 2.5); c.stroke(); }
}
function props(c) {
  // hanging feeder and waterer
  shadowEll(c, 262, 116, 16, 5); shadowEll(c, 300, 118, 14, 5);
  c.fillStyle = lg(c, 252, 0, 272, 0, [[0, '#aeb7bd'], [.5, '#e3e8ea'], [1, '#8d969c']]); rrect(c, 254, 86, 16, 22, 2); c.fill();
  ell(c, 262, 110, 13, 4); c.fillStyle = '#7f888e'; c.fill(); ell(c, 262, 108.5, 11, 3); c.fillStyle = '#c9a85c'; c.fill();
  c.fillStyle = lg(c, 290, 0, 310, 0, [[0, '#d0d5d8'], [.5, '#f4f6f7'], [1, '#a2a9ad']]); c.beginPath(); c.moveTo(291, 112); c.lineTo(293, 92); c.quadraticCurveTo(300, 86, 307, 92); c.lineTo(309, 112); c.closePath(); c.fill();
  ell(c, 300, 113, 13, 4); c.fillStyle = '#9aa3a8'; c.fill(); ell(c, 300, 112, 10, 2.6); c.fillStyle = '#7fb3cf'; c.fill();
}
const COOPS = {
  rir(c) {
    shadowEll(c, 118, 122, 92, 12);
    stilts(c, [58, 74, 150, 164], 102, 122, '#5a3c24');
    const H = house(c, { x0: 52, x1: 170, top: 58, bot: 106, peak: 20, D: 22, wall: lg(c, 0, 20, 0, 106, [[0, '#c84b36'], [1, '#912c20']]), wallSide: '#7a241b',
      wallTex: (c) => { c.strokeStyle = 'rgba(50,10,6,.35)'; c.lineWidth = 1; for (let x = 40; x < 200; x += 7) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 130); c.stroke(); } },
      roof: '#3b3f46', roofSide: lg(c, 110, 10, 200, 70, [[0, '#575d66'], [1, '#2f3338']]), rows: 7, rowCol: 'rgba(0,0,0,.35)', barge: '#f1eadd' });
    c.strokeStyle = '#f1eadd'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(52, 106); c.lineTo(52, 58); c.moveTo(170, 58); c.lineTo(170, 106); c.lineTo(52, 106); c.stroke();
    c.fillStyle = '#2a1712'; c.fillRect(101, 34, 18, 14); c.strokeStyle = '#f1eadd'; c.lineWidth = 2; c.strokeRect(101, 34, 18, 14); c.beginPath(); c.moveTo(110, 34); c.lineTo(110, 48); c.stroke();
    c.fillStyle = '#8a291f'; c.fillRect(97, 70, 26, 36); c.strokeStyle = '#f1eadd'; c.lineWidth = 2.4; c.strokeRect(97, 70, 26, 36); c.beginPath(); c.moveTo(97, 70); c.lineTo(123, 106); c.moveTo(123, 70); c.lineTo(97, 106); c.stroke();
    // nest box on the side
    c.fillStyle = lg(c, 176, 0, 196, 0, [[0, '#9a3226'], [1, '#6e2219']]); c.beginPath(); c.moveTo(174, 74); c.lineTo(194, 67); c.lineTo(194, 88); c.lineTo(174, 95); c.closePath(); c.fill();
    c.fillStyle = '#3b3f46'; c.beginPath(); c.moveTo(172, 72); c.lineTo(196, 63); c.lineTo(197, 67); c.lineTo(173, 76); c.closePath(); c.fill();
    ramp(c, 110, 106, 136, 132);
    // weather vane rooster silhouette
    c.strokeStyle = '#2a2a2a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(110, 18); c.lineTo(110, 4); c.stroke(); c.fillStyle = '#2a2a2a'; c.beginPath(); c.moveTo(104, 4); c.quadraticCurveTo(108, -3, 113, 1); c.lineTo(117, -2); c.lineTo(115, 4); c.closePath(); c.fill();
  },
  orp(c) {
    shadowEll(c, 116, 122, 92, 12);
    const H = house(c, { x0: 54, x1: 166, top: 62, bot: 112, peak: 26, D: 20, eave: 12, thick: 14, round: true,
      wall: lg(c, 0, 26, 0, 112, [[0, '#f3ead3'], [1, '#d9ccab']]), wallSide: '#c9bb97',
      wallTex: (c) => { c.strokeStyle = '#5d3f22'; c.lineWidth = 3; c.beginPath(); c.moveTo(54, 86); c.lineTo(166, 86); c.moveTo(66, 62); c.lineTo(66, 112); c.moveTo(154, 62); c.lineTo(154, 112); c.moveTo(66, 86); c.lineTo(84, 62); c.moveTo(154, 86); c.lineTo(136, 62); c.stroke(); },
      roof: '#c99a3e', roofSide: lg(c, 110, 20, 190, 70, [[0, '#d9ad55'], [1, '#a77a2c']]),
      roofTex: (c, g) => { const rnd = rngFrom(11); c.lineWidth = .9; for (let i = 0; i < 160; i++) { const k = rnd(), x = lerp(110, 178, k) + rnd() * 20, y = lerp(24, 68, k) - rnd() * 6; c.strokeStyle = rnd() < .5 ? '#f0cf7d' : '#8b6322'; c.globalAlpha = .6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3, y + 8); c.stroke(); } c.globalAlpha = 1; } });
    // thatch front edge texture
    c.strokeStyle = '#8f6825'; c.lineWidth = 1; for (let k = 0; k <= 1; k += .04) { const x = lerp(42, 110, k), y = lerp(68, 24, k); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 1, y + 7); c.stroke(); const x2 = lerp(110, 178, k), y2 = lerp(24, 68, k); c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - 1, y2 + 7); c.stroke(); }
    // round-top green door
    c.fillStyle = '#3f6b45'; c.beginPath(); c.moveTo(98, 112); c.lineTo(98, 90); c.arc(110, 90, 12, Math.PI, 0); c.lineTo(122, 112); c.closePath(); c.fill(); c.strokeStyle = '#2c4a30'; c.lineWidth = 1.5; c.stroke();
    ell(c, 118, 100, 1.4, 1.4); c.fillStyle = '#d9b64a'; c.fill();
    // window with flower box
    c.fillStyle = '#3a4f5c'; c.fillRect(132, 92, 14, 12); c.strokeStyle = '#f7f2e3'; c.lineWidth = 1.8; c.strokeRect(132, 92, 14, 12); c.beginPath(); c.moveTo(139, 92); c.lineTo(139, 104); c.moveTo(132, 98); c.lineTo(146, 98); c.stroke();
    c.fillStyle = '#6b4a2a'; c.fillRect(130, 104, 18, 5); for (let i = 0; i < 6; i++) { ell(c, 132 + i * 3, 103, 1.8, 1.8); c.fillStyle = ['#d9445a', '#f2a7c3', '#f4d03f'][i % 3]; c.fill(); }
    ramp(c, 110, 112, 132, 134);
  },
  leg(c) {
    shadowEll(c, 116, 122, 90, 12);
    const H = house(c, { x0: 54, x1: 166, top: 60, bot: 112, peak: 24, D: 20,
      wall: '#d6bb84', wallSide: '#b99c64',
      wallTex: (c, side) => { const rnd = rngFrom(side ? 5 : 3); for (let y = 0; y < 120; y += 7) { let x = 40 + (y / 7 % 2) * 6; while (x < 200) { const w = 10 + rnd() * 9; c.fillStyle = ['#dcc28c', '#cfb175', '#e3cd9c', '#c6a76a'][Math.floor(rnd() * 4)]; rrect(c, x + .8, y + .8, w - 1.6, 5.4, 1.5); c.fill(); x += w; } } },
      roof: '#4c5866', roofSide: lg(c, 110, 18, 190, 70, [[0, '#687584'], [1, '#3e4855']]), rows: 9, rowCol: 'rgba(20,25,35,.45)', thick: 8 });
    c.fillStyle = '#4e7fa6'; c.beginPath(); c.moveTo(99, 112); c.lineTo(99, 90); c.arc(110, 90, 11, Math.PI, 0); c.lineTo(121, 112); c.closePath(); c.fill(); c.strokeStyle = '#335a78'; c.lineWidth = 1.5; c.stroke();
    for (const y of [94, 103]) { c.beginPath(); c.moveTo(100, y); c.lineTo(120, y); c.stroke(); }
    ell(c, 110, 44, 7, 7); c.fillStyle = '#2f3b44'; c.fill(); c.strokeStyle = '#efe2c2'; c.lineWidth = 2; c.stroke();
    // chimney
    c.fillStyle = '#c9aa70'; c.fillRect(142, 22, 10, 22); c.fillStyle = '#a98a54'; c.fillRect(142, 22, 10, 3);
    // a basket of blue eggs by the door
    ell(c, 140, 118, 10, 4); c.fillStyle = '#9b7343'; c.fill(); for (let i = 0; i < 4; i++) { ell(c, 134 + i * 4, 115, 2.4, 3); c.fillStyle = '#a7cfc8'; c.fill(); }
    ramp(c, 110, 112, 88, 134);
  },
  sil(c) {
    shadowEll(c, 114, 124, 94, 12);
    // platform
    c.fillStyle = lg(c, 0, 106, 0, 118, [[0, '#d8d2c4'], [1, '#a9a293']]); c.fillRect(46, 106, 132, 10);
    // walls
    c.fillStyle = lg(c, 0, 60, 0, 106, [[0, '#fbf8f0'], [1, '#e6dfcf']]); c.fillRect(56, 60, 112, 46);
    c.fillStyle = '#e1d9c6'; c.beginPath(); c.moveTo(168, 60); c.lineTo(186, 54); c.lineTo(186, 100); c.lineTo(168, 106); c.closePath(); c.fill();
    for (const x of [56, 162]) { c.fillStyle = lg(c, x, 0, x + 6, 0, [[0, '#c23a2e'], [1, '#8d241c']]); c.fillRect(x, 60, 6, 46); }
    // moon door
    ell(c, 112, 88, 14, 14); c.fillStyle = '#2b2220'; c.fill(); c.strokeStyle = '#b8322a'; c.lineWidth = 3; c.stroke(); c.fillStyle = '#e6dfcf'; c.fillRect(96, 101, 32, 6);
    // lattice windows
    c.strokeStyle = '#8d241c'; c.lineWidth = 1.2; for (const x of [70, 138]) { c.fillStyle = '#efe5d0'; c.fillRect(x, 74, 16, 16); c.strokeRect(x, 74, 16, 16); c.beginPath(); c.moveTo(x + 8, 74); c.lineTo(x + 8, 90); c.moveTo(x, 82); c.lineTo(x + 16, 82); c.stroke(); }
    // upturned roof, lower tier
    const roof = (y, w, h, col, col2) => {
      c.fillStyle = lg(c, 0, y - h, 0, y + 6, [[0, col], [1, col2]]);
      c.beginPath(); c.moveTo(112 - w, y - 6); c.quadraticCurveTo(112 - w + 10, y + 2, 112 - w * .55, y - 2); c.quadraticCurveTo(112 - w * .25, y - h * .55, 112, y - h); c.quadraticCurveTo(112 + w * .25, y - h * .55, 112 + w * .55, y - 2); c.quadraticCurveTo(112 + w - 10, y + 2, 112 + w + 6, y - 9);
      c.lineTo(112 + w + 2, y + 2); c.quadraticCurveTo(112 + w * .5, y + 6, 112, y + 4); c.quadraticCurveTo(112 - w * .5, y + 6, 112 - w - 4, y + 2); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = .9; for (let k = -1; k <= 1.01; k += .12) { c.beginPath(); c.moveTo(112 + k * w * .95, y + 3); c.lineTo(112 + k * w * .35, y - h * .65); c.stroke(); }
      c.strokeStyle = '#b8322a'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(112 - w - 4, y + 2); c.quadraticCurveTo(112 - w * .5, y + 6, 112, y + 4); c.quadraticCurveTo(112 + w * .5, y + 6, 112 + w + 2, y + 2); c.stroke();
    };
    roof(62, 74, 26, '#3b7c74', '#24524c');
    c.fillStyle = '#fbf8f0'; c.fillRect(92, 26, 40, 14); c.fillStyle = '#c23a2e'; c.fillRect(92, 26, 4, 14); c.fillRect(128, 26, 4, 14);
    roof(28, 38, 20, '#3b7c74', '#24524c');
    c.fillStyle = '#d4a63a'; ell(c, 112, 6, 3, 4); c.fill(); c.fillRect(111, 8, 2, 4);
    // lantern
    c.strokeStyle = '#3a2a20'; c.lineWidth = 1; c.beginPath(); c.moveTo(150, 64); c.lineTo(150, 72); c.stroke(); ell(c, 150, 77, 5, 6); c.fillStyle = rg(c, 149, 75, 1, 7, [[0, '#ffcf6b'], [1, '#c8302a']]); c.fill();
    ramp(c, 112, 108, 132, 134);
  },
  bra(c) {
    shadowEll(c, 116, 124, 104, 14);
    const H = house(c, { x0: 40, x1: 180, top: 56, bot: 114, peak: 10, D: 24, eave: 11, thick: 8,
      wall: '#8a5d34', wallSide: '#6d4726',
      wallTex: (c, side) => { for (let y = 10; y < 120; y += 8) { c.fillStyle = lg(c, 0, y, 0, y + 8, [[0, '#a87445'], [.5, '#8a5d34'], [1, '#5f3d1f']]); rrect(c, 30, y + .5, 190, 7.4, 3.6); c.fill(); if (!side) { for (const x of [40, 180]) { ell(c, x, y + 4, 3.6, 3.6); c.fillStyle = '#d2a873'; c.fill(); c.strokeStyle = '#8a5d34'; c.lineWidth = .6; ell(c, x, y + 4, 2, 2); c.stroke(); } } } },
      roof: '#36553a', roofSide: lg(c, 110, 6, 210, 70, [[0, '#4f7a52'], [1, '#2b442e']]), roofTex: (c, g) => { c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 1.2; for (let k = 0; k <= 1; k += .07) { const x = lerp(110, 191, k), y = lerp(8, 62, k); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 24, y - 8.4); c.stroke(); } } });
    // double doors
    for (const x of [94, 110]) { c.fillStyle = lg(c, x, 0, x + 16, 0, [[0, '#5a3a1e'], [1, '#43290f']]); c.fillRect(x, 78, 16, 36); c.strokeStyle = '#2d1b0a'; c.lineWidth = 1.2; c.strokeRect(x, 78, 16, 36); c.beginPath(); c.moveTo(x, 78); c.lineTo(x + 16, 96); c.lineTo(x, 114); c.stroke(); }
    ell(c, 108, 96, 1.3, 1.3); ell(c, 112, 96, 1.3, 1.3); c.fillStyle = '#d6b55a'; c.fill();
    for (const x of [56, 150]) { c.fillStyle = '#e8d9a7'; c.fillRect(x, 74, 16, 14); c.strokeStyle = '#3d2913'; c.lineWidth = 2; c.strokeRect(x, 74, 16, 14); c.beginPath(); c.moveTo(x + 8, 74); c.lineTo(x + 8, 88); c.stroke(); }
    // hay bale
    rrect(c, 186, 104, 22, 14, 3); c.fillStyle = lg(c, 0, 104, 0, 118, [[0, '#e6c96a'], [1, '#b8953b']]); c.fill(); c.strokeStyle = '#8f6f2a'; c.lineWidth = 1; c.beginPath(); c.moveTo(192, 104); c.lineTo(192, 118); c.moveTo(202, 104); c.lineTo(202, 118); c.stroke();
    ramp(c, 110, 114, 134, 138);
  },
};
function shelter(c) {
  shadowEll(c, 96, 112, 76, 10);
  c.fillStyle = '#4a3220'; c.fillRect(34, 50, 124, 58);
  c.fillStyle = rg(c, 96, 96, 4, 60, [[0, '#2a1d12'], [1, '#140d08']]); c.fillRect(40, 56, 112, 50);
  c.lineCap = 'round'; const rnd = rngFrom(21); for (let i = 0; i < 60; i++) { const x = 44 + rnd() * 104, y = 96 + rnd() * 10; c.strokeStyle = rnd() < .5 ? '#d9b65a' : '#a8873b'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 5, y + rnd() * 2 - 1); c.stroke(); }
  c.fillStyle = lg(c, 0, 30, 0, 56, [[0, '#7a5a3c'], [1, '#4f3823']]); c.beginPath(); c.moveTo(24, 58); c.lineTo(168, 58); c.lineTo(160, 34); c.lineTo(32, 34); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1; for (let x = 36; x < 166; x += 9) { c.beginPath(); c.moveTo(x, 35); c.lineTo(x - 2, 57); c.stroke(); }
  for (const x of [36, 152]) { c.fillStyle = '#5e4429'; c.fillRect(x, 56, 6, 52); }
}
function pond(c) {
  ell(c, 258, 86, 58, 20); c.fillStyle = '#5a7f3a'; c.fill();
  ell(c, 258, 86, 52, 16); c.fillStyle = rg(c, 248, 80, 2, 54, [[0, '#9fd0e3'], [.6, '#5c9fbe'], [1, '#3f7897']]); c.fill();
  ell(c, 240, 82, 14, 3); c.fillStyle = 'rgba(255,255,255,.45)'; c.fill();
  for (let i = 0; i < 9; i++) { const x = 206 + i * 4; c.strokeStyle = '#3f6a2b'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, 92); c.quadraticCurveTo(x - 2, 80, x - 1 + (i % 3), 70 + (i % 4) * 3); c.stroke(); }
  for (const [x, y] of [[276, 92], [286, 84]]) { ell(c, x, y, 5, 2.4); c.fillStyle = '#4f8a3a'; c.fill(); }
}
function paintPlot(c, p, pr) {
  const rnd = rngFrom(p.kind === 'coop' ? 100 + BREED_IDS.indexOf(p.breed) : p.kind === 'pasture' ? 77 : 33);
  if (p.kind === 'sale') {
    c.save(); c.beginPath(); c.rect(8, 8, PW - 16, PH - 16); c.clip();
    c.fillStyle = 'rgba(40,70,25,.28)'; c.fillRect(0, 0, PW, PH);
    for (let i = 0; i < 26; i++) { const x = 20 + rnd() * 300, y = 30 + rnd() * 240, r = 10 + rnd() * 18; shadowEll(c, x, y + r * .6, r * 1.1, r * .35, .25); ell(c, x, y, r, r * .75); c.fillStyle = rg(c, x - r * .3, y - r * .4, 1, r * 1.2, [[0, '#6f9b47'], [1, '#2f5422']]); c.fill(); for (let k = 0; k < 4; k++) { ell(c, x + (rnd() - .5) * r, y + (rnd() - .5) * r * .6, 1.4, 1.4); c.fillStyle = rnd() < .5 ? '#6b1f3a' : '#f3efe2'; c.fill(); } }
    c.restore();
    c.setLineDash([6, 6]); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.strokeRect(10, 10, PW - 20, PH - 20); c.setLineDash([]);
    sign(c, PW / 2, PH / 2 - 8, t('sign_sale'), fmtN(p.price) + ' ' + t('coins'));
    return;
  }
  yardGround(c, rnd, p.kind === 'pasture');
  fence(c);
  if (p.kind === 'coop') { COOPS[p.breed](c); props(c); sign(c, 248, 40, t('coop_' + p.breed)); }
  else if (p.kind === 'empty') { for (let i = 0; i < 4; i++) { ell(c, 110 + i * 12, 80, 8, 3); c.fillStyle = 'rgba(140,100,60,.4)'; c.fill(); } sign(c, PW / 2, 100, t('sign_build'), '+'); }
  else if (p.kind === 'pasture') { shelter(c); pond(c); sign(c, 250, 36, t('pasture')); }
}
function getPlotCanvas(p, pr) {
  const key = [p.kind, p.breed || '', p.price || '', pr, lang()].join('|');
  let cv = plotCache.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = Math.ceil(PW * pr); cv.height = Math.ceil(PH * pr);
  const c = cv.getContext('2d'); c.scale(pr, pr); paintPlot(c, p, pr);
  plotCache.set(key, cv); return cv;
}

/* =====================================================================
   9. SCENE: LAYOUT, CHICKEN BEHAVIOUR, DRAWING, TOUCH
   ===================================================================== */
const cv = $('#farm'), ctx = cv.getContext('2d');
const view = { vw: 0, vh: 0, dpr: 1, cols: 1, scale: 1, worldW: 0, worldH: 0, camY: 0, offX: 0, pr: 2 };
const agents = new Map();
let plots = [], clock = 0, dirty = false, uiDirty = false;

function buildPlots() {
  plots = [];
  for (let i = 0; i < state.plots; i++) { const coop = state.coops.find(c => c.plot === i); plots.push(coop ? { kind: 'coop', breed: coop.breed, coop } : { kind: 'empty', idx: i }); }
  if (state.plots < MAX_PLOTS) plots.push({ kind: 'sale', price: plotPrice() });
  plots.push({ kind: 'pasture' });
  plots.forEach((p, i) => { const col = i % view.cols, row = Math.floor(i / view.cols); p.x = MARGIN + col * (PW + GAP); p.y = MARGIN + row * (PH + GAP); });
  const rows = Math.ceil(plots.length / view.cols);
  view.worldH = rows * PH + (rows - 1) * GAP + 2 * MARGIN;
}
function layout() {
  const r = cv.getBoundingClientRect();
  view.vw = Math.max(1, r.width); view.vh = Math.max(1, r.height); view.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  view.cols = clamp(Math.round(view.vw / 400), 1, 4);
  view.worldW = view.cols * PW + (view.cols - 1) * GAP + 2 * MARGIN;
  view.scale = Math.min(view.vw / view.worldW, 1.5);
  view.offX = (view.vw - view.worldW * view.scale) / 2;
  const pr = Math.min(3, Math.ceil(view.dpr * view.scale * 2) / 2);
  if (pr !== view.pr) { view.pr = pr; spriteCache.clear(); plotCache.clear(); }
  cv.width = Math.round(view.vw * view.dpr); cv.height = Math.round(view.vh * view.dpr);
  buildPlots(); clampCam();
}
function clampCam() { view.camY = clamp(view.camY, 0, Math.max(0, view.worldH - view.vh / view.scale)); }
function plotOfBird(b) { if (b.home === 'pasture') return plots.find(p => p.kind === 'pasture'); return plots.find(p => p.kind === 'coop' && p.coop.id === b.home); }
function yardOf(p) { return p.kind === 'pasture' ? { x0: p.x + 24, x1: p.x + 316, y0: p.y + 124, y1: p.y + 268 } : { x0: p.x + YARD.x0, x1: p.x + YARD.x1, y0: p.y + YARD.y0, y1: p.y + YARD.y1 }; }
function resetAgent(b) { agents.delete(b.id); }
function agentFor(b) {
  let a = agents.get(b.id); const p = plotOfBird(b); if (!p) return null;
  const key = p.kind === 'pasture' ? 'pasture' : 'coop' + p.coop.id;
  if (a && a.key === key && a.plot !== p) { const dx = p.x - a.plot.x, dy = p.y - a.plot.y; a.x += dx; a.y += dy; a.tx += dx; a.ty += dy; a.plot = p; }
  if (!a || a.key !== key) {
    const y = yardOf(p);
    a = { key, plot: p, x: lerp(y.x0, y.x1, Math.random()), y: lerp(y.y0, y.y1, Math.random()), tx: 0, ty: 0, st: 'idle', t: Math.random() * 2, face: Math.random() < .5 ? 1 : -1, ph: 0, peck: 0, say: 0, sayText: '' };
    agents.set(b.id, a);
  }
  return a;
}
function decide(b, a, others) {
  const y = yardOf(a.plot), st = stage(b), r = Math.random(), old = st === 'retired';
  a.st = 'idle'; a.t = .6 + Math.random() * 1.8;
  if (st === 'chick') {
    const mom = others.find(o => o.b.sex === 'h' && isGrown(o.b) && (b.dam && o.b.name === b.dam.name)) || others.find(o => o.b.sex === 'h' && isGrown(o.b));
    if (mom && r < .7) { a.st = 'follow'; a.leader = mom.a; a.t = 2 + Math.random() * 3; a.off = [(Math.random() - .5) * 22, 6 + Math.random() * 10]; return; }
  }
  if (r < .38) { a.st = 'walk'; a.tx = lerp(y.x0, y.x1, Math.random()); a.ty = lerp(y.y0, y.y1, Math.random()); }
  else if (r < .64) { a.st = 'peck'; a.t = 1 + Math.random() * 2.5; }
  else if (r < .76 && others.length) {
    const o = pick(others); if (o.a.st === 'idle' || o.a.st === 'peck') { a.st = 'walk'; a.tx = o.a.x - 20 * Math.sign(o.a.x - a.x || 1); a.ty = o.a.y + (Math.random() - .5) * 6; a.chatWith = o.a; }
  }
  else if (r < .81 && b.sex === 'h' && st !== 'chick' && !old) { a.st = 'dust'; a.t = 4 + Math.random() * 4; }
  else if (r < .86 && b.sex === 'r' && st !== 'chick') { a.st = 'crow'; a.t = 2; a.say = 2; a.sayText = t('crow'); }
}
function updateAgents(dt) {
  const byPlot = new Map();
  for (const b of state.birds) { const a = agentFor(b); if (!a) continue; a.b = b; if (!byPlot.has(a.plot)) byPlot.set(a.plot, []); byPlot.get(a.plot).push({ b, a }); }
  for (const [p, list] of byPlot) {
    const y = yardOf(p);
    for (const { b, a } of list) {
      const st = stage(b), slow = st === 'retired' ? .7 : 1;
      const spd = (st === 'chick' ? 20 : b.breed === 'sil' ? 12 : 16) * slow;
      a.t -= dt; if (a.say > 0) a.say -= dt;
      let moving = false;
      if (a.st === 'walk' || a.st === 'follow') {
        if (a.st === 'follow' && a.leader) { a.tx = a.leader.x - a.leader.face * 10 + a.off[0]; a.ty = a.leader.y + a.off[1] * .4; }
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        if (d > 1.5) { const s = Math.min(d, spd * dt); a.x += dx / d * s; a.y += dy / d * s; if (Math.abs(dx) > .5) a.face = dx > 0 ? 1 : -1; moving = true; a.ph += dt * (st === 'chick' ? 16 : 10); }
        else if (a.st === 'walk') {
          if (a.chatWith) { a.face = Math.sign(a.chatWith.x - a.x) || 1; a.chatWith.face = -a.face; a.st = 'chat'; a.t = 1.2 + Math.random() * 1.5; if (Math.random() < .4) { a.say = 1.2; a.sayText = t('cluck'); } a.chatWith = null; }
          else { a.st = 'idle'; a.t = .3 + Math.random(); }
        }
        if (a.st === 'follow' && a.t <= 0) a.st = 'idle';
      }
      a.peck = lerp(a.peck, a.st === 'peck' ? (Math.sin(clock * 9 + b.id) > .2 ? 1 : .35) : 0, Math.min(1, dt * 14));
      a.x = clamp(a.x, y.x0, y.x1); a.y = clamp(a.y, y.y0, y.y1);
      a.moving = moving;
      if (a.t <= 0 && a.st !== 'walk') decide(b, a, list.filter(o => o.b !== b));
      if (a.st === 'walk' && a.t < -12) a.st = 'idle';
    }
  }
}
function draw() {
  const k = view.dpr * view.scale;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!grassPattern) grassPattern = ctx.createPattern(makeGrass(), 'repeat');
  ctx.fillStyle = grassPattern; ctx.setTransform(k, 0, 0, k, view.offX * view.dpr, -view.camY * k);
  const top = view.camY, bottom = view.camY + view.vh / view.scale;
  ctx.fillRect(-view.offX / view.scale, top, view.vw / view.scale, bottom - top);
  for (const p of plots) {
    if (p.y > bottom || p.y + PH < top) continue;
    ctx.drawImage(getPlotCanvas(p, view.pr), p.x, p.y, PW, PH);
  }
  // eggs waiting in each coop
  for (const p of plots) {
    if (p.kind !== 'coop' || p.y > bottom || p.y + PH < top) continue;
    const n = nestCount(p.coop); if (!n) continue;
    const bx = p.x + 214, by = p.y + 86 + Math.sin(clock * 3) * 2.5;
    p.bubble = { x: bx, y: by };
    ctx.fillStyle = 'rgba(0,0,0,.18)'; rrect(ctx, bx - 22, by - 14 + 2, 46, 28, 14); ctx.fill();
    ctx.fillStyle = n >= NEST_CAP ? '#fff2cc' : '#fffdf6'; rrect(ctx, bx - 22, by - 14, 46, 28, 14); ctx.fill();
    ctx.strokeStyle = n >= NEST_CAP ? '#c8302a' : 'rgba(0,0,0,.12)'; ctx.lineWidth = 1.5; ctx.stroke();
    ell(ctx, bx - 8, by, 6.5, 8.4); ctx.fillStyle = rg(ctx, bx - 10, by - 3, 1, 10, [[0, '#ffffff'], [1, BREEDS[p.coop.breed].eggCol]]); ctx.fill();
    ctx.fillStyle = '#2b2416'; ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), bx + 10, by + 1);
  }
  // chickens, back to front
  const list = [];
  for (const b of state.birds) { const a = agents.get(b.id); if (!a || !a.plot || a.y < top - 40 || a.y > bottom + 120) continue; list.push(a); }
  list.sort((a, b) => a.y - b.y);
  for (const a of list) drawBird(a);
}
function drawBird(a) {
  const b = a.b, st = stage(b), chick = st === 'chick';
  const sz = BREEDS[b.breed].size * (chick ? 1.15 : st === 'young' ? .84 : 1) * .62;
  const spr = getSprite(b, chick, view.pr);
  ctx.save(); ctx.translate(a.x, a.y);
  ell(ctx, 0, 0, (chick ? 9 : b.breed === 'sil' ? 22 : 24) * sz, (chick ? 3 : 6) * sz); ctx.fillStyle = 'rgba(25,35,15,.28)'; ctx.fill();
  ctx.scale(a.face * sz, sz);
  let dust = a.st === 'dust';
  if (dust) { ctx.translate(0, 8); ctx.scale(1.05, .8); }
  if (a.moving) ctx.translate(0, -Math.abs(Math.sin(a.ph)) * 1.4);
  if (a.peck > .02) ctx.rotate(a.peck * .42);
  if (a.st === 'crow') ctx.rotate(-.12);
  if (!dust) drawLegs(ctx, b, a.ph, a.moving, chick);
  ctx.drawImage(spr.cv, spr.box.x0, spr.box.y0, spr.box.w, spr.box.h);
  if (dust) { ctx.globalAlpha = .35; for (let i = 0; i < 4; i++) { ell(ctx, -20 + i * 12 + Math.sin(clock * 5 + i) * 3, -4 - Math.abs(Math.sin(clock * 4 + i)) * 6, 5, 3); ctx.fillStyle = '#b39066'; ctx.fill(); } ctx.globalAlpha = 1; }
  ctx.restore();
  if (a.say > 0) {
    ctx.save(); ctx.font = '700 11px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(a.sayText).width + 12, hx = a.x + 4, hy = a.y - (chick ? 30 : 70 * sz) - 8;
    ctx.globalAlpha = Math.min(1, a.say * 3);
    ctx.fillStyle = '#fffdf6'; rrect(ctx, hx - w / 2, hy - 10, w, 20, 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - 4, hy + 9); ctx.lineTo(hx - 8, hy + 16); ctx.lineTo(hx + 3, hy + 9); ctx.fill();
    ctx.fillStyle = '#2b2416'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(a.sayText, hx, hy + 1); ctx.restore();
  }
}
function scrollToPlot(idx) { buildPlots(); const p = plots[idx]; if (!p) return; view.camY = p.y - 20; clampCam(); }

/* touch: drag to scroll, tap to open */
const ptr = { down: false, id: null, y0: 0, x0: 0, cam0: 0, moved: 0, t0: 0, vy: 0, lastY: 0, lastT: 0 };
let inertia = 0;
cv.addEventListener('pointerdown', e => { ptr.down = true; ptr.id = e.pointerId; ptr.x0 = e.clientX; ptr.y0 = e.clientY; ptr.cam0 = view.camY; ptr.moved = 0; ptr.t0 = performance.now(); ptr.lastY = e.clientY; ptr.lastT = ptr.t0; ptr.vy = 0; inertia = 0; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
cv.addEventListener('pointermove', e => {
  if (!ptr.down || e.pointerId !== ptr.id) return;
  const dy = e.clientY - ptr.y0; ptr.moved = Math.max(ptr.moved, Math.hypot(e.clientX - ptr.x0, dy));
  view.camY = ptr.cam0 - dy / view.scale; clampCam();
  const now = performance.now(); const dtm = now - ptr.lastT; if (dtm > 0) ptr.vy = (e.clientY - ptr.lastY) / dtm; ptr.lastY = e.clientY; ptr.lastT = now;
});
cv.addEventListener('pointerup', e => {
  if (!ptr.down || e.pointerId !== ptr.id) return; ptr.down = false;
  if (ptr.moved < 9) { const r = cv.getBoundingClientRect(); tapAt((e.clientX - r.left - view.offX) / view.scale, (e.clientY - r.top) / view.scale + view.camY); }
  else inertia = -ptr.vy / view.scale * 16;
});
cv.addEventListener('pointercancel', () => { ptr.down = false; });
cv.addEventListener('wheel', e => { e.preventDefault(); view.camY += e.deltaY / view.scale; clampCam(); }, { passive: false });
function tapAt(x, y) {
  for (const p of plots) if (p.kind === 'coop' && p.bubble && nestCount(p.coop) && Math.hypot(x - p.bubble.x, y - p.bubble.y) < 30) { actCollect(p.coop); return; }
  let best = null, bd = 1e9;
  for (const b of state.birds) { const a = agents.get(b.id); if (!a || !a.plot) continue; const sz = BREEDS[b.breed].size; const d = Math.hypot(x - a.x, y - (a.y - 18 * sz)); if (d < 26 * sz && d < bd) { bd = d; best = b; } }
  if (best) { openSheet('bird', { id: best.id }); return; }
  const p = plots.find(p => x >= p.x && x <= p.x + PW && y >= p.y && y <= p.y + PH); if (!p) return;
  if (p.kind === 'coop') openSheet('coop', { id: p.coop.id });
  else if (p.kind === 'empty') openSheet('market', { tab: 'build' });
  else if (p.kind === 'sale') openSheet('market', { tab: 'build' });
  else openSheet('pasture');
}

/* =====================================================================
   10. INTERFACE
   ===================================================================== */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k]; if (v == null || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (k === 'style') el.style.cssText = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return el;
}
const coinPrice = (n, lbl) => h('span', { class: 'price' }, lbl ? lbl + ' ' : '', h('span', { class: 'coin' }), fmtN(n));
function portrait(b, big) {
  const size = big ? 132 : 56, c = h('canvas', { class: 'portrait' + (big ? ' big' : ''), width: size * 2, height: size * 2, 'aria-hidden': 'true' });
  const g = c.getContext('2d'), chick = stage(b) === 'chick', s = getSprite(b, chick, 3);
  const scale = chick ? size * 2 / 44 : b.breed === 'sil' ? size * 2 / 96 : size * 2 / 128;
  g.translate(size, size * (chick ? 1.6 : b.breed === 'sil' ? 1.62 : 1.72)); g.scale(scale, scale);
  ell(g, 0, 0, chick ? 10 : 26, chick ? 3 : 6); g.fillStyle = 'rgba(30,50,15,.25)'; g.fill();
  drawLegs(g, b, 0, false, chick); g.drawImage(s.cv, s.box.x0, s.box.y0, s.box.w, s.box.h);
  return c;
}
const breedName = b => t('br_' + (b.breed || b));
function birdTitle(b) { return b.breed === 'sil' ? `${t('col_' + b.colour)} ${t('br_sil')}` : breedName(b); }
function meters(traits, showLay = true) {
  return h('div', { class: 'meters' }, TRAITS.filter(k => showLay || k !== 'lay').flatMap(k => [
    h('span', { class: 'muted', text: t('tr_' + k) }),
    h('div', { class: 'meter' + (traits[k] >= 80 ? ' hi' : ''), role: 'meter', 'aria-valuenow': traits[k], 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: `width:${traits[k]}%` })),
    h('span', { class: 'num', text: traits[k] }),
  ]));
}
let armed = { key: null, until: 0 };
function confirmBtn(key, label, fn, cls = 'btn') {
  const isArmed = armed.key === key && performance.now() < armed.until;
  return h('button', { class: cls + (isArmed ? ' armed' : ''), onclick: () => {
    if (armed.key === key && performance.now() < armed.until) { armed = { key: null, until: 0 }; fn(); }
    else { armed = { key, until: performance.now() + 3500 }; renderSheet(); }
  } }, isArmed ? t('confirm') : label);
}
function birdRow(b, extra) {
  const q = quality(b);
  return h('button', { class: 'item', onclick: () => openSheet('bird', { id: b.id }) },
    portrait(b),
    h('div', { class: 'grow' },
      h('div', { class: 'row' }, h('span', { class: 'name', text: b.name }), h('span', { class: 'muted', text: b.sex === 'r' ? '♂' : '♀', 'aria-label': stageLabel(b) }), b.champ ? h('span', { class: 'tag red', text: t('champion') }) : null),
      h('div', { class: 'small muted', text: `${birdTitle(b)} · ${stageLabel(b)}` }),
      extra || null),
    h('div', { class: 'grade', title: t('quality'), text: grade(q) }));
}

/* sheets */
let current = null;
function openSheet(name, args) { current = { name, args: args || {} }; $('#sheet').hidden = false; $('#scrim').hidden = false; renderSheet(true); setTab(['market', 'hatch', 'shows', 'awards'].includes(name) ? name : 'farm'); }
function closeSheet() { current = null; $('#sheet').hidden = true; $('#scrim').hidden = true; setTab('farm'); }
function renderSheet(reset) {
  if (!current) return;
  const body = $('#sheetBody'), st = body.scrollTop;
  const fn = SHEETS[current.name]; const out = fn ? fn(current.args) : null;
  if (!out) { closeSheet(); return; }
  $('#sheetTitle').textContent = out.title;
  body.replaceChildren(...[out.node].flat(Infinity).filter(x => x != null && x !== false));
  body.scrollTop = reset ? 0 : st;
  updateTimers();
}
function timer(until, fmtKey) { return h('span', { class: 'num', 'data-until': until, 'data-key': fmtKey || '' }); }
function progress(start, end) { return h('div', { class: 'progress', 'data-start': start, 'data-end': end }, h('i')); }
function updateTimers() {
  for (const el of document.querySelectorAll('[data-until]')) { const left = realLeft(+el.dataset.until - state.gt); const s = fmtDur(left); el.textContent = el.dataset.key ? t(el.dataset.key, { t: s }) : s; }
  for (const el of document.querySelectorAll('[data-start]')) { const a = +el.dataset.start, b = +el.dataset.end; el.firstChild.style.width = clamp((state.gt - a) / (b - a) * 100, 0, 100) + '%'; }
}

const SHEETS = {
  welcome() {
    return { title: t('welcome_title'), node: [
      h('p', { text: t('welcome_1') }), h('p', { text: t('welcome_2') }), h('p', { text: t('welcome_3') }),
      h('div', { class: 'card' }, h('h3', { text: t('time_title') }), h('p', { class: 'small', text: t('time_body') }), h('p', { class: 'small', text: t('away_body') })),
      h('button', { class: 'btn', onclick: () => { state.flags.welcome = true; save(); closeSheet(); } }, t('start')),
    ] };
  },
  away(a) {
    const lines = [];
    if (a.eggs) lines.push(t('away_eggs', { n: fmtN(a.eggs) })); if (a.hatched) lines.push(t('away_hatched', { n: a.hatched }));
    if (a.retired) lines.push(t('away_retired', { n: a.retired })); if (a.shows) lines.push(t('away_shows', { n: a.shows }));
    return { title: t('away_title') + ` (${fmtDur(a.real)})`, node: [
      h('div', { class: 'list' }, lines.map(l => h('div', { class: 'item', style: 'cursor:default' }, h('span', { class: 'egg' }), h('span', { class: 'grow', text: l })))),
      a.paused ? h('p', { class: 'note', text: t('away_paused') }) : null,
      h('button', { class: 'btn', onclick: closeSheet }, t('close')),
    ] };
  },
  coop({ id }) {
    const coop = coopById(id); if (!coop) return null;
    const birds = birdsIn(coop).sort((a, b) => (a.sex === b.sex ? quality(b) - quality(a) : a.sex === 'r' ? -1 : 1));
    const roos = adultRoosters(coop), n = nestCount(coop);
    const sire = roos.find(r => r.id === coop.sire);
    return { title: t('coop_' + coop.breed), node: [
      h('div', { class: 'row' }, h('span', { class: 'tag', text: breedName(coop.breed) }), h('span', { class: 'tag', text: t('coop_cap', { a: birds.length, b: coop.cap }) })),
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('h3', { class: 'grow', text: t('nest') }), h('span', { class: 'num', text: `${n} / ${NEST_CAP}` })),
        n ? h('div', { class: 'row', style: 'flex-wrap:wrap;gap:4px' }, Array.from({ length: n }, (_, i) => h('span', { class: 'eggdot', style: `background:${BREEDS[coop.breed].eggCol};${i < coop.nest.fertile.length ? 'outline:2px solid var(--good);outline-offset:1px' : ''}` }))) : h('p', { class: 'muted small', text: t('nest_empty') }),
        coop.nest.fertile.length ? h('p', { class: 'small', text: `${coop.nest.fertile.length} × ${t('fertile').toLowerCase()}` }) : null,
        h('button', { class: 'btn', disabled: !n, onclick: () => actCollect(coop) }, t('collect'))),
      h('div', { class: 'card' },
        h('h3', { text: t('sire') }),
        roos.length ? h('p', { class: 'small', text: sire ? `${sire.name} · ${t('quality')} ${quality(sire)}` : t('sire_auto') }) : h('p', { class: 'small warn', text: t('no_rooster') }),
        roos.length ? h('p', { class: 'note', text: t('sire_note') }) : null),
      h('h3', { text: t('birds') }),
      h('div', { class: 'list' }, birds.map(b => birdRow(b, b.id === coop.sire ? h('span', { class: 'tag blue', text: t('is_sire') }) : null))),
      coop.cap < 32 ? h('button', { class: 'btn alt', disabled: state.coins < capPrice(coop), onclick: () => actUpgradeCap(coop) }, t('upgrade_cap'), ' · ', coinPrice(capPrice(coop))) : h('p', { class: 'note', text: t('cap_max') }),
    ] };
  },
  bird({ id }) {
    const b = birdById(id); if (!b) return null;
    const st = stage(b), q = quality(b), coop = coopById(b.home), age = state.gt - b.born;
    const openShows = state.shows.list.filter(s => !s.entry && canEnter(b, s));
    const enteredIn = state.shows.list.find(s => s.entry === b.id);
    const info = [];
    if (st === 'chick') info.push(h('p', { class: 'small' }, timer(b.born + T.young, 'chick_in')));
    else if (st !== 'retired') info.push(h('p', { class: 'small' }, timer(b.born + T.retire, 'retires_in')));
    else info.push(h('p', { class: 'small', text: t('retired_on') }));
    if (b.sex === 'h' && st !== 'retired') info.push(h('p', { class: 'small muted', text: st === 'chick' ? t('not_laying') : t('laying_now') }));
    const ribbons = b.ribbons.length ? h('div', { class: 'row', style: 'flex-wrap:wrap' }, b.ribbons.slice(-12).map(r => h('span', { class: 'rosette p' + r.place, title: `${placeLabel(r.place)} · ${t('t_' + r.tier)}` }))) : null;
    const actions = [];
    if (st === 'retired') actions.push(confirmBtn('rehome' + b.id, h('span', {}, t('rehome'), ' · ', coinPrice(Math.max(1, value(b)))), () => actSell(b)));
    else {
      actions.push(confirmBtn('sell' + b.id, h('span', {}, t('sell_for'), ' ', coinPrice(sellPrice(b))), () => actSell(b)));
      if (b.sex === 'r' && st !== 'chick' && coop && coop.sire !== b.id) actions.push(h('button', { class: 'btn alt', onclick: () => actSire(b) }, t('make_sire')));
      if (st !== 'chick') actions.push(confirmBtn('ret' + b.id, t('retire_now'), () => actRetire(b), 'btn alt'));
    }
    return { title: b.name, node: [
      h('div', { class: 'hero-row' }, portrait(b, true), h('div', { class: 'grow', style: 'display:flex;flex-direction:column;gap:6px;min-width:150px' },
        h('div', { style: 'font-weight:700', text: birdTitle(b) }),
        h('div', { class: 'small muted', text: `${stageLabel(b)} · ${t('age')} ${fmtDur(age)}` }),
        h('div', { class: 'row' }, h('span', { class: 'grade', text: grade(q) }), h('span', { class: 'small', text: `${t('quality')} ${q}/100` })),
        h('div', { class: 'small' }, t('value'), ' ', coinPrice(value(b))),
        b.champ ? h('span', { class: 'tag red', text: (b.champ > 1 ? b.champ + '× ' : '') + t('champion') }) : null,
        coop ? h('div', { class: 'small muted', text: t('in_coop', { coop: t('coop_' + coop.breed) }) }) : null)),
      h('input', { type: 'text', id: 'rename', maxlength: 20, value: b.name, 'aria-label': 'Name', autocomplete: 'off', onchange: e => actRename(b, e.target.value) }),
      meters(b.traits),
      ...info,
      (b.champ || b.line) ? h('p', { class: 'note', text: t('champ_line') }) : null,
      ribbons,
      h('div', { class: 'small muted' }, `${t('parents')}: `, (b.sire || b.dam) ? `${b.sire ? b.sire.name + ' (' + b.sire.q + ')' : '?'} × ${b.dam ? b.dam.name + ' (' + b.dam.q + ')' : '?'}` : t('unknown'), ` · ${t('gen')} ${b.gen}`),
      enteredIn ? h('p', { class: 'small', text: t('entered', { show: showName(enteredIn) }) }) : null,
      (st !== 'retired' && st !== 'chick' && !enteredIn) ? h('div', { class: 'card' }, h('h3', { text: t('enter_show') }),
        b.breed === 'sil' && !SIL[b.colour].show ? h('p', { class: 'small muted', text: t('non_standard', { col: t('col_' + b.colour) }) }) :
        openShows.length ? openShows.map(s => h('button', { class: 'btn alt sm', disabled: state.coins < TIERS[s.tier].fee, onclick: () => actEnter(b, s) }, `${showName(s)} · `, coinPrice(TIERS[s.tier].fee))) : h('p', { class: 'small muted', text: t('no_shows') })) : null,
      h('div', { class: 'btns' }, actions),
    ] };
  },
  pasture() {
    const birds = state.birds.filter(b => b.home === 'pasture');
    return { title: t('pasture'), node: [h('p', { class: 'note', text: t('pasture_note') }), birds.length ? h('div', { class: 'list' }, birds.map(b => birdRow(b))) : h('p', { class: 'muted', text: t('pasture_empty') })] };
  },
  market({ tab = 'birds' }) {
    const seg = h('div', { class: 'seg', role: 'group' }, ['birds', 'build'].map(k => h('button', { 'aria-pressed': String(tab === k), onclick: () => { current.args.tab = k; renderSheet(true); } }, t('market_' + k))));
    let node;
    if (tab === 'birds') {
      node = [h('p', { class: 'small muted' }, timer(state.shop.next, 'new_birds_in')),
        state.shop.offers.length ? h('div', { class: 'list' }, state.shop.offers.map((o, i) => {
          const fake = { ...o, id: -1 - i, home: 0, champ: 0, line: 0, ribbons: [] };
          const price = offerPrice(o), has = state.coops.some(c => c.breed === o.breed), room = coopWithSpace(o.breed);
          const why = !has ? t('need_coop', { coop: t('coop_' + o.breed) }) : !room ? t('coop_full', { coop: t('coop_' + o.breed) }) : state.coins < price ? t('need_coins') : null;
          return h('div', { class: 'card' },
            h('div', { class: 'row' }, portrait(fake), h('div', { class: 'grow' }, h('div', { class: 'name', style: 'font-weight:700', text: `${o.name} ${o.sex === 'r' ? '♂' : '♀'}` }), h('div', { class: 'small muted', text: `${birdTitle(fake)} · ${stageLabel(fake)}` })), h('div', { class: 'grade', text: grade(quality(fake)) })),
            meters(o.traits),
            why ? h('p', { class: 'small warn', text: why }) : null,
            h('button', { class: 'btn', disabled: !!why, onclick: () => actBuyOffer(i) }, t('buy_for'), ' ', coinPrice(price)));
        })) : h('p', { class: 'muted', text: t('no_offers') })];
    } else {
      const free = freePlot();
      node = [
        h('h3', { text: t('build_here') }),
        BREED_IDS.map(id => {
          const price = coopPrice(id), owned = state.coops.filter(c => c.breed === id).length;
          const thumb = h('canvas', { class: 'thumb', width: 680, height: 300, 'aria-hidden': 'true' });
          const g = thumb.getContext('2d'); g.drawImage(getPlotCanvas({ kind: 'coop', breed: id }, 2), 0, 0, PW * 2, 150 * 2, 0, 0, 680, 300);
          return h('div', { class: 'card' }, thumb,
            h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { style: 'font-weight:700', text: t('coop_' + id) }), h('div', { class: 'small muted', text: t('build_coop', { breed: t('br_' + id) }) + (owned ? ' · ' + t('owned', { n: owned }) : '') }))),
            free < 0 ? h('p', { class: 'small warn', text: t('need_plot') }) : null,
            h('button', { class: 'btn', disabled: free < 0 || state.coins < price, onclick: () => actBuildCoop(id) }, t('build_for'), ' ', coinPrice(price)));
        }),
        h('div', { class: 'card' }, h('h3', { text: t('land') }), h('p', { class: 'small', text: t('land_note') }), h('p', { class: 'small muted', text: t('plots_owned', { n: state.plots, max: MAX_PLOTS }) }),
          state.plots < MAX_PLOTS ? h('button', { class: 'btn alt', disabled: state.coins < plotPrice(), onclick: actBuyPlot }, t('buy_land'), ' · ', coinPrice(plotPrice())) : h('p', { class: 'note', text: t('max_reached') })),
        h('div', { class: 'card' }, h('h3', { text: t('incubator_slot') }), h('p', { class: 'small muted', text: t('slots', { a: state.inc.items.length, b: state.inc.slots }) }),
          state.inc.slots < 8 ? h('button', { class: 'btn alt', disabled: state.coins < incPrice(), onclick: actIncSlot }, coinPrice(incPrice())) : h('p', { class: 'note', text: t('max_reached') })),
        h('div', { class: 'card' }, h('h3', { text: t('basket_up') }), h('p', { class: 'small muted', text: `${basketCount()} / ${state.basketCap}` }),
          state.basketCap < 1000 ? h('button', { class: 'btn alt', disabled: state.coins < basketPrice(), onclick: actBasket }, coinPrice(basketPrice())) : h('p', { class: 'note', text: t('max_reached') })),
      ];
    }
    return { title: t('tab_market'), node: [seg, node].flat(Infinity) };
  },
  hatch() {
    const plainTotal = BREED_IDS.reduce((s, k) => s + state.basket.plain[k], 0);
    const plainCoins = BREED_IDS.reduce((s, k) => s + state.basket.plain[k] * BREEDS[k].egg, 0);
    const slots = [];
    for (let i = 0; i < state.inc.slots; i++) {
      const it = state.inc.items[i];
      if (!it) { slots.push(h('div', { class: 'item', style: 'cursor:default' }, h('span', { class: 'eggdot', style: 'background:var(--line)' }), h('span', { class: 'grow muted', text: t('empty_slot') }))); continue; }
      const e = it.egg;
      slots.push(h('div', { class: 'item', style: 'cursor:default' }, h('span', { class: 'eggdot', style: `background:${BREEDS[e.child.breed].eggCol}` }),
        h('div', { class: 'grow', style: 'display:flex;flex-direction:column;gap:5px' }, h('div', { class: 'small', style: 'font-weight:700', text: `${t('br_' + e.child.breed)} · ${e.sire.name} × ${e.dam.name}` }),
          it.waiting ? h('div', { class: 'small warn', text: t('ready_wait', { coop: t('coop_' + e.child.breed) }) }) : [h('div', { class: 'small muted' }, timer(it.start + T.incubate, 'hatches_in')), progress(it.start, it.start + T.incubate)])));
    }
    return { title: t('tab_hatch'), node: [
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('h3', { class: 'grow', text: t('basket') }), h('span', { class: 'num', text: `${basketCount()} / ${state.basketCap}` })),
        plainTotal ? h('div', { class: 'list' }, BREED_IDS.filter(k => state.basket.plain[k]).map(k => h('div', { class: 'row small' }, h('span', { class: 'eggdot', style: `background:${BREEDS[k].eggCol}` }), h('span', { class: 'grow', text: `${state.basket.plain[k]} × ${t('br_' + k)}` }), h('span', { class: 'muted' }, t('eggs_each', { n: '' }).trim(), ' ', coinPrice(BREEDS[k].egg))))) : h('p', { class: 'small muted', text: t('no_eggs') }),
        h('button', { class: 'btn good', disabled: !plainTotal, onclick: actSellPlain }, t('sell_all'), ' · ', coinPrice(plainCoins))),
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('h3', { class: 'grow', text: t('incubator') }), h('span', { class: 'small muted', text: t('slots', { a: state.inc.items.length, b: state.inc.slots }) })),
        h('div', { class: 'list' }, slots)),
      h('h3', { text: t('fertile') }),
      state.basket.fertile.length ? [h('p', { class: 'note', text: t('fertile_note') }), h('div', { class: 'list' }, state.basket.fertile.map(e => h('div', { class: 'card', style: 'gap:8px' },
        h('div', { class: 'row' }, h('span', { class: 'eggdot', style: `background:${BREEDS[e.child.breed].eggCol}` }), h('div', { class: 'grow' }, h('div', { style: 'font-weight:700', text: t('br_' + e.child.breed) }), h('div', { class: 'small muted', text: `${e.sire.name} (${e.sire.q}) × ${e.dam.name} (${e.dam.q})` }), h('div', { class: 'small', text: t('est', { q: Math.round((e.sire.q + e.dam.q) / 2) }) }))),
        h('div', { class: 'btns' }, h('button', { class: 'btn sm', disabled: state.inc.items.length >= state.inc.slots, onclick: () => actIncubate(e.id) }, t('incubate')), h('button', { class: 'btn alt sm', onclick: () => actSellFertile(e.id) }, t('sell_for'), ' ', coinPrice(fertileEggPrice(e)))))))] : h('p', { class: 'small muted', text: t('no_fertile') }),
    ] };
  },
  shows({ pickFor } = {}) {
    const list = state.shows.list.map(s => {
      const T_ = TIERS[s.tier], entry = s.entry ? birdById(s.entry) : null;
      const eligible = state.birds.filter(b => canEnter(b, s)).sort((a, b) => showScoreBase(b) - showScoreBase(a));
      return h('div', { class: 'card' },
        h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { style: 'font-weight:700;font-family:var(--display)', text: showName(s) }), h('div', { class: 'small muted', text: `${t('t_' + s.tier)} · ${s.cls === 'any' ? t('any_breed') : t('class', { breed: t('br_' + s.cls) })}` })), h('span', { class: 'tag' }, timer(s.closes, 'closes_in'))),
        h('div', { class: 'row small' }, [1, 2, 3].map(p => h('span', { class: 'row', style: 'gap:5px' }, h('span', { class: 'rosette p' + p, style: 'width:22px;height:22px' }), coinPrice(T_.prize[p - 1])))),
        entry ? h('p', { class: 'small', style: 'font-weight:700', text: t('entered_bird', { name: entry.name }) }) :
          pickFor === s.id ? [h('p', { class: 'small', text: t('choose_bird') }), eligible.length ? h('div', { class: 'list' }, eligible.map(b => h('div', { class: 'row' }, h('div', { class: 'grow' }, birdRow(b)), h('button', { class: 'btn sm', disabled: state.coins < T_.fee, onclick: () => { actEnter(b, s); current.args.pickFor = null; renderSheet(); } }, t('enter_show').split(' ')[0])))) : h('p', { class: 'small muted', text: t('no_eligible') })] :
          eligible.length ? h('button', { class: 'btn', disabled: state.coins < T_.fee, onclick: () => { current.args.pickFor = s.id; renderSheet(); } }, t('enter_show'), ' · ', t('fee'), ' ', coinPrice(T_.fee)) : h('p', { class: 'small muted', text: t('no_eligible') }));
    });
    const hist = state.shows.history.slice(0, 10).map(r => h('div', { class: 'item', style: 'cursor:default' }, h('span', { class: 'rosette p' + (r.place <= 3 ? r.place : 0) }), h('div', { class: 'grow' }, h('div', { style: 'font-weight:700', text: `${r.bird} · ${r.place <= 3 ? placeLabel(r.place) : t('not_placed')}` }), h('div', { class: 'small muted', text: t('show_name_' + r.tier, { town: r.town, county: r.county }) })), r.prize ? coinPrice(r.prize) : null));
    return { title: t('tab_shows'), node: [
      h('p', { class: 'small muted' }, timer(state.shows.next, 'next_show')),
      h('h3', { text: t('shows_open') }), list.length ? list : h('p', { class: 'muted', text: '—' }),
      h('h3', { text: t('results') }), hist.length ? h('div', { class: 'list' }, hist) : h('p', { class: 'small muted', text: t('no_results') }),
    ] };
  },
  awards() {
    const champs = state.birds.filter(b => b.champ > 0);
    const best = Math.max(state.stats.best, ...state.birds.filter(b => b.gen > 1).map(quality), 0);
    const ms = [
      ['m_coops', BREED_IDS.every(id => state.coops.some(c => c.breed === id))], ['m_hatch10', state.stats.hatched >= 10], ['m_rare', state.stats.rare > 0],
      ['m_aplus', best >= 75], ['m_perfect', best >= 95], ['m_village', state.stats.w1.village > 0], ['m_county', state.stats.w1.county > 0], ['m_national', state.stats.w1.national > 0],
    ];
    return { title: t('awards'), node: [
      h('h3', { text: t('rosettes') }),
      h('div', { class: 'trophies' }, [1, 2, 3].map(p => h('div', { class: 'card' }, h('span', { class: 'rosette p' + p, style: 'width:40px;height:40px' }), h('div', { class: 'big-num', text: fmtN(state.stats.wins[p - 1]) }), h('div', { class: 'small muted', text: placeLabel(p) })))),
      h('h3', { text: t('champions') }), champs.length ? h('div', { class: 'list' }, champs.map(b => birdRow(b))) : h('p', { class: 'small muted', text: '—' }),
      h('h3', { text: t('milestones') }),
      h('div', { class: 'list' }, ms.map(([k, on]) => h('div', { class: 'row' }, h('span', { class: 'check' + (on ? ' on' : ''), text: '✓', 'aria-label': on ? 'done' : 'not done' }), h('span', { class: on ? '' : 'muted', text: t(k) })))),
      h('h3', { text: t('stats') }),
      h('div', { class: 'card' }, [['s_eggs', state.stats.eggs], ['s_hatched', state.stats.hatched], ['s_sold', state.stats.sold], ['s_earned', state.stats.earned]].map(([k, v]) => h('div', { class: 'row' }, h('span', { class: 'grow', text: t(k) }), h('span', { class: 'num', text: fmtN(v) })))),
    ] };
  },
  settings() {
    return { title: t('settings'), node: [
      h('h3', { text: t('lang') }),
      h('div', { class: 'seg' }, Object.keys(I18N).map(k => h('button', { 'aria-pressed': String(state.lang === k), onclick: () => { state.lang = k; plotCache.clear(); applyLang(); changed(); } }, k === 'en' ? 'English' : 'Français'))),
      h('h3', { text: t('speed') }),
      h('div', { class: 'seg' }, SPEEDS.map(s => h('button', { 'aria-pressed': String(state.speed === s), onclick: () => { state.speed = s; changed(); } }, t('speed_' + s)))),
      h('p', { class: 'note', text: t('speed_note') }),
      h('div', { class: 'card' }, h('h3', { text: t('time_title') }), h('p', { class: 'small', text: t('time_body') }), h('p', { class: 'small', text: t('away_body') })),
      h('p', { class: 'note', text: t('saved_here') }),
      state.flags.edited ? h('p', { class: 'warn', text: t('edited') }) : null,
      confirmBtn('reset', t('reset'), () => { try { localStorage.removeItem(SAVE_KEY); } catch (_) {} const l = state.lang; agents.clear(); spriteCache.clear(); plotCache.clear(); newGame(l); state.flags.welcome = true; save(); layout(); closeSheet(); toast(t('reset_done')); }, 'btn alt'),
    ] };
  },
};

/* HUD, tabs, toasts */
function toast(text, gold) {
  const box = $('#toasts'); const el = h('div', { class: 'toast' + (gold ? ' gold' : ''), text });
  box.append(el); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 3200);
}
function setTab(name) { for (const b of document.querySelectorAll('#tabbar button')) b.setAttribute('aria-current', String(b.dataset.tab === name)); }
let hudCache = '';
function updateHud() {
  const fertileReady = state.basket.fertile.length + state.inc.items.filter(i => i.waiting).length;
  const openNoEntry = state.shows.list.filter(s => !s.entry).length;
  const key = [state.coins, basketCount(), state.basketCap, fertileReady, openNoEntry, lang()].join('|');
  if (key === hudCache) return; hudCache = key;
  $('#coins').textContent = fmtN(state.coins);
  $('#eggs').textContent = `${basketCount()}/${state.basketCap}`;
  const setB = (id, n) => { const el = $(id); el.hidden = !n; el.textContent = n; };
  setB('#bHatch', fertileReady); setB('#bShows', openNoEntry); setB('#bMarket', 0);
}
function applyLang() {
  document.documentElement.lang = lang();
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  $('#gear').setAttribute('aria-label', t('settings')); $('#sheetClose').setAttribute('aria-label', t('close'));
  hudCache = ''; updateHud(); renderSheet();
}
let saveTimer = 0;
function changed(soft) { dirty = false; buildPlots(); updateHud(); if (!soft) renderSheet(); clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }

$('#tabbar').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const tab = b.dataset.tab; if (tab === 'farm') closeSheet(); else openSheet(tab, tab === 'market' ? { tab: 'birds' } : {}); });
$('#gear').addEventListener('click', () => openSheet('settings'));
$('#coinPill').addEventListener('click', () => openSheet('market', { tab: 'birds' }));
$('#eggPill').addEventListener('click', () => openSheet('hatch'));
$('#sheetClose').addEventListener('click', closeSheet);
$('#scrim').addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && current) closeSheet(); });

/* =====================================================================
   11. CLOCK AND START
   ===================================================================== */
function tickTime() {
  const now = Date.now(); let d = now - state.lastReal;
  if (d < 0) { state.lastReal = now; return; }        // device clock moved backwards: award nothing
  if (d < 40) return;
  state.lastReal = now;
  const away = d > 15000;
  const paused = d > OFFLINE_CAP;
  const game = Math.min(d * state.speed, OFFLINE_CAP);
  if (away) { sink = { any: false }; advance(game); const s = sink; sink = null; if (s.any && (d > 5 * MIN || s.hatched || s.shows)) { s.real = Math.min(d, OFFLINE_CAP); s.paused = paused; if (!current || current.name !== 'welcome') openSheet('away', s); } changed(); }
  else advance(game);
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now; clock += dt;
  tickTime();
  if (inertia && !ptr.down) { view.camY += inertia * dt * 60 / 16; inertia *= .92; if (Math.abs(inertia) < .05) inertia = 0; clampCam(); }
  updateAgents(dt);
  draw();
  if (dirty) { dirty = false; uiDirty = true; buildPlots(); updateHud(); }
  requestAnimationFrame(frame);
}
setInterval(() => { if (!state) return; updateTimers(); updateHud(); if (current && uiDirty && !(document.activeElement && document.activeElement.id === 'rename')) { uiDirty = false; renderSheet(); } }, 1000);
setInterval(save, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);
window.addEventListener('resize', () => layout());

function start(hotData) {
  state = (hotData && hotData.state && sanitize(hotData.state)) || load();
  if (!state) newGame((navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en');
  applyLang(); layout(); updateHud();
  if (!state.flags.welcome) openSheet('welcome');
  tickTime();
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('900 13px Coustard'), document.fonts.load('700 12px "Atkinson Hyperlegible"')]).then(() => { plotCache.clear(); }).catch(() => {});
}
window.claude?.hot?.snapshot?.(() => ({ state }));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
})();
