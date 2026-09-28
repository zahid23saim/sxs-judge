import React, { useState, useRef, useEffect } from 'react';
import { HardCheckResult } from '../types/judge';
import { Chip } from './Chip';
import { Trophy, AlertCircle, AlertTriangle, CheckCircle2, Lock, Eye, Copy, Check } from 'lucide-react';

interface ResponseInputBoxProps {
  id: '1' | '2';
  title: string;
  response: string;
  onChangeResponse: (val: string) => void;
  modelName: string;
  onChangeModelName: (val: string) => void;
  modelsRevealed: boolean;
  hardChecks: HardCheckResult;
  isWinner?: boolean;
  isLoser?: boolean;
  isTie?: boolean;
  activeHighlightQuote?: string | null;
  onClearHighlight?: () => void;
  failedDealBreakers?: string[];
}

export const ResponseInputBox: React.FC<ResponseInputBoxProps> = ({
  id,
  title,
  response,
  onChangeResponse,
  modelName,
  onChangeModelName,
  modelsRevealed,
  hardChecks,
  isWinner,
  isLoser,
  isTie,
  activeHighlightQuote,
  onClearHighlight,
  failedDealBreakers,
}) => {
  const [modelInputExpanded, setModelInputExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const highlightContainerRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if activeHighlightQuote is in this response
  const quoteIsPresent =
    activeHighlightQuote && response.includes(activeHighlightQuote);

  useEffect(() => {
    if (quoteIsPresent && highlightContainerRef.current) {
      highlightContainerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeHighlightQuote, quoteIsPresent]);

  // Determine card border & accent
  let borderClass = 'border-[#e1e0d9]';
  let badgeHeader = null;

  if (isWinner) {
    borderClass = 'border-[#2a78d6] ring-1 ring-[#2a78d6]';
    badgeHeader = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#2a78d6] text-white">
        <Trophy className="w-3 h-3" />
        <span>Winner</span>
      </span>
    );
  } else if (isLoser) {
    borderClass = 'border-[#e1e0d9]';
  } else if (isTie) {
    borderClass = 'border-[#898781]';
  }

  // Render response text with highlight if active
  const renderHighlightedContent = () => {
    if (!activeHighlightQuote || !response.includes(activeHighlightQuote)) {
      return null;
    }

    const parts = response.split(activeHighlightQuote);
    return (
      <div
        ref={highlightContainerRef}
        className="p-3 my-2 text-xs leading-relaxed bg-[#f9f9f7] border border-[#e1e0d9] rounded-md max-h-48 overflow-y-auto whitespace-pre-wrap font-sans text-[#0b0b0b]"
      >
        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-[#e1e0d9] text-[11px] text-[#52514e]">
          <span className="font-semibold text-[#2a78d6]">
            Evidence quote highlighted in response:
          </span>
          {onClearHighlight && (
            <button
              type="button"
              onClick={onClearHighlight}
              className="text-[#898781] hover:text-[#0b0b0b] text-[10px] underline"
            >
              Close highlight
            </button>
          )}
        </div>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <mark className="bg-[#fde047] text-[#0b0b0b] px-1 py-0.5 rounded font-medium shadow-xs">
                {activeHighlightQuote}
              </mark>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div
      id={`response-${id}-container`}
      className={`card-base p-4 flex flex-col transition-all bg-[#fcfcfb] ${borderClass}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#e1e0d9]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0b0b0b]">
            {title}
          </span>
          {badgeHeader}

          {/* Model name reveal badge */}
          {modelsRevealed ? (
            <span className="text-xs px-2 py-0.5 rounded bg-[#eef4fc] text-[#2a78d6] font-semibold border border-[#d2e3fc]">
              {modelName || 'Unnamed Model'}
            </span>
          ) : (
            <span
              className="text-[11px] px-1.5 py-0.5 rounded bg-[#f2f2ef] text-[#898781] font-medium flex items-center gap-1"
              title="Model name is hidden to ensure blind evaluation"
            >
              <Lock className="w-3 h-3" />
              <span>{modelName ? 'Model hidden' : 'Anonymous'}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!response}
            className="p-1 text-[#898781] hover:text-[#0b0b0b] transition-colors rounded disabled:opacity-30"
            title="Copy response text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#006300]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Model Name Input (Foldable) */}
      <div className="mb-2">
        {!modelInputExpanded && !modelsRevealed ? (
          <button
            type="button"
            onClick={() => setModelInputExpanded(true)}
            className="text-[11px] text-[#898781] hover:text-[#2a78d6] transition-colors flex items-center gap-1 font-medium"
          >
            <span>+ Set model name (hidden until reveal)</span>
            {modelName && <span className="text-[#006300]">(configured)</span>}
          </button>
        ) : (
          <div className="p-2 rounded bg-[#f9f9f7] border border-[#e1e0d9] mb-2">
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={`model-name-${id}`}
                className="text-[11px] font-medium text-[#52514e]"
              >
                Model name (hidden during judging)
              </label>
              {!modelsRevealed && (
                <button
                  type="button"
                  onClick={() => setModelInputExpanded(false)}
                  className="text-[10px] text-[#898781] hover:text-[#0b0b0b]"
                >
                  Hide input
                </button>
              )}
            </div>
            <input
              id={`model-name-${id}`}
              type="text"
              placeholder="e.g. GPT-4o, Claude 3.5, Gemini 2.5..."
              value={modelName}
              onChange={(e) => onChangeModelName(e.target.value)}
              className="w-full px-2.5 py-1 text-xs rounded border border-[#e1e0d9] bg-[#fcfcfb] text-[#0b0b0b] focus:outline-none focus:ring-2 focus:ring-[#2a78d6]"
            />
          </div>
        )}
      </div>

      {/* Real-time Hard-Check Chips & Deal-Breaker Critical Badges Bar */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5 min-h-6">
        {failedDealBreakers &&
          failedDealBreakers.map((critName) => (
            <span
              key={`dealbreaker-${critName}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#fdf2f2] text-[#d03b3b] border border-[#f5c2c2] shadow-xs"
              title={`Failed deal-breaker criterion "${critName}" with score ≤ 2. Weighted score capped at 2.0 and cannot beat a passing response.`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#d03b3b]" />
              <span>Critical: fails {critName}</span>
            </span>
          ))}

        {hardChecks.items.map((item) => (
          <Chip
            key={item.id}
            passed={item.passed}
            label={item.label}
            title={item.detail}
          />
        ))}
      </div>

      {/* Interactive Evidence Highlight Display if active */}
      {renderHighlightedContent()}

      {/* Textarea */}
      <div className="flex-1 flex flex-col">
        <label htmlFor={`response-${id}-textarea`} className="sr-only">
          {title} text
        </label>
        <textarea
          id={`response-${id}-textarea`}
          value={response}
          onChange={(e) => onChangeResponse(e.target.value)}
          placeholder={`Paste ${title} here...`}
          rows={9}
          className="w-full flex-1 p-3 text-xs leading-relaxed rounded-md border border-[#e1e0d9] bg-[#fcfcfb] text-[#0b0b0b] placeholder:text-[#898781] focus:outline-none focus:ring-2 focus:ring-[#2a78d6] focus:border-transparent font-sans resize-y"
        />
      </div>

      {/* Bottom stats */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-[#898781]">
        <span>
          {hardChecks.wordCount} words &bull; {response.length} chars
        </span>
        {response.trim().length > 0 && !hardChecks.allPassed && hardChecks.failedCount > 0 && (
          <span className="text-[#d03b3b] font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>Fails {hardChecks.failedCount} hard check{hardChecks.failedCount > 1 ? 's' : ''}</span>
          </span>
        )}
      </div>
    </div>
  );
};
