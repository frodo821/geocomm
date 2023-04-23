import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';
import * as fbAuth from 'firebase/auth';

{
  const s = document.createElement('script');
  s.src="https://cdn.jsdelivr.net/npm/eruda/eruda.min.js";
  s.onload=()=>eruda.init();
  document.head.appendChild(s);
}

const firebaseConfig = {
  apiKey: 'AIzaSyDvtXl98xCZU0IJXN_LvAAjK1gNT1SJGDU',
  authDomain: location.hostname ?? 'geocomm-sns.firebaseapp.com',
  projectId: 'geocomm-sns',
  storageBucket: 'geocomm-sns.appspot.com',
  messagingSenderId: '921205338102',
  appId: '1:921205338102:web:215bc578bf926432bd21d7',
  measurementId: 'G-3MW2ZV5PDJ',
};

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

export const auth = fbAuth.getAuth();
export const firestoreApp = getFirestore();
export const messaging = getMessaging();

let messagingToken: string;

export function getMessagingToken() {
  return messagingToken;
}

export async function signingIn() {
  await fbAuth.setPersistence(auth, fbAuth.indexedDBLocalPersistence);
  const provider = new fbAuth.GoogleAuthProvider();
  await fbAuth.signInWithRedirect(auth, provider);
}

export async function getAuthResult() {
  await fbAuth.getRedirectResult(auth);

  if (auth.currentUser === null) {
    await fbAuth.signInAnonymously(auth);
  }

  if (typeof messagingToken === 'undefined') {
    messagingToken = await getToken(messaging);
  }

  return auth.currentUser;
}
