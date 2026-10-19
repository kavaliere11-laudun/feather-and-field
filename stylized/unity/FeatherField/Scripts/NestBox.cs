using System.Collections;
using UnityEngine;

namespace FeatherField
{
    /// <summary>
    /// The straw nest in the yard. Shows the eggs laid so far (up to a dozen are drawn), each one popping in as it is laid.
    /// Tapping it collects them (FarmGame finds this component under the tap).
    /// </summary>
    public class NestBox : MonoBehaviour
    {
        public GameObject[] eggs = new GameObject[0];

        Vector3[] baseScale = new Vector3[0];

        /// <summary>Where a hen sits to lay.</summary>
        public Vector3 LaySpot { get { return transform.position; } }

        void Awake()
        {
            baseScale = new Vector3[eggs.Length];
            for (int i = 0; i < eggs.Length; i++) baseScale[i] = eggs[i] != null ? eggs[i].transform.localScale : Vector3.one;
        }

        public void Show(int count, bool pop)
        {
            int n = Mathf.Clamp(count, 0, eggs.Length);
            for (int i = 0; i < eggs.Length; i++)
            {
                if (eggs[i] == null) continue;
                bool on = i < n;
                bool appearing = on && !eggs[i].activeSelf;
                eggs[i].SetActive(on);
                if (appearing && pop && i == n - 1 && i < baseScale.Length) StartCoroutine(Pop(eggs[i].transform, baseScale[i]));
                else if (on && i < baseScale.Length) eggs[i].transform.localScale = baseScale[i];
            }
        }

        IEnumerator Pop(Transform t, Vector3 full)
        {
            const float dur = 0.4f;
            for (float k = 0f; k < dur; k += Time.deltaTime)
            {
                float x = k / dur;
                float s = 1f + 2.7f * Mathf.Pow(x - 1f, 3f) + 1.7f * Mathf.Pow(x - 1f, 2f);      // grows past full size, then settles
                if (t == null) yield break;
                t.localScale = full * Mathf.Max(0f, s);
                yield return null;
            }
            if (t != null) t.localScale = full;
        }
    }
}
