'use server';

/**
 * @fileOverview This file defines a Genkit flow for parsing resume text to extract structured signals.
 *
 * - parseCv - A function that triggers the CV parsing flow.
 * - ParseCvInput - The input type for the parseCv function.
 * - ParseCvOutput - The return type for the parseCv function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ParseCvInputSchema = z.object({
  resumeText: z.string().describe('The full text content of a candidate\'s resume.'),
});
export type ParseCvInput = z.infer<typeof ParseCvInputSchema>;

const ParseCvOutputSchema = z.object({
  projects: z.number().describe('The total number of distinct projects listed.'),
  internships: z.number().describe('The total number of distinct internships listed.'),
  github: z.boolean().describe('True if a GitHub profile URL is mentioned, otherwise false.'),
  keywords: z.array(z.string()).describe('A list of key technical skills, tools, or platforms mentioned (e.g., Python, AWS, SQL).'),
});
export type ParseCvOutput = z.infer<typeof ParseCvOutputSchema>;

export async function parseCv(input: ParseCvInput): Promise<ParseCvOutput> {
  return parseCvFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseCvPrompt',
  input: { schema: ParseCvInputSchema },
  output: { schema: ParseCvOutputSchema },
  prompt: `You are an expert recruitment assistant. Analyze the following resume text and extract the required information in the specified JSON format.

- Count the number of distinct projects.
- Count the number of distinct internships.
- Check if a GitHub profile link is present.
- Extract a list of key technical skills, tools, and platforms.

Resume Text:
{{{resumeText}}}
`,
});

const parseCvFlow = ai.defineFlow(
  {
    name: 'parseCvFlow',
    inputSchema: ParseCvInputSchema,
    outputSchema: ParseCvOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
