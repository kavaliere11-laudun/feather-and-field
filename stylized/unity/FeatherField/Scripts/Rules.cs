using System.Collections.Generic;
using UnityEngine;

namespace FeatherField
{
    /// <summary>The five personalities, in the same order as the web game.</summary>
    public enum Personality { Mum = 0, Rebel = 1, Diva = 2, Glutton = 3, Brave = 4 }

    /// <summary>How grown up a bird is.</summary>
    public enum Stage { Chick = 0, Young = 1, Adult = 2 }

    /// <summary>One bird as it is saved: who she is, her four traits (0 to 100), how far she is from grown up, and her parents.</summary>
    [System.Serializable]
    public class BirdRecord
    {
        public int id;                       // 1 to 5: the birds the farm started with; 100 and up: hatched on the farm
        public string name = "";
        public bool rooster;
        public int type = 42, plum = 42, size = 42, lay = 42;
        public int pers = 4;
        public float grow;                   // seconds left until grown up (0: grown up)
        public bool fast;                    // a good mum's chick: grows up faster
        public string mum = "", dad = "";    // her parents' names (empty for the birds the farm started with)
        public int gen = 1;
    }

    /// <summary>A fertile egg: the chick inside (decided when the egg is laid, like the web game) and its parents.</summary>
    [System.Serializable]
    public class EggRecord
    {
        public BirdRecord child = new BirdRecord();
        public string dam = "", sire = "";
        public int damQ, sireQ;
        public int expect;                   // the chick's likely quality, worked out from the parents
    }

    /// <summary>An egg in the incubator and how long until it hatches.</summary>
    [System.Serializable]
    public class IncItem
    {
        public EggRecord egg = new EggRecord();
        public float left;
        [System.NonSerialized] public bool told;     // "ready, but the coop is full" was said once
    }

    /// <summary>
    /// The web game's rules for birds, ported to C#: quality, grade, value, personalities, and (stage 2b) breeding.
    /// The numbers are the same as in the web game, so both versions agree. Only the times are quick for now.
    /// </summary>
    public static class Rules
    {
        public const int RirPrice = 40;          // a Rhode Island Red's base price
        public const int GluttonSize = 6;        // a glutton grows 6 points bigger as an adult

        // breeding (the web game's numbers)
        public const float HenOdds = 0.6f;       // a chick is a hen 60% of the time
        public const float Fertility = 0.8f;     // with a grown rooster in the coop, 80% of eggs are fertile
        public const float MumFertility = 0.9f;  // a good mum's: 90%
        public const float Mutation = 0.04f;     // now and then a trait jumps 8 to 16 points
        public const int MumTraits = 3;          // a good mum's chicks are 3 points better in every trait
        public const float MumGrow = 0.75f;      // and grow out of the chick stage 25% faster

        // times: quick for now, so it can all be watched (the web game: 1 hour to hatch, 6 hours a chick, 3 days to adult)
        public const float HatchSeconds = 90f;
        public const float ChickSeconds = 180f;
        public const float YoungSeconds = 180f;

        public const int CoopCap = 5;            // birds in the coop and its yard
        public const int BasketCap = 6;          // fertile eggs waiting in the hatchery
        public const int IncubatorSlots = 2;

        public static readonly string[] HenNames = {
            "Henrietta", "Clover", "Mabel", "Peggy", "Dotty", "Hazel", "Maple", "Willow", "Biscuit", "Nutmeg", "Poppy", "Daisy",
            "Pearl", "Ginger", "Olive", "Rosie", "Marigold", "Bramble", "Truffle", "Pippa", "Dumpling", "Ivy", "Cosette", "Margot",
            "Brioche", "Lulu", "Fern", "Juniper", "Agathe", "Praline", "Noisette", "Mimi", "Edith", "Sybil", "Tansy", "Wren" };
        public static readonly string[] RoosterNames = {
            "Rupert", "Albert", "Barnaby", "Chester", "Gus", "Reginald", "Hamish", "Basil", "Monty", "Fergus", "Rocco", "Duke",
            "Gaston", "Hector", "Marcel", "Ozzy", "Percy", "Rex", "Bertrand", "Winston", "Alfie", "Jasper", "Otto" };

