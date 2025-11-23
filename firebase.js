// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC5HVOdNqsvzj3-Mv9kFZE5G_Yu8ihNRis",
  authDomain: "tp2-app-web.firebaseapp.com",
  projectId: "tp2-app-web",
  storageBucket: "tp2-app-web.firebasestorage.app",
  messagingSenderId: "227943001122",
  appId: "1:227943001122:web:459311c16c557e431c2e7b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;