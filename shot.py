import sys, json
from playwright.sync_api import sync_playwright
url='file:///tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad/test.html'
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
    pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(1500)
    pg.screenshot(path='s1_welcome.png')
    pg.click('text=Start farming'); pg.wait_for_timeout(1500)
    pg.screenshot(path='s2_farm.png')
    # gallery of all birds
    pg.evaluate("""() => {
      const F=window.__ff, st=F.state; const c=document.createElement('canvas'); c.width=1400;c.height=1500; c.id='gal';
      c.style.cssText='position:fixed;left:0;top:0;z-index:999;background:#8fb862'; document.body.append(c); const g=c.getContext('2d');
      const list=[]; for(const br of ['rir','orp','leg','bra']) for(const sx of ['h','r']) list.push({breed:br,sex:sx});
      for(const col of Object.keys(F.SIL)) for(const sx of ['h','r']) list.push({breed:'sil',sex:sx,col});
      for(const br of F.BREED_IDS) list.push({breed:br,sex:'h',chick:1,col:'black'});
      list.push({breed:'leg',sex:'r',chick:1});
      ['white','partridge','buff','paint','splash','lavender'].forEach(col=>list.push({breed:'sil',sex:'h',chick:1,col}));
      list.forEach((o,i)=>{ const geno=o.breed==='sil'?F.silTemplate(o.col):null; if(geno){geno.c=['C','C'];if(o.col==='white')geno.c=['c','c'];geno.lav=o.col==='lavender'?['l','l']:['L','L']; if(!['white'].includes(o.col)&&geno.base[1]!==geno.base[0]&&geno.base[0]==='E')geno.base=['E','E'];}
        const b=F.makeBird({breed:o.breed,sex:o.sex,traits:{type:50,plum:50,size:50,lay:50},geno,born:0,home:0});
        const s=F.getSprite(b,!!o.chick,2); const col=i%8,row=Math.floor(i/8); g.save(); g.translate(90+col*170, 150+row*190); const k=o.chick?2.2:1.2; g.scale(k,k); g.drawImage(s.cv,s.box.x0,s.box.y0,s.box.w,s.box.h); g.restore();
        g.fillStyle='#000';g.font='12px sans-serif'; g.fillText((o.col||o.breed)+' '+o.sex+(o.chick?' chick':''), 40+col*170, 175+row*190); });
    }""")
    pg.set_viewport_size({'width':1400,'height':1500}); pg.wait_for_timeout(300)
    pg.screenshot(path='s3_gallery.png', clip={'x':0,'y':0,'width':1400,'height':1500})
    print(json.dumps(errs[:10]))
    b.close()
