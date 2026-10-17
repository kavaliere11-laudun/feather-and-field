#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; S=$PWD; O=$PWD/r/spr; export FARM=1
COLS="white black blue buff partridge grey splash cuckoo red paint lavender"
run() { local out=$1; shift; [ -f "$O/$out.png" ] && return; "$@" > "$S/logs/$out.log" 2>&1; echo "$out $(grep -c RENDER $S/logs/$out.log)" >> "$S/walk.log"; }
for w in walk1 walk2; do
  for b in rir orp leg bra; do for x in h r; do run ${w}_${b}_$x python breed.py -- $O/${w}_${b}_$x.png 320 $b $x $w; done; done
  for c in $COLS; do for x in h r; do run ${w}_sil_${c}_$x python silkie3.py -- $O/${w}_sil_${c}_$x.png 320 $c $x $w; done; done
  for k in rir orp leg bra; do run chick_${k}_$w python chick.py -- $O/chick_${k}_$w.png 256 $k $w; done
  for c in $COLS; do run chick_sil_${c}_$w python chick.py -- $O/chick_sil_${c}_$w.png 256 sil_$c $w; done
done
echo WALK_DONE >> "$S/walk.log"
