import { config } from 'dotenv';
config();

import '@/ai/flows/generate-candidate-insights.ts';
import '@/ai/flows/parse-cv-flow.ts';
import '@/ai/flows/generate-jd-weights-flow.ts';
import '@/ai/flows/generate-test-structure-flow.ts';