        static readonly string[] PersNames = { "Good mum", "Rebel", "Diva", "Glutton", "Brave" };
        static readonly string[] PersText = {
            "More of her eggs are fertile, and her chicks are better and grow up faster. Worth 10% more.",
            "Escapes about once a day and sometimes comes back with a surprise.",
            "Does better at shows. Sulks on plain pellets unless she has had a cuddle.",
            "Loves her food: grows bigger and is worth 15% more. By the apple tree she jumps for apples, and two apples make an apple egg.",
            "Chases the fox away at night and walks runaways home. Worth 5% more." };
        static readonly string[] Reveal = {
            "This one looks like a born mum.", "This one looks… adventurous!", "This one already strikes a pose.",
            "This one is already eyeing the feeder.", "This one isn't afraid of anything." };
        static readonly float[] PersValue = { 1.1f, 1f, 1f, 1.15f, 1.05f };

        public static string PersonalityName(BirdRecord b) { return PersNames[Mathf.Clamp(b.pers, 0, 4)]; }
        public static string PersonalityText(BirdRecord b) { return PersText[Mathf.Clamp(b.pers, 0, 4)]; }
        public static string RevealText(BirdRecord b) { return Reveal[Mathf.Clamp(b.pers, 0, 4)]; }

        // ------------------------------------------------------------------ growing up
        public static Stage StageOf(BirdRecord b)
        {
            if (b.grow > YoungSeconds) return Stage.Chick;
            if (b.grow > 0f) return Stage.Young;
            return Stage.Adult;
        }

        /// <summary>Not a chick any more: young birds lay, breed and are drawn as small grown-ups, like in the web game.</summary>
        public static bool Grown(BirdRecord b) { return StageOf(b) != Stage.Chick; }

        /// <summary>A just-hatched chick's time until grown up (a good mum's chicks leave the chick stage sooner).</summary>
        public static float NewChickGrow(bool fast) { return YoungSeconds + ChickSeconds * (fast ? MumGrow : 1f); }

        public static float MaxGrow { get { return YoungSeconds + ChickSeconds; } }

        /// <summary>"Chick", "Pullet" (a young hen), "Cockerel" (a young rooster), "Hen", "Rooster".</summary>
        public static string StageName(BirdRecord b)
        {
            var s = StageOf(b);
            if (s == Stage.Chick) return "chick";
            if (s == Stage.Young) return b.rooster ? "cockerel (young rooster)" : "pullet (young hen)";
            return b.rooster ? "rooster" : "hen";
        }

        // ------------------------------------------------------------------ quality and value
        public static int EffectiveSize(BirdRecord b)
        {
            return Mathf.Min(100, b.size + (b.pers == (int)Personality.Glutton ? GluttonSize : 0));
        }

        /// <summary>Quality 0 to 100: Type and Plumage count most.</summary>
        public static int Quality(BirdRecord b)
        {
            return Mathf.RoundToInt(0.3f * b.type + 0.3f * b.plum + 0.2f * EffectiveSize(b) + 0.2f * b.lay);
        }

        public static string Grade(int q)
        {
            if (q >= 95) return "★";
            if (q >= 88) return "A+";
            if (q >= 75) return "A";
            if (q >= 60) return "B";
            if (q >= 45) return "C";
            return "D";
        }

        static float QMult(float q) { float x = q / 50f; return 0.25f + 0.75f * x * x; }

        /// <summary>What a bird is worth now, in coins: chicks are worth 45% of a grown bird, young ones 90%.</summary>
        public static int Value(BirdRecord b)
        {
            var s = StageOf(b);
            float st = s == Stage.Chick ? 0.45f : s == Stage.Young ? 0.9f : 1f;
            float v = RirPrice * QMult(Quality(b)) * st * (b.rooster ? 0.85f : 1f) * PersValue[Mathf.Clamp(b.pers, 0, 4)];
            return Mathf.Max(1, Mathf.RoundToInt(v));
        }

        /// <summary>A bird sells for 80% of what she is worth.</summary>
        public static int SellPrice(BirdRecord b) { return Mathf.Max(1, Mathf.RoundToInt(Value(b) * 0.8f)); }

