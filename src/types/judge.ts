export type FormatType = 'none' | 'bullet_list' | 'numbered_list' | 'json' | 'single_paragraph';

export interface HardConstraints {
  maxWords: number | null;
  minWords: number | null;
  mustInclude: string; // comma-separated
  mustAvoid: string;   // comma-separated
  format: FormatType;
}

export interface Criterion {
  id: string;
  name: string;
  weight: number; // percentage (e.g. 35)
  description?: string;
  isDealBreaker?: boolean;
}

export interface CheckItem {
  id: string;
  type: 'word_count' | 'ends_mid_sentence' | 'must_include' | 'must_avoid' | 'format' | 'waiting';
  passed: boolean | null;
  label: string; // e.g. "84 words (limit 60)" or "Valid JSON"
  detail?: string;
}

export interface HardCheckResult {
  wordCount: number;
  wordCountPass: boolean | null;
  endsMidSentence: boolean;
  endsMidSentencePass: boolean;
  mustIncludeChecks: Array<{ phrase: string; passed: boolean }>;
  mustAvoidChecks: Array<{ phrase: string; passed: boolean }>;
  formatCheck: { format: FormatType; passed: boolean; detail: string } | null;
  items: CheckItem[];
  allPassed: boolean;
  failedCount: number;
}

export interface CriterionScoreResult {
  criterionId: string;
  criterionName: string;
  score1: number;
  score2: number;
  rationale: string;
  evidenceQuotes1: string[];
  evidenceQuotes2: string[];
}

export interface JudgeVerdictResult {
  criteriaScores: CriterionScoreResult[];
  winner: '1' | '2' | 'tie';
  confidence: 'low' | 'medium' | 'high';
  justification: string;
  concreteFix: string;
  weightedScore1: number;
  weightedScore2: number;
  orderSensitive: boolean;
  orderSwapBadge: {
    sensitive: boolean;
    label: string;
  };
  unverifiedQuotesRemoved: number;
  run1Winner: string;
  run2Winner: string;
  judgedByModel?: string;
  failedDealBreakers1?: string[];
  failedDealBreakers2?: string[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  dateFormatted: string;
  promptSnippet: string;
  prompt: string;
  constraints: HardConstraints;
  rubric: Criterion[];
  response1: string;
  response2: string;
  modelName1?: string;
  modelName2?: string;
  winner: '1' | '2' | 'tie';
  weightedScore1: number;
  weightedScore2: number;
  verdict: JudgeVerdictResult;
}

export interface ExampleCase {
  id: string;
  title: string;
  tagline: string;
  prompt: string;
  constraints: HardConstraints;
  response1: string;
  response2: string;
  modelName1: string;
  modelName2: string;
  savedVerdict?: JudgeVerdictResult;
}
