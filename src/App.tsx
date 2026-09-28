/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Scale,
  Sparkles,
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sliders,
  ChevronRight,
  Eye,
  FileCheck2,
  Info,
  Undo2,
  X,
} from 'lucide-react';
import {
  HardConstraints,
  Criterion,
  JudgeVerdictResult,
  HistoryItem,
  ExampleCase,
} from './types/judge';
import { computeHardChecks } from './utils/hardChecks';
import { DEFAULT_RUBRIC } from './utils/rubric';
import { BUILT_IN_EXAMPLES } from './utils/examples';
import { Header } from './components/Header';
import { WelcomePanel } from './components/WelcomePanel';
import { HardConstraintsForm } from './components/HardConstraintsForm';
import { RubricModalOrPanel } from './components/RubricModalOrPanel';
import { ResponseInputBox } from './components/ResponseInputBox';
import { VerdictCard } from './components/VerdictCard';
import { CriteriaTable } from './components/CriteriaTable';
import { JustificationBox } from './components/JustificationBox';
import { HistoryDrawer } from './components/HistoryDrawer';

const STORAGE_KEYS = {
  HISTORY: 'sxs_judge_history_v1',
  WELCOME_DISMISSED: 'sxs_judge_welcome_dismissed_v1',
  RUBRIC: 'sxs_judge_rubric_v1',
};

interface ClearedStateBackup {
  prompt: string;
  response1: string;
  response2: string;
  modelName1: string;
  modelName2: string;
  constraints: HardConstraints;
  verdict: JudgeVerdictResult | null;
  editableJustification: string;
  isSavedExampleResult: boolean;
}

