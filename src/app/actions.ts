
'use server';

import { generateCandidateInsights, type GenerateCandidateInsightsInput } from '@/ai/flows/generate-candidate-insights';
import { generateJdWeights, type GenerateJdWeightsInput } from '@/ai/flows/generate-jd-weights-flow';
import { parseCv, type ParseCvInput, type ParseCvOutput } from '@/ai/flows/parse-cv-flow';

export async function getAIInsights(
  input: GenerateCandidateInsightsInput
): Promise<{ keyStrengths: string; keyRisks: string }> {
  // Re-throwing the error to be handled by the data processor,
  // allowing for more graceful fallback logic.
  try {
    return await generateCandidateInsights(input);
  } catch(e) {
    console.error(`AI insight generation failed for ${input.candidateId}:`, e);
    // Re-throw the error to be caught by the caller
    throw e;
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

export async function generateJdFromText(input: GenerateJdWeightsInput): Promise<string> {
    const yamlResult = await generateJdWeights(input);
    return yamlResult;
}
