#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; cd r
while read name c1 c2 c3 t1 t2 t3; do
  python ../silkie2.py -- $PWD/sil_$name.png $c1 $c2 $c3 $t1 $t2 $t3 >> ../batch3.log 2>&1
done <<'LIST'
buff 0.5 0.24 0.05 0.62 0.33 0.08
partridge 0.13 0.06 0.022 0.035 0.018 0.008
blue 0.055 0.075 0.1 0.09 0.11 0.14
grey 0.14 0.145 0.155 0.2 0.21 0.22
lavender 0.2 0.18 0.22 0.28 0.26 0.3
red 0.2 0.028 0.01 0.28 0.05 0.015
LIST
export FARM=1
while read name c1 c2 c3 t1 t2 t3; do
  python ../silkie2.py -- $PWD/farm_sil_$name.png $c1 $c2 $c3 $t1 $t2 $t3 288 >> ../batch3.log 2>&1
done <<'LIST'
buff 0.5 0.24 0.05 0.62 0.33 0.08
partridge 0.13 0.06 0.022 0.035 0.018 0.008
blue 0.055 0.075 0.1 0.09 0.11 0.14
LIST
echo BATCH3_DONE >> ../batch3.log
