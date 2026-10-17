"""Test helper: after changing a file in site/, refresh the version tags in index.html and sw.js as the build would."""
import os, re, json, hashlib
S = 'site'
h = lambda p: hashlib.sha256(open(os.path.join(S, p), 'rb').read()).hexdigest()[:10]
html = open(f'{S}/index.html').read()
html = re.sub(r'"(img/[^"]+)":"[0-9a-f]+"', lambda m: '"%s":"%s"' % (m.group(1), h(m.group(1))), html)
open(f'{S}/index.html', 'w').write(html)
sw = open(f'{S}/sw.js').read()
sw = re.sub(r'"([^"]+)": "[0-9a-f]+"', lambda m: '"%s": "%s"' % (m.group(1), h(m.group(1))), sw).replace("const V = 'ff-", "const V = 'ff-u")
open(f'{S}/sw.js', 'w').write(sw)
