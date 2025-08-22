
'use client';

import { useState, type ChangeEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dashboard } from '@/components/dashboard';
import type { FullReport, JDSettings, Rubric, TestStructure } from '@/lib/types';
import { parseCsv, processCandidateData } from '@/lib/data-processor';
import { generateJdFromText, getAIInsights, getCvSignals, generateTestStructureFromJSON } from '@/app/actions';
import { FileCheck2, FileText, Loader2, Upload, SlidersHorizontal, Wand2, Download } from 'lucide-react';
import { Header } from '@/components/header';
import { SampleData } from '@/components/sample-data';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';


interface FileState {
  jd: string | null;
  structure: string | null;
  candidates: string | null;
}

interface FileNameState {
  jd: string;
  structure: string;
  problems: string;
  candidates: string;
}

const initialWeights = {
  skill_alignment: 40,
  knowledge_evidence: 20,
  problem_solving: 20,
  efficiency_consistency: 10,
  integrity_risk: 10,
};

export default function Analyzer() {
  const [fileContents, setFileContents] = useState<FileState>({
    jd: null,
    structure: null,
    candidates: null,
  });
  const [fileNames, setFileNames] = useState<FileNameState>({
    jd: '',
    structure: '',
    problems: '',
    candidates: '',
  });

  const [jdText, setJdText] = useState('');
  const [role, setRole] = useState('');
  const [isGeneratingJd, setIsGeneratingJd] = useState(false);

  const [problemsJson, setProblemsJson] = useState('');
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);

  const [rubricWeights, setRubricWeights] = useState(initialWeights);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<FullReport | null>(null);
  const { toast } = useToast();
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, fileType: 'problems' | 'candidates') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (fileType === 'problems') {
        setProblemsJson(content);
        setFileNames(prev => ({...prev, problems: file.name}));
      } else {
        setFileContents(prev => ({...prev, candidates: content}));
        setFileNames(prev => ({...prev, candidates: file.name}));
      }
    };
    reader.readAsText(file);
  };


  const handleGenerateJd = async () => {
    if (!fileContents.structure) {
        toast({ variant: 'destructive', title: 'Missing Test Structure', description: 'Please upload or generate the test structure CSV first to extract skills.' });
        return;
    }
    if (!jdText.trim()) {
        toast({ variant: 'destructive', title: 'Missing Job Description', description: 'Please paste the job description text.' });
        return;
    }
    if (!role.trim()) {
        toast({ variant: 'destructive', title: 'Missing Role', description: 'Please enter the role title.' });
        return;
    }

    setIsGeneratingJd(true);
    try {
        const testStructure = parseCsv<TestStructure>(fileContents.structure);
        if (!testStructure || testStructure.length === 0) {
            throw new Error("Test structure is empty or invalid.");
        }
        const skills = [...new Set(testStructure.map(s => s.skill))];
        
        const generatedYaml = await generateJdFromText({
          jobDescription: jdText,
          skills,
          role,
        });
        
        setFileContents(prev => ({...prev, jd: generatedYaml}));
        setFileNames(prev => ({...prev, jd: 'jd-generated.yaml'}));
        toast({ title: 'Success!', description: 'JD Skill Weights have been generated and loaded.' });
    } catch (error) {
        console.error('Error generating JD:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast({ variant: 'destructive', title: 'Generation Failed', description: `Could not generate JD weights. ${errorMessage}` });
    } finally {
        setIsGeneratingJd(false);
    }
  }

  const handleGenerateStructure = async () => {
    if (!problemsJson.trim()) {
      toast({ variant: 'destructive', title: 'Missing Problems JSON', description: 'Please paste the JSON data for the problems.' });
      return;
    }
    setIsGeneratingStructure(true);
    try {
      const generatedCsv = await generateTestStructureFromJSON({ problemsJson });
      setFileContents(prev => ({ ...prev, structure: generatedCsv }));
      setFileNames(prev => ({ ...prev, structure: 'structure-generated.csv' }));
      toast({ title: 'Success!', description: 'Test Structure CSV has been generated and loaded.' });
    } catch (error) {
      console.error('Error generating test structure:', error);
      toast({ variant: 'destructive', title: 'Generation Failed', description: 'Could not generate Test Structure from the provided JSON.' });
    } finally {
      setIsGeneratingStructure(false);
    }
  };

  const handleDownload = (content: string, fileName: string, type: 'text/yaml' | 'text/csv' = 'text/yaml') => {
    if (!content) {
        toast({ variant: 'destructive', title: 'No Content', description: 'There is no generated content to download.' });
        return;
    }
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

  const handleWeightChange = (category: keyof typeof rubricWeights, value: number) => {
    const otherCategoriesTotal = Object.entries(rubricWeights)
      .filter(([key]) => key !== category)
      .reduce((sum, [, val]) => sum + val, 0);

    const newWeights = { ...rubricWeights, [category]: value };

    if (otherCategoriesTotal + value > 100) {
      const overflow = (otherCategoriesTotal + value) - 100;
      let remainingTotal = otherCategoriesTotal;
      
      for (const key in newWeights) {
        if (key !== category) {
          if (remainingTotal > 0) {
            const proportion = rubricWeights[key as keyof typeof rubricWeights] / remainingTotal;
            newWeights[key as keyof typeof rubricWeights] -= Math.round(overflow * proportion);
          }
        }
      }
    }
    
    // Final check to ensure total is exactly 100
    const finalTotal = Object.values(newWeights).reduce((sum, val) => sum + val, 0);
    if (finalTotal !== 100) {
      const diff = 100 - finalTotal;
      const primaryCat = category as keyof typeof rubricWeights;
      if(newWeights[primaryCat] + diff >= 0 && newWeights[primaryCat] + diff <= 100){
          newWeights[primaryCat] += diff;
      }
    }

    setRubricWeights(newWeights);
  };
  
  const allRequiredFilesUploaded = fileContents.jd && fileContents.structure && fileContents.candidates;

  const handleGenerateReport = async () => {
    if (!allRequiredFilesUploaded) {
      toast({
        variant: 'destructive',
        title: 'Missing Files or Data',
        description: 'Please generate or upload all required files and provide candidate data.',
      });
      return;
    }

    setIsLoading(true);
    setReport(null);

    const rubric: Rubric = {
      rubric_weights: {
        skill_alignment: rubricWeights.skill_alignment / 100,
        knowledge_evidence: rubricWeights.knowledge_evidence / 100,
        problem_solving: rubricWeights.problem_solving / 100,
        efficiency_consistency: rubricWeights.efficiency_consistency / 100,
        integrity_risk: rubricWeights.integrity_risk / 100,
      },
      thresholds: {
        strong_hire_percentile_min: 85,
        conditional_percentile_min: 60,
        red_flag_integrity_max: 0.8
      }
    };

    try {
      const fullReport = await processCandidateData(
        fileContents.jd!,
        rubric,
        fileContents.structure!,
        fileContents.candidates!,
        { getAIInsights, getCvSignals }
      );
      setReport(fullReport);
      toast({
        title: 'Success!',
        description: 'Your candidate report has been generated.',
      });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Processing Error',
        description: `Failed to generate report: ${errorMessage}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewReport = () => {
    setReport(null);
    setFileContents({ jd: null, structure: null, candidates: null });
    setFileNames({ jd: '', structure: '', problems: '', candidates: ''});
    setJdText('');
    setRole('');
    setProblemsJson('');
    setRubricWeights(initialWeights);
  }
  
  const FileInput = ({ id, label, onFileChange, fileName }: { id: string, label: string, onFileChange: (e: ChangeEvent<HTMLInputElement>) => void, fileName: string }) => (
    <div>
        <Label htmlFor={id} className="cursor-pointer inline-block w-full">
            <div className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg hover:bg-muted transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> {label}</p>
                    <p className="text-xs text-muted-foreground">JSON file</p>
                </div>
            </div>
        </Label>
        <Input id={id} type="file" className="hidden" accept=".json,application/json" onChange={onFileChange} />
        {fileName && (
            <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-green-600" />
                <span>{fileName}</span>
            </div>
        )}
    </div>
  );

  const RubricSlider = ({ label, category }: { label: string; category: keyof typeof rubricWeights; }) => (
    <div className='space-y-2'>
        <div className='flex justify-between items-center'>
            <Label htmlFor={category}>{label}</Label>
            <span className='text-sm font-medium text-primary'>{rubricWeights[category]}%</span>
        </div>
        <Slider
            id={category}
            value={[rubricWeights[category]]}
            onValueChange={([value]) => handleWeightChange(category, value)}
            max={100}
            step={1}
        />
    </div>
  )

  const totalWeight = Object.values(rubricWeights).reduce((sum, value) => sum + value, 0);

  if (report) {
    return <Dashboard report={report} onNewReport={handleNewReport} />
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-secondary/50">
          <Header />
          <main>
              <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 max-w-4xl">
                  <Dialog>
                    <Card className="shadow-lg">
                      <CardHeader className="flex flex-row items-start justify-between">
                          <div>
                            <CardTitle className="text-2xl flex items-center gap-2"><FileText /> Upload Your Data</CardTitle>
                            <CardDescription>
                            Provide JD, test structure, and candidate data. Required fields are marked with an asterisk (*).
                            </CardDescription>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <SlidersHorizontal className='h-5 w-5' />
                                  </Button>
                              </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Customize Rubric</p>
                            </TooltipContent>
                          </Tooltip>
                      </CardHeader>
                      <CardContent className="space-y-8">
                          {/* JD Generation */}
                          <div className="space-y-4">
                             <Label className="text-base font-semibold">Job Description <span className="text-destructive">*</span></Label>
                             <p className="text-sm text-muted-foreground">Paste the job description text below to generate skill weights.</p>
                             <div className="space-y-2">
                                <Label htmlFor="role-title">Role Title</Label>
                                <Input id="role-title" placeholder="e.g., Senior Data Scientist" value={role} onChange={(e) => setRole(e.target.value)} />
                             </div>
                             <Textarea 
                                placeholder="Paste the full job description here..." 
                                value={jdText} 
                                onChange={(e) => setJdText(e.target.value)}
                                className="min-h-[150px]"
                             />
                              <div className="flex items-center justify-between">
                                <Button onClick={handleGenerateJd} disabled={isGeneratingJd}>
                                    {isGeneratingJd ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                    Generate Skill Weights
                                </Button>
                                {fileNames.jd && (
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <FileCheck2 className="h-4 w-4 text-green-600" />
                                        <span>{fileNames.jd}</span>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(fileContents.jd!, fileNames.jd)}>
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Download Generated JD YAML</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                )}
                              </div>
                          </div>

                          {/* Test Structure Generation */}
                           <div className="space-y-4">
                             <Label className="text-base font-semibold">Test Problems Data <span className="text-destructive">*</span></Label>
                             <p className="text-sm text-muted-foreground">Upload the problems JSON from your platform to generate the test structure.</p>
                              <FileInput id="problems-file" label="or drag and drop" onFileChange={(e) => handleFileChange(e, 'problems')} fileName={fileNames.problems} />
                              <div className="flex items-center justify-between">
                                <Button onClick={handleGenerateStructure} disabled={isGeneratingStructure || !problemsJson}>
                                    {isGeneratingStructure ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                    Generate Test Structure
                                </Button>
                                {fileNames.structure && (
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <FileCheck2 className="h-4 w-4 text-green-600" />
                                        <span>{fileNames.structure}</span>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(fileContents.structure!, fileNames.structure, 'text/csv')}>
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Download Generated Structure CSV</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                )}
                              </div>
                          </div>
                          
                          {/* Candidate Data Input */}
                          <div className="space-y-4">
                             <Label className="text-base font-semibold">Candidate Results Data <span className="text-destructive">*</span></Label>
                              <p className="text-sm text-muted-foreground">Upload the raw candidate results JSON from your platform.</p>
                             <FileInput id="candidates-file" label="or drag and drop" onFileChange={(e) => handleFileChange(e, 'candidates')} fileName={fileNames.candidates} />
                          </div>
                      </CardContent>
                    </Card>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Customize Rubric Weights</DialogTitle>
                        <DialogDescription>
                          Adjust the scoring weights. The total must be 100%.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 pt-2">
                        <RubricSlider label="Skill Alignment" category="skill_alignment" />
                        <RubricSlider label="Knowledge Evidence" category="knowledge_evidence" />
                        <RubricSlider label="Problem Solving" category="problem_solving" />
                        <RubricSlider label="Efficiency & Consistency" category="efficiency_consistency" />
                        <RubricSlider label="Integrity & Risk" category="integrity_risk" />
                        <div className={`text-right font-bold ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
                            Total: {totalWeight}%
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button onClick={handleGenerateReport} disabled={!allRequiredFilesUploaded || isLoading || totalWeight !== 100} className="w-full text-lg py-6 mt-8">
                  {isLoading ? (
                      <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating Report...
                      </>
                  ) : (
                      'Generate Report'
                  )}
                  </Button>

                  <div className='mt-8'>
                      <SampleData />
                  </div>
              </div>
          </main>
      </div>
    </TooltipProvider>
  );
}

    