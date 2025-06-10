// DOM elements
let visitsCountEl;
let timeSpentEl;
let topSitesList;
let statusEl;
let refreshBtn;
let scoreChart;
let activityChart;
let trackingToggle;
let settingsButton;
let actionButton;
let scoreValue;
let scoreLabel;
let recommendationText;

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('[MindWell] DOM loaded');
    
    // Initialize DOM elements
    const elements = initializeElements();
    
    // Store elements in global variables for easy access
    Object.assign(window, elements);
    
    // Initialize charts
    initializeScoreChart();
    initializeActivityChart();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    loadBrowsingData();
    
    // Listen for data updates from background
    chrome.runtime.onMessage.addListener((message) => {
        if (message && message.type === 'dataUpdated') {
            console.log('[MindWell] Received data update:', message);
            updateUIWithData(message.browsingData);
        }
        return false;
    });
});

// Initialize DOM elements
function initializeElements() {
    const elements = {
        scoreChart: document.getElementById('wellness-score-chart'),
        scoreValue: document.getElementById('wellness-score-value'),
        scoreLabel: document.getElementById('wellness-score-label'),
        activityChart: document.getElementById('activity-chart'),
        topSitesList: document.getElementById('top-sites'),
        recommendationText: document.getElementById('recommendation-text'),
        actionButton: document.getElementById('action-button'),
        trackingToggle: document.getElementById('tracking-toggle'),
        settingsButton: document.getElementById('settings-button'),
        statusEl: document.getElementById('status')
    };

    // Log warnings for missing elements
    Object.entries(elements).forEach(([name, element]) => {
        if (!element) {
            console.warn(`[MindWell] Element not found: ${name}`);
        }
    });

    return elements;
}

// Set up event listeners
function setupEventListeners() {
    if (trackingToggle) {
        trackingToggle.addEventListener('change', handleTrackingToggle);
    }
    
    if (settingsButton) {
        settingsButton.addEventListener('click', openSettings);
    }
    
    if (actionButton) {
        actionButton.addEventListener('click', handleActionButton);
    }
}

// Initialize the score chart (circular progress)
function initializeScoreChart() {
    const canvas = document.getElementById('wellness-score-chart');
    if (!canvas) {
        console.warn('[MindWell] Score chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    scoreChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [3, 2], // Score out of 5
                backgroundColor: [
                    '#3498db',
                    '#f0f0f0'
                ],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '80%',
            rotation: -90,
            circumference: 180,
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            }
        }
    });
}

