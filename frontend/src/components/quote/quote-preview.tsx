import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Quote, QuoteStatus, Customer, Company, QuoteItem } from '@/types';
import { Badge } from '@/components/ui/badge';

interface QuotePreviewProps {
  quoteData: Partial<Quote> & {
    items: Partial<QuoteItem>[];
    customer?: Customer;
    company?: Company;
  };
}

const statusConfig: Record<QuoteStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Entwurf', variant: 'secondary' },
  sent: { label: 'Gesendet', variant: 'default' },
  accepted: { label: 'Angenommen', variant: 'outline' },
  rejected: { label: 'Abgelehnt', variant: 'destructive' },
  expired: { label: 'Abgelaufen', variant: 'secondary' },
  converted: { label: 'Umgewandelt', variant: 'outline' },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('de-DE');
}

export function QuotePreview({ quoteData }: QuotePreviewProps) {
  const { 
    quoteNumber = 'ENTWURF', 
    status = 'draft', 
    issueDate, 
    validUntil, 
    items = [], 
    subtotal = 0, 
    taxAmount = 0, 
    total = 0,
    company,
    customer,
    notes,
    termsConditions
  } = quoteData;

  return (
    <div className="space-y-6 h-full overflow-auto p-1">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{quoteNumber}</h1>
            <Badge variant={statusConfig[status].variant}>
              {statusConfig[status].label}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Vorschau
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="space-y-6">
          {/* Header Data */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Absender */}
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Von</CardTitle>
              </CardHeader>
              <CardContent>
                {company ? (
                  <div className="space-y-1 text-sm">
                    {company.logoUrl && (
                      <div className="mb-4">
                        <img
                          src={`http://localhost:3001${company.logoUrl}`}
                          alt="Company Logo"
                          className="max-h-16 object-contain"
                        />
                      </div>
                    )}
                    <p className="font-semibold text-base">{company.name}</p>
                    {company.legalName && <p className="text-muted-foreground">{company.legalName}</p>}
                    {company.street && company.houseNumber && (
                      <p>{company.street} {company.houseNumber}</p>
                    )}
                    {company.postalCode && company.city && (
                      <p>{company.postalCode} {company.city}</p>
                    )}
                    {company.country && <p>{company.country}</p>}
                    <div className="pt-2 space-y-1 text-muted-foreground text-xs">
                      {company.email && <p>E-Mail: {company.email}</p>}
                      {company.phone && <p>Tel: {company.phone}</p>}
                      {company.vatId && <p>USt-IdNr.: {company.vatId}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">Laden...</p>
                )}
              </CardContent>
            </Card>

            {/* Empfänger */}
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">An</CardTitle>
              </CardHeader>
              <CardContent>
                {customer ? (
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-base">{customer.companyName}</p>
                    {customer.contactName && <p>{customer.contactName}</p>}
                    {customer.street && customer.houseNumber && (
                      <p>{customer.street} {customer.houseNumber}</p>
                    )}
                    {customer.postalCode && customer.city && (
                      <p>{customer.postalCode} {customer.city}</p>
                    )}
                    {customer.country && <p>{customer.country}</p>}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">Bitte Kunden wählen</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Positionen</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Beschreibung</TableHead>
                    <TableHead className="text-right">Menge</TableHead>
                    <TableHead>Einh.</TableHead>
                    <TableHead className="text-right">Preis</TableHead>
                    <TableHead className="text-right">MwSt.</TableHead>
                    <TableHead className="text-right">Gesamt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={6} className="text-center text-muted-foreground h-24">Keine Positionen</TableCell>
                     </TableRow>
                  )}
                  {items.map((item, index) => {
                    const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
                    const itemTax = itemTotal * ((item.taxRate || 0) / 100);
                    return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.description || <span className="text-muted-foreground italic">Beschreibung...</span>}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice || 0)}</TableCell>
                      <TableCell className="text-right">{item.taxRate}%</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(itemTotal + itemTax)}
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
               {(notes || termsConditions) && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {termsConditions && (
                      <div>
                        <p className="font-medium text-muted-foreground text-xs">Bedingungen</p>
                        <p>{termsConditions}</p>
                      </div>
                    )}
                    {notes && (
                      <div>
                        <p className="font-medium text-muted-foreground text-xs">Hinweise</p>
                        <p>{notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
             </div>

             <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Angebotsdatum</span>
                      <span>{formatDate(issueDate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gültig bis</span>
                      <span>{formatDate(validUntil)}</span>
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Netto</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">MwSt.</span>
                        <span>{formatCurrency(taxAmount)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Gesamt</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
             </div>
          </div>
          
           {/* Bankverbindung Small */}
           {company && (company.iban || company.bankName) && (
            <div className="text-xs text-muted-foreground text-center border-t pt-4">
                <span className="mx-2">{company.bankName}</span>
                {company.iban && <span className="mx-2">IBAN: {company.iban}</span>}
                {company.bic && <span className="mx-2">BIC: {company.bic}</span>}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
