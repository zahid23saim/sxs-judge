import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Shared server-side Gemini client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// IP Rate Limiter: 20 judge requests per hour per visitor
interface RateRecord {
  count: number;
  resetTime: number;
}
const ipRateLimits = new Map<string, RateRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 20;

// Periodic cleanup of expired IP rate limit records
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRateLimits.entries()) {
    if (now > record.resetTime) {
      ipRateLimits.delete(ip);
    }
  }
}, 5 * 60 * 1000);

const judgeResponseSchema = {
  type: Type.OBJECT,
  properties: {
    criteriaScores: {
      type: Type.ARRAY,
      description: 'Scores for each criterion in the rubric',
      items: {
        type: Type.OBJECT,
        properties: {
          criterionId: { type: Type.STRING, description: 'ID of the criterion' },
          criterionName: { type: Type.STRING, description: 'Name of the criterion' },
          score1: { type: Type.INTEGER, description: 'Score for Response 1 (1 to 5)' },
          score2: { type: Type.INTEGER, description: 'Score for Response 2 (1 to 5)' },
          rationale: {
            type: Type.STRING,
            description:
              'A single concise sentence explaining the score differential, referring strictly to Response 1 and Response 2',
          },
          evidenceQuotes1: {
            type: Type.ARRAY,
            description: 'Up to 2 verbatim exact substring quotes from Response 1 backing the score',
            items: { type: Type.STRING },
          },
          evidenceQuotes2: {
            type: Type.ARRAY,
            description: 'Up to 2 verbatim exact substring quotes from Response 2 backing the score',
            items: { type: Type.STRING },
          },
        },
        required: [
          'criterionId',
          'criterionName',
          'score1',
          'score2',
          'rationale',
          'evidenceQuotes1',
          'evidenceQuotes2',
        ],
      },
    },
    winner: {
      type: Type.STRING,
      description: "The winning response: '1', '2', or 'tie'",
    },
    confidence: {
      type: Type.STRING,
      description: "Confidence in the verdict: 'low', 'medium', or 'high'",
    },
    justification: {
      type: Type.STRING,
      description:
        'A 2-3 sentence defensible justification synthesizing evidence, referring strictly to Response 1 and Response 2 (never Candidate)',
    },
    concreteFix: {
      type: Type.STRING,
      description:
        'One single concrete, actionable fix for the losing response (calling it Response 1 or Response 2)',
    },
  },
  required: ['criteriaScores', 'winner', 'confidence', 'justification', 'concreteFix'],
};

interface JudgeRequestBody {
  prompt: string;
  constraints: {
    maxWords: number | null;
    minWords: number | null;
    mustInclude: string;
    mustAvoid: string;
    format: string;
  };
  rubric: Array<{
    id: string;
    name: string;
    weight: number;
    description?: string;
    isDealBreaker?: boolean;
  }>;
  response1: string;
  response2: string;
  hardChecks1: {
    wordCount: number;
    wordCountPass: boolean | null;
    endsMidSentence: boolean;
    endsMidSentencePass: boolean;
    items: Array<{ id: string; type: string; passed: boolean | null; label: string }>;
    allPassed: boolean;
    failedCount: number;
  };
  hardChecks2: {
    wordCount: number;
    wordCountPass: boolean | null;
    endsMidSentence: boolean;
    endsMidSentencePass: boolean;
    items: Array<{ id: string; type: string; passed: boolean | null; label: string }>;
    allPassed: boolean;
    failedCount: number;
  };
}

// Normalize model output winner to '1' | '2' | 'tie'
function normalizeWinner(val: string | undefined): '1' | '2' | 'tie' {
  if (!val) return 'tie';
  const s = val.toLowerCase().trim();
  if (s.includes('1') && !s.includes('2')) return '1';
  if (s.includes('2') && !s.includes('1')) return '2';
  return 'tie';
}

// Sanitize any remaining occurrences of "Candidate" to "Response"
function sanitizeLabels(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/\bCandidate\s*1\b/gi, 'Response 1')
    .replace(/\bCandidate\s*2\b/gi, 'Response 2')
    .replace(/\bcandidate\b/gi, 'response')
    .replace(/\bCandidates\b/gi, 'Responses');
}

/**
 * Checks if a matched number represents a constraint limit rather than an observed response word count.
 */
