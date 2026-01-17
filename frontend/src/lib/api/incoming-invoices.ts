import { apiClient } from './client';
import type {
  IncomingInvoice,
  IncomingInvoiceFilters,
  IncomingInvoiceStatus,
  IncomingInvoiceStats,
  OcrResult,
} from '@/types';

interface GetIncomingInvoicesResponse {
  success: boolean;
  data: IncomingInvoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface IncomingInvoiceResponse {
  success: boolean;
  data: IncomingInvoice;
  message?: string;
}

interface UploadResponse {
  success: boolean;
  data: {
    invoice: IncomingInvoice;
    ocrResult: {
      confidence: number;
      extractedData: OcrResult['extractedData'];
    };
  };
  message?: string;
}

interface StatsResponse {
  success: boolean;
  data: IncomingInvoiceStats;
}

interface CreateIncomingInvoiceData {
  vendorId?: string;
  vendorInvoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  receivedDate?: string;
  vendorName?: string;
  vendorAddress?: string;
  vendorVatId?: string;
  vendorTaxNumber?: string;
  vendorIban?: string;
  vendorBic?: string;
  paymentReference?: string;
  paymentMethod?: string;
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

interface UpdateIncomingInvoiceData {
  vendorId?: string;
  vendorInvoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  vendorName?: string;
  vendorAddress?: string;
  vendorVatId?: string;
  vendorTaxNumber?: string;
  vendorIban?: string;
  vendorBic?: string;
  paymentReference?: string;
  paymentMethod?: string;
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

export const incomingInvoicesApi = {
  async getStats(): Promise<StatsResponse> {
    const response = await apiClient.get<IncomingInvoiceStats>('/incoming-invoices/stats');
    return response as StatsResponse;
  },

  async getInvoices(filters: IncomingInvoiceFilters = {}): Promise<GetIncomingInvoicesResponse> {
    const params = new URLSearchParams();

    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.vendorId) params.append('vendorId', filters.vendorId);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/incoming-invoices?${queryString}` : '/incoming-invoices';

    const response = await apiClient.get<IncomingInvoice[]>(url);
    return response as GetIncomingInvoicesResponse;
  },

  async getInvoice(id: string): Promise<IncomingInvoiceResponse> {
    const response = await apiClient.get<IncomingInvoice>(`/incoming-invoices/${id}`);
    return response as IncomingInvoiceResponse;
  },

  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.upload<UploadResponse['data']>(
      '/incoming-invoices/upload',
      formData
    );
    return response as UploadResponse;
  },

  async createInvoice(data: CreateIncomingInvoiceData): Promise<IncomingInvoiceResponse> {
    const response = await apiClient.post<IncomingInvoice>('/incoming-invoices', data);
    return response as IncomingInvoiceResponse;
  },

  async updateInvoice(id: string, data: UpdateIncomingInvoiceData): Promise<IncomingInvoiceResponse> {
    const response = await apiClient.put<IncomingInvoice>(`/incoming-invoices/${id}`, data);
    return response as IncomingInvoiceResponse;
  },

  async updateStatus(id: string, status: IncomingInvoiceStatus): Promise<IncomingInvoiceResponse> {
    const response = await apiClient.patch<IncomingInvoice>(`/incoming-invoices/${id}/status`, {
      status,
    });
    return response as IncomingInvoiceResponse;
  },

  async bookInvoice(id: string): Promise<IncomingInvoiceResponse> {
    const response = await apiClient.post<IncomingInvoice>(`/incoming-invoices/${id}/book`);
    return response as IncomingInvoiceResponse;
  },

  async markAsPaid(id: string): Promise<IncomingInvoiceResponse> {
    const response = await apiClient.post<IncomingInvoice>(`/incoming-invoices/${id}/mark-paid`);
    return response as IncomingInvoiceResponse;
  },

  async downloadXml(id: string): Promise<Blob> {
    return apiClient.downloadBlob(`/incoming-invoices/${id}/xml`);
  },

  async getFileUrl(id: string): Promise<string> {
    const token = apiClient.getAccessToken();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    return `${baseUrl}/incoming-invoices/${id}/file?token=${token}`;
  },

  async deleteInvoice(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/incoming-invoices/${id}`
    );
    return response as { success: boolean; message: string };
  },
};
