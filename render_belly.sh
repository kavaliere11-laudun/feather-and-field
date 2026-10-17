#!/bin/bash
# Re-render the four v2 breeds (hens and roosters) after the belly fix, into r/spr2b. Resumable: skips pictures already on disk.
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; mkdir -p r/spr2b logs
FARMP="stand walk0 walk1 walk2 walk3 walk4 walk5 walk6 walk7 peck0 peck1 peck2 look1 look2 scratch0 scratch1 sit turn1 turn2 turn3"
for b in rir orp leg bra; do for s in h r; do
  P=""; for pp in $FARMP $([ "$s" = r ] && echo crow); do [ -f r/spr2b/${pp}_${b}_${s}.png ] || P="$P,$pp"; done; P=${P#,}
  [ -n "$P" ] && FARM=1 SAMPLES=32 python hen2.py -- $PWD/r/spr2b $b $s $P 512 >> logs/belly_${b}_${s}.log 2>&1
  P=""; for pp in card face1 face2 face3; do [ -f r/spr2b/${pp}_${b}_${s}.png ] || P="$P,$pp"; done; P=${P#,}
  [ -n "$P" ] && SAMPLES=48 python hen2.py -- $PWD/r/spr2b $b $s $P 512 >> logs/belly_${b}_${s}.log 2>&1
done; done
echo BELLY_DONE >> logs/belly.done
