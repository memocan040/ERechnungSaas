import { apiClient } from './client';
import { Customer, CustomerFilters, ApiResponse } from '@/types';

interface CustomerStats {
  totalInvoices: number;
  totalRevenue: number;
  outstandingAmount: number;
}

interface CreateCustomerData {
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
  customerNumber?: string;
  notes?: string;
}

export const customersApi = {
  async getAll(filters: CustomerFilters = {}) {
    const response = await apiClient.get<Customer[]>('/customers', filters as Record<string, string | number | boolean | undefined>);
    return {
      ...response,
      pagination: (response as ApiResponse<Customer[]> & { pagination?: { page: number; limit: number; total: number; totalPages: number } }).pagination,
    };
  },

  async getById(id: string) {
    return apiClient.get<Customer>(`/customers/${id}`);
  },

  async getStats(id: string) {
    return apiClient.get<CustomerStats>(`/customers/${id}/stats`);
  },

  async create(data: CreateCustomerData) {
    return apiClient.post<Customer>('/customers', data);
  },

  async update(id: string, data: Partial<CreateCustomerData & { isActive?: boolean }>) {
    return apiClient.put<Customer>(`/customers/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete(`/customers/${id}`);
  },
};
