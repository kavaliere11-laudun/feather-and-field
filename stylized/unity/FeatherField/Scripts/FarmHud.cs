using System.Collections;
using UnityEngine;
using UnityEngine.UI;

namespace FeatherField
{
    /// <summary>
    /// The farm's on-screen bits, built in code (no assets needed): coins and eggs at the top, a bubble over the nest
    /// with the eggs waiting, a bubble over the feeder when it runs low, short messages, and eggs flying up to the
    /// counter when they are collected. It only shows things: taps go to the farm (FarmGame).
    /// </summary>
    public class FarmHud : MonoBehaviour
    {
        static readonly Color32 Glass = new Color32(255, 253, 247, 225);
        static readonly Color32 Ink = new Color32(30, 52, 38, 255);
        static readonly Color32 Coin = new Color32(245, 185, 46, 255);
        static readonly Color32 EggCol = new Color32(214, 160, 110, 255);
        static readonly Color32 ToastCol = new Color32(30, 52, 38, 235);
        static readonly Color32 Warn = new Color32(255, 244, 211, 245);
        static readonly Color32 Empty = new Color32(200, 48, 42, 245);
        static readonly Color32 AppleEggCol = new Color32(236, 168, 96, 255);
        static readonly Color32 Muted = new Color32(95, 111, 92, 255);

        Canvas canvas;
        RectTransform root, topBar, coinPill, eggPill, nestBubble, feedBubble, toastBox;
        Text coinText, eggText, nestText, feedText, toastText;
        Image feedBg;
        CanvasGroup toastGroup;
        Sprite round;
        Font font;
        Rect lastSafe;
        long shownCoins = -1, shownEggs = -1;
        int shownNest = -1;
        float toastLeft, coinBump, eggBump;
        int flying;
        RectTransform card, appleBubble, gradeBox;
        Text cardName, cardSub, cardGrade, cardInfo, cardPers, appleText;
        Image gradeBg;
        BirdInfo shownBird;

        void Awake() { Build(); }

        void Build()
        {
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            round = MakeRound();
            var go = new GameObject("HUD", typeof(RectTransform));
            go.transform.SetParent(transform, false);
            canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 10;
            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(402f, 874f);
            scaler.matchWidthOrHeight = 0.5f;
            root = (RectTransform)go.transform;

            // top bar: coins and eggs collected
            topBar = Box("Top bar", root, new Vector2(0.5f, 1f), new Vector2(330f, 48f), Color.clear);
            coinPill = Pill("Coins", topBar, new Vector2(-82f, 0f), 150f, Glass, out coinText);
            Dot(coinPill, new Vector2(-48f, 0f), new Vector2(26f, 26f), Coin);
            eggPill = Pill("Eggs", topBar, new Vector2(82f, 0f), 150f, Glass, out eggText);
            Dot(eggPill, new Vector2(-48f, 0f), new Vector2(20f, 26f), EggCol);

            // a short message under the top bar
            toastBox = Box("Message", root, new Vector2(0.5f, 1f), new Vector2(360f, 44f), ToastCol);
            toastText = Label(toastBox, 16, Color.white, FontStyle.Bold);
            toastGroup = toastBox.gameObject.AddComponent<CanvasGroup>();
            toastGroup.alpha = 0f;

            // bubbles over the nest and the feeder
            nestBubble = Pill("Nest bubble", root, Vector2.zero, 110f, Glass, out nestText);
            nestBubble.anchorMin = nestBubble.anchorMax = new Vector2(0.5f, 0.5f);
            Dot(nestBubble, new Vector2(-34f, 0f), new Vector2(16f, 21f), EggCol);
            feedBubble = Pill("Feeder bubble", root, Vector2.zero, 190f, Warn, out feedText);
            feedBubble.anchorMin = feedBubble.anchorMax = new Vector2(0.5f, 0.5f);
            feedBg = feedBubble.GetComponent<Image>();
            nestBubble.gameObject.SetActive(false);
            feedBubble.gameObject.SetActive(false);

            // a bubble over an apple egg in the grass
            appleBubble = Pill("Apple egg bubble", root, Vector2.zero, 150f, Glass, out appleText);
            Dot(appleBubble, new Vector2(-52f, 0f), new Vector2(16f, 21f), AppleEggCol);
            appleText.text = "  Apple egg!";
            appleText.fontSize = 18;
            appleBubble.gameObject.SetActive(false);

            // a bird's card, shown when she is tapped
            card = Box("Bird card", root, new Vector2(0.5f, 0f), new Vector2(370f, 196f), Glass);
            card.pivot = new Vector2(0.5f, 0f);
            card.GetComponent<Image>().pixelsPerUnitMultiplier = 31f / 22f;
            cardName = TextAt(card, 20f, 14f, 330f, 30f, 24, Ink, FontStyle.Bold);
            cardSub = TextAt(card, 20f, 46f, 330f, 22f, 16, Muted, FontStyle.Normal);
            gradeBox = Box("Grade", card, new Vector2(0f, 1f), new Vector2(50f, 30f), Ink);
            gradeBox.pivot = new Vector2(0f, 1f);
            gradeBox.anchoredPosition = new Vector2(20f, -76f);
            gradeBg = gradeBox.GetComponent<Image>();
            cardGrade = Label(gradeBox, 17, Color.white, FontStyle.Bold);
            cardInfo = TextAt(card, 80f, 76f, 270f, 30f, 17, Ink, FontStyle.Bold);
            cardPers = TextAt(card, 20f, 114f, 330f, 70f, 15, Ink, FontStyle.Normal);
            cardPers.horizontalOverflow = HorizontalWrapMode.Wrap;
            card.gameObject.SetActive(false);
        }

