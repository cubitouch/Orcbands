using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

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

        [MenuItem("Orcbands/Generate Starter Scene")]
        public static void GenerateScene()
        {
            GameObject pine = AssetDatabase.LoadAssetAtPath<GameObject>(PinePath);
            GameObject hut = AssetDatabase.LoadAssetAtPath<GameObject>(HutPath);
            if (pine == null || hut == null)
                throw new InvalidOperationException(
                    "Orcbands imported OBJ assets are missing. Check unity/Assets/Orcbands/Art.");

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            RenderSettings.ambientLight = new Color(0.55f, 0.58f, 0.58f);
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = 22f;
            RenderSettings.fogEndDistance = 75f;
            RenderSettings.fogColor = new Color(0.39f, 0.47f, 0.42f);

            GameObject ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Ground";
            ground.transform.localScale = new Vector3(9f, 1f, 9f);
            SetColor(ground, new Color(0.28f, 0.34f, 0.22f));

            GameObject building = (GameObject)PrefabUtility.InstantiatePrefab(hut);
            building.name = "Timber Hut 01";
            building.transform.position = Vector3.zero;
            building.transform.rotation = Quaternion.Euler(0f, 185f, 0f);

            // A small playable grove slice, not the full 244-tree Three.js layout.
            // Seed and placement are stable across editor and CI runs.
            var rng = new System.Random(2302);
            for (int i = 0; i < 58; i++)
            {
                double angle = i * 2.399963229728653 + rng.NextDouble() * 0.3;
                double radius = 12.0 + rng.NextDouble() * 20.0;
                var position = new Vector3(
                    (float)(Math.Cos(angle) * radius), 0f,
                    (float)(Math.Sin(angle) * radius));
                GameObject tree = (GameObject)PrefabUtility.InstantiatePrefab(pine);
                tree.name = "Pine " + (i + 1).ToString("D2");
                tree.transform.position = position;
                tree.transform.rotation = Quaternion.Euler(0f, (float)rng.NextDouble() * 360f, 0f);
                tree.transform.localScale = Vector3.one * (0.86f + (float)rng.NextDouble() * 0.25f);
            }

            GameObject worker = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            worker.name = "Worker";
            worker.transform.position = new Vector3(2f, 1f, -4f);
            worker.transform.localScale = new Vector3(0.72f, 1f, 0.72f);
            SetColor(worker, new Color(0.32f, 0.67f, 0.27f));

            GameObject cameraObject = new GameObject("RTS Camera");
            cameraObject.tag = "MainCamera";
            Camera camera = cameraObject.AddComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 17f;
            camera.nearClipPlane = 0.1f;
            camera.farClipPlane = 180f;
            cameraObject.transform.position = new Vector3(0f, 23f, -27f);
            cameraObject.transform.LookAt(new Vector3(0f, 0f, 0f));

            GameObject sun = new GameObject("Sun");
            Light light = sun.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = new Color(1f, 0.91f, 0.78f);
            light.intensity = 1.2f;
            sun.transform.rotation = Quaternion.Euler(48f, -25f, 0f);

            var controllerObject = new GameObject("Orcbands Controller");
            var controller = controllerObject.AddComponent<OrcbandsController>();
            controller.Worker = worker.transform;
            controller.GameCamera = camera;

            Directory.CreateDirectory("Assets/Scenes");
            if (!EditorSceneManager.SaveScene(scene, ScenePath))
                throw new InvalidOperationException("Unable to save generated Orcbands starter scene.");

            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            Debug.Log("Orcbands starter scene generated: " + ScenePath);
        }

        private static void SetColor(GameObject obj, Color color)
        {
            var renderer = obj.GetComponent<Renderer>();
            var shader = Shader.Find("Standard");
            if (shader == null) shader = Shader.Find("Unlit/Color");
            if (shader == null) throw new InvalidOperationException("No built-in color shader found.");
            var material = new Material(shader) { color = color };
            renderer.sharedMaterial = material;
        }

        /// <summary>GameCI custom build method, invoked separately for each target.</summary>
        public static void Build()
        {
            GenerateScene();
            BuildTarget target = EditorUserBuildSettings.activeBuildTarget;
            // GitHub Pages serves static files without Content-Encoding for
            // Unity's pre-compressed WebGL bundles. Emit uncompressed files.
            if (target == BuildTarget.WebGL)
                PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
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
