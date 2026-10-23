using UnityEngine;

namespace Orcbands
{
    /// <summary>Animation interaction only; this does not fell trees or award wood.</summary>
    public sealed class WoodcuttingTarget : MonoBehaviour
    {
        public float StandOff = 1.25f;
        public Vector3 ApproachPoint(Vector3 worker)
        {
            Vector3 away = Vector3.ProjectOnPlane(worker - transform.position, Vector3.up);
            if (away.sqrMagnitude < .01f) away = Vector3.back;
            return transform.position + away.normalized * StandOff;
        }
    }
}
