import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

interface XmlImportPreviewProps {
  parsedData: ParsedInvoiceData;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('de-DE');
}

export function XmlImportPreview({ parsedData }: XmlImportPreviewProps) {
  const { invoice, customer, items, validation } = parsedData;

  return (
    <div className="space-y-4">
      {/* Validation Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {validation.isValid ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Validierung erfolgreich</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span>Validierung fehlgeschlagen</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {validation.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {validation.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Die XML-Datei ist gültig und bereit zum Import.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invoice and Customer Details */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Invoice Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Rechnungsdetails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rechnungsnummer:</span>
                <span className="font-semibold">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rechnungsdatum:</span>
                <span>{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fälligkeitsdatum:</span>
                <span>{formatDate(invoice.dueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Währung:</span>
                <span>{invoice.currency}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground font-semibold">Gesamtbetrag:</span>
                <span className="font-bold">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Kundendetails</span>
              {customer.isNewCustomer ? (
                <Badge variant="default" className="text-xs">Neu</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Vorhanden</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-base">{customer.companyName}</p>
              {customer.street && customer.houseNumber && (
                <p className="text-muted-foreground">{customer.street} {customer.houseNumber}</p>
              )}
              {customer.postalCode && customer.city && (
                <p className="text-muted-foreground">{customer.postalCode} {customer.city}</p>
              )}
              {customer.country && <p className="text-muted-foreground">{customer.country}</p>}
              {customer.vatId && (
                <p className="text-xs text-muted-foreground pt-2">USt-IdNr.: {customer.vatId}</p>
              )}
              {customer.email && (
                <p className="text-xs text-muted-foreground">E-Mail: {customer.email}</p>
              )}
              {customer.phone && (
                <p className="text-xs text-muted-foreground">Tel: {customer.phone}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Positionen ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Pos.</TableHead>
                <TableHead>Beschreibung</TableHead>
                <TableHead className="text-right">Menge</TableHead>
                <TableHead className="text-right">Einheit</TableHead>
                <TableHead className="text-right">Preis</TableHead>
                <TableHead className="text-right">MwSt</TableHead>
                <TableHead className="text-right">Gesamt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.position}>
                  <TableCell className="font-medium">{item.position}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{item.unit}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right">{item.taxRate}%</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Summen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nettobetrag:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Steuerbetrag:</span>
              <span>{formatCurrency(invoice.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t">
              <span>Gesamtbetrag:</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Terms and Notes */}
      {(invoice.paymentTerms || invoice.notes) && (
        <div className="grid gap-4 md:grid-cols-2">
          {invoice.paymentTerms && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Zahlungsbedingungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{invoice.paymentTerms}</p>
              </CardContent>
            </Card>
          )}
          {invoice.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Hinweise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
