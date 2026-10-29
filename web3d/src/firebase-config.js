// The game's Firebase project (release 7, My account): the web app's settings from the Firebase console (Project settings,
// Your apps; Audrey's project "feather-and-field", 29 Oct 2026). They only say which project to talk to: they're meant to
// be public, and the security rules (web3d/firestore.rules) are what keep each farm its owner's own.
export const FIREBASE = {
  apiKey: 'AIzaSyDBi5-Z-crRKDp9tLByKNveW4Xkbzavr3U',
  authDomain: 'feather-and-field.firebaseapp.com',
  projectId: 'feather-and-field',
  storageBucket: 'feather-and-field.firebasestorage.app',
  messagingSenderId: '705093854658',
  appId: '1:705093854658:web:53ab097a6431c2ddb1a25b',
};
// the account shown in the game: only once the online side (dist/cloud.js) is built and tested, and the rules are in
// (false: nothing of the account anywhere; on for everyone since 29 Oct, after Audrey signed in from Safari: "On for
// everyone now")
export const ACCOUNT_LIVE = true;
