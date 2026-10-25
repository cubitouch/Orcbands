using System;
using System.Runtime.InteropServices;
using UnityEngine;

namespace Orcbands
{
    /// <summary>Owns session transitions and validates complete snapshots before applying them.</summary>
    [DefaultExecutionOrder(500)]
    public sealed class GameSession : MonoBehaviour
    {
        public OrcbandsController Controller;
        public WorkerHarvest Harvest;
        public ForestShadowMap Shadows;
        public TreeChopEffects Effects;
        public bool Running { get; private set; }
        public bool Started { get; private set; }
        public float Elapsed { get; private set; }
        private WorkerNavigation.Footprint[] baseline;
        private GameSaveData initial;
        private WorkerAnimation animationDriver;
        private float nextSave;
        private int savedWood = -1;
        private string nativeMessage = "";
        [Serializable] private class Command { public string id, action, json; }
        [Serializable] private class Reply { public string id, message, snapshot; public bool ok, started, running; }
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] private static extern void OrcbandsSessionEvent(string json);
#endif
        private void Start()
        {
            baseline = (WorkerNavigation.Footprint[])Controller.Pathfinder.Obstacles.Clone();
            animationDriver = Controller.Worker.GetComponent<WorkerAnimation>();
            initial = Snapshot();
            SetRunning(false);
#if UNITY_WEBGL && !UNITY_EDITOR
            WebGLInput.captureAllKeyboardInput = false;
#endif
            ReplyTo("ready", true, "Ready");
        }
        public GameSaveData Snapshot()
        {
            var data = new GameSaveData {
                version = 1, map = "forest-2302-v1", wood = Harvest.Wood,
                trees = new int[Shadows.Trees.Length], elapsed = Elapsed,
                worker = Controller.Worker.position, forward = Controller.Worker.forward,
                focus = Controller.Navigation.Focus,
                cameraOffset = Controller.Navigation.View.transform.position - Controller.Navigation.Focus,
                selected = Controller.IsWorkerSelected, fog = Controller.Reveal.FogOfWarVisible,
                order = Controller.ChoppingTarget != null ? "chop" : Controller.IsMoving ? "move" : "idle",
                target = Array.IndexOf(Shadows.Trees, Controller.ChoppingTarget), destination = Controller.Destination
            };
            for (int i = 0; i < data.trees.Length; i++) data.trees[i] = Shadows.Trees[i].RemainingWood;
            return data;
        }
        public GameSaveData Parse(string json)
        {
            if (string.IsNullOrEmpty(json) || json.Length > 131072) throw new ArgumentException("Invalid save file size.");
            var data = JsonUtility.FromJson<GameSaveData>(json);
            if (data == null) throw new ArgumentException("The save is empty.");
            data.Validate(Shadows.Trees, baseline ?? Controller.Pathfinder.Obstacles);
            return data;
        }
        private void SetRunning(bool value)
        {
            Running = value;
            Controller.CancelPointer("");
            Controller.enabled = Harvest.enabled = Controller.Navigation.enabled = value;
            if (Effects != null) Effects.enabled = value;
            if (animationDriver != null && animationDriver.Body != null) animationDriver.Body.speed = value ? 1f : 0f;
        }
        private string Apply(GameSaveData data)
        {
            SetRunning(false); Controller.CancelWorkerCommand();
            Controller.Pathfinder.Obstacles = (WorkerNavigation.Footprint[])baseline.Clone();
            for (int i = 0; i < data.trees.Length; i++) {
                var tree = Shadows.Trees[i]; tree.RestoreResource(data.trees[i]);
                if (tree.IsDepleted) {
                    var o = Controller.Pathfinder.Obstacles[tree.ObstacleIndex]; o.radius = tree.StumpRadius;
                    Controller.Pathfinder.Obstacles[tree.ObstacleIndex] = o;
                }
            }
            Controller.Pathfinder.Rebuild(); Shadows.RestoreResources(); Harvest.RestoreCounters(data.wood);
            Controller.Worker.position = data.worker;
            Controller.Worker.rotation = Quaternion.LookRotation(Vector3.ProjectOnPlane(data.forward, Vector3.up).normalized, Vector3.up);
            Controller.Navigation.RestoreView(data.focus, data.cameraOffset);
            Controller.RestoreSelection(data.selected); Controller.Reveal.SetFogOfWar(data.fog);
            Physics.SyncTransforms();
            if (animationDriver != null) { animationDriver.Preview("Gameplay"); animationDriver.Request(WorkerAnimation.Mode.Idle); }
            bool restored = data.order == "chop" ? Controller.CommandTree(Shadows.Trees[data.target])
                : data.order == "move" ? Controller.CommandMove(data.destination) : true;
            Elapsed = data.elapsed; Started = true; nextSave = Elapsed + 10f; savedWood = data.wood;
            SetRunning(true);
            return restored ? "Camp restored." : "Camp restored. The worker needs a new order.";
        }
        public void SessionCommand(string json)
        {
            string id = "";
            try {
                if (baseline == null) throw new InvalidOperationException("The valley is still loading.");
                var command = JsonUtility.FromJson<Command>(json); id = command.id;
                string message = "";
                switch (command.action) {
                    case "new": message = Apply(initial); break;
                    case "load": message = Apply(Parse(command.json)); break;
                    case "validate": Parse(command.json); message = "Valid save."; break;
                    case "pause": SetRunning(false); message = "Paused"; break;
                    case "resume": if (!Started) throw new InvalidOperationException("Start or load a camp first."); SetRunning(true); break;
                    case "snapshot": if (!Started) throw new InvalidOperationException("Start or load a camp first."); break;
                    default: throw new ArgumentException("Unknown session command.");
                }
                ReplyTo(id, true, message, command.action == "snapshot" || command.action == "pause" && Started);
            } catch (Exception e) { ReplyTo(id, false, e.Message); }
        }
        private void ReplyTo(string id, bool ok, string message, bool snapshot = false)
        {
            var reply = new Reply { id = id, ok = ok, message = message, started = Started, running = Running,
                snapshot = snapshot ? JsonUtility.ToJson(Snapshot()) : null };
#if UNITY_WEBGL && !UNITY_EDITOR
            OrcbandsSessionEvent(JsonUtility.ToJson(reply));
#endif
        }
        private void LateUpdate()
        {
            if (!Running) return;
            Elapsed += Time.deltaTime;
            if (Harvest.Wood != savedWood || Elapsed >= nextSave) {
                savedWood = Harvest.Wood; nextSave = Elapsed + 10f;
                ReplyTo("autosave", true, "", true);
            }
        }
        private void OnApplicationFocus(bool focused)
        {
            if (focused || !Running) return;
            SetRunning(false); ReplyTo("suspended", true, "Paused", true);
        }
        private void Update()
        {
#if !UNITY_WEBGL || UNITY_EDITOR
            if (Input.GetKeyDown(KeyCode.Escape) && Started) SetRunning(!Running);
#endif
        }
        private void OnGUI()
        {
#if !UNITY_WEBGL || UNITY_EDITOR
            if (Running) return;
            GUILayout.BeginArea(new Rect(Screen.width/2f-160, Screen.height/2f-160, 320, 320), GUI.skin.box);
            GUILayout.Label("ORCBANDS  ·  A place to call home");
            if (Started && GUILayout.Button("Resume")) SetRunning(true);
            if (GUILayout.Button("New Game")) Apply(initial);
            if (PlayerPrefs.HasKey("orcbands.save.v1") && GUILayout.Button("Load Game")) {
                try { nativeMessage = Apply(Parse(PlayerPrefs.GetString("orcbands.save.v1"))); }
                catch (Exception e) { nativeMessage = e.Message; }
            }
            if (Started && GUILayout.Button("Save Game")) {
                PlayerPrefs.SetString("orcbands.save.v1", JsonUtility.ToJson(Snapshot())); PlayerPrefs.Save(); nativeMessage = "Camp saved.";
            }
            GUILayout.Label(nativeMessage); GUILayout.EndArea();
#endif
        }
    }
}
