using System.Collections.Generic;
using UnityEngine;

namespace Orcbands
{
    /// <summary>A mineable outcrop. Decorative rocks do not carry this component.</summary>
    public sealed class StoneMiningTarget : MonoBehaviour
    {
        public const int StonePerOutcrop = 24;
        [SerializeField] private int remaining = StonePerOutcrop;
        public int Remaining => remaining;
        public bool IsDepleted => remaining == 0;
        public int ObstacleIndex;
        public float Radius = 1.5f;
        public GameObject Full, Depleted;
        public int TakeStone()
        {
            if (remaining == 0) return 0;
            remaining--; return 1;
        }
        public void RestoreResource(int value)
        {
            remaining = Mathf.Clamp(value, 0, StonePerOutcrop);
            Full.SetActive(!IsDepleted); Depleted.SetActive(IsDepleted);
        }
        public void WorkPoints(Vector3 worker, WoodcuttingTarget.WorkExclusion[] exclusions, List<Vector3> points)
        {
            points.Clear();
            Vector3 away = Vector3.ProjectOnPlane(worker - transform.position, Vector3.up).normalized;
            if (away.sqrMagnitude < .01f) away = Vector3.back;
            for (int i = 0; i < 24; i++) {
                int sector = i == 0 ? 0 : (i + 1) / 2 * (i % 2 == 1 ? 1 : -1);
                Vector3 point = transform.position + Quaternion.AngleAxis(sector * 15f, Vector3.up) * away * (Radius + .7f);
                if (WoodcuttingTarget.ClearsWorkAreas(point, exclusions)) points.Add(point);
            }
        }
    }
}
