import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { app } from "./firebase-config.js";

const auth = getAuth(app);
const db = getFirestore(app);

// Toastify helper function
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

      // Extract first name and last name
      const nameParts = name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Add user data to Firestore users collection
      try {
        await addDoc(collection(db, 'users'), {
          uid: user.uid,
          email: email,
          firstName: firstName,
          lastName: lastName,
          fullName: name,
          password: password, // Note: In production, you should hash passwords
          createdAt: new Date(),
          status: 'active'
        });
        
        showToast("Registration successful! User data saved. Redirecting...", "#27ae60", 2000);
      } catch (firestoreError) {
        console.error('Error adding user to Firestore:', firestoreError);
        showToast("Registration successful but failed to save user data.", "#f39c12", 2000);
      }

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
