import { apiClient } from './client';
import { Invoice, InvoiceItem, InvoiceFilters, ApiResponse } from '@/types';

interface InvoiceStats {
  totalRevenue: number;
  outstandingAmount: number;
  overdueAmount: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
}

interface CreateInvoiceData {
  customerId: string;
  issueDate: string;
  dueDate: string;
  notes?: string;
  paymentTerms?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    taxRate?: number;
  }>;
}

interface InvoiceListResponse {
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const invoicesApi = {
  async getAll(filters: InvoiceFilters = {}) {
    const response = await apiClient.get<Invoice[]>('/invoices', filters as Record<string, string | number | boolean | undefined>);
    return {
      ...response,
      pagination: (response as ApiResponse<Invoice[]> & { pagination?: InvoiceListResponse['pagination'] }).pagination,
    };
  },

  async getById(id: string) {
    return apiClient.get<Invoice>(`/invoices/${id}`);
  },

  async getStats() {
    return apiClient.get<InvoiceStats>('/invoices/stats');
  },

  async create(data: CreateInvoiceData) {
    return apiClient.post<Invoice>('/invoices', data);
  },

  async update(id: string, data: Partial<CreateInvoiceData>) {
    return apiClient.put<Invoice>(`/invoices/${id}`, data);
  },

  async updateStatus(id: string, status: Invoice['status']) {
    return apiClient.patch<Invoice>(`/invoices/${id}/status`, { status });
  },

  async delete(id: string) {
    return apiClient.delete(`/invoices/${id}`);
  },

  async downloadPdf(id: string, invoiceNumber: string) {
    const blob = await apiClient.downloadBlob(`/invoices/${id}/pdf`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async downloadXml(id: string, invoiceNumber: string) {
    const blob = await apiClient.downloadBlob(`/invoices/${id}/xml`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceNumber}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async parseXml(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices/import/parse`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to parse XML');
    }

    return response.json();
  },

  async executeImport(xmlContent: string, parsedData?: unknown) {
    return apiClient.post<{ invoice: Invoice; customer?: { id: string; wasCreated: boolean } }>('/invoices/import/execute', {
      xmlContent,
      parsedData,
    });
  },
};
