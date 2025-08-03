import { db } from "/js/firebase-config.js";
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Global variables
let applicantsTable;
let applicantsChart = null;
let applicantsData = {};

// Date formatting functions
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeDataTable();
  initializeChart();
  loadApplicants();
  setupEventListeners();
});

function initializeDataTable() {
  if ($.fn.DataTable.isDataTable('#applicantTable')) {
    applicantsTable = $('#applicantTable').DataTable();
    applicantsTable.clear().draw();
    return;
  }

  applicantsTable = $('#applicantTable').DataTable({
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
    paging: true,
    pageLength: 10,
    lengthMenu: [5, 10, 25, 50, 100],
    columns: [
      { data: 'name' },
      { data: 'degree' },
      { data: 'source' },
      { data: 'initialInterview' },
      { data: 'finalInterview' },
      { 
        data: 'status',
        render: function(data, type, row) {
          const statusClass = data.toLowerCase().replace(/\s+/g, '-');
          return `<span class="status-badge status-${statusClass}">${data}</span>`;
        }
      },
      { 
        data: null,
        render: function(data, type, row) {
          return `
            <div class="action-btns">
              <button class="view-btn icon-btn" title="View" data-id="${row.id}">
                <i class="fas fa-eye"></i>
              </button>
              <button class="edit-btn icon-btn" title="Edit" data-id="${row.id}">
                <i class="fas fa-pen"></i>
              </button>
              <button class="delete-btn icon-btn" title="Delete" data-id="${row.id}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          `;
        },
        orderable: false
      }
    ]
  });
}

