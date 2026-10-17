#!/bin/bash
# coop overlays and front fences at twice the detail
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; export STYLE=fv OVSCALE=2
mkdir -p r/ov4 logs; cd r/ov4
for k in rir orp sil leg bra empty sale; do for d in 0 90; do
  python ../../overlay.py -- $PWD/ov_${k}_${d}.png $k $d > ../../logs/ov4_${k}_${d}.log 2>&1; echo "ov $k $d" >> ../../ov4.log
done; done
for d in 0 90; do python ../../overlay.py -- $PWD/fence_${d}.png fence $d > ../../logs/fence4_$d.log 2>&1; echo "fence $d" >> ../../ov4.log; done
echo DONE4 >> ../../ov4.log
