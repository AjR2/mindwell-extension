// Background script for MindWell extension
console.log('Background script loaded');

// Default settings
const DEFAULT_SETTINGS = {
  isTracking: true,
  dailyGoal: 120, // minutes
  blacklist: []
};

// Website categories and their scores
const WEBSITE_CATEGORIES = {
    // Highly positive impact (score: 5)
    positive: {
        keywords: ['mindwell', 'headspace', 'calm', 'meditation', 'yoga', 'wellness', 'health', 'fitness', 'exercise', 'nature', 'outdoors', 'art', 'music', 'creativity', 'learning', 'education', 'productivity', 'organization', 'planning', 'goal-setting', 'personal-development', 'self-improvement', 'mental-health', 'therapy', 'counseling', 'support', 'community', 'social-good', 'volunteer', 'charity', 'environment', 'sustainability', 'eco-friendly', 'green-living', 'healthy-eating', 'nutrition', 'cooking', 'recipes', 'gardening', 'plants', 'animals', 'pets', 'wildlife', 'conservation', 'science', 'research', 'technology', 'innovation', 'design', 'architecture', 'photography', 'writing', 'reading', 'books', 'literature', 'poetry', 'philosophy', 'spirituality', 'religion', 'faith', 'mindfulness', 'awareness', 'consciousness', 'wisdom', 'knowledge', 'understanding', 'insight', 'perspective', 'growth', 'development', 'potential', 'possibility', 'opportunity', 'challenge', 'adventure', 'exploration', 'discovery', 'curiosity', 'wonder', 'awe', 'gratitude', 'appreciation', 'joy', 'happiness', 'peace', 'calm', 'serenity', 'tranquility', 'balance', 'harmony', 'wholeness', 'completeness', 'fulfillment', 'satisfaction', 'contentment', 'well-being', 'vitality', 'energy', 'strength', 'resilience', 'adaptability', 'flexibility', 'openness', 'receptivity', 'sensitivity', 'empathy', 'compassion', 'kindness', 'generosity', 'giving', 'sharing', 'caring', 'nurturing', 'healing', 'recovery', 'restoration', 'renewal', 'regeneration', 'transformation', 'evolution', 'progress', 'advancement', 'improvement', 'enhancement', 'enrichment', 'empowerment', 'liberation', 'freedom', 'independence', 'autonomy', 'self-determination', 'self-expression', 'authenticity', 'integrity', 'honesty', 'truth', 'clarity', 'precision', 'accuracy', 'reliability', 'consistency', 'stability', 'security', 'safety', 'protection', 'preservation', 'conservation', 'sustainability'],
        score: 5
    },
    // Moderately positive impact (score: 4)
    moderatelyPositive: {
        keywords: ['news', 'current-events', 'politics', 'business', 'finance', 'economics', 'market', 'stocks', 'investing', 'trading', 'banking', 'insurance', 'real-estate', 'property', 'housing', 'construction', 'architecture', 'design', 'engineering', 'technology', 'software', 'hardware', 'computing', 'programming', 'coding', 'development', 'testing', 'debugging', 'deployment', 'maintenance', 'support', 'help', 'documentation', 'tutorials', 'guides', 'manuals', 'instructions', 'directions', 'maps', 'navigation', 'travel', 'tourism', 'vacation', 'holiday', 'leisure', 'recreation', 'entertainment', 'sports', 'games', 'hobbies', 'interests', 'passions', 'talents', 'skills', 'abilities', 'capabilities', 'competencies', 'expertise', 'knowledge', 'understanding', 'wisdom', 'insight', 'perspective', 'viewpoint', 'opinion', 'belief', 'value', 'principle', 'standard', 'criterion', 'measure', 'metric', 'indicator', 'signal', 'sign', 'symbol', 'representation', 'expression', 'manifestation', 'embodiment', 'incarnation', 'realization', 'actualization', 'fulfillment', 'completion', 'achievement', 'accomplishment', 'success', 'victory', 'triumph', 'conquest', 'overcoming', 'transcending', 'surpassing', 'exceeding', 'outperforming', 'outdoing', 'outshining', 'outstanding', 'excellent', 'superb', 'magnificent', 'marvelous', 'wonderful', 'fantastic', 'fabulous', 'terrific', 'tremendous', 'enormous', 'huge', 'massive', 'gigantic', 'colossal', 'monumental', 'epic', 'legendary', 'mythical', 'fabled', 'famous', 'renowned', 'celebrated', 'acclaimed', 'praised', 'commended', 'applauded', 'cheered', 'encouraged', 'supported', 'backed', 'sponsored', 'funded', 'financed', 'subsidized', 'underwritten', 'guaranteed', 'assured', 'secured', 'protected', 'preserved', 'conserved', 'sustained', 'maintained', 'upheld', 'supported', 'backed', 'sponsored', 'funded', 'financed', 'subsidized', 'underwritten', 'guaranteed', 'assured', 'secured', 'protected', 'preserved', 'conserved', 'sustained', 'maintained', 'upheld'],
        score: 4
    },
    // Neutral impact (score: 3)
    neutral: {
        keywords: ['search', 'query', 'results', 'information', 'data', 'facts', 'figures', 'statistics', 'numbers', 'values', 'quantities', 'amounts', 'totals', 'sums', 'averages', 'means', 'medians', 'modes', 'ranges', 'spreads', 'distributions', 'patterns', 'trends', 'tendencies', 'inclinations', 'propensities', 'predispositions', 'preferences', 'choices', 'decisions', 'judgments', 'assessments', 'evaluations', 'appraisals', 'estimates', 'approximations', 'calculations', 'computations', 'operations', 'procedures', 'processes', 'methods', 'techniques', 'approaches', 'strategies', 'tactics', 'plans', 'schemes', 'designs', 'blueprints', 'outlines', 'sketches', 'drafts', 'versions', 'iterations', 'revisions', 'edits', 'changes', 'modifications', 'adjustments', 'alterations', 'transformations', 'conversions', 'translations', 'interpretations', 'explanations', 'clarifications', 'elucidations', 'illuminations', 'enlightenments', 'revelations', 'discoveries', 'findings', 'results', 'outcomes', 'consequences', 'effects', 'impacts', 'influences', 'contributions', 'additions', 'supplements', 'complements', 'enhancements', 'improvements', 'advancements', 'progressions', 'developments', 'evolutions', 'transformations', 'changes', 'modifications', 'adjustments', 'alterations', 'variations', 'differences', 'distinctions', 'contrasts', 'comparisons', 'analogies', 'metaphors', 'similes', 'allegories', 'parables', 'fables', 'stories', 'narratives', 'accounts', 'reports', 'records', 'documents', 'files', 'archives', 'collections', 'assemblies', 'groups', 'sets', 'series', 'sequences', 'progressions', 'developments', 'evolutions', 'transformations', 'changes', 'modifications', 'adjustments', 'alterations', 'variations', 'differences', 'distinctions', 'contrasts', 'comparisons', 'analogies', 'metaphors', 'similes', 'allegories', 'parables', 'fables', 'stories', 'narratives', 'accounts', 'reports', 'records', 'documents', 'files', 'archives', 'collections', 'assemblies', 'groups', 'sets', 'series', 'sequences'],
        score: 3
    },
    // Moderately negative impact (score: 2)
    moderatelyNegative: {
        keywords: ['social-media', 'facebook', 'instagram', 'twitter', 'tiktok', 'snapchat', 'pinterest', 'reddit', 'forum', 'discussion', 'chat', 'message', 'email', 'mail', 'communication', 'correspondence', 'exchange', 'interaction', 'engagement', 'participation', 'involvement', 'contribution', 'addition', 'supplement', 'complement', 'enhancement', 'improvement', 'advancement', 'progression', 'development', 'evolution', 'transformation', 'change', 'modification', 'adjustment', 'alteration', 'variation', 'difference', 'distinction', 'contrast', 'comparison', 'analogy', 'metaphor', 'simile', 'allegory', 'parable', 'fable', 'story', 'narrative', 'account', 'report', 'record', 'document', 'file', 'archive', 'collection', 'assembly', 'group', 'set', 'series', 'sequence', 'progression', 'development', 'evolution', 'transformation', 'change', 'modification', 'adjustment', 'alteration', 'variation', 'difference', 'distinction', 'contrast', 'comparison', 'analogy', 'metaphor', 'simile', 'allegory', 'parable', 'fable', 'story', 'narrative', 'account', 'report', 'record', 'document', 'file', 'archive', 'collection', 'assembly', 'group', 'set', 'series', 'sequence'],
        score: 2
    },
    // Highly negative impact (score: 1)
    negative: {
        keywords: ['gambling', 'betting', 'casino', 'poker', 'slots', 'lottery', 'sports-betting', 'horse-racing', 'dog-racing', 'cockfighting', 'bullfighting', 'hunting', 'fishing', 'trapping', 'poaching', 'smuggling', 'trafficking', 'prostitution', 'escort', 'massage', 'spa', 'sauna', 'hot-tub', 'jacuzzi', 'pool', 'beach', 'resort', 'hotel', 'motel', 'inn', 'bed-and-breakfast', 'hostel', 'camping', 'glamping', 'adventure', 'exploration', 'discovery', 'journey', 'voyage', 'trip', 'tour', 'excursion', 'outing', 'expedition', 'mission', 'quest', 'search', 'hunt', 'pursuit', 'chase', 'race', 'contest', 'competition', 'tournament', 'championship', 'league', 'division', 'conference', 'association', 'federation', 'union', 'alliance', 'coalition', 'partnership', 'collaboration', 'cooperation', 'coordination', 'synchronization', 'harmonization', 'integration', 'unification', 'consolidation', 'merger', 'acquisition', 'takeover', 'buyout', 'purchase', 'sale', 'trade', 'exchange', 'swap', 'barter', 'deal', 'agreement', 'contract', 'treaty', 'pact', 'alliance', 'coalition', 'partnership', 'collaboration', 'cooperation', 'coordination', 'synchronization', 'harmonization', 'integration', 'unification', 'consolidation', 'merger', 'acquisition', 'takeover', 'buyout', 'purchase', 'sale', 'trade', 'exchange', 'swap', 'barter', 'deal', 'agreement', 'contract', 'treaty', 'pact'],
        score: 1
    }
};

