#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate
cd r/map3 && python ../../farm_map2.py -- $PWD 1.0 groundonly > ../../map3.log 2>&1
cp ../map2/tree_*.png . 
echo DONE3 >> ../../map3.log
