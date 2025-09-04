

'use client';

import yaml from 'js-yaml';
import Papa from 'papaparse';
import type { getAIInsights, getCvSignals } from '@/app/actions';
import type { GenerateCandidateInsightsInput } from '@/ai/flows/generate-candidate-insights';
import type {
  Candidate,
  CandidateScores,
  CvData,
  CvSignal,
  FullReport,
  JDSettings,
  RankedCandidate,
  Rubric,
  TestStructure,
  PlatformData,
} from '@/lib/types';

// --- UTILITY FUNCTIONS ---
const mean = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const stddev = (arr: number[]) => {
  if (arr.length < 2) return 0;
  const arrMean = mean(arr);
  const sumOfSquares = arr.map(n => (n - arrMean) ** 2).reduce((a,b) => a + b, 0);
  return Math.sqrt(sumOfSquares / (arr.length - 1));
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
    // throw new Error(`CSV parsing failed: ${result.errors.map(e => e.message).join(', ')}`);
  }
  return result.data;
};


// --- NEW DATA TRANSFORMATION ---
export const transformPlatformData = (platformData: PlatformData[], testStructure: TestStructure[]): Candidate[] => {
    const candidateMap: Map<string, Candidate> = new Map();

    const structureMap = new Map(testStructure.map(s => [s.section_id, s]));

    for (const record of platformData) {
        const email = record.email;
        if (!email) continue;

        if (!candidateMap.has(email)) {
            candidateMap.set(email, {
                candidate_id: email,
                name: record.full_name,
                email: email,
                attempts: 0, // This will be aggregated
                total_time_sec: 0, // This will be aggregated
                proctoring_verdict: 'Negligible', // Default, can be updated
            });
        }
        
        const candidate = candidateMap.get(email)!;
        
        // Aggregate attempts and time
        candidate.attempts += record.run_details?.testcases_total || 1; // Fallback to 1 attempt
        
        // Find corresponding section in test structure
        const section = structureMap.get(record.problem_slug);
        if (section) {
            let score = 0;
            if (record.run_details && typeof record.run_details.score === 'number') {
                // Coding and Project questions have a direct score
                score = record.run_details.score;
            } else if (record.mcq_choice && section.correct_answer) {
                // MCQ questions need score calculation
                const candidateChoice = Array.isArray(record.mcq_choice) ? record.mcq_choice.map(String) : [String(record.mcq_choice)];
                let correctAnswer = section.correct_answer;
                
                // If correct answer from CSV is a string, try to parse it as JSON
                if (typeof correctAnswer === 'string') {
                    try {
                        correctAnswer = JSON.parse(correctAnswer);
                    } catch (e) {
                         // It might just be a simple string representation e.g., "3" vs ["3"]
                         correctAnswer = [String(correctAnswer)];
                    }
                }
                if (!Array.isArray(correctAnswer)) {
                    correctAnswer = [String(correctAnswer)];
                } else {
                    correctAnswer = correctAnswer.map(String);
                }

                const isCorrect = JSON.stringify(candidateChoice.sort()) === JSON.stringify(correctAnswer.sort());
                score = isCorrect ? section.problem_score : 0;
            }
            
            // Assign score to the candidate object using section_id as key
            candidate[section.section_id.toLowerCase()] = score;
        }

        // Update proctoring verdict (take the most severe one)
        const verdicts = ['Negligible', 'Minor Violations', 'Severe Violations'];
        const currentVerdictIndex = verdicts.indexOf(candidate.proctoring_verdict || 'Negligible');
        const newVerdictIndex = verdicts.indexOf(record.proctor_verdict || 'Negligible');
        if (newVerdictIndex > currentVerdictIndex) {
            candidate.proctoring_verdict = record.proctor_verdict;
        }
    }

    return Array.from(candidateMap.values());
};


// --- SCORING RULES ---

