import { db } from './firebase-config.js';
import { 
    ref, 
    push, 
    set, 
    get, 
    update, 
    remove, 
    onValue, 
    off 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Global variables
let employeesTable;
let employeesData = {};

// Firebase Database References
const employeesRef = ref(db, 'employees');

// Date formatting utility functions
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
    
    // If it's already in MM-DD-YYYY format, convert to YYYY-MM-DD for input
    if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
        const [month, day, year] = dateString.split('-');
        return `${year}-${month}-${day}`;
    }
    
    // If it's in YYYY-MM-DD format, return as-is
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
    }
    
    // Try to parse and format
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeModals();
    initDataTable();
    setupEventListeners();
    loadEmployeesFromFirebase();
});

// Load employees from Firebase Realtime Database
function loadEmployeesFromFirebase() {
    onValue(employeesRef, (snapshot) => {
        employeesData = snapshot.val() || {};
        populateEmployeeTable();
    }, (error) => {
        console.error('Error loading employees:', error);
        Swal.fire({
            icon: 'error',
            title: 'Database Error',
            text: 'Failed to load employees from database'
        });
    });
}

// Add new employee to Firebase
async function addEmployeeToFirebase(employeeData) {
    try {
        const newEmployeeRef = push(employeesRef);
        
        // Format dates before saving
        const formattedData = {
            ...employeeData,
            dob: formatDateToMMDDYYYY(employeeData.dob),
            hireDate: formatDateToMMDDYYYY(employeeData.hireDate),
            id: newEmployeeRef.key,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await set(newEmployeeRef, formattedData);
        
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Employee added successfully',
            timer: 2000,
            showConfirmButton: false
        });
        
        closeAddEmployeeModal();
        return newEmployeeRef.key;
    } catch (error) {
        console.error('Error adding employee:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Failed to add employee'
        });
        throw error;
    }
}

// Update employee in Firebase
async function updateEmployeeInFirebase(employeeId, employeeData) {
    try {
        const employeeRef = ref(db, `employees/${employeeId}`);
        
        // Format dates before updating
        const formattedData = {
            ...employeeData,
            dob: formatDateToMMDDYYYY(employeeData.dob),
            hireDate: formatDateToMMDDYYYY(employeeData.hireDate),
            updatedAt: new Date().toISOString()
        };
        
        await update(employeeRef, formattedData);
        
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Employee updated successfully',
            timer: 2000,
            showConfirmButton: false
        });
        
        closeEditEmployeeModal();
    } catch (error) {
        console.error('Error updating employee:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Failed to update employee'
        });
        throw error;
    }
}

// Delete employee from Firebase
async function deleteEmployeeFromFirebase(employeeId) {
    try {
        const employeeRef = ref(db, `employees/${employeeId}`);
        await remove(employeeRef);
        
        Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Employee has been deleted successfully',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (error) {
        console.error('Error deleting employee:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Failed to delete employee'
        });
        throw error;
    }
}