function initializeChart() {
  const ctx = document.getElementById('applicantsChart');
  if (!ctx) return;
  
  // Destroy existing chart if it exists
  if (applicantsChart) {
    applicantsChart.destroy();
  }
  
  // Create new chart instance
  applicantsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Passed', 'In-progress', 'Rejected', 'Callback'],
      datasets: [{
        label: 'Applicants',
        data: [0, 0, 0, 0],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)'
        ],
        borderWidth: 1,
        borderRadius: 8,
        barThickness: 40,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` ${context.parsed.y} applicants`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            precision: 0
          },
          grid: {
            display: true,
            color: "rgba(0, 0, 0, 0.1)"
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function loadApplicants() {
  const q = query(collection(db, 'applicants'), orderBy('createdAt', 'desc'));
  
  onSnapshot(q, (snapshot) => {
    applicantsData = {};
    const applicants = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      applicantsData[doc.id] = data;
      applicants.push({
        id: doc.id,
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        degree: data.degree || 'N/A',
        appliedDate: formatDateToMMDDYYYY(data.appliedDate) || 'N/A',
        source: data.source || 'N/A',
        initialInterview: formatDateToMMDDYYYY(data.initialInterview) || 'N/A',
        finalInterview: formatDateToMMDDYYYY(data.finalInterview) || 'N/A',
        status: data.status || 'New'
      });
    });

    if (applicantsTable) {
      applicantsTable.clear();
      applicantsTable.rows.add(applicants);
      applicantsTable.draw();
    }

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

function updateDashboardStats() {
  const totalCounter = document.querySelector('.stat-counter');
  if (totalCounter) {
    totalCounter.textContent = Object.keys(applicantsData).length;
  }

  // Count by status
  let statusCounts = {
    'Passed': 0,
    'New': 0,
    'Callback': 0,
    'In-progress': 0,
    'Rejected': 0
  };

  // Count by source
  let sourceCounts = {
    'Website': 0,
    'Walk-in': 0,
    'Referral': 0,
    'Online Post': 0,
    'Job Board': 0,  
    'Other': 0,    
    'Job Fairs': 0   
  };

  Object.values(applicantsData).forEach(applicant => {
    // Count by status
    if (applicant.status) {
      statusCounts[applicant.status] = (statusCounts[applicant.status] || 0) + 1;
    }
    
    // Count by source
    if (applicant.source) {
      sourceCounts[applicant.source] = (sourceCounts[applicant.source] || 0) + 1;
    }
  });

  // Update status counts
  const statusCountElements = document.querySelectorAll('.status-count');
  if (statusCountElements.length >= 4) {
    statusCountElements[0].textContent = statusCounts['Passed'] || 0;
   statusCountElements[1].textContent = statusCounts['In-progress'] || 0;
    statusCountElements[2].textContent = statusCounts['Rejected'] || 0;
    statusCountElements[3].textContent = statusCounts['Callback'] || 0;
  }

  // Update source counts
  const sourceCountElements = document.querySelectorAll('.source-count');
  if (sourceCountElements.length >= 4) {
    sourceCountElements[0].textContent = (sourceCounts['Online Post'] || 0); 
    sourceCountElements[1].textContent = sourceCounts['Walk-in'] || 0;       
    sourceCountElements[2].textContent = sourceCounts['Referral'] || 0;      
    sourceCountElements[3].textContent = sourceCounts['Job Fairs'] || 0;     
  }

  // Update chart
  updateChart(statusCounts);
}

function updateChart(statusCounts) {
  if (!applicantsChart) {
    initializeChart();
  }

  const chartData = {
    'Passed': statusCounts['Passed'] || 0,
    'In-progress': (statusCounts['In-progress'] || 0) + (statusCounts['In-progress'] || 0),
    'Rejected': statusCounts['Rejected'] || 0,
    'Callback': statusCounts['Callback'] || 0
  };

  if (applicantsChart) {
    applicantsChart.data.datasets[0].data = Object.values(chartData);
    applicantsChart.update();
  }
}

function setupEventListeners() {
  // Add Applicant button
  const addBtn = document.getElementById('addApplicantBtn');
  if (addBtn) {
    addBtn.addEventListener('click', openAddApplicantModal);
  }

  // Table action buttons
  const table = document.getElementById('applicantTable');
  if (table) {
    table.addEventListener('click', function(e) {
      const target = e.target.closest('button');
      if (!target) return;

      const applicantId = target.getAttribute('data-id');
      if (!applicantId) return;

      if (target.classList.contains('view-btn')) {
        viewApplicant(applicantId);
      } else if (target.classList.contains('edit-btn')) {
        editApplicant(applicantId);
      } else if (target.classList.contains('delete-btn')) {
        deleteApplicant(applicantId);
      }
    });
  }

  document.addEventListener('click', function(e) {
    // Close modal when clicking on backdrop
    if (e.target.classList.contains('modal') || e.target.classList.contains('form-modal')) {
      closeModal(e.target.id);
    }
    
    // Close modal when clicking close button
    if (e.target.classList.contains('close-modal') || e.target.innerHTML === '&times;') {
      const modal = e.target.closest('.modal, .form-modal');
      if (modal) {
        closeModal(modal.id);
      }
    }
  });
}

function viewApplicant(applicantId) {
  const applicant = applicantsData[applicantId];
  if (!applicant) {
    console.error('Applicant not found:', applicantId);
    return;
  }

  const modal = document.getElementById('applicantModal');
  if (!modal) {
    console.error('Modal element not found');
    return;
  }

  // Create resume link if exists
  let resumeLink = '';
  if (applicant.resumeFile) {
    resumeLink = `
      <a href="${applicant.resumeFile}" class="btn-resume" target="_blank" download="resume_${applicant.firstName}_${applicant.lastName}">
        <i class="fas fa-file-pdf"></i> Download Resume
      </a>
    `;
  }

  const modalHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">
          <svg class="icon-user" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
            <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="currentColor"/>
          </svg>
          Applicant Profile
        </h2>
        <button class="close-modal">&times;</button>
      </div>

      <div class="modal-body">
        <div class="info-section">
          <h3 class="section-title">Personal Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Full Name</label>
              <div class="info-value">${applicant.firstName || ''} ${applicant.lastName || ''}</div>
            </div>
            <div class="info-item">
              <label>Date of Birth</label>
              <div class="info-value">${formatDateToMMDDYYYY(applicant.dob) || 'N/A'}</div>
            </div>
            <div class="info-item">
              <label>Address</label>
              <div class="info-value">${applicant.address || 'N/A'}</div>
            </div>
            <div class="info-item">
              <label>Contact Number</label>
              <div class="info-value">${applicant.phone || 'N/A'}</div>
            </div>
            <div class="info-item">
              <label>Email Address</label>
              <div class="info-value">${applicant.email || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3 class="section-title">Educational Background</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Degree/Course</label>
              <div class="info-value">${applicant.degree || 'N/A'}</div>
            </div>
            <div class="info-item">
              <label>School/University</label>
              <div class="info-value">${applicant.school || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3 class="section-title">Application Details</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Application Source</label>
              <div class="info-value">${applicant.source || 'N/A'}</div>
            </div>
            
            <div class="info-item">
              <label>Current Status</label>
              <div class="info-value status-${(applicant.status || '').toLowerCase().replace(/\s+/g, '-')}">${applicant.status || 'N/A'}</div>
            </div>
            <div class="info-item">
              <label>Initial Interview</label>
              <div class="info-value">${formatDateToMMDDYYYY(applicant.initialInterview) || 'N/A'}</div>
            </div>
            <div class="info-item">
              <label>Final Interview</label>
              <div class="info-value">${formatDateToMMDDYYYY(applicant.finalInterview) || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3 class="section-title">Additional Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Notes</label>
              <div class="info-value">${applicant.notes || 'No additional notes'}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        ${resumeLink}
        
      </div>
    </div>
  `;

  document.getElementById('appModalContent').innerHTML = modalHTML;
  modal.style.display = 'block';
  document.body.classList.add('modal-open');
}

async function openAddApplicantModal() {
  try {
    const response = await fetch('../applicants/addApp.html');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    
    const modal = document.getElementById('addApplicantModal');
    const modalContent = document.getElementById('addAppContent');
    
    if (!modal || !modalContent) {
      console.error('Add modal elements not found');
      return;
    }
    
    modalContent.innerHTML = html;
    
    const today = new Date().toISOString().split('T')[0];
    const appliedDateField = document.querySelector('#addApplicantForm input[name="appliedDate"]');
    if (appliedDateField) appliedDateField.value = today;

    const form = document.getElementById('addApplicantForm');
    if (form) {
      form.addEventListener('submit', handleAddApplicant);
    }

    initFileUpload('resumeFile', 'resumePreview', 'removeResumeBtn');

    modal.style.display = 'block';
    document.body.classList.add('modal-open');
  } catch (error) {
    console.error('Error loading add modal:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to load add applicant form: ' + error.message
    });
  }
}
async function editApplicant(applicantId) {
  const applicant = applicantsData[applicantId];
  if (!applicant) {
    console.error('Applicant not found:', applicantId);
    return;
  }

  try {
    const response = await fetch('../applicants/editApp.html');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    
    const modal = document.getElementById('editApplicantModal');
    const modalContent = document.getElementById('editAppContent');
    
    if (!modal || !modalContent) {
      console.error('Edit modal elements not found');
      return;
    }
    
    modalContent.innerHTML = html;
    
    const fields = {
      'editfirstName': applicant.firstName || '',
      'editlastName': applicant.lastName || '',
      'editDob': formatDateForInput(applicant.dob) || '',
      'editAddress': applicant.address || '',
      'editPhone': applicant.phone || '',
      'editEmail': applicant.email || '',
      'editDegree': applicant.degree || '',
      'editSchool': applicant.school || '',
      'editPosition': applicant.position || '',
      'editSource': applicant.source || '',
      'editAppliedDate': formatDateForInput(applicant.appliedDate) || '',
      'editStatus': applicant.status || '',
      'editInitialInterview': formatDateForInput(applicant.initialInterview) || '',
      'editFinalInterview': formatDateForInput(applicant.finalInterview) || '',
      'editNotes': applicant.notes || ''
    };

    Object.entries(fields).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.value = value;
    });

    // Add this line to set up the status change listener
    setupStatusChangeListener();

    if (applicant.resumeFile) {
      const preview = document.getElementById('editResumePreview');
      const removeBtn = document.getElementById('editRemoveResumeBtn');
      if (preview) {
        preview.textContent = 'Resume already uploaded';
        preview.style.display = 'block';
      }
      if (removeBtn) removeBtn.style.display = 'block';
    }

    const form = document.getElementById('editApplicantForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleEditApplicant(applicantId);
      });
    }

    initFileUpload('editResumeFile', 'editResumePreview', 'editRemoveResumeBtn');

    modal.style.display = 'block';
    document.body.classList.add('modal-open');
  } catch (error) {
    console.error('Error loading edit modal:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to load edit form: ' + error.message
    });
  }
}

function initFileUpload(inputId, previewId, removeBtnId) {
  const fileInput = document.getElementById(inputId);
  const filePreview = document.getElementById(previewId);
  const removeBtn = document.getElementById(removeBtnId);

  if (!fileInput || !filePreview) return;

  fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
      const validTypes = ['application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid File',
          text: 'Please select a PDF or Word document'
        });
        this.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'warning',
          title: 'File Too Large',
          text: 'Resume must be less than 5MB'
        });
        this.value = '';
        return;
      }

      filePreview.textContent = file.name;
      filePreview.style.display = 'block';
      if (removeBtn) removeBtn.style.display = 'block';
    }
  });

  if (removeBtn) {
    removeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      fileInput.value = '';
      filePreview.textContent = 'No file selected';
      filePreview.style.display = 'none';
      removeBtn.style.display = 'none';
    });
  }
}
async function handleAddApplicant(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  // Modified validation - removed position check
  if (!formData.get('firstName') || !formData.get('lastName') || 
      !formData.get('email')) {
    Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Please fill in all required fields (First Name, Last Name, Email)'
    });
    return;
  }

  const applicantData = {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    dob: formData.get('dob'),
    address: formData.get('address'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    degree: formData.get('degree'),
    school: formData.get('school'),
    // Removed position from here as well
    source: formData.get('source'),
    appliedDate: formData.get('appliedDate'),
    status: formData.get('status'),
    initialInterview: formData.get('initialInterview'),
    finalInterview: formData.get('finalInterview'),
    notes: formData.get('notes'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
 const resumeFile = document.getElementById('resumeFile')?.files[0];
  if (resumeFile) {
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        applicantData.resumeFile = e.target.result;
        await addDoc(collection(db, 'applicants'), applicantData);
        showSuccess('Applicant added successfully');
        closeModal('addApplicantModal');
      } catch (error) {
        handleError(error, 'Failed to add applicant');
      }
    };
    reader.readAsDataURL(resumeFile);
  } else {
    try {
      await addDoc(collection(db, 'applicants'), applicantData);
      showSuccess('Applicant added successfully');
      closeModal('addApplicantModal');
    } catch (error) {
      handleError(error, 'Failed to add applicant');
    }
  }
}

async function handleEditApplicant(applicantId) {
  const form = document.getElementById('editApplicantForm');
  if (!form) return;
  
  const formData = new FormData(form);
  const currentApplicant = applicantsData[applicantId];

  const applicantData = {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    dob: formData.get('dob'),
    address: formData.get('address'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    degree: formData.get('degree'),
    school: formData.get('school'),
    position: formData.get('position'),
    source: formData.get('source'),
    appliedDate: formData.get('appliedDate'),
    status: formData.get('status'),
    initialInterview: formData.get('initialInterview'),
    finalInterview: formData.get('finalInterview'),
    notes: formData.get('notes'),
    updatedAt: new Date().toISOString()
  };

  const resumeFile = document.getElementById('editResumeFile')?.files[0];
  if (resumeFile) {
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        applicantData.resumeFile = e.target.result;
        await updateDoc(doc(db, 'applicants', applicantId), applicantData);
        showSuccess('Applicant updated successfully');
        closeModal('editApplicantModal');
      } catch (error) {
        handleError(error, 'Failed to update applicant');
      }
    };
    reader.readAsDataURL(resumeFile);
  } else {
    // Keep existing resume if no new file was uploaded
    applicantData.resumeFile = currentApplicant?.resumeFile || null;
    try {
      await updateDoc(doc(db, 'applicants', applicantId), applicantData);
      showSuccess('Applicant updated successfully');
      closeModal('editApplicantModal');
    } catch (error) {
      handleError(error, 'Failed to update applicant');
    }
  }
}

async function deleteApplicant(applicantId) {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: "You won't be able to revert this!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e3342f',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, delete it!'
  });

  if (result.isConfirmed) {
    try {
      await deleteDoc(doc(db, 'applicants', applicantId));
      showSuccess('Applicant deleted successfully');
    } catch (error) {
      handleError(error, 'Failed to delete applicant');
    }
  }
}

function showSuccess(message) {
  Swal.fire({
    icon: 'success',
    title: 'Success!',
    text: message,
    timer: 2000,
    showConfirmButton: false
  });
}

function handleError(error, message) {
  console.error(message, error);
  Swal.fire({
    icon: 'error',
    title: 'Error!',
    text: message
  });
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
}

window.viewApplicant = viewApplicant;
window.closeModal = closeModal;

document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('toggleOverview');
  const mainContainer = document.querySelector('.wrap-container');
  
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      mainContainer.classList.toggle('overview-hidden');
      
      if (mainContainer.classList.contains('overview-hidden')) {
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Show Overview';
      } else {
        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Overview';
      }
      
      if (!mainContainer.classList.contains('overview-hidden') && applicantsChart) {
        applicantsChart.update();
      }
    });
  }
});

function setupStatusChangeListener() {
  const statusSelect = document.getElementById('editStatus');
  const finalInterviewField = document.getElementById('editFinalInterview');
  
  if (statusSelect && finalInterviewField) {
    // Initial check
    if (statusSelect.value === 'Rejected') {
      finalInterviewField.disabled = true;
      finalInterviewField.value = '';
      finalInterviewField.style.opacity = '0.5';
      finalInterviewField.style.backgroundColor = '#f5f5f5';
    }
    
    // Add event listener for changes
    statusSelect.addEventListener('change', function() {
      if (this.value === 'Rejected') {
        finalInterviewField.disabled = true;
        finalInterviewField.value = '';
        finalInterviewField.style.opacity = '0.5';
        finalInterviewField.style.backgroundColor = '#f5f5f5';
      } else {
        finalInterviewField.disabled = false;
        finalInterviewField.style.opacity = '1';
        finalInterviewField.style.backgroundColor = '';
      }
    });
  }
}