// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Your actual live Firebase configuration for whtdfork-df24a
const firebaseConfig = {
  apiKey: "AIzaSyBNYb5LADZj2OzSKi5UXVRDaePh8juiXS8",
  authDomain: "whtdfork-df24a.firebaseapp.com",
  projectId: "whtdfork-df24a",
  storageBucket: "whtdfork-df24a.firebasestorage.app",
  messagingSenderId: "500624538156",
  appId: "1:500624538156:web:2e4ede073414149fb02f89"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);