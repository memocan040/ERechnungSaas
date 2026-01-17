import { apiClient } from './client';
import { ApiResponse } from '@/types';

export interface InvoiceDesignSettings {
  id: string;
  userId: string;
  templateName?: string;
  template?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  showLogo: boolean;
  showCompanyLogo?: boolean;
  showWatermark?: boolean;
  showFooter?: boolean;
  showFooterInfo?: boolean;
  showQrCode?: boolean;
  showBankInfo?: boolean;
  margin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceTemplate {
  name: string;
  displayName: string;
  description: string;
  settings: {
    templateName: string;
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    backgroundColor: string;
    tableHeaderBg: string;
    accentColor: string;
    logoPosition: string;
    logoSize: string;
    fontFamily: string;
  };
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
