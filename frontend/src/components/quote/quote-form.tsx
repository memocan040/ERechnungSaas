'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Eye } from 'lucide-react';
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
import { Quote, Customer, Company } from '@/types';
import { quotesApi, settingsApi, companyApi } from '@/lib/api';
import { QuotePreview } from './quote-preview';
import { CustomerSelector } from '@/components/form/customer-selector';

interface QuoteItemForm {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
}

interface QuoteFormProps {
  initialData?: Quote;
  isEditing?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function QuoteForm({ initialData, isEditing = false }: QuoteFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialData?.customerId || '');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(initialData?.customer);
  const [issueDate, setIssueDate] = useState(
    initialData?.issueDate 
      ? new Date(initialData.issueDate).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]
  );
  const [validUntil, setValidUntil] = useState(
    initialData?.validUntil 
      ? new Date(initialData.validUntil).toISOString().split('T')[0] 
      : ''
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [termsConditions, setTermsConditions] = useState(initialData?.termsConditions || '');
  const [company, setCompany] = useState<Company | undefined>(initialData?.company);
  
  const [items, setItems] = useState<QuoteItemForm[]>(
    initialData?.items?.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
    })) || [{ description: '', quantity: 1, unit: 'Stück', unitPrice: 0, taxRate: 19 }]
  );

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await settingsApi.get();
        if (response.success && response.data) {
          const settings = response.data;
          const valid = new Date();
          valid.setDate(valid.getDate() + 30); // Default 30 days validity
          setValidUntil(valid.toISOString().split('T')[0]);
          
          setItems([
            { description: '', quantity: 1, unit: 'Stück', unitPrice: 0, taxRate: settings.defaultTaxRate },
          ]);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        const valid = new Date();
        valid.setDate(valid.getDate() + 30);
        setValidUntil(valid.toISOString().split('T')[0]);
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

    if (!initialData) {
      loadSettings();
      loadCompany();
    } else {
      if (!company) loadCompany();
    }
  }, [initialData, company]);

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

  const updateItem = (index: number, field: keyof QuoteItemForm, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateItemTotal = (item: QuoteItemForm) => {
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
      const quoteData = {
        customerId: selectedCustomerId,
        issueDate,
        validUntil,
        notes: notes || undefined,
        termsConditions: termsConditions || undefined,
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
        })),
      };

      let response;
      if (isEditing && initialData) {
        response = await quotesApi.update(initialData.id, quoteData);
      } else {
        response = await quotesApi.create(quoteData);
      }

      if (response.success && response.data) {
        router.push('/quotes'); // Or redirect to view page: `/quotes/${response.data.id}`
      } else {
        alert(response.error || 'Fehler beim Speichern des Angebots');
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      alert('Fehler beim Speichern des Angebots');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();
  
  // Use selectedCustomer from state
  const previewCustomer = selectedCustomer || (initialData?.customerId === selectedCustomerId ? initialData?.customer : undefined);

  const previewQuote = {
    quoteNumber: initialData?.quoteNumber || 'VORSCHAU',
    status: (initialData?.status || 'draft') as Quote['status'],
    issueDate,
    validUntil,
    items: items,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    total: totals.total,
    customer: previewCustomer,
    company: company,
    notes,
    termsConditions
  };

  return (
    <div className="flex-1 min-h-0 grid lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="overflow-y-auto pr-2 pb-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Angebotsdetails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CustomerSelector 
                  value={selectedCustomerId} 
                  onChange={handleCustomerChange} 
                  required 
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Angebotsdatum *</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Gültig bis *</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
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
                  <Label htmlFor="termsConditions">Bedingungen</Label>
                  <Input
                    id="termsConditions"
                    placeholder="z.B. Gültig für 30 Tage"
                    value={termsConditions}
                    onChange={(e) => setTermsConditions(e.target.value)}
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditing ? 'Angebot aktualisieren' : 'Angebot erstellen'}
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
             <QuotePreview quoteData={previewQuote} />
          </div>
        </div>
      </div>
  );
}
