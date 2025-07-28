const departmentsData = [
  {
    name: "ADMIN",
    tag: "admin",
    employees: {
      active: 12,
      inactive: 2,
    },
  },
  {
    name: "CARRIER CONNECTION",
    tag: "carrier",
    employees: {
      active: 5,
      inactive: 1,
    },
  },
  {
    name: "CONNECT 2 BULK",
    tag: "connect",
    employees: {
      active: 6,
      inactive: 2,
    },
  },
  {
    name: "DLPUB",
    tag: "dlpub",
    employees: {
      active: 7,
      inactive: 0,
    },
  },
  {
    name: "IT AND TECHNICAL",
    tag: "it-tech",
    employees: {
      active: 8,
      inactive: 1,
    },
  },
  {
    name: "INTERN",
    tag: "intern",
    employees: {
      active: 4,
      inactive: 0,
    },
  },
  {
    name: "NIBF",
    tag: "nibf",
    employees: {
      active: 2,
      inactive: 0,
    },
  },
  {
    name: "OPPY",
    tag: "oppy",
    employees: {
      active: 10,
      inactive: 1,
    },
  },
  {
    name: "PEARCE WW",
    tag: "pearce",
    employees: {
      active: 5,
      inactive: 2,
    },
  },
  {
    name: "RECOVERY MODE",
    tag: "recovery",
    employees: {
      active: 3,
      inactive: 0,
    },
  },
  {
    name: "UNICORN",
    tag: "unicorn",
    employees: {
      active: 6,
      inactive: 3,
    },
  },
];

const deptListEl = document.getElementById("dept-list");
const searchInput = document.getElementById("dept-search");

function renderDepartments(filter = "") {
  deptListEl.innerHTML = "";
  departmentsData
    .filter((dept) => dept.name.toLowerCase().includes(filter.toLowerCase()))
    .forEach((dept) => {
      const card = document.createElement("div");
      card.className = `dept-item ${dept.tag}`;
      card.innerHTML = `
            <span class="dept-color"></span>
            <div class="dept-info">
              <h3>${dept.name}</h3>
              <p>Active: ${dept.employees.active} | Inactive: ${dept.employees.inactive}</p>
            </div>
          `;
      card.addEventListener("click", () => openModal(dept));
      deptListEl.appendChild(card);
    });

  updateStats();
}

function updateStats() {
  const total = departmentsData.reduce(
    (acc, dept) => acc + dept.employees.active + dept.employees.inactive,
    0
  );
  const active = departmentsData.reduce(
    (acc, dept) => acc + dept.employees.active,
    0
  );
  const count = departmentsData.length;

  document.getElementById("total-employees").textContent = total;
  document.getElementById("active-employees").textContent = active;
  document.getElementById("departments").textContent = count;
}

function openModal(dept) {
  alert(`Open modal for: ${dept.name}`);
  // Replace this with your real modal function
}

// Render on load
renderDepartments();

// Filter departments as user types
searchInput.addEventListener("input", (e) => {
  renderDepartments(e.target.value);
});
