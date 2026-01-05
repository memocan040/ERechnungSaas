import type {
  Invoice,
  DashboardStats,
  MonthlyRevenue,
  StatusDistribution,
  User,
} from '@/types';

export const currentUser: User = {
  id: '1',
  name: 'Max Mustermann',
  email: 'max@techstartup.de',
  role: 'admin',
  isActive: true,
};

export const mockInvoices: Invoice[] = [
  {
    id: '1',
    number: 'INV-2025-001',
    customerName: 'Müller & Partner GmbH',
    customerEmail: 'buchhaltung@mueller-partner.de',
    amount: 4250.0,
    currency: 'EUR',
    status: 'paid',
    issueDate: '2025-01-02',
    dueDate: '2025-01-16',
    paidDate: '2025-01-10',
    items: [
      {
        id: '1-1',
        description: 'Web Development Services',
        quantity: 40,
        unitPrice: 95.0,
        taxRate: 19,
        total: 3800.0,
      },
      {
        id: '1-2',
        description: 'Hosting (Annual)',
        quantity: 1,
        unitPrice: 450.0,
        taxRate: 19,
        total: 450.0,
      },
    ],
  },
  {
    id: '2',
    number: 'INV-2025-002',
    customerName: 'Schmidt Digital AG',
    customerEmail: 'finance@schmidt-digital.de',
    amount: 8750.0,
    currency: 'EUR',
    status: 'sent',
    issueDate: '2025-01-05',
    dueDate: '2025-01-19',
    items: [
      {
        id: '2-1',
        description: 'E-Commerce Platform Development',
        quantity: 1,
        unitPrice: 8750.0,
        taxRate: 19,
        total: 8750.0,
      },
    ],
  },
  {
    id: '3',
    number: 'INV-2024-098',
    customerName: 'Weber Consulting',
    customerEmail: 'invoice@weber-consulting.de',
    amount: 2100.0,
    currency: 'EUR',
    status: 'overdue',
    issueDate: '2024-12-01',
    dueDate: '2024-12-15',
    items: [
      {
        id: '3-1',
        description: 'IT Consulting',
        quantity: 14,
        unitPrice: 150.0,
        taxRate: 19,
        total: 2100.0,
      },
    ],
  },
  {
    id: '4',
    number: 'INV-2025-003',
    customerName: 'Bäckerei Fischer',
    customerEmail: 'info@baeckerei-fischer.de',
    amount: 890.0,
    currency: 'EUR',
    status: 'draft',
    issueDate: '2025-01-06',
    dueDate: '2025-01-20',
    items: [
      {
        id: '4-1',
        description: 'Website Redesign',
        quantity: 1,
        unitPrice: 890.0,
        taxRate: 19,
        total: 890.0,
      },
    ],
  },
  {
    id: '5',
    number: 'INV-2025-004',
    customerName: 'Autohaus König',
    customerEmail: 'verwaltung@autohaus-koenig.de',
    amount: 3200.0,
    currency: 'EUR',
    status: 'sent',
    issueDate: '2025-01-04',
    dueDate: '2025-01-18',
    items: [
      {
        id: '5-1',
        description: 'CRM Integration',
        quantity: 1,
        unitPrice: 3200.0,
        taxRate: 19,
        total: 3200.0,
      },
    ],
  },
];

export const dashboardStats: DashboardStats = {
  totalRevenue: 42580.0,
  outstandingInvoices: 11950.0,
  overdueAmount: 2100.0,
  totalInvoices: 98,
};

export const monthlyRevenue: MonthlyRevenue[] = [
  { month: 'Feb', revenue: 28500 },
  { month: 'Mär', revenue: 35200 },
  { month: 'Apr', revenue: 31800 },
  { month: 'Mai', revenue: 42100 },
  { month: 'Jun', revenue: 38900 },
  { month: 'Jul', revenue: 45600 },
  { month: 'Aug', revenue: 41200 },
  { month: 'Sep', revenue: 48300 },
  { month: 'Okt', revenue: 52100 },
  { month: 'Nov', revenue: 47800 },
  { month: 'Dez', revenue: 58200 },
  { month: 'Jan', revenue: 42580 },
];

export const statusDistribution: StatusDistribution[] = [
  { status: 'draft', count: 8, label: 'Entwurf' },
  { status: 'sent', count: 24, label: 'Versendet' },
  { status: 'paid', count: 62, label: 'Bezahlt' },
  { status: 'overdue', count: 4, label: 'Überfällig' },
];

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString));
}

export function getStatusColor(status: Invoice['status']): string {
  const colors = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
  };
  return colors[status];
}

export function getStatusLabel(status: Invoice['status']): string {
  const labels = {
    draft: 'Entwurf',
    sent: 'Versendet',
    paid: 'Bezahlt',
    overdue: 'Überfällig',
  };
  return labels[status];
}
