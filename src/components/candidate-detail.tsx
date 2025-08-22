import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { RankedCandidate } from '@/lib/types';
import { AlertCircle, ArrowDownRight, ArrowUpRight, BarChart, BrainCircuit, Calendar, CheckCircle, Clock, FileText, Github, Projector, Shield, Star, Users } from 'lucide-react';

interface CandidateDetailProps {
  candidate: RankedCandidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ScoreDisplay = ({ label, value, icon }: { label: string; value: number, icon: React.ReactNode }) => (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
        <div className="text-2xl font-semibold text-foreground">
        {(value * 100).toFixed(1)}
        <span className="text-base text-muted-foreground">%</span>
        </div>
    </div>
);


export function CandidateDetail({ candidate, open, onOpenChange }: CandidateDetailProps) {
  if (!candidate) return null;

  const recommendationVariant = {
    'Strong Hire': 'default',
    'Conditional': 'secondary',
    'Not Recommended': 'destructive',
  } as const;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-2xl">{candidate.name}</SheetTitle>
          <SheetDescription>
            Detailed report for candidate ID: {candidate.candidate_id}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-6">
            <Card className='bg-secondary/50'>
                <CardContent className="pt-6 flex justify-around items-center">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Rank</p>
                        <p className="text-4xl font-bold">{candidate.rank}</p>
                    </div>
                     <Separator orientation='vertical' className='h-16' />
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">UPS Percentile</p>
                        <p className="text-4xl font-bold">{candidate.UPS_percentile.toFixed(1)}</p>
                    </div>
                     <Separator orientation='vertical' className='h-16' />
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Recommendation</p>
                        <Badge variant={recommendationVariant[candidate.recommendation]} className='text-lg mt-2'>
                          {candidate.recommendation}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Star className="text-amber-500" /> AI-Powered Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="rounded-lg border bg-background p-4">
                        <h4 className="flex items-center gap-2 font-semibold text-green-600"><ArrowUpRight className="h-5 w-5" /> Key Strengths</h4>
                        <p className="mt-2 text-sm text-foreground/80">{candidate.key_strengths}</p>
                    </div>
                     <div className="rounded-lg border bg-background p-4">
                        <h4 className="flex items-center gap-2 font-semibold text-red-600"><ArrowDownRight className="h-5 w-5" /> Key Risks</h4>
                        <p className="mt-2 text-sm text-foreground/80">{candidate.key_risks}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><BarChart /> Score Breakdown</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <ScoreDisplay label="Skill Alignment" value={candidate.skill_alignment} icon={<CheckCircle className="h-4 w-4" />} />
                    <ScoreDisplay label="Knowledge Evidence" value={candidate.knowledge_evidence} icon={<FileText className="h-4 w-4" />} />
                    <ScoreDisplay label="Problem Solving" value={candidate.problem_solving} icon={<BrainCircuit className="h-4 w-4" />} />
                    <ScoreDisplay label="Efficiency" value={candidate.efficiency_consistency} icon={<Clock className="h-4 w-4" />} />
                    <ScoreDisplay label="Integrity & Risk" value={candidate.integrity_risk} icon={<Shield className="h-4 w-4" />} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Users /> Candidate Signals</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-2"><Clock /> Total Time</span>
                        <span>{candidate.raw_candidate_data.total_time_sec} sec</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-2"><AlertCircle /> Attempts</span>
                        <span>{candidate.raw_candidate_data.attempts}</span>
                    </div>
                    <Separator />
                     <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-2"><Shield /> Plagiarism Score</span>
                        <span>{(candidate.raw_candidate_data.plagiarism_score * 100).toFixed(0)}%</span>
                    </div>
                     <Separator />
                     <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-2"><Projector /> Proctoring Flags</span>
                        <span>{candidate.raw_candidate_data.proctoring_flags}</span>
                    </div>
                     {candidate.raw_cv_data && (
                        <>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-2"><FileText /> Projects</span>
                                <span>{candidate.raw_cv_data.projects}</span>
                            </div>
                            <Separator />
                             <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-2"><Calendar /> Internships</span>
                                <span>{candidate.raw_cv_data.internships}</span>
                            </div>
                             <Separator />
                             <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-2"><Github /> GitHub Profile</span>
                                <span>{candidate.raw_cv_data.github ? 'Yes' : 'No'}</span>
                            </div>
                        </>
                     )}
                </CardContent>
            </Card>

        </div>
      </SheetContent>
    </Sheet>
  );
}
