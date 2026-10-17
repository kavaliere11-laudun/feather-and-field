#!/bin/bash
# final v2 renders for one Silkie colour and sex: farm poses + close-up card.  Usage: run_s2.sh COLOUR SEX
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate
C=$1; S=$2; mkdir -p r/spr2 logs
P=stand,walk0,walk1,walk2,walk3,walk4,walk5,walk6,walk7,peck0,peck1,peck2,look1,look2,scratch0,scratch1,sit
[ "$S" = "r" ] && P=$P,crow
FARM=1 SAMPLES=20 python silkie_v2.py -- $PWD/r/spr2 $C $S $P 384 > logs/spr2_sil_${C}_${S}.log 2>&1
SAMPLES=32 python silkie_v2.py -- $PWD/r/spr2 $C $S card 512 >> logs/spr2_sil_${C}_${S}.log 2>&1
echo "DONE sil_$C $S" >> logs/spr2.done
