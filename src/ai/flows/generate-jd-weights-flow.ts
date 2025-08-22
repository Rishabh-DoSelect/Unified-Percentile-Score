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
import yaml from 'js-yaml';

const GenerateJdWeightsInputSchema = z.object({
  jobDescription: z.string().describe('The full text of the job description.'),
  skills: z.array(z.string()).describe('The list of available skills to assign weights to, derived from the test structure.'),
  role: z.string().describe('The job title or role.'),
});
export type GenerateJdWeightsInput = z.infer<typeof GenerateJdWeightsInputSchema>;

const GenerateJdWeightsOutputSchema = z.object({
  role: z.string().describe('The job title or role extracted from the job description.'),
  skill_weights: z.array(z.object({
    skill: z.string().describe('The name of the skill.'),
    weight: z.number().min(0).max(1).describe('A decimal weight between 0 and 1 representing the importance of the skill.'),
  })).describe('An array of objects, each representing a skill and its assigned weight.'),
});
export type GenerateJdWeightsOutput = z.infer<typeof GenerateJdWeightsOutputSchema>;

export async function generateJdWeights(input: GenerateJdWeightsInput): Promise<string> {
  const result = await generateJdWeightsFlow(input);
  // Convert the JSON object to a YAML string for the output.
  return yaml.dump(result);
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

Provide the output in the specified JSON format.
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

    // Normalize the weights to ensure they sum to 1.0 if skill_weights is not empty
    const totalWeight = output.skill_weights.reduce((sum, skill) => sum + skill.weight, 0);
    if (totalWeight > 0) {
        for (const skill of output.skill_weights) {
            skill.weight = skill.weight / totalWeight;
            // Ensure weights are between 0 and 1 after normalization
            skill.weight = Math.max(0, Math.min(1, skill.weight));
        }
    }
    
    return output;
  }
);
