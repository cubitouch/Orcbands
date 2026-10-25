using System;
using UnityEngine;

namespace Orcbands
{
    [Serializable] public sealed class GameSaveData
    {
        public int version;
        public string map;
        public int wood;
        public int[] trees;
        public float elapsed;
        public Vector3 worker, forward, focus, cameraOffset, destination;
        public bool selected, fog;
        public string order;
        public int target;

        public static bool Finite(float n) => !float.IsNaN(n) && !float.IsInfinity(n);
        private static bool Finite(Vector3 v) => Finite(v.x) && Finite(v.y) && Finite(v.z);
        private static void Require(bool value, string message)
        { if (!value) throw new ArgumentException(message); }
        public void Validate(WoodcuttingTarget[] nodes, WorkerNavigation.Footprint[] baseline)
        {
            Require(version == 1 && map == "forest-2302-v1", "This save belongs to an unsupported version or map.");
            Require(trees != null && trees.Length == nodes.Length, "The tree inventory is incomplete.");
            int total = 0;
            var obstacles = (WorkerNavigation.Footprint[])baseline.Clone();
            for (int i = 0; i < trees.Length; i++) {
                Require(trees[i] >= 0 && trees[i] <= WoodcuttingTarget.WoodPerTree, "Invalid tree supply.");
                total += WoodcuttingTarget.WoodPerTree - trees[i];
                if (trees[i] == 0) { var o = obstacles[nodes[i].ObstacleIndex]; o.radius = nodes[i].StumpRadius; obstacles[nodes[i].ObstacleIndex] = o; }
            }
            Require(wood == total, "The wood total does not match the forest.");
            Require(Finite(elapsed) && elapsed >= 0 && elapsed < 315360000f, "Invalid played time.");
            Require(Finite(worker) && Mathf.Abs(worker.x) <= 110f - WorkerNavigation.Clearance && Mathf.Abs(worker.z) <= 110f - WorkerNavigation.Clearance && Mathf.Abs(worker.y) < 20f, "Invalid worker position.");
            Require(Finite(forward) && Vector3.ProjectOnPlane(forward, Vector3.up).sqrMagnitude > .1f && forward.sqrMagnitude < 2f, "Invalid worker facing.");
            Require(Finite(focus) && Mathf.Abs(focus.x) <= 102.01f && Mathf.Abs(focus.z) <= 102.01f && Mathf.Abs(focus.y) < .01f, "Invalid camera focus.");
            Require(Finite(cameraOffset) && cameraOffset.magnitude >= 23.9f && cameraOffset.magnitude <= 55.1f && cameraOffset.y > 8f, "Invalid camera distance.");
            Require(order == "idle" || order == "move" || order == "chop", "Unknown worker order.");
            Require(target >= -1 && target < trees.Length && (order != "chop" || (target >= 0 && trees[target] > 0)), "Invalid chopping target.");
            Require(Finite(destination) && Mathf.Abs(destination.x) <= 110f && Mathf.Abs(destination.z) <= 110f && Mathf.Abs(destination.y) < 20f, "Invalid destination.");
            // Match navigation's circle and expanded oriented-box clearance before touching the live map.
            foreach (var o in obstacles) {
                float x = worker.x - o.x, z = worker.z - o.z;
                if (o.halfWidth > 0) {
                    float c = Mathf.Cos(o.angle), s = Mathf.Sin(o.angle);
                    float xx = c * x - s * z, zz = s * x + c * z;
                    Require(Mathf.Abs(xx) > o.halfWidth + .63f || Mathf.Abs(zz) > o.halfDepth + .63f, "The saved worker is inside a building.");
                } else Require(x*x + z*z >= (o.radius + .63f)*(o.radius + .63f) - .0001f, "The saved worker is inside an obstacle.");
            }
        }
    }
}
