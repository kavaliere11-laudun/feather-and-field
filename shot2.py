import json
from playwright.sync_api import sync_playwright
url='file:///tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad/test.html'
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(800)
    pg.click('text=Start farming')
    # simulate 10 game hours: eggs, hatching, shows
    pg.evaluate("""()=>{const F=window.__ff; F.state.coins=4000; F.advance(3*F.HOUR); const c=F.state.coops[0]; F.actCollect(c);
       const fe=F.state.basket.fertile; for(let i=0;i<2&&fe.length;i++){F.state.inc.items.push({egg:fe.shift(),start:F.state.gt});}
       F.advance(1.5*F.HOUR); F.changed();}""")
    pg.wait_for_timeout(1200)
    pg.screenshot(path='t1_farm.png')
    pg.evaluate("()=>window.__ff.openSheet('coop',{id:window.__ff.state.coops[0].id})"); pg.wait_for_timeout(400); pg.screenshot(path='t2_coop.png')
    pg.evaluate("()=>window.__ff.openSheet('bird',{id:window.__ff.state.birds[0].id})"); pg.wait_for_timeout(400); pg.screenshot(path='t3_bird.png')
    pg.evaluate("()=>window.__ff.openSheet('market',{tab:'build'})"); pg.wait_for_timeout(400); pg.screenshot(path='t4_build.png')
    pg.evaluate("()=>window.__ff.openSheet('hatch')"); pg.wait_for_timeout(400); pg.screenshot(path='t5_hatch.png')
    pg.evaluate("()=>window.__ff.openSheet('shows')"); pg.wait_for_timeout(400); pg.screenshot(path='t6_shows.png')
    # build all coops via clicks on build tab
    pg.evaluate("""()=>{const F=window.__ff; F.state.coins=99999; F.state.plots=7; F.changed();}""")
    for br in ['orp','leg','sil','bra']:
        pg.evaluate(f"()=>window.__ff.openSheet('market',{{tab:'build'}})"); pg.wait_for_timeout(200)
        pg.locator('#sheetBody .card').nth(['orp','leg','sil','bra'].index(br)+1).locator('button').click(); pg.wait_for_timeout(200)
    pg.evaluate("""()=>{const F=window.__ff; for(let i=0;i<6;i++){F.refreshShop(); F.state.shop.offers.forEach((o,j)=>{const c=F.state.coops.find(c=>c.breed===o.breed); if(c){const b=F.makeBird({...o,home:c.id}); F.state.birds.push(b);} });} F.state.lang='fr'; F.changed();}""")
    pg.set_viewport_size({'width':1024,'height':768}); pg.wait_for_timeout(1500)
    pg.screenshot(path='t7_tablet.png')
    pg.evaluate("()=>window.__ff.openSheet('market',{tab:'birds'})"); pg.wait_for_timeout(500); pg.screenshot(path='t8_tablet_market.png')
    print(json.dumps(errs))
    b.close()
