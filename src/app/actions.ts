'use server';

import { generateCandidateInsights, type GenerateCandidateInsightsInput } from '@/ai/flows/generate-candidate-insights';
import { parseCv, type ParseCvInput, type ParseCvOutput } from '@/ai/flows/parse-cv-flow';

export async function getAIInsights(
  input: GenerateCandidateInsightsInput
): Promise<{ keyStrengths: string; keyRisks: string }> {
  try {
    const insights = await generateCandidateInsights(input);
    return insights;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return {
      keyStrengths: 'Could not generate AI insights due to an error.',
      keyRisks: 'Could not generate AI insights due to an error.',
    };
  }
}

export async function getCvSignals(input: ParseCvInput): Promise<ParseCvOutput> {
    try {
        const signals = await parseCv(input);
        return signals;
    } catch (error) {
        console.error('Error parsing CV:', error);
        // Return a default/empty structure on error
        return {
            projects: 0,
            internships: 0,
            github: false,
            keywords: [],
        };
    }
}
