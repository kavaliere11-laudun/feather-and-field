#!/bin/bash
# Resumable v2 bird renders: roosters then all Silkies. Skips any picture already on disk, so it can be restarted after the workspace restarts.
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate
mkdir -p r/spr2 logs
POSES="stand walk0 walk1 walk2 walk3 walk4 walk5 walk6 walk7 peck0 peck1 peck2 look1 look2 scratch0 scratch1 sit"
job() {  # SCRIPT TAG KEY SEX FARMSAMPLES FARMRES CARDSAMPLES
  local SC=$1 TAG=$2 K=$3 SX=$4 FS=$5 FR=$6 CS=$7 P="" pp
  grep -qx "DONE $TAG $SX" logs/spr2.done 2>/dev/null && return
  for pp in $POSES $([ "$SX" = r ] && echo crow); do
    [ -f r/spr2/${pp}_${K}_${SX}.png ] || P="$P,$pp"
  done
  P=${P#,}
  [ -n "$P" ] && FARM=1 SAMPLES=$FS python $SC -- $PWD/r/spr2 $K $SX $P $FR >> logs/spr2_${K}_${SX}.log 2>&1
  [ -f r/spr2/card_${K}_${SX}.png ] || SAMPLES=$CS python $SC -- $PWD/r/spr2 $K $SX card 512 >> logs/spr2_${K}_${SX}.log 2>&1
  echo "DONE $TAG $SX" >> logs/spr2.done
}
for b in rir orp leg bra; do job hen2.py $b $b r 32 512 48; done
for c in white black blue buff partridge grey splash cuckoo red paint lavender; do
  for s in h r; do
    grep -qx "DONE sil_$c $s" logs/spr2.done 2>/dev/null && continue
    P=""; for pp in $POSES $([ "$s" = r ] && echo crow); do [ -f r/spr2/${pp}_sil_${c}_${s}.png ] || P="$P,$pp"; done; P=${P#,}
    [ -n "$P" ] && FARM=1 SAMPLES=20 python silkie_v2.py -- $PWD/r/spr2 $c $s $P 384 >> logs/spr2_sil_${c}_${s}.log 2>&1
    [ -f r/spr2/card_sil_${c}_${s}.png ] || SAMPLES=32 python silkie_v2.py -- $PWD/r/spr2 $c $s card 512 >> logs/spr2_sil_${c}_${s}.log 2>&1
    echo "DONE sil_$c $s" >> logs/spr2.done
  done
done
echo ALL_V2_DONE >> logs/spr2.done
