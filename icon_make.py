"""App icon: a bird render standing on a green hill against a warm sky. Usage: python3 icon_make.py SRC.png"""
import sys
from PIL import Image, ImageDraw
import numpy as np
def bgimg(S):
    y=np.linspace(0,1,S); top=np.array([255,224,130]); bot=np.array([246,176,52])
    arr=np.zeros((S,S,3),np.float32)
    for c in range(3): arr[:,:,c]=(top[c]*(1-y)+bot[c]*y)[:,None]
    yy,xx=np.mgrid[0:S,0:S]; d=np.hypot(xx-S*0.5,yy-S*0.42)/S
    arr+=(np.clip(0.55-d,0,1)*90)[:,:,None]*np.array([1,0.9,0.6])
    im=Image.fromarray(arr.clip(0,255).astype(np.uint8)).convert('RGBA')
    hill=Image.new('RGBA',(S,S),(0,0,0,0)); hd=ImageDraw.Draw(hill)
    hd.ellipse((-S*0.35,S*0.70,S*1.35,S*1.6),fill=(86,158,84,255)); hd.ellipse((-S*0.2,S*0.76,S*1.2,S*1.7),fill=(63,143,78,255))
    return Image.alpha_composite(im,hill)
r=Image.open(sys.argv[1]).convert('RGBA'); A=np.array(r).astype(np.float32); a=A[:,:,3]
ys,xs=np.where(a>200); x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
fx=xs[ys>y1-15].mean(); yy,xx=np.mgrid[0:a.shape[0],0:a.shape[1]]
w=np.exp(-((xx-fx)/((x1-x0)*0.34))**2-((yy-y1)/((y1-y0)*0.06))**2)
A[:,:,3]=np.where(a<200, a*w, a)
bird=Image.fromarray(A.clip(0,255).astype(np.uint8)).crop((max(0,x0-40),y0,min(a.shape[1],x1+40),min(a.shape[0],y1+60)))
def make(S, hfrac, path, base, wmax):
    im=bgimg(S); h=int(S*hfrac*bird.size[1]/(y1-y0+60)); w_=int(bird.size[0]*h/bird.size[1])
    if w_>S*wmax: w_=int(S*wmax); h=int(bird.size[1]*w_/bird.size[0])
    b=bird.resize((w_,h),Image.LANCZOS); off=int(60*h/bird.size[1])
    im.alpha_composite(b,((S-w_)//2, int(S*base)-h+off)); im.convert('RGB').save(path)
make(1024,0.74,'r/icon/icon1024.png',0.86,0.88)
make(1024,0.56,'r/icon/maskable1024.png',0.8,0.7)
