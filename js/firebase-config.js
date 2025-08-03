import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDun5JjLLS1ooi2lV4og5ykH9sq6ATIWs0",
  authDomain: "hhi-hrms.firebaseapp.com",
  projectId: "hhi-hrms",
  storageBucket: "hhi-hrms.appspot.com",
  messagingSenderId: "478227639599",
  appId: "1:478227639599:web:2090cc4389b34fd5e545da",
  measurementId: "G-5YT8H6G8BY"
};

export const app = initializeApp(firebaseConfig);
export let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  } else {
    console.warn("Firebase Analytics not supported (IndexedDB unavailable)");
  }
});

export const db = getFirestore(app);
export const auth = getAuth(app);