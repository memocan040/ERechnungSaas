'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Book, Wallet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ChartOfAccount, AccountType, AccountClass } from '@/types';
import { accountingApi } from '@/lib/api/accounting';

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [seedDialog, setSeedDialog] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAccount, setNewAccount] = useState<{
    accountNumber: string;
    accountName: string;
    accountType: AccountType;
    accountClass: AccountClass;
    description: string;
  }>({
    accountNumber: '',
    accountName: '',
    accountType: 'asset',
    accountClass: 'current_asset',
    description: '',
  });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await accountingApi.getAccounts({
        search: search || undefined,
        accountType: filterType !== 'all' ? filterType : undefined,
      });

      if (response.success && response.data) {
        setAccounts(response.data);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [filterType]);

  const handleSearch = () => {
    loadAccounts();
  };

  const handleSeedAccounts = async () => {
    setSeeding(true);
    try {
      const response = await accountingApi.seedStandardAccounts('SKR03');
      if (response.success && response.data) {
        alert(`${response.data.created} Konten erstellt, ${response.data.skipped} übersprungen`);
        loadAccounts();
        setSeedDialog(false);
      }
    } catch (error) {
      console.error('Error seeding accounts:', error);
      alert('Fehler beim Erstellen der Standardkonten');
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccount.accountNumber || !newAccount.accountName) {
      alert('Bitte Kontonummer und Kontoname ausfüllen');
      return;
    }

    setCreating(true);
    try {
      const response = await accountingApi.createAccount(newAccount);
      if (response.success) {
        loadAccounts();
        setCreateDialog(false);
        setNewAccount({
          accountNumber: '',
          accountName: '',
          accountType: 'asset',
          accountClass: 'current_asset',
          description: '',
        });
      }
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Fehler beim Erstellen des Kontos');
    } finally {
      setCreating(false);
    }
  };

  const getAccountTypeBadge = (type: AccountType) => {
    const variants: Record<AccountType, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      asset: { variant: 'default', label: 'Aktiva' },
      liability: { variant: 'destructive', label: 'Passiva' },
      equity: { variant: 'secondary', label: 'Eigenkapital' },
      revenue: { variant: 'default', label: 'Ertrag' },
      expense: { variant: 'outline', label: 'Aufwand' },
      contra_asset: { variant: 'outline', label: 'Gegenkonto Aktiva' },
      contra_liability: { variant: 'outline', label: 'Gegenkonto Passiva' },
    };

    const config = variants[type] || { variant: 'default', label: type };
    return (
      <Badge variant={config.variant as any}>
        {config.label}
      </Badge>
    );
  };

  const getAccountClassLabel = (accountClass: AccountClass) => {
    const labels: Record<AccountClass, string> = {
      current_asset: 'Umlaufvermögen',
      fixed_asset: 'Anlagevermögen',
      current_liability: 'Kurzfristige Verbindlichkeiten',
      long_term_liability: 'Langfristige Verbindlichkeiten',
      equity: 'Eigenkapital',
      operating_revenue: 'Betriebliche Erträge',
      other_revenue: 'Sonstige Erträge',
      operating_expense: 'Betriebliche Aufwendungen',
      other_expense: 'Sonstige Aufwendungen',
    };
    return labels[accountClass] || accountClass;
  };

  const stats = {
    total: accounts.length,
    assets: accounts.filter(a => a.accountType === 'asset').length,
    liabilities: accounts.filter(a => a.accountType === 'liability').length,
    revenue: accounts.filter(a => a.accountType === 'revenue').length,
    expense: accounts.filter(a => a.accountType === 'expense').length,
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kontenplan</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihren Kontenplan (SKR03)</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setSeedDialog(true)} variant="outline">
            <Wallet className="h-4 w-4 mr-2" />
            SKR03 laden
          </Button>
          <Button onClick={() => setCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Konto erstellen
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aktiva</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Passiva</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.liabilities}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Erträge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.revenue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aufwendungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expense}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach Kontonummer oder Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Kontotyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Konten</SelectItem>
                <SelectItem value="asset">Aktiva</SelectItem>
                <SelectItem value="liability">Passiva</SelectItem>
                <SelectItem value="equity">Eigenkapital</SelectItem>
                <SelectItem value="revenue">Erträge</SelectItem>
                <SelectItem value="expense">Aufwendungen</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Suchen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Konten</CardTitle>
          <CardDescription>
            {accounts.length} Konten gefunden
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12">
              <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine Konten gefunden</h3>
              <p className="text-muted-foreground mb-4">
                Erstellen Sie zuerst Konten oder laden Sie den SKR03-Standardkontenplan
              </p>
              <Button onClick={() => setSeedDialog(true)}>
                <Wallet className="h-4 w-4 mr-2" />
                SKR03 laden
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kontonummer</TableHead>
                  <TableHead>Kontoname</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Klasse</TableHead>
                  <TableHead>USt-relevant</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{account.accountNumber}</TableCell>
                    <TableCell>{account.accountName}</TableCell>
                    <TableCell>{getAccountTypeBadge(account.accountType)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getAccountClassLabel(account.accountClass)}
                    </TableCell>
                    <TableCell>
                      {account.taxRelevant ? (
                        <Badge variant="outline">{account.taxCode}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {account.isActive ? (
                        <Badge variant="default">Aktiv</Badge>
                      ) : (
                        <Badge variant="secondary">Inaktiv</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Seed Dialog */}
      <Dialog open={seedDialog} onOpenChange={setSeedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SKR03 Standardkonten laden</DialogTitle>
            <DialogDescription>
              Möchten Sie die deutschen SKR03 Standardkonten laden? Dies erstellt 24 vordefinierte Konten.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeedDialog(false)} disabled={seeding}>
              Abbrechen
            </Button>
            <Button onClick={handleSeedAccounts} disabled={seeding}>
              {seeding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Lade...
                </>
              ) : (
                'SKR03 laden'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Neues Konto erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie ein neues Konto für Ihren Kontenplan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Kontonummer*</Label>
                <Input
                  id="accountNumber"
                  placeholder="z.B. 1000"
                  value={newAccount.accountNumber}
                  onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountName">Kontoname*</Label>
                <Input
                  id="accountName"
                  placeholder="z.B. Kasse"
                  value={newAccount.accountName}
                  onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountType">Kontotyp*</Label>
                <Select
                  value={newAccount.accountType}
                  onValueChange={(value: AccountType) => setNewAccount({ ...newAccount, accountType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Aktiva</SelectItem>
                    <SelectItem value="liability">Passiva</SelectItem>
                    <SelectItem value="equity">Eigenkapital</SelectItem>
                    <SelectItem value="revenue">Ertrag</SelectItem>
                    <SelectItem value="expense">Aufwand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountClass">Kontoklasse*</Label>
                <Select
                  value={newAccount.accountClass}
                  onValueChange={(value: AccountClass) => setNewAccount({ ...newAccount, accountClass: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_asset">Umlaufvermögen</SelectItem>
                    <SelectItem value="fixed_asset">Anlagevermögen</SelectItem>
                    <SelectItem value="current_liability">Kurzfristige Verbindlichkeiten</SelectItem>
                    <SelectItem value="long_term_liability">Langfristige Verbindlichkeiten</SelectItem>
                    <SelectItem value="equity">Eigenkapital</SelectItem>
                    <SelectItem value="operating_revenue">Betriebliche Erträge</SelectItem>
                    <SelectItem value="other_revenue">Sonstige Erträge</SelectItem>
                    <SelectItem value="operating_expense">Betriebliche Aufwendungen</SelectItem>
                    <SelectItem value="other_expense">Sonstige Aufwendungen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Input
                id="description"
                placeholder="Optionale Beschreibung"
                value={newAccount.description}
                onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)} disabled={creating}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateAccount} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Erstelle...
                </>
              ) : (
                'Konto erstellen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
