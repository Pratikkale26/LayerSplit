// API Response Types
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

// User Types
export interface UserProfile {
    id: string;
    telegramId: string;
    walletAddress: string;
    username?: string;
    createdAt: Date;
}

export interface UserSummary {
    id: string;
    telegramId: string;
    username?: string;
}

// Group Types
export interface GroupResponse {
    id: string;
    telegramGroupId: string;
    name: string;
    createdAt: Date;
    memberCount: number;
}

// Bill Types
export type SplitType = "EQUAL" | "CUSTOM" | "DUTCH";

export interface BillResponse {
    id: string;
    suiObjectId?: string;
    title: string;
    totalAmount: string;
    splitType: SplitType;
    isSettled: boolean;
    createdAt: Date;
    debts?: DebtResponse[];
}

// Debt Types
export interface DebtResponse {
    id: string;
    suiObjectId?: string;
    principalAmount: string;
    amountPaid: string;
    isSettled: boolean;
    debtor: UserSummary;
    creditor: UserSummary;
}

// PTB Response
export interface PtbResponse {
    transactionBytes: string;
    message: string;
}

// Interest Calculation
export interface InterestInfo {
    principal: string;
    interest: string;
    total: string;
    daysOverdue: number;
}
