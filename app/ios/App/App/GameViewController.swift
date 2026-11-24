import UIKit
import Capacitor

// The game's screen: Capacitor's own, with the app's shop plugin (FFStorePlugin.swift) and its sign-in for My account
// (FFSignInPlugin.swift: Apple's and Google's) and its free-coins videos (FFAdsPlugin.swift) added.
class GameViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(FFStorePlugin())
        bridge?.registerPluginInstance(FFSignInPlugin())
        bridge?.registerPluginInstance(FFAdsPlugin())
        NSLog("FFStore: ready")      // (the simulator check looks for this line: the shop's plugin is in the app)
    }
}
