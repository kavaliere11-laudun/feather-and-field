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
        public int slot;                 // her place in the saved list of birds
        public bool appleLover;          // the hen by the apple tree: always a Glutton

        [System.NonSerialized] public BirdRecord data;
    }
}
