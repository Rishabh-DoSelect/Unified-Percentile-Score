"""
Unified Percentile Score (UPS) - Local Runner

This script simulates the core scoring pipeline described in the Firebase architecture, allowing you to run the UPS computation locally for a batch of candidates.

- Ingests: JD weights, rubric weights, test structure, candidate autoscores, CV features, timeline, and integrity signals.
- Computes: Section scores, rubric-weighted composite, final UPS, rank, percentile, and tier.
- Outputs: Ranked cohort table with strengths/risks and rubric breakdown.

Place your input files in the 'data/' directory as CSV/JSON. See README for format details.
"""
import os
import json
import pandas as pd
import numpy as np

# --- Config ---
DATA_DIR = 'data'
JD_WEIGHTS_FILE = os.path.join(DATA_DIR, 'jd_weights.json')
RUBRIC_WEIGHTS_FILE = os.path.join(DATA_DIR, 'rubric_weights.json')
AUTOSCORES_FILE = os.path.join(DATA_DIR, 'autoscores.csv')
CV_FEATURES_FILE = os.path.join(DATA_DIR, 'cv_features.csv')
TIMELINE_FILE = os.path.join(DATA_DIR, 'timeline.csv')
INTEGRITY_FILE = os.path.join(DATA_DIR, 'integrity.csv')
OUTPUT_FILE = os.path.join('output', 'ups_report.csv')

# --- Helpers ---
def load_json(path):
    with open(path) as f:
        return json.load(f)

def jd_weighted_skill(sections, weights):
    return sum(sections.get(k, 0) * weights.get(k, 0) for k in weights)

def compute_final(sections, weights, rubric, knowledge, approach, efficiency, integrity):
    skill = jd_weighted_skill(sections, weights)
    final = (
        rubric['skill'] * skill +
        rubric['knowledge'] * knowledge +
        rubric['approach'] * approach +
        rubric['efficiency'] * efficiency +
        rubric['integrity'] * integrity
    )
    return skill, final

def assign_tier(percentile):
    if percentile >= 85:
        return 'Strong'
    elif percentile >= 60:
        return 'Conditional'
    else:
        return 'NotRecommended'

# --- Main Pipeline ---
def main():
    os.makedirs('output', exist_ok=True)
    jd_weights = load_json(JD_WEIGHTS_FILE)
    rubric_weights = load_json(RUBRIC_WEIGHTS_FILE)
    autoscores = pd.read_csv(AUTOSCORES_FILE)  # candidateId,python,ml,django,eda
    cv = pd.read_csv(CV_FEATURES_FILE)         # candidateId,knowledgeEvidence
    timeline = pd.read_csv(TIMELINE_FILE)      # candidateId,efficiency
    integrity = pd.read_csv(INTEGRITY_FILE)    # candidateId,integrity

    # Merge all features
    df = autoscores.merge(cv, on='candidateId')\
                  .merge(timeline, on='candidateId')\
                  .merge(integrity, on='candidateId')

    # Compute rubric scores
    results = []
    for _, row in df.iterrows():
        sections = {k: row[k] for k in jd_weights}
        knowledge = row['knowledgeEvidence']
        approach = row.get('problemSolving', 0.75)  # placeholder
        eff = row['efficiency']
        integ = row['integrity']
        skill, final = compute_final(sections, jd_weights, rubric_weights, knowledge, approach, eff, integ)
        results.append({
            'candidateId': row['candidateId'],
            'skillAlignment': round(skill, 4),
            'knowledgeEvidence': round(knowledge, 4),
            'problemSolving': round(approach, 4),
            'efficiency': round(eff, 4),
            'integrity': round(integ, 4),
            'finalUPS': round(final, 4)
        })
    out = pd.DataFrame(results)
    out = out.sort_values('finalUPS', ascending=False).reset_index(drop=True)
    out['rank'] = out.index + 1
    N = len(out)
    out['percentile'] = 100 * (1 - (out['rank'] - 1) / N)
    out['tier'] = out['percentile'].apply(assign_tier)

    # --- UPS Dashboard Interface ---
    # For demo, assume 'candidateName', 'candidateEmail', and 'Marks' columns exist in autoscores or cv
    # If not, fill with placeholder or extend as needed
    # Merge with candidate info if available
    candidate_info_cols = []
    if 'candidateName' in autoscores.columns:
        candidate_info_cols.append('candidateName')
    if 'candidateEmail' in autoscores.columns:
        candidate_info_cols.append('candidateEmail')
    if 'Marks' in autoscores.columns:
        candidate_info_cols.append('Marks')
    dashboard = out.copy()
    for col in candidate_info_cols:
        dashboard[col] = autoscores.set_index('candidateId').loc[dashboard['candidateId'], col].values
    # Add skills breakdown if available
    if set(['python','ml','django','eda']).issubset(dashboard.columns):
        dashboard['Skills'] = dashboard[['python','ml','django','eda']].apply(lambda r: ', '.join(f"{k}:{r[k]:.2f}" for k in ['python','ml','django','eda']), axis=1)
    else:
        dashboard['Skills'] = ''
    # Print dashboard
    print("\nUPS Dashboard:")
    print("{:<15} {:<25} {:<8} {:<10} {:<15} {}".format('CandidateName','CandidateEmail','Marks','UPS_Score','Recommendation','Skills'))
    for _, row in dashboard.iterrows():
        print("{:<15} {:<25} {:<8} {:<10} {:<15} {}".format(
            row.get('candidateName','-'),
            row.get('candidateEmail','-'),
            row.get('Marks','-'),
            row['finalUPS'],
            row['tier'],
            row.get('Skills','')
        ))
    out.to_csv(OUTPUT_FILE, index=False)
    print(f"\nReport written to {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
