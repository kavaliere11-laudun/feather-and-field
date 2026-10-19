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
        public string check = "";
    }

    /// <summary>
    /// Stage 1 of the farm's rules: hens lay into the nest while the feeder has food; tap the nest to collect
    /// (the eggs are sold at once for coins); tap the feeder to fill it. Saved on the device; while the game is
    /// closed the farm carries on for up to two days.
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

        void Awake()
        {
            Instance = this;
            Load();
        }

        void Start()
        {
            layTimers = new float[layers.Length];
            for (int i = 0; i < layTimers.Length; i++) layTimers[i] = Random.Range(4f, layEverySeconds * 0.6f);
            if (nest != null) nest.Show(save.nestEggs, false);
            if (feeder != null) feeder.Show(save.feeder);
            if (hud != null && awayEggs > 0) hud.Toast("While you were away: " + awayEggs + (awayEggs == 1 ? " new egg" : " new eggs") + " in the nest.");
            else if (hud != null) hud.Toast("Tap the nest to collect eggs. Tap the feeder to fill it.");
        }

        void Update()
        {
            float dt = Time.deltaTime;
            if (save.feeder > 0f)                                    // hens only lay while they are fed
            {
                save.feeder = Mathf.Max(0f, save.feeder - dt / Mathf.Max(1f, feederLastsSeconds));
                for (int i = 0; i < layers.Length && i < layTimers.Length; i++)
                {
                    if (layers[i] == null) continue;
                    layTimers[i] -= dt;
                    if (layTimers[i] > 0f) continue;
                    layTimers[i] = layEverySeconds * Random.Range(0.8f, 1.2f);
                    if (nest != null && save.nestEggs < nestCapacity && !layers[i].Busy) layers[i].GoLay(nest.LaySpot, LayEgg);
                }
                dirty = true;
            }
            if (feeder != null) feeder.Show(save.feeder);
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
            if (!Physics.Raycast(cam.ScreenPointToRay(screenPos), out hit, 500f)) return;
            if (hit.collider.GetComponentInParent<NestBox>() != null) CollectEggs();
            else if (hit.collider.GetComponentInParent<Feeder>() != null) FillFeeder();
        }

        // ------------------------------------------------------------------ saving
        string Sign(FarmSave s)
        {
            string body = s.version + "|" + s.coins + "|" + s.nestEggs + "|" + s.feeder.ToString("R", System.Globalization.CultureInfo.InvariantCulture)
                + "|" + s.eggsCollected + "|" + s.savedAt + "|" + Salt;
            using (var sha = System.Security.Cryptography.SHA1.Create())
            {
                byte[] h = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(body));
                var sb = new System.Text.StringBuilder();
                for (int i = 0; i < 8; i++) sb.Append(h[i].ToString("x2"));
                return sb.ToString();
            }
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
        }

        void OnApplicationPause(bool paused) { if (paused) Save(); }
        void OnApplicationQuit() { Save(); }
        void OnDisable() { Save(); }
    }
}
