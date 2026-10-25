using UnityEngine;

namespace Orcbands
{
    /// <summary>Camera-relative edge scrolling and bounded RTS dolly/orbit controls.</summary>
    public sealed class RtsCamera : MonoBehaviour
    {
        public Camera View;
        public float MapHalfExtent = 110f;
        public float MinDistance = 24f, MaxDistance = 55f;
        public float PanSpeed = 18f;
        [Range(.01f, .15f)] public float EdgeFraction = .04f;
        public bool PointerInsideCanvas;
        public bool Selecting;
        public Vector3 Focus { get; private set; } = new Vector3(0f, 0f, -1f);
        public float Distance => View == null ? 0f : Vector3.Distance(View.transform.position, Focus);
        private Vector3 velocity, acceleration;

        private static float Edge(float coordinate, float band)
        {
            if (coordinate < band) return -Mathf.SmoothStep(0f, 1f, 1f - coordinate / band);
            if (coordinate > 1f - band) return Mathf.SmoothStep(0f, 1f, (coordinate - 1f + band) / band);
            return 0f;
        }

        private void Update()
        {
            if (View == null) return;
            if (!Application.isFocused) { velocity = acceleration = Vector3.zero; return; }
            Vector3 mouse = Input.mousePosition;
            bool inside = mouse.x >= 0f && mouse.x < Screen.width && mouse.y >= 0f && mouse.y < Screen.height;
            if (Application.platform == RuntimePlatform.WebGLPlayer) inside &= PointerInsideCanvas;
            Vector2 input = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            if (inside && !Selecting && !Input.GetMouseButton(0))
                input += new Vector2(Edge(mouse.x / Screen.width, EdgeFraction), Edge(mouse.y / Screen.height, EdgeFraction));
            input = Vector2.ClampMagnitude(input, 1f);
            Vector3 forward = Vector3.ProjectOnPlane(View.transform.forward, Vector3.up).normalized;
            Vector3 right = Vector3.ProjectOnPlane(View.transform.right, Vector3.up).normalized;
            Vector3 desired = (right * input.x + forward * input.y) * PanSpeed;
            velocity = Vector3.SmoothDamp(velocity, desired, ref acceleration, .12f);
            Vector3 candidate = Focus + velocity * Time.deltaTime;
            candidate.x = Mathf.Clamp(candidate.x, -MapHalfExtent + 8f, MapHalfExtent - 8f);
            candidate.z = Mathf.Clamp(candidate.z, -MapHalfExtent + 8f, MapHalfExtent - 8f);
            View.transform.position += candidate - Focus;
            Focus = candidate;

            float scroll = inside ? Input.mouseScrollDelta.y : 0f;
            if (Mathf.Abs(scroll) > .01f)
            {
                Vector3 offset = View.transform.position - Focus;
                float distance = Mathf.Clamp(offset.magnitude - scroll * 2.7f, MinDistance, MaxDistance);
                View.transform.position = Focus + offset.normalized * distance;
            }
            float turn = 0f;
            if (Input.GetKey(KeyCode.Q)) turn += 55f * Time.deltaTime;
            if (Input.GetKey(KeyCode.E)) turn -= 55f * Time.deltaTime;
            if (turn != 0f)
            {
                View.transform.position = Focus + Quaternion.AngleAxis(turn, Vector3.up) * (View.transform.position - Focus);
                View.transform.LookAt(Focus);
            }
            if (Input.GetKeyDown(KeyCode.R))
            {
                velocity = acceleration = Vector3.zero;
                Focus = new Vector3(0f, 0f, -1f);
                View.transform.position = new Vector3(-20f, 22f, 26f);
                View.transform.LookAt(Focus);
            }
        }

        public void RestoreView(Vector3 focus, Vector3 offset)
        {
            StopPointer(); Selecting = false; Focus = focus;
            View.transform.position = focus + offset;
            View.transform.LookAt(focus); View.fieldOfView = 38f;
        }
        public void StopPointer()
        {
            PointerInsideCanvas = false;
            velocity = acceleration = Vector3.zero;
        }
    }
}
