# AI Candidate Report Generator – Build Guide for GitHub Copilot Chat

Faster. Fairer. Smarter hiring decisions, from raw test data to an executive-ready shortlist.

---

## 0) Purpose of this README
This document tells **GitHub Copilot Chat** exactly **how to start**, **what to build**, **what to input**, **what to output**, and **how to finish** a complete MVP for the **AI Candidate Report Generator**. There is **no ambiguity**: all inputs, outputs, file formats, steps, commands, acceptance criteria, and test cases are fully specified.

---

## 1) Problem & Goal (One Paragraph)
Recruitment teams face **score clustering**, **huge candidate volumes**, and **flat Excel reports** that show marks but not role-fit. The goal is to compute a **Unified Percentile Score (UPS)** per candidate (0–100) using a strict **rubric** (JD-weighted skills, CV signals, approach quality, efficiency/consistency, integrity) and produce an **executive shortlist** and **detailed per-candidate breakdown**.

---

## 2) System Overview (What to Build)
The MVP is a **local Python package + CLI** that reads standardized inputs and writes standardized outputs. Optional: a **Streamlit dashboard** that renders the outputs.

### 2.1 Components
- **/src/** Python package `ai_candidate_report/`
- **/cli/** CLI entrypoint `acr` (console script)
- **/configs/** YAML configuration (JD skill weights, rubric weights, thresholds)
- **/data/** Input data (test structure, candidate records, optional CVs)
- **/output/** Final reports (CSV, JSON, XLSX) + artifacts (logs, QA checks)
- **/dash/** Optional Streamlit dashboard
- **/tests/** Unit tests + golden samples

### 2.2 High-Level Flow
1) **Parse inputs** (JD weights, test-to-skill map, candidate test results, optional CVs, approach signals)
2) **Normalize** raw scores and signals to 0–1
3) **Compute rubric category scores** (0–1)
4) **Compute Final Score** (0–1) and **UPS percentile** (0–100)
5) **Rank** candidates (deterministic tie-breaking)
6) **Generate reports** (executive summary + detailed breakdown)
7) **Validate** with QA rules; emit logs and a QA CSV

---

## 3) Exact Inputs (Required Formats)
All inputs must be UTF-8. Dates are ISO-8601. Booleans are lowercase `true/false`.

### 3.1 JD Skill Weights (YAML) – required
File: **configs/jd_weights.yaml**
<code>
role: "Python Data Science & AI Intern"
skill_weights:  # must sum to 1.0
  python: 0.35
  ml: 0.30
  django: 0.20
  sql: 0.15
</code>

### 3.2 Rubric Weights (YAML) – required
File: **configs/rubric.yaml**
<code>
rubric_weights:  # must sum to 1.0
  skill_alignment: 0.40
  knowledge_evidence: 0.20
  problem_solving: 0.20
  efficiency_consistency: 0.10
  integrity_risk: 0.10

# thresholds are used for flags and recommendations
thresholds:
  strong_hire_percentile_min: 85
  conditional_percentile_min: 65
  red_flag_integrity_max: 0.40  # <= triggers risk note
</code>

### 3.3 Test Structure → Skill Map (CSV) – required
File: **data/test_structure.csv**
Columns (strict): `section_id,section_name,skill,weight_in_section`
- `skill` ∈ {python, ml, django, sql}
- `weight_in_section` ∈ [0,1]; weights within a section must sum to 1
<code>
section_id,section_name,skill,weight_in_section
S1,Python Coding,python,1.0
S2,ML Notebooks,ml,1.0
S3,Django,django,1.0
S4,SQL/EDA,sql,1.0
</code>

### 3.4 Candidate Test Results (CSV) – required
File: **data/candidates.csv**
Columns (strict):
- Identification: `candidate_id` (string), `name`
- Per-section scores: one column per `section_id`, numeric [0,100]
- Timing: `total_time_sec` (int ≥ 0)
- Attempts/approach: `attempts` (int ≥ 0)
- Integrity: `plagiarism_score` [0,1], `proctoring_flags` (int ≥ 0)
<code>
candidate_id,name,S1,S2,S3,S4,total_time_sec,attempts,plagiarism_score,proctoring_flags
U001,Rohit,78,66,42,59,5200,7,0.10,0
U002,Anika,88,72,60,64,4100,5,0.05,1
</code>

### 3.5 Optional: Candidate CV Signals (CSV)
File: **data/cv_signals.csv**
Columns (strict): `candidate_id,projects,internships,github,keywords`
- `github` ∈ {0,1}
- `keywords` comma-separated; evaluated by fixed dictionary (see §5.2)
<code>
candidate_id,projects,internships,github,keywords
U001,2,1,1,"python, scikit-learn, django"
U002,1,0,0,"pandas, ml"
</code>

---

## 4) Exact Outputs (Required Formats)
All outputs are overwritten on each run.

### 4.1 Executive Summary (CSV)
File: **output/executive_summary.csv**
Columns: `rank,candidate_id,name,UPS_percentile,recommendation,key_strengths,key_risks`

### 4.2 Detailed Report (CSV)
File: **output/detailed_report.csv**
Columns: `candidate_id,name,skill_alignment,knowledge_evidence,problem_solving,efficiency_consistency,integrity_risk,final_score,UPS_percentile,rank,recommendation,strengths,red_flags`

### 4.3 JSON Bundle (JSON)
File: **output/report_bundle.json**
Top-level keys: `generated_at, role, totals, executive_summary, candidates`

### 4.4 QA & Logs
- **output/qa_checks.csv** (row-wise validations and bounds checks)
- **output/run.log** (INFO/WARN/ERROR)

### 4.5 Optional: XLSX Pack
- **output/ai_candidate_report.xlsx** with 3 sheets: Summary, Detailed, QA

---

## 5) Scoring Rules (Unambiguous)
All category scores are normalized to [0,1].

### 5.1 Skill Alignment (40%)
1) Compute **section normalized** = section_score / 100
2) Compute **skill score** = Σ (section_normalized × weight_in_section) for sections mapped to that skill
3) Compute **JD-weighted skill alignment** = Σ (skill_score × jd.skill_weights[skill])
Result ∈ [0,1]

### 5.2 Knowledge Evidence (20%)
If `cv_signals.csv` missing → default 0.5 for all candidates.
Otherwise, compute:
- `projects_score` = min(projects, 3)/3
- `internships_score` = min(internships, 2)/2
- `github_score` = github (0/1)
- `keywords_score` = (#keywords matched from dictionary)/(#max consider = 6) capped at 1
Dictionary (fixed): {"python","pandas","numpy","scikit-learn","ml","django","sql"}
<code>
knowledge_evidence = 0.35*projects_score + 0.25*internships_score + 0.20*github_score + 0.20*keywords_score
</code>

### 5.3 Problem-Solving Approach (20%)
Inputs: `attempts`, per-section balance, (optional) code quality heuristics.
For MVP (data only from candidates.csv):
- `balance_score` = 1 - (stddev of section_normalized)  (clip to [0,1])
- `persistence_score` = min(attempts, 8)/8
<code>
problem_solving = 0.6*balance_score + 0.4*persistence_score
</code>

### 5.4 Efficiency & Consistency (10%)
- Compute cohort percentiles for `total_time_sec` and for overall mean of section_normalized
- `speed_score` = 1 - time_percentile (faster → higher)
- `consistency_score` = 1 - (stddev of section_normalized)  (clip to [0,1])
<code>
efficiency_consistency = 0.6*speed_score + 0.4*consistency_score
</code>

### 5.5 Integrity & Risk (10%)
- `plagiarism_penalty` = plagiarism_score  (already 0–1)
- `proctor_penalty` = min(proctoring_flags, 5)/5
<code>
integrity_risk = 1 - (0.7*plagiarism_penalty + 0.3*proctor_penalty)
</code>

### 5.6 Composite & Percentile
<code>
final_score = 0.40*skill_alignment + 0.20*knowledge_evidence + 0.20*problem_solving + 0.10*efficiency_consistency + 0.10*integrity_risk
</code>
Ranking:
- Sort by `final_score` DESC, tie-breakers: lower `plagiarism_score`, then lower `total_time_sec`, then `candidate_id` lexicographically.
Percentile (dense rank → 1..K):
<code>
UPS_percentile = round(100 * (K - dense_rank + 1) / K, 2)
</code>
Recommendation:
<code>
if UPS_percentile >= thresholds.strong_hire_percentile_min: "Strong Hire"
elif UPS_percentile >= thresholds.conditional_percentile_min: "Conditional"
else: "Not Recommended"
</code>

---

## 6) Project Scaffolding (Copilot: Generate Now)
Create the repository structure below. Copilot must create every file with exact names.
<code>
.
├── README.md
├── pyproject.toml
├── src/ai_candidate_report/__init__.py
├── src/ai_candidate_report/io.py
├── src/ai_candidate_report/scoring.py
├── src/ai_candidate_report/qa.py
├── src/ai_candidate_report/report.py
├── src/ai_candidate_report/utils.py
├── cli/acr.py
├── configs/jd_weights.yaml
├── configs/rubric.yaml
├── data/test_structure.csv
├── data/candidates.csv
├── data/cv_signals.csv  # optional
├── output/.gitkeep
├── dash/app.py          # optional
└── tests/test_scoring.py
</code>

Minimal **pyproject.toml** (build + CLI):
<code>
[project]
name = "ai-candidate-report"
version = "0.1.0"
dependencies = [
  "pandas>=2.0.0",
  "numpy>=1.26.0",
  "pyyaml>=6.0",
  "openpyxl>=3.1.0",
  "scipy>=1.11.0",
  "tabulate>=0.9.0",
  "typer>=0.12.0",
]

[project.scripts]
acr = "cli.acr:app"
</code>

---

## 7) Copilot Chat: Step-by-Step Commands
**Use these exact prompts inside GitHub Copilot Chat.**

### 7.1 Initialize
<code>
Create all files from the scaffolding in README §6. Use idiomatic Python, type hints, and docstrings. Implement no business logic yet, only function signatures.
</code>

### 7.2 Implement IO
<code>
Implement src/ai_candidate_report/io.py to load YAML (configs) and CSVs (data). Validate schema: required columns must exist exactly as defined in README §3. Raise ValueError with helpful messages if invalid.
</code>

### 7.3 Implement Scoring
<code>
Implement src/ai_candidate_report/scoring.py with pure functions for each rubric component and the composite, exactly per formulas in README §5. Include deterministic tie-breaking and UPS percentile in a function `rank_and_percentile(df_scores)`. All outputs must be clipped to [0,1] where applicable.
</code>

### 7.4 Implement QA
<code>
Implement src/ai_candidate_report/qa.py with row-wise checks: value ranges, NaNs, bounds per README §3 and §5. Emit output/qa_checks.csv with columns: candidate_id, check, status, details.
</code>

### 7.5 Implement Report Builder
<code>
Implement src/ai_candidate_report/report.py to assemble executive_summary.csv, detailed_report.csv, and report_bundle.json exactly as in README §4. Also write output/ai_candidate_report.xlsx with sheets (Summary, Detailed, QA).
</code>

### 7.6 Implement CLI
<code>
Use Typer in cli/acr.py with commands:
- `acr run --config-jd configs/jd_weights.yaml --config-rubric configs/rubric.yaml --test-structure data/test_structure.csv --candidates data/candidates.csv --cv data/cv_signals.csv`
- `acr validate`  # runs schema checks only
- `acr sample`    # generates minimal sample CSVs into data/
</code>

### 7.7 Tests
<code>
Write tests in tests/test_scoring.py covering: normalization, category computations, composite, ranking, UPS percentile, and recommendations using small synthetic data. All tests must pass.
</code>

### 7.8 Optional Dashboard
<code>
Create dash/app.py (Streamlit) to load output/*.csv and render: KPI tiles, sortable table, filters by skills, and candidate detail drawer.
</code>

---

## 8) Pseudocode (Source of Truth)
### 8.1 Core Pipeline
<code>
def run_pipeline(paths) -> None:
    jd = load_yaml(paths.jd_yaml)
    rubric = load_yaml(paths.rubric_yaml)
    structure = load_csv(paths.test_structure)
    candidates = load_csv(paths.candidates)
    cvs = load_csv(paths.cvs) if paths.cvs else None

    validate_structure(structure)
    validate_candidates(candidates, structure)
    if cvs: validate_cvs(cvs)

    # 1) skill alignment
    section_norm = normalize_sections(candidates, structure)  # per-section [0,1]
    skill_scores = aggregate_to_skills(section_norm, structure)  # by mapping
    skill_alignment = jd_weighted(skill_scores, jd.skill_weights)

    # 2) knowledge evidence
    knowledge = compute_knowledge(cvs) if cvs else default_constant(candidates, 0.5)

    # 3) problem solving
    problem = compute_problem_solving(section_norm, candidates)

    # 4) efficiency & consistency
    effcon = compute_efficiency_consistency(section_norm, candidates)

    # 5) integrity & risk
    integrity = compute_integrity(candidates)

    # composite
    final = composite(skill_alignment, knowledge, problem, effcon, integrity, rubric.rubric_weights)

    # rank + percentile + recommendation
    scored = rank_and_percentile(final, candidates)
    labeled = add_recommendations(scored, rubric.thresholds)

    # QA + reports
    qa = run_qa_checks(candidates, labeled)
    write_reports(labeled, qa)
</code>

---

## 9) CLI Usage (Deterministic)
### 9.1 Run Full Pipeline
<code>
acr run \
  --config-jd configs/jd_weights.yaml \
  --config-rubric configs/rubric.yaml \
  --test-structure data/test_structure.csv \
  --candidates data/candidates.csv \
  --cv data/cv_signals.csv
</code>

### 9.2 Validate Inputs Only
<code>
acr validate --test-structure data/test_structure.csv --candidates data/candidates.csv --cv data/cv_signals.csv
</code>

### 9.3 Generate Sample Inputs
<code>
acr sample --out data/
</code>

---

## 10) Acceptance Criteria (Finish Line)
- ✅ All schemas validated; invalid inputs raise clear errors
- ✅ `acr run` produces **all** outputs in **output/** exactly as specified in §4
- ✅ Unit tests pass (`pytest -q`)
- ✅ UPS percentiles sum to ~uniform distribution on synthetic data tests
- ✅ Deterministic tie-breaking confirmed with fixed seeds
- ✅ QA checks file contains zero `status=fail` for valid datasets
- ✅ Optional dashboard loads and renders outputs without errors

---

## 11) Error Handling & Edge Cases
- Missing optional CVs → `knowledge_evidence = 0.5`
- Section column missing in candidates.csv → **hard fail** with message
- Weights not summing to 1.0 (JD or section) → **hard fail** with message
- Negative or >100 section scores → clipped to [0,100] with QA warning
- `plagiarism_score` outside [0,1] → hard fail
- Empty candidate set → generate empty outputs + QA note

---

## 12) Data Privacy & Reproducibility
- No PII beyond names and IDs; logs must not contain raw code submissions
- Randomness avoided; percentile computed from deterministic ranking only

---

## 13) Maintainer Notes
- Keep formulas in **one module** (`scoring.py`) to prevent drift
- Any rubric change must update **configs/rubric.yaml** and unit tests

---

## 14) What Copilot Must Not Do
- Do **not** invent columns or rename fields
- Do **not** change formulas from §5
- Do **not** produce outputs in formats other than §4

---

## 15) Quick Start (for Humans)
1) Paste prompts from **§7** into Copilot Chat in order
2) Place your CSV/YAML inputs in **/configs** and **/data**
3) Run **§9.1**
4) Open **output/ai_candidate_report.xlsx** or launch **Streamlit** to view

---

This README is the single source of truth for Copilot Chat to deliver the complete product without ambiguity or errors.

