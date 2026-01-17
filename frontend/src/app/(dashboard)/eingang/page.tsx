'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { incomingInvoicesApi, vendorsApi, expensesApi } from '@/lib/api';
import type {
  IncomingInvoice,
  IncomingInvoiceStatus,
  IncomingInvoiceStats,
  Vendor,
  ExpenseCategory,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  FileText,
  Eye,
  Trash2,
  Upload,
  FileInput,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { EingangUploadDialog } from '@/components/eingang';

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

export default function EingangPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<IncomingInvoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<IncomingInvoiceStatus | 'all'>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { toast } = useToast();

  const [stats, setStats] = useState<IncomingInvoiceStats>({
    totalInvoices: 0,
    draftCount: 0,
    reviewedCount: 0,
    approvedCount: 0,
    bookedCount: 0,
    paidCount: 0,
    totalUnpaid: 0,
    totalOverdue: 0,
    totalThisMonth: 0,
  });

  useEffect(() => {
    loadData();
  }, [searchTerm, statusFilter, vendorFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [invoicesResponse, statsResponse, vendorsResponse, categoriesResponse] =
        await Promise.all([
          incomingInvoicesApi.getInvoices({
            search: searchTerm || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            vendorId: vendorFilter !== 'all' ? vendorFilter : undefined,
            limit: 100,
          }),
          incomingInvoicesApi.getStats(),
          vendorsApi.getVendors({ limit: 100 }),
          expensesApi.getCategories(),
        ]);

      setInvoices(invoicesResponse.data);
      setStats(statsResponse.data);
      setVendors(vendorsResponse.data);
      setCategories(categoriesResponse.data);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Daten konnten nicht geladen werden',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('Möchten Sie diese Eingangsrechnung wirklich löschen?')) return;

    try {
      await incomingInvoicesApi.deleteInvoice(id);
      toast({
        title: 'Erfolg',
        description: 'Eingangsrechnung wurde gelöscht',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Eingangsrechnung konnte nicht gelöscht werden',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (id: string, newStatus: IncomingInvoiceStatus) => {
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

  const handleUploadComplete = () => {
    setUploadDialogOpen(false);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileInput className="h-8 w-8" />
            Eingang
          </h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Eingangsrechnungen mit OCR-Erkennung
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Hochladen
          </Button>
          <Link href="/eingang/new">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Manuell erfassen
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gesamt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Offen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalUnpaid)}
            </div>
          </CardContent>
        </Card>
        <Card className={stats.totalOverdue > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              {stats.totalOverdue > 0 && <AlertCircle className="h-4 w-4 text-destructive" />}
              Überfällig
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalOverdue > 0 ? 'text-destructive' : ''}`}>
              {formatCurrency(stats.totalOverdue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Zu prüfen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draftCount + stats.reviewedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Diesen Monat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalThisMonth)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Eingangsrechnungen</CardTitle>
              <CardDescription>
                Übersicht aller eingehenden Rechnungen
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-48"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as IncomingInvoiceStatus | 'all')
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="draft">Entwurf</SelectItem>
                  <SelectItem value="reviewed">Geprüft</SelectItem>
                  <SelectItem value="approved">Genehmigt</SelectItem>
                  <SelectItem value="booked">Gebucht</SelectItem>
                  <SelectItem value="paid">Bezahlt</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                </SelectContent>
              </Select>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Lieferant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Lieferanten</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Lädt...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileInput className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Keine Eingangsrechnungen gefunden</p>
              <p className="text-muted-foreground mb-4">
                Laden Sie Ihre erste Rechnung hoch oder erfassen Sie sie manuell
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Hochladen
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Eingangsdatum</TableHead>
                  <TableHead>Lieferant</TableHead>
                  <TableHead>Lieferant-Nr.</TableHead>
                  <TableHead>Fälligkeit</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const isOverdue =
                    invoice.dueDate &&
                    new Date(invoice.dueDate) < new Date() &&
                    !['paid', 'cancelled', 'rejected'].includes(invoice.status);

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{invoice.invoiceNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(invoice.receivedDate)}</TableCell>
                      <TableCell>
                        {invoice.vendorName || invoice.vendor?.companyName || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invoice.vendorInvoiceNumber || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                          {formatDate(invoice.dueDate)}
                          {isOverdue && (
                            <AlertCircle className="inline ml-1 h-4 w-4" />
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[invoice.status]}>
                          {statusLabels[invoice.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Link href={`/eingang/${invoice.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {['draft', 'rejected', 'cancelled'].includes(invoice.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <EingangUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}
