#!/bin/bash
# usage: bal_run.sh TAG  -> four simulated players, ledgers saved to logs/bal_TAG_<days>_<every>.json
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
bash srv.sh; sleep 1
run() { URL=http://localhost:8766/ DAYS=$1 EVERY=$2 timeout 1700 node qa_bot.mjs > logs/bal_$TAG\_$1_$2.json 2>&1; }
TAG=$1
run 30 1440 & run 30 720 & run 14 180 & run 7 15 & wait
echo BAL_DONE
