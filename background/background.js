// Simple background script for testing
console.log('[MindWell] Background script loaded');

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[MindWell] Extension installed');
  
  // Initialize storage with test data
  chrome.storage.local.set({
    test: 'Hello, MindWell!',
    timestamp: new Date().toISOString()
  });
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[MindWell] Message received:', message);
  
  if (message.type === 'test') {
    // Send a simple response
    const response = { 
      success: true, 
      message: 'Background script is working!',
      timestamp: new Date().toISOString()
    };
    console.log('[MindWell] Sending response:', response);
    sendResponse(response);
    return true; // Keep the message channel open for async response
  }
  
  // For any other message types
  return false;
});

// Log when the service worker starts
console.log('[MindWell] Service worker started');

// Track time spent in each category today
let categoryTimeSpent = {};

// Initialize category time spent
function initCategoryTimeSpent() {
  const defaultCategories = Object.keys(CATEGORY_WEIGHTS);
  const today = new Date().toDateString();
  
  chrome.storage.local.get(['categoryTimeSpent'], (result) => {
    const savedData = result.categoryTimeSpent || {};
    
    // Only reset if it's a new day
    if (!savedData.lastUpdated || savedData.lastUpdated !== today) {
      const newData = { lastUpdated: today };
      defaultCategories.forEach(cat => {
        newData[cat] = 0;
      });
      categoryTimeSpent = newData;
      chrome.storage.local.set({ categoryTimeSpent: newData });
    } else {
      categoryTimeSpent = savedData;
    }
  });
}

// Initialize on startup
initCategoryTimeSpent();

// Track tab activation and updates
chrome.tabs.onActivated.addListener(activeInfo => {
  updateActiveTab(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    updateActiveTab(tabId);
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('Message received:', message?.type, 'from:', sender.origin || 'extension', 'sender:', sender);
  
  // Handle different message types
  switch (message?.type) {
    case 'testConnection':
      debugLog('Test connection received from:', sender.url);
      if (typeof sendResponse === 'function') {
        sendResponse({
          status: 'connected',
          extensionId: chrome.runtime.id,
          timestamp: new Date().toISOString()
        });
      }
      return true; // Keep the message channel open for the response
    case 'recordActivity':
      recordVisit(
        message.hostname,
        message.duration,
        message.category,
        message.score,
        message.hostname
      );
      break;
      
    case 'categoryChange':
      if (sender.tab?.id) {
        updateActiveCategory(sender.tab.id, message.category, message.score);
      } else {
        debugLog('No tab ID in categoryChange message');
      }
      break;
      
    case 'getSettings':
      chrome.storage.local.get('settings', (data) => {
        sendResponse(data.settings || {});
      });
      return true; // Keep the message channel open for the async response
  }
  
  // Send a response if the message type wasn't handled above
  if (typeof sendResponse === 'function') {
    sendResponse({ status: 'received', type: message?.type });
  }
  
  return false; // Don't keep the message channel open
});

// Handle beacon data from content script (used during page unload)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method === 'POST' && details.url.endsWith('beacon')) {
      try {
        // For beacons, we need to parse the request body manually
        const decoder = new TextDecoder('utf-8');
        const body = decoder.decode(details.requestBody.raw[0].bytes);
        const data = JSON.parse(body);
        
        if (data.type === 'finalCategoryVisit') {
          // Calculate time spent based on the timestamp
          const timeSpent = Math.floor((Date.now() - (data.timestamp || Date.now())) / 1000);
          recordCategoryVisit(
            data.category,
            data.score,
            timeSpent,
            data.hostname
          );
        }
      } catch (error) {
        console.error('Error processing beacon data:', error);
      }
      
      return { cancel: true }; // Prevent the actual request
    }
  },
  { urls: ['*://*/*'] }, // Match all URLs
  ['requestBody']
);

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getSettings') {
    chrome.storage.local.get('settings', (data) => {
      sendResponse(data.settings || {});
    });
    return true; // Required for async response
  } else if (message.type === 'updateSettings') {
    chrome.storage.local.set({ settings: message.settings }, () => {
      sendResponse({ success: true });
    });
    return true; // Required for async response
  } else if (message.type === 'getStats') {
    chrome.storage.local.get('stats', (data) => {
      sendResponse(data.stats || {});
    });
    return true; // Required for async response
  } else if (message.type === 'resetStats') {
    const defaultStats = {
      dailyUsage: 0,
      weeklyAverage: 0,
      focusTime: 0,
      distractions: 0,
      lastUpdated: new Date().toISOString()
    };
    chrome.storage.local.set({ stats: defaultStats }, () => {
      sendResponse({ success: true });
    });
    return true; // Required for async response
  }
});

