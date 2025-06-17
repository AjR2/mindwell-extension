// DOM elements
let visitsCountEl;
let timeSpentEl;
let topSitesList;
let statusEl;
let refreshBtn;
let scoreChartInstance;
let activityChartInstance;
let trackingToggle;
let settingsButton;
let actionButton;
let scoreValueEl;
let scoreLabelEl;
let recommendationText;
let themeSwitcher;
let scoreBreakdownBtn;
let scoreBreakdownModal;
let scoreBreakdownInstance; // Declare a global variable for the ScoreBreakdown instance
let settingsModal; // Add settings modal element
let pollingIntervalId = null;

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("[MindWell] DOM loaded");

  // Initialize DOM elements
  initializeElements();

  // Initialize charts
  initializeScoreChart();
  initializeActivityChart();

  // Load score breakdown content dynamically if it's not already handled by scoreBreakdown.js
  const scoreBreakdownContentEl = document.getElementById("score-breakdown-content");
  if (scoreBreakdownContentEl && window.ScoreBreakdown) {
    scoreBreakdownInstance = new window.ScoreBreakdown(); // Create the instance once
    scoreBreakdownContentEl.appendChild(scoreBreakdownInstance.getElement());
    // Initial update of breakdown data. It will be updated when opened.
    scoreBreakdownInstance.updateBreakdown();
  }

  // Set up event listeners
  setupEventListeners();

  // Load initial data
  loadBrowsingData();

  // Start polling for live updates every 5 seconds
  pollingIntervalId = setInterval(() => {
    loadBrowsingData();
  }, 5000);

  // Listen for data updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "dataUpdated") {
      console.log("[MindWell] Received data update:", message);
      updateUIWithData(message.browsingData);
    }
    return false;
  });

  // Load initial tracking state
  chrome.storage.local.get("settings", (data) => {
    if (trackingToggle) {
      trackingToggle.checked = data.settings?.isTracking !== false;
    }
  });
});

// Clear polling interval when popup is closed/unloaded
window.addEventListener("unload", () => {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
});

// Initialize DOM elements
function initializeElements() {
  scoreValueEl = document.getElementById("wellness-score-value");
  scoreLabelEl = document.getElementById("wellness-score-label");
  topSitesList = document.getElementById("top-sites");
  recommendationText = document.getElementById("recommendation-text");
  actionButton = document.getElementById("action-button");
  trackingToggle = document.getElementById("tracking-toggle");
  settingsButton = document.getElementById("settings-btn");
  statusEl = document.getElementById("status"); // Assuming a status element exists for messages
  themeSwitcher = document.getElementById("theme-switcher");
  scoreBreakdownBtn = document.getElementById("score-breakdown-btn");
  scoreBreakdownModal = document.getElementById("score-breakdown");
  settingsModal = document.getElementById("settings-modal");
  const closeScoreBreakdownBtn = document.getElementById("close-score-breakdown");
  const closeSettingsBtn = document.querySelector("#settings-modal .close-modal");

  // Log warnings for missing elements
  const elementsToCheck = {
    "wellness-score-value": scoreValueEl,
    "wellness-score-label": scoreLabelEl,
    "top-sites": topSitesList,
    "action-button": actionButton,
    "tracking-toggle": trackingToggle,
    "settings-btn": settingsButton,
    "theme-switcher": themeSwitcher,
    "score-breakdown-btn": scoreBreakdownBtn,
    "score-breakdown": scoreBreakdownModal,
    "settings-modal": settingsModal,
    "close-score-breakdown": closeScoreBreakdownBtn,
    "close-settings": closeSettingsBtn,
  };

  Object.entries(elementsToCheck).forEach(([name, element]) => {
    if (!element) {
      console.warn(`[MindWell] Element not found: ${name}`);
    }
  });
}