        /// <summary>A fertile egg sells for more than an eating egg, more so when its parents are good.</summary>
        public static int FertileEggPrice(EggRecord e, int eggPrice)
        {
            float q = (e.sireQ + e.damQ) / 2f;
            return Mathf.Max(1, Mathf.RoundToInt(eggPrice * 1.6f + 0.06f * RirPrice * QMult(q)));
        }

        // ------------------------------------------------------------------ new birds
        /// <summary>A trait for a bird bought at the market: about 42, rarely below 25 or above 60.</summary>
        public static int ShopTrait(System.Random rnd)
        {
            return Mathf.Clamp(Mathf.RoundToInt((float)(42.0 + Gauss(rnd) * 9.0)), 15, 70);
        }

        static double Gauss(System.Random rnd)
        {
            double u1 = 1.0 - rnd.NextDouble(), u2 = rnd.NextDouble();
            return System.Math.Sqrt(-2.0 * System.Math.Log(u1)) * System.Math.Cos(2.0 * System.Math.PI * u2);
        }

        public static int RollPersonality(bool rooster, System.Random rnd) { return rnd.Next(rooster ? 1 : 0, 5); }

        /// <summary>A name from the lists that isn't used yet (or one with a number after it).</summary>
        public static string NewName(bool rooster, System.Random rnd, HashSet<string> used)
        {
            var pool = rooster ? RoosterNames : HenNames;
            string name = "";
            for (int i = 0; i < 20; i++)
            {
                string n = pool[rnd.Next(pool.Length)];
                if (!used.Contains(n)) { name = n; break; }
            }
            for (int i = 0; name == "" && i < 40; i++)
            {
                string n = pool[rnd.Next(pool.Length)] + " " + (2 + rnd.Next(98));
                if (!used.Contains(n)) name = n;
            }
            if (name == "") name = pool[0] + " " + (100 + used.Count);
            used.Add(name);
            return name;
        }

        /// <summary>A new bird: a name not already used, traits like the market's, a personality (roosters are never good mums).</summary>
        public static BirdRecord NewBird(bool rooster, System.Random rnd, HashSet<string> used)
        {
            var b = new BirdRecord();
            b.rooster = rooster;
            b.name = NewName(rooster, rnd, used);
            b.type = ShopTrait(rnd); b.plum = ShopTrait(rnd); b.size = ShopTrait(rnd); b.lay = ShopTrait(rnd);
            b.pers = RollPersonality(rooster, rnd);
            return b;
        }

        // ------------------------------------------------------------------ breeding
        /// <summary>
        /// The chick in a fertile egg (the web game's childSpec): each trait is the parents' average, give or take a little luck,
        /// plus 3 if the mother is a good mum; now and then a trait jumps up 8 to 16 points. 60% are hens. The personality is
        /// the mother's half the time, the father's a fifth of the time, otherwise a surprise.
        /// </summary>
        public static BirdRecord ChildSpec(BirdRecord sire, BirdRecord dam, System.Random rnd)
        {
            bool mum = dam.pers == (int)Personality.Mum;
            var c = new BirdRecord();
            c.rooster = rnd.NextDouble() >= HenOdds;
            c.type = ChildTrait(sire.type, dam.type, mum, rnd);
            c.plum = ChildTrait(sire.plum, dam.plum, mum, rnd);
            c.size = ChildTrait(sire.size, dam.size, mum, rnd);
            c.lay = ChildTrait(sire.lay, dam.lay, mum, rnd);
            double r = rnd.NextDouble();
            int p = r < 0.5 ? dam.pers : r < 0.7 ? sire.pers : -1;
            if (p < 0 || p > 4 || (c.rooster && p == (int)Personality.Mum)) p = RollPersonality(c.rooster, rnd);
            c.pers = p;
            c.fast = mum;
            c.gen = Mathf.Min(99, Mathf.Max(sire.gen, dam.gen) + 1);
            c.mum = dam.name; c.dad = sire.name;
            return c;
        }

