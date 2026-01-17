'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2, CheckCircle2, X, Image, File } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { incomingInvoicesApi } from '@/lib/api';
import type { IncomingInvoice, OcrExtractedData } from '@/types';

interface EingangUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (invoice: IncomingInvoice, ocrData: OcrExtractedData) => void;
}

type DialogState = 'idle' | 'uploading' | 'success' | 'error';

export function EingangUploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: EingangUploadDialogProps) {
  const router = useRouter();
  const [state, setState] = useState<DialogState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<IncomingInvoice | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);

  const reset = useCallback(() => {
    setState('idle');
    setSelectedFile(null);
    setError('');
    setCreatedInvoice(null);
    setOcrConfidence(0);
  }, []);

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Nur PDF- und Bilddateien (JPEG, PNG, TIFF, WebP) sind erlaubt');
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Datei ist zu groß (max. 10MB)');
      return false;
    }

    return true;
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!validateFile(file)) {
      return;
    }

    setSelectedFile(file);
    setError('');
    setState('uploading');

    try {
      const result = await incomingInvoicesApi.uploadFile(file);

      if (result.success && result.data) {
        setCreatedInvoice(result.data.invoice);
        setOcrConfidence(result.data.ocrResult.confidence);
        setState('success');

        if (onUploadComplete) {
          onUploadComplete(result.data.invoice, result.data.ocrResult.extractedData);
        }
      } else {
        setError((result as any).error || 'Fehler beim Hochladen der Datei');
        setState('error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Hochladen der Datei');
      setState('error');
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClose = () => {
    if (state === 'success' && createdInvoice) {
      router.push(`/eingang/${createdInvoice.id}`);
    }
    reset();
    onOpenChange(false);
  };

  const handleBack = () => {
    reset();
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="h-8 w-8" />;
    }
    return <Image className="h-8 w-8" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {state === 'idle' && 'Eingangsrechnung hochladen'}
            {state === 'uploading' && 'Wird verarbeitet...'}
            {state === 'success' && 'Hochladen erfolgreich'}
            {state === 'error' && 'Fehler'}
          </DialogTitle>
          <DialogDescription>
            {state === 'idle' &&
              'Laden Sie eine PDF- oder Bilddatei hoch. Die Daten werden automatisch per OCR erkannt.'}
            {state === 'uploading' &&
              'Die Datei wird hochgeladen und die Rechnungsdaten werden per OCR extrahiert.'}
            {state === 'success' && 'Die Rechnung wurde erfolgreich erstellt.'}
            {state === 'error' && 'Beim Hochladen ist ein Fehler aufgetreten.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Idle State - File Upload */}
          {state === 'idle' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.jpg,.jpeg,.png,.tiff,.webp,application/pdf,image/*';
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files && files.length > 0) {
                    handleFileSelect(files[0]);
                  }
                };
                input.click();
              }}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                Datei hierher ziehen oder klicken zum Auswählen
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Unterstützt PDF und Bilder (JPEG, PNG, TIFF, WebP) bis max. 10MB
              </p>
              <div className="flex gap-2 justify-center text-muted-foreground">
                <FileText className="h-5 w-5" />
                <span className="text-sm">PDF</span>
                <span className="mx-2">|</span>
                <Image className="h-5 w-5" />
                <span className="text-sm">Bilder</span>
              </div>
            </div>
          )}

          {/* Uploading State */}
          {state === 'uploading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium mb-2">Wird verarbeitet...</p>
              {selectedFile && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  {getFileIcon(selectedFile)}
                  <span className="text-sm">{selectedFile.name}</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                Die OCR-Erkennung kann einen Moment dauern
              </p>
            </div>
          )}

          {/* Success State */}
          {state === 'success' && createdInvoice && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
              <p className="text-xl font-medium mb-2">Erfolgreich verarbeitet!</p>
              <p className="text-sm text-muted-foreground mb-4">
                Rechnungsnummer: {createdInvoice.invoiceNumber}
              </p>
              <div className="bg-muted rounded-lg p-4 w-full max-w-sm">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">OCR-Konfidenz:</span>
                  <span
                    className={
                      ocrConfidence >= 80
                        ? 'text-green-600 font-medium'
                        : ocrConfidence >= 50
                          ? 'text-yellow-600 font-medium'
                          : 'text-red-600 font-medium'
                    }
                  >
                    {ocrConfidence.toFixed(0)}%
                  </span>
                </div>
                {createdInvoice.vendorName && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Lieferant:</span>
                    <span className="font-medium">{createdInvoice.vendorName}</span>
                  </div>
                )}
                {createdInvoice.total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Betrag:</span>
                    <span className="font-medium">
                      {createdInvoice.total.toLocaleString('de-DE', {
                        style: 'currency',
                        currency: createdInvoice.currency || 'EUR',
                      })}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Bitte überprüfen Sie die erkannten Daten und ergänzen Sie fehlende Informationen.
              </p>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="flex flex-col items-center justify-center py-12">
              <X className="h-16 w-16 text-red-600 mb-4" />
              <p className="text-xl font-medium mb-2">Fehler beim Hochladen</p>
              <p className="text-sm text-red-600 text-center max-w-md">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {state === 'idle' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
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
            <Button onClick={handleClose}>Zur Rechnung</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
