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
const mean = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const stddev = (arr: number[]) => {
  if (arr.length < 2) return 0;
  const arrMean = mean(arr);
  const sumOfSquares = arr.map(n => (n - arrMean) ** 2).reduce((a,b) => a + b, 0);
  return Math.sqrt(sumOfSquares / (arr.length - 1));
};
const parseTimeTaken = (time: string | number): number => {
    if (typeof time === 'number') return time;
    if (typeof time !== 'string' || !time) return 0;
    
    let totalSeconds = 0;
    const timeLower = time.toLowerCase();
    
    const hoursMatch = timeLower.match(/(\d+)\s*h/);
    if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600;

    const minutesMatch = timeLower.match(/(\d+)\s*m/);
    if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60;
    
    const secondsMatch = timeLower.match(/(\d+)\s*s/);
    if (secondsMatch) totalSeconds += parseInt(secondsMatch[1]);
    
    // If no units, assume it's seconds
    if (!hoursMatch && !minutesMatch && !secondsMatch && /^\d+$/.test(time)) {
        return parseInt(time);
    }

    return totalSeconds;
};


// --- PARSING & VALIDATION ---
export const parseYaml = <T>(content: string): T => yaml.load(content) as T;
export const parseCsv = <T>(content:string): T[] => {
  const result = Papa.parse<T>(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: header => header.toLowerCase().replace(/\s+/g, '_'),
  });
  if (result.errors.length) {
    console.warn('CSV Parsing Errors:', result.errors);
    // Optionally throw an error for critical parsing failures
    // throw new Error(`CSV parsing failed: ${result.errors[0].message}`);
  }
  return result.data;
};

// --- SCORING RULES (FROM README §5) ---

const calculateSkillAlignment = (
  candidate: Candidate,
  testStructure: TestStructure[],
  jdSettings: JDSettings
): number => {
  const skillScores: Record<string, { scores: number[], weights: number[] }> = {};

  for (const struct of testStructure) {
    const skill = struct.skill.toLowerCase();
    if (!skillScores[skill]) skillScores[skill] = { scores: [], weights: [] };
    
    const sectionScore = candidate[struct.section_id.toLowerCase()] ?? 0;
    const sectionNormalized = Math.max(0, Math.min(100, sectionScore)) / 100;
    
    skillScores[skill].scores.push(sectionNormalized);
    skillScores[skill].weights.push(struct.weight_in_section);
  }
  
  let jdWeightedSkillAlignment = 0;
  for (const skill in jdSettings.skill_weights) {
    const skillKey = skill.toLowerCase();
    const skillData = skillScores[skillKey];
    let avgSkillScore = 0;

    if (skillData && skillData.scores.length > 0) {
        const totalWeight = skillData.weights.reduce((sum, w) => sum + w, 0);
        if (totalWeight > 0) {
            const weightedSum = skillData.scores.reduce((sum, s, i) => sum + s * skillData.weights[i], 0);
            avgSkillScore = weightedSum / totalWeight;
        }
    }
    
    jdWeightedSkillAlignment += avgSkillScore * (jdSettings.skill_weights[skill] || 0);
  }

  return Math.max(0, Math.min(1, jdWeightedSkillAlignment));
};

const calculateKnowledgeEvidence = (cv: CvSignal | undefined): number => {
  if (!cv) return 0.5; // Neutral score if no CV data

  const keywordDict = ["python", "pandas", "numpy", "scikit-learn", "ml", "django", "sql", "tensorflow", "pytorch", "aws", "gcp", "azure"];
  const projectsScore = Math.min(cv.projects || 0, 3) / 3;
  const internshipsScore = Math.min(cv.internships || 0, 2) / 2;
  const githubScore = cv.github ? 1 : 0;
  
  const keywords = (cv.keywords || "").split(',').map(k => k.trim().toLowerCase());
  const matchedKeywords = keywords.filter(k => keywordDict.includes(k)).length;
  const keywordsScore = Math.min(matchedKeywords, 6) / 6;

  const score = 0.35 * projectsScore + 0.25 * internshipsScore + 0.20 * githubScore + 0.20 * keywordsScore;
  return Math.max(0, Math.min(1, score));
};

const calculateProblemSolving = (candidate: Candidate, testStructure: TestStructure[]): number => {
  const sectionScoresNormalized = testStructure.map(s => (candidate[s.section_id.toLowerCase()] ?? 0) / 100);
  const balanceScore = 1 - stddev(sectionScoresNormalized);
  const persistenceScore = 1 - (Math.min(candidate.attempts || 1, 8) / 8); 
  
  const score = 0.6 * balanceScore + 0.4 * persistenceScore;
  return Math.max(0, Math.min(1, score));
};

const calculateEfficiencyConsistency = (
  candidate: Candidate,
  allCandidates: Candidate[],
  testStructure: TestStructure[],
): number => {
  const allTimes = allCandidates.map(c => c.total_time_sec).filter(t => t > 0).sort((a, b) => a - b);
  const candidateTime = candidate.total_time_sec;
  let speedScore = 0.5; // Default score if no time data
  if (allTimes.length > 0 && candidateTime > 0) {
      const rank = allTimes.indexOf(candidateTime) + 1;
      const percentile = rank / allTimes.length;
      speedScore = 1 - percentile;
  }

  const sectionScoresNormalized = testStructure.map(s => (candidate[s.section_id.toLowerCase()] ?? 0) / 100);
  const consistencyScore = 1 - stddev(sectionScoresNormalized);

  const score = 0.6 * speedScore + 0.4 * consistencyScore;
  return Math.max(0, Math.min(1, score));
};

