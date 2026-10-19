using UnityEngine;

namespace FeatherField
{
    /// <summary>The five personalities, in the same order as the web game.</summary>
    public enum Personality { Mum = 0, Rebel = 1, Diva = 2, Glutton = 3, Brave = 4 }

    /// <summary>One bird as it is saved: who she is and her four traits (0 to 100).</summary>
    [System.Serializable]
    public class BirdRecord
    {
        public string name = "";
        public bool rooster;
        public int type = 42, plum = 42, size = 42, lay = 42;
        public int pers = 4;
    }

    /// <summary>
    /// The web game's rules for birds, ported to C# (stage 2): quality, grade, value and personalities.
    /// The numbers are the same as in the web game, so both versions agree.
    /// </summary>
    public static class Rules
    {
        public const int RirPrice = 40;          // a Rhode Island Red's base price
        public const int GluttonSize = 6;        // a glutton grows 6 points bigger as an adult

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
            "Loves her food: eats half as much again, grows bigger and is worth 15% more. Jumps for apples, and two apples make an apple egg.",
            "Chases the fox away at night and walks runaways home. Worth 5% more." };
        static readonly float[] PersValue = { 1.1f, 1f, 1f, 1.15f, 1.05f };

        public static string PersonalityName(BirdRecord b) { return PersNames[Mathf.Clamp(b.pers, 0, 4)]; }
        public static string PersonalityText(BirdRecord b) { return PersText[Mathf.Clamp(b.pers, 0, 4)]; }

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

        /// <summary>What a grown bird is worth, in coins (she sells for 80% of it).</summary>
        public static int Value(BirdRecord b)
        {
            float q = Quality(b) / 50f;
            float v = RirPrice * (0.25f + 0.75f * q * q) * (b.rooster ? 0.85f : 1f) * PersValue[Mathf.Clamp(b.pers, 0, 4)];
            return Mathf.Max(1, Mathf.RoundToInt(v));
        }

        /// <summary>A trait for a bird bought at the market: about 42, rarely below 25 or above 60.</summary>
        public static int ShopTrait(System.Random rnd)
        {
            double u1 = 1.0 - rnd.NextDouble(), u2 = rnd.NextDouble();
            double g = System.Math.Sqrt(-2.0 * System.Math.Log(u1)) * System.Math.Cos(2.0 * System.Math.PI * u2);
            return Mathf.Clamp(Mathf.RoundToInt((float)(42.0 + g * 9.0)), 15, 70);
        }

        /// <summary>A new bird: a name not already used, traits like the market's, a personality (roosters are never good mums).</summary>
        public static BirdRecord NewBird(bool rooster, System.Random rnd, System.Collections.Generic.HashSet<string> used)
        {
            var b = new BirdRecord();
            b.rooster = rooster;
            var pool = rooster ? RoosterNames : HenNames;
            for (int i = 0; i < 20; i++)
            {
                string n = pool[rnd.Next(pool.Length)];
                if (!used.Contains(n)) { b.name = n; break; }
            }
            if (b.name == "") b.name = pool[rnd.Next(pool.Length)] + " " + (2 + rnd.Next(8));
            used.Add(b.name);
            b.type = ShopTrait(rnd); b.plum = ShopTrait(rnd); b.size = ShopTrait(rnd); b.lay = ShopTrait(rnd);
            b.pers = rnd.Next(rooster ? 1 : 0, 5);
            return b;
        }

        /// <summary>Checks a bird from a save: a clean name, traits 1 to 100, a real personality.</summary>
        public static BirdRecord Clean(BirdRecord b, bool rooster)
        {
            if (b == null) return null;
            var sb = new System.Text.StringBuilder();
            string raw = b.name ?? "";
            for (int i = 0; i < raw.Length && sb.Length < 20; i++)
            {
                char c = raw[i];
                if (char.IsLetterOrDigit(c) || c == ' ' || c == '-' || c == '\'') sb.Append(c);
            }
            b.name = sb.ToString().Trim();
            if (b.name.Length == 0) b.name = rooster ? "Rupert" : "Henrietta";
            b.rooster = rooster;
            b.type = Mathf.Clamp(b.type, 1, 100); b.plum = Mathf.Clamp(b.plum, 1, 100);
            b.size = Mathf.Clamp(b.size, 1, 100); b.lay = Mathf.Clamp(b.lay, 1, 100);
            b.pers = Mathf.Clamp(b.pers, 0, 4);
            if (rooster && b.pers == (int)Personality.Mum) b.pers = (int)Personality.Brave;
            return b;
        }
    }
}
