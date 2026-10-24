using System;
using UnityEngine;

namespace Orcbands
{
    /// <summary>Repairs only the felled pine's texture region, preserving overlapping neighbours.</summary>
    public sealed class ForestShadowMap : MonoBehaviour
    {
        [Serializable] public class SourceData { public Vector3[] vertices; public int[] triangles; }
        public SourceData Source;
        public WoodcuttingTarget[] Trees;
        public Material GroundMaterial;
        public Texture2D Original;
        public float HalfExtent = 110f;
        private Texture2D live;
        public int Repairs { get; private set; }
        public int ChangedPixels { get; private set; }
        private float Texel => 2f * HalfExtent / Original.width;
        private Vector2 Pixel(Vector3 world) => new Vector2((HalfExtent - world.x) / Texel, (HalfExtent + world.z) / Texel);
        private RectInt BoundsFor(WoodcuttingTarget tree)
        {
            Vector2 centre = Pixel(tree.transform.position);
            // Conservative bound includes original crown, projected top and 3-sigma contact halo.
            float radius = tree.ShadowScale * (2f * tree.ShadowWidth + 6f * tree.ShadowHeight) / Texel + 3f;
            return new RectInt(Mathf.FloorToInt(centre.x - radius), Mathf.FloorToInt(centre.y - radius),
                Mathf.CeilToInt(2f * radius) + 2, Mathf.CeilToInt(2f * radius) + 2);
        }
        public void RemoveCanopy(WoodcuttingTarget felled)
        {
            if (live == null)
            {
                live = Instantiate(Original); live.name = "Live pine ground shadows";
                GroundMaterial.SetTexture("_ForestShadowTex", live);
            }
            RectInt bounds = BoundsFor(felled);
            int x0 = Mathf.Max(0, bounds.xMin), y0 = Mathf.Max(0, bounds.yMin);
            int x1 = Mathf.Min(Original.width, bounds.xMax), y1 = Mathf.Min(Original.height, bounds.yMax);
            var rect = new RectInt(x0, y0, x1 - x0, y1 - y0);
            Color32[] pixels = RenderRegion(rect);
            Color[] before = live.GetPixels(rect.x, rect.y, rect.width, rect.height);
            ChangedPixels = 0;
            for (int y = 0; y < rect.height; y++)
                for (int x = 0; x < rect.width; x++)
                    if (Mathf.RoundToInt(before[y * rect.width + x].r * 255f) != pixels[y * rect.width + x].r) ChangedPixels++;
            live.SetPixels32(rect.x, rect.y, rect.width, rect.height, pixels);
            live.Apply(true, false); Repairs++;
        }
        // Shared with executable editor checks; include a one-pixel halo for the 3x3 tent blur.
        public Color32[] RenderRegion(RectInt rect)
        {
            int width = rect.width + 2, height = rect.height + 2;
            int ox = rect.x - 1, oy = rect.y - 1;
            var cast = new float[width * height];
            var contactTransmission = new float[rect.width * rect.height];
            Array.Fill(contactTransmission, 1f);
            var expanded = new RectInt(ox, oy, width, height);
            foreach (var tree in Trees)
            {
                if (tree == null || !BoundsFor(tree).Overlaps(expanded)) continue;
                Vector2 centre = Pixel(tree.transform.position);
                float rootSigma = Mathf.Max(.30f, .43f * tree.ShadowScale);
                float canopySigma = Mathf.Max(.75f, .94f * tree.ShadowScale * tree.ShadowWidth);
                if (!tree.IsDepleted)
                {
                    var projected = new Vector2[Source.vertices.Length];
                    for (int i = 0; i < projected.Length; i++)
                    {
                        Vector3 v = tree.transform.TransformVector(Source.vertices[i]);
                        Vector3 world = tree.transform.position + new Vector3(v.x - 22f / 36f * v.y, 0f, v.z - .5f * v.y);
                        projected[i] = Pixel(world) - new Vector2(ox, oy);
                    }
                    for (int i = 0; i < Source.triangles.Length; i += 3)
                        Raster(projected[Source.triangles[i]], projected[Source.triangles[i + 1]], projected[Source.triangles[i + 2]], cast, width, height);
                }
                int radius = Mathf.CeilToInt(3f * canopySigma / Texel);
                for (int y = 0; y < rect.height; y++)
                    for (int x = 0; x < rect.width; x++)
                    {
                        int px = x + rect.x, py = y + rect.y;
                        // Mirror the PNG producer's inclusive row/column limits exactly.
                        float originalRow = Original.height - centre.y;
                        int row = Original.height - 1 - py;
                        if (px < Mathf.FloorToInt(centre.x - radius) || px > Mathf.CeilToInt(centre.x + radius) ||
                            row < Mathf.FloorToInt(originalRow - radius) || row > Mathf.CeilToInt(originalRow + radius)) continue;
                        float dx = (px + .5f - centre.x) * Texel, dz = (py + .5f - centre.y) * Texel;
                        float d2 = dx * dx + dz * dz;
                        float contact = tree.IsDepleted
                            ? .35f * Mathf.Exp(-d2 / (2f * .22f * .22f * tree.ShadowScale * tree.ShadowScale))
                            : Mathf.Min(.70f, .48f * Mathf.Exp(-d2 / (2f * rootSigma * rootSigma)) + .15f * Mathf.Exp(-d2 / (2f * canopySigma * canopySigma)));
                        contactTransmission[y * rect.width + x] *= 1f - contact;
                    }
            }
            var pixels = new Color32[rect.width * rect.height];
            for (int y = 0; y < rect.height; y++)
                for (int x = 0; x < rect.width; x++)
                {
                    float soft = 0f;
                    for (int j = 0; j < 3; j++)
                        for (int i = 0; i < 3; i++)
                        {
                            int px = Mathf.Clamp(ox + x + i, 0, Original.width - 1) - ox;
                            int py = Mathf.Clamp(oy + y + j, 0, Original.height - 1) - oy;
                            soft += cast[py * width + px] * (i == 1 ? 2f : 1f) * (j == 1 ? 2f : 1f) / 16f;
                        }
                    float shadow = 1f - (1f - soft) * contactTransmission[y * rect.width + x];
                    byte value = (byte)Mathf.RoundToInt(255f * (1f - shadow * .48f));
                    pixels[y * rect.width + x] = new Color32(value, value, value, 255);
                }
            return pixels;
        }
        private static void Raster(Vector2 p, Vector2 q, Vector2 r, float[] mask, int width, int height)
        {
            float det = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
            if (Mathf.Abs(det) < .0000001f) return;
            int left = Mathf.Max(0, Mathf.FloorToInt(Mathf.Min(p.x, Mathf.Min(q.x, r.x))));
            int right = Mathf.Min(width - 1, Mathf.CeilToInt(Mathf.Max(p.x, Mathf.Max(q.x, r.x))));
            int bottom = Mathf.Max(0, Mathf.FloorToInt(Mathf.Min(p.y, Mathf.Min(q.y, r.y))));
            int top = Mathf.Min(height - 1, Mathf.CeilToInt(Mathf.Max(p.y, Mathf.Max(q.y, r.y))));
            for (int y = bottom; y <= top; y++)
                for (int x = left; x <= right; x++)
                {
                    float dx = x + .5f - p.x, dy = y + .5f - p.y;
                    float u = (dx * (r.y - p.y) - dy * (r.x - p.x)) / det;
                    float v = (dy * (q.x - p.x) - dx * (q.y - p.y)) / det;
                    if (u >= 0f && v >= 0f && u + v <= 1f) mask[y * width + x] = 1f;
                }
        }
        private void OnDestroy()
        {
            if (live == null) return;
            if (GroundMaterial != null) GroundMaterial.SetTexture("_ForestShadowTex", Original);
            Destroy(live);
        }
    }
}
