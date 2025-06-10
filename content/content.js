// Content script for MindWell extension - Minimal Debug Version
console.log('[MindWell] Content script loading...');

// Basic extension context check
function isExtensionContextValid() {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (e) {
    console.error('[MindWell] Context check failed:', e);
    return false;
  }
}

// Basic message handler
function handleMessage(message, sender, sendResponse) {
  if (!message || typeof message !== 'object' || !message.type) {
    console.error('[MindWell] Invalid message format:', message);
    return false;
  }

  console.log('[MindWell] Received message:', message.type, 'from:', sender.id || 'unknown');
  
  if (message.type === 'getActiveTabInfo') {
    try {
      const response = {
        url: window.location.href,
        hostname: window.location.hostname,
        title: document.title,
        timestamp: new Date().toISOString()
      };
      console.log('[MindWell] Sending tab info:', response);
      sendResponse(response);
    } catch (e) {
      console.error('[MindWell] Error getting tab info:', e);
      sendResponse({ error: e.message });
    }
    return true;
  }
  
  return false;
}

// Initialize content script
function init() {
  console.log('[MindWell] Initializing content script...');
  
  if (!isExtensionContextValid()) {
    console.error('[MindWell] Extension context is not valid');
    return;
  }
  
  console.log('[MindWell] Extension context is valid, ID:', chrome.runtime.id);
  
  // Set up message listener
  try {
    chrome.runtime.onMessage.addListener(handleMessage);
    console.log('[MindWell] Message listener registered');
  } catch (e) {
    console.error('[MindWell] Failed to add message listener:', e);
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Website categories and their impact on wellness score (0-1, where 1 is most positive)
const WEBSITE_CATEGORIES = {
  // Productive categories (positive impact)
  'educational': { score: 0.9, keywords: ['coursera', 'edx', 'khanacademy', 'udemy', 'codecademy', 'udacity', 'pluralsight', 'academia.edu', 'researchgate', 'jstor'] },
  'professional': { score: 0.8, keywords: ['linkedin', 'github', 'stackoverflow', 'gitlab', 'bitbucket', 'atlassian', 'notion.so', 'trello', 'asana'] },
  'health': { score: 0.7, keywords: ['myfitnesspal', 'headspace', 'calm', 'noom', 'fitbit', 'strava', 'runkeeper', 'webmd', 'healthline', 'mayoclinic'] },
  'news': { score: 0.5, keywords: ['bbc', 'reuters', 'apnews', 'npr', 'theguardian', 'nytimes', 'washingtonpost', 'wsj'] },
  
  // Neutral categories (neutral impact)
  'search': { score: 0.5, keywords: ['google.com/search', 'bing.com/search', 'duckduckgo.com', 'startpage.com'] },
  'reference': { score: 0.5, keywords: ['wikipedia.org', 'wiktionary.org', 'wikimedia.org', 'britannica.com'] },
  'email': { score: 0.5, keywords: ['mail.google', 'outlook.live', 'outlook.office', 'mail.yahoo', 'protonmail'] },
  
  // Distracting categories (negative impact)
  'social': { score: 0.3, keywords: ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'pinterest.com', 'reddit.com', 'tumblr.com'] },
  'entertainment': { score: 0.3, keywords: ['youtube.com', 'netflix.com', 'hulu.com', 'disneyplus.com', 'hbomax.com', 'twitch.tv'] },
  'gaming': { score: 0.2, keywords: ['steampowered.com', 'epicgames.com', 'xbox.com', 'playstation.com', 'roblox.com', 'minecraft.net'] },
  'shopping': { score: 0.2, keywords: ['amazon.com', 'ebay.com', 'etsy.com', 'walmart.com', 'bestbuy.com', 'target.com'] },
  'adult': { score: 0.1, keywords: ['pornhub', 'xvideos', 'xhamster', 'onlyfans', 'brazzers'] },
  'gambling': { score: 0.1, keywords: ['poker', 'casino', 'bet365', 'draftkings', 'fanduel', '888poker'] },
  
  // Default category if none match
  'other': { score: 0.5, keywords: [] }
};

// Track time spent on the current page
let startTime = Date.now();
let isActive = true;
let currentCategory = 'other';

// Function to categorize the current website
async function categorizeWebsite() {
  try {
    const domain = window.location.hostname;
    const isBlacklistedSite = await isBlacklisted(domain);
    
    if (isBlacklistedSite) {
      return {
        category: 'blacklisted',
        score: 0,
        reason: 'This site is on your blacklist'
      };
  }
  
    const response = await chrome.runtime.sendMessage({
      type: 'CATEGORIZE_DOMAIN',
      domain: domain
    });
    
    return response || {
      category: 'neutral',
      score: 3,
      reason: 'Unable to categorize site'
    };
  } catch (error) {
    console.warn('Error categorizing website:', error);
    // Return neutral category if we can't categorize the site
    return {
      category: 'neutral',
      score: 3,
      reason: 'Error categorizing site'
    };
  }
}

// Check if the extension context is still valid
function isExtensionContextValid() {
  try {
    // Simple check to see if chrome.runtime is still available
    return chrome && chrome.runtime && chrome.runtime.id !== undefined;
  } catch (e) {
    return false;
  }
}

// Check if domain is in user's blacklist
// Returns a promise that resolves to a boolean
async function isBlacklisted(domain) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_BLACKLIST',
      domain: domain
    });
    return response?.isBlacklisted || false;
  } catch (error) {
    console.warn('Error checking blacklist:', error);
    // If we can't check the blacklist, assume the site is not blacklisted
    // This prevents blocking legitimate sites when the extension context is invalid
    return false;
      }
}

