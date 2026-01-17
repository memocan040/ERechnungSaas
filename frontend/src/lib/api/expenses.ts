import { apiClient } from './client';
import type {
  Expense,
  CreateExpenseData,
  UpdateExpenseData,
  ExpenseCategory,
  CostCenter,
  ExpenseStatus,
} from '@/types';

interface GetExpensesFilters {
  search?: string;
  status?: ExpenseStatus;
  vendorId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

interface GetExpensesResponse {
  success: boolean;
  data: Expense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ExpenseResponse {
  success: boolean;
  data: Expense;
  message?: string;
}

interface CategoriesResponse {
  success: boolean;
  data: ExpenseCategory[];
}

interface CostCentersResponse {
  success: boolean;
  data: CostCenter[];
}

export const expensesApi = {
  async getExpenses(filters: GetExpensesFilters = {}): Promise<GetExpensesResponse> {
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
    const url = queryString ? `/expenses?${queryString}` : '/expenses';

    const response = await apiClient.get<Expense[]>(url);
    return response as GetExpensesResponse;
  },

  async getExpense(id: string): Promise<ExpenseResponse> {
    const response = await apiClient.get<Expense>(`/expenses/${id}`);
    return response as ExpenseResponse;
  },

  async createExpense(data: CreateExpenseData): Promise<ExpenseResponse> {
    const response = await apiClient.post<Expense>('/expenses', data);
    return response as ExpenseResponse;
  },

  async updateExpense(id: string, data: UpdateExpenseData): Promise<ExpenseResponse> {
    const response = await apiClient.put<Expense>(`/expenses/${id}`, data);
    return response as ExpenseResponse;
  },

  async updateExpenseStatus(id: string, status: ExpenseStatus): Promise<ExpenseResponse> {
    const response = await apiClient.patch<Expense>(`/expenses/${id}/status`, { status });
    return response as ExpenseResponse;
  },

  async deleteExpense(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/expenses/${id}`);
    return response as { success: boolean; message: string };
  },

  async getCategories(): Promise<CategoriesResponse> {
    const response = await apiClient.get<ExpenseCategory[]>('/expenses/categories/all');
    return response as CategoriesResponse;
  },

  async createCategory(data: {
    name: string;
    description?: string;
    defaultAccountId?: string;
  }): Promise<{ success: boolean; data: ExpenseCategory; message: string }> {
    const response = await apiClient.post<ExpenseCategory>('/expenses/categories', data);
    return response as { success: boolean; data: ExpenseCategory; message: string };
  },

  async getCostCenters(): Promise<CostCentersResponse> {
    const response = await apiClient.get<CostCenter[]>('/expenses/cost-centers/all');
    return response as CostCentersResponse;
  },

  async createCostCenter(data: {
    code: string;
    name: string;
    description?: string;
  }): Promise<{ success: boolean; data: CostCenter; message: string }> {
    const response = await apiClient.post<CostCenter>('/expenses/cost-centers', data);
    return response as { success: boolean; data: CostCenter; message: string };
  },

  async uploadReceipt(id: string, file: File): Promise<ExpenseResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    // We need to pass the FormData directly. The apiClient might try to stringify it if we're not careful.
    // Usually apiClient wrapper handles FormData if content-type is not set or set to multipart.
    // Let's check apiClient implementation if possible, or assume standard fetch behavior where body=FormData works.
    // Looking at common patterns:
    const response = await apiClient.post<Expense>(`/expenses/${id}/receipt`, formData);
    return response as ExpenseResponse;
  },
};