// Set up event listeners
function setupEventListeners() {
  if (trackingToggle) {
    trackingToggle.addEventListener("change", handleTrackingToggle);
  }

  if (settingsButton) {
    settingsButton.addEventListener("click", () => {
      settingsModal.classList.add("show");
      document.body.classList.add("modal-open");
    });
  }

  if (actionButton) {
    actionButton.addEventListener("click", handleActionButton);
  }

  if (themeSwitcher) {
    themeSwitcher.addEventListener("change", handleThemeSwitch);
  }

  if (scoreBreakdownBtn && scoreBreakdownModal) {
    scoreBreakdownBtn.addEventListener("click", () => {
      scoreBreakdownModal.classList.add("show");
      document.body.classList.add("modal-open");
      // Trigger update of breakdown data and show the content when modal is opened
      if (scoreBreakdownInstance) {
        scoreBreakdownInstance.updateBreakdown();
        scoreBreakdownInstance.show(); // Ensure the content inside the modal is displayed
      }
    });
  }

  const closeScoreBreakdownBtn = document.getElementById("close-score-breakdown");
  if (closeScoreBreakdownBtn && scoreBreakdownModal) {
    closeScoreBreakdownBtn.addEventListener("click", () => {
      scoreBreakdownModal.classList.remove("show");
      document.body.classList.remove("modal-open");
      if (scoreBreakdownInstance) {
        scoreBreakdownInstance.hide(); // Hide the content inside the modal when closing
      }
    });
  }

  const closeSettingsBtn = document.querySelector("#settings-modal .close-modal");
  if (closeSettingsBtn && settingsModal) {
    closeSettingsBtn.addEventListener("click", () => {
      settingsModal.classList.remove("show");
      document.body.classList.remove("modal-open");
    });
  }

  // Settings modal functionality
  const saveSettingsBtn = document.getElementById("save-settings");
  const resetStatsBtn = document.getElementById("reset-stats");

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", saveSettings);
  }

  if (resetStatsBtn) {
    resetStatsBtn.addEventListener("click", resetStatistics);
  }

  // Load settings when modal opens
  if (settingsButton && settingsModal) {
    settingsButton.addEventListener("click", () => {
      loadSettingsIntoModal();
      settingsModal.classList.add("show");
      document.body.classList.add("modal-open");
    });
  }

  // Close modals when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === scoreBreakdownModal) {
      scoreBreakdownModal.classList.remove("show");
      document.body.classList.remove("modal-open");
      if (scoreBreakdownInstance) {
        scoreBreakdownInstance.hide();
      }
    }
    if (event.target === settingsModal) {
      settingsModal.classList.remove("show");
      document.body.classList.remove("modal-open");
    }
  });
}

// Initialize the score chart (circular progress)
function initializeScoreChart() {
  const canvas = document.getElementById("wellness-score-chart");
  if (!canvas) {
    console.warn("[MindWell] Score chart canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");
  scoreChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [0, 100], // Initial score out of 100
          backgroundColor: ["#007AFF", "rgba(255,255,255,0.12)"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      cutout: "80%",
      rotation: -90,
      circumference: 180,
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
        },
      },
    },
  });
}

