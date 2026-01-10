'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, FileText, Edit, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Invoice, InvoiceStatus } from '@/types';
import { invoicesApi } from '@/lib/api';

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Entwurf', variant: 'secondary' },
  sent: { label: 'Gesendet', variant: 'default' },
  paid: { label: 'Bezahlt', variant: 'outline' },
  overdue: { label: 'Überfällig', variant: 'destructive' },
  cancelled: { label: 'Storniert', variant: 'secondary' },
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

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoice();
  }, [params.id]);

  const loadInvoice = async () => {
    try {
      const response = await invoicesApi.getById(params.id as string);
      if (response.success && response.data) {
        setInvoice(response.data);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      await invoicesApi.downloadPdf(invoice.id, invoice.invoiceNumber);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const handleDownloadXml = async () => {
    if (!invoice) return;
    try {
      await invoicesApi.downloadXml(invoice.id, invoice.invoiceNumber);
    } catch (error) {
      console.error('Error downloading XML:', error);
    }
  };

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!invoice) return;
    try {
      const response = await invoicesApi.updateStatus(invoice.id, newStatus);
      if (response.success) {
        loadInvoice();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Rechnung nicht gefunden</h2>
        <Link href="/invoices">
          <Button className="mt-4">Zurück zur Übersicht</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{invoice.invoiceNumber}</h1>
              <Badge variant={statusConfig[invoice.status].variant}>
                {statusConfig[invoice.status].label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Erstellt am {formatDate(invoice.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'draft' && (
            <>
              <Link href={`/invoices/${invoice.id}/edit`}>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Bearbeiten
                </Button>
              </Link>
              <Button onClick={() => handleStatusChange('sent')}>
                <Send className="mr-2 h-4 w-4" />
                Als gesendet markieren
              </Button>
            </>
          )}
          {invoice.status === 'sent' && (
            <Button onClick={() => handleStatusChange('paid')}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Als bezahlt markieren
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" onClick={handleDownloadXml}>
            <FileText className="mr-2 h-4 w-4" />
            ZUGFeRD XML
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Absender und Empfänger nebeneinander */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Absender (Unternehmen) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Von (Absender)</CardTitle>
              </CardHeader>
              <CardContent>
                {invoice.company ? (
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-base">{invoice.company.name}</p>
                    {invoice.company.legalName && <p className="text-muted-foreground">{invoice.company.legalName}</p>}
                    {invoice.company.street && invoice.company.houseNumber && (
                      <p>{invoice.company.street} {invoice.company.houseNumber}</p>
                    )}
                    {invoice.company.postalCode && invoice.company.city && (
                      <p>{invoice.company.postalCode} {invoice.company.city}</p>
                    )}
                    {invoice.company.country && <p>{invoice.company.country}</p>}
                    <div className="pt-2 space-y-1 text-muted-foreground">
                      {invoice.company.email && <p>E-Mail: {invoice.company.email}</p>}
                      {invoice.company.phone && <p>Tel: {invoice.company.phone}</p>}
                      {invoice.company.vatId && <p>USt-IdNr.: {invoice.company.vatId}</p>}
                      {invoice.company.taxNumber && <p>Steuernr.: {invoice.company.taxNumber}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Keine Unternehmensdaten hinterlegt</p>
                )}
              </CardContent>
            </Card>

            {/* Empfänger (Kunde) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">An (Empfänger)</CardTitle>
              </CardHeader>
              <CardContent>
                {invoice.customer ? (
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-base">{invoice.customer.companyName}</p>
                    {invoice.customer.contactName && <p>{invoice.customer.contactName}</p>}
                    {invoice.customer.street && invoice.customer.houseNumber && (
                      <p>{invoice.customer.street} {invoice.customer.houseNumber}</p>
                    )}
                    {invoice.customer.postalCode && invoice.customer.city && (
                      <p>{invoice.customer.postalCode} {invoice.customer.city}</p>
                    )}
                    {invoice.customer.country && <p>{invoice.customer.country}</p>}
                    <div className="pt-2 space-y-1 text-muted-foreground">
                      {invoice.customer.email && <p>E-Mail: {invoice.customer.email}</p>}
                      {invoice.customer.phone && <p>Tel: {invoice.customer.phone}</p>}
                      {invoice.customer.vatId && <p>USt-IdNr.: {invoice.customer.vatId}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Kein Kunde zugeordnet</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Positionen</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pos.</TableHead>
                    <TableHead className="w-[40%]">Beschreibung</TableHead>
                    <TableHead className="text-right">Menge</TableHead>
                    <TableHead>Einheit</TableHead>
                    <TableHead className="text-right">Einzelpreis</TableHead>
                    <TableHead className="text-right">MwSt.</TableHead>
                    <TableHead className="text-right">Gesamt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items?.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>{item.position || index + 1}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right">{item.taxRate}%</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {(invoice.notes || invoice.paymentTerms) && (
            <Card>
              <CardHeader>
                <CardTitle>Zusätzliche Informationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {invoice.paymentTerms && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Zahlungsbedingungen</p>
                    <p>{invoice.paymentTerms}</p>
                  </div>
                )}
                {invoice.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Hinweise</p>
                    <p>{invoice.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Zusammenfassung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rechnungsdatum</span>
                <span>{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fälligkeitsdatum</span>
                <span>{formatDate(invoice.dueDate)}</span>
              </div>
              {invoice.paidDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bezahlt am</span>
                  <span>{formatDate(invoice.paidDate)}</span>
                </div>
              )}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zwischensumme (netto)</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MwSt.</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Gesamtbetrag</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bankverbindung für Zahlungsanweisungen */}
          {invoice.company && (invoice.company.iban || invoice.company.bankName) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Bankverbindung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {invoice.company.bankName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank</span>
                    <span>{invoice.company.bankName}</span>
                  </div>
                )}
                {invoice.company.iban && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IBAN</span>
                    <span className="font-mono text-xs">{invoice.company.iban}</span>
                  </div>
                )}
                {invoice.company.bic && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BIC</span>
                    <span className="font-mono text-xs">{invoice.company.bic}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
