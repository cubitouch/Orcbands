using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace Orcbands.Editor
{
    // Vendor models are provided by the separate private asset repository.
    // Neither their prefabs nor their color atlases are committed to Orcbands.
    internal static class LicensedCharacterFactory
    {
        private const string Prefabs =
            "Assets/Synty/PolygonMiniFantasyCharacters/Prefabs/Characters/";
        private const string Generated = "Assets/Orcbands/Generated/";
        private static readonly string[] Roles =
        {
            "SM_Chr_Dungeon_GoblinMale_01.prefab",
            "SM_Chr_Dungeon_GoblinWarriorMale_01.prefab",
            "SM_Chr_Dungeon_GoblinShaman_01.prefab"
        };

        public static GameObject TryCreate(Vector3 feet, int startingRole = 0)
        {
            if (startingRole < 0 || startingRole >= Roles.Length) throw new ArgumentOutOfRangeException(nameof(startingRole));
            bool required = Environment.GetEnvironmentVariable("ORCBANDS_REQUIRE_PRIVATE_ASSETS") == "1";
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Prefabs + Roles[0]);
            if (prefab == null)
            {
                if (required) throw new InvalidOperationException(
                    "Required mini-orc prefab missing. Restore the private " +
                    "Synty checkout into unity/Assets/Synty before building.");
                Debug.Log("Orcbands: no private character assets; using original worker proxy.");
                return null;
            }

            var shader = Shader.Find("Orcbands/CharacterMatte");
            if (shader == null) throw new InvalidOperationException("Missing character matte shader");
            var root = new GameObject("Worker");
            root.transform.position = feet;
            var collider = root.AddComponent<CapsuleCollider>();
            collider.height = 2.10f;
            collider.radius = .54f;
            collider.center = new Vector3(0f, 1.05f, 0f);
            var presentation = root.AddComponent<CharacterPresentation>();
            var mount = new GameObject("Model mount — Synty mini-orcs").transform;
            mount.SetParent(root.transform, false);
            presentation.ModelMount = mount;
            presentation.TargetHeight = 2.0f;
            presentation.StartingRole = startingRole;
            presentation.ReviewRoles = new Transform[Roles.Length];
            var sharedMaterials = new Dictionary<Material, Material>();

            for (int role = 0; role < Roles.Length; role++)
            {
                prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Prefabs + Roles[role]);
                if (prefab == null)
                    throw new InvalidOperationException("Synty prefab missing: " + Roles[role]);

                var model = (GameObject)PrefabUtility.InstantiatePrefab(prefab, mount);
                model.name = new[] { "Worker mini-orc", "Warrior mini-orc", "Shaman mini-orc" }[role];
                model.transform.localPosition = Vector3.zero;
                model.transform.localRotation = Quaternion.identity;
                // Retain the authored scale, rig hierarchy, hard normals and UVs.
                foreach (var animator in model.GetComponentsInChildren<Animator>(true))
                    animator.applyRootMotion = false;
                foreach (var childCollider in model.GetComponentsInChildren<Collider>(true))
                    UnityEngine.Object.DestroyImmediate(childCollider);
                // The Synty FBX contains many inactive characters. Only adapt
                // the renderer(s) of this prefab's visible character; preserve
                // inactive shared meshes without introducing extra dependencies.
                foreach (var renderer in model.GetComponentsInChildren<Renderer>())
                {
                    if (!renderer.enabled) continue;
                    var originals = renderer.sharedMaterials;
                    var replacements = new Material[originals.Length];
                    for (int i = 0; i < originals.Length; i++)
                    {
                        if (originals[i] == null)
                            throw new InvalidOperationException("Missing material on " + renderer.name);
                        if (!sharedMaterials.TryGetValue(originals[i], out var mapped))
                        {
                            mapped = AdaptAtlas(originals[i], shader);
                            sharedMaterials.Add(originals[i], mapped);
                        }
                        replacements[i] = mapped;
                    }
                    renderer.sharedMaterials = replacements;
                    renderer.shadowCastingMode = ShadowCastingMode.On;
                    renderer.receiveShadows = true;
                }
                presentation.ReviewRoles[role] = model.transform;
                model.SetActive(role == startingRole);
            }
            bool animated = WorkerAnimationFactory.HasSources();
            if (!animated && Environment.GetEnvironmentVariable("ORCBANDS_REQUIRE_PRIVATE_ASSETS") == "1")
                throw new InvalidOperationException("Restore the private Mixamo worker animations before building");
            Avatar bodyAvatar = animated ? WorkerAnimationFactory.CreateAvatar(
                AssetDatabase.LoadAssetAtPath<GameObject>(Prefabs + Roles[startingRole]),
                presentation.ReviewRoles[startingRole].name) : null;
            var rest = AssetDatabase.LoadAssetAtPath<WorkerRestProfile>(
                "Assets/Editor/WorkerRestProfile.asset");
            if (rest == null) throw new InvalidOperationException("Missing owned worker rest profile");
            rest.Apply(presentation.ReviewRoles[startingRole]);
            presentation.Apply();
            presentation.FitRestPose(presentation.TargetHeight);
            // Add the tool after fitting, so the axe cannot distort character height/feet.
            AttachWorkerAxe(root, presentation.ReviewRoles[startingRole], rest, shader, sharedMaterials);
            if (animated) WorkerAnimationFactory.Configure(root, presentation.ReviewRoles[startingRole], bodyAvatar);
            Debug.Log("Orcbands: using licensed Synty mini-orc with original gameplay root.");
            return root;
        }


        /// <summary>Attach the actual POLYGON MINI axe prefab to the goblin hand_r bone.</summary>
        private static void AttachWorkerAxe(GameObject root, Transform worker, WorkerRestProfile rest, Shader shader,
            Dictionary<Material, Material> sharedMaterials)
        {
            const string axePath =
                "Assets/Synty/PolygonMiniFantasyCharacters/Prefabs/Props/SM_Prop_Axe_01.prefab";
            GameObject axePrefab = AssetDatabase.LoadAssetAtPath<GameObject>(axePath);
            if (axePrefab == null)
                throw new InvalidOperationException("Purchased Synty axe prefab missing: " + axePath);

            Transform grip = rest.CreateGrip(worker);
            var axe = (GameObject)PrefabUtility.InstantiatePrefab(axePrefab, grip);
            axe.name = "Worker hand axe (Synty)";
            // Fixed calibration from the actual Prop_Axe_01 shaft. Socket pose
            // and grip point are editable, independent of bounds and world facing.
            if (rest.AxeAuthoredLength <= 0f || rest.AxeWorldLength <= 0f)
                throw new InvalidOperationException("Invalid axe length calibration");
            float inheritedScale = Mathf.Abs(grip.lossyScale.x);
            float scale = rest.AxeWorldLength / (rest.AxeAuthoredLength * inheritedScale);
            axe.transform.localScale = Vector3.one * scale;
            axe.transform.localRotation = Quaternion.identity;
            axe.transform.localPosition = -rest.AxeGripPoint * scale;

            foreach (var collider in axe.GetComponentsInChildren<Collider>(true))
                UnityEngine.Object.DestroyImmediate(collider);
            foreach (var animator in axe.GetComponentsInChildren<Animator>(true))
                UnityEngine.Object.DestroyImmediate(animator);
            foreach (var renderer in axe.GetComponentsInChildren<Renderer>(true))
            {
                var originals = renderer.sharedMaterials;
                var replacements = new Material[originals.Length];
                for (int i = 0; i < originals.Length; i++)
                {
                    if (originals[i] == null)
                        throw new InvalidOperationException("Synty axe has a missing material");
                    if (!sharedMaterials.TryGetValue(originals[i], out var mapped))
                    {
                        mapped = AdaptAtlas(originals[i], shader);
                        sharedMaterials.Add(originals[i], mapped);
                    }
                    replacements[i] = mapped;
                }
                renderer.sharedMaterials = replacements;
                renderer.shadowCastingMode = ShadowCastingMode.On;
                renderer.receiveShadows = true;
            }
            const string pickaxePath = "Assets/Synty/PolygonGeneric/Prefabs/Weapons/SM_Gen_Wep_Pickaxe_01.prefab";
            var pickaxePrefab = AssetDatabase.LoadAssetAtPath<GameObject>(pickaxePath);
            if (pickaxePrefab == null) throw new InvalidOperationException("Purchased Synty pickaxe is missing");
            var pickaxe = (GameObject)PrefabUtility.InstantiatePrefab(pickaxePrefab, grip);
            pickaxe.name = "Worker hand pickaxe (Synty)";
            // The generic pickaxe is Y-up, with its shaft grip at the authored origin.
            // Scale the imported mesh to 90 cm before the model mount's inherited scale.
            const float pickaxeAuthoredLength = .73740099f;
            float pickScale = .90f / (pickaxeAuthoredLength * inheritedScale);
            pickaxe.transform.localScale = Vector3.one * pickScale;
            pickaxe.transform.localPosition = Vector3.zero; pickaxe.transform.localRotation = Quaternion.identity;
            foreach (var c in pickaxe.GetComponentsInChildren<Collider>(true)) UnityEngine.Object.DestroyImmediate(c);
            foreach (var renderer in pickaxe.GetComponentsInChildren<Renderer>(true)) {
                var originals = renderer.sharedMaterials; var replacements = new Material[originals.Length];
                for (int i = 0; i < originals.Length; i++) {
                    if (!sharedMaterials.TryGetValue(originals[i], out var mapped)) {
                        mapped = AdaptAtlas(originals[i], shader); sharedMaterials.Add(originals[i], mapped);
                    }
                    replacements[i] = mapped;
                }
                renderer.sharedMaterials = replacements; renderer.shadowCastingMode = ShadowCastingMode.On; renderer.receiveShadows = true;
            }
            var tools = root.AddComponent<WorkerTools>(); tools.Axe = axe; tools.Pickaxe = pickaxe; tools.Equip(false);
        }

        private static Material AdaptAtlas(Material original, Shader shader)
        {
            var atlas = FindAtlas(original);
            if (atlas == null)
                throw new InvalidOperationException("No Synty color atlas for " + original.name);
            if (!AssetDatabase.TryGetGUIDAndLocalFileIdentifier(
                original, out string guid, out long localId))
                throw new InvalidOperationException("Cannot identify Synty material " + original.name);
            string path = Generated + "Synty-" + guid + "-" + localId + ".mat";
            var matte = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (matte == null) {
                matte = new Material(shader) { name = "Mini-orc matte — " + original.name };
                AssetDatabase.CreateAsset(matte, path);
            }
            matte.shader = shader;
            // Synty's color atlas is authored art; don't multiply it by our
            // solid-color proxy palette or discard its UV mapping.
            matte.SetTexture("_MainTex", atlas);
            matte.SetColor("_Color", Color.white);
            matte.SetFloat("_SurfaceContrast", 1f);
            EditorUtility.SetDirty(matte);
            return matte;
        }

        private static Texture FindAtlas(Material material)
        {
            string[] colorMaps = { "_Albedo_Map", "_MainTex", "_BaseMap", "_BaseColorMap" };
            foreach (string key in colorMaps)
                if (material.HasProperty(key) && material.GetTexture(key) != null)
                    return material.GetTexture(key);

            // The private materials serialize _Albedo_Map even when their
            // original shader is incompatible with our built-in renderer.
            var serialized = new SerializedObject(material);
            var entries = serialized.FindProperty("m_SavedProperties.m_TexEnvs");
            if (entries != null)
            {
                foreach (string key in colorMaps)
                {
                    for (int i = 0; i < entries.arraySize; i++)
                    {
                        var item = entries.GetArrayElementAtIndex(i);
                        var name = item.FindPropertyRelative("first");
                        var texture = item.FindPropertyRelative("second.m_Texture");
                        if (name != null && name.stringValue == key && texture != null &&
                            texture.objectReferenceValue is Texture found)
                            return found;
                    }
                }
            }
            return null;
        }
    }
}

