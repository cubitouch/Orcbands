using UnityEngine;

namespace Orcbands
{
    /// <summary>One tool in the same calibrated right-hand socket; no gameplay colliders.</summary>
    public sealed class WorkerTools : MonoBehaviour
    {
        public GameObject Axe, Pickaxe;
        public bool Mining { get; private set; }
        public void Equip(bool mining)
        {
            Mining = mining;
            if (Axe != null) Axe.SetActive(!mining);
            if (Pickaxe != null) Pickaxe.SetActive(mining);
        }
    }
}
