using UnityEngine;

namespace Orcbands
{
    /// <summary>Gameplay root stays at terrain height; only ModelMount is fitted/rotated.</summary>
    public sealed class CharacterPresentation : MonoBehaviour
    {
        public Transform ModelMount;
        public Vector3 ModelScale = Vector3.one;
        public Vector3 ModelEuler;
        public Vector3 PivotOffset;
        public Transform[] ReviewRoles;

        private void Awake() { Apply(); }
        private void OnValidate() { Apply(); }
        public void Apply()
        {
            if (ModelMount == null) return;
            ModelMount.localScale = ModelScale;
            ModelMount.localRotation = Quaternion.Euler(ModelEuler);
            ModelMount.localPosition = PivotOffset;
        }

        // Explicit rest-pose fitting, never per-frame bounds fitting on an animated rig.
        // Orientation is applied before bounds are measured. Root must have unit scale.
        public void FitRestPose(float height)
        {
            if (ModelMount == null || height <= 0f) return;
            ModelScale = Vector3.one;
            PivotOffset = Vector3.zero;
            Apply();
            var renderers = ModelMount.GetComponentsInChildren<Renderer>();
            if (renderers.Length == 0) return;
            Bounds bounds = renderers[0].bounds;
            foreach (var renderer in renderers) bounds.Encapsulate(renderer.bounds);
            float scale = height / Mathf.Max(.001f, bounds.size.y);
            ModelScale = Vector3.one * scale;
            Vector3 feet = new Vector3(bounds.center.x, bounds.min.y, bounds.center.z);
            PivotOffset = -transform.InverseTransformPoint(feet) * scale;
            Apply();
        }

        // Review silhouettes on the same selectable root, not three gameplay classes.
        public void ShowReviewRole(int index)
        {
            if (ReviewRoles == null) return;
            for (int i = 0; i < ReviewRoles.Length; i++)
                if (ReviewRoles[i] != null) ReviewRoles[i].gameObject.SetActive(i == index);
        }
    }
}
