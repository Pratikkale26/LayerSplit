'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Receipt, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Transaction {
    id: string;
    type: 'paid' | 'received' | 'created';
    title: string;
    amount: string;
    counterparty?: string;
    date: string;
}

export default function HistoryPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'paid' | 'received'>('all');
    const [telegramUser, setTelegramUser] = useState<{ id: number } | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
            const webapp = (window as any).Telegram.WebApp;
            webapp.ready();

            if (webapp.initDataUnsafe?.user) {
                setTelegramUser(webapp.initDataUnsafe.user);
            }
        }

        // Mock data for now
        setTransactions([
            {
                id: '1',
                type: 'paid',
                title: 'Dinner Split',
                amount: '25.50',
                counterparty: '@john',
                date: '2026-02-07',
            },
            {
                id: '2',
                type: 'received',
                title: 'Movie Tickets',
                amount: '15.00',
                counterparty: '@alice',
                date: '2026-02-05',
            },
            {
                id: '3',
                type: 'created',
                title: 'Team Lunch',
                amount: '120.00',
                date: '2026-02-04',
            },
        ]);
        setLoading(false);
    }, []);

    const filteredTransactions = transactions.filter((t) => {
        if (filter === 'all') return true;
        return t.type === filter;
    });

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'paid':
                return <ArrowUpRight className="w-4 h-4 text-red-400" />;
            case 'received':
                return <ArrowDownLeft className="w-4 h-4 text-green-400" />;
            default:
                return <Receipt className="w-4 h-4 text-blue-400" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'paid':
                return 'from-red-500/10 to-orange-500/10';
            case 'received':
                return 'from-green-500/10 to-emerald-500/10';
            default:
                return 'from-blue-500/10 to-purple-500/10';
        }
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
                <h1 className="text-lg font-semibold">Transaction History</h1>
            </header>

            {/* Filter Tabs */}
            <div className="px-4 py-4">
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
                    {(['all', 'paid', 'received'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${filter === f
                                ? 'bg-white/10 text-white'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Transactions List */}
            <div className="px-4 space-y-3">
                {filteredTransactions.length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                        <p className="text-gray-400">No transactions yet</p>
                    </div>
                ) : (
                    filteredTransactions.map((tx, index) => (
                        <motion.div
                            key={tx.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`p-4 rounded-2xl bg-gradient-to-br ${getTypeColor(tx.type)} border border-white/10`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-white/10">
                                        {getTypeIcon(tx.type)}
                                    </div>
                                    <div>
                                        <p className="font-medium">{tx.title}</p>
                                        <p className="text-xs text-gray-400">
                                            {tx.counterparty ? `${tx.type === 'paid' ? 'to' : 'from'} ${tx.counterparty}` : 'Created by you'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-semibold ${tx.type === 'paid' ? 'text-red-400' :
                                        tx.type === 'received' ? 'text-green-400' : 'text-blue-400'
                                        }`}>
                                        {tx.type === 'paid' ? '-' : tx.type === 'received' ? '+' : ''}{tx.amount} SUI
                                    </p>
                                    <p className="text-xs text-gray-500">{tx.date}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
