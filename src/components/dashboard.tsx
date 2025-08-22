'use client';

import type { FullReport, RankedCandidate } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { CandidateDetail } from './candidate-detail';
import { ArrowUpDown, BarChart, FilePlus2, Star, Users } from 'lucide-react';

type SortKey = keyof Pick<RankedCandidate, 'rank' | 'name' | 'UPS_percentile' | 'final_score'>;

interface DashboardProps {
    report: FullReport;
    onNewReport: () => void;
}

export function Dashboard({ report, onNewReport }: DashboardProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<RankedCandidate | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSelectCandidate = (candidate: RankedCandidate) => {
    setSelectedCandidate(candidate);
    setIsSheetOpen(true);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedCandidates = [...report.executive_summary].sort((a, b) => {
    let compareA = a[sortKey];
    let compareB = b[sortKey];
    
    if (typeof compareA === 'string' && typeof compareB === 'string') {
        return sortDirection === 'asc' ? compareA.localeCompare(compareB) : compareB.localeCompare(compareA);
    }

    if (typeof compareA === 'number' && typeof compareB === 'number') {
        return sortDirection === 'asc' ? compareA - compareB : compareB - a[sortKey];
    }
    return 0;
  });

  const recommendationVariant = {
    'Strong Hire': 'default',
    'Conditional': 'secondary',
    'Not Recommended': 'destructive',
  } as const;

  const avgFinalScore = report.executive_summary.length > 0 
    ? (report.executive_summary.reduce((acc, c) => acc + c.final_score, 0) / report.executive_summary.length * 100).toFixed(1)
    : '0.0';

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Executive Report</h2>
            <p className="text-muted-foreground">
            Analysis for role: <span className="font-semibold text-foreground">{report.role}</span>
            </p>
        </div>
        <Button onClick={onNewReport} variant="outline">
            <FilePlus2 className="mr-2 h-4 w-4" />
            New Report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totals.candidates}</div>
            <p className="text-xs text-muted-foreground">Processed and scored</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Strong Hires</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totals.strong_hires}</div>
            <p className="text-xs text-muted-foreground">Top-tier candidates identified</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Final Score</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgFinalScore}%
            </div>
             <p className="text-xs text-muted-foreground">Across all candidates</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Candidate Shortlist</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('rank')}>
                  <div className="flex items-center gap-2">Rank <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">Name <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                 <TableHead className="text-right cursor-pointer" onClick={() => handleSort('final_score')}>
                    <div className="flex items-center justify-end gap-2">Final Score <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => handleSort('UPS_percentile')}>
                    <div className="flex items-center justify-end gap-2">UPS Percentile <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead>Recommendation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCandidates.map(candidate => (
                <TableRow key={candidate.candidate_id}>
                  <TableCell className="font-medium">{candidate.rank}</TableCell>
                  <TableCell>{candidate.name}</TableCell>
                   <TableCell className="text-right font-mono">{(candidate.final_score * 100).toFixed(1)}</TableCell>
                  <TableCell className="text-right font-mono">{candidate.UPS_percentile.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge variant={recommendationVariant[candidate.recommendation]}>
                      {candidate.recommendation}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleSelectCandidate(candidate)}>
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <CandidateDetail
        candidate={selectedCandidate}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </div>
  );
}
