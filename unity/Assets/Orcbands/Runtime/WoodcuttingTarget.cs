using UnityEngine;

namespace Orcbands
{
    /// <summary>Animation interaction only; this does not fell trees or award wood.</summary>
    public sealed class WoodcuttingTarget : MonoBehaviour
    {
        [Min(.1f)] public float CrownRadius = 1.36f;
        [Min(0f)] public float WorkerClearance = .65f;
        // Pine 01's outer crown plus the worker's .54m selection radius and
        // a small visual margin. This is a work position, not pathfinding.
        public float StandOff => CrownRadius + WorkerClearance;
        public Vector3 ApproachPoint(Vector3 worker)
        {
            Vector3 away = Vector3.ProjectOnPlane(worker - transform.position, Vector3.up);
            if (away.sqrMagnitude < .01f) away = Vector3.back;
            return transform.position + away.normalized * StandOff;
        }
    }
}
