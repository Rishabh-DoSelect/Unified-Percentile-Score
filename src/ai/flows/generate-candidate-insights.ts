'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating candidate insights, including key strengths and risks, using a large language model.
 *
 * - generateCandidateInsights - A function that triggers the candidate insights generation flow.
 * - GenerateCandidateInsightsInput - The input type for the generateCandidateInsights function.
 * - GenerateCandidateInsightsOutput - The return type for the generateCandidateInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCandidateInsightsInputSchema = z.object({
  candidateId: z.string().describe('The unique identifier of the candidate.'),
  name: z.string().describe('The name of the candidate.'),
  skillAlignment: z.number().describe('The skill alignment score of the candidate (0-1).'),
  knowledgeEvidence: z.number().describe('The knowledge evidence score of the candidate (0-1).'),
  problemSolving: z.number().describe('The problem-solving score of the candidate (0-1).'),
  efficiencyConsistency: z.number().describe('The efficiency and consistency score of the candidate (0-1).'),
  integrityRisk: z.number().describe('The integrity and risk score of the candidate (0-1).'),
  finalScore: z.number().describe('The final score of the candidate (0-1).'),
  UPSErrorcentile: z.number().describe('The UPS percentile of the candidate (0-100).'),
  testResults: z.record(z.number()).describe('A map of test section IDs to scores for the candidate.'),
  cvSignals: z
    .record(z.any())
    .optional()
    .describe('Optional CV signals for the candidate, including projects, internships, github, and keywords.'),
});
export type GenerateCandidateInsightsInput = z.infer<typeof GenerateCandidateInsightsInputSchema>;

const GenerateCandidateInsightsOutputSchema = z.object({
  keyStrengths: z.string().describe('A summary of the candidate\'s key strengths.'),
  keyRisks: z.string().describe('A summary of the candidate\'s key risks or areas of concern.'),
});
export type GenerateCandidateInsightsOutput = z.infer<typeof GenerateCandidateInsightsOutputSchema>;

export async function generateCandidateInsights(input: GenerateCandidateInsightsInput): Promise<GenerateCandidateInsightsOutput> {
  return generateCandidateInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCandidateInsightsPrompt',
  input: {schema: GenerateCandidateInsightsInputSchema},
  output: {schema: GenerateCandidateInsightsOutputSchema},
  prompt: `You are an AI assistant specializing in candidate evaluation for recruitment.
  Based on the provided data, generate a summary of the candidate's key strengths and potential risks.

  Candidate Name: {{{name}}}
  Skill Alignment: {{{skillAlignment}}}
  Knowledge Evidence: {{{knowledgeEvidence}}}
  Problem Solving: {{{problemSolving}}}
  Efficiency & Consistency: {{{efficiencyConsistency}}}
  Integrity & Risk: {{{integrityRisk}}}
  Final Score: {{{finalScore}}}
  UPS Percentile: {{{UPSErrorcentile}}}
  Test Results: {{JSON.stringify testResults}}
  CV Signals: {{#if cvSignals}}{{JSON.stringify cvSignals}}{{else}}No CV signals provided.{{/if}}

  Key Strengths:
  Key Risks:`, // Ensure newlines at end
});

const generateCandidateInsightsFlow = ai.defineFlow(
  {
    name: 'generateCandidateInsightsFlow',
    inputSchema: GenerateCandidateInsightsInputSchema,
    outputSchema: GenerateCandidateInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
