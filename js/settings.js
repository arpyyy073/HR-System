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
    }
};

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
            } else if (doc.id === 'notifications') {
                settingsData.notifications = { ...settingsData.notifications, ...data };
                populateNotificationSettings(data);
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

window.addStatus = async function() {
    const newStatusInput = document.getElementById('new-status');
    const statusName = newStatusInput.value.trim();
    
    if (!statusName) {
        showToast('Please enter a status name', 'warning');
        return;
    }
    
    if (settingsData.statuses.includes(statusName)) {
        showToast('Status already exists', 'warning');
        return;
    }
    
    try {
        settingsData.statuses.push(statusName);
        await saveStatuses();
        renderStatuses();
        newStatusInput.value = '';
        showToast('Status added successfully!', 'success');
    } catch (error) {
        console.error('Error adding status:', error);
        showToast('Error adding status', 'error');
    }
};

window.removeStatus = async function(index) {
    const statusName = settingsData.statuses[index];
    
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: `Remove "${statusName}" status?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, remove it!'
    });

    if (result.isConfirmed) {
        try {
            settingsData.statuses.splice(index, 1);
            await saveStatuses();
            renderStatuses();
            showToast('Status removed successfully!', 'success');
        } catch (error) {
            console.error('Error removing status:', error);
            showToast('Error removing status', 'error');
        }
    }
};

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
