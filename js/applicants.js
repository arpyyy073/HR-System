// Import Firebase modules
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
let applicantsTable;
let applicantsData = {};

// Firebase Database References
const applicantsRef = ref(db, 'applicants');

// Date formatting utility functions
function formatDateToMMDDYYYY(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
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

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeModals();
    initDataTable();
    setupEventListeners();
    loadApplicantsFromFirebase();
    updateDashboardStats();
});

// Load applicants from Firebase Realtime Database
function loadApplicantsFromFirebase() {
    onValue(applicantsRef, (snapshot) => {
        applicantsData = snapshot.val() || {};
        populateApplicantTable();
        updateDashboardStats();
    }, (error) => {
        console.error('Error loading applicants:', error);
        Swal.fire({
            icon: 'error',
            title: 'Database Error',
            text: 'Failed to load applicants from database'
        });
    });
}

// Update dashboard statistics
function updateDashboardStats() {
    const totalApplicants = Object.keys(applicantsData).length;
    
    // Count by status
    let statusCounts = {
        'New': 0,
        'Under Review': 0,
        'Interview Scheduled': 0,
        'Hired': 0,
        'Rejected': 0
    };
    
    // Count by source
    let sourceCounts = {
        'Website': 0,
        'Referral': 0,
        'Job Board': 0,
        'Social Media': 0,
        'Other': 0
    };
    
    Object.values(applicantsData).forEach(applicant => {
        if (applicant.status) {
            statusCounts[applicant.status] = (statusCounts[applicant.status] || 0) + 1;
        }
        if (applicant.source) {
            sourceCounts[applicant.source] = (sourceCounts[applicant.source] || 0) + 1;
        }
    });
    
    // Update total counter
    const totalCounter = document.querySelector('.stat-counter');
    if (totalCounter) {
        totalCounter.textContent = totalApplicants;
    }
    
    // Update status counts
    const statusItems = document.querySelectorAll('.status-item');
    statusItems.forEach(item => {
        const label = item.querySelector('.status-label').textContent;
        const countEl = item.querySelector('.status-count');
        
        const statusMap = {
            'Passed': statusCounts['Hired'] || 0,
            'Pending': (statusCounts['New'] || 0) + (statusCounts['Under Review'] || 0) + (statusCounts['Interview Scheduled'] || 0),
            'Rejected': statusCounts['Rejected'] || 0,
            'Callback': statusCounts['Interview Scheduled'] || 0
        };
        
        if (countEl && statusMap[label] !== undefined) {
            countEl.textContent = statusMap[label];
        }
    });
    
    // Update source counts
    const sourceItems = document.querySelectorAll('.source-item');
    sourceItems.forEach(item => {
        const label = item.querySelector('.source-label').textContent;
        const countEl = item.querySelector('.source-count');
        
        const sourceMap = {
            'Online Post': (sourceCounts['Website'] || 0) + (sourceCounts['Job Board'] || 0),
            'Walk-in': sourceCounts['Other'] || 0,
            'Referral': sourceCounts['Referral'] || 0
        };
        
        if (countEl && sourceMap[label] !== undefined) {
            countEl.textContent = sourceMap[label];
        }
    });
    
    // Update chart if it exists
    updateChart(statusCounts);
}

// Update chart with real data
function updateChart(statusCounts) {
    const chartCanvas = document.getElementById('applicantsChart');
    if (chartCanvas && window.applicantsChart) {
        const data = [
            statusCounts['Hired'] || 0,
            (statusCounts['New'] || 0) + (statusCounts['Under Review'] || 0) + (statusCounts['Interview Scheduled'] || 0),
            statusCounts['Rejected'] || 0,
            statusCounts['Interview Scheduled'] || 0
        ];
        
        window.applicantsChart.data.datasets[0].data = data;
        window.applicantsChart.update();
    }
}

