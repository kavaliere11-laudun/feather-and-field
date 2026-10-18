"""Write FeatherField/manifest.json: every file of the Unity pack with its SHA-1, for 'Get latest from Claude'."""
import os, sys, json, hashlib, datetime
root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'unity', 'FeatherField')
files = []
for d, _, fs in os.walk(root):
    for f in sorted(fs):
        rel = os.path.relpath(os.path.join(d, f), root).replace(os.sep, '/')
        if rel.endswith('.meta') or rel in ('manifest.json', 'Data/stats.json') or rel.split('/')[0] in ('Materials', 'Scenes'): continue
        data = open(os.path.join(d, f), 'rb').read()
        files.append({'path': rel, 'sha1': hashlib.sha1(data).hexdigest(), 'size': len(data)})
files.sort(key=lambda e: e['path'])
ver = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=1))).strftime('%d %b %Y %H:%M')
json.dump({'version': ver, 'files': files}, open(os.path.join(root, 'manifest.json'), 'w'), indent=1)
print('manifest', ver, len(files), 'files')