function isConstraintLimit(
  n: number,
  matchIndex: number,
  fullText: string,
  constraints?: { maxWords: number | null; minWords: number | null }
): boolean {
  if (!constraints) return false;
  const isMax = constraints.maxWords != null && n === constraints.maxWords;
  const isMin = constraints.minWords != null && n === constraints.minWords;
  if (!isMax && !isMin) return false;

  const start = Math.max(0, matchIndex - 40);
  const end = Math.min(fullText.length, matchIndex + 40);
  const windowText = fullText.slice(start, end).toLowerCase();

  const constraintKeywords = [
    'limit',
    'constraint',
    'max',
    'min',
    'under',
    'over',
    'fewer',
    'less',
    'more',
    'at most',
    'at least',
    'cap',
    'target',
    'require',
    'exceed',
    'allow',
    'prescribe',
    'specified',
    'threshold',
  ];

  return constraintKeywords.some((kw) => windowText.includes(kw));
}

/**
 * Enforces hard checks as the source of truth for numbers:
 * Checks every "N words" in text. Finds the nearest "Response 1" or "Response 2" mentioned before it.
 * If N doesn't equal the computed count of that response, replaces N with the computed count.
 */
function correctWordCounts(
  text: string,
  wordCount1: number,
  wordCount2: number,
  constraints?: { maxWords: number | null; minWords: number | null }
): string {
  if (!text) return '';

  const regex = /\b(\d+)\s+(words?)\b/gi;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;
    const n = parseInt(match[1], 10);

    result += text.slice(lastIndex, matchStart);

    // If it's a constraint target like "under 60 words" or "60 words limit", don't change the limit
    if (isConstraintLimit(n, matchStart, text, constraints)) {
      result += match[0];
    } else {
      // Find the nearest "Response 1" or "Response 2" mentioned before it
      const beforeText = text.slice(0, matchStart);
      const resp1Matches = [...beforeText.matchAll(/\bResponse\s*1\b/gi)];
      const resp2Matches = [...beforeText.matchAll(/\bResponse\s*2\b/gi)];

      const last1 = resp1Matches.length > 0 ? resp1Matches[resp1Matches.length - 1].index! : -1;
      const last2 = resp2Matches.length > 0 ? resp2Matches[resp2Matches.length - 1].index! : -1;

      let targetResponse: '1' | '2' | null = null;
      if (last1 !== -1 || last2 !== -1) {
        targetResponse = last1 > last2 ? '1' : '2';
      } else {
        // Fallback: look forward in text if none mentioned before
        const afterText = text.slice(matchEnd);
        const next1 = afterText.search(/\bResponse\s*1\b/i);
        const next2 = afterText.search(/\bResponse\s*2\b/i);
        if (next1 !== -1 && (next2 === -1 || next1 < next2)) targetResponse = '1';
        else if (next2 !== -1 && (next1 === -1 || next2 < next1)) targetResponse = '2';
      }

      if (targetResponse) {
        const expectedCount = targetResponse === '1' ? wordCount1 : wordCount2;
        if (n !== expectedCount) {
          const unit = expectedCount === 1 ? 'word' : 'words';
          result += `${expectedCount} ${unit}`;
        } else {
          result += match[0];
        }
      } else {
        result += match[0];
      }
    }

    lastIndex = matchEnd;
  }

  result += text.slice(lastIndex);
  return result;
}

// Deduplicate quotes: remove exact duplicates, remove quotes contained inside another quote, cap at 2
function cleanAndDedupeQuotes(
  rawQuotes: string[],
  sourceText: string
): { verified: string[]; unverifiedCount: number } {
  let unverifiedCount = 0;
  const verifiedList: string[] = [];

  for (const raw of rawQuotes) {
    if (!raw || typeof raw !== 'string') continue;
    const q = raw.trim();
    if (!q) continue;

    if (sourceText.includes(q)) {
      if (!verifiedList.includes(q)) {
        verifiedList.push(q);
      }
    } else {
      unverifiedCount++;
    }
  }

  // Remove any quote that is contained inside another quote for the same response and criterion
  const filtered = verifiedList.filter((quoteA, indexA) => {
    return !verifiedList.some((quoteB, indexB) => indexA !== indexB && quoteB.includes(quoteA));
  });

  return {
    verified: filtered.slice(0, 2),
    unverifiedCount,
  };
}

