# Reviewing a translation of Feather & Field

You're the second reader of a translation that no native speaker will check. Read `lang/BRIEF.md` first: it's what the
translator was asked to do, including the tone, the forms of address and the rules.

You get:
- `lang/catalogue.json`: the source, every entry's English, with the French as a second reference.
- `lang/<code>.json`: the translation.

For every entry, read the translation as a player would and translate it back into English in your head. Flag anything
that is:
- **wrong or unclear**: the meaning differs from the English, something is missing or added, or it's ambiguous on a
  phone screen;
- **unnatural**: literal, stiff, or how no native speaker would say it in a cosy game; a false friend; wrong grammar;
- **wrong in agreement**: gender or number (a hen is female, a rooster male; in `gender` entries `t` is the rooster or
  man form, `f` the hen or woman form); a placeholder's word not fitting the sentence (check what it's filled with:
  names, numbers, "2 days", a coop's name);
- **inconsistent**: the same thing called by different words in different places (coop, pen, nest, feeder, cuddle,
  trust, star, level, coins, the shows, the Breed Book, the breeds and colours);
- **too long**: a button, chip or title that will crowd a phone screen when a shorter natural word exists;
- **against the brief**: the address form, typography, names that should stay as they are, animal sounds;
- **broken**: a placeholder altered or lost, an emoji dropped, or English left untranslated.

Don't rewrite what's already good: only flag real problems, with a better wording.

Write `lang/review/<code>.json`: a list of `{ "id": "...", "now": "<the current text>", "problem": "<a few words, in
English>", "fix": <the corrected value in the same format as the translation: a string, {"t","f"}, or a list> }`. Then a
summary of under 150 words: how good the translation is overall, and the kinds of problems you found.
