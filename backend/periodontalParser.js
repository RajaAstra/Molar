'use strict';

/**
 * periodontalParser.js
 *
 * Deterministic parser for spoken periodontal measurements.
 *
 * Accepts input like:
 *   "Tooth 26, four, three, four, bleeding."
 *   "26, 4, 3, 4, no bleeding."
 *   "Tooth 26 mesial 4 middle 3 distal 4"
 *   "correction, distal is three"
 *   "26 four three four bleeding on probing"
 *
 * Never invents values. Returns explicit errors for ambiguous or incomplete input.
 * This parser is purely deterministic — no ML, no external API.
 */

// ---------------------------------------------------------------------------
// Word → digit mapping for spoken numbers
// ---------------------------------------------------------------------------
const WORD_NUMBERS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
};

// Tooth number aliases people might say
const TOOTH_ALIASES = {
  'upper right': 1, 'upper left': 2, 'lower left': 3, 'lower right': 4,
};

/**
 * Normalize a raw transcript string for parsing.
 * Lowercases, strips punctuation except hyphens, collapses whitespace.
 */
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convert a token (word or digit string) to an integer, or null if unrecognized.
 */
function tokenToInt(token) {
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  return WORD_NUMBERS[token] ?? null;
}

/**
 * Detect a bleeding indicator from a normalized token array.
 * Returns: true = bleeding present, false = not present, null = not mentioned.
 */
function detectBleeding(tokens) {
  const text = tokens.join(' ');

  // Explicit "no bleeding" / "no BOP" patterns
  if (
    /no bleeding/.test(text) ||
    /no bop/.test(text) ||
    /bleeding (absent|negative|none|no)/.test(text)
  ) {
    return false;
  }

  // Explicit bleeding presence
  if (
    /\bbleeding\b/.test(text) ||
    /\bbop\b/.test(text) ||
    /bleeding on probing/.test(text) ||
    /bleeding present/.test(text)
  ) {
    return true;
  }

  return null;
}

/**
 * Extract a tooth number from the token array.
 * Supports: "tooth 26", "26", "tooth twenty six" (written out is not common, so
 * we focus on the numeric form).
 * Returns: { toothNumber: number, consumedCount: number } or null
 */
function extractToothNumber(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    // "tooth 26"
    if (tokens[i] === 'tooth' && i + 1 < tokens.length) {
      const n = tokenToInt(tokens[i + 1]);
      if (n !== null && n >= 11 && n <= 48) {
        return { toothNumber: n, startIndex: i, consumedCount: 2 };
      }
    }
    // Bare number at the start or after "tooth"
    const n = tokenToInt(tokens[i]);
    if (n !== null && n >= 11 && n <= 48) {
      return { toothNumber: n, startIndex: i, consumedCount: 1 };
    }
  }
  return null;
}

/**
 * Extract three probing depth values (mesial, middle, distal) from the tokens.
 * Handles:
 *   - Three consecutive numbers: "4 3 4"
 *   - Named positions: "mesial 4 middle 3 distal 4"
 *   - Mixed: "mesial 4 3 4"
 *
 * Returns: { mesial, middle, distal } or null
 */
function extractDepths(tokens) {
  // Try named positions first
  const named = {};
  for (let i = 0; i < tokens.length; i++) {
    if ((tokens[i] === 'mesial' || tokens[i] === 'buccal') && i + 1 < tokens.length) {
      const v = tokenToInt(tokens[i + 1]);
      if (v !== null && v >= 1 && v <= 20) named.mesial = v;
    }
    if ((tokens[i] === 'middle' || tokens[i] === 'mid') && i + 1 < tokens.length) {
      const v = tokenToInt(tokens[i + 1]);
      if (v !== null && v >= 1 && v <= 20) named.middle = v;
    }
    if (tokens[i] === 'distal' && i + 1 < tokens.length) {
      const v = tokenToInt(tokens[i + 1]);
      if (v !== null && v >= 1 && v <= 20) named.distal = v;
    }
  }

  if ('mesial' in named && 'middle' in named && 'distal' in named) {
    return { mesial: named.mesial, middle: named.middle, distal: named.distal };
  }

  // Fall back to three consecutive numbers (skip tooth number already seen)
  const nums = [];
  for (const token of tokens) {
    const n = tokenToInt(token);
    if (n !== null && n >= 1 && n <= 20) {
      nums.push(n);
      if (nums.length === 3) break;
    }
  }

  if (nums.length === 3) {
    return { mesial: nums[0], middle: nums[1], distal: nums[2] };
  }

  return null;
}

