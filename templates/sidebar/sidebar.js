// sidebar.js
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { app } from "../../js/firebase-config.js";

class Sidebar extends HTMLElement {
  connectedCallback() {
 
    const basePath = window.location.pathname.includes("/HR-System-july-29-2025-jd-2/") ? "/HR-System-july-29-2025-jd-2" : "";

   
    const existingFavicon = document.querySelector("link[rel~='icon']");
    if (!existingFavicon) {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = `${basePath}/images/assets/logo.png`;
      link.type = "image/png";
      document.head.appendChild(link);
    }


    //basepath ginamit para kahit saang e lagay ang system automatic niya read without hardcoding the 

    //HR-SYSTEM which is ang root folder

    // na gawa ko na din pala sa dashboard


    this.innerHTML = `
      <div class="sidebar">
        <div class="logo-container">
          <img src="${basePath}/images/assets/logo.png" alt="Logo" />
        </div>
        <a href="${basePath}/templates/dashboard/dashboard.html" data-label="Dashboard"><i class="fas fa-chart-line"></i></a>
        <a href="${basePath}/templates/employee/employee.html" data-label="Employees"><i class="fas fa-users"></i></a>
        <a href="${basePath}/templates/applicants/applicants.html" data-label="Applicants"><i class="fas fa-file-alt"></i></a>
        <a href="#" data-label="Settings"><i class="fas fa-cog"></i></a>
        <div class="logout-section">
          <a href="#" class="logout-link" data-label="Logout"><i class="fas fa-sign-out-alt"></i></a>
        </div>
      </div>
    `;

   
    const logoutBtn = this.querySelector(".logout-link");

    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
    
      Swal.fire({
        title: "Are you sure?",
        text: "You will be logged out.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, log me out!",
        cancelButtonText: "Cancel",
        background: "#ffffff",
        customClass: {
          popup: 'swal-custom-font',
          title: 'swal-title',
          htmlContainer: 'swal-text',
          confirmButton: 'swal-confirm',
          cancelButton: 'swal-cancel'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          const auth = getAuth(app);
          signOut(auth)
            .then(() => {
              Swal.fire({
                icon: "success",
                title: "Logged out",
                showConfirmButton: false,
                timer: 1500,
                background: "#ffffff",
                customClass: {
                  popup: 'swal-custom-font',
                  title: 'swal-title',
                }
              }).then(() => {
                history.pushState(null, "", location.href);
                window.addEventListener("popstate", () => {
                  history.pushState(null, "", location.href);
                });
    
                window.location.href = `${basePath}/templates/auth/login.html`;
              });
            })
            .catch((error) => {
              Swal.fire({
                title: "Error",
                text: error.message,
                icon: "error",
                background: "#ffffff",
                customClass: {
                  popup: 'swal-custom-font',
                  title: 'swal-title',
                  htmlContainer: 'swal-text',
                  confirmButton: 'swal-confirm',
                }
              });
            });
        }
      });
    });
    
  }
}

customElements.define("main-sidebar", Sidebar);
