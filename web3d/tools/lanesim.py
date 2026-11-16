import json, math, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
W='/home/claude/ff-source/web3d/'
V=json.load(open(W+'models/village.json')); F=json.load(open(W+'models/fields.json'))
CELL=0.25; x0,z0,nx,nz=F['x0'],F['z0'],F['nx'],F['nz']
grid=-np.ones((nz,nx),int)
for k,row in enumerate(F['rows']):
    for i in range(0,len(row),3):
        a,n,f=row[i],row[i+1],row[i+2]; grid[k,a:a+n]=f
print('grid fields', np.unique(grid)[:5], grid.max())
X=x0+(np.arange(nx)+0.5)*CELL; Z=z0+(np.arange(nz)+0.5)*CELL; XX,ZZ=np.meshgrid(X,Z)
B=V['bounds']; R2=math.sqrt(0.5); U=(XX-ZZ)*R2; VV=(-ZZ-XX)*R2
inside=(U>B['u'][0])&(U<B['u'][1])&(VV>B['v'][0])&(VV<B['v'][1])
def segdist(a,b):
    ax,az,bx,bz=a[0],a[2],b[0],b[2]; dx,dz=bx-ax,bz-az; L=dx*dx+dz*dz or 1
    t=np.clip(((XX-ax)*dx+(ZZ-az)*dz)/L,0,1); return np.hypot(XX-ax-dx*t,ZZ-az-dz*t)
def lanemask(paths,r):
    m=np.zeros(inside.shape,bool)
    for l in paths:
        for i in range(1,len(l)): m|=segdist(l[i-1],l[i])<r
    return m
water=np.zeros(inside.shape,bool)
for st in V['streams']:
    for i in range(1,len(st)): water|=segdist(st[i-1],st[i])<V['streamHalf']+0.7
P=V['pond']; c=P['center']; au=np.array([P['axisU'][0],P['axisU'][2]]); av=np.array([P['axisV'][0],P['axisV'][2]])
lu=np.linalg.norm(au); lv=np.linalg.norm(av); dx=XX-c[0]; dz=ZZ-c[2]
water|=((dx*au[0]+dz*au[1])/lu/(lu+0.6))**2+((dx*av[0]+dz*av[1])/lv/(lv+0.6))**2<=1
# fixed things: garden, wheat fields, farmhouse (rough boxes)
fixed=np.zeros(inside.shape,bool)
def box(cx,cz,hx,hz,deg=0):
    a=math.radians(deg); lx=(XX-cx)*math.cos(a)-(ZZ-cz)*math.sin(a); lz=(XX-cx)*math.sin(a)+(ZZ-cz)*math.cos(a); return (abs(lx)<hx)&(abs(lz)<hz)
g=V['fixed']
fixed|=box(g['garden'][0]+0.0,g['garden'][1],4.2,2.8,90)|box(g['wheat'][0],g['wheat'][1],2.6,2.2)|box(g['wheat2'][0],g['wheat2'][1],2.6,2.2)|box(V['house'][0],V['house'][2],3.2,3.0,45)
DEGS=(0,45,90,135,180,225,270,315)
PATHS=V['paths']; stubs=[p for p in PATHS if len(p)<=3]; lanes=[p for p in PATHS if len(p)>3]
def fit(paths, landmask):
    hard=lanemask(paths,V['pathHalf']+0.02)
    ok=landmask&~hard&~water&~fixed&inside
    res=np.zeros(ok.shape,bool); bad=np.pad(~ok,40,constant_values=True)
    fx0,fx1,fz0,fz1=-2.37,2.52,-1.02,3.27
    for deg in DEGS:
        a=math.radians(deg); c=math.cos(a); s_=math.sin(a); offs=set()
        for lz in np.arange(fz0,fz1+0.124,0.25):
            for lx in np.arange(fx0,fx1+0.124,0.25):
                px_=min(lx,fx1); pz_=min(lz,fz1); offs.add((int(round((px_*c+pz_*s_)/CELL)), int(round((-px_*s_+pz_*c)/CELL))))
        anyb=np.zeros(ok.shape,bool)
        for (di,dk) in offs: anyb|=bad[40+dk:40+dk+nz, 40+di:40+di+nx]
        res|=~anyb
    return res, hard
land=(grid>=0)|(lanemask(PATHS,V['pathHalf']+0.6)&inside&~water)   # fields and the lanes' verges
if __name__=='__main__':
    A,hA=fit(PATHS,land)
    Bm,hB=fit(lanes,land)
    per=lambda m:[int((m&(grid==f)).sum()) for f in range(40)]
    print('now   ',per(A)); print('nostub',per(Bm))
    print('fields with none: now',sum(1 for x in per(A) if x==0),'no stubs',sum(1 for x in per(Bm) if x==0))
    print('lanes', [(i,len(p)) for i,p in enumerate(PATHS) if len(p)>3])
