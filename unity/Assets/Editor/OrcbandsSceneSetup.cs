using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace Orcbands.Editor
{
    /// <summary>
    /// Deterministic first-scene generator. The .unity file is generated rather than
    /// hand-authoring Unity YAML or modifying our existing Three.js Asset Lab.
    /// </summary>
    public static class OrcbandsSceneSetup
    {
        private const string ScenePath = "Assets/Scenes/OrcbandsStarter.unity";
        private const string PinePath = "Assets/Orcbands/Art/low-poly-pine-01.obj";
        private const string HutPath = "Assets/Orcbands/Art/timber-hut-01.obj";

        [Serializable] public class P { public float x, z, scale = 1f, angle, width = 1f, height = 1f; }
        [Serializable] public class Grove { public P[] trees; public P hut, campfire; public P[] torches; public int resourceCount; }
        private const string Generated = "Assets/Orcbands/Generated/";
        private static readonly Dictionary<string, Material> Shades = new Dictionary<string, Material>();

        [MenuItem("Orcbands/Generate Starter Scene")]
        public static void GenerateScene()
        {
            GameObject pine = AssetDatabase.LoadAssetAtPath<GameObject>(PinePath);
            GameObject hut = AssetDatabase.LoadAssetAtPath<GameObject>(HutPath);
            TextAsset json = AssetDatabase.LoadAssetAtPath<TextAsset>(Generated + "grove-layout.json");
            if (pine == null || hut == null || json == null)
                throw new InvalidOperationException("Run npm install --no-save three@0.166.1 && node tools/generate-unity-environment.mjs");
            Grove layout = JsonUtility.FromJson<Grove>(json.text);
            if (layout == null || layout.trees == null || layout.trees.Length != 244 ||
                layout.hut == null || layout.campfire == null || layout.torches == null ||
                layout.torches.Length != 4)
                throw new InvalidOperationException("Incomplete exported Three.js grove");

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            Shades.Clear();
            // Restrained ambient fill lets the low sun and fire distinguish
            // lit forest edges from the deep woodland. Excessive hemispheric
            // illumination previously washed out the original pine palette.
            // Slightly cooler forest fill keeps shadows blue-green without
            // sacrificing foliage visibility or changing fog/visibility shaders.
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(.26f, .35f, .39f);
            RenderSettings.ambientEquatorColor = new Color(.18f, .25f, .28f);
            RenderSettings.ambientGroundColor = new Color(.13f, .17f, .19f);
            // Our two world-space shaders own the woodland atmosphere and
            // six-source fog of war. Built-in camera-distance fog applies a
            // second, moving grey band on top when zooming/orbiting in WebGL.
            // Keep Unity's built-in fog disabled so only the stable material
            // atmosphere and authored visibility mask control the forest.
            RenderSettings.fog = false;
            RenderSettings.fogColor = new Color(64f/255f, 83f/255f, 79f/255f);
            QualitySettings.shadows = ShadowQuality.All;
            QualitySettings.shadowDistance = 65f;
            // Five authored firelights must survive Unity's forward-light selection.
            QualitySettings.pixelLightCount = 6;

            Shader vertexShader = Shader.Find("Orcbands/VertexColorLit");
            Shader worldShader = Shader.Find("Orcbands/WorldColorLit");
            if (vertexShader == null || worldShader == null)
                throw new InvalidOperationException("Missing camp visibility shaders");
            Material art = new Material(vertexShader);
            // Preserve the original vertex colors; the former .78 tint plus
            // hard tree darkening made the whole forest muddy.
            art.SetColor("_Tint", Color.white);
            art = SavedMaterial("ForestArt", art);
            Texture2D pineShadowMap =
                AssetDatabase.LoadAssetAtPath<Texture2D>(Generated + "approved-pine-shadows.png");
            if (pineShadowMap == null)
                throw new InvalidOperationException("Missing exported approved pine shadow map");
            Material terrainArt = new Material(art);
            terrainArt.SetTexture("_ForestShadowTex", pineShadowMap);
            terrainArt.SetFloat("_ForestShadowStrength", .88f);
            // Keep paths legible, but stop the open ground from looking pale.
            terrainArt.SetColor("_Tint", new Color(.73f, .75f, .67f));
            terrainArt = SavedMaterial("WoodlandGroundWithShadows", terrainArt);
            Material fireArt = new Material(vertexShader);
            fireArt.SetColor("_Tint", Color.white);
            fireArt.SetFloat("_Unlit", 1f);
            fireArt.SetFloat("_FireMotion", 1f);
            fireArt = SavedMaterial("ApprovedFireGlow", fireArt);
            var ground = ColoredMesh("Ground", "terrain", terrainArt, true);
            // Root patches sit above terrain and must receive the SAME baked
            // canopy/root shadow mask, or they hide the grounding we added.
            ColoredMesh("Tree roots and woodland ground patches", "forest-patches", terrainArt, false);
            ColoredMesh("Approved resources and storage", "resource-art", art, false);
            ColoredMesh("Approved rock geometry", "stone-props", art, false);
            ColoredMesh("Grass and woodland cover", "grass-props", art, false);
            ColoredMesh("Woodland deadwood, moss and undergrowth", "woodland-story", art, false);
            ColoredMesh("Approved hearth and cut firewood", "hearth-art", art, false);
            ColoredMesh("Approved hearth flames and embers", "hearth-flames", fireArt, false);
            ColoredMesh("Approved torch stakes and baskets", "torches-art", art, false);
            ColoredMesh("Approved torch flames", "torches-flames", fireArt, false);

            var building = (GameObject)PrefabUtility.InstantiatePrefab(hut);
            building.name = "Timber Hut 01";
            building.transform.position = Surface(ground, layout.hut.x, layout.hut.z);
            building.transform.rotation = Quaternion.Euler(0f, layout.hut.angle * Mathf.Rad2Deg, 0f);
            ApplyWorldMaterials(building, worldShader);

            var forest = new GameObject("Approved 244-pine forest");
            for (int i = 0; i < layout.trees.Length; i++)
            {
                P pos = layout.trees[i];
                var tree = (GameObject)PrefabUtility.InstantiatePrefab(pine, forest.transform);
                tree.name = "Pine " + (i + 1).ToString("D3");
                tree.transform.position = Surface(ground, pos.x, pos.z) - Vector3.up * .035f * pos.scale;
                tree.transform.rotation = Quaternion.Euler(0f, pos.angle * Mathf.Rad2Deg, 0f);
                tree.transform.localScale = new Vector3(pos.scale * pos.width, pos.scale * pos.height, pos.scale * pos.width);
                float distance = Mathf.Sqrt(pos.x * pos.x + pos.z * pos.z);
                ApplyWorldMaterials(tree, worldShader);
                tree.AddComponent<WoodcuttingTarget>();
                // Pick the visible silhouette, including branches, rather than
                // requiring a precise click on a partly hidden narrow trunk.
                foreach (var mesh in tree.GetComponentsInChildren<MeshFilter>())
                    mesh.gameObject.AddComponent<MeshCollider>().sharedMesh = mesh.sharedMesh;
                foreach (var renderer in tree.GetComponentsInChildren<MeshRenderer>())
                {
                    renderer.shadowCastingMode = distance < 30f ? ShadowCastingMode.On : ShadowCastingMode.Off;
                    renderer.receiveShadows = distance < 25f;
                }
            }

            // Keep firelights localized and steady (no animated intensities):
            // the hearth is warmer/brighter than the four supporting torches.
            // This intentionally avoids the stationary-camera tile regression.
            // The real art above is exported from buildCampfire/buildTorches in
            // Three.js; only the lightweight animated point lights are Unity-native.
            AddFlicker("Hearth firelight",
                Surface(ground, layout.campfire.x, layout.campfire.z) + Vector3.up * .76f,
                7.2f, 6.7f, .8f, new Color(1f, .48f, .22f));
            for (int i = 0; i < layout.torches.Length; i++)
            {
                P loc = layout.torches[i];
                AddFlicker("Torch firelight " + (i + 1),
                    Surface(ground, loc.x, loc.z) + Vector3.up * 2f,
                    4.5f, 2.45f, i * 2.3f, new Color(1f, .66f, .36f));
            }

            GameObject worker = CharacterSceneFactory.Create(Surface(ground, 1.7f, 2.8f));
            var ringObject = new GameObject("Worker selection ring");
            var ring = ringObject.AddComponent<LineRenderer>();
            ring.useWorldSpace = false; ring.loop = true; ring.positionCount = 40;
            ring.widthMultiplier = .035f;
            ring.sharedMaterial = SavedMaterial("CharacterSelection", new Material(Shader.Find("Sprites/Default")));
            ring.startColor = ring.endColor = new Color(.68f, .57f, .30f, .85f);
            ring.shadowCastingMode = ShadowCastingMode.Off; ring.receiveShadows = false;
            for (int i = 0; i < 40; i++)
            {
                float angle = i * Mathf.PI * 2f / 40;
                ring.SetPosition(i, new Vector3(Mathf.Cos(angle) * .58f, 0f, Mathf.Sin(angle) * .58f));
            }
            ringObject.SetActive(false);

            var targetRing = UnityEngine.Object.Instantiate(ringObject);
            targetRing.name = "Commanded tree marker";
            var targetLine = targetRing.GetComponent<LineRenderer>();
            targetLine.startColor = targetLine.endColor = new Color(1f, .64f, .16f, .95f);
            targetLine.widthMultiplier = .055f;
            for (int i = 0; i < targetLine.positionCount; i++)
                targetLine.SetPosition(i, targetLine.GetPosition(i) * 1.45f);

            GameObject cameraObject = new GameObject("Perspective RTS Camera");
            cameraObject.tag = "MainCamera";
            Camera camera = cameraObject.AddComponent<Camera>();
            camera.orthographic = false;
            camera.fieldOfView = 38f;
            camera.nearClipPlane = .1f;
            camera.farClipPlane = 240f;
            camera.allowHDR = true;
            var film = cameraObject.AddComponent<FilmicGrade>();
            var gradeShader = Shader.Find("Hidden/Orcbands/FilmicGrade");
            if (gradeShader == null)
                throw new InvalidOperationException("Missing Orcbands filmic grade");
            var gradeMaterial = new Material(gradeShader);
            // More deliberate deep greens and contrast, without crushing
            // the hearth, worker, paths or distant silhouettes into black.
            gradeMaterial.SetFloat("_Exposure", .83f);
            gradeMaterial.SetFloat("_Contrast", 1.17f);
            gradeMaterial.SetFloat("_Saturation", 1.07f);
            film.GradeMaterial = SavedMaterial("BrowserFilmicGrade", gradeMaterial);
            camera.clearFlags = CameraClearFlags.SolidColor;
            // A subdued distant clearing for areas outside the level mesh;
            // the woodland itself is obscured by the authored fog of war.
            camera.backgroundColor = new Color(64f/255f, 83f/255f, 79f/255f);
            cameraObject.transform.position = new Vector3(-20f, 22f, 26f);
            cameraObject.transform.LookAt(new Vector3(0f, 0f, -1f));

            GameObject sunObject = new GameObject("Warm sun");
            Light sun = sunObject.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(.94f, .97f, 1f);
            sun.intensity = .91f;
            sun.shadows = LightShadows.Soft;
            sun.shadowStrength = .83f;
            // Source Three.js sun sits at (-22, 36, 18); Unity mirrors X.
            // Point the Unity light along the equivalent mirrored rays.
            sunObject.transform.rotation = Quaternion.LookRotation(
                new Vector3(-22f, -36f, -18f).normalized, Vector3.up);
            sun.shadowCustomResolution = 2048;
            RenderSettings.sun = sun;

            var controllerObject = new GameObject("Orcbands Controller");
            // Keep all five original fire positions synchronized across the
            // bending flame shader and bounded smoke/ember particle pools.
            Shader particleShader = Shader.Find("Orcbands/FireParticles");
            if (particleShader == null)
                throw new InvalidOperationException("Missing smoke and ember shader");
            var fireAtmosphere = controllerObject.AddComponent<CampFireAtmosphere>();
            var smokeMaterial = new Material(particleShader);
            var emberMaterial = new Material(particleShader);
            emberMaterial.SetFloat("_DstBlend", (float)BlendMode.One);
            fireAtmosphere.SmokeMaterial = SavedMaterial("SmokeSoftParticles", smokeMaterial);
            fireAtmosphere.EmberMaterial = SavedMaterial("EmberGlowParticles", emberMaterial);
            fireAtmosphere.Sources = new Vector4[5];
            var fireGround = Surface(ground, layout.campfire.x, layout.campfire.z);
            fireAtmosphere.Sources[0] = new Vector4(layout.campfire.x, layout.campfire.z,
                fireGround.y + .19f, .8f);
            for (int i = 0; i < layout.torches.Length; i++)
            {
                P p = layout.torches[i];
                fireAtmosphere.Sources[i + 1] = new Vector4(p.x, p.z,
                    Surface(ground, p.x, p.z).y + 1.76f, i * 2.3f);
            }
            var reveal = controllerObject.AddComponent<CampReveal>();
            reveal.GameCamera = camera;
            reveal.Sources = new Vector4[6];
            reveal.Sources[0] = new Vector4(layout.hut.x, layout.hut.z, 10.5f, 0f);
            reveal.Sources[1] = new Vector4(layout.campfire.x, layout.campfire.z, 5f, 0f);
            for (int i = 0; i < layout.torches.Length; i++)
                reveal.Sources[i + 2] = new Vector4(layout.torches[i].x,
                    layout.torches[i].z, 6.2f, 0f);
            var controller = controllerObject.AddComponent<OrcbandsController>();
            controller.Worker = worker.transform;
            controller.SelectionRing = ringObject.transform;
            controller.TreeTargetRing = targetRing.transform;
            controller.GameCamera = camera;
            controller.Ground = ground.GetComponent<Collider>();
            controller.Reveal = reveal;
            var review = controllerObject.AddComponent<CharacterReview>();
            review.Character = worker.GetComponent<CharacterPresentation>();
            review.View = camera; review.Ground = controller.Ground; review.Reveal = reveal;
            review.CampfireFeet = fireGround + new Vector3(1.3f, 0f, 1.1f);
            Directory.CreateDirectory("Assets/Scenes");
            if (!EditorSceneManager.SaveScene(scene, ScenePath))
                throw new InvalidOperationException("Unable to save Unity forest scene");
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            Debug.Log("Orcbands Unity: approved layout, 244 pines, colored ground, "+
                layout.resourceCount+" resources, vegetation, rocks, fire and RTS perspective camera");
        }

        private static Material SavedMaterial(string name, Material material)
        {
            string path = Generated + name + ".mat";
            if (AssetDatabase.LoadAssetAtPath<Material>(path) != null)
                AssetDatabase.DeleteAsset(path);
            AssetDatabase.CreateAsset(material, path);
            return material;
        }

        private static GameObject ColoredMesh(string name, string key, Material material, bool collider)
        {
            TextAsset asset = AssetDatabase.LoadAssetAtPath<TextAsset>(Generated + key + ".bytes");
            if (asset == null) throw new InvalidOperationException("Missing generated mesh " + key);
            Mesh mesh;
            using (var input = new BinaryReader(new MemoryStream(asset.bytes)))
            {
                int n = input.ReadInt32();
                if (n <= 0 || n % 3 != 0 || asset.bytes.LongLength != 4L + 24L * n)
                    throw new InvalidOperationException("Malformed generated " + key);
                var verts = new Vector3[n];
                var colors = new Color[n];
                var triangles = new int[n];
                for (int i = 0; i < n; i++)
                {
                    verts[i] = new Vector3(input.ReadSingle(), input.ReadSingle(), input.ReadSingle());
                    colors[i] = new Color(input.ReadSingle(), input.ReadSingle(), input.ReadSingle());
                    triangles[i] = i;
                }
                mesh = new Mesh { name = name, indexFormat = IndexFormat.UInt32 };
                mesh.vertices = verts;
                mesh.colors = colors;
                mesh.triangles = triangles;
                mesh.RecalculateNormals();
                mesh.RecalculateBounds();
            }
            string path = Generated + key + ".asset";
            if (AssetDatabase.LoadAssetAtPath<Mesh>(path) != null) AssetDatabase.DeleteAsset(path);
            AssetDatabase.CreateAsset(mesh, path);
            var go = new GameObject(name);
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = go.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.receiveShadows = true;
            renderer.shadowCastingMode = ShadowCastingMode.Off;
            if (collider) go.AddComponent<MeshCollider>().sharedMesh = mesh;
            return go;
        }

        private static Vector3 Surface(GameObject ground, float x, float z)
        {
            if (ground.GetComponent<Collider>().Raycast(
                new Ray(new Vector3(x, 45f, z), Vector3.down), out RaycastHit hit, 110f))
                return hit.point;
            throw new InvalidOperationException("No terrain at " + x + ", " + z);
        }

        private static void SetColor(GameObject obj, Color color, bool unlit = false)
        {
            Shader shader = Shader.Find(unlit ? "Unlit/Color" : "Standard");
            if (shader == null) throw new InvalidOperationException("Missing color shader");
            obj.GetComponent<Renderer>().sharedMaterial = new Material(shader) { color = color };
        }

        private static GameObject Part(Transform parent, PrimitiveType primitive,
            Vector3 position, Vector3 scale, Color color, bool unlit = false)
        {
            var part = GameObject.CreatePrimitive(primitive);
            part.transform.SetParent(parent, false);
            part.transform.localPosition = position;
            part.transform.localScale = scale;
            UnityEngine.Object.DestroyImmediate(part.GetComponent<Collider>());
            SetColor(part, color, unlit);
            return part;
        }

        private static void ApplyWorldMaterials(GameObject obj, Shader shader)
        {
            foreach (var renderer in obj.GetComponentsInChildren<MeshRenderer>())
            {
                var materials = renderer.sharedMaterials;
                for (int i = 0; i < materials.Length; i++)
                {
                    Material source = materials[i];
                    if (source == null || !source.HasProperty("_Color")) continue;
                    // Key by original material name and actual color, not by
                    // distance band; all trees retain their authored palette.
                    string key = source.name.Replace('/', '_') + "-" +
                        ColorUtility.ToHtmlStringRGB(source.color);
                    if (!Shades.TryGetValue(key, out Material replacement))
                    {
                        replacement = new Material(shader);
                        // The source MTL roof swatches look too peachy under
                        // Unity's gamma/lighting response. Match the deeper
                        // red finish from the approved Three.js hut preview.
                        if (source.name.StartsWith("roof_", StringComparison.OrdinalIgnoreCase))
                            replacement.color = new Color(
                                source.color.r * .77f, source.color.g * .64f,
                                source.color.b * .65f, source.color.a);
                        else if (source.name.IndexOf("needle", StringComparison.OrdinalIgnoreCase) >= 0)
                            // Preserve original swatch variation while keeping
                            // spruce greens deep, rather than mint/lime under
                            // the otherwise strong Unity daylight response.
                            replacement.color = new Color(
                                source.color.r * .70f, source.color.g * .72f,
                                source.color.b * .62f, source.color.a);
                        else if (source.name.StartsWith("timber", StringComparison.OrdinalIgnoreCase)
                              || source.name.StartsWith("plank", StringComparison.OrdinalIgnoreCase))
                            // Source Three.js timber is dark aged wood, not the
                            // honey-gold Unity import under ambient light.
                            replacement.color = new Color(
                                source.color.r * .79f, source.color.g * .76f,
                                source.color.b * .75f, source.color.a);
                        else replacement.color = source.color;
                        if (source.name.IndexOf("needle", StringComparison.OrdinalIgnoreCase) >= 0)
                            replacement.SetFloat("_SurfaceContrast", 1.29f);
                        else if (source.name.IndexOf("bark", StringComparison.OrdinalIgnoreCase) >= 0)
                            replacement.SetFloat("_SurfaceContrast", 1.12f);
                        else if (source.name.StartsWith("roof_", StringComparison.OrdinalIgnoreCase))
                            replacement.SetFloat("_SurfaceContrast", 1.07f);
                        replacement = SavedMaterial("CampColor-" + key, replacement);
                        Shades.Add(key, replacement);
                    }
                    materials[i] = replacement;
                }
                renderer.sharedMaterials = materials;
            }
        }

        private static void AddFlicker(string name, Vector3 position,
            float radius, float intensity, float phase, Color warmthColor)
        {
            var flame = new GameObject(name);
            flame.transform.position = position;
            var light = flame.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = warmthColor;
            light.range = radius;
            light.intensity = intensity;
            light.shadows = LightShadows.None;
            var motion = flame.AddComponent<CampFlame>();
            motion.Warmth = light;
            motion.BaseIntensity = intensity;
            motion.LightColor = warmthColor;
            motion.Phase = phase;
        }

        /// <summary>GameCI custom build method, invoked separately for each target.</summary>
        public static void Build()
        {
            GenerateScene();
            BuildTarget target = EditorUserBuildSettings.activeBuildTarget;
            // GitHub Pages serves static files without Content-Encoding for
            // Unity's pre-compressed WebGL bundles. Emit uncompressed files.
            if (target == BuildTarget.WebGL)
            {
                PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
                // Use the Asset Lab's dark, landscape-oriented presentation,
                // not the white branded Unity starter template.
                PlayerSettings.WebGL.template = "PROJECT:Orcbands";
            }
            if (target != BuildTarget.WebGL && target != BuildTarget.StandaloneOSX)
                throw new InvalidOperationException("Unsupported Orcbands CI target: " + target);

            string folder = Path.GetFullPath(Path.Combine(
                Application.dataPath, "../../build", target.ToString()));
            Directory.CreateDirectory(folder);
            string output = target == BuildTarget.WebGL
                ? Path.Combine(folder, "Orcbands")
                : Path.Combine(folder, "Orcbands.app");

            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                target = target,
                locationPathName = output,
                options = BuildOptions.None
            };
            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException(
                    "Orcbands Unity build failed: " + report.summary.result);
            Debug.Log("Orcbands Unity build succeeded: " + output);
        }
    }
}
