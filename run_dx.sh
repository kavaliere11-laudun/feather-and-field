#!/bin/bash
# Deluxe coops: every coop in both orientations, and the deluxe front fence, at twice the map's detail (like run_ov4.sh)
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; export STYLE=fv OVSCALE=2
mkdir -p r/ov4 logs; cd r/ov4
for d in 0 90; do python ../../overlay.py -- $PWD/fence_dx_${d}.png fence_dx $d > ../../logs/fencedx_$d.log 2>&1; echo "fence_dx $d $(grep -c Saved ../../logs/fencedx_$d.log)"; done
for k in rir orp sil leg bra; do for d in 0 90; do
  python ../../overlay.py -- $PWD/ov_${k}_dx_${d}.png ${k}_dx $d > ../../logs/ovdx_${k}_${d}.log 2>&1; echo "ov ${k}_dx $d $(grep -c Saved ../../logs/ovdx_${k}_${d}.log)"
done; done
cd ../..; /usr/bin/python3 - <<'P'
from PIL import Image
import glob, os
for p in sorted(glob.glob('r/ov4/*_dx_*.png')):
    Image.open(p).save('game2/img/ov/' + os.path.basename(p)[:-4] + '.webp', 'WEBP', quality=85, method=6)
    print('packed', os.path.basename(p))
P
echo DX_DONE
