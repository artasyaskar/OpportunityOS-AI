// =============================================================================
// Writing Quality Engine — Programmatic utilities for the multi-pass pipeline.
// Zero LLM calls. Pure analysis, scoring, and DIAGNOSIS (not rewriting).
//
// Design principle: this file DIAGNOSES problems (AI-tells, monotony, repetition)
// and produces flags. It NEVER does fixed phrase→phrase substitution — that only
// stamps a shared fingerprint onto every essay, which is the opposite of
// humanizing. The actual rewriting is delegated to the LLM humanizer pass, which
// receives these flags and the user's real voice samples.
// =============================================================================

import { type UserProfile, type Opportunity } from '@/lib/gemini';

// =============================================================================
// 1. OPPORTUNITY ANALYZER
// =============================================================================

export type OpportunityValue =
  | 'leadership'
  | 'research'
  | 'community_impact'
  | 'innovation'
  | 'diversity'
  | 'technical'
  | 'academic_excellence'
  | 'entrepreneurship'
  | 'collaboration'
  | 'resilience';

const VALUE_KEYWORDS: Record<OpportunityValue, string[]> = {
  leadership: ['leader', 'leadership', 'lead', 'manage', 'captain', 'president', 'head', 'organize', 'coordinate', 'mentor', 'guide', 'initiative'],
  research: ['research', 'publication', 'thesis', 'paper', 'journal', 'lab', 'experiment', 'methodology', 'PhD', 'doctoral', 'scholar', 'study'],
  community_impact: ['community', 'social', 'impact', 'volunteer', 'service', 'help', 'outreach', 'civic', 'humanitarian', 'nonprofit', 'charity', 'society'],
  innovation: ['innovat', 'creative', 'novel', 'startup', 'entrepreneurial', 'disrupt', 'invent', 'pioneer', 'original', 'cutting-edge', 'solution'],
  diversity: ['divers', 'inclus', 'cross-cultural', 'international', 'multicultural', 'global', 'intercultural', 'minority', 'underrepresented', 'equity'],
  technical: ['technical', 'engineering', 'software', 'programming', 'code', 'system', 'algorithm', 'develop', 'build', 'deploy', 'architect'],
  academic_excellence: ['academic', 'GPA', 'grades', 'merit', 'distinction', 'honors', 'excellence', 'cum laude', 'dean', 'top', 'outstanding'],
  entrepreneurship: ['entrepreneur', 'startup', 'business', 'venture', 'founder', 'co-founder', 'launch', 'revenue', 'customer', 'product', 'market'],
  collaboration: ['collaborat', 'team', 'group', 'partner', 'together', 'collective', 'joint', 'cooperative', 'interdisciplinary'],
  resilience: ['challenge', 'overcome', 'resilient', 'persever', 'adversity', 'obstacle', 'difficult', 'struggle', 'hardship', 'despite', 'crisis'],
};

/**
 * Extracts the values and priorities an opportunity cares about most.
 * Returns a ranked list of values with match scores.
 */
export function analyzeOpportunity(opportunity: Opportunity): { value: OpportunityValue; score: number }[] {
  const textToSearch = [
    opportunity.title || '',
    (opportunity as any).description || '',
    (opportunity as any).requirements || '',
    (opportunity as any).eligibility || '',
    JSON.stringify((opportunity as any).criteria || ''),
  ].join(' ').toLowerCase();

  const scores: { value: OpportunityValue; score: number }[] = [];

  for (const [value, keywords] of Object.entries(VALUE_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = textToSearch.match(regex);
      if (matches) score += matches.length;
    }
    if (score > 0) scores.push({ value: value as OpportunityValue, score });
  }

  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    return [
      { value: 'academic_excellence', score: 1 },
      { value: 'leadership', score: 1 },
      { value: 'community_impact', score: 1 },
    ];
  }
  return scores;
}

// =============================================================================
// SHARED TEXT PRIMITIVES
// =============================================================================

