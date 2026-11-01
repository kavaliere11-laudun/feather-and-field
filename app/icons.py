"""The app's own pictures: python3 icons.py
- the icon (1024x1024, no transparency: Apple's rule), from art/icon-render.png: the rooster crowing on a bale, rendered from
  the game itself (web3d/posterpic.mjs with the Home Screen icon's camera: AT=0.58,0.98,-1.25 EL=12 AZ=-75 DIST=1.75 FOV=26
  W=320 H=320 DSF=4)
- the launch screen (2732x2732, shown filling the screen): the game's loading green (index.html #loading), so the app opens
  straight into "Loading your farm..." with no flash
"""
import os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
IOS = f'{HERE}/ios/App/App/Assets.xcassets'
ic = Image.open(f'{HERE}/art/icon-render.png').convert('RGB').resize((1024, 1024), Image.LANCZOS)
ic.save(f'{IOS}/AppIcon.appiconset/AppIcon-512@2x.png', optimize=True)
ic.save(f'{HERE}/art/icon-1024.png', optimize=True)
# the loading screen's green: #557230 at the top (under the clock), down to #8cb85c at 42%, then flat
S = 2732
top, low = (0x55, 0x72, 0x30), (0x8c, 0xb8, 0x5c)
col = Image.new('RGB', (1, S))
for y in range(S):
    f = y / S
    t = 0 if f < 0.06 else min(1, (f - 0.06) / (0.42 - 0.06))
    col.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(top, low)))
sp = col.resize((S, S))
for n in ('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'):
    sp.save(f'{IOS}/Splash.imageset/{n}', optimize=True)
print('icon and launch screen written')
