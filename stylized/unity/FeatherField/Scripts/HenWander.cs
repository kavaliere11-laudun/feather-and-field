using System.Collections.Generic;
using UnityEngine;

namespace FeatherField
{
    /// <summary>
    /// Makes a hen (or rooster) potter about: walk to a random spot in its area, stop, sometimes peck at the ground,
    /// with a little waddle while walking. Pecking swaps the standing model for the pecking one.
    /// Birds keep a little room around each other: they head for spots nobody else is at (or heading to), with a clear way
    /// there, and stop when someone is just ahead.
    /// </summary>
    public class HenWander : MonoBehaviour
    {
        [Header("Models (children of Visual)")]
        public GameObject standModel;
        public GameObject peckModel;
        public Transform visual;

        [Header("Where it may walk (world space, Y ignored)")]
        public Vector3 areaMin = new Vector3(-1f, 0f, 0.6f);
        public Vector3 areaMax = new Vector3(1f, 0f, 1.7f);
        [Tooltip("Places to keep away from: x, y, z = centre, w = radius")]
        public Vector4[] obstacles = new Vector4[0];

        [Header("Feel")]
        public float speed = 0.32f;
        public float turnSpeed = 260f;

        const float Room = 0.45f;          // a new spot this far from everyone else is good
        const float Personal = 0.26f;      // stop walking when someone is this close, just ahead
        static readonly List<HenWander> All = new List<HenWander>();

        void OnEnable() { if (!All.Contains(this)) All.Add(this); }
        void OnDisable() { All.Remove(this); }

        Vector3 target;
        float wait, peck, phase;

        // laying: walk to the nest, sit on it a moment, stand up, and the egg is there
        System.Action onLaid;
        Vector3 nestSpot;
        int errand;                 // 0 pottering about, 1 going to the nest, 2 sitting on it
        float errandT;

        /// <summary>Another script (an apple-loving Glutton's AppleSeeker) is moving her: pottering about waits.</summary>
        [System.NonSerialized] public bool paused;

        /// <summary>True while this hen is on her way to the nest or sitting on it.</summary>
        public bool Busy { get { return errand != 0; } }

        /// <summary>Send her to lay: she walks to the nest, sits, and when she gets up laid() is called.</summary>
        public void GoLay(Vector3 spot, System.Action laid)
        {
            onLaid = laid;
            nestSpot = new Vector3(spot.x, transform.position.y, spot.z);
            errand = 1; errandT = 0f;
            peck = 0f; wait = 0f;
            SetPeck(false);
        }

        void Start()
        {
            phase = Random.value * 10f;
            wait = Random.Range(0.2f, 2.5f);
            target = transform.position;
        }

        /// <summary>Back from an outing: stand a moment, then find somewhere new to go.</summary>
        public void Settle()
        {
            peck = 0f;
            wait = Random.Range(0.3f, 1f);
            target = transform.position;
            SetPeck(false);
        }

        /// <summary>Swaps the bird's models (a chick growing up): the old ones are removed.</summary>
        public void SetModels(GameObject stand, GameObject peck)
        {
            if (standModel != null && standModel != stand) Destroy(standModel);
            if (peckModel != null && peckModel != peck) Destroy(peckModel);
            standModel = stand; peckModel = peck;
            SetPeck(false);
        }

        /// <summary>A free spot in her area with some room around it (somewhere to put a new chick).</summary>
        public Vector3 FreeSpot(float y)
        {
            Vector3 best = new Vector3((areaMin.x + areaMax.x) * 0.5f, y, (areaMin.z + areaMax.z) * 0.5f);
            float bestRoom = -1f;
            for (int i = 0; i < 40; i++)
            {
                var p = new Vector3(Random.Range(areaMin.x, areaMax.x), y, Random.Range(areaMin.z, areaMax.z));
                if (!Free(p)) continue;
                float r = RoomAt(p);
                if (r >= Room) return p;
                if (r > bestRoom) { bestRoom = r; best = p; }
            }
            return best;
        }

        // how far the nearest other bird is from this spot (or the spot it is walking to)
        float RoomAt(Vector3 p)
        {
            float d = 99f;
            foreach (var o in All)
            {
                if (o == null || o == this) continue;
                d = Mathf.Min(d, Flat(o.transform.position - p), Flat(o.target - p));
            }
            return d;
        }

        static float Flat(Vector3 v) { v.y = 0f; return v.magnitude; }

        // nothing in the way on the straight line from a to b
        bool ClearPath(Vector3 a, Vector3 b)
        {
            Vector3 d = b - a; d.y = 0f;
            float len = d.magnitude;
            for (float k = 0.1f; k < len; k += 0.1f) if (!Free(a + d * (k / len))) return false;
            return true;
        }

        // someone just ahead, too close to keep walking
        bool SomeoneAhead()
        {
            foreach (var o in All)
            {
                if (o == null || o == this) continue;
                Vector3 to = o.transform.position - transform.position; to.y = 0f;
                float d = to.magnitude;
                if (d < Personal && Vector3.Dot(to, transform.forward) > 0.2f * d) return true;
            }
            return false;
        }

