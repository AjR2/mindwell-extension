// Simple debug script for testing extension communication
console.log('[MindWell] Debug script loaded');

// Test connection to background
chrome.runtime.sendMessage(
  { type: 'test' },
  (response) => {
    if (chrome.runtime.lastError) {
      console.error('[MindWell] Error:', chrome.runtime.lastError);
    } else {
      console.log('[MindWell] Response:', response);
    }
  }
);

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[MindWell] Message received:', message);
  if (message.type === 'ping') {
    sendResponse({ type: 'pong', time: new Date().toISOString() });
    return true;
  }
});
