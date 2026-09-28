import { CheckItem, FormatType, HardCheckResult, HardConstraints } from '../types/judge';

export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  // Split on whitespace, en dashes (– \u2013), and em dashes (— \u2014)
  const tokens = text.split(/[\s\u2013\u2014]+/);
  // Count tokens that contain a letter or digit
  const wordPattern = /[\p{L}\p{N}]/u;
  return tokens.filter((token) => wordPattern.test(token)).length;
}

export function checkEndsMidSentence(text: string): { endsMidSentence: boolean; lastSnippet: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { endsMidSentence: false, lastSnippet: '' };
  }
  const lastChar = trimmed.slice(-1);
  // Allowed terminal punctuation: . ! ? or closing quotes / brackets
  const validTerminals = new Set([
    '.', '!', '?',
    '"', "'", '”', '’', '»', '›',
    ')', ']', '}'
  ]);
  const endsMidSentence = !validTerminals.has(lastChar);
  let lastSnippet = '';
  if (endsMidSentence) {
    const words = trimmed.split(/[\s\u2013\u2014]+/);
    const tail = words.slice(-4).join(' ');
    lastSnippet = tail ? `...${tail}` : `...${trimmed.slice(-25)}`;
  }
  return { endsMidSentence, lastSnippet };
}

