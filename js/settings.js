import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Settings data cache
let settingsData = {
    company: {},
    departments: [],
    organizations: {},
    statuses: ['Active', 'Inactive', 'On Leave', 'Terminated'],
    notifications: {
        internThreshold: 15,
        birthdayThreshold: 7,
        anniversaryThreshold: 14,
        internNotifications: true,
        birthdayNotifications: false,
        anniversaryNotifications: false
    },
    systemPreferences: {
        theme: 'light',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12',
        timezone: 'America/New_York',
        autoSave: true,
        soundNotifications: false,
        compactView: false
    }
};

// Function to update employee status options across all forms and filters
function updateEmployeeStatusOptions() {
    // Update status options in employee management forms and filters
    updateStatusDropdown('filterStatus', 'All Status', settingsData.statuses);
    
    // Update add employee form status dropdown (exclude Terminated)
    const addFormStatuses = settingsData.statuses.filter(status => status !== 'Terminated');
    updateStatusDropdown('status', 'Select Status', addFormStatuses);
    
    // Update edit employee form status dropdown (include all statuses)
    updateStatusDropdown('editStatus', 'Select Status', settingsData.statuses);
}

// Helper function to update a specific dropdown with provided statuses
function updateStatusDropdown(dropdownId, defaultOptionText, statuses) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        // Store current value
        const currentValue = dropdown.value;
        
        // Clear existing options except the default
        while (dropdown.children.length > 1) {
            dropdown.removeChild(dropdown.lastChild);
        }
        
        // Add provided statuses
        statuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            dropdown.appendChild(option);
        });
        
        // Restore current value if it still exists
        if (statuses.includes(currentValue)) {
            dropdown.value = currentValue;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initializeSettings();
    setupEventListeners();
    loadSettingsData();
});

function initializeSettings() {
    // Load default departments from dashboard
    settingsData.departments = [
        'Internship',
        'TGQS',
        'Administration & Managers',
        'IT & Technical',
        'Oppy Transport',
        'Marketing',
        'UnicornHair AI',
        'Carrier Connection'
    ];
    
    renderDepartments();
    renderStatuses();
    initializeSystemPreferences();
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Company form submission
    document.getElementById('company-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveCompanyInfo();
    });

    // Toggle switches
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
        });
    });

    // Threshold inputs
    document.querySelectorAll('.threshold-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            if (value < 1) e.target.value = 1;
            if (e.target.id === 'intern-threshold' && value > 365) e.target.value = 365;
            if ((e.target.id === 'birthday-threshold' || e.target.id === 'anniversary-threshold') && value > 30) e.target.value = 30;
        });
    });

    // System preferences event listeners
    setupSystemPreferencesListeners();
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

async function loadSettingsData() {
    try {
        // Load settings from Firestore
        const settingsQuery = query(collection(db, 'settings'));
        const settingsSnapshot = await getDocs(settingsQuery);
        
        settingsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (doc.id === 'company') {
                settingsData.company = data;
                populateCompanyForm(data);
            } else if (doc.id === 'departments') {
                settingsData.departments = data.list || settingsData.departments;
                renderDepartments();
            } else if (doc.id === 'organizations') {
                settingsData.organizations = data;
                populateOrganizationForms(data);
            } else if (doc.id === 'statuses') {
                settingsData.statuses = data.list || settingsData.statuses;
                renderStatuses();
                updateEmployeeStatusOptions();
            } else if (doc.id === 'notifications') {
                settingsData.notifications = { ...settingsData.notifications, ...data };
                populateNotificationSettings(data);
            } else if (doc.id === 'systemPreferences') {
                settingsData.systemPreferences = { ...settingsData.systemPreferences, ...data };
                populateSystemPreferences(data);
                updateDateTimePreview();
                applyTheme();
            }
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        showToast('Error loading settings', 'error');
    }
}