        void LateUpdate()
        {
            var game = FarmGame.Instance;
            if (game == null || canvas == null) return;

            // keep clear of the notch and the rounded corners
            if (Screen.safeArea != lastSafe && canvas.scaleFactor > 0f)
            {
                lastSafe = Screen.safeArea;
                float top = (Screen.height - Screen.safeArea.yMax) / canvas.scaleFactor;
                topBar.anchoredPosition = new Vector2(0f, -(top + 12f));
                toastBox.anchoredPosition = new Vector2(0f, -(top + 70f));
            }

            if (game.Coins != shownCoins) { if (shownCoins >= 0) coinBump = 1f; shownCoins = game.Coins; coinText.text = shownCoins.ToString("N0"); }
            if (game.EggsCollected != shownEggs && flying == 0) { shownEggs = game.EggsCollected; eggText.text = shownEggs.ToString("N0"); }      // counts up once the eggs land
            coinBump = Mathf.Max(0f, coinBump - Time.deltaTime * 4f);
            eggBump = Mathf.Max(0f, eggBump - Time.deltaTime * 4f);
            coinPill.localScale = Vector3.one * (1f + 0.12f * coinBump);
            eggPill.localScale = Vector3.one * (1f + 0.12f * eggBump);

            // the nest's bubble: how many eggs are waiting
            Vector2 p = Vector2.zero;
            int n = game.NestEggs;
            bool showNest = n > 0 && game.nest != null && ToCanvas(game.nest.transform.position + Vector3.up * 0.55f, out p);
            nestBubble.gameObject.SetActive(showNest);
            if (showNest)
            {
                nestBubble.anchoredPosition = p + new Vector2(0f, Mathf.Sin(Time.time * 3f) * 3f);
                if (n != shownNest) { shownNest = n; nestText.text = "  " + n + (n == 1 ? " egg" : " eggs"); }
            }

            // the feeder's bubble when food runs low
            float f = game.FeederLevel;
            bool showFeed = f <= 0.15f && game.feeder != null && ToCanvas(game.feeder.transform.position + Vector3.up * 0.7f, out p);
            feedBubble.gameObject.SetActive(showFeed);
            if (showFeed)
            {
                feedBubble.anchoredPosition = p;
                bool empty = f <= 0f;
                feedBg.color = empty ? Empty : Warn;
                feedText.color = empty ? Color.white : (Color)Ink;
                feedText.text = empty ? "Feeder empty · tap: " + game.feedPrice : "Feed low · tap: " + game.feedPrice;
            }

            // the apple egg's bubble
            var egg = game.appleEgg;
            bool showApple = egg != null && egg.gameObject.activeSelf && ToCanvas(egg.transform.position + Vector3.up * 0.32f, out p);
            appleBubble.gameObject.SetActive(showApple);
            if (showApple) appleBubble.anchoredPosition = p + new Vector2(0f, Mathf.Sin(Time.time * 3f + 1f) * 3f);

            // the bird card sits above the bottom edge (and the iPhone's home bar)
            if (card.gameObject.activeSelf)
            {
                if (shownBird == null) HideBird();
                else card.anchoredPosition = new Vector2(0f, Screen.safeArea.yMin / Mathf.Max(0.01f, canvas.scaleFactor) + 16f);
            }

            // messages fade away
            if (toastLeft > 0f)
            {
                toastLeft -= Time.deltaTime;
                toastGroup.alpha = Mathf.Clamp01(toastLeft / 0.4f);
            }
        }

