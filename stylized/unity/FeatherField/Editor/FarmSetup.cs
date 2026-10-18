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
            sun.shadowStrength = 0.75f;
            sunGo.transform.rotation = Quaternion.LookRotation(Vec(layout.sun.dir).normalized, Vector3.up);
            RenderSettings.sun = sun;
            RenderSettings.skybox = null;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.76f, 0.86f, 0.96f);
            RenderSettings.ambientEquatorColor = new Color(0.68f, 0.78f, 0.6f);
            RenderSettings.ambientGroundColor = new Color(0.45f, 0.52f, 0.33f);

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
            if (camData != null) camData.renderPostProcessing = true;

            // ---- a gentle grading: a touch more colour, soft vignette, light bloom
            AddVolume();

            // ---- ground
            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Meadow";
            ground.transform.localScale = new Vector3(3f, 1f, 3f);                  // 30 x 30 metres
            Material meadow;
            if (mats.TryGetValue("FF_meadow", out meadow)) ground.GetComponent<Renderer>().sharedMaterial = meadow;
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
            foreach (var h in layout.hens) MakeBird(h, layout, birds, mats);

            // ---- save and frame
            if (!AssetDatabase.IsValidFolder(Root + "/Scenes")) AssetDatabase.CreateFolder(Root, "Scenes");
            EditorSceneManager.SaveScene(scene, Root + "/Scenes/Farm.unity");
            Selection.activeGameObject = farm.gameObject;
            if (SceneView.lastActiveSceneView != null) SceneView.lastActiveSceneView.FrameSelected();
            Debug.Log("Feather and Field: starter farm built and saved as Scenes/Farm.unity. Press Play to see the hens potter about.");
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
                if (e.name.StartsWith("FF_blade") || e.name.StartsWith("FF_stem")) m.SetFloat("_Cull", (float)CullMode.Off);
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

        static void MakeBird(HenEntry h, Layout layout, Transform parent, Dictionary<string, Material> mats)
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
            for (int i = 0; i < 2600 && placed < 1300; i++)
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
                go.transform.localScale = Vector3.one * Rand(rnd, 0.6f, 1.4f);
                ApplyMaterials(go, mats);
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
            ca.saturation.Override(12f); ca.postExposure.Override(0.1f); ca.contrast.Override(5f);
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
