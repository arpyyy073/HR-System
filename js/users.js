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
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Global variables
let usersTable;
let usersData = {};

// Check if user is authenticated
function checkAuthStatus() {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
        console.error('❌ User not authenticated');
        return false;
    }
    
    return true;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeDataTable();
  loadUsers();
  setupEventListeners();
});

function initializeDataTable() {
  if ($.fn.DataTable.isDataTable('#usersTable')) {
    usersTable = $('#usersTable').DataTable();
    usersTable.clear().draw();
    return;
  }

  usersTable = $('#usersTable').DataTable({
    language: {
      paginate: {
        first: "First",
        last: "Last",
        next: "Next ›",
        previous: "‹ Prev"
      },
      lengthMenu: "Show _MENU_ users per page",
      info: "Showing _START_ to _END_ of _TOTAL_ users",
      infoEmpty: "No users to show",
      infoFiltered: "(filtered from _MAX_ total users)",
      zeroRecords: "No matching users found",
      search: "Search Users:"
    },
    dom: "<'top-wrapper'<'left-entries'l><'right-search'f>>" +
         "<'table-responsive'tr>" +
         "<'bottom-wrapper'<'left-info'i><'right-paging'p>>",
    paging: true,
    pageLength: 10,
    lengthMenu: [5, 10, 25, 50, 100],
    columns: [
      { data: 'name' },
      { data: 'email' },
      { data: 'role' },
      { 
        data: 'status',
        render: function(data, type, row) {
          const statusClass = data.toLowerCase().replace(/\s+/g, '-');
          return `<span class="status-badge status-${statusClass}">${data}</span>`;
        }
      },
      { data: 'lastLogin' },
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

function loadUsers() {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  
  onSnapshot(q, (snapshot) => {
    usersData = {};
    const users = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      usersData[doc.id] = data;
      users.push({
        id: doc.id,
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        email: data.email || 'N/A',
        role: data.role || 'Employee',
        status: data.status || 'Active',
        lastLogin: formatDate(data.lastLogin) || 'Never'
      });
    });
    
    // Clear and repopulate table
    usersTable.clear();
    usersTable.rows.add(users);
    usersTable.draw();
  }, (error) => {
    console.error('Error loading users:', error);
    handleError(error, 'Failed to load users');
  });
}

function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${month}-${day}-${year}`;
}

function setupEventListeners() {
  // Filter listeners
  document.getElementById('filterRole')?.addEventListener('change', applyFilters);
  document.getElementById('filterStatus')?.addEventListener('change', applyFilters);
  
  // Table action listeners
  $(document).on('click', '.view-btn', function() {
    const userId = $(this).data('id');
    viewUser(userId);
  });
  
  $(document).on('click', '.edit-btn', function() {
    const userId = $(this).data('id');
    editUser(userId);
  });
  
  $(document).on('click', '.delete-btn', function() {
    const userId = $(this).data('id');
    deleteUser(userId);
  });
  
  // Add user button
  document.querySelector('.top-btn')?.addEventListener('click', openAddUserModal);
}

function applyFilters() {
  const roleFilter = document.getElementById('filterRole')?.value || '';
  const statusFilter = document.getElementById('filterStatus')?.value || '';
  
  usersTable.columns(2).search(roleFilter);
  usersTable.columns(3).search(statusFilter);
  usersTable.draw();
}

async function viewUser(userId) {
  const user = usersData[userId];
  if (!user) {
    console.error('User not found:', userId);
    return;
  }
  
  const modalHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>User Details</h2>
        <span class="close" onclick="closeModal('userViewModal')">&times;</span>
      </div>
      
      <div class="modal-body">
        <div class="info-section">
          <h3 class="section-title">Personal Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Full Name</label>
              <div class="info-value">${user.firstName || ''} ${user.lastName || ''}</div>
            </div>
            <div class="info-item">
              <label>Email</label>
              <div class="info-value">${user.email || 'N/A'}</div>
            </div>
            <div class="info-item">
              <label>Phone</label>
              <div class="info-value">${user.phone || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3 class="section-title">Account Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Role</label>
              <div class="info-value">${user.role || 'Employee'}</div>
            </div>
            <div class="info-item">
              <label>Status</label>
              <div class="info-value status-${(user.status || '').toLowerCase().replace(/\s+/g, '-')}">${user.status || 'Active'}</div>
            </div>
            <div class="info-item">
              <label>Last Login</label>
              <div class="info-value">${formatDate(user.lastLogin) || 'Never'}</div>
            </div>
            <div class="info-item">
              <label>Created</label>
              <div class="info-value">${formatDate(user.createdAt) || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Create modal if it doesn't exist
  let modal = document.getElementById('userViewModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'userViewModal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = modalHTML;
  modal.style.display = 'block';
  document.body.classList.add('modal-open');
}

async function openAddUserModal() {
  // Check authentication before proceeding
  if (!checkAuthStatus()) {
    Swal.fire({
      icon: 'error',
      title: 'Authentication Required',
      text: 'Please log in to add users'
    });
    return;
  }
  
  // Implementation for add user modal would go here
  Swal.fire({
    icon: 'info',
    title: 'Feature Coming Soon',
    text: 'Add user functionality will be implemented soon'
  });
}

async function editUser(userId) {
  // Check authentication before proceeding
  if (!checkAuthStatus()) {
    Swal.fire({
      icon: 'error',
      title: 'Authentication Required',
      text: 'Please log in to edit users'
    });
    return;
  }
  
  // Implementation for edit user would go here
  Swal.fire({
    icon: 'info',
    title: 'Feature Coming Soon',
    text: 'Edit user functionality will be implemented soon'
  });
}

async function deleteUser(userId) {
  // Check authentication before proceeding
  if (!checkAuthStatus()) {
    Swal.fire({
      icon: 'error',
      title: 'Authentication Required',
      text: 'Please log in to delete users'
    });
    return;
  }
  
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
      await deleteDoc(doc(db, 'users', userId));
      showSuccess('User deleted successfully');
    } catch (error) {
      handleError(error, 'Failed to delete user');
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

// Make functions available globally
window.viewUser = viewUser;
window.closeModal = closeModal;
