/**
 * Javascript port of custom_wordlist.py
 * Original contribution - Team AAT, BMSCE Cryptography
 * Generates a targeted wordlist from personal info patterns
 * Enhanced to split multi-word name and college inputs into individual bases.
 */
export const generateWordlistJS = (name = '', birthYear = '', college = '', favoriteWord = '') => {
  name = name.toLowerCase();
  const year = String(birthYear || '2004');
  const day = '14'; // Mock default day
  const mon = '03'; // Mock default month
  const dob = `${year}-${mon}-${day}`;
  college = college.toLowerCase();
  const fav = favoriteWord.toLowerCase();

  // Split name and college into separate words to support first/last name variations
  const nameParts = name.split(/\s+/).filter(p => p.length >= 1);
  const collegeParts = college.split(/\s+/).filter(p => p.length >= 1 && !['of', 'the', 'and', 'for', 'college', 'univ', 'institute', 'school'].includes(p));

  // Helper to generate subsets and permutations of elements
  const getSubsets = (arr) => {
    if (arr.length === 0) return [[]];
    const first = arr[0];
    const rest = arr.slice(1);
    const sub = getSubsets(rest);
    return [...sub, ...sub.map(s => [first, ...s])];
  };

  const getPermutations = (arr) => {
    if (arr.length === 0) return [[]];
    const first = arr[0];
    const rest = arr.slice(1);
    const subperms = getPermutations(rest);
    const perms = [];
    for (const sub of subperms) {
      for (let i = 0; i <= sub.length; i++) {
        const copy = [...sub];
        copy.splice(i, 0, first);
        perms.push(copy);
      }
    }
    return perms;
  };

  // 1. Generate name shortforms
  const nameShortforms = [];
  if (nameParts.length > 0) {
    // Basic initials
    const initials = nameParts.map(p => p.charAt(0)).join('');
    if (initials.length >= 1) {
      nameShortforms.push(initials);
      // Repeating letter combinations of initials (like pjmj, pjmp, etc.)
      for (let i = 0; i < initials.length; i++) {
        nameShortforms.push(initials + initials.charAt(i));
        nameShortforms.push(initials.charAt(i) + initials);
      }
    }
    
    // Subsets and permutations of initials (e.g. pj, jm, pm, pjm, jmp)
    const nameInitialsList = nameParts.map(p => p.charAt(0));
    const subsets = getSubsets(nameInitialsList);
    for (const sub of subsets) {
      if (sub.length >= 1) {
        const perms = getPermutations(sub);
        for (const perm of perms) {
          const permStr = perm.join('');
          nameShortforms.push(permStr);
          // Generate repetitions (like pjmj, pjmp)
          for (let i = 0; i < permStr.length; i++) {
            nameShortforms.push(permStr + permStr.charAt(i));
            nameShortforms.push(permStr.charAt(i) + permStr);
          }
        }
      }
    }

    // Substrings of name parts (first 2, 3, 4 letters)
    nameParts.forEach(p => {
      if (p.length >= 2) nameShortforms.push(p.slice(0, 2));
      if (p.length >= 3) nameShortforms.push(p.slice(0, 3));
      if (p.length >= 4) nameShortforms.push(p.slice(0, 4));
    });
  }
  const uniqueNameShortforms = Array.from(new Set(nameShortforms.filter(s => s.length > 0)));

  // 2. Generate college shortforms
  const collegeShortforms = [];
  if (collegeParts.length > 0) {
    const collInitials = collegeParts.map(p => p.charAt(0)).join('');
    if (collInitials.length >= 1) {
      collegeShortforms.push(collInitials);
      for (let i = 0; i < collInitials.length; i++) {
        collegeShortforms.push(collInitials + collInitials.charAt(i));
        collegeShortforms.push(collInitials.charAt(i) + collInitials);
      }
    }
    
    // Subsets and permutations of college initials
    const subsets = getSubsets(collegeParts.map(p => p.charAt(0)));
    for (const sub of subsets) {
      if (sub.length >= 1) {
        const perms = getPermutations(sub);
        for (const perm of perms) {
          const permStr = perm.join('');
          collegeShortforms.push(permStr);
          for (let i = 0; i < permStr.length; i++) {
            collegeShortforms.push(permStr + permStr.charAt(i));
            collegeShortforms.push(permStr.charAt(i) + permStr);
          }
        }
      }
    }

    collegeParts.forEach(p => {
      collegeShortforms.push(p);
      if (p.length >= 2) collegeShortforms.push(p.slice(0, 2));
      if (p.length >= 3) collegeShortforms.push(p.slice(0, 3));
      if (p.length >= 4) collegeShortforms.push(p.slice(0, 4));
    });
  }
  const uniqueCollegeShortforms = Array.from(new Set(collegeShortforms.filter(s => s.length > 0)));

  // 3. Generate favorite word shortforms
  const favShortforms = [];
  if (fav.length > 0) {
    favShortforms.push(fav);
    if (fav.length >= 2) favShortforms.push(fav.slice(0, 2));
    if (fav.length >= 3) favShortforms.push(fav.slice(0, 3));
    if (fav.length >= 4) favShortforms.push(fav.slice(0, 4));
  }
  const uniqueFavShortforms = Array.from(new Set(favShortforms.filter(s => s.length > 0)));

  const basesSet = new Set([
    name, name.charAt(0).toUpperCase() + name.slice(1), name.toUpperCase(),
    fav, fav.charAt(0).toUpperCase() + fav.slice(1), fav.toUpperCase(),
    college, college.charAt(0).toUpperCase() + college.slice(1), college.toUpperCase(),
    year, day + mon, mon + year, day + mon + year,
    dob.replace(/-/g, ''), dob.replace(/-/g, '.'),
    name + fav, fav + name,
    name + college, college + name,
    fav + college, college + fav,
  ]);

  // Add all shortforms to basesSet so they get general prefix/suffix/leet treatment
  uniqueNameShortforms.forEach(sf => {
    basesSet.add(sf);
    basesSet.add(sf.toUpperCase());
    basesSet.add(sf.charAt(0).toUpperCase() + sf.slice(1));
  });
  uniqueCollegeShortforms.forEach(sf => {
    basesSet.add(sf);
    basesSet.add(sf.toUpperCase());
    basesSet.add(sf.charAt(0).toUpperCase() + sf.slice(1));
  });
  uniqueFavShortforms.forEach(sf => {
    basesSet.add(sf);
    basesSet.add(sf.toUpperCase());
    basesSet.add(sf.charAt(0).toUpperCase() + sf.slice(1));
  });

  // Add individual name parts as bases
  for (const part of nameParts) {
    basesSet.add(part);
    basesSet.add(part.charAt(0).toUpperCase() + part.slice(1));
    basesSet.add(part.toUpperCase());
    
    // Add part combos
    basesSet.add(part + fav);
    basesSet.add(fav + part);
    basesSet.add(part + year);
    basesSet.add(part + '@' + year);
  }

  // Add individual college parts as bases
  for (const part of collegeParts) {
    basesSet.add(part);
    basesSet.add(part.charAt(0).toUpperCase() + part.slice(1));
    basesSet.add(part.toUpperCase());
  }

  // Expand bases with extra variations: reversed, double, toggle/alternate cases
  const extraBases = new Set();
  basesSet.forEach(base => {
    if (!base) return;
    
    // 1. Reversed bases
    const rev = base.split('').reverse().join('');
    extraBases.add(rev);
    extraBases.add(rev.charAt(0).toUpperCase() + rev.slice(1));
    extraBases.add(rev.toUpperCase());
    
    // 2. Double bases
    extraBases.add(base + base);
    
    // 3. Toggle/alternate cases
    let alt1 = '';
    let alt2 = '';
    for (let i = 0; i < base.length; i++) {
      if (i % 2 === 0) {
        alt1 += base.charAt(i).toUpperCase();
        alt2 += base.charAt(i).toLowerCase();
      } else {
        alt1 += base.charAt(i).toLowerCase();
        alt2 += base.charAt(i).toUpperCase();
      }
    }
    extraBases.add(alt1);
    extraBases.add(alt2);
    
    // Swap case
    let swap = '';
    for (let i = 0; i < base.length; i++) {
      const c = base.charAt(i);
      swap += (c === c.toUpperCase()) ? c.toLowerCase() : c.toUpperCase();
    }
    extraBases.add(swap);
  });
  extraBases.forEach(b => basesSet.add(b));

  const bases = Array.from(basesSet);

  const suffixes = Array.from(new Set([
    '', '1', '12', '123', '1234', '12345', '123456', '1234567', '12345678', '123456789', '1234567890',
    '!', '@', '#', '$', '%', '^', '&', '*', '?', '!!', '@@', '!!!', '@@@',
    '@123', '#123', '!123', '123!', '1234!', '12345!', '123456!',
    '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030',
    '@2024', '@2025', '@2026',
    year, '@' + year, '#' + year, '!' + year, '.' + year, '_' + year, '-' + year,
    year.slice(-2), '@' + year.slice(-2),
    day, mon, day + mon, mon + day, day + mon + year, mon + day + year,
    '0', '00', '000', '11', '22', '33', '44', '55', '66', '77', '88', '99',
    '786', '007', '999', '111', '69', '420', 'abc', 'xyz', 'qwerty', 'qwe', 'asd', 'zxc',
  ].filter(Boolean)));

  const prefixes = ['', '@', '#', '!', 'the', 'my', 'i_am_', 'its', 'iam', 'we_are', 'this_is', 'mr', 'ms', 'dr'];

  const wordlist = new Set();

  // Add common fallback weak passwords
  const commonWeak = [
    '123456', '12345678', '123456789', 'password', 'admin', 'welcome', 
    'qwerty', 'pass123', 'letmein', '12345', '1234567', 'password123',
    'password1234', 'admin123', 'admin1234', 'welcome123', 'welcome1',
    'iloveyou', 'princess', 'monkey', 'trustno1', 'shadow', 'superman'
  ];
  for (const cw of commonWeak) {
    wordlist.add(cw);
  }

  for (const base of bases) {
    if (!base) continue;

    // base + suffix
    for (const suf of suffixes) {
      wordlist.add(base + suf);
    }

    // prefix + base
    for (const pre of prefixes) {
      wordlist.add(pre + base);
    }

    // leet speak style 1 (light substitutions)
    const leet1 = base
      .replace(/a/g, '@')
      .replace(/e/g, '3')
      .replace(/i/g, '1')
      .replace(/o/g, '0')
      .replace(/s/g, '$')
      .replace(/t/g, '+');
    wordlist.add(leet1);
    wordlist.add(leet1 + '123');
    wordlist.add(leet1 + '!');
    wordlist.add(leet1 + '@' + year);

    // leet speak style 2 (heavy substitutions)
    const leet2 = base
      .replace(/a/g, '4')
      .replace(/b/g, '8')
      .replace(/e/g, '3')
      .replace(/g/g, '9')
      .replace(/i/g, '1')
      .replace(/l/g, '1')
      .replace(/o/g, '0')
      .replace(/s/g, '5')
      .replace(/t/g, '7')
      .replace(/z/g, '2');
    wordlist.add(leet2);
    wordlist.add(leet2 + '123');
    wordlist.add(leet2 + '!');
    wordlist.add(leet2 + '@' + year);

    // Capitalise first + suffix
    const capBase = base.charAt(0).toUpperCase() + base.slice(1);
    wordlist.add(capBase + '123');
    wordlist.add(capBase + '@' + year);
    wordlist.add(capBase + '!');
  }

  // Generate explicit combo permutations: shortform + special + year
  const yearFormats = [year, year.slice(-2)];
  const specialChars = ['@', '#', '!', '$', '_', '-', '.', '&', '*', '%', ''];

  const allShortforms = Array.from(new Set([
    ...uniqueNameShortforms,
    ...uniqueCollegeShortforms,
    ...uniqueFavShortforms
  ]));

  // Add casing variations for all shortforms in combo permutations
  const shortformVariants = [];
  allShortforms.forEach(sf => {
    shortformVariants.push(sf.toLowerCase());
    shortformVariants.push(sf.toUpperCase());
    if (sf.length > 0) {
      shortformVariants.push(sf.charAt(0).toUpperCase() + sf.slice(1).toLowerCase());
    }
  });
  const uniqueShortformVariants = Array.from(new Set(shortformVariants.filter(s => s.length > 0)));

  for (const sf of uniqueShortformVariants) {
    for (const yr of yearFormats) {
      for (const sp of specialChars) {
        // e.g. sf + sp + yr
        wordlist.add(`${sf}${sp}${yr}`);
        wordlist.add(`${sf}${yr}${sp}`);
        wordlist.add(`${sp}${sf}${yr}`);
        wordlist.add(`${yr}${sp}${sf}`);
        wordlist.add(`${yr}${sf}${sp}`);
        wordlist.add(`${sp}${yr}${sf}`);
      }
    }
  }

  // Extra targeted combos
  const combos = [
    name + year + '!',
    fav + year + '!',
    name + '@' + year,
    fav + '@' + year,
    name + '.' + year,
    fav + '.' + year,
    name + '_' + fav,
    fav + '_' + name,
    name + day + mon + year,
    college + year,
    college + '@' + year,
    name + mon + year,
    fav + mon + year,
    name.length > 0 && fav.length > 0 ? (name.charAt(0).toUpperCase() + name.slice(1) + fav.charAt(0).toUpperCase() + fav.slice(1)) : '',
    name.length > 0 && fav.length > 0 ? (fav.charAt(0).toUpperCase() + fav.slice(1) + name.charAt(0).toUpperCase() + name.slice(1)) : '',
    name + fav + year,
    fav + name + year,
  ].filter(c => c.length > 0);

  for (const c of combos) {
    wordlist.add(c);
  }

  return Array.from(wordlist).sort();
};