// Mental wellness scoring system
const WELLNESS_SCORES = {
  // Productive categories (positive impact)
  'educational': { score: 5, weight: 1.2 },
  'professional': { score: 4, weight: 1.1 },
  'health': { score: 5, weight: 1.2 },
  'news': { score: 3, weight: 0.9 },
  
  // Neutral categories
  'search': { score: 3, weight: 1.0 },
  'reference': { score: 3, weight: 1.0 },
  'email': { score: 3, weight: 1.0 },
  
  // Distracting categories (negative impact)
  'social': { score: 2, weight: 0.8 },
  'entertainment': { score: 2, weight: 0.8 },
  'gaming': { score: 1, weight: 0.7 },
  'shopping': { score: 2, weight: 0.8 },
  'adult': { score: 1, weight: 0.6 },
  'gambling': { score: 1, weight: 0.6 },
  
  // Default category
  'other': { score: 3, weight: 1.0 }
};

// --- Total Time Tracking Variables ---
let lastVisit = {
  domain: null,
  timestamp: null,
  date: null
};
let lastHeartbeatTimestamp = {};

// --- Tab tracking state ---
let tabTracking = {};

// Handle installation
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed');
  
  // Initialize storage with default data
  const data = await chrome.storage.local.get(['settings', 'browsingData']);
  
  if (!data.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  
  if (!data.browsingData) {
    await chrome.storage.local.set({ 
      browsingData: {
        totalTime: 0,
        dailyStats: {},
        categories: {}
      } 
    });
  }
});

