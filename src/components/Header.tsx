import React, { useState, useRef, useEffect } from 'react';
import { Scale, Sparkles, History as HistoryIcon, Sliders, Eye, EyeOff, Trash2, ChevronDown, Check } from 'lucide-react';
import { BUILT_IN_EXAMPLES } from '../utils/examples';
import { ExampleCase } from '../types/judge';

interface HeaderProps {
  onSelectExample: (example: ExampleCase) => void;
  onOpenRubric: () => void;
  onOpenHistory: () => void;
  onClear: () => void;
  historyCount: number;
  rubricWeightTotal: number;
  modelsRevealed: boolean;
  onToggleRevealModels: () => void;
  hasModelNames: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectExample,
  onOpenRubric,
  onOpenHistory,
  onClear,
  historyCount,
  rubricWeightTotal,
  modelsRevealed,
  onToggleRevealModels,
  hasModelNames,
}) => {
  const [examplesOpen, setExamplesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setExamplesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isRubricValid = rubricWeightTotal === 100;

  return (
    <header className="border-b border-[#e1e0d9] bg-[#fcfcfb] sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Logo and title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2a78d6] flex items-center justify-center text-white shadow-xs">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-base sm:text-lg tracking-tight text-[#0b0b0b]">
                SxS Judge
              </h1>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f2f2ef] text-[#52514e] border border-[#e1e0d9]">
                AI Evaluator
              </span>
            </div>
            <p className="text-xs text-[#898781] hidden sm:block">
              Evidence-backed blind evaluation &amp; order-swap bias check
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Examples Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setExamplesOpen(!examplesOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#e1e0d9] bg-[#fcfcfb] hover:bg-[#f2f2ef] text-[#0b0b0b] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#2a78d6]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2a78d6]" />
              <span>Load example</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#898781]" />
            </button>

            {examplesOpen && (
              <div className="absolute right-0 mt-1 w-72 bg-[#fcfcfb] border border-[#e1e0d9] rounded-lg shadow-lg py-1 z-50">
                <div className="px-3 py-1.5 border-b border-[#e1e0d9] text-[11px] font-semibold uppercase tracking-wider text-[#898781]">
                  Built-in test cases
                </div>
                {BUILT_IN_EXAMPLES.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      onSelectExample(ex);
                      setExamplesOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#f2f2ef] transition-colors flex flex-col gap-0.5"
                  >
                    <span className="font-medium text-[#0b0b0b] text-xs">{ex.title}</span>
                    <span className="text-[11px] text-[#52514e] leading-snug line-clamp-1">
                      {ex.tagline}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rubric Settings */}
          <button
            type="button"
            onClick={onOpenRubric}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#2a78d6] ${
              isRubricValid
                ? 'border-[#e1e0d9] bg-[#fcfcfb] hover:bg-[#f2f2ef] text-[#0b0b0b]'
                : 'border-[#f5c2c2] bg-[#fdf2f2] text-[#d03b3b]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Rubric</span>
            {!isRubricValid && (
              <span className="w-2 h-2 rounded-full bg-[#d03b3b]" title="Weights do not equal 100%" />
            )}
          </button>

          {/* Blind / Reveal Models Toggle */}
          <button
            type="button"
            onClick={onToggleRevealModels}
            title={modelsRevealed ? 'Hide model identities' : 'Reveal hidden model identities'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#2a78d6] ${
              modelsRevealed
                ? 'border-[#2a78d6] bg-[#eef4fc] text-[#2a78d6]'
                : 'border-[#e1e0d9] bg-[#fcfcfb] hover:bg-[#f2f2ef] text-[#52514e]'
            }`}
          >
            {modelsRevealed ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide models</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Reveal models</span>
                {hasModelNames && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2a78d6]" />
                )}
              </>
            )}
          </button>

          {/* History */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#e1e0d9] bg-[#fcfcfb] hover:bg-[#f2f2ef] text-[#0b0b0b] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#2a78d6]"
          >
            <HistoryIcon className="w-3.5 h-3.5 text-[#52514e]" />
            <span>History</span>
            {historyCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#2a78d6] text-white text-[10px] font-semibold">
                {historyCount}
              </span>
            )}
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-transparent hover:border-[#e1e0d9] hover:bg-[#f2f2ef] text-[#898781] hover:text-[#d03b3b] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#2a78d6]"
            title="Clear prompt and responses"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>
    </header>
  );
};
