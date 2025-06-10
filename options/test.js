// Test script for MindWell Extension
document.addEventListener('DOMContentLoaded', function() {
    const statusEl = document.getElementById('status');
    const logEl = document.getElementById('log');
    const testButton = document.getElementById('testButton');

    // Add log entry
    function log(message, isError = false) {
        console.log(`[Test] ${message}`);
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        if (isError) entry.style.color = '#dc3545';
        logEl.appendChild(entry);
        logEl.scrollTop = logEl.scrollHeight;
    }

    // Update status
    function updateStatus(message, isError = false) {
        statusEl.textContent = message;
        statusEl.className = isError ? 'error' : 'success';
        log(message, isError);
    }

    // Test connection to background script
    async function testConnection() {
        updateStatus('Testing connection to background script...');
        
        try {
            // Test if Chrome API is available
            if (typeof chrome === 'undefined' || !chrome.runtime) {
                throw new Error('Chrome extension API not available');
            }
            log('Chrome extension API is available');

            // Test sending a message to the background script
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { type: 'testConnection' },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    }
                );
            });
            
            updateStatus(`Connected! Response: ${JSON.stringify(response)}`);
            log('Background script is responding correctly');
            
            // Test storage access
            try {
                log('Testing storage access...');
                await chrome.storage.local.set({ test: Date.now() });
                const result = await chrome.storage.local.get('test');
                log(`Storage test successful: ${JSON.stringify(result)}`);
            } catch (error) {
                log(`Storage error: ${error.message}`, true);
            }
            
        } catch (error) {
            updateStatus(`Error: ${error.message}`, true);
            log(`Error details: ${error.stack}`, true);
        }
    }

    // Event listeners
    testButton.addEventListener('click', testConnection);

    // Initial log
    log('Test page loaded');
    if (typeof chrome === 'undefined' || !chrome.runtime) {
        updateStatus('Error: Chrome extension API not available', true);
    } else {
        updateStatus('Ready to test. Click the button to start.');
    }
});
