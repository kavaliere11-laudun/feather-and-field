import UIKit
import Capacitor

// The game's screen: Capacitor's own, with the app's shop plugin added (FFStorePlugin.swift).
class GameViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(FFStorePlugin())
    }
}
