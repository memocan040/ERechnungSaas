'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Building2, Calendar, CreditCard, FileText, User } from 'lucide-react';
import type {
  IncomingInvoice,
  IncomingPaymentMethod,
  Vendor,
  ExpenseCategory,
  CostCenter,
  ChartOfAccount,
} from '@/types';
import { EingangItemEditor } from './eingang-item-editor';

interface FormData {
  vendorId?: string;
  vendorInvoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  vendorName?: string;
  vendorAddress?: string;
  vendorVatId?: string;
  vendorTaxNumber?: string;
  vendorIban?: string;
  vendorBic?: string;
  paymentReference?: string;
  paymentMethod?: IncomingPaymentMethod;
  categoryId?: string;
  costCenterId?: string;
  expenseAccountId?: string;
  description?: string;
  notes?: string;
}

interface EingangFormProps {
  invoice?: IncomingInvoice;
  vendors?: Vendor[];
  categories?: ExpenseCategory[];
  costCenters?: CostCenter[];
  accounts?: ChartOfAccount[];
  onSubmit: (data: FormData & { items: any[] }) => Promise<void>;
  isLoading?: boolean;
}

const paymentMethods: { value: IncomingPaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Überweisung' },
  { value: 'direct_debit', label: 'Lastschrift' },
  { value: 'cash', label: 'Bar' },
  { value: 'credit_card', label: 'Kreditkarte' },
  { value: 'debit_card', label: 'EC-Karte' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'other', label: 'Sonstige' },
];

