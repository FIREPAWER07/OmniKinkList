// Local storage management
const storage = {
    // Save preferences to localStorage
    savePreferences: function(preferences) {
        localStorage.setItem('kinklist-preferences', JSON.stringify(preferences));
    },

    // Load preferences from localStorage
    loadPreferences: function() {
        const saved = localStorage.getItem('kinklist-preferences');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.error('Failed to load preferences:', error);
                return {};
            }
        }
        return {};
    },

    // Clear all preferences
    clearPreferences: function() {
        localStorage.removeItem('kinklist-preferences');
    },

    // Save theme preference
    saveTheme: function(theme) {
        localStorage.setItem('theme', theme);
    },

    // Load theme preference
    loadTheme: function() {
        return localStorage.getItem('theme');
    }
};