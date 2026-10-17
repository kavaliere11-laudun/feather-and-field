#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; export STYLE=fv
D=$PWD/r/map7; mkdir -p $D
( cd $D && SAVE_BLEND=1 python ../../farm_map3.py -- $D 1.0 ) > map7.log 2>&1
for i in 0 1 2 3; do python render_parts.py -- $D strip $i 4 >> map7.log 2>&1; done
/usr/bin/python3 stitch_map.py $D >> map7.log 2>&1
python render_parts.py -- $D trees >> map7.log 2>&1
echo DONE7 >> map7.log
