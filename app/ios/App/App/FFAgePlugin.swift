import Foundation
import UIKit
import Capacitor
#if canImport(DeclaredAgeRange)
import DeclaredAgeRange
#endif

// The player's age range from Apple (26 Nov 2026, the launch review, Audrey: "Fix all 4, then UK + US"): the US app store
// age laws (Texas since 4 June 2026, California from 1 January 2027) ask an app to read the age range the App Store holds
// for the person on the device, and COPPA / the UK Children's code ask for age-appropriate defaults (web3d/src/age.js).
//   required(): whether the law asks for it here, for this person (iOS 26.4+: requiredRegulatoryFeatures has
//     declaredAgeRangeRequired; iOS 26.2-26.3: isEligibleForAgeFeatures); { required, api }
//   range(): the system's sheet asking to share the age range (gates 13, 16, 18); { status: sharing | declined |
//     unavailable, lower?, upper?, controls? } (lower absent: under 13; upper absent: 18 or over)
// Nothing is kept here; the game keeps only the band (under 13, 13-17, adult).
@objc(FFAgePlugin)
public class FFAgePlugin: CAPInstancePlugin, CAPBridgedPlugin {
    public let identifier = "FFAgePlugin"
    public let jsName = "FFAge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "hello", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "required", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "range", returnType: CAPPluginReturnPromise)
    ]

    @objc func hello(_ call: CAPPluginCall) {
        var api = false
        #if canImport(DeclaredAgeRange)
        if #available(iOS 26.0, *) { api = true }
        #endif
        call.resolve(["v": 1, "api": api])
    }

    @objc func required(_ call: CAPPluginCall) {
        #if canImport(DeclaredAgeRange)
        if #available(iOS 26.4, *) {
            Task {
                do {
                    let f = try await AgeRangeService.shared.requiredRegulatoryFeatures
                    call.resolve(["required": f.contains(.declaredAgeRangeRequired), "api": true])
                } catch { call.resolve(["required": false, "api": true, "error": "\(error)"]) }
            }
            return
        }
        if #available(iOS 26.2, *) {
            Task {
                do {
                    let e = try await AgeRangeService.shared.isEligibleForAgeFeatures
                    call.resolve(["required": e, "api": true])
                } catch { call.resolve(["required": false, "api": true, "error": "\(error)"]) }
            }
            return
        }
        if #available(iOS 26.0, *) { call.resolve(["required": false, "api": true]); return }
        #endif
        call.resolve(["required": false, "api": false])
    }

    @objc func range(_ call: CAPPluginCall) {
        #if canImport(DeclaredAgeRange)
        if #available(iOS 26.0, *) {
            Task { @MainActor in
                guard let vc = self.bridge?.viewController else { call.resolve(["status": "unavailable"]); return }
                do {
                    let r = try await AgeRangeService.shared.requestAgeRange(ageGates: 13, 16, 18, in: vc)
                    switch r {
                    case let .sharing(a):
                        var o: [String: Any] = ["status": "sharing", "controls": !a.activeParentalControls.isEmpty]
                        if let l = a.lowerBound { o["lower"] = l }
                        if let u = a.upperBound { o["upper"] = u }
                        call.resolve(o)
                    case .declinedSharing:
                        call.resolve(["status": "declined"])
                    @unknown default:
                        call.resolve(["status": "unavailable"])
                    }
                } catch { call.resolve(["status": "unavailable", "error": "\(error)"]) }
            }
            return
        }
        #endif
        call.resolve(["status": "unavailable"])
    }
}
