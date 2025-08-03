import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    onSnapshot, 
    query,
    where,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function parseHireDate(hireDateStr) {
  const [month, day, year] = hireDateStr.split("-");
  return new Date(`${year}-${month}-${day}`);
}

function getDaysSince(date) {
  const now = new Date();
  const diffInMs = now - date;
  return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
}

async function fetchDeployNotifications() {
  const internsRef = collection(db, "employees");
  const q = query(internsRef, where("department", "==", "Internship"));

  const snapshot = await getDocs(q);

  let deployReadyCount = 0;
  let deployReadyInterns = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.hireDate || !data.firstName || !data.lastName) return;

    const hireDate = parseHireDate(data.hireDate);
    const daysPassed = getDaysSince(hireDate);

    if (daysPassed >= 15) {
      deployReadyCount++;
      deployReadyInterns.push({
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        daysPassed,
        org: data.org,
        id: doc.id
      });
    }
  });

  document.querySelector(".notification-count").textContent = deployReadyCount;
  document.querySelector(".notification").addEventListener("click", () => {
    if (deployReadyCount === 0) {
      Swal.fire("No Deployment Alerts", "No interns are ready for deployment today.", "info");
      return;
    }

    const internHtml = deployReadyInterns
      .map(i => `<p><strong>${i.name}</strong> (${i.email})<br><small>${i.daysPassed} days since hire • ${i.org}</small></p>`)
      .join("<hr>");

    Swal.fire({
      title: "Interns Ready for Deployment",
      html: internHtml,
      icon: "info",
      width: 600,
      confirmButtonText: "OK"
    });
  });
}

fetchDeployNotifications();

async function fetchOnboardingNotifications() {
  const employeesRef = collection(db, "employees");
  const q = query(employeesRef, where("department", "!=", "")); // Get all employees with a department

  const snapshot = await getDocs(q);

  let onboardingSoon = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.hireDate || !data.firstName || !data.lastName) return;

    const hireDate = parseHireDate(data.hireDate);
    const now = new Date();
    const diffDays = Math.ceil((hireDate - now) / (1000 * 60 * 60 * 24));

    if (diffDays > 0 && diffDays <= 2) {
      onboardingSoon.push({
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        daysUntil: diffDays,
        org: data.org,
        id: doc.id
      });
    }
  });

  if (onboardingSoon.length > 0) {
    document.querySelector(".onboarding-notification-count").textContent = onboardingSoon.length;
    document.querySelector(".onboarding-notification").addEventListener("click", () => {
      const html = onboardingSoon
        .map(i => `<p><strong>${i.name}</strong> (${i.email})<br><small>Onboarding in ${i.daysUntil} day(s) • ${i.org}</small></p>`)
        .join("<hr>");
      Swal.fire({
        title: "Upcoming Onboardings",
        html,
        icon: "info",
        width: 600,
        confirmButtonText: "OK"
      });
    });
  }
}

fetchOnboardingNotifications();

