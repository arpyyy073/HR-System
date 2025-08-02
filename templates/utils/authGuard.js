
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { app } from "../../js/firebase-config.js"; 


export function enforceAuthRedirect() {
  const auth = getAuth(app);


  const basePath = window.location.pathname.includes("/HR-System/") ? "/HR-System" : "";

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = `${basePath}/templates/auth/login.html`;
    }
  });
}
