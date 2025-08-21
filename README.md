# Unified Percentile Score (UPS)

Faster. Fairer. Smarter Hiring Decisions.

---

## Table of Contents
- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution & Rubric](#solution--rubric)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Extending the Project](#extending-the-project)
- [Contribution Guidelines](#contribution-guidelines)
- [Vision](#vision)
- [License](#license)

---

## Overview
Unified Percentile Score (UPS) is an open-source framework for transforming traditional test score reporting into a role-fit, percentile-driven evaluation. It ingests the Job Description (JD), test structure, candidate CV, and candidate approach (solutions, logs, etc.) to compute a Unified Percentile Score (UPS). This enables recruiters to make faster, fairer, and more accurate hiring decisions at scale.

---

## Problem Statement
Recruiters face major challenges in assessment-based hiring:
- **Score Clustering:** Too many candidates scoring similarly
- **Volume Overload:** Hundreds pass, only 1–2 vacancies exist
- **Flat Reports:** Current systems only show marks, not insights
- **Top Scorers ≠ Best Fit:** High marks don’t always equal great hires
- **Manual Effort:** Recruiters waste hours filtering & guessing

**Result:** Slow, inconsistent, and sometimes wrong hiring decisions.

---

## Solution & Rubric
UPS provides a single, unified percentile score for each candidate using:
1. **Job Description (JD):** Defines skill weights (e.g., Python, ML, Django, SQL)
2. **Test Structure:** Maps questions to JD-relevant skills
3. **Candidate CV:** Projects, experience, keywords
4. **Candidate Approach:** Code quality, persistence, efficiency, plagiarism risk

### Rubric-Based Evaluation Framework
Each candidate is evaluated across 5 rubric categories:
- **Skill Alignment (40%)**: JD-weighted section scores
- **Knowledge Evidence (20%)**: CV-based signals (projects, internships, etc.)
- **Problem-Solving Approach (20%)**: Code cleanliness, logical attempts, persistence
- **Efficiency & Consistency (10%)**: Time taken vs. score, balanced skills
- **Integrity & Risk (10%)**: Plagiarism, proctoring, anomaly detection

#### Composite Score Calculation
```python
Final_Score = (
    0.40 * Skill_Alignment +
    0.20 * Knowledge_Evidence +
    0.20 * Problem_Solving +
    0.10 * Efficiency_Consistency +
    0.10 * Integrity_Risk
)
```

#### Percentile Conversion
```python
Percentile = (Rank of candidate / Total candidates) × 100
```

---

## System Architecture

**Inputs (All Required):**
- Job Description (JD) file (PDF/DOCX/TXT)
- Test Structure (mapping questions to skills, e.g., CSV/JSON)
- Candidate Reports (Excel/CSV)
- Candidate CVs (PDF/DOCX)

> **Note:** All four input types above are mandatory for the pipeline to run. No input is optional.

**Pipeline:**
1. **Ingestion:** Parse JD, test structure, and candidate results
2. **Mapping:** Map test questions to skills as per JD
3. **Scoring:** Compute rubric-based scores for each candidate
4. **Ranking:** Calculate percentile and generate recommendations
5. **Reporting:** Output Excel and dashboard reports

**Outputs:**
- Executive Summary (Top-K candidates)
- Detailed Candidate Breakdown (strengths/risks)
- Actionable shortlist and recommendations

---

## Features
- Ingests JD, test structure, candidate CV, and test results
- Computes Unified Percentile Score (UPS) for each candidate
- Generates Excel and dashboard reports with:
  - Executive Summary (Top-K candidates)
  - Detailed Candidate Breakdown (strengths/risks)
- Provides actionable shortlists and recommendations
- Modular and extensible for new data sources and rubric changes

---

## Getting Started

### Prerequisites
- Python 3.8+
- pip (Python package manager)
- (Recommended) Virtual environment tool: `venv` or `conda`

### Setup
1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd <project-directory>
   ```
2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Add your data:**
   - Place JD, test structure, and candidate report files in the `data/` directory.
4. **Run the pipeline:**
   ```bash
   python main.py
   ```
5. **View results:**
   - Check the `output/` directory for reports and dashboards.

---

## Project Structure
```text
├── data/                # Input files (JD, test structure, candidate reports, CVs)
├── output/              # Generated reports and dashboards
├── src/                 # Source code (parsers, scoring, reporting)
├── tests/               # Unit and integration tests
├── requirements.txt     # Python dependencies
├── main.py              # Pipeline entry point
├── README.md            # Project documentation
└── LICENSE              # License file
```

---

## Extending the Project
- **Add new rubric categories:** Update the scoring logic in `src/scoring.py`.
- **Support new input formats:** Add parsers in `src/parsers/`.
- **Integrate with ATS/HRMS:** Build connectors in `src/integrations/`.
- **Enhance reporting:** Extend `src/reporting/` for new visualizations or export formats.

---

## Contribution Guidelines
We welcome contributions from the community!

1. Fork the repository and create your branch from `main`.
2. Add your feature or bugfix with clear, well-documented code.
3. Write or update tests as needed.
4. Ensure all tests pass (`pytest` recommended).
5. Submit a pull request with a clear description of your changes.

For major changes, please open an issue first to discuss your proposal.

---

## Vision
Move from raw marks reporting to role-fit, percentile-driven hiring intelligence.

Recruiters don’t just see *“what candidates scored”* — they see *“who to hire and why.”*

---

## License
[MIT License](LICENSE)
