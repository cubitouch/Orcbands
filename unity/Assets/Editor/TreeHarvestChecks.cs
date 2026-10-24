using System;
using UnityEngine;

namespace Orcbands.Editor
{
    public static class TreeHarvestChecks
    {
        private static void Require(bool condition, string message)
        { if (!condition) throw new InvalidOperationException("Tree harvesting regression: " + message); }
        public static void Run()
        {
            var go = new GameObject("Finite resource check");
            var tree = go.AddComponent<WoodcuttingTarget>();
            int total = 0;
            for (int i = 0; i < WoodcuttingTarget.WoodPerTree + 4; i++) total += tree.TakeWood();
            Require(total == 12 && tree.RemainingWood == 0 && tree.IsDepleted, "resource duplicates or becomes negative");
            Require(tree.TakeWood() == 0, "exhausted tree awards wood");
            UnityEngine.Object.DestroyImmediate(go);

            // Compare a runtime repair against the canonical PNG before changing the scene.
            var shadows = UnityEngine.Object.FindFirstObjectByType<ForestShadowMap>();
            var original = shadows.Original.GetPixels32();
            var pine = shadows.Trees[16];
            float texel = 2f * shadows.HalfExtent / shadows.Original.width;
            int x = Mathf.RoundToInt((shadows.HalfExtent - pine.transform.position.x) / texel);
            int y = Mathf.RoundToInt((shadows.HalfExtent + pine.transform.position.z) / texel);
            var rect = new RectInt(x - 90, y - 90, 180, 180);
            var repaired = shadows.RenderRegion(rect);
            int mismatch = 0;
            for (int j = 0; j < rect.height; j++)
                for (int i = 0; i < rect.width; i++)
                    if (Mathf.Abs(original[(rect.y + j) * shadows.Original.width + rect.x + i].r - repaired[j * rect.width + i].r) > 1) mismatch++;
            // Float32 raster edge ties can differ from the source's Float64 projection.
            Require(mismatch < repaired.Length / 500, "runtime shadow raster differs from canonical PNG: " + mismatch);
            Debug.Log("TREE_HARVEST_CHECKS: PASS finite supply, exact yield, exhausted-node guard and original-shadow repair parity (edge pixels " + mismatch + ")");
        }
    }
}