async function runSingleOrderJudge(
  modelName: string,
  taskPrompt: string,
  resp1Text: string,
  resp2Text: string,
  resp1Checks: any,
  resp2Checks: any,
  constraints: any,
  rubric: any[]
) {
  const systemInstruction = `You are a rigorous, objective AI side-by-side (SxS) judge evaluating two anonymous AI responses, referred to strictly and exclusively as "Response 1" and "Response 2".
Your goal is to provide a defensible, evidence-backed evaluation.

STRICT LABELS AND EVALUATION RULES:
1. LABELS: In every rationale, justification, and suggested fix, refer to the responses strictly as "Response 1" and "Response 2". NEVER use the word "Candidate" or "Model".
2. Ground Truth Hard Checks: The verified hard-check results provided below are absolute physical facts. You MUST NOT contradict them. Copy hard-check numbers (including word counts) exactly from the facts you receive; do not estimate, count manually, or hallucinate different numbers. The hard checks are the absolute source of truth for numbers.
3. Hard Check Penalty: If a response failed ANY hard check, its score for "Instruction following" (or instruction compliance) CANNOT exceed 2.
4. Length is NOT Quality: Penalize verbosity, padding, repetitive throat-clearing, and needless fluff. Never reward a response simply for having more words. A concise, accurate answer is superior to a bloated one.
5. Anonymous & Unbiased: Evaluate strictly on substance. If both responses are equally good or equally flawed, assign a "tie".
6. Verbatim Quotes: Evidence quotes MUST be exact, verbatim substrings copied directly from the respective response text. Do not paraphrase or add quotation marks inside the quote string.
7. Integer Scores: For each criterion, assign an integer score between 1 and 5 (1 = fails, 3 = acceptable with issues, 5 = excellent).`;

  const resp1ChecksSummary = resp1Checks.items
    ? resp1Checks.items
        .map(
          (it: any) =>
            `${it.passed === true ? 'PASS' : it.passed === false ? 'FAIL' : 'INFO'}: ${it.label}`
        )
        .join('; ')
    : 'None';
  const resp2ChecksSummary = resp2Checks.items
    ? resp2Checks.items
        .map(
          (it: any) =>
            `${it.passed === true ? 'PASS' : it.passed === false ? 'FAIL' : 'INFO'}: ${it.label}`
        )
        .join('; ')
    : 'None';

  const userContent = `TASK PROMPT:
"""
${taskPrompt}
"""

HARD CONSTRAINTS SPECIFIED:
- Max words: ${constraints.maxWords ?? 'None'}
- Min words: ${constraints.minWords ?? 'None'}
- Must include phrases: ${constraints.mustInclude || 'None'}
- Must avoid phrases: ${constraints.mustAvoid || 'None'}
- Required format: ${constraints.format || 'none'}

VERIFIED HARD-CHECK RESULTS (GROUND TRUTH FACTS):
- Response 1 hard checks: Computed Word Count = ${resp1Checks.wordCount} words; ${resp1ChecksSummary} (All passed: ${resp1Checks.allPassed ? 'YES' : 'NO, FAILED ' + resp1Checks.failedCount + ' CHECKS'})
- Response 2 hard checks: Computed Word Count = ${resp2Checks.wordCount} words; ${resp2ChecksSummary} (All passed: ${resp2Checks.allPassed ? 'YES' : 'NO, FAILED ' + resp2Checks.failedCount + ' CHECKS'})

CRITICAL NUMBER RULE: When mentioning the word count of Response 1 or Response 2 in your rationales, justification, or suggested fix, copy the hard-check numbers exactly from above (${resp1Checks.wordCount} words for Response 1, ${resp2Checks.wordCount} words for Response 2). Do NOT recount or estimate words.

EVALUATION RUBRIC:
${rubric.map((r) => `- ${r.name} (Weight: ${r.weight}%): ${r.description || ''}`).join('\n')}

---
RESPONSE 1:
"""
${resp1Text}
"""

---
RESPONSE 2:
"""
${resp2Text}
"""

Please evaluate Response 1 and Response 2 according to each rubric criterion. Return the JSON object adhering to the specified schema, calling them "Response 1" and "Response 2" everywhere.`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: userContent,
    config: {
      systemInstruction,
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: judgeResponseSchema,
    },
  });

  const rawText = response?.text ? response.text.trim() : '';
  if (!rawText) {
    throw new Error('Empty response from evaluation model');
  }

  return JSON.parse(rawText);
}

