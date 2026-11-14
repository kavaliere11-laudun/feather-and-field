# Feather & Field, the app (iPhone first, Android later)

The web game wrapped as a store app with Capacitor 8: no rewrite, the same game the site plays, kept inside the app so
it works offline.

- `make-www.mjs`: the app's web folder (`www/`) from the built game (`web3d/dist`, or main's `3d/` in the cloud build):
  the game's page as `index.html`, told it's the app (`window.__ffApp`); no Home Screen manifest, no test village.
  In the app: no account yet (Google's sign-in page can't open inside an app; it waits for the app's own sign-in, Sign in
  with Apple and Google), the privacy link goes to the site's page (opened in Safari), the farm code's note speaks of
  reinstalling the game rather than clearing Safari.
- Plugins: the status bar, and local notifications (the reminders, `web3d/src/notify.js`: the phone sends them
  itself; the game calls them through the app's bridge).
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

## TestFlight (from 5 Nov 2026)

Audrey's Apple Developer account is set up (team 9XALR86388); the app's ID `com.featherandfield.game` is registered
and the app made in App Store Connect ("Feather & Field", English (U.K.)); her API key and Team ID are in the
repository's secrets (ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8, APPLE_TEAM_ID), added by her, never seen here. A push to
`source` touching `app/` whose message has `[testflight]` (or "Run workflow" with TestFlight ticked, once the workflow
is on the default branch) builds, signs and sends a build; its number is the run's number. TestFlight only: internal
testing (Audrey and whoever she adds), nothing on the App Store until she submits a version for review and releases it.
The plugins use none of the APIs Apple asks reasons for; Capacitor's own frameworks carry their privacy manifests.

## The shop for real money (from 14 Nov 2026)

`ios/App/App/FFStorePlugin.swift`: the app's own plugin (StoreKit 2) for the winter buildings, registered by
`GameViewController.swift` (the storyboard's view controller is this class, not Capacitor's own). Both files are in the
Xcode project by hand (`project.pbxproj`); `npx cap sync` leaves them alone. The game's side is `web3d/src/store.js`.
Products (made by Audrey in App Store Connect, non-consumable): `com.featherandfield.game.winter.rir`, `.orp`, `.sil`,
`.leg`, `.bra`, `.pol`, `.aya`, `.pea`, `.call` and `com.featherandfield.game.winter.all`. No keys or secrets: the
phone's own Apple account pays, and what is owned is read from Apple's signed records on the phone.
