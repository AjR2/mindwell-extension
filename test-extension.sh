#!/bin/bash

# Open Chrome with the extension loaded in developer mode
# and open our test page

EXTENSION_PATH="$(pwd)"
TEST_PAGE="file://${EXTENSION_PATH}/test.html"

echo "Testing MindWell Extension"
echo "======================="
echo "Extension path: ${EXTENSION_PATH}"
echo "Test page: ${TEST_PAGE}"
echo ""
echo "Instructions:"
echo "1. Open Chrome and go to chrome://extensions"
echo "2. Enable 'Developer mode' (toggle in top-right corner)"
echo "3. Click 'Load unpacked' and select this directory: ${EXTENSION_PATH}"
echo "4. Open the test page: ${TEST_PAGE}"
echo "5. Right-click the extension icon and select 'Inspect popup' to see logs"
echo "6. Go to chrome://extensions and click 'service worker' link to see background script logs"
echo ""

# Try to open Chrome with the test page (works on macOS)
if command -v open &> /dev/null; then
    open -a "Google Chrome" "${TEST_PAGE}"
    open -a "Google Chrome" "chrome://extensions"
    echo "Opened Chrome with test page and extensions page"
else
    echo "Please open Chrome manually and go to: ${TEST_PAGE}"
fi

echo "\nCheck the browser console (F12) for debug output"
