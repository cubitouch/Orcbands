using UnityEngine;

namespace Orcbands
{
    /// <summary>RTS selection, direct movement and tree-chopping animation commands.</summary>
    public sealed class OrcbandsController : MonoBehaviour
    {
        public Transform Worker;
        public Camera GameCamera;
        public Collider Ground;
        public Transform SelectionRing;
        public CampReveal Reveal;

        private bool selected;
        public bool IsWorkerSelected => selected;
        public string LastSelectionHit { get; private set; } = "no click";
        private bool hasDestination;
        private Vector3 destination;
        private Vector3 focus = new Vector3(0f, 0f, -1f);
        // Match a walking gait; the original unanimated proxy slid at 4.5 units/s.
        private const float MoveSpeed = 2.0f;
        private WoodcuttingTarget chopTarget;
        private WorkerAnimation animationDriver;
        public WoodcuttingTarget ChoppingTarget => chopTarget;
        public bool IsMoving => hasDestination;
        private void Start() { animationDriver = Worker.GetComponent<WorkerAnimation>(); }
        public void CancelWorkerCommand()
        {
            hasDestination = false;
            chopTarget = null;
            if (animationDriver != null) animationDriver.Request(WorkerAnimation.Mode.Idle);
        }

        private void Update()
        {
            if (Worker == null || GameCamera == null || Ground == null) return;
            // Review/debug control; the six static light sources remain the
            // baseline until gameplay-driven exploration is implemented.
            if (Reveal != null && Input.GetKeyDown(KeyCode.F))
                Reveal.SetFogOfWar(!Reveal.FogOfWarVisible);

            if (Input.GetMouseButtonDown(0))
            {
                Ray ray = GameCamera.ScreenPointToRay(Input.mousePosition);
                selected = Physics.Raycast(ray, out RaycastHit hit, 300f) &&
                           hit.collider != null && hit.collider.transform == Worker;
                LastSelectionHit = hit.collider == null ? "none" : hit.collider.name;
            }

            if (selected && Input.GetMouseButtonDown(1))
            {
                Ray ray = GameCamera.ScreenPointToRay(Input.mousePosition);
                if (animationDriver != null) animationDriver.Preview("Gameplay");
                if (Physics.Raycast(ray, out RaycastHit targetHit, 300f) &&
                    targetHit.collider.GetComponentInParent<WoodcuttingTarget>() is WoodcuttingTarget tree)
                {
                    chopTarget = tree;
                    destination = tree.ApproachPoint(Worker.position);
                    if (Ground.Raycast(new Ray(destination + Vector3.up * 45f, Vector3.down),
                        out RaycastHit surface, 100f)) destination.y = surface.point.y;
                    hasDestination = true;
                }
                else if (Ground.Raycast(ray, out RaycastHit hit, 300f))
                {
                    chopTarget = null;
                    destination = hit.point;
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
                        next.y = elevation.point.y;
                    Worker.position = next;
                    Worker.rotation = Quaternion.LookRotation(flat.normalized, Vector3.up);
                }
            }

            if (!hasDestination && chopTarget != null)
            {
                Vector3 facing = Vector3.ProjectOnPlane(chopTarget.transform.position - Worker.position, Vector3.up);
                if (facing.sqrMagnitude > .01f) Worker.rotation = Quaternion.LookRotation(facing, Vector3.up);
            }
            if (animationDriver != null) animationDriver.Request(hasDestination ? WorkerAnimation.Mode.Walking
                : chopTarget != null ? WorkerAnimation.Mode.Chopping : WorkerAnimation.Mode.Idle);

            if (SelectionRing != null)
            {
                SelectionRing.gameObject.SetActive(selected);
                SelectionRing.position = Worker.position + new Vector3(0f, .045f, 0f);
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
                GameCamera.transform.position = new Vector3(-20f, 22f, 26f);
                GameCamera.transform.LookAt(focus);
            }
        }

        private void OnGUI()
        {
            // The WebGL host already displays control hints below the canvas.
            // Preserve the in-game hints only for native desktop builds.
            if (Application.platform == RuntimePlatform.WebGLPlayer) return;
            var previous = GUI.color;
            GUI.color = new Color(.11f, .17f, .14f, .84f);
            GUI.DrawTexture(new Rect(16, 16, 348, 78), Texture2D.whiteTexture);
            GUI.color = Color.white;
            GUI.Label(new Rect(28, 22, 330, 24), "Orcbands  ·  Unity forest preview");
            GUI.Label(new Rect(28, 47, 330, 20),
                "Select worker: click    Move: right-click");
            GUI.Label(new Rect(28, 67, 330, 20),
                "WASD pan · Wheel zoom · Q/E rotate · R reset · F: fog of war");
            GUI.color = previous;
        }
    }
}
