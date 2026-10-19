Feather & Field - Unity starter pack (cosy style)
=================================================

What's inside
- Models/   the Red Barn coop with its pen, hen, rooster and chick (standing and pecking), two apple trees,
            grass tufts, flowers, a fallen apple and the dirt path (FBX, real size in metres)
- Data/     colours of every material, and where everything goes on the farm
- Editor/   FarmSetup.cs: adds the menu "Feather and Field > Build starter farm"
- Scripts/  HenWander.cs: makes the hens walk about and peck when you press Play, and go to the nest to lay
            CameraRig.cs: scroll or pinch to zoom, drag to move around (while playing)
            FarmGame.cs: the farm's rules (stage 1): hens lay while the feeder has food, tap the nest to
                         collect (eggs are sold for coins), tap the feeder to fill it; saved on the device
            NestBox.cs, Feeder.cs: the nest's eggs and the feeder's grain
            FarmHud.cs: coins and eggs at the top, bubbles over the nest and the feeder, messages, a bird's card
                        (with a Sell button), and the Hatchery (incubator and fertile eggs)
            Rules.cs, BirdInfo.cs: every bird's name, traits, quality, grade, value and personality, and breeding
                                   (chicks inherit from both parents), all as in the web game
            AppleTree.cs, AppleSeeker.cs, GrassEgg.cs: the low apples, the Glutton who jumps for them, her apple egg
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

Stage 2 (part 1): birds you can get to know, and the Glutton's apples (19 Oct 2026)
- After "Get latest from Claude", click Build starter farm again, then press Play.
- Tap any bird: her card shows her name, grade, quality, what she is worth and her personality.
- The hen by the big apple tree is a Glutton. Every minute or so she trots under a low apple, crouches, jumps and
  knocks it down, then pecks it up. After two apples she lays an apple egg in the grass (worth three eggs): tap it.
- One apple grows back every 3 minutes (five at most).

Stage 2 (part 2): breeding (19 Oct 2026)
- After "Get latest from Claude", click Build starter farm again, then press Play.
- With a grown rooster in the yard, most eggs are fertile (8 in 10; 9 in 10 from a Good mum). When you collect the
  nest, eating eggs are sold as before and fertile eggs fly down to the Hatchery button.
- Tap Hatchery. Each fertile egg shows its parents and roughly how good the chick will be. Incubate it (two fit in
  the incubator) or sell it. The Hatchery keeps six eggs; when it is full the least promising ones are sold.
- An egg hatches after 1 minute 30 seconds. The chick inherits from both parents, with a little luck. It grows into a
  young hen (pullet) or young rooster (cockerel) after 3 minutes, and is grown up 3 minutes later. Pullets lay.
- The coop holds 5 birds. When it is full, a hatched egg waits: tap a bird, then Sell (tap twice to be sure).
  The hen by the apple tree doesn't live in the coop, so she stays.
- These times are quick for now so you can watch it all happen.
