// Minimal stand-ins for the parts of Unity's API the Feather and Field scripts use, with Unity's real signatures,
// so the scripts can be type-checked outside Unity. Bodies are empty: nothing here runs.
#pragma warning disable
using System;
using System.Collections;
using System.Collections.Generic;

namespace UnityEngine
{
    public class Object
    {
        public string name { get; set; }
        public static void Destroy(Object obj) { }
        public static void Destroy(Object obj, float t) { }
        public static void DestroyImmediate(Object obj) { }
        public static T Instantiate<T>(T original) where T : Object { return null; }
        public static T Instantiate<T>(T original, Transform parent) where T : Object { return null; }
        public static T Instantiate<T>(T original, Transform parent, bool worldPositionStays) where T : Object { return null; }
        public static T Instantiate<T>(T original, Vector3 position, Quaternion rotation) where T : Object { return null; }
        public static Object Instantiate(Object original, Transform parent, bool instantiateInWorldSpace) { return null; }
        public static bool operator ==(Object a, Object b) { return true; }
        public static bool operator !=(Object a, Object b) { return false; }
        public static implicit operator bool(Object o) { return true; }
        public override bool Equals(object o) { return true; }
        public override int GetHashCode() { return 0; }
    }

    public class Component : Object
    {
        public GameObject gameObject { get { return null; } }
        public Transform transform { get { return null; } }
        public T GetComponent<T>() { return default(T); }
        public T GetComponentInParent<T>() { return default(T); }
        public T[] GetComponentsInChildren<T>(bool includeInactive) { return null; }
        public T[] GetComponentsInChildren<T>() { return null; }
    }
    public class Behaviour : Component { public bool enabled { get; set; } public bool isActiveAndEnabled { get { return true; } } }
    public class MonoBehaviour : Behaviour
    {
        public Coroutine StartCoroutine(IEnumerator routine) { return null; }
        public void StopAllCoroutines() { }
    }
    public class Coroutine { }
    public class YieldInstruction { }
    public class WaitForSeconds : YieldInstruction { public WaitForSeconds(float s) { } }

    public class GameObject : Object
    {
        public GameObject() { }
        public GameObject(string name) { }
        public GameObject(string name, params Type[] components) { }
        public Transform transform { get { return null; } }
        public bool activeSelf { get { return true; } }
        public bool activeInHierarchy { get { return true; } }
        public void SetActive(bool v) { }
        public T AddComponent<T>() where T : Component { return null; }
        public T GetComponent<T>() { return default(T); }
        public T[] GetComponentsInChildren<T>(bool includeInactive) { return null; }
        public string tag { get; set; }
        public static GameObject CreatePrimitive(PrimitiveType t) { return null; }
    }
    public enum PrimitiveType { Sphere, Capsule, Cylinder, Cube, Plane, Quad }

    public class Transform : Component, IEnumerable
    {
        public Vector3 position { get; set; }
        public Vector3 localPosition { get; set; }
        public Quaternion rotation { get; set; }
        public Quaternion localRotation { get; set; }
        public Vector3 localScale { get; set; }
        public Vector3 eulerAngles { get; set; }
        public Vector3 forward { get; set; }
        public Vector3 right { get; set; }
        public Vector3 up { get; set; }
        public Transform parent { get; set; }
        public int childCount { get { return 0; } }
        public void SetParent(Transform p) { }
        public void SetParent(Transform p, bool worldPositionStays) { }
        public void SetAsLastSibling() { }
        public bool IsChildOf(Transform parent) { return false; }
        public void SetAsFirstSibling() { }
        public Vector3 TransformPoint(Vector3 p) { return p; }
        public Vector3 InverseTransformPoint(Vector3 p) { return p; }
        public void Rotate(float x, float y, float z, Space s) { }
        public Transform GetChild(int i) { return null; }
        public IEnumerator GetEnumerator() { return null; }
    }
    public enum Space { World, Self }
    public class RectTransform : Transform
    {
        public Vector2 anchorMin { get; set; }
        public Vector2 anchorMax { get; set; }
        public Vector2 pivot { get; set; }
        public Vector2 sizeDelta { get; set; }
        public Vector2 anchoredPosition { get; set; }
        public Vector2 offsetMin { get; set; }
        public Vector2 offsetMax { get; set; }
        public Rect rect { get { return default(Rect); } }
    }

