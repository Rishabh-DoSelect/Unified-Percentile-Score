import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Code } from 'lucide-react';

const samples = {
    jd: `role: "Data Scientist"
skill_weights:
  python: 0.3
  sql: 0.25
  statistics: 0.2
  ml_theory: 0.15
  communication: 0.1`,
    rubric: `rubric_weights:
  skill_alignment: 0.4
  knowledge_evidence: 0.15
  problem_solving: 0.2
  efficiency_consistency: 0.15
  integrity_risk: 0.1
thresholds:
  strong_hire_percentile_min: 85
  conditional_percentile_min: 60
  red_flag_integrity_max: 0.8`,
    structure: `section_id,section_name,skill,weight_in_section
S1,Python Basics,python,0.4
S2,SQL Queries,sql,1
S3,Probability,statistics,0.5
S4,ML Concepts,ml_theory,1
S5,Advanced Python,python,0.6
S6,Case Study,statistics,0.5`,
    candidates: `candidate_id,name,total_time_sec,attempts,plagiarism_score,proctoring_flags,S1,S2,S3,S4,S5,S6
CAND001,Alice,1800,1,0.05,0,85,90,75,88,92,80
CAND002,Bob,2200,2,0.1,1,70,80,85,75,65,72`,
    cv: `candidate_id,projects,internships,github,keywords
CAND001,4,2,1,"python,pandas,scikit-learn,ml"
CAND002,2,1,0,"sql,django,python"`,
};


export function SampleData() {
  return (
    <Card>
        <CardHeader>
            <CardTitle className='text-xl flex items-center gap-2'><Code /> Sample File Formats</CardTitle>
            <CardDescription>Expand the sections below to see examples of the expected data formats for each file type.</CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>JD Skill Weights (YAML)</AccordionTrigger>
                    <AccordionContent>
                        <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto"><code>{samples.jd}</code></pre>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger>Rubric Weights (YAML)</AccordionTrigger>
                    <AccordionContent>
                        <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto"><code>{samples.rubric}</code></pre>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                    <AccordionTrigger>Test Structure (CSV)</AccordionTrigger>
                    <AccordionContent>
                        <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto"><code>{samples.structure}</code></pre>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                    <AccordionTrigger>Candidate Results (CSV)</AccordionTrigger>
                    <AccordionContent>
                        <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto"><code>{samples.candidates}</code></pre>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                    <AccordionTrigger>CV Signals (CSV)</AccordionTrigger>
                    <AccordionContent>
                        <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto"><code>{samples.cv}</code></pre>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
    </Card>
  );
}
