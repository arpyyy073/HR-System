function showEmployeeDetails(employee) {
    const modal = document.getElementById("employeeModal");
    if (modal) {
        document.getElementById("empName").textContent = employee.name || '-';
        document.getElementById("empDob").textContent = employee.dob || '-';
        document.getElementById("empAddress").textContent = employee.address || '-';
        document.getElementById("empPhone").textContent = employee.phone || '-';
        document.getElementById("empEmail").textContent = employee.email || '-';
        document.getElementById("empJob").textContent = employee.job || '-';
        document.getElementById("empDept").textContent = employee.department || '-';
        document.getElementById("empSalary").textContent = employee.salary || '-';
        document.getElementById("empHire").textContent = employee.hireDate || '-';
        document.getElementById("empStatus").textContent = employee.status || '-';
        
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
        if (form) {
            form.reset();
        }
    }
}


function openEditEmployeeModal(employee) {
    const modal = document.getElementById("editEmployeeModal");
    if (modal) {
 
        const nameParts = employee.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
   
        document.getElementById("editFirstName").value = firstName;
        document.getElementById("editLastName").value = lastName;
        document.getElementById("editDob").value = employee.dob || '';
        document.getElementById("editAddress").value = employee.address || '';
        document.getElementById("editPhone").value = employee.phone || '';
        document.getElementById("editEmail").value = employee.email || '';
        
       
        document.getElementById("editJobTitle").value = employee.job || '';
        document.getElementById("editDepartment").value = employee.department || '';
        document.getElementById("editSalary").value = employee.salary ? employee.salary.replace('P', '') : '';
        document.getElementById("editHireDate").value = employee.hireDate || '';
        document.getElementById("editStatus").value = employee.status || '';
        
        modal.style.display = "block";
        document.body.style.overflow = "hidden";
    }
}

function closeEditEmployeeModal() {
    const modal = document.getElementById("editEmployeeModal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
    }
}

function getEmployeeDataFromViewButton(viewBtn) {
    try {
      
        const employeeData = viewBtn.getAttribute('data-employee');
        if (employeeData) {
            return JSON.parse(employeeData);
        }

        
        const onclickStr = viewBtn.getAttribute('onclick');
        if (!onclickStr) return null;

        const match = onclickStr.match(/\{[\s\S]*\}/);
        if (!match || !match[0]) return null;

        return eval('(' + match[0] + ')');
    } catch (error) {
        console.error('Error parsing employee data:', error);
        return null;
    }
}




document.addEventListener('DOMContentLoaded', function() {
 
    fetch('empModal.html')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load employee modal');
            return response.text();
        })
        .then(html => {
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = html;
            document.body.appendChild(modalContainer);
        })
        .catch(error => {
            console.error('Error loading employee modal:', error);
            document.body.insertAdjacentHTML('beforeend', `
                <div id="employeeModal" class="modal" style="display:none">
                    <div class="modal-content">
                        <span class="close-modal" onclick="closeEmployeeModal()">×</span>
                        <div id="modal-body-content">Employee details modal failed to load</div>
                    </div>
                </div>
            `);
        });


    fetch('addEmp.html')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load add employee modal');
            return response.text();
        })
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            initImageUpload();
        })
        .catch(error => {
            console.error('Error loading add employee modal:', error);
            document.body.insertAdjacentHTML('beforeend', `
                <div id="addEmployeeModal" class="modal" style="display:none">
                    <div class="modal-content">
                        <span class="close-modal" onclick="closeAddEmployeeModal()">×</span>
                        <div>Add employee modal failed to load</div>
                    </div>
                </div>
            `);
        });


    fetch('editEmp.html')  
        .then(response => {
            if (!response.ok) throw new Error('Failed to load edit employee modal');
            return response.text();
        })
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            initEditImageUpload();
        })
        .catch(error => {
            console.error('Error loading edit employee modal:', error);
            document.body.insertAdjacentHTML('beforeend', `
                <div id="editEmployeeModal" class="modal" style="display:none">
                    <div class="modal-content">
                        <span class="close-modal" onclick="closeEditEmployeeModal()">×</span>
                        <div>Edit employee modal failed to load</div>
                    </div>
                </div>
            `);
        });

    initDataTable();
    setupEventListeners();
});
function initDataTable() {
    const table = $("#employeeTable").DataTable({
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
             "<'bottom-wrapper'<'left-info'i><'right-paging'p>>"
    });

    // Filters
    $("#filterDepartment").on("change", function () {
        table.column(3).search(this.value).draw();
    });

    $("#filterJob").on("change", function () {
        table.column(2).search(this.value).draw();
    });

    $("#filterStatus").on("change", function () {
        table.column(6).search(this.value).draw();
    });

    $("#filterHireDate").on("change", function () {
        table.column(5).search(this.value).draw();
    });
}


function setupEventListeners() {
    document.addEventListener('click', function(event) {
       
        if (event.target.closest('.top-btn')) {
            openAddEmployeeModal();
        }

  
        if (event.target.classList.contains('close-modal')) {
            closeEmployeeModal();
        }

      
        if (event.target.classList.contains('close-modal') || 
            event.target.closest('.btn-cancel')) {
            closeAddEmployeeModal();
        }

     
        if (event.target.classList.contains('close-modal') || 
            (event.target.closest('.btn-cancel') && event.target.closest('#editEmployeeModal'))) {
            closeEditEmployeeModal();
        }

     
        if (event.target.closest('.edit-btn')) {
            const button = event.target.closest('.edit-btn');
            const viewBtn = button.closest('td').querySelector('.view-btn');

            if (viewBtn) {
                const employee = getEmployeeDataFromViewButton(viewBtn);
                if (employee) {
                    openEditEmployeeModal(employee);
                } else {
                    console.error('Could not extract employee data');
                    alert('Failed to load employee data for editing');
                }
            }
        }
    });



    document.addEventListener('click', function(event) {
        if (event.target.closest('.delete-btn')) {
            const button = event.target.closest('.delete-btn');
            const ItemId = button.getAttribute("data-id");
    
            Swal.fire({
                title: "Are you sure?",
                text: "This action cannot be undone.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#e3342f",      
                cancelButtonColor: "#6c757d",       
                confirmButtonText: "Yes, delete it!",
                cancelButtonText: "Cancel",
                background: "#ffffff",
                customClass: {
                    popup: 'swal-custom-font',
                    title: 'swal-title',
                    htmlContainer: 'swal-text',
                    confirmButton: 'swal-confirm',
                    cancelButton: 'swal-cancel'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = `delete.function?id=${ItemId}`;
                }
            });
        }
    });
    
}

function initImageUpload() {
    const imageUpload = document.getElementById('profileImage');
    const previewImage = document.getElementById('previewImage');
    const defaultText = document.querySelector('.default-text');
    const removeImageBtn = document.getElementById('removeImageBtn');

    if (!imageUpload || !previewImage) return;

    imageUpload.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            if (!file.type.match('image.*')) {
                alert('Please select an image file');
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                alert('Image must be less than 2MB');
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
            imageUpload.value = '';
            previewImage.src = '';
            previewImage.style.display = 'none';
            if (defaultText) defaultText.style.display = 'block';
            this.style.display = 'none';
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
                alert('Please select an image file');
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                alert('Image must be less than 2MB');
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
            imageUpload.value = '';
            previewImage.src = '';
            previewImage.style.display = 'none';
            if (defaultText) defaultText.style.display = 'block';
            this.style.display = 'none';
        });
    }
}