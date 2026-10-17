#!/bin/bash
# Close-up "looking at you" pictures (face1..3) for every adult, same camera and quality as its card. Resumable.
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate
miss() { local P="" pp; for pp in face1 face2 face3; do [ -f r/spr2/${pp}_$1_$2.png ] || P="$P,$pp"; done; echo ${P#,}; }
for b in rir orp leg bra; do for s in h r; do P=$(miss $b $s); [ -n "$P" ] && SAMPLES=48 python hen2.py -- $PWD/r/spr2 $b $s $P 512 >> logs/face_${b}_${s}.log 2>&1; done; done
for c in white black blue buff partridge grey splash cuckoo red paint lavender; do for s in h r; do P=$(miss sil_$c $s); [ -n "$P" ] && SAMPLES=32 python silkie_v2.py -- $PWD/r/spr2 $c $s $P 512 >> logs/face_sil_${c}_${s}.log 2>&1; done; done
echo FACES_DONE >> logs/spr2.done
