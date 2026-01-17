'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  incomingInvoicesApi,
  vendorsApi,
  expensesApi,
  accountingApi,
} from '@/lib/api';
import type { Vendor, ExpenseCategory, CostCenter, ChartOfAccount } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileInput, Upload, PenLine, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { EingangForm, EingangUploadDialog } from '@/components/eingang';

export default function NewEingangPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [vendorsRes, categoriesRes, costCentersRes, accountsRes] = await Promise.all([
        vendorsApi.getVendors({ limit: 100 }),
        expensesApi.getCategories(),
        expensesApi.getCostCenters(),
        accountingApi.getChartOfAccounts(),
      ]);

      setVendors(vendorsRes.data);
      setCategories(categoriesRes.data);
      setCostCenters(costCentersRes.data);
      setAccounts(accountsRes.data);
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

  const handleSubmit = async (data: any) => {
    setSaving(true);
    try {
      const result = await incomingInvoicesApi.createInvoice(data);
      if (result.success && result.data) {
        toast({
          title: 'Erfolg',
          description: 'Eingangsrechnung wurde erstellt',
        });
        router.push(`/eingang/${result.data.id}`);
      } else {
        throw new Error((result as any).error || 'Fehler beim Erstellen');
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Rechnung konnte nicht erstellt werden',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadComplete = (invoice: any) => {
    setUploadDialogOpen(false);
    router.push(`/eingang/${invoice.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/eingang">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileInput className="h-6 w-6" />
            Neue Eingangsrechnung
          </h1>
          <p className="text-muted-foreground">
            Laden Sie eine Rechnung hoch oder erfassen Sie sie manuell
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            Hochladen
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <PenLine className="h-4 w-4" />
            Manuell erfassen
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Rechnung hochladen</CardTitle>
              <CardDescription>
                Laden Sie eine PDF- oder Bilddatei hoch. Die Rechnungsdaten werden
                automatisch per OCR erkannt und können anschließend bearbeitet werden.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onClick={() => setUploadDialogOpen(true)}
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
              >
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  Klicken Sie hier, um eine Datei hochzuladen
                </p>
                <p className="text-sm text-muted-foreground">
                  Unterstützt PDF und Bilder (JPEG, PNG, TIFF) bis max. 10MB
                </p>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">OCR-Erkennung unterstützt:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Automatische Erkennung von Rechnungsnummer, Datum und Beträgen</li>
                  <li>Extraktion von Lieferantendaten (Name, Adresse, USt-IdNr.)</li>
                  <li>Erkennung von Bankverbindungsdaten (IBAN, BIC)</li>
                  <li>Deutsche Rechnungsformate (DD.MM.YYYY, EUR-Beträge)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Tab */}
        <TabsContent value="manual" className="mt-6">
          <EingangForm
            vendors={vendors}
            categories={categories}
            costCenters={costCenters}
            accounts={accounts}
            onSubmit={handleSubmit}
            isLoading={saving}
          />
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <EingangUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}
