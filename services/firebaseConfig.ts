// Import the functions you need from the SDKs you need
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDhC0d5uDWWHbhheXOaOCCawzalEsKX-8",
  authDomain: "uniskillswap.firebaseapp.com",
  projectId: "uniskillswap",
  storageBucket: "uniskillswap.firebasestorage.app",
  messagingSenderId: "14843149556",
  appId: "1:14843149556:web:6d182a6efe755f86cbb2a1",
  measurementId: "G-G70430KEXW"
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export { app }; 