export const calculateSkillAlignment = (
  candidate: Candidate,
  testStructure: TestStructure[],
  jdSettings: JDSettings
): number => {
  let totalWeightedScore = 0;
  let totalPossibleWeight = 0;

  if (!jdSettings || !jdSettings.skill_weights) {
    return 0;
  }
  
  const skillWeightsLower: Record<string, number> = {};
  for (const skill in jdSettings.skill_weights) {
      skillWeightsLower[skill.toLowerCase()] = jdSettings.skill_weights[skill];
  }

  // Group sections by skill
  const skillsToSections: Record<string, TestStructure[]> = {};
  for (const section of testStructure) {
      if (!section.skill) continue;
      const skillLower = section.skill.toLowerCase();
      if (!skillsToSections[skillLower]) {
          skillsToSections[skillLower] = [];
      }
      skillsToSections[skillLower].push(section);
  }

  for (const skill in skillWeightsLower) {
      const jdWeight = skillWeightsLower[skill];
      totalPossibleWeight += jdWeight;

      const relevantSections = skillsToSections[skill];
      if (relevantSections && relevantSections.length > 0) {
          let totalSkillScore = 0;
          let totalSkillMaxScore = 0;

          for (const section of relevantSections) {
              const candidateScore = candidate[section.section_id.toLowerCase()] ?? 0;
              const maxScore = section.problem_score || 100;
              totalSkillScore += candidateScore;
              totalSkillMaxScore += maxScore;
          }

          const normalizedSkillScore = totalSkillMaxScore > 0 ? totalSkillScore / totalSkillMaxScore : 0;
          totalWeightedScore += normalizedSkillScore * jdWeight;
      }
  }
  
  const finalScore = totalPossibleWeight > 0 ? totalWeightedScore / totalPossibleWeight : 0;
  return Math.max(0, Math.min(1, finalScore));
};


export const calculateKnowledgeEvidence = (cv: CvSignal | undefined, jdSettings: JDSettings): number => {
  if (!cv) return 0.5; // Neutral score if no CV data

  const keywordDict = Object.keys(jdSettings.skill_weights || {}).map(k => k.toLowerCase());
  const projectsScore = Math.min(cv.projects || 0, 3) / 3;
  const internshipsScore = Math.min(cv.internships || 0, 2) / 2;
  const githubScore = cv.github ? 1 : 0;
  
  const matchedKeywords = (cv.keywords || []).filter(k => keywordDict.includes(k.toLowerCase())).length;
  const keywordsScore = Math.min(matchedKeywords, 6) / 6;

  const score = 0.35 * projectsScore + 0.25 * internshipsScore + 0.20 * githubScore + 0.20 * keywordsScore;
  return Math.max(0, Math.min(1, score));
};

export const calculateProblemSolving = (candidate: Candidate, testStructure: TestStructure[]): number => {
  const sectionIds = testStructure.map(s => s.section_id.toLowerCase());
  if (sectionIds.length === 0) return 0.5;

  const sectionScoresNormalized = sectionIds
    .map(id => {
        const section = testStructure.find(s => s.section_id.toLowerCase() === id);
        if (!section) return undefined;
        const maxScore = section.problem_score || 100;
        return (candidate[id] ?? 0) / (maxScore > 0 ? maxScore : 100);
    })
    .filter(score => score !== undefined) as number[];

  if (sectionScoresNormalized.length === 0) return 0.5;

  const balanceScore = 1 - stddev(sectionScoresNormalized);
  const persistenceScore = 1 - (Math.min(candidate.attempts || 1, 8) / 8); 
  
  const score = 0.6 * balanceScore + 0.4 * persistenceScore;
  return Math.max(0, Math.min(1, score));
};

export const calculateEfficiencyConsistency = (
  candidate: Candidate,
  allCandidates: Candidate[],
  testStructure: TestStructure[]
): number => {
  const speedScore = 0.5;

  const sectionIds = testStructure.map(s => s.section_id.toLowerCase());
   const sectionScoresNormalized = sectionIds
    .map(id => {
        const section = testStructure.find(s => s.section_id.toLowerCase() === id);
        if (!section) return undefined;
        const maxScore = section.problem_score || 100;
        return (candidate[id] ?? 0) / (maxScore > 0 ? maxScore : 100);
    })
    .filter(score => score !== undefined) as number[];


  if (sectionScoresNormalized.length === 0) return 0.5;
  const consistencyScore = 1 - stddev(sectionScoresNormalized);

  const score = 0.4 * speedScore + 0.6 * consistencyScore; // Shifted weight to consistency
  return Math.max(0, Math.min(1, score));
};

