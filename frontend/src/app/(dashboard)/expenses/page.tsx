'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { expensesApi, vendorsApi } from '@/lib/api';
import type { Expense, Vendor, ExpenseCategory, CostCenter, ExpenseStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, FileText, Eye, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const statusLabels: Record<ExpenseStatus, string> = {
  draft: 'Entwurf',
  submitted: 'Eingereicht',
  approved: 'Genehmigt',
  paid: 'Bezahlt',
  rejected: 'Abgelehnt',
  cancelled: 'Storniert',
};

const statusColors: Record<ExpenseStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  submitted: 'outline',
  approved: 'default',
  paid: 'default',
  rejected: 'destructive',
  cancelled: 'secondary',
};

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { toast } = useToast();

  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    paid: 0,
  });

  useEffect(() => {
    loadData();
  }, [searchTerm, statusFilter, vendorFilter, categoryFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [expensesResponse, vendorsResponse, categoriesResponse] = await Promise.all([
        expensesApi.getExpenses({
          search: searchTerm || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          vendorId: vendorFilter !== 'all' ? vendorFilter : undefined,
          categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
          limit: 100,
        }),
        vendorsApi.getVendors({ limit: 100 }),
        expensesApi.getCategories(),
      ]);

      setExpenses(expensesResponse.data);
      setVendors(vendorsResponse.data);
      setCategories(categoriesResponse.data);

      // Calculate stats
      const allExpenses = expensesResponse.data;
      setStats({
        total: allExpenses.length,
        draft: allExpenses.filter((e) => e.status === 'draft').length,
        submitted: allExpenses.filter((e) => e.status === 'submitted').length,
        approved: allExpenses.filter((e) => e.status === 'approved').length,
        paid: allExpenses.filter((e) => e.status === 'paid').length,
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Daten konnten nicht geladen werden',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Möchten Sie diese Ausgabe wirklich löschen?')) return;

    try {
      await expensesApi.deleteExpense(id);
      toast({
        title: 'Erfolg',
        description: 'Ausgabe wurde gelöscht',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Ausgabe konnte nicht gelöscht werden',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (id: string, newStatus: ExpenseStatus) => {
    try {
      await expensesApi.updateExpenseStatus(id, newStatus);
      toast({
        title: 'Erfolg',
        description: 'Status wurde aktualisiert',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Status konnte nicht aktualisiert werden',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('de-DE');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ausgaben</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Geschäftsausgaben</p>
        </div>
        <Link href="/expenses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neue Ausgabe
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gesamt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entwurf
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Eingereicht
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.submitted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Genehmigt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bezahlt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paid}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Ausgabenliste</CardTitle>
              <CardDescription>Übersicht aller Geschäftsausgaben</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-48"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ExpenseStatus | 'all')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="draft">Entwurf</SelectItem>
                  <SelectItem value="submitted">Eingereicht</SelectItem>
                  <SelectItem value="approved">Genehmigt</SelectItem>
                  <SelectItem value="paid">Bezahlt</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                </SelectContent>
              </Select>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Lieferant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Lieferanten</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Lädt...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Ausgaben gefunden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Lieferant</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{expense.expenseNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                    <TableCell>
                      {expense.vendor ? expense.vendor.companyName : '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {expense.description}
                    </TableCell>
                    <TableCell>
                      {expense.category ? expense.category.name : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.total)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={expense.status}
                        onValueChange={(value) =>
                          handleStatusChange(expense.id, value as ExpenseStatus)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <Badge variant={statusColors[expense.status]}>
                            {statusLabels[expense.status]}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Entwurf</SelectItem>
                          <SelectItem value="submitted">Eingereicht</SelectItem>
                          <SelectItem value="approved">Genehmigt</SelectItem>
                          <SelectItem value="paid">Bezahlt</SelectItem>
                          <SelectItem value="rejected">Abgelehnt</SelectItem>
                          <SelectItem value="cancelled">Storniert</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Link href={`/expenses/${expense.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {expense.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
    </div>
  );
}