const calculateIntegrityRisk = (candidate: Candidate): number => {
  const plagiarismPenalty = candidate.plagiarism_score || 0;
  const proctorPenalty = Math.min(candidate.proctoring_flags || 0, 5) / 5;
  
  const risk = 0.7 * plagiarismPenalty + 0.3 * proctorPenalty;
  return 1 - Math.max(0, Math.min(1, risk)); // Invert risk to get score
};

const calculateFinalScore = (scores: Omit<CandidateScores, 'final_score'|'name'|'candidate_id'>, rubric: Rubric): number => {
  const weights = rubric.rubric_weights;
  const final =
    scores.skill_alignment * weights.skill_alignment +
    scores.knowledge_evidence * weights.knowledge_evidence +
    scores.problem_solving * weights.problem_solving +
    scores.efficiency_consistency * weights.efficiency_consistency +
    scores.integrity_risk * weights.integrity_risk;
  return Math.max(0, Math.min(1, final));
};

const rankAndPercentile = (candidatesScores: CandidateScores[]): Omit<RankedCandidate, 'recommendation' | 'key_strengths' | 'key_risks' | 'raw_candidate_data' | 'raw_cv_data'>[] => {
    
    const sortedCandidates = [...candidatesScores].sort((a, b) => {
        // Primary sort: final_score DESC
        if (b.final_score !== a.final_score) return b.final_score - a.final_score;
        // Tie-breaker 1: integrity_risk DESC (higher is better)
        if (b.integrity_risk !== a.integrity_risk) return b.integrity_risk - a.integrity_risk;
        // Tie-breaker 2: candidate_id ASC for stability
        return a.candidate_id.localeCompare(b.candidate_id);
    });

    const N = sortedCandidates.length;
    if (N === 0) return [];

    return sortedCandidates.map((candidate, index) => {
        const rank = index + 1;
        // Percentile formula: (N - rank + 1) / N * 100
        const UPS_percentile = (N - rank + 1) / N * 100;
        return {
            ...candidate,
            rank,
            UPS_percentile,
        };
    });
};

const addRecommendations = (rankedCandidates: Omit<RankedCandidate, 'recommendation' | 'key_strengths' | 'key_risks' | 'raw_candidate_data' | 'raw_cv_data'>[], rubric: Rubric): Omit<RankedCandidate, 'key_strengths'| 'key_risks' | 'raw_candidate_data' | 'raw_cv_data'>[] => {
    return rankedCandidates.map(c => {
        let recommendation: 'Strong Hire' | 'Conditional' | 'Not Recommended' = 'Not Recommended';
        if (c.UPS_percentile >= rubric.thresholds.strong_hire_percentile_min && c.integrity_risk >= (1 - rubric.thresholds.red_flag_integrity_max)) {
            recommendation = 'Strong Hire';
        } else if (c.UPS_percentile >= rubric.thresholds.conditional_percentile_min && c.integrity_risk >= (1 - rubric.thresholds.red_flag_integrity_max)) {
            recommendation = 'Conditional';
        }
        return { ...c, recommendation };
    });
}


// --- MAIN PIPELINE ---

export async function processCandidateData(
  jdYaml: string,
  rubric: Rubric,
  structureCsv: string,
  candidatesCsv: string,
  cvCsv: string | null,
  getAIInsightsAction: typeof getAIInsights
): Promise<FullReport> {
  // 1. Parse Inputs
  const jdSettings = parseYaml<JDSettings>(jdYaml);
  const testStructure = parseCsv<TestStructure>(structureCsv);
  const rawCandidates = parseCsv<any>(candidatesCsv);
  const cvSignals = cvCsv ? parseCsv<CvSignal>(cvCsv) : null;
  
  if (!rawCandidates.length) {
    throw new Error('Candidate CSV file is empty or could not be parsed.');
  }
  
  const candidates: Candidate[] = rawCandidates.map((rc, index) => ({
      ...rc,
      candidate_id: rc.candidate_id || `CAND${String(index + 1).padStart(3, '0')}`,
      name: rc.name,
      total_time_sec: parseTimeTaken(rc.time_taken),
  }));

  // 2. Score each candidate
  const candidateScores: CandidateScores[] = candidates.map(c => {
    const cv = cvSignals?.find(cv => cv.candidate_id === c.candidate_id);
    const scores = {
      skill_alignment: calculateSkillAlignment(c, testStructure, jdSettings),
      knowledge_evidence: calculateKnowledgeEvidence(cv),
      problem_solving: calculateProblemSolving(c, testStructure),
      efficiency_consistency: calculateEfficiencyConsistency(c, candidates, testStructure),
      integrity_risk: calculateIntegrityRisk(c),
    };
    return {
      candidate_id: c.candidate_id,
      name: c.name,
      ...scores,
      final_score: calculateFinalScore(scores, rubric),
    };
  });


  // 4. Rank and get Percentile
  const ranked = rankAndPercentile(candidateScores);
  const withRecs = addRecommendations(ranked, rubric);
  
  // 5. Generate AI Insights
  const insightsPromises = withRecs.map(c => {
    const testResults: Record<string, number> = {};
    const rawCandidate = candidates.find(rc => rc.candidate_id === c.candidate_id)!;
    testStructure.forEach(ts => {
        testResults[ts.section_id] = rawCandidate[ts.section_id.toLowerCase()] ?? 0;
    });

    const cvData = cvSignals?.find(cv => cv.candidate_id === c.candidate_id);
    const cvSignalsForAI = cvData ? {
        projects: cvData.projects,
        internships: cvData.internships,
        github: cvData.github,
        keywords: cvData.keywords
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
