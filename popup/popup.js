// Import the ScoreBreakdown class
const { ScoreBreakdown } = window.ScoreBreakdown || {};

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const scoreElement = document.getElementById('score');
  const scoreDescription = document.getElementById('score-description');
  const todayTimeElement = document.getElementById('today-time');
  const dailyAvgElement = document.getElementById('daily-avg');
  const focusTimeElement = document.getElementById('focus-time');
  const distractionsElement = document.getElementById('distractions');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeModalBtn = document.querySelector('.close-modal');
  const saveSettingsBtn = document.getElementById('save-settings');
  const resetStatsBtn = document.getElementById('reset-stats');
  const takeBreakBtn = document.getElementById('take-break');
  const focusModeBtn = document.getElementById('focus-mode');
  const scoreBreakdownBtn = document.createElement('button');
  scoreBreakdownBtn.id = 'score-breakdown-btn';
  scoreBreakdownBtn.className = 'icon-btn';
  scoreBreakdownBtn.title = 'View Score Breakdown';
  scoreBreakdownBtn.innerHTML = '<span class="material-icons">insights</span>';
  
  // THEME SWITCHER LOGIC
  const themeSwitcher = document.getElementById('theme-switcher');
  const body = document.body;
  const themeMap = {
    healthy: 'theme-healthy',
    moderate: 'theme-moderate',
    concerning: 'theme-concerning'
  };
  // Load theme from localStorage
  const savedTheme = localStorage.getItem('mindwell-theme');
  if (savedTheme && themeMap[savedTheme]) {
    body.classList.remove('theme-healthy', 'theme-moderate', 'theme-concerning');
    body.classList.add(themeMap[savedTheme]);
    if (themeSwitcher) themeSwitcher.value = savedTheme;
  }
  
  // Insert the score breakdown button next to the settings button
  settingsBtn.parentNode.insertBefore(scoreBreakdownBtn, settingsBtn.nextSibling);
  
  // Initialize ScoreBreakdown component
  const scoreBreakdownModal = document.getElementById('score-breakdown');
  const scoreBreakdownContent = document.getElementById('score-breakdown-content');
  let scoreBreakdownComponent;
  
  if (ScoreBreakdown) {
    scoreBreakdownComponent = new ScoreBreakdown();
    scoreBreakdownContent.appendChild(scoreBreakdownComponent.getElement());
  }
  
  // Default settings
  const defaultSettings = {
    dailyLimit: 120, // minutes
    workHours: { start: '09:00', end: '17:00' },
    notifications: {
      enabled: true,
      interval: 60 // minutes
    },
    focusMode: {
      enabled: false,
      duration: 25 // minutes
    },
    blacklist: []
  };
  
  // State
  let settings = { ...defaultSettings };
  let stats = {
    dailyUsage: 0, // in minutes
    weeklyAverage: 0, // in minutes
    focusTime: 0, // in minutes
    distractions: 0,
    lastUpdated: new Date().toISOString()
  };
  
  // Initialize the popup
  async function init() {
    await loadData();
    updateUI();
    setupEventListeners();
    startUsageTracking();
  }
  
  // Load data from storage
  async function loadData() {
    try {
      const data = await chrome.storage.local.get(['settings', 'stats']);
      settings = { ...defaultSettings, ...(data.settings || {}) };
      
      // Initialize stats with default values if they don't exist
      const defaultStats = {
        dailyUsage: 0,
        weeklyAverage: 0,
        focusTime: 0,
        distractions: 0,
        wellnessScore: 100, // Default wellness score
        lastUpdated: new Date().toISOString()
      };
      
      // Merge with existing stats, ensuring we have all required fields
      stats = { ...defaultStats, ...(data.stats || {}) };
      
      // Ensure wellnessScore is set (in case it was missing in storage)
      if (typeof stats.wellnessScore !== 'number') {
        stats.wellnessScore = 100;
        // Save the updated stats back to storage
        await chrome.storage.local.set({ stats });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('Error loading data', 'error');
    }
  }
  
  // Save data to storage
  async function saveData() {
    try {
      await chrome.storage.local.set({ settings, stats });
    } catch (error) {
      console.error('Error saving data:', error);
      showNotification('Error saving data', 'error');
    }
  }
  
  // Update the UI with current data
  function updateUI() {
    // Update score
    const score = calculateWellnessScore();
    scoreElement.textContent = score;
    updateScoreDescription(score);
    
    // Update stats
    todayTimeElement.textContent = `${Math.floor(stats.dailyUsage)}m`;
    dailyAvgElement.textContent = `${Math.floor(stats.weeklyAverage)}m`;
    focusTimeElement.textContent = `${Math.floor(stats.focusTime)}m`;
    distractionsElement.textContent = stats.distractions;
    
    // Update UI based on focus mode
    updateFocusModeUI();
  }
  
  // Calculate wellness score (0-100)
  function calculateWellnessScore() {
    // If we have a stored wellness score, use it
    if (typeof stats.wellnessScore === 'number') {
      return stats.wellnessScore;
    }
    
    // Fallback calculation if no score is stored
    const dailyGoal = settings.dailyLimit * 60; // in seconds
    const usageRatio = Math.min(stats.dailyUsage / dailyGoal, 1);
    const focusRatio = stats.focusTime / (stats.focusTime + stats.distractions || 1);
    
    // Weighted score (70% usage, 30% focus)
    const score = 100 - (usageRatio * 70) + (focusRatio * 30);
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  // Update score description based on value
  function updateScoreDescription(score) {
    let description = '';
    let emoji = '😊';
    
    if (score >= 80) {
      description = 'Excellent! You\'re doing great with your digital wellness.';
      emoji = '🌟';
    } else if (score >= 60) {
      description = 'Good job! You\'re maintaining a healthy balance.';
      emoji = '👍';
    } else if (score >= 40) {
      description = 'Not bad, but there\'s room for improvement.';
      emoji = '🤔';
    } else {
      description = 'Consider taking a break and reducing screen time.';
      emoji = '💡';
    }
    
    scoreDescription.textContent = `${emoji} ${description}`;
  }
  
  // Start tracking usage
  function startUsageTracking() {
    // Track active tab changes
    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    
    // Track idle state
    chrome.idle.onStateChanged.addListener(handleIdleStateChange);
    
    // Setup alarms
    setupAlarms();
    
    // Initial update
    updateUsageStats();
  }
  
  // Handle tab activation
  async function handleTabActivated(activeInfo) {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      trackTabUsage(tab);
    }
  }
  
  // Handle tab updates
  function handleTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.active) {
      trackTabUsage(tab);
    }
  }
  
  // Track tab usage
  function trackTabUsage(tab) {
    const url = new URL(tab.url);
    const domain = url.hostname;
    
    // Check if domain is blacklisted
    if (settings.blacklist.includes(domain)) {
      showNotification(`You're on a blacklisted site: ${domain}`, 'warning');
    }
    
    // Update usage stats
    updateUsageStats();
  }
  
  // Update usage statistics
  async function updateUsageStats() {
    try {
      const usage = await chrome.storage.local.get('usage');
      const today = new Date().toDateString();
      
      if (usage[today]) {
        stats.dailyUsage = usage[today].total || 0;
        stats.focusTime = usage[today].focusTime || 0;
        stats.distractions = usage[today].distractions || 0;
        
        // Calculate weekly average
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        
        let totalUsage = 0;
        let dayCount = 0;
        
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toDateString();
          
          if (usage[dateStr]) {
            totalUsage += usage[dateStr].total || 0;
            dayCount++;
          }
        }
        
        stats.weeklyAverage = dayCount > 0 ? totalUsage / dayCount : 0;
        stats.lastUpdated = new Date().toISOString();
        
        // Save updated stats
        await saveData();
        updateUI();
      }
    } catch (error) {
      console.error('Error updating usage stats:', error);
    }
  }
  
  // Handle idle state changes
  function handleIdleStateChange(newState) {
    if (newState === 'idle') {
      // Pause tracking when user is idle
      console.log('User is idle, pausing tracking');
    } else if (newState === 'active') {
      // Resume tracking when user is back
      console.log('User is active, resuming tracking');
      updateUsageStats();
    }
  }
  
  // Setup alarms for periodic updates
  function setupAlarms() {
    // Clear any existing alarms
    chrome.alarms.clearAll();
    
    // Create a new alarm that triggers every minute
    chrome.alarms.create('usageUpdate', {
      periodInMinutes: 1
    });
    
    // Listen for alarm triggers
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'usageUpdate') {
        updateUsageStats();
      }
    });
  }
  
  // Show a notification
  function showNotification(message, type = 'info') {
    if (!settings.notifications.enabled) return;
    
    const notificationsContainer = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <span class="material-icons">${getNotificationIcon(type)}</span>
      <div class="notification-content">${message}</div>
      <button class="notification-close">&times;</button>
    `;
    
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      notification.style.animation = 'fadeOut 0.3s forwards';
      setTimeout(() => notification.remove(), 300);
    });
    
    notificationsContainer.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }
  
  // Get notification icon based on type
  function getNotificationIcon(type) {
    const icons = {
      info: 'info',
      success: 'check_circle',
      warning: 'warning',
      error: 'error'
    };
    return icons[type] || 'info';
  }
  
  // Toggle focus mode
  function toggleFocusMode() {
    settings.focusMode.enabled = !settings.focusMode.enabled;
    
    if (settings.focusMode.enabled) {
      // Start focus mode
      showNotification(`Focus mode activated for ${settings.focusMode.duration} minutes`, 'success');
      
      // Set focus mode timeout
      setTimeout(() => {
        if (settings.focusMode.enabled) {
          settings.focusMode.enabled = false;
          showNotification('Focus mode has ended. Take a break!', 'info');
          updateFocusModeUI();
        }
      }, settings.focusMode.duration * 60 * 1000);
    } else {
      // End focus mode
      showNotification('Focus mode deactivated', 'info');
    }
    
    updateFocusModeUI();
    saveData();
  }
  
  // Update focus mode UI
  function updateFocusModeUI() {
    if (settings.focusMode.enabled) {
      focusModeBtn.innerHTML = `
        <span class="material-icons">timer_off</span>
        End Focus Mode
      `;
      focusModeBtn.classList.add('active');
    } else {
      focusModeBtn.innerHTML = `
        <span class="material-icons">timer</span>
        Focus Mode
      `;
      focusModeBtn.classList.remove('active');
    }
  }
  
  // Open settings modal
  function openSettings() {
    // Populate form with current settings
    document.getElementById('daily-limit').value = settings.dailyLimit;
    document.getElementById('work-start').value = settings.workHours.start;
    document.getElementById('work-end').value = settings.workHours.end;
    document.getElementById('enable-notifications').checked = settings.notifications.enabled;
    document.getElementById('notification-interval').value = settings.notifications.interval;
    document.getElementById('enable-focus-mode').checked = settings.focusMode.enabled;
    document.getElementById('focus-duration').value = settings.focusMode.duration;
    
    // Show modal
    settingsModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  
  // Close settings modal
  function closeSettings() {
    settingsModal.classList.remove('show');
    document.body.style.overflow = '';
  }
  
  // Save settings
  async function saveSettings() {
    // Get values from form
    settings.dailyLimit = parseInt(document.getElementById('daily-limit').value) || 120;
    settings.workHours = {
      start: document.getElementById('work-start').value || '09:00',
      end: document.getElementById('work-end').value || '17:00'
    };
    settings.notifications = {
      enabled: document.getElementById('enable-notifications').checked,
      interval: parseInt(document.getElementById('notification-interval').value) || 60
    };
    settings.focusMode = {
      enabled: document.getElementById('enable-focus-mode').checked,
      duration: parseInt(document.getElementById('focus-duration').value) || 25
    };
    
    // Save to storage
    await saveData();
    
    // Update UI
    updateUI();
    showNotification('Settings saved successfully', 'success');
    
    // Close modal
    closeSettings();
  }
  
  // Reset statistics
  async function resetStatistics() {
    if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
      stats = {
        dailyUsage: 0,
        weeklyAverage: 0,
        focusTime: 0,
        distractions: 0,
        lastUpdated: new Date().toISOString()
      };
      
      await chrome.storage.local.set({ stats });
      updateUI();
      showNotification('Statistics have been reset', 'success');
    }
  }
  
  // Setup event listeners
  function setupEventListeners() {
    // Settings button
    settingsBtn.addEventListener('click', openSettings);
    closeModalBtn.addEventListener('click', closeSettings);
    saveSettingsBtn.addEventListener('click', saveSettings);
    resetStatsBtn.addEventListener('click', resetStatistics);
    
    // Score breakdown button
    if (scoreBreakdownBtn && scoreBreakdownModal) {
      scoreBreakdownBtn.addEventListener('click', () => {
        scoreBreakdownModal.style.display = 'block';
        if (scoreBreakdownComponent) {
          scoreBreakdownComponent.show();
        }
      });
      
      // Close score breakdown when clicking the close button
      const closeScoreBreakdown = document.getElementById('close-score-breakdown');
      if (closeScoreBreakdown) {
        closeScoreBreakdown.addEventListener('click', () => {
          scoreBreakdownModal.style.display = 'none';
        });
      }
      
      // Close when clicking outside
      window.addEventListener('click', (e) => {
        if (e.target === scoreBreakdownModal) {
          scoreBreakdownModal.style.display = 'none';
        }
      });
    }
    
    takeBreakBtn.addEventListener('click', () => {
      showNotification('Taking a short break can help refresh your mind!', 'info');
      // TODO: Implement break functionality
    });
    
    focusModeBtn.addEventListener('click', toggleFocusMode);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        closeSettings();
      }
    });
    
    // Listen for keyboard events
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!settingsModal.classList.contains('hidden')) {
          closeSettings();
        }
        if (scoreBreakdownModal.style.display === 'block') {
          scoreBreakdownModal.style.display = 'none';
        }
      }
    });
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'statsUpdated') {
        updateUI();
        // Update score breakdown if it's visible
        if (scoreBreakdownComponent && scoreBreakdownModal.style.display === 'block') {
          scoreBreakdownComponent.updateBreakdown();
        }
      } else if (message.type === 'focusModeToggled') {
        updateFocusModeUI();
      }
    });

    // THEME SWITCHER EVENT LISTENER
    if (themeSwitcher) {
      themeSwitcher.addEventListener('change', (e) => {
        const selected = e.target.value;
        body.classList.remove('theme-healthy', 'theme-moderate', 'theme-concerning');
        body.classList.add(themeMap[selected]);
        localStorage.setItem('mindwell-theme', selected);
      });
    }
  }
  
  // Initialize the app
  init();
  
  // Listen for messages from background script or content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'notification') {
      showNotification(message.text, message.level || 'info');
    }
    
    // Return true to indicate we want to send a response asynchronously
    return true;
  });
}); // Close the DOMContentLoaded event listener