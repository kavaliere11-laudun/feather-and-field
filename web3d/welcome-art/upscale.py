import sys, torch, numpy as np
from PIL import Image
from spandrel import ModelLoader
m=ModelLoader().load_from_file('x2.pth').model.eval()
torch.set_num_threads(2)
src,dst=sys.argv[1],sys.argv[2]
im=np.asarray(Image.open(src).convert('RGB')).astype(np.float32)/255
H,W,_=im.shape; T=256; P=16
out=np.zeros((H*2,W*2,3),np.float32)
with torch.no_grad():
  for y in range(0,H,T):
    for x in range(0,W,T):
      y0,x0=max(0,y-P),max(0,x-P); y1,x1=min(H,y+T+P),min(W,x+T+P)
      t=torch.from_numpy(im[y0:y1,x0:x1]).permute(2,0,1)[None]
      r=m(t)[0].permute(1,2,0).clamp(0,1).numpy()
      oy,ox=(y-y0)*2,(x-x0)*2; hh,ww=min(T,H-y)*2,min(T,W-x)*2
      out[y*2:y*2+hh,x*2:x*2+ww]=r[oy:oy+hh,ox:ox+ww]
Image.fromarray((out*255+0.5).astype(np.uint8)).save(dst)
print('done',out.shape)
