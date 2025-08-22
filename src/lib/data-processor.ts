
'use client';

import yaml from 'js-yaml';
import Papa from 'papaparse';
import type { getAIInsights, getCvSignals } from '@/app/actions';
import type { GenerateCandidateInsightsInput } from '@/ai/flows/generate-candidate-insights';
import type { ParseCvOutput } from '@/ai/flows/parse-cv-flow';
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
  }
  return result.data;
};

// --- SCORING RULES ---

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
  
  const matchedKeywords = (cv.keywords || []).filter(k => keywordDict.includes(k.toLowerCase())).length;
  const keywordsScore = Math.min(matchedKeywords, 6) / 6;

  const score = 0.35 * projectsScore + 0.25 * internshipsScore + 0.20 * githubScore + 0.20 * keywordsScore;
  return Math.max(0, Math.min(1, score));
};

const calculateProblemSolving = (candidate: Candidate, testStructure: TestStructure[]): number => {
  const sectionIds = Object.keys(candidate).filter(key => key.startsWith('s') && !isNaN(parseInt(key.substring(1))));
  if (sectionIds.length === 0) return 0.5;
  const sectionScoresNormalized = sectionIds.map(id => (candidate[id] ?? 0) / 100);
  const balanceScore = 1 - stddev(sectionScoresNormalized);
  const persistenceScore = 1 - (Math.min(candidate.attempts || 1, 8) / 8); 
  
  const score = 0.6 * balanceScore + 0.4 * persistenceScore;
  return Math.max(0, Math.min(1, score));
};

const calculateEfficiencyConsistency = (
  candidate: Candidate,
  allCandidates: Candidate[],
): number => {
  const allTimes = allCandidates.map(c => c.total_time_sec).filter(t => t > 0).sort((a, b) => a - b);
  const candidateTime = candidate.total_time_sec;
  let speedScore = 0.5; // Default score if no time data
  if (allTimes.length > 0 && candidateTime > 0) {
      const rank = allTimes.indexOf(candidateTime) + 1;
      const percentile = rank / allTimes.length;
      speedScore = 1 - percentile;
  }

  const sectionIds = Object.keys(candidate).filter(key => key.startsWith('s') && !isNaN(parseInt(key.substring(1))));
  const sectionScoresNormalized = sectionIds.map(id => (candidate[id] ?? 0) / 100);
  const consistencyScore = 1 - stddev(sectionScoresNormalized);

  const score = 0.6 * speedScore + 0.4 * consistencyScore;
  return Math.max(0, Math.min(1, score));
};

