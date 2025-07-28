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
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: error.message,
        confirmButtonColor: "#d33"
      });
    });

  return false;
};

// 🔁 Forgot Password Handler
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
        title: "Reset Link Sent",
        html: "Please check your email to reset your password.<br><strong>Don’t forget to check your Spam or Junk folder!</strong>",
        confirmButtonColor: "#3085d6"
      });
    })
    .catch((error) => {
      Swal.fire({
        icon: "error",
        title: "Reset Failed",
        text: error.message,
        confirmButtonColor: "#d33"
      });
    });
});
