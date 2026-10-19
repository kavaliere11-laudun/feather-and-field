using System.Collections;
using UnityEngine;

namespace FeatherField
{
    /// <summary>
    /// An apple egg in the grass under the apple tree: it bobs and turns gently until it is tapped and collected.
    /// </summary>
    public class GrassEgg : MonoBehaviour
    {
        public Transform visual;            // the egg itself (a child), so the tap area stays put while it bobs

        Vector3 baseScale = Vector3.one;
        float phase;

        void Awake()
        {
            if (visual != null) baseScale = visual.localScale;
        }

        public void Show(bool on, Vector3 at, bool pop)
        {
            if (!on) { gameObject.SetActive(false); return; }
            transform.position = at;
            gameObject.SetActive(true);
            if (pop && visual != null) StartCoroutine(Pop());
        }

        void Update()
        {
            if (visual == null) return;
            phase += Time.deltaTime;
            visual.localPosition = new Vector3(0f, 0.045f + Mathf.Sin(phase * 2.6f) * 0.012f, 0f);
            visual.localRotation = Quaternion.Euler(0f, phase * 40f, 8f);
        }

        IEnumerator Pop()
        {
            const float dur = 0.45f;
            for (float k = 0f; k < dur; k += Time.deltaTime)
            {
                float x = k / dur;
                float s = 1f + 2.7f * Mathf.Pow(x - 1f, 3f) + 1.7f * Mathf.Pow(x - 1f, 2f);
                visual.localScale = baseScale * Mathf.Max(0f, s);
                yield return null;
            }
            visual.localScale = baseScale;
        }
    }
}
