
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
const MAX_PLOTS = 40, MAX_BIRDS = 600;
const COOP_CAP = 5;                     // one rooster and four hens; build more coops to grow
const MAX_LEVEL = 30;
const SAVE_KEY = 'feather-field-save-v1', SALT = 'ff::feather-field::2026';
const SPEEDS = [1, 60];

// lvl = the farm level at which the breed goes on sale
const BREEDS = {
  rir: { price: 40,  egg: 3, lay: 15, eggCol: '#a96a40', size: 1.00, coop: 150,  lvl: 1 },
  orp: { price: 90,  egg: 5, lay: 20, eggCol: '#dcb98f', size: 1.12, coop: 300,  lvl: 3 },
  sil: { price: 110, egg: 6, lay: 40, eggCol: '#efe4d2', size: 0.82, coop: 600,  lvl: 5 },
  leg: { price: 150, egg: 8, lay: 22, eggCol: '#a7cfc8', size: 0.95, coop: 700,  lvl: 7 },
  bra: { price: 260, egg: 7, lay: 30, eggCol: '#c9a07a', size: 1.30, coop: 1200, lvl: 10 },
};
const BREED_IDS = ['rir', 'orp', 'sil', 'leg', 'bra'];

// Feed. A portion feeds one bird for 2 hours. Hens only lay while their feeder has food; birds never go hungry in any other way.
// lay = laying-interval factor, grow/cap = size and plumage a growing bird gains per portion (up to cap), egg = trait bonus for chicks from eggs laid on it
const FEEDS = {
  basic:   { bag: 40, price: 60,  lvl: 1, lay: 1,   grow: 0,   cap: 0, egg: 0, col: '#c9a86b' },
  premium: { bag: 40, price: 160, lvl: 4, lay: .85, grow: .15, cap: 4, egg: 0, col: '#8fb35b' },
  show:    { bag: 40, price: 400, lvl: 8, lay: .8,  grow: .3,  cap: 8, egg: 2, col: '#e1b525' },
};
const FEED_IDS = ['basic', 'premium', 'show'];
const FEEDER_CAP = 80, EAT_EVERY = 2 * HOUR;

// Levels: XP from eggs, hatching, sales, shows and trophies. Each level unlocks something.
const TIER_LVL = { village: 1, county: 4, national: 9 };
const XP = { egg: 1, hatch: 15, sell: 5, coop: 30, land: 20, colour: 60, show: { village: [40, 25, 15], county: [100, 60, 40], national: [250, 150, 100] } };
const xpFor = L => L <= 1 ? 0 : Math.round(60 * (L - 1) ** 1.6);
function levelOf(xp) { let L = 1; while (L < MAX_LEVEL && xp >= xpFor(L + 1)) L++; return L; }
const plotsAllowed = L => Math.min(MAX_PLOTS, 2 + 2 * L);
const levelForPlots = n => Math.max(1, Math.ceil((n - 2) / 2));
const incAllowed = L => Math.min(8, 2 + Math.floor(L / 3));
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
  away_body:'If you stay away for more than 2 days, the farm pauses until you come back. Nest boxes stop filling at 12 eggs and feeders run down, so check in often.',
  saved_here:'Your farm is saved on this device only.', edited:'This save was changed outside the game.', reset:'Start a new farm', reset_done:'New farm started',
  welcome_title:'Welcome to your farm', welcome_1:'You start with a Red Barn, three Rhode Island Red hens and a rooster.',
  welcome_2:'Tap the egg above the coop to collect eggs, then sell them in the Hatchery or hatch the fertile ones. Keep the feeder full: hens only lay when they are fed.',
  welcome_3:'Each coop holds 5 birds. Level up to unlock new breeds and land, breed better birds, win rosettes at shows and decide whether to sell your champion or breed from it.',
  start:'Start farming',
  away_title:'While you were away', away_eggs:'{n} eggs laid', away_hatched:'{n} chicks hatched', away_retired:'{n} birds retired to the pasture', away_shows:'{n} show results', away_paused:'You were away more than 2 days, so the farm paused.',
  pasture:'Pasture', pasture_note:'Retired birds live here. They no longer lay, but you can rehome them.', pasture_empty:'No retired birds yet.',
  sign_build:'Build a coop', sign_sale:'For sale', build_here:'Choose a coop to build', crow:'Cock-a-doodle-doo!', cluck:'cluck',
  in_coop:'In the {coop}', grade:'Grade', egg_word:'egg', eggs_word:'eggs', sell_eggs_done:'Sold {e} eggs for {n} coins', collected:'+{n} eggs',
  coop_cap:'{a} of {b} birds', show_ready:'Show entries open', retired_toast:'{name} retired to the pasture',
  chick_in:'Grows up in {t}', rooster_sym:'♂', hen_sym:'♀', cap_max:'Coop is at full size',
  level:'Level', lvl_short:'Lv {n}', xp:'XP', level_up:'Level {n}!', level_up_body:'Your farm reached level {n}.', unlocks:'New at this level', next_unlocks:'Coming up',
  unlock_breed:'{breed} on sale', unlock_feed:'{feed} on sale', unlock_show:'{show}s', unlock_plots:'Up to {n} land plots', unlock_inc:'Up to {n} incubator slots', bonus_coins:'Bonus: {n} coins',
  next_level:'{n} XP to level {l}', locked_lvl:'Level {n}', locked_long:'Unlocks at level {n}', max_level:'Top level reached', progress:'Progress', how_xp:'Earn XP by collecting eggs, hatching chicks, selling birds, placing at shows and winning trophies.',
  trophy_won:'Trophy: {name} · +{xp} XP', new_colour:'New Silkie colour found: {col}! +{xp} XP', xp_gain:'+{n} XP',
  feed:'Feed', feeder:'Feeder', feed_store:'Feed store', feed_basic:'Layers’ pellets', feed_premium:'Premium mix', feed_show:'Show breeder’s ration',
  feed_basic_d:'Everyday feed. Hens lay as normal.', feed_premium_d:'Hens lay faster. Growing birds gain up to +4 size and plumage.', feed_show_d:'Hens lay fastest. Growing birds gain up to +8 size and plumage, and eggs give slightly better chicks.',
  bag:'Bag of {n} portions', buy_bag:'Buy a bag', portions:'{n} portions', in_store:'In your store: {n}', fill:'Fill', fill_all:'Fill every feeder', feeder_empty:'Feeder empty: the hens have stopped laying', feeder_low:'Feeder running low',
  feeder_level:'{n} of {max} portions', feed_lasts:'Lasts about {t}', no_feed_store:'You have none in store. Buy feed in the Market.', filled:'Feeders filled', hungry_toast:'{coop}: feeder is empty', away_hungry:'{n} feeders ran empty',
  feed_note:'A portion feeds one bird for 2 hours, also while you are away. When a feeder is empty, hens stop laying, but the birds stay healthy.', fed_boost:'Feed bonus +{n}', eating:'Eating: {feed}', none_left:'None left',
  move_to:'Move to another coop', move_none:'No other {coop} has room.', moved:'{name} moved to {coop}', plot_n:'Plot {n}', move_btn:'Move here',
  flock:'Flock', grades:'Grades', sort_value:'Value', sort_quality:'Quality', sort_age:'Youngest', all:'All', flock_empty:'No birds yet.', flock_count:'{n} birds',
  market_breeds:'Breeds', market_feed:'Feed', catalogue_note:'Every breed on the farm, when it unlocks and what it is worth.', bird_from:'Birds from', egg_value:'Egg value', lays:'Laying', per_day:'about {n} eggs a day', coop_cost:'Coop',
  colours:'Colours', discovered:'{a} of {b} found', rarity_1:'Common', rarity_2:'Uncommon', rarity_3:'Rare', rarity_4:'Very rare', show_std:'Show colour', not_found:'Not found yet', egg_colour:'Egg colour',
  desc_rir:'Hardy, friendly and a steady layer of brown eggs. The perfect first breed.', desc_orp:'Big, gentle and golden. Cream eggs and lots of cuddles.', desc_sil:'Fluffy as a cloud, with black skin and five toes. Eleven colours to discover by breeding.', desc_leg:'Crested and lively. Lays sky-blue eggs that sell for more.', desc_bra:'A gentle giant with feathered feet. Valuable birds and eggs.',
  chick_colours:'Likely chick colours', odds_note:'Each hen with the breeding rooster. Hidden genes can still surprise you.',
  m_first_sale:'Sell your first bird', m_coops10:'Own 10 coops', m_coops25:'Own 25 coops', m_allsil:'Find all 11 Silkie colours', trophy_xp:'+{n} XP',
  feed_short:'Feed', in_coop_n:'In {coop}', cap_n:'{n} birds',
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
  away_body:'Si vous partez plus de 2 jours, la ferme se met en pause jusqu’à votre retour. Les pondoirs s’arrêtent à 12 œufs et les mangeoires se vident : passez souvent.',
  saved_here:'Votre ferme est enregistrée sur cet appareil uniquement.', edited:'Cette sauvegarde a été modifiée hors du jeu.', reset:'Recommencer une ferme', reset_done:'Nouvelle ferme créée',
  welcome_title:'Bienvenue dans votre ferme', welcome_1:'Vous commencez avec une grange rouge, trois poules Rhode Island Red et un coq.',
  welcome_2:'Touchez l’œuf au-dessus du poulailler pour ramasser, puis vendez les œufs au couvoir ou faites éclore les œufs fécondés. Gardez la mangeoire pleine : les poules ne pondent que si elles sont nourries.',
  welcome_3:'Chaque poulailler accueille 5 volailles. Montez de niveau pour débloquer races et terrains, améliorez vos lignées, gagnez des rosettes et décidez : vendre votre champion ou le garder pour la reproduction ?',
  start:'Commencer',
  away_title:'Pendant votre absence', away_eggs:'{n} œufs pondus', away_hatched:'{n} poussins éclos', away_retired:'{n} volailles parties au pâturage', away_shows:'{n} résultats de concours', away_paused:'Vous êtes parti plus de 2 jours : la ferme s’est mise en pause.',
  pasture:'Pâturage', pasture_note:'Les volailles retraitées vivent ici. Elles ne pondent plus, mais vous pouvez les confier à une famille.', pasture_empty:'Aucune volaille retraitée pour le moment.',
  sign_build:'Construire', sign_sale:'À vendre', build_here:'Choisissez un poulailler à construire', crow:'Cocorico !', cluck:'cot cot',
  in_coop:'Dans : {coop}', grade:'Note', egg_word:'œuf', eggs_word:'œufs', sell_eggs_done:'{e} œufs vendus pour {n} pièces', collected:'+{n} œufs',
  coop_cap:'{a} volailles sur {b}', show_ready:'Inscriptions ouvertes', retired_toast:'{name} est parti(e) au pâturage',
  chick_in:'Adulte dans {t}', rooster_sym:'♂', hen_sym:'♀', cap_max:'Le poulailler est à sa taille maximale',
  level:'Niveau', lvl_short:'Niv. {n}', xp:'XP', level_up:'Niveau {n} !', level_up_body:'Votre ferme passe au niveau {n}.', unlocks:'Nouveau à ce niveau', next_unlocks:'Bientôt',
  unlock_breed:'{breed} en vente', unlock_feed:'{feed} en vente', unlock_show:'{show}', unlock_plots:'Jusqu’à {n} terrains', unlock_inc:'Jusqu’à {n} places de couveuse', bonus_coins:'Bonus : {n} pièces',
  next_level:'{n} XP avant le niveau {l}', locked_lvl:'Niveau {n}', locked_long:'Débloqué au niveau {n}', max_level:'Niveau maximum atteint', progress:'Progression', how_xp:'Gagnez de l’XP en ramassant les œufs, en faisant éclore des poussins, en vendant des volailles, en vous classant aux concours et en remportant des trophées.',
  trophy_won:'Trophée : {name} · +{xp} XP', new_colour:'Nouvelle couleur de poule soie : {col} ! +{xp} XP', xp_gain:'+{n} XP',
  feed:'Nourriture', feeder:'Mangeoire', feed_store:'Réserve', feed_basic:'Granulés pondeuses', feed_premium:'Mélange premium', feed_show:'Ration concours',
  feed_basic_d:'Aliment de tous les jours. Les poules pondent normalement.', feed_premium_d:'Les poules pondent plus vite. Les jeunes gagnent jusqu’à +4 en taille et en plumage.', feed_show_d:'Ponte la plus rapide. Les jeunes gagnent jusqu’à +8 en taille et en plumage, et les œufs donnent des poussins un peu meilleurs.',
  bag:'Sac de {n} portions', buy_bag:'Acheter un sac', portions:'{n} portions', in_store:'En réserve : {n}', fill:'Remplir', fill_all:'Remplir toutes les mangeoires', feeder_empty:'Mangeoire vide : les poules ne pondent plus', feeder_low:'La mangeoire se vide',
  feeder_level:'{n} portions sur {max}', feed_lasts:'Dure environ {t}', no_feed_store:'Votre réserve est vide. Achetez de la nourriture au marché.', filled:'Mangeoires remplies', hungry_toast:'{coop} : mangeoire vide', away_hungry:'{n} mangeoires se sont vidées',
  feed_note:'Une portion nourrit une volaille pendant 2 heures, même pendant votre absence. Quand la mangeoire est vide, les poules arrêtent de pondre, mais restent en bonne santé.', fed_boost:'Bonus nourriture +{n}', eating:'Mange : {feed}', none_left:'Plus rien',
  move_to:'Changer de poulailler', move_none:'Aucun autre poulailler « {coop} » n’a de place.', moved:'{name} a déménagé : {coop}', plot_n:'Terrain {n}', move_btn:'Installer ici',
  flock:'Troupeau', grades:'Notes', sort_value:'Valeur', sort_quality:'Qualité', sort_age:'Plus jeunes', all:'Toutes', flock_empty:'Pas encore de volailles.', flock_count:'{n} volailles',
  market_breeds:'Races', market_feed:'Nourriture', catalogue_note:'Toutes les races de la ferme, quand elles se débloquent et ce qu’elles valent.', bird_from:'Volailles dès', egg_value:'Prix de l’œuf', lays:'Ponte', per_day:'environ {n} œufs par jour', coop_cost:'Poulailler',
  colours:'Couleurs', discovered:'{a} sur {b} trouvées', rarity_1:'Courante', rarity_2:'Peu courante', rarity_3:'Rare', rarity_4:'Très rare', show_std:'Couleur de concours', not_found:'Pas encore trouvée', egg_colour:'Couleur de l’œuf',
  desc_rir:'Robuste, sociable, bonne pondeuse d’œufs bruns. La race idéale pour commencer.', desc_orp:'Grande, douce et dorée. Des œufs crème et beaucoup de câlins.', desc_sil:'Douce comme un nuage, peau noire et cinq doigts. Onze couleurs à découvrir par l’élevage.', desc_leg:'Huppée et vive. Pond des œufs bleu ciel qui se vendent plus cher.', desc_bra:'Un géant tranquille aux pattes emplumées. Volailles et œufs de valeur.',
  chick_colours:'Couleurs probables des poussins', odds_note:'Chaque poule avec le coq reproducteur. Les gènes cachés peuvent encore surprendre.',
  m_first_sale:'Vendre votre première volaille', m_coops10:'Avoir 10 poulaillers', m_coops25:'Avoir 25 poulaillers', m_allsil:'Trouver les 11 couleurs de poule soie', trophy_xp:'+{n} XP',
  feed_short:'Nourrir', in_coop_n:'Dans : {coop}', cap_n:'{n} volailles',
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
function colourOdds(a, b) {
  const keys = Object.keys(GENES), out = {};
  const rec = (i, g, p) => {
    if (i === keys.length) { const c = silkieColour(g); out[c] = (out[c] || 0) + p; return; }
    const k = keys[i];
    for (const x of a[k]) for (const y of b[k]) { g[k] = [x, y]; rec(i + 1, g, p / 4); }
  };
  rec(0, {}, 1);
  return Object.entries(out).sort((p, q) => q[1] - p[1]);
}
function inheritGeno(a, b) { const g = {}; for (const k in GENES) g[k] = [a[k][Math.random() < .5 ? 0 : 1], b[k][Math.random() < .5 ? 0 : 1]]; return g; }
// traits as the bird looks today: good feed while growing adds to size and plumage (not passed on to chicks)
function eff(b) { const x = b.traits, k = Math.floor(b.boost || 0); return k ? { ...x, size: Math.min(100, x.size + k), plum: Math.min(100, x.plum + k) } : x; }
function quality(b) { const x = eff(b); return Math.round(.3 * x.type + .3 * x.plum + .2 * x.size + .2 * x.lay); }
function showScoreBase(b) { const x = eff(b); return .4 * x.type + .35 * x.plum + .25 * x.size; }
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
    ribbons: [], champ: 0, seed: (Math.random() * 2 ** 31) | 0, nextLay: 0, entered: null, boost: 0,
  };
  if (o.breed === 'sil') { b.geno = o.geno; b.colour = silkieColour(o.geno); }
  return b;
}
function shopTraits() { const x = {}; for (const k of TRAITS) x[k] = clamp(Math.round(42 + gauss() * 9), 15, 70); return x; }
function childSpec(sire, dam, nour = 0) {
  const traits = {};
  for (const k of TRAITS) {
    let v = (sire.traits[k] + dam.traits[k]) / 2 + gauss() * 6 + nour;
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
    flags: { welcome: false, edited: false, grades: false },
    xp: 0, level: 1, trophies: [], seen: ['rir'], feed: { basic: 80, premium: 0, show: 0 },
  };
  for (const id of BREED_IDS) state.basket.plain[id] = 0;
  const coop = newCoop('rir', 0);
  state.coops.push(coop);
  for (let i = 0; i < 4; i++) {
    const b = makeBird({ breed: 'rir', sex: i < 3 ? 'h' : 'r', traits: shopTraits(), born: -(T.young + DAY * (.5 + Math.random())), home: coop.id });
    b.nextLay = 30e3 + Math.random() * 4 * MIN;
    state.birds.push(b);
  }
  refreshShop();
  createShow('village', 'rir');
}

