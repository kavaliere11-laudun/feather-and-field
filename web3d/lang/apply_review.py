# Apply a second reading's fixes (review/<code>.json) to a translation (<code>.json): each fix replaces its entry, the
# placeholders checked against the English (catalogue.json). python3 apply_review.py de
import json, re, sys
L = sys.argv[1]
cat = {e['id']: e for e in json.load(open('catalogue.json'))}
tr = json.load(open(f'{L}.json')); rv = json.load(open(f'review/{L}.json'))
def holes(s): return sorted(re.findall(r'\{\w+\}', s or ''))
def flat(v): return [v] if isinstance(v, str) else (v if isinstance(v, list) else [v.get('t'), v.get('f')])
done, skipped = 0, []
for x in rv:
    i, fix = x['id'], x['fix']
    if i not in cat: skipped.append((i, 'unknown id')); continue
    e = cat[i]; ref = holes(e['en'] if isinstance(e['en'], str) else '')
    if isinstance(e['en'], str) and any(holes(s) != ref and not (e.get('gender') and holes(s) == holes(e.get('f_en'))) for s in flat(fix) if s is not None):
        skipped.append((i, 'placeholders')); continue
    old = tr.get(i)
    if isinstance(old, dict) and isinstance(fix, str): fix = {'t': fix, 'f': fix} if e.get('gender') else fix
    tr[i] = fix; done += 1
json.dump(tr, open(f'{L}.json', 'w'), ensure_ascii=False, indent=1)
print(L, 'fixed', done, 'skipped', skipped)
