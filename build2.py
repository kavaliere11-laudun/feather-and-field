"""Build game2/index.html from ff.html and game2/data.json (TEST=1 adds test hooks)."""
import os, json
D = '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad/'
s = open(D + 'ff.html').read()
data = open(D + 'game2/data.json').read()
assert s.count('/*DATA*/null') == 1
s = s.replace('/*DATA*/null', data)
import datetime
s = s.replace("'/*BUILD*/dev'", repr(datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=1))).strftime('%d %b %Y %H:%M')))
if os.environ.get('TEST'):
    s = s.replace("window.claude?.hot?.snapshot", open(D + 'testhooks.js').read() + "\nwindow.claude?.hot?.snapshot", 1)
open(D + 'game2/index.html', 'w').write(s)
print('built', len(s))
