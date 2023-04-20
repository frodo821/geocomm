import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import * as fbAuth from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDvtXl98xCZU0IJXN_LvAAjK1gNT1SJGDU",
  authDomain: "geocomm-sns.firebaseapp.com",
  projectId: "geocomm-sns",
  storageBucket: "geocomm-sns.appspot.com",
  messagingSenderId: "921205338102",
  appId: "1:921205338102:web:215bc578bf926432bd21d7",
  measurementId: "G-3MW2ZV5PDJ",
};

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

export const auth = fbAuth.getAuth();
export const firestoreApp = getFirestore();

export async function signingIn() {
  await fbAuth.setPersistence(auth, fbAuth.indexedDBLocalPersistence);
  const provider = new fbAuth.GoogleAuthProvider();
  await fbAuth.signInWithRedirect(auth, provider);
}

export async function getAuthResult() {
  await fbAuth.getRedirectResult(auth);
  return auth.currentUser;
}
