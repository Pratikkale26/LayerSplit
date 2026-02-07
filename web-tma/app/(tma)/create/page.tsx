'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, DollarSign, FileText, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type SplitType = 'EQUAL' | 'CUSTOM';

interface Participant {
    telegramId: string;
    username: string;
    amount?: string;
}

export default function CreateBillPage() {
    const account = useCurrentAccount();
    const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();

    const [step, setStep] = useState(1);
    const [title, setTitle] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [splitType, setSplitType] = useState<SplitType>('EQUAL');
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [newParticipant, setNewParticipant] = useState('');
    const [telegramUser, setTelegramUser] = useState<{ id: number; username?: string } | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
            const webapp = (window as any).Telegram.WebApp;
            webapp.ready();

            if (webapp.initDataUnsafe?.user) {
                setTelegramUser(webapp.initDataUnsafe.user);
            }

            // Check for prefilled data from /split command
            const params = new URLSearchParams(window.location.search);
            if (params.get('amount')) setTotalAmount(params.get('amount') || '');
            if (params.get('description')) setTitle(params.get('description') || '');
        }
    }, []);

    const addParticipant = () => {
        if (!newParticipant.trim()) return;

        // Check if already added
        if (participants.some(p => p.username.toLowerCase() === newParticipant.toLowerCase())) {
            setError('Participant already added');
            return;
        }

        setParticipants([...participants, {
            telegramId: '', // Will be resolved by backend
            username: newParticipant.replace('@', ''),
        }]);
        setNewParticipant('');
        setError('');
    };

    const removeParticipant = (index: number) => {
        setParticipants(participants.filter((_, i) => i !== index));
    };

    const updateParticipantAmount = (index: number, amount: string) => {
        const updated = [...participants];
        updated[index].amount = amount;
        setParticipants(updated);
    };

    const calculateShare = () => {
        if (!totalAmount || participants.length === 0) return '0.00';
        const share = parseFloat(totalAmount) / participants.length;
        return share.toFixed(2);
    };

    const handleSubmit = async () => {
        if (!telegramUser?.id || !account) {
            setError('Please connect wallet and Telegram');
            return;
        }

        try {
            setError('');

            // Create bill via API
            const response = await fetch(`${API_URL}/api/bills`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    totalAmount: (parseFloat(totalAmount) * 1_000_000_000).toString(), // Convert to MIST
                    splitType,
                    creatorTelegramId: telegramUser.id.toString(),
                    debtors: participants.map(p => ({
                        telegramId: p.telegramId || p.username, // Backend will resolve
                        amount: splitType === 'CUSTOM' && p.amount
                            ? (parseFloat(p.amount) * 1_000_000_000).toString()
                            : undefined,
                    })),
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to create bill');
            }

            // Sign and execute transaction if PTB provided
            if (data.data?.transactionBytes) {
                await signAndExecute({
                    transaction: data.data.transactionBytes,
                });
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to create bill');
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Bill Created!</h2>
                    <p className="text-gray-400 mb-6">Participants will be notified</p>
                    <Link href="/">
                        <button className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 font-medium">
                            Back to Home
                        </button>
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white pb-24">
            {/* Header */}
            <header className="px-4 py-4 border-b border-white/10 flex items-center gap-4">
                <Link href="/">
                    <button className="p-2 rounded-lg hover:bg-white/5">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </Link>
                <h1 className="text-lg font-semibold">Create Bill</h1>
            </header>

            {/* Progress Steps */}
            <div className="px-4 py-4">
                <div className="flex items-center justify-between">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s ? 'bg-blue-500' : 'bg-white/10'
                                }`}>
                                {s}
                            </div>
                            {s < 3 && (
                                <div className={`w-16 h-0.5 ${step > s ? 'bg-blue-500' : 'bg-white/10'}`} />
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>Details</span>
                    <span>People</span>
                    <span>Review</span>
                </div>
            </div>

            {/* Step 1: Bill Details */}
            {step === 1 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="px-4 space-y-6"
                >
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Bill Title</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Dinner, Movie tickets..."
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Total Amount (SUI)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="number"
                                value={totalAmount}
                                onChange={(e) => setTotalAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Split Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setSplitType('EQUAL')}
                                className={`p-4 rounded-xl border ${splitType === 'EQUAL'
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-white/10 bg-white/5'
                                    }`}
                            >
                                <p className="font-medium">Equal Split</p>
                                <p className="text-xs text-gray-400">Everyone pays same</p>
                            </button>
                            <button
                                onClick={() => setSplitType('CUSTOM')}
                                className={`p-4 rounded-xl border ${splitType === 'CUSTOM'
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-white/10 bg-white/5'
                                    }`}
                            >
                                <p className="font-medium">Custom Split</p>
                                <p className="text-xs text-gray-400">Set custom amounts</p>
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => setStep(2)}
                        disabled={!title || !totalAmount}
                        className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed font-medium"
                    >
                        Continue
                    </button>
                </motion.div>
            )}

            {/* Step 2: Add Participants */}
            {step === 2 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="px-4 space-y-6"
                >
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Add Participants</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={newParticipant}
                                    onChange={(e) => setNewParticipant(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                                    placeholder="@username"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={addParticipant}
                                className="px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm">{error}</p>
                    )}

                    {/* Participants List */}
                    <div className="space-y-3">
                        {participants.map((p, index) => (
                            <div
                                key={index}
                                className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center font-medium">
                                        {p.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium">@{p.username}</p>
                                        {splitType === 'EQUAL' && (
                                            <p className="text-xs text-gray-400">{calculateShare()} SUI</p>
                                        )}
                                    </div>
                                </div>
                                {splitType === 'CUSTOM' ? (
                                    <input
                                        type="number"
                                        value={p.amount || ''}
                                        onChange={(e) => updateParticipantAmount(index, e.target.value)}
                                        placeholder="Amount"
                                        className="w-24 px-3 py-2 rounded-lg bg-white/10 text-right text-sm outline-none"
                                    />
                                ) : (
                                    <button
                                        onClick={() => removeParticipant(index)}
                                        className="text-red-400 text-sm hover:text-red-300"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {participants.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No participants added yet</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-medium"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            disabled={participants.length === 0}
                            className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed font-medium"
                        >
                            Continue
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="px-4 space-y-6"
                >
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Title</span>
                            <span className="font-medium">{title}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Total Amount</span>
                            <span className="font-medium">{totalAmount} SUI</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Split Type</span>
                            <span className="font-medium">{splitType}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Participants</span>
                            <span className="font-medium">{participants.length}</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-sm text-yellow-400">
                            ⚠️ Late payments accrue 1% daily interest after 3-day grace period
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(2)}
                            className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-medium"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isPending || !account}
                            className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Bill'
                            )}
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
