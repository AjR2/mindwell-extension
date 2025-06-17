// Simple content script for MindWell
console.log('[MindWell] Simple content script loaded');

// Global error handler for content script.
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('Extension context invalidated')) {
    console.error('[MindWell] Caught global error: Extension context invalidated.', event.error);
    event.preventDefault(); // Prevent the error from being reported to the console as uncaught
    console.warn('[MindWell] Further operations might be limited due to invalid context.');
  }
});

// Send a message to the background script
function sendMessage(message, callback) {
  // Always check for chrome.runtime validity at the point of use
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
    showTrackingBlockedMessage();
    console.error('[MindWell] FATAL: Extension context is completely invalid (chrome.runtime or ID missing). Cannot send message.');
    if (callback) callback({ error: 'Extension context invalidated. Please refresh the page.' });
    return;
  }

  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        const lastErrorMessage = chrome.runtime.lastError.message;
        console.error('[MindWell] Error sending message (chrome.runtime.lastError):', lastErrorMessage);
        if (callback) callback({ error: chrome.runtime.lastError });
        return;
      }
      if (callback) callback(response);
    });
  } catch (e) {
    console.error('[MindWell] Caught synchronous error during chrome.runtime.sendMessage:', e);
    if (callback) callback({ error: e });
  }
}

// Handle page visibility changes
function handleVisibilityChange() {
  if (document.hidden) {
    console.log('[MindWell] Page hidden');
    stopTracking();
  } else {
    console.log('[MindWell] Page visible');
    startTracking(); // Start tracking when page becomes visible
  }
}

// Removed sendPageVisit - it's handled by startTracking/stopTracking for time
function sendPageVisit() {
  // This function is now focused on sending an explicit page visit event,
  // distinct from time tracking. If you need to send a distinct page visit,
  // ensure your background script handles it appropriately without double counting.
  // For time tracking, startTracking/stopTracking events are more relevant.
  const pageData = {
    type: 'pageVisited',
    url: window.location.href,
    title: document.title,
    hostname: window.location.hostname,
    timestamp: new Date().toISOString()
  };

  console.log('[MindWell] Sending explicit page visit event (not for time tracking):', pageData);
  
  sendMessage(pageData, (response) => {
    if (response && response.error) {
      console.error('[MindWell] Error sending page visit:', response.error);
    } else {
      console.log('[MindWell] Explicit page visit event recorded');
    }
  });
}

let trackingStarted = false;
let trackingStartTime = null;
let trackingDomain = null;
let currentTrackedURL = null; // To track URL for SPA navigation

function startTracking() {
  const newDomain = window.location.hostname.replace('www.', '');
  const newUrl = window.location.href;

  // Only start tracking if not already tracking, or if the domain/URL has changed
  if (!trackingStarted || newDomain !== trackingDomain || newUrl !== currentTrackedURL) {
    if (trackingStarted) { // If already tracking but domain/URL changed, stop previous session first
      stopTracking();
    }
    trackingStarted = true;
    trackingStartTime = Date.now();
    trackingDomain = newDomain;
    currentTrackedURL = newUrl;
    sendMessage({ type: 'startTracking', domain: trackingDomain, timestamp: trackingStartTime, url: currentTrackedURL });
    console.log('[MindWell] Tracking started for:', trackingDomain, 'at', new Date(trackingStartTime).toISOString(), 'URL:', currentTrackedURL);
  }
}

function stopTracking() {
  if (!trackingStarted) return;
  
  trackingStarted = false;
  const stopTime = Date.now();
  const duration = stopTime - trackingStartTime;
  
  // Only send stopTracking if a valid start time exists
  if (trackingStartTime !== null && duration > 0) {
    sendMessage({ type: 'stopTracking', domain: trackingDomain, start: trackingStartTime, stop: stopTime, duration: duration, url: currentTrackedURL });
    console.log('[MindWell] Tracking stopped for:', trackingDomain, 'at', new Date(stopTime).toISOString(), 'Duration:', duration, 'URL:', currentTrackedURL);
  } else {
    console.warn('[MindWell] stopTracking called but no valid session was active or duration was zero/negative.');
  }

  trackingStartTime = null;
  trackingDomain = null;
  currentTrackedURL = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopTracking();
  } else {
    startTracking();
  }
});

window.addEventListener('beforeunload', stopTracking);
window.addEventListener('unload', stopTracking);

// Start tracking when script loads and page is visible
if (!document.hidden) {
  startTracking();
}

// Initialize the content script
function init() {
  console.log('[MindWell] Initializing simple content script');
  
  // Initial check for extension context validity at script start
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      throw new Error('Extension context already invalid at initialization (chrome.runtime or ID missing).');
    }
    chrome.runtime.getURL(''); // A quick test to confirm validity
    // Removed sendPageVisit from init, startTracking handles initial session
  } catch (e) {
    console.error('[MindWell] Extension context invalid during initialization:', e);
    console.warn('[MindWell] Content script will operate in a limited capacity or not at all due to invalid context.');
  }
  
  // Set up visibility change listener
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Set up history change listeners (for SPAs)
  const pushState = history.pushState;
  const replaceState = history.replaceState;
  
  history.pushState = function() {
    pushState.apply(history, arguments);
    // On SPA navigation, stop current tracking and start new one if URL/domain changes
    startTracking(); 
  };
  
  history.replaceState = function() {
    replaceState.apply(history, arguments);
    // On SPA navigation, stop current tracking and start new one if URL/domain changes
    startTracking();
  };
  
  window.addEventListener('popstate', () => {
    // On SPA navigation, stop current tracking and start new one if URL/domain changes
    startTracking();
  });
  
  console.log('[MindWell] Content script initialized');
}

// Start the content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function showTrackingBlockedMessage() {
  if (document.getElementById('mindwell-tracking-blocked')) return;
  const banner = document.createElement('div');
  banner.id = 'mindwell-tracking-blocked';
  banner.style.position = 'fixed';
  banner.style.top = '0';
  banner.style.left = '0';
  banner.style.width = '100%';
  banner.style.background = 'rgba(220, 38, 38, 0.95)';
  banner.style.color = '#fff';
  banner.style.zIndex = '99999';
  banner.style.fontSize = '16px';
  banner.style.fontFamily = 'Inter, Arial, sans-serif';
  banner.style.textAlign = 'center';
  banner.style.padding = '12px 0';
  banner.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  banner.textContent = 'MindWell: This website does not allow browser extension tracking.';
  document.body.appendChild(banner);
}
