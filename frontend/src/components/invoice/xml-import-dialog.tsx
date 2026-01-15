'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2, CheckCircle2, X } from 'lucide-react';
import { XmlImportPreview } from './xml-import-preview';
import { useRouter } from 'next/navigation';
import { invoicesApi } from '@/lib/api/invoices';

interface XmlImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

type DialogState = 'idle' | 'parsing' | 'preview' | 'importing' | 'success' | 'error';

interface ParsedInvoiceData {
  invoice: {
    invoiceNumber: string;
    issueDate: Date | string;
    dueDate: Date | string;
    currency: string;
    subtotal: number;
    taxAmount: number;
    total: number;
    notes?: string;
    paymentTerms?: string;
  };
  customer: {
    companyName: string;
    street?: string;
    houseNumber?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    vatId?: string;
    email?: string;
    phone?: string;
    existingCustomerId?: string;
    isNewCustomer: boolean;
  };
  items: Array<{
    position: number;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    taxRate: number;
    subtotal: number;
    taxAmount: number;
    total: number;
  }>;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export function XmlImportDialog({ open, onOpenChange, onImportComplete }: XmlImportDialogProps) {
  const router = useRouter();
  const [state, setState] = useState<DialogState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedInvoiceData | null>(null);
  const [xmlContent, setXmlContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string>('');

  const reset = useCallback(() => {
    setState('idle');
    setSelectedFile(null);
    setParsedData(null);
    setXmlContent('');
    setError('');
    setCreatedInvoiceId('');
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    // Validate file
    if (!file.name.toLowerCase().endsWith('.xml')) {
      setError('Nur XML-Dateien sind erlaubt');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Datei ist zu groß (max. 5MB)');
      return;
    }

    setSelectedFile(file);
    setError('');
    handleParse(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleParse = async (file: File) => {
    setState('parsing');
    setError('');

    try {
      // Read file content
      const content = await file.text();
      setXmlContent(content);

      // Parse XML
      const result = await invoicesApi.parseXml(file);

      if (result.success && result.data) {
        setParsedData(result.data);
        setState('preview');
      } else {
        setError(result.error || 'Fehler beim Parsen der XML-Datei');
        setState('error');
      }
    } catch (err) {
      console.error('Parse error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Parsen der XML-Datei');
      setState('error');
    }
  };

  const handleImport = async () => {
    if (!parsedData || !xmlContent) return;

    if (!parsedData.validation.isValid) {
      setError('Die Validierung ist fehlgeschlagen. Bitte beheben Sie die Fehler vor dem Import.');
      return;
    }

    setState('importing');
    setError('');

    try {
      const result = await invoicesApi.executeImport(xmlContent, parsedData);

      if (result.success && result.data?.invoice) {
        setCreatedInvoiceId(result.data.invoice.id);
        setState('success');
        setTimeout(() => {
          if (onImportComplete) {
            onImportComplete();
          }
        }, 1500);
      } else {
        setError(result.error || 'Fehler beim Importieren der Rechnung');
        setState('error');
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Importieren der Rechnung');
      setState('error');
    }
  };

  const handleClose = () => {
    if (state === 'success' && createdInvoiceId) {
      router.push(`/invoices/${createdInvoiceId}`);
    }
    reset();
    onOpenChange(false);
  };

  const handleBack = () => {
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {state === 'idle' && 'XML-Rechnung importieren'}
            {state === 'parsing' && 'XML wird geparst...'}
            {state === 'preview' && 'Vorschau'}
            {state === 'importing' && 'Import läuft...'}
            {state === 'success' && 'Import erfolgreich'}
            {state === 'error' && 'Fehler'}
          </DialogTitle>
          <DialogDescription>
            {state === 'idle' && 'Laden Sie eine ZUGFeRD 2.1 oder XRechnung 3.0 XML-Datei hoch'}
            {state === 'parsing' && 'Die XML-Datei wird analysiert und validiert'}
            {state === 'preview' && 'Überprüfen Sie die importierten Daten vor dem Import'}
            {state === 'importing' && 'Die Rechnung wird erstellt'}
            {state === 'success' && 'Die Rechnung wurde erfolgreich importiert'}
            {state === 'error' && 'Beim Import ist ein Fehler aufgetreten'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {/* Idle State - File Upload */}
          {state === 'idle' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragOver ? 'border-primary bg-primary/5' : 'border-gray-300'
              }`}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium mb-2">
                XML-Datei hierher ziehen oder klicken zum Auswählen
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Unterstützt ZUGFeRD 2.1 und XRechnung 3.0 (max. 5MB)
              </p>
              <Button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.xml';
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files && files.length > 0) {
                      handleFileSelect(files[0]);
                    }
                  };
                  input.click();
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                Datei auswählen
              </Button>
            </div>
          )}

          {/* Parsing State */}
          {state === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">XML wird geparst...</p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedFile?.name}
              </p>
            </div>
          )}

          {/* Preview State */}
          {state === 'preview' && parsedData && (
            <XmlImportPreview parsedData={parsedData} />
          )}

          {/* Importing State */}
          {state === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Rechnung wird importiert...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Bitte warten Sie einen Moment
              </p>
            </div>
          )}

          {/* Success State */}
          {state === 'success' && (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
              <p className="text-xl font-medium mb-2">Import erfolgreich!</p>
              <p className="text-sm text-muted-foreground">
                Die Rechnung wurde erfolgreich erstellt
              </p>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="flex flex-col items-center justify-center py-12">
              <X className="h-16 w-16 text-red-600 mb-4" />
              <p className="text-xl font-medium mb-2">Fehler</p>
              <p className="text-sm text-red-600 text-center max-w-md">
                {error}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {state === 'idle' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
          )}

          {state === 'preview' && (
            <>
              <Button variant="outline" onClick={handleBack}>
                Zurück
              </Button>
              <Button
                onClick={handleImport}
                disabled={!parsedData?.validation.isValid}
              >
                Importieren
              </Button>
            </>
          )}

          {state === 'error' && (
            <>
              <Button variant="outline" onClick={handleBack}>
                Erneut versuchen
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Schließen
              </Button>
            </>
          )}

          {state === 'success' && (
            <Button onClick={handleClose}>
              Zur Rechnung
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
