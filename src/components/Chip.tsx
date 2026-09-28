import React from 'react';
import { Check, X, Info } from 'lucide-react';

interface ChipProps {
  passed: boolean | null;
  label: string;
  className?: string;
  title?: string;
}

export const Chip: React.FC<ChipProps> = ({ passed, label, className = '', title }) => {
  if (passed === true) {
    return (
      <span
        title={title}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium chip-pass transition-colors ${className}`}
      >
        <Check className="w-3.5 h-3.5 text-[#006300] shrink-0" strokeWidth={2.5} />
        <span>{label.replace(/^[✓✔\u2713\u2714]\s*/u, '')}</span>
      </span>
    );
  }

  if (passed === false) {
    return (
      <span
        title={title}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium chip-fail transition-colors ${className}`}
      >
        <X className="w-3.5 h-3.5 text-[#d03b3b] shrink-0" strokeWidth={2.5} />
        <span>{label.replace(/^[✕✗\u2715\u2716\u00d7]\s*/u, '')}</span>
      </span>
    );
  }

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium chip-neutral transition-colors ${className}`}
    >
      <Info className="w-3.5 h-3.5 text-[#52514e] shrink-0" />
      <span>{label}</span>
    </span>
  );
};
