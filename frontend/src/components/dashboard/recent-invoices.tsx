'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, Eye, Download, Send } from 'lucide-react';
import type { Invoice, InvoiceStatus } from '@/types';
import { invoicesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/constants';

interface RecentInvoicesProps {
  invoices: Invoice[];
  stats: {
    outstanding: number;
    overdue: number;
    total: number;
  };
}

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; text: string; dot: string }> = {
  draft: {
    bg: 'bg-slate-100 dark:bg-slate-800/50',
    text: 'text-slate-700 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
  sent: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  paid: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  overdue: {
    bg: 'bg-red-100 dark:bg-red-500/10',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
  cancelled: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    dot: 'bg-gray-500',
  },
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Entwurf',
  sent: 'Versendet',
  paid: 'Bezahlt',
  overdue: 'Überfällig',
  cancelled: 'Storniert',
};

export function RecentInvoices({ invoices, stats }: RecentInvoicesProps) {
  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      await invoicesApi.downloadPdf(invoice.id, invoice.invoiceNumber);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  return (
    <Card className="col-span-full animate-fade-in-up opacity-0" style={{ animationDelay: '600ms' }}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Letzte Rechnungen
          </CardTitle>
          <CardDescription>
            Ihre neuesten Rechnungen auf einen Blick
          </CardDescription>
        </div>
        <Link href="/invoices">
          <Button variant="outline" size="sm" className="gap-2 group">
            Alle anzeigen
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {invoices.length > 0 ? (
          <>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Nummer</TableHead>
                    <TableHead className="font-semibold">Kunde</TableHead>
                    <TableHead className="font-semibold">Datum</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Betrag</TableHead>
                    <TableHead className="text-right font-semibold w-[100px]">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice, index) => {
                    const statusStyle = STATUS_STYLES[invoice.status] || STATUS_STYLES.draft;
                    return (
                      <TableRow
                        key={invoice.id}
                        className="group cursor-pointer transition-colors hover:bg-muted/50"
                        style={{ animationDelay: `${700 + index * 100}ms` }}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <FileText className="h-4 w-4" />
                            </div>
                            <span className="font-semibold">{invoice.invoiceNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{invoice.customer?.companyName || 'Unbekannt'}</p>
                            <p className="text-xs text-muted-foreground">
                              {invoice.customer?.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(invoice.issueDate)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`${statusStyle.bg} ${statusStyle.text} font-medium gap-1.5 px-2.5 py-0.5`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                            {STATUS_LABELS[invoice.status] || invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-lg">
                            {formatCurrency(invoice.total)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/invoices/${invoice.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDownloadPdf(invoice)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {invoice.status === 'draft' && (
                              <Link href={`/invoices/${invoice.id}/edit`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary">
                                  <Send className="h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Summary Footer */}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Zeigt {invoices.length} von {stats.total} Rechnungen
              </span>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  Offen: <span className="font-semibold text-foreground">{formatCurrency(stats.outstanding)}</span>
                </span>
                <span className="text-muted-foreground">
                  Überfällig: <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(stats.overdue)}</span>
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Keine Rechnungen vorhanden</p>
            <p className="text-sm mb-4">Erstellen Sie Ihre erste Rechnung, um hier zu starten.</p>
            <Link href="/invoices/new">
              <Button>Neue Rechnung erstellen</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
