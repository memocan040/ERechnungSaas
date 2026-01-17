'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Customer, Company, Invoice } from '@/types';
import { invoicesApi, companyApi } from '@/lib/api';
import { InvoicePreview } from '@/components/invoice/invoice-preview';
import { CustomerSelector } from '@/components/form/customer-selector';
import { useToast } from '@/hooks/use-toast';

interface InvoiceItemForm {
  id?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const invoiceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [company, setCompany] = useState<Company | undefined>(undefined);
  const [items, setItems] = useState<InvoiceItemForm[]>([]);

  useEffect(() => {
    loadInvoice();
    loadCompany();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoicesApi.getById(invoiceId);
      if (response.success && response.data) {
        const inv = response.data;
        setInvoice(inv);

        // Only allow editing draft invoices
        if (inv.status !== 'draft') {
          toast({
            title: 'Nicht bearbeitbar',
            description: 'Nur Rechnungen im Entwurf-Status können bearbeitet werden.',
            variant: 'destructive',
          });
          router.push(`/invoices/${invoiceId}`);
          return;
        }

        // Populate form fields
        setSelectedCustomerId(inv.customerId);
        setSelectedCustomer(inv.customer);
        setIssueDate(inv.issueDate?.split('T')[0] || '');
        setDueDate(inv.dueDate?.split('T')[0] || '');
        setNotes(inv.notes || '');
        setPaymentTerms(inv.paymentTerms || '');

        // Populate items
        if (inv.items && inv.items.length > 0) {
          setItems(inv.items.map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
          })));
        } else {
          setItems([{ description: '', quantity: 1, unit: 'Stück', unitPrice: 0, taxRate: 19 }]);
        }
      } else {
        toast({
          title: 'Fehler',
          description: 'Rechnung konnte nicht geladen werden.',
          variant: 'destructive',
        });
        router.push('/invoices');
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast({
        title: 'Fehler',
        description: 'Rechnung konnte nicht geladen werden.',
        variant: 'destructive',
      });
      router.push('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const loadCompany = async () => {
    try {
      const response = await companyApi.get();
      if (response.success && response.data) {
        setCompany(response.data);
      }
    } catch (error) {
      console.error('Error loading company:', error);
    }
  };

  const handleCustomerChange = (id: string, customer?: Customer) => {
    setSelectedCustomerId(id);
    setSelectedCustomer(customer);
  };

  const addItem = () => {
    setItems([
      ...items,
      { description: '', quantity: 1, unit: 'Stück', unitPrice: 0, taxRate: 19 },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItemForm, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateItemTotal = (item: InvoiceItemForm) => {
    const subtotal = item.quantity * item.unitPrice;
    const tax = subtotal * (item.taxRate / 100);
    return subtotal + tax;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    items.forEach((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      subtotal += itemSubtotal;
      taxAmount += itemSubtotal * (item.taxRate / 100);
    });

    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie einen Kunden aus.',
        variant: 'destructive',
      });
      return;
    }

    if (items.some((item) => !item.description || item.unitPrice <= 0)) {
      toast({
        title: 'Fehler',
        description: 'Bitte füllen Sie alle Positionen vollständig aus.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const response = await invoicesApi.update(invoiceId, {
        customerId: selectedCustomerId,
        issueDate,
        dueDate,
        notes: notes || undefined,
        paymentTerms: paymentTerms || undefined,
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
        })),
      });

      if (response.success) {
        toast({
          title: 'Erfolg',
          description: 'Rechnung wurde gespeichert.',
        });
        router.push(`/invoices/${invoiceId}`);
      } else {
        toast({
          title: 'Fehler',
          description: response.error || 'Fehler beim Speichern der Rechnung.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast({
        title: 'Fehler',
        description: 'Fehler beim Speichern der Rechnung.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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

  const totals = calculateTotals();

  const previewInvoice = {
    invoiceNumber: invoice.invoiceNumber,
    status: 'draft' as const,
    issueDate,
    dueDate,
    items: items,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    total: totals.total,
    customer: selectedCustomer,
    company: company,
    notes,
    paymentTerms
  };

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center gap-4 flex-none">
        <Link href={`/invoices/${invoiceId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rechnung bearbeiten</h1>
          <p className="text-muted-foreground">
            {invoice.invoiceNumber}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="overflow-y-auto pr-2 pb-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Rechnungsdetails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CustomerSelector
                  value={selectedCustomerId}
                  onChange={handleCustomerChange}
                  required
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Rechnungsdatum *</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Fälligkeitsdatum *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Positionen</CardTitle>
                <Button variant="outline" size="sm" type="button" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Position hinzufügen
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="grid gap-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-6 space-y-2">
                          <Label>Beschreibung</Label>
                          <Input
                            placeholder="Artikel oder Dienstleistung"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            required
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>Menge</Label>
                          <Input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            required
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>Einheit</Label>
                          <Select
                            value={item.unit}
                            onValueChange={(value) => updateItem(index, 'unit', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Stück">Stück</SelectItem>
                              <SelectItem value="Stunde">Stunde</SelectItem>
                              <SelectItem value="Tag">Tag</SelectItem>
                              <SelectItem value="Monat">Monat</SelectItem>
                              <SelectItem value="Pauschal">Pauschal</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="m">m</SelectItem>
                              <SelectItem value="m²">m²</SelectItem>
                              <SelectItem value="Liter">Liter</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2 flex items-end justify-end">
                           <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                            className="text-destructive hover:text-destructive/90"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-4 space-y-2">
                           <Label>Einzelpreis (€)</Label>
                           <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            required
                          />
                        </div>
                        <div className="md:col-span-4 space-y-2">
                          <Label>MwSt. (%)</Label>
                          <Select
                            value={item.taxRate.toString()}
                            onValueChange={(value) => updateItem(index, 'taxRate', parseFloat(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="19">19%</SelectItem>
                              <SelectItem value="7">7%</SelectItem>
                              <SelectItem value="0">0%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                         <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-2 pt-6">
                            <span className="text-muted-foreground text-sm">Gesamt:</span>
                            <span className="font-semibold">{formatCurrency(calculateItemTotal(item))}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Zusätzliche Informationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Zahlungsbedingungen</Label>
                  <Input
                    id="paymentTerms"
                    placeholder="z.B. Zahlbar innerhalb von 14 Tagen ohne Abzug"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Hinweise</Label>
                  <Textarea
                    id="notes"
                    placeholder="Zusätzliche Hinweise für den Kunden..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

             <Card>
              <CardHeader>
                <CardTitle>Zusammenfassung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zwischensumme (netto)</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MwSt.</span>
                  <span>{formatCurrency(totals.taxAmount)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Gesamtbetrag</span>
                    <span>{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Änderungen speichern
            </Button>
          </form>
        </div>

        {/* Right Column - Live Preview */}
        <div className="hidden lg:block bg-muted/30 rounded-lg border p-4 overflow-hidden h-full flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
             <Eye className="h-4 w-4" />
             <span className="font-medium text-sm">Live-Vorschau</span>
          </div>
          <div className="flex-1 bg-background rounded-md shadow-sm overflow-hidden border">
             <InvoicePreview invoiceData={previewInvoice} />
          </div>
        </div>
      </div>
    </div>
  );
}
