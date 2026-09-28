import React, { useState } from 'react';
import { Copy, FileText, Download, Check } from 'lucide-react';
import { JudgeVerdictResult, Criterion, HardConstraints } from '../types/judge';

interface JustificationBoxProps {
  justification: string;
  onChangeJustification: (val: string) => void;
  verdict: JudgeVerdictResult;
  prompt: string;
  response1: string;
  response2: string;
  rubric: Criterion[];
  constraints: HardConstraints;
  modelName1?: string;
  modelName2?: string;
  modelsRevealed: boolean;
}

export const JustificationBox: React.FC<JustificationBoxProps> = ({
  justification,
  onChangeJustification,
  verdict,
  prompt,
  response1,
  response2,
  rubric,
  constraints,
  modelName1,
  modelName2,
  modelsRevealed,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(justification);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyMarkdown = async () => {
    const winnerLabel =
      verdict.winner === '1'
        ? `Response 1${modelsRevealed && modelName1 ? ` (${modelName1})` : ''}`
        : verdict.winner === '2'
        ? `Response 2${modelsRevealed && modelName2 ? ` (${modelName2})` : ''}`
        : 'Tie';

    const md = `### SxS Evaluation Verdict: ${winnerLabel}
**Scores:** Response 1: ${verdict.weightedScore1.toFixed(1)}/5 vs Response 2: ${verdict.weightedScore2.toFixed(1)}/5
**Confidence:** ${verdict.confidence.toUpperCase()}
**Order-Swap Status:** ${verdict.orderSwapBadge.label}

#### Evaluator Justification
${justification}

${verdict.concreteFix ? `#### Recommended Improvement\n${verdict.concreteFix}\n` : ''}
#### Criteria Scores
| Criterion | Weight | R1 Score | R2 Score | Rationale |
| :--- | :--- | :--- | :--- | :--- |
${verdict.criteriaScores
  .map(
    (c) =>
      `| ${c.criterionName} | ${(rubric.find((r) => r.id === c.criterionId)?.weight || 0)}% | ${c.score1}/5 | ${c.score2}/5 | ${c.rationale.replace(/\|/g, '-')} |`
  )
  .join('\n')}

---
*Prompt:*
> ${prompt.replace(/\n/g, '\n> ')}
`;

    await navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const handleDownloadJSON = () => {
    const data = {
      evaluatedAt: new Date().toISOString(),
      prompt,
      constraints,
      models: {
        revealed: modelsRevealed,
        model1: modelName1 || 'Anonymous',
        model2: modelName2 || 'Anonymous',
      },
      responses: {
        response1,
        response2,
      },
      verdict: {
        winner: verdict.winner,
        confidence: verdict.confidence,
        weightedScore1: verdict.weightedScore1,
        weightedScore2: verdict.weightedScore2,
        orderSwapBadge: verdict.orderSwapBadge,
        justification,
        concreteFix: verdict.concreteFix,
        criteriaScores: verdict.criteriaScores,
      },
      rubric,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sxs-evaluation-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card-base p-4 sm:p-5 bg-[#fcfcfb] border border-[#e1e0d9] shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-[#e1e0d9]">
        <div>
          <label
            htmlFor="justification-textarea"
            className="text-xs font-bold uppercase tracking-wider text-[#0b0b0b] block"
          >
            Evaluator Justification
          </label>
          <p className="text-[11px] text-[#898781]">
            Pre-filled by judge with evidence citations. You can edit this directly before pasting into your rating tool.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#e1e0d9] bg-[#fcfcfb] hover:bg-[#f2f2ef] text-[#0b0b0b] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#2a78d6]"
          >
            {copiedText ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#006300]" />
                <span className="text-[#006300]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#52514e]" />
                <span>Copy justification</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#e1e0d9] bg-[#fcfcfb] hover:bg-[#f2f2ef] text-[#0b0b0b] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#2a78d6]"
          >
            {copiedMarkdown ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#006300]" />
                <span className="text-[#006300]">Copied MD!</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5 text-[#52514e]" />
                <span>Copy as Markdown</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadJSON}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#e1e0d9] bg-[#fcfcfb] hover:bg-[#f2f2ef] text-[#0b0b0b] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#2a78d6]"
          >
            <Download className="w-3.5 h-3.5 text-[#52514e]" />
            <span>Download JSON</span>
          </button>
        </div>
      </div>

      <textarea
        id="justification-textarea"
        value={justification}
        onChange={(e) => onChangeJustification(e.target.value)}
        rows={4}
        className="w-full p-3 text-xs leading-relaxed rounded-md border border-[#e1e0d9] bg-[#fcfcfb] text-[#0b0b0b] placeholder:text-[#898781] focus:outline-none focus:ring-2 focus:ring-[#2a78d6] focus:border-transparent font-sans resize-y"
        placeholder="Defensible justification citing criteria and verifiable quotes..."
      />
    </div>
  );
};
