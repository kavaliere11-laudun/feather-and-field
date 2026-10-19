using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace FeatherField
{
    /// <summary>
    /// The farm camera: scroll or pinch to zoom (the view is redrawn sharp, not stretched), drag to move around.
    /// Works with a mouse, a Mac trackpad and touch screens.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    public class CameraRig : MonoBehaviour
    {
        public float minSize = 1.0f;          // most zoomed in (half the screen height, in metres)
        public float maxSize = 7f;            // most zoomed out
        public float zoomSensitivity = 0.0016f;
        public float panLimit = 9f;           // how far from the start the view may wander, in metres

        Camera cam;
        Vector3 startPos;
        Vector2 lastPointer;
        bool dragging;
        float lastPinch;

        void Start()
        {
            cam = GetComponent<Camera>();
            startPos = transform.position;
        }

        void LateUpdate()
        {
            float scroll = 0f, pinchFactor = 1f;
            bool pressed = false, held = false;
            Vector2 pointer = Vector2.zero;
            bool twoFingers = false;

#if ENABLE_INPUT_SYSTEM
            var mouse = Mouse.current;
            if (mouse != null)
            {
                scroll = mouse.scroll.ReadValue().y;
                pointer = mouse.position.ReadValue();
                held = mouse.leftButton.isPressed;
                pressed = mouse.leftButton.wasPressedThisFrame;
            }
            var touch = Touchscreen.current;
            if (touch != null)
            {
                int active = 0; Vector2 a = Vector2.zero, b = Vector2.zero;
                foreach (var t in touch.touches)
                {
                    if (!t.press.isPressed) continue;
                    if (active == 0) a = t.position.ReadValue(); else if (active == 1) b = t.position.ReadValue();
                    active++;
                }
                if (active >= 2)
                {
                    twoFingers = true;
                    float d = Vector2.Distance(a, b);
                    if (lastPinch > 0f && d > 0f) pinchFactor = lastPinch / d;
                    lastPinch = d;
                }
                else lastPinch = 0f;
                if (active == 1 && mouse == null)
                {
                    pointer = a; held = true;
                    pressed = !dragging;
                }
            }
#else
            scroll = Input.mouseScrollDelta.y * 120f;
            pointer = Input.mousePosition;
            held = Input.GetMouseButton(0);
            pressed = Input.GetMouseButtonDown(0);
            if (Input.touchCount >= 2)
            {
                twoFingers = true;
                float d = Vector2.Distance(Input.GetTouch(0).position, Input.GetTouch(1).position);
                if (lastPinch > 0f && d > 0f) pinchFactor = lastPinch / d;
                lastPinch = d;
            }
            else lastPinch = 0f;
#endif
            // zoom: change how much of the farm the camera sees, so it is drawn again at full sharpness
            float size = cam.orthographicSize;
            if (Mathf.Abs(scroll) > 0.001f) size *= Mathf.Exp(-scroll * zoomSensitivity);
            size *= pinchFactor;
            cam.orthographicSize = Mathf.Clamp(size, minSize, maxSize);

            // drag to move: the ground follows the finger or pointer
            if (twoFingers) { dragging = false; return; }
            if (pressed) { dragging = FarmHud.Instance == null || !FarmHud.Instance.Covers(pointer); lastPointer = pointer; }   // not from a panel or button
            if (!held) dragging = false;
            if (dragging)
            {
                Vector2 delta = pointer - lastPointer; lastPointer = pointer;
                float unitsPerPixel = 2f * cam.orthographicSize / Mathf.Max(1, Screen.height);
                Vector3 right = transform.right; right.y = 0f; right.Normalize();
                Vector3 up = transform.up; up.y = 0f; up.Normalize();
                float pitch = Mathf.Max(0.2f, Mathf.Sin(transform.eulerAngles.x * Mathf.Deg2Rad));
                Vector3 move = -(right * delta.x + up * (delta.y / pitch)) * unitsPerPixel;
                Vector3 p = transform.position + move;
                Vector3 off = p - startPos; off.y = 0f;
                if (off.magnitude > panLimit) { off = off.normalized * panLimit; p = new Vector3(startPos.x + off.x, p.y, startPos.z + off.z); }
                transform.position = p;
            }
        }
    }
}
