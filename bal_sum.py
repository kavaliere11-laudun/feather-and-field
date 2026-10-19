"""Summarise the simulated players' ledgers: pace (level and coins by day) and where XP and coins come from and go."""
import sys, json, glob
tag = sys.argv[1]
for f in sorted(glob.glob(f'logs/bal_{tag}_*.json'), key=lambda f: (-int(f.split('_')[-1][:-5]))):
    t = open(f).read()
    try: j = json.loads(t[:t.rindex('}') + 1])
    except Exception as e: print(f, 'unreadable', t[:300]); continue
    days, every = f.split('_')[-2], f.split('_')[-1][:-5]
    print(f'\n=== {days} days, a visit every {every} min ===   BAD: {j["bad"]}')
    print('  ' + '  '.join(f"d{r['day']}: L{r['lvl']} {r['coins']}c" for r in j['log'] if r['day'] in (1, 3, 5, 7, 10, 14, 21, 30)))
    L = j['ledger']
    for k in ('xp', 'earn', 'spend'):
        tot = sum(L[k].values()) or 1
        top = sorted(L[k].items(), key=lambda x: -x[1])[:9]
        print(f'  {k:5} {round(tot):>8}: ' + ', '.join(f'{a} {round(100*b/tot)}%' for a, b in top))
