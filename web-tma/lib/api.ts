import axios from 'axios';

// Create axios instance - empty baseURL uses same origin (goes through Next.js rewrites)
const api = axios.create({
    baseURL: '',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

// User endpoints
export const userApi = {
    // Get user profile by Telegram ID
    getProfile: (telegramId: string | number) =>
        api.get(`/api/users/${telegramId}`),

    // Link wallet to Telegram ID
    linkWallet: (data: {
        telegramId: string;
        walletAddress: string;
        username?: string;
    }) => api.post('/api/users/link', data),

    // Get debts owed by user
    getDebts: (telegramId: string | number) =>
        api.get(`/api/users/${telegramId}/debts`),

    // Get debts owed to user
    getReceivables: (telegramId: string | number) =>
        api.get(`/api/users/${telegramId}/receivables`),

    // Get user summary
    getSummary: (telegramId: string | number) =>
        api.get(`/api/users/${telegramId}/summary`),
};

// Bills endpoints
export const billsApi = {
    create: (data: {
        title: string;
        totalAmount: string;
        splitType: 'EQUAL' | 'CUSTOM';
        creatorTelegramId: string;
        debtors: Array<{ telegramId: string; amount?: string }>;
    }) => api.post('/api/bills', data),
};

// Payments endpoints
export const paymentsApi = {
    getInterest: (debtId: string) =>
        api.get(`/api/payments/interest/${debtId}`),

    pay: (data: {
        debtId: string;
    }) => api.post('/api/payments/pay', data),

    confirm: (data: {
        debtId: string;
        txDigest: string;
        amountPaid: string;
    }) => api.post('/api/payments/confirm', data),

    getHistory: (telegramId: string | number) =>
        api.get(`/api/payments/history/${telegramId}`),
};

export default api;
