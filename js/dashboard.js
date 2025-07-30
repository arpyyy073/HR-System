import { db } from '/js/firebase-config.js';
import { ref, get, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
  const cacheKey = 'employeeCountsCache';
  const cacheExpiry = 15 * 60 * 1000; // 15 minutes cache validity

  const deptCounters = {
    "count-internship": 0,
    "count-tgqs": 0,
    "count-admin-managers": 0,
    "count-it-technical": 0,
    "count-oppy": 0,
    "count-marketing": 0,
    "count-unicorn": 0,
    "count-carrier": 0
  };

  const orgCounters = {
    "rahyo-count": 0,
    "hhi-count": 0
  };

  let totalEmployees = 0;
  
  const departmentMapping = {
    "internship": "count-internship",
    "tgqs": "count-tgqs", 
    "administration & managers": "count-admin-managers",
    "admin & managers": "count-admin-managers",
    "administration and managers": "count-admin-managers",
    "it & technical": "count-it-technical",
    "it and technical": "count-it-technical",
    "information technology": "count-it-technical",
    "oppy transport": "count-oppy",
    "transport": "count-oppy",
    "marketing": "count-marketing",
    "unicornhair ai": "count-unicorn",
    "unicorn ai": "count-unicorn",
    "unicorn": "count-unicorn",
    "carrier connection": "count-carrier",
    "carrier": "count-carrier"
  };

  const organizationMapping = {
    "rahyo": "rahyo-count",
    "hhi": "hhi-count"
  };

  function loadCachedData() {
    const cachedData = localStorage.getItem(cacheKey);
    if (!cachedData) return false;
    
    try {
      const { data, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp > cacheExpiry) {
        localStorage.removeItem(cacheKey);
        return false;
      }
      
      Object.keys(deptCounters).forEach(key => {
        deptCounters[key] = data.deptCounters[key] || 0;
      });
      
      Object.keys(orgCounters).forEach(key => {
        orgCounters[key] = data.orgCounters[key] || 0;
      });
      
      totalEmployees = data.totalEmployees || 0;
      updateAllCounters();
      return true;
      
    } catch (e) {
      console.error("Error parsing cached data", e);
      localStorage.removeItem(cacheKey);
      return false;
    }
  }

  async function fetchFreshData() {
    try {
      console.log('Fetching fresh employee data...');
      const employeesRef = ref(db, 'employees');
      const snapshot = await get(employeesRef);
      
      if (snapshot.exists()) {
        const employees = snapshot.val();
        resetAllCounters();
        
        Object.values(employees).forEach(employee => {
          if (!employee) return;
          
          // Count all employees regardless of status for total count
          totalEmployees++;
          
          // Only count active employees for department and organization counts
          if (!employee.status || normalizeString(employee.status) === 'active') {
            if (employee.department) {
              const dept = normalizeString(employee.department);
              const counterId = departmentMapping[dept];
              if (counterId && deptCounters.hasOwnProperty(counterId)) {
                deptCounters[counterId]++;
              }
            }
            
            if (employee.org) {
              const org = normalizeString(employee.org);
              const counterId = organizationMapping[org];
              if (counterId && orgCounters.hasOwnProperty(counterId)) {
                orgCounters[counterId]++;
              }
            }
          }
        });
        
        updateAllCounters();
        updateCache();
        
      } else {
        console.log("No employee data found");
        resetAllCounters();
      }
    } catch (error) {
      console.error("Error fetching fresh data:", error);
    }
  }

  function updateCache() {
    const cacheData = {
      deptCounters,
      orgCounters,
      totalEmployees
    };
    localStorage.setItem(cacheKey, JSON.stringify({
      data: cacheData,
      timestamp: Date.now()
    }));
  }

  function updateCounter(elementId, count) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = count;
    }
  }

  function updateAllCounters() {
    Object.entries(deptCounters).forEach(([id, count]) => {
      updateCounter(id, count);
    });
    
    Object.entries(orgCounters).forEach(([id, count]) => {
      updateCounter(id, count);
    });
    
    updateCounter('total-employees', totalEmployees);
  }

  function resetAllCounters() {
    Object.keys(deptCounters).forEach(key => {
      deptCounters[key] = 0;
    });
    
    Object.keys(orgCounters).forEach(key => {
      orgCounters[key] = 0;
    });
    
    totalEmployees = 0;
  }

  function normalizeString(str) {
    return str ? str.toString().toLowerCase().trim() : '';
  }

  async function fetchEmployeesByFilter(filterType, filterValue) {
    try {
      console.log(`Fetching employees by ${filterType}: ${filterValue}`);
      const employeesRef = ref(db, 'employees');
      const snapshot = await get(employeesRef);
      
      if (snapshot.exists()) {
        const employees = snapshot.val();
        const filteredEmployees = [];
        
        Object.entries(employees).forEach(([employeeId, employee]) => {
          if (!employee) return;
          
          if (employee[filterType]) {
            const value = normalizeString(employee[filterType]);
            const targetValue = normalizeString(filterValue);
            
            if (value === targetValue) {
              filteredEmployees.push({
                name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'N/A',
                position: employee.position || employee.jobTitle || 'N/A',
                email: employee.email || 'N/A',
                department: employee.department || 'N/A',
                organization: employee.org || 'N/A'
              });
            }
          }
        });
        
        console.log(`Found ${filteredEmployees.length} employees for ${filterType}: ${filterValue}`);
        return filteredEmployees;
      }
      return [];
    } catch (error) {
      console.error("Error fetching filtered employee data:", error);
      return [];
    }
  }

  async function showModal(dataKey, title, source = "department") {
    const modal = document.getElementById("departmentModal");
    const modalTitle = document.getElementById("modalTitle");
    const tableBody = document.getElementById("modalTableBody");

    modalTitle.textContent = `${title} ${source === "department" ? "Department" : "Organization"}`;
    tableBody.innerHTML = "<tr><td colspan='3'><i class='fas fa-spinner fa-spin'></i> Loading...</td></tr>";

    modal.classList.remove("hidden");

    try {
      let employees = [];
      if (source === "department") {
        employees = await fetchEmployeesByFilter('department', dataKey);
      } else {
        employees = await fetchEmployeesByFilter('org', dataKey);
      }

      tableBody.innerHTML = "";

      if (employees.length > 0) {
        employees.forEach((employee) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${employee.name}</td>
            <td>${employee.position}</td>
            <td>${employee.email}</td>
          `;
          tableBody.appendChild(row);
        });
      } else {
        tableBody.innerHTML = "<tr><td colspan='3'>No employees found</td></tr>";
      }
    } catch (error) {
      console.error("Error loading modal data:", error);
      tableBody.innerHTML = "<tr><td colspan='3'>Error loading data</td></tr>";
    }
  }

  function setupEventListeners() {
    document.querySelectorAll(".dept-card").forEach((card) => {
      card.addEventListener("click", () => {
        const spanElement = card.querySelector("span[id*='count-']");
        if (!spanElement) return;
        
        const spanId = spanElement.id;
        const deptKey = spanId.replace("count-", "");
        const deptLabel = card.querySelector(".label").textContent.trim();
        
        const deptMapping = {
          "internship": "Internship",
          "tgqs": "TGQS", 
          "admin-managers": "Administration & Managers",
          "it-technical": "IT & Technical",
          "oppy": "Oppy Transport",
          "marketing": "Marketing",
          "unicorn": "UnicornHair AI",
          "carrier": "Carrier Connection"
        };
        
        const dbDeptKey = deptMapping[deptKey] || deptKey;
        showModal(dbDeptKey, deptLabel, "department");
      });
    });

    document.querySelectorAll(".stat-card-org").forEach((card) => {
      card.addEventListener("click", () => {
        const counterElement = card.querySelector(".stat-counter");
        if (!counterElement) return;
        
        const spanId = counterElement.id;
        const orgKey = spanId.replace("-count", "");
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

    const modal = document.getElementById("departmentModal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target.id === "departmentModal") {
          document.getElementById("departmentModal").classList.add("hidden");
        }
      });
    }
  }

  function setupRealtimeListener() {
    const employeesRef = ref(db, 'employees');
    onValue(employeesRef, (snapshot) => {
      console.log('🔄 Real-time update detected, refreshing counts...');
      fetchFreshData();
    }, (error) => {
      console.error('Real-time listener error:', error);
    });
  }

  function initDashboard() {
    const hasCache = loadCachedData();
    fetchFreshData();
    setupRealtimeListener();
    setupEventListeners();
    window.refreshDashboard = fetchFreshData;
  }

  initDashboard();
});