import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { app } from "../../js/firebase-config.js"; 

let authCheckInterval = null;
let lastActivity = Date.now();
let sessionTimeout = 30 * 60 * 1000; // 30 minutes
let warningTimeout = 5 * 60 * 1000; // 5 minutes before session expires
let currentUser = null;

// Track user activity
function trackActivity() {
    lastActivity = Date.now();
}

// Add activity listeners
function initActivityTracking() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
        document.addEventListener(event, trackActivity, true);
    });
}

// Show session warning
function showSessionWarning() {
    if (window.Swal) {
        Swal.fire({
            title: 'Session Expiring Soon',
            text: 'Your session will expire in 5 minutes due to inactivity. Click "Stay Logged In" to continue.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Stay Logged In',
            cancelButtonText: 'Logout Now',
            timer: 60000, // Auto-close after 1 minute
            timerProgressBar: true
        }).then((result) => {
            if (result.isConfirmed) {
                // Reset activity timer
                lastActivity = Date.now();
                console.log('🔄 Session extended by user action');
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                // User chose to logout
                performLogout();
            }
        });
    } else {
        // Fallback if SweetAlert is not available
        const stayLoggedIn = confirm('Your session will expire soon due to inactivity. Click OK to stay logged in, or Cancel to logout.');
        if (stayLoggedIn) {
            lastActivity = Date.now();
        } else {
            performLogout();
        }
    }
}

// Perform logout
async function performLogout() {
    try {
        const auth = getAuth(app);
        await signOut(auth);
        console.log('👋 User logged out successfully');
    } catch (error) {
        console.error('❌ Error during logout:', error);
        // Force redirect even if signOut fails
        redirectToLogin();
    }
}

// Redirect to login page
function redirectToLogin() {
    const basePath = window.location.pathname.includes("/HR-System/") ? "/HR-System" : "";
    
    // Clear any cached data
    try {
        localStorage.clear();
        sessionStorage.clear();
    } catch (error) {
        console.warn('⚠️ Could not clear storage:', error);
    }
    
    window.location.href = `${basePath}/templates/auth/login.html`;
}

// Check session validity
function checkSession() {
    const timeSinceActivity = Date.now() - lastActivity;
    
    if (timeSinceActivity > sessionTimeout) {
        console.log('⏰ Session expired due to inactivity');
        performLogout();
    } else if (timeSinceActivity > (sessionTimeout - warningTimeout)) {
        console.log('⚠️ Session expiring soon, showing warning');
        showSessionWarning();
    }
}

// Enhanced auth guard with session management
export function enforceAuthRedirect(options = {}) {
    const {
        sessionTimeoutMinutes = 30,
        warningMinutes = 5,
        checkIntervalSeconds = 60
    } = options;
    
    // Update timeouts based on options
    sessionTimeout = sessionTimeoutMinutes * 60 * 1000;
    warningTimeout = warningMinutes * 60 * 1000;
    
    const auth = getAuth(app);
    
    console.log(`🔐 Auth guard initialized (${sessionTimeoutMinutes}min timeout, ${warningMinutes}min warning)`);
    
    // Initialize activity tracking
    initActivityTracking();
    
    // Set up periodic session checks
    if (authCheckInterval) {
        clearInterval(authCheckInterval);
    }
    
    authCheckInterval = setInterval(() => {
        if (currentUser) {
            checkSession();
        }
    }, checkIntervalSeconds * 1000);
    
    // Monitor auth state changes
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        
        if (!user) {
            console.log('❌ No authenticated user found, redirecting to login');
            clearInterval(authCheckInterval);
            redirectToLogin();
        } else {
            console.log(`✅ User authenticated: ${user.email}`);
            lastActivity = Date.now(); // Reset activity timer on auth
        }
    });
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && currentUser) {
            // Page became visible, check if user is still authenticated
            auth.currentUser?.getIdToken(true).catch(() => {
                console.log('🔄 Token refresh failed, user may be logged out');
                performLogout();
            });
        }
    });
    
    // Handle beforeunload to clear intervals
    window.addEventListener('beforeunload', () => {
        if (authCheckInterval) {
            clearInterval(authCheckInterval);
        }
    });
}

// Export logout function for manual use
export async function logout() {
    await performLogout();
}

// Export function to extend session manually
export function extendSession() {
    lastActivity = Date.now();
    console.log('🔄 Session extended manually');
}
