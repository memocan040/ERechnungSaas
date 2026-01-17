'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, BookOpen, Loader2, Check, X, Trash2, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { JournalEntry, JournalEntryLine, JournalEntryStatus, ChartOfAccount } from '@/types';
import { accountingApi } from '@/lib/api/accounting';
import { useToast } from '@/hooks/use-toast';

export default function JournalEntriesPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createDialog, setCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [reverseDialog, setReverseDialog] = useState(false);
  const [reverseReason, setReverseReason] = useState('');

  const [newEntry, setNewEntry] = useState<{
    entryDate: string;
    description: string;
    notes: string;
    lines: JournalEntryLine[];
  }>({
    entryDate: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
    lines: [
      { accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
      { accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
    ],
  });

  const loadEntries = async () => {
    setLoading(true);
    try {
      const response = await accountingApi.getJournalEntries({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        limit: 100,
      });

      if (response.success && response.data) {
        setEntries(response.data);
      }
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await accountingApi.getAccounts({});
      if (response.success && response.data) {
        setAccounts(response.data);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  useEffect(() => {
    loadEntries();
    loadAccounts();
  }, [filterStatus]);

  const handleAddLine = () => {
    setNewEntry({
      ...newEntry,
      lines: [...newEntry.lines, { accountId: '', debitAmount: 0, creditAmount: 0, description: '' }],
    });
  };

  const handleRemoveLine = (index: number) => {
    if (newEntry.lines.length > 2) {
      setNewEntry({
        ...newEntry,
        lines: newEntry.lines.filter((_, i) => i !== index),
      });
    }
  };

  const handleLineChange = (index: number, field: keyof JournalEntryLine, value: any) => {
    const updatedLines = [...newEntry.lines];
    updatedLines[index] = { ...updatedLines[index], [field]: value };

    // Auto-clear the opposite amount when entering debit/credit
    if (field === 'debitAmount' && parseFloat(value) > 0) {
      updatedLines[index].creditAmount = 0;
    } else if (field === 'creditAmount' && parseFloat(value) > 0) {
      updatedLines[index].debitAmount = 0;
    }

    setNewEntry({ ...newEntry, lines: updatedLines });
  };

  const calculateTotals = () => {
    const totalDebit = newEntry.lines.reduce((sum, line) => sum + (parseFloat(line.debitAmount.toString()) || 0), 0);
    const totalCredit = newEntry.lines.reduce((sum, line) => sum + (parseFloat(line.creditAmount.toString()) || 0), 0);
    const difference = totalDebit - totalCredit;
    const isBalanced = Math.abs(difference) < 0.01;

    return { totalDebit, totalCredit, difference, isBalanced };
  };

  const handleCreateEntry = async () => {
    const { isBalanced } = calculateTotals();

    if (!isBalanced) {
      toast({
        title: "Fehler",
        description: "Buchungssatz ist nicht ausgeglichen! Soll und Haben müssen gleich sein.",
        variant: "destructive",
      });
      return;
    }

    if (!newEntry.description) {
      toast({
        title: "Fehler",
        description: "Bitte Beschreibung eingeben",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const response = await accountingApi.createJournalEntry({
        ...newEntry,
        entryType: 'manual',
      });

      if (response.success) {
        toast({
          title: "Erfolg",
          description: "Buchungssatz erfolgreich erstellt.",
        });
        loadEntries();
        setCreateDialog(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error creating journal entry:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Erstellen des Buchungssatzes",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handlePostEntry = async (id: string) => {
    try {
      await accountingApi.postJournalEntry(id);
      toast({
        title: "Erfolg",
        description: "Buchungssatz erfolgreich gebucht.",
      });
      loadEntries();
    } catch (error) {
      console.error('Error posting entry:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Buchen",
        variant: "destructive",
      });
    }
  };

  const handleReverseEntry = async () => {
    if (!selectedEntry || !reverseReason) {
      toast({
        title: "Fehler",
        description: "Bitte Stornierungsgrund angeben",
        variant: "destructive",
      });
      return;
    }

    try {
      await accountingApi.reverseJournalEntry(selectedEntry.id, reverseReason);
      toast({
        title: "Erfolg",
        description: "Buchungssatz erfolgreich storniert.",
      });
      loadEntries();
      setReverseDialog(false);
      setSelectedEntry(null);
      setReverseReason('');
    } catch (error) {
      console.error('Error reversing entry:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Stornieren",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setNewEntry({
      entryDate: new Date().toISOString().split('T')[0],
      description: '',
      notes: '',
      lines: [
        { accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
        { accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
      ],
    });
  };

  const getStatusBadge = (status: JournalEntryStatus) => {
    const variants: Record<JournalEntryStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      draft: { variant: 'outline', label: 'Entwurf' },
      posted: { variant: 'default', label: 'Gebucht' },
      reversed: { variant: 'destructive', label: 'Storniert' },
    };

    const config = variants[status];
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const totals = calculateTotals();
  const stats = {
    total: entries.length,
    draft: entries.filter(e => e.status === 'draft').length,
    posted: entries.filter(e => e.status === 'posted').length,
    reversed: entries.filter(e => e.status === 'reversed').length,
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Buchungssätze</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Buchungen</p>
        </div>
        <Button onClick={() => setCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Buchungssatz erstellen
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Entwürfe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gebucht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.posted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Storniert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reversed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="draft">Entwürfe</SelectItem>
                <SelectItem value="posted">Gebucht</SelectItem>
                <SelectItem value="reversed">Storniert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Buchungssätze</CardTitle>
          <CardDescription>
            {entries.length} Buchungssätze gefunden
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine Buchungssätze gefunden</h3>
              <p className="text-muted-foreground mb-4">
                Erstellen Sie Ihren ersten Buchungssatz
              </p>
              <Button onClick={() => setCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Buchungssatz erstellen
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead className="text-right">Soll</TableHead>
                  <TableHead className="text-right">Haben</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                    <TableCell>{new Date(entry.entryDate).toLocaleDateString('de-DE')}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.totalDebit?.toFixed(2)} €
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.totalCredit?.toFixed(2)} €
                    </TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {entry.status === 'draft' && (
                          <Button size="sm" onClick={() => handlePostEntry(entry.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {entry.status === 'posted' && !entry.reversedBy && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setReverseDialog(true);
                            }}
                          >
                            <ArrowLeftRight className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Entry Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neuer Buchungssatz</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen Buchungssatz. Soll und Haben müssen ausgeglichen sein.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryDate">Buchungsdatum*</Label>
                <Input
                  id="entryDate"
                  type="date"
                  value={newEntry.entryDate}
                  onChange={(e) => setNewEntry({ ...newEntry, entryDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung*</Label>
                <Input
                  id="description"
                  placeholder="z.B. Rechnungsstellung Kunde XYZ"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                placeholder="Optionale Notizen"
                value={newEntry.notes}
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <Label>Buchungszeilen*</Label>
                <Button size="sm" variant="outline" onClick={handleAddLine}>
                  <Plus className="h-4 w-4 mr-2" />
                  Zeile hinzufügen
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Konto</TableHead>
                      <TableHead className="w-[150px]">Soll</TableHead>
                      <TableHead className="w-[150px]">Haben</TableHead>
                      <TableHead>Text</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newEntry.lines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={line.accountId}
                            onValueChange={(value) => handleLineChange(index, 'accountId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Konto wählen" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.accountNumber} - {account.accountName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={line.debitAmount || ''}
                            onChange={(e) => handleLineChange(index, 'debitAmount', parseFloat(e.target.value) || 0)}
                            disabled={line.creditAmount > 0}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={line.creditAmount || ''}
                            onChange={(e) => handleLineChange(index, 'creditAmount', parseFloat(e.target.value) || 0)}
                            disabled={line.debitAmount > 0}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Buchungstext"
                            value={line.description || ''}
                            onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          {newEntry.lines.length > 2 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveLine(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Summe Soll</div>
                    <div className="text-2xl font-bold">{totals.totalDebit.toFixed(2)} €</div>
                  </div>
                  <div>
                    <div className="font-medium">Summe Haben</div>
                    <div className="text-2xl font-bold">{totals.totalCredit.toFixed(2)} €</div>
                  </div>
                  <div>
                    <div className="font-medium">Status</div>
                    <div className="flex items-center gap-2">
                      {totals.isBalanced ? (
                        <>
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="text-green-600 font-semibold">Ausgeglichen</span>
                        </>
                      ) : (
                        <>
                          <X className="h-5 w-5 text-red-600" />
                          <span className="text-red-600 font-semibold">
                            Differenz: {Math.abs(totals.difference).toFixed(2)} €
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialog(false); resetForm(); }} disabled={creating}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateEntry} disabled={creating || !totals.isBalanced}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Erstelle...
                </>
              ) : (
                'Buchungssatz erstellen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse Entry Dialog */}
      <Dialog open={reverseDialog} onOpenChange={setReverseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buchungssatz stornieren</DialogTitle>
            <DialogDescription>
              Möchten Sie den Buchungssatz {selectedEntry?.entryNumber} wirklich stornieren?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reverseReason">Stornierungsgrund*</Label>
            <Textarea
              id="reverseReason"
              placeholder="Grund für die Stornierung"
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReverseDialog(false); setReverseReason(''); }}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleReverseEntry}>
              Stornieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