// Initialize the activity chart (pie chart)
function initializeActivityChart() {
  const canvas = document.getElementById("activity-chart");
  if (!canvas) {
    console.warn("[MindWell] Activity chart canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");
  activityChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [
            "#007AFF", // Apple Blue
            "#5AC8FA", // Light Blue
            "#34C759", // Apple Green
            "#FF9500", // Apple Orange
            "#AF52DE", // Apple Purple
            "#FF2D92", // Apple Pink
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}

// Update status message
function updateStatus(message, isError = false) {
  if (!statusEl) {
    console.log(`[MindWell] Status update (no element): ${message}`);
    return;
  }

  console.log(`[MindWell] ${isError ? "Error: " : ""}${message}`);
  statusEl.textContent = message;
  statusEl.className = isError ? "error" : "";

  // Clear status after 3 seconds if it's not an error
  if (!isError) {
    setTimeout(() => {
      if (statusEl && statusEl.textContent === message) {
        statusEl.textContent = "";
      }
    }, 3000);
  }
}

// Update the top sites list in the UI
function updateTopSitesList(domains) {
  if (!topSitesList) {
    console.warn("[MindWell] Top sites list element not found");
    return;
  }

  if (!domains || Object.keys(domains).length === 0) {
    topSitesList.innerHTML = "<li>No browsing data yet</li>";
    return;
  }

  // Sort domains by time spent (highest first)
  const sortedDomains = Object.entries(domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Show top 5

  // Clear and update the list
  topSitesList.innerHTML = "";

  sortedDomains.forEach(([domain, time], index) => {
    const li = document.createElement("li");
    li.className = "domain-item";
    const color = activityChartInstance.data.datasets[0].backgroundColor[index % activityChartInstance.data.datasets[0].backgroundColor.length];
    li.innerHTML = `
            <span class="domain-color" style="background-color: ${color}"></span>
            <span class="domain-name">${domain}</span>
            <span class="domain-time">${formatTime(time)}</span>
        `;
    topSitesList.appendChild(li);
  });
}

// Get label for wellness score
function getScoreLabel(score) {
  if (score === 0) return "No data available";
  if (score >= 80) return "Excellent Digital Well-being";
  if (score >= 60) return "Good Digital Well-being";
  if (score >= 40) return "Moderate Digital Well-being";
  if (score >= 20) return "Needs Attention";
  return "High Negative Impact";
}

// Update UI with browsing data
function updateUIWithData(browsingData) {
  console.log("[MindWell] updateUIWithData called with:", browsingData);
  console.log("[MindWell] Domains data:", browsingData.domains);
  if (!browsingData) {
    console.warn("[MindWell] No browsing data provided");
    return;
  }

  // Update wellness score
  if (scoreValueEl && scoreLabelEl) {
    const score = browsingData.wellnessScore?.score || 0;
    scoreValueEl.textContent = score;
    scoreLabelEl.textContent = getScoreLabel(score);
    updateWellnessScoreChart(score);
    updateTheme(score);
  }

  // Update stats grid (assuming elements exist with these IDs)
  document.getElementById("today-time").textContent = formatTime(browsingData.totalTimeSpent || 0);
  document.getElementById("daily-avg").textContent = formatTime(browsingData.dailyAverage || 0);
  document.getElementById("focus-time").textContent = formatTime(browsingData.focusTime || 0);
  document.getElementById("distractions").textContent = (browsingData.distractions || 0).toString();

  // Update activity chart and top sites
  updateActivityData(browsingData);

  // Update recommendation
  updateRecommendation(browsingData);
}

// Update wellness score chart display
function updateWellnessScoreChart(score) {
  if (!scoreChartInstance) {
    console.warn("[MindWell] Score chart not initialized");
    return;
  }

  const dataValue = score;
  const remaining = 100 - score;

  scoreChartInstance.data.datasets[0].data = [dataValue, remaining];

  let backgroundColor;
  if (score >= 80) {
    backgroundColor = ["#34C759", "rgba(255,255,255,0.12)"]; // Apple Green - Healthy
  } else if (score >= 60) {
    backgroundColor = ["#FF9500", "rgba(255,255,255,0.12)"]; // Apple Orange - Moderate
  } else {
    backgroundColor = ["#FF3B30", "rgba(255,255,255,0.12)"]; // Apple Red - Concerning
  }
  scoreChartInstance.data.datasets[0].backgroundColor = backgroundColor;

  scoreChartInstance.update();
}

// Update activity data
function updateActivityData(browsingData) {
  const domains = browsingData.domains || {};
  console.log("[MindWell] updateActivityData domains:", domains);
  if (!activityChartInstance) {
    console.warn("[MindWell] Activity chart not initialized");
    return;
  }

  if (!domains || Object.keys(domains).length === 0) {
    activityChartInstance.data.labels = ["No data"];
    activityChartInstance.data.datasets[0].data = [1];
    activityChartInstance.update();
    updateTopSitesList({}); // Clear top sites list
    return;
  }

  // Sort domains by time spent
  const sortedDomains = Object.entries(domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Show top 5 in chart and list

  activityChartInstance.data.labels = sortedDomains.map(([domain]) => domain);
  activityChartInstance.data.datasets[0].data = sortedDomains.map(([, time]) => time);
  activityChartInstance.update();

  updateTopSitesList(Object.fromEntries(sortedDomains));
}

// Update recommendation
function updateRecommendation(browsingData) {
  if (!actionButton) {
    console.warn("[MindWell] Action button not found");
    return;
  }

  // Get the first insight as recommendation
  const recommendation = browsingData.insights?.[0] || "Take a mindfulness break after browsing";
  // recommendationText.textContent = recommendation; // This element doesn't exist in popup.html anymore

  // Update action button based on recommendation
  if (recommendation.includes("mindfulness")) {
    actionButton.textContent = "Start Mindfulness Break";
  } else if (recommendation.includes("break")) {
    actionButton.textContent = "Take a Break";
  } else {
    actionButton.textContent = "Learn More";
  }
}

// Handle tracking toggle
function handleTrackingToggle(event) {
  const isTracking = event.target.checked;
  chrome.storage.local.get("settings", (data) => {
    const settings = data.settings || {};
    settings.isTracking = isTracking;
    chrome.storage.local.set({ settings }, () => {
      updateStatus(isTracking ? "Tracking enabled" : "Tracking paused");
    });
  });
}

// Open settings
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Handle action button
function handleActionButton() {
  chrome.tabs.create({ url: "https://www.akeyreu.com" });
}

// Load browsing data from the background script
async function loadBrowsingData() {
  try {
    updateStatus("Loading data...");
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "getBrowsingData" }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError });
          return;
        }
        console.log("Received response in popup:", response);
        resolve(response || { success: false, error: "No response" });
      });
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to load data");
    }

    updateUIWithData(response.browsingData);
    updateStatus("Data loaded");
  } catch (error) {
    console.error("Error in loadBrowsingData:", error);
    updateStatus("Error loading data: " + (error.message || "Unknown error"), true);
  }
}

