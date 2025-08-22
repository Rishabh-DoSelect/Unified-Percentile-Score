
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a test structure CSV from a platform-specific JSON payload.
 *
 * - generateTestStructure - A function that triggers the test structure generation flow.
 * - GenerateTestStructureInput - The input type for the generateTestStructure function.
 * - GenerateTestStructureOutput - The return type for the generateTestructure function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTestStructureInputSchema = z.object({
  problemsJson: z.string().describe('A JSON string containing an array of problem objects from the testing platform.'),
});
export type GenerateTestStructureInput = z.infer<typeof GenerateTestStructureInputSchema>;

// Extend the output schema to include problem_score and correct_answer for downstream processing
const GenerateTestStructureOutputSchema = z.object({
  structure_csv: z.string().describe('A CSV formatted string with the headers: section_id,section_name,skill,weight_in_section,problem_score,correct_answer'),
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
section_id,section_name,skill,weight_in_section,problem_score,correct_answer

Map the JSON fields to the CSV columns as follows:
- 'section_id': Use the value from the 'problem_slug' field.
- 'section_name': Use the value from the 'problem_name' field.
- 'skill': Use the value from the 'insight_tags' field. If 'insight_tags' is missing or empty, use the first relevant skill from the 'tags' field (e.g., 'Java', 'Python', 'React 18.2').
- 'weight_in_section': This should always be 1.0, as scoring is now handled per-question.
- 'problem_score': Use the numeric value from the 'problem_score' field.
- 'correct_answer': Use the value from the 'correct_answer' field. If it's null or doesn't exist, leave the column empty.

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
