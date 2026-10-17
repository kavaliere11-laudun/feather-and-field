import math, json
def basis():
    pitch, yaw = math.radians(42), math.radians(45)
    d = (math.sin(yaw)*math.cos(pitch), -math.cos(yaw)*math.cos(pitch), math.sin(pitch))
    f = tuple(-x for x in d)
    Z = (0,0,1); zf = sum(a*b for a,b in zip(Z,f))
    u = tuple(Z[i]-zf*f[i] for i in range(3)); n = math.sqrt(sum(x*x for x in u)); u = tuple(x/n for x in u)
    r = (f[1]*u[2]-f[2]*u[1], f[2]*u[0]-f[0]*u[2], f[0]*u[1]-f[1]*u[0])
    return r, u
R, U = basis()
def proj(p, T, W, H, ortho, css):
    ppm = max(W, H)/ortho
    q = (p[0]-T[0], p[1]-T[1], p[2])
    x = W/2 + sum(a*b for a,b in zip(q,R))*ppm
    y = H/2 - sum(a*b for a,b in zip(q,U))*ppm
    return round(x*css,1), round(y*css,1), ppm*css
def world(cx, cy, deg, lx, ly):
    a = math.radians(deg); return (cx + lx*math.cos(a) - ly*math.sin(a), cy + lx*math.sin(a) + ly*math.cos(a), 0)
barn = [(-0.6,-0.6),(0.35,-0.35),(0.95,-0.95),(-0.15,-1.15)]
pag  = [(-0.55,-0.75),(0.3,-0.45),(0.95,-1.0),(0.05,-1.15),(-0.95,-1.1)]
pts = {'barn':[world(-3.2,1.0,8,*p) for p in barn], 'pag':[world(2.3,2.9,-10,*p) for p in pag],
       'barn_label':[(-3.4,1.75,1.4)], 'pag_label':[(2.4,3.6,1.6)], 'plot_label':[(2.7,-1.9,0.4)], 'pond':[(-2.7,-3.1,0)], 'barn_egg':[(-3.0,1.6,1.25)]}
for view,(T,W,H,ortho,css) in {'phone':((-1.7,-0.1),780,1448,12.07,0.5),'tablet':((-0.3,0.4),1500,1392,10.5,0.5)}.items():
    out={}
    for k,v in pts.items(): out[k]=[proj(p,T,W,H,ortho,css)[:2] for p in v]
    print(view, 'css px per m', round(proj((0,0,0),T,W,H,ortho,css)[2],1)); print(json.dumps(out))
