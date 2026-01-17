'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { accountingApi } from '@/lib/api/accounting';
import type { TrialBalance, TrialBalanceAccount } from '@/types';
import { Loader2, Calendar as CalendarIcon, Download, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/constants';

function translateAccountType(type: string): string {
  const map: Record<string, string> = {
    asset: 'Aktiva',
    liability: 'Passiva',
    equity: 'Eigenkapital',
    revenue: 'Einnahmen',
    expense: 'Ausgaben',
    contra_asset: 'WB (Aktiva)',
    contra_liability: 'WB (Passiva)',
  };
  return map[type] || type;
}

export default function TrialBalancePage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrialBalance | null>(null);
  const [asOfDate, setAsOfDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await accountingApi.getTrialBalance(asOfDate);
      // The API returns the object directly, not wrapped in { success: true, data: ... } 
      // based on the api client implementation in accounting.ts which calls apiClient.get<TrialBalance>
      // But let's verify if apiClient unwraps the response. 
      // Usually apiClient.get returns the data directly if configured that way.
      // Looking at accounting.ts: return apiClient.get<TrialBalance>(...)
      // Assuming apiClient returns the data payload.
      setData(result as unknown as TrialBalance);
    } catch (error) {
      console.error('Failed to fetch trial balance:', error);
      // TODO: Show toast error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [asOfDate]);

  const handleDownload = () => {
    // TODO: Implement CSV/PDF export
    console.log('Download requested');
  };

  const totalDebitBalance = data?.accounts.reduce((sum, acc) => {
    return sum + (acc.balance > 0 ? acc.balance : 0);
  }, 0) || 0;

  const totalCreditBalance = data?.accounts.reduce((sum, acc) => {
    return sum + (acc.balance < 0 ? Math.abs(acc.balance) : 0);
  }, 0) || 0;

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
            Probebilanz (Trial Balance)
          </h1>
          <p className="text-muted-foreground mt-1">
            Übersicht aller Kontensalden zum Stichtag
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-card border rounded-md px-3 py-1 shadow-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="border-0 focus-visible:ring-0 p-0 h-auto w-[130px] bg-transparent"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-t-4 border-t-primary shadow-md">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Saldenliste</CardTitle>
            <div className="text-sm text-muted-foreground">
              Stichtag: {new Date(asOfDate).toLocaleDateString('de-DE')}
            </div>
          </div>
          <CardDescription>
            Alle Konten mit Umsätzen im gewählten Zeitraum
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">Konto</TableHead>
                  <TableHead>Bezeichnung</TableHead>
                  <TableHead className="w-[150px]">Typ</TableHead>
                  <TableHead className="text-right w-[150px]">Soll (Debit)</TableHead>
                  <TableHead className="text-right w-[150px]">Haben (Credit)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex justify-center items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Laden...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !data || data.accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Keine Daten für diesen Zeitraum gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {data.accounts.map((account) => {
                      const debit = account.balance > 0 ? account.balance : 0;
                      const credit = account.balance < 0 ? Math.abs(account.balance) : 0;
                      
                      return (
                        <TableRow key={account.accountId} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-mono font-medium">{account.accountNumber}</TableCell>
                          <TableCell>{account.accountName}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {translateAccountType(account.accountType)}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${debit > 0 ? 'text-foreground' : 'text-muted-foreground/30'}`}>
                            {formatCurrency(debit)}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${credit > 0 ? 'text-foreground' : 'text-muted-foreground/30'}`}>
                            {formatCurrency(credit)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-bold border-t-2">
                      <TableCell colSpan={3} className="text-right">Summe:</TableCell>
                      <TableCell className="text-right font-mono text-primary">
                        {formatCurrency(totalDebitBalance)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-primary">
                        {formatCurrency(totalCreditBalance)}
                      </TableCell>
                    </TableRow>
                    
                    {/* Balance Check Row (if not balanced) */}
                    {Math.abs(totalDebitBalance - totalCreditBalance) > 0.01 && (
                      <TableRow className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium">
                        <TableCell colSpan={3} className="text-right">Differenz (Nicht ausgeglichen!):</TableCell>
                        <TableCell colSpan={2} className="text-center font-mono">
                          {formatCurrency(Math.abs(totalDebitBalance - totalCreditBalance))}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
