#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; cd r
python ../farm.py -- $PWD/farm_phone.png 780 12.07 1448 -1.7 -0.1 >> ../batch4.log 2>&1
python ../farm.py -- $PWD/farm_tablet.png 1500 10.5 1392 -0.3 0.4 >> ../batch4.log 2>&1
echo BATCH4_DONE >> ../batch4.log