/**
 * Main parse function.
 *
 * @param {string} transcript - Raw spoken or typed input
 * @returns {{ ok: true, data: ParsedMeasurement } | { ok: false, error: string }}
 */
function parseMeasurement(transcript) {
  if (!transcript || typeof transcript !== 'string') {
    return { ok: false, error: 'No transcript provided' };
  }

  const norm = normalize(transcript);
  const tokens = norm.split(' ').filter(Boolean);

  if (tokens.length === 0) {
    return { ok: false, error: 'Empty transcript' };
  }

  // Extract tooth number
  const toothResult = extractToothNumber(tokens);
  if (!toothResult) {
    return {
      ok: false,
      error: 'No valid tooth number found. Say "Tooth 26" or just "26" followed by measurements.',
    };
  }

  // Remove tooth tokens from the list for depth extraction
  const depthTokens = [
    ...tokens.slice(0, toothResult.startIndex),
    ...tokens.slice(toothResult.startIndex + toothResult.consumedCount),
  ];

  // Extract depths
  const depths = extractDepths(depthTokens);
  if (!depths) {
    return {
      ok: false,
      error: `Could not parse three probing depth values for tooth ${toothResult.toothNumber}. Expected three numbers: mesial, middle, distal.`,
    };
  }

  // Validate depths are physiologically plausible for a probing depth
  for (const [pos, val] of Object.entries(depths)) {
    if (val < 1 || val > 20) {
      return {
        ok: false,
        error: `${pos} value ${val} mm is outside the accepted range (1–20 mm).`,
      };
    }
  }

  const bleeding = detectBleeding(tokens);

  return {
    ok: true,
    data: {
      toothNumber: toothResult.toothNumber,
      mesial: depths.mesial,
      middle: depths.middle,
      distal: depths.distal,
      bleeding: bleeding ?? false, // Default to false if not mentioned
      bleedingExplicit: bleeding !== null,
      rawTranscript: transcript.trim(),
    },
  };
}

/**
 * Parse a correction command.
 *
 * Accepts:
 *   "correction, distal is three"
 *   "correct distal to 4"
 *   "correction mesial 5"
 *   "actually distal is 3"
 *
 * Returns: { ok: true, field, value } or { ok: false, error }
 */
function parseCorrection(transcript) {
  if (!transcript || typeof transcript !== 'string') {
    return { ok: false, error: 'No transcript provided' };
  }

  const norm = normalize(transcript);
  const tokens = norm.split(' ').filter(Boolean);

  // Detect correction intent
  const correctionKeywords = ['correction', 'correct', 'actually', 'change', 'fix'];
  const hasCorrection = tokens.some((t) => correctionKeywords.includes(t));
  if (!hasCorrection) {
    return { ok: false, error: 'No correction intent detected. Start with "Correction" or "Actually".' };
  }

  // Detect which field
  const FIELDS = ['mesial', 'middle', 'distal', 'bleeding'];
  let field = null;
  let valueToken = null;

  for (let i = 0; i < tokens.length; i++) {
    if (FIELDS.includes(tokens[i])) {
      field = tokens[i];
      // Look for value after "is", "to", or directly next
      const rest = tokens.slice(i + 1);
      const skipWords = ['is', 'to', 'now', 'should', 'be'];
      const valueIdx = rest.findIndex((t) => !skipWords.includes(t));
      if (valueIdx >= 0) {
        valueToken = rest[valueIdx];
      }
      break;
    }
  }

  if (!field) {
    return {
      ok: false,
      error: 'Could not determine which measurement to correct. Specify "mesial", "middle", "distal", or "bleeding".',
    };
  }

  if (field === 'bleeding') {
    // Parse bleeding correction
    const bleedingValue = detectBleeding(tokens);
    if (bleedingValue === null) {
      return { ok: false, error: 'Say "bleeding" or "no bleeding" to correct the bleeding value.' };
    }
    return { ok: true, field: 'bleeding', value: bleedingValue };
  }

  // Parse numeric correction
  if (!valueToken) {
    return { ok: false, error: `No value found for ${field} correction.` };
  }

  const num = tokenToInt(valueToken);
  if (num === null) {
    return { ok: false, error: `Could not parse "${valueToken}" as a number.` };
  }
  if (num < 1 || num > 20) {
    return { ok: false, error: `Correction value ${num} mm is outside the accepted range (1–20 mm).` };
  }

  return { ok: true, field, value: num };
}

