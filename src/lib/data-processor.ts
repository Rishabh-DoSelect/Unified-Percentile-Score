'use client';

import yaml from 'js-yaml';
import Papa from 'papaparse';
import type { getAIInsights } from '@/app/actions';
import type { GenerateCandidateInsightsInput } from '@/ai/flows/generate-candidate-insights';
import type {
  Candidate,
  CandidateScores,
  CvSignal,
  FullReport,
  JDSettings,
  RankedCandidate,
  Rubric,
  TestStructure,
} from '@/lib/types';

// --- UTILITY FUNCTIONS ---
const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
const stddev = (arr: number[]) => {
  const arrMean = mean(arr);
  return Math.sqrt(mean(arr.map(n => (n - arrMean) ** 2)));
};
const parseTimeTaken = (time: string | number): number => {
    if (typeof time === 'number') return time;
    if (typeof time !== 'string') return 0;
    
    let totalSeconds = 0;
    const parts = time.split(' ');

    parts.forEach(part => {
        if (part.includes('h')) {
            totalSeconds += parseInt(part.replace('h', '')) * 3600;
        } else if (part.includes('m')) {
            totalSeconds += parseInt(part.replace('m', '')) * 60;
        } else if (part.includes('s')) {
            totalSeconds += parseInt(part.replace('s', ''));
        }
    });

    return totalSeconds;
};


// --- PARSING & VALIDATION ---
export const parseYaml = <T>(content: string): T => yaml.load(content) as T;
export const parseCsv = <T>(content: string): T[] => {
  const result = Papa.parse<T>(content, { header: true, skipEmptyLines: true, dynamicTyping: true });
  if (result.errors.length) {
    console.warn('CSV Parsing Errors:', result.errors);
  }
  return result.data;
};

// --- SCORING RULES (FROM README §5) ---

const calculateSkillAlignment = (
  candidate: Candidate,
  testStructure: TestStructure[],
  jdSettings: JDSettings
): number => {
  const sectionIds = testStructure.map(s => s.section_id);
  const skillScores: Record<string, number[]> = {};

  for (const struct of testStructure) {
    if (!skillScores[struct.skill]) skillScores[struct.skill] = [];
    const sectionScore = candidate[struct.section_id] ?? 0;
    const sectionNormalized = Math.max(0, Math.min(100, sectionScore)) / 100;
    skillScores[struct.skill].push(sectionNormalized * struct.weight_in_section);
  }
  
  let jdWeightedSkillAlignment = 0;
  for (const skill in jdSettings.skill_weights) {
    const avgSkillScore = skillScores[skill] ? mean(skillScores[skill]) : 0;
    jdWeightedSkillAlignment += avgSkillScore * (jdSettings.skill_weights[skill] || 0);
  }

  return Math.max(0, Math.min(1, jdWeightedSkillAlignment));
};

const calculateKnowledgeEvidence = (cv: CvSignal | undefined): number => {
  if (!cv) return 0.5;

  const keywordDict = ["python", "pandas", "numpy", "scikit-learn", "ml", "django", "sql"];
  const projectsScore = Math.min(cv.projects, 3) / 3;
  const internshipsScore = Math.min(cv.internships, 2) / 2;
  const githubScore = cv.github ? 1 : 0;
  
  const matchedKeywords = cv.keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => keywordDict.includes(k)).length;
  const keywordsScore = Math.min(matchedKeywords, 6) / 6;

  const score = 0.35 * projectsScore + 0.25 * internshipsScore + 0.20 * githubScore + 0.20 * keywordsScore;
  return Math.max(0, Math.min(1, score));
};

const calculateProblemSolving = (candidate: Candidate, testStructure: TestStructure[]): number => {
  const sectionScoresNormalized = testStructure.map(s => (candidate[s.section_id] ?? 0) / 100);
  const balanceScore = 1 - stddev(sectionScoresNormalized);
  const persistenceScore = 1 - (Math.min(candidate.attempts, 8) / 8); // Invert as lower attempts are better.
  
  const score = 0.6 * balanceScore + 0.4 * persistenceScore;
  return Math.max(0, Math.min(1, score));
};

