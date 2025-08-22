
export interface JDSettings {
  role: string;
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
}

export interface Candidate {
  candidate_id: string;
  name: string;
  total_time_sec: number;
  attempts: number;
  plagiarism_score: number;
  proctoring_flags: number;
  proctoring_verdict?: 'Negligible' | 'Minor Violations' | 'Severe Violations';
  resume?: string; // Optional URL to the candidate's resume
  [key: string]: any; // for section scores like S1, S2, etc. and other raw columns
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
