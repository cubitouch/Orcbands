using System.Collections.Generic;
using UnityEngine;

namespace Orcbands
{
    /// <summary>RTS selection, obstacle-aware movement and tree-chopping commands.</summary>
    public sealed class OrcbandsController : MonoBehaviour
    {
        public Transform Worker;
        public OrcbandsController[] Band;
        public int BandIndex;
        public bool OwnsInput => BandIndex == 0;
        public StoneMiningTarget MiningTarget { get; private set; }
        public bool IsWorking => chopTarget != null || MiningTarget != null;
        public Vector3 ResourcePosition => MiningTarget != null ? MiningTarget.transform.position : chopTarget.transform.position;
        private WorkerTools tools;
        private float blockedFor;
        public const float UnitSpacing = 1.3f;
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
        public WorkerNavigation Pathfinder;
        private readonly List<Vector3> route = new List<Vector3>();
        private int waypoint, routeRevision;
        private float feedbackUntil;
        private string bandFeedback;
        public string LastCommandResult { get; private set; } = "Ready";
        public int RemainingWaypoints => hasDestination ? route.Count - waypoint : 0;
        public Vector3 Destination => destination;
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
        private void Start() { animationDriver = Worker.GetComponent<WorkerAnimation>(); tools = Worker.GetComponent<WorkerTools>(); }
        public void RestoreSelection(bool value)
        {
            selected = value;
            if (SelectionRing != null) {
                SelectionRing.gameObject.SetActive(selected);
                SelectionRing.position = Worker.position + new Vector3(0f, .045f, 0f);
            }
        }
        public void CancelWorkerCommand()
        {
            hasDestination = false;
            route.Clear(); waypoint = 0; blockedFor = 0f;
            MiningTarget = null; SetChoppingTarget(null);
            if (animationDriver != null) animationDriver.Request(WorkerAnimation.Mode.Idle);
        }

        public bool CommandMove(Vector3 point)
        {
            CancelWorkerCommand();
            if (Pathfinder == null || !Pathfinder.TryMoveRoute(Worker.position, point, route, out bool adjusted)) return RejectCommand();
            if (!WorkSlotClear(route[route.Count - 1])) {
                bool found = false;
                for (int i = 0; i < 48 && !found; i++) {
                    float angle = i * 2.399f;
                    Vector3 nearby = point + new Vector3(Mathf.Sin(angle), 0f, Mathf.Cos(angle)) * (1.6f + i / 12);
                    found = Pathfinder.TryMoveRoute(Worker.position, nearby, route, out bool snapped) && WorkSlotClear(route[route.Count - 1]);
                }
                if (!found) return RejectCommand();
                adjusted = true;
            }
            BeginRoute(null, adjusted ? "Moving to nearby clear ground" : "Moving");
            return true;
        }
        public bool CommandTree(WoodcuttingTarget tree)
        {
            CancelWorkerCommand();
            if (tree == null || tree.IsDepleted || Pathfinder == null) return RejectCommand();
            var candidates = new List<Vector3>();
            tree.WorkPoints(Worker.position, WorkPositionExclusions, candidates);
            ReserveWorkPoints(candidates);
            if (candidates.Count == 0) return RejectCommand("No free work position · clear space or choose another target");
            if (!Pathfinder.TryRoute(Worker.position, candidates, route)) return RejectCommand();
            if (tools == null) tools = Worker.GetComponent<WorkerTools>();
            if (tools != null) tools.Equip(false);
            BeginRoute(tree, "Approaching tree");
            return true;
        }
        public bool CommandMine(StoneMiningTarget rock)
        {
            CancelWorkerCommand();
            if (rock == null || rock.IsDepleted || Pathfinder == null) return RejectCommand();
            var candidates = new List<Vector3>();
            rock.WorkPoints(Worker.position, WorkPositionExclusions, candidates);
            ReserveWorkPoints(candidates);
            if (candidates.Count == 0) return RejectCommand("No free work position · clear space or choose another target");
            if (!Pathfinder.TryRoute(Worker.position, candidates, route)) return RejectCommand();
            MiningTarget = rock;
            if (tools == null) tools = Worker.GetComponent<WorkerTools>();
            if (tools != null) tools.Equip(true);
            BeginRoute(null, "Approaching stone outcrop");
            return true;
        }
        private void ReserveWorkPoints(List<Vector3> points)
        {
            if (Band == null) return;
            points.RemoveAll(point => !WorkSlotClear(point));
        }
        private bool WorkSlotClear(Vector3 point)
        {
            if (Band == null) return true;
            foreach (var other in Band) {
                if (other == this) continue;
                Vector3 reserved = other.IsMoving ? other.Destination : other.Worker.position;
                if (Vector2.Distance(WorkerNavigation.Flat(point), WorkerNavigation.Flat(reserved)) < UnitSpacing + .1f) return false;
            }
            return true;
        }
        public bool UnitStepClear(Vector3 start, Vector3 end)
        {
            if (Band == null) return true;
            Vector2 a = WorkerNavigation.Flat(start), b = WorkerNavigation.Flat(end), ab = b - a;
            foreach (var other in Band) {
                if (other == this) continue;
                Vector2 centre = WorkerNavigation.Flat(other.Worker.position);
                float t = ab.sqrMagnitude < .000001f ? 0f : Mathf.Clamp01(Vector2.Dot(centre - a, ab) / ab.sqrMagnitude);
                if ((a + ab * t - centre).sqrMagnitude < UnitSpacing * UnitSpacing) return false;
            }
            return true;
        }
        private void BeginRoute(WoodcuttingTarget tree, string message)
        {
            waypoint = 0; hasDestination = route.Count > 0;
            destination = hasDestination ? route[route.Count - 1] : Worker.position;
            routeRevision = Pathfinder.Revision;
            SetChoppingTarget(tree);
            Feedback(message);
        }
        public void FinishTree()
        {
            CancelWorkerCommand();
            Feedback("Resource exhausted · choose another target", 4f);
        }

