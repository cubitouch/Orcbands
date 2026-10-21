using UnityEngine;

namespace Orcbands
{
    /// <summary>
    /// The approved Three.js six-source, world-space soft visibility mask.
    /// Fixed authored locations, not actual unit line-of-sight or gameplay fog.
    /// </summary>
    public sealed class CampReveal : MonoBehaviour
    {
        // Each vector holds the reflected Unity world X, Z and reveal radius.
        public Vector4[] Sources;
        public bool FogOfWarVisible { get; private set; } = true;
        public Camera GameCamera;
        // The original Asset Lab uses the same distance fog at all times,
        // with a subdued dusk colour when obscured and an olive daylight
        // backdrop when the player disables the fog of war.
        private static readonly Color HiddenAtmosphere =
            new Color(64f/255f, 83f/255f, 79f/255f);
        private static readonly Color RevealedAtmosphere =
            new Color(157f/255f, 169f/255f, 140f/255f);

        // Compare visibility and original materials without altering scene data.
        public void SetFogOfWar(bool visible)
        {
            FogOfWarVisible = visible;
            Apply();
        }

        private void Start() { Apply(); }

        private void OnEnable() { Apply(); }

        private void Apply()
        {
            // OnEnable can occur while the editor is still constructing
            // this component, before the six-source layout is assigned.
            if (Sources == null || Sources.Length != 6)
            {
                Shader.SetGlobalFloat("_CampFogEnabled", 0f);
                return;
            }
            Shader.SetGlobalVectorArray("_CampRevealSources", Sources);
            Shader.SetGlobalFloat("_CampFogEnabled", FogOfWarVisible ? 1f : 0f);
            Color atmosphere = FogOfWarVisible ? HiddenAtmosphere : RevealedAtmosphere;
            RenderSettings.fogColor = atmosphere;
            if (GameCamera != null) GameCamera.backgroundColor = atmosphere;
        }

        private void OnDisable()
        {
            Shader.SetGlobalFloat("_CampFogEnabled", 0f);
        }
    }
}
