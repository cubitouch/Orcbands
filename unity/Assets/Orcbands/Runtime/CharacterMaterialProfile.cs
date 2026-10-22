using UnityEngine;

namespace Orcbands
{
    [CreateAssetMenu(menuName = "Orcbands/Character material palette")]
    public sealed class CharacterMaterialProfile : ScriptableObject
    {
        public Color Skin = new Color(.46f, .51f, .24f);
        public Color Cloth = new Color(.40f, .18f, .15f);
        public Color Leather = new Color(.25f, .19f, .12f);
        public Color Metal = new Color(.25f, .28f, .28f);
        public Color Bone = new Color(.73f, .68f, .49f);
        public Color Faction = new Color(.56f, .36f, .19f);
        [Range(.85f, 1.35f)] public float TonalDepth = 1f;
    }
}
