using UnityEngine;

namespace Orcbands
{
    /// <summary>Bind the five authored firelights for single-pass character lighting.</summary>
    public sealed class CampCharacterLighting : MonoBehaviour
    {
        public Light[] Firelights;
        private const int Capacity = 5;
        private void OnEnable() { Refresh(); }
        private void Start() { Refresh(); }

        // Lights are stationary. Refresh explicitly when editing their setup;
        // no pose, mesh bounds, or per-frame lighting fit is needed.
        public void Refresh()
        {
            var positions = new Vector4[Capacity];
            var radiance = new Vector4[Capacity];
            if (Firelights != null)
                for (int i = 0; i < Mathf.Min(Capacity, Firelights.Length); i++)
                {
                    var light = Firelights[i];
                    if (light == null || !light.isActiveAndEnabled) continue;
                    Vector3 p = light.transform.position;
                    positions[i] = new Vector4(p.x, p.y, p.z, light.range);
                    Color color = QualitySettings.activeColorSpace == ColorSpace.Linear
                        ? light.color.linear : light.color;
                    radiance[i] = new Vector4(color.r, color.g, color.b, 0f) * light.intensity;
                }
            Shader.SetGlobalVectorArray("_CharacterFirePositionRange", positions);
            Shader.SetGlobalVectorArray("_CharacterFireRadiance", radiance);
        }
    }
}
