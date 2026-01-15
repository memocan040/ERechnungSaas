'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, FileText, Download, Trash2, Eye, ArrowLeft, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Quote, QuoteStatus } from '@/types';
import { quotesApi } from '@/lib/api';

const statusConfig: Record<QuoteStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Entwurf', variant: 'secondary' },
  sent: { label: 'Gesendet', variant: 'default' },
  accepted: { label: 'Angenommen', variant: 'outline' },
  rejected: { label: 'Abgelehnt', variant: 'destructive' },
  expired: { label: 'Abgelaufen', variant: 'secondary' },
  converted: { label: 'Umgewandelt', variant: 'outline' },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE');
}

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; quote: Quote | null }>({
    open: false,
    quote: null,
  });
  const [convertDialog, setConvertDialog] = useState<{ open: boolean; quote: Quote | null }>({
    open: false,
    quote: null,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const response = await quotesApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        status: statusFilter !== 'all' ? (statusFilter as QuoteStatus) : undefined,
      });

      if (response.success && response.data) {
        setQuotes(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, [pagination.page, statusFilter]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadQuotes();
  };

  const handleDelete = async () => {
    if (!deleteDialog.quote) return;

    try {
      const response = await quotesApi.delete(deleteDialog.quote.id);
      if (response.success) {
        loadQuotes();
      }
    } catch (error) {
      console.error('Error deleting quote:', error);
    } finally {
      setDeleteDialog({ open: false, quote: null });
    }
  };

  const handleDownloadPdf = async (quote: Quote) => {
    try {
      await quotesApi.downloadPdf(quote.id, quote.quoteNumber);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const handleStatusChange = async (quote: Quote, newStatus: QuoteStatus) => {
    try {
      const response = await quotesApi.updateStatus(quote.id, newStatus);
      if (response.success) {
        loadQuotes();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!convertDialog.quote) return;

    try {
      const response = await quotesApi.convertToInvoice(convertDialog.quote.id);
      if (response.success && response.data) {
        router.push(`/invoices/${response.data.invoiceId}`);
      }
    } catch (error) {
      console.error('Error converting quote:', error);
    } finally {
      setConvertDialog({ open: false, quote: null });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Angebote</h1>
            <p className="text-muted-foreground">
              Verwalten Sie Ihre Angebote und erstellen Sie neue.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/quotes/new">
            <Button className="gradient-primary text-white">
              <Plus className="mr-2 h-4 w-4" />
              Neues Angebot
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Alle Angebote</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suchen..."
                  className="pl-8 w-full sm:w-[200px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="draft">Entwurf</SelectItem>
                  <SelectItem value="sent">Gesendet</SelectItem>
                  <SelectItem value="accepted">Angenommen</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                  <SelectItem value="expired">Abgelaufen</SelectItem>
                  <SelectItem value="converted">Umgewandelt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Keine Angebote gefunden</h3>
              <p className="text-muted-foreground mb-4">
                Erstellen Sie Ihr erstes Angebot, um loszulegen.
              </p>
              <Link href="/quotes/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Neues Angebot
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Angebotsnr.</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Gültig bis</TableHead>
                    <TableHead>Betrag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        {quote.quoteNumber}
                      </TableCell>
                      <TableCell>{quote.customer?.companyName || '-'}</TableCell>
                      <TableCell>{formatDate(quote.issueDate)}</TableCell>
                      <TableCell>{formatDate(quote.validUntil)}</TableCell>
                      <TableCell>{formatCurrency(quote.total)}</TableCell>
                      <TableCell>
                        {getAvailableStatuses(quote.status).length > 0 ? (
                          <Select
                            value={quote.status}
                            onValueChange={(value) => handleStatusChange(quote, value as QuoteStatus)}
                          >
                            <SelectTrigger className="w-[140px] h-8">
                              <Badge variant={statusConfig[quote.status].variant}>
                                {statusConfig[quote.status].label}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={quote.status} disabled>
                                {statusConfig[quote.status].label}
                              </SelectItem>
                              {getAvailableStatuses(quote.status).map((status) => (
                                <SelectItem key={status} value={status}>
                                  {statusConfig[status].label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={statusConfig[quote.status].variant}>
                            {statusConfig[quote.status].label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/quotes/${quote.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadPdf(quote)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {quote.status === 'accepted' && !quote.convertedInvoiceId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setConvertDialog({ open: true, quote })}
                              title="In Rechnung umwandeln"
                            >
                              <ArrowRightLeft className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {quote.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteDialog({ open: true, quote })}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Seite {pagination.page} von {pagination.totalPages} ({pagination.total} Einträge)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Zurück
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Weiter
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, quote: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Angebot löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie das Angebot {deleteDialog.quote?.quoteNumber} wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, quote: null })}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={convertDialog.open} onOpenChange={(open) => setConvertDialog({ open, quote: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>In Rechnung umwandeln</DialogTitle>
            <DialogDescription>
              Möchten Sie das Angebot {convertDialog.quote?.quoteNumber} in eine Rechnung umwandeln?
              Eine neue Rechnung wird mit den Daten des Angebots erstellt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialog({ open: false, quote: null })}>
              Abbrechen
            </Button>
            <Button onClick={handleConvertToInvoice}>
              Umwandeln
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
