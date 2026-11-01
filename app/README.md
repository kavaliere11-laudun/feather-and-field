# Feather & Field, the app (iPhone first, Android later)

The web game wrapped as a store app with Capacitor 8: no rewrite, the same game the site plays, kept inside the app so
it works offline.

- `make-www.mjs`: the app's web folder (`www/`) from the built game (`web3d/dist`, or main's `3d/` in the cloud build):
  the game's page as `index.html`, told it's the app (`window.__ffApp`); no Home Screen manifest, no test village.
  In the app: no account yet (Google's sign-in page can't open inside an app; it waits for the app's own sign-in, Sign in
  with Apple and Google), the privacy link goes to the site's page (opened in Safari), the farm code's note speaks of
  reinstalling the game rather than clearing Safari.
- `capacitor.config.json`: the app's name and id (`com.featherandfield.game`), the green behind it, the clock's text
  white over the farm (status bar plugin).
- `ios/`: the Xcode project (Swift packages, no CocoaPods). iPhone only (an iPad runs it as an iPhone app), iOS 16 and
  later, upright and sideways, six languages declared (so a French iPhone gets the game in French), no encryption
  declared (only the system's own: HTTPS).
- `icons.py`: the icon (the rooster crowing on a bale, rendered from the game; `art/`) and the launch screen (the
  loading green, so the app opens straight into "Loading your farm…").
- `test/wwwcheck.mjs`: the app's page in the test browser (English and French, upright and sideways).
- `.github/workflows/ios.yml`: built on GitHub's Macs and tried on an iPhone simulator there (pictures and a film kept
  with the run). Unsigned: nothing secret in it.

Making it here: `cd web3d && ./build.sh && cd ../app && npm ci && node make-www.mjs && npx cap sync ios`.