// Update active category for a tab
function updateActiveCategory(tabId, category, score) {
  activeCategories.set(tabId, { category, score, lastUpdate: Date.now() });
}

// Record time spent in a category
async function recordCategoryVisit(category, score, timeSpent, hostname) {
  try {
    const today = new Date().toDateString();
    
    // Update category time spent
    if (!categoryTimeSpent[category]) {
      categoryTimeSpent[category] = 0;
    }
    categoryTimeSpent[category] += timeSpent;
    categoryTimeSpent.lastUpdated = today;
    
    // Save to storage
    await chrome.storage.local.set({ categoryTimeSpent });
    
    // Update wellness score
    await updateWellnessScore();
    
    console.log(`Recorded ${timeSpent}s in ${category} (${hostname})`);
  } catch (error) {
    console.error('Error recording category visit:', error);
  }
}

// Calculate wellness score based on time spent in each category
async function updateWellnessScore() {
  try {
    const data = await chrome.storage.local.get(['stats', 'categoryTimeSpent']);
    const stats = data.stats || {};
    const categoryData = data.categoryTimeSpent || {};
    
    let totalWeightedTime = 0;
    let totalTrackedTime = 0;
    let hasTrackedTime = false;
    
    // Calculate weighted time based on category scores
    for (const [category, time] of Object.entries(categoryData)) {
      if (category !== 'lastUpdated' && CATEGORY_WEIGHTS[category] !== undefined) {
        totalWeightedTime += time * (CATEGORY_WEIGHTS[category] || 0.5);
        totalTrackedTime += time;
        if (time > 0) hasTrackedTime = true;
      }
    }
    
    // If no tracked time, return default score of 100
    if (!hasTrackedTime) {
      const defaultScore = 100;
      stats.wellnessScore = defaultScore;
      stats.lastUpdated = new Date().toISOString();
      await chrome.storage.local.set({ stats });
      safeSendMessage({
        type: 'wellnessScoreUpdated',
        score: defaultScore
      });
      return defaultScore;
    }
    
    // Calculate score (0-100)
    const rawScore = (totalWeightedTime / totalTrackedTime) * 100;
    
    // Apply time-based adjustments (penalize excessive screen time)
    const dailyUsageMinutes = stats.dailyUsage || 0;
    const dailyGoal = (await chrome.storage.local.get('settings')).settings?.dailyGoal || 120;
    
    // Reduce score if over daily goal (up to 20% reduction)
    const timePenalty = Math.min(20, Math.max(0, (dailyUsageMinutes - dailyGoal) / dailyGoal * 40));
    const finalScore = Math.max(0, Math.min(100, rawScore - timePenalty));
    
    // Update stats
    stats.wellnessScore = Math.round(finalScore);
    stats.lastUpdated = new Date().toISOString();
    
    await chrome.storage.local.set({ stats });
    
    // Notify popup of score update (if popup is open)
    safeSendMessage({ 
      type: 'wellnessScoreUpdated', 
      score: stats.wellnessScore 
    });
    
    return stats.wellnessScore;
  } catch (error) {
    console.error('Error updating wellness score:', error);
    return 100; // Default to 100 on error
  }
}

// Handle beacon data from content script (used during page unload)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method === 'POST' && details.url.endsWith('beacon')) {
      try {
        // For beacons, we need to parse the request body manually
        const decoder = new TextDecoder('utf-8');
        const body = decoder.decode(details.requestBody.raw[0].bytes);
        const data = JSON.parse(body);
        
        if (data.type === 'finalCategoryVisit') {
          // Calculate time spent based on the timestamp
          const timeSpent = Math.floor((Date.now() - (data.timestamp || Date.now())) / 1000);
          recordCategoryVisit(
            data.category,
            data.score,
            timeSpent,
            data.hostname
          );
        }
      } catch (error) {
        console.error('Error processing beacon data:', error);
      }
      
      return { cancel: true }; // Prevent the actual request
    }
  },
  { urls: ['*://*/*'] }, // Match all URLs
  ['requestBody']
);

