#!/bin/bash
cd /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
. bl/bin/activate
cd r/map2 && python ../../farm_map2.py -- $PWD 1.0 > ../../map2.log 2>&1
