import React from 'react';
import { X, Plus, Trash2, AlertTriangle, RotateCcw, Check, Sparkles } from 'lucide-react';
import { Criterion } from '../types/judge';
import { DEFAULT_RUBRIC, SCORE_ANCHORS } from '../utils/rubric';

interface RubricModalProps {
  isOpen: boolean;
  onClose: () => void;
  rubric: Criterion[];
  onChange: (updatedRubric: Criterion[]) => void;
}

export const RubricModalOrPanel: React.FC<RubricModalProps> = ({
  isOpen,
  onClose,
  rubric,
  onChange,
}) => {
  if (!isOpen) return null;

  const totalWeight = rubric.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const isValid = totalWeight === 100;

  const handleUpdateCriterion = (index: number, updates: Partial<Criterion>) => {
    const updated = [...rubric];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const handleRemoveCriterion = (index: number) => {
    if (rubric.length <= 1) return;
    const updated = rubric.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleAddCriterion = () => {
    const newId = `criterion_${Date.now()}`;
    const updated = [
      ...rubric,
      {
        id: newId,
        name: 'New criterion',
        weight: 10,
        description: 'Custom evaluation dimension.',
        isDealBreaker: false,
      },
    ];
    onChange(updated);
  };

  const handleAutoBalance = () => {
    if (rubric.length === 0) return;
    const currentTotal = totalWeight || 1;
    let distributed = 0;
    const updated = rubric.map((c, i) => {
      if (i === rubric.length - 1) {
        return { ...c, weight: Math.max(1, 100 - distributed) };
      }
      const raw = Math.round((c.weight / currentTotal) * 100);
      distributed += raw;
      return { ...c, weight: Math.max(1, raw) };
    });
    onChange(updated);
  };

  const handleResetDefault = () => {
    onChange(JSON.parse(JSON.stringify(DEFAULT_RUBRIC)));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="card-base w-full max-w-2xl bg-[#fcfcfb] border border-[#e1e0d9] shadow-xl rounded-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e1e0d9] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#0b0b0b]">
              Evaluation Rubric &amp; Weights
            </h3>
            <p className="text-xs text-[#898781]">
              Each criterion is evaluated on a 1–5 scale. Weights must sum to exactly 100%.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#898781] hover:text-[#0b0b0b] hover:bg-[#f2f2ef] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2a78d6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Total Weight Status Bar */}
        <div
          className={`px-5 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
            isValid
              ? 'bg-[#eff8ef] text-[#006300] border-[#b8e2b8]'
              : 'bg-[#fdf2f2] text-[#d03b3b] border-[#f5c2c2]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {isValid ? (
              <>
                <Check className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                <span>Total weight: 100% (valid)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Total weight: {totalWeight}% (Must equal 100% — currently{' '}
                  {totalWeight > 100 ? `${totalWeight - 100}% over` : `${100 - totalWeight}% under`})
                </span>
              </>
            )}
          </div>

          {!isValid && (
            <button
              type="button"
              onClick={handleAutoBalance}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#2a78d6] text-white hover:bg-[#2163b2] text-[11px] font-medium transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              <span>Auto-balance to 100%</span>
            </button>
          )}
        </div>

        {/* Criteria List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {rubric.map((criterion, idx) => (
            <div
              key={criterion.id}
              className="p-3.5 rounded-lg border border-[#e1e0d9] bg-[#f9f9f7] space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label
                    htmlFor={`criterion-name-${idx}`}
                    className="block text-[11px] font-medium text-[#898781] mb-0.5"
                  >
                    Criterion Name
                  </label>
                  <input
                    id={`criterion-name-${idx}`}
                    type="text"
                    value={criterion.name}
                    onChange={(e) =>
                      handleUpdateCriterion(idx, { name: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-md border border-[#e1e0d9] bg-[#fcfcfb] text-[#0b0b0b] focus:outline-none focus:ring-2 focus:ring-[#2a78d6]"
                  />
                </div>

                <div className="w-24">
                  <label
                    htmlFor={`criterion-weight-${idx}`}
                    className="block text-[11px] font-medium text-[#898781] mb-0.5"
                  >
                    Weight (%)
                  </label>
                  <div className="relative">
                    <input
                      id={`criterion-weight-${idx}`}
                      type="number"
                      min="1"
                      max="100"
                      value={criterion.weight}
                      onChange={(e) =>
                        handleUpdateCriterion(idx, {
                          weight: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full pl-2.5 pr-6 py-1.5 text-xs font-semibold text-right rounded-md border border-[#e1e0d9] bg-[#fcfcfb] text-[#0b0b0b] focus:outline-none focus:ring-2 focus:ring-[#2a78d6]"
                    />
                    <span className="absolute right-2 top-1.5 text-xs text-[#898781] pointer-events-none">
                      %
                    </span>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => handleRemoveCriterion(idx)}
                    disabled={rubric.length <= 1}
                    className="p-1.5 rounded-md text-[#898781] hover:text-[#d03b3b] hover:bg-[#fdf2f2] transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    title="Remove criterion"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor={`criterion-desc-${idx}`}
                  className="block text-[11px] font-medium text-[#898781] mb-0.5"
                >
                  Description &amp; Guidelines
                </label>
                <input
                  id={`criterion-desc-${idx}`}
                  type="text"
                  value={criterion.description || ''}
                  onChange={(e) =>
                    handleUpdateCriterion(idx, { description: e.target.value })
                  }
                  placeholder="Evaluation guidelines for the judge..."
                  className="w-full px-2.5 py-1 text-xs rounded-md border border-[#e1e0d9] bg-[#fcfcfb] text-[#52514e] focus:outline-none focus:ring-2 focus:ring-[#2a78d6]"
                />
              </div>

              {/* Deal-breaker toggle */}
              <div className="pt-1 flex items-center justify-between border-t border-[#e1e0d9]/60">
                <label
                  htmlFor={`criterion-dealbreaker-${idx}`}
                  className="inline-flex items-center gap-2 cursor-pointer select-none"
                >
                  <input
                    id={`criterion-dealbreaker-${idx}`}
                    type="checkbox"
                    checked={Boolean(criterion.isDealBreaker)}
                    onChange={(e) =>
                      handleUpdateCriterion(idx, { isDealBreaker: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-[#e1e0d9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-[#d03b3b] relative"></div>
                  <span className="text-[11px] font-medium text-[#0b0b0b] flex items-center gap-1.5">
                    <span className={criterion.isDealBreaker ? 'font-semibold text-[#d03b3b]' : 'text-[#52514e]'}>
                      Deal-breaker
                    </span>
                    <span className="text-[10px] text-[#898781]">
                      {criterion.isDealBreaker
                        ? '(If score ≤ 2, score caps at 2.0 & cannot beat a passing response)'
                        : '(Off)'}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          ))}

          {/* Add Criterion Button */}
          <button
            type="button"
            onClick={handleAddCriterion}
            className="w-full py-2 border border-dashed border-[#e1e0d9] hover:border-[#2a78d6] hover:bg-[#eef4fc]/40 rounded-lg text-xs font-medium text-[#2a78d6] flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2a78d6]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add custom criterion</span>
          </button>

          {/* Score Anchors Reference */}
          <div className="pt-2 border-t border-[#e1e0d9]">
            <p className="text-[11px] font-semibold text-[#898781] mb-1.5 uppercase tracking-wider">
              1–5 Score Anchors Reference
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 text-[11px]">
              {Object.entries(SCORE_ANCHORS).map(([score, anchor]) => (
                <div key={score} className="p-1.5 rounded bg-[#f2f2ef] border border-[#e1e0d9]">
                  <span className="font-bold text-[#0b0b0b]">{score}</span>
                  <p className="text-[#52514e] text-[10px] leading-tight mt-0.5">{anchor}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e1e0d9] bg-[#f9f9f7] flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefault}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#52514e] hover:text-[#0b0b0b] font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#898781]" />
            <span>Reset to default</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#2a78d6] hover:bg-[#2163b2] text-white text-xs font-medium transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-[#2a78d6]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