// Handle beacon data from content script (used during page unload)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method === 'POST' && details.url.includes('content/beacon')) {
      try {
        // Parse the form data from the request body
        const formData = new URLSearchParams(
          String.fromCharCode.apply(null, new Uint8Array(details.requestBody.raw[0].bytes))
        );
        
        const hostname = formData.get('hostname');
        const category = formData.get('category');
        const score = parseFloat(formData.get('score'));
        const timeSpent = parseInt(formData.get('timeSpent'), 10);
        
        if (hostname && !isNaN(timeSpent) && category) {
          recordCategoryVisit(category, score, timeSpent, hostname);
        }
      } catch (error) {
        console.error('Error processing beacon data:', error);
      }
      
      return { cancel: true }; // Prevent the actual request
    }
  },
  { urls: ['*://*/*'] }, // Match all URLs
  ['requestBody']
);

async function updateActiveTab(tabId) {
  if (activeTab) {
    // Record time spent on previous tab
    const endTime = Date.now();
    const timeSpent = Math.floor((endTime - startTime) / 1000); // in seconds
    
    if (timeSpent > 5) { // Ignore very short visits
      try {
        const tab = await chrome.tabs.get(activeTab.id);
        if (tab && tab.url) {
          const domain = new URL(tab.url).hostname;
          await recordVisit(domain, timeSpent);
        }
      } catch (error) {
        console.error('Error updating active tab:', error);
      }
    }
  }
  
  // Update active tab
  activeTab = { id: tabId, startTime: Date.now() };
  startTime = Date.now();
  
  // Notify content script about the tab change
  try {
    chrome.tabs.sendMessage(tabId, { type: 'tabActivated' }, (response) => {
      if (chrome.runtime.lastError) {
        // Tab might not have a content script, which is fine
        console.debug('No content script in tab:', tabId, chrome.runtime.lastError);
      }
    });
  } catch (error) {
    console.debug('Error sending tab activation message:', error);
  }
}

async function recordVisit(domain, duration) {
  try {
    const today = new Date().toDateString();
    const data = await chrome.storage.local.get(['browsingData', 'settings']);
    const browsingData = data.browsingData || {};
    const settings = data.settings || {};
    
    // Initialize today's data if it doesn't exist
    if (!browsingData[today]) {
      browsingData[today] = { 
        sites: {}, 
        totalTime: 0,
        focusTime: 0,
        distractions: 0
      };
    }
    
    // Initialize domain data if it doesn't exist
    if (!browsingData[today].sites[domain]) {
      browsingData[today].sites[domain] = 0;
    }
    
    // Update time spent
    browsingData[today].sites[domain] += duration;
    browsingData[today].totalTime += duration;
    
    // Update stats
    const stats = await updateStats(browsingData[today]);
    
    // Save updated data
    await chrome.storage.local.set({ 
      browsingData,
      stats
    });
    
    // Notify popup about the update
    chrome.runtime.sendMessage({ type: 'statsUpdated' });
    
  } catch (error) {
    console.error('Error recording visit:', error);
  }
}

async function updateStats(dailyData) {
  const today = new Date().toDateString();
  const data = await chrome.storage.local.get(['browsingData', 'stats']);
  const browsingData = data.browsingData || {};
  const stats = data.stats || {
    dailyUsage: 0,
    weeklyAverage: 0,
    focusTime: 0,
    distractions: 0,
    lastUpdated: new Date().toISOString()
  };
  
  // Update daily usage (in minutes)
  stats.dailyUsage = Math.floor((dailyData?.totalTime || 0) / 60);
  
  // Calculate weekly average
  let totalTime = 0;
  let dayCount = 0;
  
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();
    
    if (browsingData[dateStr]?.totalTime) {
      totalTime += browsingData[dateStr].totalTime;
      dayCount++;
    }
  }
  
  stats.weeklyAverage = dayCount > 0 ? Math.floor((totalTime / dayCount) / 60) : 0;
  stats.lastUpdated = new Date().toISOString();
  
  return stats;
}

// Set up alarms for periodic tasks
chrome.alarms.create('updateStats', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateStats') {
    // Update stats periodically
    chrome.storage.local.get('browsingData', (data) => {
      const today = new Date().toDateString();
      if (data.browsingData?.[today]) {
        updateStats(data.browsingData[today]);
      }
    });
    
    // Check for notifications
    checkForNotifications();
  }
});

async function checkForNotifications() {
  const data = await chrome.storage.local.get(['settings', 'stats']);
  const settings = data.settings || {};
  const stats = data.stats || {};
  
  if (!settings.notifications?.enabled) return;
  
  // Check if we should show a notification based on usage
  if (stats.dailyUsage >= settings.dailyGoal) {
    showNotification(
      'Daily Limit Reached',
      `You've reached your daily limit of ${settings.dailyGoal} minutes of screen time.`
    );
  }
  // Add more notification checks as needed
}

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'assets/icons/icon128.png',
    title: title,
    message: message
  });
}
