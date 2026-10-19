using System.Collections;
using System.Collections.Generic;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace FeatherField
{
    /// <summary>
    /// What is saved on the device. Every number and name is checked again when it is loaded.
    /// </summary>
    [System.Serializable]
    public class FarmSave
    {
        public int version = 2;
        public long coins = 150;
        public int nestEggs = 0;           // eating eggs in the nest
        public float feeder = 1f;          // 0 = empty, 1 = full
        public long eggsCollected = 0;
        public long savedAt = 0;           // when it was saved (UTC ticks)
        public List<BirdRecord> birds = new List<BirdRecord>();
        public int apples = -1;            // apples on the tree (-1: not saved yet, the tree starts full)
        public int applesEaten = 0;        // by the Glutton since her last apple egg
        public bool appleEgg = false;      // an apple egg waiting in the grass
        public float appleEggX = 0f, appleEggZ = 0f;
        // stage 2b: breeding
        public bool flockSaved = false;    // the flock has been saved once: a starting bird missing from it was sold
        public int nextId = 100;           // the number the next hatched chick gets
        public List<EggRecord> nestFertile = new List<EggRecord>();   // fertile eggs in the nest
        public List<EggRecord> basket = new List<EggRecord>();        // fertile eggs in the hatchery, waiting for a choice
        public List<IncItem> incubator = new List<IncItem>();
        public int hatched = 0, sold = 0;
        public string check = "";
    }

    /// <summary>
    /// The farm's rules. Stage 1: hens lay into the nest while the feeder has food; tap the nest to collect (eating eggs are
    /// sold at once); tap the feeder to fill it. Stage 2: every bird has a name, traits, a grade, a value and a personality
    /// (tap her for her card); the Glutton by the apple tree jumps for apples, and two apples make an apple egg.
    /// Stage 2b, breeding: with a grown rooster in the yard most eggs are fertile and go to the Hatchery, where each one can be
    /// incubated or sold; chicks hatch with traits from both parents, grow up into young birds then grown-ups, and any bird in
    /// the coop can be sold to make room (a coop holds 5).
    /// Saved on the device; while the game is closed the farm carries on for up to two days.
    /// </summary>
    public class FarmGame : MonoBehaviour
    {
        public static FarmGame Instance { get; private set; }

        [Header("Rules (quick for now, so the farm can be tried out)")]
        public float layEverySeconds = 60f;      // each hen lays about this often while fed
        public int nestCapacity = 24;
        public int eggPrice = 12;
        public float feederLastsSeconds = 900f;  // a full feeder lasts this long
        public int feedPrice = 60;

        [Header("Farm parts (set by Build starter farm)")]
        public NestBox nest;
        public Feeder feeder;
        public FarmHud hud;
        public BirdInfo[] birds = new BirdInfo[0];   // the birds the farm starts with
        public AppleTree appleTree;
        public GrassEgg appleEgg;
        public int appleEggEggs = 3;             // an apple egg is worth this many ordinary eggs

        [Header("Models for birds hatched on the farm (set by Build starter farm)")]
        public GameObject henStand, henPeck, roosterStand, roosterPeck, chickStand, chickPeck;
        public Material[] birdMaterials = new Material[0];

        public const string SaveKey = "FeatherField.save.v1";
        const string Salt = "ff::feather-field::unity::2026";
        const double MaxAwaySeconds = 2.0 * 24.0 * 3600.0;
        const long MaxCoins = 1000000000000L;
        const int MaxId = 1000000000;

        FarmSave save;
        readonly List<BirdInfo> flock = new List<BirdInfo>();
        readonly System.Random rnd = new System.Random(System.Environment.TickCount);
        Dictionary<string, Material> matByName;
        Transform flockParent;
        Vector3 yardMin, yardMax;
        Vector4[] yardObs = new Vector4[0];
        float birdY;
        bool haveYard, warnedModels;
        float saveTimer, awaySeconds;
        bool dirty;
        int awayEggs, changes;

        // a tap is a short press that hardly moves (a drag moves the camera instead)
        bool pressing, multi;
        Vector2 pressPos, lastPos;
        float pressTime;

        public long Coins { get { return save != null ? save.coins : 0; } }
        public int NestEggs { get { return save != null ? save.nestEggs + save.nestFertile.Count : 0; } }
        public float FeederLevel { get { return save != null ? save.feeder : 0f; } }
        public long EggsCollected { get { return save != null ? save.eggsCollected : 0; } }
        public bool AppleWanted { get { return save != null && !save.appleEgg; } }

        /// <summary>Goes up whenever the hatchery or the flock changes, so the screens know to redraw.</summary>
        public int Changes { get { return changes; } }
        public IReadOnlyList<EggRecord> Basket { get { return save != null ? save.basket : new List<EggRecord>(); } }
        public IReadOnlyList<IncItem> Incubator { get { return save != null ? save.incubator : new List<IncItem>(); } }

        /// <summary>Birds living in the coop and its yard (the hen by the apple tree doesn't count).</summary>
        public int YardCount
        {
            get { int n = 0; foreach (var b in flock) if (b != null && b.InYard) n++; return n; }
        }
        public bool CoopFull { get { return YardCount >= Rules.CoopCap; } }

        public int EggSellPrice(EggRecord e) { return Rules.FertileEggPrice(e, eggPrice); }

        /// <summary>The father of the coop's chicks: its best grown rooster (null when there is none).</summary>
        public BirdInfo BreedingRooster()
        {
            BirdInfo best = null;
            foreach (var b in flock)
            {
                if (b == null || b.data == null || !b.InYard || !b.data.rooster || !Rules.Grown(b.data)) continue;
                if (best == null || Rules.Quality(b.data) > Rules.Quality(best.data)) best = b;
            }
            return best;
        }

        void Awake()
        {
            Instance = this;
            awaySeconds = Load();
            BuildFlock();
            CatchUp(awaySeconds);
        }

        void Start()
        {
            if (nest != null) nest.Show(NestEggs, false);
            if (feeder != null) feeder.Show(save.feeder);
            if (appleTree != null) appleTree.SetCount(save.apples < 0 ? appleTree.Max : save.apples);
            if (appleEgg != null) appleEgg.Show(save.appleEgg, AppleEggSpot(), false);
            if (hud != null && awayEggs > 0) hud.Toast("While you were away: " + awayEggs + (awayEggs == 1 ? " new egg" : " new eggs") + " in the nest.");
            else if (hud != null) hud.Toast("Tap the nest for eggs, the feeder to fill it, and any bird to see her card.");
            HatchReady();                                            // eggs that finished hatching while the game was closed
            Save();
        }

        // ------------------------------------------------------------------ the flock
        // Every bird on the farm gets her record from the save. The birds the farm starts with are numbered 1 to 5 (their place
        // in the starting flock); one missing from a saved flock was sold, so she goes. Hatched birds (100 and up) are made again.
        void BuildFlock()
        {
            for (int i = 0; i < birds.Length && !haveYard; i++)              // where hatched birds walk: the yard, copied from a yard bird
            {
                if (birds[i] == null || !birds[i].InYard) continue;
                var w = birds[i].GetComponent<HenWander>();
                if (w == null) continue;
                yardMin = w.areaMin; yardMax = w.areaMax;
                yardObs = (Vector4[])w.obstacles.Clone();
                birdY = w.transform.position.y;
                flockParent = w.transform.parent;
                haveYard = true;
            }

            var used = new HashSet<string>();
            var byId = new Dictionary<int, BirdRecord>();
            foreach (var r in save.birds) { used.Add(r.name); byId[r.id] = r; }
            for (int i = 0; i < birds.Length; i++)
            {
                var b = birds[i];
                if (b == null) continue;
                BirdRecord r;
                if (!byId.TryGetValue(i + 1, out r))
                {
                    if (save.flockSaved && !b.appleLover) { birds[i] = null; Destroy(b.gameObject); continue; }   // sold
                    r = Rules.NewBird(b.rooster, rnd, used);
                    r.id = i + 1;
                    save.birds.Add(r);
                }
                r.grow = 0f;                                                 // the starting birds are grown up
                if (b.appleLover) r.pers = (int)Personality.Glutton;         // the hen by the apple tree loves her food
                Attach(b, r);
            }
            var hatchedOnes = new List<BirdRecord>();
            foreach (var r in save.birds) if (r.id >= 100) hatchedOnes.Add(r);
            foreach (var r in hatchedOnes)
                if (Spawn(r, false) == null) save.birds.Remove(r);          // can't be drawn (models missing): see the warning
            save.flockSaved = true;
            changes++;
            dirty = true;
        }

        void Attach(BirdInfo b, BirdRecord r)
        {
            b.data = r;
            b.rooster = r.rooster;
            b.wander = b.GetComponent<HenWander>();
            b.layTimer = Random.Range(4f, layEverySeconds * 0.6f);
            if (!flock.Contains(b)) flock.Add(b);
            if (Rules.StageOf(r) != b.shownStage) ApplyStage(b, false);
        }

        bool CanSpawn
        {
            get
            {
                bool ok = haveYard && chickStand != null && henStand != null && roosterStand != null;
                if (!ok && !warnedModels)
                {
                    warnedModels = true;
                    Debug.LogWarning("Feather and Field: chicks can't hatch yet. Click Feather and Field > Build starter farm again, then Play.");
                }
                return ok;
            }
        }

        /// <summary>Puts a hatched bird in the yard (with a little pop when she has just hatched).</summary>
        BirdInfo Spawn(BirdRecord r, bool pop)
        {
            if (!CanSpawn) return null;
            var go = new GameObject(r.name);
            var root = go.transform;
            root.SetParent(flockParent, false);
            var visual = new GameObject("Visual").transform;
            visual.SetParent(root, false);
            var w = go.AddComponent<HenWander>();
            w.visual = visual;
            w.areaMin = yardMin; w.areaMax = yardMax;
            w.obstacles = (Vector4[])yardObs.Clone();
            root.position = w.FreeSpot(birdY);
            root.rotation = Quaternion.Euler(0f, Random.Range(0f, 360f), 0f);
            go.AddComponent<CapsuleCollider>();                        // so a tap finds her (sized in ApplyStage)
            var info = go.AddComponent<BirdInfo>();
            info.slot = -1;
            info.shownStage = (Stage)(-1);                              // no models yet
            Attach(info, r);
            if (pop) StartCoroutine(PopIn(visual));
            return info;
        }

        /// <summary>Draws a bird as she is now: a chick, a small young bird, or a grown-up.</summary>
        void ApplyStage(BirdInfo b, bool pop)
        {
            if (b == null || b.data == null) return;
            var w = b.wander != null ? b.wander : b.GetComponent<HenWander>();
            var s = Rules.StageOf(b.data);
            GameObject standSrc, peckSrc;
            float scale = 1f;
            if (s == Stage.Chick) { standSrc = chickStand; peckSrc = chickPeck; }
            else
            {
                standSrc = b.data.rooster ? roosterStand : henStand;
                peckSrc = b.data.rooster ? roosterPeck : henPeck;
                if (s == Stage.Young) scale = 0.8f;
            }
            if (w == null || w.visual == null || standSrc == null) { b.shownStage = s; return; }
            var stand = MakeModel(standSrc, w.visual, scale);
            var peck = peckSrc != null ? MakeModel(peckSrc, w.visual, scale) : null;
            if (peck != null) peck.SetActive(false);
            w.SetModels(stand, peck);
            w.speed = s == Stage.Chick ? 0.24f : 0.32f;                 // little legs
            b.shownStage = s;
            var cc = b.GetComponent<CapsuleCollider>();
            if (cc != null)
            {
                if (s == Stage.Chick) { cc.center = new Vector3(0f, 0.09f, 0f); cc.radius = 0.12f; cc.height = 0.24f; }
                else { cc.center = new Vector3(0f, 0.17f * scale, 0f); cc.radius = Mathf.Max(0.12f, 0.13f * scale); cc.height = Mathf.Max(0.26f, 0.36f * scale); }
            }
            if (pop) StartCoroutine(PopIn(w.visual));
        }

        GameObject MakeModel(GameObject src, Transform parent, float scale)
        {
            var go = Instantiate(src, parent, false);
            go.transform.localPosition = Vector3.zero;
            go.transform.localRotation = Quaternion.identity;
            go.transform.localScale = Vector3.one * scale;
            if (matByName == null)
            {
                matByName = new Dictionary<string, Material>();
                foreach (var m in birdMaterials) if (m != null) matByName[m.name] = m;
            }
            foreach (var r in go.GetComponentsInChildren<Renderer>(true))       // the farm's own materials, by name
            {
                var sm = r.sharedMaterials;
                for (int i = 0; i < sm.Length; i++)
                {
                    if (sm[i] == null) continue;
                    string n = sm[i].name.Replace(" (Instance)", "");
                    int dot = n.IndexOf('.');
                    if (dot > 0) n = n.Substring(0, dot);
                    Material m;
                    if (matByName.TryGetValue(n, out m)) sm[i] = m;
                }
                r.sharedMaterials = sm;
            }
            return go;
        }

        IEnumerator PopIn(Transform t)
        {
            const float dur = 0.5f;
            for (float k = 0f; k < dur; k += Time.deltaTime)
            {
                if (t == null) yield break;
                float x = k / dur;
                float s = 1f + 2.7f * Mathf.Pow(x - 1f, 3f) + 1.7f * Mathf.Pow(x - 1f, 2f);      // grows past full size, then settles
                t.localScale = Vector3.one * Mathf.Max(0.01f, s);
                yield return null;
            }
            if (t != null) t.localScale = Vector3.one;
        }

        bool IsLayer(BirdInfo b)
        {
            return b != null && b.data != null && b.InYard && !b.data.rooster && Rules.Grown(b.data) && b.wander != null;
        }

        // ------------------------------------------------------------------ every frame
        void Update()
        {
            float dt = Time.deltaTime;
            if (save.feeder > 0f)                                    // hens only lay while they are fed
            {
                save.feeder = Mathf.Max(0f, save.feeder - dt / Mathf.Max(1f, feederLastsSeconds));
                bool nestTaken = false;                              // one hen on the nest at a time: the others wait their turn
                foreach (var b in flock) if (b != null && b.wander != null && b.wander.Busy) nestTaken = true;
                foreach (var b in flock)
                {
                    if (!IsLayer(b)) continue;
                    b.layTimer -= dt;
                    if (b.layTimer > 0f) continue;
                    if (nestTaken) { b.layTimer = Random.Range(4f, 9f); continue; }
                    b.layTimer = layEverySeconds * Random.Range(0.8f, 1.2f);
                    if (nest != null && NestEggs < nestCapacity && !b.wander.Busy && !b.wander.paused)
                    {
                        var hen = b;
                        b.wander.GoLay(nest.LaySpot, () => LayEgg(hen));
                        nestTaken = true;
                    }
                }
                dirty = true;
            }
            if (feeder != null) feeder.Show(save.feeder);
            if (appleTree != null)
            {
                appleTree.Tick(dt);
                if (appleTree.Count != save.apples) { save.apples = appleTree.Count; dirty = true; }
            }
            GrowUp(dt);
            TickIncubator(dt);
            HandleTaps();
            saveTimer += dt;
            if (dirty && saveTimer > 5f) { saveTimer = 0f; Save(); }
        }

        void LayEgg(BirdInfo hen)
        {
            if (NestEggs >= nestCapacity) return;
            var sire = BreedingRooster();
            bool alive = hen != null && hen.data != null;
            float fertility = alive && hen.data.pers == (int)Personality.Mum ? Rules.MumFertility : Rules.Fertility;
            if (alive && sire != null && rnd.NextDouble() < fertility) save.nestFertile.Add(Rules.MakeEgg(sire.data, hen.data, rnd));
            else save.nestEggs++;
            if (nest != null) nest.Show(NestEggs, true);
            dirty = true;
        }

        void GrowUp(float dt)
        {
            for (int i = 0; i < flock.Count; i++)
            {
                var b = flock[i];
                if (b == null || b.data == null || b.data.grow <= 0f) continue;
                b.data.grow = Mathf.Max(0f, b.data.grow - dt);
                dirty = true;
                var s = Rules.StageOf(b.data);
                if (s == b.shownStage) continue;
                ApplyStage(b, true);
                changes++;
                if (hud == null) continue;
                string n = b.data.name;
                if (s == Stage.Young && b.data.rooster) hud.Toast(n + " is a cockerel now: a young rooster.");
                else if (s == Stage.Young) { hud.Toast(n + " is a pullet now: a young hen. She can lay eggs."); b.layTimer = Random.Range(8f, layEverySeconds * 0.6f); }
                else hud.Toast(n + " is all grown up!");
            }
        }

        // ------------------------------------------------------------------ eggs
        public void CollectEggs()
        {
            int plain = save.nestEggs, fertile = save.nestFertile.Count;
            if (plain + fertile <= 0) { if (hud != null) hud.Toast("No eggs yet. The hens lay while the feeder has food."); return; }
            long earned = (long)plain * eggPrice;

            // fertile eggs go to the hatchery; when it is full, the least promising ones are sold
            save.basket.AddRange(save.nestFertile);
            save.nestFertile.Clear();
            save.basket.Sort((a, b) => b.expect.CompareTo(a.expect));
            int extra = 0; long extraCoins = 0;
            while (save.basket.Count > Rules.BasketCap)
            {
                var e = save.basket[save.basket.Count - 1];
                extraCoins += EggSellPrice(e);
                extra++;
                save.basket.RemoveAt(save.basket.Count - 1);
            }

            save.nestEggs = 0;
            save.eggsCollected += plain + fertile;
            AddCoins(earned + extraCoins);
            changes++;
            if (nest != null) nest.Show(0, false);
            if (hud != null)
            {
                Vector3 at = nest != null ? nest.transform.position : Vector3.zero;
                if (plain > 0) hud.FlyEggs(at, plain, false);
                if (fertile - extra > 0) hud.FlyEggs(at, fertile - extra, true);
                string msg;
                if (fertile == 0) msg = "+" + plain + (plain == 1 ? " egg" : " eggs") + ", sold for " + earned + " coins";
                else
                {
                    msg = plain > 0 ? plain + (plain == 1 ? " egg" : " eggs") + " sold for " + earned + " coins. " : "";
                    int kept = fertile - extra;
                    if (kept > 0) msg += kept + (kept == 1 ? " fertile egg is" : " fertile eggs are") + " waiting in the Hatchery.";
                    if (extra > 0) msg += (kept > 0 ? " " : "") + "The Hatchery was full: " + extra + (extra == 1 ? " fertile egg" : " fertile eggs") + " sold for " + extraCoins + " coins.";
                }
                hud.Toast(msg);
            }
            Save();
        }

        // ------------------------------------------------------------------ the hatchery
        /// <summary>Puts a fertile egg from the hatchery's basket into the incubator.</summary>
        public void Incubate(EggRecord e)
        {
            int i = save.basket.IndexOf(e);
            if (i < 0) return;
            if (save.incubator.Count >= Rules.IncubatorSlots) { if (hud != null) hud.Toast("The incubator is full. Wait for an egg to hatch."); return; }
            save.basket.RemoveAt(i);
            var it = new IncItem();
            it.egg = e; it.left = Rules.HatchSeconds;
            save.incubator.Add(it);
            changes++;
            if (hud != null) hud.Toast(e.dam + "'s egg is in the incubator. It hatches in " + FarmHud.Clock(Rules.HatchSeconds) + ".");
            Save();
        }

        /// <summary>Sells a fertile egg from the hatchery's basket.</summary>
        public void SellEgg(EggRecord e)
        {
            int i = save.basket.IndexOf(e);
            if (i < 0) return;
            int p = EggSellPrice(e);
            save.basket.RemoveAt(i);
            AddCoins(p);
            changes++;
            if (hud != null) hud.Toast("Sold " + e.dam + "'s fertile egg for " + p + " coins.");
            Save();
        }

        void TickIncubator(float dt)
        {
            bool done = false;
            foreach (var it in save.incubator)
            {
                if (it.left <= 0f) continue;
                it.left = Mathf.Max(0f, it.left - dt);
                if (it.left <= 0f) done = true;
                dirty = true;
            }
            if (done) changes++;
            HatchReady();
        }

        /// <summary>Hatches every egg whose time is up, while there is room in the coop.</summary>
        void HatchReady()
        {
            for (int i = 0; i < save.incubator.Count; i++)
            {
                var it = save.incubator[i];
                if (it.left > 0f) continue;
                if (CoopFull || !CanSpawn)
                {
                    if (!it.told && hud != null && CoopFull)
                        hud.Toast(it.egg.dam + "'s egg is ready to hatch, but the coop is full (" + Rules.CoopCap + " birds). Sell a bird to make room.");
                    it.told = true;
                    continue;
                }
                save.incubator.RemoveAt(i); i--;
                Hatch(it.egg);
            }
        }

        void Hatch(EggRecord e)
        {
            var r = e.child;
            var used = new HashSet<string>();
            foreach (var x in save.birds) used.Add(x.name);
            r.name = Rules.NewName(r.rooster, rnd, used);
            r.id = save.nextId;
            save.nextId = Mathf.Min(MaxId, save.nextId + 1);
            r.grow = Rules.NewChickGrow(r.fast);
            save.birds.Add(r);
            save.hatched++;
            changes++;
            if (Spawn(r, true) == null) { save.birds.Remove(r); return; }
            if (hud != null) hud.Toast("A Rhode Island Red chick hatched: " + r.name + "! " + Rules.RevealText(r));
            Save();
        }

        // ------------------------------------------------------------------ selling a bird
        public bool CanSell(BirdInfo b) { return b != null && b.data != null && b.InYard && flock.Contains(b); }

        public void SellBird(BirdInfo b)
        {
            if (b == null || b.data == null || !flock.Contains(b)) return;
            if (!b.InYard) { if (hud != null) hud.Toast(b.data.name + " lives by the apple tree, so she stays on the farm."); return; }
            int p = Rules.SellPrice(b.data);
            string name = b.data.name;
            save.birds.Remove(b.data);
            flock.Remove(b);
            for (int i = 0; i < birds.Length; i++) if (birds[i] == b) birds[i] = null;
            Destroy(b.gameObject);
            AddCoins(p);
            save.sold++;
            changes++;
            if (hud != null) { hud.HideBird(); hud.Toast("Sold " + name + " for " + p + " coins."); }
            HatchReady();                                            // an egg waiting for room can hatch now
            Save();
        }

        void AddCoins(long n)
        {
            save.coins = System.Math.Max(0L, System.Math.Min(MaxCoins, save.coins + n));
        }

        // ------------------------------------------------------------------ the Glutton and her apples
        Vector3 AppleEggSpot()
        {
            return new Vector3(save.appleEggX, 0f, save.appleEggZ);
        }

        /// <summary>The Glutton has eaten an apple: two make an apple egg, laid in the grass beside her.</summary>
        public void AppleEaten(BirdInfo who, Vector3 where)
        {
            string name = who != null && who.data != null ? who.data.name : "Your hen";
            save.applesEaten++;
            if (save.applesEaten >= 2 && !save.appleEgg && appleEgg != null)
            {
                save.applesEaten = 0;
                save.appleEgg = true;
                Vector3 spot = where - (who != null ? who.transform.forward : Vector3.forward) * 0.18f;
                save.appleEggX = spot.x; save.appleEggZ = spot.z;
                appleEgg.Show(true, AppleEggSpot(), true);
                if (hud != null) hud.Toast(name + " laid an apple egg! Tap it to collect.");
            }
            else if (hud != null) hud.Toast(name + " ate an apple. Yum!");
            Save();
        }

        public void CollectAppleEgg()
        {
            if (!save.appleEgg) return;
            long earned = (long)eggPrice * appleEggEggs;
            save.appleEgg = false;
            save.eggsCollected += 1;
            AddCoins(earned);
            Vector3 at = AppleEggSpot();
            if (appleEgg != null) appleEgg.Show(false, at, false);
            if (hud != null) { hud.FlyEggs(at, 1, false); hud.Toast("An apple egg! Sold for " + earned + " coins"); }
            Save();
        }

        public void FillFeeder()
        {
            if (save.feeder > 0.9f) { if (hud != null) hud.Toast("The feeder is already full."); return; }
            if (save.coins < feedPrice) { if (hud != null) hud.Toast("Not enough coins: collect some eggs first."); return; }
            save.coins -= feedPrice;
            save.feeder = 1f;
            if (feeder != null) feeder.Show(1f);
            if (hud != null) hud.Toast("Feeder filled for " + feedPrice + " coins.");
            Save();
        }

        // ------------------------------------------------------------------ taps
        void HandleTaps()
        {
            bool down = false, up = false, many = false;
            Vector2 pos = Vector2.zero;
#if ENABLE_INPUT_SYSTEM
            var pointer = Pointer.current;
            if (pointer != null)
            {
                pos = pointer.position.ReadValue();
                down = pointer.press.wasPressedThisFrame;
                up = pointer.press.wasReleasedThisFrame;
            }
            var touch = Touchscreen.current;
            if (touch != null)
            {
                int active = 0;
                foreach (var t in touch.touches) if (t.press.isPressed) active++;
                many = active > 1;
            }
#else
            pos = Input.mousePosition;
            down = Input.GetMouseButtonDown(0);
            up = Input.GetMouseButtonUp(0);
            many = Input.touchCount > 1;
#endif
            if (down) { pressing = true; pressPos = pos; lastPos = pos; pressTime = Time.unscaledTime; multi = many; }
            if (many) multi = true;
            if (pressing && !up) lastPos = pos;
            if (up && pressing)
            {
                pressing = false;
                float slop = 14f * Mathf.Max(1f, Screen.dpi / 160f);
                bool tap = !multi && (lastPos - pressPos).magnitude < slop && Time.unscaledTime - pressTime < 0.5f;
                if (tap) TapAt(pressPos);
            }
        }

        void TapAt(Vector2 screenPos)
        {
            if (hud != null && hud.Tap(screenPos)) return;               // buttons, the hatchery and the bird card come first
            var cam = Camera.main;
            if (cam == null) return;
            RaycastHit hit;
            if (!Physics.Raycast(cam.ScreenPointToRay(screenPos), out hit, 500f)) { if (hud != null) hud.HideBird(); return; }
            var bird = hit.collider.GetComponentInParent<BirdInfo>();
            if (hit.collider.GetComponentInParent<GrassEgg>() != null) { if (hud != null) hud.HideBird(); CollectAppleEgg(); }
            else if (bird != null) { if (hud != null) hud.ShowBird(bird); }
            else if (hit.collider.GetComponentInParent<NestBox>() != null) { if (hud != null) hud.HideBird(); CollectEggs(); }
            else if (hit.collider.GetComponentInParent<Feeder>() != null) { if (hud != null) hud.HideBird(); FillFeeder(); }
            else if (hud != null) hud.HideBird();
        }

        // ------------------------------------------------------------------ saving
        static readonly System.Globalization.CultureInfo Inv = System.Globalization.CultureInfo.InvariantCulture;

        static string Hash(string body)
        {
            using (var sha = System.Security.Cryptography.SHA1.Create())
            {
                byte[] h = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(body));
                var sb = new System.Text.StringBuilder();
                for (int i = 0; i < 8; i++) sb.Append(h[i].ToString("x2"));
                return sb.ToString();
            }
        }

        static string Num(float x) { return float.IsNaN(x) ? "nan" : ((long)System.Math.Round(x * 1000.0)).ToString(Inv); }

        static void Key(System.Text.StringBuilder sb, BirdRecord b)
        {
            if (b == null) { sb.Append("-;"); return; }
            sb.Append(b.id).Append(',').Append(b.name).Append(',').Append(b.rooster).Append(',').Append(b.type).Append(',').Append(b.plum)
              .Append(',').Append(b.size).Append(',').Append(b.lay).Append(',').Append(b.pers).Append(',').Append(Num(b.grow)).Append(',')
              .Append(b.fast).Append(',').Append(b.mum).Append(',').Append(b.dad).Append(',').Append(b.gen).Append(';');
        }

        static void Key(System.Text.StringBuilder sb, EggRecord e)
        {
            if (e == null) { sb.Append("-;"); return; }
            Key(sb, e.child);
            sb.Append(e.dam).Append(',').Append(e.sire).Append(',').Append(e.damQ).Append(',').Append(e.sireQ).Append(',').Append(e.expect).Append(';');
        }

        string Sign(FarmSave s)
        {
            var sb = new System.Text.StringBuilder();
            sb.Append(s.version).Append('|').Append(s.coins).Append('|').Append(s.nestEggs).Append('|').Append(Num(s.feeder)).Append('|')
              .Append(s.eggsCollected).Append('|').Append(s.savedAt).Append('|').Append(s.apples).Append('|').Append(s.applesEaten).Append('|')
              .Append(s.appleEgg).Append('|').Append(Num(s.appleEggX)).Append('|').Append(Num(s.appleEggZ)).Append('|').Append(s.flockSaved).Append('|')
              .Append(s.nextId).Append('|').Append(s.hatched).Append('|').Append(s.sold).Append("|B:");
            if (s.birds != null) foreach (var b in s.birds) Key(sb, b);
            sb.Append("|N:");
            if (s.nestFertile != null) foreach (var e in s.nestFertile) Key(sb, e);
            sb.Append("|K:");
            if (s.basket != null) foreach (var e in s.basket) Key(sb, e);
            sb.Append("|I:");
            if (s.incubator != null) foreach (var it in s.incubator) { if (it == null) { sb.Append("-;"); continue; } Key(sb, it.egg); sb.Append(Num(it.left)).Append(';'); }
            sb.Append('|').Append(Salt);
            return Hash(sb.ToString());
        }

        // how saves from stages 1 and 2a were signed, so they still check out
        string SignV1(FarmSave s)
        {
            var birdsKey = new System.Text.StringBuilder();
            if (s.birds != null)
                foreach (var b in s.birds)
                    if (b != null) birdsKey.Append(b.name).Append(',').Append(b.type).Append(',').Append(b.plum).Append(',').Append(b.size).Append(',').Append(b.lay).Append(',').Append(b.pers).Append(';');
            string body = s.version + "|" + s.coins + "|" + s.nestEggs + "|" + s.feeder.ToString("R", Inv)
                + "|" + s.eggsCollected + "|" + s.savedAt + "|" + s.apples + "|" + s.applesEaten + "|" + s.appleEgg + "|" + birdsKey + "|" + Salt;
            return Hash(body);
        }

        public void Save()
        {
            if (save == null) return;
            save.version = 2;
            save.savedAt = System.DateTime.UtcNow.Ticks;
            save.check = Sign(save);
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(save));
            PlayerPrefs.Save();
            dirty = false;
        }

        /// <summary>Reads the save and checks everything in it. Returns how long the game was closed, in seconds.</summary>
        float Load()
        {
            save = null;
            string json = PlayerPrefs.GetString(SaveKey, "");
            if (!string.IsNullOrEmpty(json))
            {
                try { save = JsonUtility.FromJson<FarmSave>(json); }
                catch (System.Exception) { save = null; }
            }
            if (save == null) { save = new FarmSave(); return 0f; }
            string expected = save.version < 2 ? SignV1(save) : Sign(save);
            if (save.check != expected) Debug.LogWarning("Feather and Field: the save was changed outside the game; every value was checked.");

            // every number is checked, whatever the save says
            save.coins = System.Math.Max(0L, System.Math.Min(MaxCoins, save.coins));
            save.feeder = float.IsNaN(save.feeder) ? 0f : Mathf.Clamp01(save.feeder);
            save.eggsCollected = System.Math.Max(0L, save.eggsCollected);
            save.hatched = Mathf.Max(0, save.hatched);
            save.sold = Mathf.Max(0, save.sold);
            int maxApples = appleTree != null ? appleTree.apples.Length : 0;
            save.apples = save.apples < 0 ? -1 : Mathf.Clamp(save.apples, 0, maxApples);
            save.applesEaten = Mathf.Clamp(save.applesEaten, 0, 1);
            Vector3 tp = appleTree != null ? appleTree.transform.position : Vector3.zero;          // an apple egg is always near the tree
            if (float.IsNaN(save.appleEggX) || float.IsNaN(save.appleEggZ) || Mathf.Abs(save.appleEggX - tp.x) > 1.6f || Mathf.Abs(save.appleEggZ - tp.z) > 1.6f)
            { save.appleEggX = tp.x - 0.55f; save.appleEggZ = tp.z + 0.6f; }

            // eggs: fertile ones in the nest, the hatchery's basket, the incubator
            save.nestFertile = CleanEggs(save.nestFertile, nestCapacity);
            save.nestEggs = Mathf.Clamp(save.nestEggs, 0, nestCapacity - save.nestFertile.Count);
            save.basket = CleanEggs(save.basket, Rules.BasketCap);
            var inc = new List<IncItem>();
            if (save.incubator != null)
                foreach (var it in save.incubator)
                {
                    if (it == null || inc.Count >= Rules.IncubatorSlots) continue;
                    var e = Rules.CleanEgg(it.egg);
                    if (e == null) continue;
                    var n = new IncItem();
                    n.egg = e;
                    n.left = float.IsNaN(it.left) || float.IsInfinity(it.left) ? Rules.HatchSeconds : Mathf.Clamp(it.left, 0f, Rules.HatchSeconds);
                    inc.Add(n);
                }
            save.incubator = inc;

            // birds: the starting ones are numbered 1 to 5, hatched ones 100 and up; no doubles, no more than the coop holds
            bool old = save.version < 2;
            var birdsIn = save.birds ?? new List<BirdRecord>();
            var list = new List<BirdRecord>();
            var ids = new HashSet<int>();
            var names = new HashSet<string>();
            int yard = 0, maxId = 99;
            for (int i = 0; i < birdsIn.Count; i++)
            {
                var r = birdsIn[i];
                if (r == null) continue;
                if (old) r.id = i + 1;                       // stages 1 and 2a saved the starting birds in order, without numbers
                bool starting = r.id >= 1 && r.id <= birds.Length;
                if (ids.Contains(r.id) || (!starting && (r.id < 100 || r.id > MaxId))) continue;
                if (starting && birds[r.id - 1] == null) continue;
                bool inYard = !starting || birds[r.id - 1].InYard;
                if (inYard && yard >= Rules.CoopCap) continue;
                r = Rules.Clean(r, starting ? birds[r.id - 1].rooster : r.rooster);
                if (starting) r.grow = 0f;
                if (names.Contains(r.name)) r.name = Rules.NewName(r.rooster, rnd, names);
                names.Add(r.name);
                ids.Add(r.id);
                if (inYard) yard++;
                if (!starting) maxId = Mathf.Max(maxId, r.id);
                list.Add(r);
            }
            save.birds = list;
            save.nextId = Mathf.Clamp(Mathf.Max(save.nextId, maxId + 1), 100, MaxId);
            if (old) save.flockSaved = false;
            save.version = 2;

            // time away: the farm carries on for up to two days; a clock moved backwards gives nothing
            double away = (System.DateTime.UtcNow.Ticks - save.savedAt) / (double)System.TimeSpan.TicksPerSecond;
            if (save.savedAt <= 0 || away < 0) away = 0;
            if (away > MaxAwaySeconds) away = MaxAwaySeconds;
            return (float)away;
        }

        static List<EggRecord> CleanEggs(List<EggRecord> eggs, int cap)
        {
            var list = new List<EggRecord>();
            if (eggs == null) return list;
            foreach (var e in eggs)
            {
                if (list.Count >= cap) break;
                var c = Rules.CleanEgg(e);
                if (c != null) list.Add(c);
            }
            return list;
        }

        void CatchUp(float seconds)
        {
            if (seconds < 1f) return;
            // laying, while the feeder lasted
            float fed = Mathf.Min(seconds, save.feeder * feederLastsSeconds);
            save.feeder = Mathf.Max(0f, save.feeder - seconds / Mathf.Max(1f, feederLastsSeconds));
            var hens = new List<BirdInfo>();
            foreach (var b in flock) if (IsLayer(b)) hens.Add(b);
            int laid = hens.Count == 0 ? 0 : Mathf.FloorToInt(hens.Count * fed / Mathf.Max(1f, layEverySeconds));
            laid = Mathf.Clamp(laid, 0, nestCapacity - NestEggs);
            var sire = BreedingRooster();
            for (int k = 0; k < laid; k++)
            {
                var hen = hens[rnd.Next(hens.Count)];
                float fertility = hen.data.pers == (int)Personality.Mum ? Rules.MumFertility : Rules.Fertility;
                if (sire != null && rnd.NextDouble() < fertility) save.nestFertile.Add(Rules.MakeEgg(sire.data, hen.data, rnd));
                else save.nestEggs++;
            }
            awayEggs = laid;
            // the incubator and growing up carry on too
            foreach (var it in save.incubator) it.left = Mathf.Max(0f, it.left - seconds);
            foreach (var b in flock)
            {
                if (b == null || b.data == null || b.data.grow <= 0f) continue;
                b.data.grow = Mathf.Max(0f, b.data.grow - seconds);
                if (Rules.StageOf(b.data) != b.shownStage) ApplyStage(b, false);
            }
            if (appleTree != null && save.apples >= 0)
                save.apples = Mathf.Min(appleTree.apples.Length, save.apples + Mathf.FloorToInt(seconds / Mathf.Max(1f, appleTree.regrowSeconds)));
        }

        void OnApplicationPause(bool paused) { if (paused) Save(); }
        void OnApplicationQuit() { Save(); }
        void OnDisable() { Save(); }
    }
}
