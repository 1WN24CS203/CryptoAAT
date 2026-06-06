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

  const reasons = [];
  const recommendations = [];

  const lowerPassword = password.toLowerCase();
  const name = (userData.name || '').toLowerCase();
  const college = (userData.collegeName || '').toLowerCase();
  const favWord = (userData.favoriteWord || '').toLowerCase();
  const dob = userData.dob || '';

  // Extract DOB parts
  const dobParts = dob.split('-');
  const year = dobParts[0] || '';
  const month = dobParts[1] || '';
  const day = dobParts[2] || '';

  // Check length
  if (password.length < 8) {
    reasons.push('Password is too short (less than 8 characters)');
    recommendations.push('Make your password at least 8 characters long.');
  }

  // Check personal info leaks
  if (name && name.length > 2 && lowerPassword.includes(name)) {
    reasons.push('Password contains your name');
    recommendations.push('Avoid using your name or initials in your password.');
  }

  if (college && college.length > 2 && lowerPassword.includes(college)) {
    reasons.push('Password contains your college name');
    recommendations.push('Do not use your college name in your password.');
  }

  if (favWord && favWord.length > 2 && lowerPassword.includes(favWord)) {
    reasons.push('Password contains your favorite word');
    recommendations.push('Avoid using your favorite word in your password.');
  }

  if (year && lowerPassword.includes(year)) {
    reasons.push('Password contains your birth year');
    recommendations.push('Avoid using your birth year in your password.');
  }

  if (day && month && (lowerPassword.includes(day + month) || lowerPassword.includes(month + day))) {
    reasons.push('Password contains your birth day and month');
    recommendations.push('Do not use your birth date in your password.');
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (!hasLetter || !hasDigit || !hasSpecial) {
    reasons.push('Password lacks complexity (requires letters, numbers, and symbols)');
    recommendations.push('Combine uppercase letters, lowercase letters, numbers, and symbols (e.g. @, #, $).');
  }

  const isWeak = reasons.length > 0;
  const score = isWeak ? 0 : 100;
  const status = isWeak ? 'Weak' : 'Strong';

  return {
    score,
    status,
    reasons: isWeak ? reasons : [],
    recommendations: isWeak ? recommendations : [],
  };
};
