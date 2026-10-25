using UnityEngine;

namespace Orcbands
{
    /// <summary>Owns chopping strikes and the session's immediately collected wood.</summary>
    public sealed class WorkerHarvest : MonoBehaviour
    {
        public OrcbandsController Controller;
        public TreeChopEffects Effects;
        public ForestShadowMap Shadows;
        public const float HitPhase = .39f;
        public const float ProxySwingSeconds = 2.2666669f / 1.5f;
        public struct SwingCursor
        {
            private bool tracking;
            private float previous;
            public void Reset() { tracking = false; }
            public bool Advance(float normalizedTime)
            {
                if (!tracking || normalizedTime < previous)
                { tracking = true; previous = normalizedTime; return false; }
                bool hit = Mathf.FloorToInt(normalizedTime - HitPhase) > Mathf.FloorToInt(previous - HitPhase);
                previous = normalizedTime;
                // No duplicate strikes or catch-up burst after a suspended/slow frame.
                return hit;
            }
        }
        private SwingCursor cursor;
        private WoodcuttingTarget tracked;
        private WorkerAnimation driver;
        private float proxyTime;
        public int Wood { get; private set; }
        public int DepletedTrees { get; private set; }
        public string LastDepletedTree { get; private set; } = "";
        public Vector3 LastStumpPosition { get; private set; }
        public WoodcuttingTarget LastTarget { get; private set; }
        public int StrikeCount { get; private set; }
        private GUIStyle counterStyle, detailStyle, panelStyle;

        public void RestoreCounters(int wood)
        {
            Wood = wood; StrikeCount = wood; DepletedTrees = 0;
            LastDepletedTree = ""; LastTarget = null; LastStumpPosition = Vector3.zero;
            cursor.Reset(); tracked = null; proxyTime = 0f;
            foreach (var tree in Shadows.Trees) if (tree.IsDepleted) {
                DepletedTrees++; LastDepletedTree = tree.name;
                LastStumpPosition = tree.transform.position; LastTarget = tree;
            }
        }
        private void LateUpdate()
        {
            var tree = Controller == null ? null : Controller.ChoppingTarget;
            if (Controller == null || Controller.Worker == null) return;
            if (driver == null) driver = Controller.Worker.GetComponent<WorkerAnimation>();
            if (tree == null || tree.IsDepleted || Controller.IsMoving ||
                (driver != null && driver.Reviewing))
            { cursor.Reset(); tracked = null; proxyTime = 0f; return; }
            if (tracked != tree) { cursor.Reset(); tracked = tree; proxyTime = 0f; }
            float phase;
            if (driver != null && driver.Body != null)
            {
                var state = driver.Body.GetCurrentAnimatorStateInfo(0);
                if (driver.Current != WorkerAnimation.Mode.Chopping || !state.IsName("Chopping") || driver.Body.IsInTransition(0))
                { cursor.Reset(); return; }
                phase = state.normalizedTime;
            }
            else { phase = proxyTime / ProxySwingSeconds; proxyTime += Time.deltaTime; }
            if (cursor.Advance(phase)) ApplyStrike(tree, phase);
        }

        private void ApplyStrike(WoodcuttingTarget tree, float phase)
        {
            int amount = tree.TakeWood();
            if (amount == 0) return;
            Wood += amount; StrikeCount++; LastTarget = tree;
            if (Effects != null && Effects.isActiveAndEnabled) Effects.PlayStrike(tree, phase);
            if (!tree.IsDepleted) return;
            tree.ShowStump();
            // Keep the stump solid, but release the former crown's space.
            var obstacles = Controller.Pathfinder.Obstacles;
            var footprint = obstacles[tree.ObstacleIndex];
            footprint.radius = tree.StumpRadius; obstacles[tree.ObstacleIndex] = footprint;
            Controller.Pathfinder.Rebuild();
            if (Shadows != null) Shadows.RemoveCanopy(tree);
            DepletedTrees++; LastDepletedTree = tree.name; LastStumpPosition = tree.transform.position;
            Controller.FinishTree(); cursor.Reset(); tracked = null;
        }

        private void OnGUI()
        {
            if (counterStyle == null)
            {
                panelStyle = new GUIStyle(GUI.skin.box);
                counterStyle = new GUIStyle(GUI.skin.label) { fontSize = 21, fontStyle = FontStyle.Bold };
                counterStyle.normal.textColor = new Color(.82f, .91f, .65f);
                detailStyle = new GUIStyle(GUI.skin.label) { fontSize = 12 };
                detailStyle.normal.textColor = new Color(.82f, .87f, .77f);
            }
            // Native GUI uses render pixels, including WebGL's device pixel ratio.
            // A reference viewport preserves apparent size on Retina displays;
            // the width limit also keeps the panel inside narrow canvases.
            float scale = Mathf.Min(Screen.height / 560f, Screen.width / 256f);
            var matrix = GUI.matrix;
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1f));
            var tree = Controller == null ? null : Controller.ChoppingTarget;
            GUI.Box(new Rect(14, 14, 228, tree == null ? 68 : 90), GUIContent.none, panelStyle);
            GUI.Label(new Rect(26, 20, 208, 30), "Wood  " + Wood, counterStyle);
            GUI.Label(new Rect(26, 50, 208, 22), "Collected as you chop", detailStyle);
            if (tree != null)
                GUI.Label(new Rect(26, 72, 208, 22), "Tree: " + tree.RemainingWood + " / " + WoodcuttingTarget.WoodPerTree + " wood", detailStyle);
            GUI.matrix = matrix;
        }
    }
}
