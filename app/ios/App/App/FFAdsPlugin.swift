import Foundation
import UIKit
import Capacitor
import GoogleMobileAds
import UserMessagingPlatform

// Free coins for a short video (24 Nov 2026, Audrey: "Ads before launch"; her 2 Nov choices: "Free coins in the shop", "5 a
// day", "Contextual for everyone"): Google's AdMob (her account, 25 Nov 2026), a rewarded video the player chooses to watch
// from the shop's Coins shelf.
//   watch(): Google's consent message first where the law asks for it (the UK and Europe: Google's own, set in AdMob), then a
//     video, then { earned } once it's closed: earned only if it played to the end (Google says so). Nothing of Google's is
//     started before the first tap on Watch.
//   choices(): Google's form to change the ad privacy choices (Settings, where the law asks for it).
//   hello(): the plugin is there; whether the choices form is asked for.
// Contextual adverts only (npa: nothing about the player is used to choose them), rated for everyone (G). No tracking: the
// app never asks to track (no IDFA). The App ID and the video's unit are in Info.plist (GADApplicationIdentifier,
// FFRewardedUnit; FFRewardedTestUnit, Google's test video, in TestFlight): public identifiers, as in any app; no keys or
// secrets here.
@objc(FFAdsPlugin)
public class FFAdsPlugin: CAPInstancePlugin, CAPBridgedPlugin, FullScreenContentDelegate {
    public let identifier = "FFAdsPlugin"
    public let jsName = "FFAds"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "hello", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "watch", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "choices", returnType: CAPPluginReturnPromise)
    ]
    private var started = false
    private var ready: RewardedAd?
    private var loading = false
    private var waiting: [(RewardedAd?) -> Void] = []
    private var showing: CAPPluginCall?
    private var earned = false
    private var childAds: Bool?

    // TestFlight and Apple's review run with a sandbox receipt: Google's test video there, never a real ad (AdMob asks that an
    // app's makers and testers never watch its real ads); the game's own video only in the App Store's copy
    private var testing: Bool { Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt" }
    private var unit: String { (Bundle.main.object(forInfoDictionaryKey: testing ? "FFRewardedTestUnit" : "FFRewardedUnit") as? String) ?? "" }
    private func privacyAsked() -> Bool { ConsentInformation.shared.privacyOptionsRequirementStatus == .required }

    @objc func hello(_ call: CAPPluginCall) { call.resolve(["v": 1, "privacy": started && privacyAsked()]) }

    // Google's consent message (if the law asks for it here), then the ads part started, once
    private func prepare(child: Bool = false, _ done: @escaping (Bool) -> Void) {
        DispatchQueue.main.async {
            let params = RequestParameters()
            params.isTaggedForUnderAgeOfConsent = child
            ConsentInformation.shared.requestConsentInfoUpdate(with: params, completionHandler: { _ in
                Task { @MainActor in
                    if let vc = self.bridge?.viewController, ConsentInformation.shared.formStatus == FormStatus.available {
                        try? await ConsentForm.loadAndPresentIfRequired(from: vc)
                    }
                    let ok = ConsentInformation.shared.canRequestAds
                    if ok && !self.started {
                        self.started = true
                        MobileAds.shared.requestConfiguration.maxAdContentRating = GADMaxAdContentRating.general
                        MobileAds.shared.start(completionHandler: nil)
                    }
                    done(ok)
                }
            })
        }
    }

    // a video loaded (or the one ready); nil: none to be had just now
    private func load(_ done: @escaping (RewardedAd?) -> Void) {
        DispatchQueue.main.async {
            if let ad = self.ready { self.ready = nil; done(ad); return }
            self.waiting.append(done)
            if self.loading { return }
            self.loading = true
            let request = Request()
            let extras = Extras()
            extras.additionalParameters = ["npa": "1"]           // (contextual only)
            request.register(extras)
            RewardedAd.load(with: self.unit, request: request, completionHandler: { ad, error in
                DispatchQueue.main.async {
                    self.loading = false
                    let list = self.waiting; self.waiting = []
                    if error != nil { for f in list { f(nil) } ; return }
                    ad?.fullScreenContentDelegate = self
                    if list.isEmpty { self.ready = ad } else { for (i, f) in list.enumerated() { f(i == 0 ? ad : nil) } }
                }
            })
        }
    }

    @objc func watch(_ call: CAPPluginCall) {
        if showing != nil { call.reject("a video is already showing", "busy"); return }
        if unit.isEmpty { call.reject("no video unit", "noad"); return }
        let next = call.getBool("next") ?? false
        let child = call.getBool("child") ?? false              // (a player under 13: child-directed, no consent asked of them: age.js)
        if child {                                               // (literals: they suit the SDK's tri-state settings)
            MobileAds.shared.requestConfiguration.tagForChildDirectedTreatment = true
            MobileAds.shared.requestConfiguration.tagForUnderAgeOfConsent = true
        } else {
            MobileAds.shared.requestConfiguration.tagForChildDirectedTreatment = false
            MobileAds.shared.requestConfiguration.tagForUnderAgeOfConsent = false
        }
        if child != (self.childAds ?? child) { self.ready = nil }      // (a video got ready for the other kind of player: not shown)
        self.childAds = child
        prepare(child: child) { ok in
            if !ok { call.reject("no consent to ask for videos", "noconsent"); return }
            self.load { ad in
                guard let ad = ad, let vc = self.bridge?.viewController else { call.reject("no video just now", "noad"); return }
                self.showing = call; self.earned = false
                if next { self.load { ad in if let ad = ad { self.ready = ad } } }      // (the next one got ready meanwhile)
                ad.present(from: vc, userDidEarnRewardHandler: { self.earned = true })
            }
        }
    }

    public func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
        guard let call = showing else { return }
        showing = nil
        call.resolve(["earned": earned, "privacy": privacyAsked()])
    }
    public func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        guard let call = showing else { return }
        showing = nil
        call.reject(error.localizedDescription, "noad")
    }

    @objc func choices(_ call: CAPPluginCall) {
        prepare { _ in
            Task { @MainActor in
                guard let vc = self.bridge?.viewController, self.privacyAsked() else { call.resolve(["shown": false]); return }
                do { try await ConsentForm.presentPrivacyOptionsForm(from: vc); call.resolve(["shown": true, "privacy": self.privacyAsked()]) }
                catch { call.reject(error.localizedDescription, "failed") }
            }
        }
    }
}
