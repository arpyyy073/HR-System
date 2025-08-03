import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    doc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    onSnapshot,
    query
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let employeesTable;
let employeesData = {};
let isInitialLoad = true;
let loadingIndicator = null;

// Cache configuration
const CACHE_KEY = 'employeesCache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Authentication check function
function checkAuthStatus() {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
        console.error('❌ User not authenticated');
        return false;
    }
    
    return true;
}

// Storage monitoring function
function getStorageInfo() {
    try {
        let totalSize = 0;
        let itemCount = 0;
        
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length + key.length;
                itemCount++;
            }
        }
        
        const totalSizeKB = (totalSize / 1024).toFixed(1);
        const estimatedQuotaMB = 5; // Most browsers allow ~5-10MB
        const usagePercent = ((totalSize / (estimatedQuotaMB * 1024 * 1024)) * 100).toFixed(1);
        
        console.log(`📊 localStorage: ${totalSizeKB}KB used (~${usagePercent}% of estimated ${estimatedQuotaMB}MB quota), ${itemCount} items`);
        
        return { totalSize, totalSizeKB, usagePercent, itemCount };
    } catch (error) {
        console.error('❌ Error checking storage info:', error);
        return null;
    }
}

function formatDateToMMDDYYYY(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}-${day}-${year}`;
}

function formatDateForInput(dateString) {
    if (!dateString) return '';
    
    if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
        const [month, day, year] = dateString.split('-');
        return `${year}-${month}-${day}`;
    }
    
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', function() {
    initializeModals();
    initDataTable();
    setupEventListeners();
    loadEmployeesFromFirebase();
});

// Cache management functions
function getCachedData() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) {
            console.log('📄 No cached data found');
            return null;
        }
        
        const cacheData = JSON.parse(cached);
        const { data, timestamp, count, partial } = cacheData;
        
        if (Date.now() - timestamp > CACHE_DURATION) {
            console.log('⏰ Cache expired, removing old data');
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        
        const cacheAge = Math.round((Date.now() - timestamp) / 1000);
        console.log(`💾 Loading ${count || Object.keys(data).length} employees from cache (${cacheAge}s old${partial ? ', partial data' : ''})`);
        
        return data;
    } catch (error) {
        console.error('❌ Error reading cache:', error);
        localStorage.removeItem(CACHE_KEY);
        return null;
    }
}

function setCachedData(data) {
    try {
        // Only cache essential fields to reduce storage size
        const essentialData = {};
        Object.keys(data).forEach(id => {
            const employee = data[id];
            essentialData[id] = {
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                hireDate: employee.hireDate,
                empstatus: employee.empstatus,
                status: employee.status,
                refer: employee.refer,
                org: employee.org,
                department: employee.department
            };
        });
        
        const cacheData = {
            data: essentialData,
            timestamp: Date.now(),
            count: Object.keys(essentialData).length
        };
        
        const cacheString = JSON.stringify(cacheData);
        
        // Check if cache size is reasonable (< 4MB)
        if (cacheString.length > 4 * 1024 * 1024) {
            console.warn('⚠️ Cache data too large, skipping cache');
            return;
        }
        
        localStorage.setItem(CACHE_KEY, cacheString);
        console.log(`💾 Cached ${Object.keys(essentialData).length} employees (${(cacheString.length / 1024).toFixed(1)}KB)`);
        
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.warn('⚠️ localStorage quota exceeded, clearing old cache and retrying...');
            // Clear old cache and try again with minimal data
            localStorage.removeItem(CACHE_KEY);
            
            // Try to clear other potential cache items
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('Cache')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Try caching again with even more minimal data
            try {
                const minimalData = {};
                Object.keys(data).slice(0, 100).forEach(id => { // Only cache first 100 employees
                    const employee = data[id];
                    minimalData[id] = {
                        firstName: employee.firstName,
                        lastName: employee.lastName,
                        email: employee.email,
                        status: employee.status
                    };
                });
                
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    data: minimalData,
                    timestamp: Date.now(),
                    partial: true
                }));
                console.log('💾 Cached minimal data (first 100 employees)');
            } catch (retryError) {
                console.warn('❌ Unable to cache even minimal data:', retryError.message);
            }
        } else {
            console.error('❌ Error setting cache:', error);
        }
    }
}

function showLoadingIndicator() {
    if (loadingIndicator) return;
    
    const tableContainer = document.querySelector('.data-table-container');
    if (!tableContainer) return;
    
    loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'table-loading-overlay';
    loadingIndicator.innerHTML = `
        <div class="table-loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading employees...</p>
        </div>
    `;
    
    // Add loading styles if not already present
    if (!document.getElementById('table-loading-styles')) {
        const style = document.createElement('style');
        style.id = 'table-loading-styles';
        style.textContent = `
            .data-table-container {
                position: relative;
            }
            .table-loading-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 100;
                min-height: 200px;
            }
            .table-loading-spinner {
                text-align: center;
                color: #666;
            }
            .table-loading-spinner i {
                font-size: 1.5rem;
                margin-bottom: 0.5rem;
                color: #007bff;
            }
            .table-loading-spinner p {
                margin: 0;
                font-size: 0.9rem;
            }
        `;
        document.head.appendChild(style);
    }
    
    tableContainer.appendChild(loadingIndicator);
}

function hideLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.remove();
        loadingIndicator = null;
    }
}

// Alternative: Show loading directly in table rows
function showTableRowLoading() {
    if (!employeesTable) return;
    
    employeesTable.clear();
    
    // Add a loading row
    employeesTable.row.add([
        '<div style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-spinner fa-spin" style="color: #007bff;"></i> Loading employees...</div>',
        '', '', '', '', '', ''
    ]);
    
    employeesTable.draw();
}

function hideTableRowLoading() {
    if (employeesTable) {
        employeesTable.clear().draw();
    }
}

// Authentication is handled by authGuard.js in the HTML file
// No need for additional auth checks in this module

async function loadEmployeesFromFirebase() {
    // Authentication is handled by authGuard.js
    // Check storage status
    getStorageInfo();
    
    // Try to load from cache first for immediate display
    const cachedData = getCachedData();
    if (cachedData && isInitialLoad) {
        employeesData = cachedData;
        populateEmployeeTable();
        isInitialLoad = false;
    } else if (isInitialLoad) {
        showTableRowLoading();
    }
    
    // Set up real-time listener for fresh data
    const q = query(collection(db, 'employees'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        console.log('🔄 Receiving fresh data from Firebase...');
        
        const newData = {};
        querySnapshot.forEach((doc) => {
            newData[doc.id] = doc.data();
        });
        
        // Only update if data actually changed
        if (JSON.stringify(newData) !== JSON.stringify(employeesData)) {
            employeesData = newData;
            setCachedData(employeesData);
            
            // Use requestAnimationFrame for smooth UI updates
            requestAnimationFrame(() => {
                populateEmployeeTable();
                if (isInitialLoad) {
                    isInitialLoad = false;
                }
            });
        } else if (isInitialLoad) {
            isInitialLoad = false;
        }
    }, (error) => {
        console.error('Error loading employees:', error);
        hideTableRowLoading();
        Swal.fire({
            icon: 'error',
            title: 'Database Error',
            text: 'Failed to load employees from database'
        });
    });
    
    return unsubscribe;
}

async function addEmployeeToFirebase(employeeData) {
    if (!checkAuthStatus()) {
        throw new Error('User not authenticated');
    }
    
    try {
        const docRef = await addDoc(collection(db, 'employees'), {
            ...employeeData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        console.log('✅ Employee added successfully');
        return docRef.id;
    } catch (error) {
        console.error('❌ Error adding employee:', error);
        if (error.code === 'permission-denied') {
            Swal.fire({
                icon: 'error',
                title: 'Permission Denied',
                text: 'You do not have permission to add employees. Please check your authentication.'
            });
        }
        throw error;
    }
}
async function updateEmployeeInFirebase(employeeId, employeeData) {
    if (!checkAuthStatus()) {
        throw new Error('User not authenticated');
    }
    
    try {
        await updateDoc(doc(db, 'employees', employeeId), employeeData);
        console.log('✅ Employee updated successfully');
    } catch (error) {
        console.error('❌ Error updating employee:', error);
        if (error.code === 'permission-denied') {
            Swal.fire({
                icon: 'error',
                title: 'Permission Denied',
                text: 'You do not have permission to update employees. Please check your authentication.'
            });
        }
        throw error;
    }
}

async function deleteEmployeeFromFirebase(employeeId) {
    if (!checkAuthStatus()) {
        throw new Error('User not authenticated');
    }
    
    try {
        await deleteDoc(doc(db, 'employees', employeeId));
        console.log('✅ Employee deleted successfully');
    } catch (error) {
        console.error('❌ Error deleting employee:', error);
        if (error.code === 'permission-denied') {
            Swal.fire({
                icon: 'error',
                title: 'Permission Denied',
                text: 'You do not have permission to delete employees. Please check your authentication.'
            });
        }
        throw error;
    }
}

function formathireDate(dateString) {
    if (!dateString) return 'N/A';
  
    const date = new Date(dateString);
    if (isNaN(date)) return 'Invalid Date';
  
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
  
    return `${month}-${day}-${year}`;
}
  
function populateEmployeeTable() {
    if (!employeesTable) return;
    
    // Use batch processing for better performance
    const startTime = performance.now();
    console.log('🔄 Updating employee table...');
    
    // Clear existing data
    employeesTable.clear();
    
    // Prepare rows in batches to avoid blocking the UI
    const employees = Object.entries(employeesData);
    const batchSize = 50;
    let currentBatch = 0;
    
    function processBatch() {
        const start = currentBatch * batchSize;
        const end = Math.min(start + batchSize, employees.length);
        
        for (let i = start; i < end; i++) {
            const [employeeId, employee] = employees[i];
            addEmployeeRow(employeeId, employee);
        }
        
        currentBatch++;
        
        if (end < employees.length) {
            // Process next batch in next frame
            requestAnimationFrame(processBatch);
        } else {
            // All batches processed, draw the table
            employeesTable.draw();
            const endTime = performance.now();
            console.log(`✅ Table updated in ${(endTime - startTime).toFixed(2)}ms`);
        }
    }
    
    // Start processing batches
    if (employees.length > 0) {
        processBatch();
    } else {
        employeesTable.draw();
    }
}

// Optimized function to add a single employee row
function addEmployeeRow(employeeId, employee) {
    const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
    
    const empstatus = Array.isArray(employee.empstatus) ? 
        employee.empstatus.join(', ') : 
        (employee.empstatus || 'N/A');
    
    // Store employee data in a more efficient way (avoid JSON serialization)
    const employeeKey = `emp_${employeeId}`;
    window[employeeKey] = {
        ...employee,
        empstatus: empstatus
    };
    
    employeesTable.row.add([
        fullName || 'N/A',
        employee.hireDate ? formathireDate(employee.hireDate) : 'N/A',
        empstatus,
        employee.email || 'N/A',
        employee.refer || 'N/A',
        `<span class="status-badge status-${employee.status?.toLowerCase() || 'inactive'}">${employee.status || 'Inactive'}</span>`,
        `<div class="action-btns">
            <button class="view-btn icon-btn" title="View" data-employee-key="${employeeKey}">
                <i class="fas fa-eye"></i>
            </button>
            <button class="edit-btn icon-btn" title="Edit" data-employee-key="${employeeKey}" data-id="${employeeId}">
                <i class="fas fa-pen"></i>
            </button>
            <button class="delete-btn icon-btn" title="Delete" data-id="${employeeId}">
                <i class="fas fa-trash"></i>
            </button>
        </div>`
    ]);
}

function showEmployeeDetails(employee) {
    const modal = document.getElementById("employeeModal");
    if (!modal) {
        console.error("Employee modal not found");
        return;
    }

    // Helper function to safely set text content
    function setTextContent(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || '-';
        } else {
            console.error(`Element with ID ${id} not found in employee modal`);
        }
    }

    const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
    
    // Set all text contents with null checks
    setTextContent("empName", fullName);
    setTextContent("empDob", employee.dob);
    setTextContent("empAddress", employee.address);
    setTextContent("empPhone", employee.phone);
    setTextContent("empEmail", employee.email);
    setTextContent("empOrg", employee.org);
    
    // Handle department display
    const departments = Array.isArray(employee.department) ? 
        employee.department.join(', ') : 
        (employee.department || '-');
    setTextContent("empDept", departments);
    
    setTextContent("empRefer", employee.refer);
    setTextContent("empHired", employee.hireDate ? formathireDate(employee.hireDate) : '-');
    setTextContent("status", employee.status);
    
    // Handle termination date display
    const terminationDateInfo = document.getElementById('terminationDateInfo');
    if (employee.status === 'Terminated' && employee.terminationDate) {
        setTextContent("empTerminationDate", formathireDate(employee.terminationDate));
        if (terminationDateInfo) terminationDateInfo.style.display = 'block';
    } else {
        if (terminationDateInfo) terminationDateInfo.style.display = 'none';
    }
    
    setTextContent("empstatus", employee.empstatus);

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeEmployeeModal() {
    const modal = document.getElementById("employeeModal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
    }
}

function openAddEmployeeModal() {
    const modal = document.getElementById("addEmployeeModal");
    if (modal) {
        modal.style.display = "block";
        document.body.style.overflow = "hidden";
    }
}

function closeAddEmployeeModal() {
    const modal = document.getElementById("addEmployeeModal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
        const form = modal.querySelector("form");
        if (form) form.reset();
    }
}
function openEditEmployeeModal(employee, employeeId) {
    const modal = document.getElementById("editEmployeeModal");
    if (!modal) {
        console.error("Edit employee modal not found");
        return;
    }

    // Helper function to safely set values
    function setValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value || '';
        } else {
            console.error(`Element with ID ${id} not found`);
        }
    }

    // Set all form values with null checks
    setValue("editFirstName", employee.firstName);
    setValue("editLastName", employee.lastName);
    setValue("editDob", formatDateForInput(employee.dob));
    setValue("editAddress", employee.address);
    setValue("editPhone", employee.phone);
    setValue("editEmail", employee.email);
    setValue("editOrg", employee.org);
    setValue("editRefer", employee.refer);
    setValue("edithireDate", formatDateForInput(employee.hireDate));
    setValue("editStatus", employee.status);
    setValue("editTerminationDate", formatDateForInput(employee.terminationDate));
    setValue("editempstatus", employee.empstatus);

    // Show/hide termination date field based on status
    toggleTerminationDate('editStatus', 'editTerminationDateGroup');

    // Handle department checkboxes
    const departmentCheckboxes = modal.querySelectorAll('input[name="department[]"]');
    let employeeDepartments = [];
    
    if (Array.isArray(employee.department)) {
        employeeDepartments = employee.department;
    } else if (employee.department) {
        employeeDepartments = employee.department.split(',').map(dept => dept.trim());
    }
    
    departmentCheckboxes.forEach(checkbox => {
        checkbox.checked = employeeDepartments.includes(checkbox.value);
    });

    modal.setAttribute('data-employee-id', employeeId);
    modal.style.display = "block";
    document.body.style.overflow = "hidden";
}

function closeEditEmployeeModal() {
    const modal = document.getElementById("editEmployeeModal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
        modal.removeAttribute('data-employee-id');
    }
}

function closeModal() {
    closeEmployeeModal();
}

// Form submission handlers
function handleAddEmployeeForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    // Get selected departments
    const departmentCheckboxes = document.querySelectorAll('#addEmployeeModal input[name="department[]"]:checked');
    const departments = Array.from(departmentCheckboxes).map(cb => cb.value);
    
    const employeeData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        dob: formData.get('dob'),
        address: formData.get('address'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        org: formData.get('org'),
        department: departments,
        refer: formData.get('ref'),
        hireDate: formData.get('hireDate'),
        status: formData.get('status'),
        terminationDate: formData.get('terminationDate'),
        empstatus: formData.get('empstatus')
    };
    
    // Basic validation
    if (!employeeData.firstName || !employeeData.lastName || !employeeData.email) {
        Swal.fire({
            icon: 'warning',
            title: 'Validation Error',
            text: 'Please fill in all required fields (First Name, Last Name, Email)'
        });
        return;
    }
    
    if (departments.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Validation Error',
            text: 'Please select at least one department'
        });
        return;
    }
    
    addEmployeeToFirebase(employeeData);
}

async function handleEditEmployeeForm(event) {
    event.preventDefault();
    const modal = document.getElementById("editEmployeeModal");
    const employeeId = modal.getAttribute('data-employee-id');
    
    if (!employeeId) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Employee ID not found'
        });
        return;
    }
    
    const formData = new FormData(event.target);
    
    // Get selected departments
    const departmentCheckboxes = modal.querySelectorAll('input[name="department[]"]:checked');
    const departments = Array.from(departmentCheckboxes).map(cb => cb.value);
    
    const employeeData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        dob: formData.get('dob'),
        address: formData.get('address'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        org: formData.get('org'),
        department: departments,
        refer: formData.get('refer'),
        hireDate: formData.get('hireDate'),
        status: formData.get('status'),
        terminationDate: formData.get('terminationDate'),
        empstatus: formData.get('empstatus'),
        updatedAt: new Date().toISOString()
    };
    
    try {
        await updateEmployeeInFirebase(employeeId, employeeData);
        
        // Show success message and close modal
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Employee updated successfully',
            timer: 2000,
            showConfirmButton: false
        }).then(() => {
            closeEditEmployeeModal();
        });
    } catch (error) {
        console.error('Error updating employee:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to update employee'
        });
    }
}
function initializeModals() {
    fetch('empModal.html')
        .then(response => response.text())
        .then(html => {
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = html;
            document.body.appendChild(modalContainer);
        })
        .catch(console.error);

    fetch('addEmp.html')
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            // Add form submission handler
            const addForm = document.getElementById('addEmployeeForm');
            if (addForm) {
                addForm.addEventListener('submit', handleAddEmployeeForm);
            }
        })
        .catch(console.error);


    fetch('editEmp.html')
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            const editForm = document.getElementById('editEmployeeForm');
            if (editForm) {
                editForm.addEventListener('submit', handleEditEmployeeForm);
            }
        })
        .catch(console.error);
}

// Initialize DataTable
function initDataTable() {
    employeesTable = $("#employeeTable").DataTable({
        language: {
            paginate: {
                first: "First",
                last: "Last",
                next: "Next ›",
                previous: "‹ Prev"
            },
            lengthMenu: "Show _MENU_ employees per page",
            info: "Showing _START_ to _END_ of _TOTAL_ employees",
            infoEmpty: "No employees to show",
            infoFiltered: "(filtered from _MAX_ total employees)",
            zeroRecords: "No matching employees found",
            search: "Search Employees:"
        },
        dom: "<'top-wrapper'<'left-entries'l><'right-search'f>>" +
             "<'table-responsive'tr>" +
             "<'bottom-wrapper'<'left-info'i><'right-paging'p>>",
        columnDefs: [
            { targets: -1, orderable: false } // Disable sorting on Actions column
        ]
    });

    // Setup filters
    setupFilters();
}

// Setup filter functionality
function setupFilters() {
    $("#filterDepartment").on("change", function () {
        employeesTable.column(2).search(this.value).draw();
    });

    $("#filterEmpStatus").on("change", function () {
        employeesTable.column(2).search(this.value).draw();
    });

    $("#filterStatus").on("change", function () {
        employeesTable.column(5).search(this.value).draw();
    });

    $("#filterhireDate").on("change", function () {
        employeesTable.column(1).search(this.value).draw();
    });
}

// Setup event listeners
function setupEventListeners() {
    document.addEventListener('click', function(event) {
        // Handle Add Employee button
        if (event.target.closest('.top-btn')) {
            openAddEmployeeModal();
        }

        // Handle View button clicks
        if (event.target.closest('.view-btn')) {
            const button = event.target.closest('.view-btn');
            const employeeKey = button.getAttribute('data-employee-key');
            const employeeData = window[employeeKey];
            
            if (employeeData) {
                showEmployeeDetails(employeeData);
            } else {
                console.error('Employee data not found for key:', employeeKey);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load employee data'
                });
            }
        }

        // Handle Edit button clicks
        if (event.target.closest('.edit-btn')) {
            const button = event.target.closest('.edit-btn');
            const employeeId = button.getAttribute('data-id');
            const employeeKey = button.getAttribute('data-employee-key');
            const employeeData = window[employeeKey];
            
            if (employeeData) {
                openEditEmployeeModal(employeeData, employeeId);
            } else {
                console.error('Employee data not found for key:', employeeKey);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load employee data for editing'
                });
            }
        }

        // Handle Delete button clicks
        if (event.target.closest('.delete-btn')) {
            const button = event.target.closest('.delete-btn');
            const employeeId = button.getAttribute("data-id");
    
            Swal.fire({
                title: "Are you sure?",
                text: "This action cannot be undone.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#e3342f",      
                cancelButtonColor: "#6c757d",       
                confirmButtonText: "Yes, delete it!",
                cancelButtonText: "Cancel"
            }).then((result) => {
                if (result.isConfirmed) {
                    deleteEmployeeFromFirebase(employeeId);
                }
            });
        }

        // Handle modal close buttons
        if (event.target.classList.contains('close-modal')) {
            if (event.target.closest('#employeeModal')) {
                closeEmployeeModal();
            } else if (event.target.closest('#addEmployeeModal')) {
                closeAddEmployeeModal();
            } else if (event.target.closest('#editEmployeeModal')) {
                closeEditEmployeeModal();
            }
        }

        // Handle cancel buttons
        if (event.target.closest('.btn-cancel')) {
            if (event.target.closest('#addEmployeeModal')) {
                closeAddEmployeeModal();
            } else if (event.target.closest('#editEmployeeModal')) {
                closeEditEmployeeModal();
            }
        }
    });

    // Close modals when clicking outside
    document.addEventListener('click', function(event) {
        const modals = ['employeeModal', 'addEmployeeModal', 'editEmployeeModal'];
        
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && event.target === modal) {
                if (modalId === 'employeeModal') closeEmployeeModal();
                else if (modalId === 'addEmployeeModal') closeAddEmployeeModal();
                else if (modalId === 'editEmployeeModal') closeEditEmployeeModal();
            }
        });
    });

    // Handle status change for termination date visibility
    document.addEventListener('change', function(event) {
        // Add Employee form status change
        if (event.target.id === 'status') {
            toggleTerminationDate('status', 'terminationDateGroup');
        }
        
        // Edit Employee form status change
        if (event.target.id === 'editStatus') {
            toggleTerminationDate('editStatus', 'editTerminationDateGroup');
        }
    });
}

// Function to toggle termination date field visibility
function toggleTerminationDate(statusSelectId, terminationGroupId) {
    const statusSelect = document.getElementById(statusSelectId);
    const terminationGroup = document.getElementById(terminationGroupId);
    
    if (statusSelect && terminationGroup) {
        if (statusSelect.value === 'Terminated') {
            terminationGroup.style.display = 'block';
            // Set termination date to today if not already set
            const terminationInput = terminationGroup.querySelector('input[type="date"]');
            if (terminationInput && !terminationInput.value) {
                terminationInput.value = new Date().toISOString().split('T')[0];
            }
        } else {
            terminationGroup.style.display = 'none';
            // Clear termination date when not terminated
            const terminationInput = terminationGroup.querySelector('input[type="date"]');
            if (terminationInput) {
                terminationInput.value = '';
            }
        }
    }
}

// Function to update employee status options from settings
window.updateEmployeeStatusOptionsFromSettings = function(statuses) {
    // Update status filter dropdown
    updateStatusDropdown('filterStatus', 'All Status', statuses);
    
    // Update add employee form status dropdown (exclude Terminated)
    const addFormStatuses = statuses.filter(status => status !== 'Terminated');
    updateStatusDropdown('status', 'Select Status', addFormStatuses);
    
    // Update edit employee form status dropdown (include all statuses)
    updateStatusDropdown('editStatus', 'Select Status', statuses);
};

// Helper function to update a specific dropdown with provided statuses
function updateStatusDropdown(dropdownId, defaultOptionText, statuses) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    // Store current value and selection state
    const currentValue = dropdown.value;
    const isDropdownOpen = document.activeElement === dropdown;
    
    // Check if update is actually needed (avoid unnecessary rebuilds)
    const currentOptions = Array.from(dropdown.options).slice(1).map(opt => opt.value);
    const statusesChanged = JSON.stringify(currentOptions.sort()) !== JSON.stringify([...statuses].sort());
    
    if (!statusesChanged && dropdown.options.length > 0) {
        return; // No need to update if statuses haven't changed
    }
    
    // Don't update if dropdown is currently being interacted with
    if (isDropdownOpen) {
        setTimeout(() => updateStatusDropdown(dropdownId, defaultOptionText, statuses), 100);
        return;
    }
    
    // Store current value before clearing
    const valueToRestore = currentValue;
    
    // Clear ALL existing options
    dropdown.innerHTML = '';
    
    // Add default option first
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = defaultOptionText;
    dropdown.appendChild(defaultOption);
    
    // Add provided statuses
    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        dropdown.appendChild(option);
    });
    
    // Restore current value if it still exists
    if (statuses.includes(valueToRestore)) {
        dropdown.value = valueToRestore;
    } else if (valueToRestore && valueToRestore !== '') {
        // If the previous value no longer exists, keep it selected but mark as invalid
        const invalidOption = document.createElement('option');
        invalidOption.value = valueToRestore;
        invalidOption.textContent = `${valueToRestore} (Legacy)`;
        invalidOption.style.color = '#888';
        dropdown.appendChild(invalidOption);
        dropdown.value = valueToRestore;
    }
}

window.showEmployeeDetails = showEmployeeDetails;
window.closeEmployeeModal = closeEmployeeModal;
window.closeModal = closeModal;