const calculateEfficiencyConsistency = (
  candidate: Candidate,
  allCandidates: Candidate[],
  testStructure: TestStructure[],
): number => {
  const allTimes = allCandidates.map(c => c.total_time_sec).sort((a, b) => a - b);
  const timeRank = allTimes.indexOf(candidate.total_time_sec) + 1;
  const timePercentile = timeRank / allTimes.length;
  const speedScore = 1 - timePercentile;

  const sectionScoresNormalized = testStructure.map(s => (candidate[s.section_id] ?? 0) / 100);
  const consistencyScore = 1 - stddev(sectionScoresNormalized);

  const score = 0.6 * speedScore + 0.4 * consistencyScore;
  return Math.max(0, Math.min(1, score));
};

const calculateIntegrityRisk = (candidate: Candidate): number => {
  const plagiarismPenalty = candidate.plagiarism_score;
  const proctorPenalty = Math.min(candidate.proctoring_flags, 5) / 5;
  
  const risk = 0.7 * plagiarismPenalty + 0.3 * proctorPenalty;
  return 1 - Math.max(0, Math.min(1, risk));
};

const calculateFinalScore = (scores: Omit<CandidateScores, 'final_score'|'name'>, rubric: Rubric): number => {
  const weights = rubric.rubric_weights;
  const final =
    scores.skill_alignment * weights.skill_alignment +
    scores.knowledge_evidence * weights.knowledge_evidence +
    scores.problem_solving * weights.problem_solving +
    scores.efficiency_consistency * weights.efficiency_consistency +
    scores.integrity_risk * weights.integrity_risk;
  return Math.max(0, Math.min(1, final));
};

const rankAndPercentile = (candidatesScores: CandidateScores[], allCandidatesRaw: Candidate[]): Omit<RankedCandidate, 'recommendation' | 'key_strengths' | 'key_risks' | 'raw_candidate_data' | 'raw_cv_data'>[] => {
    const enrichedForSort = candidatesScores.map(cs => {
        const raw = allCandidatesRaw.find(c => c.candidate_id === cs.candidate_id)!;
        return {
            ...cs,
            plagiarism_score: raw.plagiarism_score,
            total_time_sec: raw.total_time_sec,
        };
    });

    enrichedForSort.sort((a, b) => {
        if (b.final_score !== a.final_score) return b.final_score - a.final_score;
        if (a.plagiarism_score !== b.plagiarism_score) return a.plagiarism_score - b.plagiarism_score;
        if (a.total_time_sec !== b.total_time_sec) return a.total_time_sec - b.total_time_sec;
        return a.candidate_id.localeCompare(b.candidate_id);
    });

    const K = enrichedForSort.length;
    const ranks: Record<string, number> = {};
    let dense_rank = 0;
    let last_score = -1;
    
    enrichedForSort.forEach((c, i) => {
        if(c.final_score !== last_score) {
            dense_rank = i + 1;
            last_score = c.final_score
        }
        ranks[c.candidate_id] = dense_rank;
    });

    return enrichedForSort.map((cs) => {
        const rank = ranks[cs.candidate_id];
        const UPS_percentile = Math.round(100 * (K - rank + 1) / K * 100) / 100;
        return { ...cs, rank, UPS_percentile };
    });
};

const addRecommendations = (rankedCandidates: Omit<RankedCandidate, 'recommendation'>[], rubric: Rubric): Omit<RankedCandidate, 'key_strengths'| 'key_risks'>[] => {
    return rankedCandidates.map(c => {
        let recommendation: 'Strong Hire' | 'Conditional' | 'Not Recommended' = 'Not Recommended';
        if (c.UPS_percentile >= rubric.thresholds.strong_hire_percentile_min) {
            recommendation = 'Strong Hire';
        } else if (c.UPS_percentile >= rubric.thresholds.conditional_percentile_min) {
            recommendation = 'Conditional';
        }
        return { ...c, recommendation };
    });
}


