// The game itself (the new game play, Audrey's brief of 24 Oct 2026: claude/game-plan-v2.md), release 1 step 1: a new
// farm. The farm's state and its rules so far, saved on the phone with checks on every load (Audrey: "Take security of the
// game into account please"), and the game's words in English and French. The 3D village (main.js) draws it.
//
// The farm: coins, XP (the level always comes from the XP, never from the save), the farmer (him or her, and a name),
// the fields owned, the coops (a breed, how far it's been done up: 0 rustic .. 4 Deluxe, where it stands on your land, the
// eggs waiting in its nest, its feeder) and the birds: each breed's forever trio, a rooster
// and two hens with three different personalities, who stay for good and earn experience and trust.
//
// Step 3, eggs and feed: each hen lays twice a day on the phone's own clock, once in the morning and once in the
// afternoon, at times of her own that change from day to day, while her coop's feeder has food in it and its nest has
// room. Tap the nest and the eggs are sold. The feeder goes down as the trio eats; fill it for a few coins. Away from the
// game, the eggs of the last two days are there when you come back; a clock put back gives nothing.
//
// Step 5, levels and land: the XP fills the level ring; a new level's card once, saying what it brings. The farm is split
// into fields along its lanes and the stream; the home field is yours from the start and one more can be bought at each
// level, nearest first, from 100 coins at level 2 to 10,000 at level 30; the rest is wild meadow, fenced off. Then coops
// where you like: each stands where you put it on your land (its middle and which way it faces), moved whenever you like;
// trees, bushes and rocks where it goes are cleared, for good.
//
// Step 6, new breeds by level: the Buff Orpingtons at level 5, the Silkies (white) at 6, the Cream Legbars at 11, the Light
// Brahmas at 17, each a forever trio with its own rustic coop. At its level the level card offers to place it at once;
// otherwise it waits in Your coops (a red dot on the little barn in the top bar) till the player places it. A breed's
// coop only once its level has come, and one each.
//
// Step 8, the Breed Book: a page for each breed (bookPages), found once its coop is on the farm. Nothing new is saved.
//
// Step 4, chicks: now and then a hen goes broody (each morning at 7, a good mum more often than the others; one brood at a
// time in a coop, a day's rest after one, never on the farm's first day). She sits on her eggs for a day (laying none for
// sale), they hatch the next morning (2 or 3 chicks, a good mum 3 or 4) and she raises them; two days later, late in the
// morning, they're grown and go to a new farm, and their coins are yours. Each youngster is a young hen or rooster with a
// rating, 1 to 5 stars, from its parents' experience (stars) and a little luck, and a better one sells for more (Audrey,
// 24 Oct: "In the logic that the chickens from the coop gains experience and produce better and better babies"); a brood
// gives its parents experience.

import { PACKS, LOCALE, langOk, phoneLang, register, tr, ordinal, elide } from './lang.js';      // (elide: French "d’Olive")
export const SAVE_KEY = 'ff3d.farm';
const SAVE_V = 1;

// ---- the words
export const TEXT = {
  en: {
    brand: 'Feather & Field', tagline: 'A flock to love for good',
    level: 'Level', coins: 'Coins', settings: 'Settings', close: 'Close',
    welcome_title: 'Welcome to your farm',
    welcome_body: 'Three Rhode Island Reds are waiting for you: a rooster and two hens. They’re yours for good, so get to know them!',
    lang: 'Language',
    your_farmer: 'Your farmer', him: 'Him', her: 'Her', name: 'Name', start: 'Start my farm',
    hint_start: 'Tap a bird to meet it. Drag to look around, pinch to zoom.',
    hint_move: 'Drag to look around, pinch to zoom, tap a bird.',
    turn_tip_phone: 'Best played sideways: turn your phone', turn_tip_tablet: 'Best played sideways: turn your tablet',
    hen: 'Hen', rooster: 'Rooster', duck: 'Duck', drake: 'Drake', peahen: 'Peahen', peacock: 'Peacock',
    forever_h: 'In your flock for good', forever_r: 'In your flock for good',
    personality: 'Personality', experience: 'Experience', trust: 'Trust',
    exp_none: 'Just arrived: experience grows with time on the farm and with the love you give.',
    trust_lv0: 'Shy', trust_lv1: 'Friendly', trust_lv2: 'Trusting', trust_lv3: 'Best friend',
    trust_body: 'Cuddles build trust: one counts every 6 hours.',
    exp_how: 'Stars come with time on the farm, cuddles and raising chicks.', exp_top: 'All five stars!',
    exp_eggs: 'Each star makes her eggs a coin dearer.', exp_chicks: 'The more stars, the better his chicks.', exp_ducklings: 'The more stars, the better his ducklings.', exp_peachicks: 'The more stars, the better his peachicks.',
    trust_next: '{n} more cuddles to “{level}”', trust_next1: '1 more cuddle to “{level}”', trust_greets: 'Comes to the fence to greet {farmer}.',
    cuddle_btn: '♥ Cuddle', happy_left: 'Happy after a cuddle: {when} left', cuddle_night: 'Cuddles in the morning: everyone here is asleep.',
    cuddle_done: '{farmer} gives {name} a cuddle ♥ +{xp} XP', trust_up1: '{name} is getting friendly with {farmer}.',
    trust_up2: '{name} trusts {farmer} now, and comes to the fence to say hello.', trust_up3: '{name} and {farmer} are best friends! +{xp} XP',
    star_up: '★ {name} has earned a new star!',
    lives_in: 'Lives in: {coop}', since: 'On your farm since {date}',
    coop_rustic: '{coop} (rustic)',
    level_title: 'Level {n}', level_xp: '{xp} of {need} XP to level {next}', level_top: 'Top level!',
    level_how: 'Look after your birds to earn XP.',
    level_up: 'Level {n}!', level_up_sub: 'Your farm is growing.', level_new: 'New at this level', level_gift: 'A gift for your new level: +{c} coins',
    land_new: 'A field is ready to restore: {c} coins', land_show: 'See the field', level_next_land: 'At level {n}: another field to restore',
    land_count: 'Your land: {n} fields', land_count1: 'Your land: 1 field', land_all: 'All the land is yours!',
    land_title: 'An overgrown field', land_body: 'This field is part of your farm, but it has gone wild: brambles, nettles and old odds and ends. Restore it and it’s ready for your coops, for good.',
    land_buy: 'Restore for {c} coins', land_broke: 'Not enough coins yet ({c})', land_bought: 'The field is restored!', land_wild: 'Overgrown field · to restore at level {n}',
        sale_sign: 'TO RESTORE', bub_sale: 'To restore',
    coop_lives: '{names} live here.', and: 'and', rustic: 'rustic',
    look_rustic: 'Rustic', look_mended: 'Mended', look_snug: 'Snug', look_cosy: 'Cosy', look_deluxe: 'Deluxe',
    up_next: 'Upgrade to {look}', up_btn: 'Upgrade · {c} coins', up_broke: 'Not enough coins ({c})', up_top: 'The finest coop on the farm.',
    up_rir_mended: 'A little shed, half painted red, in a bigger pen.', up_rir_snug: 'The Red Barn, in a roomier pen.',
    up_rir_cosy: 'A porch with a bench, lanterns, flowers, and a bigger garden with a swing, a sand bath and a cabbage to peck.',
    up_rir_deluxe: 'A second floor, a copper roof with a cupola, a fountain, a xylophone, a sandbox and the biggest garden, with white pickets and roses.',
    up_orp_mended: 'A little woven hazel hut, half daubed with clay, under new thatch, in a bigger pen.', up_orp_snug: 'The Thatched Cottage, in a roomier pen.',
    up_orp_cosy: 'Hollyhocks, roses, a bench under a rose arch, a lantern, and a bigger garden with a swing, a tin bath of sand and a cabbage to peck.',
    up_orp_deluxe: 'A taller cottage in Suffolk pink with windows in its thatch and a straw pheasant on the roof, a pump and trough, a sand pit under a thatched parasol, a xylophone and the biggest garden, with white pickets and roses.',
    up_sil_mended: 'A little bamboo hut with a roof of split bamboo, half painted in its colour, in a bigger pen.', up_sil_snug: 'The Pagoda Coop, in a roomier pen.',
    up_sil_cosy: 'A cherry tree in blossom, a stone lantern, paper lanterns, and a bigger garden with a swing under a little red gate, a glazed bowl of sand and a cabbage to peck.',
    up_sil_deluxe: 'Three tiers with little gold bells, a koi pond, a zen garden of raked sand, a bamboo xylophone and the biggest garden, with white pickets and roses.',
    up_leg_mended: 'A little stone hut with its roof slated half way and a new door, in a bigger pen.', up_leg_snug: 'The Stone Cottage, in a roomier pen.',
    up_leg_cosy: 'Duck-egg blue windows, wisteria, a dovecote, blue hydrangeas, and a bigger garden with a swing from an apple tree, a wheelbarrow of sand and a cabbage to peck.',
    up_leg_deluxe: 'A storey taller with dormers, a slate porch and two chimneys, a little blue boat full of sand, a water butt, a xylophone and the biggest garden, with white pickets and roses.',
    up_bra_mended: 'A little cabin of new peeled logs under a roof of rough boards, in a bigger pen.', up_bra_snug: 'The Timber Lodge, in a roomier pen.',
    up_bra_cosy: 'A woodpile under its own little roof, a wreath on the door, a birdhouse, toadstools and ferns, and a bigger garden with a swing on log posts, a half log full of sand and a cabbage to peck.',
    up_bra_deluxe: 'A storey taller with a gable over the door, a chimney of river stones and a carved bear, a crib of logs full of sand, water from a log flume, a xylophone and the biggest garden, with white pickets and roses.',
    up_pol_mended: 'Its brick rebuilt, a stubby pine tower half painted and a first pair of sails turning, in a bigger pen.', up_pol_snug: 'The Little Windmill, in a roomier pen.',
    up_pol_cosy: 'Painted Dutch green under red tiles, striped sails, tulips, clogs by the door, and a bigger garden with a swing, a giant clog full of sand and a cabbage to peck.',
    up_pol_deluxe: 'A taller mill in cream and Delft blue with a copper cap and a gallery, a tiled sandbox, a canal with a drawbridge, a windmill feeder, a xylophone and the biggest garden, with white pickets and roses.',
    up_aya_mended: 'Walls of woven bamboo on a stone base and new clay tiles half laid, in a bigger pen.', up_aya_snug: 'The Javanese House, in a roomier pen.',
    up_aya_cosy: 'Green glazed tiles, a frangipani in flower, a banana plant and orchids, and a bigger garden with a swing under a tiled roof, a woven tray of sand and a cabbage to peck.',
    up_aya_deluxe: 'Taller, black and gold, with cream walls, red posts and ceremonial umbrellas, a sand pit of temple stone, a water jar, a little gamelan and the biggest garden, with white pickets and roses.',
    up_call_mended: 'New pine boards half painted duck-egg blue, half a roof of new shingles, its pond cleaned and stones being laid, in a bigger pen.', up_call_snug: 'The Floating House on its raft, in a roomier pen.',
    up_call_cosy: 'A little yellow houseboat with a curved teal roof, bunting, flower boxes, a rowing boat, a wider pond and a beach ball to play with.',
    up_call_deluxe: 'White and navy under a red roof, a little lighthouse, Monet’s green bridge to the door, a fountain, water lilies everywhere, a beach ball and the biggest garden, with white pickets and roses.',
    up_pea_mended: 'New brick half plastered, the marble arches in and the dome a bamboo frame under a blue sheet, in a bigger pen.', up_pea_snug: 'The Garden Pavilion under its turquoise dome, in a roomier pen.',
    up_pea_cosy: 'Pink as Jaipur under a rose dome, marigold garlands, jasmine in brass pots, and a bigger garden with a swing under a little dome, a sandstone basin of sand and a cabbage on a brass lamp-post.',
    up_pea_deluxe: 'White marble inlaid with flowers, a white and gold dome, four slender minarets, a marble pool with a fountain, a marble basin of sand, porcelain cups to ring and the biggest garden, with white pickets and roses.',
    upfx_mended: 'Fewer days without an afternoon egg.', upfx_snug: 'Two eggs a day, every day.',
    upfx_cosy: 'Now and then an evening egg too. Chicks a little better. A cuddle counts again after 5 hours.',
    upfx_deluxe: 'An evening egg every other day. Better chicks. A cuddle counts again after 4 hours.',
    up_room: 'Its bigger pen needs more room here: move the coop first.', up_done: '{coop} is now {look}! +{xp} XP', up_busy: '{farmer} is in the pen: try again in a moment.',
    move_body: 'Put it anywhere on your land. Trees, bushes and rocks in the way are cleared.', move_btn: 'Move this coop',
    move_hint: 'Drag the coop, or tap where it should go.', move_ok: 'A good spot!', move_clear: 'A good spot! What’s in the way will be cleared.',
    move_land: 'Only on your own land.', move_lane: 'Not on a lane or in the water.', move_room: 'Not enough room here.', move_grow: 'Not enough room here for its bigger pen later: the dotted line shows how big it grows.', move_small: 'It fits for now, but its bigger pen won’t fit here later (the dotted line).', move_coop: 'Too close to another coop.',
    move_gate: 'Its gate would be shut in here.', move_turn: 'Turn', move_cancel: 'Cancel', move_place: 'Put it here', moved: 'The coop is in its new place!',
    move_busy: 'One moment: it’s busy at this coop. The move will start by itself as soon as it’s free.',
    coops_title: 'Your coops', coops_aria: 'Your coops', coops_waiting: 'A new coop is waiting for you', coops_new: 'New!', trio_new: 'New breed: {breed}!', trio_new_col: 'New Silkie colour: {col}!',
    trio_body: 'A rooster and two hens, yours for good, with their own coop. Put it anywhere on your land.', trio_body_duck: 'A drake and two ducks, yours for good, with their own house on a pond. Put it anywhere on your land.', trio_body_pea: 'A peacock and two peahens, yours for good, with their own garden pavilion. Put it anywhere on your land.',
    place_now: 'Place their coop now', later: 'Later', later_note: 'It waits for you in your Book, for whenever you like.', place_btn: 'Place it',
    move_short: 'Move', coops_next: 'At level {n}: {breed}', coops_all: 'Every breed is on your farm!',
    no_room: 'No room on your land for another coop yet: restore the next field.', welcome_trio: 'Welcome, {names}!',
    book_title: 'Breed Book', book_btn: '📖 Breed Book', book_found: '{n} of {all} breeds found', book_found1: '1 of {all} breeds found',
    book_on_farm: 'On your farm: {names}', book_at_level: 'Comes at level {n}', book_waiting: 'Their coop is ready: place it whenever you like',
    book_price: '{p} coins an egg, plus a coin for each star of the hen', book_price_duck: '{p} coins an egg, plus a coin for each star of the duck', book_price_pea: '{p} coins an egg, plus a coin for each star of the peahen', book_coop: '{coop}, rustic to start', book_more: 'More pages to come.',
    shows_title: 'Shows', shows_aria: 'Shows', shows_new: 'a new show is open',
    shows_how1: 'Enter one bird in each show. The judge looks at its stars, and at how calm it is in the judge’s hands (trust). A Diva shines a little more.',
    shows_how2: 'Results the next morning at 7:00. 1st, 2nd and 3rd win a rosette, coins and XP, and the rosette stays on the bird’s card for good.',
    shows_how3: 'A win at the County show or the National Championship makes your bird a champion.',
    show_v: '{town} Village Show', show_c: '{county} County Show', show_n: 'National Poultry Championship',
    show_any: 'Any breed can enter', show_only: '{breed}s only', show_locked: 'From level {n}',
    show_when: 'Results at 7:00, in {when}', show_prizes: 'Prizes: 1st {a} · 2nd {b} · 3rd {c} coins',
    show_chance: '{name} · chance of a rosette: {word} ({p}%)', chance0: 'slim', chance1: 'fair', chance2: 'good', chance3: 'great',
    show_enter: 'Enter {name} · {fee}', show_other: 'Choose another bird', show_pick: 'Enter',
    show_in: '{name} is entered: results at 7:00, in {when}', show_none_breed: 'None of your birds is a {breed}.',
    show_none_busy: 'All your birds are entered in other shows.', show_broke: 'Not enough coins: the entry is {fee}',
    show_entered: '{name} is entered in the {show}!', show_card_in: 'In the {show}: results at 7:00, in {when}',
    results_title: 'Show results', res_place: '{name} came {place} in the {show}!', res_none: '{name} didn’t place in the {show} this time ({place} of {of}). Time on the farm and cuddles will help.',
    res_champ: '{name} is a champion now!', res_in: 'The show results are in!',
    rosettes: 'Rosettes', ros_none: 'No rosettes yet: enter a show (the rosette at the top).', tier_v: 'Village', tier_c: 'County', tier_n: 'National',
    shop_title: 'The farm shop', shop_coins: 'Coins come from your eggs, your grown chicks, shows and jobs. Spend them on your farm:',
    dec_flowers: 'Cottage flower bed', dec_birdbath: 'Bird bath', dec_beehives: 'Beehives', dec_duckhouse: 'Duck house', dec_greenhouse: 'Greenhouse', dec_windmill: 'Windmill', dec_bandstand: 'Bandstand', dec_statue: 'Golden cockerel',
    decl_flowers: 'Butterflies come to it.', decl_birdbath: 'Little birds drop in for a bath.', decl_beehives: 'Bees busy over the lavender, and honey to sell: a jar every 8 hours.', decl_duckhouse: 'The ducks sleep in it, on the pond.', decl_greenhouse: 'Tomatoes under glass.', decl_windmill: 'Its sails turn in the wind.', decl_bandstand: 'Music of an evening, and when you tap it.', decl_statue: 'He catches the sun.',
    dec_buy: 'Buy and place · {c}', dec_buy_pond: 'Buy · {c}', dec_level: 'Comes at level {n}', dec_broke: 'Not enough coins yet', dec_owned: 'On your farm', dec_move: 'Move', dec_xp: '+{xp} XP',
    dec_place_hint: 'Drag it, or tap where it should go.', dec_ok: 'A good spot!', dec_ok_clear: 'A good spot! What’s in the way will be cleared.', dec_bad_land: 'Only on your own land.', dec_bad_lane: 'Not on a lane or in the water.', dec_bad_room: 'Not enough room here.', dec_bad_grow: 'This ground is kept for a coop to grow into.', dec_bad_way: 'It would block the way to a coop.',
    dec_placed: 'New on the farm: {name}! +{xp} XP', dec_moved: '{name}: moved!', dec_new: 'New to buy: {names}', dec_card_body: 'Move it anywhere on your land.', dec_new_where: 'In the shop: tap your coins at the top.', dec_no_room: 'No room for it on your land just now: restore the next field, or move things about.', dec_pond_hint: 'Your duck house is on the pond! The ducks will sleep in it tonight.',
    shop_decor: 'Decorations', shop_outfits: 'Outfits', outfits_note: 'New clothes for {farmer}. Each one gives XP when you buy it.',
    shop_seasons: 'Seasons', seasons_note: 'Dresses for your coops: each on sale in its season, then yours for good.',
    dress_xmas: 'Christmas dress', dressl_xmas: 'A garland with coloured lights along the fence, wreaths at the gate, fairy lights on the roof, a gold star and a little tree with presents.',
    dress_when_xmas: 'On sale from 1 December to 6 January.', dress_owned: 'Yours for good: dress a coop from its card.', dress_buy: 'Buy · {c}',
    dress_bought: 'The {name} is yours (+{xp} XP)! Tap a coop to dress it.', dress_on: '🎄 Put on the {name}', dress_off: 'Take off the {name}',
    dress_done: 'Merry Christmas! {coop} is in its {name}.', dress_gone: '{coop} has its everyday look again.', dress_card: 'It wears the {name}.',
    res_dress: 'And a prize on top: the {name}!',
    shop_animals: 'Animals', ani_geese: 'Gertrude and Hector, the geese', anil_geese: 'A pair of geese for the pond: they graze, swim, honk at everything and squabble now and then.',
    ani_dog: '{name}, the farm dog', anil_dog: 'A Border Collie with his kennel and his ball: he does his rounds of the coops, plays, teases the geese, and you choose his name.',
    ani_dog_owned: 'On your farm', ani_see_dog: 'See him', ani_move_kennel: 'Move his kennel', ani_rename: 'Rename', kennel_name: 'Kennel',
    dog_came: '{name} has come to live on your farm! +{xp} XP', kennel_moved: '{name}’s kennel: moved!',
    ani_buy: 'Buy · {c}', ani_owned: 'At the pond', ani_see: 'See them',
    geese_sub: 'Embden goose and Toulouse gander · by the pond', geese_visit: 'Visit them',
    geese_lv0: 'Cross', geese_lv1: 'Wary', geese_lv2: 'Curious', geese_lv3: 'Friends',
    geese_b0: 'They don’t like {farmer} yet: they hiss and chase him out of their field.', geese_b1: 'They put up with {farmer} now, from a distance, and eat the corn once he steps back.',
    geese_b2: 'They come right up to eat the corn by {farmer}.', geese_b3: 'They let {farmer} cuddle them, come to the fence to say hello, and chase Rusty off quicker.',
    geese_next: '{n} more days of visits to “{level}”', geese_next1: '1 more day of visits to “{level}”', geese_how: 'A visit counts once a day.',
    geese_today: 'Today’s visit has counted: come back tomorrow.', geese_night: 'Visits in the morning: {farmer} is asleep.',
    geese_visited: '{farmer} goes to see Gertrude and Hector. +{xp} XP', geese_again: '{farmer} goes to see Gertrude and Hector again (today’s visit has already counted).',
    geese_up1: 'Gertrude and Hector are getting used to {farmer}. +{xp} XP', geese_up2: 'Gertrude and Hector are curious about {farmer} now. +{xp} XP', geese_up3: 'Gertrude and Hector trust {farmer} now! +{xp} XP',
    geese_cuddled: '{farmer} gives Gertrude and Hector a cuddle ♥ +{xp} XP', geese_happy: 'Happy after a cuddle: {when} left', geese_gate: 'The geese’s gate',
    fox_title: 'Last night on the farm', fox_watch: '🎞 Watch it', fox_ok: 'OK',
    fox_eggs: 'Rusty the fox found the door of {hen}’s coop open and took {n} eggs from the nest. The hens are fine, just a little ruffled.',
    fox_eggs1: 'Rusty the fox found the door of {hen}’s coop open and took an egg from the nest. The hens are fine, just a little ruffled.',
    fox_empty: 'Rusty the fox found the door of {hen}’s coop open, but the nest was empty: {hen} pecked him on the nose and he went home.',
    fox_shut: 'Rusty the fox came for the eggs, but the doors were shut. He went home empty-handed.',
    fox_stuck: 'An automatic door stuck open last night.',
    fox_geese: 'Rusty the fox came for the eggs in {hen}’s coop, but the geese heard him and chased him all the way home!',
    fox_dog: 'Rusty the fox came for the eggs in {hen}’s coop, but {dog} heard him and chased him all the way home!',
    fox_team: 'Rusty the fox came for the eggs in {hen}’s coop, but the geese and {dog} heard him and chased him all the way home!',
    fox_farmer: 'Rusty the fox came for the eggs in {hen}’s coop, but {farmer} came out with the torch and sent him home!',
    fox_tip: 'To keep the eggs safe, shut the coops’ doors at night (tap the moon over each door), or get the geese (the shop, Animals).',
    fox_new: 'From now on Rusty the fox may come at night for the eggs: shut the coops’ doors, or get the geese.', geese_came: 'Gertrude and Hector have come to live by the pond! +{xp} XP', geese_hello: 'Tap a goose to say hello.',
    of_classic: 'Classic', of_market: 'Market day', of_garden: 'Garden party', of_winter: 'Winter woollies', of_rodeo: 'Rodeo', of_show: 'Show day',
    ofd_classic: 'Straw hat and a checked shirt.', ofd_market: 'Tweed flat cap and a blue checked shirt.', ofd_garden: 'Flowery sun hat and a yellow gingham shirt.', ofd_winter: 'Bobble hat and a green jumper.', ofd_rodeo: 'Cowboy hat, chambray shirt and a neckerchief.', ofd_show: 'Top hat, white shirt and a prize rosette.',
    out_buy: 'Buy and wear · {c}', out_wear: 'Wear', out_wearing: 'Wearing', out_bought: '{farmer} tries on the {name} outfit! +{xp} XP', out_worn: '{farmer} is wearing the {name} outfit.', out_new: 'New outfit for {farmer}: {names}',
    away_title: 'While you were away', away_for: 'You were away {t}.', away_paused: 'You were away more than 2 days: your hens laid for the last two.',
    away_eggs: '{n} eggs are waiting in your nests', away_eggs1: 'An egg is waiting in a nest', away_full: '{n} nests are full: those hens have stopped laying', away_full1: 'A nest is full: those hens have stopped laying',
    away_hatched: '{name} hatched {n} chicks', away_grown: '{name}’s chicks have grown up: their card is next', away_honey: '{n} jars of honey in the hives', away_honey1: 'A jar of honey in the hives', away_feathers: '{n} peacock feathers to pick up', away_feathers1: 'A peacock feather to pick up', away_apple_egg: '{n} apple eggs under the apple trees', away_apple_egg1: 'An apple egg under the apple tree',
    away_wheat: 'Your wheat is ripe: tap the field to harvest it', away_wheat_grow: 'Your wheat is growing: ripe in {t}', away_feed: '{coop}: the feeder is empty', away_feed_low: '{coop}: the feeder is low',
    away_show: 'The show results are in: they’re next', away_jobs: 'New jobs for today', away_jobs_ready: '{n} job rewards to collect', away_jobs_ready1: 'A job reward to collect',
    away_collect: 'Collect all eggs ({n})', away_ok: 'Off to the farm', away_sold: '{n} eggs sold · +{c} coins',
    intro_1: 'Your forever flock', intro_1b: 'Your three Rhode Island Reds are yours for good, and each has a personality of its own: a Diva, a Rebel, a Glutton… Cuddle them: they trust you more, earn stars and lay better eggs.',
    intro_2: 'Eggs and chicks', intro_2b: 'Each hen lays about two eggs a day: collect them to sell. Now and then a hen raises chicks; grown up, they leave for a new farm and you earn coins.',
    intro_3: 'Land and new breeds', intro_3b: 'Each level, another field of the farm can be restored, and new breeds arrive as trios with their own coop. Put everything where you like.',
    intro_4: 'Shows, honey and more', intro_4b: 'Win rosettes at shows, go fishing in the pond and the river, grow wheat for the feeders, decorate your farm and sell honey. At your own pace: a little each day.',
    intro_5: 'Rusty the fox', intro_5b: 'From level 4, Rusty may come by at night for the eggs; he never harms a bird. Shut the coops’ doors at dusk, or let a Brave hen, the geese or your dog chase him off.',
    intro_next: 'Next', intro_go: 'Let’s go!', intro_skip: 'Skip',
    story_1: 'Grandma has left you her farm, with a letter: “Look after my hens. The rest will come, one step at a time.”',
    story_2: 'Feather & Field is yours now. Her three Rhode Island Reds are waiting at the gate.',
    story_3: 'Every field is yours, but the weeds have taken them back. Each one needs work, and coins, to bring it back to life.',
    story_4: 'Collect the eggs, care for your hens, and bring the farm back to life, field by field.',
    settings_story: '📜 The farm’s story',
    guide_n: 'First day · {n} of {of}', guide_skip: 'Skip', guide_show: 'Show me',
    guide_eggs: 'Collect your first egg: tap the egg over the Red Barn.', guide_eggs_wait: 'Your first egg is on its way: a hen will go in to lay in a moment.',
    guide_cuddle: 'Give a hen a cuddle: tap a hen, then ♥ Cuddle.', guide_cuddle_card: 'Now tap ♥ Cuddle.',
    guide_sow: 'Sow your wheat field: tap its sign, then Sow.', guide_sow_card: 'Tap Sow: the wheat will feed your hens.',
    guide_jobs: 'Today’s jobs: tap the clipboard at the top.', guide_shop: 'Tap your coins: the shop for decorations, animals and outfits.',
    guide_did: 'Well done! +{c} coins, +{x} XP', guide_done: 'Your first day is done! +{c} coins, +{x} XP',
    jobs_title: 'Today’s jobs', jobs_aria: 'Today’s jobs', jobs_new: 'new jobs today', jobs_ready: '{n} to collect',
    job_eggs: 'Collect {n} eggs', job_eggs1: 'Collect an egg', job_cuddle: 'Give {n} cuddles', job_cuddle1: 'Give a cuddle', job_feed: 'Fill a feeder', job_show: 'Enter a bird in a show',
    job_reward: '+{c} coins · +{xp} XP', job_claim: 'Collect', job_paid: 'Done ✓', jobs_note: 'New jobs every day at midnight.',
    job_done: 'Job done: {job}! Collect your reward in Today’s jobs.', job_claimed: '+{c} coins · +{xp} XP',
    show_sign_v: 'Village Show', show_sign_c: 'County Show', show_sign_n: 'National Championship',
    showday_title: 'Show day!', showday_body: 'The results of the {show} are in: the judge is looking at the birds.', showday_watch: 'Watch the judging', showday_results: 'Just the results', skip: 'Skip',
    sd_arrive: '{farmer} brings {name} to the show…', sd_judge: 'The judge looks at every bird…', sd_rosettes: 'And now, the rosettes!',
    champ_c: 'County champion', champ_n: 'National champion', show_new_c: 'The County show: entry {f}, 1st prize {p} coins', show_new_n: 'The National Championship: entry {f}, 1st prize {p} coins',
    book_sil: 'White Silkie', egg_rir: 'Brown eggs', egg_orp: 'Light brown eggs', egg_sil: 'Cream-tinted eggs', egg_leg: 'Blue eggs', egg_bra: 'Light brown eggs', egg_pol: 'White eggs', egg_aya: 'Cream eggs', egg_call: 'Pale green duck eggs', egg_pea: 'Big cream peafowl eggs',
    coins_body: 'Coins come from your eggs and your grown chicks. You’ll spend them on feed, land, coops and more.',
    settings_music: 'Music', settings_sounds: 'Sounds', music_on: 'On', music_off: 'Off', settings_music_note: 'The music comes now and then, by day and of an evening.',
    settings_lang: 'Language', settings_new: 'Start a new farm', settings_new_sure: 'Tap again to start again from nothing',
    settings_edited: 'This farm was changed outside the game: everything in it has been checked.',
    settings_version: 'Version {v}',
    credits: 'Music: {music}. Sounds: {sounds}. The peacock’s call: {peacock} ({lic}), cleaned up.',                   // (Settings: thanks to whose music and sounds these are; the peacock's recording asks for it, CC BY)
    saved_here: 'Your farm is saved on this phone.',
    code_t: 'Your farm code', code_how: 'Copy your farm code and keep it somewhere safe (Notes is fine). Paste it here on another phone, or after clearing Safari, to carry on where you left off.', code_how_app: 'Copy your farm code and keep it somewhere safe (Notes is fine). Paste it here on another phone, or after reinstalling the game, to carry on where you left off.', notes_shows: "Shows", notes_crops: "Garden, wheat & honey", nt_garden_t: "The garden is ripe 🥕", nt_garden: "Your {crop} are ready to pick.", notes_chicks: "Chicks", notes_eggs: "Eggs", nt_eggs_t: "Fresh eggs 🥚", nt_eggs: "{n} eggs are waiting in the nests.", nt_hatch_t: "Chicks! 🐣", nt_wheat_t: "The wheat is ripe 🌾", nt_wheat: "Your wheat is golden and ready to harvest.", nt_honey_t: "Honey 🍯", nt_honey: "The beehives are full: {n} jars of honey to collect.", nt_show_t: "Show results 🏆", nt_show: "The judge has been! Come and see where {name} was placed.", nt_miss_t: "Your farm misses you", nt_miss: "{names} miss you! Come and say hello.", settings_notes: "Reminders", notes_note: "Choose the ones you’d like. Never at night, two a day at most; and if you’re away for 3 days, a note from your hens.", notes_denied: "Notifications are turned off for Feather & Field on your phone: Settings > Notifications.", notes_ask_t: "Reminders?", notes_ask: "Shall I let you know when eggs are waiting, chicks hatch, the wheat or the honey is ready, and when the show results are in? Never at night, two a day at most.", notes_yes: "Yes please", notes_no: "Not now", notes_ask_note: "You can choose which ones, or turn them off, any time in Settings.",
    code_copy: 'Copy my farm code', code_paste: 'Paste a farm code here', code_load: 'Load this farm', code_load_sure: 'Tap again to replace this farm', code_note: 'Loading a farm replaces the one on this phone.',
    code_copied: 'Farm code copied. Paste it into Notes to keep it safe.', code_select: 'Here is your farm code: select it all and copy it.', code_bad: 'That farm code doesn’t work. Copy it again, all of it.',
    code_old: 'That code is from the first Feather & Field: this new farm starts fresh.', code_loaded: 'Farm loaded: level {n}. Welcome back!',
    first_t: 'The first Feather & Field', first_how: 'Your farm from the first game is kept just as it was. Open it whenever you like.', first_open: 'Open the first game',
    welcome_first: 'Your farm from the first game is safe in Settings.',
    // My account (release 7: account.js): the farm saved online with a Google account
    acct_t: 'My account', acct_how: 'Sign in with Google to save your farm online too: you won’t lose it if you change phones or clear Safari, and you can play it on another phone.',
    acct_google: 'Sign in with Google', acct_privacy: 'Your farm is kept on Google’s Firebase servers in Europe, linked to your Google account. Only you can open it, and the game never sees your password.',
    acct_who: 'Google account: {name}', acct_saved: 'Saved online: {when}', acct_saving: 'Saving online…', acct_offline: 'Not saved online just now: no connection. It will be as soon as you’re back online.',
    acct_empty: 'Nothing saved with this account yet: your new farm will be saved online once it’s started.',
    acct_out: 'Sign out', acct_out_done: 'Signed out. Your farm stays on this phone.', acct_del: 'Delete my account', acct_del_sure: 'Tap again to delete your account and your farm online',
    acct_deleted: 'Your account is deleted, with your farm online. Your farm stays on this phone.', acct_failed: 'Signing in didn’t work. Please try again.',
    acct_popup: 'Your browser blocked Google’s window: allow pop-ups for this site, then try again.', acct_new_sure: 'Tap again to start again from nothing, here and online',
    two_t: 'Which farm to keep?', two_how: 'This phone and your account each have a different farm. Choose the one to keep: it replaces the other.',
    two_here: 'On this phone', two_online: 'Saved online', two_farmer: '{name}’s farm', two_sum: 'Level {lv} · {c} coins', two_when: 'Last played: {when}', two_keep: 'Keep this farm',
    nudge_t: 'Keep your farm safe', nudge_how: 'Sign in with Google and your farm is saved online too. You won’t lose it if you change phones, and you can play it on another phone.',
    nudge_later: 'Not now', nudge_note: 'It’s up to you: you can sign in any time in Settings.', welcome_signin: 'Have a farm saved online? Sign in',
    privacy: 'Privacy',                                            // (the privacy page: privacy.mjs)
    loading: 'Loading your farm…', sideways: 'Turn your phone sideways to play',
    eggs: 'Eggs', lays: 'Lays about 2 eggs a day, {p} coins each.', lays_sil: 'Lays about an egg a day, {p} coins each: Silkies are better mums than layers.',
    eggs_sold1: '1 egg sold · +{c} coins', eggs_sold: '{n} eggs sold · +{c} coins',
    eggs_fresh1: '1 fresh egg sold · +{c} coins · +{xp} XP', eggs_fresh: '{n} eggs sold · +{c} coins · {f} fresh: +{xp} XP',
    no_eggs: 'No eggs yet', laying: '{name} is laying…',
    first_egg: '{name} has laid your first egg! Tap the nest to collect it.',
    nest_full: 'The nest is full: collect the eggs so your hens can lay again.',
    feeder_title: 'Feeder · {coop}', feed_full: 'Full', feed_pct: '{p}% full', feed_empty: 'Empty',
    feed_hours: 'Enough for about {h} hours.', feed_hour: 'Enough for about an hour.', feed_days: 'Enough for about three days.',
    feed_empty_line: 'Your hens stop laying until it’s filled.', feed_empty_line_duck: 'Your ducks stop laying until it’s filled.', feed_empty_line_pea: 'Your peahens stop laying until it’s filled.',
    feed_how: 'Your hens lay while there’s food in it. Full, it feeds your trio for three days.', feed_how_duck: 'Your ducks lay while there’s food in it. Full, it feeds your trio for three days.', feed_how_pea: 'Your peahens lay while there’s food in it. Full, it feeds your trio for three days.',
    fill_grain: 'Fill it with your grain (free)', fill_grain_c: 'Fill it · {c} coins + your grain', feed_grain: 'Your grain from the wheat field: {n} (used first).',
    filled_grain: 'Feeder filled with your own grain', farmer_grain: '{farmer} is on the way with your grain',
    wheat_title: 'Your wheat field', wheat_soil: 'Ploughed and ready to sow.', wheat_sown: 'Sown: the first shoots soon.', wheat_sprouts: 'The first green shoots.', wheat_growing: 'Growing tall and green.', wheat_ripe: 'Golden and ready to harvest!',
    wheat_how: 'Sow it for {c} coins; 4 hours later it’s ripe. Harvested, it gives {g} grain for your feeders (they use it before coins) and {xp} XP.',
    wheat_left: 'Ripe in {t}', wheat_store: 'Grain in store: {n} of {max}', wheat_sow: 'Sow · {c} coins', wheat_harvest: 'Harvest', wheat_move: 'Move the field', wheat_broke: 'Not enough coins to sow yet',
    bub_sow: 'Sow', bub_harvest: 'Harvest', wheat_sowing: '{farmer} is on the way to sow the wheat · −{c} coins', wheat_sowed: 'Wheat sown · −{c} coins. Ripe in 4 hours.',
    wheat_cutting: '{farmer} is on the way to harvest the wheat', wheat_done: 'Wheat harvested: +{g} grain for the feeders · +{xp} XP', wheat_full: 'Wheat harvested · +{xp} XP (your grain store is full)',
    honey_title: 'Honey', honey_jars: '{n} jars of honey', honey_jar: 'A jar of honey', honey_none: 'No honey yet: the next jar in {t}.', honey_going: '{farmer} is on the way to the beehives',
    feather_sold1: 'A peacock feather sold · +{c} coins',
    apple_tree: '🍎 {n} apples on {name}’s tree', apple_tree1: '🍎 An apple on {name}’s tree', apple_tree0: '🍎 No apples on {name}’s tree yet: the next one in {t}',
    apple_egg_wait: '🍎 An apple egg is waiting under {name}’s tree: tap it', apple_laid: '🍎 Two apples, and {name} laid an apple egg! Tap it to sell it',
    apple_egg_sold: 'An apple egg sold · +{c} coins · +{xp} XP', apple_planted: '🍎 An apple tree for {name} the Glutton, just outside her coop: watch her slip out for its apples',
    apple_line: '🍎 Now and then she slips out over the fence to her apple tree and hops for its apples: after two, she lays an apple egg, worth three eggs.',
    apple_line0: '🍎 She’d love an apple tree just outside her coop: it’s planted as soon as there’s room on one side of it (your own land, clear of lanes and other coops).',
    honey_sold: '{n} jars of honey sold · +{c} coins', honey_sold1: 'A jar of honey sold · +{c} coins',
    // fishing (release 5)
    fish_rudd: 'Rudd', fish_roach: 'Roach', fish_perch: 'Perch', fish_tench: 'Tench', fish_golden_tench: 'Golden tench', fish_koi: 'Koi', fish_big_bertha: 'Big Bertha', fish_bream: 'Bream', fish_crucian: 'Crucian carp', fish_sunfish: 'Pumpkinseed',
    fish_bleak: 'Bleak', fish_barbel: 'Barbel', fish_rainbow_trout: 'Rainbow trout',
    fish_netted: 'Into the keep net 🧺 · worth {c} coins', catch_title: 'Your keep net', catch_sub: 'Sell your catch, or keep some in the fish box for the villagers’ orders.', catch_keep: 'Keep', catch_kept: 'Kept ✓', catch_sell: 'Sell · +{c} coins', catch_sell0: 'Put them in the fish box', catch_box: 'Fish box: {n} of {max}', catch_box_note: 'Fish in the box go to the villagers’ orders that ask for fish.', catch_box_sell: 'Sell the box · +{c} coins', catch_sold: '{n} fish sold · +{c} coins', catch_sold1: '{n} fish sold · +{c} coins', catch_boxed: '{n} in the fish box', catch_open: '🧺 Keep net: {n} to sell', catch_none: 'Your keep net is empty.', fish_tin_tomorrow: 'One tin a day: another tomorrow', book_fish_am: 'Bites early in the morning (6 to 10)', book_fish_noon: 'Bites around midday (11 to 3)', book_fish_eve: 'Bites in the evening (from 5)', book_fish_legend: 'Only once every other fish here is caught',
    fish_minnow: 'Minnow', fish_gudgeon: 'Gudgeon', fish_dace: 'Dace', fish_chub: 'Chub', fish_brown_trout: 'Brown trout', fish_grayling: 'Grayling', fish_old_snapjaw: 'Old Snapjaw',
    fish_new: 'Fishing at the pond: tap its dock', fish_new_river: 'Fishing in the river: tap its footbridge', fish_show_river: 'Show me the river',
    book_tab_birds: 'Breeds', book_tab_fish: 'Fish', book_fish_found: '{n} of {all} fish caught', book_fish_pond: 'The pond', book_fish_river: 'The river',
    fish_rare0: 'Common', fish_rare1: '✦ Rare', fish_rare2: '✦✦ Legendary', book_fish_caught: 'Caught {n} times · your biggest {cm} cm', book_fish_caught1: 'Caught once · {cm} cm',
    book_fish_not: 'Not caught yet', book_fish_level: 'Fishing here opens at level {n}', book_fish_size: '{a} to {b} cm', book_fish_price: 'about {c} coins', book_fish_photo: 'its photo {c} coins', fish_going_river: '{farmer} is off to the footbridge',
    river_title: 'Fishing in the river', river_body: 'Minnows, gudgeon, dace and chub live in the river, and rarer fish that bite only at certain hours. Your catch goes into a keep net: sell it when you stop, or keep some for the villagers’ orders.', fish_show: 'Show me the pond',
    dock_title: 'Fishing at the pond', dock_body: 'Rudd, roach, perch and tench live in the pond, and rarer fish that bite only at certain hours. Your catch goes into a keep net: sell it when you stop, or keep some for the villagers’ orders.',
    fish_worms: '{n} worms', fish_worms1: '1 worm', fish_worms0: 'No worms left', fish_hens: 'Your chickens who love {farmer} find worms every day: tap one and ask.', fish_gift: 'A tin of {n} worms to start with 🪱', fish_go: 'Go fishing',
    fish_noworms: 'No worms left: ask your chickens who love {farmer} (tap one), or buy a tin at the dock.',
    worms_ask: 'Ask for worms · 🪱 {n}', worms_given: '🪱 {name} found worms for {farmer} today. More tomorrow!',
    worms_shy: '🪱 {name} is still shy: no worms for {farmer} yet. Cuddles help.', worms_how: 'Worms found each day: Friendly 1 · Trusting 2 · Best friend 3.',
    worms_done: '{name} is finding {n} worms for {farmer} 🪱', worms_done1: '{name} is finding a worm for {farmer} 🪱', worms_night: '{farmer} is asleep: worms in the morning', fish_level: 'Fishing opens at level {n}.',
    // the daily egg hunt (7 Nov 2026)
    hunt_hint: '🥚✨ {hen} has hidden today’s golden egg somewhere on your farm. Can you find it?', hunt_found: '✨ You found {hen}’s golden egg! +{c} coins, +{x} XP',
    hunt_streak: '{n} days in a row', hunt_total: 'golden eggs found: {n}', hunt_lv_t: 'New: a golden egg to find every day', hunt_lv_b: 'Each day one of your hens hides a golden egg somewhere on your farm. Find it for coins and XP, more for each day in a row.',
    // the vegetable garden (7 Nov 2026)
    garden_title: 'Your vegetable garden', garden_how: 'Sow a bed for a few coins and pick it when it’s ripe: carrots grow fastest, pumpkins slowest. Your birds love them as treats, and the villagers ask for them too.',
    crop_carrot: 'Carrots', crop_straw: 'Strawberries', crop_pump: 'Pumpkins', bed_n: 'Bed {n}', bed_empty: 'Ready to sow. What shall we grow?', bed_sow: '{c} coins · {t}',
    bed_sown: 'Just sown: the first shoots soon.', bed_shoots: 'The first little shoots.', bed_growing: 'Growing well.', bed_ripe: 'Ripe! {n} to pick.', bed_pick: 'Pick',
    basket_title: 'Your basket', basket_how: 'Tap one of your birds to give their coop a treat. Villagers’ orders take from your basket too.', garden_move: 'Move the garden',
    garden_sowing: '{farmer} is on the way to sow the {crop}', garden_sowed: '{e} {crop} sown · −{c} coins. Ripe in {t}.', garden_broke: 'Not enough coins for the seeds yet',
    garden_picking: '{farmer} is on the way to pick the {crop}', garden_picked: '{e} +{n} {crop} in your basket · +{xp} XP', garden_part: '{e} +{n} {crop} in your basket (it’s full of them now) · +{xp} XP',
    garden_full: 'No room left for {crop} in your pantry. Sell some, or keep them for an order.', crop_l_carrot: 'carrots', crop_l_straw: 'strawberries', crop_l_pump: 'pumpkins',
    bub_pick: 'Pick', bub_plant: 'Sow', garden_lv_t: 'New: your vegetable garden', garden_lv_b: 'By the farmhouse: grow carrots, strawberries and pumpkins. Treats your birds love, and the villagers will ask for them.',
    treat_btn: '🍓 A treat for the coop', treat_title: 'A treat for {coop}', treat_body: 'Something from the garden! One treat a day for each coop.',
    treat_carrot: 'An extra egg from each hen, soon after.', treat_straw: 'An extra egg from each hen, and a little experience for every bird.', treat_pump: 'Two extra eggs from each hen, and a little experience for every bird.',
    treat_have: 'It takes {need} · in your basket: {n}', treat_give: 'Give it', treat_none: 'Nothing in your basket yet: grow some in your vegetable garden.',
    treat_had: '🍓 They’ve had their treat today. Another one tomorrow!', treat_given: '{farmer} brings them a treat · extra eggs coming soon', treat_given_x: '{farmer} brings them a treat · extra eggs coming soon, and a little experience for every bird',
    ord_carrot: 'Carrots', ord_straw: 'Strawberries', ord_pump: 'Pumpkins', ord_veg_have: '(in your pantry: {n})', ord_sub_veg: 'Everything comes from your pantry.',
    away_garden: 'Your vegetable garden is ready to pick', away_garden1: 'A bed in your vegetable garden is ready to pick', garden_aria: 'The vegetable garden',
    // village orders (7 Nov 2026)
    ord_q: '“{l}”', ord_title: 'Village orders', ord_sub: 'Villagers ask for a basket. Fill it and deliver it for coins.',
    ord_eggs: 'Eggs', ord_fish: 'Fish', ord_honey: 'Jars of honey', ord_grain: 'Grain', ord_grain_have: '(in your pantry: {n})',
    ord_pay: '{c} coins · {x} XP', ord_surprise: '🎁 A surprise inside!', ord_deliver: 'Deliver the basket', ord_decline: 'Not this one',
    ord_none: 'No orders just now.', ord_next: 'The next one comes in {t}.', ord_ready: '🧺 The basket for {name} is ready: tap the stall to deliver it', ord_readyb: 'Ready!',
    ord_new: '📜 A new order from {name}', ord_new2: '📜 {n} new village orders: tap the basket', ord_set: '🧺 {n} for {name}', ord_fish_set: 'For {name}’s order 🧺',
    ord_done: 'Delivered to {name}: +{c} coins, +{x} XP', ord_sp_worms: '🎁 Surprise: a tin of {n} worms!', ord_sp_grain: '🎁 Surprise: a sack of {n} grain!', ord_sp_coins: '🎁 Surprise: {c} coins more!',
    ord_declined: 'Turned down: what was set aside for it sold · +{c} coins', ord_declined0: 'Turned down: another order will come along',
    ord_lv_t: 'New: village orders', ord_lv_b: 'Villagers ask for baskets of eggs, fish, honey or grain, and pay well: tap the stall by the farmhouse.',
    ord_aria: 'Village orders', ord_stall: 'The farm stall', ord_on_way: '{farmer} is taking the basket to the stall',
    vil_potts: 'Mrs Potts', vil_potts_s: 'Mrs Potts', vil_potts_r: 'the baker', vil_potts_l: 'For my sponge cakes, if you please!',
    vil_finch: 'Mr Finch', vil_finch_s: 'Mr Finch', vil_finch_r: 'the aquarium shop', vil_finch_l: 'Something for the big tank in my window.',
    vil_lily: 'Lily', vil_lily_s: 'Lily', vil_lily_r: 'the tea room', vil_lily_l: 'Warm scones need the very best!',
    vil_tom: 'Old Tom', vil_tom_s: 'Old Tom', vil_tom_r: 'the miller', vil_tom_l: 'My mill’s been quiet all week.',
    vil_amara: 'Dr Amara', vil_amara_s: 'Dr Amara', vil_amara_r: 'the vet', vil_amara_l: 'A treat for me, and one for my cat Pudding.',
    vil_clara: 'Miss Clara', vil_clara_s: 'Miss Clara', vil_clara_r: 'the village school', vil_clara_l: 'It’s cooking class on Friday!',
    vil_marco: 'Marco', vil_marco_s: 'Marco', vil_marco_r: 'the café', vil_marco_l: 'My breakfasts are famous thanks to you.',
    vil_fete: 'The fête', vil_fete_s: 'the fête', vil_fete_r: 'the village committee', vil_fete_l: 'Prizes for the tombola, please!',
    fish_tin: 'A tin of {n} worms', fish_tin_buy: 'Buy · {c} coins', fish_tin_bought: '{n} worms in the tin · −{c} coins',
    fish_going: '{farmer} is off to the dock', fish_night: '{farmer} is asleep: fishing in the morning', fish_busy: '{farmer} is busy: try again in a moment',
    fish_cast: 'Tap the water to cast', fish_wait: 'Watch the float…', fish_bite: 'Tap when the marker is in the green!', fish_soon: 'Not yet: wait for a bite',
    fish_missed: 'It got away with the worm', fish_reel: 'Hold to reel in. Keep the line in the green',
    fish_snap: 'Too hard: the line snapped and it swam off', fish_slip: 'Left alone, it swam away', fish_stop: 'Stop fishing', fish_keep: 'Keep fishing', fish_stop1: 'Stop',
    // (9 Nov 2026) one job at a time: what the farmer's doing, over the buttons that wait for him
    busy_cuddle: '{farmer} is giving {name} a cuddle.', busy_worms: '{farmer} is collecting {name}’s worms.', busy_fill: '{farmer} is filling a feeder.',
    busy_treat: '{farmer} is taking a treat to a coop.', busy_fish: '{farmer} is fishing.', busy_geese: '{farmer} is visiting the geese.',
    busy_sow: '{farmer} is sowing the wheat.', busy_harvest: '{farmer} is harvesting the wheat.', busy_honey: '{farmer} is collecting the honey.',
    busy_garden: '{farmer} is in the vegetable garden.', busy_order: '{farmer} is taking a basket to the stall.', busy_cheer: '{farmer} is seeing the youngsters off.',
    busy_fox: '{farmer} is chasing Rusty away.', busy_work: '{farmer} is busy.', busy_wait: 'Ask for anything else: it’ll be done next (up to 3 jobs).',
    busy_wait_fish: 'Ask for another job and the rod is put down for it.',
    next_list: 'Next: {list}.', next_added: 'Added to {farmer}’s list ({n} of 3): {job}.', next_full: '{farmer}’s list is full: 3 jobs waiting.', next_already: 'Already on {farmer}’s list.',
    next_cuddle: 'a cuddle for {name}', next_worms: '{name}’s worms', next_fill: 'a feeder', next_treat: 'a treat', next_fish: 'fishing', next_geese: 'the geese',
    next_sow: 'sowing the wheat', next_harvest: 'the wheat harvest', next_honey: 'the honey', next_garden: 'the garden', next_order: 'a basket for the stall',
    // (9 Nov 2026) fishing: what to do now, on its panel; how to fish, its card
    fish_casting: 'Casting…', wheat2_title: 'Your second wheat field', wheat2_more_t: 'A second wheat field', wheat2_more: 'Add this field · {c} coins', wheat2_more_broke: 'Add this field · {c} coins (not enough yet)', wheat2_bought: '🌾 Your second wheat field is ready to sow · −{c} coins. Move it from its card if you like.', bed_more_t: 'Bed {n}: a new one', bed_more: 'Add this bed · {c} coins', bed_more_broke: 'Add this bed · {c} coins (not enough yet)', bed_more_lv: 'From level {l}, for {c} coins.', bed_bought: '🟫 Bed {n} is yours · −{c} coins. Sow it whenever you like.', bed_bought_moved: '🟫 Bed {n} is yours · −{c} coins. The garden moved a little to have room for its second row.', bed_noroom: 'No room here for a second row of beds: move the garden somewhere roomier first.', garden_all: 'See all the beds', replay_bad: 'Rusty took {n} eggs last night · Watch', replay_bad1: 'Rusty took an egg last night · Watch', apple_wait: '🍎 No room for the apple tree beside the bigger pen: it’s safe in its tub and comes back by itself when the coop has room at its side (move the coop to give it some).', book_coop_wait: 'A coop is waiting: {breed}', book_see: 'See', coop_waits: '🏠 A new coop is waiting in your Book: place it whenever you like.', cuddle_all_done: 'A cuddle for everyone here ♥ +{xp} XP', sound_test: 'Test the sound', sound_test_ok: 'Two notes just played, then a farm sound and one of your hens. If you didn’t hear the notes, turn the volume up with the side buttons while the game is open.', sound_test_wait: 'The sound is waking up: tap once more.', sound_test_none: 'This device gives the game no sound.', nav_book: 'Book', nav_coops: 'Coops', nav_orders: 'Orders', nav_jobs: 'Jobs', nav_shows: 'Shows', move_snapped: 'Nudged to where it fits, with room to grow.', coop_inside: 'Look inside', eggs_pantry_f1: '🥚 1 fresh egg to your pantry · +{xp} XP', eggs_pantry_f: '🥚 {n} eggs to your pantry, {f} fresh · +{xp} XP',
    pantry_btn: 'Pantry', pantry_title: 'Your pantry', pantry_sub: 'Everything you collect is kept here. Sell it when you like, or keep it for the villagers’ orders.', pantry_orders: '🧺 {n} kept for orders', pantry_sell: 'Sell {n} · +{c} coins', pantry_sell_kept: 'Sell anyway · +{c} coins', pantry_grow: 'Your shelves get bigger as your farm levels up.', pantry_sold: 'Sold: {n} · +{c} coins', pantry_empty: 'Empty', pantry_full: 'Full', eggs_pantry1: '🥚 1 egg to your pantry · +{xp} XP', eggs_pantry: '🥚 {n} eggs to your pantry · +{xp} XP', pantry_over: 'Pantry full: {n} sold · +{c} coins', honey_pantry1: '🍯 1 jar of honey to your pantry', honey_pantry: '🍯 {n} jars of honey to your pantry', pantry_grain: 'Your feeders use this grain first.', pantry_big_t: 'Bigger shelves', pantry_big_d: 'Half as much room again on every shelf, for good.', pantry_big_on: 'Bigger shelves: yours ✓', pantry_first: 'Your eggs wait here. Tap Sell to turn them into coins.',
    shop_btn: 'Shop',
    hist_more: 'Learn more',
    hist_less: 'Show less',
    hist_rir: 'Bred in the 1850s in Rhode Island and Massachusetts, in the United States, from local farm hens and birds brought by ship from Asia. Hardy and dependable, it became one of the world’s best-loved layers and is the state bird of Rhode Island.',
    hist_orp: 'Created in 1886 by William Cook in the village of Orpington, in Kent, England. He wanted a bird that laid well and looked handsome too. Big, fluffy and gentle, Orpingtons soon won hearts all over the world.',
    hist_sil: 'A very old breed from Asia, most likely China. In the 1200s the traveller Marco Polo wrote of hens with “hair like cats”. Under the fluff, Silkies have dark skin and five toes on each foot, and they make devoted mothers.',
    hist_aya: 'From the island of Java, in Indonesia, where “ayam” simply means chicken. It is black all over: feathers, beak, skin and even bones. In Java it has long been thought to bring good luck.',
    hist_call: 'A tiny duck bred in the Netherlands, probably from birds that first came from Asia. Hunters once used its loud, clear call to draw wild ducks closer, which is how it got its name. Today it is kept for its charm.',
    hist_leg: 'From Tuscany, in Italy. It takes its name from the port of Livorno, called Leghorn in English, where the birds were loaded onto ships for America in the 1800s. Light and lively, it is a champion layer of white eggs.',
    hist_pol: 'Despite its name, the Polish most likely comes from the Netherlands, where it appears in paintings from the 1600s. Its name may come from an old Dutch word for “head”, after its splendid crest.',
    hist_bra: 'Bred in the United States in the 1840s from very large birds brought from Shanghai, in China, and named after the Brahmaputra river. In 1852 a few were sent to Queen Victoria. Huge but gentle, it is called the “King of Chickens”.',
    hist_pea: 'The Indian peafowl comes from India and Sri Lanka, and is the national bird of India. People have kept peafowl in their gardens for more than two thousand years. Only the peacock has the great train, which he fans out to impress the peahens.',
    catch_want: '🧺 For an order', catch_orders: 'Villagers’ orders still need {n} fish. Keep the ones marked.', catch_orders1: 'A villager’s order still needs 1 fish. Keep the one marked.', catch_orders0: 'No order needs fish right now.',
    mile_tab: 'Milestones', mile_sub: 'Keepsakes on your shelf: {n} of {all}', mile_collect: 'Collect · +{c} coins', mile_got: '🏅 {name}: +{c} coins, +{xp} XP', mile_keep: '🏅 {name}: +{c} coins, +{xp} XP, and a keepsake for your shelf!', mile_all: 'All done ✓', mile_secret: '???', mile_secret_d: 'A secret of the pond. Keep your eyes open…', mile_shelf: 'Your keepsakes', mile_fish: 'Angler', mile_fish_d: 'Different fish caught', mile_friends: 'Best friends', mile_friends_d: 'Birds who are your best friends', mile_chicks: 'Nursery', mile_chicks_d: 'Chicks raised', mile_gold: 'Golden eggs', mile_gold_d: 'Golden eggs found', mile_eggs: 'Egg basket', mile_eggs_d: 'Eggs collected', mile_wheat: 'Harvest', mile_wheat_d: 'Wheat harvests', mile_veg: 'Kitchen garden', mile_veg_d: 'Vegetables picked', mile_orders: 'Village friend', mile_orders_d: 'Orders delivered', mile_ros: 'Show star', mile_ros_d: 'Rosettes won', mile_night: 'Goodnight', mile_night_d: 'Goodnight rounds done', mile_coins: 'Nest egg', mile_coins_d: 'Coins earned', mile_foxfirst: 'A visitor in the night', mile_foxfirst_d: 'Rusty’s first visit', mile_foxin: 'Oops!', mile_foxin_d: 'Rusty got to the eggs', mile_rusty: 'Fox-proof', mile_rusty_d: 'Nights Rusty went home with nothing', mile_love: 'Love at the pond', mile_love_d: 'You saw the salmon and the little frog', gn_btn: 'Goodnight', gn_done: 'Goodnight, everyone! Every door will shut for the night · +{c} coins · +{xp} XP', dawn_worms: '🪱 {n} worms found this morning', job_claim_all: 'Collect all', jobs_bonus: 'All three jobs done: +{n} worms 🪱', jobs_note2: 'Finish all three for {n} worms.', cuddle_all: '♥ Cuddle everyone here', cuddle_all_go: '{farmer} is off to cuddle everyone here ♥ +{xp} XP', cuddle_all_none: 'Everyone here has had a cuddle for now.',
    fish_try2: 'Missed! 2 tries left', fish_try1: 'Missed! Last try', find_farmer: 'Find {farmer}', find_home: '{farmer} is at home', fish_again: 'It let go… it’ll bite again', fish_watch: 'Wait for a bite…', fish_nibble: 'A nibble… not yet!',
    fish_r_hold: 'Hold your finger down to reel in', fish_r_good: 'Got it! In it comes…', fish_r_ease: 'It’s pulling! Let go a moment',
    fish_r_slack: 'Too slack! Hold again',
    fhelp_title: 'How to fish', fhelp_1t: '1. Cast', fhelp_1: 'Tap the water.',
    fhelp_2t: '2. Wait for a bite', fhelp_2: 'Watch the float until it dives.',
    fhelp_3t: '3. Tap in the green', fhelp_3: 'Tap when the marker is in the green. You get 3 tries.',
    fhelp_slack: 'Slack: hold', fhelp_good: 'Blue: hold', fhelp_tight: 'Red: let go', fhelp_first: 'Your first catch will be an easy one.', fhelp_ok: 'Got it!',
    fish_size: '{cm} cm', fish_first: 'New fish for your book!', fish_best: 'Your biggest yet!', fish_xp: '+{xp} XP',
    fish_sold: 'Off to the village aquarium shop, live and well · +{c} coins',
    fish_photo_big_bertha: 'Her photo for your book, then back into the pond she goes. The village paper buys your photo · +{c} coins',
    fish_photo_old_snapjaw: 'His photo for your book, then back into the river he goes. The village paper buys your photo · +{c} coins',
    fish_caught_n: 'Caught {n} times', fish_caught_1: 'Caught once', fish_tap_dock: 'The pond',
    fill_btn: 'Fill it · {c} coins', fill_part: 'Fill what you can · {c} coins', fill_scraps: 'Kitchen scraps (free)', fill_full: 'It’s full', fill_broke: 'Sell some eggs first',
    filled: 'Feeder filled · −{c} coins', filled_scraps: 'Kitchen scraps in the feeder: enough for a few hours.',
    farmer_feed: '{farmer} is on the way with the feed · −{c} coins', farmer_feed_g: '{farmer} is on the way with your grain', filled_g: 'Feeder filled with your grain', farmer_scraps: '{farmer} is on the way with some kitchen scraps',
    bub_low: 'Feed low', bub_empty: 'Feeder empty',
    broody: '{name} has gone broody: she’s sitting on {n} eggs.',
    hatched: '{n} chicks have hatched! {name} is a mum.',
    hatched_duck: '{n} ducklings have hatched! {name} is a mum.', raising_duck: 'Raising {n} ducklings: young ducks and drakes in about {when}.',
    raising_y_duck: 'Raising {n} young ducks and drakes: off to a new farm in about {when}.', no_lay_brood_duck: 'She lays no eggs for sale while she’s busy with her ducklings.',
    duckling: 'Duckling', chick_of_duck: '{breed} · {name}’s duckling', chick_grows_duck: 'A young duck or drake in about {when}.', chick_soon_duck: 'Almost a young duck or drake!',
    young_h_duck: 'Young duck', young_r_duck: 'Young drake', turned_duck: '{name}’s ducklings are turning into young ducks and drakes!',
    congrats_exp_duck: '{mum} and {dad} gain experience: their next ducklings will be even better.', congrats_exp1_duck: '{mum} gains experience: her next ducklings will be even better.',
    away_hatched_duck: '{name} hatched {n} ducklings', away_grown_duck: '{name}’s ducklings have grown up: their card is next',
    hatched_pea: '{n} peachicks have hatched! {name} is a mum.', raising_pea: 'Raising {n} peachicks: young peahens and peacocks in about {when}.',
    raising_y_pea: 'Raising {n} young peahens and peacocks: off to a new farm in about {when}.', no_lay_brood_pea: 'She lays no eggs for sale while she’s busy with her peachicks.',
    peachick: 'Peachick', chick_of_pea: '{breed} · {name}’s peachick', chick_grows_pea: 'A young peahen or peacock in about {when}.', chick_soon_pea: 'Almost a young peahen or peacock!',
    young_h_pea: 'Young peahen', young_r_pea: 'Young peacock', turned_pea: '{name}’s peachicks are turning into young peahens and peacocks!',
    congrats_exp_pea: '{mum} and {dad} gain experience: their next peachicks will be even better.', congrats_exp1_pea: '{mum} gains experience: her next peachicks will be even better.',
    away_hatched_pea: '{name} hatched {n} peachicks', away_grown_pea: '{name}’s peachicks have grown up: their card is next',
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
    hatched_rare: '{n} chicks have hatched, and one is a rare {line}! ✨', rare_chick: '✨ A rare {line} chick', rare_young_h: '✨ A rare {line}: a young hen', rare_young_r: '✨ A rare {line}: a young rooster',
    rare_keep_h: 'Keep her', rare_keep_r: 'Keep him', rare_sell: 'Sell · {c}',
    rare_kept: '{name} is snug in the basket by the farmhouse fire.', rare_kept_r: '{name} is snug in the basket by the farmhouse fire.', rare_sold: 'Sold for {c} coins', rare_full: 'Your {line} trio is complete: this one is sold for you',
    rare_card_t: 'A rare {line}!', rare_card_body: 'Born in {coop}. Keep her, and she lives in a basket by the farmhouse fire until she has a coop of her own; or sell her for a lot.',
    rare_card_body_r: 'Born in {coop}. Keep him, and he lives in a basket by the farmhouse fire until he has a coop of his own; or sell him for a lot.',
    rare_waiting: 'A rare baby is waiting for your choice', basket_t: 'The basket by the fire', basket_note: 'Build their own coop for {c} coins: they move in, and a rare pair can raise more of their colour.', rare_of: '{line} · {kind}',
    rare_build: 'Build their coop · {c}', rare_build_no: 'Their coop: {c} coins', rare_home: 'Welcome home, {names}!', rare_kept_home: '{name} has joined {coop}.', book_rare: 'Rare: hatched by a {from}', book_or: ' or a ',
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
    turn_tip_phone: 'Plus agréable à l’horizontale : tournez votre téléphone', turn_tip_tablet: 'Plus agréable à l’horizontale : tournez votre tablette',
    hen: 'Poule', rooster: 'Coq', duck: 'Cane', drake: 'Canard', peahen: 'Paonne', peacock: 'Paon',
    forever_h: 'Dans votre basse-cour pour toujours', forever_r: 'Dans votre basse-cour pour toujours',
    personality: 'Caractère', experience: 'Expérience', trust: 'Confiance',
    exp_none: 'Tout juste arrivé : l’expérience vient avec le temps passé à la ferme et l’affection que vous donnez.',
    trust_lv0: 'Farouche', trust_lv1: 'Sociable', trust_lv2: 'En confiance', trust_lv3: 'Inséparable',
    trust_body: 'Les câlins donnent confiance : un compte toutes les 6 heures.',
    exp_how: 'Les étoiles viennent avec le temps passé à la ferme, les câlins et les poussins élevés.', exp_top: 'Les cinq étoiles !',
    exp_eggs: 'Chaque étoile rend ses œufs une pièce plus chers.', exp_chicks: 'Plus il a d’étoiles, meilleurs sont ses poussins.', exp_ducklings: 'Plus il a d’étoiles, meilleurs sont ses canetons.', exp_peachicks: 'Plus il a d’étoiles, meilleurs sont ses paonneaux.',
    trust_next: 'Encore {n} câlins avant « {level} »', trust_next1: 'Encore 1 câlin avant « {level} »', trust_greets: 'Vient saluer {farmer} à la clôture.',
    cuddle_btn: '♥ Faire un câlin', happy_left: 'Heureux après un câlin : encore {when}', cuddle_night: 'Les câlins, ce sera demain matin\u00a0: tout le monde dort ici.',
    cuddle_done: '{farmer} fait un câlin à {name} ♥ +{xp} XP', trust_up1: '{name} devient sociable avec {farmer}.',
    trust_up2: '{name} a confiance en {farmer} et vient lui dire bonjour à la clôture.', trust_up3: '{name} et {farmer} sont inséparables ! +{xp} XP',
    star_up: '★ {name} gagne une nouvelle étoile !',
    lives_in: 'Habite : {coop}', since: 'À la ferme depuis le {date}',
    coop_rustic: '{coop} (rustique)',
    level_title: 'Niveau {n}', level_xp: '{xp} sur {need} XP pour le niveau {next}', level_top: 'Niveau maximum !',
    level_how: 'Prenez soin de vos volailles pour gagner de l’XP.',
    level_up: 'Niveau {n} !', level_up_sub: 'Votre ferme s’agrandit.', level_new: 'Nouveau à ce niveau', level_gift: 'Un cadeau pour votre nouveau niveau : +{c} pièces',
    land_new: 'Un terrain est prêt à être remis en état : {c} pièces', land_show: 'Voir le terrain', level_next_land: 'Au niveau {n} : un autre terrain à remettre en état',
    land_count: 'Vos terrains : {n}', land_count1: 'Votre terrain : 1', land_all: 'Tous les terrains sont à vous !',
    land_title: 'Un terrain en friche', land_body: 'Ce terrain fait partie de votre ferme, mais il est retourné à l’état sauvage : ronces, orties et vieux bric-à-brac. Remettez-le en état et il sera prêt pour vos poulaillers, pour toujours.',
    land_buy: 'Remettre en état : {c} pièces', land_broke: 'Pas encore assez de pièces ({c})', land_bought: 'Le terrain est remis en état !', land_wild: 'Terrain en friche · à remettre en état au niveau {n}',
        sale_sign: 'À RESTAURER', bub_sale: 'À restaurer',
    coop_lives: '{names} vivent ici.', and: 'et', rustic: 'rustique',
    look_rustic: 'Rustique', look_mended: 'Rafistolé', look_snug: 'Confortable', look_cosy: 'Douillet', look_deluxe: 'De luxe',
    up_next: 'Améliorer : style {look}', up_btn: 'Améliorer · {c} pièces', up_broke: 'Pas assez de pièces ({c})', up_top: 'Le plus beau poulailler de la ferme.',
    up_rir_mended: 'Une petite cabane, à moitié peinte en rouge, dans un enclos plus grand.', up_rir_snug: 'La Grange rouge, dans un enclos plus spacieux.',
    up_rir_cosy: 'Un porche avec un banc, des lanternes, des fleurs, et un jardin plus grand avec une balançoire, un bain de sable et un chou à picorer.',
    up_rir_deluxe: 'Un étage de plus, un toit de cuivre et un lanternon, une fontaine, un xylophone, un bac à sable et le plus grand jardin, avec palissade blanche et roses.',
    up_orp_mended: 'Une petite hutte de noisetier tressé, à moitié enduite d’argile, sous un chaume neuf, dans un enclos plus grand.', up_orp_snug: 'La Chaumière, dans un enclos plus spacieux.',
    up_orp_cosy: 'Des roses trémières, des roses, un banc sous une arche fleurie, une lanterne, et un jardin plus grand avec une balançoire, une bassine de sable et un chou à picorer.',
    up_orp_deluxe: 'Une chaumière plus haute, peinte en rose pâle, avec des fenêtres dans le chaume et un faisan de paille sur le toit, une pompe et son abreuvoir, un bac à sable sous un parasol de chaume, un xylophone et le plus grand jardin, avec palissade blanche et roses.',
    up_sil_mended: 'Une petite cabane de bambou au toit de bambous fendus, à moitié peinte de sa couleur, dans un enclos plus grand.', up_sil_snug: 'Le Poulailler pagode, dans un enclos plus spacieux.',
    up_sil_cosy: 'Un cerisier en fleurs, une lanterne de pierre, des lanternes de papier, et un jardin plus grand avec une balançoire sous un petit portique rouge, une coupe de sable et un chou à picorer.',
    up_sil_deluxe: 'Trois toits avec de petites clochettes dorées, un bassin à carpes koï, un jardin zen de sable ratissé, un xylophone de bambou et le plus grand jardin, avec palissade blanche et roses.',
    up_leg_mended: 'Une petite cabane de pierre au toit à moitié couvert d’ardoises et à la porte neuve, dans un enclos plus grand.', up_leg_snug: 'La Maison de pierre, dans un enclos plus spacieux.',
    up_leg_cosy: 'Des fenêtres bleu pâle, une glycine, un pigeonnier, des hortensias bleus, et un jardin plus grand avec une balançoire sous un pommier, une brouette de sable et un chou à picorer.',
    up_leg_deluxe: 'Un étage de plus avec des lucarnes, un auvent d’ardoise et deux cheminées, une petite barque bleue pleine de sable, un récupérateur d’eau, un xylophone et le plus grand jardin, avec palissade blanche et roses.',
    up_bra_mended: 'Une petite cabane de rondins neufs sous un toit de planches brutes, dans un enclos plus grand.', up_bra_snug: 'Le Chalet en rondins, dans un enclos plus spacieux.',
    up_bra_cosy: 'Une pile de bois sous son petit toit, une couronne sur la porte, un nichoir, des champignons et des fougères, et un jardin plus grand avec une balançoire sur des rondins, un demi-tronc plein de sable et un chou à picorer.',
    up_bra_deluxe: 'Un étage de plus avec un pignon au-dessus de la porte, une cheminée de galets et un ours sculpté, un bac de rondins plein de sable, de l’eau qui coule d’une rigole en bois, un xylophone et le plus grand jardin, avec palissade blanche et roses.',
    up_pol_mended: 'Ses briques remontées, une petite tour de pin à moitié peinte et une première paire d’ailes qui tourne, dans un enclos plus grand.', up_pol_snug: 'Le Petit moulin, dans un enclos plus spacieux.',
    up_pol_cosy: 'Peint en vert hollandais sous des tuiles rouges, des ailes rayées, des tulipes, des sabots devant la porte, et un jardin plus grand avec une balançoire, un sabot géant plein de sable et un chou à picorer.',
    up_pol_deluxe: 'Un moulin plus haut, crème et bleu de Delft, au chapeau de cuivre et à la galerie, un bac à sable carrelé, un canal et son pont-levis, une mangeoire en moulin, un xylophone et le plus grand jardin, avec palissade blanche et roses.',
    up_aya_mended: 'Des murs de bambou tressé sur un socle de pierre et des tuiles neuves à moitié posées, dans un enclos plus grand.', up_aya_snug: 'La Maison javanaise, dans un enclos plus spacieux.',
    up_aya_cosy: 'Des tuiles vernissées vertes, un frangipanier en fleurs, un bananier et des orchidées, et un jardin plus grand avec une balançoire sous un petit toit de tuiles, un plateau tressé plein de sable et un chou à picorer.',
    up_aya_deluxe: 'Plus haute, noire et or, aux murs crème, aux piliers rouges et aux ombrelles d’apparat, un bac à sable en pierre de temple, une jarre à eau, un petit gamelan et le plus grand jardin, avec palissade blanche et roses.',
    up_call_mended: 'Des planches de pin neuves à moitié peintes en bleu œuf de cane, la moitié du toit en bardeaux neufs, la mare nettoyée et des pierres qu’on pose, dans un enclos plus grand.', up_call_snug: 'La Maison flottante sur son radeau, dans un enclos plus spacieux.',
    up_call_cosy: 'Une petite péniche jaune au toit arrondi bleu canard, des fanions, des jardinières, une barque, une mare plus large et un ballon de plage pour jouer.',
    up_call_deluxe: 'Blanche et bleu marine sous un toit rouge, un petit phare, le pont vert de Monet jusqu’à la porte, une fontaine, des nénuphars partout, un ballon de plage et le plus grand jardin, avec palissade blanche et roses.',
    up_pea_mended: 'Des briques neuves à moitié enduites, les arcs de marbre posés et le dôme, une armature de bambou sous une bâche bleue, dans un enclos plus grand.', up_pea_snug: 'Le Pavillon de jardin sous son dôme turquoise, dans un enclos plus spacieux.',
    up_pea_cosy: 'Rose comme Jaipur sous un dôme rose, des guirlandes de soucis, du jasmin en pots de laiton, et un jardin plus grand avec une balançoire sous un petit dôme, un bassin de grès plein de sable et un chou à un réverbère de laiton.',
    up_pea_deluxe: 'En marbre blanc incrusté de fleurs, un dôme blanc et or, quatre minarets élancés, un bassin de marbre et sa fontaine, une vasque de marbre pleine de sable, des tasses de porcelaine à faire chanter et le plus grand jardin, avec palissade blanche et roses.',
    upfx_mended: 'Moins de jours sans l’œuf de l’après-midi.', upfx_snug: 'Deux œufs par jour, tous les jours.',
    upfx_cosy: 'De temps en temps, un œuf le soir aussi. Des poussins un peu meilleurs. Un câlin compte de nouveau au bout de 5 heures.',
    upfx_deluxe: 'Un œuf le soir un jour sur deux. De meilleurs poussins. Un câlin compte de nouveau au bout de 4 heures.',
    up_room: 'Son enclos plus grand a besoin de plus de place ici : déplacez d’abord le poulailler.', up_done: '{coop} passe au style {look} ! +{xp} XP', up_busy: '{farmer} est dans l’enclos : réessayez dans un instant.',
    move_body: 'Installez-le où vous voulez sur votre terrain. Les arbres, buissons et rochers qui gênent sont dégagés.', move_btn: 'Déplacer ce poulailler',
    move_hint: 'Faites glisser le poulailler, ou touchez l’endroit voulu.', move_ok: 'Bel emplacement !', move_clear: 'Bel emplacement ! Ce qui gêne sera dégagé.',
    move_land: 'Seulement sur votre terrain.', move_lane: 'Pas sur un chemin ni dans l’eau.', move_room: 'Pas assez de place ici.', move_grow: 'Pas assez de place ici pour son futur enclos plus grand : les pointillés montrent jusqu’où il ira.', move_small: 'Il tient pour l’instant, mais son futur enclos plus grand ne tiendra pas ici (les pointillés).', move_coop: 'Trop près d’un autre poulailler.',
    move_gate: 'Sa porte serait bloquée ici.', move_turn: 'Tourner', move_cancel: 'Annuler', move_place: 'Le mettre ici', moved: 'Le poulailler est à sa nouvelle place !',
    move_busy: 'Un instant\u00a0: il y a du monde à ce poulailler. Le déplacement commencera tout seul dès qu’il sera libre.',
    coops_title: 'Vos poulaillers', coops_aria: 'Vos poulaillers', coops_waiting: 'Un nouveau poulailler vous attend', coops_new: 'Nouveau !', trio_new: 'Nouvelle race : {breed} !', trio_new_col: 'Nouvelle couleur de poule soie : {col} !',
    trio_body: 'Un coq et deux poules, à vous pour toujours, avec leur poulailler. Installez-le où vous voulez sur votre terrain.', trio_body_duck: 'Un canard et deux canes, à vous pour toujours, avec leur maison sur une mare. Installez-la où vous voulez sur votre terrain.', trio_body_pea: 'Un paon et deux paonnes, à vous pour toujours, avec leur pavillon de jardin. Installez-le où vous voulez sur votre terrain.',
    place_now: 'Installer leur poulailler', later: 'Plus tard', later_note: 'Il vous attend dans votre Livre, pour quand vous voudrez.', place_btn: 'L’installer',
    move_short: 'Déplacer', coops_next: 'Au niveau {n} : {breed}', coops_all: 'Toutes les races sont dans votre ferme !',
    no_room: 'Pas encore de place sur votre terrain pour un autre poulailler : remettez en état le prochain terrain.', welcome_trio: 'Bienvenue, {names} !',
    book_title: 'Livre des races', book_btn: '📖 Livre des races', book_found: '{n} races trouvées sur {all}', book_found1: '1 race trouvée sur {all}',
    book_on_farm: 'Dans votre ferme : {names}', book_at_level: 'Arrive au niveau {n}', book_waiting: 'Leur poulailler est prêt\u00a0: installez-le quand vous voulez',
    book_price: '{p} pièces l’œuf, plus une pièce par étoile de la poule', book_price_duck: '{p} pièces l’œuf, plus une pièce par étoile de la cane', book_price_pea: '{p} pièces l’œuf, plus une pièce par étoile de la paonne', book_coop: '{coop}, rustique pour commencer', book_more: 'D’autres pages à venir.',
    shows_title: 'Concours', shows_aria: 'Concours', shows_new: 'un nouveau concours est ouvert',
    shows_how1: 'Inscrivez une volaille par concours. Le juge regarde ses étoiles, et son calme quand il la prend en main (la confiance). Une diva brille un peu plus.',
    shows_how2: 'Résultats le lendemain à 7 h. Les 1er, 2e et 3e gagnent une cocarde, des pièces et de l’XP, et la cocarde reste pour toujours sur sa fiche.',
    shows_how3: 'Gagner le concours régional ou le championnat national fait de votre volaille un champion.',
    show_v: 'Concours de {town}', show_v2: 'Concours d’{town}', show_c: 'Concours régional du {county}', show_n: 'Championnat national avicole',
    show_any: 'Toutes les races', show_only: 'Race : {breed} uniquement', show_locked: 'À partir du niveau {n}',
    show_when: 'Résultats à 7 h, dans {when}', show_prizes: 'Prix : 1er {a} · 2e {b} · 3e {c} pièces',
    show_chance: '{name} · chances de cocarde : {word} ({p}\u202f%)', chance0: 'faibles', chance1: 'moyennes', chance2: 'bonnes', chance3: 'excellentes',
    show_enter: 'Inscrire {name} · {fee}', show_other: 'Choisir une autre volaille', show_pick: 'Inscrire',
    show_in: '{name} est inscrit : résultats à 7 h, dans {when}', show_none_breed: 'Aucune de vos volailles n’est de la race {breed}.',
    show_none_busy: 'Toutes vos volailles sont déjà inscrites à d’autres concours.', show_broke: 'Pas assez de pièces : l’inscription coûte {fee}',
    show_entered: '{name} est inscrit au {show} !', show_card_in: 'Au {show} : résultats à 7 h, dans {when}',
    results_title: 'Résultats des concours', res_place: '{name} prend la {place} place au {show} !', res_none: '{name} n’est pas classé au {show} cette fois ({place} sur {of}). Le temps à la ferme et les câlins l’aideront.',
    res_champ: '{name} est champion maintenant !', res_in: 'Les résultats des concours sont arrivés !',
    rosettes: 'Cocardes', ros_none: 'Pas encore de cocarde : inscrivez-le à un concours (la cocarde en haut).', tier_v: 'Village', tier_c: 'Régional', tier_n: 'National',
    shop_title: 'La boutique de la ferme', shop_coins: 'Les pièces viennent de vos œufs, de vos poussins devenus grands, des concours et des tâches. Dépensez-les pour votre ferme :',
    dec_flowers: 'Massif de fleurs', dec_birdbath: 'Bain d’oiseaux', dec_beehives: 'Ruches', dec_duckhouse: 'Maison des canards', dec_greenhouse: 'Serre', dec_windmill: 'Moulin à vent', dec_bandstand: 'Kiosque à musique', dec_statue: 'Coq d’or',
    decl_flowers: 'Les papillons y viennent.', decl_birdbath: 'Les petits oiseaux viennent s’y baigner.', decl_beehives: 'Des abeilles affairées sur la lavande, et du miel à vendre : un pot toutes les 8 heures.', decl_duckhouse: 'Les canards y dorment, sur l’étang.', decl_greenhouse: 'Des tomates sous verre.', decl_windmill: 'Ses ailes tournent au vent.', decl_bandstand: 'De la musique le soir, et quand vous le touchez.', decl_statue: 'Il attrape le soleil.',
    dec_buy: 'Acheter et placer · {c}', dec_buy_pond: 'Acheter · {c}', dec_level: 'Arrive au niveau {n}', dec_broke: 'Pas encore assez de pièces', dec_owned: 'Dans votre ferme', dec_move: 'Déplacer', dec_xp: '+{xp} XP',
    dec_place_hint: 'Faites-le glisser, ou touchez l’endroit voulu.', dec_ok: 'Bel emplacement !', dec_ok_clear: 'Bel emplacement ! Ce qui gêne sera dégagé.', dec_bad_land: 'Seulement sur votre terrain.', dec_bad_lane: 'Pas sur un chemin ni dans l’eau.', dec_bad_room: 'Pas assez de place ici.', dec_bad_grow: 'Cet endroit est gardé pour qu’un poulailler puisse s’agrandir.', dec_bad_way: 'Cela bloquerait le chemin d’un poulailler.',
    dec_placed: 'Nouveau dans la ferme : {name} ! +{xp} XP', dec_moved: '{name} : c’est déplacé !', dec_new: 'Nouveau à acheter : {names}', dec_card_body: 'Déplacez-le où vous voulez sur votre terrain.', dec_new_where: 'Dans la boutique : touchez vos pièces en haut.', dec_no_room: 'Pas de place sur votre terrain pour l’instant : remettez en état le prochain terrain, ou déplacez des choses.', dec_pond_hint: 'Votre maison des canards est sur l’étang ! Les canards y dormiront ce soir.',
    shop_decor: 'Décorations', shop_outfits: 'Tenues', outfits_note: 'De nouveaux habits pour {farmer}. Chacun rapporte de l’XP à l’achat.',
    shop_seasons: 'Saisons', seasons_note: 'Des parures pour vos poulaillers : chacune en vente pendant sa saison, puis à vous pour toujours.',
    dress_xmas: 'parure de Noël', dressl_xmas: 'Une guirlande de lumières de couleur le long de la clôture, des couronnes au portail, des guirlandes lumineuses sur le toit, une étoile dorée et un petit sapin avec des cadeaux.',
    dress_when_xmas: 'En vente du 1er décembre au 6 janvier.', dress_owned: 'À vous pour toujours : parez un poulailler depuis sa fiche.', dress_buy: 'Acheter · {c}',
    dress_bought: 'La {name} est à vous (+{xp} XP) ! Touchez un poulailler pour la lui mettre.', dress_on: '🎄 Mettre la {name}', dress_off: 'Retirer la {name}',
    dress_done: 'Joyeux Noël ! {coop} porte sa {name}.', dress_gone: '{coop} retrouve son allure de tous les jours.', dress_card: 'Il porte la {name}.',
    res_dress: 'Et en prime : la {name} !',
    shop_animals: 'Animaux', ani_geese: 'Gertrude et Hector, les oies', anil_geese: 'Un couple d’oies pour l’étang : elles broutent, nagent, cacardent après tout le monde et se chamaillent de temps en temps.',
    ani_dog: '{name}, le chien de la ferme', anil_dog: 'Un border collie avec sa niche et sa balle : il fait le tour des poulaillers, joue, taquine les oies, et c’est vous qui choisissez son nom.',
    ani_dog_owned: 'Dans votre ferme', ani_see_dog: 'Le voir', ani_move_kennel: 'Déplacer sa niche', ani_rename: 'Renommer', kennel_name: 'Niche',
    dog_came: '{name} vient vivre dans votre ferme ! +{xp} XP', kennel_moved: 'La niche de {name} : c’est déplacé !',
    ani_buy: 'Acheter · {c}', ani_owned: 'À l’étang', ani_see: 'Les voir',
    geese_sub: 'Oie d’Embden et jars de Toulouse · au bord de l’étang', geese_visit: 'Leur rendre visite',
    geese_lv0: 'Fâchés', geese_lv1: 'Méfiants', geese_lv2: 'Curieux', geese_lv3: 'Amis',
    geese_b0: 'Ils n’aiment pas encore {farmer} : ils sifflent et le chassent de leur pré.', geese_b1: 'Ils tolèrent {farmer} maintenant, de loin, et mangent le grain quand il s’éloigne.',
    geese_b2: 'Ils viennent manger le grain tout près de {farmer}.', geese_b3: 'Ils se laissent câliner par {farmer}, viennent dire bonjour à la clôture et chassent Rusty plus vite.',
    geese_next: 'Encore {n} jours de visites avant « {level} »', geese_next1: 'Encore 1 jour de visites avant « {level} »', geese_how: 'Une visite compte une fois par jour.',
    geese_today: 'La visite d’aujourd’hui a compté : revenez demain.', geese_night: 'Les visites, ce sera demain matin : {farmer} dort.',
    geese_visited: '{farmer} va voir Gertrude et Hector. +{xp} XP', geese_again: '{farmer} retourne voir Gertrude et Hector (la visite d’aujourd’hui a déjà compté).',
    geese_up1: 'Gertrude et Hector s’habituent à {farmer}. +{xp} XP', geese_up2: 'Gertrude et Hector s’intéressent à {farmer} maintenant. +{xp} XP', geese_up3: 'Gertrude et Hector ont confiance en {farmer} ! +{xp} XP',
    geese_cuddled: '{farmer} fait un câlin à Gertrude et Hector ♥ +{xp} XP', geese_happy: 'Heureux après un câlin : encore {when}', geese_gate: 'Le portail des oies',
    fox_title: 'La nuit dernière à la ferme', fox_watch: '🎞 Le voir', fox_ok: 'OK',
    fox_eggs: 'Rusty le renard a trouvé ouverte la porte du poulailler {dehen} et a pris {n} œufs dans le nid. Les poules vont bien, juste un peu ébouriffées.',
    fox_eggs1: 'Rusty le renard a trouvé ouverte la porte du poulailler {dehen} et a pris un œuf dans le nid. Les poules vont bien, juste un peu ébouriffées.',
    fox_empty: 'Rusty le renard a trouvé ouverte la porte du poulailler {dehen}, mais le nid était vide : {hen} lui a pincé le nez et il est rentré chez lui.',
    fox_shut: 'Rusty le renard est venu pour les œufs, mais les portes étaient fermées. Il est rentré bredouille.',
    fox_stuck: 'Une porte automatique est restée coincée ouverte cette nuit.',
    fox_geese: 'Rusty le renard est venu pour les œufs du poulailler {dehen}, mais les oies l’ont entendu et l’ont chassé jusque chez lui !',
    fox_dog: 'Rusty le renard est venu pour les œufs du poulailler {dehen}, mais {dog} l’a entendu et l’a chassé jusque chez lui !',
    fox_team: 'Rusty le renard est venu pour les œufs du poulailler {dehen}, mais les oies et {dog} l’ont entendu et l’ont chassé jusque chez lui !',
    fox_farmer: 'Rusty le renard est venu pour les œufs du poulailler {dehen}, mais {farmer} est sorti avec sa lampe et l’a renvoyé chez lui !',
    fox_tip: 'Pour protéger les œufs, fermez les portes des poulaillers la nuit (touchez la lune au-dessus de chaque porte), ou prenez les oies (la boutique, Animaux).',
    fox_new: 'Désormais, Rusty le renard peut venir la nuit chercher les œufs : fermez les portes des poulaillers, ou prenez les oies.', geese_came: 'Gertrude et Hector viennent vivre au bord de l’étang ! +{xp} XP', geese_hello: 'Touchez une oie pour lui dire bonjour.',
    of_classic: 'Classique', of_market: 'Jour de marché', of_garden: 'Garden-party', of_winter: 'Lainages d’hiver', of_rodeo: 'Rodéo', of_show: 'Jour de concours',
    ofd_classic: 'Chapeau de paille et chemise à carreaux.', ofd_market: 'Casquette en tweed et chemise à carreaux bleus.', ofd_garden: 'Chapeau fleuri et chemise vichy jaune.', ofd_winter: 'Bonnet à pompon et pull vert.', ofd_rodeo: 'Chapeau de cow-boy, chemise en chambray et foulard.', ofd_show: 'Haut-de-forme, chemise blanche et cocarde de champion.',
    out_buy: 'Acheter et porter · {c}', out_wear: 'Porter', out_wearing: 'Portée', out_bought: '{farmer} enfile la tenue {name} ! +{xp} XP', out_worn: '{farmer} porte la tenue {name}.', out_new: 'Nouvelle tenue pour {farmer} : {names}',
    away_title: 'Pendant votre absence', away_for: 'Vous étiez loin de la ferme pendant {t}.', away_paused: 'Plus de 2 jours loin de la ferme : vos poules ont pondu pour les deux derniers.',
    away_eggs: '{n} œufs vous attendent dans les pondoirs', away_eggs1: 'Un œuf vous attend dans un pondoir', away_full: '{n} pondoirs sont pleins : ces poules ont arrêté de pondre', away_full1: 'Un pondoir est plein : ces poules ont arrêté de pondre',
    away_hatched: '{name} a fait éclore {n} poussins', away_grown: 'Les poussins de {name} ont grandi : leur carte arrive', away_honey: '{n} pots de miel dans les ruches', away_honey1: 'Un pot de miel dans les ruches', away_feathers: '{n} plumes de paon à ramasser', away_feathers1: 'Une plume de paon à ramasser', away_apple_egg: '{n} œufs dorés sous les pommiers', away_apple_egg1: 'Un œuf doré sous le pommier',
    away_wheat: 'Votre blé est mûr : touchez le champ pour le récolter', away_wheat_grow: 'Votre blé pousse : mûr dans {t}', away_feed: '{coop} : la mangeoire est vide', away_feed_low: '{coop} : la mangeoire est presque vide',
    away_show: 'Les résultats des concours sont arrivés : ils arrivent juste après', away_jobs: 'De nouvelles tâches aujourd’hui', away_jobs_ready: '{n} récompenses de tâches à récupérer', away_jobs_ready1: 'Une récompense de tâche à récupérer',
    away_collect: 'Ramasser les œufs ({n})', away_ok: 'À la ferme', away_sold: '{n} œufs vendus · +{c} pièces',
    intro_1: 'Votre basse-cour pour toujours', intro_1b: 'Vos trois Rhode Island Red sont à vous pour toujours, et chacune a sa personnalité : une Diva, une Rebelle, une Gourmande… Faites-leur des câlins : elles vous font davantage confiance, gagnent des étoiles et pondent de meilleurs œufs.',
    intro_2: 'Œufs et poussins', intro_2b: 'Chaque poule pond environ deux œufs par jour : ramassez-les pour les vendre. De temps en temps, une poule élève des poussins ; une fois grands, ils partent pour une nouvelle ferme et vous gagnez des pièces.',
    intro_3: 'Terres et nouvelles races', intro_3b: 'À chaque niveau, un autre terrain de la ferme peut être remis en état, et de nouvelles races arrivent par trio avec leur poulailler. Placez tout où vous voulez.',
    intro_4: 'Concours, miel et plus encore', intro_4b: 'Gagnez des cocardes aux concours, pêchez dans l’étang et la rivière, cultivez du blé pour les mangeoires, décorez votre ferme et vendez du miel. À votre rythme : un peu chaque jour.',
    intro_5: 'Rusty le renard', intro_5b: 'Dès le niveau 4, Rusty peut venir la nuit chercher les œufs ; il ne fait jamais de mal aux volailles. Fermez les portes des poulaillers à la tombée du jour, ou laissez une poule Courageuse, les oies ou votre chien le chasser.',
    intro_next: 'Suivant', intro_go: 'C’est parti !', intro_skip: 'Passer',
    story_1: 'Mamie vous a laissé sa ferme, avec une lettre : « Prends soin de mes poules. Le reste viendra, pas à pas. »',
    story_2: 'Feather & Field est à vous maintenant. Ses trois Rhode Island Red vous attendent au portail.',
    story_3: 'Chaque terrain est à vous, mais les mauvaises herbes l’ont repris. Chacun demande du travail, et des pièces, pour revivre.',
    story_4: 'Ramassez les œufs, prenez soin de vos poules et redonnez vie à la ferme, terrain après terrain.',
    settings_story: '📜 L’histoire de la ferme',
    guide_n: 'Premier jour · {n} sur {of}', guide_skip: 'Passer', guide_show: 'Montrer',
    guide_eggs: 'Ramassez votre premier œuf : touchez l’œuf au-dessus de la Grange rouge.', guide_eggs_wait: 'Votre premier œuf arrive : une poule va aller pondre dans un instant.',
    guide_cuddle: 'Faites un câlin à une poule : touchez une poule, puis ♥ Faire un câlin.', guide_cuddle_card: 'Touchez maintenant ♥ Faire un câlin.',
    guide_sow: 'Semez votre champ de blé : touchez son panneau, puis Semer.', guide_sow_card: 'Touchez Semer : le blé nourrira vos poules.',
    guide_jobs: 'Les tâches du jour : touchez le presse-papiers en haut.', guide_shop: 'Touchez vos pièces : la boutique des décorations, des animaux et des tenues.',
    guide_did: 'Bravo ! +{c} pièces, +{x} XP', guide_done: 'Votre premier jour est terminé ! +{c} pièces, +{x} XP',
    jobs_title: 'Les tâches du jour', jobs_aria: 'Les tâches du jour', jobs_new: 'nouvelles tâches aujourd’hui', jobs_ready: '{n} à récupérer',
    job_eggs: 'Ramasser {n} œufs', job_eggs1: 'Ramasser un œuf', job_cuddle: 'Faire {n} câlins', job_cuddle1: 'Faire un câlin', job_feed: 'Remplir une mangeoire', job_show: 'Inscrire une volaille à un concours',
    job_reward: '+{c} pièces · +{xp} XP', job_claim: 'Récupérer', job_paid: 'Fait ✓', jobs_note: 'De nouvelles tâches chaque jour à minuit.',
    job_done: 'Tâche faite : {job} ! Récupérez la récompense dans Les tâches du jour.', job_claimed: '+{c} pièces · +{xp} XP',
    show_sign_v: 'Concours de village', show_sign_c: 'Concours régional', show_sign_n: 'Championnat national',
    showday_title: 'Jour de concours !', showday_body: 'Les résultats du {show} sont arrivés : le juge regarde les volailles.', showday_watch: 'Regarder le jugement', showday_results: 'Juste les résultats', skip: 'Passer',
    sd_arrive: '{farmer} amène {name} au concours…', sd_judge: 'Le juge regarde chaque volaille…', sd_rosettes: 'Et maintenant, les cocardes !',
    champ_c: 'Champion régional', champ_n: 'Champion national', show_new_c: 'Le concours régional : inscription {f}, 1er prix {p} pièces', show_new_n: 'Le championnat national : inscription {f}, 1er prix {p} pièces',
    book_sil: 'Poule soie blanche', egg_rir: 'Œufs bruns', egg_orp: 'Œufs brun clair', egg_sil: 'Œufs teintés crème', egg_leg: 'Œufs bleus', egg_bra: 'Œufs brun clair', egg_pol: 'Œufs blancs', egg_aya: 'Œufs crème', egg_call: 'Œufs de cane vert pâle', egg_pea: 'Gros œufs de paonne crème',
    coins_body: 'Les pièces viennent de vos œufs et de vos poussins devenus grands. Elles servent à acheter du grain, des terrains, des poulaillers et plus encore.',
    settings_music: 'Musique', settings_sounds: 'Sons', music_on: 'Oui', music_off: 'Non', settings_music_note: 'La musique vient de temps en temps, le jour et le soir.',
    settings_lang: 'Langue', settings_new: 'Commencer une nouvelle ferme', settings_new_sure: 'Touchez encore pour tout recommencer',
    settings_edited: 'Cette ferme a été modifiée hors du jeu : tout son contenu a été vérifié.',
    settings_version: 'Version {v}',
    credits: 'Musique : {music}. Sons : {sounds}. Le cri du paon : {peacock} ({lic}), nettoyé.',
    saved_here: 'Votre ferme est enregistrée sur ce téléphone.',
    code_t: 'Le code de votre ferme', code_how: 'Copiez le code de votre ferme et gardez-le en lieu sûr (dans Notes par exemple). Collez-le ici sur un autre téléphone, ou après avoir vidé Safari, pour reprendre là où vous en étiez.', code_how_app: 'Copiez le code de votre ferme et gardez-le en lieu sûr (dans Notes par exemple). Collez-le ici sur un autre téléphone, ou après avoir réinstallé le jeu, pour reprendre là où vous en étiez.', notes_shows: "Concours", notes_crops: "Potager, blé et miel", nt_garden_t: "Le potager est mûr 🥕", nt_garden: "Vos {crop} sont prêtes à être récoltées.", notes_chicks: "Poussins", notes_eggs: "Œufs", nt_eggs_t: "Des œufs frais 🥚", nt_eggs: "{n} œufs vous attendent dans les nids.", nt_hatch_t: "Des poussins ! 🐣", nt_wheat_t: "Le blé est mûr 🌾", nt_wheat: "Votre blé est doré et prêt à être moissonné.", nt_honey_t: "Du miel 🍯", nt_honey: "Les ruches sont pleines : {n} pots de miel à récolter.", nt_show_t: "Résultats du concours 🏆", nt_show: "Le juge est passé ! Venez découvrir le classement de {name}.", nt_miss_t: "Votre ferme pense à vous", nt_miss: "Vous manquez à {names} ! Venez leur dire bonjour.", settings_notes: "Rappels", notes_note: "Choisissez ceux que vous voulez. Jamais la nuit, deux par jour au plus ; et si vous vous absentez 3 jours, un petit mot de vos poules.", notes_denied: "Les notifications de Feather & Field sont désactivées sur votre téléphone : Réglages > Notifications.", notes_ask_t: "Des rappels ?", notes_ask: "Voulez-vous un petit mot quand des œufs vous attendent, que des poussins naissent, que le blé ou le miel est prêt, et pour les résultats des concours ? Jamais la nuit, deux par jour au plus.", notes_yes: "Oui, merci", notes_no: "Pas maintenant", notes_ask_note: "Vous pourrez choisir lesquels, ou les désactiver, à tout moment dans les Réglages.",
    code_copy: 'Copier le code de ma ferme', code_paste: 'Collez un code de ferme ici', code_load: 'Charger cette ferme', code_load_sure: 'Touchez encore pour remplacer cette ferme', code_note: 'Charger une ferme remplace celle de ce téléphone.',
    code_copied: 'Code copié. Collez-le dans Notes pour le garder.', code_select: 'Voici le code de votre ferme : sélectionnez-le en entier et copiez-le.', code_bad: 'Ce code ne fonctionne pas. Copiez-le à nouveau, en entier.',
    code_old: 'Ce code vient du premier Feather & Field : cette nouvelle ferme repart de zéro.', code_loaded: 'Ferme chargée : niveau {n}. Bon retour !',
    first_t: 'Le premier Feather & Field', first_how: 'Votre ferme du premier jeu est gardée telle quelle. Ouvrez-la quand vous voulez.', first_open: 'Ouvrir le premier jeu',
    welcome_first: 'Votre ferme du premier jeu est dans les Réglages.',
    acct_t: 'Mon compte', acct_how: 'Connectez-vous avec Google pour enregistrer aussi votre ferme en ligne : vous ne la perdrez pas en changeant de téléphone ou en vidant Safari, et vous pourrez y jouer sur un autre téléphone.',
    acct_google: 'Se connecter avec Google', acct_privacy: 'Votre ferme est conservée sur les serveurs Firebase de Google, en Europe, et liée à votre compte Google. Elle n’est accessible qu’à vous, et le jeu ne voit jamais votre mot de passe.',
    acct_who: 'Compte Google : {name}', acct_saved: 'Enregistrée en ligne : {when}', acct_saving: 'Enregistrement en ligne…', acct_offline: 'Pas encore enregistrée en ligne : pas de connexion. Elle le sera dès votre retour en ligne.',
    acct_empty: 'Rien n’est encore enregistré avec ce compte : votre nouvelle ferme sera enregistrée en ligne dès qu’elle sera commencée.',
    acct_out: 'Se déconnecter', acct_out_done: 'Compte déconnecté. Votre ferme reste sur ce téléphone.', acct_del: 'Supprimer mon compte', acct_del_sure: 'Touchez encore pour supprimer votre compte et votre ferme en ligne',
    acct_deleted: 'Votre compte est supprimé, avec votre ferme en ligne. Votre ferme reste sur ce téléphone.', acct_failed: 'La connexion n’a pas fonctionné. Veuillez réessayer.',
    acct_popup: 'Votre navigateur a bloqué la fenêtre de Google : autorisez les fenêtres pop-up pour ce site, puis réessayez.', acct_new_sure: 'Touchez encore pour tout recommencer, ici et en ligne',
    two_t: 'Quelle ferme garder ?', two_how: 'Ce téléphone et votre compte ont chacun une ferme différente. Choisissez celle à garder : elle remplacera l’autre.',
    two_here: 'Sur ce téléphone', two_online: 'Enregistrée en ligne', two_farmer: 'La ferme de {name}', two_sum: 'Niveau {lv} · {c} pièces', two_when: 'Dernière partie : {when}', two_keep: 'Garder cette ferme',
    nudge_t: 'Mettez votre ferme à l’abri', nudge_how: 'Connectez-vous avec Google et votre ferme sera aussi enregistrée en ligne. Vous ne la perdrez pas en changeant de téléphone, et vous pourrez y jouer sur un autre téléphone.',
    nudge_later: 'Plus tard', nudge_note: 'C’est facultatif : vous pouvez vous connecter à tout moment dans les Réglages.', welcome_signin: 'Une ferme enregistrée en ligne ? Connectez-vous',
    privacy: 'Confidentialité',
    loading: 'Chargement de votre ferme…', sideways: 'Tournez votre téléphone à l’horizontale pour jouer',
    eggs: 'Œufs', lays: 'Pond environ 2 œufs par jour, à {p} pièces l’œuf.', lays_sil: 'Pond environ un œuf par jour, à {p} pièces l’œuf : les poules soie sont meilleures mères que pondeuses.',
    eggs_sold1: '1 œuf vendu · +{c} pièces', eggs_sold: '{n} œufs vendus · +{c} pièces',
    eggs_fresh1: '1 œuf tout frais vendu · +{c} pièces · +{xp} XP', eggs_fresh: '{n} œufs vendus · +{c} pièces · {f} tout frais : +{xp} XP',
    no_eggs: 'Pas encore d’œufs', laying: '{name} est en train de pondre…',
    first_egg: '{name} a pondu votre premier œuf ! Touchez le nid pour le ramasser.',
    nest_full: 'Le nid est plein : ramassez les œufs pour que vos poules pondent à nouveau.',
    feeder_title: 'Mangeoire · {coop}', feed_full: 'Pleine', feed_pct: 'Pleine à {p} %', feed_empty: 'Vide',
    feed_hours: 'De quoi tenir environ {h} heures.', feed_hour: 'De quoi tenir environ une heure.', feed_days: 'De quoi tenir environ trois jours.',
    feed_empty_line: 'Vos poules ne pondent plus jusqu’à ce qu’elle soit remplie.', feed_empty_line_duck: 'Vos canes ne pondent plus jusqu’à ce qu’elle soit remplie.', feed_empty_line_pea: 'Vos paonnes ne pondent plus jusqu’à ce qu’elle soit remplie.',
    feed_how: 'Vos poules pondent tant qu’elle contient du grain. Pleine, elle nourrit votre trio pendant trois jours.', feed_how_duck: 'Vos canes pondent tant qu’elle contient du grain. Pleine, elle nourrit votre trio pendant trois jours.', feed_how_pea: 'Vos paonnes pondent tant qu’elle contient du grain. Pleine, elle nourrit votre trio pendant trois jours.',
    fill_grain: 'La remplir avec votre grain (gratuit)', fill_grain_c: 'La remplir · {c} pièces + votre grain', feed_grain: 'Votre grain du champ de blé : {n} (utilisé d’abord).',
    filled_grain: 'Mangeoire remplie avec votre propre grain', farmer_grain: '{farmer} arrive avec votre grain',
    wheat_title: 'Votre champ de blé', wheat_soil: 'Labouré et prêt à semer.', wheat_sown: 'Semé : les premières pousses bientôt.', wheat_sprouts: 'Les premières pousses vertes.', wheat_growing: 'Il pousse, haut et vert.', wheat_ripe: 'Doré et prêt à récolter !',
    wheat_how: 'Semez-le pour {c} pièces ; 4 heures plus tard, il est mûr. Récolté, il donne {g} de grain pour vos mangeoires (utilisé avant les pièces) et {xp} XP.',
    wheat_left: 'Mûr dans {t}', wheat_store: 'Grain en réserve : {n} sur {max}', wheat_sow: 'Semer · {c} pièces', wheat_harvest: 'Récolter', wheat_move: 'Déplacer le champ', wheat_broke: 'Pas encore assez de pièces pour semer',
    bub_sow: 'Semer', bub_harvest: 'Récolter', wheat_sowing: '{farmer} va semer le blé · −{c} pièces', wheat_sowed: 'Blé semé · −{c} pièces. Mûr dans 4 heures.',
    wheat_cutting: '{farmer} va récolter le blé', wheat_done: 'Blé récolté : +{g} de grain pour les mangeoires · +{xp} XP', wheat_full: 'Blé récolté · +{xp} XP (votre réserve de grain est pleine)',
    honey_title: 'Miel', honey_jars: '{n} pots de miel', honey_jar: 'Un pot de miel', honey_none: 'Pas encore de miel : le prochain pot dans {t}.', honey_going: '{farmer} va aux ruches',
    feather_sold1: 'Une plume de paon vendue · +{c} pièces',
    apple_tree: '🍎 {n} pommes sur l’arbre de {name}', apple_tree1: '🍎 Une pomme sur l’arbre de {name}', apple_tree0: '🍎 Pas encore de pomme sur l’arbre de {name} : la prochaine dans {t}',
    apple_egg_wait: '🍎 Un œuf doré attend sous l’arbre de {name} : touchez-le', apple_laid: '🍎 Deux pommes, et {name} a pondu un œuf doré ! Touchez-le pour le vendre',
    apple_egg_sold: 'Un œuf doré vendu · +{c} pièces · +{xp} XP', apple_planted: '🍎 Un pommier pour {name} la Gourmande, juste à côté de son poulailler : regardez-la s’échapper pour ses pommes',
    apple_line: '🍎 De temps en temps, elle s’échappe par-dessus la clôture jusqu’à son pommier et saute pour attraper ses pommes : après deux, elle pond un œuf doré, qui vaut trois œufs.',
    apple_line0: '🍎 Elle rêve d’un pommier juste à côté de son poulailler : il sera planté dès qu’il y aura de la place d’un côté (sur vos terres, loin des chemins et des autres poulaillers).',
    honey_sold: '{n} pots de miel vendus · +{c} pièces', honey_sold1: 'Un pot de miel vendu · +{c} pièces',
    // la pêche (version 5)
    fish_rudd: 'Rotengle', fish_roach: 'Gardon', fish_perch: 'Perche', fish_tench: 'Tanche', fish_golden_tench: 'Tanche dorée', fish_koi: 'Koï', fish_big_bertha: 'Grosse Berthe', fish_bream: 'Brème', fish_crucian: 'Carassin', fish_sunfish: 'Perche-soleil',
    fish_bleak: 'Ablette', fish_barbel: 'Barbeau', fish_rainbow_trout: 'Truite arc-en-ciel',
    fish_netted: 'Dans la bourriche 🧺 · vaut {c} pièces', catch_title: 'Votre bourriche', catch_sub: 'Vendez votre pêche, ou gardez-en dans le vivier pour les commandes du village.', catch_keep: 'Garder', catch_kept: 'Gardé ✓', catch_sell: 'Vendre · +{c} pièces', catch_sell0: 'Mettre dans le vivier', catch_box: 'Vivier\u00a0: {n} sur {max}', catch_box_note: 'Les poissons du vivier partent dans les commandes du village qui en demandent.', catch_box_sell: 'Vendre le vivier · +{c} pièces', catch_sold: '{n} poissons vendus · +{c} pièces', catch_sold1: '{n} poisson vendu · +{c} pièces', catch_boxed: '{n} dans le vivier', catch_open: '🧺 Bourriche\u00a0: {n} à vendre', catch_none: 'Votre bourriche est vide.', fish_tin_tomorrow: 'Une boîte par jour\u00a0: une autre demain', book_fish_am: 'Mord tôt le matin (6 h à 10 h)', book_fish_noon: 'Mord vers midi (11 h à 15 h)', book_fish_eve: 'Mord le soir (dès 17 h)', book_fish_legend: 'Seulement quand tous les autres poissons d’ici sont pris',
    fish_minnow: 'Vairon', fish_gudgeon: 'Goujon', fish_dace: 'Vandoise', fish_chub: 'Chevesne', fish_brown_trout: 'Truite fario', fish_grayling: 'Ombre', fish_old_snapjaw: 'Vieux Claquemâchoire',
    fish_new: 'La pêche à l’étang : touchez son ponton', fish_new_river: 'La pêche à la rivière : touchez sa passerelle', fish_show_river: 'Voir la rivière',
    book_tab_birds: 'Races', book_tab_fish: 'Poissons', book_fish_found: '{n} poissons pêchés sur {all}', book_fish_pond: 'L’étang', book_fish_river: 'La rivière',
    fish_rare0: 'Commun', fish_rare1: '✦ Rare', fish_rare2: '✦✦ Légendaire', book_fish_caught: 'Pêché {n} fois · votre plus gros : {cm} cm', book_fish_caught1: 'Pêché une fois · {cm} cm',
    book_fish_not: 'Pas encore pêché', book_fish_level: 'La pêche ici ouvre au niveau {n}', book_fish_size: 'De {a} à {b} cm', book_fish_price: 'environ {c} pièces', book_fish_photo: 'sa photo {c} pièces', fish_going_river: '{farmer} part à la passerelle',
    river_title: 'La pêche à la rivière', river_body: 'Vairons, goujons, vandoises et chevesnes vivent dans la rivière, et des poissons plus rares qui ne mordent qu’à certaines heures. Votre pêche va dans une bourriche\u00a0: vendez-la en partant, ou gardez-en pour les commandes du village.', fish_show: 'Voir l’étang',
    dock_title: 'La pêche à l’étang', dock_body: 'Rotengles, gardons, perches et tanches vivent dans l’étang, et des poissons plus rares qui ne mordent qu’à certaines heures. Votre pêche va dans une bourriche\u00a0: vendez-la en partant, ou gardez-en pour les commandes du village.',
    fish_worms: '{n} vers', fish_worms1: '1 ver', fish_worms0: 'Plus de vers', fish_hens: 'Vos poules qui aiment {farmer} lui trouvent des vers chaque jour : touchez-en une et demandez.', fish_gift: 'Une boîte de {n} vers pour commencer 🪱', fish_go: 'Aller pêcher',
    fish_noworms: 'Plus de vers : demandez à vos poules qui aiment {farmer} (touchez-en une), ou achetez une boîte au ponton.',
    worms_ask: 'Demander des vers · 🪱 {n}', worms_given: '🪱 {name} a trouvé des vers pour {farmer} aujourd’hui. D’autres demain !',
    worms_shy: '🪱 {name} est encore farouche : pas de vers pour {farmer} pour l’instant. Les câlins aident.', worms_how: 'Vers trouvés chaque jour : Sociable 1 · En confiance 2 · Inséparable 3.',
    worms_done: '{name} cherche {n} vers pour {farmer} 🪱', worms_done1: '{name} cherche un ver pour {farmer} 🪱', worms_night: '{farmer} dort : les vers, ce sera demain matin', fish_level: 'La pêche ouvre au niveau {n}.',
    // la chasse à l’œuf du jour (7 nov. 2026)
    hunt_hint: '🥚✨ {hen} a caché l’œuf d’or du jour quelque part sur votre ferme. Saurez-vous le trouver ?', hunt_found: '✨ Vous avez trouvé l’œuf d’or de {hen} ! +{c} pièces, +{x} XP',
    hunt_streak: '{n} jours de suite', hunt_total: 'œufs d’or trouvés : {n}', hunt_lv_t: 'Nouveau : un œuf d’or à trouver chaque jour', hunt_lv_b: 'Chaque jour, une de vos poules cache un œuf d’or quelque part sur votre ferme. Trouvez-le pour des pièces et de l’XP, davantage chaque jour de suite.',
    // le potager (7 nov. 2026)
    garden_title: 'Votre potager', garden_how: 'Semez un carré pour quelques pièces et récoltez-le quand il est mûr : les carottes poussent le plus vite, les citrouilles le plus lentement. Vos oiseaux en raffolent, et les villageois en demandent aussi.',
    crop_carrot: 'Carottes', crop_straw: 'Fraises', crop_pump: 'Citrouilles', bed_n: 'Carré {n}', bed_empty: 'Prêt à semer. Qu’allons-nous faire pousser ?', bed_sow: '{c} pièces · {t}',
    bed_sown: 'Tout juste semé : les premières pousses bientôt.', bed_shoots: 'Les premières petites pousses.', bed_growing: 'Ça pousse bien.', bed_ripe: 'Mûr ! {n} à récolter.', bed_pick: 'Récolter',
    basket_title: 'Votre panier', basket_how: 'Touchez un de vos oiseaux pour offrir une friandise à son poulailler. Les commandes du village se servent aussi dans votre panier.', garden_move: 'Déplacer le potager',
    garden_sowing: '{farmer} va semer les {crop}', garden_sowed: '{e} {crop} semées · −{c} pièces. Mûres dans {t}.', garden_broke: 'Pas encore assez de pièces pour les graines',
    garden_picking: '{farmer} va récolter les {crop}', garden_picked: '{e} +{n} {crop} dans votre panier · +{xp} XP', garden_part: '{e} +{n} {crop} dans votre panier (il en est plein maintenant) · +{xp} XP',
    garden_full: 'Plus de place pour les {crop} dans votre garde-manger. Vendez-en, ou gardez-les pour une commande.', crop_l_carrot: 'carottes', crop_l_straw: 'fraises', crop_l_pump: 'citrouilles',
    bub_pick: 'Récolter', bub_plant: 'Semer', garden_lv_t: 'Nouveau : votre potager', garden_lv_b: 'Près de la ferme : faites pousser carottes, fraises et citrouilles. Des friandises que vos oiseaux adorent, et les villageois vous en demanderont.',
    treat_btn: '🍓 Une friandise pour le poulailler', treat_title: 'Une friandise pour {coop}', treat_body: 'Quelque chose du potager ! Une friandise par jour pour chaque poulailler.',
    treat_carrot: 'Un œuf de plus de chaque poule, peu après.', treat_straw: 'Un œuf de plus de chaque poule, et un peu d’expérience pour chaque oiseau.', treat_pump: 'Deux œufs de plus de chaque poule, et un peu d’expérience pour chaque oiseau.',
    treat_have: 'Il en faut {need} · dans votre panier : {n}', treat_give: 'L’offrir', treat_none: 'Rien dans votre panier pour l’instant : faites-en pousser dans votre potager.',
    treat_had: '🍓 Ils ont eu leur friandise aujourd’hui. Une autre demain !', treat_given: '{farmer} leur apporte une friandise · des œufs en plus bientôt', treat_given_x: '{farmer} leur apporte une friandise · des œufs en plus bientôt, et un peu d’expérience pour chaque oiseau',
    ord_carrot: 'Carottes', ord_straw: 'Fraises', ord_pump: 'Citrouilles', ord_veg_have: '(dans votre garde-manger\u00a0: {n})', ord_sub_veg: 'Tout vient de votre garde-manger.',
    away_garden: 'Votre potager est prêt à être récolté', away_garden1: 'Un carré de votre potager est prêt à être récolté', garden_aria: 'Le potager',
    // commandes du village (7 nov. 2026)
    ord_q: '« {l} »', ord_title: 'Commandes du village', ord_sub: 'Les villageois demandent un panier. Remplissez-le et livrez-le contre des pièces.',
    ord_eggs: 'Œufs', ord_fish: 'Poissons', ord_honey: 'Pots de miel', ord_grain: 'Grain', ord_grain_have: '(dans votre garde-manger\u00a0: {n})',
    ord_pay: '{c} pièces · {x} XP', ord_surprise: '🎁 Une surprise dedans !', ord_deliver: 'Livrer le panier', ord_decline: 'Pas celle-ci',
    ord_none: 'Pas de commande pour l’instant.', ord_next: 'La prochaine arrive dans {t}.', ord_ready: '🧺 Le panier pour {name} est prêt : touchez l’étal pour le livrer', ord_readyb: 'Prêt !',
    ord_new: '📜 Une nouvelle commande à préparer pour {name}', ord_new2: '📜 {n} nouvelles commandes du village : touchez le panier', ord_set: '🧺 {n} pour {name}', ord_fish_set: 'Mis de côté pour {name} 🧺',
    ord_done: 'Panier livré pour {name} : +{c} pièces, +{x} XP', ord_sp_worms: '🎁 Surprise : une boîte de {n} vers !', ord_sp_grain: '🎁 Surprise : un sac de grain (+{n}) !', ord_sp_coins: '🎁 Surprise : {c} pièces de plus !',
    ord_declined: 'Refusée : ce qui était mis de côté est vendu · +{c} pièces', ord_declined0: 'Refusée : une autre commande viendra',
    ord_lv_t: 'Nouveau : les commandes du village', ord_lv_b: 'Les villageois demandent des paniers d’œufs, de poissons, de miel ou de grain, et paient bien : touchez l’étal près de la ferme.',
    ord_aria: 'Commandes du village', ord_stall: 'L’étal de la ferme', ord_on_way: '{farmer} porte le panier à l’étal',
    vil_potts: 'Mme Potts', vil_potts_s: 'Mme Potts', vil_potts_r: 'la boulangère', vil_potts_l: 'Pour mes gâteaux, s’il vous plaît !',
    vil_finch: 'M. Finch', vil_finch_s: 'M. Finch', vil_finch_r: 'l’animalerie', vil_finch_l: 'De quoi garnir le grand aquarium de ma vitrine.',
    vil_lily: 'Lily', vil_lily_s: 'Lily', vil_lily_r: 'le salon de thé', vil_lily_l: 'Mes scones méritent ce qu’il y a de mieux !',
    vil_tom: 'Le vieux Tom', vil_tom_s: 'le vieux Tom', vil_tom_r: 'le meunier', vil_tom_l: 'Mon moulin est resté bien calme cette semaine.',
    vil_amara: 'Dr Amara', vil_amara_s: 'la docteure Amara', vil_amara_r: 'la vétérinaire', vil_amara_l: 'Un régal pour moi, et un pour ma chatte Praline.',
    vil_clara: 'Mlle Clara', vil_clara_s: 'Mlle Clara', vil_clara_r: 'l’école du village', vil_clara_l: 'Vendredi, c’est l’atelier cuisine !',
    vil_marco: 'Marco', vil_marco_s: 'Marco', vil_marco_r: 'le café', vil_marco_l: 'Mes petits-déjeuners sont célèbres grâce à vous.',
    vil_fete: 'La fête', vil_fete_s: 'la fête', vil_fete_r: 'le comité du village', vil_fete_l: 'Des lots pour la tombola, s’il vous plaît !',
    fish_tin: 'Une boîte de {n} vers', fish_tin_buy: 'Acheter · {c} pièces', fish_tin_bought: '{n} vers dans la boîte · −{c} pièces',
    fish_going: '{farmer} part au ponton', fish_night: '{farmer} dort : la pêche, ce sera demain matin', fish_busy: '{farmer} est occupé : réessayez dans un instant',
    fish_cast: 'Touchez l’eau pour lancer', fish_wait: 'Surveillez le bouchon…', fish_bite: 'Touchez quand le curseur est dans le vert\u00a0!', fish_soon: 'Pas encore\u00a0: attendez que ça morde',
    fish_missed: 'Il est parti avec le ver', fish_reel: 'Maintenez pour remonter. Gardez la ligne dans le vert',
    fish_snap: 'Trop fort : la ligne a cassé et il s’est sauvé', fish_slip: 'Laissé seul, il s’est sauvé', fish_stop: 'Arrêter de pêcher', fish_keep: 'Continuer', fish_stop1: 'Arrêter',
    busy_cuddle: '{farmer} fait un câlin à {name}.', busy_worms: '{farmer} ramasse les vers de {name}.', busy_fill: '{farmer} remplit une mangeoire.',
    busy_treat: '{farmer} apporte une friandise à un poulailler.', busy_fish: '{farmer} est à la pêche.', busy_geese: '{farmer} rend visite aux oies.',
    busy_sow: '{farmer} sème le blé.', busy_harvest: '{farmer} récolte le blé.', busy_honey: '{farmer} récolte le miel.',
    busy_garden: '{farmer} est au potager.', busy_order: '{farmer} porte un panier à l’étal.', busy_cheer: '{farmer} dit au revoir aux jeunes.',
    busy_fox: '{farmer} chasse Rusty.', busy_work: '{farmer} est occupé.', busy_wait: 'Demandez autre chose\u00a0: ce sera fait ensuite (3 tâches au plus).',
    busy_wait_fish: 'Demandez une autre tâche et la canne sera posée pour la faire.',
    next_list: 'Ensuite\u00a0: {list}.', next_added: 'Ajouté à la liste de {farmer} ({n} sur 3)\u00a0: {job}.', next_full: 'La liste de {farmer} est pleine\u00a0: 3 tâches en attente.', next_already: 'Déjà sur la liste de {farmer}.',
    next_cuddle: 'un câlin pour {name}', next_worms: 'les vers de {name}', next_fill: 'une mangeoire', next_treat: 'une friandise', next_fish: 'la pêche', next_geese: 'les oies',
    next_sow: 'semer le blé', next_harvest: 'la moisson', next_honey: 'le miel', next_garden: 'le potager', next_order: 'un panier pour l’étal',
    fish_casting: 'On lance…', wheat2_title: 'Votre deuxième champ de blé', wheat2_more_t: 'Un deuxième champ de blé', wheat2_more: 'Ajouter ce champ · {c} pièces', wheat2_more_broke: 'Ajouter ce champ · {c} pièces (pas encore assez)', wheat2_bought: '🌾 Votre deuxième champ de blé est prêt à semer · −{c} pièces. Déplacez-le depuis sa fiche si vous voulez.', bed_more_t: 'Carré {n} : un nouveau', bed_more: 'Ajouter ce carré · {c} pièces', bed_more_broke: 'Ajouter ce carré · {c} pièces (pas encore assez)', bed_more_lv: 'À partir du niveau {l}, pour {c} pièces.', bed_bought: '🟫 Le carré {n} est à vous · −{c} pièces. Semez-le quand vous voulez.', bed_bought_moved: '🟫 Le carré {n} est à vous · −{c} pièces. Le potager s’est un peu déplacé pour loger sa deuxième rangée.', bed_noroom: 'Pas la place ici pour une deuxième rangée de carrés\u00a0: déplacez d’abord le potager vers un endroit plus dégagé.', garden_all: 'Voir tous les carrés', replay_bad: 'Rusty a pris {n} œufs cette nuit · Voir', replay_bad1: 'Rusty a pris un œuf cette nuit · Voir', apple_wait: '🍎 Plus de place pour le pommier à côté du nouvel enclos\u00a0: il attend dans son bac et reviendra tout seul dès que le poulailler aura de la place sur le côté (déplacez-le pour lui en donner).', book_coop_wait: 'Un poulailler vous attend\u00a0: {breed}', book_see: 'Voir', coop_waits: '🏠 Un nouveau poulailler vous attend dans votre Livre\u00a0: installez-le quand vous voulez.', cuddle_all_done: 'Un câlin pour tout le monde ici ♥ +{xp} XP', sound_test: 'Tester le son', sound_test_ok: 'Deux notes viennent de jouer, puis un bruit de la ferme et l’une de vos poules. Si vous n’avez pas entendu les notes, montez le volume avec les boutons sur le côté, le jeu ouvert.', sound_test_wait: 'Le son se réveille\u00a0: touchez encore une fois.', sound_test_none: 'Cet appareil ne donne pas de son au jeu.', nav_book: 'Livre', nav_coops: 'Poulaillers', nav_orders: 'Commandes', nav_jobs: 'Tâches', nav_shows: 'Concours', move_snapped: 'Déplacé un peu, là où il a la place de s’agrandir.', coop_inside: 'Regarder à l’intérieur', eggs_pantry_f1: '🥚 1 œuf tout frais dans votre garde-manger · +{xp} XP', eggs_pantry_f: '🥚 {n} œufs dans votre garde-manger, dont {f} tout frais · +{xp} XP',
    pantry_btn: 'Garde-manger', pantry_title: 'Votre garde-manger', pantry_sub: 'Tout ce que vous récoltez est gardé ici. Vendez quand vous voulez, ou gardez pour les commandes du village.', pantry_orders: '🧺 {n} gardés pour les commandes', pantry_sell: 'Vendre {n} · +{c} pièces', pantry_sell_kept: 'Vendre quand même · +{c} pièces', pantry_grow: 'Vos étagères s’agrandissent quand votre ferme monte de niveau.', pantry_sold: 'Vendu\u00a0: {n} · +{c} pièces', pantry_empty: 'Vide', pantry_full: 'Plein', eggs_pantry1: '🥚 1 œuf dans votre garde-manger · +{xp} XP', eggs_pantry: '🥚 {n} œufs dans votre garde-manger · +{xp} XP', pantry_over: 'Garde-manger plein\u00a0: {n} vendus · +{c} pièces', honey_pantry1: '🍯 1 pot de miel dans votre garde-manger', honey_pantry: '🍯 {n} pots de miel dans votre garde-manger', pantry_grain: 'Vos mangeoires utilisent d’abord ce grain.', pantry_big_t: 'Étagères plus grandes', pantry_big_d: 'Moitié plus de place sur chaque étagère, pour toujours.', pantry_big_on: 'Étagères plus grandes\u00a0: à vous ✓', pantry_first: 'Vos œufs attendent ici. Touchez Vendre pour les changer en pièces.',
    shop_btn: 'Boutique',
    hist_more: 'En savoir plus',
    hist_less: 'Réduire',
    hist_rir: 'Créée vers 1850 dans le Rhode Island et le Massachusetts, aux États-Unis, à partir de poules de ferme locales et d’oiseaux venus d’Asie par bateau. Robuste et fiable, elle est devenue l’une des pondeuses les plus aimées du monde et l’oiseau emblème du Rhode Island.',
    hist_orp: 'Créée en 1886 par William Cook dans le village d’Orpington, dans le Kent, en Angleterre. Il voulait une poule qui ponde bien et qui soit belle aussi. Grandes, toutes rondes et douces, les Orpington ont vite conquis le monde entier.',
    hist_sil: 'Une race très ancienne venue d’Asie, sans doute de Chine. Au XIIIe siècle, le voyageur Marco Polo parlait de poules au «\u00a0poil comme celui des chats\u00a0». Sous leur duvet, les Soies ont la peau sombre et cinq doigts à chaque patte, et ce sont des mères dévouées.',
    hist_aya: 'Elle vient de l’île de Java, en Indonésie, où «\u00a0ayam\u00a0» veut simplement dire poulet. Elle est noire de partout\u00a0: plumes, bec, peau et même les os. À Java, on dit depuis longtemps qu’elle porte bonheur.',
    hist_call: 'Un tout petit canard élevé aux Pays-Bas, sans doute à partir d’oiseaux venus d’Asie. Les chasseurs se servaient autrefois de son cri fort et clair pour attirer les canards sauvages\u00a0: c’est de là que vient son nom de canard d’appel. Aujourd’hui, on l’élève pour son charme.',
    hist_leg: 'Elle vient de Toscane, en Italie. Son nom est celui du port de Livourne, «\u00a0Leghorn\u00a0» en anglais, d’où elle embarquait pour l’Amérique au XIXe siècle. Légère et vive, c’est une championne des œufs blancs.',
    hist_pol: 'Malgré son nom, la Polonaise (ou Padoue) vient sans doute des Pays-Bas, où on la voit sur des tableaux du XVIIe siècle. Son nom viendrait d’un vieux mot néerlandais pour «\u00a0tête\u00a0», à cause de sa superbe huppe.',
    hist_bra: 'Créée aux États-Unis dans les années 1840 à partir de très grands oiseaux venus de Shanghai, en Chine, elle porte le nom du fleuve Brahmapoutre. En 1852, quelques-unes furent offertes à la reine Victoria. Immense mais douce, on l’appelle la «\u00a0reine des poules\u00a0».',
    hist_pea: 'Le paon bleu vient d’Inde et du Sri Lanka\u00a0; c’est l’oiseau national de l’Inde. On élève des paons dans les jardins depuis plus de deux mille ans. Seul le mâle porte la grande traîne, qu’il déploie en roue pour séduire les paonnes.',
    catch_want: '🧺 Pour une commande', catch_orders: 'Les commandes du village demandent encore {n} poissons. Gardez ceux qui sont marqués.', catch_orders1: 'Une commande du village demande encore 1 poisson. Gardez celui qui est marqué.', catch_orders0: 'Aucune commande ne demande de poisson pour l’instant.',
    mile_tab: 'Objectifs', mile_sub: 'Souvenirs sur votre étagère\u00a0: {n} sur {all}', mile_collect: 'Récupérer · +{c} pièces', mile_got: '🏅 {name}\u00a0: +{c} pièces, +{xp} XP', mile_keep: '🏅 {name}\u00a0: +{c} pièces, +{xp} XP, et un souvenir pour votre étagère\u00a0!', mile_all: 'Terminé ✓', mile_secret: '???', mile_secret_d: 'Un secret de l’étang. Ouvrez l’œil…', mile_shelf: 'Vos souvenirs', mile_fish: 'Pêche', mile_fish_d: 'Poissons différents pêchés', mile_friends: 'Meilleurs amis', mile_friends_d: 'Volailles devenues vos meilleures amies', mile_chicks: 'Nurserie', mile_chicks_d: 'Poussins élevés', mile_gold: 'Œufs d’or', mile_gold_d: 'Œufs d’or trouvés', mile_eggs: 'Panier d’œufs', mile_eggs_d: 'Œufs ramassés', mile_wheat: 'Moisson', mile_wheat_d: 'Récoltes de blé', mile_veg: 'Potager', mile_veg_d: 'Légumes récoltés', mile_orders: 'Ami du village', mile_orders_d: 'Commandes livrées', mile_ros: 'Star des concours', mile_ros_d: 'Cocardes gagnées', mile_night: 'Bonne nuit', mile_night_d: 'Tournées du soir faites', mile_coins: 'Bas de laine', mile_coins_d: 'Pièces gagnées', mile_foxfirst: 'Un visiteur dans la nuit', mile_foxfirst_d: 'La première visite de Rusty', mile_foxin: 'Oups\u00a0!', mile_foxin_d: 'Rusty a eu les œufs', mile_rusty: 'À l’épreuve du renard', mile_rusty_d: 'Nuits où Rusty est reparti bredouille', mile_love: 'Amour à l’étang', mile_love_d: 'Vous avez vu le saumon et la petite grenouille', gn_btn: 'Bonne nuit', gn_done: 'Bonne nuit, tout le monde\u00a0! Toutes les portes seront fermées pour la nuit · +{c} pièces · +{xp} XP', dawn_worms: '🪱 {n} vers trouvés ce matin', job_claim_all: 'Tout récupérer', jobs_bonus: 'Les trois tâches faites\u00a0: +{n} vers 🪱', jobs_note2: 'Finissez les trois pour gagner {n} vers.', cuddle_all: '♥ Câliner tout le monde ici', cuddle_all_go: '{farmer} part câliner tout le monde ici ♥ +{xp} XP', cuddle_all_none: 'Tout le monde ici a eu son câlin pour l’instant.',
    fish_try2: 'Raté\u00a0! Encore 2 essais', fish_try1: 'Raté\u00a0! Dernier essai', find_farmer: 'Trouver {farmer}', find_home: '{farmer} est à la maison', fish_again: 'Il a lâché… il va mordre de nouveau', fish_watch: 'Attendez que ça morde…', fish_nibble: 'Ça mordille… pas encore !',
    fish_r_hold: 'Gardez le doigt appuyé pour remonter', fish_r_good: 'Bravo\u00a0! Il arrive…', fish_r_ease: 'Il tire\u00a0! Relâchez un instant',
    fish_r_slack: 'Trop mou ! Appuyez de nouveau',
    fhelp_title: 'Comment pêcher', fhelp_1t: '1. Lancer', fhelp_1: 'Touchez l’eau.',
    fhelp_2t: '2. Attendre que ça morde', fhelp_2: 'Surveillez le bouchon jusqu’à ce qu’il plonge.',
    fhelp_3t: '3. Toucher dans le vert', fhelp_3: 'Touchez quand le curseur est dans le vert. Vous avez 3 essais.',
    fhelp_slack: 'Mou : appuyez', fhelp_good: 'Bleu\u00a0: appuyez', fhelp_tight: 'Rouge\u00a0: relâchez', fhelp_first: 'Votre première prise sera facile.', fhelp_ok: 'Compris !',
    fish_size: '{cm} cm', fish_first: 'Un nouveau poisson pour votre livre !', fish_best: 'Votre plus beau !', fish_xp: '+{xp} XP',
    fish_sold: 'Direction l’animalerie du village, en pleine forme · +{c} pièces',
    fish_photo_big_bertha: 'Sa photo pour votre livre, puis elle retourne dans l’étang. Le journal du village achète votre photo · +{c} pièces',
    fish_photo_old_snapjaw: 'Sa photo pour votre livre, puis il retourne dans la rivière. Le journal du village achète votre photo · +{c} pièces',
    fish_caught_n: 'Pêché {n} fois', fish_caught_1: 'Pêché une fois', fish_tap_dock: 'L’étang',
    fill_btn: 'La remplir · {c} pièces', fill_part: 'Remplir ce que vous pouvez · {c} pièces', fill_scraps: 'Des restes de cuisine (gratuit)', fill_full: 'Elle est pleine', fill_broke: 'Vendez d’abord quelques œufs',
    filled: 'Mangeoire remplie · −{c} pièces', filled_scraps: 'Des restes de cuisine dans la mangeoire : de quoi tenir quelques heures.',
    farmer_feed: '{farmer} arrive avec le grain · −{c} pièces', farmer_feed_g: '{farmer} arrive avec votre grain', filled_g: 'Mangeoire remplie avec votre grain', farmer_scraps: '{farmer} arrive avec des restes de cuisine',
    bub_low: 'Presque vide', bub_empty: 'Mangeoire vide',
    broody: '{name} est devenue couveuse : elle couve {n} œufs.',
    hatched: '{n} poussins sont nés ! {name} est maman.',
    hatched_duck: '{n} canetons sont nés ! {name} est maman.', raising_duck: 'Élève {n} canetons : jeunes canes et canards dans environ {when}.',
    raising_y_duck: 'Élève {n} jeunes canes et canards : ils partent pour une nouvelle ferme dans environ {when}.', no_lay_brood_duck: 'Elle ne pond pas d’œufs à vendre tant qu’elle s’occupe de ses canetons.',
    duckling: 'Caneton', chick_of_duck: '{breed} · caneton de {name}', chick_grows_duck: 'Jeune cane ou jeune canard dans environ {when}.', chick_soon_duck: 'Bientôt une jeune cane ou un jeune canard !',
    young_h_duck: 'Jeune cane', young_r_duck: 'Jeune canard', turned_duck: 'Les canetons de {name} deviennent de jeunes canes et canards !',
    congrats_exp_duck: '{mum} et {dad} gagnent de l’expérience : leurs prochains canetons seront encore meilleurs.', congrats_exp1_duck: '{mum} gagne de l’expérience : ses prochains canetons seront encore meilleurs.',
    away_hatched_duck: '{name} a fait éclore {n} canetons', away_grown_duck: 'Les canetons de {name} ont grandi : leur carte arrive',
    hatched_pea: '{n} paonneaux sont nés ! {name} est maman.', raising_pea: 'Élève {n} paonneaux : jeunes paonnes et jeunes paons dans environ {when}.',
    raising_y_pea: 'Élève {n} jeunes paonnes et jeunes paons : ils partent pour une nouvelle ferme dans environ {when}.', no_lay_brood_pea: 'Elle ne pond pas d’œufs à vendre tant qu’elle s’occupe de ses paonneaux.',
    peachick: 'Paonneau', chick_of_pea: '{breed} · paonneau de {name}', chick_grows_pea: 'Jeune paonne ou jeune paon dans environ {when}.', chick_soon_pea: 'Bientôt une jeune paonne ou un jeune paon !',
    young_h_pea: 'Jeune paonne', young_r_pea: 'Jeune paon', turned_pea: 'Les paonneaux de {name} deviennent de jeunes paonnes et de jeunes paons !',
    congrats_exp_pea: '{mum} et {dad} gagnent de l’expérience : leurs prochains paonneaux seront encore meilleurs.', congrats_exp1_pea: '{mum} gagne de l’expérience : ses prochains paonneaux seront encore meilleurs.',
    away_hatched_pea: '{name} a fait éclore {n} paonneaux', away_grown_pea: 'Les paonneaux de {name} ont grandi : leur carte arrive',
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
    hatched_rare: '{n} poussins sont nés, dont un rare : {line} ! ✨', rare_chick: '✨ Un poussin rare : {line}', rare_young_h: '✨ Rare : {line}, une jeune poule', rare_young_r: '✨ Rare : {line}, un jeune coq',
    rare_keep_h: 'La garder', rare_keep_r: 'Le garder', rare_sell: 'Vendre · {c}',
    rare_kept: '{name} est bien au chaud dans le panier près du feu de la ferme.', rare_kept_r: '{name} est bien au chaud dans le panier près du feu de la ferme.', rare_sold: 'Vendu {c} pièces', rare_full: 'Votre trio {line} est complet : celui-ci est vendu pour vous',
    rare_card_t: 'Une {line} rare !', rare_card_body: 'Née à {coop}. Gardez-la : elle vivra dans un panier près du feu de la ferme en attendant son propre poulailler. Ou vendez-la pour beaucoup.',
    rare_card_body_r: 'Né à {coop}. Gardez-le : il vivra dans un panier près du feu de la ferme en attendant son propre poulailler. Ou vendez-le pour beaucoup.',
    rare_waiting: 'Un bébé rare attend votre choix', basket_t: 'Le panier près du feu', basket_note: 'Construisez leur poulailler pour {c} pièces : ils s’y installent, et un couple rare peut avoir d’autres petits de sa couleur.', rare_of: '{line} · {kind}',
    rare_build: 'Construire leur poulailler · {c}', rare_build_no: 'Leur poulailler : {c} pièces', rare_home: 'Bienvenue chez vous, {names} !', rare_kept_home: '{name} rejoint {coop}.', book_rare: 'Rare : naît d’une {from}', book_or: ' ou d’une ',
    farewell: 'Allez, bonne route !',
  },
};
// a word of the game's in a language, outside a game (the onboarding pictures' sale sign: main.js ?intro)
export const gameText = (lang, key) => (TEXT[lang] || TEXT.en)[key] || TEXT.en[key] || key;
// in French "Just arrived" agrees with the bird
export const TEXT_F = { en: { exp_chicks: 'The more stars, the better her chicks.', exp_ducklings: 'The more stars, the better her ducklings.', exp_peachicks: 'The more stars, the better her peachicks.', geese_b0: 'They don’t like {farmer} yet: they hiss and chase her out of their field.', geese_b1: 'They put up with {farmer} now, from a distance, and eat the corn once she steps back.' },
  fr: { exp_none: 'Tout juste arrivée : l’expérience vient avec le temps passé à la ferme et l’affection que vous donnez.', happy_left: 'Heureuse après un câlin : encore {when}',
    exp_chicks: 'Plus elle a d’étoiles, meilleurs sont ses poussins.', exp_ducklings: 'Plus elle a d’étoiles, meilleurs sont ses canetons.', exp_peachicks: 'Plus elle a d’étoiles, meilleurs sont ses paonneaux.',
    show_in: '{name} est inscrite : résultats à 7 h, dans {when}', show_entered: '{name} est inscrite au {show} !',
    res_none: '{name} n’est pas classée au {show} cette fois ({place} sur {of}). Le temps à la ferme et les câlins l’aideront.',
    res_champ: '{name} est championne maintenant !', ros_none: 'Pas encore de cocarde : inscrivez-la à un concours (la cocarde en haut).',
    champ_c: 'Championne régionale', champ_n: 'Championne nationale',
    fox_farmer: 'Rusty le renard est venu pour les œufs du poulailler {dehen}, mais {farmer} est sortie avec sa lampe et l’a renvoyé chez lui !',
    geese_b0: 'Ils n’aiment pas encore {farmer} : ils sifflent et la chassent de leur pré.', geese_b1: 'Ils tolèrent {farmer} maintenant, de loin, et mangent le grain quand elle s’éloigne.',
    fish_busy: '{farmer} est occupée : réessayez dans un instant', busy_work: '{farmer} est occupée.' } };

// the other languages' words (lang.js: German, Spanish, Portuguese, Italian), by the same keys
for (const [L, P] of Object.entries(PACKS)) { TEXT[L] = P.text || {}; TEXT_F[L] = P.textF || {}; }
export { LOCALE };

export const BREED_INFO = {
  rir: { name: ['Rhode Island Red', 'Rhode Island Red'], coop: ['Red Barn', 'Grange rouge'] },
  orp: { name: ['Buff Orpington', 'Orpington fauve'], coop: ['Thatched Cottage', 'Chaumière'] },
  sil: { name: ['White Silkie', 'Poule soie blanche'], kind: ['Silkie', 'Poule soie'], col: ['White', 'blanche'], coop: ['Pagoda Coop', 'Poulailler pagode'] },
  leg: { name: ['Cream Legbar', 'Legbar crème'], coop: ['Stone Cottage', 'Maison de pierre'] },
  bra: { name: ['Light Brahma', 'Brahma herminé'], coop: ['Timber Lodge', 'Chalet en rondins'] },
  // (release 7, Audrey, 29 Oct: "Polish (Recommended)", "Ayam Cemani", at levels 26 and 29, each with its own coop)
  pol: { name: ['Polish', 'Padoue'], coop: ['Little Windmill', 'Petit moulin'] },
  aya: { name: ['Ayam Cemani', 'Ayam Cemani'], coop: ['Javanese House', 'Maison javanaise'] },
  // (30 Oct 2026, Audrey's call ducks: "call duck (new type of eggs!)", at level 10 in her own order; their Floating House:
  // "a little wooden house on a raft in the middle of their pond". A drake and two ducks; duck eggs. `duck`: not chickens:
  // no chicken shows (their ducklings: as the hens' chicks, 30 Oct), and Rusty can't reach a house out on a pond)
  call: { name: ['Call duck', 'Canard Call'], coop: ['Floating House', 'Maison flottante'], duck: true },
  // (31 Oct 2026, Audrey's peacock at level 30: "Indian blue (Recommended)", "Peacock + 2 peahens (Recommended)", "Garden
  // pavilion (Recommended)". `pea`: peafowl, not chickens: no poultry shows; the peacock sleeps up on his perch)
  pea: { name: ['Indian Blue peafowl', 'Paon bleu'], coop: ['Garden Pavilion', 'Pavillon de jardin'], pea: true },
  // the other Silkie colours by level (release 2, game-plan-v2.md §4): each its own forever trio and Pagoda Coop with a touch
  // of its colour; a "line" of the Silkie breed (the key `sil_<colour>` on its coop and birds; the white ones keep `sil`)
  sil_black: { name: ['Black Silkie', 'Poule soie noire'], kind: ['Silkie', 'Poule soie'], col: ['Black', 'noire'], coop: ['Pagoda Coop', 'Poulailler pagode'] },
  sil_buff: { name: ['Buff Silkie', 'Poule soie fauve'], kind: ['Silkie', 'Poule soie'], col: ['Buff', 'fauve'], coop: ['Pagoda Coop', 'Poulailler pagode'] },
  sil_blue: { name: ['Blue Silkie', 'Poule soie bleue'], kind: ['Silkie', 'Poule soie'], col: ['Blue', 'bleue'], coop: ['Pagoda Coop', 'Poulailler pagode'] },
  sil_partridge: { name: ['Partridge Silkie', 'Poule soie perdrix'], kind: ['Silkie', 'Poule soie'], col: ['Partridge', 'perdrix'], coop: ['Pagoda Coop', 'Poulailler pagode'] },
  sil_grey: { name: ['Grey Silkie', 'Poule soie grise'], kind: ['Silkie', 'Poule soie'], col: ['Grey', 'grise'], coop: ['Pagoda Coop', 'Poulailler pagode'] },
  // the rare colours (release 2 step 2): only from breeding (RARE_FROM)
  sil_paint: { name: ['Paint Silkie', 'Poule soie pie'], kind: ['Silkie', 'Poule soie'], col: ['Paint', 'pie'], coop: ['Pagoda Coop', 'Poulailler pagode'], rare: true },
  sil_lavender: { name: ['Lavender Silkie', 'Poule soie lavande'], kind: ['Silkie', 'Poule soie'], col: ['Lavender', 'lavande'], coop: ['Pagoda Coop', 'Poulailler pagode'], rare: true },
  sil_red: { name: ['Red Silkie', 'Poule soie rouge'], kind: ['Silkie', 'Poule soie'], col: ['Red', 'rouge'], coop: ['Pagoda Coop', 'Poulailler pagode'], rare: true },
  sil_splash: { name: ['Splash Silkie', 'Poule soie splash'], kind: ['Silkie', 'Poule soie'], col: ['Splash', 'splash'], coop: ['Pagoda Coop', 'Poulailler pagode'], rare: true },
  sil_cuckoo: { name: ['Cuckoo Silkie', 'Poule soie coucou'], kind: ['Silkie', 'Poule soie'], col: ['Cuckoo', 'coucou'], coop: ['Pagoda Coop', 'Poulailler pagode'], rare: true },
};
register('breed', BREED_INFO);                       // (each's name, kind, colour and coop in every language: lang.js, 'breed.sil_black.col')
// ---- rare Silkie babies (release 2 step 2, game-plan-v2.md §4; Audrey: "Every month or two" a Silkie coop, "When it's
// grown"): each rare colour only from breeding, from its own colour; a chick's chance grows a little with her parents' stars
// (rare all the same). She hatches in her colour; grown, she's yours to keep (into the basket by the farmhouse fire, until
// her own coop: the next step) or to sell, for a lot. Up to a trio of each rare colour (a rooster and two hens): one more
// than that is sold for you. A rare one sells for RARE.price plus RARE.starPrice a star
// (30 Oct 2026, Audrey: the Blue, Grey and Red Silkies no longer come, "we might have too many silkies"; the Splash now from
// the Buff, "From the Buff (Recommended)". A Blue or Grey coop already on a farm still raises its rare colour, and the Red
// Silkies already hatched stay: forever birds never leave)
export const RARE_FROM = { sil: 'sil_paint', sil_black: 'sil_lavender', sil_buff: 'sil_splash', sil_partridge: 'sil_cuckoo', sil_blue: 'sil_splash', sil_grey: 'sil_cuckoo' };
const RARE_FROM_29OCT = { ...RARE_FROM, sil_buff: 'sil_red' };      // (before: a Buff coop's rare babies Red, kept if one's on its way)
const rareFrom = (b, line) => line === RARE_FROM[b] || line === RARE_FROM_29OCT[b];
export const RARE_LINES = ['sil_paint', 'sil_lavender', 'sil_red', 'sil_splash', 'sil_cuckoo'];
export const RARE = { base: 0.018, star: 0.004, price: 400, starPrice: 50, basket: 15, pending: 6, coop: 2500, bred: 0.4, broody: 0.5 };      // (coop: a rare colour's own coop, release 2 step 3: Audrey, "Buy it, 2,500 coins")
const rareMost = () => RARE.base + RARE.star * 10;      // (the most a chick's chance can be: both parents five stars)
export const rarePrice = stars => RARE.price + RARE.starPrice * stars;
// a line's breed (the Silkie colours are all Silkies: their eggs, chicks, house and shows) and a Silkie line's colour
export const isDuck = k => !!(BREED_INFO[k] && BREED_INFO[k].duck);      // (the call ducks: not chickens)
export const isPea = k => !!(BREED_INFO[k] && BREED_INFO[k].pea);        // (the peafowl: nor these)
export const kindOf = k => isDuck(k) ? 'duck' : isPea(k) ? 'pea' : null;      // (whose words: a duck's, a peafowl's or a chicken's)
export function baseBreed(k) { return typeof k === 'string' && k.startsWith('sil') ? 'sil' : k; }
export function silColour(k) { return k === 'sil' ? 'white' : typeof k === 'string' && k.startsWith('sil_') ? k.slice(4) : null; }

// the five personalities (the 2D game's), with what each is like in a line, for a hen (h) and a rooster (r)
export const PERS = ['mum', 'rebel', 'diva', 'glutton', 'brave'];
export const PERS_INFO = {
  mum: { icon: '🐣', name: { en: ['Good mum'], fr: ['Mère poule'] },
    line: { en: ['A born mother: her chicks are the best looked after.'], fr: ['Une vraie mère : ses poussins sont les mieux soignés.'] },
    duck: { en: ['A born mother: her ducklings are the best looked after.'], fr: ['Une vraie mère : ses canetons sont les mieux soignés.'] },
    pea: { en: ['A born mother: her peachicks are the best looked after.'], fr: ['Une vraie mère : ses paonneaux sont les mieux soignés.'] } },
  rebel: { icon: '🏃', name: { en: ['Rebel', 'Rebel'], fr: ['Rebelle', 'Rebelle'] },
    line: { en: ['Adventurous: she’ll slip out now and then, and may bring something back.', 'Adventurous: he’ll slip out now and then, and may bring something back.'],
            fr: ['Aventurière : elle fera parfois le mur, et rapportera peut-être une trouvaille.', 'Aventurier : il fera parfois le mur, et rapportera peut-être une trouvaille.'] },
    duck: { en: ['Adventurous: always first into the pond, and loves a big splash.', 'Adventurous: always first into the pond, and loves a big splash.'],
            fr: ['Aventurière : toujours la première à l’eau, et adore faire de grandes éclaboussures.', 'Aventurier : toujours le premier à l’eau, et adore faire de grandes éclaboussures.'] } },
  diva: { icon: '👑', name: { en: ['Diva', 'Diva'], fr: ['Diva', 'Diva'] },
    line: { en: ['Loves the limelight, and the best feed.', 'Loves the limelight, and the best feed.'], fr: ['Adore les projecteurs, et la meilleure nourriture.', 'Adore les projecteurs, et la meilleure nourriture.'] } },
  glutton: { icon: '🌽', name: { en: ['Glutton', 'Glutton'], fr: ['Gourmande', 'Gourmand'] },
    line: { en: ['Always first at the feeder.', 'Always first at the feeder.'], fr: ['Toujours la première à la mangeoire.', 'Toujours le premier à la mangeoire.'] } },
  brave: { icon: '🛡️', name: { en: ['Brave', 'Brave'], fr: ['Courageuse', 'Courageux'] },
    line: { en: ['Afraid of nothing: keeps watch over the coop at night.', 'Afraid of nothing: keeps watch over the coop at night.'],
            fr: ['N’a peur de rien : veille sur le poulailler la nuit.', 'N’a peur de rien : veille sur le poulailler la nuit.'] },
    duck: { en: ['Afraid of nothing: keeps watch over the pond.', 'Afraid of nothing: keeps watch over the pond.'], fr: ['N’a peur de rien : veille sur la mare.', 'N’a peur de rien : veille sur la mare.'] } },
};
const HEN_NAMES = ['Henrietta', 'Clover', 'Mabel', 'Peggy', 'Dotty', 'Hazel', 'Maple', 'Willow', 'Nutmeg', 'Poppy', 'Pearl', 'Ginger',
  'Olive', 'Marigold', 'Bramble', 'Truffle', 'Pippa', 'Dumpling', 'Ivy', 'Cosette', 'Margot', 'Brioche', 'Lulu', 'Fern', 'Juniper'];
const DUCK_NAMES = ['Puddle', 'Pebble', 'Dimple', 'Paddle', 'Splash', 'Lily', 'Bubbles', 'Wiggles', 'Button', 'Sunny', 'Daisy', 'Ripple'];
const DRAKE_NAMES = ['Pip', 'Waddles', 'Captain', 'Bramble', 'Puddington', 'Noodle', 'Dabble'];      // (the call ducks')
const PEAHEN_NAMES = ['Saffron', 'Jasmine', 'Opal', 'Lotus', 'Indigo', 'Amber', 'Tansy', 'Kiri', 'Meera', 'Celeste', 'Marigold', 'Topaz'];
const PEACOCK_NAMES = ['Raja', 'Augustus', 'Sapphire', 'Peregrine', 'Kingsley', 'Monsoon', 'Caspian'];      // (the peafowl's)
const ROO_NAMES = ['Rupert', 'Albert', 'Barnaby', 'Chester', 'Percy', 'Reginald', 'Gus', 'Hamish', 'Basil', 'Monty', 'Fergus'];
const FARMER_DEFAULT = register('farmer', { m: ['Arthur', 'Arthur'], f: ['Rosie', 'Rose'] });
export const TRUST_AT = [0, 3, 8, 15];                 // cuddles for Shy, Friendly, Trusting, Best friend
// experience (release 1 step 7): 100 a star, up to 5; it comes with time on the farm (a little each day, up to two and a
// half stars' worth), cuddles (each one that counts while trust is still growing) and raising chicks (the mum more than
// the rooster); a cuddle counts once every 6 hours (the bird's happy meanwhile)
export const EXP_DAY = 5, EXP_TIME_MAX = 250, EXP_CUDDLE = 8, HAPPY_MS = 6 * 3600e3, XP_BEST = 20;
export const MAX_STARS = 5;

// ---- levels: the XP to reach each level. The first ones quick (7 Nov 2026, Audrey: "The start is too slow. To keep the
// people going we should have the few first level super easy to reach. And after that it becomes harder"; her choice:
// "Level 5 by day 2"): level 2 in the first minutes, 3 by the end of the first visit, 5 on the second day; then each
// level a little longer to reach than the one before, and the last ones longer than before, so level 30 still comes
// after about a year once a day, with the village orders too (balsim.mjs: day 335; 268 twice a day). Up to level 25 it
// never asks more than the curve before (60 x (level - 1)^2.1), so no farm goes down a level (or loses a field): none
// could be past 25 yet
export const TOP_LEVEL = 30;
const XP_AT = [0, 0, 15, 45, 120, 230, 380, 580, 880, 1320, 1950, 2800, 3850, 5100, 6650, 8400, 10550, 13050, 16000, 19350, 23200, 27400, 32100, 37250, 43000, 47450, 56250, 63850, 72100, 81150, 90850];      // (levels 16 to 30 a little further since the vegetable garden, 7 Nov 2026: up to 9% at 30; to 25 never more than before)
export function xpFor(level) { return level <= 1 ? 0 : XP_AT[Math.min(TOP_LEVEL, level)]; }
// a gift of coins for each new level up to 10 (the same day: the first fields, the breeds and the shop come quicker now)
export const levelGift = L => L >= 2 && L <= 10 ? 25 * L : 0;
export function levelOf(xp) { let L = 1; while (L < TOP_LEVEL && xp >= xpFor(L + 1)) L++; return L; }

// ---- land (release 1 step 5): the farm is split into 30 fields along its lanes and the stream (fields.py: models/
// fields.json, each field's number the order it comes up for sale). Field 0, the home field (the first coop and the
// farmhouse), is the farm's from the start; one more can be bought at each level, nearest first (Audrey, 25 Oct: "For me
// it's a full piece of land"; "Fields with natural borders", "One each level"), from 100 coins at level 2 to 10,000 at 30
export const FIELDS = 30;
// where a coop stands: its middle on the farm (metres, on a quarter-metre grid) and which way it faces (a quarter turn at a
// time); a new farm's first coop in the home field (where the village had its first plot)
export const HOME_COOP = { x: -28, z: -13.75, deg: 90 };
// the breeds by level (release 1 step 6; game-plan-v2.md): each a forever trio with its own rustic coop, the player's to
// place; the other Silkie colours by level with release 2. Since 30 Oct 2026 (Audrey: the Blue and Grey Silkies no longer
// come, "we might have too many silkies"; then her own order: "1 Rhode Island Red, 3 Buff Orpington, 5 White Silkie, 7 Ayam
// Cemani, 10 Call ducks, 12 Buff Silkie, 15 Cream Legbar, 18 Polish, 21 Partridge Silkie, 24 Light Brahma, 27 Black Silkie,
// 30 Peacock"; the call ducks and the peacock to come)
export const BREED_LEVEL = { rir: 1, orp: 3, sil: 5, aya: 7, call: 10, sil_buff: 12, leg: 15, pol: 18, sil_partridge: 21, bra: 24, sil_black: 27, pea: 30 };
// (the order before: a coop placed then stays good on a farm that had reached its level then, the Blue and Grey Silkies too)
const BREED_LEVEL_29OCT = { rir: 1, orp: 5, sil: 6, sil_black: 8, leg: 11, sil_buff: 13, sil_blue: 15, bra: 17, sil_partridge: 20, sil_grey: 23, pol: 26, aya: 29 };
const breedCame = b => Math.min(BREED_LEVEL[b] ?? Infinity, BREED_LEVEL_29OCT[b] ?? Infinity);
// (the County show's breed of the day: from the breeds themselves, as before the Silkie colours, so a day's show is the same)
const SHOW_BREED_LEVEL = { rir: 1, orp: 5, sil: 6, leg: 11, bra: 17 };
// (and from the day after the Polish and the Ayam Cemani came, release 7, with them: the shows of the days before as they were;
// then from 31 Oct at their new levels)
const SHOW_BREED_LEVEL_7 = { ...SHOW_BREED_LEVEL, pol: 26, aya: 29 }, SHOW_7_FROM = '20261030';
const SHOW_BREED_LEVEL_8 = { rir: 1, orp: 3, sil: 5, aya: 7, leg: 15, pol: 18, bra: 24 }, SHOW_8_FROM = '20261031';
const spotNum = v => Number.isFinite(v) && Math.abs(v) <= 200 ? Math.round(v * 4) / 4 : null;
export function landPrice(k) { const p = 100 * Math.pow(100, (k - 1) / 28); return p < 1000 ? Math.round(p / 10) * 10 : Math.round(p / 50) * 50; }      // the k-th field after the home field

// ---- shows (release 1 step 9; the 2D game's shows made the forever birds' own, Audrey: "Shows (Recommended)", "Show day
// on the farm", "Hours later"). Each day at 7:00 a Village show opens (from level 4 a County show too, from level 9 the
// National Championship), open for a day and judged the next morning at 7:00. One bird a show, a bird in one show at a time;
// the fee when she's entered. The judge looks at her stars (experience), how much she trusts you (calm in the judge's hands)
// and a Diva shines a little more, with a little luck of the day; against the day's other entries (the same for everyone,
// from the show's own numbers). 1st, 2nd and 3rd: a rosette (kept on her card for good), coins and XP; a win at the County or
// National makes her a champion. Starting values (the balance is step 11)
export const SHOW_HOUR = 7;
export const SHOWS = {
  v: { level: 1, fee: 10, prize: [40, 20, 10], xp: [5, 3, 1], rivals: 5, mean: 52, sd: 7 },
  c: { level: 4, fee: 30, prize: [120, 60, 30], xp: [15, 8, 4], rivals: 7, mean: 66, sd: 7 },
  n: { level: 9, fee: 100, prize: [300, 150, 75], xp: [35, 18, 9], rivals: 9, mean: 80, sd: 6 },
};
export const SHOW_TIERS = ['v', 'c', 'n'];
// (the prizes and XP before the balance of 26 Oct (release 1 step 11): a result saved then keeps what it said, unflagged)
const SHOWS_25OCT = { v: { prize: [60, 30, 15], xp: [12, 6, 3] }, c: { prize: [250, 120, 60], xp: [40, 20, 10] }, n: { prize: [1000, 500, 250], xp: [100, 50, 25] } };
const SHOW_LUCK = 10, XP_SHOW = 2, TZ_SLACK = 14 * 3600e3;                     // (the luck of the day either way; a little XP just for taking part)
const TOWNS = ['Thornbury Green', 'Ashwell', 'Marlow Down', 'Kettlewick', 'Bramley Cross', 'Fenwick', 'Oakhurst', 'Saxby Vale', 'Little Hollowby', 'Wexcombe'];
const COUNTIES = ['Wessex', 'Mercia', 'Downland', 'Fenshire', 'Weald'];
// a show's id: its tier and the day it opened (v20261025); when it opens and when it's judged (7:00 that day and the next)
const showDay = id => { const m = /^[vcn](\d{4})(\d{2})(\d{2})$/.exec(id); return m ? [+m[1], +m[2] - 1, +m[3]] : null; };
export function showOpens(id) { const d = showDay(id); return d ? new Date(d[0], d[1], d[2], SHOW_HOUR).getTime() : NaN; }
export function showJudged(id) { const d = showDay(id); return d ? new Date(d[0], d[1], d[2] + 1, SHOW_HOUR).getTime() : NaN; }
function showIdAt(tier, now) {                         // the show of that tier open at now (opened at 7:00 today, or yesterday before 7)
  const d = new Date(now), back = d.getHours() < SHOW_HOUR ? 1 : 0, o = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back);
  return tier + o.getFullYear() + String(o.getMonth() + 1).padStart(2, '0') + String(o.getDate()).padStart(2, '0');
}
// who may enter: the Village and the National, any breed; the County, every other day or so one breed (of those come by
// the player's level, so it can be one of theirs)
function showBreed(id, level) {
  if (id[0] !== 'c' || hash01(id + '|any') < 0.5) return null;
  const SB = id.slice(1) >= SHOW_8_FROM ? SHOW_BREED_LEVEL_8 : id.slice(1) >= SHOW_7_FROM ? SHOW_BREED_LEVEL_7 : SHOW_BREED_LEVEL;
  const come = Object.keys(SB).filter(b => SB[b] <= Math.max(level, SHOWS.c.level));
  return come[Math.floor(hash01(id + '|breed') * come.length)];
}
// the day's other entries (the same for everyone): each a score round the show's middle
function rivalScores(id) {
  const T = SHOWS[id[0]];
  return Array.from({ length: T.rivals }, (_, i) => { const u1 = Math.max(1e-6, hash01(id + '|r' + i + 'a')), u2 = hash01(id + '|r' + i + 'b'); return T.mean + T.sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); });
}
const normCdf = x => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; };

// ---- daily jobs (release 1 step 9c; the 2D game's farm jobs, Audrey: "Daily jobs (Recommended)"): three small jobs a day
// on the phone's calendar, new at midnight, one of them always an easy one (eggs or cuddles); done, a tap collects the
// reward. What they can be grows with the game (the wheat field, the decorations... when they come). Targets and rewards
// grow a little with the level the day's jobs were set at (`lv`). Starting values (the balance is step 11)
export const JOBS = {
  eggs: { easy: true, n: L => Math.min(30, 4 + 2 * L) },          // collect eggs
  cuddle: { easy: true, n: L => Math.min(6, 1 + Math.floor(L / 3)) },      // give cuddles (each bird once every 6 hours)
  feed: { n: () => 1 },                                            // fill a feeder
  show: { n: () => 1 },                                            // enter a bird in a show
};
export const jobReward = L => ({ coins: 15 + 5 * L, xp: Math.round(XPV.job + XPV.jobL * L) });
const dayKey = t => { const d = new Date(t); return '' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); };
// the day's three jobs: one easy, two others, all different (the same for that day and level, from the day's own numbers)
function jobsFor(day, lv) {
  const keys = Object.keys(JOBS), easy = keys.filter(k => JOBS[k].easy);
  const first = easy[Math.floor(hash01(day + '|easy') * easy.length)];
  const rest = keys.filter(k => k !== first).sort((a, b) => hash01(day + '|' + a) - hash01(day + '|' + b)).slice(0, 2);
  return [first, ...rest].map(k => ({ k, n: JOBS[k].n(lv), got: 0, paid: false }));
}

// ---- decorations (release 1 step 9d; the 2D game's eight, Audrey: "Decorations and outfits (Recommended)"): bought with
// coins from the level each comes at, put anywhere on your land (the duck house on the pond), moved later. They only change
// how the farm looks. XP a fiftieth of the price (the 2D game's half). Starting values (the balance is step 11)
export const DECOR = {
  flowers: { level: 3, price: 400 }, birdbath: { level: 4, price: 800 }, beehives: { level: 6, price: 1800 }, duckhouse: { level: 8, price: 3000, pond: true },
  greenhouse: { level: 10, price: 6000 }, windmill: { level: 13, price: 12000 }, bandstand: { level: 16, price: 20000 }, statue: { level: 20, price: 40000 },
};
export const decorXp = id => Math.round(DECOR[id].price / 50);
// ---- the guardians (release 3, Audrey: "The guardians"): animals bought with coins from their level. The geese first
// (level 4, when the fox's visits are to start): Gertrude and Hector come to live by the pond. Then the dog (level 9), a
// Border Collie with his kennel, placed where you like on your land like a decoration (turned to face you a little to
// the right, as the village's), and named by the player (Audrey, 23 Oct: "People should be able to choose the name of
// the dog, the default can be biscuit"). XP a fiftieth of the price, as the decorations
export const ANIMALS = { geese: { level: 4, price: 1200 }, dog: { level: 9, price: 4000, kennel: true } };
export const DOG_NAME = 'Biscuit', KENNEL_DEG = -20;
// ---- Rusty's night visits (release 3; Audrey: "He takes the nest's eggs", "About twice a week"): from level 4, on about two
// nights in seven (the night's own luck, the same on every phone), between 11 pm and 2:30 am, Rusty slips out of his den
// to a coop: one whose pop door was left open if there is one, else a shut one (he scratches at it and goes home). At an
// open door: with the geese or the dog on the farm they hear him and chase him home first; without them he takes the
// nest's eggs (an empty nest: a peck on the nose). No bird is ever hurt. The doors: shut for the night by the player (the
// moon over each door), open again in the morning
export const FOX = { level: 4, chance: 2 / 7, from: 23, hours: 3.5 };
// a night: the evening's date (a time before noon belongs to the night before)
export const nightKey = t => dayKey(t - 12 * 3600e3);
const prevNight = k => nightKey(nightStart(k) - 1);
const nightStart = k => new Date(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8), 12).getTime();      // (its noon)
export const foxNight = k => hash01('fox|' + k) < FOX.chance;
// the automatic doors (release 4; Audrey, 27 Oct: "starting at cosy the coop door are automatic. They close automatically
// but sometimes, rarely, it doesn't work and that's when [Rusty] comes"; "About once a month"): a Cosy or Deluxe coop's
// pop door shuts itself at night; about one night in thirty it sticks open, and that night Rusty comes (shut by hand, it
// keeps him out like any other)
export const AUTO_DOOR = { look: 3, stuck: 1 / 30 };
export const autoDoor = c => !!c && lookOf(c) >= AUTO_DOOR.look;
export const doorStuck = (c, k) => autoDoor(c) && hash01('stuck|' + c.id + '|' + k) < AUTO_DOOR.stuck;
const shutFor = (c, k) => c.shut === k || (autoDoor(c) && !doorStuck(c, k));      // (by hand, or by itself)
const foxComes = (coops, k) => foxNight(k) || coops.some(c => doorStuck(c, k));
export const foxAt = k => new Date(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8), FOX.from).getTime() + Math.floor(hash01('foxt|' + k) * FOX.hours * 60) * 60e3;
const foxSeenFrom = now => new Date(now).getHours() < 12 ? nightKey(now) : prevNight(nightKey(now));      // (a farm from before the visits: none for a night already over)
export const animalXp = id => Math.round(ANIMALS[id].price / 50);
// ---- the geese's trust (release 3; the plan: "The geese don't like the farmer at first. They hiss and chase him (he runs,
// his hat flies off). Visit them regularly and little by little they trust him, until they let him cuddle them"; Audrey:
// "A gate in their fence", "About a week", and for their trust "Cuddles, hearts, a little XP", "They greet him", "Braver
// guards"). A visit counts once a day (the phone's calendar): cross at first (they chase the farmer out of their field),
// wary from the 3rd day's (they hiss from afar and eat the corn once the farmer steps back), curious from the 5th (they
// come and eat by the farmer), friends from the 7th (cuddles, as the hens': one counts every 6 hours; a hello at the fence;
// quicker after Rusty). XP for each visit that counts, and for becoming friends
export const GEESE_TRUST = { at: [0, 3, 5, 7], visitXp: 3, friendsXp: 20 };
const geeseLevel = n => GEESE_TRUST.at.filter(k => n >= k).length - 1;
// ---- the wheat field (release 1 step 9e; the 2D game's, Audrey's own idea; Audrey, 25 Oct: "On your land from the
// start"): sown for 20 coins, ripe 4 hours later; harvested, grain for the feeders (used before coins: a unit of grain is a
// unit of feed) and XP. Starting values (the balance is step 11)
// A second field (12 Nov 2026, Audrey's choice "Buy more, by level"): from level 12, for 1,200 coins (the level and the
// coins both); sown, grown and harvested on its own, like the first. Saved as wheat2 (not there: not bought)
export const WHEAT = { sow: 20, grow: 4 * 3600e3, grain: 20, xp: 12, max: 120, second: { level: 12, price: 1200 } };
// ---- honey (Audrey, 25 Oct: "Bees are great idea, let’s make sure the farmer can harvest the honey and sell it !"): the
// beehives (a decoration) fill a jar every 8 hours, up to 6; harvested, the jars are sold like eggs
export const HONEY = { every: 8 * 3600e3, max: 6, price: 15, xp: 3 };
// ---- village orders (7 Nov 2026, Audrey: "Just feeding the chickens is not enough"; her choice: "Village orders: villagers
// ask for a basket (eggs, fish, honey, grain): fill it for coins, XP and sometimes a surprise"). From level 3, at most
// three at a time at the farm's stall, a new one every 3 hours (two at once when they start). The eggs, fish and honey
// set aside for them as they come (the oldest order first, instead of being sold), the grain from the store when the
// basket goes; delivered: paid more than selling it all (pay x its worth), and its XP, and one basket in four a surprise
// (a tin of worms, a sack of grain or extra coins). A villager's order: one thing (or two) of what they like, as much as
// the farm's level makes sense of. Never in a hurry: an order waits for you (or "Not this one": another comes in a while)
export const ORDERS = { level: 3, max: 3, every: 3 * 3600e3, first: 2, gap: 30 * 60e3, worth: { eggs: 6, fish: 22, honey: 15, grain: 1.5, carrot: 3, straw: 4, pump: 18 }, pay: 1.4, most: { eggs: 30, fish: 5, honey: 5, grain: 60, carrot: 18, straw: 18, pump: 4 } };
// ---- the pantry (10 Nov 2026, Audrey: "I should be offered to keep it sell I need a storage"; "If the eggs are sold
// instantly, how do I collect them for orders ? They should go to the storage too until u decide to sell or not"; her
// choices: "One pantry", "Limited, bigger shelves can be bought in the shop with real money otherwise they will become
// bigger as levels are going up", eggs "Straight to storage"): one shelf for each thing collected (the eggs and the honey
// new: they were sold as collected; the grain store, the vegetable basket and the fish box are its other shelves). A
// shelf's size: its base, 5% more for each level past 5, half as much again with the bigger shelves bought. Sold from
// there, a shelf at a time (what the open orders still want is kept unless asked); the orders take from it when they go
export const PANTRY = { base: { eggs: 24, honey: 6, grain: 120, carrot: 30, straw: 30, pump: 10, fish: 12 }, grow: 0.05, from: 5, bought: 1.5, price: { honey: 15, grain: 1, carrot: 3, straw: 4, pump: 18 }, eggMax: 40 };
export const PANTRY_IDS = ['eggs', 'honey', 'grain', 'carrot', 'straw', 'pump', 'fish'];
const shelfSize = (k, level, big) => Math.round(PANTRY.base[k] * (1 + PANTRY.grow * Math.max(0, level - PANTRY.from)) * (big ? PANTRY.bought : 1));      // (a shelf's size at a level; the save's check: no shelf holds more than its size at the save's own level)
export const ORDER_ITEMS = ['eggs', 'fish', 'honey', 'grain', 'carrot', 'straw', 'pump'];
const STORE_ITEMS = ['eggs', 'honey', 'grain', 'carrot', 'straw', 'pump'];      // (an order's that come from a store when it goes: the grain store, the garden's basket)
export const VILLAGERS = {
  potts: { e: '🧁', wants: ['eggs', 'eggs', 'honey', 'carrot', 'pump'] }, finch: { e: '🐠', wants: ['fish'] }, lily: { e: '🫖', wants: ['eggs', 'honey', 'straw'] },
  tom: { e: '🌾', wants: ['grain', 'grain', 'eggs'] }, amara: { e: '🩺', wants: ['eggs', 'fish', 'carrot'] }, clara: { e: '🏫', wants: ['eggs', 'straw', 'carrot'] },
  marco: { e: '☕', wants: ['eggs', 'fish', 'straw'] }, fete: { e: '🎪', wants: ['eggs', 'fish', 'honey', 'grain', 'pump'] },
};
// how much of a thing an order asks for at a level (r: 0..1, a little more or less)
export function orderAmount(k, L, r = 0.5) {
  if (k === 'eggs') return Math.max(3, Math.min(ORDERS.most.eggs, Math.round((3 + L / 2) * (0.8 + 0.4 * r))));
  if (k === 'fish') return Math.min(ORDERS.most.fish, 1 + Math.floor(L / 6) + (r > 0.7 ? 1 : 0));
  if (k === 'honey') return Math.min(ORDERS.most.honey, 1 + Math.floor(L / 8) + (r > 0.7 ? 1 : 0));
  if (k === 'carrot' || k === 'straw') return Math.max(3, Math.min(ORDERS.most[k], Math.round((3 + L / 4) * (0.8 + 0.4 * r))));
  if (k === 'pump') return Math.min(ORDERS.most.pump, 1 + Math.floor(L / 12) + (r > 0.75 ? 1 : 0));
  return Math.min(ORDERS.most.grain, 5 * Math.round((10 + 2 * L) * (0.8 + 0.4 * r) / 5));
}
// what an order pays: its coins and XP (from what it asks for); its surprise, if it has one (worked out from its own number,
// so it's the same whenever it's looked at): 'worms', 'grain' or 'coins'
export function orderPay(o) {
  let w = 0; for (const k of ORDER_ITEMS) w += (o.items[k] || 0) * ORDERS.worth[k];
  return { coins: Math.round(ORDERS.pay * w) + 10, xp: Math.round(w / 12) + 2 };
}
export function orderSurprise(o, fishing) {
  const h = hash01('order|' + o.id + '|' + o.t); if (h >= 0.25) return null;
  const k = Math.floor(h * 12) % 3; return k === 0 && fishing ? 'worms' : k === 1 ? 'grain' : 'coins';
}
export const SURPRISE = { worms: 10, grain: 20, coins: 0.5 };
// ---- the daily egg hunt (7 Nov 2026, Audrey's choice: "Daily egg hunt: each day a hen hides a golden egg somewhere on the
// farm for you to find"): from level 2, one a day (the phone's own day), hidden by one of the farm's hens (who, from the
// day's own number; main.js where, on your land, near a bush, a tree, a rock or something standing about). Found: coins
// and XP, more for each day in a row up to a week (20 + 10 a day: 30 .. 90 coins; 3 + 1 a day XP), and all of them
// counted. Saved: the day the last was found, how many days in a row, how many in all
export const HUNT = { level: 2, coins: 20, coinsDay: 10, xp: 3, xpDay: 1, week: 7 };
// ---- the vegetable garden (7 Nov 2026, Audrey's choice: "Vegetable garden: grow carrots, strawberries and pumpkins, which
// grow at different speeds; treats the hens love"): from level 4, three raised beds on your land by the farmhouse (moved
// like a decoration). Sow a bed (its seeds a few coins): carrots are ripe in an hour, strawberries in 3, pumpkins in 8 (also
// while the game's closed); pick it: its vegetables into your basket, and XP. The basket's vegetables are treats for a
// coop's birds (one a day for each coop, by day: each hen lays an extra egg soon after, two after a pumpkin; strawberries
// and pumpkins give every bird there a little experience too) and what the villagers ask for in their orders (from the
// basket when the order goes, as the grain from the store). Saved: where the garden is, each bed's crop and when it's
// ripe, the basket; a coop's last treat
// More beds (12 Nov 2026, Audrey: "we might want to think about extending them and the [wheat] field with levels or money.
// Needs to be relevant as the game cannot become too easy either"; her choice: "Buy more, by level"): a fourth bed from
// level 9 for 400 coins, a fifth from level 14 for 900, a sixth from level 20 for 2,000 (the level and the coins both), in a
// second row behind the first three. Saved: simply how many beds the garden has (never more than the level allows)
export const GARDEN = { level: 4, beds: 3, more: [{ level: 9, price: 400 }, { level: 14, price: 900 }, { level: 20, price: 2000 }], max: { carrot: 30, straw: 30, pump: 10 }, eggAt: [20, 50], eggSpread: 10 };
export const bedsMost = level => GARDEN.beds + GARDEN.more.filter(m => level >= m.level).length;
export const CROPS = {
  carrot: { grow: 1 * 3600e3, seed: 5, n: 6, xp: 1, treat: 3, eggs: 1, exp: 0, e: '🥕' },
  straw: { grow: 3 * 3600e3, seed: 10, n: 6, xp: 2, treat: 3, eggs: 1, exp: 8, e: '🍓' },
  pump: { grow: 8 * 3600e3, seed: 20, n: 2, xp: 4, treat: 2, eggs: 2, exp: 8, e: '🎃' },
};
export const CROP_IDS = Object.keys(CROPS);
// a treat's extra egg k from a hen: 20 or 50 minutes after it (and a few minutes of her own)
export const treatEggAt = (t, henId, k) => Math.round(t + (GARDEN.eggAt[k] + GARDEN.eggSpread * hash01('treat|' + henId + '|' + t + '|' + k)) * 60e3);
export const huntPay = streak => { const k = Math.min(HUNT.week, Math.max(1, streak)); return { coins: HUNT.coins + HUNT.coinsDay * k, xp: HUNT.xp + HUNT.xpDay * k }; };          // (the tin's worms, the sack's grain, half again in coins)
// ---- the peacock's feathers (Audrey, 1 Nov: "His dropped feathers (Recommended)"): now and then (one every 12 hours) he
// drops a feather from his train in his yard, three lying there at most; a tap on one: picked up and sold, a fine one
export const FEATHERS = { every: 12 * 3600e3, max: 3, price: 40, xp: 5 };
// ---- the Glutton's apples (6 Nov 2026, Audrey: "Do we still have the apple trees for the gloutons chickens?"; then "Yes,
// with the apple egg", as in the Unity version; then "I'd like the tree outside the coop as the gluton escape to eat"): a
// little apple tree in a tub just outside a chicken coop's pen, on one side of it (side: 'l' or 'r', where there's room:
// main.js), planted the first time a Glutton hen lives there, kept after (it moves with the coop). An apple ripens on it every 3 hours, 4 at most (also while the game's
// closed); while you watch, now and then she hops up, knocks one down and eats it; after two, she lays an apple egg by the
// tree (not while one's waiting there): a tap, and it's sold for 3 of her breed's eggs
// (11 Nov 2026, Audrey: the tree "Grows, and gives more": it holds one more apple from Snug, tier 2, and one more at Deluxe, tier 4)
const appleMost = tier => APPLES.max + (tier >= 2 ? 1 : 0) + (tier >= 4 ? 1 : 0);
export const APPLES = { every: 3 * 3600e3, max: 4, first: 2, perEgg: 2, eggs: 3, xp: 3 };
// ---- fishing (release 5; game-plan-v2.md §8; Audrey, 28 Oct: the fish "Perfect, carry on"; the legendary ones "Photo,
// then let go", "and on top of that each time the farmer fishes a new breed of fish he is happy and does a little
// celebration"): the pond from level 3 (2 since 7 Nov 2026), the river from level 8, seven fish in each (four common, two rare, one legendary
// with a name), drawn by weight (w, out of 100 in each water). A worm a cast: found by the chickens who love the farmer
// (Audrey, 28 Oct: "that would be cute if the chickens get them to the farmer up to 3 a day per chicken if the chicken loves
// the farmer and the farmer goes and asks for it"; then "Replace them", "1, 2 or 3 by love", "One visit, all her worms"):
// Friendly 1 a day, Trusting 2, Best friend 3, all given in one visit; more in tins of ten. (Before: 4 free each morning,
// oldFree: what an older save may still hold of them, kept as worms.)
// A fish caught goes live to the village's aquarium shop (sold there and then, its price a little more the bigger it is);
// a legendary one has its photo taken and goes back into the water (the village paper buys the photo). XP for each, more
// for a fish new to you. Your count and your biggest of each kept (the Breed Book's fish pages)
export const FISHING = { pond: 2, river: 8, byTrust: [0, 1, 2, 3], oldFree: 4, tin: { n: 10, price: 60 }, box: 12, net: 60, maxWorms: 999, firstXp: 10, gift: 10 };      // (the pond at 2 since 7 Nov 2026, Audrey: "fishing should be quickly available", "Level 2"; gift: a tin of worms to start with, once)
// (9 Nov 2026 night, Audrey: "It needs to take time to fish all the different species", "Introduce more fish species"; her
// choices "Time of day + one tin a day", "Keep net, sell at the end"): twenty fish, ten a water: six common, three rare,
// one legendary. when: the hours a rare one bites ([from, to), the game's clock: early morning or evening); a legendary one
// only once every other fish of its water has been caught. One tin of worms a day (FISHING.tin, the bag's `tin`: the day
// it was bought). A catch goes into the keep net (the bag's `net`), sold at the end of the trip, or kept in the fish box
// (`box`, FISHING.box at most) for the villagers' orders
export const FISH_RULES = {
  rudd: { water: 'pond', rare: 0, w: 22, price: 9, xp: 1, cm: [15, 30] }, roach: { water: 'pond', rare: 0, w: 24, price: 8, xp: 1, cm: [12, 25] },
  perch: { water: 'pond', rare: 0, w: 16, price: 11, xp: 1, cm: [15, 35] }, tench: { water: 'pond', rare: 0, w: 11, price: 14, xp: 2, cm: [20, 45] },
  bream: { water: 'pond', rare: 0, w: 12, price: 13, xp: 2, cm: [25, 50] }, crucian: { water: 'pond', rare: 0, w: 13, price: 12, xp: 1, cm: [12, 30] },
  golden_tench: { water: 'pond', rare: 1, w: 7, price: 70, xp: 6, cm: [20, 40], when: [6, 10] }, koi: { water: 'pond', rare: 1, w: 6, price: 90, xp: 6, cm: [30, 60], when: [17, 22] },
  sunfish: { water: 'pond', rare: 1, w: 7, price: 60, xp: 6, cm: [8, 18], when: [11, 15] },
  big_bertha: { water: 'pond', rare: 2, w: 2.5, price: 300, xp: 25, cm: [85, 95] },
  minnow: { water: 'river', rare: 0, w: 24, price: 6, xp: 1, cm: [5, 10] }, gudgeon: { water: 'river', rare: 0, w: 20, price: 8, xp: 1, cm: [8, 15] },
  dace: { water: 'river', rare: 0, w: 18, price: 10, xp: 1, cm: [15, 25] }, chub: { water: 'river', rare: 0, w: 11, price: 15, xp: 2, cm: [30, 50] },
  bleak: { water: 'river', rare: 0, w: 16, price: 7, xp: 1, cm: [8, 15] }, barbel: { water: 'river', rare: 0, w: 9, price: 18, xp: 2, cm: [35, 70] },
  brown_trout: { water: 'river', rare: 1, w: 7, price: 80, xp: 6, cm: [25, 50], when: [6, 10] }, grayling: { water: 'river', rare: 1, w: 6, price: 90, xp: 6, cm: [25, 45], when: [17, 22] },
  rainbow_trout: { water: 'river', rare: 1, w: 7, price: 70, xp: 6, cm: [25, 55], when: [11, 15] },
  old_snapjaw: { water: 'river', rare: 2, w: 2.5, price: 400, xp: 25, cm: [100, 110] },
};
export const FISH_IDS = Object.keys(FISH_RULES);
export const fishLevel = id => FISHING[FISH_RULES[id].water];
// a fish's price for its size (a legendary one: the photo's fixed price)
export function fishPrice(id, cm) { const R = FISH_RULES[id]; return R.rare === 2 ? R.price : Math.round(R.price * (0.8 + 0.4 * (cm - R.cm[0]) / (R.cm[1] - R.cm[0]))); }
// ---- the first day's guide (release 1 step 10; Audrey: "Scenes from the 3D farm" for the pictures before it): five
// little things to do on a new farm, one at a time, each a few coins; the last a bonus
export const GUIDE = ['eggs', 'cuddle', 'sow', 'jobs', 'shop'];
export const GUIDE_COINS = 10, GUIDE_BONUS = 30, GUIDE_XP = 5, GUIDE_XP_BONUS = 10;      // (XP since 7 Nov 2026: level 2 during it, 3 by its end)
// ---- seasonal dresses for the coops (release 4; Audrey, 27 Oct: seasonal coops, "The next one will be Christmas and should
// only be a dress for any coop", "In season, kept forever (Recommended)", "1,500 coins (Recommended)", "1 Dec to 6 Jan
// (Recommended)"): on sale in the farm shop in its season (from..to, month and day on the phone's own calendar, both
// days in), or won (a first place at the County show or the National Championship judged in its season); then yours for
// good: put on any coop, or taken off, from its card, any time of year. What it looks like: main.js coopParts
export const DRESSES = { xmas: { price: 1500, from: [12, 1], to: [1, 6] } };
export const dressXp = id => Math.round(DRESSES[id].price / 50);
export function inSeason(id, now = Date.now()) {
  const D = DRESSES[id]; if (!D) return false;
  const d = new Date(now), k = (d.getMonth() + 1) * 100 + d.getDate(), a = D.from[0] * 100 + D.from[1], b = D.to[0] * 100 + D.to[1];
  return a <= b ? k >= a && k <= b : k >= a || k <= b;         // (Christmas runs over the new year)
}
// the farmer's outfits (the 2D game's six; the classic one from the start): bought from their level, worn one at a time
export const OUTFITS = { classic: { level: 1, price: 0 }, market: { level: 5, price: 1200 }, garden: { level: 9, price: 3500 }, winter: { level: 12, price: 6000 }, rodeo: { level: 15, price: 10000 }, show: { level: 18, price: 16000 } };
export const outfitXp = id => Math.round(OUTFITS[id].price / 50);

// ---- the farm code (release 1 step 9g; the 2D game's, made the new game's own): the whole save as it's kept on the phone
// (the farm and its seal), packed small (gzip where the phone can), to copy into Notes and paste into the game on another
// phone or after clearing Safari. FF3- packed, FF2- plain (the first game's are FF0-/FF1-). Loading one goes the way every
// save does: written as it came, then checked when the farm opens, and an edited one flagged like any other
const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
async function squeeze(bytes, how) {
  const cs = how === 'in' ? new CompressionStream('gzip') : new DecompressionStream('gzip');
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(cs)).arrayBuffer());
}
export async function makeFarmCode(raw) {
  const bytes = new TextEncoder().encode(JSON.stringify(raw));
  if (typeof CompressionStream === 'function') return 'FF3-' + b64(await squeeze(bytes, 'in'));
  return 'FF2-' + b64(bytes);
}
// a pasted code: { raw } (the save, not yet checked), { old: true } (the first game's), or null
export async function readFarmCode(code, now = Date.now()) {
  code = String(code || '').replace(/\s+/g, '');
  if (/^FF[01]-/.test(code)) return { old: true };
  if (code.length < 20 || code.length > 3e6 || !/^FF[23]-[A-Za-z0-9+/=]+$/.test(code)) return null;
  try {
    let bytes = unb64(code.slice(4));
    if (code[2] === '3') { if (typeof DecompressionStream !== 'function') return null; bytes = await squeeze(bytes, 'out'); }
    const raw = JSON.parse(new TextDecoder().decode(bytes));
    if (!raw || typeof raw !== 'object' || !raw.d || typeof raw.d !== 'object' || typeof raw.s !== 'string' || !checkFarm(JSON.parse(JSON.stringify(raw.d)), now)) return null;
    return { raw: { d: raw.d, s: raw.s } };
  } catch (e) { return null; }
}

// ---- names typed by the player: letters, numbers, spaces and a little punctuation, never code
export function cleanName(s, max = 20) {
  if (typeof s !== 'string') return '';
  return s.normalize('NFC').replace(/[\u0000-\u001f\u007f<>&"`\\{}[\]=]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
// every field the save has came through the checks unchanged (fields it didn't have yet, from before a step added them,
// are filled in and don't count as an edit)
// a nest's lay times as saved: whole times, none ahead of now, no more than its eggs (the latest)
function layTimesKept(lt, eggs, now) { const ok = lt.filter(t => Number.isInteger(t) && t > 0 && t <= now); return eggs ? ok.slice(-eggs) : []; }
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
export const EGG_PRICE = { rir: 6, orp: 7, sil: 8, leg: 9, bra: 7, pol: 9, aya: 8, call: 10, pea: 14 };        // coins an egg sells for (the Legbar's blue eggs dear; since 30 Oct the Ayam Cemani's, now early, mid-range)
// XP for each egg collected, a feeder filled from empty, a brood hatched, each grown chick (and for each of its stars), and
// each day's job (base and per level); one place for the balance (balsim.mjs can try others: BAL='{"chick":4}')
export const XPV = { egg: 1, fill: 2, hatch: 2, chick: 3, star: 0.5, job: 3.5, jobL: 0.3 };      // (26 Oct, with the Silkie colours and the rare ones' coops: a year to level 30 once a day still)
// rewards for coming back during the day (Audrey, 26 Oct: "people playing multiple times a day should be rewarded a bit
// more"; "A bit quicker"): fresh eggs, collected within 3 hours of being laid, earn more; a cuddle earns a little each time
// (once her happy glow from the last one has worn off, 6 hours)
export const FRESH = { ms: 3 * 3600e3, xp: 2, cuddle: 1 };
export const FEED_DAYS = 3;                           // a full feeder keeps its birds for three days (a unit a bird a day; two till 10 Nov 2026: a once-a-day player found one empty most days)
// ---- milestones (10 Nov 2026, Audrey: "Milestone is good idea. We should put a few in place. Fishing, but also how many
// chickens loves you with different levels, the harvest, the special eggs found, how many chicks you've had", "Yes plus
// keepsake at star. Add something about rusty, first visit, visit where he got in, visit blocked etc. And add something a
// secret one about the frog and salmon love story. That one needs to be hard to get as witnessing it is rare", "Add one
// about money earnt"): each a number the farm has reached, in steps (bronze, silver, gold, star; some a single one);
// a step reached pays coins and XP when collected (MILE_PAY, by step; `pay` its own), the last one a keepsake too (its
// picture on the Milestones shelf). What's counted: the save's tally (eggs, chicks, wheat, veg, night, coins, fox, foxin,
// foxout, love), or the farm as it stands (fish, friends, golden eggs, orders, rosettes). secret: not named till it's won
export const MILES = {
  fish: { e: '🐟', at: [5, 10, 15, 20] }, friends: { e: '💛', at: [1, 5, 10, 20] }, chicks: { e: '🐣', at: [5, 25, 60, 150] },
  gold: { e: '🥚', at: [5, 20, 50, 100] }, eggs: { e: '🧺', at: [50, 500, 2000, 10000] }, wheat: { e: '🌾', at: [5, 25, 75, 200] },
  veg: { e: '🥕', at: [20, 100, 300, 800] }, orders: { e: '🧁', at: [3, 15, 40, 100] }, ros: { e: '🎀', at: [1, 5, 15, 40] },
  night: { e: '🏮', at: [3, 15, 50, 150] }, coins: { e: '🪙', at: [500, 5000, 25000, 100000] },
  foxfirst: { e: '👀', at: [1], pay: [100, 10] }, foxin: { e: '🙈', at: [1], pay: [100, 10] }, rusty: { e: '🦊', at: [1, 5, 15, 40] },
  love: { e: '💞', at: [1], pay: [500, 50], secret: true },
};
export const MILE_IDS = Object.keys(MILES);
export const MILE_PAY = { coins: [50, 150, 400, 1000], xp: [5, 10, 20, 40] };
const TALLY = ['eggs', 'chicks', 'wheat', 'veg', 'night', 'coins', 'fox', 'foxin', 'foxout', 'love'];
export const NIGHT = { from: 18, xp: 5, coins: 10 };      // (the goodnight round: from dusk, once an evening)
export const DAWN_WORMS = 3;                               // (worms found each morning, once fishing is open)
export const JOBS_BONUS = 5;                               // (worms for all three of the day's jobs done)
// ---- the coops' five looks (release 4; Audrey: "Coops to work on", the Red Barn first; "Look nicer and help a little";
// prices "300 / 1,000 / 3,000 / 8,000"): Rustic (0, a new coop), Mended, Snug (the coops of a farm from before: "Snug:
// nothing changes"), Cosy, Deluxe. Each look helps a little: the eggs (Rustic: the afternoon egg missed one day in three,
// Mended one in six; Snug: two a day; Cosy: an evening egg too one day in four, Deluxe one in two), the chicks' ratings
// (a little lower in a Rustic coop, a little higher in a Cosy or Deluxe one), and a cuddle counting again sooner (Cosy 5
// hours, Deluxe 4, else 6). So far the Red Barn, the Thatched Cottage, the Pagoda and the Stone Cottage have their five looks: the others stay as they were
// (their rustic look new, else the plain one; the eggs, chicks and cuddles of a Snug coop) until theirs are made.
export const COOP_LOOKS = ['rustic', 'mended', 'snug', 'cosy', 'deluxe'];
export const UPGRADE = { price: [0, 300, 1000, 3000, 8000], xp: [0, 8, 20, 45, 100], kids: [-0.2, -0.1, 0, 0.15, 0.3], happyH: [6, 6, 6, 5, 4], skip: [1 / 3, 1 / 6, 0, 0, 0], extra: [0, 0, 0, 0.25, 0.5] };
// each breed's looks came with a version of the save (cv): a farm from before them has that breed's coops Snug (nothing
// changes for it); the Red Barn's first (26 Oct), the Thatched Cottage's (27 Oct), the Pagoda's (27 Oct: every Silkie colour's),
// the Stone Cottage's (27 Oct)
// (release 7's breeds came with their looks: no farm can have one of their coops from before, so nothing to change: 1)
export const LOOKS_CV = { rir: 1, orp: 2, sil: 3, leg: 4, bra: 5, pol: 1, aya: 1, call: 1, pea: 1 }, CV = 5;
export const UPGRADES = Object.keys(LOOKS_CV);
export const lookOf = c => c && UPGRADES.includes(baseBreed(c.breed)) ? c.tier : 2;      // (what a coop's look does: Snug till its looks are made)
export const FEED_PRICE = 2;                          // coins a unit of feed
export const CATCH_UP = 2 * 86400e3;                  // away longer than two days: only the last two count
const DAY_MS = 86400e3;
// ---- chicks (starting values)
export const SIT_MS = 24 * 3600e3, GROW_MS = 52 * 3600e3;          // sitting on her eggs (they hatch the next morning); the chicks growing up (grown at 11 two days on)
export const CHICK_PRICE = { rir: 22, orp: 26, sil: 30, leg: 28, bra: 26, pol: 30, aya: 28, call: 32, pea: 45 };   // coins for each grown chick
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
// her lays that day in a coop of look lk (UPGRADE): now and then no afternoon egg in a Rustic or Mended coop, now and then
// an evening one too (19:30 to 21:00) in a Cosy or Deluxe one
function lookLays(henId, day, lk, silkie) {
  const T = layTimes(henId, day).slice(silkie ? 1 : 0), d = new Date(day), key = henId + '|' + d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
  if (UPGRADE.skip[lk] && hash01(key + '|skip') < UPGRADE.skip[lk]) T.pop();
  if (UPGRADE.extra[lk] && hash01(key + '|extra') < UPGRADE.extra[lk]) { const h = 19.5 + 1.5 * hash01(key + '|eve'); T.push(new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(h), Math.round((h % 1) * 60)).getTime()); }
  return T;
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
  out.lang = langOk(d.lang);                                      // (a language the game speaks; else English)
  if (d.music === false) out.music = false;                       // (the music switched off in the settings; on unless)
  if (d.sounds === false) out.sounds = false;                     // (the farm's sounds switched off; on unless)
  if (d.acctAsk === 1) out.acctAsk = 1;                            // (My account suggested once, a few days in: account.js nudgeDue)
  out.coins = int(d.coins, 0, 1e9, 0);
  out.xp = int(d.xp, 0, 1e9, 0);
  if (Number.isInteger(d.cv) && d.cv >= 1 && d.cv <= CV) out.cv = d.cv;      // (which breeds' looks the farm has had: load() makes the coops of later ones Snug)
  const look = d.farmer && d.farmer.look === 'f' ? 'f' : 'm';
  out.farmer = { look, name: cleanName(d.farmer && d.farmer.name) };
  // the outfits bought (known ones, once each, from their level) and the one worn (one bought, or the classic)
  const fo = d.farmer && Array.isArray(d.farmer.outfits) ? d.farmer.outfits.filter((x, i, a) => OUTFITS[x] && x !== 'classic' && a.indexOf(x) === i && levelOf(out.xp) >= OUTFITS[x].level) : [];
  if (fo.length) { out.farmer.outfits = fo; out.farmer.outfit = fo.includes(d.farmer.outfit) ? d.farmer.outfit : 'classic'; }
  // the land: the first fields in order, at most one a level (a farm's own purchases never go further)
  const land = Array.isArray(d.land) ? d.land : [];
  out.land = Array.from({ length: Math.max(1, Math.min(land.length, levelOf(out.xp), FIELDS)) }, (_, i) => i);
  out.lvSeen = int(d.lvSeen, 1, levelOf(out.xp), levelOf(out.xp));            // (the last level-up card shown; before step 5: none owed)
  out.coops = [];
  const seen = new Set();
  const dresses = Array.isArray(d.dresses) ? d.dresses.filter((x, i, a) => typeof x === 'string' && DRESSES[x] && a.indexOf(x) === i) : [];       // (the seasonal dresses owned: known ones, once each)
  for (const c of Array.isArray(d.coops) ? d.coops.slice(0, 40) : []) {
    if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !/^c\d{1,4}$/.test(c.id) || seen.has(c.id)) continue;
    if (!BREED_INFO[c.breed] || levelOf(out.xp) < (BREED_INFO[c.breed].rare ? breedCame('sil') : breedCame(c.breed)) || out.coops.some(o => o.breed === c.breed)) continue;      // (a breed's coop once it's come (by this order or the one before), one each; a rare colour's once the Silkies have)
    seen.add(c.id);
    // where it stands (a farm from before coops could be moved: on the village's first plot, the home field's coop; the
    // farm (main.js) then makes sure it's on the farm's own land, clear of everything, and nowhere near another coop)
    const x = spotNum(c.x), z = spotNum(c.z), deg = [0, 90, 180, 270].includes(c.deg) ? c.deg : null, at = x === null || z === null || deg === null ? HOME_COOP : { x, z, deg };
    out.coops.push({ id: c.id, breed: c.breed, tier: int(c.tier, 0, 4, 0), x: at.x, z: at.z, deg: at.deg, ...(Number.isInteger(c.plot) ? { plot: c.plot } : {}), name: cleanName(c.name, 24),
      eggs: int(c.eggs, 0, NEST_MAX, 0), bonus: 0, feed: Number.isFinite(c.feed) ? c.feed : null, fedAt: int(c.fedAt, 0, now, now),
      brood: c.brood && typeof c.brood === 'object' ? { hen: String(c.brood.hen), start: int(c.brood.start, 0, now, now), n: int(c.brood.n, 1, 4, 2), hatched: c.brood.hatched === true,
        kids: Array.isArray(c.brood.kids) ? c.brood.kids.slice(0, 4).map((k, i) => ({ sex: k && k.sex === 'r' ? 'r' : 'h', stars: int(k && k.stars, 1, 5, 1),
          ...(k && k.rare && ((rareFrom(c.breed, k.rare) && hash01(String(c.brood.hen) + '|' + c.brood.start + '|' + i + '|rare') < rareMost()) || (k.rare === c.breed && RARE_LINES.includes(c.breed))) ? { rare: k.rare } : {}) })) : null } : null,      // (a rare one: only its own colour's, only where the luck could have given it)
      lastBrood: int(c.lastBrood, 0, now, 0), checked: int(c.checked, 0, now, now),
      ...(typeof c.shut === 'string' && /^\d{8}$/.test(c.shut) && c.shut <= nightKey(now + TZ_SLACK) ? { shut: c.shut } : {}),      // (its pop door shut for that night)
      ...(typeof c.dress === 'string' && dresses.includes(c.dress) ? { dress: c.dress } : {}),      // (a seasonal dress it wears: one owned)
      ...(Array.isArray(c.lt) ? { lt: layTimesKept(c.lt, int(c.eggs, 0, NEST_MAX, 0), now) } : {}),      // (when its eggs were laid: fresh ones earn more)
      ...(c.breed === 'pea' ? { fe: { n: int(c.fe && c.fe.n, 0, FEATHERS.max, 0), at: int(c.fe && c.fe.at, 0, now, now) } } : {}),      // (the peacock's feathers lying in his yard, and when the last one came: never ahead of now)
      ...(c.ap && typeof c.ap === 'object' && !kindOf(c.breed) ? { ap: { n: int(c.ap.n, 0, appleMost(int(c.tier, 0, 4, 0)), 0), at: int(c.ap.at, 0, now, now), ate: c.ap.egg === true ? 0 : int(c.ap.ate, 0, APPLES.perEgg - 1, 0), egg: c.ap.egg === true,
        ...(c.ap.side === 'l' || c.ap.side === 'r' ? { side: c.ap.side } : {}) } } : {}) });      // (a chicken coop's apple tree: its apples then and when the last one ripened (never ahead of now), the apples eaten towards the next egg (none while one's waiting), an apple egg waiting, which side of the pen it stands)      // (the peacock's feathers lying in his yard, and when the last one came: never ahead of now)
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
    nb.happy = int(b.happy, 0, now + HAPPY_MS, 0);                     // (happy after a cuddle till then: at most 6 hours on)
    if (typeof b.worm === 'string' && /^\d{8}$/.test(b.worm) && b.worm <= dayKey(now + TZ_SLACK)) nb.worm = b.worm;      // (the day she last found worms for the farmer: never ahead of today)
    // her rosettes (1st, 2nd, 3rd at the Village, County and National): a show a day at most since she came
    const most = Math.floor((now - nb.since) / DAY_MS) + 1, ros = Array.isArray(b.ros) && b.ros.length === 9 && b.ros.every(n => Number.isInteger(n) && n >= 0) ? b.ros : null;
    nb.ros = ros && ros.reduce((a, n) => a + n, 0) <= most ? ros.slice() : [0, 0, 0, 0, 0, 0, 0, 0, 0];
    out.birds.push(nb);
  }
  // the eggs' star bonus (a coin an egg for each star of the hen who laid it): at most five stars' worth for each egg
  for (const c of out.coops) { const raw = (Array.isArray(d.coops) ? d.coops : []).find(x => x && x.id === c.id); c.bonus = int(raw && raw.bonus, 0, c.eggs * MAX_STARS, 0); }
  // each feeder holds at most two days for the birds it feeds (missing: full, as for a farm from before feeders)
  for (const c of out.coops) { const cap = Math.max(1, out.birds.filter(b => b.coop === c.id).length) * FEED_DAYS; c.feed = c.feed === null ? cap : num(c.feed, 0, cap, cap); }
  // a brood: one of the coop's own hens, hatched only once its time has come
  for (const c of out.coops) if (c.brood && (!out.birds.some(b => b.id === c.brood.hen && b.sex === 'h' && b.coop === c.id) || (c.brood.hatched && c.brood.start + SIT_MS > now))) c.brood = null;
  // the trees, bushes and rocks cleared where a coop was put (each once; the village's own: t12, b40, r3)
  out.cleared = (Array.isArray(d.cleared) ? d.cleared : []).filter((k, i, a) => typeof k === 'string' && /^[tbr]\d{1,4}$/.test(k) && a.indexOf(k) === i).slice(0, 400);
  out.next = int(d.next, 1, 99999, 1);
  for (const x of [...out.coops, ...out.birds]) out.next = Math.max(out.next, parseInt(x.id.slice(1), 10) + 1);
  const f = d.first, fh = f && typeof f === 'object' ? out.birds.find(b => b.id === f.hen && b.sex === 'h') : null;
  out.first = fh ? { hen: fh.id, t: int(f.t, 0, now + DAY_MS, now) } : null;
  // the news waiting to be shown: grown youngsters gone to a new farm (the congratulations card)
  out.news = (Array.isArray(d.news) ? d.news : []).slice(-6).filter(n => n && typeof n === 'object' && n.type === 'grown' && out.birds.some(b => b.id === n.hen)).map(n => ({
    type: 'grown', coop: String(n.coop).slice(0, 8), hen: String(n.hen).slice(0, 8), dad: String(n.dad || '').slice(0, 8),
    kids: (Array.isArray(n.kids) ? n.kids : []).slice(0, 4).map(k => ({ sex: k && k.sex === 'r' ? 'r' : 'h', stars: int(k && k.stars, 1, 5, 1), coins: int(k && k.coins, 0, 1000, 0),
      ...(k && RARE_LINES.includes(k.rare) ? { rare: k.rare } : {}), ...(k && k.rare && typeof k.wait === 'string' && /^b\d{1,5}$/.test(k.wait) ? { wait: k.wait } : {}), ...(k && k.rare && k.full === true ? { full: true } : {}) })),
    coins: int(n.coins, 0, 4000, 0), xp: int(n.xp, 0, 4000, 0), t: int(n.t, 0, now, now), seen: n.seen === true }));
  // the shows: the birds entered (a show open when she was entered, of a tier the level allows, the breed it's for; one a
  // show, a show at a time for each bird) and the results waiting to be seen (each as the show's own numbers make it)
  const sh = d.shows && typeof d.shows === 'object' ? d.shows : {}, L = levelOf(out.xp);
  out.shows = { in: [], res: [], seen: typeof sh.seen === 'string' && /^\d{8}$/.test(sh.seen) ? sh.seen : '' };
  for (const e of Array.isArray(sh.in) ? sh.in.slice(0, 3) : []) {
    if (!e || typeof e.id !== 'string' || !showDay(e.id) || typeof e.bird !== 'string') continue;
    const T = SHOWS[e.id[0]], b = out.birds.find(x => x.id === e.bird), at = int(e.at, 0, now, -1), breed = showBreed(e.id);
    if (!b || L < T.level || at < showOpens(e.id) - TZ_SLACK || at >= showJudged(e.id) + TZ_SLACK || at < b.since || (breed && baseBreed(b.breed) !== breed)) continue;      // (a phone taken across time zones: a little slack)
    if (out.shows.in.some(x => x.id === e.id || x.bird === e.bird)) continue;
    out.shows.in.push({ id: e.id, bird: e.bird, at });
  }
  for (const r of Array.isArray(sh.res) ? sh.res.slice(-6) : []) {
    if (!r || typeof r.id !== 'string' || !showDay(r.id) || !out.birds.some(x => x.id === r.bird)) continue;
    const T = SHOWS[r.id[0]], of = T.rivals + 1, place = int(r.place, 1, of, of), t = int(r.t, 0, now, -1);
    if (t < 0 || Math.abs(t - showJudged(r.id)) > TZ_SLACK) continue;
    const O = SHOWS_25OCT[r.id[0]], was = place <= 3 && r.coins === O.prize[place - 1] && r.xp === XP_SHOW + O.xp[place - 1];
    const won = typeof r.dress === 'string' && DRESSES[r.dress] && place === 1 && r.id[0] !== 'v' && inSeason(r.dress, t) && dresses.includes(r.dress);      // (a dress won with it)
    out.shows.res.push({ id: r.id, bird: r.bird, place, of, coins: place <= 3 ? (was ? O : T).prize[place - 1] : 0, xp: XP_SHOW + (place <= 3 ? (was ? O : T).xp[place - 1] : 0), t, seen: r.seen === true, ...(won ? { dress: r.dress } : {}) });
  }
  // the decorations bought: each known one once, from its level, where it stands (on the quarter-metre; the duck house on the
  // pond, no spot); the farm (main.js) then makes sure each stands where one can
  out.decor = [];
  for (const x of Array.isArray(d.decor) ? d.decor.slice(0, 8) : []) {
    if (!x || !DECOR[x.id] || out.decor.some(o => o.id === x.id) || L < DECOR[x.id].level) continue;
    const X = spotNum(x.x), Z = spotNum(x.z);
    out.decor.push(DECOR[x.id].pond ? { id: x.id } : { id: x.id, x: X === null ? null : X, z: Z === null ? null : Z });
  }
  // the guardians bought (release 3): each known one from its level, when it came (never ahead of now)
  if (d.animals && typeof d.animals === 'object' && !Array.isArray(d.animals)) {
    out.animals = {};
    for (const id of Object.keys(ANIMALS)) {
      const a = d.animals[id];
      if (!a || typeof a !== 'object' || L < ANIMALS[id].level || !Number.isFinite(a.at) || a.at <= 0) continue;
      out.animals[id] = { at: Math.min(a.at, now) };
      if (ANIMALS[id].kennel) Object.assign(out.animals[id], { name: cleanName(a.name) || DOG_NAME, x: spotNum(a.x), z: spotNum(a.z) });
      if (id === 'geese') {                            // their trust: a visit a day at most since they came, on a day from then to now
        const G = out.animals.geese, days = Math.floor((now + TZ_SLACK - G.at) / DAY_MS) + 2, n = Number.isInteger(a.trust) ? Math.max(0, Math.min(GEESE_TRUST.at[3], days, a.trust)) : 0;
        const day = typeof a.day === 'string' && /^\d{8}$/.test(a.day) && a.day >= dayKey(G.at - TZ_SLACK) && a.day <= dayKey(now + TZ_SLACK) ? a.day : null;
        if (n > 0 && day) { G.trust = n; G.day = day; }
        const h = n >= GEESE_TRUST.at[3] && day ? int(a.happy, 0, now + HAPPY_MS, 0) : 0;      // (happy after a cuddle: friends only, at most 6 hours on)
        if (h) G.happy = h;
      }      // (his name as any name; his kennel on the quarter-metre: the farm puts it where it can stand)
    }
  }
  // the wheat field: where it is (the farm puts it on your land when it has no spot), which way it lies, when it's ripe
  // (0: not sown; never further ahead than it takes to grow); the grain in store
  out.dresses = dresses;                             // (the seasonal dresses owned: after the decorations, as a new farm has them)
  const wh = d.wheat && typeof d.wheat === 'object' ? d.wheat : {};
  out.wheat = { x: spotNum(wh.x), z: spotNum(wh.z), deg: [0, 45, 90, 135].includes(wh.deg) ? wh.deg : 45, ripe: Number.isFinite(wh.ripe) && wh.ripe > 0 ? Math.min(wh.ripe, now + WHEAT.grow) : 0 };
  // (the second field, bought: only from its level; checked as the first)
  const wh2 = d.wheat2 && typeof d.wheat2 === 'object' ? d.wheat2 : null;
  if (wh2 && levelOf(out.xp) >= WHEAT.second.level) out.wheat2 = { x: spotNum(wh2.x), z: spotNum(wh2.z), deg: [0, 90].includes(wh2.deg) ? wh2.deg : 0, ripe: Number.isFinite(wh2.ripe) && wh2.ripe > 0 ? Math.min(wh2.ripe, now + WHEAT.grow) : 0 };
  out.grain = Math.round(num(d.grain, 0, shelfSize('grain', levelOf(out.xp), d.shelves === true), 0) * 100) / 100;
  // the pantry's eggs and honey (whole numbers, no more than a shelf can ever hold; the eggs' worth no more than eggs can fetch), the bigger shelves bought
  { const pn = d.pantry && typeof d.pantry === 'object' ? d.pantry : {}, eggs = int(pn.eggs, 0, shelfSize('eggs', levelOf(out.xp), d.shelves === true), 0);
    out.pantry = { eggs, val: int(pn.val, 0, eggs * PANTRY.eggMax, 0), honey: int(pn.honey, 0, shelfSize('honey', levelOf(out.xp), d.shelves === true), 0) }; if (pn.seen === true) out.pantry.seen = true; }
  if (d.shelves === true) out.shelves = true;
  // when the farm was last open (for the welcome-back summary): never ahead of now
  out.lastSeen = Number.isFinite(d.lastSeen) && d.lastSeen > 0 ? Math.min(d.lastSeen, now) : now;
  // the first day's guide: the step reached, done or not (a farm from before it: done)
  const gd = d.guide && typeof d.guide === 'object' ? d.guide : null;
  out.guide = gd ? { step: int(gd.step, 0, GUIDE.length, 0), done: gd.done === true || int(gd.step, 0, GUIDE.length, 0) >= GUIDE.length } : { step: GUIDE.length, done: true };
  // the day's jobs: a day not ahead of today, set at a level the farm has had, the jobs that day's numbers give, each
  // done at most as far as its target and paid only once done
  const jb = d.jobs && typeof d.jobs === 'object' ? d.jobs : null;
  if (jb && typeof jb.day === 'string' && /^\d{8}$/.test(jb.day) && jb.day <= dayKey(now) && Number.isInteger(jb.lv) && jb.lv >= 1 && jb.lv <= L && Array.isArray(jb.list)) {
    const want = jobsFor(jb.day, jb.lv);
    out.jobs = { day: jb.day, lv: jb.lv, seen: jb.seen === true, list: want.map((w, i) => { const r = jb.list[i] || {}, got = r.k === w.k ? int(r.got, 0, w.n, 0) : 0; return { k: w.k, n: w.n, got, paid: r.paid === true && got >= w.n }; }) };
    if (jb.bonus === true && out.jobs.list.every(j => j.paid)) out.jobs.bonus = true;      // (the worms for all three done: given)
  } else out.jobs = null;
  if (!('first' in d)) {                             // a farm from before eggs: its good mum's first egg too
    const mum = out.birds.find(b => b.pers === 'mum') || out.birds.find(b => b.sex === 'h');
    if (mum) out.first = { hen: mum.id, t: firstEggAt(now) };
  }
  // the honey (only with the beehives): the jars waiting, and when the last one came (never ahead of now)
  if (out.decor.some(o => o.id === 'beehives')) {
    const hn = d.honey && typeof d.honey === 'object' ? d.honey : {};
    out.honey = { n: int(hn.n, 0, HONEY.max, 0), at: Number.isFinite(hn.at) ? Math.min(hn.at, now) : now };
  }
  // Rusty's visits (release 3): the last night looked at (never ahead of now), and the last visit: a night he could have
  // come, a coop of the farm's, the door open or shut, chased off only by animals the farm had then, eggs only from an open
  // door nobody guarded, at most a nest's
  const fx = d.fox && typeof d.fox === 'object' ? d.fox : null;
  out.fox = { seen: fx && typeof fx.seen === 'string' && /^\d{8}$/.test(fx.seen) && fx.seen <= nightKey(now + TZ_SLACK) ? fx.seen : foxSeenFrom(now) };      // (a phone taken across time zones: a little slack)
  const fl = fx && fx.last && typeof fx.last === 'object' ? fx.last : null;
  if (fl && typeof fl.key === 'string' && /^\d{8}$/.test(fl.key) && fl.key <= out.fox.seen && (foxNight(fl.key) || doorStuck(out.coops.find(c => c.id === fl.coop), fl.key)) && Number.isInteger(fl.t) && Math.abs(fl.t - foxAt(fl.key)) <= TZ_SLACK && fl.t <= now + TZ_SLACK && out.coops.some(c => c.id === fl.coop)) {
    const by = ['geese', 'dog', 'team', 'farmer'].includes(fl.by) && fl.open === true && (fl.by === 'farmer' || (fl.by === 'dog' ? out.animals && out.animals.dog : fl.by === 'geese' ? out.animals && out.animals.geese : out.animals && out.animals.geese && out.animals.dog)) ? fl.by : null;
    out.fox.last = { key: fl.key, t: fl.t, coop: fl.coop, open: fl.open === true, by, eggs: fl.open === true && !by ? int(fl.eggs, 0, NEST_MAX, 0) : 0, hen: cleanName(fl.hen) || HEN_NAMES[0], seen: fl.seen === true, watched: fl.watched === true };
    if (fl.stuck === true && fl.open === true && doorStuck(out.coops.find(c => c.id === fl.coop), fl.key)) out.fox.last.stuck = true;      // (its automatic door stuck open that night)
  }
  // rare babies (release 2 step 2): those waiting for your choice (each from a Silkie coop of the colour it comes from) and
  // those kept, in the basket by the farmhouse fire (rare colours only); at most a rooster and two hens of each colour
  const taken = new Set([...out.coops, ...out.birds].map(x => x.id)), room = (line, sex) => [...(out.basket || []), ...out.birds, ...(out.rare || [])].filter(b => (b.line || b.breed) === line && b.sex === sex).length < (sex === 'r' ? 1 : 2);
  if (Array.isArray(d.rare)) {
    out.rare = [];
    for (const e of d.rare.slice(0, RARE.pending)) {
      const coop = e && out.coops.find(c => c.id === e.coop), sex = e && (e.sex === 'r' ? 'r' : e.sex === 'h' ? 'h' : null);
      if (!coop || !sex || typeof e.id !== 'string' || !/^b\d{1,5}$/.test(e.id) || taken.has(e.id) || (!rareFrom(coop.breed, e.line) && e.line !== coop.breed) || !RARE_LINES.includes(e.line) || !room(e.line, sex)) continue;
      taken.add(e.id);
      out.rare.push({ id: e.id, line: e.line, sex, stars: int(e.stars, 1, 5, 1), coop: coop.id, i: int(e.i, 0, 3, 0), mum: String(e.mum).slice(0, 8), t: int(e.t, 0, now, now) });
    }
  }
  if (Array.isArray(d.basket)) {
    out.basket = [];
    for (const b of d.basket.slice(0, RARE.basket)) {
      const sex = b && (b.sex === 'r' ? 'r' : b.sex === 'h' ? 'h' : null);
      if (!sex || typeof b.id !== 'string' || !/^b\d{1,5}$/.test(b.id) || taken.has(b.id) || !RARE_LINES.includes(b.breed) || !room(b.breed, sex)) continue;
      taken.add(b.id);
      const since = int(b.since, 0, now, now), most = Math.floor((now - since) / DAY_MS) + 1, ros = Array.isArray(b.ros) && b.ros.length === 9 && b.ros.every(n => Number.isInteger(n) && n >= 0) ? b.ros : null;
      out.basket.push({ id: b.id, name: cleanName(b.name) || (sex === 'r' ? ROO_NAMES[0] : HEN_NAMES[0]), sex, breed: b.breed, pers: PERS.includes(b.pers) && !(b.pers === 'mum' && sex === 'r') ? b.pers : (sex === 'r' ? 'brave' : 'diva'),
        since, exp: int(b.exp, 0, 1e7, 0), trust: int(b.trust, 0, 15, 0), happy: int(b.happy, 0, now + HAPPY_MS, 0), ros: ros && ros.reduce((a, n) => a + n, 0) <= most ? ros.slice() : [0, 0, 0, 0, 0, 0, 0, 0, 0] });
    }
  }
  for (const x of [...(out.rare || []), ...(out.basket || [])]) out.next = Math.max(out.next, parseInt(x.id.slice(1), 10) + 1);
  // fishing (release 5): the worms (found by the chickens or from tins; at most a bag's), and of each fish caught (known
  // fish only, from a water the farm's level has opened): how many and the biggest (within its sizes). A farm saved while
  // there were free worms each morning: the day they were given (never ahead of today) and those left (at most a day's),
  // checked as they were, then kept as worms (load)
  const fs = d.fish && typeof d.fish === 'object' ? d.fish : null;
  if (fs) {
    const got = {}, raw = fs.got && typeof fs.got === 'object' ? fs.got : {};
    for (const id of FISH_IDS) {
      const g = raw[id], R = FISH_RULES[id];
      if (Array.isArray(g) && g.length === 2 && Number.isInteger(g[0]) && g[0] >= 1 && g[0] <= 1e6 && Number.isInteger(g[1]) && g[1] >= R.cm[0] && g[1] <= R.cm[1] && L >= fishLevel(id)) got[id] = [g[0], g[1]];
    }
    out.fish = { worms: int(fs.worms, 0, FISHING.maxWorms, 0), got, ...(fs.gift === true ? { gift: true } : {}) };      // (gift: the starting tin given)
    // the keep net and the fish box: known fish (never a legendary one) of an open water, each a size of its own kind's, no
    // more than the net and the box hold; the day the last tin was bought: never ahead of today
    const fishList = (raw, max) => (Array.isArray(raw) ? raw : []).filter(q => Array.isArray(q) && q.length === 2 && typeof q[0] === 'string' && Object.prototype.hasOwnProperty.call(FISH_RULES, q[0]) && FISH_RULES[q[0]].rare < 2 && L >= fishLevel(q[0]) && Number.isInteger(q[1]) && q[1] >= FISH_RULES[q[0]].cm[0] && q[1] <= FISH_RULES[q[0]].cm[1]).slice(0, max).map(q => [q[0], q[1]]);
    const net = fishList(fs.net, FISHING.net), box = fishList(fs.box, shelfSize('fish', levelOf(out.xp), d.shelves === true));
    if (net.length) out.fish.net = net; if (box.length) out.fish.box = box;
    if (typeof fs.dawn === 'string' && /^\d{8}$/.test(fs.dawn) && fs.dawn <= dayKey(now + TZ_SLACK)) out.fish.dawn = fs.dawn;      // (the morning's worms: the day they were last found)
    if (typeof fs.tin === 'string' && /^\d{8}$/.test(fs.tin) && fs.tin <= dayKey(now + TZ_SLACK)) out.fish.tin = fs.tin;
    if ('day' in fs || 'free' in fs) { out.fish.day = typeof fs.day === 'string' && /^\d{8}$/.test(fs.day) && fs.day <= dayKey(now + TZ_SLACK) ? fs.day : dayKey(now); out.fish.free = int(fs.free, 0, FISHING.oldFree, 0); }
  }
  // village orders (7 Nov 2026): only once the farm's level has opened them; at most three, each from a known villager
  // (one order each), asking for one or two known things in amounts an order can, what's set aside for it never more than
  // it asks; when the next comes (never further off than one's time); how many have gone
  const od = d.orders && typeof d.orders === 'object' ? d.orders : null;
  if (od && L >= ORDERS.level) {
    const list = [], ids = new Set(), whos = new Set();
    for (const o of Array.isArray(od.list) ? od.list.slice(0, ORDERS.max) : []) {
      if (!o || typeof o !== 'object' || typeof o.id !== 'string' || !/^o\d{1,7}$/.test(o.id) || ids.has(o.id) || !Object.hasOwn(VILLAGERS, o.who) || whos.has(o.who)) continue;
      const items = {}, got = {}, it = o.items && typeof o.items === 'object' ? o.items : {}, gt = o.got && typeof o.got === 'object' ? o.got : {};
      for (const k of ORDER_ITEMS) if (Number.isInteger(it[k]) && it[k] >= 1 && it[k] <= ORDERS.most[k]) items[k] = it[k];
      const n = Object.keys(items).length; if (!n || n > 2) continue;
      for (const k of ['eggs', 'fish', 'honey']) if (items[k] && Number.isInteger(gt[k]) && gt[k] >= 1) got[k] = Math.min(items[k], gt[k]);
      ids.add(o.id); whos.add(o.who); list.push({ id: o.id, who: o.who, t: int(o.t, 0, now + TZ_SLACK, now), items, got });
    }
    const seq = Math.max(int(od.seq, 1, 1e7, 1), ...list.map(o => parseInt(o.id.slice(1), 10) + 1));
    out.orders = { list, next: int(od.next, 0, now + ORDERS.every + TZ_SLACK, 0), seq, done: int(od.done, 0, 1e7, 0) };      // (a clock put back a little: no matter)
  }
  // the daily egg hunt (7 Nov 2026): the day the last golden egg was found (never ahead of today), the days in a row
  // (at least one, never more than found in all), how many in all; only once the farm's level has opened it
  // the milestones (10 Nov 2026): what's been counted (whole numbers, none below zero), the steps collected of each (no
  // more than it has); the evening the last goodnight round was done (never ahead of tonight)
  const ty = d.tally && typeof d.tally === 'object' ? d.tally : null;
  if (ty) { out.tally = {}; for (const k of TALLY) { const v = int(ty[k], 0, 1e9, 0); if (v) out.tally[k] = v; } }
  const ml = d.mile && typeof d.mile === 'object' ? d.mile : null;
  if (ml) { out.mile = {}; for (const id of MILE_IDS) { const v = int(ml[id], 0, MILES[id].at.length, 0); if (v) out.mile[id] = v; } }
  if (typeof d.gn === 'string' && /^\d{8}$/.test(d.gn) && d.gn <= dayKey(now + TZ_SLACK)) out.gn = d.gn;
  const hu = d.hunt && typeof d.hunt === 'object' ? d.hunt : null;
  if (hu && L >= HUNT.level && typeof hu.last === 'string' && /^\d{8}$/.test(hu.last) && hu.last <= dayKey(now + TZ_SLACK)) {
    const n = int(hu.n, 1, 1e6, 1);
    out.hunt = { last: hu.last, streak: int(hu.streak, 1, n, 1), n };
  }
  // the vegetable garden (7 Nov 2026): only once the farm's level has opened it; where it is (as the wheat field; the farm
  // makes sure it's on your land), each bed's crop (one of the three, or none) and when it's ripe (never further off than
  // its crop takes), the basket's vegetables (whole, up to its most)
  const vgd = d.garden && typeof d.garden === 'object' ? d.garden : null;
  if (vgd && L >= GARDEN.level) {
    const gd = vgd, nb = int(Array.isArray(gd.beds) ? gd.beds.length : GARDEN.beds, GARDEN.beds, bedsMost(L), GARDEN.beds), beds = Array.from({ length: nb }, (_, i) =>      // (as many beds as the save has, never more than its level allows)
      { const b = Array.isArray(gd.beds) && gd.beds[i] && typeof gd.beds[i] === 'object' ? gd.beds[i] : null;
      return b && Object.hasOwn(CROPS, b.crop) && Number.isFinite(b.ripe) && b.ripe > 0 ? { crop: b.crop, ripe: int(b.ripe, 1, now + CROPS[b.crop].grow + TZ_SLACK, 1) } : { crop: null, ripe: 0 }; });
    const vg = gd.veg && typeof gd.veg === 'object' ? gd.veg : {}, veg = {};
    for (const k of CROP_IDS) veg[k] = int(vg[k], 0, shelfSize(k, levelOf(out.xp), d.shelves === true), 0);
    out.garden = { x: spotNum(gd.x), z: spotNum(gd.z), deg: [0, 90].includes(gd.deg) ? gd.deg : 0, beds, veg };
    // a coop's last treat (when, which): never ahead of now; none before the garden
    for (const c of out.coops) { const r = (Array.isArray(d.coops) ? d.coops : []).find(o => o && o.id === c.id), tr = r && r.treat;
      if (tr && typeof tr === 'object' && Object.hasOwn(CROPS, tr.crop) && Number.isInteger(tr.t) && tr.t > 0 && tr.t <= now + TZ_SLACK) c.treat = { t: tr.t, crop: tr.crop }; }
  }
  return out;
}

export class Game {
  constructor(store = (() => { try { return window.localStorage; } catch (e) { return null; } })()) {
    this.store = store; this.edited = false; this.listeners = [];
    this.data = this.load();
    this.lang = this.data ? this.data.lang : phoneLang();
  }
  // ---- words
  t(key, vars = {}, sexF = false) {
    const L = this.lang, s = (sexF && TEXT_F[L] && TEXT_F[L][key]) || (TEXT[L] && TEXT[L][key]) || (sexF && TEXT_F.en[key]) || TEXT.en[key] || key;
    return elide(L, s, vars).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  }
  dk(key, kind) { const k = kind === true ? 'duck' : kind; return k && TEXT.en[key + '_' + k] ? key + '_' + k : key; }      // (the call ducks' version of a brood word: ducklings, young ducks and drakes; the peafowl's: peachicks, young peahens and peacocks)
  locale() { return LOCALE[this.lang] || 'en-GB'; }                      // (numbers and dates: "1,250", "1 250", "1.250")
  tr(id, vars) { return tr(this.lang, id, vars); }                       // (a registered pair's word: lang.js)
  // names in a list: "Basil, Margot and Ginger" (Spanish: "y" becomes "e" before an "i" sound: "Clover e Ivy")
  andList(names) {
    if (names.length < 2) return names[0] || '';
    const last = names[names.length - 1]; let and = this.t('and');
    if (this.lang === 'es' && and === 'y' && /^h?[iíIÍ](?![aeouáéóú])/.test(last)) and = 'e';
    return names.slice(0, -1).join(', ') + ' ' + and + ' ' + last;
  }
  // how long, in words: "about 6 hours", "a day", "2 days"
  howLong(ms) {
    const h = ms / 3600e3;
    if (h < 1.5) return this.t('h1');
    if (h < 30) return this.t('hours', { n: Math.round(h) });
    const d = Math.round(h / 24);
    return d <= 1 ? this.t('days1') : this.t('days', { n: d });
  }
  breedName(b) { return tr(this.lang, 'breed.' + b + '.name'); }                  // (a line's: "Black Silkie")
  kindName(b) { return tr(this.lang, 'breed.' + b + (BREED_INFO[b].kind ? '.kind' : '.name')); }      // (the breed's: "Silkie", for the shows)
  baseOf(b) { return baseBreed(b); }
  isDuck(b) { return isDuck(b); }
  kindOf(b) { return kindOf(b); }
  coopName(c) { return c.name || tr(this.lang, 'breed.' + c.breed + '.coop'); }
  // a new trio's title: a new breed, or a new Silkie colour
  trioTitle(b) { return silColour(b) && b !== 'sil' ? this.t('trio_new_col', { col: tr(this.lang, 'breed.' + b + '.col') }) : this.t('trio_new', { breed: this.breedName(b) }); }
  // a personality's name and line, for a hen or a rooster (the packs: pers[p].name / .line, [hen, rooster])
  persName(p, sex) { const n = PERS_INFO[p].name[this.lang] || (PACKS[this.lang] && PACKS[this.lang].pers && PACKS[this.lang].pers[p] && PACKS[this.lang].pers[p].name) || PERS_INFO[p].name.en; return n[sex === 'r' && n[1] ? 1 : 0]; }
  persLine(p, sex, kind) {      // (kind: a call duck's (true or 'duck') or a peafowl's ('pea') line, where it's her own: her ducklings, the pond; her peachicks)
    const k = kind === true ? 'duck' : kind, f = k && PERS_INFO[p][k] ? k : 'line', P = PACKS[this.lang] && PACKS[this.lang].pers && PACKS[this.lang].pers[p];
    const n = PERS_INFO[p][f][this.lang] || (P && P[f]) || (f !== 'line' && (PERS_INFO[p].line[this.lang] || (P && P.line))) || PERS_INFO[p][f].en; return n[sex === 'r' && n[1] ? 1 : 0]; }
  farmerName() { const f = this.data ? this.data.farmer : { look: 'm', name: '' }; return f.name || tr(this.lang, 'farmer.' + f.look); }
  defaultFarmer(look) { return tr(this.lang, 'farmer.' + look); }
  // ---- the farm
  get level() { return levelOf(this.data.xp); }
  trustLevel(b) { return TRUST_AT.filter(n => b.trust >= n).length - 1; }
  // ---- levels and land: a new level's card once (lvSeen); the next patch of land (at the level it comes with), for sale
  // once the level allows; bought with coins
  levelNews() { return this.level > (this.data.lvSeen || 1) ? this.level : 0; }
  // seen: the coins for each new level since the last card (levelGift), with it; the coins given
  levelGiftDue() { let c = 0; for (let L = (this.data.lvSeen || 1) + 1; L <= this.level; L++) c += levelGift(L); return c; }
  seenLevel() { const c = this.levelGiftDue(); this.data.coins += c; this.data.lvSeen = this.level; this.save(); return c; }
  landNext() { const k = this.data.land.length; return k < FIELDS ? { field: k, price: landPrice(k), level: k + 1 } : null; }
  landForSale() { const n = this.landNext(); return n && this.level >= n.level ? n : null; }
  buyLand() {
    const n = this.landForSale(); if (!n) return null;
    if (this.data.coins < n.price) return { ...n, broke: true };
    this.data.coins -= n.price; this.data.land.push(n.field); this.save();
    return n;
  }
  // a coop put somewhere else on the land (main.js checks the spot: the farm's own land, room for it, its gate open), and
  // what was cleared there
  moveCoop(id, x, z, deg, clear = []) {
    const c = this.coop(id), X = spotNum(x), Z = spotNum(z);
    if (!c || X === null || Z === null || ![0, 90, 180, 270].includes(deg)) return false;
    c.x = X; c.z = Z; c.deg = deg; delete c.plot;
    for (const k of clear) if (typeof k === 'string' && /^[tbr]\d{1,4}$/.test(k) && !this.data.cleared.includes(k)) this.data.cleared.push(k);
    this.save();
    return true;
  }
  // ---- a coop's next look (null: Deluxe, or a coop whose looks aren't made yet) and the upgrade to it: its price paid, a
  // little XP; what had to be cleared for its bigger pen gone for good (release 4)
  coopNext(c) { if (!c || !UPGRADES.includes(baseBreed(c.breed)) || c.tier >= 4) return null; const t = c.tier + 1; return { tier: t, look: COOP_LOOKS[t], price: UPGRADE.price[t], xp: UPGRADE.xp[t] }; }
  upgradeCoop(id, clear = []) {
    const c = this.coop(id), n = this.coopNext(c);
    if (!n) return 'top';
    if (this.data.coins < n.price) return 'coins';
    this.data.coins -= n.price; c.tier = n.tier; this.data.xp += n.xp;
    for (const k of clear) if (typeof k === 'string' && /^[tbr]\d{1,4}$/.test(k) && !this.data.cleared.includes(k)) this.data.cleared.push(k);
    this.save();
    return 'ok';
  }
  lookName(c) { return this.t('look_' + COOP_LOOKS[Math.max(0, Math.min(4, c.tier))]); }
  // ---- new breeds: the coops waiting to be placed (their level come, none yet on the farm), the next to come
  waitingCoops() { return Object.keys(BREED_LEVEL).filter(b => this.level >= BREED_LEVEL[b] && !this.data.coops.some(c => c.breed === b)).sort((a, b) => BREED_LEVEL[a] - BREED_LEVEL[b]); }
  nextBreed() { const b = Object.keys(BREED_LEVEL).filter(k => BREED_LEVEL[k] > this.level).sort((a, c) => BREED_LEVEL[a] - BREED_LEVEL[c])[0]; return b ? { breed: b, level: BREED_LEVEL[b] } : null; }
  newAt(L, from) { return Object.keys(BREED_LEVEL).filter(b => BREED_LEVEL[b] > from && BREED_LEVEL[b] <= L && !this.data.coops.some(c => c.breed === b)); }
  // ---- the Breed Book (release 1 step 8): a page for each breed in level order, found once its coop is on the farm (its
  // birds' names, the rooster first); else the level it comes at, or (its level come) waiting in Your coops. Nothing of it
  // is saved: it all comes from the coops on the farm and the XP
  // (a breed or colour that no longer comes (the Blue and Grey Silkies, the Red: 30 Oct 2026) keeps its page on a farm that has
  // it, at its old place in the order)
  bookPages() {
    const has = b => this.data.coops.some(c => c.breed === b) || this.basket().some(x => x.breed === b);
    const lv = b => BREED_LEVEL[b] ?? BREED_LEVEL_29OCT[b];
    const breeds = [...new Set([...Object.keys(BREED_LEVEL_29OCT), ...Object.keys(BREED_LEVEL)])].filter(b => BREED_LEVEL[b] || has(b)).sort((a, b) => lv(a) - lv(b));      // (the call ducks' too)
    return breeds.map(breed => {
      const coop = this.data.coops.find(c => c.breed === breed);
      const names = coop ? this.birdsIn(coop.id).sort((a, b) => (b.sex === 'r') - (a.sex === 'r')).map(b => b.name) : [];
      return { breed, base: baseBreed(breed), level: lv(breed), found: !!coop, names, waiting: !coop && !!BREED_LEVEL[breed] && this.level >= BREED_LEVEL[breed], price: EGG_PRICE[baseBreed(breed)] || 6 };
    }).concat(RARE_LINES.filter(l => breeds.some(b => RARE_FROM[b] === l) || has(l)).map(breed => {      // (the rare colours: from breeding; found once one's yours)
      const coop = this.data.coops.find(c => c.breed === breed), mine = [...(coop ? this.birdsIn(coop.id) : []), ...this.basket().filter(b => b.breed === breed)];
      return { breed, base: 'sil', rare: true, from: breeds.filter(k => RARE_FROM[k] === breed), found: mine.length > 0, names: mine.sort((a, b) => (b.sex === 'r') - (a.sex === 'r')).map(b => b.name), waiting: false, price: EGG_PRICE.sil };
    }));
  }
  bookName(b) { return this.breedName(b); }
  // a rare colour's own coop (release 2 step 3): to build once one of that colour is in the basket (RARE.coop coins); its
  // birds move in from the basket. A breed's or colour's coop that can be put down now
  rareCoops() { return RARE_LINES.filter(l => this.basket().some(b => b.breed === l) && !this.data.coops.some(c => c.breed === l)); }
  placeable(breed) { return this.waitingCoops().includes(breed) || this.rareCoops().includes(breed); }
  // a waiting breed's coop and trio (or a rare colour's coop and its birds from the basket), ready to place (not on the
  // farm until placeCoop)
  draftCoop(breed, at) {
    if (!this.placeable(breed)) return null;
    if (BREED_INFO[breed].rare) {
      if (this.data.coins < RARE.coop) return null;
      const now = Date.now(), coop = { id: this.id('c'), breed, tier: 0, x: at.x, z: at.z, deg: at.deg, name: '', eggs: 0, bonus: 0, feed: 3 * FEED_DAYS, fedAt: now, brood: null, lastBrood: 0, checked: now };
      return { coop, birds: this.basket().filter(b => b.breed === breed).map(b => ({ ...b, coop: coop.id })), rare: true };
    }
    const now = Date.now(), coop = { id: this.id('c'), breed, tier: 0, x: at.x, z: at.z, deg: at.deg, name: '', eggs: 0, bonus: 0, feed: 3 * FEED_DAYS, fedAt: now, brood: null, lastBrood: 0, checked: now, ...(breed === 'pea' ? { fe: { n: 0, at: now } } : {}) };
    return { coop, birds: this.trio(breed, coop.id, false) };
  }
  placeCoop(draft, at, clear = []) {
    const c = draft && draft.coop, X = spotNum(at.x), Z = spotNum(at.z);
    if (!c || !this.placeable(c.breed) || X === null || Z === null || ![0, 90, 180, 270].includes(at.deg)) return null;
    const now = Date.now(), rare = BREED_INFO[c.breed].rare;
    if (rare && this.data.coins < RARE.coop) return null;
    Object.assign(c, { x: X, z: Z, deg: at.deg, fedAt: now, checked: now }); c.feed = draft.birds.length * FEED_DAYS;       // (its feeder full)
    if (rare) {                                                          // (paid for; its birds from the basket, their time on the farm kept)
      this.data.coins -= RARE.coop;
      const ids = new Set(draft.birds.map(b => b.id));
      this.data.basket = this.basket().filter(b => !ids.has(b.id));
      for (const b of draft.birds) { const nb = { id: b.id, name: b.name, sex: b.sex, breed: b.breed, pers: b.pers, coop: c.id, since: b.since, exp: b.exp, trust: b.trust };
        if (b.sex === 'h') nb.laid = now; nb.happy = b.happy || 0; nb.ros = b.ros || [0, 0, 0, 0, 0, 0, 0, 0, 0]; this.data.birds.push(nb); }
      this.data.coops.push(c);
    } else {
      for (const b of draft.birds) { b.since = now; if (b.sex === 'h') b.laid = now; }
      this.data.coops.push(c); this.data.birds.push(...draft.birds);
    }
    for (const k of clear) if (typeof k === 'string' && /^[tbr]\d{1,4}$/.test(k) && !this.data.cleared.includes(k)) this.data.cleared.push(k);
    this.save();
    return c;
  }
  // ---- experience, cuddles and trust
  expOf(b, now = Date.now()) { return b.exp + Math.min(EXP_TIME_MAX, Math.floor(Math.max(0, now - b.since) / DAY_MS) * EXP_DAY); }
  stars(b, now = Date.now()) { return Math.min(MAX_STARS, Math.floor(this.expOf(b, now) / 100)); }
  starPart(b, now = Date.now()) { return this.stars(b, now) >= MAX_STARS ? 1 : (this.expOf(b, now) % 100) / 100; }      // (on the way to the next star)
  happyLeft(b, now = Date.now()) { return Math.max(0, (b.happy || 0) - now); }
  // ---- shows (release 1 step 9): the shows open now, a show's name, who may enter, a bird's score and chance; entering;
  // the judging (showTick, at 7:00 the next morning, whenever the farm next looks)
  shows() { return this.data.shows || (this.data.shows = { in: [], res: [], seen: '' }); }
  openShows(now = Date.now()) {
    return SHOW_TIERS.map(tier => { const id = showIdAt(tier, now), T = SHOWS[tier]; return { id, tier, locked: this.level < T.level, level: T.level, fee: T.fee, prize: T.prize, opens: showOpens(id), judged: showJudged(id), breed: showBreed(id) }; });
  }
  showName(id) {
    const k = id[0];
    const town = TOWNS[Math.floor(hash01(id + '|town') * TOWNS.length)];
    return k === 'v' ? this.t(this.lang === 'fr' && /^[AEIOU]/.test(town) ? 'show_v2' : 'show_v', { town }) : k === 'c' ? this.t('show_c', { county: COUNTIES[Math.floor(hash01(id + '|county') * COUNTIES.length)] }) : this.t('show_n');
  }
  place(n, sexF = false) { return ordinal(this.lang, n, sexF); }
  showScore(b, id) { const s = 50 + 9 * Math.min(MAX_STARS, this.expOf(b, showJudged(id)) / 100) + 2 * this.trustLevel(b); return b.pers === 'diva' ? s * 1.08 : s; }
  showLuck(id, birdId) { return (hash01(id + '|' + birdId + '|luck') * 2 - 1) * SHOW_LUCK; }
  // her chance of a rosette (and of 1st), over the luck of the day: each of the others beats her with the chance their spread gives
  showChance(b, id) {
    const T = SHOWS[id[0]], S = this.showScore(b, id), n = T.rivals; let ros = 0, win = 0;
    const C = (k) => { let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); return c; };
    for (let i = 0; i <= 40; i++) {
      const L = (i / 20 - 1) * SHOW_LUCK, p = 1 - normCdf((S + L - T.mean) / T.sd), q = 1 - p;
      let r = 0; for (let k = 0; k <= 2; k++) r += C(k) * Math.pow(p, k) * Math.pow(q, n - k);
      ros += r / 41; win += Math.pow(q, n) / 41;
    }
    return { rosette: ros, win, word: ros < 0.15 ? 0 : ros < 0.4 ? 1 : ros < 0.7 ? 2 : 3 };
  }
  showJudgedAt(id) { return showJudged(id); }
  showOf(birdId) { return this.shows().in.find(e => e.bird === birdId) || null; }
  // whether a bird can go in a show: 'ok', or why not ('locked', 'done': you've a bird in it already, 'busy': she's in another
  // show, 'breed', 'coins')
  canEnter(b, s) {
    if (s.locked) return 'locked';
    if (this.shows().in.some(e => e.id === s.id)) return 'done';
    if ((s.breed && baseBreed(b.breed) !== s.breed) || isDuck(b.breed) || isPea(b.breed)) return 'breed';      // (the shows are poultry shows: no ducks, no peafowl)
    if (this.showOf(b.id)) return 'busy';
    if (this.data.coins < SHOWS[s.tier].fee) return 'coins';
    return 'ok';
  }
  // the birds that could go in a show, best chance first
  showBirds(s) { return this.data.birds.filter(b => (!s.breed || baseBreed(b.breed) === s.breed) && !isDuck(b.breed) && !isPea(b.breed) && !this.showOf(b.id)).map(b => ({ b, ch: this.showChance(b, s.id) })).sort((x, y) => y.ch.rosette - x.ch.rosette || y.ch.win - x.ch.win); }
  enterShow(id, birdId, now = Date.now()) {
    const s = this.openShows(now).find(x => x.id === id), b = this.bird(birdId);
    if (!s || !b || this.canEnter(b, s) !== 'ok') return null;
    this.data.coins -= SHOWS[s.tier].fee;
    this.shows().in.push({ id, bird: birdId, at: now });
    s.done = this.job('show', 1, now);
    return s;
  }
  // the judging: every show whose morning has come; her place among the others, the prize, a rosette for her card
  showTick(now = Date.now()) {
    const S = this.shows(), out = [];
    for (const e of S.in.slice()) {
      const t = showJudged(e.id); if (t > now) continue;
      S.in.splice(S.in.indexOf(e), 1);
      const b = this.bird(e.bird); if (!b) continue;
      const T = SHOWS[e.id[0]], score = this.showScore(b, e.id) + this.showLuck(e.id, e.bird), others = rivalScores(e.id);
      const place = 1 + others.filter(r => r > score).length, of = others.length + 1;
      const coins = place <= 3 ? T.prize[place - 1] : 0, xp = XP_SHOW + (place <= 3 ? T.xp[place - 1] : 0);
      const champ0 = this.champion(b);
      if (place <= 3) { b.ros = (b.ros && b.ros.length === 9 ? b.ros : [0, 0, 0, 0, 0, 0, 0, 0, 0]).slice(); b.ros[SHOW_TIERS.indexOf(e.id[0]) * 3 + place - 1]++; }
      this.data.coins += coins; this.data.xp += xp;
      const r = { id: e.id, bird: e.bird, place, of, coins, xp, t, seen: false };
      if (place === 1 && e.id[0] !== 'v') for (const k of Object.keys(DRESSES)) if (inSeason(k, t) && !this.dressOwned(k)) { this.data.dresses.push(k); r.dress = k; break; }      // (a top prize in its season: a seasonal dress)
      S.res = [...S.res, r].slice(-6);
      out.push({ ...r, champ: !champ0 && this.champion(b) });
    }
    if (out.length) this.save();
    return out;
  }
  unseenShows() { return this.shows().res.filter(r => !r.seen); }
  seenShows() { for (const r of this.shows().res) r.seen = true; this.save(); }
  // a new show today that a bird of yours could go in, and the Shows sheet not looked at yet today: the red dot
  showsDot(now = Date.now()) {
    const today = showIdAt('v', now).slice(1);
    if (this.unseenShows().length) return true;
    if (this.shows().seen === today) return false;
    return this.openShows(now).some(s => !s.locked && !this.shows().in.some(e => e.id === s.id) && this.data.birds.some(b => this.canEnter(b, s) === 'ok'));
  }
  lookedAtShows(now = Date.now()) { const k = showIdAt('v', now).slice(1); if (this.shows().seen !== k) { this.shows().seen = k; this.save(); } }
  // ---- decorations: which can be bought (their level come, not yet on the farm), buying one where it goes, moving it
  decorOwned(id) { return (this.data.decor || []).find(x => x.id === id) || null; }
  decorNext(id) { return !this.decorOwned(id) && this.level >= DECOR[id].level; }
  buyDecor(id, at, clear = []) {
    const D = DECOR[id]; if (!D || !this.decorNext(id) || this.data.coins < D.price) return null;
    const X = at ? spotNum(at.x) : null, Z = at ? spotNum(at.z) : null;
    if (!D.pond && (X === null || Z === null)) return null;
    this.data.coins -= D.price; const xp = decorXp(id); this.data.xp += xp;
    (this.data.decor || (this.data.decor = [])).push(D.pond ? { id } : { id, x: X, z: Z });
    if (id === 'beehives') this.data.honey = { n: 0, at: Date.now() };          // (the first jar 8 hours on)
    this.cleared(clear); this.save();
    return { price: D.price, xp };
  }
  moveDecor(id, at, clear = []) {
    const o = this.decorOwned(id), X = spotNum(at.x), Z = spotNum(at.z);
    if (!o || DECOR[id].pond || X === null || Z === null) return false;
    o.x = X; o.z = Z; this.cleared(clear); this.save(); return true;
  }
  // the trees, bushes and rocks cleared where something was put (the village's own ids, each once)
  cleared(list) { for (const k of list) if (typeof k === 'string' && /^[tbr]\d{1,4}$/.test(k) && !this.data.cleared.includes(k)) this.data.cleared.push(k); }
  decorName(id) { return this.t('dec_' + id); }
  // ---- the guardians (release 3): which can be bought (their level come, not yet on the farm), buying one
  animalOwned(id) { return !!(this.data.animals && this.data.animals[id]); }
  animalNext(id) { return !!ANIMALS[id] && !this.animalOwned(id) && this.level >= ANIMALS[id].level; }
  buyAnimal(id, now = Date.now(), at = null, clear = []) {
    const A = ANIMALS[id]; if (!A || !this.animalNext(id) || this.data.coins < A.price) return null;
    const X = at ? spotNum(at.x) : null, Z = at ? spotNum(at.z) : null;
    if (A.kennel && (X === null || Z === null)) return null;                // (the dog: where his kennel goes)
    this.data.coins -= A.price; const xp = animalXp(id); this.data.xp += xp;
    (this.data.animals || (this.data.animals = {}))[id] = A.kennel ? { at: now, name: DOG_NAME, x: X, z: Z } : { at: now };
    this.cleared(clear); this.save();
    return { price: A.price, xp };
  }
  animalName(id) { return this.t('ani_' + id, { name: this.dogName() }); }
  // the geese's trust: visits counted (one a day), the level (0 cross .. 3 friends), whether today's has counted, visits to
  // the next level, how long they're happy after a cuddle (friends)
  geeseTrust(now = Date.now()) {
    const a = this.data.animals && this.data.animals.geese; if (!a) return null;
    const n = a.trust || 0, level = geeseLevel(n);
    return { n, level, today: a.day === dayKey(now), next: level < 3 ? GEESE_TRUST.at[level + 1] - n : 0, happy: level === 3 ? Math.max(0, (a.happy || 0) - now) : 0 };
  }
  // a visit to the geese: counted once a day (XP, and more for becoming friends); friends, a cuddle (counts every 6 hours)
  visitGeese(now = Date.now()) {
    const a = this.data.animals && this.data.animals.geese; if (!a) return null;
    const T = this.geeseTrust(now);
    if (T.level === 3) {
      if (T.happy > 0) return { level: 3, cuddle: true, happy: true, left: T.happy, xp: 0 };
      a.happy = Math.round(now + HAPPY_MS); const xp = FRESH.cuddle; this.data.xp += xp;
      const done = this.job('cuddle', 1, now); this.save();
      return { level: 3, cuddle: true, xp, done };
    }
    if (T.today) return { level: T.level, n: T.n, counted: false, xp: 0 };
    a.trust = T.n + 1; a.day = dayKey(now);
    const level = geeseLevel(a.trust), up = level > T.level ? level : 0, xp = GEESE_TRUST.visitXp + (up === 3 ? GEESE_TRUST.friendsXp : 0);
    if (up === 3) a.happy = Math.round(now + HAPPY_MS);              // (friends: this visit's stroke their first cuddle)
    this.data.xp += xp; this.save();
    return { level, n: a.trust, counted: true, up, xp };
  }
  // the dog: his name (the player's, as any name is checked), his kennel moved
  dogName() { const d = this.data.animals && this.data.animals.dog; return d ? d.name : DOG_NAME; }
  renameDog(n) { const d = this.data.animals && this.data.animals.dog; if (!d) return null; d.name = cleanName(n) || DOG_NAME; this.save(); return d.name; }
  kennel() { const d = this.data.animals && this.data.animals.dog; return d ? { x: d.x, z: d.z, deg: KENNEL_DEG } : null; }
  moveKennel(at, clear = []) {
    const d = this.data.animals && this.data.animals.dog, X = spotNum(at.x), Z = spotNum(at.z);
    if (!d || X === null || Z === null) return false;
    d.x = X; d.z = Z; this.cleared(clear); this.save(); return true;
  }
  // ---- Rusty's night visits: the coops' doors for the night, tonight's visit, and each night gone by since the farm was
  // last looked at (the eggs laid before he came in the nest; the last visit kept for the morning's card and film)
  fox() { return this.data.fox || (this.data.fox = { seen: foxSeenFrom(Date.now()) }); }
  doorShut(c, now = Date.now()) { return shutFor(c, nightKey(now)); }
  doorBooked(c, now = Date.now()) { return !!c && c.shut === nightKey(now); }      // (shut for tonight by hand: from dusk, it shuts itself once they're all in)
  autoDoor(c) { return autoDoor(c); }
  doorStuck(c, now = Date.now()) { return doorStuck(c, nightKey(now)); }
  setDoorShut(coopId, shut, now = Date.now()) {
    const c = this.coop(coopId); if (!c) return;
    const k = shut ? nightKey(now) : undefined; if (c.shut === k) return;
    if (k) c.shut = k; else delete c.shut;
    this.save();
  }
  // tonight's visit, if there's one to come: when, the coop he'll go for (as the doors are now), the night
  foxTonight(now = Date.now()) {
    const k = nightKey(now), F = this.fox();
    if (this.level < FOX.level || k <= F.seen || !foxComes(this.data.coops, k)) return null;
    const t = foxAt(k), c = this.foxCoop(k, t);
    return c ? { key: k, t, coop: c.id, open: !shutFor(c, k) } : null;
  }
  foxCoop(k, t) {
    const coops = this.data.coops.filter(c => this.birdsIn(c.id).length && !isDuck(c.breed));      // (not the call ducks' house out on its pond)
    if (!coops.length) return null;
    const order = coops.slice().sort((a, b) => hash01('foxc|' + k + '|' + a.id) - hash01('foxc|' + k + '|' + b.id));
    return order.find(c => !shutFor(c, k)) || order[0];
  }
  // the hen who sees him off in the story: the coop's Brave, else its Rebel, else its first hen
  foxHen(c) { const hens = this.birdsIn(c.id).filter(b => b.sex === 'h'); const h = hens.find(b => b.pers === 'brave') || hens.find(b => b.pers === 'rebel') || hens[0]; return h ? h.name : HEN_NAMES[0]; }
  // what happened at the coop: the door open or shut; open, chased off by the animals the farm had then, else the nest's
  // eggs taken (the result kept; live: the farm's own visit says what happened)
  foxResolve(k, live = null) {
    const t = foxAt(k), c = this.coop(live ? live.coop : '') || this.foxCoop(k, t); if (!c) return null;
    for (const e of this.dueLays(t)) this.layEgg(e.hen, e.t, t);               // (the eggs laid before he came)
    const open = live ? live.open : !shutFor(c, k), A = this.data.animals || {};
    const g = !!(A.geese && A.geese.at < t), dg = !!(A.dog && A.dog.at < t);
    const by = live ? live.by || null : open && (g || dg) ? (g && dg ? 'team' : g ? 'geese' : 'dog') : null;
    let eggs = 0;
    if (live) eggs = open && !by ? live.took || 0 : 0;                          // (taken already, as he went: foxTakeNow)
    else if (open && !by) { eggs = c.eggs; c.eggs = 0; c.lt = []; c.bonus = 0; }
    const last = { key: k, t, coop: c.id, open, by, eggs, hen: this.foxHen(c), seen: false, watched: false, ...(open && doorStuck(c, k) ? { stuck: true } : {}) };
    const F = this.fox(); if (!F.last || F.last.key !== k) { this.tallyAdd('fox', 1, false); this.tallyAdd(open && !by && eggs > 0 ? 'foxin' : 'foxout', 1, false); }      // (the milestones: his visits, those he got the eggs, those he went home with nothing)
    F.last = last; if (k > F.seen) F.seen = k;
    this.save();
    return last;
  }
  // the nights gone by: each one over (his time come and gone) checked once, a visit on those he came (the last two days'
  // only; a night before level 4: nothing). live: tonight's is being played on the farm, left to it
  foxTick(now = Date.now(), live = null) {
    const F = this.fox(), last = nightKey(now); let out = null;
    for (let k = F.seen, n = 0; k < last && n < 60; n++) {
      let next = nightKey(nightStart(k) + DAY_MS); if (next <= k) next = nightKey(nightStart(k) + DAY_MS + 3 * 3600e3);      // (the night after)
      k = next;
      const t = foxAt(k);
      if (t > now || k === live) break;
      if (this.level >= FOX.level && foxComes(this.data.coops, k) && now - t < CATCH_UP) out = this.foxResolve(k) || out;
      if (k > F.seen) { F.seen = k; this.save(); }
    }
    return out;
  }
  foxLast() { return this.fox().last || null; }
  // tonight's visit on the farm: the eggs gone from the nest the moment he takes them
  foxTakeNow(coopId) { const c = this.coop(coopId); if (!c) return 0; const n = c.eggs; c.eggs = 0; c.lt = []; c.bonus = 0; this.save(); return n; }
  // the morning's film: from the morning after until the next evening, till it's been watched
  foxFilmable(now = Date.now()) { const l = this.foxLast(); return !!(l && !l.watched && now >= l.t && now - l.t < 20 * 3600e3); }
  foxStory(l = this.foxLast()) {
    if (!l) return '';
    const de = /^[aeiouyàâéèêîôûh]/i.test(l.hen) ? 'd’' + l.hen : 'de ' + l.hen;      // (French: d’Ivy, d’Henrietta, de Willow)
    const k = !l.open ? 'fox_shut' : l.by ? 'fox_' + l.by : l.eggs > 1 ? 'fox_eggs' : l.eggs === 1 ? 'fox_eggs1' : 'fox_empty';
    return (l.stuck ? this.t('fox_stuck') + ' ' : '') + this.t(k, { hen: l.hen, dehen: de, n: l.eggs, dog: this.dogName(), farmer: this.farmerName() }, k === 'fox_farmer' && this.data.farmer.look === 'f');
  }
  foxSeen() { const l = this.foxLast(); if (l && !l.seen) { l.seen = true; this.save(); } }
  foxWatched() { const l = this.foxLast(); if (l && !l.watched) { l.watched = true; l.seen = true; this.save(); } }
  // ---- the wheat field: how far it's grown, sowing it, harvesting it, where it is
  // (k: 0 the first field, 1 the second, once bought)
  wheat(k = 0) { return k ? this.data.wheat2 || null : this.data.wheat || (this.data.wheat = { x: null, z: null, deg: 45, ripe: 0 }); }
  wheatFields() { return this.data.wheat2 ? 2 : 1; }
  // the second field: what it takes (null once it's yours); bought: its coins paid, bare soil, the farm finds it a place
  wheatNext() { const m = WHEAT.second; return this.data.wheat2 ? null : { level: m.level, price: m.price, locked: this.level < m.level, broke: this.data.coins < m.price, can: this.level >= m.level && this.data.coins >= m.price }; }
  buyWheat(at) {
    const m = this.wheatNext(), X = at && spotNum(at.x), Z = at && spotNum(at.z); if (!m || !m.can || X === null || Z === null || X === undefined || Z === undefined) return null;
    this.data.coins -= m.price; this.data.wheat2 = { x: X, z: Z, deg: at.deg === 90 ? 90 : 0, ripe: 0 }; this.save();
    return { price: m.price };
  }
  wheatStage(now = Date.now(), k = 0) {
    const w = this.wheat(k); if (!w) return 'soil'; if (!w.ripe) return 'soil';
    const u = 1 - (w.ripe - now) / WHEAT.grow;
    return u >= 1 ? 'ripe' : u >= 0.45 ? 'growing' : u >= 0.1 ? 'sprouts' : 'sown';
  }
  wheatLeft(now = Date.now(), k = 0) { const w = this.wheat(k); return w && w.ripe ? Math.max(0, w.ripe - now) : 0; }
  sowWheat(now = Date.now(), k = 0) {
    const w = this.wheat(k); if (!w || w.ripe) return null;
    if (this.data.coins < WHEAT.sow) return { broke: true };
    this.data.coins -= WHEAT.sow; w.ripe = now + WHEAT.grow; this.save();
    return { cost: WHEAT.sow };
  }
  harvestWheat(now = Date.now(), k = 0) {
    const w = this.wheat(k); if (!w || !w.ripe || now < w.ripe) return null;
    const g = this.data.grain || 0, add = Math.max(0, Math.min(WHEAT.grain, this.shelf('grain') - g));
    w.ripe = 0; this.data.grain = Math.round((g + add) * 100) / 100; this.data.xp += WHEAT.xp; this.tallyAdd('wheat', 1, false); this.save();
    return { grain: Math.round(add), xp: WHEAT.xp, store: this.data.grain };      // (a whole number to say: "+4.63 grain" with the store nearly full read oddly)
  }
  placeWheat(at, clear = [], k = 0) {
    const X = spotNum(at.x), Z = spotNum(at.z); if (X === null || Z === null) return false;
    const w = this.wheat(k); if (!w) return false; w.x = X; w.z = Z; w.deg = [0, 45, 90, 135].includes(at.deg) ? at.deg : 0; this.cleared(clear);      // (0 or 90 since 6 Nov 2026; 45 or 135 before)
    this.save(); return true;
  }
  placeGarden(at, clear = []) {      // (the vegetable garden, moved: as the wheat field, 0 or 90)
    const X = spotNum(at.x), Z = spotNum(at.z); if (X === null || Z === null || !this.gardenOpen()) return false;
    const G = this.garden(); G.x = X; G.z = Z; G.deg = at.deg === 90 ? 90 : 0; this.cleared(clear);
    this.save(); return true;
  }
  // ---- honey: the jars in the hives now, when the next comes, harvesting them (sold)
  honeyAt(now = Date.now()) { const H = this.data.honey; if (!H) return 0; return Math.min(HONEY.max, H.n + Math.floor(Math.max(0, now - H.at) / HONEY.every)); }
  honeyNext(now = Date.now()) { const H = this.data.honey; if (!H || this.honeyAt(now) >= HONEY.max) return 0; return HONEY.every - (Math.max(0, now - H.at) % HONEY.every); }
  collectHoney(now = Date.now()) {
    const H = this.data.honey; if (!H) return null;
    const k = Math.floor(Math.max(0, now - H.at) / HONEY.every), n = Math.min(HONEY.max, H.n + k);
    if (!n) return null;
    H.at = H.n + k >= HONEY.max ? now : H.at + k * HONEY.every; H.n = 0;
    const P = this.pantryBag(), kept = Math.max(0, Math.min(n, this.shelf('honey') - P.honey)), sold = n - kept, coins = sold * HONEY.price, xp = n * HONEY.xp;      // (to the pantry; what doesn't fit is sold)
    P.honey += kept; this.data.coins += coins; this.data.xp += xp; this.save();
    return { n, coins, xp, kept, sold, toOrder: 0, to: [] };
  }
  // ---- village orders: open from level 3; the orders now (new ones as they're due: two when they start, then one every
  // 3 hours while there's room); a new one; things set aside for them as they come; ready (all of it set aside, and the
  // grain in the store); one delivered (paid, the grain taken from the store, its surprise); one turned down (what was set
  // aside for it sold)
  ordersOpen() { return this.level >= ORDERS.level; }
  orderBook() { return this.data.orders || (this.data.orders = { list: [], next: 0, seq: 1, done: 0 }); }
  orders(now = Date.now()) { if (!this.ordersOpen()) return []; this.orderTick(now); return this.orderBook().list; }
  orderTick(now = Date.now(), r = Math.random) {
    if (!this.ordersOpen()) return 0;
    const B = this.orderBook(); let added = 0;
    if (!B.next) { for (let i = 0; i < ORDERS.first && B.list.length < ORDERS.max; i++) if (this.newOrder(now, r)) added++; B.next = Math.round(now + ORDERS.every); }
    while (B.list.length < ORDERS.max && now >= B.next) { if (!this.newOrder(Math.min(now, B.next), r)) break; B.next += ORDERS.every; added++; }
    if (added) this.save();
    return added;
  }
  orderCan(k) { return k === 'eggs' || k === 'grain' || (k === 'fish' ? this.fishOpen('pond') : k === 'honey' ? !!this.data.honey : CROP_IDS.includes(k) && this.gardenOpen()); }
  storeOf(k) { return k === 'eggs' ? this.pantryBag().eggs : k === 'honey' ? this.pantryBag().honey : k === 'grain' ? Math.floor(this.data.grain || 0) : k === 'fish' ? this.fishBox().length : this.vegBasket()[k] || 0; }      // (what's in store for an order)
  newOrder(t, r = Math.random) {
    const B = this.orderBook(), L = this.level, busy = new Set(B.list.map(o => o.who));
    const who = Object.keys(VILLAGERS).filter(v => !busy.has(v) && VILLAGERS[v].wants.some(k => this.orderCan(k)));
    if (!who.length) return null;
    const v = who[Math.floor(r() * who.length) % who.length], wants = VILLAGERS[v].wants.filter(k => this.orderCan(k));
    const pick = [wants[Math.floor(r() * wants.length) % wants.length]], rest = wants.filter(k => k !== pick[0]);
    if (rest.length && r() < 0.4) pick.push(rest[Math.floor(r() * rest.length) % rest.length]);
    const items = {}; for (const k of ORDER_ITEMS) if (pick.includes(k)) items[k] = orderAmount(k, L, r());      // (in the save check's order: the same after a reload)
    const o = { id: 'o' + B.seq++, who: v, t: Math.round(t), items, got: {} };
    B.list.push(o); return o;
  }
  // ---- the pantry
  pantryBag() { return this.data.pantry || (this.data.pantry = { eggs: 0, val: 0, honey: 0 }); }
  shelf(k) { return shelfSize(k, this.level, !!this.data.shelves); }
  shelfOpen(k) { return k === 'eggs' ? true : k === 'honey' ? !!this.data.honey : k === 'grain' ? !!this.data.wheat || (this.data.grain || 0) > 0 : k === 'fish' ? this.fishOpen('pond') : this.gardenOpen(); }
  wantedOf(k) { if (!this.ordersOpen() || !this.data.orders) return 0; return Math.min(this.storeOf(k), this.data.orders.list.reduce((a, o) => a + Math.max(0, (o.items[k] || 0) - (o.got[k] || 0)), 0)); }      // (what the open orders still want of a shelf, of what's on it)
  // what n things off a shelf fetch (the eggs: their share of what they're worth; the fish: the biggest ones, the orders taking the smallest)
  shelfValue(k, n) {
    const have = this.storeOf(k); n = Math.max(0, Math.min(n, have)); if (!n) return 0;
    if (k === 'eggs') { const P = this.pantryBag(); return Math.round(P.val * n / P.eggs); }
    if (k === 'fish') return this.fishBox().map(q => fishPrice(q[0], q[1])).sort((a, b) => b - a).slice(0, n).reduce((a, c) => a + c, 0);
    return Math.floor(PANTRY.price[k] * n);
  }
  pantryTake(k, n) {      // (n off a shelf, not paid: an order's)
    n = Math.max(0, Math.min(n, this.storeOf(k))); if (!n) return 0;
    if (k === 'eggs') { const P = this.pantryBag(), v = Math.round(P.val * n / P.eggs); P.eggs -= n; P.val = P.eggs ? Math.max(0, P.val - v) : 0; }
    else if (k === 'honey') this.pantryBag().honey -= n;
    else if (k === 'grain') this.data.grain = Math.max(0, Math.round(((this.data.grain || 0) - n) * 100) / 100);
    else if (k === 'fish') { const f = this.fishBag(); f.box.sort((a, b) => fishPrice(b[0], b[1]) - fishPrice(a[0], a[1])); f.box.splice(0, n); if (!f.box.length) delete f.box; }
    else { const B = this.vegBasket(); B[k] = Math.max(0, (B[k] || 0) - n); }
    return n;
  }
  // a shelf sold: all that the open orders don't want (all: those too); nothing to sell: null
  sellShelf(k, all = false) {
    if (!PANTRY_IDS.includes(k)) return null;
    const n = this.storeOf(k) - (all ? 0 : this.wantedOf(k)); if (!(n > 0)) return null;
    const coins = this.shelfValue(k, n); this.pantryTake(k, n); this.data.coins += coins; this.save();
    return { k, n, coins };
  }
  pantry() { return PANTRY_IDS.filter(k => this.shelfOpen(k)).map(k => { const n = this.storeOf(k), kept = this.wantedOf(k); return { k, n, max: this.shelf(k), kept, coins: this.shelfValue(k, n - kept), all: this.shelfValue(k, n) }; }); }
  pantryFull() { return this.pantry().filter(r => r.n >= r.max).length; }
  pantrySeen() { const P = this.pantryBag(); if (!P.seen) { P.seen = true; this.save(); } }
  setAside(k, n) {
    if (!this.data.orders || !this.ordersOpen() || !(n > 0)) return { n: 0, to: [] };
    let left = n; const to = [];
    for (const o of this.data.orders.list) {
      const need = (o.items[k] || 0) - (o.got[k] || 0); if (need <= 0 || left <= 0) continue;
      const g = Math.min(need, left); o.got[k] = (o.got[k] || 0) + g; left -= g; to.push({ id: o.id, who: o.who, n: g });
    }
    return { n: n - left, to };
  }
  orderLeft(o, k) { return k === 'fish' ? Math.max(0, (o.items.fish || 0) - (o.got.fish || 0) - this.fishBox().length) : STORE_ITEMS.includes(k) ? Math.max(0, (o.items[k] || 0) - (o.got[k] || 0) - this.storeOf(k)) : Math.max(0, (o.items[k] || 0) - (o.got[k] || 0)); }
  fishWanted() { if (!this.ordersOpen() || !this.data.orders) return 0; return Math.max(0, this.data.orders.list.reduce((a, o) => a + Math.max(0, (o.items.fish || 0) - (o.got.fish || 0)), 0) - this.fishBox().length); }      // (fish the open orders still need, past those in the box)
  orderReady(o) { return ORDER_ITEMS.every(k => !o.items[k] || this.orderLeft(o, k) === 0); }
  ordersReady() { return this.ordersOpen() && this.data.orders ? this.data.orders.list.filter(o => this.orderReady(o)).length : 0; }
  villagerName(v) { return this.t('vil_' + v); }
  villagerIn(v) { return this.t('vil_' + v + '_s'); }      // (the name inside a sentence: "for the fête", "pour le vieux Tom", "für den alten Tom"; the phrases use a word that doesn't run into it, "pour" not "de" or "à", 8 Nov 2026)
  villagerEmoji(v) { return VILLAGERS[v] ? VILLAGERS[v].e : '🧺'; }
  orderPayOf(o) { return { ...orderPay(o), surprise: !!orderSurprise(o, this.fishOpen('pond')) }; }
  orderNextIn(now = Date.now()) { const B = this.data.orders; return this.ordersOpen() && B && B.next ? Math.max(0, B.next - now) : 0; }
  // the words for things set aside for the orders: "🧺 3 for Mrs Potts" (to: setAside's)
  setAsideText(to) { return to.map(x => this.t('ord_set', { n: x.n, name: this.villagerIn(x.who) })).join(' · '); }
  deliverOrder(id, now = Date.now()) {
    const B = this.data.orders, o = B && B.list.find(x => x.id === id); if (!o || !this.orderReady(o)) return null;
    if (o.items.grain) this.data.grain = Math.max(0, Math.round(((this.data.grain || 0) - o.items.grain) * 100) / 100);
    for (const k of ['eggs', 'honey']) if (o.items[k]) this.pantryTake(k, Math.max(0, o.items[k] - (o.got[k] || 0)));      // (the eggs and the honey from the pantry)
    if (o.items.fish) { const need = Math.max(0, o.items.fish - (o.got.fish || 0)), f = this.fishBag(); if (need && f.box) { f.box.sort((a, b) => fishPrice(a[0], a[1]) - fishPrice(b[0], b[1])); f.box.splice(0, need); if (!f.box.length) delete f.box; } }      // (the fish from the box, the smallest first)
    for (const k of CROP_IDS) if (o.items[k]) { const B = this.vegBasket(); B[k] = Math.max(0, (B[k] || 0) - o.items[k]); }      // (the vegetables from the basket)
    const P = orderPay(o), sp = orderSurprise(o, this.fishOpen('pond'));
    let coins = P.coins, worms = 0, grain = 0;
    if (sp === 'coins') coins += Math.round(P.coins * SURPRISE.coins);
    if (sp === 'worms') { const f = this.fishBag(); worms = Math.max(0, Math.min(SURPRISE.worms, FISHING.maxWorms - f.worms)); f.worms += worms; }
    if (sp === 'grain') { const g = this.data.grain || 0; grain = Math.max(0, Math.min(SURPRISE.grain, this.shelf('grain') - g)); this.data.grain = Math.round((g + grain) * 100) / 100; }
    this.data.coins += coins; this.data.xp += P.xp;
    B.list = B.list.filter(x => x !== o); B.done = (B.done || 0) + 1; B.next = Math.max(B.next || 0, Math.round(now + ORDERS.gap));
    this.save();
    return { id, who: o.who, coins, xp: P.xp, surprise: sp, worms, grain: Math.round(grain), extra: sp === 'coins' ? coins - P.coins : 0 };      // (the grain said as a whole number)
  }
  declineOrder(id, now = Date.now()) {
    const B = this.data.orders, o = B && B.list.find(x => x.id === id); if (!o) return null;
    const coins = Math.round((o.got.eggs || 0) * ORDERS.worth.eggs + (o.got.fish || 0) * ORDERS.worth.fish + (o.got.honey || 0) * HONEY.price);
    this.data.coins += coins; B.list = B.list.filter(x => x !== o); B.next = Math.max(B.next || 0, Math.round(now + ORDERS.gap)); this.save();
    return { coins };
  }
  // ---- the daily egg hunt: open from level 2; today's (its day, found or not, the hen who hid it, the days in a row it
  // would make, how many found in all); found (paid, counted)
  huntOpen() { return this.level >= HUNT.level; }
  huntToday(now = Date.now()) {
    const day = dayKey(now), H = this.data.hunt || { last: '', streak: 0, n: 0 }, found = H.last === day;
    const hens = this.data.birds.filter(b => b.sex === 'h' && !kindOf(b.breed)), hen = hens.length ? hens[Math.floor(hash01('hunt|' + day + '|' + this.data.made) * hens.length) % hens.length] : null;
    const streak = found ? H.streak : H.last === dayKey(now - 86400e3) ? H.streak + 1 : 1;
    return { day, found, hen: hen ? hen.name : '', henId: hen ? hen.id : null, streak, n: H.n || 0, seed: hash01('huntspot|' + day + '|' + this.data.made) };
  }
  huntFind(now = Date.now()) {
    if (!this.huntOpen()) return null;
    const T = this.huntToday(now); if (T.found) return null;
    const P = huntPay(T.streak);
    this.data.hunt = { last: T.day, streak: T.streak, n: T.n + 1 };
    this.data.coins += P.coins; this.data.xp += P.xp; this.save();
    return { ...P, streak: T.streak, n: T.n + 1, hen: T.hen };
  }
  // ---- the vegetable garden: open from level 4; it (its spot, its beds, the basket); a bed's stage ('empty', 'sown',
  // 'shoots', 'growing', 'ripe') and time left; one sown (its seeds paid: false, not enough coins), one picked (into the
  // basket, as much as there's room for, and XP); the beds ripe now; a treat for a coop (by day, one a day: its vegetables
  // from the basket, every bird there a little experience (strawberries, a pumpkin), its hens' extra eggs to come: dueLays)
  gardenOpen() { return this.level >= GARDEN.level; }
  garden() { return this.data.garden || (this.data.garden = { x: null, z: null, deg: 0, beds: Array.from({ length: GARDEN.beds }, () => ({ crop: null, ripe: 0 })), veg: { carrot: 0, straw: 0, pump: 0 } }); }
  vegBasket() { return this.garden().veg; }      // (the vegetables picked; basket(): the rare colours' birds)
  bedStage(i, now = Date.now()) {
    const b = this.garden().beds[i]; if (!b || !b.crop) return 'empty';
    const left = b.ripe - now, g = CROPS[b.crop].grow; if (left <= 0) return 'ripe';
    const u = 1 - left / g; return u < 0.12 ? 'sown' : u < 0.5 ? 'shoots' : 'growing';
  }
  bedLeft(i, now = Date.now()) { const b = this.garden().beds[i]; return b && b.crop ? Math.max(0, b.ripe - now) : 0; }
  sowBed(i, crop, now = Date.now()) {
    if (!this.gardenOpen() || !Object.hasOwn(CROPS, crop)) return null;
    const b = this.garden().beds[i]; if (!b || b.crop) return null;
    const C = CROPS[crop]; if (this.data.coins < C.seed) return { broke: true };
    this.data.coins -= C.seed; b.crop = crop; b.ripe = Math.round(now + C.grow); this.save();
    return { crop, seed: C.seed, ripe: b.ripe };
  }
  pickBed(i, now = Date.now()) {
    if (this.bedStage(i, now) !== 'ripe') return null;
    const b = this.garden().beds[i], C = CROPS[b.crop], B = this.vegBasket(), crop = b.crop;
    const n = Math.max(0, Math.min(C.n, this.shelf(crop) - (B[crop] || 0)));
    if (!n) return { crop, n: 0, full: true, kept: true };      // (the basket has all of those it can hold: left in the bed for now)
    B[crop] = (B[crop] || 0) + n; b.crop = null; b.ripe = 0; this.data.xp += C.xp; this.tallyAdd('veg', n, false); this.save();
    return { crop, n, full: n < C.n, xp: C.xp };
  }
  // a bed more (GARDEN.more): the next one (its level, its price, whether it can be bought now: the level and the coins), null
  // with all six; bought: its coins paid, an empty bed added
  bedNext() { const G = this.gardenOpen() ? this.garden() : null, m = G ? GARDEN.more[G.beds.length - GARDEN.beds] : null; return m ? { n: G.beds.length + 1, level: m.level, price: m.price, locked: this.level < m.level, broke: this.data.coins < m.price, can: this.level >= m.level && this.data.coins >= m.price } : null; }
  buyBed() {
    const m = this.bedNext(); if (!m || !m.can) return null;
    this.data.coins -= m.price; this.garden().beds.push({ crop: null, ripe: 0 }); this.save();
    return { n: m.n, price: m.price };
  }
  bedsRipe(now = Date.now()) { return this.gardenOpen() && this.data.garden ? this.data.garden.beds.filter((_, i) => this.bedStage(i, now) === 'ripe').length : 0; }
  vegCount() { const B = this.data.garden ? this.data.garden.veg : null; return B ? CROP_IDS.reduce((a, k) => a + (B[k] || 0), 0) : 0; }
  treatToday(c, now = Date.now()) { return !!(c && c.treat && dayKey(c.treat.t) === dayKey(now)); }
  treatCan(c, crop, now = Date.now()) { return this.gardenOpen() && !!c && !this.treatToday(c, now) && Object.hasOwn(CROPS, crop) && (this.vegBasket()[crop] || 0) >= CROPS[crop].treat && this.birdsIn(c.id).length > 0; }
  giveTreat(coopId, crop, now = Date.now()) {
    const c = this.coop(coopId); if (!this.treatCan(c, crop, now)) return null;
    const C = CROPS[crop], B = this.vegBasket(); B[crop] -= C.treat;
    c.treat = { t: Math.round(now), crop };
    const birds = this.birdsIn(c.id);
    if (C.exp) for (const b of birds) b.exp = Math.min(1e7, (b.exp || 0) + C.exp);
    this.save();
    return { crop, used: C.treat, eggs: birds.filter(b => b.sex === 'h' && !this.brooding(b.id)).length * C.eggs, exp: C.exp, birds: birds.length };
  }
  // ---- the peacock's feathers: how many lie in his yard now; one picked up (sold)
  feathersAt(c, now = Date.now()) { const F = c && c.breed === 'pea' && c.fe; if (!F) return 0; return Math.min(FEATHERS.max, F.n + Math.floor(Math.max(0, now - F.at) / FEATHERS.every)); }
  // ---- the Glutton's apples: her coop's grown Glutton hens; the chicken coops where one lives with no tree beside them
  // (yet, or no room for it where it was); a tree planted on one side of a coop's pen (the first: a couple of apples on it
  // already), or taken off that side (null: no room there any more); the apples on a coop's tree now; one knocked down and
  // eaten by one of its Glutton hens (not while an apple egg's waiting: after two, one is); the apple egg sold
  gluttons(c) { return c && !kindOf(c.breed) ? this.birdsIn(c.id).filter(b => b.pers === 'glutton' && b.sex === 'h') : []; }
  appleWants() { return this.data.coops.filter(c => !(c.ap && c.ap.side) && this.gluttons(c).length); }
  plantApple(coopId, side, now = Date.now()) {
    const c = this.coop(coopId); if (!c || kindOf(c.breed) || (side !== 'l' && side !== 'r')) return null;
    if (!c.ap) c.ap = { n: APPLES.first, at: now, ate: 0, egg: false };
    c.ap.side = side; this.save(); return c.ap;
  }
  appleOff(coopId) { const c = this.coop(coopId); if (c && c.ap && c.ap.side) { delete c.ap.side; this.save(); } }
  appleMax(c) { return appleMost((c && c.tier) || 0); }
  applesAt(c, now = Date.now()) { const A = c && c.ap; if (!A) return 0; return Math.min(this.appleMax(c), A.n + Math.floor(Math.max(0, now - A.at) / APPLES.every)); }
  appleNext(c, now = Date.now()) { const A = c && c.ap; if (!A || this.applesAt(c, now) >= this.appleMax(c)) return 0; return APPLES.every - (Math.max(0, now - A.at) % APPLES.every); }      // (ms till the next one ripens: 0 when it's full)
  eatApple(coopId, birdId, now = Date.now()) {
    const c = this.coop(coopId), A = c && c.ap, b = this.bird(birdId);
    if (!A || A.egg || !b || b.coop !== c.id || b.pers !== 'glutton' || b.sex !== 'h') return null;
    const k = Math.floor(Math.max(0, now - A.at) / APPLES.every), n = Math.min(this.appleMax(c), A.n + k);
    if (!n) return null;
    A.at = A.n + k >= this.appleMax(c) ? now : A.at + k * APPLES.every; A.n = n - 1;
    const egg = ++A.ate >= APPLES.perEgg; if (egg) { A.ate = 0; A.egg = true; }
    this.save();
    return { left: n - 1, egg };
  }
  sellAppleEgg(coopId) {
    const c = this.coop(coopId), A = c && c.ap; if (!A || !A.egg) return null;
    A.egg = false;
    const coins = APPLES.eggs * this.eggPrice(c), xp = APPLES.xp; this.data.coins += coins; this.data.xp += xp; this.save();
    return { coins, xp };
  }
  pickFeather(coopId, now = Date.now()) {
    const c = this.coop(coopId), F = c && c.breed === 'pea' && c.fe; if (!F) return null;
    const k = Math.floor(Math.max(0, now - F.at) / FEATHERS.every), n = Math.min(FEATHERS.max, F.n + k);
    if (!n) return null;
    F.at = F.n + k >= FEATHERS.max ? now : F.at + k * FEATHERS.every; F.n = n - 1;
    this.data.coins += FEATHERS.price; this.data.xp += FEATHERS.xp; this.save();
    return { coins: FEATHERS.price, xp: FEATHERS.xp, left: n - 1 };
  }
  // ---- fishing: open at the pond (level 2) and the river (8); the worms (found by the chickens, or from tins);
  // a cast (a worm on the hook: the fish that will bite decided there and then, kept till it's landed or lost); landed
  // (sold live, or a legendary one's photo; the count and the biggest kept); a tin of worms
  fishOpen(water) { return water in FISHING && typeof FISHING[water] === 'number' && this.level >= FISHING[water]; }
  fishBag() { return this.data.fish || (this.data.fish = { worms: 0, got: {} }); }
  // a tin of worms to start with, once, as the pond opens (or on a farm that had it open before): the worms given, or 0
  fishGift() {
    if (!this.fishOpen('pond')) return 0;
    const f = this.fishBag(); if (f.gift) return 0;
    f.gift = true; f.worms = Math.min(FISHING.maxWorms, f.worms + FISHING.gift); this.save();
    return FISHING.gift;
  }
  worms() { return this.data.fish ? this.data.fish.worms : 0; }
  // the worms a bird finds for the farmer each day (by how much she loves him: none while she's shy), whether she's given
  // them today; asked (her card's "Ask for worms"): all of today's at once, into the bag (null: fishing not open yet, shy,
  // or already given today)
  wormsOf(b) { return FISHING.byTrust[this.trustLevel(b)]; }
  wormsGiven(b, now = Date.now()) { return b.worm === dayKey(now); }
  askWorms(id, now = Date.now()) {
    const b = this.bird(id); if (!b || !this.fishOpen('pond')) return null;
    const n = this.wormsOf(b); if (!n || this.wormsGiven(b, now)) return null;
    const f = this.fishBag(); f.worms = Math.min(FISHING.maxWorms, f.worms + n); b.worm = dayKey(now); this.save();
    return { n, worms: f.worms };
  }
  fishGot(id) { const g = this.data.fish && this.data.fish.got[id]; return g ? { n: g[0], best: g[1] } : null; }
  fishName(id) { return this.t('fish_' + id); }
  // who bites now: the common fish always; a rare one in its hours; the legendary one once all the others of its water are in
  fishBites(id, hour) { const R = FISH_RULES[id]; return R.rare === 2 ? FISH_IDS.every(k => k === id || FISH_RULES[k].water !== R.water || this.fishGot(k)) : !R.when || (hour >= R.when[0] && hour < R.when[1]); }
  fishBox() { return (this.data.fish && this.data.fish.box) || []; }
  fishNet() { return (this.data.fish && this.data.fish.net) || []; }
  tinToday(now = Date.now()) { return !!this.data.fish && this.data.fish.tin === dayKey(now); }
  // the keep net at the end of a trip: those at `keep` (places in the net) into the fish box, while there's room; the rest
  // sold for their sizes' prices: { coins, sold, kept }
  sellCatch(keep = []) {
    const f = this.fishBag(), net = f.net || []; if (!net.length) return null;
    let coins = 0, sold = 0, kept = 0; const box = f.box || [];
    net.forEach((q, i) => { if (keep.includes(i) && box.length < this.shelf('fish')) { box.push(q); kept++; } else { coins += fishPrice(q[0], q[1]); sold++; } });
    delete f.net; if (box.length) f.box = box; this.data.coins += coins; this.save();
    return { coins, sold, kept };
  }
  sellBox() { const f = this.fishBag(), box = f.box || []; if (!box.length) return null; const coins = box.reduce((a, q) => a + fishPrice(q[0], q[1]), 0); delete f.box; this.data.coins += coins; this.save(); return { coins, sold: box.length }; }
  castWorm(water, now = Date.now(), r = Math.random, hour = new Date(now).getHours() + new Date(now).getMinutes() / 60) {
    if (!this.fishOpen(water)) return null;
    const f = this.fishBag(); if (f.worms <= 0) return null;
    f.worms--;
    const list = FISH_IDS.filter(id => FISH_RULES[id].water === water && this.fishBites(id, hour));
    let x = r() * list.reduce((a, id) => a + FISH_RULES[id].w, 0), id = list[0];
    for (const k of list) { x -= FISH_RULES[k].w; if (x < 0) { id = k; break; } }
    const R = FISH_RULES[id], cm = Math.round(R.cm[0] + (R.cm[1] - R.cm[0]) * Math.pow(r(), 1.6));
    this.bite = { id, cm, water, rare: R.rare };
    this.save();
    return { ...this.bite };
  }
  landFish() {
    const b = this.bite; if (!b) return null;
    this.bite = null;
    const R = FISH_RULES[b.id], f = this.fishBag(), g = f.got[b.id], first = !g, best = !first && b.cm > g[1];
    f.got[b.id] = [g ? g[0] + 1 : 1, g ? Math.max(g[1], b.cm) : b.cm];
    // (a legendary one: its photo paid now, and back it goes; any other into the keep net, sold at the end of the trip; the
    // net full: sold there and then)
    const legend = R.rare === 2, worth = fishPrice(b.id, b.cm), full = !legend && (f.net || []).length >= FISHING.net;
    if (!legend && !full) (f.net = f.net || []).push([b.id, b.cm]);
    const coins = legend || full ? worth : 0, xp = R.xp + (first ? FISHING.firstXp : 0);
    this.data.coins += coins; this.data.xp += xp; this.save();
    return { id: b.id, cm: b.cm, water: b.water, rare: R.rare, legend, first, best, coins, worth, net: legend ? 0 : (f.net || []).length, xp, n: f.got[b.id][0], order: null };
  }
  loseFish() { const had = !!this.bite; this.bite = null; return had; }
  buyWorms(now = Date.now()) {
    const T = FISHING.tin, f = this.fishBag();
    if (this.data.coins < T.price || f.worms + T.n > FISHING.maxWorms || f.tin === dayKey(now)) return null;      // (one tin a day)
    this.data.coins -= T.price; f.worms += T.n; f.tin = dayKey(now); this.save();
    return { n: T.n, price: T.price, worms: f.worms };
  }
  // ---- the first day's guide: the step now ('eggs', 'cuddle', …, or null: done or skipped); a step done (k: only if it's
  // the one now): its coins, the next; skipped: done, no more coins
  guideStep() { const G = this.data.guide; return G && !G.done && G.step < GUIDE.length ? GUIDE[G.step] : null; }
  guideDid(k) {
    const G = this.data.guide; if (!G || G.done || GUIDE[G.step] !== k) return null;
    G.step++; let coins = GUIDE_COINS, xp = GUIDE_XP;
    if (G.step >= GUIDE.length) { G.done = true; coins += GUIDE_BONUS; xp += GUIDE_XP_BONUS; }
    this.data.coins += coins; this.data.xp += xp; this.save();
    return { coins, xp, done: G.done, next: G.done ? null : GUIDE[G.step], n: G.step };
  }
  guideSkip() { const G = this.data.guide; if (G && !G.done) { G.done = true; this.save(); } }
  // ---- the welcome-back summary (release 1 step 9f; Audrey: "Welcome-back summary (Recommended)"): after time away (from:
  // when the farm was last open), what's waiting: the eggs in the nests (and full nests), chicks hatched and grown, honey,
  // the wheat, feeders empty or low, show results, the day's jobs
  awaySummary(from, now = Date.now()) {
    const d = this.data, items = [], name = id => { const b = this.bird(id); return b ? b.name : ''; };
    const eggs = d.coops.reduce((a, c) => a + (c.eggs || 0), 0), full = d.coops.filter(c => c.eggs >= NEST_MAX).length;
    if (eggs) items.push({ k: 'eggs', n: eggs });
    if (full) items.push({ k: 'full', n: full });
    for (const c of d.coops) { const br = c.brood; if (br && br.hatched && this.hatchAt(c) > from) items.push({ k: 'hatched', name: name(br.hen), n: br.n, duck: kindOf(c.breed) }); }
    for (const n of this.unseenNews()) if (n.type === 'grown' && n.t > from) items.push({ k: 'grown', name: name(n.hen), duck: kindOf((this.coop(n.coop) || {}).breed) }); 
    const h = this.honeyAt(now); if (h) items.push({ k: 'honey', n: h });
    const fe = d.coops.reduce((a, c) => a + this.feathersAt(c, now), 0); if (fe) items.push({ k: 'feathers', n: fe });
    const ae = d.coops.filter(c => c.ap && c.ap.egg).length; if (ae) items.push({ k: 'apple_egg', n: ae });
    { const st = [0, 1].filter(k => this.wheat(k)).map(k => [this.wheatStage(now, k), this.wheatLeft(now, k)]), grow = st.filter(q => q[0] !== 'ripe' && q[0] !== 'soil').map(q => q[1]);      // (either field ripe; else the next one's time)
      if (st.some(q => q[0] === 'ripe')) items.push({ k: 'wheat' }); else if (grow.length) items.push({ k: 'wheat_grow', ms: Math.min(...grow) }); }
    const gr = this.bedsRipe(now); if (gr) items.push({ k: 'garden', n: gr });      // (the vegetable garden: beds ripe)
    for (const c of d.coops) { const l = this.feedLeft(c, now); if (l <= 0) items.push({ k: 'feed', coop: this.coopName(c) }); else if (l < 0.25) items.push({ k: 'feed_low', coop: this.coopName(c) }); }
    if (this.unseenShows().length) items.push({ k: 'show' });
    const jr = this.jobsReady(now); if (jr) items.push({ k: 'jobs_ready', n: jr }); else if (!this.jobs(now).seen) items.push({ k: 'jobs' });
    return { away: Math.max(0, now - from), paused: now - from > CATCH_UP, eggs, items };
  }
  seenNow(now = Date.now()) { this.data.lastSeen = now; this.save(); }
  // ---- the seasonal dresses: bought in their season (a little XP), kept; a coop dressed, or undressed (id null)
  dressOwned(id) { return (this.data.dresses || []).includes(id); }
  dressNext(id, now = Date.now()) { return !!DRESSES[id] && !this.dressOwned(id) && inSeason(id, now); }
  buyDress(id, now = Date.now()) {
    const D = DRESSES[id]; if (!D || !this.dressNext(id, now) || this.data.coins < D.price) return null;
    this.data.coins -= D.price; const xp = dressXp(id); this.data.xp += xp;
    (this.data.dresses || (this.data.dresses = [])).push(id);
    this.save();
    return { price: D.price, xp };
  }
  dressCoop(cid, id) {
    const c = this.coop(cid); if (!c || (id && !this.dressOwned(id))) return false;
    if (id) c.dress = id; else delete c.dress;
    this.save(); return true;
  }
  dressName(id) { return this.t('dress_' + id); }
  // ---- the farmer's outfits: bought (and put on at once), worn
  outfitOwned(id) { return id === 'classic' || (this.data.farmer.outfits || []).includes(id); }
  outfitNext(id) { return OUTFITS[id] && !this.outfitOwned(id) && this.level >= OUTFITS[id].level; }
  outfitWorn() { return this.data.farmer.outfit || 'classic'; }
  buyOutfit(id) {
    const O = OUTFITS[id]; if (!O || !this.outfitNext(id) || this.data.coins < O.price) return null;
    const F = this.data.farmer;
    this.data.coins -= O.price; const xp = outfitXp(id); this.data.xp += xp;
    (F.outfits || (F.outfits = [])).push(id); F.outfit = id;
    this.save();
    return { price: O.price, xp };
  }
  wearOutfit(id) {
    if (!OUTFITS[id] || !this.outfitOwned(id)) return false;
    const F = this.data.farmer; if (!F.outfits) { if (id === 'classic') return true; return false; }
    F.outfit = id; this.save(); return true;
  }
  outfitName(id) { return this.t('of_' + id); }
  // ---- daily jobs: today's (new at midnight), progress as things are done (job(k, n)), the reward collected with a tap
  jobs(now = Date.now()) {
    const day = dayKey(now), J = this.data.jobs;
    if (!J || J.day !== day) { this.data.jobs = { day, lv: this.level, seen: false, list: jobsFor(day, this.level) }; this.save(); }
    return this.data.jobs;
  }
  // something done that a job counts: the jobs it finishes (just now)
  job(k, n = 1, now = Date.now()) {
    const J = this.jobs(now), done = [];
    for (const j of J.list) if (j.k === k && j.got < j.n) { j.got = Math.min(j.n, j.got + n); if (j.got >= j.n) done.push(j); }
    this.save();
    return done;
  }
  // ---- the milestones: the tally; what each stands at; its steps reached and collected; those with a step to collect;
  // one collected (its next step: coins, XP, and at its last the keepsake)
  tallyAdd(k, n = 1, save = true) { if (!this.data || !(n > 0)) return; const T = this.data.tally || (this.data.tally = {}); T[k] = Math.min(1e9, (T[k] || 0) + n); if (save) this.save(); }
  tallyOf(k) { return (this.data.tally && this.data.tally[k]) || 0; }
  mileValue(id) {
    const d = this.data;
    if (id === 'fish') return d.fish ? Object.keys(d.fish.got).length : 0;
    if (id === 'friends') return d.birds.filter(b => this.trustLevel(b) >= 3).length;
    if (id === 'gold') return d.hunt ? d.hunt.n : 0;
    if (id === 'orders') return d.orders ? d.orders.done || 0 : 0;
    if (id === 'ros') return d.birds.reduce((a, b) => a + (b.ros || []).reduce((x, n) => x + n, 0), 0);
    if (id === 'foxfirst') return Math.min(1, this.tallyOf('fox') || (d.fox && d.fox.last ? 1 : 0));
    if (id === 'rusty') return this.tallyOf('foxout');
    return this.tallyOf(id);
  }
  mileReached(id) { const v = this.mileValue(id); return MILES[id].at.filter(n => v >= n).length; }
  mileClaimed(id) { return Math.min(MILES[id].at.length, (this.data.mile && this.data.mile[id]) || 0); }
  milesReady() { return MILE_IDS.filter(id => this.mileReached(id) > this.mileClaimed(id)).length; }
  milePay(id, step) { const M = MILES[id]; return M.pay ? { coins: M.pay[0], xp: M.pay[1] } : { coins: MILE_PAY.coins[step], xp: MILE_PAY.xp[step] }; }
  claimMile(id) {
    if (!MILES[id]) return null;
    const got = this.mileClaimed(id); if (this.mileReached(id) <= got) return null;
    const P = this.milePay(id, got); (this.data.mile || (this.data.mile = {}))[id] = got + 1; this.data.coins += P.coins; this.data.xp += P.xp; this.save();
    return { id, step: got, ...P, keepsake: got + 1 === MILES[id].at.length };
  }
  // ---- the goodnight round (10 Nov 2026, Audrey's choice for the evening visit): from dusk, once an evening: every coop's
  // door shut for the night, a few coins and XP; done already, or not yet evening: null
  nightDone(now = Date.now()) { return this.data.gn === nightKey(now); }
  nightOpen(now = Date.now(), hour = new Date(now).getHours()) { return hour >= NIGHT.from && !this.nightDone(now); }
  goodnight(now = Date.now(), hour = new Date(now).getHours()) {
    if (!this.nightOpen(now, hour)) return null;
    const k = nightKey(now); let doors = 0;
    for (const c of this.data.coops) if (!isDuck(c.breed) && c.shut !== k) { c.shut = k; doors++; }
    this.data.gn = k; this.data.coins += NIGHT.coins; this.data.xp += NIGHT.xp; this.tallyAdd('night', 1, false); this.save();
    return { doors, coins: NIGHT.coins, xp: NIGHT.xp, n: this.tallyOf('night') };
  }
  // the morning's worms (10 Nov 2026: a child who fishes ran out on her third day): a few each day, the first time the
  // farm is open that day, once fishing is; those found (0: already, or the bag full)
  dawnWorms(now = Date.now()) {
    if (!this.fishOpen('pond')) return 0;
    const f = this.fishBag(), day = dayKey(now); if (f.dawn === day) return 0;
    const first = f.dawn === undefined; f.dawn = day;
    const n = first ? 0 : Math.max(0, Math.min(DAWN_WORMS, FISHING.maxWorms - f.worms)); f.worms += n; this.save();      // (not on the day fishing opens: the tin given then)
    return n;
  }
  jobReward() { return jobReward(this.jobs().lv); }
  jobsReady(now = Date.now()) { return this.jobs(now).list.filter(j => j.got >= j.n && !j.paid).length; }
  claimJob(i, now = Date.now()) {
    const J = this.jobs(now), j = J.list[i]; if (!j || j.got < j.n || j.paid) return null;
    const r = jobReward(J.lv); j.paid = true; this.data.coins += r.coins; this.data.xp += r.xp;
    let worms = 0;      // (all three done: a few worms more, once a day)
    if (!J.bonus && J.list.every(x => x.paid) && this.fishOpen('pond')) { J.bonus = true; const f = this.fishBag(); worms = Math.max(0, Math.min(JOBS_BONUS, FISHING.maxWorms - f.worms)); f.worms += worms; }
    this.save();
    return { ...r, worms };
  }
  claimJobs(now = Date.now()) { const J = this.jobs(now); let coins = 0, xp = 0, worms = 0, n = 0; J.list.forEach((j, i) => { const r = this.claimJob(i, now); if (r) { coins += r.coins; xp += r.xp; worms += r.worms; n++; } }); return n ? { coins, xp, worms, n } : null; }
  jobText(j) { return j.n === 1 && (j.k === 'eggs' || j.k === 'cuddle') ? this.t('job_' + j.k + '1') : this.t('job_' + j.k, { n: j.n }); }
  lookedAtJobs() { const J = this.jobs(); if (!J.seen) { J.seen = true; this.save(); } }
  rosettesOf(b) { return b.ros && b.ros.length === 9 ? b.ros : [0, 0, 0, 0, 0, 0, 0, 0, 0]; }
  champion(b) { const r = this.rosettesOf(b); return r[6] > 0 ? 'n' : r[3] > 0 ? 'c' : null; }
  // a cuddle (the farmer's visit to the pen only shows it): happy for 6 hours; while trust is still growing, one more
  // cuddle's worth of trust and a little experience; best friends: +20 XP
  cuddle(id, now = Date.now()) {
    const b = this.bird(id); if (!b) return null;
    const left = this.happyLeft(b, now); if (left > 0) return { happy: true, left };
    const lv0 = this.trustLevel(b), s0 = this.stars(b, now);
    b.happy = now + UPGRADE.happyH[lookOf(this.coop(b.coop))] * 3600e3;      // (sooner again in a Cosy or Deluxe coop)
    if (b.trust < TRUST_AT[3]) { b.trust++; b.exp = Math.min(1e7, b.exp + EXP_CUDDLE); }
    const lv = this.trustLevel(b), xp = (lv > lv0 && lv === 3 ? XP_BEST : 0) + FRESH.cuddle;
    this.data.xp += xp;
    const done = this.job('cuddle', 1, now);
    return { trust: b.trust, level: lv, up: lv > lv0 ? lv : 0, xp, star: this.stars(b, now) > s0, done };
  }
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
      const duck = isDuck(breed), pea = isPea(breed);
      const b = { id: this.id('b'), name: pick(sex === 'r' ? (duck ? DRAKE_NAMES : pea ? PEACOCK_NAMES : ROO_NAMES) : duck ? DUCK_NAMES : pea ? PEAHEN_NAMES : HEN_NAMES), sex, breed, pers: p, coop: coopId, since: now, exp: 0, trust: 0 };
      if (sex === 'h') b.laid = now;
      b.happy = 0; b.ros = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      return b;
    });
  }
  newFarm({ lang, look, name }) {
    const now = Date.now();
    this.lang = langOk(lang);
    this.data = { v: SAVE_V, made: now, lang: this.lang, coins: 100, xp: 0, cv: CV, farmer: { look: look === 'f' ? 'f' : 'm', name: cleanName(name) }, land: [0], lvSeen: 1, coops: [], birds: [], cleared: [], next: 1 };
    const coop = { id: this.id('c'), breed: 'rir', tier: 0, ...HOME_COOP, name: '', eggs: 0, bonus: 0, feed: 3 * FEED_DAYS, fedAt: now, brood: null, lastBrood: 0, checked: now };
    this.data.coops.push(coop);
    this.data.birds.push(...this.trio('rir', coop.id, true));
    const mum = this.data.birds.find(b => b.pers === 'mum') || this.data.birds.find(b => b.sex === 'h');
    this.data.first = { hen: mum.id, t: firstEggAt(now) };
    this.data.news = [];
    this.data.shows = { in: [], res: [], seen: '' };
    this.data.decor = [];                              // (in the order the save check gives: a reload the same farm)
    this.data.dresses = [];
    this.data.wheat = { x: null, z: null, deg: 45, ripe: 0 }; delete this.data.wheat2; this.data.grain = 0; this.data.pantry = { eggs: 0, val: 0, honey: 0 }; this.data.lastSeen = now; this.data.guide = { step: 0, done: false };
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
  eggPrice(c) { return EGG_PRICE[baseBreed(c.breed)] || 6; }
  henEggPrice(b) { return (EGG_PRICE[baseBreed(b.breed)] || 6) + this.stars(b); }                  // (a coin more for each of her stars)
  // the lays due since each hen last laid (her own times, and a new farm's first egg), oldest first; not yet laid: the
  // farm (main.js) has each hen walk in and lay while it's open, or lays them straight away (layEgg)
  dueLays(now = Date.now()) {
    const out = [];
    for (const b of this.data.birds) {
      if (b.sex !== 'h') continue;
      const from = Math.max(b.laid, b.since, now - CATCH_UP);
      if (from >= now || this.brooding(b.id)) continue;                 // (sitting or raising chicks: no eggs for sale)
      const lk = lookOf(this.coop(b.coop));
      for (let day = dayStart(from); day <= now; day = nextDay(day)) for (const t of lookLays(b.id, day, lk, baseBreed(b.breed) === 'sil')) if (t > from && t <= now) out.push({ hen: b.id, coop: b.coop, t });      // (a Silkie lays one a day, in the afternoon: Silkies are better mums than layers)
      const f = this.data.first;
      if (f && f.hen === b.id && f.t > b.laid && f.t <= now) out.push({ hen: b.id, coop: b.coop, t: f.t, first: true });
      const c = this.coop(b.coop), tr = c && c.treat;      // (a treat from the garden: her extra eggs soon after, if she was there for it)
      if (tr && b.since <= tr.t) for (let k = 0; k < CROPS[tr.crop].eggs; k++) { const t = treatEggAt(tr.t, b.id, k); if (t > from && t <= now) out.push({ hen: b.id, coop: b.coop, t, treat: true }); }
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
    else { c.eggs++; c.bonus = (c.bonus || 0) + this.stars(b, t); c.lt = [...(c.lt || []), t].slice(-c.eggs); }      // (when each egg in the nest was laid: fresh ones earn more)
    this.save();
    return res;
  }
  // ---- broody hens and their chicks
  chickPrice(c) { return CHICK_PRICE[baseBreed(c.breed)] || 20; }
  hatchAt(c) { return c.brood ? c.brood.start + SIT_MS : 0; }
  grownAt(c) { return c.brood ? c.brood.start + SIT_MS + GROW_MS : 0; }
  youngAt(c) { return c.brood ? c.brood.start + SIT_MS + YOUNG_MS : 0; }
  // a brood's youngsters, when they hatch: hen or rooster, and a rating from the parents' experience (a good mum's a little
  // better), with a little luck either way
  kidsOf(c, br) {
    const mum = this.bird(br.hen), dad = this.birdsIn(c.id).find(x => x.sex === 'r');
    const base = 1 + ((mum ? this.stars(mum) : 0) + (dad ? this.stars(dad) : 0)) / 2 + (mum && mum.pers === 'mum' ? 0.4 : 0) + UPGRADE.kids[lookOf(c)];      // (the coop's look: a little either way)
    const rl = RARE_FROM[c.breed], own = BREED_INFO[c.breed] && BREED_INFO[c.breed].rare, chance = RARE.base + RARE.star * ((mum ? this.stars(mum) : 0) + (dad ? this.stars(dad) : 0));
    return Array.from({ length: br.n }, (_, i) => {
      const key = br.hen + '|' + br.start + '|' + i;
      const k = { sex: hash01(key + '|sex') < 0.5 ? 'h' : 'r', stars: Math.max(1, Math.min(5, Math.round(base + hash01(key + '|q') * 1.5 - 0.5))) };
      if (own) k.rare = c.breed;                                      // (a rare pair's chicks: all their colour)
      else if (rl && hash01(key + '|rare') < chance) k.rare = rl;     // (a rare colour: the luck of the day, more likely with stars)
      return k;
    });
  }
  // rare babies: room for one more of that colour (a rooster and two hens at most: the basket, the ones waiting for your
  // choice, and later their own coop), the ones waiting, and keeping or selling one
  rareCount(line, sex) { const d = this.data; return [...(d.basket || []), ...d.birds, ...(d.rare || [])].filter(b => (b.line || b.breed) === line && b.sex === sex).length; }
  rareRoom(line, sex) { return this.rareCount(line, sex) < (sex === 'r' ? 1 : 2); }
  rareWaiting() { return this.data.rare || []; }
  basket() { return this.data.basket || []; }
  keepRare(id, now = Date.now()) {
    const R = this.data.rare || [], k = R.findIndex(x => x.id === id); if (k < 0) return null;
    const e = R[k], used = new Set([...this.data.birds, ...this.basket()].map(b => b.name));
    const names = (e.sex === 'r' ? ROO_NAMES : HEN_NAMES).filter(n => !used.has(n)), name = names.length ? names[Math.floor(hash01(e.id + '|name') * names.length)] : (e.sex === 'r' ? ROO_NAMES : HEN_NAMES)[0];
    const pers = (e.sex === 'r' ? PERS.filter(x => x !== 'mum') : PERS)[Math.floor(hash01(e.id + '|pers') * (e.sex === 'r' ? 4 : 5))];
    const b = { id: e.id, name, sex: e.sex, breed: e.line, pers, since: now, exp: e.stars * 100 - 100, trust: 0, happy: 0, ros: [0, 0, 0, 0, 0, 0, 0, 0, 0] };      // (her rating as a youngster: her stars to start)
    R.splice(k, 1);
    const home = this.data.coops.find(c => c.breed === e.line);
    if (home) {                                                          // (her colour's coop: straight in, as a coop's own bird)
      const nb = { id: b.id, name: b.name, sex: b.sex, breed: b.breed, pers: b.pers, coop: home.id, since: b.since, exp: b.exp, trust: 0 };
      if (b.sex === 'h') nb.laid = now; nb.happy = 0; nb.ros = b.ros; this.data.birds.push(nb); this.save();
      return { ...nb, home };
    }
    (this.data.basket = this.data.basket || []).push(b);
    this.save();
    return b;
  }
  sellRare(id) {
    const R = this.data.rare || [], k = R.findIndex(x => x.id === id); if (k < 0) return null;
    const e = R[k], coins = rarePrice(e.stars);
    R.splice(k, 1); this.data.coins += coins; this.save();
    return { ...e, coins };
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
          if (!br.hatched && hatch <= now) { br.hatched = true; br.kids = this.kidsOf(c, br); this.data.xp += XPV.hatch; out.push({ type: 'hatch', coop: c.id, hen: br.hen, n: br.n, t: hatch }); dirty = true; continue; }
          if (grown <= now) {
            const kids = (br.kids && br.kids.length === br.n ? br.kids : this.kidsOf(c, br)).map((k, i) => {
              if (!k.rare) return { ...k, coins: kidPrice(this.chickPrice(c), k.stars) };
              if (this.rareRoom(k.rare, k.sex)) {                         // (a rare one: yours to keep or sell, when you next look)
                const id = this.id('b');
                (this.data.rare = this.data.rare || []).push({ id, line: k.rare, sex: k.sex, stars: k.stars, coop: c.id, i, mum: br.hen, t: grown });
                return { ...k, coins: 0, wait: id };
              }
              return { ...k, coins: BREED_INFO[c.breed].rare ? Math.round(rarePrice(k.stars) * RARE.bred) : rarePrice(k.stars), full: true };     // (the trio of that colour complete: sold for you; a rare pair's own, for less)
            });
            const coins = kids.reduce((a, k) => a + k.coins, 0), xp = Math.round(kids.reduce((a, k) => a + XPV.chick + XPV.star * k.stars, 0)), dad = this.birdsIn(c.id).find(x => x.sex === 'r');
            this.data.coins += coins; this.data.xp += xp; c.lastBrood = grown; c.brood = null; this.tallyAdd('chicks', kids.length, false);
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
          if (hash01(h.id + '|brood|' + day) >= (h.pers === 'mum' ? BROODY_P.mum : BROODY_P.other) * (BREED_INFO[c.breed] && BREED_INFO[c.breed].rare ? RARE.broody : 1)) continue;      // (a rare pair: less often)
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
  // how many of a nest's eggs are fresh now (laid within 3 hours)
  freshIn(c, now = Date.now()) { return Math.min(c.eggs || 0, (c.lt || []).filter(t => t <= now && now - t <= FRESH.ms).length); }
  // the words for eggs sold (collect's result): fresh ones say so, with the XP
  soldText(r) {      // (eggs collected: to the pantry, the XP; any that didn't fit: sold)
    const t = !r.kept ? '' : r.fresh ? this.t(r.kept === 1 ? 'eggs_pantry_f1' : 'eggs_pantry_f', { n: r.kept, f: Math.min(r.fresh, r.kept), xp: r.xp }) : this.t(r.kept === 1 ? 'eggs_pantry1' : 'eggs_pantry', { n: r.kept, xp: r.xp });
    return r.sold ? (t ? t + ' · ' : '') + this.t('pantry_over', { n: r.sold, c: r.coins }) : t;
  }
  // tap the nest: its eggs sold, coins and XP
  collect(coopId, now = Date.now()) {
    const c = this.coop(coopId); if (!c || !c.eggs) return null;
    const n = c.eggs, fresh = this.freshIn(c, now), P = this.pantryBag(), kept = Math.max(0, Math.min(n, this.shelf('eggs') - P.eggs)), sold = n - kept;      // (to the pantry, with what they're worth: sold from there; what doesn't fit is sold now)
    const worth = n * this.eggPrice(c) + Math.min(c.bonus || 0, n * MAX_STARS), keptVal = Math.round(worth * kept / n), coins = worth - keptVal, xp = n * XPV.egg + fresh * FRESH.xp;
    P.eggs += kept; P.val += keptVal;
    c.eggs = 0; c.bonus = 0; c.lt = []; this.data.coins += coins; this.data.xp += xp;
    this.tallyAdd('eggs', n, false);
    const done = this.job('eggs', n);
    return { n, fresh, coins, xp, done, kept, sold, toOrder: 0, to: [] };
  }
  // what filling the feeder now would cost, and how much it would get: all of it, what the coins can buy, or (no coins and
  // nothing left in it) a free handful of kitchen scraps, a unit, so the hens can always go on laying
  fillQuote(c, now = Date.now()) {
    const cap = this.feedCap(c), left = this.feedAt(c, now), need = cap - left;
    if (need < cap * 0.05) return { full: true, cost: 0, buy: 0, left: left / cap };
    const grain = Math.min(this.data.grain || 0, need), cost = Math.ceil((need - grain) * FEED_PRICE - 1e-9);      // (the wheat field's grain first)
    if (this.data.coins >= cost) return { cost, buy: need, grain, left: left / cap };
    const units = Math.floor(this.data.coins / FEED_PRICE);
    if (units + grain >= 1) return { cost: units * FEED_PRICE, buy: units + grain, grain, partial: true, left: left / cap };
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
    if (q.grain) this.data.grain = Math.max(0, Math.round(((this.data.grain || 0) - q.grain) * 100) / 100);
    q.xp = q.scraps ? 0 : Math.round(XPV.fill * q.buy / cap); this.data.xp += q.xp;
    q.level = c.feed / cap;
    q.done = this.job('feed', 1, now);
    return q;
  }
  setLang(l) { this.lang = langOk(l); if (this.data) { this.data.lang = this.lang; this.save(); } }
  musicOn() { return !this.data || this.data.music !== false; }
  setMusic(on) { if (!this.data) return; if (on) delete this.data.music; else this.data.music = false; this.save(); }
  soundsOn() { return !this.data || this.data.sounds !== false; }
  setSounds(on) { if (!this.data) return; if (on) delete this.data.sounds; else this.data.sounds = false; this.save(); }
  // ---- saving: on the phone, sealed; every load checked
  save() {
    if (!this.data || !this.store) return;
    // (the milestones' "coins earned": every time the purse has grown since the last save)
    if (this._coins !== undefined && this.data.coins > this._coins) { const T = this.data.tally || (this.data.tally = {}); T.coins = Math.min(1e9, (T.coins || 0) + this.data.coins - this._coins); }
    this._coins = this.data.coins;
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
    for (const c of d.coops) delete c.plot;            // (a farm from before coops could be moved: their place now)
    if (d.fish && 'free' in d.fish) { d.fish.worms = Math.min(FISHING.maxWorms, d.fish.worms + d.fish.free); delete d.fish.free; delete d.fish.day; }      // (from when worms came free each morning: those left kept)
    const cv = d.cv || 0;                              // (a farm from before the coops' looks: its coops are Snug, release 4; from before a breed's: that breed's)
    if (cv < CV) { for (const c of d.coops) if (cv === 0 || (LOOKS_CV[baseBreed(c.breed)] || 0) > cv) c.tier = Math.max(2, c.tier); d.cv = CV; }
    return d;
  }
  wipe() { try { this.store && this.store.removeItem(SAVE_KEY); } catch (e) { /* */ } this.data = null; }
  // the farm code for this farm (as saved on the phone, its seal with it); a pasted one put in its place (the page then
  // opens it again: checked as it loads)
  async farmCode() { this.save(); let raw = null; try { raw = JSON.parse(this.store.getItem(SAVE_KEY) || 'null'); } catch (e) { raw = null; } return makeFarmCode(raw || { d: this.data, s: seal(JSON.stringify(this.data)) }); }
  async loadCode(code) {
    const r = await readFarmCode(code); if (!r || r.old) return r;
    try { this.store.setItem(SAVE_KEY, JSON.stringify(r.raw)); } catch (e) { return null; }
    return r;
  }
  onChange(f) { this.listeners.push(f); }
}
