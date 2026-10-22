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
        [System.Serializable] private class ReportData
        {
            public Vector3 feet, unitScreen, destinationScreen, camera;
            public bool selected;
            public float groundError;
        }
        public void Report(string unused)
        {
            Vector3 feet = Character.transform.position;
            Vector3 destination = feet + new Vector3(2f,0f,.5f);
            if (Ground.Raycast(new Ray(destination + Vector3.up * 45f, Vector3.down), out RaycastHit target,100f))
                destination = target.point;
            Ground.Raycast(new Ray(feet + Vector3.up * 45f,Vector3.down), out RaycastHit surface,100f);
            var controller = GetComponent<OrcbandsController>();
            Debug.Log("CHARACTER_REPORT:" + JsonUtility.ToJson(new ReportData {
                feet = feet, unitScreen = View.WorldToViewportPoint(feet + Vector3.up * .8f),
                destinationScreen = View.WorldToViewportPoint(destination),
                camera = View.transform.position, selected = controller.IsWorkerSelected,
                groundError = Mathf.Abs(feet.y - surface.point.y) }));
        }
        public void Capture(string preset)
        {
            Vector3 feet = originalFeet;
            if (preset == "warm") feet = CampfireFeet;
            if (preset == "cool") feet = new Vector3(5.5f, 0f, 4.5f);
            if (Ground.Raycast(new Ray(new Vector3(feet.x,45f,feet.z),Vector3.down), out RaycastHit hit,100f))
                feet.y = hit.point.y;
            Character.transform.position = feet;
            Character.transform.rotation = Quaternion.Euler(0f, -35f, 0f);
            Reveal.SetFogOfWar(!preset.EndsWith("off"));
            Character.ShowReviewRole(preset.StartsWith("warrior") ? 1 : preset.StartsWith("shaman") ? 2 : 0);
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
