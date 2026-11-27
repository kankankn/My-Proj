import { Employee } from '../types/trip';

/**
 * List of common Indonesian academic, professional, and honorary titles
 * that commonly appear or are omitted on official travel assignment letters (Surat Tugas / SPPD).
 */
const PREFIX_TITLES = [
  'dr\\.', 'drg\\.', 'drs\\.', 'dra\\.', 'ir\\.', 'prof\\.', 'h\\.', 'hj\\.',
  'raden', 'tb\\.', 'kh\\.', 'apt\\.', 'bripka', 'briptu', 'ipda', 'iptu', 'akp'
];

const SUFFIX_TITLES = [
  's\\.t\\.', 's\\.kom\\.', 's\\.e\\.', 's\\.sos\\.', 's\\.pd\\.', 's\\.h\\.',
  's\\.ip\\.', 's\\.ked\\.', 's\\.si\\.', 's\\.psi\\.', 's\\.farm\\.', 's\\.tr\\.',
  'm\\.t\\.', 'm\\.si\\.', 'm\\.m\\.', 'm\\.pd\\.', 'm\\.kom\\.', 'm\\.h\\.',
  'm\\.farm\\.', 'm\\.kes\\.', 'm\\.sc\\.', 'ph\\.d\\.', 'b\\.a\\.', 'm\\.b\\.a\\.',
  'a\\.md\\.', 'a\\.ma\\.', 'st', 'se', 'sh', 'si', 'spd', 'ssos', 'skom', 'mm', 'mt', 'msi'
];

/**
 * Normalize name by stripping titles, non-alphanumeric chars, extra spaces, and lowercase.
 */
