import sys, tree_sitter_c_sharp as ts
from tree_sitter import Language, Parser
p = Parser(Language(ts.language()))
bad = 0
for f in sys.argv[1:]:
    src = open(f, 'rb').read()
    t = p.parse(src)
    errs = []
    def walk(n):
        if n.type == 'ERROR' or n.is_missing: errs.append(n)
        for c in n.children: walk(c)
    walk(t.root_node)
    for e in errs[:5]:
        line = e.start_point[0]
        print(f, 'line', line + 1, e.type, 'missing' if e.is_missing else '', src.splitlines()[line][:140].decode())
    bad += len(errs)
    if not errs: print(f, 'OK')
sys.exit(1 if bad else 0)