// --- MAIN PIPELINE ---

export async function processCandidateData(
  jdYaml: string,
  rubricYaml: string,
  structureCsv: string,
  candidatesCsv: string,
  cvCsv: string | null,
  getAIInsightsAction: typeof getAIInsights
): Promise<FullReport> {
  // 1. Parse Inputs
  const jdSettings = parseYaml<JDSettings>(jdYaml);
  const rubric = parseYaml<Rubric>(rubricYaml);
  const testStructure = parseCsv<TestStructure>(structureCsv);
  const rawCandidates = parseCsv<any>(candidatesCsv);
  const cvSignals = cvCsv ? parseCsv<CvSignal>(cvCsv) : null;

  const candidates: Candidate[] = rawCandidates.map(rc => ({
      ...rc,
      total_time_sec: parseTimeTaken(rc['Time Taken']),
  }));
  
  // 2. Score each candidate
  const candidateScores: Omit<CandidateScores, 'final_score'>[] = candidates.map(c => {
    const cv = cvSignals?.find(cv => cv.candidate_id === c.candidate_id);
    return {
      candidate_id: c.candidate_id,
      name: c.name,
      skill_alignment: calculateSkillAlignment(c, testStructure, jdSettings),
      knowledge_evidence: calculateKnowledgeEvidence(cv),
      problem_solving: calculateProblemSolving(c, testStructure),
      efficiency_consistency: calculateEfficiencyConsistency(c, candidates, testStructure),
      integrity_risk: calculateIntegrityRisk(c),
    };
  });

  // 3. Calculate Final Score
  const candidatesWithFinalScores: CandidateScores[] = candidateScores.map(cs => ({
    ...cs,
    final_score: calculateFinalScore(cs, rubric),
  }));

  // 4. Rank and get Percentile
  const ranked = rankAndPercentile(candidatesWithFinalScores, candidates);
  const withRecs = addRecommendations(ranked, rubric);

  // 5. Generate AI Insights
  const insightsPromises = withRecs.map(c => {
    const testResults: Record<string, number> = {};
    const rawCandidate = candidates.find(rc => rc.candidate_id === c.candidate_id)!;
    testStructure.forEach(ts => {
        testResults[ts.section_id] = rawCandidate[ts.section_id] ?? 0;
    });

    const cvData = cvSignals?.find(cv => cv.candidate_id === c.candidate_id);
    const cvSignalsForAI = cvData ? {
        projects: cvData.projects,
        internships: cvData.internships,
        github: cvData.github,
        keywords: cvData.keywords.split(',').map(k => k.trim())
    } : undefined;

    const aiInput: GenerateCandidateInsightsInput = {
        candidateId: c.candidate_id,
        name: c.name,
        skillAlignment: c.skill_alignment,
        knowledgeEvidence: c.knowledge_evidence,
        problemSolving: c.problem_solving,
        efficiencyConsistency: c.efficiency_consistency,
        integrityRisk: c.integrity_risk,
        finalScore: c.final_score,
        UPSErrorcentile: c.UPS_percentile,
        testResults,
        cvSignals: cvSignalsForAI,
    };
    return getAIInsightsAction(aiInput);
  });

  const aiResults = await Promise.all(insightsPromises);

  const finalRankedCandidates: RankedCandidate[] = withRecs.map((c, i) => ({
      ...c,
      ...aiResults[i],
      raw_candidate_data: candidates.find(rc => rc.candidate_id === c.candidate_id)!,
      raw_cv_data: cvSignals?.find(cv => cv.candidate_id === c.candidate_id)
  }));


  // 6. Assemble Final Report
  const totals = {
    candidates: candidates.length,
    strong_hires: finalRankedCandidates.filter(c => c.recommendation === 'Strong Hire').length,
    conditionals: finalRankedCandidates.filter(c => c.recommendation === 'Conditional').length,
  };

  return {
    generated_at: new Date().toISOString(),
    role: jdSettings.role,
    totals,
    executive_summary: finalRankedCandidates,
  };
}
