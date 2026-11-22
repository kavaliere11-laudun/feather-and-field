import json, math
import os; S=os.path.dirname(os.path.abspath(__file__))
XP_AT=[0, 0, 15, 45, 120, 230, 380, 580, 880, 1320, 1950, 2800, 3850, 5100, 6650, 8400, 10550, 13050, 16000, 19350, 23200, 27400, 32100, 37250, 43000, 47450, 56250, 63850, 72100, 81150, 90850]
xd=json.loads(open(f'{S}/xp_daily.txt').read().split(': ',1)[1])
xt=json.loads(open(f'{S}/xp_twice.txt').read().split(': ',1)[1])
def xp_at_day(a, d):   # d fractional, day 1 = a[0]
    if d<=1: return a[0]*d
    i=int(d)-1; f=d-int(d)
    return a[i]+(a[min(i+1,len(a)-1)]-a[i])*f
def day_of(a, x):
    for i,v in enumerate(a):
        if v>=x:
            if i==0: return 1
            return i+ (x-a[i-1])/max(1,(v-a[i-1]))
    return None
anch=[(2,1),(3,2),(8,7),(12,14),(17,30),(28,90),(40,180),(50,270)]
P=math.log(269/29)/math.log(48/15); C=29/15**P
def target(L): return 1 + C*(L-2)**P
def nice(x):
    if x<100: return int(round(x/5)*5)
    if x<1000: return int(round(x/10)*10)
    if x<10000: return int(round(x/50)*50)
    return int(round(x/250)*250)
NEW=[0,0]
for L in range(2,51):
    x = 15 if L==2 else 45 if L==3 else max(nice(xp_at_day(xd, target(L))), nice(NEW[L-1]*(1.5 if L<=7 else 1.02)))
    NEW.append(x)
# monotonic
for L in range(3,51): assert NEW[L]>NEW[L-1], (L,NEW[L],NEW[L-1])
print('NEW XP', NEW)
dd=[None,None]+[round(day_of(xd,NEW[L]),1) for L in range(2,51)]
dt=[None,None]+[round(day_of(xt,NEW[L]),1) for L in range(2,51)]
old_d=[None,None]+[round(day_of(xd,XP_AT[L]),1) for L in range(2,31)]
print('days daily', dd)
print('days twice', dt)
gaps=[round(dd[L]-dd[L-1],1) for L in range(3,51)]
print('gaps', gaps)
# old level -> new level with the same xp (the first new level whose threshold >= old's, or nearest)
def newOf(Lo):
    x=XP_AT[Lo]; best=min(range(2,51), key=lambda L: abs(NEW[L]-x)); return best
m={Lo:newOf(Lo) for Lo in range(2,31)}
print('old->new', m)
print('old days', old_d)
json.dump({'NEW':NEW,'dd':dd,'dt':dt,'map':m,'old_d':old_d,'oldxp':XP_AT}, open(f'{S}/plan.json','w'))
