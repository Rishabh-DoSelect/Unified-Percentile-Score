
'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dashboard } from '@/components/dashboard';
import type { FullReport, Rubric } from '@/lib/types';
import { processCandidateData } from '@/lib/data-processor';
import { getAIInsights } from '@/app/actions';
import { FileCheck2, FileText, Loader2, Upload, SlidersHorizontal } from 'lucide-react';
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


interface FileState {
  jd: string | null;
  structure: string | null;
  candidates: string | null;
  cv: string | null;
}

interface FileNameState {
  jd: string;
  structure: string;
  candidates: string;
  cv: string;
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
    cv: null,
  });
  const [fileNames, setFileNames] = useState<FileNameState>({
    jd: '',
    structure: '',
    candidates: '',
    cv: '',
  });

  const [rubricWeights, setRubricWeights] = useState(initialWeights);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<FullReport | null>(null);
  const { toast } = useToast();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: keyof FileState) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContents(prev => ({ ...prev, [fileType]: event.target?.result as string }));
        setFileNames(prev => ({ ...prev, [fileType]: file.name }));
      };
      reader.readAsText(file);
    }
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
        title: 'Missing Files',
        description: 'Please upload all required configuration and data files.',
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
        fileContents.cv,
        getAIInsights
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
    setFileContents({ jd: null, structure: null, candidates: null, cv: null });
    setFileNames({ jd: '', structure: '', candidates: '', cv: ''});
    setRubricWeights(initialWeights);
  }

  const FileInput = ({ id, label, description, isOptional = false, fileName }: { id: keyof FileState, label: string, description: string, isOptional?: boolean, fileName: string }) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base font-semibold">{label} {!isOptional && <span className="text-destructive">*</span>}</Label>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex items-center gap-2">
        <Input id={id} type="file" onChange={(e) => handleFileChange(e, id)} accept=".yaml,.csv" className="hidden" />
        <Button asChild variant="outline">
          <Label htmlFor={id} className="cursor-pointer flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span>Choose File</span>
          </Label>
        </Button>
        {fileName && <div className="text-sm text-muted-foreground flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-green-600" /> {fileName}</div>}
      </div>
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
                          <FileInput id="jd" label="JD Skill Weights" description="YAML file with role and skill weights." fileName={fileNames.jd}/>
                          <FileInput id="structure" label="Test Structure" description="CSV mapping test sections to skills." fileName={fileNames.structure} />
                          <FileInput id="candidates" label="Candidate Results" description="CSV with candidate test scores and signals." fileName={fileNames.candidates} />
                          <FileInput id="cv" label="CV Signals (Optional)" description="Optional CSV with candidate CV data." isOptional fileName={fileNames.cv} />
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