// Initialize storage with default values
function initializeStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['browsingData', 'settings'], (data) => {
      const initializedData = {
        browsingData: data.browsingData || {
          dailyStats: {},
          totalTime: 0,
          categories: {}
        },
        settings: data.settings || DEFAULT_SETTINGS
      };
      
      chrome.storage.local.set(initializedData, () => {
        console.log('Storage initialized');
        resolve(initializedData);
      });
    });
  });
}

// Calculate daily wellness score
function calculateDailyScore(domainsTime, totalTime) {
    if (!domainsTime || totalTime === 0) {
        return {
            score: 50, // Default neutral score instead of 0
            insights: ['No browsing data available for today']
        };
    }

    let weightedScore = 0;
    const categoryTime = {};

    // Process each domain's accumulated time
    for (const domain in domainsTime) {
        if (domainsTime.hasOwnProperty(domain)) {
            const timeSpent = domainsTime[domain] || 0;
            const { category, score } = categorizeDomain(domain);

            if (timeSpent <= 0) {
                continue;
            }

            weightedScore += (score * timeSpent);

            // Track time spent in each category
            categoryTime[category] = (categoryTime[category] || 0) + timeSpent;
        }
    }

    // Calculate final score (0-100) - improved formula
    let finalScore = 50; // Start with neutral score
    if (totalTime > 0) {
        const averageScore = weightedScore / totalTime;
        // Convert from 1-5 scale to 0-100 scale
        finalScore = Math.round(((averageScore - 1) / 4) * 100);
        finalScore = Math.max(0, Math.min(100, finalScore)); // Clamp between 0-100
    }

    // Generate insights
    const insights = generateInsights(categoryTime, totalTime);

    return {
        score: finalScore,
        insights: insights
    };
}

