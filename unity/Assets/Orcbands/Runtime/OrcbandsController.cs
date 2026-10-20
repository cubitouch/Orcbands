using UnityEngine;

namespace Orcbands
{
    /// <summary>RTS selection and camera review, not yet harvesting/pathfinding.</summary>
    public sealed class OrcbandsController : MonoBehaviour
    {
        public Transform Worker;
        public Camera GameCamera;
        public Collider Ground;
        public Transform SelectionRing;

        private bool selected;
        private bool hasDestination;
        private Vector3 destination;
        private Vector3 focus = new Vector3(0f, 0f, -1f);
        private const float MoveSpeed = 4.5f;

        private void Update()
        {
            if (Worker == null || GameCamera == null || Ground == null) return;

            if (Input.GetMouseButtonDown(0))
            {
                Ray ray = GameCamera.ScreenPointToRay(Input.mousePosition);
                selected = Physics.Raycast(ray, out RaycastHit hit, 300f) &&
                           hit.collider != null && hit.collider.transform == Worker;
            }

            if (selected && Input.GetMouseButtonDown(1))
            {
                Ray ray = GameCamera.ScreenPointToRay(Input.mousePosition);
                if (Ground.Raycast(ray, out RaycastHit hit, 300f))
                {
                    destination = new Vector3(hit.point.x, hit.point.y + 1f, hit.point.z);
                    hasDestination = true;
                }
            }

            if (hasDestination)
            {
                Vector3 flat = destination - Worker.position;
                flat.y = 0f;
                if (flat.magnitude < .035f) hasDestination = false;
                else
                {
                    Vector3 next = Worker.position + flat.normalized *
                        Mathf.Min(flat.magnitude, MoveSpeed * Time.deltaTime);
                    if (Ground.Raycast(new Ray(new Vector3(next.x, 45f, next.z),
                        Vector3.down), out RaycastHit elevation, 100f))
                        next.y = elevation.point.y + 1f;
                    Worker.position = next;
                }
            }

            if (SelectionRing != null)
            {
                SelectionRing.gameObject.SetActive(selected);
                SelectionRing.position = Worker.position - new Vector3(0f, .96f, 0f);
            }

            Vector3 forward = Vector3.ProjectOnPlane(GameCamera.transform.forward,
                Vector3.up).normalized;
            Vector3 right = Vector3.ProjectOnPlane(GameCamera.transform.right,
                Vector3.up).normalized;
            Vector3 pan = right * Input.GetAxisRaw("Horizontal") +
                          forward * Input.GetAxisRaw("Vertical");
            if (pan.sqrMagnitude > .01f)
            {
                Vector3 candidate = focus + pan.normalized * 12f * Time.deltaTime;
                candidate.x = Mathf.Clamp(candidate.x, -30f, 30f);
                candidate.z = Mathf.Clamp(candidate.z, -30f, 30f);
                GameCamera.transform.position += candidate - focus;
                focus = candidate;
            }

            // Perspective dolly retains the approved three-quarter viewing angle.
            float scroll = Input.mouseScrollDelta.y;
            if (Mathf.Abs(scroll) > .01f)
            {
                Vector3 offset = GameCamera.transform.position - focus;
                float distance = Mathf.Clamp(offset.magnitude - scroll * 2.7f, 10f, 87f);
                GameCamera.transform.position = focus + offset.normalized * distance;
            }

            float turn = 0f;
            if (Input.GetKey(KeyCode.Q)) turn += 55f * Time.deltaTime;
            if (Input.GetKey(KeyCode.E)) turn -= 55f * Time.deltaTime;
            if (turn != 0f)
            {
                Vector3 offset = GameCamera.transform.position - focus;
                GameCamera.transform.position = focus +
                    Quaternion.AngleAxis(turn, Vector3.up) * offset;
                GameCamera.transform.LookAt(focus);
            }
            if (Input.GetKeyDown(KeyCode.R))
            {
                focus = new Vector3(0f, 0f, -1f);
                GameCamera.transform.position = new Vector3(20f, 22f, 26f);
                GameCamera.transform.LookAt(focus);
            }
        }

        private void OnGUI()
        {
            var previous = GUI.color;
            GUI.color = new Color(.11f, .17f, .14f, .84f);
            GUI.DrawTexture(new Rect(16, 16, 348, 78), Texture2D.whiteTexture);
            GUI.color = Color.white;
            GUI.Label(new Rect(28, 22, 330, 24), "Orcbands  ·  Unity forest preview");
            GUI.Label(new Rect(28, 47, 330, 20),
                "Select worker: click    Move: right-click");
            GUI.Label(new Rect(28, 67, 330, 20),
                "WASD pan · Wheel zoom · Q/E rotate · R reset");
            GUI.color = previous;
        }
    }
}
