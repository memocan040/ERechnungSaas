'use client';

import { useState, useEffect } from 'react';
import { Save, Upload, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Company } from '@/types';
import { companyApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function CompanyPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
    country: 'Deutschland',
    vatId: '',
    taxNumber: '',
    tradeRegister: '',
    court: '',
    managingDirector: '',
    phone: '',
    email: '',
    website: '',
    bankName: '',
    iban: '',
    bic: '',
  });

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const response = await companyApi.get();
      if (response.success && response.data) {
        setCompany(response.data);
        setFormData({
          name: response.data.name || '',
          legalName: response.data.legalName || '',
          street: response.data.street || '',
          houseNumber: response.data.houseNumber || '',
          postalCode: response.data.postalCode || '',
          city: response.data.city || '',
          country: response.data.country || 'Deutschland',
          vatId: response.data.vatId || '',
          taxNumber: response.data.taxNumber || '',
          tradeRegister: response.data.tradeRegister || '',
          court: response.data.court || '',
          managingDirector: response.data.managingDirector || '',
          phone: response.data.phone || '',
          email: response.data.email || '',
          website: response.data.website || '',
          bankName: response.data.bankName || '',
          iban: response.data.iban || '',
          bic: response.data.bic || '',
        });
      }
    } catch (error) {
      console.error('Error loading company:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie einen Firmennamen ein.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const response = await companyApi.update(formData);

      if (response.success) {
        setCompany(response.data || null);
        toast({
          title: 'Erfolg',
          description: 'Unternehmensdaten gespeichert',
        });
      } else {
        toast({
          title: 'Fehler',
          description: response.error || 'Fehler beim Speichern',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving company:', error);
      toast({
        title: 'Fehler',
        description: 'Fehler beim Speichern',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await companyApi.uploadLogo(file);
      if (response.success && response.data) {
        setCompany(response.data);
        toast({
          title: 'Erfolg',
          description: 'Logo hochgeladen',
        });
      } else {
        toast({
          title: 'Fehler',
          description: response.error || 'Fehler beim Hochladen',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Fehler',
        description: 'Fehler beim Hochladen',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Unternehmen</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Ihre Unternehmensdaten für Rechnungen.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Firmendaten</CardTitle>
              <CardDescription>Diese Daten erscheinen auf Ihren Rechnungen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Firmenname *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalName">Rechtsform / Vollständiger Name</Label>
                <Input
                  id="legalName"
                  name="legalName"
                  value={formData.legalName}
                  onChange={handleChange}
                  placeholder="z.B. Max Mustermann GmbH"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="managingDirector">Geschäftsführer</Label>
                <Input
                  id="managingDirector"
                  name="managingDirector"
                  value={formData.managingDirector}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tradeRegister">Handelsregister</Label>
                  <Input
                    id="tradeRegister"
                    name="tradeRegister"
                    value={formData.tradeRegister}
                    onChange={handleChange}
                    placeholder="HRB 12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="court">Registergericht</Label>
                  <Input
                    id="court"
                    name="court"
                    value={formData.court}
                    onChange={handleChange}
                    placeholder="Amtsgericht München"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adresse</CardTitle>
              <CardDescription>Geschäftsadresse</CardDescription>
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

          <Card>
            <CardHeader>
              <CardTitle>Kontakt</CardTitle>
              <CardDescription>Kontaktdaten</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
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
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://www.example.de"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Steuerdaten</CardTitle>
              <CardDescription>Steuerliche Angaben</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vatId">USt-IdNr.</Label>
                <Input
                  id="vatId"
                  name="vatId"
                  value={formData.vatId}
                  onChange={handleChange}
                  placeholder="DE123456789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxNumber">Steuernummer</Label>
                <Input
                  id="taxNumber"
                  name="taxNumber"
                  value={formData.taxNumber}
                  onChange={handleChange}
                  placeholder="123/456/78901"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bankverbindung</CardTitle>
              <CardDescription>Für Zahlungsanweisungen auf Rechnungen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  name="iban"
                  value={formData.iban}
                  onChange={handleChange}
                  placeholder="DE89 3704 0044 0532 0130 00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bic">BIC</Label>
                <Input
                  id="bic"
                  name="bic"
                  value={formData.bic}
                  onChange={handleChange}
                  placeholder="COBADEFFXXX"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Firmenlogo</CardTitle>
              <CardDescription>Logo für Rechnungen (max. 5MB)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {company?.logoUrl && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'}${company.logoUrl}`}
                    alt="Logo"
                    className="max-h-24 object-contain"
                  />
                </div>
              )}
              <div className="flex items-center gap-4">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('logo')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Logo hochladen
                </Button>
              </div>
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
            Speichern
          </Button>
        </div>
      </form>
    </div>
  );
}
