import { apiClient } from './client';

export interface AccountData {
  id: string;
  email: string;
  plan: string;
  data: Record<string, any>;
  avatar_url?: string;
}

export interface UpdateAccountDataRequest {
  data: Record<string, any>;
}

export const accountsAPI = {
  async getAccount(accountId: string): Promise<AccountData> {
    return apiClient.get<AccountData>(`/accounts/${accountId}`);
  },

  async updateAccountData(accountId: string, data: UpdateAccountDataRequest): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>(`/accounts/${accountId}`, data);
  },
};
