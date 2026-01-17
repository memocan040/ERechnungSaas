'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Customer } from '@/types';
import { customersApi } from '@/lib/api';

interface CustomerSelectorProps {
  value?: string;
  onChange: (customerId: string, customer?: Customer) => void;
  label?: string;
  required?: boolean;
}

export function CustomerSelector({ value, onChange, label = "Kunde", required = false }: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCustomers = async () => {
      setLoading(true);
      try {
        const response = await customersApi.getAll({ limit: 100 });
        if (response.success && response.data) {
          setCustomers(response.data);
        }
      } catch (error) {
        console.error('Error loading customers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, []);

  const handleValueChange = (newValue: string) => {
    const selectedCustomer = customers.find(c => c.id === newValue);
    onChange(newValue, selectedCustomer);
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
           <Label>{label} {required && '*'}</Label>
           <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex items-end">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>{label} {required && '*'}</Label>
        <Select value={value} onValueChange={handleValueChange}>
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
        <Link href="/customers/new" className="w-full">
          <Button variant="outline" type="button" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Neuer Kunde
          </Button>
        </Link>
      </div>
    </div>
  );
}
