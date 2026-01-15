import { apiClient } from './client';
import { ApiResponse } from '@/types';

export interface InvoiceDesignSettings {
  id: string;
  userId: string;
  template: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  showLogo: boolean;
  showWatermark: boolean;
  showFooter: boolean;
  showQrCode: boolean;
  margin: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  features: string[];
}

export const invoiceDesignApi = {
  async get() {
    return apiClient.get<InvoiceDesignSettings>('/invoice-design');
  },

  async getTemplates() {
    return apiClient.get<InvoiceTemplate[]>('/invoice-design/templates');
  },

  async applyTemplate(templateName: string) {
    return apiClient.post<InvoiceDesignSettings>(`/invoice-design/templates/${templateName}`, {});
  },

  async update(data: Partial<InvoiceDesignSettings>) {
    return apiClient.put<InvoiceDesignSettings>('/invoice-design', data);
  },
};
