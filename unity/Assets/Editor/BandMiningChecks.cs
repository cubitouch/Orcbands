using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
namespace Orcbands.Editor
{
    public static class BandMiningChecks
    {
        private static void Require(bool value, string message)
        { if (!value) throw new InvalidOperationException("Band/mining regression: " + message); }
        public static void Run()
        {
            var session = UnityEngine.Object.FindFirstObjectByType<GameSession>();
            var leader = session.Controller;
            Require(leader.Band.Length == 3, "three starting orcs");
            var modelSources = new HashSet<string>();
            foreach (var member in leader.Band) {
                var presentation = member.Worker.GetComponent<CharacterPresentation>();
                Require(presentation.StartingRole == member.BandIndex, "stable distinct band appearance");
                var model = presentation.ReviewRoles[presentation.StartingRole];
                int visibleModels = 0;
                foreach (var role in presentation.ReviewRoles) if (role.gameObject.activeSelf) visibleModels++;
                Require(visibleModels == 1 && model.gameObject.activeSelf, "exactly one chosen model visible");
                var source = PrefabUtility.GetCorrespondingObjectFromSource(model.gameObject);
                if (source != null) {
                    modelSources.Add(AssetDatabase.GetAssetPath(source));
                    var animation = member.Worker.GetComponent<WorkerAnimation>();
                    Require(animation != null && animation.Body.transform == model && animation.Body.avatar.isValid &&
                        animation.Body.avatar.isHuman && !animation.Body.applyRootMotion, "selected character has its own valid animated rig");
                }
                Require(leader.Pathfinder.IsClear(member.Worker.position), "blocked spawn");
                Require(member.GetComponent<WorkerHarvest>().Wood == 0 && member.GetComponent<WorkerHarvest>().Stone == 0, "shared initial counters");
                var tools = member.Worker.GetComponent<WorkerTools>();
                Require(tools != null && tools.Axe != null && tools.Pickaxe != null, "both tools present");
                Require(tools.Axe.transform.IsChildOf(model) && tools.Pickaxe.transform.IsChildOf(model), "tools belong to the visible model");
                if (source != null) Require(tools.Axe.transform.parent.parent.name == "hand_r", "visible character holds tools in its right hand");
                tools.Equip(true); Require(!tools.Axe.activeSelf && tools.Pickaxe.activeSelf, "pickaxe equip");
                tools.Equip(false); Require(tools.Axe.activeSelf && !tools.Pickaxe.activeSelf, "axe equip");
            }
            if (Environment.GetEnvironmentVariable("ORCBANDS_REQUIRE_PRIVATE_ASSETS") == "1")
                Require(modelSources.Count == 3, "three distinct purchased Synty prefabs");
            // A moving bandmate is not a permanent wall at its old position.
            Require(leader.CommandMove(new Vector3(5.02f,0f,4.38f)), "leader accepts group destination");
            Require(leader.Band[1].CommandMove(new Vector3(3.7f,0f,3.3f)), "second orc accepts group destination after leader moves");
            Require(leader.Band[2].CommandMove(new Vector3(2.38f,0f,2.22f)), "third orc accepts group destination after peers move");
            foreach (var member in leader.Band) member.CancelWorkerCommand();
            var mine = session.Harvest.Mines[0];
            Require(leader.CommandMine(mine) && leader.MiningTarget == mine, "reachable mining order");
            Require(leader.Worker.GetComponent<WorkerTools>().Mining, "mining order equips pickaxe");
            // The authored quarry initially has one camp-side work spot. Other
            // miners must reject safely until the player cuts an access path.
            bool secondAccepted = leader.Band[1].CommandMine(mine);
            if (secondAccepted) Require(Vector2.Distance(WorkerNavigation.Flat(leader.Destination), WorkerNavigation.Flat(leader.Band[1].Destination)) >= OrcbandsController.UnitSpacing, "miners overlap at crowded quarry");
            else Require(!leader.Band[1].IsMoving && !leader.Band[1].IsWorking, "rejected miner retained a stale order");
            var originalObstacles = (WorkerNavigation.Footprint[])leader.Pathfinder.Obstacles.Clone();
            foreach (var tree in session.Shadows.Trees) if (Vector3.Distance(tree.transform.position, mine.transform.position) < 7f) {
                var footprint = leader.Pathfinder.Obstacles[tree.ObstacleIndex]; footprint.radius = tree.StumpRadius;
                leader.Pathfinder.Obstacles[tree.ObstacleIndex] = footprint;
            }
            leader.Pathfinder.Rebuild();
            Require(leader.Band[1].CommandMine(mine), "clearing trees opens another quarry work position");
            Require(Vector2.Distance(WorkerNavigation.Flat(leader.Destination), WorkerNavigation.Flat(leader.Band[1].Destination)) >= OrcbandsController.UnitSpacing, "miners reserve distinct work spots");
            leader.Pathfinder.Obstacles = originalObstacles; leader.Pathfinder.Rebuild();
            foreach (var member in leader.Band) member.CancelWorkerCommand();
            bool treeReachable = false;
            foreach (var tree in session.Shadows.Trees) if (Vector3.Distance(tree.transform.position, leader.Worker.position) < 15f && leader.CommandTree(tree)) { treeReachable = true; break; }
            Require(treeReachable && !leader.Worker.GetComponent<WorkerTools>().Mining, "tree order restores axe");
            leader.CancelWorkerCommand();
            int total = 0;
            for (int i = 0; i < StoneMiningTarget.StonePerOutcrop + 6; i++) total += mine.TakeStone();
            Require(total == 24 && mine.Remaining == 0 && mine.TakeStone() == 0, "finite shared outcrop");
            mine.RestoreResource(0); Require(!mine.Full.activeSelf && mine.Depleted.activeSelf, "depleted rock art");
            mine.RestoreResource(24);
            foreach (var member in leader.Band) { member.Worker.GetComponent<WorkerTools>().Equip(false); member.RestoreSelection(false); }
            var traffic = new GameObject("Band passage check");
            try {
                var nav = traffic.AddComponent<WorkerNavigation>(); nav.MapHalfExtent = 6f; nav.Rebuild();
                var a = traffic.AddComponent<OrcbandsController>(); var b = new GameObject("Idle bandmate").AddComponent<OrcbandsController>();
                b.transform.SetParent(traffic.transform); a.Worker = new GameObject("Moving worker").transform; a.Worker.SetParent(traffic.transform);
                b.Worker = new GameObject("Yielding worker").transform; b.Worker.SetParent(traffic.transform);
                a.Worker.position = new Vector3(-1.5f,0f,0f); b.Worker.position = Vector3.zero;
                a.Pathfinder = b.Pathfinder = nav; a.Band = b.Band = new[] { a, b }; b.BandIndex = 1;
                Require(a.CommandMove(new Vector3(3f,0f,0f)), "passage test route");
                Require(a.RequestSpace() && b.IsMoving && Mathf.Abs(b.Destination.z) > 1.5f, "idle orc moves aside on a planned route");
                Require(nav.IsClear(b.Destination), "yield destination is clear of scenery");
            } finally { UnityEngine.Object.DestroyImmediate(traffic); }
            var data = session.Snapshot(); data.stone = 3; data.mines[0] -= 3;
            session.Parse(JsonUtility.ToJson(data));
            data.companions[0].worker = data.worker;
            bool rejected = false;
            try { session.Parse(JsonUtility.ToJson(data)); } catch (ArgumentException) { rejected = true; }
            Require(rejected, "overlapping imported band rejected");
            data = session.Snapshot(); data.version = 1; data.companions = null; data.mines = null;
            var upgraded = session.Parse(JsonUtility.ToJson(data));
            Require(upgraded.version == 2 && upgraded.companions.Length == 2 && upgraded.stone == 0, "v1 migration");
            // A tree-lined choke is sealed by standing crowns, then opens around the solid stump cores.
            var fixture = new GameObject("Tree clearing corridor check");
            try {
                var nav = fixture.AddComponent<WorkerNavigation>(); nav.MapHalfExtent = 4f;
                nav.Obstacles = new[] {
                    new WorkerNavigation.Footprint { z = 1f, radius = 1.36f }, new WorkerNavigation.Footprint { z = -1f, radius = 1.36f },
                    new WorkerNavigation.Footprint { z = 3f, halfWidth = .3f, halfDepth = 1f }, new WorkerNavigation.Footprint { z = -3f, halfWidth = .3f, halfDepth = 1f }
                }; nav.Rebuild();
                var route = new List<Vector3>(); var start = new Vector3(-3f,0f,0f); var end = new Vector3(3f,0f,0f);
                Require(!nav.TryMoveRoute(start, end, route, out bool adjusted), "standing crowns seal choke");
                for (int i = 0; i < 2; i++) { var obstacle = nav.Obstacles[i]; obstacle.radius = .265f; nav.Obstacles[i] = obstacle; }
                nav.Rebuild();
                Require(nav.TryMoveRoute(start, end, route, out adjusted) && !adjusted && route.Count == 1, "cutting trees opens direct walking path");
                Require(!nav.IsClear(new Vector3(0f,0f,1f)), "stump core remains solid");
            } finally { UnityEngine.Object.DestroyImmediate(fixture); }
            CheckNearbyContinuation();
            Debug.Log("BAND_MINING_CHECKS: PASS three orcs, tools, separate work reservations, finite stone, depleted art, save migration/overlap guards, tree-cleared corridor");
        }
        private static void CheckNearbyContinuation()
        {
            var fixture = new GameObject("Nearby resource continuation checks");
            try {
                var nav = fixture.AddComponent<WorkerNavigation>(); nav.MapHalfExtent = 24f; nav.Rebuild();
                var controller = fixture.AddComponent<OrcbandsController>();
                controller.Worker = new GameObject("Fixture worker").transform;
                controller.Worker.SetParent(fixture.transform); controller.Worker.position = new Vector3(-2f, 0f, 0f);
                controller.Pathfinder = nav; controller.Band = new[] { controller };
                var tools = controller.Worker.gameObject.AddComponent<WorkerTools>();
                tools.Axe = new GameObject("Fixture axe"); tools.Pickaxe = new GameObject("Fixture pickaxe");
                tools.Axe.transform.SetParent(controller.Worker); tools.Pickaxe.transform.SetParent(controller.Worker);
                var harvest = fixture.AddComponent<WorkerHarvest>(); harvest.Controller = controller;
                var shadows = fixture.AddComponent<ForestShadowMap>(); harvest.Shadows = shadows;
                WoodcuttingTarget Tree(string name, Vector3 at) {
                    var go = new GameObject(name); go.transform.SetParent(fixture.transform); go.transform.position = at;
                    return go.AddComponent<WoodcuttingTarget>();
                }
                StoneMiningTarget Mine(string name, Vector3 at) {
                    var go = new GameObject(name); go.transform.SetParent(fixture.transform); go.transform.position = at;
                    var mine = go.AddComponent<StoneMiningTarget>();
                    mine.Full = new GameObject("Full"); mine.Depleted = new GameObject("Depleted");
                    mine.Full.transform.SetParent(go.transform); mine.Depleted.transform.SetParent(go.transform); return mine;
                }
                var origin = Tree("Depleted origin", Vector3.zero);
                var depleted = Tree("Already depleted", Vector3.right);
                var blocked = Tree("Closest but blocked", Vector3.right * 4f);
                var nearby = Tree("Reachable neighbor", Vector3.forward * 5f);
                var distant = Tree("Too far", Vector3.left * 9f);
                for (int i = 0; i < 12; i++) depleted.TakeWood();
                shadows.Trees = new[] { origin, distant, depleted, blocked, nearby };
                nav.Obstacles = new[] { new WorkerNavigation.Footprint { x = 4f, radius = 3.4f } }; nav.Rebuild();
                Require(controller.CommandTree(origin), "fixture initial tree order");
                for (int i = 0; i < 12; i++) origin.TakeWood();
                controller.FinishTree();
                Require(controller.ChoppingTarget == nearby && !tools.Mining, "continue nearest reachable tree; skip exhausted, blocked and distant nodes");
                controller.CancelWorkerCommand();
                Require(!controller.IsWorking, "manual move/cancel interrupts continuation");
                for (int i = 0; i < 12; i++) nearby.TakeWood();
                controller.CommandTree(nearby); // Rejected exhausted-node order must stay idle.
                Require(!controller.IsWorking, "depleted manual target remains rejected");
                Require(!harvest.TryContinueNearby(origin, null), "stop when no nearby reachable tree remains");
                nav.Obstacles = new WorkerNavigation.Footprint[0]; nav.Rebuild();
                controller.Worker.position = new Vector3(-18f,0f,0f);
                Require(!harvest.TryContinueNearby(origin, null) && !controller.IsWorking, "local center cannot trigger a long walking detour");
                controller.Worker.position = new Vector3(-2f,0f,0f);
                var mineOrigin = Mine("Mine origin", Vector3.zero);
                var nextMine = Mine("Nearby mine", Vector3.right * 4f);
                var farMine = Mine("Distant mine", Vector3.forward * 9f);
                harvest.Mines = new[] { farMine, mineOrigin, nextMine };
                Require(controller.CommandMine(mineOrigin), "fixture initial mine order");
                for (int i = 0; i < 24; i++) mineOrigin.TakeStone();
                controller.FinishTree();
                Require(controller.MiningTarget == nextMine && tools.Mining, "continue nearby stone with pickaxe, never switch to trees");
                for (int i = 0; i < 24; i++) nextMine.TakeStone();
                controller.FinishTree();
                Require(!controller.IsWorking && !controller.IsMoving, "stop when only distant outcrops remain");
                Require(harvest.Wood == 0 && harvest.Stone == 0, "retargeting never awards resources");
            } finally { UnityEngine.Object.DestroyImmediate(fixture); }
        }

    }
}
