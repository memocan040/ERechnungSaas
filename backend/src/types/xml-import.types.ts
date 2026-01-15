import { Invoice, Customer, InvoiceItem } from './index';

export interface ParsedInvoiceData {
  invoice: {
    invoiceNumber: string;
    issueDate: Date;
    dueDate: Date;
    currency: string;
    subtotal: number;
    taxAmount: number;
    total: number;
    notes?: string;
    paymentTerms?: string;
  };
  customer: {
    companyName: string;
    street?: string;
    houseNumber?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    vatId?: string;
    email?: string;
    phone?: string;
    existingCustomerId?: string;
    isNewCustomer: boolean;
  };
  items: Array<{
    position: number;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    taxRate: number;
    subtotal: number;
    taxAmount: number;
    total: number;
  }>;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportResult {
  success: boolean;
  invoice?: Invoice & {
    items?: InvoiceItem[];
    customer?: Customer;
  };
  customer?: Customer & {
    wasCreated: boolean;
  };
  error?: string;
  details?: {
    code: string;
    field?: string;
    message: string;
  };
}

export interface ImportOptions {
  createCustomerIfNotExists?: boolean;
  overrideInvoiceNumber?: boolean;
  customCustomerId?: string;
}

export interface XmlParserOptions {
  ignoreAttributes: boolean;
  removeNSPrefix: boolean;
  parseAttributeValue: boolean;
  parseTagValue: boolean;
  trimValues: boolean;
  processEntities: boolean;
}
