// The online side of My account (account.js): Firebase's Google sign-in and the farm's one Firestore document
// (farms/<the player's account>). Built on its own by build.sh into dist/cloud.js and loaded only when it's needed, so the
// game itself stays as light as it was. Firestore "lite": plain requests, no live updates or offline copy (the game keeps
// its own copy on the phone).
// The rules that keep each farm its owner's own are in web3d/firestore.rules (rulestest.mjs tries them on the emulator).
import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup, reauthenticateWithPopup, signOut, deleteUser, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, doc, getDoc, runTransaction, deleteDoc, serverTimestamp, connectFirestoreEmulator } from 'firebase/firestore/lite';

function make(config, emu) {
  const app = initializeApp(config);
  // (the popup's helper set up at once: on an iPhone, Google's window must open straight from the tap)
  const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence], popupRedirectResolver: browserPopupRedirectResolver });
  const db = getFirestore(app);
  if (emu) { connectAuthEmulator(auth, `http://${emu}:9099`, { disableWarnings: true }); connectFirestoreEmulator(db, emu, 8080); }
  const google = new GoogleAuthProvider(); google.setCustomParameters({ prompt: 'select_account' });
  const userOf = u => (u ? { uid: u.uid, name: u.displayName || '', email: u.email || '' } : null);
  const ref = () => doc(db, 'farms', auth.currentUser.uid);
  return {
    onUser(f) { onAuthStateChanged(auth, u => f(userOf(u))); },
    async signIn() { const r = await signInWithPopup(auth, google); return userOf(r.user); },
    signOut: () => signOut(auth),
    async get() {
      const s = await getDoc(ref()); if (!s.exists()) return null;
      const v = s.data();
      return { farm: v.farm, n: v.n, at: v.at && v.at.toMillis ? v.at.toMillis() : 0, lv: v.lv, coins: v.coins, made: v.made };
    },
    // the farm saved, numbered one more than the one it replaces, if that's still the one online (else another phone
    // saved meanwhile: { conflict })
    put(d, base) {
      return runTransaction(db, async tx => {
        const s = await tx.get(ref()), cur = s.exists() ? s.data().n : 0;
        if (cur !== base) return { conflict: true };
        tx.set(ref(), { farm: d.farm, n: base + 1, at: serverTimestamp(), lv: d.lv, coins: d.coins, made: d.made });
        return { n: base + 1, at: Date.now() };
      });
    },
    // the account deleted: Google asks who it is again first, then the farm online, then the account
    async drop() { const u = auth.currentUser; await reauthenticateWithPopup(u, google); await deleteDoc(ref()); await deleteUser(u); },
  };
}
window.FFCloud = { make };
