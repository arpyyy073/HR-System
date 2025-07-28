class Sidebar extends HTMLElement {
  connectedCallback() {
    // Add favicon if not already present
    const existingFavicon = document.querySelector("link[rel~='icon']");
    if (!existingFavicon) {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = "/images/assets/logo.png";
      link.type = "image/png";
      document.head.appendChild(link);
    }

    // Inject sidebar HTML
    this.innerHTML = `
      <div class="sidebar">
      <div class="logo-container">
        <img src="/images/assets/logo.png" alt="Logo" />
      </div>

      <a href="/templates/dashboard/dashboard.html" data-label="Dashboard">
        <i class="fas fa-chart-line"></i>
      </a>
      <a href="/templates/employee/employee.html" data-label="Employees">
        <i class="fas fa-users"></i>
      </a>
      <a href="/templates/applicants/applicants.html" data-label="Applicants">
        <i class="fas fa-file-alt"></i>
      </a>
      <a href="#" data-label="Settings">
        <i class="fas fa-cog"></i>
      </a>

      <div class="logout-section">
        <a
          href="/templates/auth/login.html"
          class="logout-link"
          data-label="Logout"
        >
          <i class="fas fa-sign-out-alt"></i>
        </a>
      </div>
    </div>
    `;
  }
}

// Register the custom element
customElements.define("main-sidebar", Sidebar);
