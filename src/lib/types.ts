
import type { GenerateJdWeightsInput } from "@/ai/flows/generate-jd-weights-flow";

export interface JDSettings extends GenerateJdWeightsInput {
  skill_weights: Record<string, number>;
}

export interface Rubric {
  rubric_weights: {
    skill_alignment: number;
    knowledge_evidence: number;
    problem_solving: number;
    efficiency_consistency: number;
    integrity_risk: number;
  };
  thresholds: {
    strong_hire_percentile_min: number;
    conditional_percentile_min: number;
    red_flag_integrity_max: number;
  };
}

export interface TestStructure {
  section_id: string;
  section_name: string;
  skill: string;
  weight_in_section: number;
  // Added from test structure generation
  problem_score: number;
  correct_answer?: any;
}

export interface Candidate {
  candidate_id: string;
  name: string;
  email: string;
  total_time_sec: number;
  attempts: number;
  proctoring_verdict?: 'Negligible' | 'Minor Violations' | 'Severe Violations' | string;
  resume?: string; // This may be deprecated if not in the new format
  [key: string]: any; // for section scores like s1, s2, etc. and other raw columns
}

export interface CvSignal {
  candidate_id: string;
  projects: number;
  internships: number;
  github: boolean;
  keywords: string[];
}

export interface CandidateScores {
  candidate_id: string;
  name: string;
  skill_alignment: number;
  knowledge_evidence: number;
  problem_solving: number;
  efficiency_consistency: number;
  integrity_risk: number;
  final_score: number;
}

export interface RankedCandidate extends CandidateScores {
  rank: number;
  UPS_percentile: number;
  recommendation: 'Strong Hire' | 'Conditional' | 'Not Recommended';
  key_strengths: string;
  key_risks: string;
  // include raw data for detailed view
  raw_candidate_data: Candidate;
  raw_cv_data?: CvSignal;
}

export interface FullReport {
  generated_at: string;
  role: string;
  totals: {
    candidates: number;
    strong_hires: number;
    conditionals: number;
  };
  executive_summary: RankedCandidate[];
}

export interface QaCheck {
  candidate_id: string | 'GLOBAL';
  check: string;
  status: 'pass' | 'fail' | 'warn';
  details: string;
}

// New types for the raw platform data format
export interface PlatformData {
    proctor_verdict: 'Negligible' | 'Minor Violations' | 'Severe Violations' | string;
    code?: string;
    plagiarism?: any;
    problem_name: string;
    full_name: string;
    run_details?: {
      status: string;
      testcases_total: number;
      solution_id: number;
      sid: string;
      testcases_failed: number;
      evaluation_status: string;
      assessment_id: number;
      testcases_passed: number;
      queue: string;
      testcases: Record<string, any>;
      score: number;
      evaluation_started: string;
      evaluation_ended: string;
      tid: string;
      assessment_type: string;
      running_time: string;
    };
    jupyter_data?: any;
    mcq_choice?: string[];
    email: string;
}
