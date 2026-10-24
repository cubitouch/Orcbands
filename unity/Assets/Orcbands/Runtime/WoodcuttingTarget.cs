using UnityEngine;

namespace Orcbands
{
    /// <summary>Animation interaction only; this does not fell trees or award wood.</summary>
    public sealed class WoodcuttingTarget : MonoBehaviour
    {
        [System.Serializable] public struct WorkExclusion
        {
            public float x, z, radius;
        }
        [Min(.1f)] public float CrownRadius = 1.36f;
        [Min(0f)] public float WorkerClearance = .65f;
        // A work position outside the low branches, not a navigation radius.
        public float StandOff => CrownRadius + WorkerClearance;

        public static bool ClearsWorkAreas(Vector3 point, WorkExclusion[] areas)
        {
            if (areas == null) return true;
            foreach (var area in areas)
            {
                float x = point.x - area.x, z = point.z - area.z;
                float radius = area.radius + .65f;
                if (x * x + z * z < radius * radius) return false;
            }
            return true;
        }

        public Vector3 ApproachPoint(Vector3 worker, WorkExclusion[] areas)
        {
            Vector3 away = Vector3.ProjectOnPlane(worker - transform.position, Vector3.up);
            if (away.sqrMagnitude < .01f) away = Vector3.back;
            away.Normalize();
            Vector3 fallback = transform.position + away * StandOff;
            // Search the work circle in a deterministic fan. Keep the nearest
            // clear endpoint; movement to it is still a direct gameplay command.
            Vector3 best = fallback;
            float bestDistance = float.PositiveInfinity;
            for (int step = 0; step < 24; step++)
            {
                int sector = step == 0 ? 0 : (step + 1) / 2 * (step % 2 == 1 ? 1 : -1);
                Vector3 point = transform.position + Quaternion.AngleAxis(sector * 15f, Vector3.up) * away * StandOff;
                if (!ClearsWorkAreas(point, areas)) continue;
                bool otherTree = false;
                foreach (var hit in Physics.OverlapCapsule(point + Vector3.up * .6f,
                    point + Vector3.up * 1.6f, .54f))
                {
                    var tree = hit.GetComponentInParent<WoodcuttingTarget>();
                    if (tree != null && tree != this) { otherTree = true; break; }
                }
                if (otherTree) continue;
                float distance = (worker - point).sqrMagnitude;
                if (distance < bestDistance) { bestDistance = distance; best = point; }
            }
            return best;
        }
    }
}