        bool TooClose()
        {
            foreach (var o in All)
                if (o != null && o != this && Flat(o.transform.position - transform.position) < 0.2f) return true;
            return false;
        }

        bool Free(Vector3 p)
        {
            if (p.x < areaMin.x || p.x > areaMax.x || p.z < areaMin.z || p.z > areaMax.z) return false;
            foreach (var o in obstacles)
            {
                float dx = p.x - o.x, dz = p.z - o.z;
                if (dx * dx + dz * dz < o.w * o.w) return false;
            }
            return true;
        }

        // somewhere to go: free, with a clear way there, and away from the others (the roomiest of a few tries)
        void PickTarget()
        {
            Vector3 here = transform.position;
            bool startFree = Free(here);                     // just off the nest or back from the apple tree: any free spot will do
            Vector3 best = here;
            float bestRoom = -1f;
            for (int i = 0; i < 30; i++)
            {
                var p = new Vector3(Random.Range(areaMin.x, areaMax.x), here.y, Random.Range(areaMin.z, areaMax.z));
                if (!Free(p) || (startFree && !ClearPath(here, p))) continue;
                float r = RoomAt(p);
                if (r >= Room) { target = p; return; }
                if (r > bestRoom) { bestRoom = r; best = p; }
            }
            target = best;
        }

        public void SetPeck(bool down)
        {
            if (standModel) standModel.SetActive(!down);
            if (peckModel) peckModel.SetActive(down);
        }

        void Update()
        {
            float dt = Time.deltaTime;
            phase += dt;
            if (paused) return;
            if (errand != 0) { Errand(dt); return; }

            if (peck > 0f)                                   // pecking: head down, up, down...
            {
                peck -= dt;
                SetPeck(Mathf.Repeat(peck, 0.6f) > 0.25f);
                Waddle(false);
                if (peck <= 0f) { SetPeck(false); wait = Random.Range(0.4f, 1.5f); }
                return;
            }
            if (wait > 0f)                                   // standing about
            {
                if (wait > 0.3f && TooClose()) wait = 0.3f;  // someone is right on top of her: move along soon
                wait -= dt;
                Waddle(false);
                if (wait <= 0f)
                {
                    if (Random.value < 0.45f) peck = Random.Range(1.2f, 3f);
                    else PickTarget();
                }
                return;
            }

            Vector3 to = target - transform.position; to.y = 0f;
            if (to.magnitude < 0.04f) { wait = Random.Range(0.6f, 3f); Waddle(false); return; }

            Quaternion look = Quaternion.LookRotation(to.normalized, Vector3.up);
            transform.rotation = Quaternion.RotateTowards(transform.rotation, look, turnSpeed * dt);
            bool facing = Quaternion.Angle(transform.rotation, look) < 25f;
            if (facing && SomeoneAhead()) { wait = Random.Range(0.3f, 0.9f); Waddle(false); return; }    // let them pass, then go elsewhere
            if (facing)
            {
                Vector3 next = transform.position + transform.forward * speed * dt;
                if (Free(next) || !Free(transform.position)) transform.position = next;     // (stepping off the nest is always allowed)
                else wait = 0.5f;                            // blocked: stop and think again
            }
            Waddle(facing);
        }

        void Errand(float dt)
        {
            errandT += dt;
            if (errand == 1)
            {
                Vector3 to = nestSpot - transform.position; to.y = 0f;
                if (to.magnitude < 0.05f || errandT > 12f)
                {
                    transform.position = nestSpot;
                    errand = 2; errandT = 0f;
                    Waddle(false);
                    return;
                }
                Quaternion look = Quaternion.LookRotation(to.normalized, Vector3.up);
                transform.rotation = Quaternion.RotateTowards(transform.rotation, look, turnSpeed * dt);
                if (Quaternion.Angle(transform.rotation, look) < 25f)
                    transform.position += transform.forward * Mathf.Min(speed * 1.2f * dt, to.magnitude);
                Waddle(true);
                return;
            }
            // sitting on the nest: settled down low, with a little wiggle
            if (visual)
            {
                visual.localPosition = new Vector3(0f, -0.03f, 0f);
                visual.localRotation = Quaternion.Euler(0f, Mathf.Sin(phase * 9f) * 5f, 0f);
            }
            if (errandT < 1.8f) return;
            errand = 0;
            if (visual) { visual.localPosition = Vector3.zero; visual.localRotation = Quaternion.identity; }
            var laid = onLaid; onLaid = null;
            if (laid != null) laid();
            PickTarget();                                   // and off she goes again
        }

        public void Waddle(bool walking)
        {
            if (!visual) return;
            float w = walking ? Mathf.Sin(phase * 16f) : 0f;
            visual.localRotation = Quaternion.Euler(0f, 0f, w * 5f);
            visual.localPosition = new Vector3(0f, walking ? Mathf.Abs(w) * 0.012f : 0f, 0f);
        }
    }
}
