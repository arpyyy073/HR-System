  document.addEventListener("DOMContentLoaded", () => {
    const deptIds = [
      "count-internship",
      "count-tgqs",
      "count-admin-managers",
      "count-it-technical",
      "count-oppy",
      "count-marketing",
      "count-unicorn",
      "count-carrier"
    ];

    deptIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = Math.floor(Math.random() * 50);
    });

    const rahyo = document.getElementById("rahyo-count");
    const hhi = document.getElementById("hhi-count");
    if (rahyo) rahyo.innerHTML = 10;
    if (hhi) hhi.innerHTML = 15;

    // Dummy data
    const departmentData = {
      internship: [
        { name: "John Doe", position: "Intern", email: "john@company.com" },
        { name: "Jane Smith", position: "Intern", email: "jane@company.com" }
      ],
      tgqs: [{ name: "Alice", position: "Engineer", email: "alice@tgqs.com" }],
      "admin-managers": [{ name: "Bob", position: "Manager", email: "bob@admin.com" }],
      "it-technical": [{ name: "Techy", position: "IT Specialist", email: "techy@it.com" }],
      oppy: [{ name: "Dan", position: "Driver", email: "dan@oppy.com" }],
      marketing: [{ name: "Ella", position: "Lead", email: "ella@marketing.com" }],
      unicorn: [{ name: "Steve", position: "Hair Stylist AI", email: "steve@unicorn.ai" }],
      carrier: [{ name: "Carla", position: "Operator", email: "carla@carrier.com" }]
    };

    const organizationData = {
      rahyo: [
        { name: "Amir", position: "CEO", email: "amir@rahyo.com" },
        { name: "Lana", position: "HR", email: "lana@rahyo.com" }
      ],
      hhi: [
        { name: "Carlos", position: "Supervisor", email: "carlos@hhi.com" },
        { name: "Nina", position: "Engineer", email: "nina@hhi.com" }
      ]
    };

    function showModal(dataKey, title, source = "department") {
      const modal = document.getElementById("departmentModal");
      const modalTitle = document.getElementById("modalTitle");
      const tableBody = document.getElementById("modalTableBody");

      modalTitle.textContent = `${title} ${source === "department" ? "Department" : "Organization"}`;
      tableBody.innerHTML = "";

      const data = source === "department" ? departmentData[dataKey] : organizationData[dataKey];

      (data || []).forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.name}</td>
          <td>${item.position}</td>
          <td>${item.email}</td>
        `;
        tableBody.appendChild(row);
      });

      modal.classList.remove("hidden");
    }


    document.querySelectorAll(".dept-card").forEach((card) => {
      card.addEventListener("click", () => {
        const spanId = card.querySelector("span").id;
        const deptKey = spanId.replace("count-", "");
        const deptLabel = card.querySelector(".label").textContent.trim();
        showModal(deptKey, deptLabel, "department");
      });
    });


    document.querySelectorAll(".stat-card-org").forEach((card) => {
      card.addEventListener("click", () => {
        const spanId = card.querySelector(".stat-counter").id;
        const orgKey = spanId.replace("-count", ""); // "rahyo" or "hhi"
        const orgLabel = card.querySelector(".stat-name").textContent.trim();
        showModal(orgKey, orgLabel, "organization");
      });
    });


    const closeModalBtn = document.querySelector(".close-btn");
    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", () => {
        document.getElementById("departmentModal").classList.add("hidden");
      });
    }

    document.getElementById("departmentModal").addEventListener("click", (e) => {
      if (e.target.id === "departmentModal") {
        document.getElementById("departmentModal").classList.add("hidden");
      }
    });
  });