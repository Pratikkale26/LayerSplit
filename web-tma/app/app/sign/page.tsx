'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction, ConnectButton, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { motion } from 'framer-motion';
import { Check, Loader2, AlertCircle, FileText, Users, Wallet } from 'lucide-react';
import api from '@/lib/api';

interface BillData {
    id: string;
    title: string;
    totalAmount: string;
    splitType: string;
    creator: {
        username?: string;
        walletAddress: string;
    };
    debts: Array<{
        id: string;
        principalAmount: string;
        debtor: {
            username?: string;
            walletAddress: string;
        };
    }>;
    transactionBytes: string;
}

function SignPageContent() {
    const searchParams = useSearchParams();
    const billId = searchParams.get('billId');
    const account = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signAndExecute, isPending: isSigning } = useSignAndExecuteTransaction();

    const [bill, setBill] = useState<BillData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [txDigest, setTxDigest] = useState('');

    // Initialize Telegram WebApp
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
            const webapp = (window as any).Telegram.WebApp;
            webapp.ready();
            webapp.expand();
        }
    }, []);

    // Fetch bill data
    useEffect(() => {
        if (billId) {
            fetchBill();
        } else {
            setError('No bill ID provided');
            setLoading(false);
        }
    }, [billId]);

    const fetchBill = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/bills/${billId}/sign`);
            if (response.data.success) {
                setBill(response.data.data);
            } else {
                setError(response.data.error || 'Failed to load bill');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load bill');
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async () => {
        if (!bill || !account) return;

        try {
            setError('');
            console.log('Starting sign process...');
            console.log('Transaction bytes:', bill.transactionBytes?.substring(0, 50) + '...');

            // Parse JSON transaction and deserialize to Transaction object
            const txData = JSON.parse(bill.transactionBytes);
            const tx = Transaction.from(txData);
            console.log('Transaction deserialized successfully');

            // Sign and execute the transaction
            const result = await signAndExecute({
                transaction: tx,
            });

            console.log('Transaction result:', result);

            // Query transaction to get created objects (bill and debt object IDs)
            let debtObjectIds: { debtorAddress: string; objectId: string }[] = [];
            let billSuiObjectId: string | undefined;

            try {
                // Wait for transaction and get full details with object changes
                const txDetails = await suiClient.waitForTransaction({
                    digest: result.digest,
                    options: {
                        showObjectChanges: true,
                    },
                });

                console.log('Transaction details:', txDetails);

                if (txDetails.objectChanges) {
                    // Extract Bill object ID (shared object)
                    const createdBill = txDetails.objectChanges.find((change: any) =>
                        change.type === 'created' &&
                        change.objectType?.includes('::types::Bill')
                    ) as any;

                    if (createdBill) {
                        billSuiObjectId = createdBill.objectId;
                        console.log('Extracted bill object ID:', billSuiObjectId);
                    }

                    // Filter for created Debt objects
                    const createdDebts = txDetails.objectChanges.filter((change: any) =>
                        change.type === 'created' &&
                        change.objectType?.includes('::types::Debt')
                    );

                    console.log('Created debts:', createdDebts);

                    // Map to debtObjectIds format
                    debtObjectIds = createdDebts.map((change: any) => ({
                        debtorAddress: change.owner?.AddressOwner || '',
                        objectId: change.objectId,
                    })).filter((d: any) => d.debtorAddress);

                    console.log('Extracted debt object IDs:', debtObjectIds);
                }
            } catch (queryErr) {
                console.error('Failed to query transaction details:', queryErr);
                // Continue anyway - backend will just not have object IDs
            }

            // Confirm with backend - include billSuiObjectId
            await api.post(`/api/bills/${billId}/confirm`, {
                transactionDigest: result.digest,
                suiObjectId: billSuiObjectId,  // The actual Bill object ID
                debtObjectIds: debtObjectIds.length > 0 ? debtObjectIds : undefined,
            });

            setTxDigest(result.digest);
            setSuccess(true);

            // Close TMA after success (with delay for user to see)
            setTimeout(() => {
                if ((window as any).Telegram?.WebApp) {
                    (window as any).Telegram.WebApp.close();
                }
            }, 3000);
        } catch (err: any) {
            console.error('Signing failed:', err);
            console.error('Full error:', JSON.stringify(err, null, 2));
            setError(err.message || 'Transaction failed');
        }
    };

    const formatSui = (mist: string): string => {
        const sui = Number(BigInt(mist)) / 1_000_000_000;
        return sui.toFixed(2);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (success) {
        const explorerUrl = `https://suiscan.xyz/testnet/tx/${txDigest}`;
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-2xl p-8 text-center border border-green-500/30"
                >
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Bill Created On-Chain!</h2>
                    <p className="text-gray-400 text-sm mb-4">
                        Transaction confirmed successfully
                    </p>
                    <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-blue-400 bg-black/30 rounded p-2 break-all hover:bg-black/50 transition-colors"
                    >
                        🔗 View on Suiscan: {txDigest.slice(0, 16)}...
                    </a>
                    <p className="text-gray-500 text-xs mt-4">Closing automatically...</p>
                </motion.div>
            </div>
        );
    }

    if (error && !bill) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-white mb-2">Error</h2>
                    <p className="text-red-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white p-4">
            {/* Header */}
            <header className="text-center mb-6">
                <h1 className="text-xl font-bold">Sign Transaction</h1>
                <p className="text-gray-400 text-sm">Confirm bill creation on Sui</p>
            </header>

            {/* Bill Details */}
            {bill && (
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-6 border border-white/10 mb-6"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="font-bold">{bill.title}</h2>
                            <p className="text-gray-400 text-sm">{bill.splitType} split</p>
                        </div>
                    </div>

                    <div className="bg-black/30 rounded-xl p-4 mb-4">
                        <p className="text-gray-400 text-sm mb-1">Total Amount</p>
                        <p className="text-2xl font-bold text-blue-400">
                            {formatSui(bill.totalAmount)} SUI
                        </p>
                    </div>

                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <p className="text-gray-400 text-sm">Split with</p>
                        </div>
                        <div className="space-y-2">
                            {bill.debts.map((debt) => (
                                <div key={debt.id} className="flex justify-between items-center bg-black/20 rounded-lg p-3">
                                    <span className="text-sm">
                                        @{debt.debtor.username || debt.debtor.walletAddress.slice(0, 8)}
                                    </span>
                                    <span className="text-blue-400 font-medium">
                                        {formatSui(debt.principalAmount)} SUI
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Wallet Section */}
            <div className="mb-6">
                {!account ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                        <Wallet className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-yellow-400 text-sm mb-3">Connect wallet to sign</p>
                        <ConnectButton />
                    </div>
                ) : (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <p className="text-sm text-green-400">Wallet Connected</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                            {account.address.slice(0, 10)}...{account.address.slice(-8)}
                        </p>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* Sign Button */}
            <button
                onClick={handleSign}
                disabled={!account || isSigning || !bill}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${account && !isSigning
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
                    : 'bg-gray-700 cursor-not-allowed'
                    }`}
            >
                {isSigning ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Signing...
                    </>
                ) : (
                    <>
                        <Check className="w-5 h-5" />
                        Sign & Create Bill
                    </>
                )}
            </button>

            <p className="text-center text-gray-500 text-xs mt-4">
                This will create the bill on the Sui blockchain
            </p>
        </div>
    );
}

export default function SignPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        }>
            <SignPageContent />
        </Suspense>
    );
}
