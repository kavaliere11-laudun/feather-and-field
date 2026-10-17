#!/bin/bash
# Every bird sprite the game needs that is not rendered yet. Skips files that already exist, so it can be re-run.
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; mkdir -p r/spr; S=$PWD; O=$PWD/r/spr
COLS="white black blue buff partridge grey splash cuckoo red paint lavender"
run() { # out, then the command
  local out=$1; shift
  [ -f "$O/$out.png" ] && return
  "$@" > "$S/logs/$out.log" 2>&1
  echo "$out $(grep -c RENDER $S/logs/$out.log)" >> "$S/sprites.log"
}
mkdir -p logs
for c in $COLS; do for x in h r; do
  FARM=1 run farm_sil_${c}_$x python silkie3.py -- $O/farm_sil_${c}_$x.png 320 $c $x
done; done
for k in rir orp leg bra; do FARM=1 run chick_$k python chick.py -- $O/chick_$k.png 256 $k; done
for c in $COLS; do FARM=1 run chick_sil_$c python chick.py -- $O/chick_sil_$c.png 256 sil_$c; done
for b in rir orp leg bra; do for x in h r; do
  FARM=1 run peck_${b}_$x python breed.py -- $O/peck_${b}_$x.png 320 $b $x peck
done; done
for c in $COLS; do for x in h r; do
  FARM=1 run peck_sil_${c}_$x python silkie3.py -- $O/peck_sil_${c}_$x.png 320 $c $x peck
done; done
for c in $COLS; do for x in h r; do
  run card_sil_${c}_$x python silkie3.py -- $O/card_sil_${c}_$x.png 512 $c $x
done; done
echo SPRITES_DONE >> "$S/sprites.log"
