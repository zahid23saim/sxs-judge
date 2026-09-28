import React from 'react';
import { CriterionScoreResult, Criterion } from '../types/judge';
import { Quote, Check, ArrowUpRight } from 'lucide-react';

interface CriteriaTableProps {
  criteriaScores: CriterionScoreResult[];
  rubric: Criterion[];
  onQuoteClick: (quote: string, targetResponse: '1' | '2') => void;
  activeHighlightQuote?: string | null;
  modelsRevealed: boolean;
  modelName1?: string;
  modelName2?: string;
}

export const CriteriaTable: React.FC<CriteriaTableProps> = ({
  criteriaScores,
  rubric,
  onQuoteClick,
  activeHighlightQuote,
  modelsRevealed,
  modelName1,
  modelName2,
}) => {
  const getCriterionInfo = (id: string, name: string): { weight: number; isDealBreaker?: boolean } => {
    const found = rubric.find(
      (r) => r.id === id || r.name.toLowerCase() === name.toLowerCase()
    );
    return {
      weight: found ? found.weight : 0,
      isDealBreaker: found?.isDealBreaker,
    };
  };

  const resp1Header = modelsRevealed && modelName1 ? `Response 1 (${modelName1})` : 'Response 1';
  const resp2Header = modelsRevealed && modelName2 ? `Response 2 (${modelName2})` : 'Response 2';

  return (
    <div className="card-base overflow-hidden border border-[#e1e0d9]">
      <div className="px-4 py-3 border-b border-[#e1e0d9] bg-[#fcfcfb] flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#0b0b0b]">
            Criteria Scoring &amp; Evidence Breakdown
          </h4>
          <p className="text-[11px] text-[#898781]">
            Averaged across dual order-swapped runs. Click any quote to highlight it inside the response text.
          </p>
        </div>
      </div>

      {/* Mobile Stacked Cards View (under 640px) */}
      <div className="block sm:hidden divide-y divide-[#e1e0d9]">
        {criteriaScores.map((c) => {
          const { weight, isDealBreaker } = getCriterionInfo(c.criterionId, c.criterionName);
          const score1 = c.score1;
          const score2 = c.score2;
          const r1WinsCriterion = score1 > score2;
          const r2WinsCriterion = score2 > score1;

          return (
            <div key={`mobile-${c.criterionId || c.criterionName}`} className="p-4 space-y-3 bg-[#fcfcfb]">
              {/* Card Header: Criterion Name, Deal-breaker badge & Weight */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-xs text-[#0b0b0b]">
                    {c.criterionName}
                  </span>
                  {isDealBreaker && (
                    <span className="text-[10px] font-semibold text-[#d03b3b] bg-[#fdf2f2] border border-[#f5c2c2] px-1.5 py-0.5 rounded">
                      Deal-breaker
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-[#898781] px-2 py-0.5 rounded bg-[#f2f2ef] border border-[#e1e0d9]">
                  Weight: {weight}%
                </span>
              </div>

              {/* Both Scores Side-by-Side */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div
                  className={`p-2 rounded-md border ${
                    r1WinsCriterion
                      ? 'bg-[#eef4fc] border-[#2a78d6]/40 text-[#2a78d6]'
                      : 'bg-[#f9f9f7] border-[#e1e0d9] text-[#0b0b0b]'
                  }`}
                >
                  <p className="text-[10px] text-[#52514e] font-medium truncate mb-0.5">
                    {resp1Header}
                  </p>
                  <span className="text-base font-bold">
                    {score1}
                    <span className="text-[10px] text-[#898781] font-normal"> / 5</span>
                  </span>
                  {r1WinsCriterion && (
                    <span className="block text-[9px] font-semibold text-[#2a78d6] mt-0.5">
                      Higher
                    </span>
                  )}
                </div>

                <div
                  className={`p-2 rounded-md border ${
                    r2WinsCriterion
                      ? 'bg-[#eef4fc] border-[#2a78d6]/40 text-[#2a78d6]'
                      : 'bg-[#f9f9f7] border-[#e1e0d9] text-[#0b0b0b]'
                  }`}
                >
                  <p className="text-[10px] text-[#52514e] font-medium truncate mb-0.5">
                    {resp2Header}
                  </p>
                  <span className="text-base font-bold">
                    {score2}
                    <span className="text-[10px] text-[#898781] font-normal"> / 5</span>
                  </span>
                  {r2WinsCriterion && (
                    <span className="block text-[9px] font-semibold text-[#2a78d6] mt-0.5">
                      Higher
                    </span>
                  )}
                </div>
              </div>

              {/* Rationale */}
              <p className="text-xs text-[#52514e] leading-relaxed">
                {c.rationale}
              </p>

              {/* Quotes */}
              {(c.evidenceQuotes1?.length > 0 || c.evidenceQuotes2?.length > 0) && (
                <div className="space-y-2 pt-2 border-t border-[#e1e0d9]/60">
                  {c.evidenceQuotes1 && c.evidenceQuotes1.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-[#898781]">
                        R1 evidence quotes:
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {c.evidenceQuotes1.map((q, qIdx) => {
                          const isSelected = activeHighlightQuote === q;
                          return (
                            <button
                              key={`m-r1-q-${qIdx}`}
                              type="button"
                              onClick={() => onQuoteClick(q, '1')}
                              title="Click to view & highlight in Response 1"
                              className={`inline-flex items-start gap-1.5 text-[11px] px-2.5 py-1.5 rounded border text-left transition-colors font-mono w-full ${
                                isSelected
                                  ? 'bg-[#fde047] text-[#0b0b0b] border-[#ca8a04] font-semibold ring-2 ring-[#ca8a04]/40'
                                  : 'bg-[#f2f2ef] hover:bg-[#e1e0d9] text-[#0b0b0b] border-[#e1e0d9]'
                              }`}
                            >
                              <Quote className="w-2.5 h-2.5 shrink-0 text-[#898781] mt-0.5" />
                              <span className="break-words whitespace-normal leading-relaxed select-text">&ldquo;{q}&rdquo;</span>
                              <ArrowUpRight className="w-2.5 h-2.5 shrink-0 opacity-60 mt-0.5 ml-auto" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {c.evidenceQuotes2 && c.evidenceQuotes2.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-[#898781]">
                        R2 evidence quotes:
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {c.evidenceQuotes2.map((q, qIdx) => {
                          const isSelected = activeHighlightQuote === q;
                          return (
                            <button
                              key={`m-r2-q-${qIdx}`}
                              type="button"
                              onClick={() => onQuoteClick(q, '2')}
                              title="Click to view & highlight in Response 2"
                              className={`inline-flex items-start gap-1.5 text-[11px] px-2.5 py-1.5 rounded border text-left transition-colors font-mono w-full ${
                                isSelected
                                  ? 'bg-[#fde047] text-[#0b0b0b] border-[#ca8a04] font-semibold ring-2 ring-[#ca8a04]/40'
                                  : 'bg-[#f2f2ef] hover:bg-[#e1e0d9] text-[#0b0b0b] border-[#e1e0d9]'
                              }`}
                            >
                              <Quote className="w-2.5 h-2.5 shrink-0 text-[#898781] mt-0.5" />
                              <span className="break-words whitespace-normal leading-relaxed select-text">&ldquo;{q}&rdquo;</span>
                              <ArrowUpRight className="w-2.5 h-2.5 shrink-0 opacity-60 mt-0.5 ml-auto" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop/Tablet Wide Table View (640px and wider) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#e1e0d9] bg-[#f9f9f7] text-[#52514e] font-semibold text-[11px]">
              <th className="py-3 px-4 w-48 shrink-0">Criterion</th>
              <th className="py-3 px-3 text-center w-28 shrink-0">{resp1Header}</th>
              <th className="py-3 px-3 text-center w-28 shrink-0">{resp2Header}</th>
              <th className="py-3 px-5">Rationale &amp; Verifiable Evidence Quotes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e1e0d9]">
            {criteriaScores.map((c) => {
              const { weight, isDealBreaker } = getCriterionInfo(c.criterionId, c.criterionName);
              const score1 = c.score1;
              const score2 = c.score2;
              const r1WinsCriterion = score1 > score2;
              const r2WinsCriterion = score2 > score1;

              return (
                <tr key={c.criterionId || c.criterionName} className="hover:bg-[#f9f9f7]/60 transition-colors">
                  {/* Criterion column */}
                  <td className="py-3.5 px-4 align-top w-48">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-[#0b0b0b] block text-xs">
                        {c.criterionName}
                      </span>
                      {isDealBreaker && (
                        <span className="inline-flex items-center gap-1 w-fit text-[10px] font-semibold text-[#d03b3b] bg-[#fdf2f2] border border-[#f5c2c2] px-1.5 py-0.5 rounded">
                          Deal-breaker
                        </span>
                      )}
                      <span className="text-[10px] text-[#898781] block">
                        Weight: {weight}%
                      </span>
                    </div>
                  </td>

                  {/* Score 1 */}
                  <td className="py-3.5 px-3 text-center align-top w-28">
                    <div className="inline-flex flex-col items-center">
                      <span
                        className={`text-sm font-bold px-2 py-0.5 rounded ${
                          r1WinsCriterion
                            ? 'bg-[#eef4fc] text-[#2a78d6] ring-1 ring-[#2a78d6]/30'
                            : 'text-[#0b0b0b]'
                        }`}
                      >
                        {score1}
                        <span className="text-[10px] text-[#898781] font-normal"> / 5</span>
                      </span>
                      {r1WinsCriterion && (
                        <span className="text-[9px] font-semibold text-[#2a78d6] mt-0.5">
                          Higher
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Score 2 */}
                  <td className="py-3.5 px-3 text-center align-top w-28">
                    <div className="inline-flex flex-col items-center">
                      <span
                        className={`text-sm font-bold px-2 py-0.5 rounded ${
                          r2WinsCriterion
                            ? 'bg-[#eef4fc] text-[#2a78d6] ring-1 ring-[#2a78d6]/30'
                            : 'text-[#0b0b0b]'
                        }`}
                      >
                        {score2}
                        <span className="text-[10px] text-[#898781] font-normal"> / 5</span>
                      </span>
                      {r2WinsCriterion && (
                        <span className="text-[9px] font-semibold text-[#2a78d6] mt-0.5">
                          Higher
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Rationale & Evidence Quotes - Takes most of the width, full wrapped quotes */}
                  <td className="py-3.5 px-5 align-top space-y-2.5">
                    <p className="text-xs text-[#52514e] leading-relaxed">
                      {c.rationale}
                    </p>

                    {/* Evidence Quotes */}
                    {(c.evidenceQuotes1?.length > 0 || c.evidenceQuotes2?.length > 0) && (
                      <div className="space-y-2 pt-1 border-t border-[#e1e0d9]/60">
                        {/* Quotes for Response 1 */}
                        {c.evidenceQuotes1 && c.evidenceQuotes1.length > 0 && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-[#898781]">
                              R1 evidence quotes:
                            </span>
                            <div className="flex flex-wrap items-start gap-2">
                              {c.evidenceQuotes1.map((q, qIdx) => {
                                const isSelected = activeHighlightQuote === q;
                                return (
                                  <button
                                    key={`r1-q-${qIdx}`}
                                    type="button"
                                    onClick={() => onQuoteClick(q, '1')}
                                    title="Click to view & highlight in Response 1"
                                    className={`inline-flex items-start gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md border text-left transition-colors font-mono max-w-full ${
                                      isSelected
                                        ? 'bg-[#fde047] text-[#0b0b0b] border-[#ca8a04] font-semibold ring-2 ring-[#ca8a04]/40'
                                        : 'bg-[#f2f2ef] hover:bg-[#e1e0d9] text-[#0b0b0b] border-[#e1e0d9]'
                                    }`}
                                  >
                                    <Quote className="w-3 h-3 shrink-0 text-[#898781] mt-0.5" />
                                    <span className="break-words whitespace-normal leading-relaxed select-text">
                                      &ldquo;{q}&rdquo;
                                    </span>
                                    <ArrowUpRight className="w-3 h-3 shrink-0 opacity-60 mt-0.5" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Quotes for Response 2 */}
                        {c.evidenceQuotes2 && c.evidenceQuotes2.length > 0 && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-[#898781]">
                              R2 evidence quotes:
                            </span>
                            <div className="flex flex-wrap items-start gap-2">
                              {c.evidenceQuotes2.map((q, qIdx) => {
                                const isSelected = activeHighlightQuote === q;
                                return (
                                  <button
                                    key={`r2-q-${qIdx}`}
                                    type="button"
                                    onClick={() => onQuoteClick(q, '2')}
                                    title="Click to view & highlight in Response 2"
                                    className={`inline-flex items-start gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md border text-left transition-colors font-mono max-w-full ${
                                      isSelected
                                        ? 'bg-[#fde047] text-[#0b0b0b] border-[#ca8a04] font-semibold ring-2 ring-[#ca8a04]/40'
                                        : 'bg-[#f2f2ef] hover:bg-[#e1e0d9] text-[#0b0b0b] border-[#e1e0d9]'
                                    }`}
                                  >
                                    <Quote className="w-3 h-3 shrink-0 text-[#898781] mt-0.5" />
                                    <span className="break-words whitespace-normal leading-relaxed select-text">
                                      &ldquo;{q}&rdquo;
                                    </span>
                                    <ArrowUpRight className="w-3 h-3 shrink-0 opacity-60 mt-0.5" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
