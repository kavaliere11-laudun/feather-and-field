# Feather & Field: character design (stage 0)

The expressive hen and rooster, built in Blender (Python, bpy 5.x) from the shared helpers in `../common.py`.

- `hen_char.py`: the character model with a posable face (eyelids, pupils, brows, beak, blush, comb flop).
  - `EXPR=<name> RES=800 python hen_char.py 48` renders a close-up of one expression to `out/face_<name>.png`.
  - `MODE=turn KEY=rir_h RES=900 python hen_char.py 48` renders the front, three-quarter, side and back views (`KEY=rir_r` for the rooster).
- `char_sheets.py`: lays the renders out into the two sheets in `sheets/` (needs Pillow and numpy).

Expressions: happy, joyful, hungry, sleepy, surprised, sad, grumpy, in love, mischievous (rebels), proud (good mums).

Nunito is used under the SIL Open Font License.