function populateCompanyForm(data) {
    document.getElementById('company-name').value = data.name || 'Hyacinth HR Management';
    document.getElementById('company-address').value = data.address || '';
    document.getElementById('company-phone').value = data.phone || '';
    document.getElementById('company-email').value = data.email || '';
    document.getElementById('company-website').value = data.website || '';
}

function populateOrganizationForms(data) {
    if (data.rahyo) {
        document.getElementById('rahyo-description').value = data.rahyo.description || '';
        document.getElementById('rahyo-head').value = data.rahyo.head || '';
    }
    if (data.hhi) {
        document.getElementById('hhi-description').value = data.hhi.description || '';
        document.getElementById('hhi-head').value = data.hhi.head || '';
    }
}

function populateNotificationSettings(data) {
    document.getElementById('intern-threshold').value = data.internThreshold || 15;
    document.getElementById('birthday-threshold').value = data.birthdayThreshold || 7;
    document.getElementById('anniversary-threshold').value = data.anniversaryThreshold || 14;
    
    // Set toggle switches
    const internToggle = document.querySelector('[data-setting="intern-notifications"]');
    const birthdayToggle = document.querySelector('[data-setting="birthday-notifications"]');
    const anniversaryToggle = document.querySelector('[data-setting="anniversary-notifications"]');
    
    if (data.internNotifications !== false) internToggle.classList.add('active');
    if (data.birthdayNotifications) birthdayToggle.classList.add('active');
    if (data.anniversaryNotifications) anniversaryToggle.classList.add('active');
}

async function saveCompanyInfo() {
    try {
        const companyData = {
            name: document.getElementById('company-name').value,
            address: document.getElementById('company-address').value,
            phone: document.getElementById('company-phone').value,
            email: document.getElementById('company-email').value,
            website: document.getElementById('company-website').value,
            updatedAt: new Date()
        };

        await setDoc(doc(db, 'settings', 'company'), companyData);
        settingsData.company = companyData;
        
        showToast('Company information saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving company info:', error);
        showToast('Error saving company information', 'error');
    }
}

function renderDepartments() {
    const departmentList = document.getElementById('department-list');
    departmentList.innerHTML = '';

    settingsData.departments.forEach((dept, index) => {
        const deptItem = document.createElement('div');
        deptItem.className = 'department-item';
        deptItem.innerHTML = `
            <span>${dept}</span>
            <div class="department-actions">
                <button class="btn btn-small" onclick="editDepartment(${index})">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteDepartment(${index})">Delete</button>
            </div>
        `;
        departmentList.appendChild(deptItem);
    });
}

window.addDepartment = async function() {
    const newDeptInput = document.getElementById('new-department');
    const deptName = newDeptInput.value.trim();
    
    if (!deptName) {
        showToast('Please enter a department name', 'warning');
        return;
    }
    
    if (settingsData.departments.includes(deptName)) {
        showToast('Department already exists', 'warning');
        return;
    }
    
    try {
        settingsData.departments.push(deptName);
        await saveDepartments();
        renderDepartments();
        newDeptInput.value = '';
        showToast('Department added successfully!', 'success');
    } catch (error) {
        console.error('Error adding department:', error);
        showToast('Error adding department', 'error');
    }
};

window.editDepartment = async function(index) {
    const currentName = settingsData.departments[index];
    
    const { value: newName } = await Swal.fire({
        title: 'Edit Department',
        input: 'text',
        inputValue: currentName,
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value) {
                return 'You need to write something!';
            }
            if (value !== currentName && settingsData.departments.includes(value)) {
                return 'Department already exists!';
            }
        }
    });

    if (newName) {
        try {
            settingsData.departments[index] = newName;
            await saveDepartments();
            renderDepartments();
            showToast('Department updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating department:', error);
            showToast('Error updating department', 'error');
        }
    }
};

