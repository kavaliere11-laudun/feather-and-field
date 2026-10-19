using UnityEngine;

namespace FeatherField
{
    /// <summary>
    /// Who a bird on the farm is. The farm (FarmGame) fills in her record from the save when the game starts;
    /// tapping her shows her card.
    /// </summary>
    public class BirdInfo : MonoBehaviour
    {
        public bool rooster;
        public int slot;                 // the birds the farm starts with: their place in the starting flock (saved as id slot + 1)
        public bool appleLover;          // the farm's first Glutton: she lives in the coop and trots out to the apple tree

        [System.NonSerialized] public BirdRecord data;
        [System.NonSerialized] public HenWander wander;
        [System.NonSerialized] public float layTimer;
        [System.NonSerialized] public Stage shownStage = Stage.Adult;    // which models she is drawn with
    }
}
