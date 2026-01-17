'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, FileText, Euro, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Customer } from '@/types';
import { customersApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<{
    totalInvoices: number;
    totalRevenue: number;
    outstandingAmount: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
    country: '',
    vatId: '',
    customerNumber: '',
    notes: '',
    isActive: true,
  });

  useEffect(() => {
    loadCustomer();
    loadStats();
  }, [params.id]);

  const loadCustomer = async () => {
    try {
      const response = await customersApi.getById(params.id as string);
      if (response.success && response.data) {
        setCustomer(response.data);
        setFormData({
          companyName: response.data.companyName,
          contactName: response.data.contactName || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
          street: response.data.street || '',
          houseNumber: response.data.houseNumber || '',
          postalCode: response.data.postalCode || '',
          city: response.data.city || '',
          country: response.data.country || 'Deutschland',
          vatId: response.data.vatId || '',
          customerNumber: response.data.customerNumber || '',
          notes: response.data.notes || '',
          isActive: response.data.isActive,
        });
      }
    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await customersApi.getStats(params.id as string);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Firmennamen ein.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const response = await customersApi.update(params.id as string, formData);

      if (response.success) {
        toast({
          title: "Erfolg",
          description: "Kunde wurde erfolgreich aktualisiert.",
        });
        router.push('/customers');
      } else {
        toast({
          title: "Fehler",
          description: response.error || 'Fehler beim Speichern',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
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

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Kunde nicht gefunden</h2>
        <Link href="/customers">
          <Button className="mt-4">Zurück zur Übersicht</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{customer.companyName}</h1>
          <p className="text-muted-foreground">
            Kunde bearbeiten
          </p>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rechnungen</p>
                  <p className="text-2xl font-bold">{stats.totalInvoices}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-500/10 p-3">
                  <Euro className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gesamtumsatz</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-orange-500/10 p-3">
                  <TrendingUp className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Offene Beträge</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.outstandingAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Grunddaten</CardTitle>
              <CardDescription>Firmendaten und Ansprechpartner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Firmenname *</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Ansprechpartner</Label>
                <Input
                  id="contactName"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customerNumber">Kundennummer</Label>
                  <Input
                    id="customerNumber"
                    name="customerNumber"
                    value={formData.customerNumber}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vatId">USt-IdNr.</Label>
                  <Input
                    id="vatId"
                    name="vatId"
                    value={formData.vatId}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-4">
                <div>
                  <Label htmlFor="isActive">Aktiver Kunde</Label>
                  <p className="text-sm text-muted-foreground">
                    Inaktive Kunden werden bei der Rechnungserstellung ausgeblendet.
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adresse</CardTitle>
              <CardDescription>Anschrift des Kunden</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="sm:col-span-3 space-y-2">
                  <Label htmlFor="street">Straße</Label>
                  <Input
                    id="street"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="houseNumber">Nr.</Label>
                  <Input
                    id="houseNumber"
                    name="houseNumber"
                    value={formData.houseNumber}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">PLZ</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="city">Stadt</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Land</Label>
                <Input
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Notizen</CardTitle>
              <CardDescription>Zusätzliche Informationen zum Kunden</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Interne Notizen..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Änderungen speichern
          </Button>
        </div>
      </form>
    </div>
  );
}
