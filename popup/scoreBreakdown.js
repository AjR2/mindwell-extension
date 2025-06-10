class ScoreBreakdown {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'score-breakdown';
    this.container.style.display = 'none';
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
      // Get the latest data
      const [stats, categoryTimeSpent, settings] = await Promise.all([
        new Promise(resolve => chrome.storage.local.get('stats', data => resolve(data.stats || {}))),
        new Promise(resolve => chrome.storage.local.get('categoryTimeSpent', data => resolve(data.categoryTimeSpent || {}))),
        new Promise(resolve => chrome.storage.local.get('settings', data => resolve(data.settings || {})))
      ]);

      // Update category weights
      this.updateCategoryWeights(categoryTimeSpent);
      
      // Update time-based adjustments
      this.updateTimeAdjustments(stats, settings);
      
      // Update final score
      this.updateFinalScore(stats);
      
    } catch (error) {
      console.error('Error updating score breakdown:', error);
    }
  }

  updateCategoryWeights(categoryTimeSpent) {
    const container = this.container.querySelector('#category-weights');
    if (!container) return;

    // Sort categories by time spent (descending)
    const sortedCategories = Object.entries(categoryTimeSpent)
      .filter(([key]) => key !== 'lastUpdated')
      .sort((a, b) => b[1] - a[1]);

    if (sortedCategories.length === 0) {
      container.innerHTML = '<div class="no-data">No category data available yet.</div>';
      return;
    }

    container.innerHTML = '';
    
    // Add each category with its weight and time spent
    sortedCategories.forEach(([category, seconds]) => {
      if (seconds <= 0) return;
      
      const weight = CATEGORY_WEIGHTS[category] || 0.5;
      const minutes = Math.round(seconds / 60 * 10) / 10; // Convert to minutes with 1 decimal
      const contribution = (weight * 100).toFixed(0);
      
      const item = document.createElement('div');
      item.className = 'breakdown-item';
      item.innerHTML = `
        <span class="category-name">${this.formatCategoryName(category)}</span>
        <span class="time-spent">${minutes} min</span>
        <span class="weight">Weight: ${weight.toFixed(1)}</span>
        <div class="progress-bar">
          <div class="progress" style="width: ${contribution}%"></div>
        </div>
      `;
      
      container.appendChild(item);
    });
  }

  updateTimeAdjustments(stats, settings) {
    const container = this.container.querySelector('#time-adjustments');
    if (!container) return;
    
    const dailyUsage = stats.dailyUsage || 0;
    const dailyGoal = settings.dailyGoal || 120; // Default 2 hours
    const overage = Math.max(0, dailyUsage - dailyGoal);
    const timePenalty = Math.min(20, Math.max(0, overage / dailyGoal * 40));
    
    container.innerHTML = `
      <div class="breakdown-item">
        <span class="label">Daily Usage</span>
        <span class="value">${Math.round(dailyUsage)} min / ${dailyGoal} min</span>
      </div>
      <div class="breakdown-item">
        <span class="label">Overage</span>
        <span class="value">${Math.round(overage)} min</span>
      </div>
      <div class="breakdown-item">
        <span class="label">Time Penalty</span>
        <span class="value">-${timePenalty.toFixed(1)} points</span>
      </div>
    `;
  }

  updateFinalScore(stats) {
    const container = this.container.querySelector('#final-score-value');
    if (container && stats.wellnessScore !== undefined) {
      container.textContent = `${stats.wellnessScore}/100`;
    }
  }

  formatCategoryName(category) {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
