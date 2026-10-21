using UnityEngine;

namespace Orcbands
{
    /// <summary>
    /// Stationary fire illumination. The original flame mesh still deforms in
    /// VertexColorLit and smoke/embers remain animated in CampFireAtmosphere.
    ///
    /// Dynamic point-light intensity/colour caused broad regions of distant
    /// terrain to pulse even with a stationary RTS camera (PR #43 captures).
    /// Keep this light warm and steady until we can constrain firelight to
    /// genuinely local geometry without changing distant forest shading.
    /// </summary>
    public sealed class CampFlame : MonoBehaviour
    {
        public Light Warmth;
        public float BaseIntensity = 2.8f;
        public Color LightColor = new Color(1f, .63f, .34f);
        public float Phase; // Retained for compatibility with generated scenes.

        private void Start()
        {
            if (Warmth == null) return;
            Warmth.intensity = BaseIntensity;
            Warmth.color = LightColor;
        }
    }
}
