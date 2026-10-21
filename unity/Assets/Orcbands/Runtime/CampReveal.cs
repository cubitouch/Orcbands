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
        }

        private void OnDisable()
        {
            Shader.SetGlobalFloat("_CampFogEnabled", 0f);
        }
    }
}