export default function App() {
  // Input State
  const [prompt, setPrompt] = useState<string>('');
  const [response1, setResponse1] = useState<string>('');
  const [response2, setResponse2] = useState<string>('');
  const [modelName1, setModelName1] = useState<string>('');
  const [modelName2, setModelName2] = useState<string>('');
  const [modelsRevealed, setModelsRevealed] = useState<boolean>(false);

  const [constraints, setConstraints] = useState<HardConstraints>({
    maxWords: null,
    minWords: null,
    mustInclude: '',
    mustAvoid: '',
    format: 'none',
  });

  const [rubric, setRubric] = useState<Criterion[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RUBRIC);
      if (saved) {
        const parsed: Criterion[] = JSON.parse(saved);
        return parsed.map((c) => ({
          ...c,
          isDealBreaker:
            c.isDealBreaker !== undefined
              ? c.isDealBreaker
              : c.id === 'accuracy' || c.name.toLowerCase().includes('accuracy'),
        }));
      }
    } catch {
      // fallback
    }
    return JSON.parse(JSON.stringify(DEFAULT_RUBRIC));
  });

  // UI Modals & Panels
  const [rubricModalOpen, setRubricModalOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.WELCOME_DISMISSED) === 'true';
  });

  // Evaluation & Results State
  const [isJudging, setIsJudging] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [verdict, setVerdict] = useState<JudgeVerdictResult | null>(null);
  const [isSavedExampleResult, setIsSavedExampleResult] = useState<boolean>(false);
  const [editableJustification, setEditableJustification] = useState<string>('');
  const [judgeError, setJudgeError] = useState<{ message: string; isRateLimit?: boolean } | null>(null);

  // Undo Toast State
  const [undoBackup, setUndoBackup] = useState<ClearedStateBackup | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Evidence Highlight Interaction
  const [activeHighlightQuote, setActiveHighlightQuote] = useState<string | null>(null);
  const [highlightTargetResponse, setHighlightTargetResponse] = useState<'1' | '2' | null>(null);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  // Detect platform for keyboard shortcut label
  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
  }, []);
  const shortcutLabel = isMac ? 'Cmd+Enter' : 'Ctrl+Enter';
  const shortcutKbd = isMac ? '⌘↵' : 'Ctrl+↵';

  // Save history on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history.slice(0, 25)));
    } catch (e) {
      console.error('Failed to save history to localStorage', e);
    }
  }, [history]);

  // Save rubric changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RUBRIC, JSON.stringify(rubric));
    } catch (e) {
      console.error('Failed to save rubric to localStorage', e);
    }
  }, [rubric]);

  // Elapsed Timer while judging
  useEffect(() => {
    if (isJudging) {
      setElapsedSeconds(0);
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isJudging]);

  // Undo toast 6-second timer
  useEffect(() => {
    if (showUndoToast) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => {
        setShowUndoToast(false);
        setUndoBackup(null);
      }, 6000);
    }
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, [showUndoToast]);

  // STEP 1: Compute hard checks in real-time as user types
  const hardChecks1 = useMemo(() => {
    return computeHardChecks(response1, constraints);
  }, [response1, constraints]);

  const hardChecks2 = useMemo(() => {
    return computeHardChecks(response2, constraints);
  }, [response2, constraints]);

  // Rubric total weight check
  const rubricWeightTotal = useMemo(() => {
    return rubric.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  }, [rubric]);

  const isRubricValid = rubricWeightTotal === 100;

  // Validation checks for empty states
  const hasPrompt = prompt.trim().length > 0;
  const hasResponse1 = response1.trim().length > 0;
  const hasResponse2 = response2.trim().length > 0;
  const canJudge = hasPrompt && hasResponse1 && hasResponse2 && isRubricValid && !isJudging;

  const missingHint = useMemo(() => {
    if (!hasPrompt) return 'Enter a task prompt';
    if (!hasResponse1 && !hasResponse2) return 'Enter text for Response 1 and Response 2';
    if (!hasResponse1) return 'Enter text for Response 1';
    if (!hasResponse2) return 'Enter text for Response 2';
    if (!isRubricValid) return `Rubric weights must total 100% (currently ${rubricWeightTotal}%)`;
    return '';
  }, [hasPrompt, hasResponse1, hasResponse2, isRubricValid, rubricWeightTotal]);

  // Editing input invalidates a saved example result so user sees fresh state
  const handlePromptChange = (val: string) => {
    setPrompt(val);
    if (isSavedExampleResult) {
      setIsSavedExampleResult(false);
      setVerdict(null);
    }
  };

  const handleResponse1Change = (val: string) => {
    setResponse1(val);
    if (isSavedExampleResult) {
      setIsSavedExampleResult(false);
      setVerdict(null);
    }
  };

  const handleResponse2Change = (val: string) => {
    setResponse2(val);
    if (isSavedExampleResult) {
      setIsSavedExampleResult(false);
      setVerdict(null);
    }
  };

  const handleConstraintsChange = (updated: HardConstraints) => {
    setConstraints(updated);
    if (isSavedExampleResult) {
      setIsSavedExampleResult(false);
      setVerdict(null);
    }
  };

  // Handle Load Example
  const handleSelectExample = (example: ExampleCase) => {
    setPrompt(example.prompt);
    setConstraints(example.constraints);
    setResponse1(example.response1);
    setResponse2(example.response2);
    setModelName1(example.modelName1);
    setModelName2(example.modelName2);
    setModelsRevealed(false); // keep blind initially
    setJudgeError(null);
    setActiveHighlightQuote(null);

    // If a verified saved run exists, show it instantly
    if (example.savedVerdict) {
      setVerdict(example.savedVerdict);
      setEditableJustification(example.savedVerdict.justification);
      setIsSavedExampleResult(true);
    } else {
      setVerdict(null);
      setIsSavedExampleResult(false);
    }
  };

  // Handle Immediate Clear with 6-second Undo Toast (Never use alert/confirm)
  const handleClear = () => {
    setUndoBackup({
      prompt,
      response1,
      response2,
      modelName1,
      modelName2,
      constraints,
      verdict,
      editableJustification,
      isSavedExampleResult,
    });
    setShowUndoToast(true);

    setPrompt('');
    setResponse1('');
    setResponse2('');
    setModelName1('');
    setModelName2('');
    setModelsRevealed(false);
    setVerdict(null);
    setIsSavedExampleResult(false);
    setJudgeError(null);
    setActiveHighlightQuote(null);
    setConstraints({
      maxWords: null,
      minWords: null,
      mustInclude: '',
      mustAvoid: '',
      format: 'none',
    });
  };

  const handleUndoClear = () => {
    if (undoBackup) {
      setPrompt(undoBackup.prompt);
      setResponse1(undoBackup.response1);
      setResponse2(undoBackup.response2);
      setModelName1(undoBackup.modelName1);
      setModelName2(undoBackup.modelName2);
      setConstraints(undoBackup.constraints);
      setVerdict(undoBackup.verdict);
      setEditableJustification(undoBackup.editableJustification);
      setIsSavedExampleResult(undoBackup.isSavedExampleResult);
      setShowUndoToast(false);
      setUndoBackup(null);
    }
  };

  // Dismiss welcome panel
  const handleDismissWelcome = () => {
    setWelcomeDismissed(true);
    localStorage.setItem(STORAGE_KEYS.WELCOME_DISMISSED, 'true');
  };

  // Handle Judge Request
  const handleJudge = useCallback(async () => {
    if (isJudging) return;

    if (!prompt.trim()) {
      setJudgeError({ message: 'Please enter a task prompt to evaluate.' });
      return;
    }

    if (!response1.trim() || !response2.trim()) {
      setJudgeError({ message: 'Both Response 1 and Response 2 must have text to compare.' });
      return;
    }

    if (!isRubricValid) {
      setJudgeError({
        message: `Rubric weights currently total ${rubricWeightTotal}%. Please adjust them to equal 100%.`,
      });
      setRubricModalOpen(true);
      return;
    }

    setIsJudging(true);
    setIsSavedExampleResult(false); // Live run replaces saved result
    setJudgeError(null);
    setActiveHighlightQuote(null);

    try {
      const res = await fetch('/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          constraints,
          rubric,
          response1,
          response2,
          hardChecks1,
          hardChecks2,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const isRateLimit = res.status === 429 || errorData.rateLimited;
        const msg =
          errorData.error ||
          (isRateLimit
            ? "Today's free Gemini quota is used up. It resets at midnight Pacific time. You can still load an example to see a saved result."
            : `Server returned ${res.status}: Failed to judge.`);
        throw {
          message: msg,
          isRateLimit,
        };
      }

      const result: JudgeVerdictResult = await res.json();
      setVerdict(result);
      setEditableJustification(result.justification);

      // Save to History (max 25)
      const now = new Date();
      const newHistoryItem: HistoryItem = {
        id: `eval_${Date.now()}`,
        timestamp: Date.now(),
        dateFormatted: now.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        promptSnippet: prompt.slice(0, 75).trim() + (prompt.length > 75 ? '...' : ''),
        prompt,
        constraints,
        rubric,
        response1,
        response2,
        modelName1,
        modelName2,
        winner: result.winner,
        weightedScore1: result.weightedScore1,
        weightedScore2: result.weightedScore2,
        verdict: result,
      };

      setHistory((prev) => [newHistoryItem, ...prev.filter((h) => h.id !== newHistoryItem.id)].slice(0, 25));
    } catch (err: any) {
      console.error('Judge error:', err);
      const isRate = Boolean(err?.isRateLimit || String(err?.message || err).includes('429'));
      const msg =
        err?.message ||
        (isRate
          ? "Today's free Gemini quota is used up. It resets at midnight Pacific time. You can still load an example to see a saved result."
          : 'Could not complete evaluation. Your inputs have been preserved. Please try again.');
      setJudgeError({ message: msg, isRateLimit: isRate });
    } finally {
      setIsJudging(false);
    }
  }, [
    isJudging,
    prompt,
    response1,
    response2,
    constraints,
    rubric,
    hardChecks1,
    hardChecks2,
    isRubricValid,
    rubricWeightTotal,
    modelName1,
    modelName2,
  ]);

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to Judge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (canJudge) {
          handleJudge();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleJudge, canJudge]);

  // Reopen past evaluation from history
  const handleReopenHistory = (item: HistoryItem) => {
    setPrompt(item.prompt);
    setConstraints(item.constraints);
    setRubric(item.rubric);
    setResponse1(item.response1);
    setResponse2(item.response2);
    setModelName1(item.modelName1 || '');
    setModelName2(item.modelName2 || '');
    setVerdict(item.verdict);
    setIsSavedExampleResult(false);
    setEditableJustification(item.verdict.justification);
    setJudgeError(null);
    setActiveHighlightQuote(null);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAllHistory = () => {
    setHistory([]);
  };

  // Quote click highlight
  const handleQuoteClick = (quote: string, targetResponse: '1' | '2') => {
    setActiveHighlightQuote(quote);
    setHighlightTargetResponse(targetResponse);
  };

  const handleClearHighlight = () => {
    setActiveHighlightQuote(null);
    setHighlightTargetResponse(null);
  };

  return (
    <div className="min-h-screen bg-[#f9f9f7] text-[#0b0b0b] flex flex-col font-sans">
      {/* Header */}
      <Header
        onSelectExample={handleSelectExample}
        onOpenRubric={() => setRubricModalOpen(true)}
        onOpenHistory={() => setHistoryDrawerOpen(true)}
        onClear={handleClear}
        historyCount={history.length}
        rubricWeightTotal={rubricWeightTotal}
        modelsRevealed={modelsRevealed}
        onToggleRevealModels={() => setModelsRevealed(!modelsRevealed)}
        hasModelNames={Boolean(modelName1 || modelName2)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* Welcome Panel for First-Time Users */}
        {!welcomeDismissed && (
          <WelcomePanel
            onDismiss={handleDismissWelcome}
            onTryExample={() => {
              handleSelectExample(BUILT_IN_EXAMPLES[0]);
              handleDismissWelcome();
            }}
          />
        )}

        {/* Global Error or Friendly Rate Limit Banner */}
        {judgeError && (
          <div
            className={`card-base p-4 mb-5 border shadow-xs flex items-start justify-between gap-3 ${
              judgeError.isRateLimit
                ? 'bg-[#eef4fc] border-[#d2e3fc] text-[#2a78d6]'
                : 'bg-[#fdf2f2] border-[#f5c2c2] text-[#d03b3b]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {judgeError.isRateLimit ? (
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#2a78d6]" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#d03b3b]" />
              )}
              <div>
                <p className="text-xs font-semibold text-[#0b0b0b]">
                  {judgeError.isRateLimit ? 'Gemini Quota Notice' : 'Evaluation Error'}
                </p>
                <p className="text-xs text-[#52514e] mt-0.5 leading-relaxed">
                  {judgeError.message}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleJudge}
                disabled={!canJudge}
                className="px-3 py-1 bg-[#2a78d6] hover:bg-[#2163b2] text-white text-xs font-medium rounded-md transition-colors shadow-xs disabled:opacity-50"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => setJudgeError(null)}
                className="text-xs text-[#898781] hover:text-[#0b0b0b] p-1"
                aria-label="Dismiss message"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Two Columns on Desktop (Inputs Left, Results Right), Single Column on Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Inputs & Hard Checks (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Task Prompt */}
            <div className="card-base p-4 bg-[#fcfcfb] border border-[#e1e0d9]">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="task-prompt-textarea"
                  className="text-xs font-bold uppercase tracking-wider text-[#0b0b0b]"
                >
                  Task Prompt
                </label>
                <span className="text-[11px] text-[#898781]">
                  {prompt.length} chars
                </span>
              </div>
              <textarea
                id="task-prompt-textarea"
                value={prompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                rows={3}
                placeholder="Paste the user prompt or instruction here..."
                className="w-full p-3 text-xs leading-relaxed rounded-md border border-[#e1e0d9] bg-[#fcfcfb] text-[#0b0b0b] placeholder:text-[#898781] focus:outline-none focus:ring-2 focus:ring-[#2a78d6] focus:border-transparent font-sans resize-y"
              />
            </div>

            {/* 2. Hard Constraints Form */}
            <HardConstraintsForm
              constraints={constraints}
              onChange={handleConstraintsChange}
            />

            {/* 3. Responses Side-by-Side (Blind Judging) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResponseInputBox
                id="1"
                title="Response 1"
                response={response1}
                onChangeResponse={handleResponse1Change}
                modelName={modelName1}
                onChangeModelName={setModelName1}
                modelsRevealed={modelsRevealed}
                hardChecks={hardChecks1}
                isWinner={verdict?.winner === '1'}
                isLoser={verdict?.winner === '2'}
                isTie={verdict?.winner === 'tie'}
                activeHighlightQuote={
                  highlightTargetResponse === '1' ? activeHighlightQuote : null
                }
                onClearHighlight={handleClearHighlight}
                failedDealBreakers={verdict?.failedDealBreakers1}
              />

              <ResponseInputBox
                id="2"
                title="Response 2"
                response={response2}
                onChangeResponse={handleResponse2Change}
                modelName={modelName2}
                onChangeModelName={setModelName2}
                modelsRevealed={modelsRevealed}
                hardChecks={hardChecks2}
                isWinner={verdict?.winner === '2'}
                isLoser={verdict?.winner === '1'}
                isTie={verdict?.winner === 'tie'}
                activeHighlightQuote={
                  highlightTargetResponse === '2' ? activeHighlightQuote : null
                }
                onClearHighlight={handleClearHighlight}
                failedDealBreakers={verdict?.failedDealBreakers2}
              />
            </div>

            {/* Action Bar: Judge Button & Rubric Status */}
            <div className="card-base p-4 bg-[#fcfcfb] border border-[#e1e0d9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#52514e]">
                <button
                  type="button"
                  onClick={() => setRubricModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-[#2a78d6] hover:underline font-medium"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Rubric ({rubric.length} criteria, {rubricWeightTotal}%)</span>
                </button>
                {!isRubricValid && (
                  <span className="text-[11px] text-[#d03b3b] font-medium">
                    (Weights must total 100%)
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                {missingHint && (
                  <span className="text-[11px] text-[#898781] italic">
                    {missingHint}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleJudge}
                  disabled={!canJudge}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#2a78d6] hover:bg-[#2163b2] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2a78d6]"
                  title={`Run blind evaluation with order swap (${shortcutLabel})`}
                >
                  {isJudging ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Judging... ({elapsedSeconds}s)</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Judge</span>
                      <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white/20 rounded">
                        {shortcutKbd}
                      </kbd>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Output, Verdict, Criteria Table, Justification (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4">
            {isJudging ? (
              <div className="card-base p-8 text-center bg-[#fcfcfb] border border-[#e1e0d9] flex flex-col items-center justify-center min-h-[360px]">
                <Loader2 className="w-8 h-8 text-[#2a78d6] animate-spin mb-3" />
                <h4 className="text-sm font-semibold text-[#0b0b0b]">
                  Evaluating Responses... ({elapsedSeconds}s)
                </h4>
                <p className="text-xs text-[#52514e] max-w-sm mt-1 leading-relaxed">
                  Executing parallel dual Gemini evaluation runs with swapped order (temperature 0) to detect position bias and verify evidence quotes against source text.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-[#898781]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2a78d6] animate-pulse" />
                  <span>Gemini 3.5 Flash Lite • Labels locked to Response 1 &amp; 2</span>
                </div>
              </div>
            ) : verdict ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Saved example result notice banner */}
                {isSavedExampleResult && (
                  <div className="card-base p-3 bg-[#eef4fc] border-[#d2e3fc] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#2a78d6] shadow-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 shrink-0 text-[#2a78d6]" />
                      <span className="font-medium text-[#0b0b0b]">
                        Saved result from a real run. Press Judge to re-run it live.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleJudge}
                      disabled={!canJudge || isJudging}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2a78d6] hover:bg-[#2163b2] text-white rounded-md font-semibold text-xs shrink-0 transition-colors shadow-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Re-run live</span>
                    </button>
                  </div>
                )}

                {/* Verdict Card */}
                <VerdictCard
                  verdict={verdict}
                  modelName1={modelName1}
                  modelName2={modelName2}
                  modelsRevealed={modelsRevealed}
                />
              </div>
            ) : (
              <div className="card-base p-8 text-center bg-[#fcfcfb] border border-[#e1e0d9] flex flex-col items-center justify-center min-h-[360px]">
                <div className="w-10 h-10 rounded-full bg-[#f2f2ef] flex items-center justify-center text-[#52514e] mb-3">
                  <FileCheck2 className="w-5 h-5 text-[#2a78d6]" />
                </div>
                <h4 className="text-sm font-semibold text-[#0b0b0b]">
                  Ready for Evaluation
                </h4>
                <p className="text-xs text-[#52514e] max-w-xs mt-1 leading-relaxed">
                  Paste your prompt and both responses, or load an example to test instant hard checks and dual-order AI judging.
                </p>

                <div className="mt-5 flex flex-col gap-2 w-full max-w-xs text-left">
                  <div className="p-2.5 rounded bg-[#f9f9f7] border border-[#e1e0d9] text-[11px] text-[#52514e] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006300]" />
                    <span>Hard checks compute live as you type</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#f9f9f7] border border-[#e1e0d9] text-[11px] text-[#52514e] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2a78d6]" />
                    <span>Order swap runs concurrently to detect position bias</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#f9f9f7] border border-[#e1e0d9] text-[11px] text-[#52514e] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#898781]" />
                    <span>Exact evidence quotes verified in source text</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full-width section below both columns: Criteria breakdown & Evaluator justification */}
        {verdict && !isJudging && (
          <div className="mt-6 space-y-6 animate-in fade-in duration-300">
            {/* Criteria Table with clickable quotes */}
            <CriteriaTable
              criteriaScores={verdict.criteriaScores}
              rubric={rubric}
              onQuoteClick={handleQuoteClick}
              activeHighlightQuote={activeHighlightQuote}
              modelsRevealed={modelsRevealed}
              modelName1={modelName1}
              modelName2={modelName2}
            />

            {/* Justification Box with Copy & Export buttons */}
            <JustificationBox
              justification={editableJustification}
              onChangeJustification={setEditableJustification}
              verdict={verdict}
              prompt={prompt}
              response1={response1}
              response2={response2}
              rubric={rubric}
              constraints={constraints}
              modelName1={modelName1}
              modelName2={modelName2}
              modelsRevealed={modelsRevealed}
            />
          </div>
        )}
      </main>

      {/* In-app Undo Toast (6 seconds) */}
      {showUndoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-[#0b0b0b] text-white rounded-lg shadow-xl text-xs animate-in slide-in-from-bottom duration-200">
          <span>Cleared.</span>
          <button
            type="button"
            onClick={handleUndoClear}
            className="inline-flex items-center gap-1 font-semibold text-[#93c5fd] hover:text-white underline transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={() => setShowUndoToast(false)}
            className="text-white/60 hover:text-white ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Rubric Configuration Modal */}
      <RubricModalOrPanel
        isOpen={rubricModalOpen}
        onClose={() => setRubricModalOpen(false)}
        rubric={rubric}
        onChange={setRubric}
      />

      {/* Evaluation History Drawer */}
      <HistoryDrawer
        isOpen={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        history={history}
        onReopen={handleReopenHistory}
        onDelete={handleDeleteHistoryItem}
        onClearAll={handleClearAllHistory}
      />
    </div>
  );
}
