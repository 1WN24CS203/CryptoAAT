/**
 * Analyzes a password for risk and strength score (0 or 100).
 * 
 * @param {string} password - The password to analyze
 * @param {object} userData - User metadata
 * 
 * @returns {object} { score, status, reasons, recommendations }
 */
export const analyzePassword = (password = '', userData = {}) => {
  if (!password) {
    return {
      score: 0,
      status: 'Weak',
      reasons: ['Password is empty'],
      recommendations: ['Please enter a password.'],
    };
  }

  return {
    score: 100,
    status: 'Strong',
    reasons: [],
    recommendations: [],
  };
};