    public struct Vector2
    {
        public float x, y;
        public Vector2(float x, float y) { this.x = x; this.y = y; }
        public static Vector2 zero { get { return default(Vector2); } }
        public static Vector2 one { get { return default(Vector2); } }
        public float magnitude { get { return 0f; } }
        public static float Distance(Vector2 a, Vector2 b) { return 0f; }
        public static Vector2 Lerp(Vector2 a, Vector2 b, float t) { return a; }
        public static Vector2 operator +(Vector2 a, Vector2 b) { return a; }
        public static Vector2 operator -(Vector2 a, Vector2 b) { return a; }
        public static Vector2 operator *(Vector2 a, float d) { return a; }
        public static Vector2 operator /(Vector2 a, float d) { return a; }
        public static bool operator ==(Vector2 a, Vector2 b) { return true; }
        public static bool operator !=(Vector2 a, Vector2 b) { return false; }
        public static implicit operator Vector2(Vector3 v) { return default(Vector2); }
        public static implicit operator Vector3(Vector2 v) { return default(Vector3); }
        public override bool Equals(object o) { return true; }
        public override int GetHashCode() { return 0; }
    }
    public struct Vector3
    {
        public float x, y, z;
        public Vector3(float x, float y, float z) { this.x = x; this.y = y; this.z = z; }
        public static Vector3 zero { get { return default(Vector3); } }
        public static Vector3 one { get { return default(Vector3); } }
        public static Vector3 up { get { return default(Vector3); } }
        public static Vector3 forward { get { return default(Vector3); } }
        public static Vector3 back { get { return default(Vector3); } }
        public static float Dot(Vector3 a, Vector3 b) { return 0f; }
        public static Vector3 MoveTowards(Vector3 current, Vector3 target, float maxDistanceDelta) { return current; }
        public float magnitude { get { return 0f; } }
        public float sqrMagnitude { get { return 0f; } }
        public Vector3 normalized { get { return this; } }
        public void Normalize() { }
        public static Vector3 Lerp(Vector3 a, Vector3 b, float t) { return a; }
        public static float Distance(Vector3 a, Vector3 b) { return 0f; }
        public static Vector3 operator +(Vector3 a, Vector3 b) { return a; }
        public static Vector3 operator -(Vector3 a, Vector3 b) { return a; }
        public static Vector3 operator -(Vector3 a) { return a; }
        public static Vector3 operator *(Vector3 a, float d) { return a; }
        public static Vector3 operator *(float d, Vector3 a) { return a; }
        public static Vector3 operator /(Vector3 a, float d) { return a; }
    }
    public struct Vector4
    {
        public float x, y, z, w;
        public Vector4(float x, float y, float z, float w) { this.x = x; this.y = y; this.z = z; this.w = w; }
    }
    public struct Quaternion
    {
        public static Quaternion identity { get { return default(Quaternion); } }
        public static Quaternion Euler(float x, float y, float z) { return default(Quaternion); }
        public static Quaternion LookRotation(Vector3 f, Vector3 up) { return default(Quaternion); }
        public static Quaternion RotateTowards(Quaternion a, Quaternion b, float d) { return a; }
        public static Quaternion Slerp(Quaternion a, Quaternion b, float t) { return a; }
        public static float Angle(Quaternion a, Quaternion b) { return 0f; }
        public static Quaternion operator *(Quaternion a, Quaternion b) { return a; }
        public static Vector3 operator *(Quaternion a, Vector3 v) { return v; }
    }
    public struct Rect
    {
        public Rect(float x, float y, float w, float h) { }
        public float yMin { get { return 0; } }
        public float yMax { get { return 0; } }
        public float width { get { return 0; } }
        public float height { get { return 0; } }
        public Vector2 size { get { return default(Vector2); } }
        public Vector2 center { get { return default(Vector2); } }
        public static bool operator ==(Rect a, Rect b) { return true; }
        public static bool operator !=(Rect a, Rect b) { return false; }
        public override bool Equals(object o) { return true; }
        public override int GetHashCode() { return 0; }
    }
    public struct Color
    {
        public float r, g, b, a;
        public Color(float r, float g, float b) { this.r = r; this.g = g; this.b = b; a = 1; }
        public Color(float r, float g, float b, float a) { this.r = r; this.g = g; this.b = b; this.a = a; }
        public static Color white { get { return default(Color); } }
        public static Color clear { get { return default(Color); } }
        public static implicit operator Color(Color32 c) { return default(Color); }
        public static implicit operator Color32(Color c) { return default(Color32); }
    }
    public struct Color32
    {
        public byte r, g, b, a;
        public Color32(byte r, byte g, byte b, byte a) { this.r = r; this.g = g; this.b = b; this.a = a; }
    }

