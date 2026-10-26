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
    trust_body: 'Cuddles build trust: one counts every 6 hours.',
    exp_how: 'Stars come with time on the farm, cuddles and raising chicks.', exp_top: 'All five stars!',
    exp_eggs: 'Each star makes her eggs a coin dearer.', exp_chicks: 'The more stars, the better his chicks.',
    trust_next: '{n} more cuddles to “{level}”', trust_next1: '1 more cuddle to “{level}”', trust_greets: 'Comes to the fence to greet {farmer}.',
    cuddle_btn: '♥ Cuddle', happy_left: 'Happy after a cuddle: {when} left', cuddle_night: 'Cuddles in the morning: {farmer} is asleep.',
    cuddle_done: '{farmer} gives {name} a cuddle ♥ +{xp} XP', trust_up1: '{name} is getting friendly with {farmer}.',
    trust_up2: '{name} trusts {farmer} now, and comes to the fence to say hello.', trust_up3: '{name} and {farmer} are best friends! +{xp} XP',
    star_up: '★ {name} has earned a new star!',
    lives_in: 'Lives in: {coop}', since: 'On your farm since {date}',
    coop_rustic: '{coop} (rustic)',
    level_title: 'Level {n}', level_xp: '{xp} of {need} XP to level {next}', level_top: 'Top level!',
    level_how: 'Look after your birds to earn XP.',
    level_up: 'Level {n}!', level_up_sub: 'Your farm is growing.', level_new: 'New at this level',
    land_new: 'A new field is for sale: {c} coins', land_show: 'See the field', level_next_land: 'At level {n}: a new field for sale',
    land_count: 'Your land: {n} fields', land_count1: 'Your land: 1 field', land_all: 'All the land is yours!',
    land_title: 'A field', land_body: 'Wild meadow with room for a coop or two. Buy it and it’s yours for good: the grass is cut and your fence moves out round it.',
    land_buy: 'Buy for {c} coins', land_broke: 'Not enough coins yet ({c})', land_bought: 'The new field is yours!', land_wild: 'Wild meadow · for sale at level {n}',
        sale_sign: 'FOR SALE', bub_sale: 'For sale',
    coop_lives: '{names} live here.', and: 'and', rustic: 'rustic',
    move_body: 'Put it anywhere on your land. Trees, bushes and rocks in the way are cleared.', move_btn: 'Move this coop',
    move_hint: 'Drag the coop, or tap where it should go.', move_ok: 'A good spot!', move_clear: 'A good spot! What’s in the way will be cleared.',
    move_land: 'Only on your own land.', move_lane: 'Not on a lane or in the water.', move_room: 'Not enough room here.', move_coop: 'Too close to another coop.',
    move_gate: 'Its gate would be shut in here.', move_turn: 'Turn', move_cancel: 'Cancel', move_place: 'Put it here', moved: 'The coop is in its new place!',
    move_busy: 'Not just now: try again in a moment.',
    coops_title: 'Your coops', coops_aria: 'Your coops', coops_waiting: 'A new coop is waiting for you', coops_new: 'New!', trio_new: 'New breed: {breed}!', trio_new_col: 'New Silkie colour: {col}!',
    trio_body: 'A rooster and two hens, yours for good, with their own coop. Put it anywhere on your land.',
    place_now: 'Place their coop now', later: 'Later', later_note: 'It waits for you in Your coops (the little barn up top).', place_btn: 'Place it',
    move_short: 'Move', coops_next: 'At level {n}: {breed}', coops_all: 'Every breed is on your farm!',
    no_room: 'No room on your land for another coop yet: buy the next field.', welcome_trio: 'Welcome, {names}!',
    book_title: 'Breed Book', book_btn: '📖 Breed Book', book_found: '{n} of {all} breeds found', book_found1: '1 of {all} breeds found',
    book_on_farm: 'On your farm: {names}', book_at_level: 'Comes at level {n}', book_waiting: 'Their coop is waiting for you in Your coops',
    book_price: '{p} coins an egg, plus a coin for each star of the hen', book_coop: '{coop}, rustic to start', book_more: 'More pages to come.',
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
    dec_place_hint: 'Drag it, or tap where it should go.', dec_ok: 'A good spot!', dec_ok_clear: 'A good spot! What’s in the way will be cleared.', dec_bad_land: 'Only on your own land.', dec_bad_lane: 'Not on a lane or in the water.', dec_bad_room: 'Not enough room here.', dec_bad_way: 'It would block the way to a coop.',
    dec_placed: 'New on the farm: {name}! +{xp} XP', dec_moved: '{name}: moved!', dec_new: 'New to buy: {names}', dec_card_body: 'Move it anywhere on your land.', dec_new_where: 'In the shop: tap your coins at the top.', dec_no_room: 'No room for it on your land just now: buy the next field, or move things about.', dec_pond_hint: 'Your duck house is on the pond! The ducks will sleep in it tonight.',
    shop_decor: 'Decorations', shop_outfits: 'Outfits', outfits_note: 'New clothes for {farmer}. Each one gives XP when you buy it.',
    shop_animals: 'Animals', ani_geese: 'Gertrude and Hector, the geese', anil_geese: 'A pair of geese for the pond: they graze, swim, honk at everything and squabble now and then.',
    ani_dog: '{name}, the farm dog', anil_dog: 'A Border Collie with his kennel and his ball: he does his rounds of the coops, plays, teases the geese, and you choose his name.',
    ani_dog_owned: 'On your farm', ani_see_dog: 'See him', ani_move_kennel: 'Move his kennel', ani_rename: 'Rename', kennel_name: 'Kennel',
    dog_came: '{name} has come to live on your farm! +{xp} XP', kennel_moved: '{name}’s kennel: moved!',
    ani_buy: 'Buy · {c}', ani_owned: 'At the pond', ani_see: 'See them',
    fox_title: 'Last night on the farm', fox_watch: '🎞 Watch it', fox_ok: 'OK',
    fox_eggs: 'Rusty the fox found the door of {hen}’s coop open and took {n} eggs from the nest. The hens are fine, just a little ruffled.',
    fox_eggs1: 'Rusty the fox found the door of {hen}’s coop open and took an egg from the nest. The hens are fine, just a little ruffled.',
    fox_empty: 'Rusty the fox found the door of {hen}’s coop open, but the nest was empty: {hen} pecked him on the nose and he went home.',
    fox_shut: 'Rusty the fox came for the eggs, but the doors were shut. He went home empty-handed.',
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
    away_hatched: '{name} hatched {n} chicks', away_grown: '{name}’s chicks have grown up: their card is next', away_honey: '{n} jars of honey in the hives', away_honey1: 'A jar of honey in the hives',
    away_wheat: 'Your wheat is ripe: tap the field to harvest it', away_wheat_grow: 'Your wheat is growing: ripe in {t}', away_feed: '{coop}: the feeder is empty', away_feed_low: '{coop}: the feeder is low',
    away_show: 'The show results are in: they’re next', away_jobs: 'New jobs for today', away_jobs_ready: '{n} job rewards to collect', away_jobs_ready1: 'A job reward to collect',
    away_collect: 'Collect all eggs ({n})', away_ok: 'Off to the farm', away_sold: '{n} eggs sold · +{c} coins',
    intro_1: 'Your forever flock', intro_1b: 'Your three Rhode Island Reds are yours for good. Cuddle them: they trust you more, earn stars and lay better eggs.',
    intro_2: 'Eggs and chicks', intro_2b: 'Each hen lays about two eggs a day: collect them to sell. Now and then a hen raises chicks; grown up, they leave for a new farm and you earn coins.',
    intro_3: 'Land and new breeds', intro_3b: 'Each level brings a field to buy, and new breeds arrive as trios with their own coop. Put everything where you like.',
    intro_4: 'Shows, honey and more', intro_4b: 'Win rosettes at shows, grow wheat for the feeders, decorate your farm and sell honey. At your own pace: a little each day.',
    intro_next: 'Next', intro_go: 'Let’s go!', intro_skip: 'Skip',
    guide_n: 'First day · {n} of {of}', guide_skip: 'Skip', guide_show: 'Show me',
    guide_eggs: 'Collect your first egg: tap the egg over the Red Barn.', guide_eggs_wait: 'Your first egg is on its way: a hen will go in to lay in a moment.',
    guide_cuddle: 'Give a hen a cuddle: tap a hen, then ♥ Cuddle.', guide_cuddle_card: 'Now tap ♥ Cuddle.',
    guide_sow: 'Sow your wheat field: tap its sign, then Sow.', guide_sow_card: 'Tap Sow: the wheat will feed your hens.',
    guide_jobs: 'Today’s jobs: tap the clipboard at the top.', guide_shop: 'Tap your coins: the shop for decorations, animals and outfits.',
    guide_did: 'Well done! +{c} coins', guide_done: 'Your first day is done! +{c} coins. A new field comes at level 2.',
    jobs_title: 'Today’s jobs', jobs_aria: 'Today’s jobs', jobs_new: 'new jobs today', jobs_ready: '{n} to collect',
    job_eggs: 'Collect {n} eggs', job_eggs1: 'Collect an egg', job_cuddle: 'Give {n} cuddles', job_cuddle1: 'Give a cuddle', job_feed: 'Fill a feeder', job_show: 'Enter a bird in a show',
    job_reward: '+{c} coins · +{xp} XP', job_claim: 'Collect', job_paid: 'Done ✓', jobs_note: 'New jobs every day at midnight.',
    job_done: 'Job done: {job}! Collect your reward in Today’s jobs.', job_claimed: '+{c} coins · +{xp} XP',
    show_sign_v: 'Village Show', show_sign_c: 'County Show', show_sign_n: 'National Championship',
    showday_title: 'Show day!', showday_body: 'The results of the {show} are in: the judge is looking at the birds.', showday_watch: 'Watch the judging', showday_results: 'Just the results', skip: 'Skip',
    sd_arrive: '{farmer} brings {name} to the show…', sd_judge: 'The judge looks at every bird…', sd_rosettes: 'And now, the rosettes!',
    champ_c: 'County champion', champ_n: 'National champion', show_new_c: 'The County show: entry {f}, 1st prize {p} coins', show_new_n: 'The National Championship: entry {f}, 1st prize {p} coins',
    book_sil: 'White Silkie', egg_rir: 'Brown eggs', egg_orp: 'Light brown eggs', egg_sil: 'Cream-tinted eggs', egg_leg: 'Blue eggs', egg_bra: 'Light brown eggs',
    coins_body: 'Coins come from your eggs and your grown chicks. You’ll spend them on feed, land, coops and more.',
    settings_lang: 'Language', settings_new: 'Start a new farm', settings_new_sure: 'Tap again to start again from nothing',
    settings_edited: 'This farm was changed outside the game: everything in it has been checked.',
    settings_version: 'Version {v}',
    saved_here: 'Your farm is saved on this phone.',
    code_t: 'Your farm code', code_how: 'Copy your farm code and keep it somewhere safe (Notes is fine). Paste it here on another phone, or after clearing Safari, to carry on where you left off.',
    code_copy: 'Copy my farm code', code_paste: 'Paste a farm code here', code_load: 'Load this farm', code_load_sure: 'Tap again to replace this farm', code_note: 'Loading a farm replaces the one on this phone.',
    code_copied: 'Farm code copied. Paste it into Notes to keep it safe.', code_select: 'Here is your farm code: select it all and copy it.', code_bad: 'That farm code doesn’t work. Copy it again, all of it.',
    code_old: 'That code is from the first Feather & Field: this new farm starts fresh.', code_loaded: 'Farm loaded: level {n}. Welcome back!',
    first_t: 'The first Feather & Field', first_how: 'Your farm from the first game is kept just as it was. Open it whenever you like.', first_open: 'Open the first game',
    welcome_first: 'Your farm from the first game is safe in Settings.',
    loading: 'Loading your farm…',
    eggs: 'Eggs', lays: 'Lays about 2 eggs a day, {p} coins each.', lays_sil: 'Lays about an egg a day, {p} coins each: Silkies are better mums than layers.',
    eggs_sold1: '1 egg sold · +{c} coins', eggs_sold: '{n} eggs sold · +{c} coins',
    eggs_fresh1: '1 fresh egg sold · +{c} coins · +{xp} XP', eggs_fresh: '{n} eggs sold · +{c} coins · {f} fresh: +{xp} XP',
    no_eggs: 'No eggs yet', laying: '{name} is laying…',
    first_egg: '{name} has laid your first egg! Tap the nest to collect it.',
    nest_full: 'The nest is full: collect the eggs so your hens can lay again.',
    feeder_title: 'Feeder · {coop}', feed_full: 'Full', feed_pct: '{p}% full', feed_empty: 'Empty',
    feed_hours: 'Enough for about {h} hours.', feed_hour: 'Enough for about an hour.', feed_days: 'Enough for about two days.',
    feed_empty_line: 'Your hens stop laying until it’s filled.',
    feed_how: 'Your hens lay while there’s food in it. Full, it feeds your trio for two days.',
    fill_grain: 'Fill it with your grain (free)', fill_grain_c: 'Fill it · {c} coins + your grain', feed_grain: 'Your grain from the wheat field: {n} (used first).',
    filled_grain: 'Feeder filled with your own grain', farmer_grain: '{farmer} is on the way with your grain',
    wheat_title: 'Your wheat field', wheat_soil: 'Ploughed and ready to sow.', wheat_sown: 'Sown: the first shoots soon.', wheat_sprouts: 'The first green shoots.', wheat_growing: 'Growing tall and green.', wheat_ripe: 'Golden and ready to harvest!',
    wheat_how: 'Sow it for {c} coins; 4 hours later it’s ripe. Harvested, it gives {g} grain for your feeders (they use it before coins) and {xp} XP.',
    wheat_left: 'Ripe in {t}', wheat_store: 'Grain in store: {n} of {max}', wheat_sow: 'Sow · {c} coins', wheat_harvest: 'Harvest', wheat_move: 'Move the field', wheat_broke: 'Not enough coins to sow yet',
    bub_sow: 'Sow', bub_harvest: 'Harvest', wheat_sowing: '{farmer} is on the way to sow the wheat · −{c} coins', wheat_sowed: 'Wheat sown · −{c} coins. Ripe in 4 hours.',
    wheat_cutting: '{farmer} is on the way to harvest the wheat', wheat_done: 'Wheat harvested: +{g} grain for the feeders · +{xp} XP', wheat_full: 'Wheat harvested · +{xp} XP (your grain store is full)',
    honey_title: 'Honey', honey_jars: '{n} jars of honey', honey_jar: 'A jar of honey', honey_none: 'No honey yet: the next jar in {t}.', honey_going: '{farmer} is on the way to the beehives',
    honey_sold: '{n} jars of honey sold · +{c} coins', honey_sold1: 'A jar of honey sold · +{c} coins',
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
    hen: 'Poule', rooster: 'Coq',
    forever_h: 'Dans votre basse-cour pour toujours', forever_r: 'Dans votre basse-cour pour toujours',
    personality: 'Caractère', experience: 'Expérience', trust: 'Confiance',
    exp_none: 'Tout juste arrivé : l’expérience vient avec le temps passé à la ferme et l’affection que vous donnez.',
    trust_lv0: 'Farouche', trust_lv1: 'Sociable', trust_lv2: 'En confiance', trust_lv3: 'Inséparable',
    trust_body: 'Les câlins donnent confiance : un compte toutes les 6 heures.',
    exp_how: 'Les étoiles viennent avec le temps passé à la ferme, les câlins et les poussins élevés.', exp_top: 'Les cinq étoiles !',
    exp_eggs: 'Chaque étoile rend ses œufs une pièce plus chers.', exp_chicks: 'Plus il a d’étoiles, meilleurs sont ses poussins.',
    trust_next: 'Encore {n} câlins avant « {level} »', trust_next1: 'Encore 1 câlin avant « {level} »', trust_greets: 'Vient saluer {farmer} à la clôture.',
    cuddle_btn: '♥ Faire un câlin', happy_left: 'Heureux après un câlin : encore {when}', cuddle_night: 'Les câlins, ce sera demain matin : {farmer} dort.',
    cuddle_done: '{farmer} fait un câlin à {name} ♥ +{xp} XP', trust_up1: '{name} devient sociable avec {farmer}.',
    trust_up2: '{name} a confiance en {farmer} et vient lui dire bonjour à la clôture.', trust_up3: '{name} et {farmer} sont inséparables ! +{xp} XP',
    star_up: '★ {name} gagne une nouvelle étoile !',
    lives_in: 'Habite : {coop}', since: 'À la ferme depuis le {date}',
    coop_rustic: '{coop} (rustique)',
    level_title: 'Niveau {n}', level_xp: '{xp} sur {need} XP pour le niveau {next}', level_top: 'Niveau maximum !',
    level_how: 'Prenez soin de vos volailles pour gagner de l’XP.',
    level_up: 'Niveau {n} !', level_up_sub: 'Votre ferme s’agrandit.', level_new: 'Nouveau à ce niveau',
    land_new: 'Un nouveau terrain est à vendre : {c} pièces', land_show: 'Voir le terrain', level_next_land: 'Au niveau {n} : un nouveau terrain à vendre',
    land_count: 'Vos terrains : {n}', land_count1: 'Votre terrain : 1', land_all: 'Tous les terrains sont à vous !',
    land_title: 'Un terrain', land_body: 'Un pré sauvage avec de la place pour un ou deux poulaillers. Achetez-le et il est à vous pour toujours : l’herbe est coupée et votre clôture l’entoure.',
    land_buy: 'Acheter pour {c} pièces', land_broke: 'Pas encore assez de pièces ({c})', land_bought: 'Le nouveau terrain est à vous !', land_wild: 'Pré sauvage · à vendre au niveau {n}',
        sale_sign: 'À VENDRE', bub_sale: 'À vendre',
    coop_lives: '{names} vivent ici.', and: 'et', rustic: 'rustique',
    move_body: 'Installez-le où vous voulez sur votre terrain. Les arbres, buissons et rochers qui gênent sont dégagés.', move_btn: 'Déplacer ce poulailler',
    move_hint: 'Faites glisser le poulailler, ou touchez l’endroit voulu.', move_ok: 'Bel emplacement !', move_clear: 'Bel emplacement ! Ce qui gêne sera dégagé.',
    move_land: 'Seulement sur votre terrain.', move_lane: 'Pas sur un chemin ni dans l’eau.', move_room: 'Pas assez de place ici.', move_coop: 'Trop près d’un autre poulailler.',
    move_gate: 'Sa porte serait bloquée ici.', move_turn: 'Tourner', move_cancel: 'Annuler', move_place: 'Le mettre ici', moved: 'Le poulailler est à sa nouvelle place !',
    move_busy: 'Pas tout de suite : réessayez dans un instant.',
    coops_title: 'Vos poulaillers', coops_aria: 'Vos poulaillers', coops_waiting: 'Un nouveau poulailler vous attend', coops_new: 'Nouveau !', trio_new: 'Nouvelle race : {breed} !', trio_new_col: 'Nouvelle couleur de poule soie : {col} !',
    trio_body: 'Un coq et deux poules, à vous pour toujours, avec leur poulailler. Installez-le où vous voulez sur votre terrain.',
    place_now: 'Installer leur poulailler', later: 'Plus tard', later_note: 'Il vous attend dans Vos poulaillers (la petite grange en haut).', place_btn: 'L’installer',
    move_short: 'Déplacer', coops_next: 'Au niveau {n} : {breed}', coops_all: 'Toutes les races sont dans votre ferme !',
    no_room: 'Pas encore de place sur votre terrain pour un autre poulailler : achetez le prochain terrain.', welcome_trio: 'Bienvenue, {names} !',
    book_title: 'Livre des races', book_btn: '📖 Livre des races', book_found: '{n} races trouvées sur {all}', book_found1: '1 race trouvée sur {all}',
    book_on_farm: 'Dans votre ferme : {names}', book_at_level: 'Arrive au niveau {n}', book_waiting: 'Leur poulailler vous attend dans Vos poulaillers',
    book_price: '{p} pièces l’œuf, plus une pièce par étoile de la poule', book_coop: '{coop}, rustique pour commencer', book_more: 'D’autres pages à venir.',
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
    dec_place_hint: 'Faites-le glisser, ou touchez l’endroit voulu.', dec_ok: 'Bel emplacement !', dec_ok_clear: 'Bel emplacement ! Ce qui gêne sera dégagé.', dec_bad_land: 'Seulement sur votre terrain.', dec_bad_lane: 'Pas sur un chemin ni dans l’eau.', dec_bad_room: 'Pas assez de place ici.', dec_bad_way: 'Cela bloquerait le chemin d’un poulailler.',
    dec_placed: 'Nouveau dans la ferme : {name} ! +{xp} XP', dec_moved: '{name} : c’est déplacé !', dec_new: 'Nouveau à acheter : {names}', dec_card_body: 'Déplacez-le où vous voulez sur votre terrain.', dec_new_where: 'Dans la boutique : touchez vos pièces en haut.', dec_no_room: 'Pas de place sur votre terrain pour l’instant : achetez le prochain terrain, ou déplacez des choses.', dec_pond_hint: 'Votre maison des canards est sur l’étang ! Les canards y dormiront ce soir.',
    shop_decor: 'Décorations', shop_outfits: 'Tenues', outfits_note: 'De nouveaux habits pour {farmer}. Chacun rapporte de l’XP à l’achat.',
    shop_animals: 'Animaux', ani_geese: 'Gertrude et Hector, les oies', anil_geese: 'Un couple d’oies pour l’étang : elles broutent, nagent, cacardent après tout le monde et se chamaillent de temps en temps.',
    ani_dog: '{name}, le chien de la ferme', anil_dog: 'Un border collie avec sa niche et sa balle : il fait le tour des poulaillers, joue, taquine les oies, et c’est vous qui choisissez son nom.',
    ani_dog_owned: 'Dans votre ferme', ani_see_dog: 'Le voir', ani_move_kennel: 'Déplacer sa niche', ani_rename: 'Renommer', kennel_name: 'Niche',
    dog_came: '{name} vient vivre dans votre ferme ! +{xp} XP', kennel_moved: 'La niche de {name} : c’est déplacé !',
    ani_buy: 'Acheter · {c}', ani_owned: 'À l’étang', ani_see: 'Les voir',
    fox_title: 'La nuit dernière à la ferme', fox_watch: '🎞 Le voir', fox_ok: 'OK',
    fox_eggs: 'Rusty le renard a trouvé ouverte la porte du poulailler {dehen} et a pris {n} œufs dans le nid. Les poules vont bien, juste un peu ébouriffées.',
    fox_eggs1: 'Rusty le renard a trouvé ouverte la porte du poulailler {dehen} et a pris un œuf dans le nid. Les poules vont bien, juste un peu ébouriffées.',
    fox_empty: 'Rusty le renard a trouvé ouverte la porte du poulailler {dehen}, mais le nid était vide : {hen} lui a pincé le nez et il est rentré chez lui.',
    fox_shut: 'Rusty le renard est venu pour les œufs, mais les portes étaient fermées. Il est rentré bredouille.',
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
    away_hatched: '{name} a fait éclore {n} poussins', away_grown: 'Les poussins de {name} ont grandi : leur carte arrive', away_honey: '{n} pots de miel dans les ruches', away_honey1: 'Un pot de miel dans les ruches',
    away_wheat: 'Votre blé est mûr : touchez le champ pour le récolter', away_wheat_grow: 'Votre blé pousse : mûr dans {t}', away_feed: '{coop} : la mangeoire est vide', away_feed_low: '{coop} : la mangeoire est presque vide',
    away_show: 'Les résultats des concours sont arrivés : ils arrivent juste après', away_jobs: 'De nouvelles tâches aujourd’hui', away_jobs_ready: '{n} récompenses de tâches à récupérer', away_jobs_ready1: 'Une récompense de tâche à récupérer',
    away_collect: 'Ramasser les œufs ({n})', away_ok: 'À la ferme', away_sold: '{n} œufs vendus · +{c} pièces',
    intro_1: 'Votre basse-cour pour toujours', intro_1b: 'Vos trois Rhode Island Red sont à vous pour toujours. Faites-leur des câlins : elles vous font davantage confiance, gagnent des étoiles et pondent de meilleurs œufs.',
    intro_2: 'Œufs et poussins', intro_2b: 'Chaque poule pond environ deux œufs par jour : ramassez-les pour les vendre. De temps en temps, une poule élève des poussins ; une fois grands, ils partent pour une nouvelle ferme et vous gagnez des pièces.',
    intro_3: 'Terres et nouvelles races', intro_3b: 'Chaque niveau apporte un terrain à acheter, et de nouvelles races arrivent par trio avec leur poulailler. Placez tout où vous voulez.',
    intro_4: 'Concours, miel et plus encore', intro_4b: 'Gagnez des cocardes aux concours, cultivez du blé pour les mangeoires, décorez votre ferme et vendez du miel. À votre rythme : un peu chaque jour.',
    intro_next: 'Suivant', intro_go: 'C’est parti !', intro_skip: 'Passer',
    guide_n: 'Premier jour · {n} sur {of}', guide_skip: 'Passer', guide_show: 'Montrer',
    guide_eggs: 'Ramassez votre premier œuf : touchez l’œuf au-dessus de la Grange rouge.', guide_eggs_wait: 'Votre premier œuf arrive : une poule va aller pondre dans un instant.',
    guide_cuddle: 'Faites un câlin à une poule : touchez une poule, puis ♥ Faire un câlin.', guide_cuddle_card: 'Touchez maintenant ♥ Faire un câlin.',
    guide_sow: 'Semez votre champ de blé : touchez son panneau, puis Semer.', guide_sow_card: 'Touchez Semer : le blé nourrira vos poules.',
    guide_jobs: 'Les tâches du jour : touchez le presse-papiers en haut.', guide_shop: 'Touchez vos pièces : la boutique des décorations, des animaux et des tenues.',
    guide_did: 'Bravo ! +{c} pièces', guide_done: 'Votre premier jour est terminé ! +{c} pièces. Un nouveau terrain arrive au niveau 2.',
    jobs_title: 'Les tâches du jour', jobs_aria: 'Les tâches du jour', jobs_new: 'nouvelles tâches aujourd’hui', jobs_ready: '{n} à récupérer',
    job_eggs: 'Ramasser {n} œufs', job_eggs1: 'Ramasser un œuf', job_cuddle: 'Faire {n} câlins', job_cuddle1: 'Faire un câlin', job_feed: 'Remplir une mangeoire', job_show: 'Inscrire une volaille à un concours',
    job_reward: '+{c} pièces · +{xp} XP', job_claim: 'Récupérer', job_paid: 'Fait ✓', jobs_note: 'De nouvelles tâches chaque jour à minuit.',
    job_done: 'Tâche faite : {job} ! Récupérez la récompense dans Les tâches du jour.', job_claimed: '+{c} pièces · +{xp} XP',
    show_sign_v: 'Concours de village', show_sign_c: 'Concours régional', show_sign_n: 'Championnat national',
    showday_title: 'Jour de concours !', showday_body: 'Les résultats du {show} sont arrivés : le juge regarde les volailles.', showday_watch: 'Regarder le jugement', showday_results: 'Juste les résultats', skip: 'Passer',
    sd_arrive: '{farmer} amène {name} au concours…', sd_judge: 'Le juge regarde chaque volaille…', sd_rosettes: 'Et maintenant, les cocardes !',
    champ_c: 'Champion régional', champ_n: 'Champion national', show_new_c: 'Le concours régional : inscription {f}, 1er prix {p} pièces', show_new_n: 'Le championnat national : inscription {f}, 1er prix {p} pièces',
    book_sil: 'Poule soie blanche', egg_rir: 'Œufs bruns', egg_orp: 'Œufs brun clair', egg_sil: 'Œufs teintés crème', egg_leg: 'Œufs bleus', egg_bra: 'Œufs brun clair',
    coins_body: 'Les pièces viennent de vos œufs et de vos poussins devenus grands. Elles servent à acheter du grain, des terrains, des poulaillers et plus encore.',
    settings_lang: 'Langue', settings_new: 'Commencer une nouvelle ferme', settings_new_sure: 'Touchez encore pour tout recommencer',
    settings_edited: 'Cette ferme a été modifiée hors du jeu : tout son contenu a été vérifié.',
    settings_version: 'Version {v}',
    saved_here: 'Votre ferme est enregistrée sur ce téléphone.',
    code_t: 'Le code de votre ferme', code_how: 'Copiez le code de votre ferme et gardez-le en lieu sûr (dans Notes par exemple). Collez-le ici sur un autre téléphone, ou après avoir vidé Safari, pour reprendre là où vous en étiez.',
    code_copy: 'Copier le code de ma ferme', code_paste: 'Collez un code de ferme ici', code_load: 'Charger cette ferme', code_load_sure: 'Touchez encore pour remplacer cette ferme', code_note: 'Charger une ferme remplace celle de ce téléphone.',
    code_copied: 'Code copié. Collez-le dans Notes pour le garder.', code_select: 'Voici le code de votre ferme : sélectionnez-le en entier et copiez-le.', code_bad: 'Ce code ne fonctionne pas. Copiez-le à nouveau, en entier.',
    code_old: 'Ce code vient du premier Feather & Field : cette nouvelle ferme repart de zéro.', code_loaded: 'Ferme chargée : niveau {n}. Bon retour !',
    first_t: 'Le premier Feather & Field', first_how: 'Votre ferme du premier jeu est gardée telle quelle. Ouvrez-la quand vous voulez.', first_open: 'Ouvrir le premier jeu',
    welcome_first: 'Votre ferme du premier jeu est dans les Réglages.',
    loading: 'Chargement de votre ferme…',
    eggs: 'Œufs', lays: 'Pond environ 2 œufs par jour, à {p} pièces l’œuf.', lays_sil: 'Pond environ un œuf par jour, à {p} pièces l’œuf : les poules soie sont meilleures mères que pondeuses.',
    eggs_sold1: '1 œuf vendu · +{c} pièces', eggs_sold: '{n} œufs vendus · +{c} pièces',
    eggs_fresh1: '1 œuf tout frais vendu · +{c} pièces · +{xp} XP', eggs_fresh: '{n} œufs vendus · +{c} pièces · {f} tout frais : +{xp} XP',
    no_eggs: 'Pas encore d’œufs', laying: '{name} est en train de pondre…',
    first_egg: '{name} a pondu votre premier œuf ! Touchez le nid pour le ramasser.',
    nest_full: 'Le nid est plein : ramassez les œufs pour que vos poules pondent à nouveau.',
    feeder_title: 'Mangeoire · {coop}', feed_full: 'Pleine', feed_pct: 'Pleine à {p} %', feed_empty: 'Vide',
    feed_hours: 'De quoi tenir environ {h} heures.', feed_hour: 'De quoi tenir environ une heure.', feed_days: 'De quoi tenir environ deux jours.',
    feed_empty_line: 'Vos poules ne pondent plus jusqu’à ce qu’elle soit remplie.',
    feed_how: 'Vos poules pondent tant qu’elle contient du grain. Pleine, elle nourrit votre trio pendant deux jours.',
    fill_grain: 'La remplir avec votre grain (gratuit)', fill_grain_c: 'La remplir · {c} pièces + votre grain', feed_grain: 'Votre grain du champ de blé : {n} (utilisé d’abord).',
    filled_grain: 'Mangeoire remplie avec votre propre grain', farmer_grain: '{farmer} arrive avec votre grain',
    wheat_title: 'Votre champ de blé', wheat_soil: 'Labouré et prêt à semer.', wheat_sown: 'Semé : les premières pousses bientôt.', wheat_sprouts: 'Les premières pousses vertes.', wheat_growing: 'Il pousse, haut et vert.', wheat_ripe: 'Doré et prêt à récolter !',
    wheat_how: 'Semez-le pour {c} pièces ; 4 heures plus tard, il est mûr. Récolté, il donne {g} de grain pour vos mangeoires (utilisé avant les pièces) et {xp} XP.',
    wheat_left: 'Mûr dans {t}', wheat_store: 'Grain en réserve : {n} sur {max}', wheat_sow: 'Semer · {c} pièces', wheat_harvest: 'Récolter', wheat_move: 'Déplacer le champ', wheat_broke: 'Pas encore assez de pièces pour semer',
    bub_sow: 'Semer', bub_harvest: 'Récolter', wheat_sowing: '{farmer} va semer le blé · −{c} pièces', wheat_sowed: 'Blé semé · −{c} pièces. Mûr dans 4 heures.',
    wheat_cutting: '{farmer} va récolter le blé', wheat_done: 'Blé récolté : +{g} de grain pour les mangeoires · +{xp} XP', wheat_full: 'Blé récolté · +{xp} XP (votre réserve de grain est pleine)',
    honey_title: 'Miel', honey_jars: '{n} pots de miel', honey_jar: 'Un pot de miel', honey_none: 'Pas encore de miel : le prochain pot dans {t}.', honey_going: '{farmer} va aux ruches',
    honey_sold: '{n} pots de miel vendus · +{c} pièces', honey_sold1: 'Un pot de miel vendu · +{c} pièces',
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
const TEXT_F = { en: { exp_chicks: 'The more stars, the better her chicks.' },
  fr: { exp_none: 'Tout juste arrivée : l’expérience vient avec le temps passé à la ferme et l’affection que vous donnez.', happy_left: 'Heureuse après un câlin : encore {when}',
    exp_chicks: 'Plus elle a d’étoiles, meilleurs sont ses poussins.',
    show_in: '{name} est inscrite : résultats à 7 h, dans {when}', show_entered: '{name} est inscrite au {show} !',
    res_none: '{name} n’est pas classée au {show} cette fois ({place} sur {of}). Le temps à la ferme et les câlins l’aideront.',
    res_champ: '{name} est championne maintenant !', ros_none: 'Pas encore de cocarde : inscrivez-la à un concours (la cocarde en haut).',
    champ_c: 'Championne régionale', champ_n: 'Championne nationale',
    fox_farmer: 'Rusty le renard est venu pour les œufs du poulailler {dehen}, mais {farmer} est sortie avec sa lampe et l’a renvoyé chez lui !' } };

