import Foundation
import Capacitor
import StoreKit

// Feather & Field's shop for real money (14 Nov 2026): the winter buildings, each bought once and kept for good
// (Apple's "non-consumable"), and the nine together. StoreKit 2: what is owned is read from Apple's own signed
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
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise)
    ]
    private var updates: Task<Void, Never>?

    override public func load() {
        // purchases finished elsewhere (approved later by a parent, another device): taken in, the game asks again
        updates = Task.detached {
            for await result in Transaction.updates {
                if case .verified(let t) = result { await t.finish() }
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
                call.resolve(["products": list.map { ["id": $0.id, "price": $0.displayPrice] }])
            } catch {
                call.reject("products")
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
                        await t.finish()
                        call.resolve(["state": "bought", "ids": await self.ownedIds()])
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
