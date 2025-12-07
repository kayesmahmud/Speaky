/**
 * Text diff utility for highlighting corrections
 * Uses word-level diff for better readability
 */

export interface DiffSegment {
  type: 'equal' | 'insert' | 'delete';
  text: string;
}

/**
 * Compute the diff between two strings at word level
 */
export function computeWordDiff(original: string, corrected: string): DiffSegment[] {
  const originalWords = tokenize(original);
  const correctedWords = tokenize(corrected);

  // Use LCS (Longest Common Subsequence) approach
  const lcs = computeLCS(originalWords, correctedWords);

  return buildDiffFromLCS(originalWords, correctedWords, lcs);
}

/**
 * Tokenize text into words while preserving whitespace
 */
function tokenize(text: string): string[] {
  // Split on word boundaries but keep the delimiters
  return text.split(/(\s+)/).filter(Boolean);
}

/**
 * Compute LCS table using dynamic programming
 */
function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Build diff segments from LCS table
 */
function buildDiffFromLCS(original: string[], corrected: string[], dp: number[][]): DiffSegment[] {
  const result: DiffSegment[] = [];
  let i = original.length;
  let j = corrected.length;

  // Temporary storage for building segments (we'll reverse at the end)
  const segments: { type: 'equal' | 'insert' | 'delete'; words: string[] }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && original[i - 1].toLowerCase() === corrected[j - 1].toLowerCase()) {
      // Equal - use the corrected version (may have different casing)
      addToSegments(segments, 'equal', corrected[j - 1]);
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // Insert
      addToSegments(segments, 'insert', corrected[j - 1]);
      j--;
    } else if (i > 0) {
      // Delete
      addToSegments(segments, 'delete', original[i - 1]);
      i--;
    }
  }

  // Reverse and convert to final format
  segments.reverse();
  for (const seg of segments) {
    seg.words.reverse();
    result.push({
      type: seg.type,
      text: seg.words.join(''),
    });
  }

  return result;
}

/**
 * Helper to group consecutive segments of the same type
 */
function addToSegments(
  segments: { type: 'equal' | 'insert' | 'delete'; words: string[] }[],
  type: 'equal' | 'insert' | 'delete',
  word: string
): void {
  if (segments.length > 0 && segments[segments.length - 1].type === type) {
    segments[segments.length - 1].words.push(word);
  } else {
    segments.push({ type, words: [word] });
  }
}

/**
 * Simple character-level diff for short strings
 */
export function computeCharDiff(original: string, corrected: string): DiffSegment[] {
  const originalChars = original.split('');
  const correctedChars = corrected.split('');

  const dp = computeLCS(originalChars, correctedChars);
  return buildDiffFromLCS(originalChars, correctedChars, dp);
}