// Executes both order-swap runs concurrently with the same model
async function runBothOrdersWithModel(
  modelName: string,
  prompt: string,
  response1: string,
  response2: string,
  hardChecks1: any,
  hardChecks2: any,
  constraints: any,
  rubric: any[]
) {
  return await Promise.all([
    runSingleOrderJudge(
      modelName,
      prompt,
      response1,
      response2,
      hardChecks1,
      hardChecks2,
      constraints,
      rubric
    ),
    runSingleOrderJudge(
      modelName,
      prompt,
      response2,
      response1,
      hardChecks2,
      hardChecks1,
      constraints,
      rubric
    ),
  ]);
}

// POST /api/judge endpoint
app.post('/api/judge', async (req: Request, res: Response) => {
  try {
    // Client IP Rate Limiting (20 judge requests per hour)
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.socket.remoteAddress) || '127.0.0.1';

    const now = Date.now();
    let rateRecord = ipRateLimits.get(ip);
    if (!rateRecord || now > rateRecord.resetTime) {
      rateRecord = { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
      ipRateLimits.set(ip, rateRecord);
    }

    if (rateRecord.count >= RATE_LIMIT_MAX_REQUESTS) {
      const minutesLeft = Math.max(1, Math.ceil((rateRecord.resetTime - now) / 60000));
      res.status(429).json({
        rateLimited: true,
        error: `You've reached the free hourly limit (20 evaluations/hour). Please wait ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} or click Retry shortly.`,
      });
      return;
    }
    rateRecord.count++;

    const {
      prompt,
      constraints,
      rubric,
      response1,
      response2,
      hardChecks1,
      hardChecks2,
    }: JudgeRequestBody = req.body;

    if (!prompt || !response1 || !response2) {
      res.status(400).json({ error: 'Prompt and both responses are required.' });
      return;
    }

    let run1: any;
    let run2: any;
    let judgedByModel = 'Gemini 3.5 Flash Lite';

    // Primary: Gemini 3.5 Flash Lite (500 RPD). Fallback on 429: Gemini 3.1 Flash Lite (500 RPD)
    // Both runs of one judgment always use the same model.
    try {
      [run1, run2] = await runBothOrdersWithModel(
        'gemini-3.5-flash-lite',
        prompt,
        response1,
        response2,
        hardChecks1,
        hardChecks2,
        constraints,
        rubric
      );
      judgedByModel = 'Gemini 3.5 Flash Lite';
    } catch (err35: any) {
      const err35Msg = String(err35?.message || err35);
      const is35RateLimit =
        err35Msg.includes('429') ||
        err35Msg.includes('RESOURCE_EXHAUSTED') ||
        err35Msg.includes('quota') ||
        err35Msg.includes('rate limit');

      if (is35RateLimit) {
        console.warn('Gemini 3.5 Flash Lite returned 429. Redoing both runs with Gemini 3.1 Flash Lite...');
        try {
          [run1, run2] = await runBothOrdersWithModel(
            'gemini-3.1-flash-lite',
            prompt,
            response1,
            response2,
            hardChecks1,
            hardChecks2,
            constraints,
            rubric
          );
          judgedByModel = 'Gemini 3.1 Flash Lite';
        } catch (err31: any) {
          const err31Msg = String(err31?.message || err31);
          const is31RateLimit =
            err31Msg.includes('429') ||
            err31Msg.includes('RESOURCE_EXHAUSTED') ||
            err31Msg.includes('quota') ||
            err31Msg.includes('rate limit');

          if (is31RateLimit) {
            res.status(429).json({
              rateLimited: true,
              quotaExceeded: true,
              error:
                "Today's free Gemini quota is used up. It resets at midnight Pacific time. You can still load an example to see a saved result.",
            });
            return;
          }
          throw err31;
        }
      } else {
        throw err35;
      }
    }

    // Map Run 2 back to original order:
    // In Run 2: candidate 1 was response2, candidate 2 was response1
    const run1Winner = normalizeWinner(run1.winner);
    const run2RawWinner = normalizeWinner(run2.winner);
    const run2MappedWinner =
      run2RawWinner === '1' ? '2' : run2RawWinner === '2' ? '1' : 'tie';

    // Check order sensitivity
    const orderSensitive = run1Winner !== run2MappedWinner;

    let totalUnverifiedQuotesCount = 0;
    const totalRubricWeight = rubric.reduce((sum, r) => sum + (Number(r.weight) || 0), 0) || 100;

    // All text comes strictly from run 1
    const mappedCriteriaScores = rubric.map((criterion) => {
      const r1ScoreObj = run1.criteriaScores?.find(
        (c: any) =>
          c.criterionId === criterion.id ||
          c.criterionName?.toLowerCase() === criterion.name?.toLowerCase()
      );
      const r2ScoreObj = run2.criteriaScores?.find(
        (c: any) =>
          c.criterionId === criterion.id ||
          c.criterionName?.toLowerCase() === criterion.name?.toLowerCase()
      );

      const r1_score1 = Number(r1ScoreObj?.score1) || 3;
      const r1_score2 = Number(r1ScoreObj?.score2) || 3;

      // In run 2: candidate 1 was response 2, candidate 2 was response 1
      const r2_score1_for_resp2 = Number(r2ScoreObj?.score1) || 3;
      const r2_score2_for_resp1 = Number(r2ScoreObj?.score2) || 3;

      // Average scores
      let avgScore1 = Math.round(((r1_score1 + r2_score2_for_resp1) / 2) * 10) / 10;
      let avgScore2 = Math.round(((r1_score2 + r2_score1_for_resp2) / 2) * 10) / 10;

      // Hard check rule enforcement
      const isInstructionCriterion =
        criterion.id === 'instruction_following' ||
        criterion.name.toLowerCase().includes('instruction');

      if (isInstructionCriterion) {
        if (!hardChecks1.allPassed && avgScore1 > 2) {
          avgScore1 = 2;
        }
        if (!hardChecks2.allPassed && avgScore2 > 2) {
          avgScore2 = 2;
        }
      }

      // Collect quotes from both runs
      const rawQuotes1 = [
        ...(r1ScoreObj?.evidenceQuotes1 || []),
        ...(r2ScoreObj?.evidenceQuotes2 || []),
      ];
      const rawQuotes2 = [
        ...(r1ScoreObj?.evidenceQuotes2 || []),
        ...(r2ScoreObj?.evidenceQuotes1 || []),
      ];

      // Remove duplicate quotes and any quote contained in another quote
      const clean1 = cleanAndDedupeQuotes(rawQuotes1, response1);
      const clean2 = cleanAndDedupeQuotes(rawQuotes2, response2);
      totalUnverifiedQuotesCount += clean1.unverifiedCount + clean2.unverifiedCount;

      // Text rationale comes strictly from run 1, sanitized and audited against hard checks
      const rawRationale = sanitizeLabels(
        r1ScoreObj?.rationale || 'Evaluated against criteria.'
      );
      const rationaleText = correctWordCounts(
        rawRationale,
        hardChecks1.wordCount,
        hardChecks2.wordCount,
        constraints
      );

      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        score1: avgScore1,
        score2: avgScore2,
        rationale: rationaleText,
        evidenceQuotes1: clean1.verified,
        evidenceQuotes2: clean2.verified,
      };
    });

    // Deal-breaker criteria evaluation
    // If a criterion is marked as deal-breaker (or Accuracy by default if undefined),
    // any score <= 2 triggers a critical failure.
    const failedDealBreakers1: string[] = [];
    const failedDealBreakers2: string[] = [];

    rubric.forEach((criterion, idx) => {
      const isDealBreaker =
        criterion.isDealBreaker ??
        (criterion.id === 'accuracy' || criterion.name.toLowerCase().includes('accuracy'));

      if (isDealBreaker) {
        const scoreObj = mappedCriteriaScores[idx];
        if (scoreObj) {
          if (scoreObj.score1 <= 2) {
            failedDealBreakers1.push(criterion.name);
          }
          if (scoreObj.score2 <= 2) {
            failedDealBreakers2.push(criterion.name);
          }
        }
      }
    });

    // Compute weighted score = sum of (weight x averaged criterion score), shown out of 5 with one decimal
    let rawWeightedScore1 = 0;
    let rawWeightedScore2 = 0;

    for (let i = 0; i < rubric.length; i++) {
      const weightFraction = (Number(rubric[i].weight) || 0) / totalRubricWeight;
      const criterionScore = mappedCriteriaScores[i];
      if (criterionScore) {
        rawWeightedScore1 += weightFraction * criterionScore.score1;
        rawWeightedScore2 += weightFraction * criterionScore.score2;
      }
    }

    let weightedScore1 = Math.round(rawWeightedScore1 * 10) / 10;
    let weightedScore2 = Math.round(rawWeightedScore2 * 10) / 10;

    // If a response scores 2 or lower on a deal-breaker criterion, cap its weighted score at 2.0
    if (failedDealBreakers1.length > 0) {
      weightedScore1 = Math.min(weightedScore1, 2.0);
    }
    if (failedDealBreakers2.length > 0) {
      weightedScore2 = Math.min(weightedScore2, 2.0);
    }

    const scoreGap = Math.abs(weightedScore1 - weightedScore2);

    let finalWinner: '1' | '2' | 'tie';
    let finalConfidence: 'low' | 'medium' | 'high' = run1.confidence || 'medium';

    const resp1FailedDealBreaker = failedDealBreakers1.length > 0;
    const resp2FailedDealBreaker = failedDealBreakers2.length > 0;

    if (orderSensitive) {
      finalWinner = 'tie';
      finalConfidence = 'low';
    } else if (resp1FailedDealBreaker && !resp2FailedDealBreaker) {
      // Response 1 failed a deal breaker while Response 2 passed: Response 1 cannot beat Response 2
      finalWinner = '2';
      finalConfidence = 'high';
    } else if (!resp1FailedDealBreaker && resp2FailedDealBreaker) {
      // Response 2 failed a deal breaker while Response 1 passed: Response 2 cannot beat Response 1
      finalWinner = '1';
      finalConfidence = 'high';
    } else if (scoreGap < 0.2) {
      finalWinner = 'tie';
      finalConfidence =
        run1.confidence === 'high' && run2.confidence === 'high' ? 'high' : 'medium';
    } else if (weightedScore1 > weightedScore2) {
      finalWinner = '1';
      finalConfidence = run1.confidence || 'high';
    } else {
      finalWinner = '2';
      finalConfidence = run1.confidence || 'high';
    }

    const orderSwapBadge = {
      sensitive: orderSensitive,
      label: orderSensitive
        ? 'Order-sensitive verdict'
        : finalWinner === 'tie'
        ? 'Same verdict when order is swapped'
        : 'Same winner when order is swapped',
    };

    // Text taken strictly from run 1, sanitized and audited against hard-check word counts
    const sanitizedJustification = sanitizeLabels(run1.justification);
    const finalJustification = correctWordCounts(
      sanitizedJustification,
      hardChecks1.wordCount,
      hardChecks2.wordCount,
      constraints
    );

    const sanitizedConcreteFix = sanitizeLabels(run1.concreteFix);
    const finalConcreteFix = correctWordCounts(
      sanitizedConcreteFix,
      hardChecks1.wordCount,
      hardChecks2.wordCount,
      constraints
    );

    res.json({
      criteriaScores: mappedCriteriaScores,
      winner: finalWinner,
      confidence: finalConfidence,
      justification: finalJustification,
      concreteFix: finalConcreteFix,
      weightedScore1,
      weightedScore2,
      orderSensitive,
      orderSwapBadge,
      unverifiedQuotesRemoved: totalUnverifiedQuotesCount,
      run1Winner,
      run2Winner: run2MappedWinner,
      judgedByModel,
      failedDealBreakers1,
      failedDealBreakers2,
    });
  } catch (err: any) {
    console.error('Judge endpoint error:', err);
    const errMsg = String(err?.message || err);
    const isRateLimit =
      errMsg.includes('429') ||
      errMsg.includes('RESOURCE_EXHAUSTED') ||
      errMsg.includes('quota') ||
      errMsg.includes('rate limit');

    if (isRateLimit) {
      res.status(429).json({
        rateLimited: true,
        quotaExceeded: true,
        error:
          "Today's free Gemini quota is used up. It resets at midnight Pacific time. You can still load an example to see a saved result.",
      });
      return;
    }

    res.status(500).json({
      error: err?.message || 'An error occurred while evaluating the responses with Gemini.',
    });
  }
});

// Dev vs Prod Vite Integration
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SxS Judge server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