        /// <summary>Shows a bird's card: her name, breed and sex, grade, quality, value and personality.</summary>
        public void ShowBird(BirdInfo b)
        {
            if (b == null || b.data == null || card == null) return;
            var d = b.data;
            int q = Rules.Quality(d);
            string g = Rules.Grade(q);
            shownBird = b;
            cardName.text = d.name;
            cardSub.text = "Rhode Island Red " + (d.rooster ? "rooster" : "hen") + " · " + Rules.PersonalityName(d);
            cardGrade.text = g;
            gradeBg.color = GradeColour(g);
            cardGrade.color = (g == "D" || g == "★") ? (Color)Ink : Color.white;
            cardInfo.text = "Quality " + q + " · worth " + Rules.Value(d) + " coins";
            cardPers.text = Rules.PersonalityText(d) + "\nTap anywhere to close.";
            card.gameObject.SetActive(true);
        }

        public void HideBird()
        {
            shownBird = null;
            if (card != null) card.gameObject.SetActive(false);
        }

        static Color GradeColour(string g)
        {
            if (g == "★") return new Color32(225, 181, 37, 255);
            if (g == "A+") return new Color32(47, 122, 58, 255);
            if (g == "A") return new Color32(61, 138, 69, 255);
            if (g == "B") return new Color32(42, 111, 128, 255);
            if (g == "C") return new Color32(123, 127, 116, 255);
            return new Color32(201, 195, 176, 255);
        }

        public void Toast(string text)
        {
            if (toastText == null) return;
            toastText.text = text;
            float w = Mathf.Clamp(toastText.preferredWidth + 40f, 160f, 390f);
            toastBox.sizeDelta = new Vector2(w, 44f);
            toastLeft = 3.2f;
            toastGroup.alpha = 1f;
        }

        /// <summary>Eggs fly from the nest up to the egg counter (a few, however many were collected).</summary>
        public void FlyEggs(Vector3 from, int count)
        {
            Vector2 start;
            if (!ToCanvas(from + Vector3.up * 0.1f, out start)) start = Vector2.zero;
            Vector2 end = (Vector2)root.InverseTransformPoint(eggPill.position);
            int shown = Mathf.Clamp(count, 1, 8);
            for (int i = 0; i < shown; i++) StartCoroutine(Fly(start, end, i * 0.07f));
        }

        IEnumerator Fly(Vector2 a, Vector2 b, float delay)
        {
            flying++;
            if (delay > 0f) yield return new WaitForSeconds(delay);
            var egg = Box("Flying egg", root, new Vector2(0.5f, 0.5f), new Vector2(18f, 23f), EggCol);
            egg.GetComponent<Image>().type = Image.Type.Simple;
            Vector2 mid = (a + b) * 0.5f + new Vector2(Random.Range(-60f, 60f), 120f);
            const float dur = 0.7f;
            for (float t = 0f; t < dur; t += Time.deltaTime)
            {
                float x = t / dur, e = x * x * (3f - 2f * x);
                Vector2 q = Vector2.Lerp(Vector2.Lerp(a, mid, e), Vector2.Lerp(mid, b, e), e);
                egg.anchoredPosition = q;
                egg.localScale = Vector3.one * (1.2f - 0.4f * e);
                yield return null;
            }
            Destroy(egg.gameObject);
            eggBump = 1f;
            flying--;
        }

