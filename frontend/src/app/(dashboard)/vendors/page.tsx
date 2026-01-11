'use client';

import { useEffect, useState } from 'react';
import { vendorsApi } from '@/lib/api';
import type { Vendor, CreateVendorData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Building2, Mail, Phone, MapPin, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<CreateVendorData>({
    vendorNumber: '',
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
    country: 'DE',
    vatId: '',
    taxNumber: '',
    iban: '',
    bic: '',
    paymentTerms: '',
    defaultPaymentMethod: 'bank_transfer',
    notes: '',
  });

  useEffect(() => {
    loadVendors();
  }, [searchTerm]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const response = await vendorsApi.getVendors({
        search: searchTerm || undefined,
        limit: 100,
      });
      setVendors(response.data);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Lieferanten konnten nicht geladen werden',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async () => {
    try {
      await vendorsApi.createVendor(formData);
      toast({
        title: 'Erfolg',
        description: 'Lieferant wurde erstellt',
      });
      setIsCreateDialogOpen(false);
      resetForm();
      loadVendors();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Lieferant konnte nicht erstellt werden',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateVendor = async () => {
    if (!editingVendor) return;

    try {
      await vendorsApi.updateVendor(editingVendor.id, formData);
      toast({
        title: 'Erfolg',
        description: 'Lieferant wurde aktualisiert',
      });
      setEditingVendor(null);
      resetForm();
      loadVendors();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Lieferant konnte nicht aktualisiert werden',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!confirm('Möchten Sie diesen Lieferanten wirklich löschen?')) return;

    try {
      await vendorsApi.deleteVendor(id);
      toast({
        title: 'Erfolg',
        description: 'Lieferant wurde gelöscht',
      });
      loadVendors();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Lieferant konnte nicht gelöscht werden',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      vendorNumber: '',
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
      country: 'DE',
      vatId: '',
      taxNumber: '',
      iban: '',
      bic: '',
      paymentTerms: '',
      defaultPaymentMethod: 'bank_transfer',
      notes: '',
    });
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendorNumber: vendor.vendorNumber,
      companyName: vendor.companyName,
      contactName: vendor.contactName || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      street: vendor.street || '',
      houseNumber: vendor.houseNumber || '',
      postalCode: vendor.postalCode || '',
      city: vendor.city || '',
      country: vendor.country,
      vatId: vendor.vatId || '',
      taxNumber: vendor.taxNumber || '',
      iban: vendor.iban || '',
      bic: vendor.bic || '',
      paymentTerms: vendor.paymentTerms || '',
      defaultPaymentMethod: vendor.defaultPaymentMethod,
      notes: vendor.notes || '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lieferanten</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Lieferanten</p>
        </div>
        <Dialog
          open={isCreateDialogOpen || !!editingVendor}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setEditingVendor(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Neuer Lieferant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVendor ? 'Lieferant bearbeiten' : 'Neuer Lieferant'}
              </DialogTitle>
              <DialogDescription>
                Erfassen Sie die Lieferantendaten
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendorNumber">Lieferantennummer *</Label>
                  <Input
                    id="vendorNumber"
                    value={formData.vendorNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, vendorNumber: e.target.value })
                    }
                    placeholder="L-00001"
                    disabled={!!editingVendor}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Firmenname *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    placeholder="Lieferant GmbH"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Ansprechpartner</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) =>
                      setFormData({ ...formData, contactName: e.target.value })
                    }
                    placeholder="Max Mustermann"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="info@lieferant.de"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+49 123 456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Land</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    placeholder="DE"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="street">Straße</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) =>
                      setFormData({ ...formData, street: e.target.value })
                    }
                    placeholder="Musterstraße"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="houseNumber">Nr.</Label>
                  <Input
                    id="houseNumber"
                    value={formData.houseNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, houseNumber: e.target.value })
                    }
                    placeholder="123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">PLZ</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    placeholder="12345"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="city">Stadt</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="Berlin"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vatId">USt-IdNr.</Label>
                  <Input
                    id="vatId"
                    value={formData.vatId}
                    onChange={(e) =>
                      setFormData({ ...formData, vatId: e.target.value })
                    }
                    placeholder="DE123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxNumber">Steuernummer</Label>
                  <Input
                    id="taxNumber"
                    value={formData.taxNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, taxNumber: e.target.value })
                    }
                    placeholder="12/345/67890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={formData.iban}
                    onChange={(e) =>
                      setFormData({ ...formData, iban: e.target.value })
                    }
                    placeholder="DE89370400440532013000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bic">BIC</Label>
                  <Input
                    id="bic"
                    value={formData.bic}
                    onChange={(e) =>
                      setFormData({ ...formData, bic: e.target.value })
                    }
                    placeholder="COBADEFFXXX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Zahlungsbedingungen</Label>
                <Input
                  id="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentTerms: e.target.value })
                  }
                  placeholder="30 Tage netto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notizen</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Zusätzliche Informationen"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingVendor(null);
                  resetForm();
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={editingVendor ? handleUpdateVendor : handleCreateVendor}
                disabled={!formData.vendorNumber || !formData.companyName}
              >
                {editingVendor ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Lieferantenliste</CardTitle>
              <CardDescription>
                Übersicht aller Lieferanten
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Lädt...</div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Lieferanten gefunden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Firmenname</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">
                      {vendor.vendorNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{vendor.companyName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {vendor.email && (
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{vendor.email}</span>
                          </div>
                        )}
                        {vendor.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{vendor.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {vendor.city && (
                        <div className="flex items-center space-x-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {vendor.postalCode} {vendor.city}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                        {vendor.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(vendor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVendor(vendor.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
