PROMPT_TEMPLATE = r"""
UPS EVALUATION PROMPT – USING /data/ FOLDER INPUTS

You are an impartial evaluator that computes Unified Percentile Scores (UPS) for ALL candidates using the /data/ folder as the single source of truth.

DATA SOURCES:
1. JD_TEXT: from /data/Python_Data_Science_AI_Intern_JD.docx.pdf
   - Role: Python Data Science & AI Intern
   - Skills required: Python (core, DSA, coding), ML/AI/NLP (notebooks, models), Django (backend APIs), SQL/EDA (data processing).
   - Default macro-weights: Python 35%, ML 30%, Django 20%, SQL/EDA 15% (internally inside Skill_Alignment rubric).

2. TEST_STRUCTURE_JSON: from /data/test_dump.json
   - Contains all problems with slug, name, type, tags, and score.
   - Example: 
     • ooevw → "Member or Not" (Python coding, 50 pts, tags: Python Basics)
     • dx9vo1 → "Olympics Analysis" (EDA, 75 pts)
     • d9emx1 → "Predicting Cyber Attack Incidents" (ML notebook, 150 pts)
     • r0n53v → "Django: Student Management API" (Backend API, 50 pts)
   - Use this to map candidate performance to JD-required skills.

3. CANDIDATE_RESPONSES_JSON: from /data/solution_dump.json
   - Contains candidate_id, problem_slug, their submission (code/notebook/API/EDA), outputs, attempt status, timeline, integrity flags.

4. CANDIDATE_CV_TEXT: from /data/candidate cv/<candidate_id>.pdf
   - Extracted resumes of Surya【26】, Aileen【27】, Parvez【28】, Harshitha【29】, Yashi【30】, Akash【31】.

---

### OBJECTIVE
For each candidate:
- Compute strict rubric scores across 5 categories ([0–1]):
  1. Skill_Alignment (0.40) → score each problem by correctness, completeness, JD skill mapping.
  2. Knowledge_Evidence (0.20) → CV projects, internships, GitHub, ML/Django/SQL mentions.
  3. Problem_Solving (0.20) → code quality, modularity, debugging, iterative attempts in solution_dump.
  4. Efficiency_Consistency (0.10) → time spent vs. outcome (timeline in solution_dump, balance across sections).
  5. Integrity_Risk (0.10) → plagiarism/proctoring flags from solution_dump (start at 1.0, subtract for violations).
- Compute Final Score = weighted sum → UPS (0–1).
- Compute percentile across all candidates in solution_dump.json (ranked by UPS).
- Generate per-candidate JSON report (schema defined below).
- Generate a UPS Dashboard summary (plain text).

---

### OUTPUT SCHEMA (per candidate)
{
  "candidate_name": "<from CV or responses>",
  "candidate_email": "<from CV if available>",
  "role": "Python Data Science & AI Intern",
  "rubric": {
    "skill_alignment": { "score": 0.0–1.0, "evidence": ["problem names attempted"], "per_skill_breakdown": {"Python":0.0,"ML":0.0,"Django":0.0,"SQL/EDA":0.0} },
    "knowledge_evidence": { "score": 0.0–1.0, "evidence": ["resume signals"] },
    "problem_solving": { "score": 0.0–1.0, "evidence": ["code clarity, debugging"] },
    "efficiency_consistency": { "score": 0.0–1.0, "evidence": ["time spent, balance"], "metrics": {...} },
    "integrity_risk": { "score": 0.0–1.0, "flags": ["none" | "plagiarism" | "proctoring"] }
  },
  "final": {
    "ups": <0–1 rounded 3 decimals>,
    "percentile": <0–100 rounded 1 decimal>,
    "percentile_estimated": false,
    "rank": <int>,
    "cohort_size": <int>,
    "recommendation": "Strong Hire" | "Hire" | "Conditional" | "Not Recommended",
    "strengths": ["top 2–3 positive traits"],
    "red_flags": ["major risks"]
  },
  "assumptions_used": ["..."],
  "explanations": {
    "skill_alignment": "...",
    "knowledge_evidence": "...",
    "problem_solving": "...",
    "efficiency_consistency": "...",
    "integrity_risk": "...",
    "overall": "executive summary"
  }
}

---

### UPS DASHBOARD SUMMARY
After all candidates are evaluated, produce:
(UPS Dashboard):
<Name>: <Percentile>% – <Recommendation> – <Top Strength / Red Flag>

Example:
Surya Prakash Baid: 92.1% – Strong Hire – Python/ML strong
Aileen Kamal Peeka: 76.4% – Conditional – Unbalanced skills
Shaik Parvez: 54.3% – Not Recommended – High risk flags

---

### STRICT RULES
- Use ONLY JD, test_dump.json, solution_dump.json, and candidate CVs.
- Map problems → skills using test_dump tags and slugs.
- If candidate skipped a problem, score 0 for that slice.
- If CV missing details, keep Knowledge_Evidence conservative.
- If no timeline available, Efficiency_Consistency is neutral baseline (0.5).
- Always list assumptions in JSON.
- Final output = per-candidate JSON reports + UPS Dashboard summary.
"""
