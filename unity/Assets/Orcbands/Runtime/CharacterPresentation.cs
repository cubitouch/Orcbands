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
        [Min(.1f)] public float TargetHeight = 1.525f;
        public Transform[] ReviewRoles;
        [Range(0, 2)] public int StartingRole;

        private void Awake() { Apply(); }
        private void OnValidate() { Apply(); }
        public void Apply()
        {
            if (ModelMount == null) return;
            ModelMount.localScale = ModelScale;
            ModelMount.localRotation = Quaternion.Euler(ModelEuler);
            ModelMount.localPosition = PivotOffset;
        }

        [ContextMenu("Fit rest pose to target height")]
        public void FitConfiguredRestPose()
        {
#if UNITY_EDITOR
            UnityEditor.Undo.RecordObject(this, "Fit character rest pose");
            if (ModelMount != null) UnityEditor.Undo.RecordObject(ModelMount, "Fit character mount");
#endif
            FitRestPose(TargetHeight);
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
            Bounds bounds = PosedBounds(renderers[0]);
            foreach (var renderer in renderers) bounds.Encapsulate(PosedBounds(renderer));
            float scale = height / Mathf.Max(.001f, bounds.size.y);
            ModelScale = Vector3.one * scale;
            Vector3 feet = new Vector3(bounds.center.x, bounds.min.y, bounds.center.z);
            PivotOffset = -transform.InverseTransformPoint(feet) * scale;
            Apply();
        }

        // Renderer.bounds may still contain the imported T-pose envelope. Bake
        // only during explicit fitting, then discard the temporary mesh.
        private static Bounds PosedBounds(Renderer renderer)
        {
            if (!(renderer is SkinnedMeshRenderer skinned)) return renderer.bounds;
            var mesh = new Mesh();
            skinned.BakeMesh(mesh);
            var vertices = mesh.vertices;
            if (vertices.Length == 0) { DestroyImmediate(mesh); return renderer.bounds; }
            var bounds = new Bounds(skinned.transform.TransformPoint(vertices[0]), Vector3.zero);
            foreach (var vertex in vertices) bounds.Encapsulate(skinned.transform.TransformPoint(vertex));
            DestroyImmediate(mesh);
            return bounds;
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

