using UnityEngine;

namespace Orcbands
{
    /// <summary>Explicit art-review commands; does not run during normal gameplay.</summary>
    public sealed class CharacterReview : MonoBehaviour
    {
        public CharacterPresentation Character;
        public Camera View;
        public Collider Ground;
        public CampReveal Reveal;
        public Vector3 CampfireFeet;
        private Vector3 originalFeet;
        private void Start() { originalFeet = Character.transform.position; }
        public void Capture(string preset)
        {
            Vector3 feet = originalFeet;
            if (preset == "warm") feet = CampfireFeet;
            if (preset == "cool") feet = new Vector3(5.5f, 0f, 4.5f);
            if (Ground.Raycast(new Ray(new Vector3(feet.x,45f,feet.z),Vector3.down), out RaycastHit hit,100f))
                feet.y = hit.point.y;
            Character.transform.position = feet;
            Character.transform.rotation = Quaternion.Euler(0f, 195f, 0f);
            Reveal.SetFogOfWar(!preset.EndsWith("off"));
            Character.ShowReviewRole(preset == "warrior" ? 1 : preset == "shaman" ? 2 : 0);
            Vector3 target = new Vector3(0f,0f,-1f);
            Vector3 offset = new Vector3(-20f,22f,27f);
            if (preset == "out") offset *= 1.65f;
            if (preset == "close" || preset == "warm" || preset == "cool" || preset == "warrior" || preset == "shaman")
            {
                target = feet + Vector3.up * .75f;
                offset = new Vector3(-3.2f,2.1f,4.1f);
            }
            View.transform.position = target + offset;
            View.transform.LookAt(target);
        }
    }
}