// Format time in minutes to a human-readable string
function formatTime(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return `${hours}h ${remainingMinutes > 0 ? remainingMinutes + "m" : ""}`.trim();
}

// Handle theme switching
function handleThemeSwitch(event) {
  const theme = event.target.value;
  document.body.className = `theme-${theme}`;
}

// Update theme based on score
function updateTheme(score) {
  let theme = "healthy";
  if (score < 60 && score >= 30) {
    theme = "moderate";
  } else if (score < 30) {
    theme = "concerning";
  }
  document.body.className = `theme-${theme}`;
  if (themeSwitcher) {
    themeSwitcher.value = theme;
  }
}

// Settings functionality
async function loadSettingsIntoModal() {
  try {
    const data = await new Promise(resolve => {
      chrome.storage.local.get('settings', resolve);
    });

    const settings = data.settings || {};

    // Load values into form elements
    const dailyLimit = document.getElementById('daily-limit');
    const workStart = document.getElementById('work-start');
    const workEnd = document.getElementById('work-end');
    const enableNotifications = document.getElementById('enable-notifications');
    const notificationInterval = document.getElementById('notification-interval');
    const enableFocusMode = document.getElementById('enable-focus-mode');
    const focusDuration = document.getElementById('focus-duration');

    if (dailyLimit) dailyLimit.value = settings.dailyGoal || 120;
    if (workStart) workStart.value = settings.workStart || '09:00';
    if (workEnd) workEnd.value = settings.workEnd || '17:00';
    if (enableNotifications) enableNotifications.checked = settings.enableNotifications !== false;
    if (notificationInterval) notificationInterval.value = settings.notificationInterval || 60;
    if (enableFocusMode) enableFocusMode.checked = settings.enableFocusMode || false;
    if (focusDuration) focusDuration.value = settings.focusDuration || 25;

  } catch (error) {
    console.error('Error loading settings:', error);
    showNotification('Failed to load settings', 'error');
  }
}

