// Shared types for the API

// Request/Response types
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

// User types
export interface UserProfile {
    id: string;
    telegramId: string;
    walletAddress: string;
    username?: string;
    createdAt: Date;
}

export interface LinkWalletRequest {
    telegramId: string;
    walletAddress: string;
    username?: string;
}

// Group types
export interface CreateGroupRequest {
    telegramGroupId: string;
    name: string;
    adminTelegramId: string;
}

export interface AddMemberRequest {
    telegramId: string;
}

// Bill types
export type SplitType = 'EQUAL' | 'CUSTOM' | 'DUTCH';

export interface CreateBillRequest {
    groupId?: string;
    title: string;
    description?: string;
    totalAmount: string; // BigInt as string
    splitType: SplitType;
    debtors: {
        telegramId: string;
        amount?: string; // For custom split
    }[];
}

export interface BillResponse {
    id: string;
    suiObjectId?: string;
    title: string;
    totalAmount: string;
    splitType: SplitType;
    isSettled: boolean;
    createdAt: Date;
    debts: DebtResponse[];
}

// Debt types
export interface DebtResponse {
    id: string;
    suiObjectId?: string;
    principalAmount: string;
    amountPaid: string;
    isSettled: boolean;
    debtor: {
        id: string;
        telegramId: string;
        username?: string;
    };
    creditor: {
        id: string;
        telegramId: string;
        username?: string;
    };
}

// Payment types
export interface PayDebtRequest {
    debtId: string;
    suiDebtObjectId: string;
    suiBillObjectId: string;
    paymentCoinId: string;
    payFull: boolean;
}

export interface PayAllRequest {
    debts: {
        debtId: string;
        suiDebtObjectId: string;
        suiBillObjectId: string;
    }[];
    paymentCoinId: string;
}

export interface ConfirmPaymentRequest {
    debtId: string;
    transactionDigest: string;
    amountPaid: string;
}

// PTB Response
export interface PtbResponse {
    transactionBytes: string;
    message: string;
}
