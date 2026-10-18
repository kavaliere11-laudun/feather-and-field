using System.IO;
using System.Security.Cryptography;
using UnityEditor;
using UnityEngine;
using UnityEngine.Networking;

namespace FeatherField.EditorTools
{
    /// <summary>
    /// Menu: Feather and Field > Get latest from Claude.
    /// Downloads the newest version of this pack from the game's GitHub repository (only the files that changed),
    /// checks each file against its fingerprint, writes it into Assets/FeatherField and offers to rebuild the farm.
    /// </summary>
    public static class FeatherFieldUpdater
    {
        const string BaseUrl = "https://raw.githubusercontent.com/kavaliere11-laudun/feather-and-field/source/stylized/unity/FeatherField/";
        const string Root = "Assets/FeatherField";
        const string RebuildFlag = "FeatherField.RebuildAfterUpdate";

        [System.Serializable] class Entry { public string path; public string sha1; public int size; }
        [System.Serializable] class Manifest { public string version; public Entry[] files; }

        [MenuItem("Feather and Field/Get latest from Claude")]
        public static void GetLatest()
        {
            Manifest manifest;
            try
            {
                string text = System.Text.Encoding.UTF8.GetString(Download(BaseUrl + "manifest.json?t=" + System.DateTime.UtcNow.Ticks));
                manifest = JsonUtility.FromJson<Manifest>(text);
            }
            catch (System.Exception e)
            {
                EditorUtility.DisplayDialog("Feather and Field", "Could not reach the update on GitHub.\n\n" + e.Message, "OK");
                return;
            }
            if (manifest == null || manifest.files == null) { EditorUtility.DisplayDialog("Feather and Field", "The update list could not be read.", "OK"); return; }

            int updated = 0; bool scriptsChanged = false;
            try
            {
                for (int i = 0; i < manifest.files.Length; i++)
                {
                    var e = manifest.files[i];
                    if (!SafePath(e.path)) { Debug.LogWarning("Feather and Field: skipped unsafe path " + e.path); continue; }
                    string local = Path.Combine(Root, e.path).Replace('\\', '/');
                    EditorUtility.DisplayProgressBar("Feather and Field", "Checking " + e.path, (float)i / manifest.files.Length);
                    if (File.Exists(local) && Sha1(File.ReadAllBytes(local)) == e.sha1) continue;

                    byte[] data = Download(BaseUrl + e.path + "?t=" + System.DateTime.UtcNow.Ticks);
                    if (Sha1(data) != e.sha1) throw new IOException("the file " + e.path + " did not arrive intact. Please try again.");
                    Directory.CreateDirectory(Path.GetDirectoryName(local));
                    File.WriteAllBytes(local, data);
                    updated++;
                    if (e.path.EndsWith(".cs")) scriptsChanged = true;
                }
            }
            catch (System.Exception ex)
            {
                EditorUtility.ClearProgressBar();
                EditorUtility.DisplayDialog("Feather and Field", "The update stopped: " + ex.Message, "OK");
                AssetDatabase.Refresh();
                return;
            }
            EditorUtility.ClearProgressBar();

            if (updated == 0) { EditorUtility.DisplayDialog("Feather and Field", "You already have the latest version (" + manifest.version + ").", "OK"); return; }

            bool rebuild = EditorUtility.DisplayDialog("Feather and Field",
                updated + " file(s) updated to version " + manifest.version + ".\n\nRebuild the farm scene now?", "Rebuild the farm", "Later");
            if (rebuild) SessionState.SetBool(RebuildFlag, true);
            AssetDatabase.Refresh();
            // if code changed, Unity reloads first and the rebuild runs after that; otherwise it runs straight away
            if (rebuild && !scriptsChanged) EditorApplication.delayCall += TryRebuild;
        }

        [InitializeOnLoadMethod]
        static void AfterReload() { EditorApplication.delayCall += TryRebuild; }

        static void TryRebuild()
        {
            if (!SessionState.GetBool(RebuildFlag, false)) return;
            if (EditorApplication.isCompiling || EditorApplication.isUpdating) { EditorApplication.delayCall += TryRebuild; return; }
            SessionState.SetBool(RebuildFlag, false);
            FarmSetup.Build();
        }

        // only plain relative paths inside the pack: never outside Assets/FeatherField
        static bool SafePath(string p)
        {
            if (string.IsNullOrEmpty(p) || p.Contains("..") || p.StartsWith("/") || p.Contains(":") || p.Contains("\\")) return false;
            return true;
        }

        static byte[] Download(string url)
        {
            using (var req = UnityWebRequest.Get(url))
            {
                req.timeout = 120;
                var op = req.SendWebRequest();
                while (!op.isDone) System.Threading.Thread.Sleep(15);
                if (req.result != UnityWebRequest.Result.Success) throw new IOException(req.error);
                return req.downloadHandler.data;
            }
        }

        static string Sha1(byte[] data)
        {
            using (var sha = SHA1.Create())
            {
                var hash = sha.ComputeHash(data);
                var sb = new System.Text.StringBuilder(hash.Length * 2);
                foreach (var b in hash) sb.Append(b.ToString("x2"));
                return sb.ToString();
            }
        }
    }
}
