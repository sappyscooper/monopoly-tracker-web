import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDJNAnkyvSPLzPYNYtWbvUWnKvwmyAfYfE",
  authDomain: "monopoly-tracker-39afa.firebaseapp.com",
  projectId: "monopoly-tracker-39afa",
  storageBucket: "monopoly-tracker-39afa.firebasestorage.app",
  messagingSenderId: "594004365408",
  appId: "1:594004365408:e4d9a69bae1ae37305",
  measurementId: "G-ZVS103PN4E"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
