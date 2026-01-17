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
import { Upload, FileText, Loader2, CheckCircle2, X, Image } from 'lucide-react';
import { expensesApi } from '@/lib/api';
import type { Expense } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ReceiptUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string;
  onUploadComplete?: (expense: Expense) => void;
}

type DialogState = 'idle' | 'uploading' | 'success' | 'error';

export function ReceiptUploadDialog({
  open,
  onOpenChange,
  expenseId,
  onUploadComplete,
}: ReceiptUploadDialogProps) {
  const { toast } = useToast();
  const [state, setState] = useState<DialogState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  const reset = useCallback(() => {
    setState('idle');
    setSelectedFile(null);
    setError('');
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
      const result = await expensesApi.uploadReceipt(expenseId, file);

      if (result.success && result.data) {
        setState('success');
        toast({
          title: "Erfolg",
          description: "Beleg wurde erfolgreich hochgeladen.",
        });
        if (onUploadComplete) {
          onUploadComplete(result.data);
        }
      } else {
        setError(result.message || 'Fehler beim Hochladen der Datei');
        setState('error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Fehler beim Hochladen der Datei');
      setState('error');
    }
  }, [expenseId, onUploadComplete, toast]);

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
    reset();
    onOpenChange(false);
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="h-8 w-8" />;
    }
    return <Image className="h-8 w-8" />;
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if(!val) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {state === 'idle' && 'Beleg hochladen'}
            {state === 'uploading' && 'Wird hochgeladen...'}
            {state === 'success' && 'Upload erfolgreich'}
            {state === 'error' && 'Fehler'}
          </DialogTitle>
          <DialogDescription>
            {state === 'idle' &&
              'Laden Sie den Beleg als PDF oder Bilddatei hoch.'}
            {state === 'success' && 'Der Beleg wurde der Ausgabe hinzugefügt.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Idle State - File Upload */}
          {state === 'idle' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
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
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-base font-medium mb-2">
                Datei hierher ziehen oder klicken
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                PDF, JPG, PNG (max. 10MB)
              </p>
            </div>
          )}

          {/* Uploading State */}
          {state === 'uploading' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-base font-medium mb-2">Wird hochgeladen...</p>
              {selectedFile && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  {getFileIcon(selectedFile)}
                  <span>{selectedFile.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {state === 'success' && (
            <div className="flex flex-col items-center justify-center py-6">
              <CheckCircle2 className="h-14 w-14 text-green-600 mb-4" />
              <p className="text-lg font-medium mb-2">Beleg gespeichert!</p>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="flex flex-col items-center justify-center py-6">
              <X className="h-14 w-14 text-red-600 mb-4" />
              <p className="text-lg font-medium mb-2">Fehler beim Upload</p>
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {state !== 'uploading' && (
            <Button variant={state === 'success' ? 'default' : 'outline'} onClick={handleClose}>
              {state === 'success' ? 'Fertig' : 'Schließen'}
            </Button>
          )}
          {state === 'error' && (
             <Button onClick={() => setState('idle')}>Erneut versuchen</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