function newCoop(breed, plot) { return { id: state.nextId++, breed, plot, nest: { plain: 0, fertile: [] }, sire: null, feeder: { basic: FEEDER_CAP, premium: 0, show: 0 }, acc: 0, last: 'basic', hungry: false }; }
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
    flags: { welcome: !!(s.flags && s.flags.welcome), edited: !!(s.flags && s.flags.edited), grades: !!(s.flags && s.flags.grades) },
    xp: 0, level: 1, trophies: [], seen: [], feed: { basic: 0, premium: 0, show: 0 },
  };
  const st = s.stats || {};
  for (const k of ['eggs', 'hatched', 'sold', 'earned', 'best', 'rare']) o.stats[k] = int(st[k], 0, 1e12, 0);
  if (Array.isArray(st.wins)) o.stats.wins = [0, 1, 2].map(i => int(st.wins[i], 0, 1e6, 0));
  for (const k in o.stats.w1) o.stats.w1[k] = int(st.w1 && st.w1[k], 0, 1e6, 0);
  const plots = new Set();
  for (const c of (Array.isArray(s.coops) ? s.coops : []).slice(0, MAX_PLOTS)) {
    const breed = okBreed(c && c.breed); const plot = int(c && c.plot, 0, o.plots - 1, -1);
    if (!breed || plot < 0 || plots.has(plot)) continue; plots.add(plot);
    const fd = c.feeder && typeof c.feeder === 'object' ? c.feeder : null, feeder = {};
    for (const k of FEED_IDS) feeder[k] = fd ? int(fd[k], 0, FEEDER_CAP, 0) : (k === 'basic' ? FEEDER_CAP : 0);
    let tot = FEED_IDS.reduce((n, k) => n + feeder[k], 0);
    for (const k of FEED_IDS) if (tot > FEEDER_CAP) { const cut = Math.min(feeder[k], tot - FEEDER_CAP); feeder[k] -= cut; tot -= cut; }
    o.coops.push({ id: int(c.id, 1, 1e9, o.nextId++), breed, plot, sire: Number.isInteger(c.sire) ? c.sire : null,
      nest: { plain: int(c.nest && c.nest.plain, 0, NEST_CAP, 0), fertile: (Array.isArray(c.nest && c.nest.fertile) ? c.nest.fertile : []).slice(0, NEST_CAP).map(okEgg).filter(Boolean) },
      feeder, acc: num(c.acc, 0, 5, 0), last: FEEDS[c.last] ? c.last : 'basic', hungry: !!c.hungry });
  }
  const coopIds = new Set(o.coops.map(c => c.id));
  for (const b of (Array.isArray(s.birds) ? s.birds : []).slice(0, MAX_BIRDS)) {
    const breed = okBreed(b && b.breed); if (!breed) continue;
    const home = b.home === 'pasture' ? 'pasture' : (coopIds.has(b.home) ? b.home : null); if (home == null) continue;
    const x = { id: int(b.id, 1, 1e9, o.nextId++), name: cleanName(b.name, 'Hen'), breed, sex: b.sex === 'r' ? 'r' : 'h', born: num(b.born, -1e13, 1e13, 0), home,
      traits: okTraits(b.traits), gen: int(b.gen, 1, 999, 1), sire: okParent(b.sire), dam: okParent(b.dam), line: int(b.line, 0, 4, 0),
      ribbons: (Array.isArray(b.ribbons) ? b.ribbons : []).slice(0, 60).map(r => ({ tier: TIERS[r && r.tier] ? r.tier : 'village', place: int(r && r.place, 1, 3, 3) })),
      champ: int(b.champ, 0, 99, 0), seed: int(b.seed, 0, 2 ** 31, 1), nextLay: num(b.nextLay, -1e13, 1e13, 0), entered: Number.isInteger(b.entered) ? b.entered : null, boost: num(b.boost, 0, 8, 0) };
    if (breed === 'sil') { x.geno = okGeno(b.geno, b.colour); x.colour = silkieColour(x.geno); }
    o.birds.push(x);
  }
  for (const id of BREED_IDS) o.basket.plain[id] = int(s.basket && s.basket.plain && s.basket.plain[id], 0, 1e5, 0);
  o.basket.fertile = (Array.isArray(s.basket && s.basket.fertile) ? s.basket.fertile : []).slice(0, 200).map(okEgg).filter(Boolean);
  o.inc.items = (Array.isArray(s.inc && s.inc.items) ? s.inc.items : []).slice(0, o.inc.slots).map(it => { const egg = okEgg(it && it.egg); return egg ? { egg, start: num(it.start, -1e13, 1e13, o.gt) } : null; }).filter(Boolean);
  o.shows.list = (Array.isArray(s.shows && s.shows.list) ? s.shows.list : []).slice(0, 6).map(x => x && TIERS[x.tier] ? ({ id: int(x.id, 1, 1e9, 1), tier: x.tier, cls: x.cls === 'any' ? 'any' : (okBreed(x.cls) || 'any'), town: TOWNS.includes(x.town) ? x.town : TOWNS[0], county: COUNTIES.includes(x.county) ? x.county : COUNTIES[0], opens: num(x.opens, -1e13, 1e13, 0), closes: num(x.closes, -1e13, 1e13, 0), entry: Number.isInteger(x.entry) ? x.entry : null }) : null).filter(Boolean);
  o.shows.history = (Array.isArray(s.shows && s.shows.history) ? s.shows.history : []).slice(0, 30).map(r => r && TIERS[r.tier] ? ({ tier: r.tier, show: cleanName(r.show, '').slice(0, 60) || '', town: TOWNS.includes(r.town) ? r.town : TOWNS[0], county: COUNTIES.includes(r.county) ? r.county : COUNTIES[0], bird: cleanName(r.bird, '?'), place: int(r.place, 1, 99, 9), prize: int(r.prize, 0, 1e6, 0), gt: num(r.gt, -1e13, 1e13, 0) }) : null).filter(Boolean);
  // progress: older saves have no XP yet, so give credit for what the farm has already done
  const st0 = o.stats;
  const earnedXp = st0.eggs + XP.hatch * st0.hatched + XP.sell * st0.sold + 40 * st0.wins[0] + 25 * st0.wins[1] + 15 * st0.wins[2];
  o.xp = typeof s.xp === 'number' ? int(s.xp, 0, 1e9, 0) : earnedXp;
  o.level = levelOf(o.xp);
  const TROPHY_IDS = ['m_first_sale', 'm_hatch10', 'm_coops', 'm_coops10', 'm_coops25', 'm_rare', 'm_allsil', 'm_aplus', 'm_perfect', 'm_village', 'm_county', 'm_national'];
  o.trophies = (Array.isArray(s.trophies) ? s.trophies : []).filter(x => TROPHY_IDS.includes(x)).filter((x, i, a) => a.indexOf(x) === i);
  const KINDS = [...BREED_IDS.filter(k => k !== 'sil'), ...Object.keys(SIL).map(c => 'sil_' + c)];
  o.seen = (Array.isArray(s.seen) ? s.seen : []).filter(x => KINDS.includes(x)).filter((x, i, a) => a.indexOf(x) === i);
  for (const b of o.birds) { const k = b.breed === 'sil' ? 'sil_' + b.colour : b.breed; if (!o.seen.includes(k)) o.seen.push(k); }
  const fs = s.feed && typeof s.feed === 'object' ? s.feed : null;
  for (const k of FEED_IDS) o.feed[k] = fs ? int(fs[k], 0, 1e6, 0) : (k === 'basic' ? 80 : 0);
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
function coopWithSpace(breed, not) { return state.coops.filter(c => c.breed === breed && c !== not && birdsIn(c).length < COOP_CAP).sort((a, b) => a.plot - b.plot)[0] || null; }
const feederTotal = c => FEED_IDS.reduce((n, k) => n + c.feeder[k], 0);
function coopLabel(c) {
  const same = state.coops.filter(x => x.breed === c.breed).sort((a, b) => a.plot - b.plot);
  return t('coop_' + c.breed) + (same.length > 1 ? ' ' + (same.indexOf(c) + 1) : '');
}
const unlocked = id => BREEDS[id].lvl <= state.level;
function emit(kind, text, gold) { if (sink) { sink[kind] = (sink[kind] || 0) + 1; sink.any = true; } else if (text) toast(text, gold); }

