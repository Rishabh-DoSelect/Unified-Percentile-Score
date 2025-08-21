# AI Candidate Report Generator

Faster. Fairer. Smarter Hiring Decisions.

---

## Overview
The **AI Candidate Report Generator** transforms traditional test score reporting into a **role-fit, percentile-driven evaluation**. It ingests the Job Description (JD), test structure, candidate CV, and candidate approach (solutions, logs, etc.) to compute a **Unified Percentile Score (UPS)**. This enables recruiters to make faster, fairer, and more accurate hiring decisions.

---

## Problem
Recruiters face challenges in assessment-based hiring:
- **Score Clustering**: Too many candidates scoring similarly
- **Volume Overload**: Hundreds pass, only 1–2 vacancies exist
- **Flat Reports**: Current systems only show marks, not insights
- **Top Scorers ≠ Best Fit**: High marks don’t always equal great hires
- **Manual Effort**: Recruiters waste hours filtering & guessing

**Result** → Slow, inconsistent, and sometimes wrong hiring decisions.

---

## Opportunity
- Platforms like HackerRank, Codility, DoSelect show only raw scores
- Recruiters need **contextual ranking + decision-ready insights**
- A **Unified Percentile Score (UPS)** can solve clustering & fairness issues

---

## Inputs
The pipeline processes 4 main inputs:
1. **Job Description (JD)** – Defines skill weights (Python, ML, Django, SQL, etc.)
2. **Test Structure** – Maps questions to JD-relevant skills
3. **Candidate CV** – Projects, experience, keywords
4. **Candidate Approach** – Code quality, persistence, efficiency, plagiarism risk

---

## Rubric-Based Evaluation Framework
Each candidate is evaluated across **5 rubric categories**:

1. **Skill Alignment (40%)**
   - JD-weighted section scores
   - Example: Python = 35%, ML = 30%, Django = 20%, SQL = 15%

2. **Knowledge Evidence (20%)**
   - CV-based signals: Projects, internships, GitHub, Kaggle, publications
   - Simple NLP/keyword matching for MVP

3. **Problem-Solving Approach (20%)**
   - Code cleanliness (comments, modularity)
   - Logical attempts vs. brute force
   - Persistence & retries
   - Correct library usage

4. **Efficiency & Consistency (10%)**
   - Time taken vs. score
   - Balanced performance across skills (low variance = higher score)

5. **Integrity & Risk (10%)**
   - Plagiarism / identical code detection
   - Proctoring violations
   - Anomaly detection

---

## Composite Score Calculation
<code>
Final_Score =
   0.40 * Skill_Alignment +
   0.20 * Knowledge_Evidence +
   0.20 * Problem_Solving +
   0.10 * Efficiency_Consistency +
   0.10 * Integrity_Risk
</code>

Percentile Conversion:
<code>
Percentile = (Rank of candidate / Total candidates) × 100
</code>

---

## Outputs
For each candidate:
- **Unified Percentile Score (UPS)**
- **Rank among peers**
- **Strengths & Red Flags** (from rubric breakdown)
- **Recommendation** (Strong Hire / Conditional / Not Recommended)

For recruiters:
- **Executive Summary** → Top-K candidates shortlist
- **Detailed Candidate Breakdown** → Per-candidate rubric insights

---

## Example Report
**Before (Excel):**
<code>
Candidate A: 42 marks, 84%
Candidate B: 42 marks, 84%
Candidate C: 42 marks, 84%
</code>

**After (AI Candidate Report):**
<code>
Candidate A: 92nd percentile – Strong Hire – Python/Django strong
Candidate B: 76th percentile – Conditional – Unbalanced skills
Candidate C: 54th percentile – Not Recommended – High risk flags
</code>

---

## Benefits
- **Tie-Breaking with Confidence** – Clear ranking among clustered scores
- **Smarter Shortlisting** – Top 10/20 ready instantly
- **Faster Hiring** – Hours → Minutes
- **Fair & Consistent** – Same rubric applied to all
- **Better Hires** – Surfaces hidden gems

---

## MVP Scope (Hackathon)
- Ingest JD, Test, CV, Candidate Results
- Compute Unified Percentile Score
- Generate Excel + Dashboard Report with:
  - **Executive Summary** (Top-K candidates)
  - **Detailed Candidate Breakdown** (strengths/risks)

---

## Vision
Move from **raw marks reporting** → to **role-fit, percentile-driven hiring intelligence**.

Recruiters don’t just see *“what candidates scored”* → they see *“who to hire and why.”*

---

