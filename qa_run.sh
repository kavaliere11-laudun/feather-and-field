#!/bin/bash
# usage: qa_run.sh DAYS EVERY  -> prints a compact progression table
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
bash srv.sh; sleep 1
URL=http://localhost:8766/ DAYS=$1 EVERY=$2 timeout 1150 node qa_bot.mjs > logs/qa_$1_$2.json 2>&1
python3 - "$1" "$2" <<'P'
import sys,json
t=open(f'logs/qa_{sys.argv[1]}_{sys.argv[2]}.json').read()
try: j=json.loads(t[:t.rindex('}')+1])
except Exception: print(t[:800]); sys.exit()
for r in j['log']:
  if r['day'] in (0,1,2,3,5,7,10,14,21,30,45,60,90): print(r)
print('BAD',j['bad']); print(j['counts']); print(t[t.rindex('}')+1:].strip()[:300])
P
