using UnityEngine;

namespace FeatherField
{
    /// <summary>
    /// The feeder in the yard: the grain in its tray rises and falls with how much food is left.
    /// Tapping it fills it (FarmGame finds this component under the tap).
    /// </summary>
    public class Feeder : MonoBehaviour
    {
        public Transform grain;              // a flat cylinder in the tray
        public float floorY = 0.055f;        // the tray's floor, in the feeder's own space
        public float fullHeight = 0.03f;     // how high the grain heaps up when full

        float shown = -1f;

        public void Show(float level)
        {
            level = Mathf.Clamp01(level);
            if (Mathf.Abs(level - shown) < 0.002f) return;
            shown = level;
            if (grain == null) return;
            grain.gameObject.SetActive(level > 0.001f);
            float h = Mathf.Lerp(0.002f, fullHeight, level);
            Vector3 s = grain.localScale; s.y = h * 0.5f;                  // a Unity cylinder is 2 units tall
            grain.localScale = s;
            grain.localPosition = new Vector3(grain.localPosition.x, floorY + h * 0.5f, grain.localPosition.z);
        }
    }
}
