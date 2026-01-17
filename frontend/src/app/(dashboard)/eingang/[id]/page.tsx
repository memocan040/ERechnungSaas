'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  incomingInvoicesApi,
  vendorsApi,
  expensesApi,
  accountingApi,
} from '@/lib/api';
import type {
  IncomingInvoice,
  IncomingInvoiceStatus,
  Vendor,
  ExpenseCategory,
  CostCenter,
  ChartOfAccount,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  MoreVertical,
  FileText,
  Download,
  BookOpen,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  CreditCard,
  FileInput,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { EingangForm, EingangBookingDialog } from '@/components/eingang';

const statusLabels: Record<IncomingInvoiceStatus, string> = {
  draft: 'Entwurf',
  reviewed: 'Geprüft',
  approved: 'Genehmigt',
  booked: 'Gebucht',
  paid: 'Bezahlt',
  rejected: 'Abgelehnt',
  cancelled: 'Storniert',
};

const statusColors: Record<
  IncomingInvoiceStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'secondary',
  reviewed: 'outline',
  approved: 'default',
  booked: 'default',
  paid: 'default',
  rejected: 'destructive',
  cancelled: 'secondary',
};

export default function EingangDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<IncomingInvoice | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [invoiceRes, vendorsRes, categoriesRes, costCentersRes, accountsRes] =
        await Promise.all([
          incomingInvoicesApi.getInvoice(id),
          vendorsApi.getVendors({ limit: 100 }),
          expensesApi.getCategories(),
          expensesApi.getCostCenters(),
          accountingApi.getChartOfAccounts(),
        ]);

      setInvoice(invoiceRes.data);
      setVendors(vendorsRes.data);
      setCategories(categoriesRes.data);
      setCostCenters(costCentersRes.data);
      setAccounts(accountsRes.data);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Daten konnten nicht geladen werden',
        variant: 'destructive',
      });
      router.push('/eingang');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    setSaving(true);
    try {
      await incomingInvoicesApi.updateInvoice(id, data);
      toast({
        title: 'Erfolg',
        description: 'Rechnung wurde gespeichert',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Rechnung konnte nicht gespeichert werden',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: IncomingInvoiceStatus) => {
    try {
      await incomingInvoicesApi.updateStatus(id, newStatus);
      toast({
        title: 'Erfolg',
        description: 'Status wurde aktualisiert',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Status konnte nicht aktualisiert werden',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      await incomingInvoicesApi.markAsPaid(id);
      toast({
        title: 'Erfolg',
        description: 'Rechnung wurde als bezahlt markiert',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Status konnte nicht aktualisiert werden',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadXml = async () => {
    try {
      const blob = await incomingInvoicesApi.downloadXml(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice?.invoiceNumber}_zugferd.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'XML konnte nicht heruntergeladen werden',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Möchten Sie diese Eingangsrechnung wirklich löschen?')) return;

    try {
      await incomingInvoicesApi.deleteInvoice(id);
      toast({
        title: 'Erfolg',
        description: 'Eingangsrechnung wurde gelöscht',
      });
      router.push('/eingang');
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Eingangsrechnung konnte nicht gelöscht werden',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('de-DE');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Rechnung nicht gefunden</p>
        <Link href="/eingang">
          <Button variant="link">Zurück zur Übersicht</Button>
        </Link>
      </div>
    );
  }

  const canEdit = ['draft', 'reviewed'].includes(invoice.status);
  const canBook = invoice.status === 'approved';
  const canMarkPaid = invoice.status === 'booked';
  const canDelete = ['draft', 'rejected', 'cancelled'].includes(invoice.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Link href="/eingang">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileInput className="h-6 w-6" />
                {invoice.invoiceNumber}
              </h1>
              <Badge variant={statusColors[invoice.status]}>
                {statusLabels[invoice.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {invoice.vendorName || 'Unbekannter Lieferant'}
              {invoice.vendorInvoiceNumber && ` - ${invoice.vendorInvoiceNumber}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Document */}
          {invoice.filePath && (
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? 'Formular' : 'Dokument'}
            </Button>
          )}

          {/* Status Actions */}
          {invoice.status === 'draft' && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange('reviewed')}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Als geprüft markieren
            </Button>
          )}

          {invoice.status === 'reviewed' && (
            <Button onClick={() => handleStatusChange('approved')}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Genehmigen
            </Button>
          )}

          {canBook && (
            <Button onClick={() => setBookingDialogOpen(true)}>
              <BookOpen className="mr-2 h-4 w-4" />
              Buchen
            </Button>
          )}

          {canMarkPaid && (
            <Button onClick={handleMarkAsPaid}>
              <CreditCard className="mr-2 h-4 w-4" />
              Als bezahlt markieren
            </Button>
          )}

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadXml}>
                <Download className="mr-2 h-4 w-4" />
                XML exportieren
              </DropdownMenuItem>
              {invoice.status === 'reviewed' && (
                <DropdownMenuItem onClick={() => handleStatusChange('rejected')}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Ablehnen
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Löschen
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Document Preview or Form */}
      {showPreview && invoice.filePath ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dokument-Vorschau</CardTitle>
            <CardDescription>
              {invoice.originalFilename || 'Originaldokument'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoice.fileType === 'application/pdf' ? (
              <iframe
                src={`/api/incoming-invoices/${invoice.id}/file`}
                className="w-full h-[600px] border rounded"
              />
            ) : (
              <img
                src={`/api/incoming-invoices/${invoice.id}/file`}
                alt="Rechnung"
                className="max-w-full h-auto border rounded"
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Card (for non-editable states) */}
          {!canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Zusammenfassung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Lieferant</p>
                    <p className="font-medium">{invoice.vendorName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rechnungsdatum</p>
                    <p className="font-medium">{formatDate(invoice.invoiceDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fälligkeit</p>
                    <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gesamtbetrag</p>
                    <p className="font-medium text-lg">{formatCurrency(invoice.total)}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">USt-IdNr.</p>
                    <p className="font-medium">{invoice.vendorVatId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IBAN</p>
                    <p className="font-medium">{invoice.vendorIban || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nettobetrag</p>
                    <p className="font-medium">{formatCurrency(invoice.subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">MwSt</p>
                    <p className="font-medium">{formatCurrency(invoice.taxAmount)}</p>
                  </div>
                </div>

                {invoice.items && invoice.items.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Positionen</p>
                      <div className="border rounded">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="p-2 text-left">#</th>
                              <th className="p-2 text-left">Beschreibung</th>
                              <th className="p-2 text-right">Menge</th>
                              <th className="p-2 text-right">Einzelpreis</th>
                              <th className="p-2 text-right">Gesamt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoice.items.map((item, idx) => (
                              <tr key={item.id || idx} className="border-t">
                                <td className="p-2">{idx + 1}</td>
                                <td className="p-2">{item.description}</td>
                                <td className="p-2 text-right">
                                  {item.quantity} {item.unit}
                                </td>
                                <td className="p-2 text-right">
                                  {formatCurrency(item.unitPrice)}
                                </td>
                                <td className="p-2 text-right font-medium">
                                  {formatCurrency(item.total || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Editable Form */}
          {canEdit && (
            <EingangForm
              invoice={invoice}
              vendors={vendors}
              categories={categories}
              costCenters={costCenters}
              accounts={accounts}
              onSubmit={handleSubmit}
              isLoading={saving}
            />
          )}
        </>
      )}

      {/* Booking Dialog */}
      <EingangBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        invoice={invoice}
        accounts={accounts}
        onBookingComplete={loadData}
      />
    </div>
  );
}
