#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad/sty
. ../bl/bin/activate
mkdir -p final logs
for job in "hen 1200 96" "coop 1400 96" "tree 1200 96" "scene 1080 96"; do
  set -- $job
  [ -f final/$1.done ] && continue
  RES=$2 python $1.py $3 > logs/final_$1.log 2>&1 && touch final/$1.done
done
echo FINAL_DONE > final/all.done