// Track category time spent
let categoryTimeStart = Date.now();
let currentCategoryData = { category: 'other', score: 0.5 };

// Initialize the current category
updateCurrentCategory().catch(e => {
  console.debug('Error in initial category update:', e);
});

// Listen for visibility changes
document.addEventListener('visibilitychange', handleVisibilityChange);

// Update the current category based on the current URL
async function updateCurrentCategory() {
  try {
    const category = await categorizeWebsite();
    currentCategory = category;
    
    // Update the UI with the new category
    updateCategoryUI(category);
    
    // Start tracking time for this category
    startTimeTracking();
  } catch (error) {
    console.warn('Error updating category:', error);
    // Set a default category if we can't get the real one
    currentCategory = {
      category: 'neutral',
      score: 3,
      reason: 'Error updating category'
    };
    updateCategoryUI(currentCategory);
  }
}

// Handle page visibility changes
function handleVisibilityChange() {
  if (document.hidden) {
    stopTimeTracking();
  } else {
    updateCurrentCategory().catch(error => {
      console.warn('Error in handleVisibilityChange:', error);
    });
  }
}

// Track the last known active tab state
let lastActiveState = {
  isActive: true,
  lastUpdate: Date.now()
};

// Function to send activity data to the background script
function sendActivityData() {
  if (!isActive) return;
  
  const now = Date.now();
  const timeSpent = Math.floor((now - Math.max(startTime, categoryTimeStart)) / 1000);
  
  if (timeSpent > 5) {
    const data = {
      type: 'categoryVisit',
      category: currentCategoryData.category,
      score: currentCategoryData.score,
      timeSpent: timeSpent,
      url: window.location.href,
      hostname: window.location.hostname,
      timestamp: now
    };
    
    // Use chrome.runtime.sendMessage with error handling
    try {
      chrome.runtime.sendMessage(data, (response) => {
        if (chrome.runtime.lastError) {
          // If we can't send the message, store it for later
          storeForLater(data);
        }
      });
    } catch (e) {
      storeForLater(data);
    }
  }
}

// Store data in localStorage if we can't send it
function storeForLater(data) {
  try {
    const pending = JSON.parse(localStorage.getItem('mindwell_pending') || '[]');
    pending.push(data);
    localStorage.setItem('mindwell_pending', JSON.stringify(pending));
  } catch (e) {
    console.error('Failed to store data for later:', e);
  }
}

// Send stored data when possible
function sendStoredData() {
  try {
    const pending = JSON.parse(localStorage.getItem('mindwell_pending') || '[]');
    if (pending.length === 0) return;
    
    // Try to send each pending item
    const remaining = [];
    
    pending.forEach(item => {
      try {
        chrome.runtime.sendMessage(item, (response) => {
          if (chrome.runtime.lastError) {
            remaining.push(item);
          }
        });
      } catch (e) {
        remaining.push(item);
      }
    });
    
    // Update stored data
    if (remaining.length > 0) {
      localStorage.setItem('mindwell_pending', JSON.stringify(remaining));
    } else {
      localStorage.removeItem('mindwell_pending');
    }
  } catch (e) {
    console.error('Error sending stored data:', e);
  }
}

// Periodically send stored data
setInterval(sendStoredData, 30000); // Every 30 seconds