export function computeHardChecks(
  text: string,
  constraints: HardConstraints
): HardCheckResult {
  const isEmpty = !text || !text.trim();

  // If response box is empty, show neutral "Waiting for text" chip with 0 failed checks
  if (isEmpty) {
    return {
      wordCount: 0,
      wordCountPass: null,
      endsMidSentence: false,
      endsMidSentencePass: true,
      mustIncludeChecks: [],
      mustAvoidChecks: [],
      formatCheck: null,
      items: [
        {
          id: 'waiting',
          type: 'waiting',
          passed: null,
          label: 'Waiting for text',
        },
      ],
      allPassed: true,
      failedCount: 0,
    };
  }

  const items: CheckItem[] = [];
  let allPassed = true;
  let failedCount = 0;

  const wordCount = countWords(text);
  const { endsMidSentence, lastSnippet } = checkEndsMidSentence(text);

  // 1. Word count constraint check
  let wordCountPass: boolean | null = null;
  if (constraints.maxWords !== null && constraints.minWords !== null) {
    wordCountPass = wordCount >= constraints.minWords && wordCount <= constraints.maxWords;
    const label = wordCountPass
      ? `${wordCount} words (${constraints.minWords}-${constraints.maxWords})`
      : `${wordCount} words (must be ${constraints.minWords}-${constraints.maxWords})`;
    items.push({
      id: 'word-count',
      type: 'word_count',
      passed: wordCountPass,
      label,
    });
    if (!wordCountPass) {
      allPassed = false;
      failedCount++;
    }
  } else if (constraints.maxWords !== null) {
    wordCountPass = wordCount <= constraints.maxWords;
    const label = wordCountPass
      ? `${wordCount} words (limit ${constraints.maxWords})`
      : `${wordCount} words (limit ${constraints.maxWords})`;
    items.push({
      id: 'word-count',
      type: 'word_count',
      passed: wordCountPass,
      label,
    });
    if (!wordCountPass) {
      allPassed = false;
      failedCount++;
    }
  } else if (constraints.minWords !== null) {
    wordCountPass = wordCount >= constraints.minWords;
    const label = wordCountPass
      ? `${wordCount} words (min ${constraints.minWords})`
      : `${wordCount} words (min ${constraints.minWords})`;
    items.push({
      id: 'word-count',
      type: 'word_count',
      passed: wordCountPass,
      label,
    });
    if (!wordCountPass) {
      allPassed = false;
      failedCount++;
    }
  } else {
    // Informational count
    items.push({
      id: 'word-count',
      type: 'word_count',
      passed: true,
      label: `${wordCount} words`,
    });
  }

  // 2. Ends mid-sentence check
  const endsMidSentencePass = !endsMidSentence;
  const sentenceLabel = endsMidSentencePass
    ? 'Complete sentence'
    : `Ends mid-sentence: "${lastSnippet}"`;

  items.push({
    id: 'mid-sentence',
    type: 'ends_mid_sentence',
    passed: endsMidSentencePass,
    label: sentenceLabel,
  });

  if (!endsMidSentencePass) {
    allPassed = false;
    failedCount++;
  }

  // 3. Must include phrases
  const rawIncludes = (constraints.mustInclude || '')
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const mustIncludeChecks: Array<{ phrase: string; passed: boolean }> = [];
  for (const phrase of rawIncludes) {
    const passed = text.toLowerCase().includes(phrase.toLowerCase());
    mustIncludeChecks.push({ phrase, passed });
    items.push({
      id: `must-include-${phrase}`,
      type: 'must_include',
      passed,
      label: passed ? `Includes "${phrase}"` : `Missing "${phrase}"`,
    });
    if (!passed) {
      allPassed = false;
      failedCount++;
    }
  }

  // 4. Must avoid phrases
  const rawAvoids = (constraints.mustAvoid || '')
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const mustAvoidChecks: Array<{ phrase: string; passed: boolean }> = [];
  for (const phrase of rawAvoids) {
    const passed = !text.toLowerCase().includes(phrase.toLowerCase());
    mustAvoidChecks.push({ phrase, passed });
    items.push({
      id: `must-avoid-${phrase}`,
      type: 'must_avoid',
      passed,
      label: passed ? `Avoids "${phrase}"` : `Contains "${phrase}"`,
    });
    if (!passed) {
      allPassed = false;
      failedCount++;
    }
  }

  // 5. Format check
  let formatCheck: { format: FormatType; passed: boolean; detail: string } | null = null;
  if (constraints.format && constraints.format !== 'none') {
    const trimmed = text.trim();
    let formatPassed = false;
    let formatDetail = '';

    if (constraints.format === 'json') {
      try {
        JSON.parse(trimmed);
        formatPassed = true;
        formatDetail = 'Valid JSON';
      } catch (err: unknown) {
        formatPassed = false;
        formatDetail = 'Invalid JSON';
      }
    } else if (constraints.format === 'bullet_list') {
      const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        formatPassed = false;
        formatDetail = 'Empty text';
      } else {
        const bulletRegex = /^[\s]*([•\*\-\–—+]|\([a-zA-Z0-9]\))\s+/;
        formatPassed = lines.every((line) => bulletRegex.test(line));
        formatDetail = formatPassed
          ? `Bullet list (${lines.length} items)`
          : 'Not all lines are bullet items';
      }
    } else if (constraints.format === 'numbered_list') {
      const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        formatPassed = false;
        formatDetail = 'Empty text';
      } else {
        const numberedRegex = /^[\s]*\d+[\.\)]\s+/;
        formatPassed = lines.every((line) => numberedRegex.test(line));
        formatDetail = formatPassed
          ? `Numbered list (${lines.length} items)`
          : 'Not all lines are numbered items';
      }
    } else if (constraints.format === 'single_paragraph') {
      if (!trimmed) {
        formatPassed = true;
        formatDetail = 'Empty text';
      } else {
        const paragraphs = trimmed.split(/\n+/).filter((l) => l.trim().length > 0);
        formatPassed = paragraphs.length <= 1;
        formatDetail = formatPassed
          ? 'Single paragraph'
          : `Multiple paragraphs (${paragraphs.length})`;
      }
    }

    formatCheck = {
      format: constraints.format,
      passed: formatPassed,
      detail: formatDetail,
    };

    items.push({
      id: 'format-check',
      type: 'format',
      passed: formatPassed,
      label: formatDetail,
    });

    if (!formatPassed) {
      allPassed = false;
      failedCount++;
    }
  }

  return {
    wordCount,
    wordCountPass,
    endsMidSentence,
    endsMidSentencePass,
    mustIncludeChecks,
    mustAvoidChecks,
    formatCheck,
    items,
    allPassed,
    failedCount,
  };
}