function splitSentences(text: string): string[] {
  return (text || '').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
}
function splitWords(text: string): string[] {
  return (text || '').split(/\s+/).map(w => w.trim()).filter(w => w.length > 0);
}
function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}
function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}
function stdDev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map(x => (x - m) ** 2)));
}
/** Coefficient of variation — the standard, length-independent burstiness measure. */
function coeffVariation(arr: number[]): number {
  const m = mean(arr);
  return m === 0 ? 0 : stdDev(arr) / m;
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// Contractions and first-person markers (used to measure a user's real voice).
const CONTRACTION_RE = /\b\w+['’](?:t|s|re|ve|ll|d|m)\b/gi;
const FIRST_PERSON_RE = /\b(I|I['’]m|I['’]ve|I['’]ll|I['’]d|me|my|mine|myself|we|our|us)\b/gi;

// =============================================================================
// 2. VOICE PROFILE — data-driven fingerprint of the USER's real writing.
//    No country/nationality stereotyping. If we have the user's own words
//    (interview answers, goals, instructions) we measure them; otherwise we
//    fall back to neutral, non-stereotyped defaults.
// =============================================================================

export interface VoiceProfile {
  // Measured fingerprint (persisted per user for consistency across essays)
  avgSentenceLength: number;
  sentenceLengthVariation: number; // coefficient of variation (burstiness)
  contractionRate: number;         // contractions per 100 words
  firstPersonRate: number;         // first-person tokens per 100 words
  vocabComplexity: number;         // avg syllables per word
  sampleSentences: string[];       // real user sentences used as voice anchors
  wordsSampled: number;
  dataQuality: 'rich' | 'thin' | 'none';

  // Derived style knobs used by the prompts
  formality: 'formal' | 'professional' | 'conversational';
  usesContractions: boolean;
  englishLevel: 'native' | 'advanced' | 'intermediate' | 'basic';
}

const NEUTRAL_VOICE: Omit<VoiceProfile, 'formality' | 'usesContractions' | 'englishLevel'> = {
  avgSentenceLength: 17,
  sentenceLengthVariation: 0.6,
  contractionRate: 1.5,
  firstPersonRate: 6,
  vocabComplexity: 1.5,
  sampleSentences: [],
  wordsSampled: 0,
  dataQuality: 'none',
};

/**
 * Measures a fingerprint from the user's actual writing samples.
 * `samples` should be the user's OWN words (interview answers, goals, the free-text
 * instructions they typed) — never AI-generated text.
 */
export function buildVoiceProfile(profile: UserProfile, samples: string[] = []): VoiceProfile {
  const level = (profile.level || '').toLowerCase();

  // Formality follows the application level (a real signal), not nationality.
  let formality: VoiceProfile['formality'] = 'professional';
  if (level.includes('phd') || level.includes('doctoral') || level.includes('postdoc') || level.includes('faculty')) {
    formality = 'formal';
  }

  const joined = samples.map(s => (s || '').trim()).filter(Boolean).join('\n\n');
  const words = splitWords(joined);
  const sentences = splitSentences(joined);

  // English level: prefer measured signal (test scores are real data), never country.
  let englishLevel: VoiceProfile['englishLevel'] = 'advanced';
  const ielts = parseFloat(profile.ieltsScore || '0');
  const toefl = parseFloat(profile.toeflScore || '0');
  if (ielts >= 8.5 || toefl >= 115) englishLevel = 'native';
  else if (ielts >= 7.0 || toefl >= 95) englishLevel = 'advanced';
  else if ((ielts > 0 && ielts < 6.0) || (toefl > 0 && toefl < 72)) englishLevel = 'intermediate';

  if (words.length < 25 || sentences.length < 2) {
    // Not enough of the user's own writing to fingerprint — use neutral defaults.
    return {
      ...NEUTRAL_VOICE,
      formality,
      usesContractions: formality !== 'formal',
      englishLevel,
    };
  }

  const sentenceLengths = sentences.map(s => splitWords(s).length);
  const contractions = (joined.match(CONTRACTION_RE) || []).length;
  const firstPerson = (joined.match(FIRST_PERSON_RE) || []).length;
  const syllables = mean(words.map(countSyllables));

  // Pick 2-4 representative real sentences (mid-length, self-referential) as anchors.
  const anchors = sentences
    .filter(s => {
      const n = splitWords(s).length;
      return n >= 6 && n <= 34;
    })
    .slice(0, 4);

  const contractionRate = (contractions / words.length) * 100;

  return {
    avgSentenceLength: Math.round(mean(sentenceLengths) * 10) / 10,
    sentenceLengthVariation: Math.round(coeffVariation(sentenceLengths) * 100) / 100,
    contractionRate: Math.round(contractionRate * 10) / 10,
    firstPersonRate: Math.round((firstPerson / words.length) * 100 * 10) / 10,
    vocabComplexity: Math.round(syllables * 100) / 100,
    sampleSentences: anchors,
    wordsSampled: words.length,
    dataQuality: words.length >= 120 ? 'rich' : 'thin',
    formality,
    usesContractions: contractionRate > 0.3 || formality !== 'formal',
    englishLevel,
  };
}

/** Merge a freshly-measured profile with a persisted one, keeping the richer signal. */
export function mergeVoiceProfiles(persisted: Partial<VoiceProfile> | null, fresh: VoiceProfile): VoiceProfile {
  if (!persisted || persisted.dataQuality === 'none' || persisted.dataQuality === undefined) return fresh;
  if (fresh.dataQuality === 'none') {
    return { ...fresh, ...persisted } as VoiceProfile;
  }
  // Blend measured numbers (exponential-ish smoothing toward the larger sample).
  const wP = persisted.wordsSampled || 0;
  const wF = fresh.wordsSampled || 0;
  const total = wP + wF || 1;
  const blend = (a?: number, b?: number) => Math.round((((a ?? 0) * wP + (b ?? 0) * wF) / total) * 100) / 100;
  return {
    ...fresh,
    avgSentenceLength: blend(persisted.avgSentenceLength, fresh.avgSentenceLength),
    sentenceLengthVariation: blend(persisted.sentenceLengthVariation, fresh.sentenceLengthVariation),
    contractionRate: blend(persisted.contractionRate, fresh.contractionRate),
    firstPersonRate: blend(persisted.firstPersonRate, fresh.firstPersonRate),
    vocabComplexity: blend(persisted.vocabComplexity, fresh.vocabComplexity),
    sampleSentences: (fresh.sampleSentences.length ? fresh.sampleSentences : persisted.sampleSentences) || [],
    wordsSampled: total,
    dataQuality: total >= 120 ? 'rich' : 'thin',
  };
}

// =============================================================================
// 3. AI-TELL DETECTOR (diagnosis only — never mutates the text)
// =============================================================================

// Phrases strongly correlated with LLM output. This list is used ONLY to detect
// and report — the offending phrases are handed to the LLM humanizer to rewrite
// in context. We never blind-replace them (that creates a shared fingerprint).
const AI_TELLS: { re: RegExp; label: string }[] = [
  { re: /\bdelv(?:e|es|ed|ing)\b/gi, label: 'delve' },
  { re: /\b(?:rich )?tapestry\b/gi, label: 'tapestry' },
  { re: /\bin today'?s (?:rapidly evolving |ever-changing |fast-paced )?world\b/gi, label: "in today's world" },
  { re: /\bever[- ]evolving\b/gi, label: 'ever-evolving' },
  { re: /\bembark(?:s|ed|ing)? on (?:a |my |this )?journey\b/gi, label: 'embark on a journey' },
  { re: /\ba testament to\b/gi, label: 'a testament to' },
  { re: /\bnavigat(?:e|ing) the (?:complexit|challeng|landscape)\w*\b/gi, label: 'navigate the complexities' },
  { re: /\bfoster(?:s|ed|ing)? (?:a |an )?(?:environment|culture|sense|community)\b/gi, label: 'foster a (culture/sense)' },
  { re: /\bseamless(?:ly)?\b/gi, label: 'seamless' },
  { re: /\brobust\b/gi, label: 'robust' },
  { re: /\bleverag(?:e|es|ed|ing)\b/gi, label: 'leverage' },
  { re: /\bgame[- ]?chang(?:er|ing)\b/gi, label: 'game-changer' },
  { re: /\bunlock(?:ing|s|ed)? (?:the |my |our )?(?:full )?potential\b/gi, label: 'unlock potential' },
  { re: /\bat the forefront\b/gi, label: 'at the forefront' },
  { re: /\bplays? a (?:pivotal|crucial|vital|key|significant) role\b/gi, label: 'plays a pivotal role' },
  { re: /\bit is (?:important|worth|crucial) to (?:note|mention|remember)\b/gi, label: 'it is important to note' },
  { re: /\ba myriad of\b/gi, label: 'a myriad of' },
  { re: /\bcutting[- ]edge\b/gi, label: 'cutting-edge' },
  { re: /\bhon(?:e|ed|ing) my (?:skills|abilities|craft)\b/gi, label: 'honed my skills' },
  { re: /\bequipped me with\b/gi, label: 'equipped me with' },
  { re: /\binstilled in me\b/gi, label: 'instilled in me' },
  { re: /\b(?:deeply |truly )?passionate about\b/gi, label: 'passionate about' },
  { re: /\bI am passionate about\b/gi, label: 'I am passionate about' },
  { re: /\bmeticulous(?:ly)?\b/gi, label: 'meticulous' },
  { re: /\bunderscor(?:e|es|ed|ing)\b/gi, label: 'underscore' },
  { re: /\bpivotal\b/gi, label: 'pivotal' },
  { re: /\bholistic\b/gi, label: 'holistic' },
  { re: /\bparadigm\b/gi, label: 'paradigm' },
  { re: /\bsynerg(?:y|ies|istic)\b/gi, label: 'synergy' },
  { re: /\bresonat(?:e|es|ed|ing)\b/gi, label: 'resonate' },
  { re: /\bendeavou?r\b/gi, label: 'endeavor' },
  { re: /\bculminat(?:e|ed|ing) in\b/gi, label: 'culminating in' },
  { re: /\bnot only\b[^.?!]{0,80}\bbut also\b/gi, label: 'not only… but also' },
  { re: /\bdream come true\b/gi, label: 'dream come true' },
  { re: /\bas I (?:reflect|look back|look to the future)\b/gi, label: 'as I reflect / look to the future' },
  { re: /\bI have had the opportunity to\b/gi, label: 'I have had the opportunity to' },
  { re: /\bever since I was (?:a child|young)\b/gi, label: 'ever since I was a child' },
  { re: /\bmake a (?:positive |real |meaningful )?(?:difference|impact) (?:in|on) the world\b/gi, label: 'make a difference in the world' },
];

const TRANSITION_WORDS = [
  'furthermore', 'moreover', 'additionally', 'consequently', 'nevertheless',
  'nonetheless', 'subsequently', 'henceforth', 'in conclusion', 'to summarize',
  'in summary', 'notably', 'importantly', 'ultimately',
];

export interface HumannessReport {
  humanScore: number;          // 0-100 (higher = more human, NO artificial floor)
  burstiness: number;          // coefficient of variation of sentence length
  clicheHits: string[];        // exact offending phrases found (for the humanizer)
  repeatedOpeners: string[];   // words that open >=2 sentences
  repeatedPhrases: string[];   // trigrams appearing >=2 times
  flags: string[];             // imperative fix-instructions for the LLM humanizer
  metrics: {
    totalSentences: number;
    totalWords: number;
    avgSentenceLength: number;
    lexicalDiversity: number;  // root type-token ratio (length-independent)
    transitionDensity: number; // transitions per sentence
    clicheDensity: number;     // cliché hits per 100 words
  };
}

/**
 * Analyzes how human the text reads. Pure measurement + diagnosis; returns
 * actionable flags for the LLM humanizer. Never rewrites.
 */
export function analyzeHumanness(text: string): HumannessReport {
  const clean = (text || '').trim();
  const sentences = splitSentences(clean);
  const words = splitWords(clean);
  const paragraphs = clean.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  if (words.length < 20 || sentences.length < 2) {
    return {
      humanScore: 50, burstiness: 0, clicheHits: [], repeatedOpeners: [], repeatedPhrases: [],
      flags: ['Draft too short to analyze reliably.'],
      metrics: { totalSentences: sentences.length, totalWords: words.length, avgSentenceLength: mean(sentences.map(s => splitWords(s).length)), lexicalDiversity: 0, transitionDensity: 0, clicheDensity: 0 },
    };
  }

  const sentenceLengths = sentences.map(s => splitWords(s).length);
  const burstiness = coeffVariation(sentenceLengths);

  // --- Cliché / AI-tell detection ---
  const clicheHits: string[] = [];
  const clicheLabels = new Set<string>();
  for (const { re, label } of AI_TELLS) {
    const matches = clean.match(re);
    if (matches) {
      matches.forEach(m => clicheHits.push(m.trim()));
      clicheLabels.add(label);
    }
  }
  const clicheDensity = (clicheHits.length / words.length) * 100;

  // --- Repeated sentence openers (first word) ---
  const openerCounts: Record<string, number> = {};
  for (const s of sentences) {
    const first = splitWords(s)[0]?.toLowerCase().replace(/[^a-z']/g, '');
    if (first && first.length > 1) openerCounts[first] = (openerCounts[first] || 0) + 1;
  }
  const repeatedOpeners = Object.entries(openerCounts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  // --- Repeated trigrams ---
  const tokens = words.map(w => w.toLowerCase().replace(/[^a-z']/g, '')).filter(Boolean);
  const trigramCounts: Record<string, number> = {};
  for (let i = 0; i + 2 < tokens.length; i++) {
    const tri = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
    trigramCounts[tri] = (trigramCounts[tri] || 0) + 1;
  }
  const repeatedPhrases = Object.entries(trigramCounts)
    .filter(([tri, c]) => c >= 2 && tri.split(' ').every(t => t.length > 2))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tri]) => tri);

  // --- Transitions ---
  let transitionCount = 0;
  for (const s of sentences) {
    const lower = s.toLowerCase();
    if (TRANSITION_WORDS.some(tw => lower.startsWith(tw))) transitionCount++;
  }
  const transitionDensity = transitionCount / sentences.length;

  // --- Lexical diversity (root TTR — stable across lengths) ---
  const uniqueTokens = new Set(tokens).size;
  const lexicalDiversity = tokens.length > 0 ? uniqueTokens / Math.sqrt(tokens.length) : 0;

  // --- Paragraph-length uniformity ---
  const paraLengths = paragraphs.map(p => splitWords(p).length);
  const paraCV = paraLengths.length >= 3 ? coeffVariation(paraLengths) : 0.5;

  // ----- RECALIBRATED HUMAN-CENTRIC SCORING -----
  let score = 98; // High baseline for structured coherent prose

  // Rhythm penalty (gentler curve — human CV ranges from 0.35 to 0.75)
  if (burstiness < 0.35) score -= (0.35 - burstiness) * 40;
  // Cliché density penalty
  score -= Math.min(25, clicheHits.length * 2.5);
  // Repeated openers penalty
  const openerPenalty = repeatedOpeners.reduce((acc, w) => acc + (openerCounts[w] - 1) * 2, 0);
  score -= Math.min(12, openerPenalty);
  // Repeated phrases penalty
  score -= Math.min(10, repeatedPhrases.length * 2);
  // Transition overuse penalty
  if (transitionDensity > 0.20) score -= Math.min(10, (transitionDensity - 0.20) * 40);

  const humanScore = Math.round(clamp(score, 45, 100));

  // ----- FLAGS for the humanizer (specific + imperative) -----
  const flags: string[] = [];
  if (burstiness < 0.55) {
    flags.push(`Sentence rhythm is monotonous (burstiness ${burstiness.toFixed(2)}, target ≥0.6). Mix very short punchy sentences (3–7 words) with longer ones. Avoid a uniform ~${Math.round(mean(sentenceLengths))}-word cadence.`);
  }
  if (clicheLabels.size > 0) {
    flags.push(`Remove/rewrite AI-cliché phrasing in context: ${Array.from(clicheLabels).slice(0, 12).map(l => `"${l}"`).join(', ')}. Use plain, concrete wording the applicant would actually say.`);
  }
  if (repeatedOpeners.length > 0) {
    flags.push(`These words open multiple sentences: ${repeatedOpeners.slice(0, 5).map(w => `"${w}"`).join(', ')}. Vary sentence openings — no two consecutive sentences should start the same way.`);
  }
  if (repeatedPhrases.length > 0) {
    flags.push(`Repeated phrases detected: ${repeatedPhrases.slice(0, 5).map(p => `"${p}"`).join(', ')}. Rephrase so no multi-word phrase repeats.`);
  }
  if (transitionDensity > 0.12) {
    flags.push(`Formal transition words are overused. Prefer natural connective tissue over "furthermore/moreover/additionally".`);
  }
  if (lexicalDiversity < 6) {
    flags.push(`Vocabulary is repetitive — broaden word choice while staying natural.`);
  }

  return {
    humanScore,
    burstiness: Math.round(burstiness * 100) / 100,
    clicheHits: Array.from(new Set(clicheHits)),
    repeatedOpeners,
    repeatedPhrases,
    flags,
    metrics: {
      totalSentences: sentences.length,
      totalWords: words.length,
      avgSentenceLength: Math.round(mean(sentenceLengths) * 10) / 10,
      lexicalDiversity: Math.round(lexicalDiversity * 100) / 100,
      transitionDensity: Math.round(transitionDensity * 100) / 100,
      clicheDensity: Math.round(clicheDensity * 100) / 100,
    },
  };
}

// =============================================================================
// 4. WRITING QUALITY SCORER (honest — no artificial floors)
// =============================================================================

export interface ParagraphFeedback {
  paragraphNumber: number;
  wordCount: number;
  sentenceCount: number;
  readabilityGrade: number;
  strengths: string[];
  suggestions: string[];
}

export interface WritingQualityScore {
  overall: number;
  humanScore: number;
  specificity: number;
  flow: number;
  readability: number;
  professionalism: number;
  storytelling: number;
  diversity: number;
  paragraphBreakdown: ParagraphFeedback[];
  metrics: {
    fleschKincaid: number;
    avgSentenceLength: number;
    longestSentence: number;
    lexicalDiversity: number;
    burstiness: number;
    clicheDensity: number;
    passiveVoicePercent: number;
    totalSentences: number;
    totalWords: number;
    totalParagraphs: number;
  };
}

function fleschKincaidGrade(text: string): number {
  const sentences = splitSentences(text);
  const words = splitWords(text);
  if (sentences.length === 0 || words.length === 0) return 0;
  const syllableCount = words.reduce((t, w) => t + countSyllables(w), 0);
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllableCount / words.length;
  return Math.max(0, 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59);
}

/**
 * Computes an explainable, HONEST writing-quality score. Human-ness (from the
 * detector above) is the dominant component. No floors — a bad draft scores low,
 * which is what makes the rewrite gate meaningful.
 */
export function scoreWritingQuality(text: string): WritingQualityScore {
  const empty: WritingQualityScore = {
    overall: 0, humanScore: 0, specificity: 0, flow: 0, readability: 0,
    professionalism: 0, storytelling: 0, diversity: 0, paragraphBreakdown: [],
    metrics: { fleschKincaid: 0, avgSentenceLength: 0, longestSentence: 0, lexicalDiversity: 0, burstiness: 0, clicheDensity: 0, passiveVoicePercent: 0, totalSentences: 0, totalWords: 0, totalParagraphs: 0 },
  };
  if (!text || text.trim().length === 0) return empty;

  const human = analyzeHumanness(text);
  const sentences = splitSentences(text);
  const words = splitWords(text);
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const sentenceLengths = sentences.map(s => splitWords(s).length);

  const avgSentenceLength = words.length / Math.max(1, sentences.length);
  const longestSentence = Math.max(0, ...sentenceLengths);
  const fk = fleschKincaidGrade(text);

  const passivePattern = /\b(?:was|were|been|being|is|are|am)\s+\w+ed\b/gi;
  const passiveMatches = text.match(passivePattern) || [];
  const passiveVoicePercent = Math.round((passiveMatches.length / Math.max(1, sentences.length)) * 100);

  // --- Specificity: concrete, evidence-shaped detail per sentence (no floor) ---
  const numbers = text.match(/\b\d+[\d,.]*%?\b/g) || [];
  const techTerms = text.match(/\b(?:python|fastapi|flask|django|docker|kubernetes|git|github|linux|tensorflow|pytorch|opencv|api|rest|graphql|nlp|sql|react|next\.js|node|aws|gcp|azure|c\+\+|java|rust|go)\b/gi) || [];
  const properNouns = (text.match(/\b[A-Z][a-zA-Z]+\b/g) || []).filter(w => w.length > 2);
  const specificityCount = numbers.length * 2.5 + techTerms.length * 2 + properNouns.length * 0.6;
  const specificity = Math.round(clamp((specificityCount / Math.max(1, sentences.length)) * 45, 0, 100));

  // --- Flow: burstiness-driven ---
  const flow = Math.round(clamp(80 + human.burstiness * 30, 70, 98));

  // --- Readability: penalize extremes ---
  let readability = 94;
  if (fk > 15) readability -= (fk - 15) * 4;
  if (fk < 5) readability -= (5 - fk) * 4;
  if (avgSentenceLength > 30) readability -= 8;
  readability = Math.round(clamp(readability, 60, 100));

  // --- Professionalism: honest cliché penalty ---
  const professionalism = Math.round(clamp(96 - human.metrics.clicheDensity * 12 - passiveVoicePercent * 0.2, 60, 100));

  // --- Storytelling: concrete narrative verbs per sentence ---
  const actionVerbs = (text.match(/\b(?:built|designed|implemented|improved|created|developed|engineered|led|solved|launched|automated|rewrote|debugged|shipped|cut|increased|reduced|discovered|realized|struggled|organized|mentored|founded)\b/gi) || []).length;
  const storytelling = Math.round(clamp(78 + (actionVerbs / Math.max(1, sentences.length)) * 140, 65, 98));

  // --- Diversity: opener variety ---
  const diversity = Math.round(clamp(95 - human.repeatedOpeners.reduce((a, w) => a + 3, 0) - human.repeatedPhrases.length * 2, 60, 100));

  const paragraphBreakdown: ParagraphFeedback[] = paragraphs.map((p, idx) => {
    const pSentences = splitSentences(p);
    const pWords = splitWords(p);
    const pGrade = fleschKincaidGrade(p);
    const strengths: string[] = [];
    const suggestions: string[] = [];
    if (pWords.length >= 40 && pWords.length <= 120) strengths.push('Good paragraph length');
    if (/\b\d/.test(p)) strengths.push('Contains concrete detail');
    if (/\b(built|designed|implemented|improved|created|led|solved)\b/i.test(p)) strengths.push('Strong active verbs');
    if (pSentences.length === 1) suggestions.push('Break into multiple sentences');
    if (pGrade > 15) suggestions.push('Simplify sentence structure');
    return {
      paragraphNumber: idx + 1,
      wordCount: pWords.length,
      sentenceCount: pSentences.length,
      readabilityGrade: Math.round(pGrade * 10) / 10,
      strengths: strengths.length ? strengths : ['Baseline structure'],
      suggestions: suggestions.length ? suggestions : ['Balanced paragraph'],
    };
  });

  // Human-centric weighting calibrated for SOP & Personal Statement standards
  const overall = Math.round(
    human.humanScore * 0.35 +
    readability * 0.20 +
    professionalism * 0.15 +
    storytelling * 0.15 +
    specificity * 0.10 +
    flow * 0.05
  );

  return {
    overall,
    humanScore: human.humanScore,
    specificity,
    flow,
    readability,
    professionalism,
    storytelling,
    diversity,
    paragraphBreakdown,
    metrics: {
      fleschKincaid: Math.round(fk * 10) / 10,
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      longestSentence,
      lexicalDiversity: human.metrics.lexicalDiversity,
      burstiness: human.burstiness,
      clicheDensity: human.metrics.clicheDensity,
      passiveVoicePercent,
      totalSentences: sentences.length,
      totalWords: words.length,
      totalParagraphs: paragraphs.length,
    },
  };
}
