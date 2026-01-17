'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { expensesApi, vendorsApi, accountingApi } from '@/lib/api';
import type {
  Expense,
  ExpenseStatus,
  Vendor,
  ExpenseCategory,
  CostCenter,
  ChartOfAccount,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  MoreVertical,
  Edit,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Upload,
  Eye,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ReceiptUploadDialog } from '@/components/expenses/receipt-upload-dialog';

const statusLabels: Record<ExpenseStatus, string> = {
  draft: 'Entwurf',
  submitted: 'Eingereicht',
  approved: 'Genehmigt',
  paid: 'Bezahlt',
  rejected: 'Abgelehnt',
  cancelled: 'Storniert',
};

const statusColors: Record<ExpenseStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  submitted: 'outline',
  approved: 'default',
  paid: 'default',
  rejected: 'destructive',
  cancelled: 'secondary',
};

const validTransitions: Record<ExpenseStatus, ExpenseStatus[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'rejected'],
  approved: ['paid', 'rejected'],
  paid: [],
  rejected: ['draft'],
  cancelled: [],
};

interface ExpenseLineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  accountId: string;
  costCenterId: string;
}

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const expenseId = params.id as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [receiptDialog, setReceiptDialog] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState({
    vendorId: '',
    vendorInvoiceNumber: '',
    expenseDate: '',
    dueDate: '',
    categoryId: '',
    costCenterId: '',
    description: '',
    notes: '',
  });
  const [lineItems, setLineItems] = useState<ExpenseLineItem[]>([]);

  useEffect(() => {
    loadData();
  }, [expenseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expenseRes, vendorsRes, categoriesRes, costCentersRes, accountsRes] =
        await Promise.all([
          expensesApi.getExpense(expenseId),
          vendorsApi.getVendors({ limit: 100 }),
          expensesApi.getCategories(),
          expensesApi.getCostCenters(),
          accountingApi.getAccounts({ accountType: 'expense' }),
        ]);

      if (expenseRes.success && expenseRes.data) {
        const exp = expenseRes.data;
        setExpense(exp);

        // Populate form data
        setFormData({
          vendorId: exp.vendorId || '',
          vendorInvoiceNumber: exp.vendorInvoiceNumber || '',
          expenseDate: exp.expenseDate?.toString().split('T')[0] || '',
          dueDate: exp.dueDate?.toString().split('T')[0] || '',
          categoryId: exp.categoryId || '',
          costCenterId: exp.costCenterId || '',
          description: exp.description || '',
          notes: exp.notes || '',
        });

        // Populate line items
        if (exp.items && exp.items.length > 0) {
          setLineItems(exp.items.map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            accountId: item.accountId || '',
            costCenterId: item.costCenterId || '',
          })));
        }
      } else {
        toast({
          title: 'Fehler',
          description: 'Ausgabe konnte nicht geladen werden',
          variant: 'destructive',
        });
        router.push('/expenses');
      }

      setVendors(vendorsRes.data || []);
      setCategories(categoriesRes.data || []);
      setCostCenters(costCentersRes.data || []);
      setAccounts(accountsRes.data || []);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Daten konnten nicht geladen werden',
        variant: 'destructive',
      });
      router.push('/expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: ExpenseStatus) => {
    try {
      const response = await expensesApi.updateExpenseStatus(expenseId, newStatus);
      if (response.success) {
        toast({
          title: 'Erfolg',
          description: 'Status wurde aktualisiert',
        });
        loadData();
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Status konnte nicht aktualisiert werden',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Möchten Sie diese Ausgabe wirklich löschen?')) return;

    try {
      await expensesApi.deleteExpense(expenseId);
      toast({
        title: 'Erfolg',
        description: 'Ausgabe wurde gelöscht',
      });
      router.push('/expenses');
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Ausgabe konnte nicht gelöscht werden',
        variant: 'destructive',
      });
    }
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 19,
        accountId: '',
        costCenterId: '',
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) {
      toast({
        title: 'Fehler',
        description: 'Mindestens eine Position erforderlich',
        variant: 'destructive',
      });
      return;
    }
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof ExpenseLineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateLineTotal = (item: ExpenseLineItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const tax = subtotal * (item.taxRate / 100);
    return subtotal + tax;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    lineItems.forEach((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemTax = itemSubtotal * (item.taxRate / 100);
      subtotal += itemSubtotal;
      taxAmount += itemTax;
    });

    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const handleSave = async () => {
    if (!formData.description) {
      toast({
        title: 'Fehler',
        description: 'Bitte Beschreibung eingeben',
        variant: 'destructive',
      });
      return;
    }

    if (lineItems.some((item) => !item.description || item.unitPrice <= 0)) {
      toast({
        title: 'Fehler',
        description: 'Bitte alle Positionsfelder ausfüllen',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await expensesApi.updateExpense(expenseId, {
        vendorId: formData.vendorId || undefined,
        vendorInvoiceNumber: formData.vendorInvoiceNumber || undefined,
        expenseDate: new Date(formData.expenseDate),
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        categoryId: formData.categoryId || undefined,
        costCenterId: formData.costCenterId || undefined,
        description: formData.description,
        notes: formData.notes || undefined,
        items: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          accountId: item.accountId || undefined,
          costCenterId: item.costCenterId || undefined,
        })),
      });

      if (response.success) {
        toast({
          title: 'Erfolg',
          description: 'Ausgabe wurde gespeichert',
        });
        setIsEditing(false);
        loadData();
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Ausgabe konnte nicht gespeichert werden',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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

  if (!expense) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ausgabe nicht gefunden</p>
        <Link href="/expenses">
          <Button variant="link">Zurück zur Übersicht</Button>
        </Link>
      </div>
    );
  }

  const canEdit = expense.status === 'draft';
  const canDelete = expense.status === 'draft';
  const possibleTransitions = validTransitions[expense.status] || [];
  const totals = calculateTotals();

  // View Mode
  if (!isEditing) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <Link href="/expenses">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{expense.expenseNumber}</h1>
                <Badge variant={statusColors[expense.status]}>
                  {statusLabels[expense.status]}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {expense.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Bearbeiten
              </Button>
            )}

            {possibleTransitions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    Status ändern
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {possibleTransitions.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusChange(status)}
                    >
                      {status === 'approved' && <CheckCircle className="mr-2 h-4 w-4" />}
                      {status === 'rejected' && <XCircle className="mr-2 h-4 w-4" />}
                      {statusLabels[status]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canDelete && (
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Löschen
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {/* General Info */}
            <Card>
              <CardHeader>
                <CardTitle>Allgemeine Informationen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Lieferant</p>
                    <p className="font-medium">{expense.vendor?.companyName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rechnungsnummer</p>
                    <p className="font-medium">{expense.vendorInvoiceNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ausgabendatum</p>
                    <p className="font-medium">{formatDate(expense.expenseDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fälligkeitsdatum</p>
                    <p className="font-medium">{formatDate(expense.dueDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kategorie</p>
                    <p className="font-medium">{expense.category?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kostenstelle</p>
                    <p className="font-medium">
                      {expense.costCenter ? `${expense.costCenter.code} - ${expense.costCenter.name}` : '-'}
                    </p>
                  </div>
                </div>
                {expense.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Notizen</p>
                    <p className="mt-1">{expense.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Receipt Section */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Beleg</CardTitle>
                  {!expense.receiptUrl && canEdit && (
                    <Button variant="outline" size="sm" onClick={() => setReceiptDialog(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Beleg hochladen
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {expense.receiptUrl ? (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Beleg vorhanden</p>
                        <p className="text-sm text-muted-foreground">
                          {expense.receiptUrl.split('/').pop()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <Button variant="outline" size="sm" asChild>
                        <a 
                          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/expenses/${expense.id}/receipt`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Anzeigen
                        </a>
                      </Button>
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => setReceiptDialog(true)}>
                          <Upload className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Kein Beleg hochgeladen</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle>Positionen</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pos.</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead className="text-right">Menge</TableHead>
                      <TableHead className="text-right">Einzelpreis</TableHead>
                      <TableHead className="text-right">MwSt.</TableHead>
                      <TableHead className="text-right">Gesamt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expense.items?.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
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
          </div>

          {/* Summary Sidebar */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Zusammenfassung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nettobetrag</span>
                    <span>{formatCurrency(expense.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">MwSt.</span>
                    <span>{formatCurrency(expense.taxAmount)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Gesamtbetrag</span>
                      <span>{formatCurrency(expense.total)}</span>
                    </div>
                  </div>
                </div>

                {expense.paidDate && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Bezahlt am</p>
                    <p className="font-medium">{formatDate(expense.paidDate)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <ReceiptUploadDialog
          open={receiptDialog}
          onOpenChange={setReceiptDialog}
          expenseId={expense.id}
          onUploadComplete={(updatedExpense) => {
            setExpense(updatedExpense);
            setReceiptDialog(false);
          }}
        />
      </div>
    );
  }

  // Edit Mode
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Ausgabe bearbeiten</h1>
          <p className="text-muted-foreground">{expense.expenseNumber}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Allgemeine Informationen</CardTitle>
              <CardDescription>Grundlegende Ausgabeninformationen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendorId">Lieferant</Label>
                  <Select
                    value={formData.vendorId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, vendorId: value })
                    }
                  >
                    <SelectTrigger id="vendorId">
                      <SelectValue placeholder="Lieferant wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Kein Lieferant</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendorInvoiceNumber">Rechnungsnummer</Label>
                  <Input
                    id="vendorInvoiceNumber"
                    value={formData.vendorInvoiceNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, vendorInvoiceNumber: e.target.value })
                    }
                    placeholder="RE-2024-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expenseDate">Ausgabendatum *</Label>
                  <Input
                    id="expenseDate"
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) =>
                      setFormData({ ...formData, expenseDate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Fälligkeitsdatum</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Kategorie</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value })
                    }
                  >
                    <SelectTrigger id="categoryId">
                      <SelectValue placeholder="Kategorie wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Keine Kategorie</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costCenterId">Kostenstelle</Label>
                  <Select
                    value={formData.costCenterId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, costCenterId: value })
                    }
                  >
                    <SelectTrigger id="costCenterId">
                      <SelectValue placeholder="Kostenstelle wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Keine Kostenstelle</SelectItem>
                      {costCenters.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.code} - {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Kurze Beschreibung der Ausgabe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notizen</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Zusätzliche Informationen"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Positionen</CardTitle>
                  <CardDescription>Einzelne Ausgabenpositionen</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Position hinzufügen
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Position {index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Beschreibung *</Label>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(index, 'description', e.target.value)
                      }
                      placeholder="Positionsbeschreibung"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Menge *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Einzelpreis *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>MwSt. %</Label>
                      <Select
                        value={item.taxRate.toString()}
                        onValueChange={(value) =>
                          updateLineItem(index, 'taxRate', parseFloat(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="7">7%</SelectItem>
                          <SelectItem value="19">19%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Aufwandskonto</Label>
                      <Select
                        value={item.accountId}
                        onValueChange={(value) =>
                          updateLineItem(index, 'accountId', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Konto wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Kein Konto</SelectItem>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountNumber} - {account.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Kostenstelle</Label>
                      <Select
                        value={item.costCenterId}
                        onValueChange={(value) =>
                          updateLineItem(index, 'costCenterId', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kostenstelle wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Keine Kostenstelle</SelectItem>
                          {costCenters.map((center) => (
                            <SelectItem key={center.id} value={center.id}>
                              {center.code} - {center.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Gesamt</div>
                      <div className="text-lg font-bold">
                        {formatCurrency(calculateLineTotal(item))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Zusammenfassung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nettobetrag</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">MwSt.</span>
                  <span>{formatCurrency(totals.taxAmount)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold">
                    <span>Gesamtbetrag</span>
                    <span>{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Button className="w-full" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Änderungen speichern
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsEditing(false)}
                >
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
