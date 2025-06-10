// DOM elements
const trackingToggle = document.getElementById('trackingToggle');
const breakRemindersToggle = document.getElementById('breakRemindersToggle');
const saveButton = document.getElementById('saveButton');
const statusDiv = document.getElementById('status');

// Load saved settings
function loadSettings() {
    chrome.storage.local.get('settings', (data) => {
        const settings = data.settings || {};
        trackingToggle.checked = settings.isTracking !== false; // Default to true
        breakRemindersToggle.checked = settings.breakReminders !== false; // Default to true
    });
}

// Save settings
function saveSettings() {
    const settings = {
        isTracking: trackingToggle.checked,
        breakReminders: breakRemindersToggle.checked
    };

    chrome.storage.local.set({ settings }, () => {
        showStatus('Settings saved successfully!', 'success');
    });
}

// Show status message
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    // Hide status after 3 seconds
    setTimeout(() => {
        statusDiv.className = 'status';
    }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', loadSettings);
saveButton.addEventListener('click', saveSettings);

// Listen for changes in tracking toggle
trackingToggle.addEventListener('change', () => {
    if (!trackingToggle.checked) {
        showStatus('Tracking disabled. Some features may not work properly.', 'error');
    }
}); 