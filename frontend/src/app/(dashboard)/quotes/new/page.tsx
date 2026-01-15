'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuoteForm } from '@/components/quote/quote-form';

export default function NewQuotePage() {
  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center gap-4 flex-none">
        <Link href="/quotes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Neues Angebot</h1>
          <p className="text-muted-foreground">
            Erstellen Sie ein neues Angebot.
          </p>
        </div>
      </div>

      <QuoteForm />
    </div>
  );
}