const calculateIntegrityRisk = (candidate: Candidate): number => {
  const plagiarismPenalty = candidate.plagiarism_score || 0;
  let proctorPenalty = 0.1; // Default low penalty
  
  switch (candidate.proctoring_verdict) {
      case 'Severe Violations':
          proctorPenalty = 1.0;
          break;
      case 'Minor Violations':
          proctorPenalty = 0.5;
          break;
      case 'Negligible':
          proctorPenalty = 0.1;
          break;
  }
  
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

const rankAndPercentile = (candidatesScores: CandidateScores[], allCandidates: Candidate[]): Omit<RankedCandidate, 'recommendation' | 'key_strengths' | 'key_risks' | 'raw_candidate_data' | 'raw_cv_data'>[] => {
    
    const sortedCandidates = [...candidatesScores].sort((a, b) => {
        const aTime = allCandidates.find(c => c.candidate_id === a.candidate_id)?.total_time_sec ?? Infinity;
        const bTime = allCandidates.find(c => c.candidate_id === b.candidate_id)?.total_time_sec ?? Infinity;

        // Primary sort: final_score DESC
        if (b.final_score !== a.final_score) return b.final_score - a.final_score;
        // Tie-breaker 1: integrity_risk DESC (higher is better)
        if (b.integrity_risk !== a.integrity_risk) return b.integrity_risk - a.integrity_risk;
        // Tie-breaker 2: total_time_sec ASC (lower is better)
        if (aTime !== bTime) return aTime - bTime;
        // Tie-breaker 3: candidate_id ASC for stability
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

const generateFallbackInsights = (candidate: Omit<RankedCandidate, 'key_strengths'|'key_risks'|'raw_candidate_data'|'raw_cv_data'>): { key_strengths: string; key_risks: string } => {
    const strengths = [];
    const risks = [];

    if (candidate.skill_alignment > 0.75) {
        strengths.push('Excellent alignment with required job skills based on test performance.');
    }
    if (candidate.knowledge_evidence > 0.75) {
        strengths.push('Strong evidence of practical knowledge from projects and experience.');
    }
    if (candidate.problem_solving > 0.7) {
        strengths.push('Good problem-solving and persistence demonstrated in test attempts.');
    }

    if (candidate.skill_alignment < 0.5) {
        risks.push('Potential gap in required job skills based on test performance.');
    }
    if (candidate.knowledge_evidence < 0.5) {
        risks.push('Limited evidence of practical application or prior experience from CV.');
    }
    if (candidate.integrity_risk < 0.8) {
        risks.push('Possible integrity concerns due to plagiarism or proctoring flags.');
    }

    return {
        key_strengths: strengths.length > 0 ? strengths.join(' ') : 'No specific strengths automatically identified. Requires manual review.',
        key_risks: risks.length > 0 ? risks.join(' ') : 'No specific risks automatically identified. Requires manual review.',
    };
};


// --- MAIN PIPELINE ---

export async function processCandidateData(
  jdYaml: string,
  rubric: Rubric,
  structureCsv: string,
  candidatesCsv: string,
  actions: {
    getAIInsights: typeof getAIInsights;
    getCvSignals: typeof getCvSignals;
  }
): Promise<FullReport> {
  // 1. Parse Inputs
  const jdSettings = parseYaml<JDSettings>(jdYaml);
  const testStructure = parseCsv<TestStructure>(structureCsv);
  const rawCandidates = parseCsv<any>(candidatesCsv);
  
  if (!rawCandidates.length) {
    throw new Error('Candidate CSV file is empty or could not be parsed.');
  }
  
  const candidates: Candidate[] = rawCandidates.map((rc, index) => ({
      ...rc,
      candidate_id: rc.candidate_id || `CAND${String(index + 1).padStart(3, '0')}`,
      name: rc.name,
      total_time_sec: parseTimeTaken(rc.time_taken),
  }));

  // 2. Parse CVs from text column
  const cvSignalsPromises = candidates.map(async (c) => {
    if (c.resume && typeof c.resume === 'string' && c.resume.trim().length > 0) {
        const resumeText = c.resume;
        try {
            const signals = await actions.getCvSignals({ resumeText });
            return { candidate_id: c.candidate_id, ...signals };
        } catch (aiError) {
            console.error(`AI CV parsing failed for ${c.candidate_id}:`, aiError);
             // Fallback to default if AI parsing fails
            return { candidate_id: c.candidate_id, projects: 0, internships: 0, github: false, keywords: [] };
        }
    }
    // Return default signals if no resume text
    return { candidate_id: c.candidate_id, projects: 0, internships: 0, github: false, keywords: [] };
  });

  const cvSignals = (await Promise.all(cvSignalsPromises)) as CvSignal[];

  // 3. Score each candidate
  const candidateScores: CandidateScores[] = candidates.map(c => {
    const cv = cvSignals?.find(cv => cv.candidate_id === c.candidate_id);
    const scores = {
      skill_alignment: calculateSkillAlignment(c, testStructure, jdSettings),
      knowledge_evidence: calculateKnowledgeEvidence(cv),
      problem_solving: calculateProblemSolving(c, testStructure),
      efficiency_consistency: calculateEfficiencyConsistency(c, candidates),
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
  const ranked = rankAndPercentile(candidateScores, candidates);
  const withRecs = addRecommendations(ranked, rubric);
  
  // 5. Generate AI Insights for candidate summary
  const insightsPromises = withRecs.map(async (c) => {
    const rawCandidate = candidates.find(rc => rc.candidate_id === c.candidate_id)!;
    const cvData = cvSignals?.find(cv => cv.candidate_id === c.candidate_id);

    try {
      // Only call AI if there is a resume to analyze
      if (rawCandidate.resume && rawCandidate.resume.trim().length > 0) {
        const testResults: Record<string, number> = {};
        testStructure.forEach(ts => {
          testResults[ts.section_id] = rawCandidate[ts.section_id.toLowerCase()] ?? 0;
        });

        const cvSignalsForAI = cvData ? {
            projects: cvData.projects,
            internships: cvData.internships,
            github: cvData.github,
            keywords: cvData.keywords.join(', ')
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
        const insights = await actions.getAIInsights(aiInput);
        // Fallback for empty AI results
        if (!insights.keyStrengths && !insights.keyRisks) {
          const fallback = generateFallbackInsights(c);
          return { key_strengths: fallback.key_strengths, key_risks: fallback.key_risks };
        }
        return { key_strengths: insights.keyStrengths, key_risks: insights.keyRisks };
      }
      // If no resume, generate fallback immediately.
      return generateFallbackInsights(c);
    } catch (error) {
      console.error(`Error generating AI insights for ${c.candidate_id}:`, error);
      // If the AI call fails for any reason, generate fallback insights.
      return generateFallbackInsights(c);
    }
  });


  const aiResults = await Promise.all(insightsPromises);

  const finalRankedCandidates: RankedCandidate[] = withRecs.map((c, i) => {
      return {
          ...c,
          ...aiResults[i],
          raw_candidate_data: candidates.find(rc => rc.candidate_id === c.candidate_id)!,
          raw_cv_data: cvSignals?.find(cv => cv.candidate_id === c.candidate_id)
      }
  });


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
