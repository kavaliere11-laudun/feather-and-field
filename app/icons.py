"""The app's own pictures: python3 icons.py
- the icon (1024x1024, no transparency: Apple's rule): art/icon-1024.png, the white Silkie hen and her chick in a meadow
  of daisies in front of a red barn, painted (Audrey, 2 Nov 2026, "Final one": made with ChatGPT from the game's own Silkie
  and chick, web3d/iconstudio.mjs, as its model); also the web game's Home Screen icons (web3d/icon-*.png)
- the launch screen: the welcome's painted picture, tall upright and wide sideways, as the game's loading screen shows it
  (index.html body.game #loading), so the app opens on the picture and "Loading your farm..." comes on over it
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
# the launch screen (6 Nov 2026, Audrey: "Yes, loading too"): the welcome's painted picture, cut to just what the game's
# loading screen shows (index.html body.game #loading: the tall one at 34% across held upright, the wide one in the middle
# sideways, each filling a 19.5:9 iPhone), so the app opens on the picture and the loading screen's name, words and bar
# come on over it. Two pictures: the tall one, and the wide one for a phone held sideways (height class compact)
import json
SP = f'{IOS}/Splash.imageset'
for f in os.listdir(SP):
    if f.endswith(('.png', '.jpg')): os.remove(f'{SP}/{f}')
R = 402 / 874                                                        # (an iPhone held upright, width over height)
t = Image.open(f'{WEB}/welcome-tall.jpg').convert('RGB'); tw = round(t.height * R); x = round(0.34 * (t.width - tw))
t.crop((x, 0, x + tw, t.height)).resize((1206, 2622), Image.LANCZOS).save(f'{SP}/launch-tall.jpg', quality=86, optimize=True)
w = Image.open(f'{WEB}/welcome.jpg').convert('RGB'); wh = round(w.width * R); y = round((w.height - wh) / 2)
w.crop((0, y, w.width, y + wh)).resize((2622, 1206), Image.LANCZOS).save(f'{SP}/launch-wide.jpg', quality=86, optimize=True)
json.dump({'images': [{'idiom': 'universal', 'filename': 'launch-tall.jpg', 'scale': '3x'},
                      {'idiom': 'universal', 'filename': 'launch-wide.jpg', 'height-class': 'compact', 'scale': '3x'}],
           'info': {'version': 1, 'author': 'xcode'}}, open(f'{SP}/Contents.json', 'w'), indent=2)
print('icon and launch screen written')
