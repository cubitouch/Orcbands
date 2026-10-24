using System;
using System.Collections.Generic;
using UnityEngine;

namespace Orcbands
{
    /// <summary>Planar worker clearance, A* routes and swept movement checks. No physics impulses/root motion.</summary>
    public sealed class WorkerNavigation : MonoBehaviour
    {
        [Serializable] public struct Footprint
        {
            public float x, z, radius, halfWidth, halfDepth, angle;
        }
        public Footprint[] Obstacles = new Footprint[0];
        public float MapHalfExtent = 110f;
        // The selection capsule is .54m wide in radius; add a small visual margin.
        public const float Clearance = .62f;
        public const float CellSize = .5f;
        private const float BinSize = 4f;
        private float limit;
        private int width, binWidth, query, search;
        private List<int>[] bins;
        private int[] tested, visited, closed, parent;
        private bool[] walkable;
        private float[] cost;
        private readonly List<Entry> heap = new List<Entry>();
        private static readonly int[] DX = { 1, 0, -1, 0, 1, -1, -1, 1 };
        private static readonly int[] DZ = { 0, 1, 0, -1, 1, 1, -1, -1 };
        private struct Entry { public int node; public float score; }
        public int LastExpanded { get; private set; }
        public int ObstacleCount => Obstacles.Length;
        public int Revision { get; private set; }
        public static Vector2 Flat(Vector3 p) => new Vector2(p.x, p.z);
        public static Vector3 World(Vector2 p) => new Vector3(p.x, 0f, p.y);

