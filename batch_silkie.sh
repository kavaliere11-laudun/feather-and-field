#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate
cd r
while read name c1 c2 c3 t1 t2 t3; do
  [ -f sil_$name.png ] && [ "$name" != white ] && continue
  python ../silkie2.py -- $PWD/sil_$name.png $c1 $c2 $c3 $t1 $t2 $t3 >> ../batch.log 2>&1
done <<'LIST'
black 0.018 0.018 0.022 0.03 0.04 0.06
buff 0.72 0.40 0.11 0.85 0.55 0.2
blue 0.18 0.22 0.28 0.28 0.32 0.38
partridge 0.32 0.17 0.06 0.12 0.07 0.03
lavender 0.5 0.46 0.52 0.62 0.58 0.64
grey 0.42 0.43 0.45 0.55 0.56 0.58
red 0.45 0.09 0.03 0.55 0.14 0.05
LIST
echo BATCH_DONE >> ../batch.log
