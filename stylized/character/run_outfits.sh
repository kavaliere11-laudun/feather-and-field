#!/bin/bash
# every farmer frame in every outfit, both looks, plus the portraits for the shop
cd "$(dirname "$0")"; . ../bl/bin/activate
for o in market garden winter rodeo show; do
  for L in m f; do
    OUTFIT=$o LOOK=$L POSE=turn VIEWS=34 RES=500 timeout 900 python farmer.py 24 2>&1 | grep -E "Error|Traceback" | head -2
    OUTFIT=$o LOOK=$L timeout 3000 python farmer_sprites.py 16 2>&1 | grep -E "RENDERED|Error|Traceback" | tail -1
  done
done
echo OUTFITS_DONE
