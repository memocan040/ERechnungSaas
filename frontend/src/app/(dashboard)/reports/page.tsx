'use client';

import { useState, useEffect } from 'react';
import { Download, Euro, Users, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { MonthlyRevenue, CustomerRevenue, TaxSummary, StatusDistribution, DateRange } from '@/types';
import { reportsApi } from '@/lib/api';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'];

const statusLabels: Record<string, string> = {
  draft: 'Entwurf',
  sent: 'Gesendet',
  paid: 'Bezahlt',
  overdue: 'Überfällig',
  cancelled: 'Storniert',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [revenueByMonth, setRevenueByMonth] = useState<MonthlyRevenue[]>([]);
  const [customerRevenue, setCustomerRevenue] = useState<CustomerRevenue[]>([]);
  const [taxSummary, setTaxSummary] = useState<TaxSummary[]>([]);
  const [statusSummary, setStatusSummary] = useState<StatusDistribution[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [revenueRes, customersRes, taxRes, statusRes] = await Promise.all([
        reportsApi.getRevenueByMonth(dateRange),
        reportsApi.getRevenueByCustomer(dateRange),
        reportsApi.getTaxSummary(dateRange),
        reportsApi.getInvoiceStatusSummary(dateRange),
      ]);

      if (revenueRes.success) setRevenueByMonth(revenueRes.data || []);
      if (customersRes.success) setCustomerRevenue(customersRes.data || []);
      if (taxRes.success) setTaxSummary(taxRes.data || []);
      if (statusRes.success) setStatusSummary(statusRes.data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportRevenue = async () => {
    try {
      await reportsApi.exportRevenueCsv(dateRange);
    } catch (error) {
      console.error('Error exporting revenue:', error);
    }
  };

  const handleExportCustomers = async () => {
    try {
      await reportsApi.exportCustomersCsv(dateRange);
    } catch (error) {
      console.error('Error exporting customers:', error);
    }
  };

  const handleExportTax = async () => {
    try {
      await reportsApi.exportTaxCsv(dateRange);
    } catch (error) {
      console.error('Error exporting tax:', error);
    }
  };

  const totalRevenue = revenueByMonth.reduce((sum, item) => sum + item.revenue, 0);
  const totalInvoices = revenueByMonth.reduce((sum, item) => sum + item.invoiceCount, 0);

  const chartData = [...revenueByMonth].reverse().map((item) => ({
    ...item,
    month: formatMonth(item.month),
  }));

  const pieData = statusSummary.map((item) => ({
    name: statusLabels[item.status] || item.status,
    value: item.count,
    amount: item.totalAmount,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Berichte</h1>
          <p className="text-muted-foreground">
            Analysieren Sie Ihre Geschäftszahlen.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zeitraum</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">Von</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Bis</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <Button onClick={loadReports}>Anwenden</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-500/10 p-3">
                <Euro className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gesamtumsatz</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-500/10 p-3">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bezahlte Rechnungen</p>
                <p className="text-2xl font-bold">{totalInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-500/10 p-3">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktive Kunden</p>
                <p className="text-2xl font-bold">{customerRevenue.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-orange-500/10 p-3">
                <TrendingUp className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durchschn. Rechnung</p>
                <p className="text-2xl font-bold">
                  {totalInvoices > 0 ? formatCurrency(totalRevenue / totalInvoices) : '€0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Umsatz</TabsTrigger>
          <TabsTrigger value="customers">Kunden</TabsTrigger>
          <TabsTrigger value="tax">Steuern</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Umsatz nach Monat</CardTitle>
                <CardDescription>Bezahlte Rechnungen im Zeitverlauf</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportRevenue}>
                <Download className="mr-2 h-4 w-4" />
                CSV Export
              </Button>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `€${value / 1000}k`} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Monat: ${label}`}
                    />
                    <Bar dataKey="revenue" fill="#8884d8" name="Umsatz" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Keine Daten vorhanden</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Umsatz nach Kunde</CardTitle>
                <CardDescription>Top 10 Kunden nach Umsatz</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCustomers}>
                <Download className="mr-2 h-4 w-4" />
                CSV Export
              </Button>
            </CardHeader>
            <CardContent>
              {customerRevenue.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kunde</TableHead>
                      <TableHead className="text-right">Rechnungen</TableHead>
                      <TableHead className="text-right">Durchschnitt</TableHead>
                      <TableHead className="text-right">Gesamtumsatz</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerRevenue.map((customer) => (
                      <TableRow key={customer.customerId}>
                        <TableCell className="font-medium">{customer.customerName}</TableCell>
                        <TableCell className="text-right">{customer.invoiceCount}</TableCell>
                        <TableCell className="text-right">{formatCurrency(customer.avgInvoiceValue)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(customer.totalRevenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Keine Daten vorhanden</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>MwSt-Übersicht</CardTitle>
                <CardDescription>Zusammenfassung nach Steuersatz</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportTax}>
                <Download className="mr-2 h-4 w-4" />
                CSV Export
              </Button>
            </CardHeader>
            <CardContent>
              {taxSummary.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Steuersatz</TableHead>
                      <TableHead className="text-right">Nettobetrag</TableHead>
                      <TableHead className="text-right">Steuerbetrag</TableHead>
                      <TableHead className="text-right">Bruttobetrag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxSummary.map((tax) => (
                      <TableRow key={tax.taxRate}>
                        <TableCell className="font-medium">{tax.taxRate}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(tax.netAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tax.taxAmount)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(tax.grossAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2">
                      <TableCell className="font-bold">Gesamt</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(taxSummary.reduce((sum, t) => sum + t.netAmount, 0))}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(taxSummary.reduce((sum, t) => sum + t.taxAmount, 0))}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(taxSummary.reduce((sum, t) => sum + t.grossAmount, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Keine Daten vorhanden</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rechnungsstatus</CardTitle>
              <CardDescription>Verteilung nach Status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [value, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">Keine Daten vorhanden</p>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Anzahl</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statusSummary.map((status) => (
                      <TableRow key={status.status}>
                        <TableCell className="font-medium">
                          {statusLabels[status.status] || status.status}
                        </TableCell>
                        <TableCell className="text-right">{status.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(status.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
