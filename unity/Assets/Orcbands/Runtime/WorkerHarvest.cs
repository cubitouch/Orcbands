using System.Collections.Generic;
using UnityEngine;

namespace Orcbands
{
    /// <summary>Owns chopping strikes and the session's immediately collected wood.</summary>
    public sealed class WorkerHarvest : MonoBehaviour
    {
        public OrcbandsController Controller;
        public TreeChopEffects Effects;
        public ForestShadowMap Shadows;
        public WorkerHarvest Shared;
        public StoneMiningTarget[] Mines;
        private WorkerHarvest Ledger => Shared == null ? this : Shared;
        private int localWood, localStone;
        public int Stone => Ledger.localStone;
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
        private Object tracked;
        private WorkerAnimation driver;
        private float proxyTime;
        public int Wood => Ledger.localWood;
        public int DepletedTrees { get; private set; }
        public string LastDepletedTree { get; private set; } = "";
        public Vector3 LastStumpPosition { get; private set; }
        public WoodcuttingTarget LastTarget { get; private set; }
        public int StrikeCount { get; private set; }
        private GUIStyle counterStyle, detailStyle, panelStyle;

        public void RestoreCounters(int wood)
        {
            Ledger.localWood = wood; StrikeCount = wood; DepletedTrees = 0;
            LastDepletedTree = ""; LastTarget = null; LastStumpPosition = Vector3.zero;
            cursor.Reset(); tracked = null; proxyTime = 0f;
            foreach (var tree in Shadows.Trees) if (tree.IsDepleted) {
                DepletedTrees++; LastDepletedTree = tree.name;
                LastStumpPosition = tree.transform.position; LastTarget = tree;
            }
        }
        public void RestoreStone(int value) { Ledger.localStone = value; ResetStrike(); }
        public void ResetStrike() { cursor.Reset(); tracked = null; proxyTime = 0f; }
        private void LateUpdate()
        {
            var tree = Controller == null ? null : Controller.ChoppingTarget;
            var rock = Controller == null ? null : Controller.MiningTarget;
            if (Controller == null || Controller.Worker == null) return;
            if (driver == null) driver = Controller.Worker.GetComponent<WorkerAnimation>();
            if ((tree == null && rock == null) || (tree != null && tree.IsDepleted) || (rock != null && rock.IsDepleted) || Controller.IsMoving ||
                (driver != null && driver.Reviewing))
            { cursor.Reset(); tracked = null; proxyTime = 0f; return; }
            Object resource = tree != null ? (Object)tree : rock;
            if (tracked != resource) { cursor.Reset(); tracked = resource; proxyTime = 0f; }
            float phase;
            if (driver != null && driver.Body != null)
            {
                var state = driver.Body.GetCurrentAnimatorStateInfo(0);
                if (driver.Current != WorkerAnimation.Mode.Chopping || !state.IsName("Chopping") || driver.Body.IsInTransition(0))
                { cursor.Reset(); return; }
                phase = state.normalizedTime;
            }
            else { phase = proxyTime / ProxySwingSeconds; proxyTime += Time.deltaTime; }
            if (cursor.Advance(phase)) { if (rock != null) ApplyMiningStrike(rock, phase); else ApplyStrike(tree, phase); }
        }

        private void ApplyStrike(WoodcuttingTarget tree, float phase)
        {
            int amount = tree.TakeWood();
            if (amount == 0) return;
            Ledger.localWood += amount; StrikeCount++; LastTarget = tree; Ledger.LastTarget = tree;
            if (Effects != null && Effects.isActiveAndEnabled) Effects.PlayStrike(tree, phase);
            if (!tree.IsDepleted) return;
            tree.ShowStump();
            // Keep the stump solid, but release the former crown's space.
            var obstacles = Controller.Pathfinder.Obstacles;
            var footprint = obstacles[tree.ObstacleIndex];
            footprint.radius = tree.StumpRadius; obstacles[tree.ObstacleIndex] = footprint;
            Controller.Pathfinder.Rebuild();
            if (Shadows != null) Shadows.RemoveCanopy(tree);
            Ledger.DepletedTrees++; Ledger.LastDepletedTree = tree.name; Ledger.LastStumpPosition = tree.transform.position;
            foreach (var member in Controller.Band) if (member.ChoppingTarget == tree) member.FinishTree();
            cursor.Reset(); tracked = null;
        }