    public static class Mathf
    {
        public const float PI = 3.14159f, Deg2Rad = 0.01745f;
        public static float Clamp(float v, float a, float b) { return v; }
        public static int Clamp(int v, int a, int b) { return v; }
        public static float Clamp01(float v) { return v; }
        public static float Min(float a, float b) { return a; }
        public static float Min(params float[] values) { return 0f; }
        public static int Min(int a, int b) { return a; }
        public static float Max(float a, float b) { return a; }
        public static int Max(int a, int b) { return a; }
        public static float Abs(float a) { return a; }
        public static float Sqrt(float a) { return a; }
        public static float Sin(float a) { return a; }
        public static float Cos(float a) { return a; }
        public static float Pow(float a, float b) { return a; }
        public static float Exp(float a) { return a; }
        public static float Lerp(float a, float b, float t) { return a; }
        public static float Repeat(float t, float l) { return t; }
        public static int RoundToInt(float a) { return 0; }
        public static int FloorToInt(float a) { return 0; }
        public static int CeilToInt(float a) { return 0; }
        public static float Round(float a) { return a; }
    }
    public static class Random
    {
        public static float value { get { return 0f; } }
        public static float Range(float a, float b) { return a; }
        public static int Range(int a, int b) { return a; }
    }
    public static class Time
    {
        public static float deltaTime { get { return 0f; } }
        public static float time { get { return 0f; } }
        public static float unscaledTime { get { return 0f; } }
    }
    public static class Screen
    {
        public static int width { get { return 0; } }
        public static int height { get { return 0; } }
        public static float dpi { get { return 0f; } }
        public static Rect safeArea { get { return default(Rect); } }
    }
    public static class Debug
    {
        public static void Log(object m) { }
        public static void LogWarning(object m) { }
        public static void LogError(object m) { }
    }
    public static class PlayerPrefs
    {
        public static string GetString(string k, string d) { return d; }
        public static void SetString(string k, string v) { }
        public static void Save() { }
        public static void DeleteKey(string k) { }
    }
    public static class JsonUtility
    {
        public static string ToJson(object o) { return ""; }
        public static T FromJson<T>(string j) { return default(T); }
    }
    public static class Resources { public static T GetBuiltinResource<T>(string path) where T : Object { return null; } }

    public class Camera : Behaviour
    {
        public static Camera main { get { return null; } }
        public float orthographicSize { get; set; }
        public Ray ScreenPointToRay(Vector3 p) { return default(Ray); }
        public Vector3 WorldToScreenPoint(Vector3 p) { return p; }
    }
    public struct Ray { }
    public struct RaycastHit { public Collider collider { get { return null; } } }
    public static class Physics { public static bool Raycast(Ray r, out RaycastHit hit, float max) { hit = default(RaycastHit); return false; } }
    public class Collider : Component { }
    public class CapsuleCollider : Collider { public Vector3 center { get; set; } public float radius { get; set; } public float height { get; set; } }
    public class SphereCollider : Collider { public Vector3 center { get; set; } public float radius { get; set; } }
    public class BoxCollider : Collider { public Vector3 center { get; set; } public Vector3 size { get; set; } }
    public class Renderer : Component { public Material sharedMaterial { get; set; } public Material[] sharedMaterials { get; set; } }
    public class Material : Object { }
    public class Texture : Object { public TextureWrapMode wrapMode { get; set; } public FilterMode filterMode { get; set; } }
    public class Texture2D : Texture
    {
        public Texture2D(int w, int h, TextureFormat f, bool mip) { }
        public void SetPixels32(Color32[] c) { }
        public void Apply() { }
    }
    public enum TextureFormat { RGBA32 }
    public enum TextureWrapMode { Repeat, Clamp }
    public enum FilterMode { Point, Bilinear }
    public enum SpriteMeshType { FullRect, Tight }
    public class Sprite : Object
    {
        public static Sprite Create(Texture2D t, Rect r, Vector2 pivot, float ppu, uint extrude, SpriteMeshType m, Vector4 border) { return null; }
    }
    public class Font : Object { }
    public enum FontStyle { Normal, Bold, Italic, BoldAndItalic }
    public enum TextAnchor { UpperLeft, UpperCenter, UpperRight, MiddleLeft, MiddleCenter, MiddleRight, LowerLeft, LowerCenter, LowerRight }
    public enum HorizontalWrapMode { Wrap, Overflow }
    public enum VerticalWrapMode { Truncate, Overflow }
    public struct TextGenerationSettings { }
    public class TextGenerator { public float GetPreferredHeight(string s, TextGenerationSettings g) { return 0f; } }
    public enum RenderMode { ScreenSpaceOverlay, ScreenSpaceCamera, WorldSpace }
    public class Canvas : Behaviour { public RenderMode renderMode { get; set; } public int sortingOrder { get; set; } public float scaleFactor { get; set; } }
    public class CanvasGroup : Behaviour { public float alpha { get; set; } }
    public static class RectTransformUtility
    {
        public static bool ScreenPointToLocalPointInRectangle(RectTransform r, Vector2 p, Camera c, out Vector2 local) { local = default(Vector2); return true; }
        public static bool RectangleContainsScreenPoint(RectTransform r, Vector2 p, Camera c) { return true; }
    }
    public static class Input
    {
        public static Vector3 mousePosition { get { return default(Vector3); } }
        public static Vector2 mouseScrollDelta { get { return default(Vector2); } }
        public static int touchCount { get { return 0; } }
        public static bool GetMouseButtonDown(int b) { return false; }
        public static bool GetMouseButtonUp(int b) { return false; }
        public static bool GetMouseButton(int b) { return false; }
        public static Touch GetTouch(int i) { return default(Touch); }
    }
    public struct Touch { public Vector2 position { get { return default(Vector2); } } }

