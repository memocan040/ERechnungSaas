import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface Invoice {
  id: string;
  userId: string;
  customerId: string;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string;
  paymentTerms?: string;
  pdfUrl?: string;
  xmlData?: string;
  items?: InvoiceItem[];
  customer?: Customer;
  company?: Company;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  defaultTaxRate: number;
  defaultPaymentDays: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  quotePrefix: string;
  nextQuoteNumber: number;
  defaultQuoteValidityDays: number;
  currency: string;
  language: string;
  emailNotifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface InvoiceDesignSettings {
  id: string;
  userId: string;
  templateName: 'modern' | 'classic' | 'minimal' | 'professional' | 'creative';
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  tableHeaderBg: string;
  accentColor: string;
  logoPosition: 'left' | 'center' | 'right';
  logoSize: 'small' | 'medium' | 'large';
  showLogo: boolean;
  fontFamily: 'Helvetica' | 'Times-Roman' | 'Courier';
  headerFontSize: number;
  bodyFontSize: number;
  footerFontSize: number;
  pageMarginTop: number;
  pageMarginBottom: number;
  pageMarginLeft: number;
  pageMarginRight: number;
  sectionSpacing: number;
  showCompanyLogo: boolean;
  showBankInfo: boolean;
  showFooterInfo: boolean;
  showWatermark: boolean;
  showQrCode: boolean;
  companyInfoPosition: 'left' | 'right';
  invoiceInfoPosition: 'left' | 'right';
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateInvoiceDesignData {
  templateName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  backgroundColor?: string;
  tableHeaderBg?: string;
  accentColor?: string;
  logoPosition?: string;
  logoSize?: string;
  showLogo?: boolean;
  fontFamily?: string;
  headerFontSize?: number;
  bodyFontSize?: number;
  footerFontSize?: number;
  pageMarginTop?: number;
  pageMarginBottom?: number;
  pageMarginLeft?: number;
  pageMarginRight?: number;
  sectionSpacing?: number;
  showCompanyLogo?: boolean;
  showBankInfo?: boolean;
  showFooterInfo?: boolean;
  showWatermark?: boolean;
  showQrCode?: boolean;
  companyInfoPosition?: string;
  invoiceInfoPosition?: string;
}

export interface TemplatePreset {
  name: string;
  displayName: string;
  description: string;
  settings: Partial<InvoiceDesignSettings>;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
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

// ============================================
// ACCOUNTING MODULE TYPES (Phase 1)
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

export interface CostCenter {
  id: string;
  userId: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
  createdAt: Date;
  updatedAt: Date;
  // Virtual fields (populated by service layer)
  balance?: number;
  parentAccount?: ChartOfAccount;
  childAccounts?: ChartOfAccount[];
}

export interface SKR03StandardAccount {
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  accountClass: AccountClass;
  taxCode?: string;
  description?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  entryNumber: string;
  entryDate: Date;
  postingDate: Date;
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
  postedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Virtual fields (populated by service layer)
  lines?: JournalEntryLine[];
  totalDebit?: number;
  totalCredit?: number;
  isBalanced?: boolean;
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  lineNumber: number;
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
  costCenterId?: string;
  taxCode?: string;
  taxAmount: number;
  createdAt: Date;
  // Virtual fields (populated by service layer)
  account?: ChartOfAccount;
  costCenter?: CostCenter;
}

export interface AccountingSettings {
  id: string;
  userId: string;
  chartOfAccountsType: 'SKR03' | 'SKR04';
  fiscalYearStartMonth: number;
  useCostCenters: boolean;
  datevConsultantNumber?: number;
  datevClientNumber?: number;
  defaultBankAccountId?: string;
  defaultCashAccountId?: string;
  defaultAccountsReceivableId?: string;
  defaultAccountsPayableId?: string;
  defaultRevenueAccountId?: string;
  defaultVatPayableAccountId?: string;
  defaultVatReceivableAccountId?: string;
  nextJournalEntryNumber: number;
  nextExpenseNumber: number;
  nextPaymentNumber: number;
  createdAt: Date;
  updatedAt: Date;
  // Virtual fields (populated by service layer)
  defaultBankAccount?: ChartOfAccount;
  defaultCashAccount?: ChartOfAccount;
  defaultAccountsReceivable?: ChartOfAccount;
  defaultAccountsPayable?: ChartOfAccount;
  defaultRevenueAccount?: ChartOfAccount;
  defaultVatPayableAccount?: ChartOfAccount;
  defaultVatReceivableAccount?: ChartOfAccount;
}

// Data Transfer Objects for Create/Update operations

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

export interface UpdateChartOfAccountData {
  accountName?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateJournalEntryData {
  entryDate: Date;
  postingDate?: Date;
  entryType: JournalEntryType;
  description: string;
  notes?: string;
  lines: CreateJournalEntryLineData[];
}

export interface CreateJournalEntryLineData {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
  costCenterId?: string;
  taxCode?: string;
  taxAmount?: number;
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
  asOfDate: Date;
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

// ============================================
// EXPENSE MANAGEMENT TYPES (Phase 2)
// ============================================

export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected' | 'cancelled';

export type PaymentMethod = 'bank_transfer' | 'cash' | 'credit_card' | 'debit_card' | 'paypal' | 'other';

export interface Vendor {
  id: string;
  userId: string;
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
  defaultPaymentMethod: PaymentMethod;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseCategory {
  id: string;
  userId: string;
  name: string;
  description?: string;
  defaultAccountId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  defaultAccount?: ChartOfAccount;
}

export interface ExpenseItem {
  id: string;
  expenseId: string;
  position: number;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  accountId?: string;
  costCenterId?: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  createdAt: Date;
  account?: ChartOfAccount;
  costCenter?: CostCenter;
}

export interface Expense {
  id: string;
  userId: string;
  vendorId?: string;
  expenseNumber: string;
  vendorInvoiceNumber?: string;
  status: ExpenseStatus;
  expenseDate: Date;
  dueDate?: Date;
  paidDate?: Date;
  categoryId?: string;
  costCenterId?: string;
  description: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  receiptUrl?: string;
  notes?: string;
  journalEntryId?: string;
  createdAt: Date;
  updatedAt: Date;
  // Virtual fields
  vendor?: Vendor;
  category?: ExpenseCategory;
  costCenter?: CostCenter;
  items?: ExpenseItem[];
  journalEntry?: JournalEntry;
}

// Data Transfer Objects

export interface CreateVendorData {
  vendorNumber: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  vatId?: string;
  taxNumber?: string;
  iban?: string;
  bic?: string;
  paymentTerms?: string;
  defaultPaymentMethod?: PaymentMethod;
  notes?: string;
}

export interface UpdateVendorData {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  vatId?: string;
  taxNumber?: string;
  iban?: string;
  bic?: string;
  paymentTerms?: string;
  defaultPaymentMethod?: PaymentMethod;
  isActive?: boolean;
  notes?: string;
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
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    accountId?: string;
    costCenterId?: string;
  }>;
}

export interface UpdateExpenseData {
  vendorId?: string;
  vendorInvoiceNumber?: string;
  expenseDate?: Date;
  dueDate?: Date;
  categoryId?: string;
  costCenterId?: string;
  description?: string;
  notes?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    accountId?: string;
    costCenterId?: string;
  }>;
}

// ============================================
// QUOTES MODULE TYPES
// ============================================

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface QuoteItem {
  id: string;
  quoteId: string;
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface Quote {
  id: string;
  userId: string;
  customerId: string;
  quoteNumber: string;
  status: QuoteStatus;
  issueDate: Date;
  validUntil: Date;
  convertedDate?: Date;
  convertedInvoiceId?: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string;
  termsConditions?: string;
  pdfUrl?: string;
  items?: QuoteItem[];
  customer?: Customer;
  company?: Company;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuoteData {
  customerId: string;
  issueDate: string;
  validUntil: string;
  notes?: string;
  termsConditions?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    taxRate?: number;
  }>;
}

export interface UpdateQuoteData {
  customerId?: string;
  issueDate?: string;
  validUntil?: string;
  notes?: string;
  termsConditions?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    taxRate?: number;
  }>;
}

export interface QuoteStats {
  totalQuotes: number;
  pendingValue: number;
  acceptedValue: number;
  conversionRate: number;
  draftQuotes: number;
  sentQuotes: number;
  acceptedQuotes: number;
  rejectedQuotes: number;
  expiredQuotes: number;
}

// ============================================
// INCOMING INVOICES MODULE TYPES (Eingangsrechnungen)
// ============================================

export type IncomingInvoiceStatus = 'draft' | 'reviewed' | 'approved' | 'booked' | 'paid' | 'rejected' | 'cancelled';

export type IncomingPaymentMethod = 'bank_transfer' | 'cash' | 'credit_card' | 'debit_card' | 'paypal' | 'direct_debit' | 'other';

export interface IncomingInvoiceItem {
  id: string;
  incomingInvoiceId: string;
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  accountId?: string;
  costCenterId?: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  createdAt: Date;
  // Virtual fields
  account?: ChartOfAccount;
  costCenter?: CostCenter;
}

export interface IncomingInvoice {
  id: string;
  userId: string;
  vendorId?: string;

  // Invoice identification
  invoiceNumber: string;
  vendorInvoiceNumber?: string;

  // Status
  status: IncomingInvoiceStatus;

  // Dates
  invoiceDate?: Date;
  dueDate?: Date;
  receivedDate: Date;
  paidDate?: Date;
  bookedDate?: Date;

  // Amounts
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;

  // Vendor details (extracted or manual)
  vendorName?: string;
  vendorAddress?: string;
  vendorVatId?: string;
  vendorTaxNumber?: string;
  vendorIban?: string;
  vendorBic?: string;

  // Payment information
  paymentReference?: string;
  paymentMethod?: IncomingPaymentMethod;

  // Document handling
  filePath?: string;
  fileType?: string;
  originalFilename?: string;

  // OCR data
  ocrRawText?: string;
  ocrConfidence?: number;
  ocrProcessedAt?: Date;

  // Categorization
  categoryId?: string;
  costCenterId?: string;

  // Accounting
  journalEntryId?: string;
  expenseAccountId?: string;

  // Notes
  description?: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;

  // Virtual fields
  vendor?: Vendor;
  category?: ExpenseCategory;
  costCenter?: CostCenter;
  items?: IncomingInvoiceItem[];
  journalEntry?: JournalEntry;
  expenseAccount?: ChartOfAccount;
}

export interface OcrExtractedData {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  vendorName?: string;
  vendorAddress?: string;
  vendorVatId?: string;
  vendorTaxNumber?: string;
  vendorIban?: string;
  vendorBic?: string;
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  taxRate?: number;
  items?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
  }>;
  paymentReference?: string;
  currency?: string;
}

export interface OcrResult {
  rawText: string;
  confidence: number;
  extractedData: OcrExtractedData;
  processedAt: Date;
}

export interface CreateIncomingInvoiceData {
  vendorId?: string;
  vendorInvoiceNumber?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  receivedDate?: Date;
  vendorName?: string;
  vendorAddress?: string;
  vendorVatId?: string;
  vendorTaxNumber?: string;
  vendorIban?: string;
  vendorBic?: string;
  paymentReference?: string;
  paymentMethod?: IncomingPaymentMethod;
  categoryId?: string;
  costCenterId?: string;
  expenseAccountId?: string;
  description?: string;
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    taxRate?: number;
    accountId?: string;
    costCenterId?: string;
  }>;
}

export interface UpdateIncomingInvoiceData {
  vendorId?: string;
  vendorInvoiceNumber?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  vendorName?: string;
  vendorAddress?: string;
  vendorVatId?: string;
  vendorTaxNumber?: string;
  vendorIban?: string;
  vendorBic?: string;
  paymentReference?: string;
  paymentMethod?: IncomingPaymentMethod;
  categoryId?: string;
  costCenterId?: string;
  expenseAccountId?: string;
  description?: string;
  notes?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    taxRate?: number;
    accountId?: string;
    costCenterId?: string;
  }>;
}

export interface IncomingInvoiceFilters {
  search?: string;
  status?: IncomingInvoiceStatus;
  vendorId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface IncomingInvoiceStats {
  totalInvoices: number;
  draftCount: number;
  reviewedCount: number;
  approvedCount: number;
  bookedCount: number;
  paidCount: number;
  totalUnpaid: number;
  totalOverdue: number;
  totalThisMonth: number;
}
