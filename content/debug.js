// Debug script to test extension communication
console.log('[MindWell Debug] Content script loaded');

// Test connection to background script
function testBackgroundConnection() {
  console.log('[MindWell Debug] Testing connection to background script...');
  
  chrome.runtime.sendMessage(
    { type: 'testConnection' },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('[MindWell Debug] Error:', chrome.runtime.lastError);
      } else {
        console.log('[MindWell Debug] Response from background:', response);
      }
    }
  );
}

// Run the test when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testBackgroundConnection);
} else {
  testBackgroundConnection();
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[MindWell Debug] Message received in content script:', message);
  
  if (message.type === 'tabActivated') {
    console.log('[MindWell Debug] Tab activated message received');
    if (typeof sendResponse === 'function') {
      sendResponse({ status: 'tabActivated', timestamp: new Date().toISOString() });
    }
    return true;
  }
  
  return false;
});
