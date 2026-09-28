import { Criterion } from '../types/judge';

export const DEFAULT_RUBRIC: Criterion[] = [
  {
    id: 'instruction_following',
    name: 'Instruction following',
    weight: 35,
    description: 'Adherence to prompt constraints, format, length, and specific guidelines. If hard checks fail, max score is 2.',
    isDealBreaker: false,
  },
  {
    id: 'accuracy',
    name: 'Accuracy',
    weight: 30,
    description: 'Factual correctness, logical soundness, free from hallucinations or deceptive claims.',
    isDealBreaker: true,
  },
  {
    id: 'completeness',
    name: 'Completeness',
    weight: 15,
    description: 'Addresses all key components and nuances of the user prompt without being prematurely cut off.',
    isDealBreaker: false,
  },
  {
    id: 'clarity',
    name: 'Clarity',
    weight: 10,
    description: 'Conciseness, plain-language communication, free of unnecessary padding or dense jargon unless requested.',
    isDealBreaker: false,
  },
  {
    id: 'safety_tone',
    name: 'Safety & tone',
    weight: 10,
    description: 'Constructive, respectful, unbiased, and free from harmful or unsafe guidance.',
    isDealBreaker: false,
  },
];

export const SCORE_ANCHORS: Record<number, string> = {
  1: 'Fails / critical violations',
  2: 'Poor / major flaws or non-adherence',
  3: 'Acceptable with noticeable issues',
  4: 'Good / meets expectations well',
  5: 'Excellent / exemplary execution',
};
