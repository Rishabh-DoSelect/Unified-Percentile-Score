# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## AI Cost Breakdown

Here is a table detailing the estimated AI costs for using this application. These costs are based on Google's Gemini models and are calculated per 1,000 characters.

| AI Task                           | Trigger                                   | Key Cost Driver                                 | Estimated Cost per Unit (Illustrative)                        | Notes                                                                                             |
| :-------------------------------- | :---------------------------------------- | :---------------------------------------------- | :------------------------------------------------------------ | :------------------------------------------------------------------------------------------------ |
| **JD Skill Weight Generation**    | Click "Generate Skill Weights"            | Length of the pasted Job Description.           | ~$0.0005 per JD                                               | A one-time cost per report. Relatively low.                                                       |
| **Test Structure Generation**     | Click "Generate Test Structure"           | Number of problems in the uploaded JSON.        | ~$0.001 per 10 problems                                       | A one-time cost per report. Cost depends on the complexity of the test.                           |
| **CV Parsing (Optional)**         | "Generate Report" (if CV file is uploaded) | Number of candidates & length of each CV.       | ~$0.0007 per candidate                                        | This is a major variable cost. Scales directly with the number of candidates with CVs.            |
| **Candidate Insight Generation**  | Click "Generate Report"                   | Number of candidates & test/CV data complexity. | ~$0.001 per candidate                                       | **This is the primary cost driver of the application.** It runs for every candidate in the dataset. |

**Disclaimer:** *These are illustrative estimates. Actual costs may vary based on the specific length and complexity of your input data and the current pricing of the underlying AI models.*

## Presentation Deck Outline

Here is a clear and logical table structure you can use for a presentation deck to introduce and explain this application to stakeholders.

| Slide # | Section          | Topic                                     | Key Talking Points                                                                                                                              |
| :------ | :--------------- | :---------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | Title            | **UPS Report: AI-Powered Candidate Analysis** | - App name and tagline.<br>- Your company/team name.<br>- Date.                                                                                 |
| 2       | The Problem      | **The Challenge of Technical Hiring**     | - Hiring is slow, expensive, and prone to bias.<br>- Reviewing hundreds of candidates is time-consuming.<br>- Raw test data is hard to interpret. |
| 3       | The Solution     | **Introducing the UPS Report Analyzer**   | - Our solution: A tool to turn raw test data into an executive-ready shortlist.<br>- Key benefits: Faster, Fairer, Smarter hiring decisions.       |
| 4       | How It Works     | **The 3-Step Workflow**                   | 1. **Upload Data**: JD, Test Structure, and Candidate Results.<br>2. **Configure**: Adjust the scoring rubric.<br>3. **Analyze**: Generate the report. |
| 5       | Feature Deep Dive| **AI-Powered JD & Test Structure Generation** | - Show how users can paste a job description to get skill weights.<br>- Demonstrate uploading platform JSON to auto-generate the test structure.   |
| 6       | Feature Deep Dive| **Customizable Scoring Rubric**           | - Explain the five scoring pillars (Skill Alignment, Knowledge, etc.).<br>- Show the sliders and how weighting can be customized for different roles. |
| 7       | The Output       | **The Executive Dashboard**               | - Showcase the main dashboard view.<br>- Highlight key metrics: Total Candidates, Strong Hires, Average Score.<br>- Explain the candidate shortlist table. |
| 8       | The Output       | **The Detailed Candidate View**           | - Show the candidate detail sheet.<br>- Point out the AI-generated strengths and risks.<br>- Walk through the score breakdown and CV signals.       |
| 9       | Technology       | **The Tech Stack**                        | - **Frontend**: Next.js, React, Tailwind CSS.<br>- **Backend/AI**: Genkit with Google's Gemini Models.<br>- Secure and scalable architecture.        |
| 10      | AI Cost          | **Understanding the AI Costs**            | - Explain that cost is based on usage (per candidate analysis).<br>- Highlight that the main cost drivers are CV parsing and insight generation.  |
| 11      | Summary          | **Recap & Benefits**                      | - **Faster**: Reduces screening time from hours to minutes.<br>- **Fairer**: Standardized, data-driven rubric reduces bias.<br>- **Smarter**: AI insights uncover hidden strengths and risks. |
| 12      | Q&A / Next Steps | **Questions & Discussion**                | - Open the floor for questions.<br>- Discuss next steps for adoption or trial.                                                                 |