// Populate DataTable with Firebase data
function populateEmployeeTable() {
    if (employeesTable) {
        employeesTable.clear();
        
        Object.keys(employeesData).forEach(employeeId => {
            const employee = employeesData[employeeId];
            const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
            
            // Create a safe JSON string for data attributes (remove problematic characters)
            const safeEmployeeData = {
                ...employee,
                profileImage: employee.profileImage || null // Ensure profileImage is included
            };
            
            // Escape JSON for HTML attribute
            const employeeDataJson = JSON.stringify(safeEmployeeData).replace(/"/g, '&quot;');
            
            employeesTable.row.add([
                fullName || 'N/A',
                employee.hireDate || 'N/A', // Already formatted as MM-DD-YYYY
                employee.empstatus || 'N/A', // Changed from org to empstatus
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

// Modal functions
function showEmployeeDetails(employee) {
    const modal = document.getElementById("employeeModal");
    if (modal) {
        const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
        document.getElementById("empName").textContent = fullName || '-';
        document.getElementById("empDob").textContent = employee.dob || '-';
        document.getElementById("empAddress").textContent = employee.address || '-';
        document.getElementById("empPhone").textContent = employee.phone || '-';
        document.getElementById("empEmail").textContent = employee.email || '-';
        document.getElementById("empOrg").textContent = employee.org || '-';
        document.getElementById("empDept").textContent = employee.department || '-';
        document.getElementById("empRefer").textContent = employee.refer || '-';
        document.getElementById("empHire").textContent = employee.hireDate || '-';
        document.getElementById("status").textContent = employee.status || '-';
        document.getElementById("empstatus").textContent = employee.empstatus || '-';
        
        // Handle employee photo
        const empPhoto = document.getElementById("empPhoto");
        if (empPhoto) {
            if (employee.profileImage && employee.profileImage.trim() !== '') {
                empPhoto.src = employee.profileImage;
                empPhoto.style.display = 'block';
            } else {
                // Use default image if no profile image
                empPhoto.src = '/images/assets/default-employee.jpg';
                empPhoto.style.display = 'block';
            }
            
            // Handle image load errors
            empPhoto.onerror = function() {
                this.src = 'https://via.placeholder.com/150x150/cccccc/666666?text=No+Image';
            };
        }
        
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
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
        resetImagePreview('imagePreview', 'previewImage', 'removeImageBtn');
    }
}

function openEditEmployeeModal(employee, employeeId) {
    const modal = document.getElementById("editEmployeeModal");
    if (modal) {
        // Fill form with employee data - convert dates back to input format (YYYY-MM-DD)
        document.getElementById("editFirstName").value = employee.firstName || '';
        document.getElementById("editLastName").value = employee.lastName || '';
        document.getElementById("editDob").value = formatDateForInput(employee.dob) || '';
        document.getElementById("editAddress").value = employee.address || '';
        document.getElementById("editPhone").value = employee.phone || '';
        document.getElementById("editEmail").value = employee.email || '';
        document.getElementById("editOrg").value = employee.org || '';
        document.getElementById("editDepartment").value = employee.department || '';
        document.getElementById("editRefer").value = employee.refer || '';
        document.getElementById("editHireDate").value = formatDateForInput(employee.hireDate) || '';
        document.getElementById("editStatus").value = employee.status || '';
        document.getElementById("editempstatus").value = employee.empstatus || '';
        
        // Handle profile image in edit modal
        const editPreviewImage = document.getElementById("editPreviewImage");
        const editDefaultText = document.querySelector('#editImagePreview .default-text');
        const editRemoveBtn = document.getElementById("editRemoveImageBtn");
        
        if (editPreviewImage) {
            if (employee.profileImage && employee.profileImage.trim() !== '') {
                editPreviewImage.src = employee.profileImage;
                editPreviewImage.style.display = 'block';
                if (editDefaultText) editDefaultText.style.display = 'none';
                if (editRemoveBtn) editRemoveBtn.style.display = 'block';
            } else {
                editPreviewImage.src = '/images/assets/default-employee.jpg';
                editPreviewImage.style.display = 'block';
                if (editDefaultText) editDefaultText.textContent = 'Current photo';
            }
            
            // Handle image load errors
            editPreviewImage.onerror = function() {
                this.src = 'https://via.placeholder.com/150x150/cccccc/666666?text=No+Image';
                if (editDefaultText) {
                    editDefaultText.style.display = 'block';
                    editDefaultText.textContent = 'No image available';
                }
            };
        }
        
        // Store employee ID for updates
        modal.setAttribute('data-employee-id', employeeId);
        
        modal.style.display = "block";
        document.body.style.overflow = "hidden";
    }
}

function closeEditEmployeeModal() {
    const modal = document.getElementById("editEmployeeModal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
        modal.removeAttribute('data-employee-id');
        resetImagePreview('editImagePreview', 'editPreviewImage', 'editRemoveImageBtn');
    }
}

function closeModal() {
    closeEmployeeModal();
}

// Form submission handlers
function handleAddEmployeeForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    // Get profile image
    const profileImageFile = document.getElementById('profileImage').files[0];
    let profileImageData = null;
    
    if (profileImageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            profileImageData = e.target.result;
            saveEmployeeData();
        };
        reader.readAsDataURL(profileImageFile);
    } else {
        saveEmployeeData();
    }
    
    function saveEmployeeData() {
        const employeeData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            dob: formData.get('dob'), // Will be formatted in addEmployeeToFirebase
            address: formData.get('address'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            org: formData.get('org'),
            department: formData.get('department'),
            refer: formData.get('ref'),
            hireDate: formData.get('hireDate'), // Will be formatted in addEmployeeToFirebase
            status: formData.get('status'),
            empstatus: formData.get('empstatus'),
            profileImage: profileImageData || null
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
        
        addEmployeeToFirebase(employeeData);
    }
}

function handleEditEmployeeForm(event) {
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
    const currentEmployee = employeesData[employeeId];
    
    // Get profile image
    const profileImageFile = document.getElementById('editProfileImage').files[0];
    
    if (profileImageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const employeeData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                dob: formData.get('dob'),
                address: formData.get('address'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                org: formData.get('org'),
                department: formData.get('department'),
                refer: formData.get('refer'),
                hireDate: formData.get('hireDate'),
                status: formData.get('status'),
                empstatus: formData.get('empstatus'),
                profileImage: e.target.result
            };
            
            updateEmployeeInFirebase(employeeId, employeeData);
        };
        reader.readAsDataURL(profileImageFile);
    } else {
        // If no new image was selected, keep the existing one
        const employeeData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            dob: formData.get('dob'),
            address: formData.get('address'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            org: formData.get('org'),
            department: formData.get('department'),
            refer: formData.get('refer'),
            hireDate: formData.get('hireDate'),
            status: formData.get('status'),
            empstatus: formData.get('empstatus'),
            profileImage: currentEmployee?.profileImage || null
        };
        
        updateEmployeeInFirebase(employeeId, employeeData);
    }
}

// Initialize modals
function initializeModals() {
    // Load employee modal
    fetch('empModal.html')
        .then(response => response.text())
        .then(html => {
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = html;
            document.body.appendChild(modalContainer);
        })
        .catch(console.error);

    // Load add employee modal
    fetch('addEmp.html')
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            initImageUpload();
            // Add form submission handler
            const addForm = document.getElementById('addEmployeeForm');
            if (addForm) {
                addForm.addEventListener('submit', handleAddEmployeeForm);
            }
        })
        .catch(console.error);

    // Load edit employee modal
    fetch('editEmp.html')
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            initEditImageUpload();
            // Add form submission handler
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

    // Changed from filterOrg to filterEmpStatus
    $("#filterEmpStatus").on("change", function () {
        employeesTable.column(2).search(this.value).draw();
    });

    $("#filterStatus").on("change", function () {
        employeesTable.column(5).search(this.value).draw();
    });

    $("#filterHireDate").on("change", function () {
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

// Image upload functions
function initImageUpload() {
    const imageUpload = document.getElementById('profileImage');
    const previewImage = document.getElementById('previewImage');
    const defaultText = document.querySelector('#imagePreview .default-text');
    const removeImageBtn = document.getElementById('removeImageBtn');

    if (!imageUpload || !previewImage) return;

    imageUpload.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            if (!file.type.match('image.*')) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Invalid File',
                    text: 'Please select an image file'
                });
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                Swal.fire({
                    icon: 'warning',
                    title: 'File Too Large',
                    text: 'Image must be less than 2MB'
                });
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                previewImage.style.display = 'block';
                if (defaultText) defaultText.style.display = 'none';
                if (removeImageBtn) removeImageBtn.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', function(e) {
            e.preventDefault();
            resetImagePreview('imagePreview', 'previewImage', 'removeImageBtn');
            imageUpload.value = '';
        });
    }
}

function initEditImageUpload() {
    const imageUpload = document.getElementById('editProfileImage');
    const previewImage = document.getElementById('editPreviewImage');
    const defaultText = document.querySelector('#editImagePreview .default-text');
    const removeImageBtn = document.getElementById('editRemoveImageBtn');

    if (!imageUpload || !previewImage) return;

    imageUpload.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            if (!file.type.match('image.*')) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Invalid File',
                    text: 'Please select an image file'
                });
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                Swal.fire({
                    icon: 'warning',
                    title: 'File Too Large',
                    text: 'Image must be less than 2MB'
                });
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                previewImage.style.display = 'block';
                if (defaultText) defaultText.style.display = 'none';
                if (removeImageBtn) removeImageBtn.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', function(e) {
            e.preventDefault();
            resetImagePreview('editImagePreview', 'editPreviewImage', 'editRemoveImageBtn');
            imageUpload.value = '';
        });
    }
}

function resetImagePreview(containerId, imageId, buttonId) {
    const container = document.getElementById(containerId);
    const image = document.getElementById(imageId);
    const button = document.getElementById(buttonId);
    const defaultText = container?.querySelector('.default-text');
    
    if (image) {
        image.src = '';
        image.style.display = 'none';
    }
    if (defaultText) defaultText.style.display = 'block';
    if (button) button.style.display = 'none';
}

window.showEmployeeDetails = showEmployeeDetails;
window.closeEmployeeModal = closeEmployeeModal;
window.closeModal = closeModal;