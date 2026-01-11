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
    userId: '1',
    customerId: 'c1',
    invoiceNumber: 'INV-2025-001',
    customer: {
      id: 'c1',
      userId: '1',
      companyName: 'Müller & Partner GmbH',
      email: 'buchhaltung@mueller-partner.de',
      country: 'DE',
      isActive: true,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    },
    subtotal: 3571.43,
    taxAmount: 678.57,
    total: 4250.0,
    currency: 'EUR',
    status: 'paid',
    issueDate: '2025-01-02',
    dueDate: '2025-01-16',
    paidDate: '2025-01-10',
    createdAt: '2025-01-02',
    updatedAt: '2025-01-10',
    items: [
      {
        id: '1-1',
        description: 'Web Development Services',
        quantity: 40,
        unit: 'Stunde',
        unitPrice: 95.0,
        taxRate: 19,
        total: 3800.0,
      },
      {
        id: '1-2',
        description: 'Hosting (Annual)',
        quantity: 1,
        unit: 'Jahr',
        unitPrice: 450.0,
        taxRate: 19,
        total: 450.0,
      },
    ],
  },
  {
    id: '2',
    userId: '1',
    customerId: 'c2',
    invoiceNumber: 'INV-2025-002',
    customer: {
      id: 'c2',
      userId: '1',
      companyName: 'Schmidt Digital AG',
      email: 'finance@schmidt-digital.de',
      country: 'DE',
      isActive: true,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    },
    subtotal: 7352.94,
    taxAmount: 1397.06,
    total: 8750.0,
    currency: 'EUR',
    status: 'sent',
    issueDate: '2025-01-05',
    dueDate: '2025-01-19',
    createdAt: '2025-01-05',
    updatedAt: '2025-01-05',
    items: [
      {
        id: '2-1',
        description: 'E-Commerce Platform Development',
        quantity: 1,
        unit: 'Pauschal',
        unitPrice: 8750.0,
        taxRate: 19,
        total: 8750.0,
      },
    ],
  },
  {
    id: '3',
    userId: '1',
    customerId: 'c3',
    invoiceNumber: 'INV-2024-098',
    customer: {
      id: 'c3',
      userId: '1',
      companyName: 'Weber Consulting',
      email: 'invoice@weber-consulting.de',
      country: 'DE',
      isActive: true,
      createdAt: '2024-12-01',
      updatedAt: '2024-12-01',
    },
    subtotal: 1764.71,
    taxAmount: 335.29,
    total: 2100.0,
    currency: 'EUR',
    status: 'overdue',
    issueDate: '2024-12-01',
    dueDate: '2024-12-15',
    createdAt: '2024-12-01',
    updatedAt: '2024-12-01',
    items: [
      {
        id: '3-1',
        description: 'IT Consulting',
        quantity: 14,
        unit: 'Stunde',
        unitPrice: 150.0,
        taxRate: 19,
        total: 2100.0,
      },
    ],
  },
  {
    id: '4',
    userId: '1',
    customerId: 'c4',
    invoiceNumber: 'INV-2025-003',
    customer: {
      id: 'c4',
      userId: '1',
      companyName: 'Bäckerei Fischer',
      email: 'info@baeckerei-fischer.de',
      country: 'DE',
      isActive: true,
      createdAt: '2025-01-06',
      updatedAt: '2025-01-06',
    },
    subtotal: 747.90,
    taxAmount: 142.10,
    total: 890.0,
    currency: 'EUR',
    status: 'draft',
    issueDate: '2025-01-06',
    dueDate: '2025-01-20',
    createdAt: '2025-01-06',
    updatedAt: '2025-01-06',
    items: [
      {
        id: '4-1',
        description: 'Website Redesign',
        quantity: 1,
        unit: 'Pauschal',
        unitPrice: 890.0,
        taxRate: 19,
        total: 890.0,
      },
    ],
  },
  {
    id: '5',
    userId: '1',
    customerId: 'c5',
    invoiceNumber: 'INV-2025-004',
    customer: {
      id: 'c5',
      userId: '1',
      companyName: 'Autohaus König',
      email: 'verwaltung@autohaus-koenig.de',
      country: 'DE',
      isActive: true,
      createdAt: '2025-01-04',
      updatedAt: '2025-01-04',
    },
    subtotal: 2689.08,
    taxAmount: 510.92,
    total: 3200.0,
    currency: 'EUR',
    status: 'sent',
    issueDate: '2025-01-04',
    dueDate: '2025-01-18',
    createdAt: '2025-01-04',
    updatedAt: '2025-01-04',
    items: [
      {
        id: '5-1',
        description: 'CRM Integration',
        quantity: 1,
        unit: 'Pauschal',
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
  { month: 'Feb', revenue: 28500, invoiceCount: 10 },
  { month: 'Mär', revenue: 35200, invoiceCount: 12 },
  { month: 'Apr', revenue: 31800, invoiceCount: 11 },
  { month: 'Mai', revenue: 42100, invoiceCount: 15 },
  { month: 'Jun', revenue: 38900, invoiceCount: 13 },
  { month: 'Jul', revenue: 45600, invoiceCount: 16 },
  { month: 'Aug', revenue: 41200, invoiceCount: 14 },
  { month: 'Sep', revenue: 48300, invoiceCount: 17 },
  { month: 'Okt', revenue: 52100, invoiceCount: 18 },
  { month: 'Nov', revenue: 47800, invoiceCount: 16 },
  { month: 'Dez', revenue: 58200, invoiceCount: 20 },
  { month: 'Jan', revenue: 42580, invoiceCount: 15 },
];

export const statusDistribution: StatusDistribution[] = [
  { status: 'draft', count: 8, totalAmount: 5000 },
  { status: 'sent', count: 24, totalAmount: 15000 },
  { status: 'paid', count: 62, totalAmount: 40000 },
  { status: 'overdue', count: 4, totalAmount: 2100 },
  { status: 'cancelled', count: 0, totalAmount: 0 },
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
    cancelled: 'bg-gray-100 text-gray-700',
  };
  return colors[status];
}

export function getStatusLabel(status: Invoice['status']): string {
  const labels = {
    draft: 'Entwurf',
    sent: 'Versendet',
    paid: 'Bezahlt',
    overdue: 'Überfällig',
    cancelled: 'Storniert',
  };
  return labels[status];
}
