import { apiClient } from './client';
import type { Vendor, CreateVendorData, UpdateVendorData } from '@/types';

interface GetVendorsFilters {
  search?: string;
  isActive?: boolean;
  country?: string;
  page?: number;
  limit?: number;
}

interface GetVendorsResponse {
  success: boolean;
  data: Vendor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface VendorResponse {
  success: boolean;
  data: Vendor;
  message?: string;
}

export const vendorsApi = {
  async getVendors(filters: GetVendorsFilters = {}): Promise<GetVendorsResponse> {
    const params = new URLSearchParams();

    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.country) params.append('country', filters.country);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/vendors?${queryString}` : '/vendors';

    const response = await apiClient.get<Vendor[]>(url);
    return response as GetVendorsResponse;
  },

  async getVendor(id: string): Promise<VendorResponse> {
    const response = await apiClient.get<Vendor>(`/vendors/${id}`);
    return response as VendorResponse;
  },

  async createVendor(data: CreateVendorData): Promise<VendorResponse> {
    const response = await apiClient.post<Vendor>('/vendors', data);
    return response as VendorResponse;
  },

  async updateVendor(id: string, data: UpdateVendorData): Promise<VendorResponse> {
    const response = await apiClient.put<Vendor>(`/vendors/${id}`, data);
    return response as VendorResponse;
  },

  async deleteVendor(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/vendors/${id}`);
    return response as { success: boolean; message: string };
  },
};
