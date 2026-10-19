using UnityEngine;

namespace FeatherField
{
    /// <summary>
    /// A Glutton's favourite pastime: now and then she trots under the apple tree, crouches, jumps, knocks an apple down,
    /// and pecks it up. While she does, her usual pottering (HenWander) is paused.
    /// </summary>
    [RequireComponent(typeof(HenWander))]
    public class AppleSeeker : MonoBehaviour
    {
        public AppleTree tree;
        public float everySeconds = 45f;         // about how often she goes for an apple
        public float jumpHeight = 0.32f;

        HenWander wander;
        float timer, t;
        int step;                                // 0 pottering, 1 going, 2 looking up, 3 jumping, 6 landing, 4 waiting for the apple, 5 eating
        Transform apple;
        Vector3 spot, appleFrom, appleTo, appleScale;
        bool falling, landed;
        float fallT, fallDur;

        public bool Busy { get { return step != 0; } }

        void Awake()
        {
            wander = GetComponent<HenWander>();
            timer = Random.Range(6f, 16f);
        }

        void Update()
        {
            float dt = Time.deltaTime;
            if (falling) Fall(dt);
            if (step == 0)
            {
                var game = FarmGame.Instance;
                if (tree == null || wander == null || tree.Count <= 0 || game == null || !game.AppleWanted || wander.Busy) return;
                timer -= dt;
                if (timer > 0f) return;
                timer = everySeconds * Random.Range(0.8f, 1.3f);
                Begin();
                return;
            }
            t += dt;
            if (step == 1) Go(dt);
            else if (step == 2) LookUp();
            else if (step == 3) Jump();
            else if (step == 6) Land();
            else if (step == 4) { if (landed || t > 1.2f) { Face(appleTo, 1f); Next(5); } }
            else if (step == 5) Eat();
        }

        void Begin()
        {
            spot = tree.SpotUnderNext();
            apple = tree.Take();
            if (apple == null) return;
            spot.y = transform.position.y;
            appleScale = tree.BaseScale(apple);
            tree.busy = true;
            wander.paused = true;
            wander.SetPeck(false);
            falling = false; landed = false;
            Next(1);
        }

        void Next(int s) { step = s; t = 0f; }

        void Go(float dt)
        {
            Vector3 to = spot - transform.position; to.y = 0f;
            if (to.magnitude < 0.04f || t > 12f)
            {
                transform.position = spot;
                wander.Waddle(false);
                Next(2);
                return;
            }
            Quaternion look = Quaternion.LookRotation(to.normalized, Vector3.up);
            transform.rotation = Quaternion.RotateTowards(transform.rotation, look, wander.turnSpeed * dt);
            if (Quaternion.Angle(transform.rotation, look) < 25f)
                transform.position += transform.forward * Mathf.Min(wander.speed * 1.4f * dt, to.magnitude);    // a keen trot
            wander.Waddle(true);
        }

        // her whole body, tipped back around its middle (so her head points up and her tail stays clear of the ground),
        // lifted, and stretched (more than 1: taller and slimmer; less than 1: squashed)
        void Pose(float lift, float headUpDeg, float stretch)
        {
            if (wander.visual == null) return;
            Quaternion r = Quaternion.Euler(-headUpDeg, 0f, 0f);
            Vector3 pivot = new Vector3(0f, 0.14f, 0f);
            wander.visual.localRotation = r;
            wander.visual.localPosition = pivot - r * pivot + new Vector3(0f, lift, 0f);
            float side = 1f / Mathf.Sqrt(Mathf.Max(0.5f, stretch));
            wander.visual.localScale = new Vector3(side, stretch, side);
        }

        void LookUp()                                                  // she spots the apple: head up, then a little crouch to spring
        {
            const float dur = 0.55f;
            float k = Mathf.Clamp01(t / dur), e = k * k * (3f - 2f * k);
            float crouch = k > 0.6f ? (k - 0.6f) / 0.4f : 0f;
            Pose(-0.02f * crouch, 32f * e, 1f - 0.1f * crouch);
            if (k >= 1f) Next(3);
        }

        void Land()                                                    // a soft landing: a quick squash, head coming back down
        {
            const float dur = 0.22f;
            float k = Mathf.Clamp01(t / dur);
            Pose(0f, 10f * (1f - k), 1f - 0.12f * Mathf.Sin(k * Mathf.PI));
            if (k >= 1f) { Pose(0f, 0f, 1f); Next(4); }
        }

        void Jump()
        {
            const float dur = 0.55f;
            float k = Mathf.Clamp01(t / dur);
            float rising = k < 0.5f ? 1f - k * 2f : 0f;                  // stretched tall on the way up
            Pose(jumpHeight * 4f * k * (1f - k), Mathf.Lerp(36f, 10f, k), 1f + 0.08f * rising);
            if (k >= 0.5f && !falling && !landed)                      // at the top of the jump the apple comes down
            {
                appleFrom = apple.position;
                appleTo = transform.position + transform.forward * 0.15f;
                appleTo.y = transform.position.y + 0.02f;
                fallDur = Mathf.Sqrt(2f * Mathf.Max(0.1f, appleFrom.y - appleTo.y) / 9.8f);
                fallT = 0f;
                falling = true;
            }
            if (k >= 1f) Next(6);
        }

        void Fall(float dt)
        {
            if (apple == null) { falling = false; return; }
            fallT += dt;
            float k = Mathf.Clamp01(fallT / fallDur);
            Vector3 p = Vector3.Lerp(appleFrom, appleTo, k);
            p.y = Mathf.Lerp(appleFrom.y, appleTo.y, k * k);             // speeds up as it falls
            apple.position = p;
            apple.Rotate(0f, 0f, 400f * dt, Space.Self);
            if (k >= 1f) { falling = false; landed = true; }
        }

        void Face(Vector3 target, float amount)
        {
            Vector3 to = target - transform.position; to.y = 0f;
            if (to.sqrMagnitude < 0.0001f) return;
            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(to.normalized, Vector3.up), amount);
        }

        void Eat()
        {
            const float dur = 2.6f;
            wander.SetPeck(Mathf.Repeat(t, 0.5f) > 0.22f);
            if (apple != null) apple.localScale = appleScale * Mathf.Max(0.05f, 1f - t / dur);     // a bite at a time
            if (t < dur) return;
            wander.SetPeck(false);
            Pose(0f, 0f, 1f);
            if (apple != null) { apple.gameObject.SetActive(false); apple.localScale = appleScale; }
            apple = null;
            tree.busy = false;
            wander.paused = false;
            Next(0);
            var game = FarmGame.Instance;
            var info = GetComponent<BirdInfo>();
            if (game != null) game.AppleEaten(info, transform.position);
        }
    }
}
