#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; export STYLE=fv
mkdir -p r/map6
cd r/map6 && python ../../farm_map2.py -- $PWD 1.0 groundonly > ../../map6.log 2>&1
cp ../map5/tree_*.png .
echo DONE6 >> ../../map6.log
