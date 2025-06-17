// Category weights for score calculation
const CATEGORY_WEIGHTS = {
  'positive': 1.0,
  'moderatelyPositive': 0.8,
  'neutral': 0.6,
  'moderatelyNegative': 0.4,
  'negative': 0.2,
  'educational': 1.0,
  'professional': 0.8,
  'health': 1.0,
  'news': 0.6,
  'search': 0.6,
  'reference': 0.6,
  'email': 0.6,
  'social': 0.4,
  'entertainment': 0.4,
  'gaming': 0.2,
  'shopping': 0.4,
  'adult': 0.1,
  'gambling': 0.1,
  'other': 0.5
};

class ScoreBreakdown {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'score-breakdown';
    this.container.innerHTML = `
      <h3>How Your Score is Calculated</h3>
      <div class="breakdown-section">
        <h4>Category Weights</h4>
        <div id="category-weights" class="breakdown-list">
          <!-- Will be populated dynamically -->
          <div class="loading">Loading category data...</div>
        </div>
      </div>
      <div class="breakdown-section">
        <h4>Time-Based Adjustments</h4>
        <div id="time-adjustments" class="breakdown-list">
          <div class="breakdown-item">
            <span class="label">Daily Usage vs Goal</span>
            <span class="value" id="daily-usage">-</span>
          </div>
        </div>
      </div>
      <div class="breakdown-section">
        <h4>Final Score Calculation</h4>
        <div id="final-score" class="breakdown-list">
          <div class="breakdown-item total">
            <span class="label">Your Wellness Score</span>
            <span class="value" id="final-score-value">-</span>
          </div>
        </div>
      </div>
    `;
  }

  async updateBreakdown() {
    try {
      // Get the latest browsing data
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'getBrowsingData' }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError });
            return;
          }
          resolve(response || { success: false, error: 'No response' });
        });
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to load data');
      }

      const browsingData = response.browsingData;
      const settings = response.settings;

      // Get today's data
      const today = new Date().toISOString().split('T')[0];
      const todayData = await new Promise(resolve => {
        chrome.storage.local.get('browsingData', (data) => {
          const browsing = data.browsingData || {};
          const dailyStats = browsing.dailyStats || {};
          resolve(dailyStats[today] || { domains: {}, totalTime: 0, wellnessScore: { score: 50, insights: [] } });
        });
      });

      // Update category weights based on actual domain data
      this.updateCategoryWeights(todayData.domains || {});

      // Update time-based adjustments
      this.updateTimeAdjustments(browsingData, settings);

      // Update final score
      this.updateFinalScore(browsingData);

    } catch (error) {
      console.error('Error updating score breakdown:', error);
      this.showError('Failed to load score breakdown data');
    }
  }

  updateCategoryWeights(domainsData) {
    const container = this.container.querySelector('#category-weights');
    if (!container) return;

    // Categorize domains and calculate time per category
    // domainsData is already in minutes from background.js conversion
    const categoryTime = {};
    let totalTime = 0;

    Object.entries(domainsData).forEach(([domain, timeSpent]) => {
      if (timeSpent <= 0) return;

      const category = this.categorizeDomain(domain);
      categoryTime[category] = (categoryTime[category] || 0) + timeSpent;
      totalTime += timeSpent;
    });

    // Sort categories by time spent (descending)
    const sortedCategories = Object.entries(categoryTime)
      .sort((a, b) => b[1] - a[1]);

    if (sortedCategories.length === 0) {
      container.innerHTML = '<div class="no-data">No browsing data available yet. Start browsing to see your score breakdown!</div>';
      return;
    }

    container.innerHTML = '';

    // Add each category with its weight and time spent
    sortedCategories.forEach(([category, minutes]) => {
      const weight = CATEGORY_WEIGHTS[category] || 0.5;
      const displayMinutes = Math.round(minutes * 10) / 10; // Round to 1 decimal
      const percentage = totalTime > 0 ? ((minutes / totalTime) * 100).toFixed(1) : 0;
      const score = this.getCategoryScore(category);

      const item = document.createElement('div');
      item.className = 'breakdown-item';
      item.innerHTML = `
        <div class="category-header">
          <span class="category-name">${this.formatCategoryName(category)}</span>
          <span class="category-score">Score: ${score}/5</span>
        </div>
        <div class="category-details">
          <span class="time-spent">${displayMinutes} min (${percentage}%)</span>
          <span class="weight">Impact: ${this.getImpactLabel(score)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress ${this.getProgressClass(score)}" style="width: ${percentage}%"></div>
        </div>
      `;

      container.appendChild(item);
    });
  }

  updateTimeAdjustments(browsingData, settings) {
    const container = this.container.querySelector('#time-adjustments');
    if (!container) return;

    // browsingData.totalTimeSpent is already in minutes from background.js conversion
    const dailyUsage = Math.round(browsingData.totalTimeSpent || 0);
    const dailyGoal = settings.dailyGoal || 120; // Default 2 hours
    const overage = Math.max(0, dailyUsage - dailyGoal);
    const timePenalty = Math.min(20, Math.max(0, overage / dailyGoal * 40));

    const usageStatus = dailyUsage <= dailyGoal ? 'within-goal' : 'over-goal';

    container.innerHTML = `
      <div class="breakdown-item">
        <span class="label">Daily Usage</span>
        <span class="value ${usageStatus}">${dailyUsage} min / ${dailyGoal} min</span>
      </div>
      <div class="breakdown-item">
        <span class="label">Overage</span>
        <span class="value ${overage > 0 ? 'negative' : 'neutral'}">${overage} min</span>
      </div>
      <div class="breakdown-item">
        <span class="label">Time Penalty</span>
        <span class="value ${timePenalty > 0 ? 'negative' : 'neutral'}">-${timePenalty.toFixed(1)} points</span>
      </div>
      <div class="breakdown-item">
        <span class="label">Focus Time</span>
        <span class="value positive">${Math.round(browsingData.focusTime || 0)} min</span>
      </div>
    `;
  }

  updateFinalScore(browsingData) {
    const container = this.container.querySelector('#final-score-value');
    if (container) {
      const score = browsingData.wellnessScore?.score || 50;
      container.textContent = `${score}/100`;

      // Add score interpretation
      const interpretation = this.getScoreInterpretation(score);
      const interpretationEl = this.container.querySelector('#score-interpretation');
      if (interpretationEl) {
        interpretationEl.textContent = interpretation;
      } else {
        const interpretationDiv = document.createElement('div');
        interpretationDiv.id = 'score-interpretation';
        interpretationDiv.className = 'score-interpretation';
        interpretationDiv.textContent = interpretation;
        container.parentNode.appendChild(interpretationDiv);
      }
    }
  }

  // Helper methods
  categorizeDomain(domain) {
    const domainLower = domain.toLowerCase();

    // Educational sites
    if (domainLower.includes('edu') || domainLower.includes('coursera') ||
        domainLower.includes('udemy') || domainLower.includes('khan')) {
      return 'positive';
    }

    // Social media
    if (domainLower.includes('facebook') || domainLower.includes('twitter') ||
        domainLower.includes('instagram') || domainLower.includes('tiktok') ||
        domainLower.includes('reddit') || domainLower.includes('linkedin')) {
      return 'moderatelyNegative';
    }

    // Entertainment
    if (domainLower.includes('youtube') || domainLower.includes('netflix') ||
        domainLower.includes('twitch') || domainLower.includes('spotify')) {
      return 'moderatelyNegative';
    }

    // News
    if (domainLower.includes('news') || domainLower.includes('bbc') ||
        domainLower.includes('cnn') || domainLower.includes('reuters')) {
      return 'moderatelyPositive';
    }

    // Professional
    if (domainLower.includes('github') || domainLower.includes('stackoverflow') ||
        domainLower.includes('docs.') || domainLower.includes('developer')) {
      return 'positive';
    }

    return 'neutral';
  }

  getCategoryScore(category) {
    const scoreMap = {
      'positive': 5,
      'moderatelyPositive': 4,
      'neutral': 3,
      'moderatelyNegative': 2,
      'negative': 1
    };
    return scoreMap[category] || 3;
  }

  getImpactLabel(score) {
    if (score >= 5) return 'Very Positive';
    if (score >= 4) return 'Positive';
    if (score >= 3) return 'Neutral';
    if (score >= 2) return 'Negative';
    return 'Very Negative';
  }

  getProgressClass(score) {
    if (score >= 4) return 'positive';
    if (score >= 3) return 'neutral';
    return 'negative';
  }

  getScoreInterpretation(score) {
    if (score >= 80) return 'Excellent! Your browsing habits support your digital well-being.';
    if (score >= 60) return 'Good! You\'re maintaining healthy browsing habits.';
    if (score >= 40) return 'Fair. Consider spending more time on productive websites.';
    if (score >= 20) return 'Needs improvement. Try to reduce time on distracting sites.';
    return 'Poor. Your browsing habits may be negatively impacting your well-being.';
  }

  showError(message) {
    const container = this.container.querySelector('#category-weights');
    if (container) {
      container.innerHTML = `<div class="error-message">${message}</div>`;
    }
  }

  formatCategoryName(category) {
    const nameMap = {
      'positive': 'Educational & Productive',
      'moderatelyPositive': 'News & Information',
      'neutral': 'General Browsing',
      'moderatelyNegative': 'Social & Entertainment',
      'negative': 'Distracting Content'
    };
    return nameMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }

  show() {
    this.container.style.display = 'block';
    this.updateBreakdown();
  }

  hide() {
    this.container.style.display = 'none';
  }

  getElement() {
    return this.container;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScoreBreakdown;
} else {
  window.ScoreBreakdown = ScoreBreakdown;
}
