
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a structured JD skill weights YAML file from raw job description text.
 *
 * - generateJdWeights - A function that triggers the JD weight generation flow.
 * - GenerateJdWeightsInput - The input type for the generateJdWeights function.
 * - GenerateJdWeightsOutput - The return type for the generateJdWeights function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateJdWeightsInputSchema = z.object({
  jobDescription: z.string().describe('The full text of the job description.'),
  skills: z.array(z.string()).describe('The list of available skills to assign weights to, derived from the test structure.'),
  role: z.string().describe('The job title or role.'),
});
export type GenerateJdWeightsInput = z.infer<typeof GenerateJdWeightsInputSchema>;

const GenerateJdWeightsOutputSchema = z.object({
  skill_weights_yaml: z.string().describe('A YAML formatted string containing the role and the skill weights. The weights must sum to 1.0.'),
});
export type GenerateJdWeightsOutput = z.infer<typeof GenerateJdWeightsOutputSchema>;

export async function generateJdWeights(input: GenerateJdWeightsInput): Promise<string> {
  const result = await generateJdWeightsFlow(input);
  return result.skill_weights_yaml;
}

const prompt = ai.definePrompt({
  name: 'generateJdWeightsPrompt',
  input: { schema: GenerateJdWeightsInputSchema },
  output: { schema: GenerateJdWeightsOutputSchema },
  prompt: `You are an expert recruitment consultant and hiring manager.
Your task is to analyze the provided job description for the role of "{{role}}" and assign weights to a predefined list of skills.
The weights must be a decimal between 0 and 1, and the sum of all weights must equal 1.0.

Base your weighting on the emphasis and requirements mentioned in the job description.
For example, if the JD heavily focuses on data analysis and SQL, those skills should have higher weights.

Job Description:
---
{{{jobDescription}}}
---

Available skills to weigh: {{{skills}}}

Provide the output as a YAML formatted string. The YAML should have two keys: "role" and "skill_weights".
The "role" key's value should be "{{role}}".
The "skill_weights" key's value should be a map of skill names to their weights.

Example output format:
role: "Data Scientist"
skill_weights:
  python: 0.4
  sql: 0.3
  statistics: 0.2
  ml_theory: 0.1
`,
});

const generateJdWeightsFlow = ai.defineFlow(
  {
    name: 'generateJdWeightsFlow',
    inputSchema: GenerateJdWeightsInputSchema,
    outputSchema: GenerateJdWeightsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate JD weights.');
    }
    return output;
  }
);
