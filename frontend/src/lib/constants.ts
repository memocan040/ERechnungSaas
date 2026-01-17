/**
 * Zentrale Konfigurationsdatei für Status-Labels, Varianten und Utility-Funktionen
 */

import { InvoiceStatus, QuoteStatus, ExpenseStatus } from '@/types';

/**
 * Status-Konfiguration für Rechnungen (Invoices)
 */
export const invoiceStatusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Entwurf', variant: 'secondary' },
  sent: { label: 'Gesendet', variant: 'default' },
  paid: { label: 'Bezahlt', variant: 'outline' },
  overdue: { label: 'Überfällig', variant: 'destructive' },
  cancelled: { label: 'Storniert', variant: 'secondary' },
};

/**
 * Status-Konfiguration für Angebote (Quotes)
 */
export const quoteStatusConfig: Record<QuoteStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Entwurf', variant: 'secondary' },
  sent: { label: 'Gesendet', variant: 'default' },
  accepted: { label: 'Angenommen', variant: 'outline' },
  rejected: { label: 'Abgelehnt', variant: 'destructive' },
  expired: { label: 'Abgelaufen', variant: 'secondary' },
  converted: { label: 'Umgewandelt', variant: 'outline' },
};

/**
 * Status-Konfiguration für Ausgaben (Expenses)
 */
export const expenseStatusConfig: Record<ExpenseStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Ausstehend', variant: 'secondary' },
  approved: { label: 'Genehmigt', variant: 'outline' },
  rejected: { label: 'Abgelehnt', variant: 'destructive' },
  paid: { label: 'Bezahlt', variant: 'default' },
};

/**
 * Formatiert einen Betrag als Währung (EUR)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Formatiert ein Datum im deutschen Format (dd.MM.yyyy)
 */
export function formatDate(date?: string | Date): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('de-DE').format(d);
}

/**
 * Formatiert ein Datum im deutschen Format mit Uhrzeit (dd.MM.yyyy HH:mm)
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
