import { apiClient } from './client';
import { DashboardStats, MonthlyRevenue, CustomerRevenue, TaxSummary, StatusDistribution, DateRange } from '@/types';

export const reportsApi = {
  async getDashboardStats() {
    return apiClient.get<DashboardStats>('/reports/dashboard');
  },

  async getRevenueByMonth(dateRange?: DateRange) {
    return apiClient.get<MonthlyRevenue[]>('/reports/revenue/monthly', dateRange);
  },

  async getRevenueByCustomer(dateRange?: DateRange, limit = 10) {
    return apiClient.get<CustomerRevenue[]>('/reports/revenue/customers', { ...dateRange, limit });
  },

  async getTaxSummary(dateRange?: DateRange) {
    return apiClient.get<TaxSummary[]>('/reports/tax', dateRange);
  },

  async getInvoiceStatusSummary(dateRange?: DateRange) {
    return apiClient.get<StatusDistribution[]>('/reports/invoices/status', dateRange);
  },

  async exportRevenueCsv(dateRange?: DateRange) {
    const blob = await apiClient.downloadBlob(`/reports/export/revenue${dateRange ? `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}` : ''}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'umsatz-bericht.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  async exportCustomersCsv(dateRange?: DateRange) {
    const blob = await apiClient.downloadBlob(`/reports/export/customers${dateRange ? `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}` : ''}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kunden-bericht.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  async exportTaxCsv(dateRange?: DateRange) {
    const blob = await apiClient.downloadBlob(`/reports/export/tax${dateRange ? `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}` : ''}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'steuer-bericht.csv';
    a.click();
    URL.revokeObjectURL(url);
  },
};
