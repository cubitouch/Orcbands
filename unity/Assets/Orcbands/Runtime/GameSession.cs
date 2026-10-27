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
        private int savedWood = -1, savedStone = -1;
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
                version = 2, map = "forest-2302-v1", wood = Harvest.Wood, stone = Harvest.Stone,
                mines = new int[Harvest.Mines.Length], companions = new BandSaveData[2],
                trees = new int[Shadows.Trees.Length], elapsed = Elapsed,
                worker = Controller.Worker.position, forward = Controller.Worker.forward,
                focus = Controller.Navigation.Focus,
                cameraOffset = Controller.Navigation.View.transform.position - Controller.Navigation.Focus,
                selected = Controller.IsWorkerSelected, fog = Controller.Reveal.FogOfWarVisible,
                order = Order(Controller),
                target = Target(Controller), destination = Controller.Destination, miningTool = Tool(Controller)
            };
            for (int i = 0; i < data.trees.Length; i++) data.trees[i] = Shadows.Trees[i].RemainingWood;
            for (int i = 0; i < data.mines.Length; i++) data.mines[i] = Harvest.Mines[i].Remaining;
            for (int i = 0; i < 2; i++) data.companions[i] = UnitSnapshot(Controller.Band[i + 1]);
            return data;
        }
        private static string Order(OrcbandsController member) => member.MiningTarget != null ? "mine" : member.ChoppingTarget != null ? "chop" : member.IsMoving ? "move" : "idle";
        private int Target(OrcbandsController member) => member.MiningTarget != null ? Array.IndexOf(Harvest.Mines, member.MiningTarget) : Array.IndexOf(Shadows.Trees, member.ChoppingTarget);
        private static bool Tool(OrcbandsController member) => member.Worker.GetComponent<WorkerTools>()?.Mining ?? false;
        private BandSaveData UnitSnapshot(OrcbandsController member) => new BandSaveData {
            worker = member.Worker.position, forward = member.Worker.forward, destination = member.Destination,
            selected = member.IsWorkerSelected, order = Order(member), target = Target(member), miningTool = Tool(member)
        };
        public GameSaveData Parse(string json)
        {
            if (string.IsNullOrEmpty(json) || json.Length > 131072) throw new ArgumentException("Invalid save file size.");
            var data = JsonUtility.FromJson<GameSaveData>(json);
            if (data == null) throw new ArgumentException("The save is empty.");
            data.Validate(Shadows.Trees, baseline ?? Controller.Pathfinder.Obstacles, Harvest.Mines);
            ValidateGround(data.worker);
            if (data.version == 1) UpgradeLegacy(data);
            foreach (var member in data.companions) ValidateGround(member.worker);
            return data;
        }
        private void UpgradeLegacy(GameSaveData data)
        {
            // Preflight migration before changing any live object, including on Validate.
            var obstacles = (WorkerNavigation.Footprint[])(baseline ?? Controller.Pathfinder.Obstacles).Clone();
            for (int i = 0; i < data.trees.Length; i++) if (data.trees[i] == 0) {
                var obstacle = obstacles[Shadows.Trees[i].ObstacleIndex]; obstacle.radius = Shadows.Trees[i].StumpRadius;
                obstacles[Shadows.Trees[i].ObstacleIndex] = obstacle;
            }
            data.companions = new BandSaveData[2];
            for (int i = 0; i < 2; i++) {
                bool found = false;
                var unit = new BandSaveData { forward = Vector3.forward, order = "idle", target = -1 };
                for (int attempt = 0; attempt < 240 && !found; attempt++) {
                    float angle = attempt * 2.399f;
                    Vector3 candidate = data.worker + new Vector3(Mathf.Sin(angle), 0f, Mathf.Cos(angle)) * (2f + attempt / 24);
                    if (Vector2.Distance(WorkerNavigation.Flat(candidate), WorkerNavigation.Flat(data.worker)) < OrcbandsController.UnitSpacing + .1f) continue;
                    if (i > 0 && Vector2.Distance(WorkerNavigation.Flat(candidate), WorkerNavigation.Flat(data.companions[0].worker)) < OrcbandsController.UnitSpacing + .1f) continue;
                    if (!Controller.Ground.Raycast(new Ray(new Vector3(candidate.x,45f,candidate.z), Vector3.down), out RaycastHit floor, 100f)) continue;
                    unit.worker = floor.point;
                    try { data.ValidateUnit(unit, obstacles); found = true; } catch (ArgumentException) { }
                }
                if (!found) throw new ArgumentException("No safe place for the new companions.");
                data.companions[i] = unit;
            }
            data.mines = new int[Harvest.Mines.Length];
            for (int i = 0; i < data.mines.Length; i++) data.mines[i] = StoneMiningTarget.StonePerOutcrop;
            data.stone = 0; data.miningTool = false; data.version = 2;
            data.Validate(Shadows.Trees, baseline ?? Controller.Pathfinder.Obstacles, Harvest.Mines);
        }
        private void ValidateGround(Vector3 point)
        {
            if (!Controller.Ground.Raycast(new Ray(new Vector3(point.x, 45f, point.z), Vector3.down), out RaycastHit ground, 100f) || Mathf.Abs(point.y - ground.point.y) > .1f)
                throw new ArgumentException("The saved worker is not on the ground.");
        }
        private void SetRunning(bool value)
        {
            Running = value;
            Controller.CancelPointer("");
            Controller.Navigation.enabled = value;
            foreach (var member in Controller.Band) {
                member.enabled = value; member.GetComponent<WorkerHarvest>().enabled = value;
                var effect = member.GetComponent<TreeChopEffects>(); if (effect != null) effect.enabled = value;
                var driver = member.Worker.GetComponent<WorkerAnimation>(); if (driver != null && driver.Body != null) driver.Body.speed = value ? 1f : 0f;
            }
        }
        private string Apply(GameSaveData data)
        {
            SetRunning(false); foreach (var member in Controller.Band) member.CancelWorkerCommand();
            Controller.Pathfinder.Obstacles = (WorkerNavigation.Footprint[])baseline.Clone();
            for (int i = 0; i < data.trees.Length; i++) {
                var tree = Shadows.Trees[i]; tree.RestoreResource(data.trees[i]);
                if (tree.IsDepleted) {
                    var o = Controller.Pathfinder.Obstacles[tree.ObstacleIndex]; o.radius = tree.StumpRadius;
                    Controller.Pathfinder.Obstacles[tree.ObstacleIndex] = o;
                }
            }
            Controller.Pathfinder.Rebuild(); Shadows.RestoreResources(); Harvest.RestoreCounters(data.wood);
            for (int i = 0; i < Harvest.Mines.Length; i++) Harvest.Mines[i].RestoreResource(data.version == 1 ? StoneMiningTarget.StonePerOutcrop : data.mines[i]);
            Harvest.RestoreStone(data.version == 1 ? 0 : data.stone);
            Controller.Navigation.RestoreView(data.focus, data.cameraOffset); Controller.Reveal.SetFogOfWar(data.fog);
            var units = new BandSaveData[3]; units[0] = data.Leader();
            for (int i = 1; i < 3; i++) units[i] = data.version == 1 ? JsonUtility.FromJson<BandSaveData>(JsonUtility.ToJson(initial.companions[i - 1])) : data.companions[i - 1];
            for (int i = 0; i < 3; i++) {
                var member = Controller.Band[i]; var unit = units[i];
                member.Worker.position = unit.worker;
                member.Worker.rotation = Quaternion.LookRotation(Vector3.ProjectOnPlane(unit.forward, Vector3.up).normalized, Vector3.up);
                member.RestoreSelection(unit.selected); member.GetComponent<WorkerHarvest>().ResetStrike();
                var driver = member.Worker.GetComponent<WorkerAnimation>();
                if (driver != null) { driver.Preview("Gameplay"); driver.Request(WorkerAnimation.Mode.Idle); }
                member.Worker.GetComponent<WorkerTools>()?.Equip(unit.miningTool);
            }
            Physics.SyncTransforms();
            bool restored = true;
            for (int i = 0; i < 3; i++) {
                var member = Controller.Band[i]; var unit = units[i];
                bool ok = unit.order == "chop" ? member.CommandTree(Shadows.Trees[unit.target])
                    : unit.order == "mine" ? member.CommandMine(Harvest.Mines[unit.target])
                    : unit.order == "move" ? member.CommandMove(unit.destination) : true;
                restored &= ok;
            }
            Elapsed = data.elapsed; Started = true; nextSave = Elapsed + 10f; savedWood = data.wood; savedStone = Harvest.Stone;
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
            if (Harvest.Wood != savedWood || Harvest.Stone != savedStone || Elapsed >= nextSave) {
                savedWood = Harvest.Wood; savedStone = Harvest.Stone; nextSave = Elapsed + 10f;
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