// Add new applicant to Firebase
async function addApplicantToFirebase(applicantData) {
    try {
        const newApplicantRef = push(applicantsRef);
        
        const formattedData = {
            ...applicantData,
            appliedDate: formatDateToMMDDYYYY(applicantData.appliedDate),
            id: newApplicantRef.key,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await set(newApplicantRef, formattedData);
        
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Applicant added successfully',
            timer: 2000,
            showConfirmButton: false
        });
        
        closeAddApplicantModal();
        return newApplicantRef.key;
    } catch (error) {
        console.error('Error adding applicant:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Failed to add applicant'
        });
        throw error;
    }
}

// Update applicant in Firebase
async function updateApplicantInFirebase(applicantId, applicantData) {
    try {
        const applicantRef = ref(db, `applicants/${applicantId}`);
        
        const formattedData = {
            ...applicantData,
            appliedDate: formatDateToMMDDYYYY(applicantData.appliedDate),
            updatedAt: new Date().toISOString()
        };
        
        await update(applicantRef, formattedData);
        
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Applicant updated successfully',
            timer: 2000,
            showConfirmButton: false
        });
        
        closeEditApplicantModal();
    } catch (error) {
        console.error('Error updating applicant:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Failed to update applicant'
        });
        throw error;
    }
}

// Delete applicant from Firebase
async function deleteApplicantFromFirebase(applicantId) {
    try {
        const applicantRef = ref(db, `applicants/${applicantId}`);
        await remove(applicantRef);
        
        Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Applicant has been deleted successfully',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (error) {
        console.error('Error deleting applicant:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Failed to delete applicant'
        });
        throw error;
    }
}