window.deleteDepartment = async function(index) {
    const deptName = settingsData.departments[index];
    
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: `Delete "${deptName}" department?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try {
            settingsData.departments.splice(index, 1);
            await saveDepartments();
            renderDepartments();
            showToast('Department deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting department:', error);
            showToast('Error deleting department', 'error');
        }
    }
};

async function saveDepartments() {
    await setDoc(doc(db, 'settings', 'departments'), {
        list: settingsData.departments,
        updatedAt: new Date()
    });
}

window.saveOrganization = async function(orgType) {
    try {
        const description = document.getElementById(`${orgType}-description`).value;
        const head = document.getElementById(`${orgType}-head`).value;
        
        const orgData = {
            ...settingsData.organizations,
            [orgType]: {
                description: description,
                head: head,
                updatedAt: new Date()
            }
        };

        await setDoc(doc(db, 'settings', 'organizations'), orgData);
        settingsData.organizations = orgData;
        
        showToast(`${orgType.toUpperCase()} settings saved successfully!`, 'success');
    } catch (error) {
        console.error(`Error saving ${orgType} settings:`, error);
        showToast(`Error saving ${orgType.toUpperCase()} settings`, 'error');
    }
};

function renderStatuses() {
    const statusList = document.getElementById('status-list');
    statusList.innerHTML = '';

    settingsData.statuses.forEach((status, index) => {
        const statusTag = document.createElement('div');
        statusTag.className = 'status-tag';
        statusTag.innerHTML = `
            <span>${status}</span>
            <i class="fas fa-times remove-status" onclick="removeStatus(${index})"></i>
        `;
        statusList.appendChild(statusTag);
    });
}

window.addStatus = async function addStatus() {
    const statusInput = document.getElementById('new-status');
    const statusValue = statusInput.value.trim();
    
    if (!statusValue) {
        showToast('Please enter a status name', 'error');
        return;
    }
    
    if (settingsData.statuses.includes(statusValue)) {
        showToast('Status already exists', 'error');
        return;
    }
    
    settingsData.statuses.push(statusValue);
    statusInput.value = '';
    renderStatuses();
    saveStatuses();
    updateEmployeeStatusOptions();
}

window.removeStatus = async function removeStatus(index) {
    if (settingsData.statuses.length <= 1) {
        showToast('At least one status is required', 'error');
        return;
    }
    
    Swal.fire({
        title: 'Are you sure?',
        text: `Remove status "${settingsData.statuses[index]}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e3342f',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, remove it!'
    }).then((result) => {
        if (result.isConfirmed) {
            settingsData.statuses.splice(index, 1);
            renderStatuses();
            saveStatuses();
            updateEmployeeStatusOptions();
            showToast('Status removed successfully!', 'success');
        }
    });
}

async function saveStatuses() {
    await setDoc(doc(db, 'settings', 'statuses'), {
        list: settingsData.statuses,
        updatedAt: new Date()
    });
}

window.saveNotificationSettings = async function() {
    try {
        const notificationData = {
            internThreshold: parseInt(document.getElementById('intern-threshold').value),
            birthdayThreshold: parseInt(document.getElementById('birthday-threshold').value),
            anniversaryThreshold: parseInt(document.getElementById('anniversary-threshold').value),
            internNotifications: document.querySelector('[data-setting="intern-notifications"]').classList.contains('active'),
            birthdayNotifications: document.querySelector('[data-setting="birthday-notifications"]').classList.contains('active'),
            anniversaryNotifications: document.querySelector('[data-setting="anniversary-notifications"]').classList.contains('active'),
            updatedAt: new Date()
        };

        await setDoc(doc(db, 'settings', 'notifications'), notificationData);
        settingsData.notifications = notificationData;
        
        showToast('Notification settings saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving notification settings:', error);
        showToast('Error saving notification settings', 'error');
    }
};

function showToast(message, type = 'info') {
    const iconMap = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };

    Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: iconMap[type] || 'info',
        title: message
    });
}

// System Preferences Functions
function initializeSystemPreferences() {
    populateSystemPreferences(settingsData.systemPreferences);
    updateDateTimePreview();
}

