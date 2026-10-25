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
            data = session.Snapshot(); data.version = 99;
            Reject(session, data, "unsupported version");
            data = session.Snapshot(); data.cameraOffset = new Vector3(float.NaN, 0, 0);
            Reject(session, data, "nonfinite camera");
            var node = session.Shadows.Trees[0];
            node.RestoreResource(3);
            if (node.RemainingWood != 3 || node.TakeWood() != 1 || node.RemainingWood != 2) throw new Exception("Restored tree supply is incorrect");
            node.RestoreResource(12);
            Debug.Log("GAME_SAVE_CHECKS: PASS roundtrip, partial resource, invalid totals, bounds, version and nonfinite guard");
        }
        private static void Reject(GameSession session, GameSaveData data, string label)
        {
            try { session.Parse(JsonUtility.ToJson(data)); }
            catch (ArgumentException) { return; }
            throw new Exception("Save validation accepted " + label);
        }
    }
}
