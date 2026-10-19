using UnityEngine;

namespace FeatherField
{
    /// <summary>
    /// The apples hanging under the big apple tree. A Glutton knocks them down one at a time; one grows back every few minutes.
    /// </summary>
    public class AppleTree : MonoBehaviour
    {
        public Transform[] apples = new Transform[0];
        public float regrowSeconds = 180f;

        /// <summary>While an apple is falling or being eaten, nothing grows back (so it can't jump back onto the tree).</summary>
        [System.NonSerialized] public bool busy;

        Vector3[] home = new Vector3[0];
        Vector3[] scale = new Vector3[0];
        float regrowT;
        int count;

        public int Count { get { return count; } }
        public int Max { get { return apples.Length; } }

        void Awake()
        {
            home = new Vector3[apples.Length];
            scale = new Vector3[apples.Length];
            for (int i = 0; i < apples.Length; i++)
            {
                home[i] = apples[i] != null ? apples[i].position : transform.position;
                scale[i] = apples[i] != null ? apples[i].localScale : Vector3.one;
            }
            count = apples.Length;
        }

        public void SetCount(int n)
        {
            count = Mathf.Clamp(n, 0, apples.Length);
            for (int i = 0; i < apples.Length; i++)
            {
                if (apples[i] == null) continue;
                apples[i].gameObject.SetActive(i < count);
                apples[i].position = home[i];
                apples[i].localScale = scale[i];
            }
        }

        /// <summary>Grows an apple back now and then; true when one grew.</summary>
        public bool Tick(float dt)
        {
            if (busy || count >= apples.Length) { regrowT = 0f; return false; }
            regrowT += dt;
            if (regrowT < regrowSeconds) return false;
            regrowT = 0f;
            SetCount(count + 1);
            return true;
        }

        /// <summary>The lowest apple left, for a hen to knock down (null when the tree is bare).</summary>
        public Transform Take()
        {
            if (count <= 0) return null;
            count--;
            return apples[count];
        }

        /// <summary>The ground right under the apple that would be taken next.</summary>
        public Vector3 SpotUnderNext()
        {
            if (count <= 0 || count > home.Length) return transform.position;
            Vector3 p = home[count - 1];
            return new Vector3(p.x, 0f, p.z);
        }

        public Vector3 BaseScale(Transform apple)
        {
            for (int i = 0; i < apples.Length; i++) if (apples[i] == apple) return scale[i];
            return Vector3.one;
        }
    }
}
