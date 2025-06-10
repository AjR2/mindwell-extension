// Simple content script for MindWell
console.log('[MindWell] Simple content script loaded');

// Send a message to the background script
function sendMessage(message, callback) {
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[MindWell] Error sending message:', chrome.runtime.lastError.message); // Log the message of the error
      // If the context is invalid, it often means the service worker has restarted or the extension was reloaded.
      // A page refresh is usually needed for the content script to re-establish connection.
      if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
        console.warn('[MindWell] Extension context invalidated. Please refresh the page if issues persist.');
      }
      if (callback) callback({ error: chrome.runtime.lastError });
      return;
    }
    if (callback) callback(response);
  });
}

// Handle page visibility changes
function handleVisibilityChange() {
  if (document.hidden) {
    console.log('[MindWell] Page hidden');
  } else {
    console.log('[MindWell] Page visible');
    sendPageVisit();
  }
}

// Send page visit data to background
function sendPageVisit() {
  const pageData = {
    type: 'pageVisited',
    url: window.location.href,
    title: document.title,
    hostname: window.location.hostname,
    timestamp: new Date().toISOString()
  };

  console.log('[MindWell] Sending page visit:', pageData);
  
  sendMessage(pageData, (response) => {
    if (response && response.error) {
      console.error('[MindWell] Error sending page visit:', response.error);
    } else {
      console.log('[MindWell] Page visit recorded');
    }
  });
}

// Initialize the content script
function init() {
  console.log('[MindWell] Initializing simple content script');
  
  sendPageVisit();
  
  // Set up visibility change listener
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Set up history change listeners (for SPAs)
  const pushState = history.pushState;
  const replaceState = history.replaceState;
  
  history.pushState = function() {
    pushState.apply(history, arguments);
    sendPageVisit();
  };
  
  history.replaceState = function() {
    replaceState.apply(history, arguments);
    sendPageVisit();
  };
  
  window.addEventListener('popstate', () => {
    sendPageVisit();
  });
  
  console.log('[MindWell] Content script initialized');
}

// Start the content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
