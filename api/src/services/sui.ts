import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { env, CONTRACT } from '../config/env.js';

// Sui client singleton
export const suiClient = new SuiClient({
    url: getFullnodeUrl(env.SUI_NETWORK),
});

/**
 * Get the BillRegistry shared object ID
 * This is created when the package is published
 */
export async function getRegistryObjectId(): Promise<string> {
    // Query for BillRegistry objects owned by the package
    const objects = await suiClient.getOwnedObjects({
        owner: CONTRACT.PACKAGE_ID,
        filter: {
            StructType: `${CONTRACT.PACKAGE_ID}::types::BillRegistry`,
        },
    });

    if (objects.data.length === 0) {
        throw new Error('BillRegistry not found. Make sure contract is deployed.');
    }

    return objects.data[0].data?.objectId || '';
}

/**
 * Build PTB for creating an equal split bill
 */
export function buildCreateEqualSplitPtb(params: {
    registryId: string;
    title: string;
    description: string;
    totalAmount: bigint;
    debtors: string[];
}): string {
    const tx = new Transaction();

    tx.moveCall({
        target: `${CONTRACT.PACKAGE_ID}::layersplit::create_bill_equal_split`,
        arguments: [
            tx.object(params.registryId),
            tx.object('0x6'), // Clock object
            tx.pure.vector('u8', Array.from(new TextEncoder().encode(params.title))),
            tx.pure.vector('u8', Array.from(new TextEncoder().encode(params.description))),
            tx.pure.u64(params.totalAmount),
            tx.pure.vector('address', params.debtors),
            tx.pure.option('vector<u8>', null), // receipt_hash
        ],
    });

    return tx.serialize();
}

/**
 * Build PTB for creating a custom split bill
 */
export function buildCreateCustomSplitPtb(params: {
    registryId: string;
    title: string;
    description: string;
    totalAmount: bigint;
    debtors: string[];
    amounts: bigint[];
}): string {
    const tx = new Transaction();

    tx.moveCall({
        target: `${CONTRACT.PACKAGE_ID}::layersplit::create_bill_custom_split`,
        arguments: [
            tx.object(params.registryId),
            tx.object('0x6'), // Clock object
            tx.pure.vector('u8', Array.from(new TextEncoder().encode(params.title))),
            tx.pure.vector('u8', Array.from(new TextEncoder().encode(params.description))),
            tx.pure.u64(params.totalAmount),
            tx.pure.vector('address', params.debtors),
            tx.pure.vector('u64', params.amounts.map((a) => a)),
            tx.pure.option('vector<u8>', null), // receipt_hash
        ],
    });

    return tx.serialize();
}

/**
 * Build PTB for paying a debt in full
 */
export function buildPayDebtFullPtb(params: {
    debtId: string;
    billId: string;
    paymentCoinId: string;
}): string {
    const tx = new Transaction();

    tx.moveCall({
        target: `${CONTRACT.PACKAGE_ID}::layersplit::pay_debt_full`,
        arguments: [
            tx.object(params.debtId),
            tx.object(params.billId),
            tx.object('0x6'), // Clock
            tx.object(params.paymentCoinId),
        ],
    });

    return tx.serialize();
}

/**
 * Build PTB for paying a debt partially
 */
export function buildPayDebtPartialPtb(params: {
    debtId: string;
    billId: string;
    paymentCoinId: string;
}): string {
    const tx = new Transaction();

    tx.moveCall({
        target: `${CONTRACT.PACKAGE_ID}::layersplit::pay_debt_partial`,
        arguments: [
            tx.object(params.debtId),
            tx.object(params.billId),
            tx.object('0x6'), // Clock
            tx.object(params.paymentCoinId),
        ],
    });

    return tx.serialize();
}

/**
 * Build PTB for canceling a debt (creator only)
 */
export function buildCancelDebtPtb(params: {
    debtId: string;
    billId: string;
}): string {
    const tx = new Transaction();

    tx.moveCall({
        target: `${CONTRACT.PACKAGE_ID}::layersplit::cancel_debt`,
        arguments: [
            tx.object(params.debtId),
            tx.object(params.billId),
            tx.object('0x6'), // Clock
        ],
    });

    return tx.serialize();
}

/**
 * Calculate interest for a debt on-chain (view function)
 */
export async function calculateInterest(params: {
    debtId: string;
    billId: string;
}): Promise<{ interest: bigint; totalDue: bigint }> {
    const result = await suiClient.devInspectTransactionBlock({
        sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
        transactionBlock: (() => {
            const tx = new Transaction();
            tx.moveCall({
                target: `${CONTRACT.PACKAGE_ID}::layersplit::calculate_interest`,
                arguments: [
                    tx.object(params.debtId),
                    tx.object(params.billId),
                    tx.object('0x6'),
                ],
            });
            return tx;
        })(),
    });

    // Parse results from move call
    if (result.results && result.results[0]?.returnValues) {
        const [interestVal, totalDueVal] = result.results[0].returnValues;
        return {
            // @ts-ignore
            interest: BigInt(interestVal[0] as string),
            // @ts-ignore
            totalDue: BigInt(totalDueVal[0] as string),
        };
    }

    return { interest: 0n, totalDue: 0n };
}

/**
 * Get debt object details from chain
 */
export async function getDebtObject(debtId: string) {
    const object = await suiClient.getObject({
        id: debtId,
        options: {
            showContent: true,
            showType: true,
        },
    });

    return object;
}

/**
 * Get bill object details from chain
 */
export async function getBillObject(billId: string) {
    const object = await suiClient.getObject({
        id: billId,
        options: {
            showContent: true,
            showType: true,
        },
    });

    return object;
}
