'use client';

import { useEffect, useState } from 'react';
import { useCurrentAccount, ConnectButton, useSignPersonalMessage } from '@mysten/dapp-kit';
import { motion } from 'framer-motion';
import { Wallet, Receipt, ArrowUpRight, ArrowDownLeft, Plus, History, Settings, Shield, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { userApi } from '@/lib/api';

interface DebtSummary {
    totalOwed: string;
    totalReceivable: string;
    debtsCount: number;
    receivablesCount: number;
}

export default function DashboardPage() {
    const account = useCurrentAccount();
    const { mutateAsync: signMessage, isPending: isSigning } = useSignPersonalMessage();

    const [summary, setSummary] = useState<DebtSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLinking, setIsLinking] = useState(false);
    const [isLinked, setIsLinked] = useState(false);
    const [linkError, setLinkError] = useState<string | null>(null);

    // Get Telegram user from WebApp
    const [telegramUser, setTelegramUser] = useState<{ id: number; username?: string } | null>(null);

    useEffect(() => {
        // Check if running in Telegram WebApp
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
            const webapp = (window as any).Telegram.WebApp;
            webapp.ready();
            webapp.expand();

            if (webapp.initDataUnsafe?.user) {
                setTelegramUser(webapp.initDataUnsafe.user);
            }
        }
        setLoading(false);
    }, []);

    // Check if user is already linked when account changes
    useEffect(() => {
        const checkLinkedStatus = async () => {
            if (!telegramUser?.id) return;

            try {
                const response = await userApi.getProfile(telegramUser.id);
                const data = response.data;

                if (data.success && data.data?.walletAddress) {
                    // User exists and has wallet linked
                    if (account?.address && data.data.walletAddress === account.address) {
                        setIsLinked(true);
                    } else {
                        setIsLinked(false);
                    }
                } else {
                    setIsLinked(false);
                }
            } catch (error) {
                // User not found or error - not linked
                setIsLinked(false);
            }
        };

        checkLinkedStatus();
    }, [telegramUser?.id, account?.address]);

    // Verify wallet ownership by signing a message, then link to database
    const verifyAndLinkWallet = async () => {
        if (!account?.address || !telegramUser?.id) {
            setLinkError('Please connect wallet and open in Telegram');
            return;
        }

        setIsLinking(true);
        setLinkError(null);

        try {
            // Create a message to sign
            const timestamp = Date.now();
            const message = `Verify wallet ownership for LayerSplit\n\nTelegram ID: ${telegramUser.id}\nWallet: ${account.address}\nTimestamp: ${timestamp}`;

            // Ask user to sign the message
            const { signature } = await signMessage({
                message: new TextEncoder().encode(message),
            });

            console.log('Signature obtained:', signature);

            // Call API to link wallet using axios
            const response = await userApi.linkWallet({
                telegramId: telegramUser.id.toString(),
                walletAddress: account.address,
                username: telegramUser.username,
            });

            if (!response.data.success) {
                throw new Error(response.data.error || 'Failed to link wallet');
            }

            console.log('Wallet linked successfully:', response.data.data);
            setIsLinked(true);
            // Fetch summary after successful linking
            fetchSummary();
        } catch (error: any) {
            console.error('Failed to verify/link wallet:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to verify wallet';
            setLinkError(errorMsg);
        } finally {
            setIsLinking(false);
        }
    };

    // Fetch user summary
    useEffect(() => {
        if (telegramUser?.id && isLinked) {
            fetchSummary();
        }
    }, [telegramUser?.id, isLinked]);

    const fetchSummary = async () => {
        if (!telegramUser?.id) return;

        try {
            // Fetch debts and receivables using axios
            const [debtsRes, recRes] = await Promise.all([
                userApi.getDebts(telegramUser.id),
                userApi.getReceivables(telegramUser.id),
            ]);

            const debtsData = debtsRes.data;
            const recData = recRes.data;

            const totalOwed = debtsData.data?.reduce((sum: bigint, d: any) =>
                sum + BigInt(d.principalAmount) - BigInt(d.amountPaid), BigInt('0')) || BigInt('0');

            const totalReceivable = recData.data?.reduce((sum: bigint, d: any) =>
                sum + BigInt(d.principalAmount) - BigInt(d.amountPaid), BigInt('0')) || BigInt('0');

            setSummary({
                totalOwed: formatSui(totalOwed),
                totalReceivable: formatSui(totalReceivable),
                debtsCount: debtsData.data?.length || 0,
                receivablesCount: recData.data?.length || 0,
            });
        } catch (error) {
            console.error('Failed to fetch summary:', error);
        }
    };

    const formatSui = (mist: bigint): string => {
        const sui = Number(mist) / 1_000_000_000;
        return sui.toFixed(2);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white pb-24">
            {/* Header */}
            <header className="px-4 py-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">LayerSplit</h1>
                        <p className="text-sm text-gray-400">
                            {telegramUser?.username ? `@${telegramUser.username}` : 'Welcome'}
                        </p>
                    </div>
                    <Link href="/app/settings" className="p-2 rounded-full bg-white/5 hover:bg-white/10">
                        <Settings className="w-5 h-5" />
                    </Link>
                </div>
            </header>

            {/* Wallet Section */}
            {!account ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-4 mt-6 p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-blue-500/20">
                            <Wallet className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold">Connect Wallet</h2>
                            <p className="text-sm text-gray-400">Link your Sui wallet to get started</p>
                        </div>
                    </div>
                    {/* Use dapp-kit ConnectButton for proper wallet connection */}
                    <ConnectButton
                        connectText="Connect Wallet"
                        className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 font-medium transition text-white"
                    />
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-4 mt-6 p-4 rounded-2xl bg-white/5 border border-white/10"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isLinked ? 'bg-green-500/20' : linkError ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
                                {isLinked ? (
                                    <Shield className="w-5 h-5 text-green-400" />
                                ) : (
                                    <Wallet className={`w-5 h-5 ${linkError ? 'text-red-400' : 'text-yellow-400'}`} />
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">
                                    {isLinked ? 'Verified & Linked' : 'Wallet Connected'}
                                </p>
                                <p className="font-mono text-sm">
                                    {account.address.slice(0, 8)}...{account.address.slice(-6)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Show verify button if not linked */}
                    {!isLinked && (
                        <div className="mt-4">
                            {!telegramUser ? (
                                <p className="text-sm text-yellow-400">⚠️ Please open this app in Telegram to link your wallet</p>
                            ) : (
                                <button
                                    onClick={verifyAndLinkWallet}
                                    disabled={isLinking || isSigning}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 font-medium transition flex items-center justify-center gap-2"
                                >
                                    {isLinking || isSigning ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {isSigning ? 'Sign in wallet...' : 'Linking...'}
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="w-4 h-4" />
                                            Verify & Link Wallet
                                        </>
                                    )}
                                </button>
                            )}
                            {linkError && (
                                <p className="mt-2 text-sm text-red-400">{linkError}</p>
                            )}
                        </div>
                    )}
                </motion.div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 px-4 mt-6">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-white/10"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-gray-400">You Owe</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">
                        {summary?.totalOwed || '0.00'} SUI
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {summary?.debtsCount || 0} pending
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-white/10"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowDownLeft className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-gray-400">Owed to You</span>
                    </div>
                    <p className="text-2xl font-bold text-green-400">
                        {summary?.totalReceivable || '0.00'} SUI
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {summary?.receivablesCount || 0} pending
                    </p>
                </motion.div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 mt-8">
                <h3 className="text-sm font-medium text-gray-400 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                    <Link href="/app/create">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition cursor-pointer"
                        >
                            <Plus className="w-6 h-6 text-blue-400 mb-2" />
                            <p className="font-medium">Create Bill</p>
                            <p className="text-xs text-gray-400">Split with friends</p>
                        </motion.div>
                    </Link>

                    <Link href="/app/pay">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition cursor-pointer"
                        >
                            <Receipt className="w-6 h-6 text-green-400 mb-2" />
                            <p className="font-medium">Pay Debts</p>
                            <p className="text-xs text-gray-400">Settle up now</p>
                        </motion.div>
                    </Link>
                </div>
            </div>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0b]/90 backdrop-blur-lg border-t border-white/10 px-6 py-4">
                <div className="flex justify-around items-center max-w-md mx-auto">
                    <Link href="/app" className="flex flex-col items-center text-blue-400">
                        <Wallet className="w-5 h-5" />
                        <span className="text-xs mt-1">Home</span>
                    </Link>
                    <Link href="/app/create" className="flex flex-col items-center text-gray-400 hover:text-white">
                        <Plus className="w-5 h-5" />
                        <span className="text-xs mt-1">Create</span>
                    </Link>
                    <Link href="/app/history" className="flex flex-col items-center text-gray-400 hover:text-white">
                        <History className="w-5 h-5" />
                        <span className="text-xs mt-1">History</span>
                    </Link>
                    <Link href="/app/settings" className="flex flex-col items-center text-gray-400 hover:text-white">
                        <Settings className="w-5 h-5" />
                        <span className="text-xs mt-1">Settings</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}
