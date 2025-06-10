// Test popup for MindWell extension
document.addEventListener('DOMContentLoaded', function() {
    const statusEl = document.getElementById('status');
    const testButton = document.getElementById('testButton');

    // Update status
    function updateStatus(message, isError = false) {
        console.log(`[Popup] ${message}`);
        statusEl.textContent = message;
        statusEl.className = isError ? 'error' : '';
    }

    // Test connection to background script
    async function testConnection() {
        updateStatus('Testing connection to background script...');
        
        try {
            // Test if we can communicate with the background script
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { type: 'test' },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    }
                );
            });
            
            if (response && response.success) {
                updateStatus(`✅ ${response.message}`, false);
                console.log('Background response:', response);
                
                // Test storage access
                try {
                    await chrome.storage.local.set({ test: Date.now() });
                    const result = await chrome.storage.local.get('test');
                    console.log('Storage test successful:', result);
                } catch (error) {
                    console.error('Storage error:', error);
                }
            } else {
                throw new Error('Invalid response from background script');
            }
            
        } catch (error) {
            const errorMessage = error.message || 'Unknown error';
            updateStatus(`❌ Error: ${errorMessage}`, true);
            console.error('Test failed:', error);
        }
    }

    // Event listeners
    testButton.addEventListener('click', testConnection);

    // Initial status check
    if (typeof chrome === 'undefined' || !chrome.runtime) {
        updateStatus('❌ Error: Chrome extension API not available', true);
    } else {
        updateStatus('Ready to test. Click the button to start.');
    }
});
