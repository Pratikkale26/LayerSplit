'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { motion } from 'framer-motion';
import { ArrowLeft, Wallet, Bell, Shield, LogOut, ExternalLink, Copy, Check } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
    const account = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    const [telegramUser, setTelegramUser] = useState<{ id: number; username?: string; first_name?: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [notifications, setNotifications] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
            const webapp = (window as any).Telegram.WebApp;
            webapp.ready();

            if (webapp.initDataUnsafe?.user) {
                setTelegramUser(webapp.initDataUnsafe.user);
            }
        }
    }, []);

    const copyAddress = () => {
        if (account?.address) {
            navigator.clipboard.writeText(account.address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDisconnect = () => {
        disconnect();
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white pb-24">
            {/* Header */}
            <header className="px-4 py-4 border-b border-white/10 flex items-center gap-4">
                <Link href="/app">
                    <button className="p-2 rounded-lg hover:bg-white/5">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </Link>
                <h1 className="text-lg font-semibold">Settings</h1>
            </header>

            {/* Profile Section */}
            <div className="px-4 py-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4"
                >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-bold">
                        {telegramUser?.first_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">
                            {telegramUser?.first_name || 'User'}
                        </h2>
                        <p className="text-gray-400">
                            @{telegramUser?.username || 'unknown'}
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Wallet Section */}
            <div className="px-4 mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Wallet</h3>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10"
                >
                    {account ? (
                        <>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-green-500/20">
                                        <Wallet className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Connected</p>
                                        <p className="font-mono text-sm">
                                            {account.address.slice(0, 10)}...{account.address.slice(-8)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={copyAddress}
                                    className="p-2 rounded-lg hover:bg-white/10"
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <Copy className="w-4 h-4 text-gray-400" />
                                    )}
                                </button>
                            </div>
                            <button
                                onClick={handleDisconnect}
                                className="w-full py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition"
                            >
                                Disconnect Wallet
                            </button>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <Wallet className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                            <p className="text-gray-400 mb-3">No wallet connected</p>
                            <Link href="/app">
                                <button className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-sm">
                                    Connect Wallet
                                </button>
                            </Link>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Preferences */}
            <div className="px-4 mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Preferences</h3>
                <div className="space-y-2">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <Bell className="w-5 h-5 text-gray-400" />
                            <span>Notifications</span>
                        </div>
                        <button
                            onClick={() => setNotifications(!notifications)}
                            className={`w-12 h-6 rounded-full transition ${notifications ? 'bg-blue-500' : 'bg-gray-600'
                                }`}
                        >
                            <div
                                className={`w-5 h-5 rounded-full bg-white transition transform ${notifications ? 'translate-x-6' : 'translate-x-0.5'
                                    }`}
                            />
                        </button>
                    </motion.div>
                </div>
            </div>

            {/* Links */}
            <div className="px-4 mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3">About</h3>
                <div className="space-y-2">
                    <motion.a
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        href="https://suiscan.xyz/testnet/object/0x6787acdc7a371186179af5e036558f5e32506ad5a2dbefa79a359b47cfe48983"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition"
                    >
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-gray-400" />
                            <span>Smart Contract</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                    </motion.a>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="p-4 rounded-2xl bg-white/5 border border-white/10"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400">Version</span>
                            <span>1.0.0</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Interest Info */}
            <div className="px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20"
                >
                    <h4 className="font-medium mb-2">⚡ Interest Policy</h4>
                    <p className="text-sm text-gray-400">
                        Late payments accrue 1% daily interest (365% APR) after a 3-day grace period.
                        Interest is paid first, then principal.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
