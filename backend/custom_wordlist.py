# custom_wordlist.py
# Original contribution - Team AAT, BMSCE Cryptography
# Generates a targeted wordlist from personal info patterns

def generate_wordlist(name, dob, college, favourite_word,
                      output_file='custom_wordlist.txt'):

    name    = name.lower()
    year    = dob.split('-')[0]      # e.g. 2004
    day     = dob.split('-')[2]      # e.g. 14
    mon     = dob.split('-')[1]      # e.g. 03
    college = college.lower()
    fav     = favourite_word.lower()

    # Split name and college into separate words to support first/last name variations
    name_parts = [p for p in name.split() if len(p) >= 1]
    college_parts = [p for p in college.split() if len(p) >= 1 and p not in ['of', 'the', 'and', 'for', 'college', 'univ', 'institute', 'school']]

    # Helper for combinations/permutations
    def get_subsets(arr):
        if len(arr) == 0:
            return [[]]
        first = arr[0]
        rest = arr[1:]
        sub = get_subsets(rest)
        return sub + [[first] + s for s in sub]

    def get_permutations(arr):
        import itertools
        return [list(p) for p in itertools.permutations(arr)]

    # 1. Generate name shortforms
    name_shortforms = []
    if len(name_parts) > 0:
        # Basic initials
        initials = "".join([p[0] for p in name_parts])
        if len(initials) >= 1:
            name_shortforms.append(initials)
            # Repeating letter combinations of initials (like pjmj, pjmp, etc.)
            for i in range(len(initials)):
                name_shortforms.append(initials + initials[i])
                name_shortforms.append(initials[i] + initials)
        
        # Subsets and permutations of initials
        name_initials_list = [p[0] for p in name_parts]
        subsets = get_subsets(name_initials_list)
        for sub in subsets:
            if len(sub) >= 1:
                perms = get_permutations(sub)
                for perm in perms:
                    perm_str = "".join(perm)
                    name_shortforms.append(perm_str)
                    # Generate repetitions (like pjmj, pjmp)
                    for i in range(len(perm_str)):
                        name_shortforms.append(perm_str + perm_str[i])
                        name_shortforms.append(perm_str[i] + perm_str)

        # Substrings of name parts (first 2, 3, 4 letters)
        for p in name_parts:
            if len(p) >= 2:
                name_shortforms.append(p[:2])
            if len(p) >= 3:
                name_shortforms.append(p[:3])
            if len(p) >= 4:
                name_shortforms.append(p[:4])
    unique_name_shortforms = list(set([s for s in name_shortforms if len(s) > 0]))

    # 2. Generate college shortforms
    college_shortforms = []
    if len(college_parts) > 0:
        coll_initials = "".join([p[0] for p in college_parts])
        if len(coll_initials) >= 1:
            college_shortforms.append(coll_initials)
            for i in range(len(coll_initials)):
                college_shortforms.append(coll_initials + coll_initials[i])
                college_shortforms.append(coll_initials[i] + coll_initials)
        
        # Subsets and permutations of college initials
        subsets = get_subsets([p[0] for p in college_parts])
        for sub in subsets:
            if len(sub) >= 1:
                perms = get_permutations(sub)
                for perm in perms:
                    perm_str = "".join(perm)
                    college_shortforms.append(perm_str)
                    for i in range(len(perm_str)):
                        college_shortforms.append(perm_str + perm_str[i])
                        college_shortforms.append(perm_str[i] + perm_str)

        for p in college_parts:
            college_shortforms.append(p)
            if len(p) >= 2:
                college_shortforms.append(p[:2])
            if len(p) >= 3:
                college_shortforms.append(p[:3])
            if len(p) >= 4:
                college_shortforms.append(p[:4])
    unique_college_shortforms = list(set([s for s in college_shortforms if len(s) > 0]))

    # 3. Generate favorite word shortforms
    fav_shortforms = []
    if len(fav) > 0:
        fav_shortforms.append(fav)
        if len(fav) >= 2:
            fav_shortforms.append(fav[:2])
        if len(fav) >= 3:
            fav_shortforms.append(fav[:3])
        if len(fav) >= 4:
            fav_shortforms.append(fav[:4])
    unique_fav_shortforms = list(set([s for s in fav_shortforms if len(s) > 0]))

    bases = {
        name, name.capitalize(), name.upper(),
        fav, fav.capitalize(), fav.upper(),
        college, college.capitalize(), college.upper(),
        year, day+mon, mon+year, day+mon+year,
        dob.replace('-',''), dob.replace('-','.'),
        name+fav, fav+name,
        name+college, college+name,
        fav+college, college+fav,
    }

    # Add all shortforms to bases
    for sf in unique_name_shortforms:
        bases.add(sf)
        bases.add(sf.upper())
        bases.add(sf.capitalize())
    for sf in unique_college_shortforms:
        bases.add(sf)
        bases.add(sf.upper())
        bases.add(sf.capitalize())
    for sf in unique_fav_shortforms:
        bases.add(sf)
        bases.add(sf.upper())
        bases.add(sf.capitalize())

    # Add individual name parts as bases
    for part in name_parts:
        bases.add(part)
        bases.add(part.capitalize())
        bases.add(part.upper())
        bases.add(part + fav)
        bases.add(fav + part)
        bases.add(part + year)
        bases.add(part + '@' + year)

    # Add individual college parts as bases
    for part in college_parts:
        bases.add(part)
        bases.add(part.capitalize())
        bases.add(part.upper())

    # Expand bases with extra variations: reversed, double, toggle/alternate cases
    extra_bases = set()
    for base in bases:
        if not base:
            continue
        # 1. Reversed bases
        rev = base[::-1]
        extra_bases.add(rev)
        extra_bases.add(rev.capitalize())
        extra_bases.add(rev.upper())
        
        # 2. Double bases
        extra_bases.add(base + base)
        
        # 3. Toggle/alternate cases
        alt1 = "".join([c.upper() if idx % 2 == 0 else c.lower() for idx, c in enumerate(base)])
        alt2 = "".join([c.lower() if idx % 2 == 0 else c.upper() for idx, c in enumerate(base)])
        extra_bases.add(alt1)
        extra_bases.add(alt2)
        extra_bases.add(base.swapcase())

    bases.update(extra_bases)

    suffixes = [
        '', '1', '12', '123', '1234', '12345', '123456', '1234567', '12345678', '123456789', '1234567890',
        '!', '@', '#', '$', '%', '^', '&', '*', '?', '!!', '@@', '!!!', '@@@',
        '@123', '#123', '!123', '123!', '1234!', '12345!', '123456!',
        '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030',
        '@2024', '@2025', '@2026',
        year, '@'+year, '#'+year, '!'+year, '.'+year, '_'+year, '-'+year,
        year[-2:] if len(year) >= 2 else '',
        '@' + (year[-2:] if len(year) >= 2 else ''),
        day, mon, day+mon, mon+day, day+mon+year, mon+day+year,
        '0', '00', '000', '11', '22', '33', '44', '55', '66', '77', '88', '99',
        '786', '007', '999', '111', '69', '420', 'abc', 'xyz', 'qwerty', 'qwe', 'asd', 'zxc',
    ]
    suffixes = list(set([s for s in suffixes if s]))

    prefixes = ['', '@', '#', '!', 'the', 'my', 'i_am_', 'its', 'iam', 'we_are', 'this_is', 'mr', 'ms', 'dr']

    wordlist = set()

    # Add common fallback weak passwords
    common_weak = [
        '123456', '12345678', '123456789', 'password', 'admin', 'welcome', 
        'qwerty', 'pass123', 'letmein', '12345', '1234567', 'password123',
        'password1234', 'admin123', 'admin1234', 'welcome123', 'welcome1',
        'iloveyou', 'princess', 'monkey', 'trustno1', 'shadow', 'superman'
    ]
    for cw in common_weak:
        wordlist.add(cw)

    for base in bases:
        if not base:
            continue
        # base + suffix
        for suf in suffixes:
            wordlist.add(base + suf)

        # prefix + base
        for pre in prefixes:
            wordlist.add(pre + base)

        # leet speak style 1 (light substitutions)
        leet1 = (base.replace('a','@').replace('e','3')
                     .replace('i','1').replace('o','0')
                     .replace('s','$').replace('t','+'))
        wordlist.add(leet1)
        wordlist.add(leet1 + '123')
        wordlist.add(leet1 + '!')
        wordlist.add(leet1 + '@' + year)

        # leet speak style 2 (heavy substitutions)
        leet2 = (base.replace('a','4').replace('b','8')
                     .replace('e','3').replace('g','9')
                     .replace('i','1').replace('l','1')
                     .replace('o','0').replace('s','5')
                     .replace('t','7').replace('z','2'))
        wordlist.add(leet2)
        wordlist.add(leet2 + '123')
        wordlist.add(leet2 + '!')
        wordlist.add(leet2 + '@' + year)

        # Capitalise first + suffix
        wordlist.add(base.capitalize() + '123')
        wordlist.add(base.capitalize() + '@' + year)
        wordlist.add(base.capitalize() + '!')

    # Generate explicit combo permutations: shortform + special + year
    year_formats = [year, year[-2:] if len(year) >= 2 else year]
    special_chars = ['@', '#', '!', '$', '_', '-', '.', '&', '*', '%', '']

    all_shortforms = list(set(unique_name_shortforms + unique_college_shortforms + unique_fav_shortforms))

    # Add casing variations for all shortforms in combo permutations
    shortform_variants = []
    for sf in all_shortforms:
        shortform_variants.append(sf.lower())
        shortform_variants.append(sf.upper())
        if len(sf) > 0:
            shortform_variants.append(sf.capitalize())
    unique_sf_variants = list(set([s for s in shortform_variants if len(s) > 0]))

    for sf in unique_sf_variants:
        for yr in year_formats:
            for sp in special_chars:
                wordlist.add(f"{sf}{sp}{yr}")
                wordlist.add(f"{sf}{yr}{sp}")
                wordlist.add(f"{sp}{sf}{yr}")
                wordlist.add(f"{yr}{sp}{sf}")
                wordlist.add(f"{yr}{sf}{sp}")
                wordlist.add(f"{sp}{yr}{sf}")

    # Extra targeted combos
    combos = [
        name + year + '!',
        fav  + year + '!',
        name + '@' + year,
        fav  + '@' + year,
        name + '.' + year,
        fav  + '.' + year,
        name + '_' + fav,
        fav  + '_' + name,
        name + day + mon + year,
        college + year,
        college + '@' + year,
        name + mon + year,
        fav + mon + year,
        name.capitalize() + fav.capitalize() if name and fav else '',
        fav.capitalize()  + name.capitalize() if name and fav else '',
        name + fav + year,
        fav + name + year,
    ]
    for c in combos:
        if c:
            wordlist.add(c)

    with open(output_file, 'w') as f:
        for word in sorted(wordlist):
            f.write(word + '\n')

    print(f'\n[+] Wordlist generated : {len(wordlist)} passwords')
    print(f'[+] Saved to           : {output_file}')
    print('\n[*] Sample passwords:')
    for w in list(sorted(wordlist))[:10]:
        print(f'    {w}')

# ---- Configure target info here ----
generate_wordlist(
    name           = 'alice',
    dob            = '2004-03-14',
    college        = 'bmsce',
    favourite_word = 'cricket',
    output_file    = 'custom_wordlist.txt'
)
