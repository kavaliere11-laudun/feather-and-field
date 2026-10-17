#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; mkdir -p r/final; cd r/final
for b in rir orp leg bra; do for x in h r; do
  python ../../breed.py -- $PWD/card_${b}_${x}.png 512 $b $x > ../../f_${b}_${x}.log 2>&1
  FARM=1 python ../../breed.py -- $PWD/farm_${b}_${x}.png 320 $b $x >> ../../f_${b}_${x}.log 2>&1
  echo "$b $x $(grep -c RENDER ../../f_${b}_${x}.log)" >> ../../final.log
done; done
echo FINAL_DONE >> ../../final.log
