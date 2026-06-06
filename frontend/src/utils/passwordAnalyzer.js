/**
 * Analyzes a password for risk and strength score (0 to 100).
 * Matches backend algorithm.
 */
export const analyzePasswordClient = (password = '', userData = {}) => {
  let score = 0;
  const reasons = [];
  const recommendations = [];

  const { name = '', email = '', birthYear = '', collegeName = '', favoriteWord = '' } = userData;

  if (!password) {
    return {
      score: 0,
      status: 'Weak',
      reasons: ['Password is empty'],
      recommendations: ['Please enter a password.'],
    };
  }

  // Length contribution
  const len = password.length;
  if (len >= 12) {
    score += 40;
  } else if (len >= 8) {
    score += 25;
  } else if (len >= 6) {
    score += 10;
  } else {
    score += 5;
    reasons.push('Password is extremely short (under 6 characters)');
  }

  // Character variety contributions
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (hasLower) score += 15;
  if (hasUpper) score += 15;
  else {
    reasons.push('Does not contain uppercase letters');
    recommendations.push('Add at least one uppercase letter (A-Z).');
  }

  if (hasDigit) score += 15;
  else {
    reasons.push('Does not contain numbers');
    recommendations.push('Include at least one numerical digit (0-9).');
  }

  if (hasSpecial) score += 15;
  else {
    reasons.push('Does not contain special characters');
    recommendations.push('Include at least one special character (e.g. !, @, #, $, %, etc.).');
  }

  if (len < 12) {
    recommendations.push('Increase password length to 12 or more characters.');
  }

  // Deductions
  const lowerPassword = password.toLowerCase();

  // Name check
  if (name && name.length >= 2) {
    const nameParts = name.toLowerCase().split(/\s+/);
    let nameMatch = false;
    for (const part of nameParts) {
      if (part.length >= 2 && lowerPassword.includes(part)) {
        nameMatch = true;
      }
    }
    if (nameMatch) {
      score -= 25;
      reasons.push('Contains your name or parts of it');
      recommendations.push('Remove any personal name or nicknames from your password.');
    }
  }

  // Birth Year check
  if (birthYear && birthYear.length >= 2) {
    if (lowerPassword.includes(birthYear.toLowerCase())) {
      score -= 25;
      reasons.push('Contains your birth year');
      recommendations.push('Avoid including your birth year or other significant calendar years.');
    }
  }

  // Email Username check
  if (email) {
    const emailUsername = email.split('@')[0].toLowerCase();
    if (emailUsername && emailUsername.length >= 3 && lowerPassword.includes(emailUsername)) {
      score -= 25;
      reasons.push('Contains your email username');
      recommendations.push('Do not reuse parts of your email username inside the password.');
    }
  }

  // College Name check
  if (collegeName && collegeName.length >= 2) {
    const collegeParts = collegeName.toLowerCase().split(/\s+/);
    let collegeMatch = false;
    for (const part of collegeParts) {
      if (part.length > 2 && !['the', 'for', 'and', 'college', 'univ', 'institute', 'school'].includes(part) && lowerPassword.includes(part)) {
        collegeMatch = true;
      }
    }
    if (collegeMatch || lowerPassword.includes(collegeName.toLowerCase())) {
      score -= 20;
      reasons.push('Contains your college name or parts of it');
      recommendations.push('Avoid using your college name or details in your password.');
    }
  }

  // Favorite Word check
  if (favoriteWord && favoriteWord.length >= 2) {
    if (lowerPassword.includes(favoriteWord.toLowerCase())) {
      score -= 20;
      reasons.push('Contains your favorite word');
      recommendations.push('Do not include your stated favorite words directly.');
    }
  }

  // Common Patterns Check
  const commonPatterns = ['123', '1234', 'qwerty', 'password', '123456', 'abc', 'admin', 'welcome', 'pass123', 'letmein'];
  let patternFound = false;
  for (const pattern of commonPatterns) {
    if (lowerPassword.includes(pattern)) {
      patternFound = true;
    }
  }
  if (patternFound) {
    score -= 30;
    reasons.push('Contains easy-to-guess common sequences or words');
    recommendations.push('Avoid using predictable sequential keys or common dictionary words.');
  }

  score = Math.max(0, Math.min(100, score));

  let status = 'Strong';
  if (score < 40) {
    status = 'Weak';
  } else if (score < 75) {
    status = 'Medium';
  }

  if (score >= 75 && recommendations.length === 0) {
    recommendations.push('Excellent! Your password follows strong safety guidelines.');
  }

  return {
    score,
    status,
    reasons,
    recommendations,
  };
};