// Send data when the page is about to unload
window.addEventListener('beforeunload', () => {
  // Don't try to send data if we're not on an HTTP/HTTPS page
  if (!window.location.protocol.startsWith('http')) {
    return;
  }
  
  // Send activity data normally
  sendActivityData();
  
  // Use sendBeacon as a last resort, but only on secure pages
  if (navigator.sendBeacon && window.isSecureContext) {
    try {
      const data = JSON.stringify({
        type: 'finalCategoryVisit',
        category: currentCategoryData.category,
        score: currentCategoryData.score,
        url: window.location.href,
        hostname: window.location.hostname,
        timestamp: Date.now()
      });
      
      const blob = new Blob([data], { type: 'application/json' });
      const beaconUrl = chrome.runtime.getURL('beacon');
      
      // Only try to send if we have a valid URL
      if (beaconUrl.startsWith('http')) {
        navigator.sendBeacon(beaconUrl, blob);
      }
    } catch (e) {
      console.debug('Failed to send beacon:', e);
    }
  }
});

// Also send data periodically to catch cases where beforeunload doesn't fire
setInterval(sendActivityData, 60000); // Every minute

// Listen for messages from the popup or background script
debugLog('Setting up message listener...');
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const messageId = Math.random().toString(36).substr(2, 8);
  debugLog(`[${messageId}] Message received:`, {
    type: message?.type,
    from: sender?.origin || 'extension',
    tabId: sender?.tab?.id,
    sender: sender
  });
  
  // Helper function to send error response
  const handleError = (error) => {
    const errorMsg = error?.message || String(error);
    debugLog(`[${messageId}] Error:`, errorMsg);
    if (chrome.runtime.lastError) {
      debugLog(`[${messageId}] Runtime error:`, chrome.runtime.lastError);
    }
    try {
      if (typeof sendResponse === 'function') {
        sendResponse({ 
          error: errorMsg,
          messageId,
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      debugLog(`[${messageId}] Error sending response:`, e);
    }
    return false;
  };

  // Only process messages with a valid type
  if (!message || typeof message !== 'object' || !message.type) {
    return handleError(new Error('Invalid message format'));
  }

  // Handle specific message types
  try {
    debugLog(`[${messageId}] Processing message type:`, message.type);
    
    switch (message.type) {
      case 'getActiveTabInfo':
        try {
          const response = {
            url: window.location.href,
            hostname: window.location.hostname,
            title: document.title,
            messageId,
            timestamp: new Date().toISOString()
          };
          debugLog(`[${messageId}] Sending tab info:`, response);
          
          // Try to send response
          if (typeof sendResponse === 'function') {
            sendResponse(response);
          } else {
            debugLog(`[${messageId}] No sendResponse function available`);
          }
        } catch (e) {
          return handleError(e);
        }
        break;
        
      // Add other message types here as needed
      
      default:
        console.debug('Received unknown message type:', message.type);
        return false; // Don't keep the message channel open for unknown types
    }
    
    // Return true to indicate we'll respond asynchronously
    return true;
    
  } catch (error) {
    return sendError(error);
  }
});

// Initialize the content script
function init() {
  debugLog('Initializing content script...');
  
  // Check if extension context is valid before proceeding
  if (!isExtensionContextValid()) {
    debugLog('Extension context invalid during initialization');
    return;
  }
  
  debugLog('Extension context is valid, proceeding with initialization');
  debugLog('Current URL:', window.location.href);
  debugLog('Extension ID:', chrome.runtime.id);
  debugLog('Extension version:', chrome.runtime.getManifest().version);

  // Check if we should block this site (if it's in the blacklist)
  isBlacklisted(window.location.hostname).then(isBlocked => {
    if (isBlocked) {
      console.log('Site is blacklisted:', window.location.hostname);
      try {
        chrome.runtime.sendMessage({
          type: 'blacklistWarning',
          hostname: window.location.hostname
        }).catch(e => {
          console.debug('Could not send blacklist warning:', e);
        });
      } catch (e) {
        console.debug('Error sending blacklist warning:', e);
      }
    }
  }).catch(e => {
    console.debug('Blacklist check failed during initialization:', e);
  });
}

// Function to safely initialize the content script
function safeInit() {
  try {
    // Check if extension context is valid
    if (!isExtensionContextValid()) {
      console.debug('Extension context invalid, retrying...');
      // Retry after a short delay
      setTimeout(safeInit, 1000);
      return;
    }
    
    // Initialize the extension
    init();
  } catch (error) {
    console.error('Error initializing content script:', error);
    // Retry on error
    setTimeout(safeInit, 2000);
  }
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', safeInit);

// Also run init if the page is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  safeInit();
}