function setupSystemPreferencesListeners() {
    // Date format change listener
    const dateFormatSelect = document.getElementById('date-format-select');
    if (dateFormatSelect) {
        dateFormatSelect.addEventListener('change', updateDateTimePreview);
    }

    // Time format change listener
    const timeFormatSelect = document.getElementById('time-format-select');
    if (timeFormatSelect) {
        timeFormatSelect.addEventListener('change', updateDateTimePreview);
    }

    // Theme change listener
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', applyTheme);
    }
}

function populateSystemPreferences(data) {
    if (!data) return;

    // Populate form fields
    const fields = {
        'theme-select': data.theme,
        'language-select': data.language,
        'date-format-select': data.dateFormat,
        'time-format-select': data.timeFormat,
        'timezone-select': data.timezone
    };

    Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value) {
            element.value = value;
        }
    });

    // Populate checkboxes
    const checkboxes = {
        'auto-save': data.autoSave,
        'sound-notifications': data.soundNotifications,
        'compact-view': data.compactView
    };

    Object.entries(checkboxes).forEach(([id, checked]) => {
        const element = document.getElementById(id);
        if (element) {
            element.checked = checked;
        }
    });
}

function updateDateTimePreview() {
    const dateFormatSelect = document.getElementById('date-format-select');
    const timeFormatSelect = document.getElementById('time-format-select');
    const datePreview = document.getElementById('date-preview');
    const timePreview = document.getElementById('time-preview');

    if (!dateFormatSelect || !timeFormatSelect || !datePreview || !timePreview) return;

    const now = new Date();
    const dateFormat = dateFormatSelect.value;
    const timeFormat = timeFormatSelect.value;

    // Format date preview
    let formattedDate = '';
    switch (dateFormat) {
        case 'MM/DD/YYYY':
            formattedDate = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()}`;
            break;
        case 'DD/MM/YYYY':
            formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
            break;
        case 'YYYY-MM-DD':
            formattedDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
            break;
        case 'DD MMM YYYY':
            formattedDate = `${now.getDate()} ${now.toLocaleDateString('en', { month: 'short' })} ${now.getFullYear()}`;
            break;
        case 'MMM DD, YYYY':
            formattedDate = `${now.toLocaleDateString('en', { month: 'short' })} ${now.getDate()}, ${now.getFullYear()}`;
            break;
    }

    // Format time preview
    let formattedTime = '';
    if (timeFormat === '12') {
        formattedTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else {
        formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    datePreview.textContent = `Preview: ${formattedDate}`;
    timePreview.textContent = `Preview: ${formattedTime}`;
}

function applyTheme() {
    const themeSelect = document.getElementById('theme-select');
    if (!themeSelect) return;

    const selectedTheme = themeSelect.value;
    const body = document.body;

    // Remove existing theme classes
    body.classList.remove('light-theme', 'dark-theme');

    // Apply new theme
    if (selectedTheme === 'dark') {
        body.classList.add('dark-theme');
    } else if (selectedTheme === 'light') {
        body.classList.add('light-theme');
    } else if (selectedTheme === 'auto') {
        // Use system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            body.classList.add('dark-theme');
        } else {
            body.classList.add('light-theme');
        }
    }
}

window.saveSystemPreferences = async function() {
    try {
        const systemPreferencesData = {
            theme: document.getElementById('theme-select').value,
            language: document.getElementById('language-select').value,
            dateFormat: document.getElementById('date-format-select').value,
            timeFormat: document.getElementById('time-format-select').value,
            timezone: document.getElementById('timezone-select').value,
            autoSave: document.getElementById('auto-save').checked,
            soundNotifications: document.getElementById('sound-notifications').checked,
            compactView: document.getElementById('compact-view').checked,
            updatedAt: new Date()
        };

        await setDoc(doc(db, 'settings', 'systemPreferences'), systemPreferencesData);
        settingsData.systemPreferences = systemPreferencesData;
        
        // Apply theme immediately
        applyTheme();
        
        showToast('System preferences saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving system preferences:', error);
        showToast('Error saving system preferences', 'error');
    }
};
