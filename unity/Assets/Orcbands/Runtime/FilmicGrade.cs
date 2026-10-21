using UnityEngine;

namespace Orcbands
{
    /// <summary>
    /// ACES-inspired tone mapping of the built-in renderer. The material
    /// is a serialized scene reference so Unity does not strip the shader
    /// from its WebGL player build.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    public sealed class FilmicGrade : MonoBehaviour
    {
        public Material GradeMaterial;

        private void OnRenderImage(RenderTexture source, RenderTexture destination)
        {
            if (GradeMaterial == null || !GradeMaterial.shader.isSupported)
                Graphics.Blit(source, destination);
            else
                Graphics.Blit(source, destination, GradeMaterial);
        }
    }
}
