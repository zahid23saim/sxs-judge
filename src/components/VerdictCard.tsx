import React from 'react';
import { Trophy, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, HelpCircle, ArrowRight, Bot } from 'lucide-react';
import { JudgeVerdictResult } from '../types/judge';

interface VerdictCardProps {
  verdict: JudgeVerdictResult;
  modelName1?: string;
  modelName2?: string;
  modelsRevealed: boolean;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({
  verdict,
  modelName1,
  modelName2,
  modelsRevealed,
}) => {
  const {
    winner,
    confidence,
    weightedScore1,
    weightedScore2,
    orderSwapBadge,
    unverifiedQuotesRemoved,
    concreteFix,
  } = verdict;

  let winnerTitle = '';
  let winnerSubtitle = '';

  if (winner === '1') {
    winnerTitle = 'Response 1 wins';
    winnerSubtitle = modelsRevealed && modelName1 ? `(${modelName1})` : '';
  } else if (winner === '2') {
    winnerTitle = 'Response 2 wins';
    winnerSubtitle = modelsRevealed && modelName2 ? `(${modelName2})` : '';
  } else {
    winnerTitle = 'Tie';
    winnerSubtitle = '';
  }

  const confidenceBadgeColor = {
    high: 'bg-[#eff8ef] text-[#006300] border-[#b8e2b8]',
    medium: 'bg-[#eef4fc] text-[#2a78d6] border-[#d2e3fc]',
    low: 'bg-[#fdf2f2] text-[#d03b3b] border-[#f5c2c2]',
  }[confidence] || 'bg-[#f2f2ef] text-[#52514e] border-[#e1e0d9]';

  // Determine order-swap label without leading symbols and correct tie wording
  let orderSwapLabel = '';
  if (orderSwapBadge.sensitive) {
    orderSwapLabel = 'Order-sensitive verdict';
  } else if (winner === 'tie' || orderSwapBadge.label.toLowerCase().includes('verdict')) {
    orderSwapLabel = 'Same verdict when order is swapped';
  } else {
    orderSwapLabel = orderSwapBadge.label.replace(/^[✓✔⚠\u2713\u2714\u26a0]\s*/u, '');
  }

  return (
    <div className="card-base p-4 sm:p-5 mb-5 bg-[#fcfcfb] border border-[#e1e0d9] shadow-xs">
      {/* Top Banner: Trophy circle, Title, Score, Score Bars, Chips */}
      <div className="space-y-3.5 pb-4 border-b border-[#e1e0d9]">
        {/* Row with 40px circle trophy + Title & Score on one line */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 min-w-10 min-h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs ${
              winner === 'tie' ? 'bg-[#52514e]' : 'bg-[#2a78d6]'
            }`}
          >
            {winner === 'tie' ? <ScaleIcon className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <h3 className="text-base sm:text-lg font-bold text-[#0b0b0b] truncate whitespace-nowrap">
                {winnerTitle}
              </h3>
              {winnerSubtitle && (
                <span className="text-xs text-[#2a78d6] font-semibold truncate whitespace-nowrap">
                  {winnerSubtitle}
                </span>
              )}
            </div>

            <p className="text-xs text-[#52514e] truncate">
              Weighted score:{' '}
              <span className={`font-semibold ${winner === '1' ? 'text-[#2a78d6]' : 'text-[#0b0b0b]'}`}>
                {weightedScore1.toFixed(1)}
              </span>{' '}
              vs{' '}
              <span className={`font-semibold ${winner === '2' ? 'text-[#2a78d6]' : 'text-[#0b0b0b]'}`}>
                {weightedScore2.toFixed(1)}
              </span>{' '}
              <span className="text-[#898781]">out of 5</span>
            </p>
          </div>
        </div>

        {/* Score Bars: Two thin horizontal bars (0 to 5) */}
        <div className="space-y-2 pt-0.5">
          {/* Response 1 Bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-[#0b0b0b] font-medium mb-1">
              <span>Response 1 · {weightedScore1.toFixed(1)}</span>
            </div>
            <div className="h-1.5 w-full bg-[#e1e0d9] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, (weightedScore1 / 5) * 100))}%`,
                  backgroundColor: winner === '1' || winner === 'tie' ? '#2a78d6' : '#898781',
                }}
              />
            </div>
          </div>

          {/* Response 2 Bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-[#0b0b0b] font-medium mb-1">
              <span>Response 2 · {weightedScore2.toFixed(1)}</span>
            </div>
            <div className="h-1.5 w-full bg-[#e1e0d9] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, (weightedScore2 / 5) * 100))}%`,
                  backgroundColor: winner === '2' || winner === 'tie' ? '#2a78d6' : '#898781',
                }}
              />
            </div>
          </div>
        </div>

        {/* Chips row under the title and score */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {/* Confidence Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${confidenceBadgeColor}`}
          >
            <span>Confidence:</span>
            <span className="capitalize">{confidence}</span>
          </span>

          {/* Order-swap badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${
              orderSwapBadge.sensitive
                ? 'bg-[#fdf2f2] text-[#d03b3b] border-[#f5c2c2]'
                : 'bg-[#eff8ef] text-[#006300] border-[#b8e2b8]'
            }`}
            title={
              orderSwapBadge.sensitive
                ? 'The evaluator picked different winners when the response order was swapped. The verdict is forced to Tie with Low confidence.'
                : 'The dual-run order-swap test confirmed consistent winner and rankings.'
            }
          >
            {orderSwapBadge.sensitive ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
            )}
            <span>{orderSwapLabel}</span>
          </span>

          {/* Model info badge */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-[#e1e0d9] bg-[#f9f9f7] text-[#52514e]"
            title="The Gemini model that evaluated this side-by-side comparison"
          >
            <Bot className="w-3.5 h-3.5 text-[#2a78d6]" />
            <span>Judged by {verdict.judgedByModel || 'Gemini 3.5 Flash Lite'}</span>
          </span>
        </div>
      </div>

      {/* Quote Verification Audit Note */}
      <div className="pt-3 pb-3 border-b border-[#e1e0d9] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-[#52514e]">
          <ShieldCheck className="w-4 h-4 text-[#2a78d6] shrink-0" />
          <span>Verbatim evidence quote audit:</span>
        </div>
        <div>
          {unverifiedQuotesRemoved > 0 ? (
            <span className="inline-flex items-center gap-1 text-[#d03b3b] font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {unverifiedQuotesRemoved} quote{unverifiedQuotesRemoved > 1 ? 's' : ''} couldn&apos;t be found in the response and {unverifiedQuotesRemoved > 1 ? 'were' : 'was'} removed
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[#006300] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>All evidence quotes verified in source text</span>
            </span>
          )}
        </div>
      </div>

      {/* Concrete Fix Section */}
      {concreteFix && (
        <div className="pt-3">
          <div className="p-3 rounded-lg bg-[#f9f9f7] border border-[#e1e0d9]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0b0b0b] mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#2a78d6]" />
              <span>Concrete improvement for {winner === '1' ? 'Response 2' : winner === '2' ? 'Response 1' : 'either response'}:</span>
            </div>
            <p className="text-xs text-[#52514e] leading-relaxed">
              {concreteFix}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

function ScaleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
      />
    </svg>
  );
}
