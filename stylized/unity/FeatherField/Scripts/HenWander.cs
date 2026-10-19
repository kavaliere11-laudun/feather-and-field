using UnityEngine;

namespace FeatherField
{
    /// <summary>
    /// Makes a hen (or rooster) potter about: walk to a random spot in its area, stop, sometimes peck at the ground,
    /// with a little waddle while walking. Pecking swaps the standing model for the pecking one.
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

        void PickTarget()
        {
            for (int i = 0; i < 25; i++)
            {
                var p = new Vector3(Random.Range(areaMin.x, areaMax.x), transform.position.y, Random.Range(areaMin.z, areaMax.z));
                if (Free(p)) { target = p; return; }
            }
            target = transform.position;
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
