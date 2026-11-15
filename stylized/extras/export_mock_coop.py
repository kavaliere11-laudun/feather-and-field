"""Export a new coop's five looks under another breed's names, for mock-ups only (15 Nov 2026): the Speckled Sussex's Village
Cottage as box_orp, shed_orp, house_orp, cosy_orp, deluxe_orp, to splice into a COPY of the game's coops.glb (never the
game's own): a test page then shows it in the Orpington's pens. Usage: bl/bin/python stylized/extras/export_mock_coop.py OUT [as]
(then: python3 stylized/extras/splice_coops.py OLD.glb OLD.json OUT/mock.glb OUT/mock.json NEW.glb NEW.json)"""
import os, sys, json
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1]; AS = sys.argv[2] if len(sys.argv) > 2 else 'orp'; os.makedirs(OUT, exist_ok=True)
src = open(os.path.join(HERE, 'export_coops.py')).read()
head = src[:src.index('for k, fn in coops.HOUSES.items():')]
sys.argv = [sys.argv[0], OUT]
G = {'__name__': 'export_coops_head', '__file__': os.path.join(HERE, 'export_coops.py')}
exec(compile(head, 'export_coops_head', 'exec'), G)
coops = G['coops']; one = G['one']; BUDGET = G['BUDGET']; STATS = G['STATS']; write_glb = G['write_glb']
names = []
for look, pre in enumerate(('box_', 'shed_', 'house_', 'cosy_', 'deluxe_')):
    n = pre + AS; BUDGET[n] = (15000, 16000, 17000, 20000, 24000)[look]
    one(n, lambda look=look, n=n: coops.sussex(look=look, name=n, key=AS)); names.append(n)
write_glb(os.path.join(OUT, 'mock.glb'), names)
json.dump(dict(names=names, stats={n: STATS[n] for n in names}), open(os.path.join(OUT, 'mock.json'), 'w'), indent=1)
print('MOCK', json.dumps({n: STATS[n] for n in names}))
