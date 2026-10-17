#!/bin/bash
# final v2 renders for one bird: farm poses + close-up card.  Usage: run_h2.sh BREED SEX
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate
B=$1; S=$2; mkdir -p r/spr2 logs
P=stand,walk0,walk1,walk2,walk3,walk4,walk5,walk6,walk7,peck0,peck1,peck2,look1,look2,scratch0,scratch1,sit
[ "$S" = "r" ] && P=$P,crow
FARM=1 SAMPLES=32 python hen2.py -- $PWD/r/spr2 $B $S $P 512 > logs/spr2_${B}_${S}.log 2>&1
SAMPLES=48 python hen2.py -- $PWD/r/spr2 $B $S card 512 >> logs/spr2_${B}_${S}.log 2>&1
echo "DONE $B $S" >> logs/spr2.done