export function EingangForm({
  invoice,
  vendors = [],
  categories = [],
  costCenters = [],
  accounts = [],
  onSubmit,
  isLoading = false,
}: EingangFormProps) {
  const [items, setItems] = useState<any[]>(
    invoice?.items?.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit || 'Stück',
      unitPrice: item.unitPrice,
      taxRate: item.taxRate || 19,
      accountId: item.accountId,
      costCenterId: item.costCenterId,
    })) || [
      {
        description: '',
        quantity: 1,
        unit: 'Stück',
        unitPrice: 0,
        taxRate: 19,
        accountId: '',
        costCenterId: '',
      },
    ]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      vendorId: invoice?.vendorId || '',
      vendorInvoiceNumber: invoice?.vendorInvoiceNumber || '',
      invoiceDate: invoice?.invoiceDate
        ? new Date(invoice.invoiceDate).toISOString().split('T')[0]
        : '',
      dueDate: invoice?.dueDate
        ? new Date(invoice.dueDate).toISOString().split('T')[0]
        : '',
      vendorName: invoice?.vendorName || '',
      vendorAddress: invoice?.vendorAddress || '',
      vendorVatId: invoice?.vendorVatId || '',
      vendorTaxNumber: invoice?.vendorTaxNumber || '',
      vendorIban: invoice?.vendorIban || '',
      vendorBic: invoice?.vendorBic || '',
      paymentReference: invoice?.paymentReference || '',
      paymentMethod: invoice?.paymentMethod || 'bank_transfer',
      categoryId: invoice?.categoryId || '',
      costCenterId: invoice?.costCenterId || '',
      expenseAccountId: invoice?.expenseAccountId || '',
      description: invoice?.description || '',
      notes: invoice?.notes || '',
    },
  });

  const selectedVendorId = watch('vendorId');

  // When vendor is selected, auto-fill vendor details
  useEffect(() => {
    if (selectedVendorId) {
      const vendor = vendors.find((v) => v.id === selectedVendorId);
      if (vendor) {
        setValue('vendorName', vendor.companyName);
        setValue('vendorVatId', vendor.vatId || '');
        setValue('vendorTaxNumber', vendor.taxNumber || '');
        setValue('vendorIban', vendor.iban || '');
        setValue('vendorBic', vendor.bic || '');
        const address = [
          vendor.street,
          vendor.houseNumber,
          vendor.postalCode,
          vendor.city,
        ]
          .filter(Boolean)
          .join(' ');
        setValue('vendorAddress', address);
      }
    }
  }, [selectedVendorId, vendors, setValue]);

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit({ ...data, items });
  };

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => {
      const subtotal = (item.quantity || 0) * (item.unitPrice || 0);
      const taxAmount = subtotal * ((item.taxRate || 19) / 100);
      return {
        subtotal: acc.subtotal + subtotal,
        taxAmount: acc.taxAmount + taxAmount,
        total: acc.total + subtotal + taxAmount,
      };
    },
    { subtotal: 0, taxAmount: 0, total: 0 }
  );

  // Filter expense accounts (accounts starting with 4xxx or 6xxx in SKR03)
  const expenseAccounts = accounts.filter(
    (a) =>
      a.accountType === 'expense' ||
      a.accountNumber.startsWith('4') ||
      a.accountNumber.startsWith('6')
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Vendor & Invoice Info */}
        <div className="space-y-6">
          {/* Vendor Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Lieferant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Bestehenden Lieferanten auswählen</Label>
                <Select
                  value={watch('vendorId') || ''}
                  onValueChange={(value) => setValue('vendorId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lieferant auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-- Keinen auswählen --</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.companyName} ({vendor.vendorNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="vendorName">Firmenname *</Label>
                  <Input
                    id="vendorName"
                    {...register('vendorName', { required: 'Firmenname ist erforderlich' })}
                    placeholder="Musterfirma GmbH"
                  />
                  {errors.vendorName && (
                    <p className="text-sm text-red-500 mt-1">{errors.vendorName.message}</p>
                  )}
                </div>

                <div className="col-span-2">
                  <Label htmlFor="vendorAddress">Adresse</Label>
                  <Input
                    id="vendorAddress"
                    {...register('vendorAddress')}
                    placeholder="Musterstraße 1, 12345 Musterstadt"
                  />
                </div>

                <div>
                  <Label htmlFor="vendorVatId">USt-IdNr.</Label>
                  <Input
                    id="vendorVatId"
                    {...register('vendorVatId')}
                    placeholder="DE123456789"
                  />
                </div>

                <div>
                  <Label htmlFor="vendorTaxNumber">Steuernummer</Label>
                  <Input
                    id="vendorTaxNumber"
                    {...register('vendorTaxNumber')}
                    placeholder="12/345/67890"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Rechnungsdetails
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendorInvoiceNumber">Lieferanten-Rechnungsnr.</Label>
                  <Input
                    id="vendorInvoiceNumber"
                    {...register('vendorInvoiceNumber')}
                    placeholder="RE-2024-001"
                  />
                </div>

                <div>
                  <Label htmlFor="invoiceDate">Rechnungsdatum</Label>
                  <Input id="invoiceDate" type="date" {...register('invoiceDate')} />
                </div>

                <div>
                  <Label htmlFor="dueDate">Fälligkeitsdatum</Label>
                  <Input id="dueDate" type="date" {...register('dueDate')} />
                </div>

                <div>
                  <Label htmlFor="paymentMethod">Zahlungsart</Label>
                  <Select
                    value={watch('paymentMethod') || 'bank_transfer'}
                    onValueChange={(value) =>
                      setValue('paymentMethod', value as IncomingPaymentMethod)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Kurze Beschreibung der Rechnung..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Payment & Accounting */}
        <div className="space-y-6">
          {/* Payment Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Zahlungsinformationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendorIban">IBAN</Label>
                  <Input
                    id="vendorIban"
                    {...register('vendorIban')}
                    placeholder="DE89 3704 0044 0532 0130 00"
                  />
                </div>

                <div>
                  <Label htmlFor="vendorBic">BIC</Label>
                  <Input
                    id="vendorBic"
                    {...register('vendorBic')}
                    placeholder="COBADEFFXXX"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="paymentReference">Verwendungszweck</Label>
                <Input
                  id="paymentReference"
                  {...register('paymentReference')}
                  placeholder="RE-2024-001"
                />
              </div>
            </CardContent>
          </Card>

          {/* Accounting */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Buchhaltung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Kategorie</Label>
                <Select
                  value={watch('categoryId') || ''}
                  onValueChange={(value) => setValue('categoryId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-- Keine --</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Kostenstelle</Label>
                <Select
                  value={watch('costCenterId') || ''}
                  onValueChange={(value) => setValue('costCenterId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kostenstelle auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-- Keine --</SelectItem>
                    {costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.code} - {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Aufwandskonto (für Buchung)</Label>
                <Select
                  value={watch('expenseAccountId') || ''}
                  onValueChange={(value) => setValue('expenseAccountId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Konto auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-- Kein Konto --</SelectItem>
                    {expenseAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.accountNumber} - {acc.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notizen</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="Interne Notizen..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Positionen</CardTitle>
        </CardHeader>
        <CardContent>
          <EingangItemEditor
            items={items}
            onChange={setItems}
            accounts={expenseAccounts}
            costCenters={costCenters}
          />
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Netto:</span>
                <span>
                  {totals.subtotal.toLocaleString('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">MwSt:</span>
                <span>
                  {totals.taxAmount.toLocaleString('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Gesamt:</span>
                <span>
                  {totals.total.toLocaleString('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Wird gespeichert...' : 'Speichern'}
        </Button>
      </div>
    </form>
  );
}
