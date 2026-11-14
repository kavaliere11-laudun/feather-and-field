import json,sys
T=681784177
D="/tmp/claude-0/-home-claude/5a50d6d0-87a5-5d52-bcb3-70e9ccbf0749/scratchpad/iapshots2/"
NC='In the game, open the Shop (left side of the screen) and its "Coins" tab: the four bags of coins are listed there with their prices. Coins are the in-game currency; they are also earned by playing.'
NT='In the game, open the Book (left side of the screen). Once Silkies are unlocked (level 5), the rare Silkie pages show "Adopt this trio" and "Adopt all four". Buying adds a rooster and two hens of that colour and their own coop. "Restore purchases" is in Settings. The same birds can also be hatched by breeding.'
NS='In the game, open the Pantry (left side of the screen): "Bigger shelves" is under the shelves. "Restore purchases" is in Settings.'
ET="A rooster, two hens and their Pagoda, for good."; FT="Un coq, deux poules et leur Pagode, pour toujours."
P=[("Purse of coins","coins.purse","CONSUMABLE","0.99","Purse of coins","3,000 coins for your farm.","Bourse de pièces","3 000 pièces pour votre ferme.",NC,"bag_purse.png"),
("Basket of coins","coins.basket","CONSUMABLE","2.99","Basket of coins","10,000 coins for your farm.","Panier de pièces","10 000 pièces pour votre ferme.",NC,"bag_basket.png"),
("Sack of coins","coins.sack","CONSUMABLE","4.99","Sack of coins","20,000 coins for your farm.","Sac de pièces","20 000 pièces pour votre ferme.",NC,"bag_sack.png"),
("Cart of coins","coins.cart","CONSUMABLE","9.99","Cart of coins","50,000 coins for your farm.","Charrette de pièces","50 000 pièces pour votre ferme.",NC,"bag_cart.png"),
("Paint Silkie trio","silkie.paint","NON_CONSUMABLE","6.99","Paint Silkie trio",ET,"Trio Poule soie pie",FT,NT,"review_trio_paint.png"),
("Lavender Silkie trio","silkie.lavender","NON_CONSUMABLE","6.99","Lavender Silkie trio",ET,"Trio Poule soie lavande",FT,NT,"review_trio_lavender.png"),
("Splash Silkie trio","silkie.splash","NON_CONSUMABLE","6.99","Splash Silkie trio",ET,"Trio Poule soie splash",FT,NT,"review_trio_splash.png"),
("Cuckoo Silkie trio","silkie.cuckoo","NON_CONSUMABLE","6.99","Cuckoo Silkie trio",ET,"Trio Poule soie coucou",FT,NT,"review_trio_cuckoo.png"),
("Four rare Silkie trios","silkie.all","NON_CONSUMABLE","19.99","Four rare Silkie trios","Paint, Lavender, Splash and Cuckoo trios, for good.","Quatre trios de Poules soie rares","Les trios pie, lavande, splash et coucou, à vous.",NT,"review_trio_all.png"),
("Bigger Pantry shelves","pantry.shelves","NON_CONSUMABLE","1.99","Bigger Pantry shelves","Half as much room again on every shelf, for good.","Étagères plus grandes","Moitié plus de place sur chaque étagère, à vous.",NS,"shelves.png")]
for x in P: assert len(x[4])<=35 and len(x[5])<=55 and len(x[6])<=35 and len(x[7])<=55,(x[1],len(x[4]),len(x[5]),len(x[6]),len(x[7]))
HDEF="window.N=x=>x.replace(/\\s+/g,' ').trim();window.B=(t,r)=>{const e=[...(r||document).querySelectorAll('button')].filter(b=>N(b.textContent)===N(t)&&!b.disabled&&b.offsetParent);if(!e.length)throw new Error('no button '+t);e[e.length-1].click();return 'clicked '+t};window.D=()=>document.querySelector('[role=dialog]');window.SEL=(v)=>{const s=D().querySelector('select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,v);s.dispatchEvent(new Event('change',{bubbles:true}));return s.value};window.GONE=()=>new Promise((r,j)=>{let n=0;const i=setInterval(()=>{if(!D()){clearInterval(i);r()}else if(++n>110){clearInterval(i);j(new Error('dialog still open: '+D().innerText.slice(-150)))}},300)});"
def js(code): return {"name":"javascript_tool","input":{"action":"javascript_exec","tabId":T,"text":code}}
def c(a,**k): return {"name":"computer","input":dict(action=a,tabId=T,**k)}
def typ(t,s): return c("type",text=t,action_summary=s)
def wait(n): return c("wait",duration=n)
def upload(ref,i): return [{"name":"file_upload","input":{"tabId":T,"ref":ref,"paths":[D+P[i][9]]}},wait(10),js("const m=document.querySelector('main').innerText;(m.match(/com\\.featherandfield[\\w.]+/)||[''])[0]+' | img '+!!document.querySelector('img[alt=SOURCE]')+' | '+(m.match(/Capture d’écran[\\s\\S]{0,40}/)||[''])[0].replace(/\\s+/g,' ')")]
def product(i):
    ref,code,typ_,price,en,end,fr,frd,note,img=P[i]; pc=price.replace(".",",")+" £"; pid="com.featherandfield.game."+code
    plus="[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.title||b.textContent).trim()==='Créer un achat intégré')"
    def names(loc,nm,ds,lab):
        return [js("SEL('%s');D().querySelector('#name').focus();'lang set'"%loc),typ(nm,"Types the %s display name"%lab),js("D().querySelector('#description').focus();'ok'"),typ(ds,"Types the %s description"%lab),
                js("const v=[D().querySelector('select').value,D().querySelector('#name').value,D().querySelector('#description').value];B('Enregistrer',D());JSON.stringify(v)"),js("await GONE();'names saved'"),wait(2)]
    return [{"name":"navigate","input":{"tabId":T,"url":"https://appstoreconnect.apple.com/apps/6831354761/distribution/iaps"}},
      js("await new Promise((r,j)=>{let n=0;const i=setInterval(()=>{if("+plus+"){clearInterval(i);r()}else if(++n>130){clearInterval(i);j(new Error('list not loaded'))}},300)});"+HDEF+plus+".click();'clicked +'"),wait(2),
      js("SEL('%s');D().querySelector('#name').focus();'type set'"%typ_),typ(ref,"Types the reference name "+ref),js("D().querySelector('#productId').focus();'ok'"),typ(pid,"Types the product ID"),
      js("const v=[D().querySelector('select').value,D().querySelector('#name').value,D().querySelector('#productId').value];if(v.join('|')!=='%s|%s|%s')throw new Error('fields wrong '+v);B('Créer',D());JSON.stringify(v)"%(typ_,ref,pid)),
      js("await new Promise((r,j)=>{let n=0;const i=setInterval(()=>{const m=document.querySelector('main');if(document.querySelector('#iap-or-subscription-review-notes')&&m&&m.innerText.includes('%s')&&!D()){clearInterval(i);r()}else if(++n>130){clearInterval(i);j(new Error('product page not loaded'))}},300)});location.href"%pid),wait(2),
      js("const t=document.querySelector('#iap-or-subscription-review-notes');t.scrollIntoView({block:'center'});t.focus();'notes focused'"),typ(note,"Types a note for Apple's reviewers saying where the purchase is in the game"),
      js("B('Ajouter la tarification')"),wait(2),
      js("const b=[...D().querySelectorAll('button')].find(b=>/\\(USD\\)/.test(b.textContent));if(!b)throw new Error('no country');b.click();'country list'"),wait(1),typ("Royaume","Searches the country list for Royaume-Uni"),wait(2),
      js("B('Royaume-Uni (GBP)')"),wait(1),js("B('Choisir',D())"),wait(1),typ(price,"Searches the price list for "+price),wait(2),
      js("B('%s')"%pc),wait(1),js("const t=N(D().innerText);if(!/Royaume-Uni \\(GBP\\)/.test(t)||!/(^| )%s/.test(t))throw new Error('price not set: '+t.slice(-200));B('Suivant',D())"%pc.replace(" "," ")),wait(4),
      js("B('Suivant',D())"),wait(4),js("const t=N(D().innerText);if(!t.includes(N('Royaume-Uni (GBP) %s')))throw new Error('confirm page wrong: '+t.slice(0,300));B('Confirmer',D())"%pc),js("await GONE();'price confirmed'"),wait(2),
      js("B('Configurer la disponibilité')"),wait(4),js("const t=D().innerText.slice(0,40);B('Terminé',D());t"),wait(2),
      js("B('Enregistrer')"),wait(8),js("const e=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Enregistrer'&&!b.disabled&&b.offsetParent);e?(e.click(),'saved again'):'already saved'"),wait(5),
      js("B('Ajouter')"),wait(2)]+names("en-GB",en,end,"English")+[
      js("const h=[...document.querySelectorAll('h2,h3')].find(e=>e.textContent.trim().startsWith('Nom d’affichage et description'));const b=h&&(h.querySelector('button')||h.parentElement.querySelector('button'));if(!b)throw new Error('no plus');b.click();'plus'"),wait(2)]+names("fr-FR",fr,frd,"French")+[
      js("const m=document.querySelector('main').innerText;document.querySelector('#iap-or-subscription-review-notes').scrollIntoView({block:'center'});JSON.stringify({names:(m.match(/LANGUES[\\s\\S]{0,200}/)||[''])[0].replace(/\\s+/g,' '),type:(m.match(/Consommable|Non consommable/)||[''])[0],price:/Prix actuel/.test(m),avail:/Tous les pays ou régions sélectionnés/.test(m),id:(m.match(/com\\.featherandfield[\\w.]+/)||[''])[0],notes:document.querySelector('#iap-or-subscription-review-notes').value.length,save:[...document.querySelectorAll('button')].filter(b=>/^Enregistr/.test(b.textContent.trim())&&b.offsetParent).map(b=>b.textContent.trim())})"),
      wait(2),{"name":"find","input":{"tabId":T,"query":"review screenshot file input (Capture d’écran)"}}]
a=sys.argv[1:]
acts=[]
if a[0]=='up': acts+=upload(a[1],int(a[2])); a=a[3:]
if a: acts+=product(int(a[0]))
print(json.dumps(acts,ensure_ascii=False))
