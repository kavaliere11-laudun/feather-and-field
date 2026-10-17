#!/bin/bash
# make sure the local test servers are up (game2 on 8766, site on 8770)
D=/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
curl -s -o /dev/null http://localhost:8766/ || (setsid nohup python3 -m http.server 8766 --directory $D/game2 >/dev/null 2>&1 &)
curl -s -o /dev/null http://localhost:8770/ || (setsid nohup python3 -m http.server 8770 --directory $D/site >/dev/null 2>&1 &)
sleep 1
