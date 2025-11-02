/**
 * Focus Task Planner - Configuration
 * Contains app settings and constants
 */

// Default configuration
export const CONFIG = {
    // Max number of focused tasks per day
    maxFocusTasks: 6,

    // Auto-reset focus at midnight
    autoResetFocus: false,

    // Show swipe hints animation
    showSwipeHints: true,

    // Storage key for localStorage
    storageKey: 'focusTasks_v1',

    // Settings storage key
    settingsKey: 'focusSettings_v1',

    // Archive storage key
    archiveKey: 'focusArchive_v1'
};

// Load settings from localStorage
export function loadSettings() {
    try {
        const saved = localStorage.getItem(CONFIG.settingsKey);
        if (saved) {
            const settings = JSON.parse(saved);
            Object.assign(CONFIG, settings);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save settings to localStorage
export function saveSettings() {
    try {
        const settings = {
            maxFocusTasks: CONFIG.maxFocusTasks,
            autoResetFocus: CONFIG.autoResetFocus,
            showSwipeHints: CONFIG.showSwipeHints
        };
        localStorage.setItem(CONFIG.settingsKey, JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Initialize settings on load
loadSettings();