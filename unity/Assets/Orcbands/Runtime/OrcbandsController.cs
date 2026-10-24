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
        public Transform TreeTargetRing;
        public CampReveal Reveal;
        public float MapHalfExtent = 110f;
        public WoodcuttingTarget.WorkExclusion[] WorkPositionExclusions;

        private bool selected;
        public bool IsWorkerSelected => selected;
        public string LastSelectionHit { get; private set; } = "no click";
        private bool hasDestination;
        private Vector3 destination;
        public RtsCamera Navigation;
        private bool selectionPressed, boxSelecting;
        private Vector2 selectionStart;
        public bool IsBoxSelecting => boxSelecting;
        private Rect SelectionRect
        {
            get
            {
                Vector2 current = new Vector2(Mathf.Clamp(Input.mousePosition.x, 0f, Screen.width),
                    Mathf.Clamp(Input.mousePosition.y, 0f, Screen.height));
                return Rect.MinMaxRect(Mathf.Min(selectionStart.x, current.x), Mathf.Min(selectionStart.y, current.y),
                    Mathf.Max(selectionStart.x, current.x), Mathf.Max(selectionStart.y, current.y));
            }
        }
        public void PointerInside(string inside)
        {
            if (Navigation == null) return;
            if (inside == "1") Navigation.PointerInsideCanvas = true;
            else Navigation.StopPointer();
        }
        public void CancelPointer(string unused)
        {
            selectionPressed = boxSelecting = false;
            if (Navigation != null) { Navigation.Selecting = false; Navigation.StopPointer(); }
        }
        private void OnApplicationFocus(bool focused) { if (!focused) CancelPointer(""); }
        // Gameplay travel and the authored walking rate both increase by 50%.
        private const float MoveSpeed = 3.0f;
        private WoodcuttingTarget chopTarget;
        private WorkerAnimation animationDriver;
        public WoodcuttingTarget ChoppingTarget => chopTarget;
        public bool IsMoving => hasDestination;
        private void Start() { animationDriver = Worker.GetComponent<WorkerAnimation>(); }
        public void CancelWorkerCommand()
        {
            hasDestination = false;
            SetChoppingTarget(null);
            if (animationDriver != null) animationDriver.Request(WorkerAnimation.Mode.Idle);
        }

        private void SetChoppingTarget(WoodcuttingTarget tree)
        {
            chopTarget = tree;
            if (TreeTargetRing == null) return;
            TreeTargetRing.gameObject.SetActive(tree != null);
            if (tree == null) return;
            if (Ground.Raycast(new Ray(tree.transform.position + Vector3.up * 45f, Vector3.down),
                out RaycastHit surface, 100f))
                TreeTargetRing.position = surface.point + Vector3.up * .055f;
        }

        private void Update()
        {
            if (Worker == null || GameCamera == null || Ground == null) return;
            // Review/debug control; the six static light sources remain the
            // baseline until gameplay-driven exploration is implemented.
            if (Reveal != null && Input.GetKeyDown(KeyCode.F))
                Reveal.SetFogOfWar(!Reveal.FogOfWarVisible);

            Vector3 pointer = Input.mousePosition;
            bool inside = pointer.x >= 0f && pointer.x < Screen.width && pointer.y >= 0f && pointer.y < Screen.height;
            if (Application.platform == RuntimePlatform.WebGLPlayer && Navigation != null)
                inside &= Navigation.PointerInsideCanvas;
            if (inside && Input.GetMouseButtonDown(0))
            {
                selectionStart = pointer;
                selectionPressed = true;
                boxSelecting = false;
            }
            if (selectionPressed)
            {
                if (Vector2.Distance(selectionStart, pointer) >= 6f) boxSelecting = true;
                if (Input.GetMouseButtonUp(0))
                {
                    if (boxSelecting)
                    {
                        Vector3 centre = GameCamera.WorldToScreenPoint(Worker.position + Vector3.up * 1.05f);
                        selected = centre.z > GameCamera.nearClipPlane && centre.z < GameCamera.farClipPlane && SelectionRect.Contains(centre);
                        LastSelectionHit = selected ? "Worker (box)" : "empty box";
                    }
                    else
                    {
                        Ray ray = GameCamera.ScreenPointToRay(pointer);
                        selected = Physics.Raycast(ray, out RaycastHit hit, 300f) && hit.collider != null && hit.collider.transform == Worker;
                        LastSelectionHit = hit.collider == null ? "none" : hit.collider.name;
                    }
                    selectionPressed = boxSelecting = false;
                }
            }
            if (Navigation != null) Navigation.Selecting = selectionPressed;

            if (inside && !selectionPressed && selected && Input.GetMouseButtonDown(1))
            {
                Ray ray = GameCamera.ScreenPointToRay(Input.mousePosition);
                if (animationDriver != null) animationDriver.Preview("Gameplay");
                if (Physics.Raycast(ray, out RaycastHit targetHit, 300f) &&
                    targetHit.collider.GetComponentInParent<WoodcuttingTarget>() is WoodcuttingTarget tree)
                {
                    SetChoppingTarget(tree);
                    destination = tree.ApproachPoint(Worker.position, WorkPositionExclusions);
                    if (Ground.Raycast(new Ray(destination + Vector3.up * 45f, Vector3.down),
                        out RaycastHit surface, 100f)) destination.y = surface.point.y;
                    hasDestination = true;
                }
                else if (Ground.Raycast(ray, out RaycastHit hit, 300f))
                {
                    SetChoppingTarget(null);
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

        }

        private void OnGUI()
        {
            if (boxSelecting && Event.current.type == EventType.Repaint)
            {
                Rect rect = SelectionRect;
                rect.y = Screen.height - rect.yMax;
                Color previousColour = GUI.color;
                GUI.color = new Color(.62f, .83f, .36f, .14f);
                GUI.DrawTexture(rect, Texture2D.whiteTexture);
                GUI.color = new Color(.72f, .91f, .45f, .95f);
                GUI.DrawTexture(new Rect(rect.x, rect.y, rect.width, 2f), Texture2D.whiteTexture);
                GUI.DrawTexture(new Rect(rect.x, rect.yMax - 2f, rect.width, 2f), Texture2D.whiteTexture);
                GUI.DrawTexture(new Rect(rect.x, rect.y, 2f, rect.height), Texture2D.whiteTexture);
                GUI.DrawTexture(new Rect(rect.xMax - 2f, rect.y, 2f, rect.height), Texture2D.whiteTexture);
                GUI.color = previousColour;
            }
            // The WebGL host already displays control hints below the canvas.
            // Preserve the in-game hints only for native desktop builds.
            if (Application.platform == RuntimePlatform.WebGLPlayer) return;
            var previous = GUI.color;
            GUI.color = new Color(.11f, .17f, .14f, .84f);
            GUI.DrawTexture(new Rect(16, 16, 348, 78), Texture2D.whiteTexture);
            GUI.color = Color.white;
            GUI.Label(new Rect(28, 22, 330, 24), "Orcbands  ·  Unity forest preview");
            GUI.Label(new Rect(28, 47, 330, 20),
                "Select: click/drag    Move/chop: right-click");
            GUI.Label(new Rect(28, 67, 330, 20),
                "Mouse edges: pan · Wheel: zoom · Q/E: rotate · R: reset · F: fog");
            GUI.color = previous;
        }
    }
}
