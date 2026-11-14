import sys
from PIL import Image
S='/tmp/claude-0/-home-claude/5a50d6d0-87a5-5d52-bcb3-70e9ccbf0749/scratchpad'
G={'rir':'p10/tt2/theme_1_chalet.png','orp':'p10/gt2/ginger_1_garden.png','sil':'p10/it2/ice_1_garden.png','leg':'p10/trn2/train_1_garden.png','bra':'p10/lift2/lift_1_garden.png','pol':'p10/wt/pol_1_garden.png','aya':'p10/wt/aya_1_garden.png','pea':'p10/wt/pea_1_garden.png','call':'p10/wt/call_1_garden.png'}
def make(b, top, card, out):
    W,H=1290,2796; im=Image.new('RGB',(W,H),(253,251,244))
    im.paste(top,(0,0)); c=Image.open(card).convert('RGB')
    room=H-top.height; c=c.crop((0,0,W,min(c.height,room))); im.paste(c,(0,top.height)); im.save(out); print(out, top.size, c.size)
for b in sys.argv[1:]:
    if b=='all':
        t=Image.open(S+'/art/img/nine.jpg').convert('RGB').resize((1290,1290),Image.LANCZOS); make(b,t,'card_rir.png','review_all.png')
    else:
        box=(550,10,1650,710) if b=='pea' else (324,10,1424,710)
        t=Image.open(S+'/'+G[b]).convert('RGB').crop(box).resize((1290,821),Image.LANCZOS); make(b,t,'card_%s.png'%b,'review_%s.png'%b)