        // ------------------------------------------------------------------ helpers
        bool ToCanvas(Vector3 world, out Vector2 local)
        {
            local = Vector2.zero;
            var cam = Camera.main;
            if (cam == null) return false;
            Vector3 s = cam.WorldToScreenPoint(world);
            if (s.z < 0f) return false;
            return RectTransformUtility.ScreenPointToLocalPointInRectangle(root, new Vector2(s.x, s.y), null, out local);
        }

        RectTransform Box(string name, RectTransform parent, Vector2 anchor, Vector2 size, Color color)
        {
            var go = new GameObject(name, typeof(RectTransform));
            var rt = (RectTransform)go.transform;
            rt.SetParent(parent, false);
            rt.anchorMin = rt.anchorMax = anchor;
            rt.pivot = new Vector2(0.5f, anchor.y >= 1f ? 1f : 0.5f);
            rt.sizeDelta = size;
            if (color.a > 0f)
            {
                var img = go.AddComponent<Image>();
                img.sprite = round;
                img.type = Image.Type.Sliced;
                img.pixelsPerUnitMultiplier = 64f / Mathf.Max(8f, size.y);
                img.color = color;
                img.raycastTarget = false;
            }
            return rt;
        }

        RectTransform Pill(string name, RectTransform parent, Vector2 pos, float width, Color color, out Text label)
        {
            var rt = Box(name, parent, new Vector2(0.5f, 0.5f), new Vector2(width, 44f), color);
            rt.anchoredPosition = pos;
            label = Label(rt, 20, Ink, FontStyle.Bold);
            label.rectTransform.offsetMin = new Vector2(22f, 0f);
            return rt;
        }

        Text TextAt(RectTransform parent, float x, float y, float w, float h, int size, Color color, FontStyle style)
        {
            var t = Label(parent, size, color, style);
            var rt = t.rectTransform;
            rt.anchorMin = rt.anchorMax = new Vector2(0f, 1f);
            rt.pivot = new Vector2(0f, 1f);
            rt.sizeDelta = new Vector2(w, h);
            rt.anchoredPosition = new Vector2(x, -y);
            t.alignment = TextAnchor.UpperLeft;
            return t;
        }

        void Dot(RectTransform parent, Vector2 pos, Vector2 size, Color color)
        {
            var rt = Box("Icon", parent, new Vector2(0.5f, 0.5f), size, color);
            rt.anchoredPosition = pos;
            rt.GetComponent<Image>().type = Image.Type.Simple;
        }

        Text Label(RectTransform parent, int size, Color color, FontStyle style)
        {
            var go = new GameObject("Text", typeof(RectTransform));
            var rt = (RectTransform)go.transform;
            rt.SetParent(parent, false);
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            var t = go.AddComponent<Text>();
            t.font = font;
            t.fontSize = size;
            t.fontStyle = style;
            t.color = color;
            t.alignment = TextAnchor.MiddleCenter;
            t.horizontalOverflow = HorizontalWrapMode.Overflow;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            t.raycastTarget = false;
            return t;
        }

        /// <summary>A soft white disc: drawn whole it is a dot, sliced it is a pill with round ends.</summary>
        static Sprite MakeRound()
        {
            const int S = 64;
            var tex = new Texture2D(S, S, TextureFormat.RGBA32, false);
            tex.wrapMode = TextureWrapMode.Clamp;
            tex.filterMode = FilterMode.Bilinear;
            var px = new Color32[S * S];
            float r = S * 0.5f;
            for (int y = 0; y < S; y++)
                for (int x = 0; x < S; x++)
                {
                    float d = Mathf.Sqrt((x + 0.5f - r) * (x + 0.5f - r) + (y + 0.5f - r) * (y + 0.5f - r));
                    byte a = (byte)(255f * Mathf.Clamp01(r - d));
                    px[y * S + x] = new Color32(255, 255, 255, a);
                }
            tex.SetPixels32(px);
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, S, S), new Vector2(0.5f, 0.5f), 100f, 0, SpriteMeshType.FullRect, new Vector4(31f, 31f, 31f, 31f));
        }
    }
}
