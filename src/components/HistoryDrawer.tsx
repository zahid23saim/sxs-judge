import React from 'react';
import { X, Trash2, Download, ExternalLink, Calendar, Trophy, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { HistoryItem } from '../types/judge';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onReopen: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onReopen,
  onDelete,
  onClearAll,
}) => {
  const [confirmDeleteAll, setConfirmDeleteAll] = React.useState(false);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    if (history.length === 0) return;

    const headers = [
      'ID',
      'Date',
      'Prompt',
      'Winner',
      'R1 Score',
      'R2 Score',
      'Confidence',
      'Order Sensitive',
      'Model 1',
      'Model 2',
      'Justification',
    ];

    const escapeCsv = (str: string | undefined | null) => {
      if (str === null || str === undefined) return '""';
      const escaped = String(str).replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = history.map((item) => [
      escapeCsv(item.id),
      escapeCsv(item.dateFormatted),
      escapeCsv(item.prompt),
      escapeCsv(
        item.winner === '1'
          ? 'Response 1'
          : item.winner === '2'
          ? 'Response 2'
          : 'Tie'
      ),
      escapeCsv(item.weightedScore1.toFixed(1)),
      escapeCsv(item.weightedScore2.toFixed(1)),
      escapeCsv(item.verdict.confidence),
      escapeCsv(item.verdict.orderSensitive ? 'Yes' : 'No'),
      escapeCsv(item.modelName1 || 'Anonymous'),
      escapeCsv(item.modelName2 || 'Anonymous'),
      escapeCsv(item.verdict.justification),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sxs-evaluations-history-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-end">
      <div className="card-base w-full max-w-md h-full bg-[#fcfcfb] border-l border-[#e1e0d9] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[#e1e0d9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#0b0b0b]">
              Evaluation History
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#f2f2ef] text-[#52514e] font-medium border border-[#e1e0d9]">
              {history.length} / 25
            </span>
          </div>

          <div className="flex items-center gap-1">
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-[#2a78d6] hover:bg-[#eef4fc] transition-colors"
                title="Export all evaluations to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[#898781] hover:text-[#0b0b0b] hover:bg-[#f2f2ef] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-[#898781]">
              <p className="text-xs">No evaluations saved yet.</p>
              <p className="text-[11px] mt-1 text-[#52514e]">
                Completed judging sessions will automatically be stored here in your browser.
              </p>
            </div>
          ) : (
            history.map((item) => {
              const winnerLabel =
                item.winner === '1'
                  ? 'Response 1 wins'
                  : item.winner === '2'
                  ? 'Response 2 wins'
                  : 'Tie';

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-[#e1e0d9] bg-[#f9f9f7] hover:border-[#2a78d6]/40 transition-colors group space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] text-[#898781]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{item.dateFormatted}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      className="text-[#898781] hover:text-[#d03b3b] opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs font-medium text-[#0b0b0b] line-clamp-2">
                    &ldquo;{item.prompt}&rdquo;
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-[#e1e0d9] text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          item.winner === '1' || item.winner === '2'
                            ? 'bg-[#eef4fc] text-[#2a78d6]'
                            : 'bg-[#f2f2ef] text-[#52514e]'
                        }`}
                      >
                        {winnerLabel}
                      </span>
                      <span className="text-[11px] text-[#52514e]">
                        {item.weightedScore1.toFixed(1)} vs {item.weightedScore2.toFixed(1)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onReopen(item);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-[#2a78d6] font-medium hover:underline"
                    >
                      <span>Reopen</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-3 border-t border-[#e1e0d9] bg-[#f9f9f7] flex items-center justify-between text-xs">
            {confirmDeleteAll ? (
              <div className="flex items-center gap-2">
                <span className="text-[#d03b3b] font-medium text-[11px]">Delete all?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setConfirmDeleteAll(false);
                  }}
                  className="px-2 py-0.5 rounded bg-[#d03b3b] text-white text-[11px] font-medium hover:bg-[#b02a2a] transition-colors"
                >
                  Yes, delete all
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAll(false)}
                  className="px-2 py-0.5 rounded text-[#52514e] hover:bg-[#e1e0d9] text-[11px] transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteAll(true)}
                className="text-xs text-[#898781] hover:text-[#d03b3b] transition-colors"
              >
                Clear all history
              </button>
            )}
            <span className="text-[11px] text-[#898781]">Stored in browser</span>
          </div>
        )}
      </div>
    </div>
  );
};
