import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCVkmmKMfZcaLGPC8Ihm2yPV5EAapBYEsA",
  authDomain: "globalchat-61dbb.firebaseapp.com",
  projectId: "globalchat-61dbb",
  storageBucket: "globalchat-61dbb.firebasestorage.app",
  messagingSenderId: "532726081595",
  appId: "1:532726081595:web:6472f8462977e9eb74541e",
  measurementId: "G-SMNKNB0XLF"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);