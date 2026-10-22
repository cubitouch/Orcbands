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

        public static GameObject TryCreate(Vector3 feet)
        {
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
            collider.height = 1.65f;
            collider.radius = .48f;
            collider.center = new Vector3(0f, .825f, 0f);
            var presentation = root.AddComponent<CharacterPresentation>();
            var mount = new GameObject("Model mount — Synty mini-orcs").transform;
            mount.SetParent(root.transform, false);
            presentation.ModelMount = mount;
            presentation.TargetHeight = 1.525f;
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
                foreach (var renderer in model.GetComponentsInChildren<Renderer>(true))
                {
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
                model.SetActive(role == 0);
            }
            presentation.Apply();
            presentation.FitRestPose(presentation.TargetHeight);
            Debug.Log("Orcbands: using licensed Synty mini-orc with original gameplay root.");
            return root;
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
            if (AssetDatabase.LoadAssetAtPath<Material>(path) != null)
                AssetDatabase.DeleteAsset(path);
            var matte = new Material(shader) { name = "Mini-orc matte — " + original.name };
            // Synty's color atlas is authored art; don't multiply it by our
            // solid-color proxy palette or discard its UV mapping.
            matte.SetTexture("_MainTex", atlas);
            matte.SetColor("_Color", Color.white);
            matte.SetFloat("_SurfaceContrast", 1f);
            AssetDatabase.CreateAsset(matte, path);
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
