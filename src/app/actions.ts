'use server';

import { generateCandidateInsights, type GenerateCandidateInsightsInput } from '@/ai/flows/generate-candidate-insights';

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