        static int ChildTrait(int a, int b, bool mum, System.Random rnd)
        {
            double v = (a + b) / 2.0 + Gauss(rnd) * 6.0 + (mum ? MumTraits : 0);
            if (rnd.NextDouble() < Mutation) v += 8.0 + rnd.NextDouble() * 8.0;
            return Mathf.Clamp((int)System.Math.Round(v), 1, 100);
        }

        /// <summary>How good a pair's chicks usually are (the web game's chickOdds, without the luck).</summary>
        public static int ExpectedQuality(BirdRecord sire, BirdRecord dam)
        {
            float bonus = (dam.pers == (int)Personality.Mum ? MumTraits : 0) + Mutation * 12f;
            float t = Mathf.Clamp((sire.type + dam.type) / 2f + bonus, 1f, 100f);
            float p = Mathf.Clamp((sire.plum + dam.plum) / 2f + bonus, 1f, 100f);
            float s = Mathf.Clamp((sire.size + dam.size) / 2f + bonus, 1f, 100f);
            float l = Mathf.Clamp((sire.lay + dam.lay) / 2f + bonus, 1f, 100f);
            return Mathf.RoundToInt(0.3f * t + 0.3f * p + 0.2f * s + 0.2f * l);
        }

        /// <summary>A fertile egg from this pair, with its chick already decided.</summary>
        public static EggRecord MakeEgg(BirdRecord sire, BirdRecord dam, System.Random rnd)
        {
            var e = new EggRecord();
            e.child = ChildSpec(sire, dam, rnd);
            e.dam = dam.name; e.sire = sire.name;
            e.damQ = Quality(dam); e.sireQ = Quality(sire);
            e.expect = ExpectedQuality(sire, dam);
            return e;
        }

        // ------------------------------------------------------------------ checking saves
        /// <summary>A clean name: letters, digits, spaces, dashes and apostrophes, at most 20 characters.</summary>
        public static string CleanName(string raw)
        {
            var sb = new System.Text.StringBuilder();
            raw = raw ?? "";
            for (int i = 0; i < raw.Length && sb.Length < 20; i++)
            {
                char c = raw[i];
                if (char.IsLetterOrDigit(c) || c == ' ' || c == '-' || c == '\'') sb.Append(c);
            }
            return sb.ToString().Trim();
        }

        /// <summary>Checks a bird from a save: a clean name, traits 1 to 100, a real personality, a sensible age.</summary>
        public static BirdRecord Clean(BirdRecord b, bool rooster)
        {
            if (b == null) return null;
            b.name = CleanName(b.name);
            if (b.name.Length == 0) b.name = rooster ? "Rupert" : "Henrietta";
            b.rooster = rooster;
            b.type = Mathf.Clamp(b.type, 1, 100); b.plum = Mathf.Clamp(b.plum, 1, 100);
            b.size = Mathf.Clamp(b.size, 1, 100); b.lay = Mathf.Clamp(b.lay, 1, 100);
            b.pers = Mathf.Clamp(b.pers, 0, 4);
            if (rooster && b.pers == (int)Personality.Mum) b.pers = (int)Personality.Brave;
            b.grow = float.IsNaN(b.grow) || float.IsInfinity(b.grow) ? 0f : Mathf.Clamp(b.grow, 0f, MaxGrow);
            b.mum = CleanName(b.mum); b.dad = CleanName(b.dad);
            b.gen = Mathf.Clamp(b.gen, 1, 99);
            return b;
        }

        /// <summary>Checks a fertile egg from a save (null if there is nothing usable in it).</summary>
        public static EggRecord CleanEgg(EggRecord e)
        {
            if (e == null || e.child == null) return null;
            e.child = Clean(e.child, e.child.rooster);
            e.child.grow = 0f; e.child.id = 0; e.child.name = "";     // named, numbered and timed when it hatches
            e.dam = CleanName(e.dam); e.sire = CleanName(e.sire);
            e.damQ = Mathf.Clamp(e.damQ, 0, 100); e.sireQ = Mathf.Clamp(e.sireQ, 0, 100);
            e.expect = Mathf.Clamp(e.expect, 0, 100);
            return e;
        }
    }
}
