
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"; 


export const firebaseConfig = {
  apiKey: "AIzaSyBb9t2e4pzmakp5WsTIj_4SfzuKP2CaDc8",
  authDomain: "hhi-hrms-49d30.firebaseapp.com",
  projectId: "hhi-hrms-49d30",
  storageBucket: "hhi-hrms-49d30.appspot.com",
  messagingSenderId: "48853221020",
  appId: "1:48853221020:web:2634f6eb5f81374905f759",
  measurementId: "G-CEB6FSFZLC"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
