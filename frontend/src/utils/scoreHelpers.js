/**
 * Score calculation helper functions
 */

/**
 * Compute the three main pillars from evaluation scores
 * @param {Object} evaluation - Evaluation object with methodology_score, rapport_score, etc.
 * @returns {Object} Object with exec, meth, and prog scores
 */
export const computePillars = (evaluation) => {
  if (!evaluation) return { exec: 0, meth: 0, prog: 0 };
  
  return {
    exec: evaluation.rapport_score || 0,
    meth: evaluation.methodology_score || 0,
    prog: ((evaluation.progress_score || 0) + (evaluation.outcome_score || 0)) / 2,
  };
};

/**
 * Compute weighted pillars
 * @param {Object} evaluation - Evaluation object
 * @returns {Object} Object with weighted exec, meth, and prog scores
 */
export const computeWeightedPillars = (evaluation) => {
  if (!evaluation) return { exec: 0, meth: 0, prog: 0, total: 0 };
  
  // Weight definitions
  const weights = {
    methodology: 0.40, // 40%
    rapport: 0.25,     // 25%
    progress: 0.20,    // 20%
    outcome: 0.15      // 15%
  };
  
  const exec = weights.rapport * (evaluation.rapport_score || 0);
  const meth = weights.methodology * (evaluation.methodology_score || 0);
  const prog = weights.progress * (evaluation.progress_score || 0) + 
               weights.outcome * (evaluation.outcome_score || 0);
  
  // Calculate total weighted score
  const total = exec + meth + prog;
  
  return { exec, meth, prog, total };
};

/**
 * Exponential moving average for smooth score updates
 * @param {number} currentValue - Current EMA value
 * @param {number} newValue - New value to incorporate
 * @param {number} alpha - Smoothing factor (0-1), default 0.88
 * @returns {number} New EMA value
 */
export const calculateEMA = (currentValue, newValue, alpha = 0.88) => {
  if (currentValue === null || currentValue === undefined) return newValue;
  return alpha * newValue + (1 - alpha) * currentValue;
};

/**
 * Calculate final score with bonuses
 * @param {number} currentScore - Base weighted score
 * @param {Object} options - Options including time data, goal data, and difficulty
 * @returns {number} Final score with all bonuses applied
 */
export const calculateFinalScore = (currentScore, options = {}) => {
  const {
    timeRemaining = 0,
    timeLimit = 300,
    goalCurrent = 0,
    goalTarget = 80,
    difficulty = 1
  } = options;
  
  // Base score
  let finalScore = currentScore;
  
  // Time bonus (up to 10%)
  const timeBonus = Math.min(10, (timeRemaining / timeLimit) * 10);
  
  // Goal bonus (up to 15%)
  let goalBonus = 0;
  if (goalCurrent >= goalTarget) {
    goalBonus = 15; // Full bonus
  } else if (goalCurrent >= goalTarget * 0.6) {
    goalBonus = 5; // Partial bonus
  }
  
  // Difficulty multiplier
  const difficultyMultiplier = 1 + (0.1 * (difficulty - 1));
  
  // Apply bonuses and multiplier
  finalScore = (finalScore + timeBonus + goalBonus) * difficultyMultiplier;
  
  // Cap at 100
  return Math.min(100, Math.max(0, finalScore));
}; 