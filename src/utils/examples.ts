import { ExampleCase } from '../types/judge';

export const BUILT_IN_EXAMPLES: ExampleCase[] = [
  {
    id: 'word-limit',
    title: 'Example 1: Word Limit & Analogy',
    tagline: 'Tests under-60-word limit, non-technical clarity, and cut-off detection.',
    prompt: 'In under 60 words, explain an API rate limit to a non-technical manager.',
    constraints: {
      maxWords: 60,
      minWords: null,
      mustInclude: '',
      mustAvoid: '',
      format: 'none',
    },
    response1:
      'An API rate limit is a computational throttling threshold enforced by an HTTP reverse proxy or API gateway infrastructure to throttle excessive incoming payload requests. When downstream client microservices exceed defined token bucket thresholds (such as 100 queries per second per bearer authentication token), the remote server intercepts the transaction and emits an HTTP 429 status code with a Retry-After header. This architecture mitigates distributed denial of service attacks, optimizes memory caching partitions, and prevents upstream database connection pools from',
    response2:
      'Think of an API rate limit like a busy coffee shop with only one barista. To prevent the barista from being overwhelmed, the shop only takes 10 drink orders per minute. If too many people order at once, new customers must wait a moment before ordering.',
    modelName1: 'Legacy-70B-Chat',
    modelName2: 'Claude 3.5 Sonnet',
    savedVerdict: {
      winner: '2',
      confidence: 'high',
      weightedScore1: 2.6,
      weightedScore2: 5,
      judgedByModel: 'Gemini 3.5 Flash Lite',
      orderSensitive: false,
      orderSwapBadge: {
        sensitive: false,
        label: 'Same winner when order is swapped',
      },
      unverifiedQuotesRemoved: 0,
      run1Winner: '2',
      run2Winner: '2',
      failedDealBreakers1: [],
      failedDealBreakers2: [],
      justification:
        'Response 2 successfully followed the under 60-word constraint (clocking in at 46 words), used a fantastic analogy suitable for a non-technical manager, and delivered a complete thought. Response 1 failed the word count constraint (80 words), cut off mid-sentence, and used extremely heavy technical jargon entirely inappropriate for a non-technical audience.',
      concreteFix:
        'Response 1 needs to shorten its response significantly, complete its sentences, and remove heavy technical jargon to target a non-technical manager properly.',
      criteriaScores: [
        {
          criterionId: 'instruction_following',
          criterionName: 'Instruction following',
          score1: 1,
          score2: 5,
          rationale:
            'Response 1 failed the word count constraint by reaching 80 words and cut off mid-sentence. Response 2 followed all instructions.',
          evidenceQuotes1: ['pools from'],
          evidenceQuotes2: ['Think of an API rate limit like a busy coffee shop with only one barista.'],
        },
        {
          criterionId: 'accuracy',
          criterionName: 'Accuracy',
          score1: 4.5,
          score2: 5,
          rationale:
            'Response 1 is technically accurate regarding HTTP 429 and token buckets, but cuts off. Response 2 is accurate in conceptual terms.',
          evidenceQuotes1: ['HTTP 429 status code with a Retry-After header.'],
          evidenceQuotes2: ['If too many people order at once, new customers must wait a moment before ordering.'],
        },
        {
          criterionId: 'completeness',
          criterionName: 'Completeness',
          score1: 2,
          score2: 5,
          rationale:
            'Response 1 is truncated mid-sentence and incomplete. Response 2 completely conveys the concept.',
          evidenceQuotes1: ['pools from'],
          evidenceQuotes2: ['To prevent the barista from being overwhelmed, the shop only takes 10 drink orders per minute.'],
        },
        {
          criterionId: 'clarity',
          criterionName: 'Clarity',
          score1: 1.5,
          score2: 5,
          rationale:
            'Response 1 uses dense technical jargon unsuitable for a non-technical manager. Response 2 uses a crystal-clear, relatable analogy.',
          evidenceQuotes1: ['An API rate limit is a computational throttling threshold'],
          evidenceQuotes2: ['Think of an API rate limit like a busy coffee shop with only one barista.'],
        },
        {
          criterionId: 'safety_tone',
          criterionName: 'Safety & tone',
          score1: 3.5,
          score2: 5,
          rationale:
            'Response 1 has an abrupt, broken tone due to truncation. Response 2 has a helpful, professional, and accessible tone.',
          evidenceQuotes1: ['pools from'],
          evidenceQuotes2: ['Think of an API rate limit like a busy coffee shop with only one barista.'],
        },
      ],
    },
  },
  {
    id: 'factual-accuracy',
    title: 'Example 2: Factual Accuracy & Single Sentence',
    tagline: 'Tests Fahrenheit boiling point at sea level in exactly one sentence.',
    prompt: 'At sea level, what temperature does water boil at in Fahrenheit? Answer in one sentence.',
    constraints: {
      maxWords: 35,
      minWords: null,
      mustInclude: 'Fahrenheit',
      mustAvoid: '',
      format: 'single_paragraph',
    },
    response1:
      'At sea level, water boils at 212° Fahrenheit (which is equivalent to 100° Celsius) under standard atmospheric pressure.',
    response2:
      'At sea level, water boils at 100° Fahrenheit under standard atmospheric pressure conditions.',
    modelName1: 'GPT-4o',
    modelName2: 'Hallucinate-Mini-v2',
    savedVerdict: {
      winner: '1',
      confidence: 'high',
      weightedScore1: 5,
      weightedScore2: 2.0,
      judgedByModel: 'Gemini 3.5 Flash Lite',
      orderSensitive: false,
      orderSwapBadge: {
        sensitive: false,
        label: 'Same winner when order is swapped',
      },
      unverifiedQuotesRemoved: 0,
      run1Winner: '1',
      run2Winner: '1',
      failedDealBreakers1: [],
      failedDealBreakers2: ['Accuracy'],
      justification:
        'Response 1 is factually correct, stating that water boils at 212 degrees Fahrenheit at sea level. Response 2 contains a major factual hallucination by confusing Fahrenheit with Celsius, stating water boils at 100 degrees Fahrenheit, which triggers a critical deal-breaker violation for Accuracy.',
      concreteFix:
        'Response 2 must correct its factual error and state that water boils at 212° Fahrenheit, not 100° Fahrenheit.',
      criteriaScores: [
        {
          criterionId: 'instruction_following',
          criterionName: 'Instruction following',
          score1: 5,
          score2: 5,
          rationale:
            'Both responses followed structural instructions: answering in exactly one sentence and keeping under the word limit.',
          evidenceQuotes1: ['At sea level, water boils at 212° Fahrenheit'],
          evidenceQuotes2: ['At sea level, water boils at 100° Fahrenheit'],
        },
        {
          criterionId: 'accuracy',
          criterionName: 'Accuracy',
          score1: 5,
          score2: 1,
          rationale:
            'Response 1 correctly states the boiling point of water in Fahrenheit is 212 degrees. Response 2 incorrectly states it is 100 degrees Fahrenheit.',
          evidenceQuotes1: ['water boils at 212° Fahrenheit'],
          evidenceQuotes2: ['water boils at 100° Fahrenheit'],
        },
        {
          criterionId: 'completeness',
          criterionName: 'Completeness',
          score1: 5,
          score2: 4,
          rationale:
            'Response 1 answers the prompt completely and adds Celsius context. Response 2 provides factually false information.',
          evidenceQuotes1: ['under standard atmospheric pressure.'],
          evidenceQuotes2: ['under standard atmospheric pressure conditions.'],
        },
        {
          criterionId: 'clarity',
          criterionName: 'Clarity',
          score1: 5,
          score2: 5,
          rationale: 'Both responses are grammatically concise and clear.',
          evidenceQuotes1: ['At sea level, water boils at 212° Fahrenheit'],
          evidenceQuotes2: ['At sea level, water boils at 100° Fahrenheit'],
        },
        {
          criterionId: 'safety_tone',
          criterionName: 'Safety & tone',
          score1: 5,
          score2: 5,
          rationale: 'Both responses maintain an objective tone.',
          evidenceQuotes1: ['At sea level, water boils at 212° Fahrenheit'],
          evidenceQuotes2: ['At sea level, water boils at 100° Fahrenheit'],
        },
      ],
    },
  },
  {
    id: 'format-json',
    title: 'Example 3: JSON Format Adherence',
    tagline: 'Tests strict JSON output requirement without extraneous conversational chatter.',
    prompt: 'Return only a JSON object with the keys name and year for the first iPhone.',
    constraints: {
      maxWords: null,
      minWords: null,
      mustInclude: 'name, year',
      mustAvoid: '',
      format: 'json',
    },
    response1: `{\n  "name": "iPhone",\n  "year": 2007\n}`,
    response2: `Here is the JSON object for the first iPhone that you requested:\n{\n  "name": "iPhone",\n  "year": 2007\n}\nFeel free to ask if you need details on any subsequent models!`,
    modelName1: 'Gemini 2.5 Flash',
    modelName2: 'ChattyBot-Ultra',
    savedVerdict: {
      winner: '1',
      confidence: 'high',
      weightedScore1: 5,
      weightedScore2: 3.6,
      judgedByModel: 'Gemini 3.5 Flash Lite',
      orderSensitive: false,
      orderSwapBadge: {
        sensitive: false,
        label: 'Same winner when order is swapped',
      },
      unverifiedQuotesRemoved: 0,
      run1Winner: '1',
      run2Winner: '1',
      failedDealBreakers1: [],
      failedDealBreakers2: [],
      justification:
        'Response 1 followed the instruction to return only a JSON object containing the name and year for the first iPhone. Response 2 included conversational filler text outside the JSON, rendering the full output invalid as a JSON object and failing the formatting requirement.',
      concreteFix:
        'Response 2 should have omitted the conversational preamble and postscript entirely to ensure the output was strictly a valid JSON object.',
      criteriaScores: [
        {
          criterionId: 'instruction_following',
          criterionName: 'Instruction following',
          score1: 5,
          score2: 1.5,
          rationale:
            'Response 1 returned strictly valid JSON. Response 2 added conversational filler that failed the JSON hard constraint.',
          evidenceQuotes1: ['{\n  "name": "iPhone",\n  "year": 2007\n}'],
          evidenceQuotes2: [
            'Here is the JSON object for the first iPhone that you requested:',
            'Feel free to ask if you need details on any subsequent models!',
          ],
        },
        {
          criterionId: 'accuracy',
          criterionName: 'Accuracy',
          score1: 5,
          score2: 5,
          rationale:
            'Both Response 1 and Response 2 accurately provide the correct name ("iPhone") and year (2007).',
          evidenceQuotes1: ['"year": 2007', '"name": "iPhone",'],
          evidenceQuotes2: ['"year": 2007', '"name": "iPhone",'],
        },
        {
          criterionId: 'completeness',
          criterionName: 'Completeness',
          score1: 5,
          score2: 5,
          rationale: 'Both responses include both required keys ("name" and "year").',
          evidenceQuotes1: ['{\n  "name": "iPhone",\n  "year": 2007\n}'],
          evidenceQuotes2: ['{\n  "name": "iPhone",\n  "year": 2007\n}'],
        },
        {
          criterionId: 'clarity',
          criterionName: 'Clarity',
          score1: 5,
          score2: 3.5,
          rationale:
            'Response 1 is direct and clean. Response 2 pollutes the data payload with conversational chatter.',
          evidenceQuotes1: ['{\n  "name": "iPhone",\n  "year": 2007\n}'],
          evidenceQuotes2: ['Here is the JSON object for the first iPhone that you requested:'],
        },
        {
          criterionId: 'safety_tone',
          criterionName: 'Safety & tone',
          score1: 5,
          score2: 5,
          rationale: 'Both responses are polite and safe.',
          evidenceQuotes1: ['{\n  "name": "iPhone",\n  "year": 2007\n}'],
          evidenceQuotes2: ['Feel free to ask if you need details on any subsequent models!'],
        },
      ],
    },
  },
];
