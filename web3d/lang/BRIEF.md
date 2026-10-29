# Translating Feather & Field

Feather & Field is a cosy 3D chicken-farming game for phones (iPhone, Android) and tablets, for adults and young adults.
The tone is warm, gentle and a little playful, like Hay Day or FarmVille 3. It's a kind game: no bird ever dies or gets
hurt, the fox is a funny character who only tries to steal eggs, and night-time trouble is funny rather than scary.
It has been written in English and French. Now it also needs German, Spanish, Portuguese (Brazil) and Italian.
Nobody will check these translations: they go straight to players, so they must read as if a native speaker wrote them.

## What you get
`lang/catalogue.json`: every word of the game. Each entry has:
- `id`: what it is. It hints at where it appears:
  - `text.*`: the game's screens, cards, buttons and messages.
  - `breed.*`: breed, colour and coop names.
  - `say.*`: what the farmer says in a speech bubble.
  - `visit.*`: the fox's night visit.
  - `replay.*`: the morning film of last night's visit, with title cards.
  - `door.*`: a coop's pop door.
  - `decor.*`: decorations.
  - `beast.*`, `goose.*`, `duck.*`, `pond.*`: animal labels and bubbles.
  - `pers.*`: the five hen personalities.
- `en`: the English. This is the source.
- `fr`: the French, a second reference for meaning. It is a native, natural translation, not word for word.
- `gender: true`: the words change when the subject is female, a hen or a woman farmer.
  - `en` and `fr` are the default form, for a rooster or a man.
  - `f_en` and `f_fr` are the feminine form.
- `pair: true` (`pers.*`): `[for a hen, for a rooster]`. A one-item list means the same word for both.

## What to write
`lang/<code>.json`, a single JSON object with one key per catalogue `id`. Every id must be there.
- Usually the value is a string: `"text.coins": "Münzen"`.
- `gender` entries take both forms: `{ "t": "<default: rooster or man>", "f": "<feminine: hen or woman>" }`. If both
  are the same in your language, give the same text twice.
- `pers.*` entries take a list `["for a hen", "for a rooster"]`, or a one-item list when it's the same for both.

## Rules
- **Placeholders** like `{name}`, `{farmer}`, `{n}`, `{c}`, `{when}`, `{coop}` and `{xp}` must stay exactly as they are,
  each one used as often as in the English. You may move them within the sentence. They are filled with:
  - a bird's, dog's or farmer's name;
  - a number;
  - a span of time, already in your language ("2 days", "about 6 hours");
  - a coop's name.
- **Keep emoji and symbols** (♥ ★ 🎞 · → ✓ …) where they are.
- **Keep it short** where it's a button, a chip, a title or a label: screens are phone-sized. German especially: prefer
  short everyday words to long compounds, and split a compound with a hyphen only if nothing shorter exists.
- **The player is addressed as**:
  - German: `du`, informal and friendly, as in most mobile games. Capitalise `Du`/`Dein` only at the start of a sentence.
  - Spanish: neutral Spanish that reads well in Spain and Latin America. Use `tú`; avoid `vosotros`/`vos` and regional
    slang.
  - Portuguese: Brazilian Portuguese, with `você`.
  - Italian: `tu`.
- **Typography**:
  - German: „…“ quotes.
  - Spanish: ¡…! and ¿…?, with « » or “ ” quotes.
  - Portuguese and Italian: “…” quotes.
  - Use the language's own punctuation spacing; no French-style space before `!` or `?`.
- **Capitalisation**: follow your language's rules: German capitalises nouns; the others use sentence case for titles
  and buttons, as the English does.
- **Names**: keep these as they are:
  - the game's name, Feather & Field;
  - the animals' names: Biscuit the dog, Rusty the fox and his family, Gertrude and Hector the geese, Rocco, Daisy and
    Dot the ducks;
  - the farmers' default names: Arthur and Rosie. For `farmer.f`, French uses Rose; use Rosie unless your language has
    a natural, well-known form.
  - the show places (Thornbury Green, Wessex …).
  Do translate the coops' names (Red Barn, Thatched Cottage …), decorations, outfits and fish.
- **Breeds**: use the breed's usual name among poultry keepers in your language when there is a well-known one (German,
  for example: Rhodeländer, Orpington, Seidenhuhn, Brahma). Otherwise keep the English breed name. The French reference
  shows how it was handled there. Silkie colours (White, Black, Buff, Blue, Partridge, Grey, Paint, Lavender, Red,
  Splash, Cuckoo) should be the usual poultry colour names. `breed.*.col` is the colour on its own, as used in "A new
  colour: {col}!"; check its `fr` for how it slots in.
- **Fish**: use the usual common name of each fish in your language (rudd, roach, perch, tench, minnow, gudgeon, dace,
  chub …; the legendary ones keep their nicknames' spirit).
- **Sounds and bubbles** ("Quack!", "Ribbit!", "woof"): use your language's own animal sounds.
- **The fox and the night**: always light and funny, never frightening.
- **Plural keys**: some keys come in two, like `trust_next` (several) and `trust_next1` (one). Translate each as it is.
- When the English is a fragment that gets joined to something else (`and`, `rustic`, a colour on its own), translate it
  so that it still fits the sentence it's joined into. The French shows how.

## When you're done
- Check the JSON parses and every catalogue id is present.
- Re-read it as a player would: natural, warm, consistent. The same thing always gets the same word: coop, pen, nest,
  feeder, cuddle, trust, star, level, coins, XP, the shows' names, the Breed Book. Nothing should be machine-literal.
- Write a short summary: notable choices (address form, key terms) and anything you weren't sure of.
