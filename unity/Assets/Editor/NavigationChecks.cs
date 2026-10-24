using System;
using System.Collections.Generic;
using UnityEngine;

namespace Orcbands.Editor
{
    /// <summary>Executable C# regressions, run before every player build.</summary>
    public static class NavigationChecks
    {
        private static void Require(bool condition, string message)
        {
            if (!condition) throw new InvalidOperationException("Navigation regression: " + message);
        }
        private static Vector3 P(float x, float z) => new Vector3(x, 0f, z);
        private static void CheckRoute(WorkerNavigation nav, Vector3 start, List<Vector3> route)
        {
            Require(route.Count > 0, "empty successful route");
            foreach (var point in route)
            {
                Require(nav.SegmentClear(start, point), "route cuts an inflated footprint");
                start = point;
            }
        }
        public static void Run()
        {
            var go = new GameObject("Navigation regression fixture");
            try
            {
                var nav = go.AddComponent<WorkerNavigation>();
                nav.MapHalfExtent = 12f;
                var route = new List<Vector3>();
                nav.Rebuild();
                Require(nav.TryMoveRoute(P(-4, 0), P(4, 0), route, out bool adjusted) && !adjusted && route.Count == 1, "open direct route");
                nav.Obstacles = new[] { new WorkerNavigation.Footprint { radius = 1.5f } }; nav.Rebuild();
                Require(!nav.SegmentClear(P(-4, 0), P(4, 0)), "swept collision tunnels through circle");
                Require(nav.TryMoveRoute(P(-4, 0), P(4, 0), route, out adjusted) && route.Count > 1, "circle detour");
                CheckRoute(nav, P(-4, 0), route);
                // Independent analytic distance on every returned segment.
                Vector2 previous = new Vector2(-4, 0);
                foreach (var p in route)
                {
                    Vector2 next = WorkerNavigation.Flat(p), delta = next - previous;
                    float t = delta.sqrMagnitude == 0f ? 0f : Mathf.Clamp01(-Vector2.Dot(previous, delta) / delta.sqrMagnitude);
                    Require((previous + t * delta).magnitude > 1.5f + WorkerNavigation.Clearance, "circle clearance lost in smoothing: " + previous.ToString("R") + " -> " + next.ToString("R") + " distance=" + (previous + t * delta).magnitude.ToString("R"));
                    previous = next;
                }
                Require(nav.TryMoveRoute(P(-4, 0), P(0, 0), route, out adjusted) && adjusted, "blocked click projects locally");
                CheckRoute(nav, P(-4, 0), route);
                Require(nav.IsClear(route[route.Count - 1]), "projected destination remains blocked");
                nav.Obstacles = new[] { new WorkerNavigation.Footprint { halfWidth = 2f, halfDepth = 1f, angle = .7f } }; nav.Rebuild();
                Require(!nav.SegmentClear(P(-4, 0), P(4, 0)), "rotated building collision");
                Require(nav.TryMoveRoute(P(-4, 0), P(4, 0), route, out adjusted), "rotated building detour");
                CheckRoute(nav, P(-4, 0), route);
                // Wall spans the entire map; no diagonal or boundary escape is legal.
                nav.Obstacles = new[] { new WorkerNavigation.Footprint { halfWidth = .4f, halfDepth = 14f } }; nav.Rebuild();
                Require(!nav.TryMoveRoute(P(-4, 0), P(4, 0), route, out adjusted) && route.Count == 0, "sealed region must reject");
                Require(nav.TryRoute(P(-4, 0), new List<Vector3> { P(4, 0), P(-4, 4) }, route), "alternate reachable work goal");
                Require(Vector3.Distance(route[route.Count - 1], P(-4, 4)) < .001f, "wrong work endpoint");
                // Two wall halves leave a gap narrower than the worker diameter.
                nav.Obstacles = new[] {
                    new WorkerNavigation.Footprint { z = -7f, halfWidth = .4f, halfDepth = 6.5f },
                    new WorkerNavigation.Footprint { z = 7f, halfWidth = .4f, halfDepth = 6.5f }
                }; nav.Rebuild();
                Require(!nav.TryMoveRoute(P(-4, 0), P(4, 0), route, out adjusted), "tight gap permits corner cutting");
                nav.Obstacles[0].halfDepth = 5f; nav.Obstacles[1].halfDepth = 5f; nav.Rebuild();
                Require(nav.TryMoveRoute(P(-4, 0), P(4, 0), route, out adjusted), "wide gap is unnecessarily blocked");
                CheckRoute(nav, P(-4, 0), route);
                Require(!nav.IsClear(P(12, 0)), "map-edge worker clearance");
                Require(nav.TryMoveRoute(P(-4, 0), P(500, 0), route, out adjusted) && adjusted, "outside command clamps to map");
                CheckRoute(nav, P(-4, 0), route);
                Require(!nav.TryMoveRoute(P(12, 0), P(4, 0), route, out adjusted), "blocked start must not teleport");
            }
            finally { UnityEngine.Object.DestroyImmediate(go); }

            var controller = UnityEngine.Object.FindFirstObjectByType<OrcbandsController>();
            var sceneNav = controller.Pathfinder;
            var paths = new List<Vector3>();
            Require(sceneNav.IsClear(controller.Worker.position), "worker spawns inside an obstacle");
            Require(sceneNav.ObstacleCount >= 1220, "expanded forest footprints absent");
            // The hut lies between these two clear points, requiring an actual detour.
            Require(sceneNav.TryMoveRoute(P(3f, 1.2f), P(0f, -9f), paths, out bool moved), "actual hut detour missing");
            Require(paths.Count > 1, "actual hut still permits a straight crossing");
            CheckRoute(sceneNav, P(3f, 1.2f), paths);
            int reached = 0;
            foreach (var tree in UnityEngine.Object.FindObjectsByType<WoodcuttingTarget>(FindObjectsSortMode.None))
            {
                if (Vector3.Distance(tree.transform.position, controller.Worker.position) > 24f) continue;
                var candidates = new List<Vector3>();
                tree.WorkPoints(controller.Worker.position, controller.WorkPositionExclusions, candidates);
                if (!sceneNav.TryRoute(controller.Worker.position, candidates, paths)) continue;
                CheckRoute(sceneNav, controller.Worker.position, paths);
                Require(Mathf.Abs(WorkerNavigation.Flat(paths[paths.Count - 1] - tree.transform.position).magnitude - tree.StandOff) < .001f,
                    "tree route changed the authored chopping distance");
                if (++reached == 12) break;
            }
            Require(reached == 12, "nearby trees do not have twelve reachable work circles");
            Debug.Log("NAVIGATION_CHECKS: PASS direct/detour/rotated-box/sweep/tight-gap/sealed/alternate-goal/blocked-click/bounds, actual hut and 12 tree approaches");
        }
    }
}
