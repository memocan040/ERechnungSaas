import { apiClient } from './client';
import {
  ChartOfAccount,
  CreateChartOfAccountData,
  JournalEntry,
  CreateJournalEntryData,
  TrialBalance,
  ApiResponse,
} from '@/types';

interface AccountFilters {
  accountType?: string;
  accountClass?: string;
  includeInactive?: boolean;
  search?: string;
}

interface JournalEntryFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  accountId?: string;
  entryType?: string;
  fiscalYear?: number;
  fiscalPeriod?: number;
  page?: number;
  limit?: number;
}

export const accountingApi = {
  // Chart of Accounts
  async getAccounts(filters: AccountFilters = {}) {
    return apiClient.get<ChartOfAccount[]>('/accounting/accounts', filters as Record<string, string | number | boolean | undefined>);
  },

  async getAccountById(id: string) {
    return apiClient.get<ChartOfAccount>(`/accounting/accounts/${id}`);
  },

  async createAccount(data: CreateChartOfAccountData) {
    return apiClient.post<ChartOfAccount>('/accounting/accounts', data);
  },

  async updateAccount(id: string, data: Partial<CreateChartOfAccountData>) {
    return apiClient.put<ChartOfAccount>(`/accounting/accounts/${id}`, data);
  },

  async deactivateAccount(id: string) {
    return apiClient.delete<void>(`/accounting/accounts/${id}`);
  },

  async seedStandardAccounts(chartType: 'SKR03' | 'SKR04' = 'SKR03') {
    return apiClient.post<{ created: number; skipped: number }>('/accounting/accounts/seed', { chartType });
  },

  async getAccountBalance(id: string, asOfDate?: string) {
    const params = asOfDate ? { asOfDate } : {};
    return apiClient.get<{ balance: number }>(`/accounting/accounts/${id}/balance`, params);
  },

  // Journal Entries
  async getJournalEntries(filters: JournalEntryFilters = {}) {
    const response = await apiClient.get<JournalEntry[]>('/accounting/journal-entries', filters as Record<string, string | number | boolean | undefined>);
    return {
      ...response,
      pagination: (response as ApiResponse<JournalEntry[]> & { pagination?: any }).pagination,
    };
  },

  async getJournalEntryById(id: string) {
    return apiClient.get<JournalEntry>(`/accounting/journal-entries/${id}`);
  },

  async createJournalEntry(data: CreateJournalEntryData) {
    return apiClient.post<JournalEntry>('/accounting/journal-entries', data);
  },

  async postJournalEntry(id: string) {
    return apiClient.post<JournalEntry>(`/accounting/journal-entries/${id}/post`, {});
  },

  async reverseJournalEntry(id: string, reason: string) {
    return apiClient.post<JournalEntry>(`/accounting/journal-entries/${id}/reverse`, { reason });
  },

  // Reporting
  async getTrialBalance(asOfDate: string) {
    return apiClient.get<TrialBalance>('/accounting/trial-balance', { asOfDate });
  },
};