function advance(dt) {
  let left = dt;
  while (left > 0) { const d = Math.min(left, MIN); state.gt += d; left -= d; simStep(); }
}
function eat(coop, birds) {
  const kind = ['show', 'premium', 'basic'].find(k => coop.feeder[k] > 0);
  if (!kind) { if (!coop.hungry) { coop.hungry = true; emit('hungry', t('hungry_toast', { coop: coopLabel(coop) })); } return; }
  coop.feeder[kind]--; coop.last = kind; coop.hungry = false;
  const F = FEEDS[kind], b = pick(birds);                       // whoever gets to the feeder first
  if (F.grow && b && (stage(b) === 'chick' || stage(b) === 'young') && (b.boost || 0) < F.cap) b.boost = Math.min(F.cap, (b.boost || 0) + F.grow);
}
function simStep() {
  const gt = state.gt;
  for (const c of state.coops) {
    const birds = birdsIn(c); if (!birds.length) continue;
    c.acc += birds.reduce((n, b) => n + (stage(b) === 'chick' ? .5 : 1), 0) * MIN / EAT_EVERY;
    while (c.acc >= 1) { c.acc -= 1; eat(c, birds); }
  }
  for (const b of state.birds) {
    if (b.home === 'pasture') continue;
    const age = gt - b.born;
    if (age >= T.retire) { retire(b); emit('retired', t('retired_toast', { name: b.name })); continue; }
    if (b.sex === 'h' && age >= T.young) {
      const coop = coopById(b.home);
      if (!b.nextLay || b.nextLay < b.born + T.young) b.nextLay = gt + layInterval(b) * Math.random();
      if (gt >= b.nextLay) {
        const fed = coop && feederTotal(coop) > 0;
        if (fed && nestCount(coop) < NEST_CAP) { layEgg(b, coop); emit('eggs'); }
        b.nextLay = gt + layInterval(b) * (fed ? FEEDS[coop.last].lay : .5);
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
    coop.nest.fertile.push({ id: state.nextId++, child: childSpec(sire, hen, FEEDS[coop.last].egg), sire: { name: sire.name, q: quality(sire) }, dam: { name: hen.name, q: quality(hen) }, laid: state.gt });
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
  gainXP(XP.hatch); see(b);
}
function refreshShop() {
  const owned = BREED_IDS.filter(id => state.coops.some(c => c.breed === id));
  const open = BREED_IDS.filter(unlocked);
  const offers = [];
  for (let i = 0; i < 6; i++) {
    const breed = (i < 3 && owned.length) ? pick(owned) : pick(open);
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
  while (TIER_LVL[tier] > state.level) tier = tier === 'national' ? 'county' : 'village';
  const mine = BREED_IDS.filter(id => state.birds.some(b => b.breed === id && b.home !== 'pasture'));
  cls = cls || (Math.random() < .25 ? 'any' : Math.random() < .7 && mine.length ? pick(mine) : pick(BREED_IDS.filter(unlocked)));
  state.shows.list.push({ id: state.nextId++, tier, cls, town: pick(TOWNS), county: pick(COUNTIES), opens: state.gt, closes: state.gt + SHOW_OPEN, entry: null });
  emit('showsNew', t('show_ready') + ' · ' + showName(state.shows.list[state.shows.list.length - 1]));
  dirty = true;
}
function showName(s) { return t('show_name_' + s.tier, { town: s.town, county: s.county }); }
function canEnter(b, s) {
  if (!b || b.home === 'pasture' || !isGrown(b) || TIER_LVL[s.tier] > state.level) return false;
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
    gainXP(XP.show[s.tier][place - 1]);
  }
  state.shows.history.unshift({ tier: s.tier, show: '', town: s.town, county: s.county, bird: b.name, place, prize, gt: state.gt });
  state.shows.history = state.shows.history.slice(0, 30);
  emit('shows', t('result_toast', { name: b.name, place: place <= 3 ? placeLabel(place) : t('not_placed').toLowerCase(), show: showName(s) }) + (prize ? ' · ' + t('prize_won', { n: fmtN(prize) }) : ''), place <= 3);
  dirty = true;
}
function addCoins(n) { state.coins = Math.min(1e12, state.coins + n); state.stats.earned += n; }

/* ---------- levels, trophies and discoveries ---------- */
function gainXP(n) {
  state.xp = Math.min(1e9, state.xp + Math.max(0, Math.round(n)));
  const L = levelOf(state.xp);
  while (state.level < L) {
    state.level++;
    addCoins(50 * state.level);
    if (sink) { sink.levels = state.level; sink.any = true; }
    else { pendingLevel = state.level; }
    refreshShopIfNew();
  }
  dirty = true;
}
let pendingLevel = 0;
function refreshShopIfNew() { if (BREED_IDS.some(id => BREEDS[id].lvl === state.level)) refreshShop(); }
function unlocksAt(L) {
  const out = [];
  for (const id of BREED_IDS) if (BREEDS[id].lvl === L) out.push(['breed', id]);
  for (const k of FEED_IDS) if (FEEDS[k].lvl === L && L > 1) out.push(['feed', k]);
  for (const k in TIER_LVL) if (TIER_LVL[k] === L && L > 1) out.push(['show', k]);
  if (plotsAllowed(L) > plotsAllowed(L - 1)) out.push(['plots', plotsAllowed(L)]);
  if (incAllowed(L) > incAllowed(L - 1)) out.push(['inc', incAllowed(L)]);
  return out;
}
function unlockText([kind, v]) {
  if (kind === 'breed') return t('unlock_breed', { breed: t('br_' + v) });
  if (kind === 'feed') return t('unlock_feed', { feed: t('feed_' + v) });
  if (kind === 'show') return t('unlock_show', { show: t('t_' + v) });
  if (kind === 'plots') return t('unlock_plots', { n: v });
  return t('unlock_inc', { n: v });
}
function see(b) {
  const k = b.breed === 'sil' ? 'sil_' + b.colour : b.breed;
  if (state.seen.includes(k)) return;
  state.seen.push(k);
  if (b.breed === 'sil' && state.seen.filter(x => x.startsWith('sil_')).length > 1) { gainXP(XP.colour); emit('colours', t('new_colour', { col: t('col_' + b.colour), xp: XP.colour }), true); }
}
const bestBred = () => Math.max(state.stats.best, ...state.birds.filter(b => b.gen > 1).map(quality), 0);
const TROPHIES = [
  ['m_first_sale', 50, () => state.stats.sold > 0],
  ['m_hatch10', 150, () => state.stats.hatched >= 10],
  ['m_coops', 300, () => BREED_IDS.every(id => state.coops.some(c => c.breed === id))],
  ['m_coops10', 300, () => state.coops.length >= 10],
  ['m_coops25', 700, () => state.coops.length >= 25],
  ['m_rare', 250, () => state.stats.rare > 0],
  ['m_allsil', 800, () => Object.keys(SIL).every(c => state.seen.includes('sil_' + c))],
  ['m_aplus', 300, () => bestBred() >= 75],
  ['m_perfect', 1000, () => bestBred() >= 95],
  ['m_village', 150, () => state.stats.w1.village > 0],
  ['m_county', 400, () => state.stats.w1.county > 0],
  ['m_national', 1000, () => state.stats.w1.national > 0],
];
function checkTrophies() {
  for (const [id, xp, test] of TROPHIES) {
    if (state.trophies.includes(id) || !test()) continue;
    state.trophies.push(id); gainXP(xp);
    emit('trophies', t('trophy_won', { name: t(id), xp }), true);
  }
}

/* ---------- player actions (each re-checks its own rules) ---------- */
function plotPrice() { return state.plots >= MAX_PLOTS ? 1e9 : Math.round(250 * 1.16 ** (state.plots - 2) / 50) * 50; }
function coopPrice(breed) { const n = state.coops.filter(c => c.breed === breed).length; return Math.round(BREEDS[breed].coop * (1 + .2 * n) / 10) * 10; }
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
  state.birds.push(b); state.shop.offers.splice(i, 1); see(b);
  toast(t('bought', { name: b.name, coop: t('coop_' + b.breed) })); changed();
}
function offerPrice(o) { const fake = { ...o, home: 0, champ: 0, line: 0 }; return value(fake); }
function actSell(b) {
  if (!birdById(b.id)) return;
  const p = b.home === 'pasture' ? Math.max(1, Math.round(value(b))) : sellPrice(b);
  addCoins(p); state.stats.sold++; gainXP(XP.sell + p / 20);
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
  if (n) { toast(t('collected', { n }) + ' · ' + t('xp_gain', { n: n * XP.egg })); gainXP(n * XP.egg); } if (nestCount(coop) && basketCount() >= state.basketCap) toast(t('basket_full'));
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
  if (!unlocked(breed)) return;
  const plot = freePlot(); if (plot < 0) { toast(t('need_plot')); return; }
  if (!spend(coopPrice(breed))) return;
  const c = newCoop(breed, plot); c.feeder.basic = 0;
  const give = Math.min(FEEDER_CAP, state.feed.basic); c.feeder.basic = give; state.feed.basic -= give;
  state.coops.push(c); gainXP(XP.coop);
  closeSheet(); changed(); scrollToPlot(plot);
}
function actBuyPlot() { if (state.plots >= plotsAllowed(state.level)) return; if (!spend(plotPrice())) return; state.plots++; gainXP(XP.land); changed(); }
function actIncSlot() { if (state.inc.slots >= incAllowed(state.level)) return; if (!spend(incPrice())) return; state.inc.slots++; changed(); }
function actBuyFeed(kind, bags = 1) {
  const F = FEEDS[kind]; if (!F || F.lvl > state.level) return;
  if (!spend(F.price * bags)) return;
  state.feed[kind] += F.bag * bags; toast(t('portions', { n: F.bag * bags }) + ' · ' + t('feed_' + kind)); changed();
}
function fillCoop(c, kind) {
  const room = FEEDER_CAP - feederTotal(c), n = Math.min(room, state.feed[kind]);
  if (n <= 0) return 0;
  c.feeder[kind] += n; state.feed[kind] -= n; c.hungry = false; return n;
}
function actFill(c, kind) { if (!state.feed[kind]) { toast(t('no_feed_store')); return; } if (fillCoop(c, kind)) changed(); }
function actFillAll(kind) {
  if (!state.feed[kind]) { toast(t('no_feed_store')); return; }
  let n = 0; for (const c of [...state.coops].sort((a, b) => feederTotal(a) - feederTotal(b))) n += fillCoop(c, kind);
  if (n) { toast(t('filled')); changed(); }
}
function actMove(b, coop) {
  if (!birdById(b.id) || b.home === 'pasture' || coop.breed !== b.breed || coop.id === b.home || birdsIn(coop).length >= COOP_CAP) return;
  for (const c of state.coops) if (c.sire === b.id) c.sire = null;
  b.home = coop.id; resetAgent(b);
  toast(t('moved', { name: b.name, coop: coopLabel(coop) })); changed();
}
function actBasket() { if (state.basketCap >= 1000) return; if (!spend(basketPrice())) return; state.basketCap += 40; changed(); }
function actEnter(b, s) {
  if (!canEnter(b, s) || s.entry || s.judged) return;
  if (!spend(TIERS[s.tier].fee)) return;
  s.entry = b.id; b.entered = s.id; toast(t('entered_bird', { name: b.name })); changed();
}

/* =====================================================================
   8. ART: pre-rendered map, plot overlays, trees, birds, frogs and grass (made in Blender)
   ===================================================================== */
const DATA = {geom:{size:[10,10],slots:[],tufts:[],frogSpots:[[0,0]],pond:{c:[0,0],eu:[1,0],ev:[0,1]}},spr:{},trees:[],props:{},ov:[0,0],cards:[]};
const GEOM = DATA.geom, SPR = DATA.spr, TREES = DATA.trees, PROPS = DATA.props, OV = DATA.ov, CARDS = new Set(DATA.cards);
const BIRD_UNIT = 50;                 // map pixels per Blender unit: a hen stands about 0.6 m tall, a touch larger than life
const IMG = new Map();
function img(src) {
  let im = IMG.get(src);
  if (!im) { im = new Image(); im.decoding = 'async'; im.src = src; im.onload = () => { dirty = true; }; IMG.set(src, im); }
  return im;
}
const ready = im => im.complete && im.naturalWidth > 0;
function rrect(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2); }
const kindKey = b => b.breed === 'sil' ? 'sil_' + (SIL[b.colour] ? b.colour : 'white') : b.breed;
function spriteFor(b, pose) {
  const k = kindKey(b);
  if (stage(b) === 'chick') { const n = 'chick_' + k + (pose === 'walk1' || pose === 'walk2' ? '_' + pose : ''); return SPR[n] ? n : SPR['chick_' + k] ? 'chick_' + k : null; }
  const n = pose + '_' + k + '_' + b.sex;
  return SPR[n] ? n : SPR['farm_' + k + '_' + b.sex] ? 'farm_' + k + '_' + b.sex : null;
}
function cardSrc(b) {
  const k = kindKey(b), n = stage(b) === 'chick' ? 'card_chick_' + k : 'card_' + k + '_' + b.sex;
  return CARDS.has(n) ? 'img/b/' + n + '.webp' : '';
}
const kindCard = (k, sex) => CARDS.has('card_' + k + '_' + sex) ? `img/b/card_${k}_${sex}.webp` : '';
const ovSrc = (kind, deg) => `img/ov/ov_${kind}_${deg}.webp`;
const atlas = k => img(`img/atlas/${k}.webp`);
/* draw an atlas sprite with its foot point at (x, y); sx may be negative to face left */
function drawSprite(name, x, y, sx, sy) {
  const s = SPR[name]; if (!s) return false;
  const im = atlas(s.a); if (!ready(im)) return false;
  ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
  ctx.drawImage(im, s.x, s.y, s.w, s.h, -s.ax, -s.ay, s.w, s.h);
  ctx.restore(); return true;
}

/* map pixels <-> local ground metres of a plot (an affine map, since the camera is orthographic) */
function toMap(f, lx, ly, z = 0) { return [f.c[0] + lx * f.ex[0] + ly * f.ey[0] + z * GEOM.ez[0], f.c[1] + lx * f.ex[1] + ly * f.ey[1] + z * GEOM.ez[1]]; }
function toLocal(f, x, y) {
  const dx = x - f.c[0], dy = y - f.c[1], det = f.ex[0] * f.ey[1] - f.ey[0] * f.ex[1];
  return [(dx * f.ey[1] - dy * f.ey[0]) / det, (f.ex[0] * dy - f.ex[1] * dx) / det];
}
const YARD = { x0: -1.35, x1: 1.35, y0: -1.22, y1: -0.42 };      // trodden earth in front of each coop, in metres
const PASTURE_YARD = { x0: -2.5, x1: 2.4, y0: -1.9, y1: 0.3 };

/* =====================================================================
   9. SCENE: LAYOUT, BEHAVIOUR, DRAWING, TOUCH
   ===================================================================== */
const cv = $('#farm'), ctx = cv.getContext('2d');
const plotCache = new Map(), spriteCache = new Map();
const view = { vw: 0, vh: 0, dpr: 1, s: 1, x: 0, y: 0, minS: .3, maxS: 1.6, init: false };
const agents = new Map();
const ui = { grades: false };
let plots = [], clock = 0, dirty = false, uiDirty = false;

function buildPlots() {
  plots = [];
  const allowed = plotsAllowed(state.level);
  for (let i = 0; i < MAX_PLOTS; i++) {
    const f = GEOM.slots[i], coop = state.coops.find(c => c.plot === i);
    let p;
    if (coop) p = { kind: 'coop', breed: coop.breed, coop };
    else if (i < state.plots) p = { kind: 'empty' };
    else p = { kind: 'sale', next: i === state.plots, locked: i >= allowed, price: plotPrice() };
    p.f = f; p.idx = i; plots.push(p);
  }
  plots.push({ kind: 'pasture', f: GEOM.pasture, idx: -1 });
}
function layout() {
  const r = cv.getBoundingClientRect();
  view.vw = Math.max(1, r.width); view.vh = Math.max(1, r.height); view.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.round(view.vw * view.dpr); cv.height = Math.round(view.vh * view.dpr);
  const [W, H] = GEOM.size;
  view.minS = Math.max(view.vw / W, view.vh / H, .3);
  view.maxS = Math.max(view.minS, 1.6);
  if (!view.init) {             // first look: the farmhouse and the first coops
    view.s = clamp(view.vw / 800, view.minS, 1.1);
    view.x = W / 2 - view.vw / view.s / 2; view.y = 10;
    view.init = true;
  }
  view.s = clamp(view.s, view.minS, view.maxS);
  buildPlots(); clampCam();
}
function clampCam() {
  const [W, H] = GEOM.size;
  view.x = clamp(view.x, 0, Math.max(0, W - view.vw / view.s));
  view.y = clamp(view.y, 0, Math.max(0, H - view.vh / view.s));
}
function zoomAt(sx, sy, ns) {
  ns = clamp(ns, view.minS, view.maxS);
  const wx = view.x + sx / view.s, wy = view.y + sy / view.s;
  view.s = ns; view.x = wx - sx / ns; view.y = wy - sy / ns; clampCam();
}
function plotOfBird(b) { if (b.home === 'pasture') return plots[plots.length - 1]; return plots.find(p => p.kind === 'coop' && p.coop.id === b.home); }
const yardOf = p => p.kind === 'pasture' ? PASTURE_YARD : YARD;

/* ---------- chickens: short stop-and-go walks, pecking bouts, chatting, dust baths ---------- */
function resetAgent(b) { agents.delete(b.id); }
function agentFor(b) {
  let a = agents.get(b.id); const p = plotOfBird(b); if (!p) return null;
  const key = p.kind === 'pasture' ? 'pasture' : 'coop' + p.coop.id;
  if (a && a.key === key) { a.plot = p; return a; }
  const y = yardOf(p), face = Math.random() < .5 ? 1 : -1;
  a = { key, plot: p, x: lerp(y.x0, y.x1, Math.random()), y: lerp(y.y0, y.y1, Math.random()), tx: 0, ty: 0, st: 'idle', t: Math.random() * 2,
        face, fx: face, dist: 0, go: 0, head: 0, headT: 0, pose: 'farm', prev: null, fade: 0, say: 0, sayText: '', sx: null, sy: null };
  agents.set(b.id, a);
  return a;
}
function decide(b, a, others) {
  const y = yardOf(a.plot), st = stage(b), r = Math.random(), old = st === 'retired';
  a.st = 'idle'; a.t = .8 + Math.random() * 2.2; a.chatWith = null;
  if (st === 'chick') {
    const mom = others.find(o => o.b.sex === 'h' && isGrown(o.b) && (b.dam && o.b.name === b.dam.name)) || others.find(o => o.b.sex === 'h' && isGrown(o.b));
    if (mom && r < .6) { a.st = 'follow'; a.leader = mom.a; a.t = 2 + Math.random() * 3; a.off = [(Math.random() - .5) * .3, -.1 - Math.random() * .15]; return; }
  }
  if (r < .34) {           // a short walk: chickens potter a step or two, then stop
    const ang = Math.random() * Math.PI * 2, d = .2 + Math.random() * (old ? .4 : .7);
    a.st = 'walk'; a.tx = clamp(a.x + Math.cos(ang) * d, y.x0, y.x1); a.ty = clamp(a.y + Math.sin(ang) * d * .6, y.y0, y.y1); a.go = 0; a.t = 8;
  }
  else if (r < .64) { a.st = 'peck'; a.t = 2 + Math.random() * 3.5; a.head = 0; a.headT = .2 + Math.random() * .5; }
  else if (r < .74 && others.length) {
    const o = pick(others); if (o.a.st === 'idle' || o.a.st === 'peck') { a.st = 'walk'; a.tx = clamp(o.a.x - .3 * Math.sign(o.a.x - a.x || 1), y.x0, y.x1); a.ty = clamp(o.a.y + (Math.random() - .5) * .08, y.y0, y.y1); a.chatWith = o.a; a.go = 0; a.t = 10; }
  }
  else if (r < .8 && b.sex === 'h' && st !== 'chick' && !old) { a.st = 'dust'; a.t = 4 + Math.random() * 4; }
  else if (r < .84 && b.sex === 'r' && st !== 'chick') { a.st = 'crow'; a.t = 2; a.say = 2; a.sayText = t('crow'); }
  else if (r < .92) { a.face = -a.face; a.t = .6 + Math.random() * 1.4; }    // looks the other way
}
function screenDx(p, dx, dy) { return dx * p.f.ex[0] + dy * p.f.ey[0]; }
function updateAgents(dt) {
  const byPlot = new Map();
  for (const b of state.birds) { const a = agentFor(b); if (!a) continue; a.b = b; if (!byPlot.has(a.plot)) byPlot.set(a.plot, []); byPlot.get(a.plot).push({ b, a }); }
  for (const [p, list] of byPlot) {
    const y = yardOf(p);
    for (const { b, a } of list) {
      const st = stage(b), chick = st === 'chick', slow = st === 'retired' ? .7 : 1;
      const spd = (chick ? .3 : b.breed === 'sil' ? .17 : .22) * slow;   // metres per second
      a.t -= dt; if (a.say > 0) a.say -= dt; if (a.fade > 0) a.fade -= dt;
      let pose = 'farm';
      if (a.st === 'walk' || a.st === 'follow') {
        if (a.st === 'follow' && a.leader) { a.tx = clamp(a.leader.x + a.off[0], y.x0, y.x1); a.ty = clamp(a.leader.y + a.off[1], y.y0, y.y1); }
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        if (d > .015) {
          const ease = clamp(Math.min(a.go + .05, d) / .12, .35, 1);            // speed up and slow down gently
          const s = Math.min(d, spd * ease * dt); a.x += dx / d * s; a.y += dy / d * s; a.go += s; a.dist += s;
          const sdx = screenDx(p, dx, dy); if (Math.abs(sdx) > 2) a.face = sdx > 0 ? 1 : -1;
          const step = chick ? .028 : .045, ph = Math.floor(a.dist / step) % 4;
          pose = ph === 0 ? 'walk1' : ph === 2 ? 'walk2' : 'farm';
        } else if (a.st === 'walk') {
          if (a.chatWith) {
            const sdx = screenDx(p, a.chatWith.x - a.x, a.chatWith.y - a.y);
            a.face = Math.sign(sdx) || 1; a.chatWith.face = -a.face; a.st = 'chat'; a.t = 1.2 + Math.random() * 1.5;
            if (Math.random() < .45) { a.say = 1.2; a.sayText = t('cluck'); }
          } else { a.st = 'idle'; a.t = .4 + Math.random() * 1.2; }
        }
        if (a.st === 'follow' && a.t <= 0) a.st = 'idle';
      } else if (a.st === 'peck') {
        a.headT -= dt;
        if (a.headT <= 0) { a.head = 1 - a.head; a.headT = a.head ? .25 + Math.random() * .35 : .35 + Math.random() * .9; if (!a.head && Math.random() < .3) { a.tx = clamp(a.x + (Math.random() - .5) * .12, y.x0, y.x1); a.ty = a.y; } }
        if (a.head) pose = 'peck';
        else if (Math.abs(a.tx - a.x) > .01) { const s = Math.min(Math.abs(a.tx - a.x), spd * .5 * dt) * Math.sign(a.tx - a.x); a.x += s; a.dist += Math.abs(s); const ph = Math.floor(a.dist / .045) % 4; pose = ph === 0 ? 'walk1' : ph === 2 ? 'walk2' : 'farm'; }
      }
      if (pose !== a.pose) { a.prev = a.pose; a.pose = pose; a.fade = .09; }
      a.fx += (a.face - a.fx) * Math.min(1, dt * 12);          // turning round takes a moment
      a.x = clamp(a.x, y.x0, y.x1); a.y = clamp(a.y, y.y0, y.y1);
      if (a.t <= 0 && a.st !== 'walk') decide(b, a, list.filter(o => o.b !== b));
      if (a.st === 'walk' && a.t <= 0) a.st = 'idle';
    }
  }
}

/* ---------- the living farm: wind, trees, grass, pond, frogs, butterflies, clouds ---------- */
const wind = tt => .55 + .3 * Math.sin(tt * .23) + .15 * Math.sin(tt * .71 + 1.3);
function sway(x, amp) { return amp * wind(clock) * Math.sin(clock * 1.35 + x * .006) + amp * .25 * Math.sin(clock * 3.1 + x * .02); }
let shimmer = null, cloudCv = null;
function makeShimmer() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'); const r = rngFrom(9);
  for (let i = 0; i < 70; i++) { const x = r() * 512, y = r() * 256, w = 18 + r() * 50; const gr = g.createRadialGradient(x, y, 0, x, y, w); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.save(); g.translate(x, y); g.scale(1, .18); g.translate(-x, -y); g.beginPath(); g.arc(x, y, w, 0, 7); g.fill(); g.restore(); }
  return c;
}
function makeCloud() {
  const c = document.createElement('canvas'); c.width = 900; c.height = 520; const g = c.getContext('2d'); const r = rngFrom(4);
  for (let i = 0; i < 9; i++) { const x = 180 + r() * 540, y = 140 + r() * 240, w = 110 + r() * 150; const gr = g.createRadialGradient(x, y, 0, x, y, w); gr.addColorStop(0, 'rgba(18,28,40,.12)'); gr.addColorStop(1, 'rgba(18,28,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 900, 520); }
  return c;
}
const clouds = [{ x: 200, y: 400, v: 7 }, { x: 1300, y: 1700, v: 5.5 }, { x: 600, y: 3000, v: 6.3 }];
const ripples = [];
function pondPoint(a, r) { const P = GEOM.pond; return [P.c[0] + Math.cos(a) * P.eu[0] * r, P.c[1] + Math.sin(a) * P.ev[1] * r]; }
const frogs = Array.from({ length: 4 }, (_, i) => ({ spot: (i * 4) % GEOM.frogSpots.length, st: 'sit', t: 2 + Math.random() * 6, face: Math.random() < .5 ? 1 : -1, x: 0, y: 0, z: 0, from: null, to: null, dur: 0, puff: 0 }));
for (const f of frogs) [f.x, f.y] = GEOM.frogSpots[f.spot];
function frogHop(f, toWater) {
  const S = GEOM.frogSpots;
  f.from = [f.x, f.y];
  if (toWater) { const P = GEOM.pond; f.to = [lerp(f.x, P.c[0], .25), lerp(f.y, P.c[1], .25)]; f.st = 'dive'; }
  else { f.spot = (f.spot + (Math.random() < .5 ? 1 : S.length - 1)) % S.length; f.to = S[f.spot]; f.st = 'hop'; }
  f.dur = .42; f.t = 0; f.face = f.to[0] >= f.x ? 1 : -1;
}
function updateLife(dt) {
  for (const f of frogs) {
    if (f.st === 'sit') { f.t -= dt; if (f.puff > 0) f.puff -= dt; else if (Math.random() < dt * .08) f.puff = .5; if (f.t <= 0) frogHop(f, Math.random() < .18); }
    else if (f.st === 'hop' || f.st === 'dive') {
      f.t += dt; const k = Math.min(1, f.t / f.dur);
      f.x = lerp(f.from[0], f.to[0], k); f.y = lerp(f.from[1], f.to[1], k); f.z = Math.sin(k * Math.PI) * 16;
      if (k >= 1) { f.z = 0; if (f.st === 'dive') { ripples.push({ x: f.x, y: f.y, t: 0, big: 1 }); f.st = 'water'; f.t = 6 + Math.random() * 10; } else { f.st = 'sit'; f.t = 2 + Math.random() * 7; } }
    } else if (f.st === 'water') { f.t -= dt; if (f.t <= 0) { f.spot = Math.floor(Math.random() * GEOM.frogSpots.length); [f.x, f.y] = GEOM.frogSpots[f.spot]; ripples.push({ x: f.x, y: f.y - 4, t: 0, big: 1 }); f.st = 'sit'; f.t = 3 + Math.random() * 5; } }
  }
  if (Math.random() < dt * .7) { const a = Math.random() * 7, r = Math.sqrt(Math.random()) * .8; const [x, y] = pondPoint(a, r); ripples.push({ x, y, t: 0, big: 0 }); }
  for (const r of ripples) r.t += dt;
  while (ripples.length && ripples[0].t > 2) ripples.shift();
  for (const c of clouds) { c.x += c.v * dt; c.y += c.v * .35 * dt; if (c.x > GEOM.size[0] + 200) { c.x = -900; c.y = Math.random() * GEOM.size[1]; } if (c.y > GEOM.size[1] + 100) c.y = -500; }
  for (const b of butterflies) {
    b.t -= dt; if (b.t <= 0) { const tf = pick(GEOM.tufts); b.tx = tf[0] + (Math.random() - .5) * 40; b.ty = tf[1] - 10; b.t = 3 + Math.random() * 5; }
    const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(d, 38 * dt);
    b.x += dx / d * sp + Math.sin(clock * 3 + b.ph) * 18 * dt; b.y += dy / d * sp + Math.cos(clock * 4.2 + b.ph) * 14 * dt; b.face = dx >= 0 ? 1 : -1;
  }
}
const butterflies = [['#f5f1e6', 1], ['#f3c94a', 2], ['#e9873a', 3], ['#f5f1e6', 4]].map(([col, ph]) => { const tf = GEOM.tufts[(ph * 37) % GEOM.tufts.length]; return { col, ph, x: tf[0], y: tf[1] - 12, tx: tf[0], ty: tf[1], t: 0, face: 1 }; });

function drawPond() {
  const P = GEOM.pond, rx = P.eu[0], ry = -P.ev[1];
  ctx.save(); ctx.beginPath(); ctx.ellipse(P.c[0], P.c[1], rx * .97, ry * .95, 0, 0, Math.PI * 2); ctx.clip();
  if (!shimmer) shimmer = makeShimmer();
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .22;
  for (const [sp, off] of [[9, 0], [-6, 130]]) {
    const ox = ((clock * sp) % 512 + 512) % 512;
    for (let x = P.c[0] - rx - 512 + ox; x < P.c[0] + rx; x += 512) for (let y = P.c[1] - ry - off % 256; y < P.c[1] + ry; y += 256) ctx.drawImage(shimmer, x, y);
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  for (const r of ripples) {
    const k = r.t / 2, R = (r.big ? 34 : 18) * (.2 + k);
    ctx.strokeStyle = `rgba(230,245,250,${(r.big ? .55 : .35) * (1 - k)})`; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, R, R * .62, 0, 0, Math.PI * 2); ctx.stroke();
    if (r.big && k < .6) { ctx.beginPath(); ctx.ellipse(r.x, r.y, R * .55, R * .34, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
}
function drawWind(vx0, vy0, vx1, vy1) {
  if (!shimmer) shimmer = makeShimmer();
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = .28 * wind(clock);
  const ox = (clock * 34) % 512, oy = (clock * 9) % 256;
  ctx.scale(2, 2);
  for (let x = Math.floor((vx0 / 2 - ox) / 512) * 512 + ox; x < vx1 / 2; x += 512) for (let y = Math.floor((vy0 / 2 - oy) / 256) * 256 + oy; y < vy1 / 2; y += 256) ctx.drawImage(shimmer, x, y);
  ctx.restore();
}
function drawTree(tr) {
  const im = atlas('trees'); if (!ready(im)) return;
  const k = tr.k, sk = sway(tr.base[0], .016);
  ctx.save(); ctx.translate(tr.base[0], tr.base[1]); ctx.transform(1, 0, -sk, 1, 0, 0);
  ctx.drawImage(im, tr.x, tr.y, tr.w, tr.h, -tr.ax * k, -tr.ay * k, tr.w * k, tr.h * k);
  ctx.restore();
}
function drawProp(name, x, y, sx, sy, skew) {
  const p = PROPS[name]; if (!p) return; const im = atlas('props'); if (!ready(im)) return;
  ctx.save(); ctx.translate(x, y); if (skew) ctx.transform(1, 0, -skew, 1, 0, 0); ctx.scale(sx * p.k, sy * p.k);
  ctx.drawImage(im, p.x, p.y, p.w, p.h, -p.ax, -p.ay, p.w, p.h); ctx.restore();
}
function drawFrog(f) {
  if (f.st === 'water') return;
  const leap = f.st !== 'sit', pulse = f.puff > 0 ? 1 + .07 * Math.sin(f.puff * Math.PI * 4) : 1;
  ctx.save(); ctx.globalAlpha = .25; ell(ctx, f.x, f.y, 6, 2.5); ctx.fillStyle = '#122008'; ctx.fill(); ctx.restore();
  drawProp(leap ? 'frog_leap' : 'frog_sit', f.x, f.y - f.z, f.face, pulse, 0);
}
function drawButterfly(b) {
  const flap = Math.abs(Math.sin(clock * 16 + b.ph)) * .9 + .1;
  ctx.save(); ctx.translate(b.x, b.y); ctx.fillStyle = b.col; ctx.globalAlpha = .95;
  ell(ctx, -3.2 * flap, 0, 3.4 * flap, 2.6); ctx.fill(); ell(ctx, 3.2 * flap, 0, 3.4 * flap, 2.6); ctx.fill();
  ctx.fillStyle = '#2b2416'; ell(ctx, 0, 0, .7, 2.2); ctx.fill(); ctx.restore();
}

function drawOverlay(p) {
  let src;
  if (p.kind === 'coop') src = ovSrc(p.breed, p.f.deg);
  else if (p.kind === 'empty') src = ovSrc('empty', p.f.deg);
  else if (p.kind === 'sale') src = ovSrc('sale', p.f.deg);
  else return;
  const im = img(src); if (!ready(im)) return;
  ctx.drawImage(im, p.f.c[0] - OV[0], p.f.c[1] - OV[1], 600, 600);
}
const uiK = () => clamp(.8 / view.s, 1, 2.4);     // signs and bubbles keep a readable size when zoomed out
function label(x, y, text, sub, style) {
  ctx.save(); const K = uiK(); ctx.translate(x, y); ctx.scale(K, K);
  ctx.font = '900 15px Coustard, Georgia, serif';
  const w1 = ctx.measureText(text).width;
  ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const w = Math.max(w1, w2) + 22, h = sub ? 44 : 28;
  const hot = style === 'hot', lock = style === 'lock';
  ctx.fillStyle = 'rgba(0,0,0,.22)'; rrect(ctx, -w / 2, -h / 2 + 3, w, h, 9); ctx.fill();
  ctx.fillStyle = hot ? '#fff4d3' : lock ? '#e9e6dc' : '#fbf6e6'; rrect(ctx, -w / 2, -h / 2, w, h, 9); ctx.fill();
  ctx.strokeStyle = hot ? '#c08a14' : 'rgba(80,55,20,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = lock ? '#5f5a4c' : '#3a2a12'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 15px Coustard, Georgia, serif'; ctx.fillText(text, 0, sub ? -9 : 1);
  if (sub) { ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.fillStyle = '#6b4b12'; ctx.fillText(sub, 0, 11); }
  ctx.restore();
}
const GRADE_COL = { '★': ['#e1b525', '#3a2a00'], 'A+': ['#2f7a3a', '#fff'], A: ['#3d8a45', '#fff'], B: ['#2a6f80', '#fff'], C: ['#7b7f74', '#fff'], D: ['#c9c3b0', '#3a3a30'] };
function gradeTag(a) {
  const b = a.b, g = grade(quality(b)), [bg, fg] = GRADE_COL[g];
  const v = fmtN(value(b)), chick = stage(b) === 'chick';
  ctx.save(); const K = uiK() * .9; ctx.translate(a.sx, a.sy - (chick ? 26 : 62)); ctx.scale(K, K);
  ctx.font = '900 13px "Atkinson Hyperlegible", system-ui, sans-serif'; const wg = ctx.measureText(g).width + 12;
  ctx.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif'; const wv = ctx.measureText(v).width + 22;
  const w = wg + wv, x0 = -w / 2;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; rrect(ctx, x0, -10 + 2, w, 20, 10); ctx.fill();
  ctx.fillStyle = '#fffdf6'; rrect(ctx, x0, -10, w, 20, 10); ctx.fill();
  ctx.fillStyle = bg; rrect(ctx, x0, -10, wg, 20, 10); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 13px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.fillText(g, x0 + wg / 2, 1);
  ctx.fillStyle = '#e3a723'; ell(ctx, x0 + wg + 9, 0, 5, 5); ctx.fill();
  ctx.fillStyle = '#2b2416'; ctx.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(v, x0 + wg + 16, 1);
  if (b.sex === 'r' && plotOfBird(b) && plotOfBird(b).coop && plotOfBird(b).coop.sire === b.id) { ctx.fillStyle = '#2a5ea8'; ell(ctx, x0 + w + 4, -8, 5, 5); ctx.fill(); }
  ctx.restore();
}
function bubble(x, y, r, fill, stroke, drawIcon) {
  ctx.save(); const K = uiK(); ctx.translate(x, y); ctx.scale(K, K);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; rrect(ctx, -r.w / 2, -18 + 3, r.w, 36, 18); ctx.fill();
  ctx.fillStyle = fill; rrect(ctx, -r.w / 2, -18, r.w, 36, 18); ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
  drawIcon(); ctx.restore();
}
function sackIcon(x, y, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 7, y - 6); ctx.quadraticCurveTo(x, y - 10, x + 7, y - 6); ctx.lineTo(x + 9, y + 8); ctx.quadraticCurveTo(x, y + 12, x - 9, y + 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x - 5, y - 1, 10, 3);
}
function draw() {
  const k = view.dpr * view.s;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#4f7a35'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(k, 0, 0, k, -view.x * k, -view.y * k);
  ctx.imageSmoothingQuality = 'high';
  const map = img('img/farm_map.webp');
  const vx0 = view.x, vy0 = view.y, vx1 = view.x + view.vw / view.s, vy1 = view.y + view.vh / view.s;
  if (ready(map)) {
    const sx = Math.max(0, Math.floor(vx0) - 2), sy = Math.max(0, Math.floor(vy0) - 2);
    const sw = Math.min(map.naturalWidth - sx, Math.ceil(vx1 - sx) + 4), sh = Math.min(map.naturalHeight - sy, Math.ceil(vy1 - sy) + 4);
    if (sw > 0 && sh > 0) ctx.drawImage(map, sx, sy, sw, sh, sx, sy, sw, sh);
  }
  const vis = (x, y, m) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
  drawWind(vx0, vy0, vx1, vy1);
  if (vis(GEOM.pond.c[0], GEOM.pond.c[1], 300)) drawPond();
  // everything that stands up, back to front
  const items = [];
  for (const p of plots) if (p.kind !== 'pasture' && vis(p.f.c[0], p.f.c[1], 360)) items.push([p.f.c[1], 0, p]);
  for (const tr of TREES) if (vis(tr.base[0], tr.base[1] - 120, 320)) items.push([tr.base[1], 1, tr]);
  for (const tf of GEOM.tufts) if (vis(tf[0], tf[1], 40)) items.push([tf[1], 2, tf]);
  for (const f of frogs) if (vis(f.x, f.y, 40)) items.push([f.y, 3, f]);
  const birds = [];
  for (const b of state.birds) {
    const a = agents.get(b.id); if (!a || !a.plot) continue;
    const m = toMap(a.plot.f, a.x, a.y); a.sx = m[0]; a.sy = m[1];
    if (vis(a.sx, a.sy, 80)) { items.push([a.sy, 4, a]); birds.push(a); }
  }
  items.sort((p, q) => p[0] - q[0]);
  for (const [, kind, it] of items) {
    if (kind === 0) drawOverlay(it);
    else if (kind === 1) drawTree(it);
    else if (kind === 2) drawProp('tuft_' + it[2], it[0], it[1], (it[0] | 0) % 2 ? 1 : -1, 1, sway(it[0], .09));
    else if (kind === 3) drawFrog(it);
    else drawBird(it);
  }
  for (const b of butterflies) if (vis(b.x, b.y, 20)) drawButterfly(b);
  if (!cloudCv) cloudCv = makeCloud();
  for (const c of clouds) if (vis(c.x + 450, c.y + 260, 600)) ctx.drawImage(cloudCv, c.x, c.y, 1800, 1040);
  // signs, bubbles and tags sit on top of everything
  for (const p of plots) {
    if (p.kind === 'pasture' || !vis(p.f.c[0], p.f.c[1], 300)) continue;
    const sp = toMap(p.f, 0, -1.75, 0.3);
    if (p.kind === 'coop') label(sp[0], sp[1], coopLabel(p.coop));
    else if (p.kind === 'empty') label(sp[0], sp[1], t('sign_build'), '+');
    else if (p.kind === 'sale' && p.next) label(sp[0], sp[1], p.locked ? t('locked_lvl', { n: levelForPlots(p.idx + 1) }) : t('sign_sale'), p.locked ? null : fmtN(p.price) + ' ' + t('coins'), p.locked ? 'lock' : 'hot');
  }
  for (const p of plots) {
    if (p.kind !== 'coop') continue;
    const c = p.coop, n = nestCount(c), food = feederTotal(c);
    p.bubble = null; p.feedBubble = null;
    const m = toMap(p.f, 0.2, 0.75, 2.2);
    const bob = Math.sin(clock * 3 + p.idx) * 3;
    if (!vis(m[0], m[1], 80)) continue;
    if (n) {
      const bx = m[0] + 14 * uiK(), by = m[1] + bob;
      p.bubble = { x: bx, y: by, r: 34 * uiK() };
      bubble(bx, by, { w: 60 }, n >= NEST_CAP ? '#fff2cc' : '#fffdf6', n >= NEST_CAP ? '#c8302a' : 'rgba(0,0,0,.12)', () => {
        ell(ctx, -11, 0, 8.5, 11); const g = ctx.createRadialGradient(-14, -4, 1, -11, 0, 13);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, BREEDS[c.breed].eggCol); ctx.fillStyle = g; ctx.fill();
        ctx.fillStyle = '#2b2416'; ctx.font = '700 18px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), 12, 1);
      });
    }
    if (food <= FEEDER_CAP * .15) {
      const empty = food <= 0, fx = m[0] - (n ? 46 : 0) * uiK(), fy = m[1] - bob;
      p.feedBubble = { x: fx, y: fy, r: 30 * uiK() };
      bubble(fx, fy, { w: 40 }, empty ? '#ffe3dc' : '#fff4d3', empty ? '#c8302a' : '#c08a14', () => {
        sackIcon(-1, 0, '#a7743a');
        if (empty) { ctx.fillStyle = '#c8302a'; ctx.font = '900 16px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 12, -8); }
      });
    }
  }
  const pp = toMap(GEOM.pasture, 0, -2.75, .2);
  if (vis(pp[0], pp[1], 100)) label(pp[0], pp[1], t('pasture'));
  if (ui.grades) { birds.sort((a, b) => a.sy - b.sy); for (const a of birds) gradeTag(a); }
  for (const a of birds) if (a.say > 0) speech(a);
}
function drawBird(a) {
  const b = a.b, st = stage(b);
  const grow = st === 'young' ? .82 : 1;
  const name = spriteFor(b, a.pose); if (!name) return;
  const k = BIRD_UNIT / SPR[name].ppu * grow;
  let sy = k, sx = k * a.fx;
  if (a.st === 'dust') { sy *= .8 + .04 * Math.sin(clock * 9 + b.id); sx *= 1.07; }
  if (a.st === 'crow') sy *= 1.04;
  if (st === 'retired') ctx.filter = 'saturate(.8)';
  drawSprite(name, a.sx, a.sy, sx, sy);
  if (a.fade > 0 && a.prev) { const pn = spriteFor(b, a.prev); if (pn && pn !== name) { ctx.globalAlpha = clamp(a.fade / .09, 0, 1) * .8; drawSprite(pn, a.sx, a.sy, BIRD_UNIT / SPR[pn].ppu * grow * a.fx, BIRD_UNIT / SPR[pn].ppu * grow); ctx.globalAlpha = 1; } }
  ctx.filter = 'none';
  if (a.st === 'dust') {
    ctx.save(); ctx.globalAlpha = .35;
    for (let i = 0; i < 4; i++) { ell(ctx, a.sx - 18 + i * 12 + Math.sin(clock * 5 + i) * 3, a.sy - 3 - Math.abs(Math.sin(clock * 4 + i)) * 7, 6, 3.5); ctx.fillStyle = '#b39066'; ctx.fill(); }
    ctx.restore();
  }
}
function speech(a) {
  const chick = stage(a.b) === 'chick';
  ctx.save(); const K = uiK(); ctx.translate(a.sx + 4, a.sy - (chick ? 34 : 70) - (ui.grades ? 24 : 0)); ctx.scale(K, K);
  ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(a.sayText).width + 16, hx = 0, hy = -12;
  ctx.globalAlpha = Math.min(1, a.say * 3);
  ctx.fillStyle = '#fffdf6'; rrect(ctx, hx - w / 2, hy - 13, w, 26, 13); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx - 5, hy + 12); ctx.lineTo(hx - 10, hy + 20); ctx.lineTo(hx + 4, hy + 12); ctx.fill();
  ctx.fillStyle = '#2b2416'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(a.sayText, hx, hy + 1); ctx.restore();
}
function scrollToPlot(idx) {
  buildPlots(); const p = plots[idx]; if (!p) return;
  view.x = p.f.c[0] - view.vw / view.s / 2; view.y = p.f.c[1] - view.vh / view.s / 2; clampCam();
}

/* touch: drag to move around the farm, pinch or wheel to zoom, tap to open */
const ptr = { list: new Map(), moved: 0, x0: 0, y0: 0, vx: 0, vy: 0, lastT: 0, pinch: null };
let inertia = null;
function local(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
cv.addEventListener('pointerdown', e => {
  const [x, y] = local(e); ptr.list.set(e.pointerId, { x, y });
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  inertia = null;
  if (ptr.list.size === 1) { ptr.moved = 0; ptr.x0 = x; ptr.y0 = y; ptr.vx = ptr.vy = 0; ptr.lastT = performance.now(); ptr.pinch = null; }
  else if (ptr.list.size === 2) { const [p, q] = [...ptr.list.values()]; ptr.pinch = { d: Math.hypot(p.x - q.x, p.y - q.y) || 1, s: view.s }; ptr.moved = 99; }
});
cv.addEventListener('pointermove', e => {
  const old = ptr.list.get(e.pointerId); if (!old) return;
  const [x, y] = local(e);
  if (ptr.list.size >= 2 && ptr.pinch) {
    const [p, q] = [...ptr.list.values()];
    const mx0 = (p.x + q.x) / 2, my0 = (p.y + q.y) / 2;
    old.x = x; old.y = y;
    const [p2, q2] = [...ptr.list.values()];
    const mx = (p2.x + q2.x) / 2, my = (p2.y + q2.y) / 2, d = Math.hypot(p2.x - q2.x, p2.y - q2.y) || 1;
    view.x -= (mx - mx0) / view.s; view.y -= (my - my0) / view.s;
    zoomAt(mx, my, ptr.pinch.s * d / ptr.pinch.d);
    return;
  }
  const dx = x - old.x, dy = y - old.y; old.x = x; old.y = y;
  ptr.moved = Math.max(ptr.moved, Math.hypot(x - ptr.x0, y - ptr.y0));
  if (ptr.moved < 6) return;
  view.x -= dx / view.s; view.y -= dy / view.s; clampCam();
  const now = performance.now(), dtm = Math.max(1, now - ptr.lastT); ptr.vx = dx / dtm; ptr.vy = dy / dtm; ptr.lastT = now;
});
function up(e) {
  if (!ptr.list.has(e.pointerId)) return;
  ptr.list.delete(e.pointerId);
  if (ptr.list.size === 1) { const [p] = [...ptr.list.values()]; ptr.pinch = null; ptr.x0 = p.x; ptr.y0 = p.y; return; }
  if (ptr.list.size) return;
  if (e.type === 'pointerup' && ptr.moved < 9) { const [x, y] = local(e); tapAt(view.x + x / view.s, view.y + y / view.s); }
  else if (ptr.moved >= 9 && ptr.moved < 99 && performance.now() - ptr.lastT < 80) inertia = { vx: ptr.vx, vy: ptr.vy };
}
cv.addEventListener('pointerup', up);
cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const [x, y] = local(e);
  if (e.ctrlKey || e.metaKey) zoomAt(x, y, view.s * Math.exp(-e.deltaY * .01));
  else { view.x += e.deltaX / view.s; view.y += e.deltaY / view.s; clampCam(); }
}, { passive: false });
function inBox(f, x, y, box) { const [lx, ly] = toLocal(f, x, y); return lx >= box.x0 && lx <= box.x1 && ly >= box.y0 && ly <= box.y1; }
function tapAt(x, y) {
  for (const p of plots) if (p.bubble && Math.hypot(x - p.bubble.x, y - p.bubble.y) < p.bubble.r) { actCollect(p.coop); return; }
  for (const p of plots) if (p.feedBubble && Math.hypot(x - p.feedBubble.x, y - p.feedBubble.y) < p.feedBubble.r) { openSheet('coop', { id: p.coop.id }); return; }
  let best = null, bd = 1e9;
  for (const b of state.birds) {
    const a = agents.get(b.id); if (!a || a.sx == null) continue;
    const r = stage(b) === 'chick' ? 22 : 34;
    const d = Math.hypot(x - a.sx, y - (a.sy - r * .8));
    if (d < r && d < bd) { bd = d; best = b; }
  }
  if (best) { openSheet('bird', { id: best.id }); return; }
  for (const f of frogs) if (f.st === 'sit' && Math.hypot(x - f.x, y - f.y + 6) < 22) { f.puff = .6; frogHop(f, false); return; }
  for (const p of plots) {
    if (!inBox(p.f, x, y, p.kind === 'pasture' ? { x0: -3.1, x1: 3.1, y0: -2.4, y1: 2.4 } : { x0: -1.85, x1: 1.85, y0: -1.75, y1: 1.6 })) continue;
    if (p.kind === 'coop') openSheet('coop', { id: p.coop.id });
    else if (p.kind === 'empty') openSheet('market', { tab: 'build' });
    else if (p.kind === 'sale') openSheet('market', { tab: 'build' });
    else openSheet('pasture');
    return;
  }
  if (Math.hypot(x - GEOM.stall[0], y - GEOM.stall[1]) < 90) openSheet('market', { tab: 'birds' });
  else if (Math.hypot(x - GEOM.house[0], y - GEOM.house[1]) < 110) openSheet('awards');
}
function stepInertia(dt) {
  if (!inertia || ptr.list.size) return;
  view.x -= inertia.vx * dt * 1000 / view.s; view.y -= inertia.vy * dt * 1000 / view.s; clampCam();
  const f = Math.pow(.05, dt); inertia.vx *= f; inertia.vy *= f;
  if (Math.hypot(inertia.vx, inertia.vy) < .01) inertia = null;
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
  return h('img', { class: 'portrait' + (big ? ' big' : '') + (stage(b) === 'chick' ? ' chick' : ''), src: cardSrc(b), alt: '', draggable: 'false' });
}
function meterBar(n, max, cls) { return h('div', { class: 'meter' + (cls ? ' ' + cls : ''), role: 'meter', 'aria-valuenow': n, 'aria-valuemin': 0, 'aria-valuemax': max }, h('i', { style: `width:${clamp(n / max * 100, 0, 100)}%` })); }
function feedLasts(c) {
  const per = birdsIn(c).reduce((n, b) => n + (stage(b) === 'chick' ? .5 : 1), 0);
  return per ? feederTotal(c) / per * EAT_EVERY : 0;
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
function birdRow(b, extra, showValue) {
  const q = quality(b);
  return h('button', { class: 'item', onclick: () => openSheet('bird', { id: b.id }) },
    portrait(b),
    h('div', { class: 'grow' },
      h('div', { class: 'row' }, h('span', { class: 'name', text: b.name }), h('span', { class: 'muted', text: b.sex === 'r' ? '♂' : '♀', 'aria-label': stageLabel(b) }), b.champ ? h('span', { class: 'tag red', text: t('champion') }) : null),
      h('div', { class: 'small muted', text: `${birdTitle(b)} · ${stageLabel(b)}` }),
      extra || null),
    h('div', { style: 'display:flex;flex-direction:column;align-items:flex-end;gap:4px' }, h('div', { class: 'grade g' + grade(q).replace('+', 'p').replace('★', 's'), title: t('quality'), text: grade(q) }), showValue ? coinPrice(value(b)) : null));
}

/* sheets */
let current = null;
function openSheet(name, args) { current = { name, args: args || {} }; $('#sheet').hidden = false; $('#scrim').hidden = false; renderSheet(true); setTab(['market', 'hatch', 'shows', 'awards'].includes(name) ? name : 'farm'); }
function setGrades(on) { ui.grades = on; state.flags.grades = on; $('#gradesBtn').setAttribute('aria-pressed', String(on)); }
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
    if (a.hungry) lines.push(t('away_hungry', { n: a.hungry })); if (a.levels) lines.push(t('level_up', { n: a.levels }));
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
    const food = feederTotal(coop);
    const feedCard = h('div', { class: 'card' },
      h('div', { class: 'row' }, h('h3', { class: 'grow', text: t('feeder') }), h('span', { class: 'num', text: t('feeder_level', { n: food, max: FEEDER_CAP }) })),
      h('div', { class: 'feedbar' }, FEED_IDS.filter(k => coop.feeder[k]).map(k => h('i', { style: `width:${coop.feeder[k] / FEEDER_CAP * 100}%;background:${FEEDS[k].col}`, title: t('feed_' + k) }))),
      food ? h('p', { class: 'small' }, t('eating', { feed: t('feed_' + coop.last) }), ' · ', t('feed_lasts', { t: fmtDur(realLeft(feedLasts(coop))) })) : h('p', { class: 'small warn', text: t('feeder_empty') }),
      h('div', { class: 'btns' }, FEED_IDS.filter(k => FEEDS[k].lvl <= state.level).map(k => h('button', { class: 'btn sm' + (k === 'basic' ? '' : ' alt'), disabled: !state.feed[k] || food >= FEEDER_CAP, onclick: () => actFill(coop, k) },
        t('fill'), ' · ', t('feed_' + k), h('span', { class: 'muted', style: 'font-weight:400' }, ` (${fmtN(state.feed[k])})`)))),
      FEED_IDS.every(k => !state.feed[k]) ? h('button', { class: 'btn alt sm', onclick: () => openSheet('market', { tab: 'feed' }) }, t('no_feed_store')) : null);
    let odds = null;
    if (coop.breed === 'sil') {
      const roo = sire || roos[0], hens = birds.filter(b => b.sex === 'h' && isGrown(b));
      if (roo && hens.length) odds = h('div', { class: 'card' }, h('h3', { text: t('chick_colours') }), h('p', { class: 'note', text: t('odds_note') }),
        hens.map(hen => h('div', { class: 'small', style: 'display:flex;flex-direction:column;gap:4px' }, h('div', { style: 'font-weight:700', text: `${hen.name} (${t('col_' + hen.colour)}) × ${roo.name} (${t('col_' + roo.colour)})` }),
          h('div', { class: 'row', style: 'flex-wrap:wrap;gap:6px' }, colourOdds(roo.geno, hen.geno).map(([c, p]) => h('span', { class: 'tag' + (state.seen.includes('sil_' + c) ? '' : ' gold') }, `${t('col_' + c)} ${Math.round(p * 100)}%`))))));
    }
    return { title: coopLabel(coop), node: [
      h('div', { class: 'row', style: 'flex-wrap:wrap' }, h('span', { class: 'tag', text: breedName(coop.breed) }), h('span', { class: 'tag', text: t('coop_cap', { a: birds.length, b: COOP_CAP }) }), h('span', { class: 'tag', text: t('plot_n', { n: coop.plot + 1 }) })),
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('h3', { class: 'grow', text: t('nest') }), h('span', { class: 'num', text: `${n} / ${NEST_CAP}` })),
        n ? h('div', { class: 'row', style: 'flex-wrap:wrap;gap:4px' }, Array.from({ length: n }, (_, i) => h('span', { class: 'eggdot', style: `background:${BREEDS[coop.breed].eggCol};${i < coop.nest.fertile.length ? 'outline:2px solid var(--good);outline-offset:1px' : ''}` }))) : h('p', { class: 'muted small', text: t('nest_empty') }),
        coop.nest.fertile.length ? h('p', { class: 'small', text: `${coop.nest.fertile.length} × ${t('fertile').toLowerCase()}` }) : null,
        h('button', { class: 'btn', disabled: !n, onclick: () => actCollect(coop) }, t('collect'))),
      feedCard,
      h('div', { class: 'card' },
        h('h3', { text: t('sire') }),
        roos.length ? h('p', { class: 'small', text: sire ? `${sire.name} · ${t('quality')} ${quality(sire)}` : t('sire_auto') }) : h('p', { class: 'small warn', text: t('no_rooster') }),
        roos.length ? h('p', { class: 'note', text: t('sire_note') }) : null),
      odds,
      h('h3', { text: t('birds') }),
      h('div', { class: 'list' }, birds.map(b => birdRow(b, b.id === coop.sire ? h('span', { class: 'tag blue', text: t('is_sire') }) : null, true))),
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
        coop ? h('div', { class: 'small muted', text: t('in_coop_n', { coop: coopLabel(coop) }) }) : null)),
      h('input', { type: 'text', id: 'rename', maxlength: 20, value: b.name, 'aria-label': 'Name', autocomplete: 'off', onchange: e => actRename(b, e.target.value) }),
      meters(eff(b)),
      Math.floor(b.boost || 0) ? h('p', { class: 'small', style: 'color:var(--good);font-weight:700', text: t('fed_boost', { n: Math.floor(b.boost) }) }) : null,
      ...info,
      (b.champ || b.line) ? h('p', { class: 'note', text: t('champ_line') }) : null,
      ribbons,
      h('div', { class: 'small muted' }, `${t('parents')}: `, (b.sire || b.dam) ? `${b.sire ? b.sire.name + ' (' + b.sire.q + ')' : '?'} × ${b.dam ? b.dam.name + ' (' + b.dam.q + ')' : '?'}` : t('unknown'), ` · ${t('gen')} ${b.gen}`),
      enteredIn ? h('p', { class: 'small', text: t('entered', { show: showName(enteredIn) }) }) : null,
      (st !== 'retired' && st !== 'chick' && !enteredIn) ? h('div', { class: 'card' }, h('h3', { text: t('enter_show') }),
        b.breed === 'sil' && !SIL[b.colour].show ? h('p', { class: 'small muted', text: t('non_standard', { col: t('col_' + b.colour) }) }) :
        openShows.length ? openShows.map(s => h('button', { class: 'btn alt sm', disabled: state.coins < TIERS[s.tier].fee, onclick: () => actEnter(b, s) }, `${showName(s)} · `, coinPrice(TIERS[s.tier].fee))) : h('p', { class: 'small muted', text: t('no_shows') })) : null,
      (st !== 'retired' && coop) ? h('div', { class: 'card' }, h('h3', { text: t('move_to') }),
        (() => { const others = state.coops.filter(c => c.breed === b.breed && c.id !== coop.id && birdsIn(c).length < COOP_CAP).sort((x, y) => x.plot - y.plot);
          return others.length ? h('div', { class: 'list' }, others.map(c => h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { style: 'font-weight:700', text: coopLabel(c) }), h('div', { class: 'small muted', text: `${t('plot_n', { n: c.plot + 1 })} · ${t('coop_cap', { a: birdsIn(c).length, b: COOP_CAP })}` })), h('button', { class: 'btn sm alt', onclick: () => actMove(b, c) }, t('move_btn')))))
            : h('p', { class: 'small muted', text: t('move_none', { coop: t('coop_' + b.breed) }) }); })()) : null,
      h('div', { class: 'btns' }, actions),
    ] };
  },
  pasture() {
    const birds = state.birds.filter(b => b.home === 'pasture');
    return { title: t('pasture'), node: [h('p', { class: 'note', text: t('pasture_note') }), birds.length ? h('div', { class: 'list' }, birds.map(b => birdRow(b))) : h('p', { class: 'muted', text: t('pasture_empty') })] };
  },
  market({ tab = 'birds' }) {
    const seg = h('div', { class: 'seg', role: 'group' }, ['birds', 'feed', 'build', 'breeds'].map(k => h('button', { 'aria-pressed': String(tab === k), onclick: () => { current.args.tab = k; renderSheet(true); } }, t('market_' + k))));
    const lock = L => h('span', { class: 'tag lock', text: '🔒 ' + t('locked_lvl', { n: L }) });
    let node;
    if (tab === 'birds') {
      node = [h('p', { class: 'small muted' }, timer(state.shop.next, 'new_birds_in')),
        state.shop.offers.length ? h('div', { class: 'list' }, state.shop.offers.map((o, i) => {
          const fake = { ...o, id: -1 - i, home: 0, champ: 0, line: 0, ribbons: [] };
          const price = offerPrice(o), has = state.coops.some(c => c.breed === o.breed), room = coopWithSpace(o.breed);
          const why = !unlocked(o.breed) ? t('locked_long', { n: BREEDS[o.breed].lvl }) : !has ? t('need_coop', { coop: t('coop_' + o.breed) }) : !room ? t('coop_full', { coop: t('coop_' + o.breed) }) : state.coins < price ? t('need_coins') : null;
          return h('div', { class: 'card' },
            h('div', { class: 'row' }, portrait(fake), h('div', { class: 'grow' }, h('div', { class: 'name', style: 'font-weight:700', text: `${o.name} ${o.sex === 'r' ? '♂' : '♀'}` }), h('div', { class: 'small muted', text: `${birdTitle(fake)} · ${stageLabel(fake)}` })), h('div', { class: 'grade', text: grade(quality(fake)) })),
            meters(o.traits),
            why ? h('p', { class: 'small warn', text: why }) : null,
            h('button', { class: 'btn', disabled: !!why, onclick: () => actBuyOffer(i) }, t('buy_for'), ' ', coinPrice(price)));
        })) : h('p', { class: 'muted', text: t('no_offers') })];
    } else if (tab === 'feed') {
      node = [h('p', { class: 'note', text: t('feed_note') }),
        FEED_IDS.map(k => {
          const F = FEEDS[k], open = F.lvl <= state.level;
          return h('div', { class: 'card' },
            h('div', { class: 'row' }, h('span', { class: 'sack', style: `--c:${F.col}` }), h('div', { class: 'grow' }, h('div', { style: 'font-weight:700', text: t('feed_' + k) }), h('div', { class: 'small muted', text: t('in_store', { n: fmtN(state.feed[k]) }) })), open ? null : lock(F.lvl)),
            h('p', { class: 'small', text: t('feed_' + k + '_d') }),
            open ? h('div', { class: 'btns' },
              h('button', { class: 'btn sm', disabled: state.coins < F.price, onclick: () => actBuyFeed(k, 1) }, t('bag', { n: F.bag }), ' · ', coinPrice(F.price)),
              h('button', { class: 'btn sm alt', disabled: state.coins < F.price * 5, onclick: () => actBuyFeed(k, 5) }, `5 × `, coinPrice(F.price * 5)),
              state.feed[k] ? h('button', { class: 'btn sm good', onclick: () => actFillAll(k) }, t('fill_all')) : null) : null);
        })];
    } else if (tab === 'build') {
      const free = freePlot(), allowed = plotsAllowed(state.level);
      node = [
        h('h3', { text: t('build_here') }),
        BREED_IDS.map(id => {
          const price = coopPrice(id), owned = state.coops.filter(c => c.breed === id).length, open = unlocked(id);
          const thumb = h('img', { class: 'thumb' + (open ? '' : ' dim'), src: ovSrc(id, 0), alt: '', draggable: 'false' });
          return h('div', { class: 'card' }, thumb,
            h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { style: 'font-weight:700', text: t('coop_' + id) }), h('div', { class: 'small muted', text: t('build_coop', { breed: t('br_' + id) }) + ' · ' + t('cap_n', { n: COOP_CAP }) + (owned ? ' · ' + t('owned', { n: owned }) : '') })), open ? null : lock(BREEDS[id].lvl)),
            open && free < 0 ? h('p', { class: 'small warn', text: t('need_plot') }) : null,
            open ? h('button', { class: 'btn', disabled: free < 0 || state.coins < price, onclick: () => actBuildCoop(id) }, t('build_for'), ' ', coinPrice(price)) : null);
        }),
        h('div', { class: 'card' }, h('h3', { text: t('land') }), h('p', { class: 'small', text: t('land_note') }), h('p', { class: 'small muted', text: t('plots_owned', { n: state.plots, max: MAX_PLOTS }) }),
          state.plots >= MAX_PLOTS ? h('p', { class: 'note', text: t('max_reached') }) :
          state.plots >= allowed ? h('p', { class: 'small warn', text: t('locked_long', { n: levelForPlots(state.plots + 1) }) }) :
          h('button', { class: 'btn alt', disabled: state.coins < plotPrice(), onclick: actBuyPlot }, t('buy_land'), ' · ', coinPrice(plotPrice()))),
        h('div', { class: 'card' }, h('h3', { text: t('incubator_slot') }), h('p', { class: 'small muted', text: t('slots', { a: state.inc.items.length, b: state.inc.slots }) }),
          state.inc.slots >= 8 ? h('p', { class: 'note', text: t('max_reached') }) :
          state.inc.slots >= incAllowed(state.level) ? h('p', { class: 'small warn', text: t('locked_long', { n: Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).find(L => incAllowed(L) > state.inc.slots) }) }) :
          h('button', { class: 'btn alt', disabled: state.coins < incPrice(), onclick: actIncSlot }, coinPrice(incPrice()))),
        h('div', { class: 'card' }, h('h3', { text: t('basket_up') }), h('p', { class: 'small muted', text: `${basketCount()} / ${state.basketCap}` }),
          state.basketCap < 1000 ? h('button', { class: 'btn alt', disabled: state.coins < basketPrice(), onclick: actBasket }, coinPrice(basketPrice())) : h('p', { class: 'note', text: t('max_reached') })),
      ];
    } else {
      // the breed catalogue: everything in the game, what it costs and when it unlocks
      const rarity = w => w >= 12 ? 1 : w >= 8 ? 2 : w >= 4 ? 3 : 4;
      node = [h('p', { class: 'note', text: t('catalogue_note') }),
        BREED_IDS.map(id => {
          const B = BREEDS[id], open = unlocked(id), k = id === 'sil' ? 'sil_white' : id;
          const perDay = Math.round(24 * 60 / (B.lay * 1.0));
          const facts = [[t('bird_from'), coinPrice(Math.round(B.price * qMult(42) * .9))], [t('egg_value'), coinPrice(B.egg)], [t('lays'), t('per_day', { n: perDay })], [t('coop_cost'), coinPrice(B.coop)]];
          const card = h('div', { class: 'card' + (open ? '' : ' locked') },
            h('div', { class: 'row' }, h('img', { class: 'portrait big cat', src: kindCard(k, 'h'), alt: '' }), h('img', { class: 'portrait big cat', src: kindCard(k, 'r'), alt: '' })),
            h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { style: 'font-weight:700;font-family:var(--display);font-size:17px', text: t('br_' + id) }), h('div', { class: 'small muted', text: t('coop_' + id) })), open ? h('span', { class: 'tag', text: t('locked_lvl', { n: B.lvl }) }) : lock(B.lvl)),
            h('p', { class: 'small', text: t('desc_' + id) }),
            h('div', { class: 'facts' }, facts.flatMap(([a, b]) => [h('span', { class: 'muted small', text: a }), h('span', { class: 'small', style: 'font-weight:700' }, b)]),
              h('span', { class: 'muted small', text: t('egg_colour') }), h('span', { class: 'eggdot', style: `background:${B.eggCol};width:14px;height:18px` })));
          if (id === 'sil') {
            const cols = Object.keys(SIL), found = cols.filter(c => state.seen.includes('sil_' + c)).length;
            card.append(h('h3', { text: `${t('colours')} · ${t('discovered', { a: found, b: cols.length })}` }),
              h('div', { class: 'colours' }, cols.map(c => {
                const seen = state.seen.includes('sil_' + c);
                return h('div', { class: 'colour' + (seen ? '' : ' unseen') }, h('img', { src: kindCard('sil_' + c, 'h'), alt: '' }),
                  h('div', { class: 'small', style: 'font-weight:700', text: t('col_' + c) }),
                  h('div', { class: 'tiny muted', text: t('rarity_' + rarity(SIL[c].w)) + (SIL[c].show ? ' · ' + t('show_std') : '') }),
                  h('div', { class: 'tiny', text: '×' + SIL[c].m.toFixed(2).replace(/0$/, '') }));
              })));
          }
          return card;
        })];
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
    const lockedTier = Object.keys(TIER_LVL).find(k => TIER_LVL[k] > state.level);
    return { title: t('tab_shows'), node: [
      h('p', { class: 'small muted' }, timer(state.shows.next, 'next_show')),
      h('h3', { text: t('shows_open') }), list.length ? list : h('p', { class: 'muted', text: '—' }),
      lockedTier ? h('div', { class: 'card locked' }, h('div', { class: 'row' }, h('div', { class: 'grow', style: 'font-weight:700', text: t('t_' + lockedTier) }), h('span', { class: 'tag lock', text: '🔒 ' + t('locked_lvl', { n: TIER_LVL[lockedTier] }) })),
        h('div', { class: 'row small' }, [1, 2, 3].map(p => h('span', { class: 'row', style: 'gap:5px' }, h('span', { class: 'rosette p' + p, style: 'width:22px;height:22px' }), coinPrice(TIERS[lockedTier].prize[p - 1]))))) : null,
      h('h3', { text: t('results') }), hist.length ? h('div', { class: 'list' }, hist) : h('p', { class: 'small muted', text: t('no_results') }),
    ] };
  },
  awards() {
    const champs = state.birds.filter(b => b.champ > 0);
    const L = state.level, a = xpFor(L), b = xpFor(L + 1), maxed = L >= MAX_LEVEL;
    const next = [];
    for (let l = L + 1; l <= Math.min(MAX_LEVEL, L + 4) && next.length < 4; l++) for (const u of unlocksAt(l)) next.push([l, u]);
    return { title: t('awards'), node: [
      h('div', { class: 'card levelcard' },
        h('div', { class: 'row' }, h('div', { class: 'lvlbig', text: L }), h('div', { class: 'grow' }, h('div', { style: 'font-weight:700;font-family:var(--display);font-size:18px', text: `${t('level')} ${L}` }),
          h('div', { class: 'small muted', text: maxed ? t('max_level') : t('next_level', { n: fmtN(b - state.xp), l: L + 1 }) }))),
        maxed ? null : meterBar(state.xp - a, b - a, 'xp'),
        h('p', { class: 'note', text: t('how_xp') }),
        next.length ? [h('h3', { text: t('next_unlocks') }), h('div', { class: 'list' }, next.map(([l, u]) => h('div', { class: 'row small' }, h('span', { class: 'tag', text: t('locked_lvl', { n: l }) }), h('span', { text: unlockText(u) }))))] : null),
      h('h3', { text: t('rosettes') }),
      h('div', { class: 'trophies' }, [1, 2, 3].map(p => h('div', { class: 'card' }, h('span', { class: 'rosette p' + p, style: 'width:40px;height:40px' }), h('div', { class: 'big-num', text: fmtN(state.stats.wins[p - 1]) }), h('div', { class: 'small muted', text: placeLabel(p) })))),
      h('h3', { text: t('milestones') }),
      h('div', { class: 'list' }, TROPHIES.map(([id, xp]) => { const on = state.trophies.includes(id); return h('div', { class: 'row' }, h('span', { class: 'check' + (on ? ' on' : ''), text: '✓', 'aria-label': on ? 'done' : 'not done' }), h('span', { class: 'grow ' + (on ? '' : 'muted'), text: t(id) }), h('span', { class: 'tag' + (on ? ' gold' : ''), text: t('trophy_xp', { n: xp }) })); })),
      h('h3', { text: t('champions') }), champs.length ? h('div', { class: 'list' }, champs.map(b => birdRow(b))) : h('p', { class: 'small muted', text: '—' }),
      h('h3', { text: t('stats') }),
      h('div', { class: 'card' }, [['s_eggs', state.stats.eggs], ['s_hatched', state.stats.hatched], ['s_sold', state.stats.sold], ['s_earned', state.stats.earned]].map(([k, v]) => h('div', { class: 'row' }, h('span', { class: 'grow', text: t(k) }), h('span', { class: 'num', text: fmtN(v) })))),
    ] };
  },
  levelup({ l }) {
    const u = unlocksAt(l);
    return { title: t('level_up', { n: l }), node: [
      h('div', { class: 'levelhero' }, h('div', { class: 'lvlbig xl', text: l }), h('p', { text: t('level_up_body', { n: l }) })),
      h('div', { class: 'card' }, h('h3', { text: t('unlocks') }), h('div', { class: 'list' }, [...u.map(x => h('div', { class: 'row' }, h('span', { class: 'check on', text: '✓' }), h('span', { text: unlockText(x) }))),
        h('div', { class: 'row' }, h('span', { class: 'coin' }), h('span', { text: t('bonus_coins', { n: fmtN(50 * l) }) }))])),
      h('button', { class: 'btn', onclick: closeSheet }, t('close')),
    ] };
  },
  flock({ sort = 'value', breed = 'all' } = {}) {
    const all = state.birds.filter(b => breed === 'all' || b.breed === breed);
    const key = { value: b => -value(b), quality: b => -quality(b), age: b => -b.born }[sort] || (b => -value(b));
    const list = all.slice().sort((a, b) => key(a) - key(b));
    const breeds = BREED_IDS.filter(id => state.birds.some(b => b.breed === id));
    return { title: t('flock'), node: [
      h('div', { class: 'seg', role: 'group' }, ['value', 'quality', 'age'].map(k => h('button', { 'aria-pressed': String(sort === k), onclick: () => { current.args.sort = k; renderSheet(); } }, t('sort_' + k)))),
      breeds.length > 1 ? h('div', { class: 'chips' }, ['all', ...breeds].map(k => h('button', { class: 'chip', 'aria-pressed': String(breed === k), onclick: () => { current.args.breed = k; renderSheet(true); } }, k === 'all' ? t('all') : t('br_' + k)))) : null,
      h('p', { class: 'small muted', text: t('flock_count', { n: list.length }) }),
      list.length ? h('div', { class: 'list' }, list.map(b => { const c = coopById(b.home); return birdRow(b, h('div', { class: 'tiny muted', text: c ? coopLabel(c) : t('pasture') }), true); })) : h('p', { class: 'muted', text: t('flock_empty') }),
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
  const hungry = state.coops.filter(c => feederTotal(c) <= 0).length;
  const key = [state.coins, basketCount(), state.basketCap, fertileReady, openNoEntry, lang(), state.xp, hungry].join('|');
  if (key === hudCache) return; hudCache = key;
  const L = state.level, p = L >= MAX_LEVEL ? 100 : (state.xp - xpFor(L)) / (xpFor(L + 1) - xpFor(L)) * 100;
  $('#lvlNum').textContent = t('lvl_short', { n: L }); $('#lvlRing').style.setProperty('--p', p.toFixed(1)); $('#lvlPill').setAttribute('aria-label', `${t('level')} ${L}`);
  $('#coins').textContent = fmtN(state.coins);
  $('#eggs').textContent = `${basketCount()}/${state.basketCap}`;
  const setB = (id, n) => { const el = $(id); el.hidden = !n; el.textContent = n; };
  setB('#bHatch', fertileReady); setB('#bShows', openNoEntry); setB('#bMarket', hungry);
}
function applyLang() {
  document.documentElement.lang = lang();
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  $('#gear').setAttribute('aria-label', t('settings')); $('#sheetClose').setAttribute('aria-label', t('close'));
  hudCache = ''; updateHud(); renderSheet();
}
let saveTimer = 0;
function changed(soft) { dirty = false; checkTrophies(); buildPlots(); updateHud(); if (!soft) renderSheet(); clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }

$('#tabbar').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const tab = b.dataset.tab; if (tab === 'farm') closeSheet(); else openSheet(tab, tab === 'market' ? { tab: 'birds' } : {}); });
$('#gear').addEventListener('click', () => openSheet('settings'));
$('#lvlPill').addEventListener('click', () => openSheet('awards'));
$('#gradesBtn').addEventListener('click', () => { setGrades(!ui.grades); save(); });
$('#flockBtn').addEventListener('click', () => openSheet('flock', { sort: 'value', breed: 'all' }));
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
  if (away) { sink = { any: false }; advance(game); const s = sink; sink = null; if (s.any && (d > 5 * MIN || s.hatched || s.shows || s.levels)) { s.real = Math.min(d, OFFLINE_CAP); s.paused = paused; if (!current || current.name !== 'welcome') openSheet('away', s); } changed(); }
  else advance(game);
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now; clock += dt;
  tickTime();
  stepInertia(dt);
  updateAgents(dt);
  updateLife(dt);
  draw();
  if (pendingLevel && (!current || !['welcome', 'away'].includes(current.name))) { const l = pendingLevel; pendingLevel = 0; openSheet('levelup', { l }); }
  if (dirty) { dirty = false; uiDirty = true; buildPlots(); updateHud(); }
  requestAnimationFrame(frame);
}
setInterval(() => { if (!state) return; checkTrophies(); updateTimers(); updateHud(); if (current && uiDirty && !(document.activeElement && document.activeElement.id === 'rename')) { uiDirty = false; renderSheet(); } }, 1000);
setInterval(save, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);
window.addEventListener('resize', () => layout());

