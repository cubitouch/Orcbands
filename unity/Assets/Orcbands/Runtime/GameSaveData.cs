using System;
using UnityEngine;

namespace Orcbands
{
    [Serializable] public sealed class BandSaveData
    {
        public Vector3 worker, forward, destination;
        public bool selected, miningTool;
        public string order;
        public int target;
    }
    [Serializable] public sealed class GameSaveData
    {
        public int version;
        public string map;
        public int wood, stone;
        public int[] trees, mines;
        public BandSaveData[] companions;
        public float elapsed;
        // Keep the original worker fields for v1 migration and existing diagnostics.
        public Vector3 worker, forward, focus, cameraOffset, destination;
        public bool selected, fog, miningTool;
        public string order;
        public int target;
        public static bool Finite(float n) => !float.IsNaN(n) && !float.IsInfinity(n);
        private static bool Finite(Vector3 v) => Finite(v.x) && Finite(v.y) && Finite(v.z);
        private static void Require(bool value, string message)
        { if (!value) throw new ArgumentException(message); }
        public BandSaveData Leader() => new BandSaveData { worker = worker, forward = forward, destination = destination,
            selected = selected, order = order, target = target, miningTool = miningTool };
        public void Validate(WoodcuttingTarget[] nodes, WorkerNavigation.Footprint[] baseline)
            => Validate(nodes, baseline, new StoneMiningTarget[0]);
        public void Validate(WoodcuttingTarget[] nodes, WorkerNavigation.Footprint[] baseline, StoneMiningTarget[] quarries)
        {
            Require((version == 1 || version == 2) && map == "forest-2302-v1", "This save belongs to an unsupported version or map.");
            Require(trees != null && trees.Length == nodes.Length, "The tree inventory is incomplete.");
            int total = 0;
            var obstacles = (WorkerNavigation.Footprint[])baseline.Clone();
            for (int i = 0; i < trees.Length; i++) {
                Require(trees[i] >= 0 && trees[i] <= WoodcuttingTarget.WoodPerTree, "Invalid tree supply.");
                total += WoodcuttingTarget.WoodPerTree - trees[i];
                if (trees[i] == 0) { var o = obstacles[nodes[i].ObstacleIndex]; o.radius = nodes[i].StumpRadius; obstacles[nodes[i].ObstacleIndex] = o; }
            }
            Require(wood == total, "The wood total does not match the forest.");
            if (version == 2) {
                Require(mines != null && mines.Length == quarries.Length, "The stone inventory is incomplete.");
                int mined = 0;
                foreach (int amount in mines) {
                    Require(amount >= 0 && amount <= StoneMiningTarget.StonePerOutcrop, "Invalid outcrop supply.");
                    mined += StoneMiningTarget.StonePerOutcrop - amount;
                }
                Require(stone == mined, "The stone total does not match the outcrops.");
                Require(companions != null && companions.Length == 2, "The starting band is incomplete.");
            }
            Require(Finite(elapsed) && elapsed >= 0 && elapsed < 315360000f, "Invalid played time.");
            Require(Finite(focus) && Mathf.Abs(focus.x) <= 102.01f && Mathf.Abs(focus.z) <= 102.01f && Mathf.Abs(focus.y) < .01f, "Invalid camera focus.");
            Require(Finite(cameraOffset) && cameraOffset.magnitude >= 23.9f && cameraOffset.magnitude <= 55.1f && cameraOffset.y > 8f, "Invalid camera distance.");
            ValidateUnit(Leader(), obstacles);
            if (version == 2) {
                for (int i = 0; i < companions.Length; i++) {
                    ValidateUnit(companions[i], obstacles);
                    Require(Vector2.Distance(WorkerNavigation.Flat(worker), WorkerNavigation.Flat(companions[i].worker)) >= OrcbandsController.UnitSpacing - .01f, "Saved band members overlap.");
                    for (int j = 0; j < i; j++) Require(Vector2.Distance(WorkerNavigation.Flat(companions[j].worker), WorkerNavigation.Flat(companions[i].worker)) >= OrcbandsController.UnitSpacing - .01f, "Saved band members overlap.");
                }
            }
        }
        public void ValidateUnit(BandSaveData unit, WorkerNavigation.Footprint[] obstacles)
        {
            Require(unit != null, "Missing band member.");
            Vector3 position = unit.worker;
            Require(Finite(position) && Mathf.Abs(position.x) <= 110f - WorkerNavigation.Clearance && Mathf.Abs(position.z) <= 110f - WorkerNavigation.Clearance && Mathf.Abs(position.y) < 20f, "Invalid worker position.");
            Require(Finite(unit.forward) && Vector3.ProjectOnPlane(unit.forward, Vector3.up).sqrMagnitude > .1f && unit.forward.sqrMagnitude < 2f, "Invalid worker facing.");
            Require(unit.order == "idle" || unit.order == "move" || unit.order == "chop" || version == 2 && unit.order == "mine", "Unknown worker order.");
            if (unit.order == "mine") Require(mines != null && unit.target >= 0 && unit.target < mines.Length && mines[unit.target] > 0, "Invalid mining target.");
            else Require(unit.target >= -1 && unit.target < trees.Length && (unit.order != "chop" || unit.target >= 0 && trees[unit.target] > 0), "Invalid chopping target.");
            Require(Finite(unit.destination) && Mathf.Abs(unit.destination.x) <= 110f && Mathf.Abs(unit.destination.z) <= 110f && Mathf.Abs(unit.destination.y) < 20f, "Invalid destination.");
            foreach (var o in obstacles) {
                float x = position.x - o.x, z = position.z - o.z;
                if (o.halfWidth > 0) {
                    float c = Mathf.Cos(o.angle), s = Mathf.Sin(o.angle);
                    float xx = c * x - s * z, zz = s * x + c * z;
                    Require(Mathf.Abs(xx) > o.halfWidth + .63f || Mathf.Abs(zz) > o.halfDepth + .63f, "The saved worker is inside a building.");
                } else Require(x*x + z*z >= (o.radius + .63f)*(o.radius + .63f) - .0001f, "The saved worker is inside an obstacle.");
            }
        }
    }
}
