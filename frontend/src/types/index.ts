export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  userId: string;
  customerId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string;
  paymentTerms?: string;
  items?: InvoiceItem[];
  customer?: Customer;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id?: string;
  invoiceId?: string;
  position?: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  subtotal?: number;
  taxAmount?: number;
  total?: number;
}

export interface Customer {
  id: string;
  userId: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country: string;
  vatId?: string;
  customerNumber?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  userId: string;
  name: string;
  legalName?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country: string;
  vatId?: string;
  taxNumber?: string;
  tradeRegister?: string;
  court?: string;
  managingDirector?: string;
  phone?: string;
  email?: string;
  website?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  defaultTaxRate: number;
  defaultPaymentDays: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  currency: string;
  language: string;
  emailNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  outstandingInvoices: number;
  overdueAmount: number;
  totalInvoices: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  invoiceCount: number;
}

export interface CustomerRevenue {
  customerId: string;
  customerName: string;
  totalRevenue: number;
  invoiceCount: number;
  avgInvoiceValue: number;
}

export interface TaxSummary {
  taxRate: number;
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
}

export interface StatusDistribution {
  status: InvoiceStatus;
  count: number;
  totalAmount: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceFilters extends PaginationParams {
  status?: InvoiceStatus;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CustomerFilters extends PaginationParams {
  isActive?: boolean;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}
