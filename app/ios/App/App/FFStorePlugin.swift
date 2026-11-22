import Foundation
import Capacitor
import StoreKit

// Feather & Field's shop for real money (14 Nov 2026): the winter buildings, the rare Silkie trios and the Pantry's
// bigger shelves, each bought once and kept for good (Apple's "non-consumable"), and bags of coins ("consumable"). StoreKit 2: what is owned is read from Apple's own signed
// records (Transaction.currentEntitlements, each one verified on the phone by StoreKit), never from the game's save.
// Called from the game through the app's bridge (web3d/src/store.js): products, owned, buy, restore.
// No keys or secrets here: the phone's own Apple account does the paying.
@objc(FFStorePlugin)
public class FFStorePlugin: CAPInstancePlugin, CAPBridgedPlugin {
    public let identifier = "FFStorePlugin"
    public let jsName = "FFStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "owned", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "buy", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pending", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hello", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "storefront", returnType: CAPPluginReturnPromise)
    ]
    private var updates: Task<Void, Never>?

    override public func load() {
        // purchases finished elsewhere (approved later by a parent, another device): taken in, the game asks again
        updates = Task.detached {
            for await result in Transaction.updates {
                // (a bag of coins is left open until the game has handed the coins over: pending, finish)
                if case .verified(let t) = result, t.productType != .consumable { await t.finish() }
            }
        }
    }
    deinit { updates?.cancel() }

    // what Apple says this account owns now: verified records only, not refunded or revoked
    private func ownedIds() async -> [String] {
        var ids: [String] = []
        for await result in Transaction.currentEntitlements {
            if case .verified(let t) = result, t.revocationDate == nil, t.productType == .nonConsumable {
                ids.append(t.productID)
            }
        }
        return ids
    }

    @objc func products(_ call: CAPPluginCall) {
        let ids = (call.getArray("ids") ?? []).compactMap { $0 as? String }
        Task {
            do {
                let list = try await Product.products(for: Set(ids))
                call.resolve(["products": list.map { ["id": $0.id, "price": $0.displayPrice] }, "asked": ids.count])
            } catch {
                call.reject("products: \(String(String(describing: error).prefix(120)))")
            }
        }
    }

    @objc func owned(_ call: CAPPluginCall) {
        Task { call.resolve(["ids": await self.ownedIds()]) }
    }

    @objc func buy(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("id"); return }
        Task {
            do {
                guard let product = try await Product.products(for: [id]).first else { call.reject("unknown"); return }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    if case .verified(let t) = verification {
                        if t.productType == .consumable {
                            // coins: the game hands them over from this receipt, then calls finish
                            call.resolve(["state": "bought", "ids": await self.ownedIds(),
                                          "tx": ["id": String(t.id), "productId": t.productID]])
                        } else {
                            await t.finish()
                            call.resolve(["state": "bought", "ids": await self.ownedIds()])
                        }
                    } else {
                        call.resolve(["state": "failed", "ids": await self.ownedIds()])
                    }
                case .pending:
                    call.resolve(["state": "pending", "ids": await self.ownedIds()])
                case .userCancelled:
                    call.resolve(["state": "cancelled", "ids": await self.ownedIds()])
                @unknown default:
                    call.resolve(["state": "failed", "ids": await self.ownedIds()])
                }
            } catch {
                call.reject("buy")
            }
        }
    }

    // bags of coins paid for and not yet handed over (verified receipts only, not refunded)
    @objc func pending(_ call: CAPPluginCall) {
        Task {
            var list: [[String: String]] = []
            for await result in Transaction.unfinished {
                if case .verified(let t) = result, t.productType == .consumable, t.revocationDate == nil {
                    list.append(["id": String(t.id), "productId": t.productID])
                }
            }
            call.resolve(["list": list])
        }
    }

    // a bag's coins handed over: Apple is told this receipt is done
    @objc func finish(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("id"); return }
        Task {
            for await result in Transaction.unfinished {
                if case .verified(let t) = result, String(t.id) == id { await t.finish() }
            }
            call.resolve()
        }
    }

    // (22 Nov 2026, Audrey's shop empty in TestFlight, Apple silent: is the plugin reached at all, and which country's App
    // Store the phone uses, each on its own so one that never answers can't hide the other)
    @objc func hello(_ call: CAPPluginCall) { call.resolve(["v": 1]) }

    @objc func storefront(_ call: CAPPluginCall) {
        let once = Once()
        Task { let code = (await Storefront.current)?.countryCode ?? "none"; if once.first() { call.resolve(["store": code]) } }
        Task { try? await Task.sleep(nanoseconds: 5_000_000_000); if once.first() { call.resolve(["store": "?"]) } }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                call.resolve(["ids": await self.ownedIds()])
            } catch {
                call.reject("restore")
            }
        }
    }
}

// the first of two answers wins (the storefront's, or its time running out)
final class Once: @unchecked Sendable {
    private var done = false
    private let lock = NSLock()
    func first() -> Bool { lock.lock(); defer { lock.unlock() }; if done { return false }; done = true; return true }
}
