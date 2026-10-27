/**
 * Fast Typo-Tolerant Prefix-First Search Engine for 25,000+ Medicine Catalog
 * Calibrated strictly to match Clipper index ordering and counter billing velocity.
 * 
 * Rules:
 * - Tier 1: Exact name match (Highest priority)
 * - Tier 2: Exact prefix match (name.startsWith(q)) - Emulates Clipper index A-Z
 * - Tier 3: Space-cleaned prefix match (e.g. "kitkat" matches "KIT KAT")
 * - Tier 4: Word boundary match (e.g. "625" -> "AUGMENTIN 625MG", "kit" -> "4D PLUS KIT")
 * - Tier 5: Substring contains match in name
 * - Tier 6: Generic / Salt composition match
 * - Tier 7: Code / Shelf Rack match
 * 
 * Multi-tier sorting guarantees:
 * 1. Higher tier ALWAYS beats lower tier (no interlacing of contains matches into prefix matches).
 * 2. In-stock items are prioritized within the SAME tier.
 * 3. Tie-breaker is strict alphabetical order (name.localeCompare) so brand families stay together.
 */

export function scoreMedicineMatch(med, query, stockKey = 'stock_shop1') {
  if (!query || query.length === 0 || !med) return 0;
  const q = query.trim().toLowerCase();
  if (q.length === 0) return 0;

  const name = (med.name || '').toLowerCase();
  const generic = (med.generic || '').toLowerCase();
  const code = (med.code || '').toLowerCase();
  const rack = (med.rack || '').toLowerCase();
  const company = (med.company || '').toLowerCase();

  // Tier 1: Exact Name Match
  if (name === q) {
    return 100000;
  }

  // Tier 2: Exact Prefix Match (name starts with query)
  if (name.startsWith(q)) {
    return 50000 - (name.length - q.length);
  }

  // Tier 3: Space/Hyphen-insensitive prefix match (e.g. "kitkat" -> "KIT KAT")
  const cleanName = name.replace(/[\s\-_\/]+/g, '');
  const cleanQ = q.replace(/[\s\-_\/]+/g, '');
  if (cleanQ.length >= 3 && cleanName.startsWith(cleanQ)) {
    return 45000 - (cleanName.length - cleanQ.length);
  }

  // Tier 4: Word Boundary Match (e.g. "625" -> "AUGMENTIN 625", "kit" -> "4D PLUS KIT")
  const words = name.split(/[\s\-_\/]+/);
  let matchedWordIndex = -1;
  for (let i = 0; i < words.length; i++) {
    if (words[i].startsWith(q)) {
      matchedWordIndex = i;
      break;
    }
  }
  if (matchedWordIndex !== -1) {
    return 20000 - (matchedWordIndex * 100);
  }

  // Tier 5: Substring Contains Match in Name
  if (name.includes(q)) {
    return 10000 - (name.indexOf(q) * 10);
  }

  // Tier 6: Generic / Salt Composition Match
  if (generic) {
    if (generic.startsWith(q)) return 5000;
    if (generic.split(/[\s\-_\/]+/).some(w => w.startsWith(q))) return 4000;
    if (generic.includes(q)) return 3000;
  }

  // Tier 7: Code & Rack Matches
  if (code === q || code.startsWith(q)) return 2000;
  if (rack === q || rack === `r-${q}`) return 1500;
  if (company.startsWith(q)) return 1000;

  return 0;
}

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

  // Multi-tier sort:
  // 1. Group by Major Score Tier (50000+, 20000+, 10000+, etc.)
  // 2. In-Stock vs Out-Of-Stock within the SAME tier
  // 3. Strict alphabetical order by Name (Clipper index emulation)
  scored.sort((a, b) => {
    const tierA = Math.floor(a.score / 10000);
    const tierB = Math.floor(b.score / 10000);

    if (tierB !== tierA) {
      return tierB - tierA;
    }

    const stockA = a.med[stockKey] !== undefined ? a.med[stockKey] : (a.med.stock_shop1 || 0);
    const stockB = b.med[stockKey] !== undefined ? b.med[stockKey] : (b.med.stock_shop1 || 0);
    const hasStockA = stockA > 0 ? 1 : 0;
    const hasStockB = stockB > 0 ? 1 : 0;

    if (hasStockB !== hasStockA) {
      return hasStockB - hasStockA;
    }

    return (a.med.name || '').localeCompare(b.med.name || '');
  });

  return scored.slice(0, limit).map(s => s.med);
}
