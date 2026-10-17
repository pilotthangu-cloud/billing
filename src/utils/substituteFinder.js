import substitutesData from '../data/substitutes.json';

// Build bidirectional graph from legacy Clipper SUBSTITU.DBF
const codeSubstituteGraph = new Map();
substitutesData.forEach(item => {
  const c1 = item['IT_CODEt^\u00a3'] || item.IT_CODE;
  const c2 = item['SB_ITEMt^\u00a3'] || item.SB_ITEM;
  if (c1 && c2) {
    if (!codeSubstituteGraph.has(c1)) codeSubstituteGraph.set(c1, new Set());
    if (!codeSubstituteGraph.has(c2)) codeSubstituteGraph.set(c2, new Set());
    codeSubstituteGraph.get(c1).add(c2);
    codeSubstituteGraph.get(c2).add(c1);
  }
});

// Common statutory therapeutic active salts dictionary
const KNOWN_SALTS = [
  'PARACETAMOL', 'ACETAMINOPHEN', 'AMOXICILLIN', 'CLAVULANIC', 'AZITHROMYCIN',
  'PANTOPRAZOLE', 'OMEPRAZOLE', 'RABEPRAZOLE', 'ESOMEPRAZOLE', 'DOMPERIDONE',
  'CEFIXIME', 'CEFUROXIME', 'CEFTRIAXONE', 'CIPROFLOXACIN', 'LEVOFLOXACIN',
  'OFLOXACIN', 'METRONIDAZOLE', 'ATORVASTATIN', 'ROSUVASTATIN', 'TELMISARTAN',
  'AMLODIPINE', 'METOPROLOL', 'LOSARTAN', 'RAMIPRIL', 'GLIMEPIRIDE',
  'METFORMIN', 'VILDAGLIPTIN', 'TENELIGLIPTIN', 'DAPAGLIFLOZIN', 'EMPAGLIFLOZIN',
  'CETIRIZINE', 'LEVOCETIRIZINE', 'MONTELUKAST', 'FEXOFENADINE', 'ACECLOFENAC',
  'DICLOFENAC', 'IBUPROFEN', 'TRAMADOL', 'SERRATIOPEPTIDASE', 'DICYCLOMINE',
  'ONDANSETRON', 'RANITIDINE', 'SUCRALFATE', 'ALBENDAZOLE', 'IVERMECTIN',
  'ALPRAZOLAM', 'CLONAZEPAM', 'LORAZEPAM', 'DIAZEPAM', 'GABAPENTIN',
  'PREGABALIN', 'METHYLCOBALAMIN', 'FOLIC ACID', 'CALCIUM', 'VITAMIN D3'
];

/**
 * Extracts molecule salt signature and dosage strength from name and generic
 */
export function extractMoleculeSignature(med) {
  if (!med) return { salt: '', strength: '' };
  const text = `${med.name || ''} ${med.generic || ''}`.toUpperCase();

  // Find matching salt
  let foundSalt = '';
  for (const s of KNOWN_SALTS) {
    if (text.includes(s)) {
      foundSalt = s;
      break;
    }
  }

  // Find strength (e.g. 650, 500, 40, 20, 10, 5, 2.5, 0.5)
  const strengthMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:MG|GM|MCG|ML)?\b/);
  const foundStrength = strengthMatch ? strengthMatch[1] : '';

  return {
    salt: foundSalt || (med.generic ? med.generic.trim().toUpperCase() : ''),
    strength: foundStrength
  };
}

/**
 * Finds all therapeutic substitutes for a given medicine from the 24k catalog
 */
export function findSubstitutes(targetMed, allMedicines) {
  if (!targetMed || !allMedicines || allMedicines.length === 0) return [];

  const targetCode = targetMed.code;
  const targetName = (targetMed.name || '').trim().toLowerCase();
  const directLinkedCodes = codeSubstituteGraph.get(targetCode) || new Set();
  const { salt: targetSalt, strength: targetStrength } = extractMoleculeSignature(targetMed);

  const results = [];
  const seenCodes = new Set([targetCode]);

  for (const m of allMedicines) {
    if (m.code === targetCode || seenCodes.has(m.code)) continue;
    if (m.name.trim().toLowerCase() === targetName) continue;

    let isMatch = false;
    let matchType = '';

    // 1. Direct legacy Clipper code link from SUBSTITU.DBF
    if (directLinkedCodes.has(m.code)) {
      isMatch = true;
      matchType = 'Direct Legacy Match';
    } 
    // 2. Exact generic composition match
    else if (targetMed.generic && m.generic && targetMed.generic.trim().toLowerCase() === m.generic.trim().toLowerCase()) {
      isMatch = true;
      matchType = 'Same Composition';
    }
    // 3. Extracted molecule salt and dosage match
    else if (targetSalt) {
      const { salt: mSalt, strength: mStrength } = extractMoleculeSignature(m);
      if (mSalt === targetSalt) {
        if (!targetStrength || !mStrength || targetStrength === mStrength) {
          isMatch = true;
          matchType = `${targetSalt} ${targetStrength ? targetStrength + 'mg' : ''}`.trim();
        }
      }
    }

    if (isMatch) {
      seenCodes.add(m.code);
      results.push({
        ...m,
        matchType,
        hasStock: (m.stock_shop1 || 0) > 0
      });
    }
  }

  // Sort: In-Stock items first, then higher stock, then lower price
  results.sort((a, b) => {
    if (a.hasStock !== b.hasStock) return a.hasStock ? -1 : 1;
    if ((b.stock_shop1 || 0) !== (a.stock_shop1 || 0)) return (b.stock_shop1 || 0) - (a.stock_shop1 || 0);
    return (a.mrp || 0) - (b.mrp || 0);
  });

  return results.slice(0, 30);
}
