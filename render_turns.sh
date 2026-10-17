#!/bin/bash
# Turn frames (turn1..3) for every v2 adult. Resumable: skips any picture already on disk.
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate
missing() { local P="" pp; for pp in turn1 turn2 turn3; do [ -f r/spr2/${pp}_$1_$2.png ] || P="$P,$pp"; done; echo ${P#,}; }
for b in rir orp leg bra; do for s in h r; do
  P=$(missing $b $s); [ -n "$P" ] && FARM=1 SAMPLES=32 python hen2.py -- $PWD/r/spr2 $b $s $P 512 >> logs/turn_${b}_${s}.log 2>&1
done; done
for c in white black blue buff partridge grey splash cuckoo red paint lavender; do for s in h r; do
  P=$(missing sil_$c $s); [ -n "$P" ] && FARM=1 SAMPLES=20 python silkie_v2.py -- $PWD/r/spr2 $c $s $P 384 >> logs/turn_sil_${c}_${s}.log 2>&1
done; done
echo TURNS_DONE >> logs/spr2.done
