#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate; export STYLE=fv
mkdir -p r/map5 r/props4
(cd r/props4 && python ../../props_sprites.py -- $PWD > ../../logs/props4.log 2>&1)
(cd r/map5 && python ../../farm_map2.py -- $PWD 1.0 > ../../fv2_map.log 2>&1)
echo FV2_DONE >> fv2_map.log