        private bool RejectCommand(string message = "No clear route to that destination")
        {
            CancelWorkerCommand();
            Feedback(message);
            return false;
        }

        private void Feedback(string message, float duration = 3f)
        {
            LastCommandResult = message;
            var owner = Band == null ? this : Band[0];
            owner.bandFeedback = (OwnsInput ? "" : Worker.name + ": ") + message;
            owner.feedbackUntil = Time.time + duration;
        }

        private void SetChoppingTarget(WoodcuttingTarget tree)
        {
            chopTarget = tree;
            if (TreeTargetRing == null) return;
            TreeTargetRing.gameObject.SetActive(tree != null || MiningTarget != null);
            if (!IsWorking) return;
            if (Ground.Raycast(new Ray(ResourcePosition + Vector3.up * 45f, Vector3.down),
                out RaycastHit surface, 100f))
                TreeTargetRing.position = surface.point + Vector3.up * .055f;
        }

        private void Update()
        {
            if (Worker == null || GameCamera == null || Ground == null) return;
            // Review/debug control; the six static light sources remain the
            // baseline until gameplay-driven exploration is implemented.
            if (OwnsInput && Reveal != null && Input.GetKeyDown(KeyCode.F))
                Reveal.SetFogOfWar(!Reveal.FogOfWarVisible);

            if (OwnsInput) HandleBandInput();
            if (IsWorking && (chopTarget != null && chopTarget.IsDepleted || MiningTarget != null && MiningTarget.IsDepleted)) FinishTree();

            if (hasDestination && Pathfinder.Revision != routeRevision)
            {
                // Future construction/felling rebuilds invalidate outstanding routes.
                if (chopTarget != null) CommandTree(chopTarget);
                else if (MiningTarget != null) CommandMine(MiningTarget);
                else CommandMove(destination);
            }
            float remaining = MoveSpeed * Time.deltaTime;
            while (hasDestination && remaining > 0f)
            {
                Vector3 flat = route[waypoint] - Worker.position;
                flat.y = 0f;
                float distance = flat.magnitude;
                float step = Mathf.Min(distance, remaining);
                Vector3 next = distance < .000001f ? Worker.position : Worker.position + flat / distance * step;
                // A swept check covers the entire step, even after a slow frame.
                if (!Pathfinder.SegmentClear(Worker.position, next) ||
                    !Ground.Raycast(new Ray(new Vector3(next.x, 45f, next.z), Vector3.down), out RaycastHit elevation, 100f))
                { RejectCommand(); break; }
                if (!UnitStepClear(Worker.position, next))
                {
                    blockedFor += Time.deltaTime;
                    Vector3 side = Vector3.Cross(Vector3.up, flat.normalized);
                    bool moved = false;
                    foreach (float sign in new[] { 1f, -1f }) {
                        Vector3 detour = Worker.position + (side * sign + flat.normalized * .2f).normalized * Mathf.Min(remaining, .12f);
                        if (Pathfinder.SegmentClear(Worker.position, detour) && UnitStepClear(Worker.position, detour) &&
                            Ground.Raycast(new Ray(detour + Vector3.up * 45f, Vector3.down), out RaycastHit floor, 100f)) {
                            detour.y = floor.point.y; Worker.position = detour; moved = true; break;
                        }
                    }
                    if (!moved && blockedFor > 5f) {
                        CancelWorkerCommand(); Feedback("Route occupied · give a new order", 4f);
                    }
                    break;
                }
                blockedFor = 0f;
                next.y = elevation.point.y;
                Worker.position = next;
                if (distance > .000001f) Worker.rotation = Quaternion.LookRotation(flat / distance, Vector3.up);
                remaining -= step;
                if (distance <= step)
                {
                    waypoint++;
                    if (waypoint >= route.Count)
                    {
                        hasDestination = false;
                        LastCommandResult = MiningTarget != null ? "Mining" : chopTarget == null ? "Arrived" : "Chopping";
                    }
                }
            }

            if (!hasDestination && IsWorking)
            {
                Vector3 facing = Vector3.ProjectOnPlane(ResourcePosition - Worker.position, Vector3.up);
                if (facing.sqrMagnitude > .01f) Worker.rotation = Quaternion.LookRotation(facing, Vector3.up);
            }
            if (animationDriver != null) animationDriver.Request(hasDestination ? WorkerAnimation.Mode.Walking
                : IsWorking ? WorkerAnimation.Mode.Chopping : WorkerAnimation.Mode.Idle);

            if (SelectionRing != null)
            {
                SelectionRing.gameObject.SetActive(selected);
                SelectionRing.position = Worker.position + new Vector3(0f, .045f, 0f);
            }

        }

