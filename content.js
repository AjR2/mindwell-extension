// Content script for tracking website visits
console.log('[MindWell] Content script loaded for:', window.location.href);

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'ping') {
      console.log('[MindWell] Content script received ping');
      sendResponse({ 
        type: 'pong', 
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
      return true; // Keep the message channel open for async response
    }
  } catch (error) {
    console.error('[MindWell] Error in message listener:', error);
  }
  return false;
});

// Function to send page visit data
function sendPageVisit() {
  try {
    const pageData = {
      type: 'pageVisited',
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString()
    };
    
    console.log('[MindWell] Sending page visit:', pageData);
    
    chrome.runtime.sendMessage(pageData, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[MindWell] Error sending page visit:', chrome.runtime.lastError);
      } else {
        console.log('[MindWell] Page visit recorded:', response);
      }
    });
  } catch (error) {
    console.error('[MindWell] Error in sendPageVisit:', error);
  }
}

// Send initial page visit
sendPageVisit();

// Also listen for history state changes (for SPAs)
window.addEventListener('popstate', sendPageVisit);
window.addEventListener('pushState', sendPageVisit);
window.addEventListener('replaceState', sendPageVisit);