// Populate DataTable with Firebase data
function populateApplicantTable() {
    if (applicantsTable) {
        applicantsTable.clear();
        
        Object.keys(applicantsData).forEach(applicantId => {
            const applicant = applicantsData[applicantId];
            const fullName = `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim();
            
            const safeApplicantData = {
                ...applicant,
                resumeFile: applicant.resumeFile || null
            };
            
            const applicantDataJson = JSON.stringify(safeApplicantData).replace(/"/g, '&quot;');
            
            // Format status for display
            const statusClass = applicant.status ? applicant.status.toLowerCase().replace(/\s+/g, '-') : 'new';
            const statusBadge = `<span class="status-badge status-${statusClass}">${applicant.status || 'New'}</span>`;
            
            applicantsTable.row.add([
                fullName || 'N/A',
                applicant.degree || 'N/A', // Degree/Course column
                applicant.appliedDate || 'N/A',
                applicant.source || 'N/A',
                applicant.initialInterview || 'N/A', // Initial Interview column
                applicant.finalInterview || 'N/A',   // Final Interview column
                statusBadge,
                `<div class="action-btns">
                    <button class="view-btn icon-btn" title="View" data-applicant="${applicantDataJson}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="edit-btn icon-btn" title="Edit" data-applicant="${applicantDataJson}" data-id="${applicantId}">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="delete-btn icon-btn" title="Delete" data-id="${applicantId}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>`
            ]);
        });
        
        applicantsTable.draw();
    }
}

// Modal functions
function showApplicantDetails(applicant) {
    const modal = document.getElementById("applicantModal");
    if (modal) {
        const fullName = `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim();
        document.getElementById("appName").textContent = fullName || '-';
        document.getElementById("appDob").textContent = applicant.dob || '-';
        document.getElementById("appAddress").textContent = applicant.address || '-';
        document.getElementById("appPhone").textContent = applicant.phone || '-';
        document.getElementById("appEmail").textContent = applicant.email || '-';
        document.getElementById("appPosition").textContent = applicant.position || '-';
        document.getElementById("appSource").textContent = applicant.source || '-';
        document.getElementById("appApplied").textContent = applicant.appliedDate || '-';
        document.getElementById("appStatus").textContent = applicant.status || '-';
        document.getElementById("appNotes").textContent = applicant.notes || '-';
        
        // Handle resume file
        const resumeLink = document.getElementById("appResume");
        if (resumeLink) {
            if (applicant.resumeFile) {
                resumeLink.href = applicant.resumeFile;
                resumeLink.style.display = 'inline-block';
            } else {
                resumeLink.style.display = 'none';
            }
        }
        
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
}

function closeApplicantModal() {
    const modal = document.getElementById("applicantModal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
    }
}

function openAddApplicantModal() {
    const modal = document.getElementById("addApplicantModal");
    if (modal) {
        modal.style.display = "block";
        document.body.style.overflow = "hidden";
    }
}

function closeAddApplicantModal() {
    const modal = document.getElementById("addApplicantModal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
        const form = modal.querySelector("form");
        if (form) form.reset();
        resetFilePreview('resumePreview', 'resumeFile', 'removeResumeBtn');
    }
}

function openEditApplicantModal(applicant, applicantId) {
    const modal = document.getElementById("editApplicantModal");
    if (modal) {
        document.getElementById("editFirstName").value = applicant.firstName || '';
        document.getElementById("editLastName").value = applicant.lastName || '';
        document.getElementById("editDob").value = formatDateForInput(applicant.dob) || '';
        document.getElementById("editAddress").value = applicant.address || '';
        document.getElementById("editPhone").value = applicant.phone || '';
        document.getElementById("editEmail").value = applicant.email || '';
        document.getElementById("editDegree").value = applicant.degree || '';
        document.getElementById("editSchool").value = applicant.school || '';
        document.getElementById("editGraduationYear").value = applicant.graduationYear || '';
        document.getElementById("editPosition").value = applicant.position || '';
        document.getElementById("editSource").value = applicant.source || '';
        document.getElementById("editAppliedDate").value = formatDateForInput(applicant.appliedDate) || '';
        document.getElementById("editStatus").value = applicant.status || '';
        document.getElementById("editInitialInterview").value = formatDateForInput(applicant.initialInterview) || '';
        document.getElementById("editFinalInterview").value = formatDateForInput(applicant.finalInterview) || '';
        document.getElementById("editNotes").value = applicant.notes || '';
        
        // Handle resume file in edit modal
        const resumePreview = document.getElementById("editResumePreview");
        const resumeFileInput = document.getElementById("editResumeFile");
        const removeResumeBtn = document.getElementById("editRemoveResumeBtn");
        
        if (resumePreview) {
            if (applicant.resumeFile) {
                resumePreview.textContent = "Current resume file";
                resumePreview.style.display = 'block';
                if (removeResumeBtn) removeResumeBtn.style.display = 'block';
            } else {
                resumePreview.textContent = "No resume uploaded";
            }
        }
        
        modal.setAttribute('data-applicant-id', applicantId);
        modal.style.display = "block";
        document.body.style.overflow = "hidden";
    }
}

function closeEditApplicantModal() {
    const modal = document.getElementById("editApplicantModal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
        modal.removeAttribute('data-applicant-id');
    }
}

function closeModal() {
    closeApplicantModal();
}

// Form submission handlers
function handleAddApplicantForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const resumeFile = document.getElementById('resumeFile').files[0];
    let resumeFileData = null;
    
    if (resumeFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            resumeFileData = e.target.result;
            saveApplicantData();
        };
        reader.readAsDataURL(resumeFile);
    } else {
        saveApplicantData();
    }
    
    function saveApplicantData() {
        const applicantData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            dob: formData.get('dob'),
            address: formData.get('address'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            degree: formData.get('degree'),
            school: formData.get('school'),
            graduationYear: formData.get('graduationYear'),
            position: formData.get('position'),
            source: formData.get('source'),
            appliedDate: formData.get('appliedDate'),
            status: formData.get('status'),
            initialInterview: formData.get('initialInterview'),
            finalInterview: formData.get('finalInterview'),
            notes: formData.get('notes'),
            resumeFile: resumeFileData || null
        };
        
        if (!applicantData.firstName || !applicantData.lastName || !applicantData.email || !applicantData.position) {
            Swal.fire({
                icon: 'warning',
                title: 'Validation Error',
                text: 'Please fill in all required fields (First Name, Last Name, Email, Position)'
            });
            return;
        }
        
        addApplicantToFirebase(applicantData);
    }
}

function handleEditApplicantForm(event) {
    event.preventDefault();
    const modal = document.getElementById("editApplicantModal");
    const applicantId = modal.getAttribute('data-applicant-id');
    
    if (!applicantId) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Applicant ID not found'
        });
        return;
    }
    
    const formData = new FormData(event.target);
    const resumeFile = document.getElementById('editResumeFile').files[0];
    const currentApplicant = applicantsData[applicantId];
    
    if (resumeFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            updateApplicantData(e.target.result);
        };
        reader.readAsDataURL(resumeFile);
    } else {
        updateApplicantData(currentApplicant?.resumeFile || null);
    }
    
    function updateApplicantData(resumeFileData) {
        const applicantData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            dob: formData.get('dob'),
            address: formData.get('address'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            degree: formData.get('degree'),
            school: formData.get('school'),
            graduationYear: formData.get('graduationYear'),
            position: formData.get('position'),
            source: formData.get('source'),
            appliedDate: formData.get('appliedDate'),
            status: formData.get('status'),
            initialInterview: formData.get('initialInterview'),
            finalInterview: formData.get('finalInterview'),
            notes: formData.get('notes'),
            resumeFile: resumeFileData
        };
        
        updateApplicantInFirebase(applicantId, applicantData);
    }
}

