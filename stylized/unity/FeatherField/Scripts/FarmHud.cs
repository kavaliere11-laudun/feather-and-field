using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace FeatherField
{
    /// <summary>
    /// The farm's on-screen bits, built in code (no assets needed): coins and eggs at the top, bubbles over the nest, the feeder
    /// and an apple egg, short messages, eggs flying up when they are collected, a bird's card (with a Sell button), and the
    /// Hatchery (the incubator and the fertile eggs waiting for a choice).
    /// Taps arrive from the farm (FarmGame): the screen's buttons and panels get them first (Tap), the farm gets the rest.
    /// </summary>
    public class FarmHud : MonoBehaviour
    {
        public static FarmHud Instance { get; private set; }

        static readonly Color32 Glass = new Color32(255, 253, 247, 225);
        static readonly Color32 Ink = new Color32(30, 52, 38, 255);
        static readonly Color32 Coin = new Color32(245, 185, 46, 255);
        static readonly Color32 EggCol = new Color32(214, 160, 110, 255);
        static readonly Color32 ToastCol = new Color32(30, 52, 38, 235);
        static readonly Color32 Warn = new Color32(255, 244, 211, 245);
        static readonly Color32 Empty = new Color32(200, 48, 42, 245);
        static readonly Color32 AppleEggCol = new Color32(236, 168, 96, 255);
        static readonly Color32 Muted = new Color32(95, 111, 92, 255);
        static readonly Color32 RowCol = new Color32(244, 237, 220, 255);
        static readonly Color32 Off = new Color32(208, 210, 200, 255);
        static readonly Color32 BarBg = new Color32(226, 215, 190, 255);
        static readonly Color32 Grain = new Color32(217, 180, 90, 255);

        class Btn { public RectTransform rt; public System.Action act; public RectTransform clip; }     // clip: only where it shows
        class IncRow { public int index; public Text line2, time; public RectTransform bar; public float barW; }

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
        float toastLeft, coinBump, eggBump, hatchBump;
        int flying;
        RectTransform card, appleBubble, gradeBox;
        Text cardName, cardSub, cardGrade, cardInfo, cardPers, cardFamily, cardHint;
        Image gradeBg;
        BirdInfo shownBird;

        // stage 2b: the Hatchery button and panel, the card's Sell button
        readonly List<Btn> fixedBtns = new List<Btn>();
        readonly List<Btn> rowBtns = new List<Btn>();
        readonly List<IncRow> incRows = new List<IncRow>();
        RectTransform hatchBtn, badge, panel, panelRows, sellBtn, viewport, content;
        Text badgeText, sellText;
        Image sellBg;
        int shownChanges = -1;
        Vector2 shownCanvas;
        float sellArmedUntil, cardRefresh;
        // the Hatchery's list scrolls: drag it (finger or mouse), or scroll over it (trackpad or mouse wheel)
        float scrollY, scrollVel, contentH, viewH;
        bool scrollDrag;
        Vector2 dragLast;

        void Awake() { Instance = this; Build(); }

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
            toastText.horizontalOverflow = HorizontalWrapMode.Wrap;            // long messages go onto two lines
            toastText.rectTransform.offsetMin = new Vector2(16f, 0f);
            toastText.rectTransform.offsetMax = new Vector2(-16f, 0f);
            toastGroup = toastBox.gameObject.AddComponent<CanvasGroup>();
            toastGroup.alpha = 0f;

            // small bubbles, so they don't hide the farm: the nest's eggs (an egg and a number), the feeder when it runs low
            // ("Low" or "Empty"), and an apple egg waiting in the grass (just the egg)
            nestBubble = Bubble("Nest bubble", 68f, Glass, EggCol, new Vector2(14f, 18f), out nestText);
            feedBubble = Bubble("Feeder bubble", 100f, Warn, Grain, new Vector2(16f, 16f), out feedText);
            feedBg = feedBubble.GetComponent<Image>();
            appleBubble = Box("Apple egg bubble", root, new Vector2(0.5f, 0.5f), new Vector2(38f, 38f), Glass);
            Dot(appleBubble, Vector2.zero, new Vector2(16f, 21f), AppleEggCol);
            appleBubble.gameObject.SetActive(false);

            // the bubbles can be tapped too: the nest's collects, the feeder's fills it, the apple egg's collects it
            AddButton(nestBubble, () => { var g = FarmGame.Instance; HideBird(); if (g != null) g.CollectEggs(); }, fixedBtns);
            AddButton(feedBubble, () => { var g = FarmGame.Instance; HideBird(); if (g != null) g.FillFeeder(); }, fixedBtns);
            AddButton(appleBubble, () => { var g = FarmGame.Instance; HideBird(); if (g != null) g.CollectAppleEgg(); }, fixedBtns);

            // the Hatchery button at the bottom, with a badge counting the eggs waiting for a choice
            hatchBtn = Box("Hatchery button", root, new Vector2(0.5f, 0f), new Vector2(190f, 52f), Glass);
            hatchBtn.pivot = new Vector2(0.5f, 0f);
            Dot(hatchBtn, new Vector2(-62f, 0f), new Vector2(20f, 26f), EggCol);
            var hl = Label(hatchBtn, 20, Ink, FontStyle.Bold);
            hl.text = "Hatchery";
            hl.rectTransform.offsetMin = new Vector2(26f, 0f);
            badge = Box("Badge", hatchBtn, new Vector2(1f, 1f), new Vector2(28f, 28f), Empty);
            badge.anchoredPosition = new Vector2(-8f, 10f);
            badge.GetComponent<Image>().type = Image.Type.Simple;
            badgeText = Label(badge, 15, Color.white, FontStyle.Bold);
            badge.gameObject.SetActive(false);
            AddButton(hatchBtn, OpenHatchery, fixedBtns);

            // a bird's card, shown when she is tapped
            card = Box("Bird card", root, new Vector2(0.5f, 0f), new Vector2(370f, 240f), Glass);
            card.pivot = new Vector2(0.5f, 0f);
            card.GetComponent<Image>().pixelsPerUnitMultiplier = 31f / 22f;
            cardName = TextAt(card, 20f, 14f, 330f, 30f, 24, Ink, FontStyle.Bold);
            cardSub = Fit(TextAt(card, 20f, 46f, 330f, 22f, 16, Muted, FontStyle.Normal), 12);
            gradeBox = Box("Grade", card, new Vector2(0f, 1f), new Vector2(50f, 30f), Ink);
            gradeBox.pivot = new Vector2(0f, 1f);
            gradeBox.anchoredPosition = new Vector2(20f, -76f);
            gradeBg = gradeBox.GetComponent<Image>();
            cardGrade = Label(gradeBox, 17, Color.white, FontStyle.Bold);
            cardInfo = TextAt(card, 80f, 76f, 270f, 30f, 17, Ink, FontStyle.Bold);
            cardFamily = Fit(TextAt(card, 20f, 112f, 330f, 20f, 14, Muted, FontStyle.Normal), 11);
            cardPers = TextAt(card, 20f, 136f, 330f, 54f, 15, Ink, FontStyle.Normal);
            cardPers.horizontalOverflow = HorizontalWrapMode.Wrap;
            cardHint = TextAt(card, 20f, 202f, 200f, 24f, 13, Muted, FontStyle.Normal);
            cardHint.alignment = TextAnchor.MiddleLeft;
            cardHint.text = "Tap anywhere else to close.";
            sellBtn = Panel("Sell", card, 238f, 194f, 112f, 36f, Coin, 18f);
            sellBg = sellBtn.GetComponent<Image>();
            sellText = Fit(Label(sellBtn, 15, Ink, FontStyle.Bold), 10);
            sellText.rectTransform.offsetMin = new Vector2(8f, 0f);
            sellText.rectTransform.offsetMax = new Vector2(-8f, 0f);
            AddButton(sellBtn, SellTapped, fixedBtns);
            card.gameObject.SetActive(false);

            // the Hatchery: a header that stays put (title, Close, the coop), and below it a list that scrolls (the incubator,
            // then the fertile eggs). Its rows are built again whenever what is in it changes (RebuildHatchery).
            panel = Box("Hatchery", root, new Vector2(0.5f, 0f), new Vector2(380f, 400f), Glass);
            panel.pivot = new Vector2(0.5f, 0f);
            panel.GetComponent<Image>().pixelsPerUnitMultiplier = 31f / 22f;
            panelRows = Stretch("Header", panel, 0f, 0f);
            viewport = Stretch("List", panel, 10f, HeaderH);
            viewport.gameObject.AddComponent<RectMask2D>();                 // rows scrolled out of the list are cut off
            content = new GameObject("Rows", typeof(RectTransform)).GetComponent<RectTransform>();
            content.SetParent(viewport, false);
            content.anchorMin = content.anchorMax = new Vector2(0f, 1f);
            content.pivot = new Vector2(0f, 1f);
            panel.gameObject.SetActive(false);

            toastBox.SetAsLastSibling();                                  // messages show over everything
        }

        float SafeTop { get { return (Screen.height - Screen.safeArea.yMax) / Mathf.Max(0.01f, canvas.scaleFactor); } }
        float SafeBottom { get { return Screen.safeArea.yMin / Mathf.Max(0.01f, canvas.scaleFactor); } }

        void LateUpdate()
        {
            var game = FarmGame.Instance;
            if (game == null || canvas == null) return;

            // keep clear of the notch and the rounded corners
            if (Screen.safeArea != lastSafe && canvas.scaleFactor > 0f)
            {
                lastSafe = Screen.safeArea;
                float top = SafeTop;
                topBar.anchoredPosition = new Vector2(0f, -(top + 12f));
                toastBox.anchoredPosition = new Vector2(0f, -(top + 70f));
            }

            if (game.Coins != shownCoins) { if (shownCoins >= 0) coinBump = 1f; shownCoins = game.Coins; coinText.text = shownCoins.ToString("N0"); }
            if (game.EggsCollected != shownEggs && flying == 0) { shownEggs = game.EggsCollected; eggText.text = shownEggs.ToString("N0"); }      // counts up once the eggs land
            coinBump = Mathf.Max(0f, coinBump - Time.deltaTime * 4f);
            eggBump = Mathf.Max(0f, eggBump - Time.deltaTime * 4f);
            hatchBump = Mathf.Max(0f, hatchBump - Time.deltaTime * 4f);
            coinPill.localScale = Vector3.one * (1f + 0.12f * coinBump);
            eggPill.localScale = Vector3.one * (1f + 0.12f * eggBump);

            // the nest's bubble: how many eggs are waiting
            Vector2 p = Vector2.zero;
            int n = game.NestEggs;
            bool showNest = n > 0 && game.nest != null && ToCanvas(game.nest.transform.position + Vector3.up * 0.42f, out p);
            nestBubble.gameObject.SetActive(showNest);
            if (showNest)
            {
                nestBubble.anchoredPosition = p + new Vector2(0f, Mathf.Sin(Time.time * 3f) * 2f);
                if (n != shownNest)
                {
                    shownNest = n;
                    nestText.text = n.ToString();
                    nestBubble.sizeDelta = new Vector2(48f + 10f * nestText.text.Length, 34f);
                }
            }

            // the feeder's bubble when food runs low
            float f = game.FeederLevel;
            bool showFeed = f <= 0.15f && game.feeder != null && ToCanvas(game.feeder.transform.position + Vector3.up * 0.62f, out p);
            feedBubble.gameObject.SetActive(showFeed);
            if (showFeed)
            {
                feedBubble.anchoredPosition = p;
                bool empty = f <= 0f;
                feedBg.color = empty ? Empty : Warn;
                feedText.color = empty ? Color.white : (Color)Ink;
                feedText.text = empty ? "Empty" : "Low";
            }

            // the apple egg's bubble
            var egg = game.appleEgg;
            bool showApple = egg != null && egg.gameObject.activeSelf && ToCanvas(egg.transform.position + Vector3.up * 0.28f, out p);
            appleBubble.gameObject.SetActive(showApple);
            if (showApple) appleBubble.anchoredPosition = p + new Vector2(0f, Mathf.Sin(Time.time * 3f + 1f) * 3f);

            // the Hatchery button, with how many eggs are waiting for a choice (or ready to hatch)
            bool panelOpen = panel.gameObject.activeSelf;
            hatchBtn.gameObject.SetActive(!panelOpen && !card.gameObject.activeSelf);
            hatchBtn.anchoredPosition = new Vector2(0f, SafeBottom + 16f);
            hatchBtn.localScale = Vector3.one * (1f + 0.12f * hatchBump);
            int waiting = game.Basket.Count;
            foreach (var it in game.Incubator) if (it.left <= 0f) waiting++;
            badge.gameObject.SetActive(waiting > 0);
            if (waiting > 0) badgeText.text = waiting.ToString();

            // the Hatchery panel
            if (panelOpen)
            {
                panel.anchoredPosition = new Vector2(0f, SafeBottom + 12f);
                if (game.Changes != shownChanges || root.rect.size != shownCanvas) RebuildHatchery(game);
                UpdateIncubatorRows(game);
            }

            // the bird card sits above the bottom edge (and the iPhone's home bar)
            if (card.gameObject.activeSelf)
            {
                if (shownBird == null) HideBird();
                else
                {
                    card.anchoredPosition = new Vector2(0f, SafeBottom + 16f);
                    cardRefresh -= Time.deltaTime;
                    if (cardRefresh <= 0f) FillCard();
                }
            }

            // messages fade away
            if (toastLeft > 0f)
            {
                toastLeft -= Time.deltaTime;
                toastGroup.alpha = Mathf.Clamp01(toastLeft / 0.4f);
            }
        }

        // ------------------------------------------------------------------ taps
        /// <summary>
        /// A tap on the screen: buttons first, then the open Hatchery (a tap outside it closes it), then the bird card.
        /// True when the tap was used here, so the farm behind doesn't get it.
        /// </summary>
        public bool Tap(Vector2 screen)
        {
            bool panelOpen = panel != null && panel.gameObject.activeSelf;
            bool onCard = Inside(card, screen);
            Btn hit = null;
            foreach (var b in rowBtns) if (Inside(b.rt, screen) && (b.clip == null || Inside(b.clip, screen))) { hit = b; break; }
            if (hit == null && !panelOpen)                                     // the open Hatchery covers everything else
                foreach (var b in fixedBtns)
                    if (Inside(b.rt, screen) && (!onCard || b.rt.IsChildOf(card))) { hit = b; break; }   // nothing through the card
            if (hit != null)
            {
                StartCoroutine(Press(hit.rt));
                if (hit.act != null) hit.act();
                return true;
            }
            if (panel != null && panel.gameObject.activeSelf)
            {
                if (!Inside(panel, screen)) CloseHatchery();
                return true;
            }
            return Inside(card, screen);
        }

        /// <summary>True when this point of the screen is on a panel or a button (the camera doesn't move from there).</summary>
        public bool Covers(Vector2 screen)
        {
            return Inside(panel, screen) || Inside(card, screen) || Inside(hatchBtn, screen);
        }

        static bool Inside(RectTransform rt, Vector2 screen)
        {
            return rt != null && rt.gameObject.activeInHierarchy && RectTransformUtility.RectangleContainsScreenPoint(rt, screen, null);
        }

        IEnumerator Press(RectTransform rt)
        {
            const float dur = 0.16f;
            for (float k = 0f; k < dur; k += Time.deltaTime)
            {
                if (rt == null) yield break;
                rt.localScale = Vector3.one * (0.92f + 0.08f * (k / dur));
                yield return null;
            }
            if (rt != null) rt.localScale = Vector3.one;
        }

        void AddButton(RectTransform rt, System.Action act, List<Btn> list)
        {
            var b = new Btn();
            b.rt = rt; b.act = act;
            list.Add(b);
        }

        // ------------------------------------------------------------------ the bird card
        /// <summary>Shows a bird's card: her name, breed, age and personality, grade, quality, value, family, and a Sell button.</summary>
        public void ShowBird(BirdInfo b)
        {
            if (b == null || b.data == null || card == null) return;
            if (panel.gameObject.activeSelf) CloseHatchery();
            if (shownBird != b) sellArmedUntil = 0f;
            shownBird = b;
            FillCard();
            card.gameObject.SetActive(true);
        }

        void FillCard()
        {
            cardRefresh = 0.25f;
            var b = shownBird;
            if (b == null || b.data == null) return;
            var d = b.data;
            int q = Rules.Quality(d);
            string g = Rules.Grade(q);
            cardName.text = d.name;
            cardSub.text = "Rhode Island Red " + Rules.StageName(d) + " · " + Rules.PersonalityName(d);
            cardGrade.text = g;
            gradeBg.color = GradeColour(g);
            cardGrade.color = (g == "D" || g == "★") ? (Color)Ink : Color.white;
            cardInfo.text = "Quality " + q + " · worth " + Rules.Value(d) + " coins";
            string fam;
            if (d.mum != "" && d.dad != "") fam = (d.rooster ? "Son" : "Daughter") + " of " + d.mum + " and " + d.dad;
            else fam = "One of the farm's first birds";
            if (d.grow > 0f) fam += " · grown up in " + Clock(d.grow);
            cardFamily.text = fam;
            cardPers.text = Rules.PersonalityText(d);
            var game = FarmGame.Instance;
            bool canSell = game != null && game.CanSell(b);
            sellBtn.gameObject.SetActive(canSell);
            bool armed = Time.unscaledTime < sellArmedUntil;
            sellBg.color = armed ? Empty : Coin;
            sellText.color = armed ? Color.white : (Color)Ink;
            sellText.text = armed ? "Tap again to sell" : "Sell for " + Rules.SellPrice(d);
        }

        // the first tap asks, the second one sells
        void SellTapped()
        {
            var game = FarmGame.Instance;
            if (game == null || shownBird == null) return;
            if (Time.unscaledTime < sellArmedUntil) { sellArmedUntil = 0f; game.SellBird(shownBird); return; }
            sellArmedUntil = Time.unscaledTime + 3f;
            FillCard();
        }

        public void HideBird()
        {
            shownBird = null;
            sellArmedUntil = 0f;
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

        // ------------------------------------------------------------------ the Hatchery
        const float HeaderH = 74f;                  // title, Close and the coop line; the list scrolls below

        public void OpenHatchery()
        {
            HideBird();
            scrollY = 0f; scrollVel = 0f; scrollDrag = false;
            shownChanges = -1;
            panel.gameObject.SetActive(true);
        }

        public void CloseHatchery()
        {
            panel.gameObject.SetActive(false);
            scrollDrag = false;
            rowBtns.Clear();
            incRows.Clear();
        }

        void Update() { ScrollList(); }

        // drag the list with a finger or the mouse (it carries on a little when let go), or scroll over it with a trackpad or wheel
        void ScrollList()
        {
            if (panel == null || !panel.gameObject.activeSelf || content == null) { scrollDrag = false; return; }
            Vector2 pos = Vector2.zero;
            bool down = false, held = false;
            float wheel = 0f;
#if ENABLE_INPUT_SYSTEM
            var pointer = Pointer.current;
            if (pointer != null)
            {
                pos = pointer.position.ReadValue();
                down = pointer.press.wasPressedThisFrame;
                held = pointer.press.isPressed;
            }
            var mouse = Mouse.current;
            if (mouse != null) wheel = mouse.scroll.ReadValue().y;
#else
            pos = Input.mousePosition;
            down = Input.GetMouseButtonDown(0);
            held = Input.GetMouseButton(0);
            wheel = Input.mouseScrollDelta.y * 120f;
#endif
            float scale = Mathf.Max(0.01f, canvas.scaleFactor);
            float dt = Mathf.Max(0.0001f, Time.deltaTime);
            float maxScroll = Mathf.Max(0f, contentH - viewH);
            if (down && Inside(viewport, pos)) { scrollDrag = true; dragLast = pos; scrollVel = 0f; }
            if (scrollDrag && held)
            {
                float dy = (pos.y - dragLast.y) / scale;                     // the list follows the finger
                dragLast = pos;
                scrollY += dy;
                scrollVel = Mathf.Lerp(scrollVel, dy / dt, 0.5f);
            }
            else
            {
                scrollDrag = false;
                if (Mathf.Abs(scrollVel) > 5f) { scrollY += scrollVel * dt; scrollVel *= Mathf.Exp(-6f * dt); }
                else scrollVel = 0f;
            }
            if (Mathf.Abs(wheel) > 0.001f && Inside(viewport, pos)) { scrollY -= Mathf.Clamp(wheel, -120f, 120f) * 0.5f; scrollVel = 0f; }
            if (scrollY < 0f || scrollY > maxScroll) scrollVel = 0f;
            scrollY = Mathf.Clamp(scrollY, 0f, maxScroll);
            content.anchoredPosition = new Vector2(0f, scrollY);
        }

        // The panel: a title and Close, how full the coop is and who the father is; then, in the list, the incubator's slots and
        // the fertile eggs (eggs from the same parents share a row, with Incubate and Sell). On a wide screen (a computer in
        // landscape) the eggs go in a second column.
        void RebuildHatchery(FarmGame game)
        {
            shownChanges = game.Changes;
            shownCanvas = root.rect.size;
            foreach (Transform c in panelRows) Destroy(c.gameObject);
            foreach (Transform c in content) Destroy(c.gameObject);
            rowBtns.Clear();
            incRows.Clear();

            const float colW = 348f, rowH = 58f, gap = 6f;
            bool wide = shownCanvas.x >= 760f;
            float panelW = wide ? colW * 2f + 48f : colW + 32f;
            float maxH = Mathf.Max(260f, shownCanvas.y - (SafeTop + 72f) - (SafeBottom + 12f));

            // the header: title, Close, the coop
            TextAt(panelRows, 20f, 14f, 200f, 30f, 22, Ink, FontStyle.Bold).text = "Hatchery";
            Button(panelRows, panelW - 100f, 12f, 84f, 34f, "Close", Ink, Color.white, CloseHatchery, null);
            var father = game.BreedingRooster();
            string coop = "Coop: " + game.YardCount + " of " + Rules.CoopCap + " birds";
            coop += father != null ? " · Father: " + father.data.name + ", quality " + Rules.Quality(father.data) : " · No grown rooster";
            Fit(TextAt(panelRows, 20f, 48f, panelW - 40f, 20f, 14, Muted, FontStyle.Normal), 11).text = coop;

            // the incubator
            float x = 16f, y = 4f;
            TextAt(content, x + 4f, y, colW, 22f, 15, Ink, FontStyle.Bold).text = "Incubator";
            y += 26f;
            for (int i = 0; i < Rules.IncubatorSlots; i++) { IncubatorRow(game, i, x, y, colW, rowH); y += rowH + gap; }
            float incBottom = y;

            // the fertile eggs waiting for a choice, those from the same parents together
            var basket = game.Basket;
            var groups = new List<List<EggRecord>>();
            foreach (var e in basket)
            {
                List<EggRecord> g = null;
                foreach (var h in groups) if (h[0].dam == e.dam && h[0].sire == e.sire && h[0].expect == e.expect) { g = h; break; }
                if (g == null) { g = new List<EggRecord>(); groups.Add(g); }
                g.Add(e);
            }
            bool full = game.Incubator.Count >= Rules.IncubatorSlots;
            float bx = wide ? 16f + colW + 16f : 16f;
            float by = wide ? 4f : y + 6f;
            TextAt(content, bx + 4f, by, colW, 22f, 15, Ink, FontStyle.Bold).text = "Fertile eggs (" + basket.Count + " of " + Rules.BasketCap + ")";
            by += 26f;
            if (basket.Count == 0)
            {
                var t = TextAt(content, bx + 4f, by, colW - 8f, 44f, 14, Muted, FontStyle.Normal);
                t.horizontalOverflow = HorizontalWrapMode.Wrap;
                t.text = father == null ? "No grown rooster in the coop, so the eggs aren't fertile."
                    : "None yet. Collect the nest: with " + father.data.name + " in the coop, most eggs are fertile.";
                by += 50f;
            }
            else
            {
                if (full)
                {
                    var t = TextAt(content, bx + 4f, by, colW - 8f, 36f, 13, Muted, FontStyle.Normal);
                    t.horizontalOverflow = HorizontalWrapMode.Wrap;
                    t.text = "The incubator is full. Another egg can go in when one hatches.";
                    by += 40f;
                }
                foreach (var g in groups) { BasketRow(game, g, full, bx, by, colW, rowH); by += rowH + gap; }
            }

            contentH = Mathf.Max(incBottom, by) + 4f;
            viewH = Mathf.Min(contentH, maxH - HeaderH - 10f);
            content.sizeDelta = new Vector2(panelW, contentH);
            panel.sizeDelta = new Vector2(panelW, HeaderH + viewH + 10f);
            scrollY = Mathf.Clamp(scrollY, 0f, Mathf.Max(0f, contentH - viewH));     // stays where it was after a choice
            content.anchoredPosition = new Vector2(0f, scrollY);
            UpdateIncubatorRows(game);
        }

        void IncubatorRow(FarmGame game, int i, float x, float y, float w, float h)
        {
            var row = Panel("Slot " + (i + 1), content, x, y, w, h, RowCol, 12f);
            var inc = game.Incubator;
            if (i >= inc.Count)
            {
                DotAt(row, 20f, h * 0.5f, new Vector2(16f, 21f), Off);
                TextAt(row, 40f, 8f, w - 56f, 22f, 15, Muted, FontStyle.Bold).text = "Empty";
                Fit(TextAt(row, 40f, 31f, w - 56f, 18f, 13, Muted, FontStyle.Normal), 10).text = "Choose a fertile egg and tap Incubate.";
                return;
            }
            var e = inc[i].egg;
            DotAt(row, 20f, h * 0.5f, new Vector2(16f, 21f), EggCol);
            Fit(TextAt(row, 40f, 7f, w - 136f, 22f, 15, Ink, FontStyle.Bold), 10).text = e.dam + " × " + e.sire;
            var r = new IncRow();
            r.index = i;
            r.time = TextAt(row, w - 92f, 7f, 80f, 22f, 15, Ink, FontStyle.Bold);
            r.time.alignment = TextAnchor.UpperRight;
            r.line2 = Fit(TextAt(row, 40f, 29f, w - 56f, 18f, 13, Muted, FontStyle.Normal), 10);
            var barBg = Panel("Bar", row, 40f, 49f, w - 56f, 4f, BarBg, 2f);
            r.bar = Panel("Fill", barBg, 0f, 0f, 4f, 4f, Coin, 2f);
            r.barW = w - 56f;
            incRows.Add(r);
        }

        void UpdateIncubatorRows(FarmGame game)
        {
            var inc = game.Incubator;
            foreach (var r in incRows)
            {
                if (r.index >= inc.Count || r.bar == null) continue;              // it hatched: the panel is drawn again next frame
                var it = inc[r.index];
                float k = 1f - Mathf.Clamp01(it.left / Rules.HatchSeconds);
                r.bar.sizeDelta = new Vector2(Mathf.Max(4f, r.barW * k), 4f);
                if (it.left > 0f)
                {
                    r.time.text = Clock(it.left);
                    r.line2.text = "Chick about " + it.egg.expect + " (" + Rules.Grade(it.egg.expect) + ")";
                }
                else
                {
                    r.time.text = "Ready";
                    r.line2.text = game.CoopFull ? "The coop is full: sell a bird to make room." : "Hatching…";
                }
            }
        }

        // one row for the eggs from the same parents: Incubate puts one of them in the incubator, Sell sells one
        void BasketRow(FarmGame game, List<EggRecord> eggs, bool full, float x, float y, float w, float h)
        {
            var e = eggs[0];
            var row = Panel("Eggs", content, x, y, w, h, RowCol, 12f);
            DotAt(row, 20f, h * 0.5f, new Vector2(16f, 21f), EggCol);
            float textW = full ? w - 130f : w - 220f;
            Fit(TextAt(row, 40f, 8f, textW, 22f, 15, Ink, FontStyle.Bold), 10).text = e.dam + " × " + e.sire;
            string sub = "Chick about " + e.expect + " (" + Rules.Grade(e.expect) + ")";
            if (eggs.Count > 1) sub += " · " + eggs.Count + " eggs";
            Fit(TextAt(row, 40f, 31f, textW, 18f, 13, Muted, FontStyle.Normal), 10).text = sub;
            var egg = e;
            if (!full) Button(row, w - 176f, (h - 36f) * 0.5f, 92f, 36f, "Incubate", Ink, Color.white, () => game.Incubate(egg), viewport);
            Button(row, w - 78f, (h - 36f) * 0.5f, 68f, 36f, "Sell " + game.EggSellPrice(e), Coin, Ink, () => game.SellEgg(egg), viewport);
        }

        RectTransform Button(RectTransform parent, float x, float y, float w, float h, string label, Color bg, Color fg, System.Action act, RectTransform clip)
        {
            var b = Panel(label, parent, x, y, w, h, bg, h * 0.5f);
            var t = Fit(Label(b, 15, fg, FontStyle.Bold), 10);
            t.rectTransform.offsetMin = new Vector2(6f, 0f);
            t.rectTransform.offsetMax = new Vector2(-6f, 0f);
            t.text = label;
            var btn = new Btn();
            btn.rt = b; btn.act = act; btn.clip = clip;
            rowBtns.Add(btn);
            return b;
        }

        /// <summary>m:ss</summary>
        public static string Clock(float seconds)
        {
            int t = Mathf.Max(0, Mathf.CeilToInt(seconds));
            return (t / 60) + ":" + (t % 60).ToString("00");
        }

        // ------------------------------------------------------------------ messages and flying eggs
        public void Toast(string text)
        {
            if (toastText == null) return;
            toastText.text = text;
            float w = Mathf.Clamp(toastText.preferredWidth + 40f, 160f, 360f);
            var settings = toastText.GetGenerationSettings(new Vector2(w - 32f, 0f));
            float h = toastText.cachedTextGeneratorForLayout.GetPreferredHeight(text, settings) / Mathf.Max(0.01f, toastText.pixelsPerUnit);
            toastBox.sizeDelta = new Vector2(w, Mathf.Max(44f, h + 20f));
            toastLeft = 3.2f + Mathf.Min(2f, text.Length / 60f);      // longer messages stay a little longer
            toastGroup.alpha = 1f;
        }

        /// <summary>Eggs fly from the nest up to the egg counter, or fertile ones down to the Hatchery (a few, however many there are).</summary>
        public void FlyEggs(Vector3 from, int count, bool toHatchery)
        {
            Vector2 start;
            if (!ToCanvas(from + Vector3.up * 0.1f, out start)) start = Vector2.zero;
            RectTransform target = toHatchery ? hatchBtn : eggPill;
            Vector2 end = (Vector2)root.InverseTransformPoint(target.TransformPoint(target.rect.center));
            int shown = Mathf.Clamp(count, 1, 8);
            for (int i = 0; i < shown; i++) StartCoroutine(Fly(start, end, i * 0.07f, toHatchery));
        }

        IEnumerator Fly(Vector2 a, Vector2 b, float delay, bool toHatchery)
        {
            if (!toHatchery) flying++;
            if (delay > 0f) yield return new WaitForSeconds(delay);
            var egg = Box("Flying egg", root, new Vector2(0.5f, 0.5f), new Vector2(18f, 23f), EggCol);
            egg.GetComponent<Image>().type = Image.Type.Simple;
            Vector2 mid = (a + b) * 0.5f + new Vector2(Random.Range(-60f, 60f), toHatchery ? 60f : 120f);
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
            if (toHatchery) hatchBump = 1f;
            else { eggBump = 1f; flying--; }
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

        /// <summary>An empty area filling its parent, less `bottom` at the bottom and `top` at the top.</summary>
        static RectTransform Stretch(string name, RectTransform parent, float bottom, float top)
        {
            var rt = new GameObject(name, typeof(RectTransform)).GetComponent<RectTransform>();
            rt.SetParent(parent, false);
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(0f, bottom); rt.offsetMax = new Vector2(0f, -top);
            return rt;
        }

        /// <summary>A small bubble over something on the farm: an icon on the left and a word or number.</summary>
        RectTransform Bubble(string name, float width, Color bg, Color icon, Vector2 iconSize, out Text label)
        {
            var rt = Box(name, root, new Vector2(0.5f, 0.5f), new Vector2(width, 34f), bg);
            var ic = Box("Icon", rt, new Vector2(0f, 0.5f), iconSize, icon);
            ic.anchoredPosition = new Vector2(19f, 0f);
            ic.GetComponent<Image>().type = Image.Type.Simple;
            label = Label(rt, 17, Ink, FontStyle.Bold);
            label.rectTransform.offsetMin = new Vector2(30f, 0f);
            label.rectTransform.offsetMax = new Vector2(-10f, 0f);
            rt.gameObject.SetActive(false);
            return rt;
        }

        /// <summary>A rounded box placed from its parent's top-left corner (x right, y down).</summary>
        RectTransform Panel(string name, RectTransform parent, float x, float y, float w, float h, Color color, float radius)
        {
            var rt = Box(name, parent, new Vector2(0f, 1f), new Vector2(w, h), color);
            rt.pivot = new Vector2(0f, 1f);
            rt.anchoredPosition = new Vector2(x, -y);
            var img = rt.GetComponent<Image>();
            if (img != null) img.pixelsPerUnitMultiplier = 31f / Mathf.Max(1f, radius);
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

        /// <summary>Text that shrinks (down to minSize) so it fits on its line.</summary>
        static Text Fit(Text t, int minSize)
        {
            t.resizeTextForBestFit = true;
            t.resizeTextMinSize = minSize;
            t.resizeTextMaxSize = t.fontSize;
            t.horizontalOverflow = HorizontalWrapMode.Wrap;
            t.verticalOverflow = VerticalWrapMode.Truncate;
            return t;
        }

        void Dot(RectTransform parent, Vector2 pos, Vector2 size, Color color)
        {
            var rt = Box("Icon", parent, new Vector2(0.5f, 0.5f), size, color);
            rt.anchoredPosition = pos;
            rt.GetComponent<Image>().type = Image.Type.Simple;
        }

        void DotAt(RectTransform parent, float x, float y, Vector2 size, Color color)
        {
            var rt = Box("Icon", parent, new Vector2(0f, 1f), size, color);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = new Vector2(x, -y);
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
