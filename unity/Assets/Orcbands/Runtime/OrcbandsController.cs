using UnityEngine;

namespace Orcbands
{
    /// <summary>First interactive smoke-test, not yet worker AI or navigation.</summary>
    public sealed class OrcbandsController : MonoBehaviour
    {
        public Transform Worker;
        public Camera GameCamera;

        private bool selected;
        private bool hasDestination;
        private Vector3 destination;
        private const float MoveSpeed = 4.5f;

        private void Update()
        {
            if (Worker == null || GameCamera == null) return;

            if (Input.GetMouseButtonDown(0))
            {
                Ray ray = GameCamera.ScreenPointToRay(Input.mousePosition);
                selected = Physics.Raycast(ray, out RaycastHit hit, 150f) &&
                           hit.collider != null && hit.collider.transform == Worker;
            }

            if (selected && Input.GetMouseButtonDown(1))
            {
                Ray ray = GameCamera.ScreenPointToRay(Input.mousePosition);
                if (Physics.Raycast(ray, out RaycastHit hit, 150f) &&
                    hit.collider != null && hit.collider.gameObject.name == "Ground")
                {
                    destination = new Vector3(
                        Mathf.Clamp(hit.point.x, -34f, 34f),
                        1.0f,
                        Mathf.Clamp(hit.point.z, -34f, 34f));
                    hasDestination = true;
                }
            }

            if (hasDestination)
            {
                Worker.position = Vector3.MoveTowards(
                    Worker.position, destination, MoveSpeed * Time.deltaTime);
                if (Vector3.Distance(Worker.position, destination) < 0.02f)
                    hasDestination = false;
            }

            Vector3 pan = new Vector3(
                Input.GetAxisRaw("Horizontal"), 0f, Input.GetAxisRaw("Vertical"));
            if (pan.sqrMagnitude > 0.01f)
                GameCamera.transform.position += pan.normalized * (12f * Time.deltaTime);

            if (GameCamera.orthographic)
                GameCamera.orthographicSize = Mathf.Clamp(
                    GameCamera.orthographicSize - Input.mouseScrollDelta.y * 1.3f, 7f, 27f);
        }

        private void OnGUI()
        {
            GUI.Box(new Rect(15, 15, 415, 84), "ORCBANDS — Unity starter");
            GUI.Label(new Rect(26, 40, 395, 24),
                "Left-click the green worker, then right-click the ground.");
            GUI.Label(new Rect(26, 63, 395, 24),
                "WASD / arrows: pan    Scroll: zoom    Worker: " + (selected ? "selected" : "not selected"));
        }
    }
}
