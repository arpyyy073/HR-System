import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { app, db } from "./firebase-config.js";


const auth = getAuth(app);

window.register = function () {
  const name = document.querySelectorAll("input")[0].value.trim();
  const email = document.querySelectorAll("input")[1].value.trim();
  const password = document.querySelectorAll("input")[2].value;
  const confirmPassword = document.querySelectorAll("input")[3].value;

  if (!name || !email || !password || !confirmPassword) {
    Swal.fire("Missing Fields", "Please fill in all fields.", "warning");
    return false;
  }

  if (password !== confirmPassword) {
    Swal.fire("Password Mismatch", "Passwords do not match.", "error");
    return false;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;

      // Set the display name in auth profile
      await updateProfile(user, { displayName: name });

      // Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: user.email,
        createdAt: new Date()
      });

      Swal.fire({
        icon: "success",
        title: "Registration Successful",
        text: "You can now log in.",
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        window.location.href = "login.html";
      });
    })
    .catch((error) => {
      Swal.fire("Error", error.message, "error");
    });

  return false;
};
