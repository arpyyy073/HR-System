import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { app } from "./firebase-config.js";

const auth = getAuth(app);
const db = getFirestore(app);

function showToast(message, color = "#333", duration = 3000) {
  Toastify({
    text: message,
    duration: duration,
    close: true,
    gravity: "top",
    position: "right",
    backgroundColor: color,
    stopOnFocus: true
  }).showToast();
}

window.register = function () {
  const name = document.querySelectorAll("input")[0].value.trim();
  const email = document.querySelectorAll("input")[1].value.trim();
  const password = document.querySelectorAll("input")[2].value;
  const confirmPassword = document.querySelectorAll("input")[3].value;

  if (!name || !email || !password || !confirmPassword) {
    showToast("Please fill in all fields.", "#f39c12");
    return false;
  }

  if (password !== confirmPassword) {
    showToast("Passwords do not match.", "#e74c3c");
    return false;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      await updateProfile(user, { displayName: name });
      const userData = {
        uid: user.uid,
        name: name,
        email: email,
        role: "user",
        createdAt: new Date()
      };

      await setDoc(doc(db, "users", user.uid), userData);
      console.log("User added to Firestore:", userData);

      showToast("Registration successful! Redirecting...", "#27ae60", 2000);
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    })
    .catch((error) => {
      let message = error.message;
      if (error.code === "auth/email-already-in-use") {
        message = "Email already in use.";
      } else if (error.code === "auth/invalid-email") {
        message = "Invalid email format.";
      } else if (error.code === "auth/weak-password") {
        message = "Password should be at least 6 characters.";
      }

      showToast(message, "#e74c3c");
    });

  return false;
};
