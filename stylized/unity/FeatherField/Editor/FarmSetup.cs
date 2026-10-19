using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace FeatherField.EditorTools
{
    /// <summary>
    /// Menu: Feather and Field > Build starter farm.
    /// Makes the cosy-farm materials, then builds a new scene with the coop, apple trees, path, grass, flowers,
    /// wandering hens, warm sunlight, soft ambient light and the game's camera, and saves it as Scenes/Farm.unity.
    /// </summary>
    public static class FarmSetup
    {
        const string Root = "Assets/FeatherField";

        [System.Serializable] class MatEntry { public string name; public float[] color; public float smoothness; public float metallic; }
        [System.Serializable] class Palette { public MatEntry[] materials; }
        [System.Serializable] class TreeEntry { public string model; public float[] pos; public float scale; public float yaw; }
        [System.Serializable] class HenEntry { public string model; public float[] pos; public float yaw; public string area; }
        [System.Serializable] class Box { public float[] min; public float[] max; }
        [System.Serializable] class CamEntry { public float[] target; public float pitch; public float yaw; public float orthoSize; }
        [System.Serializable] class SunEntry { public float[] dir; public float[] color; public float intensity; }
        [System.Serializable] class Layout
        {
            public float[] path; public Box pen; public Box yard; public float[] yardObstacles;
            public TreeEntry[] trees; public HenEntry[] hens; public CamEntry camera; public SunEntry sun;
        }

        [MenuItem("Feather and Field/Build starter farm")]
        public static void Build()
        {
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            var palette = JsonUtility.FromJson<Palette>(ReadText(Root + "/Data/palette.json"));
            var layout = JsonUtility.FromJson<Layout>(ReadText(Root + "/Data/layout.json"));
            if (palette == null || layout == null) { Debug.LogError("Feather and Field: could not read Data/palette.json or Data/layout.json"); return; }

            var mats = MakeMaterials(palette);
            RemapModelMaterials(mats);
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // ---- light: warm low sun with soft shadows, sky-tinted ambient light
            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = Col(layout.sun.color);
            sun.intensity = layout.sun.intensity;
            sun.shadows = LightShadows.Soft;
            sun.shadowStrength = 0.8f;
            sunGo.transform.rotation = Quaternion.LookRotation(Vec(layout.sun.dir).normalized, Vector3.up);
            RenderSettings.sun = sun;
            RenderSettings.skybox = null;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.64f, 0.74f, 0.86f);
            RenderSettings.ambientEquatorColor = new Color(0.56f, 0.64f, 0.5f);
            RenderSettings.ambientGroundColor = new Color(0.36f, 0.42f, 0.27f);

            // ---- camera: the game's view (orthographic, 42 degrees down, 45 degrees round)
            var camGo = new GameObject("Main Camera");
            camGo.tag = "MainCamera";
            var cam = camGo.AddComponent<Camera>();
            cam.orthographic = true;
            cam.orthographicSize = layout.camera.orthoSize;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.55f, 0.72f, 0.36f);
            cam.nearClipPlane = 0.1f; cam.farClipPlane = 120f;
            var camRot = Quaternion.Euler(layout.camera.pitch, layout.camera.yaw, 0f);
            camGo.transform.rotation = camRot;
            camGo.transform.position = Vec(layout.camera.target) - camRot * Vector3.forward * 40f;
            camGo.AddComponent<AudioListener>();
            var camData = cam.GetUniversalAdditionalCameraData();
            if (camData != null)
            {
                camData.renderPostProcessing = true;
                camData.antialiasing = AntialiasingMode.SubpixelMorphologicalAntiAliasing;     // smooth edges
                camData.antialiasingQuality = AntialiasingQuality.High;
            }
            camGo.AddComponent<CameraRig>();                                                 // scroll/pinch to zoom, drag to move

            // ---- a gentle grading: a touch more colour, soft vignette, light bloom
            AddVolume();

            // ---- ground
            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Meadow";
            ground.transform.localScale = new Vector3(4f, 1f, 4f);                  // 40 x 40 metres
            Material meadow;
            if (mats.TryGetValue("FF_meadow", out meadow))
            {
                var ti = AssetImporter.GetAtPath(Root + "/Textures/meadow.png") as TextureImporter;
                if (ti != null && ti.anisoLevel < 8) { ti.anisoLevel = 8; ti.maxTextureSize = 2048; ti.SaveAndReimport(); }   // stays crisp at a slant
                var tex = AssetDatabase.LoadAssetAtPath<Texture2D>(Root + "/Textures/meadow.png");
                if (tex != null)
                {
                    meadow.SetTexture("_BaseMap", tex); meadow.SetTexture("_MainTex", tex);
                    meadow.SetColor("_BaseColor", Color.white); meadow.SetColor("_Color", Color.white);
                    EditorUtility.SetDirty(meadow);
                }
                ground.GetComponent<Renderer>().sharedMaterial = meadow;
            }
            GameObjectUtility.SetStaticEditorFlags(ground, StaticEditorFlags.BatchingStatic);

            // ---- buildings and trees
            var farm = new GameObject("Farm").transform;
            Place("coop", Vector3.zero, 0f, 1f, farm, mats, true);
            Place("path", Vector3.zero, 0f, 1f, farm, mats, true);
            foreach (var t in layout.trees) Place(t.model, Vec(t.pos), t.yaw, t.scale, farm, mats, true);

            var rnd = new System.Random(11);
            if (layout.trees.Length > 0)
            {
                Vector3 c = Vec(layout.trees[0].pos);
                for (int i = 0; i < 7; i++)
                {
                    float a = (float)(rnd.NextDouble() * Mathf.PI * 2), d = 0.3f + (float)rnd.NextDouble() * 0.8f;
                    Place("apple", c + new Vector3(Mathf.Cos(a) * d, 0f, Mathf.Sin(a) * d), (float)rnd.NextDouble() * 360f, 1f, farm, mats, true);
                }
            }

            // ---- grass and flowers in clumps, kept off the pen, the path and the tree trunks
            ScatterMeadow(layout, mats, rnd);

            // ---- the birds
            var birds = new GameObject("Birds").transform;
            var infos = new List<BirdInfo>();
            HenWander treeHen = null;
            foreach (var h in layout.hens)
            {
                var w = MakeBird(h, layout, birds, mats);
                if (w == null) continue;
                var info = w.gameObject.AddComponent<BirdInfo>();             // who she is: filled in from the save when the game starts
                info.rooster = h.model == "rooster";
                info.slot = infos.Count;
                if (h.area == "tree" && h.model == "hen" && treeHen == null) { info.appleLover = true; treeHen = w; }
                var cc = w.gameObject.AddComponent<CapsuleCollider>();        // so a tap finds her
                cc.center = new Vector3(0f, 0.17f, 0f); cc.radius = 0.13f; cc.height = 0.36f;
                infos.Add(info);
            }

            // ---- stage 1 of the game: the nest, the feeder, the farm's rules and its on-screen counters
            var fg = BuildGame(mats);
            fg.birds = infos.ToArray();                                     // the hens in the yard lay into its nest

            // ---- stage 2b: the models chicks hatched on the farm are drawn with (a chick, then a young bird, then a grown-up)
            fg.henStand = Model("hen_stand"); fg.henPeck = Model("hen_peck");
            fg.roosterStand = Model("rooster_stand"); fg.roosterPeck = Model("rooster_peck");
            fg.chickStand = Model("chick_stand"); fg.chickPeck = Model("chick_peck");
            var birdMats = new List<Material>();
            foreach (var kv in mats)
                if (kv.Key.Contains("_rir_") || kv.Key == "FF_pupil" || kv.Key == "FF_cshine") birdMats.Add(kv.Value);
            fg.birdMaterials = birdMats.ToArray();

            // ---- stage 2: the apple tree's low apples, the Glutton who jumps for them, and her apple egg
            if (layout.trees.Length > 0) BuildApples(fg, treeHen, Vec(layout.trees[0].pos), mats);

            // ---- save and frame
            if (!AssetDatabase.IsValidFolder(Root + "/Scenes")) AssetDatabase.CreateFolder(Root, "Scenes");
            EditorSceneManager.SaveScene(scene, Root + "/Scenes/Farm.unity");
            Selection.activeGameObject = farm.gameObject;
            if (SceneView.lastActiveSceneView != null) SceneView.lastActiveSceneView.FrameSelected();
            Debug.Log("Feather and Field: starter farm built and saved as Scenes/Farm.unity. Press Play: the hens lay in the nest; tap the nest to collect, the feeder to fill it, a bird for her card, and Hatchery for the fertile eggs.");
        }

        // ------------------------------------------------------------------ materials
        static Dictionary<string, Material> MakeMaterials(Palette palette)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) { Debug.LogWarning("Feather and Field: URP Lit shader not found, using Standard."); shader = Shader.Find("Standard"); }
            string folder = Root + "/Materials";
            if (!AssetDatabase.IsValidFolder(folder)) AssetDatabase.CreateFolder(Root, "Materials");
            var dict = new Dictionary<string, Material>();
            foreach (var e in palette.materials)
            {
                string path = folder + "/" + e.name + ".mat";
                var m = AssetDatabase.LoadAssetAtPath<Material>(path);
                if (m == null) { m = new Material(shader); AssetDatabase.CreateAsset(m, path); }
                m.shader = shader;
                var c = Col(e.color);
                m.SetColor("_BaseColor", c);
                m.SetColor("_Color", c);
                m.SetFloat("_Smoothness", e.smoothness);
                m.SetFloat("_Glossiness", e.smoothness);
                m.SetFloat("_Metallic", e.metallic);
                m.enableInstancing = true;
                // thin single-sided parts (grass blades) must show from both sides
                EditorUtility.SetDirty(m);
                dict[e.name] = m;
            }
            AssetDatabase.SaveAssets();
            return dict;
        }

        /// <summary>Point every model's own materials at the cosy-farm ones, so any copy dragged into a scene looks right.</summary>
        static void RemapModelMaterials(Dictionary<string, Material> mats)
        {
            foreach (var guid in AssetDatabase.FindAssets("t:Model", new[] { Root + "/Models" }))
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                var importer = AssetImporter.GetAtPath(path) as ModelImporter;
                if (importer == null) continue;
                bool changed = false;
                foreach (var obj in AssetDatabase.LoadAllAssetsAtPath(path))
                {
                    var m = obj as Material;
                    if (m == null) continue;
                    Material target;
                    if (mats.TryGetValue(m.name, out target))
                    {
                        importer.AddRemap(new AssetImporter.SourceAssetIdentifier(typeof(Material), m.name), target);
                        changed = true;
                    }
                }
                if (changed) importer.SaveAndReimport();
            }
        }

        static void ApplyMaterials(GameObject go, Dictionary<string, Material> mats)
        {
            foreach (var r in go.GetComponentsInChildren<Renderer>(true))
            {
                var sm = r.sharedMaterials;
                for (int i = 0; i < sm.Length; i++)
                {
                    if (sm[i] == null) continue;
                    string n = sm[i].name.Replace(" (Instance)", "");
                    int dot = n.IndexOf('.');
                    if (dot > 0) n = n.Substring(0, dot);
                    Material m;
                    if (mats.TryGetValue(n, out m)) sm[i] = m;
                }
                r.sharedMaterials = sm;
            }
        }

        // ------------------------------------------------------------------ placing things
        static GameObject Place(string model, Vector3 pos, float yaw, float scale, Transform parent, Dictionary<string, Material> mats, bool isStatic)
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Root + "/Models/" + model + ".fbx");
            if (prefab == null) { Debug.LogError("Feather and Field: missing model Models/" + model + ".fbx"); return null; }
            var go = (GameObject)PrefabUtility.InstantiatePrefab(prefab, parent);
            go.transform.localPosition = pos;
            go.transform.localRotation = Quaternion.Euler(0f, yaw, 0f);
            go.transform.localScale = Vector3.one * scale;
            ApplyMaterials(go, mats);
            if (isStatic)
                foreach (var t in go.GetComponentsInChildren<Transform>(true))
                    GameObjectUtility.SetStaticEditorFlags(t.gameObject, StaticEditorFlags.BatchingStatic);
            return go;
        }

        static HenWander MakeBird(HenEntry h, Layout layout, Transform parent, Dictionary<string, Material> mats)
        {
            var root = new GameObject(h.model == "rooster" ? "Rooster" : "Hen").transform;
            root.SetParent(parent, false);
            var visual = new GameObject("Visual").transform;
            visual.SetParent(root, false);
            var stand = Place(h.model + "_stand", Vector3.zero, 0f, 1f, visual, mats, false);
            var peck = Place(h.model + "_peck", Vector3.zero, 0f, 1f, visual, mats, false);
            if (peck != null) peck.SetActive(false);

            var w = root.gameObject.AddComponent<HenWander>();
            w.standModel = stand; w.peckModel = peck; w.visual = visual;
            if (h.area == "tree" && layout.trees.Length > 0)
            {
                Vector3 c = Vec(layout.trees[0].pos);
                w.areaMin = new Vector3(Mathf.Max(c.x - 1.4f, layout.pen.max[0] + 0.15f), 0f, c.z - 1.3f);
                w.areaMax = new Vector3(c.x + 1.4f, 0f, Mathf.Min(c.z + 1.3f, layout.pen.min[2] - 0.15f));
                w.obstacles = new[] { new Vector4(c.x, 0f, c.z, 0.35f) };
            }
            else
            {
                w.areaMin = Vec(layout.yard.min); w.areaMax = Vec(layout.yard.max);
                var obs = new List<Vector4>();
                for (int i = 0; i + 3 < layout.yardObstacles.Length; i += 4)
                    obs.Add(new Vector4(layout.yardObstacles[i], layout.yardObstacles[i + 1], layout.yardObstacles[i + 2], layout.yardObstacles[i + 3]));
                w.obstacles = obs.ToArray();
            }
            // start inside its area, facing the way the layout says
            Vector3 p = Vec(h.pos);
            p.x = Mathf.Clamp(p.x, w.areaMin.x + 0.05f, w.areaMax.x - 0.05f);
            p.z = Mathf.Clamp(p.z, w.areaMin.z + 0.05f, w.areaMax.z - 0.05f);
            root.position = p;
            root.rotation = Quaternion.Euler(0f, h.yaw, 0f);
            if (h.area != "tree")                       // keep pottering hens off the nest (they go there to lay)
            {
                var obs = new List<Vector4>(w.obstacles);
                obs.Add(new Vector4(NestPos.x, 0f, NestPos.z, 0.16f));
                w.obstacles = obs.ToArray();
            }
            return w;
        }

        // ------------------------------------------------------------------ stage 1: nest, feeder, rules, counters
        static readonly Vector3 NestPos = new Vector3(-0.9f, 0f, 0.74f);       // in the yard, by the nest box on the side of the coop
        static readonly Vector3 FeederPos = new Vector3(-0.75f, 0f, 1.25f);    // the galvanised feeder that comes with the coop

        static GameObject Model(string name)
        {
            var m = AssetDatabase.LoadAssetAtPath<GameObject>(Root + "/Models/" + name + ".fbx");
            if (m == null) Debug.LogError("Feather and Field: missing model Models/" + name + ".fbx");
            return m;
        }

        static FarmGame BuildGame(Dictionary<string, Material> mats)
        {
            var egg = ExtraMaterial(mats, "FF_egg", new Color(0.80f, 0.56f, 0.38f), 0.35f);

            // the nest: a bed of straw with room for a dozen eggs, and a generous tap area
            var nestGo = new GameObject("Nest");
            nestGo.transform.position = NestPos;
            Prim(PrimitiveType.Cylinder, "Straw rim", nestGo.transform, new Vector3(0f, 0.016f, 0f), new Vector3(0.40f, 0.016f, 0.36f), Mat(mats, "FF_straw_2"));
            Prim(PrimitiveType.Cylinder, "Straw", nestGo.transform, new Vector3(0f, 0.022f, 0f), new Vector3(0.32f, 0.012f, 0.28f), Mat(mats, "FF_straw_1"));
            var nest = nestGo.AddComponent<NestBox>();
            var eggs = new List<GameObject>();
            var rnd = new System.Random(7);
            for (int i = 0; i < 12; i++)
            {
                float a = i * 2.4f, d = 0.025f + 0.095f * Mathf.Sqrt(i / 11f);             // a little spiral heap
                var e = Prim(PrimitiveType.Sphere, "Egg " + (i + 1), nestGo.transform,
                    new Vector3(Mathf.Cos(a) * d, 0.062f + (i > 8 ? 0.03f : 0f), Mathf.Sin(a) * d * 0.9f), new Vector3(0.055f, 0.07f, 0.055f), egg);
                e.transform.localRotation = Quaternion.Euler(Rand(rnd, -35f, 35f), Rand(rnd, 0f, 360f), Rand(rnd, -35f, 35f));
                e.SetActive(false);
                eggs.Add(e);
            }
            nest.eggs = eggs.ToArray();
            var nb = nestGo.AddComponent<BoxCollider>();
            nb.center = new Vector3(0f, 0.38f, 0f); nb.size = new Vector3(0.62f, 0.8f, 0.62f);       // covers the egg bubble above it too

            // the feeder: a heap of grain in its tray that goes down as the hens eat
            var feederGo = new GameObject("Feeder");
            feederGo.transform.position = FeederPos;
            var grain = Prim(PrimitiveType.Cylinder, "Grain", feederGo.transform, new Vector3(0f, 0.07f, 0f), new Vector3(0.27f, 0.015f, 0.27f), Mat(mats, "FF_grainfeed"));
            var feeder = feederGo.AddComponent<Feeder>();
            feeder.grain = grain.transform;
            var fc = feederGo.AddComponent<CapsuleCollider>();
            fc.center = new Vector3(0f, 0.3f, 0f); fc.radius = 0.26f; fc.height = 0.75f;

            // the farm's rules and its counters
            var game = new GameObject("Game");
            var hud = game.AddComponent<FarmHud>();
            var fg = game.AddComponent<FarmGame>();
            fg.nest = nest; fg.feeder = feeder; fg.hud = hud;
            return fg;
        }

        static void BuildApples(FarmGame fg, HenWander glutton, Vector3 trunk, Dictionary<string, Material> mats)
        {
            // five apples hanging under the canopy, on the sides of the tree the camera can see, all outside the pen
            var holder = new GameObject("Low apples").transform;
            holder.position = trunk;
            Vector3 toCamera = new Vector3(-0.7071f, 0f, 0.7071f), right = new Vector3(-0.7071f, 0f, -0.7071f);
            var apples = new List<Transform>();
            foreach (float deg in new[] { 0f, 45f, 90f, 135f, 180f })
            {
                float a = deg * Mathf.Deg2Rad;
                Vector3 p = trunk + (right * Mathf.Cos(a) + toCamera * Mathf.Sin(a)) * 0.75f;
                p.y = 0.98f;
                var go = Place("apple", Vector3.zero, deg * 2f, 1.4f, holder, mats, false);
                if (go == null) continue;
                go.name = "Low apple";
                go.transform.position = p;
                apples.Add(go.transform);
            }
            var tree = holder.gameObject.AddComponent<AppleTree>();
            tree.apples = apples.ToArray();
            fg.appleTree = tree;
            if (glutton != null)
            {
                var seeker = glutton.gameObject.AddComponent<AppleSeeker>();
                seeker.tree = tree;
            }

            // her apple egg: rosy gold, a little bigger than an ordinary egg, with a generous tap area
            var appleEggMat = ExtraMaterial(mats, "FF_appleegg", new Color(0.95f, 0.66f, 0.42f), 0.6f);
            var eggGo = new GameObject("Apple egg");
            eggGo.transform.position = trunk + toCamera * 0.6f;
            var vis = Prim(PrimitiveType.Sphere, "Egg", eggGo.transform, new Vector3(0f, 0.045f, 0f), new Vector3(0.07f, 0.09f, 0.07f), appleEggMat);
            var ge = eggGo.AddComponent<GrassEgg>();
            ge.visual = vis.transform;
            var sc = eggGo.AddComponent<SphereCollider>();
            sc.center = new Vector3(0f, 0.08f, 0f); sc.radius = 0.18f;
            fg.appleEgg = ge;
        }

        static GameObject Prim(PrimitiveType type, string name, Transform parent, Vector3 localPos, Vector3 scale, Material m)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            UnityEngine.Object.DestroyImmediate(go.GetComponent<Collider>());       // only the tap areas have colliders
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            go.transform.localScale = scale;
            if (m != null) go.GetComponent<Renderer>().sharedMaterial = m;
            return go;
        }

        static Material Mat(Dictionary<string, Material> mats, string name)
        {
            Material m;
            return mats.TryGetValue(name, out m) ? m : null;
        }

        static Material ExtraMaterial(Dictionary<string, Material> mats, string name, Color c, float smooth)
        {
            Material m;
            if (mats.TryGetValue(name, out m)) return m;
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) shader = Shader.Find("Standard");
            string path = Root + "/Materials/" + name + ".mat";
            m = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (m == null) { m = new Material(shader); AssetDatabase.CreateAsset(m, path); }
            m.SetColor("_BaseColor", c); m.SetColor("_Color", c);
            m.SetFloat("_Smoothness", smooth); m.SetFloat("_Glossiness", smooth);
            EditorUtility.SetDirty(m);
            mats[name] = m;
            return m;
        }

        [MenuItem("Feather and Field/Start the farm again (clear its save)")]
        public static void ClearSave()
        {
            if (!EditorUtility.DisplayDialog("Feather and Field", "Start the farm again? Coins, eggs, the feeder, the birds and the hatchery go back to the start.", "Start again", "Cancel")) return;
            PlayerPrefs.DeleteKey(FarmGame.SaveKey);
            PlayerPrefs.Save();
            Debug.Log("Feather and Field: the farm's save was cleared.");
        }

        static void ScatterMeadow(Layout layout, Dictionary<string, Material> mats, System.Random rnd)
        {
            var tufts = new List<GameObject>();
            for (int i = 0; i < 3; i++) { var g = AssetDatabase.LoadAssetAtPath<GameObject>(Root + "/Models/grass_tuft_" + i + ".fbx"); if (g) tufts.Add(g); }
            var flowers = new List<GameObject>();
            foreach (var n in new[] { "flower_daisy", "flower_daisy", "flower_butter", "flower_clover" })
            { var g = AssetDatabase.LoadAssetAtPath<GameObject>(Root + "/Models/" + n + ".fbx"); if (g) flowers.Add(g); }
            if (tufts.Count == 0) return;

            var parent = new GameObject("Meadow details").transform;
            const float half = 9f;
            var centres = new List<Vector3>();
            for (int i = 0; i < 140; i++) centres.Add(new Vector3(Rand(rnd, -half, half), 0f, Rand(rnd, -half, half)));

            int placed = 0;
            for (int i = 0; i < 3200 && placed < 1600; i++)
            {
                Vector3 p;
                if (rnd.NextDouble() < 0.78) { var c = centres[rnd.Next(centres.Count)]; p = c + new Vector3(Gauss(rnd) * 0.14f, 0f, Gauss(rnd) * 0.14f); }
                else p = new Vector3(Rand(rnd, -half, half), 0f, Rand(rnd, -half, half));
                if (Blocked(p, layout)) continue;
                bool flower = flowers.Count > 0 && rnd.NextDouble() < 0.07;
                var src = flower ? flowers[rnd.Next(flowers.Count)] : tufts[rnd.Next(tufts.Count)];
                var go = (GameObject)PrefabUtility.InstantiatePrefab(src, parent);
                go.transform.position = p;
                go.transform.rotation = Quaternion.Euler(0f, Rand(rnd, 0f, 360f), 0f);
                go.transform.localScale = Vector3.one * (flower ? Rand(rnd, 1.3f, 1.9f) : Rand(rnd, 1.3f, 2.4f));
                ApplyMaterials(go, mats);
                foreach (var r in go.GetComponentsInChildren<Renderer>()) r.shadowCastingMode = ShadowCastingMode.Off;
                GameObjectUtility.SetStaticEditorFlags(go, StaticEditorFlags.BatchingStatic);
                placed++;
            }
        }

        static bool Blocked(Vector3 p, Layout L)
        {
            if (p.x > L.pen.min[0] - 0.05f && p.x < L.pen.max[0] + 0.05f && p.z > L.pen.min[2] - 0.05f && p.z < L.pen.max[2] + 0.05f) return true;
            for (int i = 0; i + 2 < L.path.Length; i += 3)
            {
                float dx = p.x - L.path[i], dz = p.z - L.path[i + 2];
                if (dx * dx + dz * dz < 0.42f * 0.42f) return true;
            }
            foreach (var t in L.trees)
            {
                float dx = p.x - t.pos[0], dz = p.z - t.pos[2];
                if (dx * dx + dz * dz < 0.2f * 0.2f) return true;
            }
            return false;
        }

        static void AddVolume()
        {
            var volGo = new GameObject("Global Volume");
            var vol = volGo.AddComponent<Volume>();
            vol.isGlobal = true;
            string path = Root + "/Data/FarmLook.asset";
            AssetDatabase.DeleteAsset(path);
            var profile = ScriptableObject.CreateInstance<VolumeProfile>();
            AssetDatabase.CreateAsset(profile, path);
            var ca = profile.Add<ColorAdjustments>(true);
            ca.saturation.Override(18f); ca.postExposure.Override(0.05f); ca.contrast.Override(12f);
            var vg = profile.Add<Vignette>(true);
            vg.intensity.Override(0.15f);
            var bl = profile.Add<Bloom>(true);
            bl.intensity.Override(0.2f); bl.threshold.Override(1.05f);
            foreach (var c in profile.components) AssetDatabase.AddObjectToAsset(c, profile);
            EditorUtility.SetDirty(profile);
            AssetDatabase.SaveAssets();
            vol.sharedProfile = profile;
        }

        // ------------------------------------------------------------------ helpers
        static string ReadText(string assetPath)
        {
            var ta = AssetDatabase.LoadAssetAtPath<TextAsset>(assetPath);
            if (ta != null) return ta.text;
            string full = Path.Combine(Directory.GetCurrentDirectory(), assetPath);
            return File.Exists(full) ? File.ReadAllText(full) : null;
        }
        static Vector3 Vec(float[] a) { return a != null && a.Length >= 3 ? new Vector3(a[0], a[1], a[2]) : Vector3.zero; }
        static Color Col(float[] a) { return a != null && a.Length >= 3 ? new Color(a[0], a[1], a[2], 1f) : Color.white; }
        static float Rand(System.Random r, float a, float b) { return a + (float)r.NextDouble() * (b - a); }
        static float Gauss(System.Random r)
        {
            double u1 = 1.0 - r.NextDouble(), u2 = r.NextDouble();
            return (float)(System.Math.Sqrt(-2.0 * System.Math.Log(u1)) * System.Math.Sin(2.0 * System.Math.PI * u2));
        }
    }
}