function start(hotData) {
  state = (hotData && hotData.state && sanitize(hotData.state)) || load();
  if (!state) newGame((navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en');
  ui.grades = !!state.flags.grades; $('#gradesBtn').setAttribute('aria-pressed', String(ui.grades));
  applyLang(); layout(); updateHud();
  img('img/farm_map.webp'); for (const c of state.coops) img(ovSrc(c.breed, GEOM.slots[c.plot].deg));
  if (!state.flags.welcome) openSheet('welcome');
  tickTime();
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('900 13px Coustard'), document.fonts.load('700 12px "Atkinson Hyperlegible"')]).then(() => { plotCache.clear(); }).catch(() => {});
}
window.claude?.hot?.snapshot?.(() => ({ state }));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
})();
window.__ffDebug = {
  rich() {
    state.coins = 99999; state.xp = xpFor(12) + 100; state.level = levelOf(state.xp); state.plots = 22;
    state.feed = { basic: 400, premium: 120, show: 40 };
    const breeds = ['rir', 'sil', 'orp', 'leg', 'bra', 'sil', 'rir', 'orp', 'sil', 'leg', 'bra', 'sil', 'rir', 'sil', 'orp', 'leg', 'bra', 'sil'];
    state.coops = state.coops.slice(0, 1);
    for (let i = 1; i < breeds.length; i++) { const c = newCoop(breeds[i], i); c.nest.plain = i % 3 ? 3 : 0; if (i % 5 === 0) c.feeder.basic = 0; if (i % 7 === 0) c.feeder.basic = 8; state.coops.push(c); }
    const cols = Object.keys(SIL); let ci = 0;
    for (const c of state.coops.slice(1)) {
      for (let k = 0; k < 5; k++) {
        const sex = k === 0 ? 'r' : 'h';
        const born = k === 4 ? state.gt - 60e3 : k === 3 ? state.gt - T.young - 3600e3 : state.gt - T.adult - DAY;
        const o = { breed: c.breed, sex, traits: shopTraits(), born, home: c.id };
        if (c.breed === 'sil') o.geno = silTemplate(cols[(ci++) % cols.length]);
        const b = makeBird(o); state.birds.push(b); see(b);
      }
    }
    for (let k = 0; k < 4; k++) { const b = makeBird({ breed: breeds[k + 1], sex: k % 2 ? 'r' : 'h', traits: shopTraits(), born: state.gt - T.retire - DAY, home: 'pasture', geno: silTemplate('lavender') }); state.birds.push(b); }
    pendingLevel = 0; changed();
  },
  points() {
    const top = document.querySelector('#farm').getBoundingClientRect().top;
    const sc = (x, y) => [(x - view.x) * view.s, (y - view.y) * view.s + top];
    const m = toMap(GEOM.slots[0], 0.9, 0.6);
    const a = [...agents.values()].find(a => a.plot && a.plot.kind === 'coop' && a.sx != null && a.sy > view.y + 60 && a.sy < view.y + view.vh / view.s - 60);
    return { coop0: sc(m[0], m[1]), bird: a ? sc(a.sx, a.sy - 20) : [0, 0] };
  },
  view() { return { s: view.s, x: view.x, y: view.y, level: state.level, xp: state.xp }; },
  scroll(f) { view.y = (GEOM.size[1] - view.vh / view.s) * f; clampCam(); },
  levelUp() { gainXP(xpFor(state.level + 1) - state.xp); },
  grades(on) { setGrades(on); },
  speed(n) { state.speed = n; },
};
