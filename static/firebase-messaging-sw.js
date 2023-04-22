importScripts('https://www.gstatic.com/firebasejs/9.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.19.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: 'AIzaSyDvtXl98xCZU0IJXN_LvAAjK1gNT1SJGDU',
  authDomain: 'geocomm-sns.firebaseapp.com',
  projectId: 'geocomm-sns',
  storageBucket: 'geocomm-sns.appspot.com',
  messagingSenderId: '921205338102',
  appId: '1:921205338102:web:215bc578bf926432bd21d7',
  measurementId: 'G-3MW2ZV5PDJ',
};

const firebaseApp = firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messagingApp = firebase.messaging();
