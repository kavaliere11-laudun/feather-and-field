#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate
cd r/map && python ../../farm_map.py -- $PWD/farm_map.png $PWD/farm_map.json 1.0 > ../../map_full.log 2>&1
echo "map $(grep -c RENDER ../../map_full.log)" >> ../../maps.log
cd ../ov
for k in rir orp leg sil bra empty sale; do for d in 0 90; do
  python ../../overlay.py -- $PWD/ov_${k}_${d}.png $k $d > ../../ov_${k}_${d}.log 2>&1
  echo "ov $k $d $(grep -c RENDER ../../ov_${k}_${d}.log)" >> ../../maps.log
done; done
echo MAPS_DONE >> ../../maps.log
