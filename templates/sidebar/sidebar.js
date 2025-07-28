// sidebar.js
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { app } from "../../js/firebase-config.js";


class Sidebar extends HTMLElement {
  connectedCallback() {

    const existingFavicon = document.querySelector("link[rel~='icon']");
    if (!existingFavicon) {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = "/images/assets/logo.png";
      link.type = "image/png";
      document.head.appendChild(link);
    }

    // Sidebar UI
    this.innerHTML = `
      <div class="sidebar">
        <div class="logo-container">
          <img src="../../images/assets/logo.png" alt="Logo" />
        </div>
        <a href="/HR-System/templates/dashboard/dashboard.html" data-label="Dashboard"><i class="fas fa-chart-line"></i></a>
        <a href="/HR-System/templates/employee/employee.html" data-label="Employees"><i class="fas fa-users"></i></a>
        <a href="/HR-System/templates/applicants/applicants.html" data-label="Applicants"><i class="fas fa-file-alt"></i></a>
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
        confirmButtonText: "Yes, log me out!"
      }).then((result) => {
        if (result.isConfirmed) {
          const auth = getAuth(app);
          signOut(auth)
            .then(() => {
              Swal.fire({
                icon: "success",
                title: "Logged out",
                showConfirmButton: false,
                timer: 1500
              }).then(() => {
                history.pushState(null, "", location.href);
                window.addEventListener("popstate", () => {
                  history.pushState(null, "", location.href);
                });
                window.location.href = "/HR-System/templates/auth/login.html";
              });
            })
            .catch((error) => {
              Swal.fire("Error", error.message, "error");
            });
        }
      });
    });
  }
}

customElements.define("main-sidebar", Sidebar);