// Initialize modals
function initializeModals() {
    // Load applicant modal
    fetch('appModal.html')
        .then(response => response.text())
        .then(html => {
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = html;
            document.body.appendChild(modalContainer);
        })
        .catch(console.error);

    // Load add applicant modal
    fetch('addApp.html')
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            initFileUpload();
            const addForm = document.getElementById('addApplicantForm');
            if (addForm) {
                addForm.addEventListener('submit', handleAddApplicantForm);
            }
        })
        .catch(console.error);

    // Load edit applicant modal
    fetch('editApp.html')
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            initEditFileUpload();
            const editForm = document.getElementById('editApplicantForm');
            if (editForm) {
                editForm.addEventListener('submit', handleEditApplicantForm);
            }
        })
        .catch(console.error);
}

// Initialize DataTable
function initDataTable() {
    applicantsTable = $("#applicantTable").DataTable({
        language: {
            paginate: {
                first: "First",
                last: "Last",
                next: "Next ›",
                previous: "‹ Prev"
            },
            lengthMenu: "Show _MENU_ applicants per page",
            info: "Showing _START_ to _END_ of _TOTAL_ applicants",
            infoEmpty: "No applicants to show",
            infoFiltered: "(filtered from _MAX_ total applicants)",
            zeroRecords: "No matching applicants found",
            search: "Search Applicants:"
        },
        dom: "<'top-wrapper'<'left-entries'l><'right-search'f>>" +
             "<'table-responsive'tr>" +
             "<'bottom-wrapper'<'left-info'i><'right-paging'p>>",
        columnDefs: [
            { targets: -1, orderable: false }
        ]
    });

    setupFilters();
}

// Setup filter functionality
function setupFilters() {
    $("#filterSource").on("change", function () {
        applicantsTable.column(3).search(this.value).draw(); // Source is column 3
    });

    $("#filterStatus").on("change", function () {
        applicantsTable.column(6).search(this.value).draw(); // Status is column 6
    });
    
    $("#filterDate").on("change", function () {
        applicantsTable.column(2).search(this.value).draw(); // Applied Date is column 2
    });
}

