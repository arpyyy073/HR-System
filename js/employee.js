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

let employeesTable;
let employeesData = {};

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

function loadEmployeesFromFirebase() {
    const q = query(collection(db, 'employees'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        employeesData = {};
        querySnapshot.forEach((doc) => {
            employeesData[doc.id] = doc.data();
        });
        populateEmployeeTable();
    }, (error) => {
        console.error('Error loading employees:', error);
        Swal.fire({
            icon: 'error',
            title: 'Database Error',
            text: 'Failed to load employees from database'
        });
    });
    
    return unsubscribe;
}

async function addEmployeeToFirebase(employeeData) {
    try {
        const docRef = await addDoc(collection(db, 'employees'), {
            ...employeeData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding employee:', error);
        throw error;
    }
}
async function updateEmployeeInFirebase(employeeId, employeeData) {
    try {
        await updateDoc(doc(db, 'employees', employeeId), employeeData);
    } catch (error) {
        console.error('Error updating employee:', error);
        throw error; // This allows the calling function to catch the error
    }
}
async function deleteEmployeeFromFirebase(employeeId) {
    try {
        await deleteDoc(doc(db, 'employees', employeeId));
    } catch (error) {
        console.error('Error deleting employee:', error);
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
    if (employeesTable) {
        employeesTable.clear();
        
        Object.keys(employeesData).forEach(employeeId => {
            const employee = employeesData[employeeId];
            const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
            
            const empstatus = Array.isArray(employee.empstatus) ? 
                employee.empstatus.join(', ') : 
                (employee.empstatus || 'N/A');
            
            const safeEmployeeData = {
                ...employee,
                empstatus: empstatus
            };
            
            const employeeDataJson = JSON.stringify(safeEmployeeData).replace(/"/g, '&quot;');
            
            employeesTable.row.add([
                fullName || 'N/A',
                employee.hireDate ? formathireDate(employee.hireDate) : 'N/A',
                employee.empstatus,
                employee.email || 'N/A',
                employee.refer || 'N/A',
                `<span class="status-badge status-${employee.status?.toLowerCase() || 'inactive'}">${employee.status || 'Inactive'}</span>`,
                `<div class="action-btns">
                    <button class="view-btn icon-btn" title="View" data-employee="${employeeDataJson}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="edit-btn icon-btn" title="Edit" data-employee="${employeeDataJson}" data-id="${employeeId}">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="delete-btn icon-btn" title="Delete" data-id="${employeeId}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>`
            ]);
        });
        
        employeesTable.draw();
    }
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
    setValue("editempstatus", employee.empstatus);

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
            try {
                const employeeDataAttr = button.getAttribute('data-employee');
                // Unescape the JSON data
                const unescapedData = employeeDataAttr.replace(/&quot;/g, '"');
                const employeeData = JSON.parse(unescapedData);
                showEmployeeDetails(employeeData);
            } catch (error) {
                console.error('Error parsing employee data:', error);
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
            try {
                const employeeDataAttr = button.getAttribute('data-employee');
                // Unescape the JSON data
                const unescapedData = employeeDataAttr.replace(/&quot;/g, '"');
                const employeeData = JSON.parse(unescapedData);
                openEditEmployeeModal(employeeData, employeeId);
            } catch (error) {
                console.error('Error parsing employee data:', error);
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
}

window.showEmployeeDetails = showEmployeeDetails;
window.closeEmployeeModal = closeEmployeeModal;
window.closeModal = closeModal;