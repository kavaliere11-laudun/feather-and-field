#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; cd r
python ../plot.py -- $PWD/plot_barn.png barn 680 >> ../batch2.log 2>&1
python ../plot.py -- $PWD/plot_pagoda.png pagoda 680 >> ../batch2.log 2>&1
export FARM=1
python ../rir.py -- $PWD/farm_rir.png 288 >> ../batch2.log 2>&1
while read name c1 c2 c3 t1 t2 t3; do
  python ../silkie2.py -- $PWD/farm_sil_$name.png $c1 $c2 $c3 $t1 $t2 $t3 288 >> ../batch2.log 2>&1
done <<'LIST'
white 0.9 0.88 0.84 0.95 0.94 0.9
black 0.018 0.018 0.022 0.03 0.04 0.06
buff 0.72 0.40 0.11 0.85 0.55 0.2
partridge 0.32 0.17 0.06 0.12 0.07 0.03
blue 0.18 0.22 0.28 0.28 0.32 0.38
LIST
echo BATCH2_DONE >> ../batch2.log