document.addEventListener("DOMContentLoaded", () => {
    // Cache configuration
    const cacheKey = 'employeeCountsCache';
    const CACHE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
    // Employee data cache
    let allEmployeesCache = [];
    let lastFetchTime = 0;
    
    // Counters
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
    
    // Mapping configurations
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

    // Utility Functions
    function normalizeString(str) {
        return str ? str.toString().toLowerCase().trim() : '';
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

    function loadCachedData() {
        const cachedData = localStorage.getItem(cacheKey);
        if (!cachedData) return false;
        
        try {
            const { data, timestamp } = JSON.parse(cachedData);
            if (Date.now() - timestamp > CACHE_REFRESH_INTERVAL) {
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

    // Data Fetching Functions
    async function fetchFreshData() {
        try {
            console.log('Fetching fresh employee data from Firestore...');
            const now = Date.now();
            
            if (allEmployeesCache.length === 0 || now - lastFetchTime > CACHE_REFRESH_INTERVAL) {
                const querySnapshot = await getDocs(collection(db, 'employees'));
                allEmployeesCache = [];
                resetAllCounters();
                
                querySnapshot.forEach((doc) => {
                    const employee = { id: doc.id, ...doc.data() };
                    allEmployeesCache.push(employee);
                    
                    totalEmployees++;
                    
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
                
                lastFetchTime = now;
                updateAllCounters();
                updateCache();
            }
        } catch (error) {
            console.error("Error fetching fresh data from Firestore:", error);
            showToast("Couldn't refresh employee data. Using cached information.", 'warning');
        }
    }

    async function fetchEmployeesByFilter(filterType, filterValue) {
        try {
            console.log(`Filtering employees by ${filterType}: ${filterValue}`);
            const targetValue = normalizeString(filterValue);
            
            // First try to use cached data
            if (allEmployeesCache.length > 0) {
                return allEmployeesCache
                    .filter(employee => {
                        const value = normalizeString(employee[filterType]);
                        return value === targetValue;
                    })
                    .map(employee => ({
                        name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'N/A',
                        email: employee.email || 'N/A',
                        department: employee.department || 'N/A',
                        organization: employee.org || 'N/A'
                    }));
            }
            
            // Fallback to Firestore query if cache is empty
            console.log(`Fetching fresh data for filter: ${filterType}: ${filterValue}`);
            const q = query(
                collection(db, 'employees'),
                where(filterType, '==', filterValue)
            );
            
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => {
                const employee = doc.data();
                return {
                    name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'N/A',
                    email: employee.email || 'N/A',
                    department: employee.department || 'N/A',
                    organization: employee.org || 'N/A'
                };
            });
        } catch (error) {
            console.error("Error fetching filtered employee data:", error);
            return [];
        }
    }

    // Modal Functions
    async function showModal(dataKey, title, source = "department") {
        const modal = document.getElementById("departmentModal");
        const modalTitle = document.getElementById("modalTitle");
        const tableBody = document.getElementById("modalTableBody");
        const modalHeader = modal.querySelector('.modal-header');
    
        // Set modal title
        modalTitle.textContent = `${title} ${source === "department" ? "Department" : "Organization"}`;
        
        // Set header color based on department/organization
        if (source === "department") {
            const deptColorMap = {
                "internship": "internship",
                "tgqs": "tgqs", 
                "administration & managers": "admin-managers",
                "admin & managers": "admin-managers",
                "administration and managers": "admin-managers",
                "it & technical": "it-technical",
                "it and technical": "it-technical",
                "information technology": "it-technical",
                "oppy transport": "oppy",
                "transport": "oppy",
                "marketing": "marketing",
                "unicornhair ai": "unicorn",
                "unicorn ai": "unicorn",
                "unicorn": "unicorn",
                "carrier connection": "carrier",
                "carrier": "carrier"
            };
            
            const normalizedKey = normalizeString(dataKey);
            const colorKey = deptColorMap[normalizedKey] || normalizedKey.split(' ')[0].toLowerCase();
            modalHeader.setAttribute('data-dept', colorKey);
            modalHeader.removeAttribute('data-org');
        } else {
            modalHeader.setAttribute('data-org', normalizeString(dataKey));
            modalHeader.removeAttribute('data-dept');
        }
        
 
        const cachedFilter = source === "department" ? 'department' : 'org';
        const cachedResults = allEmployeesCache
            .filter(employee => 
                normalizeString(employee[cachedFilter]) === normalizeString(dataKey)
            )
            .map(employee => ({
                name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'N/A',
                email: employee.email || 'N/A'
            }));
    
        if (cachedResults.length > 0) {
            renderEmployeeList(tableBody, cachedResults);
        } else {
            tableBody.innerHTML = "<tr><td colspan='3'><i class='fas fa-spinner fa-spin'></i> Loading...</td></tr>";
        }
    
        modal.classList.remove("hidden");
    
       
        try {
            const employees = await fetchEmployeesByFilter(cachedFilter, dataKey);
            
           
            if (employees.length !== cachedResults.length || 
                JSON.stringify(employees) !== JSON.stringify(cachedResults)) {
                renderEmployeeList(tableBody, employees);
            }
        } catch (error) {
            console.error("Error loading modal data:", error);
            if (cachedResults.length === 0) {
                tableBody.innerHTML = "<tr><td colspan='3'>Error loading data</td></tr>";
            }
        }
    }
    function renderEmployeeList(tableBody, employees) {
        tableBody.innerHTML = "";
        
        if (employees.length > 0) {
            employees.forEach((employee) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${employee.name}</td>
                    <td>${employee.email}</td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = "<tr><td colspan='3'>No employees found</td></tr>";
        }
    }

    // UI Functions
    function setupEventListeners() {
        // Department cards
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

        // Organization cards
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

        // Modal close button
        const closeModalBtn = document.querySelector(".close-btn");
        if (closeModalBtn) {
            closeModalBtn.addEventListener("click", () => {
                document.getElementById("departmentModal").classList.add("hidden");
            });
        }

        // Modal backdrop click
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
        const q = query(collection(db, 'employees'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            console.log('🔄 Real-time update detected, refreshing counts...');
            fetchFreshData();
        }, (error) => {
            console.error('Real-time listener error:', error);
        });
        
        return unsubscribe;
    }

    function showToast(message, type = 'info') {
        // Simple toast notification implementation
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Initialize the dashboard
    function initDashboard() {
        const hasCache = loadCachedData();
        fetchFreshData();
        setupRealtimeListener();
        setupEventListeners();
        window.refreshDashboard = fetchFreshData;
    }

    initDashboard();
});