module.exports = { parseMeasurement, parseCorrection, normalize, tokenToInt };

// ---------------------------------------------------------------------------
// Self-tests — run with: node periodontalParser.js
// ---------------------------------------------------------------------------
if (require.main === module) {
  const tests = [
    // Should succeed
    { input: 'Tooth 26, four, three, four, bleeding.', expect: { ok: true, tooth: 26, m: 4, mid: 3, d: 4, b: true } },
    { input: '26, 4, 3, 4, no bleeding.', expect: { ok: true, tooth: 26, m: 4, mid: 3, d: 4, b: false } },
    { input: 'Tooth 26 mesial 4 middle 3 distal 4', expect: { ok: true, tooth: 26, m: 4, mid: 3, d: 4, b: false } },
    { input: '36 five two three bleeding on probing', expect: { ok: true, tooth: 36, m: 5, mid: 2, d: 3, b: true } },
    { input: 'tooth 17 2 3 2', expect: { ok: true, tooth: 17, m: 2, mid: 3, d: 2, b: false } },
    { input: 'tooth 11 one two one', expect: { ok: true, tooth: 11, m: 1, mid: 2, d: 1, b: false } },
    // Should fail
    { input: 'some random words', expect: { ok: false } },
    { input: 'tooth 26', expect: { ok: false } },
    { input: 'tooth 99 4 3 4', expect: { ok: false } }, // invalid tooth
    { input: '', expect: { ok: false } },
    { input: 'tooth 26 4 25 4', expect: { ok: false } }, // depth > 20
  ];

  const correctionTests = [
    { input: 'correction, distal is three', expect: { ok: true, field: 'distal', value: 3 } },
    { input: 'actually mesial is 5', expect: { ok: true, field: 'mesial', value: 5 } },
    { input: 'correction bleeding', expect: { ok: true, field: 'bleeding', value: true } },
    { input: 'correction no bleeding', expect: { ok: true, field: 'bleeding', value: false } },
    { input: 'tooth 26 4 3 4', expect: { ok: false } }, // no correction intent
  ];

  let passed = 0;
  let failed = 0;

  console.log('\n=== parseMeasurement tests ===');
  for (const t of tests) {
    const result = parseMeasurement(t.input);
    const ok = result.ok === t.expect.ok;
    const dataOk = !t.expect.ok || (
      result.data.toothNumber === t.expect.tooth &&
      result.data.mesial === t.expect.m &&
      result.data.middle === t.expect.mid &&
      result.data.distal === t.expect.d &&
      result.data.bleeding === t.expect.b
    );
    if (ok && dataOk) {
      console.log(`  PASS: "${t.input.slice(0, 50)}"`);
      passed++;
    } else {
      console.log(`  FAIL: "${t.input.slice(0, 50)}"`);
      console.log(`    Expected: ${JSON.stringify(t.expect)}`);
      console.log(`    Got: ${JSON.stringify(result)}`);
      failed++;
    }
  }

  console.log('\n=== parseCorrection tests ===');
  for (const t of correctionTests) {
    const result = parseCorrection(t.input);
    const ok = result.ok === t.expect.ok;
    const dataOk = !t.expect.ok || (result.field === t.expect.field && result.value === t.expect.value);
    if (ok && dataOk) {
      console.log(`  PASS: "${t.input}"`);
      passed++;
    } else {
      console.log(`  FAIL: "${t.input}"`);
      console.log(`    Expected: ${JSON.stringify(t.expect)}`);
      console.log(`    Got: ${JSON.stringify(result)}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
