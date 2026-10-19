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
        public bool appleLover;          // the hen by the apple tree: always a Glutton, and she lives by the tree, not in the coop

        [System.NonSerialized] public BirdRecord data;
        [System.NonSerialized] public HenWander wander;
        [System.NonSerialized] public float layTimer;
        [System.NonSerialized] public Stage shownStage = Stage.Adult;    // which models she is drawn with

        public bool InYard { get { return !appleLover; } }
    }
}