export const BREED_INFO = {
  rir: { name: ['Rhode Island Red', 'Rhode Island Red'], coop: ['Red Barn', 'Grange rouge'] },
  orp: { name: ['Buff Orpington', 'Orpington fauve'], coop: ['Thatched Cottage', 'Chaumière'] },
  sil: { name: ['White Silkie', 'Poule soie blanche'], kind: ['Silkie', 'Poule soie'], col: ['White', 'blanche'], coop: ['Pagoda Coop', 'Poulailler pagode'] },
  leg: { name: ['Cream Legbar', 'Legbar crème'], coop: ['Stone Cottage', 'Maison de pierre'] },
  bra: { name: ['Light Brahma', 'Brahma herminé'], coop: ['Timber Lodge', 'Chalet en rondins'] },
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
// ---- rare Silkie babies (release 2 step 2, game-plan-v2.md §4; Audrey: "Every month or two" a Silkie coop, "When it's
// grown"): each rare colour only from breeding, from its own colour; a chick's chance grows a little with her parents' stars
// (rare all the same). She hatches in her colour; grown, she's yours to keep (into the basket by the farmhouse fire, until
// her own coop: the next step) or to sell, for a lot. Up to a trio of each rare colour (a rooster and two hens): one more
// than that is sold for you. A rare one sells for RARE.price plus RARE.starPrice a star
export const RARE_FROM = { sil: 'sil_paint', sil_black: 'sil_lavender', sil_buff: 'sil_red', sil_blue: 'sil_splash', sil_partridge: 'sil_cuckoo', sil_grey: 'sil_cuckoo' };
export const RARE_LINES = ['sil_paint', 'sil_lavender', 'sil_red', 'sil_splash', 'sil_cuckoo'];
export const RARE = { base: 0.018, star: 0.004, price: 400, starPrice: 50, basket: 15, pending: 6, coop: 2500, bred: 0.4, broody: 0.5 };      // (coop: a rare colour's own coop, release 2 step 3: Audrey, "Buy it, 2,500 coins")
const rareMost = () => RARE.base + RARE.star * 10;      // (the most a chick's chance can be: both parents five stars)
export const rarePrice = stars => RARE.price + RARE.starPrice * stars;
// a line's breed (the Silkie colours are all Silkies: their eggs, chicks, house and shows) and a Silkie line's colour
export function baseBreed(k) { return typeof k === 'string' && k.startsWith('sil') ? 'sil' : k; }
export function silColour(k) { return k === 'sil' ? 'white' : typeof k === 'string' && k.startsWith('sil_') ? k.slice(4) : null; }

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
// experience (release 1 step 7): 100 a star, up to 5; it comes with time on the farm (a little each day, up to two and a
// half stars' worth), cuddles (each one that counts while trust is still growing) and raising chicks (the mum more than
// the rooster); a cuddle counts once every 6 hours (the bird's happy meanwhile)
export const EXP_DAY = 5, EXP_TIME_MAX = 250, EXP_CUDDLE = 8, HAPPY_MS = 6 * 3600e3, XP_BEST = 20;
export const MAX_STARS = 5;

// ---- levels: the XP to reach each level (a first curve; the year-long balance comes with step 9)
export const TOP_LEVEL = 30;
export function xpFor(level) { return level <= 1 ? 0 : Math.round(60 * Math.pow(level - 1, 2.1)); }
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
// place; the other Silkie colours by level with release 2 (Black at 8, Buff 13, Blue 15, Partridge 20, Grey 23)
export const BREED_LEVEL = { rir: 1, orp: 5, sil: 6, sil_black: 8, leg: 11, sil_buff: 13, sil_blue: 15, bra: 17, sil_partridge: 20, sil_grey: 23 };
// (the County show's breed of the day: from the breeds themselves, as before the Silkie colours, so a day's show is the same)
const SHOW_BREED_LEVEL = { rir: 1, orp: 5, sil: 6, leg: 11, bra: 17 };
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
  const come = Object.keys(SHOW_BREED_LEVEL).filter(b => SHOW_BREED_LEVEL[b] <= Math.max(level, SHOWS.c.level));
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
export const foxAt = k => new Date(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8), FOX.from).getTime() + Math.floor(hash01('foxt|' + k) * FOX.hours * 60) * 60e3;
const foxSeenFrom = now => new Date(now).getHours() < 12 ? nightKey(now) : prevNight(nightKey(now));      // (a farm from before the visits: none for a night already over)
export const animalXp = id => Math.round(ANIMALS[id].price / 50);
// ---- the wheat field (release 1 step 9e; the 2D game's, Audrey's own idea; Audrey, 25 Oct: "On your land from the
// start"): sown for 20 coins, ripe 4 hours later; harvested, grain for the feeders (used before coins: a unit of grain is a
// unit of feed) and XP. Starting values (the balance is step 11)
export const WHEAT = { sow: 20, grow: 4 * 3600e3, grain: 20, xp: 12, max: 120 };
// ---- honey (Audrey, 25 Oct: "Bees are great idea, let’s make sure the farmer can harvest the honey and sell it !"): the
// beehives (a decoration) fill a jar every 8 hours, up to 6; harvested, the jars are sold like eggs
export const HONEY = { every: 8 * 3600e3, max: 6, price: 15, xp: 3 };
// ---- the first day's guide (release 1 step 10; Audrey: "Scenes from the 3D farm" for the pictures before it): five
// little things to do on a new farm, one at a time, each a few coins; the last a bonus
export const GUIDE = ['eggs', 'cuddle', 'sow', 'jobs', 'shop'];
export const GUIDE_COINS = 10, GUIDE_BONUS = 30;
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
export const EGG_PRICE = { rir: 6, orp: 7, sil: 8, leg: 9, bra: 7 };        // coins an egg sells for (the Legbar's blue eggs the dearest)
// XP for each egg collected, a feeder filled from empty, a brood hatched, each grown chick (and for each of its stars), and
// each day's job (base and per level); one place for the balance (balsim.mjs can try others: BAL='{"chick":4}')
export const XPV = { egg: 1, fill: 2, hatch: 2, chick: 3, star: 0.5, job: 3.5, jobL: 0.3 };      // (26 Oct, with the Silkie colours and the rare ones' coops: a year to level 30 once a day still)
// rewards for coming back during the day (Audrey, 26 Oct: "people playing multiple times a day should be rewarded a bit
// more"; "A bit quicker"): fresh eggs, collected within 3 hours of being laid, earn more; a cuddle earns a little each time
// (once her happy glow from the last one has worn off, 6 hours)
export const FRESH = { ms: 3 * 3600e3, xp: 2, cuddle: 1 };
export const FEED_DAYS = 2;                           // a full feeder keeps its birds for two days (a unit a bird a day)
export const FEED_PRICE = 2;                          // coins a unit of feed
export const CATCH_UP = 2 * 86400e3;                  // away longer than two days: only the last two count
const DAY_MS = 86400e3;
// ---- chicks (starting values)
export const SIT_MS = 24 * 3600e3, GROW_MS = 52 * 3600e3;          // sitting on her eggs (they hatch the next morning); the chicks growing up (grown at 11 two days on)
export const CHICK_PRICE = { rir: 22, orp: 26, sil: 30, leg: 28, bra: 26 };   // coins for each grown chick
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
  // the outfits bought (known ones, once each, from their level) and the one worn (one bought, or the classic)
  const fo = d.farmer && Array.isArray(d.farmer.outfits) ? d.farmer.outfits.filter((x, i, a) => OUTFITS[x] && x !== 'classic' && a.indexOf(x) === i && levelOf(out.xp) >= OUTFITS[x].level) : [];
  if (fo.length) { out.farmer.outfits = fo; out.farmer.outfit = fo.includes(d.farmer.outfit) ? d.farmer.outfit : 'classic'; }
  // the land: the first fields in order, at most one a level (a farm's own purchases never go further)
  const land = Array.isArray(d.land) ? d.land : [];
  out.land = Array.from({ length: Math.max(1, Math.min(land.length, levelOf(out.xp), FIELDS)) }, (_, i) => i);
  out.lvSeen = int(d.lvSeen, 1, levelOf(out.xp), levelOf(out.xp));            // (the last level-up card shown; before step 5: none owed)
  out.coops = [];
  const seen = new Set();
  for (const c of Array.isArray(d.coops) ? d.coops.slice(0, 40) : []) {
    if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !/^c\d{1,4}$/.test(c.id) || seen.has(c.id)) continue;
    if (!BREED_INFO[c.breed] || levelOf(out.xp) < (BREED_LEVEL[c.breed] || BREED_LEVEL.sil) || out.coops.some(o => o.breed === c.breed)) continue;      // (a breed's coop once it's come, one each; a rare colour's once the Silkies have)
    seen.add(c.id);
    // where it stands (a farm from before coops could be moved: on the village's first plot, the home field's coop; the
    // farm (main.js) then makes sure it's on the farm's own land, clear of everything, and nowhere near another coop)
    const x = spotNum(c.x), z = spotNum(c.z), deg = [0, 90, 180, 270].includes(c.deg) ? c.deg : null, at = x === null || z === null || deg === null ? HOME_COOP : { x, z, deg };
    out.coops.push({ id: c.id, breed: c.breed, tier: int(c.tier, 0, 4, 0), x: at.x, z: at.z, deg: at.deg, ...(Number.isInteger(c.plot) ? { plot: c.plot } : {}), name: cleanName(c.name, 24),
      eggs: int(c.eggs, 0, NEST_MAX, 0), bonus: 0, feed: Number.isFinite(c.feed) ? c.feed : null, fedAt: int(c.fedAt, 0, now, now),
      brood: c.brood && typeof c.brood === 'object' ? { hen: String(c.brood.hen), start: int(c.brood.start, 0, now, now), n: int(c.brood.n, 1, 4, 2), hatched: c.brood.hatched === true,
        kids: Array.isArray(c.brood.kids) ? c.brood.kids.slice(0, 4).map((k, i) => ({ sex: k && k.sex === 'r' ? 'r' : 'h', stars: int(k && k.stars, 1, 5, 1),
          ...(k && k.rare && ((k.rare === RARE_FROM[c.breed] && hash01(String(c.brood.hen) + '|' + c.brood.start + '|' + i + '|rare') < rareMost()) || (k.rare === c.breed && RARE_LINES.includes(c.breed))) ? { rare: k.rare } : {}) })) : null } : null,      // (a rare one: only its own colour's, only where the luck could have given it)
      lastBrood: int(c.lastBrood, 0, now, 0), checked: int(c.checked, 0, now, now),
      ...(typeof c.shut === 'string' && /^\d{8}$/.test(c.shut) && c.shut <= nightKey(now + TZ_SLACK) ? { shut: c.shut } : {}),      // (its pop door shut for that night)
      ...(Array.isArray(c.lt) ? { lt: layTimesKept(c.lt, int(c.eggs, 0, NEST_MAX, 0), now) } : {}) });      // (when its eggs were laid: fresh ones earn more)
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
    out.shows.res.push({ id: r.id, bird: r.bird, place, of, coins: place <= 3 ? (was ? O : T).prize[place - 1] : 0, xp: XP_SHOW + (place <= 3 ? (was ? O : T).xp[place - 1] : 0), t, seen: r.seen === true });
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
      if (ANIMALS[id].kennel) Object.assign(out.animals[id], { name: cleanName(a.name) || DOG_NAME, x: spotNum(a.x), z: spotNum(a.z) });      // (his name as any name; his kennel on the quarter-metre: the farm puts it where it can stand)
    }
  }
  // the wheat field: where it is (the farm puts it on your land when it has no spot), which way it lies, when it's ripe
  // (0: not sown; never further ahead than it takes to grow); the grain in store
  const wh = d.wheat && typeof d.wheat === 'object' ? d.wheat : {};
  out.wheat = { x: spotNum(wh.x), z: spotNum(wh.z), deg: wh.deg === 135 ? 135 : 45, ripe: Number.isFinite(wh.ripe) && wh.ripe > 0 ? Math.min(wh.ripe, now + WHEAT.grow) : 0 };
  out.grain = Math.round(num(d.grain, 0, WHEAT.max, 0) * 100) / 100;
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
  if (fl && typeof fl.key === 'string' && /^\d{8}$/.test(fl.key) && fl.key <= out.fox.seen && foxNight(fl.key) && Number.isInteger(fl.t) && Math.abs(fl.t - foxAt(fl.key)) <= TZ_SLACK && fl.t <= now + TZ_SLACK && out.coops.some(c => c.id === fl.coop)) {
    const by = ['geese', 'dog', 'team', 'farmer'].includes(fl.by) && fl.open === true && (fl.by === 'farmer' || (fl.by === 'dog' ? out.animals && out.animals.dog : fl.by === 'geese' ? out.animals && out.animals.geese : out.animals && out.animals.geese && out.animals.dog)) ? fl.by : null;
    out.fox.last = { key: fl.key, t: fl.t, coop: fl.coop, open: fl.open === true, by, eggs: fl.open === true && !by ? int(fl.eggs, 0, NEST_MAX, 0) : 0, hen: cleanName(fl.hen) || HEN_NAMES[0], seen: fl.seen === true, watched: fl.watched === true };
  }
  // rare babies (release 2 step 2): those waiting for your choice (each from a Silkie coop of the colour it comes from) and
  // those kept, in the basket by the farmhouse fire (rare colours only); at most a rooster and two hens of each colour
  const taken = new Set([...out.coops, ...out.birds].map(x => x.id)), room = (line, sex) => [...(out.basket || []), ...out.birds, ...(out.rare || [])].filter(b => (b.line || b.breed) === line && b.sex === sex).length < (sex === 'r' ? 1 : 2);
  if (Array.isArray(d.rare)) {
    out.rare = [];
    for (const e of d.rare.slice(0, RARE.pending)) {
      const coop = e && out.coops.find(c => c.id === e.coop), sex = e && (e.sex === 'r' ? 'r' : e.sex === 'h' ? 'h' : null);
      if (!coop || !sex || typeof e.id !== 'string' || !/^b\d{1,5}$/.test(e.id) || taken.has(e.id) || (e.line !== RARE_FROM[coop.breed] && e.line !== coop.breed) || !RARE_LINES.includes(e.line) || !room(e.line, sex)) continue;
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
  breedName(b) { return BREED_INFO[b].name[this.li()]; }                  // (a line's: "Black Silkie")
  kindName(b) { const I = BREED_INFO[b]; return (I.kind || I.name)[this.li()]; }      // (the breed's: "Silkie", for the shows)
  baseOf(b) { return baseBreed(b); }
  coopName(c) { return c.name || BREED_INFO[c.breed].coop[this.li()]; }
  // a new trio's title: a new breed, or a new Silkie colour
  trioTitle(b) { return silColour(b) && b !== 'sil' ? this.t('trio_new_col', { col: BREED_INFO[b].col[this.li()] }) : this.t('trio_new', { breed: this.breedName(b) }); }
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
  // ---- new breeds: the coops waiting to be placed (their level come, none yet on the farm), the next to come
  waitingCoops() { return Object.keys(BREED_LEVEL).filter(b => this.level >= BREED_LEVEL[b] && !this.data.coops.some(c => c.breed === b)).sort((a, b) => BREED_LEVEL[a] - BREED_LEVEL[b]); }
  nextBreed() { const b = Object.keys(BREED_LEVEL).filter(k => BREED_LEVEL[k] > this.level).sort((a, c) => BREED_LEVEL[a] - BREED_LEVEL[c])[0]; return b ? { breed: b, level: BREED_LEVEL[b] } : null; }
  newAt(L, from) { return Object.keys(BREED_LEVEL).filter(b => BREED_LEVEL[b] > from && BREED_LEVEL[b] <= L && !this.data.coops.some(c => c.breed === b)); }
  // ---- the Breed Book (release 1 step 8): a page for each breed in level order, found once its coop is on the farm (its
  // birds' names, the rooster first); else the level it comes at, or (its level come) waiting in Your coops. Nothing of it
  // is saved: it all comes from the coops on the farm and the XP
  bookPages() {
    return Object.keys(BREED_LEVEL).sort((a, b) => BREED_LEVEL[a] - BREED_LEVEL[b]).map(breed => {
      const coop = this.data.coops.find(c => c.breed === breed);
      const names = coop ? this.birdsIn(coop.id).sort((a, b) => (b.sex === 'r') - (a.sex === 'r')).map(b => b.name) : [];
      return { breed, base: baseBreed(breed), level: BREED_LEVEL[breed], found: !!coop, names, waiting: !coop && this.level >= BREED_LEVEL[breed], price: EGG_PRICE[baseBreed(breed)] || 6 };
    }).concat(RARE_LINES.map(breed => {                                   // (the rare colours: from breeding; found once one's yours)
      const coop = this.data.coops.find(c => c.breed === breed), mine = [...(coop ? this.birdsIn(coop.id) : []), ...this.basket().filter(b => b.breed === breed)];
      return { breed, base: 'sil', rare: true, from: Object.keys(RARE_FROM).filter(k => RARE_FROM[k] === breed), found: mine.length > 0, names: mine.sort((a, b) => (b.sex === 'r') - (a.sex === 'r')).map(b => b.name), waiting: false, price: EGG_PRICE.sil };
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
    const now = Date.now(), coop = { id: this.id('c'), breed, tier: 0, x: at.x, z: at.z, deg: at.deg, name: '', eggs: 0, bonus: 0, feed: 3 * FEED_DAYS, fedAt: now, brood: null, lastBrood: 0, checked: now };
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
  place(n, sexF = false) { return this.lang === 'fr' ? (n === 1 ? (sexF ? '1re' : '1er') : n + 'e') : n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'); }
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
    if (s.breed && baseBreed(b.breed) !== s.breed) return 'breed';
    if (this.showOf(b.id)) return 'busy';
    if (this.data.coins < SHOWS[s.tier].fee) return 'coins';
    return 'ok';
  }
  // the birds that could go in a show, best chance first
  showBirds(s) { return this.data.birds.filter(b => (!s.breed || baseBreed(b.breed) === s.breed) && !this.showOf(b.id)).map(b => ({ b, ch: this.showChance(b, s.id) })).sort((x, y) => y.ch.rosette - x.ch.rosette || y.ch.win - x.ch.win); }
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
  doorShut(c, now = Date.now()) { return c.shut === nightKey(now); }
  setDoorShut(coopId, shut, now = Date.now()) {
    const c = this.coop(coopId); if (!c) return;
    const k = shut ? nightKey(now) : undefined; if (c.shut === k) return;
    if (k) c.shut = k; else delete c.shut;
    this.save();
  }
  // tonight's visit, if there's one to come: when, the coop he'll go for (as the doors are now), the night
  foxTonight(now = Date.now()) {
    const k = nightKey(now), F = this.fox();
    if (this.level < FOX.level || k <= F.seen || !foxNight(k)) return null;
    const t = foxAt(k), c = this.foxCoop(k, t);
    return c ? { key: k, t, coop: c.id, open: c.shut !== k } : null;
  }
  foxCoop(k, t) {
    const coops = this.data.coops.filter(c => this.birdsIn(c.id).length);
    if (!coops.length) return null;
    const order = coops.slice().sort((a, b) => hash01('foxc|' + k + '|' + a.id) - hash01('foxc|' + k + '|' + b.id));
    return order.find(c => c.shut !== k) || order[0];
  }
  // the hen who sees him off in the story: the coop's Brave, else its Rebel, else its first hen
  foxHen(c) { const hens = this.birdsIn(c.id).filter(b => b.sex === 'h'); const h = hens.find(b => b.pers === 'brave') || hens.find(b => b.pers === 'rebel') || hens[0]; return h ? h.name : HEN_NAMES[0]; }
  // what happened at the coop: the door open or shut; open, chased off by the animals the farm had then, else the nest's
  // eggs taken (the result kept; live: the farm's own visit says what happened)
  foxResolve(k, live = null) {
    const t = foxAt(k), c = this.coop(live ? live.coop : '') || this.foxCoop(k, t); if (!c) return null;
    for (const e of this.dueLays(t)) this.layEgg(e.hen, e.t, t);               // (the eggs laid before he came)
    const open = live ? live.open : c.shut !== k, A = this.data.animals || {};
    const g = !!(A.geese && A.geese.at < t), dg = !!(A.dog && A.dog.at < t);
    const by = live ? live.by || null : open && (g || dg) ? (g && dg ? 'team' : g ? 'geese' : 'dog') : null;
    let eggs = 0;
    if (live) eggs = open && !by ? live.took || 0 : 0;                          // (taken already, as he went: foxTakeNow)
    else if (open && !by) { eggs = c.eggs; c.eggs = 0; c.lt = []; c.bonus = 0; }
    const last = { key: k, t, coop: c.id, open, by, eggs, hen: this.foxHen(c), seen: false, watched: false };
    const F = this.fox(); F.last = last; if (k > F.seen) F.seen = k;
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
      if (this.level >= FOX.level && foxNight(k) && now - t < CATCH_UP) out = this.foxResolve(k) || out;
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
    const de = /^[aeiouyàâéèêîôûAEIOUYÀÂÉÈÊÎÔÛ]/.test(l.hen) ? 'd’' + l.hen : 'de ' + l.hen;      // (French: d’Ivy, de Willow)
    const k = !l.open ? 'fox_shut' : l.by ? 'fox_' + l.by : l.eggs > 1 ? 'fox_eggs' : l.eggs === 1 ? 'fox_eggs1' : 'fox_empty';
    return this.t(k, { hen: l.hen, dehen: de, n: l.eggs, dog: this.dogName(), farmer: this.farmerName() }, k === 'fox_farmer' && this.data.farmer.look === 'f');
  }
  foxSeen() { const l = this.foxLast(); if (l && !l.seen) { l.seen = true; this.save(); } }
  foxWatched() { const l = this.foxLast(); if (l && !l.watched) { l.watched = true; l.seen = true; this.save(); } }
  // ---- the wheat field: how far it's grown, sowing it, harvesting it, where it is
  wheat() { return this.data.wheat || (this.data.wheat = { x: null, z: null, deg: 45, ripe: 0 }); }
  wheatStage(now = Date.now()) {
    const w = this.wheat(); if (!w.ripe) return 'soil';
    const u = 1 - (w.ripe - now) / WHEAT.grow;
    return u >= 1 ? 'ripe' : u >= 0.45 ? 'growing' : u >= 0.1 ? 'sprouts' : 'sown';
  }
  wheatLeft(now = Date.now()) { const w = this.wheat(); return w.ripe ? Math.max(0, w.ripe - now) : 0; }
  sowWheat(now = Date.now()) {
    const w = this.wheat(); if (w.ripe) return null;
    if (this.data.coins < WHEAT.sow) return { broke: true };
    this.data.coins -= WHEAT.sow; w.ripe = now + WHEAT.grow; this.save();
    return { cost: WHEAT.sow };
  }
  harvestWheat(now = Date.now()) {
    const w = this.wheat(); if (!w.ripe || now < w.ripe) return null;
    const g = this.data.grain || 0, add = Math.max(0, Math.min(WHEAT.grain, WHEAT.max - g));
    w.ripe = 0; this.data.grain = Math.round((g + add) * 100) / 100; this.data.xp += WHEAT.xp; this.save();
    return { grain: add, xp: WHEAT.xp, store: this.data.grain };
  }
  placeWheat(at, clear = []) {
    const X = spotNum(at.x), Z = spotNum(at.z); if (X === null || Z === null) return false;
    const w = this.wheat(); w.x = X; w.z = Z; w.deg = at.deg === 135 ? 135 : 45; this.cleared(clear); this.save(); return true;
  }
  // ---- honey: the jars in the hives now, when the next comes, harvesting them (sold)
  honeyAt(now = Date.now()) { const H = this.data.honey; if (!H) return 0; return Math.min(HONEY.max, H.n + Math.floor(Math.max(0, now - H.at) / HONEY.every)); }
  honeyNext(now = Date.now()) { const H = this.data.honey; if (!H || this.honeyAt(now) >= HONEY.max) return 0; return HONEY.every - (Math.max(0, now - H.at) % HONEY.every); }
  collectHoney(now = Date.now()) {
    const H = this.data.honey; if (!H) return null;
    const k = Math.floor(Math.max(0, now - H.at) / HONEY.every), n = Math.min(HONEY.max, H.n + k);
    if (!n) return null;
    H.at = H.n + k >= HONEY.max ? now : H.at + k * HONEY.every; H.n = 0;
    const coins = n * HONEY.price, xp = n * HONEY.xp; this.data.coins += coins; this.data.xp += xp; this.save();
    return { n, coins, xp };
  }
  // ---- the first day's guide: the step now ('eggs', 'cuddle', …, or null: done or skipped); a step done (k: only if it's
  // the one now): its coins, the next; skipped: done, no more coins
  guideStep() { const G = this.data.guide; return G && !G.done && G.step < GUIDE.length ? GUIDE[G.step] : null; }
  guideDid(k) {
    const G = this.data.guide; if (!G || G.done || GUIDE[G.step] !== k) return null;
    G.step++; let coins = GUIDE_COINS;
    if (G.step >= GUIDE.length) { G.done = true; coins += GUIDE_BONUS; }
    this.data.coins += coins; this.save();
    return { coins, done: G.done, next: G.done ? null : GUIDE[G.step], n: G.step };
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
    for (const c of d.coops) { const br = c.brood; if (br && br.hatched && this.hatchAt(c) > from) items.push({ k: 'hatched', name: name(br.hen), n: br.n }); }
    for (const n of this.unseenNews()) if (n.type === 'grown' && n.t > from) items.push({ k: 'grown', name: name(n.hen) });
    const h = this.honeyAt(now); if (h) items.push({ k: 'honey', n: h });
    if (this.wheatStage(now) === 'ripe') items.push({ k: 'wheat' }); else if (this.wheat().ripe) items.push({ k: 'wheat_grow', ms: this.wheatLeft(now) });
    for (const c of d.coops) { const l = this.feedLeft(c, now); if (l <= 0) items.push({ k: 'feed', coop: this.coopName(c) }); else if (l < 0.25) items.push({ k: 'feed_low', coop: this.coopName(c) }); }
    if (this.unseenShows().length) items.push({ k: 'show' });
    const jr = this.jobsReady(now); if (jr) items.push({ k: 'jobs_ready', n: jr }); else if (!this.jobs(now).seen) items.push({ k: 'jobs' });
    return { away: Math.max(0, now - from), paused: now - from > CATCH_UP, eggs, items };
  }
  seenNow(now = Date.now()) { this.data.lastSeen = now; this.save(); }
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
  jobReward() { return jobReward(this.jobs().lv); }
  jobsReady(now = Date.now()) { return this.jobs(now).list.filter(j => j.got >= j.n && !j.paid).length; }
  claimJob(i, now = Date.now()) {
    const J = this.jobs(now), j = J.list[i]; if (!j || j.got < j.n || j.paid) return null;
    const r = jobReward(J.lv); j.paid = true; this.data.coins += r.coins; this.data.xp += r.xp; this.save();
    return r;
  }
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
    b.happy = now + HAPPY_MS;
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
      const b = { id: this.id('b'), name: pick(sex === 'r' ? ROO_NAMES : HEN_NAMES), sex, breed, pers: p, coop: coopId, since: now, exp: 0, trust: 0 };
      if (sex === 'h') b.laid = now;
      b.happy = 0; b.ros = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      return b;
    });
  }
  newFarm({ lang, look, name }) {
    const now = Date.now();
    this.lang = lang === 'fr' ? 'fr' : 'en';
    this.data = { v: SAVE_V, made: now, lang: this.lang, coins: 100, xp: 0, farmer: { look: look === 'f' ? 'f' : 'm', name: cleanName(name) }, land: [0], lvSeen: 1, coops: [], birds: [], cleared: [], next: 1 };
    const coop = { id: this.id('c'), breed: 'rir', tier: 0, ...HOME_COOP, name: '', eggs: 0, bonus: 0, feed: 3 * FEED_DAYS, fedAt: now, brood: null, lastBrood: 0, checked: now };
    this.data.coops.push(coop);
    this.data.birds.push(...this.trio('rir', coop.id, true));
    const mum = this.data.birds.find(b => b.pers === 'mum') || this.data.birds.find(b => b.sex === 'h');
    this.data.first = { hen: mum.id, t: firstEggAt(now) };
    this.data.news = [];
    this.data.shows = { in: [], res: [], seen: '' };
    this.data.decor = [];                              // (in the order the save check gives: a reload the same farm)
    this.data.wheat = { x: null, z: null, deg: 45, ripe: 0 }; this.data.grain = 0; this.data.lastSeen = now; this.data.guide = { step: 0, done: false };
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
      for (let day = dayStart(from); day <= now; day = nextDay(day)) for (const t of layTimes(b.id, day).slice(baseBreed(b.breed) === 'sil' ? 1 : 0)) if (t > from && t <= now) out.push({ hen: b.id, coop: b.coop, t });      // (a Silkie lays one a day, in the afternoon: Silkies are better mums than layers)
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
    const base = 1 + ((mum ? this.stars(mum) : 0) + (dad ? this.stars(dad) : 0)) / 2 + (mum && mum.pers === 'mum' ? 0.4 : 0);
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
  soldText(r) { return r.fresh ? this.t(r.n === 1 ? 'eggs_fresh1' : 'eggs_fresh', { n: r.n, c: r.coins, f: r.fresh, xp: r.xp }) : this.t(r.n === 1 ? 'eggs_sold1' : 'eggs_sold', { n: r.n, c: r.coins }); }
  // tap the nest: its eggs sold, coins and XP
  collect(coopId, now = Date.now()) {
    const c = this.coop(coopId); if (!c || !c.eggs) return null;
    const n = c.eggs, fresh = this.freshIn(c, now);
    const coins = n * this.eggPrice(c) + Math.min(c.bonus || 0, n * MAX_STARS), xp = n * XPV.egg + fresh * FRESH.xp;
    c.eggs = 0; c.bonus = 0; c.lt = []; this.data.coins += coins; this.data.xp += xp;
    const done = this.job('eggs', n);
    return { n, fresh, coins, xp, done };
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
    for (const c of d.coops) delete c.plot;            // (a farm from before coops could be moved: their place now)
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
