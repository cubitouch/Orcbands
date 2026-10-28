using System;
using System.Collections.Generic;
using UnityEngine;
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
            foreach (var member in leader.Band) {
                Require(leader.Pathfinder.IsClear(member.Worker.position), "blocked spawn");
                Require(member.GetComponent<WorkerHarvest>().Wood == 0 && member.GetComponent<WorkerHarvest>().Stone == 0, "shared initial counters");
                var tools = member.Worker.GetComponent<WorkerTools>();
                Require(tools != null && tools.Axe != null && tools.Pickaxe != null, "both tools present");
                tools.Equip(true); Require(!tools.Axe.activeSelf && tools.Pickaxe.activeSelf, "pickaxe equip");
                tools.Equip(false); Require(tools.Axe.activeSelf && !tools.Pickaxe.activeSelf, "axe equip");
            }
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
            Debug.Log("BAND_MINING_CHECKS: PASS three orcs, tools, separate work reservations, finite stone, depleted art, save migration/overlap guards, tree-cleared corridor");
        }
    }
}
