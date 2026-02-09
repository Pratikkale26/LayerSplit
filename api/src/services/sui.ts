import { Transaction } from "@mysten/sui/transactions";
import { env } from "../config/env.js";
import type { InterestInfo } from "../types/index.js";

const PACKAGE_ID = env.PACKAGE_ID;
const BILL_REGISTRY_ID = env.BILL_REGISTRY_ID;
const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const DAILY_RATE_BPS = 100; // 1% per day = 100 basis points

// Calculate interest (1% per day after 3 day grace period)
export function calculateInterest(
    principalAmount: bigint,
    amountPaid: bigint,
    createdAt: Date
): InterestInfo {
    const remaining = principalAmount - amountPaid;
    const now = Date.now();
    const createdTime = createdAt.getTime();
    const elapsed = now - createdTime;

    let interest = BigInt(0);
    let daysOverdue = 0;

    if (elapsed > GRACE_PERIOD_MS) {
        const overdueMs = elapsed - GRACE_PERIOD_MS;
        daysOverdue = Math.floor(overdueMs / (24 * 60 * 60 * 1000));
        // interest = principal * days * 1%
        interest = (remaining * BigInt(daysOverdue) * BigInt(DAILY_RATE_BPS)) / BigInt(10000);
    }

    const total = remaining + interest;

    return {
        principal: remaining.toString(),
        interest: interest.toString(),
        total: total.toString(),
        daysOverdue,
    };
}

// Build PTB for creating equal split bill
export async function buildCreateEqualSplitPtb(params: {
    title: string;
    description: string;
    totalAmount: bigint;
    debtors: string[];
}): Promise<string> {
    const tx = new Transaction();

    // Call create_equal_split and capture return values
    const [bill, debts] = tx.moveCall({
        target: `${PACKAGE_ID}::bill::create_equal_split`,
        arguments: [
            tx.object(BILL_REGISTRY_ID),
            tx.object("0x6"), // Clock
            tx.pure.string(params.title),
            tx.pure.string(params.description),
            tx.pure.u64(params.totalAmount),
            tx.pure.vector("address", params.debtors),
            tx.pure.option("vector<u8>", null), // receipt_hash
        ],
    });

    // Share the bill (makes it accessible to all)
    tx.moveCall({
        target: `${PACKAGE_ID}::bill::share_bill`,
        arguments: [bill!],
    });

    // Transfer debts to their respective debtors
    tx.moveCall({
        target: `${PACKAGE_ID}::bill::transfer_debts`,
        arguments: [debts!],
    });

    // Return JSON string for API response
    return JSON.stringify(await tx.toJSON());
}

// Build PTB for creating custom split bill
export async function buildCreateCustomSplitPtb(params: {
    title: string;
    description: string;
    totalAmount: bigint;
    debtors: string[];
    amounts: bigint[];
}): Promise<string> {
    const tx = new Transaction();

    // Call create_custom_split and capture return values
    const [bill, debts] = tx.moveCall({
        target: `${PACKAGE_ID}::bill::create_custom_split`,
        arguments: [
            tx.object(BILL_REGISTRY_ID),
            tx.object("0x6"),
            tx.pure.string(params.title),
            tx.pure.string(params.description),
            tx.pure.u64(params.totalAmount),
            tx.pure.vector("address", params.debtors),
            tx.pure.vector("u64", params.amounts),
            tx.pure.option("vector<u8>", null),
        ],
    });

    // Share the bill
    tx.moveCall({
        target: `${PACKAGE_ID}::bill::share_bill`,
        arguments: [bill!],
    });

    // Transfer debts to debtors
    tx.moveCall({
        target: `${PACKAGE_ID}::bill::transfer_debts`,
        arguments: [debts!],
    });

    // Return JSON string for API response
    return JSON.stringify(await tx.toJSON());
}

// Build PTB for paying a debt
export function buildPayDebtPtb(params: {
    debtObjectId: string;
    coinId: string;
    amount: bigint;
    creditorAddress: string;
}): string {
    const tx = new Transaction();

    // Split coin for payment
    const [paymentCoin] = tx.splitCoins(tx.object(params.coinId), [
        tx.pure.u64(params.amount),
    ]);

    tx.moveCall({
        target: `${PACKAGE_ID}::contract::pay_debt`,
        arguments: [
            tx.object(params.debtObjectId),
            paymentCoin,
        ],
    });

    return Buffer.from(tx.serialize()).toString("base64");
}
