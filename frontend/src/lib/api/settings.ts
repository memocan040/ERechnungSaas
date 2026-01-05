import { apiClient } from './client';
import { UserSettings } from '@/types';

interface UpdateSettingsData {
  defaultTaxRate?: number;
  defaultPaymentDays?: number;
  invoicePrefix?: string;
  currency?: string;
  language?: string;
  emailNotifications?: boolean;
}

export const settingsApi = {
  async get() {
    return apiClient.get<UserSettings>('/settings');
  },

  async update(data: UpdateSettingsData) {
    return apiClient.put<UserSettings>('/settings', data);
  },

  async getNextInvoiceNumber() {
    return apiClient.get<{ nextInvoiceNumber: string }>('/settings/next-invoice-number');
  },
};
