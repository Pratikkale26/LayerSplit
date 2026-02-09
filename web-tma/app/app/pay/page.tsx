'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Loader2, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { userApi, paymentsApi } from '@/lib/api';

interface Debt {
    id: string;
    suiObjectId?: string;
    principalAmount: string;
    amountPaid: string;
    isSettled: boolean;
    creditor: {
        id: string;
        telegramId: string;
        username?: string;
    };
    bill?: {
        id: string;
        title: string;
        suiObjectId?: string;
    };
    interest?: {
        principal: string;
        interest: string;
        totalDue: string;
        inGracePeriod: boolean;
    };
}

export default function PayPage() {
    const account = useCurrentAccount();
    const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();

    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
    const [payingId, setPayingId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [telegramUser, setTelegramUser] = useState<{ id: number } | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
            const webapp = (window as any).Telegram.WebApp;
            webapp.ready();

            if (webapp.initDataUnsafe?.user) {
                setTelegramUser(webapp.initDataUnsafe.user);
            }
        }
    }, []);

    useEffect(() => {
        if (telegramUser?.id) {
            fetchDebts();
        }
    }, [telegramUser]);

    const fetchDebts = async () => {
        if (!telegramUser?.id) return;

        try {
            setLoading(true);
            const response = await userApi.getDebts(telegramUser.id);
            const data = response.data;

            if (data.success && data.data) {
                const debtsWithInterest = await Promise.all(
                    data.data.map(async (debt: Debt) => {
                        try {
                            const intRes = await paymentsApi.getInterest(debt.id);
                            return { ...debt, interest: intRes.data.data };
                        } catch {
                            return debt;
                        }
                    })
                );
                setDebts(debtsWithInterest);
            }
        } catch (err) {
            console.error('Failed to fetch debts:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatSui = (mist: string): string => {
        const sui = Number(BigInt(mist)) / 1_000_000_000;
        return sui.toFixed(4);
    };

    const handlePay = async (debt: Debt) => {
        if (!account || !debt.suiObjectId || !debt.bill?.suiObjectId) {
            setError('Missing required data for payment');
            return;
        }

        setPayingId(debt.id);
        setError('');

        try {
            const response = await paymentsApi.pay({
                debtId: debt.id,
                suiDebtObjectId: debt.suiObjectId,
                suiBillObjectId: debt.bill.suiObjectId,
                paymentCoinId: 'TODO',
                payFull: true,
            });

            const data = response.data;

            if (!data.success) {
                throw new Error(data.error || 'Failed to build transaction');
            }

            const result = await signAndExecute({
                transaction: data.data.transactionBytes,
            });

            await paymentsApi.confirm({
                debtId: debt.id,
                transactionDigest: result.digest,
                amountPaid: debt.interest?.totalDue || debt.principalAmount,
            });

            setSuccess(true);
            fetchDebts();
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Payment failed');
        } finally {
            setPayingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white pb-24">
            {/* Header */}
            <header className="px-4 py-4 border-b border-white/10 flex items-center gap-4">
                <Link href="/app">
                    <button className="p-2 rounded-lg hover:bg-white/5">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </Link>
                <h1 className="text-lg font-semibold">Pay Debts</h1>
            </header>

            {success && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-4 mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3"
                >
                    <Check className="w-5 h-5 text-green-400" />
                    <p className="text-green-400">Payment successful!</p>
                </motion.div>
            )}

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-4 mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3"
                >
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-red-400">{error}</p>
                </motion.div>
            )}

            {/* Pay All Summary Card */}
            {debts.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-4 mt-6 p-5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/10 border border-blue-500/20"
                >
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <p className="text-gray-400 text-sm">Total Outstanding</p>
                            <p className="text-2xl font-bold text-white">
                                {formatSui(
                                    debts.reduce((sum, d) => {
                                        const amount = d.interest?.totalDue || d.principalAmount;
                                        return (BigInt(sum) + BigInt(amount)).toString();
                                    }, '0')
                                )} SUI
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-400 text-sm">{debts.length} debt(s)</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            // Pay debts one by one
                            debts.forEach(debt => handlePay(debt));
                        }}
                        disabled={isPending || !account}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isPending ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </span>
                        ) : (
                            '💸 Pay All Debts'
                        )}
                    </button>
                </motion.div>
            )}

            {/* Debts List */}
            <div className="px-4 mt-6 space-y-4">
                {debts.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                            <Check className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">You're all caught up!</h2>
                        <p className="text-gray-400">No outstanding debts to pay</p>
                    </div>
                ) : (
                    debts.map((debt) => (
                        <motion.div
                            key={debt.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-2xl bg-white/5 border border-white/10"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="font-medium">{debt.bill?.title || 'Bill'}</p>
                                    <p className="text-sm text-gray-400">
                                        to @{debt.creditor.username || debt.creditor.telegramId}
                                    </p>
                                </div>
                                {debt.interest && !debt.interest.inGracePeriod && (
                                    <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        +Interest
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Principal</span>
                                    <span>{formatSui(debt.principalAmount)} SUI</span>
                                </div>
                                {debt.interest && BigInt(debt.interest.interest) > BigInt('0') && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-red-400">Interest</span>
                                        <span className="text-red-400">+{formatSui(debt.interest.interest)} SUI</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-medium pt-2 border-t border-white/10">
                                    <span>Total Due</span>
                                    <span className="text-blue-400">
                                        {formatSui(debt.interest?.totalDue || debt.principalAmount)} SUI
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => handlePay(debt)}
                                disabled={payingId === debt.id || !account}
                                className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                            >
                                {payingId === debt.id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Pay Now'
                                )}
                            </button>
                        </motion.div>
                    ))
                )}
            </div>

            {!account && debts.length > 0 && (
                <div className="fixed bottom-24 left-4 right-4">
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
                        <p className="text-yellow-400 text-sm">Connect wallet to make payments</p>
                    </div>
                </div>
            )}
        </div>
    );
}