export function normalizeName(name: string): string {
  if (!name) return '';
  let cleaned = name.toLowerCase().trim();

  // Strip prefix titles (e.g., Dr., Drs., Ir., H., Hj.)
  for (const p of PREFIX_TITLES) {
    const regex = new RegExp(`^${p}\\s*`, 'gi');
    cleaned = cleaned.replace(regex, '');
  }

  // Strip suffix titles after commas or spaces
  for (const s of SUFFIX_TITLES) {
    const regex = new RegExp(`[,\\s]+${s}(\\b|$)`, 'gi');
    cleaned = cleaned.replace(regex, '');
  }

  // Remove commas, dots, hyphens, parentheses, and extra symbols
  cleaned = cleaned.replace(/[^a-z0-9\s]/gi, ' ');
  // Replace multiple whitespace with single space
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Standard Levenshtein distance between two strings
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Normalized string similarity from Levenshtein (0.0 to 1.0)
 */
export function levenshteinSimilarity(s1: string, s2: string): number {
  if (!s1 && !s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1 === s2) return 1.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Token-based Jaccard similarity (for matching words out of order or partial names)
 */
export function tokenSimilarity(s1: string, s2: string): number {
  const tokens1 = s1.split(/\s+/).filter(t => t.length > 1);
  const tokens2 = s2.split(/\s+/).filter(t => t.length > 1);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  let matched = 0;
  for (const t1 of tokens1) {
    // Check exact or near match for each token
    const hasMatch = tokens2.some(t2 => {
      if (t1 === t2) return true;
      if (t1.startsWith(t2) || t2.startsWith(t1)) return true;
      return levenshteinSimilarity(t1, t2) >= 0.75;
    });
    if (hasMatch) matched++;
  }

  const union = new Set([...tokens1, ...tokens2]).size;
  return union > 0 ? matched / union : 0;
}

export type MatchLevel = 'exact' | 'close' | 'partial' | 'low';

export interface NameSimilarityScore {
  score: number; // 0 to 100
  matchLevel: MatchLevel;
  reason: string;
}

/**
 * Calculates similarity between a raw scanned text string and a registered Employee.
 */
export function calculateEmployeeNameSimilarity(
  scannedText: string,
  employee: Employee
): NameSimilarityScore {
  if (!scannedText || !employee) {
    return { score: 0, matchLevel: 'low', reason: 'Data kosong' };
  }

  const rawScanned = scannedText.trim();
  const rawEmpName = employee.nama.trim();

  // 1. Direct raw equality
  if (rawScanned.toLowerCase() === rawEmpName.toLowerCase()) {
    return { score: 100, matchLevel: 'exact', reason: 'Nama Sesuai Sempurna (100%)' };
  }

  // 2. Direct NIP match (if scanned text contains employee's NIP numbers)
  const cleanEmpNip = employee.nip.replace(/\D/g, '');
  const cleanScannedDigits = rawScanned.replace(/\D/g, '');
  if (cleanEmpNip.length >= 8 && cleanScannedDigits.includes(cleanEmpNip)) {
    return { score: 100, matchLevel: 'exact', reason: 'Nomor Induk Pegawai (NIP) Terdeteksi Sesuai' };
  }

  // 3. Normalized names comparison (without titles and punctuation)
  const normScanned = normalizeName(rawScanned);
  const normEmpName = normalizeName(rawEmpName);

  if (normScanned === normEmpName) {
    return { 
      score: 98, 
      matchLevel: 'exact', 
      reason: 'Nama Cocok Tepat (Perbedaan Penulisan Gelar / Tanda Baca)' 
    };
  }

  // Substring inclusion (e.g. "Budi Santoso" in "Dr. H. Budi Santoso, S.T.")
  if (normScanned.length >= 5 && normEmpName.includes(normScanned)) {
    return { 
      score: 94, 
      matchLevel: 'exact', 
      reason: 'Nama Terdaftar Mengandung Nama Terdeteksi' 
    };
  }
  if (normEmpName.length >= 5 && normScanned.includes(normEmpName)) {
    return { 
      score: 93, 
      matchLevel: 'exact', 
      reason: 'Nama Terdeteksi Mengandung Nama Terdaftar Lengkap' 
    };
  }

  // 4. Levenshtein and Token composite calculation
  const levScore = levenshteinSimilarity(normScanned, normEmpName);
  const tokScore = tokenSimilarity(normScanned, normEmpName);

  // Blended score
  const composite = (levScore * 0.55) + (tokScore * 0.45);
  const scorePercent = Math.round(composite * 100);

  // Character distance specifically
  const dist = levenshteinDistance(normScanned, normEmpName);

  if (dist <= 2 && normScanned.length >= 4) {
    return {
      score: Math.max(88, scorePercent),
      matchLevel: 'close',
      reason: `Kemungkinan Terdekat: Ejaan berbeda sedikit (${dist} huruf)`
    };
  }

  if (scorePercent >= 85) {
    return {
      score: scorePercent,
      matchLevel: 'exact',
      reason: 'Sangat Mirip dengan Nama Terdaftar'
    };
  } else if (scorePercent >= 60) {
    return {
      score: scorePercent,
      matchLevel: 'close',
      reason: 'Kemungkinan Terdekat: Nama berbeda sedikit, mohon periksa'
    };
  } else if (scorePercent >= 40) {
    return {
      score: scorePercent,
      matchLevel: 'partial',
      reason: 'Kemiripan Sedang / Sebagian Kata Cocok'
    };
  } else {
    return {
      score: scorePercent,
      matchLevel: 'low',
      reason: 'Kemiripan Rendah'
    };
  }
}

export interface ScannedMatchItem {
  id: string; // unique key for this scanned row
  rawScannedText: string;
  matchedEmployee: Employee | null;
  score: number;
  matchLevel: MatchLevel;
  reason: string;
  selected: boolean; // whether checked to add to trip
  alternatives: Array<{ employee: Employee; score: number; reason: string }>;
}

/**
 * Matches an array of raw detected names against the registered employee database.
 */
export function matchScannedNamesWithEmployees(
  detectedNames: string[],
  employees: Employee[]
): ScannedMatchItem[] {
  // Deduplicate and filter empty inputs
  const cleanedList = Array.from(
    new Set(
      detectedNames
        .map(n => n.trim())
        .filter(n => n.length >= 2)
    )
  );

  return cleanedList.map((rawName, idx) => {
    // Score all employees
    const scoredEmployees = employees.map(emp => {
      const match = calculateEmployeeNameSimilarity(rawName, emp);
      return {
        employee: emp,
        score: match.score,
        matchLevel: match.matchLevel,
        reason: match.reason
      };
    });

    // Sort descending by score
    scoredEmployees.sort((a, b) => b.score - a.score);

    const best = scoredEmployees[0];
    const hasViableMatch = best && best.score >= 55;

    return {
      id: `scanned-${idx}-${Date.now()}`,
      rawScannedText: rawName,
      matchedEmployee: hasViableMatch ? best.employee : null,
      score: hasViableMatch ? best.score : 0,
      matchLevel: hasViableMatch ? best.matchLevel : 'low',
      reason: hasViableMatch ? best.reason : 'Tidak ditemukan nama yang cocok di database pegawai',
      selected: hasViableMatch, // Auto-select only if viable match found
      alternatives: scoredEmployees.slice(1, 4).map(s => ({
        employee: s.employee,
        score: s.score,
        reason: s.reason
      }))
    };
  });
}
