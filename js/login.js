import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { app } from "./firebase-config.js";

const auth = getAuth(app);

window.login = function () {
  const email = document.querySelector(".email-container input").value.trim();
  const password = document.querySelector(".password-container input").value;

  if (!email || !password) {
    Swal.fire({
      icon: "warning",
      title: "Missing Fields",
      text: "Please enter both email and password.",
      confirmButtonColor: "#3085d6"
    });
    return false;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      Swal.fire({
        icon: "success",
        title: "Login Successful",
        text: `Welcome back, ${userCredential.user.email}!`,
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        window.location.href = "../../templates/dashboard/dashboard.html";
      });
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
  }

  Swal.fire({
    icon: "error",
    title: "Reset Failed",
    text: message,
    confirmButtonColor: "#d33"
  });
});

  return false;
};

document.getElementById("forgot-password").addEventListener("click", (e) => {
  e.preventDefault();

  const email = document.querySelector(".email-container input").value.trim();

  if (!email) {
    Swal.fire({
      icon: "info",
      title: "Enter Email First",
      text: "Please enter your email address above before clicking 'Forgot Password'.",
      confirmButtonColor: "#3085d6"
    });
    return;
  }

  sendPasswordResetEmail(auth, email)
  .then(() => {
    Swal.fire({
      icon: "success",
      title: "Password Reset Email Sent",
      html: `
        <p>We've sent a password reset link to:</p>
        <strong>${email}</strong>
        <br><br>
        <small>Please also check your <em>Spam</em> or <em>Junk</em> folder if you don’t see it in your inbox.</small>
      `,
      confirmButtonText: "OK",
      confirmButtonColor: "#3085d6"
    });
  })
});

const loginButton = document.querySelector(".button-container button");
loginButton.disabled = true;
loginButton.innerText = "Logging in...";

// Re-enable after login
signInWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {

  })
  .catch((error) => {

  })
  .finally(() => {
    loginButton.disabled = false;
    loginButton.innerText = "Login";
  });