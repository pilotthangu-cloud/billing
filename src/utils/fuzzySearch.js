/**
 * Fast Typo-Tolerant Fuzzy Search & Scoring Engine for 25,000+ Medicine Catalog
 * Combines exact prefix match, word boundary matching, Levenshtein distance,
 * salt/generic matching, and stock bonus for blazing counter billing velocity.
 */

// Simple Levenshtein distance calculation for typo tolerance
function levenshteinDistance(s1, s2) {
  if (s1 === s2) return 0;
  if (!s1 || s1.length === 0) return (s2 || '').length;
  if (!s2 || s2.length === 0) return s1.length;

  const len1 = s1.length;
  const len2 = s2.length;
  const d = [];

  for (let i = 0; i <= len1; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,       // deletion
        d[i][j - 1] + 1,       // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[len1][len2];
}

/**
 * Score a single medicine record against user query
 * @param {Object} med Medicine object
 * @param {string} query Search input (lowercase, trimmed)
 * @param {string} stockKey Active branch stock key ('stock_shop1' | 'stock_shop2')
 * @returns {number} Score (> 0 if matched)
 */
export function scoreMedicineMatch(med, query, stockKey = 'stock_shop1') {
  if (!query || query.length === 0) return 0;
  const q = query.trim().toLowerCase();
  if (q.length === 0) return 0;

  const name = (med.name || '').toLowerCase();
  const generic = (med.generic || '').toLowerCase();
  const company = (med.company || '').toLowerCase();
  const code = (med.code || '').toLowerCase();
  const rack = (med.rack || '').toLowerCase();

  let score = 0;

  // 1. Exact Name Matches (Highest Priority)
  if (name === q) {
    score = 2000;
  } else if (name.startsWith(q)) {
    // Starts with query e.g. "aug" -> "AUGMENTIN"
    score = 1200 - (name.length - q.length);
  } else {
    // 2. Word Boundary Matching (e.g. "625" -> "AUGMENTIN 625MG", "para" -> "CALPOL PARACETAMOL")
    const words = name.split(/[\s\-_\/]+/);
    let matchedWordIndex = -1;
    for (let i = 0; i < words.length; i++) {
      if (words[i].startsWith(q)) {
        matchedWordIndex = i;
        break;
      }
    }

    if (matchedWordIndex !== -1) {
      score = 800 - (matchedWordIndex * 50);
    } else if (name.includes(q)) {
      score = 500 - name.indexOf(q) * 5;
    }
  }

  // 3. Generic / Salt Composition Match
  if (score === 0 && generic) {
    if (generic.startsWith(q)) {
      score = 400;
    } else if (generic.includes(q)) {
      score = 250;
    }
  }

  // 4. Code & Rack Exact/Prefix Matches
  if (score === 0) {
    if (code === q || code.startsWith(q)) {
      score = 300;
    } else if (rack === q || rack === `r-${q}`) {
      score = 200;
    } else if (company.includes(q)) {
      score = 150;
    }
  }

  // 5. Space-insensitive match (e.g. "telmah" -> "TELMA H", "pantopdsr" -> "PAN TOP DSR")
  const cleanName = name.replace(/[\s\-_\/]+/g, '');
  const cleanQ = q.replace(/[\s\-_\/]+/g, '');
  if (score === 0 && cleanQ.length >= 3 && cleanName.startsWith(cleanQ)) {
    score = 750 - (cleanName.length - cleanQ.length);
  }

  // 6. Typo Tolerance (Levenshtein Distance) for query length >= 3
  // Catches typos like "Augmentn" for "Augmentin", "Doloo" for "Dolo", "Pantop" for "Pantocid"
  if (score === 0 && q.length >= 3) {
    const nameWords = name.split(/[\s\-_\/]+/);
    for (const w of nameWords) {
      if (w.length >= 3) {
        const target = w.length > q.length + 1 ? w.slice(0, q.length + 1) : w;
        const dist = levenshteinDistance(q, target);
        const maxDist = q.length <= 4 ? 1 : 2;
        if (dist <= maxDist) {
          score = 350 - (dist * 100);
          break;
        }
      }
    }

    if (score === 0 && generic) {
      const genWords = generic.split(/[\s\-_\/]+/);
      for (const gw of genWords) {
        if (gw.length >= 4) {
          const target = gw.length > q.length + 1 ? gw.slice(0, q.length + 1) : gw;
          const dist = levenshteinDistance(q, target);
          if (dist <= 1) {
            score = 220;
            break;
          }
        }
      }
    }
  }

  // 6. Available Stock Priority Bonus (dispense what's on the shelf first!)
  if (score > 0) {
    const branchStock = med[stockKey] !== undefined ? med[stockKey] : (med.stock_shop1 || 0);
    if (branchStock > 0) {
      score += 25; // Boost in-stock items
    } else {
      score -= 5; // Slight deprioritization for out-of-stock items
    }
  }

  return score;
}

/**
 * Fast search through medicines array with ranking and limiting
 * @param {Array} medicines Full medicines catalog
 * @param {string} query Search query
 * @param {string} stockKey Branch stock key
 * @param {number} limit Maximum results to return (default 35)
 * @returns {Array} Sorted top matching medicine objects
 */
export function fuzzySearchMedicines(medicines, query, stockKey = 'stock_shop1', limit = 35) {
  if (!Array.isArray(medicines) || medicines.length === 0) return [];
  const q = (query || '').trim().toLowerCase();
  if (q.length === 0) return [];

  const scored = [];
  const total = medicines.length;

  for (let i = 0; i < total; i++) {
    const med = medicines[i];
    const score = scoreMedicineMatch(med, q, stockKey);
    if (score > 0) {
      scored.push({ med, score });
    }
  }

  // Sort descending by score, tie-break by name
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.med.name || '').localeCompare(b.med.name || '');
  });

  return scored.slice(0, limit).map(s => s.med);
}