// Initialize the activity chart (pie chart)
function initializeActivityChart() {
    const canvas = document.getElementById('activity-chart');
    if (!canvas) {
        console.warn('[MindWell] Activity chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    activityChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#3498db',
                    '#2ecc71',
                    '#e74c3c',
                    '#f1c40f'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Update status message
function updateStatus(message, isError = false) {
    if (!statusEl) {
        console.log(`[MindWell] Status update (no element): ${message}`);
        return;
    }
    
    console.log(`[MindWell] ${isError ? 'Error: ' : ''}${message}`);
    statusEl.textContent = message;
    statusEl.className = isError ? 'error' : '';
    
    // Clear status after 3 seconds if it's not an error
    if (!isError) {
        setTimeout(() => {
            if (statusEl && statusEl.textContent === message) {
                statusEl.textContent = '';
            }
        }, 3000);
    }
}

// Update the top sites list in the UI
function updateTopSitesList(domains) {
    if (!domains || Object.keys(domains).length === 0) {
        topSitesList.innerHTML = '<li>No browsing data yet</li>';
        return;
    }
    
    // Sort domains by visit count (highest first)
    const sortedDomains = Object.entries(domains)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Show top 5
    
    // Clear and update the list
    topSitesList.innerHTML = '';
    
    sortedDomains.forEach(([domain, count]) => {
        const li = document.createElement('li');
        li.className = 'domain-item';
        li.innerHTML = `
            <span class="domain-name">${domain}</span>
            <span class="domain-count">${formatTime(count * 2)}</span>
        `;
        topSitesList.appendChild(li);
    });
}

// Refresh data
async function refreshData() {
    try {
        updateStatus('Refreshing data...');
        // Simply call loadBrowsingData which will handle the refresh
        await loadBrowsingData();
    } catch (error) {
        console.error('Error in refreshData:', error);
        updateStatus('Error: ' + (error.message || 'Failed to refresh'), true);
    }
}

// Event Listeners
// refreshBtn.addEventListener('click', refreshData);

// Initial load
// loadBrowsingData();

// Set up periodic refresh (every 30 seconds)
setInterval(loadBrowsingData, 30000);

// Get label for wellness score
function getScoreLabel(score) {
    const labels = {
        0: 'No data available',
        1: 'High negative impact on well-being',
        2: 'Moderate negative impact',
        3: 'Neutral impact',
        4: 'Positive impact',
        5: 'Highly positive impact'
    };
    return labels[score] || 'Calculating...';
}

// Update UI with browsing data
function updateUIWithData(browsingData) {
    if (!browsingData) {
        console.warn('[MindWell] No browsing data provided');
        return;
    }

    const elements = initializeElements();

    // Update wellness score
    if (elements.scoreValue && elements.scoreLabel) {
        const score = browsingData.wellnessScore?.score || 0;
        elements.scoreValue.textContent = score;
        elements.scoreLabel.textContent = getScoreLabel(score);
    }

    // Update visits count
    if (elements.visitsCountEl) {
        const visitsCount = browsingData.visits?.length || 0;
        elements.visitsCountEl.textContent = visitsCount;
    }

    // Update time spent
    if (elements.timeSpentEl) {
        const totalTime = browsingData.visits?.reduce((sum, visit) => sum + (visit.timeSpent || 0), 0) || 0;
        elements.timeSpentEl.textContent = formatTime(totalTime);
    }

    // Update activity chart
    if (elements.activityChart) {
        updateActivityData(browsingData);
    }

    // Update recommendation
    if (elements.recommendationText) {
        updateRecommendation(browsingData);
    }
}

// Update wellness score display
function updateWellnessScore(wellnessData) {
    if (!scoreValue || !scoreLabel) {
        console.warn('[MindWell] Score elements not found');
        return;
    }
    
    // Update score value
    scoreValue.textContent = wellnessData.score;
    
    // Update score label
    const labels = {
        1: 'High negative impact on well-being',
        2: 'Moderate negative impact',
        3: 'Neutral impact',
        4: 'Positive impact',
        5: 'Highly positive impact'
    };
    scoreLabel.textContent = labels[wellnessData.score] || 'Neutral impact';
    
    // Update chart
    if (scoreChart) {
        scoreChart.data.datasets[0].data = [wellnessData.score, 5 - wellnessData.score];
        scoreChart.update();
    }
}

// Update activity data
function updateActivityData(browsingData) {
    const elements = initializeElements();
    if (!activityChart) {
        console.warn('[MindWell] Activity chart not initialized');
        return;
    }
    
    const domains = browsingData.domains || {};
    if (!domains || Object.keys(domains).length === 0) {
        activityChart.data.labels = ['No data'];
        activityChart.data.datasets[0].data = [1];
        activityChart.update();
        return;
    }
    
    // Sort domains by time spent
    const sortedDomains = Object.entries(domains)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
    
    // Update chart
    activityChart.data.labels = sortedDomains.map(([domain]) => domain);
    activityChart.data.datasets[0].data = sortedDomains.map(([, time]) => time);
    activityChart.update();
    
    // Update list
    if (!elements.topSitesList) {
        console.warn('[MindWell] Top sites list element not found');
        return;
    }
    
    elements.topSitesList.innerHTML = '';
    sortedDomains.forEach(([domain, time], index) => {
        const li = document.createElement('li');
        li.className = 'domain-item';
        li.innerHTML = `
            <span>
                <span class="domain-color" style="background-color: ${activityChart.data.datasets[0].backgroundColor[index]}"></span>
                ${domain}
            </span>
            <span>${formatTime(time * 2)}</span>
        `;
        elements.topSitesList.appendChild(li);
    });
}

// Update recommendation
function updateRecommendation(browsingData) {
    const elements = initializeElements();
    if (!elements.recommendationText || !elements.actionButton) {
        console.warn('[MindWell] Recommendation elements not found');
        return;
    }
    
    // Get the first insight as recommendation
    const recommendation = browsingData.insights?.[0] || 'Take a mindfulness break after browsing';
    elements.recommendationText.textContent = recommendation;
    
    // Update action button based on recommendation
    if (recommendation.includes('mindfulness')) {
        elements.actionButton.textContent = 'Start Mindfulness Break';
    } else if (recommendation.includes('break')) {
        elements.actionButton.textContent = 'Take a Break';
    } else {
        elements.actionButton.textContent = 'Learn More';
    }
}

// Handle tracking toggle
function handleTrackingToggle(event) {
    const isTracking = event.target.checked;
    chrome.storage.local.get('settings', (data) => {
        const settings = data.settings || {};
        settings.isTracking = isTracking;
        chrome.storage.local.set({ settings }, () => {
            updateStatus(isTracking ? 'Tracking enabled' : 'Tracking paused');
        });
    });
}

// Open settings
function openSettings() {
    chrome.runtime.openOptionsPage();
}

// Handle action button
function handleActionButton() {
    chrome.tabs.create({ url: 'https://www.akeyreu.com' });
}

// Load browsing data from the background script
async function loadBrowsingData() {
    try {
        updateStatus('Loading data...');
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'getBrowsingData' }, (response) => {
                if (chrome.runtime.lastError) {
                    resolve({ success: false, error: chrome.runtime.lastError });
                    return;
                }
                console.log('Received response in popup:', response);
                resolve(response || { success: false, error: 'No response' });
            });
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to load data');
        }

        updateUIWithData(response.browsingData);
        updateStatus('Data loaded');

    } catch (error) {
        console.error('Error in loadBrowsingData:', error);
        updateStatus('Error loading data: ' + (error.message || 'Unknown error'), true);
    }
}

// Format time in minutes to a human-readable string
function formatTime(minutes) {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hr ${remainingMinutes > 0 ? remainingMinutes + ' min' : ''}`;
}
