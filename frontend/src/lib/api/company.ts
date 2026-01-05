import { apiClient } from './client';
import { Company } from '@/types';

interface UpdateCompanyData {
  name?: string;
  legalName?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  vatId?: string;
  taxNumber?: string;
  tradeRegister?: string;
  court?: string;
  managingDirector?: string;
  phone?: string;
  email?: string;
  website?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
}

export const companyApi = {
  async get() {
    return apiClient.get<Company>('/company');
  },

  async update(data: UpdateCompanyData) {
    return apiClient.put<Company>('/company', data);
  },

  async uploadLogo(file: File) {
    const formData = new FormData();
    formData.append('logo', file);
    return apiClient.upload<Company>('/company/logo', formData);
  },
};
