using UnityEngine;

namespace Orcbands
{
    /// <summary>Simple ACES-inspired tone mapping of the built-in camera output.</summary>
    [RequireComponent(typeof(Camera))]
    public sealed class FilmicGrade : MonoBehaviour
    {
        private Material grade;

        private void OnEnable()
        {
            Shader shader = Shader.Find("Hidden/Orcbands/FilmicGrade");
            if (shader == null || !shader.isSupported)
            {
                Debug.LogWarning("Orcbands: filmic shader unavailable; render without grading.");
                return;
            }
            grade = new Material(shader) { hideFlags = HideFlags.DontSave };
        }

        private void OnRenderImage(RenderTexture source, RenderTexture destination)
        {
            if (grade == null) Graphics.Blit(source, destination);
            else Graphics.Blit(source, destination, grade);
        }

        private void OnDisable()
        {
            if (grade != null) Destroy(grade);
            grade = null;
        }
    }