        private void HandleBandInput()
        {
            var members = Band ?? new[] { this };
            Vector3 pointer = Input.mousePosition;
            bool inside = pointer.x >= 0f && pointer.x < Screen.width && pointer.y >= 0f && pointer.y < Screen.height;
            if (Application.platform == RuntimePlatform.WebGLPlayer && Navigation != null) inside &= Navigation.PointerInsideCanvas;
            if (inside && Input.GetMouseButtonDown(0)) { selectionStart = pointer; selectionPressed = true; boxSelecting = false; }
            if (selectionPressed) {
                if (Vector2.Distance(selectionStart, pointer) >= 6f) boxSelecting = true;
                if (Input.GetMouseButtonUp(0)) {
                    bool additive = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
                    Transform hitUnit = null;
                    if (!boxSelecting && Physics.Raycast(GameCamera.ScreenPointToRay(pointer), out RaycastHit hit, 300f)) hitUnit = hit.collider.transform;
                    foreach (var member in members) {
                        Vector3 screen = GameCamera.WorldToScreenPoint(member.Worker.position + Vector3.up * 1.05f);
                        bool picked = boxSelecting ? screen.z > GameCamera.nearClipPlane && screen.z < GameCamera.farClipPlane && SelectionRect.Contains(screen) : hitUnit == member.Worker;
                        member.RestoreSelection(additive ? (picked ? !member.selected : member.selected) : picked);
                    }
                    LastSelectionHit = boxSelecting ? "Band (box)" : hitUnit == null ? "none" : hitUnit.name;
                    selectionPressed = boxSelecting = false;
                }
            }
            if (Navigation != null) Navigation.Selecting = selectionPressed;
            if (!inside || selectionPressed || !Input.GetMouseButtonDown(1)) return;
            var chosen = new List<OrcbandsController>();
            foreach (var member in members) if (member.selected) chosen.Add(member);
            if (chosen.Count == 0) return;
            Ray ray = GameCamera.ScreenPointToRay(pointer);
            Physics.Raycast(ray, out RaycastHit resourceHit, 300f);
            var tree = resourceHit.collider == null ? null : resourceHit.collider.GetComponentInParent<WoodcuttingTarget>();
            var rock = resourceHit.collider == null ? null : resourceHit.collider.GetComponentInParent<StoneMiningTarget>();
            bool hasGround = Ground.Raycast(ray, out RaycastHit groundHit, 300f);
            for (int i = 0; i < chosen.Count; i++) {
                var member = chosen[i];
                var driver = member.Worker.GetComponent<WorkerAnimation>();
                if (driver != null) driver.Preview("Gameplay");
                if (tree != null) member.CommandTree(tree);
                else if (rock != null) member.CommandMine(rock);
                else if (hasGround) {
                    Vector3 point = groundHit.point;
                    // One member retains exact click behavior; a group receives spaced goals.
                    if (chosen.Count > 1) point += GameCamera.transform.right * ((i - (chosen.Count - 1) * .5f) * 1.7f);
                    member.CommandMove(point);
                }
            }
        }

        private void OnGUI()
        {
            if (!OwnsInput) return;
            if (Time.time < feedbackUntil)
            {
                GUI.Box(new Rect(Screen.width / 2f - 170f, Screen.height - 46f, 340f, 28f), bandFeedback ?? LastCommandResult);
            }
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
            GUI.DrawTexture(new Rect(16, Screen.height - 138, 348, 78), Texture2D.whiteTexture);
            GUI.color = Color.white;
            GUI.Label(new Rect(28, Screen.height - 132, 330, 24), "Orcbands  ·  Unity forest preview");
            GUI.Label(new Rect(28, Screen.height - 107, 330, 20),
                "Select: click/drag    Move/chop: right-click");
            GUI.Label(new Rect(28, Screen.height - 87, 330, 20),
                "Mouse edges: pan · Wheel: zoom · Q/E: rotate · R: reset · F: fog");
            GUI.color = previous;
        }
    }
}

