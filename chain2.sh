#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate
while pgrep -f farm_map2.py >/dev/null; do sleep 15; done
mkdir -p r/ov2 r/props; cd r/ov2
for k in rir orp leg sil bra empty sale; do for d in 0 90; do
  python ../../overlay.py -- $PWD/ov_${k}_${d}.png $k $d > ../../logs/ov2_${k}_${d}.log 2>&1
  echo "ov $k $d $(grep -c RENDER ../../logs/ov2_${k}_${d}.log)" >> ../../chain2.log
done; done
cd ../props && python ../../props_sprites.py -- $PWD > ../../logs/props.log 2>&1; echo "props $(grep -c PROPS_DONE ../../logs/props.log)" >> ../../chain2.log
echo CHAIN2_DONE >> ../../chain2.log
