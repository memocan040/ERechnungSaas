'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Trash2 } from 'lucide-react';
import type { ChartOfAccount, CostCenter } from '@/types';

interface Item {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  accountId?: string;
  costCenterId?: string;
}

interface EingangItemEditorProps {
  items: Item[];
  onChange: (items: Item[]) => void;
  accounts?: ChartOfAccount[];
  costCenters?: CostCenter[];
}

const units = [
  { value: 'Stück', label: 'Stück' },
  { value: 'Stunde', label: 'Stunde' },
  { value: 'Tag', label: 'Tag' },
  { value: 'Monat', label: 'Monat' },
  { value: 'Pauschal', label: 'Pauschal' },
  { value: 'kg', label: 'kg' },
  { value: 'm', label: 'm' },
  { value: 'm²', label: 'm²' },
  { value: 'Liter', label: 'Liter' },
];

const taxRates = [
  { value: 0, label: '0%' },
  { value: 7, label: '7%' },
  { value: 19, label: '19%' },
];

export function EingangItemEditor({
  items,
  onChange,
  accounts = [],
  costCenters = [],
}: EingangItemEditorProps) {
  const handleItemChange = (index: number, field: keyof Item, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const addItem = () => {
    onChange([
      ...items,
      {
        description: '',
        quantity: 1,
        unit: 'Stück',
        unitPrice: 0,
        taxRate: 19,
        accountId: '',
        costCenterId: '',
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      onChange(newItems);
    }
  };

  const calculateItemTotal = (item: Item) => {
    const subtotal = (item.quantity || 0) * (item.unitPrice || 0);
    const taxAmount = subtotal * ((item.taxRate || 0) / 100);
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead className="min-w-[200px]">Beschreibung</TableHead>
              <TableHead className="w-24">Menge</TableHead>
              <TableHead className="w-28">Einheit</TableHead>
              <TableHead className="w-28">Einzelpreis</TableHead>
              <TableHead className="w-24">MwSt</TableHead>
              <TableHead className="w-32">Konto</TableHead>
              <TableHead className="w-28 text-right">Gesamt</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const totals = calculateItemTotal(item);
              return (
                <TableRow key={index}>
                  <TableCell className="font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        handleItemChange(index, 'description', e.target.value)
                      }
                      placeholder="Beschreibung..."
                      className="min-w-[200px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.unit}
                      onValueChange={(value) => handleItemChange(index, 'unit', value)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                      className="w-28"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={String(item.taxRate)}
                      onValueChange={(value) =>
                        handleItemChange(index, 'taxRate', parseFloat(value))
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {taxRates.map((rate) => (
                          <SelectItem key={rate.value} value={String(rate.value)}>
                            {rate.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.accountId || ''}
                      onValueChange={(value) => handleItemChange(index, 'accountId', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Konto..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Kein Konto --</SelectItem>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.accountNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {totals.total.toLocaleString('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-2" />
        Position hinzufügen
      </Button>
    </div>
  );
}