export const calculateIntegrityRisk = (candidate: Candidate): number => {
  let proctorPenalty = 0.1; // Default low penalty
  
  const verdict = candidate.proctoring_verdict || '';
  switch (verdict.toLowerCase()) {
      case 'severe violations':
          proctorPenalty = 1.0;
          break;
      case 'minor violations':
          proctorPenalty = 0.5;
          break;
      case 'negligible':
          proctorPenalty = 0.1;
          break;
  }
  
  const risk = proctorPenalty;
  return 1 - Math.max(0, Math.min(1, risk)); 
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
        if (b.final_score !== a.final_score) return b.final_score - a.final_score;
        if (b.integrity_risk !== a.integrity_risk) return b.integrity_risk - a.integrity_risk;
        return a.candidate_id.localeCompare(b.candidate_id);
    });

    const N = sortedCandidates.length;
    if (N === 0) return [];

    return sortedCandidates.map((candidate, index) => {
        const rank = index + 1;
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
    if (candidate.integrity_risk < (1 - 0.8)) { // Corresponds to red_flag_integrity_max
        risks.push('Possible integrity concerns due to proctoring flags.');
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
  candidatesJson: string,
  cvsCsv: string | null, // Optional CV data
  actions: {
    getAIInsights: typeof getAIInsights;
    getCvSignals: typeof getCvSignals;
  }
): Promise<FullReport> {
  // 1. Parse Inputs
  const jdSettings = parseYaml<JDSettings>(jdYaml);
  const testStructure = parseCsv<TestStructure>(structureCsv);
  const platformData = JSON.parse(candidatesJson) as PlatformData[];
  
  if (!platformData.length) {
    throw new Error('Candidate JSON is empty or could not be parsed.');
  }

  // 2. Transform Platform Data into unified Candidate objects
  const candidates = transformPlatformData(platformData, testStructure);

  // 3. Parse optional CVs and generate signals
  let cvSignalsMap: Map<string, CvSignal> = new Map();
  if (cvsCsv) {
    const cvData = parseCsv<CvData>(cvsCsv);
    const cvSignalPromises = cvData.map(async (cv) => {
        if (!cv.email || !cv.cv_text) return null;
        const signals = await actions.getCvSignals({ resumeText: cv.cv_text });
        return {
            candidate_id: cv.email,
            ...signals
        };
    });
    const results = await Promise.all(cvSignalPromises);
    results.forEach(signal => {
        if (signal) {
            cvSignalsMap.set(signal.candidate_id, signal);
        }
    });
  }
  
  // 4. Score each candidate
  const candidateScores: CandidateScores[] = candidates.map(c => {
    const cv = cvSignalsMap.get(c.candidate_id);
    const scores = {
      skill_alignment: calculateSkillAlignment(c, testStructure, jdSettings),
      knowledge_evidence: calculateKnowledgeEvidence(cv, jdSettings),
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


  // 5. Rank and get Percentile
  const ranked = rankAndPercentile(candidateScores, candidates);
  const withRecs = addRecommendations(ranked, rubric);
  
  // 6. Generate AI Insights for candidate summary
  const insightsPromises = withRecs.map(async (c) => {
    const rawCandidate = candidates.find(rc => rc.candidate_id === c.candidate_id)!;
    const cvSignals = cvSignalsMap.get(c.candidate_id);

    try {
        const testResults: Record<string, number> = {};
        testStructure.forEach(ts => {
            if (ts && ts.section_id) {
                testResults[ts.section_id] = rawCandidate[ts.section_id.toLowerCase()] ?? 0;
            }
        });
        
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
            cvSignals,
        };
        const insights = await actions.getAIInsights(aiInput);

        if (!insights.keyStrengths && !insights.keyRisks) {
            const fallback = generateFallbackInsights(c);
            return { key_strengths: fallback.key_strengths, key_risks: fallback.key_risks };
        }
        return { key_strengths: insights.keyStrengths, key_risks: insights.keyRisks };

    } catch (error) {
      console.error(`Error generating AI insights for ${c.candidate_id}:`, error);
      return generateFallbackInsights(c);
    }
  });


  const aiResults = await Promise.all(insightsPromises);

  const finalRankedCandidates: RankedCandidate[] = withRecs.map((c, i) => {
      return {
          ...c,
          ...aiResults[i],
          raw_candidate_data: candidates.find(rc => rc.candidate_id === c.candidate_id)!,
          raw_cv_data: cvSignalsMap.get(c.candidate_id)
      }
  });


  // 7. Assemble Final Report
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

    