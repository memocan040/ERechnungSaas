'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, BookOpen, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { IncomingInvoice, ChartOfAccount } from '@/types';
import { incomingInvoicesApi } from '@/lib/api';

interface EingangBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: IncomingInvoice;
  accounts?: ChartOfAccount[];
  onBookingComplete?: () => void;
}

export function EingangBookingDialog({
  open,
  onOpenChange,
  invoice,
  accounts = [],
  onBookingComplete,
}: EingangBookingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [expenseAccountId, setExpenseAccountId] = useState<string>(
    invoice.expenseAccountId || ''
  );

  // Filter expense accounts
  const expenseAccounts = accounts.filter(
    (a) =>
      a.accountType === 'expense' ||
      a.accountNumber.startsWith('4') ||
      a.accountNumber.startsWith('6')
  );

  const handleBook = async () => {
    if (!expenseAccountId) {
      setError('Bitte wählen Sie ein Aufwandskonto aus');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // First update the expense account if changed
      if (expenseAccountId !== invoice.expenseAccountId) {
        await incomingInvoicesApi.updateInvoice(invoice.id, {
          expenseAccountId,
        });
      }

      // Then book the invoice
      const result = await incomingInvoicesApi.bookInvoice(invoice.id);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onOpenChange(false);
          if (onBookingComplete) {
            onBookingComplete();
          }
        }, 1500);
      } else {
        setError((result as any).error || 'Fehler beim Buchen der Rechnung');
      }
    } catch (err) {
      console.error('Booking error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Buchen der Rechnung');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Rechnung buchen
          </DialogTitle>
          <DialogDescription>
            {success
              ? 'Die Buchung wurde erfolgreich erstellt.'
              : 'Erstellen Sie einen Buchungssatz für diese Eingangsrechnung.'}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
            <p className="text-lg font-medium">Buchung erfolgreich!</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Invoice Summary */}
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rechnungsnummer:</span>
                <span className="font-medium">{invoice.invoiceNumber}</span>
              </div>
              {invoice.vendorName && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lieferant:</span>
                  <span className="font-medium">{invoice.vendorName}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nettobetrag:</span>
                <span className="font-medium">
                  {invoice.subtotal.toLocaleString('de-DE', {
                    style: 'currency',
                    currency: invoice.currency || 'EUR',
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">MwSt:</span>
                <span className="font-medium">
                  {invoice.taxAmount.toLocaleString('de-DE', {
                    style: 'currency',
                    currency: invoice.currency || 'EUR',
                  })}
                </span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Gesamtbetrag:</span>
                <span>
                  {invoice.total.toLocaleString('de-DE', {
                    style: 'currency',
                    currency: invoice.currency || 'EUR',
                  })}
                </span>
              </div>
            </div>

            {/* Booking Configuration */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="expenseAccount">
                  Aufwandskonto (Soll) <span className="text-red-500">*</span>
                </Label>
                <Select value={expenseAccountId} onValueChange={setExpenseAccountId}>
                  <SelectTrigger id="expenseAccount">
                    <SelectValue placeholder="Konto auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.accountNumber} - {acc.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Dieses Konto wird im Soll gebucht.
                </p>
              </div>

              {/* Booking Preview */}
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium mb-3">Buchungssatz-Vorschau:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Soll: {expenseAccountId ? expenseAccounts.find((a) => a.id === expenseAccountId)?.accountName || 'Aufwandskonto' : '...'}
                    </span>
                    <span>
                      {invoice.subtotal.toLocaleString('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </span>
                  </div>
                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Soll: Vorsteuer</span>
                      <span>
                        {invoice.taxAmount.toLocaleString('de-DE', {
                          style: 'currency',
                          currency: 'EUR',
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Haben: Verbindlichkeiten</span>
                    <span>
                      {invoice.total.toLocaleString('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Warnings */}
            {!expenseAccountId && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Bitte wählen Sie ein Aufwandskonto aus, um die Rechnung zu buchen.
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {!success && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Abbrechen
              </Button>
              <Button
                onClick={handleBook}
                disabled={isLoading || !expenseAccountId}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Wird gebucht...
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Buchen
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
