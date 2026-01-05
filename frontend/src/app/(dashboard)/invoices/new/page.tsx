'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Customer, InvoiceItem } from '@/types';
import { invoicesApi, customersApi, settingsApi } from '@/lib/api';

interface InvoiceItemForm {
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

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [items, setItems] = useState<InvoiceItemForm[]>([
    { description: '', quantity: 1, unit: 'Stück', unitPrice: 0, taxRate: 19 },
  ]);

  useEffect(() => {
    loadCustomers();
    loadSettings();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await customersApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        setCustomers(response.data);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await settingsApi.get();
      if (response.success && response.data) {
        const settings = response.data;
        const due = new Date();
        due.setDate(due.getDate() + settings.defaultPaymentDays);
        setDueDate(due.toISOString().split('T')[0]);
        setItems([
          { description: '', quantity: 1, unit: 'Stück', unitPrice: 0, taxRate: settings.defaultTaxRate },
        ]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Set default due date if settings fail
      const due = new Date();
      due.setDate(due.getDate() + 14);
      setDueDate(due.toISOString().split('T')[0]);
    }
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
      alert('Bitte wählen Sie einen Kunden aus.');
      return;
    }

    if (items.some((item) => !item.description || item.unitPrice <= 0)) {
      alert('Bitte füllen Sie alle Positionen vollständig aus.');
      return;
    }

    setLoading(true);

    try {
      const response = await invoicesApi.create({
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

      if (response.success && response.data) {
        router.push(`/invoices/${response.data.id}`);
      } else {
        alert(response.error || 'Fehler beim Erstellen der Rechnung');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Fehler beim Erstellen der Rechnung');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Neue Rechnung</h1>
          <p className="text-muted-foreground">
            Erstellen Sie eine neue Rechnung.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Rechnungsdetails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Kunde *</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kunde auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Link href="/customers/new">
                      <Button variant="outline" type="button">
                        <Plus className="mr-2 h-4 w-4" />
                        Neuer Kunde
                      </Button>
                    </Link>
                  </div>
                </div>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Beschreibung</TableHead>
                      <TableHead>Menge</TableHead>
                      <TableHead>Einheit</TableHead>
                      <TableHead>Einzelpreis</TableHead>
                      <TableHead>MwSt.</TableHead>
                      <TableHead className="text-right">Gesamt</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            placeholder="Beschreibung"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-20"
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.unit}
                            onValueChange={(value) => updateItem(index, 'unit', value)}
                          >
                            <SelectTrigger className="w-24">
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
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-28"
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.taxRate.toString()}
                            onValueChange={(value) => updateItem(index, 'taxRate', parseFloat(value))}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="19">19%</SelectItem>
                              <SelectItem value="7">7%</SelectItem>
                              <SelectItem value="0">0%</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(calculateItemTotal(item))}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
          </div>

          <div className="space-y-6">
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Rechnung erstellen
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
