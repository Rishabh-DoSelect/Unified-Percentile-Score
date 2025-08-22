
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a test structure CSV from a platform-specific JSON payload.
 *
 * - generateTestStructure - A function that triggers the test structure generation flow.
 * - GenerateTestStructureInput - The input type for the generateTestStructure function.
 * - GenerateTestStructureOutput - The return type for the generateTestStructure function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTestStructureInputSchema = z.object({
  problemsJson: z.string().describe('A JSON string containing an array of problem objects from the testing platform.'),
});
export type GenerateTestStructureInput = z.infer<typeof GenerateTestStructureInputSchema>;

const GenerateTestStructureOutputSchema = z.object({
  structure_csv: z.string().describe('A CSV formatted string with the headers: section_id,section_name,skill,weight_in_section'),
});
export type GenerateTestStructureOutput = z.infer<typeof GenerateTestStructureOutputSchema>;

export async function generateTestStructure(input: GenerateTestStructureInput): Promise<string> {
  const result = await generateTestStructureFlow(input);
  return result.structure_csv;
}

const prompt = ai.definePrompt({
  name: 'generateTestStructurePrompt',
  input: { schema: GenerateTestStructureInputSchema },
  output: { schema: GenerateTestStructureOutputSchema },
  prompt: `You are an expert at data transformation. Your task is to convert a JSON array of programming problems into a CSV file representing a test structure.

The output CSV must have the following headers:
section_id,section_name,skill,weight_in_section

Map the JSON fields to the CSV columns as follows:
- 'section_id': Use the value from the 'problem_slug' field.
- 'section_name': Use the value from the 'problem_name' field.
- 'skill': Use the value from the 'insight_tags' field. If 'insight_tags' is missing or empty, use the first relevant skill from the 'tags' field (e.g., 'Java', 'Python', 'React 18.2').
- 'weight_in_section': This should be a normalized weight from 0.0 to 1.0. Calculate it by dividing the 'problem_score' by the maximum possible score for that 'problem_type'. Assume 'Coding' and 'Project Based' problems have a max score of 100, and 'Multiple-choice' problems have a max score of 20.

Input JSON:
---
{{{problemsJson}}}
---

Generate the full CSV content, including the header row.
`,
});

const generateTestStructureFlow = ai.defineFlow(
  {
    name: 'generateTestStructureFlow',
    inputSchema: GenerateTestStructureInputSchema,
    outputSchema: GenerateTestStructureOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate test structure CSV.');
    }
    return output;
  }
);
