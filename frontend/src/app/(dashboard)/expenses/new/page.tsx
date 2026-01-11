'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { expensesApi, vendorsApi, accountingApi } from '@/lib/api';
import type { Vendor, ExpenseCategory, CostCenter, ChartOfAccount } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface ExpenseLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  accountId: string;
  costCenterId: string;
}

export default function NewExpensePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    vendorId: '',
    vendorInvoiceNumber: '',
    expenseDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    categoryId: '',
    costCenterId: '',
    description: '',
    notes: '',
  });

  const [lineItems, setLineItems] = useState<ExpenseLineItem[]>([
    {
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 19,
      accountId: '',
      costCenterId: '',
    },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vendorsResponse, categoriesResponse, costCentersResponse, accountsResponse] =
        await Promise.all([
          vendorsApi.getVendors({ limit: 100 }),
          expensesApi.getCategories(),
          expensesApi.getCostCenters(),
          accountingApi.getAccounts({ accountType: 'expense' }),
        ]);

      setVendors(vendorsResponse.data || []);
      setCategories(categoriesResponse.data || []);
      setCostCenters(costCentersResponse.data || []);
      setAccounts(accountsResponse.data || []);
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

    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  };

  const handleSubmit = async () => {
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

    try {
      await expensesApi.createExpense({
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

      toast({
        title: 'Erfolg',
        description: 'Ausgabe wurde erstellt',
      });

      router.push('/expenses');
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Ausgabe konnte nicht erstellt werden',
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

  const totals = calculateTotals();

  if (loading) {
    return <div className="text-center py-8">Lädt...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/expenses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Neue Ausgabe</h1>
          <p className="text-muted-foreground">Erfassen Sie eine neue Geschäftsausgabe</p>
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
                <Button className="w-full" onClick={handleSubmit}>
                  <Save className="h-4 w-4 mr-2" />
                  Ausgabe speichern
                </Button>
                <Link href="/expenses" className="block">
                  <Button variant="outline" className="w-full">
                    Abbrechen
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
