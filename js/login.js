import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { app } from "./firebase-config.js";

const auth = getAuth(app);

// Helper to show Toastify notifications
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

window.login = function () {
  const email = document.querySelector(".email-container input").value.trim();
  const password = document.querySelector(".password-container input").value;
  const loginButton = document.querySelector(".button-container button");

  if (!email || !password) {
    showToast("Please enter both email and password.", "#f39c12");
    return false;
  }

  loginButton.disabled = true;
  loginButton.innerText = "Logging in...";

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      showToast(`Welcome back, ${userCredential.user.email}!`, "#27ae60", 1500);
      setTimeout(() => {
        window.location.href = "../../templates/dashboard/dashboard.html";
      }, 1500);
    })
    .catch((error) => {
      let message = "Something went wrong. Please try again later.";
      switch (error.code) {
        case "auth/user-not-found":
          message = "No account found with that email.";
          break;
        case "auth/invalid-email":
          message = "The email address is badly formatted.";
          break;
        case "auth/network-request-failed":
          message = "Network error. Please check your connection.";
          break;
        case "auth/wrong-password":
          message = "Incorrect password. Please try again.";
          break;
      }
      showToast(message, "#e74c3c");
    })
    .finally(() => {
      loginButton.disabled = false;
      loginButton.innerText = "Login";
    });

  return false;
};

// Forgot password handler
document.getElementById("forgot-password").addEventListener("click", (e) => {
  e.preventDefault();

  const email = document.querySelector(".email-container input").value.trim();

  if (!email) {
    showToast("Please enter your email before clicking 'Forgot Password'.", "#3498db");
    return;
  }

  sendPasswordResetEmail(auth, email)
    .then(() => {
      showToast(`Password reset email sent to ${email}.`, "#27ae60", 5000);
    })
    .catch((error) => {
      let message = "Failed to send reset email. Please try again.";
      if (error.code === "auth/user-not-found") {
        message = "No user found with that email.";
      }
      showToast(message, "#e74c3c");
    });
});