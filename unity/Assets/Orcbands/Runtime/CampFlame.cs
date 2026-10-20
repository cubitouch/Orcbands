using UnityEngine;

namespace Orcbands
{
    // Small, deterministic flame/light movement matching the style of the
    // approved Three.js campfire, without per-frame geometry regeneration.
    public sealed class CampFlame : MonoBehaviour
    {
        public Light Warmth;
        public float Phase;
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
            if (Warmth != null) Warmth.intensity = 1.6f + pulse * .8f;
        }
    }
}
