Feather & Field - Unity starter pack (cosy style)
=================================================

What's inside
- Models/   the Red Barn coop with its pen, hen and rooster (standing and pecking), two apple trees,
            grass tufts, flowers, a fallen apple and the dirt path (FBX, real size in metres)
- Data/     colours of every material, and where everything goes on the farm
- Editor/   FarmSetup.cs: adds the menu "Feather and Field > Build starter farm"
- Scripts/  HenWander.cs: makes the hens walk about and peck when you press Play, and go to the nest to lay
            CameraRig.cs: scroll or pinch to zoom, drag to move around (while playing)
            FarmGame.cs: the farm's rules (stage 1): hens lay while the feeder has food, tap the nest to
                         collect (eggs are sold for coins), tap the feeder to fill it; saved on the device
            NestBox.cs, Feeder.cs: the nest's eggs and the feeder's grain
            FarmHud.cs: coins and eggs at the top, bubbles over the nest and the feeder, messages
- Textures/ the painted meadow for the ground

How to use it
1. Unzip this file (double-click it in Finder). You get a folder called FeatherField.
2. In Unity, drag the FeatherField folder into the Project panel, onto "Assets".
3. Wait for the import to finish. The Console tab should have no red errors.
4. In the menu bar at the top of the screen, click  Feather and Field > Build starter farm.
   If Unity asks to save the sample scene, click Don't Save.
5. Click the Game tab, choose a portrait phone size in the aspect menu (top left of the Game view),
   then press Play (the triangle at the top). The hens start pottering about.

You can run step 4 again at any time: it rebuilds Scenes/Farm.unity from scratch.

Zooming
- While playing, scroll (two fingers on the trackpad) to zoom and drag to move around.
  This redraws the farm sharp. Leave the Game view's "Scale" slider at 1x: it only stretches pixels.
- On a Retina Mac, open the aspect menu at the top left of the Game view and untick
  "Low Resolution Aspect Ratios" if it is ticked.

Getting updates
- Feather and Field > Get latest from Claude downloads the newest version of this pack from the game's
  GitHub (only the files that changed, each checked against its fingerprint) and offers to rebuild the farm.

Stage 1: eggs, coins and the feeder (19 Oct 2026)
- After "Get latest from Claude", click Feather and Field > Build starter farm again, then press Play.
- The three hens in the yard walk to the straw nest, sit for a moment, and an egg pops up.
- Tap the nest: the eggs fly up to the counter and are sold for coins.
- The feeder's grain goes down; when it is low a bubble says so. Tap the feeder to fill it (60 coins).
- For now hens lay about once a minute each, so there is something to see straight away.
- The farm is saved on the device. Feather and Field > Start the farm again (clear its save) resets it.
