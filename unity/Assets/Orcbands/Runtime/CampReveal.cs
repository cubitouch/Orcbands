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

        private void OnEnable()
        {
            if (Sources == null || Sources.Length != 6)
            {
                Debug.LogError("Orcbands: camp reveal requires six approved sources");
                Shader.SetGlobalFloat("_CampFogEnabled", 0f);
                return;
            }
            Shader.SetGlobalVectorArray("_CampRevealSources", Sources);
            Shader.SetGlobalFloat("_CampFogEnabled", 1f);
        }

        private void OnDisable()
        {
            Shader.SetGlobalFloat("_CampFogEnabled", 0f);
        }
    }