// Generate insights based on browsing patterns
function generateInsights(categoryTime, totalTime) {
    const insights = [];
    
    if (totalTime === 0) {
        return ['No browsing activity recorded today'];
    }

    // Calculate percentages for each category
    const percentages = {};
    for (const [category, time] of Object.entries(categoryTime)) {
        percentages[category] = (time / totalTime) * 100;
    }

    // Add insights based on category percentages
    if (percentages.positive > 30) {
        insights.push('Great job spending time on positive websites!');
    }
    if (percentages.negative > 20) {
        insights.push('Consider reducing time spent on potentially negative websites');
    }
    if (percentages.social > 40) {
        insights.push('You\'ve spent a significant amount of time on social media today');
    }
    if (percentages.educational > 20) {
        insights.push('Good work on educational content!');
    }

    // Add time-based insights
    if (totalTime > 36000) { // More than 10 hours
        insights.push('You\'ve been browsing for a long time today. Remember to take breaks!');
    }

    return insights.length > 0 ? insights : ['Keep up the good work with your browsing habits!'];
}

// Categorize a domain based on its content
function categorizeDomain(domain) {
    const domainLower = domain.toLowerCase();
    
    // Check each category's keywords
    for (const [category, data] of Object.entries(WEBSITE_CATEGORIES)) {
        if (data.keywords.some(keyword => domainLower.includes(keyword))) {
            return {
                category,
                score: data.score
            };
        }
    }
    
    // Default to neutral if no category matches
    return {
        category: 'neutral',
        score: WEBSITE_CATEGORIES.neutral.score
    };
}

