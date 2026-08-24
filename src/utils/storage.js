// Storage utilities for MarkMirror Mobile
// Handles localStorage operations and data persistence

export class Storage {
    constructor() {
        this.storageKey = 'markmirror-data';
        this.settingsKey = 'markmirror-settings';
    }

    // Save editor content
    saveContent(content) {
        try {
            localStorage.setItem(this.storageKey, content);
            return true;
        } catch (error) {
            console.error('Failed to save content:', error);
            return false;
        }
    }

    // Load editor content
    loadContent() {
        try {
            return localStorage.getItem(this.storageKey) || '';
        } catch (error) {
            console.error('Failed to load content:', error);
            return '';
        }
    }

    // Save settings
    saveSettings(settings) {
        try {
            localStorage.setItem(this.settingsKey, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    // Load settings
    loadSettings() {
        try {
            const settings = localStorage.getItem(this.settingsKey);
            return settings ? JSON.parse(settings) : this.getDefaultSettings();
        } catch (error) {
            console.error('Failed to load settings:', error);
            return this.getDefaultSettings();
        }
    }

    // Get default settings
    getDefaultSettings() {
        return {
            theme: 'dark', // 'light', 'dark', 'auto'
            autoComplete: true,
            syncScroll: true, // Enable by default for testing
            useExternalParser: false,
            embedStyles: true,
            previewZoom: 100,
            markdownHighlight: true // Enable Markdown highlighting in plain text
        };
    }

    // Clear all data
    clearAll() {
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.settingsKey);
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    }

    // Check if localStorage is available
    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
}
