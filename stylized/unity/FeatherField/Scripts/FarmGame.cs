using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace FeatherField
{
    /// <summary>
    /// What is saved on the device. Every number is checked again when it is loaded.
    /// </summary>
    [System.Serializable]
    public class FarmSave
    {
        public int version = 1;
        public long coins = 150;
        public int nestEggs = 0;
        public float feeder = 1f;          // 0 = empty, 1 = full
        public long eggsCollected = 0;
        public long savedAt = 0;           // when it was saved (UTC ticks)
        public BirdRecord[] birds = new BirdRecord[0];
        public int apples = -1;            // apples on the tree (-1: not saved yet, the tree starts full)
        public int applesEaten = 0;        // by the Glutton since her last apple egg
        public bool appleEgg = false;      // an apple egg waiting in the grass
        public float appleEggX = 0f, appleEggZ = 0f;
        public string check = "";
    }

    /// <summary>
    /// The farm's rules. Stage 1: hens lay into the nest while the feeder has food; tap the nest to collect (the eggs are
    /// sold at once for coins); tap the feeder to fill it. Stage 2: every bird has a name, traits, a grade, a value and a
    /// personality (tap her for her card); the Glutton by the apple tree jumps for apples, and two apples make an apple egg.
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
        public HenWander[] layers = new HenWander[0];
        public BirdInfo[] birds = new BirdInfo[0];
        public AppleTree appleTree;
        public GrassEgg appleEgg;
        public int appleEggEggs = 3;             // an apple egg is worth this many ordinary eggs

        public const string SaveKey = "FeatherField.save.v1";
        const string Salt = "ff::feather-field::unity::2026";
        const double MaxAwaySeconds = 2.0 * 24.0 * 3600.0;
        const long MaxCoins = 1000000000000L;

        FarmSave save;
        float[] layTimers = new float[0];
        float saveTimer;
        bool dirty;
        int awayEggs;

        // a tap is a short press that hardly moves (a drag moves the camera instead)
        bool pressing, multi;
        Vector2 pressPos, lastPos;
        float pressTime;

        public long Coins { get { return save != null ? save.coins : 0; } }
        public int NestEggs { get { return save != null ? save.nestEggs : 0; } }
        public float FeederLevel { get { return save != null ? save.feeder : 0f; } }
        public long EggsCollected { get { return save != null ? save.eggsCollected : 0; } }
        public bool AppleWanted { get { return save != null && !save.appleEgg; } }

        void Awake()
        {
            Instance = this;
            Load();
            AssignBirds();
        }

        // every bird on the farm gets her record from the save (new birds get a name, traits and a personality)
        void AssignBirds()
        {
            var used = new System.Collections.Generic.HashSet<string>();
            var rnd = new System.Random(System.Environment.TickCount);
            var list = new BirdRecord[birds.Length];
            for (int i = 0; i < birds.Length; i++)
            {
                if (birds[i] == null) continue;
                BirdRecord r = i < save.birds.Length ? Rules.Clean(save.birds[i], birds[i].rooster) : null;
                if (r != null && used.Contains(r.name)) r.name = r.name.Length < 18 ? r.name + " " + (i + 1) : r.name;
                if (r == null) r = Rules.NewBird(birds[i].rooster, rnd, used);
                if (birds[i].appleLover) r.pers = (int)Personality.Glutton;        // the hen by the apple tree loves her food
                used.Add(r.name);
                list[i] = r;
                birds[i].data = r;
            }
            save.birds = list;
            dirty = true;
        }

        void Start()
        {
            layTimers = new float[layers.Length];
            for (int i = 0; i < layTimers.Length; i++) layTimers[i] = Random.Range(4f, layEverySeconds * 0.6f);
            if (nest != null) nest.Show(save.nestEggs, false);
            if (feeder != null) feeder.Show(save.feeder);
            if (appleTree != null) appleTree.SetCount(save.apples < 0 ? appleTree.Max : save.apples);
            if (appleEgg != null) appleEgg.Show(save.appleEgg, AppleEggSpot(), false);
            if (hud != null && awayEggs > 0) hud.Toast("While you were away: " + awayEggs + (awayEggs == 1 ? " new egg" : " new eggs") + " in the nest.");
            else if (hud != null) hud.Toast("Tap the nest for eggs, the feeder to fill it, and any bird to see her card.");
        }

        void Update()
        {
            float dt = Time.deltaTime;
            if (save.feeder > 0f)                                    // hens only lay while they are fed
            {
                save.feeder = Mathf.Max(0f, save.feeder - dt / Mathf.Max(1f, feederLastsSeconds));
                bool nestTaken = false;                              // one hen on the nest at a time: the others wait their turn
                for (int i = 0; i < layers.Length; i++) if (layers[i] != null && layers[i].Busy) nestTaken = true;
                for (int i = 0; i < layers.Length && i < layTimers.Length; i++)
                {
                    if (layers[i] == null) continue;
                    layTimers[i] -= dt;
                    if (layTimers[i] > 0f) continue;
                    if (nestTaken) { layTimers[i] = Random.Range(4f, 9f); continue; }
                    layTimers[i] = layEverySeconds * Random.Range(0.8f, 1.2f);
                    if (nest != null && save.nestEggs < nestCapacity && !layers[i].Busy) { layers[i].GoLay(nest.LaySpot, LayEgg); nestTaken = true; }
                }
                dirty = true;
            }
            if (feeder != null) feeder.Show(save.feeder);
            if (appleTree != null)
            {
                appleTree.Tick(dt);
                if (appleTree.Count != save.apples) { save.apples = appleTree.Count; dirty = true; }
            }
            HandleTaps();
            saveTimer += dt;
            if (dirty && saveTimer > 5f) { saveTimer = 0f; Save(); }
        }

        void LayEgg()
        {
            if (save.nestEggs >= nestCapacity) return;
            save.nestEggs++;
            if (nest != null) nest.Show(save.nestEggs, true);
            dirty = true;
        }

        public void CollectEggs()
        {
            int n = save.nestEggs;
            if (n <= 0) { if (hud != null) hud.Toast("No eggs yet. The hens lay while the feeder has food."); return; }
            long earned = (long)n * eggPrice;
            save.nestEggs = 0;
            save.eggsCollected += n;
            save.coins = System.Math.Min(MaxCoins, save.coins + earned);
            if (nest != null) nest.Show(0, false);
            if (hud != null)
            {
                hud.FlyEggs(nest != null ? nest.transform.position : Vector3.zero, n);
                hud.Toast("+" + n + (n == 1 ? " egg" : " eggs") + ", sold for " + earned + " coins");
            }
            Save();
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
            save.coins = System.Math.Min(MaxCoins, save.coins + earned);
            Vector3 at = AppleEggSpot();
            if (appleEgg != null) appleEgg.Show(false, at, false);
            if (hud != null) { hud.FlyEggs(at, 1); hud.Toast("An apple egg! Sold for " + earned + " coins"); }
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
        string Sign(FarmSave s)
        {
            string body = s.version + "|" + s.coins + "|" + s.nestEggs + "|" + s.feeder.ToString("R", System.Globalization.CultureInfo.InvariantCulture)
                + "|" + s.eggsCollected + "|" + s.savedAt + "|" + s.apples + "|" + s.applesEaten + "|" + s.appleEgg + "|" + BirdsKey(s) + "|" + Salt;
            using (var sha = System.Security.Cryptography.SHA1.Create())
            {
                byte[] h = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(body));
                var sb = new System.Text.StringBuilder();
                for (int i = 0; i < 8; i++) sb.Append(h[i].ToString("x2"));
                return sb.ToString();
            }
        }

        static string BirdsKey(FarmSave s)
        {
            var sb = new System.Text.StringBuilder();
            if (s.birds != null)
                foreach (var b in s.birds)
                    if (b != null) sb.Append(b.name).Append(',').Append(b.type).Append(',').Append(b.plum).Append(',').Append(b.size).Append(',').Append(b.lay).Append(',').Append(b.pers).Append(';');
            return sb.ToString();
        }

        public void Save()
        {
            if (save == null) return;
            save.savedAt = System.DateTime.UtcNow.Ticks;
            save.check = Sign(save);
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(save));
            PlayerPrefs.Save();
            dirty = false;
        }

        void Load()
        {
            save = null;
            string json = PlayerPrefs.GetString(SaveKey, "");
            if (!string.IsNullOrEmpty(json))
            {
                try { save = JsonUtility.FromJson<FarmSave>(json); }
                catch (System.Exception) { save = null; }
            }
            if (save == null) { save = new FarmSave(); return; }
            if (save.check != Sign(save)) Debug.LogWarning("Feather and Field: the save was changed outside the game; every value was checked.");
            // every number is checked, whatever the save says
            save.coins = System.Math.Max(0L, System.Math.Min(MaxCoins, save.coins));
            save.nestEggs = Mathf.Clamp(save.nestEggs, 0, nestCapacity);
            save.feeder = float.IsNaN(save.feeder) ? 0f : Mathf.Clamp01(save.feeder);
            save.eggsCollected = System.Math.Max(0L, save.eggsCollected);
            if (save.birds == null) save.birds = new BirdRecord[0];
            int maxApples = appleTree != null ? appleTree.apples.Length : 0;
            save.apples = save.apples < 0 ? -1 : Mathf.Clamp(save.apples, 0, maxApples);
            save.applesEaten = Mathf.Clamp(save.applesEaten, 0, 1);
            Vector3 tp = appleTree != null ? appleTree.transform.position : Vector3.zero;          // an apple egg is always near the tree
            if (float.IsNaN(save.appleEggX) || float.IsNaN(save.appleEggZ) || Mathf.Abs(save.appleEggX - tp.x) > 1.6f || Mathf.Abs(save.appleEggZ - tp.z) > 1.6f)
            { save.appleEggX = tp.x - 0.55f; save.appleEggZ = tp.z + 0.6f; }
            // time away: the farm carries on for up to two days; a clock moved backwards gives nothing
            double away = (System.DateTime.UtcNow.Ticks - save.savedAt) / (double)System.TimeSpan.TicksPerSecond;
            if (save.savedAt <= 0 || away < 0) away = 0;
            if (away > MaxAwaySeconds) away = MaxAwaySeconds;
            CatchUp((float)away);
        }

        void CatchUp(float seconds)
        {
            if (seconds < 1f) return;
            float fed = Mathf.Min(seconds, save.feeder * feederLastsSeconds);
            save.feeder = Mathf.Max(0f, save.feeder - seconds / Mathf.Max(1f, feederLastsSeconds));
            int laid = Mathf.FloorToInt(layers.Length * fed / Mathf.Max(1f, layEverySeconds));
            int before = save.nestEggs;
            save.nestEggs = Mathf.Min(nestCapacity, save.nestEggs + Mathf.Max(0, laid));
            awayEggs = save.nestEggs - before;
            if (appleTree != null && save.apples >= 0)
                save.apples = Mathf.Min(appleTree.apples.Length, save.apples + Mathf.FloorToInt(seconds / Mathf.Max(1f, appleTree.regrowSeconds)));
        }

        void OnApplicationPause(bool paused) { if (paused) Save(); }
        void OnApplicationQuit() { Save(); }
        void OnDisable() { Save(); }
    }
}
