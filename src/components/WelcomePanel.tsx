import React from 'react';
import { X, Sparkles, CheckCircle2, ShieldCheck, Scale, ArrowRight } from 'lucide-react';

interface WelcomePanelProps {
  onDismiss: () => void;
  onTryExample: () => void;
}

export const WelcomePanel: React.FC<WelcomePanelProps> = ({ onDismiss, onTryExample }) => {
  return (
    <div className="card-base p-4 sm:p-5 relative mb-5 bg-[#fcfcfb] border border-[#e1e0d9] shadow-xs">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-3.5 right-3.5 p-1 rounded-md text-[#898781] hover:text-[#0b0b0b] hover:bg-[#f2f2ef] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2a78d6]"
        aria-label="Dismiss welcome guide"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="pr-8">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-[#2a78d6]" />
          <h2 className="text-sm font-semibold text-[#0b0b0b]">
            Fast, defensible AI Side-by-Side (SxS) evaluation
          </h2>
        </div>
        <p className="text-xs text-[#52514e] leading-relaxed max-w-3xl">
          Evaluate competing AI responses objectively without tedious manual word counts or subjective biases.
          SxS Judge checks hard constraints in code (word limits, required phrases, format), runs bias-resistant double judging with response order swapping, and ties every verdict to exact verbatim evidence.
        </p>

        {/* The 3 Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3.5 pt-1">
          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#f9f9f7] border border-[#e1e0d9]">
            <div className="w-5 h-5 rounded-full bg-[#2a78d6] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0b0b0b]">Paste &amp; set constraints</p>
              <p className="text-[11px] text-[#52514e] leading-tight mt-0.5">
                Input your prompt, constraints (words, phrases, format), and anonymous answers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#f9f9f7] border border-[#e1e0d9]">
            <div className="w-5 h-5 rounded-full bg-[#2a78d6] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0b0b0b]">Instant hard checks</p>
              <p className="text-[11px] text-[#52514e] leading-tight mt-0.5">
                Computes word counts, punctuation cut-offs, format syntax, and phrase matches live as you type.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#f9f9f7] border border-[#e1e0d9]">
            <div className="w-5 h-5 rounded-full bg-[#2a78d6] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
              3
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0b0b0b]">Dual-order AI judge</p>
              <p className="text-[11px] text-[#52514e] leading-tight mt-0.5">
                Swaps order to eliminate position bias. If a response fails a deal-breaker criterion (like Accuracy ≤ 2), its score is capped at 2.0 and it cannot beat a passing response.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar with Try Example & Privacy Note */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#e1e0d9]">
          <button
            type="button"
            onClick={onTryExample}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2a78d6] hover:bg-[#2163b2] text-white text-xs font-medium transition-colors shadow-xs w-fit focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2a78d6]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try an example</span>
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </button>

          <p className="text-[11px] text-[#898781] leading-tight">
            <span className="font-medium text-[#52514e]">Privacy note:</span> Don&apos;t paste confidential or customer data. Text is sent to Gemini only when you press Judge, and your history stays in this browser.
          </p>
        </div>
      </div>
    </div>
  );
};
