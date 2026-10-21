using UnityEngine;
using UnityEngine.Rendering;

namespace Orcbands
{
    /// <summary>
    /// The same five authored fire sources as the Three.js camp. The flame shader
    /// bends the original exported triangles; two small bounded particle pools
    /// add drifting smoke and embers. No external textures or asset packs.
    /// </summary>
    public sealed class CampFireAtmosphere : MonoBehaviour
    {
        // X/Z in reflected Unity coordinates; Z component = flame-base height,
        // W = independent animation phase.
        public Vector4[] Sources;
        public Material SmokeMaterial;
        public Material EmberMaterial;

        private void OnEnable() { ApplySources(); }
        private void ApplySources()
        {
            if (Sources != null && Sources.Length == 5)
                Shader.SetGlobalVectorArray("_CampFireSources", Sources);
        }

        private void Start()
        {
            if (Sources == null || Sources.Length != 5 ||
                SmokeMaterial == null || EmberMaterial == null)
            {
                Debug.LogError("Orcbands: fire atmosphere is missing authored sources or materials");
                return;
            }
            ApplySources();
            Texture2D smokeDisc = SoftDisc(64, .85f);
            Texture2D sparkDisc = SoftDisc(32, .35f);
            smokeDisc.name = "Procedural soft smoke disc";
            sparkDisc.name = "Procedural ember disc";
            Material smoke = new Material(SmokeMaterial);
            Material sparks = new Material(EmberMaterial);
            smoke.mainTexture = smokeDisc;
            sparks.mainTexture = sparkDisc;

            for (int i = 0; i < Sources.Length; i++)
            {
                // Emit at the original Three.js heights (hearth +1.05,
                // torches +2.22), measured relative to flame-base origins.
                bool hearth = i == 0;
                Vector4 source = Sources[i];
                var basePoint = new Vector3(source.x, source.z + (hearth ? .86f : .46f), source.y);
                AddParticles("Thin drifting smoke " + i, basePoint, smoke, hearth, false, i);
                AddParticles("Rising fire sparks " + i,
                    basePoint - Vector3.up * .3f, sparks, hearth, true, i);
            }
        }

        private static Texture2D SoftDisc(int size, float softness)
        {
            var result = new Texture2D(size, size, TextureFormat.RGBA32, false);
            var pixels = new Color[size * size];
            for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
            {
                float dx = (x + .5f - size * .5f) / (size * .5f);
                float dy = (y + .5f - size * .5f) / (size * .5f);
                float r = Mathf.Sqrt(dx * dx + dy * dy);
                float alpha = Mathf.Pow(Mathf.Clamp01(1f - r), softness * 2f);
                pixels[y * size + x] = new Color(1f, 1f, 1f, alpha);
            }
            result.SetPixels(pixels);
            result.wrapMode = TextureWrapMode.Clamp;
            result.filterMode = FilterMode.Bilinear;
            result.Apply(false, true);
            return result;
        }

        private void AddParticles(string label, Vector3 origin, Material material,
            bool hearth, bool ember, int index)
        {
            var particleObject = new GameObject(label);
            particleObject.transform.SetParent(transform, false);
            particleObject.transform.position = origin;
            var ps = particleObject.AddComponent<ParticleSystem>();
            ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            ps.useAutoRandomSeed = false;
            ps.randomSeed = (uint)(2901 + index * 47 + (ember ? 17 : 0));

            var main = ps.main;
            main.loop = true;
            main.playOnAwake = false;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.startSpeed = 0f;
            main.startLifetime = ember
                ? new ParticleSystem.MinMaxCurve(hearth ? 1.5f : 1.0f, hearth ? 2.4f : 1.7f)
                : new ParticleSystem.MinMaxCurve(hearth ? 4.3f : 3.0f, hearth ? 5.6f : 4.1f);
            main.startSize = ember
                ? new ParticleSystem.MinMaxCurve(hearth ? .025f : .015f, hearth ? .058f : .033f)
                : new ParticleSystem.MinMaxCurve(hearth ? .22f : .12f, hearth ? .45f : .24f);
            main.maxParticles = ember ? (hearth ? 24 : 8) : (hearth ? 20 : 10);
            main.startColor = ember
                ? new Color(1f, .55f, .15f, .9f)
                : new Color(.66f, .70f, .65f, hearth ? .22f : .16f);

            var emission = ps.emission;
            emission.rateOverTime = ember ? (hearth ? 4.2f : 1.0f)
                : (hearth ? 2.6f : 1.2f);
            var shape = ps.shape;
            shape.enabled = true;
            shape.shapeType = ParticleSystemShapeType.Sphere;
            shape.radius = hearth ? .22f : .09f;

            var velocity = ps.velocityOverLifetime;
            velocity.enabled = true;
            velocity.space = ParticleSystemSimulationSpace.World;
            velocity.x = new ParticleSystem.MinMaxCurve(.08f, .17f);
            velocity.y = ember ? new ParticleSystem.MinMaxCurve(.8f, 1.6f)
                : new ParticleSystem.MinMaxCurve(.35f, .58f);
            velocity.z = new ParticleSystem.MinMaxCurve(-.14f, -.04f);

            var noise = ps.noise;
            noise.enabled = true;
            noise.strength = ember ? .24f : .13f;
            noise.frequency = ember ? 1.2f : .42f;
            noise.scrollSpeed = .32f;

            var overLife = ps.colorOverLifetime;
            overLife.enabled = true;
            var gradient = new Gradient();
            gradient.SetKeys(new[]
            {
                new GradientColorKey(Color.white, 0f),
                new GradientColorKey(Color.white, 1f)
            }, new[]
            {
                new GradientAlphaKey(0f, 0f),
                new GradientAlphaKey(1f, .13f),
                new GradientAlphaKey(ember ? .75f : .58f, .50f),
                new GradientAlphaKey(0f, 1f)
            });
            overLife.color = new ParticleSystem.MinMaxGradient(gradient);

            var renderer = particleObject.GetComponent<ParticleSystemRenderer>();
            renderer.renderMode = ParticleSystemRenderMode.Billboard;
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            renderer.sortingOrder = ember ? 3 : 2;
            // Warm-start particles, so the first WebGL frame has a plausible
            // camp atmosphere rather than waiting several seconds to fill.
            ps.Simulate(hearth ? 3f : 2.2f, true, true, true);
            ps.Play();
        }
    }
}
