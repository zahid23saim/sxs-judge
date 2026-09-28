import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { FormatType, HardConstraints } from '../types/judge';

interface HardConstraintsFormProps {
  constraints: HardConstraints;
  onChange: (updated: HardConstraints) => void;
}

export const HardConstraintsForm: React.FC<HardConstraintsFormProps> = ({
  constraints,
  onChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const activeCount = [
    constraints.maxWords !== null,
    constraints.minWords !== null,
    constraints.mustInclude.trim().length > 0,
    constraints.mustAvoid.trim().length > 0,
    constraints.format !== 'none',
  ].filter(Boolean).length;

  const handleMaxWordsChange = (val: string) => {
    const parsed = val.trim() === '' ? null : parseInt(val, 10);
    onChange({
      ...constraints,
      maxWords: isNaN(parsed as number) ? null : parsed,
    });
  };

  const handleMinWordsChange = (val: string) => {
    const parsed = val.trim() === '' ? null : parseInt(val, 10);
    onChange({
      ...constraints,
      minWords: isNaN(parsed as number) ? null : parsed,
    });
  };

  const handleFormatChange = (val: FormatType) => {
    onChange({
      ...constraints,
      format: val,
    });
  };

  return (
    <div className="card-base mb-4 overflow-hidden border border-[#e1e0d9]">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 bg-[#fcfcfb] hover:bg-[#f9f9f7] flex items-center justify-between transition-colors text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#2a78d6]"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#2a78d6]" />
          <span className="text-xs font-semibold text-[#0b0b0b]">
            Hard constraints (optional)
          </span>
          {activeCount > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#eef4fc] text-[#2a78d6] border border-[#d2e3fc]">
              {activeCount} active
            </span>
          ) : (
            <span className="text-[11px] text-[#898781]">None set</span>
          )}
        </div>
        <div className="text-[#898781]">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 pt-2 border-t border-[#e1e0d9] bg-[#fcfcfb] space-y-3">
          {/* Word limits grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="constraint-max-words"
                className="block text-xs font-medium text-[#52514e] mb-1"
              >
                Max words
              </label>
              <input
                id="constraint-max-words"
                type="number"
                min="1"
                placeholder="e.g. 60"
                value={constraints.maxWords ?? ''}
                onChange={(e) => handleMaxWordsChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-[#e1e0d9] bg-[#fcfcfb] text-[#0b0b0b] placeholder:text-[#898781] focus:outline-none focus:ring-2 focus:ring-[#2a78d6] focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="constraint-min-words"
                className="block text-xs font-medium text-[#52514e] mb-1"
              >
                Min words
              </label>
              <input
                id="constraint-min-words"
                type="number"
                min="1"
                placeholder="e.g. 20"
                value={constraints.minWords ?? ''}
                onChange={(e) => handleMinWordsChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-[#e1e0d9] bg-[#fcfcfb] text-[#0b0b0b] placeholder:text-[#898781] focus:outline-none focus:ring-2 focus:ring-[#2a78d6] focus:border-transparent"
              />
            </div>
          </div>

          {/* Phrases grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="constraint-must-include"
                className="block text-xs font-medium text-[#52514e] mb-1"
              >
                Must include (comma-separated)
              </label>
              <input
                id="constraint-must-include"
                type="text"
                placeholder="e.g. key terms, citations"
                value={constraints.mustInclude}
                onChange={(e) =>
                  onChange({ ...constraints, mustInclude: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs rounded-md border border-[#e1e0d9] bg-[#fcfcfb] text-[#0b0b0b] placeholder:text-[#898781] focus:outline-none focus:ring-2 focus:ring-[#2a78d6] focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="constraint-must-avoid"
                className="block text-xs font-medium text-[#52514e] mb-1"
              >
                Must avoid (comma-separated)
              </label>
              <input
                id="constraint-must-avoid"
                type="text"
                placeholder="e.g. as an AI, unfortunately"
                value={constraints.mustAvoid}
                onChange={(e) =>
                  onChange({ ...constraints, mustAvoid: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs rounded-md border border-[#e1e0d9] bg-[#fcfcfb] text-[#0b0b0b] placeholder:text-[#898781] focus:outline-none focus:ring-2 focus:ring-[#2a78d6] focus:border-transparent"
              />
            </div>
          </div>

          {/* Required format */}
          <div>
            <label
              htmlFor="constraint-format"
              className="block text-xs font-medium text-[#52514e] mb-1"
            >
              Required format
            </label>
            <select
              id="constraint-format"
              value={constraints.format}
              onChange={(e) => handleFormatChange(e.target.value as FormatType)}
              className="w-full px-3 py-1.5 text-xs rounded-md border border-[#e1e0d9] bg-[#fcfcfb] text-[#0b0b0b] focus:outline-none focus:ring-2 focus:ring-[#2a78d6] focus:border-transparent"
            >
              <option value="none">None (any format accepted)</option>
              <option value="bullet_list">Bullet list</option>
              <option value="numbered_list">Numbered list</option>
              <option value="json">Valid JSON (JSON.parse)</option>
              <option value="single_paragraph">Single paragraph</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