        private void ApplyMiningStrike(StoneMiningTarget rock, float phase)
        {
            int amount = rock.TakeStone();
            if (amount == 0) return;
            Ledger.localStone += amount;
            if (Effects != null && Effects.isActiveAndEnabled) Effects.PlayMiningStrike(rock, phase);
            if (!rock.IsDepleted) return;
            rock.RestoreResource(0);
            foreach (var member in Controller.Band) if (member.MiningTarget == rock) member.FinishTree();
            ResetStrike();
        }

        // Local continuation follows the depleted node, never a global resource search.
        public const float NearbyResourceRadius = 6f;
        public const float NearbyTravelLimit = 12f;
        public bool TryContinueNearby(WoodcuttingTarget tree, StoneMiningTarget rock)
        {
            if (tree != null && tree.IsDepleted && Shadows != null && Shadows.Trees != null)
                return TryNearby(Shadows.Trees, tree.transform.position,
                    candidate => !candidate.IsDepleted, candidate => Controller.CommandTree(candidate));
            if (rock != null && rock.IsDepleted && Mines != null)
                return TryNearby(Mines, rock.transform.position,
                    candidate => !candidate.IsDepleted, candidate => Controller.CommandMine(candidate));
            return false;
        }
        private bool TryNearby<T>(T[] resources, Vector3 origin, System.Func<T, bool> available,
            System.Func<T, bool> command) where T : MonoBehaviour
        {
            var nearby = new List<T>();
            foreach (var candidate in resources) {
                if (candidate == null || !candidate.isActiveAndEnabled || !available(candidate)) continue;
                if ((WorkerNavigation.Flat(candidate.transform.position) - WorkerNavigation.Flat(origin)).sqrMagnitude
                    <= NearbyResourceRadius * NearbyResourceRadius) nearby.Add(candidate);
            }
            nearby.Sort((a, b) => {
                int distance = (WorkerNavigation.Flat(a.transform.position) - WorkerNavigation.Flat(origin)).sqrMagnitude.CompareTo(
                    (WorkerNavigation.Flat(b.transform.position) - WorkerNavigation.Flat(origin)).sqrMagnitude);
                return distance != 0 ? distance : string.CompareOrdinal(a.name, b.name);
            });
            foreach (var candidate in nearby) {
                // Use the ordinary path/slot reservation and tool equip commands.
                // A nearby centre behind a long obstacle detour is not local work.
                if (command(candidate) && Controller.PlannedTravelDistance <= NearbyTravelLimit) return true;
                Controller.CancelWorkerCommand();
            }
            return false;
        }

        private void OnGUI()
        {
            if (Shared != null) return;
            if (counterStyle == null)
            {
                panelStyle = new GUIStyle(GUI.skin.box);
                counterStyle = new GUIStyle(GUI.skin.label) { fontSize = 18, fontStyle = FontStyle.Bold };
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
            var rock = Controller == null ? null : Controller.MiningTarget;
            GUI.Box(new Rect(14, 14, 228, 126), GUIContent.none, panelStyle);
            GUI.Label(new Rect(26, 20, 110, 30), "Wood  " + Wood, counterStyle);
            GUI.Label(new Rect(138, 20, 104, 30), "Stone  " + Stone, counterStyle);
            GUI.Label(new Rect(26, 50, 208, 22), "Band: 3 / 6 · right-click to work", detailStyle);
            string task = "Shift-click: add/remove orcs";
            int selected = 0;
            if (Controller.Band != null) foreach (var member in Controller.Band) if (member.IsWorkerSelected) {
                selected++;
                if (member.ChoppingTarget != null) task = "Tree: " + member.ChoppingTarget.RemainingWood + " / 12 wood";
                if (member.MiningTarget != null) task = "Outcrop: " + member.MiningTarget.Remaining + " / 24 stone";
            }
            GUI.Label(new Rect(26, 72, 208, 22), task, detailStyle);
            GUI.Label(new Rect(26, 94, 208, 22), selected + " selected · drag to select the band", detailStyle);
            GUI.matrix = matrix;
        }
    }
}

