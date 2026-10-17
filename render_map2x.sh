#!/bin/bash
# The village map and its trees at twice the detail. Resumable: skips strips and trees already rendered.
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; export STYLE=fv MAPSCALE=2
D=$PWD/r/map7; N=12
while pgrep -f render_turns.sh > /dev/null; do sleep 20; done
for i in $(seq 0 $((N - 1))); do
  [ -f $D/farm_map2x_part$i.png ] && grep -q "farm_map2x_part$i.png\"" $D/strips2x.json 2>/dev/null && continue
  python render_parts.py -- $D strip $i $N >> logs/map2x.log 2>&1
done
[ -f $D/farm_map2x.png ] || /usr/bin/python3 stitch_map.py $D 2x >> logs/map2x.log 2>&1
python render_parts.py -- $D trees >> logs/map2x.log 2>&1
echo MAP2X_DONE >> logs/spr2.done
