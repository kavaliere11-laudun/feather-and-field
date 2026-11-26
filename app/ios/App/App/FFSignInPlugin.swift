import Foundation
import Capacitor
import AuthenticationServices
import CryptoKit

// My account inside the app (24 Nov 2026, Audrey: "I think we need it especially if people are making purchases otherwise
// they might loose everything without an account"): the phone's own sign-in, since Google's page can't open inside an app.
//   apple({ nonce }): Sign in with Apple (the phone's own sheet); the nonce goes to Apple hashed, the game keeps it raw
//   google(): Google's sign-in page in the system's secure sheet (ASWebAuthenticationSession, as Google's own kit does),
//     the iOS client of the game's Firebase project, PKCE (no secret anywhere)
// Each gives back the account's ID token; the game (web3d/src/account.js, cloud.js) signs in to Firebase with it.
//   revoke({ code, idToken, key }) (26 Nov 2026, the launch review, blocker 3; Apple's rule 5.1.1(v)): when an Apple
//     account is deleted, Apple's link to the game is cancelled too: Apple's one-time code from the sign-in just before
//     goes to Firebase (Identity Toolkit accounts:revokeToken, as Firebase's own iOS kit does), which swaps it with Apple
//     for a token and cancels it, using the Sign in with Apple key Audrey put into Firebase herself (never here).
// Nothing is kept here; no keys or secrets: the client ID is a public identifier, as in any app.
@objc(FFSignInPlugin)
public class FFSignInPlugin: CAPInstancePlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "FFSignInPlugin"
    public let jsName = "FFSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "apple", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "google", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hello", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "revoke", returnType: CAPPluginReturnPromise)
    ]
    static let googleClient = "705093854658-8h2m9uks36c190kg55o8msl5h4safb1o.apps.googleusercontent.com"
    static let googleScheme = "com.googleusercontent.apps.705093854658-8h2m9uks36c190kg55o8msl5h4safb1o"
    private var appleCall: CAPPluginCall?
    private var webSession: ASWebAuthenticationSession?

    @objc func hello(_ call: CAPPluginCall) { call.resolve(["v": 1]) }

    // ---- Sign in with Apple
    @objc func apple(_ call: CAPPluginCall) {
        let nonce = call.getString("nonce") ?? ""
        DispatchQueue.main.async {
            let req = ASAuthorizationAppleIDProvider().createRequest()
            req.requestedScopes = [.fullName, .email]
            if !nonce.isEmpty { req.nonce = FFSignInPlugin.sha256(nonce) }
            let c = ASAuthorizationController(authorizationRequests: [req])
            c.delegate = self
            c.presentationContextProvider = self
            self.appleCall = call
            c.performRequests()
        }
    }
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = appleCall else { return }
        appleCall = nil
        guard let cred = authorization.credential as? ASAuthorizationAppleIDCredential, let t = cred.identityToken,
              let token = String(data: t, encoding: .utf8) else { call.reject("Apple gave no token", "failed"); return }
        var name = ""
        if let n = cred.fullName { name = PersonNameComponentsFormatter().string(from: n) }
        let code = cred.authorizationCode.flatMap { String(data: $0, encoding: .utf8) } ?? ""      // (one use, a few minutes: for revoke)
        call.resolve(["idToken": token, "name": name, "email": cred.email ?? "", "code": code])
    }
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = appleCall else { return }
        appleCall = nil
        if let e = error as? ASAuthorizationError, e.code == .canceled { call.reject("cancelled", "cancelled"); return }
        call.reject(error.localizedDescription, "failed")
    }
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    // ---- Google, in the system's secure sheet
    @objc func google(_ call: CAPPluginCall) {
        let verifier = FFSignInPlugin.random(64)
        let challenge = FFSignInPlugin.base64url(Data(SHA256.hash(data: Data(verifier.utf8))))
        let redirect = FFSignInPlugin.googleScheme + ":/oauth2redirect"
        var comps = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        comps.queryItems = [
            URLQueryItem(name: "client_id", value: FFSignInPlugin.googleClient),
            URLQueryItem(name: "redirect_uri", value: redirect),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: "openid email profile"),
            URLQueryItem(name: "code_challenge", value: challenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "prompt", value: "select_account")
        ]
        guard let url = comps.url else { call.reject("no address", "failed"); return }
        DispatchQueue.main.async {
            let s = ASWebAuthenticationSession(url: url, callbackURLScheme: FFSignInPlugin.googleScheme) { back, error in
                self.webSession = nil
                if let error = error {
                    if (error as NSError).code == ASWebAuthenticationSessionError.Code.canceledLogin.rawValue { call.reject("cancelled", "cancelled") }
                    else { call.reject(error.localizedDescription, "failed") }
                    return
                }
                guard let back = back, let code = URLComponents(url: back, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "code" })?.value
                else { call.reject("Google gave no code", "failed"); return }
                var req = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
                req.httpMethod = "POST"
                req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
                let form = ["code": code, "client_id": FFSignInPlugin.googleClient, "redirect_uri": redirect, "grant_type": "authorization_code", "code_verifier": verifier]
                var allowed = CharacterSet.alphanumerics; allowed.insert(charactersIn: "-._~")
                req.httpBody = form.map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: allowed) ?? "")" }.joined(separator: "&").data(using: .utf8)
                URLSession.shared.dataTask(with: req) { data, _, _ in
                    guard let data = data, let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let id = j["id_token"] as? String
                    else { call.reject("Google didn't answer", "failed"); return }
                    call.resolve(["idToken": id])
                }.resume()
            }
            s.presentationContextProvider = self
            s.prefersEphemeralWebBrowserSession = false
            self.webSession = s
            if !s.start() { self.webSession = nil; call.reject("could not open", "failed") }
        }
    }
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    // ---- cancelling Apple's link (account deletion)
    @objc func revoke(_ call: CAPPluginCall) {
        guard let code = call.getString("code"), !code.isEmpty, let idToken = call.getString("idToken"), let key = call.getString("key"),
              let url = URL(string: "https://identitytoolkit.googleapis.com/v2/accounts:revokeToken?key=" + (key.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? ""))
        else { call.reject("missing", "missing"); return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let b = Bundle.main.bundleIdentifier { req.setValue(b, forHTTPHeaderField: "X-Ios-Bundle-Identifier") }
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["providerId": "apple.com", "tokenType": "CODE", "token": code, "idToken": idToken])
        req.timeoutInterval = 20
        URLSession.shared.dataTask(with: req) { data, resp, _ in
            let st = (resp as? HTTPURLResponse)?.statusCode ?? 0
            var why = ""
            if st != 200, let data = data, let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let e = j["error"] as? [String: Any], let m = e["message"] as? String { why = String(m.prefix(120)) }
            call.resolve(["ok": st == 200, "status": st, "why": why])
        }.resume()
    }

    static func sha256(_ s: String) -> String { SHA256.hash(data: Data(s.utf8)).map { String(format: "%02x", $0) }.joined() }
    static func base64url(_ d: Data) -> String {
        return d.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
    static func random(_ n: Int) -> String {
        let chars = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
        var g = SystemRandomNumberGenerator()
        return String((0..<n).map { _ in chars[Int.random(in: 0..<chars.count, using: &g)] })
    }
}
