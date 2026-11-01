"""The app's own pictures: python3 icons.py
- the icon (1024x1024, no transparency: Apple's rule): art/icon-1024.png, the game's own white Silkie and her chick on the
  farm's grass in front of the Red Barn (Audrey's choice, 1 Nov 2026: "A Mum and her chick"; made by web3d/iconstudio.mjs
  SET=a VP=1024 DSF=2 and art/compose_studio.py BIRD_BRIGHT=1.08); also the web game's Home Screen icons (web3d/icon-*.png)
- the launch screen (2732x2732, shown filling the screen): the game's loading green (index.html #loading), so the app opens
  straight into "Loading your farm..." with no flash
"""
import os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
IOS = f'{HERE}/ios/App/App/Assets.xcassets'
ic = Image.open(f'{HERE}/art/icon-1024.png').convert('RGB')
assert ic.size == (1024, 1024)
ic.save(f'{IOS}/AppIcon.appiconset/AppIcon-512@2x.png', optimize=True)
WEB = f'{HERE}/../web3d'
for n in (180, 192, 512): ic.resize((n, n), Image.LANCZOS).save(f'{WEB}/icon-{n}.png', optimize=True)      # (the Home Screen's)
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
