# Feather & Field: character design (stage 0)

The expressive hen and rooster, built in Blender (Python, bpy 5.x) from the shared helpers in `../common.py`.

- `hen_char.py`: the character model with a posable face (eyelids, pupils, brows, beak, blush, comb flop).
  - `EXPR=<name> RES=800 python hen_char.py 48` renders a close-up of one expression to `out/face_<name>.png`.
  - `MODE=turn KEY=rir_h RES=900 python hen_char.py 48` renders the front, three-quarter, side and back views (`KEY=rir_r` for the rooster).
- `char_sheets.py`: lays the renders out into the two sheets in `sheets/` (needs Pillow and numpy).

Expressions: happy, joyful, hungry, sleepy, surprised, sad, grumpy, in love, mischievous (rebels), proud (good mums).

- `farmer.py`: the farmer, in two looks (`LOOK=m` or `LOOK=f`), with a posable body and the same kind of face rig plus a mouth.
  - `MODE=mood MOOD=panic RES=800 python farmer.py 48` renders one of the six moods (happy, telloff, worried, panic, cuddle, feed).
  - `LOOK=f POSE=turn EXPR=neutral VIEWS=front,34,side,back python farmer.py 48` renders a turnaround; `MODE=lineup` renders both farmers next to a hen.
- `farmer_sheets.py`: lays out `sheets/sheet_farmer.png` and `sheets/sheet_farmer_moods.png`.

Nunito is used under the SIL Open Font License.
