#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; cd r/b
for b in rir orp leg bra; do for x in h r; do
  python ../../breed.py -- $PWD/${b}_${x}.png ${RES:-384} $b $x > ../../b_${b}_${x}.log 2>&1
  echo "$b $x $(grep -E 'RENDER|Error' ../../b_${b}_${x}.log | head -1)" >> ../../breeds.log
done; done
echo BREEDS_DONE >> ../../breeds.log