        /// <summary>Call after changing footprints (e.g. future construction/felling), before accepting commands.</summary>
        public void Rebuild()
        {
            limit = MapHalfExtent - Clearance;
            width = Mathf.FloorToInt(2f * limit / CellSize) + 1;
            binWidth = Mathf.CeilToInt(2f * MapHalfExtent / BinSize) + 1;
            bins = new List<int>[binWidth * binWidth];
            tested = new int[Obstacles.Length]; query = 0;
            for (int i = 0; i < Obstacles.Length; i++)
            {
                var o = Obstacles[i];
                float extent = (o.halfWidth > 0f ? Mathf.Sqrt(o.halfWidth * o.halfWidth + o.halfDepth * o.halfDepth) : o.radius) + Clearance * 1.42f;
                for (int z = Bin(o.z - extent); z <= Bin(o.z + extent); z++)
                    for (int x = Bin(o.x - extent); x <= Bin(o.x + extent); x++)
                    {
                        int index = z * binWidth + x;
                        if (bins[index] == null) bins[index] = new List<int>();
                        bins[index].Add(i);
                    }
            }
            int count = width * width;
            walkable = new bool[count]; cost = new float[count];
            visited = new int[count]; closed = new int[count]; parent = new int[count]; search = 0;
            for (int i = 0; i < count; i++) walkable[i] = SegmentClearUnchecked(Point(i), Point(i));
            Revision++;
        }
        private void EnsureReady() { if (bins == null) Rebuild(); }
        private int Bin(float value) => Mathf.Clamp(Mathf.FloorToInt((value + MapHalfExtent) / BinSize), 0, binWidth - 1);
        private Vector2 Point(int node) => new Vector2(-limit + node % width * CellSize, -limit + node / width * CellSize);
        private bool InBounds(Vector2 p) => Mathf.Abs(p.x) <= limit && Mathf.Abs(p.y) <= limit;
        public bool IsClear(Vector3 point) => SegmentClear(point, point);
        public bool SegmentClear(Vector3 a, Vector3 b)
        {
            EnsureReady();
            return SegmentClearUnchecked(Flat(a), Flat(b));
        }
        private bool SegmentClearUnchecked(Vector2 a, Vector2 b)
        {
            if (!InBounds(a) || !InBounds(b)) return false;
            if (++query == int.MaxValue) { Array.Clear(tested, 0, tested.Length); query = 1; }
            for (int z = Bin(Mathf.Min(a.y, b.y)); z <= Bin(Mathf.Max(a.y, b.y)); z++)
                for (int x = Bin(Mathf.Min(a.x, b.x)); x <= Bin(Mathf.Max(a.x, b.x)); x++)
                {
                    var items = bins[z * binWidth + x];
                    if (items == null) continue;
                    foreach (int i in items)
                    {
                        if (tested[i] == query) continue;
                        tested[i] = query;
                        var o = Obstacles[i];
                        Vector2 centre = new Vector2(o.x, o.z);
                        if (o.halfWidth > 0f)
                        {
                            float c = Mathf.Cos(o.angle), s = Mathf.Sin(o.angle);
                            Vector2 aa = a - centre, bb = b - centre;
                            // Unity yaw: local X = c*X - s*Z, local Z = s*X + c*Z.
                            aa = new Vector2(c * aa.x - s * aa.y, s * aa.x + c * aa.y);
                            bb = new Vector2(c * bb.x - s * bb.y, s * bb.x + c * bb.y);
                            float enter = 0f, leave = 1f;
                            if (Slab(aa.x, bb.x - aa.x, o.halfWidth + Clearance, ref enter, ref leave) &&
                                Slab(aa.y, bb.y - aa.y, o.halfDepth + Clearance, ref enter, ref leave)) return false;
                        }
                        else
                        {
                            Vector2 ab = b - a;
                            float t = ab.sqrMagnitude < .000001f ? 0f : Mathf.Clamp01(Vector2.Dot(centre - a, ab) / ab.sqrMagnitude);
                            float radius = o.radius + Clearance;
                            if ((a + ab * t - centre).sqrMagnitude <= radius * radius) return false;
                        }
                    }
                }
            return true;
        }
        private static bool Slab(float origin, float delta, float extent, ref float enter, ref float leave)
        {
            if (Mathf.Abs(delta) < .000001f) return Mathf.Abs(origin) <= extent;
            float a = (-extent - origin) / delta, b = (extent - origin) / delta;
            enter = Mathf.Max(enter, Mathf.Min(a, b)); leave = Mathf.Min(leave, Mathf.Max(a, b));
            return enter <= leave;
        }
        private List<int> Connectors(Vector2 p)
        {
            var result = new List<int>();
            int cx = Mathf.RoundToInt((p.x + limit) / CellSize), cz = Mathf.RoundToInt((p.y + limit) / CellSize);
            for (int z = Mathf.Max(0, cz - 2); z <= Mathf.Min(width - 1, cz + 2); z++)
                for (int x = Mathf.Max(0, cx - 2); x <= Mathf.Min(width - 1, cx + 2); x++)
                {
                    int n = z * width + x;
                    if (walkable[n] && SegmentClearUnchecked(p, Point(n))) result.Add(n);
                }
            return result;
        }
        public bool TryMoveRoute(Vector3 start, Vector3 requested, List<Vector3> route, out bool adjusted)
        {
            EnsureReady();
            Vector2 goal = Flat(requested);
            goal.x = Mathf.Clamp(goal.x, -limit, limit); goal.y = Mathf.Clamp(goal.y, -limit, limit);
            if (!SegmentClearUnchecked(goal, goal))
            {
                // A click inside scenery snaps only locally. Never silently cross a wall or teleport.
                float best = 4f * 4f;
                int found = -1;
                int cx = Mathf.RoundToInt((goal.x + limit) / CellSize), cz = Mathf.RoundToInt((goal.y + limit) / CellSize);
                for (int z = Mathf.Max(0, cz - 8); z <= Mathf.Min(width - 1, cz + 8); z++)
                    for (int x = Mathf.Max(0, cx - 8); x <= Mathf.Min(width - 1, cx + 8); x++)
                    {
                        int n = z * width + x;
                        float d = (Point(n) - goal).sqrMagnitude;
                        if (walkable[n] && d < best) { best = d; found = n; }
                    }
                if (found < 0) { route.Clear(); adjusted = false; return false; }
                goal = Point(found);
            }
            adjusted = (goal - Flat(requested)).sqrMagnitude > .0001f;
            return TryRoute(start, new List<Vector3> { World(goal) }, route);
        }
        /// <summary>All goals are exact clear endpoints; one search finds a reachable tree work spot.</summary>
        public bool TryRoute(Vector3 start, List<Vector3> goals, List<Vector3> route)
        {
            EnsureReady(); route.Clear(); LastExpanded = 0;
            Vector2 origin = Flat(start);
            if (!SegmentClearUnchecked(origin, origin)) return false;
            var ends = new Dictionary<int, Vector2>();
            var clearGoals = new List<Vector2>();
            foreach (var target in goals)
            {
                Vector2 goal = Flat(target);
                if (!SegmentClearUnchecked(goal, goal)) continue;
                if (SegmentClearUnchecked(origin, goal)) { route.Add(World(goal)); return true; }
                clearGoals.Add(goal);
                foreach (int n in Connectors(goal))
                    if (!ends.ContainsKey(n) || (Point(n) - goal).sqrMagnitude < (Point(n) - ends[n]).sqrMagnitude) ends[n] = goal;
            }
            if (ends.Count == 0) return false;
            if (++search == int.MaxValue) { Array.Clear(visited, 0, visited.Length); Array.Clear(closed, 0, closed.Length); search = 1; }
            heap.Clear();
            foreach (int n in Connectors(origin))
            {
                visited[n] = search; parent[n] = -1; cost[n] = Vector2.Distance(origin, Point(n));
                Push(n, cost[n] + Heuristic(Point(n), clearGoals));
            }
            while (heap.Count > 0)
            {
                int current = Pop();
                if (closed[current] == search) continue;
                closed[current] = search; LastExpanded++;
                if (ends.TryGetValue(current, out Vector2 endpoint))
                {
                    var raw = new List<Vector2> { endpoint };
                    for (int n = current; n >= 0; n = parent[n]) raw.Add(Point(n));
                    raw.Reverse();
                    Vector2 anchor = origin;
                    for (int i = 0; i < raw.Count;)
                    {
                        int furthest = raw.Count - 1;
                        while (furthest > i && !SegmentClearUnchecked(anchor, raw[furthest])) furthest--;
                        if (!SegmentClearUnchecked(anchor, raw[furthest])) { route.Clear(); return false; }
                        anchor = raw[furthest]; route.Add(World(anchor)); i = furthest + 1;
                    }
                    return true;
                }
                int x = current % width, z = current / width;
                for (int d = 0; d < 8; d++)
                {
                    int nx = x + DX[d], nz = z + DZ[d];
                    if (nx < 0 || nz < 0 || nx >= width || nz >= width) continue;
                    int n = nz * width + nx;
                    if (!walkable[n] || closed[n] == search) continue;
                    if (d >= 4 && (!walkable[z * width + nx] || !walkable[nz * width + x])) continue;
                    float nextCost = cost[current] + (d < 4 ? CellSize : CellSize * 1.41421356f);
                    if (visited[n] == search && cost[n] <= nextCost) continue;
                    if (!SegmentClearUnchecked(Point(current), Point(n))) continue;
                    visited[n] = search; cost[n] = nextCost; parent[n] = current;
                    Push(n, nextCost + Heuristic(Point(n), clearGoals));
                }
            }
            return false;
        }
        private static float Heuristic(Vector2 point, List<Vector2> goals)
        {
            float best = float.PositiveInfinity;
            foreach (var goal in goals) best = Mathf.Min(best, Vector2.Distance(point, goal));
            return best;
        }
        private void Push(int node, float score)
        {
            var entry = new Entry { node = node, score = score };
            int i = heap.Count; heap.Add(entry);
            while (i > 0)
            {
                int p = (i - 1) / 2;
                if (heap[p].score <= score) break;
                heap[i] = heap[p]; i = p;
            }
            heap[i] = entry;
        }
        private int Pop()
        {
            int result = heap[0].node, last = heap.Count - 1;
            var entry = heap[last]; heap.RemoveAt(last);
            if (last == 0) return result;
            int i = 0;
            while (i * 2 + 1 < last)
            {
                int child = i * 2 + 1;
                if (child + 1 < last && heap[child + 1].score < heap[child].score) child++;
                if (heap[child].score >= entry.score) break;
                heap[i] = heap[child]; i = child;
            }
            heap[i] = entry;
            return result;
        }
    }
}
