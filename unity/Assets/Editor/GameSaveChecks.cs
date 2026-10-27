using System;
using UnityEngine;
namespace Orcbands.Editor
{
    public static class GameSaveChecks
    {
        public static void Run()
        {
            var session = UnityEngine.Object.FindFirstObjectByType<GameSession>();
            var data = session.Snapshot();
            string json = JsonUtility.ToJson(data);
            session.Parse(json);
            data.trees[0] -= 4; data.wood = 4;
            session.Parse(JsonUtility.ToJson(data));
            data.wood = 5;
            Reject(session, data, "inconsistent wood");
            data.wood = 4; data.worker = new Vector3(999, 0, 0);
            Reject(session, data, "out-of-bounds worker");
            data = session.Snapshot(); data.worker += Vector3.up * 5f;
            Reject(session, data, "worker above the ground");
            data = session.Snapshot(); data.version = 99;
            Reject(session, data, "unsupported version");
            data = session.Snapshot(); data.cameraOffset = new Vector3(float.NaN, 0, 0);
            Reject(session, data, "nonfinite camera");
            // Navigation accepts exact clear endpoints up to halfExtent - body clearance.
            // Saving must accept those same positions rather than rounding the bound down.
            var edge = session.Snapshot(); edge.trees = new int[0]; edge.wood = 0;
            edge.version = 1; edge.target = -1; edge.order = "idle";
            var noTrees = new WoodcuttingTarget[0]; var noObstacles = new WorkerNavigation.Footprint[0];
            foreach (var point in new[] { new Vector3(109.35f, 0f, 0f), new Vector3(-109.35f, 0f, 0f),
                new Vector3(0f, 0f, 109.35f), new Vector3(0f, 0f, -109.35f),
                new Vector3(109.38f, 0f, 0f), new Vector3(-109.38f, 0f, 0f),
                new Vector3(0f, 0f, 109.38f), new Vector3(0f, 0f, -109.38f) }) {
                edge.worker = point; edge.Validate(noTrees, noObstacles);
            }
            edge.worker = new Vector3(109.39f, 0f, 0f);
            bool rejectedEdge = false;
            try { edge.Validate(noTrees, noObstacles); } catch (ArgumentException) { rejectedEdge = true; }
            if (!rejectedEdge) throw new Exception("Save accepted a worker outside navigation bounds");
            var node = session.Shadows.Trees[0];
            node.RestoreResource(3);
            if (node.RemainingWood != 3 || node.TakeWood() != 1 || node.RemainingWood != 2) throw new Exception("Restored tree supply is incorrect");
            node.RestoreResource(12);
            Debug.Log("GAME_SAVE_CHECKS: PASS roundtrip, partial resource, invalid totals, bounds (including exact reachable map edges), version and nonfinite guard");
        }
        private static void Reject(GameSession session, GameSaveData data, string label)
        {
            try { session.Parse(JsonUtility.ToJson(data)); }
            catch (ArgumentException) { return; }
            throw new Exception("Save validation accepted " + label);
        }
    }
}

