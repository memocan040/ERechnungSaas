'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, ArrowRightLeft, CheckCircle, XCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Quote, QuoteStatus } from '@/types';
import { quotesApi } from '@/lib/api';
import { QuoteForm } from '@/components/quote/quote-form';
import { QuotePreview } from '@/components/quote/quote-preview';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusConfig: Record<QuoteStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Entwurf', variant: 'secondary' },
  sent: { label: 'Gesendet', variant: 'default' },
  accepted: { label: 'Angenommen', variant: 'outline' },
  rejected: { label: 'Abgelehnt', variant: 'destructive' },
  expired: { label: 'Abgelaufen', variant: 'secondary' },
  converted: { label: 'Umgewandelt', variant: 'outline' },
};

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    loadQuote();
  }, [params.id]);

  const loadQuote = async () => {
    try {
      const response = await quotesApi.getById(params.id as string);
      if (response.success && response.data) {
        setQuote(response.data);
      }
    } catch (error) {
      console.error('Error loading quote:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quote) return;
    try {
      await quotesApi.downloadPdf(quote.id, quote.quoteNumber);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const handleStatusChange = async (newStatus: QuoteStatus) => {
    if (!quote) return;
    try {
      const response = await quotesApi.updateStatus(quote.id, newStatus);
      if (response.success && response.data) {
        setQuote(response.data);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!quote) return;
    try {
      const response = await quotesApi.convertToInvoice(quote.id);
      if (response.success && response.data) {
        router.push(`/invoices/${response.data.invoiceId}`);
      }
    } catch (error) {
      console.error('Error converting quote:', error);
    }
  };

  const getAvailableStatuses = (currentStatus: QuoteStatus): QuoteStatus[] => {
    const transitions: Record<QuoteStatus, QuoteStatus[]> = {
      draft: ['sent'],
      sent: ['accepted', 'rejected', 'expired'],
      accepted: [],
      rejected: [],
      expired: [],
      converted: [],
    };
    return transitions[currentStatus];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Angebot nicht gefunden</h2>
        <Link href="/quotes">
          <Button className="mt-4">Zurück zur Übersicht</Button>
        </Link>
      </div>
    );
  }

  // If status is draft, show the edit form
  if (quote.status === 'draft') {
    return (
      <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
        <div className="flex items-center justify-between flex-none">
          <div className="flex items-center gap-4">
            <Link href="/quotes">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Angebot bearbeiten</h1>
              <p className="text-muted-foreground">
                {quote.quoteNumber}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleStatusChange('sent')}>
              <Send className="mr-2 h-4 w-4" />
              Als gesendet markieren
            </Button>
             <Button variant="outline" onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        <QuoteForm initialData={quote} isEditing={true} />
      </div>
    );
  }

  // Read-only view for non-draft quotes
  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between flex-none">
        <div className="flex items-center gap-4">
          <Link href="/quotes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{quote.quoteNumber}</h1>
              <Badge variant={statusConfig[quote.status].variant} className="text-base px-3 py-1">
                {statusConfig[quote.status].label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Details zum Angebot
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {getAvailableStatuses(quote.status).length > 0 && (
             <Select
                value={quote.status}
                onValueChange={(value) => handleStatusChange(value as QuoteStatus)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status ändern" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableStatuses(quote.status).map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusConfig[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          )}

          {quote.status === 'accepted' && !quote.convertedInvoiceId && (
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleConvertToInvoice}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              In Rechnung umwandeln
            </Button>
          )}

          <Button variant="outline" onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            PDF herunterladen
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/30 rounded-lg border p-8 overflow-y-auto flex justify-center">
        <div className="w-full max-w-[210mm] bg-background shadow-lg rounded-sm overflow-hidden min-h-[297mm]">
           <QuotePreview quoteData={{ ...quote, items: quote.items || [] }} />
        </div>
      </div>
    </div>
  );
}
