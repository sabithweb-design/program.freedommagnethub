'use server';
/**
 * @fileOverview A Genkit flow for generating rich lesson descriptions based on a title and optional initial content.
 *
 * - generateLessonDescription - A function that handles the lesson description generation process.
 * - GenerateLessonDescriptionInput - The input type for the generateLessonDescription function.
 * - GenerateLessonDescriptionOutput - The return type for the generateLessonDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLessonDescriptionInputSchema = z.object({
  title: z.string().describe('The title of the lesson.'),
  initialContent: z
    .string()
    .optional()
    .describe('Optional initial content or bullet points for the lesson.'),
});
export type GenerateLessonDescriptionInput = z.infer<
  typeof GenerateLessonDescriptionInputSchema
>;

const GenerateLessonDescriptionOutputSchema = z.object({
  description: z
    .string()
    .describe('A rich and engaging description for the lesson.'),
});
export type GenerateLessonDescriptionOutput = z.infer<
  typeof GenerateLessonDescriptionOutputSchema
>;

export async function generateLessonDescription(
  input: GenerateLessonDescriptionInput
): Promise<GenerateLessonDescriptionOutput> {
  return generateLessonDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLessonDescriptionPrompt',
  input: {schema: GenerateLessonDescriptionInputSchema},
  output: {schema: GenerateLessonDescriptionOutputSchema},
  prompt: `You are an expert content creator specializing in educational materials.
Your task is to generate a rich and engaging lesson description based on the provided title and optional initial content.

The description should be compelling, informative, and suitable for an online learning platform. Focus on what the learner will gain or understand from the lesson.

Lesson Title: {{{title}}}
{{#if initialContent}}
Initial Content/Key Points: {{{initialContent}}}
{{/if}}

Generate the lesson description now, ensuring it is detailed and captivating.`,
});

const generateLessonDescriptionFlow = ai.defineFlow(
  {
    name: 'generateLessonDescriptionFlow',
    inputSchema: GenerateLessonDescriptionInputSchema,
    outputSchema: GenerateLessonDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