// Helper function to format time
function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes > 0 ? remainingMinutes + ' minutes' : ''}`;
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  
  const tabId = sender.tab ? sender.tab.id : null;
  if (!message || typeof message !== 'object') {
    console.warn('Invalid message format:', message);
    sendResponse && sendResponse({ success: false, error: 'Invalid message format' });
    return false;
  }
  
  // Handle ping/pong for connection testing
  if (message.type === 'ping') {
    console.log('Received ping, sending pong');
    sendResponse && sendResponse({ 
      type: 'pong', 
      time: new Date().toISOString(),
      version: '1.0.0'
    });
    return true;
  }
  
  // Handle data refresh requests from popup
  if (message.type === 'refreshData') {
    console.log('Refreshing data...');
    
    chrome.storage.local.get(['browsingData', 'settings'], (data) => {
      console.log('Sending refreshed data to popup');
      
      const response = {
        success: true,
        browsingData: data.browsingData || { 
          dailyStats: {},
          totalTime: 0,
          categories: {}
        },
        settings: data.settings || DEFAULT_SETTINGS
      };
      
      console.log('Response data:', response);
      sendResponse && sendResponse(response);
    });
    
    return true; // Keep the message channel open for async response
  }
  
  // Handle getBrowsingData requests from popup
  if (message.type === 'getBrowsingData') {
    console.log('Getting browsing data...');
    
    chrome.storage.local.get(['browsingData', 'settings'], (data) => {
      console.log('Sending browsing data to popup');
      const browsingData = data.browsingData || { dailyStats: {}, totalTime: 0, categories: {} };
      const dailyStats = browsingData.dailyStats || {};
      const dates = Object.keys(dailyStats).sort();
      const latestDate = dates[dates.length - 1];
      const todayStats = dailyStats[latestDate] || {};

      // Debug logs
      console.log('Today stats:', todayStats);
      console.log('Browsing data:', browsingData);

      // Fallback: If todayStats.totalTime is missing, sum domain times
      let totalTime = todayStats.totalTime;
      if (typeof totalTime !== 'number') {
        totalTime = 0;
        if (todayStats.domains) {
          for (const t of Object.values(todayStats.domains)) {
            totalTime += t;
          }
        }
      }

      // Convert domains time from seconds to minutes for display
      const domainsInMinutes = {};
      if (todayStats.domains) {
        Object.entries(todayStats.domains).forEach(([domain, seconds]) => {
          domainsInMinutes[domain] = Math.round((seconds / 60) * 10) / 10; // Convert to minutes with 1 decimal
        });
      }

      // Build the flat object expected by the popup
      const responseData = {
        wellnessScore: todayStats.wellnessScore || { score: 0, insights: [] }, // Ensure insights is always an array
        totalTimeSpent: Math.round((totalTime / 60) * 10) / 10, // Convert seconds to minutes
        dailyAverage: browsingData.dailyAverage || 0,
        focusTime: Math.round(((todayStats.focusTime || 0) / 60) * 10) / 10, // Convert seconds to minutes
        distractions: todayStats.distractions || 0,
        domains: domainsInMinutes, // Use converted domains
        insights: todayStats.insights || [],
        // Add more fields as needed
      };

      const response = {
        success: true,
        browsingData: responseData,
        settings: data.settings || DEFAULT_SETTINGS
      };
      
      console.log('Response data (time converted to minutes):', response);
      console.log('Raw domains data (in seconds):', todayStats.domains);
      console.log('Converted domains data (in minutes):', domainsInMinutes);
      sendResponse && sendResponse(response);
    });
    
    return true; // Keep the message channel open for async response
  }
  
  // Start tracking
  if (message.type === 'startTracking' && tabId !== null) {
    // If there is already a tracking session for this tab, stop it first
    if (tabTracking[tabId]) {
      const prev = tabTracking[tabId];
      const now = message.timestamp;
      const timeSpent = Math.floor((now - prev.start) / 1000);
      console.log(`[MindWell][TIME-DEBUG] Previous session: ${prev.domain}, Duration: ${timeSpent} seconds (${(timeSpent/60).toFixed(2)} minutes)`);
      if (timeSpent > 0 && timeSpent < 3600) {
        const today = new Date().toISOString().split('T')[0];
        chrome.storage.local.get(['browsingData'], (data) => {
          const browsingData = data.browsingData || { dailyStats: {}, totalTime: 0, categories: {} };
          if (!browsingData.dailyStats[today]) {
            browsingData.dailyStats[today] = {
              visits: 0,
              domains: {},
              totalTime: 0,
              wellnessScore: { score: 3, insights: [] }
            };
          }
          const todayData = browsingData.dailyStats[today];
          if (typeof todayData.totalTime !== 'number') todayData.totalTime = 0;
          if (typeof todayData.domains !== 'object') todayData.domains = {};
          if (!todayData.domains[prev.domain]) todayData.domains[prev.domain] = 0;
          todayData.domains[prev.domain] += timeSpent;
          todayData.totalTime += timeSpent;
          todayData.visits = (todayData.visits || 0) + 1;
          // Update wellness score after adding time
          todayData.wellnessScore = calculateDailyScore(todayData.domains, todayData.totalTime);
          // Ensure insights is always an array
          if (!Array.isArray(todayData.wellnessScore.insights)) {
            todayData.wellnessScore.insights = [];
          }
          chrome.storage.local.set({ browsingData }, () => {
            chrome.runtime.sendMessage({ type: 'dataUpdated', browsingData });
            console.log(`[MindWell][DEBUG] (startTracking) Previous session for tab ${tabId} (${prev.domain}): +${timeSpent}s [${new Date(prev.start).toLocaleTimeString()} - ${new Date(now).toLocaleTimeString()}]`);
          });
        });
      }
      delete tabTracking[tabId];
    }
    tabTracking[tabId] = {
      domain: message.domain,
      start: message.timestamp,
      url: message.url // Store URL for better debugging and context
    };
    console.log(`[MindWell][DEBUG] (startTracking) Started tracking tab ${tabId} (${message.domain}) at ${new Date(message.timestamp).toLocaleTimeString()} URL: ${message.url}`);
    sendResponse && sendResponse({ success: true });
    return true;
  }

  // Stop tracking
  if (message.type === 'stopTracking' && tabId !== null) {
    const track = tabTracking[tabId];
    // Check if the stopped session matches the currently tracked session for this tab
    // This prevents stopping an old session if a new one was started (e.g., rapid navigation)
    if (track && track.domain === message.domain && track.start === message.start) {
      const timeSpent = Math.floor((message.stop - message.start) / 1000); // in seconds
      console.log(`[MindWell][TIME-DEBUG] Stop tracking: ${track.domain}, Duration: ${timeSpent} seconds (${(timeSpent/60).toFixed(2)} minutes)`);
      if (timeSpent > 0 && timeSpent < 3600) {
        const today = new Date().toISOString().split('T')[0];
        chrome.storage.local.get(['browsingData'], (data) => {
          const browsingData = data.browsingData || { dailyStats: {}, totalTime: 0, categories: {} };
          if (!browsingData.dailyStats[today]) {
            browsingData.dailyStats[today] = {
              visits: 0,
              domains: {},
              totalTime: 0,
              wellnessScore: { score: 3, insights: [] }
            };
          }
          const todayData = browsingData.dailyStats[today];
          if (typeof todayData.totalTime !== 'number') todayData.totalTime = 0;
          if (typeof todayData.domains !== 'object') todayData.domains = {};
          if (!todayData.domains[track.domain]) todayData.domains[track.domain] = 0;
          todayData.domains[track.domain] += timeSpent;
          todayData.totalTime += timeSpent;
          todayData.visits = (todayData.visits || 0) + 1;
          // Update wellness score after adding time
          todayData.wellnessScore = calculateDailyScore(todayData.domains, todayData.totalTime);
          // Ensure insights is always an array
          if (!Array.isArray(todayData.wellnessScore.insights)) {
            todayData.wellnessScore.insights = [];
          }
          chrome.storage.local.set({ browsingData }, () => {
            chrome.runtime.sendMessage({ type: 'dataUpdated', browsingData });
            console.log(`[MindWell][DEBUG] (stopTracking) Tab ${tabId} (${track.domain}): +${timeSpent}s [${new Date(track.start).toLocaleTimeString()} - ${new Date(message.stop).toLocaleTimeString()}]`);
          });
        });
      }
      delete tabTracking[tabId];
    } else {
      console.log(`[MindWell][DEBUG] (stopTracking) Mismatched or no active session for tab ${tabId}. Expected: ${track ? track.domain : 'N/A'}, Received: ${message.domain}.`);
    }
    sendResponse && sendResponse({ success: true });
    return true;
  }
  
  console.warn('Unhandled message type:', message.type);
  sendResponse && sendResponse({ success: false, error: 'Unhandled message type' });
  return false;
});

// Initialize storage when the extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
  initializeStorage();
});

// Initialize storage on startup
initializeStorage().catch(console.error);

console.log('Service worker started');
