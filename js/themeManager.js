import { db } from './firebase-config.js';
import { 
    doc, 
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Apply theme on page load
export async function applyThemeOnLoad() {
    try {
        // Get system preferences from Firestore
        const systemPrefsDoc = await getDoc(doc(db, 'settings', 'systemPreferences'));
        
        if (systemPrefsDoc.exists()) {
            const systemPreferences = systemPrefsDoc.data();
            const theme = systemPreferences.theme || 'light';
            
            // Apply theme to body
            const body = document.body;
            
            // Remove existing theme classes
            body.classList.remove('light-theme', 'dark-theme');
            
            // Apply new theme
            if (theme === 'dark') {
                body.classList.add('dark-theme');
            } else if (theme === 'light') {
                body.classList.add('light-theme');
            } else if (theme === 'auto') {
                // Use system preference
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    body.classList.add('dark-theme');
                } else {
                    body.classList.add('light-theme');
                }
            }
        } else {
            // Default to light theme if no settings found
            document.body.classList.add('light-theme');
        }
    } catch (error) {
        console.error('Error applying theme:', error);
        // Default to light theme if error occurs
        document.body.classList.add('light-theme');
    }
}

// Initialize theme on DOM content loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyThemeOnLoad);
} else {
    applyThemeOnLoad();
}