async function saveSettings() {
  try {
    // Get values from form elements
    const dailyLimit = document.getElementById('daily-limit');
    const workStart = document.getElementById('work-start');
    const workEnd = document.getElementById('work-end');
    const enableNotifications = document.getElementById('enable-notifications');
    const notificationInterval = document.getElementById('notification-interval');
    const enableFocusMode = document.getElementById('enable-focus-mode');
    const focusDuration = document.getElementById('focus-duration');

    const settings = {
      dailyGoal: parseInt(dailyLimit?.value) || 120,
      workStart: workStart?.value || '09:00',
      workEnd: workEnd?.value || '17:00',
      enableNotifications: enableNotifications?.checked !== false,
      notificationInterval: parseInt(notificationInterval?.value) || 60,
      enableFocusMode: enableFocusMode?.checked || false,
      focusDuration: parseInt(focusDuration?.value) || 25,
      isTracking: true // Keep tracking enabled
    };

    await new Promise(resolve => {
      chrome.storage.local.set({ settings }, resolve);
    });

    showNotification('Settings saved successfully!', 'success');

    // Close modal after a short delay
    setTimeout(() => {
      settingsModal.classList.remove("show");
      document.body.classList.remove("modal-open");
    }, 1000);

  } catch (error) {
    console.error('Error saving settings:', error);
    showNotification('Failed to save settings', 'error');
  }
}

async function resetStatistics() {
  if (!confirm('Are you sure you want to reset all statistics? This action cannot be undone.')) {
    return;
  }

  try {
    // Clear browsing data but keep settings
    await new Promise(resolve => {
      chrome.storage.local.remove(['browsingData', 'stats'], resolve);
    });

    // Reinitialize with empty data
    const emptyData = {
      browsingData: {
        dailyStats: {},
        totalTime: 0,
        categories: {}
      },
      stats: {
        dailyUsage: 0,
        weeklyAverage: 0,
        focusTime: 0,
        distractions: 0,
        wellnessScore: 50,
        lastUpdated: new Date().toISOString()
      }
    };

    await new Promise(resolve => {
      chrome.storage.local.set(emptyData, resolve);
    });

    showNotification('Statistics reset successfully!', 'success');

    // Refresh the UI
    loadBrowsingData();

    // Close modal after a short delay
    setTimeout(() => {
      settingsModal.classList.remove("show");
      document.body.classList.remove("modal-open");
    }, 1000);

  } catch (error) {
    console.error('Error resetting statistics:', error);
    showNotification('Failed to reset statistics', 'error');
  }
}

// Notification system
function showNotification(message, type = 'info') {
  const notificationsContainer = document.getElementById('notifications');
  if (!notificationsContainer) return;

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span class="material-icons">${getNotificationIcon(type)}</span>
    <span>${message}</span>
    <button class="notification-close">&times;</button>
  `;

  notificationsContainer.appendChild(notification);

  // Show notification
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);

  // Auto-hide after 3 seconds
  setTimeout(() => {
    hideNotification(notification);
  }, 3000);

  // Close button functionality
  const closeBtn = notification.querySelector('.notification-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => hideNotification(notification));
  }
}

function hideNotification(notification) {
  notification.classList.remove('show');
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

function getNotificationIcon(type) {
  switch (type) {
    case 'success': return 'check_circle';
    case 'error': return 'error';
    case 'warning': return 'warning';
    default: return 'info';
  }
}