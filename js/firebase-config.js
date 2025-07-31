import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDun5JjLLS1ooi2lV4og5ykH9sq6ATIWs0",
  authDomain: "hhi-hrms.firebaseapp.com",
  databaseURL: "https://hhi-hrms-default-rtdb.firebaseio.com",
  projectId: "hhi-hrms",
  storageBucket: "hhi-hrms.firebasestorage.app",
  messagingSenderId: "478227639599",
  appId: "1:478227639599:web:2090cc4389b34fd5e545da",
  measurementId: "G-5YT8H6G8BY"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getDatabase(app);