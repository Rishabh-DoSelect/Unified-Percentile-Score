# Unified Percentile Score (UPS)

A modern, AI-powered candidate evaluation and reporting platform for hiring, built with Next.js, TypeScript, and Firebase/Genkit AI.

---

## Overview

Unified Percentile Score (UPS) enables recruiters to make faster, fairer, and more insightful hiring decisions by:
- Ingesting Job Descriptions, Test Structures, Candidate Responses, and CVs.
- Scoring candidates across rubric dimensions (Skill Alignment, Knowledge, Problem Solving, Efficiency, Integrity).
- Generating dashboards and detailed reports with percentile-based ranking and AI-generated insights.

---

## Features

- **Next.js + TypeScript**: Modern, scalable web app architecture.
- **AI/LLM Integration**: Uses Genkit and GoogleAI for rubric scoring and candidate insights.
- **Interactive Dashboard**: Visualizes candidate rankings, scores, and strengths/risks.
- **Flexible Data Ingestion**: Upload JD, test structure, candidate responses, and CVs.
- **Customizable Rubric**: Skill weights and rubric weights are configurable per job.
- **Detailed Drilldown**: View per-candidate breakdowns, evidence, and recommendations.

---

## Project Structure

```
/src
  /ai         # Genkit AI flows for scoring and insights
  /app        # Next.js app pages and UI
  /components # UI components (dashboard, cards, tables, etc.)
  /lib        # Data processing, types, and utilities
/data         # Place your JD, test, candidate, and CV files here
/output       # Generated reports and dashboards
/ups_demo     # Example candidate JSONs and dashboard script
```

---

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:9002` (see `package.json`).

3. **Upload Data**
   - Use the UI to upload your Job Description, Test Structure, Candidate Responses, and CVs.
   - Or place files in `/data` for local processing.

4. **View Dashboard**
   - The dashboard displays candidate rankings, UPS scores, recommendations, and skill breakdowns.
   - Click on a candidate for a detailed rubric and AI-generated insights.

---

## Scoring Rubric

- **Skill Alignment** (default 40%)
- **Knowledge Evidence** (20%)
- **Problem Solving** (20%)
- **Efficiency & Consistency** (10%)
- **Integrity & Risk** (10%)

Weights are configurable per job.

---

## AI & Automation

- Uses Genkit flows and GoogleAI for:
  - JD parsing and skill weighting
  - Test structure analysis
  - CV signal extraction
  - Candidate insight generation (strengths, risks, recommendations)

---

## Example Output

| Candidate Name | Email           | UPS Score | Percentile | Recommendation | Skills                |
|----------------|-----------------|-----------|------------|----------------|-----------------------|
| John Doe       | john@x.com      | 0.92      | 98         | Strong Hire    | Python:0.95, ML:0.90  |
| Jane Smith     | jane@y.com      | 0.76      | 76         | Conditional    | Python:0.80, ML:0.70  |

---

## Contributing

- Fork the repo and create a feature branch.
- Submit pull requests for improvements or bug fixes.
- See `/src/lib/types.ts` and `/src/lib/data-processor.ts` for data model and processing logic.

---

## License

MIT License
