
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import JSZip from 'jszip';
import { Code, Download, FileArchive } from 'lucide-react';

const samples = {
    jd: {
        name: 'jd.yaml',
        content: `role: "Data Scientist"
skill_weights:
  python: 0.3
  sql: 0.25
  statistics: 0.2
  ml_theory: 0.15
  communication: 0.1`,
    },
    structure: {
        name: 'structure.csv',
        content: `section_id,section_name,skill,weight_in_section
S1,Python Basics,python,0.4
S2,SQL Queries,sql,1
S3,Probability,statistics,0.5
S4,ML Concepts,ml_theory,1
S5,Advanced Python,python,0.6
S6,Case Study,statistics,0.5`,
    },
    candidates: {
        name: 'candidates.csv',
        content: `candidate_id,name,time_taken,attempts,plagiarism_score,proctoring_flags,resume,S1,S2,S3,S4,S5,S6
CAND001,Alice,"30m 0s",1,0.05,0,https://example.com/alice_resume.txt,85,90,75,88,92,80
CAND002,Bob,"36m 40s",2,0.1,1,https://example.com/bob_resume.txt,70,80,85,75,65,72`,
    },
};

const handleDownload = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const handleDownloadAll = async () => {
    const zip = new JSZip();
    for (const key in samples) {
        const file = samples[key as keyof typeof samples];
        zip.file(file.name, file.content);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ats-analyzer-samples.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const SampleItem = ({ title, file }: { title: string; file: { name: string; content: string } }) => (
    <AccordionItem value={title}>
        <AccordionTrigger>{title}</AccordionTrigger>
        <AccordionContent>
            <div className="flex justify-end mb-2">
                <Button variant="ghost" size="sm" onClick={() => handleDownload(file.content, file.name)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download {file.name}
                </Button>
            </div>
            <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto">
                <code>{file.content}</code>
            </pre>
        </AccordionContent>
    </AccordionItem>
);


export function SampleData() {
  return (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className='text-xl flex items-center gap-2'><Code /> Sample File Formats</CardTitle>
                    <CardDescription>Expand the sections below to see examples of the expected data formats for each file type.</CardDescription>
                </div>
                <Button onClick={handleDownloadAll}>
                    <FileArchive className='mr-2 h-4 w-4' />
                    Download Samples as .ZIP
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full">
                <SampleItem title="JD Skill Weights (YAML)" file={samples.jd} />
                <SampleItem title="Test Structure (CSV)" file={samples.structure} />
                <SampleItem title="Candidate Results (CSV)" file={samples.candidates} />
            </Accordion>
        </CardContent>
    </Card>
  );
}
