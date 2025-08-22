'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dashboard } from '@/components/dashboard';
import type { FullReport } from '@/lib/types';
import { processCandidateData } from '@/lib/data-processor';
import { getAIInsights } from '@/app/actions';
import { FileCheck2, FileText, Loader2, Upload } from 'lucide-react';
import { Header } from '@/components/header';

interface FileState {
  jd: string | null;
  rubric: string | null;
  structure: string | null;
  candidates: string | null;
  cv: string | null;
}

interface FileNameState {
  jd: string;
  rubric: string;
  structure: string;
  candidates: string;
  cv: string;
}

export default function Analyzer() {
  const [fileContents, setFileContents] = useState<FileState>({
    jd: null,
    rubric: null,
    structure: null,
    candidates: null,
    cv: null,
  });
  const [fileNames, setFileNames] = useState<FileNameState>({
    jd: '',
    rubric: '',
    structure: '',
    candidates: '',
    cv: '',
  });

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

  const allRequiredFilesUploaded = fileContents.jd && fileContents.rubric && fileContents.structure && fileContents.candidates;

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

    try {
      const fullReport = await processCandidateData(
        fileContents.jd!,
        fileContents.rubric!,
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

  return (
    <div className="min-h-screen bg-secondary/50">
        <Header />
        <main>
            {!report ? (
                <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 max-w-4xl">
                    <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center gap-2"><FileText /> Upload Your Data</CardTitle>
                        <CardDescription>
                        Provide configuration and candidate data files to generate your AI-powered report.
                        Required fields are marked with an asterisk (*).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <FileInput id="jd" label="JD Skill Weights" description="YAML file with role and skill weights." fileName={fileNames.jd}/>
                            <FileInput id="rubric" label="Rubric Weights" description="YAML file defining scoring rubric and thresholds." fileName={fileNames.rubric} />
                            <FileInput id="structure" label="Test Structure" description="CSV mapping test sections to skills." fileName={fileNames.structure} />
                            <FileInput id="candidates" label="Candidate Results" description="CSV with candidate test scores and signals." fileName={fileNames.candidates} />
                        </div>
                        <FileInput id="cv" label="CV Signals (Optional)" description="Optional CSV with candidate CV data." isOptional fileName={fileNames.cv} />
                        
                        <Button onClick={handleGenerateReport} disabled={!allRequiredFilesUploaded || isLoading} className="w-full text-lg py-6">
                        {isLoading ? (
                            <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Generating Report...
                            </>
                        ) : (
                            'Generate Report'
                        )}
                        </Button>
                    </CardContent>
                    </Card>
                </div>
            ) : (
                <Dashboard report={report} />
            )}
        </main>
    </div>
  );
}
