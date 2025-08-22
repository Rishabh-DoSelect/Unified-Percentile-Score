import { Briefcase } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              UPS Report
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}
