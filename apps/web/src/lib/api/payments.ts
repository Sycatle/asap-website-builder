import { apiClient } from './client';

export interface BalanceResponse {
  balance_cents: number;
  balance_euros: number;
  currency: string;
}

export interface CreatePaymentIntentRequest {
  amount_cents: number;
}

export interface PaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  amount_cents: number;
}

export interface TransactionResponse {
  id: string;
  transaction_type: string;
  amount_cents: number;
  amount_euros: number;
  currency: string;
  status: string;
  description?: string;
  created_at: string;
  completed_at?: string;
}

export const paymentsAPI = {
  /**
   * Get user balance
   */
  async getBalance(): Promise<BalanceResponse> {
    return apiClient.get<BalanceResponse>('/payments/balance');
  },

  /**
   * Create a payment intent for adding credits
   * @param amountCents Amount in cents (e.g., 1000 = 10 EUR)
   */
  async createPaymentIntent(amountCents: number): Promise<PaymentIntentResponse> {
    return apiClient.post<PaymentIntentResponse>('/payments/payment-intent', {
      amount_cents: amountCents,
    });
  },

  /**
   * Get transaction history
   */
  async getTransactions(): Promise<TransactionResponse[]> {
    return apiClient.get<TransactionResponse[]>('/payments/transactions');
  },
};
