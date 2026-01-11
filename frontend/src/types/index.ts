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
  company?: Company;
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

// ============================================
// ACCOUNTING MODULE TYPES
// ============================================

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'contra_asset' | 'contra_liability';

export type AccountClass =
  | 'current_asset'
  | 'fixed_asset'
  | 'current_liability'
  | 'long_term_liability'
  | 'equity'
  | 'operating_revenue'
  | 'other_revenue'
  | 'operating_expense'
  | 'other_expense';

export type JournalEntryType =
  | 'manual'
  | 'invoice'
  | 'payment'
  | 'expense'
  | 'opening_balance'
  | 'closing'
  | 'adjustment'
  | 'reversal';

export type JournalEntryStatus = 'draft' | 'posted' | 'reversed';

export interface ChartOfAccount {
  id: string;
  userId: string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  accountClass: AccountClass;
  parentAccountId?: string;
  taxRelevant: boolean;
  taxCode?: string;
  autoVatAccountId?: string;
  isSystemAccount: boolean;
  isActive: boolean;
  description?: string;
  datevAccountNumber?: number;
  createdAt: string;
  updatedAt: string;
  balance?: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  entryNumber: string;
  entryDate: string;
  postingDate: string;
  fiscalYear: number;
  fiscalPeriod: number;
  entryType: JournalEntryType;
  status: JournalEntryStatus;
  referenceType?: string;
  referenceId?: string;
  description: string;
  notes?: string;
  reversedBy?: string;
  reverses?: string;
  createdBy?: string;
  postedBy?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
  lines?: JournalEntryLine[];
  totalDebit?: number;
  totalCredit?: number;
  isBalanced?: boolean;
}

export interface JournalEntryLine {
  id?: string;
  journalEntryId?: string;
  lineNumber?: number;
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
  costCenterId?: string;
  taxCode?: string;
  taxAmount?: number;
  account?: {
    accountNumber: string;
    accountName: string;
  };
}

export interface CreateChartOfAccountData {
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  accountClass: AccountClass;
  parentAccountId?: string;
  taxRelevant?: boolean;
  taxCode?: string;
  autoVatAccountId?: string;
  description?: string;
  datevAccountNumber?: number;
}

export interface CreateJournalEntryData {
  entryDate: string;
  postingDate?: string;
  entryType: JournalEntryType;
  description: string;
  notes?: string;
  lines: JournalEntryLine[];
}

export interface TrialBalanceAccount {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface TrialBalance {
  asOfDate: string;
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface Vendor {
  id: string;
  vendorNumber: string;
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
  taxNumber?: string;
  iban?: string;
  bic?: string;
  paymentTerms?: string;
  defaultPaymentMethod: string;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVendorData {
  vendorNumber: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  vatId: string;
  taxNumber: string;
  iban: string;
  bic: string;
  paymentTerms: string;
  defaultPaymentMethod: string;
  notes: string;
}

export type UpdateVendorData = Partial<CreateVendorData>;

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface CostCenter {
  id: string;
  name: string;
  code: string;
}

export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected' | 'cancelled';

export interface Expense {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  vendor?: Vendor;
  description: string;
  category?: ExpenseCategory;
  total: number;
  status: ExpenseStatus;
  // Add other fields as needed
}

export interface CreateExpenseData {
  vendorId?: string;
  vendorInvoiceNumber?: string;
  expenseDate: Date;
  dueDate?: Date;
  categoryId?: string;
  costCenterId?: string;
  description: string;
  notes?: string;
  items: {
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      accountId?: string;
      costCenterId?: string;
  }[];
}

export type UpdateExpenseData = Partial<CreateExpenseData>;
