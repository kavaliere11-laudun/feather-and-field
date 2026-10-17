#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate
mkdir -p r/look_a r/look_b
(cd r/look_b && STYLE=fv TESTCOOPS=1 REGION=0.05,0.95,0,0.3 python ../../farm_map2.py -- $PWD 0.6 notrees > ../../look_b.log 2>&1)
(cd r/look_a && TESTCOOPS=1 REGION=0.05,0.95,0,0.3 python ../../farm_map2.py -- $PWD 0.6 notrees > ../../look_a.log 2>&1)
echo LOOK_DONE >> look_b.log
