using UnityEngine;

namespace Orcbands
{
    // Small, deterministic flame/light movement matching the style of the
    // approved Three.js campfire, without per-frame geometry regeneration.
    public sealed class CampFlame : MonoBehaviour
    {
        // Diagnostics only: hold direct fire illumination steady while
        // keeping flame meshes, smoke and sparks animated.
        public static bool HoldLightFlicker;
        public Light Warmth;
        public float Phase;
        public float BaseIntensity = 2.8f;
        private Vector3 originalScale;

        private void Awake() { originalScale = transform.localScale; }

        private void Update()
        {
            float t = Time.time * 3.1f + Phase;
            float pulse = Mathf.Sin(t) * .10f + Mathf.Sin(t * 1.71f) * .055f;
            transform.localScale = new Vector3(
                originalScale.x * (1f + pulse * .35f),
                originalScale.y * (1f + pulse),
                originalScale.z * (1f + pulse * .35f));
            if (Warmth != null)
            {
                Warmth.intensity = HoldLightFlicker
                    ? BaseIntensity : BaseIntensity * (1f + pulse * .28f);
                float amber = HoldLightFlicker ? .5f
                    : Mathf.Clamp01(.5f + pulse * 2f);
                Warmth.color = Color.Lerp(new Color(1f, .49f, .25f),
                    new Color(1f, .75f, .43f), amber);
            }
        }
    }
}
