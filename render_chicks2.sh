#!/bin/bash
# v2 chicks for every breed and Silkie colour. Resumable.
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; mkdir -p r/chick2
while pgrep -f "render_turns.sh|render_map2x.sh" > /dev/null; do sleep 20; done
for k in rir orp leg bra sil_white sil_black sil_blue sil_buff sil_partridge sil_grey sil_splash sil_cuckoo sil_red sil_paint sil_lavender; do
  P=""; [ -f r/chick2/chick_$k.png ] || P="stand"
  for pp in walk0 walk1 walk2 walk3 walk4 walk5 walk6 walk7 peck0 peck1 peck2 look1 look2 scratch0 scratch1 turn1 turn2 turn3; do
    [ -f r/chick2/chick_${k}_$pp.png ] || P="$P,$pp"; done
  P=${P#,}; [ -n "$P" ] && FARM=1 SAMPLES=24 python chick_v2.py -- $PWD/r/chick2 $k $P 320 >> logs/chick2_$k.log 2>&1
done
echo CHICKS2_DONE >> logs/spr2.done