    [AttributeUsage(AttributeTargets.Field, AllowMultiple = true)] public class HeaderAttribute : Attribute { public HeaderAttribute(string h) { } }
    [AttributeUsage(AttributeTargets.Field)] public class TooltipAttribute : Attribute { public TooltipAttribute(string h) { } }
    [AttributeUsage(AttributeTargets.Class, AllowMultiple = true)] public class RequireComponent : Attribute { public RequireComponent(Type t) { } }
}

namespace UnityEngine.UI
{
    public class Graphic : Behaviour
    {
        public Color color { get; set; }
        public bool raycastTarget { get; set; }
        public RectTransform rectTransform { get { return null; } }
    }
    public class MaskableGraphic : Graphic { }
    public class Image : MaskableGraphic
    {
        public enum Type { Simple, Sliced, Tiled, Filled }
        public Sprite sprite { get; set; }
        public Type type { get; set; }
        public float pixelsPerUnitMultiplier { get; set; }
    }
    public class Text : MaskableGraphic
    {
        public string text { get; set; }
        public Font font { get; set; }
        public int fontSize { get; set; }
        public FontStyle fontStyle { get; set; }
        public TextAnchor alignment { get; set; }
        public HorizontalWrapMode horizontalOverflow { get; set; }
        public VerticalWrapMode verticalOverflow { get; set; }
        public bool resizeTextForBestFit { get; set; }
        public int resizeTextMinSize { get; set; }
        public int resizeTextMaxSize { get; set; }
        public float preferredWidth { get { return 0f; } }
        public float pixelsPerUnit { get { return 1f; } }
        public TextGenerator cachedTextGeneratorForLayout { get { return null; } }
        public TextGenerationSettings GetGenerationSettings(Vector2 extents) { return default(TextGenerationSettings); }
    }
    public class RectMask2D : Behaviour { }
    public class CanvasScaler : Behaviour
    {
        public enum ScaleMode { ConstantPixelSize, ScaleWithScreenSize, ConstantPhysicalSize }
        public ScaleMode uiScaleMode { get; set; }
        public Vector2 referenceResolution { get; set; }
        public float matchWidthOrHeight { get; set; }
    }
}

namespace UnityEngine.InputSystem
{
    namespace Controls
    {
        public class ButtonControl { public bool wasPressedThisFrame { get { return false; } } public bool wasReleasedThisFrame { get { return false; } } public bool isPressed { get { return false; } } }
        public class Vector2Control { public Vector2 ReadValue() { return default(Vector2); } }
        public class TouchControl { public ButtonControl press { get { return null; } } public Vector2Control position { get { return null; } } }
    }
    public class Pointer
    {
        public static Pointer current { get { return null; } }
        public Controls.Vector2Control position { get { return null; } }
        public Controls.ButtonControl press { get { return null; } }
    }
    public class Mouse : Pointer
    {
        public static new Mouse current { get { return null; } }
        public Controls.Vector2Control scroll { get { return null; } }
        public Controls.ButtonControl leftButton { get { return null; } }
    }
    public class Touchscreen : Pointer
    {
        public static new Touchscreen current { get { return null; } }
        public Controls.TouchControl[] touches { get { return null; } }
    }
}
