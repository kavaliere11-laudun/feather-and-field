#!/bin/bash
# The whole FarmVille-look pass: map + trees, coop overlays, front fences, frogs and grass.
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; export STYLE=fv
mkdir -p r/map4 r/ov3 r/props3
(cd r/map4 && python ../../farm_map2.py -- $PWD 1.0 > ../../fv_map.log 2>&1)
echo "map $(grep -c MAP2_DONE fv_map.log)" >> fv.log
cd r/ov3
for d in 0 90; do python ../../overlay.py -- $PWD/fence_${d}.png fence $d > ../../logs/fence_$d.log 2>&1; echo "fence $d $(grep -c RENDER ../../logs/fence_$d.log)" >> ../../fv.log; done
for k in rir orp leg sil bra empty sale; do for d in 0 90; do
  python ../../overlay.py -- $PWD/ov_${k}_${d}.png $k $d > ../../logs/ov3_${k}_${d}.log 2>&1
  echo "ov $k $d $(grep -c RENDER ../../logs/ov3_${k}_${d}.log)" >> ../../fv.log
done; done
cd ../props3 && python ../../props_sprites.py -- $PWD > ../../logs/props3.log 2>&1; echo "props $(grep -c PROPS_DONE ../../logs/props3.log)" >> ../../fv.log
echo FV_DONE >> ../../fv.log