// Setup event listeners
function setupEventListeners() {
    document.addEventListener('click', function(event) {
        if (event.target.closest('.top-btn') || event.target.closest('#addApplicantBtn')) {
            openAddApplicantModal();
        }

        if (event.target.closest('.view-btn')) {
            const button = event.target.closest('.view-btn');
            try {
                const applicantDataAttr = button.getAttribute('data-applicant');
                const unescapedData = applicantDataAttr.replace(/&quot;/g, '"');
                const applicantData = JSON.parse(unescapedData);
                showApplicantDetails(applicantData);
            } catch (error) {
                console.error('Error parsing applicant data:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load applicant data'
                });
            }
        }

        if (event.target.closest('.edit-btn')) {
            const button = event.target.closest('.edit-btn');
            const applicantId = button.getAttribute('data-id');
            try {
                const applicantDataAttr = button.getAttribute('data-applicant');
                const unescapedData = applicantDataAttr.replace(/&quot;/g, '"');
                const applicantData = JSON.parse(unescapedData);
                openEditApplicantModal(applicantData, applicantId);
            } catch (error) {
                console.error('Error parsing applicant data:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load applicant data for editing'
                });
            }
        }

        if (event.target.closest('.delete-btn')) {
            const button = event.target.closest('.delete-btn');
            const applicantId = button.getAttribute("data-id");
    
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
                    deleteApplicantFromFirebase(applicantId);
                }
            });
        }

        if (event.target.classList.contains('close-modal')) {
            if (event.target.closest('#applicantModal')) {
                closeApplicantModal();
            } else if (event.target.closest('#addApplicantModal')) {
                closeAddApplicantModal();
            } else if (event.target.closest('#editApplicantModal')) {
                closeEditApplicantModal();
            }
        }

        if (event.target.closest('.btn-cancel')) {
            if (event.target.closest('#addApplicantModal')) {
                closeAddApplicantModal();
            } else if (event.target.closest('#editApplicantModal')) {
                closeEditApplicantModal();
            }
        }
    });

    document.addEventListener('click', function(event) {
        const modals = ['applicantModal', 'addApplicantModal', 'editApplicantModal'];
        
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && event.target === modal) {
                if (modalId === 'applicantModal') closeApplicantModal();
                else if (modalId === 'addApplicantModal') closeAddApplicantModal();
                else if (modalId === 'editApplicantModal') closeEditApplicantModal();
            }
        });
    });
}

// File upload functions
function initFileUpload() {
    const fileUpload = document.getElementById('resumeFile');
    const filePreview = document.getElementById('resumePreview');
    const removeFileBtn = document.getElementById('removeResumeBtn');

    if (!fileUpload || !filePreview) return;

    fileUpload.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            if (!file.type.match('application/pdf') && !file.type.match('application/msword') && !file.type.match('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Invalid File',
                    text: 'Please select a PDF or Word document'
                });
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                Swal.fire({
                    icon: 'warning',
                    title: 'File Too Large',
                    text: 'Resume must be less than 5MB'
                });
                return;
            }

            filePreview.textContent = file.name;
            filePreview.style.display = 'block';
            if (removeFileBtn) removeFileBtn.style.display = 'block';
        }
    });

    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', function(e) {
            e.preventDefault();
            resetFilePreview('resumePreview', 'resumeFile', 'removeResumeBtn');
        });
    }
}

function initEditFileUpload() {
    const fileUpload = document.getElementById('editResumeFile');
    const filePreview = document.getElementById('editResumePreview');
    const removeFileBtn = document.getElementById('editRemoveResumeBtn');

    if (!fileUpload || !filePreview) return;

    fileUpload.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            if (!file.type.match('application/pdf') && !file.type.match('application/msword') && !file.type.match('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Invalid File',
                    text: 'Please select a PDF or Word document'
                });
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                Swal.fire({
                    icon: 'warning',
                    title: 'File Too Large',
                    text: 'Resume must be less than 5MB'
                });
                return;
            }

            filePreview.textContent = file.name;
            filePreview.style.display = 'block';
            if (removeFileBtn) removeFileBtn.style.display = 'block';
        }
    });

    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', function(e) {
            e.preventDefault();
            resetFilePreview('editResumePreview', 'editResumeFile', 'editRemoveResumeBtn');
        });
    }
}

function resetFilePreview(containerId, inputId, buttonId) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    
    if (container) {
        container.textContent = "No file selected";
        container.style.display = 'none';
    }
    if (input) input.value = '';
    if (button) button.style.display = 'none';
}

// Global window functions
window.showApplicantDetails = showApplicantDetails;
window.closeApplicantModal = closeApplicantModal;
window.closeModal = closeModal;