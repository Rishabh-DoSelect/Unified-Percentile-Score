
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Bug, FileJson, FileText, Loader2, Wand2 } from 'lucide-react';
import {
  calculateSkillAlignment,
  calculateKnowledgeEvidence,
  calculateProblemSolving,
  calculateEfficiencyConsistency,
  calculateIntegrityRisk,
  transformPlatformData,
  parseCsv,
  parseYaml,
} from '@/lib/data-processor';
import { generateJdFromText, generateTestStructureFromJSON, getCvSignals } from '@/app/actions';
import type { Candidate, CvData, CvSignal, JDSettings, TestStructure, PlatformData } from '@/lib/types';

interface GeneratedData {
  jd: string | null;
  structure: string | null;
}

interface TestResult {
  name: string;
  score: number | string;
  inputs: Record<string, any>;
}

export function Debugger() {
  const [rawFiles, setRawFiles] = useState<{ [key: string]: string | null }>({
    problems: null,
    candidates: null,
    cvs: null,
    jd: null,
  });
  const [generatedData, setGeneratedData] = useState<GeneratedData>({ jd: null, structure: null });
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSamples = async () => {
      setIsLoading(prev => ({ ...prev, samples: true }));
      try {
        const [problemsRes, candidatesRes, cvsRes, jdRes] = await Promise.all([
          fetch('/sample-data/sample-problems.json'),
          fetch('/sample-data/sample-candidates.json'),
          fetch('/sample-data/sample-cvs.csv'),
          fetch('/sample-data/sample-jd.txt'),
        ]);
        const [problems, candidates, cvs, jd] = await Promise.all([
            problemsRes.text(),
            candidatesRes.text(),
            cvsRes.text(),
            jdRes.text(),
        ]);
        setRawFiles({ problems, candidates, cvs, jd });
      } catch (error) {
        console.error('Failed to load sample data:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load sample data files.' });
      } finally {
        setIsLoading(prev => ({ ...prev, samples: false }));
      }
    };
    fetchSamples();
  }, [toast]);
  
  const handleGenerateJd = async () => {
    if (!generatedData.structure) {
        toast({ variant: 'destructive', title: 'Missing Test Structure', description: 'Please generate the test structure CSV first.' });
        return;
    }
    if (!rawFiles.jd) {
        toast({ variant: 'destructive', title: 'Missing JD Text File', description: 'Sample JD file could not be loaded.' });
        return;
    }
    setIsLoading(prev => ({...prev, jd: true}));
    setTestResults([]);
    try {
        const testStructure = parseCsv<TestStructure>(generatedData.structure);
        const skills = [...new Set(testStructure.map(s => s.skill).filter(Boolean))];
        const generatedYaml = await generateJdFromText({
          jobDescription: rawFiles.jd,
          skills,
          role: "Sample Data Scientist",
        });
        setGeneratedData(prev => ({...prev, jd: generatedYaml}));
        toast({ title: 'Success!', description: 'JD Skill Weights have been generated.' });
    } catch (error) {
        console.error('Error generating JD:', error);
        toast({ variant: 'destructive', title: 'Generation Failed', description: 'Could not generate JD weights.' });
    } finally {
        setIsLoading(prev => ({...prev, jd: false}));
    }
  }

  const handleGenerateStructure = async () => {
    if (!rawFiles.problems) {
      toast({ variant: 'destructive', title: 'Missing Problems JSON' });
      return;
    }
    setIsLoading(prev => ({...prev, structure: true}));
    setTestResults([]);
    try {
      const generatedCsv = await generateTestStructureFromJSON({ problemsJson: rawFiles.problems });
      setGeneratedData(prev => ({ ...prev, structure: generatedCsv }));
      toast({ title: 'Success!', description: 'Test Structure CSV has been generated.' });
    } catch (error) {
      console.error('Error generating test structure:', error);
      toast({ variant: 'destructive', title: 'Generation Failed', description: 'Could not generate Test Structure.' });
    } finally {
      setIsLoading(prev => ({...prev, structure: false}));
    }
  };

  const runTest = async (testName: string, testFn: () => Promise<TestResult>) => {
      setIsLoading(prev => ({ ...prev, [testName]: true }));
      setTestResults([]);
      try {
          const result = await testFn();
          setTestResults([result]);
          toast({ title: 'Test Complete', description: `${result.name} score: ${typeof result.score === 'number' ? (result.score * 100).toFixed(2) + '%' : result.score}` });
      } catch (error) {
          console.error(`Error running test "${testName}":`, error);
          const message = error instanceof Error ? error.message : 'An unknown error occurred';
          toast({ variant: 'destructive', title: 'Test Failed', description: message });
          setTestResults([{name: testName, score: `ERROR: ${message}`, inputs: { error: message }}]);
      } finally {
          setIsLoading(prev => ({ ...prev, [testName]: false }));
      }
  }

  const getTestData = () => {
      if (!generatedData.jd || !generatedData.structure || !rawFiles.candidates) {
          throw new Error('Required data is not generated or loaded. Please generate JD and Structure first.');
      }
      const jdSettings = parseYaml<JDSettings>(generatedData.jd);
      const testStructure = parseCsv<TestStructure>(generatedData.structure);
      const platformData = JSON.parse(rawFiles.candidates) as PlatformData[];
      const candidates = transformPlatformData(platformData, testStructure);

      if (candidates.length === 0) {
        throw new Error('No candidates found in sample data.');
      }
      return { jdSettings, testStructure, candidates, platformData };
  }

  const testSkillAlignment = async (): Promise<TestResult> => {
      const { jdSettings, testStructure, candidates } = getTestData();
      const candidate = candidates[0];
      const score = calculateSkillAlignment(candidate, testStructure, jdSettings);
      return { 
          name: 'Skill Alignment', 
          score, 
          inputs: { candidate, testStructure, jdSettings }
      };
  };

  const testKnowledgeEvidence = async (): Promise<TestResult> => {
      if (!rawFiles.cvs) throw new Error('CVs sample data not loaded.');
      const { jdSettings, candidates } = getTestData();
      const cvData = parseCsv<CvData>(rawFiles.cvs);

      const cvEmails = new Set(cvData.map(c => c.email));
      const candidateWithCv = candidates.find(c => cvEmails.has(c.email));
      if (!candidateWithCv) {
        throw new Error('Could not find a candidate with a corresponding CV in the sample data.');
      }
      
      const sampleCv = cvData.find(c => c.email === candidateWithCv.email)!;

      const signals = await getCvSignals({ resumeText: sampleCv.cv_text });
      const score = calculateKnowledgeEvidence(signals, jdSettings);
      return {
          name: 'Knowledge Evidence',
          score,
          inputs: { cvSignals: signals, jdSettings, candidate: candidateWithCv }
      };
  };

  const testProblemSolving = async (): Promise<TestResult> => {
      const { testStructure, candidates } = getTestData();
      const candidate = candidates[0];
      const score = calculateProblemSolving(candidate, testStructure);
      return { 
          name: 'Problem Solving', 
          score, 
          inputs: { candidate, testStructure }
      };
  };
  
  const testEfficiencyConsistency = async (): Promise<TestResult> => {
      const { testStructure, candidates } = getTestData();
      const candidate = candidates[0];
      const score = calculateEfficiencyConsistency(candidate, candidates, testStructure);
      return { 
          name: 'Efficiency & Consistency', 
          score, 
          inputs: { candidate, allCandidates: candidates, testStructure }
      };
  };

  const testIntegrityRisk = async (): Promise<TestResult> => {
      const { candidates } = getTestData();
      const candidate = candidates[0];
      const score = calculateIntegrityRisk(candidate);
      return { 
          name: 'Integrity & Risk', 
          score, 
          inputs: { candidate }
      };
  };


  const isDataReady = generatedData.jd && generatedData.structure;

  return (
    <Card className='border-2 border-dashed border-amber-500'>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bug className="text-amber-500" /> Debugging Dashboard</CardTitle>
        <CardDescription>
          Use this section to test individual scoring components using sample data from the <code>/public/sample-data</code> directory.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading['samples'] && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /><span>Loading sample data...</span></div>}
        {/* Data Generation */}
        <div className="space-y-4">
            <h4 className='font-semibold'>1. Data Generation</h4>
            <div className='flex flex-wrap gap-4'>
                <Button onClick={handleGenerateStructure} disabled={!rawFiles.problems || isLoading['structure']}>
                    {isLoading['structure'] ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                    Generate Test Structure
                </Button>
                 <Button onClick={handleGenerateJd} disabled={!generatedData.structure || !rawFiles.jd || isLoading['jd']}>
                    {isLoading['jd'] ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                    Generate JD Weights
                </Button>
            </div>
            <div className='flex gap-4 text-sm mt-2'>
                {generatedData.structure ? <span className='flex items-center gap-1.5 text-green-600'><FileText /> structure.csv</span> : <span className='flex items-center gap-1.5 text-muted-foreground'><FileText /> structure.csv</span>}
                {generatedData.jd ? <span className='flex items-center gap-1.5 text-green-600'><FileJson /> jd.yaml</span> : <span className='flex items-center gap-1.5 text-muted-foreground'><FileJson /> jd.yaml</span>}
            </div>
        </div>

        {/* Scoring Tests */}
        <div className="space-y-4">
            <h4 className='font-semibold'>2. Scoring Function Tests</h4>
            <div className='flex flex-wrap gap-4'>
                <Button variant="outline" size="sm" onClick={() => runTest('Skill Alignment', testSkillAlignment)} disabled={!isDataReady || isLoading['Skill Alignment']}>Test Skill Alignment</Button>
                <Button variant="outline" size="sm" onClick={() => runTest('Knowledge Evidence', testKnowledgeEvidence)} disabled={!isDataReady || !rawFiles.cvs || isLoading['Knowledge Evidence']}>Test Knowledge Evidence</Button>
                <Button variant="outline" size="sm" onClick={() => runTest('Problem Solving', testProblemSolving)} disabled={!isDataReady || isLoading['Problem Solving']}>Test Problem Solving</Button>
                <Button variant="outline" size="sm" onClick={() => runTest('Efficiency & Consistency', testEfficiencyConsistency)} disabled={!isDataReady || isLoading['Efficiency & Consistency']}>Test Efficiency & Consistency</Button>
                <Button variant="outline" size="sm" onClick={() => runTest('Integrity & Risk', testIntegrityRisk)} disabled={!isDataReady || isLoading['Integrity & Risk']}>Test Integrity & Risk</Button>
            </div>
        </div>

        {/* Results */}
        {testResults.length > 0 && (
            <div className="space-y-4">
                <h4 className='font-semibold'>3. Test Results</h4>
                {testResults.map((result, index) => (
                    <Card key={index} className='bg-muted/50'>
                        <CardHeader>
                            <CardTitle className='text-base'>{result.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className='text-2xl font-bold'>Score: <span className='text-primary'>{typeof result.score === 'number' ? (result.score * 100).toFixed(2) + '%' : result.score}</span></p>
                            <details className='mt-4 text-xs'>
                                <summary className='cursor-pointer font-medium'>View Inputs</summary>
                                <pre className='mt-2 p-2 bg-background rounded-md overflow-x-auto'>
                                    {JSON.stringify(result.inputs, null, 2)}
                                </pre>
                            </details>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
      </CardContent>
    </Card>
  );
}